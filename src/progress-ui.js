import {createFeedbackQueue} from './progress-feedback.js';
import {ATTR} from './data.js';
import {mainPlayer,syncQuests} from './progress.js';
export function mountProgressUI(getSim,esc,onQuests){
 const dock=document.createElement('aside');dock.id='hud-right-stack';dock.hidden=true;
 const board=document.createElement('section');board.id='hero-progress';board.setAttribute('aria-label','主角重要属性');
 const notice=document.createElement('div');notice.id='attribute-change';notice.setAttribute('role','status');
 const info=document.createElement('aside');info.id='hud-info-stack';info.hidden=true;info.append(board,notice,document.getElementById('journal'));document.body.append(info,dock);
 const actions=document.querySelector('.top-actions');dock.append(actions,document.getElementById('minimap'));
 const tasks=document.createElement('button');tasks.id='quests';tasks.textContent='📜';tasks.title='任务与线索';tasks.setAttribute('aria-label','任务与线索');tasks.onclick=onQuests;actions.append(tasks);
 const tracked=document.createElement('button');tracked.id='tracked-quest';tracked.hidden=true;tracked.onclick=onQuests;document.getElementById('hud-left-stack').prepend(tracked);
 let signature='',shown=null;const feedback=createFeedbackQueue();
 return {update(started){dock.hidden=!started;info.hidden=!started;if(!started)return;const s=getSim().s,p=mainPlayer(s);syncQuests(s);
 const html=`<small>少侠 · ${s.facts.career==='court'?'六扇门捕快':s.facts.career==='gang'?'赤砂帮外堂弟子':'主角'}</small><div class="hero-stats">${Object.entries(ATTR).map(([k,label])=>`<span title="${label}">${label}<b>${p.stats[k]}</b></span>`).join('')}</div><div class="hero-resources"><span>♥ ${Math.ceil(p.hp)}</span><span>⚡ ${Math.floor(p.energy)}</span><span>◈ ${p.money}文</span><span>声望 ${s.reputation}</span><span>嫌疑 ${s.wanted}</span></div>`;
 if(signature!==html){board.innerHTML=html;signature=html;}
 const latest=s.consequences?.at(-1),current=feedback.update(s,performance.now());
 if(current!==shown){shown=current;if(current)notice.innerHTML=`<b>${[...current.changes].sort((a,b)=>Number(['hp','energy'].includes(a.key))-Number(['hp','energy'].includes(b.key))).slice(0,3).map(c=>`<span class="${c.delta<0?'loss':'gain'}">${esc(c.label)} ${c.delta>0?'+':''}${c.delta}</span>`).join(' · ')}</b><small>${esc(current.reason)}</small>`;}
 notice.hidden=!current;
 board.title=(latest?latest.reason+'：'+latest.changes.map(c=>c.label+' '+(c.delta>0?'+':'')+c.delta).join('，'):'主角属性');
 const q=s.quests?.[s.trackedQuest];tracked.hidden=!q;if(q)tracked.innerHTML=`<small>调查 · ${esc(q.title)}</small><span>${esc(q.objective)}</span>`;
 }};
}
