import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {startComplaint,complaintChoices,answerComplaint} from '../src/complaints.js';
import {contextualResponses,flattenResponses,commonAcquaintance} from '../src/contextual-responses.js';
import {chooseResponses} from '../src/response-menu.js';
import {echoChoices,answerEcho} from '../src/aftermath-encounters.js';
import {disguiseReplies,disguisePreview,checkDisguise,appearanceTime} from '../src/appearance.js';

function setup({id='scribe',type='theft',roll=0}={}){
 const sim=new Simulation(newArrival(),()=>roll);sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim);
 Object.assign(s.player,{x:0,z:0});Object.assign(s.people[id],{hp:60,relation:0,trust:0,fear:0,life:{activity:'idle'},awareness:{home:{x:0,z:2},caseOpen:true}});
 startComplaint(sim,{type,owner:id,target:id,x:0,z:0,witnesses:[id]});s.complaint.phase='ask';
 return {sim,s,eco,id,c:s.complaint};
}
const entries=sim=>flattenResponses(complaintChoices(sim));
const ids=sim=>entries(sim).map(e=>e.action.id);

test('low HP replaces generic-first response, previews without rolling, and buys only one finite pause',()=>{
 const {sim,s,c}=setup();s.player.hp=20;const before=s.player.money;sim.rng=()=>{throw Error('browse must not roll');};
 assert.equal(complaintChoices(sim)[0].action.id,'context:low_hp');assert.equal(complaintChoices(sim).length,3);const preview=entries(sim)[0].preview;
 sim.rng=()=> (preview.chance-1)/100;const result=answerComplaint(sim,'context:low_hp');assert.ok(result.success);assert.equal(result.roll,preview.chance);assert.equal(result.check.chance,preview.chance);
 assert.equal(s.complaint,c);assert.equal(c.phase,'pause');assert.equal(c.until,10);assert.equal(s.player.money,before);assert.ok(s.people.scribe.awareness.caseOpen);
 c.phase='ask';assert.ok(!ids(sim).includes('context:low_hp'));s.player.energy=5;assert.ok(!ids(sim).includes('context:tired'));assert.ok(answerComplaint(sim,'context:low_hp').error);
});
test('pending poison is not known illness, and hungry plea applies only to actual food theft',()=>{
 const {sim,s,c,eco}=setup();s.player.pendingPoison={at:100};s.player.satiety=0;
 assert.ok(!ids(sim).includes('context:sick'));assert.ok(!ids(sim).includes('context:hungry'));
 const food=eco.create('干粮','food','npc:scribe',{ownerId:'scribe'});c.itemId=food.id;assert.ok(ids(sim).includes('context:hungry'));
 s.player.sickUntil=30;assert.ok(ids(sim).includes('context:sick'));c.type='damage';assert.ok(!ids(sim).includes('context:hungry'));
});
test('outfit, credential and formal membership do not substitute for each other',()=>{
 const {sim,s,eco}=setup();const outfit=eco.create('差役服','clothing','player',{identityRole:'差役'});s.player.wornOutfit=outfit.id;
 eco.create('捕快腰牌','personal','player',{badge:'court'});assert.ok(ids(sim).includes('context:uniform'));assert.ok(!ids(sim).includes('context:affiliation'));
 s.facts.career='court';assert.ok(ids(sim).includes('context:affiliation'));assert.ok(ids(sim).includes('context:pressure'));
 eco.items('player').find(i=>i.badge==='court').location='ground';assert.ok(!ids(sim).includes('context:affiliation'));
});
test('borrowed face never uses true-player trust, care, friendship, or official authority',()=>{
 const {sim,s,c,eco}=setup();s.people.gate_merchant.metPlayer=true;s.player.face={id:'gate_merchant',serial:4,until:appearanceTime(s)+100};c.subject='gate_merchant';
 s.facts.career='court';eco.create('腰牌','personal','player',{badge:'court'});Object.assign(s.people.scribe,{trust:80,relation:80,receivedCare:true});
 const choices=ids(sim);assert.ok(choices.includes('context:face'));for(const id of ['trust','care','affiliation','pressure'])assert.ok(!choices.includes('context:'+id));
 const before=s.people.scribe.relation;answerComplaint(sim,'context:face');assert.equal(s.people.scribe.relation,before);assert.equal(s.chronicle.deeds.at(-1).subject,'gate_merchant');
});
test('a known face or unseen organization graph is not a known mutual friend',()=>{
 const {s}=setup();s.people.tea_host.metPlayer=true;s.people.tea_host.trust=10;s.people.tea_host.relation=10;s.people.qinghe.knownPeople=['tea_host'];
 assert.equal(commonAcquaintance(s,'qinghe'),null);s.facts.helpedMother=true;assert.equal(commonAcquaintance(s,'qinghe'),'tea_host');
 s.people.tea_host.trust=0;assert.equal(commonAcquaintance(s,'qinghe'),null);
});
test('an unfinished lesson and unrecognized care do not promise a teacher or a favor',()=>{
 const {sim,s}=setup();s.apprenticeships={records:{lesson:{id:'scribe',completed:false}}};assert.ok(!ids(sim).includes('context:student'));
 s.apprenticeships.records.lesson.completed=true;assert.ok(ids(sim).includes('context:student'));
 s.people.scribe.receivedCare=true;s.people.scribe.careSubject='gate_merchant';assert.ok(!ids(sim).includes('context:care'));
 s.apprenticeships.records.lesson.learnerSubject='gate_merchant';assert.ok(!ids(sim).includes('context:student'));
});

