import * as T from '../vendor/three.module.js';
import {TRAVEL_BUNDLE} from './home-chest.js';
const PAPER=0xece3cf,INK=0x4f4b42,BLUE=0x3d6470,OCHRE=0x9c6d3c;
export function buildTravelBundle(world){
 const g=new T.Group();g.name='tea-daughter-travel-bundle';g.position.set(TRAVEL_BUNDLE.x,0,TRAVEL_BUNDLE.z);world.scene.add(g);
 const cloth=new T.MeshStandardMaterial({color:BLUE,roughness:1,side:T.DoubleSide});
 function roll(w,h,d,color,x,y,z){const m=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color,roughness:1}));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 roll(.53,.12,.4,OCHRE,0,.14,0);
 const wrap=roll(.49,.26,.35,BLUE,0,.39,0);
 // A pair of folded cloth wings and a visible knot, not a hinged wooden lid.
 const wings=[];for(const side of [-1,1]){
  const wing=new T.Mesh(new T.PlaneGeometry(.5,.62,4,4),cloth);wing.rotation.x=-Math.PI/2;wing.rotation.y=side*.3;wing.rotation.z=side*.65;wing.position.set(side*.17,.56,0);g.add(wing);wings.push(wing);
 }
 const knot=roll(.12,.09,.1,PAPER,0,.62,0);
 const robe=roll(.28,.09,.26,PAPER,-.12,.43,.13);
 const hem=new T.Mesh(new T.BoxGeometry(.3,.025,.24),cloth);hem.position.set(.2,.2,.31);g.add(hem);
 const tins=[];for(let i=0;i<3;i++){const m=new T.Mesh(new T.CylinderGeometry(.055,.055,.1,10),new T.MeshStandardMaterial({color:INK,roughness:1}));m.position.set(.28,.42,-.17+i*.13);g.add(m);tins.push(m);}
 world.registerObject(g,TRAVEL_BUNDLE.id,TRAVEL_BUNDLE.name,'cloth',120,TRAVEL_BUNDLE);
 world.obstacles.push({...TRAVEL_BUNDLE,sightHeight:.65});
 world.travelBundle={g,wrap,wings,knot,robe,hem,tins};
}
export function updateTravelBundle(world,s,dt){
 const v=world.travelBundle,o=s.ecosystem?.objects[TRAVEL_BUNDLE.id];if(!v||!o)return;
 v.g.visible=o.hp>0&&!o.removed;
 v.g.position.set(o.x,0,o.z);
 v.g.scale.setScalar(1);v.g.rotation.y=0;
 const journey=s.qingheJourney,carrier=world.npcs?.get('qinghe'),carried=journey?.bundleItems?.some(id=>s.ecosystem.items.some(i=>i.id===id&&i.location==='npc:qinghe'&&i.hp>0));
 if(carrier&&(carried||journey?.reach>0)){
  const at=carrier.actor.position,h=carrier.actor.rotation.y,t=carried?1:Math.min(1,journey.reach/1.2);
  const x=at.x+Math.sin(h)*.36,z=at.z+Math.cos(h)*.36;
  v.g.visible=o.hp>0;v.g.position.set(o.x+(x-o.x)*t,.82*t,o.z+(z-o.z)*t);v.g.scale.setScalar(1-.35*t);v.g.rotation.y=h*t;
  if(carried&&s.people.qinghe.hp>0&&!s.people.qinghe.restraint)carrier.actor.userData.npcUpperBody={kind:'carry'};
 }
 const gift=s.travelBundleGift,n=world.npcs?.get('tea_host');
 if(gift?.phase==='giving'&&gift.reach>0&&n){
  const t=Math.min(1,gift.reach/1.2),at=n.actor.position,p=world.hero.position;
  const from=t<.5?{x:o.x,z:o.z,y:0}:{x:at.x,z:at.z,y:.7},to=t<.5?{x:at.x,z:at.z,y:.7}:{x:p.x,z:p.z,y:.75},f=t<.5?t*2:(t-.5)*2;
  v.g.position.set(from.x+(to.x-from.x)*f,from.y+(to.y-from.y)*f,from.z+(to.z-from.z)*f);
 }
 v.wrap.scale.y=T.MathUtils.lerp(v.wrap.scale.y,o.open?.12:.26,Math.min(1,dt*10));
 v.knot.visible=!o.open;
 v.wings.forEach((m,i)=>{m.position.x=T.MathUtils.lerp(m.position.x,(i?1:-1)*(o.open?.4:.17),Math.min(1,dt*10));m.position.y=T.MathUtils.lerp(m.position.y,o.open?.26:.56,Math.min(1,dt*10));});
 const items=s.ecosystem.items.filter(i=>i.location==='object:'+o.id&&i.hp>0),hasRobe=items.some(i=>i.chestSlot==='robe');
 v.robe.visible=o.open&&hasRobe;v.hem.visible=hasRobe;const count=items.filter(i=>i.chestSlot==='paste').length;v.tins.forEach((m,i)=>m.visible=o.open&&i<count);
}
