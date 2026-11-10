import {ensureParty} from './party-state.js';
import {actionBeat,BONUS,PERSONALITIES,followupOptions} from './action-contracts.js';
import {ROLES,PEOPLE,SCENES,actionsFor,LETTERS} from './data.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function newGame(role='wanderer'){
 const r=ROLES[role]||ROLES.wanderer;
 return {version:1,role,day:1,time:0,player:{x:0,z:14,hp:100,energy:100,money:80,stats:{...r.stats},xp:0,inventory:[]},people:Object.fromEntries(PEOPLE.map(n=>[n.id,{relation:n.relation,mood:'calm',fear:0,hp:100,memories:[]}])),reputation:0,wanted:0,style:{[r.style]:3},event:{id:1,type:'proposal',depth:0,status:'active'},pending:null,history:[],mail:[],facts:{},sequence:1,broken:[],attacks:0};
}
export class Simulation{
 constructor(state=newGame(),rng=Math.random){this.s=state;ensureParty(state);this.rng=rng;this.listeners=[];for(const p of PEOPLE)state.people[p.id]??={relation:p.relation,mood:'calm',fear:0,hp:100,memories:[]};if(state.facts.missing&&state.event?.status==='active'&&state.event.type==='banquet'){state.event.type='inquiry';state.event.elapsed=0;state.facts.couple=false;}}
 emit(type,data){for(const fn of this.listeners)fn(type,data);}
 save(){this.emit('save',this.s);}
 banquetOccurred(){return !!this.s.facts.couple||this.s.facts.banquetDay!=null||this.s.history.some(h=>h.type==='banquet');}
 normalizeFollowup(){
  const p=this.s.pending;if(!p||!this.banquetOccurred())return;
  const next=type=>type==='banquet'?'favor':type;
  p.type=next(p.type);p.allowed=[...new Set((p.allowed||[p.type]).map(next))];
 }
 get event(){return this.s.event?.status==='active'?this.s.event:null;}
 actions(){return this.event?actionsFor(this.event.type,this.s.player.inventory.includes('ring')):[];}
 preview(a){const p=this.s.player,score=p.stats[a.stat]||0,relation=Math.round((this.s.people.su.relation+this.s.people.shen.relation)/10),chance=a.stat?clamp(score+40-a.difficulty+relation,5,95):100;return {chance,score,relation,blocked:p.money<a.cost,certain:!a.stat};}
 recommend(){return this.actions().map(a=>({...a,weight:(a.tags||[]).reduce((n,t)=>n+(this.s.style[t]||0)*5,0)+(a.stat?(this.s.player.stats[a.stat]-a.difficulty)*.25:0)})).sort((a,b)=>b.weight-a.weight).filter((a,i,all)=>i===all.findIndex(b=>b.kind===a.kind)).slice(0,5);}
 relation(id,delta){const p=this.s.people[id];p.relation=clamp(p.relation+delta,-100,100);}
 resolve(id,actionId,evidence=null){
 const e=this.event,a=this.actions().find(a=>a.id===actionId);if(!e||id!==e.id||!a)return {error:'这一刻已经过去。'};
 const before=Object.fromEntries(Object.entries(this.s.people).map(([id,n])=>[id,{relation:n.relation,memories:n.memories.slice(-4)}]));
 const check=evidence?{chance:100,certain:true,blocked:false}:this.preview(a);if(check.blocked)return {error:'盘缠不足。'};
 const s=this.s,p=s.player,roll=a.stat&&!evidence?1+Math.floor(this.rng()*100):null,success=roll===null||roll<=check.chance,changes=[];
 p.money-=a.cost;if(a.cost)changes.push(`盘缠 −${a.cost}`);
 const rel=(id,v)=>{this.relation(id,v);changes.push(`${PEOPLE.find(n=>n.id===id).name} ${v>0?'+':''}${v}`);};
 const rep=v=>{s.reputation=clamp(s.reputation+v,-100,100);changes.push(`青竹会 ${v>0?'+':''}${v}`);};
 let next='banquet',text='',hint='有人临走前又看了你一眼，像是记下了什么。';
 if(a.id==='bet'&&!evidence){
  rel('shen',success?-10:-4);rel('su',success?-8:-4);rel('gao',-2);rep(-3);
  s.facts.wager=success?'settled':'refused';s.people.shen.mood='wary';s.people.su.mood='wary';
  text=success?'你吆喝着押苏晚是否答应，几名看客果然摸出了铜钱。苏晚当面叫停，高小楼劝散了下注的人；赌局未结，钱也没有过手。':'你刚喊出“押她答不答应”，高小楼便摇头拒绝，四周无人接赌。苏晚沉下脸，沈砚要求你为这番话道歉。';
  hint=success?'被劝走的看客还在议论，苏晚已不愿再站在人群中央。':'沈砚把戒盒合上了，像是等着你换个态度再开口。';next='dispute';
 }else if(a.kind==='steal'){
  if(success){p.inventory.push('ring');s.facts.missing=true;text='银戒落入袖中。沈砚还在等她的回答，没有人看见你的手。';changes.push('获得：银戒');next='inquiry';hint='袖口沉了一点。身后的起哄声还没停。';}
  else{rel('shen',-12);rel('su',-5);rep(-3);s.wanted+=1;s.people.shen.mood='angry';text='沈砚一把扣住你的手腕：“阁下，这是做什么？”人群安静下来。';next='dispute';changes.push('嫌疑 +1');}
 }else if(a.kind==='return'){
  p.inventory=p.inventory.filter(x=>x!=='ring');s.facts.missing=false;rel('shen',success?10:3);rel('su',5);text=success?'你把银戒放回掌心，终于把来龙去脉说清。':'银戒回到失主手中，但沈砚仍不完全相信你的解释。';changes.push('归还：银戒');next=success?'truce':'dispute';
 }else if(a.kind==='rival'){
  rel('shen',-8);rel('su',success?9:-4);text=success?'苏晚抬眼看你：“别在这里替我决定。但你的话，我听见了。”':'苏晚后退半步：“我的心意，不是争来的。”';next=success?'confidence':'dispute';
 }else if(a.kind==='listen'){
  rel('su',success?9:2);text=success?'苏晚说，她想走遍江南，唱自己写的曲子。你没有打断她。':'苏晚抿了抿唇。人太多，有些话她仍说不出口。';next='confidence';hint='她欲言又止，目光在你身上多停了一会儿。';
 }else if(a.kind==='disrupt'){
  rel('shen',success?-15:-8);rel('su',-7);rep(-5);s.wanted+=1;s.people.shen.mood='angry';text=success?(evidence==='出手攻击当事人'?'你出手伤人，人群惊散。捕头朝这边赶来，沈砚也不再客气。':'酒盏落地，人群惊散。沈砚握住刀柄，捕头已朝这边望来。'):'沈砚拦住了你。街坊开始指指点点，有人去找捕头。';next='dispute';changes.push('嫌疑 +1');
 }else if(a.kind==='eat'){
  const delta=Math.min(100,p.energy+18)-p.energy;p.energy+=delta;p.stats.might=clamp(p.stats.might+1,0,90);changes.push(`体力 +${Math.round(delta)}`,'膂力 +1');rel('gao',2);text='热汤入腹，高小楼笑着又给你添了一碗。';next='favor';
 }else if(a.kind==='favor'){
  rel('shen',success?10:1);if(success){p.money+=25;rep(5);changes.push('盘缠 +25');}text=success?'你替行商清出了路，沈砚交来谢礼与青竹会信物。':'你没能让行商放心，沈砚叮嘱你改日再试。';next=success?'ending':'truce';
 }else if(a.kind==='leave'){
  text='你拱手离开，让他们自己作决定。';next=e.type==='proposal'?'confidence':'ending';
 }else{
  rel('shen',success?7:-2);rel('su',success?3:0);if(success)rep(2);text=success?'人群里响起笑声。沈砚朝你郑重抱拳，苏晚也轻轻点了点头。':'这句话没有说到点上。沈砚勉强笑了笑，气氛仍有些僵。';next=success?(e.type==='banquet'?'favor':'banquet'):'truce';
 }
 const beat=evidence?{motion:'force',text,dialogue:[{id:'shen',text:'住手！你竟然真的动起手来！'}]}:actionBeat(a,success);
 text=beat.text;
 if(!evidence&&success&&BONUS[a.id]){p.money+=BONUS[a.id];changes.push(`盘缠 +${BONUS[a.id]}${a.id==='bet'?' · 庄钱':' · 赏钱'}`);}
 if(!evidence&&a.id==='snatch'&&success){if(!p.inventory.includes('ring'))p.inventory.push('ring');s.facts.missing=true;changes.push('获得：银戒');next='inquiry';}
 if(a.id==='bet')hint=success?'钱袋重了，当事人的脸色却冷了。高小楼像是有话要劝你。':'没有人愿意接赌，沈砚等着你为这番话作个解释。';
 else hint=success?'这番举动已被在场的人记住。':'事情没有照你的打算发展，但这次尝试也留下了经历。';
 if(s.facts.missing&&next==='banquet')next='inquiry';
 else if(next==='banquet'&&this.banquetOccurred())next='favor';

 p.xp+=success?12:5;changes.push(`阅历 +${success?12:5}`);
 for(const t of a.tags||[])s.style[t]=(s.style[t]||0)+1;
 const result={day:s.day,eventId:e.id,type:e.type,label:evidence||a.label,actionId:a.id,dialogue:beat.dialogue,motion:beat.motion,reactionSource:'local',kind:a.kind,check,roll,success,text,hint,changes};s.history.push(result);
 for(const id of ['shen','su','gao']){const n=s.people[id];n.memories.push(a.kind==='steal'&&success?'那日银戒失踪，无人知道谁拿走了。':text);n.memories=n.memories.slice(-12);}
 e.status='resolved';if(e.type!=='ending')s.pending={id:++s.sequence,type:e.depth>=4?'ending':next,depth:e.depth+1,due:s.day+1,cause:e.id,causeAction:a.id,allowed:evidence?[e.depth>=4?'ending':next]:followupOptions(a,success,e.depth>=4?'ending':next,!!s.facts.missing,e.depth)};
 if(e.type==='ring_quarrel'&&!evidence&&a.kind!=='return'){next=success?'confidence':'ending';text=a.kind==='leave'?'你拱手退开，让两人各自冷静。':success?'你听清了两人的心结：苏晚在意承诺，沈砚委屈于被误解。争执声渐渐低了下来。':'丢失戒指的委屈还没有说开，两人暂时不愿继续谈。';result.text=text;result.dialogue=[{id:'su',text:success?'我气的不是戒指值多少钱，是你有没有把心意放在心上。':'让我先静一静，这会儿说不清。'}];s.pending={id:++s.sequence,type:next,depth:e.depth+1,due:s.day+1,allowed:[next]};}
 if(e.type==='inquiry'&&s.facts.missing){e.status='active';s.event=e;s.pending=null;}
 else if(s.facts.missing&&next==='inquiry'){s.event={id:++s.sequence,type:'inquiry',depth:e.depth+1,status:'active',elapsed:0,round:0};s.pending=null;this.emit('scene',s.event);}
 if(!s.facts.missing&&s.searchClosed)s.searchClosed=false;
 this.normalizeFollowup();result.nextId=s.pending?.id;this.prepareReaction(result,['shen','su','gao'],before);
 this.emit('result',result);this.save();return result;
 }
 prepareReaction(result,ids,before={}){
 this.s.reactionSequence=(this.s.reactionSequence||0)+1;result.reactionId=`${this.s.day}:${this.s.reactionSequence}`;
 const hidden=result.kind==='steal'&&result.success;
 const actors=hidden?['shen']:ids;
 result.reactionContext={mode:'reaction',action:{id:result.actionId||result.kind,label:result.label,motion:result.motion},scene:result.type,settled:{success:result.success,text:result.text,changes:result.changes},knowledge:hidden?'银戒失踪但无人知道是谁取走的。任何角色不得指认玩家或暗示知道玩家偷窃。':'在场人物亲历了当前行为。',characters:actors.map(id=>({id,name:PEOPLE.find(n=>n.id===id).name,personality:PERSONALITIES[id],relationshipBefore:before[id]?.relation??this.s.people[id].relation,relationshipNow:this.s.people[id].relation,mood:this.s.people[id].mood,memories:hidden?['刚刚发现戒指不见了。']:(before[id]?.memories||this.s.people[id].memories.slice(-4))})),recentEvents:hidden?[]:this.s.history.slice(-4,-1).map(h=>({action:h.label,result:h.text})),allowed:this.s.pending&&result.nextId===this.s.pending.id?[...this.s.pending.allowed]:(hidden&&this.event?.type==='inquiry'?['inquiry']:[]),default:this.s.pending?.type};
 }
 applyReaction(reactionId,data){
 const r=this.s.history.at(-1);if(!r||r.reactionId!==reactionId||r.reactionSource==='nlp'||!data||!Array.isArray(data.dialogue))return false;
 const context=r.reactionContext,ids=context.characters.map(n=>n.id);
 if(data.dialogue.length<1||data.dialogue.length>3)return false;
 const dialogue=[];
 for(const line of data.dialogue){
 if(!ids.includes(line.id)||typeof line.text!=='string'||line.text.length<2||line.text.length>100||/[<>\d]/.test(line.text)||dialogue.some(d=>d.id===line.id))return false;
 if(r.kind==='steal'&&r.success&&/你.*(偷|拿|取|藏)|袖|掌心/.test(line.text))return false;
 dialogue.push({id:line.id,text:line.text});
 }
 if(context.allowed.length&&!context.allowed.includes(data.template))return false;
 if(data.template==='banquet'&&this.banquetOccurred())return false;
 r.dialogue=dialogue;r.reactionSource='nlp';
 for(const line of dialogue){const n=this.s.people[line.id];n.memories.push(`我在「${r.label}」之后说：${line.text}`);n.memories=n.memories.slice(-12);}
 // A late response can enrich memory, but cannot replace an event already delivered.
 if(this.s.pending?.id===r.nextId&&context.allowed.includes(data.template)){this.s.pending.type=data.template;this.s.pending.directorReason=String(data.reason||'').slice(0,180);r.directedNext=data.template;}
 this.save();return true;
 }
 direct(id,type,reason){const p=this.s.pending;if(!p||p.id!==id||!p.allowed?.includes(type)||(type==='banquet'&&this.banquetOccurred()))return false;p.type=type;p.directorReason=String(reason||'').slice(0,180);this.save();return true;}
 advanceDay(){
 const s=this.s;s.day++;s.time=0;s.player.energy=100;if(s.player.hp>0)s.player.hp=Math.min(100,s.player.hp+30);s.wanted=Math.max(0,s.wanted-1);
 for(const n of Object.values(s.people)){n.fear=0;n.hp=Math.max(n.hp,60);n.mood=n.relation< -10?'wary':'calm';}
 s.broken=[];
 if(s.pending&&s.pending.due<=s.day){
  this.normalizeFollowup();s.event={...s.pending,status:'active'};s.pending=null;if(s.event.type==='banquet'){s.facts.couple=true;s.facts.banquetDay=s.day;}
  const ids=['gao','shen','su'],sender=ids.sort((a,b)=>s.people[b].relation-s.people[a].relation)[0];
  const scene=SCENES[s.event.type],mail={id:s.event.id,sender,day:s.day,text:s.event.causeAction==='bet'?'桥头拿求亲开赌的事还没过去。沈砚和苏晚想当面把话说清，你有空来一趟吗？':sender==='su'&&s.event.type==='confidence'?'有些话，当着人群不方便说。我在河畔柳树下，你有空来陪我聊聊吗？':LETTERS[s.event.type],place:scene.place,point:scene.point,read:false};s.mail.push(mail);this.emit('mail',mail);this.emit('scene',s.event);
 }
 this.emit('day',s.day);this.save();
 }

