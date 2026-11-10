import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone as cloneSkinned} from '../vendor/SkeletonUtils.js';
import {NpcMotion,npcMotionName,npcMotionProfile} from './npc-motion.js';
import {NpcGesture} from './npc-gesture.js';

// Daily motion uses retargeted clips; prop-specific choreography keeps its own pose.
const HANG = Math.PI / 2 - .1, ELBOW = .22;
const BONES = {
  head: 'mixamorig:Head',
  rightArm: 'mixamorig:RightArm', rightFore: 'mixamorig:RightForeArm',
  leftArm: 'mixamorig:LeftArm', leftFore: 'mixamorig:LeftForeArm',
  rightLeg: 'mixamorig:RightUpLeg', rightShin: 'mixamorig:RightLeg',
  leftLeg: 'mixamorig:LeftUpLeg', leftShin: 'mixamorig:LeftLeg',
};
const KINDS = {
  prince: {file: 'npc-prince.glb', height: 2.02},
  guard: {file: 'npc-guard.glb', height: 2.08},
  woman: {file: 'npc-woman.glb', height: 1.88, dye: true},
  commoner: {file: 'npc-commoner.glb', height: 1.98, dye: true},
  constable: {file: 'npc-constable.glb', height: 1.72, motion: 'guard'},
  envoy: {file: 'npc-envoy.glb', height: 1.84, motion: 'prince'},
  sandgang: {file: 'npc-sandgang.glb', height: 1.86, motion: 'commoner'},
  maskopera: {file: 'npc-maskopera.glb', height: 1.7, motion: false},
};
const BONE_ALIASES = {
  head: ['Head'],
  rightArm: ['R_Upperarm'], rightFore: ['R_Forearm'],
  leftArm: ['L_Upperarm'], leftFore: ['L_Forearm'],
  rightLeg: ['R_Thigh'], rightShin: ['R_Calf'],
  leftLeg: ['L_Thigh'], leftShin: ['L_Calf'],
};
// Head pieces vary the shared commoner and woman bodies; colours are the cloth, not the wearer's robe.
const LOOKS = {
  traveler: {kind: 'prince'},
  gate_guard: {kind: 'guard'}, gate_relief: {kind: 'guard'}, guard: {kind: 'constable'},
  tea_host: {kind: 'woman', head: ['scarf', 0x6b5a45]}, mei: {kind: 'woman', head: ['flower', 0xc4384f]},
  matchmaker: {kind: 'woman', head: ['scarf', 0x4a3b5c]}, su: {kind: 'woman'}, bookseller: {kind: 'woman', head: ['flower', 0xe8e0cf]},
  inn: {kind: 'woman', head: ['flower', 0xb58a3c]}, tea: {kind: 'woman', head: ['scarf', 0x56704a]},
  inspector: {kind: 'constable'}, gang_boss: {kind: 'sandgang'},
  old_constable: {kind: 'commoner', head: ['futou', 0x2a2f33]}, relay: {kind: 'commoner', head: ['scarf', 0x5e5040]},
  gate_merchant: {kind: 'commoner', head: ['straw', 0xb39766]}, scribe: {kind: 'commoner'}, prisoner: {kind: 'commoner'},
  merchant: {kind: 'commoner', head: ['futou', 0x26292b]}, thief: {kind: 'commoner', head: ['scarf', 0x2f2e36]},
  qing: {kind: 'commoner'}, chi: {kind: 'sandgang'}, shen: {kind: 'commoner'},
  gao: {kind: 'commoner', head: ['straw', 0xa88c5c]}, porter: {kind: 'commoner', head: ['straw', 0x9f8a5e]},
  elder: {kind: 'commoner', head: ['futou', 0x2b2a27]},
};
export const npcLook = id => { const look=LOOKS[id] || {kind:'commoner'}; return {...look, motionProfile:npcMotionProfile(id,look.kind)}; };

