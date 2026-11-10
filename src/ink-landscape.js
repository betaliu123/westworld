import * as T from '../vendor/three.module.js';

const images = new T.TextureLoader();
const surfaces = new Map();
function texture(file) {
  if (!globalThis.document?.createElementNS) return new T.Texture();
  const map = images.load(new URL('./art/' + file, import.meta.url).href);
  map.colorSpace = T.SRGBColorSpace;
  return map;
}

export function paintedSurface(name, tiles = 1) {
  const key = name + tiles;
  if (!surfaces.has(key)) {
    const map = texture(name + '.jpg');
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.repeat.set(tiles, tiles);
    map.anisotropy = 4;
    surfaces.set(key, new T.MeshStandardMaterial({map, roughness: 1}));
  }
  return surfaces.get(key);
}

export function landscape(scene) {
  const map = texture('mountain-wash.jpg');
  map.wrapS = T.RepeatWrapping;
  const horizon = new T.Mesh(new T.CylinderGeometry(120, 120, 95, 96, 1, true),
    new T.MeshBasicMaterial({map, side: T.BackSide, fog: false, toneMapped: false, depthWrite: false}));
  horizon.position.y = 9;
  horizon.renderOrder = -10;
  distant(horizon, 'horizon-genyue.webp', 117, Math.PI - .35, 37.9, 26, -1, -9, .82);
  distant(horizon, 'horizon-capital.webp', 115, Math.PI, 52, 8.5, -1, -8, .9);
  scene.add(horizon);
  return horizon;
}

// A painted cut-out hung inside the horizon scroll, facing world angle `heading`; bottom is local to the scroll.
function distant(horizon, file, radius, heading, width, tall, bottom, order, opacity) {
  const arc = width / radius;
  const layer = new T.Mesh(new T.CylinderGeometry(radius, radius, tall, 24, 1, true, heading - arc / 2, arc),
    new T.MeshBasicMaterial({map: texture(file), side: T.BackSide, transparent: true, opacity, fog: false, toneMapped: false, depthWrite: false}));
  layer.position.y = bottom + tall / 2;
  layer.renderOrder = order;
  horizon.add(layer);
}

function stroke(parent, start, end, radius, tip, material) {
  const direction = end.clone().sub(start);
  const stick = new T.Mesh(new T.CylinderGeometry(tip, radius, direction.length(), 7), material);
  stick.position.copy(start).lerp(end, .5);
  stick.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), direction.normalize());
  parent.add(stick);
}

let needles;
export function pine(group, seed) {
  needles ??= new T.MeshLambertMaterial({map: texture('pine-spray.png'), alphaTest:.4, side:T.DoubleSide});
  const bark = paintedSurface('timber');
  const V = (x,y,z) => new T.Vector3(x,y,z);
  const trunk = [V(0,0,0),V(.14,1.35,0),V(-.24,2.45,.09),V(.24,3.1,.17),V(.38,3.8,.28)];
  trunk.slice(1).forEach((end,i)=>stroke(group,trunk[i],end,.19-i*.038,.15-i*.034,bark));
  const canopy = new T.InstancedMesh(new T.PlaneGeometry(1,1),needles,39);
  const tuft=new T.Object3D();
  for(let i=0;i<13;i++){
    const a = seed+i*2.4, h=1.6+i*.17, reach=1.78-i*.08;
    const start=V(i<6?0:.12,h,0), elbow=V(Math.cos(a)*reach*.55,h-.12,Math.sin(a)*reach*.55);
    const end=V(Math.cos(a)*reach,h+.34,Math.sin(a)*reach);
    stroke(group,start,elbow,.09,.055,bark); stroke(group,elbow,end,.055,.016,bark);
    for(let j=0;j<3;j++){
      
      tuft.position.copy(end);tuft.rotation.set(-.35,j*Math.PI/3+a,Math.sin(i)*.08);
      tuft.scale.set(1.85+reach*.45,.85,1);tuft.updateMatrix();canopy.setMatrixAt(i*3+j,tuft.matrix);
    }
  }
  canopy.computeBoundingSphere();group.add(canopy);
}

export function garment(parent, profile, color, zScale=1, folds=.035) {
  const g=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),32);
  const pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),a=Math.atan2(x,z);
    const ripple=1+folds*Math.cos(a*9+.55*pos.getY(i));
    pos.setXYZ(i,x*ripple,pos.getY(i),z*ripple*zScale);
  }
  g.computeVertexNormals();
  const m=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide,bumpMap:paintedSurface('linen').map,bumpScale:.014}));
  m.castShadow=true;parent.add(m);return m;
}

