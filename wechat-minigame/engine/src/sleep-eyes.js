import * as T from '../vendor/three.module.js';
// The generated bodies have no eyelid bones. Fit small closed lids onto the
// face surface and sample its cheek UV, leaving the source texture untouched.
export function sleepEyes(rig,model,head,height,drop=.197,spacing=.035){
 const lids=[],ray=new T.Raycaster(),rootQ=rig.getWorldQuaternion(new T.Quaternion()),scale=height/1.9;
 rig.updateWorldMatrix(true,true);
 for(const side of [-1,1]){
  const local=new T.Vector3(side*spacing*scale,height-drop*scale,1);
  const origin=rig.localToWorld(local.clone()),direction=new T.Vector3(0,0,-1).applyQuaternion(rootQ);
  ray.set(origin,direction);const hit=ray.intersectObject(model,true).find(h=>h.object.isSkinnedMesh&&h.uv);if(!hit)continue;
  ray.set(rig.localToWorld(local.clone().add(new T.Vector3(0,-.034*scale,0))),direction);
  const cheek=ray.intersectObject(model,true).find(h=>h.object===hit.object&&h.uv)||hit;
  const geometry=new T.SphereGeometry(1,14,8),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,cheek.uv.x,cheek.uv.y);
  const source=Array.isArray(hit.object.material)?hit.object.material[0]:hit.object.material;
  const material=new T.MeshStandardMaterial({map:source.map,color:source.color,roughness:1});
  const lid=new T.Mesh(geometry,material);lid.scale.set(.024*scale,.012*scale,.003*scale);
  lid.position.copy(rig.worldToLocal(hit.point.clone())).z+=.0015;
  const group=new T.Group();group.position.copy(lid.position);lid.position.set(0,0,0);group.add(lid);
  const curve=new T.QuadraticBezierCurve3(new T.Vector3(-.02*scale,0,.0035*scale),new T.Vector3(0,-.006*scale,.005*scale),new T.Vector3(.02*scale,0,.0035*scale));
  group.add(new T.Mesh(new T.TubeGeometry(curve,8,.0012*scale,4,false),new T.MeshStandardMaterial({color:0x4f4b42,roughness:1})));
  rig.add(group);head.attach(group);group.visible=false;lids.push(group);
 }
 return weight=>{for(const lid of lids)lid.visible=weight>.8;};
}
