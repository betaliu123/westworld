import {currentFace,believedIdentity,disguisePreview,checkDisguise,appearanceTime,disguiseObserverBlock} from './appearance.js';
import {identityOpportunityOptions,identityOpportunityPreview,resolveIdentityOpportunity} from './identity-opportunities.js';
import {visibleBetween} from './npc-awareness.js';
import {placePayment} from './cash-transfers.js';
import {addCausalDeed} from './item-meaning.js';
import {convoyState,convoyDepartureBlock,inspectConvoyCargo} from './convoy.js';

const AMOUNT=6;
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export const favorState=s=>s.identityFavors??={};
const busy=(s,n)=>!n||n.hp<=0||n.stunnedUntil>(s.npcClock||0)||n.muteUntil>(s.npcClock||0)||n.sickUntil>(s.ecosystem?.time||0)||n.drowning||n.restraint||n.inCustody||n.awareness?.caseOpen||['fight','warn','flee','investigate','search'].includes(n.awareness?.state)||['sleep','doze','escape','privacy'].includes(n.life?.activity);
export const favorContext=eco=>eco&&({positions:eco.positions,obstacles:eco.obstacles||[],player:eco.sim.s.player});
const counterpart={porter:'fu',fu:'porter'};
export function identityFavorOptions(sim,id){
 const opportunities=identityOpportunityOptions(sim,id);if(opportunities.length)return opportunities;
 const s=sim.s,subject=counterpart[id];if(s.chapterVersion!==2||!subject||currentFace(s)!==subject||believedIdentity(s,id)!==subject)return [];
 const f=favorState(s),c=convoyState(s),list=[],add=(key,label,extra={})=>list.push({id:'if_'+key,label,mode:'contact',kind:'listen',story:true,...extra});
 if(id==='porter'){
  if(!f.loan)add('loan','【符祥】先支我六文，记在我名下',{stat:'charm'});
  else if(!f.loan.repayment)add('repay','把先前支的六文还给他',{cost:AMOUNT});
 }
 if(c.phase==='gate'&&!c.command)add('depart',id==='porter'?'【符祥】纲车可以发车了，跟上':'【周大石】符管事，已准备妥当，可以发车了',{stat:'charm'});
 if(!list.length&&id==='porter'&&f.loan&&!f.reviewed)add('recall','问起先前托办的事');
 return list;
}
export function identityFavorPreview(sim,id,a,eco){
 if(a?.id.startsWith('if_identity_'))return identityOpportunityPreview(sim,id,a,eco);
 const s=sim.s,n=s.people[id];let reason='';
 if(!identityFavorOptions(sim,id).some(x=>x.id===a.id))reason='这件事已说定，或面貌已经改变。';
 else if(disguiseObserverBlock(s,id))reason=disguiseObserverBlock(s,id);
 else if(busy(s,n)||s.player.hp<=0)reason='先处理眼前的状况。';
 else if(eco&&(!eco.positions[id]||distance(s.player,eco.positions[id])>3.5||!visibleBetween(s.player,eco.positions[id],eco.obstacles||[],eco.s.objects)))reason='先到对方跟前说话。';
 else if(a.id==='if_loan'&&(n.purse||0)<AMOUNT)reason='他身上已凑不齐六文。';
 else if(a.id==='if_repay'&&s.player.money<AMOUNT)reason='盘缠不足六文。';
 else if(a.id==='if_depart')reason=convoyDepartureBlock(s,[id])||(eco&&distance(eco.positions[id],convoyState(s))>7?'先回到纲车旁发车。':'');
 const identity=disguisePreview(s,id,{force:true,context:favorContext(eco)});
 if(!reason&&identity?.certain&&identity.chance===0)reason=identity.reason;
 if(reason)return {blocked:true,certain:true,chance:0,reason};
 return a.stat?identity:{certain:true,chance:100};
}
function record(sim,key,title,text,extra={}){
 addCausalDeed(sim.s,{key:'fu-favor:'+key,title,text,target:'porter',subject:'fu',witnesses:['porter'],...extra});
 const n=sim.s.people.porter;n.memories.push(text);n.memories=n.memories.slice(-12);
}
export function resolveIdentityFavor(sim,eco,id,action){
 if(action.startsWith('if_identity_'))return resolveIdentityOpportunity(sim,eco,id,action);
 const s=sim.s,a=identityFavorOptions(sim,id).find(a=>a.id===action);
 if(!a)return {error:'这件事已说定，或身份已经改变。'};
 if(action==='if_depart')inspectConvoyCargo(sim,eco,eco.positions);
 const check=identityFavorPreview(sim,id,a,eco);if(check.blocked)return {error:check.reason};
 const f=favorState(s),q=eco.positions[id];
 const result=a.stat&&!check.certain?checkDisguise(sim,id,{context:favorContext(eco)}):{success:true,roll:null,check};
 if(result.error)return result;
 let text='';
 if(!result.success)text=id==='porter'?'不对，言行和符管事对不上。你到底是谁？':'周大石可不是这样说话的。你到底是谁？';
 else switch(action){
  case 'if_loan':{
   const pile=placePayment(sim,eco,{payer:id,payee:'player',amount:AMOUNT,x:q.x+.45,z:q.z+.15,stand:q,reason:'周大石借给符祥的六文'});
   if(!pile)return {error:'他身上已凑不齐六文。'};s.people.porter.payingUntil=eco.s.time+1.2;
   f.loan={amount:AMOUNT,itemId:pile.id,subject:'fu',serial:s.player.face.serial,at:appearanceTime(s)};
   text='符管事，六文在这里。是我自己的钱，回头还请照数还我。';
   record(sim,'loan','冒名支钱','周大石将自己的六文放在地上，认定借钱的是符祥。');break;
  }
  case 'if_repay':{
   const pile=placePayment(sim,eco,{payer:'player',payee:id,amount:AMOUNT,x:q.x+.45,z:q.z+.15,stand:q,reason:'归还周大石的借款'});
   if(!pile)return {error:'盘缠不足六文。'};
   f.loan.repayment=pile.id;text='钱放这里就好，等我收好再销账。后头还得留盘缠，我不再往外借了。';
   record(sim,'repay','归还借款','以符祥的面貌归还六文，钱放在周大石身边，待他实际收取。');break;
  }
  case 'if_depart':{
   const c=convoyState(s),subject=counterpart[id],original=eco.positions[subject]||s.people[subject];
   c.command={subject,receiver:id,serial:s.player.face.serial,at:appearanceTime(s),originalPost:{x:original.x,z:original.z}};
   c.phase='travel';c.route=0;c.approved[subject]='冒名发车口令';
   if(f.escort?.status==='walking')f.escort.status='superseded';
   text=id==='porter'?'是，符管事。我来拉车，您随车走。':'既已备妥，就动身。我来照看车，你随车跟上。';
   addCausalDeed(s,{key:'convoy-command',title:'冒名发车',text:id==='porter'?'周大石听信符祥的面貌，开始拉车进关。':'符祥听信周大石的面貌，开始领车进关。',target:id,subject,witnesses:[id]});break;
  }
  case 'if_recall':f.reviewed=true;text=f.loan?.repaid?'那六文已经收回了。手头的盘缠不能再支了。':'先前那六文还没收回，我记着呢。';break;
 }
 const r={...result,presentation:'dialogue',handledPresentation:true,type:'npc',actionId:action,eventId:'identity-favor:'+action,label:a.label,kind:'listen',motion:'talk',changes:[],text,dialogue:[{id:'player',text:({if_repay:'先前支的六文，还给你。',if_recall:'先前托你办的事，还记得么？'}[action]||a.label.replace(/^【[^】]+】/,''))},{id,text}],authored:true,causalRecorded:true};
 s.history.push(r);sim.emit('result',r);sim.save();return r;
}
// Retain old v2 receipts and debt, but retire unfinished guarantor walks.
export function identityEscortStep(sim,eco){
 const f=favorState(sim.s);
 if(f.escort?.status==='walking'){f.escort.status='superseded';if(sim.s.people.porter.life?.activity==='identityEscort')sim.s.people.porter.life={activity:'idle'};sim.save();}
 if(f.loan?.repayment&&!f.loan.repaid&&eco.s.items.some(i=>i.id===f.loan.repayment&&i.settled&&i.location==='collected')){f.loan.repaid=true;sim.save();}
}
