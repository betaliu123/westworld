import {skill,practice} from './skills.js';
import {abilityCheck,resolveAbilityCheck,attentionModifiers} from './ability-check.js';
import {visibleBetween} from './npc-awareness.js';
export function probeSight(a,b,obstacles,objects){return visibleBetween(a,b,obstacles.filter(o=>(o.sightHeight??Infinity)>=1.6),objects);}
import {markEncounter,response,thought} from './npc-persona.js';
import {PEOPLE} from './data.js';
function legacyPreview(sim,id){const n=sim.s.people[id];return {score:sim.s.player.stats.wit,chance:Math.max(5,Math.min(95,sim.s.player.stats.wit+40-(id==='traveler'?55:35))),certain:!!n?.probed,blocked:!n||n.hp<=0||(!n.probed&&(n.probeRetryAt||0)>(sim.s.ecosystem?.time||0))};}
function legacyProbe(sim,id){const n=sim.s.people[id],check=legacyPreview(sim,id);if(check.blocked)return {error:'眼下看不清，稍后再观察。'};if(n.probed)return {success:true,cached:true};const roll=1+Math.floor(sim.rng()*100),success=roll<=check.chance;const insight=success&&id==='scribe'?'袖口的赤砂堂腰签露出来了……这人究竟看见没有？':success?thought(sim.s,id):response(sim.s,id,'probe');if(success){n.probed=true;n.probeDay=sim.s.day;}else markEncounter(sim.s,id,'probe');if(!success)n.probeRetryAt=(sim.s.ecosystem?.time||0)+30;const r={roll,check,success,insight,label:'探查',target:id,actionId:'probe',kind:'listen'};sim.emit('fieldCheck',r);sim.save();return r;}
export function probePreview(sim,id){
 const p=sim.s.player;if(!p.skills)return legacyPreview(sim,id);
 const n=sim.s.people[id],tier=skill(p,'insight').tier,certain=!!n&&(n.probedTier||0)>=tier;
 const wait=Math.ceil((n?.probeRetryAt||0)-(sim.s.ecosystem?.time||0));
 const reason=!n?'目标已离开，请重新选人。':n.hp<=0?'对方已经倒地，无法探查。':tier<1?'尚未学会眼力，先向瘸张请教。':!certain&&wait>0?'对方有所警觉，'+wait+' 秒后可重试。':'';
 return abilityCheck(p,{stat:'wit',skillId:'insight',difficulty:id==='traveler'?25:0,modifiers:attentionModifiers(n,{now:sim.s.ecosystem?.time}),reason,certain});
}
// Higher insight adds observable evidence, never omniscient identity or letter contents.
export function insightEvidence(s,id,tier=skill(s.player,'insight').tier){const n=s.people[id],lines=[];if(!n)return lines;
 if(tier>=3){const d=s.chapter?.done||{};
 if(id==='scribe'&&s.facts.scribeIdentity)lines.push('口称只修印，翻袖却先护针囊。话留了半截，可追问门中来历。');
 if(id==='traveler'&&(d.entry_lie||d.entry_truth))lines.push('谈到税课，他始终不问银数，只问经手的人。此行不像游山。');
 if(id==='thief'&&s.ecosystem?.items.some(i=>i.location==='npc:thief'&&i.type==='purse'&&i.ownerId!=='thief'))lines.push('钱袋压着旧店号，和他的衣着不相称。得找失主辨认，不能只凭眼力定罪。');
 if(id==='shen'&&d.su_wish)lines.push('说到苏晚去留，他握剑的手紧了。嘴上说放心，神色却没有。');
 }
 if(tier>=4){const coat=s.ecosystem?.items.find(i=>i.id===n.wornOutfit&&i.location==='npc:'+id&&i.hp>0);if(coat?.ownerId&&coat.ownerId!==id){lines.push('衣领压不住旧晒痕，袖口也短了。这身衣裳与他的年貌不合，像是借来的。');n.disguiseExposedToPlayer=true;}else lines.push('领口、步态与手上老茧相合。眼下未见乔装的破绽。');}
 return lines;
}
export function probeNpc(sim,id){if(!sim.s.player.skills)return legacyProbe(sim,id);const n=sim.s.people[id],check=probePreview(sim,id),tier=skill(sim.s.player,'insight').tier;if(check.blocked)return {error:check.reason};const {roll,success}=resolveAbilityCheck(check,sim.rng);if(check.certain)return {success,cached:true,check,roll};let insight;
 if(success){n.probedTier=tier;n.probed=tier>=2;n.probeDay=sim.s.day;n.metPlayer=true;practice(sim.s.player,'insight',5,'probe:'+id+':'+tier);insight=tier===1?(id==='scribe'?'虎口伤疤深，指腹却没有常年握刻刀的厚茧。还看不准他的来历。':'能看清衣着与手上茧痕，更深的来历还需学些眼力。'):id==='scribe'?'袖内针囊上有无相门的暗记。修印只是掩饰，他懂得改扮。':id==='traveler'?'锦料、玉佩和举止都非寻常；未见可靠凭据，尚不能断定身份。':'看清了外露行囊和腰牌。封好的信，须拿到手拆读才知道内容。';if(id==='porter'&&sim.s.ecosystem?.items.some(i=>i.storyId==='porter-iron'&&i.location==='npc:porter'&&i.hp>0)){sim.s.facts.beggarPorterSeen=true;insight='左肩压低，担角露出一截铁器；鞋底外侧磨薄了。瘸张说的肩势与实物对得上。';}if(tier>=2&&id==='scribe')sim.s.facts.scribeIdentity=true;const clues=insightEvidence(sim.s,id,tier);if(clues.length){n.observedClues=clues;insight+=' '+clues.join(' ');}
 n.probeObservation=insight;}else{n.probeRetryAt=(sim.s.ecosystem?.time||0)+30;markEncounter(sim.s,id,'probe');insight=response(sim.s,id,'probe');}
 const r={roll,check,success,insight,label:'探查',target:id,actionId:'probe',kind:'listen'};sim.emit('fieldCheck',r);sim.save();return r;}
