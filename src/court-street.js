import {visibleBetween} from './npc-awareness.js';
export function registerCourt(s){s.factions??={};s.factions['六扇门']??=20;}
export function courtRank(s){return s.facts.courtHead==='player'?'巡街捕头':'捕快';}
export function courtLine(s,id){if(s.facts.career!=='court')return null;const rank=courtRank(s);return ({merchant:rank+'爷，上回报失的钱袋，还劳您挂心。',gate_merchant:rank+'爷，这边阴凉，请上座。',tea_host:'当差也得喝口水。大人，碗在桌上。',gate_guard:s.facts.courtHead==='player'?'顾大人既点了你的名，巡街的人就交给你了。':s.facts.courtHead==='gate_guard'?'巡街归我点卯。你的案卷，记得按时交。':'挂上腰牌只是入门。想领一班人，先把案子办明白。',inspector:'案子到哪一步了？堂前回话，不必客套。',chi:'腰牌倒是擦得亮。手别伸到赤砂堂来。'})[id];}
export function streetSalute(sim,eco,world){const s=sim.s;if(s.facts.career!=='court'||eco.s.time<(s.facts.nextSalute||0)||world.locked)return;
 const p=s.player;for(const [id,q] of Object.entries(eco.positions)){const n=s.people[id],line=courtLine(s,id);if(!q||!n||!line||n.hp<=0||n.inCustody||n.sickUntil>eco.s.time||n.stunnedUntil>s.npcClock||n.awareness?.caseOpen||n.saluteDay===s.day||Math.hypot(q.x-p.x,q.z-p.z)>4||!visibleBetween(q,p,world.obstacles||[],eco.s.objects))continue;
 n.saluteDay=s.day;s.facts.nextSalute=eco.s.time+14;sim.emit('npcRoutine',{id,text:line});break;}}
export function review(s){const points=(s.people.thief?.custodyDelivered?2:0)+(s.facts.taxLedgerLead?2:0)+(s.wanted===0?1:0);const rival=s.people.gate_guard?.hp>0?3:0;return {points,rival,win:points>=rival&&points>0};}
export function arrestWitness(sim,id,base,event){const s=sim.s,n=s.people[id];if(id===event.target||!n||n.inCustody)return null;
 if(['chi','gang_boss'].includes(id)){n.awareness={state:'fight',obstructingWarrant:true,home:{x:base.x,z:base.z},lastKnown:{x:event.x,z:event.z},until:(s.npcClock||0)+12,suspect:'player'};return '慢着！我倒要看看，你能不能把人带走。';}
 return id==='merchant'?'是我的报案，文书我认得。旁人让条路。':['guard','gate_guard','gate_relief'].includes(id)?'拘传令已验，闲人退开。':'官差拿人，给他们让条路。';}
