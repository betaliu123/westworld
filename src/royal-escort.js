import {admitRoute} from './gate-scene.js';
import {visibleBetween} from './npc-awareness.js';
const route=[{x:-3,z:29},{x:-3,z:26},{x:0,z:25}];
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
function able(s,id){const n=s.people[id],clock=s.npcClock||0;return n&&n.hp>(n.maxHp||100)*.3&&n.hp>0&&!n.restraint&&!n.inCustody&&!n.drowning&&!(n.stunnedUntil>clock)&&!(n.muteUntil>clock)&&!(n.sickUntil>(s.ecosystem?.time||0))&&!n.concern&&!n.awareness?.caseOpen&&!['fight','warn','flee','investigate','search'].includes(n.awareness?.state)&&!['sleep','doze'].includes(n.life?.activity);}
export function beginRoyalEscort(sim,eco){
 const s=sim.s;if(s.facts.enteredCity||s.facts.royalEscort)return {error:'担保已经议定。'};
 if(!s.facts.royalSawKindness||s.facts.royalSawHarm||!able(s,'traveler')||s.people.traveler.relation<0)return {error:'他眼下不能替你作保。'};
 s.facts.royalEscort={stage:0,status:'walking',subject:'player'};
 s.quests.royalEscort={id:'royalEscort',title:'当面作保',source:'锦衣客',status:'active',objective:'跟锦衣客到关口，当面听守卫回应',note:'尚未放行；对方到场后才作保。'};
 return {ok:true};
}
// Uses the regular NPC navigation and danger scheduler. No teleport or immunity.
export function royalEscortStep(sim,eco,positions){
 const s=sim.s,e=s.facts.royalEscort;if(!e||e.status==='complete'||s.facts.enteredCity)return false;
 const guard=s.watch?.holder||'gate_guard',traveler=s.people.traveler,q=positions.traveler,p=s.player;
 if(!able(s,'traveler')||s.facts.royalSawHarm||traveler.relation<0)return true;
 if(e.retryAt>(s.npcClock||0))return true;
 // A saved or interrupted ready exchange must be offered again, with facts rechecked.
 if(e.status==='ready')e.status='walking';
 if(distance(q,p)>7){traveler.life={activity:'idle',target:{x:q.x,z:q.z}};return true;}
 let goal=route[e.stage];if(distance(q,goal)<.8&&e.stage<route.length-1)goal=route[++e.stage];
 traveler.life={activity:'escort',target:goal,until:eco.s.time+10};
 if(e.stage===route.length-1&&distance(q,goal)<1&&distance(p,q)<3.3&&able(s,guard)&&distance(positions[guard],q)<4&&visibleBetween(p,q,eco.obstacles||[],eco.s.objects)&&visibleBetween(q,positions[guard],eco.obstacles||[],eco.s.objects)){
  e.status='ready';e.guard=guard;e.retryAt=(s.npcClock||0)+2;
  traveler.life={activity:'idle',target:{x:q.x,z:q.z}};
  sim.emit('royalGuaranteeReady',{guard});sim.save();
 }
 return true;
}
export function finishRoyalGuarantee(sim,eco){
 const s=sim.s,e=s.facts.royalEscort,p=s.player,q=eco.positions.traveler;
 if(!e||e.status!=='ready'||!able(s,'traveler')||!able(s,e.guard)||s.people.traveler.relation<0||s.facts.royalSawHarm||distance(p,q)>3.6||distance(q,eco.positions[e.guard])>4||!visibleBetween(p,q,eco.obstacles||[],eco.s.objects)||!visibleBetween(q,eco.positions[e.guard],eco.obstacles||[],eco.s.objects))return false;
 // Grant passage only after all three have met; walking through is still physical.
 e.status='complete';s.facts.princeDebt=true;s.facts.royalPassage=true;
 if(s.ecosystem?.objects['town-gate'])s.ecosystem.objects['town-gate'].open=true;admitRoute(sim,'royal',{preservePosition:true});
 if(s.quests.royalEscort){s.quests.royalEscort.status='complete';s.quests.royalEscort.objective='锦衣客当面担保，守卫已准许通行';}
 s.facts.princeDeparture??={stage:1,paid:true};sim.save();return true;
}
export function postponeRoyalGuarantee(sim){const e=sim.s.facts.royalEscort;if(e?.status==='ready'){e.status='walking';e.retryAt=(sim.s.npcClock||0)+8;sim.save();}}
