(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],LS=localStorage,SS=sessionStorage,now=new Date();
const S={tx:[],cats:[],bud:[],L:{},lang:LS.fin_lang||'id',cur:LS.fin_cur||'IDR',theme:LS.fin_theme||'light',pay:LS.fin_pay||'cash',name:LS.fin_name||'Liam',m:now.getMonth()+1,y:now.getFullYear(),conn:'idle',ok:false,v:'home',f:{q:'',type:'',cat:'',pay:'',mon:''},tm:'d',ft:'expense',admin:false,open:{cash:0,bank:0,ewallet:0,other:0}};
const PAY=['cash','bank','ewallet','other'],CUR=['IDR','USD','EUR','SGD','MYR','JPY'],CH={},AC={cash:['💵','#17935c'],bank:['🏦','#3b8de0'],ewallet:['📱','#8f3de0'],other:['👝','#9aa0b4']};
const P={home:'<path d="M3 11l9-8 9 8v10H3z"/>',history:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',stats:'<path d="M5 21V11M12 21V3M19 21v-7"/>',budget:'<path d="M3 7h18v13H3zM3 7l3-4h12l3 4M16 14h2"/>',reports:'<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6"/>',cats:'<path d="M20 12l-8 8-9-9V3h8zM7.5 7.5h.01"/>',settings:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',plus:'<path d="M12 5v14M5 12h14"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-1.5"/>'};
const ico=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;
const NAV=['home','history','stats','budget','reports','cats','settings'],TABS=['home','history','stats','reports','settings'];

/* ---------- i18n + formatting (language and currency are independent; amounts are never converted) ---------- */
const t=(k,v)=>{let s=(S.L[S.lang]||{})[k]??(S.L.en||{})[k]??k;for(const x in v)s=s.replace('{'+x+'}',v[x]);return s};
const loc=()=>S.lang==='id'?'id-ID':'en-US';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat(loc(),{style:'currency',currency:S.cur,currencyDisplay:'narrowSymbol',minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2}).format(n).replace(/\u00a0/g,'');
const sym=()=>new Intl.NumberFormat(loc(),{style:'currency',currency:S.cur,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency').value;
const short=v=>new Intl.NumberFormat(loc(),{notation:'compact'}).format(v);
const fmtNum=n=>new Intl.NumberFormat(loc(),{maximumFractionDigits:2}).format(n);
const gs=()=>S.lang==='id'?['.',',']:[',','.'];
function fmtInput(el){const[g,d]=gs();const v=el.value.split(g).join('').replace(new RegExp('[^0-9'+(d==='.'?'\\.':',')+']','g'),''),p=v.split(d),i=p.shift().replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,g);el.value=p.length?i+d+p.join('').slice(0,2):i}
const parseAmt=s=>{const[g,d]=gs();return parseFloat(String(s).split(g).join('').replace(d,'.'))};
const dfmt=(d,o={day:'numeric',month:'short',year:'numeric'})=>new Date(d+'T00:00:00').toLocaleDateString(loc(),o);
const mname=(m,y,l=1)=>new Date(y,m-1,1).toLocaleDateString(loc(),{month:l?'long':'short',year:'numeric'});
const today=()=>now.toLocaleDateString('sv-SE');

/* ---------- API layer: POST text/plain JSON {token,action,...data} -> {ok,...} (no preflight, no no-cors) ---------- */
const getTok=()=>SS.fin_tok||LS.fin_tok||'';
const setTok=(v,rem)=>{SS.removeItem('fin_tok');LS.removeItem('fin_tok');if(v)(rem?LS:SS).fin_tok=v};
const API={async call(action,data={}){
  const token=getTok();
  let j;try{const r=await fetch(window.FIN.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token,action,...data})});j=await r.json()}catch(e){throw new Error('network')}
  S.admin=!!j.admin;if(!j.ok)throw new Error(j.error||'error');return j}};
const msg=e=>({unauthorized:t('err.token'),network:t('err.net')})[e.message]||e.message;

/* ---------- calculations ---------- */
const r2=n=>Math.round(n*100)/100;
const sum=(a,ty)=>r2(a.filter(x=>x.type===ty).reduce((s,x)=>s+x.amount,0));
const ym=(m,y)=>y+'-'+String(m).padStart(2,'0');
const inM=(m,y)=>S.tx.filter(x=>x.transaction_date.slice(0,7)===ym(m,y));
const pm=(m,y)=>m===1?[12,y-1]:[m-1,y];
const months=n=>{const a=[];let m=S.m,y=S.y;for(let i=0;i<n;i++){a.unshift([m,y]);[m,y]=pm(m,y)}return a};
function accs(){const o={};PAY.forEach(p=>o[p]=S.open[p]||0);const g=k=>o[k]=o[k]||0;
  S.tx.forEach(x=>{const m=x.payment_method||'cash';g(m);if(x.type==='income')o[m]+=x.amount;else if(x.type==='expense')o[m]-=x.amount;else if(x.type==='transfer'&&x.to_method){g(x.to_method);o[m]-=x.amount;o[x.to_method]+=x.amount}});
  for(const k in o)o[k]=r2(o[k]);return o}
