import * as T from '../vendor/three.module.js';
import {clone} from '../vendor/SkeletonUtils.js';
import {icon,iconButton} from './ui-icons.js';
import {npcPortrait} from './npc-portraits.js';
import {appearanceView,appearanceState,applyFace,equipAppearance,identityName,rememberFace,knownFaces,canUseFace,feminineBody} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';

export function mountAppearanceUI({world,getSim,environment,drawer,toast,esc}){
 const button=document.createElement('button');button.id='wardrobe-button';iconButton(button,'Shirt','装扮');document.getElementById('environment-tools').append(button);
 const status=document.createElement('span');status.id='apparent-identity';status.className='need disguise';status.hidden=true;status.tabIndex=0;status.setAttribute('role','img');
 status.innerHTML=`${icon('Disguise')}<svg class="face-time-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="face-time-track" cx="20" cy="20" r="18"/><circle class="face-time-left" cx="20" cy="20" r="18" pathLength="100" stroke-dasharray="100"/></svg>`;
 document.querySelector('#environment-tools .body-needs').append(status);const timeRing=status.querySelector('.face-time-left');
 let slot='body',faceSelection=null,preview=null,lastFace='player',opened=false,observeAt=0;
 const slotKey={body:'wornOutfit',head:'hat'},slotName={body:'衣着',head:'斗笠'};
 const worn=(s,key)=>s.ecosystem.items.find(i=>i.id===s.player[key]&&i.location==='player'&&i.hp>0);
 let clothingDrag=null,suppressClickUntil=0;
 const equip=(id,k)=>{const sim=getSim(),r=equipAppearance(sim,id,k);if(r.error)toast(r.error);else{world.appearanceModel?.update(sim.s);render();}};
 function endClothingDrag(){if(!clothingDrag)return;clothingDrag.ghost?.remove();document.querySelectorAll('.wardrobe-drop-target').forEach(el=>el.classList.remove('wardrobe-drop-target'));clothingDrag=null;}
 // Pointer drag works in the game overlay without the browser's native drag loop.
 document.addEventListener('pointermove',e=>{
  const d=clothingDrag;if(!d)return;
  if(!d.ghost&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>8){d.ghost=document.createElement('div');d.ghost.className='wardrobe-drag-ghost';d.ghost.textContent=d.name;document.body.append(d.ghost);}
  if(!d.ghost)return;e.preventDefault();d.ghost.style.left=e.clientX+14+'px';d.ghost.style.top=e.clientY+14+'px';
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');document.querySelectorAll('[data-slot]').forEach(el=>el.classList.toggle('wardrobe-drop-target',el===target));
 });
 document.addEventListener('pointerup',e=>{
  const d=clothingDrag;if(!d)return;const moved=!!d.ghost,target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');endClothingDrag();
  if(moved){suppressClickUntil=performance.now()+300;e.preventDefault();if(target)equip(d.id,target.dataset.slot);}
 });
 document.addEventListener('pointercancel',endClothingDrag);window.addEventListener('blur',endClothingDrag);
 function releaseActor(){if(!preview?.actor)return;preview.actor.removeFromParent();preview.actor.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});preview.actor=null;}
 function modelPreview(){const host=document.querySelector('.wardrobe-preview-host');if(!host)return;if(preview){host.append(preview.renderer.domElement);return;}const canvas=document.createElement('canvas');canvas.id='wardrobe-preview';canvas.setAttribute('aria-label','当前装扮预览');host.append(canvas);const scene=new T.Scene(),camera=new T.PerspectiveCamera(28,1,.1,30),renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));scene.add(new T.HemisphereLight(0xfff2da,0x767c82,3));const light=new T.DirectionalLight(0xffe2b1,3);light.position.set(2,4,5);scene.add(light);camera.position.set(1.9,1.9,4.2);camera.lookAt(0,1.05,0);preview={scene,camera,renderer,sourceVersion:'',actor:null};}
 function render(){const sim=getSim(),s=sim.s,a=appearanceState(s),v=appearanceView(s);faceSelection??=v.face;if(!canUseFace(s,faceSelection))faceSelection='player';const clothes=s.ecosystem.items.filter(i=>i.location==='player'&&i.hp>0&&['clothing','hat'].includes(i.type)),papers=s.ecosystem.items.filter(i=>i.location==='player'&&i.hp>0&&(i.documentId||i.identityPaper||i.type==='document'||i.type==='sealed')),paste=s.ecosystem.items.filter(i=>i.type==='cosmetic'&&i.location==='player'&&i.hp>0).length;
 drawer('装扮',`<div class="wardrobe"><section class="wardrobe-pack"><h3>行囊</h3><div class="wardrobe-grid">${clothes.map(i=>`<button draggable="true" data-wardrobe-item="${esc(i.id)}" aria-label="穿戴${esc(i.name)}">${icon('Shirt')}<span>${esc(i.name)}</span>${Object.values(slotKey).some(k=>s.player[k]===i.id)?'<small>已穿戴</small>':''}</button>`).join('')}</div><h3>随身凭据</h3>${papers.length?papers.map(i=>`<p>${icon('ScrollText')}${esc(i.name)}</p>`).join(''):'<p>尚无凭据</p>'}</section><section class="wardrobe-figure"><div class="wardrobe-preview-host"></div><div class="wardrobe-slots">${Object.entries(slotName).map(([k,n])=>`<button data-slot="${k}" aria-pressed="${slot===k}"><small>${n}</small><span>${esc(worn(s,slotKey[k])?.name||(k==='body'?(feminineBody(s)?'里衣':'赤膊'):'未穿戴'))}</span></button>`).join('')}</div><button data-undress>卸下${slotName[slot]}</button></section><section class="wardrobe-faces"><h3>易容</h3><div class="face-list"><button data-face="player" aria-pressed="${faceSelection==='player'}">本来面貌</button>${knownFaces(s).map(([id,info])=>`<button data-face="${id}" aria-pressed="${faceSelection===id}">${npcPortrait({id,known:true})}<span>${esc(identityName(id))}<small>${esc(info.source==='通缉榜画像'?info.source:s.people[id]?.probed?'已辨认':'已结识')}</small></span></button>`).join('')}</div><p>易容膏 × ${paste}</p><button data-apply-face>${faceSelection==='player'?'卸去易容':'敷膏易容'}</button><p class="wardrobe-current">看起来像${esc(v.role)}<br>${v.face==='player'?'本来面貌':'面貌 · '+esc(v.name)+'<br>余 '+v.remaining+' 分钟'}</p>${v.risk?'<p class="wardrobe-warning">这张面貌正被议论</p>':''}</section></div>`);
 const panel=document.getElementById('drawer');panel.dataset.view='wardrobe';opened=true;
 for(const b of panel.querySelectorAll('[data-wardrobe-item]')){b.draggable=false;b.onpointerdown=e=>{if(e.button!==0)return;const i=clothes.find(i=>i.id===b.dataset.wardrobeItem);clothingDrag={id:i.id,name:i.name,x:e.clientX,y:e.clientY};};b.onclick=()=>{if(performance.now()<suppressClickUntil)return;const i=clothes.find(i=>i.id===b.dataset.wardrobeItem);equip(i.id,{clothing:'body',hat:'head'}[i.type]);};}
 for(const b of panel.querySelectorAll('[data-slot]')){b.onclick=()=>{if(performance.now()<suppressClickUntil)return;slot=b.dataset.slot;render();};b.ondragover=e=>{e.preventDefault();};b.ondrop=e=>{e.preventDefault();e.stopPropagation();equip(e.dataTransfer.getData('application/x-jianghu-item'),b.dataset.slot);};}
 panel.querySelector('[data-undress]').onclick=()=>equip(null,slot);
 for(const b of panel.querySelectorAll('[data-face]'))b.onclick=()=>{faceSelection=b.dataset.face;render();};
 const faceList=panel.querySelector('.face-list'),selected=faceList.querySelector('[aria-pressed="true"]');
 if(selected)faceList.scrollTop=Math.max(0,selected.offsetTop-faceList.offsetTop-faceList.clientHeight/2+selected.offsetHeight/2);
 const applyButton=panel.querySelector('[data-apply-face]');
 if(faceSelection!=='player'&&faceSelection===v.face){applyButton.textContent='已是这副面貌';applyButton.disabled=true;}
 panel.querySelector('[data-apply-face]').onclick=()=>{const r=applyFace(sim,faceSelection);if(r.error)toast(r.error);else{world.appearanceModel?.update(s);render();}};
 modelPreview();
 }
 button.onclick=()=>{if(world.performance||getSim().s.player.hp<=0)return;environment.close();faceSelection=null;render();};
 return {open:render,update(started){const sim=getSim(),s=sim.s,v=appearanceView(s);status.hidden=!started||v.face==='player';
 if(!status.hidden){const label='易容 · '+v.name+' · 余 '+v.remaining+' 分钟';if(status.title!==label){status.title=label;status.setAttribute('aria-label',label);}timeRing.setAttribute('stroke-dashoffset',((1-v.remainingFraction)*100).toFixed(3));}
 button.title='装扮 · 看起来像'+v.role;button.dataset.tooltip=button.title;
 if(started&&(s.npcClock||0)>observeAt){observeAt=(s.npcClock||0)+1;for(const [id,n]of world.npcs){if(n.actor.visible&&s.people[id]?.hp>0&&n.actor.position.distanceTo(world.hero.position)<6&&visibleBetween(world.hero.position,n.actor.position,world.obstacles,environment.eco.s.objects))rememberFace(s,id);}if(lastFace!=='player'&&v.face==='player')toast('易容已褪，恢复本来面貌。');lastFace=v.face;}
 const d=document.getElementById('drawer');if(opened&&(d.hidden||d.dataset.view!=='wardrobe')){opened=false;endClothingDrag();}
 if(opened&&preview){const canvas=preview.renderer.domElement,w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){if(preview.width!==w||preview.height!==h){preview.width=w;preview.height=h;preview.renderer.setSize(w,h,false);preview.camera.aspect=w/h;preview.camera.updateProjectionMatrix();}const sig=JSON.stringify([s.player.face,s.player.wornOutfit,s.player.hat,world.appearanceModel?.root.userData.version]);if(sig!==preview.sourceVersion||!preview.actor){preview.sourceVersion=sig;releaseActor();preview.actor=new T.Group();for(const source of [world.heroModel?.wrapper,world.appearanceModel?.root])if(source)preview.actor.add(clone(source));preview.actor.rotation.y=.15;preview.scene.add(preview.actor);}preview.renderer.render(preview.scene,preview.camera);}}
 }};
}
