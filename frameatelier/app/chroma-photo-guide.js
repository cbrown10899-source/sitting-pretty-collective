/* Frame Atelier — Chroma photo guide.
 * Self-contained: injects its own scoped styles, no dependencies, no network.
 * Wire it ONLY to the "Analyze My Colors" flow — not the general editor.
 * All processing is local — nothing leaves the device.
 *
 * API:
 *   FAPhotoGuide.maybeShow(opts)   // wizard unless dismissed with "don't show again"
 *   FAPhotoGuide.show(opts)        // always shows
 *     opts = {
 *       onProceed(mode)            // called when the user continues; mode is
 *                                  // 'library' or, if enableCamera, 'camera' was
 *                                  // handled internally and you get onCapture instead
 *       enableCamera: true,        // show "Take photo now" → built-in guided camera
 *       onCapture(canvas)          // canvas with the captured frame (native res)
 *     }
 *   FAPhotoGuide.openCamera({ onCapture })   // guided camera directly (skips wizard)
 *   FAPhotoGuide.whiteCheck(source, x, y)    // sample tapped white-paper point →
 *                                            // { verdict, message, rgb }
 *   FAPhotoGuide.renderResult(container, result)
 *
 * The guided camera shows a face oval and a paper zone under the chin, and runs
 * the white check on the live video inside that zone twice a second — the user
 * holds their real sheet of white paper in the zone and waits for the green
 * "light is neutral" reading before capturing. If getUserMedia is unavailable
 * or denied, it falls back to a native camera <input capture>.
 */
