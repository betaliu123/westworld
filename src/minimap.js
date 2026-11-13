// North stays at the top; every world layer shares the same player-centred projection.
export function minimapView(player,size=164,scale=2.5){return {x:size/2-player.x*scale,y:size/2-player.z*scale,scale,size};}
export function minimapPoint(view,point){return {x:view.x+point.x*view.scale,y:view.y+point.z*view.scale};}
export function minimapHit(view,point,pixel,radius=12){
 const center=view.size/2;if(Math.hypot(pixel.x-center,pixel.y-center)>center-2)return false;
 const q=minimapPoint(view,point);return Math.hypot(pixel.x-q.x,pixel.y-q.y)<radius;
}
export function playerMapArrow(center,facing){
 const dx=Math.sin(facing),dy=Math.cos(facing),point=(forward,side)=>({x:center.x+dx*forward+dy*side,y:center.y+dy*forward-dx*side});
 return [point(8,0),point(-5,4),point(-2,0),point(-5,-4)];
}
export function drawMinimap(ctx,view,{player,facing=0,obstacles=[],objects={},npcs=[],headquarters=[],areas=[],hotspot,route=[],drawAreas},ink){
 const point=q=>minimapPoint(view,q),center=view.size/2;
 ctx.clearRect(0,0,view.size,view.size);ctx.save();ctx.beginPath();ctx.arc(center,center,center-2,0,Math.PI*2);ctx.clip();
 // Continue the road and river across the traversable southern outskirts as well as town.
 ctx.strokeStyle=ink['ink-3'];ctx.globalAlpha=.22;ctx.lineWidth=11;ctx.beginPath();
 const north=point({x:0,z:-50}),south=point({x:0,z:50});ctx.moveTo(north.x,north.y);ctx.lineTo(south.x,south.y);ctx.stroke();
 const river=point({x:-25.5,z:-47.5});ctx.fillStyle=ink.azurite;ctx.globalAlpha=.33;ctx.fillRect(river.x,river.y,7*view.scale,95*view.scale);
 ctx.fillStyle=ink['ink-2'];ctx.globalAlpha=.3;
 for(const o of obstacles){if(objects[o.id]?.hp===0||objects[o.id]?.open)continue;const q=point(o);ctx.fillRect(q.x-o.w*view.scale/2,q.y-o.d*view.scale/2,o.w*view.scale,o.d*view.scale);}
 ctx.globalAlpha=1;
 for(const h of headquarters){const q=point(h),[dx,dy]=h.mapOffset||[0,0];
  if(dx||dy){ctx.strokeStyle=h.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+dx,q.y+dy);ctx.stroke();}
  ctx.fillStyle=h.color;ctx.fillRect(q.x+dx-7,q.y+dy-8,15,16);ctx.fillStyle=ink['ink-0'];ctx.font='14px '+ink.font;ctx.fillText(h.glyph,q.x+dx-6,q.y+dy+5);
 }
 drawAreas?.(ctx,areas,view);
 if(hotspot){const q=point({x:hotspot.point[0],z:hotspot.point[1]});ctx.strokeStyle=ctx.fillStyle=hotspot.mode==='fight'?ink.cinnabar:ink.ochre;ctx.lineWidth=1.5;
  ctx.globalAlpha=.16;ctx.beginPath();ctx.arc(q.x,q.y,11,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.stroke();
 }
 for(const [id,n]of npcs){const q=point(n.actor.position);ctx.fillStyle=ink[id==='guard'?'ink-2':'ink-3'];ctx.beginPath();ctx.arc(q.x,q.y,2,0,Math.PI*2);ctx.fill();}
 if(route?.length){const goal=route.at(-1),q=point({x:goal[0],z:goal[1]});ctx.strokeStyle=ink.azurite;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.stroke();}
 // A paper halo and an arrow distinguish the player from the nearby round NPC marks.
 const arrow=playerMapArrow(point(player),facing);ctx.beginPath();arrow.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y));ctx.closePath();
 ctx.lineWidth=2.5;ctx.strokeStyle=ink.paper;ctx.stroke();ctx.fillStyle=ink['ink-0'];ctx.fill();ctx.restore();
}
export function mountMinimap(canvas){
 const ctx=canvas.getContext('2d'),style=getComputedStyle(document.documentElement),ink={font:style.getPropertyValue('--font-body').trim()};
 for(const key of ['paper','ink-0','ink-2','ink-3','cinnabar','ochre','azurite'])ink[key]=style.getPropertyValue('--'+key).trim();
 let shown=null;
 return {
  render(world,layers){const view=minimapView(world.hero.position,canvas.width);drawMinimap(ctx,view,{...layers,player:world.hero.position,facing:world.hero.rotation.y,obstacles:world.obstacles,objects:world.sim.s.ecosystem?.objects,npcs:world.npcs,route:world.auto},ink);shown={view,hotspot:layers.hotspot?{...layers.hotspot,point:[...layers.hotspot.point]}:null};},
  hitsHotspot(event,current){
   // Match the last painted frame, including at reduced CSS canvas sizes. A stale event must not open another event's menu.
   if(!shown?.hotspot||!current||shown.hotspot.id!==current.id||shown.hotspot.point.some((v,i)=>v!==current.point[i]))return false;
   const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return false;
   return minimapHit(shown.view,{x:current.point[0],z:current.point[1]},{x:(event.clientX-r.left)*canvas.width/r.width,y:(event.clientY-r.top)*canvas.height/r.height});
  }
 };
}
