import {COURT_CHEST} from '../src/identity-opportunities.js';
import {WARDROBE_CHEST} from '../src/home-chest.js';
import {appearanceState,rememberFace,applyFace} from '../src/appearance.js';
export function mountPropertyHarness({getSim,world,environment,disguiseEncounter,save}){
 const events=[];getSim().listeners.push((type,data)=>{if(['sandbox','worldIncident','fieldCheck','propertyChallenge'].includes(type))events.push({type,data});});
 // Only fixtures pause ordinary schedules; the production refusal/complaint motion remains live.
 world.ecology.steer=()=>true;disguiseEncounter.update=()=>{};
 function fixture(kind='court',mask=null){
  const sim=getSim(),s=sim.s,eco=environment.eco,id=kind==='bundle'?WARDROBE_CHEST:COURT_CHEST,o=eco.s.objects[id];
  world.dialogue.finish(true);world.checkReveal.cancel();environment.close();document.getElementById('drawer').hidden=true;document.getElementById('panel').hidden=true;
  s.event=null;s.chapter.opened=true;s.time=35;s.wanted=0;s.complaint=null;s.facts.enteredCity=true;s.deck.actions={nextAt:(s.npcClock||0)+999};world.performance=null;world.keys.clear();world.auto=null;world.clearReady();
  for(const [id,n]of world.npcs){const st=s.people[id];st.awareness=null;st.propertyStop=null;st.life={activity:'idle'};st.fear=0;st.hp=st.maxHp||100;st.stunnedUntil=0;st.restraint=null;st.inCustody=false;}
  Object.assign(s.player,{x:o.x,z:o.z+1.5,hp:s.player.maxHp||100,energy:100,satiety:100,rested:100,crouched:false,stealing:false,face:null});world.hero.position.set(s.player.x,0,s.player.z);world.hero.rotation.y=Math.PI;
  const owner=world.npcs.get(o.owner),at=kind==='bundle'?{x:-11.9,z:27}:{x:10.6,z:-24.1};owner.actor.position.set(at.x,0,at.z);owner.actor.rotation.y=Math.atan2(s.player.x-at.x,s.player.z-at.z);
  eco.positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));
  world.yaw=kind==='bundle'?.6:-.5;world.pitch=.45;world.distance=kind==='bundle'?5.8:5.4;world.syncEvent();o.open=false;events.length=0;sim.rng=()=>0;
  const ap=appearanceState(s);ap.exposed={};ap.checks={};ap.rumors={};ap.observedChanges={};
  if(mask){s.people[mask].metPlayer=true;rememberFace(s,mask);eco.create('易容膏','cosmetic','player');applyFace(sim,mask);ap.exposed={};ap.observedChanges={};}
  save();return id;
 }
 window.propertyQA={fixture,getSim,world,environment,events,open:id=>environment.openObject(id),away(){const o=environment.eco.s.objects[COURT_CHEST],n=world.npcs.get('inspector');n.actor.position.set(o.x,0,o.z-1.5);n.actor.rotation.y=Math.PI;environment.eco.positions.inspector={x:o.x,z:o.z-1.5,facing:Math.PI};},report(){const s=getSim().s;return {items:s.ecosystem.items.filter(i=>i.sourceContainer).map(i=>({id:i.id,name:i.name,location:i.location,provenance:i.provenance})),chests:[COURT_CHEST,WARDROBE_CHEST].map(id=>s.ecosystem.objects[id]),stop:s.people.inspector.propertyStop,position:world.npcs.get('inspector').actor.position.clone(),events:events.map(e=>({type:e.type,text:e.data.text,kind:e.data.type,success:e.data.success,dialogue:e.data.dialogue}))};}};
}
