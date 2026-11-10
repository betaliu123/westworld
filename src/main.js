import {NpcVoice,spokenActor} from './npc-voice.js';
import {WorldAudio} from './world-audio.js';
import {VOICE_LINES} from './voice-lines.js';
import {clockText,shichenText,untilTime} from './world-clock.js';
import {mountAim} from './aim-skills.js';
import {detainAtGate} from './gate-scene.js';
import {PRISON} from './locations.js';
import {imprisonmentCost} from './progress.js';
import {endPlayerPursuit,lawConfrontation} from './pursuit.js';
import {answerComplaint,complaintChoices} from './complaints.js';
import {opening,fresh,topicKey,heard} from './conversation-memory.js';
import {courtLine} from './court-street.js';
import {talkTree} from './talk-tree.js';
import {thoughtLine} from './body-feedback.js';
import {princeGreeting} from './prince-voice.js';
import {probeSight,probePreview,probeNpc,npcInfo,npcPortrait} from './npc-discovery.js';
import {itemIcon} from './inventory-view.js';
import {questsHTML} from './progress.js';
import {mountProgressUI} from './progress-ui.js';
import {observeProgress} from './progress.js';
import {CARDS,EVENTS,peek,commitDeal,pickEvent,dealContext,recordDeed,aftermathContext,applyAftermath,deliverMail,placePoint} from './event-deck.js';
import {mountCodex,mountNight,flyCard} from './jianghu-ui.js';
import {visibleBetween} from './npc-awareness.js';
import {contactFollowups,contactOptions,contactPreview,contactResolve,learnedFootwork} from './gate-society.js';
import {meet,organizationHTML,personTab} from './factions.js';
import {touchPreview,pressurePoint,giveItem} from './npc-actions.js';
import {socialOptions,socialPreview,socialResolve} from './npc-social.js';
import {mountCheckReveal} from './check-reveal.js';
import {mountHudLayout} from './hud-layout.js';
import {visitGate} from './gate-scene.js';
import {mountObjectInteractions} from './object-interactions.js';
import {mountDialogue,isDirectReply} from './dialogue.js';
import {PATHS,growth,growthBonus,checkGrade} from './growth.js';
import {switchMember} from './party-state.js';
import {icon,iconButton} from './ui-icons.js';
import {mountEnvironment} from './environment-ui.js';
import {createJournal} from './journal.js';
import {Simulation,newGame,newArrival} from './simulation.js';
import {World} from './world.js';
import {BONUS} from './action-contracts.js';
import {GROUPS,groupActions,bubbleLayout} from './interaction.js';
import {ATTR,ROLES,PEOPLE,SCENES} from './data.js';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gatePreview=new URLSearchParams(location.search).get('preview')==='gate';
const SAVE=gatePreview?'jianghu-gate-preview-v1':'jianghu-echoes-v1';let saved=null;try{const v=JSON.parse(localStorage.getItem(SAVE));if(v?.version===1&&v.player&&v.people)saved=v;}catch{}
let restartConfirmed=false,selectedNpc=null,pendingProbe=null;
function createSoloWorld(game){switchMember(game.s,'main');return new World($('world'),game);}
let role='wanderer',sim=new Simulation(saved||newArrival()),world=createSoloWorld(sim),started=false,panelTarget=null,more=false,ranked=null,epoch=0,sound=true,resultTimer,aiStatus='正在连接',aiReady=false,sleepingThrough=false;
try{sound=localStorage.getItem('jianghu-sound')!=='off';}catch{}
const worldAudio=new WorldAudio();worldAudio.setEnabled(sound);worldAudio.init();
const npcVoice=new NpcVoice({createContext:()=>worldAudio.getContext(),canSpeak:line=>started&&!document.hidden&&sim.s.player.hp>0&&!!spokenActor(line,sim.s)});
npcVoice.setEnabled(sound);npcVoice.init();
document.addEventListener('visibilitychange',()=>{worldAudio.setHidden(document.hidden);if(document.hidden)npcVoice.stop();});
window.addEventListener('pagehide',()=>{npcVoice.stop();worldAudio.stop();});
const wakeAudio=()=>{if(started&&sound){worldAudio.unlock();npcVoice.unlock();}};
document.addEventListener('pointerdown',wakeAudio);document.addEventListener('keydown',wakeAudio);
const checkReveal=mountCheckReveal(()=>sound,kind=>worldAudio.play(kind));
world.checkReveal=checkReveal;
const journal=createJournal(()=>sim.s,esc);
const dialogue=mountDialogue(world,{journal,speak,stopSpeech:()=>npcVoice.stop(),hasVoice:line=>!!spokenActor(line,sim.s),clear:()=>{npcVoice.stop();reactionTicket++;speechQueue=[];world.speaking=null;closePanel();collapseConversation();$('result').hidden=true;$('npc-speech').hidden=true;}});
const environment=mountEnvironment(world,()=>sim,toast,esc);
const objects=mountObjectInteractions(world,()=>sim,environment,toast,closePanel);
const codex=mountCodex({drawer,getSim:()=>sim,esc,profileHTML,organizationHTML:tab=>organizationHTML(sim,esc,tab),questsHTML:()=>questsHTML(sim.s,esc),onLead:id=>leadById(id),
 onSound:toggle=>{if(toggle)$('sound').click();return sound;},onGuide:()=>{closeDrawer();document.body.classList.toggle('show-controls');},onTrack:id=>{sim.s.trackedQuest=sim.s.trackedQuest===id?null:id;save();}});
const night=mountNight({esc,onClose:()=>{world.keys.clear();save();}});
const aim=mountAim(world,()=>sim,()=>started&&!world.locked&&!world.performance&&!dialogue.active&&!checkReveal.active&&sim.s.player.hp>0,()=>{closePanel();environment.close();},(id,mode,point)=>{panelTarget=id;runBubbleAction({id:mode,mode,point,kind:mode==='probe'?'listen':'steal'});},toast);

// Solo demo: companion data stays in the save; no follower actor or controls are mounted.
iconButton($('rest'),'Coffee','歇息 · 茶盏');iconButton($('sound'),sound?'Volume2':'VolumeX',sound?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(sound));iconButton($('letters'),'Mail','信笺 · Tab');iconButton($('profile'),'UserRound','人物属性 · C');
const historyLog=[];let bubbleGroup=null,bubblePage=0,bubbleEvent=null,visualResult=null;let speechQueue=[],pendingActionSpeech=[];let reactionTicket=0;

