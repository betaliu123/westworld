import {classifyReply,replyText,validReply,REPLY_LIMIT,REPLY_INTENTS} from './reply-intent.js';

// This owns a draft, not an action. Only the second, explicit submit commits.
export function mountReplyComposer(host,{prepare,onCommit,classify=classifyReply,formatCheck}){
 host.innerHTML='<form class="reply-draft"><textarea aria-label="编一句辩解" placeholder="用自己的话辩解……" rows="3"></textarea><small class="reply-count"></small><output class="reply-preview" aria-live="polite"></output><button type="submit">斟酌这句</button></form>';
 const form=host.querySelector('form'),input=host.querySelector('textarea'),count=host.querySelector('small'),output=host.querySelector('output'),button=host.querySelector('button');
 input.maxLength=REPLY_LIMIT;let alive=true,epoch=0,pending=null,ready=null,composing=false,stale=false;
 const signature=r=>JSON.stringify(r);
 function invalidate(){epoch++;pending?.abort();pending=null;ready=null;stale=false;button.textContent='斟酌这句';button.disabled=!validReply(input.value);form.removeAttribute('aria-busy');output.textContent='';count.textContent=`${input.value.length} / ${REPLY_LIMIT}`;}
 function show(r){output.textContent=[REPLY_INTENTS[r.intent],r.note,formatCheck(r.action,r.preview)].filter(Boolean).join(' · ');button.textContent='说出口';button.disabled=!!r.preview.blocked;}
 input.addEventListener('input',invalidate);
 input.addEventListener('compositionstart',()=>{composing=true;invalidate();});
 input.addEventListener('compositionend',()=>{composing=false;invalidate();});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!alive||pending||composing||stale||!validReply(input.value))return;
  const text=replyText(input.value);
  if(ready){
   const fresh=prepare(ready.intent,text);
   if(!fresh){stale=true;ready=null;output.textContent='眼前情形已变，请返回重新回应。';button.disabled=true;return;}
   if(signature(fresh)!==signature(ready.rule)){ready.rule=fresh;show(fresh);return;}
   if(fresh.preview.blocked)return;
   alive=false;onCommit({...fresh,text});return;
  }
  const mine=++epoch,controller=new AbortController();pending=controller;button.disabled=true;button.textContent='斟酌中…';form.setAttribute('aria-busy','true');
  try{
   const intent=await classify(text,{signal:controller.signal});
   if(!alive||mine!==epoch||controller.signal.aborted)return;
   const rule=prepare(intent,text);
   if(!rule){stale=true;output.textContent='眼前情形已变，请返回重新回应。';button.disabled=true;button.textContent='斟酌这句';return;}
   ready={intent,rule};show(rule);
  }catch(error){
   if(!alive||mine!==epoch)return;
   output.textContent=error.message==='unknown_intent'?'这句尚无可用说法，换个理由或返回选一句。':'暂时无法辨认说法，可重试或返回选一句。';button.textContent='再试一次';button.disabled=false;
  }finally{if(alive&&mine===epoch){pending=null;form.removeAttribute('aria-busy');}}
 });
 invalidate();input.focus({preventScroll:true});
 return ()=>{alive=false;epoch++;pending?.abort();};
}
