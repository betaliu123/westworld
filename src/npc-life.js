import {identityEscortStep} from './identity-favors.js';
import {applyNight,isSleeping} from './night-life.js';
import {actionParticipant} from './action-cards.js';
import {privacySpot} from './locations.js';
import {custodyStep} from './faction-career.js';
import {ensurePrince,princeStep} from './prince.js';
import {environmentStep} from './world-rules.js';
import {PEOPLE} from './data.js';
import {visibleBetween} from './npc-awareness.js';
import {hasFixedPost,fixedPost,convoyTravelling,seedPostRations,yieldToConvoy} from './npc-posts.js';

export const GATE_PEOPLE=['gate_guard','gate_relief','relay','gate_merchant','scribe','tea_host','traveler','old_constable'];
export const GUARDS=['guard','gate_guard','gate_relief'];
export const POST={x:0,z:23.8};
// Both ends are on dry ground. Approach the grove and the water from the gate side.
const rounds=[{x:-17,z:23.5},{x:-12,z:29},{x:1,z:29},{x:12,z:29},{x:21,z:27}];
function patrolTarget(n,q,id){n.roundIndex??=id==='gate_relief'?3:1;n.roundDir??=id==='gate_relief'?1:-1;
 if(distance(q,rounds[n.roundIndex])<.8){if(n.roundIndex===0)n.roundDir=1;if(n.roundIndex===rounds.length-1)n.roundDir=-1;n.roundIndex+=n.roundDir;}
 return rounds[n.roundIndex];}
