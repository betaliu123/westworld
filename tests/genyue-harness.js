import {chapterOptions,chapterResolve} from '../src/chapter.js';
import {syncQuests} from '../src/progress.js';
import {giveItem} from '../src/npc-actions.js';

// Explicit localhost playtest only, with the existing independent save scope.
export function mountGenyueHarness({getSim,world,environment,dialogue,codex,showTalkChoices,closeDrawer,save}){
 const panel=document.createElement('details');panel.id='genyue-qa';panel.open=true;
 panel.style.cssText='position:fixed;top:8px;left:8px;z-index:1500;max-width:330px;background:var(--paper);font:14px var(--font-body);padding:8px';
 panel.innerHTML='<summary>门路验收 · 独立存档</summary><nav></nav><output></output>';document.body.append(panel);
 const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 function go(id){dialogue.finish(true);closeDrawer();environment.close();const s=getSim().s,n=world.npcs.get(id);s.facts.enteredCity=true;s.event=null;s.time=45;s.wanted=0;chapterOptions(getSim(),id);s.chapter.opened=true;s.player.hp=100;
  Object.assign(s.people[id],{hp:100,stunnedUntil:0,muteUntil:0,life:{activity:'idle'}});delete s.people[id].awareness;delete s.people[id].restraint;
  world.hero.position.set(n.actor.position.x,0,n.actor.position.z+2);Object.assign(s.player,{x:world.hero.position.x,z:world.hero.position.z});environment.eco.positions[id]={x:n.actor.position.x,z:n.actor.position.z};world.syncEvent();world.yaw=.3;world.pitch=.5;world.distance=7;syncQuests(s);save();
 }
 const actions={
  '入城目标':()=>{go('traveler');codex.open('affairs');},
  '找锦衣客':()=>{go('traveler');showTalkChoices('traveler',chapterOptions(getSim(),'traveler').filter(a=>a.id==='ch_royal_task_offer'||a.id==='ch_gy_seek'));},
  '找花鸟使':()=>{go('fu');showTalkChoices('fu',chapterOptions(getSim(),'fu').filter(a=>a.id==='ch_fu_ledger_offer'||a.id==='ch_gy_seek'));},
  '常规门路':()=>{for(const [id,key]of [['inspector','genyue_court_offer'],['gang_boss','genyue_gang_offer']]){go(id);chapterResolve(getSim(),environment.eco,id,'ch_'+key);}codex.open('affairs');},
  '已交花鸟使':()=>{go('fu');const item=environment.eco.s.items.find(i=>i.type==='ledger');if(!getSim().s.ledgerCase?.delivery){environment.eco.transfer(item,'player','stolen');giveItem(getSim(),environment.eco,'fu',item.id);}codex.open('affairs');},
  '任务卷轴':()=>{dialogue.finish(true);codex.open('affairs');},
  '长对白':()=>{go('fu');getSim().s.player.crouched=true;dialogue.play([{id:'fu',text:'花石纲那本副账，我要原本。交到我手里，我给你赴艮岳的帖子；若交了旁人，这场买卖便不作数。'}]);},
  '探索清屏':()=>{dialogue.finish(true);closeDrawer();environment.close();panel.hidden=true;},
 };
 for(const [label,run]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=run;panel.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;panel.querySelector('output').textContent=`${innerWidth}×${innerHeight} · 错误 ${errors.length} · ${s.quests?.genyue?.objective||'尚未入城'}`;},500);
}
