---
title: "Cloudflare Pages 报 502 和 522：静态站没有源站，别在错的地方找"
date: 2026-11-24
lastmod: 2026-11-24
draft: false
translationKey: "cloudflare-pages-502"
slug: "cloudflare-pages-502"
summary: "这个站上线那天，我连着撞了三种失败：构建报错、环境变量设了等于没设、以及最迷惑的一种——域名分配了、主页却返回 522。静态托管的 5xx 从来不是「服务器挂了」，而是「边缘拿不到一份能用的部署」。三种原因、真实日志、五分钟排查顺序。"
tags: ["cloudflare", "hugo", "问题排查", "部署"]
categories: ["工程实践"]
keywords: ["cloudflare pages 502", "cloudflare pages 522", "hugo 部署 502", "cloudflare pages 构建失败"]
ShowToc: true
TocOpen: true
---

给这个博客上线的那天，我在 Cloudflare Pages 上连着撞了三种失败：构建报错、环境变量设了等于没设、以及最迷惑的一种——项目建好了，域名也分配了，主页却返回 522。

三种失败在日志里长得完全不一样，但根因是同一个：**静态托管的 5xx 从来不是「服务器挂了」，而是「边缘拿不到一份能用的部署」。** 没有源站，就没有东西可以挂。想通这一点，排查方向会整个反过来。

## 先分清 502 和 522，别看错方向

- **502 Bad Gateway**：边缘拿到了一个不能用的响应。
- **522 Connection Timed Out**：边缘连不上背后的东西。
- **静态站没有进程、没有端口、没有远程服务。** 所以这两个错误码对你都意味着同一件事：这个主机名背后没有一个健康的部署。

推论很直接：**别去查「服务器」，去看部署列表。** 我第一次卡住，就是因为盯着域名解析看了很久，而真正的答案在 Deployments 里躺着。

## 原因一：项目建好了，但一次成功的部署都没有

这是 522 最常见的来源，也是最容易误判的。

Pages 在项目创建的那一瞬间，就把 `xxx.pages.dev` 显示在概览页上了。**这个地址是「预留」的，不是「已上线」的。** 如果从来没有一次构建成功过，访问它就会得到 522——域名有了，背后没人服务。

两个检查点：

1. **Deployments 列表最上面那条是不是 `Success`，有没有 `Production` 徽章。** 全是 `Failure`，就是它。
2. **Production branch 必须和你实际推送的分支一致。** 我的仓库是 `main`，如果这项填成 `master`，每次构建都会被归为 Preview，`xxx.pages.dev` 这个生产地址永远空着——而构建日志一切正常，只有徽章上写着 Preview。

我当时的日志里明明白白写着 `Failed: error occurred while running build command`，我却在怀疑 DNS。

## 原因二：构建失败了，但报错指向了错误的位置

真正让构建挂掉的是这个：

```text
WARN  Module "PaperMod" is not compatible with this Hugo version: Min 0.158.0
ERROR => hugo v0.158.0 or greater is required for hugo-PaperMod to build
```

但紧接着刷了二十行这种：

```text
ERROR render of "/404" failed: baseof.html:12:50: executing "404.html"
  at <.Language.Direction>: can't evaluate field Direction in type *langs.Language
```

那二十行是**连带伤害**，不是根因。旧版 Hugo 的 `Language` 结构体没有 `Direction` 字段，而主题的第一行模板就用到了它——于是每个页面都渲染失败一次，报错被复制了二十遍。

**这是我最想强调的一条：报错条数最多的那条，通常不是根因。** 一个被所有页面引用的模板错误，会因为它出现的次数多而显得像主角。

找根因只需要一行：构建日志里的

```text
hugo v0.147.7-189453612e4bedc4f27495a7b1145321c8d89807+extended linux/amd64
```

平台给的默认版本低于主题要求，其它所有报错都是它的下游。

## 原因三：环境变量设了，但构建没读到

官方解法是设 `HUGO_VERSION`。我设了，重新部署，日志里还是 `0.147.7`，而且**没有任何报错**。

原因有两个，都很隐蔽：

1. **Pages 的变量分 Production 和 Preview 两个环境。** 只加了一个，另一条路径仍然走默认。
2. **现在 Workers 和 Pages 共用入口，变量分「构建时」和「运行时」两套。** 加到运行时那套里，构建脚本根本读不到。

这类「配置存在但没人读」的问题最难查，因为它不产生任何日志——你只会看到结果没变。

我的选择是**不再依赖平台配置**。仓库里放一个 `build.sh`，构建时自己下载指定版本的 Hugo：

```bash
HUGO_VERSION="${HUGO_VERSION:-0.170.1}"
URL="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
curl -fsSL --retry 3 "$URL" -o /tmp/hugo.tar.gz
tar -xzf /tmp/hugo.tar.gz -C "$BIN_DIR" hugo
exec "$BIN_DIR/hugo" --gc --minify
```

Build command 从 `hugo --gc --minify` 改成 `bash build.sh`。换来两个性质：

- **版本写在仓库里**，任何人 clone 下来结果都一样，不再藏在只有你能点的后台。
- **环境变量设错也不会挂**，脚本有默认值，还兼容 `0.170.1` / `extended_0.170.1` / `v0.170.1` 三种写法。

代价是每次构建多花十几秒下载。

## 顺带一个会咬到 SEO 的坑

Pages 会对 `/*.html` 返回 **308 跳转**到无后缀路径。平时无害，但做 Google 站点验证时很致命：验证文件要求原 URL **直接返回 200 + 文件内容**，被跳转就可能验证失败。

Pages 的 `_redirects` 支持用 200 状态做重写，可以抵消：

```text
/googlexxxxxxxx.html  /googlexxxxxxxx  200
```

这个文件以后不能删，否则 Google 复检时会突然失败。

## 五分钟排查清单

```bash
# 1. 先打平台给的地址，绕开自定义域名
curl -I https://你的站点.pages.dev

# 2. 再打品牌域名，对比状态码
curl -I https://你的域名.com
```

3. 打开 **Deployments**，看最上面那条：`Success` 吗？有 `Production` 徽章吗？分支是 `main` 吗？
4. 点进那条部署的日志，找 `hugo v` 那一行，版本是否满足主题要求。
5. 在日志里搜页数统计。英文站是 0 页，说明产物为空——那是原因二的变体。
6. 拿上一次成功的 commit 重新部署一次。变绿了，就是构建回归，不是基础设施问题。

## 我最后固化了什么

- **版本控制回到仓库**：`build.sh` + Build command 改 `bash build.sh`。
- **推送前本地跑同一条命令**：本地能出 60 页再推，不把验证工作交给云端日志。
- **`baseURL` 和项目名绑死**：两者不一致时，sitemap 和 RSS 里全是错链接，而且不报错。
- **上线后逐条抓 sitemap**：这次 62 条 URL 全部返回 200 才收工。提交成功不等于有效，里面混一条 404，Google 可能整批判废。

## 小结

- **静态站没有源站。** 遇到 5xx，第一站是部署列表，不是 DNS。
- **报错条数最多的那条，通常不是根因。** 找那个让其它错误得以发生的版本号、配置项或缺失文件。
- **配置会静默失效。** 凡是决定「产物长什么样」的东西，尽量放回仓库（脚本、锁定版本），而不是放在一个只有你能点的后台页面里——那里配错了，日志不会告诉你。
