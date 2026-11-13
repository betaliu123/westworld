import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {detainByOfficer,gateActions,resolveGate} from '../src/gate-scene.js';
import {observeMilestones,finishMilestone,MILESTONE_ART} from '../src/story-milestones.js';
import {beginBedRest,bedRestStep,prisonSleepReady,wakePlayer} from '../src/bed-rest.js';
import {PRISON_BEDS,jailed} from '../src/locations.js';
import {createPrisonRelease} from '../src/prison-release.js';
import {investigationDanger} from '../src/audio-danger.js';
import {worldMix} from '../src/world-audio.js';
import {careerResolve} from '../src/faction-career.js';
import {readFileSync,existsSync} from 'node:fs';

function fixture(){const sim=new Simulation(newArrival());sim.save=()=>{};const eco=new Ecosystem(sim);observeMilestones(sim.s);return {sim,eco};}
function cell(){const f=fixture();detainByOfficer(f.sim,'gate_guard',null,{handledPresentation:true});const b=PRISON_BEDS[1];Object.assign(f.sim.s.player,{x:b.xTarget,z:b.zTarget});f.eco.s.objects[b.id]={id:b.id,hp:180};return {...f,b};}
function sleep(f){assert.equal(beginBedRest(f.sim,f.b.id,{},[],{untilRelease:true}),null);bedRestStep(f.sim,f.eco,.1,{},[]);bedRestStep(f.sim,f.eco,1.9,{},[]);bedRestStep(f.sim,f.eco,1.3,{},[]);}

