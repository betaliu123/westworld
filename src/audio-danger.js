import {investigationAreas} from './crime-investigation.js';
import {wantedProfile,LAW_OFFICERS} from './wanted-records.js';
import {jailed} from './locations.js';

// Only already-noticed areas affect the soundtrack; hidden cases stay hidden.
export function investigationDanger(s,position=s.player){
 if(s.chapterVersion!==2||jailed(s)||s.player.hp<=0||!(s.wanted>0||LAW_OFFICERS.some(id=>wantedProfile(s,id))))return 0;
 return investigationAreas(s,position).reduce((level,a)=>Math.max(level,Math.max(0,Math.min(1,1-(Math.hypot(position.x-a.x,position.z-a.z)-a.radius)/10))),0);
}
