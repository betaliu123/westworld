// One physical document, independent of the currently active story scene.
export function ensureMerchantPass(s){
 const eco=s.ecosystem;if(!eco)return null;
 let item=eco.items.find(i=>i.documentId==='merchant-pass'||['他人的路引','改名路引'].includes(i.storyId));
 if(item){item.documentId='merchant-pass';return item;}
 const name=s.player.inventory.includes('改名路引')?'改名路引':'他人的路引';
 const location=s.player.inventory.includes(name)?'player':s.facts.gatePassTaken?'confiscated':'npc:gate_merchant';
 item={id:'item-'+(++eco.seq),name,type:'document',documentId:'merchant-pass',storyId:name,location,material:'wood',hp:30,max:30,poisoned:false,discovered:true};eco.items.push(item);return item;
}
export function updateMerchantPass(s,location,name){
 const item=ensureMerchantPass(s);if(!item)return;
 s.player.inventory=s.player.inventory.filter(i=>!['他人的路引','改名路引'].includes(i));
 item.location=location;if(name)item.name=item.storyId=name;
 if(location==='player'){s.player.inventory.push(item.storyId);s.facts.gatePassTaken=true;}
}
