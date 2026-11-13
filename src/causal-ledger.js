import {npcName,knownNpcName} from './npc-names.js';
import {PEOPLE} from './data.js';
import {CITIES,FACTIONS} from './reputation.js';

// A public projection, never the echo object itself. Pending hearsay keeps its
// recipient and wording private, even when the player has met that person.
const known=(s,id)=>id==='player'||!!(s&&knownNpcName(s,id))||!!(s?.people?.[id]?.metPlayer||s?.people?.[id]?.probed||s?.appearance?.faces?.[id]?.source==='通缉榜画像');
const name=(s,id,fallback='一人')=>id==='player'?'你':known(s,id)?npcName(s,id):fallback;
const revealed=e=>!!(e.delivered||e.announced||e.response);
const signed=n=>n>0?'+'+n:'−'+Math.abs(n);

// Fold only proven records of the same completed visit. Older saves have a
// placeholder card plus a separately dealt clue; matching prose alone is not
// enough to merge them. Keep saved facts intact and preserve causal anchors.
export function guidanceLedger(cards,deeds,{debug=false}={}){
 if(debug)return {cards,deeds};
 const hiddenCards=new Set(),hiddenDeeds=new Set(),anchors=new Map();
 const sameTime=(a,b)=>a.at!=null&&b.at!=null?a.at===b.at:a.day===b.day&&!!a.clock&&a.clock===b.clock;
 for(const visit of cards.filter(c=>c.actionTemplate==='guide')){
  const speaker=PEOPLE.find(p=>p.id===visit.speaker)?.name;if(!speaker||!visit.line)continue;
  const results=visit.event==='action:guide'?cards.filter(c=>!c.actionTemplate&&c.event&&c.speaker===visit.speaker&&c.line===visit.line):[visit];
  const matches=results.flatMap(card=>deeds.filter(d=>d.target===visit.speaker&&d.cause===visit.cause&&
   d.title==='上前提点'&&d.text===speaker+'当面提起「'+card.title+'」。'&&sameTime(d,card)&&!d.effects?.length&&
   (visit.deed==null||d.id===visit.deed)).map(deed=>({card,deed})));
  if(matches.length!==1)continue;
  const {card,deed}=matches[0];if(card!==visit)hiddenCards.add(visit.id);
  hiddenDeeds.add(deed.id);const ids=[deed.id];
  const start=deeds.find(d=>d.id===visit.cause&&d.target===visit.speaker&&d.title==='再度相逢'&&!d.effects?.length);
  if(start){hiddenDeeds.add(start.id);ids.push(start.id);}
  anchors.set(card.id,ids);
 }
 return {cards:cards.filter(c=>!hiddenCards.has(c.id)).map(c=>anchors.has(c.id)?{...c,ledgerAnchors:anchors.get(c.id)}:c),deeds:deeds.filter(d=>!hiddenDeeds.has(d.id))};
}

export function effectsHTML(s,effects,esc,{echo,label=true}={}){
 const parts=(effects||[]).flatMap(e=>{
  const subject=name(s,e.subject||'player','当时的面貌');
  const observer=echo?.template==='rumor_spread'&&!revealed(echo)?'听闻者':name(s,e.observer,'对方');
  let text;
  if(e.kind==='scrutiny')text=subject+'的面貌更易受到听闻者盘问';
  else if(!Number.isFinite(e.delta)||e.delta===0)return [];
  else if(e.kind==='relation')text=observer+'对'+subject+'的好感 '+signed(e.delta);
  else if(e.kind==='cityReputation')text=subject+'在'+(CITIES[e.city]||'当地')+'的声望 '+signed(e.delta);
  else if(e.kind==='factionReputation'){
   const faction=FACTIONS.find(f=>f.id===e.faction);
   text=subject+'在'+(faction&&!faction.secret?faction.name:'某势力')+'的声望 '+signed(e.delta);
  }else return [];
  const tone=e.kind==='scrutiny'?'future':e.delta<0?'loss':'gain';
  return `<span class="jh-effect ${tone}">${esc(text)}</span>`;
 });
 return parts.length?`<div class="jh-effects">${label?'<span class="jh-effect-label">已发生</span>':''}${parts.join('')}</div>`:'';
}

