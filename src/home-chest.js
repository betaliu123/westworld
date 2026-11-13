import {visibleBetween} from './npc-awareness.js';
import {COURT_CHEST,identityAccounts} from './identity-opportunities.js';
import {currentFace} from './appearance.js';
import {addCausalDeed} from './item-meaning.js';
import {propertyAccess,propertyRefusal} from './property-rules.js';
import {theftRisk} from './theft-sight.js';
// Keep the entity key: moving the prop must never refill an old save.
export const WARDROBE_CHEST='linxi-wardrobe-chest';
export const TRAVEL_BUNDLE={id:WARDROBE_CHEST,name:'远行包裹',x:-14.5,z:29,w:1,d:.75,y:.43,owner:'tea_host',kind:'chest',material:'cloth',max:120};
function tagStock(eco,chest){
 for(const i of eco.items('object:'+chest.id)){i.ownerId=chest.owner;i.sourceContainer=chest.id;}
}
export function stockCourtChest(eco){
 const chest=eco.s.objects[COURT_CHEST];if(eco.sim.s.chapterVersion!==2||!chest)return;
 chest.owner='inspector';
 if(!chest.stocked){chest.stocked=true;const location='object:'+chest.id,base={ownerId:'inspector',discovered:true};
  eco.create('六扇门差旅钱袋','purse',location,{...base,value:120,material:'cloth',chestSlot:'purse'});
  eco.create('六扇门备用外袍','clothing',location,{...base,material:'cloth',identityRole:'官兵',appearanceModel:'guard',chestSlot:'robe'});
  eco.create('解毒药','antidote',location,{...base,material:'herb',chestSlot:'medicine'});
  eco.create('易容膏','cosmetic',location,{...base,material:'herb',chestSlot:'paste'});
 }
 tagStock(eco,chest);
}
export function stockHomeChest(eco){
 const chest=eco.s.objects[WARDROBE_CHEST];if(!chest)return;
 Object.assign(chest,TRAVEL_BUNDLE);
 if(!chest.stocked){chest.stocked=true;const location='object:'+chest.id;
  eco.create('素绢罗裙','clothing',location,{material:'cloth',identityRole:'女装行客',appearanceModel:'woman',color:0x3d6470,discovered:true,chestSlot:'robe'});
  for(let i=0;i<3;i++)eco.create('易容膏','cosmetic',location,{material:'herb',discovered:true,chestSlot:'paste'});
 }
 tagStock(eco,chest);
}
function reach(eco,chest){return chest?.kind==='chest'&&chest.hp>0&&eco.objectRange(chest,2.3)&&visibleBetween(eco.sim.s.player,chest,(eco.obstacles||[]).filter(o=>o.id!==chest.id),eco.s.objects);}
function accessPreview(eco,chest){
 const access=propertyAccess(eco,chest),p=eco.sim.s.player;
 if(access.blocked)return {...access,certain:true,chance:0};
 if(!access.allowed&&(!p.crouched||!p.stealing))return {...access,certain:true,chance:0,blocked:true};
 return {...access,certain:true,chance:100};
}
export function chestOpenPreview(eco,id){
 const chest=eco.s.objects[id];
 if(!reach(eco,chest))return {certain:true,chance:0,blocked:true,reason:'先走到物件旁边，避开遮挡。'};
 return accessPreview(eco,chest);
}
export function chestTakePreview(eco,id,itemId=null){
 const chest=eco.s.objects[id],access=chestOpenPreview(eco,id);
 if(access.blocked)return access;
 const reason=!chest.open?'先打开查看。':!eco.items('object:'+id).some(i=>i.hp>0&&(!itemId||i.id===itemId))?'里面已经没有这件东西了。':'';
 if(reason)return {certain:true,chance:0,blocked:true,reason};
 return {...access,sight:theftRisk(access.rows,chest.owner)};
}
function takeStock(eco,chest,items,check){
 const s=eco.sim.s,p=s.player,authorized=check.allowed;
 let event=null;
 if(!authorized){
  // Loose container stock is taken directly. Detection still uses real sight,
  // independently of the transfer; this is not a skill check or growth source.
  event={type:'theft',owner:chest.owner,target:chest.id,itemId:items[0].id,x:p.x,z:p.z,covert:true,transferred:true,sightWitnesses:check.sight?.witnesses};
  eco.sim.emit('worldIncident',event);
 }
 const witnesses=(event?.witnesses||check.rows?.filter(r=>r.state==='watching').map(r=>r.id)||[]).map(w=>typeof w==='string'?w:w.id);
 for(const item of items){
  eco.transfer(item,'player',authorized?'identity-requisition':'stolen',witnesses);
  const grant=identityAccounts(s).grants[chest.id],subject=authorized?check.subject:(event?.identities?.[chest.owner]||currentFace(s));
  const deed=addCausalDeed(s,{key:'property:'+item.id+':'+item.provenance.history.length,title:authorized?'取用物资':'偷取财物',text:(authorized?'取用':'偷取')+chest.name+'里的'+item.name+'。',target:chest.owner,subject,witnesses,identities:event?.identities,incidentType:authorized?undefined:'theft',valence:authorized?'neutral':'harm'});
  Object.assign(item.provenance.history.at(-1),{cause:event?.cause||deed.id,subject,...(authorized&&grant?{issuer:grant.issuer}:{})});
 }
 const names=new Map();for(const i of items)names.set(i.name,(names.get(i.name)||0)+1);
 eco.log((authorized?'收进包裹：':'偷取：')+[...names].map(([name,count])=>name+(count>1?' × '+count:'')).join('、')+'。');
}
export function chestAction(eco,action,id,itemId){
 const chest=eco.s.objects[id];
 if(!reach(eco,chest))return '先走到物件旁边，避开遮挡。';
 if(action==='chestClose'){chest.open=false;eco.sim.save();return;}
 const check=action==='chestOpen'?chestOpenPreview(eco,id):chestTakePreview(eco,id,action==='chestTakeAll'?null:itemId);
 if(check.blocked)return propertyRefusal(eco,chest,check);
 if(action==='chestOpen'){
  if(chest.open)return;
  chest.open=true;eco.log(id===WARDROBE_CHEST?'解开布结，里面叠着罗裙，旁边收着小药盒。':'揭开公物箱，查看剩余的物资。');return;
 }
 if(!['chestTake','chestTakeAll'].includes(action))return '没有这项操作。';
 takeStock(eco,chest,eco.items('object:'+id).filter(i=>i.hp>0&&(action==='chestTakeAll'||i.id===itemId)),check);
}
// Breaking the container does not turn its surviving contents into free loot.
export function takeScatteredStock(eco,item){
 const chest=eco.s.objects[item.sourceContainer],p=eco.sim.s.player;
 if(!chest||item.location!=='ground'||item.hp<=0||!eco.range(item.x,item.z,2.3)||!visibleBetween(p,item,eco.obstacles||[],eco.s.objects))return '先走近物品，避开遮挡。';
 const access=propertyAccess(eco,chest,item);
 if(access.blocked)return propertyRefusal(eco,chest,access);
 if(!access.allowed&&(!p.crouched||!p.stealing))return access.reason;
 const check={...access,certain:true,chance:100,sight:theftRisk(access.rows,chest.owner)};
 takeStock(eco,chest,[item],check);
}
