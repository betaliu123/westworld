import {icon} from './ui-icons.js';
import {investigationAreas} from './crime-investigation.js';

export function investigationClock(seconds){const n=Math.max(0,Math.ceil(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
export function drawInvestigationAreas(ctx,areas,color,{x=82,y=82,scale=2.5}={}){
 ctx.save();ctx.strokeStyle=ctx.fillStyle=color;ctx.lineWidth=2;ctx.setLineDash([4,3]);
 for(const area of areas){
  const cx=x+area.x*scale,cy=y+area.z*scale,r=area.radius*scale;
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.globalAlpha=.1;ctx.fill();ctx.globalAlpha=1;ctx.stroke();
  // Short compass ticks distinguish this boundary from destinations and event dots.
  ctx.setLineDash([]);ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.moveTo(cx+Math.cos(a)*(r-3),cy+Math.sin(a)*(r-3));ctx.lineTo(cx+Math.cos(a)*(r+3),cy+Math.sin(a)*(r+3));}ctx.stroke();ctx.setLineDash([4,3]);
 }ctx.restore();
}

export function mountInvestigationHUD(root){
 const el=document.createElement('div');el.id='investigation-status';el.className='ink-float';el.hidden=true;el.setAttribute('role','group');el.setAttribute('aria-label','官差盘查状态');
 el.innerHTML='<span class="investigation-mark" aria-hidden="true">'+icon('Investigation')+'</span><span class="investigation-copy"><span class="investigation-line"><b data-label>官差盘查</b><time aria-live="off"></time></span><span data-hint aria-live="polite"></span></span>';
 root.prepend(el);const label=el.querySelector('[data-label]'),timer=el.querySelector('time'),hint=el.querySelector('[data-hint]');
 const color=getComputedStyle(document.documentElement).getPropertyValue('--cinnabar').trim();let previous=null,extendedUntil=0,endedUntil=0;
 const set=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 return {
  update(s,position=s.player){
   const areas=investigationAreas(s,position),current=areas[0],now=s.npcClock||0;
   if(current){
    if(previous?.id===current.id&&current.expires>previous.expires)extendedUntil=now+5;
    else if(previous?.id!==current.id)extendedUntil=0;
    set(label,areas.length>1?'官差盘查 · '+areas.length+'处':'官差盘查');set(timer,investigationClock(current.seconds));timer.hidden=false;
    timer.setAttribute('aria-label','盘查剩余 '+Math.floor(current.seconds/60)+' 分 '+current.seconds%60+' 秒');
    set(hint,(now<extendedUntil?'盘查延长 · ':'')+(current.inside?'逗留可能被盘问':'已离开盘查范围'));
    el.dataset.state=current.inside?'inside':'outside';el.hidden=false;endedUntil=0;previous=current;
   }else{
    if(previous&&previous.expires<=now)endedUntil=now+4;
    previous=null;el.hidden=now>=endedUntil;timer.hidden=true;el.dataset.state='ended';set(label,'盘查结束');set(hint,'');
   }
   return areas;
  },
  drawMap(ctx,areas){drawInvestigationAreas(ctx,areas,color);},
 };
}
