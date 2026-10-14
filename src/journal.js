import {PEOPLE} from './data.js';
// A bounded, saved journal of what has already happened, never future templates.
export function createJournal(getState,escape){
 const root=document.getElementById('journal'),list=document.getElementById('journal-lines'),latest=document.getElementById('journal-latest');let filter='all',unread=0;
 const entries=()=>getState().journal??=[];
 const atBottom=()=>list.scrollHeight-list.scrollTop-list.clientHeight<24;
 function render(follow=true){const top=list.scrollTop;list.innerHTML=entries().filter(e=>filter==='all'||e.kind===filter).map(e=>`<p class="journal-${e.kind}"><time>第${e.day}日</time> <b>${escape(e.name)}</b><span>${escape(e.text)}</span></p>`).join('')||'<p class="journal-empty">这里会留下对白与江湖见闻。</p>';if(follow){list.scrollTop=list.scrollHeight;unread=0;latest.hidden=true;}else list.scrollTop=top;}
 function add(kind,name,text,key){if(!text)return;const rows=entries();if(key&&rows.some(e=>e.key===key))return;const follow=atBottom()&&!root.classList.contains('collapsed');rows.push({day:getState().day,kind,name,text:String(text),key});if(rows.length>200)rows.splice(0,rows.length-200);render(follow);if(!follow){unread++;latest.textContent=`${unread} 条新记录 ↓`;latest.hidden=false;}}
 root.querySelector('[data-collapse]').onclick=()=>{const collapsed=root.classList.toggle('collapsed');root.querySelector('[data-collapse]').textContent=collapsed?'展开':'收起';root.querySelector('[data-collapse]').setAttribute('aria-expanded',String(!collapsed));if(!collapsed)render();};
 for(const b of root.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;for(const t of root.querySelectorAll('[data-filter]'))t.setAttribute('aria-pressed',String(t===b));render();};
 latest.onclick=()=>render();list.onscroll=()=>{if(atBottom()){unread=0;latest.hidden=true;}};
 root.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Space','Enter'].includes(e.code))e.stopPropagation();});
 return {add,restore(){if(!getState().journal){getState().journal=[];for(const [i,h]of (getState().history||[]).slice(-20).entries()){if(h.type==='conversation')getState().journal.push({day:h.day,kind:'chat',name:'你',text:h.label});else getState().journal.push({day:h.day,kind:'system',name:'往事',text:h.text});for(const d of h.dialogue||[])getState().journal.push({day:h.day,kind:'chat',name:PEOPLE.find(n=>n.id===d.id)?.name||d.id,text:d.text});}}root.hidden=false;render();}};
}
