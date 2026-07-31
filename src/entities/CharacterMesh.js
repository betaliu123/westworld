// CharacterMesh.js — 复用的人物网格构造器：低多边形西部造型 + 可动画的四肢。
// 返回一个 THREE.Group，并把可动关节挂在 userData 上供动画驱动。
// 细节：眼睛 / 帽带 / 马甲 / 领巾 / 枪套；女性为连衣裙 + 发髻造型。

import * as THREE from "three";
import { pick } from "../core/MathUtils.js";

const SKIN = [0xe8b892, 0xd9a074, 0xc88a5a, 0xf0c8a0, 0xa5714a];
const SHIRT = [0x9c4a3a, 0x3a5a7a, 0x4a6a3a, 0x6a5a3a, 0x7a4a6a, 0x8a8a3a, 0x5a5a6a];
const PANTS = [0x3a2f22, 0x2a3540, 0x4a3a2a, 0x30303a];
const HAT = [0x3a2a1a, 0x5a4020, 0x2a2018, 0x6b4a2b];
const DRESS = [0x8a3a4a, 0x5a4a8a, 0x3a6a5a, 0xa06a3a, 0x6a3a6a];
const HAIR = [0x2a1a10, 0x4a2a14, 0x6a4a20, 0x1a1a1a, 0x8a6a3a];

function mat(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
}

/**
 * @param {object} opts { scale, skin, shirt, pants, hat, female, dress, hair }
 * @returns THREE.Group
 */
export function createCharacter(opts = {}) {
  const g = new THREE.Group();
  const female = !!opts.female;
  const skin = mat(opts.skin ?? pick(SKIN));
  const shirtColor = opts.shirt ?? pick(SHIRT);
  const shirt = mat(shirtColor);
  const pants = mat(opts.pants ?? pick(PANTS));
  const hatColor = opts.hat ?? pick(HAT);

  // 躯干
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.12;
  torso.castShadow = true;
  g.add(torso);

  // 皮马甲（前襟两片，西部感）
  const vestMat = mat(0x4a3018, 0.8);
  for (const side of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.04), vestMat);
    flap.position.set(side * 0.16, 1.14, 0.18);
    g.add(flap);
  }

  // 腰带 + 铜扣
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.12, 0.36), mat(0x2a1a10, 0.6));
  belt.position.y = 0.76;
  g.add(belt);
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 0.7, roughness: 0.35 })
  );
  buckle.position.set(0, 0.76, 0.19);
  g.add(buckle);

  // 枪套（右胯）+ 枪柄
  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.08), mat(0x3a2412, 0.75));
  holster.position.set(0.35, 0.68, 0.06);
  holster.rotation.z = 0.12;
  g.add(holster);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), mat(0x1a1a1a, 0.5));
  grip.position.set(0.35, 0.82, 0.06);
  g.add(grip);

  // 头
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), skin);
  head.position.y = 1.72;
  head.castShadow = true;
  g.add(head);

  // 眼睛（两个小黑块，正面）
  const eyeMat = mat(0x1a0f08, 0.5);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.02), eyeMat);
    eye.position.set(side * 0.075, 1.75, 0.165);
    g.add(eye);
  }

  // 腿（挂在枢轴上，围绕髋部摆动）；女性长裙遮腿（保留空枢轴保证动画兼容）
  const legGeo = new THREE.BoxGeometry(0.22, 0.72, 0.24);
  const makeLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.76, 0);
    if (!female) {
      const leg = new THREE.Mesh(legGeo, pants);
      leg.position.y = -0.36;
      leg.castShadow = true;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.32), mat(0x2a1a10, 0.6));
      boot.position.set(0, -0.72, 0.04);
      leg.add(boot);
      pivot.add(leg);
    } else {
      // 裙摆下只露小靴子
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.3), mat(0x3a2415, 0.6));
      boot.position.set(0, -0.68, 0.04);
      pivot.add(boot);
    }
    g.add(pivot);
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // 女性连衣裙（锥形裙摆，盖过腿部）
  if (female) {
    const dressMat = mat(opts.dress ?? pick(DRESS), 0.8);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.62, 0.9, 10), dressMat);
    skirt.position.y = 0.62;
    skirt.castShadow = true;
    g.add(skirt);
    // 上身也换成裙子同色（罩衫感）
    torso.material = dressMat;
  }

  // 手臂（围绕肩部摆动）
  const armGeo = new THREE.BoxGeometry(0.18, 0.66, 0.2);
  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.42, 1.42, 0);
    const arm = new THREE.Mesh(armGeo, female ? torso.material : shirt);
    arm.position.y = -0.33;
    arm.castShadow = true;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), skin);
    hand.position.y = -0.66;
    arm.add(hand);
    pivot.add(arm);
    g.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // 领巾（红色，西部味）；女性用浅色丝巾
  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.16, 0.2),
    mat(female ? 0xe8c8d0 : 0xb03a2a, 0.7)
  );
  scarf.position.y = 1.5;
  scarf.position.z = 0.02;
  g.add(scarf);

  let hatGroup = null;
  if (female) {
    // 发髻：头顶发团 + 后脑发髻
    const hairMat = mat(opts.hair ?? pick(HAIR), 0.75);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.14, 0.35), hairMat);
    cap.position.y = 1.94;
    g.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), hairMat);
    bun.position.set(0, 1.9, -0.2);
    g.add(bun);
    hatGroup = new THREE.Group(); // 空组，占位兼容动画
    g.add(hatGroup);
  } else {
    // 牛仔帽 + 帽带
    hatGroup = new THREE.Group();
    const hatMat = mat(hatColor, 0.7);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 12), hatMat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.24, 12), hatMat);
    crown.position.y = 0.13;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.225, 0.07, 12), mat(0x8a2a20, 0.65));
    band.position.y = 0.04;
    hatGroup.add(brim, crown, band);
    hatGroup.position.y = 1.94;
    hatGroup.castShadow = true;
    g.add(hatGroup);
  }

  const scale = opts.scale ?? 1;
  g.scale.setScalar(scale);

  g.userData.joints = { legL, legR, armL, armR, head, hatGroup };
  g.userData.animPhase = Math.random() * Math.PI * 2;
  return g;
}

