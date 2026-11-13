import {PEOPLE} from './data.js';
import {importantPeople,knownPersonalHarm} from './npc-bonds.js';
import {believedIdentity} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const name=id=>PEOPLE.find(p=>p.id===id)?.name||'亲近的人';
const awake=(s,id)=>{const n=s.people[id];return n?.hp>0&&!(n.stunnedUntil>(s.npcClock||0))&&!['sleep','doze'].includes(n.life?.activity);};
const distress=n=>!n?null:n.hp<=0?'down':n.restraint?'bound':n.hp<40?'wounded':null;
function sees(s,id,target,positions,obstacles){const a=positions[id],b=positions[target];if(!awake(s,id)||distance(a,b)>8||!visibleBetween(a,b,obstacles,s.ecosystem?.objects))return false;
 const facing=a.facing??s.people[id].facing??0;return distance(a,b)<.3||((b.x-a.x)*Math.sin(facing)+(b.z-a.z)*Math.cos(facing))/distance(a,b)>=.25;
}
export function visibleConcern(s,id,positions,obstacles=[]){if(s.chapterVersion!==2)return null;
 for(const target of importantPeople(s,id)){const kind=distress(s.people[target]);if(kind&&sees(s,id,target,positions,obstacles))return {target,kind};}return null;
}
export function aidBoundary(s,id,subject,positions={},obstacles=[]){
 const harm=knownPersonalHarm(s,id,subject);if(harm)return {reason:'known-harm',...harm};
 const concern=s.people[id]?.concern||visibleConcern(s,id,positions,obstacles);return concern?{reason:'concern',target:concern.target}:null;
}
// Observing the aftermath does not identify the attacker. Only sight updates the search destination.
export function observeConcerns(sim,positions,obstacles=[]){const s=sim.s;if(s.chapterVersion!==2)return;let changed=false;
 for(const id of Object.keys(positions)){const n=s.people[id];if(!n||!awake(s,id))continue;let c=n.concern;const visible=visibleConcern(s,id,positions,obstacles);
  if(visible){const target=s.people[visible.target],key=visible.target+':'+visible.kind+':'+(target.restraint?.ropeId||'')+':'+(target.restraint?.at||0);
   if(!c||c.key!==key){c=n.concern={...visible,key,lastSeen:{x:positions[visible.target].x,z:positions[visible.target].z},seenAt:s.npcClock||0,announced:!!n.concernHeard?.[key]};n.eatingUntil=n.drinkingUntil=n.pouringUntil=0;changed=true;}
   c.lastSeen={x:positions[c.target].x,z:positions[c.target].z};c.seenAt=s.npcClock||0;
  }else if(c&&(sees(s,id,c.target,positions,obstacles)&&!distress(s.people[c.target])||(s.npcClock||0)-c.seenAt>20)){delete n.concern;if(n.life?.activity==='concern')n.life={activity:'idle'};changed=true;}
 }
 if(changed)sim.save();
}
export function concernLine(s,id){const c=s.people[id]?.concern;if(!c)return '';
 if(c.kind==='down')return name(c.target)+'，听得见吗？来人帮帮忙！';
 if(c.kind==='wounded')return name(c.target)+'，伤得这么重……我先陪着你。';
 const harm=knownPersonalHarm(s,id,believedIdentity(s,id));
 return harm?.target===c.target&&harm.kind==='restraint'?(harm.evidence==='seen'?'先把'+name(c.target)+'放开！我看见你动手了。':harm.evidence==='seen-escort'?'先把'+name(c.target)+'放开！我看见你牵着绳子。':'先把人放开。绑人的事，我已经听说了。'):name(c.target)+'，你怎么被绑住了？先别挣，我过来了。';
}
export function concernMotion(world,id,n,dt){const s=world.sim.s,state=s.people[id],c=state?.concern;
 if(!c||!world.playing||world.cinematic||!awake(s,id)||state.restraint||state.inCustody||state.life?.activity==='escape'||state.drowning||state.burning||state.sickUntil>(s.ecosystem?.time||0)||state.fear>0||state.awareness?.caseOpen||['fight','warn','flee','investigate','search'].includes(state.awareness?.state))return false;
 if(world.locked||world.performance)dt=0;
 const a=n.actor,before=a.position.clone(),goal=c.lastSeen,d=distance(a.position,goal);
 for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop)prop.visible=false;
 a.userData.sword.visible=false;
 if(d>1.45&&dt){if(!n.concernPath||world.t>=(n.concernRepath||0)){n.concernRepath=world.t+.7;n.concernPath=routinePath(a.position,goal,(x,z)=>world.collides(x,z,0,false),1.45);}
  while(n.concernPath.length&&distance(a.position,n.concernPath[0])<.16)n.concernPath.shift();
  const q=n.concernPath[0];if(q){const len=distance(a.position,q);if(len>.01){const step=Math.min(len,dt*2.2);world.move(a,(q.x-a.position.x)/len*step,(q.z-a.position.z)/len*step);}}
 }
 a.rotation.y=turnToward(a.rotation.y,Math.atan2(goal.x-a.position.x,goal.z-a.position.z),dt);
 world.animateActor(a,dt?a.position.distanceTo(before)/dt/2:0,dt,world.speaking===id?'talk':'');
 if(d<=1.6&&dt&&!c.announced&&!(state.muteUntil>(s.npcClock||0))&&visibleBetween(a.position,goal,world.obstacles,s.ecosystem?.objects)&&world.onActionCardSpeech?.({id,text:concernLine(s,id)})){c.announced=true;state.concernHeard??={};state.concernHeard[c.key]=true;world.sim.save();}
 state.x=a.position.x;state.z=a.position.z;state.facing=a.rotation.y;return true;
}
