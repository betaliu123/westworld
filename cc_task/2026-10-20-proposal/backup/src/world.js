import * as T from '../vendor/three.module.js';
import {PEOPLE,SCENES} from './data.js';
import {motionFor,turnToward,arriveStep} from './interaction.js';
const matCache=new Map();const material=(color)=>{if(!matCache.has(color))matCache.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return matCache.get(color);};
function mesh(g,c,parent,x=0,y=0,z=0){const m=new T.Mesh(g,material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,w,h,d,c,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);
const cyl=(p,r1,r2,h,c,x=0,y=0,z=0,n=8)=>mesh(new T.CylinderGeometry(r1,r2,h,n),c,p,x,y,z);
export function textSprite(text,color='#eee3be',size=36){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font=`500 ${size}px Microsoft YaHei`;ctx.textAlign='center';ctx.shadowColor='#102724';ctx.shadowBlur=8;ctx.fillStyle=color;ctx.fillText(text,256,60);const texture=new T.CanvasTexture(c);const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(3.8,.71,1);return sprite;}
export function character(color,hero=false,female=false){
 const root=new T.Group(),rig=new T.Group();root.add(rig);const skin=0xdcb58f,hair=0x252c2a;
 const robe=cyl(rig,.29,.43,.91,color,0,.83,0);box(rig,.64,.43,.37,color,0,1.37,0);box(rig,.65,.09,.4,hero?0xd3b271:0x463e32,0,1.12,0);
 const lapel=box(rig,.12,.53,.035,0xded1a7,-.1,1.36,.21);lapel.rotation.z=.45;
 mesh(new T.SphereGeometry(.225,12,10),skin,rig,0,1.86,0);mesh(new T.SphereGeometry(.23,12,8),hair,rig,0,1.96,-.035);cyl(rig,.1,.12,.18,hair,0,2.19,-.03);
 box(rig,.06,.04,.13,0xc3ab6a,0,2.22,.02);box(rig,.28,.2,.12,hair,0,1.77,-.16);
 for(const x of [-.085,.085])box(rig,.028,.035,.012,0x272b2a,x,1.88,.207);
 if(female){robe.visible=false;box(rig,.38,.6,.15,hair,0,1.57,-.2);const pin=box(rig,.48,.035,.04,0xd5b36d,.08,2.07,0);pin.rotation.z=.12;cyl(rig,.27,.49,.86,color,0,.72,0);}
 const arms=[],legs=[];
 for(const sign of [-1,1]){const arm=new T.Group();arm.position.set(sign*.39,1.53,0);rig.add(arm);cyl(arm,.13,.18,.52,color,0,-.23,0);mesh(new T.SphereGeometry(.095,8,6),skin,arm,0,-.53,0);arms.push(arm);const leg=new T.Group();leg.position.set(sign*.16,.5,0);rig.add(leg);box(leg,.2,.43,.21,0x353c38,0,-.16,0);box(leg,.22,.14,.36,0x272e2c,0,-.4,.075);legs.push(leg);}
 const sword=new T.Group();box(sword,.055,.86,.055,0xbecbc4,0,-.46,0);box(sword,.24,.04,.07,0xc1a561,0,0,0);box(sword,.065,.19,.065,0x564736,0,.1,0);arms[1].add(sword);sword.position.y=-.52;sword.visible=hero;
 if(hero){const cape=box(rig,.55,.85,.055,0xd3c6a1,0,1.13,-.24);cape.rotation.x=-.12;}
 root.userData={rig,arms,legs,sword,isHero:hero,phase:Math.random()*6};return root;
}
export class World{
 constructor(canvas,sim){
 this.sim=sim;this.canvas=canvas;this.scene=new T.Scene();this.scene.background=new T.Color(0xadc5c3);this.scene.fog=new T.FogExp2(0xadc5c3,.014);this.renderer=new T.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
 this.camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);this.yaw=0;this.pitch=.62;this.distance=14;this.t=0;this.keys=new Set();this.obstacles=[];this.environmentAssets=[];this.npcs=new Map();this.props=[];this.particles=[];this.auto=null;this.locked=false;this.attackTime=0;this.readyUntil=0;this.jumpV=0;this.ground=0;
 this.scene.add(new T.HemisphereLight(0xdaedf0,0x626348,2));const sun=new T.DirectionalLight(0xffe3b0,3.2);sun.position.set(-20,32,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:100});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;this.scene.add(sun);
 this.build();this.hero=character(0x385953,true);this.hero.position.set(sim.s.player.x,0,sim.s.player.z);this.scene.add(this.hero);
 this.actionBowl=new T.Group();cyl(this.actionBowl,.14,.075,.12,0xd8d8bd);cyl(this.actionBowl,.12,.12,.02,0x8d6245,0,.06,0);this.hero.userData.arms[1].add(this.actionBowl);this.actionBowl.position.set(0,-.58,0);this.actionBowl.visible=false;
 this.actionFlute=box(this.hero.userData.rig,.64,.035,.035,0xb99c61,0,1.72,.3);this.actionFlute.visible=false;this.actionCoins=new T.Group();for(let i=0;i<3;i++)cyl(this.actionCoins,.045,.045,.018,0xe5bc60,i*.07,-.58,0);this.hero.userData.arms[0].add(this.actionCoins);this.actionCoins.visible=false;
 this.actionStool=new T.Group();box(this.actionStool,.7,.08,.55,0x806047,0,.5,0);for(const x of [-.25,.25])box(this.actionStool,.08,.5,.4,0x604c3b,x,.25,0);this.scene.add(this.actionStool);this.actionStool.visible=false;

 for(const person of PEOPLE){const actor=character(person.color,false,['su','tea','inn','mei','matchmaker'].includes(person.id));actor.position.set(person.x,0,person.z);this.scene.add(actor);const label=textSprite(person.name);label.position.y=2.7;actor.add(label);this.npcs.set(person.id,{actor,person,label,base:new T.Vector3(person.x,0,person.z),phase:Math.random()*10});}
 this.eventGroup=new T.Group();this.scene.add(this.eventGroup);this.syncEvent();this.resize();window.addEventListener('resize',()=>this.resize());
 this.camera.position.set(0,11,26);this.camera.lookAt(this.hero.position);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(e.button===2){if(this.performance)this.performance.camera=false;this.drag=true;canvas.setPointerCapture(e.pointerId);}else if(e.button===0)this.primaryAction(e);});canvas.addEventListener('pointerup',()=>this.drag=false);canvas.addEventListener('pointermove',e=>{if(this.drag){this.yaw-=e.movementX*.006;this.pitch=Math.max(.28,Math.min(1.05,this.pitch+e.movementY*.004));}});canvas.addEventListener('wheel',e=>{e.preventDefault();if(this.performance)this.performance.camera=false;this.distance=Math.max(7,Math.min(22,this.distance+e.deltaY*.01));},{passive:false});
 window.addEventListener('blur',()=>{this.keys.clear();this.clearReady();});
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 registerObject(group,id,name,material='wood',hp=100,extra={}){group.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(group),c=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const asset={id,kind:'prop',name,material,max:hp,x:c.x,z:c.z,w:size.x,d:size.z,y:c.y,group,...extra};this.environmentAssets=this.environmentAssets.filter(a=>a.id!==id);this.environmentAssets.push(asset);return asset;}
 lantern(p,x,y,z){const g=new T.Group();g.position.set(x,y,z);p.add(g);cyl(g,.2,.23,.38,0xbc573c);cyl(g,.14,.14,.07,0x463c31,0,.23,0);cyl(g,.14,.14,.07,0x463c31,0,-.23,0);cyl(g,.018,.018,.23,0xc9a756,0,-.38,0);return g;}
 tree(x,z,blossom=false,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.scene.add(g);cyl(g,.12,.23,2.4,0x60544a,0,1.2,0);for(let i=0;i<5;i++){const a=i*2.4;const branch=cyl(g,.06,.11,1.5,0x60544a,Math.sin(a)*.32,2,Math.cos(a)*.32);branch.rotation.z=Math.sin(a)*.6;mesh(new T.IcosahedronGeometry(.9,1),blossom?[0xdea9a3,0xe7bcaf,0xc88d8d][i%3]:[0x6a8263,0x829476,0x506f61][i%3],g,Math.sin(a)*.8,2.8+(i%2)*.5,Math.cos(a)*.7);}this.obstacles.push({id:`tree:${x}:${z}`,x,z,w:.6,d:.6});this.environmentAssets.push({id:`tree:${x}:${z}`,kind:'tree',name:blossom?'花树':'果树',fruit:!blossom,x,z,group:g});}
 house(x,z,w,d,name,roof=0x4c6062){const g=new T.Group();g.position.set(x,0,z);this.scene.add(g);const base=`house:${x}:${z}`,owner='inn';
 const part=(id,title,material,hp,build,collision=false)=>{const p=new T.Group();g.add(p);build(p);const a=this.registerObject(p,base+':'+id,name+' · '+title,material,hp,{kind:id==='door'?'door':'building',owner});if(collision)this.obstacles.push({id:a.id,x:a.x,z:a.z,w:a.w,d:a.d});return p;};
 part('foundation','台基','stone',1800,p=>box(p,w+.5,.25,d+.5,0x929887,0,.13,0));
 part('back','后墙','stone',1200,p=>box(p,w,2.8,.25,0xd0bda0,0,1.6,-d/2),true);
 for(const side of [-1,1])part(side<0?'west':'east',side<0?'西墙':'东墙','stone',1200,p=>box(p,.25,2.8,d,0xd0bda0,side*w/2,1.6,0),true);
 for(const side of [-1,1])part('front'+side,side<0?'门左墙':'门右墙','stone',900,p=>{box(p,(w-1.5)/2,2.8,.25,0xd0bda0,side*(w+1.5)/4,1.6,d/2);},true);
 part('lintel','门楣','stone',650,p=>box(p,1.5,.65,.25,0xd0bda0,0,2.68,d/2));
 part('door','木门','wood',220,p=>box(p,1.4,2.1,.12,0x493b32,0,1.2,d/2+.04),true);
 for(const xx of [-w*.32,w*.32])part('window'+xx,'木窗','wood',120,p=>{box(p,1.1,1.2,.1,0x625b48,xx,1.85,d/2+.19);for(let k=-2;k<=2;k++)box(p,.045,1.2,.13,0xc0ae88,xx+k*.2,1.85,d/2+.23);});
 for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])part('post'+xx+':'+zz,'梁柱','wood',400,p=>box(p,.18,3.2,.18,0x604b3c,xx,1.7,zz));
 part('roof','瓦顶','stone',1600,p=>{for(const sign of [-1,1]){const shape=new T.Shape();shape.moveTo(0,4.3);shape.lineTo(sign*(d/2+.8),3.05);shape.lineTo(sign*(d/2+1),3.18);shape.lineTo(sign*(d/2+.8),2.9);shape.lineTo(0,4.12);const geometry=new T.ExtrudeGeometry(shape,{depth:w+1.5,bevelEnabled:false,steps:1});const slope=mesh(geometry,roof,p,-(w+1.5)/2,0,0);slope.rotation.y=Math.PI/2;}
 for(let i=0;i<9;i++){const zz=(i-4)*(d+1.4)/8,yy=4.3-Math.abs(zz)*1.25/(d/2+.8);box(p,w+1.5,.055,.07,0x3e5557,0,yy+.03,zz);}box(p,w-1,.2,.22,0x384f50,0,4.3,0);});
 part('sign','招牌','wood',90,p=>{box(p,2,.45,.1,0x3b4b42,0,2.75,d/2+.2);const sign=textSprite(name,'#efd7a0',42);sign.position.set(0,2.78,d/2+.3);sign.scale.set(2.4,.45,1);p.add(sign);});
 for(const side of [-1,1])part('lantern'+side,'灯笼','paper',35,p=>this.lantern(p,side*1.55,2.6,d/2+.5));
 }
 table(x,z,id,feast=false){const g=new T.Group();g.position.set(x,0,z);this.scene.add(g);box(g,1.8,.14,1,0x806047,0,.91,0);for(const xx of [-.65,.65])for(const zz of [-.32,.32])box(g,.1,.85,.1,0x604c3b,xx,.43,zz);if(feast)box(g,1.7,.025,.4,0xae5245,0,1,0);for(const xx of [-.5,0,.5]){cyl(g,.14,.1,.06,0xc5c9b4,xx,1.04,.12);cyl(g,.06,.05,.13,0xcccbb8,xx,1.08,-.22);}this.props.push({id,group:g,hp:2,x,z});this.registerObject(g,id,'木桌与杯盘','wood',80,{kind:'table',owner:'inn'});return g;}
 build(){
 box(this.scene,100,.4,100,0x7e967b,0,-.3,0);box(this.scene,27,.12,45,0xb3b49b,0,-.06,0);box(this.scene,38,.13,5,0xbfc1aa,-4,-.025,12);
 const geo=new T.BoxGeometry(.88,.035,.63),paving=new T.InstancedMesh(geo,material(0xacae9b),1050);const dummy=new T.Object3D();let i=0;for(let x=-11;x<=11;x++)for(let z=-19;z<=25;z++){dummy.position.set(x+(z%2)*.45,.015,z*.82);dummy.rotation.y=((x*17+z*3)%5)*.025;dummy.updateMatrix();paving.setMatrixAt(i++,dummy.matrix);}paving.count=i;paving.receiveShadow=true;this.scene.add(paving);
 this.water=box(this.scene,7,.08,95,0x5f979b,-22,-.12,0);this.water.material=new T.MeshStandardMaterial({color:0x518b90,metalness:.45,roughness:.28,transparent:true,opacity:.87});
 for(const x of [-26,-18])for(let z=-27;z<=27;z+=6){const bank=box(this.scene,.7,.55,6,0x8e9989,x,.03,z);this.registerObject(bank,`bank:${x}:${z}`,'河岸石栏','stone',700);}
 const bridge=new T.Group();bridge.position.set(-22,.35,12);this.scene.add(bridge);box(bridge,9,.3,4.3,0xbac0ad);for(const z of [-1.9,1.9]){box(bridge,9,.15,.16,0x938b6f,0,.85,z);for(let x=-4;x<=4;x++)cyl(bridge,.11,.14,1.2,0xaaa58a,x,.45,z);}
 this.registerObject(bridge,'bridge','石桥与桥栏','stone',2400);
 this.house(-11,-12,7,6,'听雨楼');this.house(12,-13,6,5,'回春堂');this.house(-12,3,5,5,'墨香斋');this.house(13,5,5,5,'云来客栈');this.house(-10,21,6,4,'临溪人家');this.house(11,21,6,4,'青竹会');this.house(0,-23,8,5,'镇公所');
 for(const [x,z,b,s]of [[-6,-9,true,1.2],[7,-10,true,1.1],[-16,10,false,1.2],[8,10,true,1.1],[-14,-21,false,1.6],[17,-5,false,1.5],[18,17,true,1.4],[-17,22,true,1.2],[-31,3,false,1.6]])this.tree(x,z,b,s);
 for(let k=0;k<10;k++){const x=-38+k*8,z=-45-Math.sin(k*2)*9;mesh(new T.ConeGeometry(10+(k%3)*3,16+(k%4)*5,5),[0x789491,0x879e99,0x94aaa3][k%3],this.scene,x,3,z);}
 for(const [x,z]of [[8,-5],[-7,8],[7,17]]){const g=new T.Group();g.position.set(x,0,z);this.scene.add(g);box(g,2.8,.18,1.5,0x917858,0,.9,0);for(const xx of [-1.3,1.3])box(g,.1,2.8,.1,0x5e5140,xx,1.4,0);box(g,3.1,.13,2,0x9a6555,0,2.7,0);const foods=[];for(let i=-2;i<=2;i++)foods.push(mesh(new T.SphereGeometry(.14,7,6),0xd8a45c,g,i*.35,1.1,0));this.environmentAssets.push({id:`stall:${x}:${z}`,kind:'stall',name:'食摊',owner:'inn',x,z,group:g,foods});this.obstacles.push({id:`stall:${x}:${z}`,x,z,w:2.8,d:1.5});}
 for(const x of [-5,5])for(const z of [-15,9,19]){const pole=new T.Group();pole.position.set(x,0,z);this.scene.add(pole);cyl(pole,.06,.08,3.4,0x675340,0,1.7,0);box(pole,.8,.07,.08,0x675340,.3,3.38,0);this.lantern(pole,.6,3.08,0);this.registerObject(pole,`lamp:${x}:${z}`,'街边灯柱','wood',100);}
 for(let j=0;j<14;j++){const x=(j%2?-1:1)*(15+(j%4)*1.5),z=-18+j*3;const rock=mesh(new T.DodecahedronGeometry(.35+(j%3)*.18),0x859082,this.scene,x,.2,z);this.registerObject(rock,'rock:'+j,'路边石块','stone',260);}
 this.petals=[];for(let i=0;i<28;i++){const leaf=mesh(new T.PlaneGeometry(.09,.16),0xe4b6a8,this.scene,7+Math.sin(i)*5,1+(i%7)*.5,7+Math.cos(i)*5);leaf.material.side=T.DoubleSide;this.petals.push(leaf);}
 this.table(7,13,'tea-table');this.table(-7,10,'street-table');
 const gate=new T.Group();gate.position.set(0,0,23);this.scene.add(gate);for(const x of [-3,3]){box(gate,.32,4.6,.32,0x685447,x,2.3,0);box(gate,.6,.3,.6,0x999c88,x,.15,0);}box(gate,7,.5,.4,0x776044,0,4.5,0);box(gate,7.5,.25,1.2,0x435e5d,0,4.9,0);const sign=textSprite('临 溪 镇');sign.position.set(0,4.55,.28);gate.add(sign);this.registerObject(gate,'town-gate','临溪牌坊','wood',900);
 }
 syncEvent(){
 const e=this.sim.event;this.eventGroup.clear();for(const p of this.props.filter(p=>p.id.startsWith('feast')))this.scene.remove(p.group);this.props=this.props.filter(p=>!p.id.startsWith('feast'));this.environmentAssets=this.environmentAssets.filter(p=>!p.id.startsWith('feast'));
 for(const n of this.npcs.values()){n.base.set(n.person.x,0,n.person.z);n.wanderTarget=null;n.attending=false;n.dispersing=false;n.restUntil=0;}
 if(!e){this.sceneId=null;for(const [i,id]of ['shen','su','gao'].entries()){const n=this.npcs.get(id);n.base.set(-8+i*8,0,10+i*2);n.dispersing=true;}return;}this.sceneId=e.id;const [x,z]=SCENES[e.type].point;
 for(const [i,id]of ['shen','su','gao'].entries()){const n=this.npcs.get(id);n.base.set(x+(i-1)*1.6,0,z+(i===2?1.8:0));n.actor.position.copy(n.base);n.actor.rotation.y=i===0?Math.PI/2:-Math.PI/2;}
 if(['banquet','truce'].includes(e.type)){for(let i=0;i<3;i++)this.table(x+(i-1)*2.5,z+2.3,'feast-'+i,true);for(const [i,id]of ['tea','porter','elder'].entries()){const guest=this.npcs.get(id);guest.base.set(x-3+i*3,0,z-1.5);guest.actor.position.copy(guest.base);}}
 if(e.type==='proposal'){const ring=mesh(new T.TorusGeometry(.12,.027,8,20),0xe9c778,this.eventGroup,x-.6,1.3,z+.2);ring.rotation.x=.6;this.ring=ring;}
 }
 collides(x,z,feet=0){return Math.abs(x)>31||Math.abs(z)>29||(x> -26&&x< -18&&Math.abs(z-12)>1.65)||(feet<1.05&&this.props.some(p=>!this.sim.s.broken.includes(p.id)&&this.sim.s.ecosystem?.objects[p.id]?.hp!==0&&Math.abs(x-p.x)<1.15&&Math.abs(z-p.z)<.8))||this.obstacles.some(o=>this.sim.s.ecosystem?.objects[o.id]?.hp!==0&&Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3);}
 move(actor,dx,dz){if(!this.collides(actor.position.x+dx,actor.position.z,actor.position.y))actor.position.x+=dx;if(!this.collides(actor.position.x,actor.position.z+dz,actor.position.y))actor.position.z+=dz;}
 nearest(){let nearest=null,d=3.3;for(const [id,n]of this.npcs){const dist=n.actor.position.distanceTo(this.hero.position);if(dist<d){nearest={id,npc:n,distance:dist};d=dist;}}return nearest;}
 nearbyEvent(){const e=this.sim.event;if(!e)return false;const [x,z]=SCENES[e.type].point;return Math.hypot(x-this.hero.position.x,z-this.hero.position.z)<4.3;}
 routeTo(point,arrivalRadius=2.7){
 const start=[Math.round(this.hero.position.x),Math.round(this.hero.position.z)],end=point.map(Math.round),q=[start],seen=new Map([[start.join(','),null]]);let goal;
 for(let i=0;i<q.length&&i<4000;i++){const p=q[i];if(Math.hypot(p[0]-end[0],p[1]-end[1])<arrivalRadius){goal=p;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz],key=n.join(',');if(!seen.has(key)&&!this.collides(...n)){seen.set(key,p);q.push(n);}}}
 if(!goal)return false;const route=[];for(let p=goal;p;p=seen.get(p.join(',')))route.unshift(p);this.auto=route.slice(1);return true;
 }
 jump(){if(this.hero.position.y<.02&&!this.locked){this.jumpV=7;this.onSound?.('jump');}}
 get combatReady(){return this.readyUntil===Infinity;}
 toggleWeapon(){if(!this.playing||this.locked||this.performance||this.sim.s.player.hp<=0)return;this.readyUntil=this.combatReady?0:Infinity;this.onReady?.();}
 clearReady(){this.readyUntil=0;}
 primaryAction(e){
 if(!this.playing||this.locked||this.performance||this.sim.s.player.hp<=0)return;
 if(this.combatReady)this.attack();else this.onSelectObject?.(e);
 }
 resetAfterRest(){
 this.clearReady();this.performance=null;this.attackTime=0;this.jumpV=0;this.auto=null;this.keys.clear();this.reaction=null;
 this.hero.position.set(0,0,14);this.sim.s.player.x=0;this.sim.s.player.z=14;
 for(const n of this.npcs.values()){n.nextHit=0;n.actor.position.copy(n.base);}
 }
 attack(objectId=null){if(!this.combatReady||this.performance||this.attackTime>0||this.sim.s.player.energy<8||this.locked||this.sim.s.player.hp<=0)return;this.attackTime=.48;this.sim.s.player.energy-=8;this.onSound?.('attack');const h=this.hero.position,front=new T.Vector3(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y));
 this.burst(h.x+front.x,1,h.z+front.z,0xdfd2a2,8);
 const targets=[...this.npcs].filter(([id,n])=>{const d=n.actor.position.clone().sub(h);return d.length()<2.6&&d.normalize().dot(front)>.1&&this.sim.s.people[id].hp>0;}).sort((a,b)=>a[1].actor.position.distanceTo(h)-b[1].actor.position.distanceTo(h));
 if(this.ecology?.hit(front,objectId?Infinity:targets[0]?.[1].actor.position.distanceTo(h)??Infinity,objectId))return;
 if(objectId)return;
 if(targets.length){const [id,n]=targets[0],witnesses=[...this.npcs].filter(([,v])=>v.actor.position.distanceTo(h)<10).map(([id])=>id);this.sim.attack(id,witnesses);this.burst(n.actor.position.x,1,n.actor.position.z,0xdba77e,10);}
 else for(const prop of this.props){const d=new T.Vector3(prop.x,0,prop.z).sub(h);if(d.length()<2.8&&d.normalize().dot(front)>.1&&!this.sim.s.broken.includes(prop.id)){prop.hp--;if(prop.hp<=0){this.sim.breakProp(prop.id);this.burst(prop.x,1,prop.z,0xa28152,18);}break;}}
 }
 perform(action,targetId){
 this.clearReady();this.auto=null;this.attackTime=0;
 this.actionStool.position.copy(this.hero.position);this.actionStool.rotation.y=this.hero.rotation.y;
 if(motionFor(action)==='flourish'&&this.hero.position.y<.02)this.jumpV=5;
 this.performance={motion:motionFor(action),start:this.t,duration:action.kind==='eat'?3.6:2.6,targetId,camera:true};
 }
 interactionPoint(id){
 if(id==='scene'&&this.sim.event){const [x,z]=SCENES[this.sim.event.type].point;return new T.Vector3(x,1.7,z);}
 return this.npcs.get(id)?.actor.position.clone().add(new T.Vector3(0,1.6,0));
 }
 screenPoint(point){const p=point.clone().project(this.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,visible:p.z>=-1&&p.z<=1};}
 animatePerformance(speed,dt){
 const a=this.performance,u=this.hero.userData;if(!a)return;
 const age=this.t-a.start;if(age>=a.duration||this.sim.s.player.hp<=0){this.performance=null;this.onPerformanceEnd?.();return;}
 const blend=Math.min(1,age/.22,(a.duration-age)/.3),wave=Math.sin(age*7),mix=(part,key,value)=>part.rotation[key]=T.MathUtils.lerp(part.rotation[key],value,blend);
 const target=this.npcs.get(a.targetId)?.actor;
 if(target&&!speed)this.hero.rotation.y=turnToward(this.hero.rotation.y,Math.atan2(target.position.x-this.hero.position.x,target.position.z-this.hero.position.z),dt);
 switch(a.motion){
 case 'gamble':mix(u.arms[0],'x',-1.5);mix(u.arms[1],'x',-1.3+wave*.3);mix(u.arms[1],'z',.6);break;
 case 'listen':mix(u.arms[0],'x',-.45);mix(u.arms[1],'x',-.5);mix(u.rig,'x',.12+Math.sin(age*3)*.04);break;
 case 'observe':mix(u.arms[1],'x',-2.4);mix(u.arms[1],'z',.25);mix(u.rig,'x',.18);break;
 case 'guard':mix(u.arms[0],'z',-1.15);mix(u.arms[1],'z',1.15);mix(u.arms[0],'x',-.35);mix(u.arms[1],'x',-.35);break;
 case 'recite':mix(u.arms[0],'x',-.8);mix(u.arms[1],'x',-1.6);mix(u.arms[1],'z',.45+Math.sin(age*2)*.2);break;
 case 'invite':mix(u.arms[1],'x',-.8);mix(u.arms[1],'z',1+wave*.12);mix(u.rig,'z',-.1);break;
 case 'lift':mix(u.arms[0],'x',-.7-Math.sin(Math.PI*age/a.duration)*.9);mix(u.arms[1],'x',-.7-Math.sin(Math.PI*age/a.duration)*.9);mix(u.rig,'x',.25);break;
 case 'tie':mix(u.arms[0],'x',-1.1+wave*.08);mix(u.arms[1],'x',-1.1-wave*.08);mix(u.arms[0],'z',-.6);mix(u.arms[1],'z',.6);break;

 case 'eat':case 'drink':mix(u.arms[1],'x',-2.2+wave*.24);mix(u.arms[0],'x',-1.1);if(!speed&&a.motion==='eat'&&this.actionStool.position.distanceTo(this.hero.position)<.3){u.rig.position.y-=.34*blend;mix(u.legs[0],'x',-1.1);mix(u.legs[1],'x',-1.1);}break;
 case 'bow':mix(u.rig,'x',.4*Math.sin(Math.PI*age/a.duration));mix(u.arms[0],'x',-1.1);mix(u.arms[1],'x',-1.1);mix(u.arms[0],'z',-.5);mix(u.arms[1],'z',.5);break;
 case 'clap':mix(u.arms[0],'x',-1.25);mix(u.arms[1],'x',-1.25);mix(u.arms[0],'z',-.7+wave*.2);mix(u.arms[1],'z',.7-wave*.2);break;
 case 'reach':case 'offer':mix(u.arms[1],'x',-1.55+Math.sin(age*3)*.25);mix(u.rig,'x',.15);break;
 case 'force':mix(u.arms[1],'x',-1.8+Math.sin(age*5)*.7);mix(u.arms[0],'x',-.9);mix(u.rig,'z',Math.sin(age*5)*.12);break;
 case 'sword':case 'flourish':mix(u.arms[1],'x',-1.5);mix(u.arms[1],'z',Math.sin(age*6)*1.4);mix(u.arms[0],'z',-.9);break;
 case 'flute':mix(u.arms[0],'x',-2);mix(u.arms[1],'x',-2);mix(u.arms[0],'z',-.4);mix(u.arms[1],'z',.6);break;
 default:mix(u.arms[1],'x',-.9+wave*.15);mix(u.arms[0],'x',-.4);mix(u.rig,'x',.06*Math.sin(age*3));
 }
 }
 burst(x,y,z,color,count){for(let i=0;i<count;i++){const m=mesh(new T.BoxGeometry(.05,.05,.22),color,this.scene,x,y,z);this.particles.push({m,life:.6,v:new T.Vector3((Math.random()-.5)*6,Math.random()*4,(Math.random()-.5)*6)});}}
 updateAmbientNpc(n,dist,dt){
 const a=n.actor;
 // Different enter/leave radii prevent walking and facing from alternating at the boundary.
 n.attending=n.attending?dist<4:dist<2.8;
 if(n.attending){
 n.wanderTarget=null;n.restUntil=this.t+1;
 const dx=this.hero.position.x-a.position.x,dz=this.hero.position.z-a.position.z;
 if(Math.hypot(dx,dz)>.5)a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);
 return 'talk';
 }
 if(this.t<(n.restUntil||0))return '';
 if(!n.wanderTarget){
 n.wanderIndex=(n.wanderIndex||0)+1;const angle=n.phase+n.wanderIndex*2.399;
 n.wanderTarget=n.base.clone().add(new T.Vector3(Math.sin(angle)*2.2,0,Math.cos(angle)*1.4));n.stalled=0;
 }
 const dir=n.wanderTarget.clone().sub(a.position),distance=dir.length();
 if(distance<.2){n.wanderTarget=null;n.restUntil=this.t+2+(n.phase%2);return '';}
 dir.normalize();a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);
 const heading=new T.Vector3(Math.sin(a.rotation.y),0,Math.cos(a.rotation.y));
 const step=arriveStep(distance,.7,dt,.18)*Math.max(0,heading.dot(dir));
 const previous=a.position.clone();this.move(a,dir.x*step,dir.z*step);
 n.stalled=a.position.distanceTo(previous)<.0001?(n.stalled||0)+dt:0;
 if(n.stalled>1.2){n.wanderTarget=null;n.restUntil=this.t+2;}
 return '';
 }
 animateActor(actor,speed,dt,gesture=''){const u=actor.userData;u.gait=(u.gait||0)+(speed-(u.gait||0))*(1-Math.exp(-12*dt));speed=u.gait;u.walkTime=(u.walkTime||0)+dt*8*Math.max(.25,speed);const t=u.walkTime+u.phase;u.legs.forEach((l,i)=>l.rotation.x=Math.sin(t+i*Math.PI)*speed*.6);u.arms.forEach((a,i)=>{a.rotation.x=Math.sin(t+i*Math.PI)*speed*.45;a.rotation.z=(i?1:-1)*.08;});u.rig.position.y=Math.abs(Math.sin(t))*speed*.04;u.rig.rotation.z=0;u.rig.rotation.x=0;
 // NPC steps follow actual distance travelled: the planted foot moves back
 // relative to the body, and only the returning foot lifts off the ground.
 if(!u.isHero){
  const velocity=Math.max(0,speed*2),stride=.62+Math.min(velocity,3)*.11;
  u.stepPhase=((u.stepPhase??u.phase/(Math.PI*2))+velocity*dt/stride)%1;
  const weight=Math.min(1,speed*5),bob=Math.sin(u.stepPhase*Math.PI*4)*.012*weight;
  u.rig.position.y=bob;
  u.legs.forEach((leg,i)=>{
   const phase=(u.stepPhase+i*.5)%1,stance=.58;
   const swing=Math.max(0,(phase-stance)/(1-stance));
   const halfStep=stride*stance*.5;
   const footZ=phase<stance?halfStep*(1-2*phase/stance):-halfStep*Math.cos(swing*Math.PI);
   const angle=-Math.asin(Math.max(-.9,Math.min(.9,footZ/.4)))*weight;
   leg.rotation.x=angle;
   leg.position.y=.5-bob-(.4-.4*Math.cos(angle))+Math.sin(swing*Math.PI)*.11*weight;
  });
  u.arms.forEach((arm,i)=>arm.rotation.x=Math.sin((u.stepPhase+i*.5)*Math.PI*2)*.32*weight);
 }
 u.talkWeight=(u.talkWeight||0)+(Number(gesture==='talk')-(u.talkWeight||0))*(1-Math.exp(-7*dt));u.arms[1].rotation.x=T.MathUtils.lerp(u.arms[1].rotation.x,-.6+Math.sin(this.t*3)*.16,u.talkWeight);if(gesture==='down'){u.rig.rotation.z=1.4;u.rig.position.y=-.65;}
 }
 update(dt){
 this.t+=dt;const s=this.sim.s;if(this.locked||s.player.hp<=0)this.clearReady();this.attackTime=Math.max(0,this.attackTime-dt);let dx=0,dz=0,speed=0;
 if(!this.locked&&s.player.hp>0){const k=this.keys;let sx=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0),sz=(k.has('KeyS')?1:0)-(k.has('KeyW')?1:0);
 if(sx||sz)this.auto=null;
 if(this.auto?.length){const [x,z]=this.auto[0],d=Math.hypot(x-this.hero.position.x,z-this.hero.position.z);if(d<.3)this.auto.shift();else{dx=(x-this.hero.position.x)/d;dz=(z-this.hero.position.z)/d;}}
 else if(this.auto){this.auto=null;this.onArrive?.();}
 if(sx||sz){const len=Math.hypot(sx,sz);sx/=len;sz/=len;dx=sx*Math.cos(this.yaw)+sz*Math.sin(this.yaw);dz=-sx*Math.sin(this.yaw)+sz*Math.cos(this.yaw);}
 speed=dx||dz?(k.has('ShiftLeft')&&s.player.energy>1?6.2:3.3):0;
 if(speed>4)s.player.energy=Math.max(0,s.player.energy-dt*5);else if(!(this.performance?.motion==='flute'&&this.performance.duration===3600))s.player.energy=Math.min(100,s.player.energy+dt*3);
 this.move(this.hero,dx*speed*dt,dz*speed*dt);if(speed)this.hero.rotation.y=Math.atan2(dx,dz);
 }
 this.jumpV-=18*dt;this.hero.position.y=Math.max(0,this.hero.position.y+this.jumpV*dt);if(this.hero.position.y===0)this.jumpV=0;
 this.animateActor(this.hero,speed?1:0,dt,s.player.hp<=0?'down':'');if(this.combatReady){this.hero.userData.arms[1].rotation.x=-.7;this.hero.userData.arms[1].rotation.z=.35;}if(this.attackTime){this.hero.userData.arms[1].rotation.x=-1.5;this.hero.userData.arms[1].rotation.z=-2+this.attackTime*7;}
 this.animatePerformance(speed,dt);this.actionCoins.visible=this.performance?.motion==='gamble';this.actionBowl.visible=!!this.performance&&['eat','drink'].includes(this.performance.motion);this.actionFlute.visible=this.performance?.motion==='flute';this.actionStool.visible=this.performance?.motion==='eat'&&!speed&&this.actionStool.position.distanceTo(this.hero.position)<.3;this.hero.userData.sword.visible=this.combatReady||this.performance?.motion==='sword';
 s.player.x=this.hero.position.x;s.player.z=this.hero.position.z;
 if(this.sceneId!==this.sim.event?.id&&this.sim.event)this.syncEvent();
 for(const [id,n]of this.npcs){const state=s.people[id],a=n.actor;let moving=0,gesture='';const beforeMove=a.position.clone(),dist=Math.hypot(a.position.x-this.hero.position.x,a.position.z-this.hero.position.z);
 n.chasing=this.playing&&this.sim.isPursuing(id,dist-(n.chasing?2:0));n.fleeing=state.fear>0&&(n.fleeing?dist<10:dist<7);
 if(state.hp<=0){gesture='down';}
 else if(n.chasing){
  const dir=this.hero.position.clone().sub(a.position);dir.y=0;dir.normalize();a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);const step=arriveStep(dist,2,dt,1.2);this.move(a,dir.x*step,dir.z*step);moving=1;gesture='talk';
  if(dist<1.6&&this.t>(n.nextHit||0)){n.nextHit=this.t+1.5;s.player.hp=Math.max(0,s.player.hp-(id==='guard'?9:4));this.burst(this.hero.position.x,1,this.hero.position.z,0xb85f47,6);this.onHurt?.();}
 }else if(n.fleeing){const dir=a.position.clone().sub(this.hero.position).normalize();this.move(a,dir.x*3*dt,dir.z*3*dt);a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);moving=1;}
 else if(this.ecology?.steer(id,dt)){}
 else if(n.dispersing){const dir=n.base.clone().sub(a.position);dir.y=0;const distance=dir.length();if(distance<.2)n.dispersing=false;else{dir.normalize();a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);const step=arriveStep(distance,1.3,dt);this.move(a,dir.x*step,dir.z*step);}}
 else if(['shen','su','gao'].includes(id)&&this.sim.event?.type==='inquiry'){gesture=this.updateAmbientNpc(n,20,dt);}
 else if(['shen','su','gao'].includes(id)&&this.sim.event){const dir=n.base.clone().sub(a.position);if(dir.length()>.13){const step=arriveStep(dir.length(),1.3,dt);dir.normalize();this.move(a,dir.x*step,dir.z*step);a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);moving=.6;}else gesture='talk';}
 else {gesture=this.updateAmbientNpc(n,dist,dt);}
 moving=Math.min(1.5,a.position.distanceTo(beforeMove)/Math.max(dt,.001)/2);
 if(this.speaking===id&&state.hp>0)gesture='talk';this.animateActor(a,moving,dt,gesture);if(this.reaction&&this.t<this.reaction.until&&['shen','su'].includes(id)&&state.hp>0){if(this.reaction.success&&['support','eat','favor'].includes(this.reaction.kind)){a.userData.arms[0].rotation.x=-1.1;a.userData.arms[1].rotation.x=-1.1;}else if(!this.reaction.success){a.userData.rig.rotation.z=Math.sin(this.t*5)*.08;a.userData.arms[1].rotation.x=-.7;}}n.kneel=(n.kneel||0)+(Number(id==='shen'&&this.sim.event?.type==='proposal'&&moving===0&&!state.fear&&state.mood!=='angry')-(n.kneel||0))*(1-Math.exp(-8*dt));if(n.kneel>.001){a.userData.rig.position.y-=.25*n.kneel;a.userData.legs[0].rotation.x=T.MathUtils.lerp(a.userData.legs[0].rotation.x,-1.1,n.kneel);a.userData.arms[1].rotation.x=T.MathUtils.lerp(a.userData.arms[1].rotation.x,-1.2,n.kneel);}
 this.ecology?.pose(id);n.label.visible=dist<12;n.label.material.opacity=Math.min(1,(13-dist)/3);
 }
 if(this.ring)this.ring.visible=!s.facts.missing;
 for(const p of this.props)p.group.visible=!s.broken.includes(p.id)&&s.ecosystem?.objects[p.id]?.hp!==0;
 for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.m.position.addScaledVector(p.v,dt);p.v.y-=10*dt;p.m.rotation.x+=dt*8;if(p.life<=0){this.scene.remove(p.m);p.m.geometry.dispose();this.particles.splice(i,1);}}
 for(const [i,leaf]of this.petals.entries()){leaf.position.y-=dt*.2;leaf.position.x+=Math.sin(this.t+i)*dt*.12;leaf.rotation.x=this.t+i;if(leaf.position.y<.1)leaf.position.y=4;}
 const perf=this.performance,shot=perf?.camera?Math.sin(Math.PI*Math.min(1,(this.t-perf.start)/perf.duration))*.28:0,viewYaw=this.yaw+shot,viewDistance=this.distance*(1-shot*.6);
 const target=this.hero.position.clone().add(new T.Vector3(0,1.1,0)),offset=new T.Vector3(Math.sin(viewYaw)*Math.cos(this.pitch)*viewDistance,Math.sin(this.pitch)*viewDistance,Math.cos(viewYaw)*Math.cos(this.pitch)*viewDistance);
 this.camera.position.lerp(target.clone().add(offset),1-Math.exp(-dt*6));this.camera.lookAt(target);this.renderer.render(this.scene,this.camera);
 }
}
