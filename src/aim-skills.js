import * as T from '../vendor/three.module.js';
import {touchPreview} from './npc-actions.js';
import {probeSight,probePreview} from './npc-discovery.js';
import {icon} from './ui-icons.js';
export function mountAim(world,getSim,available,clear,act,notify){
 const bar=document.createElement('aside'),points=document.createElement('div');bar.id='aim-skills';points.id='aim-points';bar.hidden=points.hidden=true;
 for(const [mode,label,glyph] of [['pressure','点穴','Hand'],['probe','探查','Eye']]){const b=document.createElement('button');b.innerHTML=icon(glyph)+label;b.onclick=()=>{const next=world.aimMode===mode?null:mode;exit();if(next&&available()){clear();world.clearReady();world.auto=null;world.aimMode=next;document.body.dataset.aim=next;b.setAttribute('aria-pressed','true');}};bar.append(b);}
 document.body.append(bar,points);let selected=null,approach=null;const ray=new T.Raycaster();
 function exit(){if(approach)world.auto=null;approach=null;world.aimMode=null;selected=null;points.hidden=true;delete document.body.dataset.aim;for(const b of bar.children)b.setAttribute('aria-pressed','false');}
 const clearSight=id=>probeSight(world.hero.position,world.npcs.get(id).actor.position,world.obstacles,getSim().s.ecosystem?.objects);
 function use(id,mode,point){if(!available()||!clearSight(id))return notify('看不清对方，换个位置。');const d=world.npcs.get(id).actor.position.distanceTo(world.hero.position);if(d>(mode==='probe'?3.5:2.2)){const q=world.npcs.get(id).actor.position;if(d>9||!world.routeTo([q.x,q.z],mode==='probe'?2.7:1.5))return notify('够不到对方，换个位置再试。');approach={id,mode,point};return;}exit();act(id,mode,point);}
 world.canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!world.aimMode)return;e.preventDefault();e.stopImmediatePropagation();const r=world.canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),world.camera);const hit=ray.intersectObjects(world.scene.children,true).find(h=>{if(!h.object.isMesh)return false;for(let a=h.object;a;a=a.parent)if(!a.visible||a.userData.environmentEffect)return false;return true;});
 selected=null;points.hidden=true;for(let a=hit?.object;a;a=a.parent){const entry=[...world.npcs].find(([,n])=>n.actor===a);if(!entry)continue;const [id]=entry;if(getSim().s.people[id].hp<=0||!clearSight(id))return;if(approach)world.auto=null;approach=null;selected=id;points.replaceChildren();for(const [point,label] of (world.aimMode==='probe'?[['probe','探查']]:[['mute','哑穴'],['bind','定身穴']])){const b=document.createElement('button');b.dataset.point=point;b.textContent=label;b.onclick=()=>use(id,world.aimMode,point);points.append(b);}update();return;}},true);
 window.addEventListener('keydown',e=>{if(world.aimMode&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();}},true);
 function update(){bar.hidden=!available();if(bar.hidden&&world.aimMode)exit();if(!selected||!world.aimMode)return;const actor=world.npcs.get(selected).actor,q=world.screenPoint(actor.position.clone().add(new T.Vector3(0,1.65,0)));points.hidden=!q.visible||!clearSight(selected);points.style.left=Math.max(8,Math.min(innerWidth-145,q.x+16))+'px';points.style.top=Math.max(8,Math.min(innerHeight-95,q.y-8))+'px';const dist=actor.position.distanceTo(world.hero.position),probe=world.aimMode==='probe',reach=probe?3.5:2.2,sim=getSim();
 if(approach){if(!clearSight(selected)||(!world.auto&&dist>reach)){approach=null;world.auto=null;notify('目标已离开，重新选定穴位或探查。');}else if(dist<=reach){const pending=approach;world.auto=null;approach=null;use(pending.id,pending.mode,pending.point);return;}}
 for(const b of points.children){const c=probe?probePreview(sim,selected):touchPreview(sim,selected,b.dataset.point);b.disabled=c.blocked||!!approach;const n=sim.s.people[selected],why=c.blocked?(probe?'暂不可探查':sim.s.player.energy<10?'体力不足':'对方已受制'):'';
 const label=(probe?(n.probed?'查看资料':'探查'):b.dataset.point==='mute'?'哑穴':'定身穴')+(c.certain?'':' · '+c.chance+'%')+(why?' · '+why:approach?' · 靠近中':dist>reach?' · 靠近后施展':'');if(b.textContent!==label)b.textContent=label;}}

 return {update,exit};
}