function toast(text){if(started){if(!text.startsWith('你：'))journal.add('system','提示',text);return;}const el=document.createElement('div');el.className='toast';el.textContent=text;$('toast').append(el);setTimeout(()=>el.remove(),4800);}
function save(){if(!started)return;try{localStorage.setItem(SAVE,JSON.stringify(sim.s));}catch{toast('浏览器空间不足，暂时无法保存。');}}
function tone(kind,options){return worldAudio.play(kind,options);}
function speak(line,options={}){
 const actor=spokenActor(line,sim.s);if(!sound||!actor)return;
 return npcVoice.play({...line,actor},options);
}
function bind(){sim.listeners.push((type,data)=>{
 if(['result','actionWitnessed','entry','npc'].includes(type))recordDeed(sim,type,data);
 if(type==='npcRoutine'){const q=world.npcs.get(data.id)?.actor.position;if(q&&q.distanceTo(world.hero.position)<12&&!world.cinematic&&!speechQueue.length&&!pendingActionSpeech.length)queueSpeech([data]);}
 if(type==='worldIncident')world.noticeIncident(data);
 if(type==='musicLook'){const n=world.npcs.get(data.id);if(n){n.musicLookUntil=world.t+1.2;n.musicPoint={x:data.x,z:data.z};}}
 if(type==='actorDeltas'&&started)world.queueActorDeltas(data);
 if(type==='npcCheck')world.showNpcCheck(data);
 if(type==='fieldCheck'){closePanel();environment.close();world.clearReady();world.perform({id:data.actionId||'steal',kind:data.actionId==='probe'?'listen':'steal',motion:data.actionId==='probe'?'talk':'reach'},data.target);checkReveal.play(data,()=>{},true);}
 if(type==='territoryReport')journal.add('system','堂口交锋',data.text);
 if(type==='royalDiscovery')showUnlock('traveler','御印密信：锦衣客是宋徽宗的弟弟，奉皇兄手诏查案。');
 if(type==='complaintResult'){journal.add('system',PEOPLE.find(p=>p.id===data.id)?.name+' · 问责',data.text);if(data.dialogue){world.quietUntil=world.t+10;dialogue.play(data.dialogue,()=>{world.quietUntil=world.t+10;},data.label);if(data.roll!=null)checkReveal.play(data,()=>{});}}
 if(type==='complaintAsk'&&!dialogue.active){closePanel();environment.close();world.clearReady();const owner=PEOPLE.find(p=>p.id===data.id)?.name;dialogue.choose({title:owner+'拦住你：'+({theft:'方才伸手拿什么？',assault:'你凭什么动手？',damage:'砸了东西，就这么走？',tamper:'你往吃喝里放了什么？'}[data.type]),listener:data.id,options:complaintChoices(sim),onSelect:a=>answerComplaint(sim,a.id),onClose:()=>{if(sim.s.complaint===data){data.phase='report';data.since=sim.s.npcClock;sim.emit('npcCheck',{id:data.id,label:'去报官',observation:true,priority:true});}}});}
 if(type==='actionWitnessed'){journal.add('system','被目击',data.text);tone('alert');pendingActionSpeech.push(...data.dialogue);pendingActionSpeech=pendingActionSpeech.slice(-3);}
 if(type==='save')save();
 if(type==='relocate'||type==='entry')world.hero.position.set(sim.s.player.x,0,sim.s.player.z);
 if(type==='streetResult'){journal.add('system',data.label,data.text+'（'+data.changes.join('，')+'）');}
 if(type==='sandbox'){journal.add('system','江湖动静',data.text);if(data.dialogue.length)queueSpeech(data.dialogue);}
 if(type==='speech')queueSpeech(data);
 if(type==='searchDecision')decideSearch(data);
 if(type==='mail'){journal.add('chat',PEOPLE.find(n=>n.id===data.sender)?.name+' · 来信',data.text);tone('mail');toast(`${PEOPLE.find(n=>n.id===data.sender).name} 托飞鸽捎来一封信`);}
 if(type==='scene'){journal.add('system','现场',data?SCENES[data.type].intro:'人群渐渐散去。');closePanel();world.syncEvent();if(data?.type==='ring_quarrel')queueSpeech([{id:'su',text:'怎么连戒指都会弄丢？你答应的事也这样吗？'},{id:'shen',text:'我找遍了，这不是我不在意！'}]);}
 if(type==='day'){toast(`天光又起，镇上有了新的动静。`);if(!sleepingThrough)dawnAftermath();}
 if(type==='violence'){const p=world.npcs.get(data.id)?.actor.position;if(p)tone('body',p);}
 if(type==='result'&&data.actionId==='g_crouch'){return;}
 if(type==='result'&&data.worldAction){journal.add('system',data.label,data.text+'（'+data.changes.join('，')+'）');checkReveal.play(data,()=>toast(data.text),objects.busy);return;}
 if(type==='result'){if(data.type==='conversation')journal.add('chat','你',data.label);if(data.type!=='conversation'||data.roll!==null||data.changes.length)journal.add('system',data.label,`${data.roll!=null?`检定 ${data.roll}/${data.check.chance} · ${data.success?'成功':'失败'}。`:''}${data.text}${data.changes.length?'（'+data.changes.join('，')+'）':''}`);if(isDirectReply(data))return;const staged=!!data.eventId&&Array.isArray(data.dialogue);if(!staged)generateReaction(data);const fromMenu=!!panelTarget;closePanel();if(fromMenu||staged){visualResult=data;if(data.roll!=null)checkReveal.play(data,()=>{},true);}else if(data.type==='conversation'&&data.roll===null&&!data.changes.length){$('result').hidden=true;toast('你：'+data.label);}else showResult(data);world.reaction={kind:data.kind,success:data.success,until:world.t+3};world.burst(world.hero.position.x,1.3,world.hero.position.z,data.success?0xe7ce92:0xbc735b,10);}
 if(type==='npc'){journal.add('system','交互',data.reaction?.text||data.text);tone('mail');if(data.reaction)generateReaction(data.reaction);else queueSpeech([{id:data.id,text:data.text}]);}
 });world.onPerformanceEnd=()=>{checkReveal.stop();if(pendingProbe){const probe=pendingProbe;pendingProbe=null;if(probe.success)showUnlock(probe.id,probe.insight);else queueSpeech([{id:probe.id,text:probe.insight}]);}if(visualResult){const r=visualResult;visualResult=null;checkReveal.play(r,()=>dialogue.play(r.dialogue||[],()=>{if(r.ongoing&&sim.sceneView()&&sim.event?.proposal?.phase!=='duel'&&sim.event?.gate?.phase!=='fight'&&world.nearbyEvent()){panelTarget='scene';bubbleEvent=sim.event.id;$('result').hidden=true;$('panel').hidden=false;renderBubbles();}else showResult(r);},(SCENES[r.type]?.name||r.label)+(r.roll!=null?` · ${r.grade||checkGrade(r.roll,r.check.chance)}`:'')));}};world.onReady=()=>{tone(world.combatReady?'draw':'sheath');toast(world.combatReady?'拔刀':'收刀');};world.onSound=tone;world.onArrive=()=>{};world.onHurt=()=>{if(sim.s.player.hp===0){endPlayerPursuit(sim.s);closePanel();closeDrawer();world.clearReady();world.attackTime=0;world.keys.clear();world.auto=null;save();toast('你受伤倒地。按 R 调息至天明，再入江湖。');}};}
