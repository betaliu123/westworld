// Physical observation, not a second skill roll. Shared by previews and witnesses.
export function theftSight({distance,facing,clear,awake=true,alert=false,attention=0}){
 if(!awake||!clear||distance>6)return 'hidden';
 if(facing>=.64&&distance<=4.5||alert&&facing>=.35&&distance<=6)return 'watching';
 if(facing>=-.15&&distance<=4)return attention>=.75?'watching':'edge';
 return 'hidden';
}

export function theftObserver(s,id,position,point,clear){
 const n=s.people[id],dx=point.x-position.x,dz=point.z-position.z,distance=Math.hypot(dx,dz);
 const awake=!!n&&n.hp>0&&!(n.stunnedUntil>(s.npcClock||0))&&!['sleep','doze'].includes(n.life?.activity);
 // Head turning is part of the same visible gaze used by the model.
 const angle=(position.facing??n?.facing??0)+(position.gazeOffset||0);
 const facing=distance<.05?1:(Math.sin(angle)*dx+Math.cos(angle)*dz)/distance;
 const state=theftSight({distance,facing,clear,awake,alert:['warn','fight','investigate','search'].includes(n?.awareness?.state),attention:position.attention||0});
 return {id,state,distance,facing,clear,awake};
}

export function advanceTheftAttention(value,observation,dt,active){
 const rate=!active||observation.state==='hidden'?-1.1:observation.state==='watching'?1.4:.5;
 return Math.max(0,Math.min(1,value+rate*Math.max(0,Math.min(.1,dt))));
}

export function theftRisk(observers,target){
 const owner=observers.find(o=>o.id===target),witnesses=observers.filter(o=>o.state==='watching').map(o=>o.id);
 const edge=observers.filter(o=>o.state==='edge').map(o=>o.id);
 const intercepted=owner?.state==='watching';
 const label=intercepted?'对方正盯着你的手，伸手会被拦住':witnesses.length?'有人看着这里，伸手会被目击':edge.length?'落在余光里，逗留会引人回头':'暂未落入视线，仍要留意转身';
 return {intercepted,witnesses,edge,owner:owner?.state||'hidden',label};
}
