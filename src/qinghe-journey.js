import {QINGHE_LINES as L} from './qinghe-journey-lines.js';
import {TRAVEL_BUNDLE} from './home-chest.js';
import {travelBundleStock} from './travel-bundle-gift.js';
import {visibleBetween} from './npc-awareness.js';
import {newsReady} from './world-news.js';
import {believedIdentity,appearanceState,disguisePreview,needsDisguiseCheck} from './appearance.js';
import {earnReputation,factionRep} from './reputation.js';
import {addCausalDeed} from './item-meaning.js';
import {meet} from './factions.js';
import {queueContextGuide} from './context-guide.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';
import {admitRoute} from './gate-scene.js';
import {rememberHarm} from './npc-bonds.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const option=(key,label)=>({id:'ch_qj_'+key,label,mode:'contact',kind:'listen',story:true});
const clear=(s,a,b,obstacles)=>!!a&&!!b&&visibleBetween(a,b,obstacles||[],s.ecosystem?.objects);
export const isQingheJourneyAction=id=>id?.startsWith('ch_qj_');
export const qingheForcedCatch=(s,id)=>s.chapterVersion===2&&id==='qinghe'&&s.qingheJourney?.mode==='force'&&!s.qingheJourney.delivered;
export function qingheChoices(s){
 if(s.chapterVersion!==2||s.facts.qingheConsent||s.qingheJourney||!(s.facts.qingheWishKnown||s.facts.qingheHesitationKnown))return [];
 return [option('spare','放过她：你自己拿主意'),option('persuade','劝她去：仙山风物，值得一看'),option('force','强行带她去')];
}
export function qingheJourneyOptions(s,id){
 const j=s.qingheJourney;if(s.chapterVersion!==2)return [];
 if(id==='qinghe'){
  if(!j)return qingheChoices(s);
  if(j.phase==='farewell'&&j.farewellDeferred)return [option('goodbye','陪她向母亲道别')];
  return [];
 }
 if(id==='tea_host'&&j?.mother?.phase==='deferred')return [option('mother','听宋茶娘把话说完')];
 if(id!=='fu')return [];
 if(j?.delivered)return j.recalled?[]:[option('recall','问起青禾随车的事')];
 // Bringing the actual person can precede every authored conversation.
 if(j?.phase==='follow'||s.people.qinghe?.restraint?.mode==='lead')return [option('deliver','宋青禾到了')];
 return [];
}
function bodyReady(s,id,{bound=false,escort=false}={}){
 const n=s.people[id],clock=s.npcClock||0,j=s.qingheJourney;
 const ownCase=escort&&id==='qinghe'&&j?.mode==='force'&&n?.awareness?.lastIncident===j.restraintIncident;
 return !!n&&n.hp>Math.min(30,(n.maxHp||100)*.3)&&(!n.restraint||bound)&&!n.inCustody&&!n.drowning&&!n.burning&&!(n.stunnedUntil>clock)&&!(n.muteUntil>clock)&&!(n.sickUntil>(s.ecosystem?.time||0))&&!['sleep','doze','escape','privacy'].includes(n.life?.activity)&&
  (ownCase||!n.awareness?.caseOpen&&!['fight','warn','flee','search','investigate'].includes(n.awareness?.state));
}
function convoyBlock(s){
 const c=s.convoy;if(!c||c.closed||c.command||c.passenger||c.qinghePassenger)return '车队眼下不能再接人。';
 if(!(s.ecosystem?.objects['flowerstone-cart']?.hp>0))return '纲车已经损坏，眼下走不了。';
 if(!s.ecosystem.items.some(i=>i.storyId==='convoy-list'&&i.location==='npc:fu'&&i.hp>0))return '符祥手边没有名册，暂时无法交接。';
 if(!newsReady(s,'fu')||!newsReady(s,'porter'))return '押运人眼下无法交接，等他们恢复再来。';
 return '';
}
export function qingheJourneyPreview(sim,id,a,eco){
 const s=sim.s,j=s.qingheJourney,q=eco?.positions||{},key=a.id.slice(6);
 let reason=s.player.hp<=0||!bodyReady(s,id)?'对方眼下无法应答。':distance(s.player,q[id])>3.8||!clear(s,s.player,q[id],eco?.obstacles)?'走到对方面前再谈。':'';
 if(!reason&&['persuade','force','deliver'].includes(key))reason=convoyBlock(s);
 if(!reason&&key==='deliver'){
  const tied=s.people.qinghe?.restraint;
  if(j?.delivered)reason='已经交接过了。';
  else if(!(j?.phase==='follow'&&!tied||tied?.mode==='lead')||!bodyReady(s,'qinghe',{bound:!!tied,escort:!!tied}))reason='先把仍能行走的青禾带来。';
  else if(distance(q.qinghe,q.fu)>4.5||!clear(s,q.qinghe,q.fu,eco.obstacles))reason='青禾还没到跟前，等她走近再说。';
  else if(distance(q.fu,s.convoy)>7||distance(q.porter,s.convoy)>7)reason='押运人还没回到车旁。';
 }
 return {certain:true,chance:reason?0:100,blocked:!!reason,reason};
}
function setQuest(s){
 const j=s.qingheJourney;if(!j)return;s.quests??={};
 const q=s.quests.qinghe_journey??={id:'qinghe_journey',title:'青禾的去留',source:'与青禾当面交谈',day:s.day};
 q.status=j.delivered||j.mode==='spare'?'complete':'active';
 q.objective=j.delivered?'已将青禾交给纲队，符祥记下了这份功劳':j.mode==='spare'?'青禾留在溪边；可自行准备衣装与易容':j.mode==='force'?s.people.qinghe.restraint?'牵青禾到黄旗车旁，与符祥交接':'用套索套住青禾，再带到符祥面前':j.phase==='bundle'?'等青禾取好远行包裹':j.phase==='farewell'?'陪青禾向母亲道别':'带青禾到黄旗车旁，与符祥交接';
 q.note=j.mode==='force'?'强行带人不代表她自愿；亲眼看见的人会记住。':j.mode==='spare'?'名册上的姓名与真正的身份是两回事，装扮需要实际准备。':'她答应去看看；取行李、告别和到场后才能交接。';
 q.place=j.phase==='follow'||j.mode==='force'&&s.people.qinghe.restraint?{person:'fu'}:j.phase==='farewell'?{person:'tea_host'}:{person:'qinghe'};
}
function markChoice(s,mode){s.qingheJourney={mode,phase:mode==='persuade'?'bundle':mode==='force'?'capture':'spared',at:s.npcClock||0};s.facts.qingheDecision=mode;s.trackedQuest='qinghe_journey';setQuest(s);}
export function qingheCaptureRecorded(sim,eco){
 const s=sim.s,n=s.people.qinghe;if(s.chapterVersion!==2||!n?.restraint||s.qingheJourney?.delivered)return;
 const prior=s.qingheJourney;
 if(prior?.mode!=='force'){markChoice(s,'force');if(prior?.bundleItems)s.qingheJourney.bundleItems=prior.bundleItems;}
 const j=s.qingheJourney;j.phase='capture';j.restraintIncident=n.awareness?.lastIncident;j.captureCause=n.restraint.cause;j.farewellDeferred=false;setQuest(s);
 if(!prior)s.quests.qinghe_journey.source='亲自用套索牵住青禾';
}
function lines(s,key){const j=s.qingheJourney;
 if(key==='spare')return [{id:'player',text:L.spare_player},{id:'qinghe',text:L.spare_qinghe}];
 if(key==='persuade')return [{id:'player',text:L.persuade_player},{id:'qinghe',text:travelBundleStock(s).length?L.persuade_qinghe:L.persuade_empty}];
 if(key==='force')return [{id:'player',text:L.force_player},{id:'qinghe',text:L.force_qinghe}];
 if(key==='goodbye')return [{id:'qinghe',text:'等我跟娘说一声。'}];
 if(key==='recall')return [{id:'fu',text:L.return_fu}];
 if(key==='mother')return [{id:'tea_host',text:L.mother_condemn}];
 const forced=!!s.people.qinghe.restraint||j?.mode==='force';
 return [{id:'player',text:forced?L.forced_handoff_player:L.handoff_player},{id:'fu',text:forced?L.forced_handoff_fu:L.handoff_fu}];
}
export function resolveQingheJourney(sim,eco,id,action,{deferSpeech=false,confirmedText=null}={}){
 const s=sim.s,a=qingheJourneyOptions(s,id).find(a=>a.id===action);if(!a)return {error:'此事已经说定，或眼前情形变了。'};
 const check=qingheJourneyPreview(sim,id,a,eco);if(check.blocked)return {error:check.reason};
 const key=action.slice(6),dialogue=lines(s,key),text=dialogue.map(l=>l.text).join('\n');
 if(confirmedText!==null&&confirmedText!==text)return {error:'眼前情形变了，再谈一次。'};
 const r={type:'npc',presentation:'dialogue',day:s.day,eventId:action,actionId:action,label:a.label,kind:'listen',motion:'talk',roll:null,check,success:true,text,changes:[],dialogue:dialogue.map(l=>({...l,verbatim:true})),authored:true,pendingSpeech:deferSpeech,causalRecorded:true};
 if(deferSpeech)return r;
 meet(sim,id);
 if(['spare','persuade','force'].includes(key)){
  markChoice(s,key);
  if(key==='spare')queueContextGuide(s,'qingheIdentity');
  if(key==='force')queueContextGuide(s,'qingheLasso');
  if(key==='persuade'){s.people.qinghe.eatingUntil=s.people.qinghe.drinkingUntil=0;s.facts.qingheVoluntaryTravel=true;}
 }else if(key==='goodbye')s.qingheJourney.farewellDeferred=false;
 else if(key==='recall')s.qingheJourney.recalled=true;
 else if(key==='mother')settleMotherReproach(sim,s.qingheJourney.mother);
 else if(key==='deliver'){
  if(s.people.qinghe.restraint)qingheCaptureRecorded(sim,eco);
  const j=s.qingheJourney,n=s.people.qinghe,c=s.convoy,subject=believedIdentity(s,'fu');
  noticeForcedMother(sim,eco,eco.positions);
  const deed=addCausalDeed(s,{key:'qinghe-handoff',title:j.mode==='force'?'押送青禾':'青禾随队',text:j.mode==='force'?'将被套索牵来的青禾交给符祥，纲队接走了她。':'青禾'+(j.bundleItems?.length?'取过行李、':'')+'向母亲告别后，自愿跟到车旁，由符祥接入纲队。',target:'fu',subject,witnesses:['fu','qinghe'],cause:j.captureCause||null,valence:j.mode==='force'?'harm':'neutral',...(j.mode==='force'?{harmedTarget:'qinghe',incidentType:'assault',method:'lasso',identities:{fu:subject,qinghe:believedIdentity(s,'qinghe')}}:{})});
  Object.assign(j,{delivered:true,phase:'convoy',subject,cause:deed.id});s.facts.qingheDelivered=true;
  if(n.restraint){delete n.restraint;if(n.awareness?.lastIncident===j.restraintIncident)n.awareness.state='idle';n.fear=0;}
  c.qinghePassenger={mode:j.mode,cause:deed.id,subject};if(c.phase==='gate'){c.phase='travel';c.route=0;}
  const previous=subject==='player'?factionRep(s,'yingfeng'):(appearanceState(s).reputations[subject]?.factions?.yingfeng||0),amount=Math.max(0,Math.min(40,100-previous));
  earnReputation(sim,{city:null,faction:'yingfeng',subject,amount,key:'qinghe-handoff',reason:'将宋青禾带到纲队，当面完成交接。'});
  if(amount)r.changes.push('应奉局声望 +'+amount);
  s.people.fu.memories.push('记下将宋青禾带到车旁的功劳。');
  if(j.mode==='force')n.memories.push('被套索牵到符祥面前，强行送入纲队。');
  setQuest(s);releaseQingheCompanion(sim,eco);
 }
 addCausalDeed(s,{key:action,title:a.label,text,target:id,subject:believedIdentity(s,id)});
 s.history.push(r);sim.emit('result',r);sim.save();return r;
}

