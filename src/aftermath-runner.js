import {aftermathContext,applyAftermath,chronicle,deliverMail,echoOptions} from './event-deck.js';

const running=new WeakMap();
export async function requestAftermath(context,{fetchImpl=globalThis.fetch,timeout=9000}={}){
 if(!context.deeds.length)return {ai:null,status:'empty'};
 try{
  const r=await fetchImpl('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(context),signal:AbortSignal.timeout(timeout)});
  if(!r.ok)return {ai:null,status:r.status===503?'offline':r.status===429?'busy':'error'};
  return {ai:await r.json(),status:'ok'};
 }catch(error){return {ai:null,status:['TimeoutError','AbortError'].includes(error.name)?'timeout':'error'};}
}

// A save made by the old direct day += 3 release can still have unresolved facts.
// Repair only the missing inference; never replay the sentence or its penalties.
export function pendingPrisonAftermath(s){
 const c=chronicle(s);if(c.pendingAftermath)return c.pendingAftermath;
 const release=c.deeds.findLast(d=>d.text==='刑满出狱入城');
 if(s.chapterVersion!==2||s.facts.entryRoute!=='prison'||!release||release.id<=(c.restSeq||0))return null;
 return c.pendingAftermath={id:'prison-legacy:'+release.id,reason:'prison',days:3,fromDay:Math.max(1,release.day-3),toDay:release.day};
}

// All night/day callers share one serial settlement lane. Three prison days are
// one batch of real facts, not three concurrent requests for the same incident.
export function runAftermath(sim,{request=requestAftermath,isCurrent=()=>true}={}){
 const prior=running.get(sim)||Promise.resolve();
 const job=prior.catch(()=>{}).then(async()=>{
  if(!isCurrent())return null;
  const s=sim.s,c=chronicle(s),pending=c.pendingAftermath,ctx=aftermathContext(s),upTo=c.seq,options=echoOptions(s);
  if(pending)ctx.elapsed={reason:pending.reason,days:pending.days,fromDay:pending.fromDay,toDay:pending.toDay};
  let after=null;
  if(ctx.deeds.length){
   let reply;try{reply=await request(ctx);}catch{reply={ai:null,status:'error'};}
   if(!isCurrent())return null;
   after=applyAftermath(sim,reply?.ai,upTo,options);
   after.diary.inference={status:after.diary.ai||after.echoes.some(e=>e.ai)?'ai':reply?.status==='ok'?'invalid':reply?.status||'error',...(ctx.elapsed||{}),upTo};
  }
  const cards=deliverMail(sim);
  if(pending&&c.pendingAftermath?.id===pending.id)delete c.pendingAftermath;
  sim.save();return {after,cards};
 });
 running.set(sim,job);job.finally(()=>{if(running.get(sim)===job)running.delete(sim);}).catch(()=>{});
 return job;
}

export function inferenceLabel(inference){
 const status={ai:'AI 已推演',offline:'模型未连接 · 本地规则',busy:'模型繁忙 · 本地规则',timeout:'模型超时 · 本地规则',invalid:'模型输出未通过校验 · 本地规则',error:'模型请求失败 · 本地规则'}[inference?.status];
 return status?(inference.reason==='prison'?'三日刑期 · ':'')+status:'';
}
