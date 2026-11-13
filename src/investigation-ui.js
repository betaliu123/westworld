import {icon} from './ui-icons.js';
import {investigationAreas,INVESTIGATION_DURATION} from './crime-investigation.js';

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
 el.innerHTML='<span class="investigation-mark" aria-hidden="true">'+icon('Investigation')+'</span><b data-label>官差盘查</b>';
 root.prepend(el);const label=el.querySelector('[data-label]');
 const color=getComputedStyle(document.documentElement).getPropertyValue('--cinnabar').trim();
 const set=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 return {
  update(s,position=s.player){
   const areas=investigationAreas(s,position),current=areas[0],now=s.npcClock||0;
   if(current){
    set(label,areas.length>1?'官差盘查 · '+areas.length+'处':'官差盘查');
    const remaining=Math.max(0,current.expires-now)/INVESTIGATION_DURATION;
    el.style.setProperty('--investigation-ink',String(.15+.85*Math.min(1,remaining)));
    el.dataset.state=current.inside?'inside':'outside';el.hidden=false;
   }else{
    el.hidden=true;
   }
   return areas;
  },
  drawMap(ctx,areas,view){drawInvestigationAreas(ctx,areas,color,view);},
 };
}
