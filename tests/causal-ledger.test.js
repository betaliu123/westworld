import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {rememberFace,applyFace,checkDisguise,appearanceState} from '../src/appearance.js';
import {applyAftermath,commitDeal} from '../src/event-deck.js';
import {answerEcho} from '../src/aftermath-encounters.js';
import {ledgerHTML} from '../src/jianghu-ui.js';
import {echoGroupHTML,effectsHTML,echoView} from '../src/causal-ledger.js';

globalThis.window={lucide:{icons:{},createElement:()=>({outerHTML:'<svg></svg>'})}};

const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function fixture(){
 const sim=new Simulation(newArrival(),()=>.99);sim.save=()=>{};new Ecosystem(sim);
 const s=sim.s;s.facts.knownNames={gate_guard:'韩校尉',gate_relief:'周伍长',gate_merchant:'赵成'};for(const id of ['gate_merchant','gate_guard','gate_relief'])s.people[id].metPlayer=true;
 rememberFace(s,'gate_merchant');applyFace(sim,'gate_merchant');
 return {sim,s};
}

test('unmasking and rumors store actual capped deltas and keep the two penalties separate',()=>{
 const {sim,s}=fixture();s.people.gate_guard.relation=-99;s.people.gate_relief.relation=-99;
 s.reputation=-99;s.repute={cities:{linxi:-99},factions:{},seenGlobal:-99};
 checkDisguise(sim,'gate_guard');const deed=s.chronicle.deeds.at(-1);
 assert.deepEqual(deed.effects.map(e=>[e.kind,e.delta]),[['relation',-1],['cityReputation',-1]]);
 const r=applyAftermath(sim,null),rumor=r.echoes.find(e=>e.template==='rumor_spread');
 assert.equal(rumor.effects[0].delta,-1);assert.equal(rumor.effects[0].observer,'gate_relief');
 assert.equal(r.echoes.find(e=>e.template==='grudge').effects.length,0);
 const state=JSON.stringify([s.people,s.repute,s.deck.echoes]);applyAftermath(sim,null);
 assert.equal(JSON.stringify([s.people,s.repute,s.deck.echoes]),state);
});

test('same cause shares one entry; pending recipients and private dialogue never enter HTML',()=>{
 const {sim,s}=fixture();checkDisguise(sim,'gate_guard');applyAftermath(sim,null);
 const rumor=s.deck.echoes.find(e=>e.template==='rumor_spread');rumor.line='周伍长的隐秘台词';rumor.reason='仅调试理由';
 const html=ledgerHTML(s,esc);
 assert.equal((html.match(/class="jh-echo-group"/g)||[]).length,1);
 assert.match(html,/韩校尉记住/);assert.match(html,/听闻者对你的好感 −2/);
 assert.match(html,/你在临溪镇的声望 −2/);assert.match(html,/可能后续/);
 assert.doesNotMatch(html,/周伍长|gate_relief|隐秘台词|仅调试理由|有人记下了这笔账|jh-back/);
});

test('delivery reveals the recipient once; answering keeps the consequence and records the actual repair',()=>{
 const {sim,s}=fixture();checkDisguise(sim,'gate_guard');applyAftermath(sim,null);
 const e=s.deck.echoes.find(e=>e.template==='rumor_spread');
 commitDeal(sim,{card:'echo',echo:e,urgent:true,skipped:[]},e.who);
 assert.match(ledgerHTML(s,esc),/周伍长听韩校尉/);
 const n=s.people[e.who];n.relation=99;n.awareness=null;n.fear=0;n.life={activity:'idle'};
 const result=answerEcho(sim,e.id,'apologize');assert.equal(result.delta,1);
 assert.equal(s.chronicle.deeds.at(-1).effects[0].delta,1);
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));const html=ledgerHTML(restored.s,esc);
 assert.match(html,/周伍长对你的好感 −2/);assert.match(html,/周伍长对你的好感 \+1/);
 assert.match(html,/已回应 · 态度有所缓和/);assert.equal(echoView(s,e).future,null);
 assert.equal((html.match(/class="jh-echo-group"/g)||[]).length,1);
 assert.ok(answerEcho(sim,e.id,'apologize').error);
});

test('legacy entries never reconstruct old losses or mutate the save while viewed',()=>{
 const {sim,s}=fixture();checkDisguise(sim,'gate_guard');applyAftermath(sim,null);
 delete s.chronicle.deeds.at(-1).effects;for(const e of s.deck.echoes)delete e.effects;
 const before=JSON.stringify(s);const html=ledgerHTML(s,esc);ledgerHTML(s,esc,true);
 assert.match(html,/旧记录未留/);assert.doesNotMatch(html,/−2|\+2/);
 assert.equal(JSON.stringify(s),before);
});

test('borrowed identity, actual observer and local reputation remain independently labelled',()=>{
 const {s}=fixture();appearanceState(s).relations['gate_relief:gate_merchant']=-7;
 const effects=[{kind:'relation',observer:'gate_relief',subject:'gate_merchant',delta:-2},{kind:'cityReputation',subject:'gate_merchant',city:'linxi',delta:-2},{kind:'scrutiny',subject:'gate_merchant',observer:'gate_relief'}];
 const e={id:17,cause:3,template:'rumor_spread',causeTitle:'伸手取物',who:'gate_relief',teller:'gate_guard',subject:'gate_merchant',effects};
 const html=echoGroupHTML(s,[e],esc);
 assert.match(html,/听闻者对赵成的好感 −2/);assert.match(html,/赵成在临溪镇的声望 −2/);
 assert.match(html,/以当时面貌相见/);assert.doesNotMatch(html,/对你的好感|周伍长|gate_relief/);
 delete s.facts.knownNames.gate_merchant;s.people.gate_merchant.metPlayer=false;delete s.appearance.faces.gate_merchant;
 assert.doesNotMatch(echoGroupHTML(s,[e],esc),/赵成|gate_merchant/);
});

test('zero changes, source pruning, escape handling and optional night context are safe',()=>{
 const {s}=fixture();assert.equal(effectsHTML(s,[{kind:'relation',observer:'gate_guard',delta:0}],esc),'');
 const e={id:5,cause:888,template:'grudge',who:'gate_guard',subject:'player',causeTitle:'<账>',line:'<台词>',delivered:true,effects:[]};
 const html=echoGroupHTML(s,[e],esc);assert.doesNotMatch(html,/href=|<账>|<台词>/);assert.match(html,/&lt;账>/);
 assert.doesNotMatch(echoGroupHTML(undefined,[{...e,delivered:false}],esc,{link:false}),/韩校尉|<台词>/);
});
