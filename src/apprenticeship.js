import {rescueDebt} from './action-cards.js';
import {believedIdentity} from './appearance.js';
import {PEOPLE} from './data.js';
import {SKILLS,skill,learnSkill,practice,PRACTICE_CAP} from './skills.js';
import {addCausalDeed} from './item-meaning.js';
import {placePayment} from './cash-transfers.js';
import {earnReputation} from './reputation.js';

export const TEACHERS={
 old_constable:{pressure:[2,3,4],insight:[3,4]},beggar:{insight:[2]},
 gate_relief:{combat:[2]},qing:{combat:[3]},chi:{combat:[3]},inspector:{combat:[4]},
 thief:{theft:[2,3]},gang_boss:{theft:[4],combat:[4]},su:{music:[2,3,4]},
 scribe:{disguise:[2,4]},qinghe:{disguise:[3]},tea:{medicine:[2,3,4]}
};
const who=id=>PEOPLE.find(p=>p.id===id)?.name||id;
const family={old_constable:'court',gate_relief:'court',inspector:'court',qing:'qingzhu',chi:'gang',thief:'gang',gang_boss:'gang',scribe:'wuxiang'};
export const LESSONS={
 pressure:{demo:'看指尖，先认肩井。不是戳，是送。',hint:'等师父落肩，再点亮起的穴位',motion:'pressure',prop:'dummy',steps:['认肩井','落指','收力'],after:'肩背认准了，迎面也能制住人。遇到巡逻，先想清楚值不值得动手。'},
 insight:{demo:'左肩比右肩低，腰间压着硬物。先看清，再下断语。',hint:'点击师父身上亮起的观察点',motion:'observe',prop:'parcel',steps:['看肩头','辨腰物','看手茧'],after:'去看刻字人的手和袖口。眼里有了凭据，再开口问他的来历。'},
 combat:{demo:'刀背护胸，别追刀尖。等我收势，你再接进来。',hint:'师父出招时按住 F 格挡，收势后左键还招',motion:'sword',prop:'weapon',steps:['守住中线','接住来招','收势还击'],after:'这一手要用在护人上。进城问问林青舟和段赤川，他们还在为脚夫的工钱争执。'},
 theft:{demo:'肩转开了，袖口才露出来。等这一刻，再解钱袋。',hint:'等师父转身，再点击钱袋；正面伸手会被拍开',motion:'reach',prop:'purse',steps:['靠近袖口','解开结扣','收起钱袋'],after:'钱袋的结扣也能解了。别人身上的东西，拿走了就得担后果。'},
 music:{demo:'先听这三拍。气息慢些，跟着我，别抢在句尾换气。',hint:'节拍落到朱砂线附近时按空格',motion:'flute',prop:'flute',steps:['起音','续气','收音'],after:'这支竹笛给你。找块空地奏一曲，过路人愿不愿停下，就听你的了。'},
 disguise:{demo:'衣服只骗第一眼。照着我的站姿，收肩，再改步子；熟人仍会认你。',hint:'跟着师父的示范，在亮起时点击对应部位',motion:'bow',prop:'mirror',steps:['收肩','垂手','定步'],after:'有衣服才好改扮。路引上的姓名、原主认识的人，还要自己留心。'},
 medicine:{demo:'先分叶脉，再轻碾药末，最后收进药包。见不准的，不要入口。',hint:'点击药案上亮起的药材、研钵和药包',motion:'reach',prop:'mortar',steps:['辨药叶','研药','收药'],after:'药性记牢了。先救眼前的人，再谈药能怎样害人。'}
};
const ADVANCED={
 pressure:{3:{demo:'肩井之后，再认哑穴。指力短，封住便收。',steps:['认哑穴','断声','撤指'],after:'如今可封哑穴、久定其身。制人留一线，别把逼问当本事。'},4:{demo:'气随指走，先稳住心口。隔着三步，试那木桩。',steps:['定气','隔空落指','收功'],after:'远处也能落指了。出手仍须看得清，隔墙不成。'}},
 insight:{3:{demo:'别急着信他说的。看手，再看他说话时护着什么。',steps:['看手','对照言辞','辨出迟疑'],after:'眼见与口中不同，才有可追问之处。凭神色不能定人的罪。'},4:{demo:'新衣会骗人，旧晒痕不会。再看袖长与步态。',steps:['看领口','辨袖长','对照步态'],after:'遇到改扮，再查衣着与身体的破绽。看不出破绽，就别妄断。'}},
 theft:{3:{demo:'袖内的结，手背贴着走。别碰到腕骨。',steps:['贴袖','绕结','退手'],after:'袖中之物也能摸到了。手越深，留下的嫌疑越难说清。'},4:{demo:'送进去比拿出来更难。松指以后，别急着抽手。',steps:['藏物','松指','退袖'],after:'暗送物件也学会了。行囊里选东西，才有这一手可用。'}},
 medicine:{3:{demo:'这剂解药，分量最要紧。药叶拣净，碾匀再封。',steps:['分药','研匀','封剂'],after:'药材两文一份，案子借你。自己配成解药，才有得救人。'},4:{demo:'有的毒不立刻发作。沉底的细末，也得闻一闻。',steps:['看沉末','辨药气','对照药性'],after:'迟发散的配法也教过你了。药材在案上，可自己配；入口的东西仍要多看一眼。'}},
 music:{3:{demo:'这段留一口气，等人停步。别急着把下一句吹满。',steps:['起句','留白','续曲'],after:'曲中有了留白，过路人更肯停步。试着留住一圈听众。'},4:{demo:'满席人说话，也别乱了气息。一句压住，再舒展开。',steps:['定调','展句','合曲'],after:'去听雨楼席前奏一整段。掌柜肯留下听，自会付酬钱。'}},
 disguise:{3:{demo:'领子遮晒痕，鬓边改年貌。步子也得跟着换。',steps:['修鬓','整领','换步'],after:'年貌可以修饰，熟人却未必认不出。话里的破绽仍要自己补。'},4:{demo:'改过的身形，要站得住。走久了也别把旧习惯带出来。',steps:['定身形','稳举止','走长步'],after:'如今改扮能撑得久些。凭据露馅，衣裳再像也没用。'}},
 combat:{3:{demo:'等刀将到，再架开。看见空门，才把下一刀送回去。',steps:['候刀','格开','还击'],after:'架开那一瞬，便有反击的空当。师门刀势也随这一招记下了。'},4:{demo:'别追他的人，先找握刀的手。架开，再卸兵刃。',steps:['看腕','架开','卸刃'],after:'反击落得稳，可暂时卸掉兵刃。逼退便收，莫追着伤人。'}}
};
export function lessonSpec(t){const spec={...LESSONS[t.ability],...(ADVANCED[t.ability]?.[t.tier]||{})};if(t.id==='beggar')Object.assign(spec,{demo:'看人先看鞋。那个役夫左肩低，挑担里压着铁器。你亲眼看看，再回来。',steps:['看鞋底','辨肩势','认担中物']});if(t.craft==='poison'||t.craft==='delayed')Object.assign(spec,{demo:t.craft==='delayed'?'先封药性，入口后要过一阵才发作。分量认准，不可混进救人的药。':'这味药使人腹痛。分开药叶，碾细，封好，不要误认成伤药。',steps:['分药叶','研细末','封药包']});return spec;}
export const BEGGAR_NEWS=[
 {id:'river',label:'拿一份干粮，问水门',line:'西边水门的第三块闸板，去年就朽了。你若想从那边找路，可得先看看水有多深，别只顾着看那块烂木头。',objective:'到西侧水门查看朽闸板',x:-22,z:21},
 {id:'pass',label:'拿一份干粮，问行商',line:'那行商叫赵成，是东溪来的，路引就揣在左边衣襟里。不过韩校尉认得他的人，一张纸可顶替不了一张脸。',objective:'留意赵行商的路引与行踪',x:6,z:24},
 {id:'coat',label:'拿一份干粮，问驿舍',line:'驿舍卖的那身旧差服，你去看看领口，里头缝着“陈小乙”三个字。衣服旧归旧，原主的名字可没跟着磨掉。',objective:'到驿舍查看差服',x:-11,z:24},
 {id:'convoy',label:'拿一份干粮，问纲队',line:'纲队的役夫名额归周大石管，你得去车旁找他。肯不肯带你是他的主意；真应下了，再换好挑夫的装束，跟着队伍走。',objective:'争取周大石同意，换好挑夫装束随队入城',x:5,z:31}
];
export function apprenticeships(s){return s.apprenticeships??={records:{},guides:[],practice:{}};}
export function lessonRecord(s,id,ability,tier){const a=apprenticeships(s),key=[id,ability,tier].join(':');return a.records[key]??={key,id,ability,tier,observed:false,completed:false};}
function favor(s,id){const d=s.chapter?.done||{};return ({
 old_constable:s.facts.duMedicineGiven?'':'先从驿舍取伤药，送回杜老捕手中',
 beggar:!s.facts.nestSlept?'先到乞丐窝睡一觉，再来请教':!s.facts.beggarInfoBought?'拿一份干粮，向瘸张买一条消息':!s.facts.beggarPorterSeen?'探查茶棚附近的役夫，验证肩势与担中铁器':'',
 gate_relief:d.help_mother?'':'先替宋家母女解眼前的差费',
 qing:d.convoy_peace?'':'替脚夫结清工钱，让两帮息争',chi:d.convoy_peace?'':'替脚夫结清工钱，让两帮息争',
 thief:d.yan_release?'':'燕七还未欠你这份人情',su:d.su_wish&&d.shen_space?'':'先听苏晚的心愿，劝沈砚把桥让开',
 scribe:s.facts.scribeIdentity&&d.scribe_secret?'':'看清袖中针囊，再和刻字人说破来历',
 qinghe:s.facts.qingheConsent?'':'须青禾亲口同意，才肯教你她的举止',
 tea:s.facts.herbsGround?'':'替阿青亲手研好这碗伤药',
 inspector:s.facts.career==='court'&&s.facts.ledgerDelivered?'':'入六扇门并交清副账案',
 gang_boss:s.facts.career==='gang'?'':'先成为赤砂帮弟子'
 })[id]??'';}
