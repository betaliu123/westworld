// Local, isolated fixture; selection and confirmation use the real theft panel.
export function mountTheftHarness({getSim,world,environment,objects,save}){
 const el=document.createElement('details');el.id='theft-qa';el.open=true;
 el.style.cssText='position:fixed;top:80px;left:16px;z-index:1000;background:var(--paper);color:var(--ink);padding:8px;max-width:280px;font:14px "Jianghu Body",KaiTi,serif';
 el.innerHTML='<summary>偷窃验收 · 独立存档</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 let held=false,rolls=0,sightFixture=false,turnDuring=false,lastIncident='';
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>sightFixture?true:steer(id,dt);
 getSim().listeners.push((type,event)=>{if(type==='worldIncident')lastIncident='目击 '+(event.witnesses?.join('、')||'无');});
 const errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 function stage(){
  const sim=getSim(),s=sim.s,p=s.player,n=s.people.su;held=true;rolls=0;world.dialogue.finish(true);s.time=35;s.event=null;s.facts.enteredCity=true;s.wanted=0;s.chapter.opened=true;delete s.complaint;world.performance=null;world.theftAttempt=null;world.checkReveal.cancel();world.locked=false;lastIncident='';
  Object.assign(p,{x:0,z:3.4,hp:100,energy:100,satiety:100,rested:100,stealing:true,crouched:true});p.skills.theft.tier=1;world.hero.position.set(p.x,0,p.z);
  Object.assign(n,{hp:60,stunnedUntil:0,muteUntil:0,restraint:null,purse:16,theftAlertDay:0,complaintUntil:0,awareness:null,eatingUntil:0,drinkingUntil:0,life:{activity:'idle'},facing:0});world.npcs.get('su').actor.position.set(0,0,2);environment.eco.positions.su={x:0,z:2};environment.eco.reserved=new Set(['su']);world.yaw=0;world.pitch=.45;world.distance=6;world.syncEvent();sim.rng=()=>{rolls++;return 0;};objects.openTheft('su');save();
 }
 function sightStage(direction,witness=false){
  sightFixture=true;stage();const s=getSim().s;s.player.skills.theft.tier=3;s.player.z=direction==='front'?3.4:direction==='edge'?2:.6;s.player.x=direction==='edge'?1.8:0;world.hero.position.set(s.player.x,0,s.player.z);
  for(const [id,n] of world.npcs){n.theftAttention=0;n.theftLookUntil=0;n.actor.userData.head.rotation.y=0;Object.assign(s.people[id],{awareness:null,fear:0,mood:'calm',life:{activity:'idle'},facing:0});n.actor.rotation.y=0;if(id!=='su')n.actor.position.set(45+world.npcs.size,0,45);}
  if(witness){const n=world.npcs.get('gao');n.actor.position.set(-1.8,0,-1.8);n.actor.rotation.y=Math.atan2(s.player.x+1.8,s.player.z+1.8);s.people.gao.hp=100;}
  world.npcs.get('su').actor.position.set(0,0,2);turnDuring=false;objects.openTheft('su');save();
 }
 const actions={
  '苏晚 · 粗通钱袋':stage,
  '升至入门':()=>{getSim().s.player.skills.theft.tier=2;save();},
  '外露物品':()=>{const eco=environment.eco;if(!eco.items('npc:su').some(i=>i.name==='随身干粮'))eco.create('随身干粮','food','npc:su');objects.openTheft('su');},
  '移远':()=>{const p=getSim().s.player;p.x=4;world.hero.position.x=4;},
  '回到身侧':()=>{const p=getSim().s.player;p.x=0;world.hero.position.x=0;},
  '倒地搜取':()=>{getSim().s.people.su.hp=0;objects.openTheft('su');},
  '重开行囊':()=>objects.openTheft('su'),
  '视野 · 背后':()=>sightStage('rear'),
  '视野 · 正面':()=>sightStage('front'),
  '视野 · 余光回头':()=>sightStage('edge'),
  '视野 · 旁人目击':()=>sightStage('rear',true),
  '伸手时转身':()=>{sightStage('rear');turnDuring=true;},
  '手法失败':()=>{sightStage('rear');getSim().rng=()=>{rolls++;return .999;};},
  '恢复成功骰':()=>{getSim().rng=()=>{rolls++;return 0;};},
  '长对白':()=>{sightStage('rear');document.querySelector('[aria-label="关闭偷窃背包"]')?.click();world.dialogue.play([{id:'su',text:'这里临近街口，来来往往的人多。有人背着身，也有人正朝这边看；眼前看不见的事，我不会替旁人作证。你若有话便直说，我听着。等这句话说完，再决定要不要留下。'}],()=>{},'苏晚');el.open=false;},
  '清屏':()=>{el.open=false;},
 };
 for(const [label,run]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=run;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(held){s.time=35;const n=world.npcs.get('su');if(!s.complaint&&!s.people.su.awareness){n.actor.position.set(0,0,2);n.route=null;}Object.assign(s.people.su,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y});if(turnDuring&&world.theftAttempt&&world.t-world.theftAttempt.start>.35){n.actor.rotation.y=Math.PI;turnDuring=false;}}
  const watched=[...document.querySelectorAll('.stealth-eye:not([hidden])')].map(n=>n.getAttribute('aria-label')).join(' / ');
  el.querySelector('output').textContent=`钱袋余额 ${s.people.su.purse}\n妙手档位 ${s.player.skills.theft.tier}\n实际掷骰 ${rolls}\n持有钱袋 ${environment.eco.items('player').filter(i=>i.type==='purse').length}\n${lastIncident}\n${watched}\n浏览器错误 ${errors.length}${errors.length?' '+errors.at(-1):''}`;
 },100);
}
