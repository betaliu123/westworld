import {PALETTE as P,drawInkTitle,brushLine} from './ink-canvas.js';
export function drawLoading(c,w,h,state,fonts={}){
 c.save();c.globalAlpha=1;c.fillStyle=P.paper;c.fillRect(0,0,w,h);
 // A small ink landscape leaves the middle of the sheet quiet.
 c.fillStyle=P.paperDeep;c.beginPath();c.moveTo(0,h*.77);
 for(const [x,y] of [[.08,.69],[.18,.75],[.29,.62],[.39,.73],[.48,.66],[.6,.76],[.72,.67],[.83,.73],[.93,.61],[1,.7]])c.lineTo(w*x,h*y);
 c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
 const titleSize=w<480?30:44,titleWidth=titleSize*5.7;
 drawInkTitle(c,'江湖有回声',(w-titleWidth)/2,Math.max(30,h*.24),titleSize);
 const bw=Math.min(320,w-96),x=(w-bw)/2,y=Math.min(h-104,h*.58);
 c.font='16px '+(fonts.body||'"KaiTi", "STKaiti", serif');c.textAlign='center';c.textBaseline='top';c.fillStyle=state.error?P.red:P.ink2;
 c.fillText(state.error||state.stage,w/2,y-32);brushLine(c,x,y,bw,P.ink4);
 const ratio=state.total>0?Math.max(0,Math.min(1,state.done/state.total)):null;
 if(ratio!==null&&ratio>0){c.fillStyle=P.ink;c.fillRect(x,y-1,bw*ratio,3);}
 else if(ratio===null&&!state.error){brushLine(c,x,y,Math.min(24,bw),P.ink3);}
 c.font='14px '+(fonts.numbers||'"SimSun", serif');c.fillStyle=P.ink3;
 if(!state.error&&ratio!==null)c.fillText(state.stage==='人物入画'?state.done+' / '+state.total:Math.floor(ratio*100)+'%',w/2,y+17);
 const retry={x:w/2-56,y:y+20,w:112,h:44};
 if(state.error){c.font='16px '+(fonts.body||'"KaiTi", "STKaiti", serif');c.fillStyle=P.ink;c.fillText('重新载入',w/2,retry.y+13);brushLine(c,retry.x+12,retry.y+41,retry.w-24,P.ink3);}
 c.restore();return {bar:{x,y,w:bw,h:3},retry:state.error?retry:null};
}
