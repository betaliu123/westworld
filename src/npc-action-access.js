import {skill} from './skills.js';
import {probeSight} from './npc-discovery.js';
import {visibleBetween} from './npc-awareness.js';
export function npcActionRange(player,mode,point='catch'){return mode==='lasso'?(point==='catch'?6:2.2):mode==='probe'?3.5:skill(player,'pressure').tier>=4?6:2.2;}
export function npcActionSight(mode,origin,target,obstacles=[],objects={}){return !!target&&(mode==='probe'?probeSight:visibleBetween)(origin,target,obstacles,objects);}
export function npcActionAccess(player,mode,origin,target,obstacles=[],objects={}){
 if(!target)return '目标已离开，请重新选人。';
 if(Math.hypot(target.x-origin.x,target.z-origin.z)>npcActionRange(player,mode))return '距离太远，靠近后再施展。';
 return npcActionSight(mode,origin,target,obstacles,objects)?'':'视线被挡，换个位置。';
}
