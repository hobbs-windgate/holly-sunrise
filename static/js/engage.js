/* 阅读量 + 点赞 + 评论区前端逻辑
   接口：/api/view  /api/like  /api/comments  （Cloudflare Pages Functions，见 functions/api/[[path]].js）
   设计要点：
   1. 全部用 textContent 渲染，评论按纯文本处理，不解析 HTML —— 从根上避免 XSS
   2. 接口失败就整块隐藏，页面上不会出现「0 次阅读」这种假数据
   3. 同一次会话内刷新不重复计数（sessionStorage 去重） */

(function () {
  "use strict";

  var node = document.querySelector("[data-hs-page]");
  if (!node) return;

  var page = node.getAttribute("data-hs-page");
  var lang = node.getAttribute("data-hs-lang") || "en";

  var TEXT = {
    zh: {
      anonymous: "匿名访客",
      sending: "发送中…",
      failed: "发送失败，请稍后再试。",
      tooFast: "发得太快了，等一分钟再试。",
      tooShort: "至少写两个字。"
    },
    en: {
      anonymous: "Anonymous",
      sending: "Posting…",
      failed: "Could not post. Please try again.",
      tooFast: "That was fast — give it a minute.",
      tooShort: "Please write a little more."
    }
  };
  var T = TEXT[lang] || TEXT.en;

  function api(path, options) {
    return fetch(path, options).then(function (res) {
      if (!res.ok) {
        var err = new Error("http_" + res.status);
        err.status = res.status;
        throw err;
      }
      return res.json();
    });
  }

  function num(n) {
    return Number(n || 0).toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
  }

  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  /* ---------------- 阅读量 ---------------- */

  function initViews() {
    var box = document.querySelector("[data-hs-views-count]");
    if (!box) return;
    var wrap = box.closest(".hs-views");
    var key = "hs:v:" + page;
    var seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
    } catch (e) {}

    var req = seen
      ? api("/api/view?p=" + encodeURIComponent(page))
      : api("/api/view", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ p: page })
        });

    req
      .then(function (data) {
        if (!data || typeof data.count !== "number") return;
        box.textContent = num(data.count);
        if (wrap) {
          wrap.hidden = false;
          // 英文单复数：1 view / 2 views（中文「次阅读」不分单复数）
          var label = wrap.querySelector("[data-hs-views-label]");
          if (label && lang !== "zh") {
            label.textContent = data.count === 1 ? "view" : "views";
          }
        }
        if (!seen) {
          try {
            sessionStorage.setItem(key, "1");
          } catch (e) {}
        }
      })
      .catch(function () {
        /* 未绑定 KV 或离线：保持隐藏 */
      });
  }

  /* ---------------- 点赞 ---------------- */

  function initLikes() {
    var btn = document.querySelector("[data-hs-like]");
    if (!btn) return;

    var countEl = btn.querySelector("[data-hs-like-count]");
    var labelEl = btn.querySelector("[data-hs-like-label]");
    var storeKey = "hs:l:" + page;
    var liked = false;
    try {
      liked = localStorage.getItem(storeKey) === "1";
    } catch (e) {}

    function paint(count, isLiked) {
      countEl.textContent = num(count);
      if (labelEl) {
        labelEl.textContent = lang === "zh" ? "赞" : count === 1 ? "like" : "likes";
      }
      btn.classList.toggle("is-liked", !!isLiked);
      btn.setAttribute("aria-pressed", isLiked ? "true" : "false");
      btn.disabled = !!isLiked;
      btn.hidden = false;
    }

    api("/api/like?p=" + encodeURIComponent(page))
      .then(function (data) {
        if (!data || typeof data.count !== "number") return;
        paint(data.count, liked);
      })
      .catch(function () {
        /* 未绑定 KV 或离线：保持隐藏 */
      });

    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      btn.disabled = true;

      api("/api/like", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p: page })
      })
        .then(function (data) {
          var count = data && typeof data.count === "number" ? data.count : 0;
          try {
            localStorage.setItem(storeKey, "1");
          } catch (e) {}
          paint(count, true);
        })
        .catch(function () {
          btn.disabled = false;
        });
    });
  }

  /* ---------------- 评论区 ---------------- */

  function initComments() {
    var section = document.querySelector(".hs-comments");
    if (!section) return;

    var list = section.querySelector("[data-hs-comment-list]");
    var empty = section.querySelector("[data-hs-comment-empty]");
    var countEl = section.querySelector("[data-hs-comments-count]");
    var form = section.querySelector("[data-hs-comment-form]");
    var errorEl = section.querySelector("[data-hs-comment-error]");
    var submitBtn = section.querySelector("[data-hs-submit]");

    var items = [];

    function render() {
      list.textContent = "";
      items.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "hs-comment";

        var head = document.createElement("div");
        head.className = "hs-comment-head";

        var name = document.createElement("span");
        name.className = "hs-comment-name";
        name.textContent = item.n || T.anonymous;

        var time = document.createElement("time");
        time.className = "hs-comment-time";
        time.textContent = fmtTime(item.t);

        head.appendChild(name);
        head.appendChild(time);

        var body = document.createElement("p");
        body.className = "hs-comment-body";
        body.textContent = item.b;

        li.appendChild(head);
        li.appendChild(body);
        list.appendChild(li);
      });

      countEl.textContent = items.length ? "· " + num(items.length) : "";
      empty.hidden = items.length > 0;
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }

    api("/api/comments?p=" + encodeURIComponent(page))
      .then(function (data) {
        items = (data && data.items) || [];
        section.hidden = false;
        render();
      })
      .catch(function () {
        /* 接口不可用：整块保持隐藏 */
      });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorEl.hidden = true;

      var nameInput = form.elements.name;
      var bodyInput = form.elements.body;
      var hpInput = form.elements.hp;
      var text = (bodyInput.value || "").trim();

      if (text.length < 2) {
        showError(T.tooShort);
        bodyInput.focus();
        return;
      }

      var original = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = T.sending;

      api("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p: page,
          name: (nameInput.value || "").trim(),
          body: text,
          hp: hpInput.value || ""
        })
      })
        .then(function (data) {
          if (data && data.item) {
            items.push(data.item);
            render();
            bodyInput.value = "";
          }
        })
        .catch(function (err) {
          showError(err && err.status === 429 ? T.tooFast : T.failed);
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = original;
        });
    });
  }

  initViews();
  initLikes();
  initComments();
})();
