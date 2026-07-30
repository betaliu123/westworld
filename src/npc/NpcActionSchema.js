// NpcActionSchema.js — NPC 行为决策白名单
// LLM 除了生成台词，还能从这里挑一个行为去做。schema 同时用于三处：
//   1) 拼进 prompt 告诉模型有哪些行为可选
//   2) 校验/清洗模型返回（防止越权行为、越界参数）
//   3) NpcActionExecutor 执行时查约束
//
// 设计原则：所有能改变游戏状态的行为都要有硬约束，不能让玩家靠自由输入刷资源。

/** 行为需要的目标类型 */
export const TargetKind = {
  NONE: "none",
  PLAYER: "player",
  NPC: "npc",           // 场上另一个 NPC（按名字匹配）
  PLAYER_OR_NPC: "player_or_npc",
};

export const NPC_ACTIONS = {
  // ---- 零副作用（永远允许）----
  none: {
    target: TargetKind.NONE,
    desc: "什么都不做，只说话",
    safe: true,
  },
  face_player: {
    target: TargetKind.PLAYER,
    desc: "停下手上的事，转身面对玩家",
    safe: true,
  },
  follow_player: {
    target: TargetKind.PLAYER,
    desc: "跟着玩家走，走到玩家身边",
    safe: true,
    maxSeconds: 30,      // 最多跟 30 秒，避免无限粘着
  },
  flee: {
    target: TargetKind.NONE,
    desc: "害怕/心虚，转身逃跑",
    safe: true,
  },

  // ---- 有副作用（需要条件）----
  attack_player: {
    target: TargetKind.PLAYER,
    desc: "被激怒，动手打玩家",
    requires: {
      // 老实人不会因为一句话就动手
      minAggression: 0.3,
      minBravery: 0.35,
      // 倒地/正在逃跑的人不会突然反打
      forbidStates: ["DOWN"],
    },
  },
  attack_npc: {
    target: TargetKind.NPC,
    desc: "去打场上另一个人（需要指定名字）",
    requires: {
      minAggression: 0.35,
      minBravery: 0.4,
      forbidStates: ["DOWN"],
    },
  },
  give_money: {
    target: TargetKind.PLAYER,
    desc: "掏钱给玩家（打赏/买消息/求你别闹）",
    // 防刷三重闸：钱从 NPC 自己的 cashReserve 真扣、每天限次、要有好感基础
    requires: {
      minAffection: 10,       // 陌生人不会白给钱
      maxPerDay: 1,           // 同一个 NPC 每天最多给一次
      needsCashReserve: true, // NPC 兜里得真有钱
    },
    amount: {
      // 上限同时受 NPC 财富与兜里现金约束
      ratioOfReserve: 0.5,    // 最多掏出兜里的一半
      hardMax: 30,
      hardMin: 2,
    },
  },
  rob_player: {
    target: TargetKind.PLAYER,
    desc: "抢玩家的钱（明抢，玩家会知道）",
    requires: {
      minAggression: 0.5,
      minBravery: 0.5,
      maxPerDay: 1,
      forbidStates: ["DOWN", "FLEE"],
    },
    amount: {
      ratioOfPlayerMoney: 0.15,
      hardMax: 60,
      hardMin: 5,
    },
    // 抢劫是犯罪：NPC 自己会被通缉逻辑之外的方式惩罚（掉玩家对他的好感）
    effects: { affection: -30, trust: -40 },
  },
  steal_from_player: {
    target: TargetKind.PLAYER,
    desc: "偷玩家的钱（暗偷，金额小）",
    requires: {
      minGreed: 0.45,
      maxPerDay: 1,
      forbidStates: ["DOWN", "FLEE"],
    },
    amount: {
      ratioOfPlayerMoney: 0.06,
      hardMax: 20,
      hardMin: 2,
    },
    effects: { affection: -10, trust: -20 },
  },
  open_gamble: {
    target: TargetKind.PLAYER,
    desc: "拉玩家上牌桌，开一局百家乐",
    requires: {
      jobs: ["赌徒", "赌场经理", "酒保"], // 只有这几种人身上带牌
      maxPerDay: 2,
    },
  },
};

/** 给 prompt 用的行为清单（只列当前这个 NPC 真的能做的） */
export function describeAllowedActions(allowed) {
  return allowed
    .map((id) => `- ${id}：${NPC_ACTIONS[id]?.desc || ""}`)
    .join("\n");
}

/**
 * 算出这个 NPC 当前允许哪些行为。
 * 不满足条件的行为直接不进 prompt —— 比 LLM 返回后再拒绝体验更好（不会出现"说要给钱但没给"）。
 */
export function allowedActionsFor(ctx) {
  const { personality: p = {}, state, affection = 0, cashReserve = 0, dailyUse = {}, job } = ctx;
  const out = [];
  for (const [id, def] of Object.entries(NPC_ACTIONS)) {
    const r = def.requires;
    if (!r) { out.push(id); continue; }
    if (r.forbidStates?.includes(state)) continue;
    if (r.minAggression != null && (p.aggression ?? 0) < r.minAggression) continue;
    if (r.minBravery != null && (p.bravery ?? 0) < r.minBravery) continue;
    if (r.minGreed != null && (p.greed ?? 0) < r.minGreed) continue;
    if (r.minAffection != null && affection < r.minAffection) continue;
    if (r.needsCashReserve && cashReserve < (NPC_ACTIONS[id].amount?.hardMin ?? 1)) continue;
    if (r.jobs && !r.jobs.includes(job)) continue;
    if (r.maxPerDay != null && (dailyUse[id] || 0) >= r.maxPerDay) continue;
    out.push(id);
  }
  return out;
}

/** 把 LLM 返回的行为清洗成可执行的（越权一律降级为 none） */
export function sanitizeAction(raw, allowed, castNames = []) {
  const id = typeof raw?.action === "string" ? raw.action.trim() : "none";
  if (!NPC_ACTIONS[id] || !allowed.includes(id)) {
    return { action: "none", targetName: null, rejected: id !== "none" ? id : null };
  }
  const def = NPC_ACTIONS[id];
  let targetName = null;
  if (def.target === TargetKind.NPC) {
    const want = typeof raw.targetName === "string" ? raw.targetName.trim() : "";
    // 目标必须是在场的人，否则这个行为无从执行
    targetName = castNames.find((n) => n === want) || castNames.find((n) => want && n.includes(want)) || null;
    if (!targetName) return { action: "none", targetName: null, rejected: `${id}(目标不在场:${want})` };
  }
  return { action: id, targetName, rejected: null };
}
