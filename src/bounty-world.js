import {bountyPreview,bountyReceiverReady,redeemBounty} from './bounty.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';

export function bountyOfficerMotion(world,id,n,dt){
 const s=world.sim.s,task=s.law?.handover;if(!task||task.receiver!==id)return false;
 const positions=Object.fromEntries([...world.npcs].map(([k,v])=>[k,v.actor.position])),clock=s.npcClock||0;
 const cancel=()=>{delete s.law.handover;n.bountyPath=null;world.sim.save();};
 if(task.expires<=clock||!bountyReceiverReady(s,id)||bountyPreview(s,task.target,null,positions,world.obstacles,task.board).blocked){cancel();return false;}
 const check=bountyPreview(s,task.target,id,positions,world.obstacles,task.board),q=positions[task.target];
 if(!check.blocked){
  if(!task.receivingAt){task.receivingAt=clock;task.receiverHp=s.people[id].hp;}
  if(s.people[id].hp<task.receiverHp){cancel();return false;}
  n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(q.x-n.actor.position.x,q.z-n.actor.position.z),dt);
  world.animateActor(n.actor,0,dt,'');n.actor.userData.npcUpperBody={kind:'reach'};
  if(clock-task.receivingAt>=1){const result=redeemBounty(world.sim,task.target,id,positions,world.obstacles,task.board);cancel();if(result.error)world.onThought?.('（'+result.error+'）');}
  return true;
 }
 delete task.receivingAt;
 if(!dt||world.performance)return true;
 if(!n.bountyPath||world.t>=(n.bountyRepath||0)){n.bountyRepath=world.t+.6;n.bountyPath=routinePath(n.actor.position,q,(x,z)=>world.collides(x,z,0,false),1.6);}
 while(n.bountyPath.length&&Math.hypot(n.bountyPath[0].x-n.actor.position.x,n.bountyPath[0].z-n.actor.position.z)<.18)n.bountyPath.shift();
 const goal=n.bountyPath[0];if(goal){const dx=goal.x-n.actor.position.x,dz=goal.z-n.actor.position.z,len=Math.hypot(dx,dz);n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(dx,dz),dt);if(len>.01)world.move(n.actor,dx/len*Math.min(len,dt*2.6),dz/len*Math.min(len,dt*2.6));}
 world.animateActor(n.actor,goal?1:0,dt,'');return true;
}
