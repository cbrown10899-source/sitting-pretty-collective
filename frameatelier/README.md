# Frame Atelier — SEO fix files (deploy to Cloudflare)

These files implement the July 28, 2026 SEO audit for **frameatelier.app**.
They are staged in this folder only because the Frame Atelier site itself is
hosted on Cloudflare, not in a GitHub repo — **nothing in this folder affects
the Sitting Pretty Collective site.**

## What's here

| File | Goes where on frameatelier.app |
|---|---|
| `head.html` | Merge into the `<head>` of `index.html` (replace matching tags, keep icons/manifest/styles). Includes the JSON-LD structured data. |
| `robots.txt` | Site root → `https://frameatelier.app/robots.txt` |
| `sitemap.xml` | Site root → `https://frameatelier.app/sitemap.xml` |

## Still to create (not in this folder)

- **`/og/og-cover.jpg` at 1200×630** — required before the og/twitter image
  tags do anything. Use the drape screenshot or a before/after split.
- `/shots/shot-editor.jpg`, `/shots/shot-chroma.jpg`, `/shots/shot-drape.jpg`
  (referenced by the structured data's `screenshot` field) — or remove that
  field from the JSON-LD if you'd rather skip them for now.
- If `privacy.html` / `terms.html` / `support.html` / `contact.html` don't all
  exist yet, delete their entries from `sitemap.xml` — a sitemap listing 404s
  hurts more than a short sitemap.

## Deploying on Cloudflare

**Cloudflare Pages, direct upload:** edit the files locally, then
*Workers & Pages → your project → Create deployment* and drag the whole site
folder in (uploads replace the previous deployment wholesale, so upload
everything, not just the changed files).

**Cloudflare Pages, git-connected:** the source repo is whatever Pages shows
under *Settings → Builds & deployments*. Commit these changes there; Pages
redeploys on push.

**Workers with static assets:** update the files in the assets directory and
`wrangler deploy`.

The www → non-www 301 already works — no Cloudflare redirect rules need to
change. These files just stop the pages from declaring the www version
canonical.

## After deploying (in order of value)

1. **Google Search Console** — verify the domain via a DNS TXT record, which
   is trivial on Cloudflare: dashboard → your zone → DNS → Records → add the
   TXT value GSC gives you. Then submit `https://frameatelier.app/sitemap.xml`
   and request indexing of the homepage.
2. **Bing Webmaster Tools** — import the GSC verification directly.
3. **Cloudflare Web Analytics** — since the site is already on Cloudflare
   this is the zero-cost, cookieless option: dashboard → Analytics & Logs →
   Web Analytics → enable for the site. If the domain is proxied (orange
   cloud), Cloudflare can inject the beacon automatically — no code change.
   (Plausible remains the alternative if you want custom events like
   `Chroma Run` — Cloudflare Web Analytics doesn't do custom events.)
4. Publish the `/color-analysis/` hub page, then season pages, per §7 of the
   audit — that's the actual traffic strategy; everything above just makes
   the site crawlable.

## Verification checklist (post-deploy)

- `curl -s https://frameatelier.app/ | grep canonical` → shows non-www.
- `https://frameatelier.app/robots.txt` and `/sitemap.xml` return 200.
- Paste the URL into a link-preview debugger (opengraph.xyz or a Slack/iMessage
  preview) → large 1200×630 card, not a grey square.
- Google's Rich Results Test on the homepage → valid `SoftwareApplication`.
- Confirm the viewport no longer contains `maximum-scale=1` or
  `user-scalable=no` (the head.html here already omits them).
