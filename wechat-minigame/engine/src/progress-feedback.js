// Passive recovery must never replace the result of a deliberate action.
export function createFeedbackQueue(){
 let owner=null,lastId=0,current=null,until=0,pending=[];
 const important=e=>e.changes.some(c=>!['hp','energy'].includes(c.key))||e.reason!=='行动与身体状态变化';
 return {update(state,now){
  if(owner!==state){owner=state;lastId=state.consequences?.at(-1)?.id||0;current=null;pending=[];until=0;}
  for(const entry of state.consequences||[]){if(entry.id<=lastId)continue;lastId=entry.id;
   if(important(entry)){pending.push(entry);if(current&&!important(current)){current=null;until=0;}}
   else if(!pending.length&&(!current||!important(current))){current=entry;until=now+3000;}
  }
  if(now>=until)current=null;
  if(!current&&pending.length){current=pending.shift();until=now+6500;}
  return current;
 }};
}
