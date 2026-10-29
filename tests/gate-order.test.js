import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {clothesActions,takeClothes} from '../src/clothes-interaction.js';
import {visitGate,gateView} from '../src/gate-scene.js';
const move=(s,x,z)=>Object.assign(s.s.player,{x,z});
for(const first of ['clothes','information'])test(`clothes and information commute: ${first} first`,()=>{
 let s=new Simulation(newArrival(),()=>0);
 const brief=()=>{move(s,-7,24);visitGate(s,'relay');assert.equal(s.resolve(s.event.id,'g_brief').error,undefined);};
 if(first==='information')brief();
 move(s,-11,25.5);assert.ok(clothesActions(s).some(a=>a.id==='g_lift'));assert.equal(takeClothes(s,'g_lift').success,true);
 if(first==='clothes'){assert.equal(!!s.event.gate?.facts.dispatchKnown,false);move(s,0,24);visitGate(s,'gate_guard');const blind=s.preview(s.actions().find(a=>a.id==='g_order')).chance;brief();assert.ok(!s.actions().some(a=>a.id==='g_clothes'));assert.match(gateView(s).line,/衣服/);move(s,0,24);visitGate(s,'gate_guard');assert.ok(s.preview(s.actions().find(a=>a.id==='g_order')).chance>blind);}
 s=new Simulation(JSON.parse(JSON.stringify(s.s)),()=>0);move(s,-11,25.5);assert.deepEqual(clothesActions(s),[]);assert.ok(takeClothes(s,'g_lift').error);move(s,0,24);visitGate(s,'gate_guard');assert.equal(s.resolve(s.event.id,'g_order').success,true);assert.equal(s.s.facts.entryRoute,'uniform');assert.equal(s.s.player.inventory.filter(x=>x==='旧差役服').length,1);assert.equal(s.s.player.money,14);
});
test('walking to clothing or tea does not manufacture dispatch knowledge',()=>{const s=new Simulation(newArrival(),()=>0);move(s,-11,25.5);visitGate(s,'runner-clothes');assert.equal(!!s.event.gate?.facts.dispatchKnown,false);move(s,-7,24);visitGate(s,'relay');assert.equal(!!s.event.gate?.facts.dispatchKnown,false);});
