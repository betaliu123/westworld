import {createLoadingState} from './loading-state.js';
import {bootSurface} from './boot-surface.js';
// DevTools/background windows may suspend rAF while file IO is still running.
// Always yield, but do not leave resource preparation waiting on a suspended frame.
const state=GameGlobal.__jianghuLoading=createLoadingState({yieldFrame:()=>new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;setTimeout(resolve,0);}};requestAnimationFrame(finish);setTimeout(finish,40);})});
GameGlobal.canvas=wx.createCanvas();let surface;
try{surface=bootSurface(wx,GameGlobal.canvas,state);state.subscribe(()=>surface.paint());}
catch(error){console.error('Loading surface',error);wx.showLoading({title:'载入江湖',mask:true});}
state.handoff=()=>{surface?.dispose();state.subscribe(()=>{});wx.hideLoading?.();};
function load(){
 state.reset();state.set('读取画卷');state.retry=load;
 const task=wx.loadSubpackage({name:'resources',success:async()=>{
  state.set('铺展江湖');await state.turn();
  state.retry=()=>wx.restartMiniProgram?wx.restartMiniProgram({}):wx.showModal({title:'请重新打开游戏',content:'载入未完成，存档会保留。',showCancel:false});
  try{require('./game.js');}catch(error){console.error('Startup failed',error);state.fail('江湖未能载入，请重试');}
 },fail(error){console.error('Resource package failed',error);state.fail('资源读取失败，请重试');}});
 task?.onProgressUpdate?.(p=>{if(state.stage==='读取画卷')state.set('读取画卷',p.totalBytesWritten||0,p.totalBytesExpectedToWrite||0);});
}
load();
