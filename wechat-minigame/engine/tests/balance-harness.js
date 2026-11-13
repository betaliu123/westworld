import {touchPreview} from '../src/npc-actions.js';
import {probePreview} from '../src/npc-discovery.js';
// Fixture controls only stage a local isolated world. Actions use normal game UI.
export function mountBalanceHarness({getSim,world,environment,objects,save}){
 const el=document.createElement('details');el.id='balance-qa';el.open=true;
 el.style.cssText='position:fixed;top:80px;left:16px;z-index:1000;background:var(--paper);color:var(--ink);padding:8px;max-width:300px;font:14px "Jianghu Body",KaiTi,serif';
 el.innerHTML='<summary>数值验收 · 独立存档</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 let held=false,rolls=0,last=null;
 let listening=null;const capture=(t,r)=>{if((t==='fieldCheck'||t==='result')&&r.roll!=null)last={action:r.label,chance:r.check.chance,roll:r.roll,success:r.success};};
 function stage(){
  const sim=getSim(),s=sim.s,p=s.player,n=s.people.su;held=true;rolls=0;last=null;if(listening!==sim){sim.listeners.push(capture);listening=sim;}s.time=35;s.event=null;s.facts.enteredCity=true;s.wanted=0;s.chapter.opened=true;
  Object.assign(p,{x:0,z:3.4,hp:100,energy:100,stealing:true,crouched:true});Object.assign(p.stats,{might:50,agility:60,charm:40,wit:50});
  for(const id of ['theft','pressure','insight'])p.skills[id]={tier:1,xp:0};p.skillClaims={};
  Object.assign(n,{hp:60,stunnedUntil:0,muteUntil:0,purse:16,theftAlertDay:0,awareness:null,life:{activity:'idle'},facing:Math.PI,probed:false,probedTier:0,probeRetryAt:0,eatingUntil:0,drinkingUntil:0});
  environment.eco.reserved=new Set(['su']);world.hero.position.set(p.x,0,p.z);world.yaw=0;world.pitch=.45;world.distance=6;world.syncEvent();
  sim.rng=()=>{rolls++;return .49;};environment.close();objects.cancel();save();
 }
 const actions={
  '重置粗通':stage,
  '打开随身行囊':()=>objects.openTheft('su'),
  '全技艺入门':()=>{for(const id of ['theft','pressure','insight'])getSim().s.player.skills[id]={tier:2,xp:0};save();},
  '隔空五米':()=>{getSim().s.player.skills.pressure={tier:4,xp:0};getSim().s.player.z=7;world.hero.position.z=7;},
  '正在吃食':()=>{getSim().s.people.su.eatingUntil=environment.eco.s.time+120;},
  '警觉':()=>{getSim().s.people.su.awareness={state:'warn'};},
  '外露物品':()=>{if(!environment.eco.items('npc:su').some(i=>i.name==='随身干粮'))environment.eco.create('随身干粮','food','npc:su');objects.openTheft('su');},
  '清屏':()=>{objects.cancel();environment.close();el.open=false;},
 };
 for(const [label,run]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=run;el.querySelector('nav').append(b);}
 setInterval(()=>{const sim=getSim(),s=sim.s;if(held){s.time=35;const n=world.npcs.get('su');n.actor.position.set(0,0,2);n.actor.rotation.y=Math.PI;n.route=null;Object.assign(s.people.su,{x:0,z:2,facing:Math.PI});environment.eco.positions.su={x:0,z:2};}
  const a=world.npcs.get('su').actor.position.clone();a.y=1;const screen=world.screenPoint(a);
  el.querySelector('output').textContent=JSON.stringify({stats:s.player.stats,theft:environment.eco.theftPreview('su').chance,pressure:touchPreview(sim,'su').chance,probe:probePreview(sim,'su').chance,rolls,last,purse:s.people.su.purse,aim:{x:Math.round(screen.x),y:Math.round(screen.y)}},null,1);
 },100);
}
