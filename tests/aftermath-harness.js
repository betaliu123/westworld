// Localhost only, isolated save. Arrange encounters; use normal E and dialogue buttons to respond.
import {deckState} from '../src/event-deck.js';
import {progressSnapshot} from '../src/progress.js';
export function mountAftermathHarness({getSim,world,save}){
 const el=document.createElement('details');el.id='aftermath-qa';el.open=true;el.style.cssText='position:fixed;top:75px;left:12px;z-index:1000;background:#eee6d6;color:#302b25;font:14px serif;max-width:270px;padding:8px';
 el.innerHTML='<summary>余波验收 · 独立存档</summary><nav></nav><output style="white-space:pre-wrap;overflow-wrap:anywhere"></output>';document.body.append(el);
 let pinned=false;
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned&&id==='old_constable'?true:steer(id,dt);
 function scene(template){const sim=getSim(),s=sim.s,id='old_constable',n=s.people[id],a=world.npcs.get(id);world.dialogue.finish(true);s.time=35;s.event=null;s.wanted=0;s.complaint=null;world.syncEvent();Object.assign(s.player,{hp:100,energy:100,crouched:false,stealing:false,x:-13,z:37.2});delete s.player.bedRest;
  world.hero.position.set(-13,0,37.2);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.4;world.distance=7;world.keys.clear();world.auto=null;world.clearReady();world.quietUntil=0;
  Object.assign(n,{hp:100,x:-13,z:35,stunnedUntil:0,muteUntil:0,fear:0,awareness:null,relation:-8});n.life={activity:'idle'};a.actor.position.set(-13,0,35);a.actor.rotation.y=0;delete a.route;delete a.routeKey;pinned=true;
  const d=deckState(s);d.echoes=[{id:++d.seq,cause:99,causeTitle:'关前动手',who:id,teller:'gate_guard',template,channel:template==='thanks_letter'?'mail':'talk',due:s.day,day:s.day,line:template==='grudge'?'你当街动手那一回，我可看得清楚。':template==='thanks_letter'?'那日承你照料，这声谢一直没来得及说。':'韩校尉说你当街动手，老夫想听你亲口讲一遍。',title:'先前的事',delta:-2}];d.heard[id]=s.day;sim.progressBaseline=progressSnapshot(s);save();
 }
 for(const [label,fn]of [['传闻 · 杜老捕',()=>scene('rumor_spread')],['亲见 · 杜老捕',()=>scene('grudge')],['谢意 · 杜老捕',()=>scene('thanks_letter')],['收起验收',()=>el.open=false]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s,e=s.deck?.echoes.find(x=>x.cause===99);if(pinned){s.time=35;s.people.old_constable.life={activity:'idle'};}
  el.querySelector('output').textContent=`招呼 ${e?.announced?'已说':'待相见'}\n回应 ${e?.response?.answer||'尚无'}\n好感 ${s.people.old_constable.relation}\n结算 ${e?.response?JSON.stringify(e.response):'尚无'}\n浮字 ${JSON.stringify([...(world.deltaQueue?.values()||[])])} / ${JSON.stringify([...(world.deltaSprites?.keys()||[])])}\n按 E 回应；用正常选项验收`;},200);
}
