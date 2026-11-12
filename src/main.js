import {convoyAftermathOptions} from './convoy-aftermath.js';
import {identityFavorOptions} from './identity-favors.js';
import {finishIdentityDialogue,identityConversationActive} from './identity-opportunities.js';
import {rescueDebt,pendingActionCard,actionCardChoices,answerActionCard,actionLine} from './action-cards.js';
import {isConvoyAction} from './convoy.js';
import {mountConvoyInteraction} from './convoy-view.js';
import {apprenticeshipBook} from './apprenticeship.js';
import {mountApprenticeship,mountSkillGuide} from './apprenticeship-view.js';
import {CITIES,cityOf,knownHQ,reputationHTML,cityRep,factionRep,reputationName} from './reputation.js';
import {restingPlace,recordRest,restTalk} from './chapter.js';
import {skillBookHTML,skill} from './skills.js';
import {meaningCheck} from './item-meaning.js';
import {NpcVoice,spokenActor} from './npc-voice.js';
import {WorldAudio} from './world-audio.js';
import {VOICE_LINES} from './voice-lines.js';
import {clockText,shichenText,untilTime} from './world-clock.js';
import {mountInvestigation} from './investigation-world.js';
import {mountInvestigationHUD} from './investigation-ui.js';
import {restraintOptions,restraintPreview,beginRestraintAttempt} from './npc-restraints.js';
import {restraintConversation,finishRestraintConversation,restraintReplies} from './restraint-dialogue.js';
import {mountAim} from './aim-skills.js';
import {detainByOfficer} from './gate-scene.js';
import {endPlayerPursuit,lawConfrontation} from './pursuit.js';
import {answerComplaint,complaintChoices} from './complaints.js';
import {chooseResponses} from './response-menu.js';
import {flattenResponses} from './contextual-responses.js';
import {pendingEcho,seesEchoPlayer,markEchoHeard,echoChoices,answerEcho} from './aftermath-encounters.js';
import {opening,fresh,topicKey,heard} from './conversation-memory.js';
import {courtLine} from './court-street.js';
import {wakePlayer} from './bed-rest.js';
import {wakeNpc,finishNightConversation} from './night-life.js';
import {talkTree} from './talk-tree.js';
import {thoughtLine} from './body-feedback.js';
import {princeGreeting} from './prince-voice.js';
import {probePreview,probeNpc,npcInfo,npcPortrait} from './npc-discovery.js';
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
import {mountHudLayout,placeWorldSpeech} from './hud-layout.js';
import {visitGate} from './gate-scene.js';
import {mountObjectInteractions} from './object-interactions.js';
import {mountDialogue,isDirectReply,sceneDialogueReady,continuesSceneDialogue,chanceText,choiceCheckText,isStoryChoice} from './dialogue.js';
import {PATHS,growth,growthBonus,checkGrade} from './growth.js';
import {switchMember} from './party-state.js';
import {icon,iconButton} from './ui-icons.js';
import {mountAppearanceUI} from './appearance-ui.js';
import {mountDisguiseEncounter} from './disguise-encounter.js';
import {currentFace} from './appearance.js';
import {mountWantedEncounter} from './wanted-encounter.js';
import {observeFaceChange} from './appearance.js';
import {mountEnvironment} from './environment-ui.js';
import {createJournal} from './journal.js';
import {Simulation,newGame,newArrival} from './simulation.js';
import {World} from './world.js';
import {BONUS} from './action-contracts.js';
import {GROUPS,groupActions,bubbleLayout} from './interaction.js';
import {ATTR,ROLES,PEOPLE,SCENES} from './data.js';
import {saveKey,loadCurrentSave,obsoleteSavePresent} from './save-state.js';
import {mountOpeningSequence,recordOpeningBackground} from './opening-sequence.js';
import {npcActionAccess} from './npc-action-access.js';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gatePreview=new URLSearchParams(location.search).get('preview')==='gate';
const saveScope={gatePreview,playtest:new URLSearchParams(location.search).get('playtest')||''};
const SAVE=saveKey(saveScope);let saved=loadCurrentSave(localStorage,SAVE);
const legacySave=!saved&&obsoleteSavePresent(localStorage,saveScope);
if(legacySave){const note=document.createElement('p');note.className='save-notice';note.textContent='初始属性与技艺规则已更新，旧存档已作废，请开启新档。';$('start').before(note);}
let restartConfirmed=false,selectedNpc=null,pendingProbe=null;
function createSoloWorld(game){switchMember(game.s,'main');return new World($('world'),game);}
let sim=new Simulation(saved||newArrival()),world=createSoloWorld(sim),started=false,panelTarget=null,more=false,ranked=null,epoch=0,sound=true,resultTimer,aiStatus='正在连接',aiReady=false,sleepingThrough=false;
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
const wardrobe=mountAppearanceUI({world,getSim:()=>sim,environment,drawer,toast,esc});
const wantedEncounter=mountWantedEncounter({getSim:()=>sim,world,dialogue,checkReveal,close:()=>{closePanel();environment.close();},log:text=>journal.add('system','通缉身份盘问',text),available:()=>started&&!world.locked&&!world.performance&&!dialogue.active&&!checkReveal.active&&sim.s.player.hp>0});
const disguiseEncounter=mountDisguiseEncounter({wanted:wantedEncounter,getSim:()=>sim,world,dialogue,checkReveal,close:()=>{closePanel();environment.close();},log:(who,text)=>journal.add('system',who,text),resume:id=>showTalkChoices(id,talkTree(id,talkOptions(id))),available:()=>started&&!world.locked&&!world.performance&&!dialogue.active&&!checkReveal.active&&sim.s.player.hp>0});
const objects=mountObjectInteractions(world,()=>sim,environment,toast,closePanel);
const codex=mountCodex({drawer,getSim:()=>sim,esc,profileHTML,organizationHTML:tab=>organizationHTML(sim,esc,tab),questsHTML:()=>questsHTML(sim.s,esc),onLead:id=>leadById(id),
 onSound:toggle=>{if(toggle)$('sound').click();return sound;},onGuide:()=>{closeDrawer();document.body.classList.toggle('show-controls');},onTeacher:id=>{closeDrawer();const q=world.npcs.get(id)?.actor.position;if(q)world.routeTo([q.x,q.z],2);},onHeadquarters:id=>{const h=knownHQ(sim.s).find(h=>h.id===id);if(h){closeDrawer();world.routeTo([h.x,h.z+3],2);}},onTrack:id=>{sim.s.trackedQuest=sim.s.trackedQuest===id?null:id;save();}});
const night=mountNight({esc,onClose:()=>{world.keys.clear();save();}});
const aim=mountAim(world,()=>sim,()=>started&&!world.locked&&!world.performance&&!dialogue.active&&!checkReveal.active&&sim.s.player.hp>0,()=>{closePanel();environment.close();},(id,mode,point)=>{panelTarget=id;runBubbleAction({id:mode,mode,point,kind:mode==='probe'?'listen':'steal'});},toast,()=>environment.eco);

