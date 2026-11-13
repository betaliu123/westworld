import {disguiseObserverBlock} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {routinePath as encounterPath} from './npc-navigation.js';
import {turnToward} from './interaction.js';
export function propertyStopMotion(world,id,n,dt){
 const s=world.sim.s,state=s.people[id],stop=state.propertyStop;if(!stop)return false;
 const object=s.ecosystem?.objects[stop.object],p=world.hero.position,a=n.actor;
 if(stop.until<=(s.npcClock||0)||disguiseObserverBlock(s,id)||!object||object.hp<=0||Math.hypot(p.x-object.x,p.z-object.z)>4||!visibleBetween(a.position,p,world.obstacles,s.ecosystem?.objects)){
  delete state.propertyStop;return false;
 }
 if(!dt||world.performance)return true;
 const distance=Math.hypot(p.x-a.position.x,p.z-a.position.z);
 let moving=false;
 if(distance>1.6){
  if(!n.propertyPath||world.t>=(n.propertyRepath||0)){n.propertyRepath=world.t+.7;n.propertyPath=encounterPath(a.position,p,(x,z)=>world.collides(x,z,0,false),1.5);}
  while(n.propertyPath.length&&Math.hypot(n.propertyPath[0].x-a.position.x,n.propertyPath[0].z-a.position.z)<.15)n.propertyPath.shift();
  const q=n.propertyPath[0];if(q){const dx=q.x-a.position.x,dz=q.z-a.position.z,len=Math.hypot(dx,dz)||1,step=Math.min(len,dt*2.4);world.move(a,dx/len*step,dz/len*step);moving=true;}
 }
 a.rotation.y=turnToward(a.rotation.y,Math.atan2(p.x-a.position.x,p.z-a.position.z),dt);
 world.animateActor(a,moving?1:0,dt,moving?'':'talk');if(!moving)a.userData.arms[1].rotation.x=-1.1;
 return true;
}
