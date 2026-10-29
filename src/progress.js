import {ATTR,PEOPLE} from './data.js';
export function syncQuests(s){
 s.quests??={};
 const has=s.facts.taxLedgerLead||s.intelligence?.clues?.ledger||s.player.inventory.includes('狱友口供：东街副账');
 if(has&&!s.quests.ledger){s.quests.ledger={id:'ledger',title:'东街副账',status:'active',source:'旧账房证言',day:s.day,objective:'调查东街税课司，寻找未上报的副账',note:'已知去向，尚未取得账本。证言不能代替实证。'};s.trackedQuest??='ledger';}
 return Object.values(s.quests);
}
export function mainPlayer(s){return s.party?.members?.main||s.player;}
export function progressSnapshot(s){const p=mainPlayer(s),v={...p.stats,hp:Math.round(p.hp),energy:Math.round(p.energy),money:p.money,xp:p.xp,reputation:s.reputation,wanted:s.wanted};
 for(const [id,n]of Object.entries(s.people))v['relation:'+id]=n.relation;
 for(const id of ['social','theft','combat'])v['growth:'+id]=p.growth?.[id]?.xp||0;
 for(const item of p.inventory)v['item:'+item]=(v['item:'+item]||0)+1;
 for(const item of s.ecosystem?.items||[])if(item.location==='player'&&!item.storyId&&item.type!=='ring')v['item:'+item.name]=(v['item:'+item.name]||0)+1;
 return v;
}
const LABELS={...ATTR,hp:'气血',energy:'体力',money:'盘缠',xp:'阅历',reputation:'声望',wanted:'嫌疑'};
export function observeProgress(sim,reason){
 const s=sim.s,next=progressSnapshot(s),prev=sim.progressBaseline||next;sim.progressBaseline=next;
 const changes=[...new Set([...Object.keys(prev),...Object.keys(next)])].map(k=>[k,next[k]??0]).filter(([k,v])=>Number.isFinite(v)&&v!==(prev[k]??0)).map(([key,value])=>({key,value,delta:value-(prev[key]??0),label:LABELS[key]||(key.startsWith('item:')?key.slice(5):key.startsWith('relation:')?(PEOPLE.find(n=>n.id===key.slice(9))?.name||'人物')+'好感':({social:'交涉历练',theft:'偷窃历练',combat:'战斗历练'}[key.slice(7)]||'历练'))}));
 if(changes.length){s.consequences??=[];s.consequences.push({id:(s.consequenceSeq=(s.consequenceSeq||0)+1),day:s.day,reason,changes});s.consequences=s.consequences.slice(-60);}
 syncQuests(s);return changes;
}
export function imprisonmentCost(sim){const q=sim.event.gate??={};if(q.imprisonmentCost)return; q.imprisonmentCost=true;
 const p=mainPlayer(sim.s);p.stats.charm=Math.max(0,p.stats.charm-3);observeProgress(sim,'被捕入狱：囚徒身份损及风仪');
}
export function questsHTML(s,esc){const quests=syncQuests(s);return `<p>线索、下一步与来源会随经历保存。</p>${quests.map(q=>`<article class="quest-card"><small>调查 · 第 ${q.day} 日 · ${esc(q.source)}</small><h3>${esc(q.title)}</h3><p>${esc(q.objective)}</p><small>${esc(q.note)}</small><p><button data-track="${esc(q.id)}">${s.trackedQuest===q.id?'取消追踪':'追踪任务'}</button></p></article>`).join('')||'<p>尚未掌握可追查的线索。</p>'}`;}
