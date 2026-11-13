import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {clothing,equipAppearance} from '../src/appearance.js';
import {recordCrimeScene,acceptCrimeReport,investigationCanAsk,investigationRisk,investigationReplies,investigationPreview,investigationQuestion,answerInvestigation} from '../src/crime-investigation.js';
import {mountInvestigation} from '../src/investigation-world.js';

function setup(witness=true){
 const sim=new Simulation(newArrival(),()=>.999);sim.save=()=>{};const eco=new Ecosystem(sim),s=sim.s;s.npcClock=10;Object.assign(s.player,{x:0,z:0});
 const c=witness?recordCrimeScene(sim,{type:'theft',target:'merchant',x:0,z:0,witnesses:['merchant'],identities:{merchant:'player'}}):null;
 const scene=acceptCrimeReport(sim,{caseId:c?.id,reporter:'merchant',officer:'guard',place:{x:0,z:0}});scene.state='search';
 const oldCoat=clothing(s),newCoat=eco.create('差役服','clothing','player',{material:'cloth'}),positions={guard:{x:0,z:1}};
 return {sim,s,eco,c:scene,oldCoat,newCoat,positions};
}
const change=({sim,newCoat})=>equipAppearance(sim,newCoat.id,'body');

test('changed clothing offers an evidence-based denial with a real shared preview and roll',()=>{
 const f=setup(),{sim,s,c,positions}=f;const same=investigationPreview(sim,c,'guard','deny').chance;change(f);
 const before=JSON.stringify(s),entries=investigationReplies(sim,c,'guard'),deny=entries.find(e=>e.action.id==='deny');
 assert.match(deny.action.label,/衣着都不同/);assert.ok(!entries.some(e=>e.action.id==='cooperate'));assert.ok(deny.preview.chance>same);assert.match(investigationQuestion(s,c,'guard'),/衣裳.*不同.*面貌/);assert.equal(JSON.stringify(s),before);
 let rolls=0;sim.rng=()=>{rolls++;return 0;};const r=answerInvestigation(sim,c.id,'guard','deny',positions);
 assert.equal(r.check.chance,deny.preview.chance);assert.equal(r.success,true);assert.equal(rolls,1);assert.match(r.dialogue[0].text,/不是我/);assert.match(r.dialogue[1].text,/认错/);assert.equal(c.reports[0].garment,f.oldCoat.name);
});

test('matching clothes cannot claim a mismatch and unheard evidence cannot unlock a denial',()=>{
 const {sim,s,c}=setup();assert.match(investigationReplies(sim,c,'guard')[1].action.label,/不是我/);assert.ok(!investigationRisk(s,c,'guard').coatMismatch);
 assert.equal(investigationReplies(sim,c,'gate_guard')[1].action.id,'cooperate');assert.equal(investigationPreview(sim,c,'gate_guard','deny').modifiers.length,0);
});

test('cooperation is not an escape from accusation and refusal does not erase a failed denial',()=>{
 const f=setup(),{sim,s,c,positions}=f;let rolls=0;sim.rng=()=>{rolls++;return .999;};const wanted=s.wanted,reports=JSON.stringify(c.reports);
 assert.ok(answerInvestigation(sim,c.id,'guard','cooperate',positions).error);assert.equal(rolls,0);
 assert.equal(answerInvestigation(sim,c.id,'guard','deny',positions).success,false);const deadline=c.expires;
 s.npcClock+=61;change(f);const before=investigationRisk(s,c,'guard');assert.ok(before.doubts);
 const r=answerInvestigation(sim,c.id,'guard','leave',positions);assert.equal(r.success,null);assert.equal(r.roll,null);assert.equal(r.check,null);assert.ok(investigationRisk(s,c,'guard').doubts);assert.equal(c.expires,deadline);assert.equal(s.wanted,wanted);assert.equal(JSON.stringify(c.reports),reports);assert.equal(rolls,1);
});

