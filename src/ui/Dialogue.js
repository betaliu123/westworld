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

    for (const npc of npcs) {
      const text = npc.brain.bubble;
      if (!text) continue;
      // 距离裁剪
      const dx = npc.pos.x - camPos.x;
      const dz = npc.pos.z - camPos.z;
      if (dx * dx + dz * dz > 45 * 45) continue;

      this._v.set(npc.pos.x, 3.0, npc.pos.z); // 最上层：让下面依次留给名字牌、emoji、血条
      this._v.project(this.camera);
      if (this._v.z > 1) continue; // 在相机背后

      const x = (this._v.x * 0.5 + 0.5) * w;
      const y = (-this._v.y * 0.5 + 0.5) * h;

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
