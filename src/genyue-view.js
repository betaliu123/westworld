import {genyuePreview,resolveGenyue} from './genyue.js';
import {chapterFollowups} from './chapter.js';

// Payment and document receipt settle after the visible handover, never on browsing.
export function mountGenyueInteraction({world,getSim,getEco,dialogue,close,notify,choices,events=window}){
 let active=null;
 function cancel(){if(!active)return;const a=active;active=null;if(world.performance===a.beat)world.performance=null;notify('交接中止，钱物尚未转移。');}
 function start(id,action){const sim=getSim(),check=genyuePreview(sim,id,action,getEco());if(check.blocked)return notify(check.reason);
  close();world.perform({motion:'offer',kind:'support'},id);active={sim,id,action,beat:world.performance,x:sim.s.player.x,z:sim.s.player.z,hp:sim.s.player.hp};
 }
 function update(){if(!active)return;const a=active,sim=getSim(),eco=getEco(),q=world.npcs.get(a.id)?.actor.position;if(q)eco.positions[a.id]={x:q.x,z:q.z};const elapsed=world.t-a.beat.start;
  if(a.sim!==sim||dialogue.active||sim.s.player.hp<a.hp||Math.hypot(sim.s.player.x-a.x,sim.s.player.z-a.z)>.25||genyuePreview(sim,a.id,a.action,eco).blocked||world.performance&&world.performance!==a.beat||!world.performance&&elapsed<a.beat.duration){cancel();return;}
  if(elapsed<a.beat.duration)return;active=null;if(world.performance===a.beat)world.performance=null;
  const r=resolveGenyue(sim,eco,a.id,a.action.id);if(r.error)return notify(r.error);
  dialogue.play(r.dialogue,cancelled=>{if(cancelled)return;const next=chapterFollowups(sim,a.id,r);if(next.length)choices(a.id,next);},'');
 }
 events.addEventListener('keydown',e=>{if(active&&['Escape','KeyW','KeyA','KeyS','KeyD'].includes(e.code))cancel();},true);
 return {start,update,cancel,get active(){return !!active;}};
}
