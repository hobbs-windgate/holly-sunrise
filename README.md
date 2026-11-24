# Holly Sunrise

Hugo + PaperMod 双语博客。英文为默认语言（根路径 `/`），中文在 `/zh/`。
面向海外 / 技术圈读者，托管成本 0 元。

- 线上地址（建成后）：`https://holly-sunrise.pages.dev/`
- Cloudflare Pages 的**项目名必须填 `holly-sunrise`**，否则 `baseURL` 与实际地址不一致，sitemap 和 RSS 里的链接会全错。

---

## 1. 当前状态

| 项 | 状态 |
|---|---|
| 配置（双语、菜单、SEO、结构化数据） | ✅ 已完成 |
| 5 篇文章 × 中英双版 | ✅ 骨架已落（全部 `draft: true`） |
| About / Search 页 | ✅ 已写 |
| favicon（16/32/ico/apple-touch） | ✅ 已生成 |
| PaperMod 主题 | ✅ 已内嵌进仓库，无需安装 |
| 构建验证 | ✅ 已通过（Hugo 0.170.1，零警告） |
| 评论（Giscus） | ⬜ 手动开启（见 6） |
| 自定义域名 | ⬜ 可选，随时可加 |

---

## 2. 本地跑起来（2 步）

### 2.1 Hugo 已经装好了

这台机器上已经用 winget 装过 **Hugo Extended 0.170.1**：

```powershell
winget install Hugo.Hugo.Extended   # 已执行过，重新装会跳过
```

**注意**：安装时改过 PATH，但已经打开的终端读不到新值，所以要**新开一个终端**（或重启编辑器）才能直接用 `hugo` 命令。旧终端里会提示 `hugo: command not found`，不是装失败。

验证：`hugo version` 输出里要有 `extended` 字样。PaperMod 要求 **≥ 0.158.0**。

### 2.2 起服务

```bash
cd blog
hugo server -D
# -> http://localhost:1313        英文
# -> http://localhost:1313/zh/    中文
```

> **必须加 `-D`**：5 篇文章都是草稿状态，不加 `-D` 站点是空的。这是故意的 —— 半成品不该被搜索引擎抓到。

> 主题不用装了。它是以普通文件形式内嵌在 `themes/PaperMod/` 里的（不是 submodule），所以 `git add` 会把文件真正提交上去，Cloudflare 那边也不用额外拉取子模块 —— 这是最不容易出错的方式。想更新主题见第 9 节。

---

## 3. 部署到 Cloudflare Pages（零成本）

### 3.1 推上 GitHub（已完成）

仓库已推送到 **https://github.com/hobbs-windgate/holly-sunrise**（public，1 个初始提交，151 个文件，`main` 跟踪 `origin/main`）。

```powershell
cd D:\Workbuddy\2026-11-24-12-19-52\blog
git add -A
git commit -m "post: 文章标题"
git push
```

> **这台机器上的网络注意**：`github.com` 走代理时是**间歇性**放行的 —— `git push` 会时好时坏（`CONNECT tunnel failed, response 502`）。可以先 `git fetch` 试探，通了再 push；连续失败就过一会儿重试，不要反复重装认证。`gh auth` 只需授权一次，凭证存在 Windows 凭据管理器里。

### 3.2 Cloudflare Pages 建项目

Dashboard → Workers & Pages → Create → Pages → **Connect to Git** → 选 `holly-sunrise`：

| 配置项 | 值 |
|---|---|
| Framework preset | Hugo |
| Build command | `hugo --gc --minify` |
| Build output directory | `public` |
| 环境变量 `HUGO_VERSION` | `0.170.1` |

主题是内嵌的普通文件，所以**不需要** `git submodule` 那一步 —— 构建容器直接就能读到 `themes/PaperMod/`。

`HUGO_VERSION` 别漏：平台 v3 镜像默认是 **0.147.7**，而本地是 0.170.1。不锁版本，同一份代码在本地和线上可能产出不同结果。如果构建日志报「需要 extended 版」，把值改成 `extended_0.170.1` 再重试。

### 3.3 首次上线后

1. 拿到 `holly-sunrise.pages.dev` 地址后，确认 `hugo.yaml` 的 `baseURL` 与实际一致（结尾带 `/`）——项目名不同就要改这一行，否则重新部署。
2. 打开 CF 后台 → Web Analytics → 添加站点，把 beacon 代码填进
   `layouts/_partials/extend_head.html` 第 3 节（现在是注释状态）。