export function lessonPreview(sim,id,ability,tier,observe=false){const s=sim.s,p=s.player,n=s.people[id],r=lessonRecord(s,id,ability,tier);let reason='';
 if(!TEACHERS[id]?.[ability]?.includes(tier))reason='没有这门传承';
 else if(!n||n.hp<=0||n.restraint||n.awareness?.caseOpen||['fight','flee'].includes(n.awareness?.state)||n.stunnedUntil>(s.npcClock||0))reason='先处理眼前的冲突';
 else if(n.relation<0)reason='对方还在介意你的所作所为';
 else if(skill(p,ability).tier>=tier)reason='这层手法已学会';
 else if(tier>Math.max(2,skill(p,ability).tier+1))reason='先学前一层手法';
 else if(!observe){if(!r.observed)reason='先看师父示范';else reason=favor(s,id);if(!reason&&tier>2&&skill(p,ability).xp<PRACTICE_CAP)reason=`${SKILLS[ability].name}心得 ${skill(p,ability).xp}/${PRACTICE_CAP}，先练稳上一层`;if(!reason&&tier>2&&n.relation<(tier===4?12:6))reason='还需与师父多一份信任';}
 return {certain:true,chance:100,blocked:!!reason,reason};
}
export function apprenticeshipOptions(sim,id){const s=sim.s;if(s.chapterVersion!==2)return [];const list=[];
 for(const [ability,tiers]of Object.entries(TEACHERS[id]||{})){const tier=tiers.find(t=>t>skill(s.player,ability).tier&&t<=Math.max(2,skill(s.player,ability).tier+1));if(!tier)continue;const r=lessonRecord(s,id,ability,tier);const action=r.observed?'train':'observe';list.push({id:`ap_${action}_${ability}_${tier}`,mode:'contact',kind:'listen',label:r.observed?`请指点${SKILLS[ability].name} · ${['','','入门','熟练','精通'][tier]}`:`看看${who(id)}的${SKILLS[ability].name}手法`,ability,tier,observe:!r.observed});}
 const add=(key,label)=>list.push({id:'ap_'+key,label,mode:'contact',kind:'listen'});
 if(id==='relay'&&s.facts.duMedicineRequested&&!s.facts.duMedicineGiven&&!s.ecosystem?.items.some(i=>i.storyId==='du-medicine'&&i.location==='player'))add('medicine_get','替杜老捕取托存的伤药');
 if(id==='old_constable'&&s.ecosystem?.items.some(i=>i.storyId==='du-medicine'&&i.location==='player'))add('medicine_give','把伤药交给杜老捕');
 if(id==='beggar')for(const news of BEGGAR_NEWS)if(!s.facts['beggarNews:'+news.id])add('news_'+news.id,news.label);
 if(id==='tea'&&(!s.facts.herbsGround||rescueDebt(s,id)>0))add('grind',rescueDebt(s,id)>0?'帮阿青研药，偿还救治人情':'挽袖帮阿青研药');
 if(id==='tea'&&skill(s.player,'medicine').tier>=2){add('herbs','买一份配药草药 · 2 文');if(s.ecosystem?.items.some(i=>i.location==='player'&&i.type==='herbs'&&i.hp>0)){if(skill(s.player,'medicine').tier>=3)add('brew','借药案配一剂解毒药');add('poison','借药案配一包泻药');if(skill(s.player,'medicine').tier>=4)add('delayed','借药案配一包迟发散');}}
 for(const [ability,tiers]of Object.entries(TEACHERS[id]||{})){const sk=skill(s.player,ability);if(sk.tier>=2&&sk.tier<4&&tiers.some(t=>t===sk.tier||t===sk.tier+1))add('practice_'+ability,'与'+who(id)+'练一遍'+SKILLS[ability].name);}
 return list;
}
export function apprenticeshipPreview(sim,id,a){const n=sim.s.people[id];if(sim.s.player.hp<=0||!n||n.hp<=0||n.restraint||n.relation<0||n.awareness?.caseOpen||['fight','flee'].includes(n.awareness?.state)||n.stunnedUntil>(sim.s.npcClock||0))return {blocked:true,reason:'先处理眼前的冲突'};if(a.id==='ap_herbs')return {certain:true,chance:100,blocked:sim.s.player.money<2,reason:'需两文买药材'};if(a.ability)return lessonPreview(sim,id,a.ability,a.tier,a.observe);if(a.id.startsWith('ap_news_'))return {certain:true,chance:100,blocked:!sim.s.ecosystem?.items.some(i=>i.location==='player'&&i.hp>0&&i.type==='food'),reason:'需一份吃食'};return {certain:true,chance:100,blocked:false};}
export function requestApprenticeship(sim,eco,id,action,{submittedItem=null}={}){if((action==='ap_medicine_give'||action.startsWith('ap_news_'))&&!submittedItem)return {needsItem:true,task:action==='ap_medicine_give'?'medicine':action};const a=apprenticeshipOptions(sim,id).find(a=>a.id===action);if(!a)return {error:'这段传承已完成，或机缘未到。'};const preview=apprenticeshipPreview(sim,id,a);if(preview.blocked)return {error:preview.reason};const s=sim.s;
 const reply=text=>({type:'npc',presentation:'dialogue',motion:'talk',kind:'listen',success:true,actionId:action,label:a.label,roll:null,changes:[],dialogue:[{id,text}],text,authored:true});
 if(action==='ap_medicine_get'){eco.create('杜老捕托存的伤药','medicine','player',{storyId:'du-medicine',ownerId:'old_constable',discovered:true});sim.save();return reply('杜老捕托存的。拿稳，别弄散。');}
 if(action==='ap_medicine_give'){const item=eco.items('player').find(i=>i.id===submittedItem&&i.hp>0&&i.storyId==='du-medicine');if(!item)return {error:'药不在身上。'};eco.transfer(item,'npc:old_constable','entrusted');s.facts.duMedicineGiven=true;sim.relation(id,6);sim.relation('porter',3);addCausalDeed(s,{key:'du-medicine',title:'为役夫送药',text:'杜老捕肯教制人不伤人的手法。',target:id,valence:'kind'});sim.save();return reply('药到了。过来，我教你怎么收力。');}
 if(action.startsWith('ap_news_')){const news=BEGGAR_NEWS.find(n=>action==='ap_news_'+n.id),food=eco.items('player').find(i=>i.id===submittedItem&&i.type==='food'&&i.hp>0);if(!news||!food)return {error:'需一份干净的干粮。'};eco.transfer(food,'npc:beggar','bought');s.facts['beggarNews:'+news.id]=true;s.facts.beggarInfoBought=true;sim.relation(id,2);if(news.id==='pass'){s.facts.merchantGuardKnown=true;s.facts.knownNames??={};s.facts.knownNames.gate_merchant=true;}if(news.id==='coat'){s.facts.runnerNameKnown=true;s.facts.runnerCollarSeen=true;}s.quests['beggar-'+news.id]={id:'beggar-'+news.id,title:'入城门路',status:'active',source:'瘸张',objective:news.objective,note:news.line,point:[news.x,news.z]};addCausalDeed(s,{key:'beggar-news:'+news.id,title:'拿干粮换消息',text:news.line,target:id});sim.save();return reply(news.line);}
 if(action==='ap_herbs'){const q=eco.positions[id]||s.people[id];if(!placePayment(sim,eco,{payer:'player',payee:id,amount:2,x:q.x+.5,z:q.z+.3,y:.08,reason:'购买配药草药'}))return {error:'药钱不足。'};eco.create('阿青分好的草药','herbs','player',{ownerId:id,discovered:true});sim.save();return reply('药材在这儿。分量认准了再配。');}
 const ability=a.ability||(['ap_grind','ap_brew','ap_poison','ap_delayed'].includes(action)?'medicine':action.replace('ap_practice_',''));
 const tier=a.tier||skill(s.player,ability).tier;
 const session={id,ability,tier,observe:!!a.observe,help:action==='ap_grind',craft:({ap_brew:'antidote',ap_poison:'poison',ap_delayed:'delayed'})[action]||false,practice:action.startsWith('ap_practice_'),step:0,demonstrated:false,finished:false,failed:0};
 return {training:session};
}
export function finishDemonstration(sim,t){if(t.finished)return false;t.demonstrated=true;
 if(!t.observe)return true;const r=lessonRecord(sim.s,t.id,t.ability,t.tier);r.observed=true;t.finished=true;
 if(t.id==='old_constable')sim.s.facts.duMedicineRequested=true;
 const need=favor(sim.s,t.id);sim.s.quests['ap-'+t.ability]={id:'ap-'+t.ability,title:'师承 · '+SKILLS[t.ability].name,status:'active',source:who(t.id),objective:need||'回到'+who(t.id)+'身边，亲手试一遍',note:lessonSpec(t).after};
 addCausalDeed(sim.s,{key:'observe:'+r.key,title:'见识'+who(t.id)+'的手法',text:need||'师父肯教，尚须亲手练过。',target:t.id});sim.save();return true;}
