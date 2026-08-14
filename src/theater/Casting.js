// Casting.js — AI 剧场选角：从镇上现有 NPC 里挑合适人设的演员
// 原则：优先职业对得上、性格对得上、离舞台近、当前没在忙（不在倒地/逃跑/愤怒/对话）。
// 挑中后由 TheaterRuntime 调 brain.takeOver() 让他"先别上班，过来演戏"。

import { State } from "../systems/AIBrain.js";
import { roleGenderOf } from "../config/theaterRoleGender.js";

// 这些状态的 NPC 不征召
const BUSY_STATES = new Set([State.DOWN, State.FLEE, State.ANGRY, State.TALK, State.STARTLED, State.SEEK_LOOT]);

export class Casting {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.stage = deps.stage;
    // 选角倾向解析器：返回 { npcId -> 加分 }，用于优先征召"玩家帮派成员 / 好友 / 有关系的人"
    this.priorityResolver = deps.priorityResolver || null;
  }
  /**
   * 为一棵剧本树选角。
   * @param {object} tree theaterData 里的剧本
   * @param {object} opts { preferNpcId } 优先指定的主角 NPC（个人/连续剧场）
   * @returns {Array<{roleId, npc, spec}>|null} 选不齐必需角色时返回 null
   */
  cast(tree, opts = {}) {
    const used = new Set();
    const result = [];
    const pool = this._pool();
    const preferId = opts.preferNpcId;
    // 记录为什么选不齐（供"前置要求不符"提示）
    this.lastFailReason = null;

    for (const role of tree.roles) {
      const count = role.count || 1;
      const wantFemale = roleGenderOf(tree.id, role);
      const picked = [];
      for (let i = 0; i < count; i++) {
        let npc = null;
        if (preferId && role.roleId === (tree.protagonistRole || tree.roles[0]?.roleId) && i === 0) {
          npc = pool.find((n) => this._npcId(n) === preferId) || null;
        }
        if (!npc) npc = this._bestFor(role, pool, used, wantFemale);
        if (!npc) break;
        used.add(npc);
        picked.push(npc);
      }
      if (role.required && picked.length === 0) {
        // 记录缺哪个角色（中文角色名优先，其次职业）
        const jobs = role.jobs?.length ? role.jobs.join("/") : "任意";
        this.lastFailReason = `缺「${role.name || jobs}」角色：需要 ${jobs}，镇上${pool.length ? "没有合适的" : "没有可征召的人"}`;
        return null;
      }
      picked.forEach((npc, i) => {
        result.push({
          roleId: role.roleId,
          npc,
          stageName: role.name || this.displayName(npc),
          spot: this.stage.spotFor(role.roleId, i, picked.length),
        });
      });
    }
    return result;
  }

  _npcId(npc) {
    const reg = this.npcManager?.npcRegistry?.findByDisplayName?.(npc.phone?.owner || "");
    return reg?.id || npc.phone?.id || npc.phone?.owner || null;
  }

  /** NPC 的显示名（项目里显示名存在 phone.owner） */
  displayName(npc) {
    return npc.phone?.owner || npc.personality?.job || "镇民";
  }

  /** 可征召池：活着、不忙、在室外、离舞台够近 */
  _pool() {
    const all = this.npcManager?.all || [];
    return all.filter((npc) => {
      if (!npc.alive) return false;
      if (npc.brain?._perform) return false;
      if (BUSY_STATES.has(npc.brain?.state)) return false;
      // 30 米内才征召：以前放到 60 米，演员要跑很久才到位，
      // 戏已经开演了主角还在街对面走路
      if (this.stage.distanceToCenter(npc.pos) > 30) return false;
      return true;
    });
  }

  /** 按人设匹配度打分，取最高（同分随机）。wantFemale 非 null 时是硬性筛选。 */
  _bestFor(role, pool, used, wantFemale = null) {
    let best = null;
    let bestScore = -Infinity;
    for (const npc of pool) {
      if (used.has(npc)) continue;
      // 性别不符直接跳过，不参与打分
      if (wantFemale != null && !!npc.female !== !!wantFemale) continue;
      const score = this._score(role, npc);
      if (score > bestScore) {
        bestScore = score;
        best = npc;
      }
    }
    return best;
  }

  _score(role, npc) {
    const p = npc.personality || {};
    let s = 0;

    // 玩家帮派成员 / 好友 / 有关系的人优先（势力剧场的"自己人"、个人剧场的熟人）
    if (this.priorityResolver) {
      const id = this._npcId(npc);
      const bonus = this.priorityResolver(id, npc);
      if (bonus) s += bonus;
    }

    // 职业匹配是最强信号
    if (role.jobs && role.jobs.length) {
      const idx = role.jobs.indexOf(p.job);
      if (idx === 0) s += 60;
      else if (idx > 0) s += 45 - idx * 6;
      else s -= 12; // 职业不对：能演但不是首选
    }

    // 性格门槛：达到要求加分，差得远则减分
    for (const key of ["bravery", "aggression", "greed", "sociability", "wealth"]) {
      if (role[key] == null) continue;
      const v = p[key] ?? 0.5;
      s += v >= role[key] ? 14 + (v - role[key]) * 10 : -18 * (role[key] - v);
    }

    // 性别要求（歌女等）
    if (role.female != null) s += npc.female === role.female ? 24 : -40;

    // 离舞台近的优先（少让人跑长途）
    const d = this.stage.distanceToCenter(npc.pos);
    s += Math.max(0, 20 - d * 0.4);

    // 打散同分，避免每天都是同一批人
    s += Math.random() * 6;
    return s;
  }
}