bind();
function roleCards(){$('roles').innerHTML=Object.entries(ROLES).map(([id,r])=>`<button class="role ${role===id?'active':''}" data-role="${id}"><b>${r.name}</b><small>${r.desc}</small></button>`).join('');}
roleCards();$('roles').onclick=e=>{const b=e.target.closest('[data-role]');if(b){role=b.dataset.role;roleCards();}};
$('continue').hidden=!saved;
if(saved){
 const card=$('start').parentElement;
 card.querySelector('.eyebrow').textContent='临溪 / 已有存档';card.querySelector('h2').textContent='再入江湖';
 card.querySelector('h2 + p').textContent='前尘未了，接着走。';
 $('roles').hidden=true;$('continue').textContent=`继续游戏 · ${clockText(saved)}`;$('continue').className='primary';
 $('start').before($('continue'));$('start').className='quiet';$('start').textContent='另起新局';
}
function begin(resume,fresh=false){
 npcVoice.stop();worldAudio.unlock();npcVoice.unlock();
 if(!resume&&saved&&!restartConfirmed){restartConfirmed=true;$('roles').hidden=false;$('start').parentElement.querySelector('h2 + p').textContent='选择新出身。确认重开将覆盖当前存档；继续游戏可保留原进度。';$('start').textContent='确认重开并覆盖存档';return;}
 if(!resume){sim=new Simulation(newArrival(role));world.sim=sim;world.gatePlaced=false;world.hero.position.set(sim.s.player.x,0,sim.s.player.z);world.syncEvent();bind();}
 started=true;journal.restore();$('welcome').hidden=true;for(const id of ['hud','vitals','controls','minimap'])$(id).hidden=false;save();toast(resume&&!fresh?'旧日的人情与风波都还在。继续你的江湖。':(sim.event?.type==='gate'?'你站在临溪关外：十二文、三星嫌疑、没有路引。按 E 应对校尉。':'你来到临溪。桥头传来争执声……按 E 介入。'));
}
$('start').onclick=()=>begin(false);$('continue').onclick=()=>begin(true);
$('sound').onclick=()=>{sound=!sound;worldAudio.setEnabled(sound);worldAudio.unlock();npcVoice.setEnabled(sound);npcVoice.unlock();try{localStorage.setItem('jianghu-sound',sound?'on':'off');}catch{}iconButton($('sound'),sound?'Volume2':'VolumeX',sound?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(sound));if(sound)tone('mail');};
function closePanel(){world.clearReady();epoch++;panelTarget=null;$('panel').hidden=true;world.locked=!$('drawer').hidden;document.body.classList.toggle('panel-open',!$('drawer').hidden);}
function closeDrawer(){world.clearReady();$('drawer').hidden=true;world.locked=false;world.keys.clear();document.body.classList.remove('panel-open');}
function drawer(title,content){collapseConversation();closePanel();$('environment-panel').hidden=true;$('street-panel').hidden=true;$('drawer').dataset.view='record';$('drawer').hidden=false;world.locked=true;world.keys.clear();document.body.classList.add('panel-open');$('drawer').innerHTML=`<header>临溪 · 随身记事<button data-close aria-label="关闭记录"></button></header><h2>${title}</h2>${content}`;const close=$('drawer').querySelector('[data-close]');iconButton(close,'X','关闭记录');close.onclick=closeDrawer;$('drawer').scrollTop=0;close.focus();}
function inbox(){const s=sim.s;drawer('飞鸽传书',s.mail.length?[...s.mail].reverse().map(m=>`<article class="letter"><small>${esc(PEOPLE.find(n=>n.id===m.sender).name)}</small><p>${esc(m.text)}</p>${m.point?`<button data-route="${m.id}">⌖ ${esc(m.place)} · 前往附近</button>`:''}</article>`).join(''):'<p>尚无来信。街坊的消息，会在这里留下。</p><p>你也可以自己去桥头看看，不必等待别人邀请。</p>');for(const m of s.mail)m.read=true;save();for(const b of $('drawer').querySelectorAll('[data-route]'))b.onclick=()=>{const m=s.mail.find(m=>m.id===Number(b.dataset.route));closeDrawer();if(m.id!==sim.event?.id){toast('这是以前的来信。人和事也许已经变了。');return;}if(world.routeTo(m.point))toast('沿街前往 · 按 WASD 可随时中止');else toast('前路不通，请绕行。');};}
$('letters').onclick=()=>!$('drawer').hidden?closeDrawer():inbox();
const MOODS={calm:'平和',wary:'戒备',angry:'恼怒',afraid:'惊惧',down:'倒地'};
const STAT_HELP={might:'武力、护送与威吓',agility:'取物、轻身与舞剑',charm:'说服、结交与表达心意',wit:'观察、倾听与辨别线索'};
function liveNumber(key,value){return `<b data-number="${key}">${value}</b>`;}
function growthCards(p){return Object.entries(PATHS).map(([id,path])=>{const g=growth(p,id);return `<article class="growth-path"><header><b>${path.name}</b><span>${g.name}</span></header><progress value="${g.xp}" max="${g.next||90}"></progress><small>${g.xp} / ${g.next||90} 历练${g.next?' · 再积累 '+(g.next-g.xp)+' 解锁 '+path.steps[g.level+1]:' · 已掌握全部阶段'}</small><p>${path.effect}</p><small>${path.stats.map(k=>ATTR[k]).join(' / ')} · 当前检定加成 +${g.level*4}</small></article>`;}).join('');}
function openProfile(){codex.open('self');}
function profileHTML(){
 const s=sim.s,p=s.player;
 return (`<p>${s.party.active==='companion'?'阿笙 · 同行':ROLES[s.role].name} · 当前控制角色的属性</p><div class="stat-grid">${Object.entries(ATTR).map(([k,v])=>`<span>${v}${liveNumber(k,p.stats[k])}<small>${STAT_HELP[k]}</small></span>`).join('')}</div><div class="profile-values"><span>气血 ${liveNumber('hp',Math.ceil(p.hp))} / 100</span><span>体力 ${liveNumber('energy',Math.floor(p.energy))} / 100</span><span>盘缠 ${liveNumber('money',p.money)} 文</span><span>阅历 ${liveNumber('xp',p.xp)}</span><span>青竹会声望 ${liveNumber('reputation',s.reputation)}</span><span>当前嫌疑 ${liveNumber('wanted',s.wanted)}</span></div><p>检定概率由属性、难度与关系共同决定，选择气泡里显示的是本次实际成功率。</p><h2>三条成长途径</h2><div id="growth-paths">${growthCards(p)}</div><h2>行囊与线索</h2><p>${p.inventory.map(i=>esc(i==='ring'?'一枚银戒':i)).join('、')||'尚无剧情物品'} · 佩剑、路引、旧行囊</p><h2>故人与好感</h2>${PEOPLE.map(n=>`<div class="relation-row"><span>${n.name}<small data-mood="${n.id}">${MOODS[s.people[n.id].mood]||'平和'}</small></span>${liveNumber('relation-'+n.id,s.people[n.id].relation)}</div>`).join('')}<h2>行过的路</h2>${s.history.slice(-8).reverse().map(h=>`<article class="letter"><small>${esc(h.label)}</small><p>${esc(h.text)}</p><small>${h.reactionSource==='nlp'?'人物反应 · AI 推演':'人物反应 · 本地演出'}</small>${(h.dialogue||[]).map(d=>`<p>${esc(PEOPLE.find(n=>n.id===d.id)?.name)}：“${esc(d.text)}”</p>`).join('')}</article>`).join('')||'<p>尚未留下故事。</p>'}`);
}
function showOrganization(tab){codex.open('people',tab);}
const orgButton=document.createElement('button');orgButton.id='organization';$('profile').after(orgButton);iconButton(orgButton,'Network','势力与线索 · J');orgButton.onclick=()=>{if(codex.isOpen('people')){closeDrawer();return;}showOrganization();};
$('profile').onclick=()=>codex.isOpen('self')?closeDrawer():openProfile();
function updateProfile(){
 if($('drawer').hidden)return;const s=sim.s,p=s.player,values={...p.stats,hp:Math.ceil(p.hp),energy:Math.floor(p.energy),money:p.money,xp:p.xp,reputation:s.reputation,wanted:s.wanted};
 const growthEl=$('growth-paths');if(growthEl){const html=growthCards(p);if(growthEl.innerHTML!==html)growthEl.innerHTML=html;}
 for(const [id,n]of Object.entries(s.people))values['relation-'+id]=n.relation;
 for(const el of $('drawer').querySelectorAll('[data-number]'))el.textContent=values[el.dataset.number];
 for(const el of $('drawer').querySelectorAll('[data-mood]'))el.textContent=MOODS[s.people[el.dataset.mood].mood]||'平和';
}
function queueSpeech(lines){lines=lines.filter(line=>!(sim.s.people[line.id]?.muteUntil>(sim.s.npcClock||0)));if(!lines.length)return;
 if(checkReveal.active){pendingActionSpeech.push(...lines);pendingActionSpeech=pendingActionSpeech.filter((line,i,all)=>all.findIndex(v=>v.id===line.id)===i).slice(0,3);return;}
 if(dialogue.active)return;
 for(const line of lines)journal.add('chat',line.id==='hero'?(line.thought?'少侠 · 心想':'少侠'):PEOPLE.find(n=>n.id===line.id)?.name||line.id,line.text);
 npcVoice.stop('bubble');
 let at=world.t+.35;speechQueue=lines.filter(line=>line.id==='hero'||world.npcs.has(line.id)).map(line=>{const duration=Math.max(3.8,Math.min(6,line.text.length*.14),npcVoice.duration({...line,actor:spokenActor(line,sim.s)})+.4);const entry={...line,start:at,end:at+duration,spoken:false};at+=duration+.3;return entry;});
}
world.onLifeSpeech=line=>{if(!started||dialogue.active||checkReveal.active||world.t<(world.quietUntil||0)||sim.s.complaint||pendingActionSpeech.length||speechQueue.some(s=>s.end>world.t))return false;queueSpeech([line]);return true;};
world.onThought=text=>{if(!started||dialogue.active||speechQueue.some(line=>line.end>world.t))return false;queueSpeech([thoughtLine(text)]);return true;};
function updateSpeech(){
 if(dialogue.active){$('npc-speech').hidden=true;return;}
 speechQueue=speechQueue.filter(line=>line.end>world.t);
 const line=speechQueue.find(line=>line.start<=world.t),el=$('npc-speech');
 world.speaking=line&&!line.thought?line.id:null;if(!line){el.hidden=true;npcVoice.stop('bubble');return;}
 const n=line.id==='hero'?{actor:world.hero,person:{name:line.thought?'少侠 · 心想':'少侠'}}:world.npcs.get(line.id),point=n.actor.position.clone();point.y+=3.25;const screen=world.screenPoint(point);
 el.hidden=!started||!screen.visible||screen.x<0||screen.x>innerWidth||screen.y<0||screen.y>innerHeight;
 if(el.hidden)return;
 if(el.dataset.line!==line.start+line.id){el.dataset.line=line.start+line.id;el.innerHTML=`<b>${esc(n.person.name)}</b><span>${esc(line.text)}</span>`;}
 el.style.left=Math.max(135,Math.min(innerWidth-135,screen.x))+'px';el.style.top=Math.max(90,screen.y)+'px';
 if(!line.spoken){if(!line.thought)speak(line,{channel:'bubble',generate:false,valid:()=>speechQueue.includes(line)&&line.end>world.t&&!dialogue.active&&n.actor.position.distanceTo(world.hero.position)<14&&visibleBetween(n.actor.position,world.hero.position,environment.eco.obstacles||[],sim.s.ecosystem?.objects||{}),onStart:duration=>{const extra=Math.max(0,world.t+duration+.35-line.end);line.end+=extra;for(const later of speechQueue){if(later!==line&&later.start>line.start){later.start+=extra;later.end+=extra;}}}});line.spoken=true;}
}
async function generateReaction(result){
 if(result.authored){reactionTicket++;queueSpeech(result.dialogue||[]);return;}
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

 if(!$('conversation').hidden&&!replyTargetManual&&world.speaking&&ids.includes(world.speaking))select.value=world.speaking;
 const disabled=!ids.length||sim.s.player.hp<=0;$('reply-input').disabled=disabled;$('reply-form').querySelector('[type="submit"]').disabled=disabled;
 iconButton($('weapon-toggle'),'Swords',world.combatReady?'收刀 · /':'拔刀 · /');$('weapon-toggle').setAttribute('aria-pressed',String(world.combatReady));
 $('reply-status').textContent=disabled?(sim.s.player.hp<=0?'受伤倒地，暂时无法交谈。':'附近没有可交谈的人。'):'与'+(PEOPLE.find(n=>n.id===select.value)?.name)+'交谈';
 const signature=[select.value,sim.s.facts.missing,sim.s.player.inventory.includes('ring'),sim.event?.type].join(':');if(signature===replySignature)return;replySignature=signature;
 const replies=select.value==='companion'?['跟着我','原地等我','吹笛引人','收笛休息']:sim.s.facts.missing?['我没看见那枚戒指。','我帮你一起找找。',...(sim.s.player.inventory.includes('ring')?['戒指是我拿走的。','我把银戒还给你。']:[]),'别吵，先冷静一下。']:['刚才的事，你怎么看？','别着急，慢慢说。','近来可有什么消息？'];
 $('reply-suggestions').innerHTML=replies.slice(0,4).map(t=>`<button type="button">${esc(t)}</button>`).join('');
 for(const b of $('reply-suggestions').children)b.onclick=()=>sendReply(b.textContent);
}
function sendReply(text,target=null){
 if((target||$('reply-target').value)==='companion'){
  if(!started||world.locked||sim.s.player.hp<=0)return;
  if(!text.trim())return;world.keys.clear();$('reply-input').value='';collapseConversation();return;
 }
 const id=target||$('reply-target').value;if(!started||world.locked||!nearbySpeakers().includes(id)||world.performance||sim.s.player.hp<=0){toast('等当前动作做完，走近对方再说。');return;}
 text=text.trim();if(!text)return;closePanel();world.clearReady();world.keys.clear();$('reply-input').blur();const r=sim.reply(id,text);if(r.error){toast(r.error);return;}world.perform({id:r.actionId,kind:r.kind},id);world.performance.motion=r.motion;$('reply-input').value='';replyTargetManual=false;
}
function collapseConversation(){$('reply-input').blur();$('conversation').hidden=true;document.body.classList.remove('conversation-open');world.keys.clear();draftTarget=null;}
function openConversation(){if(!started||world.locked)return;$('conversation').hidden=false;document.body.classList.add('conversation-open');updateConversation();$('reply-input').focus();}
$('reply-target').onchange=()=>{replyTargetManual=true;draftTarget=$('reply-target').value;updateConversation();};
$('reply-input').onfocus=()=>{draftTarget=$('reply-target').value;replyTargetManual=true;world.keys.clear();world.auto=null;world.clearReady();};
$('reply-input').onblur=()=>world.keys.clear();
$('reply-input').onkeydown=e=>{if(e.code==='Escape'){e.preventDefault();collapseConversation();}if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();};
$('reply-form').onsubmit=e=>{e.preventDefault();sendReply($('reply-input').value,draftTarget);};
$('weapon-toggle').onclick=()=>{document.activeElement?.blur();world.toggleWeapon();};

