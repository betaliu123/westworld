// Normalise WeChat's callback decoder to the browser contract expected by the game.
export function createAudioContextClass(api) {
 const contexts=new Set();
 class AudioContext {
  constructor(){
   if(!api.createWebAudioContext)throw new Error('此微信版本不支持游戏音频');
   this.native=api.createWebAudioContext();contexts.add(this);
  }
  get state(){return this.native.state;}
  get currentTime(){return this.native.currentTime;}
  get destination(){return this.native.destination;}
  get sampleRate(){return this.native.sampleRate;}
  createGain(){return this.native.createGain();}
  createBufferSource(){return this.native.createBufferSource();}
  resume(){try{return Promise.resolve(this.native.resume?.());}catch(e){return Promise.reject(e);}}
  suspend(){try{return Promise.resolve(this.native.suspend?.());}catch(e){return Promise.reject(e);}}
  close(){contexts.delete(this);try{return Promise.resolve(this.native.close?.());}catch(e){return Promise.reject(e);}}
  decodeAudioData(data){return new Promise((resolve,reject)=>{
   try{
    const result=this.native.decodeAudioData(data,resolve,reject);
    if(result&&typeof result.then==='function')result.then(resolve,reject);
    else if(result&&typeof result.duration==='number')resolve(result);
   }catch(e){reject(e);}
  });}
 }
 AudioContext.suspendAll=()=>Promise.all([...contexts].map(c=>c.suspend().catch(()=>{})));
 AudioContext.resumeAll=()=>Promise.all([...contexts].map(c=>c.resume().catch(()=>{})));
 return AudioContext;
}
