// EventLog.js — 结构化事件日志。所有事实以统一格式记录，
// StoryTree、报纸、传闻和模型只读取事件日志，不通过自然语言反推事实。

let _nextId = 1;

export class EventLog {
  constructor(worldState) {
    this.worldState = worldState;
  }

  /**
   * 记录一个结构化事实。
   * @param {object} event
   * @param {string} event.type - 事件类型：NPC_RESCUED, NPC_KILLED, MONEY_CHANGE, FACTION_CHANGE, STORY_ADVANCE, etc.
   * @param {string[]} event.actors - 相关角色 ID
   * @param {string} event.location - 发生地点
   * @param {object} event.facts - 事实键值对
   * @param {string[]} event.visibility - 谁能知道：["player", "npc_X", "public", "faction_Y"]
   * @param {string[]} event.tags - 标签：["kindness", "debt", "public", "violence", "betrayal", ...]
   */
  record({ type, actors = [], location = "unknown", facts = {}, visibility = ["player"], tags = [] }) {
    const ws = this.worldState.state;
    const event = {
      id: `ev_d${ws.day}_${String(_nextId++).padStart(3, "0")}`,
      day: ws.day,
      hour: ws.hour,
      type,
      actors,
      location,
      facts,
      visibility,
      tags,
    };
    this.worldState.addEvent(event);
    return event;
  }

  // 便捷方法
  recordMoneyChange(amount, reason, actors = ["player"], tags = []) {
    return this.record({
      type: "MONEY_CHANGE",
      actors,
      location: "economy",
      facts: { amount, reason },
      visibility: [...actors],
      tags,
    });
  }

  recordNpcInteraction(npcId, interactionType, details = {}, tags = []) {
    return this.record({
      type: `NPC_${interactionType.toUpperCase()}`,
      actors: ["player", npcId],
      location: "town",
      facts: { npcId, interactionType, ...details },
      visibility: ["player", npcId],
      tags,
    });
  }

  recordFactionChange(factionId, change, tags = []) {
    return this.record({
      type: "FACTION_CHANGE",
      actors: [factionId],
      location: "world",
      facts: change,
      visibility: ["public"],
      tags,
    });
  }

  recordStoryAdvance(storyId, fromNode, toNode, actors = []) {
    return this.record({
      type: "STORY_ADVANCE",
      actors,
      location: "story",
      facts: { storyId, fromNode, toNode },
      visibility: [...actors],
      tags: ["story"],
    });
  }

  recordPillarDamage(factionId, pillarKey, amount, source) {
    return this.record({
      type: "PILLAR_DAMAGE",
      actors: [factionId, source],
      location: "world",
      facts: { factionId, pillar: pillarKey, amount, source },
      visibility: ["public"],
      tags: ["mainline", "pillar"],
    });
  }

  recordNpcDeath(npcId, killer, cause) {
    return this.record({
      type: "NPC_DEATH",
      actors: [npcId, killer],
      location: "town",
      facts: { npcId, killer, cause },
      visibility: ["public"],
      tags: ["death", "major"],
    });
  }

  recordBetrayal(npcId, targetFaction, details = {}) {
    return this.record({
      type: "BETRAYAL",
      actors: ["player", npcId],
      location: "town",
      facts: { npcId, targetFaction, ...details },
      visibility: ["player", npcId],
      tags: ["betrayal", "major"],
    });
  }

  // 查询
  getEventsSince(sinceDay = 1, filter = {}) {
    const all = this.worldState.state.eventHistory;
    return all.filter(e => {
      if (e.day < sinceDay) return false;
      if (filter.type && e.type !== filter.type) return false;
      if (filter.tag && !e.tags.includes(filter.tag)) return false;
      if (filter.actor && !e.actors.includes(filter.actor)) return false;
      if (filter.visibility && !e.visibility.some(v => filter.visibility.includes(v))) return false;
      return true;
    });
  }

  getRecentMajorEvents(sinceDay = 1) {
    return this.getEventsSince(sinceDay).filter(e =>
      e.tags.includes("major") || e.tags.includes("pillar") || e.tags.includes("betrayal")
    );
  }

  getFactsForKnowledge(npcId) {
    // 返回该 NPC 可见的事件事实
    return this.worldState.state.eventHistory.filter(e =>
      e.visibility.includes("public") ||
      e.visibility.includes(npcId) ||
      e.visibility.includes("all")
    );
  }
}