export function npcInfo(sim,eco,id){const n=sim.s.people[id],p=PEOPLE.find(p=>p.id===id);if(!n||!p)return null;const known=!!sim.s.intelligence?.people?.[id]||n.probed;
 const hostile=['fight','warn'].includes(n.awareness?.state)||n.relation< -15;
 return {id,known,name:id==='traveler'?(sim.s.facts.princeAlias?'赵闲舟':'锦衣客'):known?p.name:'？？？',title:id==='traveler'?(sim.s.facts.princeRoyal?'王爷 · 宋徽宗之弟':'在茶棚候人的旅客'):known?p.title:'身份未明',faction:id==='scribe'&&n.probed?(sim.s.chapterVersion===2?'无相门':'赤砂帮'):id==='traveler'?(sim.s.facts.princeRoyal?'宗室王府':'？？？'):known?(p.faction||'？？？'):'？？？',attitude:hostile?'敌对':(n.relation>=5||(p.faction==='六扇门'&&sim.s.factions?.['六扇门']>=20))?'友好':'中立',color:p.color,probed:!!n.probed,observed:!!n.probedTier||!!n.probed,condition:n.hp<=0?'倒地':n.life?.activity==='sleep'?'熟睡':n.life?.activity==='doze'?'打盹':n.sickUntil>eco.s.time?'身体不适':'暂无明显异常',observation:!n.probed&&n.probeObservation?n.probeObservation:n.observedClues?.length?n.observedClues.join(' '):sim.s.chapterVersion===2&&id==='scribe'&&n.probed?'袖内针囊有无相门暗记，伤疤不像普通刻字匠所留。':id==='scribe'&&n.probed?'虎口的旧伤一直延到腕骨。翻印时袖口滑开，里头系着赤砂堂的腰签，签背刻的是「印房」。':id==='traveler'&&sim.s.facts.princeRoyal?(sim.s.facts.princeAlias?'闲舟是他微服时用的名字。':'')+'皇兄将临溪税案交给了他。':id==='traveler'?'衣料细密，佩玉雕工不俗；举止从容，却始终不肯自报来历。看不出确切身份。':'从衣着与动作辨认出的随身物品。',items:n.probed?eco.items('npc:'+id).filter(i=>i.hp>0).map(i=>({id:i.id,name:i.name,type:i.type,drink:i.drink})):[],money:n.probed?n.purse:null};}
export {npcPortrait} from './npc-portraits.js';