function rest(){
 if(sim.s.player.hp>0){restMenu();return;}
 closePanel();closeDrawer();if(sim.respawn()){world.resetAfterRest();save();}
}
function skipTime(sleeping){
 const s=sim.s,dt=untilTime(s,$('rest-until').value);
 if(dt===null){toast('请选择时刻。');return;}
 if(s.player.hp<=0){rest();return;}
 if(['fight','prison'].includes(sim.event?.gate?.phase)||sim.event?.proposal?.phase==='duel'||[...world.npcs].some(([id,n])=>sim.isPursuing(id,n.actor.position.distanceTo(world.hero.position)))){toast('眼下无法安心歇脚。');return;}
 const nearby=[...world.npcs].filter(([id,n])=>s.people[id]?.hp>0&&n.actor.position.distanceTo(world.hero.position)<10).sort((a,b)=>a[1].actor.position.distanceTo(world.hero.position)-b[1].actor.position.distanceTo(world.hero.position)).map(([id])=>id);
 world.auto=null;world.keys.clear();closeDrawer();sleepingThrough=sleeping;try{sim.passTime(dt,sleeping);}finally{sleepingThrough=false;}save();
 if(sleeping){nightDeal(nearby);return;}
 toast('你在原地等到了'+shichenText(s));
}
function restMenu(){
 drawer('歇息与等待',`<p>现在是 ${clockText(sim.s)}。选择下一次抵达的时刻。</p><label>到 <input id="rest-until" type="time" value="06:00" required></label><div class="rest-options"><button data-night>${icon('Moon')}睡到此时</button><button data-wait>原地等待</button><button data-restart>${icon('RotateCcw')}重开 · 从城外入城</button></div>`);$('drawer').dataset.view='rest';
 $('drawer').querySelector('[data-night]').onclick=()=>skipTime(true);$('drawer').querySelector('[data-wait]').onclick=()=>skipTime(false);
 $('drawer').querySelector('[data-restart]').onclick=()=>{
  drawer('重新开始？','<p>本局的物品、人情和江湖见闻将被清空，以当前出身，从十二文、三星嫌疑的城外入城场景重新开始。</p><div class="rest-options"><button data-confirm-restart>确认重开</button><button data-cancel-restart>返回</button></div>');$('drawer').dataset.view='rest';
  $('drawer').querySelector('[data-cancel-restart]').onclick=restMenu;
  $('drawer').querySelector('[data-confirm-restart]').onclick=()=>{
   try{sessionStorage.setItem('jianghu-restart','1');localStorage.setItem(SAVE,JSON.stringify(newArrival(sim.s.role)));}catch{sessionStorage.removeItem('jianghu-restart');toast('无法保存新进度，暂时没有重开。');return;}
   started=false;location.reload();
  };
 };
}
$('rest').onclick=()=>!$('drawer').hidden&&$('drawer').dataset.view==='rest'?closeDrawer():restMenu();
function showResult(r){checkReveal.play(r,()=>renderResult(r));}
function renderResult(r){const rolled=r.roll!=null,grade=rolled?r.grade||checkGrade(r.roll,r.check?.chance):'';$('result').hidden=false;$('result').className='ink-in '+(rolled?(r.success?'passed':'failed'):'direct');$('result').innerHTML=`<header class="result-head">${rolled?`<span class="ink-seal result-seal${r.success?'':' hollow'}" title="成功率 ${r.check.chance}%">${esc(grade.slice(-2))}</span>`:''}<h3>${esc(r.label)}</h3>${r.ongoing?'<span class="ink-tag" title="事情还没结束">未了</span>':''}</header><p>${esc(r.text)}</p>${r.changes.length?`<div class="result-chips">${r.changes.map(x=>`<span class="ink-chip ${/\+/.test(x)?'up':/-|－/.test(x)?'down':''}">${esc(x)}</span>`).join('')}</div>`:''}${r.hint?`<p class="hint">${esc(r.hint)}</p>`:''}`;clearTimeout(resultTimer);resultTimer=setTimeout(()=>$('result').hidden=true,8500);tone(r.success?'win':'lose');}
function choice(a){const p=sim.preview(a);return `<button class="choice" data-choice="${a.id}" ${p.blocked?'disabled':''}><span><b>${esc(a.label)}</b><small>${a.stat?`${ATTR[a.stat]} ${p.score} · 难度 ${a.difficulty}`:'无需检定'}${a.cost?` · ${a.cost} 文`:''}</small></span><em>${p.blocked?'不足':p.certain?'必成':p.chance+'%'}<small>${p.certain?'':'+关系修正'}</small></em></button>`;}
function sceneOptions(){
 if(sim.sceneView())return sim.actions();
 const recommended=ranked||sim.recommend().map(a=>a.id);
 return sim.actions().map(a=>({...a,recommended:recommended.includes(a.id)})).sort((a,b)=>Number(b.recommended)-Number(a.recommended));
}
function hasTalkStory(id){return sim.event?.type==='gate'?sim.sceneView()?.listener===id:sim.event?.cast?.includes(id);}
function talkOptions(id){const story=hasTalkStory(id),deal=peek(sim.s,'talk',id);if(deal)prefetchDeal(id,deal);return [...(deal?[{id:'deal',label:'近来可有什么新鲜事？',mode:'deal',kind:'listen'}]:[]),...(story?[{id:'story',label:sim.event?.type==='gate'&&id===(sim.s.watch?.holder||'gate_guard')?'说说过关的凭据':'谈眼前的事',mode:'story',kind:'listen'}]:[]),...contactOptions(sim,id),...socialOptions(sim,id).filter(a=>a.id!=='gift')].filter(a=>fresh(sim.s,id,a));}
function npcOptions(id){return [
 ...(!(sim.s.people[id]?.muteUntil>(sim.s.npcClock||0))&&talkOptions(id).length?[{id:'talk',label:'交谈',mode:'talk',kind:'listen'}]:[]),
 {id:'show',label:'出示',mode:'show',kind:'support'},
 ...(id==='inn'?[{id:'rest',label:'借宿一夜',mode:'rest',kind:'eat'}]:[])];}
