import * as T from '../vendor/three.module.js';
export function canJump(world){return world.playing&&!world.locked&&!world.performance&&world.sim.s.player.hp>0&&world.hero.position.y<.02;}
export function seesDraw(actor,hero,state,now,visible){const dx=hero.position.x-actor.position.x,dz=hero.position.z-actor.position.z,d=Math.hypot(dx,dz);return state.hp>0&&!(state.stunnedUntil>now)&&visible&&d<7&&(d<1.5||(Math.sin(actor.rotation.y)*dx+Math.cos(actor.rotation.y)*dz)/Math.max(.01,d)>.15);}
export function bodyFeedback(actor,hp,now,dt,target=null){const u=actor.userData;
 if(u.lastHp!==undefined&&hp<u.lastHp){u.hurtAt=now;u.hurtUntil=now+.42;}u.lastHp=hp;
 if(hp<=0){u.fall=Math.min(1,(u.fall||0)+dt*3.5);u.rig.rotation.set(0,0,u.fall*Math.PI/2);u.rig.position.set(0,.64*u.fall,0);u.legs.forEach(l=>{l.rotation.set(0,0,0);l.position.y=.5;});u.arms.forEach((a,i)=>a.rotation.set(-.2,0,(i?1:-1)*.18));u.sword.visible=false;if(u.head)u.head.rotation.set(0,0,0);actor.updateWorldMatrix(true,true);u.deathBounds??=new T.Box3();u.deathBounds.makeEmpty();const include=node=>{if(!node.visible)return;if(node.isMesh)u.deathBounds.expandByObject(node);else for(const child of node.children)include(child);};include(u.rig);u.rig.position.y+=actor.position.y+.015-u.deathBounds.min.y;return;}
 u.fall=0;
 if(u.head){const angle=target?Math.atan2(target.x-actor.position.x,target.z-actor.position.z)-actor.rotation.y:0;const wrapped=Math.atan2(Math.sin(angle),Math.cos(angle));u.head.rotation.y=T.MathUtils.lerp(u.head.rotation.y,Math.max(-.65,Math.min(.65,wrapped)),1-Math.exp(-7*dt));}
 const hurt=Math.max(0,(u.hurtUntil-now)/.42),startle=Math.max(0,Math.min(1,(u.startledUntil-now)/.65));
 if(hurt){u.rig.rotation.x=-Math.sin(hurt*Math.PI)*.24;u.rig.rotation.z=Math.sin(hurt*Math.PI*2)*.1;u.arms[0].rotation.x=-1.1*hurt;}
 else if(startle){u.rig.rotation.x=-.16*startle;u.arms.forEach(a=>a.rotation.x=-1.2*startle);}
}
export function thoughtLine(text){return {id:'hero',thought:true,text:'（'+text.replace(/^[（(]|[）)]$/g,'')+'）'};}
