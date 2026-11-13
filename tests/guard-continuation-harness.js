// Local playtest fixtures only; all answers, completion and choices use the game UI.
export function mountGuardContinuationHarness({getSim,world,environment,dialogue,showTalkChoices,npcOptions}){
 let pinned=null;const errors=[];
 addEventListener('error',e=>errors.push(e.message));
 addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>id===pinned?true:steer(id,dt);
 addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='guard-fixture')return;
  dialogue.finish(true);environment.close();world.keys.clear();world.auto=null;world.clearReady();
  if(e.data.fixture==='explore'){pinned=null;return;}
  const sim=getSim(),s=sim.s,id=e.data.fixture==='relief'?'gate_relief':'gate_guard';pinned=id;
  s.event={id:++s.sequence,type:'gate',status:'active',depth:0,point:[0,24],cast:[id],gate:{phase:'gate',attempts:[],facts:{}}};
  s.watch={...s.watch,holder:id};s.wanted=0;s.complaint=null;s.time=35;s.chapter.opened=true;
  s.chapter.done=e.data.fixture==='intro'?{}:{gate_rules:true};
  Object.assign(s.facts,{enteredCity:false,royalSawKindness:e.data.fixture!=='alone',royalSawHarm:false});
  Object.assign(s.player,{hp:100,energy:100,satiety:100,crouched:false,stealing:false,x:-1.6,z:26.2,face:null});delete s.player.bedRest;
  world.hero.position.set(-1.6,0,26.2);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;
  const n=s.people[id],a=world.npcs.get(id).actor;
  Object.assign(n,{hp:100,metPlayer:true,x:-1.6,z:24,awareness:null,fear:0,stunnedUntil:0,muteUntil:0,restraint:null,life:{activity:'idle'}});
  a.position.set(-1.6,0,24);a.rotation.y=0;a.visible=true;environment.eco.positions[id]=a.position;
  showTalkChoices(id,npcOptions(id));
 });
 setInterval(()=>{
  const s=getSim().s;if(pinned){s.time=35;s.people[pinned].life={activity:'idle'};}
  const el=document.getElementById('dialogue-stage'),visible=e=>e.getClientRects().length&&!e.closest('[hidden]');
  const text=[...el.querySelectorAll('*')].filter(e=>visible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
  const close=el.querySelector('[data-close]').getBoundingClientRect(),card=el.querySelector('.dialogue-card').getBoundingClientRect();
  parent.postMessage({type:'guard-status',dialogue:!el.hidden,locked:world.locked,choices:[...el.querySelectorAll('[data-choice]')].map(e=>e.textContent),
   small:text.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14).length,badFonts:text.filter(e=>/微软雅黑|Microsoft YaHei|Segoe|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily)).length,
   fits:el.hidden||close.top>=0&&close.bottom<=innerHeight&&card.left>=0&&card.right<=innerWidth,
   done:s.chapter?.done||{},money:s.player.money,errors},location.origin);
 },250);
}
