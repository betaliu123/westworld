import {icon} from './ui-icons.js';
// HUD owns screen space; world-space speech and markers remain in the scene.
export function mountHudLayout(){
 const byId=id=>document.getElementById(id);
 const dock=(id,children)=>{const el=document.createElement('div');el.id=id;for(const child of children){const node=byId(child);if(node)el.append(node);}document.body.append(el);return el;};
 dock('hud-left-stack',['vitals','gate-objective','party-ui','journal']);
 const context=dock('hud-context-stack',['ambient']);
 const actions=dock('hud-context-actions',['stealth-mode','interact']);context.append(actions);const water=document.createElement('span');water.id='water-state';water.innerHTML=icon('Waves');water.title='溺水 · 气血持续下降，尽快上岸';water.setAttribute('aria-label',water.title);water.setAttribute('role','status');actions.append(water);
 const mode=byId('stealth-mode');mode.innerHTML=icon('EyeOff');mode.title='蹲行 / 偷窃 · Z 起身';mode.setAttribute('aria-label',mode.title);mode.setAttribute('role','status');
 // Detail panels are mutually exclusive visually, without changing gameplay state.
 const panels=['drawer','panel','environment-panel','street-panel','object-actions','result'].map(byId).filter(Boolean);
 function sync(){const active=panels.find(p=>!p.hidden);for(const p of panels)p.classList.toggle('hud-obscured',!!active&&p!==active);document.body.classList.toggle('hud-detail-open',!!active);}
 const observer=new MutationObserver(sync);for(const p of panels)observer.observe(p,{attributes:true,attributeFilter:['hidden']});sync();
}
