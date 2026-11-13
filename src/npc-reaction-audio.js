import {PEOPLE} from './data.js';
import {visibleBetween} from './npc-awareness.js';
import {seesEscort} from './restraint-witnesses.js';

const female=new Set(PEOPLE.filter(p=>p.gender==='female').map(p=>p.id));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const gender=id=>female.has(id)?'female':'male';
const urgent=n=>['fight','flee','search'].includes(n?.awareness?.state);
const critical=n=>n&&n.hp<=(n.maxHp||100)*.3;
export function canReactVocally(s,id){
 const n=s.people[id],now=s.npcClock||0;
 return !!n&&n.hp>0&&!(n.muteUntil>now)&&!(n.stunnedUntil>now)&&!n.drowning&&
  !['sleep','doze','down'].includes(n.life?.activity);
}
function position(world,id){const actor=id==='player'?world.hero:world.npcs.get(id)?.actor;return actor?.visible!==false?actor?.position:null;}
function clear(world,a,b){return visibleBetween(a,b,world.obstacles,world.sim.s.ecosystem?.objects);}
function nearTarget(world,id,target){const p=position(world,id),q=position(world,target);return !!(p&&q&&distance(p,q)<9&&clear(world,p,q));}
function audible(world,id){const p=position(world,id);return canReactVocally(world.sim.s,id)&&p&&distance(p,world.hero.position)<11&&clear(world,p,world.hero.position);}
function sees(world,id,target){
 const p=position(world,id),q=position(world,target);if(!p||!q||!audible(world,id)||distance(p,q)>7||!clear(world,p,q))return false;
 const d=distance(p,q),angle=world.npcs.get(id).actor.rotation.y;
 return d<1||(Math.sin(angle)*(q.x-p.x)+Math.cos(angle)*(q.z-p.z))/d>.2;
}

