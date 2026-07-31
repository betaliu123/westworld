// HealthBars.js — 战斗中 NPC 的血条
// 设计约束（避免满屏乱）：
//   - 只显示"在战斗中且离玩家不远"的 NPC
//   - 最近的若干个显示细血条，其余只在名字位置点一个小圆点
//   - 敌方红、友方绿；圆点的不透明度反映剩余血量
import * as THREE from "three";

const MAX_BARS = 6;      // 同时最多几条细血条
const MAX_DOTS = 10;     // 再往外最多几个圆点
const SHOW_DIST = 30;    // 超出这个距离一律不显示

export class HealthBars {
  constructor(camera, factions) {
    this.camera = camera;
    this.factions = factions;
    this.layer = document.getElementById("healthbar-layer");
    this.barPool = [];
    this.dotPool = [];
    this._v = new THREE.Vector3();
  }

  _acquire(pool, className) {
    for (const item of pool) {
      if (!item.inUse) { item.inUse = true; return item; }
    }
    const el = document.createElement("div");
    el.className = className;
    if (className === "npc-hpbar") {
      el.innerHTML = '<i></i>';
    }
    this.layer.appendChild(el);
    const item = { el, inUse: true, fill: el.querySelector("i") };
    pool.push(item);
    return item;
  }

  update(npcs, playerPos) {
    if (!this.layer) return;
    for (const p of [this.barPool, this.dotPool]) {
      for (const item of p) { item.inUse = false; item.el.style.display = "none"; }
    }
    if (!this.factions?.inCombat && !this.factions?.allies.size) return;

    // 收集需要显示的目标：只要掉了血、且在战斗或逃跑中，就给反馈（不只限阵营）
    // 即：你打了谁，谁就该顶着血条，哪怕他在逃跑
    const list = [];
    for (const npc of npcs) {
      if (!npc.alive || npc.brain?.state === "DOWN") continue;
      const b = npc.brain;
      const damaged = (npc.hp ?? npc.maxHp) < (npc.maxHp || 1);
      const inFight = b?.state === "ANGRY" || b?.state === "FLEE";
      if (!damaged || !inFight) continue;
      const side = this.factions.sideOf(npc); // enemy/ally 决定红绿，未标阵营按 enemy
      const d = Math.hypot(npc.pos.x - playerPos.x, npc.pos.z - playerPos.z);
      if (d > SHOW_DIST) continue;
      list.push({ npc, side: side || "enemy", d });
    }
    if (!list.length) return;
    list.sort((a, b) => a.d - b.d);

    const w = window.innerWidth;
    const h = window.innerHeight;
    let bars = 0;
    let dots = 0;

    for (const { npc, side } of list) {
      const ratio = Math.max(0, Math.min(1, (npc.hp || 0) / (npc.maxHp || 1)));
      const useBar = bars < MAX_BARS;
      if (!useBar && dots >= MAX_DOTS) break;

      this._v.set(npc.pos.x, useBar ? 2.4 : 2.5, npc.pos.z);
      this._v.project(this.camera);
      if (this._v.z > 1) continue;
      const x = (this._v.x * 0.5 + 0.5) * w;
      const y = (-this._v.y * 0.5 + 0.5) * h;

      if (useBar) {
        bars++;
        const item = this._acquire(this.barPool, "npc-hpbar");
        item.el.style.display = "block";
        item.el.style.left = `${x}px`;
        item.el.style.top = `${y}px`;
        item.el.classList.toggle("ally", side === "ally");
        item.fill.style.width = `${Math.round(ratio * 100)}%`;
      } else {
        dots++;
        const item = this._acquire(this.dotPool, "npc-hpdot");
        item.el.style.display = "block";
        item.el.style.left = `${x}px`;
        item.el.style.top = `${y}px`;
        item.el.classList.toggle("ally", side === "ally");
        // 血少了圆点变暗，一眼能看出谁快倒了
        item.el.style.opacity = `${0.35 + ratio * 0.65}`;
      }
    }
  }
}
