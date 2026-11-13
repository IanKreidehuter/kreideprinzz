/* Loading screen. Add <script src="loader.js"></script> as the FIRST line inside <head> of index.html.
   script.js hides it once the fonts, stickers and first posts request have loaded. */
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
