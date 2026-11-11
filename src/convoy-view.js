import {CART,CONVOY_STONE,CONVOY_ENTRY_LINE,beginConvoyStrength,strengthReady,settleConvoyStrength,resolveConvoyTalk,convoyPreview,convoyTheftPreview,stealConvoyCargo} from './convoy.js';
import {surfacePoint} from './materials.js';
import {chapterFollowups} from './chapter.js';
import {visibleBetween} from './npc-awareness.js';

export function mountConvoyInteraction({world,getSim,getEco,dialogue,checkReveal,close,notify,choices}){
 let active=null;
 const resetStone=()=>{if(world.convoyTrialStone)world.convoyTrialStone.position.set(CONVOY_STONE.x,.45,CONVOY_STONE.z);};
 function cancel(){if(!active)return;if(active.ticket)active.ticket.cancelled=true;const cargo=active.cargo;active=null;world.auto=null;world.performance=null;world.keys.clear();checkReveal.cancel();resetStone();notify(cargo?'伸手动作中止。':'动作中止，尚未取得入队允诺。');}
 function reply(r){if(r?.error){notify(r.error);return;}dialogue.play(r.dialogue,cancelled=>{if(cancelled)return;const next=chapterFollowups(getSim(),'porter',r);if(next.length)choices('porter',next);},'');}
 function start(a){const sim=getSim(),eco=getEco(),check=convoyPreview(sim,a);if(check.blocked)return notify(check.reason);close();
  if(a.id==='ch_convoy_enter'){dialogue.play([{id:'porter',text:CONVOY_ENTRY_LINE}],cancelled=>{if(cancelled)return;const r=resolveConvoyTalk(sim,eco,a.id);if(r.error)notify(r.error);},'');return;}
  if(a.id==='ch_convoy_strength'){
   const ticket=beginConvoyStrength(sim,eco);if(ticket.error)return notify(ticket.error);
   dialogue.play([{id:'player',text:'先看我搬这块石头，再说缺不缺人。'},{id:'porter',text:'好。就在这儿，搬起来再稳稳放下，别逞强。'}],cancelled=>{if(cancelled)return;const goal=[CONVOY_STONE.x,CONVOY_STONE.z-1];if(!world.routeTo([CONVOY_STONE.x,CONVOY_STONE.z-1.5],.2))return notify('石块旁暂时走不过去。');world.auto.push(goal);active={action:a,ticket,phase:'approach',age:0,sim};},'');return;
  }
  if(a.id==='ch_convoy_charm'||a.id==='ch_convoy_bribe'){
   dialogue.play([{id:'player',text:a.id==='ch_convoy_charm'?'周大哥，替我留个位置可好？我会记着你这份情。':'六文茶钱，劳你给我留个位置。'}],cancelled=>{if(cancelled)return;world.perform({motion:a.stat?'talk':'offer',kind:'support'},'porter');active={action:a,phase:'perform',age:0,sim,beat:world.performance};if(a.stat)checkReveal.start(a,check);},'');return;
  }
  reply(resolveConvoyTalk(sim,eco,a.id));
 }
 function startTheft(itemId){const eco=getEco(),check=convoyTheftPreview(eco,itemId);if(check.blocked)return notify(check.reason);close();world.perform({motion:'reach',kind:'steal'},null);world.performance.targetPoint=surfacePoint(eco.s.objects[CART],getSim().s.player);active={cargo:itemId,age:0,sim:getSim()};checkReveal.start({stat:'agility',label:'偷取纲货'},check);}
 function update(dt){if(!active)return;const a=active,sim=getSim(),eco=getEco();
  if(a.cargo){a.age+=dt;if(a.sim!==sim||sim.s.player.hp<=0){cancel();return;}if(!a.settled&&a.age>=.65){const error=stealConvoyCargo(eco,a.cargo,{staged:true});if(error){notify(error);cancel();return;}a.settled=true;}if(a.age>=2.6){active=null;world.performance=null;checkReveal.stop();}return;}
  const n=sim.s.people.porter,q=world.npcs.get('porter')?.actor.position;
  if(a.sim!==sim||sim.s.player.hp<=0||!q||n.hp<=0||n.stunnedUntil>(sim.s.npcClock||0)||n.awareness?.caseOpen){cancel();return;}
  eco.positions.porter={x:q.x,z:q.z};a.age+=dt;
  if(a.phase==='approach'){
   if(a.age>15||!world.auto&&Math.hypot(sim.s.player.x-CONVOY_STONE.x,sim.s.player.z-(CONVOY_STONE.z-1))>.35){cancel();return;}
   if(Math.hypot(sim.s.player.x-CONVOY_STONE.x,sim.s.player.z-(CONVOY_STONE.z-1))>.35)return;
   if(!strengthReady(sim,eco,a.ticket)){cancel();return;}
   world.perform({motion:'lift',kind:'support'},'porter');a.beat=world.performance;a.beat.duration=3.2;a.beat.targetPoint=CONVOY_STONE;a.phase='perform';a.age=0;checkReveal.start(a.action,a.ticket.check);return;
  }
  if(a.ticket&&!strengthReady(sim,eco,a.ticket)||!a.ticket&&(Math.hypot(sim.s.player.x-q.x,sim.s.player.z-q.z)>4.8||!visibleBetween(sim.s.player,q,world.obstacles,eco.s.objects))){cancel();return;}
  if(a.ticket&&!a.roll&&a.age>=.65){a.ticket.ready=true;a.roll=settleConvoyStrength(sim,eco,a.ticket);if(a.roll.error){cancel();return;}checkReveal.play({...a.roll,label:a.action.label,actionId:a.action.id},()=>{},true);}
  if(a.ticket&&world.convoyTrialStone){const h=Math.sin(Math.PI*Math.max(0,Math.min(1,(a.age-.65)/2.2)));world.convoyTrialStone.position.y=.45+Math.max(0,h)*(a.roll?.success?.7:.04);}
  const settleAt=a.ticket?3.2:1.15;
  if(!a.result&&a.age>=settleAt){
   if(a.ticket)a.result=resolveConvoyTalk(sim,eco,a.action.id,a.roll);
   else a.result=resolveConvoyTalk(sim,eco,a.action.id);
   if(a.result?.error){notify(a.result.error);cancel();return;}
   if(a.result.roll!=null&&!a.ticket)checkReveal.play(a.result,()=>{},true);
  }
  if(a.age>=(a.ticket?3.2:2.6)){active=null;world.performance=null;checkReveal.stop();resetStone();reply(a.result);}
 }
 window.addEventListener('keydown',e=>{if(active&&['Escape','KeyW','KeyA','KeyS','KeyD'].includes(e.code)&&!checkReveal.active)cancel();},true);
 return {start,startTheft,update,cancel,get active(){return !!active;}};
}
