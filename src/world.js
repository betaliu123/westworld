import {qingheJourneyFrame,qingheJourneyMotion} from './qinghe-journey.js';
import {bountyOfficerMotion} from './bounty-world.js';
import {publicWantedNotices} from './wanted-records.js';
import {beginPlayerCapture,captureFrame,captureMotion,captureCamera,captureHeroPose,captureOfficerPose} from './player-capture.js';
import {objectPresent} from './materials.js';
import {obstaclesNear} from './obstacle-grid.js';
import {bundleGiftFrame,bundleGiftMotion} from './travel-bundle-gift.js';
import {identityConsequenceFrame,identityConsequenceMotion} from './identity-consequences.js';
import {npcName} from './npc-names.js';
import {propertyStopMotion} from './property-motion.js';
import {observeConcerns,concernMotion} from './npc-concerns.js';
import {escortReactionFrame,escortReactionMotion} from './restraint-witnesses.js';
import {convoyAftermathFrame,convoyAftermathMotion} from './convoy-aftermath.js';
import {recordCrimeScene} from './crime-investigation.js';
import {investigationMotion,investigationFrame} from './investigation-world.js';
import {restraintMotion,restraintBeat,drawLassos} from './lasso-world.js';
import {ropeAllowsMove} from './npc-restraints.js';
import {actionCardFrame,actionCardMotion} from './action-cards-view.js';
import {defend} from './martial.js';
import {CART} from './convoy.js';
import {convoyPointCollision,convoyPenetration} from './convoy-scene.js';
import {lessonCamera} from './lesson-camera.js';
import {npcBedPose,moveToBed,playerBedPose} from './bed-pose.js';
import {atStool,npcGroundSeat} from './ground-seat.js';
import {bunMesh,placeStallBuns} from './food-model.js';
import {registerLantern,furnishHouse,updateHomes} from './night-scene.js';
import {isSleeping,wakeForIncident,roomAt,nightTime,HOMES} from './night-life.js';
import {skill} from './skills.js';
import {damageSound} from './world-audio.js';
import {inkPost,inkEnabled} from './ink-post.js';
import {renderQuality,qualityMode} from './render-quality.js';
import {mountAppearanceModel} from './appearance-model.js';
import {mountHeroModel} from './hero-model.js';
import {HeroCombat,SWING_COST,DODGE,dodgeTravel,LUNGE,IMPACT,ImpactFeel} from './hero-combat.js';
import {ViewPress} from './view-drag.js';
import {InkFx,bladeEnds} from './ink-fx.js';
import {mountVitality} from './npc-vitality.js';
import {stepNpcCombat,npcArmed} from './npc-combat.js';
import {followOrbit,clearDialogueCamera} from './orbit-camera.js';
import {landscape,paintedSurface,pine,gateRoof,roadVerge,wantedSheet,gateBanners,windAtGate} from './ink-landscape.js';
import {ambientLine} from './ambient-lines.js';
import {nearbyWorldNews} from './world-news.js';
import {officials,startComplaint,receiveReport} from './complaints.js';
import {abandonSurrender} from './complaints.js';
import {conflictCapable} from './combat-conflict.js';
import {surrenderFrame,surrenderMotion} from './surrender.js';
import {pendingFactionReport,deliverFactionReport} from './faction-discipline.js';
import {response,markEncounter,persona} from './npc-persona.js';
import {encounterStep,encounterFor} from './npc-territory.js';
import {routinePath as encounterPath} from './npc-navigation.js';
import {arrestWitness} from './court-street.js';
import {dressActor,outfit} from './impersonation.js';
import {canJump,seesDraw,bodyFeedback,pressureReaction} from './body-feedback.js';
import {PRINCE_LIFE_LINES} from './prince-voice.js';
import {PRISON,jailed} from './locations.js';
import {buildLocationScenery} from './location-scenery.js';
import {nearestWalkable} from './npc-navigation.js';
import {recoverNpc} from './npc-recovery.js';
import {TEA_CUPS,TEAPOT} from './tea-service.js';
import {ALERT_EMOJI,LIFE_LINES,lifeCue,FeedbackBudget} from './npc-feedback.js';
import {visibleBetween,theftVisibleBetween,perceiveIncident,witnessEvent,advanceAwareness} from './npc-awareness.js';
import {theftObserver} from './theft-sight.js';
import {inDeepWater,environmentStep} from './world-rules.js';
import {enterBrokenGate,enterRiver} from './gate-scene.js';
import {shotPlan} from './dialogue.js';
import {SceneDetails} from './scene-details.js';
import * as T from '../vendor/three.module.js';
import {PEOPLE,SCENES} from './data.js';
import {fitSword,mountActorModel,npcLook} from './actor-model.js';
import {fitProp} from './prop-model.js';
import {motionFor,turnToward,heroTurn} from './interaction.js';
import {npcArriveStep as arriveStep,npcTravelStep} from './npc-locomotion.js';
// The southern verge shares the 100-unit ground plane; leave only body clearance
// at its edge, rather than cutting off the road and the convoy at z=34.
const SOUTH_WALK_LIMIT=50-.3;
// Length of the NPC startle clip; they neither travel nor turn away before it has played.
const STARTLE_HOLD=.7;
// The cart collides by its own outline rather than its box, so it is checked wherever the query lands.
const cartObstacle=o=>o.id===CART;
const matCache=new Map();const material=(color)=>{if(!matCache.has(color))matCache.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return matCache.get(color);};
const finishes={0xd0bda0:"limewall",0x909a89:"limestone",0x604b3c:"timber",0x493b32:"timber",0x4c6062:"slate",0x76503d:"timber",0x685447:"timber"};
function mesh(g,c,parent,x=0,y=0,z=0){const m=new T.Mesh(g,finishes[c]?paintedSurface(finishes[c]):material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,w,h,d,c,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);
const cyl=(p,r1,r2,h,c,x=0,y=0,z=0,n=8)=>mesh(new T.CylinderGeometry(r1,r2,h,n),c,p,x,y,z);
// Floating labels are ink on a paper halo; legacy light tints map to their ink-palette meaning.
const INK_TINT={'#eee3be':'#15140f','#e7ce97':'#2c2a24','#afe8ae':'#4f7a4c','#d7edb0':'#4f7a4c','#b9e6ad':'#4f7a4c','#ffa68b':'#a63a2b','#d3c3b7':'#4f4b42','#f3d27e':'#9c6d3c','#f2cb80':'#9c6d3c','#94dcff':'#3d6470'};
// Signs are gilded characters carved on dark boards, set in the title face.
export function textSprite(text,color='#eee3be',size=36,kind='float'){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d'),sign=kind==='sign';
 const font=sign?`${Math.round(size*1.25)}px "Jianghu Title",KaiTi,serif`:`500 ${size}px "Jianghu Body",KaiTi,serif`;
 const draw=()=>{ctx.clearRect(0,0,512,96);ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
  if(sign){ctx.shadowColor='#15140f';ctx.shadowBlur=6;ctx.fillStyle='#ead6a4';ctx.fillText(text,256,50);return;}
  ctx.lineJoin='round';ctx.strokeStyle='#ece3cfd9';ctx.lineWidth=size*(kind==='feedback'?.18:.28);ctx.shadowColor='#ece3cf';ctx.shadowBlur=kind==='feedback'?2:10;ctx.strokeText(text,256,50);ctx.shadowBlur=0;ctx.fillStyle=INK_TINT[color.toLowerCase()]||color;ctx.fillText(text,256,50);};
 draw();const texture=new T.CanvasTexture(c);
 if(globalThis.document?.fonts&&!document.fonts.check(font,text))document.fonts.load(font,text).then(()=>{draw();texture.needsUpdate=true;}).catch(()=>{});
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(3.8,.71,1);return sprite;}
function awarenessSprite(glyph){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.font='76px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,64,66);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthTest:true,depthWrite:false,toneMapped:false}));sprite.renderOrder=20;return sprite;}
export function character(color,hero=false,female=false,variant=null){
 // Invisible choreography pivots only. Character surfaces come exclusively from the GLB skins.
 const root=new T.Group(),rig=new T.Group();root.add(rig);rig.visible=false;
 const arms=[],legs=[];
 for(const sign of [-1,1]){const arm=new T.Group();arm.position.set(sign*.39,1.53,0);rig.add(arm);arms.push(arm);const leg=new T.Group();leg.position.set(sign*.16,.5,0);rig.add(leg);legs.push(leg);}
 const head=new T.Group();head.position.y=1.7;rig.add(head);
 const sword=new T.Group();arms[1].add(sword);sword.position.y=-.52;sword.visible=hero;const swordLoaded=fitSword(sword);
 root.userData={rig,arms,legs,sword,swordLoaded,head,isHero:hero,phase:Math.random()*6};
 if(variant==='prince'){
  const ink=0x284e58,gold=0xc6ae73,ivory=0xe4ddc7;
  const fan=new T.Group();arms[0].add(fan);fan.position.set(0,-.54,.05);fan.rotation.z=-.18;
  for(let i=0;i<5;i++){const rib=box(fan,.018,.43,.025,i%2?ivory:gold,(i-2)*.016,-.16,0);rib.rotation.z=(i-2)*.025;}
  const jade=new T.Group();rig.add(jade);jade.position.set(.23,.91,.34);box(jade,.015,.17,.02,gold,0,.08,0);const ring=mesh(new T.TorusGeometry(.067,.021,5,12),0xb8d3c1,jade,0,-.04,0);for(const x of [-.02,0,.02])box(jade,.009,.13,.013,ink,x,-.16,0);
  root.userData.princeGear={fan,jade};
 }
 return root;
}
export class World{
 constructor(canvas,sim){
 this.sim=sim;this.canvas=canvas;this.scene=new T.Scene();this.scene.background=new T.Color(0xadc5c3);this.scene.fog=new T.FogExp2(0xadc5c3,.014);this.renderer=new T.WebGLRenderer({canvas,antialias:!inkEnabled()});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
 this.camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);this.ink=inkPost(this.renderer,this.scene,this.camera);this.daylight=1;this.yaw=0;this.pitch=.24;this.distance=6.8;this.t=0;this.gatePlaced=!!sim.s.watch;this.keys=new Set();this.obstacles=[];this.environmentAssets=[];this.npcs=new Map();this.props=[];this.particles=[];this.auto=null;this.locked=false;this.attackTime=0;this.readyUntil=0;this.jumpV=0;this.ground=0;this.heroVel=new T.Vector3();this.heroTurnRate=0;this.heroCombat=new HeroCombat();
 this.skyLight=new T.HemisphereLight(0xdaedf0,0x626348,2);this.scene.add(this.skyLight);const sun=new T.DirectionalLight(0xffe3b0,3.2);this.sun=sun;sun.position.set(-20,32,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:100});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;this.scene.add(sun);this.quality=renderQuality(qualityMode(globalThis.location?.search));
 this.horizon=landscape(this.scene);this.build();this.hero=character(0x385953,true);this.hero.rotation.y=Math.PI;this.hero.position.set(sim.s.player.x,0,sim.s.player.z);this.scene.add(this.hero);this.heroModel=mountHeroModel(this.hero,new URL('./models/hero.glb',import.meta.url).href);this.appearanceModel=mountAppearanceModel(this.heroModel,this.hero);
 this.feel=new ImpactFeel(!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);this.inkFx=new InkFx(this.scene,{wet:inDeepWater});this.vitality=mountVitality(this);this.jolt=new T.Vector3();this.fovKick=0;this.shoves=[];
 this.actionBowl=new T.Group();cyl(this.actionBowl,.14,.075,.12,0xd8d8bd);cyl(this.actionBowl,.12,.12,.02,0x8d6245,0,.06,0);this.hero.userData.arms[1].add(this.actionBowl);this.actionBowl.position.set(0,-.58,0);this.actionBowl.visible=false;
 this.actionFlute=box(this.hero.userData.rig,.64,.035,.035,0xb99c61,0,1.72,.3);this.actionFlute.visible=false;this.actionCoins=new T.Group();for(let i=0;i<3;i++)cyl(this.actionCoins,.045,.045,.018,0xe5bc60,i*.07,-.58,0);this.hero.userData.arms[0].add(this.actionCoins);this.actionCoins.visible=false;
 this.actionStool=new T.Group();box(this.actionStool,.7,.08,.55,0x806047,0,.5,0);for(const x of [-.25,.25])box(this.actionStool,.08,.5,.4,0x604c3b,x,.25,0);this.scene.add(this.actionStool);this.actionStool.visible=false;

 for(const person of PEOPLE){const actor=character(person.color,false,person.gender==='female',person.id==='traveler'?'prince':null);actor.position.set(sim.s.people[person.id]?.x??person.x,0,sim.s.people[person.id]?.z??person.z);if(person.id==='tea_host'){const q=nearestWalkable(actor.position,(x,z)=>this.collides(x,z,0,false));if(q){actor.position.x=q.x;actor.position.z=q.z;sim.s.people[person.id].x=q.x;sim.s.people[person.id].z=q.z;}}this.scene.add(actor);const labelName=npcName(sim.s,person.id),label=textSprite(labelName);label.position.y=2.7;actor.add(label);this.npcs.set(person.id,{actor,person,label,labelName,base:new T.Vector3(person.x,0,person.z),phase:Math.random()*10,model:mountActorModel(actor,npcLook(person.id))});}
 // Enter play only when every initial skin and weapon has finished loading.
 this.modelsReady=Promise.all([this.heroModel.loaded,...[...this.npcs.values()].map(n=>n.model.loaded),this.hero.userData.swordLoaded]).then(results=>results.at(-1)!==false&&this.heroModel.ready&&[...this.npcs.values()].every(n=>n.model.ready));
 this.eventGroup=new T.Group();this.scene.add(this.eventGroup);this.syncEvent();this.resize();window.addEventListener('resize',()=>this.resize());
 this.camera.position.copy(this.hero.position).add(new T.Vector3(0,1.45+this.distance*Math.sin(this.pitch),this.distance*Math.cos(this.pitch)));this.camera.lookAt(this.hero.position.clone().add(new T.Vector3(0,1.45,0)));
 canvas.addEventListener('contextmenu',e=>e.preventDefault());// Right-drag turns the view; so does a left-drag, because some browsers keep right-drags for their own gestures.
 // A left click acts on release. With the weapon drawn it strikes on press, and a drag that starts before contact takes the swing back.
 this.press=new ViewPress();
 canvas.addEventListener('pointerdown',e=>{if(e.button===2){if(this.performance)this.performance.camera=false;this.drag=true;canvas.setPointerCapture(e.pointerId);}else if(e.button===0){const armed=this.combatReady,before=this.heroCombat.swing;if(armed)this.primaryAction(e);
  // While the right button already turns the view, a left press is only ever a strike.
  if(!this.drag){this.press.down(e.clientX,e.clientY,armed);this.pressSwing=this.heroCombat.swing!==before?this.heroCombat.swing:null;canvas.setPointerCapture(e.pointerId);}}});
 canvas.addEventListener('pointerup',e=>{if(e.button===0){if(this.press.up())this.primaryAction(e);}else this.drag=false;});
 const release=()=>{this.drag=false;this.press.cancel();};canvas.addEventListener('pointercancel',release);window.addEventListener('blur',release);
 canvas.addEventListener('pointermove',e=>{const left=this.press.move(e.clientX,e.clientY);if(left.began){if(this.performance)this.performance.camera=false;this.takeBackSwing();}if(this.drag||left.turn){this.yaw-=e.movementX*(this.aimMode?.003:.006);this.pitch=Math.max(.045,Math.min(1.05,this.pitch+e.movementY*.004));}});canvas.addEventListener('wheel',e=>{e.preventDefault();if(this.performance)this.performance.camera=false;this.distance=Math.max(3.8,Math.min(18,this.distance+e.deltaY*.01));},{passive:false});
 window.addEventListener('blur',()=>{this.keys.clear();this.clearReady();});
 }
 showNpcCheck({id,label,success,observation=false,income=false,priority=false}){
 const n=this.npcs.get(id),state=this.sim.s.people[id];if(!n||!state||state.hp<=0||state.stunnedUntil>(this.sim.s.npcClock||0)||this.cinematic||n.actor.position.distanceTo(this.hero.position)>10||!visibleBetween(n.actor.position,this.hero.position,this.obstacles,this.sim.s.ecosystem?.objects)||(!income&&!priority&&this.t<(n.nextCheckFlash||0)))return;
 if(!n.checkFlash&&[...this.npcs.values()].filter(n=>n.checkFlash&&this.t-n.checkFlashStart<1.25).length>=2)return;
 if(n.checkFlash){n.actor.remove(n.checkFlash);n.checkFlash.material.map.dispose();n.checkFlash.material.dispose();}
 n.checkFlash=textSprite(observation?label:label+(success?' 成功':' 失败'),income?'#f3d27e':success?'#d7edb0':'#d3c3b7',32);n.checkFlash.scale.set(2.5,.47,1);n.checkFlash.position.y=3.12;n.actor.add(n.checkFlash);n.checkFlashStart=this.t;n.nextCheckFlash=this.t+4;
 }
 queueActorDeltas(rows){this.deltaQueue??=new Map();for(const r of rows)if(Number.isFinite(r.delta)&&r.delta){this.deltaSeq=(this.deltaSeq||0)+1;this.deltaQueue.set(this.deltaSeq,{...r});}}
 updateActorDeltas(){this.deltaSprites??=new Map();const quiet=!this.playing||this.locked||this.cinematic||this.performance;
 for(const [id,f] of this.deltaSprites){const n=this.npcs.get(id),visible=!quiet&&!n?.checkFlash?.visible&&!n?.alert?.visible&&this.speaking!==id;
 // Count visible time only: a dialogue, action or background tab cannot consume the notice.
 if(visible&&f.sprite.visible)f.age+=Math.min(.1,Math.max(0,this.t-f.tick));f.tick=this.t;
 const age=f.age;if(age>=1.65){f.actor.remove(f.sprite);f.sprite.material.map.dispose();f.sprite.material.dispose();this.deltaSprites.delete(id);continue;}
 f.sprite.visible=visible;f.sprite.position.y=(id==='player'?2.55:3.1)+(f.reducedMotion?0:age*.22);f.sprite.material.opacity=Math.min(1,age/.12,(1.65-age)/.55);
 // Keep the short caption readable when the camera zooms or the viewport shrinks.
 // viewHeight is the canvas height noted at resize; asking the canvas here would force a layout pass every frame.
 const viewHeight=this.viewHeight||this.canvas?.clientHeight;if(this.camera&&viewHeight){const h=18*96/30*2*Math.tan(this.camera.fov*Math.PI/360)*this.camera.position.distanceTo(f.actor.position)/viewHeight;f.sprite.scale.set(h*512/96,h,1);}}
 if(quiet||!this.deltaQueue?.size)return;
 for(const [key,r] of this.deltaQueue){const n=this.npcs.get(r.id),actor=r.id==='player'?this.hero:n?.actor;if(!actor||(r.id!=='player'&&(actor.position.distanceTo(this.hero.position)>10||!visibleBetween(actor.position,this.hero.position,this.obstacles,this.sim.s.ecosystem?.objects)))){this.deltaQueue.delete(key);continue;}
 if(this.deltaSprites.has(r.id)||n?.checkFlash?.visible||n?.alert?.visible||this.speaking===r.id)continue;
 if(this.deltaSprites.size+[...this.npcs.values()].filter(v=>v.checkFlash?.visible).length>=2)break;
 const sprite=textSprite(r.label+' '+(r.delta>0?'+':'')+r.delta,r.delta>0?'#2c2a24':'#a63a2b',30,'feedback');sprite.scale.set(3.8,.71,1);sprite.position.y=r.id==='player'?2.55:3.1;sprite.material.opacity=0;sprite.material.map.colorSpace=T.SRGBColorSpace;sprite.material.depthWrite=false;sprite.material.fog=false;sprite.renderOrder=21;actor.add(sprite);this.deltaSprites.set(r.id,{actor,sprite,row:r,age:0,tick:this.t,reducedMotion:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches});this.deltaQueue.delete(key);}
 }
 updateActivityCaption(){
 const s=this.sim.s,styles={patrol:['巡逻中','#94dcff'],relieve:['换岗中','#94dcff'],serve:['送茶中','#b9e6ad'],collect:['收款中','#f2cb80']};
 let pick=null,best=8;
 for(const [id,n] of this.npcs){if(n.activityCaption)n.activityCaption.visible=false;
 if(!this.playing||this.locked||this.cinematic||this.performance||this.speaking||!n.actor.visible||!n.label.visible||this.deltaSprites?.has(id)||n.checkFlash?.visible||n.alert?.visible||encounterFor(s,id)||s.complaint?.id===id)continue;
 const st=s.people[id],kind=st.life?.activity,d=n.actor.position.distanceTo(this.hero.position);
 if(st.hp<=0||st.inCustody||st.stunnedUntil>s.npcClock||st.sickUntil>s.ecosystem?.time||st.drowning||n.chasing||n.fleeing||(st.awareness&&!['idle','return'].includes(st.awareness.state))||!styles[kind]||d>=best)continue;
 if(!this.screenPoint(n.actor.position).visible||!visibleBetween(n.actor.position,this.hero.position,this.obstacles,s.ecosystem?.objects))continue;
 best=d;pick={n,kind};}
 if(!pick)return;const {n,kind}=pick;if(n.captionKind!==kind){if(n.activityCaption){n.actor.remove(n.activityCaption);n.activityCaption.material.map.dispose();n.activityCaption.material.dispose();}const [label,color]=styles[kind];n.activityCaption=textSprite(label,color,32);n.activityCaption.position.y=3.03;n.activityCaption.scale.set(3.1,.58,1);n.actor.add(n.activityCaption);n.captionKind=kind;}
 n.activityCaption.visible=true;
 }
 updateNpcChecks(){for(const n of this.npcs.values()){if(!n.checkFlash)continue;const age=this.t-n.checkFlashStart;if(age>=1.25){n.actor.remove(n.checkFlash);n.checkFlash.material.map.dispose();n.checkFlash.material.dispose();n.checkFlash=null;continue;}n.checkFlash.visible=!this.cinematic&&n.actor.position.distanceTo(this.hero.position)<10&&visibleBetween(n.actor.position,this.hero.position,this.obstacles,this.sim.s.ecosystem?.objects);n.checkFlash.position.y=3.12+age*.3;n.checkFlash.material.opacity=Math.min(1,age/.1,(1.25-age)/.4);if(n.checkFlash.visible&&n.alert)n.alert.visible=false;}}
 noticeIncident(event){if(event.selfDefense)return;
 event.witnesses=[];const replies=[];
 for(const [id,n]of this.npcs){const state=this.sim.s.people[id];if(!state||state.hp<=0||state.stunnedUntil>(this.sim.s.npcClock||0))continue;const pos=n.actor.position,d=Math.hypot(pos.x-event.x,pos.z-event.z);if(d>12)continue;
 const dx=event.x-pos.x,dz=event.z-pos.z,facing=(Math.sin(n.actor.rotation.y)*dx+Math.cos(n.actor.rotation.y)*dz)/Math.max(.01,d);
 const sightPoint=event.type==='theft'&&!event.caughtBy?this.sim.s.player:event;
 const clear=event.type==='theft'&&!event.caughtBy?theftVisibleBetween(pos,sightPoint,this.obstacles,this.sim.s.ecosystem?.objects):visibleBetween(pos,event,this.obstacles,this.sim.s.ecosystem?.objects),wasAsleep=isSleeping(state);if(!wakeForIncident(this.sim,id,event,pos,clear))continue;
 const sight=event.type==='theft'&&!event.caughtBy;
 const observation=sight?theftObserver(this.sim.s,id,{x:pos.x,z:pos.z,facing:n.actor.rotation.y,gazeOffset:n.actor.userData.head?.rotation.y||0,attention:n.theftAttention||0},sightPoint,clear):null;
 const perception=sight?(event.sightWitnesses?event.sightWitnesses.includes(id):observation.state==='watching')?'seen':event.feltBy===id?'felt':null:wasAsleep&&event.target!==id?'heard':perceiveIncident(event,id,d,facing,clear);if(!perception)continue;const seen=perception==='seen';
 if(event.type==='warrant'){if(seen){const text=arrestWitness(this.sim,id,n.base,event);if(text)replies.push({id,text});}continue;}
 if(perception==='felt'){witnessEvent(this.sim,id,event,false,n.base);continue;}
 if(!seen&&['tamper','theft'].includes(event.type))continue;
 const repeated=this.sim.s.people[id].awareness?.suspect==='player'&&(this.sim.s.npcClock||0)-(this.sim.s.people[id].awareness?.lastIncident||0)<20;
 if(seen){if(!repeated&&['tamper','theft'].includes(event.type))this.sim.emit('npcCheck',{id,label:event.type==='theft'?'察觉 · 偷窃':'察觉 · 动过吃喝',success:true,observation:true});event.witnesses.push(id);if(!repeated)replies.push({id,text:event.type==='tamper'?(event.owner===id?'你往里面放了什么？这些吃喝先别碰！':'等等，他刚往吃喝里放了东西！'):event.type==='theft'?response(this.sim.s,id,'theft'):event.type==='assault'?(event.method==='lasso'?(event.target===id?'放开绳子！你凭什么捆我？':'住手！别随便捆人！'):event.target===id?response(this.sim.s,id,'assault'):'住手！有人动刀了！'):'别砸了！快来人！'});}
 if(seen&&event.type==='tamper'&&event.itemId){const item=this.sim.s.ecosystem?.items.find(i=>i.id===event.itemId);if(item){item.knownPoisonBy??=[];if(!item.knownPoisonBy.includes(id))item.knownPoisonBy.push(id);}}
 if(seen&&['theft','assault'].includes(event.type))markEncounter(this.sim.s,id,event.type);
 if(seen&&id==='traveler'&&['theft','tamper','assault','damage'].includes(event.type)&&this.sim.s.chapterVersion===2)this.sim.s.facts.royalSawHarm=true;
 witnessEvent(this.sim,id,event,seen,n.base);
 if(this.sim.s.chapterVersion!==2&&seen&&event.type==='assault'&&event.target===id&&persona(id)[0]==='blade')state.awareness.state='fight';
 if(seen&&event.type==='assault'&&id===event.target)this.sim.s.people[id].awareness.severe=true;
 }const investigation=recordCrimeScene(this.sim,event);event.locallyHandled=startComplaint(this.sim,event);if(investigation&&event.cause)investigation.cause=event.cause;if(event.locallyHandled&&this.sim.s.complaint)this.sim.s.complaint.place={x:event.x,z:event.z};if(event.type==='warrant'){for(const r of replies.sort((a,b)=>Number(['chi','gang_boss'].includes(b.id))-Number(['chi','gang_boss'].includes(a.id))).slice(0,2))this.sim.emit('npcRoutine',r);return;}if(event.witnesses.length)this.sim.emit('actionWitnessed',{cause:event.cause,incidentType:event.type,method:event.method,target:this.sim.s.people[event.target]?event.target:event.owner||event.target,identities:event.identities,identitySerials:event.identitySerials,witnesses:event.witnesses,text:event.witnesses.map(id=>npcName(this.sim.s,id)).join('、')+'目击'+({tamper:'动过吃喝',theft:'伸手取物',assault:'攻击他人'}[event.type]||'破坏物件'),dialogue:replies.sort((a,b)=>Number(b.id===(event.owner||event.target))-Number(a.id===(event.owner||event.target))).slice(0,2)});this.sim.save();
 }
 complaintMotion(id,n,dt){const sim=this.sim,s=sim.s,c=s.complaint;if(!c||['conflict','surrender'].includes(c.phase))return false;if(s.chapterVersion===2&&c.type==='assault'&&['ask','approach'].includes(c.phase)&&!s.surrender){c.phase='conflict';return false;}const victim=s.people[c.id];if(!conflictCapable(s,c.id)||s.player.hp<=0){delete s.complaint;delete s.surrender;return false;}if(id!==c.id)return c.phase!=='report'&&(c.officers||[]).includes(id);
 const a=n.actor,pos=a.position;if(c.phase!=='report'){const p=this.hero.position;a.rotation.y=turnToward(a.rotation.y,Math.atan2(p.x-pos.x,p.z-pos.z),dt||0.016);}
 if(!dt||this.performance)return true;let other=null;
 if(c.phase==='pause'){if(s.npcClock<c.until){this.animateActor(a,0,dt,'');return true;}c.phase=s.chapterVersion===2&&c.type==='assault'?'conflict':'approach';c.since=s.npcClock;if(c.phase==='conflict')return false;}
 if(c.phase!=='report'&&s.npcClock-c.since>15){c.phase='report';c.since=s.npcClock;this.showNpcCheck({id,label:'去报官',observation:true,priority:true});}
 if(c.phase==='report'){other=officials.filter(k=>k!==id&&s.people[k]?.hp>0&&!s.people[k].inCustody&&!(s.people[k].stunnedUntil>s.npcClock)&&this.npcs.has(k)).map(k=>this.npcs.get(k)).sort((l,r)=>pos.distanceTo(l.actor.position)-pos.distanceTo(r.actor.position))[0];
 if(!other||s.npcClock-c.since>60){delete s.complaint;victim.awareness=null;victim.mood='afraid';this.showNpcCheck({id,label:'求援无果',observation:true,priority:true});return false;}}
 const goal=other?other.actor.position:this.hero.position,d=pos.distanceTo(goal),clear=visibleBetween(pos,goal,this.obstacles,s.ecosystem?.objects);
 if(d<(other?2.4:1.7)&&clear){a.rotation.y=Math.atan2(goal.x-pos.x,goal.z-pos.z);this.animateActor(a,0,dt,'talk');if(other){receiveReport(sim,c,other.person.id,other.base);}else{c.phase='ask';sim.emit('complaintAsk',c);}return true;}
 if(this.t>=(n.complaintRepath||0)){n.complaintRepath=this.t+.7;n.complaintPath=encounterPath(pos,goal,(x,z)=>this.collides(x,z,0,false),1.5);}
 const path=n.complaintPath||[];while(path.length&&Math.hypot(path[0].x-pos.x,path[0].z-pos.z)<.18)path.shift();const q=path[0]||(clear?goal:null);if(q){const dx=q.x-pos.x,dz=q.z-pos.z,len=Math.hypot(dx,dz)||1,step=Math.min(len,dt*(other?3.4:2.4));a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);this.move(a,dx/len*step,dz/len*step);}this.animateActor(a,q?1:0,dt,'');return true;
 }
 reportOrReactionMotion(id,n,dt){
 const phase=this.sim.s.people[id]?.awareness?.state;
 // Once the dispute has ended, a real report takes priority over returning home.
 // Danger reactions still run first; the report method independently checks both people.
 if((!phase||phase==='idle'||phase==='return')&&this.factionReportMotion(id,n,dt))return true;
 return this.reactNpc(id,n,dt)||propertyStopMotion(this,id,n,dt)||this.factionReportMotion(id,n,dt);
 }
 factionReportMotion(id,n,dt){
 const s=this.sim.s,r=pendingFactionReport(s,id),state=s.people[id];if(!r||!dt||this.performance||s.complaint?.id===id)return false;
 if(!state||state.hp<=0||state.stunnedUntil>s.npcClock||state.muteUntil>s.npcClock||state.inCustody||['sleep','doze'].includes(state.life?.activity)||['fight','warn','search','flee'].includes(state.awareness?.state))return false;
 const leader=this.npcs.get(r.leader),chief=s.people[r.leader];if(!leader||!chief||chief.hp<=0||chief.stunnedUntil>s.npcClock||chief.muteUntil>s.npcClock||['sleep','doze'].includes(chief.life?.activity)||chief.inCustody)return false;
 const p=n.actor.position,q=leader.actor.position,clear=visibleBetween(p,q,this.obstacles,s.ecosystem?.objects);
 if(Math.hypot(p.x-q.x,p.z-q.z)<=2.4&&clear){deliverFactionReport(this.sim,r.id,r.leader,Object.fromEntries([...this.npcs].map(([k,v])=>[k,v.actor.position])),this.obstacles);this.animateActor(n.actor,0,dt,'talk');return true;}
 if(!n.disciplinePath||this.t>=(n.disciplineRepath||0)){n.disciplineRepath=this.t+1;n.disciplinePath=encounterPath(p,q,(x,z)=>this.collides(x,z,0,false),1.8);}
 const path=n.disciplinePath;while(path.length&&Math.hypot(path[0].x-p.x,path[0].z-p.z)<.18)path.shift();const step=path[0]||(clear?q:null);
 if(step){const dx=step.x-p.x,dz=step.z-p.z,d=Math.hypot(dx,dz)||1,walk=Math.min(d,dt*2.4);n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(dx,dz),dt);this.move(n.actor,dx/d*walk,dz/d*walk);}
 this.animateActor(n.actor,step?1:0,dt,'');return true;
 }
 territoryMotion(id,n,dt){const s=this.sim.s,e=encounterFor(s,id);if(!e)return false;
 const a=n.actor,u=a.userData,other=this.npcs.get(e.host===id?e.guest:e.host)?.actor;if(!other)return false;
 const exit=e.phase==='withdraw',goal=exit?(id===e.guest?{x:e.x,z:e.z+6}:{x:e.x-2,z:e.z}):other.position,stop=exit?.35:1.45;
 let q=goal,d=Math.hypot(q.x-a.position.x,q.z-a.position.z),walking=d>stop&&e.phase!=='bout';
 if(walking){if(!n.territoryPath||this.t>(n.territoryRepath||0)||n.territoryPhase!==e.phase){n.territoryPhase=e.phase;n.territoryRepath=this.t+.65;n.territoryPath=encounterPath(a.position,goal,(x,z)=>this.collides(x,z,0,false),stop);}while(n.territoryPath.length&&Math.hypot(n.territoryPath[0].x-a.position.x,n.territoryPath[0].z-a.position.z)<.15)n.territoryPath.shift();q=n.territoryPath[0]||goal;}
 const dx=q.x-a.position.x,dz=q.z-a.position.z,len=Math.hypot(dx,dz);if(len>.01){a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);if(walking){const step=Math.min(len,2.8*dt);this.move(a,dx/len*step,dz/len*step);}}
 this.animateActor(a,walking?1:0,dt,'');u.sword.visible=e.phase==='bout';if(e.phase==='bout'){const beat=((s.npcClock-e.at)*2+(id===e.host?0:.5))*Math.PI*2;u.arms[1].rotation.x=-1.15-.9*Math.sin(beat);u.arms[0].rotation.x=-.8+.35*Math.sin(beat);u.rig.rotation.z=.095*Math.sin(beat);}else u.rig.rotation.z=0;return true;
 }
 reactNpc(id,n,dt){const s=this.sim.s,a=n.actor,p=this.hero.position,state=s.people[id];
 if(s.chapterVersion===2&&!conflictCapable(s,id))return false;
 if(state.stunnedUntil>(s.npcClock||0)){this.animateActor(a,0,dt,'');a.userData.arms[0].rotation.x=-.4;if(n.alert)n.alert.visible=false;return true;}
 const canSee=visibleBetween(a.position,p,this.obstacles,s.ecosystem?.objects);const r=advanceAwareness(this.sim,id,a.position,canSee,dt,this.combatReady);
 this.alertBudget??=new FeedbackBudget();
 const glyph=ALERT_EMOJI[r?.state],near=a.position.distanceTo(p)<10;
 const flash=this.alertBudget.change(id,glyph?r.state:null,this.t,!!glyph&&state.hp>0&&near&&canSee&&!this.locked,1.8,6,true);
 if(!r||state.hp<=0){if(n.alert)n.alert.visible=false;return false;}
 if(r.state==='flee'&&n.previousDangerState!=='flee'&&!(state.hp<a.userData.lastHp)&&this.t>=(n.drawCooldown||0)){a.userData.startledAt=this.t;a.userData.startledUntil=this.t+.55;n.drawCooldown=this.t+12;}
 n.previousDangerState=r.state;
 if(flash){
  for(const other of this.npcs.values())if(other.alert)other.alert.visible=false;
  if(n.alert){a.remove(n.alert);n.alert.material.map.dispose();n.alert.material.dispose();}
  n.alert=awarenessSprite(glyph);n.alert.position.y=3.05;n.alert.scale.set(.48,.48,1);a.add(n.alert);n.alertStarted=this.t;
  this.onSound?.(['fight','warn'].includes(r.state)?'alert':'notice',a.position);
 }
 if(n.alert){const age=this.t-(n.alertStarted??-10);n.alert.visible=this.alertBudget.visible(id,this.t)&&near&&canSee&&!this.locked;
 n.alert.material.opacity=Math.min(1,Math.max(0,(1.8-age)/.45));const scale=.48*(1+Math.max(0,1-age/.25)*.15);n.alert.scale.set(scale,scale,1);n.alert.position.y=3.05+Math.min(age,.3)*.2;}
 n.label.visible=false;
 let target=r.state==='return'?r.home:r.lastKnown;let speed=r.state==='fight'?2.6:1.6,stop=r.state==='fight'?1.3:r.state==='warn'?2.2:.3;
 if(r.state==='flee'){const threat=canSee?p:r.lastKnown,dx=a.position.x-threat.x,dz=a.position.z-threat.z,len=Math.hypot(dx,dz)||1;target={x:a.position.x+dx/len*5,z:a.position.z+dz/len*5};speed=3;}
 if(r.state==='notice'||n.combat?.swing||this.t<(n.recoilUntil||0)||this.t<(a.userData.startledAt??-10)+STARTLE_HOLD)speed=0;
 const remaining=Math.hypot(target.x-a.position.x,target.z-a.position.z);
 if(dt>0&&speed>0&&remaining>stop&&(!n.reactionPath||this.t>=(n.reactionRepath||0)||n.reactionState!==r.state)){
  n.reactionRepath=this.t+.65;n.reactionState=r.state;n.reactionPath=encounterPath(a.position,target,(x,z)=>this.collides(x,z,0,false),.5);
  // A search that found no route is the costly kind; outside a fight it is not repeated at the usual rate.
  if(!n.reactionPath.length&&r.state!=='fight')n.reactionRepath=this.t+2;
 }
 while(n.reactionPath?.length&&Math.hypot(n.reactionPath[0].x-a.position.x,n.reactionPath[0].z-a.position.z)<.18)n.reactionPath.shift();
 const next=n.reactionPath?.[0]||target,dx=next.x-a.position.x,dz=next.z-a.position.z,d=Math.hypot(dx,dz);
 if((!n.combat?.swing||n.combat.swing.age<.18)&&this.t>=(a.userData.startledAt??-10)+STARTLE_HOLD)a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);
 const step=remaining>stop?Math.min(d,arriveStep(remaining,speed,dt,stop)):0;if(d>.01)this.move(a,dx/d*step,dz/d*step);
 this.animateActor(a,step>0?1:0,dt,r.state==='warn'?'talk':'');a.userData.sword.visible=r.state==='fight'&&npcArmed(s,id);if(r.state==='warn')a.userData.arms[0].rotation.x=-1.3;
 return true;
 }
 lifeFeedback(id,n){if(id==='gate_merchant'){if(!n.cargo)n.cargo=box(n.actor,.55,.6,.45,0x8a6346,0,1.1,-.4);n.cargo.visible=this.sim.s.people[id].life?.activity==='escort'&&this.sim.s.ecosystem?.items.some(i=>i.type==='cargo'&&i.location==='npc:'+id);}
 const s=this.sim.s.people[id],a=n.actor,now=this.sim.s.ecosystem?.time||0;
 this.lifeBudget??=new FeedbackBudget();
 const state=lifeCue(s,now,this.sim.s.ecosystem?.hunger?.[id]||0);
 const active=s.hp>0&&!(s.stunnedUntil>(this.sim.s.npcClock||0))&&!this.locked&&!this.cinematic&&!this.performance&&a.position.distanceTo(this.hero.position)<8&&!s.awareness?.caseOpen&&visibleBetween(a.position,this.hero.position,this.obstacles,this.sim.s.ecosystem?.objects);
 if(this.lifeBudget.change(id,state,this.t,active,12,45))this.onLifeSpeech?.({id,text:(id==='traveler'?PRINCE_LIFE_LINES[state]:null)||LIFE_LINES[state]});
 if(active&&!s.life?.night&&!state&&this.playing&&!this.sim.s.complaint&&this.t>(this.nextAmbient??10)&&this.t>(n.nextAmbient||0)&&this.screenPoint(a.position).visible){
 const line=nearbyWorldNews(this.sim.s,key=>this.npcs.get(key)?.actor.position,this.obstacles)?null:ambientLine(id,s.life?.activity,n.ambientIndex||0,this.sim.s);
 if(line&&(s.life?.activity!=='riverside'||s.life.target&&Math.hypot(a.position.x-s.life.target.x,a.position.z-s.life.target.z)<.6)&&this.onLifeSpeech?.({id,text:line,ambient:true})){n.ambientIndex=(n.ambientIndex||0)+1;n.nextAmbient=this.t+80;this.nextAmbient=this.t+22;}
 }
 }

 // Render resolution and shadow detail follow the measured frame rate (render-quality.js). Only the drawing
 // buffers change: the canvas keeps its size on the page, so HUD placement and picking are unaffected.
 applyQuality(){
  const q=this.quality,base=Math.min(devicePixelRatio,1.6),ratio=Math.max(Math.min(base,.6),base*q.scale),size=q.lightShadows?1024:2048,shadow=this.sun.shadow;
  if(this.renderer.getPixelRatio()!==ratio)this.renderer.setPixelRatio(ratio);
  this.ink.setSize(innerWidth,innerHeight);
  if(shadow.mapSize.x!==size){shadow.mapSize.set(size,size);shadow.map?.dispose();shadow.map=null;}
  // With light shadows the map is redrawn every other frame (see update); redraw now so a new map is never read empty.
  this.renderer.shadowMap.autoUpdate=!q.lightShadows;this.renderer.shadowMap.needsUpdate=true;
 }
 resize(){this.viewHeight=innerHeight;this.renderer.setSize(innerWidth,innerHeight);this.applyQuality();this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 registerObject(group,id,name,material='wood',hp=100,extra={}){group.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(group),c=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const asset={id,kind:'prop',name,material,max:hp,x:c.x,z:c.z,w:size.x,d:size.z,y:c.y,group,...extra};this.environmentAssets=this.environmentAssets.filter(a=>a.id!==id);this.environmentAssets.push(asset);return asset;}
 lantern(p,x,y,z,light){const g=new T.Group();g.position.set(x,y,z);p.add(g);const shade=cyl(g,.2,.23,.38,0xece3cf);registerLantern(this,g,shade,light);cyl(g,.2,.2,.045,0x4f4b42,0,.22,0);cyl(g,.2,.2,.045,0x4f4b42,0,-.22,0);cyl(g,.018,.018,.23,0x9c6d3c,0,-.36,0);return g;}
 tree(x,z,blossom=false,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.scene.add(g);pine(g,x*.33+z);this.obstacles.push({id:`tree:${x}:${z}`,x,z,w:.6,d:.6});this.environmentAssets.push({id:`tree:${x}:${z}`,kind:'tree',name:blossom?'花树':'果树',fruit:!blossom,x,z,group:g});}
 house(x,z,w,d,name,roof=0x4c6062){const g=new T.Group();g.position.set(x,0,z);this.scene.add(g);const base=`house:${x}:${z}`,owner=HOMES.find(h=>h.name===name)?.residents[0]||'inn';
 const part=(id,title,material,hp,build,collision=false)=>{const p=new T.Group();g.add(p);build(p);const a=this.registerObject(p,base+':'+id,name+' · '+title,material,hp,{kind:id==='door'?'door':'building',owner});if(collision)this.obstacles.push({id:a.id,x:a.x,z:a.z,w:a.w,d:a.d});return p;};
 part('foundation','台基','stone',1800,p=>box(p,w+.5,.25,d+.5,0x929887,0,.13,0));
 part('back','后墙','stone',1200,p=>box(p,w,2.8,.25,0xd0bda0,0,1.6,-d/2),true);
 for(const side of [-1,1])part(side<0?'west':'east',side<0?'西墙':'东墙','stone',1200,p=>box(p,.25,2.8,d,0xd0bda0,side*w/2,1.6,0),true);
 for(const side of [-1,1])part('front'+side,side<0?'门左墙':'门右墙','stone',900,p=>{box(p,(w-1.5)/2,2.8,.25,0xd0bda0,side*(w+1.5)/4,1.6,d/2);},true);
 part('lintel','门楣','stone',650,p=>box(p,1.5,.65,.25,0xd0bda0,0,2.68,d/2));
 part('door','木门','wood',220,p=>{p.position.set(-.7,0,d/2+.04);box(p,1.4,2.1,.12,0x493b32,.7,1.2,0);box(p,.07,.25,.08,0xc0ae88,1.22,1.25,-.09);box(p,.07,.25,.08,0xc0ae88,1.22,1.25,.09);},true);
 part('frame','门框','wood',400,p=>{for(const xx of [-.79,.79])box(p,.13,2.5,.22,0x604b3c,xx,1.25,d/2+.03);box(p,1.7,.15,.22,0x604b3c,0,2.48,d/2+.03);});
 for(const xx of [-w*.32,w*.32])part('window'+xx,'木窗','wood',120,p=>{box(p,1.1,1.2,.1,0x625b48,xx,1.85,d/2+.19);for(let k=-2;k<=2;k++)box(p,.045,1.2,.13,0xc0ae88,xx+k*.2,1.85,d/2+.23);});
 for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])part('post'+xx+':'+zz,'梁柱','wood',400,p=>box(p,.18,3.2,.18,0x604b3c,xx,1.7,zz));
 part('roof','瓦顶','stone',1600,p=>{for(const sign of [-1,1]){const shape=new T.Shape();shape.moveTo(0,4.3);shape.lineTo(sign*(d/2+.8),3.05);shape.lineTo(sign*(d/2+1),3.18);shape.lineTo(sign*(d/2+.8),2.9);shape.lineTo(0,4.12);const geometry=new T.ExtrudeGeometry(shape,{depth:w+1.5,bevelEnabled:false,steps:1});const slope=mesh(geometry,roof,p,-(w+1.5)/2,0,0);slope.rotation.y=Math.PI/2;}
 for(let i=0;i<9;i++){const zz=(i-4)*(d+1.4)/8,yy=4.3-Math.abs(zz)*1.25/(d/2+.8);box(p,w+1.5,.055,.07,0x3e5557,0,yy+.03,zz);}box(p,w-1,.2,.22,0x384f50,0,4.3,0);});
 part('sign','招牌','wood',90,p=>{box(p,2,.45,.1,0x3b4b42,0,2.75,d/2+.2);const sign=textSprite(name,'#efd7a0',42,'sign');sign.position.set(0,2.78,d/2+.3);sign.scale.set(2.4,.45,1);p.add(sign);});
 for(const side of [-1,1])part('lantern'+side,'灯笼','paper',35,p=>this.lantern(p,side*1.55,2.6,d/2+.5));
 furnishHouse(this,g,base,box);
 }
 table(x,z,id,feast=false){const g=new T.Group();g.position.set(x,0,z);this.scene.add(g);box(g,1.8,.14,1,0x806047,0,.91,0);for(const xx of [-.65,.65])for(const zz of [-.32,.32])box(g,.1,.85,.1,0x604c3b,xx,.43,zz);if(feast)box(g,1.7,.025,.4,0xae5245,0,1,0);for(const xx of [-.5,0,.5]){cyl(g,.14,.1,.06,0xc5c9b4,xx,1.04,.12);cyl(g,.06,.05,.13,0xcccbb8,xx,1.08,-.22);}this.props.push({id,group:g,hp:2,x,z});this.registerObject(g,id,'木桌与杯盘','wood',80,{kind:'table',owner:id.startsWith('outer-tea-')?'tea_host':'inn'});return g;}
 build(){
 box(this.scene,100,.4,100,0x7e967b,0,-.3,0).material=paintedSurface("earth",22);box(this.scene,27,.12,45,0xb3b49b,0,-.06,0).material=paintedSurface("earth",12);box(this.scene,38,.13,5,0xbfc1aa,-4,-.025,12);
 const geo=new T.BoxGeometry(.88,.035,.63),paving=new T.InstancedMesh(geo,paintedSurface("limestone"),1050);const dummy=new T.Object3D();let i=0;for(let x=-11;x<=11;x++)for(let z=-19;z<=25;z++){dummy.position.set(x+(z%2)*.45,.015,z*.82);dummy.rotation.y=((x*17+z*3)%5)*.025;dummy.updateMatrix();paving.setMatrixAt(i++,dummy.matrix);}paving.count=i;paving.receiveShadow=true;this.scene.add(paving);
 roadVerge(this.scene);this.water=box(this.scene,7,.08,95,0x5f979b,-22,-.12,0);this.water.material=new T.MeshStandardMaterial({color:0x518b90,metalness:.45,roughness:.28,transparent:true,opacity:.87});
 for(const x of [-26,-18])for(let z=-27;z<=27;z+=6){const bank=box(this.scene,.7,.55,6,0x8e9989,x,.03,z);this.registerObject(bank,`bank:${x}:${z}`,'河岸石栏','stone',700);}
 const bridge=new T.Group();bridge.position.set(-22,.35,12);this.scene.add(bridge);box(bridge,9,.3,4.3,0xbac0ad);for(const z of [-1.9,1.9]){box(bridge,9,.15,.16,0x938b6f,0,.85,z);for(let x=-4;x<=4;x++)cyl(bridge,.11,.14,1.2,0xaaa58a,x,.45,z);}
 this.registerObject(bridge,'bridge','石桥与桥栏','stone',2400);
 const board=new T.Group();board.position.set(3.3,0,29.5);this.scene.add(board);box(board,2.3,1.35,.14,0x694731,0,1.65,0);for(const x of [-.92,.92])box(board,.15,2.55,.2,0x63432d,x,1.25,0);const poster=box(board,1.2,.82,.025,0xd7bf8f,0,1.57,.085);poster.material=wantedSheet(publicWantedNotices(this.sim.s));this.wantedPoster=poster;const notice=textSprite('通 缉 榜','#f8deaa',34,'sign');board.add(notice);notice.position.set(0,2.18,.11);this.registerObject(board,'wanted-board','城外通缉榜','wood',150,{kind:'noticeboard'});this.obstacles.push({id:'wanted-board',x:3.3,z:29.5,w:2.3,d:.18});
 const desk=new T.Group();desk.position.set(-11,0,7.5);this.scene.add(desk);box(desk,3.3,.12,.96,0x76503d,0,.96,0);for(const x of [-1.4,1.4])for(const z of [-.36,.36])box(desk,.12,.9,.12,0x604333,x,.46,z);this.registerObject(desk,'book-desk','墨香斋书案','wood',120,{kind:'table',owner:'bookseller'});this.obstacles.push({id:'book-desk',x:-11,z:7.5,w:3.3,d:.96});
 this.house(-11,-12,7,6,'听雨楼');this.house(12,-13,6,5,'回春堂');this.house(-12,3,5,5,'墨香斋');this.house(13,5,5,5,'云来客栈');this.house(-10,21,6,4,'临溪人家');this.house(11,21,6,4,'青竹会');this.house(0,-23,8,5,'镇公所');
 for(const [x,z,b,s]of [[-6.2,23.6,false,1.72],[-13,28,false,1.55],[15,27,false,1.65],[-6,-9,true,1.2],[7,-10,true,1.1],[-16,10,false,1.2],[8,10,true,1.1],[-14,-21,false,1.6],[17,-5,false,1.5],[18,17,true,1.4],[-17,22,true,1.2],[-31,3,false,1.6]])this.tree(x,z,b,s);
 
 for(const [x,z]of [[8,-5],[-7,8],[7,17],[-10,27]]){const g=new T.Group();g.position.set(x,0,z);this.scene.add(g);box(g,2.8,.18,1.5,0x917858,0,.9,0);for(const xx of [-1.3,1.3])box(g,.1,2.8,.1,0x5e5140,xx,1.4,0);const canopy=box(g,3.1,.13,2,0x9a6555,0,2.7,0);canopy.userData.canopy=true;const foods=[];for(let i=-2;i<=2;i++){const bun=bunMesh();bun.position.set(i*.35,1.1,0);g.add(bun);foods.push(bun);}fitProp(g,'stall.glb',{height:2.4,keep:o=>o.userData.foodModel==='bun',onFit:model=>placeStallBuns(model,foods)});this.environmentAssets.push({id:`stall:${x}:${z}`,kind:'stall',name:'食摊',owner:z===27?'tea_host':'inn',x,z,group:g,foods});this.obstacles.push({id:`stall:${x}:${z}`,x,z,w:2.8,d:1.5});}
 for(const x of [-5,5])for(const z of [-15,9,19]){const pole=new T.Group();pole.position.set(x,0,z);this.scene.add(pole);cyl(pole,.06,.08,3.4,0x675340,0,1.7,0);box(pole,.8,.07,.08,0x675340,.3,3.38,0);this.lantern(pole,.6,3.08,0);this.registerObject(pole,`lamp:${x}:${z}`,'街边灯柱','wood',100);}
 for(let j=0;j<14;j++){const x=(j%2?-1:1)*(15+(j%4)*1.5),z=-18+j*3;const rock=mesh(new T.DodecahedronGeometry(.35+(j%3)*.18),0x859082,this.scene,x,.2,z);this.registerObject(rock,'rock:'+j,'路边石块','stone',260);}
 this.petals=[];for(let i=0;i<28;i++){const leaf=mesh(new T.PlaneGeometry(.09,.16),0xe4b6a8,this.scene,7+Math.sin(i)*5,1+(i%7)*.5,7+Math.cos(i)*5);leaf.material.side=T.DoubleSide;this.petals.push(leaf);}
 for(const z of [27.2,30,32.6])for(const x of [-8,-5]){const stool=new T.Group();stool.position.set(x,0,z);box(stool,.65,.1,.65,0x816245,0,.45,0);for(const dx of [-.22,.22])box(stool,.1,.4,.5,0x5e4835,dx,.2,0);this.scene.add(stool);this.registerObject(stool,`tea-stool:${x}:${z}`,'茶棚木凳','wood',60,{owner:'tea_host'});}
 this.table(-6.5,27.2,'outer-tea-a');this.table(-6.5,30,'outer-tea-b');this.table(-6.5,32.6,'outer-tea-c');
 const kettle=(parent,x,y,z,scale=1)=>{const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);mesh(new T.SphereGeometry(.25,12,8),0x557a70,g,0,.16,0);cyl(g,.17,.19,.06,0x35564e,0,.38,0);cyl(g,.055,.055,.07,0x92744c,0,.43,0);const spout=cyl(g,.055,.1,.35,0x557a70,.29,.24,0);spout.rotation.z=-.9;const handle=mesh(new T.TorusGeometry(.19,.045,6,16),0x35564e,g,-.24,.22,0);handle.rotation.y=Math.PI/2;fitProp(g,'teapot.glb',{height:.22});return g;};
 const stand=new T.Group();stand.position.set(TEAPOT.x,0,TEAPOT.z);this.scene.add(stand);box(stand,1.1,.12,.8,0x806047,0,.85,0);for(const x of [-.4,.4])box(stand,.1,.8,.5,0x604c3b,x,.4,0);
 const pot=kettle(this.scene,TEAPOT.x,.94,TEAPOT.z,1);this.registerObject(pot,TEAPOT.id,'茶壶','stone',60,{kind:'teapot',owner:'tea_host'});
 for(const cup of TEA_CUPS){const g=new T.Group();g.position.set(cup.x,1.03,cup.z);this.scene.add(g);cyl(g,.13,.1,.2,0xd8d1b3,0,.08,0);const liquid=cyl(g,.1,.1,.012,0x9b7140,0,.185,0);g.userData.liquid=liquid;this.registerObject(g,cup.id,'茶杯','stone',25,{kind:'teacup',owner:'tea_host'});}
 this.teaKettle=kettle;

 this.table(7,13,'tea-table');this.table(-7,10,'street-table');
 const gate=new T.Group();gate.position.set(0,0,23);this.scene.add(gate);for(const x of [-3,3]){box(gate,.32,4.6,.32,0x685447,x,2.3,0);box(gate,.6,.3,.6,0x999c88,x,.15,0);}box(gate,7,.5,.4,0x776044,0,4.5,0);box(gate,7.5,.24,1.12,0x685447,0,4.91,0);box(gate,7.45,.24,1.5,0x493b32,0,5.08,0);const sign=textSprite('临 溪 镇','#eee3be',36,'sign');sign.position.set(0,4.55,.28);gate.add(sign);
 for(const [x,w] of [[-28.25,5.5],[-15.8,5.4],[-4.95,3.9],[5.45,4.9],[22.55,16.9]]){const wall=box(this.scene,w,3.2,.5,0x909a89,x,1.6,21);wall.material=paintedSurface("courses",w/4.8);wall.material.map.repeat.y=1;box(this.scene,w+.12,.15,.72,0x5e625b,x,3.24,21);this.obstacles.push({id:'city-wall:'+x,x,z:21,w,d:.5});}
 const riverFence=new T.Group();riverFence.position.set(-22,0,21);this.scene.add(riverFence);for(let x=-3,index=0;x<=3;x+=.6,index++){const slat=box(riverFence,.15,index===2?1.72:2.1,.16,index===2?0x474846:0x72543b,x,index===2?.76:.95,0);if(index===2)slat.rotation.z=.06;}for(const y of [.4,1.4])box(riverFence,7,.14,.18,0x72543b,0,y,0);this.registerObject(riverFence,'river-fence','河道木栅栏','wood',120);this.obstacles.push({id:'river-fence',x:-22,z:21,w:7,d:.2});
 this.gateBar=new T.Group();this.gateBar.position.set(0,0,21);this.scene.add(this.gateBar);for(const x of [-2,-1,0,1,2])box(this.gateBar,.12,2.8,.12,0x504d40,x,1.4,0);box(this.gateBar,6,.16,.16,0x504d40,0,1.7,0);
 gate.attach(this.gateBar);
 for(const side of [-1,1]){
 const foot=box(gate,.82,.53,.82,0x96958b,side*3,.265,0);foot.material=paintedSurface('limestone');
 for(let i=0;i<3;i++){
  const shelf=box(gate,.71+i*.34,.14,.56+i*.22,0x64503e,side*3,4.20+i*.21,0);shelf.material=paintedSurface('timber');
 }
 for(const offset of [-.75,.75])box(gate,.08,.48,.09,0x524435,side*3+offset,4.67,0);
}
gateRoof(gate);this.banners=gateBanners(gate);
 // Hang below the lintel, clear of the banners; use the existing six-light pool.
 for(const side of [-1,1]){const x=side*2.1;box(gate,.06,.06,.95,0x4f4b42,x,4.35,.4);cyl(gate,.018,.018,.4,0x4f4b42,x,4.12,.85);const lamp=this.lantern(gate,x,3.62,.85,{intensity:7,distance:10});lamp.scale.setScalar(1.45);}
 this.registerObject(gate,'town-gate','临溪城门','wood',900,{y:1.4});
 for(const [x,z,label]of [[-7,24,'城外茶棚'],[-11,24,'驿舍 · 差役服'],[6,24,'货摊'],[11,24,'刻字摊']]){const sign=textSprite(label);sign.position.set(x,3.5,z);this.scene.add(sign);}
 buildLocationScenery(this,{box,cyl,textSprite});

 }
 syncEvent(){
 const e=this.sim.event;this.eventGroup.clear();for(const p of this.props.filter(p=>p.id.startsWith('feast')))this.scene.remove(p.group);this.props=this.props.filter(p=>!p.id.startsWith('feast'));this.environmentAssets=this.environmentAssets.filter(p=>!p.id.startsWith('feast'));
 for(const n of this.npcs.values()){n.base.set(n.person.x,0,n.person.z);n.wanderTarget=null;n.attending=false;n.dispersing=false;n.restUntil=0;}
 if(!e){this.sceneId=null;for(const [i,id]of ['shen','su','gao'].entries()){const n=this.npcs.get(id);n.base.set(-8+i*8,0,10+i*2);n.dispersing=true;}return;}this.sceneId=e.id;const [x,z]=e.point||SCENES[e.type].point;
 if(e.type==='gate'&&!this.gatePlaced)for(const [id,x,z]of [['gate_guard',-1.6,24],['relay',-8.6,24],['gate_merchant',4.4,24],['scribe',9.4,24],['prisoner',PRISON.inmate.x,PRISON.inmate.z]]){const n=this.npcs.get(id);n.base.set(x,0,z);if(!this.sim.s.people[id]?.awareness?.caseOpen)n.actor.position.copy(n.base);}
 if(e.type==='gate')this.gatePlaced=true;
 for(const [i,id]of (e.type==='gate'?[]:e.cast||['shen','su','gao']).entries()){const n=this.npcs.get(id);n.base.set(x+(i-1)*1.6,0,z+(i===2?1.8:0));n.actor.position.copy(n.base);n.actor.rotation.y=i===0?Math.PI/2:-Math.PI/2;}
 if(['banquet','truce'].includes(e.type)){for(let i=0;i<3;i++)this.table(x+(i-1)*2.5,z+2.3,'feast-'+i,true);for(const [i,id]of ['tea','porter','elder'].entries()){const guest=this.npcs.get(id);guest.base.set(x-3+i*3,0,z-1.5);guest.actor.position.copy(guest.base);}}
 if(e.type==='proposal'){const ring=mesh(new T.TorusGeometry(.12,.027,8,20),0xe9c778,this.eventGroup,x-.6,1.3,z+.2);ring.rotation.x=.6;this.ring=ring;}
 }
 collides(x,z,feet=0,player=true,ignoreId=null){return (player&&this.sim.event?.type==='gate'&&['prison','testimony'].includes(this.sim.event.gate?.phase)&&(x<PRISON.bounds.minX||x>PRISON.bounds.maxX||z<PRISON.bounds.minZ||z>PRISON.bounds.maxZ))||(player&&this.sim.event?.type==='gate'&&this.sim.event.gate?.phase!=='prison'&&this.sim.event.gate?.phase!=='testimony'&&z<21&&!(roomAt({x,z})?.z===21&&roomAt(this.hero.position)?.id===roomAt({x,z})?.id)&&!(Math.abs(x)<2.7&&this.sim.s.ecosystem?.objects['town-gate']?.hp===0)&&!(x>-25.5&&x< -18.5&&this.sim.s.ecosystem?.objects['river-fence']?.hp===0))||Math.abs(x)>31||z< -34||z>SOUTH_WALK_LIMIT||(feet<1.05&&this.props.some(p=>Math.abs(x-p.x)<1.15&&Math.abs(z-p.z)<.8&&!this.sim.s.broken.includes(p.id)&&this.sim.s.ecosystem?.objects[p.id]?.hp!==0&&objectPresent(this.sim.s.ecosystem?.objects[p.id])))||obstaclesNear(this.obstacles,x,z,.3,cartObstacle).some(o=>o.id!==ignoreId&&objectPresent(this.sim.s.ecosystem?.objects[o.id])&&this.sim.s.ecosystem?.objects[o.id]?.hp!==0&&!this.sim.s.ecosystem?.objects[o.id]?.open&&(o.id===CART?convoyPointCollision(this.sim.s,x,z):Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3));}
 move(actor,dx,dz,free=false){if(actor===this.hero){const positions=Object.fromEntries([...this.npcs].map(([id,n])=>[id,n.actor.position]));if(!ropeAllowsMove(this.sim.s,actor.position,{x:actor.position.x+dx,z:actor.position.z+dz},positions,this.obstacles))return;}if(actor!==this.hero&&Math.hypot(dx,dz)>.00001){
 const u=actor.userData,dt=this.npcMoveDt||1/60,length=Math.hypot(dx,dz);
 // Feet stay planted until the startle has played, and a body facing away pivots before it travels.
 // free: rope-led captives and side-stepping escorts keep following their own constraint.
 if(!free&&this.t<(u.startledAt??-10)+STARTLE_HOLD)return;
 u.attemptedMove=true;
 if(!free&&length/dt>.3&&Number.isFinite(actor.rotation?.y)){
  const off=Math.atan2(dx,dz)-actor.rotation.y,turn=Math.atan2(Math.sin(off),Math.cos(off)),facing=Math.cos(turn);
  if(Math.abs(turn)>.2)actor.rotation.y+=Math.sign(turn)*Math.min(Math.abs(turn),(facing<.5?7:4)*dt);
  if(facing<.5){u.pivotHeld=(this.t-(u.pivotAt??-1)<dt*1.5?u.pivotHeld||0:0)+dt;u.pivotAt=this.t;if(u.pivotHeld<=.6)return;}
  else{u.pivotHeld=0;dx*=facing;dz*=facing;}
 }
 const stride=Math.hypot(dx,dz),previous=this.t-(u.travelAt??-1)<dt*1.5?u.travelSpeed||0:0;
 const step=npcTravelStep(stride,previous,dt);u.travelSpeed=step/dt;u.travelAt=this.t;dx*=step/stride;dz*=step/stride;
 }const canStep=(x,z)=>!this.collides(x,z,actor.position.y,actor===this.hero)||(actor!==this.hero&&convoyPenetration(this.sim.s,actor.position.x,actor.position.z)>0&&convoyPenetration(this.sim.s,x,z)<convoyPenetration(this.sim.s,actor.position.x,actor.position.z)&&!this.collides(x,z,actor.position.y,false,CART));
 if(canStep(actor.position.x+dx,actor.position.z))actor.position.x+=dx;if(canStep(actor.position.x,actor.position.z+dz))actor.position.z+=dz;}
 nearest(){let nearest=null,d=3.3;for(const [id,n]of this.npcs){const dist=n.actor.position.distanceTo(this.hero.position);if(dist<d&&visibleBetween(this.hero.position,n.actor.position,this.obstacles,this.sim.s.ecosystem?.objects)){nearest={id,npc:n,distance:dist};d=dist;}}return nearest;}
 nearbyEvent(){const e=this.sim.event;if(!e||!this.sim.actions().length)return false;const [x,z]=e.point||SCENES[e.type].point;return Math.hypot(x-this.hero.position.x,z-this.hero.position.z)<4.3;}
 routeTo(point,arrivalRadius=2.7){
 const start=[Math.round(this.hero.position.x),Math.round(this.hero.position.z)],end=point.map(Math.round),q=[start],seen=new Map([[start.join(','),null]]);let goal;
 for(let i=0;i<q.length&&i<4000;i++){const p=q[i];if(Math.hypot(p[0]-end[0],p[1]-end[1])<arrivalRadius){goal=p;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz],key=n.join(',');if(!seen.has(key)&&!this.collides(...n)){seen.set(key,p);q.push(n);}}}
 if(!goal)return false;const route=[];for(let p=goal;p;p=seen.get(p.join(',')))route.unshift(p);this.auto=route.slice(1);return true;
 }
 jump(){if(!this.sim.s.player.bedRest&&canJump(this)){this.jumpV=7;this.onSound?.('jump');}}
 reactToDraw(){let said=false;for(const [id,n]of [...this.npcs].sort((a,b)=>a[1].actor.position.distanceTo(this.hero.position)-b[1].actor.position.distanceTo(this.hero.position))){const state=this.sim.s.people[id];if(!conflictCapable(this.sim.s,id)||state.awareness?.state==='fight'||!seesDraw(n.actor,this.hero,state,this.sim.s.npcClock||0,visibleBetween(n.actor.position,this.hero.position,this.obstacles,this.sim.s.ecosystem?.objects))||this.t<(n.drawCooldown||0))continue;
 const line=response(this.sim.s,id,'draw');markEncounter(this.sim.s,id,'draw');n.drawCooldown=this.t+12;n.actor.userData.startledAt=this.t;n.actor.userData.startledUntil=this.t+.7;n.lookUntil=this.t+3;
 if(!said&&!state.awareness?.caseOpen){said=true;this.onLifeSpeech?.({id,text:line});this.onSound?.('notice');}
 }}
 receiveHit(id){const q=this.npcs.get(id).actor.position.clone().sub(this.hero.position).normalize(),front=q.dot(new T.Vector3(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y)))>.3;const r=defend(this.sim,id,{guarding:this.combatReady&&this.keys.has('KeyR'),front,perfect:this.t-(this.guardStarted??-10)<.45});if(r.blocked)this.onSound?.('wood',{gain:.4});return r;}
 npcImpact(id){const s=this.sim.s,r=this.receiveHit(id);if(r.damage||r.blocked)this.combatImpact(this.hero,this.npcs.get(id)?.actor.position||this.hero.position,r.blocked?'guard':'hurt');if(r.damage>0&&officials.includes(id)&&s.player.hp<=0)beginPlayerCapture(this,id);if(r.damage)this.onHurt?.();return r;}
 get combatReady(){return this.readyUntil===Infinity;}
 toggleWeapon(){if(this.sim.s.player.bedRest||!this.playing||this.locked||this.performance||this.sim.s.player.hp<=0)return;if(this.combatReady)this.clearReady();else this.readyUntil=Infinity;if(this.combatReady)this.reactToDraw();this.onReady?.();}
 clearReady(){this.readyUntil=0;this.heroCombat?.cancel();this.heroModel?.motion?.cancelAttack();this.attackTime=0;}
 // The press turned out to be a view drag: a swing it started is withdrawn before contact, with its stamina.
 takeBackSwing(){
 const swing=this.heroCombat.swing;this.heroCombat.queued=undefined;
 if(!swing||swing!==this.pressSwing||swing.hit)return;
 this.heroCombat.cancel();this.heroModel?.motion?.cancelAttack();this.attackTime=0;this.inkFx?.trailEnd();
 const p=this.sim.s.player;p.energy=Math.min(100,p.energy+SWING_COST);
 }
 primaryAction(e){
 if(this.aimMode){this.onAimPick?.(e);return;}
 if(this.sim.s.player.bedRest)return;
 if(!this.playing||this.locked||this.performance||this.sim.s.player.hp<=0)return;
 if(this.combatReady)this.attack();else this.onSelectObject?.(e);
 }
 resetAfterRest(){
 this.clearReady();this.heroModel?.motion?.reset();this.heroVel?.set(0,0,0);this.cameraY=0;this.performance=null;this.attackTime=0;this.jumpV=0;this.auto=null;this.keys.clear();this.reaction=null;
 const p=this.sim.s.player;this.hero.position.set(p.x,0,p.z);
 for(const n of this.npcs.values()){n.nextHit=0;n.actor.position.copy(n.base);}
 }
 attack(objectId=null){
 if(!this.combatReady||this.performance||this.sim.s.player.energy<SWING_COST||this.locked||this.sim.s.player.hp<=0)return;
 if(this.sim.s.surrender)abandonSurrender(this.sim);
 this.heroCombat??=new HeroCombat();const swing=this.heroCombat.begin(objectId);if(!swing)return;
 this.attackTime=swing.duration;this.sim.s.player.energy-=SWING_COST;this.lunge=this.aimSwing(swing);this.dodging=null;this.heroModel?.motion?.cue('attack_'+(swing.index+1),swing.duration,false,{skip:swing.skip,fade:.07});
 }
 // A new swing faces the held direction at once; with no direction held it faces a nearby opponent who is already fighting the player.
 // If that opponent stands just out of reach, the wind-up carries the body in: the returned step closes to striking distance.
 aimSwing(swing){
 const k=this.keys,h=this.hero;if(!k||!h)return null;
 const sx=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0),sz=(k.has('KeyS')?1:0)-(k.has('KeyW')?1:0),held=!!(sx||sz);
 if(held)h.rotation.y=Math.atan2(sx*Math.cos(this.yaw)+sz*Math.sin(this.yaw),-sx*Math.sin(this.yaw)+sz*Math.cos(this.yaw));
 const fx=Math.sin(h.rotation.y),fz=Math.cos(h.rotation.y);let foe=null,near=LUNGE.sight;
 for(const [id,n] of this.npcs){const p=this.sim.s.people[id];if(!(p?.hp>0)||!(p.awareness?.state==='fight'||n.chasing))continue;const x=n.actor.position.x-h.position.x,z=n.actor.position.z-h.position.z,d=Math.hypot(x,z);
  // A held direction is the player's own aim; only an opponent already in that direction is closed on.
  if(d<near&&(!held||(x*fx+z*fz)/Math.max(d,.01)>.8)){near=d;foe=n.actor.position;}}
 if(!foe)return null;
 if(!held)h.rotation.y=Math.atan2(foe.x-h.position.x,foe.z-h.position.z);
 const gap=near-LUNGE.keep;if(gap<=.05||!swing)return null;
 return {x:(foe.x-h.position.x)/near,z:(foe.z-h.position.z)/near,speed:Math.min(gap,LUNGE.reach)/swing.strike,swing};
 }
 // A quick step out of reach: toward the held direction, or straight back. See DODGE: it grants no immunity.
 dodge(){
 const p=this.sim.s.player,h=this.hero;
 if(!this.combatReady||!this.playing||this.locked||this.performance||p.hp<=0||p.bedRest||p.crouched||p.stealing||h.position.y>.02||this.dodging||this.t<(this.dodgeReadyAt||0)||p.energy<DODGE.cost||inDeepWater(h.position.x,h.position.z))return false;
 const k=this.keys,sx=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0),sz=(k.has('KeyS')?1:0)-(k.has('KeyW')?1:0),held=!!(sx||sz),len=Math.hypot(sx,sz)||1;
 const x=held?(sx*Math.cos(this.yaw)+sz*Math.sin(this.yaw))/len:-Math.sin(h.rotation.y),z=held?(-sx*Math.sin(this.yaw)+sz*Math.cos(this.yaw))/len:-Math.cos(h.rotation.y);
 p.energy-=DODGE.cost;this.heroCombat.cancel();this.attackTime=0;this.lunge=null;this.auto=null;this.inkFx?.trailEnd();
 if(held)h.rotation.y=Math.atan2(x,z);
 this.dodging={x,z,age:0,from:h.position.clone()};this.dodgeReadyAt=this.t+DODGE.cooldown;
 this.heroModel?.motion?.cue(held?'ink_step':'dodge',DODGE.time+.1,false,{fade:.05});this.onSound?.('attack',{gain:.45,rate:1.5});
 return true;
 }
 strike(objectId=null){
 const h=this.hero.position,front=new T.Vector3(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y));
 const targets=[...this.npcs].filter(([id,n])=>{const d=n.actor.position.clone().sub(h);return d.length()<(this.sim.s.player.combatSchool==='qing'?3.1:2.6)&&d.normalize().dot(front)>.1&&this.sim.s.people[id].hp>0;}).sort((a,b)=>a[1].actor.position.distanceTo(h)-b[1].actor.position.distanceTo(h));
 if(this.ecology?.hit(front,objectId?Infinity:targets[0]?.[1].actor.position.distanceTo(h)??Infinity,objectId))return;
 if(objectId)return;
 if(targets.length){const [id,n]=targets[0],before=this.sim.s.people[id].hp;this.sim.attack(id);if(this.sim.s.people[id].hp<before)this.combatImpact(n.actor,h,this.sim.s.people[id].hp<=0?'down':'light');}
 else for(const prop of this.props){const d=new T.Vector3(prop.x,0,prop.z).sub(h);if(d.length()<2.8&&d.normalize().dot(front)>.1&&!this.sim.s.broken.includes(prop.id)){prop.hp--;this.onSound?.('wood',prop);if(prop.hp<=0){this.sim.breakProp(prop.id);this.burst(prop.x,1,prop.z,0xa28152,18);}break;}}
 }
 perform(action,targetId){
 this.clearReady();this.auto=null;this.attackTime=0;
 this.actionStool.position.copy(this.hero.position);this.actionStool.rotation.y=this.hero.rotation.y;
 if(motionFor(action)==='flourish'&&this.hero.position.y<.02)this.jumpV=5;
 this.performance={motion:motionFor(action),start:this.t,duration:action.duration??(action.kind==='eat'?3.6:2.6),targetId,camera:action.camera!==false};
 }
 interactionPoint(id){
 if(id==='scene'&&this.sim.event){const [x,z]=this.sim.event.point||SCENES[this.sim.event.type].point;return new T.Vector3(x,1.7,z);}
 return this.npcs.get(id)?.actor.position.clone().add(new T.Vector3(0,1.6,0));
 }
 screenPoint(point){const p=point.clone().project(this.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,visible:p.z>=-1&&p.z<=1};}
 animatePerformance(speed,dt){
 const a=this.performance,u=this.hero.userData;if(!a)return;
 const age=this.t-a.start;if(age>=a.duration||this.sim.s.player.hp<=0){this.performance=null;this.onPerformanceEnd?.();return;}
 const blend=Math.min(1,age/.22,(a.duration-age)/.3),wave=Math.sin(age*7),mix=(part,key,value)=>part.rotation[key]=T.MathUtils.lerp(part.rotation[key],value,blend);
 const target=this.npcs.get(a.targetId)?.actor;
 const facing=a.targetPoint||target?.position;if(facing&&!speed)this.hero.rotation.y=turnToward(this.hero.rotation.y,Math.atan2(facing.x-this.hero.position.x,facing.z-this.hero.position.z),dt);
 switch(a.motion){
 case 'lasso':case 'knot':{const casting=a.motion==='lasso',strikeAt=casting?.8:1.1;mix(u.arms[1],'x',casting?(age<.4?-2.8:-1.3):-1.2+wave*.1);mix(u.arms[0],'x',-1.15);mix(u.rig,'x',casting?.08:.24);if(age>=strikeAt&&a.onStrike){const strike=a.onStrike;a.onStrike=null;strike();}break;}
 case 'pressure':{const thrust=Math.max(0,1-Math.abs(age-.46)/.32);mix(u.arms[1],'x',-.55-thrust*(a.point==='mute'?1.65:1.25));mix(u.arms[0],'x',-.9);mix(u.rig,'x',.12+thrust*.32);if(age>=.44&&a.onStrike){const strike=a.onStrike;a.onStrike=null;a.struckAt=this.t;strike();}break;}
 case 'crouch':u.rig.position.y-=.3*blend;mix(u.rig,'x',.24);for(const leg of u.legs)mix(leg,'x',-.65);mix(u.arms[1],'x',-1.5);break;
 case 'gamble':mix(u.arms[0],'x',-1.5);mix(u.arms[1],'x',-1.3+wave*.3);mix(u.arms[1],'z',.6);break;
 case 'listen':mix(u.arms[0],'x',-.45);mix(u.arms[1],'x',-.5);mix(u.rig,'x',.12+Math.sin(age*3)*.04);break;
 case 'observe':mix(u.arms[1],'x',-2.4);mix(u.arms[1],'z',.25);mix(u.rig,'x',.18);break;
 case 'guard':mix(u.arms[0],'z',-1.15);mix(u.arms[1],'z',1.15);mix(u.arms[0],'x',-.35);mix(u.arms[1],'x',-.35);break;
 case 'recite':mix(u.arms[0],'x',-.8);mix(u.arms[1],'x',-1.6);mix(u.arms[1],'z',.45+Math.sin(age*2)*.2);break;
 case 'invite':mix(u.arms[1],'x',-.8);mix(u.arms[1],'z',1+wave*.12);mix(u.rig,'z',-.1);break;
 case 'lift':mix(u.arms[0],'x',-.7-Math.sin(Math.PI*age/a.duration)*.9);mix(u.arms[1],'x',-.7-Math.sin(Math.PI*age/a.duration)*.9);mix(u.rig,'x',.25);break;
 case 'tie':mix(u.arms[0],'x',-1.1+wave*.08);mix(u.arms[1],'x',-1.1-wave*.08);mix(u.arms[0],'z',-.6);mix(u.arms[1],'z',.6);break;

 case 'eat':case 'drink':mix(u.arms[1],'x',-2.2+wave*.24);mix(u.arms[0],'x',-1.1);if(!speed&&a.motion==='eat'&&this.actionStool.position.distanceTo(this.hero.position)<.3){u.rig.position.y-=.34*blend;mix(u.legs[0],'x',-1.1);mix(u.legs[1],'x',-1.1);}break;
 case 'bow':mix(u.rig,'x',.4*Math.sin(Math.PI*age/a.duration));mix(u.arms[0],'x',-1.1);mix(u.arms[1],'x',-1.1);mix(u.arms[0],'z',-.5);mix(u.arms[1],'z',.5);break;
 case 'clap':mix(u.arms[0],'x',-1.25);mix(u.arms[1],'x',-1.25);mix(u.arms[0],'z',-.7+wave*.2);mix(u.arms[1],'z',.7-wave*.2);break;
 case 'reach':case 'offer':mix(u.arms[1],'x',-1.55+Math.sin(age*3)*.25);mix(u.rig,'x',.15);break;
 case 'present':case 'handover':mix(u.arms[0],'x',-.85);mix(u.arms[1],'x',-.95);break;
 case 'force':mix(u.arms[1],'x',-1.8+Math.sin(age*5)*.7);mix(u.arms[0],'x',-.9);mix(u.rig,'z',Math.sin(age*5)*.12);break;
 case 'sword':case 'flourish':mix(u.arms[1],'x',-1.5);mix(u.arms[1],'z',Math.sin(age*6)*1.4);mix(u.arms[0],'z',-.9);break;
 case 'flute':mix(u.arms[0],'x',-2);mix(u.arms[1],'x',-2);mix(u.arms[0],'z',-.4);mix(u.arms[1],'z',.6);break;
 default:mix(u.arms[1],'x',-.9+wave*.15);mix(u.arms[0],'x',-.4);mix(u.rig,'x',.06*Math.sin(age*3));
 }
 }
 burst(x,y,z,color,count){for(let i=0;i<count;i++){const m=mesh(new T.BoxGeometry(.05,.05,.22),color,this.scene,x,y,z);this.particles.push({m,life:.6,v:new T.Vector3((Math.random()-.5)*6,Math.random()*4,(Math.random()-.5)*6)});}}
 // Shows a blow that has already been settled: thrown ink, a held frame, a short shove. It decides nothing.
 // kind: light | down (the blow felled them) | hurt (the player was hit) | guard (the player's blade caught it).
 combatImpact(actor,from,kind='light'){
 const p=actor.position,away=new T.Vector3(p.x-from.x,0,p.z-from.z);if(away.lengthSq()<1e-6)away.set(0,0,1);away.normalize();
 this.feel?.hit(IMPACT[kind]);
 const detail=this.quality?.step>1?.5:1,point=new T.Vector3(p.x-away.x*(kind==='guard'?.55:.2),kind==='guard'?1.25:1.15,p.z-away.z*(kind==='guard'?.55:.2));
 if(kind==='guard')this.inkFx?.clash(this.camera,point,away,detail);else this.inkFx?.impact(this.camera,point,away,kind==='down'?1.6:kind==='hurt'?.75:1,detail);
 this.shove(actor,away,kind==='down'?.55:kind==='guard'?.12:.32);
 }
 shove(actor,away,distance){
 const u=actor.userData;if(u.bedPose||u.groundPose||!this.shoves)return;
 this.shoves.push({actor,x:away.x,z:away.z,left:distance,rate:distance/.11});
 }
 stepShoves(dt){
 for(let i=this.shoves.length-1;i>=0;i--){const q=this.shoves[i],step=Math.min(q.left,q.rate*dt),a=q.actor;q.left-=step;
  if(a===this.hero)this.move(a,q.x*step,q.z*step);
  else{const x=a.position.x+q.x*step,z=a.position.z+q.z*step;if(!this.collides(x,z,a.position.y,false)){a.position.x=x;a.position.z=z;}else q.left=0;}
  if(q.left<=1e-4)this.shoves.splice(i,1);}
 }
 updateAmbientNpc(n,dist,dt){
 const a=n.actor;
 // Different enter/leave radii prevent walking and facing from alternating at the boundary.
 n.attending=n.attending?dist<4:dist<2.8;
 if(n.attending){
 n.wanderTarget=null;n.restUntil=this.t+1;
 const dx=this.hero.position.x-a.position.x,dz=this.hero.position.z-a.position.z;
 if(Math.hypot(dx,dz)>.5)a.rotation.y=turnToward(a.rotation.y,Math.atan2(dx,dz),dt);
 return 'talk';
 }
 if(this.t<(n.restUntil||0))return '';
 if(!n.wanderTarget){
 n.wanderIndex=(n.wanderIndex||0)+1;const angle=n.phase+n.wanderIndex*2.399;
 n.wanderTarget=n.base.clone().add(new T.Vector3(Math.sin(angle)*2.2,0,Math.cos(angle)*1.4));n.stalled=0;
 }
 const dir=n.wanderTarget.clone().sub(a.position),distance=dir.length();
 if(distance<.2){n.wanderTarget=null;n.restUntil=this.t+2+(n.phase%2);return '';}
 dir.normalize();a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);
 const heading=new T.Vector3(Math.sin(a.rotation.y),0,Math.cos(a.rotation.y));
 const step=arriveStep(distance,.7,dt,.18)*Math.max(0,heading.dot(dir));
 const previous=a.position.clone();this.move(a,dir.x*step,dir.z*step);
 n.stalled=a.position.distanceTo(previous)<.0001?(n.stalled||0)+dt:0;
 if(n.stalled>1.2){n.wanderTarget=null;n.restUntil=this.t+2;}
 return '';
 }
 animateActor(actor,speed,dt,gesture=''){const u=actor.userData;u.gait=(u.gait||0)+(speed-(u.gait||0))*(1-Math.exp(-12*dt));speed=u.gait;u.walkTime=(u.walkTime||0)+dt*8*Math.max(.25,speed);const t=u.walkTime+u.phase;u.legs.forEach((l,i)=>l.rotation.x=Math.sin(t+i*Math.PI)*speed*.6);u.arms.forEach((a,i)=>{a.rotation.x=Math.sin(t+i*Math.PI)*speed*.45;a.rotation.z=(i?1:-1)*.08;});u.rig.position.y=Math.abs(Math.sin(t))*speed*.04;u.rig.rotation.z=0;u.rig.rotation.x=0;u.rig.position.x=0;u.rig.position.z=0;
 // NPC steps follow actual distance travelled: the planted foot moves back
 // relative to the body, and only the returning foot lifts off the ground.
 if(!u.isHero){
  const velocity=Math.max(0,speed*2),stride=.62+Math.min(velocity,3)*.11;
  u.stepPhase=((u.stepPhase??u.phase/(Math.PI*2))+velocity*dt/stride)%1;
  const weight=Math.min(1,speed*5),bob=Math.sin(u.stepPhase*Math.PI*4)*.012*weight;
  u.rig.position.y=bob;
  u.legs.forEach((leg,i)=>{
   const phase=(u.stepPhase+i*.5)%1,stance=.58;
   const swing=Math.max(0,(phase-stance)/(1-stance));
   const halfStep=stride*stance*.5;
   const footZ=phase<stance?halfStep*(1-2*phase/stance):-halfStep*Math.cos(swing*Math.PI);
   const angle=-Math.asin(Math.max(-.9,Math.min(.9,footZ/.4)))*weight;
   leg.rotation.x=angle;
   leg.position.y=.5-bob-(.4-.4*Math.cos(angle))+Math.sin(swing*Math.PI)*.11*weight;
  });
  u.arms.forEach((arm,i)=>arm.rotation.x=Math.sin((u.stepPhase+i*.5)*Math.PI*2)*.32*weight);
 }
 u.talkWeight=(u.talkWeight||0)+(Number(gesture==='talk')-(u.talkWeight||0))*(1-Math.exp(-7*dt));u.arms[1].rotation.x=T.MathUtils.lerp(u.arms[1].rotation.x,-.6+Math.sin(this.t*3)*.16,u.talkWeight);
 }
 // Hero gait from real ground speed: cadence and swing grow into a run, the body leans with speed and into turns,
 // the trailing heel kicks up when running, and jumps tuck in the air then absorb the landing.
 heroGait(speed,dt){const u=this.hero.userData,run=Math.min(1,Math.max(0,(speed-3.6)/2.4)),weight=Math.min(1,speed/1.2),air=this.hero.position.y>.02;
  u.heroPhase=((u.heroPhase||0)+dt*(.9+.24*speed)*(speed>.05))%1;
  u.airK=(u.airK||0)+(Number(air)-(u.airK||0))*(1-Math.exp(-(air?14:10)*dt));
  const land=this.landing?Math.max(0,1-(this.t-this.landing.at)/.26)*this.landing.impact:0,ground=1-u.airK;
  u.legs.forEach((leg,i)=>{const swing=Math.sin((u.heroPhase+i*.5)*Math.PI*2)*(.42+.3*run)*weight,tuck=i?.25:-1.15,lift=.65+.35*Math.min(1,Math.abs(this.jumpV)/7);
   leg.rotation.x=(swing*ground+tuck*u.airK*lift)-.5*land;leg.userData.kick=Math.max(0,swing)*run*2.2*ground+(i?1.6:.3)*u.airK*lift;});
  u.arms.forEach((arm,i)=>{arm.rotation.x=Math.sin((u.heroPhase+i*.5)*Math.PI*2)*(.34+.4*run)*weight*ground-.55*u.airK;arm.rotation.z=(i?1:-1)*(.08+.4*u.airK);});
  const lean=Math.max(-.14,Math.min(.14,-(this.heroTurnRate||0)*.012*Math.min(1,speed/3.3)));
  u.lean=(u.lean||0)+(lean-(u.lean||0))*(1-Math.exp(-8*dt));
  u.rig.position.y=Math.abs(Math.sin(u.heroPhase*Math.PI*2))*(.025+.05*run)*weight*ground-.2*land;
  u.rig.rotation.x=(.04+.13*run)*weight*ground+.1*u.airK+.12*land;u.rig.rotation.z=u.lean;
 }
 update(dt){
 // A landed blow holds the world for a few hundredths of a second; the frame clock itself keeps running.
 const frameDt=dt;if(this.feel)dt=this.feel.step(dt);
 this.npcMoveDt=dt;
 const angle=this.sim.s.time*Math.PI/120,daylight=Math.max(0,Math.min(1,Math.sin(angle)*2+.45));
 // Keep shaded faces and the walkable ground readable after sunset. Day peaks stay unchanged.
 this.skyLight.intensity=.42+daylight*1.58;this.sun.intensity=.20+daylight*3;
 this.sun.color.setHSL(.09,.28+.58*(1-Math.abs(2*daylight-1)),.8);
 this.sun.position.set(-25*Math.cos(angle),12+20*daylight,14);
 updateHomes(this,dt);
 const night=nightTime(this.sim.s);if(night!==this.nightUi){this.nightUi=night;globalThis.document?.body.classList.toggle('ink-night',night);}
 this.daylight=daylight;this.scene.background.setHSL(.11,.24,.26+.56*daylight);this.horizon.position.x=this.hero.position.x;this.horizon.position.z=this.hero.position.z;this.horizon.material.color.setScalar(.20+.80*daylight);for(const layer of this.horizon.children)layer.material.color.setScalar(.28+.72*daylight);this.scene.fog.color.copy(this.scene.background);
 this.t+=dt;
 windAtGate(this.banners,this.t);for(const h of this.factionRoofs||[])h.roof.visible=Math.hypot(this.hero.position.x-h.x,this.hero.position.z-h.z)>8;const s=this.sim.s;captureFrame(this,dt);const custodyPose=captureHeroPose(this);if(custodyPose&&this.captureShot.direction)this.hero.rotation.y=turnToward(this.hero.rotation.y,this.captureShot.direction.yaw,dt);this.gateBar.visible=this.sim.event?.type==='gate';this.jailBars.visible=true;this.jailRoof.visible=!jailed(s)&&Math.hypot(this.hero.position.x-22,this.hero.position.z+22)>9;if(this.locked||s.player.hp<=0)this.clearReady();let dx=0,dz=0,speed=0;
 if(!this.locked&&s.player.hp>0&&!s.player.bedRest){const k=this.keys;let sx=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0),sz=(k.has('KeyS')?1:0)-(k.has('KeyW')?1:0);
 if(sx||sz)this.auto=null;
 if(this.auto?.length){const [x,z]=this.auto[0],d=Math.hypot(x-this.hero.position.x,z-this.hero.position.z);if(d<.3)this.auto.shift();else{dx=(x-this.hero.position.x)/d;dz=(z-this.hero.position.z)/d;}}
 else if(this.auto){this.auto=null;this.onArrive?.();}
 if(sx||sz){const len=Math.hypot(sx,sz);sx/=len;sz/=len;dx=sx*Math.cos(this.yaw)+sz*Math.sin(this.yaw);dz=-sx*Math.sin(this.yaw)+sz*Math.cos(this.yaw);}
 const dodge=this.dodging;if(dodge)dx=dz=0;
 const want=dx||dz?(inDeepWater(this.hero.position.x,this.hero.position.z)?1.4:(s.player.stealing||s.player.crouched)?1.6:k.has('ShiftLeft')&&s.player.energy>1?6.2:3.3)*(this.heroCombat?.swing?(this.heroCombat.swing.hit?.85:.5):1):0;
 if(want>4)s.player.energy=Math.max(0,s.player.energy-dt*5);else if(!(this.performance?.motion==='flute'&&this.performance.duration===3600))s.player.energy=Math.min(100,s.player.energy+dt*3);
 const v=this.heroVel,ease=1-Math.exp(-(want?9:13)*dt);v.x+=(dx*want-v.x)*ease;v.z+=(dz*want-v.z)*ease;speed=Math.hypot(v.x,v.z);if(!want&&speed<.08){v.set(0,0,0);speed=0;}
 // The quick step replaces walking for its length, and ends early where something solid is in the way.
 if(dodge){const step=dodgeTravel(dodge.age+dt)-dodgeTravel(dodge.age);dodge.age+=dt;v.set(dodge.x*step/Math.max(dt,1e-4),0,dodge.z*step/Math.max(dt,1e-4));}
 const lunge=this.lunge;if(lunge&&(this.heroCombat.swing!==lunge.swing||lunge.swing.hit))this.lunge=null;
 const fromX=this.hero.position.x,fromZ=this.hero.position.z;this.move(this.hero,v.x*dt,v.z*dt);
 if(this.lunge)this.move(this.hero,lunge.x*lunge.speed*dt,lunge.z*lunge.speed*dt);
 if(dodge){const at=this.hero.position;this.inkFx?.smearAdd(new T.Vector3(at.x,.45,at.z),new T.Vector3(at.x,1.35,at.z));
  if(dodge.age>=DODGE.time){this.dodging=null;this.inkFx?.smearEnd();this.inkFx?.streak(dodge.from,at);}}
 speed=Math.hypot(this.hero.position.x-fromX,this.hero.position.z-fromZ)/Math.max(dt,.001);
 const before=this.hero.rotation.y;if(want)this.hero.rotation.y=heroTurn(before,Math.atan2(dx,dz),dt);this.heroTurnRate=Math.atan2(Math.sin(this.hero.rotation.y-before),Math.cos(this.hero.rotation.y-before))/Math.max(dt,.001);
 }else{this.heroVel.set(0,0,0);this.heroTurnRate=0;this.dodging=this.lunge=null;}
 this.stepShoves(dt);
 if(s.player.bedRest)speed=moveToBed(this,dt);
 if(s.player.hp<=0){this.jumpV=0;this.hero.position.y=0;this.attackTime=0;this.auto=null;this.keys.clear();s.player.crouched=false;s.player.stealing=false;}
 this.jumpV-=18*dt;this.hero.position.y=Math.max(0,this.hero.position.y+this.jumpV*dt);if(this.hero.position.y===0){if(this.jumpV<-2){this.landing={at:this.t,impact:Math.min(1,-this.jumpV/8)};this.onSound?.('step',{gain:1.4});}this.jumpV=0;}

 if(custodyPose)speed=custodyPose.speed;this.animateActor(this.hero,speed||this.objectMoving?1:0,dt,s.player.hp<=0?'down':'');if(s.player.hp>0)this.heroGait(this.objectMoving&&!speed?3.3:speed,dt);if(this.combatReady){this.hero.userData.arms[1].rotation.x=-.7;this.hero.userData.arms[1].rotation.z=.35;}if(this.attackTime){this.hero.userData.arms[1].rotation.x=-1.5;this.hero.userData.arms[1].rotation.z=-2+this.attackTime*7;}
 const guarding=this.combatReady&&this.keys.has('KeyR')&&skill(s.player,'combat').tier>=2&&!this.attackTime;if(guarding){this.hero.userData.arms[1].rotation.x=-1.35;this.hero.userData.arms[1].rotation.z=-.55;this.hero.userData.arms[0].rotation.x=-.9;}restraintBeat(this);this.animatePerformance(speed,dt);this.actionCoins.visible=this.performance?.motion==='gamble';this.actionBowl.visible=!!this.performance&&['eat','drink'].includes(this.performance.motion);this.actionFlute.visible=this.performance?.motion==='flute';this.actionStool.visible=this.performance?.motion==='eat'&&!speed&&this.actionStool.position.distanceTo(this.hero.position)<.3;this.hero.userData.sword.visible=this.combatReady||this.performance?.motion==='sword';
 s.player.x=this.hero.position.x;s.player.z=this.hero.position.z;
 this.heroCombat.step(dt,this.playing&&!this.locked&&!this.performance&&s.player.hp>0&&this.combatReady,id=>this.strike(id),id=>this.attack(id));this.attackTime=this.heroCombat.remaining;
 // The blade is heard once it is moving, so a press that turns out to be a view drag makes no sound.
 const heard=this.heroCombat.swing;if(heard&&!heard.heard&&heard.age>=.05){heard.heard=true;this.onSound?.('attack');}
 let environmentDamage=0;
 if(this.playing){const hp=s.player.hp,was=s.player.drowning;environmentStep(s.player,dt,s.ecosystem?.objects);environmentDamage=Math.max(0,hp-s.player.hp);document.body.classList.toggle('drowning',s.player.drowning&&s.player.hp>0);if(s.player.drowning&&!was)this.onThought?.('脚踩不到底，喘不上气……得赶紧找岸。');if(hp>0&&s.player.hp<=0)this.onHurt?.();if(s.player.hp>0&&s.player.z<19.5&&inDeepWater(s.player.x,s.player.z))enterRiver(this.sim);else if(s.player.z<20.5)enterBrokenGate(this.sim);}
 if(this.sceneId!==this.sim.event?.id&&this.sim.event)this.syncEvent();
 if(this.playing&&!this.locked)s.npcClock=(s.npcClock||0)+dt;
 if(this.playing&&!this.locked&&!this.cinematic)encounterStep(this.sim,Object.fromEntries([...this.npcs].map(([id,n])=>[id,n.actor.position])),this.obstacles);
 if(this.playing&&!this.locked&&!this.cinematic)observeConcerns(this.sim,Object.fromEntries([...this.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}])),this.obstacles);
 const boardNotices=publicWantedNotices(s),boardSignature=JSON.stringify(boardNotices.map(w=>[w.id,w.status,w.charges]));if(this.wantedPoster&&this.wantedBoardSignature!==boardSignature){this.wantedBoardSignature=boardSignature;this.wantedPoster.material.map?.dispose();this.wantedPoster.material.dispose();this.wantedPoster.material=wantedSheet(boardNotices);}
 surrenderFrame(this);escortReactionFrame(this);investigationFrame(this);identityConsequenceFrame(this);bundleGiftFrame(this,dt);qingheJourneyFrame(this,dt);convoyAftermathFrame(this);actionCardFrame(this,dt);
 for(const [id,n]of this.npcs){if(s.people[id].hp<=0){n.chasing=n.fleeing=false;n.actor.position.y=0;delete n.actor.userData.bedPose;delete n.actor.userData.groundPose;this.animateActor(n.actor,0,dt,'down');n.actor.userData.sword.visible=false;if(n.alert)n.alert.visible=false;continue;}if(captureMotion(this,id,n,dt))continue;if(this.playing&&!this.cinematic&&surrenderMotion(this,id,n,this.locked?0:dt))continue;if(restraintMotion(this,id,n,this.playing&&!this.locked&&!this.cinematic?dt:0))continue;if(escortReactionMotion(this,id,n,dt))continue;if(s.chapterVersion===2&&this.playing&&!this.cinematic&&!this.sim.s.surrender&&['fight','flee','search'].includes(this.sim.s.people[id]?.awareness?.state)&&this.reactNpc(id,n,this.locked?0:dt))continue;if(this.playing&&!this.cinematic&&bountyOfficerMotion(this,id,n,this.locked?0:dt))continue;if(this.playing&&!this.cinematic&&investigationMotion(this,id,n,this.locked?0:dt))continue;if(this.t<(n.actor.userData.startledAt??-10)+STARTLE_HOLD&&conflictCapable(s,id)){this.animateActor(n.actor,0,dt,'');n.actor.userData.sword.visible=false;continue;}if(this.trainingActor===id){this.animateActor(n.actor,0,dt,'');n.actor.userData.sword.visible=false;continue;}if(bundleGiftMotion(this,id,n,dt))continue;if(qingheJourneyMotion(this,id,n,dt))continue;if(actionCardMotion(this,id,n,dt))continue;this.lifeFeedback(id,n);n.actor.userData.sword.visible=false;if(this.playing&&!this.cinematic&&this.territoryMotion(id,n,this.locked?0:dt))continue;if(this.playing&&!this.cinematic&&this.complaintMotion(id,n,this.locked?0:dt))continue;if(concernMotion(this,id,n,dt))continue;if(this.playing&&identityConsequenceMotion(this,id,n,dt))continue;if(this.playing&&!this.cinematic&&this.reportOrReactionMotion(id,n,this.locked?0:dt))continue;if(this.playing&&!this.cinematic&&convoyAftermathMotion(this,id,n,this.locked?0:dt))continue;const state=s.people[id],a=n.actor;let moving=0,gesture='';const beforeMove=a.position.clone(),dist=Math.hypot(a.position.x-this.hero.position.x,a.position.z-this.hero.position.z);
 n.chasing=this.playing&&this.sim.isPursuing(id,dist-(n.chasing?2:0));n.fleeing=state.fear>0&&(n.fleeing?dist<10:dist<7);
 if(this.cinematic){const other=this.npcs.get(this.cinematic.speaker===id?this.cinematic.listener:this.cinematic.speaker)?.actor.position||this.hero.position;a.rotation.y=turnToward(a.rotation.y,Math.atan2(other.x-a.position.x,other.z-a.position.z),dt);gesture=this.cinematic.speaker===id?'talk':'';}
 else if(state.hp<=0){gesture='down';}
 else if(n.chasing){
  const dir=this.hero.position.clone().sub(a.position);dir.y=0;dir.normalize();if(!n.combat?.swing||n.combat.swing.age<.18)a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);const step=arriveStep(dist,n.combat?.swing?0:2,dt,1.2);this.move(a,dir.x*step,dir.z*step);moving=step>0?1:0;gesture='';a.userData.sword.visible=npcArmed(s,id);
 }else if(n.fleeing){const dir=a.position.clone().sub(this.hero.position).normalize();this.move(a,dir.x*3*dt,dir.z*3*dt);a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);moving=1;}
 else if(this.itemExchange?.targetId===id){a.rotation.y=turnToward(a.rotation.y,Math.atan2(this.hero.position.x-a.position.x,this.hero.position.z-a.position.z),dt);gesture=this.itemExchange.phase==='talk'?'talk':'';}
 else if(n.echoFacingUntil>this.t){a.rotation.y=turnToward(a.rotation.y,Math.atan2(this.hero.position.x-a.position.x,this.hero.position.z-a.position.z),dt);gesture=this.speaking===id?'talk':'';}
 else if(n.bedWeight>.01&&!isSleeping(state)){}
 else if(this.stealthTurn?.(id,n,this.locked?0:dt)){}
 else if(n.recoveryHomeUntil>this.t){}
 else if(this.ecology?.steer(id,this.locked?0:dt)){}
 else if(this.sim.event?.type==='gate'&&['gate_guard','relay','gate_merchant','scribe','prisoner'].includes(id)){gesture=this.sim.event.gate?.phase==='fight'?'talk':'';}
 else if(n.dispersing){const dir=n.base.clone().sub(a.position);dir.y=0;const distance=dir.length();if(distance<.2)n.dispersing=false;else{dir.normalize();a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);const step=arriveStep(distance,1.3,dt);this.move(a,dir.x*step,dir.z*step);}}
 else if(['shen','su','gao'].includes(id)&&this.sim.event?.type==='inquiry'){gesture=this.updateAmbientNpc(n,20,dt);}
 else if(['shen','su','gao'].includes(id)&&this.sim.event){const dir=n.base.clone().sub(a.position);if(dir.length()>.13){const step=arriveStep(dir.length(),1.3,dt);dir.normalize();this.move(a,dir.x*step,dir.z*step);a.rotation.y=turnToward(a.rotation.y,Math.atan2(dir.x,dir.z),dt);moving=.6;}else gesture='talk';}
 else {gesture=this.updateAmbientNpc(n,dist,dt);}
 moving=Math.min(1.5,a.position.distanceTo(beforeMove)/Math.max(dt,.001)/2);
 if(this.speaking===id&&state.hp>0)gesture='talk';this.animateActor(a,moving,dt,gesture);if(this.reaction&&this.t<this.reaction.until&&['shen','su'].includes(id)&&state.hp>0){if(this.reaction.success&&['support','eat','favor'].includes(this.reaction.kind)){a.userData.arms[0].rotation.x=-1.1;a.userData.arms[1].rotation.x=-1.1;}else if(!this.reaction.success){a.userData.rig.rotation.z=Math.sin(this.t*5)*.08;a.userData.arms[1].rotation.x=-.7;}}n.kneel=(n.kneel||0)+(Number(id==='shen'&&this.sim.event?.type==='proposal'&&(!this.sim.event.proposal||this.sim.event.proposal.phase==='opening')&&moving===0&&!state.fear&&state.mood!=='angry')-(n.kneel||0))*(1-Math.exp(-8*dt));if(n.kneel>.001){a.userData.rig.position.y-=.25*n.kneel;a.userData.legs[0].rotation.x=T.MathUtils.lerp(a.userData.legs[0].rotation.x,-1.1,n.kneel);a.userData.arms[1].rotation.x=T.MathUtils.lerp(a.userData.arms[1].rotation.x,-1.2,n.kneel);}
 if(id==='gate_guard'){const fighting=this.sim.event?.gate?.phase==='fight'&&!this.cinematic;a.userData.sword.visible=fighting;if(fighting){a.rotation.y=turnToward(a.rotation.y,Math.atan2(this.hero.position.x-a.position.x,this.hero.position.z-a.position.z),dt);a.userData.arms[1].rotation.x=-.8-Math.max(0,Math.sin((this.sim.event.gate.fightTime||0)*Math.PI/1.5))*1.1;}}
 const labelName=npcName(s,id);if(n.labelName!==labelName){a.remove(n.label);n.label.material.map.dispose();n.label.material.dispose();n.label=textSprite(labelName);n.label.position.y=2.7;a.add(n.label);n.labelName=labelName;}state.facing=a.rotation.y;if(!this.cinematic||isSleeping(state))this.ecology?.pose(id);const labelWorld=Math.min(2.7,this.camera.position.distanceTo(a.position)*.13);n.label.scale.set(labelWorld,labelWorld*.187,1);n.label.visible=!this.cinematic&&visibleBetween(this.hero.position,a.position,this.obstacles,s.ecosystem?.objects)&&dist<(this.keys.has("AltLeft")||this.keys.has("AltRight")?12:6.6);n.label.material.opacity=Math.min(1,(13-dist)/3);
 }
 this.updateStealth?.(dt);
 if(this.ring)this.ring.visible=!s.facts.missing;
 for(const p of this.props)p.group.visible=!s.broken.includes(p.id)&&s.ecosystem?.objects[p.id]?.hp!==0;
 for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.m.position.addScaledVector(p.v,dt);p.v.y-=10*dt;p.m.rotation.x+=dt*8;if(p.life<=0){this.scene.remove(p.m);p.m.geometry.dispose();this.particles.splice(i,1);}}
 for(const [i,leaf]of this.petals.entries()){leaf.position.y-=dt*.2;leaf.position.x+=Math.sin(this.t+i)*dt*.12;leaf.rotation.x=this.t+i;if(leaf.position.y<.1)leaf.position.y=4;}
 this.objectPose?.(dt);this.lessonTick?.(dt);
 const perf=this.performance,shot=perf?.camera?Math.sin(Math.PI*Math.min(1,(this.t-perf.start)/perf.duration))*.28:0,viewYaw=this.yaw+shot,viewDistance=this.distance*(this.aimMode?.65:1)*(1-shot*.6);
 const heroY=this.hero.position.y;this.cameraY=(this.cameraY??heroY)+(heroY-(this.cameraY??heroY))*(1-Math.exp(-dt*(heroY>.02?2.5:10)));
 const target=this.hero.position.clone().setY(this.cameraY+1.45),offset=new T.Vector3(Math.sin(viewYaw)*Math.cos(this.pitch)*viewDistance,Math.sin(this.pitch)*viewDistance,Math.cos(viewYaw)*Math.cos(this.pitch)*viewDistance);
 // Last frame's jolt is taken off before the camera is placed, so it never feeds the follow smoothing.
 this.camera.position.sub(this.jolt);this.jolt.set(0,0,0);this.camera.fov+=this.fovKick;this.fovKick=0;
 if(captureCamera(this,dt)){}else if(this.cinematic){
 const c=this.cinematic,speaker=this.npcs.get(c.speaker)?.actor||this.hero,listener=this.npcs.get(c.listener)?.actor||this.hero;
 const focus=c.template==='reaction'?listener:speaker,other=c.template==='reaction'?speaker:listener;
 const shot=shotPlan(focus.position,other.position,c.template==='reaction'?'close':c.template,this.camera.aspect);
 const eye=new T.Vector3(shot.position.x,shot.position.y,shot.position.z),look=new T.Vector3(shot.target.x,shot.target.y,shot.target.z);
 const seatedOffset=focus.userData.groundPose?focus.userData.rig.position.y:0;look.y+=seatedOffset*(c.template==='two'?.5:1);eye.y+=seatedOffset*(c.template==='two'?.35:.7);
 // Avoid putting the camera inside a building; a tighter view stays with the speaker.
 if(this.collides(eye.x,eye.z,0,false)){eye.lerp(look,.55);eye.y=2.4;}
 // The cell conversation is filmed from inside, never through the bars at z=17.
 if(c.speaker==='prisoner'&&['prison','testimony'].includes(this.sim.event?.gate?.phase)){eye.set(23,2.3,-20.3);}
 this.camera.position.copy(clearDialogueCamera(look,eye,this.obstacles,s.ecosystem?.objects));this.camera.fov=shot.fov;this.camera.lookAt(look);
 }else if(this.trainingActor){
 const teacher=this.npcs.get(this.trainingActor)?.actor;
 const look=this.hero.position.clone().lerp(teacher?.position||this.hero.position,.5).setY(1.1);
 this.trainingView??=lessonCamera(this,teacher);
 for(const asset of this.trainingView.cutaway)asset.group.visible=false;
 this.camera.position.lerp(this.trainingView.eye,1-Math.exp(-dt*6));this.camera.fov=48;this.camera.lookAt(look);
 }else if(this.objectFocus){const focus=this.objectFocus;this.camera.position.lerp(focus.clone().add(new T.Vector3(4,3,5)),1-Math.exp(-dt*4));this.camera.fov=48;this.camera.lookAt(focus);}else{
 const shoulder=this.aimMode?.35:0;target.x+=Math.cos(viewYaw)*shoulder;target.z-=Math.sin(viewYaw)*shoulder;
 followOrbit(this.camera,target,target.clone().add(offset),this.obstacles,s.ecosystem?.objects,dt,this.aimMode?44:48+Math.min(4,speed*.65));
 const feel=this.feel;if(feel.shake||feel.punch){this.jolt.set(Math.sin(this.t*91)*.8+Math.sin(this.t*57+1.3)*.4,Math.sin(this.t*73+.7)*.7,0).multiplyScalar(feel.shake*.3).applyQuaternion(this.camera.quaternion);this.camera.position.add(this.jolt);this.fovKick=feel.punch*2.6;this.camera.fov-=this.fovKick;}
 }
 this.camera.updateProjectionMatrix();
 // Temporarily cull only unrelated foreground actors that could cover the speaker.
 for(const actor of this.scene.children.filter(a=>a.userData.rig)){
  if(actor.userData.cinemaHidden){actor.visible=true;delete actor.userData.cinemaHidden;}
  for(const child of actor.children.filter(c=>c.isSprite)){if(child.userData.cinemaLabel){child.visible=true;delete child.userData.cinemaLabel;}if(this.cinematic&&child.visible){child.visible=false;child.userData.cinemaLabel=true;}}
  if(this.cinematic){const c=this.cinematic,focus=this.npcs.get(c.speaker)?.actor||this.hero,other=this.npcs.get(c.listener)?.actor||this.hero;
   if(actor===this.hero){const to=(focus===this.hero?other:focus).position;actor.rotation.y=turnToward(actor.rotation.y,Math.atan2(to.x-actor.position.x,to.z-actor.position.z),dt);}
   if(actor!==focus&&(actor!==other||['choice','close'].includes(c.template))&&actor.visible&&actor.position.distanceTo(focus.position)<7){actor.visible=false;actor.userData.cinemaHidden=true;}
  }
 }
 // Detect blocked attempts after movement, not long-lived idle positions.
 for(const [id,n]of this.npcs)recoverNpc(this,id,n,dt);
 for(const [id,n]of this.npcs)stepNpcCombat(this,id,n,dt,k=>this.npcImpact(k));
 const oldHp=this.hero.userData.lastHp;bodyFeedback(this.hero,s.player.hp,this.t,dt);
 if(oldHp!==undefined&&s.player.hp<oldHp){this.heroCombat.cancel();this.attackTime=0;const cue=damageSound(oldHp,s.player.hp,environmentDamage);if(cue)this.onSound?.(cue);if(s.player.hp<=0&&oldHp>0)this.onHurt?.();}
 dressActor(this.hero,0x385953,outfit(this.sim)?.color??0x385953);
 for(const [id,n]of this.npcs){if(s.people[id].wardrobeInitialized)dressActor(n.actor,n.person.color,s.ecosystem.items.some(i=>i.type==='clothing'&&i.ownerId===id&&i.location==='npc:'+id&&i.hp>0)?n.person.color:0xb6b09b);const st=s.people[id],a=n.actor,d=a.position.distanceTo(this.hero.position),available=st.hp>0&&!(st.stunnedUntil>(s.npcClock||0));const visible=available&&d<6&&visibleBetween(a.position,this.hero.position,this.obstacles,s.ecosystem?.objects);const dx=this.hero.position.x-a.position.x,dz=this.hero.position.z-a.position.z;const front=Math.sin(a.rotation.y)*dx+Math.cos(a.rotation.y)*dz>0;
 if(id==='scribe'&&this.playing&&!this.locked&&!this.cinematic&&!this.performance&&s.player.hp>0&&!st.probed&&!s.facts.scribeScarsSeen&&visible&&d<3.8&&this.onThought?.('（他虎口的疤，倒不像刻刀伤的。）')){s.facts.scribeScarsSeen=true;this.sim.save();}
 const watching=!isSleeping(st)&&this.playing&&!this.locked&&!this.cinematic&&s.player.hp>0&&s.player.crouched&&visible&&front&&d<4&&!st.awareness?.caseOpen;
 n.skulkTime=watching?(n.skulkTime||0)+dt:0;if(n.skulkTime>=5&&this.t>(this.skulkNext||0)&&st.impressions?.skulk!=='skulk:'+s.day){this.skulkNext=this.t+9;n.lookUntil=this.t+2;const text=response(s,id,'skulk');markEncounter(s,id,'skulk');this.onLifeSpeech?.({id,text});}
 const target=n.musicLookUntil>this.t?n.musicPoint:visible&&(front||this.t<n.lookUntil)?this.hero.position:null;bodyFeedback(a,st.hp,this.t,dt,target);const beat=this.performance;if(beat?.motion==='pressure'&&beat.targetId===id&&beat.hit!==undefined&&st.hp>0){const recoil=pressureReaction(beat,this.t);a.userData.rig.rotation.z+=(beat.hit?.16:-.24)*recoil;if(beat.hit&&beat.point==='mute')a.userData.arms[0].rotation.x=-2.35*recoil;}}
 this.updateNpcChecks();this.updateActorDeltas();this.updateActivityCaption();this.sceneDetails??=new SceneDetails(this);this.sceneDetails.update(dt);
 for(const [id,n] of this.npcs){
  const a=n.actor,u=a.userData,st=s.people[id],clock=s.ecosystem?.time||0;
  if(id==='porter'){
   if(!n.ironCargo){const cargo=n.ironCargo=new T.Group(),bar=new T.Mesh(new T.BoxGeometry(.12,.08,1.8),new T.MeshStandardMaterial({color:0x73583c,roughness:1}));bar.position.set(-.3,1.35,0);cargo.add(bar);for(const z of [-.72,.72]){const bag=new T.Mesh(new T.BoxGeometry(.35,.4,.35),new T.MeshStandardMaterial({color:0x7c705b,roughness:1}));bag.position.set(-.3,.95,z);cargo.add(bag);const iron=new T.Mesh(new T.CylinderGeometry(.035,.035,.55,6),new T.MeshStandardMaterial({color:0x474846,metalness:.4,roughness:.75}));iron.position.set(-.3,1.15,z);cargo.add(iron);}a.add(cargo);}
   n.ironCargo.visible=st.hp>0&&s.ecosystem?.items.some(i=>i.storyId==='porter-iron'&&i.location==='npc:porter'&&i.hp>0);
  }
  const actualSpeed=n.motionPosition?a.position.distanceTo(n.motionPosition)/Math.max(dt,.001):0;
  n.motionPosition??=a.position.clone();n.motionPosition.copy(a.position);
  const target=st.life?.target,atSeat=target&&Math.hypot(a.position.x-target.x,a.position.z-target.z)<.6;
  const seated=st.hp>0&&!st.restraint&&!n.chasing&&!n.fleeing&&!st.awareness?.caseOpen&&this.trainingActor!==id&&['tea','rest','doze','meal'].includes(st.life?.activity)&&atSeat&&atStool(a.position);
  const upperKind=st.sickUntil>clock?'sick':st.drinkingUntil>clock?'drink':st.eatingUntil>clock?'eat':st.pouringUntil>clock?'pour':st.collectUntil>clock||st.payingUntil>clock?'reach':n.heldKettle?.visible?'pour':s.ecosystem?.show?.audience.includes(id)&&actualSpeed<.12?'clap':null;
  const itemAttention=this.itemExchange?.targetId===id&&!n.chasing&&!n.fleeing&&!st.awareness?.caseOpen;
  const custodyUpper=captureOfficerPose(this,id);const upperBody=custodyUpper|| (st.restraint&&st.hp>0?{kind:'bound'}:this.trainingActor===id?{kind:this.trainingPose}:itemAttention?(this.itemExchange.phase==='inspect'?{kind:'inspect'}:null):upperKind?{kind:upperKind}:this.ecology?.upperBody?.(id)||u.npcUpperBody||n.detailPose);
  if(st.restraint)delete u.bedPose;else npcBedPose(this,id,dt);
  npcGroundSeat(this,id,dt,actualSpeed);
  // A resting porter sets the carried bundle beside him; it remains his real item.
  if(n.ironCargo){const k=u.groundPose?.weight||0;n.ironCargo.position.set(-.5*k,-.71*k,0);}
  const choreography=(st.life?.activity==='privacy'&&atSeat)||n.kneel>.01||u.npcPoseOverride||(this.performance?.targetId===id&&pressureReaction(this.performance,this.t)>0);
  const danger=['fight','flee','search'].includes(st.awareness?.state)||n.chasing||n.fleeing;
  n.model.sync(n.person.color,{dt,bedPose:u.bedPose,groundPose:u.groundPose,dozing:seated&&st.life?.activity==='doze',hp:st.hp,speed:actualSpeed>6?0:actualSpeed,seated,upperBody:custodyUpper|| (danger?null:upperBody),flee:st.awareness?.state==='flee'||n.fleeing,hurtAt:u.hurtAt,startleAt:u.startledAt,
   talking:itemAttention?this.itemExchange.phase==='talk':this.speaking===id||this.cinematic?.speaker===id||u.npcTalking,
   angry:st.mood==='angry'||st.awareness?.state==='warn'||s.complaint?.id===id,
   armed:u.sword.visible,stunned:!st.restraint&&st.stunnedUntil>s.npcClock,fallback:!st.restraint&&!!choreography});
  // Keep food and vessels on the animated hand, including while carrying tea.
  const hand=n.model.handPoint?.(1);
  if(hand)for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop?.visible){prop.parent.updateWorldMatrix(true,false);prop.position.copy(prop.parent.worldToLocal(hand.clone()));if(prop===n.heldKettle)prop.position.y-=.17;}
  this.sceneDetails.afterPose(id);n.detailSpeed=actualSpeed;u.npcPoseOverride=false;u.npcTalking=false;u.npcUpperBody=null;
 }
 this.ecology?.afterPose?.();
 playerBedPose(this);
 this.heroModel.sync({dt,custody:custodyPose,bedPose:this.hero.userData.bedPose,hatOn:!!s.player.hat,disguised:['runner','borrowed'].includes(s.player.disguise),hp:s.player.hp,hurt:oldHp!==undefined&&s.player.hp<oldHp,armed:this.combatReady,speed:this.objectMoving&&!speed?3.3:speed,airborne:this.hero.position.y>.02,crouched:s.player.crouched||s.player.stealing,upperBody:custodyPose?.phase!=='lift'&&custodyPose?{kind:'bound'}:['present','handover'].includes(this.performance?.motion)?{kind:this.performance.motion}:null,fallback:!!this.performance&&!['present','handover'].includes(this.performance.motion)||guarding||!!this.hero.userData.bedPose});this.appearanceModel.update(s);drawLassos(this);
 // The blade's stroke is taken from where the sword really is, over the cutting part of the swing only.
 const swing=this.heroCombat.swing,sword=this.hero.userData.sword;
 if(swing&&sword.visible&&swing.age>swing.strike-.11&&swing.age<swing.strike+.15&&(this.bladeEnds??=bladeEnds(sword))){sword.updateWorldMatrix(true,false);this.inkFx.trailAdd(this.bladeEnds.near.clone().applyMatrix4(sword.matrixWorld),this.bladeEnds.far.clone().applyMatrix4(sword.matrixWorld));}else this.inkFx.trailEnd();
 this.inkFx.update(dt);this.vitality.update(frameDt);
  const now=performance.now();if(this.playing&&this.quality.frame(now-this.frameAt))this.applyQuality();this.frameAt=now;
  if(this.quality.lightShadows&&(this.shadowTurn=!this.shadowTurn))this.renderer.shadowMap.needsUpdate=true;
  this.ink.render(this.daylight);
 }
}