function bubbleOptions(){return panelTarget==='scene'?sceneOptions():npcOptions(panelTarget);}
function probeButtonState(id){const n=sim.s.people[id],p=probePreview(sim,id),q=world.npcs.get(id)?.actor.position;
 const wait=Math.ceil((n?.probeRetryAt||0)-(environment.eco.s.time||0));
 const reason=n?.hp<=0?'对方已经倒地':!n?.probed&&wait>0?'对方有所警觉 · '+wait+' 秒后可重试':!q||!probeSight(world.hero.position,q,world.obstacles,environment.eco.s.objects)?'视线被挡，换个位置':'';
 return {blocked:!!reason,detail:reason||(n?.probed?'已探查，无需再检定':'机敏 '+p.score+' · 成功率 '+p.chance+'%')};}
function bubblePreview(a){if(a.mode==='probe')return probePreview(sim,panelTarget);if(a.mode==='contact')return contactPreview(sim,panelTarget,a);
 if(panelTarget==='scene')return sim.preview(a);
 if(a.mode==='pressure')return touchPreview(sim,panelTarget);
 if(a.mode==='social')return socialPreview(sim,panelTarget,a);
 const relation=sim.s.people[panelTarget]?.relation||0;
 return {blocked:sim.s.player.money<(a.cost||0),certain:!a.stat,score:sim.s.player.stats[a.stat],chance:a.stat?Math.max(5,Math.min(95,sim.s.player.stats[a.stat]-15+Math.round(relation/10)+growthBonus(sim.s.player,a.stat))):100};
}
function renderScene(){renderBubbles();}
function renderBubbles(){
 if(!panelTarget)return;
 $('panel').classList.toggle('proposal-panel',panelTarget==='scene'&&!!sim.sceneView());
 if(panelTarget==='scene'&&sim.sceneView()){
  const view=sim.sceneView(),actions=sim.actions();if(objects.handlesStage()){closePanel();return;}
  $('panel').hidden=true;dialogue.choose({title:view.title,listener:view.listener||(sim.event.type==='confidence'?'su':'shen'),options:actions.map(action=>({action,preview:sim.preview(action)})),onSelect:runBubbleAction,onClose:closePanel});return;

 }
 $('panel').classList.toggle('npc-action-menu',panelTarget!=='scene');
 if(panelTarget!=='scene'){const id=panelTarget,options=npcOptions(id);$('panel').hidden=false;$('panel').innerHTML=`<header><b>${esc(PEOPLE.find(n=>n.id===id)?.name||'交互')}</b><button data-close aria-label="关闭" title="关闭">${icon('X')}</button></header><div class="npc-actions">${options.map(a=>{const p=bubblePreview(a);return `<button data-action="${a.id}" ${p.blocked?'disabled':''}><b>${esc(a.label)}</b>${a.stat?`<small>${ATTR[a.stat]} ${p.score} · 成功率 ${p.chance}%${a.mode==='pressure'?' · 敌对行动 · 体力 10':''}</small>`:''}</button>`;}).join('')}</div>`;$('panel').querySelector('[data-close]').onclick=closePanel;for(const b of $('panel').querySelectorAll('[data-action]'))b.onclick=()=>runBubbleAction(options.find(a=>a.id===b.dataset.action));positionBubbles();return;}
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
 if($('panel').classList.contains('npc-action-menu')){const probe=$('panel').querySelector('[data-action="probe"]');if(probe){const state=probeButtonState(panelTarget);probe.disabled=state.blocked;const small=probe.querySelector('small')||probe.appendChild(document.createElement('small'));if(small.textContent!==state.detail)small.textContent=state.detail;}const el=$('panel'),w=el.offsetWidth,h=el.offsetHeight;el.style.left=Math.max(12,Math.min(innerWidth-w-12,point.x+35))+'px';el.style.top=Math.max(70,Math.min(innerHeight-h-100,point.y-h/2))+'px';el.style.transform='none';return;}
 if($('panel').classList.contains('proposal-panel')){const height=$('panel').offsetHeight,width=$('panel').offsetWidth;$('panel').style.left=Math.max(width/2+12,Math.min(innerWidth-width/2-12,point.x))+'px';$('panel').style.top=Math.max(height/2+64,Math.min(innerHeight-height/2-30,point.y+height/2))+'px';$('panel').style.transform='translate(-50%,-50%)';return;}
 const {scale,x,y}=bubbleLayout(innerWidth,innerHeight,point);
 $('panel').style.left=x+'px';$('panel').style.top=y+'px';$('panel').style.transform=`translate(-50%,-50%) scale(${scale})`;
}
// —— 江湖牌：攀谈与歇息都是发牌员 ——
const dealCache=new Map();
const dealSig=draw=>JSON.stringify([sim.s.day,draw.card,draw.index,draw.echo?.id,(draw.candidates||[]).map(e=>e.id)]);
function prefetchDeal(id,draw){
 if(!aiReady||!draw.candidates?.length)return;const sig=dealSig(draw);if(dealCache.get(id)?.sig===sig)return;
 const entry={sig,result:null};dealCache.set(id,entry);
 fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dealContext(sim.s,draw,id)),signal:AbortSignal.timeout(9000)}).then(r=>r.ok?r.json():null).then(j=>{entry.result=j;}).catch(()=>{});
}
function dealt(card){
 if(!card.lead&&card.card!=='echo')return;
 journal.add('system','江湖牌 · '+CARDS[card.card].name,(card.title?card.title+'：':'')+(card.lead||card.line));
 flyCard(card);codex.notice();
}
function dealTalk(target){
 const draw=peek(sim.s,'talk',target),name=PEOPLE.find(n=>n.id===target)?.name;
 if(!draw){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}
 const cached=dealCache.get(target),ai=cached?.sig===dealSig(draw)?cached.result:null;dealCache.delete(target);
 const card=commitDeal(sim,draw,target,draw.card==='echo'?{}:pickEvent(draw,target,ai));
 if(card.card==='aid')observeProgress(sim,name+'替你包扎');
 save();dealt(card);
 dialogue.play([{id:target,text:card.line}],()=>{
  const rest=talkOptions(target),route=card.place&&placePoint(card.place,world.npcs)?[{id:'deal_route',label:'记下了，这就去看看',mode:'dealRoute',kind:'listen',place:card.place}]:[];
  if(route.length)showTalkChoices(target,[...route,...(rest.length?[{id:'topic:more',mode:'topic',label:'再聊聊别的',reply:'你说。',children:talkTree(target,rest)}]:[]),{id:'deal_end',label:'先告辞',mode:'endTalk',kind:'listen'}]);
  else if(rest.length)showTalkChoices(target,talkTree(target,rest));else closePanel();
 },name);
}
function routeLead(place){const point=placePoint(place,world.npcs);if(point&&world.routeTo(point,1.8))toast('沿路前往 · 按 WASD 可随时中止');else toast('前路不通，请绕行。');}
function leadById(id){const e=EVENTS.find(x=>x.id===id);if(!e?.place)return;closeDrawer();routeLead(e.place);}
async function aftermathAI(ctx){
 if(!aiReady||!ctx.deeds.length)return null;
 try{const r=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ctx),signal:AbortSignal.timeout(9000)});return r.ok?await r.json():null;}catch{return null;}
}
async function dawnAftermath(){
 const owner=sim,s=sim.s,ctx=aftermathContext(s),upTo=s.chronicle?.seq||0;
 const ai=await aftermathAI(ctx);if(owner!==sim)return;
 const after=ctx.deeds.length?applyAftermath(sim,ai,upTo):null,cards=deliverMail(sim);
 if(!after&&!cards.length)return;
 observeProgress(sim,'夜里传开的余波');save();
 for(const c of cards)journal.add('system','江湖牌 · '+CARDS[c.card].name,c.title+'：'+c.line);
 for(const line of after?.diary.lines||[])journal.add('system','江湖日记',line,'diary:'+after.diary.day+':'+line);
 codex.notice();
}
async function nightDeal(nearby){
 const owner=sim,s=sim.s,ctx=aftermathContext(s),upTo=s.chronicle?.seq||0;
 const pending=(async()=>{
  const ai=await aftermathAI(ctx);
  if(owner!==sim)return null;
  const after=applyAftermath(sim,ai,upTo),cards=deliverMail(sim);
  let visit=null;
  for(const id of nearby){const draw=peek(s,'rest',id);if(!draw||!draw.candidates?.length)continue;
   let pick=null;if(aiReady){try{const r=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dealContext(s,draw,id)),signal:AbortSignal.timeout(6000)});if(r.ok)pick=await r.json();}catch{}}
   if(owner!==sim)return null;visit=commitDeal(sim,draw,id,pickEvent(draw,id,pick));break;}
  if(!visit)commitDeal(sim,peek(s,'rest',null),null,{});
  observeProgress(sim,'夜里传开的余波');save();
  for(const c of [...cards,visit].filter(Boolean))journal.add('system','江湖牌 · '+CARDS[c.card].name,(c.title?c.title+'：':'')+(c.lead||c.line));
  for(const line of after.diary.lines)journal.add('system','江湖日记',line,'diary:'+after.diary.day+':'+line);
  return {diary:after.diary,echoes:after.echoes,cards:[...cards,visit].filter(Boolean)};
 })();
 closePanel();closeDrawer();night.show({day:s.day,clock:shichenText(s),pending});
}
function showTalkChoices(target,options){panelTarget=target;dialogue.choose({title:PEOPLE.find(n=>n.id===target)?.name,listener:target,options:options.map(action=>({action,preview:action.mode==='topic'?{certain:true}:bubblePreview(action)})),onSelect:runBubbleAction,onClose:closePanel});}
function runBubbleAction(a){
 if(!a||world.performance)return;
 if(!inReach()){closePanel();toast('已经走远了，靠近后再聊。');return;}
 const target=panelTarget,actor=target==='scene'?(sim.event?.cast?.[0]||(a.kind==='listen'||a.kind==='rival'?'su':'shen')):target;
 if(target!=='scene'&&faceOfficer(target))return;const memoryKey=target!=='scene'?topicKey(sim.s,target,a):null;let r;
 if(a.mode==='probe'){const state=probeButtonState(target);if(state.blocked){toast(state.detail);return;}const result=probeNpc(sim,target);if(result.error){toast(result.error);return;}closePanel();if(result.cached)openNpcInfo(target);else pendingProbe={id:target,success:result.success,insight:result.insight};return;}
 if(a.mode==='endTalk'){closePanel();return;}
 if(a.mode==='show'){closePanel();environment.openGift(target);return;}
 if(a.mode==='deal'){dealTalk(target);return;}
 if(a.mode==='dealRoute'){closePanel();routeLead(a.place);return;}
 if(a.mode==='topic'){dialogue.play([{id:target,text:a.reply}],()=>showTalkChoices(target,a.children),PEOPLE.find(n=>n.id===target)?.name);return;}
 if(a.mode==='talk'){meet(sim,target);const person=sim.s.people[target];if(person.greeted){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}person.greeted=true;sim.save();const hasStory=hasTalkStory(target),view=hasStory?sim.sceneView():null;const line=(target==='old_constable'&&learnedFootwork(sim,target)?'上次教你的身法，用着还顺手吗？':view?.line)||courtLine(sim.s,target)||({tea_host:VOICE_LINES.teaGreeting,bookseller:VOICE_LINES.booksellerGreeting,traveler:target==='traveler'?princeGreeting(sim.s):null,relay:'你要找什么？我手上的活还没做完。',gate_merchant:VOICE_LINES.merchantGreeting,scribe:VOICE_LINES.scribeGreeting}[target]||opening(target)||null);if(!line){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}dialogue.play([{id:target,text:line}],()=>{panelTarget=target;const options=talkOptions(target);showTalkChoices(target,talkTree(target,options));},PEOPLE.find(n=>n.id===target)?.name);return;}
 if(a.mode==='story'){panelTarget='scene';bubbleEvent=sim.event.id;const v=sim.sceneView();dialogue.play(v?.dialogue||[],()=>{panelTarget='scene';renderBubbles();},v?.title||'眼前的事');return;}
 if(a.mode==='pressure'){if(world.npcs.get(target).actor.position.distanceTo(world.hero.position)>2.2){toast('再靠近一点，才能伸手点穴。');return;}const check=touchPreview(sim,target,a.point);if(check.blocked)return toast('当前无法点穴。');closePanel();world.perform({motion:'pressure',kind:'steal'},target);const beat=world.performance;beat.point=a.point;checkReveal.start({stat:'agility',label:a.point==='mute'?'点哑穴':'点定身穴'},check);beat.onStrike=()=>{if(world.hero.position.distanceTo(world.npcs.get(target).actor.position)>2.2||!visibleBetween(world.hero.position,world.npcs.get(target).actor.position,world.obstacles,environment.eco.s.objects)){checkReveal.cancel();toast('目标已不在伸手可及之处。');return;}const result=pressurePoint(sim,target,a.point);if(result.error){checkReveal.cancel();toast(result.error);return;}beat.hit=result.success;world.onSound?.(result.success?'body':'notice',{gain:.4});};return;}
 else if(a.mode==='contact')r=contactResolve(sim,environment.eco,target,a.id);
 else if(a.mode==='social')r=socialResolve(sim,target,a.id);
 else if(target==='scene')r=sim.resolve(bubbleEvent,a.id);
 else if(a.mode==='papers')r=sim.inspectPass();
 else if(a.mode==='check')r=sim.npcCheck(target,a.id);
 else if(a.mode==='rest'){rest();return;}
 else if(a.mode==='leave'){r={};queueSpeech([{id:target,text:'江湖路远，后会有期。'}]);toast('你拱手告辞。');}
 else r=sim.npcAction(target,a.id==='gift-tea'?'gift':a.id);
 if(r?.error){toast(r.error);return;}
 if(memoryKey&&r&&!r.error&&(r.success||a.id==='befriend')){heard(sim.s,target,memoryKey);sim.save();}
 if(isDirectReply(r)){visualResult=null;closePanel();dialogue.play(r.dialogue.map(line=>({...line,shot:line.shot||'close'})),cancelled=>{if(cancelled){closePanel();return;}const next=contactFollowups(sim,target,r);if(next.length){panelTarget=target;if(inReach()){showTalkChoices(target,next);return;}}if(r.ongoing&&sim.sceneView()&&world.nearbyEvent()){panelTarget='scene';bubbleEvent=sim.event.id;$('result').hidden=true;$('panel').hidden=false;renderBubbles();}else closePanel();},r.label);return;}
 if(r?.text&&target!=='scene'&&a.mode!=='check')toast(r.text);
 closePanel();world.perform({...a,motion:r?.motion},actor);
}
async function rank(){const req=epoch,id=sim.event?.id;try{const response=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sim.context()),signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error();const result=await response.json();const ids=[...new Set(result.ids||[])].filter(id=>sim.actions().some(a=>a.id===id&&!sim.preview(a).blocked));if(ids.length<3)throw Error();if(req!==epoch||id!==sim.event?.id)return;ranked=ids.slice(0,5);aiStatus='AI 已参与推荐';if(!bubbleGroup)renderScene();}catch{if(req!==epoch)return;aiStatus='本地画像推荐';if(panelTarget==='scene')renderScene();}}
function faceOfficer(id){const actor=world.npcs.get(id)?.actor;if(!actor||!lawConfrontation(sim,id,actor.position.distanceTo(world.hero.position)))return false;
 closePanel();environment.close();world.clearReady();world.auto=null;const s=sim.s;
 dialogue.choose({title:PEOPLE.find(n=>n.id===id).name+'喝令你放下兵刃',listener:id,options:[['submit','收刀认拘，服刑三日'],['retreat','拉开距离，寻找退路'],['resist','拔刀拒捕']].map(([id,label])=>({action:{id,label},preview:{certain:true}})),onClose:closePanel,onSelect:a=>{
 if(a.id==='submit'){endPlayerPursuit(s);if(!detainAtGate(sim)){imprisonmentCost(sim);s.day+=3;s.wanted=0;s.reputation-=10;Object.assign(s.player,PRISON.release);sim.emit('relocate');journal.add('system','刑满释放','你收刀认拘，服刑三日后回到城内街口。');}sim.save();}
 else if(a.id==='resist'){world.readyUntil=Infinity;world.onReady?.();}else toast('趁现在拉开距离。');}});return true;}
