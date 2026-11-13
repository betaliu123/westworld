import {iconGeometry} from '../engine/src/ui-icons.js';
import {TITLE_OUTLINES} from './title-outlines.js';

export const PALETTE={paper:'#ece3cf',paperDeep:'#d8cbaf',ink0:'#15140f',ink:'#2c2a24',ink2:'#4f4b42',ink3:'#7b766a',ink4:'#b4ac9a',red:'#a63a2b',green:'#5f7f5c',ochre:'#9c6d3c',blue:'#3d6470'};
const geometry=new Map();
// The wordmark uses the exact web-font outlines. Native font fallback cannot
// replace these five glyphs with KaiTi, even if wx.loadFont reports success.
export function drawInkTitle(ctx,text,x,y,size=44){
 const scale=size/TITLE_OUTLINES.unitsPerEm;ctx.save();ctx.translate(x,y+TITLE_OUTLINES.top*scale);ctx.scale(scale,-scale);ctx.fillStyle=PALETTE.ink0;
 for(const char of text){const glyph=TITLE_OUTLINES.glyphs[char];if(!glyph)continue;ctx.beginPath();for(const [op,...p] of glyph.commands){if(op==='M')ctx.moveTo(...p);else if(op==='L')ctx.lineTo(...p);else if(op==='Q')ctx.quadraticCurveTo(...p);else if(op==='C')ctx.bezierCurveTo(...p);else if(op==='Z')ctx.closePath();}ctx.fill();ctx.translate(glyph.advance+TITLE_OUTLINES.unitsPerEm*.14,0);}
 ctx.restore();
}
export function drawInkIcon(ctx,name,x,y,size=28,color=PALETTE.ink){
 if(!geometry.has(name))geometry.set(name,iconGeometry(name));
 ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.fillStyle=color;ctx.strokeStyle=PALETTE.paper;ctx.lineWidth=1.4;ctx.lineJoin='round';
 for(const part of geometry.get(name)){
  // HUD tools stay monochrome; only an active/important control gains a seal.
  if(part.points){ctx.beginPath();part.points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.stroke();ctx.fill();}
  if(part.dot){ctx.beginPath();ctx.arc(part.dot[0],part.dot[1],part.dot[2],0,Math.PI*2);ctx.stroke();ctx.fill();}
 }
 ctx.restore();
}
export function brushLine(ctx,x,y,w,color=PALETTE.ink4){
 ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.31,y-.7);ctx.lineTo(x+w,y+.4);ctx.lineTo(x+w*.96,y+1.2);ctx.lineTo(x+w*.37,y+1.5);ctx.lineTo(x,y+.8);ctx.closePath();ctx.fill();ctx.restore();
}
export function paper(ctx,x,y,w,h,alpha=.94){
 ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=PALETTE.paper;
 ctx.beginPath();ctx.moveTo(x+2,y+1);ctx.lineTo(x+w*.37,y);ctx.lineTo(x+w-1,y+2);ctx.lineTo(x+w,y+h*.6);ctx.lineTo(x+w-2,y+h-1);ctx.lineTo(x+w*.55,y+h);ctx.lineTo(x,y+h-2);ctx.closePath();ctx.fill();
 ctx.globalAlpha=alpha*.12;ctx.fillStyle=PALETTE.ink4;
 for(let i=0;i<Math.ceil(w*h/180);i++){const px=x+(i*73.37)%w,py=y+(i*37.13)%h;ctx.fillRect(px,py,i%3===0?2:1,1);}
 ctx.restore();
}
export function loadInkFonts(wx,assets={},read){
 const fallback='KaiTi, STKaiti, SimSun, "Songti SC"';
 const load=name=>{const key='assets/fonts/'+name,asset=assets[key];if(!asset||!wx.loadFont)return '';try{
  let path=asset.path;
  if(asset.gzip){if(!read||!wx.env?.USER_DATA_PATH)return '';const bytes=read(key);let hash=2166136261;for(const b of bytes)hash=Math.imul(hash^b,16777619);path=wx.env.USER_DATA_PATH+'/jianghu-font-'+name.replace('.ttf','')+'-'+(hash>>>0).toString(16)+'.ttf';const fs=wx.getFileSystemManager();fs.writeFileSync(path,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));}
  return wx.loadFont(path)||'';
 }catch{return '';}};
 const quoted=name=>name?`"${name}"` : '';
 const body=[load('wenkai-core.ttf'),load('wenkai-ext.ttf')].filter(Boolean).map(quoted).join(', ');
 const title=quoted(load('zhimangxing.ttf')),numbers=quoted(load('notoserifsc-600.ttf'));
 return {body:[body,fallback].filter(Boolean).join(', '),title:[title,body,fallback].filter(Boolean).join(', '),numbers:[numbers,body,fallback].filter(Boolean).join(', ')};
}
