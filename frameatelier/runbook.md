# Frame Atelier — Implementation Runbook (Cloudflare)

Two lanes. **Lane A** is a prompt you paste into Claude Code on the desktop — it does the file work and the deploy. **Lane B** is three things only you can do (they need account access or a credential). Do A, then B.

Companion files: `frameatelier-seo-fixpack.md` (the exact head block, schema, robots.txt, sitemap) and `color-analysis-pages.zip` (the 13 pages + sitemap fragment).

---

## Lane A — paste into Claude Code

> I'm deploying SEO fixes and 13 new pages to frameatelier.app, which is hosted on Cloudflare. Work through this in order and show me each diff before deploying. Don't deploy until I confirm.
>
> **1. Detect the deploy setup.** Look in this repo for `wrangler.toml`/`wrangler.jsonc`, a `.git` remote, a `functions/` dir, and any existing Cloudflare Pages/Workers config. Tell me which of these it is: (a) Pages with Git auto-deploy, (b) Pages via `wrangler pages deploy`, or (c) Workers Assets via `wrangler deploy`. Everything downstream depends on this — report it before continuing.
>
> **2. Fix the `<head>` on the homepage.** Find the main `index.html` (or the template that renders it). Replace the existing title/meta/canonical/og/twitter tags with the corrected block in `frameatelier-seo-fixpack.md` §2. The critical change: canonical and og:url currently point to `https://www.frameatelier.app/` (which 301s away) — they must be the apex `https://frameatelier.app/`. Also add the `SoftwareApplication` JSON-LD from §3, and remove `maximum-scale=1, user-scalable=no` from the viewport tag.
>
> **3. Add robots.txt and sitemap.xml** at the site root using §4 and §5 of the fixpack. If a sitemap already exists, merge — don't overwrite. Then append the `<url>` entries from `sitemap-color-analysis-fragment.xml` into the sitemap's `<urlset>`.
>
> **4. Drop in the color-analysis pages.** Unzip `color-analysis-pages.zip` and place the `color-analysis/` folder at the site root, preserving the `index.html`-per-directory structure (this is what makes Cloudflare serve clean trailing-slash URLs like `/color-analysis/soft-summer/`). Don't flatten it.
>
> **5. Americanise the copy.** In the `color-analysis/` files, replace "colour"→"color", "Colour"→"Color", "-ise"→"-ize" (americanise→americanize, etc.), and "grey"→"gray". US search volume is overwhelmingly the American spellings and that's the target audience.
>
> **6. Build the OG image.** There's no `/og/og-cover.jpg` yet; the corrected head block references it. Composite one at exactly 1200×630 from the existing `/shots/shot-drape.jpg` or `shot-look.jpg` (the before/after) plus the wordmark. Save to `/og/og-cover.jpg`. Right now shared links show a tiny app icon — this fixes it.
>
> **7. Verify locally, then deploy** using whatever method you found in step 1. After deploy, curl these and confirm each returns 200 at the trailing-slash form and 301s cleanly from the non-slash form:
> `/color-analysis/`, `/color-analysis/soft-summer/`, `/robots.txt`, `/sitemap.xml`.
> Also confirm `https://www.frameatelier.app/` still 301s to apex.

> **8. Add the photo-tips panel to the app.** The Chroma read is only as good as the photo, so surface the guidance where people choose a photo. Take `photo-tips-panel.html` (self-contained, no dependencies, scoped under `.fa-phototips`, dark theme already matched) and place it directly above or below the "Choose a Photo" button in the app. It's a collapsed `<details>` by default so it doesn't crowd the UI. Also add a small text link near it — "New to this? How to take the photo →" — pointing to `https://frameatelier.app/color-analysis/#how-to-photograph` for the full version. Don't rebuild the panel; just drop the markup in.

**One thing to watch:** Cloudflare Pages 301s `/color-analysis/soft-summer` → `/color-analysis/soft-summer/` (adds the slash for directories). The canonical tags in the pages already point to the trailing-slash form, so they're aligned — don't "fix" them to strip the slash, that would re-break the canonical. If the deployed URL and the canonical tag ever disagree, make the tag match the served URL, not the other way round.

---

## Lane B — your hands only

Claude Code can't do these; they need your login or create an account.

**1. Google Search Console — the single highest-value step.**
Go to Search Console → add property → **Domain** property (`frameatelier.app`). It gives you a `TXT` record. Add it in Cloudflare → your zone → **DNS** → Add record (Type TXT, Name `@`, the value they give). Back in Search Console, hit Verify. Then Sitemaps → submit `https://frameatelier.app/sitemap.xml`. This is Google reporting back what it sees of you — you have none of that visibility right now.

**2. Plausible (or Cloudflare Web Analytics).**
If you'd rather not add a tool: Cloudflare → your zone → **Analytics → Web Analytics** turns on a cookieless tag with one click, no signup. That's the zero-effort path and it fits the privacy pitch.
If you want the events funnel (App Opened / Photo Chosen / **Chroma Run** / Photo Saved / Added to Home Screen), create a Plausible account, add `frameatelier.app`, and paste their one-line script into the head — then Claude Code can wire the five custom events from fixpack §6. Chroma Run is the one that tells you whether color analysis is the real draw.

**3. Do NOT add Google Analytics.** It sets cookies, ships behavioral data to Google, and forces a consent banner — directly contradicting "photos never leave your device." Both options above are cookieless and need no banner.

---

## Order of operations

Lane A steps 1–7 (one Claude Code session) → confirm the four URLs resolve → Lane B step 1 (GSC + submit sitemap) → Lane B step 2 (analytics). GSC won't show data for a few days; that's normal. Ship the hub + 3–4 season pages' worth of promotion first and watch which seasons pick up impressions before pushing all twelve.

## Deliberately deferred

The homepage still renders the landing copy and the full app UI in one DOM, so Google indexes "INTENSITY 100%", "Hold to Compare", etc. as page text. Worth splitting the app onto its own route later, but it's not blocking — don't let it hold up this deploy.
