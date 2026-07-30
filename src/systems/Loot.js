// Loot.js — 掉落物：现金 / 车钥匙。生成 3D 拾取物，处理旋转漂浮与拾取。

import * as THREE from "three";
import { randRange } from "../core/MathUtils.js";

export const LootType = { CASH: "cash", KEY: "key" };

function makeCashMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a8a4a, roughness: 0.6, emissive: 0x1a3a1a, emissiveIntensity: 0.3 });
  for (let i = 0; i < 3; i++) {
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.26), mat);
    bill.position.y = i * 0.05;
    bill.rotation.y = randRange(-0.2, 0.2);
    g.add(bill);
  }
  return g;
}

function makeKeyMesh() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcf5a, metalness: 0.8, roughness: 0.3, emissive: 0x5a4400, emissiveIntensity: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), gold);
  g.add(ring);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), gold);
  shaft.position.y = -0.28;
  g.add(shaft);
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.06), gold);
  tooth.position.set(0.08, -0.44, 0);
  g.add(tooth);
  g.scale.setScalar(1.2);
  return g;
}

export class LootItem {
  constructor(scene, type, pos, payload) {
    this.type = type;
    this.payload = payload; // cash: 金额; key: null
    this.picked = false;
    switch (type) {
      case LootType.CASH: this.mesh = makeCashMesh(); break;
      case LootType.KEY: this.mesh = makeKeyMesh(); break;
      default: this.mesh = makeCashMesh();
    }
    this.mesh.position.set(pos.x, 0.8, pos.z);
    this.baseY = 0.8;
    this.spin = Math.random() * Math.PI * 2;
    scene.add(this.mesh);
  }

  update(dt, time) {
    this.spin += dt * 2;
    this.mesh.rotation.y = this.spin;
    this.mesh.position.y = this.baseY + Math.sin(time * 3 + this.spin) * 0.12;
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}

export class Loot {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.time = 0;
  }

  // NPC 被击倒时按其掉落配置生成（每个 NPC 只掉一次，防止反复击倒刷钱）
  dropFromNPC(npc) {
    if (npc._looted) return;
    npc._looted = true;
    const pos = npc.pos;
    // 现金几乎必掉
    this.spawn(LootType.CASH, { x: pos.x + randRange(-0.6, 0.6), z: pos.z + randRange(-0.6, 0.6) }, npc.cashReserve);
    // 车钥匙（稀有）
    if (npc.hasCarKey) {
      this.spawn(LootType.KEY, { x: pos.x + randRange(-0.8, 0.8), z: pos.z + randRange(-0.8, 0.8) }, null);
    }
  }

  spawn(type, pos, payload) {
    this.items.push(new LootItem(this.scene, type, pos, payload));
  }

  // 找到玩家附近可拾取的最近物品
  nearest(playerPos, range = 2.2) {
    let best = null;
    let bestD = Infinity;
    for (const item of this.items) {
      if (item.picked) continue;
      const d = Math.hypot(item.mesh.position.x - playerPos.x, item.mesh.position.z - playerPos.z);
      if (d < range && d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  remove(item) {
    item.picked = true;
    item.dispose(this.scene);
    this.items = this.items.filter((i) => i !== item);
  }

  update(dt) {
    this.time += dt;
    for (const item of this.items) item.update(dt, this.time);
  }
}
