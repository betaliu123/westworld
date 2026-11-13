import {HeroCombat} from './hero-combat.js';
import {conflictCapable} from './combat-conflict.js';
import {visibleBetween} from './npc-awareness.js';

export const NPC_SWING={duration:1.12,strike:.5};
// Where a blow lands at its contact frame: within `distance`, and no further off the attacker's facing than `cos` allows.
// The warning painted on the ground during the wind-up is drawn from these same numbers.
export const NPC_REACH={distance:1.95,cos:.35};
export const inNpcReach=(dx,dz,facing)=>{const d=Math.hypot(dx,dz);return d<=NPC_REACH.distance&&(Math.sin(facing)*dx+Math.cos(facing)*dz)/Math.max(d,.01)>=NPC_REACH.cos;};
// Opponents surrounding one person: at most `strikers` swing at a time, and their swings start at least `stagger` seconds apart.
// Each keeps a bearing of their own, `radius` away and at least `gap` from the next; `near` is how close one must be to take a place.
export const CROWD={radius:1.55,gap:1.2,strikers:2,stagger:.35,near:7};
// Places around `center` for those closing on it. Each keeps the bearing they are already on where there is room;
// crowded bearings are spread until neighbours stand `gap` apart, and those who do not fit on the ring wait on one further out.
export function crowdSlots(center,attackers,{radius=CROWD.radius,gap=CROWD.gap}=CROWD){
 const out=new Map(),TAU=Math.PI*2;
 const all=attackers.map(a=>({id:a.id,angle:Math.atan2(a.x-center.x,a.z-center.z),d:Math.hypot(a.x-center.x,a.z-center.z)})).sort((a,b)=>a.d-b.d||(a.id<b.id?-1:1));
 for(let ring=0,from=0;from<all.length;ring++){
  const r=radius+ring*gap*1.1,need=2*Math.asin(Math.min(1,gap/(2*r))),room=Math.max(1,Math.floor(TAU/need));
  const group=all.slice(from,from+room).sort((a,b)=>a.angle-b.angle||(a.id<b.id?-1:1));from+=room;
  for(let round=0;round<200&&group.length>1;round++){let moved=false;
   for(let i=0;i<group.length;i++){const a=group[i],b=group[(i+1)%group.length],space=b.angle-a.angle+(i+1===group.length?TAU:0);
    if(space<need-1e-4){const push=(need-space)/2;a.angle-=push;b.angle+=push;moved=true;}}
   if(!moved)break;}
  for(const g of group)out.set(g.id,{x:center.x+Math.sin(g.angle)*r,z:center.z+Math.cos(g.angle)*r,ring});
 }
 return out;
}
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
  if(!inNpcReach(dx,dz,n.actor.rotation.y)||!visibleBetween(p,hero,world.obstacles,s.ecosystem?.objects))return;
  impact(id);
 },()=>{});
 if(!n.combat.swing&&world.t>=(n.nextHit||0)&&world.t>=(world.crowdSwingAt||0)&&distance(p,hero)<2.05&&visibleBetween(p,hero,world.obstacles,s.ecosystem?.objects)){
  // Others already winding up leave no room for one more.
  let winding=0;for(const o of world.npcs?.values()||[])if(o!==n&&o.combat?.swing&&!o.combat.swing.hit)winding++;
  if(winding>=CROWD.strikers)return;
  const swing=n.combat.begin();n.nextHit=world.t+NPC_SWING.duration+.28;world.crowdSwingAt=world.t+CROWD.stagger;
  n.model?.motion?.cue(npcArmed(s,id)?'attack':'punch',swing.duration);
 }
 const swing=n.combat.swing;
 if(swing){const wind=Math.min(1,swing.age/swing.strike),recover=Math.max(0,(swing.age-swing.strike)/(swing.duration-swing.strike));u.arms[0].rotation.x=-.5-1.8*Math.sin(wind*Math.PI/2)*(1-recover);u.arms[0].rotation.z=.35-.9*Math.sin(wind*Math.PI)*(1-recover);}
}
