import './polyfills.js';
import {installPlatform} from './platform.js';
const platform=installPlatform();
console.info('[江湖移动版 mobile-experience-1113c]',platform.env.mobileDisplay.mode,platform.info.windowWidth,platform.info.windowHeight,platform.info.pixelRatio);
// CanvasTexture receives a native offscreen surface rather than a DOM wrapper.

GameGlobal.__jianghuPlatform=platform;platform.env.__jianghuPlatform=platform;
const {MobileUI}=require('./mobile-ui.js');
const T=require('../engine/vendor/three.module.js');
const ui=new MobileUI(platform,T);GameGlobal.__mobileUI=ui;platform.env.__mobileUI=ui;
require('../engine/src/main.js');