const loader = new GLTFLoader(), templates = new Map();
const motionTemplates = new Map();
function loadMotion(kind) {
  const file = typeof kind === 'string' ? kind : kind.motion || kind;
  if (!file) return Promise.resolve([]);
  if (!motionTemplates.has(file)) motionTemplates.set(file, fetch(base(`npc-${file}-motion.json`))
    .then(r => { if (!r.ok) throw new Error(`NPC motion: ${r.status}`); return r.json(); })
    .then(data => data.clips.map(c => T.AnimationClip.parse(c)))
    .catch(error => { console.warn('NPC clips unavailable; retaining fallback', error); return []; }));
  return motionTemplates.get(file);
}
const base = file => new URL(`./models/${file}`, import.meta.url).href;
function load(file) {
  if (!templates.has(file)) templates.set(file, new Promise((resolve, reject) => loader.load(base(file), g => resolve(g.scene), undefined, reject)));
  return templates.get(file);
}

// Recolours only cloth: skin (warm, moderately saturated) and hair (dark) keep the texture.
function dyeable(source) {
  const m = source.clone();
  m.metalness = 0; m.roughness = 1;
  const tint = {value: new T.Color(1, 1, 1)}, amount = {value: 0};
  m.userData.tint = tint; m.userData.amount = amount;
  m.onBeforeCompile = shader => {
    shader.uniforms.uTint = tint; shader.uniforms.uTintAmount = amount;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTint;\nuniform float uTintAmount;')
      .replace('#include <map_fragment>', `#include <map_fragment>
  {
    vec3 s = sqrt(max(diffuseColor.rgb, 0.0));
    float hi = max(s.r, max(s.g, s.b)), lo = min(s.r, min(s.g, s.b));
    float sat = (hi - lo) / max(hi, 1e-3), lum = dot(s, vec3(.299, .587, .114));
    float skin = step(s.b, s.g) * step(s.g, s.r) * smoothstep(.12, .22, sat) * (1.0 - smoothstep(.55, .7, sat)) * smoothstep(.3, .42, lum);
    float cloth = (1.0 - skin) * smoothstep(.1, .2, lum);
    vec3 dyed = uTint * clamp(lum / .8, 0.0, 1.4);
    diffuseColor.rgb = mix(diffuseColor.rgb, dyed, cloth * uTintAmount);
  }`);
  };
  m.customProgramCacheKey = () => 'npc-dye';
  return m;
}

function headPiece(type, color, k) {
  const g = new T.Group(), mat = new T.MeshStandardMaterial({color, roughness: .95});
  const add = (geometry, x, y, z) => { const m = new T.Mesh(geometry, mat); m.position.set(x * k, y * k, z * k); m.castShadow = true; g.add(m); return m; };
  if (type === 'scarf') {
    add(new T.SphereGeometry(.135 * k, 16, 8, 0, Math.PI * 2, 0, Math.PI * .55), 0, .02, 0).scale.set(1, .85, 1.08);
    add(new T.SphereGeometry(.035 * k, 8, 6), 0, .06, -.13);
    for (const side of [-1, 1]) { const tail = add(new T.BoxGeometry(.04 * k, .16 * k, .012 * k), side * .03, -.04, -.14); tail.rotation.z = side * .2; }
  } else if (type === 'futou') {
    add(new T.CylinderGeometry(.118 * k, .128 * k, .1 * k, 16), 0, .07, -.005);
    add(new T.SphereGeometry(.085 * k, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, .11, -.02);
    for (const side of [-1, 1]) add(new T.BoxGeometry(.3 * k, .025 * k, .012 * k), side * .25, .09, -.06);
  } else if (type === 'straw') {
    add(new T.ConeGeometry(.36 * k, .15 * k, 24, 1, true), 0, .17, 0).material.side = T.DoubleSide;
    add(new T.SphereGeometry(.025 * k, 8, 6), 0, .25, 0);
  } else if (type === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; add(new T.SphereGeometry(.026 * k, 8, 6), .09 + .03 * Math.cos(a), .17 + .03 * Math.sin(a), -.03); }
    add(new T.SphereGeometry(.02 * k, 8, 6), .09, .17, -.005).material = new T.MeshStandardMaterial({color: 0xd9b45a});
  }
  return g;
}

