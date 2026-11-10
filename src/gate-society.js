import {VOICE_LINES} from './voice-lines.js';
import {placePayment} from './cash-transfers.js';
import {askIdentity,answerIdentity} from './conversation-memory.js';
import {streetSalute} from './court-street.js';
import {outfit,knowsName} from './impersonation.js';
import {careerOptions,careerResolve,careerBlock} from './faction-career.js';
import {invitePrince} from './prince.js';
import {meet,learn,knowledge} from './factions.js';
import {earnGrowth} from './growth.js';
import {admitFriend} from './gate-scene.js';
import {visibleBetween} from './npc-awareness.js';

const option=(id,label,stat=null,difficulty=0)=>({id,label,stat,difficulty,mode:'contact',kind:'listen'});
export function learnedFootwork(sim,id='old_constable'){
 const n=sim.s.people[id];if(!n)return false;
 const learned=n.learnedFootwork||Object.keys(sim.s.player.growthClaims||{}).some(k=>k.startsWith('lesson:')&&k.endsWith(':'+id))||sim.s.history.some(r=>r.success&&r.actionId==='training'&&r.eventId?.endsWith(':'+id+':training'));
 if(learned)n.learnedFootwork=true;return !!learned;
}
export function contactOptions(sim,id){const n=sim.s.people[id],k=knowledge(sim);return [
 ...careerOptions(sim,id),
 ...(id==='bookseller'?[option('binding','你怎么知道一本书被抽过页？')]:[]),
 ...(id==='scribe'&&outfit(sim)?[option('identity_paper','按身上这身衣服的身份刻制名帖','wit',knowsName(sim,outfit(sim).ownerId)?40:80)]:[]),
 option('identity',id==='traveler'?'你为何不自己进城看看？':askIdentity(id)||'问问'+({bookseller:'修书',gate_guard:'守关',gate_relief:'轮值',relay:'驿务',scribe:'刻印',tea_host:'茶棚',prisoner:'旧账',inspector:'税案',gang_boss:'赤砂堂',old_constable:'从前当差',mei:'招亲',gate_merchant:'这趟行商'}[id]||'来意')+'的事'),
 ...(['gate_guard','gate_relief'].includes(id)?[option('watch','打听换班与关口的规矩')]:[]),
 ...(id==='relay'?[option('tax','打听这趟公文交给谁')]:[]),
 ...(id==='tea_host'?[option('tea_news','问问茶棚近日的客人')]:[]),
 ...(id==='traveler'?[option('prince_answer','说说自己被拦在关外的遭遇'),...(sim.s.facts.princeLetter&&!sim.s.facts.princeLetterRaised?[option('royal_letter','压低声音：「王爷，信上说的副账，在东街？」')]:[]),...((sim.s.people[id].probed||sim.s.facts.princeLetter)&&!sim.s.facts.princeAlias?[option('prince_identity','你的衣料和佩玉，都不像寻常旅客','charm',45)]:[]),...(sim.s.facts.princeLetter||sim.s.facts.taxLedgerLead||k.clues.tax||k.clues.ledger?[option('prince_evidence','提起东街税课的线索')]:[]),option('prince_leave',sim.s.facts.princeDeparture?.arrived?'茶凉了。':'你等的人还没来？')]:[]),
 ...(id==='old_constable'?[learnedFootwork(sim,id)?option('training_review','聊聊上次学的身法'):option('training','请教避开视线的身法','agility',45),...(k.clues.patron?[option('apex','请他辨认梁中书的来路')]:[])]:[]),
 ...(id==='gate_merchant'&&sim.event?.type==='gate'?[option('escort','商量做一趟帮工，随货入城','charm',48)]:[]),
 ...(id==='scribe'&&n.probed&&!n.inkAcknowledged?[option('ink_sign','压低声音：「赤砂堂印房，也接散客的活？」')]:[]),
 ...(id==='scribe'&&n.probed&&n.inkAcknowledged&&sim.s.ecosystem?.items.some(i=>i.type==='poison'&&i.hp>0&&i.location==='npc:scribe')?[{...option('ink_buy','买下柜里的迷毒散'),cost:5}]:[]),
 ...(id==='scribe'?[option('seal','请教如何辨别税课官印')]:[]),
 ...(id==='prisoner'?[option('ledger','问他被关押前经手的账目')]:[]),
 ...(n.sickUntil>(sim.s.ecosystem?.time||0)?[option('care','递水照看')]:[])
 ];}
