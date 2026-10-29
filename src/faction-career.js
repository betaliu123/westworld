import {earnGrowth} from './growth.js';
export const CAREERS={court:{name:'六扇门',role:'捕快',leader:'inspector'},gang:{name:'赤砂帮',role:'外堂弟子',leader:'gang_boss'}};
const opt=(id,label,stat=null,difficulty=0)=>({id,label,stat,difficulty,mode:'contact',kind:'listen'});
function quest(s,id,title,objective,source){s.quests??={};s.quests[id]??={id,title,objective,source,status:'active',day:s.day};s.trackedQuest=id;}
export function careerOptions(sim,id){const s=sim.s,c=s.facts.career;return [
 ...(id==='traveler'&&!s.facts.courtTokenIssued?[opt('court_referral','请他引荐一条查案的门路')]:[]),
 ...(id==='old_constable'&&!s.facts.constableReferral?[opt('court_intro','请杜老捕引荐钦差','charm',50)]:[]),
 ...(id==='inspector'?[opt('court_rules','问清当差的规矩'),...(!c?[opt('court_join','申请入职六扇门')]:c==='court'?[opt('court_warrant','领取燕七盗案拘传令')]:[])]:[]),
 ...(id==='gang_boss'?[opt('gang_rules','问清赤砂帮的规矩'),...(!c?[opt('gang_join','以敛息取物的身手拜入外堂','agility',54)]:[])]:[]),
 ...(id==='mei'?[opt('gang_intro','问她愿不愿引荐见父亲')]:[]),
 ...(c==='court'&&id!=='inspector'&&s.facts.warrants?.[id]&&!s.people[id].inCustody?[opt('court_arrest','亮腰牌，依拘传令拿人','might',52)]:[])
 ];}
