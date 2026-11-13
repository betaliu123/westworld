import {recordCrimeScene,acceptCrimeReport} from '../src/crime-investigation.js';
import {equipAppearance,applyFace,rememberFace} from '../src/appearance.js';
// Local fixture controls only; use the real canvas, skill, NPC and inventory UI to act.
export function mountLassoHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='lasso-qa';el.open=true;
 el.style.cssText='position:fixed;top:70px;left:12px;z-index:1200;background:var(--paper);color:var(--ink-1);font:14px "Jianghu Body",KaiTi,serif;padding:6px;max-width:270px';
 el.innerHTML='<summary>套索验收 · 独立存档</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 let active=false,rolls=0;const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const originalSteer=world.ecology.steer;world.ecology.steer=(id,dt)=>active?true:originalSteer(id,dt);
 function stage(){
  const sim=getSim(),s=sim.s,p=s.player;world.dialogue.finish(true);environment.close();world.performance=null;world.checkReveal.cancel();world.keys.clear();world.auto=null;world.clearReady();
  s.event=null;s.complaint=null;delete s.investigations;s.facts.enteredCity=true;s.chapter.opened=true;s.time=35;s.wanted=0;delete s.facts.publicWarrant;world.syncEvent();
  for(const [id,n] of world.npcs){Object.assign(s.people[id],{hp:100,fear:0,awareness:null,restraint:null,stunnedUntil:0,inCustody:false,custodyDelivered:false,life:{activity:'idle'}});n.actor.position.set(50,0,50);}
  const rope=environment.eco.s.items.find(i=>i.lassoKit);rope.location='player';rope.hp=30;
  const n=s.people.thief,a=world.npcs.get('thief').actor;Object.assign(n,{x:0,z:2,facing:Math.PI});a.position.set(0,0,2);a.rotation.y=Math.PI;
  Object.assign(p,{x:0,z:5,hp:100,energy:100,crouched:false,stealing:false});world.hero.position.set(0,0,5);world.hero.rotation.y=Math.PI;world.yaw=.45;world.pitch=.32;world.distance=7;
  environment.eco.positions.thief={x:0,z:2,facing:Math.PI};sim.rng=()=>{rolls++;return 0;};rolls=0;active=true;save();
 }
 function wantedStage(watched,subject='thief'){
  stage();const sim=getSim(),s=sim.s,eco=environment.eco;s.player.face=null;delete s.law;
  if(subject!=='thief')s.law={warrants:[{id:'qa-assault',subject,status:'active',knownBy:['guard'],source:'独立验收案卷',charges:[{code:'assault',label:'伤人嫌疑',detail:'码头斗殴，伤者当面指认'}]}]};
  s.people[subject].metPlayer=true;rememberFace(s,subject);eco.create('易容膏','cosmetic','player',{material:'herb'});
  const guard=world.npcs.get('guard').actor;const place=()=>{guard.position.set(0,0,3);guard.rotation.y=0;Object.assign(s.people.guard,{x:0,z:3,facing:0});};
  if(watched)place();applyFace(sim,subject);place();
  // The generic investigation entry must yield to the wanted identity handler.
  const c=acceptCrimeReport(sim,{reporter:'tea',officer:'guard',place:{x:0,z:2},type:'body'});c.state='search';c.searchAt=s.npcClock;c.nextAsk=s.npcClock+1000;world.onInvestigation(c,'guard');
 }
 const actions={
  '布置抛索':stage,
  '定身现场':()=>{stage();getSim().s.people.thief.stunnedUntil=(getSim().s.npcClock||0)+120;const p=getSim().s.player;p.z=3.5;world.hero.position.z=3.5;},
  '事后报案':()=>{stage();const sim=getSim(),s=sim.s;for(const [id,x,z]of [['merchant',2,1],['guard',2,7]]){const a=world.npcs.get(id).actor;a.position.set(x,0,z);Object.assign(s.people[id],{x,z,facing:Math.PI,awareness:null,life:{activity:'idle'}});}recordCrimeScene(sim,{type:'theft',target:'thief',owner:'thief',x:0,z:2,witnesses:['merchant'],identities:{merchant:'player'}});},
  '无人目击倒地':()=>{stage();getSim().s.people.thief.hp=0;const a=world.npcs.get('guard').actor;a.position.set(1,0,3);a.rotation.y=Math.PI;},
  '盘查提示':()=>{stage();const sim=getSim(),s=sim.s,a=world.npcs.get('guard').actor;a.position.set(2,0,3);a.rotation.y=Math.PI;Object.assign(s.people.guard,{x:2,z:3});const c=acceptCrimeReport(sim,{reporter:'merchant',officer:'guard',place:{x:0,z:2},type:'body'});c.state='search';c.searchAt=s.npcClock;c.nextAsk=s.npcClock+1000;},
  '换装盘查':()=>{stage();const sim=getSim(),s=sim.s,eco=environment.eco;s.player.face=null;const old=eco.create('旧布衣','clothing','player',{material:'cloth',appearanceModel:'hero'});equipAppearance(sim,old.id,'body');const c=recordCrimeScene(sim,{type:'theft',target:'merchant',x:0,z:2,witnesses:['merchant'],identities:{merchant:'player'}});acceptCrimeReport(sim,{caseId:c.id,reporter:'merchant',officer:'guard'});const coat=eco.create('差役服','clothing','player',{material:'cloth'});equipAppearance(sim,coat.id,'body');const a=world.npcs.get('guard').actor;a.position.set(2,0,3);a.rotation.y=Math.PI;Object.assign(s.people.guard,{x:2,z:3});c.state='search';c.searchAt=s.npcClock;c.nextAsk=s.npcClock+1000;world.onInvestigation(c,'guard');},
  '再问本案':()=>{const c=getSim().s.investigations?.cases.find(c=>c.state==='search');if(c)world.onInvestigation(c,c.assigned);},
  '通缉面貌':()=>wantedStage(false),
  '当面易容':()=>wantedStage(true),
  '另一通缉案':()=>wantedStage(false,'merchant'),
  '延长盘查':()=>{const s=getSim().s,c=s.investigations?.cases.find(c=>c.state==='search');if(c)c.expires+=30;},
  '盘查剩余五秒':()=>{const s=getSim().s,c=s.investigations?.cases.find(c=>c.state==='search');if(c)c.expires=s.npcClock+5;},
  '靠近目标':()=>{const q=world.npcs.get('thief').actor.position,p=getSim().s.player;Object.assign(p,{x:q.x+.9,z:q.z+1.2});world.hero.position.set(p.x,0,p.z);},
  '必定落空':()=>{getSim().rng=()=>{rolls++;return .999;};},
  '出示榜文':()=>{getSim().s.facts.publicWarrant=true;},
  '收起验收':()=>{el.open=false;},
  '长对白':()=>world.dialogue.play([{id:'thief',text:'手脚都捆住了，我走不了。你若是来押我到官府，就把榜文拿来，看清姓名和案由；若只是要拿走我的外袍，今日这件事，我一样会记得。'}]),
  '保存现场':save,
  '隐藏验收':()=>{el.hidden=true;},
 };
 for(const [label,run] of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=run;el.querySelector('nav').append(b);}
 setInterval(()=>{
  const s=getSim().s,n=s.people.thief,q=world.npcs.get('thief').actor.position;if(active){s.time=35;s.deck.actions??={};}
  const invalid=[...document.querySelectorAll('#aim-skills button,#aim-points button')].filter(e=>!e.hidden&&e.getBoundingClientRect().width).filter(e=>{const c=getComputedStyle(e);return parseFloat(c.fontSize)<14||/Microsoft YaHei|Segoe|Georgia|sans-serif/.test(c.fontFamily);});
  el.querySelector('output').textContent=`${innerWidth}×${innerHeight}\n状态 ${n.restraint?.mode||'自由'} / 骰 ${rolls}\n人物 ${q.x.toFixed(2)},${q.z.toFixed(2)}\n主角 ${s.player.x.toFixed(2)},${s.player.z.toFixed(2)}\n体力 ${Math.round(s.player.energy)} / 绳 ${environment.eco.s.items.find(i=>i.lassoKit)?.location}\n调查 ${s.investigations?.cases.map(c=>c.state+':'+(c.assigned||'-')).join(',')||'-'}\n官差 ${s.people.guard.awareness?.state||'无追捕'} / ${world.npcs.get('guard').actor.position.z.toFixed(2)}\n拘押案由 ${s.facts.lastCustody?.charges?.map(c=>c.label).join('、')||'-'}\n错误 ${errors.length} / 字体违规 ${invalid.length}\n${errors.slice(-1).join('')}`;
 },150);
}
