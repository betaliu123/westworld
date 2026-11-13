import {migrateRunnerClothes} from './runner-clothes.js';
import {identityRelationship} from './identity-network.js';
import {PEOPLE} from './data.js';
import {skill} from './skills.js';
import {addCausalDeed} from './item-meaning.js';
import {earnReputation,cityOf,cityRep} from './reputation.js';
import {visibleBetween} from './npc-awareness.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const identityName=id=>id==='player'?'你':PEOPLE.find(p=>p.id===id)?.name||'陌生人';
export const femalePeople=new Set(['qinghe','tea_host','mei','matchmaker','su','bookseller','inn','tea']);
export const appearanceTime=s=>(s.day||1)*240+(s.time||0);
export function appearanceState(s){return s.appearance??={faces:{},rumors:{},checks:{},exposed:{},relations:{},reputations:{},incidents:[]};}
export function currentFace(s){const f=s.player.face;return f&&f.until>appearanceTime(s)?f.id:'player';}
export function rememberFace(s,id,source='亲眼见过'){if(!s.people[id])return;const a=appearanceState(s);a.faces[id]??={source,at:appearanceTime(s)};if(source==='通缉榜画像')a.faces[id].source=source;}
// Restore existing knowledge before taking the progress baseline, never as a new reward.
export function restoreKnownFaces(s){for(const [id,n]of Object.entries(s.people))if(n.metPlayer||n.probed)rememberFace(s,id);if(s.facts.publicWarrant)rememberFace(s,'thief','通缉榜画像');}
// Seeing a passer-by alone is not enough to learn an identity. Existing saves may
// contain those observations; keep the record but never offer it as a usable face.
export function canUseFace(s,id){return id==='player'||!!(appearanceState(s).faces[id]&&(s.people[id]?.metPlayer||s.people[id]?.probed||appearanceState(s).faces[id].source==='通缉榜画像'));}
export function knownFaces(s){return Object.entries(appearanceState(s).faces).filter(([id])=>canUseFace(s,id));}
// Number each face once, in the order it became usable; older saves keep their first-seen order.
export function recentFaces(s){const a=appearanceState(s),faces=knownFaces(s);for(const [,info]of faces.filter(([,f])=>f.usable==null).sort((x,y)=>(x[1].at||0)-(y[1].at||0)))info.usable=a.usableSerial=(a.usableSerial||0)+1;return faces.sort((x,y)=>y[1].usable-x[1].usable);}
// Only routes the player has actually learned about are marked.
export function mainRouteFace(s,id){return id==='qinghe'&&s.chapterVersion===2&&!!s.facts?.qingheRosterRouteKnown&&!s.facts.enteredCity&&!s.convoy?.closed;}
export function feminineBody(s){return femalePeople.has(currentFace(s))||(currentFace(s)==='player'&&s.player.gender==='female');}
export function clothing(s){return s.ecosystem?.items.find(i=>i.id===s.player.wornOutfit&&i.location==='player'&&i.hp>0)||null;}
export function clothingRole(item){if(!item)return '挑夫';if(item.identityRole)return item.identityRole;if(item.ownerId==='fu')return '应奉局管事';if(/差役/.test(item.name))return '差役';if(['guard','gate_guard','gate_relief','inspector'].includes(item.ownerId))return '官兵';if(femalePeople.has(item.ownerId)||/女装|罗裙/.test(item.name))return '女装行客';if(/役夫|短褂/.test(item.name)||item.ownerId==='porter')return '挑夫';if(item.ownerId==='gate_merchant'||item.ownerId==='merchant')return '商人';return '江湖行客';}
export function knownFaceName(s,id){return id==='player'||s.people[id]?.metPlayer||s.people[id]?.probed||appearanceState(s).faces[id]?.source==='通缉榜画像'?identityName(id):'见过的面貌';}
// Freeze each new dose's duration; older faces use the original duration formula
// for display only, without rewriting their expiry or migrating appearance data.
export function appearanceView(s){const face=currentFace(s),item=clothing(s),left=face==='player'?0:s.player.face.until-appearanceTime(s),duration=s.player.face?.duration||60+skill(s.player,'disguise').tier*10;return {face,name:knownFaceName(s,face),role:!item&&feminineBody(s)?'江湖行客':clothingRole(item),clothing:item,remaining:Math.ceil(left*6),remainingFraction:clamp(left/duration,0,1),risk:rumorRisk(s,face),outfit:s.player.wornOutfit||null};}
export function rumorRisk(s,id=currentFace(s)){const r=appearanceState(s).rumors[id];return r&&r.until>appearanceTime(s)?r.risk:0;}
export function spreadIdentityRumor(s,id,amount=12,source='街头传闻',who=null){if(!id||id==='player')return;const a=appearanceState(s),r=a.rumors[id];a.rumors[id]={risk:clamp(rumorRisk(s,id)+amount,0,45),until:Math.max(r?.until||0,appearanceTime(s)+480),source,hearers:[...new Set([...(r?.hearers||[]),who].filter(Boolean))]};}
export function believedIdentity(s,observer){const id=currentFace(s);if(id==='player'||id===observer)return 'player';const n=s.people[observer],a=appearanceState(s);if(a.exposed[observer]===s.player.face?.serial||n?.awareness?.identifiedSerial===s.player.face?.serial)return 'player';return id;}
export function changeRelation(sim,observer,delta,subject=believedIdentity(sim.s,observer)){
 if(subject==='player'){const n=sim.s.people[observer];if(!n)return 0;const before=n.relation||0;n.relation=clamp(before+delta,-100,100);return n.relation-before;}
 const a=appearanceState(sim.s),k=observer+':'+subject,before=a.relations[k]||0;a.relations[k]=clamp(before+delta,-100,100);return a.relations[k]-before;
}
export function attributeIncident(s,observer,event){event.identities??={};const who=event.identities[observer]??=believedIdentity(s,observer);event.identitySerials??={};event.identitySerials[observer]??=currentFace(s)==='player'?0:s.player.face.serial;if(who!=='player'){const a=appearanceState(s),key=observer+':'+who;const last=a.incidents.findLast?.(x=>x.key===key);if(!last||appearanceTime(s)-last.at>3){a.incidents.push({key,observer,subject:who,type:event.type,at:appearanceTime(s)});a.incidents=a.incidents.slice(-60);spreadIdentityRumor(s,who,8,'被人目击',observer);const r=a.reputations[who]??={cities:{},factions:{}};const city=s.currentCity||'linxi';r.cities[city]=(r.cities[city]||0)-2;const faction=({'六扇门':'court','临溪守军':'court','临溪县衙':'court','赤砂帮':'gang','赤沙帮':'gang','青竹会':'qingzhu','无相门':'wuxiang'})[PEOPLE.find(p=>p.id===observer)?.faction];if(faction)r.factions[faction]=(r.factions[faction]||0)-2;}}return who;}
export function ensureWardrobe(eco){const s=eco.sim.s,p=s.player,a=appearanceState(s);if(!a.issued){a.issued=true;const shirt=eco.create('旧布衣','clothing','player',{material:'cloth',identityRole:'江湖行客',appearanceModel:'hero',discovered:true});p.wornOutfit??=shirt.id;eco.create('易容膏','cosmetic','player',{material:'herb',discovered:true});eco.create('易容膏','cosmetic','player',{material:'herb',discovered:true});}migrateRunnerClothes(s);restoreKnownFaces(s);return a;}
export function equipAppearance(sim,itemId,slot){const p=sim.s.player,item=sim.s.ecosystem?.items.find(i=>i.id===itemId&&i.location==='player'&&i.hp>0);if(itemId&&!item)return {error:'这件东西不在行囊里。'};const type={body:'clothing',head:'hat'}[slot];if(!type||item&&item.type!==type)return {error:'这件东西不能穿戴在这里。'};if(slot==='body'){p.wornOutfit=item?.id||null;p.disguise=clothingRole(item)==='差役'?'runner':item&&!item.appearanceModel?'borrowed':null;}else p.hat=item?.id||null;sim.emit('appearanceChanged',{text:item?'换上'+item.name:'卸下'+({body:'上衣',head:'斗笠'}[slot])});sim.save();return {ok:true};}
export function applyFace(sim,id){const s=sim.s,p=s.player,previous={face:currentFace(s),serial:p.face?.serial||0};if(p.hp<=0)return {error:'先调息恢复。'};if(id==='player'){p.face=null;sim.emit('faceChanged',{...previous,fromSerial:previous.serial,to:'player',serial:0});sim.save();return {ok:true};}const a=appearanceState(s);if(!canUseFace(s,id))return {error:'还未结识或辨认这个人。'};if(currentFace(s)===id)return {error:'眼下已是这张面貌，不必再耗药。'};const paste=s.ecosystem?.items.find(i=>i.type==='cosmetic'&&i.location==='player'&&i.hp>0);if(!paste)return {error:'需要一份易容膏，可向刻字人购买。'};paste.location='consumed';paste.hp=0;const duration=60+skill(p,'disguise').tier*10;p.face={id,serial:(a.serial=(a.serial||0)+1),duration,until:appearanceTime(s)+duration};sim.emit('faceChanged',{...previous,fromSerial:previous.serial,to:id,serial:p.face.serial});sim.emit('appearanceChanged',{text:'改作'+knownFaceName(s,id)+'的模样'});sim.save();return {ok:true};}
// Fu has Qinghe's name on the roster, but has never met her.
const familiar={qinghe:['tea_host'],fu:['porter','tea_host','qinghe'],porter:['fu'],gate_merchant:['gate_guard','tea_host','merchant'],thief:['guard','gang_boss'],traveler:['inspector'],gate_guard:['gate_relief','guard'],gate_relief:['gate_guard','guard']};
export const identityFamiliar=(s,observer,face=currentFace(s))=>!!(identityRelationship(face,observer)||familiar[face]?.includes(observer)||s.people[observer]?.knownPeople?.includes(face));
// Recognition knowledge survives incapacity; actively challenging/unmasking does not.
// Keep this before every deterministic branch as well as before the actual roll.
export function disguiseObserverBlock(s,id){
 const n=s.people[id],now=s.npcClock||0;
 if(!n)return '对方已不在这里。';
 if(n.hp<=0)return '对方已经倒地，无法盘问。';
 if(n.restraint||n.inCustody)return '对方受制，无法盘问。';
 if(n.hp<=(n.maxHp||100)*.3)return '对方伤势太重，无法盘问。';
 if(n.stunnedUntil>now)return '对方被定住，无法盘问。';
 if(n.muteUntil>now)return '对方暂时说不出话，无法盘问。';
 if(['sleep','doze'].includes(n.life?.activity))return '对方尚未醒来，无法盘问。';
 if(n.drowning)return '对方正在溺水，无法盘问。';
 return '';
}
// Called at the actual face change with live positions, not reconstructed later
// from saved spawn points. No unseen witness learns that two faces are linked.
export function observeFaceChange(sim,event,positions,obstacles=[]){
 const s=sim.s;if(event.face===event.to)return [];
 const seen=[];
 for(const [id,q] of Object.entries(positions)){
  if(q.visible===false||disguiseObserverBlock(s,id))continue;
  const dx=s.player.x-q.x,dz=s.player.z-q.z,d=Math.hypot(dx,dz),facing=q.facing??s.people[id]?.facing;
  if(d>6||d>.1&&Number.isFinite(facing)&&(Math.sin(facing)*dx+Math.cos(facing)*dz)/d<.35||!visibleBetween(q,s.player,obstacles,s.ecosystem?.objects))continue;
  const a=appearanceState(s);a.observedChanges??={};a.observedChanges[id]={from:event.face,fromSerial:event.fromSerial,to:event.to,serial:event.serial,at:s.npcClock||0};a.exposed[id]=event.serial;seen.push(id);
 }
 return seen;
}
// Only scene observations can establish that both faces are present. A saved
// spawn coordinate or hidden original must never become omniscient evidence.
export function originalInSight(s,observer,context){
 if(disguiseObserverBlock(s,observer))return false;
 const face=currentFace(s),n=s.people[face],q=context?.positions?.[face],at=context?.positions?.[observer];
 if(!identityFamiliar(s,observer)||!q||!at||!n||n.hp<=0||n.stunnedUntil>(s.npcClock||0)||['sleep','doze'].includes(n.life?.activity))return false;
 const sees=target=>{const dx=target.x-at.x,dz=target.z-at.z,d=Math.hypot(dx,dz),facing=at.facing??s.people[observer]?.facing;
  return d<=5&&(d<.1||!Number.isFinite(facing)||(Math.sin(facing)*dx+Math.cos(facing)*dz)/d>=.35)&&visibleBetween(at,target,context.obstacles||[],s.ecosystem?.objects);};
 return sees(q)&&sees(context.player||s.player);
}
export function disguiseReplies(s,observer){
 if(disguiseObserverBlock(s,observer))return [];
 const face=currentFace(s),name=knownFaceName(s,face),known=identityFamiliar(s,observer,face);
 const base={id:'default',label:'【易容·'+name+'】'+(known?'请对方认清面貌，解释来由':'解释举止与来由'),text:known?'这才几日不见，先听我把来由说清。':'有什么疑处，请当面说清。',bonus:0};
 const choices=[];
 if(s.player.hp<=(s.player.maxHp||100)*.3)choices.push({id:'low_hp',label:'【气血低】以身体虚弱解释举止失常',text:'今日气血亏损，举止有些失常。有什么疑处，请直说。',bonus:5});
 if(s.player.sickUntil>(s.ecosystem?.time||0))choices.push({id:'sick',label:'【身体不适】说明腹痛，解释神色不对',text:'腹中一阵阵地疼，神色难免不对。请把疑处说清。',bonus:5});
 const outfit=clothing(s);if(outfit)choices.push({id:'clothing',label:'【当前衣着】说明衣裳来历，接受核对',text:'这身衣裳的来历，我愿当面说明。请把疑处说清。',bonus:0});
 const replies=identityRelationship(face,observer)?.replies;
 return [...choices,base].map(r=>({...r,...replies?.[r.id]}));
}
export function disguisePreview(s,observer,{force=false,approach='default',context}={}){
 if(disguiseObserverBlock(s,observer))return null;
 const v=appearanceView(s),a=appearanceState(s);if(v.face==='player')return null;
 const certain=reason=>({face:v.face,chance:0,certain:true,reason,reasons:[reason]});
 if(observer===v.face)return {...certain('原主就在面前'),original:true};
 if(originalInSight(s,observer,context))return {...certain('对方同时看见原主与你'),duplicate:true};
 if(a.exposed[observer]===s.player.face.serial||s.people[observer]?.awareness?.identifiedSerial===s.player.face.serial){
  const observed=a.observedChanges?.[observer],seenChange=observed?.serial===s.player.face.serial&&observed.to===v.face;
  return {...certain(seenChange?'对方亲眼见过你易容':'对方已揭穿这副面貌'),evidence:seenChange?'faceChange':'exposed'};
 }
 const known=identityFamiliar(s,observer,v.face),reasons=[];
 let chance=clamp(75+skill(s.player,'disguise').tier*5+Math.round(((s.player.stats?.charm||40)-40)/3),30,95);
 if(known){chance-=25;reasons.push('对方熟悉这张脸');}
 const feminine=v.role==='女装行客',expected=femalePeople.has(v.face);
 const mismatch=!!known&&(v.face==='fu'?v.role!=='应奉局管事':v.face==='porter'?v.role!=='挑夫':feminine&&!expected||!feminine&&expected&&['官兵','差役','挑夫'].includes(v.role));
 if(mismatch){chance-=18;reasons.push('衣着与旧日印象不同');}
 const r=a.rumors[v.face],risk=rumorRisk(s,v.face),heard=r?.hearers?.includes(observer)&&risk>0;
 if(heard){chance-=risk;reasons.push('对方听过这副面貌的近日传闻');}
 if(!force&&!mismatch&&!heard&&(!known||['fu','porter'].includes(v.face)))return null;
 const reply=disguiseReplies(s,observer).find(r=>r.id===approach);
 if(!reply)return {blocked:true,certain:true,chance:0,reason:'说法所需的状态已改变。'};
 return {face:v.face,chance:clamp(chance+reply.bonus,5,95),certain:false,score:s.player.stats?.charm||40,reasons,reason:reasons.join('；')||'核对举止与来历',mismatch,known};
}
export function checkDisguise(sim,observer,{approach='default',context}={}){const s=sim.s,unavailable=disguiseObserverBlock(s,observer);if(unavailable)return {error:unavailable,unavailable:true};const check=disguisePreview(s,observer,{force:true,approach,context});if(check?.blocked)return {error:check.reason};if(!check)return {success:true,cached:true};const face=currentFace(s),roll=check.certain?null:1+Math.floor(sim.rng()*100),success=check.chance>0&&(roll==null||roll<=check.chance);const a=appearanceState(s);a.checks[observer]={serial:s.player.face.serial,until:appearanceTime(s)+12,risk:rumorRisk(s,face),outfit:s.player.wornOutfit||null};if(!success){a.exposed[observer]=s.player.face.serial;s.player.face=null;const city=cityOf(s),beforeRep=cityRep(s,city),delta=changeRelation(sim,observer,-2,'player');const deed=addCausalDeed(s,{key:'unmasked:'+a.serial+':'+observer,title:'冒名被识破',text:identityName(observer)+'识破了你冒用'+identityName(face)+'的面貌。',target:observer,subject:'player',valence:'harm',witnesses:[observer]});earnReputation(sim,{subject:'player',amount:-2,reason:'冒名被识破',key:'unmasked:'+a.serial});const repDelta=cityRep(s,city)-beforeRep;deed.effects??=[...(delta?[{kind:'relation',observer,subject:'player',delta}]:[]),...(repDelta?[{kind:'cityReputation',city,subject:'player',delta:repDelta}]:[])];sim.emit('identityExposed',{observer,face});}sim.save();return {success,roll,check,face,label:'应对身份盘问',reason:check.reason};}
export function needsDisguiseCheck(s,id,options={}){const check=disguisePreview(s,id,options);if(!check)return false;if(check.original||check.certain)return true;const old=appearanceState(s).checks[id];return !old||old.serial!==s.player.face?.serial||old.until<=appearanceTime(s)||old.outfit!==(s.player.wornOutfit||null)||old.risk<rumorRisk(s);}
