import {theftVisibleBetween} from './npc-awareness.js';
import {theftObserver,advanceTheftAttention} from './theft-sight.js';
import {turnToward} from './interaction.js';
import {npcInfo} from './npc-discovery.js';
import {icon} from './ui-icons.js';

export function turnForTheft(world,id,n,dt){
 const st=world.sim.s.people[id];
 if(world.locked||world.cinematic||dt<=0||!(n.theftLookUntil>world.t)||st.hp<=0||st.stunnedUntil>world.sim.s.npcClock||['sleep','doze','escape'].includes(st.life?.activity))return false;
 const p=world.hero.position;
 if(!theftVisibleBetween(n.actor.position,world.sim.s.player,world.obstacles,world.sim.s.ecosystem?.objects))return false;
 n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(p.x-n.actor.position.x,p.z-n.actor.position.z),dt);
 return true;
}

export function mountStealthAttention(world,getEco){
 const layer=document.createElement('div');layer.id='stealth-attention';document.body.append(layer);
 const markers=new Map();let previousSim=world.sim;
 function sync(){const eco=getEco();eco.obstacles=world.obstacles;
  for(const [id,n] of world.npcs){const a=n.actor;world.sim.s.people[id].facing=a.rotation.y;eco.positions[id]={x:a.position.x,z:a.position.z,facing:a.rotation.y,gazeOffset:a.userData.head?.rotation.y||0,attention:n.theftAttention||0};}
 }
 world.stealthTurn=(id,n,dt)=>turnForTheft(world,id,n,dt);
 world.updateStealth=dt=>{
  const eco=getEco(),s=world.sim.s,p=s.player;
  if(previousSim!==world.sim){for(const n of world.npcs.values()){n.theftAttention=0;n.theftLookUntil=0;}previousSim=world.sim;}
  sync();const active=world.playing&&p.hp>0&&p.crouched&&!world.cinematic&&!world.dialogue?.active&&(!world.performance||!!world.theftAttempt);
  const candidates=[];
  for(const [id,n] of world.npcs){const q=eco.positions[id],clear=theftVisibleBetween(q,p,world.obstacles,eco.s.objects),o=theftObserver(s,id,q,p,clear);
   if(!world.locked){n.theftAttention=advanceTheftAttention(n.theftAttention||0,o,dt,active);
    if(active&&o.awake&&o.clear&&o.state!=='hidden'&&n.theftAttention>=.6)n.theftLookUntil=world.t+1.2;}
   q.attention=n.theftAttention||0;
   const otherPanel=document.body.classList.contains('hud-detail-open')&&document.getElementById('object-actions')?.hidden;
   if(active&&!otherPanel&&(!world.locked||world.theftAttempt)&&n.actor.visible&&o.awake&&clear&&o.distance<=6&&!n.alert?.visible&&!n.checkFlash?.visible&&!world.deltaSprites?.has(id))candidates.push({id,n,o});
  }
  for(const el of markers.values())el.hidden=true;
  // These are world-anchored marks, never a new fixed HUD stack or a name leak.
  // Measuring the HUD forces a layout pass, so it is only done on frames that have a mark to place.
  const occupied=!candidates.length?[]:[...document.querySelectorAll('#object-actions,#panel,#drawer,#environment-panel,#dialogue,#hud-left-stack,#hud-info-stack,#hud-context-stack,#minimap')].filter(el=>!el.hidden&&!el.classList.contains('hud-obscured')&&el.getBoundingClientRect().width).map(el=>el.getBoundingClientRect());
  let count=0;
  for(const {id,n,o} of candidates.sort((a,b)=>Number(b.o.state==='watching')-Number(a.o.state==='watching')||a.o.distance-b.o.distance)){
   const point=world.screenPoint(n.actor.position.clone().add({x:0,y:(n.model?.height||2)+(n.actor.userData.rig?.position.y||0)+.16,z:0}));
   if(count>=3||!point.visible||point.x<14||point.x>innerWidth-14||point.y<14||point.y>innerHeight-14||occupied.some(r=>point.x+12>r.left&&point.x-12<r.right&&point.y+12>r.top&&point.y-12<r.bottom))continue;
   let el=markers.get(id);if(!el){el=document.createElement('span');el.className='stealth-eye';el.setAttribute('role','img');layer.append(el);markers.set(id,el);}
   const state=o.state,name=npcInfo(world.sim,eco,id)?.name||'？？？',label=name+' · '+({hidden:'未看向这里',edge:'余光留意',watching:'正看着这里'}[state]);
   if(el.dataset.attention!==state){el.innerHTML=icon({hidden:'AttentionAway',edge:'AttentionEdge',watching:'Eye'}[state]);el.dataset.attention=state;}
   el.title=label;el.setAttribute('aria-label',label);el.style.left=point.x+'px';el.style.top=point.y+'px';el.hidden=false;count++;
   occupied.push({left:point.x-16,right:point.x+16,top:point.y-16,bottom:point.y+16});
  }
 };
 return {sync};
}
