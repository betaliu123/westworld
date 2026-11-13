import * as T from '../vendor/three.module.js';
import {factionRep} from '../src/reputation.js';
import {QINGHE_RIVERSIDE} from '../src/locations.js';
import {contactOptions,contactPreview} from '../src/gate-society.js';
import {TRAVEL_BUNDLE} from '../src/home-chest.js';
export function mountQingheJourneyHarness({getSim,world,environment,dialogue,save}){
 function arrange(known=false){
  const sim=getSim(),s=sim.s;dialogue.finish(true);environment.close();world.keys.clear();world.auto=null;world.clearReady();s.chapter.opened=true;s.time=35;s.wanted=0;
  if(known){s.facts.fuWaitingKnown=true;s.chapter.done.fu_waiting=true;}
  Object.assign(s.player,{x:-18,z:36,hp:100,energy:100,crouched:false,stealing:false});world.hero.position.set(-18,0,36);world.hero.rotation.y=Math.PI;
  const q=world.npcs.get('qinghe');q.actor.position.set(QINGHE_RIVERSIDE.x,0,QINGHE_RIVERSIDE.z);Object.assign(s.people.qinghe,QINGHE_RIVERSIDE,{life:{activity:'riverside',target:QINGHE_RIVERSIDE}});
  environment.eco.positions.qinghe={...QINGHE_RIVERSIDE};
  world.yaw=.2;world.pitch=.4;world.distance=6;
  for(const [id,n]of world.npcs){n.nextAmbient=world.t+1e5;environment.eco.s.hunger[id]=0;s.people[id].energy=100;}
  world.nextAmbient=world.t+1e5;save();
 }
 function walk(x,z,r=.8){return world.routeTo([x,z],r);}
 function snapshot(){const s=getSim().s;return {
  journey:s.qingheJourney,facts:s.facts,rep:factionRep(s,'yingfeng'),quests:s.quests,convoy:s.convoy,
  player:{x:s.player.x,z:s.player.z,energy:s.player.energy},auto:world.auto?.length||0,locked:world.locked,cinematic:world.cinematic,performance:!!world.performance,
  people:Object.fromEntries(['qinghe','tea_host','fu','porter','gate_guard'].map(id=>{const n=s.people[id],q=world.npcs.get(id);return [id,{x:q.actor.position.x,z:q.actor.position.z,hp:n.hp,life:n.life,restraint:n.restraint,awareness:n.awareness,relation:n.relation,ground:q.groundWeight,route:q.qinghePath}];})),
  bundle:{...environment.eco.s.objects[TRAVEL_BUNDLE.id],visual:world.travelBundle?.g.visible,position:world.travelBundle?.g.position},
  options:contactOptions(getSim(),'fu').map(a=>({id:a.id,preview:contactPreview(getSim(),'fu',a,environment.eco)})),saveKeys:Object.keys(localStorage)
 };}
 window.__qingheJourneyQA={arrange,walk,snapshot,save,talk:id=>world.onGateTalk(id),aimPoint:()=>{const n=world.npcs.get('qinghe');const head=n.actor.getObjectByName('mixamorigHead')||n.actor.getObjectByName('Head');const at=head?head.getWorldPosition(new T.Vector3()):n.model.handPoint(1);return world.screenPoint(at);},camera:(yaw,pitch,distance)=>{Object.assign(world,{yaw,pitch,distance});}};
}
