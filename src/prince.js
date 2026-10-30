import {placePayment} from './cash-transfers.js';
export function ensurePrince(sim,eco){const n=sim.s.people.traveler;if(n.princeVersion)return;n.princeVersion=1;n.faction='宗室王府';n.stats??={};n.stats.wit=72;n.purse=Math.max(n.purse||0,30);
 for(const [name,type]of [['素面折扇','personal'],['封好的信','sealed'],['白玉佩','personal']])eco.create(name,type,'npc:traveler',{discovered:true,material:'wood'});
}
export function invitePrince(sim){if(sim.s.facts.princeInvitation)return;sim.s.facts.princeInvitation=true;sim.s.quests??={};sim.s.quests.prince={id:'prince',title:'茶凉了',source:'锦衣客的邀约',day:sim.s.day,status:'active',objective:'到城内听雨楼旁寻找锦衣客，说“茶凉了”',note:'他似乎在暗查税课，但身份仍需核实。'};sim.s.trackedQuest='prince';}
export function princeStep(sim,eco,positions){const n=sim.s.people.traveler,route=sim.s.facts.princeDeparture;if(!route||n.hp<=0||n.sickUntil>eco.s.time||n.stunnedUntil>(sim.s.npcClock||0)||n.awareness?.caseOpen)return;
 if(!route.paid){const q=positions.traveler;if(!q)return;if(Math.hypot(q.x+5,q.z-30)>1.4){n.life={activity:'escort',target:{x:-5,z:30},until:eco.s.time+10};return;}const coins=Math.min(4,n.purse||0);const cash=placePayment(sim,eco,{payer:'traveler',payee:'tea_host',amount:coins,x:-5.65,z:30.25,y:1.09,stand:{x:-6.5,z:31.15},reason:'茶钱'});route.paid=true;route.paymentId=cash?.id;n.payingUntil=eco.s.time+1;sim.emit('npcRoutine',{id:'traveler',text:cash?'茶钱放在这里。城里的路，我自己走走。':'今日身上没带钱，茶钱容我下回补上。'});sim.save();return;}if(n.payingUntil>eco.s.time)return;
 const points=[{x:-3,z:27},{x:0,z:24},{x:0,z:19},{x:0,z:10},{x:0,z:0},{x:-6,z:-7},{x:-9,z:-7}];const q=positions.traveler;if(!q)return;let target=points[Math.min(route.stage,points.length-1)];if(Math.hypot(q.x-target.x,q.z-target.z)<1.2&&route.stage<points.length-1){route.stage++;target=points[route.stage];}
 n.life={activity:'escort',target,until:eco.s.time+10};if(route.stage===points.length-1&&Math.hypot(q.x-target.x,q.z-target.z)<1.5){route.arrived=true;n.life={activity:'idle',target};}
}

// Retire cut demo roles without removing loot already acquired by the player.
export function retirePrinceEscorts(s){for(const id of ['quiet_guest','bridge_guest']){delete s.people[id];if(s.ecosystem){delete s.ecosystem.hunger?.[id];s.ecosystem.items=s.ecosystem.items.filter(i=>i.location!=='npc:'+id);}if(s.intelligence?.people)delete s.intelligence.people[id];}}
