import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLES} from '../src/data.js';
import {newArrival} from '../src/simulation.js';
import {ABILITY_BALANCE_VERSION} from '../src/ability-check.js';
import {saveKey,loadCurrentSave,obsoleteSavePresent} from '../src/save-state.js';

function storageOf(entries=[]){
 const values=new Map(entries),reads=[];
 return {values,reads,getItem(key){reads.push(key);return values.get(key)??null;},setItem(){assert.fail('save inspection must not write');},removeItem(){assert.fail('save inspection must not remove');}};
}
function currentSave(){return {version:2,chapterVersion:2,balanceVersion:ABILITY_BALANCE_VERSION,player:{money:12,inventory:['kept-item']},people:{qinghe:{relation:7}},facts:{heardLead:true}};}

test('each origin starts with its approved attributes and the same 200 point budget',()=>{
 const expected={wanderer:{might:50,agility:60,charm:40,wit:50},scholar:{might:35,agility:40,charm:65,wit:60},guardian:{might:65,agility:50,charm:40,wit:45}};
 for(const [role,stats] of Object.entries(expected)){
  assert.deepEqual(ROLES[role].stats,stats);
  const state=newArrival(role);
  assert.deepEqual(state.player.stats,stats);
  assert.equal(state.balanceVersion,ABILITY_BALANCE_VERSION);
  assert.equal(Object.values(state.player.stats).reduce((sum,value)=>sum+value,0),200);
  state.player.stats.might=0;
  assert.deepEqual(newArrival(role).player.stats,stats,'new arrivals do not share mutable attributes');
 }
 assert.equal(ROLES.scholar.name,'书香出身');
});

test('new saves use v3 keys with isolated preview and sanitized playtest scopes',()=>{
 assert.equal(saveKey(),'jianghu-echoes-v3');
 assert.equal(saveKey({gatePreview:true}),'jianghu-gate-preview-v3');
 assert.equal(saveKey({playtest:'balance_1-2'}),'jianghu-echoes-v3-playtest-balance_1-2');
 assert.equal(saveKey({gatePreview:true,playtest:' a/b?测_2 '}),'jianghu-gate-preview-v3-playtest-ab_2');
 assert.equal(saveKey({playtest:'a'.repeat(50)}),'jianghu-echoes-v3-playtest-'+'a'.repeat(40));
 assert.notEqual(saveKey({playtest:'测/试'}),saveKey(),'a stripped playtest name never selects the player save');
});

test('loading accepts only current chapter and balance versions with object player and people',()=>{
 const key=saveKey(),valid=currentSave(),storage=storageOf([[key,JSON.stringify(valid)]]);
 assert.deepEqual(loadCurrentSave(storage,key),valid);
 for(const patch of [
  {version:1},{version:'2'},{chapterVersion:1},{chapterVersion:undefined},
  {balanceVersion:undefined},{balanceVersion:ABILITY_BALANCE_VERSION+1},{balanceVersion:String(ABILITY_BALANCE_VERSION)},
  {player:null},{player:[]},{player:'old-player'},{people:undefined},{people:[]},{people:5}
 ]){
  storage.values.set(key,JSON.stringify({...valid,...patch}));
  assert.equal(loadCurrentSave(storage,key),null,JSON.stringify(patch));
 }
 for(const raw of ['{broken','null','[]','42','"save"']){
  storage.values.set(key,raw);assert.equal(loadCurrentSave(storage,key),null,raw);
 }
});

test('old progress remains intact and is never used as a fallback for a new opening',()=>{
 for(const options of [{},{gatePreview:true},{playtest:'balance'},{gatePreview:true,playtest:'balance'}]){
  const key=saveKey(options),oldKeys=[key.replace('-v3','-v1'),key.replace('-v3','-v2')];
  const entries=oldKeys.map(old=>[old,JSON.stringify({...currentSave(),balanceVersion:0,player:{money:999,inventory:['old-reward']},facts:{oldCrime:true}})]);
  const storage=storageOf(entries);
  assert.equal(loadCurrentSave(storage,key),null);
  assert.deepEqual(storage.reads,[key],'load reads only the requested current key');
  assert.equal(obsoleteSavePresent(storage,options),true);
  assert.deepEqual([...storage.values],entries);
  const state=newArrival();
  assert.equal(state.player.money,12);assert.deepEqual(state.player.inventory,[]);assert.ok(!state.facts.oldCrime);
 }
});

test('v1 and v2 are independently detected without needing parseable old facts',()=>{
 for(const version of [1,2]){
  const key=saveKey().replace('-v3',`-v${version}`),storage=storageOf([[key,'old format, not JSON']]);
  assert.equal(obsoleteSavePresent(storage),true);
  assert.equal(loadCurrentSave(storage,saveKey()),null);
  assert.equal(storage.values.get(key),'old format, not JSON');
 }
});

test('a current save round-trips without importing old rewards or mutating either record',()=>{
 const key=saveKey(),value=currentSave(),entries=[[key,JSON.stringify(value)],['jianghu-echoes-v2',JSON.stringify({facts:{oldReward:true},player:{money:999}})]],storage=storageOf(entries);
 assert.deepEqual(loadCurrentSave(storage,key),value);
 assert.equal(obsoleteSavePresent(storage),true);
 assert.deepEqual([...storage.values],entries);
 assert.deepEqual(loadCurrentSave(storage,key).facts,{heardLead:true});
});

test('obsolete-save notices respect preview and playtest isolation',()=>{
 const storage=storageOf([['jianghu-echoes-v2','old player progress'],['jianghu-gate-preview-v1','old preview progress']]);
 assert.equal(obsoleteSavePresent(storage),true);
 assert.equal(obsoleteSavePresent(storage,{gatePreview:true}),true);
 assert.equal(obsoleteSavePresent(storage,{playtest:'balance'}),false);
 assert.equal(obsoleteSavePresent(storage,{gatePreview:true,playtest:'balance'}),false);
 const testOnly=storageOf([['jianghu-echoes-v2-playtest-balance','old test']]);
 assert.equal(obsoleteSavePresent(testOnly),false);
 assert.equal(obsoleteSavePresent(testOnly,{playtest:'balance'}),true);
 assert.equal(obsoleteSavePresent(testOnly,{playtest:'other'}),false);
});

test('an incompatible current record is reported without deleting it',()=>{
 const key=saveKey(),raw=JSON.stringify({...currentSave(),balanceVersion:0}),storage=storageOf([[key,raw]]);
 assert.equal(loadCurrentSave(storage,key),null);assert.equal(obsoleteSavePresent(storage),true);
 assert.equal(storage.values.get(key),raw);
 storage.values.set(key,JSON.stringify(currentSave()));
 assert.equal(obsoleteSavePresent(storage),false);
});

test('missing or inaccessible browser storage does not prevent a fresh start',()=>{
 const missing=storageOf(),blocked={getItem(){throw Error('storage denied');}};
 for(const storage of [missing,blocked,null,undefined]){
  assert.equal(loadCurrentSave(storage,saveKey()),null);
  assert.equal(obsoleteSavePresent(storage),false);
 }
});
