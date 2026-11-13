import {QINGHE_RIVERSIDE} from '../src/locations.js';
import {eventsFor,deckState} from '../src/event-deck.js';
import {visibleBetween} from '../src/npc-awareness.js';
export function mountQingheLeadsHarness({getSim,world,environment,dialogue,save}){
 function arrange(kind='fu'){
  dialogue.finish(true);environment.close();world.auto=null;world.keys.clear();world.clearReady();
  for(const id of ['panel','drawer'])document.getElementById(id).hidden=true;
  const s=getSim().s;s.chapter.opened=true;s.time=35;s.player.satiety=s.player.rested=100;s.wanted=0;
  for(const key of ['fuWaitingKnown','qingheUnwillingKnown','qingheWishKnown','qingheConsent','riversideCryKnown','convoyWaitingKnown'])delete s.facts[key];
  delete s.chapter.done.fu_waiting;delete s.chapter.done.qinghe_wish;
  delete s.quests.qinghe_search;delete s.quests.convoy_waiting;
  const d=deckState(s);d.used={};d.heard={};d.leads=[];d.cards=[];d.pointer.gate=0;
  if(d.actions){d.actions.active=null;d.actions.nextAt=1e9;}
  const place=(id,x,z,activity)=>{Object.assign(s.people[id],{x,z,hp:100,energy:100,life:{activity},awareness:null});world.npcs.get(id).actor.position.set(x,0,z);environment.eco.positions[id]={x,z};environment.eco.s.hunger[id]=0;};
  place('fu',8,29,'duty');place('qinghe',QINGHE_RIVERSIDE.x,QINGHE_RIVERSIDE.z,'riverside');
  let x=8,z=27;
  if(kind!=='fu'){
   for(const e of eventsFor(s))if(e.id!==kind)d.used[e.id]=s.day;
   place('old_constable',-8,30,'tea');x=-8;z=32;
  }
  Object.assign(s.player,{x,z,crouched:false,stealing:false});world.hero.position.set(x,0,z);world.yaw=0;world.pitch=.5;world.distance=5;
  for(const n of world.npcs.values())n.nextAmbient=world.t+120;world.nextAmbient=world.t+120;save();
 }
 window.__qingheLeadsQA={arrange,save,talk:id=>world.onGateTalk(id),snapshot:()=>{
  const s=getSim().s,q=world.npcs.get('qinghe').actor.position;
  return {player:{x:s.player.x,z:s.player.z},auto:world.auto,performance:!!world.performance,facts:s.facts,quests:s.quests,tracked:s.trackedQuest,leads:s.deck?.leads,history:s.history.length,
   qingheDistance:world.hero.position.distanceTo(q),clearSight:visibleBetween(world.hero.position,q,world.obstacles,environment.eco.s.objects),saveKeys:Object.keys(localStorage)};
 }};
}
