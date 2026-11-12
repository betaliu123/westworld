// Daily routes respect solid furniture; recovery is a separate timed safety net.
const BODY=.14,STEPS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
export function routinePath(start,target,blocked,stop=.35){
 const solid=blocked;blocked=(x,z)=>solid(x,z)||solid(x-BODY,z-BODY)||solid(x-BODY,z+BODY)||solid(x+BODY,z-BODY)||solid(x+BODY,z+BODY);
 const clear=(a,b)=>{const d=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.15;t<=d;t+=.15)if(blocked(a.x+(b.x-a.x)*t/d,a.z+(b.z-a.z)*t/d))return false;return true;};
 if(clear(start,target)&&!blocked(target.x,target.z))return [target];
 // A* prioritizes the destination instead of flooding the entire town for every
 // resident leaving work. Cache collision samples for this route only (doors move).
 const cells=new Map(),solidAt=(x,z)=>{const k=x.toFixed(3)+','+z.toFixed(3);if(!cells.has(k))cells.set(k,blocked(x,z));return cells.get(k);};
 const radius=Math.max(stop,.45);
 if(stop<.5&&solidAt(target.x,target.z)&&[[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].every(([x,z])=>solidAt(target.x+x,target.z+z)))return [];
 // The search can only end on a free grid point within reach of the target. When there is none, the answer is
 // already "no route"; return it now instead of flooding thousands of cells to learn the same thing.
 const tx=(target.x-start.x)/.5,tz=(target.z-start.z)/.5,span=radius/.5;let reachable=Math.hypot(start.x-target.x,start.z-target.z)<=radius;
 for(let ix=Math.ceil(tx-span);!reachable&&ix<=tx+span;ix++)for(let iz=Math.ceil(tz-span);iz<=tz+span;iz++){const x=start.x+ix*.5,z=start.z+iz*.5;if(Math.abs(ix)<=128&&Math.abs(iz)<=128&&Math.hypot(x-target.x,z-target.z)<=radius&&!solidAt(x,z)){reachable=true;break;}}
 if(!reachable)return [];
 const heap=[],costs=new Map(),key=(x,z)=>(x+512)*1024+z+512;
 const push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const n=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(last.f<=heap[c].f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return n;};
 push({x:start.x,z:start.z,ix:0,iz:0,g:0,f:Math.hypot(start.x-target.x,start.z-target.z),parent:null});costs.set(key(0,0),0);
 for(let count=0;heap.length&&count<4000;count++){const a=pop();if(a.g>costs.get(key(a.ix,a.iz)))continue;
  if(Math.hypot(a.x-target.x,a.z-target.z)<=radius){const path=[];for(let p=a;p.parent;p=p.parent)path.unshift({x:p.x,z:p.z});return path;}
  for(const [dx,dz]of STEPS){const ix=a.ix+dx,iz=a.iz+dz,x=start.x+ix*.5,z=start.z+iz*.5,k=key(ix,iz),g=a.g+Math.hypot(dx,dz)*.5;
   if(g>=(costs.get(k)??Infinity)||Math.abs(ix)>128||Math.abs(iz)>128||solidAt(x,z)||!clear(a,{x,z}))continue;
   costs.set(k,g);push({x,z,ix,iz,g,f:g+Math.hypot(x-target.x,z-target.z),parent:a});
  }
 }return [];
}

export function nearestWalkable(start,blocked){if(!blocked(start.x,start.z))return start;for(let r=.25;r<=3;r+=.25)for(let i=0;i<16;i++){const q={x:start.x+Math.cos(i*Math.PI/8)*r,z:start.z+Math.sin(i*Math.PI/8)*r};if(!blocked(q.x,q.z))return q;}return null;}

// Only attempted locomotion counts: waiting, sitting and scripted pauses must never teleport.
export function stuckStep(watch,position,attempted,dt,eligible=true){
 const reset=()=>{watch.elapsed=0;watch.idle=0;watch.anchor={x:position.x,z:position.z};watch.replanned=false;};
 if(!eligible){reset();return null;}
 // Turning or replacing a route can produce a frame without a movement request.
 // Do not let those tiny gaps erase nine seconds spent pushing against a wall.
 if(!attempted){watch.idle=(watch.idle||0)+Math.min(dt,.1);if(watch.idle>=.5)reset();return null;}
 watch.idle=0;
 watch.anchor??={x:position.x,z:position.z};
 if(Math.hypot(position.x-watch.anchor.x,position.z-watch.anchor.z)>.6){watch.elapsed=0;watch.anchor={x:position.x,z:position.z};watch.replanned=false;return null;}
 watch.elapsed=(watch.elapsed||0)+Math.min(dt,.1);
 if(watch.elapsed>=9){watch.elapsed=0;watch.replanned=false;return 'recover';}
 if(watch.elapsed>=3&&!watch.replanned){watch.replanned=true;return 'repath';}
 return null;
}

// A clear point can still be a pocket between furniture. Require body clearance
// and a short walk out; search farther around the normal post before giving up.
export function recoverySpot(base,position,blocked){
 const clear=(x,z)=>![[0,0],[-.14,-.14],[-.14,.14],[.14,-.14],[.14,.14]].some(([dx,dz])=>blocked(x+dx,z+dz));
 const usable=q=>{
  if(Math.hypot(q.x-position.x,q.z-position.z)<1||!clear(q.x,q.z))return false;
  for(let i=0;i<16;i++){
   const dx=Math.cos(i*Math.PI/8),dz=Math.sin(i*Math.PI/8);let exit=true;
   for(let d=.2;d<=1.6;d+=.2)if(!clear(q.x+dx*d,q.z+dz*d)){exit=false;break;}
   if(exit)return true;
  }
  return false;
 };
 if(usable(base))return {x:base.x,z:base.z};
 for(let r=.5;r<=6;r+=.5)for(let i=0;i<32;i++){
  const q={x:base.x+Math.cos(i*Math.PI/16)*r,z:base.z+Math.sin(i*Math.PI/16)*r};
  if(usable(q))return q;
 }
 return null;
}