export function careerBlock(sim,id,a){const s=sim.s;if(a.id==='court_arrest'&&!s.ecosystem?.items.some(i=>i.location==='player'&&i.badge==='court'&&i.hp>0))return '捕快腰牌不在身上，无法亮明身份。';if(a.id==='court_join')return s.facts.career?'已有帮派身份，暂不能兼任差役。':!(s.facts.courtTokenPresented||s.facts.constableReferral)?'先取得引荐：可请杜老捕介绍，或带锦衣客的信物来出示。':s.wanted>3?'当前仍有未了的案子，先处理追捕。':null;return null;}
export function careerResolve(sim,eco,id,action){const s=sim.s,p=s.player;let text,changes=[];
 switch(action){
 case 'court_referral':if(!s.facts.princeEvidence&&!s.facts.taxLedgerLead&&!s.intelligence?.clues?.tax){text='我可以介绍人，却不能凭一面之缘替你作保。关口催的税课公文，你先查查是谁的。';break;}if(!s.facts.courtTokenIssued){const token=eco.create('闲舟引荐玉符','personal','player',{discovered:true,referral:'court',material:'stone'});s.facts.courtTokenIssued=token.id;quest(s,'court-entry','持符拜谒','到城内东北官府大堂，向顾钦差出示闲舟引荐玉符。','锦衣客引荐');changes.push('获得：闲舟引荐玉符');}text='拿这枚玉符，去城东北官府大堂见顾大人。他正在选人查税案。能不能当差，由他看你的本事。';break;
 case 'court_intro':s.facts.constableReferral=true;quest(s,'court-entry','旧捕快的引荐','到城东北官府大堂拜见顾钦差，申请入职。','杜老捕作保');text='顾大人正在临溪查案。我会托人递话，你去大堂报杜某的名字。进了六扇门，拿人须讲凭据。';break;
 case 'court_rules':text='我奉命查临溪税案。杜老捕肯作保，或持闲舟的玉符来，我才收人。领了腰牌也须凭拘传令拿人，伤及无辜照样问罪。';break;
 case 'court_join':s.facts.career='court';eco.create('六扇门捕快腰牌','personal','player',{discovered:true,badge:'court',material:'metal'});if(s.quests?.['court-entry'])s.quests['court-entry'].status='complete';text='引荐已经验过。从今日起，你在六扇门当差。腰牌收好，先来领燕七盗案的拘传令。';changes.push('身份：六扇门捕快','获得：捕快腰牌');break;
 case 'court_warrant':s.facts.warrants??={};s.facts.warrants.thief={reason:'许行商报失钱袋，传燕七到案核问',issuer:'inspector'};quest(s,'arrest-thief','燕七盗案','持腰牌在街上找到燕七，拘传后带到顾钦差面前交差。','顾钦差签发拘传令');text='许行商报失钱袋，指认燕七曾近身。传他来核问，尚未定罪，不可滥刑。把人带到我面前。';break;
 case 'court_arrest':if(!eco.items('player').some(i=>i.badge==='court'))return {error:'捕快腰牌不在身上，无法亮明身份。'};s.people[id].inCustody=true;s.people[id].custodyDelivered=false;s.people[id].fear=0;s.people[id].mood='calm';s.people[id].awareness=null;quest(s,'arrest-thief','燕七盗案','带燕七到官府大堂，向顾钦差交差。','依法拘传');text='腰牌和文书都在……行，我跟你去，当着大人的面说清楚。';changes.push('燕七接受拘传，跟随你前往官府');break;
 case 'gang_rules':s.facts.gangKnown=true;text='赤砂帮讨江湖饭吃，外堂讲身手，也讲守口。知意是我女儿，她愿见谁由她；入帮另论。拜堂后，我教你敛息取物。';break;
 case 'gang_intro':s.facts.gangKnown=true;s.facts.gangIntroduced=true;quest(s,'gang-entry','绛云楼的引荐','到城东赤砂帮巢穴见梅帮主，谈入帮的事。','梅知意引荐');text='我父亲是赤砂帮的梅掌舵，在城东的赤砂堂。你可以说见过我。至于入帮，别拿绣球当凭据，让他看你的本事。';break;
 case 'gang_join':s.facts.career='gang';s.facts.gangKnown=true;p.stats.agility+=6;changes.push('身份：赤砂帮外堂弟子','身法 +6',...earnGrowth(p,'agility',30,'career:gang'));eco.create('赤砂帮外堂牌','personal','player',{discovered:true,material:'wood'});if(s.quests?.['gang-entry'])s.quests['gang-entry'].status='complete';text='手够稳，眼也不乱。今日入外堂，我教你藏住肩肘的动静。记着，入帮不是给你一张胡作非为的护身符。';break;
 default:return null;
 }return {text,changes};}
export function presentReferral(sim,eco,id,item){if(id!=='inspector'||item?.referral!=='court')return null;if(sim.s.people[id].awareness?.caseOpen)return {error:'先解决眼前的冲突，再谈引荐。'};sim.s.facts.courtTokenPresented=true;quest(sim.s,'court-entry','持符拜谒','信物已验，向顾钦差申请入职六扇门。','钦差验符');sim.save();return {item:item.name,delta:0,text:'这纹样确是闲舟的。玉符你收好；愿意查案，就留下说说当差的规矩。'};}
export function custodyStep(sim,positions){const s=sim.s;for(const [id,n]of Object.entries(s.people)){if(!n.inCustody||n.hp<=0)continue;if(n.custodyDelivered){n.life={activity:'idle',target:{x:12,z:-22}};continue;}const q=positions[id],chief=positions.inspector;if(!q)continue;n.life={activity:'escort',target:{x:s.player.x+1.2,z:s.player.z+1.2}};if(chief&&s.people.inspector.hp>0&&Math.hypot(q.x-chief.x,q.z-chief.z)<3&&Math.hypot(s.player.x-chief.x,s.player.z-chief.z)<4){n.custodyDelivered=true;n.life={activity:'idle',target:{x:12,z:-22}};if(s.quests?.['arrest-thief'])s.quests['arrest-thief'].status='complete';s.player.money+=20;sim.emit('npcRoutine',{id:'inspector',text:'人已到案，交值房看守。二十文差钱收好，接下来核对失主口供。'});sim.save();}}}
