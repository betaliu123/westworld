// Local, explicitly isolated playtest; no access to the player's save key.
export function mountGroundSeatHarness({getSim,world,environment,save}){
 const panel=document.createElement('details');panel.open=true;panel.style.cssText='position:fixed;top:80px;left:12px;z-index:1200;background:var(--paper);font:14px "Jianghu Body",KaiTi,serif;padding:8px;max-width:300px';
 panel.innerHTML='<summary>坐地验收 · 独立存档</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(panel);
 const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));let time=35,id='beggar';
 function go(who,night=false){id=who;const sim=getSim(),s=sim.s,n=world.npcs.get(id);world.dialogue.finish(true);environment.close();s.event=null;world.syncEvent();time=night?170:35;s.time=time;s.player.hp=100;s.wanted=0;s.people[id].nightWakeUntil=0;s.people[id].nightConversation=false;
  world.hero.position.set(n.actor.position.x-2,0,n.actor.position.z+1.8);Object.assign(s.player,{x:world.hero.position.x,z:world.hero.position.z});world.yaw=.55;world.pitch=.52;world.distance=6.5;save();}
 const actions={'瘸张闲坐':()=>go('beggar'),'周大石候车':()=>go('porter'),'周大石打盹':()=>go('porter',true),'坐地交谈':()=>world.dialogue.play([{id,text:'忙了一路，坐下歇一会儿。有事你说，我听着。'}]),'茶摊包子':()=>{world.dialogue.finish(true);world.hero.position.set(-10,0,29);Object.assign(getSim().s.player,{x:-10,z:29});world.yaw=.2;world.pitch=.55;world.distance=3.5;},'收起':()=>panel.open=false};
 for(const [label,run]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=run;panel.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;s.time=time;const n=world.npcs.get(id);panel.querySelector('output').textContent=`${innerWidth}×${innerHeight}\n${id} · ${s.people[id].life?.activity}\n坐地 ${n.groundWeight?.toFixed(2)||0}\n${n.model.activeClip}\n错误 ${errors.length}${errors.length?'\n'+errors.at(-1):''}`;},200);
}
