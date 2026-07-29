/* Frame Atelier — auto-wiring for the Chroma photo guide.
 * Load AFTER chroma-photo-guide.js, just before </body>:
 *
 *   <script src="/chroma-photo-guide.js"></script>
 *   <script src="/chroma-guide-autowire.js"></script>
 *
 * No other changes needed. On click of the Analyze My Colors control it shows
 * the guide, runs the guided camera, and delivers the captured photo to the
 * app through its own file input (as if the user had picked it), so the app's
 * existing handler runs unchanged. Library mode simply clicks that input.
 *
 * If auto-detection picks the wrong elements, pin them here:               */
var FA_GUIDE_WIRING = {
  /* CSS selector for the Analyze My Colors button/link. Leave null to
   * auto-detect by visible text (matches "analyze my colors" / "analyse"). */
  analyzeSelector: null,
  /* CSS selector for the file input Chroma reads the photo from. Leave null
   * to auto-detect the nearest image file input. */
  inputSelector: null
};

(function () {
  'use strict';

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
    /* prefer an input inside/adjacent to the analyze control's container */
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
        /* very old browsers: fall back to opening the picker */
        input.click();
      }
    }, 'image/jpeg', 0.95);
  }

  function wire() {
    var controls = findAnalyzeControls();
    if (!controls.length) return false;
    controls.forEach(function (btn) {
      if (btn.dataset.faGuideWired) return;
      btn.dataset.faGuideWired = '1';
      btn.addEventListener('click', function (e) {
        var input = findFileInput(btn);
        if (!input) return; /* nothing to deliver to — let the app behave as before */
        e.preventDefault();
        e.stopImmediatePropagation();
        FAPhotoGuide.maybeShow({
          enableCamera: true,
          onProceed: function (mode) { if (mode === 'library') input.click(); },
          onCapture: function (canvas) { deliver(canvas, input); }
        });
      }, true); /* capture phase, so this runs before the app's own handler */
    });
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
  /* app UIs that render late: retry briefly, then watch for re-renders */
  var tries = 0;
  var iv = setInterval(function () {
    if (wire() || ++tries > 20) clearInterval(iv);
  }, 500);
})();