test('exposed face cannot keep claiming the borrowed name, and repeated threats are unavailable',()=>{
 const {sim,s,c}=setup({type:'assault'});s.people.gate_merchant.metPlayer=true;s.player.face={id:'gate_merchant',serial:22,until:appearanceTime(s)+100};c.subject='gate_merchant';s.appearance.exposed.scribe=22;
 assert.ok(!ids(sim).includes('context:face'));s.player.face=null;c.subject='player';answerComplaint(sim,'threat');assert.equal(c.phase,'ask');assert.ok(!ids(sim).includes('threat'));
});
test('several bodily excuses yield one highest priority pause, and old pending cases get a stable cause',()=>{
 const {sim,s,c}=setup();s.player.hp=20;s.player.energy=5;s.player.sickUntil=100;s.people.scribe.receivedCare=true;
 const pauses=entries(sim).filter(e=>e.action.response?.effect==='pause');assert.equal(pauses.length,1);assert.equal(pauses[0].action.id,'context:care');
 delete c.cause;delete c.subject;delete c.attempts;c.type='assault';delete c.severe;
 answerComplaint(sim,'pay');assert.ok(c.cause);assert.equal(c.subject,'player');assert.equal(c.phase,'ask');const cause=c.cause;assert.ok(answerComplaint(sim,'pay').error);assert.equal(c.cause,cause);
});
test('return revalidates inventory and clears worn item through the shared transfer path exactly once',()=>{
 const {sim,s,c,eco}=setup();const item=eco.create('旧衣','clothing','npc:scribe',{ownerId:'scribe'});eco.transfer(item,'player','stolen',['scribe']);s.player.wornOutfit=item.id;c.itemId=item.id;c.transferred=true;
 assert.equal(complaintChoices(sim)[0].action.id,'context:return');const before=s.player.money;
 const r=answerComplaint(sim,'context:return',{eco});assert.ok(r.success);assert.equal(item.location,'npc:scribe');assert.equal(s.player.wornOutfit,null);assert.equal(c.returned,true);assert.equal(c.phase,'ask');assert.equal(s.player.money,before);
 assert.ok(answerComplaint(sim,'context:return',{eco}).error);assert.ok(ids(sim).includes('context:returned'));assert.ok(s.itemSettlements[item.id+':scribe']);
});
test('losing the item, moving away or a wall invalidates selection before any dice or transfer',()=>{
 const {sim,s,c,eco}=setup();s.player.hp=20;sim.rng=()=>{throw Error('invalid cannot roll');};
 assert.ok(answerComplaint(sim,'context:low_hp',{positions:{scribe:{x:9,z:0}}}).error);
 assert.ok(answerComplaint(sim,'context:low_hp',{positions:{scribe:{x:0,z:2}},obstacles:[{x:0,z:1,w:2,d:.5}]}).error);
 const i=eco.create('钱袋','purse','npc:scribe',{ownerId:'scribe'});eco.transfer(i,'player','stolen');c.itemId=i.id;eco.transfer(i,'ground');assert.ok(answerComplaint(sim,'context:return',{eco}).error);
 assert.equal(c.phase,'ask');assert.deepEqual(c.attempts,[]);
});
test('injury compensation cannot clear responsibility and a reload cannot collect the same payment again',()=>{
 const {sim,s,c}=setup({type:'assault'});s.player.money=30;s.wanted=3;
 answerComplaint(sim,'pay');assert.equal(s.player.money,18);assert.equal(c.phase,'ask');assert.equal(s.wanted,3);
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.save=()=>{};assert.ok(answerComplaint(restored,'pay').error);assert.equal(restored.s.player.money,18);
});
test('normal affiliation does not create a discipline report; pressure does even when the check fails',()=>{
 for(const action of ['affiliation','pressure']){const {sim,s,eco}=setup({roll:.99});s.facts.career='court';eco.create('腰牌','personal','player',{badge:'court'});
  answerComplaint(sim,'context:'+action);assert.equal(s.factionDiscipline?.reports?.length||0,action==='pressure'?1:0);}
});
test('restricted membership can still be abused with explicit risk but has no ordinary authority',()=>{
 const {sim,s,eco}=setup();s.facts.career='court';eco.create('腰牌','personal','player',{badge:'court'});
 s.factionDiscipline={cases:{a:{faction:'court',subject:'player'},b:{faction:'court',subject:'player'}},reports:[],seq:0};
 assert.ok(!ids(sim).includes('context:affiliation'));const pressure=entries(sim).find(e=>e.action.id==='context:pressure');assert.match(pressure.action.label,/限权/);assert.match(pressure.preview.reason,/除名/);
});
test('special aftermath uses the same shown chance and repairs a cause only once without touching wanted or evidence',()=>{
 const {sim,s}=setup();s.complaint=null;s.people.scribe.awareness=null;s.player.hp=20;s.wanted=3;s.facts.knownEvidence=true;
 const e={id:1,who:'scribe',cause:77,template:'grudge',due:s.day};s.deck={echoes:[e]};const p=flattenResponses(echoChoices(s,e)).find(e=>e.action.id==='context:low_hp');
 const r=answerEcho(sim,1,'context:low_hp',()=> (p.preview.chance-1)/100);assert.ok(r.success);assert.equal(r.delta,2);assert.equal(r.roll,p.preview.chance);assert.equal(s.wanted,3);assert.ok(s.facts.knownEvidence);
 assert.ok(answerEcho(sim,1,'apologize').error);assert.ok(!r.dialogue[0].text.includes('【'));
});
test('aftermath cannot be answered under another identity or by a remote/muted NPC',()=>{
 const {sim,s}=setup();s.complaint=null;s.people.scribe.awareness=null;const e={id:1,who:'scribe',cause:77,template:'grudge',due:s.day,subject:'gate_merchant'};s.deck={echoes:[e]};
 assert.deepEqual(echoChoices(s,e),[]);e.subject='player';assert.ok(answerEcho(sim,1,'apologize',()=>0,{positions:{scribe:{x:99,z:0}}}).error);s.people.scribe.muteUntil=99;assert.deepEqual(echoChoices(s,e),[]);
});
test('body-specific disguise reply uses the same preview at execution and cannot bypass the original owner',()=>{
 const {sim,s}=setup();s.player.face={id:'gate_merchant',serial:8,until:appearanceTime(s)+100};s.people.gate_merchant.metPlayer=true;s.player.hp=20;
 assert.ok(disguiseReplies(s,'gate_guard').some(r=>r.id==='low_hp'));const check=disguisePreview(s,'gate_guard',{force:true,approach:'low_hp'});sim.rng=()=> (check.chance-1)/100;
 const r=checkDisguise(sim,'gate_guard',{approach:'low_hp'});assert.ok(r.success);assert.equal(r.check.chance,check.chance);
 const certain=checkDisguise(sim,'gate_merchant',{approach:'low_hp'});assert.equal(certain.roll,null);assert.equal(certain.success,false);
});
test('stale bodily disguise choice does not secretly roll',()=>{
 const {sim,s}=setup();s.player.face={id:'gate_merchant',serial:8,until:appearanceTime(s)+100};s.player.hp=100;sim.rng=()=>{throw Error('must not roll');};
 assert.ok(checkDisguise(sim,'gate_guard',{approach:'low_hp'}).error);
});
test('navigation uses at most three choices, stays read-only and can return to the first page',()=>{
 const {sim,s}=setup();s.player.hp=20;s.player.energy=10;s.player.money=0;let screen,selected=0,closed=0;
 const before=JSON.stringify(s);chooseResponses({choose:config=>{screen=config;}},{getOptions:()=>complaintChoices(sim),onSelect:()=>selected++,onClose:()=>closed++});
 const first=screen.options.map(e=>e.action.id);assert.ok(screen.options.length<=3);
 screen.onSelect(screen.options.find(e=>e.action.children).action);assert.ok(screen.options.length<=3);assert.ok(screen.onBack);screen.onBack();
 assert.deepEqual(screen.options.map(e=>e.action.id),first);assert.equal(selected,0);assert.equal(closed,0);assert.equal(JSON.stringify(s),before);
 const all=entries(sim);assert.ok(all.some(e=>e.action.id==='pay'));assert.ok(all.some(e=>e.action.id==='report'));assert.ok(all.every(e=>!e.action.response||e.action.label.startsWith('【')));
});
