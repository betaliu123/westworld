import {SCENES} from './data.js';
import {earnGrowth,checkGrade} from './growth.js';
const story=(speaker,opening,obstacle,approach,stat,accept,decline,next)=>({speaker,opening,obstacle,approach,stat,accept,decline,next});
export const CONTINUATIONS={
 banquet:story('gao','席已经摆了。苏晚还在想往后的路，别只顾着催新人喝酒。','沈砚说铺子不能没人守，苏晚又不愿取消远行。总得有人把这几日的安排说清。','问清两人各自不能耽搁的事','wit','替他们排出轮流看店的日程','替高小楼招呼宾客，留两人私下商量','favor'),
 ring_quarrel:story('su','我在意的不是一枚戒指值多少钱，是答应的事有没有放在心上。','沈砚说已经找遍桥边。你若替他说话，总得告诉我往后怎么不再失约。','先请两人各说一遍当天经过','wit','请沈砚给出能兑现的安排','不替任何人保证，请两人暂缓婚期','confidence'),
 dispute:story('shen','桥头那件事，我还没有听见你的解释。','道歉我听见了。可街坊还在传话，你愿意当着高小楼把经过说清吗？','先说明自己当时为何介入','charm','请高小楼作证，承认自己做错的部分','承担 8 文损耗，请他先收刀','truce'),
 confidence:story('su','我想出去唱自己写的曲子。每次说起，他们都问我何时回来成亲。','沈砚为差事发愁，我也不能用一辈子的去留替他填这个窟窿。你会怎么劝他？','问她想去哪里，最担心什么','charm','支持她亲自说明去留，不替她作决定','替她带一句口信，请沈砚来听她说','favor'),
 favor:story('shen','行商被拦在街口。有人拿外堂的名头收两遍钱，你肯陪我查一下吗？','对方说是上头的规矩，却拿不出第二张票据。贸然闯过去会连累行商。','核对催缴条与行商手里的票据','wit','拿重复收款的凭据质问收钱者','站到行商前面，逼拦路者让开','ending'),
 truce:story('gao','酒在这里。先别急着说和好了，心里还有什么就说出来。','沈砚愿意认错，苏晚要的是下次不再替她决定。光喝一杯还不够。','请双方各说一条以后要守的界限','charm','把界限说清，请两人当面应下','请他们先分开几日，留个重新说话的机会','confidence'),
 ending:story('su','这一阵风波过去了。临溪的人，还会提起你当时怎么选的。','你留下的凭据和人情，要交给可信的人继续查，还是自己收好？','问清还有谁在追查外堂催缴的事','wit','把线索托给沈砚，约定下次接头','留下凭据，告别临溪的朋友',null)
};
export const hasContinuation=sim=>!!CONTINUATIONS[sim.event?.type]&&sim.s.storyFlowVersion!==1;
const action=(id,label,stat=null,difficulty=0,cost=0)=>({id,label,stat,difficulty,cost,kind:'listen',tags:['social']});
export function continuationActions(sim){const e=sim.event,c=CONTINUATIONS[e.type];if(!e.conversation)return [action('c_ask',c.approach,c.stat,40),action('c_notice','留意对方的迟疑，追问没有说完的部分','wit',48),action('c_space','请围观者退开，让当事人慢慢说')];
 return [action('c_agree',c.accept,e.type==='favor'?'charm':c.stat,e.conversation.leverage?38:54),action('c_alternative',c.decline,e.type==='favor'?'might':null,e.type==='favor'?54:0,e.type==='dispute'?8:0),action('c_leave','暂不承诺，拱手告辞')];}
export function continuationView(sim){const e=sim.event,c=CONTINUATIONS[e.type],text=e.conversation?c.obstacle:c.opening;return {title:SCENES[e.type].name,text:e.conversation?'对方的顾虑已经说清，现在决定怎样处理。':'先听当事人说清来意。',line:text,dialogue:[{id:c.speaker,text}]};}
export function resolveContinuation(sim,id,actionId){const e=sim.event,a=continuationActions(sim).find(a=>a.id===actionId);if(!e||e.id!==id||!a)return {error:'这个阶段已经过去了。'};
 const c=CONTINUATIONS[e.type],p=sim.s.player,check=sim.preview(a);if(check.blocked)return {error:'盘缠不足。'};
 const roll=a.stat?1+Math.floor(sim.rng()*100):null,success=roll===null||roll<=check.chance,first=!e.conversation;
 p.money-=a.cost;const changes=a.cost?['盘缠 −'+a.cost]:[];if(a.stat)changes.push(...earnGrowth(p,a.stat,success?12:6,`continuation:${e.id}:${a.id}`));
 const text=first?(success?'对方愿意说出真正的顾虑。':'这番追问没能让对方信服，但他提出了继续谈的条件。'):a.id==='c_leave'?'你没有作出承诺，将事情留待以后。':success?'你们当面说定了接下来的安排。':'对方没有接受这个安排，暂且各退一步。';
 const r={day:sim.s.day,eventId:e.id,type:e.type,actionId:a.id,label:a.label,kind:a.kind,motion:'talk',roll,check,grade:checkGrade(roll,check.chance),success,text,changes,authored:true,ongoing:first,dialogue:[{id:c.speaker,text:first?c.obstacle:a.id==='c_leave'?'也好，这件事我会再想想。':success?(e.type==='favor'?(a.id==='c_alternative'?'他们见你守在货车前，终于让开了路。行商把手里的收款凭据交给你，往后追查还得靠它。':'有这些凭据，他们不敢再收第二遍。行商可以过了，下一步该查是谁下的令。'):'好，就照刚才说的办。这次我会把约定记清楚。'):'这件事我还不能答应。先缓一缓，等有了更稳妥的办法再谈。'}],hint:first?'听完对方的条件，再决定下一步。':'这次选择已经记下。'};
 if(first)e.conversation={leverage:success,approach:a.id};else{
  if(success&&a.id!=='c_leave'){sim.relation(c.speaker,6);changes.push('当事人好感 +6');changes.push(...earnGrowth(p,c.stat,18,`continuation:${e.id}:finish`));if(e.type==='favor'){p.money+=25;sim.s.facts.extortionLead=true;if(!p.inventory.includes('外堂重复收款凭据'))p.inventory.push('外堂重复收款凭据');changes.push('盘缠 +25','获得：外堂重复收款凭据');}if(e.type==='ending')sim.s.facts.outerHallContact=a.id==='c_agree';}
  e.status='resolved';const next=a.id==='c_leave'||!success?'ending':c.next;sim.s.pending=e.type==='ending'?null:{id:++sim.s.sequence,type:next,depth:e.depth+1,due:sim.s.day+1,allowed:[next]};
 }
 sim.s.history.push(r);sim.s.people[c.speaker].memories.push(a.label+'：'+text);sim.emit('result',r);sim.save();return r;
}
