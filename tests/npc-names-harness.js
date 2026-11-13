import {npcNameView} from '../src/npc-names.js';
// Local fixtures never touch the normal save key. Interactions use production UI.
export function mountNpcNamesHarness({getSim,world,environment,dialogue,queueSpeech,openNpcInfo,closePanel,save}){
 let pinned=null;const errors=[];
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>id===pinned?true:steer(id,dt);
 addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='names-fixture')return;
  const sim=getSim(),s=sim.s,fixture=e.data.fixture;
  dialogue.finish(true);closePanel();environment.close();document.getElementById('drawer-close')?.click();world.keys.clear();world.auto=null;world.clearReady();
  if(fixture==='info'){openNpcInfo(pinned||'porter');return;}
  if(fixture==='bubble'){world.quietUntil=0;queueSpeech([{id:pinned||'porter',text:'扁担吱呀响，该上油了。'}]);return;}
  if(fixture==='long'){s.player.crouched=true;s.player.stealing=true;world.onNpcSelected(pinned||'porter');s.quests??={};s.quests['names-qa']={id:'names-qa',title:'问清搬运的规矩',objective:'向车旁挑夫打听',source:'车旁问话',status:'active'};s.trackedQuest='names-qa';dialogue.play([{id:pinned||'porter',text:'这班役夫的人手已经够了，不能说添就添。纲货要是出了差错，最后得我来担，你总得让我放心才是。',verbatim:true}],()=>{},'');return;}
  if(fixture==='explore'){pinned=null;s.player.crouched=false;s.player.stealing=false;document.querySelector('.npc-card-close')?.click();world.hero.position.set(3,0,36);s.player.x=3;s.player.z=36;return;}
  const id=fixture;pinned=id;s.time=35;s.chapter??={done:{},heard:{},titles:[],fame:{}};s.chapter.opened=true;s.chapter.done={};s.facts.enteredCity=false;s.wanted=0;s.complaint=null;s.event=null;
  s.convoy=undefined;delete s.facts.princeAlias;delete s.facts.porterLeadKnown;s.facts.knownNames??={};delete s.facts.knownNames[id];delete s.people[id].nameMet;delete s.intelligence?.people?.[id];
  Object.assign(s.player,{hp:100,energy:100,satiety:100,crouched:false,stealing:false,x:5,z:33,face:null});delete s.player.bedRest;
  world.hero.position.set(5,0,33);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;
  const n=s.people[id],a=world.npcs.get(id).actor;
  Object.assign(n,{hp:100,x:5,z:31,awareness:null,stunnedUntil:0,muteUntil:0,restraint:null,probed:false,life:{activity:'idle'}});
  a.position.set(5,0,31);a.rotation.y=0;a.visible=true;environment.eco.positions[id]=a.position;world.quietUntil=Infinity;save();
 });
 setInterval(()=>{
  const s=getSim().s;if(pinned){s.time=35;s.people[pinned].life={activity:'idle'};}
  const visible=e=>e.getClientRects().length&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden';
  const text=[...document.querySelectorAll('body *')].filter(e=>visible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
  const d=document.getElementById('dialogue-stage'),close=d.querySelector('[data-close]').getBoundingClientRect(),card=d.querySelector('.dialogue-card').getBoundingClientRect();
  parent.postMessage({type:'names-status',size:[innerWidth,innerHeight],identity:npcNameView(s,pinned||'porter'),label:world.npcs.get(pinned||'porter').labelName,
   prompt:document.getElementById('interact').textContent,bubble:document.getElementById('npc-speech').innerHTML,
   small:text.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14).length,badFonts:text.filter(e=>/微软雅黑|Microsoft YaHei|Segoe|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily)).length,
   fits:d.hidden||close.top>=0&&close.bottom<=innerHeight&&card.left>=0&&card.right<=innerWidth,errors},location.origin);
 },350);
}