 tickStory(dt){
 const s=this.s,e=this.event;if(!e)return;e.elapsed=(e.elapsed||0)+dt;
 if(e.type==='inquiry'&&s.facts.missing){
  if(e.elapsed>=75){this.endSearch(e.id);return;}
  const round=Math.floor(e.elapsed/25);
  if(round>(e.round||0)){e.round=round;this.emit('speech',[{id:'shen',text:round===1?'桥边也没有……少侠，你有没有见过那枚银戒？':'我再沿着摊子找一遍，总不能就这么算了。'}]);
   this.emit('searchDecision',{mode:'search',eventId:e.id,round,allowed:['search','disperse'],characters:['shen','su'].map(id=>({id,personality:PERSONALITIES[id],relation:s.people[id].relation,memories:s.people[id].memories.slice(-4)})),facts:'银戒仍未找到，不能知道是谁拿走；最多寻找两轮。'});this.save();}
 }else if(e.elapsed>= (e.type==='ring_quarrel'?65:150)){
  e.status='resolved';s.people.su.memories.push(e.type==='ring_quarrel'?'我和沈砚因丢失银戒争执，最后各自离开。':'人群渐散，这件事暂时搁下了。');this.emit('speech',[{id:'su',text:e.type==='ring_quarrel'?'今天先别说了，我们都冷静一下。':'不必一直等着了，各自去忙吧。'}]);this.emit('scene',null);this.save();
 }
 }
 endSearch(id){
 const s=this.s,e=this.event;if(!e||e.id!==id||e.type!=='inquiry'||!s.facts.missing)return false;
 e.status='resolved';s.searchClosed=true;s.facts.couple=false;
 s.pending={id:++s.sequence,type:'ring_quarrel',depth:e.depth+1,due:s.day+1,cause:e.id,allowed:['ring_quarrel']};
 for(const id of ['shen','su','gao'])s.people[id].memories.push('大家找了许久仍没找到银戒，求亲中断，各自散去。');
 this.emit('speech',[{id:'shen',text:'还是没有……诸位先散了吧。'},{id:'su',text:'连这样重要的东西都能弄丢……我想一个人静静。'}]);this.emit('scene',null);this.save();return true;
 }
 applySearchDecision(id,round,data){const e=this.event;if(!e||e.id!==id||e.round!==round||e.type!=='inquiry'||!['search','disperse'].includes(data?.decision))return false;if(data.decision==='disperse')return this.endSearch(id);e.directorReason=String(data.reason||'').slice(0,120);this.save();return true;}
 reply(id,input){
 const s=this.s,n=s.people[id],text=String(input||'').trim().slice(0,180);if(!n||!text||s.player.hp<=0||n.hp<=0)return {error:'此刻无法交谈。'};
 const missing=!!s.facts.missing,hasRing=s.player.inventory.includes('ring');let intent='chat',line='',outcome='',changes=[],roll=null,check={chance:100,certain:true},success=true;
 if(/(归还|还给|还你|交还|交给|给你).*(戒指|银戒)|(?:戒指|银戒).*(归还|还给|还你|交还|交给|给你)/.test(text))intent='return';
 else if(/没(有)?(看|见|拿)|不知道|不清楚/.test(text)&&missing)intent='deny';
 else if(/我.*(拿了|偷了|拿走|偷走)|在我(这里|这儿|身上)/.test(text)&&missing)intent='confess';
 else if(/(一起|帮|再|继续).*(找|寻找)/.test(text)&&missing)intent='search';
 else if(/别吵|冷静|消消气|好好说|别怪|不是故意/.test(text))intent='calm';
 if(intent==='return'&&/不|别|如果|假如|要是|[？?]|能否|是否/.test(text))intent='chat';
 if(intent==='return'){
  if(id!=='shen'){line='这枚戒指是沈砚的，请你亲手交给他吧。';outcome='对方请你把戒指直接交给沈砚。银戒仍在原处。';success=false;}
  else if(!hasRing){line='少侠，你手里并没有那枚戒指啊。';outcome='你提出归还，但行囊里没有银戒，没有物品发生转移。';success=false;}
  else{s.player.inventory=s.player.inventory.filter(x=>x!=='ring');s.facts.missing=false;s.searchClosed=false;s.people.shen.memories.push('你亲手交回了丢失的银戒。');this.relation('shen',6);changes=['归还：银戒','沈砚 +6'];line='戒指终于回来了……你肯还回来，我记着。我们也需要把话说清。';outcome='你拿出银戒，交回沈砚手里。寻找停止，婚约仍由两人自己决定。';if(this.event&&['inquiry','ring_quarrel'].includes(this.event.type))this.event.status='resolved';s.pending={id:++s.sequence,type:'truce',depth:(s.event?.depth||0)+1,due:s.day+1,allowed:['truce','confidence']};this.emit('scene',null);}
 }else if(intent==='deny'){
  if(hasRing){check=this.preview({stat:'charm',difficulty:60,cost:0});roll=1+Math.floor(this.rng()*100);success=roll<=check.chance;this.relation(id,success?0:-3);if(!success)changes.push(PEOPLE.find(p=>p.id===id).name+' -3');}
  line=success?'那我再问问旁人。若想起什么，劳烦告诉我。':'你说得有些迟疑……我还不能信，但也不会凭这点就认定是你。';outcome=success?'对方暂且接受你的说法，继续寻找。':'你的解释没能打消疑虑，对方多了一分戒心。';
 }else if(intent==='confess'){line='原来是这样。请把戒指还来，这件事我们再说。';outcome='你承认拿走了戒指。对方听见了你的说法，正等你归还。';s.facts.confessed=true;}
 else if(intent==='search'){check=this.preview({stat:'wit',difficulty:45,cost:0});roll=1+Math.floor(this.rng()*100);success=roll<=check.chance;line=success?'那边已经找过了，多谢帮忙，我去另一侧看看。':'摊子底下也没有……还得再找。';outcome=success?'你检查了桥边的痕迹，排除一处位置。银戒仍未寻回。':'你查看了脚下和摊边，没有找到有效线索。';}
 else if(intent==='calm'){check=this.preview({stat:'charm',difficulty:48,cost:0});roll=1+Math.floor(this.rng()*100);success=roll<=check.chance;line=success?'你说得对，先别把话说重了。':'我现在实在静不下来，先让我缓缓。';outcome=success?'你的劝说让对方放缓了语气。':'这番劝说暂时没有奏效。';if(success){if(!s.replyRewards?.[`${s.day}:${id}:${intent}`]){this.relation(id,2);changes.push(PEOPLE.find(p=>p.id===id).name+' +2');}if(this.event?.type==='ring_quarrel'){this.event.status='resolved';s.pending={id:++s.sequence,type:'confidence',depth:this.s.event.depth+1,due:s.day+1,allowed:['confidence','truce']};this.emit('scene',null);}}}
 else{line=n.relation<0?'你的话我听见了，但我还需要想想。':'我听着呢，少侠。你慢慢说。';outcome='你向'+PEOPLE.find(p=>p.id===id).name+'说：“'+text+'”';}
 const repeatKey=`${s.day}:${id}:${intent}`;s.replyRewards??={};s.replyRewards[repeatKey]=true;
 const r={day:s.day,type:'conversation',actionId:'reply-'+intent,label:text,kind:intent==='return'?'return':'listen',motion:intent==='return'?'reach':intent==='search'?'observe':'talk',roll,check,success,text:outcome,changes,hint:'对方会记得这番话。',dialogue:[{id,text:line}],reactionSource:'local',nextId:['return','calm'].includes(intent)?s.pending?.id:undefined};
 s.history.push(r);this.prepareReaction(r,[id]);r.reactionContext.knowledge='玩家的发言只是其主张，不代表客观真相。只有 settled 是已验证事实。NPC不知道未被承认的偷窃者；不得泄露隐瞒的物品。';r.reactionContext.recentEvents=[];
 n.memories.push('你说：“'+text+'”；'+outcome);n.memories=n.memories.slice(-12);this.emit('result',r);this.save();return r;
 }

