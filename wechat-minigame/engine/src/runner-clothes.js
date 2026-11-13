// One physical garment backs every acquisition path and the legacy story flag.
export const RUNNER_COAT='旧差役服';
export function runnerClothesTaken(s){return !!(s.facts.runnerClothesTaken||s.player.inventory.includes(RUNNER_COAT)||s.ecosystem?.items.some(i=>i.storyId===RUNNER_COAT));}
export function acquireRunnerClothes(s,method='found'){
 const e=s.ecosystem??={time:0,seq:0,items:[],objects:{},hunger:{},rewards:{}};
 const old=e.items.find(i=>i.storyId===RUNNER_COAT);if(old)return old;
 const item={id:'item-'+(++e.seq),name:RUNNER_COAT,type:'clothing',storyId:RUNNER_COAT,location:'player',ownerId:'relay',identityRole:'差役',appearanceModel:'guard',material:'cloth',hp:30,max:30,discovered:true,provenance:{originalOwner:'relay',history:[{from:'object:runner-clothes',to:'player',method,day:s.day,at:e.time,witnesses:[]}]}};
 e.items.push(item);s.facts.runnerClothesTaken=true;
 if(!s.player.inventory.includes(RUNNER_COAT))s.player.inventory.push(RUNNER_COAT);
 return item;
}
export function migrateRunnerClothes(s){
 const legacy=s.player.inventory.includes(RUNNER_COAT),existing=s.ecosystem?.items.find(i=>i.storyId===RUNNER_COAT);
 if(legacy&&!existing){const item=acquireRunnerClothes(s,'legacy-acquisition');if(s.player.disguise==='runner')s.player.wornOutfit=item.id;}
 if(existing||legacy)s.facts.runnerClothesTaken=true;
 // A transferred or dropped garment must not be recreated from an old flag.
 if(existing&&existing.location!=='player')s.player.inventory=s.player.inventory.filter(i=>i!==RUNNER_COAT);
}
