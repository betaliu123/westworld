import {visitContext} from './action-card-dialogue.js';

// One bounded request per actual visit. Late responses never replace a line already opened.
export function createVisitDirector(request){
 const pending=new WeakSet();
 return function prefetch(sim,e,ready){
  if(!ready||!e||e.template==='revenge'||e.dialogueLocked||e.dialogueChoice||pending.has(e)||!['approach','waiting'].includes(e.phase))return;
  pending.add(e);const s=sim.s,context=visitContext(s,e);
  return request(context).then(result=>{
   if(sim.s!==s||s.deck?.actions?.active!==e||e.dialogueLocked||!['approach','waiting'].includes(e.phase))return;
   // IDs only; all text is reviewed locally, and selection is revalidated on opening.
   if(result&&typeof result.opening==='string'){e.dialogueChoice={opening:result.opening,topic:typeof result.topic==='string'?result.topic:null};sim.save();}
  }).catch(()=>{});
 };
}
