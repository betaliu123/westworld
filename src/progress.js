import {icon} from './ui-icons.js';
import {npcName} from './npc-names.js';
import {ATTR,PEOPLE} from './data.js';
import {knownFaces,restoreKnownFaces} from './appearance.js';
import {CITIES,FACTIONS,reputation,factionRep,knownFactions} from './reputation.js';
import {syncGenyue,genyueRoutes} from './genyue.js';
import {syncLedgerQuest} from './ledger-case.js';
import {syncOpeningLeads} from './qinghe-leads.js';
export function entryObjective(s){
 if(s.event?.type!=='gate'||s.facts.enteredCity)return '';
 const phase=s.event.gate?.phase,bag=s.player.inventory;
 if(['prison','testimony'].includes(phase))return '在牢中等候释放，或听听同牢人的来历。';
 if(['exposed','fight'].includes(phase))return '先应付眼前的盘问。';
 if(s.chapterVersion===2){if(s.player.disguise==='runner')return s.facts.runnerNameKnown?'身着差服，已知陈小乙之名。':s.facts.runnerCollarSeen?'身着差服，尚不知衣领旧名。':'身着旧差役服，尚未获准入城。';if(bag.includes('他人的路引'))return s.facts.knownNames?.gate_merchant?'路引在身，已知赵成之名。':'路引在行囊中，尚未核清姓名。';if(bag.includes('旧差役服'))return '旧差役服已收进包裹。';return s.facts.entryRulesKnown?'花石纲先行，关口正在查验凭据。':'关口封着，尚未获准入城。';}
 if(s.player.disguise==='runner')return '已换差役服，可去关口应答。';
 if(bag.includes('改名路引'))return '路引已改名，原官印仍在。去关口应答。';
 if(bag.includes('他人的路引'))return '路引有官印，但名字不是你的。';
 return '正门查验：路引须有官印，姓名须对得上。';
}
export function syncQuests(s){
 s.quests??={};
 if(s.chapterVersion===2){syncLedgerQuest(s);syncGenyue(s);syncOpeningLeads(s);return Object.values(s.quests);}
 const has=s.facts.taxLedgerLead||s.intelligence?.clues?.ledger||s.player.inventory.includes('狱友口供：东街副账');
 if(has&&!s.quests.ledger){s.quests.ledger={id:'ledger',title:'东街副账',status:'active',source:'旧账房证言',day:s.day,objective:'调查东街税课司，寻找未上报的副账',note:'已知去向，尚未取得账本。证言不能代替实证。'};s.trackedQuest??='ledger';}
 return Object.values(s.quests);
}
export function mainPlayer(s){return s.party?.members?.main||s.player;}
export function progressSnapshot(s){const p=mainPlayer(s),v={...p.stats,hp:Math.round(p.hp),energy:Math.round(p.energy),money:p.money,xp:p.xp,reputation:s.reputation,wanted:s.wanted};
 v.faces=knownFaces(s).length;
 if(s.chapterVersion===2){const r=reputation(s);delete v.reputation;for(const id of Object.keys(CITIES))v['city:'+id]=r.cities[id]||0;for(const h of FACTIONS)v['faction:'+h.id]=factionRep(s,h.id);}
 for(const [id,n]of Object.entries(s.people))v['relation:'+id]=n.relation;
 for(const id of ['social','theft','combat'])v['growth:'+id]=p.growth?.[id]?.xp||0;
 for(const item of p.inventory)v['item:'+item]=(v['item:'+item]||0)+1;
 for(const item of s.ecosystem?.items||[])if(item.location==='player'&&!item.storyId&&item.type!=='ring')v['item:'+item.name]=(v['item:'+item.name]||0)+1;
 return v;
}
const LABELS={...ATTR,hp:'气血',energy:'体力',money:'盘缠',xp:'阅历',reputation:'声望',wanted:'嫌疑',faces:'可易容面貌'};
function progressLabel(s,key){return LABELS[key]||(key.startsWith('city:')?(CITIES[key.slice(5)]||'地方')+'声望':key.startsWith('faction:')?(knownFactions(s).find(h=>h.id===key.slice(8))?.name||'势力')+'声望':key.startsWith('item:')?key.slice(5):key.startsWith('relation:')?npcName(s,key.slice(9))+'好感':({social:'交涉历练',theft:'偷窃历练',combat:'战斗历练'}[key.slice(7)]||'历练'));}
export function actorDeltas(changes){return changes.flatMap(({key,delta,label})=>(['reputation','faces'].includes(key)||key.startsWith('city:')||key.startsWith('faction:')||Object.hasOwn(ATTR,key))?[{id:'player',label:label||LABELS[key],delta}]:key.startsWith('relation:')?[{id:key.slice(9),label:'好感',delta}]:[]);}
export function observeProgress(sim,reason){
 const s=sim.s;
 // Conversation/probe knowledge and its usable face belong to the same action.
 // Waiting for the wardrobe's proximity scan batches old unlocks into a later visit.
 restoreKnownFaces(s);
 const next=progressSnapshot(s),prev=sim.progressBaseline||next;sim.progressBaseline=next;
 const changes=[...new Set([...Object.keys(prev),...Object.keys(next)])].map(k=>[k,next[k]??0]).filter(([k,v])=>Number.isFinite(v)&&v!==(prev[k]??0)).map(([key,value])=>({key,value,delta:value-(prev[key]??0),label:progressLabel(s,key)}));
 if(changes.length){s.consequences??=[];s.consequences.push({id:(s.consequenceSeq=(s.consequenceSeq||0)+1),day:s.day,reason,changes});s.consequences=s.consequences.slice(-60);const deltas=actorDeltas(changes);if(deltas.length)sim.emit?.('actorDeltas',deltas);}
 syncQuests(s);return changes;
}
export function imprisonmentCost(sim){const q=sim.event.gate??={};if(q.imprisonmentCost)return; q.imprisonmentCost=true;
 const p=mainPlayer(sim.s);p.stats.charm=Math.max(0,p.stats.charm-3);observeProgress(sim,'被捕入狱：囚徒身份损及风仪');
}
export function questsHTML(s,esc){
 const quests=syncQuests(s),main=s.quests?.genyue,routes=genyueRoutes(s);
 const track=q=>q.status==='complete'||q.status==='closed'?'':`<button data-track="${esc(q.id)}" aria-pressed="${s.trackedQuest===q.id}">${s.trackedQuest===q.id?'取消追踪':'追踪'}</button>`;
 const mainHTML=main?`<article class="quest-card genyue-goal"><small>主线</small><h3>${esc(main.title)}</h3><p>${esc(main.objective)}</p>${routes.length?`<ul class="genyue-routes">${routes.map(r=>`<li${r.closed?' class="route-closed"':''}><b>${esc(r.title)}</b>${r.closed?'':`<button class="route-visit" data-teacher="${esc(r.id)}" aria-label="寻访${esc(npcName(s,r.id))}" title="寻访${esc(npcName(s,r.id))}">${icon('Compass')}</button>`}<span>${esc(r.detail)}</span><small>${r.rumor?'听闻':'问自'} · ${esc(r.source)}${r.closed?' · 已关闭':''}</small></li>`).join('')}</ul>`:''}<small>${esc(main.note)}</small>${track(main)}</article>`:'';
 const entry=entryObjective(s)?'<article class="quest-card"><small>主线</small><h3>入城</h3><p>'+esc(entryObjective(s))+'</p></article>':'';
 const other=quests.filter(q=>q.id!=='genyue'&&!(main&&q.id==='royal')).map(q=>`<article class="quest-card"><small>${q.status==='complete'?'已了':q.status==='closed'?'已关闭':'线索'} · ${esc(q.source||'亲历')}</small><h3>${esc(q.title)}</h3><p>${esc(q.objective)}</p>${q.note?`<small>${esc(q.note)}</small>`:''}${track(q)}</article>`).join('');
 return mainHTML+entry+other||'<p>尚未掌握可追查的线索。</p>';
}
