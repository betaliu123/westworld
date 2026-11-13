export function mountCombatSurrenderHarness({getSim,world,environment,dialogue,save}){
 const events=[],errors=[];getSim().listeners.push((type,data)=>{if(['complaintAsk','complaintResult','worldIncident','entry'].includes(type))events.push({type,id:data?.id,kind:data?.type});});
 window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 // Fixture-only schedule isolation. Combat, hit detection and surrender run unchanged.
 world.ecology.steer=()=>true;
 const bar=document.createElement('div');bar.id='combat-qa';bar.style.cssText='position:fixed;top:8px;left:8px;z-index:10001;display:flex;gap:4px;max-width:94vw;flex-wrap:wrap;font:14px var(--font-body)';
 const report=document.createElement('pre');report.id='combat-qa-report';report.hidden=true;report.style.cssText='position:fixed;top:55px;left:8px;max-width:94vw;max-height:70vh;overflow:auto;z-index:10002;background:var(--paper);color:var(--ink-1);font:14px var(--font-body);white-space:pre-wrap';
 const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='font:14px var(--font-body);padding:4px;background:var(--paper);color:var(--ink-1)';b.onclick=()=>{fn();b.blur();};bar.append(b);};
 function fixture(kind){
  dialogue.finish(true);environment.close();document.getElementById('drawer').hidden=true;document.getElementById('panel').hidden=true;report.hidden=true;
  const sim=getSim(),s=sim.s;Object.assign(s,{event:null,pending:null,wanted:0,complaint:null,surrender:null,investigations:{seq:0,cases:[],bodySeen:{}}});
  s.chapter.opened=true;s.facts.enteredCity=true;s.deck.actions={nextAt:(s.npcClock||0)+999};s.deck.echoes=[];s.time=35;
  world.performance=null;world.keys.clear();world.auto=null;world.clearReady();world.heroVel?.set(0,0,0);
  Object.assign(s.player,{x:0,z:14,hp:100,energy:100,money:100,satiety:100,rested:100,crouched:false,stealing:false,face:null,bedRest:null});
  world.hero.position.set(0,0,14);world.hero.rotation.y=Math.PI;world.yaw=.3;world.pitch=.5;world.distance=6;world.syncEvent();
  let i=0;for(const [id,n]of world.npcs){const st=s.people[id];Object.assign(st,{hp:st.maxHp||100,awareness:null,fear:0,mood:'calm',stunnedUntil:0,muteUntil:0,restraint:null,inCustody:false,drowning:false,life:{activity:'idle'}});n.actor.position.set(-42+i++*.4,0,-42);n.actor.visible=false;n.nextHit=0;n.reactionPath=null;n.surrenderPath=null;}
  const target=kind==='civilian'?'gao':kind==='officer'?'gate_guard':'shen',ids=kind==='explore'?[]:[target,'tea_host'];
  ids.forEach((id,i)=>{const n=world.npcs.get(id);n.actor.visible=true;n.actor.position.set(i*2,0,12.1);n.actor.rotation.y=0;});
  if(kind==='civilian'){const officer=world.npcs.get('gate_relief');officer.actor.visible=true;officer.actor.position.set(10,0,4);officer.actor.rotation.y=Math.PI;}
  environment.eco.positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));events.length=0;save();
 }
 function snapshot(){const s=getSim().s;return {hp:s.player.hp,energy:s.player.energy,gate:s.event?.gate?.phase,cases:s.investigations.cases.map(c=>({id:c.id,state:c.state,assigned:c.assigned,reports:c.reports})),complaint:s.complaint&&{id:s.complaint.id,phase:s.complaint.phase,paid:s.complaint.paid,cause:s.complaint.cause},surrender:s.surrender,dialogue:dialogue.active,ready:world.combatReady,people:Object.fromEntries(['shen','gao','tea_host','gate_guard','gate_relief'].map(id=>{const n=world.npcs.get(id),st=s.people[id];return [id,{hp:st.hp,state:st.awareness?.state,clip:n.model?.activeClip,swing:n.combat?.swing?.age,x:n.actor.position.x,z:n.actor.position.z}];})),events,errors};}
 add('武者现场',()=>fixture('fighter'));add('平民现场',()=>fixture('civilian'));add('官差现场',()=>fixture('officer'));add('探索清屏',()=>fixture('explore'));add('验收报告',()=>{report.hidden=!report.hidden;report.textContent=JSON.stringify(snapshot(),null,2);});add('收起验收',()=>bar.hidden=true);
 document.body.append(bar,report);window.combatQA={snapshot};
}
