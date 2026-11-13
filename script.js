(() => {
  // Loading screen fallback: if index.html doesn't include loader.js in <head>, build the screen here
  if (!document.getElementById("loader")) {
(() => {
  const root = document.documentElement;
  root.classList.add("loading");
  const st = document.createElement("style");
  st.textContent = `
html.loading,html.loading body{overflow:hidden}
html.loading body *,html.loading body *::before,html.loading body *::after{animation-play-state:paused!important}
#loader{position:fixed;inset:0;z-index:9999;display:grid;place-content:center;justify-items:center;gap:14px;text-align:center;color:#3b3452;
 background:repeating-linear-gradient(118deg,transparent 0 5px,rgba(255,255,255,.55) 5px 7px),#c6e5ff;
 font:28px "Gochi Hand","Patrick Hand",cursive;transition:opacity .55s,visibility .55s}
#loader.done{opacity:0;visibility:hidden;pointer-events:none}
#loader small{font-size:18px;opacity:.7}
.ld-rb{position:relative;width:140px;height:70px;animation:ld-bounce 1s ease-in-out infinite}
.ld-rb i{position:absolute;left:50%;bottom:0;box-sizing:border-box;border:12px solid;border-bottom:0;border-radius:140px 140px 0 0;transform:translateX(-50%)}
.ld-rb i:nth-child(1){width:140px;height:70px;border-color:#ff4a5f}
.ld-rb i:nth-child(2){width:116px;height:58px;border-color:#ffc93c}
.ld-rb i:nth-child(3){width:92px;height:46px;border-color:#6bd36b}
.ld-rb i:nth-child(4){width:68px;height:34px;border-color:#3b8de0}
.ld-t{margin:0}.ld-t span{animation:ld-dot 1.2s infinite}.ld-t span:nth-child(2){animation-delay:.2s}.ld-t span:nth-child(3){animation-delay:.4s}
.ld-bar{width:220px;height:16px;border:3px solid #fff;border-radius:99px;background:#fff;overflow:hidden;box-shadow:2px 3px 0 rgba(60,50,90,.15)}
.ld-bar b{display:block;width:8%;height:100%;border-radius:99px;background:linear-gradient(90deg,#ff8ac0,#ffd75e,#8de08d);transition:width .3s}
@keyframes ld-bounce{50%{transform:translateY(-14px)}}
@keyframes ld-dot{0%,100%{opacity:.25}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){.ld-rb,.ld-t span{animation:none}}`;
  document.head.appendChild(st);
  const el = document.createElement("div");
  el.id = "loader"; el.setAttribute("role", "status"); el.setAttribute("aria-label", "Loading");
  el.innerHTML = '<div class="ld-rb"><i></i><i></i><i></i><i></i></div><p class="ld-t">Loading<span>.</span><span>.</span><span>.</span></p><div class="ld-bar"><b id="loaderBar"></b></div><small>drawing all the stickers…</small>';
  root.appendChild(el);
  setTimeout(() => { root.classList.remove("loading"); el.classList.add("done"); }, 15000);   // failsafe if script.js never runs
})();
  }
  const C = CONFIG, $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const src = n => /^(https?:|data:|\/|\.)/.test(n) ? n : C.ASSET_BASE + n;
  const safe = u => /^(https?:|mailto:)/i.test(u) ? u : "#";
  const fmt = d => { const t = new Date(d); return isNaN(t) ? "" : t.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"}); };
  const stickers = l => l.map(([n, st, cl]) => `<img class="sticker ${cl || ""}" src="${esc(src(n))}" alt="" style="${esc(st)}">`).join("");

  // Missing assets hide themselves instead of showing broken icons.
  document.addEventListener("error", e => { if (e.target.tagName === "IMG") { e.target.classList.add("broken"); const th = e.target.closest(".thumb"); if (th) th.classList.add("noimg"); } }, true);
  const setAR = el => {   // give the card the picture's real shape (width / height)
    const th = el.closest(".thumb"), w = el.naturalWidth || el.videoWidth, h = el.naturalHeight || el.videoHeight;
    if (th && w && h) th.style.setProperty("--r", (w / h).toFixed(4));
  };
  document.addEventListener("load", e => { if (e.target.tagName === "IMG") setAR(e.target); }, true);
  document.addEventListener("loadedmetadata", e => { if (e.target.tagName === "VIDEO") setAR(e.target); }, true);

  $("#profile").src = $("#profile2").src = C.PROFILE;
  $("#decoHero").innerHTML = stickers(C.DECO_HERO);
  $("#decoHeroM").innerHTML = stickers(C.DECO_HERO_M);
  const side = $("#decoSide"), pool = C.DECO_SIDE_POOL || [];
  const fillSide = () => {          // scatter stickers down the whole sidebar height
    const h = side.offsetHeight; side.innerHTML = "";
    if (!h || !pool.length) return;
    let html = "", i = 0;
    const big = h > 400;   // short sidebar = smaller, closer stickers
    for (let y = 6; y < h - (big ? 70 : 46); y += big ? 118 : 66, i++) {
      const f = pool[i % pool.length], tw = /love|yellow/.test(f) ? " twinkle" : "";
      html += `<img class="sticker${tw}" src="${esc(src(f))}" alt="" style="left:${(i % 2 ? 48 : 4) + (i * 11) % 14}%;top:${y}px;width:${(big ? 58 : 40) + (i * 29) % (big ? 44 : 26)}px;--r:${(i * 19) % 24 - 12}deg;--d:-${(i * 7) % 5}s">`;
    }
    side.innerHTML = html;
  };
  if ("ResizeObserver" in window) new ResizeObserver(fillSide).observe(side); else fillSide();
  $("#nav").innerHTML = C.NAV.map(([id, label, f, r]) =>
    `<a href="#${id}" data-id="${id}" class="nb"><img class="wide" src="${esc(src(f))}" alt=""><img class="round" src="${esc(src(r || f))}" alt=""><span>${esc(label)}</span></a>`).join("");
  $("#info").innerHTML = C.INFO.map(([i, l, v]) => `<li><span aria-hidden="true">${i}</span><span><b>${esc(l)}:</b> ${esc(v)}</span></li>`).join("");
  $("#skills").innerHTML = C.SKILLS.map(([i, t], n) => `<li title="${esc(t)}" tabindex="0" role="button" data-n="${n}"><span aria-hidden="true">${i}</span><em>${esc(t)}</em></li>`).join("");
  $("#social").innerHTML = C.SOCIAL.map(s =>
    `<li><a href="${esc(safe(s.url))}" target="_blank" rel="noopener noreferrer" title="${esc(s.text)}"><img src="${esc(src(s.icon))}" alt=""><span>${esc(s.name)}</span></a></li>`).join("") +
    `<li><button type="button" class="moreBtn" aria-haspopup="dialog" title="More"><img src="${esc(src(C.MORE_ICON))}" alt=""><span>More</span></button></li>`;
  $("#msocial").innerHTML = $("#social").innerHTML;
  $("#contactLinks").innerHTML = C.CONTACT.map((n, i) => {
    const s = C.SOCIAL.find(x => x.name === n); if (!s) return "";
    return `<a class="lbl c${i}" href="${esc(safe(s.url))}" target="_blank" rel="noopener noreferrer"><img src="${esc(src(s.icon))}" alt="">${esc(s.name)}</a>`;
  }).join("");

  const dlg = $("#more");
  const openMore = () => {
    $("#moreList").innerHTML = C.MORE_LINKS.length
      ? C.MORE_LINKS.map(l => `<li><a href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer">${l.icon ? `<span aria-hidden="true">${esc(l.icon)}</span>` : ""}${esc(l.label)}</a></li>`).join("")
      : "<li>Nothing here yet.</li>";
    dlg.showModal();
  };
  document.querySelectorAll(".moreBtn").forEach(b => b.onclick = openMore);
  $("#moreClose").onclick = () => dlg.close();
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  // Smooth scroll + active nav
  document.querySelectorAll(".nb").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    if (root.classList.contains("stage")) return setView(a.dataset.id);   // desktop: swap views, no scrolling
    document.getElementById(a.dataset.id)?.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth"});
  }));
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting && !root.classList.contains("stage")) document.querySelectorAll(".nb").forEach(a => a.classList.toggle("on", a.dataset.id === en.target.id));
  }), {rootMargin: "-40% 0px -55% 0px"});
  C.NAV.forEach(([id]) => { const s = document.getElementById(id); if (s) io.observe(s); });

  // Posts
  const TYPES = [["all","All"],["image","Image"],["image_text","Image + Text"],["text","Text"],["link","Link"],["video","Video"]];
  const grid = $("#grid"), state = $("#state");
  let posts = [], filter = "all", shown = [];
  $("#filters").innerHTML = TYPES.map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${k === "all"}">${l}</button>`).join("");
  $("#filters").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    filter = b.dataset.k;
    $("#filters").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    render();
  };
  let pn = 0;
  const pk = () => C.POST_STICKERS?.length ? `<img class="pk" src="${esc(src(C.POST_STICKERS[pn++ % C.POST_STICKERS.length]))}" alt="">` : "";
  const vInfo = u => {   // what kind of video link is this?
    u = String(u || ""); let m;
    if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/))) return {k: "yt", id: m[1]};
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return {k: "vm", id: m[1]};
    if ((m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{20,})/))) return {k: "gd", id: m[1]};
    return /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(u) ? {k: "file", url: u} : null;
  };
  const vThumb = p => {  // card picture for a video: your poster, else the video's own thumbnail, else a placeholder
    const v = vInfo(p.linkUrl), a = esc(p.title);
    if (p.imageUrl) return `<img loading="lazy" src="${esc(src(p.imageUrl))}" alt="${a}">`;
    if (v && v.k === "yt") return `<img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="${a}">`;
    if (v && v.k === "gd") return `<img loading="lazy" src="https://drive.google.com/thumbnail?id=${v.id}&sz=w640" alt="${a}">`;
    if (v && v.k === "file") return `<video muted playsinline preload="metadata" src="${esc(safe(v.url))}#t=0.1"></video>`;
    return '<div class="vph"></div>';
  };
  const card = p => {
    const t = p.type, thumb = t === "video" ? `<div class="thumb">${vThumb(p)}<span class="vbadge" aria-hidden="true">▶</span></div>` : p.imageUrl && t !== "text" ? `<div class="thumb"><img loading="lazy" src="${esc(src(p.imageUrl))}" alt="${esc(p.title)}"></div>` : "";
    const body = `${thumb}<div class="cap">${p.title ? `<h3>${esc(p.title)}</h3>` : ""}${t !== "image" && p.content ? `<p>${esc(p.content)}</p>` : ""}<time datetime="${esc(p.date)}">${fmt(p.date)}</time>${pk()}</div>`;
    return t === "link" && p.linkUrl
      ? `<a class="post link" href="${esc(safe(p.linkUrl))}" target="_blank" rel="noopener noreferrer">${body}</a>`
      : `<article class="post ${esc(t)}">${body}</article>`;
  };
  const say = (msg, retry) => { grid.innerHTML = ""; state.hidden = false; state.innerHTML = esc(msg) + (retry ? ` <button type="button" id="retry">Try again</button>` : ""); if (retry) $("#retry").onclick = load; };
  function render() {
    const l = posts.filter(p => filter === "all" || p.type === filter);
    if (!l.length) return say("No posts here yet. Check back soon!");
    state.hidden = true; grid.innerHTML = l.map(card).join("");
    shown = l;   // remember which post each card is, so a click can open it
    [...grid.children].forEach((el, i) => { el.dataset.i = i; if (el.tagName !== "A") { el.tabIndex = 0; el.setAttribute("role", "button"); } });
  }
  async function load() {
    const c = !posts.length && API.cached && API.cached();   // show the last good list at once, then refresh it
    if (c && c.length) { posts = c; render(); } else if (!posts.length) say("Loading posts…");
    try { posts = await API.getPosts(); render(); }
    catch (e) { if (!posts.length) say("Couldn't load posts. Check your API_URL in config.js, then try again.", true); }
  }
  // Post popup: click any post to read it bigger; close with the button, Esc or a click outside
  const pop = document.createElement("dialog");
  pop.id = "postPop"; pop.setAttribute("aria-label", "Post");
  pop.innerHTML = '<button type="button" class="pp-x" aria-label="Close">✕</button><div class="pp-body"></div>';
  document.body.appendChild(pop);
  const ppBody = pop.querySelector(".pp-body");
  const player = p => {   // video player for the popup
    const v = vInfo(p.linkUrl);
    if (!v) return p.imageUrl ? `<div class="pp-img"><img src="${esc(src(p.imageUrl))}" alt="${esc(p.title)}"></div>` : "";
    if (v.k === "file") return `<div class="pp-img pp-vid"><video src="${esc(safe(v.url))}" ${p.imageUrl ? `poster="${esc(src(p.imageUrl))}"` : ""} controls autoplay playsinline controlslist="nodownload" disablepictureinpicture></video></div>`;
    const u = v.k === "yt" ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0` : v.k === "vm" ? `https://player.vimeo.com/video/${v.id}?autoplay=1` : `https://drive.google.com/file/d/${v.id}/preview`;
    return `<div class="pp-frame"><iframe src="${u}" title="${esc(p.title || "Video")}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`;
  };
  const openPost = p => {
    const t = p.type, img = t === "video" ? player(p) : p.imageUrl && t !== "text" ? `<div class="pp-img"><img src="${esc(src(p.imageUrl))}" alt="${esc(p.title)}"></div>` : "";
    const link = (t === "link" || (t === "video" && !vInfo(p.linkUrl))) && p.linkUrl ? `<a class="pp-link" href="${esc(safe(p.linkUrl))}" target="_blank" rel="noopener noreferrer">Open link ↗</a>` : "";
    ppBody.innerHTML = `${img}<div class="pp-txt">${p.title ? `<h3>${esc(p.title)}</h3>` : ""}<time datetime="${esc(p.date)}">${fmt(p.date)}${p.category ? " · " + esc(p.category) : ""}</time>${t !== "image" && p.content ? `<p>${esc(p.content)}</p>` : ""}${link}</div>`;
    const vd = ppBody.querySelector(".pp-vid video");
    if (vd) {   // a file with no picture (audio only / unsupported video) gets a cover + player instead of a black box
      // Only switch to the sound-only layout after a couple of seconds of real playback in which not a single picture frame was shown.
      // (Checking earlier was a mistake: it could wrongly squeeze a normal video.)
      const watch = () => {
        if (vd.currentTime < 2) return;
        vd.removeEventListener("timeupdate", watch);
        const q = vd.getVideoPlaybackQuality ? vd.getVideoPlaybackQuality() : null;
        if (vd.videoWidth || !q || q.totalVideoFrames > 0) return;
        const box = vd.parentElement; box.classList.add("audio");
        box.insertAdjacentHTML("beforeend", '<p class="pp-note">No picture was found in this file, so only the sound plays.</p>');
        box.insertAdjacentHTML("afterbegin", `<div class="pp-cover" aria-hidden="true">${p.imageUrl ? `<img src="${esc(src(p.imageUrl))}" alt="">` : "🎵"}</div>`);
      };
      vd.addEventListener("timeupdate", watch);
      vd.addEventListener("error", () => vd.parentElement.insertAdjacentHTML("beforeend", `<p class="pp-note">This file can't play in your browser. <a href="${esc(safe(vd.getAttribute("src")))}" target="_blank" rel="noopener noreferrer">Open it</a></p>`), {once: true});
    }
    pop.showModal(); ppBody.scrollTop = 0;
  };
  grid.addEventListener("click", e => {
    const el = e.target.closest(".post"); if (!el) return;
    e.preventDefault();                       // link posts open in the popup first; its button opens the link
    const p = shown[+el.dataset.i]; if (p) openPost(p);
  });
  grid.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".post[role=button]")) { e.preventDefault(); e.target.click(); } });
  const openSkill = n => {   // Skills & Interests popup
    const [ic, name, desc, tags] = C.SKILLS[n] || []; if (!name) return;
    ppBody.innerHTML = `<div class="pp-skill"><div class="pp-emoji" aria-hidden="true">${esc(ic)}</div><h3>${esc(name)}</h3>${desc ? `<p>${esc(desc)}</p>` : ""}${tags && tags.length ? `<div class="pp-tags">${tags.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>`;
    pop.showModal(); ppBody.scrollTop = 0;
  };
  $("#skills").addEventListener("click", e => { const li = e.target.closest("li[data-n]"); if (li) openSkill(+li.dataset.n); });
  $("#skills").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("li[data-n]")) { e.preventDefault(); e.target.click(); } });
  pop.addEventListener("close", () => { ppBody.innerHTML = ""; });   // also stops any playing video
  pop.querySelector(".pp-x").onclick = () => pop.close();
  pop.addEventListener("click", e => { if (e.target === pop) pop.close(); });
  // Stage mode (desktop): the whole site is drawn on a 1280x820 stage scaled to fit the screen; the nav swaps views
  const root = document.documentElement, mainEl = $("main"), VIEWS = ["home", "about", "portfolio", "posts", "contact"];
  function setView(id, keepHash) {
    if (!VIEWS.includes(id)) id = "home";
    mainEl.dataset.view = id;
    syncGrid();
    document.querySelectorAll(".nb").forEach(a => a.classList.toggle("on", a.dataset.id === id));
    if (!keepHash) history.replaceState(null, "", "#" + id);
    const g = $("#grid"); if (g) g.scrollTop = 0;
  }
  function syncGrid() {   // one-row "same height, width follows the picture" layout on Home and phones; natural-shape grid elsewhere
    grid.classList.toggle("jr", innerWidth <= 820 || (root.classList.contains("stage") && mainEl.dataset.view === "home"));
  }
  function fit() {
    const on = innerWidth >= 1000 && innerHeight >= 520, was = root.classList.contains("stage");
    root.classList.toggle("stage", on);
    if (on) root.style.setProperty("--z", Math.min(innerWidth / 1280, innerHeight / 820, 1.8).toFixed(3));
    if (on && !was) setView(location.hash.slice(1), true);
    syncGrid();
  }
  addEventListener("resize", fit); fit();
  // Protection layer: no right-click / long-press menu, no image dragging (turn off with PROTECT_IMAGES: false)
  if (C.PROTECT_IMAGES !== false) {
    document.documentElement.classList.add("protect");
    document.addEventListener("contextmenu", e => { if (!e.target.closest("input,textarea")) e.preventDefault(); });
    document.addEventListener("dragstart", e => { if (e.target.tagName === "IMG") e.preventDefault(); });
  }
  // Cards fade in as they scroll into view
  document.documentElement.classList.add("js");
  if ("IntersectionObserver" in window) {
    const ro = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } }), {threshold: .06});
    document.querySelectorAll(".hero,.card").forEach(e => { e.classList.add("rv"); ro.observe(e); });
  }
  // Always fresh: reload if the browser restores an old copy (back/forward cache); refresh posts when an old tab is shown again
  let lastLoad = Date.now();
  addEventListener("pageshow", e => { if (e.persisted) location.reload(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastLoad > 120000) { lastLoad = Date.now(); load(); } });
  // Loading screen: hide it once fonts, stickers and the first posts request are done (12 s max)
  const loader = $("#loader"), bar = $("#loaderBar");
  const settle = i => i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener("load", r, {once: true}); i.addEventListener("error", r, {once: true}); });
  const seen = new Set(), prog = {n: 0, done: 0};
  const watch = () => {              // lazy post thumbnails are skipped so they never block the screen
    const l = [...document.images].filter(i => i.loading !== "lazy" && !seen.has(i));
    l.forEach(i => seen.add(i)); prog.n += l.length;
    return Promise.all(l.map(i => settle(i).then(() => { prog.done++; if (bar) bar.style.width = Math.max(8, Math.round(100 * prog.done / prog.n)) + "%"; })));
  };
  (async () => {
    const first = watch();
    await Promise.race([
      Promise.all([first, load(), document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 900))]).then(watch),
      new Promise(r => setTimeout(r, 12000))
    ]);
    root.classList.remove("loading");
    if (loader) { loader.classList.add("done"); setTimeout(() => loader.remove(), 800); }
  })();
})();
