import {rememberDeedHarm,rememberToldHarm} from './npc-bonds.js';
import {believedIdentity,spreadIdentityRumor,changeRelation,identityName} from './appearance.js';
import {PEOPLE} from './data.js';
import {persona} from './npc-persona.js';
import {learnedFootwork} from './gate-society.js';
import {clockText} from './world-clock.js';
import {QINGHE_SEARCH_PLACE,qingheSearchAvailable,recordOpeningLead,syncOpeningLeads} from './qinghe-leads.js';
import {qingheCrying} from './qinghe-cry.js';
import {npcName} from './npc-names.js';
// 江湖牌组：一条按体验节奏排好的线性牌序，不洗牌。玩家碰到"发牌员"（攀谈打听、歇息）时抽下一张牌，
// 再从该牌类下挑一个此刻合理、玩家尚不知道的具体事件。紧急牌插队，已知的牌跳过。
// AI 只在本地给出的候选里选择并写台词；结果、物品与数值一律由本地规则决定。
export const CARDS={
 route:{name:'门路',seal:'路'},craft:{name:'技艺',seal:'艺'},bond:{name:'人情',seal:'情'},
 echo:{name:'余波',seal:'波'},rest:{name:'喘息',seal:'息'},fame:{name:'名声',seal:'名'},aid:{name:'救急',seal:'急'}
};
export const DECKS={
 gate:['route','bond','craft','rest','route','fame','echo','route','rest'],
 town:['route','bond','craft','echo','rest','fame','bond','route','echo','rest']
};
 export const GATE_PEOPLE=['gate_guard','gate_relief','tea_host','traveler','old_constable','relay','gate_merchant','scribe','beggar','porter','fu','qinghe'];
