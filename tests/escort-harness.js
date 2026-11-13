import {resolveRestraint} from '../src/npc-restraints.js';
// Opt-in localhost QA fixture. All game actions still run through their production paths.
export function mountEscortHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='escort-qa';el.open=true;
 el.style.cssText='position:fixed;top:70px;left:12px;z-index:1200;background:var(--paper);color:var(--ink-1);font:14px "Jianghu Body",KaiTi,serif;padding:6px;max-width:300px';
 el.innerHTML='<summary>沿途目击 · 独立存档</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 const errors=[],lines=[];let active=false,chosen='inspector',freezeNext=false,paused=false;
 const update=world.update.bind(world);world.update=dt=>update(paused?0:dt);
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>active?true:steer(id,dt);
 const say=world.onActionCardSpeech;world.onActionCardSpeech=line=>{
  if(!line.escortKey)return say(line);
  const shown=line.onShown;return say({...line,onShown:()=>{if(shown?.()===false)return false;lines.push(line.id+'：'+line.text);if(freezeNext){freezeNext=false;setTimeout(()=>{paused=true;el.open=false;},500);}return true;}});
 };
 function place(id,x,z){const a=world.npcs.get(id).actor;a.position.set(x,0,z);a.rotation.y=Math.atan2(-x,4-z);Object.assign(getSim().s.people[id],{x,z,facing:a.rotation.y});environment.eco.positions[id]={x,z,facing:a.rotation.y};}
 function stage(kind){
  const sim=getSim(),s=sim.s,p=s.player;paused=false;world.dialogue.finish(true);environment.close();world.performance=null;world.checkReveal.cancel();world.keys.clear();world.auto=null;world.clearReady();world.nextEscortSpeech=0;lines.length=0;
  s.event=null;s.complaint=null;s.investigations={seq:0,cases:[],bodySeen:{}};s.territory={visits:{},next:99999};s.facts.enteredCity=true;s.chapter.opened=true;s.time=35;s.wanted=0;delete s.facts.publicWarrant;world.syncEvent();
  for(const [id,n]of world.npcs){Object.assign(s.people[id],{hp:100,fear:0,awareness:null,restraint:null,escortReaction:null,concern:null,stunnedUntil:0,muteUntil:0,drowning:false,burning:false,sickUntil:0,inCustody:false,custodyDelivered:false,life:{activity:'idle'}});n.actor.position.set(50,0,50);n.escortPath=null;n.escortSpeechUntil=0;environment.eco.positions[id]={x:50,z:50,facing:0};}
  const rope=environment.eco.s.items.find(i=>i.lassoKit);rope.location='player';rope.hp=30;
  chosen=kind==='lu'?'guard':kind==='lawful'?'thief':'inspector';place(chosen,0,2);Object.assign(p,{x:0,z:4,hp:100,energy:100,crouched:false,stealing:false,face:null});world.hero.position.set(0,0,4);world.hero.rotation.y=Math.PI;world.yaw=.65;world.pitch=.38;world.distance=8;
  if(kind==='lu'){place('old_constable',-2,7);place('shen',2,7);place('elder',-4,5);place('chi',3,4);place('merchant',4,7);}
  if(kind==='lawful')s.facts.publicWarrant=true;
  sim.rng=()=>0;resolveRestraint(sim,environment.eco,chosen,'catch');
  if(kind==='lu'){} // The original catch already has nearby witnesses; retain their real awareness.
  else if(kind==='guard'||kind==='lawful')place('guard',-2,7);
  else if(kind==='mock')place('chi',-2,7);
  else if(kind==='approach'){place('elder',-2,-7);place('chi',2,-7);}
  else {place('elder',-2,7);place('merchant',2,7);place('chi',3,5);}
  active=true;save();
 }
 const actions={
  '街坊围观':()=>stage('crowd'),'赤砂冷嘲':()=>stage('mock'),'官差拦阻':()=>stage('guard'),'合法押送':()=>stage('lawful'),'沿街走近':()=>stage('approach'),'套住陆捕头':()=>stage('lu'),'定格陆捕头':()=>{freezeNext=true;stage('lu');},
  '定格冷嘲':()=>{freezeNext=true;stage('mock');},'定格拦阻':()=>{freezeNext=true;stage('guard');},'继续演出':()=>{paused=false;},
  '松绑':()=>{const s=getSim().s,q=world.npcs.get(chosen).actor.position;Object.assign(s.player,{x:q.x+.8,z:q.z+.8});world.hero.position.set(s.player.x,0,s.player.z);resolveRestraint(getSim(),environment.eco,chosen,'release');},
  '保存现场':save,'长对白':()=>world.dialogue.play([{id:chosen,text:'有何案由，你可以当面问。我如今手上系着绳，街上的人看得清楚；各人如何看这件事，也不会只有一种说法。'}]),
  '收起验收':()=>{el.open=false;},'展开验收':()=>{el.open=true;}
 };
 for(const [label,run]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=run;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(active)s.time=35;el.querySelector('output').textContent=`${innerWidth}×${innerHeight}\n绳 ${s.people[chosen].restraint?.mode||'已松绑'} / 时 ${(s.npcClock||0).toFixed(1)} / 玩家 ${s.player.x.toFixed(1)},${s.player.z.toFixed(1)}\n`+['guard','old_constable','shen','chi','elder','merchant'].map(id=>{const n=s.people[id],q=world.npcs.get(id).actor.position;return `${id}: ${n.escortReaction?.kind||n.awareness?.state||'日常'} / ${q.x.toFixed(1)},${q.z.toFixed(1)} / 好感 ${n.relation}`;}).join('\n')+`\n错误 ${errors.length}\n`+lines.slice(-4).join('\n')+(errors.length?'\n'+errors.at(-1):'');},200);
}
