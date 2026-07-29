/* Frame Atelier — Chroma photo guide.
 * Self-contained: injects its own scoped styles, no dependencies, no network.
 * Wire it ONLY to the "Analyze My Colors" flow — not the general editor.
 *
 * API:
 *   FAPhotoGuide.maybeShow({ onProceed })   // shows wizard unless dismissed with "don't show again"
 *   FAPhotoGuide.show({ onProceed })        // always shows (e.g. from a "How to shoot" link)
 *   FAPhotoGuide.whiteCheck(source, x, y)   // sample the tapped white-paper point; returns
 *                                           // { verdict, message, rgb } — verdict is one of
 *                                           // 'neutral' | 'warm' | 'cool' | 'green' | 'dark' | 'blown'
 *
 * Typical wiring:
 *   analyzeMyColorsBtn.addEventListener('click', (e) => {
 *     e.preventDefault();
 *     FAPhotoGuide.maybeShow({ onProceed: openChromaPhotoPicker });
 *   });
 *
 * After the photo is decoded into an <img>, <canvas>, or ImageBitmap, offer
 * "Tap the white paper to check your light" over the preview and call
 * whiteCheck(source, x, y) with coordinates in the source's natural pixels.
 * All processing is local — nothing leaves the device.
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
      d: 'A sheet of white paper, a white towel, or a white tee across your shoulders and chest. It blocks color bouncing up from clothing — and it gives the check on the next screen a true white to measure.',
      icon: '□' },
    { t: 'Bare face, hair back, no filters',
      d: 'No makeup, hair away from the face, beauty mode and auto-enhance off. Chroma reads skin — not products.',
      icon: '◎' },
    { t: 'After you shoot: tap the paper',
      d: 'Once your photo is in, tap the white paper in the preview. Chroma measures it on-device and tells you if the light carried a tint — if it did, retake rather than trust a skewed read.',
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
  '.fa-guide .row{display:flex;gap:10px;margin-top:18px}' +
  '.fa-guide button{font:inherit;cursor:pointer;border-radius:10px;padding:13px 18px;font-size:15px;letter-spacing:.02em}' +
  '.fa-guide .go{flex:1;border:0;background:#F7F4EF;color:#141311;font-weight:500}' +
  '.fa-guide .skip{border:1px solid #2A2724;background:transparent;color:#8A8378}' +
  '.fa-guide .never{display:block;width:100%;margin-top:12px;background:none;border:0;color:#8A8378;font-size:12.5px;text-decoration:underline;text-underline-offset:3px;padding:6px}' +
  '.fa-guide .link{color:#8A8378;font-size:12.5px;text-align:center;margin:10px 0 0}' +
  '.fa-guide .link a{color:inherit}' +
  '.fa-whitecheck{margin:10px 0;padding:12px 14px;border:1px solid #2A2724;border-radius:12px;font-size:14px;line-height:1.5;display:flex;gap:10px;align-items:flex-start}' +
  '.fa-whitecheck .dot{flex:0 0 10px;height:10px;border-radius:50%;margin-top:5px}' +
  '.fa-whitecheck.ok .dot{background:#69B47E}.fa-whitecheck.warn .dot{background:#D9A03F}.fa-whitecheck.bad .dot{background:#C4574B}';

  function injectCss() {
    if (document.getElementById('fa-guide-css')) return;
    var s = document.createElement('style');
    s.id = 'fa-guide-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function build(opts, force) {
    injectCss();
    var veil = document.createElement('div');
    veil.className = 'fa-guide-veil';
    veil.setAttribute('role', 'dialog');
    veil.setAttribute('aria-modal', 'true');
    veil.setAttribute('aria-label', 'How to take the photo');

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
      '<button type="button" class="skip">Skip</button>' +
      '<button type="button" class="go">I’m set up — choose photo</button>' +
      '</div>' +
      (force ? '' : '<button type="button" class="never">Don’t show this again</button>') +
      '<p class="link"><a href="https://frameatelier.app/color-analysis/#how-to-photograph">Full guide with examples →</a></p>';
    veil.appendChild(box);

    function close(proceed) {
      document.removeEventListener('keydown', onKey);
      veil.remove();
      if (proceed && opts && typeof opts.onProceed === 'function') opts.onProceed();
    }
    function onKey(e) { if (e.key === 'Escape') close(false); }

    box.querySelector('.go').addEventListener('click', function () { close(true); });
    box.querySelector('.skip').addEventListener('click', function () { close(true); });
    var never = box.querySelector('.never');
    if (never) never.addEventListener('click', function () {
      try { localStorage.setItem(LS_KEY, '1'); } catch (e) {}
      close(true);
    });
    veil.addEventListener('click', function (e) { if (e.target === veil) close(false); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(veil);
    box.querySelector('.go').focus();
  }

  /* Sample a ~15px-radius patch around (x,y) in natural pixels and judge the cast. */
  function whiteCheck(source, x, y) {
    var R = 15;
    var c = document.createElement('canvas');
    c.width = c.height = R * 2;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, x - R, y - R, R * 2, R * 2, 0, 0, R * 2, R * 2);
    var d = ctx.getImageData(0, 0, R * 2, R * 2).data;
    var r = 0, g = 0, b = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    r /= n; g /= n; b /= n;
    var avg = (r + g + b) / 3;

    var verdict, message;
    if (avg < 110) {
      verdict = 'dark';
      message = 'The paper reads dark — there isn’t enough light. Move closer to the window and retake.';
    } else if (r > 250 && g > 250 && b > 250) {
      verdict = 'blown';
      message = 'The paper is blown out to pure white, so the tint can’t be judged. Step back from direct light and retake.';
    } else if (r - b > 14 || (r - g > 10 && r - b > 8)) {
      verdict = 'warm';
      message = 'The light carried a warm (yellow-orange) cast — usually indoor bulbs or golden hour. Daylight only, then retake.';
    } else if (b - r > 14) {
      verdict = 'cool';
      message = 'The light carried a cool (blue) cast — common in deep shade or from cool LEDs. Try nearer the window, then retake.';
    } else if (g - (r + b) / 2 > 10) {
      verdict = 'green';
      message = 'There’s a green cast — often fluorescent light or bounce from foliage. Change the spot and retake.';
    } else {
      verdict = 'neutral';
      message = 'The white reads clean — your light is neutral. This photo can be trusted for the analysis.';
    }
    return { verdict: verdict, message: message, rgb: { r: Math.round(r), g: Math.round(g), b: Math.round(b) } };
  }

  /* Render a result strip you can drop under the preview. */
  function renderResult(container, result) {
    injectCss();
    var cls = result.verdict === 'neutral' ? 'ok' : (result.verdict === 'dark' || result.verdict === 'blown') ? 'warn' : 'bad';
    var el = container.querySelector('.fa-whitecheck') || document.createElement('div');
    el.className = 'fa-whitecheck ' + cls;
    el.innerHTML = '<span class="dot"></span><span>' + result.message + '</span>';
    if (!el.parentNode) container.appendChild(el);
    return el;
  }

  window.FAPhotoGuide = {
    show: function (opts) { build(opts, true); },
    maybeShow: function (opts) {
      var skip = false;
      try { skip = localStorage.getItem(LS_KEY) === '1'; } catch (e) {}
      if (skip) { if (opts && typeof opts.onProceed === 'function') opts.onProceed(); }
      else build(opts, false);
    },
    whiteCheck: whiteCheck,
    renderResult: renderResult
  };
})();
