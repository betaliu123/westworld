import {deckState,eventCandidates,stageOf,commitDeal} from './event-deck.js';
import {PEOPLE} from './data.js';
import {VISIT_LINES} from './action-card-lines.js';

const visitKey=e=>e.who+':'+e.subject;
export const visitMemory=(s,e)=>s.deck?.actions?.visits?.[visitKey(e)];
export function rememberVisit(s,e,line){
 const a=s.deck.actions;a.visits??={};const m=a.visits[visitKey(e)]??={count:0,lines:[]};
 if(m.cardId===e.cardId)return;
 m.count++;m.cardId=e.cardId;m.day=s.day;m.stage=stageOf(s);m.outside=!s.facts.enteredCity&&s.player.z<21;
 m.lines=[...m.lines,line].slice(-6);
}
const blade={id:'visit_blades',card:'craft',title:'兵刃与性命',lead:'兵刃必须实际命中才会伤人；兵甲、身手影响伤害。伤亡与目击会留下后果。',
 lines:{old_constable:'刀不是吓人的摆设。真落在人身上，伤了性命，见着的人可不会忘。',gate_relief:'刀伤有深浅，护身的甲也有好坏。出了人命，总有人要追问。',chi:'动刀得看对方身手和兵甲。真伤了人，结下的仇可不是收刀就没了。'},
 thought:'（刀出了鞘，仇也会留下。）'};
const poison={id:'visit_poison',card:'craft',title:'吃喝里的药性',lead:'药粉可混入附近真实吃喝；接收不等于食用。吃下才结算药性，可能被察觉，也不保证致命。',
 lines:{tea:'药混进吃喝，得吃下去才发作。药性有别，伤身未必致命，也未必瞒得过人。',tea_host:'递来的吃喝，旁人未必肯吃。真有人动了手脚，吃下去才知道难受。',scribe:'药有药性，不能见粉末就当能要命。混进吃喝，也未必不露痕迹。'},
 thought:'（入口的东西，分量要紧。）'};
// Share the normal dealer's fact gates. Additional topics describe implemented world actions only.
export function guidanceCandidates(s,id){
 const d=deckState(s),routes=eventCandidates(s,'route',id).filter(e=>!e.place?.person||s.people[e.place.person]?.hp>0);
 const actions=[blade,poison].filter(e=>e.lines[id]&&!d.used[e.id]).map(e=>({...e,stage:stageOf(s)}));
 return [...routes,...actions].map(e=>({...e,line:e.lines[id]}));
}
export function openingChoices(s,e){
 const m=visitMemory(s,e),again=!!m?.count;
 const gate=e.template==='guide'&&again&&m.outside&&m.day<s.day&&!s.facts.enteredCity&&s.player.z<21&&stageOf(s)==='gate';
 const key=e.template==='guide'?(again?'guide_again':'guide_first'):e.template+'_'+(again?'again':'first');
 const food=s.ecosystem?.items.find(i=>i.id===e.item)?.name||'干粮';
 const keys=[key,...(gate?['guide_gate']:[])];
 const rows=keys.flatMap(key=>(VISIT_LINES[key]||[]).map((line,i)=>({id:key+':'+i,line:line.replaceAll('{food}',food)})));
 const fresh=rows.filter(v=>!m?.lines.includes(v.line));return fresh.length?fresh:rows;
}
export function visitContext(s,e){
 const m=visitMemory(s,e),p=PEOPLE.find(p=>p.id===e.who);
 return {mode:'action_card',template:e.template,speaker:{id:e.who,name:p?.name,title:p?.title},
  encounter:{seenBefore:!!m?.count,previousDay:m?.day,previousStage:m?.stage,stage:stageOf(s),hungry:s.player.satiety<=20,wounded:s.player.hp<40},
  openings:openingChoices(s,e),candidates:e.template==='guide'?guidanceCandidates(s,e.who).map(t=>({id:t.id,fact:t.lead,line:t.line})):[]};
}
export function pickVisit(s,e,result){
 const topics=e.template==='guide'?guidanceCandidates(s,e.who):[],topic=topics.find(v=>v.id===result?.topic)||topics[0];
 const openings=openingChoices(s,e).filter(v=>!v.id.startsWith('guide_gate:')||topic?.card==='route');
 const opening=openings.find(v=>v.id===result?.opening);
 // Never use generated free text or an ID outside the current local facts.
 const chosen=opening||openings[(s.day+e.cardId)%Math.max(1,openings.length)];
 return {opening:e.template==='guide'&&chosen?{...chosen,line:topic?chosen.line.replaceAll('{topic}',topic.line):''}:chosen,topic,ai:!!opening&&(e.template!=='guide'||topic?.id===result?.topic)};
}
export function commitGuidance(sim,e){
 const topic=guidanceCandidates(sim.s,e.who).find(t=>t.id===e.topic);if(!topic)return null;
 const card=commitDeal(sim,{card:topic.card,urgent:true,candidates:[topic]},e.who,{event:topic,line:e.opening||topic.line,ai:!!e.dialogueAI,actionCardId:e.cardId});
 return card;
}
