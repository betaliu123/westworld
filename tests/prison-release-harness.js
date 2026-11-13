import {detainByOfficer,resolveGate} from '../src/gate-scene.js';
import {recordDeed} from '../src/event-deck.js';
import {PRISON} from '../src/locations.js';

export function mountPrisonReleaseHarness({getSim,world,environment,dialogue,release,prisonRelease,codex,save}){
 const errors=[],requests=[],frames=[],bar=document.createElement('div'),report=document.createElement('pre');let pauseBlack=false,paused=false;
 bar.id='prison-qa-controls';bar.style.cssText='position:fixed;top:4px;left:4px;z-index:1100;display:flex;gap:4px;font:14px var(--font-body)';
 report.id='prison-qa-report';report.hidden=true;report.style.cssText='position:fixed;top:46px;left:4px;max-height:80vh;max-width:90vw;overflow:auto;z-index:1101;background:var(--paper);color:var(--ink-1);font:14px var(--font-body);white-space:pre-wrap';
 const nativeFetch=window.fetch.bind(window);window.fetch=async(url,init)=>{const body=init?.body&&JSON.parse(init.body);if(String(url)==='/api/director'&&body?.mode==='aftermath'){const request={mode:body.mode,deeds:body.deeds.length,elapsed:body.elapsed};requests.push(request);try{const r=await nativeFetch(url,init);request.status=r.status;return r;}catch(e){request.error=e.name;throw e;}}return nativeFetch(url,init);};
 window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const update=prisonRelease.update.bind(prisonRelease);prisonRelease.update=dt=>{if(paused)return;update(dt);const el=document.getElementById('prison-passage');if(!el.hidden&&el.style.opacity==='1'){frames.push({day:getSim().s.day,text:el.innerText});if(pauseBlack)paused=true;}};
 window.addEventListener('keydown',e=>{if(e.code==='Escape')paused=false;});
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>{fn();b.blur();};bar.append(b);};
 function fixture(){
  dialogue.finish(true);environment.close();document.getElementById('drawer').hidden=true;document.getElementById('panel').hidden=true;report.hidden=true;
  const sim=getSim(),s=sim.s;delete s.capture;delete s.prisonPassage;world.captureShot=null;world.onCaptureFade?.(0);world.performance=null;world.clearReady();world.auto=null;world.keys.clear();
  s.event=null;s.day=1;s.time=80;s.wanted=0;s.chapter.opened=true;s.chronicle={seq:0,deeds:[],diaries:[]};s.deck.echoes=[];s.deck.cards=[];s.deck.actions={nextAt:(s.npcClock||0)+999};s.storyFollowups=[];
  Object.assign(s.player,{x:0,z:24,hp:50,energy:100,crouched:false,stealing:false});world.hero.position.set(0,0,24);
  s.people.gate_guard.hp=s.people.gate_guard.maxHp||100;s.people.gate_guard.restraint=null;s.people.gate_guard.stunnedUntil=0;
  recordDeed(sim,'actionWitnessed',{incidentType:'assault',text:'守卫亲眼见到关前伤人，出面拘捕。',target:'gate_guard',witnesses:['gate_guard'],identities:{gate_guard:'player'}});
  detainByOfficer(sim,'gate_guard',null,{handledPresentation:true});world.hero.position.set(PRISON.spawn.x,0,PRISON.spawn.z);world.yaw=0;world.pitch=.35;world.distance=5;
  Object.assign(s.people.prisoner,{hp:100});const n=world.npcs.get('prisoner');n.actor.position.set(PRISON.inmate.x,0,PRISON.inmate.z);n.actor.visible=true;
  paused=false;requests.length=0;frames.length=0;save();
 }
 button('刑满出狱',()=>{pauseBlack=false;fixture();release('g_serve');});
 button('记下口供后出狱',()=>{pauseBlack=false;fixture();resolveGate(getSim(),getSim().event.id,'g_hear');dialogue.finish(true);world.performance=null;release('g_record');});
 button('黑幕停帧',()=>{pauseBlack=true;fixture();release('g_serve');});button('继续',()=>{pauseBlack=paused=false;});
 button('因果簿',()=>codex.open('affairs'));button('报告',()=>{const s=getSim().s;report.hidden=!report.hidden;report.textContent=JSON.stringify({day:s.day,x:s.player.x,z:s.player.z,requests,diaries:s.chronicle.diaries,echoes:s.deck.echoes.map(e=>({key:e.key,ai:e.ai})),frames,errors},null,2);});button('收起验收',()=>bar.hidden=true);
 document.body.append(bar,report);
}
