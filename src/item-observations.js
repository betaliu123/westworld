import {believedIdentity,currentFace,clothing,disguiseObserverBlock} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {addCausalDeed} from './item-meaning.js';

// Possession is evidence of possession, never proof that the holder stole it.
export function observeItem(sim,id,item,mode){
 const s=sim.s,subject=believedIdentity(s,id),key=[id,item.id,subject,mode].join(':');
 s.itemObservations??={};if(s.itemObservations[key])return s.itemObservations[key];
 const deed=addCausalDeed(s,{key:'item-seen:'+key,title:({show:'出示',gift:'递交',trade:'议价'})[mode]+item.name,
  text:`对方当面看见了${item.name}，记下持有人；物品来历尚不能仅凭持有断定。`,target:id,subject,witnesses:[id]});
 return s.itemObservations[key]={observer:id,item:item.id,name:item.name,subject,face:currentFace(s),garment:clothing(s)?.name||null,day:s.day,at:s.npcClock||0,mode,cause:deed.id};
}
export function knownItemLoss(s,id,item){
 return (s.investigations?.cases||[]).find(c=>c.missingItems?.includes(item.id)&&c.reports?.some(r=>r.officer===id));
}
export function linkItemReports(sim,positions={},obstacles=[]){
 const s=sim.s;
 for(const c of s.investigations?.cases||[]){
  for(const officer of new Set(c.reports?.map(r=>r.officer)||[])){
   if(disguiseObserverBlock(s,officer))continue;
   for(const o of Object.values(s.itemObservations||{})){
    if(!c.missingItems?.includes(o.item)||c.reports.some(r=>r.kind==='possession'&&r.officer===officer&&r.observation===o.cause))continue;
    const a=positions[officer],b=positions[o.observer];
    if(o.observer!==officer&&(!a||!b||disguiseObserverBlock(s,o.observer)||[officer,o.observer].some(id=>['fight','flee','warn'].includes(s.people[id]?.awareness?.state))||Math.hypot(a.x-b.x,a.z-b.z)>3.5||!visibleBetween(a,b,obstacles,s.ecosystem?.objects)))continue;
    const deed=addCausalDeed(s,{key:`item-link:${c.id}:${officer}:${o.cause}`,title:'失物与持有记录对上',
     text:`报失的${o.name}曾被出示或递交，官差取得当时持有人面貌的线索；尚不能据此认定偷窃。`,target:officer,subject:o.subject,cause:o.cause,witnesses:[o.observer]});
    c.reports.push({kind:'possession',reporter:o.observer,officer,subject:o.subject,face:o.face,garment:o.garment,item:o.item,observation:o.cause,cause:deed.id,at:s.npcClock||0});
    deed.itemInquiry={item:o.item,name:o.name,observer:o.observer,caseId:c.id};
    s.people[officer].memories??=[];s.people[officer].memories.push(`报失的${o.name}与先前持有记录相符，须核问来路，尚未定罪。`);sim.save();
   }
  }
 }
}