export const SEATS={gate_guard:{x:-5,z:27.2},gate_relief:{x:-8,z:27.2},traveler:{x:-5,z:30},old_constable:{x:-8,z:30},gate_merchant:{x:-5,z:32.6},tea_host:{x:-8,z:32.6}};
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export function ensureLife(sim,eco){
 ensurePrince(sim,eco);
 sim.s.watch??={holder:'gate_guard',since:eco.s.time};
 for(const p of PEOPLE){const n=sim.s.people[p.id];n.stats??={wit:({bookseller:76,old_constable:80,beggar:78,gate_guard:65,gate_relief:45,tea_host:55,traveler:40}[p.id]??35)};n.faction??=p.faction||'临溪街坊';n.energy??=100;n.trust??=0;n.life??={activity:'idle'};eco.s.hunger[p.id]??=p.id==='elder'?78:p.id==='gate_guard'?40:50;
  seedPostRations(sim,eco,p.id);
  if(sim.s.chapterVersion===2&&p.id==='tea'&&!n.rescueStockIssued){n.rescueStockIssued=true;for(let i=0;i<3;i++)eco.create('随身伤药','bandage','npc:tea',{ownerId:'tea',material:'cloth',discovered:true});}
  if(p.id==='scribe'){n.faction=sim.s.chapterVersion===2?'无相门':'赤砂帮';if(!n.inkStockSeeded){eco.create('迷毒散','poison','npc:scribe',{material:'stone',discovered:true});n.inkStockSeeded=true;}}
  if(!n.wardrobeInitialized){n.wardrobeInitialized=true;eco.create(p.id==='traveler'?'绣纹锦袍':GUARDS.includes(p.id)?'值勤外袍':'随身外袍','clothing','npc:'+p.id,{ownerId:p.id,color:p.color,material:'cloth',discovered:true});}
  if(!n.packInitialized){n.packInitialized=true;n.lifeInventoryVersion=1;if(GATE_PEOPLE.includes(p.id))eco.create(GUARDS.includes(p.id)?'值勤腰牌':p.id==='old_constable'?'旧捕快手札':'随身杂物','personal','npc:'+p.id,{discovered:true});if(p.id==='bookseller')eco.create('朱批校样','personal','npc:bookseller',{material:'paper',discovered:true});if(p.id==='gate_merchant')eco.create('赵行商的货包','cargo','npc:gate_merchant',{discovered:true});if(p.id==='tea_host')for(let i=0;i<12;i++)eco.create('包子','food','npc:tea_host',{discovered:true});if(['gate_relief','traveler','old_constable'].includes(p.id))eco.create('干粮','food','npc:'+p.id,{discovered:true});}
  if(!n.lifeInventoryVersion){n.lifeInventoryVersion=1;if(p.id==='gate_merchant'&&!eco.s.items.some(i=>i.type==='cargo'))eco.create('赵行商的货包','cargo','npc:'+p.id,{discovered:true});if(p.id==='tea_host')for(let i=0;i<12;i++)eco.create('包子','food','npc:tea_host',{discovered:true});}
 }
}
export function canReceiveFood(sim,eco,id,item){const n=sim.s.people[id];
 if(item.knownPoisonBy?.includes(id))return '这份吃食有问题，拿开。';
 if((eco.s.hunger[id]??50)<60)return '刚吃过，心意领了，吃的你留着。';
 if(GUARDS.includes(id)&&n.trust<5&&(eco.s.hunger[id]??50)<80)return '还在当值，不便收陌生人的吃食。';
 return null;
}
// Food ownership, nutrition and toxicity have the same effects for every actor.
export function inspectFood(sim,id,item){
 if(!item.poisoned)return true;item.examinedBy??={};
 if(item.knownPoisonBy?.includes(id))return false;
 if(!(id in item.examinedBy)){const actor=sim.s.people[id],wit=actor?.stats?.wit??35,tier=actor?.skills?.medicine?.tier||0;item.examinedBy[id]=detectsPoison(actor,item)||sim.rng()*100<Math.min(85,Math.max(5,wit*.6-(item.poisonConceal||0)*10+(tier>=2?15:0)));sim.emit('npcCheck',{id,label:'识毒',success:item.examinedBy[id]});}
 if(item.examinedBy[id]){item.knownPoisonBy??=[];if(!item.knownPoisonBy.includes(id))item.knownPoisonBy.push(id);return false;}return true;
}
export function detectsPoison(actor,item){return !!item?.poisoned&&(actor.skills?.medicine?.tier||0)>=(item.poisonDelay>0?4:item.poisonConceal>0?3:2);}
export function poisonStep(actor,now){if(!actor.pendingPoison||actor.hp<=0||now<actor.pendingPoison.at)return false;actor.hp=Math.max(0,actor.hp-25);actor.sickUntil=now+90;actor.pendingPoison=null;return true;}
export function consumeFood(actor,item,now=0){if(item.type!=='food'||item.hp<=0||item.location==='consumed')return false;item.location='consumed';actor.energy=Math.min(100,(actor.energy??100)+18);actor.eatingUntil=now+3;if(item.poisoned){if(item.poisonDelay>0)actor.pendingPoison={at:now+item.poisonDelay,itemId:item.id};else{actor.hp=Math.max(0,actor.hp-25);actor.sickUntil=now+90;}}else actor.hp=Math.min(100,actor.hp+20);return true;}
export function lifeStep(sim,eco,dt,positions){ensureLife(sim,eco);const now=eco.s.time,watch=sim.s.watch;
 for(const [id,q] of Object.entries(positions)){const n=sim.s.people[id];if(!n)continue;n.x=q.x;n.z=q.z;
  const body={x:q.x,z:q.z,hp:n.hp};environmentStep(body,dt,eco.s.objects);n.hp=body.hp;n.drowning=body.drowning;
  if(n.hp<=0){n.life.activity='down';continue;}
  if(n.restraint){n.life={activity:'restrained'};continue;}
  const flames=Object.values(eco.s.objects).some(o=>o.burning&&o.hp>0&&distance(o,q)<1.8);
  n.energy=Math.max(0,Math.min(100,n.energy+(['rest','sleep','doze'].includes(n.life.activity)&&distance(q,n.life.target)<1.4?3:-.06)*dt));
  if(body.drowning){n.life={activity:'escape',target:{x:q.x< -22?-27:-17,z:q.z}};continue;}
  if(flames){n.life={activity:'escape',target:{x:q.x+3,z:q.z+3}};continue;}
  if(n.stunnedUntil>(sim.s.npcClock||0)||n.awareness&&['fight','warn','flee','investigate','search'].includes(n.awareness.state))continue;
  if(n.sickUntil>now){const index=PEOPLE.findIndex(p=>p.id===id),target=privacySpot(index);if(n.life.activity!=='privacy')sim.emit('npcRoutine',{id,text:'肚子怎么闹起来了……得找个僻静处。'});n.life={activity:'privacy',target};continue;}
  if(yieldToConvoy(sim,eco,id,q,positions))continue;
  if(n.concern){n.life={activity:'concern',target:n.concern.lastSeen};continue;}
  if(actionParticipant(sim.s,id)){n.life={activity:'action-card'};continue;}
  if(sim.s.chapterVersion===2&&id==='gate_merchant'&&sim.s.facts.gatePassTaken&&!eco.items('npc:gate_merchant').some(i=>i.documentId==='merchant-pass')){
   n.passAbsentSince??=now;
   if(!n.passMissingNoticed&&now-n.passAbsentSince>45){n.passMissingNoticed=true;sim.emit('npcRoutine',{id,text:'路引呢？明明还在腰间……得去关上报个失。'});}
   if(n.passMissingNoticed&&!n.passReported){const guard=GUARDS.map(id=>({id,q:positions[id],n:sim.s.people[id]})).filter(g=>g.q&&g.n.hp>0&&!(g.n.stunnedUntil>sim.s.npcClock)&&!g.n.awareness?.caseOpen).sort((a,b)=>distance(q,a.q)-distance(q,b.q))[0];
    if(guard){n.life={activity:'report',target:{x:guard.q.x+.8,z:guard.q.z+.8}};if(distance(q,guard.q)<2.5&&visibleBetween(q,guard.q,eco.obstacles||[],eco.s.objects)){n.passReported=true;sim.emit('npcRoutine',{id,text:'差爷，我的路引丢了。名字是赵成，劳您记下，别叫人冒用。'});}continue;}
   }
  }
  if(applyNight(sim,id,q))continue;
  if(hasFixedPost(sim.s,id)){
   const travelling=convoyTravelling(sim.s,id),food=eco.items('npc:'+id).some(i=>i.type==='food'&&!i.drink&&i.discovered&&i.hp>0&&!i.knownPoisonBy?.includes(id));
   n.life={activity:travelling?'convoy':(eco.s.hunger[id]||0)>=65&&food?'meal':'duty',target:fixedPost(sim.s,id),post:true};continue;
  }
  if(['inspector','gang_boss'].includes(id)){const home=PEOPLE.find(p=>p.id===id);n.life={activity:'duty',target:{x:home.x,z:home.z}};continue;}
  if(!GATE_PEOPLE.includes(id))continue;
  if(id===watch.holder){n.life={activity:'duty',target:POST};continue;}
  if(id===watch.incoming){n.life={activity:'relieve',target:sim.s.people[watch.holder]?.convoyYield?.target||POST};continue;}
  if(n.life.activity==='escort'&&n.life.until>now)continue;
  if((eco.s.hunger[id]||0)<65&&(n.energy<35||n.life.activity==='rest'&&n.energy<85)){n.life={activity:'rest',target:SEATS[id]||{x:-9,z:29}};continue;}
  if((eco.s.hunger[id]||0)>=65){n.life={activity:'meal',target:eco.items('npc:'+id).some(i=>i.type==='food'&&!i.drink&&!i.knownPoisonBy?.includes(id))?(SEATS[id]||{x:-4.2,z:27.2}):null};continue;}
  if(id==='gate_guard'||id==='gate_relief'){n.life={activity:'patrol',target:patrolTarget(n,q,id)};continue;}
  n.life={activity:['traveler','old_constable'].includes(id)?'tea':'idle',target:SEATS[id]||null};
 }
 princeStep(sim,eco,positions);custodyStep(sim,positions,eco.obstacles||[]);identityEscortStep(sim,eco,positions);
 const host=sim.s.people.tea_host;if(host?.hp>0&&now>(host.nextStock||0)){host.nextStock=now+30;const stall=Object.values(eco.s.objects).find(o=>o.kind==='stall'&&o.owner==='tea_host'&&o.hp>0);if(stall&&distance(positions.tea_host,stall)<4){for(const food of eco.items('npc:tea_host').filter(i=>i.type==='food').slice(0,Math.max(0,5-eco.items('object:'+stall.id).length)))eco.transfer(food,'object:'+stall.id);}}
 const current=sim.s.people[watch.holder],replacement=watch.holder==='gate_guard'?'gate_relief':'gate_guard',other=sim.s.people[replacement];
 const available=n=>n&&n.hp>0&&!n.concern&&!n.restraint&&!n.drowning&&n.sickUntil<=now&&!(n.stunnedUntil>(sim.s.npcClock||0))&&!n.awareness?.caseOpen;
 // Unknown sickUntil means healthy. A relieving guard must physically arrive before the old one leaves.
 const healthy=n=>available({...n,sickUntil:n?.sickUntil||0});
 if(watch.incoming&&!healthy(sim.s.people[watch.incoming]))delete watch.incoming;
 if(!watch.incoming&&(now-watch.since>100||(eco.s.hunger[watch.holder]||0)>=75||current.hp<=0||current.sickUntil>now||current.energy<35)&&healthy(other)&&(other.offDutyUntil||0)<=now&&other.energy>=60&&(eco.s.hunger[replacement]||0)<75)watch.incoming=replacement;
 const handoffPost=current.convoyYield?.target||POST;
 if(watch.incoming&&healthy(sim.s.people[watch.incoming])&&distance(positions[watch.incoming],handoffPost)<1.2&&(current.hp<=0||distance(positions[watch.incoming],positions[watch.holder])<1.4)){const old=watch.holder;watch.holder=watch.incoming;delete watch.incoming;watch.since=now;sim.s.people[old].offDutyUntil=now+35;sim.s.people[old].energy=Math.min(sim.s.people[old].energy,30);sim.s.people[old].life={activity:'meal',target:SEATS[old]};sim.emit('npcRoutine',{id:watch.holder,text:'这边我看着，你去吃口热的。'});}
}
export function lifeTarget(sim,eco,id){const n=sim.s.people[id];if(!n?.life)return null;if(n.life.activity==='meal'&&!n.life.target)return eco.foodTarget(id);return n.life.target;}
export function canEat(sim,eco,id,q){const n=sim.s.people[id];if(!n||n.hp<=0||n.concern||n.restraint||isSleeping(n)||['doze','escape','yieldConvoy'].includes(n.life?.activity)||n.drowning)return false;if(n.stunnedUntil>(sim.s.npcClock||0)||['fight','flee','warn','investigate','search'].includes(n.awareness?.state))return false;if(hasFixedPost(sim.s,id))return !convoyTravelling(sim.s,id)&&n.life?.activity==='meal'&&distance(q,fixedPost(sim.s,id))<1.4;if(!GATE_PEOPLE.includes(id))return true;return id!==sim.s.watch?.holder&&distance(q,SEATS[id]||{x:-4.2,z:27.2})<1.4;}
