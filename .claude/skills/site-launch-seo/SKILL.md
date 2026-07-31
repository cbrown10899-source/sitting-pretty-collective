---
name: site-launch-seo
description: End-to-end SEO + AI-search (GEO) pipeline for any website or web app — audit, fix, build content, and set up measurement in one pass. Use when the user says "run SEO on this site", "get this site ranking", "SEO launch", "make this findable", "set up SEO", "prep this for search", "why isn't my site getting traffic", or points at a new/relaunched site. Works on static sites, SPAs, PWAs, Next/Astro/Vite builds, and hand-written HTML. Orchestrates the installed SEO/GEO skill packs where present and falls back to its own checks where they aren't.
argument-hint: "<domain or path> [--audit-only] [--no-content]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebFetch
  - Write
  - Edit
---

# Site Launch SEO

One command that takes a site from "exists" to "findable" — by humans through
Google and by AI answer engines. Run it on a new build, a relaunch, or a site
that quietly gets no traffic.

## Operating rules

1. **Verify before claiming.** Never report a fix as done without re-reading the
   file or re-fetching the URL. Never report a deploy as live without confirming
   the live response changed.
2. **Never fabricate trust signals.** No invented `aggregateRating`, review
   counts, author bios, or dates. Fabricated schema is a manual-action risk.
3. **Diagnose from the live site, fix in the source.** A fix that only exists in
   a build output gets overwritten on the next build.
4. **One canonical host, everywhere.** Pick apex or www once; every canonical,
   `og:url`, sitemap entry, robots reference, and internal link matches it.
5. **State what you did not do.** If a phase is skipped or blocked, say so in
   the final report rather than letting silence imply coverage.

## Phase 0 — Establish ground truth

Do not skip this. Most wasted SEO work comes from guessing the setup.

```bash
# What kind of site is this?
ls; cat package.json 2>/dev/null | head -30
# Where does it deploy from? (git remote, wrangler/vercel/netlify config, CI)
git remote -v 2>/dev/null; ls wrangler.* vercel.json netlify.toml .github/workflows 2>/dev/null
# What ships to the browser? Distinguish source from build output.
ls dist build out public .next 2>/dev/null
```

Then determine, and write down:

- **Canonical host** — fetch both `https://example.com` and `https://www.example.com`
  and record which 301s to which. This is the target for every URL you write.
- **Rendering** — server-rendered/static, or client-rendered? If content only
  exists after JS runs, note it: crawlable but slower to index, and AI crawlers
  frequently do not execute JS at all.
- **Deploy path** — how does a change actually reach production? If deploys are
  manual uploads, say so in the report; changes you make are not live until
  someone deploys them.
- **Existing state** — is there a `robots.txt`, `sitemap.xml`, `llms.txt`,
  analytics, Search Console?

## Phase 1 — Technical foundation (blocking issues first)

These are the defects that make everything else pointless. Check every one.

- **Indexability.** `<meta name="robots">` containing `noindex`, and
  `X-Robots-Tag` response headers. A leftover launch-phase `noindex` is the most
  common cause of "we have no traffic at all."
- **Canonical correctness.** Every page's canonical must be self-referential and
  on the canonical host. A canonical pointing at a URL that redirects is a real
  and common defect — check the canonical target's status code, not just its text.
- **robots.txt** — reachable, not blocking assets (CSS/JS blocked breaks
  rendering), and pointing at the sitemap on the canonical host.
- **sitemap.xml** — valid XML, canonical-host URLs only, no redirects or 404s
  inside it, every real page present, nothing dead listed.
- **Response headers.** Read `_headers`, `netlify.toml`, `next.config.*`,
  middleware, or server config. Two things bite hard:
  - `Permissions-Policy` disabling features the site itself needs (a blanket
    `camera=()` breaks in-app camera; `geolocation=()` breaks store locators).
    Scope to `(self)` rather than deleting the protection.
  - `X-Frame-Options`/CSP `frame-ancestors` are fine, but a CSP missing
    `blob:`/`data:` in `img-src` silently breaks user-uploaded image previews.
- **Redirect hygiene.** No chains, no loops, http→https once, trailing-slash
  behavior consistent with what canonicals claim.
- **Service worker / cache.** If a SW exists, confirm its cache version is bumped
  on deploy and that navigations are network-first — otherwise returning users
  and crawlers can be served stale HTML indefinitely.
- **404 handling.** Unknown URLs must return a real 404, not a 200 with the
  homepage (soft-404s waste crawl budget). Note: adding a `404.html` to a
  direct-upload static host changes the fallback that clean URLs may rely on —
  verify existing routes still resolve afterward.
- **Core Web Vitals sanity** — oversized hero images, render-blocking fonts,
  layout shift from unsized images. Use the `geo-technical` or `seo-analysis`
  skill if installed; otherwise check image dimensions and `loading="lazy"`.

## Phase 2 — On-page, every page

Iterate every indexable page. Use `meta-tags-optimizer` and `seo-page` if
installed; otherwise apply directly:

- **Title** ≤ ~60 rendered characters — count *rendered* length, not raw HTML
  (`&amp;`, `&mdash;` inflate the raw count and cause false positives).
  Lead with the term people actually search, not internal product language.
