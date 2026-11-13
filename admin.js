(() => {
  const C = CONFIG, $ = s => document.querySelector(s), K = "adminToken";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ss = { get() { try { return sessionStorage.getItem(K) || ""; } catch { return ""; } },
               set(v) { try { v ? sessionStorage.setItem(K, v) : sessionStorage.removeItem(K); } catch {} } };
  let token = ss.get(), posts = [], editing = "";
  const msg = (t, bad) => { const m = $("#msg"); m.textContent = t || ""; m.className = bad ? "bad" : "ok"; };
  const busy = on => document.querySelectorAll(".b").forEach(b => b.disabled = on);
  const thumb = u => { u = String(u || ""); const m = u.match(/[-\w]{25,}/);
    return /drive\.google\.com/.test(u) && m ? `https://drive.google.com/thumbnail?id=${m[0]}&sz=w400` : /^(https?:|data:|blob:)/.test(u) ? u : u ? C.ASSET_BASE + u : ""; };
  const F = Object.fromEntries(["type","title","content","linkUrl","category","date","imageUrl"].map(k => [k, $("#" + k)]));

  async function call(body) {   // text/plain avoids a CORS preflight, which Apps Script can't answer
    if (!C.API_URL) throw new Error("API_URL is empty in config.js");
    let d;
    try {
      const r = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token, ...body }) });
      d = await r.json();
    } catch (e) {
      throw new Error("Can't reach the script. Redeploy the Web App as a NEW VERSION (Execute as: Me, Access: Anyone) and make sure Code.gs has doPost.");
    }
    if (!d.ok) throw new Error(d.error || "Request failed");
    return d;
  }
  function shrink(file, max = 1600) {   // resize + convert to JPEG so uploads stay small
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        res({ data: c.toDataURL("image/jpeg", .85).split(",")[1], mime: "image/jpeg", name: file.name.replace(/\.\w+$/, "") + ".jpg" });
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("Couldn't read that image (try JPG or PNG).")); };
      img.src = u;
    });
  }
  const fields = () => document.querySelectorAll("[data-t]").forEach(e => e.hidden = !e.dataset.t.split(" ").includes(F.type.value));
  const preview = u => { const p = $("#preview"); p.hidden = !u; if (u) p.src = u; };
  function reset() {
    editing = ""; $("#form").reset(); F.date.value = new Date().toISOString().slice(0, 10);
    $("#formTitle").textContent = "New post"; preview(""); fields();
  }
  function render() {
    const l = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    $("#list").innerHTML = l.length ? l.map(p => `<li class="item"><div><b>${esc(p.title || "(untitled)")}</b>
      <small>${esc(p.type)} · ${esc(String(p.date).slice(0, 10))}</small></div>
      <div class="btns"><span class="chip ${p.status === "published" ? "pub" : ""}">${esc(p.status || "draft")}</span>
      <button class="b ghost" type="button" data-a="edit" data-id="${esc(p.id)}">Edit</button>
      <button class="b del" type="button" data-a="del" data-id="${esc(p.id)}">Delete</button></div></li>`).join("") : "<li>No posts yet.</li>";
  }
  async function refresh() { posts = (await call({ action: "list" })).posts; render(); }

  $("#list").onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    const id = b.dataset.id, p = posts.find(x => String(x.id) === id); if (!p) return;
    if (b.dataset.a === "edit") {
      editing = id; for (const k in F) F[k].value = k === "date" ? String(p.date || "").slice(0, 10) : (p[k] ?? "");
      $("#formTitle").textContent = "Edit post"; $("#file").value = ""; $("#vfile").value = ""; fields(); preview(thumb(p.imageUrl));
      $("#form").scrollIntoView({ behavior: "smooth" });
    } else if (confirm(`Delete "${p.title || "this post"}"? This can't be undone.`)) {
      try { busy(true); await call({ action: "delete", id }); if (editing === id) reset(); await refresh(); msg("Deleted."); }
      catch (err) { msg(err.message, true); } finally { busy(false); }
    }
  };
  function readFile(f) {   // video as base64 (videos are not resized)
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ data: String(r.result).split(",")[1], mime: f.type || "video/mp4", name: f.name }); r.onerror = () => rej(new Error("Couldn't read that video.")); r.readAsDataURL(f); });
  }
  async function save(status) {
    const t = F.type.value, file = $("#file").files[0], vfile = $("#vfile").files[0], maxMB = C.MAX_VIDEO_MB || 25;
    try {
      if (["image", "image_text"].includes(t) && !file && !F.imageUrl.value.trim()) throw new Error("This type needs an image.");
      if (t === "text" && !F.title.value.trim() && !F.content.value.trim()) throw new Error("Add a title or some text.");
      if (t === "link" && !/^https?:\/\//i.test(F.linkUrl.value.trim())) throw new Error("Add a link starting with https://");
      if (t === "video" && !vfile && !/^https?:\/\//i.test(F.linkUrl.value.trim())) throw new Error("Add a video file or a video link.");
      if (t === "video" && vfile && vfile.size > maxMB * 1048576) throw new Error(`That video is over ${maxMB} MB. Upload it to Drive or YouTube and paste the link instead.`);
      busy(true); let img = F.imageUrl.value.trim(), vlink = F.linkUrl.value.trim();
      if (t === "video" && vfile) { msg("Uploading video… this can take a minute"); vlink = (await call({ action: "upload", ...(await readFile(vfile)) })).url; }
      if (file && t !== "text") { msg("Uploading image…"); img = (await call({ action: "upload", ...(await shrink(file)) })).url; }
      msg("Saving…");
      await call({ action: "save", post: { id: editing, title: F.title.value.trim(), type: t, content: t === "image" ? "" : F.content.value.trim(),
        imageUrl: t === "text" ? "" : img, linkUrl: t === "link" ? F.linkUrl.value.trim() : t === "video" ? vlink : "", category: F.category.value.trim(),
        date: F.date.value || new Date().toISOString().slice(0, 10), status } });
      reset(); await refresh(); msg(status === "published" ? "Published!" : "Draft saved.");
    } catch (err) { msg(err.message, true); } finally { busy(false); }
  }
  async function enter(t) {
    token = t;
    try { await refresh(); ss.set(t); $("#login").hidden = true; $("#panel").hidden = false; reset(); msg(""); }
    catch (err) { token = ""; ss.set(""); $("#login").hidden = false; $("#panel").hidden = true; msg(err.message === "unauthorized" ? "Wrong token." : err.message, true); }
  }
  $("#loginForm").onsubmit = e => { e.preventDefault(); enter($("#tok").value.trim()); };
  $("#logout").onclick = () => { token = ""; ss.set(""); $("#tok").value = ""; $("#panel").hidden = true; $("#login").hidden = false; msg("Logged out."); };
  $("#saveDraft").onclick = () => save("draft");
  $("#publish").onclick = () => save("published");
  $("#clear").onclick = reset;
  F.type.onchange = fields;
  $("#file").onchange = e => { const f = e.target.files[0]; preview(f ? URL.createObjectURL(f) : thumb(F.imageUrl.value)); };
  if (token) enter(token);
})();
