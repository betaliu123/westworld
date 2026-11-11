import {icon} from './ui-icons.js';
// Keep scene-anchored speech inside the viewport and below any top HUD it intersects.
export function placeWorldSpeech(el,point){
 const width=el.offsetWidth,height=el.offsetHeight,gap=12;
 const x=Math.max(width/2+gap,Math.min(innerWidth-width/2-gap,point.x));let bottom=Math.max(height+gap,point.y);
 const blocks=[...document.querySelectorAll('#hud-right-stack,#corner-money,.field-compass,#hud-left-stack')].filter(e=>!e.hidden&&getComputedStyle(e).visibility!=='hidden').map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.top<innerHeight/2).sort((a,b)=>a.top-b.top);
 for(const r of blocks)if(x+width/2>r.left-gap&&x-width/2<r.right+gap&&bottom-height<r.bottom+gap&&bottom>r.top-gap)bottom=r.bottom+gap+height;
 el.style.left=x+'px';el.style.top=Math.min(innerHeight-gap,bottom)+'px';
}
// HUD owns screen space; world-space speech and markers remain in the scene.
export function mountHudLayout(){
 const byId=id=>document.getElementById(id);
 const dock=(id,children)=>{const el=document.createElement('div');el.id=id;for(const child of children){const node=byId(child);if(node)el.append(node);}document.body.append(el);return el;};
 dock('hud-left-stack',['vitals','gate-objective','party-ui','journal']);
 const context=dock('hud-context-stack',['ambient']);
 const actions=dock('hud-context-actions',['stealth-mode','interact']);context.append(actions);const water=document.createElement('span');water.id='water-state';water.innerHTML=icon('Waves');water.title='溺水 · 气血持续下降，尽快上岸';water.setAttribute('aria-label',water.title);water.setAttribute('role','status');actions.append(water);
 const mode=byId('stealth-mode');mode.innerHTML=icon('EyeOff');mode.title='蹲行 / 偷窃 · Z 起身';mode.setAttribute('aria-label',mode.title);mode.setAttribute('role','status');
 // Detail panels are mutually exclusive visually, without changing gameplay state.
 const panels=['night-deal','drawer','panel','environment-panel','street-panel','object-actions','result'].map(byId).filter(Boolean);
 function sync(){const active=panels.find(p=>!p.hidden);for(const p of panels)p.classList.toggle('hud-obscured',!!active&&p!==active);document.body.classList.toggle('hud-detail-open',!!active);}
 const observer=new MutationObserver(sync);for(const p of panels)observer.observe(p,{attributes:true,attributeFilter:['hidden']});sync();
}
