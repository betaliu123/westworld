// The model names a speech intent only. It never receives or supplies game state.
export const REPLY_LIMIT=120;
export const REPLY_INTENTS=Object.freeze({identity:'冒认身份',connection:'搬出熟人',weakness:'示弱',clothing:'说明衣着',explain:'解释来由'});
export function replyText(value){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim():'';}
export function validReply(value){const text=replyText(value);return text.length>0&&text.length<=REPLY_LIMIT;}
export function readReplyIntent(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||!Object.hasOwn(data,'intent'))throw Error('invalid_intent');
 if(data.intent==='unknown')throw Error('unknown_intent');
 if(!Object.hasOwn(REPLY_INTENTS,data.intent))throw Error('invalid_intent');
 return data.intent;
}
export async function classifyReply(value,{signal,fetcher=globalThis.fetch,timeout=10000}={}){
 const text=replyText(value);if(!validReply(text))throw Error('invalid_text');
 const controller=new AbortController(),abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const timer=setTimeout(abort,timeout);
 try{
  const response=await fetcher('/api/reply-intent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:controller.signal});
  if(!response.ok)throw Error('unavailable');
  const data=await response.json();if(controller.signal.aborted)throw Error('aborted');
  return readReplyIntent(data);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

// A made-up illness or connection cannot create its supporting fact or bonus.
export function disguiseReplyApproach(s,intent){
 if(intent==='weakness'){
  if(s.player.hp<=(s.player.maxHp||100)*.3)return 'low_hp';
  if(s.player.sickUntil>(s.ecosystem?.time||0))return 'sick';
 }
 if(intent==='clothing'&&s.ecosystem?.items.some(i=>i.id===s.player.wornOutfit&&i.location==='player'&&i.hp>0))return 'clothing';
 return 'default';
}
export function replyRuleNote(intent,approach){
 if(intent==='connection')return '提及熟人不等于有人担保';
 if(intent==='weakness'&&approach==='default')return '眼下无伤病，按普通解释';
 return '';
}
