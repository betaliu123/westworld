import {mountParty} from './party.js';
import {mountEnvironment} from './environment-ui.js';
import {createJournal} from './journal.js';
import {Simulation,newGame} from './simulation.js';
import {World} from './world.js';
import {BONUS} from './action-contracts.js';
import {GROUPS,groupActions,bubbleLayout} from './interaction.js';
import {ATTR,ROLES,PEOPLE,SCENES} from './data.js';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SAVE='jianghu-echoes-v1';let saved=null;try{const v=JSON.parse(localStorage.getItem(SAVE));if(v?.version===1&&v.player&&v.people)saved=v;}catch{}
let restartConfirmed=false;
let role='wanderer',sim=new Simulation(saved||newGame()),world=new World($('world'),sim),started=false,panelTarget=null,more=false,ranked=null,epoch=0,sound=false,audio=null,lastSpeech='',lastSpeechAt=0,resultTimer,aiStatus='正在连接';
const journal=createJournal(()=>sim.s,esc);
const environment=mountEnvironment(world,()=>sim,toast,esc);
const party=mountParty(world,()=>sim,environment,toast,journal,closePanel);
const historyLog=[];let bubbleGroup=null,bubblePage=0,bubbleEvent=null,visualResult=null;let speechQueue=[];let reactionTicket=0;

function toast(text){if(started&&!text.startsWith('你：'))journal.add('system','提示',text);const el=document.createElement('div');el.className='toast';el.textContent=text;$('toast').append(el);setTimeout(()=>el.remove(),4800);}
function save(){if(!started)return;try{localStorage.setItem(SAVE,JSON.stringify(sim.s));}catch{toast('浏览器空间不足，暂时无法保存。');}}
function tone(kind){if(!sound)return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type=kind==='attack'?'sawtooth':'sine';o.frequency.setValueAtTime(kind==='attack'?220:kind==='mail'?780:340,audio.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='attack'?60:500,audio.currentTime+.18);g.gain.setValueAtTime(kind==='attack'?.025:.05,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.3);o.start();o.stop(audio.currentTime+.3);}catch{}}
function speak(text){if(!sound||!window.speechSynthesis||text===lastSpeech||performance.now()-lastSpeechAt<6500)return;const voices=speechSynthesis.getVoices(),v=voices.find(v=>/^zh/i.test(v.lang));if(!v)return;lastSpeech=text;lastSpeechAt=performance.now();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=v;utterance.lang='zh-CN';utterance.rate=.95;utterance.volume=.7;speechSynthesis.speak(utterance);}
function bind(){sim.listeners.push((type,data)=>{
 if(type==='save')save();
 if(type==='streetResult'){showResult(data);sim.prepareReaction(data,sim.s.street.active.cast);data.reactionContext.recentEvents=[];generateReaction(data);}
 if(type==='sandbox'){journal.add('system','江湖动静',data.text);if(data.ai&&data.dialogue.length){const r={day:sim.s.day,type:'environment',label:data.text.slice(0,45),kind:'environment',success:true,text:data.text,changes:[],dialogue:data.dialogue,motion:'talk',reactionSource:'local'};sim.s.history.push(r);sim.prepareReaction(r,data.dialogue.map(d=>d.id));r.reactionContext.recentEvents=[];r.reactionContext.knowledge='只知道 settled 中已观察到的事情。未知原因的食物中毒不能指认玩家。不能取消既定动作、物品转移和数值。';generateReaction(r);}else if(data.dialogue.length)queueSpeech(data.dialogue);}
 if(type==='speech')queueSpeech(data);
 if(type==='searchDecision')decideSearch(data);
 if(type==='mail'){journal.add('chat',PEOPLE.find(n=>n.id===data.sender)?.name+' · 来信',data.text);tone('mail');toast(`${PEOPLE.find(n=>n.id===data.sender).name} 托飞鸽捎来一封信`);}
 if(type==='scene'){journal.add('system','现场',data?SCENES[data.type].intro:'人群渐渐散去。');closePanel();world.syncEvent();if(data?.type==='ring_quarrel')queueSpeech([{id:'su',text:'怎么连戒指都会弄丢？你答应的事也这样吗？'},{id:'shen',text:'我找遍了，这不是我不在意！'}]);}
 if(type==='day')toast(`第 ${data} 日 · 天光又起，镇上有了新的动静。`);
 if(type==='violence'){tone('attack');toast(data.down?'对方倒地，暂时失去行动能力。':'街坊惊呼，有人望向了捕头。');}
 if(type==='result'){if(data.type==='conversation')journal.add('chat','你',data.label);if(data.type!=='conversation'||data.roll!==null||data.changes.length)journal.add('system',data.label,`${data.roll!=null?`检定 ${data.roll}/${data.check.chance} · ${data.success?'成功':'失败'}。`:''}${data.text}${data.changes.length?'（'+data.changes.join('，')+'）':''}`);generateReaction(data);const fromMenu=!!panelTarget;closePanel();if(fromMenu)visualResult=data;else if(data.type==='conversation'&&data.roll===null&&!data.changes.length){$('result').hidden=true;toast('你：'+data.label);}else showResult(data);world.reaction={kind:data.kind,success:data.success,until:world.t+3};world.burst(world.hero.position.x,1.3,world.hero.position.z,data.success?0xe7ce92:0xbc735b,10);}
 if(type==='npc'){journal.add('system','交互',data.reaction?.text||data.text);tone('mail');if(data.reaction)generateReaction(data.reaction);else queueSpeech([{id:data.id,text:data.text}]);}
 if(type==='break')tone('attack');
 });world.onPerformanceEnd=()=>{if(visualResult){showResult(visualResult);visualResult=null;}};world.onReady=()=>toast(world.combatReady?'已拔刀 · 左键出招，/ 收刀':'已收刀');world.onSound=tone;world.onArrive=()=>toast('已到附近。可以继续走动，按 E 才会介入。');world.onHurt=()=>{if(sim.s.player.hp===0){closePanel();closeDrawer();world.clearReady();world.attackTime=0;world.keys.clear();world.auto=null;save();toast('你受伤倒地。按 R 调息至次日，再入江湖。');}};}
