import {QINGHE_LINES} from './qinghe-journey-lines.js';
// Natural, fact-bound exchanges. Preparing a reply never grants its knowledge.
// The UI commits it only after the player has heard the complete exchange.
import {heldLedger,ledgerCase} from './ledger-case.js';
import {runnerClothesTaken} from './runner-clothes.js';
import {skill} from './skills.js';
import {rescueDebt} from './action-cards.js';
import {passengerGuardLine} from './convoy-passenger.js';
import {qingheSearchAvailable} from './qinghe-leads.js';

export const speechDone=(s,key)=>!!s.chapter?.done?.[key];
const holding=(s,type,where='player')=>s.ecosystem?.items.some(i=>i.hp>0&&i.location===where&&(i.type===type||i.storyId===type));
const reply=(text,follow=[],facts={},extra={})=>({text,follow,facts,...extra});
export const REPLACED_SPEECH=new Set('gate_rules merchant_name runner_name scribe_secret ledger_story qinghe_wish list_show entry_story su_wish fu_manifest'.split(' '));
export const SPEECH_KEYS=new Set([...REPLACED_SPEECH,...'gate_passage gate_no_papers gate_guarantor merchant_guard tea_worry tea_fee tea_daughter tea_coat tea_porter clothes_price poison_price royal_intro royal_name royal_offer royal_terms royal_task_offer fu_ledger_offer genyue_court_offer genyue_gang_offer ledger_where ledger_offer ledger_who qinghe_alternative qinghe_boundary qinghe_pause shen_concern su_boundary herb_offer grind_offer'.split(' ')]);

