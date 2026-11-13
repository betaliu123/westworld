import {WARDROBE_CHEST} from './home-chest.js';
import {currentFace,believedIdentity,disguiseObserverBlock,disguisePreview} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {addCausalDeed} from './item-meaning.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export const bundleGiftActive=s=>s.travelBundleGift?.phase==='giving';
export function travelBundleStock(s){
 const o=s.ecosystem?.objects[WARDROBE_CHEST];
 return o&&o.hp>0&&!o.removed&&!o.burning&&o.owner==='tea_host'?s.ecosystem.items.filter(i=>i.location==='object:'+o.id&&i.hp>0):[];
}
export function offersTravelBundle(s,id){return s.chapterVersion===2&&id==='tea_host'&&currentFace(s)==='qinghe'&&believedIdentity(s,id)==='qinghe'&&!bundleGiftActive(s)&&travelBundleStock(s).length>0;}
export function bundleGiftBlock(s,positions,obstacles=[]){
 if(!offersTravelBundle(s,'tea_host')&&!bundleGiftActive(s))return '包裹已不在原处，或身份已经改变。';
 const o=s.ecosystem?.objects[WARDROBE_CHEST],n=s.people.tea_host,q=positions.tea_host,p=s.player;
 if(!travelBundleStock(s).length||currentFace(s)!=='qinghe'||believedIdentity(s,'tea_host')!=='qinghe')return '眼下不能交付这份包裹。';
 if(p.hp<=0||disguiseObserverBlock(s,'tea_host')||n.concern||n.burning||n.fear||n.sickUntil>(s.ecosystem?.time||0)||n.awareness?.caseOpen||['fight','warn','flee','investigate','search'].includes(n.awareness?.state))return '先处理眼前的状况。';
 if(distance(q,p)>8||distance(q,o)>8||distance(p,o)>8||!visibleBetween(q,p,obstacles,s.ecosystem.objects)||!visibleBetween(q,o,obstacles,s.ecosystem.objects))return '到茶棚包裹旁接取。';
 const check=disguisePreview(s,'tea_host',{context:{positions,obstacles,player:p}});
 return check?.certain&&check.chance===0?check.reason:'';
}
export function beginBundleGift(sim,eco,serial){
 const s=sim.s;if(bundleGiftActive(s)||s.player.face?.serial!==serial||s.identityAccounts?.recognitions['qinghe:tea_host']?.serial!==serial)return false;
 if(bundleGiftBlock(s,eco.positions,eco.obstacles||[]))return false;
 s.travelBundleGift={phase:'giving',serial,elapsed:0,reach:0};sim.save();return true;
}
// The same entities move only at contact. Cancelling, leaving or a new identity
// interrupts the reach before any inventory, provenance or ground prop changes.
export function bundleGiftStep(sim,eco,dt,positions,{paused=false,combat=false}={}){
 const s=sim.s,g=s.travelBundleGift;if(!bundleGiftActive(s))return;
 if(combat||s.player.face?.serial!==g.serial||bundleGiftBlock(s,positions,eco.obstacles||[])){
  g.phase='interrupted';g.reach=0;sim.save();return;
 }
 if(paused)return;
 g.elapsed+=dt;
 if(g.elapsed>30){g.phase='interrupted';g.reach=0;sim.save();return;}
 const o=eco.s.objects[WARDROBE_CHEST],q=positions.tea_host;
 if(distance(q,o)>1.4||distance(s.player,o)>3.2||distance(q,s.player)>2.8||!visibleBetween(o,s.player,eco.obstacles||[],eco.s.objects)){g.reach=0;return;}
 g.reach+=dt;if(g.reach<1.2)return;
 const items=travelBundleStock(s),names=new Map();
 for(const item of items)names.set(item.name,(names.get(item.name)||0)+1);
 const contents=[...names].map(([name,count])=>name+(count>1?' × '+count:'')).join('、');
 const deed=addCausalDeed(s,{key:'qinghe-travel-bundle',title:'认作女儿的行囊',text:'宋茶娘将你认作宋青禾，亲手把远行包裹交给你：'+contents+'。',target:'tea_host',subject:'qinghe',witnesses:['tea_host']});
 for(const item of items){eco.transfer(item,'player','gift',['tea_host']);Object.assign(item.provenance.history.at(-1),{subject:'qinghe',issuer:'tea_host',cause:deed.id});}
 o.removed=true;o.open=false;g.phase='done';g.items=items.map(i=>i.id);g.cause=deed.id;
 s.people.tea_host.memories??=[];s.people.tea_host.memories.push('已把远行包裹交给所认定的青禾。');
 eco.log('收到宋茶娘的远行包裹：'+contents+'。');sim.save();
}
function positions(world){return Object.fromEntries([...world.npcs].filter(([,n])=>n.actor.visible!==false).map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));}
export function bundleGiftFrame(world,dt){
 const eco=world.ecology?.eco;if(!eco||!world.playing)return;
 bundleGiftStep(world.sim,eco,dt,positions(world),{paused:world.locked||!!world.cinematic||!!world.performance||!!world.trainingActor,combat:world.combatReady||!!world.sim.s.complaint});
}
export function bundleGiftMotion(world,id,n,dt){
 const s=world.sim.s;if(id!=='tea_host'||!world.playing||!bundleGiftActive(s)||world.cinematic)return false;
 if(world.locked||world.performance)dt=0;
 const o=s.ecosystem.objects[WARDROBE_CHEST],a=n.actor,before={x:a.position.x,z:a.position.z};
 if(distance(a.position,o)>1.15&&dt){
  if(!n.bundlePath||world.t>=(n.bundleRepath||0)){n.bundleRepath=world.t+.7;n.bundlePath=routinePath(a.position,o,(x,z)=>world.collides(x,z,0,false),1.1);}
  while(n.bundlePath.length&&distance(a.position,n.bundlePath[0])<.15)n.bundlePath.shift();
  const q=n.bundlePath[0];if(q){const d=distance(a.position,q),step=Math.min(d,dt*1.7);if(d>.01){a.rotation.y=turnToward(a.rotation.y,Math.atan2(q.x-a.position.x,q.z-a.position.z),dt);world.move(a,(q.x-a.position.x)/d*step,(q.z-a.position.z)/d*step);}}
 }else a.rotation.y=turnToward(a.rotation.y,Math.atan2(world.hero.position.x-a.position.x,world.hero.position.z-a.position.z),dt);
 world.animateActor(a,dt?distance(a.position,before)/dt/2:0,dt,'');
 if(s.travelBundleGift.reach>0)a.userData.npcUpperBody={kind:'reach'};
 for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop)prop.visible=false;
 return true;
}
