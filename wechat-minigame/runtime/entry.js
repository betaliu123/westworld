import './polyfills.js';
import {installPlatform} from './platform.js';
const loading=GameGlobal.__jianghuLoading;
const platform=installPlatform();platform.env.__jianghuLoading=loading;
console.info('[江湖移动版 mobile-startup-1113d]',platform.env.mobileDisplay.mode,platform.info.windowWidth,platform.info.windowHeight,platform.info.pixelRatio);
// CanvasTexture receives a native offscreen surface rather than a DOM wrapper.

GameGlobal.__jianghuPlatform=platform;platform.env.__jianghuPlatform=platform;
const {MobileUI}=require('./mobile-ui.js');
const T=require('../engine/vendor/three.module.js');
const ui=new MobileUI(platform,T);GameGlobal.__mobileUI=ui;platform.env.__mobileUI=ui;
if(loading){
 loading.handoff();
 loading.subscribe(()=>{ui.nextPaint=0;if(ui.world)ui.render(ui.world);else if(loading.error)wx.showModal({title:'载入未完成',content:loading.error,showCancel:false});});
 loading.startWorld=async world=>{
  try{if(!await world.modelsReady)return;loading.set('展开画卷');await ui.prepareOpening();loading.set('绘制场景');await loading.turn();
   world.locked=true;world.update(1/60);await loading.turn();loading.finish();ui.nextPaint=0;
  }catch(error){console.error('World preparation failed',error);loading.fail('场景未能载入，请重试');}
 };
}
require('../engine/src/main.js');
// Decode both opening images while models load, before the welcome menu unlocks.
ui.prepareOpening().catch(error=>{console.error('Opening preparation failed',error);loading?.fail('开场画卷未能载入，请重试');});
