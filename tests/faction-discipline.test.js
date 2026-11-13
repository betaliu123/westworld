import {giveItem} from '../src/npc-actions.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {recordFactionPressure,pendingFactionReport,deliverFactionReport,factionStanding,factionAuthority,factionJoinBlock} from '../src/faction-discipline.js';
import {contactOptions,contactResolve,contactFollowups,contactPreview} from '../src/gate-society.js';
import {chapterOptions,chapterResolve,chapterPreview,restingPlace} from '../src/chapter.js';
import {careerOptions,careerResolve} from '../src/faction-career.js';
import {knownOrganization} from '../src/factions.js';
import {cityRep,factionRep} from '../src/reputation.js';
import {appearanceTime} from '../src/appearance.js';

function setup(faction='court',saved=newArrival()){
 const sim=new Simulation(saved,()=>{throw new Error('Discipline testimony must not secretly roll.');}),eco=new Ecosystem(sim,[]);
 sim.s.facts.career??=faction;sim.s.facts.enteredCity=true;sim.s.factions??={};sim.s.factions[faction==='court'?'六扇门':'赤砂帮']??=20;
 const leader=faction==='court'?'inspector':'gang_boss';sim.s.player.x=0;sim.s.player.z=0;eco.positions={tea_host:{x:20,z:0},[leader]:{x:0,z:1}};
 return {sim,eco,leader};
}
function pressure(ctx,cause='one',more={}){return recordFactionPressure(ctx.sim,{cause,npc:'tea_host',subject:'player',faction:ctx.sim.s.facts.career||'court',line:'我在门里当差，这件事就别再追究了。',...more});}
function deliver(ctx,r){ctx.eco.positions[r.npc]={x:1,z:1};return deliverFactionReport(ctx.sim,r.id,ctx.leader,ctx.eco.positions,ctx.eco.obstacles||[]);}
function answer(ctx,r,response='admit'){
 const opening=contactOptions(ctx.sim,ctx.leader).find(a=>a.id===`fd_${r.id}_review`);
 if(opening){const review=contactResolve(ctx.sim,ctx.eco,ctx.leader,opening.id);assert.ok(review.success);assert.equal(contactFollowups(ctx.sim,ctx.leader,review).length,3);}
 return contactResolve(ctx.sim,ctx.eco,ctx.leader,`fd_${r.id}_${response}`);
}

test('showing an ordinary valid identity has no discipline record; repeated pressure cause is frozen and deduplicated',()=>{
 const c=setup();contactOptions(c.sim,c.leader);assert.equal(c.sim.s.factionDiscipline,undefined);assert.equal(factionAuthority(c.sim.s,'court'),true);
 const r=pressure(c);assert.equal(pressure(c),r);assert.equal(c.sim.s.factionDiscipline.reports.length,1);assert.equal(r.status,'pending');assert.equal(factionStanding(c.sim.s,'court').count,0);
 assert.equal(pendingFactionReport(c.sim.s,'tea_host').id,r.id);assert.equal(deliver(c,r).delivered,true);assert.equal(deliver(c,r).alreadyDelivered,true);assert.equal(factionStanding(c.sim.s,'court').count,0);
});

test('report cannot be delivered remotely, through a wall, asleep, dead, restrained or during danger',()=>{
 const c=setup(),r=pressure(c),s=c.sim.s;
 assert.ok(deliverFactionReport(c.sim,r.id,c.leader,c.eco.positions).error);
 c.eco.positions.tea_host={x:0,z:3};c.eco.obstacles=[{x:0,z:2,w:5,d:.2}];assert.ok(deliverFactionReport(c.sim,r.id,c.leader,c.eco.positions,c.eco.obstacles).error);
 c.eco.obstacles=[];
 for(const [id,field,value]of [['tea_host','stunnedUntil',20],[c.leader,'hp',0],[c.leader,'muteUntil',20],['tea_host','life',{activity:'sleep'}],[c.leader,'awareness',{state:'fight'}]]){
  const old=s.people[id][field];s.people[id][field]=value;assert.equal(pendingFactionReport(s,'tea_host'),null);assert.ok(deliver(c,r).error);s.people[id][field]=old;
 }
 assert.ok(deliverFactionReport(c.sim,r.id,'gang_boss',c.eco.positions).error);assert.equal(deliver(c,r).delivered,true);
});

