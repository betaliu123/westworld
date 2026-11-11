import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';

function setup(){
 let rolls=0;const sim=new Simulation(newArrival(),()=>{rolls++;return 0;}),eco=new Ecosystem(sim);
 Object.assign(sim.s.player,{crouched:true,stealing:true});eco.positions.su={x:sim.s.player.x,z:sim.s.player.z+1};sim.s.people.su.facing=0;sim.s.people.su.purse=16;
 return {sim,eco,rolls:()=>rolls};
}
test('a novice sees the tied purse requirement; preview and rejection do not roll or spend',()=>{
 const {sim,eco,rolls}=setup(),before=JSON.stringify(sim.s),p=eco.theftPreview('su');
 assert.equal(p.blocked,true);assert.equal(p.chance,null);assert.match(p.reason,/妙手·入门.*粗通/);
 assert.equal(eco.stealNpc('su'),p.reason);assert.equal(rolls(),0);assert.equal(JSON.stringify(sim.s),before);
});
test('learning unlocks the same selected purse and a real attempt uses the preview chance once',()=>{
 const {sim,eco,rolls}=setup(),p=sim.s.player;assert.ok(eco.theftPreview('su').blocked);
 p.skills.theft.tier=2;const preview=eco.theftPreview('su'),checks=[];sim.listeners.push((type,r)=>{if(type==='fieldCheck')checks.push(r);});
 assert.equal(preview.blocked,false);eco.stealNpc('su');assert.equal(rolls(),1);assert.equal(checks[0].chance,preview.chance);
 assert.equal(sim.s.people.su.purse,0);assert.equal(eco.items('player').filter(i=>i.type==='purse'&&i.value===16).length,1);
 assert.ok(eco.theftPreview('su').blocked);assert.ok(eco.stealNpc('su'));assert.equal(rolls(),1);
 const restored=new Ecosystem(new Simulation(JSON.parse(JSON.stringify(sim.s))));assert.ok(restored.theftPreview('su').blocked);
 assert.equal(restored.items('player').filter(i=>i.type==='purse'&&i.value===16).length,1);
});
test('novices can still take exposed possessions; concealed items need the separate higher tier',()=>{
 const {sim,eco}=setup(),food=eco.create('随身干粮','food','npc:su'),hidden=eco.create('袖中小物','personal','npc:su',{concealed:true});
 assert.equal(eco.theftPreview('su',food.id).blocked,false);eco.stealNpc('su',food.id);assert.equal(food.location,'player');
 const p=eco.theftPreview('su',hidden.id);assert.match(p.reason,/妙手·熟练/);assert.equal(eco.stealNpc('su',hidden.id),p.reason);
 sim.s.player.skills.theft.tier=3;assert.equal(eco.theftPreview('su',hidden.id).blocked,false);
});
test('clothing and helpless searches use the same deterministic preview as execution',()=>{
 const {sim,eco,rolls}=setup(),coat=eco.items('npc:su').find(i=>i.type==='clothing');
 assert.match(eco.theftPreview('su',coat.id).reason,/还清醒/);sim.s.people.su.stunnedUntil=100;
 const p=eco.theftPreview('su',coat.id);assert.equal(p.blocked,false);assert.equal(p.certain,true);assert.equal(p.chance,100);
 eco.stealNpc('su',coat.id);assert.equal(coat.location,'player');eco.stealNpc('su');assert.equal(sim.s.people.su.purse,0);assert.equal(rolls(),0);
});
test('confirmation rechecks distance, cover, suspicion and current skill instead of trusting an old preview',()=>{
 const {sim,eco,rolls}=setup();sim.s.player.skills.theft.tier=2;assert.equal(eco.theftPreview('su').blocked,false);
 const origin={...eco.positions.su};eco.positions.su.x+=10;assert.match(eco.theftPreview('su').reason,/距离太远/);assert.equal(eco.stealNpc('su'),eco.theftPreview('su').reason);
 eco.positions.su={x:origin.x+2,z:origin.z};eco.obstacles=[{x:origin.x+1,z:origin.z,w:.5,d:3}];assert.match(eco.theftPreview('su').reason,/遮挡/);assert.equal(eco.stealNpc('su'),eco.theftPreview('su').reason);
 eco.obstacles=[];sim.s.people.su.theftAlertDay=sim.s.day;assert.match(eco.theftPreview('su').reason,/戒心/);assert.equal(eco.stealNpc('su'),eco.theftPreview('su').reason);
 delete sim.s.people.su.theftAlertDay;sim.s.player.skills.theft.tier=1;assert.equal(eco.stealNpc('su'),eco.theftPreview('su').reason);assert.equal(rolls(),0);assert.equal(sim.s.people.su.purse,16);
});