function interact(targetId=null){if(typeof targetId==='string')selectedNpc=targetId;if(typeof targetId!=='string')targetId=null;
 if(!started||world.locked||world.performance||sim.s.player.hp<=0)return;
 const theftNpc=targetId||world.nearest()?.id;if(theftNpc&&faceOfficer(theftNpc))return;if(sim.s.player.stealing&&theftNpc&&objects.openTheft(theftNpc))return;
 if(!targetId&&objects.interact())return;
 if(!$('panel').hidden){closePanel();return;}
 if(!targetId&&!world.nearest()&&!world.nearbyEvent()&&environment.interactStreet())return;
 const chosen=targetId&&world.npcs.get(targetId),n=chosen?{id:targetId,npc:chosen}:world.nearest();if(chosen&&chosen.actor.position.distanceTo(world.hero.position)>3.3)return toast('再靠近些才能交谈。');if(n&&sim.event?.type==='gate')visitGate(sim,n.id);if(!n&&!world.nearbyEvent())return;
 world.clearReady();world.auto=null;epoch++;ranked=null;bubbleGroup=null;bubblePage=0;
 panelTarget=n?.id||(world.nearbyEvent()?'scene':null);
 if(!panelTarget)return;if(panelTarget!=='scene')selectedNpc=panelTarget;if(sim.s.people[panelTarget]?.hp<=0||sim.s.people[panelTarget]?.stunnedUntil>(sim.s.npcClock||0))return;if(sim.s.people[panelTarget]?.awareness?.state==='fight')return;
 bubbleEvent=sim.event?.id;
 if(panelTarget==='scene'){
  const eventId=bubbleEvent,view=sim.sceneView(),text=view?.text;
  const lines=view?.dialogue||(text?[{id:'su',text}]:SCENES[sim.event.type].lines.map(text=>{const [name,...rest]=text.split('：');return {id:PEOPLE.find(p=>p.name===name)?.id||'shen',text:rest.join('：')||text};}));
  dialogue.play(lines,()=>{if(sim.event?.id!==eventId||!world.nearbyEvent())return;panelTarget='scene';bubbleEvent=eventId;$('panel').hidden=false;renderBubbles();},SCENES[sim.event.type].name);return;
 }
 $('panel').hidden=false;renderBubbles();
}
world.onGift=(id,key)=>{
 const fail=error=>({error});
 if(world.locked||world.performance||sim.s.player.hp<=0)return fail('先完成当前动作。');
 const n=world.npcs.get(id);
 if(!n||n.actor.position.distanceTo(world.hero.position)>3.3)return fail('对方已走远，再靠近些才能递给他。');
 if(!visibleBetween(world.hero.position,n.actor.position,world.obstacles,environment.eco.s.objects))return fail('中间有遮挡，无法递过去。');
 const r=giveItem(sim,environment.eco,id,key);if(r.error){if(sim.s.people[id].hp>0&&!(sim.s.people[id].stunnedUntil>(sim.s.npcClock||0)))queueSpeech([{id,text:/药粉/.test(r.error)?'这是什么药？来历不明的东西，我不能收。':/饿|吃|食/.test(r.error)?'多谢，我现在吃不下，你先留着吧。':'先收回去吧，我现在不想接。'}]);return r;}
 environment.close();closePanel();world.perform({id:'give',kind:'support',motion:'offer'},id);queueSpeech([{id,text:id==='inspector'&&r.delta===0?r.text:id==='traveler'&&/副账|税课|口供/.test(r.item)?'这份凭据我收下了。先别惊动他们，听雨楼再议。':id==='traveler'?'多谢。东西贵不贵不打紧，心意我领了。':'这份心意我收下了，多谢。'}]);return r;
};
$('interact').onclick=interact;world.onGateTalk=interact;world.onNpcSelected=id=>{selectedNpc=id;};
window.addEventListener('keydown',e=>{
 if(!started||e.isComposing||e.repeat)return;
 if(e.code==='Escape'&&!$('conversation').hidden){e.preventDefault();e.stopImmediatePropagation();collapseConversation();return;}
 if(e.code==='Enter'&&!e.target.closest?.('input,textarea,select,button')){e.preventDefault();e.stopImmediatePropagation();openConversation();}
},true);
window.addEventListener('keydown',e=>{if(!started)return;if(e.target.closest?.('input,textarea,select')||e.isComposing){if(e.code==='Escape')e.target.blur();return;}if(['Space','Tab','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.repeat)return;if(night.active){if(['Escape','Enter','Space'].includes(e.code))night.close();return;}environment.key(e);if(e.code==='Escape'){closePanel();closeDrawer();return;}const page={KeyC:'self',KeyJ:'affairs',KeyK:'people',KeyM:'map'}[e.code];if(page&&!dialogue.active){if(codex.isOpen(page))closeDrawer();else codex.open(page);return;}if(e.code==='Tab'){!$('drawer').hidden?closeDrawer():inbox();return;}if(world.locked)return;world.keys.add(e.code);if(e.code==='Space')world.jump();if(e.code==='Slash'){e.preventDefault();world.toggleWeapon();}if(e.code==='KeyE')interact();if(e.code==='KeyR'&&sim.s.player.hp<=0)rest();});window.addEventListener('keyup',e=>world.keys.delete(e.code));
fetch('/api/status').then(r=>r.json()).then(r=>{aiReady=!!r.configured;aiStatus=r.configured?'AI 随时待命':'本地画像推荐';}).catch(()=>aiStatus='本地画像推荐');
const compass=document.createElement('div');compass.className='field-compass';compass.setAttribute('aria-hidden','true');
const bearings=['北','东北','东','东南','南','西南','西','西北'].map((label,i)=>{const mark=document.createElement('span');mark.textContent=label;compass.append(mark);return {mark,angle:i*45};});
$('hud').append(compass);
function mini(){
 const bearing=Math.atan2(-world.camera.matrixWorld.elements[8],world.camera.matrixWorld.elements[10])*180/Math.PI;
 for(const {mark,angle} of bearings){const d=((angle-bearing+540)%360)-180;mark.hidden=Math.abs(d)>64;if(!mark.hidden)mark.style.left=(50+d/1.28)+'%';}
const canvas=$('minimap').querySelector('canvas'),ctx=canvas.getContext('2d'),p=world.hero.position;ctx.clearRect(0,0,164,164);ctx.save();ctx.beginPath();ctx.arc(82,82,80,0,Math.PI*2);ctx.clip();ctx.strokeStyle='#7b766a38';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(82,0);ctx.lineTo(82,164);ctx.stroke();ctx.fillStyle='#3d647055';ctx.fillRect(13,0,14,164);for(const o of world.obstacles){ctx.fillStyle='#4f4b4250';ctx.fillRect(82+o.x*2.5-o.w,82+o.z*2.5-o.d,o.w*2,o.d*2);}
 for(const [x,z,label]of [[10,-23,'官'],[23,-5,'帮']]){ctx.fillStyle='#a63a2b';ctx.font='16px "Jianghu Title",KaiTi,serif';ctx.fillText(label,78+x*2.5,86+z*2.5);}
 const hot=environment.streetHotspot();canvas.title=hot?hot.name:'';canvas.setAttribute('aria-label',hot?'临溪镇小地图 · '+hot.name:'临溪镇小地图');
 if(hot){const x=82+hot.point[0]*2.5,y=82+hot.point[1]*2.5,r=15+Math.sin(world.t*2)*2,color=hot.mode==='fight'?'166,58,43':'156,109,60',gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,`rgba(${color},.8)`);gradient.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(${color},.85)`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();}
 for(const [id,n]of world.npcs){ctx.fillStyle=id==='guard'?'#4f4b42':'#7b766a';ctx.beginPath();ctx.arc(82+n.actor.position.x*2.5,82+n.actor.position.z*2.5,2,0,7);ctx.fill();}ctx.fillStyle='#15140f';ctx.beginPath();ctx.arc(82+p.x*2.5,82+p.z*2.5,4,0,7);ctx.fill();if(world.auto?.length){const q=world.auto.at(-1);ctx.strokeStyle='#a63a2b';ctx.beginPath();ctx.arc(82+q[0]*2.5,82+q[1]*2.5,5,0,7);ctx.stroke();}ctx.restore();}
$('minimap').querySelector('canvas').onclick=e=>{const hot=environment.streetHotspot();if(!hot||world.locked)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)*164/r.width,y=(e.clientY-r.top)*164/r.height;if(Math.hypot(x-82-hot.point[0]*2.5,y-82-hot.point[1]*2.5)<20)environment.openStreet();};
let prev=performance.now(),lastUI=0,lastSave=0;
const gateGoal=document.createElement('button');gateGoal.id='gate-objective';gateGoal.hidden=true;document.body.append(gateGoal);gateGoal.onclick=()=>{if(!dialogue.active&&!checkReveal.active&&sim.event?.type==='gate'){if(!objects.navigate())world.routeTo(sim.event.point,1.8);}};
mountHudLayout();
function openQuests(){codex.open('affairs');}
const unlock=document.createElement('button');unlock.id='person-unlock';unlock.hidden=true;document.body.append(unlock);let unlockTimer;
function showUnlock(id,insight){const info=npcInfo(sim,environment.eco,id);if(!info)return;clearTimeout(unlockTimer);
 const title=(info.faction==='？？？'?'归属待查':info.faction)+' · '+info.name;
 unlock.innerHTML=npcPortrait(info)+'<span><small>已解锁人物</small><b>'+esc(title)+'</b><em>（'+esc(insight)+'）</em></span><strong aria-hidden="true">›</strong>';
 unlock.setAttribute('aria-label','查看势力图：'+title);unlock.hidden=false;unlockTimer=setTimeout(()=>unlock.hidden=true,5500);
 unlock.onclick=()=>{clearTimeout(unlockTimer);unlock.hidden=true;showOrganization(personTab(sim,id));const node=$('drawer').querySelector('[data-org-person="'+CSS.escape(id)+'"]');if(node){node.classList.add('discovered-focus');requestAnimationFrame(()=>node.scrollIntoView({block:'center',inline:'center'}));}};
}
function openNpcInfo(id,insight=null){const info=npcInfo(sim,environment.eco,id);if(!info)return;selectedNpc=id;
 drawer(info.name,`${insight?'<p>此刻心念 · （'+esc(insight)+'）</p>':''}<div class="npc-summary">${npcPortrait(info)}<p>${esc(info.title)}<br>势力：${esc(info.faction)} · ${info.attitude}</p></div>${info.probed?`<p>${esc(info.condition)} · ${esc(info.observation)}</p><h3>随身包裹</h3><div class="pack-grid"><div class="pack-tile">${icon('Coins')}<span>${info.money} 文</span></div>${info.items.map(i=>`<div class="pack-tile">${icon(itemIcon(i))}<span>${esc(i.name)}</span></div>`).join('')}</div><p>查看不会取走物品。靠近后蹲行可尝试偷窃；密封物品的内容尚未查看。</p>`:'<p>尚未探查。靠近后选择“探查”，了解可观察的信息与随身物品。</p>'}`);
}
const npcCard=document.createElement('button');npcCard.id='npc-target-card';npcCard.hidden=true;document.body.append(npcCard);npcCard.onclick=()=>{if(selectedNpc)openNpcInfo(selectedNpc);};let npcCardHtml='';
function updateNpcCard(){const n=world.npcs.get(selectedNpc),info=npcInfo(sim,environment.eco,selectedNpc);npcCard.hidden=!started||!info||!n||n.actor.position.distanceTo(world.hero.position)>14||world.locked||world.performance||document.body.classList.contains('hud-detail-open');if(npcCard.hidden)return;const html=npcPortrait(info)+`<span><b>${esc(info.name)}</b><small>${esc(info.title)}</small><small>${esc(info.faction)} · ${info.attitude}</small></span>`;if(html!==npcCardHtml){npcCard.innerHTML=html;npcCardHtml=html;}npcCard.setAttribute('aria-label','查看'+info.name+'的信息');}
const progressUI=mountProgressUI(()=>sim,esc,openQuests,()=>codex.isOpen()?closeDrawer():codex.open('affairs'),()=>codex.isOpen('map')?closeDrawer():codex.open('map'));
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.045,(now-prev)/1000);prev=now;if(document.hidden)return;
 if(started&&!dialogue.active&&!checkReveal.active&&!night.active&&($('drawer').hidden||$('drawer').dataset.view!=='rest'))sim.tick(dt);world.playing=started;world.locked=checkReveal.active||dialogue.active||objects.busy||!started||!$('drawer').hidden||night.active;objects.update(dt,started);world.locked=checkReveal.active||dialogue.active||objects.busy||!started||!$('drawer').hidden||night.active;world.update(dt);npcVoice.update();worldAudio.update(dt,{started,x:world.hero.position.x,z:world.hero.position.z,time:sim.s.time,voice:!!npcVoice.source,talking:dialogue.active,performing:world.performance?.motion==='flute'||!!environment.eco.show,hp:sim.s.player.hp,grounded:world.hero.position.y<.02,crouching:sim.s.player.crouched});aim.update();if(visualResult&&!world.performance&&!dialogue.active)world.onPerformanceEnd?.();if(!dialogue.active&&!checkReveal.active){environment.update(dt,started);}positionBubbles();if(!checkReveal.active&&!dialogue.active&&!world.performance&&pendingActionSpeech.length){queueSpeech(pendingActionSpeech.splice(0));}updateSpeech();
 gateGoal.hidden=!started||sim.event?.type!=='gate'||dialogue.active;if(!gateGoal.hidden)iconButton(gateGoal,'MapPin','前往：'+sim.sceneView().title);
 if(started&&now-lastUI>120){lastUI=now;progressUI.update(started);updateNpcCard();environment.refreshPack(started);updateProfile();updateConversation();const s=sim.s;$('combat-ready').hidden=!world.combatReady||world.locked;$('hp').value=s.player.hp;$('energy').value=s.player.energy;document.body.classList.toggle('vitals-full',s.player.hp>=$('hp').max&&s.player.energy>=$('energy').max);$('role-name').textContent=s.party.active==='companion'?'阿笙 · 同行':ROLES[s.role].name;$('money').textContent=s.player.money+' 文';$('clock').textContent=shichenText(s);$('clock').title=clockText(s)+' · 饱食 '+Math.round(s.player.satiety)+' / 100 · 精神 '+Math.round(s.player.rested)+' / 100';for(const [key,line] of [['satiety','（腹中空得难受，得找口吃的。）'],['rested','（眼皮直打架，找地方睡会儿吧。）']]){if(s.player[key]>25)s.player[key+'Warned']=false;else if(s.player.hp>0&&!world.locked&&!s.player[key+'Warned']&&world.onThought(line))s.player[key+'Warned']=true;};$('wanted').textContent=s.wanted?'嫌疑 '+s.wanted:'青竹会声望 '+s.reputation;$('unread').textContent=s.mail.filter(m=>!m.read).length||'';
 const event=world.nearbyEvent(),near=world.nearest(),hidden=world.locked||!$('panel').hidden||!!world.performance||(!event&&!near&&!environment.nearStreet()&&!objects.canInteract)||s.player.hp<=0;$('interact').hidden=hidden;iconButton($('interact'),'MessageCircle',(event?'看看眼前发生的事':environment.nearStreet()?'介入街头动静':'与'+(near?.npc.person.name||'路人')+'交互'));if(near){const label=s.player.stealing?'翻看'+near.npc.person.name+'的随身物品':'与'+near.npc.person.name+'对话';$('interact').innerHTML='<span class="npc-talk-label">'+esc(label)+'</span>';$('interact').setAttribute('aria-label',label);}else{delete $('interact').dataset.icon;}$('ambient').hidden=!!(near&&s.people[near.id]?.awareness?.caseOpen)||!event||world.locked||!$('panel').hidden||speechQueue.length>0;if(event&&!$('ambient').hidden&&!world.locked&&!speechQueue.length){const lines=sim.sceneView()?[sim.sceneView().line]:SCENES[sim.event.type].lines,line=lines[Math.floor(world.t/6)%lines.length];$('ambient').textContent=line;const split=line.indexOf('：');journal.add('chat',split>=0?line.slice(0,split):'街坊',split>=0?line.slice(split+1):line,`ambient:${sim.event.id}:${line}`);}mini();}
 if(started&&now-lastSave>6000){lastSave=now;save();}
}
requestAnimationFrame(frame);window.addEventListener('beforeunload',save);
if(sessionStorage.getItem('jianghu-restart')==='1'){sessionStorage.removeItem('jianghu-restart');begin(true,true);}
