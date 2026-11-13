import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {detainByOfficer,resolveGate} from '../src/gate-scene.js';
import {recordDeed,chronicle,echoOptions} from '../src/event-deck.js';
import {createPrisonRelease} from '../src/prison-release.js';
import {runAftermath,requestAftermath,pendingPrisonAftermath} from '../src/aftermath-runner.js';
import {ledgerHTML} from '../src/jianghu-ui.js';
import {jailed,PRISON} from '../src/locations.js';

function jail(){
 const sim=new Simulation(newArrival());sim.save=()=>{};
 sim.listeners.push((type,data)=>{if(['result','entry','actionWitnessed'].includes(type))recordDeed(sim,type,data);});
 recordDeed(sim,'actionWitnessed',{incidentType:'assault',text:'守卫亲眼见到关前伤人。',target:'gate_guard',witnesses:['gate_guard'],identities:{gate_guard:'player'}});
 detainByOfficer(sim,'gate_guard',null,{handledPresentation:true});return sim;
}
const answer={ai:{echoes:[],diary:['关前起了冲突。','牢中静候三日。','刑满重回街头。']},status:'ok'};
function advance(view,time){for(let t=0;t<time;t+=.02)view.update(.02);}

test('release advances three chapter days, delivers real due followups and schedules one inference batch',()=>{
 const sim=jail(),s=sim.s,day=s.day,clock=s.time,events=[];
 s.storyFollowups=[1,2,3].map(n=>({id:'tea_host',key:'test-'+n,due:day+n,delta:1,line:'旧日的事，记着。'}));
 sim.listeners.push(type=>events.push(type));const r=resolveGate(sim,sim.event.id,'g_serve');
 assert.ok(!r.error);assert.equal(s.day,day+3);assert.equal(s.time,clock);assert.equal(s.mail.filter(m=>m.id.startsWith('follow-test')).length,3);
 assert.equal(events.filter(e=>e==='day').length,0);assert.equal(events.filter(e=>e==='timePassed').length,1);
 assert.deepEqual([s.chronicle.pendingAftermath.fromDay,s.chronicle.pendingAftermath.toDay],[day,day+3]);
 assert.ok(resolveGate(sim,r.eventId,'g_serve').error);assert.equal(s.day,day+3);
});
test('the opaque midpoint releases once; repeated clicks/skip and reload never repeat sentence or rewards',()=>{
 let sim=jail();const oldDay=sim.s.day,charm=sim.s.player.stats.charm,frames=[];
 const options={getSim:()=>sim,onFrame:(opacity,subtitle)=>frames.push({opacity,subtitle,day:sim.s.day})};
 let view=createPrisonRelease(options);resolveGate(sim,sim.event.id,'g_hear');
 assert.ok(view.begin(sim.event.id,'g_record'));assert.equal(view.begin(sim.event.id,'g_record'),false);advance(view,.2);assert.ok(jailed(sim.s));assert.equal(sim.s.day,oldDay);
 sim=new Simulation(JSON.parse(JSON.stringify(sim.s)));sim.save=()=>{};view=createPrisonRelease(options);advance(view,.4);
 assert.equal(sim.s.day,oldDay+3);assert.equal(sim.s.player.x,PRISON.release.x);assert.ok(frames.some(f=>f.opacity===1&&f.day===oldDay));
 view.skip();advance(view,1);assert.equal(view.active,false);assert.equal(sim.s.prisonPassage,undefined);assert.equal(sim.s.player.stats.charm,charm);
 assert.equal(sim.s.player.inventory.filter(i=>i==='狱友口供：东街副账').length,1);
 const releasedDay=sim.s.day;sim=new Simulation(JSON.parse(JSON.stringify(sim.s)));view=createPrisonRelease(options);advance(view,3);assert.equal(sim.s.day,releasedDay);
});
test('prison inference makes a real request contract, applies valid model output, and distinguishes fallback',async()=>{
 for(const status of ['ok','offline','timeout','invalid']){
  const sim=jail();resolveGate(sim,sim.event.id,'g_serve');let calls=0,payload;
  const request=async ctx=>{calls++;payload=ctx;return status==='ok'?answer:status==='invalid'?{ai:{diary:['']},status:'ok'}:{ai:null,status};};
  const result=await runAftermath(sim,{request});assert.equal(calls,1);assert.equal(payload.mode,'aftermath');assert.equal(payload.elapsed.days,3);assert.ok(payload.deeds.length);
  assert.equal(result.after.diary.inference.status,status==='ok'?'ai':status);assert.equal(result.after.diary.ai,status==='ok');assert.equal(sim.s.chronicle.pendingAftermath,undefined);
  const daily=ledgerHTML(sim.s,String),debug=ledgerHTML(sim.s,String,true);assert.ok(!daily.includes('本地规则'));assert.ok(!daily.includes('AI 已推演'));assert.ok(debug.includes(status==='ok'?'AI 已推演':'本地规则'));
 }
});
test('overlapping night/day/prison callers cannot double settle the same cause',async()=>{
 const sim=jail();resolveGate(sim,sim.event.id,'g_serve');let calls=0,complete;
 const request=()=>{calls++;return new Promise(resolve=>complete=resolve);};
 const first=runAftermath(sim,{request}),second=runAftermath(sim,{request});await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
 complete(answer);await Promise.all([first,second]);assert.equal(calls,1);assert.equal(sim.s.chronicle.diaries.length,1);
 const keys=sim.s.deck.echoes.map(e=>e.key);assert.equal(keys.length,new Set(keys).size);
});
test('a resumed pending or legacy release infers once without advancing the date or changing custody cost',async()=>{
 const original=jail();resolveGate(original,original.event.id,'g_serve');
 for(const legacy of [false,true]){
  const sim=new Simulation(JSON.parse(JSON.stringify(original.s)));sim.save=()=>{};const day=sim.s.day,charm=sim.s.player.stats.charm;
  if(legacy)delete sim.s.chronicle.pendingAftermath;
  assert.ok(pendingPrisonAftermath(sim.s));await runAftermath(sim,{request:async()=>answer});assert.equal(pendingPrisonAftermath(sim.s),null);assert.equal(sim.s.day,day);assert.equal(sim.s.player.stats.charm,charm);
 }
});
test('model responses keep their original option indexes when a candidate becomes invalid',async()=>{
 const sim=jail(),options=echoOptions(sim.s);assert.ok(options.length>1);
 const first=options[0],wanted=options.find(o=>o.who!==first.who);assert.ok(wanted);const i=options.indexOf(wanted);
 const result=await runAftermath(sim,{request:async()=>{sim.s.people[first.who].hp=0;return {status:'ok',ai:{diary:['关前风波未平。'],echoes:[{i,line:'那天的事，我还记着。'}]}};}});
 assert.equal(result.after.echoes[0].key,wanted.key);
});
test('network adapter really posts context and reports offline/timeout without pretending AI success',async()=>{
 const context={mode:'aftermath',deeds:[{id:1}],options:[]};let seen;
 const ok=await requestAftermath(context,{fetchImpl:async(url,init)=>{seen={url,...init};return {ok:true,json:async()=>answer.ai};}});
 assert.equal(seen.url,'/api/director');assert.equal(seen.method,'POST');assert.deepEqual(JSON.parse(seen.body),context);assert.equal(ok.status,'ok');
 assert.equal((await requestAftermath(context,{fetchImpl:async()=>({ok:false,status:503})})).status,'offline');
 assert.equal((await requestAftermath(context,{fetchImpl:async()=>{throw Object.assign(Error(),{name:'TimeoutError'});}})).status,'timeout');
});
