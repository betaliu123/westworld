// Localhost only. Fixtures use an isolated playtest save; response buttons are production UI.
import {startComplaint} from '../src/complaints.js';
import {rememberFace,applyFace} from '../src/appearance.js';
import {deckState} from '../src/event-deck.js';
import {factionStanding} from '../src/faction-discipline.js';
export function mountContextHarness({getSim,world,environment,disguiseEncounter,save}){
 const box=document.createElement('details');box.id='context-qa';box.open=true;
 box.style.cssText='position:fixed;top:8px;left:8px;z-index:1500;background:var(--paper);color:var(--ink);font:14px var(--font-body);max-width:240px;padding:6px';
 box.innerHTML='<summary>情境验收 · 独立存档</summary><nav></nav><output style="white-space:pre-wrap;display:block"></output>';document.body.append(box);
 const errors=[],pinned=new Set();let target='scribe',scenario='尚未布置';
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned.has(id)?true:steer(id,dt);
 function place(id,x,z){const s=getSim().s,n=s.people[id],actor=world.npcs.get(id).actor;
  Object.assign(n,{x,z,hp:100,fear:0,relation:0,trust:0,awareness:null,stunnedUntil:0,muteUntil:0,complaintUntil:0,life:{activity:'idle'}});delete n.inCustody;
  actor.position.set(x,0,z);actor.rotation.y=0;pinned.add(id);
 }
 function scene(id='scribe'){
  const sim=getSim(),s=sim.s;world.dialogue.finish(true);environment.close();pinned.clear();target=id;for(const n of Object.values(s.people)){n.awareness=null;n.fear=0;}
  document.getElementById('drawer').hidden=true;s.time=35;s.event=null;s.wanted=0;s.complaint=null;s.facts.enteredCity=false;world.syncEvent();
  Object.assign(s.player,{hp:100,energy:100,satiety:100,money:60,crouched:false,stealing:false,face:null,x:-13,z:37.2});delete s.player.bedRest;
  world.hero.position.set(-13,0,37.2);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.keys.clear();world.auto=null;world.clearReady();world.quietUntil=0;
  place(id,-13,35.6);sim.rng=()=>0;deckState(s).echoes=[];return {sim,s,eco:environment.eco};
 }
 function complaint(mode){const {sim,s,eco}=scene();scenario=mode;
  if(mode==='气血低')s.player.hp=20;
  if(mode==='易容'){rememberFace(s,'gate_merchant');s.people.gate_merchant.metPlayer=true;applyFace(sim,'gate_merchant');}
  if(mode==='六扇门'){s.facts.career='court';if(!eco.items('player').some(i=>i.badge==='court'))eco.create('捕快腰牌','personal','player',{badge:'court'});place('inspector',-13,40.5);}
  s.people.scribe.awareness={home:{x:-13,z:35.6},lastKnown:{x:-13,z:37.2},until:(s.npcClock||0)+30,caseOpen:true,state:'warn'};
  let item;if(mode==='归还原物'){item=eco.create('刻字人的纸包','personal','npc:scribe',{ownerId:'scribe'});eco.transfer(item,'player','stolen',['scribe']);}
  startComplaint(sim,{type:'theft',owner:'scribe',target:'scribe',witnesses:['scribe'],itemId:item?.id,transferred:!!item,x:-13,z:37.2});
  s.complaint.phase='ask';sim.emit('complaintAsk',s.complaint);save();
 }
 const actions=[...['气血低','易容','六扇门','归还原物'].map(mode=>['问责·'+mode,()=>complaint(mode)]),
  ['余波·共同熟人',()=>{const {s}=scene('qinghe');scenario='共同熟人';s.facts.helpedMother=true;Object.assign(s.people.tea_host,{metPlayer:true,trust:10,relation:10});const d=deckState(s);d.echoes=[{id:++d.seq,cause:91001,subject:'player',who:'qinghe',teller:'tea_host',template:'rumor_spread',channel:'talk',due:s.day,day:s.day,title:'先前的事',causeTitle:'伸手取物',line:'我听说你先前伸手拿过旁人的东西，想听你说清楚。',delivered:true}];save();}],
  ['盘问·气血低',()=>{const {sim,s}=scene('gate_guard');scenario='盘问';s.player.hp=20;rememberFace(s,'gate_merchant');s.people.gate_merchant.metPlayer=true;applyFace(sim,'gate_merchant');disguiseEncounter.intercept('gate_guard',true);save();}],
  ['走近负责人',()=>{world.dialogue.finish(true);const q=world.npcs.get('inspector').actor.position;Object.assign(getSim().s.player,{x:q.x,z:q.z+2});world.hero.position.set(q.x,0,q.z+2);world.quietUntil=0;}],
  ['探索清屏',()=>{scene();scenario='探索';pinned.clear();}],['收起验收',()=>box.open=false]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;box.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;for(const id of pinned){s.people[id].life={activity:'idle'};}s.time=35;
  box.querySelector('output').textContent=`场景 ${scenario}\n问责 ${s.complaint?.phase||'无'} / 身份 ${s.complaint?.subject||'无'}\n报告 ${(s.factionDiscipline?.reports||[]).map(r=>r.status).join(',')||'无'} / 纪律 ${factionStanding(s,'court').label}\n报信位置 ${world.npcs.get('scribe').actor.position.x.toFixed(1)},${world.npcs.get('scribe').actor.position.z.toFixed(1)} / ${s.people.scribe.awareness?.state||'idle'}\n负责人 ${world.npcs.get('inspector').actor.position.x.toFixed(1)},${world.npcs.get('inspector').actor.position.z.toFixed(1)} / ${s.people.inspector.awareness?.state||'idle'}\n对象 ${target} / 好感 ${s.people[target]?.relation}\n回应 ${s.deck?.echoes?.find(e=>e.cause===91001)?.response?.answer||'无'}\n错误 ${errors.length}${errors.length?' / '+errors.at(-1):''}`;
 },200);
}
