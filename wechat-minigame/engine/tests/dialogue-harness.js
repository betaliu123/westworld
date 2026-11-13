// Localhost only, isolated save; normal NPC buttons exercise the real input path.
export function mountDialogueHarness({getSim,world,save}){
 const el=document.createElement('details');el.id='dialogue-qa';el.open=true;el.style.cssText='position:fixed;top:75px;left:12px;z-index:1000;background:#eee6d6;color:#302b25;font:14px serif;max-width:290px;padding:8px';
 el.innerHTML='<summary>对白验收 · 独立存档</summary><nav></nav><output style="white-space:pre-wrap"></output><pre></pre>';document.body.append(el);
 let pinned=false;
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned&&id==='relay'?true:steer(id,dt);
 function prepare(){const sim=getSim(),s=sim.s;world.dialogue.finish(true);pinned=true;s.time=35;s.wanted=0;s.complaint=null;
  s.event={id:++s.sequence,type:'gate',status:'active',depth:0,point:[0,24],cast:['gate_guard'],gate:{phase:'gate',attempts:[],facts:{}}};
  Object.assign(s.player,{hp:100,energy:100,crouched:false,stealing:false,x:-7,z:27});delete s.player.bedRest;
  world.hero.position.set(-7,0,27);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.keys.clear();world.auto=null;world.clearReady();world.syncEvent();
  const n=s.people.relay,a=world.npcs.get('relay');Object.assign(n,{x:-7,z:25,hp:100,awareness:null,stunnedUntil:0,muteUntil:0,nightWakeUntil:0});n.life={activity:'idle'};a.actor.position.set(-7,0,25);a.actor.rotation.y=0;delete a.route;delete a.routeKey;save();
 }
 function lifecycle(){const d=world.dialogue,log=[],line=[{id:'relay',text:'验收对白。'}],option={action:{id:'qa',label:'继续这件事'},preview:{certain:true}},check=(v,s)=>{log.push((v?'PASS ':'FAIL ')+s);};d.finish(true);
  let old=0,current=0,closed=0,selected=0;
  d.play(line,()=>old++);d.play(line,()=>current++);check(old===0,'替换对白不执行旧续接');d.finish();check(current===1,'听完只执行当前续接');
  d.play(line,()=>old++);d.choose({title:'选择',options:[option],onSelect:()=>selected++,onClose:()=>closed++});check(old===0,'选项替换对白不续接旧剧情');
  const button=document.querySelector('#dialogue-stage [data-choice="qa"]');button.click();button.click();check(selected===1&&closed===0,'选择仅执行一次');
  d.choose({title:'空回应',options:[],onClose:()=>closed++});check(!d.active&&!world.locked&&closed===1,'空选项不弹窗、不锁移动');
  d.play(line,()=>old++);d.choose({title:'空回应',options:[],onClose:()=>closed++});check(old===0&&!d.active&&!world.locked,'空选项替换不误完成旧对白');
  let cancelled=null;d.play(line,value=>cancelled=value);window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));check(cancelled===true&&!d.active&&!world.locked,'Esc 取消并释放移动');
  d.play(line,()=>d.choose({title:'同一件事的后续',options:[option],onSelect:()=>selected++}));document.querySelector('#dialogue-stage [data-next]').click();check(d.active&&!!document.querySelector('#dialogue-stage [data-choice="qa"]'),'听完保留设计好的后续选择');d.finish(true);
  el.querySelector('pre').textContent=log.join('\n');
 }
 for(const [label,fn]of [['检验对白生命周期',lifecycle],['到茶棚交谈',prepare],['保存旧茶棚阶段并重载',()=>{prepare();const s=getSim().s;s.event.gate.phase='relay';s.event.point=[-7,24];s.event.cast=['relay'];save();location.reload();}],['收起验收',()=>el.open=false]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinned){s.time=35;s.people.relay.life={activity:'idle'};}el.querySelector('output').textContent=`事件阶段 ${s.event?.gate?.phase||'无'}\n可选回应 ${getSim().actions().length}\n移动锁 ${world.locked?'开':'关'}\n按 E 使用正常 NPC 交互`;},200);
}
