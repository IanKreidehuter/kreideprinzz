/* Decoration only: scatters stickers behind the admin page. Reads CONFIG but changes nothing else. */
(() => {
  const C = window.CONFIG || {}, base = C.ASSET_BASE || "";
  const src = n => (/^(https?:|data:|\/|\.)/.test(n) ? n : base + n).replace(/"/g, "&quot;");
  // [file, left %, top %, width px, rotation deg, class]   (override with CONFIG.ADMIN_DECO)
  const spots = C.ADMIN_DECO || [
    ["sun.png",3,3,70,-8,"spin"], ["cloud.png",76,3,96,0,""], ["rainbow.png",88,14,110,6,""],
    ["yellow_love.png",12,24,36,10,"tw"], ["cat.png",91,46,80,-6,""], ["love.png",2,46,40,-10,"tw"],
    ["cloud.png",2,64,84,0,""], ["flower.png",4,82,64,0,""], ["leaf.png",15,90,48,8,""],
    ["yellow_love.png",90,76,38,8,"tw"], ["dog.png",83,86,76,6,""], ["flower.png",94,91,60,-6,""]
  ];
  const k = innerWidth < 600 ? .7 : 1, box = document.createElement("div");
  box.id = "fx"; box.setAttribute("aria-hidden", "true");
  box.innerHTML = spots.map(([f, l, t, w, r, c], i) =>
    `<img class="fx-s ${c}" src="${src(f)}" alt="" style="left:${l}%;top:${t}%;width:${Math.round(w * k)}px;--r:${r}deg;--d:-${(i * 7) % 5}s">`).join("");
  box.addEventListener("error", e => { if (e.target.tagName === "IMG") e.target.style.visibility = "hidden"; }, true);
  document.body.appendChild(box);
})();
