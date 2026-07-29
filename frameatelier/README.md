# Frame Atelier — complete SEO + content drop (deploy to Cloudflare)

Everything from the July 2026 SEO audit **plus** the §7 content strategy,
verified and packaged. Staged in this folder only because frameatelier.app is
hosted on Cloudflare, not GitHub — **nothing here affects the Sitting Pretty
Collective site.**

## Layout

| Path | What it is |
|---|---|
| `head.html` | Corrected `<head>` block + SoftwareApplication JSON-LD. Merge into the homepage's `index.html` (replace matching tags, keep icons/manifest/styles). |
| `site-root/` | **Copy its contents into the site folder root as-is.** Contains `robots.txt`, `sitemap.xml` (with `lastmod`), `og/og-cover.jpg` (1200×630), the full `color-analysis/` section — hub plus twelve season pages — a `_headers` file (security/caching, scoped to the new routes only), and a branded `404.html`. |
| `app/photo-tips-panel.html` | Self-contained collapsed `<details>` panel (no JS, scoped CSS under `.fa-phototips`). Paste the markup directly above or below the "Choose a Photo" button in the Chroma flow, plus a text link "New to this? How to take the photo →" pointing to `https://frameatelier.app/color-analysis/#how-to-photograph`. |
| `app/analytics-events.js` | The five Plausible funnel events — only needed if/when Plausible is added (see below). |
| `app/chroma-photo-guide.js` | Guided tool for the **Analyze My Colors flow only**: pre-shoot wizard (real white paper under the chin, indirect daylight, no filters) + on-device white-paper check — the user taps the physical paper in their photo and the sampled pixels are judged for warm/cool/green cast, under- or over-exposure, with a retake prompt. Wire the button: `FAPhotoGuide.maybeShow({ onProceed: openChromaPhotoPicker })`. |
| `app/chroma-photo-guide-demo.html` | Standalone demo of that flow — keep next to the JS file and open in a browser to try it end to end. |
| `app/chroma-guide-autowire.js` | **Go-live shortcut:** copy the JS files into the site folder root and add script tags just before `</body>` in the app's `index.html` (see below). Inserts a separate "Take an Image" button after the Analyze My Colors control — the original button is untouched — and delivers the guided-camera capture through the app's own file input. If auto-detection misses, set `analyzeSelector`/`inputSelector` at the top of the file. |
| `app/fa-ui-tweaks.js` | Layout fix: moves "Hold to Compare" and "Save Photo" from below the style/aesthetic section to above it. Text-based detection with pinnable selectors (`FA_UI_TWEAKS` at the top); changes nothing if it can't find the elements. |

Script tags to add before `</body>`:

```html
<script src="/chroma-photo-guide.js"></script>
<script src="/chroma-guide-autowire.js"></script>
<script src="/fa-ui-tweaks.js"></script>
```
| `runbook.md` | The original implementation runbook, for reference. |

## Already verified — no further file work needed

- All 13 pages: correct trailing-slash canonicals, full og/twitter tags
  including `og:image:alt`/`twitter:image:alt`, `max-image-preview:large`,
  Article + FAQPage + BreadcrumbList schema (ItemList on the hub) with the
  FAQ text visible on-page as Google requires, absolute cross-links, no
  `noindex`, no executable scripts.
- **404.html caveat:** Cloudflare Pages direct-upload projects without a
  `404.html` fall back to serving `index.html` for unknown paths. If any
  live URL (e.g. `/privacy`) currently depends on that fallback rather than
  a real file, adding `404.html` will surface it as a 404 — check the four
  legal URLs after deploy and remove `404.html` if anything breaks.
- Copy is already American English (runbook step 5: nothing to change).
- `og/og-cover.jpg` exists at exactly 1200×630 (runbook step 6: done).
- `sitemap.xml` is valid XML and includes the homepage, all 13
  color-analysis URLs, and the legal pages (extensionless — if the live site
  serves them as `.html`, edit those four `<loc>` lines to match before deploy).
- The hub's `#how-to-photograph` anchor exists and matches the app link above.

## Deploying on Cloudflare

Keep the `index.html`-per-directory structure when copying — that's what makes
Cloudflare serve clean `/color-analysis/soft-summer/` URLs.

- **Pages, direct upload:** merge `head.html` into the site folder's
  `index.html`, copy `site-root/*` into the folder root, then
  *Workers & Pages → project → Create deployment* and drag the **whole** site
  folder in (direct uploads replace the previous deployment wholesale).
- **Pages, git-connected:** commit the same changes to the connected repo;
  Pages redeploys on push.
- **Workers with static assets:** add the files to the assets directory and
  `wrangler deploy`.

Do not "fix" the trailing-slash canonicals: Cloudflare 301s
`/color-analysis/soft-summer` → `/color-analysis/soft-summer/`, so the tags
already match the served URLs.

## After deploying (in order of value)

1. **Google Search Console** — add a Domain property for `frameatelier.app`;
   add the TXT record it gives you in Cloudflare → DNS → Records; verify;
   submit `https://frameatelier.app/sitemap.xml`; request indexing of the
   homepage and `/color-analysis/`.
2. **Bing Webmaster Tools** — import the GSC verification in one click.
3. **Analytics (cookieless only — no GA4):** Cloudflare → Analytics & Logs →
   Web Analytics is the zero-effort path. If you want the funnel events
   (App Opened / Photo Chosen / Chroma Run / Photo Saved / Added To Home),
   use Plausible instead and wire `app/analytics-events.js` after its script
   tag.

## Post-deploy checks

- `/color-analysis/`, `/color-analysis/soft-summer/`, `/robots.txt`,
  `/sitemap.xml` all return 200; the no-slash forms 301 to the slash forms.
- `https://www.frameatelier.app/` still 301s to the apex.
- Homepage view-source: canonical reads `https://frameatelier.app/` (no www);
  viewport no longer contains `maximum-scale=1` or `user-scalable=no`.
- Link-preview debugger (opengraph.xyz) shows the 1200×630 card.
- Google Rich Results Test: valid `SoftwareApplication` on the homepage,
  valid FAQ on a season page.
