/* Frame Atelier — auto-wiring for the Chroma photo guide.
 * Load AFTER chroma-photo-guide.js, just before </body>:
 *
 *   <script src="/chroma-photo-guide.js"></script>
 *   <script src="/chroma-guide-autowire.js"></script>
 *
 * What it does: finds the Analyze My Colors control, inserts a separate
 * "Take an Image" button right after it, and wires ONLY that new button to
 * the guide — wizard, guided camera (face oval + paper zone + green checks),
 * then delivers the captured photo to the app through its own file input as
 * if the user had picked it. The existing Analyze My Colors button is left
 * completely untouched.
 *
 * If auto-detection picks the wrong elements, pin them here:               */
var FA_GUIDE_WIRING = {
  /* CSS selector for the Analyze My Colors button/link the new button should
   * appear next to. Leave null to auto-detect by visible text. */
  analyzeSelector: null,
  /* CSS selector for the file input Chroma reads the photo from. Leave null
   * to auto-detect the nearest image file input. */
  inputSelector: null,
  /* Label for the injected button. */
  label: 'Take an Image',
  /* Set true to ALSO show the wizard when the original Analyze My Colors
   * button is used (photo-from-library path). Default false: original
   * button behaves exactly as it does today. */
  guideOnOriginal: false
};

(function () {
  'use strict';

  var BTN_CSS = '.fa-take-image{font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px;' +
    'margin:10px 0 0;padding:13px 22px;border:1px solid #2A2724;border-radius:10px;' +
    'background:transparent;color:#F7F4EF;font-size:15px;letter-spacing:.02em;width:100%;justify-content:center}' +
    '.fa-take-image:hover{border-color:#F7F4EF}' +
    '.fa-take-image .cam-ic{font-size:16px;line-height:1}';

  function injectBtnCss() {
    if (document.getElementById('fa-take-image-css')) return;
    var s = document.createElement('style');
    s.id = 'fa-take-image-css';
    s.textContent = BTN_CSS;
    document.head.appendChild(s);
  }

  function findAnalyzeControls() {
    if (FA_GUIDE_WIRING.analyzeSelector) {
      return Array.prototype.slice.call(document.querySelectorAll(FA_GUIDE_WIRING.analyzeSelector));
    }
    var all = document.querySelectorAll('button, a, [role="button"], label, input[type="button"], input[type="submit"]');
    return Array.prototype.filter.call(all, function (el) {
      var t = (el.innerText || el.value || '').trim().toLowerCase();
      return /analy[sz]e\s+my\s+colou?rs?/.test(t) || t === 'analyze' || t === 'analyse';
    });
  }

  function findFileInput(near) {
    if (FA_GUIDE_WIRING.inputSelector) return document.querySelector(FA_GUIDE_WIRING.inputSelector);
    var scope = near && near.closest ? (near.closest('section,form,div') || document) : document;
    return scope.querySelector('input[type="file"][accept*="image"], input[type="file"]') ||
           document.querySelector('input[type="file"][accept*="image"], input[type="file"]');
  }

  function deliver(canvas, input) {
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'chroma-photo.jpg', { type: 'image/jpeg' });
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {
        input.click(); /* very old browsers: fall back to opening the picker */
      }
    }, 'image/jpeg', 0.95);
  }

  function launchGuide(input) {
    FAPhotoGuide.maybeShow({
      enableCamera: true,
      onProceed: function (mode) { if (mode === 'library') input.click(); },
      onCapture: function (canvas) { deliver(canvas, input); }
    });
  }

  function wire() {
    var controls = findAnalyzeControls();
    if (!controls.length) return false;
    injectBtnCss();
    controls.forEach(function (btn) {
      if (btn.dataset.faGuideWired) return;
      btn.dataset.faGuideWired = '1';
      var input = findFileInput(btn);
      if (!input) return;

      /* the new, separate button */
      var take = document.createElement('button');
      take.type = 'button';
      take.className = 'fa-take-image';
      take.innerHTML = '<span class="cam-ic">◉</span>' + FA_GUIDE_WIRING.label;
      take.addEventListener('click', function (e) {
        e.preventDefault();
        launchGuide(input);
      });
      btn.insertAdjacentElement('afterend', take);

      /* original button stays untouched unless explicitly opted in */
      if (FA_GUIDE_WIRING.guideOnOriginal) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          launchGuide(input);
        }, true);
      }
    });
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
  /* app UIs that render late: retry briefly */
  var tries = 0;
  var iv = setInterval(function () {
    if (wire() || ++tries > 20) clearInterval(iv);
  }, 500);
})();
