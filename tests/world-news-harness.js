import {inspectConvoyCargo,convoyState} from '../src/convoy.js';
import {syncWorldNews} from '../src/world-news.js';

// Localhost only, saveKey supplies an independent playtest save.
export function mountWorldNewsHarness({getSim,world,environment,save}){
 const ui=document.createElement('details');ui.id='world-news-qa';ui.open=true;
 ui.style.cssText='position:fixed;right:12px;top:12px;z-index:1600;background:var(--paper);padding:8px;font:16px var(--font-body);max-width:250px';
 ui.innerHTML='<summary>大事议论验收</summary><button>失窃消息到茶棚</button>';document.body.append(ui);
 const traces=[],original=world.onWorldNewsSpeech;
 world.onWorldNewsSpeech=line=>{const accepted=original(line);if(accepted)traces.push({id:line.id,text:line.text,event:line.worldNews});return accepted;};
 const steer=world.ecology.steer,pinned=new Set(['porter','old_constable','traveler','tea_host']);
 world.ecology.steer=(id,dt)=>pinned.has(id)?true:steer(id,dt);
 const move=world.move;world.move=function(actor,...args){if([...pinned].some(id=>world.npcs.get(id)?.actor===actor))return;return move.call(this,actor,...args);};
 function place(id,x,z){const s=getSim().s,n=s.people[id],actor=world.npcs.get(id).actor;Object.assign(n,{x,z,hp:100,life:{activity:'idle'},sickUntil:0,stunnedUntil:0,muteUntil:0,restraint:null,inCustody:false,awareness:null});actor.position.set(x,0,z);actor.rotation.y=0;environment.eco.positions[id]={x,z};}
 function arrange(){
  const sim=getSim(),s=sim.s,eco=environment.eco;world.dialogue.finish(true);world.checkReveal.cancel();
  s.day=1;s.time=50;s.chapter.opened=true;s.complaint=null;s.worldNews=null;s.investigations={seq:0,cases:[],bodySeen:{}};s.convoy=null;
  s.deck.actions??={};s.deck.actions.active=null;s.deck.actions.nextAt=1e9;s.player.face=null;s.wanted=0;
  s.player.hp=100;s.player.satiety=90;s.player.rested=90;world.quietUntil=0;world.nextAmbient=0;
  const c=convoyState(s);c.stocked=true;c.cargo=eco.s.items.filter(i=>i.convoyCargo).map(i=>i.id);
  for(const i of eco.s.items.filter(i=>i.convoyCargo))i.location='object:flowerstone-cart';
  const item=eco.s.items.find(i=>i.convoyCargo);eco.transfer(item,'player','stolen',[]);
  place('porter',c.x,c.z+1);inspectConvoyCargo(sim,eco,eco.positions);syncWorldNews(s);
  place('porter',-8,31.6);place('old_constable',-8,30);place('traveler',-5,30);place('tea_host',-11.9,27);
  Object.assign(s.player,{x:-7.3,z:33,crouched:false,stealing:false});world.hero.position.set(-7.3,0,33);world.yaw=0;world.pitch=.3;world.distance=7;world.keys.clear();world.auto=null;
  ui.open=false;save();
 }
 ui.querySelector('button').onclick=arrange;
 globalThis.__worldNewsQA={arrange,save,traces,snapshot:()=>({news:structuredClone(getSim().s.worldNews),money:getSim().s.player.money,wanted:getSim().s.wanted,relations:Object.values(getSim().s.people).map(n=>n.relation),traces:[...traces],debug:{time:getSim().s.time,t:world.t,locked:world.locked,performance:!!world.performance,cinematic:world.cinematic,nextAmbient:world.nextAmbient,identity:!!getSim().s.identityConsequences?.active,action:getSim().s.deck?.actions?.active,complaint:!!getSim().s.complaint,porter:structuredClone(getSim().s.people.porter),screen:world.screenPoint(world.npcs.get('porter').actor.position)}}),expire:()=>{getSim().s.day+=3;save();},replay:()=>{const s=getSim().s;s.worldNews.nextSpeech=0;for(const event of Object.values(s.worldNews.events))event.spoken={};world.nextAmbient=0;world.quietUntil=0;}};
}