function calc(){const li=sum(S.tx,'income'),le=sum(S.tx,'expense'),mo=inM(S.m,S.y),mi=sum(mo,'income'),me=sum(mo,'expense'),[a,b]=pm(S.m,S.y),pi=sum(inM(a,b),'income');
  return{li,le,bal:r2(Object.values(accs()).reduce((s,v)=>s+v,0)),mo,mi,me,mb:r2(mi-me),sp:mi?Math.round((mi-me)/mi*100):0,ic:pi?Math.round((mi-pi)/pi*100):null}}
function byCat(l,ty='expense'){const m={};let T=0;l.filter(x=>x.type===ty).forEach(x=>{const o=m[x.category]=m[x.category]||{v:0,n:0};o.v+=x.amount;o.n++;T+=x.amount});return Object.entries(m).map(([id,o])=>({c:cat(id),v:r2(o.v),n:o.n,p:T?o.v/T*100:0})).sort((a,b)=>b.v-a.v)}
const cat=id=>S.cats.find(c=>c.id===id)||{id,name:id||'—',icon:'📦',color:'#9aa0b4'};
const cn=c=>{const k='cat.'+c.id;return S.L.en&&c.name===S.L.en[k]?t(k):c.name};
const payl=p=>(S.L.en||{})['pay.'+p]?t('pay.'+p):p||'—';
const bud=id=>S.bud.find(b=>String(b.category_id||'')===id&&+b.month===S.m&&+b.year===S.y);
const byDate=(a,b)=>b.transaction_date.localeCompare(a.transaction_date)||String(b.created_at||'').localeCompare(String(a.created_at||''));
const years=()=>[...new Set([now.getFullYear(),S.y,...S.tx.map(x=>+x.transaction_date.slice(0,4))])].sort((a,b)=>b-a);
const setTx=a=>{S.tx=a.map(x=>({...x,amount:Number(x.amount),transaction_date:String(x.transaction_date).slice(0,10)})).filter(x=>isFinite(x.amount)&&/^\d{4}-\d{2}-\d{2}$/.test(x.transaction_date))};
const up=(arr,o)=>{const i=arr.findIndex(x=>x.id===o.id);i<0?arr.push(o):arr[i]=o};

