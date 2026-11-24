---
title: "Ship a Bilingual Hugo Blog That Google Actually Indexes"
date: 2026-11-17
draft: false
translationKey: "bilingual-hugo-blog-seo"
slug: "bilingual-hugo-blog-seo"
summary: "A new site is not indexed because it is beautiful — it is indexed because it is crawlable, unambiguous, and has something to say. Here is the exact setup I use for a two-language Hugo blog, including the hreflang mistakes that silently halve your traffic."
tags: ["hugo", "seo", "blog", "multilingual"]
categories: ["Engineering"]
keywords: ["bilingual hugo blog", "hugo hreflang", "hugo sitemap google", "papermod multilingual"]
ShowToc: true
TocOpen: true
---

Most "SEO for blogs" advice is written for people who already have traffic. This is the version for a site with zero pages and zero backlinks, built in one weekend on free hosting.

## The three things that actually get a new site indexed

- **Crawlability**: `robots.txt` that does not block, a reachable `sitemap.xml`, and internal links between posts.
- **Unambiguity**: one canonical URL per piece of content (no `www` + apex + trailing-slash variants competing).
- **Signal**: a `<title>`, a `<meta description>`, and structured data that say the same thing.

Everything else is decoration at this stage.

## Setup: one repo, two content trees, one `translationKey`

- Why `contentDir` per language beats filename suffixes (`.zh.md`) once you pass ~20 posts.
- The `translationKey` contract: identical values in both versions, or Hugo treats them as unrelated articles.
- Directory layout and the URL shape you end up with.
- Config snippet, annotated.

## hreflang is not optional

- What Google does when two pages say the same thing in different languages with no `hreflang`: it picks one and ignores the other.
- The three tags you need: `hreflang="en"`, `hreflang="zh-CN"`, `hreflang="x-default"`.
- Common bug: emitting `hreflang` only on pages that have a translation, but forgetting the `x-default`.
- How to verify with Search Console's international targeting report.

## Submit once, then forget it

- Google Search Console: verify, submit `sitemap.xml`, request indexing for the first three posts only (the rest get found).
- Bing Webmaster Tools: worth it now that it feeds several AI answer engines.
- What "Discovered — currently not indexed" actually means, and when to worry (usually: thin content, not a technical problem).

## The 20/80 content rule

- 80% of posts chase a specific, low-competition query ("hugo 502 pages deploy"); 20% are personal essays that win by being human.
- Why essays get close to zero search traffic but raise conversion on everything else.
- How to pick a title you can still find in a year.

## Checklist before you tell anyone the site exists

- [ ] `hugo.yaml` → correct `baseURL` (trailing slash, `https`)
- [ ] `sitemap.xml` reachable and lists both languages
- [ ] `robots.txt` does not contain `Disallow: /`
- [ ] every page has a unique description
- [ ] `hreflang` renders on translated pages only
- [ ] JSON-LD passes the Rich Results test
- [ ] Search Console property verified
