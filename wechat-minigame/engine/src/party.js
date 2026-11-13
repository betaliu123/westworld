import * as T from '../vendor/three.module.js';
import {character,textSprite} from './world.js';
import {ensureParty,switchMember,COMMANDS,localCommand,validCommand} from './party-state.js';
import {turnToward} from './interaction.js';
export function mountParty(world,getSim,environment,notify,journal,onSwitch=()=>{}){
 let sim=getSim(),party=ensureParty(sim.s),ticket=0,routeClock=0;
 const names={main:'少侠',companion:'阿笙'},actors={main:world.hero,companion:character(0x626995,true)};
 world.scene.add(actors.companion);for(const [id,a]of Object.entries(actors)){const label=textSprite(names[id]+' · 同行','#e7ce97',29);label.position.y=2.6;a.add(label);}
 const flutes={};for(const [id,a] of Object.entries(actors)){const f=world.actionFlute.clone();a.userData.rig.add(f);f.visible=false;flutes[id]=f;}
 const ui=document.createElement('aside');ui.id='party-ui';ui.hidden=true;ui.setAttribute('aria-label','队伍');
 ui.innerHTML='<div class="party-members"><button data-member="main"></button><button data-member="companion"></button></div>';
 document.body.append(ui);
 const bubble=document.createElement('div');bubble.id='party-speech';bubble.hidden=true;document.body.append(bubble);let speech=null;
 function say(id,text){journal.add('chat',names[id],text);speech={id,text,until:world.t+7};}
 function attach(){world.hero=actors[party.active];world.hero.userData.arms[1].add(world.actionBowl);world.hero.userData.arms[0].add(world.actionCoins);world.hero.userData.rig.add(world.actionFlute);}
 function restore(){for(const [id,a]of Object.entries(actors)){const p=party.members[id];a.position.set(p.x,0,p.z);p.order=p.order==='follow'?'follow':'wait';p.job=null;}attach();}
 restore();
 function stop(id){const p=party.members[id];p.job=null;p.order='wait';if(environment.eco.show?.owner===id){environment.eco.stopShow();if(party.active===id)world.performance=null;}}
 function select(id){if(world.locked||id===party.active)return;if(world.performance&&world.performance.duration!==3600)return notify('这个动作即将结束，稍后可切换。');
 ticket++;const old=party.active,p=party.members[old];p.x=world.hero.position.x;p.z=world.hero.position.z;p.order='wait';p.job=null;world.hero.userData.sword.visible=false;world.performance=null;world.auto=null;world.keys.clear();world.clearReady();world.attackTime=0;world.jumpV=0;
 onSwitch();switchMember(sim.s,id);party.members[id].job=null;attach();if(environment.eco.show?.owner===id){world.perform({id:'music',kind:'support'},null);world.performance.duration=3600;}
 notify('现在控制'+names[id]+'；'+names[old]+(environment.eco.show?.owner===old?'继续吹笛。':'留在原地。'));sim.save();}
 for(const b of ui.querySelectorAll('[data-member]'))b.onclick=()=>select(b.dataset.member);
 function plan(id,action,target){if(!validCommand(action,target)){say(id,'先选中相应的树、掉落物或一份吃食，再告诉我。');return;}
 const p=party.members[id];if(p.hp<=0){say(id,'我受伤倒下了，暂时动不了。');return;}stop(id);
 if(action==='perform'){const error=environment.eco.startShow(p.x,p.z,id);if(error)return say(id,error);p.order='perform';say(id,'我留在这里吹笛，你去忙吧。');}
 else if(action==='follow'){p.order='follow';say(id,'好，我跟着你。');}
 else if(['wait','stop'].includes(action))say(id,'我在这里等你。');
 else{p.order='job';p.job={action,target:{...target},elapsed:0,route:null};say(id,'我去'+({move:'那里',pickup:'拾起'+target.name,buy:'买下'+target.name,shake:'摇一摇'+target.name}[action])+'。');}
 sim.save();}
 async function command(text){text=text.trim();if(!text)return;const id=party.active==='main'?'companion':'main',ownSim=sim,own=++ticket,target=environment.target();journal.add('chat','你 → '+names[id],text);
 let action;try{const r=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'companion',text,allowed:COMMANDS,target,character:{name:names[id],personality:'沉稳、重承诺，擅长笛艺和轻身；只执行明确交代的事。',state:party.members[id],recent:sim.s.history.slice(-3).map(h=>h.text)}}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const data=await r.json();action=data.action;}catch{action=localCommand(text);}
 if(own!==ticket||ownSim!==sim)return;if(!COMMANDS.includes(action)){say(id,'没听明白。你可以让我跟随、等待、吹笛、收笛，或操作选中的物品。');return;}
 plan(id,action,target);}
 function path(actor,target){const proxy={hero:actor,collides:world.collides.bind(world)};return world.routeTo.call(proxy,[target.x,target.z])?proxy.auto:null;}
 function moveAlong(actor,route,dt){if(!route?.length)return false;const [x,z]=route[0],dx=x-actor.position.x,dz=z-actor.position.z,d=Math.hypot(dx,dz);if(d<.22){route.shift();return false;}actor.rotation.y=turnToward(actor.rotation.y,Math.atan2(dx,dz),dt);world.move(actor,dx/d*Math.min(d,3*dt),dz/d*Math.min(d,3*dt));return true;}
 return {command,recipient(){return names[party.active==='main'?'companion':'main'];},key(e){if(e.code==='Digit1')select('main');if(e.code==='Digit2')select('companion');},update(dt,started){ui.hidden=!started;if(!started)return;if(sim!==getSim()){ticket++;sim=getSim();party=ensureParty(sim.s);restore();}
 routeClock-=dt;
 for(const [id,a] of Object.entries(actors)){const p=party.members[id],performing=environment.eco.show?.owner===id;let moving=false;
 if(id!==party.active){if(p.hp>0&&!performing){p.energy=Math.min(100,p.energy+dt*3);if(p.order==='follow'){const target=world.hero.position;if(a.position.distanceTo(target)>3.5){if(routeClock<=0)p.route=path(a,target);moving=moveAlong(a,p.route,dt);}else p.route=null;}
 if(p.job){const job=p.job;job.elapsed+=dt;if(job.elapsed>25){p.job=null;say(id,'前路不顺，我先停下。');}else if(Math.hypot(a.position.x-job.target.x,a.position.z-job.target.z)<3.2){p.x=a.position.x;p.z=a.position.z;p.job=null;if(job.action==='move')say(id,'到了，我在这里等你。');else{const active=sim.s.player;let error;try{sim.s.player=p;error=environment.eco.act(job.action,job.target.id,job.target.item);}finally{sim.s.player=active;}p.gestureUntil=world.t+2;say(id,error||'办好了。');}}else{if(!job.route||routeClock<=0)job.route=path(a,job.target);moving=moveAlong(a,job.route,dt);}}}
 world.animateActor(a,moving?1:0,dt,p.hp<=0?'down':'');a.userData.sword.visible=false;
 if(performing){a.userData.arms[0].rotation.x=-1.55;a.userData.arms[1].rotation.x=-1.55;a.userData.rig.rotation.z=Math.sin(world.t*2)*.025;}
 else if(p.gestureUntil>world.t)a.userData.arms[1].rotation.x=-1.3;
 p.x=a.position.x;p.z=a.position.z;}
 flutes[id].visible=performing&&id!==party.active;
 const b=ui.querySelector('[data-member="'+id+'"]');b.classList.toggle('selected',id===party.active);b.textContent=(id==='main'?'1 ':'2 ')+names[id]+' · '+Math.ceil(p.hp)+' 血 / '+Math.floor(p.energy)+' 力'+(performing?' · 吹笛':id===party.active?' · 控制中':p.job?' · 办事':p.order==='follow'?' · 跟随':' · 等待');}
 if(routeClock<=0)routeClock=.8;
 bubble.hidden=!speech||speech.until<world.t;if(!bubble.hidden){const a=actors[speech.id],q=world.screenPoint(a.position.clone().add(new T.Vector3(0,2.6,0)));bubble.hidden=!q.visible;bubble.style.left=q.x+'px';bubble.style.top=q.y+'px';bubble.textContent=names[speech.id]+'：'+speech.text;}
 }};
}