const lessons=mountApprenticeship(world,()=>sim,()=>environment.eco,{clear:()=>{closePanel();closeDrawer();environment.close();aim.exit();},say:(id,text)=>queueSpeech([{id,text}]),notify:toast,follow:(id,options,text)=>{const next=()=>{if(options.length){panelTarget=id;showTalkChoices(id,talkTree(id,[...options,{id:'lesson_end',mode:'endTalk',kind:'listen',label:'先去办事'}]));}};if(text)dialogue.play([{id,text}],cancelled=>{if(!cancelled)next();},'传习');else next();}});
const convoyActions=mountConvoyInteraction({world,getSim:()=>sim,getEco:()=>environment.eco,dialogue,checkReveal,close:()=>{closePanel();environment.close();},notify:toast,choices:showTalkChoices});
world.onConvoyTheft=itemId=>convoyActions.startTheft(itemId);
const skillGuide=mountSkillGuide(()=>sim,()=>started&&!world.locked&&!dialogue.active&&!lessons.active&&!world.performance&&$('panel').hidden,mode=>{if(mode)document.querySelector('#aim-skills [data-skill="'+mode+'"]').click();else codex.open('self');});
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
 if(type==='combatDefense'){world.showNpcCheck({id:data.id,label:data.label,success:true,observation:true,priority:true});journal.add('system','交锋',data.label);}
 if(type==='reputationChanged'){const place=data.faction?knownHQ(sim.s).find(h=>h.id===data.faction)?.name:CITIES[data.city||cityOf(sim.s)];journal.add('system','名声',(place||'此地')+' '+(data.amount>0?'+':'')+data.amount+' · '+data.reason);}
 if(type==='apprenticeshipComplete'){journal.add('system','师承',data.changes.join(' · ')+'。'+data.text);tone('success');}
 if(type==='npcRoutine'){const q=world.npcs.get(data.id)?.actor.position;if(q&&q.distanceTo(world.hero.position)<12&&visibleBetween(q,world.hero.position,world.obstacles,sim.s.ecosystem?.objects)&&!world.cinematic&&!speechQueue.length&&!pendingActionSpeech.length)queueSpeech([data]);}
 if(type==='worldIncident')world.noticeIncident(data);
 if(type==='faceChanged')observeFaceChange(sim,data,Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y,visible:n.actor.visible}])),world.obstacles);
 if(type==='musicLook'){const n=world.npcs.get(data.id);if(n){n.musicLookUntil=world.t+1.2;n.musicPoint={x:data.x,z:data.z};}}
 if(type==='actorDeltas'&&started)world.queueActorDeltas(data);
 if(type==='npcCheck')world.showNpcCheck(data);
 if(type==='fieldCheck'){closePanel();environment.close();world.clearReady();if(!data.staged)world.perform({id:data.actionId||'steal',kind:data.actionId==='probe'?'listen':'steal',motion:data.actionId==='probe'?'talk':'reach'},data.target);checkReveal.play(data,()=>{},true);}
 if(type==='territoryReport')journal.add('system','堂口交锋',data.text);
 if(type==='royalDiscovery')showUnlock('traveler','御印密信：锦衣客是宋徽宗的弟弟，奉皇兄手诏查案。');
 if(type==='complaintResult'){journal.add('system',PEOPLE.find(p=>p.id===data.id)?.name+' · 问责',data.text);if(data.dialogue){world.quietUntil=world.t+10;dialogue.play(data.dialogue,cancelled=>{checkReveal.cancel();world.quietUntil=world.t+10;if(!cancelled&&data.continued&&sim.s.complaint?.cause===data.cause)openComplaint(sim.s.complaint);},data.label);if(data.roll!=null)checkReveal.play(data,()=>{});}}
 if(type==='complaintAsk'&&!dialogue.active)openComplaint(data);
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
 if(type==='result'){if(data.type==='conversation')journal.add('chat','你',data.label);if(data.type!=='conversation'||data.roll!==null||data.changes.length)journal.add('system',data.label,`${data.roll!=null?`检定 ${data.roll}/${data.check.chance} · ${data.success?'成功':'失败'}。`:''}${data.text}${data.changes.length?'（'+data.changes.join('，')+'）':''}`);if(data.handledPresentation||isDirectReply(data))return;const staged=!!data.eventId&&Array.isArray(data.dialogue);if(!staged)generateReaction(data);const fromMenu=!!panelTarget;closePanel();if(fromMenu||staged){visualResult=data;if(data.roll!=null)checkReveal.play(data,()=>{},true);}else if(data.type==='conversation'&&data.roll===null&&!data.changes.length){$('result').hidden=true;toast('你：'+data.label);}else showResult(data);world.reaction={kind:data.kind,success:data.success,until:world.t+3};world.burst(world.hero.position.x,1.3,world.hero.position.z,data.success?0xe7ce92:0xbc735b,10);}
 if(type==='npc'){journal.add('system','交互',data.reaction?.text||data.text);tone('mail');if(data.reaction)generateReaction(data.reaction);else queueSpeech([{id:data.id,text:data.text}]);}
 });world.onPerformanceEnd=()=>{checkReveal.stop();if(pendingProbe){const probe=pendingProbe;pendingProbe=null;if(probe.success&&(!sim.s.player.skills||sim.s.people[probe.id].probedTier>=2))showUnlock(probe.id,probe.insight);else if(probe.success)queueSpeech([{id:'hero',text:'（'+probe.insight+'）'}]);else queueSpeech([{id:probe.id,text:probe.insight}]);}if(visualResult){const r=visualResult;visualResult=null;checkReveal.play(r,()=>dialogue.play(r.dialogue||[],cancelled=>{if(cancelled)return;if(continuesSceneDialogue(sim,r)&&world.nearbyEvent()){panelTarget='scene';bubbleEvent=sim.event.id;$('result').hidden=true;$('panel').hidden=false;renderBubbles();}else showResult(r);},(SCENES[r.type]?.name||r.label)+(r.roll!=null?` · ${r.grade||checkGrade(r.roll,r.check.chance)}`:'')));}};world.onReady=()=>{tone(world.combatReady?'draw':'sheath');toast(world.combatReady?'拔刀':'收刀');};world.onSound=tone;world.onArrive=()=>{};world.onHurt=()=>{if(sim.s.player.hp===0){endPlayerPursuit(sim.s);closePanel();closeDrawer();world.clearReady();world.attackTime=0;world.keys.clear();world.auto=null;save();toast('你受伤倒地。按 R 调息至天明，再入江湖。');}};}
