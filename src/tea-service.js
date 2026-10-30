import {canEat,consumeFood,inspectFood} from './npc-life.js';
export const TEA_CUPS=[{id:'tea-cup-0',guest:'gate_relief',x:-7,z:27.2},{id:'tea-cup-1',guest:'gate_guard',x:-6,z:27.2},{id:'tea-cup-2',guest:'old_constable',x:-7,z:30},{id:'tea-cup-3',guest:'traveler',x:-6,z:30},{id:'tea-cup-4',guest:'gate_merchant',x:-6,z:32.6}];
export const TEAPOT={id:'tea-pot',x:-11.8,z:29.2};
export function teaStep(sim,eco,positions){
 const pot=eco.s.objects[TEAPOT.id];if(!pot||pot.hp<=0)return;
 const now=eco.s.time,host=sim.s.people.tea_host,q=positions.tea_host;
 const t=eco.s.teaService??={index:0,nextAt:now+8};
 let batch=eco.items('object:'+pot.id).find(i=>i.drink);
 if(!batch&&now>=(t.refillAt||0)){batch=eco.create('一壶热茶','food','object:'+pot.id,{drink:true,servings:6});}
 // A cup is a real serving, retained on the table until an eligible guest drinks.
 for(const cup of TEA_CUPS){const vessel=eco.s.objects[cup.id];if(!vessel||vessel.hp<=0)continue;
 const tea=eco.items('object:'+cup.id).find(i=>i.drink),n=sim.s.people[cup.guest],pos=positions[cup.guest];
 if(tea&&now>=tea.drinkAt&&n?.hp>0&&pos&&Math.hypot(pos.x-cup.x,pos.z-cup.z)<1.7&&canEat(sim,eco,cup.guest,pos)&&!(n.sickUntil>now)){
 if(!inspectFood(sim,cup.guest,tea)){if(!tea.refused){tea.refused=true;sim.emit('npcRoutine',{id:cup.guest,text:'这茶闻着不对，先别喝。'});}continue;}
 consumeFood(n,tea,now);n.drinkingUntil=now+3;if(tea.poisoned){n.memories.push('喝过茶后腹痛，不知道是谁动了手脚。');sim.emit('npcRoutine',{id:cup.guest,text:'这茶……喝下去肚子怎么绞着疼。'});}sim.save();}}
 const available=host?.hp>0&&q&&!(host.stunnedUntil>(sim.s.npcClock||0))&&!(host.sickUntil>now)&&!host.drowning&&!host.awareness?.caseOpen&&!['meal','rest','escape','collect'].includes(host.life?.activity);
 if(!available||now<t.nextAt)return;
 const cup=TEA_CUPS[t.index%TEA_CUPS.length],vessel=eco.s.objects[cup.id];
 if(!vessel||vessel.hp<=0||eco.items('object:'+cup.id).length){t.index++;t.nextAt=now+3;return;}
 let carried=eco.s.items.find(i=>i.id===t.carried&&i.location==='npc:tea_host');
 const target=carried?{x:-6.5,z:cup.z+1.15}:{x:TEAPOT.x,z:TEAPOT.z+1};host.life={activity:'serve',target};
 if(Math.hypot(q.x-target.x,q.z-target.z)>.55)return;
 if(!carried){if(!batch){t.nextAt=now+3;return;}if(batch.knownPoisonBy?.includes('tea_host')){if(t.warnedBatch!==batch.id){t.warnedBatch=batch.id;sim.emit('npcRoutine',{id:'tea_host',text:'有人动过这壶茶，不能给客人喝。'});}t.nextAt=now+8;return;}carried=eco.create('热茶','food','npc:tea_host',{drink:true,poisoned:batch.poisoned,knownPoisonBy:[...(batch.knownPoisonBy||[])],discovered:true});t.carried=carried.id;if(--batch.servings<=0){batch.location='consumed';t.refillAt=now+35;}host.pouringUntil=now+1;t.nextAt=now+1;}
 else{eco.transfer(carried,'object:'+cup.id);carried.drinkAt=now+4;host.pouringUntil=now+2;t.carried=null;t.index++;t.nextAt=now+4;sim.save();}
}
