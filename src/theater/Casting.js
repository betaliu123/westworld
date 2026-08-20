// Casting.js — AI 剧场选角：从镇上现有 NPC 里挑合适人设的演员
// 原则：优先职业对得上、性格对得上、离舞台近、当前没在忙（不在倒地/逃跑/愤怒/对话）。
// 挑中后由 TheaterRuntime 调 brain.takeOver() 让他"先别上班，过来演戏"。

import { State } from "../systems/AIBrain.js";
import { roleGenderOf } from "../config/theaterRoleGender.js";

// 这些状态的 NPC 不征召
const BUSY_STATES = new Set([State.DOWN, State.FLEE, State.ANGRY, State.TALK, State.STARTLED, State.SEEK_LOOT]);

// 帮派名在项目里有**两套并存的写法**，比较时必须归一化：
//   · 随机镇民走 gameData.GANGS，是中文名（"红隼帮"）
//   · 17 个重要 NPC 被 _assignImportantNpcs 覆盖成 factionId（"black_hoof"/"player"）
// 剧本和 stageCast 里写的是中文名，不归一化的话"黑蹄会"永远匹配不到 black_hoof 的人。
const GANG_ALIAS = {
  black_hoof: "黑蹄会",
  red_falcon: "红隼帮",
  silver_brotherhood: "银矿兄弟会",
  player: "我的帮派",
};
function normGang(g) {
  if (!g) return null;
  return GANG_ALIAS[g] || String(g);
}
/** 两个帮派标识是不是同一个帮派（跨中文名/factionId） */
export function gangEquals(a, b) {
  const na = normGang(a), nb = normGang(b);
  return !!na && na === nb;
}

