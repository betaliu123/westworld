import {visibleBetween} from './npc-awareness.js';
export const helpless=(sim,n)=>n.hp<=0||n.stunnedUntil>(sim.s.npcClock||0);
export function outfit(sim){const p=sim.s.player;return p.disguise==='borrowed'&&sim.s.ecosystem.items.find(i=>i.id===p.wornOutfit&&i.location==='player'&&i.hp>0);}
export function knowsName(sim,id){return !!sim.s.facts.knownNames?.[id]||(id==='traveler'&&!!sim.s.facts.princeAlias)||(id==='gate_merchant'&&sim.s.player.inventory.includes('他人的路引'));}
export function disguiseDifficulty(sim){const i=outfit(sim);return 70-(i&&knowsName(sim,i.ownerId)?25:0)-(i?.identityPaper?10:0)+Math.min(30,Math.floor((i?.exposure||0)/20));}
export function patrolStep(sim,eco,dt){const i=outfit(sim),p=sim.s.player;if(!i||p.hp<=0)return;i.exposure=(i.exposure||0)+dt;if(!sim.s.facts.enteredCity||p.z>19.5||eco.s.time<(p.nextIdentityCheck||0))return;
 const id=['guard','gate_guard','gate_relief','inspector'].find(id=>{const q=eco.positions[id],n=sim.s.people[id];return q&&n&&!helpless(sim,n)&&Math.hypot(q.x-p.x,q.z-p.z)<4&&visibleBetween(q,p,eco.obstacles||[],eco.s.objects);});if(!id)return;
 p.nextIdentityCheck=eco.s.time+35;const chance=Math.max(5,Math.min(90,p.stats.charm+40-disguiseDifficulty(sim))),roll=1+Math.floor(sim.rng()*100),success=roll<=chance;
 sim.emit('fieldCheck',{label:'应付身份盘查',actionId:'probe',target:id,roll,chance,check:{chance},success});
 if(!success){p.disguise=null;p.wornOutfit=null;sim.s.wanted=Math.min(9,sim.s.wanted+2);sim.emit('worldIncident',{type:'theft',owner:id,target:id,x:p.x,z:p.z});}
 eco.log(success?'盘查暂且过关，久留仍有暴露风险。':'冒名身份被识破，嫌疑 +2。',[{id,text:success?'下回带齐凭据。走吧。':'姓名来历对不上！留下说清楚。'}]);
}

export function dressActor(actor,baseColor,color){if(!actor.userData.clothingMeshes){actor.userData.clothingMeshes=[];actor.traverse(m=>{if(m.isMesh&&m.material?.color?.getHex()===baseColor){m.material=m.material.clone();actor.userData.clothingMeshes.push(m);}});}for(const m of actor.userData.clothingMeshes)m.material.color.setHex(color);}
