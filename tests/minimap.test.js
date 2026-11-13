import test from 'node:test';
import assert from 'node:assert/strict';
import {minimapView,minimapPoint,minimapHit,playerMapArrow,drawMinimap,mountMinimap} from '../src/minimap.js';
import {drawInvestigationAreas} from '../src/investigation-ui.js';
import {knownHQ} from '../src/reputation.js';

function context(){const calls=[];return {calls,save(){},restore(){},clearRect(...v){calls.push(['clear',...v]);},beginPath(){},closePath(){},clip(){},fill(){},stroke(){},setLineDash(){},moveTo(...v){calls.push(['move',...v]);},lineTo(...v){calls.push(['line',...v]);},arc(...v){calls.push(['arc',...v]);},fillRect(...v){calls.push(['rect',...v]);},fillText(...v){calls.push(['text',...v]);}};}
const ink={font:'"Jianghu Body",KaiTi,serif',paper:'paper','ink-0':'ink0','ink-2':'ink2','ink-3':'ink3',cinnabar:'cinnabar',ochre:'ochre',azurite:'azurite'};

test('the player remains centred outside the old map circle, after walking, returning and loading a position',()=>{
 for(const p of [{x:0,z:36},{x:-18,z:35.8},{x:20,z:-22},{x:0,z:49},{x:0,z:36}])assert.deepEqual(minimapPoint(minimapView(p),p),{x:82,y:82});
 const landmark={x:5,z:24},before=minimapPoint(minimapView({x:0,z:36}),landmark),after=minimapPoint(minimapView({x:4,z:40}),landmark);
 assert.deepEqual({x:after.x-before.x,y:after.y-before.y},{x:-10,y:-10});
});
test('map objects, NPCs, investigation boundaries, events and route goals scroll in the same coordinate system',()=>{
 const player={x:10,z:30},q={x:14,z:26},view=minimapView(player),ctx=context();
 drawMinimap(ctx,view,{player,obstacles:[{id:'wall',...q,w:2,d:4},{id:'broken',x:0,z:0,w:1,d:1}],objects:{broken:{hp:0}},npcs:[['guard',{actor:{position:q}}]],headquarters:[{...q,glyph:'官',color:'court'}],areas:[{...q,radius:6}],hotspot:{point:[q.x,q.z]},route:[[q.x,q.z]],drawAreas:(c,a,v)=>drawInvestigationAreas(c,a,'cinnabar',v)},ink);
 const arcs=ctx.calls.filter(c=>c[0]==='arc').map(c=>c.slice(1,4));
 assert.deepEqual(arcs,[[82,82,80],[92,72,15],[92,72,11],[92,72,9],[92,72,2],[92,72,5]]);
 const rects=ctx.calls.filter(c=>c[0]==='rect');assert.ok(rects.some(c=>JSON.stringify(c)===JSON.stringify(['rect',89.5,67,5,10])));assert.equal(rects.length,3);
 assert.ok(ctx.calls.some(c=>c[0]==='text'&&c[1]==='官'&&c[2]===86&&c[3]===77));
 assert.deepEqual(ctx.calls.findLast(c=>c[0]==='move'),['move',82,90]);
});
test('the arrow points with the actor while north remains fixed on the map',()=>{
 const c={x:82,y:82};for(const [facing,tip]of [[0,{x:82,y:90}],[Math.PI/2,{x:90,y:82}],[Math.PI,{x:82,y:74}],[-Math.PI/2,{x:74,y:82}]]){
  const p=playerMapArrow(c,facing)[0];assert.ok(Math.abs(p.x-tip.x)<1e-8&&Math.abs(p.y-tip.y)<1e-8);
 }
 assert.deepEqual(minimapPoint(minimapView({x:8,z:30}),{x:8,z:20}),{x:82,y:57});
});
test('event hits follow the rendered map, reject the old fixed location and reject clipped corners',()=>{
 const view=minimapView({x:0,z:30}),event={x:4,z:24};
 assert.ok(minimapHit(view,event,{x:92,y:67}));assert.ok(!minimapHit(view,event,{x:92,y:142}));
 assert.ok(!minimapHit(view,{x:30,z:60},{x:157,y:157}));
});
test('clicks on a reduced canvas use the last painted frame and cannot open a replaced event',()=>{
 const oldStyle=globalThis.getComputedStyle,oldDocument=globalThis.document,ctx=context();
 globalThis.document={documentElement:{}};globalThis.getComputedStyle=()=>({getPropertyValue:k=>k});
 try{
  const map=mountMinimap({width:164,height:164,getContext:()=>ctx,getBoundingClientRect:()=>({left:800,top:20,width:120,height:120})});
  const world={hero:{position:{x:0,z:30},rotation:{y:0}},sim:{s:{ecosystem:{objects:{}}}},obstacles:[],npcs:[]},hotspot={id:1,point:[4,24]};
  map.render(world,{hotspot});world.hero.position.z=31;
  const click={clientX:800+92*120/164,clientY:20+67*120/164};assert.ok(map.hitsHotspot(click,hotspot));
  assert.ok(!map.hitsHotspot(click,{...hotspot,id:2}));assert.ok(!map.hitsHotspot(click,{...hotspot,point:[0,24]}));assert.ok(!map.hitsHotspot(click,null));
 }finally{globalThis.getComputedStyle=oldStyle;globalThis.document=oldDocument;}
});
test('rendering keeps secret headquarters out and never changes gameplay or save facts',()=>{
 const s={facts:{}},before=JSON.stringify(s),ctx=context(),player={x:11,z:24};
 drawMinimap(ctx,minimapView(player),{player,headquarters:knownHQ(s)},ink);assert.equal(JSON.stringify(s),before);assert.ok(!ctx.calls.some(c=>c[0]==='text'&&c[1]==='印'));
 s.facts.scribeIdentity=true;drawMinimap(ctx,minimapView(player),{player,headquarters:knownHQ(s)},ink);assert.ok(ctx.calls.some(c=>c[0]==='text'&&c[1]==='印'));
});
