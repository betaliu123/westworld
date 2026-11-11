import {cityRep,earnReputation} from './reputation.js';
import {meet} from './factions.js';
import {visibleBetween} from './npc-awareness.js';
import {registerCourt} from './court-street.js';
import {careerResolve} from './faction-career.js';
import {placePayment} from './cash-transfers.js';
import {PEOPLE} from './data.js';
import {skill,practice} from './skills.js';
import {BEGGAR_NEST} from './locations.js';
import {admitRoute} from './gate-scene.js';
import {addCausalDeed,settleMeaning} from './item-meaning.js';
const opt=(id,label,extra={})=>({id:'ch_'+id,label,mode:'contact',kind:'listen',...extra});
const name=id=>PEOPLE.find(p=>p.id===id)?.name||id;
const done=(s,k)=>!!s.chapter?.done?.[k];
function chapter(s){return s.chapter??={done:{},fame:{gate:0,town:0},titles:[],heard:{}};}
function grant(sim,key,{rep=0,id,relation=0}={}){const c=chapter(sim.s);if(c.done[key])return false;c.done[key]=true;if(id)sim.relation(id,relation);earnReputation(sim,{amount:rep,reason:'街坊记下了你做的事。',key:'chapter:'+key});if(cityRep(sim.s)>=25&&!c.titles.includes('临溪义客'))c.titles.push('临溪义客');return true;}
function has(s,type){return s.ecosystem?.items.some(i=>i.location==='player'&&i.hp>0&&(i.type===type||i.storyId===type));}
export function restingPlace(s){const p=s.player,near=(x,z)=>Math.hypot(p.x-x,p.z-z)<4;return near(BEGGAR_NEST.x,BEGGAR_NEST.z)?{id:'nest',name:'乞丐窝',cost:0}:near(-10,-7)?{id:'inn',name:'听雨楼',cost:2}:s.facts.career==='court'&&near(10,-23)?{id:'court',name:'值房',cost:0}:s.facts.career==='gang'&&near(23,-5)?{id:'gang',name:'赤砂堂',cost:0}:null;}
export function recordRest(sim,place){chapter(sim.s);if(place.id==='nest')sim.s.facts.nestSlept=true;sim.s.player.money-=place.cost;addCausalDeed(sim.s,{title:'落脚'+place.name,text:'合衣歇息，等候下个白天。',target:place.id==='nest'?'beggar':'inn'});}
export function restTalk(s,nearby){const c=chapter(s),lines=[];const available=id=>nearby.includes(id)&&s.people[id]?.hp>0;
 if(available('beggar'))lines.push({id:'beggar',text:s.facts.enteredCity?'进过城的人，鞋底都多一层灰。今夜还是这块草席？':s.facts.gatePassTaken?'腰里多了东西，脚步倒轻了。睡觉也别把来路忘了。':'草席靠墙干些。天亮听见换岗的梆子，再起。'});
 if(available('tea_host'))lines.push({id:'tea_host',text:done(s,'help_mother')?'青禾还念着你替我们解围。她的主意，我也该听听。':'今晚水烧得慢，客官将就一口。'});
 if(available('inn'))lines.push({id:'inn',text:s.facts.ledgerDelivered?'今儿有人来问你的住处，我没多嘴。楼上有热水。':cityRep(s)>=25?'街坊说起你了。好名声难得，别让人借去做坏事。':'灯给你留着。夜里楼梯响，别当成谁来找你。'});
 return lines.slice(0,2);
}
export function nextChapterDay(sim){const s=sim.s;for(const f of s.storyFollowups||[]){if(f.delivered||f.due>s.day)continue;f.delivered=true;sim.relation(f.id,f.delta||0);s.mail.push({id:'follow-'+f.key,sender:f.id,day:s.day,text:f.line,read:false});addCausalDeed(s,{key:'follow-'+f.key,title:name(f.id)+'的回话',text:f.line,target:f.id,cause:f.cause,valence:f.delta<0?'harm':'kind'});}sim.emit('day',s.day);}
export function chapterOptions(sim,id){const s=sim.s,c=chapter(s),p=s.player,n=s.people[id],list=[];const add=(key,label,extra)=>{if(!done(s,key))list.push(opt(key,label,extra));};
 if(id==='prisoner'&&s.facts.enteredCity){add('ledger_story','问他为何留着那本账');if(done(s,'ledger_story')&&!s.facts.ledgerDelivered&&s.wanted===0)add('ledger_get','答应把副账带给查案的人');}
 if(id==='fu'){add('fu_manifest','名册上为何有宋家姑娘？');}
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
  if(done(s,'qinghe_wish')&&has(s,'convoy-list'))add('list_show','给她看押运名册');
  if(done(s,'list_show'))add('qinghe_consent','商量替她赴艮岳，留退路给她');
 }
 if(id==='qinghe'&&s.facts.qingheConsent&&s.facts.enteredCity)add('qinghe_end','以青禾同意的身份随车赴艮岳');
 if(id==='traveler'){
  if(!s.facts.enteredCity){if(s.facts.royalSawKindness&&!s.facts.royalSawHarm&&(n.relation>=0))add('royal_vouch','劳烦为我说一句公道话');}
  else {add('entry_story','说起这次入城的经过');if(done(s,'entry_story')){add('entry_truth','如实告诉他自己的门路');add('entry_lie','只说凭路引堂堂正正进来',{stat:'charm',difficulty:55});}if(done(s,'entry_truth')||done(s,'entry_lie'))add('royal_task','你在临溪，想找什么样的人？');
   if(done(s,'royal_task')&&cityRep(s)>=25&&s.facts.ledgerDelivered)add('royal_end','携副账的核验结果赴约');}
 }
 if(id==='porter'){add('convoy_work','花石纲可还缺抬箱的人？');if(done(s,'convoy_work')&&!s.facts.enteredCity)add('convoy_enter','抹泥换短褂，随这班役夫入城');}
 if(id==='shen'&&s.facts.enteredCity){if(has(s,'ring')||p.inventory.includes('ring'))list.push(opt('return_ring','把银戒还给沈砚'));add('shen_space','苏姑娘已说了不愿，先把桥让开。');}
 if(id==='su'&&s.facts.enteredCity){add('su_wish','问她此后想往哪里去');if(done(s,'su_wish')&&done(s,'shen_space')&&skill(p,'music').tier<2)add('learn_music','请教这支曲子的指法');}
 if(id==='thief'&&(s.facts.publicWarrant||n.probedTier>=2)){add('yan_secret','通缉榜上的人，是你？');if(done(s,'yan_secret')){add('yan_release','放他走，问一条活路');add('yan_arrest','让他随你去官府交代');}if(done(s,'yan_release')&&skill(p,'theft').tier<3)add('learn_theft','请教袖中取物的手法');}

 if(['qing','chi'].includes(id)&&s.facts.enteredCity){add('convoy_dispute','问起两帮争的那批花石');if(done(s,'convoy_dispute')&&!done(s,'convoy_peace'))add('convoy_peace','先给脚夫结工钱，两帮各留凭据',{cost:4});if(done(s,'convoy_peace')&&skill(p,'combat').tier<3)add('learn_combat_advanced','请教押运时应敌的刀法');}
 if(id==='inspector'&&s.facts.enteredCity){if(s.people.thief.custodyDelivered||s.facts.courtTokenPresented){if(!s.facts.career)add('court_join','凭引荐或交案功劳，申请当差');}if(s.facts.career==='court'&&s.facts.ledgerDelivered)add('court_end','以副账案的功劳应征艮岳守卫');}
 if(id==='gang_boss'&&s.facts.enteredCity){if(!s.facts.career&&(done(s,'convoy_peace')||done(s,'yan_release')))add('gang_join','请梅掌舵引入赤砂帮');if(s.facts.career==='gang'&&skill(p,'theft').tier>=3)add('gang_end','接下艮岳石工的差事');}
 if(cityRep(s)>=70&&c.titles.length&&id==='inn')add('fame_end','接过京中送来的请帖');
 return list.filter(a=>!a.id.startsWith('ch_learn_')&&a.id!=='ch_healer_watch');
}
export function chapterPreview(sim,id,a){const p=sim.s.player;let reason='';if(a.id==='ch_convoy_enter'&&!(sim.s.time>=10&&sim.s.time<30||sim.s.time>=90&&sim.s.time<110))reason='辰时或申时才点役夫名册';if(a.id==='ch_court_join'&&sim.s.wanted>0)reason='案子尚未了结';if(a.id==='ch_yan_arrest'&&!sim.s.facts.publicWarrant)reason='先去城外通缉榜核对拘传榜文';if(['ch_court_join','ch_gang_join'].includes(a.id)&&sim.s.facts.career)reason='已有归属，不能同时入另一方';return {score:p.stats[a.stat]||0,chance:a.stat?Math.max(5,Math.min(95,Math.round((p.stats[a.stat]||0)+40-a.difficulty))):100,certain:!a.stat,blocked:p.money<(a.cost||0)||!!reason,reason:reason||(a.cost?`需 ${a.cost} 文`:'')};}
export function chapterResolve(sim,eco,id,action){
 const s=sim.s,c=chapter(s),p=s.player,a=chapterOptions(sim,id).find(a=>a.id===action);const n=s.people[id];if(p.hp<=0||!n||n.hp<=0||n.stunnedUntil>(s.npcClock||0)||['fight','flee'].includes(n.awareness?.state)||n.awareness?.caseOpen)return {error:'先处理眼前的冲突。'};if(!a)return {error:'这件事已经说定，或条件还未齐。'};const check=chapterPreview(sim,id,a);if(check.blocked)return {error:check.reason||'盘缠不足。'};const key=action.slice(3),roll=a.stat?1+Math.floor(sim.rng()*100):null,success=roll===null||roll<=check.chance;
 if(key==='return_ring'){const item=eco.items('player').find(i=>i.type==='ring');if(!item)return {error:'银戒不在行囊中。'};return {needsOrigin:true,itemKey:item.id,line:'这是我的银戒。你从哪儿找到的？'};}
 if(key==='poison_buy'&&!eco.items('npc:scribe').some(i=>i.type==='poison'&&i.hp>0))return {error:'柜里的药已卖完。'};meet(sim,id);if(a.cost){const payee=key==='help_mother'?'fu':id,q=eco.positions[id]||PEOPLE.find(n=>n.id===id);if(!placePayment(sim,eco,{payer:'player',payee,amount:a.cost,x:q.x+.4,z:q.z+.4,y:.1,stand:q,reason:a.label}))return {error:'盘缠不足。'};}let text='',changes=[],follow=[];
 switch(key){
 case 'fu_manifest':text='应奉局的名册，自有应奉局定。花石、雀鸟、乐工，都得按时送到。';break;
 case 'ledger_story':s.facts.taxLedgerLead=true;text='账面两套数，亏空写进花石纲。副账在我身上，没有它，连我也活不到今日。';follow=['ledger_get'];break;
 case 'ledger_get':{const ledger=eco.items('npc:prisoner').find(i=>i.type==='ledger');if(!ledger)return {error:'副账已不在他手里。'};eco.transfer(ledger,'player','entrusted');text='交给锦衣客或顾钦差。先别惊动符祥，查清了再还我一个清白。';break;}
 case 'nest_welcome':text='靠墙那块草席还干着。先睡稳了，天亮再找门路。';break;
 case 'gate_rules':s.facts.entryRulesKnown=true;text='应奉局的花石纲要过关。路引对姓名，认得本人的更不能冒名。没凭据，等役夫点名，或请人作保。';break;
 case 'merchant_name':s.facts.knownNames??={};s.facts.knownNames.gate_merchant='赵成';text='赵成，东溪人。韩校尉认得我，只是这一回连熟人也查。';break;
 case 'runner_name':s.facts.runnerNameKnown=true;text='陈小乙。领里还缝着呢，原来给驿站跑腿的。';break;
 case 'scribe_secret':s.facts.scribeIdentity=true;text='眼睛倒尖。无相门不替人担罪。你认得针囊，我可以教你改扮；柜里迷毒散，五文。药能混进茶食，谁吃下谁遭殃，别连累无辜。';follow=['learn_disguise','poison_buy'];break;
 case 'poison_buy':{const stock=eco.items('npc:scribe').find(i=>i.type==='poison'&&i.hp>0);if(!stock)return {error:'柜里的药已卖完。'};eco.transfer(stock,'player','bought');text='这一包给你。要用在哪里，你自己担着。';break;}
 case 'help_mother':{s.facts.convoyFeePaid=true;s.facts.helpedMother=true;sim.relation('tea_host',8);s.people.qinghe.relation+=4;const q=eco.positions.traveler;if(q&&Math.hypot(q.x-p.x,q.z-p.z)<9&&visibleBetween(q,p,eco.obstacles||[],eco.s.objects)){s.facts.royalSawKindness=true;}text='两文差费总算交清了。劳你替我们挡这一回，青禾的去留，我们还得自己想明白。';changes.push('宋茶娘好感 +8','青禾好感 +4');break;}
 case 'qinghe_wish':text='我娘怕我走，可我想进京，看看那些曲子究竟在哪里唱。别替我答应，也别替我拒绝。';break;
 case 'list_show':s.facts.convoyNamesKnown=true;text='上头有我的名字。原来他们早写好了……我得自己想明白。';break;
 case 'qinghe_consent':s.facts.qingheConsent=true;text='你愿意替我去，我答应。但不是卖给谁。我教你我的口音，到了京城，替我看看那座园子。';follow=['qinghe_end'];break;
 case 'royal_vouch':admitRoute(sim,'royal');s.facts.princeDebt=true;text='方才你替那母女说话，我看见了。随我进关；这份担保，来日要你还在人情上。';break;
 case 'entry_story':text='你竟真进来了。说说，是哪条门路？';follow=['entry_truth','entry_lie'];break;
 case 'entry_truth':c.done.entry_lie=true;s.facts.princeHonest=true;sim.relation(id,8);text=`${({river:'水冷，倒难为你了。',breach:'砍开的门，往后还得有人修。',royal:'借过我的名字，今后就拿自己的作为来还。'}[s.facts.entryRoute]||'路子曲折，你肯说实话，我听着。')}我想在临溪留下一个看得见实情的人。`;follow=['royal_task'];break;
 case 'entry_lie':c.done.entry_truth=true;sim.relation(id,success?1:-8);text=success?'好。凭据保得住一时，做过的事保不保得住？':'我在关外坐着，没白坐。这话留着骗别人。';follow=['royal_task'];break;
 case 'royal_task':s.facts.princeCommission=true;if(!s.facts.courtTokenIssued){const token=eco.create('闲舟引荐玉符','personal','player',{discovered:true,referral:'court',material:'stone',ownerId:'traveler'});s.facts.courtTokenIssued=token.id;changes.push('获得：闲舟引荐玉符');}s.quests.royal={id:'royal',title:'临溪的眼睛',status:'active',source:'赵闲舟',objective:'在城中立名（声望 25），取得副账并交给锦衣客',note:'当差、扶危、替街坊办实事都能立名。'};text='我不缺唯命是从的人。你在镇上站稳脚，查清副账。若愿当差，拿这枚玉符给顾钦差看；若有别的门路，也不必勉强。做到，我替你留一个赴艮岳的名额。';break;
 case 'convoy_work':s.facts.convoySchedule=true;text='辰时、申时点人。抬箱的穿短褂，手脸沾着泥。看见黄旗过来，就跟紧，别碰鸟笼。';break;
 case 'convoy_enter':const coat=eco.create('役夫短褂','clothing','player',{discovered:true,ownerId:'porter'});p.wornOutfit=coat.id;p.disguise='laborer';s.facts.muddy=true;admitRoute(sim,'convoy');text='你换上借来的短褂，抹了泥。点名的小吏只数担子，黄旗下多过了一个人。';break;
 case 'shen_space':sim.relation('su',8);sim.relation('shen',-2);text='……我把桥让开。她愿不愿，是她的事。戒指的账，我自己还。';break;
 case 'su_wish':text='我想唱自己的曲子。若有一天去京城，也是我自己走去。';break;
 case 'yan_secret':text='是我。偷来的钱袋还没花。你要送我见官，还是让我把东西还回去？';follow=['yan_release','yan_arrest'];break;
 case 'yan_release':c.done.yan_arrest=true;s.facts.yanReleased=true;sim.relation(id,10);text='这回算欠你的。袖口的活我能教；至于赤砂堂，我替你递个话。';follow=['learn_theft'];break;
 case 'yan_arrest':c.done.yan_release=true;s.facts.courtReferral=true;careerResolve(sim,eco,id,'court_arrest');text='我跟你走。这笔账，也记着你。到了大堂，当面说清楚。';break;
 case 'convoy_dispute':text=id==='qing'?'花石能进京，脚夫的工钱却不能少。这批名册在符祥的鸟笼底下。':'我们押货，他们护路，都是吃这口饭。应奉局一文不出，倒叫我们两边打。';break;
 case 'convoy_peace':eco.create('脚夫工钱收据','document','player',{ownerId:id,discovered:true,material:'paper'});s.facts.convoyPeace=true;sim.relation('qing',6);sim.relation('chi',6);text='工钱先垫上，收据两边各留一份。花石送进京，也得有人记得抬石头的人。';break;
 case 'court_join':registerCourt(s);s.facts.career='court';s.factions??={};s.factions['六扇门']=20;eco.create('六扇门腰牌','personal','player',{discovered:true,badge:'court',material:'metal'});text='腰牌收好。当街拿人，得有案由；拿了人，得带回交差。';break;
 case 'gang_join':s.facts.career='gang';s.factions??={};s.factions['赤砂帮']=20;eco.create('赤砂帮红头巾','clothing','player',{discovered:true});text='你肯替人留活路，堂里便给你留位置。入帮不是借人多欺生。';break;
 default:if(key.endsWith('_end')){s.facts.genyueRoute=key.replace('_end','');s.facts.demoComplete=true;const endings={royal:['闲舟的眼睛','赵闲舟的船停在汴水边。副账已有人接手，他留给你一间临水的小屋：从今日起，京中的消息要由你自己去听。'],court:['持牌入京','顾钦差在荐书上落印。你以查清副账的功劳调赴艮岳，铁尺和腰牌一同交到手中；园中每一桩差事，都要留下案由。'],gang:['石工入苑','梅掌舵把你的名字添进石工名册。运石船驶入艮岳，袖中的手艺能替帮里开路，也可能给自己招来新债。'],qinghe:['借名赴约','青禾亲手改妥衣领，把约好的口音又教一遍。她留在临溪，你持她应允的身份北上；到了园外，先寄封报平安的信。'],fame:['名动汴梁','京中的请帖点了你的名。关外与城中的人情终于传到了汴梁，去赴哪一席，由你自己选。']};const ending=endings[s.facts.genyueRoute];s.chapter.ending={title:ending[0],text:ending[1]};text=ending[1];s.quests.genyue={id:'genyue',title:'赴艮岳',status:'complete',source:name(id),objective:'已取得入京门路',note:'这一卷到此。江湖录保留你的经历与名号。'};}break;
 }
 const substantial=['help_mother','shen_space','yan_release','convoy_peace','healer_watch'].includes(key);
 grant(sim,key,{rep:substantial?10:0});
 if(a.cost)changes.push(`盘缠 −${a.cost}`);if(substantial)changes.push('当地声望 +10');
 const r={type:'npc',presentation:'dialogue',day:s.day,eventId:'chapter:'+key,actionId:action,label:a.label,kind:'listen',motion:'talk',roll,check,success,text,changes,dialogue:[{id,text}],authored:true,follow,causalRecorded:true};
 s.history.push(r);addCausalDeed(s,{key:'chapter:'+key,title:a.label,text,target:id,valence:substantial?'kind':'neutral'});sim.emit('result',r);if(s.facts.demoComplete)sim.emit('chapterComplete',{route:s.facts.genyueRoute});sim.save();return r;
}
export function chapterFollowups(sim,id,r){if(!r?.follow?.length)return [];return [...chapterOptions(sim,id).filter(a=>r.follow.includes(a.id.slice(3))).slice(0,2),{id:'ch_end',mode:'endTalk',kind:'listen',label:'先告辞'}];}
export function tickChapter(sim,dt){const s=sim.s;if(s.chapterVersion!==2)return;const c=chapter(s);c.elapsed=(c.elapsed||0)+dt;if(!c.opened&&c.elapsed>3){c.opened=true;sim.emit('speech',[{id:'gate_guard',text:'黄旗到了，花石纲先过。其余人等，留在关外！'},{id:'fu',text:'名册上的人和物，一样不能少。'}]);}if(s.facts.enteredCity&&!s.facts.convoyRumor){s.facts.convoyRumor=true;s.facts.princeDeparture??={stage:0};s.quests.convoy={id:'convoy',title:'黄旗下的人',status:'active',source:'城门所见',objective:'到城里问林青舟或段赤川，查清花石纲的名册',note:'符祥随身带着押运名册；青禾想知道自己的去向。'};}}
