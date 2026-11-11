import {wantedProfile} from './wanted-records.js';
import {acquireRunnerClothes,runnerClothesTaken} from './runner-clothes.js';
import {currentFace,identityName,appearanceState,appearanceTime,clothingRole,clothing} from './appearance.js';
import {endPlayerPursuit} from './pursuit.js';
import {outfit,disguiseDifficulty} from './impersonation.js';
import {PRISON} from './locations.js';
import {updateMerchantPass} from './merchant-pass.js';
import {imprisonmentCost} from './progress.js';
import {OBJECT_ACTIONS,physicalReady} from './object-contracts.js';
import {earnGrowth,checkGrade} from './growth.js';
const a=(id,label,stat=null,difficulty=0,cost=0)=>({id,label,stat,difficulty,cost,kind:stat==='agility'?'steal':'listen',tags:[],story:true});
const stages={
 gate:{point:[0,24],cast:['gate_guard'],title:'临溪关 · 无路引不得入城',text:'你刚获释，仍有三星嫌疑。身上只剩十二文，报出的名字是假的。校尉将长枪横在门前。',line:'路引展开。先看县里的朱印，再对姓名籍贯。'},
 refusal:{point:[0,24],cast:['gate_guard'],title:'缺的不是一句好话',line:'谁不是说自己有急事？没凭据，回去。下一位！'},
 relay:{point:[-7,24],cast:['relay'],title:'城外茶棚 · 催得紧的公文',line:'校尉这会儿等着县衙差役接文书。上头催了三回，偏偏没人来。你真想试，得先穿得像个办差的。'},
 clothes:{point:[-11,24],cast:['relay'],title:'驿舍后 · 晾着的差役服',line:'那身旧衣是驿舍淘下来的，我刚补好袖口。六文，不讲价。手上有泥的别碰。'},
 uniform:{point:[0,24],cast:['gate_guard'],title:'换了身份，再开口',line:'哪一班的？文书交接要留名字，你可别耽误我的时辰。'},
 merchant:{point:[6,24],cast:['gate_merchant'],title:'货摊边 · 别人的路引',line:'买两个饼。钱袋在这儿……路引可不能弄丢，明早还要出城。'},
 cover:{point:[6,24],cast:['gate_merchant'],title:'货筐挡住了视线',line:'老板，烙饼翻个面。我的车先搁这里。'},
 exposed:{point:[6,24],cast:['gate_merchant'],title:'五双眼睛看过来',line:'你的手往哪里伸？抓贼！校尉，就这人！'},
 scribe:{point:[11,24],cast:['scribe'],title:'刻字摊 · 路引上的名字',line:'这上头写的可不是你。四文，我替你改字；官印我仿不了，遇上细查自己担着。'},
 papers:{point:[0,24],cast:['gate_guard'],title:'递上改过的路引',line:'梁……这字怎么洇了？籍贯报来，我对一对。'},
 fight:{point:[0,24],cast:['gate_guard'],title:'硬闯 · 校尉披甲，20 级',line:'闯关的！放下刀！'},
 prison:{point:[PRISON.spawn.x,PRISON.spawn.z],cast:['prisoner'],title:'城内牢房 · 三日刑期',line:'别白费劲，锁是新换的。你得罪的若是收税那伙人，我倒知道一件旧事。'},
 testimony:{point:[PRISON.spawn.x,PRISON.spawn.z],cast:['prisoner'],title:'旧案 · 两本税账',line:'他们给县里一本，给外堂另一本。我替他们抄过数，最后成了欠税的人。要查就去找东街收税吏的副账。'}
};
export const isGate=e=>e?.type==='gate';
export function gateState(e){return e.gate??={phase:'gate',attempts:[],facts:{}};}
// These v1 stops are now independent NPC/item interactions, not gate dialogue stages.
const retiredStops=new Set(['relay','clothes','merchant','cover','scribe']);
export function repairGateStage(s){
 const e=s.event;if(s.chapterVersion!==2||e?.status!=='active'||!isGate(e)||!retiredStops.has(e.gate?.phase))return;
 e.gate.phase='gate';e.point=[...stages.gate.point];e.cast=[s.watch?.holder||'gate_guard'];
}
export function gateView(sim){const q=gateState(sim.event),v={...stages[q.phase]};if(q.phase==='relay'&&sim.s.player.disguise==='runner')v.line=q.facts.dispatchKnown?'衣服穿齐整了，趁交班前过去吧。':'这身衣服倒像个办差的。你也来接公文？校尉在门口等得直催。';if(q.phase==='clothes'&&runnerClothesTaken(sim.s))v.line='衣架已经空了。';if(v.cast[0]==='gate_guard'&&['gate','refusal','papers','uniform'].includes(q.phase))v.cast=[sim.s.watch?.holder||'gate_guard'];if(sim.s.chapterVersion===2){delete v.text;if(['gate','refusal','papers','uniform'].includes(q.phase)){v.title='临溪关';v.line='花石纲先过。路引与姓名要相合，冒名可瞒不过熟人。';}if(q.phase==='relay')v.line='旧衣领里还缝着陈小乙的名字。别拿我的名头替你担保。';if(q.phase==='scribe')v.line='纸上的名字，改不成人。先想清楚谁认得你。';}return {...v,listener:v.cast[0],text:v.text||v.line,line:v.line,dialogue:[{id:v.cast[0],text:v.line}]};}
function rawGateActions(sim){
 if(sim.s.chapterVersion===2){const phase=gateState(sim.event).phase,p=sim.s.player,profile=wantedProfile(sim.s,sim.s.watch?.holder||'gate_guard');
  if(['gate','refusal','uniform','papers'].includes(phase))return [...(profile?[a('g_wanted_surrender','就'+profile.chargeText+'到案核问')]:[]),...(p.inventory.some(i=>['他人的路引','改名路引'].includes(i))?[a('g_present','出示路引，报出原主姓名','charm')]:[]),...(p.disguise==='runner'?[a('g_order','以陈小乙的身份应答','charm')]:[]),a('g_plead','没有凭据，今日还有什么门路？')];
  if(['merchant','cover','scribe','relay'].includes(phase))return [];
 }
 switch(gateState(sim.event).phase){
 case 'gate':return [a('g_plead','“没路引就一点办法也没有？你在等什么人？”'),a('g_find','退到货摊边，寻找能下手的路引'),a('g_charge','拔刀闯关（校尉 20 级，失败会被捕）')];
 case 'refusal':return [a('g_tip','到城外茶棚打听校尉等什么人'),a('g_find','转向货摊，寻找路引'),a('g_charge','不再解释，硬闯城门')];
 case 'relay':return [...(!gateState(sim.event).facts.dispatchKnown?[a('g_brief','“你说的公文，是哪里催来的？”')]:[]),a(sim.s.player.disguise==='runner'?'g_return':'g_clothes',sim.s.player.disguise==='runner'?'穿着差役服，回关口接文书':'去驿舍后看那身差役服'),a('g_find','不冒充官差，改找路引')];
 case 'clothes':if(runnerClothesTaken(sim.s))return [a('g_return','回关口'),a('g_tip','去茶棚打听交接的名目')];return [a('g_buy','付六文买旧差役服',null,0,6),a('g_lift','趁补衣人背身，顺走差役服','agility',45),a('g_find','放弃衣服，转向货摊')];
 case 'uniform':return [a('g_order',gateState(sim.event).facts.dispatchKnown?'“上头催三回了。误了文书，你担得起？”':'只凭差役服，冒充来接文书的官差','charm',gateState(sim.event).facts.dispatchKnown?40:78),a('g_tip','先去茶棚打听交接的名目'),a('g_abort','收住话头，去货摊另想办法')];
 case 'merchant':return [a('g_steal','直接伸手取商人腰间的路引','agility',78),a('g_crouch','伏低到货筐后，等他转身买饼'),a('g_tip','收手，去茶棚打听')];
 case 'cover':return [a('g_pocket','借货筐遮挡，抽出路引','agility',38),a('g_tip','收手，去茶棚')];
 case 'exposed':return [a('g_apologize','收回手，低声赔礼，求商人别报官','charm',58),a('g_surrender','放下武器，接受拘捕')];
 case 'scribe':return [a('g_rewrite','付四文改名，记熟路引上的籍贯',null,0,4),a('g_memory','省下四文，记住赵成的名字与籍贯，回关口冒名'),a('g_tip','收起路引，另找门路')];
 case 'papers':return [a('g_present',sim.s.player.inventory.includes('改名路引')?'“梁远，东溪人。”递上改名路引':'“赵成，东溪人。”冒用路引主人的身份','charm',sim.s.player.inventory.includes('改名路引')?38:65),a('g_surrender','承认来历有问题，接受盘问')];
 case 'fight':return [a('g_surrender','收刀认输，接受拘捕')];
 case 'prison':return [a('g_hear','问他为什么被关进来'),a('g_serve','不打听旧案，服满三日后出狱')];
 case 'testimony':return [a('g_record','记下副账的去向，服刑后去查'),a('g_serve','不接这桩事，服满刑期离开')];
 default:return [];}}
