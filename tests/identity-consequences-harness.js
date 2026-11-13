import {identityConsequenceCandidate} from '../src/identity-consequences.js';
import {visibleBetween} from '../src/npc-awareness.js';
import {rememberFace,applyFace} from '../src/appearance.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {recordDeed} from '../src/event-deck.js';

// Local fixtures supply a past witnessed incident, then leave production scene
// motion, bubbles, service, journal and persistence running normally.
export function mountIdentityConsequencesHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='identity-consequences-qa';el.open=true;
 el.style.cssText='position:fixed;right:8px;top:8px;z-index:1500;background:var(--paper);color:var(--ink);font:14px var(--font-body);padding:6px;max-width:270px';
 el.innerHTML='<summary>误认余波 · 独立验收</summary><nav></nav><output style="white-space:pre-wrap;display:block"></output>';document.body.append(el);
 let pinned=false;const errors=[],lines=[];
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned&&['tea_host','gate_merchant'].includes(id)?true:steer(id,dt);
 function person(id,x,z){const s=getSim().s,n=s.people[id],a=world.npcs.get(id).actor;Object.assign(n,{x,z,hp:100,maxHp:100,stunnedUntil:0,muteUntil:0,sickUntil:0,restraint:null,inCustody:false,awareness:null,fear:0,concern:null,life:{activity:'idle'}});a.position.set(x,0,z);a.rotation.y=id==='tea_host'?Math.PI/2:-Math.PI/2;environment.eco.positions[id]={x,z,facing:a.rotation.y};}
 function player(x,z){Object.assign(getSim().s.player,{x,z,hp:100,energy:100,satiety:100,rested:100,face:null,bedRest:null});world.hero.position.set(x,0,z);world.keys.clear();world.auto=null;world.clearReady();world.yaw=0;world.pitch=.37;world.distance=8;}
 function prepare(masked=true){const sim=getSim(),s=sim.s;world.dialogue.finish(true);world.checkReveal.cancel();environment.close();document.getElementById('panel').hidden=true;document.getElementById('drawer').hidden=true;s.event=null;s.chapter.opened=true;s.time=35;s.complaint=null;s.wanted=0;s.identityConsequences=null;s.chronicle={seq:0,deeds:[],diaries:[]};s.deck.echoes=[];s.deck.cards=[];s.deck.actions={nextAt:(s.npcClock||0)+600};s.investigations={seq:0,cases:[],bodySeen:{}};s.appearance.observedChanges={};s.appearance.exposed={};delete s.people.tea_host.teaRefusals;lines.length=0;
  player(20,38);person('tea_host',-10,35);person('gate_merchant',20,28);s.people.gate_merchant.metPlayer=true;rememberFace(s,'gate_merchant');environment.eco.create('易容膏','cosmetic','player');if(masked)applyFace(sim,'gate_merchant');
  Object.assign(s.player,{x:-8,z:35});world.hero.position.set(-8,0,35);const event={type:'theft',owner:'tea_host',x:-8,z:35};witnessEvent(sim,'tea_host',event,true,{x:-10,z:35});recordDeed(sim,'actionWitnessed',{...event,incidentType:'theft',witnesses:['tea_host'],text:'茶娘看见有人在茶棚前伸手取物。'});
  s.player.x=20;s.player.z=38;world.hero.position.set(20,0,38);applyFace(sim,'player');person('tea_host',-10,35);person('gate_merchant',-5.5,35);player(-7.5,40);for(const id of ['tea_host','gate_merchant']){environment.eco.s.hunger[id]=20;s.people[id].energy=100;}pinned=true;world.quietUntil=world.t+2;world.syncEvent();save();el.open=false;
 }
 const actions=[['茶棚误认',()=>prepare(true)],['本来面貌对照',()=>prepare(false)],['原主昏迷',()=>getSim().s.people.gate_merchant.hp=0],['原主恢复',()=>getSim().s.people.gate_merchant.hp=100],['收起',()=>el.open=false]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 const speech=document.getElementById('npc-speech');new MutationObserver(()=>{if(!speech.hidden&&speech.innerText&&!lines.includes(speech.innerText))lines.push(speech.innerText);}).observe(speech,{subtree:true,childList:true,attributes:true});
 setInterval(()=>{const s=getSim().s,e=s.identityConsequences?.active;const visible=[...document.querySelectorAll('#drawer h3,#drawer p,#drawer small,#drawer span,#npc-speech b,#npc-speech span')].filter(e=>e.getClientRects().length);const bad=visible.filter(e=>{const c=getComputedStyle(e);return parseFloat(c.fontSize)<14||/Segoe|微软雅黑|Georgia|sans-serif/i.test(c.fontFamily);});
  el.querySelector('output').textContent=`${innerWidth}×${innerHeight} / ${errors.length} 错误 / ${bad.length} 字体违规\n诊断 ${JSON.stringify({candidate:identityConsequenceCandidate(s,Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}])),world.obstacles)?.key,clear:visibleBetween(s.player,world.npcs.get('tea_host').actor.position,world.obstacles,s.ecosystem.objects),locked:world.locked,complaint:!!s.complaint,active:s.deck.actions.active?.template,life:s.people.tea_host.life?.activity,aware:s.people.tea_host.awareness,ref:s.chronicle.deeds[0]?.identities,serial:s.chronicle.deeds[0]?.identitySerials,exposed:s.appearance.exposed,change:s.appearance.observedChanges?.tea_host})}\n阶段 ${e?.step??'无'} / 拒茶 ${!!s.people.tea_host.teaRefusals?.gate_merchant}\n茶娘 ${world.npcs.get('tea_host').actor.position.x.toFixed(1)},${world.npcs.get('tea_host').actor.position.z.toFixed(1)}\n赵行商 ${world.npcs.get('gate_merchant').actor.position.x.toFixed(1)},${world.npcs.get('gate_merchant').actor.position.z.toFixed(1)}\n${lines.join('\n')}\n${errors.join('\n')}`;
 },300);
}
