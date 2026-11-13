/** End player-directed hostility, leaving relationships, evidence, custody and NPC duels intact. */
export function endPlayerPursuit(s){
 delete s.complaint;if(s.territory)delete s.territory.barred;
 for(const n of Object.values(s.people)){
  if(n.awareness?.suspect==='player'||n.awareness?.lastIncident!=null)n.awareness=null;
  if(n.hp>0&&(n.mood==='angry'||n.mood==='afraid')){n.mood='calm';n.fear=0;}
 }
}

export function lawConfrontation(sim,id,distance){if(!['guard','gate_guard','gate_relief','inspector'].includes(id)||distance>3.6||sim.s.player.hp<=0)return false;const n=sim.s.people[id];return !!n&&n.hp>0&&!(n.stunnedUntil>(sim.s.npcClock||0))&&(n.awareness?.state==='fight'||sim.isPursuing(id,distance)||sim.event?.gate?.phase==='fight'&&id==='gate_guard');}