(function () {
  'use strict';
  var LS_KEY = 'fa-photoguide-dismissed';

  var STEPS = [
    { t: 'Find indirect daylight',
      d: 'Face a window, or step into open shade. Overcast is ideal. Skip direct sun (harsh, warm) and golden hour (everything turns orange).',
      icon: '◑' },
    { t: 'Turn off every other light',
      d: 'Lamps and ceiling bulbs each add a tint, and mixed light is the hardest to undo. Daylight only.',
      icon: '⏻' },
    { t: 'Hold white under your chin',
      d: 'A real sheet of white paper, a white towel, or a white tee across your shoulders and chest. It blocks color bouncing up from clothing — and it gives the camera a true white to measure.',
      icon: '□' },
    { t: 'Bare face, hair back, no filters',
      d: 'No makeup, hair away from the face, beauty mode and auto-enhance off. Chroma reads skin — not products.',
      icon: '◎' },
    { t: 'Watch the light meter',
      d: 'In the camera, hold the paper in the marked zone. The meter reads it live — wait for “neutral” before you take the shot.',
      icon: '⌖' }
  ];

  var CSS = '.fa-guide-veil{position:fixed;inset:0;background:rgba(10,9,8,.72);z-index:9990;display:flex;align-items:flex-end;justify-content:center}' +
  '@media(min-width:560px){.fa-guide-veil{align-items:center}}' +
  '.fa-guide{box-sizing:border-box;width:100%;max-width:480px;max-height:92vh;overflow:auto;background:#141311;color:#F7F4EF;border:1px solid #2A2724;border-radius:16px 16px 0 0;padding:22px 20px 18px;font-family:inherit;line-height:1.55}' +
  '@media(min-width:560px){.fa-guide{border-radius:16px}}' +
  '.fa-guide *{box-sizing:border-box}' +
  '.fa-guide .eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8A8378;margin:0 0 10px}' +
  '.fa-guide h2{font-weight:500;font-size:21px;line-height:1.2;margin:0 0 4px}' +
  '.fa-guide .why{color:#B8B2A8;font-size:14px;margin:0 0 18px}' +
  '.fa-guide .step{display:flex;gap:14px;padding:12px 0;border-top:1px solid #221F1C}' +
  '.fa-guide .step .ic{flex:0 0 34px;height:34px;border:1px solid #2A2724;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;color:#6297CB}' +
  '.fa-guide .step b{display:block;font-weight:500;font-size:15px;margin:0 0 2px}' +
  '.fa-guide .step span{display:block;color:#B8B2A8;font-size:13.5px}' +
  '.fa-guide .row{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}' +
  '.fa-guide button{font:inherit;cursor:pointer;border-radius:10px;padding:13px 18px;font-size:15px;letter-spacing:.02em}' +
  '.fa-guide .go{flex:1 1 100%;border:0;background:#F7F4EF;color:#141311;font-weight:500}' +
  '.fa-guide .lib{flex:1;border:1px solid #2A2724;background:transparent;color:#F7F4EF}' +
  '.fa-guide .skip{border:1px solid #2A2724;background:transparent;color:#8A8378}' +
  '.fa-guide .never{display:block;width:100%;margin-top:12px;background:none;border:0;color:#8A8378;font-size:12.5px;text-decoration:underline;text-underline-offset:3px;padding:6px}' +
  '.fa-guide .link{color:#8A8378;font-size:12.5px;text-align:center;margin:10px 0 0}' +
  '.fa-guide .link a{color:inherit}' +
  '.fa-whitecheck{margin:10px 0;padding:12px 14px;border:1px solid #2A2724;border-radius:12px;font-size:14px;line-height:1.5;display:flex;gap:10px;align-items:flex-start;background:#141311;color:#F7F4EF}' +
  '.fa-whitecheck .dot{flex:0 0 10px;height:10px;border-radius:50%;margin-top:5px}' +
  '.fa-whitecheck.ok .dot{background:#69B47E}.fa-whitecheck.warn .dot{background:#D9A03F}.fa-whitecheck.bad .dot{background:#C4574B}' +
  /* guided camera */
  '.fa-cam{position:fixed;inset:0;z-index:9991;background:#0A0908;display:flex;flex-direction:column;font-family:inherit;color:#F7F4EF}' +
  '.fa-cam .stage{position:relative;flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center}' +
  '.fa-cam video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}' +
  '.fa-cam .oval{position:absolute;left:50%;top:38%;width:46%;aspect-ratio:3/4;transform:translate(-50%,-50%);border:2px dashed rgba(247,244,239,.55);border-radius:50%;pointer-events:none;transition:border-color .3s}' +
  '.fa-cam .oval.ok{border-color:#69B47E;border-style:solid}' +
  '.fa-cam .zone{position:absolute;left:50%;top:72%;width:44%;height:16%;transform:translateX(-50%);border:2px solid rgba(247,244,239,.85);border-radius:10px;pointer-events:none;display:flex;align-items:center;justify-content:center;transition:border-color .3s}' +
  '.fa-cam .zone.ok{border-color:#69B47E}' +
  '.fa-cam .checks{position:absolute;top:calc(12px + env(safe-area-inset-top));left:12px;right:12px;display:flex;gap:8px;justify-content:center;pointer-events:none}' +
  '.fa-cam .chip{display:flex;align-items:center;gap:7px;background:rgba(10,9,8,.6);border:1px solid #2A2724;border-radius:999px;padding:7px 14px;font-size:12.5px;letter-spacing:.04em;color:#B8B2A8}' +
  '.fa-cam .chip .tick{width:16px;height:16px;border-radius:50%;border:1px solid #8A8378;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:transparent}' +
  '.fa-cam .chip.ok{color:#F7F4EF;border-color:#69B47E}' +
  '.fa-cam .chip.ok .tick{background:#69B47E;border-color:#69B47E;color:#0A0908}' +
  '.fa-cam .zone span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(247,244,239,.85);background:rgba(10,9,8,.45);padding:3px 10px;border-radius:999px}' +
  '.fa-cam .meter{position:absolute;left:12px;right:12px;bottom:12px;margin:0}' +
  '.fa-cam .bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 18px calc(14px + env(safe-area-inset-bottom));background:#0A0908}' +
  '.fa-cam button{font:inherit;cursor:pointer}' +
  '.fa-cam .x,.fa-cam .flip{background:none;border:1px solid #2A2724;color:#8A8378;border-radius:10px;padding:11px 16px;font-size:14px}' +
  '.fa-cam .shutter{width:66px;height:66px;border-radius:50%;border:4px solid #5A554E;background:transparent;position:relative;transition:border-color .25s}' +
  '.fa-cam .shutter::after{content:"";position:absolute;inset:5px;border-radius:50%;background:#5A554E;transition:background .25s}' +
  '.fa-cam .shutter.ok{border-color:#F7F4EF}' +
  '.fa-cam .shutter.ok::after{background:#69B47E}' +
  '.fa-cam .anyway{position:absolute;right:12px;bottom:calc(96px + env(safe-area-inset-bottom));background:rgba(10,9,8,.6);border:1px solid #2A2724;color:#8A8378;border-radius:999px;padding:8px 14px;font-size:12.5px;display:none}';

  function injectCss() {
    if (document.getElementById('fa-guide-css')) return;
    var s = document.createElement('style');
    s.id = 'fa-guide-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- cast judgement, shared by tap-check and live meter ---------- */
  function judge(r, g, b) {
    var avg = (r + g + b) / 3;
    if (avg < 110) return { verdict: 'dark',
      message: 'The paper reads dark — there isn’t enough light. Move closer to the window.' };
    if (r > 250 && g > 250 && b > 250) return { verdict: 'blown',
      message: 'The paper is blown out to pure white, so the tint can’t be judged. Step back from direct light.' };
    if (r - b > 14 || (r - g > 10 && r - b > 8)) return { verdict: 'warm',
      message: 'Warm (yellow-orange) cast — usually indoor bulbs or golden hour. Daylight only.' };
    if (b - r > 14) return { verdict: 'cool',
      message: 'Cool (blue) cast — common in deep shade or from cool LEDs. Try nearer the window.' };
    if (g - (r + b) / 2 > 10) return { verdict: 'green',
      message: 'Green cast — often fluorescent light or bounce from foliage. Change the spot.' };
    return { verdict: 'neutral',
      message: 'The white reads clean — your light is neutral.' };
  }

  function sampleAvg(ctx, w, h) {
    var d = ctx.getImageData(0, 0, w, h).data;
    var r = 0, g = 0, b = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    return { r: r / n, g: g / n, b: b / n };
  }

  function whiteCheck(source, x, y) {
    var R = 15;
    var c = document.createElement('canvas');
    c.width = c.height = R * 2;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, x - R, y - R, R * 2, R * 2, 0, 0, R * 2, R * 2);
    var a = sampleAvg(ctx, R * 2, R * 2);
    var res = judge(a.r, a.g, a.b);
    res.message = res.verdict === 'neutral'
      ? 'The white reads clean — your light is neutral. This photo can be trusted for the analysis.'
      : res.message + ' Retake, then check again.';
    res.rgb = { r: Math.round(a.r), g: Math.round(a.g), b: Math.round(a.b) };
    return res;
  }

  function renderResult(container, result) {
    injectCss();
    var cls = result.verdict === 'neutral' ? 'ok' : (result.verdict === 'dark' || result.verdict === 'blown') ? 'warn' : 'bad';
    var el = container.querySelector('.fa-whitecheck') || document.createElement('div');
    el.className = 'fa-whitecheck ' + cls;
    el.innerHTML = '<span class="dot"></span><span>' + result.message + '</span>';
    if (!el.parentNode) container.appendChild(el);
    return el;
  }

  /* ---------- guided camera ---------- */
  function fallbackCapture(opts) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.setAttribute('capture', 'user');
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
        if (opts && typeof opts.onCapture === 'function') opts.onCapture(c);
      };
      img.src = URL.createObjectURL(f);
    });
    inp.click();
  }

  function openCamera(opts) {
    opts = opts || {};
    injectCss();
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { fallbackCapture(opts); return; }

    var root = document.createElement('div');
    root.className = 'fa-cam';
    root.innerHTML =
      '<div class="stage">' +
      '<video autoplay playsinline muted></video>' +
      '<div class="oval"></div>' +
      '<div class="zone"><span>white paper here</span></div>' +
      '<div class="checks">' +
      '<span class="chip face-chip"><span class="tick">✓</span>Face in the oval</span>' +
      '<span class="chip paper-chip"><span class="tick">✓</span>Paper reads neutral</span>' +
      '</div>' +
      '<button type="button" class="anyway">Capture anyway</button>' +
      '<div class="fa-whitecheck warn meter"><span class="dot"></span><span class="msg">Hold your sheet of white paper in the zone…</span></div>' +
      '</div>' +
      '<div class="bar">' +
      '<button type="button" class="x">Cancel</button>' +
      '<button type="button" class="shutter" aria-label="Take photo"></button>' +
      '<button type="button" class="flip">Flip</button>' +
      '</div>';

    var video = root.querySelector('video');
    var meter = root.querySelector('.meter');
    var meterMsg = root.querySelector('.meter .msg');
    var shutter = root.querySelector('.shutter');
    var stream = null, timer = null, facing = 'user';
    var probe = document.createElement('canvas');
    var probeCtx = probe.getContext('2d', { willReadFrequently: true });

    function stop() {
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      root.remove();
    }

    function start() {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false
      }).then(function (s) {
        stream = s;
        video.srcObject = s;
        video.style.transform = facing === 'user' ? 'scaleX(-1)' : 'none';
        if (!timer) timer = setInterval(tick, 500);
      }).catch(function () {
        stop();
        fallbackCapture(opts);
      });
    }

    /* Live checks, twice a second.
       Paper: average the marked zone, judge the cast.
       Face: FaceDetector API when the browser has it; otherwise a skin-presence
       heuristic over the oval (share of pixels with the r>=g>=b skin pattern,
       tone-independent, plus mid-range brightness). All on-device. */
    var faceChip = root.querySelector('.face-chip');
    var paperChip = root.querySelector('.paper-chip');
    var ovalEl = root.querySelector('.oval');
    var zoneEl = root.querySelector('.zone');
    var anyway = root.querySelector('.anyway');
    var faceOk = false, paperOk = false, notReadySince = null;
    var detector = (typeof window.FaceDetector === 'function') ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) : null;
    var detecting = false;

    function faceHeuristic() {
      var vw = video.videoWidth, vh = video.videoHeight;
      var w = Math.round(vw * 0.34), h = Math.round(vh * 0.30);
      var x = Math.round((vw - w) / 2), y = Math.round(vh * 0.38 - h / 2);
      probe.width = w; probe.height = h;
      probeCtx.drawImage(video, x, y, w, h, 0, 0, w, h);
      var d = probeCtx.getImageData(0, 0, w, h).data;
      var skin = 0, n = d.length / 4;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        var lum = (r + g + b) / 3;
        if (r >= g && g >= b && r - b > 8 && lum > 50 && lum < 245) skin++;
      }
      return skin / n > 0.35;
    }

    function setState() {
      ovalEl.classList.toggle('ok', faceOk);
      faceChip.classList.toggle('ok', faceOk);
      zoneEl.classList.toggle('ok', paperOk);
      paperChip.classList.toggle('ok', paperOk);
      var ready = faceOk && paperOk;
      shutter.classList.toggle('ok', ready);
      shutter.disabled = !ready;
      if (ready) { notReadySince = null; anyway.style.display = 'none'; }
      else {
        if (notReadySince === null) notReadySince = 0;
        else notReadySince += 500;
        if (notReadySince >= 6000) anyway.style.display = 'block';
      }
    }

    function tick() {
      if (!video.videoWidth) return;
      var vw = video.videoWidth, vh = video.videoHeight;
      /* paper zone */
      var w = Math.round(vw * 0.44), h = Math.round(vh * 0.16);
      var x = Math.round((vw - w) / 2), y = Math.round(vh * 0.72 - h / 2);
      probe.width = w; probe.height = h;
      probeCtx.drawImage(video, x, y, w, h, 0, 0, w, h);
      var a = sampleAvg(probeCtx, w, h);
      var res = judge(a.r, a.g, a.b);
      paperOk = res.verdict === 'neutral';
      var cls = paperOk ? 'ok' : (res.verdict === 'dark' || res.verdict === 'blown') ? 'warn' : 'bad';
      meter.className = 'fa-whitecheck meter ' + cls;
      /* face */
      if (detector && !detecting) {
        detecting = true;
        detector.detect(video).then(function (faces) {
          detecting = false;
          faceOk = faces && faces.length > 0;
        }).catch(function () { detecting = false; detector = null; });
      } else if (!detector) {
        faceOk = faceHeuristic();
      }
      meterMsg.textContent = !faceOk && paperOk ? 'Line your face up inside the oval.'
        : paperOk && faceOk ? 'Both checks green — take the shot.'
        : res.verdict === 'neutral' ? 'Hold your sheet of white paper in the zone…'
        : res.message;
      setState();
    }

    function capture() {
      if (!video.videoWidth) return;
      var c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      var cx = c.getContext('2d');
      if (facing === 'user') { cx.translate(c.width, 0); cx.scale(-1, 1); } // match the mirrored preview
      cx.drawImage(video, 0, 0);
      stop();
      if (typeof opts.onCapture === 'function') opts.onCapture(c);
    }
    shutter.addEventListener('click', capture);
    anyway.addEventListener('click', capture);
    root.querySelector('.x').addEventListener('click', stop);
    root.querySelector('.flip').addEventListener('click', function () {
      facing = facing === 'user' ? 'environment' : 'user';
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      start();
    });

    document.body.appendChild(root);
    start();
  }

  /* ---------- wizard ---------- */
  function build(opts, force) {
    opts = opts || {};
    injectCss();
    var veil = document.createElement('div');
    veil.className = 'fa-guide-veil';
    veil.setAttribute('role', 'dialog');
    veil.setAttribute('aria-modal', 'true');
    veil.setAttribute('aria-label', 'How to take the photo');

    var cam = !!opts.enableCamera;
    var box = document.createElement('div');
    box.className = 'fa-guide';
    box.innerHTML =
      '<p class="eyebrow">Before you analyze</p>' +
      '<h2>Five minutes of setup, a much truer read</h2>' +
      '<p class="why">Chroma can only read what the camera captured. Wrong light bakes in a color cast bigger than the shifts the analysis depends on.</p>' +
      STEPS.map(function (s) {
        return '<div class="step"><div class="ic">' + s.icon + '</div><div><b>' + s.t + '</b><span>' + s.d + '</span></div></div>';
      }).join('') +
      '<div class="row">' +
      (cam ? '<button type="button" class="go">I’m set up — take the photo</button>' : '') +
      '<button type="button" class="lib">' + (cam ? 'Choose from library' : 'I’m set up — choose photo') + '</button>' +
      '<button type="button" class="skip">Skip</button>' +
      '</div>' +
      (force ? '' : '<button type="button" class="never">Don’t show this again</button>') +
      '<p class="link"><a href="https://frameatelier.app/color-analysis/#how-to-photograph">Full guide with examples →</a></p>';
    veil.appendChild(box);

    function close(then) {
      document.removeEventListener('keydown', onKey);
      veil.remove();
      if (then) then();
    }
    function onKey(e) { if (e.key === 'Escape') close(null); }
    function proceedLibrary() {
      if (typeof opts.onProceed === 'function') opts.onProceed('library');
    }

    var go = box.querySelector('.go');
    if (go) go.addEventListener('click', function () { close(function () { openCamera(opts); }); });
    box.querySelector('.lib').addEventListener('click', function () { close(proceedLibrary); });
    box.querySelector('.skip').addEventListener('click', function () {
      close(cam ? function () { openCamera(opts); } : proceedLibrary);
    });
    var never = box.querySelector('.never');
    if (never) never.addEventListener('click', function () {
      try { localStorage.setItem(LS_KEY, '1'); } catch (e) {}
      close(cam ? function () { openCamera(opts); } : proceedLibrary);
    });
    veil.addEventListener('click', function (e) { if (e.target === veil) close(null); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(veil);
    (go || box.querySelector('.lib')).focus();
  }

  window.FAPhotoGuide = {
    show: function (opts) { build(opts, true); },
    maybeShow: function (opts) {
      opts = opts || {};
      var skip = false;
      try { skip = localStorage.getItem(LS_KEY) === '1'; } catch (e) {}
      if (skip) {
        if (opts.enableCamera) openCamera(opts);
        else if (typeof opts.onProceed === 'function') opts.onProceed('library');
      } else build(opts, false);
    },
    openCamera: openCamera,
    whiteCheck: whiteCheck,
    renderResult: renderResult
  };
})();