bind();
const openingSequence=mountOpeningSequence();
$('continue').hidden=!saved;
if(saved){
 $('continue').textContent=`继续游戏 · ${clockText(saved)}`;$('continue').className='primary';
 $('start').before($('continue'));$('start').className='quiet';$('start').textContent='另起新局';
}
let entering=false;
async function begin(resume,fresh=false){
 if(entering||started)return;
 npcVoice.stop();worldAudio.unlock();npcVoice.unlock();
 if(!resume&&saved&&!restartConfirmed){restartConfirmed=true;$('restart-notice').hidden=false;$('restart-notice').textContent='重开将覆盖当前存档；继续游戏可保留原进度。';$('start').textContent='确认重开并覆盖存档';return;}
 entering=true;const entry=resume?$('continue'):$('start'),entryText=entry.textContent;entry.textContent='入画中…';$('start').disabled=$('continue').disabled=true;
 const ready=await world.modelsReady;
 if(!ready){entry.textContent=entryText;$('start').disabled=$('continue').disabled=false;entering=false;toast('人物资源未能载入，请刷新后重试。');return;}
 if(!resume||fresh){world.keys.clear();await openingSequence.play();sim=new Simulation(newArrival());recordOpeningBackground(sim.s);world.sim=sim;world.gatePlaced=false;world.hero.position.set(sim.s.player.x,0,sim.s.player.z);world.syncEvent();bind();}
 world.keys.clear();world.auto=null;entry.textContent=entryText;$('start').disabled=$('continue').disabled=false;entering=false;
 started=true;journal.restore();$('welcome').hidden=true;for(const id of ['hud','vitals','controls','minimap'])$(id).hidden=false;save();toast(resume&&!fresh?'旧日的人情与风波都还在。继续你的江湖。':(sim.event?.type==='gate'?'黄旗封住了关口。先看一看，再找自己的门路。':'你来到临溪。桥头传来争执声……按 E 介入。'));
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
 if(s.chapterVersion===2)return `<p>${esc(ROLES[s.role].name)}${s.chapter?.titles?.length?' · '+s.chapter.titles.map(esc).join('、'):''}</p><div class="stat-grid">${Object.entries(ATTR).map(([k,v])=>`<span>${v}${liveNumber(k,p.stats[k])}<small>${STAT_HELP[k]}</small></span>`).join('')}</div><div class="profile-values"><span>气血 ${liveNumber('hp',Math.ceil(p.hp))}</span><span>体力 ${liveNumber('energy',Math.floor(p.energy))}</span><span>盘缠 ${liveNumber('money',p.money)} 文</span><span>${CITIES[cityOf(s)]}声望 ${cityRep(s)}</span><span>嫌疑 ${liveNumber('wanted',s.wanted)}</span></div>${skillBookHTML(p,esc)}${apprenticeshipBook(s,esc)}${reputationHTML(s,esc)}`;
 return (`<p>${s.party.active==='companion'?'阿笙 · 同行':ROLES[s.role].name} · 当前控制角色的属性</p><div class="stat-grid">${Object.entries(ATTR).map(([k,v])=>`<span>${v}${liveNumber(k,p.stats[k])}<small>${STAT_HELP[k]}</small></span>`).join('')}</div><div class="profile-values"><span>气血 ${liveNumber('hp',Math.ceil(p.hp))} / 100</span><span>体力 ${liveNumber('energy',Math.floor(p.energy))} / 100</span><span>盘缠 ${liveNumber('money',p.money)} 文</span><span>阅历 ${liveNumber('xp',p.xp)}</span><span>青竹会声望 ${liveNumber('reputation',s.reputation)}</span><span>当前嫌疑 ${liveNumber('wanted',s.wanted)}</span></div><p>检定概率由属性、难度与关系共同决定，选择气泡里显示的是本次实际成功率。</p>${p.skills?skillBookHTML(p,esc):'<h2>成长</h2><div id="growth-paths">'+growthCards(p)+'</div>'}<h2>行囊与线索</h2><p>${p.inventory.map(i=>esc(i==='ring'?'一枚银戒':i)).join('、')||'尚无剧情物品'} · 佩剑、路引、旧行囊</p><h2>故人与好感</h2>${PEOPLE.map(n=>`<div class="relation-row"><span>${n.name}<small data-mood="${n.id}">${MOODS[s.people[n.id].mood]||'平和'}</small></span>${liveNumber('relation-'+n.id,s.people[n.id].relation)}</div>`).join('')}<h2>行过的路</h2>${s.history.slice(-8).reverse().map(h=>`<article class="letter"><small>${esc(h.label)}</small><p>${esc(h.text)}</p><small>${h.reactionSource==='nlp'?'人物反应 · AI 推演':'人物反应 · 本地演出'}</small>${(h.dialogue||[]).map(d=>`<p>${esc(PEOPLE.find(n=>n.id===d.id)?.name)}：“${esc(d.text)}”</p>`).join('')}</article>`).join('')||'<p>尚未留下故事。</p>'}`);
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
 if(lines.every(line=>line.ambient)&&speechQueue.some(line=>line.echoId&&line.end>world.t))return;
 if(checkReveal.active){pendingActionSpeech.push(...lines);pendingActionSpeech=pendingActionSpeech.filter((line,i,all)=>all.findIndex(v=>v.id===line.id)===i).slice(0,3);return;}
 if(dialogue.active)return;
 for(const line of lines)journal.add('chat',line.id==='hero'?(line.thought?'少侠 · 心想':'少侠'):PEOPLE.find(n=>n.id===line.id)?.name||line.id,line.text);
 npcVoice.stop('bubble');
 let at=world.t+.35;speechQueue=lines.filter(line=>line.id==='hero'||world.npcs.has(line.id)).map(line=>{const duration=Math.max(3.8,Math.min(6,line.text.length*.14),npcVoice.duration({...line,actor:spokenActor(line,sim.s)})+.4);const entry={...line,start:at,end:at+duration,spoken:false};at+=duration+.3;return entry;});
}
world.onConvoySpeech=line=>{if(!started||dialogue.active||checkReveal.active||world.locked||world.combatReady||world.t<(world.quietUntil||0)||world.t<(world.nextConvoySpeech||0)||pendingActionSpeech.length||speechQueue.some(s=>s.end>world.t))return false;world.nextConvoySpeech=world.t+18;queueSpeech([line]);return true;};
world.onLifeSpeech=line=>{if(sim.s.deck?.actions?.active||!started||dialogue.active||checkReveal.active||world.t<(world.quietUntil||0)||sim.s.complaint||pendingActionSpeech.length||speechQueue.some(s=>s.end>world.t)||nearbyEcho())return false;queueSpeech([line]);return true;};
world.onActionCardSpeech=line=>{const n=world.npcs.get(line.id);if(!started||world.locked||dialogue.active||checkReveal.active||pendingActionSpeech.length||speechQueue.some(s=>s.end>world.t&&!s.ambient)||!n||n.actor.position.distanceTo(world.hero.position)>9||!visibleBetween(n.actor.position,world.hero.position,world.obstacles,sim.s.ecosystem?.objects))return false;queueSpeech([line]);return true;};
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
 placeWorldSpeech(el,screen);
 if(!line.spoken){if(line.echoId){const e=sim.s.deck?.echoes.find(e=>e.id===line.echoId);markEchoHeard(sim,e);}if(!line.thought)speak(line,{channel:'bubble',generate:false,valid:()=>speechQueue.includes(line)&&line.end>world.t&&!dialogue.active&&n.actor.position.distanceTo(world.hero.position)<14&&visibleBetween(n.actor.position,world.hero.position,environment.eco.obstacles||[],sim.s.ecosystem?.objects||{}),onStart:duration=>{const extra=Math.max(0,world.t+duration+.35-line.end);line.end+=extra;for(const later of speechQueue){if(later!==line&&later.start>line.start){later.start+=extra;later.end+=extra;}}}});line.spoken=true;}
}
let nextEchoAt=0;
function nearbyEcho(){
 return [...world.npcs].map(([id,n])=>({e:pendingEcho(sim.s,id),n})).filter(({e,n})=>{
  if(!e||e.announced)return false;
  const point=n.actor.position,screen=world.screenPoint(point.clone().add({x:0,y:3.25,z:0}));
  return screen.visible&&screen.x>40&&screen.x<innerWidth-40&&screen.y>0&&screen.y<innerHeight-100&&
   seesEchoPlayer(sim.s,e.who,point,world.hero.position,n.actor.rotation.y,visibleBetween(point,world.hero.position,world.obstacles,sim.s.ecosystem?.objects));
 }).sort((a,b)=>a.n.actor.position.distanceTo(world.hero.position)-b.n.actor.position.distanceTo(world.hero.position))[0];
}
function updateEchoEncounters(){
 if(sim.s.deck?.actions?.active)return;
 if(!started||world.locked||world.performance||world.combatReady||world.aimMode||lessons.active||night.active||!$('panel').hidden||!$('environment-panel').hidden||!$('object-actions').hidden||pendingActionSpeech.length||world.t<nextEchoAt||world.t<(world.quietUntil||0))return;
 if(speechQueue.some(l=>l.end>world.t&&!l.ambient))return;
 const found=nearbyEcho();if(!found)return;
 const {e,n}=found;nextEchoAt=world.t+18;n.echoFacingUntil=world.t+7;
 queueSpeech([{id:e.who,text:e.line,echoId:e.id}]);
}
function openComplaint(data){
 closePanel();environment.close();world.clearReady();
 chooseResponses(dialogue,{title:PEOPLE.find(p=>p.id===data.id)?.name,context:{id:data.id,text:({theft:'方才伸手拿什么？',assault:'你凭什么动手？',damage:'砸了东西，就这么走？',tamper:'你往吃喝里放了什么？'}[data.type])},listener:data.id,getOptions:()=>sim.s.complaint===data?complaintChoices(sim):[],
  onSelect:a=>{const entry=flattenResponses(complaintChoices(sim)).find(e=>e.action.id===a.id);if(entry&&!entry.preview.certain&&!entry.preview.blocked)checkReveal.start(a,entry.preview);
   const r=answerComplaint(sim,a.id,{eco:environment.eco,positions:Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position])),obstacles:world.obstacles});if(r?.error){checkReveal.cancel();toast(r.error);}},
  onClose:()=>{checkReveal.cancel();if(sim.s.complaint===data){data.phase='report';data.since=sim.s.npcClock;sim.emit('npcCheck',{id:data.id,label:'去报官',observation:true,priority:true});}}});
}
function actionPositions(){return Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position]));}
function waitingAction(id){return pendingActionCard(sim.s,id,actionPositions(),world.obstacles);}
function interactionNpc(){const id=sim.s.deck?.actions?.active?.who;return id&&waitingAction(id)?{id,npc:world.npcs.get(id)}:world.nearest();}
function openActionCard(target){
 const e=waitingAction(target);if(!e)return false;
 const owner=sim,cardId=e.cardId,line=actionLine(sim.s,e,'start');meet(sim,target);closePanel();environment.close();world.clearReady();
 const choices=()=>owner===sim?actionCardChoices(sim.s,target,cardId,actionPositions(),world.obstacles):[];
 dialogue.play([{id:target,text:line}],cancelled=>{if(cancelled||!choices().length)return;
  const card=sim.s.deck.cards.find(c=>c.id===cardId);if(card)card.line=line;sim.save();
  chooseResponses(dialogue,{title:PEOPLE.find(p=>p.id===target)?.name,listener:target,context:{id:target,text:line},getOptions:choices,onClose:closePanel,onSelect:a=>{
   if(owner!==sim)return;const r=answerActionCard(sim,target,cardId,a.id,actionPositions(),world.obstacles);if(r.error){toast(r.error);return;}
   if(r.dialogue)dialogue.play(r.dialogue,()=>{world.quietUntil=world.t+3;},'');
  }});
 },'');return true;
}
function openEcho(target){
 const e=pendingEcho(sim.s,target);if(!e)return false;
 meet(sim,target);
 const wasHeard=e.announced;markEchoHeard(sim,e);closePanel();environment.close();world.clearReady();
 const choose=()=>{const options=echoChoices(sim.s,e);if(!options.length)return;
  chooseResponses(dialogue,{title:PEOPLE.find(p=>p.id===target)?.name+' · '+(e.template==='thanks_letter'?'旧日的情分':'先前的事'),listener:target,context:{id:target,text:e.line},getOptions:()=>echoChoices(sim.s,e),
   onClose:closePanel,onSelect:a=>{
    const entry=flattenResponses(echoChoices(sim.s,e)).find(x=>x.action.id===a.id);if(entry&&!entry.preview.certain)checkReveal.start(a,entry.preview);
    const r=answerEcho(sim,e.id,a.id,sim.rng,{positions:Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position])),obstacles:world.obstacles});if(r.error){checkReveal.cancel();toast(r.error);return;}if(r.deferred){closePanel();return;}
    journal.add('system',r.reason,r.text+(r.delta?'（好感 '+(r.delta>0?'+':'')+r.delta+'）':''));
    // Player speaks during the check, then the NPC answers; no silent settlement.
    dialogue.play(r.dialogue,()=>{checkReveal.cancel();world.quietUntil=world.t+8;},r.label);
    if(r.roll!==null)checkReveal.play(r,()=>{});
   }});
 };
 if(wasHeard)choose();else dialogue.play([{id:target,text:e.line}],cancelled=>{if(!cancelled)choose();},e.title);
 return true;
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
 if(sim.s.player.bedRest){wakePlayer(sim);return;}
 if(sim.s.player.hp>0){restMenu();return;}
 closePanel();closeDrawer();if(sim.respawn()){world.resetAfterRest();save();}
}
function skipTime(sleeping){
 const s=sim.s,dt=untilTime(s,$('rest-until').value);
 if(dt===null){toast('请选择时刻。');return;}
 if(s.player.hp<=0){rest();return;}
 if(['fight','prison'].includes(sim.event?.gate?.phase)||sim.event?.proposal?.phase==='duel'||[...world.npcs].some(([id,n])=>sim.isPursuing(id,n.actor.position.distanceTo(world.hero.position)))){toast('眼下无法安心歇脚。');return;}
 const place=restingPlace(s);if(sleeping&&s.chapterVersion===2){if(!place){toast('找一处落脚地：西墙草席、听雨楼，或所属势力的值房。');return;}if(s.player.money<place.cost){toast('借宿需两文钱。');return;}recordRest(sim,place);}
 const nearby=[...world.npcs].filter(([id,n])=>s.people[id]?.hp>0&&n.actor.position.distanceTo(world.hero.position)<10).sort((a,b)=>a[1].actor.position.distanceTo(world.hero.position)-b[1].actor.position.distanceTo(world.hero.position)).map(([id])=>id);
 world.auto=null;world.keys.clear();closeDrawer();sleepingThrough=sleeping;try{sim.passTime(dt,sleeping);}finally{sleepingThrough=false;}save();
 if(sleeping){nightDeal(nearby);return;}
 toast('你在原地等到了'+shichenText(s));
}
function restMenu(){
 drawer('歇息与等待',`<p>现在是 ${clockText(sim.s)}。选择下一次抵达的时刻。</p><label>到 <input id="rest-until" type="time" value="06:00" required></label><div class="rest-options"><button data-night ${sim.s.chapterVersion===2&&!restingPlace(sim.s)?'disabled':''}>${icon('Moon')}${restingPlace(sim.s)?.name||'需到落脚处'} · 睡到此时</button><button data-wait>原地等待</button><button data-restart>${icon('RotateCcw')}重开 · 从城外入城</button></div>`);$('drawer').dataset.view='rest';
 $('drawer').querySelector('[data-night]').onclick=()=>skipTime(true);$('drawer').querySelector('[data-wait]').onclick=()=>skipTime(false);
 $('drawer').querySelector('[data-restart]').onclick=()=>{
  drawer('重新开始？','<p>本局的物品、人情和江湖见闻将被清空，以初始属性，从十二文、尚无案底的花石纲开场重新开始。</p><div class="rest-options"><button data-confirm-restart>确认重开</button><button data-cancel-restart>返回</button></div>');$('drawer').dataset.view='rest';
  $('drawer').querySelector('[data-cancel-restart]').onclick=restMenu;
  $('drawer').querySelector('[data-confirm-restart]').onclick=()=>{
   try{sessionStorage.setItem('jianghu-restart','1');localStorage.setItem(SAVE,JSON.stringify(newArrival()));}catch{sessionStorage.removeItem('jianghu-restart');toast('无法保存新进度，暂时没有重开。');return;}
   started=false;location.reload();
  };
 };
}
$('rest').onclick=()=>!$('drawer').hidden&&$('drawer').dataset.view==='rest'?closeDrawer():restMenu();
function showResult(r){checkReveal.play(r,()=>renderResult(r));}
function renderResult(r){const rolled=r.roll!=null,grade=rolled?r.grade||checkGrade(r.roll,r.check?.chance):'';$('result').hidden=false;$('result').className='ink-in '+(rolled?(r.success?'passed':'failed'):'direct');$('result').innerHTML=`<header class="result-head">${rolled?`<span class="ink-seal result-seal${r.success?'':' hollow'}" title="成功率 ${r.check.chance}%">${esc(grade.slice(-2))}</span>`:''}<h3>${esc(r.label)}</h3>${r.ongoing?'<span class="ink-tag" title="事情还没结束">未了</span>':''}</header><p>${esc(r.text)}</p>${r.changes.length?`<div class="result-chips">${r.changes.map(x=>`<span class="ink-chip ${/\+/.test(x)?'up':/-|－/.test(x)?'down':''}">${esc(x)}</span>`).join('')}</div>`:''}${r.hint?`<p class="hint">${esc(r.hint)}</p>`:''}`;clearTimeout(resultTimer);resultTimer=setTimeout(()=>$('result').hidden=true,8500);tone(r.success?'win':'lose');}
function choice(a){const p=sim.preview(a);return `<button class="choice" data-choice="${a.id}" ${p.blocked?'disabled':''}><span><b>${esc(a.label)}</b><small>${a.stat?`${ATTR[a.stat]} ${p.score} · 难度 ${a.difficulty}`:'无需检定'}${a.cost?` · ${a.cost} 文`:''}</small></span><em>${p.blocked?'不足':p.certain?(p.chance===0?'必被识破':'必成'):p.chance+'%'}<small>${p.certain?'':'+关系修正'}</small></em></button>`;}
function sceneOptions(){
 if(sim.sceneView())return sim.actions();
 const recommended=ranked||sim.recommend().map(a=>a.id);
 return sim.actions().map(a=>({...a,recommended:recommended.includes(a.id)})).sort((a,b)=>Number(b.recommended)-Number(a.recommended));
}
function hasTalkStory(id){if(!sceneDialogueReady(sim))return false;return sim.event?.type==='gate'?sim.sceneView()?.listener===id:sim.event?.cast?.includes(id);}
function talkOptions(id){const news=convoyAftermathOptions(sim,id);if(news.length)return news;if(sim.s.people[id]?.restraint)return restraintConversation(sim.s,id)?[{id:'restraint_talk',label:'交谈',mode:'restraintTalk',kind:'listen'}]:[];const favors=identityFavorOptions(sim,id);if(favors.length||identityConversationActive(sim.s,id))return favors;if(pendingEcho(sim.s,id))return [{id:'echo',label:'说说先前的事',mode:'echo',kind:'listen'}];const n=sim.s.people[id];if(n?.nightAskedOut&&n.nightWakeUntil>sim.s.npcClock)return [];const story=hasTalkStory(id),deal=peek(sim.s,'talk',id);if(deal)prefetchDeal(id,deal);return [...(deal?[{id:'deal',label:'近来可有什么新鲜事？',mode:'deal',kind:'listen'}]:[]),...(story?[{id:'story',label:sim.event?.type==='gate'&&id===(sim.s.watch?.holder||'gate_guard')?'说说过关的凭据':'谈眼前的事',mode:'story',kind:'listen',story:true}]:[]),...contactOptions(sim,id),...(sim.s.chapterVersion===2?[]:socialOptions(sim,id).filter(a=>a.id!=='gift'))].filter(a=>fresh(sim.s,id,a));}
function npcOptions(id){if(sim.s.people[id]?.restraint||sim.s.people[id]?.stunnedUntil>(sim.s.npcClock||0)||sim.s.people[id]?.hp<=0){const n=sim.s.people[id];return [...restraintOptions(sim.s,id).map(a=>({...a,mode:'lasso',point:a.id})),...(n.hp>0&&!(n.stunnedUntil>(sim.s.npcClock||0))&&!(n.muteUntil>(sim.s.npcClock||0))&&talkOptions(id).length?[{id:'talk',label:'交谈',mode:'talk',kind:'listen'}]:[])];}if(['sleep','doze'].includes(sim.s.people[id]?.life?.activity))return [{id:'wake',label:'轻声叫醒',mode:'wake',kind:'listen'}];const muted=sim.s.people[id]?.muteUntil>(sim.s.npcClock||0),talks=muted?[]:talkOptions(id);return [
 ...(!muted&&waitingAction(id)?[{id:'action_card',label:'询问来意',mode:'actionCard',kind:'listen'}]:[]),
 ...(!(sim.s.people[id]?.muteUntil>(sim.s.npcClock||0))&&talks.length?[{id:'talk',label:'交谈',mode:'talk',kind:'listen',story:talks.some(isStoryChoice)}]:[]),
 {id:'show',label:'出示',mode:'show',kind:'support'},
 ...(['inn','beggar'].includes(id)?[{id:'rest',label:id==='beggar'?'借草席歇息':'借宿一夜',mode:'rest',kind:'eat'}]:[])];}
