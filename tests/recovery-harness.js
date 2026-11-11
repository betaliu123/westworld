// Explicit localhost playtest; the ordinary player save is never opened.
import {CONVOY_TOWN,convoyState} from '../src/convoy.js';
import {convoyPosts,updateConvoyScene} from '../src/convoy-scene.js';

export function mountRecoveryHarness({getSim,world,environment,save}){
 const panel=document.createElement('aside');panel.id='recovery-qa';
 panel.style.cssText='position:fixed;top:80px;right:12px;z-index:1500;background:var(--paper);color:var(--ink);font:14px "Jianghu Body",KaiTi,serif;max-width:310px;padding:10px;';
 panel.innerHTML='<b>脱困验收 · 独立存档</b><nav></nav><output style="display:block;white-space:pre-wrap"></output>';
 document.body.append(panel);const errors=[];let frozen=false;
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 function place(id,x,z){const n=world.npcs.get(id);n.actor.position.set(x,0,z);Object.assign(getSim().s.people[id],{x,z});environment.eco.positions[id]={x,z};n.routeKey=null;n.route=[];n.stuckWatch={};n.recoveryCooldown=0;n.recoveryHomeUntil=0;}
 function fixture(old=false,hold=false){
  const sim=getSim(),s=sim.s;world.dialogue.finish(true);environment.close();s.event=null;s.time=35;s.wanted=0;s.facts.enteredCity=true;s.facts.convoyArrived=true;s.complaint=null;world.syncEvent();
  const c=convoyState(s);Object.assign(c,{x:0,z:old?-17.8:CONVOY_TOWN.z,phase:'town',heading:0,posts:{}});delete c.parkingRevision;delete c.reparking;
  const n=s.people.inspector;Object.assign(n,{hp:73,energy:42,awareness:null,fear:0,mood:'calm',stunnedUntil:0,sickUntil:0,nightWakeUntil:0,navigationRecoveries:0,life:{activity:'returnDay',night:true},nightExitPhase:'office'});delete n.inCustody;
  place('inspector',0,-21);world.npcs.get('inspector').actor.rotation.y=0;
  for(const [id,p]of Object.entries(convoyPosts(c))){Object.assign(s.people[id],{hp:100,awareness:null,fear:0,stunnedUntil:hold?(s.npcClock||0)+1000:0,sickUntil:0,life:{activity:'duty'}});place(id,p.x,p.z);}
  updateConvoyScene(world,environment.eco,0);
  world.hero.position.set(4.8,0,-18);Object.assign(s.player,{x:4.8,z:-18,hp:100});world.yaw=.5;world.pitch=.45;world.distance=9;world.keys.clear();world.auto=null;world.clearReady();world.playing=true;
  frozen=true;save();
 }
 const actions={
  '新停位 · 顾钦差出门':()=>fixture(),
  '旧停位 · 自动挪车':()=>fixture(true),
  '持续堵门 · 传送保底':()=>fixture(true,true),
  '解除押运人定身':()=>{for(const id of ['fu','porter'])getSim().s.people[id].stunnedUntil=0;},
  '推进十二秒':async()=>{
   if(world.locked||world.dialogue.active)return;
   const render=world.ink.render;world.ink.render=()=>{};
   try{for(let i=0;i<240;i++){getSim().s.time=35;getSim().tick(.05);world.update(.05);environment.update(.05,true);if(i%12===11)await new Promise(r=>setTimeout(r,0));}}
   finally{world.ink.render=render;save();}
  },
  '查看官府大堂':()=>{world.hero.position.set(10,0,-18.5);Object.assign(getSim().s.player,{x:10,z:-18.5});world.yaw=0;world.pitch=.35;world.distance=8;},
 };
 for(const [label,run]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await run();}finally{b.disabled=false;}};panel.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s,n=s.people.inspector,q=world.npcs.get('inspector'),c=s.convoy;if(frozen)s.time=35;
  panel.querySelector('output').textContent=`顾钦差 ${q.actor.position.x.toFixed(2)}, ${q.actor.position.z.toFixed(2)}\n日程 ${n.life?.activity} / 卡住 ${(q.stuckWatch?.elapsed||0).toFixed(1)} 秒\n传送 ${n.navigationRecoveries||0} 次 / 气血 ${n.hp}\n车 ${c?.z.toFixed(2)} / 挪车 ${!!c?.reparking}\n运行错误 ${errors.length}${errors.length?'\n'+errors.join('\n'):''}`;
 },250);
}
