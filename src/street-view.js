import * as T from '../vendor/three.module.js';
import {StreetStories} from './street-stories.js';
import {PEOPLE,ATTR} from './data.js';
import {turnToward,arriveStep} from './interaction.js';
export function streetView(world,getSim,notify,escape,hud){
 let sim=getSim(),director=new StreetStories(sim),last='',refresh=0,lastBurst='',cargoId=null;
 const button=document.createElement('button');button.textContent='附近动静';hud.append(button);
 const panel=document.createElement('aside');panel.id='street-panel';panel.hidden=true;panel.setAttribute('aria-label','街头动静');document.body.append(panel);
 const stage=new T.Group();world.scene.add(stage);for(let i=0;i<3;i++){const box=new T.Mesh(new T.BoxGeometry(.7,.6,.7),new T.MeshStandardMaterial({color:0x8b694b}));box.position.set(i*.8-1,.3,i%2);stage.add(box);}stage.visible=false;
 const flute=world.actionFlute.clone();world.npcs.get('elder').actor.userData.arms[1].add(flute);flute.visible=false;
 button.onclick=()=>{panel.hidden=!panel.hidden;document.getElementById('environment-panel').hidden=true;world.clearReady();render();};
 const name=id=>PEOPLE.find(n=>n.id===id)?.name||id;
 function render(){if(panel.hidden)return;const e=director.active,t=director.template;
 const html=`<header><b>${escape(t?.name||'街头动静')}</b><button data-close>×</button></header>${e?`<p>${escape(t.intro)}</p><small>${e.cast.map(id=>name(id)+' · 气血 '+Math.ceil(sim.s.people[id].hp)).join(' / ')}</small><button data-route>⌖ 前往${escape(t.name.split(' · ')[0])}</button><p class="street-note">走近现场即可介入；也可以旁观或离开。</p><div class="street-choices">${t.options.map(a=>`<button data-choice="${a.id}" ${e.attempts.includes(a.id)?'disabled':''}><b>${escape(a.label)}</b><small>${a.stat?ATTR[a.stat]+'检定 · '+director.chance(a)+'%':'无需检定'} · 体力 −5${a.cost?' · '+a.cost+'文':''}${e.attempts.includes(a.id)?' · 已尝试':''}</small></button>`).join('')}</div>`:'<p>此刻附近风波暂歇。街坊仍在各自忙碌，新的动静会自然出现。</p>'}<small>青竹会关系 ${director.s.factions.青竹会} · 赤砂帮关系 ${director.s.factions.赤砂帮}</small>`;
 if(last===html)return;last=html;panel.innerHTML=html;panel.querySelector('[data-close]').onclick=()=>panel.hidden=true;
 const route=panel.querySelector('[data-route]');if(route)route.onclick=()=>{if(world.routeTo(t.point)){panel.hidden=true;notify('前往动静发生处，WASD 可随时中止。');}};
 for(const b of panel.querySelectorAll('[data-choice]'))b.onclick=()=>{if(world.performance||world.locked)return notify('先完成当前动作。');const r=director.resolve(e.id,b.dataset.choice);if(r.error)return notify(r.error);world.perform({id:b.dataset.choice,kind:'listen'},e.cast[0]);world.performance.motion=r.motion;panel.hidden=true;};
 }
 function steer(id,dt){const e=director.active,t=director.template,index=e?.cast.indexOf(id)??-1;if(index<0)return false;const n=world.npcs.get(id),p=n.actor.position;let x,z;
 if(t.mode==='fight'){x=t.point[0]+(index===0?-.65:index===1?.65:0);z=t.point[1]+(index===2?2.5:0);}else {const a=index*Math.PI*.7;x=t.point[0]+(index===0?0:Math.sin(a)*2.4);z=t.point[1]+(index===0?0:Math.cos(a)*2.4);}
 const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d>.2){const angle=Math.atan2(dx,dz);n.actor.rotation.y=turnToward(n.actor.rotation.y,angle,dt);const step=arriveStep(d,1.6,dt,.15)*Math.max(0,Math.cos(angle-n.actor.rotation.y));world.move(n.actor,dx/d*step,dz/d*step);}else {const other=world.npcs.get(e.cast[index===0?1:0]).actor.position;n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(other.x-p.x,other.z-p.z),dt);}return true;}
 function pose(id){const e=director.active,t=director.template,index=e?.cast.indexOf(id)??-1;if(index<0)return false;const u=world.npcs.get(id).actor.userData;
 if(t.mode==='fight'&&e.arrived&&index<2){const punch=(Math.sin(e.elapsed*4+index*Math.PI)+1)/2;u.arms[1].rotation.x=-.5-punch*1.2;u.arms[0].rotation.x=-.8;u.rig.rotation.x=.08;}
 else if(t.mode==='perform'&&e.arrived){if(index===0){u.arms[0].rotation.x=-1.5;u.arms[1].rotation.x=-1.6;u.arms[1].rotation.z=.4;}else{u.arms[0].rotation.x=-1;u.arms[1].rotation.x=-1;u.arms[0].rotation.z=.3+Math.sin(world.t*6)*.15;u.arms[1].rotation.z=-.3-Math.sin(world.t*6)*.15;}}
 else if(t.mode==='care'&&index<2){u.rig.rotation.x=.18;u.arms[0].rotation.x=-1.1;}
 else if(t.mode==='cargo'&&e.arrived){u.rig.rotation.x=.15;u.arms[0].rotation.x=-.7;u.arms[1].rotation.x=-.7;}
 else if(e.arrived)u.arms[1].rotation.x=-.6+Math.sin(world.t*3)*.15;
 return true;}
 return {near(){const t=director.template;return !!t&&Math.hypot(world.hero.position.x-t.point[0],world.hero.position.z-t.point[1])<5;},interact(){if(!this.near())return false;button.click();return true;},steer,pose,reserved:()=>director.reserved(),key(e){if(e.code==='Escape')panel.hidden=true;},update(dt,positions,blocked){if(sim!==getSim()){sim=getSim();director=new StreetStories(sim);last='';}director.tick(dt,positions,blocked);const e=director.active,t=director.template;button.textContent=e?'附近动静 · '+t.name.split(' · ')[1]:'附近动静';flute.visible=!!e&&t.mode==='perform'&&e.arrived;stage.visible=!!e&&t.mode==='cargo';if(stage.visible)stage.position.set(t.point[0],0,t.point[1]);if(cargoId!==(stage.visible?e.id:null)){world.environmentAssets=world.environmentAssets.filter(a=>!a.id.startsWith('cargo:'));cargoId=stage.visible?e.id:null;if(cargoId)stage.children.forEach((m,i)=>{m.visible=true;world.registerObject(m,`cargo:${cargoId}:${i}`,'运货木箱','wood',90,{owner:'porter'});});}if(e&&t.mode==='fight'&&e.lastHit&&lastBurst!==e.id+':'+e.lastHit){lastBurst=e.id+':'+e.lastHit;for(const id of e.cast.slice(0,2)){const p=world.npcs.get(id).actor.position;world.burst(p.x,1,p.z,0xd8ac76,5);}}refresh+=dt;if(refresh>.5){refresh=0;render();}}};
}
