#!/usr/bin/env python3
"""Static per-page SEO audit for a site's source tree.

Usage:
    python3 quick-audit.py <root-dir> [--host https://example.com]

Reports, per page: title/description length (rendered, not raw HTML; error pages skipped), canonical
presence + host match, og/twitter completeness, h1 count, images missing alt,
noindex, and sitemap coverage. Read-only; no network calls.
"""
import sys, os, re, html, glob, argparse

def rendered_len(s):
    return len(html.unescape(s))

def find_pages(root):
    pages = []
    skip = {'node_modules', '.git', 'dist', 'build', '.next', 'out'}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for f in filenames:
            if f.endswith('.html'):
                pages.append(os.path.join(dirpath, f))
    return sorted(pages)

def url_for(path, root, host):
    rel = os.path.relpath(path, root).replace(os.sep, '/')
    if rel == 'index.html':
        return host + '/'
    if rel.endswith('/index.html'):
        return host + '/' + rel[:-len('index.html')]
    return host + '/' + rel[:-len('.html')]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--host', default='')
    a = ap.parse_args()

    sitemap = ''
    for cand in glob.glob(os.path.join(a.root, '**', 'sitemap*.xml'), recursive=True):
        sitemap += open(cand, encoding='utf-8', errors='ignore').read()

    pages = find_pages(a.root)
    total_issues = 0
    for p in pages:
        s = open(p, encoding='utf-8', errors='ignore').read()
        name = os.path.relpath(p, a.root)
        issues = []

        # Error pages are meant to be noindex and need no social meta.
        if os.path.basename(p) in ('404.html', '500.html'):
            continue

        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', s, re.I):
            issues.append('NOINDEX present')

        t = re.search(r'<title[^>]*>(.*?)</title>', s, re.S | re.I)
        if not t:
            issues.append('no <title>')
        elif rendered_len(t.group(1).strip()) > 62:
            issues.append(f'title {rendered_len(t.group(1).strip())} rendered chars (>62)')

        d = re.search(r'name=["\']description["\'][^>]*content=["\'](.*?)["\']', s, re.S | re.I)
        if not d:
            issues.append('no meta description')
        elif rendered_len(d.group(1)) > 160:
            issues.append(f'description {rendered_len(d.group(1))} chars (>160)')

        c = re.search(r'rel=["\']canonical["\'][^>]*href=["\'](.*?)["\']', s, re.I)
        if not c:
            issues.append('no canonical')
        elif a.host and not c.group(1).startswith(a.host):
            issues.append(f'canonical host mismatch: {c.group(1)}')

        for pat, label in [
            (r'property=["\']og:title', 'og:title'),
            (r'property=["\']og:description', 'og:description'),
            (r'property=["\']og:url', 'og:url'),
            (r'property=["\']og:image', 'og:image'),
            (r'name=["\']twitter:card', 'twitter:card'),
        ]:
            if not re.search(pat, s, re.I):
                issues.append(f'missing {label}')

        if not re.search(r'<html[^>]+lang=', s, re.I):
            issues.append('no lang attribute')

        h1 = len(re.findall(r'<h1[\s>]', s, re.I))
        if h1 != 1:
            issues.append(f'{h1} h1 tags')

        noalt = [i for i in re.findall(r'<img\s[^>]*>', s, re.I) if not re.search(r'\salt=', i, re.I)]
        if noalt:
            issues.append(f'{len(noalt)} img without alt')

        if sitemap and a.host:
            u = url_for(p, a.root, a.host)
            if u not in sitemap and os.path.basename(p) != '404.html':
                issues.append(f'not in sitemap ({u})')

        if issues:
            total_issues += len(issues)
            print(f'\n{name}')
            for i in issues:
                print(f'  - {i}')

    print(f'\n{len(pages)} pages audited, {total_issues} issues found')
    return 1 if total_issues else 0

if __name__ == '__main__':
    sys.exit(main())
