import {publicWantedNotices,LAW_OFFICERS,wantedProfile} from './wanted-records.js';
import {visibleBetween} from './npc-awareness.js';
import {npcName} from './npc-names.js';
import {provenance,addCausalDeed} from './item-meaning.js';
import {earnReputation} from './reputation.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export function bountyReceiverReady(s,id){
 const n=s.people[id],now=s.npcClock||0;
 return LAW_OFFICERS.includes(id)&&n?.hp>(n.maxHp||100)*.3&&!n.restraint&&!n.inCustody&&!(n.stunnedUntil>now)&&!(n.muteUntil>now)&&!n.drowning&&!['sleep','doze','escape'].includes(n.life?.activity)&&!['fight','flee','warn'].includes(n.awareness?.state)&&!n.awareness?.caseOpen;
}
export function bountyTargets(s){return Object.keys(s.people).filter(id=>id!=='player'&&s.people[id].hp>0&&!s.people[id].custodyDelivered&&(s.people[id].restraint||s.people[id].inCustody)&&publicWantedNotices(s).some(w=>w.subject===id&&w.status==='active'));}
export function bountyPreview(s,id,receiver,positions,obstacles=[],board=false){
 const n=s.people[id],q=positions[id],at=positions[receiver],p=s.player;
 const notices=publicWantedNotices(s).filter(w=>w.subject===id&&w.status==='active'),place=s.ecosystem?.objects['wanted-board'];
 let reason=p.hp<=0?'倒地时无法交差。':!n||n.hp<=0?'榜文须活口，不能用尸体领赏。':n.custodyDelivered?'此人已经交差，不能重复领赏。':!notices.length?'此人没有尚未结清的公开悬赏。':!n.restraint&&!n.inCustody?'先将榜上之人捆住并带来。':distance(p,q)>4?'须把人实际带到身边，不能远程交差。':!visibleBetween(p,q,obstacles,s.ecosystem?.objects)?'人与身边隔着障碍。':'';
 if(!reason&&board&&(!place||place.hp<=0||distance(p,place)>3.5||distance(q,place)>4||!visibleBetween(p,place,obstacles,s.ecosystem.objects)))reason='请将人押至完好的通缉榜前。';
 if(!reason&&receiver){
  if(receiver===id||!bountyReceiverReady(s,receiver))reason='这名官差眼下无法接收嫌犯。';
  else if(distance(p,at)>3.5||distance(q,at)>3.5||!visibleBetween(q,at,obstacles,s.ecosystem?.objects)||!visibleBetween(p,at,obstacles,s.ecosystem?.objects))reason='等官差走近，人与押送者须一起在场。';
  else if(wantedProfile(s,receiver))reason='官差认出你也在通缉之列，须先交代自身案情。';
 }
 return {blocked:!!reason,reason,certain:true,reward:Math.max(0,...notices.map(w=>w.reward||20)),notices};
}
export function redeemBounty(sim,id,receiver,positions,obstacles=[],board=false){
 const s=sim.s,check=bountyPreview(s,id,receiver,positions,obstacles,board);
 if(check.blocked||!receiver)return {error:check.reason||'须有官差当面接收。'};
 const n=s.people[id];s.law??={};s.law.served??=[];
 const recordIds=check.notices.flatMap(w=>[w.id,...(w.caseId?['scene:'+w.caseId+':'+id]:[])]);
 s.law.served=[...new Set([...s.law.served,...recordIds])];
 for(const w of s.law.warrants||[])if(recordIds.includes(w.id)){w.status='served';w.receivedBy=receiver;w.receivedAt=s.npcClock||0;}
 for(const c of s.investigations?.cases||[])if(check.notices.some(w=>w.caseId===c.id)){c.custody={subject:id,officer:receiver,at:s.npcClock||0};c.state='closed';c.question=null;}
 const rope=s.ecosystem?.items.find(i=>i.id===n.restraint?.ropeId&&i.location==='npc:'+id);
 if(rope){provenance(rope,rope.location,'player',s,'custody-handover',[receiver]);rope.location='player';}
 delete n.restraint;n.inCustody=true;n.custodyDelivered=true;n.custodyReceiver=receiver;n.awareness=null;n.fear=0;
 n.life={activity:'idle',target:{x:positions[id].x,z:positions[id].z}};
 n.custodyPosition={...n.life.target};s.player.money+=check.reward;
 for(const quest of Object.values(s.quests||{}))if(quest.warrantSubject===id||id==='thief'&&quest.id==='arrest-thief')quest.status='complete';
 const key='bounty:'+recordIds.slice().sort().join('|'),name=check.notices[0].description?.name||npcName(s,id);
 const text=name+'已由'+npcName(s,receiver)+'当面接收，领到赏钱 '+check.reward+' 文。';
 addCausalDeed(s,{key,title:'押送交差',text,target:id,witnesses:[receiver],valence:'help',effects:[{kind:'money',delta:check.reward}],evidence:recordIds});
 earnReputation(sim,{city:null,faction:'court',amount:30,key:key+':court',reason:'按榜文将嫌犯活着押送到案。'});
 earnReputation(sim,{amount:10,key,reason:'按榜文将嫌犯活着押送到案。'});
 sim.emit('sandbox',{text,dialogue:[]});sim.emit('npcRoutine',{id:receiver,text:'人已接下，按榜核问。赏钱 '+check.reward+' 文，你收好。'});sim.save();
 return {success:true,reward:check.reward,text};
}
export function requestBountyHandover(sim,id,receiver,positions,obstacles=[],board=false){
 const s=sim.s,check=bountyPreview(s,id,board?null:receiver,positions,obstacles,board);if(check.blocked)return {error:check.reason};
 if(board){const place=s.ecosystem.objects['wanted-board'];receiver=LAW_OFFICERS.filter(k=>k!==id&&bountyReceiverReady(s,k)&&positions[k]&&distance(positions[k],place)<30).sort((a,b)=>distance(positions[a],place)-distance(positions[b],place))[0];}
 if(!receiver)return {error:'附近没有能接案的官差，可将人押至六扇门。'};
 s.law??={};if(s.law.handover)return {error:'已有官差在办理交接。'};
 s.law.handover={target:id,receiver,board,expires:(s.npcClock||0)+60};sim.save();return {pending:true};
}
