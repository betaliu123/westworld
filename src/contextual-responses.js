import {PEOPLE} from './data.js';
import {currentFace,believedIdentity,knownFaceName,clothing,clothingRole} from './appearance.js';
import {persona} from './npc-persona.js';
import {factionStanding,factionAuthority} from './faction-discipline.js';

const clamp=n=>Math.max(5,Math.min(90,Math.round(n)));
const personName=id=>PEOPLE.find(p=>p.id===id)?.name||'相识的人';
const knows=(s,id)=>!!(s.people[id]?.metPlayer||s.people[id]?.probed||s.intelligence?.people?.[id]);
export function responseRelation(s,id,subject='player'){
 return subject==='player'?(s.people[id]?.relation||0):(s.appearance?.relations?.[id+':'+subject]||0);
}

// Only connections the player has actually learned. Familiar faces are not friends.
export function commonAcquaintance(s,id){
 const pairs=[];
 if(s.facts.helpedMother)pairs.push(['qinghe','tea_host']);
 if(s.facts.gangIntroduced)pairs.push(['gang_boss','mei']);
 if(s.facts.constableReferral)pairs.push(['inspector','old_constable']);
 if(s.facts.courtTokenPresented)pairs.push(['inspector','traveler']);
 for(const link of s.socialConnections||[])if(link.known&&link.source&&['friend','family','referral'].includes(link.kind))pairs.push([link.a,link.b]);
 return pairs.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]).find(k=>knows(s,k)&&(s.people[k]?.trust||0)>=5&&(s.people[k]?.relation||0)>=5)||null;
}

