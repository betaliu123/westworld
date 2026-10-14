import {MATERIALS,objectDistance,surfacePoint} from './materials.js';
import {streetView} from './street-view.js';
import * as T from '../vendor/three.module.js';
import {Ecosystem} from './ecosystem.js';
import {PEOPLE} from './data.js';
import {turnToward,arriveStep} from './interaction.js';
export function mountEnvironment(world,getSim,notify,escape){
 let sim=getSim(),eco=new Ecosystem(sim,world.environmentAssets),selected=null,selectedItem=null,packMode=false,lastHTML='',lastRefresh=0;
 const hud=document.createElement('div');hud.id='environment-tools';hud.hidden=true;hud.innerHTML='<button data-show>♪ 原地卖艺</button><button data-open>行囊 · F</button>';document.body.append(hud);
 const panel=document.createElement('aside');panel.id='environment-panel';panel.hidden=true;panel.setAttribute('aria-label','环境与行囊');document.body.append(panel);
 const hp=document.createElement('div');hp.id='object-health';hp.hidden=true;document.body.append(hp);
 const stories=streetView(world,getSim,notify,escape,hud);
 const meshes=new Map(),foodMeshes=new Map();
 const name=id=>PEOPLE.find(p=>p.id===id)?.name||id;
 const nearby=()=>world.environmentAssets.filter(a=>objectDistance(a,world.hero.position)<3.5);
 const alive=()=>sim.s.player.hp>0;
 function animate(motion,target){if(world.performance)return;world.perform({id:motion==='flute'?'music':motion,kind:motion==='eat'?'eat':'listen'},target);world.performance.motion=motion;}
 function feedback(error){if(error)notify(error);lastHTML='';render();}
 function toggleShow(){if(eco.show){if(eco.show.owner!==sim.s.party.active)return notify('同伴正在演奏，可以给他下达收笛指令。');eco.stopShow();world.performance=null;return;}if(world.performance||world.locked)return notify('先完成当前动作再卖艺。');world.clearReady();world.keys.clear();world.auto=null;const error=eco.startShow(world.hero.position.x,world.hero.position.z);if(error)return notify(error);world.perform({id:'music',kind:'support'},null);world.performance.duration=3600;}
 hud.querySelector('[data-show]').title='持续消耗体力；每段表演进行风仪检定，成功可获赏及风仪 +1。同一听众每日只结算一次。';
 hud.querySelector('[data-show]').onclick=toggleShow;
 hud.querySelector('[data-open]').onclick=()=>{packMode=true;panel.hidden=!panel.hidden;document.getElementById('street-panel').hidden=true;if(!panel.hidden){world.clearReady();render();}};
 function target(){const item=eco.s.items.find(i=>i.id===selectedItem);const o=eco.s.objects[selected];if(item?.location==='ground')return {id:item.id,item:item.id,x:item.x,z:item.z,kind:'ground',name:item.name};if(o){if(item?.location==='object:'+o.id)return {id:o.id,item:item.id,x:o.x,z:o.z,kind:'food',name:item.name};return {id:o.id,x:o.x,z:o.z,kind:o.kind,name:o.name};}return null;}
 const mark=new T.Mesh(new T.RingGeometry(.65,.74,48),new T.MeshBasicMaterial({color:0xffe1a0,side:T.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));mark.rotation.x=-Math.PI/2;mark.visible=false;world.scene.add(mark);
 const outline=new T.BoxHelper(new T.Object3D(),0xf0ce86);outline.material.depthTest=false;outline.visible=false;world.scene.add(outline);const ray=new T.Raycaster();
 world.onSelectObject=e=>{if(!e)return;const rect=world.renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),world.camera);
 const hits=ray.intersectObjects(world.scene.children,true).filter(h=>{for(let n=h.object;n;n=n.parent)if(!n.visible||n.userData.environmentEffect)return false;return h.object!==mark&&h.object.isMesh;});
 selected=null;selectedItem=null;
 const hit=hits[0];if(hit){for(const a of world.environmentAssets){let n=hit.object;while(n&&n!==a.group)n=n.parent;if(n){selected=a.id;const foods=eco.items('object:'+a.id);const index=a.foods?.indexOf(hit.object)??-1;if(index>=0)selectedItem=foods[index]?.id;break;}}
 if(!selected)for(const [id,m]of foodMeshes)if(hit.object===m){selectedItem=id;break;}}
 packMode=false;panel.hidden=!target();lastHTML='';render();
 };
 function render(){if(panel.hidden)return;const t=target(),pack=eco.items('player'),npcs=[...world.npcs].filter(([id,n])=>sim.s.people[id].hp>0&&n.actor.position.distanceTo(world.hero.position)<3.5);
 const btn=(action,text,item='',target='')=>`<button data-action="${action}" data-item="${escape(item)}" data-target="${escape(target)}">${text}</button>`;
 let body='';
 if(packMode){body=`<small>队伍共用盘缠与行囊 · 当前角色使用物品</small>${pack.map(i=>`<article><b>${escape(i.name)}${i.poisoned?' · 有毒':''}</b><div>${i.type==='food'?btn('eat','吃掉',i.id)+(!i.poisoned&&pack.some(p=>p.type==='poison')?btn('coat','混入迷毒散',i.id):''):''}${btn('drop','放到地上',i.id)}${npcs.length?`<details><summary>偷偷放入他人行囊 · ${eco.chance()}%</summary>${npcs.map(([id])=>btn('plant',name(id),i.id,id)).join('')}</details>`:''}</div></article>`).join('')||'<p>行囊空空。</p>'}${npcs.filter(([id])=>sim.s.people[id].sickUntil>eco.s.time).map(([id])=>btn('help','照看 '+name(id),'',id)).join('')}`;}
 else if(t){const o=eco.s.objects[t.id],inRange=o?eco.objectRange(o):eco.range(t.x,t.z);body=`<small>${inRange?'触手可及':'距离 '+Math.ceil(Math.hypot(t.x-world.hero.position.x,t.z-world.hero.position.z))+' 步'}${o?' · 耐久 '+Math.ceil(o.hp)+'/'+o.max:''}</small><p>${o?MATERIALS[o.material].name+' · '+(o.burning?'燃烧中':o.wetUntil>eco.s.time?'湿润':'干燥')+' · ':''}${o?.owner?'属于'+name(o.owner):'可以查看、靠近后操作'}</p>${!inRange?'<button data-approach>走到附近</button>':''}`;
 if(inRange){if(!t.item&&o&&o.hp>0)body+=btn('strike','拔刀劈砍 · 体力 −8','',o.id)+btn('fire','火攻 · 体力 −6','',o.id)+btn('water','泼水灭火 · 体力 −6','',o.id);if(t.item){const item=eco.s.items.find(i=>i.id===t.item);body+=`<p>${MATERIALS[item.material].name} · 物品耐久 ${Math.ceil(item.hp)}/${item.max}${item.wetUntil>eco.s.time?' · 湿润':''}</p>`+btn('strike','劈砍物品 · 体力 −8',t.item,t.id)+btn('fire','火攻物品 · 体力 −6',t.item,t.id)+btn('water','泼水 · 体力 −6',t.item,t.id);}if(t.kind==='ground')body+=btn('pickup','拾取',t.item);if(t.kind==='tree'&&o.hp>0)body+=btn('shake',o.fruit?'摇落果子 · 体力 −4':'摇动树枝 · 体力 −4','',t.id);
 if(t.kind==='food')body+=btn('buy','买下 · 4 文',t.item,t.id)+btn('steal','偷取 · '+eco.chance()+'%',t.item,t.id)+(pack.some(p=>p.type==='poison')?btn('poison','偷偷下毒 · '+eco.chance()+'%',t.item,t.id):'');}
 if(t.kind==='stall'&&o.hp>0)body+=`<p>选择一份吃食</p>${eco.items('object:'+t.id).map((i,k)=>`<button data-food="${i.id}">${k+1} · ${escape(i.name)}${i.poisoned?' · 有毒':''}</button>`).join('')||'<p>已经售罄</p>'}`;
 body+='<small>点击别的物品切换目标 · / 拔刀后左键攻击</small>';}
 else body='<p>收刀后，点击场景里的树、食摊、吃食或掉落物。</p>';
 const html=`<header><b>${packMode?'队伍行囊':escape(t?.name||'选中物品')}</b><button data-close>×</button></header>${body}`;if(html===lastHTML)return;lastHTML=html;panel.innerHTML=html;
 panel.querySelector('[data-close]').onclick=()=>panel.hidden=true;
 panel.querySelector('[data-approach]')?.addEventListener('click',()=>{if(!world.routeTo([surfacePoint(eco.s.objects[t.id]||t,world.hero.position).x,surfacePoint(eco.s.objects[t.id]||t,world.hero.position).z]))notify('前路不通，请绕行。');});
 for(const b of panel.querySelectorAll('[data-food]'))b.onclick=()=>{selectedItem=b.dataset.food;lastHTML='';render();};
 for(const b of panel.querySelectorAll('[data-action]'))b.onclick=()=>{const {action,item,target}=b.dataset;if(!alive()||(world.performance&&!['fire','water'].includes(action)))return notify('先完成当前动作。');if(['fire','water'].includes(action))world.performance=null;if(action==='strike'){if(item){const t=environmentItemPoint(item);if(!t)return notify('物品已不在附近。');world.hero.rotation.y=Math.atan2(t.x-world.hero.position.x,t.z-world.hero.position.z);world.readyUntil=Infinity;world.attack('item:'+item);return;}const o=eco.s.objects[target];if(!o||!eco.objectRange(o,3)||(o.y??1)>2.9)return notify('再靠近一点。');const q=surfacePoint(o,world.hero.position);world.hero.rotation.y=Math.atan2(q.x-world.hero.position.x,q.z-world.hero.position.z);world.readyUntil=Infinity;world.attack(target);return;}if(action==='plant'){const n=world.npcs.get(target);if(!n||n.actor.position.distanceTo(world.hero.position)>3.5)return notify('对方已走远。');}const error=eco.act(action,target,item);if(!error&&['fire','water'].includes(action)){const o=eco.s.objects[target]||environmentItemPoint(item),q=o?surfacePoint(o,world.hero.position):world.hero.position;world.burst(q.x,1,q.z,action==='fire'?0xff8335:0x8ed8f5,18);}if(!error)animate(action==='eat'?'eat':['shake','plant','poison','coat','steal','pickup'].includes(action)?'reach':'offer',target);feedback(error);};
 }
 const flames=new Map();
 function pose(id){if(stories.pose(id))return;const n=world.npcs.get(id),state=sim.s.people[id],u=n.actor.userData;if(state.sickUntil>eco.s.time){u.rig.rotation.x=.22;u.arms[0].rotation.x=-1.1;u.arms[1].rotation.x=-1.1;}else if(state.eatingUntil>eco.s.time){u.arms[1].rotation.x=-2.1+Math.sin(world.t*5)*.15;}else if(eco.show?.audience.includes(id)&&Math.hypot(n.actor.position.x-eco.show.x,n.actor.position.z-eco.show.z)<3.5){u.arms[0].rotation.x=-1;u.arms[1].rotation.x=-1;u.arms[0].rotation.z=.3+Math.sin(world.t*7)*.18;u.arms[1].rotation.z=-.3-Math.sin(world.t*7)*.18;}}
 function steer(id,dt){if(stories.steer(id,dt))return true;const n=world.npcs.get(id),state=sim.s.people[id];
 if(state.sickUntil>eco.s.time){n.actor.userData.arms[0].rotation.x=-1;return true;}
 if(state.eatingUntil>eco.s.time){n.actor.userData.arms[1].rotation.x=-2;return true;}
 let target=null;const show=eco.show,index=show?.audience.indexOf(id)??-1;
 if(index>=0){const angle=index*Math.PI*.5;target={x:show.x+Math.sin(angle)*2.6,z:show.z+Math.cos(angle)*2.6};}
 else target=eco.foodTarget(id);
 if(!target)return false;const dx=target.x-n.actor.position.x,dz=target.z-n.actor.position.z,d=Math.hypot(dx,dz),stop=index>=0?.22:2.3;
 if(d>stop){const desired=Math.atan2(dx,dz);n.actor.rotation.y=turnToward(n.actor.rotation.y,desired,dt);const alignment=Math.max(0,Math.cos(desired-n.actor.rotation.y)),step=arriveStep(d,1.35,dt,stop)*alignment;world.move(n.actor,dx/d*step,dz/d*step);}else if(show){n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(show.x-n.actor.position.x,show.z-n.actor.position.z),dt);}
 return true;
 }
 function environmentItemPoint(id){const i=eco.s.items.find(i=>i.id===id);return i?.location==='ground'?i:i?.location.startsWith('object:')?eco.s.objects[i.location.slice(7)]:null;}
 world.ecology={steer,pose,hit(front,npcDistance,objectId=null){const pos=world.hero.position;if(selectedItem&&(!objectId||objectId==='item:'+selectedItem)){const q=environmentItemPoint(selectedItem);if(q&&objectDistance(q,pos)<3&&((q.x-pos.x)*front.x+(q.z-pos.z)*front.z)>=0&&eco.damageItem(selectedItem)){world.burst(q.x,1,q.z,0xc8a06b,10);return true;}}const candidates=world.environmentAssets.filter(a=>(!objectId||a.id===objectId)&&eco.s.objects[a.id]?.hp>0&&(a.y??1)<2.9).map(a=>{const q=surfacePoint(a,pos),d=objectDistance(a,pos);return {a,q,d};}).filter(({q,d,a})=>d<3&&d<npcDistance&&(d<.3||((q.x-pos.x)*front.x+(q.z-pos.z)*front.z)/Math.max(d,.01)>.45));
 candidates.sort((a,b)=>Number(b.a.id===selected)-Number(a.a.id===selected)||a.d-b.d);const target=candidates[0];if(!target)return false;selected=target.a.id;eco.damage(selected);world.burst(target.q.x,1,target.q.z,0xc8a06b,12);return true;}};
 return {get eco(){return eco;},target,toggleShow,nearStreet:()=>stories.near(),interactStreet:()=>stories.interact(),key(e){stories.key(e);if(e.code==='KeyF'){e.preventDefault();hud.querySelector('[data-open]').click();}if(e.code==='Escape')panel.hidden=true;},update(dt,started){
  hud.hidden=!started;if(!started)return;if(sim!==getSim()){sim=getSim();eco=new Ecosystem(sim,world.environmentAssets);lastHTML='';}
  const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z}]));stories.update(dt,positions,new Set(eco.show?.audience||[]));eco.registerAssets(world.environmentAssets);eco.reserved=stories.reserved();eco.tick(dt,positions);if(eco.show&&eco.show.owner===sim.s.party.active&&world.performance?.motion!=='flute')eco.stopShow();
  if(!eco.show&&world.performance?.motion==='flute'&&world.performance.duration===3600)world.performance=null;
  const chosen=target();mark.visible=!!chosen&&!packMode&&!panel.hidden;if(chosen)mark.position.set(chosen.x,.055,chosen.z);const selectedAsset=world.environmentAssets.find(a=>a.id===selected);outline.visible=mark.visible&&!!selectedAsset&&eco.s.objects[selected]?.hp>0;if(outline.visible)outline.setFromObject(selectedAsset.group);
  hud.querySelector('[data-show]').textContent=eco.show&&eco.show.owner===sim.s.party.active?`收起竹笛 · 围观 ${eco.show.audience.length} 人`:'♪ 原地卖艺';
  const visibleIds=new Set();for(const a of world.environmentAssets){const id=a.id,o=eco.s.objects[id];visibleIds.add(id);const time=eco.s.time-(o.shakeAt??-9);
 if(['tree','stall'].includes(a.kind)){const tilt=o.hp===0?(a.kind==='tree'?1.35:.3):o.hp<o.max/2?.08:0;a.group.rotation.z=T.MathUtils.lerp(a.group.rotation.z,tilt+(time<.4?Math.sin(time*45)*.035:0),Math.min(1,dt*12));if(a.kind==='stall'){a.group.scale.y=T.MathUtils.lerp(a.group.scale.y,o.hp===0?.25:1,Math.min(1,dt*5));a.foods.forEach((m,i)=>m.visible=i<eco.items('object:'+id).length);}}
 else{a.group.visible=o.hp>0||id==='bridge';if(id==='bridge')a.group.scale.y=o.hp>0?1:.15;if(o.hp<=0&&!a.rubble){const rubble=new T.Group();for(let k=0;k<5;k++){const m=new T.Mesh(new T.BoxGeometry(.2,.15,.25),new T.MeshStandardMaterial({color:o.material==='stone'?0x8c8b79:0x614d36}));m.position.set(o.x+Math.sin(k*5)*.65,.1,o.z+Math.cos(k*5)*.65);rubble.add(m);}world.scene.add(rubble);a.rubble=rubble;}if(a.rubble)a.rubble.visible=o.hp<=0;}
 if(o.burning){if(!flames.has(id)){const group=new T.Group();group.userData.environmentEffect=true;for(let k=0;k<4;k++){const m=new T.Mesh(new T.ConeGeometry(.18,.7,5),new T.MeshBasicMaterial({color:k%2?0xffcc55:0xf5742f,transparent:true,opacity:.8,depthWrite:false}));m.position.set(Math.sin(k*2)*.25,k%2*.25,Math.cos(k*2)*.25);group.add(m);}world.scene.add(group);flames.set(id,group);}const f=flames.get(id);f.position.set(o.x,Math.min(2,o.y||.7),o.z);f.scale.y=1+Math.sin(world.t*11)*.25;f.visible=true;}else if(flames.has(id))flames.get(id).visible=false;
 }
 for(const [id,f]of flames)if(!visibleIds.has(id))f.visible=false;
  for(const item of eco.s.items.filter(i=>i.location==='ground')){if(!foodMeshes.has(item.id)){const m=new T.Mesh(new T.SphereGeometry(.13,8,6),new T.MeshStandardMaterial({color:item.type==='poison'?0x756490:0xd8ac58}));world.scene.add(m);foodMeshes.set(item.id,m);}const m=foodMeshes.get(item.id);m.position.set(item.x,.15,item.z);m.visible=true;}
  for(const [id,m]of foodMeshes)if(!eco.s.items.some(i=>i.id===id&&i.location==='ground'))m.visible=false;
  const near=world.environmentAssets.find(a=>a.id===selected&&objectDistance(a,world.hero.position)<3.5)||nearby().sort((a,b)=>Math.hypot(a.x-world.hero.position.x,a.z-world.hero.position.z)-Math.hypot(b.x-world.hero.position.x,b.z-world.hero.position.z))[0];hp.hidden=!near||!world.combatReady;if(near){const o=eco.s.objects[near.id];hp.innerHTML=`${near.name} · 耐久 ${Math.ceil(o.hp)}/${o.max} · ${MATERIALS[o.material].name}${o.burning?' · 燃烧':''}<meter min="0" max="${o.max}" value="${o.hp}"></meter>`;}
  if(eco.s.time-lastRefresh>.4){lastRefresh=eco.s.time;render();}
 }};
}
