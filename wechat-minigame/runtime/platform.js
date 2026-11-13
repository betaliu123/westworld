import {parseHTML} from 'linkedom';
import {gunzipSync,strFromU8} from 'fflate';
import assets from './asset-map.json';
import html from './page.js';
import {createFrameClock} from './frame-clock.js';
import {createDisplayQuality} from './display-quality.js';
import {createAudioContextClass} from './wechat-audio.js';
import {textureFiles} from './texture-files.js';
export function installPlatform(){
 const g=GameGlobal;const nativeCanvas=g.canvas;const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();
 const {document,window:dom}=parseHTML(html);const proto=dom.HTMLElement.prototype;
 const events=new dom.EventTarget();
 // LinkeDOM supplies selectors and bubbling; layout is owned by the touch HUD.
 Object.defineProperties(proto,{offsetWidth:{configurable:true,get(){return this._rect?.width||240;}},offsetHeight:{configurable:true,get(){return this._rect?.height||48;}},clientWidth:{configurable:true,get(){return this._rect?.width||240;}},clientHeight:{configurable:true,get(){return this._rect?.height||48;}},innerText:{configurable:true,get(){return this.textContent;},set(v){this.textContent=v;}}});
 proto.getBoundingClientRect=function(){return this._rect||{x:0,y:0,left:0,top:0,right:240,bottom:48,width:240,height:48};};
 proto.focus=function(){document._active=this;};proto.blur=function(){document._active=null;};proto.scrollIntoView=function(){};proto.setPointerCapture=function(){};proto.releasePointerCapture=function(){};
 proto.animate=function(){const a={cancel(){}};setTimeout(()=>a.onfinish?.(),420);return a;};
 Object.defineProperty(document,'activeElement',{get:()=>document._active||document.body});
 const create=document.createElement.bind(document);let worldCanvas=document.getElementById('world');
 function canvasElement(el){const c=wx.createCanvas();el._canvas=c;el.getContext=(...a)=>c.getContext(...a);for(const prop of ['width','height'])Object.defineProperty(el,prop,{get:()=>c[prop],set:v=>c[prop]=v});return el;}
 // Render to the real surface; the document's canvas node forwards its WebGL context.
 worldCanvas._rect={x:0,y:0,left:0,top:0,width:info.windowWidth,height:info.windowHeight,right:info.windowWidth,bottom:info.windowHeight};worldCanvas._canvas=nativeCanvas;worldCanvas.style={};worldCanvas.getContext=(...a)=>nativeCanvas.getContext(...a);
 for(const p of ['width','height'])Object.defineProperty(worldCanvas,p,{get:()=>nativeCanvas[p],set:v=>nativeCanvas[p]=v});
 for(const c of document.querySelectorAll('canvas'))if(c!==worldCanvas)canvasElement(c);
 document.createElement=(tag,...rest)=>{const e=create(tag,...rest);if(tag.toLowerCase()==='canvas')canvasElement(e);return e;};
 document.createElementNS=(_ns,tag)=>tag==='img'?image():document.createElement(tag);
 function image(){const im=wx.createImage();const handlers={};im.addEventListener=(n,f)=>(handlers[n]??=[]).push(f);im.removeEventListener=(n,f)=>handlers[n]=handlers[n]?.filter(v=>v!==f);im.onload=()=>handlers.load?.forEach(f=>f.call(im));im.onerror=e=>handlers.error?.forEach(f=>f.call(im,e));return im;}
 const fs=wx.getFileSystemManager(),textureURLs=textureFiles(fs,wx.env.USER_DATA_PATH);
 const clean=url=>String(url?.url||url).replace(/^https:\/\/game.local\//,'').replace(/^\.\//,'').replace(/^\//,'').split('?')[0];
 function read(url){const key=clean(url),a=assets[key];if(!a)throw Error('Missing packaged asset: '+key);const raw=fs.readFileSync(a.path);return a.gzip?gunzipSync(new Uint8Array(raw)):new Uint8Array(raw);}
 const storagePrefix=g.__jianghuPreviewStorage?'jianghu-wx-ui-preview:':'jianghu-wx:';
 const storage={getItem:k=>{const v=wx.getStorageSync(storagePrefix+k);return v===''?null:String(v);},setItem:(k,v)=>wx.setStorageSync(storagePrefix+k,String(v)),removeItem:k=>wx.removeStorageSync(storagePrefix+k)};
 const mobileDisplay=createDisplayQuality(info,storage);wx.setPreferredFramesPerSecond?.(60);
 const loc={search:'?ink=0&quality=full',hostname:'game.local',href:'https://game.local/index.html',reload:()=>wx.restartMiniProgram?.({})};
 const URLClass=class{constructor(url,base='https://game.local/'){this.href=/^[a-z]+:/.test(String(url))?String(url):String(base).replace(/[^/]*$/,'')+String(url);this.href=this.href.replace(/\/[^/]+\/\.\.\//g,'/').replace(/\/\.\//g,'/');}toString(){return this.href;}static createObjectURL(blob){return textureURLs.createObjectURL(blob);}static revokeObjectURL(name){textureURLs.revokeObjectURL(name);}};
 const fetcher=async url=>{if(g.__jianghuLoading?.active)await g.__jianghuLoading.turn();const key=clean(url);let data,status=200;if(key==='api/status'||key==='api/voice/status')data=new Uint8Array([123,125]);else if(key.startsWith('api/')){data=new Uint8Array([123,125]);status=503;}else{try{data=read(key);}catch{data=new Uint8Array([123,125]);status=404;}}return {ok:status===200,status,url:String(url),headers:{get:()=>null},text:async()=>strFromU8(data),json:async()=>JSON.parse(strFromU8(data)),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),blob:async()=>({bytes:data,type:'application/octet-stream'})};};
 const clock=createFrameClock({nativePerformance:typeof performance!=='undefined'?performance:undefined,wxPerformance:wx.getPerformance?.(),request:typeof requestAnimationFrame==='function'?requestAnimationFrame.bind(g):undefined,cancel:typeof cancelAnimationFrame==='function'?cancelAnimationFrame.bind(g):undefined});
 const window={};const globals={...clock,mobileDisplay,window,document,self:g,navigator:{userAgent:'WeChat MiniGame',platform:info.platform||'wechat'},innerWidth:info.windowWidth,innerHeight:info.windowHeight,devicePixelRatio:info.pixelRatio||1,location:loc,localStorage:storage,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},fetch:fetcher,Image:image,URL:URLClass,Request:class{constructor(url){this.url=String(url);}},Headers:class{},Blob:class{constructor(parts,opts={}){this.type=opts.type;const arrays=parts.map(v=>new Uint8Array(v));this.bytes=new Uint8Array(arrays.reduce((n,v)=>n+v.length,0));let i=0;for(const a of arrays){this.bytes.set(a,i);i+=a.length;}}},TextDecoder:class{decode(b){return strFromU8(new Uint8Array(b));}},TextEncoder:class{encode(s){return new Uint8Array(unescape(encodeURIComponent(s)).split('').map(c=>c.charCodeAt(0)));}},MutationObserver:dom.MutationObserver,DOMParser:dom.DOMParser,HTMLElement:dom.HTMLElement,HTMLCanvasElement:dom.HTMLCanvasElement,HTMLImageElement:class{},Event:dom.Event,CustomEvent:dom.CustomEvent,Node:dom.Node,CSS:{escape:s=>String(s).replace(/[^\w-]/g,'\\$&')},getComputedStyle:e=>({getPropertyValue:k=>({'--cinnabar':'#a63a2b','--ink':'#2c2a24','--ink-1':'#2c2a24','--paper':'#ece3cf'}[k]||''),visibility:e.hidden?'hidden':'visible'}),matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(...a)=>events.addEventListener(...a),removeEventListener:(...a)=>events.removeEventListener(...a),dispatchEvent:e=>events.dispatchEvent(e)};
 globals.URLSearchParams=class{constructor(s){this.values=Object.fromEntries(String(s).replace(/^\?/,'').split('&').map(p=>p.split('=')));}get(k){return this.values[k]||null;}};
 globals.AbortSignal={timeout:()=>undefined};
 globals.AudioContext=createAudioContextClass(wx);
 const resumeAudio=()=>{if(!document.hidden&&storage.getItem('jianghu-sound')!=='off')globals.AudioContext.resumeAll();};
 wx.onAudioInterruptionBegin?.(()=>globals.AudioContext.suspendAll());
 wx.onAudioInterruptionEnd?.(resumeAudio);
 
 const key=(code,type='keydown')=>{const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{code,key:code,repeat:false});events.dispatchEvent(e);document.dispatchEvent(e);};
 wx.onHide(()=>{document.hidden=true;globals.AudioContext.suspendAll();key('Escape');events.dispatchEvent(new dom.Event('blur'));events.dispatchEvent(new dom.Event('beforeunload'));document.dispatchEvent(new dom.Event('visibilitychange'));});
 wx.onShow(()=>{document.hidden=false;resumeAudio();document.dispatchEvent(new dom.Event('visibilitychange'));});
 wx.onWindowResize?.(({windowWidth,windowHeight})=>{globals.innerWidth=windowWidth;globals.innerHeight=windowHeight;mobileDisplay.resize(windowWidth,windowHeight);events.dispatchEvent(new dom.Event('resize'));});
 // Unwrap virtual canvases before uploading them as Three textures.
 globals.self=globals;Object.assign(window,globals);return {env:globals,document,dom,canvas:nativeCanvas,worldCanvas,key,read,image,assets,info,clean};
}
