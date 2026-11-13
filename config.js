/* One place for every path, link and editable text. */
window.CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzMgJNS2h9IBrOJ3JoRJKlvkoFzCOUWIvfbYZCuOdK7SeyCM1k2d3Uoa8G9HtTdSmaRRg/exec",                      // paste your Apps Script Web App /exec URL (empty = sample posts)
  ASSET_BASE: "assets/",            // folder with your existing PNGs
  PROFILE: "assets/profile.png",    // your existing profile image path (separate asset)
  PROTECT_IMAGES: true,             // true = block right-click / long-press menus and image dragging on the public site; false = off
  API_TIMEOUT_MS: 20000,            // how long to wait for the posts API before trying the next method
  MAX_VIDEO_MB: 25,                 // admin: biggest video you can upload directly (bigger = paste a link instead)
  NAV: [                            // [section id, label, wide button file (desktop), round icon file (mobile tab bar)]
    ["home", "Home", "home.png", "home_round.png"], ["about", "About", "about.png", "about_round.png"],
    ["portfolio", "Portfolio", "portofolio.png", "portofolio_round.png"], ["posts", "Posts", "posts.png", "posts_round.png"],
    ["contact", "Contacts", "contacts.png", "contacts_round.png"]
  ],
  INFO: [                           // [icon, label, value]  <- edit freely
    ["🎂", "Age", "20 "], ["📍", "Location", "Indonesia"],
    ["🎓", "Occupation", "Student"], ["💗", "Personality", "ISFP / Libra"],
    ["🌱", "Languages", "Indonesian, English, Japanese (N5-N4), German, Italian"],
    ["🎮", "Interests", "Languages, Tech, Games, Art, Music, Websites, Random things"]
  ],
  // [emoji, name, short text for the popup, tags]  <- edit the texts freely
  SKILLS: [
    ["💻","Web Development","I like building little websites from scratch, like this one. Making things look cute and work smoothly is my favourite part.",["HTML","CSS","JavaScript","Google Apps Script"]],
    ["🎨","Art & Design","Colourful, handmade, crayon-style things make me happy. Doodles, stickers and playful layouts are my thing.",["Doodles","Stickers","Layouts","Kidcore"]],
    ["📚","Language Learning","Collecting languages is one of my favourite hobbies, and I'm always learning a little more.",["Indonesian","English","Japanese (N5-N4)","German","Italian"]],
    ["🎮","Gaming","Playing games to relax, have fun and get lost in a good story.",["Relax","Fun"]],
    ["🎵","Music","Music is always playing while I work, draw and code.",["Listening","Vibes"]],
    ["📷","Photography","Catching small everyday moments and pretty places.",["Everyday","Places"]],
    ["💡","Ideas & Projects","I keep a messy pile of random ideas and turn the fun ones into projects.",["Ideas","Projects","Experiments"]],
    ["🎲","Random Activities","Just chilling, trying new things, and seeing what comes next.",["Chilling","New things"]]
  ],
  SOCIAL: [
    { name: "WhatsApp",  icon: "whatsapp.png",  text: "+6285161840928",              url: "https://wa.me/6285161840928" },
    { name: "Email",     icon: "email.png",     text: "froylanfahlanaditya@gmail.com", url: "mailto:froylanfahlanaditya@gmail.com" },
    { name: "TikTok",    icon: "tiktok.png",    text: "@adrianmostlyloser",          url: "https://www.tiktok.com/@adrianmostlyloser" },
    { name: "Instagram", icon: "Instagram.png", text: "@mostlytsar",                 url: "https://www.instagram.com/mostlytsar" }
  ],
  MORE_ICON: "more.png",
  POST_STICKERS: ["yellow_love.png", "love.png"],   // small stickers on post cards
  // Links shown in the "More" popup. They use whatever domain the site is on (location.origin), so they survive a domain change.
  // To add a future link, copy one line and change it (icon is optional).
  MORE_LINKS: [
    { icon: "💌", label: "Anonymous Message", url: location.origin + "/anonymous/mostlytsar" },
    { icon: "📁", label: "Documents Archive", url: location.origin + "/documents/" },
    { icon: "📖", label: "Kanji Study", url: location.origin + "/kanji.html" }
  ],
  CONTACT: ["Email", "WhatsApp", "Instagram"],
  // Stickers: [file, "inline css", optional class: spin | twinkle]. Hero sizes are % of the hero so they scale.
  DECO_HERO: [
    ["sun.png","left:3%;top:5%;width:11%;max-width:90px","spin"], ["cloud.png","left:19%;top:3%;width:13%;max-width:110px"],
    ["rainbow.png","right:2%;top:0;width:24%;max-width:200px"], ["cloud.png","right:27%;top:2%;width:9%;max-width:80px;--d:-2s"],
    ["yellow_love.png","left:12%;top:52%;width:5%;max-width:40px","twinkle"], ["yellow_love.png","right:32%;top:48%;width:4%;max-width:34px;--d:-1s","twinkle"],
    ["love.png","right:5%;top:58%;width:5%;max-width:40px;--d:-2s","twinkle"], ["cat.png","right:20%;bottom:6%;width:10%;max-width:80px"],
    ["leaf.png","left:5%;bottom:2%;width:5%;max-width:46px"], ["flower.png","left:16%;bottom:1%;width:5%;max-width:48px;--d:-1s"],
    ["leaf.png","right:6%;bottom:2%;width:5%;max-width:44px"], ["flower.png","left:34%;bottom:1%;width:5%;max-width:46px;--d:-3s"]
  ],
  DECO_HERO_M: [                    // phone hero stickers (px)
    ["sun.png","left:4%;top:14px;width:56px","spin"], ["cloud.png","right:4%;top:10px;width:78px"],
    ["yellow_love.png","left:14%;top:132px;width:30px","twinkle"], ["love.png","right:12%;top:140px;width:30px;--d:-1s","twinkle"],
    ["cat.png","right:3%;bottom:8px;width:54px"], ["leaf.png","left:4%;bottom:4px;width:40px"],
    ["flower.png","left:24%;bottom:2px;width:42px;--d:-2s"], ["leaf.png","right:28%;bottom:3px;width:38px"], ["flower.png","left:58%;bottom:2px;width:42px"]
  ],
  DECO_SIDE_POOL: ["cat.png","rainbow.png","yellow_love.png","love.png","flower.png","leaf.png","sun.png","cloud.png","dog.png","yellow_love.png"]  // sidebar stickers fill its height
};
