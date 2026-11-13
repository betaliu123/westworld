// Runtime timing and presentation only; never skip NPC/world rule updates.
export function frameSeconds(now,previous,hidden=false){
 const ms=now-previous;
 return hidden||!Number.isFinite(ms)||ms<0||ms>250?0:Math.min(.125,ms/1000);
}
export function poseStep(cache,dt,distance,critical=false,visible=true){
 cache.poseElapsed=(cache.poseElapsed||0)+dt;
 const period=critical||distance<14?0:visible&&distance<32?1/15:1/8;
 if(cache.poseElapsed+1e-8<period)return 0;
 const elapsed=cache.poseElapsed;cache.poseElapsed=0;return elapsed;
}
export function sweepMove(position,dx,dz,canStep){
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.18));dx/=steps;dz/=steps;
 for(let i=0;i<steps;i++){if(canStep(position.x+dx,position.z))position.x+=dx;if(canStep(position.x,position.z+dz))position.z+=dz;}
}