let swordTemplate = null;
// Swap the box sword for the generated jian while keeping the group's pivot (guard at origin, blade down).
export function fitSword(sword) {
  if (!globalThis.document?.createElement) return;
  swordTemplate ??= load('sword.glb');
  swordTemplate.then(src => {
    const blade = src.clone(true);
    blade.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.metalness = .2; o.material.roughness = .6; } });
    for (const child of sword.children) child.visible = false;
    sword.add(blade);
  }).catch(error => console.warn('sword model failed to load; keeping the box sword', error));
}

export function mountActorModel(actor, look) {
  const u = actor.userData, kind = KINDS[look.kind], handle = {ready: false, sync() {}};
  if (!kind || !globalThis.document?.createElement) return handle;
  const props = new Set();
  u.sword.traverse(o => props.add(o));
  const body = [];
  u.rig.traverse(o => { if (o.isMesh && !props.has(o)) body.push(o); });

  Promise.all([load(kind.file), loadMotion(kind.motion === false ? '' : (kind.motion || look.kind))]).then(([src, clips]) => {
    const model = cloneSkinned(src), wrapper = new T.Group(), materials = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      o.material = dyeable(o.material); materials.push(o.material);
    });
    wrapper.add(model);
    wrapper.rotation.y = -Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new T.Box3(), part = new T.Box3();
    model.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bounds.union(part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); } });
    const scale = kind.height / (bounds.max.y - bounds.min.y);
    wrapper.scale.setScalar(scale);
    wrapper.position.y = -bounds.min.y * scale;
    const saved = {position: u.rig.position.clone(), quaternion: u.rig.quaternion.clone()};
    u.rig.position.set(0, 0, 0); u.rig.quaternion.identity();
    u.rig.add(wrapper);
    actor.updateMatrixWorld(true);

    const bone = {};
    for (const [key, name] of Object.entries(BONES)) bone[key] = model.getObjectByName(T.PropertyBinding.sanitizeNodeName(name)) || (BONE_ALIASES[key] || []).map(alias => model.getObjectByName(alias)).find(Boolean);
    const missing = Object.keys(BONES).filter(key => !bone[key]);
    if (missing.length) { wrapper.removeFromParent(); u.rig.position.copy(saved.position); u.rig.quaternion.copy(saved.quaternion); console.warn('npc model: missing bones', look.kind, missing); return; }
    const tripoRig = !model.getObjectByName('mixamorigHips');
    const space = node => u.rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(node.getWorldQuaternion(new T.Quaternion()));
    const rest = {}, parent = {};
    for (const key of Object.keys(BONES)) { rest[key] = space(bone[key]); parent[key] = space(bone[key].parent); }
    const hangs = {rightArm: new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), tripoRig ? 0 : HANG), leftArm: new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), tripoRig ? 0 : -HANG)};
    const elbow = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -ELBOW), foreLocal = {};
    for (const [arm, fore] of [['rightArm', 'rightFore'], ['leftArm', 'leftFore']])
      foreLocal[fore] = hangs[arm].clone().multiply(rest[arm]).invert().multiply(elbow.clone().multiply(hangs[arm]).multiply(rest[fore]));
    const shoulder = name => u.rig.worldToLocal(bone[name].getWorldPosition(new T.Vector3()));
    u.arms[0].position.copy(shoulder('rightArm'));
    u.arms[1].position.copy(shoulder('leftArm'));
    if (look.head) {
      const k = kind.height / 1.8, piece = headPiece(look.head[0], look.head[1], k);
      piece.position.copy(shoulder('head')).y += .12 * k;
      u.rig.add(piece);
      bone.head.attach(piece);
    }
    u.rig.position.copy(saved.position); u.rig.quaternion.copy(saved.quaternion);

    const allBones = [];
    model.traverse(o => { if (o.isBone) allBones.push({node:o, q:o.quaternion.clone(), p:o.position.clone()}); });
    // Source walk travels 1.845m in 1.033s, with its rest hips at 1.043m.
    const hipNode = model.getObjectByName('mixamorigHips') || model.getObjectByName('Hip') || model.getObjectByName('Pelvis');
    const hipHeight = u.rig.worldToLocal(hipNode.getWorldPosition(new T.Vector3())).y;
    const motion = handle.motion = new NpcMotion(model, clips, (u.phase || 0) / 10, 1.7857 * hipHeight / 1.04275, look.motionProfile || npcMotionProfile('',look.kind));
    const gesture = new NpcGesture(actor, model, kind.height);
    handle.handPoint = side => gesture.handPoint(side);
    handle.betweenHands = () => gesture.betweenHands();
    let clipActive = false, blendAge = 1, blendFrom = [];
    const capture = () => allBones.map(b => ({q:b.node.quaternion.clone(), p:b.node.position.clone()}));
    const restore = () => { for (const b of allBones) { b.node.quaternion.copy(b.q); b.node.position.copy(b.p); } };

    const q1 = new T.Quaternion(), q2 = new T.Quaternion(), knee = new T.Quaternion(), axisX = new T.Vector3(1, 0, 0);
    const drive = (key, joint, extra) => {
      q1.copy(joint.quaternion); if (extra) q1.multiply(extra); q1.multiply(rest[key]);
      bone[key].quaternion.copy(q2.copy(parent[key]).invert().multiply(q1));
    };
    const leg = (key, shin, joint) => {
      drive(key, joint);
      knee.setFromAxisAngle(axisX, Math.max(0, -joint.rotation.x) * 1.4);
      bone[shin].quaternion.copy(q2.copy(rest[key]).invert().multiply(knee).multiply(rest[shin]));
    };
    handle.ready = true;
    handle.sync = (baseColor, state = {}) => {
      for (const mesh of body) mesh.visible = false;
      const color = u.outfitColor ?? baseColor, dyed = kind.dye || color !== baseColor;
      for (const m of materials) { m.userData.tint.value.setHex(color); m.userData.amount.value = dyed ? 1 : 0; }
      const dt = Math.max(0, Math.min(.1, state.dt || 0));
      state = {...state, formal:state.formal ?? ['prince','guard','constable','envoy'].includes(look.kind)};
      const changing = !!motion.actions.get(npcMotionName(state)) !== clipActive;
      const before = changing ? capture() : null;
      const active = motion.update(dt, state);
      if (active !== clipActive) { blendFrom = before; blendAge = 0; }
      clipActive = active;
      if (active) {
        u.rig.position.set(0, 0, 0); u.rig.rotation.set(0, 0, 0);
        // Preserve the live gaze without replacing the captured head posture.
        actor.updateMatrixWorld(true);
        const localUp = new T.Vector3(0,1,0).applyQuaternion(bone.head.parent.getWorldQuaternion(q1).invert());
        bone.head.quaternion.premultiply(q2.setFromAxisAngle(localUp,u.head.rotation.y || 0));
      } else {
        // Reset also during the blend: undriven hips/spine/fingers otherwise
        // retain a fraction of the last walking or seated pose indefinitely.
        restore();
        drive('rightArm', u.arms[0], hangs.rightArm);
        drive('leftArm', u.arms[1], hangs.leftArm);
        bone.rightFore.quaternion.copy(foreLocal.rightFore);
        bone.leftFore.quaternion.copy(foreLocal.leftFore);
        leg('rightLeg', 'rightShin', u.legs[0]);
        leg('leftLeg', 'leftShin', u.legs[1]);
        drive('head', u.head);
      }
      if (blendAge < .28 && state.hp > 0) {
        blendAge += dt;
        const k = Math.min(1, blendAge / .28);
        for (let i=0; i<allBones.length; i++) {
          const b=allBones[i], from=blendFrom[i];
          b.node.quaternion.slerpQuaternions(from.q,b.node.quaternion.clone(),k);
          b.node.position.lerpVectors(from.p,b.node.position,k);
        }
      }
      gesture.update(dt, state.upperBody, active);
      handle.activeClip = active ? motion.current + (state.upperBody ? '+'+state.upperBody.kind : '') : 'choreography';
    };
  }).catch(error => console.warn('npc model failed to load; keeping the procedural figure', look.kind, error));
  return handle;
}
