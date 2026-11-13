import {knownHQ,reputationHTML,cityRep,factionRep,reputationName} from './reputation.js';
import {PEOPLE} from './data.js';
import {icon,iconButton} from './ui-icons.js';
import {CARDS,DECKS,eventsFor,stageOf,deckState,chronicle} from './event-deck.js';
import {entryObjective} from './progress.js';
const who=id=>PEOPLE.find(p=>p.id===id)?.name||'';
const TABS=[['self','己','UserRound','C'],['affairs','事','ScrollText','J'],['people','人','Network','K'],['map','舆图','Compass','M']];
const ROUTE_NAME={royal:'锦衣客担保',convoy:'随花石纲役夫入城',uniform:'差役服过关',papers:'持路引过关',friend:'校尉担保',merchant:'随货队登记',river:'破栅涉水',breach:'破门闯入',prison:'刑满出狱'};
export function cardHTML(c,esc,{down=false,debug=false}={}){
 const kind=CARDS[c.card]||CARDS.rest,src=!debug?'':c.ai?`<span class="jh-src ai" title="${esc(c.reason?'推演：'+c.reason:'AI 推演')}">推</span>`:'<span class="jh-src" title="本地规则">本</span>';
 if(down)return `<article class="jh-card down" data-card="${esc(c.card||'echo')}"><span class="jh-back" aria-hidden="true"></span><p>${esc(c.wind)}</p><small>缘起 · ${esc(c.causeTitle||'')}</small></article>`;
 const speaker=c.speaker?who(c.speaker):'';
 return `<article class="jh-card${c.urgent?' urgent':''}" data-card="${esc(c.card)}"><header><span class="jh-seal">${kind.seal}</span><b>${esc(kind.name)}</b>${src}</header><h4>${esc(c.title||kind.name)}</h4>${c.line?`<p>${speaker?esc(speaker)+'：':''}“${esc(c.line)}”</p>`:''}${c.lead&&c.lead!==c.line?`<small class="jh-lead-text">${esc(c.lead)}</small>`:''}${debug&&c.reason&&c.ai?`<small class="jh-reason">推演 · ${esc(c.reason)}</small>`:''}${debug&&c.skipped?.length?`<small class="jh-skip">略过 ${c.skipped.map(k=>CARDS[k]?.name).join('、')}</small>`:''}<footer>${esc(c.clock||'江湖见闻')}${c.channel==='mail'?' · 来信':''}</footer></article>`;
}
function goalsHTML(s,esc){
 const st=stageOf(s),d=deckState(s),lead=e=>d.leads.find(l=>l.event===e.id);
 const sticks=stage=>eventsFor(s).filter(e=>e.card==='route'&&e.stage===stage).map(e=>{const l=lead(e),self=!l&&e.known?.(s);return l||self?`<button class="jh-stick" ${e.place?`data-lead="${esc(e.id)}"`:'disabled'} title="${esc(e.lead)}"><b>${esc(e.title)}</b><small>${l?esc(who(l.source)):'亲历'}</small></button>`:'<span class="jh-stick unknown" aria-label="尚未听说的门路">？</span>';}).join('');
 const entered=!!s.facts.enteredCity;
 return `<section class="jh-goals"><article class="${entered?'done':''}"><h3>入城</h3><small>门路 ${eventsFor(s).filter(e=>e.card==='route'&&e.stage==='gate'&&(lead(e)||e.known?.(s))).length}/${eventsFor(s).filter(e=>e.card==='route'&&e.stage==='gate').length}</small><p>${entered?esc(ROUTE_NAME[s.facts.entryRoute]||'已入城'):esc(entryObjective(s)||'城门未开')}</p>${entered?'<span class="ink-seal small stamp">过</span>':`<div class="jh-sticks">${sticks('gate')}</div>`}</article><article class="${st==='town'?'':'locked'}"><h3>艮岳</h3><p>${st==='town'?'城中的门路':'入城之后'}</p>${st==='town'?`<div class="jh-sticks">${sticks('town')}</div>`:''}</article><article><h3>名号</h3><p>${esc(s.chapter?.titles?.join('、')||'尚无名号')}</p>${s.chapter?`<small>临溪镇 ${cityRep(s,'linxi')}</small>`:''}<div class="jh-fame"><span title="声望">${icon('Badge')}<b>${cityRep(s)}</b></span><span title="嫌疑">${icon('Eye')}<b>${s.wanted}</b></span></div></article></section>`;
}
function deckStrip(s,esc){
 const st=stageOf(s),deck=DECKS[st],p=deckState(s).pointer[st];
 return `<ol class="jh-deck" aria-label="江湖牌序">${deck.map((k,i)=>`<li class="${i<p?'dealt':i===p?'next':''}" title="${esc(CARDS[k].name)}${i===p?' · 下一张':''}">${CARDS[k].seal}</li>`).join('')}</ol>`;
}
function ledgerHTML(s,esc,debug=false){
 const d=deckState(s),c=chronicle(s);
 const rows=[...c.deeds.map(x=>({t:x.at??x.day*1e3,day:x.day,html:`<li id="deed-${x.id}" class="jh-deed ${x.valence}${x.cause?' has-cause':''}">${x.cause?`<a class="jh-cause" href="#deed-${x.cause}">缘起 · ${esc(c.deeds.find(d=>d.id===x.cause)?.title||'先前的经历')}</a>`:''}<time>${esc(x.clock)}</time><b>${esc(x.title)}</b><span>${esc(x.text)}</span>${x.witnesses?.length?`<small>${icon('Eye')} ${esc(x.witnesses.map(who).join('、'))}</small>`:''}</li>`})),
  ...d.cards.filter(x=>x.title!=='闲话'||x.line).map(x=>({t:(x.at??x.day*1e3)+.01,day:x.day,html:`<li class="jh-dealt">${cardHTML(x,esc,{debug})}</li>`})),
  ...d.echoes.filter(e=>!e.delivered).map(e=>({t:(e.at??e.day*1e3)+.02,day:e.day,html:`<li class="jh-dealt">${cardHTML(e,esc,{down:true})}</li>`}))].sort((a,b)=>b.t-a.t);
 const days=[...new Set(rows.map(r=>r.day))];
 return days.length?days.map(day=>{const diary=c.diaries.find(x=>x.day===day);return `<section class="jh-day"><h4>${day===s.day?'今日':day===s.day-1?'昨日':'往事'}</h4>${diary?`<blockquote class="jh-diary-quote">${diary.lines.map(l=>`<p>${esc(l)}</p>`).join('')}${debug&&diary.ai?'<span class="jh-src ai" title="AI 推演的江湖日记">推</span>':''}</blockquote>`:''}<ul>${rows.filter(r=>r.day===day).map(r=>r.html).join('')}</ul></section>`;}).join(''):'<p class="ink-muted">先向当值守卫问清关门的缘由；或去西墙的草席歇息，听瘸张说说看人的门道。</p>';
}
function mapHTML(s,esc){
 const st=stageOf(s),places=[
  {id:'gate',name:'临溪关',x:5.6,y:54,live:true,here:st==='gate'},
  {id:'town',name:'临溪镇',x:13.5,y:48,live:true,here:st==='town',up:true},
  {id:'capital',name:'汴京',x:51,y:33},{id:'genyue',name:'艮岳',x:72.5,y:9,end:true,live:!!s.facts.demoComplete,here:!!s.facts.demoComplete}];
 return `<section class="hq-map"><h3>临溪 · 驻地</h3><div>${knownHQ(s).map(h=>`<button data-headquarters="${h.id}" style="--faction-color:${h.color}"><b>${h.glyph}</b><span>${h.name}<small>${h.place}</small></span><strong>${factionRep(s,h.id)}<small>${reputationName(factionRep(s,h.id))}</small></strong></button>`).join('')}</div></section>${reputationHTML(s,esc)}<figure class="jh-map"><img src="assets/ui/bianjing-map.jpg" alt="汴京全图" draggable="false">${places.map(p=>`<span class="jh-place${p.live?' live':' far'}${p.here?' here':''}${p.end?' end':''}${p.up?' up':''}" style="left:${p.x}%;top:${p.y}%"><i class="jh-dot" aria-hidden="true"></i><b>${p.name}</b>${p.live?'':'<small>未至</small>'}</span>`).join('')}</figure><div class="jh-map-legend"><span>${icon('Eye')} 嫌疑 <b>${s.wanted}</b></span><span>${icon('Badge')} 声望 <b>${cityRep(s)}</b></span></div>`;
}
export function mountCodex({drawer,getSim,esc,profileHTML,organizationHTML,questsHTML,onLead,onSound,onGuide,onTrack,onTeacher,onHeadquarters}){
 let tab='affairs',orgTab,showDeck=false;
 const el=()=>document.getElementById('drawer');
 function body(s){
  if(tab==='self')return profileHTML();
  if(tab==='people')return organizationHTML(orgTab);
  if(tab==='map')return mapHTML(s,esc);
  return (s.chapter?.ending?`<section class="jh-ending"><h3>${esc(s.chapter.ending.title)}</h3><p>${esc(s.chapter.ending.text)}</p><span class="ink-seal small">卷终</span></section>`:'')+goalsHTML(s,esc)+`<button data-deck-view aria-pressed="${showDeck}">推演视图</button>${showDeck?deckStrip(s,esc):''}<h3 class="jh-h">因果簿</h3>${ledgerHTML(s,esc,showDeck)}<h3 class="jh-h">线索</h3>${questsHTML()}`;
 }
 function open(next=tab,sub){
  tab=next;if(sub!==undefined)orgTab=sub;const s=getSim().s;
  const nav=`<nav class="jh-tabs" role="tablist">${TABS.map(([id,label,ico,key])=>`<button role="tab" data-codex-tab="${id}" aria-selected="${id===tab}" title="${label} · ${key}">${icon(ico)}<span>${label}</span></button>`).join('')}<span class="jh-tools"><button data-codex-sound></button><button data-codex-guide></button></span></nav>`;
  drawer(TABS.find(t=>t[0]===tab)[1],nav+`<div class="jh-page" data-page="${tab}">${body(s)}</div>`);
  const d=el();d.dataset.view='codex';d.dataset.page=tab;
  for(const b of d.querySelectorAll('[data-codex-tab]'))b.onclick=()=>open(b.dataset.codexTab);
  for(const b of d.querySelectorAll('[data-org-tab]'))b.onclick=()=>open('people',b.dataset.orgTab);
  for(const b of d.querySelectorAll('[data-lead]'))b.onclick=()=>onLead(b.dataset.lead);
  for(const b of d.querySelectorAll('[data-teacher]'))b.onclick=()=>onTeacher?.(b.dataset.teacher);
  for(const b of d.querySelectorAll('[data-headquarters]'))b.onclick=()=>onHeadquarters?.(b.dataset.headquarters);
  for(const b of d.querySelectorAll('[data-track]'))b.onclick=()=>{onTrack(b.dataset.track);open('affairs');};
  const toggle=d.querySelector('[data-deck-view]');if(toggle)toggle.onclick=()=>{showDeck=!showDeck;open('affairs');};
  const sound=d.querySelector('[data-codex-sound]'),guide=d.querySelector('[data-codex-guide]');
  const sync=()=>{const on=onSound();iconButton(sound,on?'Volume2':'VolumeX',on?'关闭声音':'开启声音');iconButton(guide,'Keyboard','操作说明');};
  sound.onclick=()=>{onSound(true);sync();};guide.onclick=()=>onGuide();sync();
  if(tab==='affairs')badge(0);
 }
 const isOpen=t=>!el().hidden&&el().dataset.view==='codex'&&(!t||el().dataset.page===t);
 let unseen=0;function badge(n){unseen=n;const b=document.getElementById('codex-button');if(b)b.classList.toggle('has-news',unseen>0);}
 return {open,isOpen,toggle(t){if(isOpen(t)){el().hidden=true;return false;}open(t);return true;},refresh(){if(isOpen())open(tab);},notice(){badge(unseen+1);}};
}
// 夜里发牌：歇息醒来时展开，先落笔日记，再一张张发牌；扣着的牌只露风声。
export function mountNight({esc,onClose}){
 const root=document.getElementById('night-deal');let active=false,ticket=0;
 function close(){if(!active)return;active=false;ticket++;root.hidden=true;document.body.classList.remove('night-open');onClose?.();}
 function show({day,clock,pending}){
  active=true;const t=++ticket;root.hidden=false;document.body.classList.add('night-open');
  root.innerHTML=`<div class="jh-night ink-paper ink-unroll"><header><h2 class="ink-title">夜</h2><small>${esc(clock)}</small><button data-close></button></header><div class="jh-diary" aria-live="polite"></div><p class="jh-wait"><i aria-hidden="true"></i>墨未干</p><div class="jh-hand"></div><footer><button class="ink-btn primary" data-rise>起身</button></footer></div>`;
  const x=root.querySelector('[data-close]');iconButton(x,'X','起身');x.onclick=close;root.querySelector('[data-rise]').onclick=close;root.querySelector('[data-rise]').focus();
  Promise.resolve(pending).then(r=>{
   if(t!==ticket||!r)return;root.querySelector('.jh-wait').hidden=true;
   const diary=root.querySelector('.jh-diary'),hand=root.querySelector('.jh-hand');for(const line of r.talk||[]){const p=document.createElement('p');p.className='jh-rest-talk';p.textContent=who(line.id)+'：'+line.text;diary.append(p);}
   r.diary.lines.forEach((line,i)=>{const p=document.createElement('p');p.className='jh-stroke';p.style.animationDelay=(i*.42)+'s';p.textContent=line;diary.append(p);});
   const cards=[...r.cards.map(c=>cardHTML(c,esc)),...r.echoes.map(e=>cardHTML(e,esc,{down:true}))];
   hand.innerHTML=cards.join('')||'<p class="ink-muted">一夜无话。</p>';
   [...hand.children].forEach((c,i)=>{c.style.animationDelay=(r.diary.lines.length*.42+.2+i*.26)+'s';c.classList.add('jh-deal-in');});
  });
 }
 return {show,close,get active(){return active;}};
}
// 白天发出的牌：从说话处飞入江湖录。
export function flyCard(card){
 const target=document.getElementById('codex-button');if(!target||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const el=document.createElement('div');el.className='jh-fly';el.textContent=CARDS[card.card]?.seal||'';document.body.append(el);
 const r=target.getBoundingClientRect(),x0=innerWidth/2,y0=innerHeight*.62;
 el.animate([{transform:`translate(${x0}px,${y0}px) scale(1)`,opacity:0},{transform:`translate(${x0}px,${y0-40}px) scale(1)`,opacity:1,offset:.25},{transform:`translate(${r.left+r.width/2}px,${r.top+r.height/2}px) scale(.35)`,opacity:.2}],{duration:420,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>el.remove();
}
