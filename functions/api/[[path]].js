// Cloudflare Pages Functions —— 阅读量、点赞与评论区
//
// 路由（catch-all 到 /api/*）：
//   GET  /api/view?p=/zh/posts/xxx/     读取阅读量
//   POST /api/view   {p}                阅读量 +1，返回最新值
//   GET  /api/like?p=/zh/posts/xxx/     读取点赞数
//   POST /api/like   {p}                点赞 +1（同 IP 同文章只记一次）
//   GET  /api/comments?p=/zh/posts/xxx/ 列出评论（按时间升序）
//   POST /api/comments {p,name,body,hp} 发表评论
//
// 存储：KV 绑定名 BLOG_KV
//   v:<path>              → 数字字符串（阅读量）
//   l:<path>              → 数字字符串（点赞数）
//   li:<path>:<IP哈希>     → 已点赞标记（TTL 1 年）
//   c:<path>:<13位时间戳>:<随机>  → {n,b,t}
//   rl:<ip>               → 限流标记（TTL 60s）
//
// 为什么用 KV 而不是数据库：个人博客的量级只需要计数与追加，
// 免登录、免运维、免费额度（10 万读/天、1 千写/天）够用。
// KV 最终一致，并发下计数可能少记几次，对博客来说可以接受。

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/** 只接受站内路径，防止把任意字符串塞进 KV 键 */
function normalizePath(raw) {
  if (typeof raw !== "string") return null;
  let p = raw.trim();
  if (!p.startsWith("/") || p.length > 180) return null;
  p = p.split("?")[0].split("#")[0];
  if (!p.endsWith("/")) p += "/";
  if (p.includes("..")) return null;
  return p;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = (params.path || []).join("/");
  const kv = env.BLOG_KV;

  if (!kv) {
    return json({ ok: false, error: "storage_unbound" }, 503);
  }

  if (route === "view") return handleView(request, kv);
  if (route === "like") return handleLike(request, kv);
  if (route === "comments") return handleComments(request, kv);

  return json({ ok: false, error: "not_found" }, 404);
}

async function handleView(request, kv) {
  const url = new URL(request.url);
  let page = normalizePath(url.searchParams.get("p"));

  if (!page && request.method === "POST") {
    try {
      const body = await request.json();
      page = normalizePath(body && body.p);
    } catch (e) {
      /* 落到下面的 400 */
    }
  }
  if (!page) return json({ ok: false, error: "bad_path" }, 400);

  const key = "v:" + page;
  const current = parseInt(await kv.get(key), 10) || 0;

  if (request.method === "POST") {
    const next = current + 1;
    await kv.put(key, String(next));
    return json({ ok: true, count: next });
  }

  if (request.method === "GET") {
    return json({ ok: true, count: current });
  }

  return json({ ok: false, error: "method_not_allowed" }, 405);
}

async function handleLike(request, kv) {
  const url = new URL(request.url);
  let page = normalizePath(url.searchParams.get("p"));

  if (!page && request.method === "POST") {
    try {
      const body = await request.json();
      page = normalizePath(body && body.p);
    } catch (e) {
      /* 落到下面的 400 */
    }
  }
  if (!page) return json({ ok: false, error: "bad_path" }, 400);

  const key = "l:" + page;
  const current = parseInt(await kv.get(key), 10) || 0;

  if (request.method === "GET") {
    return json({ ok: true, count: current });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // 同一 IP 对同一篇文章只记一次（一年）。键里存的是加盐哈希，不留原始 IP。
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const flag = "li:" + page + ":" + shortHash(ip + "|hs-like");
  if (await kv.get(flag)) {
    return json({ ok: true, count: current, already: true });
  }
  await kv.put(flag, "1", { expirationTtl: 31536000 });

  const next = current + 1;
  await kv.put(key, String(next));
  return json({ ok: true, count: next, already: false });
}

/** FNV-1a，只用于把 IP 变成稳定短标识，避免在 KV 里留明文 IP */
function shortHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

async function handleComments(request, kv) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const page = normalizePath(url.searchParams.get("p"));
    if (!page) return json({ ok: false, error: "bad_path" }, 400);
    return json({ ok: true, items: await listComments(kv, page) });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const page = normalizePath(payload.p);
  if (!page) return json({ ok: false, error: "bad_path" }, 400);

  // 蜜罐：机器人会填，人看不见。静默丢弃，不回错误，免得被试探。
  if (payload.hp) return json({ ok: true, item: null });

  const name = String(payload.name || "").trim().slice(0, 40);
  const body = String(payload.body || "").trim();

  if (body.length < 2) return json({ ok: false, error: "too_short" }, 400);
  if (body.length > 2000) return json({ ok: false, error: "too_long" }, 400);

  // 简单限流：同一 IP 一分钟一条
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rlKey = "rl:" + ip;
  if (await kv.get(rlKey)) {
    return json({ ok: false, error: "too_fast" }, 429);
  }
  await kv.put(rlKey, "1", { expirationTtl: 60 });

  const ts = Date.now();
  const item = { n: name, b: body, t: ts };
  const key = "c:" + page + ":" + String(ts).padStart(13, "0") + ":" +
    Math.random().toString(36).slice(2, 8);

  await kv.put(key, JSON.stringify(item));

  return json({ ok: true, item });
}

async function listComments(kv, page) {
  const prefix = "c:" + page + ":";
  const listed = await kv.list({ prefix, limit: 200 });

  const items = [];
  for (const entry of listed.keys) {
    const value = await kv.get(entry.name, "json");
    if (value && typeof value.b === "string") items.push(value);
  }

  // 键名里的时间戳是 13 位定长，KV list 本身按字典序返回，天然就是时间序
  items.sort((a, b) => a.t - b.t);
  return items;
}
