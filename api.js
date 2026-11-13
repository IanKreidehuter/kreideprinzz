/* Posts API. Uses JSONP so it works with Apps Script Web Apps from any host. */
const API = (() => {
  const SAMPLE = [  // dev data, used only while CONFIG.API_URL is empty
    { id:"s1", type:"image",      title:"A quiet day",     imageUrl:"rainbow.png", date:"2026-10-28", status:"published" },
    { id:"s2", type:"image_text", title:"Mood today",      content:"Soft day, slow tea.", imageUrl:"baby1.png", date:"2026-10-26", status:"published" },
    { id:"s3", type:"text",       title:"Just a thought",  content:"Little progress is still progress.", date:"2026-10-24", status:"published" },
    { id:"s4", type:"link",       title:"Sample link",     content:"An external page or media link.", imageUrl:"sun.png", linkUrl:"https://example.com", date:"2026-10-21", status:"published" }
  ];
  function jsonp(base, ms = 20000) {
    return new Promise((resolve, reject) => {
      const cb = "cb" + Date.now() + Math.floor(Math.random() * 1e6), s = document.createElement("script");
      const end = () => { clearTimeout(t); delete window[cb]; s.remove(); };
      const t = setTimeout(() => { end(); reject(new Error("timeout")); }, ms);
      window[cb] = d => { end(); resolve(d); };
      s.onerror = () => { end(); reject(new Error("network")); };
      s.src = base + (base.includes("?") ? "&" : "?") + "action=posts&_=" + Date.now() + "&callback=" + cb;
      document.head.appendChild(s);
    });
  }
  async function viaFetch(base, ms) {   // plain request first: works where script tags are blocked
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(base + (base.includes("?") ? "&" : "?") + "action=posts&_=" + Date.now(), { cache: "no-store", signal: c.signal });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      if (!d || !d.ok) throw new Error("bad response");
      return d;
    } finally { clearTimeout(t); }
  }
  const KEY = "postsCache";
  function cached() {   // last good list, so the page is never empty when a request fails
    try { const c = JSON.parse(localStorage.getItem(KEY)); return c && Array.isArray(c.posts) ? c.posts : null; } catch (e) { return null; }
  }
  async function getPosts() {
    const ms = CONFIG.API_TIMEOUT_MS || 20000, u = CONFIG.API_URL;
    const raw = u ? await viaFetch(u, ms).catch(() => jsonp(u, ms)).catch(() => jsonp(u, ms)) : { ok: true, posts: SAMPLE };
    if (!raw || !raw.ok) throw new Error((raw && raw.error) || "bad response");
    const list = raw.posts.filter(p => p.status === "published").sort((a, b) => new Date(b.date) - new Date(a.date));
    if (u) try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), posts: list })); } catch (e) {}
    return list;
  }
  return { getPosts, cached };
})();
