import test from 'node:test';import assert from 'node:assert/strict';
import {routinePath} from '../src/npc-navigation.js';
import {obstaclesNear} from '../src/obstacle-grid.js';

// Deterministic pseudo-random numbers so a failure can be replayed.
const rng=seed=>()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
const inside=(o,x,z,pad)=>Math.abs(x-o.x)<o.w/2+pad&&Math.abs(z-o.z)<o.d/2+pad;

test('the obstacle grid answers every point exactly like a scan of the whole list',()=>{
 const r=rng(7),list=[];for(let i=0;i<300;i++)list.push({id:'o'+i,x:r()*120-60,z:r()*120-60,w:.2+r()*9,d:.2+r()*9});
 const cart={id:'cart',x:0,z:0,w:2,d:2};list.push(cart);
 const check=pad=>{for(let i=0;i<4000;i++){const x=r()*140-70,z=r()*140-70,near=obstaclesNear(list,x,z,pad,o=>o===cart);
  assert.deepEqual(near.filter(o=>o!==cart&&inside(o,x,z,pad)).map(o=>o.id).sort(),list.filter(o=>o!==cart&&inside(o,x,z,pad)).map(o=>o.id).sort());
  assert.ok(near.includes(cart),'an obstacle that moves on its own is offered to every query');}};
 check(.3);
 // Obstacles placed later (a new stall, a dropped barrier) and a wider margin are both picked up.
 list.push({id:'late',x:41.3,z:-17.2,w:1,d:1});assert.ok(obstaclesNear(list,41.3,-17.2,.3,o=>o===cart).some(o=>o.id==='late'));
 check(.3);check(.9);
});

test('a target with no free standing point in reach is refused without flooding the map',()=>{
 // The target sits on a thin post: open ground lies a step away, but no point the search can stop on is free.
 let calls=0;const post=(x,z)=>{calls++;return Math.abs(x-6)<.12&&Math.abs(z)<.12;};
 assert.deepEqual(routinePath({x:0,z:0},{x:6,z:0},post),[]);
 assert.ok(calls<1000,`a hopeless route took ${calls} collision samples`);
});

test('a reachable target behind a wall is still found, and the route stays out of the wall',()=>{
 const wall=(x,z)=>Math.abs(x-3)<.4&&Math.abs(z)<4,path=routinePath({x:0,z:0},{x:6,z:0},wall);
 assert.ok(path.length>2);const end=path.at(-1);assert.ok(Math.hypot(end.x-6,end.z)<=.45);
 assert.ok(path.every(p=>!wall(p.x,p.z)));assert.ok(path.some(p=>Math.abs(p.z)>=4),'the route goes round the end of the wall');
});