bind();
function roleCards(){$('roles').innerHTML=Object.entries(ROLES).map(([id,r])=>`<button class="role ${role===id?'active':''}" data-role="${id}"><b>${r.name}</b><small>${r.desc}</small></button>`).join('');}
roleCards();$('roles').onclick=e=>{const b=e.target.closest('[data-role]');if(b){role=b.dataset.role;roleCards();}};
$('continue').hidden=!saved;if(saved)$('continue').textContent=`续上前缘 · 第 ${saved.day} 日`;
function begin(resume){
 if(!resume&&saved&&!restartConfirmed){restartConfirmed=true;$('start').textContent='确认重开 · 替换这个原型的进度';return;}
 if(!resume){sim=new Simulation(newGame(role));world.sim=sim;world.hero.position.set(0,0,14);world.syncEvent();bind();}
 started=true;journal.restore();$('welcome').hidden=true;for(const id of ['hud','vitals','controls','minimap','conversation'])$(id).hidden=false;save();toast(resume?'旧日的人情与风波都还在。继续你的江湖。':'你来到临溪。桥头传来起哄声……按 E 与身边人交互。');
}
$('start').onclick=()=>begin(false);$('continue').onclick=()=>begin(true);
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='声音 · '+(sound?'开':'关');if(sound){tone('mail');toast('已开启动作提示音；系统有中文语音时，将读出人物对白。');}else window.speechSynthesis?.cancel();};
function closePanel(){world.clearReady();epoch++;panelTarget=null;$('panel').hidden=true;world.locked=!$('drawer').hidden;document.body.classList.toggle('panel-open',!$('drawer').hidden);}
function closeDrawer(){world.clearReady();$('drawer').hidden=true;world.locked=false;world.keys.clear();document.body.classList.remove('panel-open');}
function drawer(title,content){closePanel();$('drawer').hidden=false;world.locked=true;world.keys.clear();document.body.classList.add('panel-open');$('drawer').innerHTML=`<header>临溪 · 随身记事<button data-close aria-label="关闭记录">×</button></header><h2>${title}</h2>${content}`;$('drawer').querySelector('[data-close]').onclick=closeDrawer;}
function inbox(){const s=sim.s;drawer('飞鸽传书',s.mail.length?[...s.mail].reverse().map(m=>`<article class="letter"><small>${esc(PEOPLE.find(n=>n.id===m.sender).name)} · 第 ${m.day} 日</small><p>${esc(m.text)}</p><button data-route="${m.id}">⌖ ${esc(m.place)} · 前往附近</button></article>`).join(''):'<p>尚无来信。街坊的消息，会在这里留下。</p><p>你也可以自己去桥头看看，不必等待别人邀请。</p>');for(const m of s.mail)m.read=true;save();for(const b of $('drawer').querySelectorAll('[data-route]'))b.onclick=()=>{const m=s.mail.find(m=>m.id===Number(b.dataset.route));closeDrawer();if(m.id!==sim.event?.id){toast('这是以前的来信。人和事也许已经变了。');return;}if(world.routeTo(m.point))toast('沿街前往 · 按 WASD 可随时中止');else toast('前路不通，请绕行。');};}
$('letters').onclick=()=>!$('drawer').hidden?closeDrawer():inbox();
const MOODS={calm:'平和',wary:'戒备',angry:'恼怒',afraid:'惊惧',down:'倒地'};
const STAT_HELP={might:'武力、护送与威吓',agility:'取物、轻身与舞剑',charm:'说服、结交与表达心意',wit:'观察、倾听与辨别线索'};
function liveNumber(key,value){return `<b data-number="${key}">${value}</b>`;}
function openProfile(){
 const s=sim.s,p=s.player;
 drawer('人物属性',`<p>${s.party.active==='companion'?'阿笙 · 同行':ROLES[s.role].name} · 当前控制角色的属性</p><div class="stat-grid">${Object.entries(ATTR).map(([k,v])=>`<span>${v}${liveNumber(k,p.stats[k])}<small>${STAT_HELP[k]}</small></span>`).join('')}</div><div class="profile-values"><span>气血 ${liveNumber('hp',Math.ceil(p.hp))} / 100</span><span>体力 ${liveNumber('energy',Math.floor(p.energy))} / 100</span><span>盘缠 ${liveNumber('money',p.money)} 文</span><span>阅历 ${liveNumber('xp',p.xp)}</span><span>青竹会声望 ${liveNumber('reputation',s.reputation)}</span><span>当前嫌疑 ${liveNumber('wanted',s.wanted)}</span></div><p>检定概率由属性、难度与关系共同决定，选择气泡里显示的是本次实际成功率。</p><h2>行囊</h2><p>${p.inventory.includes('ring')?'一枚银戒、':' '}佩剑、路引、旧行囊</p><h2>故人与好感</h2>${PEOPLE.map(n=>`<div class="relation-row"><span>${n.name}<small data-mood="${n.id}">${MOODS[s.people[n.id].mood]||'平和'}</small></span>${liveNumber('relation-'+n.id,s.people[n.id].relation)}</div>`).join('')}<h2>行过的路</h2>${s.history.slice(-8).reverse().map(h=>`<article class="letter"><small>第 ${h.day} 日 · ${esc(h.label)}</small><p>${esc(h.text)}</p><small>${h.reactionSource==='nlp'?'人物反应 · AI 推演':'人物反应 · 本地演出'}</small>${(h.dialogue||[]).map(d=>`<p>${esc(PEOPLE.find(n=>n.id===d.id)?.name)}：“${esc(d.text)}”</p>`).join('')}</article>`).join('')||'<p>尚未留下故事。</p>'}`);
}
$('profile').onclick=()=>!$('drawer').hidden&&$('drawer').querySelector('[data-number]')?closeDrawer():openProfile();
function updateProfile(){
 if($('drawer').hidden)return;const s=sim.s,p=s.player,values={...p.stats,hp:Math.ceil(p.hp),energy:Math.floor(p.energy),money:p.money,xp:p.xp,reputation:s.reputation,wanted:s.wanted};
 for(const [id,n]of Object.entries(s.people))values['relation-'+id]=n.relation;
 for(const el of $('drawer').querySelectorAll('[data-number]'))el.textContent=values[el.dataset.number];
 for(const el of $('drawer').querySelectorAll('[data-mood]'))el.textContent=MOODS[s.people[el.dataset.mood].mood]||'平和';
}
function queueSpeech(lines){
 for(const line of lines)journal.add('chat',PEOPLE.find(n=>n.id===line.id)?.name||line.id,line.text);
 let at=world.t+.35;speechQueue=lines.filter(line=>world.npcs.has(line.id)).map(line=>{const duration=Math.max(3.8,Math.min(6,line.text.length*.14));const entry={...line,start:at,end:at+duration,spoken:false};at+=duration+.3;return entry;});
}
function updateSpeech(){
 speechQueue=speechQueue.filter(line=>line.end>world.t);
 const line=speechQueue.find(line=>line.start<=world.t),el=$('npc-speech');
 world.speaking=line?.id||null;if(!line){el.hidden=true;return;}
 const n=world.npcs.get(line.id),point=n.actor.position.clone();point.y+=3.25;const screen=world.screenPoint(point);
 el.hidden=!started||!screen.visible||screen.x<0||screen.x>innerWidth||screen.y<0||screen.y>innerHeight;
 if(el.hidden)return;
 if(el.dataset.line!==line.start+line.id){el.dataset.line=line.start+line.id;el.innerHTML=`<b>${esc(n.person.name)}</b><span>${esc(line.text)}</span>`;}
 el.style.left=Math.max(135,Math.min(innerWidth-135,screen.x))+'px';el.style.top=Math.max(90,screen.y)+'px';
 if(!line.spoken){speak(line.text);line.spoken=true;}
}
async function generateReaction(result){
 const owner=sim,ticket=++reactionTicket;let delivered=false;
 const deliver=()=>{if(delivered||ticket!==reactionTicket||owner!==sim)return;delivered=true;queueSpeech(result.dialogue||[]);};
 const fallback=setTimeout(deliver,5500);
 try{
 const response=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result.reactionContext),signal:AbortSignal.timeout(14000)});
 if(response.ok){const data=await response.json();if(owner===sim)owner.applyReaction(result.reactionId,data);}
 }catch{}finally{clearTimeout(fallback);deliver();}
}

