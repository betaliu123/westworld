import {recordConvoyAftermath} from './convoy-aftermath.js';
import {recordCrimeScene} from './crime-investigation.js';
import {appearanceView,believedIdentity,attributeIncident} from './appearance.js';
import {abilityCheck,resolveAbilityCheck} from './ability-check.js';
import {visibleBetween} from './npc-awareness.js';
import {surfacePoint} from './materials.js';
import {addCausalDeed} from './item-meaning.js';
import {earnReputation} from './reputation.js';
import {placePayment} from './cash-transfers.js';
import {admitRoute} from './gate-scene.js';

export const CART='flowerstone-cart';
export const CONVOY_GATE={x:7.8,z:32.5};
// Keep the office porch and the cross passage behind the parked wagon clear.
export const CONVOY_TOWN={x:0,z:-16};
export const CONVOY_STONE={x:4.2,z:32.5};
export const CONVOY_CREW=['porter','fu'];
export const convoyCrew=s=>s.convoy?.command?[s.convoy.command.receiver]:CONVOY_CREW;
export const CONVOY_ENTRY_LINE='衣着齐整了，跟上。进关后把车送到镇公所门前。';
export function convoyState(s){
 if(!s.convoy)s.convoy={...CONVOY_GATE,phase:'gate',route:0,approved:{},attempts:{},banned:{},incidents:{},posts:{}};
 const c=s.convoy;
 if(!c.version){c.version=1;if(s.chapter?.done?.convoy_work)c.approved.player='旧日允诺';}
 return c;
}
export function convoyApproved(s){return !!convoyState(s).approved[believedIdentity(s,'porter')];}
export function convoyBlock(s){const c=convoyState(s);return c.theftKnown?.porter?.includes(believedIdentity(s,'porter'))?'你动过纲货，这班役夫不会再收你。':c.closed?'纲货有失，车队已封车清点，不能再带人进关。':'';}
export function convoyOptions(s){
 const c=convoyState(s),list=[],add=(id,label,extra={})=>list.push({id:'ch_'+id,label,mode:'contact',kind:'listen',story:true,...extra});
 if(s.facts.enteredCity)return list;
 if(convoyBlock(s)){add('convoy_refused','还肯带我进关么？');return list;}
 if(convoyApproved(s)){add('convoy_enter','【挑夫】随役夫队进城');return list;}
 if(!c.asked){add('convoy_work',appearanceView(s).role==='挑夫'?'我已换好短褂，能跟这班役夫么？':'花石纲可还缺抬箱的人？');return list;}
 const attempts=c.attempts[believedIdentity(s,'porter')]||{};
 add('convoy_bribe','【金钱】六文茶钱，劳你通融',{cost:6});
 if(!attempts.might)add('convoy_strength','【臂力】搬起大石，给你看看',{stat:'might',difficulty:10,motion:'lift'});
 if(!attempts.charm&&appearanceView(s).role==='女装行客')add('convoy_charm','【魅惑】含笑请他留个位置',{stat:'charm',difficulty:10});
 return list;
}
export function convoyDepartureBlock(s,crew=convoyCrew(s)){
 const c=convoyState(s),cart=s.ecosystem?.objects?.[CART];
 if(c.closed)return '纲货有失，车队正在封车清点';
 if(cart?.hp<=0)return '货车已经损坏，无法随队过关';
 for(const id of crew){const n=s.people[id];if(!n||n.hp<=0||n.restraint||n.stunnedUntil>(s.npcClock||0)||n.sickUntil>(s.ecosystem?.time||0)||n.drowning||n.inCustody||n.awareness?.caseOpen||['fight','warn','flee','investigate','search'].includes(n.awareness?.state)||['sleep','doze','escape','privacy'].includes(n.life?.activity))return '押运人暂时无法动身，等他们恢复再来';if(Number.isFinite(n.x)&&Math.hypot(n.x-c.x,n.z-c.z)>7)return '押运人尚未到齐，先等他们回到车旁';}
 return '';
}
export function convoyPreview(sim,a){
 const s=sim.s,p=s.player,c=convoyState(s);let reason=convoyBlock(s);
 if(a.id==='ch_convoy_refused')reason='';
 else if(a.id==='ch_convoy_enter'&&!reason)reason=!convoyApproved(s)?'还未得到周大石同意':appearanceView(s).role!=='挑夫'?'【未备】换上挑夫装束':convoyDepartureBlock(s);
 else if(a.id==='ch_convoy_charm'&&!reason&&appearanceView(s).role!=='女装行客')reason='【未备】须实际穿着女装';
 if(!reason&&p.money<(a.cost||0))reason='需六文茶钱';
 if(!reason&&a.id==='ch_convoy_strength'&&c.pendingStrength?.subject!==believedIdentity(s,'porter')&&p.energy<6)reason='至少需要六点体力';
 if(a.id==='ch_convoy_strength'&&c.pendingStrength?.subject===believedIdentity(s,'porter'))return {...c.pendingStrength.result.check,reason,blocked:!!reason};
 return a.stat?abilityCheck(p,{stat:a.stat,skillId:a.stat==='might'?'combat':'disguise',difficulty:10,reason}):{score:0,chance:reason?null:100,certain:!reason,blocked:!!reason,reason};
}
export function approveConvoy(sim,eco,method){
 const s=sim.s,c=convoyState(s),subject=believedIdentity(s,'porter');if(c.approved[subject])return [];
 c.approved[subject]=method;s.facts.convoySchedule=true;
 const changes=[];
 if(!c.coatIssued){c.coatIssued=true;if(!eco.items('player').some(i=>i.hp>0&&i.type==='clothing'&&(/役夫|短褂/.test(i.name)||i.ownerId==='porter'))){const coat=eco.create('役夫短褂','clothing','npc:porter',{discovered:true,ownerId:'porter',material:'cloth'});eco.transfer(coat,'player','lent');changes.push('获得：役夫短褂');}}
 return changes;
}
// A physical demonstration is only settled by the animation's completion ticket.
export function beginConvoyStrength(sim,eco){
 const a=convoyOptions(sim.s).find(a=>a.id==='ch_convoy_strength');if(!a)return {error:'眼下没有这场试力。'};
 const check=convoyPreview(sim,a);if(check.blocked)return {error:check.reason};
 return {action:a,check,start:{x:sim.s.player.x,z:sim.s.player.z},subject:believedIdentity(sim.s,'porter'),completed:false,cancelled:false};
}
export function strengthReady(sim,eco,ticket){
 const s=sim.s,n=s.people.porter,q=eco.positions.porter;
 if(!(eco.s.objects['convoy-trial-stone']?.hp>0))return false;
 return !!ticket&&!ticket.cancelled&&s.player.hp>0&&n?.hp>0&&!(n.stunnedUntil>(s.npcClock||0))&&!n.awareness?.caseOpen&&!['fight','warn','flee'].includes(n.awareness?.state)&&q&&Math.hypot(q.x-CONVOY_STONE.x,q.z-CONVOY_STONE.z)<5&&Math.hypot(s.player.x-CONVOY_STONE.x,s.player.z-CONVOY_STONE.z)<2&&visibleBetween(s.player,CONVOY_STONE,eco.obstacles||[],eco.s.objects)&&ticket.subject===believedIdentity(s,'porter')&&!convoyBlock(s);
}
export function settleConvoyStrength(sim,eco,ticket){
 if(!strengthReady(sim,eco,ticket)||!ticket.ready||ticket.completed)return {error:'试力已经中止，没有结算。'};
 const a=convoyOptions(sim.s).find(a=>a.id==='ch_convoy_strength');if(!a)return {error:'这场试力已经结束。'};
 const check=convoyPreview(sim,a);if(check.blocked)return {error:check.reason};ticket.completed=true;
 const c=convoyState(sim.s),cached=c.pendingStrength;
 if(cached?.subject===ticket.subject)return cached.result;
 const result={...resolveAbilityCheck(check,sim.rng),action:a};sim.s.player.energy-=6;c.pendingStrength={subject:ticket.subject,result};sim.save();return result;
}
export const isConvoyAction=id=>['work','bribe','strength','charm','enter','refused'].some(key=>id==='ch_convoy_'+key);
export function resolveConvoyTalk(sim,eco,action,physical=null){
 const s=sim.s,c=convoyState(s),a=convoyOptions(s).find(a=>a.id===action),n=s.people.porter,q=eco.positions.porter;
 if(!a||!n||n.hp<=0||s.player.hp<=0||n.stunnedUntil>(s.npcClock||0)||n.awareness?.caseOpen||['fight','flee'].includes(n.awareness?.state))return {error:'这件事眼下说不成。'};
 if(q&&(!eco.range(q.x,q.z,4.8)||!visibleBetween(s.player,q,eco.obstacles||[],eco.s.objects)))return {error:'先到周大石跟前再说。'};
 if(action==='ch_convoy_enter')inspectConvoyCargo(sim,eco,eco.positions);
 const check=convoyPreview(sim,a);if(check.blocked)return {error:check.reason};
 if(action==='ch_convoy_strength'&&!physical)return {trainingConvoy:beginConvoyStrength(sim,eco)};
 const subject=believedIdentity(s,'porter'),attempts=c.attempts[subject]??={};let text='',changes=[],follow=[],roll=null,success=true,resultCheck=check;
 if(action==='ch_convoy_work'){c.asked=true;s.facts.convoySchedule=true;text='人手够了，不招了。纲货出了岔子，谁也担不起。';follow=['convoy_bribe','convoy_strength','convoy_charm'];}
 if(action==='ch_convoy_refused')text=convoyBlock(s);
 if(action==='ch_convoy_bribe'){
  const at=q||{x:5,z:31},payment=placePayment(sim,eco,{payer:'player',payee:'porter',amount:6,x:at.x+.4,z:at.z+.4,stand:at,reason:'托周大石通融入队'});
  if(!payment)return {error:'需六文茶钱。'};payment.collectAt=eco.s.time;
  changes=['盘缠 −6',...approveConvoy(sim,eco,'茶钱')];text='这份心意我领了。行，你算一个；换好短褂，别碰车上的纲货。';follow=['convoy_enter'];
 }
 if(action==='ch_convoy_strength'||action==='ch_convoy_charm'){
  const result=physical||resolveAbilityCheck(check,sim.rng);if(result.error)return result;
  if(action==='ch_convoy_strength')delete c.pendingStrength;
  ({roll,success}=result);resultCheck=result.check;attempts[action==='ch_convoy_strength'?'might':'charm']=true;
  if(action==='ch_convoy_strength')changes.push('体力 −6');
  if(success){changes.push(...approveConvoy(sim,eco,action==='ch_convoy_strength'?'搬石试力':'含笑说情'));text=action==='ch_convoy_strength'?'这块石头你真搬得起来。行，留你一个位置，换好短褂跟上。':'话说得倒动听。好，给你留个位置；上工还得换短褂，车上的纲货别动。';follow=['convoy_enter'];}
  else{text=action==='ch_convoy_strength'?'放稳，别闪了腰。你这力气，眼下还扛不住这份活。':'好话我听了，可这份差事不能凭一句好话就应下。';follow=['convoy_bribe','convoy_strength','convoy_charm'];}
 }
 if(action==='ch_convoy_enter'){if(!admitRoute(sim,'convoy'))return {error:'眼下已不在关外入队。'};text=CONVOY_ENTRY_LINE;c.phase='travel';}
 const r={type:'npc',presentation:'dialogue',handledPresentation:true,day:s.day,eventId:'convoy:'+action,actionId:action,label:a.label,kind:'listen',motion:a.motion||'talk',roll,check:resultCheck,success,text,changes,dialogue:[{id:'porter',text}],authored:true,follow,causalRecorded:true};
 s.history.push(r);addCausalDeed(s,{key:'convoy:'+subject+':'+action,title:a.label,text,target:'porter',subject});sim.emit('result',r);sim.save();return r;
}
export function stockConvoy(eco){
 if(eco.sim.s.chapterVersion!==2)return;const c=convoyState(eco.sim.s);if(c.stocked)return;c.stocked=true;c.cargo=[];
 for(const [name,slot,material]of [['贡石残样','stone','stone'],['黄封绢包','silk','cloth'],['装着鸣禽的竹笼','cage','wood']]){const item=eco.create(name,'cargo','object:'+CART,{ownerId:'fu',convoyCargo:slot,material,discovered:true});c.cargo.push(item.id);}
}
export function convoyTheftPreview(eco,itemId){
 const p=eco.sim.s.player,o=eco.s.objects[CART],item=eco.s.items.find(i=>i.id===itemId);let reason='';
 if(!o||o.hp<=0||!item?.convoyCargo||item.location!=='object:'+CART||item.hp<=0)reason='这件纲货已不在车上。';
 else if(!p.stealing||!p.crouched)reason='按 Z 蹲下后可尝试偷取';
 else if(!eco.objectRange(o,2.3)||!visibleBetween(p,surfacePoint(o,p),(eco.obstacles||[]).filter(x=>x.id!==CART),eco.s.objects))reason='再靠近些，隔着障碍够不到。';
 return eco.actionPreview({target:'fu',item,difficulty:15,reason});
}
export function recordConvoyTheft(sim,eco,event,item){
 const c=convoyState(sim.s),witnesses=event.witnesses||[];if(!witnesses.length)return;
 const key=item.id+':'+sim.s.day;if(c.incidents[key])return;c.incidents[key]=true;if(witnesses.some(id=>CONVOY_CREW.includes(id)))c.closed=true;c.theftKnown??={};for(const id of witnesses){const subject=event.identities?.[id]||attributeIncident(sim.s,id,event);(c.theftKnown[id]??=[]).push(subject);}
 const subjects=[...new Set(witnesses.map(id=>event.identities?.[id]||attributeIncident(sim.s,id,event)))];
 for(const subject of subjects){c.banned[subject]=true;earnReputation(sim,{subject,amount:-15,reason:'被目击盗取花石纲贡物',key:'convoy-theft:'+subject});}
 if(subjects.includes('player'))sim.s.wanted=Math.min(9,sim.s.wanted+4);
 for(const id of witnesses){const n=sim.s.people[id];if(n?.awareness){n.awareness.severe=true;n.awareness.state=['guard','gate_guard','gate_relief','inspector'].includes(id)?'fight':CONVOY_CREW.includes(id)?'notice':n.awareness.state;n.awareness.until=(sim.s.npcClock||0)+(CONVOY_CREW.includes(id)?2:20);}}
 recordConvoyAftermath(sim,event,item);
 addCausalDeed(sim.s,{key:'convoy-theft:'+key,title:'盗取纲货被目击',text:c.closed?'押运人看见了偷窃，封车清点，不再带人进关。':'目击者记住了盗取纲货的人；押运人尚未得知。',target:'fu',subject:subjects[0],witnesses,valence:'harm'});
 eco.log((c.closed?'盗取纲货被押运人看见，车队封车；':'盗取纲货被目击；')+(subjects.includes('player')?'嫌疑 +4，地方声望 −15。':'目击者记住了当时认出的面貌。'));
}
export function stealConvoyCargo(eco,itemId,{staged=false}={}){
 const check=convoyTheftPreview(eco,itemId);if(check.blocked)return check.reason;
 const item=eco.s.items.find(i=>i.id===itemId),p=eco.sim.s.player,result=resolveAbilityCheck(check,eco.sim.rng);
 eco.sim.emit('fieldCheck',{...result,staged,label:'偷取纲货',actionId:'convoySteal',kind:'steal',target:'fu'});p.energy=Math.max(0,p.energy-3);
 const event={type:'theft',convoy:true,severe:true,owner:'fu',target:CART,itemId,x:p.x,z:p.z,covert:result.success};eco.sim.emit('worldIncident',event);
 if(result.success)eco.transfer(item,'player','stolen',event.witnesses||[]);
 recordConvoyTheft(eco.sim,eco,event,item);
 eco.log(result.success?'取走：'+item.name+'。':event.witnesses?.length?'伸手被发现，纲货仍在车上。':'没能解开绑绳，纲货仍在车上。');return null;
}
export function inspectConvoyCargo(sim,eco,positions){
 const c=convoyState(sim.s);if(c.closed||!c.stocked)return;
 const missing=c.cargo.some(id=>!eco.s.items.some(i=>i.id===id&&i.hp>0&&i.location==='object:'+CART));if(!missing)return;
 const observer=CONVOY_CREW.find(id=>{const n=sim.s.people[id],q=positions[id];return q&&n?.hp>0&&!n.life?.night&&!n.awareness?.caseOpen&&!(n.stunnedUntil>(sim.s.npcClock||0))&&Math.hypot(q.x-c.x,q.z-c.z)<5&&visibleBetween(q,c,(eco.obstacles||[]).filter(o=>o.id!==CART),eco.s.objects);});
 if(!observer)return;c.closed=true;c.missing=true;const report=recordCrimeScene(sim,{type:'theft',convoy:true,severe:true,owner:'fu',x:c.x,z:c.z,witnesses:[]});if(report)report.discoverer=observer;sim.emit('npcRoutine',{id:observer,text:'纲货少了！先封车清点，旁人不许再跟队。'});
 addCausalDeed(sim.s,{key:'convoy-missing',title:'纲货清点',text:'车队发现失货，暂停带人入关；尚不知道是谁取走。',target:observer,subject:'unknown'});sim.save();
}
