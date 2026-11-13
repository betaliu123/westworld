import * as T from '../vendor/three.module.js';

// One continuous, raycastable mesh for the stall, hand and dropped item.
// Profile: flat steamed base, soft belly, gathered pleats and pinched crown.
const profile=[[0,-.105],[.08,-.105],[.123,-.086],[.146,-.044],[.15,.005],[.139,.053],[.112,.089],[.076,.113],[.037,.13],[.016,.122],[0,.119]];
const geometry=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),64);
const p=geometry.attributes.position;
for(let i=0;i<p.count;i++){
 const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z),angle=Math.atan2(x,z);
 const top=T.MathUtils.smoothstep(y,.015,.12),fold=Math.pow((1+Math.cos(angle*10+top*.65))/2,4);
 const radius=r*(1-.12*top*fold);
 if(r>.0001)p.setXYZ(i,x*radius/r,y-.006*top*fold,z*radius/r);
}
geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
const dough=new T.MeshStandardMaterial({color:0xece3cf,roughness:1});
export function bunMesh(){const m=new T.Mesh(geometry,dough);m.scale.setScalar(.65);m.name='包子';m.userData.foodModel='bun';m.castShadow=true;m.receiveShadow=true;return m;}

// The generated stall's tabletop is lower than the temporary box. Set each
// real item on its surface after fitting, without raycasting the items themselves.
export function placeStallBuns(model,foods){
 const parent=model.parent,spots=[[-.55,.25],[-.45,.43],[-.25,.45],[-.3,.65],[-.1,.75]];
 parent.updateWorldMatrix(true,true);
 for(const [i,bun]of foods.entries()){
  const [x,z]=spots[i%spots.length],origin=parent.localToWorld(new T.Vector3(x,1.5,z));
  const hit=new T.Raycaster(origin,new T.Vector3(0,-1,0)).intersectObject(model,true).find(h=>h.object.visible);
  if(hit){const point=parent.worldToLocal(hit.point);bun.position.set(x,point.y+.105*bun.scale.y+.002,z);}
 }
}