test('one report invites an immediate three-choice inquiry; explanation or deferral does not establish guilt',()=>{
 const c=setup(),ledger=c.eco.s.items.find(i=>i.type==='ledger');c.eco.transfer(ledger,'player');assert.ok(!giveItem(c.sim,c.eco,c.leader,ledger.id).error);const r=pressure(c);deliver(c,r);const base=cityRep(c.sim.s),rep=factionRep(c.sim.s,'court');
 assert.ok(contactOptions(c.sim,c.leader).some(a=>a.id==='ch_ledger_depart'));
 const explained=answer(c,r,'explain');assert.equal(explained.roll,null);assert.equal(explained.presentation,'dialogue');assert.equal(r.status,'disputed');assert.equal(factionStanding(c.sim.s,'court').count,0);assert.equal(contactFollowups(c.sim,c.leader,explained).length,3);
 assert.equal(answer(c,r,'later').disciplinePhase,'deferred');assert.ok(contactOptions(c.sim,c.leader).some(a=>a.id.endsWith('_review')));assert.ok(contactOptions(c.sim,c.leader).some(a=>a.id==='ch_ledger_depart'));assert.equal(cityRep(c.sim.s),base);assert.equal(factionRep(c.sim.s,'court'),rep);
 const admitted=answer(c,r);assert.equal(admitted.disciplinePhase,'settled');assert.equal(factionStanding(c.sim.s,'court').status,'warned');assert.equal(factionAuthority(c.sim.s,'court'),true);assert.equal(cityRep(c.sim.s),base);assert.equal(factionRep(c.sim.s,'court'),rep-3);
 assert.ok(answer(c,r).error);assert.equal(factionStanding(c.sim.s,'court').count,1);
});

test('independent confirmed incidents restrict then expel; badge remains physical, skills remain, chapter and career re-enrolment are blocked',()=>{
 const c=setup(),s=c.sim.s,badge=c.eco.create('六扇门腰牌','personal','player',{badge:'court'}),skills=JSON.stringify(s.player.skills);
 s.facts.warrants={thief:{issuer:'inspector'}};s.facts.courtTokenPresented=true;s.facts.ledgerDelivered=true;
 const reports=['one','two','three'].map(cause=>pressure(c,cause));
 for(let i=0;i<reports.length;i++){
  deliver(c,reports[i]);answer(c,reports[i]);assert.equal(factionStanding(s,'court').count,i+1);
  if(i===1){assert.equal(s.facts.career,'court');assert.equal(factionAuthority(s,'court'),false);assert.ok(!careerOptions(c.sim,'thief').some(a=>a.id==='court_arrest'));assert.ok(careerResolve(c.sim,c.eco,'thief','court_arrest').error);assert.ok(!chapterOptions(c.sim,'inspector').some(a=>a.id==='ch_court_end'));assert.ok(chapterPreview(c.sim,'inspector',{id:'ch_court_end'}).blocked);}
 }
 assert.equal(factionStanding(s,'court').status,'expelled');assert.equal(s.facts.career,undefined);assert.equal(badge.location,'player');assert.equal(badge.badgeRevoked,true);assert.equal(JSON.stringify(s.player.skills),skills);assert.ok(factionJoinBlock(s,'court'));
 assert.ok(!chapterOptions(c.sim,'inspector').some(a=>a.id==='ch_court_join'));assert.ok(chapterResolve(c.sim,c.eco,'inspector','ch_court_join').error);assert.ok(careerResolve(c.sim,c.eco,'inspector','court_join').error);assert.equal(c.eco.items('player').filter(i=>i.badge==='court').length,1);
 assert.ok(!knownOrganization(c.sim).nodes.some(n=>n.id==='player'));assert.ok(knownOrganization(c.sim).clues.some(c=>c.id==='discipline-court'&&c.text.includes('除名')));
});

