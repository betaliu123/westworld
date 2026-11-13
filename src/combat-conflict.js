import {persona} from './npc-persona.js';
import {importantPeople} from './npc-bonds.js';
import {skill} from './skills.js';

export const CONFLICT_OFFICERS=['guard','gate_guard','gate_relief','inspector'];
export function conflictCapable(s,id,speaking=false){
 const n=s.people[id],now=s.npcClock||0;
 return !!n&&n.hp>0&&!n.restraint&&!n.inCustody&&!(n.stunnedUntil>now)&&!n.drowning&&!['sleep','doze'].includes(n.life?.activity)&&(!speaking||n.hp>(n.maxHp||100)*.3&&!(n.muteUntil>now));
}
// Stable choices follow ability, duty, relationships and injury, never a per-hit roll.
export function assaultReaction(s,id,event){
 const n=s.people[id],trained=skill(n,'combat').tier>=2||persona(id)[0]==='blade';
 const protects=event.target===id||importantPeople(s,id).includes(event.target);
 if(!conflictCapable(s,id))return null;
 if(n.hp<=(n.maxHp||100)*.3)return 'flee';
 if(CONFLICT_OFFICERS.includes(id)||trained&&protects)return 'fight';
 return 'flee';
}
export function activeConflict(s,positions=null){
 if(s.chapterVersion!==2||s.player.hp<=0)return false;
 return Object.entries(s.people).some(([id,n])=>{
  const a=n.awareness,q=positions?.[id];
  return conflictCapable(s,id)&&a?.suspect==='player'&&['fight','search','flee'].includes(a.state)&&(!positions||q&&Math.hypot(q.x-s.player.x,q.z-s.player.z)<15);
 });
}
