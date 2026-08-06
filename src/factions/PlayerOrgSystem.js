// PlayerOrgSystem.js — 玩家自己帮派的人事图（P11）。
//
// 为什么要有自己的帮派人事图：玩家收服/招募了一堆人，但这些人挤在
// members 数组里没有任何职务，玩家没法"任命谁当什么"，帮派组织感为零。
// 这里给玩家自己的帮派建立一张可任命的人事图：
//   玩家 = 会首（顶层），下面是几个可指派的职务位，收服的人被任命后
//   就占了位子，并给玩家发一条感谢/效忠的短信。
//
// 与 NemesisSystem（敌方人事图）分工：敌方的是"打掉谁伤哪根支柱"；
// 这里的是"自己人任命了能获得什么加成"，是正反馈面。

/** 玩家帮派的职务位。rank 越大越核心。 */
export const PLAYER_ROLES = [
  { id: "pr_second",   label: "二把手",   rank: 4, desc: "替你把场子镇住，人手收益 +1" },
  { id: "pr_bookkeeper", label: "账房先生", rank: 3, desc: "看账防漏，产业收益 +10%" },
  { id: "pr_enforcer", label: "执法队长", rank: 3, desc: "镇场子的，打手收益 +1" },
  { id: "pr_recruiter", label: "招揽人",   rank: 2, desc: "口才了得，拉拢成功率 +8%" },
  { id: "pr_muscle",   label: "打手",     rank: 1, desc: "人手，干架更凶" },
  { id: "pr_runner",   label: "跑腿",     rank: 1, desc: "传话送信，消息更快" },
];

/** 按 id 取职务 */
export function playerRoleById(id) {
  return PLAYER_ROLES.find((r) => r.id === id) || null;
}

export class PlayerOrgSystem {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.factionSystem = deps.factionSystem;
    this.npcRegistry = deps.npcRegistry;
    this.phone = deps.phone || null;
    this.hud = deps.hud || null;
    this.log = deps.log || (() => {});
    this._ensureState();
  }

  get state() { return this.worldState.state.playerOrg; }

  _ensureState() {
    const ws = this.worldState.state;
    if (!ws.playerOrg) {
      ws.playerOrg = {
        // roleId -> npcId。玩家自己就是会首，不放进来。
        seats: {},
        history: [],
      };
    }
    return ws.playerOrg;
  }

  /** 当前人事图（供 UI）：会首 + 各职务位 + 未被任命的成员 */
  orgChart() {
    const pf = this.worldState.state.factions.player;
    const members = (pf.members || []).filter((id) => !this.factionSystem.getMemberMeta(id).undercover);
    const chart = PLAYER_ROLES.map((role) => {
      const npcId = this.state.seats[role.id] || null;
      const npc = npcId ? this.npcRegistry.get(npcId) : null;
      return {
        roleId: role.id, label: role.label, rank: role.rank, desc: role.desc,
        vacant: !npcId,
        npcId, name: npc?.displayName || "（空缺）",
      };
    });
    // 未任命的人单独列出
    const assigned = new Set(Object.values(this.state.seats));
    const unassigned = members.filter((id) => !assigned.has(id));
    return { chart, unassigned };
  }

  /** 某人现在是什么职务 */
  roleOf(npcId) {
    for (const [roleId, id] of Object.entries(this.state.seats)) {
      if (id === npcId) return roleId;
    }
    return null;
  }

  /** 任命某人到某个职务位（会顶掉原来在位的人） */
  appoint(npcId, roleId) {
    const role = playerRoleById(roleId);
    if (!role) return { ok: false, error: "bad_role" };
    const pf = this.worldState.state.factions.player;
    if (!pf.members.includes(npcId)) return { ok: false, error: "not_member" };
    const rec = this.npcRegistry.get(npcId);
    if (!rec) return { ok: false, error: "no_record" };

    // 顶掉原在职的人（他回未任命池）
    const prev = this.state.seats[roleId] || null;
    this.state.seats[roleId] = npcId;
    // 该成员如果之前有别的职务，清掉（一人一职）
    for (const [rid, id] of Object.entries(this.state.seats)) {
      if (rid !== roleId && id === npcId) delete this.state.seats[rid];
    }
    this.state.history.push({ day: this.worldState.state.day, type: "appoint", npcId, roleId, prev });
    this.npcRegistry.update(npcId, { playerRole: roleId });

    const name = rec.displayName || npcId;
    this.log(`你任命${name}为${role.label}`);
    // 任命后发一条感谢/效忠的短信
    this._sendAppointMessage(npcId, rec, role, prev);
    return { ok: true, role, prev };
  }

  _sendAppointMessage(npcId, rec, role, prev) {
    if (!this.phone?.deliverMessage) return;
    const name = rec.displayName || npcId;
    const lines = {
      pr_second: `老大，这担子我接下了。你放心，场上场下我都替你盯着。`,
      pr_bookkeeper: `账交到我手里，一个子儿都不会漏。这是手艺，也是我该干的。`,
      pr_enforcer: `往后这条街谁不守规矩，我替你教他。`,
      pr_recruiter: `包在我身上，过两天我再给你拉两个人进来。`,
      pr_muscle: `跟着老大，有汤喝。`,
      pr_runner: `跑腿交给我，风吹雨打都给你把话带到。`,
    };
    const text = lines[role.id] || `谢老大提拔，我一定好好干。`;
    this.phone.deliverMessage(npcId, name, text, {});
    this.hud?.toast?.(`📱 ${name}接了${role.label}的差事`, { key: "appoint", duration: 3600 });
  }

  /** 每日结算：任命带来的加成（产经/人力/招募） */
  settleDaily() {
    const pf = this.worldState.state.factions.player;
    const seats = this.state.seats;
    let incomeBonus = 0, manpowerBonus = 0, recruitBonus = 0;
    for (const [roleId, npcId] of Object.entries(seats)) {
      if (!npcId) continue;
      const rec = this.npcRegistry.get(npcId);
      if (!rec || !rec.alive) continue;   // 人没了位子空转不算数
      if (roleId === "pr_bookkeeper") incomeBonus += 0.1;
      if (roleId === "pr_enforcer" || roleId === "pr_muscle") manpowerBonus += 1;
      if (roleId === "pr_recruiter") recruitBonus += 0.08;
      if (roleId === "pr_second") manpowerBonus += 1;
    }
    // 产业收益加成由 BusinessSystem 读取 incomeBonus；人力直接加
    if (manpowerBonus > 0) pf.manpower = Math.max(0, pf.manpower + manpowerBonus);
    this.state.lastBonus = { incomeBonus, manpowerBonus, recruitBonus };
    return this.state.lastBonus;
  }
}
