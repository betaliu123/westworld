import {HeroCombat} from './hero-combat.js';
import {conflictCapable} from './combat-conflict.js';
import {visibleBetween} from './npc-awareness.js';

export const NPC_SWING={duration:1.12,strike:.5};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function npcArmed(s,id){const n=s.people[id];return n.weaponType!=='fists'&&!(n.disarmedUntil>(s.npcClock||0));}
// Same one-impact/interruptible swing clock as the player. Animation cannot deal damage.
export function stepNpcCombat(world,id,n,dt,impact){
 const s=world.sim.s,st=s.people[id],u=n.actor.userData;
 n.combat??=new HeroCombat([NPC_SWING]);
 const hurt=n.attackHp!=null&&st.hp<n.attackHp;n.attackHp=st.hp;
 const awareness=st.awareness?.state;
 const fighting=awareness==='fight'||((!awareness||awareness==='idle')&&n.chasing);
 const allowed=world.playing&&!world.locked&&!world.cinematic&&!s.surrender&&s.player.hp>0&&fighting&&conflictCapable(s,id);
 if(hurt){n.recoilUntil=world.t+.3;n.nextHit=Math.max(n.nextHit||0,world.t+.5);}
 if(!allowed||hurt||world.t<(n.recoilUntil||0)){n.combat.cancel();n.model?.motion?.cancelAttack();return;}
 if(dt<=0)return;
 const p=n.actor.position,hero=world.hero.position;
 n.combat.step(dt,true,()=>{
  const dx=hero.x-p.x,dz=hero.z-p.z,d=distance(p,hero);
  world.onSound?.('attack',p);
  if(d>1.95||(Math.sin(n.actor.rotation.y)*dx+Math.cos(n.actor.rotation.y)*dz)/Math.max(d,.01)<.35||!visibleBetween(p,hero,world.obstacles,s.ecosystem?.objects))return;
  impact(id);
 },()=>{});
 if(!n.combat.swing&&world.t>=(n.nextHit||0)&&distance(p,hero)<2.05&&visibleBetween(p,hero,world.obstacles,s.ecosystem?.objects)){
  const swing=n.combat.begin();n.nextHit=world.t+NPC_SWING.duration+.28;
  n.model?.motion?.cue(npcArmed(s,id)?'attack':'punch',swing.duration);
 }
 const swing=n.combat.swing;
 if(swing){const wind=Math.min(1,swing.age/swing.strike),recover=Math.max(0,(swing.age-swing.strike)/(swing.duration-swing.strike));u.arms[0].rotation.x=-.5-1.8*Math.sin(wind*Math.PI/2)*(1-recover);u.arms[0].rotation.z=.35-.9*Math.sin(wind*Math.PI)*(1-recover);}
}