### 3.4 以后想绑自己的域名

在同一个 Pages 项目里 → Custom domains → 添加即可，**内容一行都不用改**。
建议同时把 `xxx.pages.dev` 设 301 到新域名，避免两个地址互相抢排名。

---

## 4. 写一篇双语文章

```bash
# 直接复制现有一篇最省事
cp content/en/posts/cloudflare-pages-502.md content/en/posts/my-new-post.md
cp content/zh/posts/cloudflare-pages-502.md content/zh/posts/my-new-post.md
```

（`hugo new content` 在分语言 `contentDir` 下路径容易搞错，直接复制更稳。）

更省事的做法：直接复制现有一篇改。**两条铁律**：

1. **两个版本的 `translationKey` 必须完全一致** —— 这是 Hugo 识别「同一篇文章的不同语言版」的唯一依据。写错 = 变成两篇无关文章，`hreflang` 也不会生成。
2. **两个版本各自写给自己的读者**，不要逐字翻译。中文版读起来应该是中文，不是「翻译腔」。

写完把 `draft: true` 改成 `false` 再推。

---

## 5. 五个选题

已按「能搜到」和「值得写」两个维度筛过。前三个抢长尾搜索，后两个立人格。

| # | 英文标题 | 中文标题 | 主打查询词 | 类型 |
|---|---|---|---|---|
| 1 | Three Causes of a 502 on Cloudflare Pages | Cloudflare Pages 报 502 的三种原因 | `cloudflare pages 502` / `hugo deploy 502` | 技术·排查 |
| 2 | Ship a Bilingual Hugo Blog That Google Actually Indexes | 双语 Hugo 博客上线清单 | `bilingual hugo blog` / `hugo hreflang` | 技术·工具 |
| 3 | I Replaced Postgres With SQLite and Regretted It in Three Places | 我用 SQLite 换掉 Postgres，在三个场景后悔了 | `sqlite vs postgres` / `sqlite busy timeout` | 技术·观点 |
| 4 | My First Year as an Indie Developer: The Real Numbers | 独立开发者第一年：真实的收支账本 | 靠分发，不靠搜索 | 生活·职业 |
| 5 | Five Years of Technical Blogging Taught Me Something Other Than Writing | 写技术博客五年，我最大的收获不是写作能力 | 靠搜「你的名字」 | 生活·随笔 |

**为什么是这几个：**

- 1 和 3 是「带报错信息/带对比关系的具体问题」，竞争小、意图明确 —— 新站唯一能拿到的搜索流量就是这个。
- 2 自带流量，而且是本站的配置文档，改配置时顺手更新，永远不过期。
- 4 和 5 拿不到搜索流量，但它们决定读者会不会记住你。**比例守住 8:2**，别倒过来。

写作优先级建议：先写 1（最容易写出真东西，也最容易被搜到），再写 2，然后 3。

---

## 6. 上线前必须替换的占位符

社交图标和 About 页已填好真实地址（GitHub 指向 `hobbs-windgate`），产物里**已经 0 处 `REPLACE_ME`**。剩下待补的只有两类：

| 文件 | 位置 | 换成 | 影响 |
|---|---|---|---|
| `layouts/_partials/extend_head.html` | 第 2 节注释 | Search Console / Bing 验证串 | 不填也能上线，只是无法提交 sitemap |
| `layouts/_partials/extend_head.html` | 第 3 节注释 | Cloudflare Web Analytics token | 不填没有访问统计 |
| `hugo.yaml` | `giscus` 三项 | repo / repoId / categoryId | 只有 `comments: true` 时才生效 |

**想加 LinkedIn / 邮箱**：在 `hugo.yaml` 的 `socialIcons` 里加回 `linkedin` / `email` 两项，并同步 `content/*/about.md` 的「找到我」段落 —— 不加就别留占位符，死链比少一个图标难看。

**开评论（Giscus）**：