// Raised ridge, curved eaves and painted rafters are attached to the destructible gate.
export function gateRoof(gate) {
  const width=8.3, depth=1.38, rows=8, cols=40;
  const tile=paintedSurface('slate',3);
  for (const side of [-1,1]){
    const verts=[],uv=[],idx=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const x=i/cols*2-1,t=j/rows;
      verts.push(x*width/2,5.75-.93*t+.24*t*t+.40*t*t*Math.pow(Math.abs(x),5),side*t*depth);
      uv.push(i/cols,j/rows);
      if(i&&j){const k=j*(cols+1)+i;idx.push(k,k-1,k-cols-2,k,k-cols-2,k-cols-1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const roof=new T.Mesh(g,tile);tile.side=T.DoubleSide;roof.castShadow=true;gate.add(roof);
  }
  const beam=paintedSurface('timber'), v=(x,y,z)=>new T.Vector3(x,y,z);
  for(const x of [-3,3])for(const z of [-.46,.46]){
    stroke(gate,v(x,3.74,0),v(x+Math.sign(x)*.63,4.47,z),.12,.12,beam);
    stroke(gate,v(x,4.2,0),v(x-Math.sign(x)*.92,4.62,z),.12,.12,beam);
  }
}

export function roadVerge(scene) {
  let seed = 8241;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const dummy = new T.Object3D();
  const flags = new T.InstancedMesh(new T.CylinderGeometry(1,1,.10,7),paintedSurface('limestone'),126);
  let count=0;
  for(let row=0;row<21;row++)for(let col=0;col<6;col++){
    dummy.position.set((col-2.5)*.96+rand()*.12,-.024+rand()*.012,21+row*.81);
    dummy.scale.set(.58+rand()*.12,.8,.48+rand()*.12);dummy.rotation.set(0,rand()*.45,0);
    dummy.updateMatrix();flags.setMatrixAt(count,dummy.matrix);
    flags.setColorAt(count++,new T.Color().setScalar(.72+rand()*.26));
  }
  flags.receiveShadow=true;scene.add(flags);
  const rocks=new T.Group();scene.add(rocks);
  // Keep the ribbon court (x 22, z 10) clear: actors stand/walk at ground level.
  for(const [x,z,span] of [[-16,34,3],[-16,40,4],[18,35,4],[22,28,3],[-30,20,6],[30,8,3]]){
    for(let i=0;i<6;i++){
      const g=new T.IcosahedronGeometry(1,1), pos=g.attributes.position;
      for(let j=0;j<pos.count;j++){
        const ax=pos.getX(j),ay=pos.getY(j),az=pos.getZ(j);
        const r=1+.14*Math.sin(4*ax+5*az+ay);
        pos.setXYZ(j,ax*r,Math.min(.74,ay*r),az*r);
      }
      g.computeVertexNormals();
      const rock=new T.Mesh(g,paintedSurface('limestone'));rock.position.set(x+(rand()-.5)*span,.03,z+(rand()-.5)*span);
      const size=.38+rand()*1.3;rock.scale.set(size*1.6,size,size);rock.rotation.y=rand()*6.28;rock.castShadow=rock.receiveShadow=true;rocks.add(rock);
    }
  }
  const grassGeo=new T.BufferGeometry();
  grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.035,0,0,.035,0,0,.13,.40,.04, 0,0,-.028,0,0,.028,-.10,.29,.07],3));
  grassGeo.computeVertexNormals();
  const stems=new T.InstancedMesh(grassGeo,new T.MeshLambertMaterial({color:0x847b57,side:T.DoubleSide}),1800);
  for(let i=0;i<1800;i++){
    const side=i%2?1:-1, band=Math.floor(i/24);
    dummy.position.set(side*(3.3+((band*17)%97)*.14)+rand(),-.07,22+(band%21)*.92+rand());
    dummy.rotation.set(0,rand()*6.28,0);dummy.scale.setScalar(.35+rand()*.9);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
  }
  scene.add(stems);
}

export function wantedSheet() {
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=280;
  const c=canvas.getContext('2d');
  if (!c?.fillRect) return paintedSurface('linen');
  c.fillStyle='#e1cda3';c.fillRect(0,0,384,280);
  c.strokeStyle='#75664c';c.lineWidth=2;c.strokeRect(9,9,366,262);
  c.fillStyle='#473b32';c.textAlign='center';c.font='bold 33px SimSun, serif';c.fillText('懸 賞 緝 拿',192,49);
  c.beginPath();c.moveTo(108,218);c.bezierCurveTo(114,187,137,182,148,176);c.lineTo(158,159);c.bezierCurveTo(137,144,140,85,169,83);c.bezierCurveTo(211,67,229,96,218,132);c.lineTo(209,153);c.lineTo(216,179);c.quadraticCurveTo(252,187,266,217);c.closePath();c.fill();
  c.fillStyle='#d5bc91';c.beginPath();c.moveTo(157,116);c.lineTo(184,97);c.lineTo(211,114);c.quadraticCurveTo(211,151,183,166);c.quadraticCurveTo(160,159,157,116);c.fill();
  c.strokeStyle='#554635';c.lineWidth=3;c.beginPath();c.moveTo(160,123);c.lineTo(174,126);c.moveTo(191,126);c.lineTo(205,121);c.moveTo(181,130);c.lineTo(178,143);c.lineTo(185,145);c.stroke();
  c.font='21px SimSun,serif';c.fillStyle='#473b32';c.fillText('燕 七',192,251);
  c.strokeStyle='#914a3d';c.strokeRect(288,200,43,43);c.font='25px SimSun';c.fillStyle='#914a3d';c.fillText('印',310,230);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map,roughness:1});
}

