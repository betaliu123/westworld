export const RIBBON_COURT={x:22,z:10};
export const PRISON={spawn:{x:22,z:-22},inmate:{x:20.5,z:-23},release:{x:22,z:-17},bounds:{minX:19.2,maxX:24.8,minZ:-24.8,maxZ:-19.8}};
export function jailed(s){return s.event?.type==='gate'&&['prison','testimony'].includes(s.event.gate?.phase);}
// Recovery must stay on the accessible side of the gate (or inside the cell).
export function recoveryPoint(s){return jailed(s)?{...PRISON.spawn}:s.event?.type==='gate'&&s.event.status==='active'?{x:0,z:27}:{x:0,z:14};}
export function repairStrandedRecovery(s){
 const p=s.player;
 // The old recovery code always wrote this exact city position, even before
 // admission. Repair that invalid save without restarting the story or day.
 if(s.event?.type==='gate'&&s.event.status==='active'&&p.x===0&&p.z===14){Object.assign(p,recoveryPoint(s));delete p.bedRest;}
}
export function migrateLocations(s){if(s.locationVersion===2)return;if(jailed(s)){s.player.x=PRISON.spawn.x;s.player.z=PRISON.spawn.z;s.event.point=[PRISON.spawn.x,PRISON.spawn.z];if(s.party?.members?.main){s.party.members.main.x=s.player.x;s.party.members.main.z=s.player.z;}}
 if(s.people?.prisoner){s.people.prisoner.x=PRISON.inmate.x;s.people.prisoner.z=PRISON.inmate.z;}s.locationVersion=2;}

// One source for foliage, sight cover and NPC destinations, away from the tea tables.
export const PRIVACY_GROVE={x:22,z:28};
// Outside the west wall, in the corner between the river fence and 临溪人家.
export const BEGGAR_NEST={x:-14.2,z:23.3};
// Dry east bank, screened from the tea stall by a physical limestone outcrop.
export const QINGHE_RIVERSIDE={x:-18.05,z:34.5,facing:-Math.PI/2};
export const QINGHE_ROCK={id:'qinghe-river-rock',x:-16.3,z:34.2,w:2.2,d:2.9,sightHeight:2.25};
export const privacySpot=index=>({x:PRIVACY_GROVE.x+(index%4)*1.15,z:PRIVACY_GROVE.z+Math.floor(index/4)*.85});
