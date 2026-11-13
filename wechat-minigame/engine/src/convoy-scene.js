import {admitRoute} from './gate-scene.js';
import {believedIdentity,currentFace,disguisePreview,needsDisguiseCheck} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {CART,CONVOY_GATE,CONVOY_TOWN,CONVOY_CREW,convoyState,convoyCrew} from './convoy.js';

// The east staging bay connects to the open centre lane below the noticeboard.
export const CONVOY_ROUTE=[{x:CONVOY_GATE.x,z:27.5},{x:0,z:27.5},{...CONVOY_TOWN}];
const width=2.9,depth=3.7,speed=.85;
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const rotate=(x,z,heading)=>({x:x*Math.cos(heading)+z*Math.sin(heading),z:z*Math.cos(heading)-x*Math.sin(heading)});

export function convoyPosts(c,heading=c.heading||0){
 if(c.command){const d=rotate(c.phase==='town'?-2.4:0,c.phase==='town'?0:-3.2,heading);return {[c.command.receiver]:{x:c.x+d.x,z:c.z+d.z},[c.command.subject]:{...c.command.originalPost}};}
 if(c.phase==='gate')return {porter:{x:c.x-2.8,z:c.z-1.5},fu:{x:c.x+.2,z:c.z-3.5}};
 if(c.phase==='town')return {porter:{x:c.x-2.4,z:c.z},fu:{x:c.x+2.4,z:c.z}};
 // In the small staging bay the supervisor stands alongside; once clear of
 // the north edge he follows behind, so the whole crew fits the gate lane.
 const rear=c.z>30.5?['fu',2.25,.6]:['fu',0,2.8];
 // Before the office porch the puller moves beside the shaft to guide parking,
 // rather than being squeezed between the wagon and the building frontage.
 const front=c.route===2&&c.z< -14?['porter',-2.4,0]:['porter',0,-3.2];
 return Object.fromEntries([front,rear].map(([id,x,z])=>{const d=rotate(x,z,heading);return [id,{x:c.x+d.x,z:c.z+d.z}];}));
}
// SAT uses the rotated wagon body, rather than treating diagonal turns as a
// large solid square. Shafts are at waist height and do not obstruct footpaths.
export function convoyOverlaps(cart,rect,margin=.12){
 const h=cart.heading||0,c=Math.cos(h),s=Math.sin(h),dx=rect.x-cart.x,dz=rect.z-cart.z;
 const a=width/2+margin,b=depth/2+margin,u=(rect.w||0)/2,v=(rect.d||0)/2;
 return Math.abs(dx)<a*Math.abs(c)+b*Math.abs(s)+u&&Math.abs(dz)<a*Math.abs(s)+b*Math.abs(c)+v&&
  Math.abs(dx*c-dz*s)<a+u*Math.abs(c)+v*Math.abs(s)&&Math.abs(dx*s+dz*c)<b+u*Math.abs(s)+v*Math.abs(c);
}
export function convoyPointCollision(s,x,z,pad=.3){
 const cart=s.convoy||CONVOY_GATE,h=cart.heading||0,dx=x-cart.x,dz=z-cart.z;
 return Math.abs(dx*Math.cos(h)-dz*Math.sin(h))<width/2+pad&&Math.abs(dx*Math.sin(h)+dz*Math.cos(h))<depth/2+pad;
}
export function convoyPenetration(s,x,z,pad=.3){const c=s.convoy||CONVOY_GATE,h=c.heading||0,dx=x-c.x,dz=z-c.z;return Math.min(width/2+pad-Math.abs(dx*Math.cos(h)-dz*Math.sin(h)),depth/2+pad-Math.abs(dx*Math.sin(h)+dz*Math.cos(h)));}

