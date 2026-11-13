import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {acceptCrimeReport,investigationAreas,noticeInvestigations,expireInvestigations,answerInvestigation,inInvestigationArea,INVESTIGATION_RADIUS,INVESTIGATION_DURATION} from '../src/crime-investigation.js';
import {drawInvestigationAreas} from '../src/investigation-ui.js';

function setup(){const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};new Ecosystem(sim);const s=sim.s;s.npcClock=10;Object.assign(s.player,{x:0,z:0});const c=acceptCrimeReport(sim,{reporter:'merchant',officer:'guard',place:{x:0,z:0},type:'body'});return {sim,s,c};}
test('only an observed local investigation produces a public marker, without leaking witness or culprit data',()=>{
 const {sim,s,c}=setup(),positions={guard:{x:0,z:2}};const before=JSON.stringify(s);assert.deepEqual(investigationAreas(s),[]);assert.equal(JSON.stringify(s),before);
 noticeInvestigations(sim,positions);assert.deepEqual(investigationAreas(s),[]);c.state='search';
 noticeInvestigations(sim,positions,[{x:0,z:1,w:2,d:.2}]);assert.deepEqual(investigationAreas(s),[]);
 noticeInvestigations(sim,{guard:{x:0,z:20}});assert.deepEqual(investigationAreas(s),[]);
 noticeInvestigations(sim,positions);const [area]=investigationAreas(s);assert.equal(area.seconds,INVESTIGATION_DURATION);assert.equal(area.inside,true);assert.ok(!('reports' in area));assert.ok(!('assigned' in area));assert.ok(!('victim' in area));
 c.state='pursuing';assert.deepEqual(investigationAreas(s),[]);
});
test('the countdown uses the persistent simulation deadline, survives reload and reflects real failed-question extensions',()=>{
 const {sim,s,c}=setup();c.state='search';c.playerNoticed=true;s.npcClock+=65.3;
 const [area]=investigationAreas(s);assert.equal(area.seconds,85);assert.equal(investigationAreas(s)[0].seconds,85);
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.save=()=>{};assert.equal(investigationAreas(restored.s)[0].seconds,85);
 sim.rng=()=>.999;assert.equal(answerInvestigation(sim,c.id,'guard','explain',{guard:{x:0,z:1}}).success,false);assert.equal(investigationAreas(s)[0].seconds,180);
});
test('crossing the actual question boundary retains the known investigation and its deadline',()=>{
 const {s,c}=setup();c.state='search';c.playerNoticed=true;s.player.x=INVESTIGATION_RADIUS-.01;assert.ok(inInvestigationArea(c,s.player));assert.ok(investigationAreas(s)[0].inside);
 s.player.x=INVESTIGATION_RADIUS;assert.ok(!inInvestigationArea(c,s.player));assert.ok(!investigationAreas(s)[0].inside);assert.equal(investigationAreas(s)[0].seconds,150);
});
test('deadline expiry is independent of officer incapacity and cannot be used to roll a stale answer or erase evidence',()=>{
 const {sim,s,c}=setup();c.state='search';c.playerNoticed=true;c.question={id:'guard'};s.people.guard.stunnedUntil=999;s.npcClock=c.expires;const reports=JSON.stringify(c.reports),wanted=s.wanted;
 sim.rng=()=>{throw Error('expired checks must not roll');};assert.ok(answerInvestigation(sim,c.id,'guard','explain',{guard:{x:0,z:1}}).error);assert.deepEqual(investigationAreas(s),[]);
 let saves=0;sim.save=()=>saves++;assert.ok(expireInvestigations(sim));assert.equal(c.state,'closed');assert.equal(c.question,null);assert.equal(JSON.stringify(c.reports),reports);assert.equal(s.wanted,wanted);assert.equal(expireInvestigations(sim),false);assert.equal(saves,1);
});
test('multiple investigations retain their independent circles and the one containing the player takes priority',()=>{
 const {sim,s,c}=setup();c.state='search';c.playerNoticed=true;c.place.x=20;
 const second=acceptCrimeReport(sim,{reporter:'thief',officer:'gate_guard',place:{x:0,z:1}});second.state='search';second.playerNoticed=true;second.expires+=25;
 assert.deepEqual(investigationAreas(s).map(a=>a.id),[second.id,c.id]);s.npcClock=c.expires;expireInvestigations(sim);assert.deepEqual(investigationAreas(s).map(a=>a.id),[second.id]);
});
test('map circle scale matches the gameplay radius and canvas styles are restored',()=>{
 const {s,c}=setup();c.state='search';c.playerNoticed=true;c.place={x:2,z:3};const arcs=[],calls=[];
 const ctx={save(){calls.push('save');},restore(){calls.push('restore');},setLineDash(){},beginPath(){},arc(...args){arcs.push(args);},fill(){},stroke(){},moveTo(){},lineTo(){}};
 drawInvestigationAreas(ctx,investigationAreas(s),'cinnabar');assert.deepEqual(arcs[0].slice(0,3),[87,89.5,INVESTIGATION_RADIUS*2.5]);assert.deepEqual(calls,['save','restore']);
});
test('legacy and untouched saves do not gain an investigation from merely opening the HUD',()=>{
 const s={chapterVersion:2,player:{x:0,z:0}};assert.deepEqual(investigationAreas(s),[]);assert.equal(s.investigations,undefined);
});
