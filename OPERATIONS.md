# Holly Sunrise 操作手册

> 站点：https://holly-sunrise.pages.dev
> 仓库：https://github.com/hobbs-windgate/holly-sunrise
> 技术栈：Hugo 0.170.1 + PaperMod，双语（英文在 `/`，中文在 `/zh/`），托管 Cloudflare Pages

---

## 0. 一句话总览

**写作 → 本地看效果 → `git push` → 自动上线。** 没有 FTP，没有后台上传，没有"发布按钮"。代码推上去，Cloudflare 会在 1–2 分钟内构建并替换线上内容。

---

## 1. 目录结构：哪些能改，哪些别碰

| 路径 | 作用 | 能不能改 |
|---|---|---|
| `content/zh/posts/` | **中文文章**（放这里，别放别处） | ✅ 天天改 |
| `content/en/posts/` | **英文文章** | ✅ 天天改 |
| `content/{zh,en}/about.md` | 关于页（现在是《三次改签》） | ✅ 可以改 |
| `content/{zh,en}/search.md` | 站内搜索页 | ⚠️ 只改文案，别删（搜索依赖它） |
| `hugo.yaml` | 全站配置（站点名、菜单、社交链接） | ✅ 可以改，改完本地先预览 |
| `hugo.yaml` → `avatar` | 首页头像（图床直链，两种语言各一处） | ✅ 换图只改 URL |
| `content/{zh,en}/about.md` 开头 | 关于页肖像（图床直链） | ✅ 换图只改 `<img src>` |
| `assets/css/extended/engage.css` | 头像、阅读量、点赞、评论区样式 | ✅ 可以改 |
| `static/js/engage.js` | 阅读量、点赞与评论区的前端逻辑 | ⚠️ 能改，但改完要本地测 |
| `functions/api/[[path]].js` | 阅读量 / 点赞 / 评论的后端接口 | ⚠️ 能改，改完要本地测 |
| `layouts/_partials/` | 主题扩展与几处小覆盖 | ⚠️ 见下方「主题覆盖」说明 |
| `_archive/posts/` | 已下线的旧文章（不参与构建，留个底） | ✅ 可以翻看 |
| `build.sh` | 云端构建脚本，负责下载正确版本的 Hugo | ❌ **别删，删了构建必挂** |
| `themes/PaperMod/` | 主题源码 | ❌ 别改。要升级就整个替换 |
| `static/` | 图标等原样拷贝的文件 | ✅ 可以放图片 |
| `public/` | 构建产物 | ❌ **不要提交**（已被 .gitignore 忽略） |
| `scripts/` | 建文章的脚本 | ✅ 可以改 |

### 主题覆盖：`layouts/_partials/` 里这四个文件是"替主题说话"

Hugo 会优先用站点自己的同名模板，所以这四个文件盖住了 Theme 里的对应文件：

| 文件 | 改了什么 | 主题升级时的注意 |
|---|---|---|
| `home_info.html` | 首页标题左边加头像 | 主题若改首页结构，需要重新对比 |
| `extend_post_content.html` | 正文后加阅读量与点赞胶囊，并加载 `engage.js` | 不会冲突 |
| `comments.html` | 评论区（主题里本来是空的） | 不会冲突 |
| `footer.html` | **整份副本**，只把署名里的 PaperMod 链接改成纯文本 | ⚠️ 升级主题后要重新拷一次，否则页脚脚本会旧 |

`footer.html` 是唯一一份"抄下来的"文件——因为页脚里有菜单滚动记忆、主题切换、代码复制按钮的脚本，不能只写一小段。升级主题时：把 `themes/PaperMod/layouts/_partials/footer.html` 重新复制过来，再把 `https://github.com/adityatelange/hugo-PaperMod/` 那个 `<a>` 换成纯文字 `PaperMod`。

---

## 2. 写一篇新文章

### 推荐方式：用脚本（保证双语配对不出错）

在 `blog` 目录下打开 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\new-post.ps1 `
  -Slug "hugo-multilingual-gotchas" `
  -TitleZh "Hugo 多语言配置里最容易踩的五个坑" `
  -TitleEn "Five Gotchas in Hugo Multilingual Setup" `
  -Tags "hugo,seo"
