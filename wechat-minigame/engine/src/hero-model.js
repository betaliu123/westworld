import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {HeroMotion} from './hero-motion.js';
import {bedBones} from './bed-pose.js';
import {sleepEyes} from './sleep-eyes.js';
import {FootGrounding} from './foot-grounding.js';

// Retargeted motion drives locomotion/combat. Bespoke interactions retain their procedural choreography.
const HEIGHT = 2.04, HANG = Math.PI / 2 - .1, ELBOW = .22;
const BONES = {
  hips: 'mixamorig:Hips', head: 'mixamorig:Head',
  rightArm: 'mixamorig:RightArm', rightFore: 'mixamorig:RightForeArm',
  leftArm: 'mixamorig:LeftArm', leftFore: 'mixamorig:LeftForeArm',
  rightLeg: 'mixamorig:RightUpLeg', rightShin: 'mixamorig:RightLeg',
  leftLeg: 'mixamorig:LeftUpLeg', leftShin: 'mixamorig:LeftLeg',
};
const axisZ = new T.Vector3(0, 0, 1), axisX = new T.Vector3(1, 0, 0);
const q1 = new T.Quaternion(), q2 = new T.Quaternion();

function rigSpace(rig, node) {
  const inv = rig.getWorldQuaternion(new T.Quaternion()).invert();
  return inv.multiply(node.getWorldQuaternion(new T.Quaternion()));
}

