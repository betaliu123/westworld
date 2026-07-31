// EmojiPops.js — NPC 头顶的 emoji 表情
// 比台词更快传达情绪（震惊/害怕/得意），放在气泡上方一点，短暂出现后消失。
import * as THREE from "three";
import { noteEmojiGone } from "../npc/EmojiRateLimit.js";

const SHOW_DIST = 40;

export class EmojiPops {
  constructor(camera) {
    this.camera = camera;
    this.layer = document.getElementById("emoji-layer");
    this.pool = [];
    this._v = new THREE.Vector3();
  }

  _acquire() {
    for (const item of this.pool) {
      if (!item.inUse) { item.inUse = true; return item; }
    }
    const el = document.createElement("div");
    el.className = "npc-emoji";
    this.layer.appendChild(el);
    const item = { el, inUse: true, last: "" };
    this.pool.push(item);
    return item;
  }

  update(npcs, playerPos) {
    if (!this.layer) return;
    for (const item of this.pool) { item.inUse = false; item.el.style.display = "none"; }

    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const npc of npcs) {
      const sym = npc.brain?.emoji;
      if (!sym || !npc.alive) continue;
      if (playerPos) {
        const dx = npc.pos.x - playerPos.x;
        const dz = npc.pos.z - playerPos.z;
        if (dx * dx + dz * dz > SHOW_DIST * SHOW_DIST) continue;
      }
      this._v.set(npc.pos.x, 3.0, npc.pos.z); // 冒泡 2.7 的上方一点，仍贴着头顶
      this._v.project(this.camera);
      if (this._v.z > 1) continue;

      const item = this._acquire();
      // 换了新表情就重播一次弹出动画
      if (item.last !== sym) {
        item.el.textContent = sym;
        item.last = sym;
        item.el.style.animation = "none";
        void item.el.offsetWidth;
        item.el.style.animation = "";
      }
      item._npc = npc;
      item.el.style.display = "block";
      item.el.style.left = `${(this._v.x * 0.5 + 0.5) * w}px`;
      item.el.style.top = `${(-this._v.y * 0.5 + 0.5) * h}px`;
    }

    // 这一帧没再出现的 emoji → 限流器减额，腾位置给别人
    for (const item of this.pool) {
      if (!item.inUse && item._npc) {
        noteEmojiGone();
        item._npc = null;
      }
    }
  }
}
