// Only imported on localhost with an isolated playtest save. Buttons arrange fixtures;
// all lessons and rewards still go through the ordinary interaction UI.
import {skill,learnSkill} from '../src/skills.js';
import {chapterOptions} from '../src/chapter.js';
export function mountApprenticeshipHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='ap-test';el.open=true;el.style.cssText='position:fixed;top:75px;left:12px;z-index:1000;background:#eee6d6;color:#302b25;font:14px serif;max-width:280px;padding:8px';
 el.innerHTML='<summary>师承验收 · 独立存档</summary><nav></nav><output style="white-space:pre-wrap"></output>';document.body.append(el);
 let teacher=null,pin=false;
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pin&&id===teacher?true:steer(id,dt);
 function scene(id,x,z){const s=getSim().s;chapterOptions(getSim(),'beggar');pin=true;teacher=id;s.time=35;s.event=null;s.wanted=0;world.syncEvent();s.player.hp=100;s.player.energy=100;s.player.crouched=false;s.player.stealing=false;Object.assign(s.player,{x,z:z+2.2});world.hero.position.set(x,0,z+2.2);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.45;world.distance=6;world.keys.clear();world.auto=null;world.clearReady();const n=s.people[id],a=world.npcs.get(id);Object.assign(n,{hp:100,x,z,stunnedUntil:0,nightWakeUntil:0,awareness:null});n.life={activity:'idle'};a.actor.position.set(x,0,z);a.actor.rotation.y=0;delete a.route;delete a.routeKey;save();}
 const actions={
 '关外 · 杜老捕':()=>scene('old_constable',-13,35),
 '到驿舍取药':()=>scene('relay',-12,23.3),
 '回杜老捕处':()=>scene('old_constable',-13,35),
 '城内 · 苏晚（已解桥上争执）':()=>{scene('su',0,-13);const s=getSim().s;s.facts.enteredCity=true;s.chapter.done.su_wish=s.chapter.done.shen_space=true;s.people.su.relation=8;},
 '林青舟（工钱已清、心得已满）':()=>{scene('qing',-5,-13);const s=getSim().s;s.facts.enteredCity=true;s.chapter.done.convoy_peace=true;s.people.qing.relation=8;learnSkill(s.player,'combat',2,'周伍长');s.player.skills.combat.xp=30;},
 '阿青（已学配药）':()=>{scene('tea',5,-13);const s=getSim().s;s.facts.enteredCity=true;s.facts.herbsGround=true;s.player.money=20;learnSkill(s.player,'medicine',3,'阿青');},
 '收起验收':()=>el.open=false
 };
 for(const [label,fn]of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pin){s.time=35;if(teacher){const n=s.people[teacher];n.life={activity:'idle'};n.sickUntil=0;environment.eco.s.hunger[teacher]=0;}}el.querySelector('output').textContent=['点穴 '+skill(s.player,'pressure').tier,'乐器 '+skill(s.player,'music').tier,'武艺 '+skill(s.player,'combat').tier+' / 心得 '+skill(s.player,'combat').xp,'伤药 '+(s.facts.duMedicineGiven?'已交付':s.facts.duMedicineRequested?'待交付':'未托付'),'竹笛 '+environment.eco.items('player').filter(i=>i.type==='flute').length,'解药 '+environment.eco.items('player').filter(i=>i.type==='antidote').length].join('\n');},200);
}
