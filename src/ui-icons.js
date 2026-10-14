export function icon(name){return window.lucide.createElement(window.lucide.icons[name],{width:24,height:24,'stroke-width':1.6,'aria-hidden':'true'}).outerHTML;}
export function iconButton(button,name,label){
 if(button.dataset.icon!==name){const badge=button.querySelector('#unread');button.innerHTML=icon(name);if(badge)button.append(badge);button.dataset.icon=name;}
 button.classList.add('icon-button');button.setAttribute('aria-label',label);button.dataset.tooltip=label;
}
