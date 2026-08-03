// Dialogue.js — 把 NPC 头顶对话气泡从 3D 世界投影到屏幕 2D，复用 DOM 节点池。

import * as THREE from "three";

export class Dialogue {
  constructor(camera) {
    this.camera = camera;
    this.layer = document.getElementById("bubble-layer");
    this.pool = []; // { el, inUse }
    this._v = new THREE.Vector3();
  }

  _acquire() {
    for (const b of this.pool) {
      if (!b.inUse) {
        b.inUse = true;
        return b;
      }
    }
    const el = document.createElement("div");
    el.className = "bubble";
    this.layer.appendChild(el);
    const b = { el, inUse: true };
    this.pool.push(b);
    return b;
  }

  // npcs: NPC[] ; 只为携带 bubble 文本且在视野内的 NPC 显示
  update(npcs) {
    // 先释放全部
    for (const b of this.pool) {
      b.inUse = false;
      b.el.style.display = "none";
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const camPos = this.camera.position;

    // 已占用的屏幕矩形，用来把互相压住的冒泡往上错开
    // （几个人同时说话时，冒泡会糊成一团看不清）
    const placed = [];
    const BUBBLE_H = 30;   // 冒泡大致高度（含小三角）
    const BUBBLE_W = 190;  // 大致宽度，用于判断横向是否重叠
    const LIFT = 34;       // 每次上移的像素

    // 近的先放（更重要），远的往上让
    const list = [];
    for (const npc of npcs) {
      if (!npc.brain.bubble) continue;
      const dx = npc.pos.x - camPos.x;
      const dz = npc.pos.z - camPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 45 * 45) continue;
      list.push({ npc, d2 });
    }
    list.sort((a, b) => a.d2 - b.d2);

    for (const { npc } of list) {
      const text = npc.brain.bubble;
      this._v.set(npc.pos.x, 3.0, npc.pos.z); // 最上层：让下面依次留给名字牌、emoji、血条
      this._v.project(this.camera);
      if (this._v.z > 1) continue; // 在相机背后

      const x = (this._v.x * 0.5 + 0.5) * w;
      let y = (-this._v.y * 0.5 + 0.5) * h;

      // 与已放好的冒泡重叠就往上挪，最多挪 4 次
      for (let tries = 0; tries < 4; tries++) {
        const hit = placed.some((p) => Math.abs(p.x - x) < BUBBLE_W && Math.abs(p.y - y) < BUBBLE_H);
        if (!hit) break;
        y -= LIFT;
      }
      placed.push({ x, y });

      const b = this._acquire();
      b.el.textContent = text;
      b.el.style.display = "block";
      b.el.style.left = `${x}px`;
      b.el.style.top = `${y}px`;
      // 情绪着色
      const state = npc.brain.state;
      b.el.className = "bubble" + (state === "ANGRY" ? " angry" : (state === "FLEE" || state === "STARTLED") ? " scared" : "");
    }
  }
}
