import {currentFace,believedIdentity,disguiseObserverBlock,needsDisguiseCheck,identityName} from './appearance.js';
import {COURT_CHEST,courtChestAccess} from './identity-opportunities.js';
import {factionAuthority} from './faction-discipline.js';
import {theftObserver} from './theft-sight.js';
import {theftVisibleBetween} from './npc-awareness.js';
import {PEOPLE} from './data.js';

export function propertyOwner(eco,object,item=null){
 if(item){
  const last=item.provenance?.history.at(-1);
  if(last?.from==='player'&&last.to==='ground')return 'player';
  return item.ownerId||item.owner||object?.owner||null;
 }
 return object?.owner||null;
}
export function propertyLabel(eco,object,item=null){
 const owner=propertyOwner(eco,object,item),s=eco.sim.s;
 const known=['tea_host','inspector'].includes(owner)||s.people[owner]?.metPlayer||s.people[owner]?.probed||s.intelligence?.people?.[owner];
 const court=(object?.id===COURT_CHEST||item?.sourceContainer===COURT_CHEST)&&owner!=='player';
 return '所属：'+(court?'六扇门 · 顾钦差看管':owner==='player'?'你':owner?known?identityName(owner):'主人未明':'无主');
}
export function propertyObservers(eco){
 const s=eco.sim.s,p=s.player;
 return Object.entries(eco.positions).filter(([,q])=>q.visible!==false).map(([id,q])=>theftObserver(s,id,q,p,theftVisibleBetween(q,p,eco.obstacles||[],eco.s.objects)));
}
// Browsing and execution call the same rule. Looking never rolls or grants a permit.
export function propertyAccess(eco,object,item=null){
 const s=eco.sim.s,owner=propertyOwner(eco,object,item),face=currentFace(s),rows=propertyObservers(eco);
 if(!owner||owner==='player')return {allowed:true,rows,subject:face};
 const capable=id=>!disguiseObserverBlock(s,id)&&!['fight','flee','search'].includes(s.people[id]?.awareness?.state);
 const watching=rows.filter(r=>r.state==='watching'&&capable(r.id));
 const court=object?.id===COURT_CHEST||item?.sourceContainer===COURT_CHEST;
 const member=face==='player'&&factionAuthority(s,'court')&&eco.items('player').some(i=>i.badge==='court'&&i.hp>0&&!i.badgeRevoked&&!i.badgeSuspended);
 const eligible=(court?face==='traveler'||PEOPLE.find(p=>p.id===face)?.faction==='六扇门':face!=='player'&&face===owner)&&(face===owner||believedIdentity(s,owner)===face);
 const grant=court&&courtChestAccess(s,eco);
 if(eligible||grant){
  const context={positions:eco.positions,obstacles:eco.obstacles||[],player:s.player};
  const challenge=watching.find(r=>needsDisguiseCheck(s,r.id,{context}));
  if(challenge)return {allowed:false,blocked:true,...(challenge.distance<=3.5?{challenge:challenge.id}:{interceptor:challenge.id}),reason:identityName(challenge.id)+'要先核对你的身份。',rows};
 }
 const exposed=watching.some(r=>believedIdentity(s,r.id)!==face);
 if(!owner||owner==='player'||member||grant||eligible&&!exposed)return {allowed:true,rows,subject:face};
 const guard=watching.find(r=>r.id===owner||court&&['inspector','guard','gate_guard','gate_relief'].includes(r.id));
 if(guard)return {allowed:false,blocked:true,interceptor:guard.id,reason:identityName(guard.id)+'正看着这里，会拦住你。',rows};
 return {allowed:false,rows,reason:'这是有主的物品；暗取需蹲行。'};
}
export function propertyRefusal(eco,object,check){
 if(check.challenge){eco.sim.emit('propertyChallenge',{id:check.challenge,object:object.id});return check.reason;}
 if(check.interceptor){
  const id=check.interceptor,n=eco.sim.s.people[id],now=eco.sim.s.npcClock||0;
  if(n.propertyStop?.object!==object.id||n.propertyStop.until<=now){
   n.propertyStop={object:object.id,until:now+4};
   const line=object.id===COURT_CHEST?'且慢，六扇门的公物，不能随意翻动。':object.id==='linxi-wardrobe-chest'?'别动，那是我给女儿备的远行包裹。':'这是有主的东西，别随意翻动。';
   eco.log(identityName(id)+'拦住你，东西仍在原处。',[{id,text:line}]);
  }
  return check.reason;
 }
 return check.reason;
}
