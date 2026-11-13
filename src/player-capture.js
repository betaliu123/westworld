import * as T from '../vendor/three.module.js';
import {CONFLICT_OFFICERS,conflictCapable} from './combat-conflict.js';
import {currentFace} from './appearance.js';
import {endPlayerPursuit} from './pursuit.js';
import {detainByOfficer} from './gate-scene.js';
import {jailed} from './locations.js';
import {visibleBetween} from './npc-awareness.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';
import {clearDialogueCamera} from './orbit-camera.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const reducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
export const CAPTURE_TIMING={down:1.65,secure:1.05,lift:1.1,escort:1.35,fade:.42,reveal:.5};
export const captureActive=world=>!!(world.sim.s.capture||world.captureShot);
function officerReady(world,id){
 const s=world.sim.s,n=world.npcs.get(id);
 return CONFLICT_OFFICERS.includes(id)&&conflictCapable(s,id)&&s.people[id].hp>(s.people[id].maxHp||100)*.3&&!!n&&n.actor.visible!==false;
}
function contact(world,id,radius=1.25){const n=world.npcs.get(id);return !!n&&distance(n.actor.position,world.hero.position)<=radius&&visibleBetween(n.actor.position,world.hero.position,world.obstacles,world.sim.s.ecosystem?.objects);}

