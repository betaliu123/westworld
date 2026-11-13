import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {stepNpcCombat,NPC_SWING} from '../src/npc-combat.js';
import {NpcMotion} from '../src/npc-motion.js';

function fixture(){
 const actor=new T.Group();actor.userData.arms=[new T.Group()];const hero=new T.Group();hero.position.z=1.5;
 const cues=[],st={hp:100,maxHp:100,weaponType:'sword',awareness:{state:'fight'}},world={t:0,playing:true,hero,obstacles:[],sim:{s:{people:{guard:st},player:{hp:100},npcClock:0}}};
 const n={actor,model:{motion:{cue:(...a)=>cues.push(a),cancelAttack(){}}}};let hits=0;
 const step=(dt=.05)=>{world.t+=dt;stepNpcCombat(world,'guard',n,dt,()=>hits++);};
 return {world,n,st,cues,step,hits:()=>hits};
}
test('NPC swing gives a readable wind-up, then one real contact per swing',()=>{
 const f=fixture();f.step();assert.equal(f.hits(),0);assert.equal(f.cues[0][0],'attack');
 for(let i=0;i<8;i++)f.step();assert.equal(f.hits(),0);
 f.step(.12);assert.equal(f.hits(),1);
 for(let i=0;i<9;i++)f.step();assert.equal(f.hits(),1);
});
test('NPC contact rechecks range, facing and walls after wind-up',()=>{
 for(const alter of [f=>f.world.hero.position.z=4,f=>f.world.hero.position.z=-1.5,f=>f.world.obstacles.push({x:0,z:.75,w:2,d:.2})]){
  const f=fixture();f.step();alter(f);f.step(NPC_SWING.strike+.01);assert.equal(f.hits(),0);
 }
});
test('real injury, restraint, surrender, flee and dialogue cancel a pending NPC hit',()=>{
 for(const alter of [f=>f.st.hp-=1,f=>f.st.restraint={type:'bound'},f=>f.world.sim.s.surrender={},...['flee','return','search'].map(state=>f=>{f.n.chasing=true;f.st.awareness.state=state;}),f=>f.world.locked=true,f=>f.st.hp=0]){
  const f=fixture();f.step();alter(f);f.step(.6);assert.equal(f.hits(),0);assert.equal(f.n.combat.swing,null);
 }
 const f=fixture();f.st.weaponType='fists';f.step();assert.equal(f.cues[0][0],'punch');
});

function motion(){const root=new T.Group(),hip=new T.Bone();hip.name='mixamorigHips';root.add(hip);const clips=['idle','breathe','walk','combat_idle','combat_run','flee','attack','punch','hit','startle'].map(name=>new T.AnimationClip(name,1,[new T.VectorKeyframeTrack('mixamorigHips.position',[0,1],[0,1,0,0,1,0])]));return new NpcMotion(root,clips,.3);}
test('motion plays a reaction once, interrupts attack and resumes the current danger gait',()=>{
 const m=motion();m.update(.1,{speed:1});m.cue('attack',1);m.update(.1,{armed:true});assert.equal(m.current,'attack');
 m.update(.1,{armed:true,hurtAt:5,startleAt:5});assert.equal(m.current,'hit');
 for(let i=0;i<8;i++)m.update(.1,{flee:true,speed:3,hurtAt:5,startleAt:5});
 assert.equal(m.current,'flee');assert.ok(m.weights.get('flee')>.9);
 m.update(.1,{startleAt:6});assert.equal(m.current,'startle');
 for(let i=0;i<15;i++)m.update(.1,{startleAt:6});assert.notEqual(m.current,'startle');
 m.cue('attack',1);m.update(.1,{armed:true});m.cancelAttack();m.update(.1,{armed:true});assert.equal(m.current,'combat_idle');
 m.update(.1,{hp:0});assert.equal(m.current,null);
});

for(const kind of ['commoner','sandgang','guard','constable','prince','envoy','woman'])test(kind+' combat pack matches its actual rig and contains finite in-place clips',()=>{
 const base=new URL('../src/models/',import.meta.url),raw=readFileSync(new URL('npc-'+kind+'.glb',base));
 const doc=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12))),names=new Set(doc.nodes.map(n=>T.PropertyBinding.sanitizeNodeName(n.name||'')));
 const pack=JSON.parse(readFileSync(new URL('npc-'+kind+'-combat.json',base)));
 assert.equal(pack.targetSHA256,createHash('sha256').update(raw).digest('hex'));assert.equal(pack.license,'CC0-1.0');
 assert.deepEqual(pack.clips.map(c=>c.name),['combat_idle','combat_run','flee','attack','punch','hit','startle']);
 // At the initial guard pose, every model must point the blade out in front.
 // This catches uncorrected A/T poses and the envoy's reversed palm twist.
 const nodes=doc.nodes,byName=new Map(nodes.map((n,i)=>[T.PropertyBinding.sanitizeNodeName(n.name||''),i])),parents=new Map();nodes.forEach((n,i)=>n.children?.forEach(c=>parents.set(c,i)));
 const rotations=nodes.map(n=>new T.Quaternion(...(n.rotation||[0,0,0,1])));
 for(const track of pack.clips[0].tracks)if(track.type==='quaternion')rotations[byName.get(track.name.split('.')[0])].fromArray(track.values);
 const world=i=>parents.has(i)?world(parents.get(i)).multiply(rotations[i]):rotations[i].clone();
 const pos=name=>new T.Vector3(...nodes[byName.get('mixamorigRightHand'+name)].translation);
 const forward=pos('Middle1').normalize(),blade=pos('Index1').sub(pos('Pinky1'));blade.addScaledVector(forward,-blade.dot(forward)).normalize().applyQuaternion(world(byName.get('mixamorigRightHand'))).applyAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 assert.ok(blade.z>.4,'blade must leave the hand toward the opponent, not the torso');
 for(const c of pack.clips)for(const t of c.tracks){
  assert.ok(names.has(t.name.split('.')[0]),t.name);assert.ok(t.values.every(Number.isFinite));
  if(t.type==='quaternion')for(let i=0;i<t.values.length;i+=4)assert.ok(Math.abs(Math.hypot(...t.values.slice(i,i+4))-1)<.00001);
  else for(let i=0;i<t.values.length;i+=3){assert.equal(t.values[i],t.values[0]);assert.equal(t.values[i+2],t.values[2]);}
 }
});