// Candidate creation is read-only: browsing never rolls, spends, or invents a fact.
export function contextualResponses(s,ctx){
 const {who,kind='complaint',subject=believedIdentity(s,who),type,cause,price=0}=ctx;
 const p=s.player,n=s.people[who],now=s.npcClock||0;
 if(s.chapterVersion!==2||!n||n.hp<=0||p.hp<=0||n.stunnedUntil>now||n.muteUntil>now||['sleep','doze'].includes(n.life?.activity))return [];
 const face=currentFace(s),self=subject==='player'&&face==='player',style=persona(who)[0],strict=['law','blade'].includes(style),relation=responseRelation(s,who,subject);
 const base=ctx.chance??(p.stats.charm+20+relation/4-(type==='assault'?16:0));
 const used=ctx.attempts||[],out=[];
 function add(id,tags,text,{effect='explain',bonus=0,priority=50,success,failure,reason,stat='charm',...extra}={}){
  if(used.includes(id)||used.includes(effect))return;
  out.push({action:{id:'context:'+id,label:tags.map(t=>'【'+t+'】').join('')+text,stat,
   response:{id,tags,text,effect,priority,success:success||'话我听见了。往后还看你怎样行事。',failure:failure||'眼前这件事，还是得交代清楚。',...extra}},
   preview:{certain:!stat,score:stat?p.stats[stat]:undefined,chance:stat?clamp(base+bonus):100,reason:reason||(kind==='echo'?'可有限缓和关系；旧事仍记着':'争取缓和眼前问责；不抹除证据')}});
 }
 const pause=kind==='complaint'?'pause':'explain';
 const pauseReason=kind==='complaint'?'成功：原地缓息十秒，仍须交代':'成功：有限缓和关系，不撤销前事';
 if(p.hp<=(p.maxHp||100)*.3)add('low_hp',['气血低'],kind==='complaint'?'我已经撑不住了，容我缓口气再说。':'我如今也不想逞强，那件事请容我赔个不是。',{
  effect:pause,bonus:strict?-4:12,priority:76,reason:pauseReason,
  success:kind==='complaint'?'可以先缓一缓。留在这里，事情还没说完。':'这声不是我听见了。先顾好身子，旧事仍看你以后怎样做。'});
 if(p.sickUntil>(s.ecosystem?.time||0))add('sick',['身体不适'],kind==='complaint'?'腹中疼得厉害，容我缓一缓。':'身子难受，也不能拿来搪塞旧事。我愿把话说清。',{
  effect:pause,bonus:strict?-4:10,priority:75,reason:pauseReason,success:kind==='complaint'?'先缓一缓，人别离开。事情稍后说。':'我听见了。这回事先记着，往后看你行事。'});
 if(p.energy<=20)add('tired',['体力不支'],kind==='complaint'?'我不走，先让我喘匀这口气。':'我已没有力气逞强，还是把话说开吧。',{
  effect:pause,bonus:strict?-6:6,priority:62,reason:pauseReason,success:kind==='complaint'?'就站在这里缓一缓，我等你说清楚。':'肯好好说，总比硬撑着绕话强。'});
 if(kind==='complaint'&&p.money<price)add('poor',['盘缠不足'],'我眼下赔不起，能否容我先把来由说清？',{
  effect:'pause',bonus:-5,priority:56,reason:'成功：暂缓十秒；赔款不减免，也不立欠条',success:'我听你说，但该赔的还得赔。先别走。'});
 if(kind==='complaint'&&p.satiety<=20&&type==='theft'&&ctx.item?.type==='food')add('hungry',['饥饿'],'我是饿得起了贪念，愿意认错。',{
  bonus:strict?-5:10,priority:72,success:'饿了可以开口，不能伸手。这次认错的话我听见了。'});

 if(face!=='player'&&subject===face&&believedIdentity(s,who)===face&&who!==face&&knownFaceName(s,face)!=='见过的面貌')add('face',['易容·'+knownFaceName(s,face)],'是我，'+knownFaceName(s,face)+'。先听我把来由说清。',{
  priority:94,bonus:0,reason:'按对方认定的身份解释；不借用你的旧交与职权',success:'来由我听见了。这张面孔，我也记下了。'});
 const outfit=clothing(s);
 if(kind!=='echo'&&outfit&&['差役','官兵'].includes(clothingRole(outfit)))add('uniform',[clothingRole(outfit)==='差役'?'差役服':'官兵装束'],'衣裳是衣裳，我愿把眼前的事交代清楚。',{
  priority:60,bonus:strict?-8:0,reason:'衣物不证明官职，也不赋予免责权',success:'衣服的来历另说，先记下你这番解释。'});
 if(kind==='complaint'&&face!=='player')add('unmask',['易容中'],'我不再遮掩，你看清我是谁。',{
  effect:'unmask',stat:null,priority:79,reason:'卸去易容，继续处理原事；不会清除目击',success:'我看清了。换回面目，方才的事也还得交代。'});

 if(self){
  const faction=s.facts.career,standing=factionStanding(s,faction);
  // Discipline also checks eligibility at execution. Possession alone is never membership.
  const badge=(s.ecosystem?.items||[]).find(i=>i.location==='player'&&i.hp>0&&i.badge==='court');
  if(['court','gang'].includes(faction)&&standing.status!=='expelled'){
   const title=faction==='court'?'六扇门':'赤砂帮';
   if(faction!=='court'||badge){
    if(factionAuthority(s,faction))add('affiliation',[title],faction==='court'?'我在六扇门当差，也愿按规矩交代。':'我在赤砂帮有名有姓，这事我愿交代。',{
     priority:92,bonus:strict?0:7,reason:'亮明真实身份；仍须为自己的行为负责',faction,success:'既然报了名号，这番话我记下了。往后看你怎样做。'});
    if(kind!=='disguise')add('pressure',[title+(standing.status==='restricted'?'·限权':'')],faction==='court'?'我仍在六扇门名册上，这点事，你还要闹大？':'我在赤砂帮有名号，你还要纠缠下去？',{
     effect:'pressure',priority:91,bonus:(strict?-22:14)-(standing.status==='restricted'?15:0),faction,reason:standing.status==='restricted'?'已经限权；再借名头压人，查实可能除名':'借势施压；对方可能告状，查实后会受门内处分',
     success:'今日我先退开。这句话，我记下了。',failure:'有名号更该讲规矩。拿身份压人，这事我会说明白。'});
   }
  }
  const friend=commonAcquaintance(s,who);
  if(friend)add('friend',['共同熟人·'+personName(friend)],'我与'+personName(friend)+'相识，能否先听我交代？',{
   priority:93,bonus:8,friend,reason:'借共同熟人争取解释机会；不是对方已经作保',success:'相识的情分我知道。这件事，我先听你说。',failure:'相识归相识，不能拿人家的名字替你担保。'});
  if(s.facts.constableReferral&&['inspector','guard','gate_guard'].includes(who))add('referral',['杜老捕引荐'],'杜老捕替我引过路，我不想瞒着这件事。',{
   priority:83,bonus:4,success:'老杜的引荐我听见了。你的过错，仍由你自己交代。'});
  const lesson=Object.values(s.apprenticeships?.records||{}).find(r=>r.id===who&&r.completed&&(r.learnerSubject||'player')===subject);
  if(lesson)add('student',['受过指点'],'我受过你的指点，这回更不该失了分寸。',{
   priority:88,bonus:8,success:'教过你的本事，别用在失当的地方。这句话我听了。'});
  const care=n.receivedCare&&(!n.careSubject||n.careSubject===subject);
  if(care)add('care',p.hp<=(p.maxHp||100)*.3?['气血低','曾照看你']:['曾照看你'],kind==='complaint'&&p.hp<=(p.maxHp||100)*.3?'那回我陪过你，这回能否先容我缓一缓？':'上回我照看过你，这回能否先听我把话说完？',{
   effect:kind==='complaint'&&p.hp<=(p.maxHp||100)*.3?'pause':'explain',priority:89,bonus:10,
   reason:kind==='complaint'&&p.hp<=(p.maxHp||100)*.3?pauseReason:undefined,success:kind==='complaint'&&p.hp<=(p.maxHp||100)*.3?'那回的情我记得。先缓一缓，事情还得说清。':'那回你照看的情分我记得。这番解释，我听见了。'});
  if((n.trust||0)>=12&&relation>=8)add('trust',['素有信任'],'你我相处过，能否先听完这一次？',{
   priority:81,bonus:6,success:'相识这些日子，我愿再听你一次。往后还看你怎样做。',failure:'正因为信过你，这回事才更不能搪塞。'});
 }
 const item=ctx.item||(s.ecosystem?.items||[]).find(i=>i.id===ctx.itemId);
 if(kind==='complaint'&&item?.hp>0&&ctx.owner===who){
  const stolen=(item.provenance?.history||[]).some(h=>h.to==='player'&&h.method==='stolen');
  if(item.location==='player'&&stolen)add('return',['原物在手'],'东西还给你，是我做得不妥。',{
   effect:'return',stat:null,priority:110,itemId:item.id,reason:'归还这件实物；继续交代，不重复发奖',success:'东西收回了。拿过的事我记着，剩下的还得说清。'});
  if(ctx.returned&&item.location==='npc:'+who)add('returned',['原物已还'],'东西已经交还，剩下的过错我愿说明。',{
   bonus:8,priority:101,reason:'核对已归还的原物，不再次转移或发奖',success:'东西确已收回。认错的话，我也听见了。'});
  if(ctx.transferred===false)add('not_taken',['物品未取走'],'手是我伸的，东西还在，请先点清。',{
   bonus:3,priority:87,success:'东西还在不假，伸手的事我也看见了。这次先记下。'});
 }
 const previous=(s.responseHistory||[]).filter(r=>r.who===who&&r.subject===subject&&r.cause!==cause&&r.type===type);
 if(previous.length)add('repeat',['屡次失信'],'同样的话你听过了，这回我先认错。',{
  priority:84,bonus:-10,success:'认错的话我听见了。再有下回，就没这么容易。',failure:'上回也是这番话。我得看你真正做些什么。'});
 let paused=false;
 return out.sort((a,b)=>b.action.response.priority-a.action.response.priority||a.action.id.localeCompare(b.action.id)).filter(e=>{
  if(e.action.response.effect!=='pause')return true;if(paused)return false;paused=true;return true;
 });
}

// Two relevant responses and a semantic route to the remaining choices. All leaves
// remain reachable; menus never execute actions or reset attempt keys.
export function responseMenu(special,ordinary){
 const all=[...special,...ordinary];
 if(all.length<=3)return all;
 return [...all.slice(0,2),{action:{id:'response:more',label:'说明缘由与处置',children:all.slice(2)},preview:{certain:true}}];
}
export function responsePage(entries){
 return entries.length<=3?entries:[...entries.slice(0,2),{action:{id:'response:next',label:'商议其他处理',children:entries.slice(2)},preview:{certain:true}}];
}
export function flattenResponses(entries){return entries.flatMap(e=>e.action.children?flattenResponses(e.action.children):[e]);}