// Save only the pending capture and the officer's knowledge. The short performance
// restarts on reload; custody, penalties and relocation are committed at its end.
export function beginPlayerCapture(world,id){
 const sim=world.sim,s=sim.s;
 if(s.capture||world.captureShot||s.player.hp>0||jailed(s)||!officerReady(world,id)||!contact(world,id,2.1))return false;
 const a=s.people[id].awareness,info=a?.wantedCase;
 const p=world.npcs.get(id).actor.position;Object.assign(s.people[id],{x:p.x,z:p.z});
 s.capture={officer:id,caseInfo:JSON.parse(JSON.stringify({subject:info?.subject||a?.believedIdentity||currentFace(s),charges:info?.charges||[],records:info?.records||[]}))};
 endPlayerPursuit(s);world.clearReady();world.keys.clear();world.auto=null;world.heroVel?.set(0,0,0);world.performance=null;
 sim.emit('captureStart');sim.save();return true;
}
function fade(world,opacity){const k=Math.max(0,Math.min(1,opacity));world.onCaptureFade?.(1-(1-k)*(1-k));}
function finish(world,interrupted=false){
 const s=world.sim.s;delete s.capture;world.captureShot=null;fade(world,0);
 world.heroModel?.motion?.reset();world.sim.save();
 if(interrupted&&s.player.hp<=0)world.onHurt?.();
}
function next(shot,phase){shot.phase=phase;shot.age=0;}
function escortDirection(world,n){
 // Take a short, collision-checked step away from the arrest spot. The trip to
 // the cell is elided only after this visible escort, never through a wall.
 const p=world.hero.position,q=n.actor.position,base=Math.atan2(p.x-q.x,p.z-q.z);
 for(const offset of [0,.6,-.6,1.2,-1.2,Math.PI]){
  const yaw=base+offset,dx=Math.sin(yaw),dz=Math.cos(yaw);let clear=true;
  for(let d=.15;d<=1.05;d+=.15)if(world.collides(p.x+dx*d,p.z+dz*d,0,true)||world.collides(q.x+dx*d,q.z+dz*d,0,false)){clear=false;break;}
  if(clear)return {x:dx,z:dz,yaw};
 }
 return null;
}
export function captureFrame(world,dt){
 if(!captureActive(world)||!world.playing)return;
 const sim=world.sim,s=sim.s;
 if(!world.captureShot){
  if(jailed(s)||s.player.hp>0){finish(world);return;}
  world.captureShot={officer:s.capture.officer,phase:'down',age:0,total:0,heading:world.hero.rotation.y};
  world.clearReady();world.keys.clear();world.auto=null;world.performance=null;sim.emit('captureStart');
 }
 const shot=world.captureShot;dt=Math.max(0,Math.min(.05,dt));shot.age+=dt;shot.total+=dt;
 if(shot.phase==='reveal'){
  const duration=reducedMotion()?.2:CAPTURE_TIMING.reveal;
  fade(world,1-shot.age/duration);
  if(shot.age>=duration)finish(world);
  return;
 }
 if(s.player.hp>0||!officerReady(world,shot.officer)||shot.total>15){finish(world,true);return;}
 const n=world.npcs.get(shot.officer),p=n.actor.position,h=world.hero.position;
 if(['secure','lift','escort','fade'].includes(shot.phase)&&!contact(world,shot.officer)){finish(world,true);return;}
 if(shot.phase==='down'&&shot.age>=CAPTURE_TIMING.down)next(shot,'approach');
 else if(shot.phase==='approach'){
  if(contact(world,shot.officer,1)){next(shot,'secure');return;}
  if(!shot.path||shot.age>=(shot.repath||0)){shot.repath=shot.age+.6;shot.path=routinePath(p,h,(x,z)=>world.collides(x,z,0,false),.85);}
  while(shot.path?.length&&distance(p,shot.path[0])<.15)shot.path.shift();
  const target=shot.path?.[0];if(target){const d=distance(p,target)||1,step=Math.min(dt*1.6,d,Math.max(0,distance(p,h)-.85));world.move(n.actor,(target.x-p.x)/d*step,(target.z-p.z)/d*step);}
 }
 else if(shot.phase==='secure'&&shot.age>=CAPTURE_TIMING.secure)next(shot,'lift');
 else if(shot.phase==='lift'&&shot.age>=CAPTURE_TIMING.lift){shot.direction=escortDirection(world,n);next(shot,'escort');}
 else if(shot.phase==='escort'){
  const dir=shot.direction,step=dt*.65;
  if(dir&&!world.collides(h.x+dir.x*step,h.z+dir.z*step,0,true)&&!world.collides(p.x+dir.x*step,p.z+dir.z*step,0,false)){
   // Keep their contact distance fixed; both bodies obey the same world geometry.
   h.x+=dir.x*step;h.z+=dir.z*step;p.x+=dir.x*step;p.z+=dir.z*step;shot.speed=.65;
   s.player.x=h.x;s.player.z=h.z;
  }else shot.speed=0;
  if(shot.age>=CAPTURE_TIMING.escort)next(shot,'fade');
 }else if(shot.phase==='fade'){
  const duration=reducedMotion()?.2:CAPTURE_TIMING.fade;
  fade(world,shot.age/duration);
  if(shot.age>=duration){
   const pending=s.capture;delete s.capture;
   const ok=detainByOfficer(sim,shot.officer,pending.caseInfo,{handledPresentation:true});
   if(!ok){finish(world,true);return;}
   world.hero.position.set(s.player.x,0,s.player.z);world.heroModel?.motion?.reset();world.hero.userData.lastHp=s.player.hp;
   // Snap only under the opaque transition, so the orbit never flies across town.
   world.camera.position.copy(world.hero.position).add(new T.Vector3(Math.sin(world.yaw)*world.distance,2.8,Math.cos(world.yaw)*world.distance));
   world.cameraY=0;next(shot,'reveal');
  }
 }
}
export function captureMotion(world,id,n,dt){
 const shot=world.captureShot;if(!shot||shot.officer!==id||shot.phase==='reveal')return false;
 n.combat?.cancel();n.model?.motion?.cancelAttack();n.chasing=n.fleeing=false;
 const h=world.hero.position,p=n.actor.position;
 const yaw=['escort','fade'].includes(shot.phase)?shot.direction?.yaw??shot.heading:Math.atan2(h.x-p.x,h.z-p.z);
 n.actor.rotation.y=turnToward(n.actor.rotation.y,yaw,dt);
 world.animateActor(n.actor,shot.phase==='approach'?.5:shot.phase==='escort'?(shot.speed||0)/2:0,dt,'');
 n.actor.userData.sword.visible=false;
 Object.assign(world.sim.s.people[id],{x:p.x,z:p.z,facing:n.actor.rotation.y});
 return true;
}
export function captureOfficerPose(world,id){
 const shot=world.captureShot;if(!shot||shot.officer!==id||shot.phase==='reveal')return null;
 if(shot.phase==='secure')return {kind:'captureReach',lift:0};
 if(shot.phase==='lift')return {kind:'captureReach',lift:Math.min(1,shot.age/CAPTURE_TIMING.lift)};
 if(['escort','fade'].includes(shot.phase))return {kind:'captureEscort'};
 return null;
}
export function captureHeroPose(world){
 const shot=world.captureShot;if(!shot||!['lift','escort','fade'].includes(shot.phase))return null;
 return {phase:shot.phase,progress:Math.min(1,shot.age/CAPTURE_TIMING.lift),speed:shot.phase==='escort'?shot.speed||0:0};
}
export function captureCamera(world,dt){
 if(reducedMotion())return false;
 const shot=world.captureShot,n=world.npcs.get(shot?.officer);if(!shot||shot.phase==='reveal'||!n)return false;
 const raised=['escort','fade'].includes(shot.phase),lift=shot.phase==='lift'?Math.min(1,shot.age/CAPTURE_TIMING.lift):raised?1:0;
 const target=world.hero.position.clone().lerp(n.actor.position,.25);target.y=.55+.45*lift;
 const yaw=shot.heading+1,eye=target.clone().add(new T.Vector3(Math.sin(yaw)*4.8,2.35,Math.cos(yaw)*4.8));
 world.camera.position.lerp(clearDialogueCamera(target,eye,world.obstacles,world.sim.s.ecosystem?.objects),1-Math.exp(-dt*4));world.camera.fov=48;world.camera.lookAt(target);return true;
}