export function mountHeroModel(actor, url) {
  const u = actor.userData, handle = {ready: false, sync() {}};
  if (!globalThis.document?.createElement) return handle;
  u.rig.visible = false;
  handle.loaded = new GLTFLoader().loadAsync(url).then(async gltf => {
    const model = gltf.scene, wrapper = new T.Group();
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if (o.material) { o.material.metalness = 0; o.material.roughness = 1; }
    });
    wrapper.add(model);
    wrapper.rotation.y = -Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new T.Box3(), part = new T.Box3();
    model.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bounds.union(part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); } });
    const scale = HEIGHT / (bounds.max.y - bounds.min.y);
    wrapper.scale.setScalar(scale);
    wrapper.position.y = -bounds.min.y * scale;
    const saved = {position: u.rig.position.clone(), quaternion: u.rig.quaternion.clone()};
    u.rig.position.set(0, 0, 0); u.rig.quaternion.identity();
    u.rig.add(wrapper);
    actor.updateMatrixWorld(true);

    const bone = {};
    for (const [key, name] of Object.entries(BONES)) bone[key] = model.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
    const missing = Object.keys(BONES).filter(key => !bone[key]);
    if (missing.length) { wrapper.removeFromParent(); u.rig.position.copy(saved.position); u.rig.quaternion.copy(saved.quaternion); throw new Error('hero model: missing bones '+missing.join(', ')); }
    const rest = {}, parent = {};
    for (const key of Object.keys(BONES)) { rest[key] = rigSpace(u.rig, bone[key]); parent[key] = rigSpace(u.rig, bone[key].parent); }
    const hang = side => new T.Quaternion().setFromAxisAngle(axisZ, side * HANG);
    const hangs = {rightArm: hang(1), leftArm: hang(-1)};
    const elbow = new T.Quaternion().setFromAxisAngle(axisX, -ELBOW);
    const foreLocal = {};
    for (const [arm, fore] of [['rightArm', 'rightFore'], ['leftArm', 'leftFore']]) {
      const armTarget = hangs[arm].clone().multiply(rest[arm]);
      foreLocal[fore] = armTarget.invert().multiply(elbow.clone().multiply(hangs[arm]).multiply(rest[fore]));
    }
    // Shoulder pivots move to the model so hand-held props (sword, bowl, coins) land in its hands.
    const shoulder = name => u.rig.worldToLocal(bone[name].getWorldPosition(new T.Vector3()));
    const right = shoulder('rightArm'), left = shoulder('leftArm');
    u.arms[0].position.set(right.x, right.y, right.z);
    u.arms[1].position.set(left.x, left.y, left.z);
    const closeEyes=sleepEyes(u.rig,model,bone.head,HEIGHT,.209);
    u.rig.position.copy(saved.position); u.rig.quaternion.copy(saved.quaternion);

    const hat = model.getObjectByName('Hat');
    const bindPose = [];
    model.traverse(o => { if(o.isBone) bindPose.push({bone:o,position:o.position.clone(),quaternion:o.quaternion.clone()}); });
    const swordHome = {parent:u.sword.parent,position:u.sword.position.clone(),quaternion:u.sword.quaternion.clone(),scale:u.sword.scale.clone()};
    const hand = model.getObjectByName('mixamorigRightHand');
    const swordSocket = new T.Group();
    hand.add(swordSocket);
    swordSocket.scale.setScalar(1 / scale);
    // Fingers follow the hand's +Y axis; the blade lies across the closed palm.
    swordSocket.rotation.z = -Math.PI / 2;
    swordSocket.position.set(0,.025,0);
    let usedMotion = false, stealthExit = 0;
    const grounding = new FootGrounding(actor,wrapper,model);
    await Promise.all(['sumiro-motion.local.json','hero-stealth-motion.json'].map(file=>
      fetch(new URL('./models/'+file,import.meta.url)).then(r=>r.ok?r.json():{clips:[]})
        .catch(()=>({clips:[]})))).then(packs=>{
      const clips=packs.flatMap(p=>p.clips);
      handle.motion = new HeroMotion(model, clips.map(c => T.AnimationClip.parse(c)));
      handle.clipNames = clips.map(c=>c.name);
    });
    const knee = new T.Quaternion();
    function drive(key, joint, extra) {
      q1.copy(joint.quaternion);
      if (extra) q1.multiply(extra);
      q1.multiply(rest[key]);
      bone[key].quaternion.copy(q2.copy(parent[key]).invert().multiply(q1));
    }
    function leg(key, shin, joint) {
      drive(key, joint);
      knee.setFromAxisAngle(axisX, Math.max(0, -joint.rotation.x) * 1.4 + (joint.userData.kick || 0));
      bone[shin].quaternion.copy(q2.copy(rest[key]).invert().multiply(knee).multiply(rest[shin]));
    }
    handle.ready = true;
    handle.wrapper = wrapper;handle.bindPose=bindPose;
    handle.sync = ({hatOn, disguised, dt = 0, ...state}) => {
      u.rig.visible = true;
      if (hat) hat.visible = hatOn && !(state.bedPose?.weight>.3);
      closeEyes(state.bedPose?.weight||0);
      const animated = handle.motion?.update(dt, {...state, disguised:false});
      grounding.reset();
      stealthExit=state.crouched?.3:Math.max(0,stealthExit-dt);
      u.heroAnimationActive = !!animated;
      if(animated){
        u.rig.position.set(0,0,0); u.rig.rotation.set(0,0,0);
        if(stealthExit>0 && state.hp>0 && !state.airborne) grounding.apply();
        if(u.sword.parent!==swordSocket){swordSocket.add(u.sword);u.sword.position.set(0,0,0);u.sword.quaternion.identity();u.sword.scale.set(1,1,1);}
        // Physical root stays on the ground; only the hips carry the authored pose.
        usedMotion = true;
        return;
      }
      if(usedMotion||state.bedPose){
        for(const p of bindPose){p.bone.position.copy(p.position);p.bone.quaternion.copy(p.quaternion);}
        swordHome.parent.add(u.sword);u.sword.position.copy(swordHome.position);u.sword.quaternion.copy(swordHome.quaternion);u.sword.scale.copy(swordHome.scale);
        usedMotion=false;
      }
      drive('rightArm', u.arms[0], hangs.rightArm);
      drive('leftArm', u.arms[1], hangs.leftArm);
      bone.rightFore.quaternion.copy(foreLocal.rightFore);
      bone.leftFore.quaternion.copy(foreLocal.leftFore);
      leg('rightLeg', 'rightShin', u.legs[0]);
      leg('leftLeg', 'leftShin', u.legs[1]);
      drive('head', u.head);
      if(state.bedPose)bedBones(u.rig,bone,state.bedPose);
    };
    return handle;
  }).catch(error => {handle.error=error;console.error('hero model failed to load',error);return handle;});
  return handle;
}
