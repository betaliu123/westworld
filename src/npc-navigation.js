// Daily routes respect solid furniture; recovery is a separate timed safety net.
export function routinePath(start,target,blocked,stop=.35){
 const solid=blocked;blocked=(x,z)=>solid(x,z)||[[-.14,-.14],[-.14,.14],[.14,-.14],[.14,.14]].some(([dx,dz])=>solid(x+dx,z+dz));
 const clear=(a,b)=>{const d=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.15;t<=d;t+=.15)if(blocked(a.x+(b.x-a.x)*t/d,a.z+(b.z-a.z)*t/d))return false;return true;};
 if(clear(start,target)&&!blocked(target.x,target.z))return [target];
 const step=.5,key=(x,z)=>x+','+z,queue=[{x:start.x,z:start.z,parent:-1}],seen=new Set([key(0,0)]);let found=-1;
 for(let head=0;head<queue.length&&head<16000;head++){const a=queue[head];if(Math.hypot(a.x-target.x,a.z-target.z)<=Math.max(stop,.45)){found=head;break;}
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=a.x+dx*step,z=a.z+dz*step,k=key(Math.round((x-start.x)/step),Math.round((z-start.z)/step));if(seen.has(k)||Math.abs(x-start.x)>64||Math.abs(z-start.z)>64||blocked(x,z)||!clear(a,{x,z}))continue;seen.add(k);queue.push({x,z,parent:head});}}
 if(found<0)return [];const path=[];while(found>0){path.unshift({x:queue[found].x,z:queue[found].z});found=queue[found].parent;}return path;
}

export function nearestWalkable(start,blocked){if(!blocked(start.x,start.z))return start;for(let r=.25;r<=3;r+=.25)for(let i=0;i<16;i++){const q={x:start.x+Math.cos(i*Math.PI/8)*r,z:start.z+Math.sin(i*Math.PI/8)*r};if(!blocked(q.x,q.z))return q;}return null;}

// Only attempted locomotion counts: waiting, sitting and scripted pauses must never teleport.
export function stuckStep(watch,position,attempted,dt,eligible=true){
 if(!eligible||!attempted){watch.elapsed=0;watch.anchor={x:position.x,z:position.z};watch.replanned=false;return null;}
 watch.anchor??={x:position.x,z:position.z};
 if(Math.hypot(position.x-watch.anchor.x,position.z-watch.anchor.z)>.6){watch.elapsed=0;watch.anchor={x:position.x,z:position.z};watch.replanned=false;return null;}
 watch.elapsed=(watch.elapsed||0)+Math.min(dt,.1);
 if(watch.elapsed>=9){watch.elapsed=0;watch.replanned=false;return 'recover';}
 if(watch.elapsed>=3&&!watch.replanned){watch.replanned=true;return 'repath';}
 return null;
}
