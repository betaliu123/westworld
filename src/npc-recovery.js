import {stuckStep,recoverySpot} from './npc-navigation.js';
import {roomAt} from './night-life.js';
import {inDeepWater} from './world-rules.js';

const danger=new Set(['fight','flee','warn','investigate','search']);
export function recoverNpc(world,id,n,dt){
 const s=world.sim.s,state=s.people[id],actor=n.actor,now=s.npcClock||0;
 const eligible=world.captureShot?.officer!==id&&world.playing&&!world.locked&&!world.cinematic&&!world.performance&&world.trainingActor!==id&&
  state.hp>0&&!(state.stunnedUntil>now)&&!state.inCustody&&!state.restraint&&!state.escortingBy&&!n.chasing&&!n.fleeing&&
  !world.sim.s.investigations?.cases.some(c=>['enroute','search'].includes(c.state)&&c.assigned===id)&&!state.awareness?.caseOpen&&!danger.has(state.awareness?.state)&&!state.drowning&&!state.burning&&
  !['sleep','escape','nightPursuit','escort'].includes(state.life?.activity)&&world.t>=(n.recoveryCooldown||0);
 n.stuckWatch??={};
 const action=stuckStep(n.stuckWatch,actor.position,!!actor.userData.attemptedMove,dt,eligible);
 delete actor.userData.attemptedMove;
 if(!action)return;
 n.route=[];n.routeKey=null;n.routeExpires=0;
 n.cardPath=null;n.cardRepath=0;n.concernPath=null;n.concernRepath=0;
 n.qinghePath=null;n.qingheRepath=0;
 n.complaintPath=null;n.complaintRepath=0;n.disciplinePath=null;n.disciplineRepath=0;n.territoryPath=null;n.territoryRepath=0;
 if(action!=='recover')return action;
 // Action-card participants must leave by walking; recovery cannot teleport a pursuer or a gift.
 if(state.concern||state.life?.activity==='qinghe-journey'||s.deck?.actions?.active?.members.includes(id))return 'repath';
 const flames=Object.values(s.ecosystem?.objects||{}).filter(o=>o.burning&&o.hp>0);
 const blocked=(x,z)=>world.collides(x,z,0,false)||inDeepWater(x,z)||!!roomAt({x,z})||
  flames.some(o=>Math.hypot(o.x-x,o.z-z)<2)||
  [...world.npcs.values()].some(other=>other!==n&&other.actor.visible&&Math.hypot(other.actor.position.x-x,other.actor.position.z-z)<.85)||
  Math.hypot(world.hero.position.x-x,world.hero.position.z-z)<.85;
 const safe=recoverySpot(n.base,actor.position,blocked);
 if(!safe)return 'blocked';
 actor.position.set(safe.x,0,safe.z);state.x=safe.x;state.z=safe.z;
 // Teleporting is not walking: reset visual velocity and cached position too.
 actor.userData.travelSpeed=0;delete actor.userData.travelAt;n.motionPosition?.copy(actor.position);
 n.stuckWatch={};n.recoveryCooldown=world.t+30;n.recoveryHomeUntil=world.t+6;
 state.navigationRecoveries=(state.navigationRecoveries||0)+1;
 world.sim.emit('npcRoutine',{id,text:'这边不好走，换条路吧。'});world.sim.save();
 return 'recover';
}