// 行走动画：walkAmount 0-1（移动强度），time 累积时间
export function animateCharacter(charGroup, walkAmount, time, extra = {}) {
  const j = charGroup.userData.joints;
  if (!j) return;
  const phase = time * 9 + charGroup.userData.animPhase;
  const swing = Math.sin(phase) * 0.7 * walkAmount;
  j.legL.rotation.x = swing;
  j.legR.rotation.x = -swing;
  // 手臂反向摆动；受惊/愤怒时抬手
  const armBase = extra.armRaise ?? 0;
  j.armL.rotation.x = -swing + armBase;
  j.armR.rotation.x = swing + armBase;
  // 持枪姿态（aimPose 0→1）：右臂平举向前，左臂收在身侧，腿摆减弱
  const aim = extra.aimPose ?? 0;
  if (aim > 0.001) {
    const armForward = -Math.PI / 2; // 平举
    j.armR.rotation.x = j.armR.rotation.x * (1 - aim) + armForward * aim;
    j.armL.rotation.x = j.armL.rotation.x * (1 - aim) + (-0.25) * aim;
    // 端枪时双腿别大幅摆动
    j.legL.rotation.x *= 1 - aim * 0.55;
    j.legR.rotation.x *= 1 - aim * 0.55;
  }
  // 轻微上下起伏
  charGroup.position.y = (extra.baseY ?? 0) + Math.abs(Math.sin(phase)) * 0.05 * walkAmount;
  // 头部朝向偏移（张望）
  if (extra.headTurn !== undefined) j.head.rotation.y = extra.headTurn;
}
