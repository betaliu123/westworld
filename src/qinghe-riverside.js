import * as T from '../vendor/three.module.js';
import {QINGHE_RIVERSIDE,QINGHE_ROCK} from './locations.js';
import {paintedSurface} from './ink-landscape.js';
import {qingheCrying} from './qinghe-cry.js';

export function qingheAtRiver(s,q){
 const n=s.people.qinghe;
 return s.chapterVersion===2&&n?.life?.activity==='riverside'&&!!q&&Math.hypot(q.x-QINGHE_RIVERSIDE.x,q.z-QINGHE_RIVERSIDE.z)<.6;
}
export function qingheRiverPose(world){
 const s=world.sim.s,n=world.npcs.get('qinghe'),state=s.people.qinghe;
 if(!n||!qingheAtRiver(s,n.actor.position)||state.hp<=(state.maxHp||100)*.3||state.restraint||state.inCustody||state.drowning||state.stunnedUntil>(s.npcClock||0)||state.sickUntil>(s.ecosystem?.time||0)||state.eatingUntil>(s.ecosystem?.time||0)||state.drinkingUntil>(s.ecosystem?.time||0)||state.awareness?.caseOpen||state.awareness&&!['idle','return'].includes(state.awareness.state)||world.cinematic||world.performance||world.itemExchange?.targetId==='qinghe'||world.trainingActor==='qinghe'||world.speaking==='qinghe'||n.chasing||n.fleeing||(n.detailSpeed||0)>.12)return null;
 return {kind:qingheCrying(s,n.actor.position)?'cry':(s.npcClock||0)%26<7?'waterPlay':'pensive'};
}
export function buildQingheRiverside(world){
 const r=QINGHE_ROCK,group=new T.Group();group.position.set(r.x,0,r.z);world.scene.add(group);
 const rock=new T.Mesh(new T.DodecahedronGeometry(1,0),paintedSurface('limestone'));
 rock.position.y=.85;rock.scale.set(r.w*.62,1.65,r.d*.57);rock.castShadow=rock.receiveShadow=true;group.add(rock);
 world.registerObject(group,r.id,'溪畔卧石','stone',1800,{x:r.x,z:r.z,w:r.w,d:r.d,y:1.1});world.obstacles.push({...r});
 const ripples=new T.Group();ripples.position.set(QINGHE_RIVERSIDE.x-.58,-.065,QINGHE_RIVERSIDE.z);world.scene.add(ripples);
 for(let i=0;i<2;i++){const material=world.water.material.clone();material.transparent=true;material.depthWrite=false;material.opacity=.25;const ring=new T.Mesh(new T.RingGeometry(.18,.205,32),material);ring.rotation.x=-Math.PI/2;ring.position.y=i*.002;ripples.add(ring);}
 ripples.visible=false;world.qingheRipples=ripples;
}
export function updateQingheRipples(world,pose){
 const ripples=world.qingheRipples;if(!ripples)return;
 const n=world.npcs.get('qinghe'),hand=n?.model?.handPoint?.(1);
 ripples.visible=pose?.kind==='waterPlay'&&!!n?.actor.userData.groundPose&&!!hand&&hand.y<.2&&hand.x< -18.5;
 if(!ripples.visible)return;
 ripples.position.set(hand.x,-.065,hand.z);
 ripples.children.forEach((ring,i)=>{const age=((world.sim.s.npcClock||0)*.65+i*.5)%1;ring.scale.setScalar(.6+age*2.2);ring.material.opacity=(1-age)*.3;});
}
