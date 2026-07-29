/* Frame Atelier — UI layout tweaks.
 * Load just before </body>, alongside the other guide scripts:
 *
 *   <script src="/chroma-photo-guide.js"></script>
 *   <script src="/chroma-guide-autowire.js"></script>
 *   <script src="/fa-ui-tweaks.js"></script>
 *
 * Current tweak: "Hold to Compare" and "Save Photo" render below the style /
 * aesthetic section — move them above it so they sit with the photo, where
 * the user actually is after an edit. Detection is by visible text; if it
 * grabs the wrong element (or none), pin exact CSS selectors below and the
 * text search is skipped. If nothing matches, the script changes nothing.
 */
var FA_UI_TWEAKS = {
  /* the controls to move (in the order they should appear) */
  moveSelectors: null,          /* e.g. ['#compare-hint', '#save-btn'] */
  moveTexts: [/hold\s+to\s+compare/i, /save\s+photo/i],
  /* the section they must sit ABOVE */
  anchorSelector: null,         /* e.g. '#style-section' */
  anchorText: /style|aesthetic/i
};

(function () {
  'use strict';

  /* deepest elements whose own text matches — avoids grabbing <body> */
  function findByText(re) {
    var matches = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    var el;
    while ((el = walker.nextNode())) {
      if (el.closest('script,style,.fa-guide,.fa-cam')) continue;
      var t = (el.textContent || '').trim();
      if (t && t.length < 200 && re.test(t)) matches.push(el);
    }
    /* keep only elements none of whose children also match (leaf-most) */
    return matches.filter(function (m) {
      return !matches.some(function (o) { return o !== m && m.contains(o); });
    });
  }

  /* the movable unit: the control plus its immediate wrapper if the wrapper
   * holds nothing else (keeps hint text + button together) */
  function unitOf(el) {
    var p = el.parentElement;
    while (p && p !== document.body && p.children.length === 1) { el = p; p = el.parentElement; }
    return el;
  }

  function findAnchor() {
    if (FA_UI_TWEAKS.anchorSelector) return document.querySelector(FA_UI_TWEAKS.anchorSelector);
    var heads = document.querySelectorAll('h1,h2,h3,h4,h5,legend,[class*="title"],[class*="head"]');
    for (var i = 0; i < heads.length; i++) {
      var t = (heads[i].textContent || '').trim();
      if (t && t.length < 80 && FA_UI_TWEAKS.anchorText.test(t)) {
        return heads[i].closest('section,fieldset') || heads[i].parentElement;
      }
    }
    return null;
  }

  function apply() {
    var anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return false;

    var units = [];
    if (FA_UI_TWEAKS.moveSelectors) {
      FA_UI_TWEAKS.moveSelectors.forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) units.push(el);
      });
    } else {
      FA_UI_TWEAKS.moveTexts.forEach(function (re) {
        var found = findByText(re);
        if (found.length) units.push(unitOf(found[0]));
      });
    }
    /* only move controls that are currently BELOW the anchor and not inside it */
    units = units.filter(function (u) {
      return u && !anchor.contains(u) && !u.contains(anchor) &&
        (anchor.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    if (!units.length) return false;

    units.forEach(function (u) {
      if (u.dataset.faMoved) return;
      u.dataset.faMoved = '1';
      anchor.parentNode.insertBefore(u, anchor);
    });
    return true;
  }

  function run() { try { apply(); } catch (e) { /* never break the app */ } }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  /* late-rendering UIs: retry briefly */
  var tries = 0;
  var iv = setInterval(function () {
    run();
    if (++tries > 20) clearInterval(iv);
  }, 500);
})();
