import * as T from '../vendor/three.module.js';
import {PEOPLE} from './data.js';
import {SEATS} from './npc-seats.js';
import {convoyTravelling} from './npc-posts.js';
import {solveArm} from './npc-gesture.js';

const near=(a,b)=>!!b&&Math.hypot(a.x-b.x,a.z-b.z)<.6;
const smooth=k=>T.MathUtils.smoothstep(k,0,1);
export const atStool=q=>Object.values(SEATS).some(seat=>near(q,seat));

// Choose by the current activity and actual location, never by a story step.
export function groundSeatWanted(s,id,q){
 const n=s.people[id],activity=n?.life?.activity;
 if(!n||n.hp<=0||n.restraint||n.drowning||n.stunnedUntil>s.npcClock||n.sickUntil>(s.ecosystem?.time||0)||n.awareness?.caseOpen||n.awareness&&!['idle','return'].includes(n.awareness.state)||convoyTravelling(s,id))return false;
 if(atStool(q))return false;
 const target=n.life?.target||PEOPLE.find(p=>p.id===id);
 if(!near(q,target))return false;
 return ['doze','rest'].includes(activity)||id==='qinghe'&&activity==='riverside'||id==='beggar'&&['idle','awake','host','meal'].includes(activity)||id==='porter'&&['duty','meal'].includes(activity);
}

export function npcGroundSeat(world,id,dt,speed=0){
 const n=world.npcs.get(id),s=world.sim.s,st=s.people[id],u=n.actor.userData;
 u.groundPose=null;
 const interrupted=st.hp<=0||st.restraint||st.drowning||st.stunnedUntil>s.npcClock||st.sickUntil>(s.ecosystem?.time||0)||st.awareness?.caseOpen||st.awareness&&!['idle','return'].includes(st.awareness.state)||n.chasing||n.fleeing||speed>.12||u.bedPose||u.sword.visible||u.hurtUntil>world.t||u.startledUntil>world.t||world.trainingActor===id||world.performance?.targetId===id;
 if(interrupted){n.groundWeight=0;n.groundRising=false;return;}
 const wanted=!n.groundRising&&groundSeatWanted(s,id,n.actor.position);
 n.groundWeight=T.MathUtils.clamp((n.groundWeight||0)+(wanted?dt/1.1:-dt/.65),0,1);
 if(n.groundWeight===0){n.groundRising=false;return;}
 const k=smooth(n.groundWeight),dozing=st.life?.activity==='doze';
 u.groundPose={weight:k,dozing,time:world.t};u.npcPoseOverride=true;
 u.head.rotation.x=(dozing?.24+Math.sin(world.t*.7)*.025:.04)*k;
 u.sword.visible=false;
}

// Aim through the real joints, so both imported skeleton conventions work.
export function groundSeatBones(rig,bones,hipHeight,pose){
 const k=pose.weight;
 rig.position.set(0,-(hipHeight-.25)*k,0);rig.rotation.set(.055*k,0,0);
 const aim=(bone,end,vector)=>{
  if(!bone||!end)return;
  rig.updateWorldMatrix(true,true);
  const before=bone.quaternion.clone(),from=end.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();
  const to=new T.Vector3(...vector).normalize().applyQuaternion(rig.getWorldQuaternion(new T.Quaternion()));
  const parent=bone.parent.getWorldQuaternion(new T.Quaternion()),delta=new T.Quaternion().setFromUnitVectors(from,to);
  bone.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
  bone.quaternion.slerpQuaternions(before,bone.quaternion.clone(),k);
 };
 for(const side of ['right','left']){
  const leg=bones[side+'Leg'],shin=bones[side+'Shin'],foot=shin?.children.find(c=>c.isBone),toe=foot?.children.find(c=>c.isBone);
  rig.updateWorldMatrix(true,true);
  const sign=Math.sign(rig.worldToLocal(leg.getWorldPosition(new T.Vector3())).x)||1;
  aim(leg,shin,[sign*.72,-.12,.7]);aim(shin,foot,[-sign*.9,-.13,.43]);aim(foot,toe,[sign*.12,-.12,1]);
  const arm=bones[side+'Arm'],fore=bones[side+'Fore'],hand=fore?.children.find(c=>c.isBone);
  if(arm&&fore&&hand){
   const knee=shin.getWorldPosition(new T.Vector3()),goal=knee.clone().add(new T.Vector3(0,.10,.02).applyQuaternion(rig.getWorldQuaternion(new T.Quaternion())));
   const pole=rig.localToWorld(new T.Vector3(sign*.65,hipHeight+.05,.12));
   solveArm(arm,fore,hand,goal,pole,k);
  }
 }
}