test('gang reports use its own leader, standing and reputation and restrict its final assignment',()=>{
 const c=setup('gang'),s=c.sim.s;const before=cityRep(s),court=factionRep(s,'court');
 for(const cause of ['first','second']){const r=pressure(c,cause);assert.equal(r.leader,'gang_boss');deliver(c,r);answer(c,r);}
 assert.equal(factionAuthority(s,'gang'),false);assert.equal(factionStanding(s,'court').count,0);assert.equal(factionRep(s,'court'),court);assert.equal(cityRep(s),before);assert.equal(factionRep(s,'gang'),11);
 assert.equal(knownOrganization(c.sim).nodes.find(n=>n.id==='player').role,'外堂弟子 · 限权');assert.ok(chapterPreview(c.sim,'gang_boss',{id:'ch_gang_end'}).blocked);
 s.player.x=23;s.player.z=-5;assert.equal(restingPlace(s),null);
});

test('unrecognised face attribution remains frozen after removal and never damages player membership',()=>{
 const c=setup(),s=c.sim.s;s.player.face={id:'gate_merchant',serial:1,until:appearanceTime(s)+60};
 const r=pressure(c,'masked',{subject:'gate_merchant'});deliver(c,r);s.player.face=null;
 assert.ok(!contactOptions(c.sim,c.leader).some(a=>a.id.startsWith('fd_')));assert.equal(r.subject,'gate_merchant');assert.equal(factionStanding(s,'court').count,0);
 s.player.face={id:'gate_merchant',serial:2,until:appearanceTime(s)+60};answer(c,r);assert.equal(factionStanding(s,'court','gate_merchant').count,1);assert.equal(factionStanding(s,'court').count,0);assert.equal(s.facts.career,'court');assert.equal(factionRep(s,'court'),20);assert.equal(s.appearance.reputations.gate_merchant.factions.court,-3);
 assert.ok(s.chronicle.deeds.filter(d=>d.cause==='masked').every(d=>d.subject==='gate_merchant'));
});

test('corroboration requires a frozen direct witness who also physically reaches the leader',()=>{
 const c=setup();c.eco.positions.tea_host={x:0,z:1};c.eco.positions.old_constable={x:1,z:0};c.eco.positions.inspector={x:20,z:0};
 const r=pressure(c,'witnessed',{positions:c.eco.positions});assert.deepEqual(r.witnesses,['old_constable']);
 c.eco.positions.inspector={x:0,z:1};c.eco.positions.old_constable={x:20,z:0};deliver(c,r);assert.deepEqual(r.testimony,[]);answer(c,r,'explain');assert.equal(factionStanding(c.sim.s,'court').count,0);
 const second=setup();second.eco.positions.tea_host={x:0,z:1};second.eco.positions.old_constable={x:1,z:0};second.eco.positions.inspector={x:20,z:0};const direct=pressure(second,'corroborated',{positions:second.eco.positions});second.eco.positions.inspector={x:0,z:1};deliver(second,direct);assert.deepEqual(direct.testimony,['old_constable']);answer(second,direct,'explain');assert.equal(factionStanding(second.sim.s,'court').count,1);
});

test('pending and confirmed reports survive save/load; preview is deterministic and no duplicate penalty occurs',()=>{
 const c=setup(),r=pressure(c);deliver(c,r);const loaded=setup('court',JSON.parse(JSON.stringify(c.sim.s)));loaded.eco.positions.tea_host={x:1,z:1};
 const option=contactOptions(loaded.sim,loaded.leader)[0];assert.deepEqual(contactPreview(loaded.sim,loaded.leader,option),{certain:true,chance:100,blocked:false});answer(loaded,r);
 const before=factionRep(loaded.sim.s,'court');const copy=setup('court',JSON.parse(JSON.stringify(loaded.sim.s)));assert.equal(factionStanding(copy.sim.s,'court').count,1);assert.equal(deliver(copy,r).alreadyDelivered,true);assert.ok(answer(copy,r).error);assert.equal(factionRep(copy.sim.s,'court'),before);
});

