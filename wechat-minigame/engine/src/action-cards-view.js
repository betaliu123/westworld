import * as T from '../vendor/three.module.js';
import {actionCardStep,actionTarget,actionParticipant,pendingActionCard} from './action-cards.js';
import {sceneIcon} from './ui-icons.js';
import {routinePath} from './npc-navigation.js';
import {visibleBetween} from './npc-awareness.js';
import {turnToward} from './interaction.js';

export function actionCardFrame(world,dt){
 for(const n of world.npcs.values()){if(n.actionProps)n.actionProps.group.visible=false;if(n.actionMarker)n.actionMarker.visible=false;}
 const eco=world.ecology?.eco;if(!eco||!world.playing)return;
 const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position]));
 world.actionPositions=positions;
 actionCardStep(world.sim,eco,dt,positions,{obstacles:world.obstacles,reserved:eco.reserved,
  blocked:world.locked||!!world.cinematic||!!world.performance||!!world.trainingActor,armed:world.combatReady,
  contactOffset:{x:Math.cos(world.yaw)*1.1+Math.sin(world.yaw)*.3,z:-Math.sin(world.yaw)*1.1+Math.cos(world.yaw)*.3},
  say:line=>world.onActionCardSpeech?.(line)||false,
  hit:id=>{const r=world.receiveHit(id);if(r.damage)world.onHurt?.();return r.damage;}});
 const e=world.sim.s.deck?.actions?.active;
 if(e&&!world.locked&&!world.cinematic&&!world.performance&&!world.trainingActor&&!world.combatReady&&pendingActionCard(world.sim.s,e.who,positions,world.obstacles)){
  const n=world.npcs.get(e.who);if(!n.actionMarker){const texture=new T.TextureLoader().load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sceneIcon('MessageCircle')));texture.colorSpace=T.SRGBColorSpace;n.actionMarker=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,toneMapped:false}));n.actionMarker.position.y=(n.model?.height||2)+.22;n.actor.add(n.actionMarker);}
  n.actionMarker.visible=true;const size=Math.max(.27,Math.min(.4,world.camera.position.distanceTo(n.actor.position)*.035));n.actionMarker.scale.set(size,size,1);
 }
}
function props(n){if(n.actionProps)return n.actionProps;
 const group=new T.Group(),paper=new T.MeshStandardMaterial({color:0xd8d1b3,roughness:1}),wood=new T.MeshStandardMaterial({color:0x73583c,roughness:1});
 const food=new T.Mesh(new T.SphereGeometry(.14,10,8),paper);group.add(food);
 const kit=new T.Group(),box=new T.Mesh(new T.BoxGeometry(.42,.22,.28),wood),lid=new T.Mesh(new T.BoxGeometry(.43,.04,.29),wood);kit.add(box,lid);lid.position.set(0,.21,-.13);lid.rotation.x=-.8;group.add(kit);
 const cloth=new T.Mesh(new T.BoxGeometry(.24,.06,.3),paper);group.add(cloth);n.actor.userData.rig.add(group);
 return n.actionProps={group,food,kit,cloth};
}
export function actionCardMotion(world,id,n,dt){
 if(n.actionProps)n.actionProps.group.visible=false;
 const s=world.sim.s,e=s.deck?.actions?.active,state=s.people[id],a=n.actor,u=a.userData;
 if(!world.playing||world.cinematic||!actionParticipant(s,id)||state.hp<=0||state.restraint||state.stunnedUntil>(s.npcClock||0)||state.drowning||state.burning||state.sickUntil>(s.ecosystem?.time||0)||state.inCustody)return false;
 if(state.concern)return false;
 if(e.phase!=='combat'&&(state.awareness?.caseOpen||['fight','warn','flee','search','investigate'].includes(state.awareness?.state)||state.fear>0))return false;
 for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop)prop.visible=false;
 u.sword.visible=false;
 if(world.locked||world.performance)dt=0;
 const target=actionTarget(s,id,world.actionPositions||{});if(!target?.point)return false;
 const before=a.position.clone(),goal=target.point,d=Math.hypot(goal.x-a.position.x,goal.z-a.position.z);
 if(d>target.stop){
  if(n.cardPhase!==e.phase||!n.cardPath||world.t>=(n.cardRepath||0)){n.cardPhase=e.phase;n.cardRepath=world.t+.7;n.cardPath=routinePath(a.position,goal,(x,z)=>world.collides(x,z,0,false),target.stop);}
  while(n.cardPath.length&&Math.hypot(n.cardPath[0].x-a.position.x,n.cardPath[0].z-a.position.z)<.16)n.cardPath.shift();
  const q=n.cardPath[0];if(q){const dx=q.x-a.position.x,dz=q.z-a.position.z,len=Math.hypot(dx,dz);if(len>.01){const step=Math.min(len,dt*(e.template==='heal'?2.8:2.4));a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);world.move(a,dx/len*step,dz/len*step);}}
 }else if(e.phase==='depart'&&!e.departed.includes(id)){e.departed.push(id);world.sim.save();}
 const moving=dt?a.position.distanceTo(before)/dt:0;
 if(moving<.1&&e.phase!=='depart'){const look=e.phase==='recruit'?goal:world.hero.position;a.rotation.y=turnToward(a.rotation.y,Math.atan2(look.x-a.position.x,look.z-a.position.z),dt);}
 world.animateActor(a,moving/2,dt,world.speaking===id?'talk':'');
 n.label.visible=!world.locked&&a.position.distanceTo(world.hero.position)<7&&visibleBetween(a.position,world.hero.position,world.obstacles,s.ecosystem?.objects);
 const labelSize=Math.min(2.7,world.camera.position.distanceTo(a.position)*.13);n.label.scale.set(labelSize,labelSize*.187,1);n.label.material.opacity=1;
 if(e.phase==='combat'){u.sword.visible=!(state.disarmedUntil>s.npcClock);const swing=Math.max(0,1-((s.npcClock||0)-((e.hits?.[id]||0)-1.5))/.5);u.arms[1].rotation.x=-.8-swing;u.npcPoseOverride=true;}
 if(id===e.who&&['waiting','act','thanks','farewell'].includes(e.phase)&&e.template!=='revenge'){
  const p=props(n);p.group.visible=true;p.food.visible=e.template==='food'&&!e.settled;p.kit.visible=e.template==='heal';p.cloth.visible=e.template==='heal'&&e.phase==='act';
  p.food.position.set(.28,1.3,.65);p.kit.position.set(-.35,e.phase==='act'?.42:.2,.45);p.cloth.position.set(0,1.1,.75);
  if(e.phase==='act'){
   u.arms[0].rotation.x=-1.2;u.arms[1].rotation.x=-1.5+Math.sin(e.elapsed*5)*.1;u.npcPoseOverride=true;
   if(e.template==='heal'){u.rig.position.y=-.3;u.rig.rotation.x=.18;u.legs[0].rotation.x=-.9;u.legs[1].rotation.x=-.7;}
  }else {u.npcUpperBody={kind:'reach'};}
 }
 state.x=a.position.x;state.z=a.position.z;state.facing=a.rotation.y;return true;
}