export function attemptLesson(sim,t,{step,phase,blocked=false}={}){if(t.finished||!t.demonstrated||t.observe||step!==t.step)return false;
 const timely=!['music','theft','combat'].includes(t.ability)||(phase>=.38&&phase<=.82);
 if(blocked||!timely){t.failed++;return false;}t.step++;return true;
}
export function completeLesson(sim,eco,t){if(t.finished||!t.demonstrated||t.observe||t.step<3)return {error:'尚未亲手完成练习。'};
 const s=sim.s,p=s.player;if(p.hp<=0||s.people[t.id].hp<=0||s.people[t.id].restraint||s.people[t.id].awareness?.caseOpen||['fight','flee'].includes(s.people[t.id].awareness?.state))return {error:'传习已中断。'};
 if(!t.practice&&!t.help&&!t.craft){const c=lessonPreview(sim,t.id,t.ability,t.tier);if(c.blocked)return {error:c.reason};}
 if(t.craft&&!eco.items('player').some(i=>i.type==='herbs'&&i.hp>0))return {error:'药材已不在身上，未配成药。'};
 t.finished=true;let changes=[];
 if(t.craft){const herbs=eco.items('player').find(i=>i.type==='herbs'&&i.hp>0);herbs.location='consumed';const type=t.craft==='antidote'?'antidote':'poison',name=t.craft==='delayed'?'迟发散':type==='antidote'?'亲手配的解毒药':'泻药';eco.create(name,type,'player',{discovered:true,ownerId:'player',poisonDelay:t.craft==='delayed'?25:0,poisonConceal:skill(p,'medicine').tier>=3?2:0});changes=['获得：'+name,...practice(p,'medicine',5,'brew:'+s.day)];}
 else if(t.help){const first=!s.facts.herbsGround;s.facts.herbsGround=true;if(first)sim.relation(t.id,6);eco.create('研好的伤药','medicine','npc:tea',{ownerId:'tea',discovered:true});changes=first?['阿青好感 +6']:[];const n=s.people.tea,debt=n.rescueDebts?.find(d=>!d.paid&&d.subject===believedIdentity(s,'tea'));if(debt){debt.paid=true;n.favorOwed=Math.max(0,(n.favorOwed||0)-1);changes.push('偿还一份伤药');addCausalDeed(s,{key:'rescue-repaid:'+debt.card,title:'偿还救治人情',text:'亲手研好伤药，交回阿青手中。',target:'tea',cause:debt.cause,subject:debt.subject});}else if(believedIdentity(s,'tea')==='player'&&rescueDebt(s,'tea')>0){if(n.rescueDebts)n.rescueDebtLegacy=Math.max(0,(n.rescueDebtLegacy||0)-1);n.favorOwed=Math.max(0,(n.favorOwed||0)-1);changes.push('偿还一份旧欠伤药');}}
 else if(t.practice){const a=apprenticeships(s),key=[t.id,t.ability,skill(p,t.ability).tier,s.day].join(':');a.practice[key]=(a.practice[key]||0)+1;if(a.practice[key]<=3)changes=practice(p,t.ability,5,'spar:'+key+':'+a.practice[key]);if(changes.length&&a.practice[key]===1){sim.relation(t.id,1);changes.push(who(t.id)+'好感 +1');}}
 else {changes=learnSkill(p,t.ability,t.tier,who(t.id));const r=lessonRecord(s,t.id,t.ability,t.tier);r.completed=true;r.learnedAt=s.day;r.learnerSubject=believedIdentity(s,t.id);sim.relation(t.id,3);
 if(t.ability==='combat'&&t.tier===3)p.combatSchool=t.id==='qing'?'qing':'chi';
 const gifts={music:['苏晚的竹笛','flute'],...(t.tier>=3?{medicine:['阿青配的解毒药','antidote']}:{})};if(gifts[t.ability]&&!apprenticeships(s)['gift:'+t.ability]){const [name,type]=gifts[t.ability];eco.create(name,type,'player',{discovered:true,ownerId:t.id});apprenticeships(s)['gift:'+t.ability]=true;changes.push('获得：'+name);}
 apprenticeships(s).guides.push({ability:t.ability,tier:t.tier,teacher:t.id,key:r.key,seen:false});
 const q=s.quests['ap-'+t.ability];if(q){q.status='complete';q.objective='已学成，去江湖中运用';}
 earnReputation(sim,{city:null,faction:family[t.id],amount:family[t.id]?3:0,key:'lesson:'+r.key,reason:'师门认可你已掌握这一层手法。'});
 }
 const text=t.craft?(t.craft==='antidote'?'药包收好，遇到中毒的人再用。':'药包封好了。误伤了谁，终究要你自己担着。'):t.help?(changes.some(c=>c.includes('偿还'))?'细了，正好。上回的药钱，清了。':'细了，正好。'):t.practice?(changes.length?'这一遍稳了，换个场合再试。':'今日这套已练熟，去真实的事情里试试。'):lessonSpec(t).after;
 addCausalDeed(s,{title:who(t.id)+(t.craft?'看你配好药':t.help?'收起你研的药':t.practice?'与你拆招':'传授'+SKILLS[t.ability].name),text:(changes.length?changes.join('，')+'。':'')+text,target:t.id,valence:'kind'});
 sim.emit('apprenticeshipComplete',{...t,text,changes});sim.save();return {success:true,text,changes};
}
export function apprenticeshipBook(s,esc){if(s.chapterVersion!==2)return '';return `<section class="apprentice-book"><h3>师承</h3>${Object.entries(TEACHERS).flatMap(([id,defs])=>Object.entries(defs).map(([ability,tiers])=>{const tier=tiers.find(t=>t>skill(s.player,ability).tier&&t<=Math.max(2,skill(s.player,ability).tier+1));if(!tier)return '';const r=lessonRecord(s,id,ability,tier),seen=r.observed,need=favor(s,id);return `<article><b>${esc(who(id))} · ${SKILLS[ability].name}</b><small>${seen?'已观摩':'未观摩'} → ${need?'待结缘':'已结缘'} → 亲授 → 练习</small><p>${esc(seen?need||lessonPreview({s},id,ability,tier).reason||'可当面请教':'靠近请他示范一遍')}</p><button data-teacher="${id}">找${esc(who(id))}</button></article>`;})).filter(Boolean).join('')}</section>`;}

