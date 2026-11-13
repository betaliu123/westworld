import {jailed} from './locations.js';
import {icon} from './ui-icons.js';

export const MILESTONE_ART={
 prison:{image:'assets/milestones/prison-entry-v1.png',title:'收押',text:'狱门在身后合上。',alt:'官差将旅人带进临溪县狱'},
 release:{image:'assets/milestones/prison-release-v2.png',title:'重见天日',text:'抖落衣上尘土，再走一程。',alt:'衣发凌乱的旅人，空手走出牢门'},
 court:{image:'assets/milestones/court-enrollment-v1.png',title:'初入六扇门',text:'接过腰牌，也接下一份责任。',alt:'旅人从官员手中接过捕快腰牌'},
 prince:{image:'assets/milestones/prince-alliance-v1.png',title:'暗中照应',text:'这座城里，从此多了一双替他留意的眼睛。',alt:'锦衣客与旅人在桌前私下商定查账合作'},
};
function facts(s){return {prison:jailed(s)?String(s.event.id):null,release:s.facts.lastPrisonRelease?.id||null,court:!!(s.facts.factionEnrollments?.court||s.facts.career==='court'),prince:!!s.facts.princeCommission};}
// This ledger presents facts that already happened. It never grants their rewards.
// Existing saves establish a baseline rather than replaying old appointments.
export function observeMilestones(s){
 if(s.chapterVersion!==2)return false;
 const now=facts(s);if(!s.storyMilestones){s.storyMilestones={version:1,last:now,queue:[],seen:[]};return true;}
 const m=s.storyMilestones;let changed=false;
 for(const kind of Object.keys(MILESTONE_ART))if(now[kind]!==m.last[kind]){
  if(now[kind]){const key=kind+':'+now[kind];if(!m.seen.includes(key)&&!m.queue.some(q=>q.key===key)){m.queue.push({key,kind});changed=true;}}
  m.last[kind]=now[kind];changed=true;
 }
 return changed;
}
export function finishMilestone(s,key){const m=s.storyMilestones;if(!m?.queue.some(q=>q.key===key))return false;m.queue=m.queue.filter(q=>q.key!==key);if(!m.seen.includes(key))m.seen.push(key);return true;}
export function mountStoryMilestones({getSim,ready,onStart=()=>{},onEnd=()=>{},save=()=>{}}){
 const root=document.createElement('section');root.id='story-milestone';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','江湖一幕');root.tabIndex=-1;
 root.innerHTML='<button type="button" class="milestone-surface" aria-label="继续，关闭画面" title="继续"><img draggable="false"><span class="milestone-caption"><strong></strong><span></span></span><span class="milestone-close" aria-hidden="true">'+icon('X')+'</span></button>';
 document.body.append(root);const img=root.querySelector('img'),button=root.querySelector('button'),title=root.querySelector('strong'),caption=root.querySelector('.milestone-caption span');let shot=null,focus=null;
 function finish(commit=true){if(!shot)return;const {sim,key}=shot;shot=null;if(commit&&sim===getSim()&&finishMilestone(sim.s,key))save();root.hidden=true;document.body.classList.remove('milestone-active');onEnd();if(focus?.isConnected)focus.focus({preventScroll:true});}
 function input(e){if(!shot)return;e.stopImmediatePropagation();if(e.type==='keydown'){e.preventDefault();if(!e.repeat&&['Enter','Space','Escape'].includes(e.code))finish();}else if(e.type==='click'){e.preventDefault();finish();}}
 root.addEventListener('click',input);root.addEventListener('pointerdown',e=>e.stopPropagation());root.addEventListener('pointerup',e=>e.stopPropagation());
 window.addEventListener('keydown',input,true);
 return {get active(){return !!shot;},close:finish,update(){
  const sim=getSim();if(shot&&shot.sim!==sim)finish(false);
  if(observeMilestones(sim.s))save();
  if(shot||!ready())return;const entry=sim.s.storyMilestones?.queue[0];if(!entry)return;
  const art=MILESTONE_ART[entry.kind];if(!art){finishMilestone(sim.s,entry.key);save();return;}
  shot={sim,...entry};focus=document.activeElement;img.src=art.image;img.alt=art.alt;title.textContent=art.title;caption.textContent=art.text;
  root.hidden=false;document.body.classList.add('milestone-active');onStart();button.focus({preventScroll:true});
 }};
}
