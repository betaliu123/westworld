import * as T from '../vendor/three.module.js';
import {clearCameraPosition} from './orbit-camera.js';

// A lesson needs both bodies and the prop in view. Physical collision alone misses
// the wide canopy of a tree whose trunk is narrow; score the rendered scenery too.
export function lessonCamera(world,teacher){
 const hero=world.hero.position,other=teacher?.position||hero;
 const focus=hero.clone().lerp(other,.5).setY(1.1);
 const along=other.clone().sub(hero).setY(0).normalize();
 const side=new T.Vector3(along.z,0,-along.x);if(!side.lengthSq())side.set(1,0,0);
 const scenery=world.environmentAssets.filter(a=>['tree','stall'].includes(a.kind)&&a.group.visible).map(a=>({asset:a,box:new T.Box3().setFromObject(a.group)}));
 const targets=[hero.clone().setY(1.2),other.clone().setY(1.2),focus];
 const ray=new T.Ray(),hit=new T.Vector3();let best=null;
 for(const angle of [0,Math.PI,-Math.PI/4,Math.PI/4,-Math.PI*3/4,Math.PI*3/4]){
  const desired=focus.clone().add(side.clone().applyAxisAngle(new T.Vector3(0,1,0),angle).multiplyScalar(5.2)).add(new T.Vector3(0,1.1,0));
  const eye=clearCameraPosition(focus,desired,world.obstacles,world.sim.s.ecosystem?.objects);
  const cutaway=scenery.filter(({box})=>targets.some(target=>{const length=eye.distanceTo(target);ray.set(eye,target.clone().sub(eye).normalize());return box.containsPoint(eye)||!!(ray.intersectBox(box,hit)&&eye.distanceTo(hit)<length-.2);})).map(x=>x.asset);
  const score=eye.distanceTo(focus)-cutaway.length*12-Math.abs(angle)*.08;
  if(!best||score>best.score)best={eye,cutaway,score};
 }
 return best;
}
