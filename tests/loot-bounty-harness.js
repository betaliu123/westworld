import {recordCrimeScene,acceptCrimeReport} from '../src/crime-investigation.js';
import {publicWantedNotices,publishWantedNotices} from '../src/wanted-records.js';
import {bountyTargets} from '../src/bounty.js';

export function mountLootBountyHarness({getSim,world,environment,dialogue,save}){
 const el=document.createElement('details');el.id='loot-bounty-qa';el.open=true;el.style.cssText='position:fixed;top:65px;left:12px;z-index:1200;background:var(--paper);color:var(--ink-1);font:14px "Jianghu Body",KaiTi,serif;padding:6px;max-width:270px';
 el.innerHTML='<summary>搜刮与通缉验收 · 独立存档</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));let active=false,rolls=0;
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>active?true:steer(id,dt);
 const place=(id,x,z,facing=Math.PI)=>{const s=getSim().s;world.npcs.get(id).actor.position.set(x,0,z);world.npcs.get(id).actor.rotation.y=facing;Object.assign(s.people[id],{x,z,facing});environment.eco.positions[id]={x,z,facing};};
 function stage(){
  const sim=getSim(),s=sim.s,p=s.player;dialogue.finish(true);environment.close();document.getElementById('panel').hidden=true;world.performance=null;world.checkReveal.cancel();world.keys.clear();world.auto=null;world.clearReady();world.speaking=null;
  s.event=null;s.complaint=null;s.investigations=null;s.law=null;delete s.surrender;s.facts.enteredCity=true;s.chapter.opened=true;s.time=35;s.wanted=0;world.syncEvent();
  for(const [id,n] of world.npcs){Object.assign(s.people[id],{hp:100,fear:0,awareness:null,restraint:null,stunnedUntil:0,muteUntil:0,inCustody:false,custodyDelivered:false,life:{activity:'idle'}});place(id,50,50);n.actor.userData.fall=0;}
  const rope=environment.eco.s.items.find(i=>i.lassoKit);rope.location='player';rope.hp=30;
  Object.assign(p,{x:0,z:14,hp:100,energy:100,face:null,crouched:false,stealing:false});world.hero.position.set(0,0,14);world.hero.rotation.y=Math.PI;world.yaw=.25;world.pitch=.34;world.distance=6;
  place('gate_merchant',0,12.4,0);s.people.gate_merchant.restraint={mode:'fixed',ropeId:rope.id,reusable:true,anchor:{x:0,z:12.4}};
  sim.rng=()=>{rolls++;return 0;};rolls=0;active=true;save();
 }
 function board(subject='merchant'){
  stage();const sim=getSim(),s=sim.s;delete s.people.gate_merchant.restraint;place('gate_merchant',50,50);
  s.player.face=subject==='player'?null:{id:subject,serial:3,until:99999};
  const c=recordCrimeScene(sim,{type:'assault',target:'tea',x:1,z:14,witnesses:['tea'],identities:{tea:subject}});acceptCrimeReport(sim,{caseId:c.id,reporter:'tea',officer:'gate_guard'});s.npcClock+=21;publishWantedNotices(sim);c.state='closed';s.player.face=null;
  Object.assign(s.player,{x:3.3,z:31.7});world.hero.position.set(3.3,0,31.7);world.hero.rotation.y=Math.PI;world.yaw=0;world.distance=7;
  place('gate_guard',0,26,0);if(subject!=='player'){place(subject,2,31,0);const rope=environment.eco.s.items.find(i=>i.lassoKit);s.people[subject].restraint={mode:'lead',ropeId:rope.id,reusable:true,anchor:{x:2,z:31}};}
  save();
 }
 const actions={
  '捆住行商':stage,
  '濒死行商':()=>{stage();getSim().s.people.gate_merchant.hp=1;},
  '尸体与巡街官差':()=>{stage();const s=getSim().s;s.people.gate_merchant.hp=0;delete s.people.gate_merchant.restraint;place('guard',1,15.2,Math.PI);},
  '易容作恶后押原主到榜前':()=>board(),
  '主角通缉榜':()=>board('player'),
  '押至六扇门官差':()=>{board();place('gate_guard',50,50);place('inspector',4.5,31,Math.PI);},
  '关闭验收面板':()=>el.open=false,
 };
 for(const [label,run] of Object.entries(actions)){const button=document.createElement('button');button.textContent=label;button.onclick=run;el.querySelector('nav').append(button);}
 setInterval(()=>{if(!active)return;const s=getSim().s,n=s.people.gate_merchant,model=world.npcs.get('gate_merchant').model;
  const shown=[...document.querySelectorAll('button,p,b,small,span')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!el.contains(e));
  const invalid=shown.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14||/Microsoft YaHei|Segoe|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily));
  el.querySelector('output').textContent=JSON.stringify({hp:n.hp,clip:model.activeClip,rolls,money:s.player.money,held:bountyTargets(s),delivered:s.people.merchant.custodyDelivered,notices:publicWantedNotices(s).map(w=>[w.description?.name,w.status]),cases:s.investigations?.cases.map(c=>[c.type,c.state,c.assigned]),handover:s.law?.handover||null,errors,invalidFonts:invalid.map(e=>[e.tagName,e.textContent.slice(0,16)])},null,1);
 },500);
}
