import {appearanceState,clothing,clothingRole,currentFace,disguiseObserverBlock,needsDisguiseCheck,believedIdentity} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';

// Only approved, static text is loaded. No gameplay request is sent to a model.
let library={},libraryReady=typeof document==='undefined';
if(typeof document!=='undefined')fetch('./assets/appearance-barks.json').then(r=>r.ok?r.json():null).then(pack=>{if(pack?.reviewed===true)library=pack.lines||{};}).catch(()=>{}).finally(()=>{libraryReady=true;});
const snapshot=s=>({body:clothing(s)?.id||null,hat:s.ecosystem?.items.find(i=>i.id===s.player.hat&&i.type==='hat'&&i.location==='player'&&i.hp>0)?.id||null,face:currentFace(s)});
const signature=look=>JSON.stringify([look.body,look.hat,look.face]);
const now=s=>s.npcClock||0;
function kindOf(s,look,previous){
 if(look.hat&&look.hat!==previous.hat&&look.body===previous.body)return 'hat';
 if(!look.body||look.body===previous.body)return null;
 return ({'差役':'runner','官兵':'runner','挑夫':'porter','女装行客':'skirt','商人':'merchant','江湖行客':'plain'})[clothingRole(clothing(s))]||null;
}
// Observe the actual equipment, covering wardrobe, inventory and story routes.
// Old saves establish a baseline only; they do not invent a witnessed change.
export function syncAppearanceFeedback(s){
 const a=appearanceState(s),look=snapshot(s);
 if(!a.outfitFeedback){a.outfitFeedback={last:look,seen:{},nextAt:0,pending:null};return false;}
 const m=a.outfitFeedback;
 if(signature(look)===signature(m.last))return false;
 const kind=kindOf(s,look,m.last);
 m.last=look;m.pending=kind?{look,kind,key:signature(look)}:null;
 return true;
}
export function canNoticeOutfit(s,id,position,player,obstacles=[]){
 const n=s.people[id];
 if(!position||position.visible===false||disguiseObserverBlock(s,id)||n.fear>0||n.awareness?.caseOpen||
  ['fight','warn','search','flee','investigate'].includes(n.awareness?.state)||['eat','drink','rest'].includes(n.life?.activity))return false;
 const dx=player.x-position.x,dz=player.z-position.z,d=Math.hypot(dx,dz);
 return d<=5&&Number.isFinite(position.facing)&&(d<.1||(Math.sin(position.facing)*dx+Math.cos(position.facing)*dz)/d>=.35)&&
  visibleBetween(position,player,obstacles,s.ecosystem?.objects);
}
export function outfitFeedbackCandidate(s,context,{blocked=()=>false,lines=library}={}){
 const m=s.appearance?.outfitFeedback,p=m?.pending;
 if(s.chapterVersion!==2||!p||s.player.hp<=0||s.player.bedRest||s.player.drowning||s.complaint||now(s)<m.nextAt||p.key!==signature(snapshot(s)))return null;
 const visible=Object.entries(context.positions).filter(([id,q])=>canNoticeOutfit(s,id,q,context.player,context.obstacles));
 // Any nearby actual identity challenge takes priority over a reassuring aside.
 if(visible.some(([id,q])=>Math.hypot(q.x-context.player.x,q.z-context.player.z)<=3.5&&(blocked(id)||needsDisguiseCheck(s,id,{context}))))return null;
 visible.sort(([,a],[,b])=>Math.hypot(a.x-context.player.x,a.z-context.player.z)-Math.hypot(b.x-context.player.x,b.z-context.player.z));
 for(const [id]of visible){
  if(blocked(id)||needsDisguiseCheck(s,id,{context}))continue;
  // A witness to the transformation is never addressed as if fooled by it.
  if(p.look.face!=='player'&&believedIdentity(s,id)==='player')continue;
  const key=id+':'+p.key;if(m.seen[key])continue;
  const variants=lines[id+'.'+p.kind];
  // Unknown cast gets a glance, not a shared generic spoken personality.
  const text=Array.isArray(variants)&&variants.length?variants[Object.keys(m.seen).filter(k=>k.startsWith(id+':')).length%variants.length]:null;
  return {id,text,kind:p.kind,key,lookKey:p.key};
 }
 return null;
}
export function markOutfitNoticed(sim,candidate){
 const m=sim.s.appearance?.outfitFeedback;
 if(!m?.pending||candidate.lookKey!==m.pending.key||candidate.lookKey!==signature(snapshot(sim.s))||m.seen[candidate.key])return false;
 m.seen[candidate.key]={at:now(sim.s),kind:candidate.kind};m.pending=null;m.nextAt=now(sim.s)+18;sim.save();return true;
}
export function mountAppearanceFeedback({getSim,world,available,canContinue=available,blocked,say,lines}){
 syncAppearanceFeedback(getSim().s);
 const contextNow=()=>({player:world.hero.position,obstacles:world.obstacles,positions:Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y,visible:n.actor.visible}]))});
 return {update(){
  const sim=getSim(),s=sim.s;if(syncAppearanceFeedback(s))sim.save();
  if(!libraryReady||!available())return;
  const context=contextNow(),{positions}=context;
  // Wait for a visible speech anchor; do not consume an off-screen reaction.
  for(const [id,n]of world.npcs){const point=world.screenPoint(n.actor.position.clone().add({x:0,y:3.25,z:0}));if(!point.visible||point.x<40||point.x>innerWidth-40||point.y<0||point.y>innerHeight-100)positions[id].visible=false;}
  const candidate=outfitFeedbackCandidate(s,context,{blocked,lines:lines||library});if(!candidate)return;
  const n=world.npcs.get(candidate.id);
  const valid=()=>getSim()===sim&&canContinue()&&s.player.hp>0&&!s.player.bedRest&&!s.player.drowning&&candidate.lookKey===signature(snapshot(s))&&canNoticeOutfit(s,candidate.id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y,visible:n.actor.visible},world.hero.position,world.obstacles)&&!blocked?.(candidate.id)&&!needsDisguiseCheck(s,candidate.id,{context:contextNow()});
  n.lookUntil=world.t+2;n.echoFacingUntil=world.t+2;
  if(candidate.text){say({id:candidate.id,text:candidate.text,appearanceAside:true,valid,onShown:()=>markOutfitNoticed(sim,candidate)});}
  else if(markOutfitNoticed(sim,candidate))world.quietUntil=Math.max(world.quietUntil||0,world.t+2);
 }};
}
