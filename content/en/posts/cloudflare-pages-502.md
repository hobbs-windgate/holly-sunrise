---
title: "502 and 522 on Cloudflare Pages: There Is No Origin to Be Down"
date: 2026-11-24
lastmod: 2026-11-24
draft: false
translationKey: "cloudflare-pages-502"
slug: "cloudflare-pages-502"
summary: "The day I launched this blog, I hit three distinct failures on Cloudflare Pages: a build that broke, an environment variable that was set but never read, and the most confusing one — a hostname that existed while the site returned 522. On static hosting, a 5xx never means your server is down. It means the edge cannot find a usable deployment."
tags: ["cloudflare", "hugo", "debugging", "deployment"]
categories: ["Engineering"]
keywords: ["cloudflare pages 502", "cloudflare pages 522", "hugo deploy 502", "cloudflare pages build failed"]
ShowToc: true
TocOpen: true
---

The day I put this blog online, I ran into three distinct failures on Cloudflare Pages: a build that broke, an environment variable that was set but never read, and the most confusing one — a project that existed, a hostname that was assigned, and a homepage returning 522.

The three looked nothing alike in the logs, but the root cause was identical: **a 5xx on static hosting never means your server is down. It means the edge cannot find a usable deployment.** No origin means nothing to crash. Once that clicks, you debug in the opposite direction.

## Separate 502 from 522 before you do anything

- **502 Bad Gateway**: the edge got a response it could not use.
- **522 Connection Timed Out**: the edge could not reach whatever should be answering.
- **A static site has no process, no port, no remote service.** Both codes mean the same thing for you: there is no healthy deployment behind this hostname.

The implication is blunt: **stop looking at DNS and open your deployments list.** I lost my first hour staring at DNS records while the actual answer sat in the Deployments tab.

## Cause 1: the project exists, but no deployment ever succeeded

This is the most common source of a 522, and the easiest to misread.

Pages shows you `your-project.pages.dev` the instant the project is created. **That address is reserved, not live.** If no build has ever succeeded, requesting it returns 522 — the hostname exists, but nothing is serving it.

Two things to check:

1. **Is the top entry in Deployments `Success`, and does it carry a `Production` badge?** If every entry says `Failure`, that is your answer.
2. **The production branch must match the branch you actually push.** My repo uses `main`. Had I left that field at `master`, every build would be classified as a Preview, the production hostname would stay empty forever — and the build logs would look perfectly healthy, with only the badge saying `Preview`.

In my case the log said `Failed: error occurred while running build command` in plain text, while I was busy suspecting DNS.

## Cause 2: the build failed, but the errors pointed somewhere else

What actually broke the build was this:

```text
WARN  Module "PaperMod" is not compatible with this Hugo version: Min 0.158.0
ERROR => hugo v0.158.0 or greater is required for hugo-PaperMod to build
```

But immediately after came twenty lines of this:

```text
ERROR render of "/404" failed: baseof.html:12:50: executing "404.html"
  at <.Language.Direction>: can't evaluate field Direction in type *langs.Language
```

Those twenty lines are **collateral damage**, not the cause. The older Hugo release has no `Direction` field on its `Language` struct, and the theme touches it on the first line of its base template — so every page fails once, and the error gets duplicated twenty times.

**This is the single most useful lesson here: the error that appears most often is rarely the root cause.** A template bug referenced by every page looks like the protagonist simply because it is loud.

The root cause is one line, easy to skim past:

```text
hugo v0.147.7-189453612e4bedc4f27495a7b1145321c8d89807+extended linux/amd64
```

The platform's default Hugo was older than the theme requires. Everything else downstream.

## Cause 3: the environment variable was set, and never read

The documented fix is `HUGO_VERSION`. I set it, redeployed, and the log still said `0.147.7` — **with no error whatsoever**.

Two traps, both silent:

1. **Pages splits variables into Production and Preview.** Set one and the other path keeps using the default.
2. **Workers and Pages now share one entry point, and there are two separate variable systems: build-time and runtime.** Put it in the runtime set and your build script will never see it.

"Configuration that exists but nobody reads" is the worst class of bug, because it produces no log line at all. You just watch the output fail to change.

So I stopped depending on platform configuration. The repo now carries a `build.sh` that fetches the exact Hugo version it needs:

```bash
HUGO_VERSION="${HUGO_VERSION:-0.170.1}"
URL="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
curl -fsSL --retry 3 "$URL" -o /tmp/hugo.tar.gz
tar -xzf /tmp/hugo.tar.gz -C "$BIN_DIR" hugo
exec "$BIN_DIR/hugo" --gc --minify
```

The build command becomes `bash build.sh`. Two properties fall out of it:

- **The version lives in the repo.** Anyone who clones it gets the same artifact, and it is no longer hidden in a dashboard page only you can click.
- **A misconfigured variable cannot break the build**, because the script has a default and accepts `0.170.1`, `extended_0.170.1`, or `v0.170.1`.

The cost is ten-odd seconds per build for the download.

## One bonus trap that bites SEO

Pages responds to `/*.html` with a **308 redirect** to the extensionless path. Harmless most days, fatal during Google site verification: the verification file must return **200 with its content at the exact URL**. A redirect can fail it.

`_redirects` can express a 200-status rewrite, which cancels the behavior:

```text
/googlexxxxxxxx.html  /googlexxxxxxxx  200
```

Do not delete that file later. Verification will start failing at Google's next re-check, with a message that never mentions redirects.

## The five-minute triage

```bash
# 1. Hit the platform hostname first, bypassing your custom domain
curl -I https://your-site.pages.dev

# 2. Then the branded domain, and compare status codes
curl -I https://your-domain.com
```

3. Open **Deployments**. Is the top entry `Success`? Does it have a `Production` badge? Is the branch `main`?
4. Open that deployment's log and find the `hugo v` line. Does it satisfy the theme's minimum?
5. Search the log for the page count. A zero there means an empty artifact — a variant of cause 2.
6. Redeploy the last commit that worked. If it goes green, you have a build regression, not an infrastructure problem.

## What I locked down afterwards

- **Version control moved into the repo**: `build.sh`, with the build command set to `bash build.sh`.
- **Run the same command locally before pushing.** If my machine renders 60 pages, I do not outsource verification to a remote log.
- **`baseURL` and the project name are bound together.** When they disagree, every sitemap and RSS link is wrong — and nothing errors.
- **Crawl the sitemap after every deploy.** I shipped only after all 62 URLs returned 200. A successful submission is not the same as a valid one: a single 404 in there can get the whole set rejected.

## Takeaways

- **Static hosting has no origin.** On a 5xx, your first stop is the deployments list, not DNS.
- **The loudest error is usually not the root cause.** Look for the version, setting, or missing file that let all the other errors happen.
- **Configuration fails silently.** Anything that determines what your artifact looks like belongs in the repo — a script, a pinned version — not in a dashboard page where a wrong value produces no log and no error.