const navigation=new Set(['g_tip','g_find','g_clothes','g_abort','g_crouch','g_brief','g_return']);
export function gateActions(sim){const q=gateState(sim.event),options=rawGateActions(sim).filter(a=>(!['g_steal','g_pocket'].includes(a.id)||(!sim.s.facts.gatePassTaken&&!sim.s.ecosystem?.items.some(i=>i.documentId==='merchant-pass'&&(i.location!=='npc:gate_merchant'||i.hp<=0))))&&(navigation.has(a.id)||!q.attempts.includes(a.id)));if(sim.s.chapterVersion!==2&&outfit(sim)&&['gate','refusal','uniform','papers'].includes(q.phase)&&!q.attempts.includes('g_impersonate'))options.unshift(a('g_impersonate','以这身衣服的主人身份应付盘问','charm',disguiseDifficulty(sim)));return options.length||sim.s.chapterVersion===2?options:[a('g_surrender','不再冒险，向守卫自首')];}
function moveStage(sim,phase){const e=sim.event,q=gateState(e),v=stages[phase];q.phase=phase;e.point=[...v.point];e.cast=[...v.cast];sim.emit('scene',e);}
export function admitRoute(sim,route){if(!isGate(sim.event)||sim.s.facts.enteredCity)return false;admit(sim,route);sim.save();return true;}
function admit(sim,route){const s=sim.s,q=gateState(sim.event);s.facts.enteredCity=true;s.facts.entryRoute=route;s.facts.falseName=route==='papers'&&s.player.inventory.includes('他人的路引')?'赵成':'梁远';s.facts.entryReceipt={route,day:s.day,cost:route==='breach'?'打破城门闯入，未取得通行凭据':route==='river'?'破坏河栅，涉水潜入，未获得通行凭据':route==='prison'?'三日刑期，声望 −10':route==='papers'?'假身份，城内抽查仍有风险':'校尉记住假名，待交接公文已入行囊'};if(s.chapterVersion===2){s.facts.falseName=route==='papers'?'赵成':route==='uniform'?'陈小乙':null;s.facts.entryReceipt.cost=({royal:'锦衣客担保，欠下一份人情',convoy:'借役夫衣着随花石纲混入，未经本人验名',uniform:'冒用陈小乙身份，城内仍可能被盘查',papers:'冒用赵成身份，报失后将失效',breach:'破门闯入，留下破坏记录',river:'破栅涉水，失去体力并留下破坏记录',prison:'刑满获释，旧案结清'})[route]||'入关登记';}if(route==='uniform'&&s.chapterVersion!==2){s.player.inventory.push('待交接公文：东街税课');s.facts.taxOfficeLead=true;s.facts.guardKnowsAlias=true;sim.relation('gate_guard',6);s.player.money+=2;}if(route==='papers'){s.facts.falsePassRisk=true;}if(route==='prison'){s.day+=3;if(s.facts.custodyIdentity&&s.facts.custodyIdentity!=='player'){const r=appearanceState(s).reputations[s.facts.custodyIdentity]??={cities:{},factions:{}};r.cities.linxi=(r.cities.linxi||0)-10;s.facts.entryReceipt.cost='以'+identityName(s.facts.custodyIdentity)+'之名收押，核验后释放；官府保留口供身份';s.facts.custodyIdentity=null;}else s.reputation-=10;s.wanted=0;endPlayerPursuit(s);s.player.hp=Math.max(50,s.player.hp);}q.phase='finished';s.event={id:++s.sequence,type:s.chapterVersion===2?'ending':'proposal',status:s.chapterVersion===2?'resolved':'active',depth:0};s.pending=null;if(route!=='river'&&route!=='breach'&&route!=='fu-escort'){s.player.x=route==='prison'?PRISON.release.x:0;s.player.z=route==='prison'?PRISON.release.z:19;}sim.emit('entry',route);sim.emit('scene',s.event);}
export function resolveGate(sim,id,actionId){const e=sim.event;if(!isGate(e)||e.id!==id)return {error:'关口的局面已经变了。'};const q=gateState(e),a=gateActions(sim).find(a=>a.id===actionId),p=sim.s.player;if(!a||(!navigation.has(a.id)&&q.attempts.includes(a.id)))return {error:'这个办法已试过，换条路。'};if(Math.hypot(p.x-e.point[0],p.z-e.point[1])>5)return {error:'先走到眼前的地点再行动。'};if(!physicalReady(p,a.id))return {error:'靠近对应物品，完成场景中的动作后再试。'};const check=sim.preview(a);if(check.blocked)return {error:'钱不够，换个办法。'};const roll=a.stat&&!check.certain?1+Math.floor(sim.rng()*100):null,success=check.chance===0?false:roll==null||roll<=check.chance,changes=[];q.attempts.push(a.id);p.money-=a.cost;if(a.cost)changes.push('盘缠 −'+a.cost);if(a.stat)changes.push(...earnGrowth(p,a.stat,success?12:6,`gate:${id}:${a.id}`));let phase=q.phase,text='',speaker=e.cast[0],route=null;
 switch(a.id){
 case 'g_impersonate':if(success){route='papers';text='看着倒像……进去吧，城里还有巡查。';}else{phase='refusal';text='衣着是像，来历却说不清。退后，别堵着关口。';}break;
 case 'g_plead':if(sim.s.chapterVersion===2){sim.s.facts.entryRulesKnown=true;phase='gate';text='有路引报姓名，有差服报差事；有人肯作保也行。花石纲的役夫随队过关。各走各的路，别堵着关口。';break;}phase='relay';text='没路引就去补凭据。我这儿还等着驿舍来接县里的文书，已经催三回了。别挡道，茶棚在西边。';q.facts.dispatchKnown=true;break;
 case 'g_tip':phase='relay';text='你退到城外茶棚。校尉不肯通融，总得先弄清他眼下缺什么。';break;
 case 'g_clothes':phase='clothes';text='驿舍后晾着一身旧差役服。补衣人坐在门旁，时不时回头照看。';break;
 case 'g_brief':q.facts.dispatchKnown=true;phase='relay';text=p.disguise==='runner'?'关前报这句：县衙三催，来接门内驿站的公文。':'县衙催了三回，要交接的是送往门内驿站的公文。若要冒充接差的，衣架上有身旧差役服，先想办法弄到手。';break;
 case 'g_return':phase=p.disguise==='runner'?'uniform':'gate';text=p.disguise==='runner'?'你理好差役服的领口，准备回关口应付盘查。':'你回到关口。没有凭据，守卫仍挡着去路。';break;
 case 'g_buy':case 'g_lift':if(success){phase='clothes';acquireRunnerClothes(sim.s,a.id==='g_buy'?'purchased':'stolen');text='你取下旧差役服，收进包裹。';changes.push('收进包裹：旧差役服');}else{sim.s.facts.runnerClothesCaught=true;phase='merchant';text='补衣人回头喝止。衣服没拿到，他再不肯背过身。你只好离开驿舍。';}break;
 case 'g_order':if(sim.s.chapterVersion===2){if(success){route='uniform';text='陈小乙，进去。今日黄旗当道，莫耽误押运。';}else{phase='refusal';text=check.reason+'。退后，把来历说清。';}break;}if(success){route='uniform';text='催得这样急也不早说！文书带进门内驿站，交接写梁远是吧？这两文是脚钱。';changes.push('入城','盘缠 +2','校尉记住了假名：梁远','获得：待交接公文：东街税课');}else{phase='merchant';text='你连交接的名目都说不清。衣服哪来的？退下，再来就押你！';}break;
 case 'g_abort':case 'g_find':phase='merchant';text='货摊边的行商正翻钱袋，路引露在腰间。摊主和等饼的人都在旁边。';break;
 case 'g_crouch':phase='cover';p.crouched=true;q.coverRemaining=14;text='你伏在货筐后，等商人转身。遮挡让动作容易些，伸手仍会冒险。';changes.push(...earnGrowth(p,'agility',6,'gate:cover'));break;
 case 'g_steal':case 'g_pocket':if(success){phase='scribe';sim.s.facts.gatePassTaken=true;p.crouched=false;p.inventory.push('他人的路引');updateMerchantPass(sim.s,'player','他人的路引');text='路引入袖，上面却写着“赵成，东溪人”。刻字摊就在城外东边。';changes.push('获得：他人的路引');}else{phase='exposed';sim.s.wanted++;text='你的手碰到腰带，周围的人一起转头。行商攥住钱袋，大声招呼守卫。';changes.push('嫌疑 +1');}break;
 case 'g_apologize':phase=success?'relay':'prison';text=success?'别再让我看见你碰我的东西！这次让你走，路引我可收好了。':'少来这套。校尉，把人带走！';break;
 case 'g_rewrite':phase='papers';p.inventory=p.inventory.filter(i=>i!=='他人的路引');p.inventory.push('改名路引');updateMerchantPass(sim.s,'player','改名路引');text='刻字人改成“梁远”，让你背熟东溪的籍贯。官印没动，仔细验仍会露馅。';changes.push('获得：改名路引（抽查风险）');break;
 case 'g_memory':phase='papers';text='你把“赵成，东溪人”默念两遍，收好路引。省下了改字钱，但还得亲自到城门回答盘查。';break;
 case 'g_present':if(sim.s.chapterVersion===2){if(success){route='papers';text='名字对得上。路引带好，进去。';}else{phase='refusal';text=check.reason+'。这张路引不能放你进去。';sim.s.wanted=Math.min(9,sim.s.wanted+1);}break;}if(success){route='papers';text='籍贯对得上。过去吧，路引随身带好，城里还会查。';changes.push('入城','留下假路引抽查风险');}else{phase='prison';text='字迹与官印对不上。人留下，路引交来，进去慢慢说。';p.inventory=p.inventory.filter(i=>!['他人的路引','改名路引'].includes(i));updateMerchantPass(sim.s,'confiscated');}break;
 case 'g_charge':phase='fight';q.fightTime=0;text='校尉举枪封住关口。现在按 / 拔刀、左键出招；他有甲，你的普通攻击只能伤他 1 点。';break;
 case 'g_wanted_surrender':{const officer=sim.s.watch?.holder||'gate_guard',profile=wantedProfile(sim.s,officer);if(!profile)return {error:'这项通缉已不适用。'};sim.s.facts.custodyIdentity=profile.subject==='player'?null:profile.subject;sim.s.facts.lastCustody={officer,subject:profile.subject,charges:profile.charges,records:profile.records.map(r=>r.id),day:sim.s.day};sim.s.player.face=null;endPlayerPursuit(sim.s);phase='prison';text='因'+profile.chargeText+'被收押，口供身份与案情分别核验。';changes.push('到案核问');break;}
 case 'g_yan_surrender':sim.s.facts.custodyIdentity='thief';sim.s.facts.custodyFace=sim.s.player.face?.serial;sim.s.player.face=null;phase='prison';text='你以燕七之名被押进城里的牢房，狱卒收下口供，等候核验。';changes.push('以燕七之名被收押','易容在搜身时卸去');break;
 case 'g_surrender':phase='prison';text=sim.s.facts.lastCustody?.charges?.length?'你被卸下兵刃，因'+sim.s.facts.lastCustody.charges.map(c=>c.label).join('、')+'收押，身份与案情留待核验。':'你被卸下兵刃，押进城内牢房。门还是进了，代价是三日刑期。';break;
 case 'g_hear':phase='testimony';text=stages.testimony.line;break;
 case 'g_record':sim.s.facts.taxLedgerLead=true;p.inventory.push('狱友口供：东街副账');changes.push('获得：东街副账线索');route='prison';text='你记住收税吏的名字和副账去向。三日后，狱卒将你放到城内街口。';break;
 case 'g_serve':route='prison';text='你没有追问旧案。三日后刑满，从城内街口重新开始。';break;
 }
 if(phase==='prison')speaker='prisoner';
 if(phase==='prison'&&q.phase!=='prison'){imprisonmentCost(sim);p.hp=Math.max(25,p.hp);p.x=PRISON.spawn.x;p.z=PRISON.spawn.z;if(a.id==='g_wanted_surrender'&&sim.s.facts.lastCustody?.subject==='player'){sim.s.law??={};sim.s.law.served=[...new Set([...(sim.s.law.served||[]),...sim.s.facts.lastCustody.records])];}sim.emit('relocate');}
 const directReply=['g_plead','g_brief','g_hear'].includes(a.id);
 const r={presentation:directReply?'dialogue':'action',day:sim.s.day,eventId:id,type:'gate',actionId:a.id,label:a.label,kind:a.kind,motion:a.id==='g_pocket'?'crouch':'talk',roll,check,success,grade:checkGrade(roll,check.chance),text,changes,dialogue:[{id:speaker,text,narration:!directReply&&!['g_order','g_present','g_memory','g_apologize'].includes(a.id)}],authored:true,worldAction:!!OBJECT_ACTIONS[a.id],ongoing:!route,hint:route?(sim.s.chapterVersion>=2?'入城了。城内的线索与各方门路，可以接着走。':'入城之后，桥头还有一场风波。'):'跟随左上角的目的地继续。'};
 if(route){admit(sim,route);r.changes.push(...earnGrowth(p,route==='uniform'?'charm':route==='papers'?'agility':'might',18,'gate:entry'));}else moveStage(sim,phase);
 sim.s.history.push(r);sim.emit('result',r);sim.save();return r;
}
export function tickGate(sim,dt){if(sim.s.chapterVersion===2)return;const e=sim.event,q=gateState(e);if(q.phase==='cover'){q.coverRemaining??=14;q.coverRemaining-=dt;if(q.coverRemaining<=0){moveStage(sim,'merchant');sim.save();}return;}if(q.phase!=='fight')return;if(sim.s.people.gate_guard.awareness?.state==='fight')return;if(Math.hypot(sim.s.player.x-e.point[0],sim.s.player.z-e.point[1])>6){moveStage(sim,'refusal');sim.save();return;}q.fightTime=(q.fightTime||0)+dt;if(q.fightTime>=1.5){q.fightTime=0;sim.s.player.hp=Math.max(1,sim.s.player.hp-38);sim.emit('violence',{id:'gate_guard',down:false});if(sim.s.player.hp<=25){const p=sim.s.player;p.x=e.point[0];p.z=e.point[1];resolveGate(sim,e.id,'g_surrender');}}}

