// Explicit isolated playtest only. Never loaded in the normal game.
import {HOMES,bedFor,doorId,applyNight,roomAt,isSleeping} from '../src/night-life.js';
import {PEOPLE} from '../src/data.js';
export function mountNightHarness({getSim,world,environment,save}){
 const panel=document.createElement('details');panel.open=false;panel.id='night-test';
 panel.style.cssText='position:fixed;top:80px;right:12px;z-index:1000;background:var(--paper,#ece3cf);color:var(--ink,#15140f);font:14px "Jianghu Body",KaiTi,serif;max-width:320px;padding:8px;max-height:45vh;overflow:auto;';
 panel.innerHTML='<summary>夜间验收</summary><nav></nav><output style="white-space:pre-wrap"></output>';document.body.append(panel);
 let pinnedTime=null;
 function place(id,x,z){const n=world.npcs.get(id),s=getSim().s;n.actor.position.set(x,0,z);Object.assign(s.people[id],{x,z});delete n.routeKey;delete n.route;}
 const buttons={
  '夜街 · 自行归家':()=>{const sim=getSim(),s=sim.s;pinnedTime=s.time=170;s.event=null;s.facts.enteredCity=true;s.wanted=0;world.syncEvent();world.hero.position.set(0,0,10);Object.assign(s.player,{x:0,z:10,hp:100});for(const p of PEOPLE){const n=s.people[p.id];n.awareness=undefined;n.mood='calm';n.nightWakeUntil=0;n.nightAskedOut=false;n.nightPursuit=null;n.nightFleeUntil=0;n.life={activity:'idle'};place(p.id,p.x,p.z);}world.yaw=0;world.pitch=.35;world.distance=12;},
  '卧房 · 门外':()=>{const sim=getSim(),s=sim.s;pinnedTime=s.time=170;s.event=null;s.facts.enteredCity=true;s.wanted=0;world.syncEvent();const h=HOMES.find(h=>h.id==='bookshop'),b=bedFor('bookseller');place('bookseller',b.xTarget,b.zTarget);s.people.bookseller.nightWakeUntil=0;s.people.bookseller.nightAskedOut=false;s.people.bookseller.relation=0;s.people.bookseller.trust=0;applyNight(sim,'bookseller',s.people.bookseller);const o=environment.eco.s.objects[doorId(h)];o.open=false;delete o.autoCloseAt;world.hero.position.set(-12,0,6.3);Object.assign(s.player,{x:-12,z:6.3,hp:100,crouched:false,stealing:false});world.yaw=0;world.pitch=.3;world.distance=6.8;},
  '卧房 · 床边':()=>{buttons['卧房 · 门外']();world.hero.position.set(-12,0,3.4);Object.assign(getSim().s.player,{x:-12,z:3.4});environment.eco.s.objects['house:-12:3:door'].open=true;world.yaw=.55;world.pitch=.65;world.distance=5.5;},
  '绛云楼 · 归房':()=>{buttons['夜街 · 自行归家']();place('mei',22,9);const n=getSim().s.people.mei;n.nightConversation=false;world.hero.position.set(22,0,10.5);Object.assign(getSim().s.player,{x:22,z:10.5});world.yaw=.35;world.pitch=.55;world.distance=7;},
  '绛云楼 · 床边':()=>{world.hero.position.set(21,0,5.4);Object.assign(getSim().s.player,{x:21,z:5.4});world.yaw=.25;world.pitch=.8;world.distance=5.5;},
  '客栈 · 睡姿':()=>{buttons['夜街 · 自行归家']();const s=getSim().s;for(const id of ['merchant','chi','matchmaker']){const b=bedFor(id);place(id,b.xTarget,b.zTarget);applyNight(getSim(),id,s.people[id]);}world.hero.position.set(13,0,6.3);Object.assign(s.player,{x:13,z:6.3});world.yaw=.15;world.pitch=.85;world.distance=6;},
  '空床 · 无人':()=>{buttons['卧房 · 床边']();place('bookseller',-11,8.6);const n=getSim().s.people.bookseller;n.nightWakeUntil=getSim().s.npcClock+180;n.nightAskedOut=false;n.nightConversation=false;n.life={activity:'awake',target:{x:-11,z:8.6},night:true};delete getSim().s.player.bedRest;environment.openObject('bed:bookseller');},
  '空床 · 目击':()=>{buttons['空床 · 无人']();const n=getSim().s.people.bookseller;place('bookseller',-12.8,4.7);n.facing=Math.PI;world.npcs.get('bookseller').actor.rotation.y=Math.PI;n.life.target={x:-12.8,z:4.7};n.trust=10;},
  '卧房 · 近看':()=>{buttons['卧房 · 熟客']();world.hero.position.set(-12.8,0,3.6);Object.assign(getSim().s.player,{x:-12.8,z:3.6});world.yaw=.05;world.pitch=.95;world.distance=3.8;},
  '睡姿 · 面部':()=>{buttons['卧房 · 熟客']();world.hero.position.set(-12.4,0,1.8);Object.assign(getSim().s.player,{x:-12.4,z:1.8});world.yaw=Math.PI/2;world.pitch=.9;world.distance=2.8;},
  '出口 · 室内':()=>{buttons['卧房 · 床边']();world.hero.position.set(-12,0,4.1);Object.assign(getSim().s.player,{x:-12,z:4.1});world.yaw=Math.PI;world.pitch=.25;world.distance=3.8;},
  '天亮 · 出门':()=>{pinnedTime=getSim().s.time=4;},
  '卧房 · 熟客':()=>{buttons['卧房 · 床边']();const n=getSim().s.people.bookseller;n.trust=10;n.nightWakeCount={};},
  '推进 12 秒':async()=>{if(world.dialogue.active||world.locked)return;const render=world.ink.render;world.ink.render=()=>{};try{for(let i=0;i<240;i++){getSim().tick(.05);world.update(.05);environment.update(.05,true);if(pinnedTime!==null)getSim().s.time=pinnedTime;if(i%12===11)await new Promise(resolve=>setTimeout(resolve,0));}}finally{world.ink.render=render;}},
  '清屏':()=>panel.open=false,
 };
 for(const [label,run]of Object.entries(buttons)){const b=document.createElement('button');b.textContent=label;b.style.font='inherit';b.onclick=async()=>{if(!['清屏','推进 12 秒'].includes(label)){environment.close();delete getSim().s.player.bedRest;}b.disabled=true;try{await run();world.keys.clear();save();}finally{b.disabled=false;}};panel.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinnedTime!==null)s.time=pinnedTime;
  panel.querySelector('output').textContent=JSON.stringify({time:s.time,npcClock:s.npcClock,wakeUntil:s.people.bookseller.nightWakeUntil,conversation:world.nightConversationNpc,locked:world.locked,playerRest:s.player.bedRest,player:{x:+s.player.x.toFixed(2),z:+s.player.z.toFixed(2),energy:+s.player.energy.toFixed(1)},room:roomAt(s.player)?.name,lights:world.nightLightPool?.filter(l=>l.intensity>0).length,door:environment.eco.s.objects['house:-12:3:door']?.open,
   residents:Object.fromEntries(['bookseller','mei','merchant','chi','matchmaker','tea','relay'].map(id=>{const n=s.people[id],actor=world.npcs.get(id);return [id,{act:n.life?.activity,blocked:n.life?.target?world.collides(n.life.target.x,n.life.target.z,0,false):false,route:actor.route?.length,recover:n.navigationRecoveries,x:+actor.actor.position.x.toFixed(1),z:+actor.actor.position.z.toFixed(1),rigX:+actor.actor.userData.rig.rotation.x.toFixed(2),sleep:isSleeping(n)}];}))},null,1);
 },500);
}