```

参数说明：

- **`-Slug`**：URL 里的短名，只能用**小写字母、数字、连字符**。决定文章地址，发布后不要改（改了就成 404 + 丢收录）
- **`-TitleZh` / `-TitleEn`**：两个语言的标题
- **`-Tags`**：英文标签，逗号分隔
- **`-TagsZh`**：可选，中文标签；不填就跟 `-Tags` 一样

脚本会**同时**生成 `content/zh/posts/xxx.md` 和 `content/en/posts/xxx.md`，两边的 `translationKey` 自动写成同一个值 —— 这是中英互相切换的关键，手写最容易漏。

### 手动创建（等价做法）

复制任意一篇现有文章，然后**必须**保证这两行一致：

```yaml
translationKey: "同一个-string"   # ← 中英两版必须相同
slug: "同一个-string"
```

两版 `translationKey` 不一致 ⇒ 页面右上角的中英切换消失，`hreflang` 也不互相指向，两边在搜索引擎眼里是两篇无关的文章。

### 文章 front matter 各字段

```yaml
---
title: "标题"
date: 2026-11-24T17:34:09+08:00
draft: true                # ← 草稿：true 时线上看不到，本地 hugo server -D 能看到
translationKey: "xxx"      # 双语配对，必填
slug: "xxx"                # URL 短名
summary: ""                # 列表页摘要，留空则自动截取正文
tags: ["hugo", "seo"]
categories: []
keywords: []               # 给搜索引擎的补充关键词，可留空
ShowToc: true              # 是否显示目录（长文建议 true）
TocOpen: false
---
```

**`date` 用写作日期，不要用上传日期。** 列表排序、页面上的日期、RSS 与 sitemap 都取这个字段；
写晚了补传，日期就会被写成补传那天，读起来像时间错乱。`lastmod` 只在真正改过内容时才更新。

### 写作时的三条实用建议

1. **开头 2–3 句直接回答标题里的问题**，别铺垫 —— 这决定读者会不会继续读，也决定搜索结果的摘要质量
2. **技术文写具体问题**，不写"聊聊 XX"。标题越像一个人在搜索框里敲的问句，越容易被搜到
3. **一篇只讲一件事**。混合话题的站点拼不过垂直站点，唯一的活路是长尾词（"Next.js 部署到 Cloudflare 报 502" 这类）

---

## 3. 本地预览

```powershell
cd D:\Workbuddy\2026-11-24-12-19-52\blog
hugo server -D
```

- 英文：http://localhost:1313/
- 中文：http://localhost:1313/zh/

**`-D` 不能省**：戴上它才会显示 `draft: true` 的草稿。不加 `-D` 看到的是"已经发布的内容"，用来模拟线上真实样子。

改文件会自动刷新浏览器。看完按 `Ctrl+C` 停掉。

> 提示：本地 Hugo 已通过 winget 安装（0.170.1 extended）。如果提示 `hugo 不是内部或外部命令`，**关掉终端重新开一个**（PATH 只在新建的终端里生效）。

---

## 4. 发布

确认文章写好、本地预览没问题后：

```powershell
cd D:\Workbuddy\2026-11-24-12-19-52\blog

# 1. 把 draft: true 改成 false（只改要发的那几篇）
#    用记事本或 VS Code 打开对应文件改这一行

# 2. 提交并推送
git add -A
git commit -m "post: hugo-multilingual-gotchas"
git push
```

推完等 1–2 分钟，刷新 https://holly-sunrise.pages.dev 就能看到。

### 提交信息怎么写（给自己看的，别嫌麻烦）

| 前缀 | 用途 | 例子 |
|---|---|---|
| `post:` | 新增或修改文章 | `post: 补充 502 排查的第四种原因` |
| `fix:` | 修站点的 bug | `fix: 修正导航栏中文错位` |
| `config:` | 改站点配置 | `config: 添加 LinkedIn 社交图标` |
| `docs:` | 改文档 | `docs: 更新操作手册` |

半年后回头看 `git log`，这四个前缀能让历史一眼可读。

---

## 5. 部署到底是怎么发生的

理解这条链路，出问题能自己判断：

```
git push
  ↓  GitHub webhook（自动）
Cloudflare Pages 构建容器
  ↓  执行 Build command: bash build.sh
build.sh 下载 Hugo Extended 0.170.1 → 生成 public/
  ↓
