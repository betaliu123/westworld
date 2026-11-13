export function mountCaptureHarness({getSim,world,environment,dialogue,save}){
 const bar=document.createElement('div'),report=document.createElement('pre'),errors=[],phases=[];
 bar.style.cssText='position:fixed;top:4px;left:4px;z-index:1002;display:flex;gap:4px;font:14px var(--font-body)';
 report.style.cssText='position:fixed;top:48px;left:4px;max-height:70vh;overflow:auto;z-index:1003;background:var(--paper);color:var(--ink-1);font:14px var(--font-body)';report.hidden=true;
 let stop=null,paused=false,lastPhase=null,officer='gate_guard';
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>{fn();b.blur();};bar.append(b);};
 const original=world.update.bind(world);world.update=dt=>{if(paused)return;original(dt);const phase=world.captureShot?.phase;if(phase&&phase!==lastPhase){phases.push({phase,hp:getSim().s.player.hp,charm:getSim().s.player.stats.charm});lastPhase=phase;}if(phase===stop&&world.captureShot.age>=(phase==='down'?1.4:.65))paused=true;};
 world.ecology.steer=()=>true;
 function fixture(target='gate_guard'){
  officer=target;paused=false;dialogue.finish(true);environment.close();report.hidden=true;phases.length=0;lastPhase=null;
  const sim=getSim(),s=sim.s;Object.assign(s,{event:null,pending:null,wanted:0,complaint:null,surrender:null,investigations:{seq:0,cases:[],bodySeen:{}}});delete s.capture;delete s.facts.lastCustody;
  s.chapter.opened=true;s.facts.enteredCity=true;s.deck.actions={nextAt:(s.npcClock||0)+999};s.deck.echoes=[];s.time=35;
  world.captureShot=null;world.onCaptureFade?.(0);world.performance=null;world.keys.clear();world.auto=null;world.clearReady();world.heroVel.set(0,0,0);world.heroModel.motion.reset();
  Object.assign(s.player,{x:0,z:14,hp:1,energy:100,satiety:100,rested:100,crouched:false,stealing:false,face:null,bedRest:null});
  world.hero.position.set(0,0,14);world.hero.rotation.y=Math.PI;world.yaw=.3;world.pitch=.5;world.distance=6;world.syncEvent();
  let i=0;for(const [id,n]of world.npcs){const st=s.people[id];Object.assign(st,{hp:st.maxHp||100,awareness:null,fear:0,mood:'calm',stunnedUntil:0,restraint:null,inCustody:false,drowning:false,life:{activity:'idle'}});n.actor.position.set(-42+i++*.4,0,-42);n.actor.visible=false;n.nextHit=0;n.reactionPath=null;n.combat?.cancel();}
  const n=world.npcs.get(target);n.actor.visible=true;n.actor.position.set(0,0,12.2);n.actor.rotation.y=0;
  s.people[target].awareness={state:'fight',suspect:'player',caseOpen:true,lastKnown:{x:0,z:14},believedIdentity:'player'};
  environment.eco.positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));save();
 }
 window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 button('守卫击倒',()=>{stop=null;fixture();});button('捕快击倒',()=>{stop=null;fixture('guard');});
 button('伏地停帧',()=>{stop='down';fixture(officer);});button('俯身停帧',()=>{stop='secure';fixture(officer);});button('押送停帧',()=>{stop='escort';fixture(officer);});button('继续',()=>{stop=null;paused=false;});
 button('报告',()=>{const s=getSim().s;report.hidden=!report.hidden;report.textContent=JSON.stringify({phases,errors,hp:s.player.hp,gate:s.event?.gate?.phase,capture:s.capture,shot:world.captureShot?.phase,clip:world.npcs.get(officer).model.activeClip,custody:s.facts.lastCustody},null,2);});
 document.body.append(bar,report);
}
