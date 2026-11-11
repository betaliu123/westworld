import * as T from '../vendor/three.module.js';
import {restraintPreview,restraintOptions,RESTRAINT_LABELS} from './npc-restraints.js';
import {touchPreview} from './npc-actions.js';
import {probePreview} from './npc-discovery.js';
import {icon} from './ui-icons.js';
import {choiceCheckText} from './dialogue.js';
import {npcActionRange,npcActionSight} from './npc-action-access.js';
export function aimOptionLabel(check,{probe=false,lasso=false,point='bind',approaching=false,outOfReach=false}={}){
 const action=lasso?RESTRAINT_LABELS[point]:probe?(check.certain?'查看资料':'探查'):point==='mute'?'哑穴':'定身穴';
 if(check.blocked)return action+' · '+(check.reason||'当前无法施展');
 return action+(check.certain?'':' · '+choiceCheckText({stat:probe?'wit':'agility'},check))+(approaching?' · 靠近中':outOfReach?' · 靠近后施展':'');
}
export function mountAim(world,getSim,available,clear,act,notify,getEco){
 const bar=document.createElement('aside'),points=document.createElement('div');bar.id='aim-skills';points.id='aim-points';bar.hidden=points.hidden=true;
 for(const [mode,label,glyph] of [['pressure','点穴','Hand'],['probe','探查','Eye'],['lasso','套索','Rope']]){const b=document.createElement('button');b.dataset.skill=mode;b.innerHTML=icon(glyph);b.title=mode==='lasso'?'套索：点人抛索；定身后可近身捆绑，亦可牵行或松绑':label;b.setAttribute('aria-label',label);b.onclick=()=>{const next=world.aimMode===mode?null:mode;exit();if(next&&available()){clear();world.clearReady();world.auto=null;world.aimMode=next;document.body.dataset.aim=next;b.setAttribute('aria-pressed','true');}};bar.append(b);}
 document.body.append(bar,points);let selected=null,approach=null;const ray=new T.Raycaster();
 function exit(){if(approach)world.auto=null;approach=null;world.aimMode=null;selected=null;points.hidden=true;delete document.body.dataset.aim;for(const b of bar.children)b.setAttribute('aria-pressed','false');}
 const clearSight=id=>npcActionSight(world.aimMode,world.hero.position,world.npcs.get(id)?.actor.position,world.obstacles,getSim().s.ecosystem?.objects);
 function use(id,mode,point){if(!available()||!clearSight(id))return notify('看不清对方，换个位置。');const d=world.npcs.get(id).actor.position.distanceTo(world.hero.position);if(d>(npcActionRange(getSim().s.player,mode,point))){const q=world.npcs.get(id).actor.position;if(d>9||!world.routeTo([q.x,q.z],mode==='probe'?2.7:1.5))return notify('够不到对方，换个位置再试。');approach={id,mode,point};return;}exit();act(id,mode,point);}
 world.canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!world.aimMode)return;e.preventDefault();e.stopImmediatePropagation();const r=world.canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),world.camera);const hit=ray.intersectObjects(world.scene.children,true).find(h=>{if(!h.object.isMesh)return false;for(let a=h.object;a;a=a.parent)if(!a.visible||a.userData.environmentEffect)return false;return true;});
 selected=null;points.hidden=true;for(let a=hit?.object;a;a=a.parent){const entry=[...world.npcs].find(([,n])=>n.actor===a);if(!entry)continue;const [id]=entry;if((getSim().s.people[id].hp<=0&&world.aimMode!=='lasso')||!clearSight(id))return;if(approach)world.auto=null;approach=null;selected=id;points.replaceChildren();for(const [point,label] of (world.aimMode==='lasso'?restraintOptions(getSim().s,id).map(o=>[o.id,o.label]):world.aimMode==='probe'?[['probe','探查']]:[['mute','哑穴'],['bind','定身穴']])){const b=document.createElement('button');b.dataset.point=point;b.textContent=label;b.onclick=()=>use(id,world.aimMode,point);points.append(b);}update();return;}},true);
 window.addEventListener('keydown',e=>{if(world.aimMode&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();}},true);
 function update(){bar.hidden=!available();bar.querySelector('[data-skill=lasso]').hidden=getSim().s.chapterVersion!==2;if(bar.hidden&&world.aimMode)exit();if(!selected||!world.aimMode)return;const actor=world.npcs.get(selected).actor,q=world.screenPoint(actor.position.clone().add(new T.Vector3(0,1.65,0)));points.hidden=!q.visible||!clearSight(selected);points.style.left=Math.max(8,Math.min(innerWidth-points.offsetWidth-8,q.x+16))+'px';points.style.top=Math.max(8,Math.min(innerHeight-points.offsetHeight-8,q.y-8))+'px';const sim=getSim(),dist=actor.position.distanceTo(world.hero.position),probe=world.aimMode==='probe',reach=npcActionRange(sim.s.player,world.aimMode,approach?.point||points.firstElementChild?.dataset.point);
 if(approach){if(!clearSight(selected)||(!world.auto&&dist>reach)){approach=null;world.auto=null;notify('目标已离开，重新选定穴位或探查。');}else if(dist<=reach){const pending=approach;world.auto=null;approach=null;use(pending.id,pending.mode,pending.point);return;}}
 for(const b of points.children){const c=world.aimMode==='lasso'?restraintPreview(sim,getEco(),selected,b.dataset.point):probe?probePreview(sim,selected):touchPreview(sim,selected,b.dataset.point);b.disabled=c.blocked||!!approach;
 const label=aimOptionLabel(c,{probe,lasso:world.aimMode==='lasso',point:b.dataset.point,approaching:!!approach,outOfReach:dist>reach});if(b.textContent!==label)b.textContent=label;}}

 return {update,exit};
}
