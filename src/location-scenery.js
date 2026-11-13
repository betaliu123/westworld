import {BEGGAR_NEST,PRIVACY_GROVE,PRISON_BEDS} from './locations.js';
import * as T from '../vendor/three.module.js';
import {furnishHouse} from './night-scene.js';
import {buildCourtChest} from './court-chest-scene.js';
import {buildTravelBundle} from './travel-bundle-scene.js';
import {buildQingheRiverside} from './qinghe-riverside.js';
import {CART,CONVOY_GATE,CONVOY_STONE} from './convoy.js';
export function buildLocationScenery(world,{box,cyl,textSprite}){
 buildCourtChest(world,{box});buildTravelBundle(world);
 buildQingheRiverside(world);
 // Cargo stays attached to its physical cart; the scene controller moves the same asset.
 const convoy=world.convoyVisual=new T.Group();convoy.position.set(CONVOY_GATE.x,0,CONVOY_GATE.z);world.scene.add(convoy);
 const cargo=world.convoyCargo={stone:new T.Group(),silk:new T.Group(),cage:new T.Group()};convoy.add(...Object.values(cargo));
 box(convoy,2.5,.22,3.5,0x6e5140,0,.9,0);
 world.convoyWheels=[];
 for(const x of [-1.3,1.3]){box(convoy,.12,.65,3.5,0x70553e,x,1.25,0);box(convoy,.1,.1,2.6,0x5a4230,x*.7,.78,-2.5);for(const z of [-1.05,1.05]){const wheel=cyl(convoy,.62,.62,.16,0x43392e,x,.62,z);wheel.rotation.z=Math.PI/2;world.convoyWheels.push(wheel);}}
 for(const [x,z] of [[-.6,-.7],[.5,.7]]){const stone=new T.Mesh(new T.DodecahedronGeometry(.72,0),new T.MeshStandardMaterial({color:0x87877a,roughness:1}));stone.position.set(x,1.55,z);stone.scale.set(.8,1.15,.8);cargo.stone.add(stone);}
 box(cargo.silk,.7,.42,.55,0xc0a34e,.65,1.22,-1.05);for(const x of [.43,.87])box(cargo.silk,.045,.45,.58,0x80683e,x,1.23,-1.05);
 cyl(convoy,.045,.045,4,0x594330,1.4,2,-1.4);box(convoy,.95,1.4,.03,0xc0a34e,1.9,3.15,-1.4);const banner=textSprite('纲','#312c22',32,'sign');banner.position.set(1.9,3.15,-1.36);convoy.add(banner);
 // Bamboo cage, perch and a small bird silhouette make the imperial cargo legible.
 for(const y of [1.05,2.05])box(cargo.cage,.65,.06,.65,0x9b7f4a,-.6,y,1.1);
 for(const x of [-.9,-.6,-.3])for(const z of [.8,1.4])cyl(cargo.cage,.018,.018,1,0xa48e57,x,1.55,z);
 box(cargo.cage,.6,.035,.035,0x80683e,-.6,1.4,1.1);const bird=new T.Mesh(new T.SphereGeometry(.12,8,6),new T.MeshStandardMaterial({color:0x566057}));bird.scale.set(.7,1,1.4);bird.position.set(-.6,1.53,1.1);cargo.cage.add(bird);
 world.registerObject(convoy,CART,'花石纲货车','wood',360,{kind:'convoy',owner:'fu',x:CONVOY_GATE.x,z:CONVOY_GATE.z,w:2.9,d:3.7,y:1.2});
 world.obstacles.push({id:CART,...CONVOY_GATE,w:2.9,d:3.7,sightHeight:2.2});
 const trial=world.convoyTrialStone=new T.Mesh(new T.DodecahedronGeometry(.58,0),new T.MeshStandardMaterial({color:0x87877a,roughness:1}));trial.position.set(CONVOY_STONE.x,.45,CONVOY_STONE.z);trial.scale.set(1,.85,.9);world.scene.add(trial);
 world.registerObject(trial,'convoy-trial-stone','试力石','stone',260,{x:CONVOY_STONE.x,z:CONVOY_STONE.z,w:1,d:1,y:.45});
 world.obstacles.push({id:'convoy-trial-stone',...CONVOY_STONE,w:1,d:1,sightHeight:.9});
 for(let j=0;j<8;j++)for(let k=0;k<4;k++){const shrub=new T.Mesh(new T.IcosahedronGeometry(.8,1),new T.MeshStandardMaterial({color:(j+k)%2?0x4e6940:0x637b47}));shrub.scale.set(1,.85,1);shrub.position.set(PRIVACY_GROVE.x+k*1.35+Math.sin(j*3+k)*.18,.55+Math.sin(j+k)*.1,PRIVACY_GROVE.z-.6+j*.85+Math.cos(j+k)*.16);world.scene.add(shrub);}
 world.obstacles.push({id:'privacy-hedge',x:PRIVACY_GROVE.x-.8,z:PRIVACY_GROVE.z+1.9,w:.2,d:5});
 // Open-front halls keep entrances and indoor NPCs physically reachable.
 for(const site of [{id:'court-hall',name:'官府大堂 · 六扇门',x:10,z:-23,wall:0x7c6556,trim:0x334a50},{id:'gang-den',name:'赤砂堂 · 赤砂帮巢穴',x:23,z:-5,wall:0x61483e,trim:0x6b2928}]){
  const g=new T.Group();g.position.set(site.x,0,site.z);world.scene.add(g);
  box(g,7.2,.12,5.8,0x969080,0,-.04,0);
  for(const part of [{x:-3.5,z:0,w:.25,d:5.8},{x:3.5,z:0,w:.25,d:5.8},{x:0,z:-2.8,w:7,d:.25}]){box(g,part.w,3.6,part.d,site.wall,part.x,1.8,part.z);world.obstacles.push({id:site.id+':'+part.x+':'+part.z,x:site.x+part.x,z:site.z+part.z,w:part.w,d:part.d});}
  for(const x of [-3,3]){cyl(g,.16,.19,3.6,site.trim,x,1.8,2.6);world.lantern(g,x,2.6,2.7);}
  const roof=new T.Group();g.add(roof);for(let i=0;i<4;i++)box(roof,8-i*.35,.18,6.8-i*1.5,site.trim,0,3.9+i*.2,0);world.factionRoofs??=[];world.factionRoofs.push({roof,x:site.x,z:site.z});
  box(g,7.5,.35,.8,site.trim,0,3.7,2.7);box(g,4,.6,.18,0x292f2c,0,3.1,2.8);const sign=textSprite(site.name,'#efd496',27,'sign');sign.position.set(0,3.15,2.95);g.add(sign);
  box(g,2.4,.16,.85,0x5f4233,0,.9,-1.3);for(const x of [-1,1])box(g,.13,.9,.65,0x4b352a,x,.45,-1.3);
  if(site.id==='court-hall'){const plaque=textSprite('明镜高悬','#e8c68b',30,'sign');plaque.position.set(0,2.8,-2.55);g.add(plaque);for(const x of [-2.4,2.4])box(g,.35,2,.16,0x8a3b32,x,1.4,-2.5);}
  else{for(const x of [-2.4,2.4]){box(g,.7,.7,.7,0x785838,x,.35,-1.4);cyl(g,.3,.24,.65,0x514735,x,.35,.5);}const flag=box(g,.8,1.3,.06,0x8f3932,2.8,2,-2.5);}
 }
 const hall=new T.Group();hall.position.set(22,0,5);world.scene.add(hall);
 const base='house:22:5',part=(id,build,collision=false)=>{const p=new T.Group();hall.add(p);build(p);const a=world.registerObject(p,base+':'+id,id==='door'?'绛云楼 · 木门':'绛云楼',id==='door'||id==='frame'?'wood':'stone',id==='door'?220:1200,{kind:id==='door'?'door':'building',owner:'mei'});if(collision)world.obstacles.push({id:a.id,x:a.x,z:a.z,w:a.w,d:a.d});return p;};
 box(hall,7,.18,6.6,0x958b78,0,.02,0);
 part('back',p=>box(p,6.7,3,.25,0x963e38,0,1.6,-3),true);
 for(const x of [-1,1]){part(x<0?'west':'east',p=>box(p,.25,3,6,0x963e38,x*3.35,1.6,0),true);part('front'+x,p=>box(p,2.6,3,.25,0x963e38,x*2.05,1.6,3),true);}
 part('lintel',p=>box(p,1.5,.6,.25,0x963e38,0,2.8,3));
 part('frame',p=>{for(const x of [-.79,.79])box(p,.13,2.5,.24,0x683129,x,1.25,3.04);box(p,1.7,.15,.24,0x683129,0,2.48,3.04);});
 part('door',p=>{p.position.set(-.7,0,3.04);box(p,1.4,2.2,.12,0x493b32,.7,1.2,0);for(const z of [-.1,.1])box(p,.07,.25,.08,0xc0ae88,1.22,1.2,z);},true);
 const upper=part('roof',p=>{box(p,6.5,2.6,5.8,0xad4940,0,4.4,0);for(const y of [3.15,5.85]){box(p,7.8,.22,7,0x493e3a,0,y,0);box(p,6.8,.25,5.8,0x635049,0,y+.2,0);}});
 for(const x of [-2.4,2.4]){box(hall,.16,3,.16,0x683129,x,1.5,3.12);box(upper,.16,2.6,.16,0x683129,x,4.3,3.12);box(upper,1.2,1.1,.08,0xd6b779,x,4.5,3.08);for(const d of [-.4,0,.4])box(upper,.055,1.1,.1,0x612c28,x+d,4.5,3.14);}
 box(upper,5.8,.16,1.1,0x7e4234,0,3.25,3.3);for(const x of [-2.8,-2,-1,0,1,2,2.8])box(upper,.08,.85,.08,0xc18c58,x,3.7,3.8);box(upper,5.8,.09,.1,0xc18c58,0,4.1,3.8);
 for(const x of [-2.8,2.8])world.lantern(hall,x,2.8,3.4);for(const x of [-3.1,3.1])box(hall,.22,1.8,.06,0xc54345,x,2,3.2);
 part('sign',p=>{const sign=textSprite('绛 云 楼','#eee3be',36,'sign');sign.position.set(0,2.75,3.2);p.add(sign);});furnishHouse(world,hall,base,box);
 box(world.scene,7.6,.025,5.5,0xb49780,22,.015,11.2);for(const x of [18.5,25.5]){cyl(world.scene,.08,.1,2.6,0x733d32,x,1.3,10);world.lantern(world.scene,x,2.3,10);}
 const prison=new T.Group();prison.position.set(22,0,-22);world.scene.add(prison);box(prison,8,.16,9,0x646966,0,-.03,.7);
 const wall=(id,x,z,w,d)=>{box(prison,w,3.7,d,0x555e5a,x,1.85,z);world.obstacles.push({id,x:22+x,z:-22+z,w,d});};wall('jail-west',-3.5,0,.45,7);wall('jail-east',3.5,0,.45,7);wall('jail-back',0,-3.5,7.4,.45);
 world.jailBars=new T.Group();world.jailBars.position.set(22,0,-19);world.scene.add(world.jailBars);for(let x=-3.3;x<=3.3;x+=.42)box(world.jailBars,.07,3.1,.09,0x303735,x,1.55,0);for(const y of [.2,1.6,3])box(world.jailBars,6.8,.12,.14,0x303735,0,y,0);
 world.obstacles.push({id:'jail-bars',x:22,z:-19,w:6.8,d:.14});box(prison,.22,.3,.15,0x9f8853,.4,1.3,3.15);
 for(const b of PRISON_BEDS){const mat=new T.Group();mat.position.set(b.x-22,0,b.z+22);prison.add(mat);box(mat,1.2,.12,2,0x8e8055,0,.14,0);for(let i=0;i<8;i++)box(mat,.05,.035,1.8,0xb29b61,-.5+i*.14,.22,0);
  world.registerObject?.(mat,b.id,'牢中草铺','wood',180,{kind:'bed',owner:'inspector'});
  world.obstacles.push({id:b.id,x:b.x,z:b.z-.2,w:1.02,d:1.35,sightHeight:.23});
 }
 cyl(prison,.25,.18,.4,0x61503c,2.6,.2,1.6);cyl(prison,.2,.14,.08,0xaaa184,-1,.12,.4);box(prison,.7,.14,.45,0x706652,-2.5,.35,1.8);
 for(const x of [-2.9,2.9]){world.lantern(prison,x,2.6,1);const light=new T.PointLight(0xffae61,1.8,8);light.position.set(x,2.5,1);prison.add(light);}
 const label=textSprite('临 溪 县 狱');label.position.set(22,3.6,-18.8);world.scene.add(label);
 world.jailRoof=box(prison,7.7,.25,7.7,0x394844,0,3.9,0);world.prisonBuilding=prison;world.ribbonBuilding=hall;
 const nest=new T.Group();nest.position.set(BEGGAR_NEST.x,0,BEGGAR_NEST.z-1.1);world.scene.add(nest);
 for(const [dx,dz,s] of [[-.55,.05,1],[.25,-.15,.75],[.85,.2,.6],[-.15,.55,.7]]){const heap=new T.Mesh(new T.ConeGeometry(.5*s,.4*s,7),new T.MeshStandardMaterial({color:0xb08958,roughness:1}));heap.position.set(dx,.16*s,dz);heap.rotation.set(.45,.3*dx,.25);nest.add(heap);}
 box(nest,1.35,.045,.85,0x8a7350,-.15,.03,.1);box(nest,.72,.04,.5,0x6d5e48,.65,.03,.35);
 cyl(nest,.11,.07,.045,0xc8c0a4,.8,.05,.05);cyl(nest,.07,.05,.03,0xa89878,-.7,.04,.45);
 for(const dx of [-.85,.75]){const pole=cyl(nest,.04,.04,2.15,0x6a5340,dx,.95,-.4);pole.rotation.x=.62;}
 const cloth=new T.Mesh(new T.PlaneGeometry(1.85,1.35),new T.MeshStandardMaterial({color:0x6e6254,side:T.DoubleSide,roughness:1}));cloth.position.set(-.05,1.05,-.15);cloth.rotation.x=.72;nest.add(cloth);
 const mark=textSprite('乞丐窝','#efe3c2',30,'sign');mark.position.set(.15,1.55,.7);nest.add(mark);
}
