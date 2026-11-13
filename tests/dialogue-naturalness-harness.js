// Explicit localhost playtest, isolated by the production playtest save key.
// Buttons prepare fixtures; dialogue choices and their consequences use the real UI.
import {chapterOptions} from '../src/chapter.js';
import {THOUGHTS} from '../src/situational-thoughts.js';
export function mountDialogueNaturalnessHarness({getSim,world,environment,dialogue,showTalkChoices}){
 const box=document.createElement('details');box.id='naturalness-qa';box.open=true;
 box.style.cssText='position:relative;pointer-events:auto;background:var(--paper);color:var(--ink-1);font:14px/1.7 var(--font-body);padding:8px;max-width:300px';
 box.innerHTML='<summary>对白改稿验收</summary><nav></nav><output style="white-space:pre-wrap"></output>';
 document.getElementById('hud-left-stack').append(box);
 let pinned=null;const errors=[];
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>id===pinned?true:steer(id,dt);
 function prepare(id,key){
  dialogue.finish(true);environment.close();world.keys.clear();world.auto=null;world.clearReady();
  const s=getSim().s;pinned=id;s.event=null;s.wanted=0;s.complaint=null;s.time=35;
  Object.assign(s.player,{hp:100,energy:100,satiety:100,crouched:false,stealing:false,x:-7,z:27});
  s.player.face=null;s.player.bedRest=false;s.chapter.done={};
  world.hero.position.set(-7,0,27);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;
  const n=s.people[id],a=world.npcs.get(id).actor;
  Object.assign(n,{hp:100,metPlayer:true,x:-7,z:25,awareness:null,fear:0,stunnedUntil:0,muteUntil:0,restraint:null,life:{activity:'idle'}});
  a.position.set(-7,0,25);a.rotation.y=0;a.visible=true;environment.eco.positions[id]=a.position;
  if(key==='royal_offer')Object.assign(s.facts,{royalSawKindness:true,royalSawHarm:false,enteredCity:false,royalKindnessSource:'tea'});
  if(key==='gate_no_papers')s.chapter.done.gate_rules=true;
  if(key==='herb_offer')s.player.skills.medicine={tier:2,xp:0};
  const option=chapterOptions(getSim(),id).find(a=>a.id==='ch_'+key);
  if(!option)throw Error('Missing QA option '+key);
  box.open=false;showTalkChoices(id,[option]);
 }
 const cases=[['衣裳报价','relay','clothes_price'],['进关问责','gate_guard','gate_no_papers'],['锦衣客担保','traveler','royal_offer'],['青禾心愿','qinghe','qinghe_wish'],['药案借用','tea','herb_offer']];
 for(const [label,id,key]of cases){const b=document.createElement('button');b.textContent=label;b.onclick=()=>prepare(id,key);box.querySelector('nav').append(b);}
 const exit=document.createElement('button');exit.textContent='探索清屏';exit.onclick=()=>{dialogue.finish(true);environment.close();pinned=null;box.hidden=true;};box.querySelector('nav').append(exit);
 setInterval(()=>{
  const s=getSim().s;if(pinned){s.time=35;s.people[pinned].life={activity:'idle'};}
  const el=document.getElementById('dialogue-stage'),active=!el.hidden;
  const visible=e=>e.getClientRects().length&&!e.closest('[hidden]');
  const text=active?[...el.querySelectorAll('*')].filter(e=>visible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())):[];
  box.querySelector('output').textContent=JSON.stringify({money:s.player.money,dialogue:active,small:text.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14).length,badFonts:text.filter(e=>/微软雅黑|Microsoft YaHei|Segoe|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily)).length,overflow:text.filter(e=>e.scrollWidth>e.clientWidth+1).length,lapel:THOUGHTS.lapel,errors});
 },250);
}
