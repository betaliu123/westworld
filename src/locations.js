export const RIBBON_COURT={x:22,z:10};
export const PRISON={spawn:{x:22,z:-22},inmate:{x:20.5,z:-23},release:{x:22,z:-17},bounds:{minX:19.2,maxX:24.8,minZ:-24.8,maxZ:-19.8}};
export function jailed(s){return s.event?.type==='gate'&&['prison','testimony'].includes(s.event.gate?.phase);}
export function migrateLocations(s){if(s.locationVersion===2)return;if(jailed(s)){s.player.x=PRISON.spawn.x;s.player.z=PRISON.spawn.z;s.event.point=[PRISON.spawn.x,PRISON.spawn.z];if(s.party?.members?.main){s.party.members.main.x=s.player.x;s.party.members.main.z=s.player.z;}}
 if(s.people?.prisoner){s.people.prisoner.x=PRISON.inmate.x;s.people.prisoner.z=PRISON.inmate.z;}s.locationVersion=2;}
