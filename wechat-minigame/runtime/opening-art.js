import {PALETTE as P} from './ink-canvas.js';

// Native images decode separately from the lightweight document's <img> nodes.
// Keep an opaque sheet and the last decoded frame until the next one is ready.
export class OpeningArt {
 constructor(platform){this.p=platform;this.cache=new Map();this.last=null;}
 image(node){
  const src=node.getAttribute('src');
  if(this.cache.has(src))return this.cache.get(src);
  const image=this.p.image(),item={image,ready:false,promise:null};
  this.cache.set(src,item);
  item.promise=new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error)=>{
    if(settled)return;settled=true;clearTimeout(timer);
    item.ready=!error;
    node.dispatchEvent(new this.p.dom.Event(error?'error':'load'));
    if(error)reject(error);else resolve(item);
   };
   const timer=setTimeout(()=>finish(Error('开场画卷载入超时')),45000);
   image.addEventListener('load',()=>finish(image.width>0?null:Error('开场画卷为空')));
   image.addEventListener('error',()=>finish(Error('开场画卷未能载入')));
   const asset=this.p.assets[this.p.clean(src)];
   if(asset)image.src=asset.path;else finish(Error('开场画卷缺失'));
  });
  // Paint may initiate decoding before the startup gate subscribes.
  item.promise.catch(()=>{});
  return item;
 }
 prepare(root){return Promise.all([...root.querySelectorAll('img')].map(n=>this.image(n).promise));}
 paint(root,c,w,h){
  c.save();c.globalAlpha=1;c.fillStyle=P.paper;c.fillRect(0,0,w,h);
  const node=root.querySelector('img.current')||root.querySelector('img');
  const current=node?this.image(node):null;
  const draw=item=>{if(!item?.ready)return false;try{c.drawImage(item.image,0,0,w,h);return true;}catch{return false;}};
  if(draw(current))this.last=current;else draw(this.last);
  c.restore();
 }
}
