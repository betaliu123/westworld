import * as T from '../vendor/three.module.js';
import {bedFor,isSleeping} from './night-life.js';
import {bedOwner,wakePlayer} from './bed-rest.js';
import {routinePath} from './npc-navigation.js';
const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
// A dedicated lie-down / rise pose, in the character's own rig space. The
// physical root stays at the reachable foot slot; only the body reclines.
export function restPose(actor,bed,weight,time){const u=actor.userData,k=smooth((weight-.15)/.85),sit=Math.sin(Math.PI*weight);
 actor.rotation.y=0;u.rig.rotation.set(-Math.PI/2*k,0,0);
 u.rig.position.set((bed.x-actor.position.x)*k,.64*k-.3*sit+.006*Math.sin(time*1.2)*k,(bed.z+.96-actor.position.z)*k);
 u.head.rotation.set(.03*k,.22*k,0);u.arms.forEach(a=>a.rotation.set(-.12*k,0,0));u.legs.forEach(l=>l.rotation.set(-.6*sit,0,0));
 u.sword.visible=false;u.bedPose={weight,k,sit,time};u.npcPoseOverride=true;
}
export function npcBedPose(world,id,dt){const n=world.npcs.get(id),s=world.sim.s,state=s.people[id],u=n.actor.userData;u.bedPose=null;
 const bed=bedFor(id),near=bed&&Math.hypot(n.actor.position.x-bed.xTarget,n.actor.position.z-bed.zTarget)<.7;
 const safe=state.hp>0&&!(state.stunnedUntil>s.npcClock)&&!state.awareness?.caseOpen&&!n.chasing&&!n.fleeing;
 const sleeping=safe&&near&&isSleeping(state);if(!safe){n.bedWeight=0;return;}
 if(n.bedWeight===undefined)n.bedWeight=sleeping&&s.npcClock-(state.sleepStartedAt??-10)>2?1:0;
 n.bedWeight=T.MathUtils.clamp(n.bedWeight+(sleeping?dt/1.8:-dt/1.5),0,1);
 if(n.bedWeight>0&&near)restPose(n.actor,bed,n.bedWeight,world.t);
}
export function moveToBed(world,dt){const s=world.sim.s,r=s.player.bedRest;if(!r||world.locked||r.phase!=='approach')return 0;
 const bed=bedFor(bedOwner(r.bedId));if(!bed)return 0;const to={x:bed.xTarget,z:bed.zTarget},actor=world.hero;
 if(!world.bedPath||world.bedPath.id!==r.bedId)world.bedPath={id:r.bedId,points:routinePath(actor.position,to,(x,z)=>world.collides(x,z),.3)};
 const path=world.bedPath.points;while(path.length&&Math.hypot(path[0].x-actor.position.x,path[0].z-actor.position.z)<.15)path.shift();const q=path[0]||to;
 const dx=q.x-actor.position.x,dz=q.z-actor.position.z,d=Math.hypot(dx,dz),before=actor.position.clone();
 if(d>.08){const step=Math.min(d,1.5*dt);world.move(actor,dx/d*step,dz/d*step);actor.rotation.y=Math.atan2(dx,dz);}
 r.stalled=before.distanceTo(actor.position)<.0001?(r.stalled||0)+dt:0;if(r.stalled>3){wakePlayer(world.sim,'床边被挡住了。');world.onThought?.('床边被挡住了。');}
 return before.distanceTo(actor.position)/Math.max(dt,.001);
}
export function playerBedPose(world){const p=world.sim.s.player,u=world.hero.userData,r=p.bedRest;u.bedPose=null;
 if(!r||p.hp<=0){world.bedPath=null;return;}const b=bedFor(bedOwner(r.bedId));if(!b||r.phase==='approach')return;
 const weight=r.phase==='sleep'?1:r.phase==='lower'?Math.min(1,r.elapsed/1.8):Math.max(0,(r.riseFrom??1)*(1-r.elapsed/1.5));
 restPose(world.hero,b,weight,world.t);
}
// Aim by actual bone directions so Tripo A-pose and Mixamo T-pose bodies both
// rest with arms beside the torso, without assuming compatible local axes.
export function bedBones(rig,bones,pose){
 const aim=(bone,child,vector)=>{if(!bone||!child)return;rig.updateWorldMatrix(true,false);const p=bone.getWorldPosition(new T.Vector3()),direction=child.getWorldPosition(new T.Vector3()).sub(p).normalize();
  const desired=new T.Vector3(...vector).normalize().applyQuaternion(rig.getWorldQuaternion(new T.Quaternion()));
  const delta=new T.Quaternion().setFromUnitVectors(direction,desired),parent=bone.parent.getWorldQuaternion(new T.Quaternion());
  bone.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
 };
 for(const [side,sign]of [['right',-1],['left',1]]){
  const arm=bones[side+'Arm'],fore=bones[side+'Fore'],hand=fore?.children.find(c=>c.isBone);
  aim(arm,fore,[sign*.12,-1,.1]);aim(fore,hand,[-sign*.16,-1,.24]);
 }
}
