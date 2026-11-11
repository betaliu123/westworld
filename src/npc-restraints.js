import {abilityCheck,resolveAbilityCheck,attentionModifiers} from './ability-check.js';
import {initSkills,skill} from './skills.js';
import {visibleBetween} from './npc-awareness.js';
import {careerBlock,careerResolve} from './faction-career.js';
import {addCausalDeed} from './item-meaning.js';

export const LASSO_RANGE=6,ROPE_LENGTH=6.5,KNOT_RANGE=2.2;
export const RESTRAINT_LABELS={catch:'抛套索',bind:'近身捆绑',fix:'原地捆住',lead:'牵着走',release:'松绑'};
export const restrained=n=>!!n?.restraint;
export const tiedDown=n=>n?.restraint?.mode==='fixed';
export function ensureLasso(eco){
 const s=eco.sim.s;if(s.chapterVersion!==2)return;
 initSkills(s.player);
 // An additive v2 kit grant, never a daily refill or an ownership migration.
 if(!s.facts.lassoKitIssued){
  if(!eco.s.items.some(i=>i.lassoKit))eco.create('麻绳套索','rope','player',{lassoKit:true,ownerId:'player',material:'cloth',discovered:true});
  s.facts.lassoKitIssued=true;
 }
}
export function restraintOptions(s,id){
 const r=s.people[id]?.restraint;
 const n=s.people[id],subdued=n&&(n.hp<=0||n.stunnedUntil>(s.npcClock||0));
 return r?[{id:r.mode==='fixed'?'lead':'fix',label:RESTRAINT_LABELS[r.mode==='fixed'?'lead':'fix']},{id:'release',label:'松绑'}]:[{id:subdued?'bind':'catch',label:subdued?'近身捆绑':'抛套索'}];
}
export function lawfulRestraint(sim,id){
 const s=sim.s,n=s.people[id];
 return !!n&&n.hp>0&&!n.custodyDelivered&&!!((s.facts.publicWarrant&&id==='thief')||s.facts.warrants?.[id])&&!careerBlock(sim,id,{id:'court_arrest'});
}
export function restraintPreview(sim,eco,id,action='catch'){
 const s=sim.s,p=s.player,n=s.people[id],q=eco.positions[id],r=n?.restraint;
 const rope=r?eco.s.items.find(i=>i.id===r.ropeId&&i.location==='npc:'+id&&i.hp>0):eco.items('player').find(i=>i.type==='rope'&&i.hp>0);
 const d=q?Math.hypot(q.x-p.x,q.z-p.z):Infinity,range=action==='catch'?LASSO_RANGE:KNOT_RANGE;
 const initial=action==='catch'||action==='bind';
 const reason=action==='bind'&&n&&!(n.hp<=0||n.stunnedUntil>(s.npcClock||0))?'对方已恢复行动，先用套索控制。':!Object.hasOwn(RESTRAINT_LABELS,action)?'不能这样使用套索。':!n||!q?'对方已不在这里。':p.hp<=0?'倒地时无法使用套索。':d>range?'距离太远，再靠近些。':!visibleBetween(p,q,eco.obstacles||[],eco.s.objects)?'绳路被挡，换个位置。':initial&&r?'对方已经被拴住。':!initial&&!r?'对方已经没有束缚。':!rope?'套索不在手边，先取回麻绳。':action==='catch'&&skill(p,'lasso').tier<1?'尚不会使用套索。':initial&&p.energy<8?'体力不足，需要 8 点。':action==='fix'&&r?.mode==='fixed'?'对方已经捆在原地。':action==='lead'&&r?.mode==='lead'?'已经牵着绳子。':action==='lead'&&Object.entries(s.people).some(([other,n])=>other!==id&&n.restraint?.mode==='lead')?'先安置手上牵着的人。':action==='catch'&&Object.values(s.people).some(n=>n.restraint?.mode==='lead')?'先安置手上牵着的人。':n.custodyDelivered?'对方已交官府看守。':'';
 const subdued=n&&(n.hp<=0||n.stunnedUntil>(s.npcClock||0)||n.inCustody);
 return abilityCheck(p,{skillId:'lasso',reason,certain:action!=='catch'||!!subdued,difficulty:(n?.skills?.combat?.tier||0)*6,modifiers:action==='catch'?[...attentionModifiers(n,{now:eco.s.time}),...(d>3?[{label:'距离较远',value:-10}]:[])]:[]});
}
export function resolveRestraint(sim,eco,id,action='catch'){
 const check=restraintPreview(sim,eco,id,action);if(check.blocked)return {error:check.reason};
 const s=sim.s,p=s.player,n=s.people[id],q=eco.positions[id],old=n.restraint;
 const {roll,success}=resolveAbilityCheck(check,sim.rng);let incident=null,text;
 if(action==='catch'||action==='bind'){
  p.energy-=8;const lawful=lawfulRestraint(sim,id);
  incident={type:lawful?'warrant':'assault',method:'lasso',target:id,x:p.x,z:p.z};
  // Perception freezes the observer's believed identity before restraint changes the body state.
  sim.emit('worldIncident',incident);
  if(success){
   const rope=eco.items('player').find(i=>i.type==='rope'&&i.hp>0);
   eco.transfer(rope,'npc:'+id,'restraint',incident.witnesses||[]);
   n.restraint={mode:action==='bind'?'fixed':'lead',ropeId:rope.id,at:s.npcClock||0,anchor:{x:q.x,z:q.z},lawful,witnesses:[...(incident.witnesses||[])]};
   n.life={activity:'restrained'};n.eatingUntil=n.drinkingUntil=n.pouringUntil=0;
   if(lawful)careerResolve(sim,eco,id,'court_arrest');
   text=action==='bind'?'你趁对方无法行动，近身捆好手脚。按 Z 蹲下后可查看随身行囊。':'绳圈收紧，已牵住对方。靠近可捆住手脚或松绑。';
  }else text='绳圈落空，对方避开了。';
 }else if(action==='release'){
  eco.transfer(eco.s.items.find(i=>i.id===old.ropeId),'player','released');delete n.restraint;n.life={activity:'idle'};
  if(old.lawful&&!n.custodyDelivered)n.inCustody=false;
  text='你解开绳结，收回套索。对方重新可以行动。';
 }else{
  old.mode=action==='fix'?'fixed':'lead';old.anchor={x:q.x,z:q.z};n.life={activity:'restrained'};
  text=action==='fix'?'你近身捆好手脚，对方留在原地。按 Z 蹲下后可查看随身行囊。':'你解开脚上的绳结，握住绳头，可以牵行了。';
 }
 // Restraints grant no attribute XP, relationship reward or repeatable bounty.
 const result={type:'npc',actionId:'lasso_'+action,label:RESTRAINT_LABELS[action],kind:'steal',roll,check,success,text,changes:[],handledPresentation:true};
 s.history.push(result);sim.emit('result',result);
 if(success){s.restraintSeq=(s.restraintSeq||0)+1;addCausalDeed(s,{key:'restraint:'+s.restraintSeq,title:RESTRAINT_LABELS[action],text,target:id,valence:['catch','bind'].includes(action)&&!n.restraint?.lawful?'harm':'neutral',witnesses:incident?.witnesses||[],identities:incident?.identities||{}});}
 sim.save();return result;
}
// Opening/closing a menu cannot roll; the single settlement occurs on contact.
export function beginRestraintAttempt(sim,eco,id,action){
 const preview=restraintPreview(sim,eco,id,action);if(preview.blocked)return {error:preview.reason};
 const p=sim.s.player,origin={x:p.x,z:p.z},hp=p.hp;let done=false;
 const interrupted=()=>p.hp<hp||p.hp<=0||Math.hypot(p.x-origin.x,p.z-origin.z)>.35||restraintPreview(sim,eco,id,action).blocked;
 return {preview,interrupted,cancel(){done=true;},finish(){if(done)return {error:'动作已结束。'};done=true;if(interrupted())return {error:'动作中断，未改变束缚。'};return resolveRestraint(sim,eco,id,action);}};
}
export function restraintStep(sim,eco){
 for(const [id,n] of Object.entries(sim.s.people)){
  const r=n.restraint;if(!r)continue;
  const rope=eco.s.items.find(i=>i.id===r.ropeId),q=eco.positions[id]||n,p=sim.s.player;
  if(!rope||rope.hp<=0||rope.location!=='npc:'+id){delete n.restraint;continue;}
  // Losing the held end releases a lasso, not a magically tightened ankle knot.
  if(r.mode==='lead'&&(p.hp<=0||Math.hypot(q.x-p.x,q.z-p.z)>ROPE_LENGTH+2)){
   eco.transfer(rope,'ground','dropped');rope.x=q.x;rope.z=q.z;delete n.restraint;
   if(r.lawful&&!n.custodyDelivered)n.inCustody=false;
   eco.log('绳头脱手，套索落在对方脚边。');
  }
 }
}
export function ropeAllowsMove(s,origin,next,positions,obstacles=[]){
 for(const [id,n] of Object.entries(s.people)){
  if(n.restraint?.mode!=='lead')continue;const q=positions[id];if(!q)continue;
  const before=Math.hypot(origin.x-q.x,origin.z-q.z),after=Math.hypot(next.x-q.x,next.z-q.z);
  if(after>ROPE_LENGTH&&after>before+.001)return false;
  if(!visibleBetween(next,q,obstacles,s.ecosystem?.objects)&&after>before+.001)return false;
 }return true;
}
