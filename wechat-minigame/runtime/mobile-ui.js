import {TouchRouter,hit} from './input.js';
import {PALETTE as P,drawInkIcon,drawInkTitle,brushLine,paper,loadInkFonts} from './ink-canvas.js';
import {iconNameFromSvg} from '../engine/src/ui-icons.js';
import {drawLoading} from './loading-view.js';
import {OpeningArt} from './opening-art.js';
const DIALOGUES=['dialogue-stage','dialogue','cinematic-dialogue'];
export class MobileUI{
 constructor(platform,T){
  this.p=platform;this.T=T;this.surface=wx.createCanvas();this.ctx=this.surface.getContext('2d');this.fonts=loadInkFonts(wx,platform.assets,platform.read);this.zones=[];this.dirty=true;this.scroll=0;this.openingArt=new OpeningArt(platform);
  this.input=new TouchRouter({key:platform.key,camera:(dx,dy)=>{const w=this.world;if(!w||w.locked)return;w.yaw-=dx*.006;w.pitch=Math.max(.045,Math.min(1.05,w.pitch+dy*.004));},tap:(x,y)=>{if(!this.world?.locked){const e=new platform.dom.Event('pointerdown',{bubbles:true,cancelable:true});Object.assign(e,{button:0,clientX:x,clientY:y,pointerId:0});platform.worldCanvas.dispatchEvent(e);}}});
  const touches=e=>e.changedTouches||[];
  platform.document.addEventListener('keydown',e=>{if(e.code==='Escape')platform.document.getElementById('mobile-journal')?.remove();});
  wx.onTouchStart(e=>{this.nextPaint=0;this.p.document.dispatchEvent(new this.p.dom.Event('pointerdown',{bubbles:true}));this.dirty=true;for(const t of touches(e)){let zone=[...this.zones].reverse().find(z=>hit(z,t.clientX,t.clientY))||{kind:this.lastPanel?'ignored':'camera'};if(this.toolsOpen&&!['button','hold'].includes(zone.kind)){this.toolsOpen=false;if(zone.kind==='camera')zone={kind:'ignored'};}this.input.start(t,{...zone,at:this.now()});}});
  wx.onTouchMove(e=>{this.dirty=true;for(const t of touches(e))this.input.move(t);});
  wx.onTouchEnd(e=>{this.nextPaint=0;this.dirty=true;for(const t of touches(e)){const f=this.input.fingers.get(t.identifier);if(f?.kind==='stick')this.releasedStick={...f,at:this.now()};this.input.end(t);}});
  const cancel=()=>{this.input.cancel();this.releasedStick=null;this.dirty=true;this.nextPaint=0;};wx.onTouchCancel(cancel);wx.onHide(cancel);
 }
 now(){return this.p.env?.performance?.now()??Date.now();}
 visible(el){if(!el)return false;for(let n=el;n&&n!==this.p.document;n=n.parentElement)if(n.hidden||n.style?.display==='none'||n.style?.visibility==='hidden')return false;return true;}
 text(el){if(!el)return '';const c=el.cloneNode(true);c.querySelectorAll('svg,img,canvas,script,style,[hidden]').forEach(x=>x.remove());c.querySelectorAll('small,br').forEach(x=>x.before(' '));return c.textContent.replace(/\s+/g,' ').trim();}
 label(el){return this.text(el)||el.getAttribute('aria-label')||el.title||'继续';}
 press(el){if(el&&!el.disabled)el.click();this.dirty=true;this.nextPaint=0;}
 key(code){this.p.key(code);this.p.key(code,'keyup');this.dirty=true;this.nextPaint=0;}
 rect(x,y,w,h,color=P.paper){this.ctx.fillStyle=color;this.ctx.fillRect(x,y,w,h);}
 font(size=16,role='body'){this.ctx.font=`${size}px ${this.fonts[role]}`;this.ctx.textBaseline='top';}
 line(text,x,y,size=16,color=P.ink,role='body',halo=false){this.font(size,role);const c=this.ctx;c.fillStyle=color;if(halo){c.save();c.strokeStyle=P.paper;c.lineWidth=2;c.lineJoin='round';c.strokeText(String(text),x,y);c.restore();}c.fillText(String(text),x,y);}
 rows(text,w,size=16){this.font(size);const rows=[];let row='';for(const char of String(text)){if(char==='\n'||(row&&this.ctx.measureText(row+char).width>w)){rows.push(row);row=char==='\n'?'':char;}else row+=char;}if(row)rows.push(row);return rows;}
 wrap(text,x,y,w,size=16,color=P.ink){const rows=this.rows(text,w,size);rows.forEach((s,i)=>this.line(s,x,y+i*(size+8),size,color));return y+rows.length*(size+8);}
 icon(name,x,y,size=28,color=P.ink){drawInkIcon(this.ctx,name,x,y,size,color);}
 button(label,x,y,w,h,action,disabled=false,hold=null,opts={}){
  const c=this.ctx,pressed=[...this.input.fingers.values()].some(f=>f.label===label&&!f.moved),color=disabled?P.ink3:P.ink;
  c.save();if(disabled)c.globalAlpha=.55;
  if(pressed)paper(c,x,y,w,h,.8);
  if(opts.icon){const size=opts.size||28;this.icon(opts.icon,x+(w-size)/2,y+(h-size)/2,size,color);if(opts.active){c.fillStyle=P.red;c.fillRect(x+w-9,y+6,4,4);}}
  else{paper(c,x,y,w,h,pressed?.94:.48);const inset=opts.leadingIcon?44:12;if(opts.leadingIcon)this.icon(opts.leadingIcon,x+10,y+10,24,color);this.wrap(label,x+inset,y+Math.max(9,(h-24)/2),w-inset-12,16,color);brushLine(c,x+10,y+h-3,w-20,disabled?P.ink4:P.ink3);}
  c.restore();this.zones.push({x,y,w,h,kind:hold?'hold':'button',code:hold,action:disabled?null:action,label,icon:opts.icon,disabled});
 }
 iconButton(label,icon,x,y,action,opts={}){this.button(label,x,y,opts.w||44,opts.h||44,action,!!opts.disabled,opts.hold||null,{...opts,icon});}
 safe(w,h){const s=this.p.info.safeArea||{};if(this.menuViewport!==w+'x'+h){this.menuViewport=w+'x'+h;try{this.menuRect=wx.getMenuButtonBoundingClientRect?.();}catch{this.menuRect=null;}}return {left:Math.max(12,s.left||0),right:Math.max(12,w-(s.right||w)),top:Math.max(8,s.top||0),bottom:Math.max(12,h-(s.bottom||h))};}
 render(world){
  this.world=world;const {T}=this,d=this.p.document,w=this.p.env.innerWidth,h=this.p.env.innerHeight,safe=this.safe(w,h);this.safeArea=safe;
  const ratio=this.p.env.mobileDisplay?.hudRatio||1,pw=Math.round(w*ratio),ph=Math.round(h*ratio),resized=this.surface.width!==pw||this.surface.height!==ph,now=this.now();
  if(this.texture&&!resized&&now<(this.nextPaint||0)){this.compose(world);return;}this.dirty=false;this.nextPaint=now+1000/(this.input.fingers.size||now-(this.releasedStick?.at??-Infinity)<180?30:this.lastPanel||this.visible(d.getElementById('npc-speech'))?20:10);
  if(resized){this.surface.width=pw;this.surface.height=ph;this.scroll=0;this.input.cancel();}
  const c=this.ctx;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);this.zones=[];this.layout={width:w,height:h,regions:[]};
  if(!this.texture){this.texture=new T.CanvasTexture(this.surface);this.texture.colorSpace=T.SRGBColorSpace;this.texture.generateMipmaps=false;this.texture.minFilter=T.LinearFilter;this.texture.magFilter=T.LinearFilter;this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,2);const m=new T.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,depthWrite:false});m.toneMapped=false;this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),m));this.camera.position.z=1;}
  const loading=this.p.env.__jianghuLoading;
  if(loading?.active){this.lastPanel=null;if(!this.loadingShown){this.input.cancel();this.loadingShown=true;}const layout=drawLoading(c,w,h,loading,this.fonts);this.layout.loading=layout;if(layout.retry)this.zones.push({...layout.retry,kind:'button',label:'重新载入',action:()=>loading.retry?.()});this.texture.needsUpdate=true;this.compose(world);return;}
  this.loadingShown=false;
  const welcome=d.getElementById('welcome'),opening=d.getElementById('opening-sequence');
  const ids=['opening-sequence',...DIALOGUES,'lesson-stage','night-deal','aim-points','conversation','drawer','object-actions','panel','environment-panel','street-panel','mobile-journal'];
  const panel=ids.map(id=>d.getElementById(id)).find(e=>this.visible(e))||[...d.querySelectorAll('[role="dialog"]')].find(e=>this.visible(e));
  if(this.visible(opening))this.openingArt.paint(opening,c,w,h);
  if(panel){this.toolsOpen=false;const signature=panel.id+'|'+panel.className+'|'+this.text(panel.querySelector('[data-line]'))+'|'+this.text(panel.querySelector('.cinematic-choices'))+'|'+[...panel.querySelectorAll('[data-action]')].map(b=>b.dataset.action).join(',');if(panel!==this.lastPanel||signature!==this.panelSignature){this.scroll=0;this.input.cancel();this.releasedStick=null;}this.lastPanel=panel;this.panelSignature=signature;this.panel(panel,w,h,safe.left,safe.right);}
  else if(this.visible(welcome)){
   this.lastPanel=null;this.rect(0,0,w,h,P.paper+'70');drawInkTitle(c,'江湖',safe.left+28,h*.23,44);drawInkTitle(c,'有回声',safe.left+58,h*.23+60,44);
   const buttons=[...welcome.querySelectorAll('button')].filter(b=>this.visible(b));buttons.forEach((b,i)=>this.button(this.label(b),w*.59,h*.4+i*54,Math.min(240,w*.3),48,()=>this.press(b),b.disabled));
   const note=d.getElementById('restart-notice');if(this.visible(note))this.wrap(this.text(note),w*.59,h*.72,w*.3,14);this.settings(w,h,safe,true);
  }else{this.lastPanel=null;this.explore(world,w,h,safe);}
  const fatal=d.getElementById('fatal');if(this.visible(fatal)&&this.text(fatal))this.notice(this.text(fatal),w,safe.top+60);
  const held=[...this.input.fingers.values()].find(f=>f.icon&&!f.moved&&now-f.at>350);if(held){const tw=Math.min(w-32,this.ctx.measureText(held.label).width+24),tx=Math.max(16,Math.min(w-tw-16,held.x-tw/2)),ty=Math.max(8,held.y-46);paper(c,tx,ty,tw,32,.92);this.line(held.label,tx+12,ty+7,14);}
  this.texture.needsUpdate=true;this.compose(world);
 }
 compose(world){const r=world.renderer;r.setRenderTarget(null);const auto=r.autoClear;r.autoClear=false;r.clearDepth();r.render(this.scene,this.camera);r.autoClear=auto;}
 settings(w,h,safe,welcome=false){const d=this.p.document,y=welcome?h-safe.bottom-46:safe.top+48,x=w-safe.right-44,sound=d.getElementById('sound');if(sound)this.iconButton('声音',sound.getAttribute('aria-pressed')==='true'?'Volume2':'VolumeX',x,y,()=>this.press(sound));const display=this.p.env.mobileDisplay;if(display)this.iconButton('画质：'+display.label,'Fan',x-48,y,()=>{display.cycle();this.world.applyQuality();this.dirty=true;this.nextPaint=0;});}
 explore(world,w,h,s){
  const d=this.p.document,p=world.sim.s.player,bottom=h-s.bottom,rx=w-s.right-56;
  const skills=d.getElementById('aim-skills'),skillButtons=this.visible(skills)?[...skills.querySelectorAll('button')].filter(b=>this.visible(b)):[];
  const actionWidth=44+skillButtons.length*52,actionX=(w-actionWidth)/2,actionY=bottom-44;
  this.layout.actions={x:actionX,y:actionY,w:actionWidth,h:44};
  const stickZone={x:s.left,y:Math.max(s.top+100,h*.43),w:Math.min(w*.34,270,Math.max(100,actionX-s.left-12)),h:bottom-Math.max(s.top+100,h*.43),kind:'stick',label:'移动'};
  this.zones.push(stickZone);this.layout.regions.push({...stickZone,id:'movement'});this.drawStick(stickZone);
  const toolbar=[['行囊','Backpack',()=>this.key('KeyF')],['人物','UserRound',()=>this.key('KeyC')],['任务与线索','ScrollText',()=>this.key('KeyJ')],['记录','BookOpen',()=>this.openJournal()],['地图','Compass',()=>this.key('KeyM')],['歇息','Moon',()=>this.press(d.getElementById('rest'))]];
  const menu=this.menuRect,toolbarRight=menu?.left>0&&menu.bottom>s.top&&menu.top<s.top+44?Math.max(s.right,w-menu.left+8):s.right;
  const tx=w-toolbarRight-44;this.iconButton(this.toolsOpen?'收起江湖菜单':'江湖菜单',this.toolsOpen?'X':'BookOpen',tx,s.top,()=>{this.toolsOpen=!this.toolsOpen;});
  if(this.toolsOpen){toolbar.forEach(([label,icon,action],i)=>this.iconButton(label,icon,tx-(toolbar.length-i)*48,s.top,()=>{this.toolsOpen=false;action();}));this.settings(w,h,{...s,right:toolbarRight});this.iconButton('高亮物品','Eye',tx-96,s.top+48,null,{hold:'AltLeft'});this.iconButton('说话','MessageCircle',tx-144,s.top+48,()=>{this.toolsOpen=false;this.key('Enter');});}
  this.iconButton(p.crouched?'起身':'蹲行','EyeOff',actionX,actionY,()=>this.key('KeyZ'),{active:p.crouched});
  this.iconButton(world.combatReady?'挥刀':'拔刀','Swords',rx,bottom-62,()=>world.combatReady?world.attack():world.toggleWeapon(),{w:56,h:56,size:34,active:world.combatReady});this.iconButton('跳跃','Jump',rx-52,bottom-48,()=>world.jump());
  if(world.combatReady){this.iconButton('格挡','Shield',rx,bottom-114,null,{hold:'KeyR'});this.iconButton('收刀','X',rx-52,bottom-100,()=>world.clearReady());}
  skillButtons.forEach((b,i)=>this.iconButton(this.label(b),b.dataset.icon||iconNameFromSvg(b.querySelector('svg'))||'Hand',actionX+(i+1)*52,actionY,()=>this.press(b)));
  const inter=d.getElementById('interact');if(this.visible(inter))this.interaction(inter,world,w,h,s);
  const dots=d.getElementById('object-dots');if(dots)for(const b of dots.querySelectorAll('button'))if(this.visible(b)){const x=parseFloat(b.style.left),y=parseFloat(b.style.top);if(Number.isFinite(x)&&Number.isFinite(y)&&x>s.left+210&&x<w-s.right-170&&y>s.top+60&&y<bottom-70)this.iconButton(this.label(b),b.dataset.icon||'Hand',x-22,y-22,()=>this.press(b));}
  this.status(p,w,h,s);if(!this.toolsOpen)this.quest(w,h,s);
  const speech=d.getElementById('npc-speech'),result=d.getElementById('result');if(this.visible(speech))this.worldSpeech(speech,w,h,s);else if(this.visible(result))this.notice(this.text(result),w,s.top+58);
  if(p.hp<=0)this.button('调息恢复',w/2-90,h/2,180,48,()=>this.key('KeyR'));
 }
 interaction(el,world,w,h,s){
  const full=this.label(el).replace(/^E\s*/,''),label=/对话/.test(full)?'对话':/^回应/.test(full)?'回应':/^翻看/.test(full)?'翻看':'查看',pw=64;
  const floor=(this.layout.actions?.y??h-s.bottom)-52;let x=w*.55,y=floor;
  const near=world.nearest?.();if(near?.npc?.actor&&world.screenPoint){const point=near.npc.actor.position.clone();point.y+=2.1;const q=world.screenPoint(point);if(q.visible){x=q.x+20;y=q.y-22;}}
  x=Math.max(s.left+200,Math.min(w-s.right-220,x));y=Math.max(s.top+52,Math.min(floor,y));
  // World labels are visual only; keep the complete known target for long-press.
  this.line(label,x+16,y+13,16,P.ink,'body',true);
  this.zones.push({x,y,w:pw,h:44,kind:'button',label:full,icon:'MessageCircle',element:el,action:()=>this.press(el)});this.layout.interaction={x,y,w:pw,h:44,label};
 }
 worldSpeech(el,w,h,s){
  const text=[...el.children].filter(n=>this.visible(n)).map(n=>this.text(n)).filter(Boolean).join('\n')||this.text(el),pw=Math.min(336,w*.42),size=this.rows(text,pw,16).length>4?14:16,rows=this.rows(text,pw,size),ph=rows.length*(size+8);
  const px=parseFloat(el.style.left),py=parseFloat(el.style.top),x=Math.max(s.left+8,Math.min(w-s.right-pw-8,(Number.isFinite(px)?px:w/2)-pw/2)),quest=this.layout.quest,minY=quest&&x<quest.x+quest.w&&x+pw>quest.x?Math.max(s.top+54,quest.y+quest.h+8):s.top+54,y=Math.max(minY,Math.min(h-s.bottom-ph-120,(Number.isFinite(py)?py:h*.4)-ph-8));
  // The speaker is already anchored in the world. No sheet, border or tail.
  rows.forEach((row,i)=>this.line(row,x,y+i*(size+8),size,P.ink,'body',true));this.layout.speech={x,y,w:pw,h:ph};
 }
 status(p,w,h,s){
  const now=this.now();this.vitalState??={};this.layout.vitals=[];
  for(const [i,key,max,icon,color]of [[0,'hp',p.maxHp??p.hpMax??100,'Heart',P.red],[1,'energy',p.maxEnergy??p.energyMax??100,'Zap',P.green]]){
   const value=Math.max(0,Math.min(max,p[key])),mark=Math.ceil(value),last=this.vitalState[key];
   if(!last||last.mark!==mark)this.vitalState[key]={mark,at:now};
   const age=now-this.vitalState[key].at;if(value>=max||age>=4000)continue;
   const x=s.left,y=h-s.bottom-34+i*17,c=this.ctx;c.save();c.globalAlpha=Math.min(1,(4000-age)/600);
   this.icon(icon,x,y,16,color);c.fillStyle=P.paper;c.fillRect(x+21,y+5,72,6);c.fillStyle=P.ink4;c.fillRect(x+22,y+6,70,4);c.fillStyle=color;c.fillRect(x+22,y+6,70*value/max,4);c.restore();
   this.layout.vitals.push({key,x,y,w:93,h:16,value,max});
  }
 }
 quest(w,h,s){
  const el=this.p.document.getElementById('tracked-quest');if(!this.visible(el))return;
  const text=[...el.querySelectorAll('span')].map(n=>this.text(n)).filter(Boolean).join(' · ')||this.text(el);if(!text)return;
  if(text!==this.questText){this.questText=text;this.questAt=this.now();}
  const x=s.left+4,y=s.top+4,pw=Math.min(260,w*.32),rows=this.rows(text,pw-28,14),c=this.ctx;
  c.save();c.globalAlpha=this.now()-this.questAt<6000?1:.6;this.icon('Compass',x,y+4,18);
  rows.slice(0,2).forEach((line,i)=>this.line(i===1&&rows.length>2?line.slice(0,-1)+'…':line,x+26,y+4+i*22,14,P.ink,'body',true));c.restore();
  const box={x,y,w:pw,h:Math.max(44,Math.min(2,rows.length)*22+8)};this.layout.quest=box;
  this.zones.push({...box,kind:'button',label:'任务与线索：'+text,action:()=>this.press(el)});
 }
 openJournal(){
  const d=this.p.document;d.getElementById('mobile-journal')?.remove();const panel=d.createElement('aside');panel.id='mobile-journal';
  const header=d.createElement('header'),title=d.createElement('b'),close=d.createElement('button');title.textContent='江湖记录';close.textContent='关闭';close.setAttribute('data-close','');close.onclick=()=>panel.remove();header.append(title,close);panel.append(header);
  const rows=[...d.querySelectorAll('#journal-lines p')].reverse();for(const row of rows)panel.append(row.cloneNode(true));
  if(!rows.length){const empty=d.createElement('p');empty.textContent='暂无记录';panel.append(empty);}d.body.append(panel);this.scroll=0;this.nextPaint=0;
 }
 drawStick(zone){
  const f=[...this.input.fingers.values()].find(v=>v.kind==='stick'),release=this.releasedStick,age=release?this.now()-release.at:Infinity;if(!f&&age>=180){this.layout.stickVisible=false;return;}
  const stick=f||release,alpha=f?.48:.48*(1-age/180)**2,c=this.ctx,x=Math.max(zone.x+38,Math.min(zone.x+zone.w-38,stick.x)),y=Math.max(zone.y+38,Math.min(zone.y+zone.h-138,stick.y)),dx=stick.lastX-stick.x,dy=stick.lastY-stick.y,n=Math.max(1,Math.hypot(dx,dy)/30);
  c.save();c.globalAlpha=alpha;c.strokeStyle=P.ink2;c.lineWidth=1.2;c.beginPath();c.arc(x,y,39,.12,Math.PI*2+.02);c.stroke();c.fillStyle=P.paper;c.beginPath();c.arc(x+dx/n,y+dy/n,13,0,Math.PI*2);c.fill();c.stroke();c.restore();this.layout.stickVisible=true;
 }
 prepareOpening(){const root=this.p.document.getElementById('opening-sequence');return root?this.openingArt.prepare(root):Promise.resolve();}
 notice(text,w,y){const width=Math.min(440,w*.52),height=Math.min(100,this.rows(text,width-28,16).length*24+20);paper(this.ctx,(w-width)/2,y,width,height,.9);this.wrap(text,(w-width)/2+14,y+10,width-28,16);}
 close(el){const close=el.querySelector('[data-close],[data-dialogue-close],[data-object-close],[aria-label*="退出"],[aria-label*="关闭"]');if(close)this.press(close);else this.key('Escape');}
 panel(el,w,h,left,right){
  if(el.id==='opening-sequence')return this.openingPanel(el,w,h);
  if(DIALOGUES.includes(el.id)&&el.querySelector('[data-line]'))return this.dialoguePanel(el,w,h,left,right);
  if(el.classList.contains('npc-action-menu')||el.id==='aim-points'||(el.id==='object-actions'&&!el.classList.contains('theft-pack')))return this.optionList(el,w,h,'menu');
  return this.detailPanel(el,w,h);
 }
 textButton(label,x,y,w,action){this.line(label,x+8,y+13,16,P.ink,'body',true);this.zones.push({x,y,w,h:44,kind:'button',label,action});}
 openingPanel(el,w,h){
  const s=this.safeArea,size=h<450?16:18,pw=Math.min(600,w-s.left-s.right-80),text=[...el.querySelectorAll('.opening-copy p')].map(p=>this.text(p)).filter(Boolean).join('\n'),rows=this.rows(text,pw,size),ph=Math.min(104,rows.length*(size+8)),x=(w-pw)/2,y=h-s.bottom-48-ph;
  this.drawTextScroll(text,{x,y,w:pw,h:ph},size,true);
  const skip=el.querySelector('.opening-skip'),next=el.querySelector('.opening-next');
  this.textButton('跳过',s.left+8,s.top+8,56,()=>this.press(skip));this.textButton(this.label(next),w-s.right-84,h-s.bottom-44,80,()=>this.press(next));
  const retry=el.querySelector('.opening-retry');if(this.visible(retry))this.textButton('重试',s.left+8,h-s.bottom-44,64,()=>this.press(retry));
  this.layout.panel={x,y,w:pw,h:ph+48,kind:'opening'};
 }
 detailPanel(el,w,h){
  const s=this.safeArea,pw=Math.min(360,Math.max(248,w*.38),w-s.left-s.right-16),size=pw<290?14:16,blocks=this.contentBlocks(el),inner=pw-24;
  const heights=blocks.map(b=>b.node?Math.max(44,this.rows(this.label(b.node),inner-24,16).length*24+12):this.rows(b.text,inner,b.small?14:size).length*((b.small?14:size)+8)+8),total=heights.reduce((a,b)=>a+b+4,0),ph=Math.min(h*.62,48+total+8),x=w-s.right-pw-8,y=h-s.bottom-ph;
  paper(this.ctx,x,y,pw,ph,.72);const title=this.text(el.querySelector('header b,header h2,header h1,h2'))||el.getAttribute('aria-label')||'';
  const ts=this.rows(title,pw-68,18).length>1?16:18;this.startClip({x:x+12,y,w:pw-60,h:44});this.line(title,x+12,y+14,ts);this.ctx.restore();this.iconButton('关闭','X',x+pw-44,y,()=>this.close(el),{size:22});
  const clip={x:x+12,y:y+48,w:inner,h:ph-56};this.maxScroll=Math.max(0,total-clip.h);this.scroll=Math.min(this.scroll,this.maxScroll);this.scrollArea(clip);this.startClip(clip);let py=clip.y-this.scroll;
  blocks.forEach((b,i)=>{if(b.node){this.floatingRow({node:b.node,label:['INPUT','TEXTAREA'].includes(b.node.tagName)?(b.node.value||b.node.placeholder||'输入回复'):this.label(b.node),detail:''},clip.x,py,inner,heights[i]);const z=this.zones[this.zones.length-1];z.move=dy=>{this.scroll=Math.max(0,Math.min(this.maxScroll,this.scroll-dy));this.dirty=true;this.nextPaint=0;};const end=Math.min(py+heights[i],clip.y+clip.h);z.y=Math.max(py,clip.y);z.h=Math.max(0,end-z.y);if(z.h<20)z.h=0;}else this.rows(b.text,inner,b.small?14:size).forEach((row,j)=>this.line(row,clip.x,py+j*((b.small?14:size)+8),b.small?14:size));py+=heights[i]+4;});
  this.ctx.restore();this.scrollMark(clip);this.layout.panel={x,y,w:pw,h:ph,kind:'detail',fontSize:size,clip};
 }
 contentBlocks(el){
  const title=el.querySelector('header b,header h2,header h1,h2'),blocks=[];const walk=node=>{if(node.nodeType===3){const text=node.textContent.trim();if(text)blocks.push({text});return;}if(node===title||node.nodeType!==1||!this.visible(node)||['HEADER','SVG','SCRIPT','STYLE','IMG','CANVAS','I'].includes(node.tagName)||node.dataset.mobileOmit!==undefined)return;
   if(node.tagName==='BUTTON'){if(!node.matches('[data-close],[data-dialogue-close],[data-object-close]'))blocks.push({node});return;}
   if(node.tagName==='INPUT'||node.tagName==='TEXTAREA'){blocks.push({node});return;}
   if(!node.querySelector('button,input,textarea')&&['P','SMALL','H2','H3','B','SPAN','LI'].includes(node.tagName)){const text=this.text(node);if(text)blocks.push({text,small:node.tagName==='SMALL'});return;}for(const child of node.childNodes)walk(child);
  };for(const child of el.childNodes)walk(child);return blocks;
 }
 dialoguePanel(el,w,h,left,right){
  if(el.classList.contains('choosing'))return this.optionList(el,w,h,'dialogue');
  const s=this.safeArea||this.safe(w,h),text=this.text(el.querySelector('[data-line]')),speaker=this.text(el.querySelector('[data-speaker]'));
  const pw=Math.min(560,w-left-right-32),x=(w-pw)/2,lines=this.rows(text,pw-70,18),bodyH=Math.min(78,Math.max(26,lines.length*26)),ph=Math.max(88,44+bodyH),y=h-s.bottom-ph;
  const next=el.querySelector('[data-next]'),advance=()=>{if(this.visible(el)&&!el.classList.contains('choosing')&&this.text(el.querySelector('[data-line]'))===text){this.input.cancel();this.press(next);}};
  if(this.visible(next))this.zones.push({x:0,y:0,w,h,kind:'button',label:'轻点继续对白',action:advance});
  this.line(speaker,x+8,y+14,16,P.ink2,'body',true);this.iconButton('关闭对白','X',x+pw-44,y,()=>this.close(el),{size:22});
  const clip={x:x+8,y:y+44,w:pw-64,h:bodyH};this.drawTextScroll(text,clip,18,true);
  if(this.visible(next))this.zones[this.zones.length-1].action=advance;
  this.layout.panel={x,y,w:pw,h:ph,kind:'dialogue',choosing:false,clip};
 }
 option(node){let detail=this.text(node.querySelector('small')),label=(this.text(node.querySelector('b'))||this.label(node).replace(detail,'').trim()).replace(node.dataset.choice?/^\d+\.\s*/:/^$/,'');if(node.dataset.point&&!detail&&label.includes(' · ')){const parts=label.split(' · ');label=parts.shift();detail=parts.join(' · ');}return {node,label,detail};}
 optionHeight(item,w){return Math.max(44,12+this.rows(item.label,w-32,16).length*24+(item.detail?this.rows(item.detail,w-32,14).length*22+4:0));}
 floatingRow(item,x,y,w,h){
  const c=this.ctx,pressed=[...this.input.fingers.values()].some(f=>f.element===item.node&&!f.moved),disabled=item.node.disabled,color=disabled?P.ink3:P.ink;
  paper(c,x,y+2,w,h-4,pressed?.72:.28);c.save();if(disabled)c.globalAlpha=.65;
  const top=y+Math.max(6,(h-(this.rows(item.label,w-32,16).length*24+(item.detail?this.rows(item.detail,w-32,14).length*22+4:0)))/2);
  c.fillStyle=color;c.beginPath();c.arc(x+9,top+9,1.8,0,Math.PI*2);c.fill();let py=top;
  for(const row of this.rows(item.label,w-32,16)){this.line(row,x+20,py,16,color,'body',true);py+=24;}
  if(item.detail){py+=4;for(const row of this.rows(item.detail,w-32,14)){this.line(row,x+20,py,14,disabled?P.ink3:P.ink2,'body',true);py+=22;}}
  c.restore();this.zones.push({x,y,w,h,kind:'button',action:disabled?null:()=>['INPUT','TEXTAREA'].includes(item.node.tagName)?this.keyboard(item.node):this.press(item.node),label:item.label+(item.detail?' '+item.detail:''),element:item.node,disabled});
 }
 optionList(el,w,h,kind){
  const s=this.safeArea||this.safe(w,h),choosing=kind==='dialogue',content=choosing?(el.querySelector('.cinematic-choices')||el):el;
  const items=[...content.querySelectorAll('button')].filter(b=>this.visible(b)&&!b.matches('[data-close],[data-back],[data-next],[data-object-close],[aria-label*="关闭"]')).map(b=>this.option(b));
  const cap=Math.min(320,w*.4,w-s.left-s.right-16);let desired=208;for(const item of items){this.font(16);desired=Math.max(desired,this.ctx.measureText(item.label).width+36);if(item.detail){this.font(14);desired=Math.max(desired,this.ctx.measureText(item.detail).width+36);}}
  const pw=Math.min(cap,desired),x=w-s.right-pw-4,context=el.querySelector('[data-context]'),quote=this.visible(context)?this.text(context):'',quoteH=quote?this.rows(quote,pw-16,14).length*22+8:0;
  const heights=items.map(item=>this.optionHeight(item,pw)),total=quoteH+heights.reduce((n,v)=>n+v+4,0)-4,bodyH=Math.min(Math.max(0,total),Math.floor(h*.55)-44),ph=44+bodyH,y=h-s.bottom-ph;
  if(kind==='menu'&&!this.world.locked){const zone={x:s.left,y:Math.max(s.top+100,h*.43),w:Math.max(80,Math.min(200,x-s.left-16)),h:h-s.bottom-Math.max(s.top+100,h*.43),kind:'stick',label:'移动'};this.zones.push(zone);this.drawStick(zone);}
  const back=el.querySelector('[data-back]'),hasBack=this.visible(back),title=this.text(el.querySelector(choosing?'[data-scene]':'header b,header h2')||[...el.children].find(n=>n.tagName==='B'))||el.getAttribute('aria-label')||'';
  this.startClip({x,y,w:pw-(hasBack?88:44),h:44});this.line(title,x+6,y+14,16,P.ink2,'body',true);this.ctx.restore();
  this.iconButton(choosing?'关闭对白':'关闭','X',x+pw-44,y,()=>this.close(el),{size:22});if(hasBack)this.iconButton('返回上层回应','RotateCcw',x+pw-88,y,()=>this.press(back),{size:22});
  const clip={x,y:y+44,w:pw,h:bodyH};this.maxScroll=Math.max(0,total-bodyH);this.scroll=Math.min(this.scroll,this.maxScroll);this.scrollArea(clip);this.startClip(clip);let py=clip.y-this.scroll;
  if(quote){for(const row of this.rows(quote,pw-16,14)){this.line(row,x+8,py,14,P.ink2,'body',true);py+=22;}py+=8;}
  items.forEach((item,i)=>{this.floatingRow(item,x,py,pw,heights[i]);const z=this.zones[this.zones.length-1];z.move=dy=>{this.scroll=Math.max(0,Math.min(this.maxScroll,this.scroll-dy));this.dirty=true;this.nextPaint=0;};const bottom=Math.min(py+heights[i],clip.y+clip.h);z.y=Math.max(py,clip.y);z.h=Math.max(0,bottom-z.y);if(z.h<20)z.h=0;py+=heights[i]+4;});
  this.ctx.restore();this.scrollMark(clip);this.layout.panel={x,y,w:pw,h:ph,kind,choosing,clip};
 }
 scrollArea(clip){this.zones.push({...clip,kind:'scroll',move:dy=>{this.scroll=Math.max(0,Math.min(this.maxScroll||0,this.scroll-dy));this.dirty=true;this.nextPaint=0;}});}
 startClip(clip){const c=this.ctx;c.save();c.beginPath();c.rect(clip.x,clip.y,clip.w,clip.h);c.clip();}
 scrollMark(clip){if(this.maxScroll<=0)return;const c=this.ctx,track=clip.h,thumb=Math.max(18,track*track/(track+this.maxScroll));brushLine(c,clip.x,clip.y+clip.h-1,clip.w,P.ink4);c.fillStyle=P.ink3;c.fillRect(clip.x+clip.w-2,clip.y+(track-thumb)*this.scroll/this.maxScroll,2,thumb);}
 drawTextScroll(text,clip,size,floating=false){const rows=this.rows(text,clip.w-6,size);this.maxScroll=Math.max(0,rows.length*(size+8)-clip.h);this.scroll=Math.min(this.scroll,this.maxScroll);this.scrollArea(clip);this.startClip(clip);rows.forEach((row,i)=>this.line(row,clip.x,clip.y-this.scroll+i*(size+8),size,P.ink,'body',floating));this.ctx.restore();this.scrollMark(clip);}
 drawContent(el,clip,context=''){
  this.scrollArea(clip);this.startClip(clip);let py=clip.y-this.scroll;if(context)py=this.wrap(context,clip.x+8,py+2,clip.w-16,16,P.ink2)+12;
  const addButton=node=>{const label=this.label(node),icon=node.dataset.icon||iconNameFromSvg(node.querySelector('svg')),onlyIcon=!!icon&&!this.text(node),height=onlyIcon?48:Math.max(48,this.rows(label,clip.w-(icon?60:28),16).length*24+20),top=py;this.button(label,clip.x,top,clip.w-5,height,()=>this.press(node),node.disabled,null,onlyIcon?{icon}:{leadingIcon:icon});const zone=this.zones[this.zones.length-1];zone.element=node;zone.move=dy=>{this.scroll=Math.max(0,Math.min(this.maxScroll||0,this.scroll-dy));this.dirty=true;this.nextPaint=0;};const bottom=Math.min(top+height,clip.y+clip.h);zone.y=Math.max(top,clip.y);zone.h=Math.max(0,bottom-zone.y);if(zone.h<16)zone.h=0;py+=height+5;};
  const render=node=>{
   if(node.nodeType===3){const text=node.textContent.trim();if(text)py=this.wrap(text,clip.x+8,py,clip.w-20,18)+8;return;}
   if(node.nodeType!==1||!this.visible(node)||node.classList.contains('dialogue-keys')||['SVG','SCRIPT','STYLE','IMG','CANVAS','I'].includes(node.tagName)||(node.tagName==='HEADER'&&node.parentElement===el))return;
   if(node.tagName==='BUTTON'){if(!node.matches('[data-close],[data-dialogue-close]'))addButton(node);return;}
   if(node.tagName==='INPUT'||node.tagName==='TEXTAREA'){this.button(node.value||node.placeholder||'输入回复',clip.x,py,clip.w-5,48,()=>this.keyboard(node));const zone=this.zones[this.zones.length-1];zone.element=node;zone.move=dy=>{this.scroll=Math.max(0,Math.min(this.maxScroll||0,this.scroll-dy));};if(py<clip.y||py+48>clip.y+clip.h)zone.h=0;py+=54;return;}
   for(const child of node.childNodes)render(child);
  };
  for(const child of el.childNodes)render(child);this.ctx.restore();this.maxScroll=Math.max(0,py+this.scroll-clip.y-clip.h);this.scroll=Math.min(this.scroll,this.maxScroll);this.scrollMark(clip);
 }
 keyboard(node){wx.offKeyboardConfirm?.(this.keyboardHandler);this.keyboardHandler=({value})=>{node.value=value;node.dispatchEvent(new this.p.dom.Event('input',{bubbles:true}));node.closest('form')?.dispatchEvent(new this.p.dom.Event('submit',{bubbles:true,cancelable:true}));wx.hideKeyboard();this.dirty=true;this.nextPaint=0;};wx.onKeyboardConfirm?.(this.keyboardHandler);wx.showKeyboard({defaultValue:node.value||'',maxLength:180});}
}
