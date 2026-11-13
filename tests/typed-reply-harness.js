import {rememberFace,applyFace} from '../src/appearance.js';
// Only loaded on localhost under an independent playtest save.
export function mountTypedReplyHarness({getSim,world,environment,disguiseEncounter,wantedEncounter,save}){
 const box=document.createElement('details');box.id='typed-reply-qa';box.open=true;box.style.cssText='position:fixed;left:8px;top:8px;z-index:1500;background:var(--paper);color:var(--ink-1);font:14px var(--font-body);padding:6px;max-width:200px';
 box.innerHTML='<summary>打字辩解 · 独立试玩</summary><nav></nav><output style="white-space:pre-wrap"></output>';document.body.append(box);
 let pinned=null;const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>id===pinned?true:steer(id,dt);
 function fixture(mode){
  world.dialogue.finish(true);environment.close();world.keys.clear();world.auto=null;world.clearReady();
  const sim=getSim(),s=sim.s;for(const n of Object.values(s.people)){n.awareness=null;n.fear=0;}s.time=35;s.event=null;s.wanted=0;s.complaint=null;
  s.law??={};s.law.interviews={};s.appearance.checks={};s.appearance.exposed={};s.appearance.observedChanges={};
  const face=mode==='通缉'?'thief':'gate_merchant';pinned=mode==='原主'?'gate_merchant':mode==='通缉'?'guard':'gate_guard';
  Object.assign(s.player,{hp:mode==='示弱'?20:100,energy:100,satiety:100,face:null,x:-13,z:37.2});
  s.people[face].metPlayer=true;rememberFace(s,face);environment.eco.create('易容膏','cosmetic','player');
  world.hero.position.set(-13,0,37.2);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.syncEvent();
  applyFace(sim,face);s.appearance.exposed={};s.appearance.observedChanges={};
  const n=s.people[pinned],actor=world.npcs.get(pinned).actor;Object.assign(n,{hp:100,restraint:null,inCustody:false,stunnedUntil:0,muteUntil:0,drowning:false,life:{activity:'idle'},x:-13,z:35.6});actor.visible=true;actor.position.set(-13,0,35.6);actor.rotation.y=0;
  if(mode==='通缉')wantedEncounter.intercept(pinned,true);else disguiseEncounter.intercept(pinned,true);save();
 }
 const actions=[...['身份','示弱','原主','通缉'].map(mode=>[mode+'盘问',()=>fixture(mode)]),['让对方失声',()=>{getSim().s.people[pinned].muteUntil=(getSim().s.npcClock||0)+999;}],['探索清屏',()=>{world.dialogue.finish(true);environment.close();getSim().s.player.face=null;world.hero.position.set(-13,0,44);pinned=null;box.open=false;}],['收起验收',()=>box.open=false]];
 for(const [label,run]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=run;box.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinned)s.people[pinned].life={activity:'idle'};box.querySelector('output').textContent=`\n身份 ${s.player.face?.id||'player'}\n气血 ${Math.round(s.player.hp)}\n盘问记录 ${Object.keys(s.appearance?.checks||{}).length}\n通缉回应 ${Object.keys(s.law?.interviews||{}).length}\n错误 ${errors.length}${errors.length?' '+errors.at(-1):''}`;},250);
}
