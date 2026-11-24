---
title: "Three Causes of a 502 on Cloudflare Pages (And How I Lost Two Days to Them)"
date: 2026-11-24
draft: false
translationKey: "cloudflare-pages-502"
slug: "cloudflare-pages-502"
summary: "A 502 from Cloudflare Pages almost never means your origin is down — there is no origin. Here are the three causes I hit in production, how to tell them apart in five minutes, and the checks that would have saved me two days."
tags: ["cloudflare", "hugo", "debugging", "deployment"]
categories: ["Engineering"]
keywords: ["cloudflare pages 502", "hugo deploy 502", "cloudflare pages custom domain error"]
ShowToc: true
TocOpen: true
---

I burned two days chasing a 502 on a site that had no backend. That sentence should have told me everything: **static hosting has no origin server, so a 502 is never about your code being down.** The error was in front of me the whole time — I was debugging the wrong layer.

## Why a 502 on Pages is misleading

- Pages serves from edge cache; 502 means the edge could not fetch a valid response, not that a server crashed.
- The three possible layers: DNS/proxy chain, build artifact, edge cache state.
- Fastest first move: fetch the `*.pages.dev` URL directly, bypassing your custom domain. If that works, skip to cause 1 or 3.

## Cause 1: The domain is proxied twice

- Symptom: `pages.dev` fine, apex domain returns 502.
- Mechanism: CNAME to `pages.dev` while the record is orange-clouded creates a proxy loop at the edge.
- Fix: set the record to "DNS only" (grey cloud), or move the zone's nameservers to Cloudflare and let Pages manage the record.
- How to confirm in 60 seconds with `dig` + the response headers.

## Cause 2: The build "succeeded" with an empty output

- Symptom: every URL 502s, including `pages.dev`.
- Two usual culprits: wrong `HUGO_VERSION` (theme fails silently), and a missing theme submodule — Hugo exits 0 with a near-empty `public/`.
- The one line in the build log that gives it away.
- Fix: pin the version, and make the build command `git submodule update --init --recursive && hugo --gc --minify`.

## Cause 3: Stale edge cache on apex while www updated

- Symptom: inconsistent — one hostname serves the old build, or returns 502 on paths that exist.
- Why purging alone does not always help, and what to purge instead.
- Prevention: a single canonical hostname + 301 for the other.

## The five-minute triage checklist

1. `curl -I https://your-site.pages.dev` → 200 means the domain layer is the problem.
2. `curl -I https://your-domain.com` → compare status codes.
3. `dig your-domain.com +short` → check for double proxying.
4. Open the deployment log, search for `Total in` and `error` — an empty page count is cause 2.
5. Re-run the deployment on the previous commit. If it is green, you have a build regression, not an infra issue.

## What I changed so it cannot recur

- Pinned Hugo version in the Pages environment, and committed the theme as a submodule with the update command baked into the build.
- Added a post-deploy smoke check: the build fails if `index.html` does not exist.
- One canonical host, one 301, no exceptions.

## Takeaways

- Read the error against the architecture: no origin means no "server down".
- Always test the platform URL before the branded one — it collapses the search space in half.