// Presentation only: reads real hits/observations, never adds evidence or changes outcomes.
export class NpcReactionAudio{
 constructor(audio){this.audio=audio;this.state=null;this.queue=[];this.events=[];this.cooldowns=new Map();this.wounds=new Map();this.escorts=new Set();this.played=[];}
 attach(world){
  // RAF and world time may freeze while hidden. A playback generation invalidates
  // pending events even if no director update ran between pagehide and return.
  if(this.audioGeneration!==(this.audio.generation||0)){this.queue=[];this.events=[];this.audioGeneration=this.audio.generation||0;}
  if(this.state===world.sim.s)return;
  this.audio.stopReaction();this.state=world.sim.s;this.queue=[];this.events=[];this.cooldowns.clear();this.wounds.clear();this.escorts.clear();this.nextScan=0;this.baseline=true;this.played=[];
 }
 offer(world,kind,ids,{key=kind,priority=1,cooldown=6,valid=()=>true}={}){
  ids=ids.filter(id=>audible(world,id));if(!ids.length||world.t<(this.cooldowns.get(key)??-Infinity))return;
  const current=()=>this.state===world.sim.s&&ids.every(id=>audible(world,id))&&valid();if(!current())return;
  const sex=ids.length===1?gender(ids[0]):ids.every(id=>gender(id)===gender(ids[0]))?gender(ids[0]):'mixed';
  const point=()=>{const points=ids.map(id=>position(world,id));return points.some(p=>!p)?null:{x:points.reduce((s,p)=>s+p.x,0)/points.length,z:points.reduce((s,p)=>s+p.z,0)/points.length};};
  this.cooldowns.set(key,world.t+cooldown);
  this.queue.push({id:`npc-${kind}-${sex}`,ids,at:world.t,priority,valid:current,position:point,gain:kind==='murmur'?.48:kind==='alarm'?.72:.65});
  this.queue.sort((a,b)=>b.priority-a.priority||a.at-b.at);this.queue=this.queue.slice(0,3);
 }
 nearest(world,ids){return [...ids].filter(id=>audible(world,id)).sort((a,b)=>distance(position(world,a),world.hero.position)-distance(position(world,b),world.hero.position));}
 draw(world){
  this.attach(world);
  const ids=this.nearest(world,[...world.npcs].filter(([,n])=>n.actor.userData.startledAt===world.t).map(([id])=>id));
  if(ids.length)this.offer(world,'gasp',ids.slice(0,1),{key:'draw',cooldown:8,valid:()=>world.combatReady});
 }
 incident(world,event){
  this.attach(world);
  if(event.type!=='assault'||event.method==='lasso')return;
  this.events.push({target:event.target,before:world.sim.s.people[event.target]?.hp,witnesses:[...(event.witnesses||[])],at:world.t});
  this.events=this.events.slice(-4);
 }
 hits(world){
  for(const e of this.events.splice(0)){
   const n=world.sim.s.people[e.target];if(!n||!(n.hp<e.before)||world.t-e.at>1)continue;
   this.offer(world,'pain',[e.target],{key:'pain:'+e.target,priority:3,cooldown:2.8});
   const witnesses=this.nearest(world,e.witnesses.filter(id=>id!==e.target&&!urgent(world.sim.s.people[id])&&nearTarget(world,id,e.target)));
   // Fleeing witnesses can still cry out at the instant they see the strike.
   if(!witnesses.length)witnesses.push(...this.nearest(world,e.witnesses.filter(id=>id!==e.target&&world.sim.s.people[id]?.awareness?.state==='flee'&&nearTarget(world,id,e.target))));
   if(witnesses.length){const id=witnesses[0];this.offer(world,'alarm',[id],{priority:2,cooldown:6,valid:()=>nearTarget(world,id,e.target)});}
  }
 }
 scan(world){
  const s=world.sim.s;
  for(const [target,n]of [...Object.entries(s.people),['player',s.player]]){
   if(!critical(n)){this.wounds.delete(target);continue;}
   let seen=this.wounds.get(target);if(!seen){seen=new Set();this.wounds.set(target,seen);}
   const newcomers=this.nearest(world,[...world.npcs.keys()].filter(id=>id!==target&&!seen.has(id)&&sees(world,id,target)));
   for(const id of newcomers)seen.add(id);
   const id=newcomers.find(id=>!critical(s.people[id])&&!urgent(s.people[id]));
   if(id&&!this.baseline)this.offer(world,'gasp',[id],{key:'wound',cooldown:10,valid:()=>critical(target==='player'?s.player:s.people[target])&&sees(world,id,target)});
  }
  const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{...n.actor.position,facing:n.actor.rotation.y,visible:n.actor.visible}]));
  for(const [target,n]of Object.entries(s.people)){
   const book=n.restraint?.street;if(n.restraint?.mode!=='lead'||!book||this.escorts.has(book.key))continue;
   const eligible=id=>!urgent(s.people[id])&&audible(world,id)&&seesEscort(s,id,target,positions,world.obstacles)&&['watch','avoid','mock','yield'].includes(book.seen[id]?.kind);
   const ids=this.nearest(world,Object.keys(book.seen).filter(eligible)).slice(0,2);
   if(ids.length<2)continue;
   this.escorts.add(book.key);
   if(!this.baseline)this.offer(world,'murmur',ids,{cooldown:14,valid:()=>{
    if(s.people[target]?.restraint?.street!==book||s.people[target].restraint.mode!=='lead')return false;
    const current=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{...n.actor.position,facing:n.actor.rotation.y,visible:n.actor.visible}]));
    return ids.every(id=>!urgent(s.people[id])&&seesEscort(s,id,target,current,world.obstacles));
   }});
  }
  this.baseline=false;
 }
 update(world,{blocked=false,voice=false}={}){
  this.attach(world);this.hits(world);
  if(world.t>=(this.nextScan||0)){this.scan(world);this.nextScan=world.t+.25;}
  if(!world.playing||world.locked||world.cinematic||blocked||voice||this.state.player.hp<=0||!this.audio.enabled||this.audio.hidden){
   this.queue=[];this.audio.stopReaction();return;
  }
  this.queue=this.queue.filter(e=>world.t-e.at<3&&e.valid());
  if(this.audio.reaction){
   if((this.queue[0]?.priority||0)>(this.audio.reaction.priority??this.activePriority??0))this.audio.stopReaction();else return;
  }
  const next=this.queue.shift();if(!next)return;
  if(this.audio.playReaction(next.id,next)){this.activePriority=next.priority;this.played.push({id:next.id,actors:next.ids,at:world.t});this.played=this.played.slice(-12);}
 }
}
