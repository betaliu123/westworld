// StageMap.js — AI 剧场的舞台坐标：站位环 + 空地校验
// 主街 x∈[-8,8] 是 Town._scatterClear 保证的无杂物走廊，适合当舞台。

import { THEATER_CONFIG } from "../config/theaterData.js";

// 各角色相对舞台中心的站位（贴合"两人对峙 + 旁观者围观"的构图）
const ROLE_OFFSET = {
  // 决斗：两人拉开距离面对面
  gunA: { x: -3.4, z: 0 },
  gunB: { x: 3.4, z: 0 },
  judge: { x: 0, z: -3.2 },
  // 三角：两个追求者夹着中心人物
  suitorA: { x: -2.4, z: 0.6 },
  suitorB: { x: 2.4, z: 0.6 },
  center: { x: 0, z: 2.2 },
  confidant: { x: 2.8, z: 3.2 },
  // 扒手：贴身作案
  thief: { x: 0.9, z: -1.2 },
  victim: { x: -0.6, z: 0.4 },
  witness: { x: 3.0, z: 2.0 },
  // 围观
  crowd: { x: 0, z: -4.4 },
};

export class StageMap {
  constructor(town) {
    this.town = town;
    this.center = { ...THEATER_CONFIG.stage };
  }

  /** 舞台中心（可按需换到别的空地） */
  setCenter(x, z) {
    this.center = { x, z };
  }

  /** 某角色的落点（已过碰撞校验）；同角色多人时用 index 摊开 */
  spotFor(roleId, index = 0, total = 1) {
    const off = ROLE_OFFSET[roleId];
    let x, z;
    if (off) {
      // 同 roleId 多人（如 crowd×2）沿切线摊开
      const spread = total > 1 ? (index - (total - 1) / 2) * 1.6 : 0;
      x = this.center.x + off.x + spread;
      z = this.center.z + off.z;
    } else {
      // 未定义角色：围成圈
      const a = (index / Math.max(total, 1)) * Math.PI * 2;
      x = this.center.x + Math.cos(a) * THEATER_CONFIG.stageRadius;
      z = this.center.z + Math.sin(a) * THEATER_CONFIG.stageRadius;
    }
    return this._safe(x, z);
  }

  /** 观众席：玩家进场后站的位置提示用（当前仅用于调试可视化） */
  audienceSpot(index = 0, total = 4) {
    const a = (index / Math.max(total, 1)) * Math.PI * 2;
    return this._safe(
      this.center.x + Math.cos(a) * (THEATER_CONFIG.stageRadius + 2.4),
      this.center.z + Math.sin(a) * (THEATER_CONFIG.stageRadius + 2.4)
    );
  }

  /** 散场时朝四面八方走开的点 */
  exitSpot() {
    const a = Math.random() * Math.PI * 2;
    const r = 22 + Math.random() * 10;
    return this._safe(this.center.x + Math.cos(a) * r, this.center.z + Math.sin(a) * r);
  }

  distanceToCenter(pos) {
    return Math.hypot(pos.x - this.center.x, pos.z - this.center.z);
  }

  _safe(x, z) {
    if (this.town && this.town.resolveCollision) {
      const r = this.town.resolveCollision(x, z, 0.6);
      return { x: r.x, z: r.z };
    }
    return { x, z };
  }
}
