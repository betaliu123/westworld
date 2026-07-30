// StoryEffects.js — StoryTree 效果执行引擎。
// 每个 effect 类型对应一个纯函数。所有效果都是确定性的。
// 效果会读写 WorldState、RelationshipSystem、EventLog。

import { check } from "./StoryConditions.js";

const EFFECTS = {
  // ---- 关系修改 ----
  create_relationship({ worldState, relationshipSystem, eventLog, actorBindings, params, storyId, currentNode }) {
    const from = params.from || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    const to = params.to || "player";
    if (!from || from === "player") return;

    if (relationshipSystem) {
      relationshipSystem.applyChange(from, to, {
        trust: params.trust || 5,
        affection: params.affection || 5,
        fear: params.fear || 0,
        debt: params.debt || 0,
        resentment: params.resentment || 0,
        respect: params.respect || 0,
      });
    } else {
      worldState.setRelationship(from, to, {
        trust: params.trust || 5,
        affection: params.affection || 5,
        fear: params.fear || 0,
        debt: params.debt || 0,
        resentment: params.resentment || 0,
        respect: params.respect || 0,
        lastInteractionDay: worldState.day,
        flags: [],
      });
    }
  },

  modify_relationship({ worldState, relationshipSystem, eventLog, actorBindings, params, storyId, currentNode }) {
    const from = params.from || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    const to = params.to || "player";
    if (!from) return;

    if (relationshipSystem) {
      relationshipSystem.applyChange(from, to, params);
    } else {
      const rel = worldState.getRelationship(from, to) || {};
      if (params.trust !== undefined) rel.trust = clamp((rel.trust || 0) + params.trust, -100, 100);
      if (params.affection !== undefined) rel.affection = clamp((rel.affection || 0) + params.affection, -100, 100);
      if (params.fear !== undefined) rel.fear = clamp((rel.fear || 0) + params.fear, 0, 100);
      if (params.debt !== undefined) rel.debt = clamp((rel.debt || 0) + params.debt, 0, 100);
      if (params.resentment !== undefined) rel.resentment = clamp((rel.resentment || 0) + params.resentment, 0, 100);
      if (params.respect !== undefined) rel.respect = clamp((rel.respect || 0) + params.respect, -100, 100);
      rel.lastInteractionDay = worldState.day;
      worldState.setRelationship(from, to, rel);
    }
  },

  // ---- NPC 加入/离开势力 ----
  npc_join_faction({ worldState, eventLog, actorBindings, params, storyId }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    const factionId = params.factionId || "player";
    if (!npcId) return;

    const npc = worldState.getNPC(npcId);
    if (!npc) return;
    npc.factionId = factionId;
    worldState.setNPC(npcId, npc);

    const faction = factionId === "player"
      ? worldState.getPlayerFaction()
      : worldState.getFaction(factionId);
    if (faction && !faction.members.includes(npcId)) {
      faction.members.push(npcId);
    }

    if (eventLog) {
      eventLog.record({
        type: "NPC_JOINED_FACTION",
        actors: [npcId],
        facts: { factionId, storyId },
        tags: ["faction", "story"],
      });
    }
  },

  npc_change_faction({ worldState, eventLog, actorBindings, params, storyId }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    if (!npcId) return;

    const npc = worldState.getNPC(npcId);
    if (!npc) return;

    // 从旧势力移除
    if (npc.factionId) {
      const oldFaction = worldState.getFaction(npc.factionId);
      if (oldFaction) {
        oldFaction.members = oldFaction.members.filter(m => m !== npcId);
      }
    }

    npc.factionId = params.factionId;
    worldState.setNPC(npcId, npc);

    const newFaction = worldState.getFaction(params.factionId);
    if (newFaction && !newFaction.members.includes(npcId)) {
      newFaction.members.push(npcId);
    }

    if (eventLog) {
      eventLog.record({
        type: "NPC_CHANGED_FACTION",
        actors: [npcId],
        facts: { newFactionId: params.factionId, storyId },
        tags: ["faction", "story", "defection"],
      });
    }
  },

  npc_set_status({ worldState, eventLog, actorBindings, params }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    if (!npcId) return;
    const npc = worldState.getNPC(npcId);
    if (!npc) return;
    npc.status = params.status;
    worldState.setNPC(npcId, npc);
  },

  exile_npc({ worldState, eventLog, actorBindings, params, storyId }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    if (!npcId) return;

    const npc = worldState.getNPC(npcId);
    if (!npc) return;

    if (npc.factionId) {
      const faction = worldState.getFaction(npc.factionId);
      if (faction) faction.members = faction.members.filter(m => m !== npcId);
    }
    npc.factionId = null;
    npc.status = "exiled";
    worldState.setNPC(npcId, npc);

    if (eventLog) {
      eventLog.record({
        type: "NPC_EXILED",
        actors: [npcId],
        facts: { storyId },
        tags: ["npc", "exile", "story"],
      });
    }
  },

  npc_kill({ worldState, eventLog, actorBindings, params, storyId }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    if (!npcId) return;
    const npc = worldState.getNPC(npcId);
    if (!npc || !npc.alive) return;

    npc.alive = false;
    npc.healthState = "dead";
    npc.deathDay = worldState.day;
    worldState.setNPC(npcId, npc);

    if (eventLog) {
      eventLog.record({
        type: "NPC_KILLED",
        actors: [npcId, "player"],
        facts: { cause: "story_effect", storyId },
        tags: ["death", "story", "major"],
      });
    }
  },

  // ---- 玩家资源 ----
  add_money({ worldState, eventLog, params, storyId }) {
    const player = worldState.getPlayer();
    player.money += (params.amount || 0);
    if (params.amount < 0 && eventLog) {
      eventLog.record({
        type: "MONEY_LOST",
        actors: ["player"],
        facts: { amount: -params.amount, storyId },
        tags: ["economy", "story"],
      });
    }
  },

  steal_money({ worldState, eventLog, params, storyId }) {
    const player = worldState.getPlayer();
    const amount = Math.floor(player.money * (params.ratio || 0.2));
    const stolen = Math.max(params.min || 50, amount);
    player.money -= stolen;

    if (eventLog) {
      eventLog.record({
        type: "MONEY_STOLEN",
        actors: ["player"],
        facts: { amount: stolen, storyId },
        tags: ["economy", "theft", "story", "betrayal"],
      });
    }
  },

  // ---- 势力 ----
  damage_pillar({ worldState, eventLog, params, storyId }) {
    const factionId = params.factionId || "black_hoof";
    worldState.damagePillar(factionId, params.pillar, params.amount || 5);

    if (eventLog) {
      eventLog.record({
        type: "PILLAR_DAMAGED",
        actors: ["player"],
        facts: { factionId, pillar: params.pillar, amount: params.amount || 5, storyId },
        tags: ["pillar", "story"],
      });
    }
  },

  faction_morale_change({ worldState, eventLog, params, storyId }) {
    const factionId = params.factionId || "player";
    const faction = factionId === "player"
      ? worldState.getPlayerFaction()
      : worldState.getFaction(factionId);
    if (!faction) return;
    faction.morale = clamp((faction.morale || 50) + (params.amount || 0), 0, 100);
  },

  // ---- 知识/秘密 ----
  add_knowledge({ worldState, eventLog, actorBindings, params, storyId }) {
    const npcId = params.npcId || "player";
    if (!worldState.state.knowledge[npcId]) {
      worldState.state.knowledge[npcId] = [];
    }
    worldState.state.knowledge[npcId].push({
      factId: params.fact,
      confidence: params.confidence || 0.5,
      sourceId: storyId || "story",
      acquiredDay: worldState.day,
    });
  },

  reveal_secret({ worldState, eventLog, actorBindings, params, storyId }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    if (!npcId) return;
    const npc = worldState.getNPC(npcId);
    if (!npc || !npc.secrets) return;

    const secret = npc.secrets.find(s => s.id === params.secretId);
    if (secret && !secret.revealed) {
      secret.revealed = true;
      if (!secret.knownBy) secret.knownBy = [];
      if (!secret.knownBy.includes("player")) secret.knownBy.push("player");
      worldState.setNPC(npcId, npc);
    }

    if (eventLog) {
      eventLog.record({
        type: "SECRET_REVEALED",
        actors: [npcId, "player"],
        facts: { secretId: params.secretId, storyId },
        tags: ["secret", "story"],
      });
    }
  },

  // ---- 记忆 ----
  add_memory({ worldState, actorBindings, params }) {
    const npcId = params.npcId || resolveActor(actorBindings, "protege") || resolveActor(actorBindings, "actor");
    if (!npcId || npcId === "player") return;
    const npc = worldState.getNPC(npcId);
    if (!npc) return;
    if (!npc.memories) npc.memories = [];
    npc.memories.push({
      day: worldState.day,
      text: params.text,
      emotionalValence: params.emotionalValence || 0,
    });
    if (npc.memories.length > 50) npc.memories.shift();
    worldState.setNPC(npcId, npc);
  },

  // ---- 事件记录 ----
  add_event({ worldState, eventLog, params, storyId }) {
    if (eventLog) {
      eventLog.record({
        type: params.type || "STORY_EVENT",
        actors: params.actors || ["player"],
        facts: { ...params.facts, storyId },
        tags: params.tags || ["story"],
      });
    }
  },

  record_betrayal({ worldState, eventLog, storyId }) {
    if (eventLog) {
      eventLog.record({
        type: "BETRAYAL",
        actors: ["player"],
        facts: { storyId },
        tags: ["betrayal", "major", "story"],
      });
    }
  },

  // ---- 故事控制 ----
  story_abort({ worldState, params, storyId }) {
    const targetStoryId = params.storyId || storyId;
    const inst = worldState.getStoryInstance(targetStoryId);
    if (inst) {
      inst.status = "aborted";
      inst.abortReason = params.reason || "story_effect";
      worldState.setStoryInstance(targetStoryId, inst);
    }
  },

  story_merge({ worldState, params, storyId }) {
    // 将另一个故事树合并到当前树（中止被合并树，将动机复制过来）
    const mergeFromId = params.mergeFromId;
    const mergeToId = params.mergeToId || storyId;

    const fromInst = worldState.getStoryInstance(mergeFromId);
    const toInst = worldState.getStoryInstance(mergeToId);

    if (fromInst) {
      fromInst.status = "merged";
      fromInst.mergedInto = mergeToId;
      worldState.setStoryInstance(mergeFromId, fromInst);
    }
    if (toInst) {
      if (!toInst.mergedFrom) toInst.mergedFrom = [];
      toInst.mergedFrom.push(mergeFromId);
      worldState.setStoryInstance(mergeToId, toInst);
    }
  },

  // ---- 标志 ----
  add_flag({ worldState, params }) {
    if (!worldState.state.flags) worldState.state.flags = {};
    worldState.state.flags[params.flag] = true;
  },

  // ---- 情报加成 ----
  add_intel_bonus({ worldState, params }) {
    const pf = worldState.getPlayerFaction();
    if (!pf) return;
    if (!pf.intelBonus) pf.intelBonus = 0;
    pf.intelBonus += (params.value || 0);
  },

  // ---- 随机结果（确定性：基于种子+日期的伪随机） ----
  random_outcome({ worldState, actorBindings, params, storyId, currentNode }) {
    const seed = (worldState.state.seed || 1) + worldState.day * 100 + (currentNode ? currentNode.length : 0);
    const rng = pseudoRandom(seed);
    const roll = rng();

    // params: { success: 0.5, options: ["optionA", "optionB", ...] }
    // options 对应其他响应 ID，这里做二级路由
    if (roll < (params.success || 0.5)) {
      // 成功：返回一个结果提示
      return { randomResult: "success", roll, redirectedTo: params.options?.[0] };
    } else if (params.options && params.options.length > 1) {
      return { randomResult: "failure", roll, redirectedTo: params.options[Math.floor(rng() * params.options.length)] };
    }
    return { randomResult: "failure", roll };
  },
};

