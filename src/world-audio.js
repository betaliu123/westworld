import {roomAt} from './night-life.js';
// Recorded world audio. Playback never calls a generation service.
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
export function worldMix({x=0,z=26,time=0,voice=false,talking=false,performing=false,hp=100}={}){
 const hour=((6+time/10)%24+24)%24,day=hour>=6&&hour<19?1:0;
 const duck=voice?.28:talking?.65:1;
 const city=clamp((26-z)/12),tea=clamp(1-Math.hypot(x+13,z-25)/17);
 const room=roomAt({x,z}),inside=!!room,lateInn=room?.public&&(hour>=19||hour<2);
 return {music:(performing?0:hp<=0?.12:.5)*duck*day,
  'music-night':(performing?0:hp<=0?.08:.32)*duck*(1-day),
  night:(1-day)*(inside?.06:.38)*(voice?.45:1),
  'night-inn':lateInn?.3*(voice?.4:1):0,
  city:Math.max(city*.58,tea*.65)*day*(inside?.16:1)*(voice?.36:1),
  creek:clamp(1-Math.abs(x+22)/20)*.7*(inside?.25:1)*(voice?.5:1)};
}
export function hitSound(material){return material==='wood'?'wood':['metal','stone'].includes(material)?'metal':'body';}
// Continuous water/fire damage is not a new physical impact every frame.
export function damageSound(before,after,environmentDamage=0){return before-after>environmentDamage+1e-6?'hurt':null;}
export function fluteTrack(tier=0){return tier>=3?'flute-good':'flute-poor';}
const CUES={
 attack:['swing',.66],hurt:['body',.7],wood:['wood',.8],metal:['metal',.52],body:['body',.72],
 draw:['draw',.45],sheath:['draw',.28,.8],step:['step',.25],jump:['step',.18],
 mail:['coins',.19],notice:['metal',.08,1.35],alert:['metal',.17,.8],
 tick:['wood',.055,1.6],win:['coins',.26],lose:['body',.12,.8],coins:['coins',.5],
};

