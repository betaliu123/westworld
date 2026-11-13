import * as T from '../vendor/three.module.js';

// Visual correction only: never changes the actor/collider position.
// Retargeting between different leg proportions can put the authored feet below ground.
export class FootGrounding {
  constructor(actor, wrapper, model) {
    this.actor=actor; this.wrapper=wrapper; this.baseY=wrapper.position.y;
    this.feet=['LeftFoot','RightFoot','LeftToeBase','RightToeBase'].map(n=>model.getObjectByName('mixamorig'+n)).filter(Boolean);
    this.support=[];
    model.traverse(mesh=>{
      if(!mesh.isSkinnedMesh)return;
      const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
      if(!indices||!weights)return;
      const feet=new Set(mesh.skeleton.bones.map((b,i)=>/Foot|Toe/.test(b.name)?i:-1));feet.delete(-1);
      const vertices=[];
      for(let i=0;i<indices.count;i++){
        let weight=0;for(let j=0;j<4;j++)if(feet.has(indices.getComponent(i,j)))weight+=weights.getComponent(i,j);
        if(weight>.5)vertices.push(i);
      }
      this.support.push({mesh,vertices:vertices.filter((_,i)=>i%Math.max(1,Math.floor(vertices.length/250))===0)});
    });
    this.point=new T.Vector3(); this.sole=this.support.some(s=>s.vertices.length)?0.012:this.lowest();
  }
  lowest() {
    this.actor.updateWorldMatrix(true,false);
    // SkinnedMesh refreshes bindMatrixInverse in updateMatrixWorld, not
    // updateWorldMatrix. Sampling against last frame's inverse feeds the
    // previous correction back into the next one and makes the model drift.
    this.actor.updateMatrixWorld(true);
    if(this.support?.some(s=>s.vertices.length)){
      let low=Infinity;
      for(const {mesh,vertices}of this.support)for(const i of vertices){
        mesh.getVertexPosition(i,this.point);this.point.applyMatrix4(mesh.matrixWorld);
        low=Math.min(low,this.actor.worldToLocal(this.point).y);
      }
      return low;
    }
    return Math.min(...this.feet.map(b=>this.actor.worldToLocal(b.getWorldPosition(this.point)).y));
  }
  apply() {
    this.wrapper.position.y=this.baseY;
    if(this.feet.length){
      const correction=this.sole-this.lowest();
      if(Number.isFinite(correction))this.wrapper.position.y+=T.MathUtils.clamp(correction,-.6,.6);
    }
  }
  reset(){this.wrapper.position.y=this.baseY;}
}
