// Progress comes from package bytes and completed model jobs, never a timer.
export function createLoadingState({yieldFrame=()=>new Promise(r=>setTimeout(r,16)),timeout=45000}={}){
 let tail=Promise.resolve(),notify=()=>{};
 const state={active:true,stage:'读取画卷',done:0,total:0,error:'',retry:null,
  subscribe(fn){notify=fn;notify(state);},
  set(stage,done=0,total=0){if(state.error)return;Object.assign(state,{stage,done:Math.max(0,done),total:Math.max(0,total)});notify(state);},
  fail(message){state.error=message;state.active=true;notify(state);},
  reset(){Object.assign(state,{active:true,error:'',done:0,total:0});},
  finish(){if(state.error)return false;state.active=false;notify(state);return true;},
  turn(){const next=tail.then(yieldFrame);tail=next.catch(()=>{});return next;},
  async models(jobs){
   state.set('人物入画',0,jobs.length);let done=0,timer;
   const stalled=new Promise(resolve=>{const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>{state.fail('人物资源载入超时，请重试');resolve(false);},timeout);};state.modelHeartbeat=arm;arm();});
   const loaded=Promise.all(jobs.map(async job=>{try{const value=await job.promise;if(!job.ready(value))throw Error('model not ready');done++;state.set('人物入画',done,jobs.length);state.modelHeartbeat();return true;}catch(error){console.error('Startup model failed',job.label,error);state.fail('人物资源未能载入，请重试');return false;}})).then(ok=>ok.every(Boolean));
   const result=await Promise.race([loaded,stalled]);clearTimeout(timer);state.modelHeartbeat=()=>{};return result&&!state.error;
  }
 };return state;
}
