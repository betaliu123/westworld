import {rememberFace,applyFace,equipAppearance,currentFace} from '../src/appearance.js';
import {newArrival} from '../src/simulation.js';

// Explicit local fixtures. This harness is loaded only with its own save scope.
export function mountFuHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.open=true;el.id='fu-qa';
 el.style.cssText='position:fixed;top:8px;right:8px;z-index:1500;background:var(--paper);color:var(--ink);font:14px serif;max-width:270px;padding:8px';
 el.innerHTML='<summary>符祥易容 · 独立验收</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 let pinned=new Set(),follow=false;const errors=[];
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned.has(id)?true:steer(id,dt);
 function person(id,x,z){const s=getSim().s,n=s.people[id],actor=world.npcs.get(id).actor;
  Object.assign(n,{x,z,hp:100,stunnedUntil:0,muteUntil:0,sickUntil:0,awareness:null,restraint:null,inCustody:false,life:{activity:'idle'}});
  actor.position.set(x,0,z);actor.rotation.y=0;environment.eco.positions[id]={x,z,facing:0};
 }
 function player(x,z){const s=getSim().s;Object.assign(s.player,{x,z,hp:100,energy:100,crouched:false,stealing:false});world.hero.position.set(x,0,z);world.keys.clear();world.auto=null;world.yaw=0;world.pitch=.35;world.distance=7;}
 function fixture(original=false,mismatch=false){const sim=getSim(),s=sim.s,eco=environment.eco;
  world.dialogue.finish(true);world.checkReveal.cancel();environment.close();document.getElementById('drawer').hidden=true;document.getElementById('panel').hidden=true;
  s.time=35;s.wanted=0;s.complaint=null;s.identityFavors={};s.appearance.checks={};s.appearance.exposed={};s.appearance.rumors={};s.facts.enteredCity=false;s.event=newArrival().event;(s.chapter??={done:{}}).opened=true;sim.rng=()=>0;
  follow=false;pinned=new Set(original?['fu','porter']:['fu']);person('fu',original?-13:20,original?29:31);person('porter',original?18:-13,original?32:29);
  player(-13,31);s.people.fu.metPlayer=true;rememberFace(s,'fu');applyFace(sim,'player');eco.create('易容膏','cosmetic','player',{discovered:true});applyFace(sim,'fu');
  const shirt=eco.create(mismatch?'验收差役服':'验收管事外袍','clothing','player',{ownerId:mismatch?'relay':'fu',identityRole:mismatch?'差役':'应奉局管事',discovered:true});equipAppearance(sim,shirt.id,'body');
  s.people.porter.purse=20;s.player.money=12;world.clearReady();world.quietUntil=0;world.syncEvent();save();
 }
 const actions=[['布置 · 原主',()=>fixture(true)],['布置 · 周大石',()=>fixture()],['布置 · 差役服盘问',()=>fixture(false,true)],['掷骰取 100',()=>getSim().rng=()=>.999],['收起继续探索',()=>{el.open=false;}],['到周大石身旁',()=>{const p=world.npcs.get('porter').actor.position;player(p.x,p.z+1.5);world.onNpcSelected('porter');world.onGateTalk('porter');}],['卸妆',()=>applyFace(getSim(),'player')],['收起验收',()=>el.open=false]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;s.time=35;const q=world.npcs.get('porter').actor.position;
  const pile=s.ecosystem.items.filter(i=>i.type==='coins'&&i.reason==='周大石借给符祥的六文');
  el.querySelector('output').textContent=`${innerWidth}×${innerHeight} / ${errors.length} 错误\n面貌 ${currentFace(s)} / 玩家 ${s.player.money}文 / 周 ${s.people.porter.purse}文\n钱堆 ${pile.map(i=>i.location).join(',')||'无'}\n发车 ${s.convoy?.phase||'未开始'} / 入城 ${!!s.facts.enteredCity}\n周 ${q.x.toFixed(1)},${q.z.toFixed(1)} / ${s.people.porter.life?.activity}\n${errors.slice(-2).join('\n')}`;
 },300);
}
