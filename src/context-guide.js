// A thought points at an existing control. No automatic action or extra modal.
const GUIDES={qingheLasso:{key:'lasso',target:'lasso'},qingheIdentity:{key:'face',target:'wardrobe'},coatBag:{key:'clothes',target:'wardrobe'},workCoat:{key:'clothes',target:'wardrobe'},lapel:{key:'theft',target:'theft'}};
export function needsContextGuide(s,thought){const g=GUIDES[thought];return !!g&&!s.chapter?.actionGuides?.[g.key];}
export function queueContextGuide(s,thought){const g=GUIDES[thought];if(!g||!needsContextGuide(s,thought))return false;(s.chapter.actionGuides??={})[g.key]={...g,thought,seen:false};return true;}
export function finishContextGuide(sim,key){const g=sim.s.chapter?.actionGuides?.[key];if(!g||g.seen)return;g.seen=true;sim.save();}

export function mountContextGuide(getSim,available){
 // The guide only rings the real control; the control itself, its label and its visibility never change.
 let owner=null,current=null,age=0,last=0,target=null;
 function clear(){target?.classList.remove('action-guided');target=null;}
 function finish(){if(current)finishContextGuide(getSim(),current.key);current=null;age=0;clear();}
 document.addEventListener('click',e=>{if(current?.target==='lasso'&&e.target.closest?.('[data-skill=lasso]'))finish();});
 document.getElementById('wardrobe-button').addEventListener('click',()=>{if(current?.target==='wardrobe')finish();});
 window.addEventListener('keydown',e=>{if(e.code==='Escape'&&current&&!e.target.closest?.('input,textarea,select,[contenteditable=true]'))finish();});
 return {update(now=performance.now()){
  const s=getSim().s;if(owner!==s){clear();owner=s;current=null;age=0;last=now;}
  const elapsed=Math.min(.25,Math.max(0,(now-last)/1000));last=now;
  if(current&&s.chapter?.actionGuides?.[current.key]!==current){current=null;age=0;clear();}
  current??=Object.values(s.chapter?.actionGuides||{}).find(g=>!g.seen);
  if(!current){clear();return;}
  const pack=document.getElementById('object-actions');
  if(current.target==='theft'&&(s.player?.stealing||pack&&!pack.hidden&&pack.classList.contains('theft-pack')||s.facts.gatePassTaken)){finish();return;}
  if(!available()){clear();return;}
  age+=elapsed;if(age>=16){finish();return;}
  const next=current.target==='lasso'?document.querySelector('[data-skill=lasso]'):document.getElementById(current.target==='wardrobe'?'wardrobe-button':'stealth-mode');
  if(target!==next){clear();target=next;target?.classList.add('action-guided');}
 }};
}