test('old joined saves remain active and normal unjoined saves retain both entry routes',()=>{
 const c=setup('court',legacyArrival());assert.equal(factionAuthority(c.sim.s,'court'),true);assert.equal(factionStanding(c.sim.s,'court').count,0);
 const sim=new Simulation(newArrival()),eco=new Ecosystem(sim,[]);sim.s.facts.enteredCity=true;sim.s.facts.courtTokenPresented=true;assert.ok(chapterOptions(sim,'inspector').some(a=>a.id==='ch_court_join'));assert.equal(chapterResolve(sim,eco,'inspector','ch_court_join').success,true);assert.ok(chapterResolve(sim,eco,'inspector','ch_court_join').error);assert.equal(eco.items('player').filter(i=>i.badge==='court').length,1);
});

test('several victims reporting the same cause never multiply sanctions; deferring one inquiry exposes the next',()=>{
 const c=setup(),first=pressure(c,'shared'),same=pressure(c,'shared',{npc:'merchant'}),other=pressure(c,'independent');
 for(const r of [first,same,other])deliver(c,r);
 answer(c,first,'later');assert.ok(contactOptions(c.sim,c.leader).some(a=>a.disciplineReport===same.id));answer(c,same);
 assert.equal(first.status,'proven');assert.equal(factionStanding(c.sim.s,'court').count,1);assert.equal(factionRep(c.sim.s,'court'),17);
 answer(c,other);assert.equal(factionStanding(c.sim.s,'court').count,2);
 const late=pressure(c,'shared',{npc:'relay'});deliver(c,late);answer(c,late);assert.equal(late.status,'proven');assert.equal(factionStanding(c.sim.s,'court').count,2);assert.equal(factionRep(c.sim.s,'court'),11);
});

test('a frozen eyewitness can corroborate later, while an unrelated nearby person cannot become a retroactive witness',()=>{
 const c=setup();c.eco.positions.tea_host={x:0,z:1};c.eco.positions.old_constable={x:1,z:0};c.eco.positions.inspector={x:20,z:0};
 const r=pressure(c,'later-proof',{positions:c.eco.positions});c.eco.positions.inspector={x:0,z:1};c.eco.positions.old_constable={x:20,z:0};deliver(c,r);answer(c,r,'explain');
 c.eco.positions.merchant={x:1,z:0};answer(c,r,'explain');assert.equal(factionStanding(c.sim.s,'court').count,0);
 c.eco.positions.old_constable={x:1,z:0};answer(c,r,'explain');assert.equal(factionStanding(c.sim.s,'court').count,1);assert.ok(c.sim.s.chronicle.deeds.some(d=>d.cause==='later-proof'&&d.title.includes('核实')&&d.text.includes('告诫')));
});

test('stale inquiry choices cannot be resolved remotely or while its leader is asleep',()=>{
 const c=setup(),r=pressure(c);deliver(c,r);const a=contactOptions(c.sim,c.leader)[0];c.sim.s.player.x=50;assert.ok(contactResolve(c.sim,c.eco,c.leader,a.id).error);c.sim.s.player.x=0;
 c.sim.s.people[c.leader].life={activity:'sleep'};assert.ok(contactResolve(c.sim,c.eco,c.leader,a.id).error);assert.equal(factionStanding(c.sim.s,'court').count,0);
});

test('sanctions have a finite maximum even when further independent reports were already pending',()=>{
 const c=setup(),reports=['a','b','c','d'].map(cause=>pressure(c,cause));
 for(const r of reports){deliver(c,r);answer(c,r);}
 assert.equal(factionStanding(c.sim.s,'court').count,4);assert.equal(factionStanding(c.sim.s,'court').status,'expelled');assert.equal(factionRep(c.sim.s,'court'),-1);
});