export function convoyClear(world,eco,cart){
 if(Math.abs(cart.x)>29||cart.z>32.6||cart.z< -30)return false;
 const objects=eco.s.objects;
 for(const o of world.obstacles||[]){if(o.id===CART||objects[o.id]?.hp===0||objects[o.id]?.open)continue;if(convoyOverlaps(cart,o))return false;}
 for(const p of world.props||[]){if(objects[p.id]?.hp===0||world.sim.s.broken?.includes(p.id))continue;if(convoyOverlaps(cart,{x:p.x,z:p.z,w:2.3,d:1.6}))return false;}
 const hero=world.hero?.position;if(hero&&convoyOverlaps(cart,{x:hero.x,z:hero.z,w:.6,d:.6},.05))return false;
 for(const n of world.npcs?.values()||[]){if(n.actor.visible===false)continue;const q=n.actor.position;if(convoyOverlaps(cart,{x:q.x,z:q.z,w:.5,d:.5},.12))return false;}
 return true;
}
function crewAvailable(world,eco){
 const s=world.sim.s;
 return convoyCrew(s).every(id=>{const n=s.people[id];return world.npcs.get(id)&&n?.hp>0&&!n.restraint&&!(n.stunnedUntil>(s.npcClock||0))&&!(n.sickUntil>eco.s.time)&&!n.drowning&&!n.inCustody&&!n.awareness?.caseOpen&&!['fight','warn','flee','investigate','search'].includes(n.awareness?.state)&&!['sleep','doze','escape','privacy'].includes(n.life?.activity);});
}
function syncScene(world,eco,c){
 const h=c.heading||0,cs=Math.abs(Math.cos(h)),sn=Math.abs(Math.sin(h)),shape={x:c.x,z:c.z,w:width*cs+depth*sn,d:width*sn+depth*cs,y:1.2};
 const asset=world.environmentAssets?.find(a=>a.id===CART),obstacle=world.obstacles?.find(a=>a.id===CART),object=eco.s.objects[CART];
 if(asset)Object.assign(asset,shape);if(obstacle)Object.assign(obstacle,shape);if(object)Object.assign(object,shape);
 if(world.convoyVisual){world.convoyVisual.position.set(c.x,0,c.z);world.convoyVisual.rotation.y=h;world.convoyVisual.visible=object?.hp!==0;}
 for(const [slot,group]of Object.entries(world.convoyCargo||{}))group.visible=eco.s.items.some(i=>i.convoyCargo===slot&&i.location==='object:'+CART&&i.hp>0);
 for(const id of CONVOY_CREW){const npc=world.npcs.get(id),post=c.posts[id];if(npc&&post)npc.base?.set(post.x,0,post.z);}
}
export function updateConvoyScene(world,eco,dt){
 const s=world.sim.s;if(s.chapterVersion!==2||!world.convoyVisual)return;
 const c=convoyState(s);c.heading??=0;c.posts??={};
 // Old v2 saves parked across the office exit. Back the same wagon out when
 // the crew can work; preserve cargo, damage and arrival/reward facts.
 if(c.parkingRevision!==2){c.parkingRevision=2;if(c.phase==='town'&&distance(c,{x:0,z:-17.8})<.1)c.reparking=true;}
 const available=crewAvailable(world,eco),canMove=dt>0&&!world.locked&&!world.cinematic&&!world.performance&&available&&!c.closed&&eco.s.objects[CART]?.hp!==0;
 if(c.phase==='town'&&c.reparking){
  c.posts=convoyPosts(c);
  if(canMove&&convoyCrew(s).every(id=>distance(world.npcs.get(id)?.actor.position,c.posts[id])<1.05)){
   const d=distance(c,CONVOY_TOWN),step=Math.min(d,speed*Math.min(dt,.1));
   const next={...c,x:c.x+(CONVOY_TOWN.x-c.x)*step/Math.max(d,.001),z:c.z+(CONVOY_TOWN.z-c.z)*step/Math.max(d,.001)};
   if(convoyClear(world,eco,next)){c.x=next.x;c.z=next.z;for(const wheel of world.convoyWheels||[])wheel.rotation.x+=step/.62;
    if(distance(c,CONVOY_TOWN)<.001){delete c.reparking;world.sim.save();}
   }
  }
 }
 if(c.phase==='gate'&&s.facts.enteredCity&&canMove){c.phase='travel';c.route=0;world.sim.save();}
 if(c.phase==='travel'){
  const goal=CONVOY_ROUTE[c.route]||CONVOY_ROUTE.at(-1),d=distance(c,goal);
  const desired=d>.06?Math.atan2(c.x-goal.x,c.z-goal.z):c.heading;
  const turn=Math.max(-.55*Math.min(dt,.1),Math.min(.55*Math.min(dt,.1),angleDelta(c.heading,desired)));
  const facing={...c,heading:c.heading+(canMove?turn:0)};
  // At bends the handlers walk around into the next lane before turning the
  // cart. Making them follow the shaft's arc would target the roadside crates.
  c.posts=convoyPosts(c,desired);
  const ready=convoyCrew(s).every(id=>distance(world.npcs.get(id)?.actor.position,c.posts[id])<1.05);
  if(canMove&&ready&&convoyClear(world,eco,facing)){
   c.heading=facing.heading;
   if(Math.abs(angleDelta(c.heading,desired))<.08){
    const step=Math.min(d,speed*Math.min(dt,.1)),next={...c,x:c.x+(goal.x-c.x)*step/Math.max(d,.001),z:c.z+(goal.z-c.z)*step/Math.max(d,.001)};
    if(convoyClear(world,eco,next)){
     c.x=next.x;c.z=next.z;for(const wheel of world.convoyWheels||[])wheel.rotation.x-=step/.62;
     if(distance(c,goal)<.06){c.x=goal.x;c.z=goal.z;c.route++;if(c.route===CONVOY_ROUTE.length){c.phase='town';s.facts.convoyArrived=true;world.sim.emit('npcRoutine',{id:'fu',text:'车停在公所前。纲货看牢，等候交验。'});world.sim.save();}}
    }
   }
  }
 }else c.posts=convoyPosts(c);
 if(c.phase==='town')c.posts=convoyPosts(c);
 syncScene(world,eco,c);
 admitCommandConvoy(world,eco);
 if(c.phase==='travel'||c.reparking){world.convoySaveAge=(world.convoySaveAge||0)+Math.min(dt,.1);if(world.convoySaveAge>=1){world.convoySaveAge=0;world.sim.save();}}
 return c;
}