- **Meta description** ≤ ~155 rendered characters, written as ad copy.
- **Exactly one `<h1>`**, and a heading order that reflects real structure.
- **Open Graph + Twitter**: `og:title`, `og:description`, `og:url` (canonical
  host), `og:type`, `og:site_name`, `og:locale`, plus an `og:image` that is a
  real **1200×630** image with `og:image:width`/`height`/`alt`. An app icon as
  `og:image` produces a grey square in every share. Twitter card should be
  `summary_large_image` for anything visual, `summary` for text pages.
- **`lang` attribute** on `<html>`; hreflang only if genuinely multi-locale.
- **Images**: descriptive `alt` on every content image, dimensions set, modern
  formats, `loading="lazy"` below the fold. Run `image-seo` if installed —
  image search is a real traffic source for visual sites.
- **Structured data**: the type that matches reality (`SoftwareApplication`,
  `Article`, `Product`, `LocalBusiness`, `FAQPage`, `BreadcrumbList`). FAQ markup
  is only valid when the same Q&A is **visible on the page**. Validate with
  Rich Results Test. Use `geo-schema` or `nf-schema-markup-generator`.

## Phase 3 — Findability of the content itself

The highest-impact and most-skipped step.

- **Orphan check.** For every page in the sitemap, grep the codebase for a link
  to it. Pages reachable only via sitemap rank far worse than linked ones. New
  content sections are almost always born orphaned.
- **Always-visible links.** A link inside a `display:none` block, a modal, or a
  screen the app hides by default is discounted. Put the internal link mesh in
  markup that renders for everyone — a footer nav, a directory section, a hub.
- **Hub-and-spoke.** A hub page targeting the head term, spokes targeting
  long-tail variants, every spoke linking up to the hub and sideways to its two
  nearest siblings. This is how a content set compounds instead of sitting flat.
- **Anchor text** that contains the target phrase, not "click here".

## Phase 4 — Content strategy (skip with `--no-content`)

Use `keyword-research`, then `content-strategy` / `content-planner`.

- Identify the **category term** people search, which is usually *not* the brand
  name. If the brand name collides with established businesses, say so plainly
  and pivot the strategy to category terms.
- Prefer **question-shaped long-tail** ("am I X or Y", "how do I…", "X vs Y") —
  lower competition, higher intent, and eligible for FAQ rich results.
- If the topic has a natural enumerable set (locations, seasons, models,
  integrations, comparisons), that is a **programmatic SEO** opportunity — run
  `programmatic-seo` / `nf-programmatic-seo`. Every generated page needs unique
  substantive content; near-duplicate templates get filtered, not ranked.
- Every content page ends in a **path into the product**.

## Phase 5 — AI search (GEO)

Increasingly where discovery happens; most sites have done nothing here.

- **AI crawler access** — `geo-crawlers`. Confirm GPTBot, OAI-SearchBot,
  ClaudeBot, PerplexityBot, Google-Extended are not blocked in robots.txt or by
  headers. Legacy "block all bots" rules are the usual culprit.
- **`llms.txt`** at the site root — `geo-llmstxt`. Identity line, explicit key
  facts (price, platform, privacy, availability), and a curated directory of
  pages with citation-ready descriptions.
- **Citability** — `geo-citability`. AI engines cite pages that state facts
  plainly, in self-contained paragraphs, with specifics rather than marketing
  adjectives.
- **Platform tuning** — `geo-platform-optimizer` for AI Overviews / ChatGPT /
  Perplexity differences. `geo-audit` gives a composite score if you want one
  number to track.

## Phase 6 — Measurement, then baseline

Without this the next session is guessing again.

- **Search Console**: verify (DNS TXT is easiest when DNS and hosting share a
  provider), submit the sitemap, request indexing on the homepage and each hub.
  If the property already exists, check for an existing verification before
  starting a new one.
- **Bing Webmaster Tools**: import from GSC — one click, and it feeds several AI
  products.
- **Analytics**: prefer cookieless (Cloudflare Web Analytics, Plausible, Umami)
  — no consent banner, and it does not contradict a privacy-first pitch. Never
  add GA4 to a site whose selling point is privacy without saying why that is a
  conflict.
- **Instrument the funnel**: 3–6 named events ending at the one conversion that
  actually matters.
- **Baseline snapshot** — run `nf-seo-drift` (or record titles, canonicals,
  indexed count, and CWV in a dated file) so regressions are detectable later.

## Phase 7 — Report

Write `SEO-REPORT-<date>.md` in the repo:

1. **Ground truth** — canonical host, rendering mode, deploy path, live-vs-source status.
2. **Fixed** — each change, the file it landed in, and why it mattered.
3. **Deploy status** — explicitly: is this live, or does someone need to deploy?
4. **Backlog, ranked** — highest-impact first, each with an effort estimate.
5. **Not done** — phases skipped, checks blocked, and what would unblock them.
6. **Watch list** — what to check in Search Console in 7 / 30 days, and the
   decision each check informs.

## Failure modes to check before declaring success

- Changes made in `dist/` or `build/` instead of source.
- Canonical host inconsistent between HTML, sitemap, robots, and internal links.
- The deploy never reached production (preview branch, failed upload, wrong
  project). Confirm by re-fetching the live URL and finding the new content.
- A stale service worker still serving the old HTML.
- Sitemap listing URLs that redirect or 404.
- FAQ/Article schema whose content is not visible on the page.
- New pages orphaned — in the sitemap, linked from nowhere.
- A security header disabling a feature the site needs.
