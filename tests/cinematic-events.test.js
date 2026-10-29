import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newGame} from '../src/simulation.js';
import {StreetStories,STREET_TEMPLATES} from '../src/street-stories.js';
import {STREET_FOLLOWUPS} from '../src/street-followups.js';
import {CONTINUATIONS} from '../src/scene-continuations.js';
import {dialogueLines,shotPlan} from '../src/dialogue.js';
for(const type of Object.keys(STREET_FOLLOWUPS))for(const rng of [0,.999])test(`${type}: success/failure ${rng} continues, saves, recovers, settles once`,()=>{
 const sim=new Simulation(newGame(),()=>rng),d=new StreetStories(sim);d.start(type);const id=d.active.id,t=STREET_TEMPLATES[type];sim.s.player.x=t.point[0];sim.s.player.z=t.point[1];assert.ok(d.options().length<=3);
 const r=d.resolve(id,d.options()[0].id);assert.equal(r.ongoing,true);assert.ok(r.dialogue.length>=2);assert.equal(d.s.pending.length,0);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)),()=>rng),next=new StreetStories(restored);assert.equal(next.active.followup,true);assert.equal(next.options().length,3);
 const money=restored.s.player.money;const cost=next.options()[1].cost;const final=next.resolve(id,'resolve_aid');assert.equal(final.error,undefined);assert.equal(next.active,null);assert.ok(restored.s.player.inventory.includes(STREET_FOLLOWUPS[type].reward));assert.equal(restored.s.player.money,money-cost);const after=JSON.stringify(restored.s.player);assert.ok(next.resolve(id,'resolve_aid').error);assert.equal(JSON.stringify(restored.s.player),after);
});
for(const type of Object.keys(CONTINUATIONS))for(const rng of [0,.999])test(`${type}: authored conversation preserves a second decision after roll ${rng}`,()=>{
 const state=newGame();state.event={id:2,type,depth:1,status:'active'};const sim=new Simulation(state,()=>rng);const first=sim.resolve(2,'c_ask');assert.equal(first.ongoing,true);assert.equal(sim.s.pending,null);assert.equal(sim.actions().length,3);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)),()=>rng);assert.equal(restored.actions()[0].id,'c_agree');const r=restored.resolve(2,'c_agree');assert.equal(r.ongoing,false);assert.equal(restored.event,null);const before=JSON.stringify(restored.s.player);assert.ok(restored.resolve(2,'c_agree').error);assert.equal(JSON.stringify(restored.s.player),before);
});
test('dialogue sentence split preserves speaker and ordered punctuation',()=>{const lines=dialogueLines([{id:'su',text:'先听我说。还没有答应！为什么要今天？',shot:'two'}]);assert.equal(lines.length,3);assert.equal(lines.map(l=>l.text).join(''),'先听我说。还没有答应！为什么要今天？');assert.ok(lines.every(l=>l.id==='su'&&l.shot==='two'));});
test('camera templates differ in position, framing and field of view with finite coincident fallback',()=>{const a={x:0,z:0},b={x:0,z:3},shots=['close','two','shoulder'].map(t=>shotPlan(a,b,t));assert.equal(new Set(shots.map(s=>JSON.stringify(s.position))).size,3);assert.equal(new Set(shots.map(s=>s.fov)).size,3);for(const s of [shotPlan(a,a),shotPlan(a,b,'two',.5)])assert.ok(Object.values(s.position).every(Number.isFinite));assert.ok(shotPlan(a,b,'two',.5).position.z>shots[1].position.z);});
test('violent interruption still overrides a continuation and cannot award negotiation rewards',()=>{const s=newGame();s.event={id:2,type:'banquet',depth:1,status:'active'};const sim=new Simulation(s,()=>0);const r=sim.resolve(2,'disrupt','出手攻击当事人');assert.equal(r.kind,'disrupt');assert.equal(sim.event,null);assert.ok(sim.s.wanted>0);});