export class WorldAudio{
 constructor({fetcher=(...args)=>fetch(...args),createContext=()=>new AudioContext(),random=Math.random,onError=()=>{}}={}){
  Object.assign(this,{fetcher,createContext,random,onError});this.enabled=true;this.hidden=false;
  this.running=false;this.buffers=new Map();this.loading=new Map();this.loops=new Map();this.shots=new Set();
  this.lastCue=new Map();this.mix=worldMix();this.position={x:0,z:26};this.lastPosition=null;this.stride=0;
 }
 init(){return this.catalogPromise??=this.fetcher('/assets/audio/world/manifest.json').then(r=>{
  if(!r.ok)throw Error('world audio catalog missing');return r.json();
 }).then(m=>this.catalog=m).catch(e=>{this.onError(e);return this.catalog={};});}
 getContext(){
  if(!this.context){
   this.context=this.createContext();this.master=this.context.createGain();
   this.master.gain.value=this.enabled&&!this.hidden?1:0;this.master.connect(this.context.destination);
   this.buses={};for(const id of ['music','city','creek','music-night','night','night-inn','flute-poor','flute-good']){
    const bus=this.context.createGain();bus.gain.value=0;bus.connect(this.master);this.buses[id]=bus;
   }
  }
  return this.context;
 }
 unlock(){
  if(!this.enabled||this.hidden)return;
  try{this.getContext().resume().catch(this.onError);this.init().then(()=>{
   for(const id of Object.keys(this.catalog))this.load(id);
  });}catch(e){this.onError(e);}
 }
 async load(id){
  if(this.buffers.has(id))return this.buffers.get(id);
  if(this.loading.has(id))return this.loading.get(id);
  if(!this.context)return null;
  const task=(async()=>{try{
   await this.init();const entry=this.catalog[id];if(!entry)return null;
   const response=await this.fetcher(entry.src);if(!response.ok)throw Error('audio file missing: '+id);
   const buffer=await this.context.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);return buffer;
  }catch(e){this.onError(e);return null;}})();
  // Keep failed loads memoized too: never issue a missing-file request every frame.
  this.loading.set(id,task);return task;
 }
 setEnabled(value){this.enabled=!!value;this.syncMute();}
 setHidden(value){this.hidden=!!value;this.syncMute();}
 syncMute(){
  if(this.master)this.master.gain.setValueAtTime(this.enabled&&!this.hidden?1:0,this.context.currentTime);
  if(!this.enabled||this.hidden){this.endOpening(0);this.stop();}
 }
 stop(){
  this.running=false;this.lastPosition=null;this.stride=0;
  for(const loop of this.loops.values())for(const node of [...loop.sources])node.stop();
  this.loops.clear();for(const node of [...this.shots])node.stop();this.lastCue.clear();
 }
 // The opening piece plays once over the painted shots, before the world runs. It ends by settling, so on entering
 // the game it fades out over the town's music fading in rather than cutting; a late load is never started.
 async playOpening(){
  if(!this.enabled||this.hidden)return null;
  const token=this.openingToken=(this.openingToken||0)+1;
  try{this.getContext().resume().catch(this.onError);}catch(e){this.onError(e);return null;}
  const buffer=await this.load('music-opening');
  if(!buffer||token!==this.openingToken||!this.enabled||this.hidden)return null;
  const node=this.makeNode(buffer,this.master),t=this.context.currentTime;
  node.gain.gain.setValueAtTime(0,t);node.gain.gain.linearRampToValueAtTime(.6,t+1.2);
  node.source.start(t);this.opening=node;return node;
 }
 endOpening(fade=3.5){
  this.openingToken=(this.openingToken||0)+1;
  const node=this.opening;this.opening=null;if(!node)return;
  const g=node.gain.gain,t=this.context.currentTime;
  g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+fade);
  try{node.source.stop(t+fade+.05);}catch{}
 }
 stopLoop(id){const loop=this.loops.get(id);if(!loop)return;for(const node of [...loop.sources])node.stop();this.loops.delete(id);}
 makeNode(buffer,bus){
  const source=this.context.createBufferSource(),gain=this.context.createGain();
  source.buffer=buffer;source.connect(gain);gain.connect(bus);
  const node={source,gain,stop(){try{source.stop();}catch{}source.disconnect();gain.disconnect();}};
  source.onended=()=>{source.disconnect();gain.disconnect();this.shots.delete(node);for(const l of this.loops.values())l.sources.delete(node);};
  return node;
 }
 scheduleLoop(id){
  const buffer=this.buffers.get(id);if(!buffer||buffer.duration<1)return;
  let loop=this.loops.get(id);if(!loop){loop={next:this.context.currentTime+.04,sources:new Set()};this.loops.set(id,loop);}
  const solo=id.startsWith('flute-'),now=this.context.currentTime,fade=Math.min(solo?.08:1.4,buffer.duration/4);
  // Resume after a stalled tab without replaying a queue of obsolete loops.
  if(loop.next<now)loop.next=now+.04;
  if(loop.next>now+.6)return;
  const node=this.makeNode(buffer,this.buses[id]),t=loop.next;
  node.gain.gain.setValueAtTime(0,t);node.gain.gain.linearRampToValueAtTime(1,t+fade);
  node.gain.gain.setValueAtTime(1,t+buffer.duration-fade);node.gain.gain.linearRampToValueAtTime(0,t+buffer.duration);
  node.source.start(t);node.source.stop(t+buffer.duration);loop.sources.add(node);
  // One player, one flute: a breath between phrases instead of overlapping two solos.
  loop.next=t+buffer.duration+(solo?.2:-fade);
 }
 play(kind,{x,z,gain=1,rate=1}={}){
  if(!this.running||!this.enabled||this.hidden||this.context?.state!=='running')return null;
  const cue=CUES[kind];if(!cue)return null;
  const [id,level,pitch=1]=cue,buffer=this.buffers.get(id);if(!buffer)return null;
  const now=this.context.currentTime,cooldown=['notice','alert','mail'].includes(kind)?1.2:kind==='hurt'?.6:.065;
  if(now-(this.lastCue.get(kind)??-Infinity)<cooldown)return null;
  const distance=x==null?0:Math.hypot(x-this.position.x,z-this.position.z);
  if(distance>15)return null;
  if(this.shots.size>=8)[...this.shots][0].stop();
  const node=this.makeNode(buffer,this.master);this.shots.add(node);this.lastCue.set(kind,now);
  node.gain.gain.value=level*gain*clamp(1-distance/15);
  node.source.playbackRate.value=rate*pitch*(.97+this.random()*.06);
  node.source.start();return node;
 }
 update(dt,state={}){
  this.position={x:state.x??0,z:state.z??26};this.mix=worldMix(state);
  if(!state.started||!this.enabled||this.hidden||this.context?.state!=='running'){
   if(this.running)this.stop();return;
  }
  this.running=true;
  for(const id of ['music','city','creek','music-night','night','night-inn']){
   this.buses[id].gain.setTargetAtTime(this.mix[id],this.context.currentTime,state.voice||state.performing?.16:.8);
   if(id==='creek'||this.mix[id]>0)this.scheduleLoop(id);else this.stopLoop(id);
  }
  const flute=state.performing&&state.hp>0&&!state.talking&&!state.drowning&&!state.burning?fluteTrack(state.musicTier):null;
  for(const id of ['flute-poor','flute-good']){
   if(id!==flute){this.stopLoop(id);continue;}
   this.buses[id].gain.setTargetAtTime(state.voice?.2:.85,this.context.currentTime,.12);
   this.scheduleLoop(id);
  }
  const before=this.lastPosition;this.lastPosition=this.position;
  if(before){const travel=Math.hypot(before.x-this.position.x,before.z-this.position.z);
   // Only actual grounded travel counts. Teleports, death and climbing never make footsteps.
   if(travel<Math.max(1,dt*12)&&state.grounded!==false&&!state.drowning&&state.hp>0){
    this.stride+=travel;if(this.stride>(state.crouching?.78:1.2)){
     this.stride=0;this.play('step',{gain:state.crouching?.35:1});
    }
   }else this.stride=0;
  }
 }
 status(){return {running:this.running,context:this.context?.state||'locked',loaded:[...this.buffers.keys()],
  loops:[...this.loops.keys()],mix:this.mix,effects:this.shots.size};}
}