 isPursuing(id,distance){
 const s=this.s,n=s.people[id];
 return s.player.hp>0&&!!n&&n.hp>0&&((id==='guard'&&s.wanted>0&&distance<14)||(n.mood==='angry'&&distance<7));
 }
 respawn(){
 if(this.s.player.hp>0)return false;
 // End the current fight, while retaining social memory and story consequences.
 this.s.wanted=0;this.advanceDay();this.s.player.hp=60;this.s.player.x=0;this.s.player.z=14;
 this.save();return true;
 }
 tick(dt){const s=this.s;this.tickStory(dt);s.time+=dt;if(s.time>=240)this.advanceDay();for(const n of Object.values(s.people))n.fear=Math.max(0,n.fear-dt);}
 attack(id,witnesses=[]){
 const s=this.s,n=s.people[id];if(!n||n.hp<=0)return;
 n.hp=Math.max(0,n.hp-22);n.fear=18;n.mood=n.hp<=0?'down':'angry';this.relation(id,-6);s.wanted=clamp(s.wanted+1,0,9);s.attacks++;
 for(const w of witnesses){if(w!==id&&s.people[w]){s.people[w].fear=12;s.people[w].mood=w==='guard'?'angry':'afraid';}}
 n.memories.push('你曾在街上对我动手。');this.emit('violence',{id,down:n.hp<=0});
 if(['shen','su'].includes(id)&&this.event&&this.event.type!=='ending'){
  const e=this.event,a=this.actions().find(a=>a.kind==='disrupt');if(a)this.resolve(e.id,a.id,'出手攻击当事人');
 }
 this.save();
 }
 breakProp(id){if(this.s.broken.includes(id))return false;this.s.broken.push(id);this.emit('break',id);
 if(this.s.broken.filter(x=>x.startsWith('feast')).length>=3&&['banquet','truce'].includes(this.event?.type))this.resolve(this.event.id,'disrupt','砸毁三张宴席桌子');this.save();return true;}
 npcCheck(id,kind){
 const n=this.s.people[id];if(!n||n.hp<=0)return {error:'对方暂时无法应答。'};
 const stamp=this.s.day+':'+kind;n.socialToday??={};if(n.socialToday[stamp])return {error:'今日已经试过，不必一再纠缠。'};
 const stat=kind==='befriend'?'charm':'might',score=this.s.player.stats[stat],chance=clamp(score+40-55+Math.round(n.relation/10),5,95),roll=1+Math.floor(this.rng()*100),success=roll<=chance,delta=kind==='befriend'?(success?8:-2):-6;
 this.relation(id,delta);n.socialToday[stamp]=true;
 if(kind==='intimidate'){n.fear=success?12:0;n.mood=success?'afraid':'angry';this.s.wanted=Math.min(9,this.s.wanted+1);}
 const text=kind==='befriend'?(success?'一番攀谈后，对方愿意把你当作朋友。':'话不投机，对方礼貌地岔开了话题。'):(success?'对方退后几步，惊惧地看着你。旁人记住了你的蛮横。':'对方不为所动，反而握紧了拳头。');
 n.memories.push(text);const r={day:this.s.day,type:'npc',dialogue:[{id,text:kind==='befriend'?(success?'与你聊得投缘，往后常来坐坐。':'这事咱们改日再说吧。'):(success?'你……别过来！':'少拿这套吓唬人！')}],label:kind==='befriend'?'攀谈结交':'出言威吓',kind,check:{chance,score},roll,success,text,hint:'这一面，已经留在对方的记忆里。',changes:[PEOPLE.find(p=>p.id===id).name+' '+(delta>0?'+':'')+delta]};this.s.history.push(r);r.motion=kind==='befriend'?'talk':'guard';this.prepareReaction(r,[id]);this.emit('result',r);this.save();return r;
 }
 npcAction(id,kind){
 const n=this.s.people[id],p=this.s.player;if(!n)return {text:'那人已经离开。'};
 if(n.hp<=0){return {text:'他暂时无法应答。让他休息一会儿。'};}
 const key=this.s.day+':'+kind;n.socialToday??={};
 if(kind!=='rumor'&&n.socialToday[key])return {text:'对方笑道：心意领了，不必一再客气。'};
 let text;
 if(kind==='gift'){if(p.money<8)return {text:'盘缠不足八文。'};p.money-=8;this.relation(id,5);text='对方接过茶钱，向你拱了拱手。';}
 else if(kind==='apology'){this.relation(id,4);n.fear=0;n.mood='calm';text='对方放下戒备：“往后，莫再如此。”';}
 else if(kind==='rumor'){text=this.s.mail.at(-1)?.text||'高小楼说，桥头有人求亲。姑娘似乎还没有答应。';}
 else {this.relation(id,1);text=n.relation< -5?'对方侧过身，只冷冷应了一声。':`“江湖路远，${this.s.role==='scholar'?'先生':'少侠'}珍重。”`;}
 n.socialToday[key]=true;
 const reply=({gift:'这碗茶承你的情，多谢了。',apology:'肯把话说开便好，往后莫再如此。'})[kind]||text;
 const r={day:this.s.day,type:'npc',actionId:kind,kind,label:({gift:'请喝一碗茶',apology:'赔礼道歉',rumor:'打听近况',greet:'拱手招呼'})[kind],success:true,text,changes:[],dialogue:[{id,text:reply}],motion:kind==='gift'?'drink':'bow',reactionSource:'local'};
 this.s.history.push(r);this.prepareReaction(r,[id]);n.memories.push(text);n.memories=n.memories.slice(-12);
 this.emit('npc',{id,kind,text,reaction:r});this.save();return {text};
 }
 context(){return {profile:this.s.player.stats,style:this.s.style,history:this.s.history.slice(-5).map(h=>({action:h.label,result:h.text})),scene:this.event?.type,actions:this.actions().map(a=>({id:a.id,label:a.label,kind:a.kind,chance:this.preview(a).chance,blocked:this.preview(a).blocked}))};}
}
