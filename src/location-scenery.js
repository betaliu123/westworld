import * as T from '../vendor/three.module.js';
export function buildLocationScenery(world,{box,cyl,textSprite}){
 for(let j=0;j<8;j++)for(let k=0;k<4;k++){const shrub=new T.Mesh(new T.IcosahedronGeometry(.8,1),new T.MeshStandardMaterial({color:(j+k)%2?0x4e6940:0x637b47}));shrub.scale.set(1,.85,1);shrub.position.set(-12.5-k*1.35+Math.sin(j*3+k)*.18,.55+Math.sin(j+k)*.1,27.2+j*.85+Math.cos(j+k)*.16);world.scene.add(shrub);}
 world.obstacles.push({id:'privacy-hedge',x:-11.7,z:29.7,w:.2,d:5});
 // Open-front halls keep entrances and indoor NPCs physically reachable.
 for(const site of [{id:'court-hall',name:'官府大堂 · 六扇门',x:10,z:-23,wall:0x7c6556,trim:0x334a50},{id:'gang-den',name:'赤砂堂 · 赤砂帮巢穴',x:23,z:-5,wall:0x61483e,trim:0x6b2928}]){
  const g=new T.Group();g.position.set(site.x,0,site.z);world.scene.add(g);
  box(g,7.2,.12,5.8,0x969080,0,-.04,0);
  for(const part of [{x:-3.5,z:0,w:.25,d:5.8},{x:3.5,z:0,w:.25,d:5.8},{x:0,z:-2.8,w:7,d:.25}]){box(g,part.w,3.6,part.d,site.wall,part.x,1.8,part.z);world.obstacles.push({id:site.id+':'+part.x+':'+part.z,x:site.x+part.x,z:site.z+part.z,w:part.w,d:part.d});}
  for(const x of [-3,3]){cyl(g,.16,.19,3.6,site.trim,x,1.8,2.6);world.lantern(g,x,2.6,2.7);}
  const roof=new T.Group();g.add(roof);for(let i=0;i<4;i++)box(roof,8-i*.35,.18,6.8-i*1.5,site.trim,0,3.9+i*.2,0);world.factionRoofs??=[];world.factionRoofs.push({roof,x:site.x,z:site.z});
  box(g,7.5,.35,.8,site.trim,0,3.7,2.7);box(g,4,.6,.18,0x292f2c,0,3.1,2.8);const sign=textSprite(site.name,'#efd496',27);sign.position.set(0,3.15,2.95);g.add(sign);
  box(g,2.4,.16,.85,0x5f4233,0,.9,-1.3);for(const x of [-1,1])box(g,.13,.9,.65,0x4b352a,x,.45,-1.3);
  if(site.id==='court-hall'){const plaque=textSprite('明镜高悬','#e8c68b',30);plaque.position.set(0,2.8,-2.55);g.add(plaque);for(const x of [-2.4,2.4])box(g,.35,2,.16,0x8a3b32,x,1.4,-2.5);}
  else{for(const x of [-2.4,2.4]){box(g,.7,.7,.7,0x785838,x,.35,-1.4);cyl(g,.3,.24,.65,0x514735,x,.35,.5);}const flag=box(g,.8,1.3,.06,0x8f3932,2.8,2,-2.5);}
 }
 const hall=new T.Group();hall.position.set(22,0,5);world.scene.add(hall);
 box(hall,7,.18,6.6,0x958b78,0,.02,0);box(hall,6.7,3,6,0x963e38,0,1.6,0);box(hall,6.5,2.6,5.8,0xad4940,0,4.4,0);
 for(const y of [3.15,5.85]){box(hall,7.8,.22,7,0x493e3a,0,y,0);box(hall,6.8,.25,5.8,0x635049,0,y+.2,0);}
 box(hall,2.1,2.4,.09,0x392a28,0,1.3,3.04);for(const x of [-2.4,2.4]){box(hall,.16,5.6,.16,0x683129,x,2.8,3.12);for(const y of [1.7,4.5]){box(hall,1.2,1.1,.08,0xd6b779,x,y,3.08);for(const d of [-.4,0,.4])box(hall,.055,1.1,.1,0x612c28,x+d,y,3.14);}}
 box(hall,5.8,.16,1.1,0x7e4234,0,3.25,3.3);for(const x of [-2.8,-2,-1,0,1,2,2.8])box(hall,.08,.85,.08,0xc18c58,x,3.7,3.8);box(hall,5.8,.09,.1,0xc18c58,0,4.1,3.8);
 for(const x of [-2.8,2.8])world.lantern(hall,x,2.8,3.4);for(const x of [-3.1,3.1])box(hall,.22,1.8,.06,0xc54345,x,2,3.2);
 const sign=textSprite('绛 云 楼');sign.position.set(0,2.75,3.2);hall.add(sign);world.obstacles.push({id:'ribbon-house',x:22,z:5,w:6.7,d:6});
 box(world.scene,7.6,.025,5.5,0xb49780,22,.015,11.2);for(const x of [18.5,25.5]){cyl(world.scene,.08,.1,2.6,0x733d32,x,1.3,10);world.lantern(world.scene,x,2.3,10);}
 const prison=new T.Group();prison.position.set(22,0,-22);world.scene.add(prison);box(prison,8,.16,9,0x646966,0,-.03,.7);
 const wall=(id,x,z,w,d)=>{box(prison,w,3.7,d,0x555e5a,x,1.85,z);world.obstacles.push({id,x:22+x,z:-22+z,w,d});};wall('jail-west',-3.5,0,.45,7);wall('jail-east',3.5,0,.45,7);wall('jail-back',0,-3.5,7.4,.45);
 world.jailBars=new T.Group();world.jailBars.position.set(22,0,-19);world.scene.add(world.jailBars);for(let x=-3.3;x<=3.3;x+=.42)box(world.jailBars,.07,3.1,.09,0x303735,x,1.55,0);for(const y of [.2,1.6,3])box(world.jailBars,6.8,.12,.14,0x303735,0,y,0);
 world.obstacles.push({id:'jail-bars',x:22,z:-19,w:6.8,d:.14});box(prison,.22,.3,.15,0x9f8853,.4,1.3,3.15);
 for(const x of [-2,1.8]){box(prison,1.2,.12,2,0x8e8055,x,.14,-1.8);for(let i=0;i<8;i++)box(prison,.05,.035,1.8,0xb29b61,x-.5+i*.14,.22,-1.8);}
 cyl(prison,.25,.18,.4,0x61503c,2.6,.2,1.6);cyl(prison,.2,.14,.08,0xaaa184,-1,.12,.4);box(prison,.7,.14,.45,0x706652,-2.5,.35,1.8);
 for(const x of [-2.9,2.9]){world.lantern(prison,x,2.6,1);const light=new T.PointLight(0xffae61,1.8,8);light.position.set(x,2.5,1);prison.add(light);}
 const label=textSprite('临 溪 县 狱');label.position.set(22,3.6,-18.8);world.scene.add(label);
 world.jailRoof=box(prison,7.7,.25,7.7,0x394844,0,3.9,0);world.prisonBuilding=prison;world.ribbonBuilding=hall;
}
