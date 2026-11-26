---
title: "双语 Hugo 博客上线清单：让 Google 真正收录它"
date: 2026-11-17
draft: false
translationKey: "bilingual-hugo-blog-seo"
slug: "bilingual-hugo-blog-seo"
summary: "新站被收录，不是因为它好看，而是因为它可抓取、不含歧义、有话说。这是我做双语言 Hugo 博客的完整配置，包括那个会悄悄砍掉你一半流量的 hreflang 错误。"
tags: ["hugo", "seo", "博客", "多语言"]
categories: ["工程实践"]
keywords: ["双语 hugo 博客", "hugo hreflang 配置", "hugo sitemap 提交", "papermod 多语言"]
ShowToc: true
TocOpen: true
---

大部分「博客 SEO」文章是写给已经有流量的人的。这一篇写给一个页面数为零、外链为零、周末两天搭完挂在免费托管上的站。

## 真正让新站被收录的三件事

- **可抓取**：`robots.txt` 没拦、`sitemap.xml` 能访问、文章之间有内链。
- **不含歧义**：同一篇内容只有一个规范 URL（别让 `www`、裸域、带不带斜杠的版本互相打架）。
- **有信号**：`<title>`、`<meta description>`、结构化数据三者说的是同一件事。

这个阶段，其他都是装饰。

## 结构：一个仓库、两棵内容树、一个 `translationKey`

- 为什么过了 20 篇以后，`contentDir` 分语言比文件名后缀（`.zh.md`）好维护。
- `translationKey` 的约定：两版必须完全一致，否则 Hugo 认为是两篇无关文章。
- 目录结构，以及最终得到的 URL 形态。
- 配置片段，逐行注释。

## hreflang 不是可选项

- 两种语言的同一篇内容如果没有 `hreflang`，Google 会挑一篇、忽略另一篇。
- 必须的三个标签：`hreflang="en"`、`hreflang="zh-CN"`、`hreflang="x-default"`。
- 常见 bug：只在有译文的页面输出了 `hreflang`，但漏了 `x-default`。
- 用 Search Console 的国际定位报告验证。

## 提交一次，然后忘掉它

- Google Search Console：验证站点、提交 `sitemap.xml`，只对前三篇手动请求收录（其余会被自然发现）。
- Bing Webmaster Tools：现在它会给多个 AI 搜索供数据，值得做。
- 「已发现但未收录」到底什么意思，什么时候该担心（通常是内容太薄，不是技术问题）。

## 20/80 内容法则

- 80% 的文章去打具体、低竞争的长尾（比如「hugo 部署 502」）；20% 写个人感悟，靠「是人」取胜。
- 为什么感悟类几乎拿不到搜索流量，却会抬高其他所有文章的转化。
- 怎么起一个一年后自己还搜得到的标题。

## 告诉别人这个站存在之前，先过这张表

- [ ] `hugo.yaml` 里 `baseURL` 正确（结尾带斜杠、`https`）
- [ ] `sitemap.xml` 可访问，且两种语言都在里面
- [ ] `robots.txt` 里没有 `Disallow: /`
- [ ] 每页都有独立的 description
- [ ] `hreflang` 只出现在有译文的页面
- [ ] JSON-LD 能通过富媒体测试
- [ ] Search Console 已验证
