import {PEOPLE} from './data.js';
import {believedIdentity,currentFace,changeRelation,spreadIdentityRumor} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {importantPeople,rememberHarm} from './npc-bonds.js';
import {disposition} from './npc-territory.js';
import {persona} from './npc-persona.js';
import {addCausalDeed} from './item-meaning.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';
import {restraintIntact} from './npc-restraints.js';

const clock=s=>s.npcClock||0;
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const name=id=>PEOPLE.find(p=>p.id===id)?.name||'那人';
const faction=(s,id)=>s.people[id]?.faction||PEOPLE.find(p=>p.id===id)?.faction;
const law=f=>['六扇门','临溪县衙','临溪守军'].includes(f);
const officer=id=>['guard','gate_guard','gate_relief','inspector'].includes(id);
const urgent=n=>['fight','warn','flee','search','investigate'].includes(n?.awareness?.state);
const serial=s=>currentFace(s)==='player'?0:s.player.face.serial;
// This is active intervention, so all body constraints apply before perception or movement.
export function escortObserverReady(s,id){
 const n=s.people[id];return !!n&&n.hp>(n.maxHp||100)*.3&&!n.restraint&&!n.inCustody&&!n.drowning&&!n.burning&&
  !(n.stunnedUntil>clock(s))&&!(n.muteUntil>clock(s))&&!(n.sickUntil>(s.ecosystem?.time||0))&&
  !['sleep','doze','escape','down'].includes(n.life?.activity)&&!(n.fear>0);
}
export function seesEscort(s,id,target,positions,obstacles=[]){
 const a=positions[id],b=positions[target],p=s.player;
 if(id===target||!escortObserverReady(s,id)||!a||!b||a.visible===false||b.visible===false||
  distance(a,b)>8||distance(a,p)>9||distance(b,p)>8.5)return false;
 const facing=a.facing??s.people[id].facing??0;
 const inFront=q=>distance(a,q)<.4||((q.x-a.x)*Math.sin(facing)+(q.z-a.z)*Math.cos(facing))/distance(a,q)>=.2;
 // Both the captive and the person holding the rope must be visible. A tied body alone proves no culprit.
 return inFront(b)&&inFront(p)&&visibleBetween(a,b,obstacles,s.ecosystem?.objects)&&visibleBetween(a,p,obstacles,s.ecosystem?.objects)&&visibleBetween(p,b,obstacles,s.ecosystem?.objects);
}
export function escortSpeechCurrent(s,line){
 if(!line.escortKey)return true;
 return escortObserverReady(s,line.id)&&Object.values(s.people).some(n=>n.restraint?.mode==='lead'&&n.restraint.street?.key===line.escortKey&&!n.custodyDelivered);
}
function validCustody(s,target){
 const n=s.people[target];return !!(n?.restraint?.lawful&&n.inCustody&&!n.custodyDelivered&&
  (target==='thief'&&s.facts.publicWarrant||s.facts.warrants?.[target]&&s.ecosystem?.items.some(i=>i.location==='player'&&i.badge==='court'&&i.hp>0&&!i.badgeRevoked&&!i.badgeSuspended)));
}
// Disposition uses actual affiliations and established personal ties, never player UI knowledge.
export function escortResponse(s,id,target){
 const f=faction(s,id),tf=faction(s,target),close=importantPeople(s,id).includes(target)||disposition(s,id,target)>=20;
 const lawful=validCustody(s,target),ally=close||f&&f===tf&&f!=='临溪街坊'||law(f)&&law(tf);
 if(lawful)return {kind:'yield',reason:'lawful',text:officer(id)?'依法拘传，人须活着带到堂前。旁人让路。':'有人押着人过来了，先让条路。'};
 if(f==='宗室王府'&&tf==='六扇门')return {kind:'intervene',reason:'ally',text:'人先留下。顾大人与你有什么过节，当着我的面说清。'};
 if(ally)return {kind:'intervene',reason:'ally',text:officer(id)?`站住！先放开${name(target)}，有事到堂前说。`:close?`先放开${name(target)}！有什么话，当着我的面说。`:'把人放开！同门的事，我不能袖手旁观。'};
 if(officer(id))return {kind:'intervene',reason:'duty',text:'站住！我看见你牵着绳子押人。先松绑，再说缘由。'};
 if(disposition(s,id,target)<=-20)return {kind:'mock',reason:'rival',text:target==='inspector'?`顾大人，平日问别人案由，今日怎么被人牵着走？`:law(tf)?'往日好大的官威，今日倒让绳子牵着走。':'平日横着走，今日倒叫人拿住了。'};
 if(f==='青竹会')return {kind:'intervene',reason:'protect',text:'路上来往的都是人，不能这样牵着示众。停下，把绳子松开。'};
 if(persona(id)[0]==='wary'||persona(id)[0]==='trade')return {kind:'avoid',reason:'caution',text:id==='tea_host'?'别这样拖着人走，路上还有旁人。':id==='inn'?'往旁边让让，别伤了过路的人。':'让开些，别卷进这场是非。'};
 return {kind:'watch',reason:'curious',text:id==='elder'?'人被绳子牵着走……这前因后果，可不能凭热闹乱说。':id==='gao'?'先停一停，有什么过节要这样押着人走？':'怎么把人绑着带到街上来了？'};
}
function ledger(s,target){
 const r=s.people[target].restraint;
 return r.street??={key:'escort:'+target+':'+r.ropeId+':'+r.at,seen:{}};
}
export function observeEscorts(sim,positions,obstacles=[]){
 const s=sim.s;if(s.chapterVersion!==2||s.player.hp<=0)return;
 let changed=false;
 for(const [target,captive] of Object.entries(s.people)){
  if(captive.restraint?.mode!=='lead'||captive.custodyDelivered)continue;
  if(!restraintIntact(s,target))continue;
  for(const id of Object.keys(positions)){
   const n=s.people[id];if(!seesEscort(s,id,target,positions,obstacles)||urgent(n))continue;
   const book=ledger(s,target);let seen=book.seen[id];
   if(!seen){
    const response=escortResponse(s,id,target),subject=believedIdentity(s,id);
    seen=book.seen[id]={...response,subject,serial:serial(s),at:clock(s),announced:false};
    const deed=addCausalDeed(s,{key:book.key+':'+id,title:'沿途目击',text:`${name(id)}看见${name(target)}被绳子牵行，也看清了握着绳头的人。`,target,subject,identities:{[id]:subject},witnesses:[id],cause:captive.restraint.cause});
    seen.cause=deed.id;
    // Do not pretend this observer saw the original tying, or levy a second assault penalty.
    if(!validCustody(s,target))rememberHarm(s,id,{subject,target,kind:'restraint',cause:deed.id,evidence:'seen-escort'});
    changed=true;
   }
   if(seen.finished&&seen.kind==='intervene'&&n.awareness?.escortKey===book.key&&['idle','return'].includes(n.awareness.state))seen.finished=false;
   if(seen.finished)continue;
   let r=n.escortReaction;
   if(!r||r.key!==book.key){
    r=n.escortReaction={key:book.key,target,kind:seen.kind,subject:seen.subject,serial:seen.serial,started:clock(s),until:clock(s)+(seen.kind==='intervene'?20:14)};
    if(seen.kind==='intervene'&&seen.announced)r.warnedAt=clock(s);
    n.eatingUntil=n.drinkingUntil=n.pouringUntil=0;changed=true;
   }
   r.lastSeen={x:s.player.x,z:s.player.z};r.captive={x:positions[target].x,z:positions[target].z};r.seenAt=clock(s);
  }
 }
 if(changed)sim.save();
}
function finish(world,id,r,complete=false){
 const s=world.sim.s,book=s.people[r.target]?.restraint?.street;
 if(book?.key===r.key&&book.seen[id])book.seen[id].finished=complete||r.kind!=='intervene';
 delete s.people[id].escortReaction;delete world.npcs.get(id)?.escortPath;
 world.sim.save();return false;
}
function nearbyFight(world){
 const s=world.sim.s;
 // A captive retains evidence/hostility, but restraint owns their body: they are not fighting.
 return [...world.npcs].some(([id,n])=>{const st=s.people[id];return st?.awareness?.state==='fight'&&st.hp>0&&!st.restraint&&!st.inCustody&&!(st.stunnedUntil>clock(s))&&!st.drowning&&!['sleep','doze','down'].includes(st.life?.activity)&&distance(n.actor.position,s.player)<8&&visibleBetween(n.actor.position,s.player,world.obstacles,s.ecosystem?.objects);});
}
function say(world,id,r,seen,text){
 const s=world.sim.s,n=world.npcs.get(id),state=s.people[id];
 if(world.t<(world.nextEscortSpeech||0)||world.t<(n.escortSpeechUntil||0)||r.kind!=='intervene'&&(world.combatReady||nearbyFight(world)))return false;
 const valid=()=>state.escortReaction===r&&escortSpeechCurrent(s,{id,escortKey:r.key})&&!urgent(state)&&distance(n.actor.position,s.player)<9&&visibleBetween(n.actor.position,s.player,world.obstacles,s.ecosystem?.objects);
 const onShown=()=>{
  if(!valid())return false;if(seen.announced)return true;
  seen.announced=true;
  addCausalDeed(s,{key:r.key+':speech:'+id,title:'街头回应',text:`${name(id)}说：“${text}”`,target:id,subject:r.subject,cause:seen.cause,witnesses:[id],identities:{[id]:r.subject}});
  if(r.kind==='intervene'){
   r.warnedAt=clock(s);
   if(!seen.settled){
    const relation=()=>seen.subject==='player'?state.relation||0:s.appearance?.relations?.[id+':'+seen.subject]||0,prior=relation();
    changeRelation(world.sim,id,-2,seen.subject);seen.settled=true;spreadIdentityRumor(s,seen.subject,4,'亲眼看见牵行束缚者',id);
    addCausalDeed(s,{key:r.key+':warning:'+id,title:'拦下牵行',text:`${name(id)}要求先松绑。对牵绳者的好感 ${relation()-prior}；亲眼所见仍被记住。`,target:id,subject:seen.subject,cause:seen.cause,witnesses:[id],identities:{[id]:seen.subject}});
   }
  }
  world.sim.save();return true;
 };
 if(!world.onActionCardSpeech?.({id,text,escortKey:r.key,valid,onShown}))return false;
 world.nextEscortSpeech=world.t+6.5;n.escortSpeechUntil=world.t+7;return true;
}
function standAtEncounter(world,id,r,pos){
 const yielding=['avoid','yield'].includes(r.kind),center=yielding?r.lastSeen:r.kind==='intervene'?r.lastSeen:r.captive;
 const angle=Math.atan2(pos.x-center.x,pos.z-center.z),radius=yielding?distance(pos,center)+1.5:r.kind==='intervene'?2.3:3;
 for(const offset of [0,.5,-.5,1,-1,1.5,-1.5,Math.PI]){
  const q={x:center.x+Math.sin(angle+offset)*radius,z:center.z+Math.cos(angle+offset)*radius};
  if(world.collides(q.x,q.z,0,false)||distance(q,world.hero.position)<1.2)continue;
  if([...world.npcs].some(([other,n])=>other!==id&&n.actor.visible!==false&&(distance(q,n.actor.position)<1||distance(q,world.sim.s.people[other]?.escortReaction?.stand)<1.2)))continue;
  return q;
 }
 return {x:pos.x,z:pos.z};
}
export function escortReactionFrame(world){
 if(!world.playing||world.locked||world.cinematic||world.performance||world.sim.s.chapterVersion!==2||world.t<(world.nextEscortScan||0))return;
 world.nextEscortScan=world.t+.25;
 for(const [id,n] of Object.entries(world.sim.s.people)){
  const a=n.awareness;if(!a?.escortKey)continue;
  const r=world.sim.s.people[a.escortTarget]?.restraint;
  if((!r||r.mode!=='lead'||r.street?.key!==a.escortKey)&&a.lastIncident===a.escortIncidentAt){
   if(r?.street?.key===a.escortKey&&r.street.seen[id])r.street.seen[id].finished=false;
   a.state='return';a.until=clock(world.sim.s);delete a.escortKey;world.sim.save();
  }
 }
 observeEscorts(world.sim,Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y,visible:n.actor.visible}])),world.obstacles);
}
export function escortReactionMotion(world,id,n,dt){
 const s=world.sim.s,state=s.people[id],r=state?.escortReaction;if(!r)return false;
 const captive=s.people[r.target],book=captive?.restraint?.street,seen=book?.seen[id];
 if(!book||book.key!==r.key||captive.restraint.mode!=='lead'||captive.custodyDelivered||s.player.hp<=0)return finish(world,id,r);
 if(!escortObserverReady(s,id)||urgent(state)||world.trainingActor===id||s.complaint?.id===id)return false;
 if(!world.playing||world.cinematic)return false;
 if(world.locked||world.performance)dt=0;
 const pos=n.actor.position,p=world.hero.position,q=world.npcs.get(r.target)?.actor.position;
 const visible=q&&distance(pos,p)<=10&&visibleBetween(pos,p,world.obstacles,s.ecosystem?.objects)&&visibleBetween(pos,q,world.obstacles,s.ecosystem?.objects);
 // Old v2 interveners had no stopping point and could wait forever past their deadline.
 // Give that saved encounter one bounded chance to deliver the missing warning.
 if(r.kind==='intervene'&&!r.stand)r.until=Math.max(r.until||0,clock(s)+20);
 if(clock(s)-(r.seenAt||0)>5||distance(pos,p)>14||clock(s)>Math.max(r.until??r.started+20,(r.warnedAt??-Infinity)+8))return finish(world,id,r,true);
 // Never acquire a changed face through an obstruction. Stored attribution stays immutable.
 if(r.serial!==serial(s)&&!visible)return finish(world,id,r);
 if(visible){r.lastSeen={x:p.x,z:p.z};r.captive={x:q.x,z:q.z};}
 const intervene=r.kind==='intervene';
 // Approach a distinct spot at this encounter. Waiting for a speech slot never tracks the player.
 // Existing v2 reactions without a stand acquire one here, preserving their evidence and settlement.
 r.stand??=standAtEncounter(world,id,r,pos);const goal=r.stand,stop=.2;
 const before=pos.clone(),remaining=distance(pos,goal);
 if(dt&&remaining>stop){
  if(!n.escortPath||world.t>=(n.escortRepath||0)){n.escortRepath=world.t+.6;n.escortPath=routinePath(pos,goal,(x,z)=>world.collides(x,z,0,false),stop);}
  while(n.escortPath.length&&distance(pos,n.escortPath[0])<.15)n.escortPath.shift();
  const next=n.escortPath[0];if(next){const len=distance(pos,next),step=Math.min(len,dt*(intervene?2.8:1.6));if(len>.001){
   const angle=Math.atan2(next.x-pos.x,next.z-pos.z);
   for(const offset of [0,.25,-.25,.5,-.5,1,-1]){
    const dx=Math.sin(angle+offset)*step,dz=Math.cos(angle+offset)*step,q={x:pos.x+dx,z:pos.z+dz};
    const crowded=[...world.npcs].some(([other,n])=>other!==id&&n.actor.visible!==false&&distance(q,n.actor.position)<.9&&distance(q,n.actor.position)<distance(pos,n.actor.position));
    if(!crowded&&!world.collides(q.x,q.z,0,false)){world.move(n.actor,dx,dz,true);break;}
   }
  }}
 }
 const look=intervene?r.lastSeen:r.captive;n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(look.x-pos.x,look.z-pos.z),dt);
 for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop)prop.visible=false;
 n.chasing=n.fleeing=false;n.actor.userData.sword.visible=false;
 world.animateActor(n.actor,dt?pos.distanceTo(before)/dt/2:0,dt,world.speaking===id?'talk':'');
 if(intervene)n.actor.userData.arms[0].rotation.x=-1.25;
 n.label.visible=!world.locked&&distance(pos,p)<8;
 if(dt&&visible&&!seen.announced&&distance(pos,p)<8)say(world,id,r,seen,seen.text);
 // A warning is delivered in the world, with time to use the ordinary release action.
 // Refusing it recruits the shared pursuit/combat path; no remote untying or custom damage.
 if(dt&&intervene&&r.warnedAt!=null&&clock(s)-r.warnedAt>=7&&visible&&distance(pos,p)<9){
  state.awareness={home:{x:n.base?.x??pos.x,z:n.base?.z??pos.z},state:'fight',caseOpen:true,severe:true,suspect:'player',believedIdentity:r.subject,appearanceSerial:serial(s),seen:true,lastKnown:{x:p.x,z:p.z},until:clock(s)+12,lastIncident:clock(s),escortIncidentAt:clock(s),escortKey:r.key,escortTarget:r.target};
  seen.finished=true;delete state.escortReaction;world.sim.save();return false;
 }
 state.x=pos.x;state.z=pos.z;state.facing=n.actor.rotation.y;return true;
}
