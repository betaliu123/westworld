import * as T from '../vendor/three.module.js';
import {HOMES,homeFor,roomAt,doorId,bedFor,nightTime,hourOf,homeOccupied,isSleeping} from './night-life.js';
const PAPER=0xece3cf,INK=0x4f4b42,OCHRE=0x9c6d3c;
function bedQuilt(){const geometry=new T.PlaneGeometry(1.07,1.42,16,16),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i)+.4,edge=Math.max(0,1-(x/.54)**2),foot=Math.min(1,Math.max(0,(1.13-z)/.2));p.setXYZ(i,x,.59+.33*Math.sqrt(edge)*foot*Math.min(1,.3+(z+.31)/.18),z);}
 geometry.computeVertexNormals();return new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x788780,roughness:1,side:T.DoubleSide}));}
export function registerLantern(world,group,shade,light={}){
 shade.material=shade.material.clone();shade.material.emissive.setHex(OCHRE);
 world.nightLamps??=[];world.nightLamps.push({group,shade,...light});
}
export function furnishHouse(world,g,base,box){const h=HOMES.find(h=>base===`house:${h.x}:${h.z}`);if(!h)return;
 world.houses??=[];const record={home:h,group:g,base};world.houses.push(record);
 for(const id of h.residents){const b=bedFor(id),bed=new T.Group();g.add(bed);bed.position.set(b.x-h.x,0,b.z-h.z);
  box(bed,1.16,.18,2.2,OCHRE,0,.35,0);box(bed,1.02,.14,2.06,PAPER,0,.49,0);
  const pillow=new T.Mesh(new T.SphereGeometry(1,16,10),new T.MeshStandardMaterial({color:0xc0ae88,roughness:1}));pillow.scale.set(.42,.1,.24);pillow.position.set(0,.6,-.78);bed.add(pillow);
  for(const dx of [-.47,.47])for(const dz of [-.95,.95])box(bed,.09,.3,.09,OCHRE,dx,.16,dz);
  const quilt=bedQuilt();bed.add(quilt);quilt.visible=false;
  record.beds??=[];record.beds.push({id,group:bed,quilt});
  world.registerObject?.(bed,'bed:'+id,h.name+' · 床铺','wood',180,{kind:'bed',owner:id});
  // The foot of the bed is an accessible activity slot. The bed itself remains solid.
  world.obstacles.push({id:`bed:${id}`,x:b.x,z:b.z-.2,w:1.02,d:1.35,sightHeight:.55});
 }
 const lamp=new T.Group();lamp.position.set(0,1.5,-h.d/2+.5);g.add(lamp);
 box(g,.5,.09,.4,INK,0,1.32,-h.d/2+.5);
 const cup=new T.Mesh(new T.CylinderGeometry(.13,.08,.1,10),new T.MeshStandardMaterial({color:OCHRE}));cup.position.y=-.08;lamp.add(cup);
 const flame=new T.Mesh(new T.ConeGeometry(.035,.13,7),new T.MeshStandardMaterial({color:PAPER,emissive:OCHRE}));lamp.add(flame);
 world.nightLamps??=[];world.nightLamps.push({group:lamp,shade:flame,home:h,interior:true});
 for(const side of [-1,1]){
  const pane=new T.Mesh(new T.PlaneGeometry(1.02,1.1),new T.MeshStandardMaterial({color:PAPER,emissive:OCHRE,roughness:1}));
  pane.position.set(side*h.w*.32,1.85,h.d/2+.245);g.add(pane);
  // Lattice is in front of the lit paper, not a glowing rectangle over the wall.
  record.lattice??=[];for(let k=-2;k<=2;k++)record.lattice.push({mesh:box(g,.045,1.2,.055,INK,side*h.w*.32+k*.2,1.85,h.d/2+.28),windowId:base+':window'+(side*h.w*.32)});
  record.windows??=[];record.windows.push(pane);
 }
}
export function operateDoor(world,eco,id){const h=HOMES.find(h=>doorId(h)===id),o=eco.s.objects[id],p=world.hero.position;
 if(!h||!o||o.hp<=0)return '门已经坏了。';
 if(Math.hypot(p.x-h.x,p.z-(h.z+h.d/2))>2.8)return '走到门边再伸手。';
 if(o.open&&[p,...[...world.npcs.values()].map(n=>n.actor.position)].some(q=>Math.hypot(q.x-h.x,q.z-(h.z+h.d/2))<.7))return '门口有人，暂时合不上。';
 o.open=!o.open;delete o.autoCloseAt;world.sim.save();return null;
}
export function updateHomes(world,dt){const s=world.sim.s,objects=s.ecosystem?.objects||{},night=nightTime(s),now=s.npcClock||0,inside=roomAt(world.hero.position);
 for(const r of world.houses||[]){const h=r.home,o=objects[doorId(h)],doorPoint={x:h.x,z:h.z+h.d/2};
  // Anyone using the doorway opens it within arm's reach; nobody phases through it.
  const using=[...world.npcs].some(([id,n])=>{const state=s.people[id];return state.hp>0&&!(state.stunnedUntil>now)&&state.life?.target&&!['sleep','doze','awake'].includes(state.life.activity)&&Math.hypot(n.actor.position.x-doorPoint.x,n.actor.position.z-doorPoint.z)<2.4&&(homeFor(id)?.id===h.id||roomAt(n.actor.position)?.id===h.id);});
  if(using&&o?.hp>0){o.open=true;o.autoCloseAt=now+4;}
  const thresholdOccupied=[world.hero,...[...world.npcs.values()].map(n=>n.actor)].some(a=>Math.hypot(a.position.x-doorPoint.x,a.position.z-doorPoint.z)<.75);
  if(o?.autoCloseAt<=now&&!thresholdOccupied&&Math.hypot(world.hero.position.x-doorPoint.x,world.hero.position.z-doorPoint.z)>1.4){o.open=false;delete o.autoCloseAt;}
  const occupied=homeOccupied(s,h)||inside?.id===h.id,awake=inside?.id===h.id||h.residents.some(id=>s.people[id]?.hp>0&&roomAt(s.people[id])?.id===h.id&&!isSleeping(s.people[id]));
  r.lit=night&&occupied;r.lampLevel=r.lit?(awake?1:.32):0;
  for(const pane of r.windows||[]){pane.visible=inside?.id!==h.id&&objects[r.base+':window'+(pane.position.x)]?.hp!==0;pane.material.emissiveIntensity=r.lampLevel*2;pane.material.color.setHex(r.lit?PAPER:INK);}
  for(const bar of r.lattice||[])bar.mesh.visible=inside?.id!==h.id&&objects[bar.windowId]?.hp!==0;
  const inRoom=inside?.id===h.id,cutFront=inRoom&&(world.camera?.position.z??Infinity)>doorPoint.z+.15;
  for(const a of world.environmentAssets){if(!a.id.startsWith(r.base+':'))continue;const key=a.id.slice(r.base.length+1),state=objects[a.id];
   if(key==='door'){a.group.rotation.y=o?.open?-Math.PI/2:0;}
   const cut=inRoom&&(key==='roof'||key==='sign'||(cutFront&&(['front-1','front1'].includes(key)||key.startsWith('window')||key.startsWith('lantern'))));
   a.group.visible=state?.hp!==0&&!cut;if(state)state.visualCutaway=cut;
   if(state)state.cameraCutaway=inRoom&&(['front-1','front1','door','lintel','roof'].includes(key));
  }
  for(const b of r.beds||[]){const n=world.npcs.get(b.id),weight=n?.bedWeight||0,rest=s.player.bedRest;const playerHere=rest?.bedId==='bed:'+b.id;const k=playerHere?(world.hero.userData.bedPose?.weight||0):weight;b.quilt.visible=k>.85&&objects['bed:'+b.id]?.hp!==0;b.quilt.position.y=Math.sin((world.t||0)*1.2)*.004;}
 }
 // Fixed-size light pool avoids a separate shadow/light shader for every lantern.
 if(!world.nightLightPool){world.nightLightPool=Array.from({length:6},()=>{const l=new T.PointLight(PAPER,0,10,1.5);world.scene.add(l);return l;});}
 const lamps=[];
 const hour=hourOf(s),streetLevel=hour>=19||hour<5?1:hour>=18?hour-18:hour<6?6-hour:0;
 for(const lamp of world.nightLamps||[]){let visible=true;for(let g=lamp.group;g;g=g.parent)if(!g.visible)visible=false;
  const home=lamp.home&&world.houses.find(r=>r.home.id===lamp.home.id),level=visible?(home?.lampLevel??streetLevel):0;
  lamp.shade.material.emissiveIntensity=level*1.8;
  if(!level)continue;const point=lamp.shade.getWorldPosition(new T.Vector3());lamps.push({point,level,d:point.distanceTo(world.hero.position),intensity:lamp.intensity??10,distance:lamp.distance??10});
 }
 lamps.sort((a,b)=>a.d-b.d);for(let i=0;i<world.nightLightPool.length;i++){const light=world.nightLightPool[i],lamp=lamps[i];light.intensity=lamp&&lamp.d<24?lamp.intensity*lamp.level:0;if(lamp){light.position.copy(lamp.point);light.distance=lamp.distance;}}
}
export function sleepingPose(world,id){const n=world.npcs.get(id),state=world.sim.s.people[id],u=n.actor.userData;if(n.nightCup)n.nightCup.visible=false;
 if(state.hp<=0||state.stunnedUntil>world.sim.s.npcClock||state.awareness&&!['idle','return'].includes(state.awareness.state))return false;
 const target=state.life?.target;if(!target||Math.hypot(n.actor.position.x-target.x,n.actor.position.z-target.z)>.6)return false;
 if(state.life.activity==='sleep')return true;
 // Sitting is applied after locomotion, with a distinct stool / ground pose.
 if(state.life.activity==='doze'){for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop)prop.visible=false;u.head.rotation.x=.25+Math.sin(world.t*.7)*.025;return true;}
 if(state.life.activity==='nightDrink'){if(!n.nightCup){n.nightCup=new T.Mesh(new T.CylinderGeometry(.1,.08,.18,8),new T.MeshStandardMaterial({color:PAPER}));u.arms[1].add(n.nightCup);n.nightCup.position.set(0,-.55,.03);}n.nightCup.visible=true;u.arms[1].rotation.x=-1.7+Math.sin(world.t*.8)*.35;u.npcPoseOverride=true;return true;}
 return false;
}
