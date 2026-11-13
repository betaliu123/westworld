import {icon} from './ui-icons.js';
import {createFeedbackQueue} from './progress-feedback.js';
import {ATTR} from './data.js';
import {mainPlayer,syncQuests,entryObjective} from './progress.js';
// Fallback reason for batched save-time changes; it says nothing, so the notice shows only the deltas.
const GENERIC_REASON='行动与身体状态变化';
export function mountProgressUI(getSim,esc,onQuests,onCodex,onMap){
 const dock=document.createElement('aside');dock.id='hud-right-stack';dock.hidden=true;
 const board=document.createElement('section');board.id='hero-progress';board.setAttribute('aria-label','主角重要属性');
 const notice=document.createElement('div');notice.id='attribute-change';notice.setAttribute('role','status');
 const info=document.createElement('aside');info.id='hud-info-stack';info.hidden=true;info.append(board,notice,document.getElementById('journal'));document.body.append(info,dock);
 // 金钱与非零嫌疑随地图坞排列；其余入口收进江湖录，旧按钮保留供快捷键调用。
 const actions=document.querySelector('.top-actions');
 const tasks=document.createElement('button');tasks.id='quests';tasks.innerHTML=icon('ScrollText');tasks.title='任务与线索';tasks.setAttribute('aria-label','任务与线索');tasks.onclick=onQuests;actions.append(tasks);
 const minimap=document.getElementById('minimap'),clock=document.getElementById('clock'),letters=document.getElementById('letters'),rest=document.getElementById('rest');clock.className='corner-clock';
 const legacy=document.createElement('div');legacy.className='legacy-actions';legacy.hidden=true;legacy.append(actions);
 const corner=document.createElement('div');corner.id='corner-dock';
 const resources=document.createElement('div');resources.className='corner-resources';
 const money=document.createElement('span');money.id='corner-money';money.innerHTML=icon('Coins')+'<b></b>';
 const wanted=document.createElement('span');wanted.id='corner-wanted';wanted.hidden=true;wanted.innerHTML=icon('Eye')+'<b></b>';
 resources.append(money,wanted);
 const row=document.createElement('div');row.className='corner-row';
 const codex=document.createElement('button');codex.id='codex-button';codex.innerHTML=icon('BookOpen')+'<i class="news-dot" aria-hidden="true"></i>';codex.title='江湖录 · J';codex.setAttribute('aria-label','江湖录');codex.dataset.tooltip='江湖录 · J';codex.classList.add('icon-button');codex.onclick=onCodex;
 row.append(codex,letters,rest);
 corner.append(minimap,clock,resources,row);dock.append(corner,legacy);
 minimap.querySelector('small')?.remove();
 const mapOpen=document.createElement('button');mapOpen.className='corner-map icon-button';mapOpen.innerHTML=icon('Compass');mapOpen.title='舆图 · M';mapOpen.setAttribute('aria-label','展开舆图');mapOpen.onclick=onMap;minimap.append(mapOpen);
 const guide=document.createElement('button');guide.title='操作说明';guide.setAttribute('aria-label',guide.title);guide.innerHTML=icon('Keyboard');actions.append(guide);
 guide.onclick=()=>document.body.classList.toggle('show-controls');
 const records=document.createElement('details');records.className='field-records';
 const ledger=document.createElement('summary');ledger.innerHTML=icon('BookOpen');ledger.title='江湖见闻与属性';ledger.setAttribute('aria-label',ledger.title);
 records.append(ledger,board,document.getElementById('journal'));info.append(records);
 records.addEventListener('toggle',()=>{ledger.innerHTML=icon(records.open?'X':'BookOpen');ledger.title=records.open?'收起属性与见闻':'江湖见闻与属性';ledger.setAttribute('aria-label',ledger.title);});
 document.addEventListener('keydown',e=>{if(e.code==='Escape')records.open=false;});
 const meters=document.createElement('div');meters.className='field-meters';
 meters.innerHTML=icon('Heart')+'<progress max="100" aria-label="气血"></progress>'+icon('Zap')+'<progress max="100" aria-label="体力"></progress>';info.append(meters);
 const tracked=document.createElement('button');tracked.id='tracked-quest';tracked.hidden=true;tracked.onclick=onQuests;document.getElementById('hud-left-stack').prepend(tracked);
 let signature='',shown=null;const feedback=createFeedbackQueue();
 return {update(started){dock.hidden=!started;info.hidden=!started;if(!started)return;const s=getSim().s,p=mainPlayer(s);syncQuests(s);const [hp,energy]=meters.querySelectorAll('progress');hp.value=p.hp;energy.value=p.energy;meters.title='气血 '+Math.ceil(p.hp)+' · 体力 '+Math.floor(p.energy);
 money.querySelector('b').textContent=p.money+'文';money.title='金钱 '+p.money+' 文';money.setAttribute('aria-label',money.title);
 wanted.hidden=!(s.wanted>0);wanted.querySelector('b').textContent=s.wanted;wanted.title='嫌疑 '+s.wanted;wanted.setAttribute('aria-label',wanted.title);
 const html=`<div class="hero-stats">${Object.entries(ATTR).map(([k,label])=>`<span title="${label}">${label}<b>${p.stats[k]}</b></span>`).join('')}</div>`;
 if(signature!==html){board.innerHTML=html;signature=html;}
 const latest=s.consequences?.at(-1),current=feedback.update(s,performance.now());
 if(current!==shown){shown=current;if(current)notice.innerHTML=`<b>${[...current.changes].sort((a,b)=>Number(['hp','energy'].includes(a.key))-Number(['hp','energy'].includes(b.key))).slice(0,3).map(c=>`<span class="${c.delta<0?'loss':'gain'}">${esc(c.label)} ${c.delta>0?'+':''}${c.delta}</span>`).join(' · ')}</b>${current.reason===GENERIC_REASON?'':`<small>${esc(current.reason)}</small>`}`;}
 notice.hidden=!current;
 board.title=(latest?latest.reason+'：'+latest.changes.map(c=>c.label+' '+(c.delta>0?'+':'')+c.delta).join('，'):'主角属性');
 const q=s.quests?.[s.trackedQuest];const entry=entryObjective(s);tracked.hidden=!q&&!entry;if(entry)tracked.innerHTML='<small>入城</small><span>'+esc(entry)+'</span>';if(q&&!['complete','closed'].includes(q.status))tracked.innerHTML=(entry?tracked.innerHTML:'')+`<small>${esc(q.title)}</small><span>${esc(q.objective)}</span>`;else if(!entry)tracked.hidden=true;
 if(tracked.dataset.key!==tracked.textContent){tracked.dataset.key=tracked.textContent;tracked.classList.add('fresh');clearTimeout(tracked.fadeTimer);tracked.fadeTimer=setTimeout(()=>tracked.classList.remove('fresh'),6000);}
 }};
}
