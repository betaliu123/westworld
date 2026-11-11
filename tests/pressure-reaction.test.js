import test from 'node:test';
import assert from 'node:assert/strict';
import {pressureReaction} from '../src/body-feedback.js';
test('pressure dodge starts at the actual strike, eases in and returns to neutral',()=>{
 const beat={motion:'pressure',start:10,struckAt:10.49,hit:false};
 assert.equal(pressureReaction({...beat,hit:undefined},10.6),0);
 assert.equal(pressureReaction(beat,10.48),0);
 assert.equal(pressureReaction(beat,10.49),0);
 assert.ok(pressureReaction(beat,10.50)<.03);
 assert.ok(pressureReaction(beat,10.61)>.99);
 assert.equal(pressureReaction(beat,11.15),0);
 assert.equal(pressureReaction(beat,12.6),0);
 for(const fps of [30,60,144]){
  let previous=0;
  for(let elapsed=0;elapsed<2.6;elapsed+=1/fps){const weight=pressureReaction(beat,beat.struckAt+elapsed);assert.ok(weight>=0&&weight<=1);assert.ok(Math.abs(weight-previous)*.24<.1);previous=weight;}
  assert.equal(previous,0);
 }
});
