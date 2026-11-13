// Only loaded for a named localhost playtest with its own save key.
export function mountItemExchangeHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='exchange-qa';el.open=false;el.style.cssText='position:fixed;top:6px;right:6px;z-index:1600;background:var(--paper);color:var(--ink-1);font:14px var(--font-body);padding:8px;max-width:260px';
 el.innerHTML='<summary>物品交付验收</summary><nav></nav><output style="white-space:pre-wrap"></output>';document.body.append(el);
 let target='fu',pinned=new Set(),errors=[],probe=null;
 const updateWorld=world.update.bind(world);world.update=dt=>{updateWorld(dt);if(!probe)return;const panel=document.getElementById('environment-panel');probe.frames++;probe.hidden ||= panel.hidden;probe.cinematic ||= !!world.cinematic;probe.cameraShot ||= !!world.performance?.camera;probe.drift=Math.max(probe.drift,world.camera.position.distanceTo(probe.camera));
  for(const [list,value]of [[probe.motions,world.performance?.motion],[probe.reactions,world.itemExchange?.phase],[probe.clips,world.npcs.get(target)?.model.activeClip]])if(value&&!list.includes(value))list.push(value);
  probe.facing=world.npcs.get(target)?.actor.rotation.y;probe.presentAge=world.performance?.motion==='present'?world.t-world.performance.start:null;probe.inlineCheck ||= !!document.querySelector('#environment-panel #check-reveal:not([hidden])');
 };
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned.has(id)?true:steer(id,dt);
 function fixture(id){const s=getSim().s,eco=environment.eco;target=id;
  world.dialogue.finish(true);world.checkReveal.cancel();world.performance=null;environment.close();document.getElementById('drawer').hidden=true;document.getElementById('panel').hidden=true;
  s.time=35;s.event=null;s.facts.enteredCity=true;s.chapter.opened=true;s.wanted=0;s.complaint=null;s.player.face=null;s.people[id].awareness=null;
  pinned=new Set([id]);const n=s.people[id];Object.assign(n,{x:4,z:10,hp:n.maxHp||100,stunnedUntil:0,muteUntil:0,restraint:null,life:{activity:'idle'}});world.npcs.get(id).actor.position.set(4,0,10);world.npcs.get(id).actor.rotation.y=Math.PI;environment.eco.positions[id]={x:4,z:10};
  Object.assign(s.player,{x:4,z:12,hp:100,energy:100,crouched:true});world.hero.position.set(4,0,12);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.35;world.distance=6;world.keys.clear();world.clearReady();world.auto=null;world.locked=false;world.syncEvent();
  const ledger=eco.s.items.find(i=>i.type==='ledger');if(ledger&&ledger.location!=='player'&&!s.ledgerCase?.delivery)eco.transfer(ledger,'player','entrusted');
  if(!eco.items('player').some(i=>i.type==='food'))eco.create('干粮','food','player');save();
 }
 const actions=[['献账场景',()=>fixture('fu')],['交易场景',()=>fixture('merchant')],['归还场景',()=>{fixture('shen');const ring=environment.eco.s.items.find(i=>i.type==='ring');environment.eco.transfer(ring,'player','stolen');}],['开始观测',()=>{probe={frames:0,hidden:false,cinematic:false,cameraShot:false,drift:0,camera:world.camera.position.clone(),motions:[],reactions:[],clips:[],inlineCheck:false};}],['打开人物入口',()=>world.onGateTalk(target)],['任务选物',()=>environment.openGift(target,{task:'ledger'})],['普通选物',()=>environment.openGift(target)],['清屏',()=>{probe=null;environment.close();world.dialogue.finish(true);document.getElementById('panel').hidden=true;el.open=false;}]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinned.size){s.time=35;for(const id of pinned)s.people[id].life={activity:'idle'};}
  const visible=[...document.querySelectorAll('body *')].filter(e=>!e.closest('#exchange-qa')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
  const small=visible.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14),bad=visible.filter(e=>/Segoe|Microsoft YaHei|微软雅黑|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily));
  const panel=document.getElementById('environment-panel'),box=panel.getBoundingClientRect(),close=panel.querySelector('[data-close]')?.getBoundingClientRect();
  const fits=panel.hidden||box.left>=0&&box.top>=0&&box.right<=innerWidth&&box.bottom<=innerHeight&&close?.bottom<=box.bottom;
  const report={money:s.player.money,ledger:s.ecosystem.items.find(i=>i.type==='ledger')?.location,delivered:!!s.facts.ledgerDelivered,ringReturned:!!s.facts.ringReturned,small:small.length,bad:bad.length,errors,viewport:[innerWidth,innerHeight],fits,probe};
  el.querySelector('output').textContent=JSON.stringify(report,null,2);
 },250);
}
