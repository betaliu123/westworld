import {believedIdentity,changeRelation,appearanceState} from './appearance.js';
import {PEOPLE} from './data.js';
import {persona} from './npc-persona.js';
import {deckState,chronicle,commitDeal} from './event-deck.js';
import {clockText} from './world-clock.js';
import {observeProgress} from './progress.js';
import {contextualResponses,responseMenu,flattenResponses,responseRelation} from './contextual-responses.js';
import {recordFactionPressure,factionAuthority} from './faction-discipline.js';
import {visibleBetween} from './npc-awareness.js';

const name=id=>PEOPLE.find(p=>p.id===id)?.name||'故人';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function canDiscussEcho(s,id){
 const n=s.people[id],now=s.npcClock||0;
 return !!n&&n.hp>0&&s.player.hp>0&&!s.player.bedRest&&!n.inCustody&&!n.restraint&&
  !(n.stunnedUntil>now)&&!(n.muteUntil>now)&&!['sleep','doze'].includes(n.life?.activity)&&
  !n.awareness?.caseOpen&&!['fight','warn','search','flee'].includes(n.awareness?.state)&&
  !s.complaint&&!(n.fear>0);
}
// Delivery and answering are separate facts. Old delivered echoes can still be answered.
export function pendingEcho(s,id){
 if(!canDiscussEcho(s,id))return null;
 return (s.deck?.echoes||[]).find(e=>e.who===id&&(e.subject||'player')===believedIdentity(s,id)&&e.due<=s.day&&!e.response&&
  ['rumor_spread','grudge','thanks_letter'].includes(e.template))||null;
}
export function seesEchoPlayer(s,id,position,player,heading,clear){
 if(!canDiscussEcho(s,id)||!clear)return false;
 const dx=player.x-position.x,dz=player.z-position.z,d=Math.hypot(dx,dz);
 return d<=6&&d>.05&&(Math.sin(heading)*dx+Math.cos(heading)*dz)/d>=.35;
}
export function markEchoHeard(sim,e){
 if(!e||e.response)return;
 if(!e.delivered&&e.channel==='talk')commitDeal(sim,{card:'echo',echo:e,urgent:true,skipped:[]},e.who);
 e.announced=true;e.announcedDay=sim.s.day;sim.save();
}
export function echoChoices(s,e){
 if(!e||e.response||!canDiscussEcho(s,e.who)||(e.subject||'player')!==believedIdentity(s,e.who))return [];
 const later={action:{id:'later',label:'容我想想，改日再说'},preview:{certain:true}};
 if(e.template==='thanks_letter')return [
  {action:{id:'accept',label:'举手之劳，你安好便好'},preview:{certain:true}},later];
 const [style]=persona(e.who),score=s.player.stats.charm;
 const chance=clamp(Math.round(score+20+clamp(responseRelation(s,e.who,e.subject||'player'),-30,30)/3-
  (e.template==='grudge'?25:0)-(['law','courtly'].includes(style)?8:0)),5,90);
 const ordinary=[
  {action:{id:'argue',label:e.template==='grudge'?'解释当时的缘由，试着让对方消气':'【只是传闻】请对方核对原委，别只凭传言定论',stat:'charm'},
   preview:{score,chance,certain:false,reason:e.template==='grudge'?'对方亲眼见过，难以开脱':'只是转述，尚有解释余地'}},
  {action:{id:'apologize',label:'认个不是，郑重道歉'},preview:{certain:true}},later];
 const special=contextualResponses(s,{who:e.who,kind:'echo',cause:e.cause,subject:e.subject||'player',type:e.template,chance})
  .filter(x=>!x.action.response.faction||x.action.response.effect==='pressure'||factionAuthority(s,x.action.response.faction));
 return responseMenu(special,ordinary);
}
const replies={
 law:['话我听进去了，往后看你怎么做。','肯认错，总比绕话强。往后莫再犯。','我问的是那件事，别拿旁的话搪塞。'],
 courtly:['这番解释，我姑且听着。往后还看行事。','这声歉，我领了。旧事却不能当作没有。','话说得漂亮，可惜前后对不上。'],
 blade:['这一回，听你把话说完。往后看行动。','这声不是，我受了。别再有下回。','绕来绕去，倒不如痛快认一句。'],
 trade:['你这么说，我心里好受些。下回可别了。','这声歉我收下。做买卖，经不起折腾。','这话圆不过去，我可不敢再信。'],
 wary:['我听见了。往后再看吧。','肯当面认一句，也罢。','别拿话哄我，我心里有数。'],
 artist:['你肯细说，我也愿意再听一回。','这声歉，我听见了。日后好好相处。','话里的曲折多，诚意倒少了。']
};
export function answerEcho(sim,echoId,answer,random=sim.rng||Math.random,{positions,obstacles=[]}={}){
 const s=sim.s,e=s.deck?.echoes.find(x=>x.id===echoId);
 const option=flattenResponses(echoChoices(s,e)).find(x=>x.action.id===answer);
 if(!option)return {error:'这件事已经说过，或眼下无法交谈。'};
 if(answer==='later')return {deferred:true};
 if(positions){const p=positions[e.who];if(!p||Math.hypot(p.x-s.player.x,p.z-s.player.z)>4||!visibleBetween(p,s.player,obstacles,s.ecosystem?.objects))return {error:'先走到对方面前，再谈这件事。'};}
 const special=option.action.response,n=s.people[e.who],before=e.subject&&e.subject!=='player'?(appearanceState(s).relations[e.who+':'+e.subject]||0):n.relation,roll=option.action.stat?1+Math.floor(random()*100):null;
 const success=roll===null||roll<=option.preview.chance;
 // Mend a small part of the damage, never erase a witnessed crime or grant training XP.
 if(special?.effect==='pressure')recordFactionPressure(sim,{cause:e.cause,npc:e.who,subject:e.subject||'player',faction:special.faction,line:special.text,positions,obstacles});
 const gain=e.template==='thanks_letter'?0:special?.effect==='pressure'?-4:success?2:-1;
 changeRelation(sim,e.who,gain,e.subject||'player');
 const delta=(e.subject&&e.subject!=='player'?(appearanceState(s).relations[e.who+':'+e.subject]||0):n.relation)-before,style=persona(e.who)[0],voice=replies[style]||replies.wary;
 const text=special?(success?special.success:special.failure):e.template==='thanks_letter'?({law:'你肯出这份力，我记着。',courtly:'这份情，我领了。',trade:'承你照应，心里踏实多了。',blade:'承你的情。',artist:'你的心意，我记着。',wary:'嗯，那回多亏了你。'}[style]||'那回多亏了你。'):
  voice[success?(answer==='apologize'?1:0):2];
 const player=special?special.text:answer==='accept'?'举手之劳，你安好便好。':answer==='apologize'?
  '那件事是我做得不妥，向你赔个不是。':e.template==='grudge'?
  '那时一时情急，行事失了分寸，并非存心与你过不去。':'话传了几道，难免变了样。还请听我分说，莫只凭传言定论。';
 const reason=name(e.who)+' · '+(special?.effect==='pressure'?'记下借势施压':answer==='apologize'?'接受道歉':answer==='accept'?'谢意已回应':success?'听过解释，态度缓和':'不信辩解，愈发疑虑');
 const c=chronicle(s),deed={id:++c.seq,cause:e.cause,day:s.day,at:s.day*1000+(s.time||0),clock:clockText(s),
  title:reason,text:text+(delta?'（好感 '+(delta>0?'+':'')+delta+'）':''),target:e.who,subject:e.subject||'player',valence:'deed',witnesses:[]};
 c.deeds.push(deed);c.deeds=c.deeds.slice(-80);
 // Same incident may have several deliveries. One person can only settle it once.
 for(const related of deckState(s).echoes.filter(x=>x.who===e.who&&x.cause===e.cause&&(x.subject||'player')===(e.subject||'player'))){
  related.response={answer,success,roll,chance:option.preview.chance??null,delta,day:s.day,deed:deed.id};
  related.delivered=true;
 }
 n.memories??=[];n.memories.push(reason+'：'+(e.causeTitle||'先前的事'));n.memories=n.memories.slice(-12);
 observeProgress(sim,reason);
 sim.save();
 return {id:e.who,label:option.action.label,roll,check:option.preview,success,delta,text,reason,
  dialogue:[{id:'player',listener:e.who,text:player,shot:'close'},
   {id:e.who,listener:'player',text,shot:'reaction'}]};
}