export class Casting {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.stage = deps.stage;
    // 选角倾向解析器：返回 { npcId -> 加分 }，用于优先征召"玩家帮派成员 / 好友 / 有关系的人"
    this.priorityResolver = deps.priorityResolver || null;
    // 关系查询（main.js 注入）：判断亲属 / 对玩家好感 / 对玩家怀恨
    //   kinOf(npcId, otherNpcId) -> boolean
    //   affectionToPlayer(npcId) -> number
    //   grudgeToPlayer(npcId) -> boolean
    this.relations = deps.relations || null;
    // 缺角色时现造一个（main.js 注入）：createActor(role, tree) -> npc | null
    this.actorFactory = deps.actorFactory || null;
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
    // 全场演员总数：没有固定站位的角色靠"全场第几个"散开，
    // 只用角色内部的 index 会让所有单人角色都拿到 0，站位全叠在一起。
    const slotTotal = (tree.roles || []).reduce((n, r) => n + (r.count || 1), 0);
    let slot = 0;
    // 新一场戏：清掉上一场占用的站位
    this.stage.beginCast?.();

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
        // 挑不到、或挑出来的人明显不合角色（性别/帮派/亲属对不上）→ 现造一个。
        // 硬凑的后果是玩家看到"描写说姑娘、来的是汉子"，或者镇上的铁匠
        // 兼任死者的亲弟弟 —— 宁可新建一个专属角色。
        if (this.actorFactory && (!npc || !this._roleFits(role, npc, wantFemale))) {
          const made = this.actorFactory(role, tree, { wantFemale });
          if (made) npc = made;
        }
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
          // 说话人标签**永远用真人名字**。
          // 以前是 `role.name || displayName(npc)` —— 手写剧本的角色带虚构名
          // （"凯尔·摩根""得州比利"），于是左下角显示虚构名、头顶名字牌显示
          // 真实 NPC 名，玩家看到的是两个人。
          stageName: this.displayName(npc),
          // 虚构角色名只留两个用途：① 老剧本台词里字面写了这个名字，运行时
          // 要替换成真人名 ② 选角失败时的提示文案
          roleName: role.name || null,
          spot: this.stage.spotFor(role.roleId, i, picked.length, slot++, slotTotal),
        });
      });
    }
    return result;
  }

  /**
   * 这个人演这个角色"说得过去"吗（只查硬设定，不看软性格）。
   * 用来决定是否值得现造一个专属角色 —— 软条件不符可以忍，
   * 性别/帮派/亲属这种观众一眼能看出矛盾的不能忍。
   */
  _roleFits(role, npc, wantFemale) {
    if (!npc) return false;
    if (wantFemale != null && !!npc.female !== !!wantFemale) return false;
    if (role.female != null && !!npc.female !== !!role.female) return false;
    if (role.gang && !gangEquals(npc.personality?.gang, role.gang)) return false;
    if (role.kinOf && this.relations) {
      if (!this.relations.kinOf?.(this._npcId(npc), role.kinOf)) return false;
    }
    return true;
  }

  _npcId(npc) {
    // brain 上的注册表 id 最权威（linkRegistry / _assignImportantNpcs 设的）；
    // 退到按显示名查，最后才用 phone.id —— phone.id 带随机后缀，
    // 拿它去查关系表/帮派成员一定查不到。
    if (npc.brain?._npcId) return npc.brain._npcId;
    const reg = this.npcManager?.npcRegistry?.findByDisplayName?.(npc.phone?.owner || "");
    return reg?.id || npc.phone?.id || npc.phone?.owner || null;
  }

  /** NPC 的显示名（项目里显示名存在 phone.owner） */
  displayName(npc) {
    return npc.phone?.owner || npc.personality?.job || "镇民";
  }

  /** 可征召池：活着、不忙、在室外、离事发地点够近 */
  _pool() {
    const all = this.npcManager?.all || [];
    return all.filter((npc) => {
      if (!npc.alive) return false;
      if (npc.brain?._perform) return false;
      if (BUSY_STATES.has(npc.brain?.state)) return false;
      // 30 米内才征召：以前放到 60 米，演员要跑很久才到位，
      // 戏已经开演了主角还在街对面走路。
      // 必须用**世界坐标锚点**而不是舞台中心：室内房间在 (1000,1000) 这种
      // 独立坐标空间里，用中心量距离的话镇上所有人都在一千多米外，
      // 池子会被清空 —— 室内戏一个演员都凑不出来。
      const d = this.stage.distanceToAnchor
        ? this.stage.distanceToAnchor(npc.pos)
        : this.stage.distanceToCenter(npc.pos);
      if (d > 30) return false;
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

    // 帮派要求：描写说"红隼帮汉子"就该真在红隼帮里挑。
    // 以前这一项完全没读，合成角色表传了 gang 也白传。
    if (role.gang) {
      if (gangEquals(p.gang, role.gang)) s += 50;
      else if (p.gang) s -= 30;          // 别派敌对帮派的人去演对方的打手
      else s -= 10;                       // 无帮派平民勉强能演
    }

    // 关系要求：亲属 / 玩家的朋友 / 对玩家怀恨的人
    if (this.relations) {
      const id = this._npcId(npc);
      if (role.kinOf && this.relations.kinOf?.(id, role.kinOf)) s += 70;   // 亲属是硬设定，权重最高
      else if (role.kinOf) s -= 45;
      if (role.friendOfPlayer) {
        const aff = this.relations.affectionToPlayer?.(id) ?? 0;
        s += aff >= 40 ? 45 : aff >= 15 ? 20 : -25;
      }
      if (role.grudgeToPlayer) s += this.relations.grudgeToPlayer?.(id) ? 55 : -35;
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

    // 离事发地点近的优先（少让人跑长途）。同样必须用世界坐标锚点。
    const d = this.stage.distanceToAnchor
      ? this.stage.distanceToAnchor(npc.pos)
      : this.stage.distanceToCenter(npc.pos);
    s += Math.max(0, 20 - d * 0.4);

    // 打散同分，避免每天都是同一批人
    s += Math.random() * 6;
    return s;
  }
}
