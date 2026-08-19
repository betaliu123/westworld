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

  // ---- 追加事件的角色站位（没有定义就会走兜底圆圈，看着像各站各的）----
  // 银行门口的通缉犯：猎人堵着，嫌疑人被逼在台阶下，职员躲在门后
  hunter: { x: -2.2, z: -0.6 },
  suspect: { x: 1.4, z: 1.0 },
  clerk: { x: 3.2, z: -2.4 },
  // 马厩偷马贼：马夫抓着贼，买主在旁边争
  // （贼用的 roleId 也是 thief，与扒手树共用上面那个站位，语义相近：都是被抓现行）
  groom: { x: -2.0, z: 0.4 },
  buyer: { x: 2.8, z: -0.8 },
  // 医生门前：医生堵在门口，两个伤号一左一右
  doc: { x: 0, z: -2.6 },
  miner: { x: -2.6, z: 0.8 },
  mother: { x: 2.4, z: 0.8 },
  // 棺材前的遗产：牧师居中，遗孀与弟弟对峙
  priest: { x: 0, z: -2.2 },
  widow: { x: -2.6, z: 1.0 },
  brother: { x: 2.6, z: 1.0 },
  // 井边水权：井在中间，农户与淘金客隔井对望，老镇民在侧
  farmer: { x: -2.8, z: 0.6 },
  digger: { x: 2.6, z: 0.2 },
  elder: { x: 0.4, z: -2.8 },

  // ---- 个人/势力小剧场站位（不定义就会走兜底圆圈、全部叠在一点）----
  // 帮派内讧：两人左右对峙，围观者靠边
  member_a: { x: -2.4, z: 0.4 },
  member_b: { x: 2.4, z: 0.4 },
  onlooker: { x: 0, z: -3.0 },
  // 敌方忌惮：黑蹄会头目在前，跟班两侧，路人回避
  rival_boss: { x: -1.8, z: 0.6 },
  hench: { x: -0.4, z: 2.2 },
  neutral: { x: 3.0, z: -1.6 },
  // 账本疑云：主角居中，老板与赌徒两侧
  erin: { x: 0, z: -1.2 },
  boss: { x: -2.6, z: 1.2 },
  rival: { x: 2.6, z: 1.2 },
  // 亡命追债：枪手主角，债主逼近，好友劝架
  jack: { x: 0, z: -1.2 },
  debtor: { x: 2.2, z: 1.4 },
  friend: { x: -2.8, z: 0.6 },
};

export class StageMap {
  constructor(town) {
    this.town = town;
    this.outdoor = town;          // 室外碰撞上下文（永久保存，散场要还回去）
    this.room = null;             // 非空 = 这场戏在室内演
    this.center = { ...THEATER_CONFIG.stage };
  }

  /** 舞台中心（可按需换到别的空地） */
  setCenter(x, z) {
    this.center = { x, z };
  }

  /**
   * 把舞台搬到指定地点。
   *
   * room 非空时连碰撞上下文一起换成房间 —— Interior 与 Town 的
   * resolveCollision 同签名，所以 _safe 不用改就能把站位夹在屋内墙线内。
   * 不换的话室内演出的落点会按室外碰撞算，人会被摆进墙里或屋外。
   *
   * @param {number} x 中心 X
   * @param {number} z 中心 Z
   * @param {object|null} room Interior 实例；null = 室外
   */
  setVenue(x, z, room = null) {
    this.center = { x, z };
    this.room = room || null;
    this.town = room || this.outdoor;
  }

  /** 散场：把舞台还原成室外默认位置 */
  resetVenue() {
    this.room = null;
    this.town = this.outdoor;
    this.center = { ...THEATER_CONFIG.stage };
  }

  get isIndoor() { return !!this.room; }

  /**
   * 注入"把点吸附到可走格"的函数（由 main.js 提供，内部用 Pathfinder）。
   *
   * 为什么需要：站位是按中心加固定偏移算的，而场地常常是某栋楼的门口 ——
   * 偏移可能把演员摆进建筑里。resolveCollision 只会把他推到最近的墙边，
   * 可能推到楼的另一侧（离场地十几米），玩家就看不到人了。
   */
  setWalkableSnap(fn) { this._snapWalkable = fn || null; }

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

  /** 把一个落点做碰撞校验（给"来不及走过来就直接站位"用） */
  snapTo(spot) {
    return this._safe(spot.x, spot.z);
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
    let nx = x, nz = z;
    if (this.town && this.town.resolveCollision) {
      const r = this.town.resolveCollision(nx, nz, 0.6);
      nx = r.x; nz = r.z;
    }
    // 室外再过一遍"可走格"吸附：resolveCollision 只保证不重叠墙体，
    // 但可能把点推到楼的另一侧；吸附会拉回离场地最近的能站的格子。
    // 室内不需要（房间本身就是个开阔矩形，resolveCollision 已经夹在墙线内）。
    if (!this.room && this._snapWalkable) {
      const w = this._snapWalkable(nx, nz);
      if (w && isFinite(w.x) && isFinite(w.z)) { nx = w.x; nz = w.z; }
    }
    return { x: nx, z: nz };
  }
}
