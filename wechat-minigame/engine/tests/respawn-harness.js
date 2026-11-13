// Isolated localhost fixture. Recovery and movement use the ordinary R / WASD handlers.
export function mountRespawnHarness({getSim,world,save}){
 const el=document.createElement('aside');el.id='respawn-qa';el.style.cssText='position:fixed;top:85px;left:16px;z-index:1000;background:#fff4dd;color:#23221e;padding:12px;font:14px sans-serif';
 el.innerHTML='<strong>重生验收 · 独立存档</strong><nav></nav><output style="white-space:pre;display:block"></output>';document.body.append(el);
 let origin=null;
 function down(inside){const sim=getSim(),s=sim.s;origin=null;s.time=35;s.player.hp=0;delete s.player.bedRest;s.facts.enteredCity=inside;s.event=inside?null:{id:++s.sequence,type:'gate',status:'active',depth:0,point:[0,24],cast:['gate_guard'],gate:{phase:'gate',attempts:[],facts:{}}};world.hero.position.set(0,0,inside?14:27);s.player.x=0;s.player.z=world.hero.position.z;world.onHurt();world.syncEvent();save();}
 for(const [label,fn]of [['城外倒地',()=>down(false)],['城内倒地',()=>down(true)],['重现旧版卡住存档',()=>{down(false);const s=getSim().s;s.player.hp=60;s.player.z=14;world.hero.position.z=14;save();location.reload();}]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const p=getSim().s.player;if(p.hp>0&&!origin)origin={x:p.x,z:p.z};el.querySelector('output').textContent=`气血 ${p.hp.toFixed(0)}\n位置 ${p.x.toFixed(2)}, ${p.z.toFixed(2)}\n已移动 ${origin?Math.hypot(p.x-origin.x,p.z-origin.z).toFixed(2):'0'}\n移动锁 ${world.locked?'开':'关'}\n按 R 恢复，再按 WASD 移动`;},100);
}
