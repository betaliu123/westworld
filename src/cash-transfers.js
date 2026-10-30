import {visibleBetween} from './npc-awareness.js';
// Money is debited when placed, credited only when the same pile is collected.
export function placePayment(sim,eco,{payer,payee,amount,x,z,y=.16,stand={x,z},reason='交易'}){
 const account=payer==='player'?sim.s.player:sim.s.people[payer],key=payer==='player'?'money':'purse';
 if(!account||!sim.s.people[payee]||!Number.isInteger(amount)||amount<=0||(account[key]||0)<amount)return null;
 const support=Object.values(eco.s.objects).find(o=>['table','stall'].includes(o.kind)&&Math.abs(x-o.x)<(o.w||2)/2&&Math.abs(z-o.z)<(o.d||1.5)/2);account[key]-=amount;const item=eco.create(amount+'文铜钱','coins','ground',{amount,payer,supportId:support?.id,owner:payee,x,z,y,stand:{...stand},material:'metal',reason,collectAt:eco.s.time+6,settled:false});sim.save();return item;
}
export function collectPayments(sim,eco,positions){
 for(const [id,n]of Object.entries(sim.s.people)){const q=positions[id];if(!q||n.hp<=0||n.stunnedUntil>(sim.s.npcClock||0)||n.sickUntil>eco.s.time||n.drowning||n.inCustody||n.awareness?.caseOpen||['fight','warn','flee','escape'].includes(n.life?.activity)){delete n.collectItem;delete n.collectUntil;continue;}
 const pile=eco.s.items.find(i=>i.type==='coins'&&i.owner===id&&!i.settled&&i.collectAt<=eco.s.time);if(!pile)continue;
 n.life={activity:'collect',target:{...pile.stand}};
 if(Math.hypot(q.x-pile.stand.x,q.z-pile.stand.z)>.65||!visibleBetween(q,pile,(eco.obstacles||[]).filter(o=>o.id!==pile.supportId),eco.s.objects))continue;
 if(pile.location!=='ground'||pile.hp<=0){pile.settled=true;delete n.collectUntil;sim.emit('npcRoutine',{id,text:'方才放在这里的钱呢？'});sim.save();continue;}
 if(n.collectItem!==pile.id){n.collectItem=pile.id;n.collectUntil=eco.s.time+1;continue;}if(eco.s.time<n.collectUntil)continue;
 pile.location='collected';pile.settled=true;n.purse=(n.purse||0)+pile.amount;delete n.collectItem;delete n.collectUntil;
 sim.emit('npcCheck',{id,label:'+'+pile.amount+' 文',success:true,observation:true,income:true});sim.save();
 }
}
export function takePayment(sim,eco,item){const p=sim.s.player;if(!item||item.type!=='coins'||item.location!=='ground'||item.hp<=0||p.hp<=0)return '钱已经不在这里。';if(!eco.range(item.x,item.z,2.8)||!visibleBetween(p,item,(eco.obstacles||[]).filter(o=>o.id!==item.supportId),eco.s.objects))return '再靠近些，隔着障碍够不到。';if(!p.stealing||!p.crouched)return '这是别人的钱；按 Z 蹲下后可以尝试偷取。';
 const c=eco.check('偷取桌上钱币',item.owner);p.energy=Math.max(0,p.energy-3);const event={type:'theft',owner:item.owner,target:item.id,x:item.x,z:item.z,covert:c.success};sim.emit('worldIncident',event);if(!c.success){eco.log('没能取到钱，钱仍留在原处。');return;}
 item.location='stolen';p.money+=item.amount;eco.log('取走 '+item.amount+' 文'+(event.witnesses?.length?'，动作被看见了。':'。'));return;
}
