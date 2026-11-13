import {qingheJourneyOptions,qingheJourneyPreview,resolveQingheJourney,isQingheJourneyAction,qingheChoices} from './qinghe-journey.js';
import {genyueOptions,genyuePreview,resolveGenyue,syncGenyue} from './genyue.js';
import {cityRep,earnReputation} from './reputation.js';
import {ledgerCase,heldLedger,ledgerRoute,ledgerOptions,ledgerPreview,resolveLedger} from './ledger-case.js';
import {meet} from './factions.js';
import {visibleBetween} from './npc-awareness.js';
import {registerCourt} from './court-street.js';
import {careerResolve} from './faction-career.js';
import {factionAuthority,factionJoinBlock,recordFactionEnrollment} from './faction-discipline.js';
import {placePayment} from './cash-transfers.js';
import {PEOPLE} from './data.js';
import {skill,practice} from './skills.js';
import {BEGGAR_NEST} from './locations.js';
import {admitRoute} from './gate-scene.js';
import {addCausalDeed,settleMeaning} from './item-meaning.js';
import {appearanceView,believedIdentity,identityName} from './appearance.js';
import {convoyOptions,convoyPreview,isConvoyAction,resolveConvoyTalk} from './convoy.js';
import {chapterSpeech,chapterSpeechOptions,SPEECH_KEYS,REPLACED_SPEECH} from './chapter-speech.js';
import {beginRoyalEscort} from './royal-escort.js';
import {recordOpeningLead,syncOpeningLeads,qingheSearchChoice} from './qinghe-leads.js';
// Authored chapter stakes, independent of the currently tracked quest.
const storyChoices=new Set(['fu_manifest','ledger_story','ledger_get','gate_rules','help_mother','qinghe_wish','list_show','qinghe_consent','qinghe_end','royal_vouch','entry_story','entry_truth','entry_lie','royal_task','royal_end','convoy_work','convoy_enter','yan_secret','yan_release','yan_arrest','convoy_dispute','convoy_peace','court_join','court_end','gang_join','gang_end','fame_end']);
const opt=(id,label,extra={})=>({id:'ch_'+id,label,mode:'contact',kind:'listen',story:storyChoices.has(id),...extra});
const name=id=>PEOPLE.find(p=>p.id===id)?.name||id;
const done=(s,k)=>!!s.chapter?.done?.[k];
function chapter(s){return s.chapter??={done:{},fame:{gate:0,town:0},titles:[],heard:{}};}
function grant(sim,key,{rep=0,id,relation=0}={}){const c=chapter(sim.s);if(c.done[key])return false;c.done[key]=true;if(id)sim.relation(id,relation);earnReputation(sim,{observer:id,amount:rep,reason:'街坊记下了你做的事。',key:'chapter:'+key});if(cityRep(sim.s)>=25&&!c.titles.includes('临溪义客'))c.titles.push('临溪义客');return true;}
function has(s,type){return s.ecosystem?.items.some(i=>i.location==='player'&&i.hp>0&&(i.type===type||i.storyId===type));}
export function restingPlace(s){const p=s.player,near=(x,z)=>Math.hypot(p.x-x,p.z-z)<4;return near(BEGGAR_NEST.x,BEGGAR_NEST.z)?{id:'nest',name:'乞丐窝',cost:0}:near(-10,-7)?{id:'inn',name:'听雨楼',cost:2}:factionAuthority(s,'court')&&near(10,-23)?{id:'court',name:'值房',cost:0}:factionAuthority(s,'gang')&&near(23,-5)?{id:'gang',name:'赤砂堂',cost:0}:null;}
export function recordRest(sim,place){chapter(sim.s);if(place.id==='nest')sim.s.facts.nestSlept=true;sim.s.player.money-=place.cost;addCausalDeed(sim.s,{title:'落脚'+place.name,text:'合衣歇息，等候下个白天。',target:place.id==='nest'?'beggar':'inn'});}
export function restTalk(s,nearby){const c=chapter(s),lines=[];const available=id=>nearby.includes(id)&&s.people[id]?.hp>0;
 if(available('beggar'))lines.push({id:'beggar',text:s.facts.enteredCity?'进过城的人，鞋底都多一层灰。今夜还是这块草席？':s.facts.gatePassTaken?'腰里多了东西，脚步倒轻了。睡觉也别把来路忘了。':'草席靠墙干些。天亮听见换岗的梆子，再起。'});
 if(available('tea_host'))lines.push({id:'tea_host',text:done(s,'help_mother')?'青禾还念着你替我们解围。她的主意，我也该听听。':'今晚水烧得慢，客官将就一口。'});
 if(available('inn'))lines.push({id:'inn',text:cityRep(s)>=25?'街坊说起你了。好名声难得，别让人借去做坏事。':'灯给你留着。夜里楼梯响，别当成谁来找你。'});
 return lines.slice(0,2);
}
export function nextChapterDay(sim,{notify=true}={}){const s=sim.s;for(const f of s.storyFollowups||[]){if(f.delivered||f.due>s.day)continue;f.delivered=true;sim.relation(f.id,f.delta||0);s.mail.push({id:'follow-'+f.key,sender:f.id,day:s.day,text:f.line,read:false});addCausalDeed(s,{key:'follow-'+f.key,title:name(f.id)+'的回话',text:f.line,target:f.id,cause:f.cause,valence:f.delta<0?'harm':'kind'});}if(notify)sim.emit('day',s.day);}
export function chapterOptions(sim,id){const s=sim.s,c=chapter(s),p=s.player,n=s.people[id],list=[];const add=(key,label,extra)=>{if(!done(s,key))list.push(opt(key,label,extra));};
 syncGenyue(s);list.push(...genyueOptions(s,id),...ledgerOptions(s,id));
 if(id==='prisoner'&&s.facts.enteredCity){if(!heldLedger(s)&&!ledgerCase(s).delivery)add('ledger_story','问他为何留着那本账');if(done(s,'ledger_story')&&!ledgerCase(s).delivery&&s.wanted===0&&s.ecosystem?.items.some(i=>i.type==='ledger'&&i.hp>0&&i.location==='npc:prisoner'))add('ledger_get','接过原账，自己决定交给谁');}
 if(id==='fu'){add('fu_manifest','名册上为何有宋家姑娘？');const search=qingheSearchChoice(s);if(search)list.push(search);}
 if(id==='beggar'){add('nest_welcome','这处草席能借我歇一晚么？');if(s.facts.nestSlept&&skill(p,'insight').tier<2)add('learn_insight','请你教我看人的门道',{cost:1});}
 if(['gate_guard','gate_relief'].includes(id)){add('gate_rules','方才为何关城门？');if(done(s,'help_mother')&&id==='gate_relief'&&skill(p,'combat').tier<2)add('learn_combat','劳烦指点持刀的架势');}
 if(id==='gate_merchant')add('merchant_name','货上写的赵字，是您的姓？');
 if(id==='relay')add('runner_name','差役服领口的名字，能辨得出来么？');
 if(id==='scribe'){
  if(n.probedTier>=2||s.facts.scribeIdentity){add('scribe_secret','你袖中是无相门的针囊。');if(done(s,'scribe_secret')){if(skill(p,'disguise').tier<2)add('learn_disguise','请教改扮年貌的法子',{cost:3});if(!done(s,'poison_buy'))add('poison_buy','买一包迷毒散',{cost:5});}}
 }
 if(id==='tea_host'&&!s.facts.enteredCity){add('help_mother','替宋家垫付两文差费',{cost:2});}
 if(id==='qinghe'){
  add('qinghe_wish','你想随花石纲进京？');
  if(has(s,'convoy-list'))add('list_show','给她看押运名册');
  if(done(s,'list_show'))add('qinghe_consent','商量替她赴艮岳，留退路给她');
 }
 if(id==='qinghe'&&s.facts.qingheConsent&&s.facts.enteredCity)add('qinghe_end','以青禾同意的身份随车赴艮岳');
 if(id==='traveler'){
  if(!s.facts.enteredCity){if(s.facts.royalSawKindness&&!s.facts.royalSawHarm&&(n.relation>=0))add('royal_vouch','劳烦为我说一句公道话');}
  else {add('entry_story','说起这次入城的经过');if(done(s,'entry_story')){add('entry_truth','如实告诉他自己的门路');add('entry_lie','只说凭路引堂堂正正进来',{stat:'charm',difficulty:55});}if(done(s,'entry_truth')||done(s,'entry_lie')||done(s,'royal_task_offer'))add('royal_task','可有查账的引荐？');
   if(s.chapterVersion!==2&&done(s,'royal_task')&&cityRep(s)>=25&&s.facts.ledgerDelivered)add('royal_end','携副账的核验结果赴约');}
 }
 if(id==='porter')list.push(...convoyOptions(s));
 if(id==='shen'&&s.facts.enteredCity){if(has(s,'ring')||p.inventory.includes('ring'))list.push(opt('return_ring','把银戒还给沈砚'));add('shen_space','苏姑娘已说了不愿，先把桥让开。');}
 if(id==='su'&&s.facts.enteredCity){add('su_wish','问她此后想往哪里去');if(done(s,'su_wish')&&done(s,'shen_space')&&skill(p,'music').tier<2)add('learn_music','请教这支曲子的指法');}
 if(id==='thief'&&(s.facts.publicWarrant||n.probedTier>=2)){add('yan_secret','通缉榜上的人，是你？');if(done(s,'yan_secret')){add('yan_release','放他走，问一条活路');add('yan_arrest','让他随你去官府交代');}if(done(s,'yan_release')&&skill(p,'theft').tier<3)add('learn_theft','请教袖中取物的手法');}

 if(['qing','chi'].includes(id)&&s.facts.enteredCity){add('convoy_dispute','问起两帮争的那批花石');if(done(s,'convoy_dispute')&&!done(s,'convoy_peace'))add('convoy_peace','先给脚夫结工钱，两帮各留凭据',{cost:4});if(done(s,'convoy_peace')&&skill(p,'combat').tier<3)add('learn_combat_advanced','请教押运时应敌的刀法');}
 if(id==='inspector'&&s.facts.enteredCity){if(s.people.thief.custodyDelivered||s.facts.courtTokenPresented){if(!factionJoinBlock(s,'court'))add('court_join','凭引荐或交案功劳，申请当差');}if(s.chapterVersion!==2&&factionAuthority(s,'court')&&s.facts.ledgerDelivered)add('court_end','以副账案的功劳应征艮岳守卫');}
 if(id==='gang_boss'&&s.facts.enteredCity){if(!factionJoinBlock(s,'gang')&&(done(s,'convoy_peace')||done(s,'yan_release')))add('gang_join','请梅掌舵引入赤砂帮');if(factionAuthority(s,'gang')&&skill(p,'theft').tier>=3)add('gang_end','接下艮岳石工的差事');}
 if(cityRep(s)>=70&&c.titles.length&&id==='inn')add('fame_end','接过京中送来的请帖');
 return [...qingheJourneyOptions(s,id),...chapterSpeechOptions(s,id),...list.filter(a=>!REPLACED_SPEECH.has(a.id.slice(3))&&!a.id.startsWith('ch_learn_')&&a.id!=='ch_healer_watch')].filter(a=>{
  if(s.facts.demoComplete&&a.id.endsWith('_end'))return false;
  if(a.id==='ch_help_mother')return s.facts.teaFeeKnown;
  if(a.id==='ch_royal_vouch')return s.facts.royalOfferKnown&&!s.facts.royalEscort;
  if(a.id==='ch_royal_task')return done(s,'royal_task_offer');
  if(a.id==='ch_ledger_get')return done(s,'ledger_offer');
  if(id==='qinghe'&&(s.qingheJourney||s.facts.qingheHesitationKnown)&&['ch_list_show','ch_qinghe_consent'].includes(a.id))return false;
  if(a.id==='ch_qinghe_consent')return s.facts.qingheAlternativeDiscussed&&!s.facts.qingheConsent;
  if(a.id==='ch_shen_space')return done(s,'shen_concern')||done(s,'su_wish');
  if(a.id==='ch_poison_buy')return s.facts.poisonOfferKnown;
  if(['ch_entry_truth','ch_entry_lie'].includes(a.id))return s.facts.entryRoute!=='royal';
  return true;
 });
}
// Why this person cannot take up a matter just now. The menu's preview and the settling both ask this,
// so an entry that would be refused is shown as refused, with the reason, instead of doing nothing when pressed.
export function chapterTalkBlock(s,id){const p=s.player,n=s.people[id];return p.hp<=0||!n||n.hp<=0||n.restraint||n.muteUntil>(s.npcClock||0)||['sleep','doze'].includes(n.life?.activity)||n.stunnedUntil>(s.npcClock||0)||['fight','flee'].includes(n.awareness?.state)||n.awareness?.caseOpen?'先处理眼前的冲突。':'';}
export function chapterPreview(sim,id,a,eco){if(isQingheJourneyAction(a.id))return qingheJourneyPreview(sim,id,a,eco);if(a.id.startsWith('ch_gy_'))return genyuePreview(sim,id,a,eco);if(ledgerRoute(id)&&['ch_ledger_offer','ch_ledger_commit','ch_ledger_decline','ch_ledger_claim','ch_ledger_depart'].includes(a.id))return ledgerPreview(sim,id,a,eco);if(isConvoyAction(a.id))return convoyPreview(sim,a);const p=sim.s.player;let reason='';if(a.id==='ch_court_join'&&sim.s.wanted>0)reason='案子尚未了结';if(a.id==='ch_yan_arrest'&&!sim.s.facts.publicWarrant)reason='先去城外通缉榜核对拘传榜文';if(['ch_court_join','ch_gang_join'].includes(a.id))reason=factionJoinBlock(sim.s,a.id.split('_')[1])||reason;if(['ch_court_end','ch_gang_end'].includes(a.id)&&!factionAuthority(sim.s,a.id.split('_')[1]))reason='当前门内资格不能承接这项差事。';reason=chapterTalkBlock(sim.s,id)||reason;return {score:p.stats[a.stat]||0,chance:a.stat?Math.max(5,Math.min(95,Math.round((p.stats[a.stat]||0)+40-a.difficulty))):100,certain:!a.stat,blocked:p.money<(a.cost||0)||!!reason,reason:reason||(a.cost?`需 ${a.cost} 文`:'')};}
export function chapterResolve(sim,eco,id,action,{submittedItem=null,deferSpeech=false,confirmedText=null}={}){
 if(isQingheJourneyAction(action))return resolveQingheJourney(sim,eco,id,action,{deferSpeech,confirmedText});
 if(action.startsWith('ch_gy_'))return resolveGenyue(sim,eco,id,action);
 if(['ch_ledger_commit','ch_return_ring','ch_list_show'].includes(action)&&!submittedItem)return {needsItem:true,task:({ch_ledger_commit:'ledger',ch_return_ring:'ring',ch_list_show:'manifest'})[action]};
 if(['ch_ledger_commit','ch_return_ring','ch_list_show'].includes(action)){
  const item=eco.items('player').find(i=>i.id===submittedItem&&i.hp>0);
  if(!item||(action==='ch_ledger_commit'?item.type!=='ledger':action==='ch_return_ring'?item.type!=='ring':item.storyId!=='convoy-list'))return {error:'选中的物品与这件事不符，东西仍由你保管。'};
 }
 if(ledgerRoute(id)&&['ch_ledger_offer','ch_ledger_commit','ch_ledger_decline','ch_ledger_claim','ch_ledger_depart'].includes(action))return resolveLedger(sim,eco,id,action,{deferSpeech,confirmedText});
 if(id==='porter'&&isConvoyAction(action))return resolveConvoyTalk(sim,eco,action);
 const s=sim.s,c=chapter(s),p=s.player,a=chapterOptions(sim,id).find(a=>a.id===action);const n=s.people[id],busy=chapterTalkBlock(s,id);if(busy)return {error:busy};if(!a)return {error:'这件事已经说定，或条件还未齐。'};const check=chapterPreview(sim,id,a);if(check.blocked)return {error:check.reason||'盘缠不足。'};const key=action.slice(3),roll=a.stat?1+Math.floor(sim.rng()*100):null,success=roll===null||roll<=check.chance;
 if(SPEECH_KEYS.has(key)){
  const beat=chapterSpeech(s,id,key);if(!beat||confirmedText!==null&&confirmedText!==beat.text)return {error:'眼前情形变了，再问一问。'};
  const r={type:'npc',presentation:'dialogue',day:s.day,eventId:'chapter:'+key,actionId:action,label:a.label,kind:'listen',motion:'talk',roll:null,check,success:true,text:beat.text,changes:[],dialogue:[{id,text:beat.text,verbatim:beat.text.length<=42}],authored:true,follow:beat.follow,pendingSpeech:deferSpeech,submittedItem};
  if(deferSpeech)return r;
  Object.assign(s.facts,beat.facts);if(beat.name){s.facts.knownNames??={};s.facts.knownNames[beat.name[0]]=beat.name[1];}
  c.done[key]=true;meet(sim,id);if(key==='fu_waiting')recordOpeningLead(s,'fu_waiting','符祥当面所言');syncOpeningLeads(s);syncGenyue(s);s.history.push(r);addCausalDeed(s,{key:'chapter:'+key,title:a.label,text:beat.text,target:id});sim.emit('result',r);sim.save();return r;
 }
 if(key==='return_ring'){const item=eco.items('player').find(i=>i.id===submittedItem);return {needsOrigin:true,itemKey:item.id,line:'这是我的银戒。你从哪儿找到的？'};}
 if(key==='poison_buy'&&!eco.items('npc:scribe').some(i=>i.type==='poison'&&i.hp>0))return {error:'柜里的药已卖完。'};meet(sim,id);if(a.cost){const payee=key==='help_mother'?'fu':id,q=eco.positions[id]||PEOPLE.find(n=>n.id===id);if(!placePayment(sim,eco,{payer:'player',payee,amount:a.cost,x:q.x+.4,z:q.z+.4,y:.1,stand:q,reason:a.label,...(key==='help_mother'?{chapterFee:true}:{} )}))return {error:'盘缠不足。'};}let text='',changes=[],follow=[];
 switch(key){
 case 'ledger_get':{const ledger=eco.items('npc:prisoner').find(i=>i.type==='ledger'&&i.hp>0);if(!ledger)return {error:'副账已不在他手里。'};eco.transfer(ledger,'player','entrusted');text='原账交给你了，务必拿稳。我说的是真是假，不要只听我一句话，要拿着账去一笔一笔核对。';break;}
 case 'nest_welcome':text='靠墙那块草席还是干的，你要歇脚，就在那里睡一晚。先养足精神，天亮再去找门路。';break;
 case 'poison_buy':{const stock=eco.items('npc:scribe').find(i=>i.type==='poison'&&i.hp>0);if(!stock)return {error:'柜里的药已卖完。'};eco.transfer(stock,'player','bought');text='药给你了，收好。怎么用是你的事，真出了岔子，可别说我没提醒过你。';break;}
 case 'help_mother':{s.facts.helpedMother=true;sim.relation('tea_host',8);const q=eco.positions.traveler,prince=s.people.traveler;if(q&&prince?.hp>0&&!prince.restraint&&!(prince.stunnedUntil>(s.npcClock||0))&&!['sleep','doze'].includes(prince.life?.activity)&&Math.hypot(q.x-p.x,q.z-p.z)<9&&visibleBetween(q,p,eco.obstacles||[],eco.s.objects)){s.facts.royalSawKindness=true;s.facts.royalKindnessSource='fee';}text='你肯替我垫上这两文，真是帮了忙。等他们把差费收去，我也能安下心来做生意。';changes.push('宋茶娘好感 +8');break;}
 case 'qinghe_consent':s.facts.qingheConsent=true;s.facts.qingheConsidering=false;s.facts.qingheAgreement={purpose:'代赴艮岳察看',voluntary:true,day:s.day};text='那就说定了，你只替我去看看艮岳是什么情形，不能替我应下什么亲事。我同意的是这一趟察看，别的事还得由我自己决定。';follow=['qinghe_end'];break;
 case 'royal_vouch':{const escort=beginRoyalEscort(sim,eco);if(escort.error)return escort;text='那就随我去关前吧，我当着守卫的面替你说明。你跟在我身边，到了再一同说话。';break;}
 case 'entry_truth':c.done.entry_lie=true;s.facts.princeHonest=true;sim.relation(id,8);text=`${({river:'水冷，倒难为你了。',breach:'砍开的门，往后还得有人修。',royal:'借过我的名字，今后就拿自己的作为来还。'}[s.facts.entryRoute]||'能从关外走到这里，想来也不容易。你肯把经过说实在，我就愿意听。')}我正想在临溪找个人，替我留意那些不容易摆到明面上的事。`;follow=['royal_task_offer'];break;
 case 'entry_lie':c.done.entry_truth=true;sim.relation(id,success?1:-8);text=success?'如此说来，关前倒还顺利。只是凭据能替你说明来历，往后做过什么事，仍得由你自己担着。':'我在关外坐了那么久，也看见了些事。你这番话，和我见到的可对不上。还是想清楚了再说吧。';follow=['royal_task_offer'];break;
 case 'royal_task':s.genyue??={offers:{},passes:{}};s.genyue.focus='ledger';s.trackedQuest='genyue';s.facts.princeCommission=true;if(!s.facts.courtTokenIssued){const token=eco.create('闲舟引荐玉符','personal','player',{discovered:true,referral:'court',material:'stone',ownerId:'traveler'});s.facts.courtTokenIssued=token.id;changes.push('获得：闲舟引荐玉符');}s.quests.royal={id:'royal',title:'临溪的眼睛',status:'active',source:'赵闲舟',objective:'取得花石纲原账，交给锦衣客或顾钦差',note:'献账可获六扇门声望与赴艮岳荐书；原账若交另一方，此事便另有去向。'};text='这枚玉符你收好，查账时可以拿给顾钦差看，请他协助。等你找到原账，再来同我商量赴京的事。';break;
 case 'shen_space':s.facts.shenYieldRequested=true;sim.relation('su',8);sim.relation('shen',-2);text='好，我往旁边让一让。她的话我已经听见了，再拦着她，也说不出个结果。';break;
 case 'yan_secret':text='是我。偷来的钱袋还没花。你要送我见官，还是让我把东西还回去？';follow=['yan_release','yan_arrest'];break;
 case 'yan_release':c.done.yan_arrest=true;s.facts.yanReleased=true;sim.relation(id,10);text='这一回是你放了我，算我欠你的。你若想学袖口上的手艺，我可以教；要同赤砂堂说话，我也能替你递个信。';follow=['learn_theft'];break;
 case 'yan_arrest':c.done.yan_release=true;s.facts.courtReferral=true;careerResolve(sim,eco,id,'court_arrest');text='我跟你走。这笔账，也记着你。到了大堂，当面说清楚。';break;
 case 'convoy_dispute':text=id==='qing'?'花石能进京，脚夫的工钱却不能少。这批名册在符祥的鸟笼底下。':'我们押货，他们护路，都是吃这口饭。应奉局一文不出，倒叫我们两边打。';break;
 case 'convoy_peace':eco.create('脚夫工钱收据','document','player',{ownerId:id,discovered:true,material:'paper'});s.facts.convoyPeace=true;sim.relation('qing',6);sim.relation('chi',6);text='工钱先垫上，收据两边各留一份，往后也有凭证。花石要送进京，抬石头的人也得拿到应得的工钱。';break;
 case 'court_join':registerCourt(s);s.facts.career='court';recordFactionEnrollment(s,'court');s.factions??={};s.factions['六扇门']=Math.max(s.factions['六扇门']||0,20);eco.create('六扇门腰牌','personal','player',{discovered:true,badge:'court',material:'metal'});text='腰牌收好。当街拿人，得有案由；拿了人，得带回交差。';break;
 case 'gang_join':s.facts.career='gang';recordFactionEnrollment(s,'gang');s.factions??={};s.factions['赤砂帮']=Math.max(s.factions['赤砂帮']||0,20);eco.create('赤砂帮红头巾','clothing','player',{discovered:true,badge:'gang'});text='你肯替人留活路，堂里便给你留位置。入帮不是借人多欺生。';break;
 default:if(key.endsWith('_end')){s.facts.genyueRoute=key.replace('_end','');s.facts.demoComplete=true;const endings={royal:['闲舟的眼睛','赵闲舟的船停在汴水边。副账已有人接手，他留给你一间临水的小屋：从今日起，京中的消息要由你自己去听。'],court:['持牌入京','顾钦差在荐书上落印。你以查清副账的功劳调赴艮岳，铁尺和腰牌一同交到手中；园中每一桩差事，都要留下案由。'],gang:['石工入苑','梅掌舵把你的名字添进石工名册。运石船驶入艮岳，袖中的手艺能替帮里开路，也可能给自己招来新债。'],qinghe:['借名赴约','青禾亲手改妥衣领，把约好的口音又教一遍。她留在临溪，你持她应允的身份北上；到了园外，先寄封报平安的信。'],fame:['名动汴梁','京中的请帖点了你的名。关外与城中的人情终于传到了汴梁，去赴哪一席，由你自己选。']};const ending=endings[s.facts.genyueRoute];s.chapter.ending={title:ending[0],text:ending[1]};text=ending[1];s.quests.genyue={id:'genyue',title:'赴艮岳',status:'complete',source:name(id),objective:'已取得入京门路',note:'这一卷到此。江湖录保留你的经历与名号。'};}break;
 }
 const substantial=['help_mother','shen_space','yan_release','convoy_peace','healer_watch'].includes(key);
 grant(sim,key,{rep:substantial?10:0,id});
 if(a.cost)changes.push(`盘缠 −${a.cost}`);if(substantial)changes.push((believedIdentity(s,id)==='player'?'当地':identityName(believedIdentity(s,id))+'的')+'声望 +10');
 const r={type:'npc',presentation:'dialogue',day:s.day,eventId:'chapter:'+key,actionId:action,label:a.label,kind:'listen',motion:'talk',roll,check,success,text,changes,dialogue:[{id,text}],authored:true,follow,causalRecorded:true};
 s.history.push(r);addCausalDeed(s,{key:'chapter:'+key,title:a.label,text,target:id,subject:believedIdentity(s,id),valence:substantial?'kind':'neutral'});sim.emit('result',r);if(s.facts.demoComplete)sim.emit('chapterComplete',{route:s.facts.genyueRoute});sim.save();return r;
}
export function chapterFollowups(sim,id,r){
 if(id==='qinghe'&&r?.actionId==='ch_qinghe_wish')return qingheChoices(sim.s);
 if(id==='fu'&&r?.actionId==='ch_fu_waiting'){const choice=qingheSearchChoice(sim.s);return choice?[choice,{id:'ch_end',mode:'endTalk',kind:'listen',label:'告辞'}]:[];}
 if(!r?.follow?.length)return [];
 const options=chapterOptions(sim,id),next=r.follow.flatMap(key=>key==='clothes_buy'&&!sim.s.player.inventory.includes('旧差役服')?[{id:'buy_clothes',mode:'buyClothes',label:'买下这身衣裳',kind:'support',cost:6}]:options.filter(a=>a.id==='ch_'+key)).slice(0,isConvoyAction(r.actionId)?3:2);
 if(next.length===3)return next;
 const declines={ch_tea_fee:['盘缠还得留着，帮不上。','赶路也要盘缠，我知道。'],ch_clothes_price:['先不买。','也好。'],ch_poison_price:['这包先留着。','药还在柜里。'],ch_royal_offer:['此事不劳烦你。','也好。'],ch_royal_terms:['我再想想。','想好了再来。'],ch_royal_task_offer:['另寻门路。','不勉强。'],ch_fu_ledger_offer:['另寻门路。','想定了再来。'],ch_genyue_court_offer:['先告辞。',null],ch_genyue_gang_offer:['暂不买。','票还留着。'],ch_ledger_offer:['先由你留着。','想定了，再来。'],ch_ledger_commit:['暂留临溪。','凭书收好。']};
 const [label,reply]=declines[r.actionId]||['先告辞',null];
 return [...next,{id:'ch_end',mode:'endTalk',kind:'listen',label,reply}];
}
export function tickChapter(sim,dt){const s=sim.s;if(s.chapterVersion!==2)return;const c=chapter(s);c.elapsed=(c.elapsed||0)+dt;if(!c.opened&&c.elapsed>3){c.opened=true;sim.emit('speech',[{id:'gate_guard',text:'今日过关都要查验，路引先备好，到了跟前再拿出来。'},{id:'fu',text:'名册上的人和物，一样不能少。'}]);}if(s.facts.enteredCity&&!s.facts.convoyRumor){s.facts.convoyRumor=true;s.facts.princeDeparture??={stage:0};s.quests.convoy={id:'convoy',title:'黄旗下的人',status:'active',source:'城门所见',objective:'留意城内纲队的去向',note:'花石纲正在临溪停留，人货的去向还需当面打听。'};}}
