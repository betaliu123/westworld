const MODES={auto:{label:'自动',maxRatio:1.8,pixels:1_500_000,shadow:768,hz:10},clear:{label:'高清',maxRatio:3,pixels:4_000_000,shadow:1024,hz:15},balanced:{label:'均衡',maxRatio:1.6,pixels:1_500_000,shadow:512,hz:10},battery:{label:'省电',maxRatio:1.25,pixels:1_000_000,shadow:512,hz:6}};
function ratio(w,h,dpr,limit,pixels){return Math.max(.75,Math.min(dpr||1,limit,Math.sqrt(pixels/Math.max(1,w*h))));}
export function createDisplayQuality(info,storage){
 let mode='auto';try{const saved=storage?.getItem('display-quality');if(MODES[saved])mode=saved;}catch{}
 let width=info.windowWidth,height=info.windowHeight,step=0,sum=0,frames=0,wait=4000,slow=0,fast=0,before=0,trial=false,blocked=false,shadowAt=-Infinity;
 const api={get mode(){return mode;},get label(){return MODES[mode].label;},get sceneRatio(){const p=MODES[mode],scale=mode==='auto'?[1.8,1.8,1.5,1.25][step]:p.maxRatio;return ratio(width,height,info.pixelRatio,scale,p.pixels);},get hudRatio(){return ratio(width,height,info.pixelRatio,3,4_000_000);},get shadowSize(){return mode==='auto'&&step?512:MODES[mode].shadow;},
  shadowDue(now){const hz=mode==='auto'&&step?6:MODES[mode].hz;if(now-shadowAt<1000/hz)return false;shadowAt=now;return true;},
  resize(w,h){width=w;height=h;},
  cycle(){mode={auto:'clear',clear:'balanced',balanced:'battery',battery:'auto'}[mode];step=0;wait=2000;sum=frames=slow=fast=0;trial=blocked=false;try{storage?.setItem('display-quality',mode);}catch{}return mode;},
  frame(ms){
   if(mode!=='auto'||!(ms>0)||ms>250)return false;
   if(wait>0){wait-=ms;return false;}sum+=ms;frames++;if(sum<1500)return false;
   const mean=sum/frames;sum=frames=0;
   if(trial){trial=false;if(mean>before*.94){step--;blocked=true;wait=2000;return true;}}
   if(mean<24){if(++fast>=8&&step>0){step--;fast=slow=0;blocked=false;wait=4000;return true;}}else fast=0;
   if(mean<=38||blocked){slow=0;return false;}if(++slow<2||step>=3)return false;
   before=mean;step++;trial=step>1;slow=0;wait=1500;return true;
  }
 };return api;
}