test('dead cellmate cannot speak or block the bed; real sleep releases once without inventing testimony',()=>{
 const f=cell(),{sim,eco,b}=f,s=sim.s,n=s.people.prisoner,day=s.day,charm=s.player.stats.charm;
 Object.assign(n,{hp:0,x:b.xTarget,z:b.zTarget,awareness:{caseOpen:true,suspect:'player',state:'fight'}});
 assert.deepEqual(gateActions(sim).map(a=>a.id),['g_serve']);assert.ok(resolveGate(sim,sim.event.id,'g_hear').error);
 sleep(f);assert.ok(prisonSleepReady(s));assert.equal(s.day,day);assert.ok(jailed(s));
 const release=createPrisonRelease({getSim:()=>sim});assert.ok(release.begin(sim.event.id,'g_serve'));for(let t=0;t<3;t+=.05)release.update(.05);
 assert.equal(s.day,day+3);assert.ok(!jailed(s));assert.equal(s.player.bedRest,undefined);assert.equal(n.hp,0);assert.equal(s.player.stats.charm,charm);
 assert.ok(!s.facts.taxLedgerLead);assert.ok(!s.player.inventory.some(i=>i.includes('狱友口供')));
 const loaded=new Simulation(JSON.parse(JSON.stringify(s)));loaded.save=()=>{};const resumed=createPrisonRelease({getSim:()=>loaded});resumed.update(4);assert.equal(loaded.s.day,day+3);
});
test('sleep may be interrupted; reload, injury and broken bedding cannot award early release',()=>{
 for(const kind of ['cancel','injury','broken','reload']){const f=cell(),day=f.sim.s.day;sleep(f);
  if(kind==='reload'){const sim=new Simulation(JSON.parse(JSON.stringify(f.sim.s)));assert.ok(prisonSleepReady(sim.s));assert.equal(sim.s.day,day);continue;}
  if(kind==='cancel')wakePlayer(f.sim);
  if(kind==='injury')f.sim.s.player.hp-=1;
  if(kind==='broken')f.eco.s.objects[f.b.id].hp=0;
  bedRestStep(f.sim,f.eco,.1,{},[]);assert.ok(!prisonSleepReady(f.sim.s),kind);assert.ok(jailed(f.sim.s));assert.equal(f.sim.s.day,day);
 }
 const f=cell();assert.equal(beginBedRest(f.sim,f.b.id,{},[]),null);bedRestStep(f.sim,f.eco,2,{},[]);assert.ok(!prisonSleepReady(f.sim.s),'ordinary sleep never serves the sentence');
});
test('nearby conscious attackers block rest, distant and dead incidents do not; range still applies',()=>{
 const {sim,b}=cell(),n=sim.s.people.prisoner;Object.assign(n,{hp:100,x:b.xTarget,z:b.zTarget,awareness:{caseOpen:true,suspect:'player'}});
 assert.match(beginBedRest(sim,b.id,{},[]),/冲突/);n.z+=20;assert.equal(beginBedRest(sim,b.id,{},[]),null);delete sim.s.player.bedRest;
 sim.s.player.z=-17;assert.match(beginBedRest(sim,b.id,{},[]),/床边/);
});
test('new fact milestones queue in order and persist; closing never repeats rewards or old scenes',()=>{
 const {sim,eco}=fixture(),s=sim.s;detainByOfficer(sim,'gate_guard',null,{handledPresentation:true});observeMilestones(s);observeMilestones(s);
 assert.equal(s.storyMilestones.queue.length,1);const arrest=s.storyMilestones.queue[0].key;assert.ok(finishMilestone(s,arrest));assert.ok(!finishMilestone(s,arrest));
 resolveGate(sim,sim.event.id,'g_serve');observeMilestones(s);assert.deepEqual(s.storyMilestones.queue.map(q=>q.kind),['release']);
 s.facts.constableReferral=true;assert.ok(!careerResolve(sim,eco,'inspector','court_join').error);s.facts.princeCommission=true;observeMilestones(s);
 assert.deepEqual(s.storyMilestones.queue.map(q=>q.kind),['release','court','prince']);const loaded=new Simulation(JSON.parse(JSON.stringify(s)));observeMilestones(loaded.s);assert.equal(loaded.s.storyMilestones.queue.length,3);
 const before=JSON.stringify({money:s.player.money,inv:s.ecosystem.items,day:s.day});for(const q of [...s.storyMilestones.queue])finishMilestone(s,q.key);observeMilestones(s);assert.equal(s.storyMilestones.queue.length,0);assert.equal(JSON.stringify({money:s.player.money,inv:s.ecosystem.items,day:s.day}),before);
 delete s.storyMilestones;observeMilestones(s);assert.equal(s.storyMilestones.queue.length,0,'legacy saves baseline historical facts');
});
test('illustrations and generated sound files are local assets with recorded prompts',()=>{
 for(const a of Object.values(MILESTONE_ART))assert.ok(existsSync(new URL('../'+a.image,import.meta.url)));
 assert.doesNotMatch(MILESTONE_ART.prince.title+MILESTONE_ART.prince.text+MILESTONE_ART.prince.alt,/王爷|王府|皇/);
 const manifest=JSON.parse(readFileSync(new URL('../assets/audio/world/manifest.json',import.meta.url)));
 for(const id of ['music-danger','music-prison','recognition']){const a=manifest[id];assert.equal(a.payload.model,'seed-audio-1.0');assert.ok(a.payload.text_prompt);assert.ok(existsSync(new URL('..'+a.src,import.meta.url)));assert.ok(a.seconds>1);}
});
test('tension follows wanted danger areas and distance without revealing hidden cases',()=>{
 const {sim}=fixture(),s=sim.s;s.npcClock=10;s.wanted=1;s.investigations={cases:[{id:1,playerNoticed:true,state:'search',expires:100,place:{x:0,z:0}}]};
 assert.equal(investigationDanger(s,{x:0,z:0}),1);assert.equal(investigationDanger(s,{x:13,z:0}),.5);assert.equal(investigationDanger(s,{x:19,z:0}),0);
 s.investigations.cases[0].playerNoticed=false;assert.equal(investigationDanger(s,{x:0,z:0}),0);s.investigations.cases[0].playerNoticed=true;s.npcClock=101;assert.equal(investigationDanger(s,{x:0,z:0}),0);
 s.npcClock=10;s.wanted=0;assert.equal(investigationDanger(s,{x:0,z:0}),0);s.wanted=1;detainByOfficer(sim,'gate_guard',null,{handledPresentation:true});assert.equal(investigationDanger(s,{x:0,z:0}),0);
 const prison=worldMix({prison:true,danger:1}),danger=worldMix({danger:1});assert.ok(prison['music-prison']>0);for(const id of ['music','music-night','music-danger','night','city','creek'])assert.equal(prison[id],0,id);assert.ok(danger['music-danger']>0);assert.equal(danger.music,0);assert.ok(worldMix({prison:true,voice:true})['music-prison']<prison['music-prison']);assert.equal(worldMix({prison:true,performing:true})['music-prison'],0);
});
