// Local, isolated playtest fixtures; conversations and following use production paths.
import {rememberFace,applyFace,appearanceState,currentFace} from '../src/appearance.js';
import {convoyState,CONVOY_GATE} from '../src/convoy.js';
import {convoyOverlaps} from '../src/convoy-scene.js';
import {QINGHE_RIVERSIDE} from '../src/locations.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {thoughtCandidates} from '../src/situational-thoughts.js';
import {progressSnapshot} from '../src/progress.js';
export function mountQingheHarness({getSim,world,environment,save,getAudio=()=>null}){
 const el=document.createElement('details');el.id='qinghe-qa';el.open=true;
 el.style.cssText='position:fixed;top:8px;right:8px;z-index:1500;background:var(--paper);color:var(--ink);font:14px var(--font-body);max-width:285px;padding:8px';
 el.innerHTML='<summary>青禾 · 独立验收</summary><nav></nav><output style="display:block;white-space:pre-wrap"></output>';document.body.append(el);
 let follow=false,nightFixture=false;const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 function stop(){follow=false;world.dialogue.finish(true);world.checkReveal.cancel();environment.close();for(const id of ['drawer','panel'])document.getElementById(id).hidden=true;world.keys.clear();world.auto=null;world.clearReady();world.quietUntil=0;world.t+=60;}
 function player(x,z){Object.assign(getSim().s.player,{x,z,hp:100,energy:100,crouched:false,stealing:false});world.hero.position.set(x,0,z);world.yaw=0;world.pitch=.5;world.distance=5;}
 function place(id,x,z){const n=getSim().s.people[id],actor=world.npcs.get(id).actor;Object.assign(n,{x,z,hp:100,stunnedUntil:0,muteUntil:0,sickUntil:0,awareness:null,restraint:null,inCustody:false,life:{activity:'idle'}});actor.position.set(x,0,z);environment.eco.positions[id]={x,z};}
 function river(old=false){stop();const s=getSim().s;s.chapter.opened=true;s.time=35;s.wanted=0;place('qinghe',old?-11:QINGHE_RIVERSIDE.x,old?29.5:QINGHE_RIVERSIDE.z);player(-18,37);world.yaw=-.3;world.pitch=.55;world.distance=6.5;save();}
 function cry(){river();const s=getSim().s;for(const key of ['qingheWishKnown','qingheUnwillingKnown','qingheRosterRouteKnown','qingheConsent','enteredCity'])delete s.facts[key];delete s.chapter.done.qinghe_wish;s.chapter.thoughts={seen:{},sites:{},last:-100};s.player.satiety=s.player.rested=100;environment.eco.s.hunger.qinghe=0;s.people.qinghe.purse=0;player(-12,34.5);world.yaw=-.9;world.pitch=.55;world.distance=7;for(const n of world.npcs.values())n.nextAmbient=world.t+60;world.nextAmbient=world.t+60;el.open=false;save();}
 function mask(){stop();const sim=getSim(),s=sim.s,eco=environment.eco;s.chapter.opened=true;s.time=35;s.wanted=0;s.complaint=null;s.facts.enteredCity=false;delete s.facts.entryReceipt;delete s.facts.entryRoute;delete s.facts.convoyArrived;s.event=new Simulation(newArrival()).s.event;
  const c=convoyState(s);delete c.command;delete c.passenger;Object.assign(c,{...CONVOY_GATE,phase:'gate',route:0,approved:{},attempts:{},banned:{},incidents:{},posts:{},closed:false});
  place('porter',5,31);place('fu',8,29);place('qinghe',QINGHE_RIVERSIDE.x,QINGHE_RIVERSIDE.z);place(s.watch?.holder||'gate_guard',0,24);if(eco.s.objects['town-gate'])eco.s.objects['town-gate'].open=false;
  player(-28,40);s.people.qinghe.metPlayer=true;rememberFace(s,'qinghe');applyFace(sim,'player');eco.create('易容膏','cosmetic','player',{discovered:true});applyFace(sim,'qinghe');const ap=appearanceState(s);ap.checks={};ap.exposed={};ap.observedChanges={};ap.rumors={};sim.rng=()=>0;
  player(8,27);world.syncEvent();save();
 }
 function hint(id){if(id==='fu')mask();else stop();player(-28,40);applyFace(getSim(),'player');if(id==='fu')player(8,27);else river();environment.eco.s.hunger[id]=10;world.nextAmbient=0;for(const [who,n]of world.npcs){n.nextAmbient=who===id?0:world.t+120;if(who===id)n.ambientIndex=0;}el.open=false;}
 function guide(kind){river();nightFixture=false;const s=getSim().s,eco=environment.eco;s.player.face=null;s.facts.enteredCity=false;s.facts.qingheConsent=false;s.facts.qingheUnwillingKnown=s.facts.qingheRosterRouteKnown=kind==='face';s.player.wornOutfit=eco.items('player').find(i=>i.appearanceModel==='hero')?.id||null;s.player.disguise=null;s.player.inventory=s.player.inventory.filter(i=>i!=='旧差役服');eco.s.items=eco.s.items.filter(i=>!i.routeGuideFixture);s.chapter.actionGuides={};s.chapter.thoughts={seen:{qingheCry:true},sites:{qingheCry:true},last:-100};delete s.convoy.passenger;delete s.convoy.command;s.convoy.phase='gate';s.convoy.closed=false;
  if(kind==='coat'||kind==='short'){const name=kind==='coat'?'旧差役服':'役夫短褂';eco.create(name,'clothing','player',{discovered:true,routeGuideFixture:true});if(kind==='coat')s.player.inventory.push(name);}
  if(kind==='theft'){player(-5,34.1);place('gate_merchant',-5,32.6);const n=world.npcs.get('gate_merchant');n.actor.rotation.y=Math.PI;environment.eco.positions.gate_merchant.facing=Math.PI;s.people.gate_merchant.life={activity:'idle',target:{x:-5,z:32.6}};environment.eco.s.hunger.gate_merchant=0;s.people.gate_merchant.energy=100;world.yaw=0;s.people.gate_merchant.theftAlertDay=0;s.facts.gatePassTaken=false;const pass=eco.s.items.find(i=>i.documentId==='merchant-pass');pass.location='npc:gate_merchant';pass.hp=pass.max;world.sceneDetails.elapsed=14;}
  for(const n of world.npcs.values())n.nextAmbient=world.t+120;world.nextAmbient=world.t+120;getSim().progressBaseline=progressSnapshot(s);el.open=false;save();
 }
 const actions=[['石外听哭',cry],['问青禾心事',()=>{river();world.onGateTalk('qinghe');el.open=false;}],['溪边近看',()=>river()],['旧档步行',()=>river(true)],['冒名到符祥身旁',mask],['与符祥对话',()=>world.onGateTalk('fu')],['走到关前',()=>{stop();world.routeTo([-1.8,24.8],.35);el.open=false;}],['步行进关',()=>{stop();world.routeTo([0,19],.35);el.open=false;}],['听符祥候人',()=>hint('fu')],['听青禾自语',()=>hint('qinghe')],['跟上车队',()=>{stop();follow=true;}],['保存试玩',save],['收起验收',()=>el.open=false]];
 for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.querySelector('nav').append(b);}
 for(const [label,kind]of [['冒名装扮引导','face'],['差服装扮引导','coat'],['短褂装扮引导','short'],['路引偷窃引导','theft']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>guide(kind);el.querySelector('nav').append(b);}
 const nightButton=document.createElement('button');nightButton.textContent='夜间溪边';nightButton.onclick=()=>{river();nightFixture=true;getSim().s.facts.qingheConsent=false;el.open=false;};el.querySelector('nav').append(nightButton);
 setInterval(()=>{const s=getSim().s,c=convoyState(s),n=s.people.qinghe,q=world.npcs.get('qinghe');s.time=nightFixture?190:35;
  if(follow&&!world.locked&&!world.dialogue.active&&c.phase==='travel')world.routeTo([c.x-3.1*Math.cos(c.heading||0)+Math.sin(c.heading||0),c.z+Math.cos(c.heading||0)+3.1*Math.sin(c.heading||0)],.35);
  const pos=v=>`${v.x.toFixed(2)},${v.z.toFixed(2)}`;
  const turn={...c,heading:c.heading+.03},objects=environment.eco.s.objects,blocked=[...world.obstacles.filter(o=>o.id!=='flowerstone-cart'&&objects[o.id]?.hp!==0&&!objects[o.id]?.open&&convoyOverlaps(turn,o)).map(o=>o.id),...[...world.npcs].filter(([id,n])=>convoyOverlaps(turn,{x:n.actor.position.x,z:n.actor.position.z,w:.5,d:.5})).map(([id])=>id)];
  el.querySelector('output').textContent=`${innerWidth}×${innerHeight} / 错误 ${errors.length}\n青禾 ${n.life?.activity} ${pos(q.actor.position)}\n姿态 ${q.detailPose?.kind||'-'} / 坐 ${!!q.actor.userData.groundPose}\n手 ${q.model.handPoint?.(1)?.toArray().map(x=>x.toFixed(2)).join(',')}\n面貌 ${currentFace(s)} / 车 ${c.phase} ${pos(c)}\n随行 ${c.passenger?.subject||'-'} / 玩家 ${pos(s.player)}\n${['porter','fu'].map(id=>id+' '+pos(world.npcs.get(id).actor.position)+' '+s.people[id].life?.activity).join('\n')}\n入城 ${!!s.facts.enteredCity} / 路线 ${s.facts.entryRoute||'-'}\n青禾同意 ${!!s.facts.qingheConsent}\n${errors.slice(-2).join('\n')}`;
  el.querySelector('output').textContent+='\n转弯 '+(c.heading||0).toFixed(2)+' / 挡路 '+blocked.join(',');
  el.querySelector('output').textContent+='\n开门 '+!!objects['town-gate']?.open+' / 门栅 '+(world.gateBar?.visible?'显':'隐')+' / 符祥先行 '+!!c.passenger?.ahead;
  const audio=getAudio()?.status();if(audio)el.querySelector('output').textContent+='\n音频 '+audio.context+' / '+(audio.reaction||'静')+' / 哭声已载 '+audio.loaded.includes('npc-qinghe-cry');
  el.querySelector('output').textContent+='\n引导 '+JSON.stringify(s.chapter.actionGuides||{})+'\n候选 '+thoughtCandidates(s,{positions:environment.eco.positions,obstacles:world.obstacles,details:Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.detailPose?.kind]))}).map(t=>t.key).join(',');
 },350);
}
