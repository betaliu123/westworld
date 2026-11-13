import * as T from '../vendor/three.module.js';
import {visibleBetween} from './npc-awareness.js';
import {showSituationalThought} from './situational-thoughts.js';
import {qingheRiverPose,updateQingheRipples} from './qinghe-riverside.js';

// Original procedural props: no downloaded asset or third-party licence required.
const ink=0x474846,paper=0xcbbd91,cloth=0x344764;
const material=c=>new T.MeshStandardMaterial({color:c,roughness:1});
function piece(g,w,h,d,c,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);g.add(m);return m;}
export class SceneDetails{
 constructor(world){this.world=world;this.props=new Map();this.elapsed=0;}
 prop(id,kind){
  if(this.props.has(id))return this.props.get(id);
  const g=new T.Group();g.name='authored-detail-'+id;
  if(kind==='stitch'){piece(g,.25,.015,.16,cloth,0,0,0);piece(g,.012,.12,.012,paper,.06,.06,0);}
  if(kind==='wipe'){piece(g,.16,.12,.15,paper,0,0,0);piece(g,.19,.015,.17,cloth,0,-.05,0);}
  if(kind==='ledger'){piece(g,.18,.23,.035,paper,0,0,0);for(let y=-.07;y<.09;y+=.04)piece(g,.12,.006,.004,ink,0,y,.019);}
  this.world.scene.add(g);this.props.set(id,g);return g;
 }
 update(dt){
  const w=this.world,s=w.sim.s;if(s.chapterVersion!==2)return;this.elapsed+=dt;const details={},positions={};
  for(const [id,n] of w.npcs){
   const st=s.people[id],q=n.actor.position;positions[id]={x:q.x,z:q.z};n.detailPose=null;
   const valid=st.hp>(st.maxHp||100)*.3&&!st.restraint&&!st.drowning&&!st.inCustody&&!(st.stunnedUntil>(s.npcClock||0))&&!['sleep','doze'].includes(st.life?.activity)&&!st.awareness?.caseOpen&&!['fight','warn','flee','investigate','search'].includes(st.awareness?.state)&&!n.chasing&&!n.fleeing&&!w.performance&&w.trainingActor!==id;
   let kind=null;
   const still=(n.detailSpeed||0)<.15&&(!st.life?.target||Math.hypot(q.x-st.life.target.x,q.z-st.life.target.z)<.8);
   const beat=(this.elapsed+({gate_merchant:0,relay:3,prisoner:6,tea_host:9}[id]||0))%14<3;
   if(valid&&still&&beat){
    if(id==='gate_merchant'&&s.ecosystem?.items.some(i=>i.documentId==='merchant-pass'&&i.location==='npc:'+id&&i.hp>0))kind='guardLapel';
    if(id==='prisoner'&&s.ecosystem?.items.some(i=>i.type==='ledger'&&i.location==='npc:'+id&&i.hp>0))kind='guardLapel';
    if(id==='relay'&&!s.facts.runnerClothesCaught)kind='stitch';
    if(id==='tea_host'&&!st.collectUntil&&!st.payingUntil&&!st.pouringUntil&&Math.hypot(q.x+5.6,q.z-30)<3)kind='wipe';
   }
   if(id==='qinghe'&&valid&&still)kind=qingheRiverPose(w)?.kind||null;
   if(kind){n.detailPose={kind};details[id]=kind;}
   const propKind=id==='prisoner'?'ledger':kind;
   if(['stitch','wipe','ledger'].includes(propKind))this.prop(id,propKind).visible=!!kind;
   else if(this.props.has(id))this.props.get(id).visible=false;
   if(valid&&['gate_guard','gate_relief'].includes(id)&&q.distanceTo(w.hero.position)<5&&visibleBetween(w.hero.position,q,w.obstacles,s.ecosystem?.objects)){
    s.chapter??={done:{},heard:{},titles:[]};s.chapter.observed??={};s.chapter.observed.guardCoat=true;
   }
  }
  const busy=!w.playing||w.locked||w.cinematic||w.performance||w.combatReady||w.heroCombat?.active;
  updateQingheRipples(w,w.npcs.get('qinghe')?.detailPose);
  showSituationalThought(w.sim,{positions,obstacles:w.obstacles,details,qingheCryHeard:w.qingheCryHeard},s.npcClock||0,text=>w.onThought?.(text),busy);
 }
 afterPose(id){const g=this.props.get(id);if(!g?.visible)return;const n=this.world.npcs.get(id),hand=n.model.handPoint?.(id==='prisoner'?-1:1);if(hand){g.position.copy(hand);g.rotation.y=n.actor.rotation.y;}}
}
