import {beginRestraintAttempt} from '../src/npc-restraints.js';
import {actionCandidates,actionCardState} from '../src/action-cards.js';
import {recordDeed} from '../src/event-deck.js';
import {progressSnapshot} from '../src/progress.js';
// Localhost fixture only; the normal scheduler, movement, animation and settlement run unchanged.
export function mountActionCardsHarness({getSim,world,environment,save}){
 const ui=document.createElement('details');ui.id='action-card-qa';ui.open=true;ui.style.cssText='position:fixed;top:75px;left:12px;z-index:1000;background:var(--paper,#eee6d6);color:var(--ink,#302b25);font:14px serif;width:250px;padding:8px';
 ui.innerHTML='<summary>行动牌 · 独立试玩</summary><nav></nav><output style="white-space:pre-wrap"></output>';document.body.append(ui);
 const trace=[];let last='',kind='';
 function arrange(template){const sim=getSim(),s=sim.s,eco=environment.eco;kind=template;trace.length=0;last='';world.dialogue.finish(true);s.day++;s.time=75;s.event=null;s.wanted=0;s.complaint=null;s.territory=null;s.investigations={seq:0,cases:[],bodySeen:{}};s.facts.enteredCity=true;s.facts.entryStarted=false;
  Object.assign(s.player,{x:0,z:12,hp:template==='heal'?15:100,satiety:template==='food'?10:85,energy:100,rested:90,face:null});delete s.player.bedRest;
  world.hero.position.set(0,0,12);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.auto=null;world.keys.clear();world.clearReady();world.performance=null;world.quietUntil=0;
  for(const [id,n]of Object.entries(s.people)){n.awareness=null;n.fear=0;n.mood='calm';n.stunnedUntil=0;n.muteUntil=0;n.sickUntil=0;n.hp=100;delete n.concern;delete n.concernHeard;delete n.harmKnowledge;delete n.restraint;}
  const id=template==='heal'?'tea':template==='revenge'?'qing':'old_constable';
  function place(who,x,z){const n=s.people[who],v=world.npcs.get(who);Object.assign(n,{x,z,facing:0,life:{activity:'idle'},inCustody:false,relation:who==='qing'&&template==='revenge'?-35:5});v.actor.position.set(x,0,z);v.actor.rotation.y=0;v.cardPath=null;v.route=null;}
  place(id,0,7);if(template==='revenge')place('shen',4,7);
  if(template==='food'&&!eco.items('npc:'+id).some(i=>i.type==='food'))eco.create('干粮','food','npc:'+id,{discovered:true,ownerId:id});
  if(template==='heal'&&!eco.items('npc:tea').some(i=>i.type==='bandage'))eco.create('随身伤药','bandage','npc:tea',{discovered:true,ownerId:'tea'});
  s.deck??={};s.deck.actions={used:{},attempts:{},active:null,lastDay:0,nextAt:0,food:{handled:false,lastDay:null},visits:{}};
  if(template==='dealer'){s.facts.enteredCity=false;s.facts.entryStarted=true;s.people[id].metPlayer=true;s.deck.used={};s.deck.actions.visits[id+':player']={count:1,day:s.day-1,outside:true,stage:'gate',lines:[]};}
  if(template==='revenge')recordDeed(sim,'actionWitnessed',{incidentType:'assault',target:'qing',text:'你先前在桥头伤了林青舟，他亲眼记下。',witnesses:['qing'],identities:{qing:'player'}});
  sim.rng=()=>0;world.syncEvent();sim.progressBaseline=progressSnapshot(s);save();
 }
 function family(bound=false){arrange('food');kind='family';const sim=getSim(),s=sim.s,eco=environment.eco;
  for(const [id,x,z]of [['old_constable',-8,30],['tea_host',0,7],['qinghe',0,10.2]]){const n=s.people[id],a=world.npcs.get(id).actor;a.position.set(x,0,z);a.rotation.y=0;Object.assign(n,{x,z,facing:0,life:{activity:'idle'},relation:80,awareness:null});}
  if(!eco.items('npc:tea_host').some(i=>i.type==='food'))eco.create('包子','food','npc:tea_host',{ownerId:'tea_host',discovered:true});
  if(bound){const rope=eco.items('player').find(i=>i.type==='rope');eco.transfer(rope,'npc:qinghe','fixture');s.people.qinghe.restraint={mode:'fixed',ropeId:rope.id,at:s.npcClock,anchor:{x:0,z:10.2}};}
  save();
 }
 function rope(action){const sim=getSim(),eco=environment.eco;const attempt=beginRestraintAttempt(sim,eco,'qinghe',action);if(attempt.error)throw new Error(attempt.error);world.perform({motion:action==='catch'?'lasso':'knot',kind:'steal'},'qinghe');world.performance.duration=action==='catch'?1.8:1.7;world.performance.camera=false;world.performance.restraintAttempt=attempt;world.performance.onStrike=()=>{const r=attempt.finish();world.performance.settled=true;if(r.error)throw new Error(r.error);};}
 for(const [label,run]of [['宋家 · 等候',()=>family()],['宋家 · 只见受困',()=>family(true)],['当面抛绳',()=>rope('catch')],['放开青禾',()=>rope('release')],['饥饿 · 送食',()=>arrange('food')],['重伤 · 包扎',()=>arrange('heal')],['旧怨 · 寻仇',()=>arrange('revenge')],['收起',()=>ui.open=false]]){const b=document.createElement('button');b.textContent=label;b.onclick=run;ui.querySelector('nav').append(b);}
 function snapshot(){const s=getSim().s,e=s.deck?.actions?.active;return {day:s.day,used:structuredClone(s.deck?.used||{}),leads:structuredClone(s.deck?.leads||[]),pacing:structuredClone(s.deck?.actions?.food||null),family:{concern:structuredClone(s.people.tea_host.concern||null),knowledge:structuredClone(s.people.tea_host.harmKnowledge||[]),bound:!!s.people.qinghe.restraint,relation:s.people.tea_host.relation,candidate:actionCandidates(s,Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position])),world.obstacles).some(c=>c.who==='tea_host'&&c.template==='food')},kind,hp:s.player.hp,satiety:s.player.satiety,active:e?structuredClone(e):null,food:environment.eco.items('player').filter(i=>i.type==='food').length,debt:s.people.tea.favorOwed||0,positions:Object.fromEntries([...world.npcs].filter(([id])=>['qing','shen','tea','old_constable','tea_host','qinghe'].includes(id)).map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z}])),trace:[...trace],locked:world.locked,cinematic:world.cinematic,marker:!!(e&&world.npcs.get(e.who)?.actionMarker?.visible),markerLoaded:!!(e&&world.npcs.get(e.who)?.actionMarker?.material.map.image?.complete)};}
 function nextVisit(){const s=getSim().s;s.day++;s.time=75;s.deck.actions.active=null;s.deck.actions.nextAt=0;s.player.satiety=10;s.people.old_constable.metPlayer=true;const n=world.npcs.get('old_constable');n.actor.position.set(0,0,7);n.actor.rotation.y=0;n.cardPath=null;Object.assign(s.people.old_constable,{x:0,z:7,facing:0,life:{activity:'idle'}});save();}
 globalThis.__actionCardsQA={snapshot,save,arrange,nextVisit};
 setInterval(()=>{const r=snapshot(),e=r.active,key=e?.cardId+':'+(e?.phase||'idle');if(key!==last){trace.push({phase:e?.phase||'idle',hp:r.hp,at:world.t,position:e&&r.positions[e.who]});last=key;}ui.querySelector('output').textContent=`气血 ${Math.round(r.hp)} · 饱食 ${Math.round(r.satiety)}\n阶段 ${e?.phase||'无'}\n已结算 ${!!e?.settled} · 耗时 ${e?.elapsed.toFixed(1)||0}\n送食 ${r.food} · 欠药 ${r.debt}\n${e?.outcome||''}`;},100);
}
