// Props.js — 装饰道具：仙人掌、水塔、木桶、拴马柱、路灯、滚草、栅栏。

import * as THREE from "three";
import { randRange, randInt } from "../core/MathUtils.js";

function mat(color, rough = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

export function createCactus() {
  const g = new THREE.Group();
  const green = mat(0x4a7a3a);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, randRange(2.2, 3.4), 8), green);
  trunk.castShadow = true;
  trunk.position.y = trunk.geometry.parameters.height / 2;
  g.add(trunk);
  const armCount = randInt(1, 2);
  for (let i = 0; i < armCount; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1, 8), green);
    const side = i === 0 ? 1 : -1;
    const y = randRange(1.2, 1.8);
    arm.position.set(side * 0.45, y, 0);
    arm.rotation.z = -side * 0.9;
    g.add(arm);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8), green);
    up.position.set(side * 0.85, y + 0.5, 0);
    g.add(up);
  }
  g.userData.blockRadius = 0.6;
  return g;
}

export function createBarrel() {
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.4, 1.1, 12),
    mat(0x6b4a2b, 0.85)
  );
  barrel.castShadow = true;
  barrel.position.y = 0.55;
  const g = new THREE.Group();
  g.add(barrel);
  // 铁箍
  for (const y of [0.2, 0.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 16), mat(0x30251a, 0.6));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  g.userData.blockRadius = 0.5;
  return g;
}

export function createWaterTower() {
  const g = new THREE.Group();
  const wood = mat(0x5e4326, 0.9);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 14), wood);
  tank.castShadow = true;
  tank.position.y = 8;
  g.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.4, 14), mat(0x3a2a1a));
  roof.position.y = 10.3;
  g.add(roof);
  // 支腿
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 0.3), wood);
    leg.position.set(Math.cos(a) * 1.9, 3.2, Math.sin(a) * 1.9);
    leg.rotation.x = Math.sin(a) * 0.08;
    leg.rotation.z = -Math.cos(a) * 0.08;
    leg.castShadow = true;
    g.add(leg);
  }
  g.userData.blockRadius = 2.6;
  return g;
}

export function createHitchPost() {
  const g = new THREE.Group();
  const wood = mat(0x4a3018);
  for (const x of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 6), wood);
    post.position.set(x, 0.6, 0);
    post.castShadow = true;
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 1.05;
  g.add(bar);
  g.userData.blockRadius = 0;
  return g;
}

// 路灯（夜晚发光，带小点光源）
export function createStreetLamp() {
  const g = new THREE.Group();
  const metal = mat(0x2a2a2a, 0.5);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4, 8), metal);
  pole.position.y = 2;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8), metal);
  arm.position.set(0, 3.9, 0.4);
  g.add(arm);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x332a10,
    emissive: 0xffcf7a,
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), glassMat);
  glass.position.set(0, 3.8, 0.75);
  g.add(glass);
  const light = new THREE.PointLight(0xffcf7a, 0, 16, 2);
  light.position.set(0, 3.8, 0.75);
  g.add(light);
  g.userData.lampGlass = glassMat;
  g.userData.lampLight = light;
  g.userData.blockRadius = 0.3;
  return g;
}

export function createTumbleweed() {
  const geo = new THREE.IcosahedronGeometry(0.5, 1);
  const weed = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x9a7a44, roughness: 1, wireframe: true })
  );
  weed.position.y = 0.5;
  const g = new THREE.Group();
  g.add(weed);
  g.userData.tumble = true;
  g.userData.blockRadius = 0;
  return g;
}

export function createFence(length) {
  const g = new THREE.Group();
  const wood = mat(0x5e4020);
  const segments = Math.floor(length / 1.2);
  for (let i = 0; i <= segments; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood);
    post.position.set(-length / 2 + i * 1.2, 0.55, 0);
    post.castShadow = true;
    g.add(post);
  }
  for (const y of [0.45, 0.9]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.08), wood);
    rail.position.y = y;
    g.add(rail);
  }
  return g;
}

// 民居门口的邮箱（木杆 + 铁皮箱 + 小旗）
export function createMailbox() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 6), mat(0x4a3018));
  post.position.y = 0.55;
  post.castShadow = true;
  g.add(post);
  const boxBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10, 1, false, 0, Math.PI), mat(0x5a6a72, 0.5));
  boxBody.rotation.z = Math.PI / 2;
  boxBody.position.y = 1.18;
  g.add(boxBody);
  const boxBottom = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), mat(0x4a5a62, 0.5));
  boxBottom.position.y = 1.1;
  g.add(boxBottom);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.06), mat(0xc03a2a, 0.6));
  flag.position.set(0.24, 1.3, 0);
  g.add(flag);
  return g;
}
