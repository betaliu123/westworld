export function ensurePrince(sim,eco){const n=sim.s.people.traveler;if(n.princeVersion)return;n.princeVersion=1;n.faction='宗室王府';n.stats??={};n.stats.wit=72;n.purse=Math.max(n.purse||0,30);
 for(const [name,type]of [['素面折扇','personal'],['封好的信','sealed'],['白玉佩','personal']])eco.create(name,type,'npc:traveler',{discovered:true,material:'wood'});
}
export function invitePrince(sim){if(sim.s.facts.princeInvitation)return;sim.s.facts.princeInvitation=true;sim.s.quests??={};sim.s.quests.prince={id:'prince',title:'茶凉了',source:'锦衣客的邀约',day:sim.s.day,status:'active',objective:'到城内听雨楼旁寻找锦衣客，说“茶凉了”',note:'他似乎在暗查税课，但身份仍需核实。'};sim.s.trackedQuest='prince';}
export function princeStep(sim,eco,positions){const n=sim.s.people.traveler,route=sim.s.facts.princeDeparture;if(!route||n.hp<=0||n.sickUntil>eco.s.time||n.stunnedUntil>(sim.s.npcClock||0)||n.awareness?.caseOpen)return;
 if(!route.paid){route.paid=true;const coins=Math.min(4,n.purse||0);n.purse-=coins;sim.s.people.tea_host.purse=(sim.s.people.tea_host.purse||0)+coins;sim.emit('npcRoutine',{id:'quiet_guest',text:'公子，时候不早了。'});}
 const points=[{x:-3,z:27},{x:0,z:24},{x:0,z:19},{x:0,z:10},{x:0,z:0},{x:-6,z:-7},{x:-9,z:-7}];const q=positions.traveler;if(!q)return;let target=points[Math.min(route.stage,points.length-1)];if(Math.hypot(q.x-target.x,q.z-target.z)<1.2&&route.stage<points.length-1){route.stage++;target=points[route.stage];}
 n.life={activity:'escort',target,until:eco.s.time+10};if(route.stage===points.length-1&&Math.hypot(q.x-target.x,q.z-target.z)<1.5){route.arrived=true;n.life={activity:'idle',target};}
 for(const [id,offset]of [['quiet_guest',2],['bridge_guest',-2]]){const g=sim.s.people[id];if(g?.hp>0&&!g.awareness?.caseOpen&&!(g.stunnedUntil>(sim.s.npcClock||0)))g.life={activity:'escort',target:{x:target.x+offset,z:target.z+2},until:eco.s.time+10};}
}
