import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {startComplaint} from '../src/complaints.js';
import {recordDeed,echoOptions,applyAftermath} from '../src/event-deck.js';
import {appearanceTime} from '../src/appearance.js';
import {recordFactionPressure} from '../src/faction-discipline.js';

function setup(){
 const sim=new Simulation(newArrival(),()=>.99);sim.save=()=>{};new Ecosystem(sim);const s=sim.s;
 s.player.face={id:'gate_merchant',serial:5,until:appearanceTime(s)+100};
 s.people.scribe.awareness={home:{x:0,z:0},caseOpen:true};
 return {sim,s};
}
function incident(ids={scribe:'gate_merchant'}){return {type:'theft',owner:'scribe',target:'scribe',x:0,z:0,witnesses:Object.keys(ids),identities:ids};}
function notify(sim,event){return recordDeed(sim,'actionWitnessed',{cause:event.cause,identities:event.identities,witnesses:event.witnesses,text:'现场目击伸手取物',dialogue:[{id:'scribe',text:'你拿了什么？'}]});}

test('masked complaint and its world witness notification share one cause through unmasking and overnight aftermath',()=>{
 const {sim,s}=setup(),event=incident();assert.equal(startComplaint(sim,event),true);
 const deed=s.chronicle.deeds[0];assert.equal(event.cause,deed.id);assert.equal(s.complaint.cause,deed.id);assert.equal(deed.subject,'gate_merchant');assert.deepEqual(deed.identities,{scribe:'gate_merchant'});
 assert.equal(notify(sim,event),deed);assert.equal(notify(sim,event),deed);assert.equal(s.chronicle.deeds.filter(d=>d.valence==='crime').length,1);
 s.player.face=null;const relations=Object.fromEntries(Object.entries(s.people).map(([id,n])=>[id,n.relation]));
 const candidates=echoOptions(s);assert.ok(candidates.length);assert.ok(candidates.every(e=>e.subject==='gate_merchant'&&e.cause===deed.id));assert.equal(candidates.filter(e=>e.template==='grudge'&&e.who==='scribe').length,1);
 const made=applyAftermath(sim,null).echoes;assert.ok(made.length);assert.ok(made.every(e=>e.subject==='gate_merchant'));assert.equal(new Set(made.map(e=>[e.template,e.cause,e.who].join(':'))).size,made.length);
 for(const [id,relation]of Object.entries(relations))assert.equal(s.people[id].relation,relation);
 assert.ok(Object.keys(s.appearance.relations).some(k=>k.endsWith(':gate_merchant')));
 assert.equal(applyAftermath(sim,null).echoes.length,0);
});

test('each witness keeps their own identification, including one who had already recognised the player',()=>{
 const {sim,s}=setup(),event=incident({scribe:'gate_merchant',gate_guard:'player'});startComplaint(sim,event);const deed=notify(sim,event);
 s.player.face=null;const grudges=echoOptions(s).filter(e=>e.template==='grudge');
 assert.equal(grudges.find(e=>e.who==='scribe').subject,'gate_merchant');assert.equal(grudges.find(e=>e.who==='gate_guard').subject,'player');assert.equal(s.chronicle.deeds.length,1);
 // Later notification data cannot rewrite the earlier perception, nor alias the stored map.
 event.identities.scribe='player';notify(sim,event);assert.equal(deed.identities.scribe,'gate_merchant');
 const loaded=new Simulation(JSON.parse(JSON.stringify(s)));loaded.save=()=>{};notify(loaded,event);assert.equal(loaded.s.chronicle.deeds.length,1);assert.equal(loaded.s.chronicle.deeds[0].identities.scribe,'gate_merchant');
});

test('a subject-only pressure deed retains its frozen actor when used for crime aftermath',()=>{
 const {sim,s}=setup();s.facts.career='court';recordFactionPressure(sim,{cause:'old-event',npc:'scribe',subject:'gate_merchant',faction:'court',line:'你还要借这件事纠缠？'});s.player.face=null;
 const candidates=echoOptions(s);assert.ok(candidates.length);assert.ok(candidates.every(e=>e.subject==='gate_merchant'));
});

test('independent incidents keep separate causes while a witness notification without a complaint is still recorded',()=>{
 const {sim,s}=setup(),first=incident();startComplaint(sim,first);notify(sim,first);s.complaint=null;s.people.scribe.complaintUntil=0;
 const second=incident();startComplaint(sim,second);notify(sim,second);assert.notEqual(first.cause,second.cause);assert.equal(s.chronicle.deeds.length,2);
 const standalone=recordDeed(sim,'actionWitnessed',{identities:{gate_guard:'gate_merchant'},witnesses:['gate_guard'],text:'韩校尉目击破坏物件'});assert.ok(standalone);assert.equal(s.chronicle.deeds.length,3);assert.equal(standalone.identities.gate_guard,'gate_merchant');
});