const has=(s,item)=>s.player.inventory.includes(item);
const met=(s,id)=>!!s.people[id]?.metPlayer;
const clue=(s,id)=>!!s.intelligence?.clues?.[id];
// lines 是本地兜底台词：说话人只陈述自己可能见过、听过的事，不教玩家怎么偷、怎么躲。
export const EVENTS=[
 {id:'convoy_waiting',card:'route',stage:'gate',title:'黄旗下候人',lead:'这队花石纲等人等了许久，黄旗车旁的押运管事还在候着。',place:{person:'fu'},
  requires:s=>qingheSearchAvailable(s),known:s=>!!s.facts.fuWaitingKnown||!!s.facts.qingheUnwillingKnown,
  lines:{tea_host:'花石纲那队人等了许久，黄旗车旁的管事还不肯走。你若好奇，可以去问问。',old_constable:'黄旗底下那队人迟迟没走，像是在等人。押运管事就在车旁。',gate_merchant:'花石纲堵在这里半日了，说是还等着人。你去黄旗车旁问那管事吧。'}},
 {id:'riverside_cry',card:'route',stage:'gate',title:'石后的哭声',lead:'西边溪畔卧石后不时传来哭声，尚不知是谁。',place:QINGHE_SEARCH_PLACE,
  requires:s=>s.chapterVersion===2&&qingheCrying(s,s.people.qinghe),known:s=>!!s.facts.qingheUnwillingKnown||!!s.facts.fuWaitingKnown,
  lines:{tea_host:'西边溪畔那块卧石后，不时传来哭声。不知出了什么事，你若得空，过去看看吧。',old_constable:'方才经过西边溪畔，卧石后传来哭声。我没看清是谁。',relay:'溪畔卧石后像是有人在哭。我这里走不开，你可愿过去看看？'}},
 {id:'uniform_rack',card:'route',stage:'gate',title:'驿舍的差衣',lead:'驿舍补衣人在补一身旧差役服，就晾在衣架上。',place:{person:'relay'},
  known:s=>has(s,'旧差役服')||s.player.disguise==='runner',
  lines:{tea_host:'驿舍补衣人这两日在补一身旧差衣，说补好了要交还关上。',old_constable:'驿舍那身皂衣，补了三日还没补完。',gate_merchant:'驿舍衣架上挂着差衣，我还当里头有差爷歇脚。'}},
 {id:'merchant_pass',card:'route',stage:'gate',title:'行商的路引',lead:'赵行商贴身揣着一张盖了官印的路引，名字写的是赵成。',place:{person:'gate_merchant'},
  known:s=>!!s.facts.gatePassTaken||has(s,'他人的路引')||has(s,'改名路引'),
  lines:{tea_host:'赵行商每回喝茶都要摸一摸胸口，说路引比命金贵。',scribe:'赵行商那张路引我见过，印是真的，名字写的赵成。',relay:'那行商的路引收得紧，换衣裳都不离身。'}},
 {id:'merchant_escort',card:'route',stage:'gate',title:'缺个帮工',lead:'赵行商缺个帮手照看货，随货登记的人可以一并进关。',place:{person:'gate_merchant'},
  requires:s=>s.event?.type==='gate',known:s=>!!s.facts.merchantContract,
  lines:{gate_merchant:'这批货我一个人看不过来，正缺个搭手的。',tea_host:'赵行商念叨半日了，想雇个人帮着看货进城。'}},
 {id:'guard_vouch',card:'route',stage:'gate',title:'校尉认熟人',lead:'韩校尉肯替相熟的人担保，先放进城，再补凭据。',place:{person:'gate_guard'},
  known:s=>!!s.facts.guardVouched,
  lines:{gate_relief:'校尉面冷，熟人求到跟前，他也肯担一回。',old_constable:'老韩认人。处熟了，他宁可自己担着。'}},
 {id:'river_fence',card:'route',stage:'gate',title:'朽了的河栅',lead:'关西河道上的木栅泡了多年，木头已经糟了。',place:{point:[-22,21]},
  known:s=>s.ecosystem?.objects?.['river-fence']?.hp===0,
  lines:{old_constable:'西边那道河栅泡了十几年，木头早糟了。',relay:'河边那道木栅，晾衣时看着都歪了。',gate_relief:'西边水栅年年报修，年年没钱换。'}},
 {id:'prince_waiting',card:'route',stage:'gate',title:'候人的锦衣客',lead:'茶棚里一位锦衣客从早等到现在，衣料佩玉都不寻常。',place:{person:'traveler'},
  known:s=>!!s.facts.princeInvitation||met(s,'traveler'),
  lines:{tea_host:'那位穿锦衣的客人从早坐到现在，茶都凉了三回。',gate_merchant:'茶棚那位锦衣客，腰上的玉我在汴京也少见。'}},
 {id:'footwork',card:'craft',stage:'gate',title:'老捕快的步子',lead:'杜老捕当年追贼，有一套不惹人眼的步法。',place:{person:'old_constable'},
  known:s=>!!s.people.old_constable?.learnedFootwork||learnedFootwork({s},'old_constable'),
  lines:{tea_host:'杜老捕当年追贼，脚底下没一点声响。',gate_relief:'杜老捕走路不响，我们轮值的都怕他。'}},
 {id:'seal_lesson',card:'craft',stage:'gate',title:'辨印的门道',lead:'刻字人认得税课官印的真假。',place:{person:'scribe'},
  known:s=>!!s.facts.sealLesson,
  lines:{gate_merchant:'城外那刻字的，看一眼就知道官印真假。',tea_host:'刻字摊的师傅，官印上的缺口都数得清。'}},
 {id:'merchant_hungry',card:'bond',stage:'gate',title:'等饼的人',lead:'赵行商等饼等了半日，还没吃上东西。',place:{person:'gate_merchant'},
  known:s=>(s.people.gate_merchant?.relation||0)>=6,
  lines:{tea_host:'赵行商一早要的饼还没送到，饿得直转圈。',relay:'那行商在门口转了半日，说是等饼。'}},
 {id:'scribe_hands',card:'bond',stage:'gate',title:'刻字人的手',lead:'刻字人的手上有旧伤，不像只握刻刀的人。',place:{person:'scribe'},
  known:s=>!!s.facts.scribeScarsSeen||!!s.people.scribe?.probed,
  lines:{old_constable:'那刻字的握刀的架势，不是刻印练出来的。',tea_host:'刻字师傅搬货那天，一肩扛起两只箱子。'}},
 {id:'thief_bounty',card:'fame',stage:'gate',title:'通缉榜',lead:'关外通缉榜上贴着燕七的悬赏，要活人。',place:{point:[3.3,29.5]},
  known:s=>!!s.facts.publicWarrant,
  lines:{gate_relief:'榜上那个燕七，城里丢了东西的都报他。',old_constable:'燕七那小子我抓过两回，手快，心倒不坏。'}},
 {id:'court_hiring',card:'route',stage:'town',title:'钦差选人',lead:'顾钦差在官府大堂挑人手，要查税案。',place:{person:'inspector'},
  known:s=>!!(s.facts.courtCandidate||s.facts.career||s.quests?.['court-entry']),
  lines:{inn:'楼上住的那位钦差天天出去挑人，说要查税。',elder:'钦差进了临溪，大堂上缺的是肯办案的人。',guard:'顾大人要人手，捕房里人人都在掂量。'}},
 {id:'gang_den',card:'route',stage:'town',title:'赤砂堂',lead:'赤砂堂在城东，梅掌舵收人只看身手。',place:{person:'gang_boss'},
  known:s=>!!s.facts.gangKnown||s.facts.career==='gang',
  lines:{chi:'想吃江湖饭，去城东赤砂堂。帮主只看手上功夫。',porter:'城东赤砂堂门口天天有人比手，帮主在楼上看。',gao:'赤砂堂收人不问出身，问你敢不敢接镖。'}},
 {id:'ledger_rumor',card:'route',stage:'town',title:'两本账',lead:'传闻东街税课司另有一本没上报的副账。',
  known:s=>!!s.facts.taxLedgerLead||clue(s,'ledger'),
  lines:{elder:'东街税课司的账，说书的都不敢编。听说有两本。',inn:'税课司的人在楼上吃酒，漏过一句副账。'}},
 {id:'ribbon',card:'bond',stage:'town',title:'绛云楼的绣球',lead:'绛云楼梅家姑娘要抛绣球，亲事由她自己定。',place:{person:'mei'},
  known:s=>met(s,'mei'),
  lines:{matchmaker:'梅家姑娘的绣球，抛给谁由她自己挑。',porter:'绛云楼前搭了台子，说梅家姑娘要抛绣球。',tea:'绛云楼那位梅姑娘，可不是谁都看得上。'}},
 {id:'proposal',card:'bond',stage:'town',title:'揣着戒盒的人',lead:'沈砚揣着戒盒，想当众向苏晚求亲。',place:{person:'shen'},
  known:s=>met(s,'shen'),
  lines:{gao:'沈砚这两日魂不守舍，怀里揣着个盒子。',qing:'沈师兄要做件大事，我们都替他捏把汗。'}},
 {id:'su_music',card:'craft',stage:'town',title:'桥头的琴',lead:'苏晚在桥头卖艺，曲子里有北边的调子。',place:{person:'su'},
  known:s=>met(s,'su'),
  lines:{gao:'苏晚那把琴，弹得人想家。',tea:'苏姑娘每日这时辰都在桥头。'}},
 {id:'aqing_herbs',card:'craft',stage:'town',title:'草药香',lead:'卖茶的阿青懂草药，常给人敷伤。',place:{person:'tea'},
  known:s=>met(s,'tea'),
  lines:{porter:'脚夫扭了脚，都找阿青敷药。',inn:'卖茶的阿青，手上总有一股草药味。'}},
 {id:'thief_town',card:'fame',stage:'town',title:'燕七又出手',lead:'燕七还在城里出没，失主的状子都递到了捕房。',place:{person:'thief'},
  known:s=>!!s.facts.publicWarrant||!!s.people.thief?.inCustody,
  lines:{guard:'燕七那小子又出手了，捕房里堆着状子。',merchant:'燕七又在街上转，我把钱袋缝进了里衣。'}},
 {id:'aid_tea_host',card:'aid',stage:'gate',title:'茶棚包扎',lead:'宋茶娘替你缠了伤口。',heal:12,
  lines:{tea_host:'先别说话，我拿布给你缠上。'}},
 {id:'aid_tea',card:'aid',stage:'town',title:'阿青敷药',lead:'阿青替你洗净伤口，敷了草药。',heal:12,
  lines:{tea:'别动，伤口得先洗净再敷药。'}}
];
export const WIND={item_inquiry:'有人将失物与先前的持有记录对上了。',rumor_spread:'有人把你做过的事，说给了旁人。',grudge:'有人记下了这笔账。',thanks_letter:'有人记着你的好。'};
const name=id=>PEOPLE.find(p=>p.id===id)?.name||'路人';
export function stageOf(s){return s.facts.enteredCity||s.event?.type!=='gate'&&!s.facts.entryStarted?'town':'gate';}
export function deckState(s){
 const d=s.deck??={};d.pointer??={gate:0,town:0};d.used??={};d.heard??={};d.leads??=[];d.echoes??=[];d.cards??=[];d.seq??=0;return d;
}
export function chronicle(s){const c=s.chronicle??={};c.deeds??=[];c.diaries??=[];c.seq??=0;return c;}
function zoneOf(id){return GATE_PEOPLE.includes(id)?'gate':'town';}
function alive(s,id){const n=s.people[id];return !!n&&n.hp>0&&!n.awareness?.caseOpen;}
const CHAPTER_EVENTS={
 aid_tea_host:null,aid_tea:null,
 merchant_escort:{title:'黄旗下的役夫',lead:'周大石管着纲队役夫。可到车旁问他。',place:{person:'porter'},requires:()=>true,known:s=>!!s.facts.convoySchedule,lines:{tea_host:'役夫的名额归周大石管。他肯带谁，自有他的考量，你去问问。'}},
 guard_vouch:{title:'一份担保',lead:'茶棚有人提起锦衣客；可向他本人打听关口的事。',place:{person:'traveler'},requires:s=>!!s.facts.royalSawKindness,known:s=>s.facts.entryRoute==='royal',lines:{old_constable:'那位锦衣客在茶棚。关口的事，你可问问他。',tea_host:'那位锦衣客还在茶棚。你有话，可以当面问他。'}},
 footwork:{title:'老捕的指法',lead:'杜老捕能教正面擒拿的点穴手法；关外替人解围之后，还能进一步请教哑穴。',known:s=>(s.player.skills?.pressure.tier||0)>=2,lines:{gate_relief:'杜老捕拿人不用蛮力，手往筋骨上一搭，人就不动了。',tea_host:'杜老捕那双手，拿过人，也救过人。'}},
 seal_lesson:{title:'刻刀之外',lead:'刻字人的伤疤不寻常。先向西墙的瘸张学眼力，再辨他的来历。',known:s=>!!s.facts.scribeIdentity,lines:{old_constable:'西墙那瘸子看人很准。你问他刻字人的手。',tea_host:'刻字师傅不肯挽袖。瘸张瞧过一眼，没再问。'}},
 ledger_rumor:{title:'狱中的副账',lead:'旧账房被关在县狱。花石纲的副账或许还在他手中。',place:{person:'prisoner'},lines:{inn:'抄账的被关了，说是看见花石纲的账对不上。',elder:'县狱里那位账房，进去时袖中还护着一本账。'}},
 gang_den:{title:'运石队的名额',lead:'赤砂堂经手赴艮岳的运石队名额，可向梅掌舵问价。',lines:{chi:'运石队往艮岳去，名额由梅掌舵管。要随队，你去同他谈。',porter:'赤砂堂管着往艮岳送石的队伍。名额的事，得问梅掌舵。',inn:'听说赤砂堂有赴艮岳的运石名额，价钱得当面谈。'}},
 court_hiring:{title:'赴苑的荐书',lead:'顾钦差能荐人赴艮岳，先去官府大堂问清条件。',lines:{inn:'顾钦差能荐人赴艮岳，听说挑有功劳的。你可去大堂问问。',guard:'顾大人能荐人赴艮岳。把案子办明白，门里才肯信你。'}},
 ribbon:null,
 proposal:{title:'桥头未了的争执',lead:'沈砚与苏晚为去留争执。归还银戒能止住寻找，苏晚自己的去向还得问她。',lines:{qing:'沈师兄的戒指和苏姑娘的心事，哪里是同一回事。',gao:'桥头那两位还没谈妥。苏姑娘想走自己的路。'}},
 su_music:{title:'桥头的竹笛',lead:'苏晚愿意教笛，先听她自己的打算，替她留出选择的余地。',lines:{tea:'苏姑娘的笛子好听，可总有人不肯听她说话。',gao:'苏晚说要唱自己的曲子，我觉得没什么不好。'}},
 aqing_herbs:{lead:'阿青懂草药。替她照看伤者、偿清药钱，她愿教辨药。',lines:{porter:'脚夫扭了脚，都找阿青敷药。',inn:'阿青一直给伤者敷药，药账却还欠着。'}}
};
export function eventsFor(s){return s.chapterVersion===2?EVENTS.filter(e=>CHAPTER_EVENTS[e.id]!==null).map(e=>({...e,...CHAPTER_EVENTS[e.id]})):EVENTS.filter(e=>!['convoy_waiting','riverside_cry'].includes(e.id));}
export function eventCandidates(s,card,speaker){
 const d=deckState(s),st=stageOf(s);
 // 自己的提议走人物情境选项，不发成让玩家回头找自己的传闻。
 return eventsFor(s).filter(e=>e.card===card&&e.stage===st&&e.place?.person!==speaker&&e.lines[speaker]&&!d.used[e.id]&&!e.known?.(s)&&(e.requires?.(s)??true));
}
function deliverableEchoes(s,speaker,channel){
 return deckState(s).echoes.filter(e=>!e.delivered&&e.due<=s.day&&e.channel===channel&&(channel==='mail'||e.who===speaker)&&(e.subject||'player')===believedIdentity(s,e.who)&&alive(s,e.who));
}
// 只看不抽：同一状态下结果确定，供预取 AI 台词与判断是否撤下"打听"入口。
export function peek(s,dealer,speaker){
 if(speaker&&s.people[speaker]?.restraint)return null;
 const d=deckState(s),st=stageOf(s),deck=DECKS[st];
 if(dealer==='talk'){
  if(!speaker||!alive(s,speaker))return null;
  const echo=deliverableEchoes(s,speaker,'talk');if(echo.length)return {card:'echo',echo:echo[0],urgent:true,index:d.pointer[st],skipped:[]};
  if(d.heard[speaker]===s.day)return null;
  if(s.player.hp<40){const aid=eventCandidates(s,'aid',speaker);if(aid.length)return {card:'aid',candidates:aid,urgent:true,index:d.pointer[st],skipped:[]};}
 }
 const drought=!d.leads.some(l=>l.card==='route'&&l.stage===st)&&(st==='town'||d.cards.length>=2);
 if(drought&&speaker){const c=eventCandidates(s,'route',speaker);if(c.length)return {card:'route',candidates:c,urgent:true,index:d.pointer[st],skipped:[]};}
 const skipped=[];
 for(let i=0;i<deck.length;i++){
  const index=(d.pointer[st]+i)%deck.length,card=deck[index];
  // Rest is a pacing beat for resting, not news an NPC asks the player to click through.
  if(card==='rest'){if(dealer!=='talk')return {card,candidates:[],index,skipped};skipped.push(card);continue;}
  if(card==='echo'){const e=dealer==='talk'?deliverableEchoes(s,speaker,'talk'):[];if(e.length)return {card,echo:e[0],index,skipped};skipped.push(card);continue;}
  const c=speaker?eventCandidates(s,card,speaker):[];
  if(c.length)return {card,candidates:c,index,skipped};
  skipped.push(card);
 }
 return dealer==='talk'?null:{card:'rest',candidates:[],index:d.pointer[st],skipped};
}
const BANNED=/任务|检定|系统|玩家|概率|奖励|好感|属性|后生|小子|小哥|兄台|小娘子|NPC|AI|[A-Za-z0-9０-９]/;
export function validLine(line,max=48){
 if(typeof line!=='string')return false;const t=line.trim();
 return t.length>=4&&t.length<=max&&!BANNED.test(t)&&t.split(/[。！？]/).filter(Boolean).length<=2;
}
// AI 回复只有在选中合法候选、台词合规时才采用；否则用本地兜底，状态不受影响。
export function pickEvent(draw,speaker,ai){
 const local={event:draw.candidates[0],line:draw.candidates[0]?.lines[speaker],ai:false,reason:''};
 if(!ai||!draw.candidates.length)return local;
 const event=draw.candidates.find(e=>e.id===ai.event);
 if(!event||!validLine(ai.line))return local;
 return {event,line:ai.line.trim(),ai:true,reason:typeof ai.reason==='string'?ai.reason.slice(0,60):''};
}
export function dealContext(s,draw,speaker){
 const n=s.people[speaker],[style]=persona(speaker);
 return {mode:'deal',card:CARDS[draw.card].name,speaker:{id:speaker,name:name(speaker),title:PEOPLE.find(p=>p.id===speaker)?.title||'',style,relation:n?.relation||0,memories:(n?.memories||[]).slice(-4)},
  candidates:(draw.candidates||[]).map(e=>({id:e.id,fact:e.lead,example:e.lines[speaker]})),
  playerKnows:deckState(s).leads.slice(-8).map(l=>l.lead),recent:chronicle(s).deeds.slice(-6).map(d=>d.title+'：'+d.text),
  outfit:s.player.disguise==='runner'?'差役服':s.player.disguise?'乔装':'布衣',day:s.day,clock:clockText(s)};
}
function nextId(d){return ++d.seq;}
export function commitDeal(sim,draw,speaker,pick={}){
 if(speaker&&sim.s.people[speaker]?.restraint)return null;
 if(!draw||(draw.card!=='rest'&&!draw.echo&&!pick.event))return null;
 const s=sim.s,d=deckState(s),st=stageOf(s),deck=DECKS[st];
 if(['convoy_waiting','riverside_cry'].includes(pick.event?.id)&&!eventCandidates(s,pick.event.card,speaker).some(e=>e.id===pick.event.id))return null;
 // A physical guide visit already owns a card. Complete that record instead
 // of dealing a second copy of the same conversation.
 const prior=pick.actionCardId==null?null:d.cards.find(c=>c.id===pick.actionCardId);
 if(prior&&(prior.actionTemplate!=='guide'||prior.event!=='action:guide'||prior.speaker!==speaker))return null;
 if(!draw.urgent)d.pointer[st]=(draw.index+1)%deck.length;
 if(speaker&&!['echo','rest'].includes(draw.card))d.heard[speaker]=s.day;
 const card={...prior,id:prior?.id??nextId(d),day:s.day,at:s.day*1000+(s.time||0),clock:clockText(s),card:draw.card,stage:st,speaker:speaker||null,skipped:draw.skipped||[],urgent:!!draw.urgent,ai:!!pick.ai,reason:pick.reason||''};
 if(draw.card==='echo'&&draw.echo){
  const e=draw.echo;e.delivered=true;e.deliveredDay=s.day;
  Object.assign(card,{title:e.title,lead:e.line,line:e.line,echo:e.id,ai:e.ai,reason:e.reason,cause:e.cause});
 }else if(pick.event){
  const e=pick.event;d.used[e.id]=s.day;
  recordOpeningLead(s,e.id,npcName(s,speaker)+'口述');syncOpeningLeads(s);
  Object.assign(card,{title:e.title,lead:e.lead,line:pick.line||e.lines[speaker],event:e.id,place:e.place||null});
  if(s.chapterVersion===2&&e.id==='merchant_pass'&&card.line.includes('赵成')){s.facts.knownNames??={};s.facts.knownNames.gate_merchant='赵成';}
  if(e.heal){s.player.hp=Math.min(100,s.player.hp+e.heal);const n=s.people[speaker];if(n){n.memories.push('替你包扎过伤口。');n.memories=n.memories.slice(-12);n.favorOwed=(n.favorOwed||0)+1;}}
  else d.leads.push({id:card.id,event:e.id,card:e.card,stage:st,title:e.title,lead:e.lead,source:speaker,day:s.day,place:e.place||null,ai:card.ai,reason:card.reason});
 }else{
  Object.assign(card,{title:'喘息',lead:'',line:''});
 }
 if(prior){Object.assign(prior,card);d.cards=d.cards.filter(c=>c!==prior);}d.cards.push(prior||card);d.cards=d.cards.slice(-60);sim.save?.();return prior||card;
}
// —— 余波：歇息时推演当天的事会传到谁那里 ——
const CRIME=/steal|snatch|pocket|lift|poison|attack|assault|g_steal|theft/;
const HELP=/gift|care|befriend|return|escort|give|truce|support/;
export function recordDeed(sim,type,data){
 const s=sim.s,c=chronicle(s);if(data?.causalRecorded)return null;let deed=null;
 if(type==='result'&&data&&(data.roll!=null||data.changes?.length)&&data.type!=='conversation'){
  const tag=String(data.actionId||'')+' '+String(data.kind||'');
  deed={title:data.label,text:data.text,target:data.dialogue?.[0]?.id||data.target||null,valence:CRIME.test(tag)?'crime':HELP.test(tag)&&data.success!==false?'help':'deed',witnesses:[]};
 }else if(type==='actionWitnessed'&&data){
  // A complaint and its world witness notification describe the same incident.
  // Keep one cause and each observer's original identification through later disguises.
  const existing=data.cause!=null?c.deeds.find(d=>d.id===data.cause&&d.valence==='crime'):null;
  if(existing){existing.witnesses=[...new Set([...(existing.witnesses||[]),...(data.witnesses||[]).filter(id=>s.people[id])])];existing.identities={...data.identities,...existing.identities};existing.identitySerials={...data.identitySerials,...existing.identitySerials};existing.incidentType=data.incidentType;existing.method=data.method;existing.harmedTarget=data.target||existing.harmedTarget||existing.target;rememberDeedHarm(s,existing);return existing;}
  deed={title:({assault:'当街伤人',theft:'取走物件',tamper:'动过吃喝',damage:'损坏物件'}[data.incidentType]||'被人看见'),text:data.text,target:data.target||null,valence:'crime',incidentType:data.incidentType,method:data.method,identities:{...data.identities},identitySerials:{...data.identitySerials},witnesses:[...new Set((data.witnesses||[]).map(id=>({id})).concat(data.dialogue||[]).map(x=>x.id).filter(id=>s.people[id]))]};
 }else if(type==='entry'){
  deed={title:'入城',text:{uniform:'穿差役服过关',papers:'持他人路引过关',friend:'校尉担保入城',merchant:'随货队入城',river:'破河栅涉水入城',breach:'破门闯入',prison:'刑满出狱入城'}[data]||'进了临溪镇',target:null,valence:'deed',witnesses:[]};
 }else if(type==='npc'&&data?.id){
  deed={title:'送物',subject:believedIdentity(s,data.id),text:data.text||'',target:data.id,valence:'help',witnesses:[]};
 }
 if(!deed||!deed.text)return null;
 if(deed.valence==='help'&&deed.target)deed.subject??=believedIdentity(s,deed.target);
 deed={id:++c.seq,day:s.day,at:s.day*1000+(s.time||0),clock:clockText(s),...deed,title:String(deed.title||'').slice(0,24),text:String(deed.text).slice(0,80)};
 c.deeds.push(deed);rememberDeedHarm(s,deed);c.deeds=c.deeds.slice(-80);return deed;
}
export function deedsSinceRest(s){const c=chronicle(s);return c.deeds.filter(d=>d.id>(c.restSeq||0));}
function hearers(s,witness){
 const zone=zoneOf(witness),[style]=persona(witness);
 return PEOPLE.map(p=>p.id).filter(id=>id!==witness&&zoneOf(id)===zone&&alive(s,id)&&(persona(id)[0]===style||(PEOPLE.find(p=>p.id===id)?.faction&&PEOPLE.find(p=>p.id===id)?.faction===PEOPLE.find(p=>p.id===witness)?.faction))).slice(0,4);
}
// 每条候选都钉在一件真实发生过的事、一位真实在场的人身上；AI 只能在里面挑。
export function echoOptions(s){
 const d=deckState(s),done=new Set(d.echoes.map(e=>e.key)),out=[];
 for(const deed of deedsSinceRest(s)){
  if(deed.itemInquiry&&alive(s,deed.target))out.push({key:'item_inquiry:'+deed.id,template:'item_inquiry',subject:deed.subject,cause:deed.id,who:deed.target,channel:'talk',delta:0});
  if(deed.valence==='crime')for(const w of deed.witnesses){
   for(const h of hearers(s,w))out.push({key:'rumor_spread:'+deed.id+':'+h,template:'rumor_spread',subject:deed.identities?.[w]||deed.subject||'player',cause:deed.id,teller:w,who:h,channel:'talk',delta:-2});
   out.push({key:'grudge:'+deed.id+':'+w,template:'grudge',subject:deed.identities?.[w]||deed.subject||'player',cause:deed.id,who:w,channel:'talk',delta:0});
  }
  if(deed.valence==='help'&&deed.target&&alive(s,deed.target)){
   out.push({key:'thanks_letter:'+deed.id,template:'thanks_letter',subject:deed.subject||'player',cause:deed.id,who:deed.target,channel:'mail',delta:0});
  }
 }
 return out.filter(o=>!done.has(o.key));
}
function localEchoLine(o,deed){
 if(o.template==='item_inquiry')return '报失的'+deed.itemInquiry.name+'，先前有人见你拿过。把来路说清，不能只凭持有就定罪。';
 if(o.template==='thanks_letter')return (o.subject&&o.subject!=='player'?identityName(o.subject)+'，':'')+deed.title+'的事，多谢。我一直记着。';
 if(o.subject&&o.subject!=='player')return identityName(o.subject)+'，'+(o.template==='grudge'?'那天动手脚的事，我可没忘。':name(o.teller)+'说的那件事，你不解释解释？');
 if(o.template==='rumor_spread')return name(o.teller)+'说，'+deed.title+'那会儿，看见的就是你。';
 if(o.template==='grudge')return '那天的事，我还记得。';
 return deed.title+'的事，多谢。我一直记着。';
}
export function aftermathContext(s){
 const deeds=deedsSinceRest(s),options=echoOptions(s);
 return {mode:'aftermath',day:s.day,deeds:deeds.map(d=>({id:d.id,clock:d.clock,title:d.title,text:d.text,target:d.target&&name(d.target),witnesses:d.witnesses.map(name),valence:d.valence,believedIdentities:d.identities})),
  options:options.map((o,i)=>({i,template:o.template,who:name(o.who),teller:o.teller&&name(o.teller),cause:o.cause,subject:o.subject||'player',subjectName:identityName(o.subject||'player'),channel:o.channel})),
  people:[...new Set(options.flatMap(o=>[o.who,o.teller].filter(Boolean)))].map(id=>({name:name(id),title:PEOPLE.find(p=>p.id===id)?.title||'',style:persona(id)[0],relation:s.people[id]?.relation||0}))};
}
function localDiary(deeds){
 const notable=[...deeds].sort((a,b)=>({crime:3,help:2,deed:1}[b.valence]-{crime:3,help:2,deed:1}[a.valence])).slice(0,3);
 const lines=notable.map(d=>d.clock.split(' ')[0]+'，'+d.title+'。');
 return lines.length?lines:['这一日无事，只看了往来的人。'];
}
// 校验后落成真实世界变化：记忆、有上限的关系、待递送的余波牌。每夜最多三张。
export function applyAftermath(sim,ai,upTo=chronicle(sim.s).seq,requestedOptions=null){
 const s=sim.s,d=deckState(s),c=chronicle(s),deeds=deedsSinceRest(s).filter(x=>x.id<=upTo),currentOptions=echoOptions(s).filter(o=>o.cause<=upTo),options=requestedOptions?requestedOptions.map(o=>currentOptions.find(now=>now.key===o.key)):currentOptions;
 const diaryOK=Array.isArray(ai?.diary)&&ai.diary.length&&ai.diary.length<=3&&ai.diary.every(l=>validLine(l,26));
 const diary={day:deeds.at(-1)?.day??s.day,lines:diaryOK?ai.diary.map(l=>l.trim()):localDiary(deeds),ai:!!diaryOK};
 let picks=[];
 if(Array.isArray(ai?.echoes))for(const e of ai.echoes.slice(0,3)){
  const o=options[e?.i];if(!o||picks.some(p=>p.o.key===o.key||p.o.cause===o.cause&&p.o.template===o.template)||!validLine(e.line,40))continue;
  const safe=o.template!=='item_inquiry'||!(/偷|盗|贼|作案|罪|冒名|假扮|王爷|原形|识破|放行|送你|还你|赔你|亲眼/.test(e.line));
  picks.push({o,line:safe?e.line.trim():localEchoLine(o,deeds.find(x=>x.id===o.cause)),ai:safe,reason:typeof e.reason==='string'?e.reason.slice(0,60):''});
 }
 if(!picks.length){
  const seen=new Set();
  for(const o of options.filter(Boolean)){const k=o.template+':'+o.cause;if(seen.has(k))continue;seen.add(k);picks.push({o,line:localEchoLine(o,deeds.find(x=>x.id===o.cause)),ai:false,reason:''});if(picks.length>=3)break;}
 }
 const made=[];
 for(const {o,line,ai:fromAI,reason} of picks.slice(0,3)){
  const deed=deeds.find(x=>x.id===o.cause);if(!deed)continue;
  const n=s.people[o.who];if(!n)continue;
  const memory=o.template==='item_inquiry'?'持有记录与报失关联，尚未定罪：'+deed.text:o.template==='rumor_spread'?'听'+name(o.teller)+'说起：'+deed.text:o.template==='grudge'?'亲眼看见：'+deed.text:'受过你的照顾：'+deed.title;
  n.memories.push(((o.subject&&o.subject!=='player'?identityName(o.subject)+'：':'')+memory).slice(0,80));n.memories=n.memories.slice(-12);
  if(o.template==='rumor_spread')rememberToldHarm(s,o.who,deed,o.subject||'player',o.teller);
  const effects=[],delta=o.delta?changeRelation(sim,o.who,o.delta,o.subject||'player'):0;
  if(delta)effects.push({kind:'relation',observer:o.who,subject:o.subject||'player',delta});
  if(!['thanks_letter','item_inquiry'].includes(o.template)&&o.subject&&o.subject!=='player'){
   spreadIdentityRumor(s,o.subject,12,line,o.who);
   effects.push({kind:'scrutiny',observer:o.who,subject:o.subject});
  }
  const echo={id:nextId(d),key:o.key,template:o.template,subject:o.subject||'player',cause:deed.id,causeTitle:deed.title,who:o.who,teller:o.teller||null,channel:o.channel,line,wind:WIND[o.template],title:{item_inquiry:'失物核问',rumor_spread:'传开了',grudge:'记仇',thanks_letter:'一封谢帖'}[o.template],due:s.day+(o.channel==='mail'?1:0),delivered:false,ai:fromAI,reason,day:s.day,at:s.day*1000+(s.time||0),delta:o.delta};
  echo.effects=effects;
  d.echoes.push(echo);made.push(echo);
 }
 d.echoes=d.echoes.slice(-40);
 c.diaries.push(diary);c.diaries=c.diaries.slice(-30);c.restSeq=Math.max(c.restSeq||0,upTo);c.lastRestDay=s.day;
 return {diary,echoes:made};
}
// 信件余波在歇息醒来时送到：落成真实来信，可在信笺匣里看见。
export function deliverMail(sim){
 const s=sim.s,out=[];
 for(const e of deliverableEchoes(s,null,'mail')){
  e.delivered=true;e.deliveredDay=s.day;
  const id='echo-'+e.id;if(!s.mail.some(m=>m.id===id)){s.mail.push({id,sender:e.who,day:s.day,text:e.line,place:'',point:null,read:false,echo:e.id});}
  const card={id:nextId(deckState(s)),day:s.day,at:s.day*1000+(s.time||0),clock:clockText(s),card:'echo',stage:stageOf(s),speaker:e.who,title:e.title,lead:e.line,line:e.line,echo:e.id,ai:e.ai,reason:e.reason,cause:e.cause,skipped:[],channel:'mail'};
  deckState(s).cards.push(card);out.push(card);
 }
 return out;
}
export function placePoint(place,npcs){
 if(!place)return null;if(place.point)return place.point;
 const q=npcs?.get(place.person)?.actor?.position;return q?[q.x,q.z]:null;
}
