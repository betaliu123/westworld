// Witness knowledge is local to each NPC; the event's actor is not automatically known.
export function visibleBetween(a,b,obstacles,objects={}){const distance=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.15;t<distance-.2;t+=.25){const x=a.x+(b.x-a.x)*t/distance,z=a.z+(b.z-a.z)*t/distance;if(obstacles.some(o=>objects[o.id]?.hp!==0&&Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2))return false;}return true;}
export function witnessEvent(sim,id,event,seen,home){const n=sim.s.people[id];if(!n||n.hp<=0)return;const now=sim.s.npcClock||0;let a=n.awareness;
 const repeated=a?.suspect==='player'&&now-(a.lastIncident||0)<20;
 a??={home:{x:home.x,z:home.z}};n.awareness=a;a.lastIncident=now;a.lastKnown={x:event.x,z:event.z};a.seen=seen;
 const guard=['guard','gate_guard','gate_relief'].includes(id),owner=event.owner===id,victim=event.target===id;a.caseOpen=(seen&&(guard||owner||victim))||a.caseOpen;
 if(seen){a.suspect='player';if(event.type==='assault')a.severe=true;a.strikes=repeated?(a.strikes||0)+1:1;if(!repeated){sim.relation(id,guard||owner||victim?-3:-1);if(guard)sim.s.wanted=Math.min(9,sim.s.wanted+1);}a.state=guard?(event.type==='assault'||a.strikes>1?'fight':'warn'):victim||owner?'flee':'notice';a.until=now+(a.state==='fight'?20:5);}
 else if(!['fight','warn','flee'].includes(a.state)){a.state='investigate';a.until=now+5;}
 return a;
}
export function advanceAwareness(sim,id,position,canSee,dt,armed){const a=sim.s.people[id]?.awareness;if(!a||a.state==='idle')return null;const now=sim.s.npcClock||0,p=sim.s.player;
 if(a.state==='fight'){if(canSee&&Math.hypot(position.x-p.x,position.z-p.z)<15){a.lastKnown={x:p.x,z:p.z};a.until=now+8;if(!armed&&Math.hypot(position.x-p.x,position.z-p.z)>3){a.state='warn';a.until=now+5;}}else{a.state='search';a.until=now+7;}}
 if(now>=a.until&&!['return','idle'].includes(a.state)){a.state='return';}
 if(a.state==='return'&&Math.hypot(position.x-a.home.x,position.z-a.home.z)<.4){a.state='idle';return null;}
 return a;
}
