export const inDeepWater=(x,z)=>x>-25.5&&x< -18.5&&Math.abs(z-12)>2.2;
export function waterStep(player,dt){player.drowning=inDeepWater(player.x,player.z);if(player.drowning&&player.hp>0)player.hp=Math.max(0,player.hp-8*dt);return player.drowning;}
export function toggleRunner(player){if(!player.inventory.includes('旧差役服'))return false;player.disguise=player.disguise==='runner'?null:'runner';return true;}

export function environmentStep(actor,dt,objects={}){waterStep(actor,dt);actor.burning=Object.values(objects).some(o=>o.burning&&o.hp>0&&Math.hypot(o.x-actor.x,o.z-actor.z)<1.8);if(actor.burning&&actor.hp>0)actor.hp=Math.max(0,actor.hp-8*dt);return actor.drowning;}