SPEECH_KEYS.add('fu_waiting');
export function chapterSpeech(s,id,key){
 const d=k=>speechDone(s,k),f=s.facts;
 if(['gate_rules','gate_no_papers','gate_guarantor','gate_passage'].includes(key)&&passengerGuardLine(s,id))return reply(passengerGuardLine(s,id));
 switch(key){
 case 'fu_waiting':return reply('宋青禾怎么还没到？她常去西边溪畔，这队人都等了许久了。',[],{fuWaitingKnown:true});
 case 'gate_rules':return reply(id==='gate_guard'?'应奉局正在押运花石纲，今日关上查得严。你要进城，得先把来历说清楚。':'今日有花石纲的差事，上头吩咐查得紧些。你要进关，也得先让我们查验，不能随便放人。',['gate_no_papers'],{entryRulesKnown:true});
 case 'gate_no_papers':return reply('没有路引，我怎么核实你的来历？若把人放进去出了事，追究下来，担责的可是我。',f.royalSawKindness?['gate_guarantor']:[],{guardResponsibilityHeard:true});
 case 'gate_guarantor':return reply('有人肯替你作保，就请他亲自来关上，把你的来历说清楚。我得当面听他说，不能只凭你转述。',[],{guarantorRequiredKnown:true});
 case 'merchant_name':return reply('我叫赵成，从东溪来，做些贩货的买卖。',['merchant_guard'],{}, {name:['gate_merchant','赵成']});
 case 'merchant_guard':return reply('韩校尉认得我，可今日查得严，熟面孔也不能省了查验。该看的东西，还是得拿给他看。',[],{merchantGuardKnown:true});
 case 'runner_name':return reply('领口缝的是“陈小乙”，是这身衣裳原主的名字。他原先替驿站跑腿。',[],{runnerNameKnown:true,runnerCollarSeen:true});
 case 'clothes_price':return reply('这身旧差服卖六文，袖口我刚补过。你先看看针脚，觉得合意再买。',['clothes_buy'],{runnerCoatOffer:true});
 case 'tea_worry':return reply('我这边忙着卖茶，那边又来催差费，真是一刻也不得清闲。',['tea_fee','tea_daughter'],{teaConcernHeard:true});
 case 'tea_fee':return reply('应奉局要收两文差费，连我这小茶棚也算在里头。人家催着要，我还能躲到哪里去？',['help_mother'],{teaFeeKnown:true});
 case 'tea_daughter':return reply(f.qingheWishShared?'她想去京城，我也知道她有她的心思。可孩子真要走远，做娘的哪能不挂心。':'应奉局看中了青禾的琴艺，惦记着把她带走。她是我女儿，我怎么放心得下？',[],{motherConcernHeard:true});
 case 'tea_coat':return reply(s.player.disguise==='runner'?'你这身差服，领口的旧名可还留着？穿旧衣裳，也得留意原先是谁穿的。':holding(s,'runner-clothes')||s.player.inventory.includes('旧差役服')?'旧差服？那领口里头兴许还留着原主的名字，你翻翻看。':'驿舍那边刚补好一身旧差服，你走近了就能看见。要问衣裳的事，找补衣人便是。',[],{runnerCoatLead:true});
 case 'tea_porter':return reply('抬箱的役夫归周大石管，人就在车旁。你要问搬运的事，找他就是。',[],{porterLeadKnown:true}, {name:['porter','周大石']});
 case 'scribe_secret':return reply('你竟认得这副针囊，眼力倒不差。既然看出来了，就别大声张扬，有话低声说。',['poison_price'],{scribeIdentity:true});
 case 'poison_price':return reply('那包药卖五文。药性可不是玩笑，拿回去要单独收好，别同伤药混在一处。',['poison_buy'],{poisonOfferKnown:true});
 case 'royal_intro':return reply('你也在等着进城？不急的话，坐下歇一会儿。关前人来人往，倒也看得出些门道。',['royal_name'],{royalMetByTalk:true});
 case 'royal_name':return reply('在下赵闲舟，出门在外便用这个名字。阁下这样称呼我就是。',[],{princeAlias:true}, {name:['traveler','赵闲舟']});
 case 'royal_offer':return reply(f.royalKindnessSource==='care'?'方才多亏你照看，我这边缓过来了。你若想进城，我可以陪你去关前，替你说句话。':'方才你替茶娘出的那两文，我都看见了。你若还在为进城发愁，我可以陪你到关前，替你作个保。',['royal_vouch','royal_terms'],{royalOfferKnown:true});
 case 'royal_terms':return reply('我确实有件事想请你帮忙，等说清楚了，你再拿主意。这份担保是人情，可不是要把你的人也买下来。',['royal_vouch']);
 case 'entry_story':return f.entryRoute==='royal'?reply('方才在关前，我替你担了这份来历。如今进了城，往后的路，还得看你自己怎么走、怎么做。',['royal_task_offer'],{royalEntryRecalled:true}):reply('你也进城了。路上可还顺利？',['entry_truth','entry_lie']);
 case 'royal_task_offer':return reply('我在找花石纲的副账。把原账交我查验，我便带你赴艮岳。账只一份，你想清楚交给谁。',['gy_seek','royal_task'],{royalLedgerOfferKnown:true});
 case 'fu_ledger_offer':return reply('花石纲那本副账，我要原本。交到我手里，我给你赴艮岳的帖子；若交了旁人，这场买卖便不作数。',['gy_seek'],{fuLedgerOfferKnown:true});
 case 'genyue_court_offer':return reply('赴艮岳的人，我来荐。须有引荐、在门里立过功，案子也得了结。能寻来花石纲原账，另论大功。',['gy_claim_court'],{genyueCourtOfferKnown:true});
 case 'genyue_gang_offer':return reply('运石队有名额，一千文一个。若是帮里信得过、又帮过忙的人，我也肯留位。先说好，票不能替你销案。',['gy_buy_gang','gy_favor_gang'],{genyueGangOfferKnown:true});
 case 'qinghe_wish':return reply(f.fuWaitingKnown?QINGHE_LINES.intro_fu:QINGHE_LINES.intro_unknown,[],{qingheWishKnown:true,qingheUnwillingKnown:true,qingheHesitationKnown:true,qingheRosterRouteKnown:true});
 case 'qinghe_boundary':return reply('我愿意去京城，是我自己的打算，可不代表谁都能把我的名字填进名册。要我去，总该先问过我。',['list_show']);
 case 'list_show':return reply('这上头写的真是我的名字……他们连问都没问，就替我定下了？',['qinghe_alternative'],{convoyNamesKnown:true,qingheListSeen:true});
 case 'qinghe_alternative':return reply('我想去京城，也想自己决定什么时候去。若由你替我走这一趟，得先说清楚：你究竟替我去做什么？',['qinghe_consent','qinghe_pause'],{qingheAlternativeDiscussed:true});
 case 'qinghe_pause':return reply('让我再想一想。这件事还没说定，也请你别替我应下来。',[],{qingheConsidering:true});
 case 'shen_concern':return reply('戒指还没找回来，她又不肯听我把话说完。我心里着急，可越急，越不知道该怎么开口。',['shen_space'],{shenConcernHeard:true});
 case 'su_wish':return reply('我想去京城唱自己的曲子，看看能走出一条什么路。这件事，我想照自己的心意去做。',['su_boundary'],{suWishKnown:true});
 case 'su_boundary':return reply('收回戒指，不等于我就应了这门亲事。婚事我还没有点头，这一点，我得先说清楚。',[],{suMarriageBoundary:true});
 case 'fu_manifest':return reply('名册是应奉局定下来的，我只管照着册子把人和货交上去。该问谁的事，你可别都问到我头上。',[],{fuManifestHeard:true});
 case 'ledger_story':return reply('同一笔账抄了两份，上头的数却对不上。我不过多问了一句为什么，就被关进了这里。',['ledger_where'],{taxLedgerLead:true});
 case 'ledger_where':return reply(holding(s,'ledger','npc:prisoner')?'就是花石纲的那本副账，原本还在我手里。你若真要查，便得从这本原账查起。':heldLedger(s)?'原账已经在你手里了。我说的这些话，你可以拿它逐一核对，不必只凭我一张嘴。':'原账已经不在我身上。可我先前说过的话，仍然认；只是要查明白，还得找回那本账。',['ledger_offer','ledger_who'],{prisonerOriginalKnown:true});
 case 'ledger_offer':return reply('你若肯查，我愿把这本原账交给你。光听我说还不够，账上记着什么，你得亲自去核对。',['ledger_get']);
 case 'ledger_who':return reply('我盼着顾钦差肯接手，也盼那位锦衣客能过问。总得有人愿意把账查清，我这些话才不至于白说。',[],{ledgerCourtLead:true});
 case 'herb_offer':return reply('草药两文一份。若要动手配药，我这张药案可以借你用，别把药材混放了就好。',['ap_herbs']);
 case 'grind_offer':return reply(rescueDebt(s,id)>0?'上回替你用的那份药，不必急着拿钱来还。你帮我把这一碗药研好，这笔药钱便算还上了。':'这碗药还没研好，你若有空，就帮我搭把手。药粉研匀些，后头才好用。',['ap_grind']);
 default:return null;
 }
}