/* ---------- small UI helpers ---------- */
const V=h=>{$('#view').innerHTML=(S.ok&&!S.admin?`<div class="banner nop"><span>👀 ${t('view.banner')}</span><button class="btn pri" data-act="token">${t('unlock')}</button></div>`:'')+h};
const opt=(v,a)=>a.map(([k,l])=>`<option value="${esc(k)}" ${k===v?'selected':''}>${esc(l)}</option>`).join('');
const bar=(p,c)=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,p))}%;background:${c}"></i></div>`;
const bcol=p=>p>=100?'var(--neg)':p>=80?'#f59e0b':'var(--pos)';
const empty=(k='empty.tx')=>`<div class="empty">📭<p>${t(k)}</p></div>`;
const st=([a,v])=>`<div class="st"><small>${a}</small><b>${v}</b></div>`;
const toast=(m,bad)=>{const d=document.createElement('div');d.textContent=m;if(bad)d.className='bad';$('#toast').append(d);setTimeout(()=>d.remove(),3200)};
const modal=h=>{const m=$('#modal');m.innerHTML=`<div class="sheet">${h}</div>`;m.hidden=false;const i=$('input:not([type=hidden]),select',m);i&&i.focus()};
const close=()=>{$('#modal').hidden=true;$('#modal').innerHTML=''};
function fail(e,el){const m=msg(e);el?el.textContent=m:toast(m,1);if(e.message==='unauthorized'){S.admin=false;setTok('');if(!S.ok)S.conn='badtoken';shell();if(!el)tokenForm()}else if(e.message==='network'){S.conn='error';shell()}}
const row=x=>{if(x.type==='transfer')return`<div class="row" data-act="edit" data-id="${esc(x.id)}"><i class="ic" style="background:#3b8de026">⇄</i><div class="rm"><b>${esc(x.description||t('tx.transfer'))}</b><small>${esc(payl(x.payment_method))} → ${esc(payl(x.to_method))} · ${dfmt(x.transaction_date)}</small></div><b class="tr">${money(x.amount)}</b></div>`;const c=cat(x.category),i=x.type==='income';return`<div class="row" data-act="edit" data-id="${esc(x.id)}"><i class="ic" style="background:${esc(c.color)}26">${esc(c.icon)}</i><div class="rm"><b>${esc(x.description||cn(c))}</b><small>${esc(cn(c))} · ${esc(payl(x.payment_method))} · ${dfmt(x.transaction_date)}</small></div><b class="${i?'pos':'neg'}">${i?'+':'−'}${money(x.amount)}</b></div>`};
const brk=a=>a.length?a.map(x=>`<div class="br"><div class="h"><span>${esc(x.c.icon)} ${esc(cn(x.c))}</span><b>${money(x.v)} <small>${x.p.toFixed(0)}%</small></b></div>${bar(x.p,esc(x.c.color))}</div>`).join(''):empty();
const per=()=>`<div class="tools nop" style="margin-bottom:14px"><select data-per="m" style="width:auto">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${S.m===i+1?'selected':''}>${new Date(2000,i,1).toLocaleDateString(loc(),{month:'long'})}</option>`).join('')}</select><select data-per="y" style="width:auto">${years().map(y=>`<option ${S.y===y?'selected':''}>${y}</option>`).join('')}</select></div>`;

/* ---------- charts ---------- */
function chart(id,cfg){const el=document.getElementById(id);CH[id]&&CH[id].destroy();if(!el||!window.Chart)return;CH[id]=new Chart(el,{...cfg,options:{responsive:true,maintainAspectRatio:false,...(S.v==='reports'?{animation:false}:{}),color:id[0]==='r'?'#555':(getComputedStyle(document.body).getPropertyValue('--mut').trim()||'#777'),...cfg.options}})}
const destroy=()=>{Object.values(CH).forEach(c=>c.destroy());for(const k in CH)delete CH[k]};
function bars(id){const ms=months(6);chart(id,{type:'bar',data:{labels:ms.map(([m,y])=>mname(m,y,0)),datasets:[{label:t('income'),data:ms.map(([m,y])=>sum(inM(m,y),'income')),backgroundColor:'#f6b723',borderRadius:8},{label:t('expense'),data:ms.map(([m,y])=>sum(inM(m,y),'expense')),backgroundColor:'#8f3de0',borderRadius:8}]},options:{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.parsed.y)}`}}},scales:{y:{ticks:{callback:short}}}}})}
function dough(id,ex){const el=document.getElementById(id);if(!ex.length){el.parentNode.innerHTML=empty();return}chart(id,{type:'doughnut',data:{labels:ex.map(x=>cn(x.c)),datasets:[{data:ex.map(x=>x.v),backgroundColor:ex.map(x=>x.c.color),borderWidth:0}]},options:{cutout:'68%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.parsed)}`}}}}})}
function trendC(){const mo=inM(S.m,S.y).filter(x=>x.type==='expense'),dm=new Date(S.y,S.m,0).getDate();let l,d;
  if(S.tm==='m'){const ms=months(12);l=ms.map(([m,y])=>mname(m,y,0));d=ms.map(([m,y])=>sum(inM(m,y),'expense'))}
  else{const k=S.tm==='d'?dm:Math.ceil(dm/7);d=Array(k).fill(0);mo.forEach(x=>{const n=+x.transaction_date.slice(8,10);d[(S.tm==='d'?n:Math.ceil(n/7))-1]+=x.amount});d=d.map(r2);l=d.map((_,i)=>S.tm==='d'?i+1:t('s.w')+' '+(i+1))}
  chart('c3',{type:S.tm==='d'?'line':'bar',data:{labels:l,datasets:[{label:t('expense'),data:d,borderColor:'#8f3de0',backgroundColor:S.tm==='d'?'#8f3de033':'#8f3de0',fill:true,tension:.35,borderRadius:8}]},options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.parsed.y)}}},scales:{y:{ticks:{callback:short}}}}})}

/* ---------- shell + views ---------- */
function shell(){document.documentElement.dataset.theme=S.theme;document.documentElement.dataset.admin=S.admin?1:0;document.documentElement.lang=S.lang;document.title=t('app');
  $('#side').innerHTML=`<div class="brand">💜 ${t('app')}</div>`+NAV.map(k=>`<a href="#/${k}" class="${S.v===k?'on':''}">${ico(k)}${t('nav.'+k)}</a>`).join('');
  $('#tabs').innerHTML=TABS.map(k=>`<a href="#/${k}" class="${S.v===k?'on':''}" aria-label="${t('nav.'+k)}">${ico(k)}<span>${t('nav.'+k)}</span></a>`).join('');
  $('#fab').innerHTML=ico('plus');$('#fab').setAttribute('aria-label',t('tx.add'));
  const c=S.conn;$('#top').innerHTML=`<div><h1>${S.v==='home'?t('hello',{n:esc(S.name||'Liam')}):t('nav.'+S.v)}</h1><small>${now.toLocaleDateString(loc(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</small></div><div class="tools"><span class="dot ${c==='ok'?'ok':c==='loading'||c==='idle'?'':'bad'}" title="${t('conn.'+c)}"></span><div class="seg">${['en','id'].map(l=>`<button data-act="lang" data-id="${l}" class="${S.lang===l?'on':''}">${l.toUpperCase()}</button>`).join('')}</div><button class="ib" data-act="theme" aria-label="${t('set.theme')}">${S.theme==='dark'?'☀':'☾'}</button><button class="ib" data-act="${S.admin?'lock':'token'}" aria-label="${t(S.admin?'lock':'unlock')}" title="${t(S.admin?'lock':'unlock')}">${ico(S.admin?'unlock':'lock')}</button><a class="ib" href="#/settings">${esc((S.name||'L')[0]).toUpperCase()}</a></div>`}