export function travelerMantle(rig) {
  const positions=[],uv=[],indices=[];
  const rows=14,cols=15;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const t=j/rows,u=i/cols*2-1;
    positions.push(u*(.22+t*.16)+.10*t*t,1.53-1.04*t+.065*Math.cos(i*2)*t**8,
      -.21-.13*t-.033*Math.cos(u*13+t)*t+.07*u*u);
    uv.push(i/cols,1-t);
    if(i&&j){const k=j*(cols+1)+i;indices.push(k,k-1,k-cols-2,k,k-cols-2,k-cols-1);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const cloth=new T.Mesh(g,new T.MeshStandardMaterial({map:paintedSurface('linen').map,color:0x85827a,side:T.DoubleSide,roughness:1}));
  cloth.castShadow=true;rig.add(cloth);rig.userData.travelCloth=cloth;
}

export function strawHat(head) {
  const hat=garment(head,[[.61,.39],[.62,.405],[.46,.445],[.24,.55],[.075,.63],[.024,.636]],0xb59767,1,.012);
  const straw=new T.MeshStandardMaterial({color:0x82643d,roughness:1});
  const loops=[];
  for(let j=0;j<7;j++){
    const r=.12+j*.078, y=.61-(r-.12)*.43;
    for(let i=0;i<48;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;loops.push(r*Math.sin(a),y,r*Math.cos(a),r*Math.sin(b),y,r*Math.cos(b));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(loops,3));hat.add(new T.LineSegments(geometry,new T.LineBasicMaterial({color:straw.color})));straw.dispose();return hat;
}

export function gateBanners(gate) {
  const silk=new T.MeshStandardMaterial({map:texture('gate-silk.jpg'),roughness:1,side:T.DoubleSide});
  const banners=[];
  for(const side of [-1,1]){
    const geo=new T.PlaneGeometry(.57,1.63,5,12);
    const flag=new T.Mesh(geo,silk);
    flag.position.set(side*2.73,3.46,.53);flag.castShadow=true;gate.add(flag);
    const base=geo.attributes.position.array.slice();banners.push({geo,base,side});
  }
  return banners;
}

export function windAtGate(banners,time) {
  for(const {geo,base,side} of banners){
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=base[3*i],y=base[3*i+1],hang=(.815-y)/1.63;
      p.setZ(i,hang*(.12*Math.sin(time*1.7+y*4+side)+.11*Math.sin(x*13+y)));
    }
    p.needsUpdate=true;
  }
}

// Profile rings narrow at the temples and chin. The hairline drops behind the ears.
export function portrait(head, female) {
  const skin=0xcb9d7c,ink=0x292729;
  garment(head,[[.047,-.065],[.105,-.038],[.155,.018],[.19,.107],[.20,.20],[.184,.29],[.122,.34],[.035,.36]],skin,.87,.009);
  const detail=(color,x,y,z,sx,sy,sz)=>{
    const m=new T.Mesh(new T.SphereGeometry(1,10,7),new T.MeshStandardMaterial({color,roughness:.98}));
    m.scale.set(sx,sy,sz);m.position.set(x,y,z);head.add(m);return m;
  };
  for(const side of [-1,1]){
    detail(skin,side*.187,.113,-.008,.031,.047,.022);
    const brow=detail(ink,side*.082,.171,.154,.050,.008,.009);
    brow.rotation.z=side*.09;
    detail(0x4a3731,side*.08,.146,.164,.033,.009,.008);
    detail(0x302826,side*.08,.145,.168,.013,.012,.008);
  }
  detail(skin,0,.108,.166,.030,.055,.033);
  detail(0x8d5e51,0,.048,.149,.043,.008,.009);
  const crown=garment(head,[[.207,.17],[.208,.22],[.19,.285],[.13,.34],[.04,.36]],ink,.91,.015);
  const p=crown.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const y=p.getY(i),back=(1-Math.cos(Math.atan2(p.getX(i),p.getZ(i))))*.5;
    p.setY(i,y+.061*(1-back)*Math.max(0,(.27-y)/.1)-back*.19*Math.max(0,(.28-y)/.11));
  }
  crown.geometry.computeVertexNormals();
  detail(ink,0,.36,-.047,.092,.089,.091);
  if(female)detail(ink,0,.095,-.139,.155,.216,.073);
}
