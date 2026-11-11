// A reach keeps its own observed witnesses; browsing never creates an attempt.
export function beginTheftAttempt(eco,id,itemId){
 const preview=eco.theftPreview(id,itemId);
 if(preview.blocked)return {error:preview.reason};
 const origin={x:eco.sim.s.player.x,z:eco.sim.s.player.z},seen=new Set();let done=false;
 const interrupted=()=>{const p=eco.sim.s.player;return p.hp<=0||!p.crouched||Math.hypot(p.x-origin.x,p.z-origin.z)>.35||!!eco.theftBlock(id);};
 return {preview,id,itemId,
  sample(){if(!done)for(const witness of eco.theftRisk(id).witnesses)seen.add(witness);},
  interrupted,
  cancel(){done=true;},
  finish(){if(done)return;done=true;if(interrupted())return {error:'已收手，财物仍在原处。'};const observed=[...seen],check=eco.theftPreview(id,itemId,observed);return {check,error:eco.stealNpc(id,itemId,{staged:true,observed})};},
 };
}
