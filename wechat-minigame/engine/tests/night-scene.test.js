import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {homeFor,bedFor,doorId} from '../src/night-life.js';
import {furnishHouse,updateHomes,operateDoor} from '../src/night-scene.js';

test('home lights follow actual occupancy; doors preserve durability and never close on a person',()=>{
 const sim=new Simulation(newArrival()),eco=new Ecosystem(sim),h=homeFor('bookseller'),id=doorId(h),base=`house:${h.x}:${h.z}`;
 sim.s.time=170;sim.s.npcClock=20;eco.s.objects[id]={id,hp:220,open:false};
 const scene=new T.Scene(),g=new T.Group(),hero=new T.Group(),actor=new T.Group();g.position.set(h.x,0,h.z);scene.add(g,hero,actor);hero.position.set(h.x,0,h.z+4);actor.position.set(0,0,0);
 const world={sim,scene,hero,npcs:new Map([['bookseller',{actor}]]),obstacles:[],environmentAssets:[]};
 const box=(p,w,hh,d,color,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,hh,d),new T.MeshStandardMaterial({color}));m.position.set(x,y,z);p.add(m);return m;};
 furnishHouse(world,g,base,box);scene.updateMatrixWorld(true);updateHomes(world,.1);assert.equal(world.houses[0].lit,false);
 const b=bedFor('bookseller'),n=sim.s.people.bookseller;Object.assign(n,{x:b.xTarget,z:b.zTarget,life:{activity:'sleep',target:{x:b.xTarget,z:b.zTarget},night:true}});actor.position.set(n.x,0,n.z);
 updateHomes(world,.1);assert.equal(world.houses[0].lit,true);assert.equal(world.houses[0].lampLevel,.32);assert.ok(world.nightLightPool.some(l=>l.intensity>0));
 hero.position.set(h.x,0,h.z);updateHomes(world,.1);assert.ok(world.houses[0].windows.every(p=>!p.visible));
 hero.position.set(h.x,0,h.z+h.d/2+1);assert.equal(operateDoor(world,eco,id),null);assert.equal(eco.s.objects[id].open,true);assert.equal(eco.s.objects[id].hp,220);
 actor.position.set(h.x,0,h.z+h.d/2);assert.match(operateDoor(world,eco,id),/门口有人/);
 hero.position.z+=4;eco.s.objects[id].autoCloseAt=10;updateHomes(world,.1);assert.equal(eco.s.objects[id].open,true);
 actor.position.set(n.x,0,n.z);updateHomes(world,.1);assert.equal(eco.s.objects[id].open,false);
 const window=world.houses[0].lattice[0].windowId;eco.s.objects[window]={hp:0};updateHomes(world,.1);assert.ok(world.houses[0].lattice.filter(bar=>bar.windowId===window).every(bar=>!bar.mesh.visible));
 sim.s.time=4;updateHomes(world,.1);assert.ok(world.nightLightPool.every(l=>l.intensity===0));
});
