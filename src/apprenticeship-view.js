import * as T from '../vendor/three.module.js';
import {lessonPreview,LESSONS,lessonSpec,finishDemonstration,attemptLesson,completeLesson,apprenticeships,apprenticeshipOptions,lessonInvitation} from './apprenticeship.js';
import {SKILLS,skill} from './skills.js';

// Lessons run in the world. Leaving stops the performance, never grants a tier.
export function mountApprenticeship(world,getSim,getEco,{clear,say,notify,follow}){
 const panel=document.createElement('aside'),targets=document.createElement('div');panel.id='lesson-stage';targets.id='lesson-targets';panel.hidden=targets.hidden=true;document.body.append(panel,targets);
 let session=null,elapsed=0,beat=0,feedback='',after=0,prop=null,originalYaw=0;
 function disposeProp(){if(!prop)return;world.scene.remove(prop);prop.traverse(m=>{m.geometry?.dispose();if(m.material)m.material.dispose();});prop=null;}
 function stop(message){const old=session;session=null;world.trainingActor=null;world.trainingPose=null;for(const a of world.trainingView?.cutaway||[])a.group.visible=getSim().s.ecosystem?.objects[a.id]?.hp!==0;world.trainingView=null;world.lessonTick=null;world.performance=null;world.keys.clear();world.auto=null;panel.hidden=targets.hidden=true;document.body.classList.remove('lesson-active');disposeProp();if(old){const n=world.npcs.get(old.id);if(n)n.actor.rotation.y=originalYaw;}if(message)notify(message);}
 function buildProp(type,actor){prop=new T.Group();const mesh=(geo,color,x,y,z)=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=true;prop.add(m);return m;};
  if(type==='weapon'){ /* The teacher already holds the actual sword. */ }
  else if(type==='flute'){const m=mesh(new T.CylinderGeometry(.035,.035,.65,8),0x93734c,0,1.4,.3);m.rotation.z=Math.PI/2;}
  else if(type==='staff'){mesh(new T.CylinderGeometry(.035,.04,1.5,8),0x7c5634,.4,.9,.2);}
  else if(type==='dummy'){mesh(new T.CylinderGeometry(.16,.18,1.45,10),0x8d6849,0,.8,0);mesh(new T.BoxGeometry(.9,.10,.12),0x6c4c34,0,1.3,0);}
  else if(type==='mirror'){mesh(new T.CylinderGeometry(.25,.25,.04,20),0xb8a27c,0,1,.15).rotation.x=Math.PI/2;}
  else if(type==='mortar'){mesh(new T.BoxGeometry(.9,.08,.55),0x785e46,0,.7,0);mesh(new T.CylinderGeometry(.16,.12,.13,12),0xb6a88d,0,.79,0);mesh(new T.BoxGeometry(.16,.035,.15),0x627353,-.3,.77,0);mesh(new T.SphereGeometry(.09,8,6),0xa99269,.3,.8,0);}
  else {mesh(new T.SphereGeometry(.11,10,8),0x9e7950,0,.75,.25);mesh(new T.TorusGeometry(.055,.012,6,12),0x4d392a,0,.87,.25);}
  prop.position.copy(actor.position);prop.rotation.y=actor.rotation.y;if(['dummy','mortar','mirror'].includes(type)){const q=world.hero.position.clone().lerp(actor.position,.5);prop.position.x=q.x+.6;prop.position.z=q.z;}world.scene.add(prop);
 }
 function start(t){stop();clear();session=t;elapsed=beat=after=0;feedback='';const npc=world.npcs.get(t.id);originalYaw=npc.actor.rotation.y;document.body.classList.add('lesson-active');world.trainingActor=t.id;world.trainingPose='reach';world.keys.clear();world.auto=null;world.clearReady();world.hero.rotation.y=Math.atan2(npc.actor.position.x-world.hero.position.x,npc.actor.position.z-world.hero.position.z);buildProp(lessonSpec(t).prop,npc.actor);panel.hidden=false;panel.innerHTML='<small></small><h3></h3><p></p><div class="lesson-beat"><i></i><b></b></div><span></span><button aria-label="暂停传习">×</button>';panel.querySelector('button').onclick=()=>stop('这一遍先停下，回来可继续请教。');panel.querySelector('h3').textContent=(t.observe?'观摩 · ':t.help?'帮忙 · ':t.craft?'配药 · ':t.practice?'温习 · ':'传习 · ')+SKILLS[t.ability].name;panel.querySelector('p').textContent=lessonSpec(t).demo;
  targets.replaceChildren();for(let i=0;i<3;i++){const b=document.createElement('button');b.dataset.lessonPoint=String(i);b.textContent=lessonSpec(t).steps[i];b.onclick=()=>input(i);targets.append(b);}world.lessonTick=pose;say(t.id,lessonSpec(t).demo);
 }
 function input(step,guard=false){if(!session||session.observe||!session.demonstrated||after>0||world.performance)return;const t=session,phase=(beat%2.4)/2.4;
  if(t.ability==='combat'&&((t.step<2&&!guard)||(t.step===2&&guard)))return;
  const ok=attemptLesson(getSim(),t,{step,phase});if(!ok){feedback=t.ability==='theft'?'师父拍开你的手：等肩转过去。':t.ability==='music'?'慢一拍，先听尾音。':'再看一遍，不急。';world.onSound?.('notice',{gain:.25});beat=0;return;}
  feedback=['稳住。','这一手对了。','好，收势。'][t.step-1];world.perform({motion:lessonSpec(t).motion,kind:'listen'},t.id);world.performance.duration=1;world.performance.camera=false;
  if(t.ability==='pressure'){world.performance.targetPoint=prop.position.clone();world.performance.onStrike=()=>{const q=prop?.position||world.npcs.get(t.id).actor.position;world.burst(q.x,1.2,q.z,0xba734f,5);world.onSound?.('body',{gain:.18});};}
  else world.onSound?.(t.ability==='music'?'success':'step',{gain:.25});
  world.showNpcCheck({id:t.id,label:feedback,success:true,observation:true,priority:true});beat=0;if(t.step>=3)after=1.2;
 }
 function pose(){if(!session)return;const n=world.npcs.get(session.id),a=n.actor,t=session,phase=(beat%2.4)/2.4;let yaw=Math.atan2(world.hero.position.x-a.position.x,world.hero.position.z-a.position.z);
  if(t.ability==='theft'&&t.demonstrated&&phase>=.38&&phase<=.82)yaw+=1.8;
  a.rotation.y=T.MathUtils.lerp(a.rotation.y,yaw,.16);world.trainingPose=t.ability==='music'?'flute':t.ability==='combat'?'guard':'reach';
  if(t.ability==='combat'){a.userData.sword.visible=true;a.userData.arms[1].rotation.x=-.6-Math.max(0,Math.sin(phase*Math.PI*2))*1.1;a.userData.npcPoseOverride=true;}
  if(prop&&['purse','parcel','flute','staff'].includes(lessonSpec(t).prop)){prop.position.copy(a.position);prop.rotation.y=a.rotation.y;}
 }
 function update(dt){if(!session)return;const s=getSim().s,t=session,n=s.people[t.id],a=world.npcs.get(t.id).actor;
  if(s.player.hp<=0||n.hp<=0||n.awareness?.caseOpen||['fight','flee'].includes(n.awareness?.state)||a.position.distanceTo(world.hero.position)>4.5){stop('传习被打断了，事情平息后再来。');return;}
  elapsed+=dt;beat+=dt;panel.querySelector('small').textContent=t.demonstrated?'亲手试 · '+Math.min(3,t.step+1)+'/3':'先看师父示范';
  if(!t.demonstrated&&elapsed>=4.5){finishDemonstration(getSim(),t);if(t.observe){const id=t.id,line=lessonInvitation(getSim().s,id);stop();follow(id,apprenticeshipOptions(getSim(),id),line);return;}panel.querySelector('p').textContent=lessonSpec(t).hint;beat=0;}
  if(after>0){after-=dt;if(after<=0){const result=completeLesson(getSim(),getEco(),t),id=t.id;stop();if(result.error)notify(result.error);else {say(id,result.text);notify(result.changes.join(' · '));if(t.help)follow(id,apprenticeshipOptions(getSim(),id),result.text);}return;}}
  const phase=(beat%2.4)/2.4;panel.querySelector('.lesson-beat i').style.left=(phase*100)+'%';panel.querySelector('.lesson-beat').hidden=!t.demonstrated||!['music','combat','theft'].includes(t.ability);panel.querySelector('span').textContent=feedback||'Esc 暂停 · 移动离开';
  targets.hidden=!t.demonstrated||['combat','music'].includes(t.ability)||after>0;
  const offsets=t.ability==='medicine'?[[-.3,.85,0],[0,.85,0],[.3,.85,0]]:[[-.35,1.55,.1],[.3,.95,.2],[.35,1.2,.1]];
  for(const b of targets.children){const i=Number(b.dataset.lessonPoint),base=['medicine','pressure'].includes(t.ability)?prop:a,q=world.screenPoint(base.localToWorld(new T.Vector3(...offsets[i])));b.hidden=!q.visible||i!==t.step;b.style.left=Math.max(20,Math.min(innerWidth-160,q.x))+'px';b.style.top=Math.max(110,Math.min(innerHeight-160,q.y+(i===1?20:0)))+'px';b.classList.toggle('current',i===t.step);b.disabled=i!==t.step;}
  if(t.demonstrated&&t.ability==='combat'&&t.step<2&&world.keys.has('KeyF')&&phase>=.38&&phase<=.82)input(t.step,true);
 }
 window.addEventListener('keydown',e=>{if(!session||e.repeat||e.target.closest?.('input,textarea'))return;if(['Escape','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();stop('这一遍先停下，回来再练。');return;}if(e.code==='Space'&&session.ability==='music'){e.preventDefault();e.stopImmediatePropagation();input(session.step);}if(e.code==='KeyF'){e.preventDefault();e.stopImmediatePropagation();world.keys.add('KeyF');}},true);
 world.canvas.addEventListener('pointerdown',e=>{if(session&&e.button===0){e.preventDefault();e.stopImmediatePropagation();if(session.ability==='combat')input(session.step);}},true);
 return {start,update,stop,get active(){return !!session;}};
}

export function mountSkillGuide(getSim,available,activate){const el=document.createElement('aside');el.id='skill-learned';el.hidden=true;document.body.append(el);let current=null;
 function acknowledge(){if(current){current.seen=true;getSim().save();}current=null;el.hidden=true;document.querySelectorAll('.skill-new').forEach(b=>b.classList.remove('skill-new'));}
 function update(){const s=getSim().s;if(!available()){el.hidden=true;document.querySelectorAll('.skill-new').forEach(b=>b.classList.remove('skill-new'));return;}current??=apprenticeships(s).guides.find(g=>!g.seen);if(!current)return;el.hidden=false;const g=current,mode=g.ability==='pressure'?'pressure':g.ability==='insight'?'probe':null,target=mode&&document.querySelector(`#aim-skills button[data-skill="${mode}"]`);target?.classList.add('skill-new');if(el.dataset.key!==g.key){el.dataset.key=g.key;el.innerHTML='<small>手法精进</small><h3></h3><p></p><button class="try-skill"></button><button class="dismiss-skill">记住了</button>';el.querySelector('h3').textContent=SKILLS[g.ability].name+' · '+['','','入门','熟练','精通'][g.tier];el.querySelector('p').textContent=SKILLS[g.ability].abilities[g.tier]+(mode?'。右下角亮起的'+(mode==='pressure'?'点穴':'探查')+'按钮可施展，选定人物后再确认。':'。江湖录「己」页可查看技艺与下一位师父。');el.querySelector('.try-skill').textContent=mode?'现在试试 ↘':'打开技艺谱';el.querySelector('.try-skill').onclick=()=>{acknowledge();activate(mode);};el.querySelector('.dismiss-skill').onclick=acknowledge;}}
 return {update};}