function bubbleOptions(){return panelTarget==='scene'?sceneOptions():npcOptions(panelTarget);}
function probeButtonState(id){const p=probePreview(sim,id),q=world.npcs.get(id)?.actor.position;
 const reason=p.reason||npcActionAccess(sim.s.player,'probe',world.hero.position,q,world.obstacles,environment.eco.s.objects);
 return {blocked:p.blocked||!!reason,detail:reason||(p.certain?'已看清，无需再检定':'机敏 '+p.score+' · '+chanceText(p.chance))};}
function bubblePreview(a){if(a.mode==='lasso')return restraintPreview(sim,environment.eco,panelTarget,a.point);if(a.mode==='probe')return probePreview(sim,panelTarget);if(a.mode==='contact')return contactPreview(sim,panelTarget,a,environment.eco);
 if(panelTarget==='scene')return sim.preview(a);
 if(a.mode==='pressure')return touchPreview(sim,panelTarget,a.point);
 if(a.mode==='social')return socialPreview(sim,panelTarget,a);
 const relation=sim.s.people[panelTarget]?.relation||0;
 return {blocked:sim.s.player.money<(a.cost||0),certain:!a.stat,score:sim.s.player.stats[a.stat],chance:a.stat?Math.max(5,Math.min(95,sim.s.player.stats[a.stat]-15+Math.round(relation/10)+growthBonus(sim.s.player,a.stat))):100};
}
function renderScene(){renderBubbles();}
function renderBubbles(){
 if(!panelTarget)return;
 if(panelTarget==='scene'&&(!sceneDialogueReady(sim,bubbleEvent)||objects.handlesStage())){closePanel();return;}
 $('panel').classList.toggle('proposal-panel',panelTarget==='scene'&&!!sim.sceneView());
 if(panelTarget==='scene'&&sim.sceneView()){
  const view=sim.sceneView(),actions=sim.actions();if(objects.handlesStage()){closePanel();return;}
  $('panel').hidden=true;dialogue.choose({title:view.title,listener:view.listener||(sim.event.type==='confidence'?'su':'shen'),options:actions.map(action=>({action,preview:sim.preview(action)})),onSelect:runBubbleAction,onClose:closePanel});return;

 }
 $('panel').classList.toggle('npc-action-menu',panelTarget!=='scene');
 if(panelTarget!=='scene'){const id=panelTarget,options=npcOptions(id);$('panel').hidden=false;$('panel').innerHTML=`<header><b>${esc(PEOPLE.find(n=>n.id===id)?.name||'交互')}</b><button data-close aria-label="关闭" title="关闭">${icon('X')}</button></header><div class="npc-actions">${options.map(a=>{const p=bubblePreview(a);return `<button data-action="${a.id}" ${isStoryChoice(a)?'class="quest-needed" title="主线相关" aria-label="'+esc(a.label)+'（主线相关）"':''} ${p.blocked?'disabled':''}><b>${esc(a.label)}</b>${a.stat?`<small>${esc(choiceCheckText(a,p))}${a.mode==='pressure'&&!p.blocked?' · 敌对行动 · 体力 10':''}</small>`:''}</button>`;}).join('')}</div>`;$('panel').querySelector('[data-close]').onclick=closePanel;for(const b of $('panel').querySelectorAll('[data-action]'))b.onclick=()=>runBubbleAction(options.find(a=>a.id===b.dataset.action));positionBubbles();return;}
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
function inReach(){const p=world.interactionPoint(panelTarget);return p&&Math.hypot(p.x-world.hero.position.x,p.z-world.hero.position.z)<(panelTarget==='scene'?4.3:3.6)&&(panelTarget==='scene'||visibleBetween(world.hero.position,p,world.obstacles,environment.eco.s.objects));}
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
 if(!card?.line){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}
 if(card.card==='aid')observeProgress(sim,name+'替你包扎');
 save();dealt(card);
 dialogue.play([{id:target,text:card.line}],cancelled=>{
  if(cancelled)return;
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
  return {diary:after.diary,echoes:after.echoes,cards:[...cards,visit].filter(Boolean),talk:restTalk(s,nearby)};
 })();
 closePanel();closeDrawer();night.show({day:s.day,clock:shichenText(s),pending});
}
function openRestraintTalk(target){
 const exchange=restraintConversation(sim.s,target);
 closePanel();if(!exchange)return;
 dialogue.play(exchange.dialogue,cancelled=>{
  if(cancelled||!finishRestraintConversation(sim.s,target,exchange))return;
  save();panelTarget=target;if(!inReach()){closePanel();return;}
  showTalkChoices(target,restraintReplies(sim.s,target));
 },'');
}
function showTalkChoices(target,options){if(sim.s.people[target]?.restraint&&!options.every(a=>['lasso','endTalk'].includes(a.mode))){openRestraintTalk(target);return;}if(!options.length){closePanel();return;}panelTarget=target;dialogue.choose({title:PEOPLE.find(n=>n.id===target)?.name,listener:target,options:options.map(action=>({action,preview:action.mode==='topic'?{certain:true}:bubblePreview(action)})),onSelect:runBubbleAction,onClose:closePanel});}
function startLasso(id,point){
 const eco=environment.eco;eco.positions[id]=world.npcs.get(id)?.actor.position;
 const attempt=beginRestraintAttempt(sim,eco,id,point);if(attempt.error){toast(attempt.error);return;}
 closePanel();environment.close();world.perform({motion:point==='catch'?'lasso':'knot',kind:'steal'},id);
 const beat=world.performance;beat.duration=point==='catch'?1.8:1.7;beat.restraintAttempt=attempt;beat.camera=false;
 if(!attempt.preview.certain)checkReveal.start({stat:'agility',label:'抛套索'},attempt.preview);
 beat.onStrike=()=>{const r=attempt.finish();beat.settled=true;if(r.error){checkReveal.cancel();toast(r.error);return;}beat.hit=r.success;if(r.roll!==null)checkReveal.play(r,()=>{},true);};
}
function runBubbleAction(a,spoken=false){
 if(sim.s.player.bedRest){wakePlayer(sim);return;}
 if(!a||world.performance)return;
 if(a.mode==='lasso'){startLasso(panelTarget,a.point);return;}
 if(['pressure','probe'].includes(a.mode)){const reason=npcActionAccess(sim.s.player,a.mode,world.hero.position,world.npcs.get(panelTarget)?.actor.position,world.obstacles,environment.eco.s.objects);if(reason){closePanel();toast(reason);return;}}
 else if(!inReach()){closePanel();toast('已经走远了，靠近后再聊。');return;}
 const target=panelTarget,actor=target==='scene'?(sim.event?.cast?.[0]||(a.kind==='listen'||a.kind==='rival'?'su':'shen')):target;
 // Recheck at selection: a stale trade/lesson/story button cannot bypass the knot.
 if(a.mode==='restraintTalk'||(sim.s.people[target]?.restraint&&!['probe','pressure','endTalk'].includes(a.mode))){openRestraintTalk(target);return;}

 if(target!=='scene'&&!sim.s.people[target]?.restraint&&faceOfficer(target))return;const memoryKey=target!=='scene'?topicKey(sim.s,target,a):null;let r;
 if(a.mode==='wake'){const r=wakeNpc(sim,target,environment.eco.positions,world.obstacles);if(r.error)return toast(r.error);closePanel();world.nightConversationNpc=target;dialogue.play([{id:target,text:r.text}],cancelled=>{if(!r.refused&&!cancelled){panelTarget=target;showTalkChoices(target,talkTree(target,talkOptions(target)));}},'');return;}
 if(a.mode==='probe'){const state=probeButtonState(target);if(state.blocked){toast(state.detail);return;}const result=probeNpc(sim,target);if(result.error){toast(result.error);return;}closePanel();if(result.cached)openNpcInfo(target);else pendingProbe={id:target,success:result.success,insight:result.insight};return;}
 if(a.mode==='endTalk'){closePanel();return;}
 if(target!=='scene'&&['contact','deal','echo','story'].includes(a.mode)&&disguiseEncounter.intercept(target,true))return;
 if(a.mode==='show'){closePanel();environment.openGift(target);return;}
 if(a.mode==='actionCard'){openActionCard(target);return;}
 if(a.mode==='echo'){openEcho(target);return;}
 if(a.mode==='deal'){if(!openEcho(target))dealTalk(target);return;}
 if(a.mode==='dealRoute'){closePanel();routeLead(a.place);return;}
 if(a.mode==='topic'){showTalkChoices(target,a.children);return;}
 if(a.mode==='talk'){meet(sim,target);if(disguiseEncounter.intercept(target,true))return;if(identityConversationActive(sim.s,target)){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}if(openActionCard(target))return;if(!convoyAftermathOptions(sim,target).length&&openEcho(target))return;if(sim.s.chapterVersion===2){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}const person=sim.s.people[target];if(person.greeted){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}person.greeted=true;sim.save();const hasStory=hasTalkStory(target),view=hasStory?sim.sceneView():null;const line=(target==='old_constable'&&learnedFootwork(sim,target)?'上次教你的身法，用着还顺手吗？':view?.line)||courtLine(sim.s,target)||({tea_host:VOICE_LINES.teaGreeting,bookseller:VOICE_LINES.booksellerGreeting,traveler:target==='traveler'?princeGreeting(sim.s):null,relay:'你要找什么？我手上的活还没做完。',gate_merchant:VOICE_LINES.merchantGreeting,scribe:VOICE_LINES.scribeGreeting}[target]||opening(target)||null);if(!line){showTalkChoices(target,talkTree(target,talkOptions(target)));return;}dialogue.play([{id:target,text:line}],cancelled=>{if(cancelled)return;panelTarget=target;const options=talkOptions(target);showTalkChoices(target,talkTree(target,options));},PEOPLE.find(n=>n.id===target)?.name);return;}
 if(a.mode==='story'){if(!hasTalkStory(target)){closePanel();return;}const eventId=sim.event.id;panelTarget='scene';bubbleEvent=eventId;const v=sim.sceneView();dialogue.play(v?.dialogue||[],cancelled=>{if(cancelled||!sceneDialogueReady(sim,eventId)||!world.nearbyEvent())return;panelTarget='scene';bubbleEvent=eventId;renderBubbles();},v?.title||'眼前的事');return;}
 if(target==='porter'&&isConvoyAction(a.id)){convoyActions.start(a);return;}
 if(a.mode==='pressure'){if(world.npcs.get(target).actor.position.distanceTo(world.hero.position)>(skill(sim.s.player,'pressure').tier>=4?6:2.2)){toast('再靠近一点，才能伸手点穴。');return;}const check=touchPreview(sim,target,a.point);if(check.blocked)return toast(check.reason||'当前无法点穴。');closePanel();world.perform({motion:'pressure',kind:'steal'},target);const beat=world.performance;beat.point=a.point;checkReveal.start({stat:'agility',label:a.point==='mute'?'点哑穴':'点定身穴'},check);beat.onStrike=()=>{if(world.hero.position.distanceTo(world.npcs.get(target).actor.position)>(skill(sim.s.player,'pressure').tier>=4?6:2.2)||!visibleBetween(world.hero.position,world.npcs.get(target).actor.position,world.obstacles,environment.eco.s.objects)){checkReveal.cancel();toast('目标已不在伸手可及之处。');return;}const result=pressurePoint(sim,target,a.point);if(result.error){checkReveal.cancel();toast(result.error);return;}beat.hit=result.success;world.onSound?.(result.success?'body':'notice',{gain:.4});};return;}
 else if(a.mode==='contact'&&a.id.startsWith('if_identity_')&&!spoken){const preview=contactPreview(sim,target,a,environment.eco);if(preview.blocked)return toast(preview.reason);closePanel();if(!preview.certain)checkReveal.start(a,preview);dialogue.play([{id:'player',text:a.id==='if_identity_greet'?'是我。有些事，想当面同你谈。':a.label,shot:'close'}],cancelled=>{if(cancelled){checkReveal.cancel();return;}panelTarget=target;runBubbleAction(a,true);},'');return;}
 else if(a.mode==='contact'){if(a.id.startsWith('if_')&&a.stat){const preview=contactPreview(sim,target,a,environment.eco);if(preview.blocked)return toast(preview.reason);closePanel();if(!preview.certain)checkReveal.start(a,preview);}r=contactResolve(sim,environment.eco,target,a.id);}
 else if(a.mode==='social')r=socialResolve(sim,target,a.id);
 else if(target==='scene')r=sim.resolve(bubbleEvent,a.id);
 else if(a.mode==='papers')r=sim.inspectPass();
 else if(a.mode==='check')r=sim.npcCheck(target,a.id);
 else if(a.mode==='rest'){rest();return;}
 else if(a.mode==='leave'){r={};queueSpeech([{id:target,text:'江湖路远，后会有期。'}]);toast('你拱手告辞。');}
 else r=sim.npcAction(target,a.id==='gift-tea'?'gift':a.id);
 if(r?.error){if(a.id.startsWith('if_'))checkReveal.cancel();toast(r.error);return;}
 if(r?.training){closePanel();lessons.start(r.training);return;}
 if(r?.needsOrigin){originChoice(target,r.itemKey,r.line);return;}
 if(memoryKey&&r&&!r.error&&(r.success||a.id==='befriend')){heard(sim.s,target,memoryKey);sim.save();}
 if(r?.actionId?.startsWith('ca_')||r?.actionId?.startsWith('if_')||isDirectReply(r)){visualResult=null;closePanel();if(r.actionId?.startsWith('if_')&&r.roll!=null)checkReveal.play(r,()=>{});dialogue.play((spoken?r.dialogue.filter(line=>line.id!=='player'):r.dialogue).map(line=>({...line,shot:line.shot||'close'})),cancelled=>{if(r.actionId?.startsWith('if_'))checkReveal.cancel();if(cancelled){closePanel();return;}if(r.actionId?.startsWith('if_identity_'))finishIdentityDialogue(sim,target,r);if(r.actionId?.endsWith('_end')&&sim.s.facts.demoComplete){codex.open('map');return;}const next=contactFollowups(sim,target,r);if(next.length){panelTarget=target;if(inReach()){showTalkChoices(target,next);return;}}if(target==='scene'&&continuesSceneDialogue(sim,r)&&world.nearbyEvent()){panelTarget='scene';bubbleEvent=sim.event.id;$('result').hidden=true;$('panel').hidden=false;renderBubbles();}else closePanel();},r.label);return;}
 if(r?.text&&target!=='scene'&&a.mode!=='check')toast(r.text);
 closePanel();world.perform({...a,motion:r?.motion},actor);
}
async function rank(){const req=epoch,id=sim.event?.id;try{const response=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sim.context()),signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error();const result=await response.json();const ids=[...new Set(result.ids||[])].filter(id=>sim.actions().some(a=>a.id===id&&!sim.preview(a).blocked));if(ids.length<3)throw Error();if(req!==epoch||id!==sim.event?.id)return;ranked=ids.slice(0,5);aiStatus='AI 已参与推荐';if(!bubbleGroup)renderScene();}catch{if(req!==epoch)return;aiStatus='本地画像推荐';if(panelTarget==='scene')renderScene();}}
function faceOfficer(id){if(wantedEncounter.intercept(id,true))return true;const actor=world.npcs.get(id)?.actor;if(!actor||!lawConfrontation(sim,id,actor.position.distanceTo(world.hero.position)))return false;
 closePanel();environment.close();world.clearReady();world.auto=null;const s=sim.s;
 dialogue.choose({title:PEOPLE.find(n=>n.id===id).name,context:{id,text:'放下兵刃！'},listener:id,options:[['submit','收刀认拘，服刑三日'],['retreat','拉开距离，寻找退路'],['resist','拔刀拒捕']].map(([id,label])=>({action:{id,label},preview:{certain:true}})),onClose:closePanel,onSelect:a=>{
 if(a.id==='submit'){detainByOfficer(sim,id);world.clearReady();sim.save();}
 else if(a.id==='resist'){world.readyUntil=Infinity;world.onReady?.();}else toast('趁现在拉开距离。');}});return true;}