async function decideSearch(context){const owner=sim;try{const response=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(context),signal:AbortSignal.timeout(10000)});if(response.ok&&sim===owner)owner.applySearchDecision(context.eventId,context.round,await response.json());}catch{}}
let replySignature='',replyTargetManual=false,draftTarget=null;
function nearbySpeakers(){return [...world.npcs].filter(([id,n])=>sim.s.people[id].hp>0&&Math.hypot(n.actor.position.x-world.hero.position.x,n.actor.position.z-world.hero.position.z)<8).map(([id])=>id);}
function updateConversation(){
 const ids=nearbySpeakers(),select=$('reply-target'),selected=select.value;
 if([...select.options].map(o=>o.value).join()!==ids.join()){select.innerHTML=ids.map(id=>`<option value="${id}">${esc(PEOPLE.find(n=>n.id===id).name)}</option>`).join('');if(ids.includes(selected))select.value=selected;}
 if(!replyTargetManual&&world.speaking&&ids.includes(world.speaking))select.value=world.speaking;
 const disabled=!ids.length||sim.s.player.hp<=0;$('reply-input').disabled=disabled;$('reply-form').querySelector('[type="submit"]').disabled=disabled;
 $('weapon-toggle').textContent=world.combatReady?'/ 收刀':'/ 拔刀';
 $('reply-status').textContent=disabled?'走近人物后，可以直接回应。':'与'+PEOPLE.find(n=>n.id===select.value)?.name+'交谈 · 输入时暂停移动，Esc 返回游玩';
 const signature=[select.value,sim.s.facts.missing,sim.s.player.inventory.includes('ring'),sim.event?.type].join(':');if(signature===replySignature)return;replySignature=signature;
 const replies=!ids.length?[]:sim.s.facts.missing?['我没看见那枚戒指。','我帮你一起找找。',...(sim.s.player.inventory.includes('ring')?['戒指是我拿走的。','我把银戒还给你。']:[]),'别吵，先冷静一下。']:['刚才的事，你怎么看？','别着急，慢慢说。','近来可有什么消息？'];
 $('reply-suggestions').innerHTML=replies.slice(0,4).map(t=>`<button type="button">${esc(t)}</button>`).join('');
 for(const b of $('reply-suggestions').children)b.onclick=()=>sendReply(b.textContent);
}
function sendReply(text,target=null){
 const id=target||$('reply-target').value;if(!started||world.locked||!nearbySpeakers().includes(id)||world.performance||sim.s.player.hp<=0){toast('等当前动作做完，走近对方再说。');return;}
 text=text.trim();if(!text)return;closePanel();world.clearReady();world.keys.clear();$('reply-input').blur();const r=sim.reply(id,text);if(r.error){toast(r.error);return;}world.perform({id:r.actionId,kind:r.kind},id);world.performance.motion=r.motion;$('reply-input').value='';replyTargetManual=false;
}
$('reply-target').onchange=()=>{replyTargetManual=true;};
$('reply-input').onfocus=()=>{draftTarget=$('reply-target').value;replyTargetManual=true;world.keys.clear();world.auto=null;world.clearReady();};
$('reply-input').onblur=()=>world.keys.clear();
$('reply-input').onkeydown=e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();};
$('reply-form').onsubmit=e=>{e.preventDefault();sendReply($('reply-input').value,draftTarget);};
$('weapon-toggle').onclick=()=>{document.activeElement?.blur();world.toggleWeapon();};

