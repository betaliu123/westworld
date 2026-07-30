// StoryConditions.js — StoryTree 前置条件检查引擎。
// 每个条件是一个纯函数：(worldState, storyRuntime, params) => boolean。
// 所有条件都是确定性的，不依赖随机或外部状态。

const CONDITIONS = {
  // ---- 关系类 ----
  relationship_min({ worldState, relationshipSystem, actorBindings, params }) {
    // params: { trust, affection, fear, debt, resentment, respect }
    // 检查两个绑定角色之间的关系
    const from = resolveActor(actorBindings, params.from) || "player";
    const to = resolveActor(actorBindings, params.to) || "player";
    const rel = relationshipSystem ? relationshipSystem.get(from, to) : worldState.getRelationship(from, to);
    if (!rel) return false;
    if (params.trust !== undefined && (rel.trust || 0) < params.trust) return false;
    if (params.affection !== undefined && (rel.affection || 0) < params.affection) return false;
    if (params.fear !== undefined && (rel.fear || 0) < params.fear) return false;
    if (params.debt !== undefined && (rel.debt || 0) < params.debt) return false;
    if (params.resentment !== undefined && (rel.resentment || 0) < params.resentment) return false;
    if (params.respect !== undefined && (rel.respect || 0) < params.respect) return false;
    return true;
  },

  relationship_max({ worldState, relationshipSystem, actorBindings, params }) {
    const from = resolveActor(actorBindings, params.from) || "player";
    const to = resolveActor(actorBindings, params.to) || "player";
    const rel = relationshipSystem ? relationshipSystem.get(from, to) : worldState.getRelationship(from, to);
    if (!rel) return true; // 没有关系则满足上限
    if (params.trust !== undefined && (rel.trust || 0) > params.trust) return false;
    if (params.affection !== undefined && (rel.affection || 0) > params.affection) return false;
    if (params.fear !== undefined && (rel.fear || 0) > params.fear) return false;
    if (params.debt !== undefined && (rel.debt || 0) > params.debt) return false;
    if (params.resentment !== undefined && (rel.resentment || 0) > params.resentment) return false;
    if (params.respect !== undefined && (rel.respect || 0) > params.respect) return false;
    return true;
  },

  // ---- 节点完成 ----
  node_completed({ worldState, params }) {
    // params: { nodeId, storyInstanceId }
    const inst = getStoryInstance(worldState, params);
    return inst ? inst.completedNodes.includes(params.nodeId) : false;
  },

  node_active({ worldState, params }) {
    // params: { nodeId, storyInstanceId }
    const inst = getStoryInstance(worldState, params);
    return inst ? inst.currentNode === params.nodeId : false;
  },

  // ---- 故事状态 ----
  story_active({ worldState, params }) {
    // params: { storyId }
    const inst = worldState.getStoryInstance(params.storyId);
    return inst && inst.status === "active";
  },

  story_completed({ worldState, params }) {
    const inst = worldState.getStoryInstance(params.storyId);
    return inst && inst.status === "completed";
  },

  story_not_started({ worldState, params }) {
    const inst = worldState.getStoryInstance(params.storyId);
    return !inst || inst.status === "pending";
  },

  // ---- NPC 状态 ----
  npc_alive({ worldState, actorBindings, params }) {
    const npcId = resolveActor(actorBindings, params.npcId);
    const npc = worldState.getNPC(npcId);
    return npc && npc.alive;
  },

  npc_dead({ worldState, actorBindings, params }) {
    const npcId = resolveActor(actorBindings, params.npcId);
    const npc = worldState.getNPC(npcId);
    return npc && !npc.alive;
  },

  npc_in_faction({ worldState, actorBindings, params }) {
    const npcId = resolveActor(actorBindings, params.npcId);
    const npc = worldState.getNPC(npcId);
    return npc && npc.factionId === params.factionId;
  },

  npc_status({ worldState, actorBindings, params }) {
    const npcId = resolveActor(actorBindings, params.npcId);
    const npc = worldState.getNPC(npcId);
    return npc && npc.status === params.status;
  },

  // ---- 玩家状态 ----
  player_money_min({ worldState, params }) {
    return worldState.getPlayer().money >= params.value;
  },

  player_money_max({ worldState, params }) {
    return worldState.getPlayer().money <= params.value;
  },

  player_energy_min({ worldState, params }) {
    return worldState.getPlayer().energy >= params.value;
  },

  faction_player_influence_min({ worldState, params }) {
    const pf = worldState.getPlayerFaction();
    return pf && pf.influence >= params.value;
  },

  faction_morale_below({ worldState, params }) {
    const pf = worldState.getPlayerFaction();
    // 也支持检查 black_hoof
    const faction = params.factionId ? worldState.getFaction(params.factionId) : pf;
    return faction && faction.morale <= params.value;
  },

  faction_morale_above({ worldState, params }) {
    const pf = worldState.getPlayerFaction();
    const faction = params.factionId ? worldState.getFaction(params.factionId) : pf;
    return faction && faction.morale >= params.value;
  },

  // ---- 时长 ----
  played_days_min({ worldState, params }) {
    return worldState.day >= params.value;
  },

  played_days_max({ worldState, params }) {
    return worldState.day <= params.value;
  },

  // ---- 事件 ----
  event_type_occurred({ worldState, params }) {
    // params: { type, outcome?, minCount? }
    const minCount = params.minCount || 1;
    let count = 0;
    for (const ev of worldState.state.eventHistory) {
      if (ev.type === params.type) {
        if (params.outcome && ev.facts?.outcome !== params.outcome) continue;
        count++;
        if (count >= minCount) return true;
      }
    }
    return false;
  },

  event_has_tag({ worldState, params }) {
    // params: { tag, actor? }
    for (const ev of worldState.state.eventHistory) {
      if (!ev.tags || !ev.tags.includes(params.tag)) continue;
      if (params.actor && (!ev.actors || !ev.actors.includes(params.actor))) continue;
      return true;
    }
    return false;
  },

  event_count_min({ worldState, params }) {
    // params: { type, minCount }
    let count = 0;
    for (const ev of worldState.state.eventHistory) {
      if (ev.type === params.type) count++;
    }
    return count >= (params.minCount || 1);
  },

  // ---- 支柱 ----
  pillar_below({ worldState, params }) {
    // params: { factionId, pillarKey, value }
    const pillar = worldState.getPillar(params.factionId || "black_hoof", params.pillarKey);
    return pillar ? pillar.value < params.value : false;
  },

  pillar_above({ worldState, params }) {
    const pillar = worldState.getPillar(params.factionId || "black_hoof", params.pillarKey);
    return pillar ? pillar.value > params.value : false;
  },

  // ---- 响应选择 ----
  response_chosen({ worldState, params }) {
    // params: { storyId?, responseId }
    const inst = getStoryInstance(worldState, params);
    if (!inst) {
      // 搜索所有实例
      for (const [id, si] of Object.entries(worldState.state.storyInstances)) {
        if (si.chosenResponses && si.chosenResponses.includes(params.responseId)) return true;
      }
      return false;
    }
    return inst.chosenResponses ? inst.chosenResponses.includes(params.responseId) : false;
  },

  // ---- 硬截止 ----
  hard_deadline_passed({ worldState, params }) {
    // params: { storyId, nodeId }
    const inst = getStoryInstance(worldState, params);
    if (!inst) return false;
    const nodeState = inst.nodeStates ? inst.nodeStates[params.nodeId] : null;
    return nodeState ? nodeState.hardExpired : false;
  },

  // ---- 标志位 ----
  flag_set({ worldState, params }) {
    // params: { flag }
    return worldState.state.flags ? worldState.state.flags[params.flag] === true : false;
  },

  // ---- 逻辑组合 ----
  and({ worldState, relationshipSystem, actorBindings, storyRuntime, params }) {
    // params: { conditions: [...] }
    for (const cond of (params.conditions || [])) {
      if (!check({ worldState, relationshipSystem, actorBindings, storyRuntime, condition: cond })) {
        return false;
      }
    }
    return true;
  },

  or({ worldState, relationshipSystem, actorBindings, storyRuntime, params }) {
    for (const cond of (params.conditions || [])) {
      if (check({ worldState, relationshipSystem, actorBindings, storyRuntime, condition: cond })) {
        return true;
      }
    }
    return (params.conditions || []).length === 0;
  },

  not({ worldState, relationshipSystem, actorBindings, storyRuntime, params }) {
    return !check({ worldState, relationshipSystem, actorBindings, storyRuntime, condition: params.condition });
  },
};