1. 建一个 public 仓库（如 `yourname/blog-comments`），在 Settings → General → Features 勾选 **Discussions**。
2. 装 [giscus app](https://github.com/apps/giscus) 授权该仓库。
3. 打开 [giscus.app](https://giscus.app)，填入仓库名，拿到 `repoId` 和 `categoryId`。
4. 填进 `hugo.yaml`，并把 `comments: false` 改成 `true`。

---

## 7. 已经内置的 SEO（不用额外做）

**主题自带的（别重复写）：**

- `hreflang`：每种语言一条，由 `themes/PaperMod/layouts/_partials/head.html` 输出
- 结构化数据 JSON-LD：`BlogPosting` + `BreadcrumbList` + `Organization` + `Person`（含 `sameAs`），由 `_partials/templates/schema_json.html` 输出

**本项目额外加的（`layouts/_partials/extend_head.html`）：**

- `hreflang="x-default"` —— 主题没有这一条，多语言站建议补上
- Search Console / Bing 验证 meta 的位置（注释状态）
- Cloudflare Web Analytics 代码位（注释状态）

**其它：**

- `layouts/robots.txt` —— 放行 Google / Bing / 百度 / GPTBot，并指向 sitemap
- `outputs.home` 含 `JSON` —— 站内搜索依赖它，删了搜索页会白屏
- sitemap 由 Hugo 自动生成：`/sitemap.xml` 是索引，实际 URL 在 `/en/`、`/zh/` 两份里
- RSS 输出全文（`ShowFullTextinRSS`）

**已在 Hugo 0.170.1 上实测通过**：`/about/` 与文章页均输出 3 条 hreflang（en / zh / x-default），
且中英指向正确；文章页包含 `BlogPosting`、`BreadcrumbList`；构建零警告。

上线后仍**必须手动做**的只有一件：去 Search Console 验证并提交 `sitemap.xml`。免费托管平台不会帮你推。

---

## 8. 已知待办

- [x] ~~运行主题安装脚本~~ → 主题已内嵌，这步取消
- [x] ~~替换 `REPLACE_ME`~~ → 已清空，产物里 0 处
- [x] ~~解除草稿~~ → 10 篇全部 `draft: false`，已进入构建产物（60 / 58 页）
- [ ] **第 4 篇的账本要换成你的真实数字** —— 现在写的是「记哪五列」，没有具体金额
- [ ] 第 1–3 篇是**要点式笔记**（小节 + 2~4 条要点），可以再扩写成完整长文
- [ ] 第 4、5 篇是第一人称随笔，只有你能写，建议用自己的经历改写
- [ ] 补 `static/og-default.png`（1200×630）作为分享卡片兜底图
- [ ] 加 LinkedIn / 邮箱到 `socialIcons`（现在只有 GitHub 和 RSS）
- [ ] 考虑加 `content/*/archives.md`（PaperMod 支持归档页）

---

## 9. 更新主题

主题是内嵌的普通文件，更新就是重新拉一份：

```bash
rm -rf themes/PaperMod
git clone --depth=1 https://github.com/adityatelange/hugo-PaperMod themes/PaperMod
rm -rf themes/PaperMod/.git      # 关键：不删会变成 git 子模块，部署时是空目录
hugo --gc --minify               # 先本地确认能构建，再提交
```

**不要跳过 `rm -rf .git`**。带 `.git` 的目录被 `git add` 时会被当成 submodule 记录，
只有一条哈希、没有文件内容 —— 推到 GitHub 后 Cloudflare 构建出来就是空站。

---

## 10. 常见问题

**Q：`hugo server` 起来站点是空的？**
A：确认文章 front matter 里是 `draft: false`。10 篇现在都已发布，正常情况首页会有 5 篇。

**Q：`hugo: command not found`？**
A：Hugo 装好后 PATH 只对新终端生效。关掉终端重开，或直接用完整路径。

**Q：报 `found no layout file` / 页面没样式？**
A：`themes/PaperMod/` 被清空了。按第 9 节重新拉主题。正常情况下它应该跟着仓库一起被提交（151 个文件里有它）。

**Q：部署后所有页面 502 / 白屏？**
A：九成是构建产物为空 —— 检查 `HUGO_VERSION` 是否设成了 `0.170.1`（主题用了 0.146+ 的 `layouts/_partials/` 结构，旧版本会静默忽略整个目录）。详见第 1 篇文章。

**Q：中文页面 404？**
A：中文内容必须放在 `content/zh/` 下，`contentDir` 是分开的，放错目录 Hugo 不认。

**Q：改了自己的模板却不生效？**
A：Hugo 0.146+ 用 **`layouts/_partials/`**（带下划线）。放在旧的 `layouts/partials/` 下会被静默忽略 —— 这个坑我踩过一次。

**Q：想改默认语言为中文？**
A：把 `defaultContentLanguage` 和 `params.defaultLang` 都改成 `zh`。但注意 `content/*/about.md` 和 `search.md` 里写死了 `url:`，需要把 `/zh/about/` 改成 `/about/`、`/about/` 改成 `/zh/about/`。
