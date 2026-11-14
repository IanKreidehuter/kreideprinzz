/* PEEK-A-BOO — vanilla JS. Sections: story data, SVG art, audio, book/page-turn, UI */
(()=>{'use strict';
const $=s=>document.querySelector(s),N=12,INK='#3b2a3d';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- STORY DATA (index 0 = spread 1). f = face overrides, from/to = hand pose, hd = hand seconds ---------- */
const D={w:38,h:26,er:26,er2:26,dy2:0,ps:10,px:0,py:2,teeth:0,brow:0,blush:.6,tilt:0,col:'#ffd95a',still:0};
const P=[
{tx:'Hello!',bg:'#c9e8ff'},
{tx:'Peek...',bg:'#d5f2c9',from:'down',to:'cover',hd:1.6},
{tx:'A-BOO!',bg:'#ffd3e1',from:'cover',to:'open',hd:.9},
{tx:'Again?',bg:'#c9e8ff',f:{w:36,h:22,brow:-9,tilt:3}},
{tx:'Peek...',bg:'#d5f2c9',from:'down',to:'cover',hd:1.8,f:{w:36,h:22,tilt:3}},
{tx:'A-BOO!',bg:'#ffd3e1',from:'cover',to:'open',hd:.9,f:{w:38,h:24,tilt:3}},
{tx:"Let's play again!",sz:.62,bg:'#f4ebc4',f:{w:52,h:32,ps:14,blush:.4}},
{tx:'Peek...',bg:'#e3dcc3',from:'down',to:'cover',hd:3.2,f:{w:56,h:34,ps:14,blush:.3}},
{tx:'A-BOO!',bg:'#d3cdbf',from:'cover',to:'open',hd:1.4,f:{w:66,h:40,er2:32,dy2:9,ps:8,px:-5,tilt:4,teeth:6,blush:.2,col:'#efe07c'}},
{tx:'Are you still there?',sz:.5,bg:'#8d8994',ink:'#241a28',f:{w:76,h:46,er:30,er2:30,ps:4,py:0,teeth:9,tilt:-3,brow:12,blush:0,col:'#dfd585',still:1}},
{tx:'Peek...',bg:'#47424f',ink:'#efe6ec',from:'down',to:'cover',hd:5.5,f:{w:82,h:50,teeth:12,blush:0,col:'#d3ca84',still:1}},
{tx:'A... BOO.',sz:.85,bg:'#1a0f18',ink:'#e5424f',creature:1}];
const MOOD=[0,0,0,0,.05,.05,.1,.25,.35,.5,.7,.9,1]; // music distortion per spread

/* ---------- SVG ART (flat 2D, shared outline language) ---------- */
function char(p){
  const f={...D,...p.f},c=f.col,x1=150-f.w,x2=150+f.w,y=188;
  let teeth='';
  for(let i=1;i<=f.teeth;i++){const u=i/(f.teeth+1);teeth+=`M${x1+2*f.w*u} ${y}V${y+4*f.h*u*(1-u)}`}
  const eye=(cx,cy,r,px,py)=>`<g class="eye"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="${cx+px}" cy="${cy+py}" r="${f.ps}" fill="${INK}"/><circle cx="${cx+px+3}" cy="${cy+py-3}" r="3" fill="#fff"/></g>`;
  const brow=(cx,cy,a)=>`<path d="M-17 0Q0-9 17 0" transform="translate(${cx} ${cy}) rotate(${a})" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  const arm=(s,sx)=>`<g class="arm" style="transform:translate(${sx}px,215px) rotate(var(--a${s}))"><path d="M0 0V89" stroke="${INK}" stroke-width="27" stroke-linecap="round"/><path d="M0 0V89" stroke="${c}" stroke-width="18" stroke-linecap="round"/><g transform="translate(0 89)"><circle r="33" fill="${c}" stroke="${INK}" stroke-width="5"/><path d="M-14 12v17M0 14v19M14 12v17" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g></g>`;
  return `<svg class="art${f.still?' still':''}" viewBox="0 -24 300 400" data-h="${p.from||'down'}" style="--hd:${p.hd||1.6}s" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A round smiling character">
<rect x="-60" y="-90" width="420" height="560" fill="${p.bg}"/>
<ellipse cx="150" cy="265" rx="70" ry="52" fill="${c}" stroke="${INK}" stroke-width="6"/>
<ellipse cx="108" cy="314" rx="24" ry="11" fill="${c}" stroke="${INK}" stroke-width="5"/><ellipse cx="192" cy="314" rx="24" ry="11" fill="${c}" stroke="${INK}" stroke-width="5"/>
<g style="transform:rotate(${f.tilt}deg);transform-origin:150px 220px">
<circle cx="150" cy="130" r="100" fill="${c}" stroke="${INK}" stroke-width="6"/>
<ellipse cx="72" cy="168" rx="17" ry="11" fill="#ff8a9a" opacity="${f.blush}"/><ellipse cx="228" cy="168" rx="17" ry="11" fill="#ff8a9a" opacity="${f.blush}"/>
${brow(105,120-f.er-12,f.brow)}${brow(195,120+f.dy2-f.er2-12,-f.brow)}
${eye(105,120,f.er,f.px,f.py)}${eye(195,120+f.dy2,f.er2,-f.px,f.py)}
<path d="M${x1} ${y}Q150 ${y+2*f.h} ${x2} ${y}${f.teeth?'Z':''}" fill="${f.teeth?'#fffdf2':'none'}" stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
<path d="${teeth}" stroke="${INK}" stroke-width="3" fill="none"/>
</g>${arm('l',92)}${arm('r',208)}</svg>`;
}
/* The final creature: same outlines & flat colours, wrong proportions */
function creature(p){
  const B='#d3ca84',Y=(u,k)=>(1-u)**2*170+2*u*(1-u)*k+u*u*162;let t='';
  for(let i=0;i<15;i++){const a=i/15,b=(i+1)/15,m=(a+b)/2;t+=`M${20+260*a} ${Y(a,215)}L${20+260*m} ${Y(m,215)+30}L${20+260*b} ${Y(b,215)}Z`}
  for(let i=0;i<11;i++){const a=i/11,b=(i+1)/11,m=(a+b)/2;t+=`M${20+260*a} ${Y(a,320)}L${20+260*m} ${Y(m,320)-16}L${20+260*b} ${Y(b,320)}Z`}
  let fg='';
  for(let k=0;k<5;k++){const a=(-125+k*24)*Math.PI/180,ex=20+48*Math.cos(a),ey=100+48*Math.sin(a);fg+=`<path d="M20 100L${ex} ${ey}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M20 100L${ex} ${ey}" stroke="${B}" stroke-width="4" stroke-linecap="round"/>`}
  return `<svg class="art" viewBox="0 -24 300 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A distorted grinning creature">
<defs><g id="lim"><path d="M72 335Q-14 250 20 100" fill="none" stroke="${INK}" stroke-width="19" stroke-linecap="round"/><path d="M72 335Q-14 250 20 100" fill="none" stroke="${B}" stroke-width="11" stroke-linecap="round"/>${fg}</g></defs>
<rect x="-60" y="-90" width="420" height="560" fill="${p.bg}"/><circle cx="150" cy="150" r="175" fill="#3a1020"/>
<use href="#lim"/><use href="#lim" transform="translate(300 0) scale(-1 1)"/>
<ellipse cx="150" cy="350" rx="66" ry="48" fill="${B}" stroke="${INK}" stroke-width="6"/>
<ellipse cx="150" cy="262" rx="24" ry="52" fill="${B}" stroke="${INK}" stroke-width="6"/>
<g class="cr"><ellipse cx="150" cy="115" rx="90" ry="112" transform="rotate(-7 150 230)" fill="${B}" stroke="${INK}" stroke-width="6"/>
<circle cx="150" cy="36" r="10" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="150" cy="38" r="3" fill="${INK}"/>
<circle cx="105" cy="88" r="36" fill="#fff" stroke="${INK}" stroke-width="6"/><circle cx="203" cy="112" r="23" fill="#fff" stroke="${INK}" stroke-width="6"/>
<circle class="pp" cx="98" cy="102" r="5" fill="${INK}"/><circle class="pp" cx="208" cy="104" r="4" fill="${INK}"/>
<path d="M20 170Q150 215 280 162Q150 320 20 170Z" fill="#2b0a14" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="${t}" fill="#fffdf2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g></svg>`;
}
const illus=s=>{const p=P[s-1];return p.creature?creature(p):char(p)};

/* ---------- AUDIO: real files if present, synthesized fallback otherwise ---------- */
const Snd=(()=>{
  const F={bg:'assets/audio/background.mp3',turn:'assets/audio/page-turn.mp3',peek:'assets/audio/peek.mp3',aboo:'assets/audio/aboo.mp3',reveal:'assets/audio/reveal.mp3'};
  const A={},bad={},sc=[523,587,659,784,880];let on=true,vol=.6,mood=0,ctx,master,timer,cur,playing=false;
  for(const k in F){try{const a=new Audio(F[k]);a.preload='auto';a.onerror=()=>{bad[k]=1};A[k]=a}catch(e){bad[k]=1}}
  if(A.bg){A.bg.loop=true;A.bg.preservesPitch=false}
  const ok=k=>A[k]&&!bad[k];
  function apply(){
    if(master)master.gain.value=on?vol:0;
    for(const k in A){A[k].muted=!on;A[k].volume=k==='bg'?vol*(1-mood*.6):vol}
    if(A.bg)A.bg.playbackRate=1-mood*.3;
  }
  function unlock(){if(ctx)return;try{ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.connect(ctx.destination);apply()}catch(e){}}
  function tone(f,d,type,v,det,at){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+(at||0);
    o.type=type||'sine';o.frequency.value=f;o.detune.value=det||0;g.gain.setValueAtTime(v||.15,t);g.gain.exponentialRampToValueAtTime(.0002,t+d);o.connect(g).connect(master);o.start(t);o.stop(t+d)}
  function noise(d,v){if(!ctx)return;const b=ctx.createBuffer(1,ctx.sampleRate*d,ctx.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);
    const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();fl.type='highpass';fl.frequency.value=2500;g.gain.value=v;s.buffer=b;s.connect(fl).connect(g).connect(master);s.start()}
  function synthMusic(){clearInterval(timer);if(!playing||ok('bg'))return;
    timer=setInterval(()=>tone(sc[Math.random()*5|0]*(1-mood*.12),.9,'sine',.12*(1-mood*.5),(Math.random()-.5)*mood*90),350+mood*650)}
  function synthFx(k){const dt=-mood*120;
    if(k==='turn')noise(.25,.2);
    else if(k==='peek'){tone(700,.16,'triangle',.25,dt);tone(560,.2,'triangle',.25,dt,.14)}
    else if(k==='aboo')[523,659,784].forEach((f,i)=>tone(f,.25,'triangle',.25,dt,i*.09));
    else if(k==='reveal'){tone(55,3.5,'sawtooth',.3);tone(58.3,3.5,'sawtooth',.25);tone(740,2.5,'sine',.06,-50,.2);noise(1.2,.08)}}
  return{
    unlock,
    start(){unlock();playing=true;if(ok('bg'))A.bg.play().catch(()=>{bad.bg=1;synthMusic()});else synthMusic()},
    stop(){playing=false;clearInterval(timer);A.bg&&A.bg.pause()},
    mood(m){mood=m;apply();synthMusic()},
    fx(k){if(!k||!on)return;if(cur){cur.pause();cur.currentTime=0;cur=null}
      if(ok(k)){cur=A[k];cur.currentTime=0;cur.play().catch(()=>{bad[k]=1;synthFx(k)})}else synthFx(k)},
    toggle(){on=!on;apply();return on},
    vol(v){vol=+v;apply()}
  };
})();

/* ---------- BOOK: build leaves ---------- */
const book=$('#book'),leaves=[];let s=0,busy=false,lock=0;
const mk=(c,h)=>{const d=document.createElement('div');d.className=c;if(h)d.innerHTML=h;return d};
/* one page = illustration + text, coloured with the page's own background */
const pageFace=n=>{const p=P[n-1],d=mk('face front',illus(n)+`<div class="txt" style="--sz:${p.sz||1}">${p.tx}</div><i class="pn">${n} / ${N}</i>`);d.style.cssText=`background-color:${p.bg};--ink:${p.ink||INK}`;return d};
const cover=()=>`<div class="cov">${char({bg:'#ffc8dd'})}<h1>PEEK-A-BOO</h1><button id="start">Start reading</button></div>`;
for(let j=0;j<N;j++){
  const L=mk('leaf');
  L.append(j?pageFace(j):mk('face front',cover()),mk('face back'));
  book.append(L);leaves.push(L);
}
const base=mk('base');base.append(pageFace(N));book.append(base);
const pageEl=n=>n<N?leaves[n]:base;                       // element holding page n
const svgOf=n=>pageEl(n).querySelector('.front svg');
const locked=()=>Date.now()<lock;

/* leaf z-order + state: leaves 0..s-1 are flipped (left stack) */
function stack(){
  leaves.forEach((L,j)=>{L.classList.toggle('flipped',j<s);L.style.zIndex=j<s?j+1:N-j+1});
  book.classList.toggle('open',s>0);
}
stack();

/* ---------- PAGE TURNING ---------- */
const dur=()=>RM?60:1100+Math.max(0,s-6)*150;           // later pages turn slower
function settle(leaf,ang,ms,done){                         // animate leaf to angle, then call done
  leaf.style.transition='';leaf.style.setProperty('--tt',ms+'ms');leaf.classList.add('turning','show');
  requestAnimationFrame(()=>{leaf.style.transform=`rotateY(${ang}deg)`});
  setTimeout(()=>{leaf.classList.remove('turning','show');leaf.style.transform='';leaf.style.removeProperty('--sh');done()},ms+40);
}
function turn(d){
  const t=s+d;if(busy||t<0||t>N||locked())return;
  busy=true;Snd.unlock();
  const pre=(d>0&&t===N&&!RM)?1500:0;                      // silence before the final reveal
  if(pre)Snd.stop();
  setTimeout(()=>{
    const leaf=leaves[d>0?s:s-1];leaf.style.zIndex=99;
    if(d>0&&s===0)book.classList.add('open');
    Snd.fx('turn');
    settle(leaf,d>0?-180:0,pre?2400:dur(),()=>{s=t;stack();arrive(d);busy=false});
  },pre);
}
/* called after every completed turn */
function arrive(d){
  const p=s&&P[s-1],ss=s;
  document.body.dataset.m=s>=10?2:s>=7?1:0;
  s===N?book.dataset.f=1:delete book.dataset.f;
  if(s===0)Snd.stop();else if(s===1&&d>0)Snd.start();
  Snd.mood(MOOD[s]);
  if(!s||d<0)return;
  if(s===N)Snd.stop();
  setTimeout(()=>{if(s!==ss)return;                         // hands animate shortly after the page lands
    if(p.to)svgOf(s).dataset.h=p.to;
    Snd.fx(s===N?'reveal':/peek/i.test(p.tx)?'peek':/boo/i.test(p.tx)?'aboo':null)},420);
  if(s===11)lock=Date.now()+4600;       // long pause before the last page
}

/* drag / swipe / click on the pages */
let dr=null;
book.addEventListener('pointerdown',e=>{if(busy||e.target.closest('button'))return;dr={x:e.clientX,d:0,p:0}});
addEventListener('pointermove',e=>{
  if(!dr)return;const dx=e.clientX-dr.x;
  if(!dr.d&&Math.abs(dx)>10){
    const d=dx<0?1:-1;if(s+d<0||s+d>N||locked()){dr=null;return}
    dr.d=d;dr.leaf=leaves[d>0?s:s-1];dr.leaf.style.zIndex=99;dr.leaf.style.transition='none';dr.leaf.classList.add('show');
    if(d>0&&s===0)book.classList.add('open');Snd.unlock();
  }
  if(dr&&dr.d){
    dr.p=Math.min(1,Math.abs(dx)/(book.offsetWidth*.55));
    dr.leaf.style.transform=`rotateY(${dr.d>0?-180*dr.p:-180*(1-dr.p)}deg)`;
    dr.leaf.style.setProperty('--sh',(Math.sin(Math.PI*dr.p)*.4).toFixed(2));
  }
});
addEventListener('pointerup',e=>{
  if(!dr)return;const q=dr;dr=null;
  if(!q.d){const r=book.getBoundingClientRect();if(e.target.closest&&book.contains(e.target))turn(s===0||e.clientX>r.left+r.width*.3?1:-1);return}
  busy=true;const go=q.p>.3,d=q.d;
  if(go)Snd.fx('turn');
  settle(q.leaf,go?(d>0?-180:0):(d>0?0:-180),RM?60:600,()=>{if(go)s+=d;stack();if(go)arrive(d);busy=false});
});
addEventListener('pointercancel',()=>{if(dr&&dr.d){dr.leaf.classList.remove('show');dr.leaf.style.transform='';dr.leaf.style.transition='';stack()}dr=null});

/* ---------- UI ---------- */
$('#start').onclick=()=>turn(1);
$('#snd').onclick=e=>{Snd.unlock();e.currentTarget.style.opacity=Snd.toggle()?1:.4};
$('#vol').oninput=e=>{Snd.unlock();Snd.vol(e.target.value)};
$('#fs').onclick=()=>{try{const r=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();r&&r.catch&&r.catch(()=>{})}catch(e){}};
$('#rs').onclick=()=>{                                     // back to cover: all leaves turn back together
  if(busy)return;busy=true;lock=0;s=0;stack();
  leaves.forEach((_,i)=>{const v=svgOf(i+1);v.dataset.h=P[i].from||'down'});
  arrive(-1);setTimeout(()=>{busy=false},1300);
};
addEventListener('keydown',e=>{if(e.key==='ArrowRight')turn(1);if(e.key==='ArrowLeft')turn(-1)});
document.addEventListener('pointerdown',()=>Snd.unlock(),{once:true});
})();
