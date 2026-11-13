import {objectPresent} from './materials.js';
import {rememberWitnessedHarm} from './npc-bonds.js';
import {attributeIncident,changeRelation,currentFace} from './appearance.js';
import {theftSight} from './theft-sight.js';
import {assaultReaction,conflictCapable} from './combat-conflict.js';
// Witness knowledge is local to each NPC; the event's actor is not automatically known.
export function visibleBetween(a,b,obstacles,objects={},heights=null){
 const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.01)return true;
 // Segment/slab intersection also catches thin closed doors between sample points.
 for(const o of obstacles){if(!objectPresent(objects[o.id])||objects[o.id]?.hp===0||objects[o.id]?.open||!heights&&(o.sightHeight??3)<=1)continue;
  let lo=.05/length,hi=1-.05/length;
  for(const [axis,size] of [['x','w'],['z','d']]){const delta=b[axis]-a[axis],min=o[axis]-o[size]/2,max=o[axis]+o[size]/2;
   if(Math.abs(delta)<1e-9){if(a[axis]<=min||a[axis]>=max){lo=2;break;}}
   else{const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
  }
  if(lo<hi){if(heights){const y=t=>heights[0]+(heights[1]-heights[0])*t;if(Math.min(y(lo),y(hi))>(o.sightHeight??3))continue;}return false;}
 }return true;
}
export function theftVisibleBetween(observer,player,obstacles,objects){return visibleBetween(observer,player,obstacles,objects,[1.65,player.crouched?.75:1.5]);}
// Seeing identifies a culprit; noise alone can only prompt a local investigation.
export function perceiveIncident(event,id,d,facing,clear){
 if(event.type==='assault'&&event.target===id||event.type==='theft'&&event.caughtBy===id&&clear&&d<=2.8)return 'seen';
 if(event.type==='theft')return theftSight({distance:d,facing,clear})==='watching'?'seen':null;
 const patrol=['guard','gate_guard','gate_relief'].includes(id);
 if(clear&&d<=(event.covert?1.6:patrol?6:4.5)&&facing>=(event.covert?.65:.45))return 'seen';
 if(['damage','assault'].includes(event.type)&&d<=(clear?3.5:2))return 'heard';
 return null;
}
export function witnessEvent(sim,id,event,seen,home){const n=sim.s.people[id];if(!n||n.hp<=0)return;const now=sim.s.npcClock||0;let a=n.awareness;
 const repeated=a?.suspect==='player'&&now-(a.lastIncident||0)<20;
 a??={home:{x:home.x,z:home.z}};n.awareness=a;a.lastIncident=now;a.lastKnown={x:event.x,z:event.z};a.seen=seen;
 const guard=['guard','gate_guard','gate_relief'].includes(id),owner=event.owner===id,victim=event.target===id;a.caseOpen=(seen&&(guard||owner||victim))||a.caseOpen;
 if(seen){a.believedIdentity=attributeIncident(sim.s,id,event);rememberWitnessedHarm(sim.s,id,event);a.appearanceSerial=currentFace(sim.s)==='player'?0:sim.s.player.face.serial;a.suspect='player';if(event.type==='assault'||event.severe)a.severe=true;a.strikes=repeated?(a.strikes||0)+1:1;if(!repeated){changeRelation(sim,id,guard||owner||victim?-3:-1,a.believedIdentity);if(guard&&!event.convoy)sim.s.wanted=Math.min(9,sim.s.wanted+1);}a.state=guard?(event.type==='assault'||a.strikes>1?'fight':'warn'):victim||owner?'flee':'notice';a.until=now+(a.state==='fight'?20:5);}
 else if(!['fight','warn','flee'].includes(a.state)){a.state='investigate';a.until=now+5;}
 if(seen&&event.type==='assault'&&event.method!=='lasso'&&sim.s.chapterVersion===2){const reaction=assaultReaction(sim.s,id,event);if(reaction){a.state=reaction;a.until=now+(reaction==='fight'?20:8);a.assaultTarget=event.target;}}
 return a;
}
export function advanceAwareness(sim,id,position,canSee,dt,armed){const a=sim.s.people[id]?.awareness;if(!a||a.state==='idle')return null;const now=sim.s.npcClock||0,p=sim.s.player;
 if(sim.s.chapterVersion===2&&!conflictCapable(sim.s,id))return null;
 if(sim.s.chapterVersion===2&&a.state==='fight'&&sim.s.people[id].hp<=(sim.s.people[id].maxHp||100)*.3){a.state='flee';a.until=now+8;}
 if(sim.s.chapterVersion===2&&a.state==='flee'&&canSee&&Math.hypot(position.x-p.x,position.z-p.z)<6){a.lastKnown={x:p.x,z:p.z};a.until=now+3;}
 const face=currentFace(sim.s),serial=face==='player'?0:p.face.serial;
 if(a.believedIdentity&&a.believedIdentity!=='player'&&a.appearanceSerial!==serial){
  // A later sighting cannot reconstruct an unseen change. Only a transition
  // actually witnessed at the time links this suspect to the new appearance.
  const observed=sim.s.appearance?.observedChanges?.[id];
  if(observed?.fromSerial===a.appearanceSerial&&observed.from===a.believedIdentity&&observed.serial===serial&&observed.to===face){a.identifiedSerial=serial;a.believedIdentity='player';a.appearanceSerial=serial;}
  else if(face===a.believedIdentity){if(canSee)a.appearanceSerial=serial;}
  else {a.caseOpen=false;if(a.state!=='return'){a.state='return';return a;}}
 }
 if(sim.s.chapterVersion===2&&a.state==='search'&&canSee&&Math.hypot(position.x-p.x,position.z-p.z)<10&&a.suspect==='player'){a.state='fight';a.until=now+8;}
 if(a.state==='fight'){if(canSee&&Math.hypot(position.x-p.x,position.z-p.z)<15){a.lastKnown={x:p.x,z:p.z};a.until=now+8;if(!a.severe&&!a.obstructingWarrant&&!armed&&Math.hypot(position.x-p.x,position.z-p.z)>3){a.state='warn';a.until=now+5;}}else{a.state='search';a.until=now+7;}}
 if(now>=a.until&&!['return','idle'].includes(a.state)){a.state='return';}
 if(a.state==='return'&&Math.hypot(position.x-a.home.x,position.z-a.home.z)<.4){a.state='idle';return null;}
 return a;
}