function interact(targetId=null){if(sim.s.player.bedRest){wakePlayer(sim);return;}if(typeof targetId==='string')selectedNpc=targetId;if(typeof targetId!=='string')targetId=null;
 if(!started||world.locked||world.performance||sim.s.player.hp<=0)return;
 const theftNpc=targetId||interactionNpc()?.id;if(theftNpc&&!sim.s.people[theftNpc]?.restraint&&sim.s.people[theftNpc]?.hp>0&&!(sim.s.people[theftNpc]?.stunnedUntil>(sim.s.npcClock||0))&&faceOfficer(theftNpc))return;if(sim.s.player.stealing&&theftNpc&&objects.openTheft(theftNpc))return;
 if(!targetId&&!interactionNpc()&&objects.interact())return;
 if(!$('panel').hidden){closePanel();return;}
 if(!targetId&&!interactionNpc()&&!world.nearbyEvent()&&environment.interactStreet())return;
 const chosen=targetId&&world.npcs.get(targetId),n=chosen?{id:targetId,npc:chosen}:interactionNpc();if(chosen&&chosen.actor.position.distanceTo(world.hero.position)>3.3)return toast('再靠近些才能交谈。');if(n&&!visibleBetween(world.hero.position,n.npc.actor.position,world.obstacles,environment.eco.s.objects))return toast('隔着墙，无法交谈。');if(n&&!['sleep','doze'].includes(sim.s.people[n.id]?.life?.activity)&&sim.event?.type==='gate')visitGate(sim,n.id);if(!n&&!world.nearbyEvent())return;
 world.clearReady();world.auto=null;epoch++;ranked=null;bubbleGroup=null;bubblePage=0;
 panelTarget=n?.id||(world.nearbyEvent()?'scene':null);
 if(!panelTarget)return;if(panelTarget!=='scene')selectedNpc=panelTarget;if(!sim.s.people[panelTarget]?.restraint&&sim.s.people[panelTarget]?.hp>0&&!(sim.s.people[panelTarget]?.stunnedUntil>(sim.s.npcClock||0))&&sim.s.people[panelTarget]?.awareness?.state==='fight')return;
 if(panelTarget!=='scene'&&!sim.s.people[panelTarget]?.restraint&&!waitingAction(panelTarget)&&openEcho(panelTarget))return;
 bubbleEvent=sim.event?.id;
 if(panelTarget==='scene'){
  if(!sceneDialogueReady(sim,bubbleEvent)){closePanel();return;}
  const eventId=bubbleEvent,view=sim.sceneView(),text=view?.text;
  const lines=view?.dialogue||(text?[{id:'su',text}]:SCENES[sim.event.type].lines.map(text=>{const [name,...rest]=text.split('：');return {id:PEOPLE.find(p=>p.name===name)?.id||'shen',text:rest.join('：')||text};}));
  dialogue.play(lines,cancelled=>{if(cancelled||!sceneDialogueReady(sim,eventId)||!world.nearbyEvent())return;panelTarget='scene';bubbleEvent=eventId;$('panel').hidden=false;renderBubbles();},SCENES[sim.event.type].name);return;
 }
 $('panel').hidden=false;renderBubbles();
}
function originChoice(id,key,line){environment.close();closePanel();dialogue.play([{id,text:line}],cancelled=>!cancelled&&dialogue.choose({title:'物件的来历',listener:id,options:[['truth','如实相告'],['found','说是在路边捡的'],['silent','不解释，递过去']].map(([answer,label])=>({action:{id:answer,label,stat:answer==='found'?'charm':null},preview:meaningCheck(sim.s,environment.eco.items('player').find(i=>i.id===key),answer)})),onSelect:a=>world.onGift(id,key,a.id),onClose:closePanel}));}
world.onGift=(id,key,answer=null)=>{
 const fail=error=>({error});
 if(world.locked||world.performance||sim.s.player.hp<=0)return fail('先完成当前动作。');
 const n=world.npcs.get(id);
 if(!n||n.actor.position.distanceTo(world.hero.position)>3.3)return fail('对方已走远，再靠近些才能递给他。');
 if(!visibleBetween(world.hero.position,n.actor.position,world.obstacles,environment.eco.s.objects))return fail('中间有遮挡，无法递过去。');
 if(['sleep','doze'].includes(sim.s.people[id]?.life?.activity))return fail('先叫醒对方，再递东西。');
 if(disguiseEncounter.intercept(id,true))return {intercepted:true};
 const r=giveItem(sim,environment.eco,id,key,answer);if(r.needsOrigin){originChoice(id,r.itemKey,r.line);return r;}if(r.error){if(sim.s.people[id].hp>0&&!(sim.s.people[id].stunnedUntil>(sim.s.npcClock||0)))queueSpeech([{id,text:/药粉/.test(r.error)?'这是什么药？来历不明的东西，我不能收。':/饿|吃|食/.test(r.error)?'多谢，我现在吃不下，你先留着吧。':'先收回去吧，我现在不想接。'}]);return r;}
 environment.close();closePanel();world.perform({id:'give',kind:'support',motion:'offer'},id);queueSpeech([{id,text:r.recognized?r.text:id==='inspector'&&r.delta===0?r.text:id==='traveler'&&/副账|税课|口供/.test(r.item)?'这份凭据我收下了。先别惊动他们，听雨楼再议。':id==='traveler'?'多谢。东西贵不贵不打紧，心意我领了。':'这份心意我收下了，多谢。'}]);return r;
};
$('interact').onclick=interact;world.onGateTalk=interact;world.onNpcSelected=id=>{selectedNpc=id;};
window.addEventListener('keydown',e=>{
 if(!started||e.isComposing||e.repeat)return;
 if(e.code==='Escape'&&!$('conversation').hidden){e.preventDefault();e.stopImmediatePropagation();collapseConversation();return;}
 if(e.code==='Enter'&&!e.target.closest?.('input,textarea,select,button')){e.preventDefault();e.stopImmediatePropagation();openConversation();}
},true);
window.addEventListener('keydown',e=>{if(!started)return;if(e.target.closest?.('input,textarea,select')||e.isComposing){if(e.code==='Escape')e.target.blur();return;}if(['Space','Tab','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.repeat)return;if(sim.s.player.bedRest&&['Escape','Space','KeyE','KeyW','KeyA','KeyS','KeyD','KeyZ','Slash'].includes(e.code)){wakePlayer(sim);world.keys.clear();return;}if(night.active){if(['Escape','Enter','Space'].includes(e.code))night.close();return;}environment.key(e);if(e.code==='Escape'){closePanel();closeDrawer();return;}const page={KeyC:'self',KeyJ:'affairs',KeyK:'people',KeyM:'map'}[e.code];if(page&&!dialogue.active){if(codex.isOpen(page))closeDrawer();else codex.open(page);return;}if(e.code==='Tab'){!$('drawer').hidden?closeDrawer():inbox();return;}if(world.locked)return;world.keys.add(e.code);if(e.code==='KeyR')world.guardStarted=world.t;if(e.code==='Space')world.jump();if(e.code==='Slash'){e.preventDefault();world.toggleWeapon();}if(e.code==='KeyE')interact();if(e.code==='KeyR'&&sim.s.player.hp<=0)rest();});window.addEventListener('keyup',e=>world.keys.delete(e.code));
fetch('/api/status').then(r=>r.json()).then(r=>{aiReady=!!r.configured;aiStatus=r.configured?'AI 随时待命':'本地画像推荐';}).catch(()=>aiStatus='本地画像推荐');
const compass=document.createElement('div');compass.className='field-compass';compass.setAttribute('aria-hidden','true');
const bearings=['北','东北','东','东南','南','西南','西','西北'].map((label,i)=>{const mark=document.createElement('span');mark.textContent=label;compass.append(mark);return {mark,angle:i*45};});
$('hud').append(compass);
function mini(){
 const investigationAreas=investigationHUD.update(sim.s,world.hero.position);
 const bearing=Math.atan2(-world.camera.matrixWorld.elements[8],world.camera.matrixWorld.elements[10])*180/Math.PI;
 for(const {mark,angle} of bearings){const d=((angle-bearing+540)%360)-180;mark.hidden=Math.abs(d)>64;if(!mark.hidden)mark.style.left=(50+d/1.28)+'%';}
const canvas=$('minimap').querySelector('canvas'),ctx=canvas.getContext('2d'),p=world.hero.position;ctx.clearRect(0,0,164,164);ctx.save();ctx.beginPath();ctx.arc(82,82,80,0,Math.PI*2);ctx.clip();ctx.strokeStyle='#7b766a38';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(82,0);ctx.lineTo(82,164);ctx.stroke();ctx.fillStyle='#3d647055';ctx.fillRect(13,0,14,164);for(const o of world.obstacles){ctx.fillStyle='#4f4b4250';ctx.fillRect(82+o.x*2.5-o.w,82+o.z*2.5-o.d,o.w*2,o.d*2);}
 for(const h of knownHQ(sim.s)){const x=76+h.x*2.5,z=75+h.z*2.5,[dx,dz]=h.mapOffset||[0,0];if(dx||dz){ctx.strokeStyle=h.color;ctx.beginPath();ctx.moveTo(x+7,z+8);ctx.lineTo(x+dx+7,z+dz+8);ctx.stroke();}ctx.fillStyle=h.color;ctx.fillRect(x+dx,z+dz,15,16);ctx.fillStyle='#171716';ctx.font='14px "Jianghu Body"';ctx.fillText(h.glyph,x+dx+1,z+dz+13);}
 investigationHUD.drawMap(ctx,investigationAreas);
 const badge=$('minimap').querySelector('.map-repute');if(badge)badge.textContent=CITIES[cityOf(sim.s)]+'声望 '+cityRep(sim.s)+'\n'+knownHQ(sim.s).map(h=>h.glyph+' '+factionRep(sim.s,h.id)).join(' · ');
 const hot=environment.streetHotspot();canvas.title='临溪声望 '+cityRep(sim.s,'linxi')+' · '+knownHQ(sim.s).map(h=>h.name+' '+factionRep(sim.s,h.id)+'（'+reputationName(factionRep(sim.s,h.id))+'）').join(' · ')+' · 点击查看势力驻地'+(investigationAreas.length?' · 红圈为限时盘查范围':'');canvas.setAttribute('aria-label',(hot?'临溪镇小地图 · '+hot.name:'临溪镇小地图')+(investigationAreas.length?' · '+investigationAreas.length+'处限时盘查红圈':''));
 if(hot){const x=82+hot.point[0]*2.5,y=82+hot.point[1]*2.5,r=15+Math.sin(world.t*2)*2,color=hot.mode==='fight'?'166,58,43':'156,109,60',gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,`rgba(${color},.8)`);gradient.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(${color},.85)`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();}
 for(const [id,n]of world.npcs){ctx.fillStyle=id==='guard'?'#4f4b42':'#7b766a';ctx.beginPath();ctx.arc(82+n.actor.position.x*2.5,82+n.actor.position.z*2.5,2,0,7);ctx.fill();}ctx.fillStyle='#15140f';ctx.beginPath();ctx.arc(82+p.x*2.5,82+p.z*2.5,4,0,7);ctx.fill();if(world.auto?.length){const q=world.auto.at(-1);ctx.strokeStyle='#a63a2b';ctx.beginPath();ctx.arc(82+q[0]*2.5,82+q[1]*2.5,5,0,7);ctx.stroke();}ctx.restore();}
const mapRepute=document.createElement('button');mapRepute.className='map-repute';mapRepute.setAttribute('aria-label','查看各地与势力声望');mapRepute.onclick=()=>codex.open('map');$('minimap').append(mapRepute);
$('minimap').querySelector('canvas').onclick=e=>{const hot=environment.streetHotspot();if(world.locked)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)*164/r.width,y=(e.clientY-r.top)*164/r.height;if(hot&&Math.hypot(x-82-hot.point[0]*2.5,y-82-hot.point[1]*2.5)<12)environment.openStreet();else codex.open('map');};
let prev=performance.now(),lastUI=0,lastSave=0;
const gateGoal=document.createElement('button');gateGoal.id='gate-objective';gateGoal.hidden=true;document.body.append(gateGoal);gateGoal.onclick=()=>{if(!dialogue.active&&!checkReveal.active&&sim.event?.type==='gate'){if(!objects.navigate())world.routeTo(sim.event.point,1.8);}};
mountHudLayout();
const investigationHUD=mountInvestigationHUD($('hud-context-stack'));
function openQuests(){codex.open('affairs');}
const unlock=document.createElement('button');unlock.id='person-unlock';unlock.hidden=true;document.body.append(unlock);let unlockTimer;
function showUnlock(id,insight){const info=npcInfo(sim,environment.eco,id);if(!info)return;clearTimeout(unlockTimer);
 const title=(info.faction==='？？？'?'归属待查':info.faction)+' · '+info.name;
 unlock.innerHTML=npcPortrait(info)+'<span><small>已解锁人物</small><b>'+esc(title)+'</b><em>（'+esc(insight)+'）</em></span><strong aria-hidden="true">›</strong>';
 unlock.setAttribute('aria-label','查看势力图：'+title);unlock.hidden=false;unlockTimer=setTimeout(()=>unlock.hidden=true,5500);
 unlock.onclick=()=>{clearTimeout(unlockTimer);unlock.hidden=true;showOrganization(personTab(sim,id));const node=$('drawer').querySelector('[data-org-person="'+CSS.escape(id)+'"]');if(node){node.classList.add('discovered-focus');requestAnimationFrame(()=>node.scrollIntoView({block:'center',inline:'center'}));}};
}
function openNpcInfo(id,insight=null){const info=npcInfo(sim,environment.eco,id);if(!info)return;selectedNpc=id;
 drawer(info.name,`${insight?'<p>此刻心念 · （'+esc(insight)+'）</p>':''}<div class="npc-summary">${npcPortrait(info)}<p>${esc(info.title)}<br>势力：${esc(info.faction)} · ${info.attitude}</p></div>${rescueDebt(sim.s,id)>0?'<p>欠 '+rescueDebt(sim.s,id)+' 份伤药 · 可当面帮忙研药偿还</p>':''}${info.probed?`<p>${esc(info.condition)} · ${esc(info.observation)}</p><h3>随身包裹</h3><div class="pack-grid"><div class="pack-tile">${icon('Coins')}<span>${info.money} 文</span></div>${info.items.map(i=>`<div class="pack-tile">${icon(itemIcon(i))}<span>${esc(i.name)}</span></div>`).join('')}</div><p>查看不会取走物品。靠近后蹲行可尝试偷窃；密封物品的内容尚未查看。</p>`:info.observed?'<p>'+esc(info.condition)+' · '+esc(info.observation)+'</p><p>眼力达到入门后，可进一步辨认行囊与腰牌。</p>':'<p>尚未探查。靠近后选择“探查”，了解可观察的信息与随身物品。</p>'}`);
}
const npcCard=document.createElement('div');npcCard.id='npc-target-card';npcCard.hidden=true;npcCard.setAttribute('role','group');npcCard.setAttribute('aria-label','人物简况');$('hud-context-stack').prepend(npcCard);
const npcCardInfo=document.createElement('button');npcCardInfo.type='button';npcCardInfo.className='npc-card-info';npcCardInfo.onclick=()=>{if(selectedNpc)openNpcInfo(selectedNpc);};
const npcCardClose=document.createElement('button');npcCardClose.type='button';npcCardClose.className='npc-card-close';iconButton(npcCardClose,'X','关闭人物简况');npcCardClose.onclick=dismissNpcCard;npcCard.append(npcCardInfo,npcCardClose);let npcCardHtml='';
function dismissNpcCard(){selectedNpc=null;npcCard.hidden=true;}
// Capture before scene picking: a click on another NPC can select the new person normally.
document.addEventListener('pointerdown',e=>{if(!npcCard.contains(e.target))dismissNpcCard();},true);
document.addEventListener('click',e=>{if(e.detail===0&&!npcCard.contains(e.target))dismissNpcCard();},true);
document.addEventListener('keydown',e=>{if(e.code==='Escape')dismissNpcCard();},true);
function updateNpcCard(){const n=world.npcs.get(selectedNpc);
 // Match the nearby conversation range and forget the selection when either person leaves.
 if(!n||n.actor.position.distanceTo(world.hero.position)>3.3){dismissNpcCard();return;}
 const info=npcInfo(sim,environment.eco,selectedNpc);if(!info){dismissNpcCard();return;}
 npcCard.hidden=!started||world.locked||world.performance||document.body.classList.contains('hud-detail-open');if(npcCard.hidden)return;const html=npcPortrait(info)+`<span><b>${esc(info.name)}</b><small>${esc(info.title)}</small><small>${esc(info.faction)} · ${info.attitude}</small></span>`;if(html!==npcCardHtml){npcCardInfo.innerHTML=html;npcCardHtml=html;}npcCardInfo.setAttribute('aria-label','查看'+info.name+'的信息');}
const progressUI=mountProgressUI(()=>sim,esc,openQuests,()=>codex.isOpen()?closeDrawer():codex.open('affairs'),()=>codex.isOpen('map')?closeDrawer():codex.open('map'));
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.045,(now-prev)/1000);prev=now;if(document.hidden)return;
 if(world.nightConversationNpc&&!dialogue.active&&!world.performance&&!lessons.active){finishNightConversation(sim,world.nightConversationNpc);world.nightConversationNpc=null;}
 if(started&&!lessons.active&&!dialogue.active&&!checkReveal.active&&!night.active&&($('drawer').hidden||$('drawer').dataset.view!=='rest'))sim.tick(dt);world.playing=started;world.locked=lessons.active||(checkReveal.active&&!world.theftAttempt)||dialogue.active||objects.busy||!started||!$('drawer').hidden||night.active;objects.update(dt,started);world.locked=lessons.active||(checkReveal.active&&!world.theftAttempt)||dialogue.active||objects.busy||!started||!$('drawer').hidden||night.active;lessons.update(dt);world.update(dt);convoyActions.update(dt);skillGuide.update();npcVoice.update();worldAudio.update(dt,{started,x:world.hero.position.x,z:world.hero.position.z,time:sim.s.time,voice:!!npcVoice.source,talking:dialogue.active,performing:world.performance?.motion==='flute'||!!environment.eco.show,musicTier:skill(sim.s.party?.members[environment.eco.show?.owner]||sim.s.player,'music').tier,drowning:sim.s.player.drowning,burning:sim.s.player.burning,hp:sim.s.player.hp,grounded:world.hero.position.y<.02,crouching:sim.s.player.crouched});aim.update();if(visualResult&&!world.performance&&!dialogue.active)world.onPerformanceEnd?.();if(!dialogue.active&&(!checkReveal.active||world.theftAttempt)){environment.update(dt,started);}positionBubbles();if(!checkReveal.active&&!dialogue.active&&!world.performance&&pendingActionSpeech.length){queueSpeech(pendingActionSpeech.splice(0));}updateEchoEncounters();updateSpeech();
 gateGoal.hidden=!started||sim.event?.type!=='gate'||dialogue.active;if(!gateGoal.hidden)iconButton(gateGoal,'MapPin','前往：'+sim.sceneView().title);
 if(started&&now-lastUI>120){lastUI=now;wardrobe.update(started);wantedEncounter.update();disguiseEncounter.update();progressUI.update(started);updateNpcCard();environment.refreshPack(started);updateProfile();updateConversation();const s=sim.s;$('combat-ready').hidden=!world.combatReady||world.locked;$('hp').value=s.player.hp;$('energy').value=s.player.energy;document.body.classList.toggle('vitals-full',s.player.hp>=$('hp').max&&s.player.energy>=$('energy').max);$('role-name').textContent=s.party.active==='companion'?'阿笙 · 同行':ROLES[s.role].name;$('money').textContent=s.player.money+' 文';$('clock').textContent=shichenText(s);$('clock').title=clockText(s)+' · 饱食 '+Math.round(s.player.satiety)+' / 100 · 精神 '+Math.round(s.player.rested)+' / 100';for(const [key,line] of [['satiety','（腹中空得难受，得找口吃的。）'],['rested','（眼皮直打架，找地方睡会儿吧。）']]){if(s.player[key]>25)s.player[key+'Warned']=false;else if(s.player.hp>0&&!world.locked&&!s.player[key+'Warned']&&world.onThought(line))s.player[key+'Warned']=true;};$('wanted').textContent=s.wanted?'嫌疑 '+s.wanted:'声望 '+s.reputation;$('unread').textContent=s.mail.filter(m=>!m.read).length||'';
 const event=world.nearbyEvent(),near=interactionNpc(),hidden=world.locked||!$('panel').hidden||!!world.performance||(!event&&!near&&!environment.nearStreet()&&!objects.canInteract)||s.player.hp<=0;$('interact').hidden=hidden;iconButton($('interact'),'MessageCircle',(event?'看看眼前发生的事':environment.nearStreet()?'介入街头动静':'与'+(near?.npc.person.name||'路人')+'交互'));if(near){const label=s.player.stealing?'翻看'+near.npc.person.name+'的随身物品':pendingEcho(s,near.id)?.announced?'回应'+near.npc.person.name:'与'+near.npc.person.name+'对话';$('interact').innerHTML='<span class="npc-talk-label">'+esc(label)+'</span>';$('interact').setAttribute('aria-label',label);}else{delete $('interact').dataset.icon;}$('ambient').hidden=!!(near&&s.people[near.id]?.awareness?.caseOpen)||!event||world.locked||!$('panel').hidden||speechQueue.length>0;if(event&&!$('ambient').hidden&&!world.locked&&!speechQueue.length){const lines=sim.sceneView()?[sim.sceneView().line]:SCENES[sim.event.type].lines,line=lines[Math.floor(world.t/6)%lines.length];const speaker=sim.sceneView()?.listener;const named=!!speaker&&!line.includes('：');$('ambient').textContent=named?(PEOPLE.find(n=>n.id===speaker)?.name||'')+'：'+line:line;const split=line.indexOf('：');journal.add('chat',split>=0?line.slice(0,split):speaker?PEOPLE.find(n=>n.id===speaker)?.name:'街坊',split>=0?line.slice(split+1):line,`ambient:${sim.event.id}:${line}`);}mini();}
 if(started&&now-lastSave>6000){lastSave=now;save();}
}
requestAnimationFrame(frame);window.addEventListener('beforeunload',save);
if(sessionStorage.getItem('jianghu-restart')==='1'){sessionStorage.removeItem('jianghu-restart');begin(true,true);}

if(new URLSearchParams(location.search).get('playtest')==='night'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/night-harness.js').then(m=>m.mountNightHarness({getSim:()=>sim,world,environment,save}));

if(new URLSearchParams(location.search).get("playtest")==="apprentice-qa"&&["localhost","127.0.0.1"].includes(location.hostname))import("../tests/apprenticeship-harness.js").then(m=>m.mountApprenticeshipHarness({getSim:()=>sim,world,environment,save}));

if(new URLSearchParams(location.search).get('playtest')==='respawn-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/respawn-harness.js').then(m=>m.mountRespawnHarness({getSim:()=>sim,world,save}));

if(new URLSearchParams(location.search).get('playtest')==='aftermath-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/aftermath-harness.js').then(m=>m.mountAftermathHarness({getSim:()=>sim,world,save}));

if(new URLSearchParams(location.search).get('playtest')==='dialogue-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/dialogue-harness.js').then(m=>m.mountDialogueHarness({getSim:()=>sim,world,save}));

if(new URLSearchParams(location.search).get('playtest')==='appearance'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/appearance-harness.js').then(m=>m.mountAppearanceHarness({getSim:()=>sim,world,environment,save}));
if(new URLSearchParams(location.search).get('playtest')==='theft-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/theft-harness.js').then(m=>m.mountTheftHarness({getSim:()=>sim,world,environment,objects,save}));
if(new URLSearchParams(location.search).get('playtest')==='balance-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/balance-harness.js').then(m=>m.mountBalanceHarness({getSim:()=>sim,world,environment,objects,save}));

if(new URLSearchParams(location.search).get('playtest')==='convoy-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/convoy-harness.js').then(m=>m.mountConvoyHarness({getSim:()=>sim,world,environment,save}));
if(new URLSearchParams(location.search).get('playtest')==='recovery-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/recovery-harness.js').then(m=>m.mountRecoveryHarness({getSim:()=>sim,world,environment,save}));
if(new URLSearchParams(location.search).get('playtest')==='context-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/contextual-responses-harness.js').then(m=>m.mountContextHarness({getSim:()=>sim,world,environment,disguiseEncounter,save}));

if(new URLSearchParams(location.search).get('playtest')==='action-cards-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/action-cards-harness.js').then(m=>m.mountActionCardsHarness({getSim:()=>sim,world,environment,save}));

mountInvestigation({wanted:wantedEncounter,getSim:()=>sim,world,dialogue,checkReveal,available:()=>started&&!world.locked&&!world.performance&&!dialogue.active&&!checkReveal.active&&!sim.s.complaint&&sim.s.player.hp>0,close:closePanel,log:text=>journal.add('system','事发地盘查',text)});
if(new URLSearchParams(location.search).get('playtest')==='lasso-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/lasso-harness.js').then(m=>m.mountLassoHarness({getSim:()=>sim,world,environment,save}));

if(new URLSearchParams(location.search).get('playtest')==='fu-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/fu-harness.js').then(m=>m.mountFuHarness({getSim:()=>sim,world,environment,save}));

if(new URLSearchParams(location.search).get('playtest')==='convoy-aftermath-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/convoy-aftermath-harness.js').then(m=>m.mountConvoyAftermathHarness({getSim:()=>sim,world,environment,save}));

if(new URLSearchParams(location.search).get('playtest')==='identity-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/identity-harness.js').then(m=>m.mountIdentityHarness({getSim:()=>sim,world,environment,save}));
if(new URLSearchParams(location.search).get('playtest')==='disguise-status-qa'&&['localhost','127.0.0.1'].includes(location.hostname))import('../tests/disguise-status-harness.js').then(m=>m.mountDisguiseStatusHarness({getSim:()=>sim,world,environment,save}));