export function visitGate(sim,target,preview=false){
 if(!isGate(sim.event))return false;const q=gateState(sim.event),p=sim.s.player;
 if(['fight','prison','testimony','exposed'].includes(q.phase))return false;
 if(target==='gate_relief'&&sim.s.watch?.holder==='gate_relief')target='gate_guard';
 if(sim.s.chapterVersion===2&&target!=='gate_guard')return false;
 const stops={gate_guard:[0,24],relay:[-7,24],gate_merchant:[6,24],scribe:[11,24],'cargo-cover':[4.4,25.5],'runner-clothes':[-11,24.5],'merchant-pass':[4.4,24],'scribe-table':[11,24.5]};
 const point=stops[target];if(!point||Math.hypot(p.x-point[0],p.z-point[1])>3.8)return false;
 let phase;
 if(target==='gate_guard')phase=p.inventory.some(i=>['改名路引','他人的路引'].includes(i))?'papers':p.disguise==='runner'&&!q.attempts.includes('g_order')?'uniform':q.phase==='gate'?'gate':'refusal';
 else if(target==='relay')phase='relay';
 else if(target==='runner-clothes'&&!runnerClothesTaken(sim.s))phase='clothes';
 else if(['gate_merchant','cargo-cover','merchant-pass'].includes(target)&&!sim.s.facts.gatePassTaken&&!q.attempts.some(a=>['g_steal','g_pocket'].includes(a)))phase=q.phase==='cover'?'cover':'merchant';
 else if(['scribe','scribe-table'].includes(target)&&p.inventory.includes('他人的路引'))phase='scribe';
 if(!phase)return false;if(preview)return true;if(phase!==q.phase){moveStage(sim,phase);sim.save();}return true;
}
const directions={gate:'E 询问校尉；也可先探索城外。Alt 找物品，Z 蹲行。',refusal:'西侧茶棚打听差事，或东侧货摊寻找路引。',relay:'与补衣人交谈，弄清公文交接，再去衣架取衣。',clothes:'靠近衣架取衣；买下不检定，偷取有被发现风险。',uniform:'回到城门，利用差役服和公文消息交涉。',merchant:'Z 蹲下，在货筐背后停留三秒；也可直接冒险伸手。',cover:'商人背过身了。绕到他身侧点击路引，机会很短。',scribe:'路引写着赵成、东溪。改字花四文，也可冒用原名。',papers:'回城门递上路引。改名不能消除假证风险。',exposed:'行商叫住了你：赔礼求放行，或接受拘捕。',fight:'/ 拔刀、左键出招；也可 E 收刀认输。',prison:'E 与同牢人交谈，或者服刑后出狱。',testimony:'决定是否记下东街副账线索，随后服刑出狱。'};
export function gateHint(sim){const q=gateState(sim.event);return directions[q.phase]+(q.phase==='cover'?' 余 '+Math.max(0,Math.ceil(q.coverRemaining??14))+' 秒':'');}