function rest(){if(sim.s.player.hp>0&&[...world.npcs].some(([id,n])=>sim.isPursuing(id,n.actor.position.distanceTo(world.hero.position)))){toast('有人正在追赶你，先离开冲突再歇息。');return;}closePanel();closeDrawer();world.auto=null;world.keys.clear();$('result').hidden=true;const revived=sim.respawn();if(!revived)sim.advanceDay();world.resetAfterRest();if(revived)toast('你已调息醒来。这场争斗已散，旧日的人情仍在。');save();}
$('rest').onclick=rest;
function showResult(r){$('result').hidden=false;$('result').innerHTML=`<div class="check">${r.roll??'✓'}<small>${r.roll===null?'直接行动':`D100 · 需 ≤ ${r.check.chance}`}</small></div><small class="result-action">${esc(r.label)}</small><h3>${r.roll===null?'这一刻，留下了回声':r.success?'此举得手':'未能如愿'}</h3><p>${esc(r.text)}</p>${r.changes.map(x=>`<span class="pill ${/\+/.test(x)?'gain':''}">${esc(x)}</span>`).join('')}<p class="hint">${esc(r.hint)}</p>`;clearTimeout(resultTimer);resultTimer=setTimeout(()=>$('result').hidden=true,8500);tone(r.success?'mail':'attack');speak(r.text);}
function choice(a){const p=sim.preview(a);return `<button class="choice" data-choice="${a.id}" ${p.blocked?'disabled':''}><span><b>${esc(a.label)}</b><small>${a.stat?`${ATTR[a.stat]} ${p.score} · 难度 ${a.difficulty}`:'无需检定'}${a.cost?` · ${a.cost} 文`:''}</small></span><em>${p.blocked?'不足':p.certain?'必成':p.chance+'%'}<small>${p.certain?'':'+关系修正'}</small></em></button>`;}
function sceneOptions(){
 const recommended=ranked||sim.recommend().map(a=>a.id);
 return sim.actions().map(a=>({...a,recommended:recommended.includes(a.id)})).sort((a,b)=>Number(b.recommended)-Number(a.recommended));
}
function npcOptions(id){return [
 {id:'greet',label:'拱手招呼',kind:'support',mode:'npc'},
 {id:'rumor',label:'打听镇上的近况',kind:'listen',mode:'npc'},
 {id:'gift-tea',label:'请喝一碗茶',kind:'support',mode:'npc',cost:8},
 {id:'apology',label:'为先前的冒犯赔个不是',kind:'support',mode:'npc'},
 {id:'befriend',label:'攀谈结交',kind:'support',mode:'check',stat:'charm'},
 {id:'intimidate',label:'出言威吓',kind:'intimidate',mode:'check',stat:'might'},
 ...(id==='inn'?[{id:'rest',label:'借宿一夜',kind:'eat',mode:'rest'}]:[]),
 {id:'depart',label:'拱手告辞',kind:'leave',mode:'leave'}];}