发布到全球 CDN → https://holly-sunrise.pages.dev
```

### 为什么不直接用 `hugo --gc --minify`

Cloudflare 构建镜像自带 **Hugo 0.147.7**，而 PaperMod 要求 **≥ 0.158**，直接构建会报：

```
WARN Module "PaperMod" is not compatible with this Hugo version: Min 0.158.0
ERROR => hugo v0.158.0 or greater is required
```

官方解法是设 `HUGO_VERSION` 环境变量，但那个变量有"看起来设了其实没生效"的情况，日志里只留一句 `hugo v0.147.7`，非常难查。`build.sh` 把版本控制放进仓库：**构建时自己下载 0.170.1**，镜像里装的是什么版本都不影响。

想升级 Hugo：改 `build.sh` 里 `HUGO_VERSION:-0.170.1` 这个默认值，本地也升级到同版本，push 一次即可。

---

## 6. 出问题怎么办

| 现象 | 原因 | 处理 |
|---|---|---|
| 构建日志出现 `hugo v0.147.7` | Build command 没设成 `bash build.sh` | Settings → Build → Build command 改成 `bash build.sh`，Save，再 Retry |
| 网站返回 **522** | 项目有域名，但没有任何**成功**的生产部署 | 去 Deployments 看最新一条，失败就看日志修，成功就等 1 分钟 |
| 页面 **404** | 文件放错语言目录 | 中文必须在 `content/zh/posts/`，英文在 `content/en/posts/` |
| 中英切换按钮消失 | 两版 `translationKey` 不一致 | 改成完全相同的字符串 |
| `git push` 报 `502` / `CONNECT tunnel failed` | 本机代理对 github.com 抽风 | **等 10 秒重试**，不要重装认证、不要改配置 |
| 文章里的中文变乱码 | 文件不是 UTF-8 编码 | 用脚本创建（脚本已强制 UTF-8）；手动建的文件在 VS Code 里另存为 UTF-8 |
| 本地看得到、线上看不到 | `draft: true` 没改 | 改成 `false` 再 push |
| 页面样式全丢 | `themes/PaperMod/` 被删或改名 | 重新拉主题：`git checkout themes/` |

### 看构建日志的位置

Cloudflare 后台 → Workers & Pages → `holly-sunrise` → **Deployments** → 点最新一条 → 展开日志。
成功时日志最后会有 `Pages | 60` 这类页数统计；失败时找 `ERROR` 和 `Failed:` 那几行。

---

## 7. 上线后还没做的一次性设置

这三件事做完，站点才算真正"可被发现"。都是免费的，各 5 分钟。

### 7.1 Google Search Console（最重要的已做）

**验证文件方式**（已完成）：Google 给的验证文件放在 `static/googleXXXXXXXX.html`，
Hugo 会原样复制到站点根目录。当前状态：

- 线上地址：`https://holly-sunrise.pages.dev/google130934422994ceb1.html` → **200**
- 回 Search Console 点「验证」即可通过
- 验证通过后 → 左侧 **Sitemaps** → 填入 `sitemap.xml` → Submit

> **`static/_redirects` 这个文件不能删。** Cloudflare Pages 会自动把
> `/*.html` 以 308 重定向到无后缀路径，而 Google 的文件验证要求原 URL 直接
> 返回 200 + 文件内容。`_redirects` 里那条 `200` 重写规则就是用来抵消这个
> 行为的。删掉它，验证会在下次 Google 复检时失败。
>
> 以后若还用**HTML 标记**方式（`<meta>`）：改 `layouts/_partials/extend_head.html`
> 第 2 节，取消注释并填入，push 后回 Search Console 验证。

### 7.2 Bing Webmaster Tools

https://www.bing.com/webmasters → 可以直接从 Google Search Console 导入站点，省掉再验证一次。Bing 的数据现在也喂 ChatGPT 等 AI 搜索，值得做。

### 7.3 Cloudflare Web Analytics（访问统计）

Cloudflare 后台 → **Analytics & Logs → Web Analytics** → 添加站点 `holly-sunrise.pages.dev` → 拿到 token → 填进 `extend_head.html` 第 3 节（同样是注释状态）。免费、无 cookie，不需要加隐私弹窗。

### 7.4 阅读量、点赞与评论区（需要做一次，5 分钟）

评论、阅读量、点赞都是自建的：页面上是一段 JS，数据存在你自己 Cloudflare 账号下的 KV 里。
**没做这一步之前，这三块会自动隐藏**——页面不会出现「0 次阅读」或空评论框，也不会报错。

**第 1 步：建 KV 命名空间**

1. Cloudflare 后台 → **Storage & Databases → KV**（旧界面在 Workers & Pages → KV）
2. **Create a namespace**，名字填 `holly-sunrise-kv`，保存

**第 2 步：绑定到 Pages 项目**

1. **Workers & Pages → holly-sunrise → Settings → Bindings**（部分界面叫 Functions → KV namespace bindings）
2. **Add binding** → 类型选 **KV namespace**
3. Variable name 必须填 **`BLOG_KV`**（大小写要一致，代码里按这个名字找）
4. Namespace 选上一步建的 `holly-sunrise-kv` → 保存

