import {publicWantedNotices} from './wanted-records.js';
import {bountyTargets,bountyPreview} from './bounty.js';
import {npcName} from './npc-names.js';

export function wantedBoardMarkup(s,positions,obstacles,esc){
 const notices=publicWantedNotices(s),wanted=notices.filter(w=>w.status==='active');
 const html=notices.slice().reverse().map(w=>`<article class="wanted-notice"><b>${esc(w.description?.name||'形貌待核')}</b><span>${w.status==='active'?'悬赏 '+(w.reward||20)+' 文 · 须活口':'已到案'}</span><p>${esc(w.description?.text||'依榜文核对形貌')}</p><p>${esc(w.charges.map(c=>c.label+'：'+c.detail).join('；'))}</p>${w.status==='active'&&w.subject!=='player'?`<button data-warrant="${esc(w.id)}">${s.quests?.[w.id==='linxi-yan-theft'?'arrest-thief':'warrant:'+w.id]?'追踪此榜':'记下榜文'}</button>`:''}</article>`).join('');
 const targets=(s.chapterVersion===2?bountyTargets(s):[]).filter(id=>!bountyPreview(s,id,null,positions,obstacles,true).blocked);
 return `<div class="wanted-notices">${html||'<p>暂无榜文。</p>'}</div>${s.law?.handover?.board?'<p role="status">已请官差来接人，留在榜前等候。</p>':targets.map(id=>`<button data-bounty-target="${esc(id)}">押送${esc(npcName(s,id))}交差</button>`).join('')}${wanted.length?'<p>按榜核问；须将人带至榜前交官差，或押至六扇门。</p>':''}`;
}