test('cooperation without an accusation is recorded once and never manufactures a successful check',()=>{
 const {sim,s,c,positions}=setup(false);sim.rng=()=>{throw Error('pure cooperation rolled');};
 const r=answerInvestigation(sim,c.id,'guard','cooperate',positions);assert.equal(r.success,null);assert.equal(r.roll,null);assert.equal(r.check,null);
 s.npcClock+=61;assert.ok(!investigationCanAsk(s,c,'guard'));assert.ok(answerInvestigation(sim,c.id,'guard','cooperate',positions).error);
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.save=()=>{};assert.ok(!investigationCanAsk(restored.s,restored.s.investigations.cases[0],'guard'));
});

test('closing/reopening, waiting and swapping back to the same description cannot reroll',()=>{
 const f=setup(),{sim,s,c,positions,oldCoat}=f;let rolls=0;sim.rng=()=>{rolls++;return .999;};
 investigationReplies(sim,c,'guard');investigationReplies(sim,c,'guard');assert.equal(rolls,0);
 answerInvestigation(sim,c.id,'guard','explain',positions);s.npcClock+=61;assert.ok(!investigationCanAsk(s,c,'guard'));
 change(f);assert.ok(investigationCanAsk(s,c,'guard'));answerInvestigation(sim,c.id,'guard','deny',positions);s.npcClock+=61;
 equipAppearance(sim,oldCoat.id,'body');assert.ok(answerInvestigation(sim,c.id,'guard','explain',positions).error);change(f);assert.ok(answerInvestigation(sim,c.id,'guard','deny',positions).error);assert.equal(rolls,2);
});

test('the same disguised face retains doubt and responses across a new makeup serial',()=>{
 const {sim,s,c,positions}=setup();s.player.face={id:'gate_merchant',serial:1,until:99999};answerInvestigation(sim,c.id,'guard','deny',positions);
 s.player.face.serial=2;assert.ok(investigationRisk(s,c,'guard').doubts);assert.ok(!investigationCanAsk(s,c,'guard'));s.npcClock+=61;assert.ok(!investigationCanAsk(s,c,'guard'));
});

test('new testimony received by this officer reopens a response; other officers do not share it',()=>{
 const {sim,s,c,positions}=setup();answerInvestigation(sim,c.id,'guard','leave',positions);s.npcClock+=16;assert.ok(!investigationCanAsk(s,c,'guard'));
 c.reports.push({...c.reports[0],reporter:'thief',officer:'gate_guard'});assert.ok(!investigationCanAsk(s,c,'guard'));
 c.reports.push({...c.reports[0],reporter:'thief',at:s.npcClock});assert.ok(investigationCanAsk(s,c,'guard'));
});

test('old serial-keyed failed checks preserve cooldown and doubt without mutation on preview',()=>{
 const {sim,s,c}=setup();c.checks['guard:player:0']={success:false,until:50,doubtUntil:130};const before=JSON.stringify(s);
 assert.ok(investigationRisk(s,c,'guard').doubts);assert.deepEqual(investigationReplies(sim,c,'guard'),[]);assert.equal(JSON.stringify(s),before);s.npcClock=51;assert.equal(investigationReplies(sim,c,'guard')[1].action.id,'deny');
});

test('dialogue stages denial through the shared check effect and cancels stale clothing choices',()=>{
 const f=setup(),{sim,s,c,positions}=f;change(f);let done,menu,starts=0,reveals=0,rolls=0;sim.rng=()=>{rolls++;return 0;};
 const world={hero:{position:s.player},npcs:new Map([['guard',{actor:{position:positions.guard}}]]),obstacles:[],clearReady(){}},dialogue={play(lines,callback){done=callback;},choose(config){menu=config;}},checkReveal={start(){starts++;},play(){reveals++;},cancel(){}};
 mountInvestigation({getSim:()=>sim,world,dialogue,checkReveal,available:()=>true,close(){},log(){}});
 assert.ok(world.onInvestigation(c,'guard'));done(false);assert.equal(menu.context.id,'guard');assert.match(menu.context.text,/衣裳.*不同/);const deny=menu.options.find(e=>e.action.id==='deny');menu.onSelect(deny.action);assert.equal(starts,1);assert.equal(reveals,1);assert.equal(rolls,1);
 s.npcClock+=61;equipAppearance(sim,f.oldCoat.id,'body');assert.ok(world.onInvestigation(c,'guard'));done(false);change(f);menu.onSelect(menu.options[0].action);assert.equal(rolls,1);
});