// ---- 辅助函数 ----

function resolveActor(actorBindings, key) {
  if (!key) return null;
  if (actorBindings && actorBindings[key]) return actorBindings[key];
  return key;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// 简单乘法 PRNG（Mulberry32）
function pseudoRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 执行单个效果。
 * @param {object} context - { worldState, relationshipSystem, eventLog, actorBindings, storyId, currentNode }
 * @param {object} effect - { type, params }
 * @returns {object|null} 可能返回结果对象
 */
export function apply({ worldState, relationshipSystem, eventLog, actorBindings, storyId, currentNode }, effect) {
  if (!effect || !effect.type) return null;

  const handler = EFFECTS[effect.type];
  if (!handler) {
    console.warn(`[StoryEffects] Unknown effect type: ${effect.type}`);
    return null;
  }

  try {
    return handler({ worldState, relationshipSystem, eventLog, actorBindings, params: effect.params || {}, storyId, currentNode, actorBindings: actorBindings || {} });
  } catch (e) {
    console.error(`[StoryEffects] Error applying ${effect.type}:`, e);
    return null;
  }
}

/**
 * 批量执行效果列表。
 * @returns {Array} 结果列表（排除 null）
 */
export function applyAll(context, effects = []) {
  const results = [];
  for (const effect of effects) {
    const result = apply(context, effect);
    if (result) results.push(result);
  }
  return results;
}

/**
 * 检查并执行条件效果（条件满足才执行）。
 */
export function applyIf(context, conditionalEffect) {
  if (!conditionalEffect) return null;
  const { condition, effect } = conditionalEffect;
  if (condition && !check({ ...context, condition })) return null;
  return apply(context, effect);
}

export { EFFECTS };