// A command moves the wagon immediately; passage is granted only beside the
// moving convoy at the gate. No guarantor trip and no player relocation.
export function admitCommandConvoy(world,eco){
 const s=world.sim.s,c=s.convoy,cmd=c?.command,p=s.player;if(!cmd||c.closed||s.facts.enteredCity||c.phase!=='travel'||c.z>25||c.z<19||distance(p,c)>5||p.hp<=0)return false;
 const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));
 const receiver=positions[cmd.receiver],guard=s.watch?.holder||'gate_guard',g=s.people[guard],q=positions[guard];
 if(currentFace(s)!==cmd.subject||believedIdentity(s,cmd.receiver)!==cmd.subject||!receiver||distance(receiver,c)>5)return false;
 if(!q||g.hp<=0||g.restraint||g.stunnedUntil>s.npcClock||g.awareness?.severe||g.awareness?.caseOpen||['sleep','doze'].includes(g.life?.activity)||distance(q,p)>6||!visibleBetween(q,p,world.obstacles,s.ecosystem?.objects))return false;
 const context={positions,obstacles:world.obstacles,player:p},check=disguisePreview(s,guard,{context});
 if(check?.certain&&check.chance===0||needsDisguiseCheck(s,guard,{context}))return false;
 const at={x:p.x,z:p.z};if(!admitRoute(world.sim,'convoy-command'))return false;Object.assign(p,at);
 s.facts.falseName=cmd.subject==='fu'?'符祥':'周大石';s.facts.entryReceipt={route:'convoy-command',day:s.day,subject:cmd.subject,witnesses:[cmd.receiver,guard],cost:'冒名发车，随实际行进的纲车过关'};
 world.sim.emit('npcRoutine',{id:guard,text:'纲车过关，莫堵住车道。'});world.sim.save();return true;
}