// Only a real, nearby witness gains knowledge; later travel never rewrites who she saw.
export function noticeForcedMother(sim,eco,positions){
 const s=sim.s,j=s.qingheJourney,m=positions.tea_host,q=positions.qinghe;
 if(!j||j.mode!=='force'||j.mother||!s.people.qinghe.restraint||!bodyReady(s,'tea_host')||distance(m,q)>10||!clear(s,m,q,eco.obstacles))return false;
 const angle=Math.atan2(q.x-m.x,q.z-m.z);if(Number.isFinite(m.facing)&&Math.cos(angle-m.facing)<.1&&distance(m,q)>2.5)return false;
 j.mother={phase:'approach',subject:believedIdentity(s,'tea_host'),lastSeen:{x:q.x,z:q.z},cause:j.captureCause};
 rememberHarm(s,'tea_host',{subject:j.mother.subject,target:'qinghe',kind:'restraint',cause:j.captureCause,evidence:'seen'});
 s.people.tea_host.memories.push('亲眼看见青禾被人用套索牵着。');sim.save();return true;
}
function goodbyeReady(s,eco,positions){return bodyReady(s,'qinghe')&&bodyReady(s,'tea_host')&&distance(positions.qinghe,positions.tea_host)<2.6&&distance(s.player,positions.qinghe)<7&&clear(s,positions.qinghe,positions.tea_host,eco.obstacles)&&clear(s,s.player,positions.qinghe,eco.obstacles);}
export function finishQingheGoodbye(sim,eco,positions){
 const s=sim.s,j=s.qingheJourney;if(j?.mode!=='persuade'||j.phase!=='farewell'||!goodbyeReady(s,eco,positions))return false;
 j.phase='follow';j.farewellDone=true;s.facts.qingheWishShared=true;
 s.people.tea_host.memories.push('青禾亲口告别，说想随纲队去京城看看。');s.people.qinghe.memories.push('拿定主意向母亲告别，随来人去找符祥。');
 setQuest(s);sim.save();return true;
}
export function qingheJourneyStep(sim,eco,dt,positions,{paused=false,say=null}={}){
 const s=sim.s,j=s.qingheJourney;if(s.chapterVersion!==2||!j||paused)return;
 if(j.mode==='force'&&!j.delivered&&j.bound!==!!s.people.qinghe.restraint){j.bound=!!s.people.qinghe.restraint;setQuest(s);sim.save();}
 noticeForcedMother(sim,eco,positions);
 if(j.mode==='persuade'&&j.phase==='bundle'&&bodyReady(s,'qinghe')){
  const o=eco.s.objects[TRAVEL_BUNDLE.id],items=travelBundleStock(s);
  if(!items.length){j.phase='farewell';j.reach=0;setQuest(s);sim.save();}
  else if(distance(positions.qinghe,o)<1.55&&clear(s,positions.qinghe,o,(eco.obstacles||[]).filter(b=>b.id!==o.id))){
   j.reach=(j.reach||0)+dt;
   if(j.reach>=1.2){
    const deed=addCausalDeed(s,{key:'qinghe-own-bundle',title:'青禾取行囊',text:'青禾在茶棚旁取走剩余的远行衣物与小药盒。',target:'qinghe',subject:'qinghe',witnesses:[]});
    for(const item of items){eco.transfer(item,'npc:qinghe','family-luggage');Object.assign(item.provenance.history.at(-1),{subject:'qinghe',issuer:'tea_host',cause:deed.id});}
    j.bundleItems=items.map(i=>i.id);o.removed=true;o.open=false;j.phase='farewell';j.reach=0;setQuest(s);sim.save();
   }
  }else j.reach=0;
 }
 if(j.phase==='farewell'&&!j.farewellDeferred&&goodbyeReady(s,eco,positions)&&say){
  const bundle=j.bundleItems?.some(id=>eco.items('npc:qinghe').some(i=>i.id===id&&i.hp>0));
  say('goodbye',[{id:'qinghe',text:bundle?L.goodbye_qinghe:L.goodbye_no_bundle},{id:'tea_host',text:L.goodbye_mother},{id:'qinghe',text:L.goodbye_answer}],()=>goodbyeReady(s,eco,eco.positions),cancelled=>{if(s!==sim.s||s.qingheJourney!==j||j.phase!=='farewell')return;if(cancelled){j.farewellDeferred=true;sim.save();}else finishQingheGoodbye(sim,eco,eco.positions);});
 }
 const m=j.mother;
 if(m?.phase==='approach'&&bodyReady(s,'tea_host')){
  const at=positions.tea_host;if(distance(at,s.player)<12&&clear(s,at,s.player,eco.obstacles))m.lastSeen={x:s.player.x,z:s.player.z};
  if(distance(at,s.player)<3&&distance(at,positions.qinghe)<7&&clear(s,at,s.player,eco.obstacles)&&say){
   const lines=j.delivered?[{id:'tea_host',text:L.mother_condemn},{id:'tea_host',text:L.mother_helpless}]:s.people.qinghe.restraint?[{id:'tea_host',text:L.mother_shock},{id:'tea_host',text:L.mother_condemn}]:[{id:'tea_host',text:L.mother_condemn}];
   say('mother',lines,()=>bodyReady(s,'tea_host')&&distance(eco.positions.tea_host,s.player)<3.8,cancelled=>{
    if(s!==sim.s||s.qingheJourney!==j||m.phase!=='approach')return;
    // A cancelled reply can be reopened deliberately; never auto-loop at the player.
    if(cancelled)m.phase='deferred';else settleMotherReproach(sim,m);
    sim.save();
   });
  }
 }
 if(j.phase==='convoy'){releaseQingheCompanion(sim,eco);if(s.convoy?.phase==='town'&&distance(positions.qinghe,s.convoy.posts?.qinghe)<1){j.phase='arrived';s.facts.qingheArrived=true;sim.save();}}
}
function settleMotherReproach(sim,m){
 m.phase='done';if(m.settled)return;m.settled=true;sim.relation('tea_host',-20,m.subject);
 addCausalDeed(sim.s,{key:'qinghe-mother-reproach',title:'茶娘斥责',text:L.mother_condemn,target:'tea_host',subject:m.subject,cause:m.cause,valence:'harm',witnesses:['tea_host']});
}
export function releaseQingheCompanion(sim,eco){
 const s=sim.s,j=s.qingheJourney,c=s.convoy;if(!j?.delivered||!c?.qinghePassenger||c.closed||!newsReady(s,'fu'))return false;
 const guard=s.watch?.holder||'gate_guard',q=eco.positions;if(!newsReady(s,guard)||distance(q[guard],q.fu)>14||!clear(s,q[guard],q.fu,eco.obstacles))return false;
 if(eco.s.objects['town-gate'])eco.s.objects['town-gate'].open=true;
 if(s.facts.enteredCity||s.player.hp<=0||['prison','testimony','fight'].includes(s.event?.gate?.phase)||distance(s.player,q.fu)>5||believedIdentity(s,'fu')!==j.subject)return false;
 const context={positions:q,obstacles:eco.obstacles||[],player:s.player},identity=disguisePreview(s,guard,{context});
 if(identity?.certain&&identity.chance===0||needsDisguiseCheck(s,guard,{context}))return false;
 if(!admitRoute(sim,'qinghe-escort',{preservePosition:true}))return false;
 s.facts.entryReceipt={route:'qinghe-escort',day:s.day,subject:j.subject,witnesses:['fu',guard],cause:j.cause,cost:'送青禾到纲队，获准随队入关'};sim.save();return true;
}
export function qingheJourneyOwns(s,id){const j=s.qingheJourney;return !!j&&(id==='qinghe'&&['bundle','farewell','follow','convoy'].includes(j.phase)||id==='tea_host'&&(j.phase==='farewell'||j.mother?.phase==='approach'));}
function goal(s,id,positions,world){
 const j=s.qingheJourney,q=positions[id];
 if(id==='tea_host')return j.mother?.phase==='approach'?{point:j.mother.lastSeen,stop:2.3}:{point:q,stop:.4};
 if(j.phase==='bundle')return {point:s.ecosystem.objects[TRAVEL_BUNDLE.id],stop:1.2};
 if(j.phase==='farewell')return {point:positions.tea_host,stop:1.8};
 if(j.phase==='follow'){
  const fu=positions.fu;
  if(distance(s.player,fu)<4&&distance(q,fu)<9&&clear(s,s.player,fu,world.obstacles)&&newsReady(s,'fu')){
   // Walk into the recipient's sight instead of stopping behind a crate beside the player.
   const spots=Array.from({length:12},(_,i)=>({x:fu.x+Math.sin(i*Math.PI/6)*1.6,z:fu.z+Math.cos(i*Math.PI/6)*1.6})).filter(at=>!world.collides(at.x,at.z,0,false)&&distance(at,s.player)>.85&&clear(s,at,fu,world.obstacles));
   spots.sort((a,b)=>distance(q,a)-distance(q,b));if(spots.length)return {point:spots[0],stop:.25};
  }
  return {point:s.player,stop:1.9};
 }
 return {point:s.convoy?.posts?.qinghe,stop:.35};
}
export function qingheJourneyFrame(world,dt){
 const eco=world.ecology?.eco;if(!eco||!world.playing)return;
 const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));
 qingheJourneyStep(world.sim,eco,dt,positions,{paused:world.locked||!!world.cinematic||!!world.performance,say:(...args)=>world.onQingheDialogue?.(...args)});
}
export function qingheJourneyMotion(world,id,n,dt){
 const s=world.sim.s,j=s.qingheJourney;if(!world.playing||world.cinematic||s.people[id]?.life?.activity==='yieldConvoy'||!qingheJourneyOwns(s,id)||!bodyReady(s,id,{escort:j?.delivered}))return false;
 if(world.locked||world.performance)dt=0;
 const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position])),g=goal(s,id,positions,world),a=n.actor,before={x:a.position.x,z:a.position.z};
 if(!g?.point)return false;
 n.chasing=n.fleeing=false;
 if(distance(a.position,g.point)>g.stop&&dt){
  if(n.groundWeight>0){n.groundRising=true;return true;}
  if(!n.qinghePath||world.t>=(n.qingheRepath||0)||distance(n.qingheGoal,g.point)>.8){n.qingheRepath=world.t+.7;n.qingheGoal={x:g.point.x,z:g.point.z};n.qinghePath=routinePath(a.position,g.point,(x,z)=>world.collides(x,z,0,false),g.stop);}
  while(n.qinghePath.length&&distance(a.position,n.qinghePath[0])<.12)n.qinghePath.shift();
  const next=n.qinghePath[0];if(next){const d=distance(a.position,next),step=Math.min(d,dt*(id==='tea_host'?2.2:2.1));if(d>.01){a.rotation.y=turnToward(a.rotation.y,Math.atan2(next.x-a.position.x,next.z-a.position.z),dt);world.move(a,(next.x-a.position.x)/d*step,(next.z-a.position.z)/d*step);}}
 }else a.rotation.y=turnToward(a.rotation.y,Math.atan2(g.point.x-a.position.x,g.point.z-a.position.z),dt);
 world.animateActor(a,dt?distance(a.position,before)/dt/2:0,dt,'');a.userData.sword.visible=false;
 if(id==='qinghe'&&j.reach>0)a.userData.npcUpperBody={kind:'reach'};
 for(const p of [n.heldFood,n.heldCup,n.heldKettle])if(p)p.visible=false;
 n.label.visible=distance(a.position,s.player)<6.6&&clear(s,s.player,a.position,world.obstacles);
 Object.assign(s.people[id],{x:a.position.x,z:a.position.z,facing:a.rotation.y});return true;
}
export function qinghePassengerReady(s,positions){
 if(!s.convoy?.qinghePassenger)return true;
 return bodyReady(s,'qinghe',{escort:true})&&distance(positions.qinghe,s.convoy.posts?.qinghe)<2.5;
}