**第 3 步：重新部署**

绑定改动需要一次新部署才生效：随便改个文件 `git push`，或在 Deployments 页点 **Retry deployment**。

**怎么验收**

浏览器直接打开：
`https://holly-sunrise.pages.dev/api/view?p=/posts/when-ai-finishes-the-work/`
`https://holly-sunrise.pages.dev/api/like?p=/posts/when-ai-finishes-the-work/`

- 看到 `{"ok":true,"count":0}` → 通了（count 会随着访问/点赞增长）
- 看到 `{"ok":false,"error":"storage_unbound"}` → 绑定没生效，回到第 2 步核对变量名
- 看到 404 → 仓库里 `functions/` 目录没推上去

**点赞是怎么防刷的**

- 同一 IP 对同一篇文章只记一次，标记存在 KV 里、一年后过期（键名里是 IP 的哈希，不留明文）
- 浏览器本地再记一次状态：点过之后按钮变成实心红心并禁用，刷新也不会回到可点状态
- 想给某篇清零：KV 里删掉 `l:/zh/posts/xxx/` 与所有 `li:/zh/posts/xxx/:*` 开头的键

**评论区怎么管**

- 评论直接显示，不需要审核。防滥用只做了三件事：蜜罐字段、单条 2000 字上限、同一 IP 一分钟一条
- 要删某条评论：Cloudflare → KV → `holly-sunrise-kv` → 按前缀 `c:/zh/posts/...` 找到键 → 删除
- 评论是纯文本存储和纯文本渲染，不会被当成 HTML 执行
- 中英文是两个独立的评论区（URL 不同），这是有意的

### 7.5 已经做过的 SEO 精修（别改回去）

| 处理 | 位置 | 原因 |
|---|---|---|
| 搜索页 `robotsNoIndex: true` + `build.list: never` | `content/*/search.md` | 站内搜索结果页属于低质重复内容，被索引会拉低整站质量评分。同时把它从 sitemap 移除 |
| 关闭 `series` 分类法 | `hugo.yaml` → `taxonomies` | 没有文章用到，`/series/` 是没有任何入口的空页。要启用把注释行加回来 |
| 补 `safari-pinned-tab.svg` | `static/` | 主题 `head.html:92` 默认引用，缺失会 404 |

**注意**：`build.list: never` 里用的是 **`build`** 而不是 `_build`。Hugo 0.145 起 `_build` 被
移除，写成 `_build` 会直接构建失败（不是警告）。

**关于标签页**：现在每个标签页平均只有 1 篇文章，属于薄内容。没有对它们做 noindex，
因为标签页有真实的文章列表和内部链接价值。等文章多了（每个标签 ≥3 篇）这个比例自然
变健康；如果一半年后仍只有十几篇，再考虑给单篇标签页加 `robotsNoIndex`。

---

## 8. 三条铁律

1. **不提交 `public/`** —— 那是构建产物，Cloudflare 每次都会重新生成。提交了只会在 diff 里制造噪音
2. **不改 `baseURL`** —— 它必须是 `https://holly-sunrise.pages.dev/`（结尾带斜杠）。改了会导致 sitemap、canonical、RSS 里全是错链接
3. **不删 `themes/PaperMod/` 和 `build.sh`** —— 前者删了页面没样式，后者删了构建直接失败

---

## 9. 以后买域名了怎么换

内容一行都不用改，四步：

1. 在 Porkbun / Cloudflare 买域名（`.com` 约 ¥80/年）
2. Cloudflare 后台 → 项目 → **Custom domains** → 添加你的域名，按提示改 DNS
3. 改 `hugo.yaml` 的 `baseURL` 为新域名（结尾带 `/`），push
4. Search Console 里**新增**一个资源（新域名），重新验证 + 提交 sitemap；旧地址会 301 跳到新域名，权重会逐步转移

---

## 10. 常用命令速查

```powershell
cd D:\Workbuddy\2026-11-24-12-19-52\blog

hugo server -D                       # 本地预览（含草稿）
hugo --gc --minify                   # 本地模拟线上构建（不带 -D）
powershell -ExecutionPolicy Bypass -File scripts\new-post.ps1 -Slug "x" -TitleZh "中" -TitleEn "EN"   # 新建双语文章

git status                           # 看改了哪些文件
git add -A; git commit -m "post: xxx"; git push   # 发布
git log --oneline -10                # 看最近 10 次提交
```