function bubbleOptions(){return panelTarget==='scene'?sceneOptions():npcOptions(panelTarget);}
function bubblePreview(a){
 if(panelTarget==='scene')return sim.preview(a);
 const relation=sim.s.people[panelTarget]?.relation||0;
 return {blocked:sim.s.player.money<(a.cost||0),certain:!a.stat,score:sim.s.player.stats[a.stat],chance:a.stat?Math.max(5,Math.min(95,sim.s.player.stats[a.stat]-15+Math.round(relation/10))):100};
}
function renderScene(){renderBubbles();}
function renderBubbles(){
 if(!panelTarget)return;
 const scene=panelTarget==='scene',e=sim.event;if(scene&&(!e||e.id!==bubbleEvent)){closePanel();return;}
 const options=bubbleOptions(),groups=groupActions(options),group=groups.find(g=>g.id===bubbleGroup);
 if(!group){bubbleGroup=null;bubblePage=0;}
 const pages=group?Math.ceil(group.actions.length/6):1;bubblePage=Math.min(bubblePage,pages-1);
 const items=group?group.actions.slice(bubblePage*6,bubblePage*6+6):groups;
 const name=scene?SCENES[e.type].name:PEOPLE.find(n=>n.id===panelTarget)?.name;
 $('panel').innerHTML=`<div class="bubble-center"><small>${group?'选择做法':'眼前的江湖'}</small><strong>${esc(group?.label||name)}</strong><button data-back>${group?'‹ 返回分类':'× 收起'}</button></div><div class="bubble-orbit">${items.map((item,i)=>{
 if(!group)return `<button class="bubble category slot-${i}" data-group="${item.id}"><i>${item.icon}</i><span>${item.label}<small>${item.actions.length} 种做法</small></span><b>›</b></button>`;
 const p=bubblePreview(item);return `<button class="bubble slot-${i}" data-action="${item.id}" ${p.blocked?'disabled':''}><span><b>${esc(item.label)}</b><small>${item.recommended?'因你的经历推荐 · ':''}${item.stat?ATTR[item.stat]+' '+p.score+' · '+(item.difficulty?'难度 '+item.difficulty+' · ':'')+p.chance+'%':'无需检定'}${item.cost?' · 花费 '+item.cost+' 文':''}${BONUS[item.id]?' · 得手 +'+BONUS[item.id]+' 文':''}</small></span></button>`;
 }).join('')}</div><div class="bubble-bottom">${pages>1?`<button data-page="-1" ${bubblePage===0?'disabled':''}>‹</button><span>${bubblePage+1} / ${pages}</span><button data-page="1" ${bubblePage===pages-1?'disabled':''}>›</button>`:''}<small>WASD 自由走动 · 右键环顾 · Esc 收起</small></div>`;
 $('panel').querySelector('[data-back]').onclick=()=>{if(bubbleGroup){bubbleGroup=null;bubblePage=0;renderBubbles();}else closePanel();};
 for(const b of $('panel').querySelectorAll('[data-group]'))b.onclick=()=>{bubbleGroup=b.dataset.group;bubblePage=0;renderBubbles();};
 for(const b of $('panel').querySelectorAll('[data-page]'))b.onclick=()=>{bubblePage+=Number(b.dataset.page);renderBubbles();};
 for(const b of $('panel').querySelectorAll('[data-action]'))b.onclick=()=>runBubbleAction(options.find(a=>a.id===b.dataset.action));
 positionBubbles();
}
function inReach(){const p=world.interactionPoint(panelTarget);return p&&Math.hypot(p.x-world.hero.position.x,p.z-world.hero.position.z)<(panelTarget==='scene'?4.3:3.6);}
function positionBubbles(){
 if($('panel').hidden)return;
 if(!inReach()||sim.s.player.hp<=0){closePanel();return;}
 const point=world.screenPoint(world.interactionPoint(panelTarget));
 if(!point.visible){closePanel();return;}
 const {scale,x,y}=bubbleLayout(innerWidth,innerHeight,point);
 $('panel').style.left=x+'px';$('panel').style.top=y+'px';$('panel').style.transform=`translate(-50%,-50%) scale(${scale})`;
}
function runBubbleAction(a){
 if(!a||world.performance)return;
 if(!inReach()){closePanel();toast('已经走远了，靠近后再聊。');return;}
 const target=panelTarget,actor=target==='scene'?(a.kind==='listen'||a.kind==='rival'?'su':'shen'):target;
 let r;
 if(target==='scene')r=sim.resolve(bubbleEvent,a.id);
 else if(a.mode==='check')r=sim.npcCheck(target,a.id);
 else if(a.mode==='rest'){rest();world.perform(a,target);return;}
 else if(a.mode==='leave'){r={};queueSpeech([{id:target,text:'江湖路远，后会有期。'}]);toast('你拱手告辞。');}
 else r=sim.npcAction(target,a.id==='gift-tea'?'gift':a.id);
 if(r?.error){toast(r.error);return;}
 if(r?.text&&target!=='scene'&&a.mode!=='check')toast(r.text);
 closePanel();world.perform(a,actor);
}
async function rank(){const req=epoch,id=sim.event?.id;try{const response=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sim.context()),signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error();const result=await response.json();const ids=[...new Set(result.ids||[])].filter(id=>sim.actions().some(a=>a.id===id&&!sim.preview(a).blocked));if(ids.length<3)throw Error();if(req!==epoch||id!==sim.event?.id)return;ranked=ids.slice(0,5);aiStatus='AI 已参与推荐';if(!bubbleGroup)renderScene();}catch{if(req!==epoch)return;aiStatus='本地画像推荐';if(panelTarget==='scene')renderScene();}}
function interact(){
 if(!started||world.locked||world.performance||sim.s.player.hp<=0)return;
 if(!$('panel').hidden){closePanel();return;}
 if(!world.nearbyEvent()&&environment.interactStreet())return;
 const n=world.nearest();if(!n&&!world.nearbyEvent())return;
 world.clearReady();world.auto=null;epoch++;ranked=null;bubbleGroup=null;bubblePage=0;
 panelTarget=world.nearbyEvent()&&(!n||['shen','su','gao'].includes(n.id))?'scene':n?.id;
 if(!panelTarget)return;bubbleEvent=sim.event?.id;$('panel').hidden=false;renderBubbles();if(panelTarget==='scene')rank();
}
$('interact').onclick=interact;
window.addEventListener('keydown',e=>{if(!started)return;if(e.target.closest?.('input,textarea,select')||e.isComposing){if(e.code==='Escape')e.target.blur();return;}if(['Space','Tab','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.repeat)return;environment.key(e);party.key(e);if(e.code==='Escape'){closePanel();closeDrawer();return;}if(e.code==='KeyC'){$('profile').click();return;}if(e.code==='Tab'){!$('drawer').hidden?closeDrawer():inbox();return;}if(world.locked)return;world.keys.add(e.code);if(e.code==='Space')world.jump();if(e.code==='Slash'){e.preventDefault();world.toggleWeapon();}if(e.code==='KeyE')interact();if(e.code==='KeyR'&&sim.s.player.hp<=0)rest();});window.addEventListener('keyup',e=>world.keys.delete(e.code));
fetch('/api/status').then(r=>r.json()).then(r=>aiStatus=r.configured?'AI 随时待命':'本地画像推荐').catch(()=>aiStatus='本地画像推荐');
function mini(){const ctx=$('minimap').querySelector('canvas').getContext('2d'),p=world.hero.position;ctx.clearRect(0,0,164,164);ctx.save();ctx.beginPath();ctx.arc(82,82,80,0,Math.PI*2);ctx.clip();ctx.strokeStyle='#8ca78b35';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(82,0);ctx.lineTo(82,164);ctx.stroke();ctx.fillStyle='#618b83';ctx.fillRect(13,0,14,164);for(const o of world.obstacles){ctx.fillStyle='#9da88a77';ctx.fillRect(82+o.x*2.5-o.w,82+o.z*2.5-o.d,o.w*2,o.d*2);}for(const [id,n]of world.npcs){ctx.fillStyle=id==='guard'?'#bc9673':'#c3c9a3';ctx.beginPath();ctx.arc(82+n.actor.position.x*2.5,82+n.actor.position.z*2.5,2,0,7);ctx.fill();}ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(82+p.x*2.5,82+p.z*2.5,3.5,0,7);ctx.fill();if(world.auto?.length){const q=world.auto.at(-1);ctx.strokeStyle='#f0c788';ctx.beginPath();ctx.arc(82+q[0]*2.5,82+q[1]*2.5,5,0,7);ctx.stroke();}ctx.restore();}
let prev=performance.now(),lastUI=0,lastSave=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.045,(now-prev)/1000);prev=now;if(document.hidden)return;
 if(started)sim.tick(dt);world.playing=started;world.locked=!started||!$('drawer').hidden;world.update(dt);environment.update(dt,started);party.update(dt,started);positionBubbles();updateSpeech();
 if(started&&now-lastUI>120){lastUI=now;updateProfile();updateConversation();const s=sim.s;$('combat-ready').hidden=!world.combatReady||world.locked;$('hp').value=s.player.hp;$('energy').value=s.player.energy;$('role-name').textContent=s.party.active==='companion'?'阿笙 · 同行':ROLES[s.role].name;$('money').textContent=s.player.money+' 文';$('clock').textContent=`第 ${s.day} 日 · ${s.time<80?'晨光':s.time<160?'午后':'暮色'}`;$('wanted').textContent=s.wanted?'⚑ 捕头留意 · 嫌疑 '+s.wanted:'青竹会声望 '+s.reputation;$('unread').textContent=s.mail.filter(m=>!m.read).length||'';
 const event=world.nearbyEvent(),near=world.nearest(),hidden=world.locked||!$('panel').hidden||!!world.performance||(!event&&!near&&!environment.nearStreet())||s.player.hp<=0;$('interact').hidden=hidden;$('interact').textContent='E · '+(event?'看看眼前发生的事':environment.nearStreet()?'介入街头动静':'与'+(near?.npc.person.name||'路人')+'交互');$('ambient').hidden=!event||world.locked||!$('panel').hidden||speechQueue.length>0;if(event&&!world.locked&&!speechQueue.length){const lines=SCENES[sim.event.type].lines,line=lines[Math.floor(world.t/6)%lines.length];$('ambient').textContent=line;const split=line.indexOf('：');journal.add('chat',split>=0?line.slice(0,split):'街坊',split>=0?line.slice(split+1):line,`ambient:${sim.event.id}:${line}`);speak(line);}mini();}
 if(started&&now-lastSave>6000){lastSave=now;save();}
}
requestAnimationFrame(frame);window.addEventListener('beforeunload',save);