export function contactFollowups(sim,id,result){
 if(!result?.success||result.actionId!=='ink_sign')return [];
 const buy=contactOptions(sim,id).find(a=>a.id==='ink_buy');return buy?[buy,{id:'ink_decline',label:'这包先留着，我不要。',mode:'endTalk',kind:'listen'}]:[];
}
export function contactPreview(sim,id,a){const n=sim.s.people[id],p=sim.s.player,tries=n.contactAttempts?.[sim.s.day+':'+a.id]||0;return {score:p.stats[a.stat]||0,chance:a.stat?Math.floor(Math.max(5,Math.min(95,p.stats[a.stat]+40-a.difficulty+(n.trust||0)/3-tries*20))):100,certain:!a.stat,blocked:(a.id==="ink_buy"&&p.money<5)||!!careerBlock(sim,id,a)||a.id==='training'&&p.energy<10||a.id==='escort'&&(!!n.awareness?.caseOpen||(!sim.s.facts.merchantContract&&(n.purse||0)<6))};}
export function contactResolve(sim,eco,id,action){if(action==='training'&&learnedFootwork(sim,id))action='training_review';const n=sim.s.people[id],a=contactOptions(sim,id).find(a=>a.id===action);if(!n||n.hp<=0||!a||n.stunnedUntil>(sim.s.npcClock||0)||['fight','flee'].includes(n.awareness?.state))return {error:'对方现在无法应答。'};
 const check=contactPreview(sim,id,a);if(check.blocked)return {error:(action==='ink_buy'?'得付五文钱。':null)||careerBlock(sim,id,a)||'眼下还做不到。'};meet(sim,id);n.contactAttempts??={};const stamp=sim.s.day+':'+action;n.contactAttempts[stamp]=(n.contactAttempts[stamp]||0)+1;
 const roll=a.stat?Math.floor(sim.rng()*100)+1:null,success=check.certain||roll<=check.chance;let text=id==='traveler'?'一块玉佩，未必说明得了什么。咱们还是说眼前的事吧。':'眼下还信不过你，改日再谈。',changes=[];
 if(success){const career=careerResolve(sim,eco,id,action);if(career?.error)return career;if(career){text=career.text;changes=career.changes;}switch(action){
 case 'binding':text=n.bindingShown?'还记得针脚么？迎光看旧针眼。':'瞧这两个针眼。旧孔在里，新线在外，多半拆过。先别急着说人作假，补书也得拆线。';n.bindingShown=true;break;
 case 'identity_paper':outfit(sim).identityPaper=true;text='名帖刻好了，官印我不能替你做。若被追问来历，还得你自己答。';break;
 case 'identity':if(id==='gate_merchant'){sim.s.facts.knownNames??={};sim.s.facts.knownNames[id]='赵成';}text=({old_constable:'我姓杜，捕衣早交回去了。这双眼睛和脚底的功夫，他们可收不走。',bookseller:'我姓温，名素笺。卖书是生意，把散了的旧书补得能再翻十年，是我的手艺。',inspector:'顾某奉旨查案，在此暂设六扇门值房。招募的是查案的人，不是仗势的人。',gang_boss:'梅某掌赤砂帮。要谈生意，坐；要入帮，先亮亮本事。',mei:'我叫梅知意。我爹掌赤砂帮，我的亲事却由我自己做主。',gate_guard:'我姓韩，守临溪关。放进关的人，我得对他们的来历负责。',gate_relief:'周某在韩校尉手下轮值。有人接班，才能离岗。',relay:'替驿舍补衣、传些杂事。税课的文书常从这里过。',gate_merchant:'东溪商帮的赵成。货得进城，人也得吃饭。',scribe:'修印刻字，靠手艺吃饭。别拿我的印铺名头招摇。',old_constable:'姓杜，做过捕快，如今退了。规矩懂一些，人也认得几个。',traveler:'我若照平日的法子进去，今日便什么也看不见了。你呢，是来赶路，还是被拦下的？',tea_host:'姓宋。过路人吃口热的，歇一歇脚，我挣个茶钱。',prisoner:'我曾在税课司抄账。有些数，不该让我看见。'}[id]||answerIdentity(id));break;
 case 'royal_letter':sim.s.facts.princeLetterRaised=true;invitePrince(sim);sim.s.facts.princeDeparture??={stage:0};text='……你拆过那封信。称我闲舟就是。这印能证明我是谁，不能证明谁吞了税银。到听雨楼来，带你自己查到的东西。';break;
 case 'prince_answer':text=sim.s.facts.enteredCity?VOICE_LINES.princeEntered:'路引查得这样细，税银的去处倒查不清。我记下了。';break;
 case 'prince_identity':sim.s.facts.princeAlias=true;text='眼力不错。我姓赵，闲舟是出门用的名字。旁的，等你我熟些再说。';break;
 case 'prince_evidence':invitePrince(sim);text='东街税课？这话是谁亲口说的？先别惊动他们。进城到听雨楼留句话，就说，茶凉了。我在那里等你的下文。';break;
 case 'prince_leave':if(sim.s.facts.princeDeparture?.arrived){sim.s.facts.princeRoyal=true;if(sim.s.quests?.prince)sim.s.quests.prince.status='complete';text=sim.s.facts.princeLetter?'你既读过信，就不必再问我的身份。坐。说说东街那本账，你又查到了什么？':'你来了。既然到了这里，就不必再瞒：我是宗室，这次私下查访税课。凭据还没齐，王府的名头也不能替证据。';}else if(sim.s.facts.princeDeparture){text='沿河走走。若还有话，边走边说。';}else{invitePrince(sim);sim.s.facts.princeDeparture={stage:0};text='等的人没来，倒认识了你。今日不算白等。进城后来听雨楼，说一句“茶凉了”。';}break;
 case 'watch':learn(sim,'watch',id==='gate_guard'?'韩校尉':'周伍长');text='我们轮着值。谁站这班都一样：路引上得有县里的官印，还要答得上姓名籍贯。不是让你再带一枚印章来。';break;
 case 'tax':learn(sim,'tax','驿舍补衣人');text='东街郑税使催的公文。关口归守军，税课司却三天两头遣人来催。';break;
 case 'tea_news':text='那边杜老捕认得衙门里的人，那位锦衣客在等人。要打听，等他们喝完这口茶。';break;
 case 'patron':learn(sim,'patron','锦衣客口述');text='押车人管那箱银子叫寿礼。我亲眼看见箱角贴着临溪税课司的封条，车却往大名府梁中书那里去了。';break;
 case 'apex':learn(sim,'apex','杜老捕口述');text='梁中书给丈人蔡京送生辰纲，年年都走这条道。可寿礼凭什么从百姓的税银里出？拿副账来，一笔笔对。';break;
 case 'ink_sign':n.inkAcknowledged=true;text='小声点。堂里走货，偶尔得换个落款，我这双手才留到今天。柜里还有一包迷毒散，五文。';if(!eco.items('npc:scribe').some(i=>i.hp>0&&i.type==='poison'))text='认得腰签就小声点。堂里的假落款是我刻的。你若还想问柜里那包散，已经不在我手上了。';break;
 case 'ink_buy':{const packet=eco.items('npc:scribe').find(i=>i.type==='poison'&&i.hp>0),q=eco.positions.scribe||{x:11,z:24};if(!packet||!eco.range(q.x,q.z))return {error:'走到刻字人身边再交易。'};if(!placePayment(sim,eco,{payer:'player',payee:id,amount:5,x:q.x+.45,z:q.z+.45,stand:q,reason:'印房货款'}))return {error:'盘缠不足。'};eco.transfer(packet,'player');text='收好。这一包能混进茶棚的壶里，茶娘倒给谁，谁就可能喝到。若只想动一个人的吃食，就认准他买的那个包子。别让旁人瞧见。';changes=['付出 5 文','获得：迷毒散'];break;}
 case 'seal':sim.s.facts.sealLesson=true;learn(sim,'tax','刻字人辨认官印');text='税课官印的边框有个缺口。拿到文书看一眼，别把街头传言当实据。';break;
 case 'ledger':learn(sim,'ledger','旧账房证言');sim.s.facts.taxLedgerLead=true;text='东街有副账，税使不许上报。你若拿到它，便知道银子往哪里去了。';break;
 case 'training_review':text='上次教你的身法，用着还顺手吗？别急着迈步，先看看人家的肩膀和眼睛。';break;
 case 'training':n.learnedFootwork=true;sim.s.player.energy-=10;changes=earnGrowth(sim.s.player,'agility',18,'lesson:'+sim.s.day+':'+id);if(n.contactAttempts[stamp]===1)n.trust=Math.min(100,(n.trust||0)+2);text='先看肩，再看眼。人转开身，你才挪脚。脚步轻不轻，得自己练。';break;
 case 'escort':if(!eco.items('npc:'+id).some(i=>i.type==='cargo'))return {error:'货包不见了，我得先找回来。'};if(!sim.s.facts.merchantContract){n.purse-=6;sim.s.facts.merchantContract={agreed:true,complete:false,wages:6};n.trust=(n.trust||0)+3;}n.life={activity:'escort',target:{x:1,z:22.8},until:eco.s.time+100};text='行。跟我到关前，把名字记在货单上。进城后你替我照看这一趟货，别让我找不着人。';break;
 case 'care':{const before=n.relation,trust=n.trust||0;const error=eco.act('help',id);if(error)return {error};changes=[`好感 +${n.relation-before}`,`信任 +${n.trust-trust}`];text=id==='traveler'?VOICE_LINES.princeCare:VOICE_LINES.teaCare;break;}
 }}
 const r={type:'npc',eventId:'contact:'+sim.s.day+':'+id+':'+action,actionId:action,label:a.label,kind:'listen',motion:['training','court_arrest'].includes(action)?'reach':'talk',check,roll,success,text,changes,dialogue:[{id,text}],authored:true};sim.s.history.push(r);sim.emit('result',r);sim.save();return r;
}
const RUMORS=[
 {id:'watch',a:'old_constable',b:'traveler',line:'关口是韩校尉管着，周伍长替他轮值。我从前当差，也得等接班的人到了，才顾得上吃饭。'},
 {id:'tax',a:'old_constable',b:'traveler',line:'东街郑税使又在催关口的公文。守军是守军，税课是税课，偏偏搅在一起。'},
 {id:'patron',a:'old_constable',b:'traveler',line:'当年押税银，车到岔口要往东京走。如今挂的是税司的锁，怎么倒往大名府梁中书那里去了？'}
];
export function societyStep(sim,eco,world,dt){const s=sim.s;s.gateSociety??={nextTalk:eco.s.time+12,index:0};streetSalute(sim,eco,world);const state=s.gateSociety,positions=eco.positions;
 if(s.facts.taxLedgerLead)learn(sim,'ledger','旧账房证言');
 const contract=s.facts.merchantContract,q=positions.gate_merchant,p=s.player;
 if(contract&&!contract.complete&&q&&Math.hypot(q.x-1,q.z-22.8)<1.4&&Math.hypot(q.x-p.x,q.z-p.z)<4&&s.event?.type==='gate'){
  const guard=s.people[s.watch?.holder||'gate_guard'],g=positions[s.watch?.holder||'gate_guard'];
  if(guard?.hp>0&&!(guard.stunnedUntil>(s.npcClock||0))&&!guard.drowning&&!(guard.sickUntil>eco.s.time)&&g&&Math.hypot(g.x-q.x,g.z-q.z)<4&&!guard.awareness?.caseOpen){contract.complete=true;admitFriend(sim);s.facts.entryRoute='merchant';s.facts.guardVouched=false;s.people.gate_merchant.life={activity:'escort',target:{x:4,z:18},until:eco.s.time+180};s.facts.entryReceipt.cost='随赵行商货队登记入城，欠下一趟照看货物的人情';s.facts.entryReceipt.route='merchant';sim.emit('npcRoutine',{id:'gate_merchant',text:'这是我找的帮工，记在我这张货单上。出了差错来找我。'});sim.save();}
 }
 if(contract?.complete&&!contract.delivered)s.people.gate_merchant.life={activity:'escort',target:{x:4,z:18},until:eco.s.time+180};
 if(contract?.complete&&!contract.delivered&&q&&Math.hypot(q.x-4,q.z-18)<1.4&&Math.hypot(q.x-p.x,q.z-p.z)<4&&eco.items('npc:gate_merchant').some(i=>i.type==='cargo')){contract.delivered=true;s.player.money+=contract.wages||0;contract.wages=0;s.people.gate_merchant.trust=Math.min(100,s.people.gate_merchant.trust+8);sim.relation('gate_merchant',8);sim.emit('npcRoutine',{id:'gate_merchant',text:'这一趟有人照应，省心。六文工钱收好，下回路上见。'});sim.save();}
 if(eco.s.time<state.nextTalk)return;state.nextTalk=eco.s.time+24;const r=RUMORS[state.index++%RUMORS.length],a=positions[r.a],b=positions[r.b];
 if(!a||!b||Math.hypot(a.x-b.x,a.z-b.z)>4||[r.a,r.b].some(id=>s.people[id].hp<=0||s.people[id].sickUntil>eco.s.time||s.people[id].stunnedUntil>(s.npcClock||0)||s.people[id].awareness?.caseOpen))return;
 if(Math.hypot(p.x-a.x,p.z-a.z)<8&&visibleBetween(p,a,world.obstacles,eco.s.objects)){learn(sim,r.id,'茶棚旁听');meet(sim,r.a);meet(sim,r.b);sim.emit('npcRoutine',{id:r.a,text:r.line});}
}
