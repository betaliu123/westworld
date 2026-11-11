// UI fixtures only: separate localhost playtest save; interactions use production controls.
import {rememberFace,appearanceState,currentFace,appearanceView} from '../src/appearance.js';
import {resolveRestraint} from '../src/npc-restraints.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {recordDeed,applyAftermath} from '../src/event-deck.js';
export function mountAppearanceHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='appearance-qa';el.open=true;el.style.cssText='position:fixed;top:10px;left:10px;z-index:1500;background:#eee6d6;color:#302b25;font:14px serif;max-width:250px;padding:6px';el.innerHTML='<summary>乔装验收 · 独立存档</summary><nav></nav><output style="white-space:pre-wrap;display:block"></output>';document.body.append(el);
 let pinned=null,errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>id===pinned?true:steer(id,dt);
 function scene(id){const sim=getSim(),s=sim.s,n=s.people[id],actor=world.npcs.get(id).actor;world.dialogue.finish(true);environment.close();document.getElementById('drawer').hidden=true;s.time=35;s.wanted=0;s.complaint=null;s.facts.enteredCity=false;s.event=null;world.syncEvent();Object.assign(s.player,{hp:100,energy:100,stealing:false,crouched:false,x:-13,z:38});delete s.player.bedRest;world.hero.position.set(-13,0,38);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.keys.clear();world.clearReady();world.auto=null;world.quietUntil=0;
  Object.assign(n,{x:-13,z:35.5,hp:n.maxHp||100,fear:0,awareness:null,restraint:null,inCustody:false,drowning:false,stunnedUntil:0,muteUntil:0,life:{activity:'idle'}});actor.position.set(-13,0,35.5);actor.rotation.y=0;pinned=id;
  for(const p of ['gate_merchant','thief','gate_guard','mei']){rememberFace(s,p,p==='thief'?'通缉榜画像':'亲眼见过');s.people[p].metPlayer=true;}
  const eco=environment.eco;for(const [name,role,owner,color]of [['试穿罗裙','女装行客','mei',0x8f344d],['试穿差役服','差役','relay',0x334e60]])if(!eco.items('player').some(i=>i.name===name))eco.create(name,'clothing','player',{ownerId:owner,identityRole:role,color,discovered:true});for(let i=0;i<4;i++)eco.create('易容膏','cosmetic','player',{discovered:true});save();
 }
 function originalState(mode){
  scene('gate_merchant');const sim=getSim(),s=sim.s,n=s.people.gate_merchant,eco=environment.eco;
  if(mode==='bound'){
   const rope=eco.s.items.find(i=>i.lassoKit);if(rope){rope.location='player';rope.hp=30;}
   eco.positions.gate_merchant={x:-13,z:35.5};const rng=sim.rng;sim.rng=()=>0;resolveRestraint(sim,eco,'gate_merchant');sim.rng=rng;
  }else if(mode==='hurt')n.hp=Math.floor((n.maxHp||100)*.2);
  else if(mode==='dead')n.hp=0;
  save();
 }
 const actions=[['布置 · 盘问',()=>scene('gate_guard')],['布置 · 原主',()=>scene('gate_merchant')],['掷骰取 1',()=>getSim().rng=()=>0],['掷骰取 100',()=>getSim().rng=()=>.999],['留下目击并推演',()=>{const sim=getSim(),e={type:'theft',text:'目击乔装者取走钱袋',x:-13,z:38};witnessEvent(sim,'gate_guard',e,true,{x:-13,z:35.5});recordDeed(sim,'actionWitnessed',{...e,witnesses:['gate_guard']});applyAftermath(sim,null);sim.s.people.gate_guard.awareness=null;save();}],['收起验收',()=>el.open=false]];
 actions.push(['原主 · 绑住',()=>originalState('bound')],['原主 · 重伤',()=>originalState('hurt')],['原主 · 倒地',()=>originalState('dead')],['原主 · 恢复',()=>originalState('ready')]);
 actions.unshift(['布置 · 宝箱',()=>{scene('gate_guard');const s=getSim().s;rememberFace(s,'inn','亲眼见过');s.people.inn.metPlayer=false;s.people.inn.probed=false;Object.assign(s.player,{x:-11.3,z:22.8});world.hero.position.set(-11.3,0,22.8);world.yaw=Math.PI;world.pitch=.9;world.distance=4;const door=s.ecosystem?.objects?.['house:-10:21:door'];if(door)door.open=true;environment.openObject('linxi-wardrobe-chest');save();}]);
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinned){s.time=35;s.people[pinned].life={activity:'idle'};}const v=appearanceView(s);el.querySelector('output').textContent=`面貌 ${v.name} / ${v.role}\n事件 ${s.event?.gate?.phase||s.event?.type||'无'} / 入城 ${!!s.facts.enteredCity}\n面貌传闻 ${v.risk}\n原主 ${s.people.gate_merchant.restraint?.mode||'自由'} / 气血 ${s.people.gate_merchant.hp} / ${s.people.gate_merchant.maxHp||100}\n坐标 ${s.player.x.toFixed(1)},${s.player.z.toFixed(1)}\n${errors.slice(-2).join('\n')}`;},300);
}