export function chapterSpeechOptions(s,id){
 const out=[],d=k=>speechDone(s,k),f=s.facts;
 const add=(key,label,condition=true,repeat=false)=>{if(condition&&(repeat||!d(key)))out.push({id:'ch_'+key,label,mode:'contact',kind:'listen',story:['gate_rules','tea_worry','ledger_story','royal_offer','qinghe_wish'].includes(key)});};
 if(['gate_guard','gate_relief'].includes(id)){if(passengerGuardLine(s,id))add('gate_passage','现在可以进关了？');else{add('gate_rules','今日为何封关？');add('gate_no_papers','没有路引，能通融么？',d('gate_rules'));add('gate_guarantor','有人肯作保，可行么？',d('gate_no_papers')&&f.royalSawKindness);}}
 if(id==='gate_merchant'){add('merchant_name','还未请教，如何称呼？');add('merchant_guard','关上也查熟客么？',d('merchant_name'));}
 if(id==='relay'){
  add('clothes_price','那身旧差服，卖么？',!runnerClothesTaken(s)&&!f.runnerClothesCaught,true);
  add('runner_name','领口那几个字，写的什么？',!f.runnerClothesCaught&&(f.runnerCollarSeen||f.runnerCoatLead||d('clothes_price')||s.player.inventory.includes('旧差役服')));
 }
 if(id==='tea_host'){
  add('tea_worry','可是有什么烦心事？',!d('help_mother'));
  add('tea_fee','催的什么差费？',d('tea_worry')&&!d('help_mother'));
  add('tea_daughter','也在担心女儿么？',d('tea_worry'));
  add('tea_coat',s.player.disguise==='runner'?'这身差服，可还齐整？':s.player.inventory.includes('旧差役服')?'我得了一身旧差服。':'驿舍那里在忙什么？',!s.facts.enteredCity);
  add('tea_porter','车旁的役夫归谁管？',!s.facts.enteredCity);
 }
 if(id==='scribe'){
  add('scribe_secret','袖里那套针，是无相门的？',(s.people[id].probedTier>=2||f.scribeIdentity));
  add('poison_price','柜里那包药，怎么卖？',d('scribe_secret')&&holding(s,'poison','npc:scribe')&&!d('poison_buy'),true);
 }
 if(id==='traveler'){
  add('royal_intro','阁下也在等进城？',!f.enteredCity);add('royal_name','还未请教阁下如何称呼。',d('royal_intro')&&!f.princeAlias);
  add('royal_offer','方才，你似乎有话要说？',!f.enteredCity&&f.royalSawKindness&&!f.royalSawHarm&&s.people[id].relation>=0&&!f.royalEscort,true);
  add('royal_terms','这份担保，我要怎么还？',f.royalOfferKnown&&!f.enteredCity);
  add('entry_story',f.entryRoute==='royal'?'方才关前，多谢你。':'说起这次入城的经过',f.enteredCity);
  add('royal_task_offer','可有赴艮岳的门路？',f.enteredCity&&!ledgerCase(s).delivery&&!heldLedger(s)&&!f.royalLedgerOfferKnown,true);
 }
 if(id==='qinghe'&&!s.qingheJourney&&!f.qingheHesitationKnown){
  add('qinghe_wish',f.qingheWishKnown||d('qinghe_wish')?'花鸟使催你随车走，你愿意么？':'怎么独自在这里发愁？',!f.qingheUnwillingKnown,true);add('qinghe_boundary','那你自己如何打算？',d('qinghe_wish'));
  add('list_show','把这份名册给她看',holding(s,'convoy-list'));
  add('qinghe_alternative','若换我前去，你怎么想？',d('list_show')&&!f.qingheConsent,true);
  add('qinghe_pause','此事先缓一缓。',d('qinghe_alternative')&&!f.qingheConsent,true);
 }
 if(id==='shen'&&f.enteredCity)add('shen_concern','你在这里等谁？',!d('shen_space'));
 if(id==='su'&&f.enteredCity){add('su_wish','此后想往哪里去？');add('su_boundary','那枚戒指，你怎么想？',d('su_wish'));}
 if(f.enteredCity){
  if(id==='fu')add('fu_ledger_offer','能否随纲队赴艮岳？',!ledgerCase(s).delivery&&!heldLedger(s));
  if(id==='inspector')add('genyue_court_offer','怎样才能获荐赴艮岳？');
  if(id==='gang_boss')add('genyue_gang_offer','运石队可有赴苑的名额？');
 }
 if(id==='fu')add('fu_manifest','这份名册，是谁定的？',f.convoyNamesKnown||holding(s,'convoy-list'));
 if(id==='fu')add('fu_waiting','交谈',qingheSearchAvailable(s));
 if(id==='prisoner'&&f.enteredCity){
  add('ledger_story','为何关着你？');add('ledger_where','不一样的数，记在哪里？',d('ledger_story'));
  add('ledger_offer','肯把原账给我看看么？',f.prisonerOriginalKnown&&holding(s,'ledger','npc:prisoner')&&!ledgerCase(s).delivery,true);
  add('ledger_who','你盼谁来接手？',d('ledger_story'));
 }
 if(id==='tea'){add('grind_offer','可有什么能搭把手的？',!f.herbsGround||rescueDebt(s,id)>0,true);add('herb_offer','配药的草药怎么卖？',skill(s.player,'medicine').tier>=2,true);}
 return out;
}