export function enterRiver(sim){const p=sim.s.player;if(p.hp<=0||p.x<=-25.5||p.x>=-18.5||p.z>=19.5)return false;if(!isGate(sim.event)||['prison','testimony','exposed','fight'].includes(gateState(sim.event).phase)||sim.s.ecosystem?.objects['river-fence']?.hp!==0)return false;admit(sim,'river');sim.save();return true;}

export function admitFriend(sim){if(!isGate(sim.event))return false;admit(sim,"friend");sim.s.facts.guardVouched=true;sim.s.facts.entryReceipt.cost="校尉以私人信用担保，须补办路引";sim.save();return true;}

export function detainAtGate(sim){if(!isGate(sim.event))return false;const e=sim.event,q=gateState(e);q.phase='fight';q.attempts=q.attempts.filter(id=>id!=='g_surrender');e.point=[sim.s.player.x,sim.s.player.z];resolveGate(sim,e.id,'g_surrender');return true;}

export function enterBrokenGate(sim){
 const s=sim.s,p=s.player;
 if(!isGate(sim.event)||p.hp<=0||p.z>=20.5||Math.abs(p.x)>=2.7||s.ecosystem?.objects['town-gate']?.hp!==0)return false;
 if(['prison','testimony'].includes(gateState(sim.event).phase))return false;
 admit(sim,'breach');sim.save();return true;
}

