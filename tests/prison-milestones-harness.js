import {detainByOfficer} from '../src/gate-scene.js';
import {PRISON,PRISON_BEDS} from '../src/locations.js';
import {careerResolve} from '../src/faction-career.js';
import {chapterResolve} from '../src/chapter.js';
import {investigationDanger} from '../src/audio-danger.js';
import {acceptCrimeReport} from '../src/crime-investigation.js';

// Local-only, independent-save fixtures. Input, bed movement, sentence settlement,
// milestone presentation and audio continue through the production controllers.
export function mountPrisonMilestonesHarness({getSim,world,environment,dialogue,save,audio}){
 const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 world.ecology.steer=()=>true;
 function player(x,z){Object.assign(getSim().s.player,{x,z});world.hero.position.set(x,0,z);world.heroVel.set(0,0,0);world.keys.clear();world.auto=null;world.yaw=0;world.pitch=.78;world.distance=4.5;}
 function prepare(){const s=getSim().s;dialogue.finish(true);environment.close();document.getElementById('panel').hidden=true;document.getElementById('drawer').hidden=true;world.performance=null;world.cinematic=null;world.clearReady();s.chapter.opened=true;s.event=null;s.wanted=0;s.complaint=null;s.time=40;s.deck.actions={nextAt:(s.npcClock||0)+9999};s.deck.cards=[];s.deck.echoes=[];s.investigations={seq:0,cases:[],bodySeen:{}};
  for(const [id,n]of world.npcs){Object.assign(s.people[id],{awareness:null,life:{activity:'idle'},hp:100,stunnedUntil:0,muteUntil:0,restraint:null,inCustody:false,fear:0});if(id!=='prisoner'){n.actor.position.set(-40,0,-40);n.actor.visible=false;}}
  Object.assign(s.player,{hp:100,energy:100,bedRest:null,crouched:false,stealing:false,face:null});
 }
 function arrest(){prepare();const sim=getSim();detainByOfficer(sim,'gate_guard',null,{handledPresentation:true});player(PRISON.spawn.x,PRISON.spawn.z);world.syncEvent();const n=world.npcs.get('prisoner');Object.assign(sim.s.people.prisoner,{hp:1,x:21,z:-23});n.actor.position.set(21,0,-23);n.actor.visible=true;world.hero.rotation.y=-Math.PI*.75;save();}
 const bed=PRISON_BEDS[1];
 function nearBed(){player(bed.xTarget-1.05,bed.zTarget+.35);world.clearReady();}
 function point(id){const a=world.environmentAssets.find(a=>a.id===id),p=a?a.group.position.clone():world.npcs.get(id)?.actor.position.clone();if(!p)return null;if(a)a.group.getWorldPosition(p);p.y+=a?.3:1.4;return world.screenPoint(p);}
 function snapshot(){const s=getSim().s;return {day:s.day,phase:s.event?.gate?.phase,bed:s.player.bedRest,hp:s.player.hp,prisoner:s.people.prisoner.hp,player:{x:s.player.x,z:s.player.z},inv:s.player.inventory,facts:s.facts,milestones:s.storyMilestones,locked:world.locked,ready:world.combatReady,pose:world.hero.userData.bedPose,audio:{mix:audio.mix,loops:[...audio.loops.keys()],loaded:audio.buffers.size,danger:investigationDanger(s,world.hero.position),shots:audio.shots.size},bedObject:environment.eco.s.objects[bed.id],errors};}
 window.__prisonMilestonesQA={arrest,nearBed,point,snapshot,save,
  court(){const sim=getSim();sim.s.facts.constableReferral=true;return careerResolve(sim,environment.eco,'inspector','court_join');},
  prince(){const sim=getSim();sim.s.facts.enteredCity=true;sim.s.chapter.done.royal_task_offer=true;return chapterResolve(sim,environment.eco,'traveler','ch_royal_task');},
  openBed(){environment.openObject(bed.id);},
  danger(x=0){const sim=getSim(),s=sim.s;player(x,12);s.wanted=1;s.investigations={seq:0,cases:[],bodySeen:{}};const c=acceptCrimeReport(sim,{reporter:'merchant',officer:'guard',place:{x:0,z:12},type:'body'});Object.assign(c,{playerNoticed:true,state:'search',searchAt:s.npcClock||0,nextAsk:(s.npcClock||0)+300,expires:(s.npcClock||0)+300});},
  move(x,z){player(x,z);},sound(){audio.setEnabled(true);audio.unlock();},mute(){audio.setEnabled(false);},recognition(){return !!audio.play('recognition',world.hero.position);}
 };
}