export function deedEffectsHTML(s,deed,esc){
 if(deed.effects)return effectsHTML(s,deed.effects,esc);
 // Old saves only kept the prose and requested rule amounts. Do not invent
 // historical deltas from today's relation, caps, claims or reputation.
 return deed.title==='冒名被识破'?'<small class="jh-effect-legacy">已卸下易容；旧记录未留好感与声望增减。</small>':'';
}

export function echoView(s,e){
 const actor=name(s,e.subject||'player','当时的面貌');
 const observer=e.template==='rumor_spread'&&!revealed(e)?'听闻者':name(s,e.who,e.template==='grudge'?'目击者':'对方');
 let fact,future;
 if(e.template==='rumor_spread'){
  fact=revealed(e)?observer+'听'+name(s,e.teller,'旁人')+'说起了'+actor+'的这件事。':'关于'+actor+'的这件事，已被一人听闻。';
  future='再见时可能被追问；可解释或道歉，有限缓和关系。';
 }else if(e.template==='grudge'){
  fact=observer+'记住了'+actor+'当时的举动。';
  future='再见时可能被当面追问；亲眼所见更难辩解。';
 }else if(e.template==='thanks_letter'){
  fact=observer+'记着'+actor+'的相助。';
  future=e.channel==='mail'&&!e.delivered?'谢意尚待送达；回应不会重复获奖。':'再见时可回应谢意，不会重复获奖。';
 }else{
  fact=observer+'将报失与先前持有记录联系起来，尚未定罪。';
  future='再见时可能核问物件来历；可请对方核对经手记录。';
 }
 if(e.subject&&e.subject!=='player')future='以当时面貌相见时，'+future.replace(/^再见时/,'');
 if(e.response)future=null;
 return {fact,future,observer,actor};
}

export function echoGroups(echoes){
 const groups=new Map();
 for(const e of echoes){const key=e.cause??'echo:'+e.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 return [...groups.values()];
}

export function echoGroupHTML(s,echoes,esc,{debug=false,link=true}={}){
 const first=echoes[0];if(!first)return '';
 const source=s?.chronicle?.deeds?.find(d=>d.id===first.cause);
 const title=(first.causeTitle||source?.title||'先前的经历')+(source?.target&&known(s,source.target)?' · '+name(s,source.target):'');
 const titleHTML=link&&s?.chronicle?.deeds?.some(d=>d.id===first.cause)?`<a href="#deed-${esc(first.cause)}">${esc(title)}</a>`:esc(title);
 return `<article class="jh-echo-group"><h4>${titleHTML}<span>余波</span></h4>${echoes.map(e=>{
  const view=echoView(s,e),legacy=!Array.isArray(e.effects)&&e.template==='rumor_spread';
  // A response is logged separately with its actual delta; keep the original
  // consequence visible here without counting the repair twice.
  const response=e.response?(e.response.delta>0?'态度有所缓和':e.response.delta<0?'关系进一步受损':'此事已回应'):null;
  return `<section class="jh-echo-entry"><p class="jh-echo-fact"><span class="jh-effect-label">已发生</span>${esc(view.fact)}</p>${effectsHTML(s,e.effects,esc,{echo:e,label:false})}${legacy?'<small class="jh-effect-legacy">传闻已记入对方记忆；旧记录未留好感增减。</small>':''}${view.future?`<p class="jh-effect future"><span>可能后续</span>${esc(view.future)}</p>`:`<p class="jh-echo-response">已回应 · ${esc(response)}</p>`}${revealed(e)&&e.line?`<p class="jh-echo-quote">${esc(view.observer)}：“${esc(e.line)}”</p>`:''}${debug?`<small class="jh-echo-debug">${e.ai?'AI 推演':'本地规则'}${e.reason?' · '+esc(e.reason):''}</small>`:''}</section>`;
 }).join('')}</article>`;
}
