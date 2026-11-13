import {resolveGate,gateActions} from './gate-scene.js';
import {jailed} from './locations.js';

export const PRISON_PASSAGE={fadeOut:.32,hold:1.15,fadeIn:.4};
export const isPrisonRelease=action=>['g_serve','g_record'].includes(action?.id||action);
const smooth=k=>1-(1-Math.max(0,Math.min(1,k)))**2;

// Only the opaque passage's midpoint commits the sentence. A saved pending choice
// replays the transition, while a saved release has no pending choice to repeat.
export function createPrisonRelease({getSim,onStart=()=>{},onFrame=()=>{},onRelease=()=>{},onEnd=()=>{},onError=()=>{}}){
 let shot=null;
 const valid=(sim,p)=>p&&jailed(sim.s)&&sim.event.id===p.eventId&&gateActions(sim).some(a=>a.id===p.actionId);
 function startPending(){
  const sim=getSim(),p=sim.s.prisonPassage;if(!p)return false;
  if(!valid(sim,p)){delete sim.s.prisonPassage;sim.save();return false;}
  shot={sim,p,age:0,committed:false};onStart();onFrame(0,false);return true;
 }
 function finish(){shot=null;onFrame(0,false);onEnd();}
 return {
  get active(){return !!(shot||getSim().s.prisonPassage);},
  begin(eventId,actionId){
   const sim=getSim(),p={eventId,actionId};if(shot||sim.s.prisonPassage||!isPrisonRelease(actionId)||!valid(sim,p))return false;
   sim.s.prisonPassage=p;sim.save();return startPending();
  },
  update(dt){
   if(!shot&&!startPending())return;
   if(shot.sim!==getSim()){finish();return;}
   shot.age+=Math.max(0,Math.min(.05,dt));
   const {fadeOut,hold,fadeIn}=PRISON_PASSAGE;
   const opacity=shot.age<fadeOut?smooth(shot.age/fadeOut):shot.age<fadeOut+hold?1:1-smooth((shot.age-fadeOut-hold)/fadeIn);
   onFrame(opacity,shot.age>=fadeOut&&shot.age<fadeOut+hold+fadeIn);
   if(!shot.committed&&shot.age>=fadeOut){
    const {sim,p}=shot;delete sim.s.prisonPassage;
    const r=valid(sim,p)?resolveGate(sim,p.eventId,p.actionId,{handledPresentation:true}):{error:'牢中的局面已经变了。'};
    if(r.error){sim.save();onError(r.error);finish();return;}
    shot.committed=true;onRelease(r);
   }
   if(shot.age>=fadeOut+hold+fadeIn)finish();
  },
  skip(){if(shot)shot.age=shot.committed?PRISON_PASSAGE.fadeOut+PRISON_PASSAGE.hold:PRISON_PASSAGE.fadeOut;}
 };
}

export function mountPrisonRelease(options){
 const root=document.createElement('div');root.id='prison-passage';root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const caption=document.createElement('div'),title=document.createElement('p');title.className='prison-time';title.textContent='三日后';caption.append(title);root.append(caption);document.body.append(root);
 return createPrisonRelease({...options,onStart(){document.body.classList.add('time-passage');options.onStart?.();},onFrame(opacity,subtitle){root.hidden=opacity<=0;root.style.opacity=opacity;caption.hidden=!subtitle;},onEnd(){document.body.classList.remove('time-passage');options.onEnd?.();}});
}
