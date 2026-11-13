import {WARDROBE_CHEST} from '../src/home-chest.js';
import {rememberFace,applyFace,appearanceState,currentFace} from '../src/appearance.js';
import {COURT_CHEST} from '../src/identity-opportunities.js';
// Local-only fixtures use the production conversation, checks, inventory and chest.
export function mountIdentityHarness({getSim,world,environment,save}){
 const el=document.createElement('details');el.id='identity-qa';el.open=true;
 el.style.cssText='position:fixed;top:8px;right:8px;z-index:1500;background:var(--paper);color:var(--ink);font:14px var(--font-body);max-width:290px;padding:8px';
 el.innerHTML='<summary>冒名交往 · 独立验收</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 let pinned=new Set(),errors=[],target='inspector';addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const steer=world.ecology.steer;world.ecology.steer=(id,dt)=>pinned.has(id)?true:steer(id,dt);
 function place(id,x,z){const n=getSim().s.people[id],actor=world.npcs.get(id).actor;Object.assign(n,{x,z,hp:n.maxHp||100,stunnedUntil:0,muteUntil:0,sickUntil:0,awareness:null,restraint:null,inCustody:false,life:{activity:'idle'}});actor.position.set(x,0,z);actor.rotation.y=0;environment.eco.positions[id]={x,z,facing:0};}
 function fixture(face,id){const sim=getSim(),s=sim.s,eco=environment.eco,meeting=id==='tea_host'?{x:-15.6,z:27.4}:{x:10,z:-23};target=id;
  world.dialogue.finish(true);world.checkReveal.cancel();environment.close();document.getElementById('drawer').hidden=true;document.getElementById('panel').hidden=true;
  s.time=35;s.event=null;s.facts.enteredCity=true;s.chapter.opened=true;s.wanted=0;s.complaint=null;s.identityAccounts={recognitions:{},receipts:{},grants:{}};
  const ap=appearanceState(s);ap.checks={};ap.exposed={};ap.rumors={};sim.rng=()=>0;
  pinned=new Set(['traveler','fu','inspector','guard',face,id]);for(const person of pinned)place(person,person===id?meeting.x:30+(person==='traveler'?8:person==='fu'?4:0),person===id?meeting.z:10);
  Object.assign(s.player,{x:meeting.x,z:meeting.z+2.1,hp:s.player.maxHp||100,energy:100,crouched:false,stealing:false});world.hero.position.set(meeting.x,0,meeting.z+2.1);world.hero.rotation.y=Math.PI;world.yaw=0;world.pitch=.35;world.distance=6;
  s.people[face].metPlayer=true;rememberFace(s,face);applyFace(sim,'player');eco.create('易容膏','cosmetic','player',{discovered:true});applyFace(sim,face);ap.exposed={};for(const id of pinned)if(s.people[id].awareness)delete s.people[id].awareness.identifiedSerial;world.keys.clear();world.auto=null;world.clearReady();world.quietUntil=0;world.syncEvent();save();
 }
 const actions=[['锦衣客 → 顾钦差',()=>fixture('traveler','inspector')],['锦衣客 → 符祥',()=>fixture('traveler','fu')],['顾钦差 → 锦衣客',()=>fixture('inspector','traveler')],['顾钦差 → 符祥',()=>fixture('inspector','fu')],['符祥 → 顾钦差',()=>fixture('fu','inspector')],['宋青禾 → 宋茶娘',()=>fixture('qinghe','tea_host')],['与当前人物对话',()=>world.onGateTalk(target)],['掷骰取 100',()=>getSim().rng=()=>.999],['真青禾来到跟前',()=>{pinned.add('qinghe');const q=world.npcs.get(target).actor.position;place('qinghe',q.x+1,q.z+1);getSim().s.people.qinghe.muteUntil=1e9;}],['到公物箱旁',()=>{world.dialogue.finish(true);const s=getSim().s;Object.assign(s.player,{x:12.2,z:-22.7});world.hero.position.set(12.2,0,-22.7);world.yaw=0;world.pitch=.65;world.distance=4;environment.openObject(COURT_CHEST);save();}],['收起验收',()=>el.open=false]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 setInterval(()=>{const s=getSim().s;if(pinned.size){s.time=35;for(const id of pinned)s.people[id].life={activity:'idle'};}
  const visible=[...document.querySelectorAll('body *')].filter(e=>!e.closest('#identity-qa')&&e.getClientRects().length&&e.textContent.trim()&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
  const small=visible.filter(e=>parseFloat(getComputedStyle(e).fontSize)<14),bad=visible.filter(e=>/Segoe|Microsoft YaHei|微软雅黑|Georgia|sans-serif/i.test(getComputedStyle(e).fontFamily));
  el.querySelector('output').textContent=`面貌 ${currentFace(s)} / 王爷已知 ${!!s.facts.princeRoyal}\n包裹 ${s.ecosystem.objects[WARDROBE_CHEST]?.removed?'已交出':'场上'} / 余 ${environment.eco.items('object:'+WARDROBE_CHEST).length} / 入袋 ${environment.eco.items('player').filter(i=>i.sourceContainer===WARDROBE_CHEST).length} / ${s.travelBundleGift?.phase||'-'}\n盘缠 ${s.player.money} / 收付记录 ${Object.keys(s.identityAccounts?.receipts||{}).length}\n公物 ${environment.eco.items('object:'+COURT_CHEST).length} / ${innerWidth}×${innerHeight}\n小字 ${small.length} / 禁用字体 ${bad.length} / 错误 ${errors.length}${errors.length?'\n'+errors.join('\n'):''}`;
 },400);
}
