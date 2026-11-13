import {exchange,exchangePreview,exchangeAccess,exchangeItem} from './item-exchange.js';
import {itemMeaning} from './item-meaning.js';
import {icon} from './ui-icons.js';

export function exchangeMarkup({name,items,selection,error='',quote=null,task=null,preview=null,busy=false,replies=[],escape}){
 const taskName=task?.startsWith('ap_news_')?'拿食物换消息':{medicine:'送药',ledger:'交付原账',ring:'归还银戒',manifest:'查看名册',entry:'验看凭据',handover:'交付名册'}[task];
 const odds=preview&&!preview.certain&&!preview.blocked?`风仪 ${preview.score} · ${preview.chance}% · ${preview.reason}`:preview?.reason||'';
 const grid=items.map(i=>`<button data-present="${escape(i.key)}" class="pack-tile ${i.key===selection?'selected':''}" aria-pressed="${i.key===selection}">${icon(i.icon)}<span>${escape(i.name)}</span>${i.equipped?'<small>已穿戴</small>':''}</button>`).join('');
 const actions=selection?`<div class="item-exchange-actions" role="group" aria-label="物品用途"><button data-item-mode="show" title="给对方看，物品仍留在行囊">出示</button><button data-item-mode="gift" title="交付任务物品，或免费送给对方">赠送</button><button data-item-mode="trade" title="询问对方愿意给的价钱或物品">交易</button></div>`:'';
 const offers=quote?.offers?.length?`<div class="item-trade-offers" role="group" aria-label="对方报价">${quote.offers.map(o=>`<button data-accept-offer="${escape(o.id)}">换取 ${escape(o.label)}</button>`).join('')}<button data-decline-offer>不换</button></div>`:'';
 const responses=replies.length?`<div class="item-trade-offers" role="group" aria-label="回应">${replies.map((r,i)=>`<button data-item-reply="${i}" ${r.disabled?'disabled':''}>${escape(r.label)}</button>`).join('')}</div>`:'';
 const content=`<header><b>${escape(name)}${taskName?' · '+taskName:''}</b><button data-close aria-label="关闭" title="关闭">${icon('X')}</button></header><div class="item-exchange-body"><div class="pack-grid">${grid}</div>${items.length?'':'<p>行囊空空。</p>'}</div>${actions}<div class="item-exchange-check"></div><div class="item-exchange-result"><p role="status">${escape(error||quote?.text||'')}</p>${odds?'<p class="item-check-preview">'+escape(odds)+'</p>':''}${offers}${responses}</div>`;
 return busy?content.replace(/<button (?!data-close)/g,'<button disabled '):content;
}

// The same physical handover owns menu, drag/drop and task submission.
export function mountItemExchange({world,getSim,getEco,isOpen=()=>true,getCheckTarget=()=>null,onPending=()=>{},onEndFeedback=()=>{},notify,onResult,onOrigin,checkReveal,events=window}){
 let active=null;
 function stopFeedback(){world.itemExchange=null;onEndFeedback();}
 function react(id,text){world.itemExchange={targetId:id,phase:'inspect',talkAt:world.t+.45,until:world.t+Math.max(2.5,Math.min(6,text.length*.1))};}
 function cancel(){if(!active)return;if(active.result)return;const a=active;active=null;if(world.performance===a.beat)world.performance=null;checkReveal?.cancel();onPending(false);stopFeedback();if(isOpen(a.id))notify('动作中止，物品仍在原处。');}
 function start(id,key,mode,options={}){
  const sim=getSim(),eco=getEco(),check=exchangePreview(sim,eco,id,key,mode,options);if(check.blocked)return {error:check.reason};
  const item=exchangeItem(eco,key),meaning=itemMeaning(sim.s,id,item);
  if(mode==='gift'&&meaning?.kind==='return'&&!options.answer&&!check.mismatch){onOrigin(id,item.id,meaning.line,options);return {needsOrigin:true};}
  if(active||world.performance)return {error:'先完成当前动作。'};
  stopFeedback();onPending(true);world.perform({motion:mode==='gift'||options.offer?'handover':'present',kind:'support',camera:false,duration:mode==='gift'||options.offer?1.1:.85},id);
  world.itemExchange={targetId:id,phase:'inspect',until:world.t+2};
  active={sim,id,key,mode,options,beat:world.performance,x:sim.s.player.x,z:sim.s.player.z,hp:sim.s.player.hp};
  if(!check.certain)checkReveal?.start({stat:'charm',label:mode==='show'?'验看凭据':'解释来历'},check,{live:true,inline:true,inlineTarget:getCheckTarget(),onCancel:cancel});
  return {pending:true};
 }
 function update(){
  const reaction=world.itemExchange;
  if(reaction){if(!isOpen(reaction.targetId)||exchangeAccess(getSim(),getEco(),reaction.targetId)||world.t>=reaction.until)stopFeedback();else if(reaction.talkAt<=world.t)reaction.phase='talk';}
  if(!active)return;const a=active,sim=getSim(),eco=getEco(),q=world.npcs.get(a.id)?.actor.position;
  if(q)eco.positions[a.id]={x:q.x,z:q.z};
  const elapsed=world.t-a.beat.start;
  if(a.result){if(elapsed<a.beat.duration)return;active=null;if(world.performance===a.beat)world.performance=null;checkReveal?.cancel();onPending(false);if(isOpen(a.id))onResult(a.id,a.key,a.result,a.options);return;}
  if(!isOpen(a.id,a.key)||a.sim!==sim||sim.s.player.hp<a.hp||Math.hypot(sim.s.player.x-a.x,sim.s.player.z-a.z)>.25||exchangeAccess(sim,eco,a.id)||!exchangeItem(eco,a.key)||
    (world.performance&&world.performance!==a.beat)||(!world.performance&&elapsed<a.beat.duration)){cancel();return;}
  if(elapsed<a.beat.duration-.35)return;
  const result=exchange(sim,eco,a.id,a.key,a.mode,{...a.options,staged:true});
  if(result.error){cancel();return notify(result.error);}
  a.result=result;if(result.roll!=null)checkReveal?.play(result,()=>{},true);
  if(elapsed>=a.beat.duration)update();
 }
 events.addEventListener('keydown',e=>{if(active&&['Escape','KeyW','KeyA','KeyS','KeyD'].includes(e.code))cancel();},true);
 return {start,update,cancel,react,stopFeedback,get active(){return !!active;}};
}
