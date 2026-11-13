// Localhost-only fixtures. Production wardrobe buttons perform the actual equip.
import {syncAppearanceFeedback} from '../src/appearance-feedback.js';
export function mountAppearanceBarksHarness({getSim,world,environment,save}){
 const box=document.createElement('details');box.id='appearance-barks-qa';box.open=true;box.style.cssText='position:fixed;left:8px;top:8px;z-index:1500;background:#eee6d6;color:#302b25;font:14px serif;max-width:240px;padding:6px';
 box.innerHTML='<summary>装扮冒泡 · 独立试玩</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(box);
 const errors=[],heard=[];let pinned=null,last='';addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>id===pinned?true:steer(id,dt);
 function setup(){
  const sim=getSim(),s=sim.s;world.dialogue.finish(true);environment.close();document.getElementById('drawer').hidden=true;document.body.classList.remove('panel-open');world.locked=false;
  s.time=35;s.event=null;s.wanted=0;s.complaint=null;s.player.face=null;delete s.player.bedRest;s.player.hp=100;s.player.energy=100;s.player.crouched=false;s.player.stealing=false;
  world.syncEvent();Object.assign(s.player,{x:-13,z:38});world.hero.position.set(-13,0,38);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.keys.clear();world.clearReady();world.auto=null;world.quietUntil=0;
  const n=s.people.tea_host,a=world.npcs.get('tea_host').actor;Object.assign(n,{x:-13,z:35.5,hp:100,maxHp:100,fear:0,awareness:null,restraint:null,inCustody:false,drowning:false,stunnedUntil:0,muteUntil:0,life:{activity:'idle'}});a.position.set(-13,0,35.5);a.rotation.y=0;a.visible=true;pinned='tea_host';
  const eco=environment.eco;for(const [name,role]of [['验收差役服','差役'],['验收挑夫短褂','挑夫'],['验收罗裙','女装行客']])if(!eco.items('player').some(i=>i.name===name))eco.create(name,'clothing','player',{identityRole:role,discovered:true});
  if(!eco.items('player').some(i=>i.name==='验收斗笠'))eco.create('验收斗笠','hat','player',{discovered:true});
  const own=eco.items('player').find(i=>i.name==='旧布衣');s.player.wornOutfit=own?.id||null;s.player.disguise=null;s.player.hat=null;delete s.appearance.outfitFeedback;syncAppearanceFeedback(s);heard.length=0;save();
 }
 const actions=[['布置 · 茶娘看见',setup],['背对',()=>{world.npcs.get('tea_host').actor.rotation.y=Math.PI;}],['重新看见',()=>{world.npcs.get('tea_host').actor.rotation.y=0;}],['收起验收',()=>{box.open=false;}]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;box.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinned)s.time=35;const bubble=document.getElementById('npc-speech');if(!bubble.hidden&&bubble.textContent!==last){last=bubble.textContent;heard.push(last);}const m=s.appearance?.outfitFeedback;
  box.querySelector('output').textContent=`${innerWidth}×${innerHeight}\n已播 ${Object.keys(m?.seen||{}).length}\n待播 ${m?.pending?.kind||'无'}\n${heard.slice(-2).join('\n')}\n错误 ${errors.length}: ${errors.join(' / ')}`;
  parent.postMessage({type:'appearance-barks-qa',size:[innerWidth,innerHeight],heard,errors,seen:Object.keys(m?.seen||{}).length},location.origin);
 },200);
}
