import {skill,practice,npcHitDamage} from './skills.js';
import {GUARD,guardChip} from './hero-combat.js';

// Timing and facing come from the world; the same settlement is used for both NPC attack paths.
export function defend(sim,id,{guarding=false,front=false,perfect=false}={}){
 const s=sim.s,p=s.player,n=s.people[id],tier=skill(p,'combat').tier;
 let damage=npcHitDamage(s,id),blocked=false,parried=false;
 // Anyone holding a blade can raise it; practice lets less through (GUARD) and the world widens the timing it calls perfect.
 if(guarding&&front&&p.energy>=GUARD.cost&&p.hp>0){
  p.energy-=GUARD.cost;blocked=true;parried=perfect;
  damage=parried?0:Math.ceil(damage*guardChip(tier));
  practice(p,'combat',3,'guard:'+id+':'+s.day);
  if(parried){p.counterUntil=(s.npcClock||0)+2;n.stunnedUntil=Math.max(n.stunnedUntil||0,(s.npcClock||0)+1.2);}
 }
 p.hp=Math.max(0,p.hp-damage);
 if(blocked)sim.emit('combatDefense',{id,parried,damage,label:parried?'卸力 · 可反击':'架刀格挡'});
 return {damage,blocked,parried};
}
export function counterStrike(sim,id){const s=sim.s,p=s.player,n=s.people[id];if(!(p.counterUntil>(s.npcClock||0)))return 1;p.counterUntil=0;
 if(skill(p,'combat').tier>=4){n.disarmedUntil=(s.npcClock||0)+12;sim.emit('combatDefense',{id,label:'缴械 · 十二息',parried:true});}
 return 1.5;
}
