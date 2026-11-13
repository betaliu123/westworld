// Explicit localhost playtest; uses the production save-key isolation and UI.
import {rememberFace,applyFace,checkDisguise} from '../src/appearance.js';
import {applyAftermath,deckState} from '../src/event-deck.js';
import {actionCandidates,startActionCard,actionCardStep,beginActionGuidance,finishActionGuidance} from '../src/action-cards.js';
export function mountCausalLedgerHarness({getSim,world,codex,night,dialogue,environment}){
 const panel=document.createElement('details');panel.id='causal-ledger-qa';panel.open=true;
 panel.style.cssText='position:relative;pointer-events:auto;background:var(--paper);color:var(--ink-1);font:14px/1.7 var(--font-body);padding:8px;max-width:300px';
 panel.innerHTML='<summary>因果簿验收</summary><nav></nav><output style="white-space:pre-wrap"></output>';
 document.getElementById('hud-left-stack').append(panel);
 const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 function seed(multiple=false){
  const sim=getSim(),s=sim.s;dialogue.finish(true);night.close();
  s.chronicle={deeds:[],diaries:[],seq:0};const d=deckState(s);d.echoes=[];d.cards=[];s.player.hp=100;s.player.energy=100;
  s.people.gate_merchant.metPlayer=true;s.people.gate_guard.metPlayer=true;s.people.gate_relief.metPlayer=true;
  for(const id of ['gate_guard','gate_merchant','gate_relief'])Object.assign(s.people[id],{hp:100,relation:0,life:{activity:'idle'},awareness:null,stunnedUntil:0,muteUntil:0,fear:0});
  environment.eco.create('易容膏','cosmetic','player',{discovered:true});environment.eco.create('易容膏','cosmetic','player',{discovered:true});
  rememberFace(s,'gate_merchant');applyFace(sim,'gate_merchant');const rng=sim.rng;sim.rng=()=>.99;checkDisguise(sim,'gate_guard');if(multiple){applyFace(sim,'gate_merchant');checkDisguise(sim,'gate_merchant');}sim.rng=rng;
  applyAftermath(sim,null);s.player.crouched=true;s.player.stealing=true;
  codex.open('affairs');panel.open=false;
 }
 const close=()=>{night.close();dialogue.finish(true);document.getElementById('drawer').hidden=true;};
 function guide(legacy=false){
  close();const sim=getSim(),s=sim.s,id='old_constable',d=deckState(s);
  s.chronicle={deeds:[],diaries:[],seq:0};Object.assign(d,{cards:[],echoes:[],leads:[],used:{},actions:{lastDay:-1}});
  Object.assign(s.player,{x:0,z:12,hp:100,satiety:80,bedRest:false});s.complaint=null;s.event=null;s.facts.enteredCity=false;
  Object.assign(s.people[id],{hp:100,metPlayer:true,relation:10,life:{activity:'idle'},facing:0,awareness:null,fear:0,concern:null,restraint:null,stunnedUntil:0,muteUntil:0});
  const pos={[id]:{x:0,z:7}},e=startActionCard(sim,actionCandidates(s,pos).find(c=>c.template==='guide'),pos);
  if(!e)throw new Error('提点验收未能开始');
  const original=structuredClone(d.cards.find(c=>c.id===e.cardId));pos[id]={x:1.1,z:12.3};s.people[id].facing=Math.atan2(-1.1,-.3);
  actionCardStep(sim,environment.eco,.1,pos);e.dialogueChoice={topic:'river_fence'};
  const visit=beginActionGuidance(sim,id,e.cardId,pos);s.time+=31;
  const card=finishActionGuidance(sim,id,e.cardId,pos,[],false,visit.token);
  if(!card)throw new Error('提点验收未能完成');
  if(legacy){
   Object.assign(original,{line:card.line,lead:s.chronicle.deeds.at(-1).text,outcome:'completed'});
   const result={...card,id:++d.seq};for(const key of ['actionTemplate','cause','deed','subject','outcome'])delete result[key];
   d.cards=[original,result];d.leads.find(l=>l.event===card.event).id=result.id;
  }
  sim.save();codex.open('affairs');
 }
 for(const [label,fn]of [
  ['提点旧档',()=>guide(true)],['提点新档',()=>guide()],
  ['生成余波',()=>seed()],['多事件',()=>seed(true)],['因果簿',()=>{close();codex.open('affairs');}],
  ['夜间余波',()=>{close();const s=getSim().s;night.show({day:s.day,clock:'夜间验收',pending:Promise.resolve({diary:{lines:['冒名之事，已在人心留下痕迹。']},cards:[],echoes:s.deck?.echoes||[]})});}],
  ['长对白',()=>{close();dialogue.play([{id:'gate_guard',text:'我记得关前发生过什么，也记得那时眼前是谁。你若想解释，便把当时的缘由说清。听来的话，我会另行核实；亲眼见过的事，也不能一句道歉就当作从未发生。'}],()=>{},'');}],
  ['角色信息',()=>{close();codex.open('self');}],
  ['探索清屏',()=>{close();const s=getSim().s;s.player.crouched=false;s.player.stealing=false;panel.hidden=true;}]
 ]){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{fn();panel.open=false;};panel.querySelector('nav').append(button);}
 setInterval(()=>{
  const visible=e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return r.width&&r.height&&c.display!=='none'&&c.visibility!=='hidden'&&!e.closest('[hidden],.hud-obscured');};
  const root=[...document.querySelectorAll('#night-deal,#drawer,#dialogue-stage')].find(visible);
  const text=root?[...root.querySelectorAll('*')].filter(e=>visible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())):[];
  const r=root?.getBoundingClientRect();
  panel.querySelector('output').textContent=JSON.stringify({width:innerWidth,height:innerHeight,root:root?.id,groups:root?.querySelectorAll('.jh-echo-group').length,small:text.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14).length,badFonts:text.filter(e=>/微软雅黑|Microsoft YaHei|Segoe|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily)).length,fits:!r||(r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight),overflow:!!root&&root.scrollWidth>root.clientWidth,errors});
 },250);
}