function gate(){const l=S.conn==='loading'||S.conn==='idle',b=S.conn==='badtoken';V(`<div class="card empty">${l?'⏳':b?'🔑':'📡'}<p>${t('conn.'+S.conn)}</p>${l?'':`<div class="acts" style="justify-content:center"><button class="btn pri" data-act="${b?'token':'retry'}">${t(b?'tok.change':'retry')}</button></div>`}</div>`)}

const accKeys=a=>[...PAY,...Object.keys(a).filter(k=>!PAY.includes(k))],
accCard=(k,v)=>{const m=AC[k]||['👝','#9aa0b4'];return`<button class="acc" data-act="accf" data-id="${esc(k)}"><i class="ic" style="background:${m[1]}22">${m[0]}</i><small>${esc(payl(k))}</small><b class="${v<0?'neg':''}">${money(v)}</b></button>`};
function home(){const a=accs(),c=calc(),b=bud(''),lim=b?+b.amount:0,pc=lim?c.me/lim*100:0,ex=byCat(c.mo);
  V(per()+`<div class="cards"><div class="cy"><div><small>${t('d.income')}</small><br><b>${money(c.mi)}</b></div><div style="text-align:right"><small>${mname(S.m,S.y)}</small>${c.ic!==null?`<br><span class="pill">${c.ic>=0?'▲':'▼'} ${Math.abs(c.ic)}% ${t('d.vsprev')}</span>`:''}</div></div>
  <div class="cp"><small>${t('d.balance')} · ${t('d.allacc')}</small><h2>${money(c.bal)}</h2><small>${mname(S.m,S.y)} · ${t('d.savings')} ${c.sp}%</small></div></div>
  <h3 class="sec">${t('acc.title')}</h3><div class="accs">${accKeys(a).map(k=>accCard(k,a[k])).join('')}</div>
  <div class="g5">${[[t('d.income'),money(c.mi)],[t('d.expense'),money(c.me)],[t('d.remain'),money(c.mb)],[t('d.budget'),lim?`${money(lim-c.me)} ${t('d.left')}${bar(pc,bcol(pc))}`:`<a href="#/budget">${t('d.setbudget')}</a>`],[t('d.savings'),c.sp+'%']].map(st).join('')}</div>
  <div class="g2"><div class="card"><h3>${t('d.inc6')}</h3><div class="cv"><canvas id="c1"></canvas></div></div><div class="card"><h3>${t('d.bycat')}</h3><div class="cv"><canvas id="c2"></canvas></div></div></div>
  <div class="card"><h3>${t('s.cb')}</h3>${brk(ex.slice(0,5))}</div>
  <div class="card"><h3>${t('d.recent')}<a href="#/history">${t('viewall')}</a></h3>${S.tx.slice().sort(byDate).slice(0,6).map(row).join('')||empty()}</div>`);
  bars('c1');dough('c2',ex)}

function hist(){const f=S.f,ml=[...new Set(S.tx.map(x=>x.transaction_date.slice(0,7)))].sort().reverse().map(k=>[k,mname(+k.slice(5),+k.slice(0,4))]);
  V(`<div class="card"><div class="fl"><input data-f="q" placeholder="${t('h.search')}" value="${esc(f.q)}"><select data-f="type">${opt(f.type,[['',t('h.all')],['income',t('income')],['expense',t('expense')],['transfer',t('tx.transfer')]])}</select><select data-f="cat">${opt(f.cat,[['',t('h.allcat')],...S.cats.map(c=>[c.id,cn(c)])])}</select><select data-f="pay">${opt(f.pay,[['',t('h.allpay')],...PAY.map(p=>[p,t('pay.'+p)])])}</select><select data-f="mon">${opt(f.mon,[['',t('h.allmon')],...ml])}</select></div><div id="hl"></div></div>`);histList()}
function histList(){const f=S.f,q=f.q.toLowerCase(),l=S.tx.filter(x=>(!f.type||x.type===f.type)&&(!f.cat||x.category===f.cat)&&(!f.pay||x.payment_method===f.pay||x.to_method===f.pay)&&(!f.mon||x.transaction_date.slice(0,7)===f.mon)&&(!q||((x.description||'')+' '+cn(cat(x.category))).toLowerCase().includes(q))).sort(byDate);
  let d='',h='';l.forEach(x=>{if(x.transaction_date!==d){d=x.transaction_date;h+=`<div class="dh">${dfmt(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>`}h+=row(x)});$('#hl').innerHTML=h||empty(S.tx.length?'empty.none':'empty.tx')}

