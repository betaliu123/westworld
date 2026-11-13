// One audible speaker. Missing clips never block a game result or fall back to a generic OS voice.
export function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function voiceRequest(config,actor,text,emotion){
 text=String(text||'').trim();
 const profile=config?.cast?.[actor];
 if(!profile||!text||text.length>240||/^[（(]/.test(text)||/[<>]/.test(text))return null;
 const performance=config.performances?.find(p=>p.actors.includes(actor)&&p.text===text);
 const voice={...config.defaults,voice_id:profile.voice_id,speed:profile.speed,pitch:profile.pitch};
 const feeling=emotion||performance?.emotion;if(feeling)voice.emotion=feeling;
 const payload={model:config.model,stream:false,output_format:'hex',text:performance?.synthesisText||text,
  voice_setting:voice,language_boost:config.language_boost,audio_setting:config.audio_setting};
 return {actor,text,emotion,signature:canonical({actor,payload})};
}
export function spokenActor(line,state){
 if(!line||line.thought||line.narration||/^[（(]/.test(line.text||''))return null;
 if(['hero','player'].includes(line.id)){
  const gender=state?.player?.gender;
  return gender==='female'?'player_female':gender==='male'?'player_male':null;
 }
 const actor=state?.people?.[line.id];
 if(state&&(!actor||actor.hp<=0||actor.muteUntil>(state.npcClock||0)||actor.life?.activity==='down'))return null;
 return line.id;
}
export class NpcVoice {
 constructor({fetcher=globalThis.fetch?.bind(globalThis),createContext=()=>new AudioContext(),
  canSpeak=()=>true,onError=()=>{}}={}){
  Object.assign(this,{fetcher,createContext,canSpeak,onError});
  this.enabled=false;this.ticket=0;this.entries=new Map();this.pending=new Map();this.buffers=new Map();this.failures=new Map();
 }
 init(){return this.ready??=this.loadCatalog();}
 async loadCatalog(){
  try{
   const [cast,index]=await Promise.all([this.fetcher('/assets/audio/voice-cast.json',{cache:'no-store'}),this.fetcher('/assets/audio/npc/manifest.json',{cache:'no-store'})]);
   if(!cast.ok)return;this.config=await cast.json();
   if(index.ok)for(const entry of (await index.json()).entries)this.entries.set(entry.signature,entry);
  }catch(error){this.onError('catalog',error);}
 }
 // Must be called synchronously from Start/Continue or the sound button.
 unlock(){if(!this.enabled)return;try{this.context??=this.createContext();this.context.resume()?.catch(()=>{});}catch{}}
 setEnabled(value){this.enabled=!!value;if(!value)this.stop();}
 stop(channel){
  if(channel&&this.current?.channel!==channel)return;
  this.ticket++;this.current=null;
  const source=this.source;this.source=null;
  if(source){try{source.stop();}catch{}source.disconnect();}
 }
 request(line){return voiceRequest(this.config,line.actor||line.id,line.text,line.emotion);}
 duration(line){const req=this.request(line);return req?this.entries.get(req.signature)?.duration||0:0;}
 async prepare(line,{generate=false}={}){
  if(!this.config)await this.init();
  const req=this.request(line);if(!req)return null;
  if(this.entries.has(req.signature))return this.entries.get(req.signature);
  if(!generate||this.failures.get(req.signature)>Date.now())return null;
  if(!this.pending.has(req.signature)){
   const promise=(async()=>{
    try{
     const response=await this.fetcher('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({actor:req.actor,text:req.text,emotion:req.emotion}),signal:AbortSignal.timeout(60000)});
     if(!response.ok)throw new Error('voice unavailable');
     const entry=await response.json();
     if(entry.signature!==req.signature)throw new Error('stale recording');
     this.entries.set(entry.signature,entry);return entry;
    }catch(error){this.failures.set(req.signature,Date.now()+60000);this.onError('generation',error);return null;}
    finally{this.pending.delete(req.signature);}
   })();
   this.pending.set(req.signature,promise);
  }
  return this.pending.get(req.signature);
 }
 // Playback uses exact cached recordings. A subtitle edit never starts paid synthesis.
 async play(line,{channel='dialogue',generate=false,valid=()=>true,onStart=()=>{}}={}){
  this.stop();
  if(!this.enabled||!this.context||!this.canSpeak(line)||!valid())return false;
  const ticket=this.ticket;this.current={line,channel,valid};
  const stillCurrent=()=>ticket===this.ticket&&this.enabled&&this.canSpeak(line)&&valid();
  const entry=await this.prepare(line,{generate});if(!entry||!stillCurrent())return false;
  try{
   if(!this.buffers.has(entry.url)){
    const response=await this.fetcher(entry.url);if(!response.ok)throw new Error('clip missing');
    const buffer=await this.context.decodeAudioData(await response.arrayBuffer());this.buffers.set(entry.url,buffer);
   }
   if(!stillCurrent()||this.context.state==='suspended')return false;
   const source=this.context.createBufferSource(),gain=this.context.createGain();
   source.buffer=this.buffers.get(entry.url);gain.gain.value=.78;
   source.connect(gain);gain.connect(this.context.destination);this.source=source;
   source.onended=()=>{gain.disconnect();source.disconnect();if(this.source===source){this.source=null;this.current=null;}};
   source.start();onStart(source.buffer.duration);return true;
  }catch(error){this.onError('playback',error);return false;}
 }
 update(){if(this.current&&(!this.canSpeak(this.current.line)||!this.current.valid()))this.stop();}
}
