import {PEOPLE} from './data.js';
import {visibleBetween} from './npc-awareness.js';
import {inDeepWater} from './world-rules.js';

const crew=new Set(['porter','fu']);
const posts=new Set([...crew,'scribe','qinghe']);
export const hasFixedPost=(s,id)=>s.chapterVersion===2&&posts.has(id);
export const convoyTravelling=(s,id)=>hasFixedPost(s,id)&&crew.has(id)&&s.convoy?.phase==='travel'&&(!s.convoy.command||s.convoy.command.receiver===id);
export function fixedPost(s,id){
 if(!hasFixedPost(s,id))return null;
 if(id==='qinghe'&&s.qingheJourney?.delivered&&s.convoy?.posts?.qinghe)return {...s.convoy.posts.qinghe};
 if(crew.has(id)&&s.convoy){
  const q=s.convoy.posts?.[id];
  if(Number.isFinite(q?.x)&&Number.isFinite(q?.z))return {x:q.x,z:q.z};
  if(Number.isFinite(s.convoy.x)&&Number.isFinite(s.convoy.z))return {x:s.convoy.x+(id==='porter'?-2.8:.2),z:s.convoy.z+(id==='porter'?-1.5:-3.5)};
 }
 const base=PEOPLE.find(p=>p.id===id);return {x:base.x,z:base.z};
}
// These provisions are real possessions. Consumption, gifts and theft never
// restock them; the marker and the item provenance survive save/load.
export function seedPostRations(sim,eco,id){
 const n=sim.s.people[id];if(!hasFixedPost(sim.s,id)||n.postRationsIssued)return;
 n.postRationsIssued=true;
 if(eco.s.items.some(i=>i.postRationOwner===id))return;
 for(let i=0;i<3;i++)eco.create('随身干粮','food','npc:'+id,{ownerId:id,postRationOwner:id,discovered:true});
}

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const dot=(a,b)=>a.x*b.x+a.z*b.z;
function finishYield(n){
 const saved=n.convoyYield;
 if(saved&&n.life?.activity==='yieldConvoy')n.life=saved.previous;
 delete n.convoyYield;
}
// Yielding is an ordinary walking intention. The wagon still checks the real
// actor positions and cannot advance through anyone who has not moved aside.
export function yieldToConvoy(sim,eco,id,q,positions){
 const s=sim.s,n=s.people[id],c=s.convoy;let saved=n?.convoyYield;
 if(!n)return false;
 if(s.chapterVersion!==2||c?.phase!=='travel'||crew.has(id)||id==='qinghe'&&c.qinghePassenger){finishYield(n);return false;}
 if(n.hp<=0||n.restraint||n.stunnedUntil>(s.npcClock||0)||n.sickUntil>eco.s.time||n.drowning||n.inCustody||n.escortingBy||n.awareness?.caseOpen||['fight','warn','flee','investigate','search'].includes(n.awareness?.state)||['sleep','doze','escape','privacy'].includes(n.life?.activity))return false;
 const headingDirection={x:-Math.sin(c.heading||0),z:-Math.cos(c.heading||0)};
 if(saved){const offset={x:saved.target.x-c.x,z:saved.target.z-c.z},ahead=dot(offset,headingDirection),across=Math.abs(offset.x*headingDirection.z-offset.z*headingDirection.x);if(dot(saved.direction,headingDirection)<.9||ahead>=-1.4&&ahead<=7&&across<2.85){finishYield(n);saved=null;}}
 if(saved){
  const remaining=dot({x:saved.anchor.x-c.x,z:saved.anchor.z-c.z},saved.direction);
  if(remaining< -3.4||distance(saved.anchor,c)>12){finishYield(n);return false;}
  n.life={activity:'yieldConvoy',target:saved.target,post:id===s.watch?.holder};return true;
 }
 const direction={x:-Math.sin(c.heading||0),z:-Math.cos(c.heading||0)},side={x:-direction.z,z:direction.x},offset={x:q.x-c.x,z:q.z-c.z};
 const forward=dot(offset,direction),lateral=dot(offset,side);
 if(forward< -1.4||forward>7||Math.abs(lateral)>2.7||distance(q,c)>7.3)return false;
 const obstacles=(eco.obstacles||[]).filter(o=>o.id!=='flowerstone-cart');
 if(!visibleBetween(q,c,obstacles,eco.s.objects))return false;
 const free=p=>Math.abs(p.x)<28.5&&Math.abs(p.z)<33&&!inDeepWater(p.x,p.z)&&
  !obstacles.some(o=>eco.s.objects[o.id]?.hp!==0&&!eco.s.objects[o.id]?.open&&Math.abs(p.x-o.x)<o.w/2+.4&&Math.abs(p.z-o.z)<o.d/2+.4)&&
  !Object.entries(positions).some(([other,at])=>other!==id&&distance(p,at)<.85)&&
  !Object.entries(s.people).some(([other,state])=>other!==id&&distance(p,state.convoyYield?.target)<.9);
 const preferred=Math.abs(lateral)>.2?Math.sign(lateral):PEOPLE.findIndex(p=>p.id===id)%2?1:-1;
 let target=null;
 for(const sign of [preferred,-preferred])for(const width of [3.1,3.7,4.3])for(const along of [0,1.1,-1.1]){
  const candidate={x:c.x+direction.x*(forward+along)+side.x*sign*width,z:c.z+direction.z*(forward+along)+side.z*sign*width};
  if(!target&&free(candidate))target=candidate;
 }
 if(!target)return false;
 n.convoyYield={target,anchor:{x:q.x,z:q.z},direction,previous:{...n.life,target:n.life?.target&&{...n.life.target}}};
 n.life={activity:'yieldConvoy',target,post:id===s.watch?.holder};return true;
}