// Invitation is spoken by the teacher; the journal objective remains player-facing.
export function lessonInvitation(s,id){if(!favor(s,id))return '看清了？过来亲手试一遍。';return ({
 old_constable:'驿舍替我存了伤药，给役夫敷腿的。劳你取来，我再教你。',
 beggar:!s.facts.nestSlept?'先在这草席上睡稳了。天亮再来找我。':!s.facts.beggarInfoBought?'一个饼一句话。你想打听水门，还是关上的人？':'去看看茶棚旁的役夫。看他的肩，再看担子；看准了再回来。',
 gate_relief:'宋家还欠着两文差费。你替她解了围，我便教你。',
 qing:'脚夫的工钱没着落，哪有心思练刀。先替他们把账说清。',chi:'先把脚夫的工钱了结。刀法的事，回头再说。',
 thief:'眼下不便。我的事，你想好怎么处置再说。',su:'沈砚还堵着桥。先让我清静一会儿。',
 scribe:'这手艺不教生人。你看出了什么？',qinghe:'我的去留，总得先容我自己想想。',
 tea:'桌上这碗药还没研。你肯搭把手么？',inspector:'先把副账案办清。功夫的事，回头再说。',gang_boss:'先入堂，再谈授艺。'
 })[id]||'眼下有事未了，稍后再来。';}
