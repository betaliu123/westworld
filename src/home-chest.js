import {visibleBetween} from './npc-awareness.js';
import {COURT_CHEST,courtChestAccess,identityAccounts} from './identity-opportunities.js';
import {believedIdentity,identityName} from './appearance.js';
import {addCausalDeed} from './item-meaning.js';
export const WARDROBE_CHEST='linxi-wardrobe-chest';
export function stockCourtChest(eco){
 const chest=eco.s.objects[COURT_CHEST];if(eco.sim.s.chapterVersion!==2||!chest||chest.stocked)return;
 chest.stocked=true;chest.owner='inspector';const location='object:'+chest.id,base={ownerId:'inspector',discovered:true};
 eco.create('六扇门差旅钱袋','purse',location,{...base,value:120,material:'cloth',chestSlot:'purse'});
 eco.create('六扇门备用外袍','clothing',location,{...base,material:'cloth',identityRole:'官兵',appearanceModel:'guard',chestSlot:'robe'});
 eco.create('解毒药','antidote',location,{...base,material:'herb',chestSlot:'medicine'});
 eco.create('易容膏','cosmetic',location,{...base,material:'herb',chestSlot:'paste'});
}
export function chestTakePreview(eco,id,itemId=null){
 const chest=eco.s.objects[id],p=eco.sim.s.player;
 let reason=chest?.kind!=='chest'||chest.hp<=0||!eco.objectRange(chest,2.3)||!visibleBetween(p,chest,(eco.obstacles||[]).filter(o=>o.id!==id),eco.s.objects)?'先走到箱子旁边。':!chest.open?'先打开木箱。':!eco.items('object:'+id).some(i=>i.hp>0&&(!itemId||i.id===itemId))?'箱里已经没有这件东西了。':'';
 const allowed=id!==COURT_CHEST||courtChestAccess(eco.sim.s,eco);
 if(!reason&&!allowed&&(!p.crouched||!p.stealing))reason='这是六扇门的公物，须先取得取用许可；暗取需蹲行。';
 if(reason)return {certain:true,chance:0,blocked:true,reason};
 return allowed?{certain:true,chance:100}:eco.actionPreview({target:'inspector',item:{id:itemId||id}});
}
export function stockHomeChest(eco){
 const chest=eco.s.objects[WARDROBE_CHEST];if(!chest||chest.stocked)return;
 chest.stocked=true;const location='object:'+chest.id;
 eco.create('素绢罗裙','clothing',location,{material:'cloth',identityRole:'女装行客',appearanceModel:'woman',color:0x8d5278,discovered:true,chestSlot:'robe'});
 for(let i=0;i<3;i++)eco.create('易容膏','cosmetic',location,{material:'herb',discovered:true,chestSlot:'paste'});
}
export function chestAction(eco,action,id,itemId){
 const chest=eco.s.objects[id],p=eco.sim.s.player;
 if(chest?.kind!=='chest'||chest.hp<=0||!eco.objectRange(chest,2.3)||!visibleBetween(p,chest,(eco.obstacles||[]).filter(o=>o.id!==id),eco.s.objects))return '先走到箱子旁边。';
 if(action==='chestOpen'){chest.open=true;eco.log(eco.items('object:'+id).length?id===COURT_CHEST?'揭开公物箱，钱袋、外袍与药盒仍在原处。':'你揭开旧木箱，查看箱中留下的衣物和药盒。':'揭开木箱，里面已经空了。');return;}
 if(action==='chestClose'){chest.open=false;eco.sim.save();return;}
 if(!chest.open)return '先打开木箱。';
 const items=eco.items('object:'+id).filter(i=>i.hp>0&&(action==='chestTakeAll'||i.id===itemId));
 if(!items.length)return '箱里已经没有这件东西了。';
 const check=chestTakePreview(eco,id,action==='chestTakeAll'?null:itemId);if(check.blocked)return check.reason;
 const authorized=id!==COURT_CHEST||courtChestAccess(eco.sim.s,eco);
 let event=null;
 if(!authorized){const r=eco.check('暗取六扇门公物','inspector',{item:{id:action==='chestTakeAll'?id:itemId}});p.energy=Math.max(0,p.energy-3);event={type:'theft',owner:'inspector',target:id,itemId:items[0].id,x:chest.x,z:chest.z,covert:r.success,transferred:r.success};eco.sim.emit('worldIncident',event);if(!r.success){eco.log('未能取出公物，箱中物品仍在。');return;}}
 const witnesses=(event?.witnesses||[]).map(w=>typeof w==='string'?w:w.id);
 for(const item of items){eco.transfer(item,'player',id===COURT_CHEST?authorized?'identity-requisition':'stolen':'found',witnesses);if(id===COURT_CHEST){const s=eco.sim.s,grant=identityAccounts(s).grants[id],subject=authorized?grant.subject:believedIdentity(s,'inspector');const deed=addCausalDeed(s,{key:'court-store:'+item.id,title:authorized?'领用公物':'暗取公物',text:(authorized?identityName(grant.issuer)+'准许'+identityName(subject)+'领走':'公物箱中被取走了')+item.name+'。',target:'inspector',subject,witnesses:authorized?[grant.issuer]:witnesses});item.provenance.history.at(-1).cause=deed.id;item.provenance.history.at(-1).subject=subject;}}
 const names=new Map();for(const i of items)names.set(i.name,(names.get(i.name)||0)+1);
 eco.log('收进包裹：'+[...names].map(([name,count])=>name+(count>1?' × '+count:'')).join('、')+'。');
}