// 解析 actor bindings
function resolveActor(actorBindings, npcId) {
  if (!npcId) return null;
  if (actorBindings && actorBindings[npcId]) return actorBindings[npcId];
  return npcId;
}

// 获取指定的 storyInstance
function getStoryInstance(worldState, params) {
  if (params.storyInstanceId) return worldState.getStoryInstance(params.storyInstanceId);
  if (params.storyId) return worldState.getStoryInstance(params.storyId);
  return null;
}

/**
 * 检查单个条件。
 * @param {object} context - { worldState, relationshipSystem, actorBindings, storyRuntime, condition }
 * @returns {boolean}
 */
export function check({ worldState, relationshipSystem, actorBindings, storyRuntime, condition }) {
  if (!condition || !condition.type) return true; // 空条件默认通过

  const handler = CONDITIONS[condition.type];
  if (!handler) {
    console.warn(`[StoryConditions] Unknown condition type: ${condition.type}`);
    return false;
  }

  try {
    return handler({
      worldState,
      relationshipSystem,
      actorBindings: actorBindings || {},
      storyRuntime,
      params: condition.params || {},
    });
  } catch (e) {
    console.error(`[StoryConditions] Error checking ${condition.type}:`, e);
    return false;
  }
}

/**
 * 检查条件列表（全部满足才算通过）。
 * @param {object} context - { worldState, relationshipSystem, actorBindings, storyRuntime }
 * @param {Array} conditions - 条件列表
 * @returns {boolean}
 */
export function checkAll(context, conditions = []) {
  for (const cond of conditions) {
    if (!check({ ...context, condition: cond })) return false;
  }
  return true;
}

/**
 * 检查软截止。
 * @param {number} currentDay
 * @param {object} softDeadline - { afterDay, beforeDay }
 * @returns {object} { passed, urgent, expired }
 */
export function checkDeadline(currentDay, softDeadline) {
  if (!softDeadline) return { passed: true, urgent: false, expired: false };

  const result = { passed: true, urgent: false, expired: false };

  if (softDeadline.afterDay && currentDay < softDeadline.afterDay) {
    result.passed = false;
  }
  if (softDeadline.beforeDay && currentDay > softDeadline.beforeDay) {
    result.expired = true;
    result.urgent = true;
  }
  if (softDeadline.beforeDay && currentDay === softDeadline.beforeDay) {
    result.urgent = true;
  }

  return result;
}

export { CONDITIONS };