function stats(){const c=calc(),ex=byCat(c.mo),dm=S.m===now.getMonth()+1&&S.y===now.getFullYear()?now.getDate():new Date(S.y,S.m,0).getDate();
  V(per()+`<div class="g5">${[[t('d.income'),money(c.mi)],[t('d.expense'),money(c.me)],[t('d.remain'),money(c.mb)],[t('s.top'),ex.length?esc(cn(ex[0].c)):'—'],[t('s.low'),ex.length?esc(cn(ex[ex.length-1].c)):'—'],[t('s.avg'),money(r2(c.me/dm))]].map(st).join('')}</div>
  <div class="g2"><div class="card"><h3>${t('s.dist')}</h3><div class="cv"><canvas id="c1"></canvas></div></div><div class="card"><h3>${t('d.inc6')}</h3><div class="cv"><canvas id="c2"></canvas></div></div></div>
  <div class="card"><h3>${t('s.trend')}<span class="seg">${[['d','s.day'],['w','s.week'],['m','s.month']].map(([k,l])=>`<button data-act="tm" data-id="${k}" class="${S.tm===k?'on':''}">${t(l)}</button>`).join('')}</span></h3><div class="cv"><canvas id="c3"></canvas></div></div>
  <div class="card"><h3>${t('s.cb')}</h3>${brk(ex)}</div>`);
  dough('c1',ex);bars('c2');trendC()}

function budget(){const c=calc(),sp=byCat(c.mo),spent=id=>(sp.find(x=>x.c.id===id)||{v:0}).v;
  const line=(id,name,icon,s)=>{const b=bud(id),lim=b?+b.amount:0,p=lim?s/lim*100:0;return`<div class="br"><div class="h"><span>${esc(icon)} ${esc(name)}</span><input data-bud="${esc(id)}" ${S.admin?'':'disabled'} inputmode="decimal" placeholder="${t('b.nolimit')}" value="${lim?fmtNum(lim):''}"></div>${lim?`${bar(p,bcol(p))}<small>${t('b.spent')} ${money(s)} · ${t('b.rem')} ${money(lim-s)}${p>=100?' · '+t('b.over'):p>=80?' · '+t('b.near'):''}</small>`:''}</div>`};
  V(per()+`<div class="card"><h3>${t('b.overall')}</h3>${line('',t('b.title'),'🎯',c.me)}</div><div class="card"><h3>${t('b.cat')}</h3>${S.cats.filter(x=>x.type==='expense').map(x=>line(x.id,cn(x),x.icon,spent(x.id))).join('')}</div>`)}

const tbl=a=>a.length?`<table>${a.map(x=>`<tr><td>${esc(x.c.icon)} ${esc(cn(x.c))}</td><td>${x.n}×</td><td>${x.p.toFixed(1)}%</td><td>${money(x.v)}</td></tr>`).join('')}<tr><th colspan="3">${t('d.total')}</th><th>${money(r2(a.reduce((s,x)=>s+x.v,0)))}</th></tr></table>`:`<p class="mut">—</p>`;
function reports(){const c=calc(),mo=c.mo.slice().sort((a,b)=>a.transaction_date.localeCompare(b.transaction_date)),ex=byCat(c.mo),ic=byCat(c.mo,'income');
  V(per()+`<div class="acts nop" style="justify-content:flex-start;margin:0 0 14px"><button class="btn pri" data-act="print">${t('r.print')}</button><button class="btn" data-act="print">${t('r.pdf')}</button><button class="btn" data-act="csv">${t('r.csv')}</button></div>
  <article id="rep" class="card"><h1>${t('r.title')}</h1><p class="mut">${t('r.period')}: ${mname(S.m,S.y)}</p><h3 style="margin-top:14px">${t('r.sum')}</h3>
  <div class="g5">${[[t('d.income'),money(c.mi)],[t('d.expense'),money(c.me)],[t('d.remain'),money(c.mb)],[t('d.savings'),c.sp+'%']].map(st).join('')}</div>
  <div class="g2"><div><h3>${t('r.inc')}</h3>${tbl(ic)}</div><div><h3>${t('r.exp')}</h3>${tbl(ex)}</div></div>
  <div class="g2" style="margin-top:16px"><div class="cv"><canvas id="r1"></canvas></div><div class="cv"><canvas id="r2"></canvas></div></div>
  <h3 style="margin-top:18px">${t('r.tx')} (${mo.length})</h3>${mo.length?`<div style="overflow-x:auto"><table><tr><th>${t('tx.date')}</th><th>${t('tx.cat')}</th><th>${t('desc')}</th><th>${t('tx.method')}</th><th>${t('amt')}</th></tr>${mo.map(x=>`<tr><td>${dfmt(x.transaction_date)}</td><td>${esc(x.type==='transfer'?t('tx.transfer')+' → '+payl(x.to_method):cn(cat(x.category)))}</td><td>${esc(x.description)}</td><td>${esc(payl(x.payment_method))}</td><td class="${x.type==='income'?'pos':x.type==='transfer'?'':'neg'}">${x.type==='income'?'+':x.type==='transfer'?'':'−'}${money(x.amount)}</td></tr>`).join('')}</table></div>`:empty()}</article>`);
  dough('r1',ex);bars('r2')}