// Compatibility entry for old callers; current encounters use any wanted identity.
export function surrenderAsYan(sim,officer){const profile=wantedProfile(sim.s,officer);if(currentFace(sim.s)!=='thief'||!profile)return {error:'这副面貌已失效。'};return detainByOfficer(sim,officer,profile)?{ok:true}:{error:'眼下无法收押。'};}

// All officers use the same real prison state, including captures inside town.
export function detainByOfficer(sim,officer,caseInfo=null){
 const s=sim.s,n=s.people[officer];if(!['guard','gate_guard','gate_relief','inspector'].includes(officer)||!n||n.hp<=0||n.restraint||n.stunnedUntil>s.npcClock)return false;
 if(s.event?.type==='gate'&&['prison','testimony'].includes(s.event.gate?.phase))return false;
 caseInfo??=n.awareness?.wantedCase;
 const subject=caseInfo?.subject||n.awareness?.believedIdentity||currentFace(s);s.facts.lastCustody={officer,subject,day:s.day,...(caseInfo?{charges:caseInfo.charges.map(c=>({...c})),records:caseInfo.records.map(r=>r.id)}:{})};s.facts.custodyIdentity=subject==='player'?null:subject;
 if(!isGate(sim.event))s.event={id:++s.sequence,type:'gate',status:'active',point:[s.player.x,s.player.z],cast:[officer],gate:{phase:'fight',attempts:[],facts:{}}};
 endPlayerPursuit(s);const ok=detainAtGate(sim);
 if(ok){s.player.face=null;s.player.crouched=false;s.player.stealing=false;for(const c of s.investigations?.cases||[])if((c.convoy||caseInfo?.records.some(r=>r.caseId===c.id))&&c.state!=='closed'&&[...(c.witnesses||[]),...(c.reports||[])].some(r=>r.subject===subject)){c.state='closed';c.custody=s.facts.lastCustody;}if(subject==='player'&&caseInfo){s.law??={};s.law.served=[...new Set([...(s.law.served||[]),...caseInfo.records.map(r=>r.id)])];}sim.save();}
 return ok;
}
