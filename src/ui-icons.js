import {inkIcon,ensureInkDefs} from './ink-icons.js';
// Lucide names used across the UI map onto the brush-stroke set; anything unmapped falls back to lucide.
const INK={Rope:'rope',Swords:'sword',Backpack:'bundle',Package:'bundle',UserRound:'mirror',Mail:'letter',Coffee:'tea',Volume2:'bell',VolumeX:'bellMute',ScrollText:'scroll',Hand:'hand',EyeOff:'crouch',Coins:'coin',Eye:'eye',X:'close',Square:'close',BookOpen:'book',Moon:'moon',Waves:'water',FlaskConical:'gourd',Circle:'ring',Apple:'fruit',Sandwich:'bun',Compass:'compass',Keyboard:'brush',Heart:'heart',Zap:'energy',RotateCcw:'restart',MessageCircle:'talk',Music2:'flute',Network:'web',MapPin:'flag',Shirt:'robe',Fan:'fan',Gem:'jade',Badge:'token',Utensils:'bowl'};
INK.AttentionAway='eyeAway';INK.AttentionEdge='eyeEdge';
INK.Investigation='investigation';
INK.Disguise='disguise';
export function icon(name){if(INK[name]&&globalThis.document?.body){ensureInkDefs();return inkIcon(INK[name]);}return window.lucide.createElement(window.lucide.icons[name],{width:24,height:24,'stroke-width':1.6,'aria-hidden':'true'}).outerHTML;}
// Self-contained SVG for scene sprites; uses the same brush paths as the HUD.
export function sceneIcon(name){const css=getComputedStyle(document.documentElement),ink=css.getPropertyValue('--ink-1').trim()||css.getPropertyValue('--ink').trim(),paper=css.getPropertyValue('--paper').trim();
 return inkIcon(INK[name],{size:128}).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace(' filter="url(#ink-rough)"','').replaceAll('currentColor',ink).replaceAll('var(--cinnabar,#a63a2b)',ink).replaceAll('<path ',`<path stroke="${paper}" stroke-width="1.1" stroke-linejoin="round" paint-order="stroke" `);
}
export function iconButton(button,name,label){
 if(button.dataset.icon!==name){const badge=button.querySelector('#unread');button.innerHTML=icon(name);if(badge)button.append(badge);button.dataset.icon=name;}
 button.classList.add('icon-button');button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.title=label;
}