function csv(){const q=v=>{v=String(v??'');return'"'+(/^[=+\-@]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"'},c=calc(),rows=[['date','type','category','description','payment_method','to_method','amount'].map(q).join(','),...c.mo.slice().sort(byDate).map(x=>[q(x.transaction_date),q(x.type),q(cn(cat(x.category))),q(x.description),q(x.payment_method),q(x.to_method),x.amount].join(','))];
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=`transactions-${ym(S.m,S.y)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)}

function cats(){V(['expense','income'].map(ty=>`<div class="card"><h3>${t(ty)}</h3>${S.cats.filter(c=>c.type===ty).map(c=>`<div class="row" style="cursor:default"><i class="ic" style="background:${esc(c.color)}26">${esc(c.icon)}</i><div class="rm"><b>${esc(cn(c))}</b><small>${S.tx.filter(x=>x.category===c.id).length} ${t('tx.n')}</small></div><button class="btn adm" data-act="ecat" data-id="${esc(c.id)}">${t('edit')}</button><button class="btn dng adm" data-act="dcat" data-id="${esc(c.id)}" aria-label="${t('delete')}">✕</button></div>`).join('')}</div>`).join('')+`<button class="btn pri adm" data-act="ncat">+ ${t('c.new')}</button>`)}
function settings(){const sr=(l,c)=>`<div class="sr"><span>${l}</span>${c}</div>`,c=S.conn,d=S.admin?'':'disabled';
  V(`<div class="card">${sr(t('set.name'),`<input data-set="name" ${d} value="${esc(S.name)}" maxlength="30">`)}${sr(t('set.lang'),`<div class="seg">${['en','id'].map(l=>`<button data-act="lang" data-id="${l}" class="${S.lang===l?'on':''}">${l.toUpperCase()}</button>`).join('')}</div>`)}${sr(t('set.cur'),`<select data-set="cur" ${d}>${opt(S.cur,CUR.map(x=>[x,x]))}</select>`)}${sr(t('set.theme'),`<select data-set="theme">${opt(S.theme,[['light',t('set.light')],['dark',t('set.dark')]])}</select>`)}${sr(t('set.pay'),`<select data-set="pay" ${d}>${opt(S.pay,PAY.map(p=>[p,t('pay.'+p)]))}</select>`)}</div>
  <div class="card"><h3>${t('set.open')}</h3><p class="mut">${t('set.openHelp')}</p>${PAY.map(p=>sr(`${AC[p][0]} ${t('pay.'+p)}`,`<input data-set="open_${p}" ${d} inputmode="decimal" placeholder="0" value="${S.open[p]?fmtNum(S.open[p]):''}">`)).join('')}</div>
  <div class="card">${sr(t('set.mode'),`<b>${S.admin?'🔓 '+t('mode.admin'):'🔒 '+t('mode.view')}</b>`)}${sr(t('set.api'),`<span><i class="dot ${c==='ok'?'ok':c==='loading'||c==='idle'?'':'bad'}"></i> ${t('conn.'+c)}</span>`)}<div class="acts">${S.admin?`<button class="btn" data-act="lock">${t('lock')}</button>`:`<button class="btn pri" data-act="token">${t('unlock')}</button>`}<button class="btn" data-act="refresh">${t('set.refresh')}</button></div></div>
  <div class="card">${sr(`<a href="#/budget">${t('nav.budget')}</a>`,'')}${sr(`<a href="#/cats">${t('nav.cats')}</a>`,'')}</div>
  <div class="card"><h3>${t('set.about')}</h3><p class="mut">${t('set.aboutTxt')}</p></div>`)}
const R={home,history:hist,stats,budget,reports,cats,settings};

/* ---------- forms ---------- */
function chips(sel){$('#cs').innerHTML=S.cats.filter(c=>c.type===S.ft).map(c=>`<button type="button" class="chip ${c.id===sel?'on':''}" data-act="chip" data-id="${esc(c.id)}"><span>${esc(c.icon)}</span>${esc(cn(c))}</button>`).join('')}
const ftog=()=>{const tr=S.ft==='transfer';$('#cs').hidden=tr;$('#tw').hidden=!tr;$('#th').hidden=!tr;$('#pml').textContent=t(tr?'tx.from':'tx.method')};
function txForm(x){x=x||{type:'expense',category:'',transaction_date:today(),payment_method:S.pay,description:'',amount:'',to_method:''};S.ft=x.type;const to=x.to_method||PAY.find(p=>p!==x.payment_method);
  modal(`<form id="tf" data-id="${esc(x.id||'')}"><div class="seg" id="tt">${[['expense',t('expense')],['income',t('income')],['transfer',t('tx.transfer')]].map(([k,l])=>`<button type="button" data-act="ty" data-id="${k}" class="${x.type===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="amt"><span>${esc(sym())}</span><input id="am" inputmode="decimal" autocomplete="off" placeholder="0" value="${x.amount?fmtNum(x.amount):''}"></div><div class="chips" id="cs"></div><p class="mut hint" id="th" hidden>${t('tx.hint')}</p>
  <div class="two"><label><small>${t('tx.date')}</small><input type="date" id="dt" value="${esc(x.transaction_date)}"></label><label><small id="pml">${t('tx.method')}</small><select id="pm">${opt(x.payment_method,[...new Set([...PAY,x.payment_method])].map(p=>[p,payl(p)]))}</select></label></div>
  <label id="tw" hidden><small>${t('tx.to')}</small><select id="to">${opt(to,[...new Set([...PAY,to])].map(p=>[p,payl(p)]))}</select></label>
  <input id="ds" maxlength="200" placeholder="${t('tx.notes')}" value="${esc(x.description)}"><p class="err" id="er"></p>
  <div class="acts">${x.id?`<button type="button" class="btn dng" data-act="deltx">${t('delete')}</button>`:''}<button type="button" class="btn" data-act="close">${t('cancel')}</button><button class="btn pri">${t('save')}</button></div></form>`);chips(x.category);ftog()}
async function saveTx(f){const a=parseAmt($('#am').value),T=S.ft==='transfer',c=$('.chip.on',f)?.dataset.id,d=$('#dt').value,er=$('#er'),pm=$('#pm').value,to=$('#to').value;
  if(!isFinite(a)||a<=0)return er.textContent=t('err.amount');if(T){if(to===pm)return er.textContent=t('err.same')}else if(!c)return er.textContent=t('err.cat');if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return er.textContent=t('err.date');
  const id=f.dataset.id,tr={type:S.ft,amount:a,category:T?'':c,description:$('#ds').value.trim(),payment_method:pm,to_method:T?to:'',transaction_date:d};if(id)tr.id=id;
  const b=$('.pri',f);b.disabled=true;
  try{const j=await API.call(id?'UPDATE_TRANSACTION':'ADD_TRANSACTION',{transaction:tr}),n=j.transaction;n.amount=Number(n.amount);n.transaction_date=String(n.transaction_date).slice(0,10);up(S.tx,n);close();toast(t('ok.saved'));render()}catch(e){b.disabled=false;fail(e,er)}}
async function delTx(f){const id=f.dataset.id;if(!confirm(t('confirm.del')))return;try{await API.call('DELETE_TRANSACTION',{id});S.tx=S.tx.filter(x=>x.id!==id);close();toast(t('ok.deleted'));render()}catch(e){fail(e)}}
function catForm(c){c=c||{type:'expense',icon:'📦',color:'#8f3de0',name:''};
  modal(`<form id="cf" data-id="${esc(c.id||'')}"><h3>${t('c.new')}</h3><label><small>${t('c.name')}</small><input id="f_n" maxlength="40" value="${esc(c.name)}"></label><div class="two" style="margin-top:10px"><label><small>${t('c.icon')}</small><input id="f_i" maxlength="8" value="${esc(c.icon)}"></label><label><small>${t('c.color')}</small><input id="f_c" type="color" value="${esc(c.color)}"></label></div><select id="f_t">${opt(c.type,[['expense',t('expense')],['income',t('income')]])}</select><p class="err" id="er"></p><div class="acts"><button type="button" class="btn" data-act="close">${t('cancel')}</button><button class="btn pri">${t('save')}</button></div></form>`)}
async function saveCat(f){const n=$('#f_n').value.trim(),id=f.dataset.id;if(!n)return $('#er').textContent=t('err.name');const c={name:n,icon:$('#f_i').value.trim()||'📦',color:$('#f_c').value,type:$('#f_t').value};if(id)c.id=id;
  try{const j=await API.call(id?'UPDATE_CATEGORY':'ADD_CATEGORY',{category:c});up(S.cats,j.category);close();toast(t('ok.saved'));render()}catch(e){fail(e,$('#er'))}}
function delCat(id){const n=S.tx.filter(x=>x.category===id).length,c=cat(id);if(!n){if(confirm(t('c.confirm')))doDel(id);return}
  const o=S.cats.filter(x=>x.type===c.type&&x.id!==id);if(!o.length)return toast(t('c.needother'),1);
  modal(`<form id="rf" data-id="${esc(id)}"><h3>${t('c.reassign',{n})}</h3><select id="f_r">${opt('',o.map(x=>[x.id,cn(x)]))}</select><p class="err" id="er"></p><div class="acts"><button type="button" class="btn" data-act="close">${t('cancel')}</button><button class="btn pri dng" style="margin:0">${t('delete')}</button></div></form>`)}
async function doDel(id,to){try{await API.call('DELETE_CATEGORY',to?{id,reassignTo:to}:{id});S.cats=S.cats.filter(c=>c.id!==id);if(to)setTx((await API.call('GET_TRANSACTIONS')).transactions);close();toast(t('ok.deleted'));render()}catch(e){fail(e,$('#er'))}}
function tokenForm(){modal(`<form id="kf"><h3>${t('tok.title')}</h3><p class="mut" style="margin-bottom:12px">${t('tok.help')}</p><input type="password" id="tk" autocomplete="off" placeholder="${t('tok.ph')}"><label style="display:flex;gap:8px;margin-top:12px"><input type="checkbox" id="rm" ${LS.fin_tok?'checked':''}>${t('tok.remember')}</label><p class="err" id="er"></p><div class="acts"><button type="button" class="btn" data-act="close">${t('cancel')}</button><button class="btn pri">${t('save')}</button></div></form>`)}
async function saveTok(){const v=$('#tk').value.trim(),er=$('#er');if(!v)return er.textContent=t('err.token');setTok(v,$('#rm').checked);
  try{await API.call('PING');close();toast(t('ok.unlocked'));load()}catch(e){setTok('');S.admin=false;er.textContent=msg(e)}}
async function saveBud(cid,v){const a=v.trim()?parseAmt(v):0;if(!isFinite(a)||a<0)return toast(t('err.bud'),1);
  try{const j=await API.call('SAVE_BUDGET',{budget:{category_id:cid,month:S.m,year:S.y,amount:a}});up(S.bud,j.budget);toast(t('ok.saved'));render()}catch(e){fail(e)}}
function setPref(k,v){S[k]=v;LS['fin_'+k]=v;const map={name:'name',cur:'currency',pay:'defaultPayment'};if(S.admin&&map[k])API.call('SAVE_SETTINGS',{settings:{[map[k]]:v}}).catch(e=>fail(e));render()}
function setOpen(p,v){const n=v.trim()?parseAmt(v):0;if(!isFinite(n)||n<0)return toast(t('err.bud'),1);S.open[p]=n;
  API.call('SAVE_SETTINGS',{settings:{['open_'+p]:n}}).then(()=>toast(t('ok.saved'))).catch(e=>fail(e));render()}

/* ---------- data loading + routing ---------- */
async function load(){S.conn='loading';shell();if(!S.ok)gate();
  try{const rs=await Promise.allSettled(['GET_TRANSACTIONS','GET_CATEGORIES','GET_BUDGETS','GET_SETTINGS'].map(a=>API.call(a))),bad=rs.find(r=>r.status==='rejected');if(bad)throw bad.reason;
    const[a,b,c,d]=rs.map(r=>r.value),s=d.settings||{};setTx(a.transactions);S.cats=b.categories;S.bud=c.budgets;
    if(s.name){S.name=s.name;LS.fin_name=s.name}if(s.currency){S.cur=s.currency;LS.fin_cur=s.currency}if(s.defaultPayment){S.pay=s.defaultPayment;LS.fin_pay=s.defaultPayment}
    PAY.forEach(p=>S.open[p]=Number(s['open_'+p])||0);
    S.conn='ok';S.ok=true;if(getTok()&&!S.admin){setTok('');toast(t('err.token'),1)}render()}
  catch(e){S.conn=e.message==='unauthorized'?'badtoken':'error';render();fail(e)}}
function render(){const k=location.hash.replace('#/','');S.v=R[k]?k:'home';destroy();shell();S.ok?R[S.v]():gate()}

const ACT={add:()=>S.admin?txForm():tokenForm(),edit:id=>S.admin&&txForm(S.tx.find(x=>x.id===id)),close,deltx:(i,b)=>delTx(b.closest('form')),
  lang:id=>{S.lang=id;LS.fin_lang=id;close();render()},theme:()=>setPref('theme',S.theme==='dark'?'light':'dark'),
  retry:load,refresh:async()=>{await load();if(S.conn==='ok')toast(t('ok.loaded'))},token:tokenForm,lock:()=>{setTok('');S.admin=false;toast(t('ok.locked'));render()},accf:id=>{S.f={q:'',type:'',cat:'',pay:id,mon:''};location.hash='#/history'},
  ty:(id,b)=>{S.ft=id;$$('#tt button').forEach(x=>x.classList.toggle('on',x===b));chips('');ftog()},chip:(id,b)=>$$('.chip').forEach(x=>x.classList.toggle('on',x===b)),
  tm:id=>{S.tm=id;destroy();stats()},ncat:()=>catForm(),ecat:id=>catForm(cat(id)),dcat:delCat,print:()=>window.print(),csv};
document.addEventListener('click',e=>{if(e.target.id==='modal')return close();const b=e.target.closest('[data-act]');b&&ACT[b.dataset.act]?.(b.dataset.id,b)});
document.addEventListener('input',e=>{const el=e.target;if(el.id==='am'||el.dataset.bud!==undefined||(el.dataset.set||'').startsWith('open_'))fmtInput(el);else if(el.dataset.f){S.f[el.dataset.f]=el.value;histList()}});
document.addEventListener('change',e=>{const el=e.target,d=el.dataset;if(d.per){S[d.per]=+el.value;render()}else if(d.set)d.set.startsWith('open_')?setOpen(d.set.slice(5),el.value):setPref(d.set,el.value);else if(d.bud!==undefined)saveBud(d.bud,el.value)});
document.addEventListener('submit',e=>{e.preventDefault();({tf:saveTx,kf:saveTok,cf:saveCat,rf:f=>doDel(f.dataset.id,$('#f_r').value)})[e.target.id]?.(e.target)});
document.addEventListener('keydown',e=>e.key==='Escape'&&close());
addEventListener('hashchange',render);addEventListener('beforeprint',()=>Object.values(CH).forEach(c=>c.resize()));
(async()=>{try{const[en,id]=await Promise.all(['en','id'].map(l=>fetch(`${l}.json`).then(r=>r.json())));S.L={en,id}}catch(e){$('#view').textContent='Could not load en.json / id.json (serve over http, e.g. GitHub Pages).';return}
  render();load()})();
})();
