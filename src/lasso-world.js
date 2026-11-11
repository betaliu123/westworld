import * as T from '../vendor/three.module.js';
import {turnToward} from './interaction.js';
import {routinePath} from './npc-navigation.js';
import {visibleBetween} from './npc-awareness.js';

// Body restraint owns locomotion before schedules, pursuit, scenes and recovery.
export function restraintMotion(world,id,n,dt){
 const state=world.sim.s.people[id],r=state.restraint;if(!r)return false;
 const a=n.actor,old=a.position.clone(),p=world.hero.position;
 n.chasing=n.fleeing=false;n.actor.userData.sword.visible=false;
 if(n.alert)n.alert.visible=false;
 if(state.hp>0&&!(state.stunnedUntil>(world.sim.s.npcClock||0))&&r.mode==='lead'&&dt>0&&p.distanceTo(a.position)>1.65){
  if(!n.ropeRoute||world.t>(n.ropeRepath||0)){
   n.ropeRoute=routinePath(a.position,p,(x,z)=>world.collides(x,z,0,false),1.4);n.ropeRepath=world.t+.6;
  }
  while(n.ropeRoute.length&&Math.hypot(n.ropeRoute[0].x-a.position.x,n.ropeRoute[0].z-a.position.z)<.18)n.ropeRoute.shift();
  const q=n.ropeRoute[0];
  if(q){const dx=q.x-a.position.x,dz=q.z-a.position.z,d=Math.hypot(dx,dz),step=Math.min(d,2.9*dt);a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);if(d>.001)world.move(a,dx/d*step,dz/d*step);}
 }
 state.x=a.position.x;state.z=a.position.z;state.facing=a.rotation.y;
 world.animateActor(a,Math.min(1,a.position.distanceTo(old)/Math.max(dt,.001)/2),dt,state.hp<=0?'down':'');
 const d=a.position.distanceTo(p);n.label.visible=!world.cinematic&&d<6.6&&visibleBetween(a.position,p,world.obstacles,world.sim.s.ecosystem?.objects);
 return true;
}
export function restraintBeat(world){
 const a=world.performance;if(!a?.restraintAttempt)return;
 if(!a.settled&&a.restraintAttempt.interrupted()){
  a.restraintAttempt.cancel();world.performance=null;world.checkReveal?.cancel();world.onPerformanceEnd?.();world.onThought?.('（收手，绳结还没有系好。）');
 }
}
const ropeMaterial=new T.MeshStandardMaterial({color:0x9c6d3c,roughness:1});
function ropeMesh(parent){
 const g=new T.Group();g.userData.environmentEffect=true;parent.add(g);
 const segments=Array.from({length:24},()=>{const m=new T.Mesh(new T.CylinderGeometry(.018,.018,1,5),ropeMaterial);g.add(m);return m;});
 return {g,segments};
}
function ropeCurve(view,start,end,slack=.16){
 const up=new T.Vector3(0,1,0),delta=new T.Vector3();
 for(let i=0;i<view.segments.length;i++){
  const t=i/view.segments.length,u=(i+1)/view.segments.length;
  const a=start.clone().lerp(end,t),b=start.clone().lerp(end,u);a.y-=Math.sin(t*Math.PI)*slack;b.y-=Math.sin(u*Math.PI)*slack;
  const m=view.segments[i];delta.copy(b).sub(a);m.position.copy(a).lerp(b,.5);m.scale.y=Math.max(.001,delta.length());m.quaternion.setFromUnitVectors(up,delta.normalize());
 }
}
function loop(parent,radius){const m=new T.Mesh(new T.TorusGeometry(radius,.024,6,24),ropeMaterial);m.rotation.x=Math.PI/2;parent.add(m);return m;}
export function drawLassos(world){
 world.ropeViews??=new Map();
 for(const [id,n] of world.npcs){
  const state=world.sim.s.people[id],r=state.restraint;let view=world.ropeViews.get(id);
  if(!r){if(view)view.g.visible=false;continue;}
  if(!view){view=ropeMesh(world.scene);view.wrist=loop(view.g,.13);view.ankle=loop(view.g,.23);world.ropeViews.set(id,view);}
  view.g.visible=true;
  const wrist=n.model?.betweenHands?.()||n.actor.localToWorld(new T.Vector3(0,1,.25));
  view.wrist.position.copy(wrist);view.wrist.rotation.y=n.actor.rotation.y;
  view.ankle.visible=r.mode==='fixed';view.ankle.position.copy(n.actor.position).add(new T.Vector3(0,state.hp<=0?.08:.17,0));
  for(const m of view.segments)m.visible=r.mode==='lead';
  if(r.mode==='lead'){
   const hand=world.hero.localToWorld(new T.Vector3(-.32,1.12,.24));ropeCurve(view,hand,wrist,Math.max(.04,.3-hand.distanceTo(wrist)*.03));
  }
 }
 const a=world.performance,age=a?world.t-a.start:0;
 if(a?.motion==='lasso'&&!a.settled){
  world.ropeFlight??=ropeMesh(world.scene);const v=world.ropeFlight;v.g.visible=true;v.loop??=loop(v.g,.38);
  const start=world.hero.localToWorld(new T.Vector3(-.32,1.5,.25)),target=world.npcs.get(a.targetId)?.actor.position.clone().add(new T.Vector3(0,1.1,0));
  if(target){const k=Math.min(1,Math.max(0,(age-.22)/.58)),end=start.clone().lerp(target,k);end.y+=Math.sin(k*Math.PI)*.8;v.loop.position.copy(end);ropeCurve(v,start,end,.12);}
 }else if(world.ropeFlight)world.ropeFlight.g.visible=false;
}
