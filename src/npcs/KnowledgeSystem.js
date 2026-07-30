// KnowledgeSystem.js — NPC 知识系统。
// 管理每个 NPC 知道什么信息，以及信息可靠度。

export class KnowledgeSystem {
  constructor(worldState) {
    this.worldState = worldState;
  }

  /**
   * 给 NPC 添加一条知识
   * @param {string} npcId
   * @param {string} factId - 事实 ID
   * @param {object} entry - { factId, sourceId, confidence(0-1), distortion, acquiredDay }
   */
  addKnowledge(npcId, entry) {
    const ws = this.worldState;
    if (!ws.state.knowledge[npcId]) {
      ws.state.knowledge[npcId] = [];
    }

    // 更新已有知识的可信度
    const existing = ws.state.knowledge[npcId].find(k => k.factId === entry.factId);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, entry.confidence || 0.3);
      existing.acquiredDay = ws.day;
    } else {
      ws.state.knowledge[npcId].push({
        factId: entry.factId,
        sourceId: entry.sourceId || "unknown",
        confidence: entry.confidence || 0.3,
        distortion: entry.distortion || null,
        acquiredDay: ws.day,
      });
    }
  }

  // 获取 NPC 的所有知识
  getKnowledge(npcId) {
    return this.worldState.state.knowledge[npcId] || [];
  }

  // 获取 NPC 对某事实的认知
  getFactKnowledge(npcId, factId) {
    const knowledge = this.getKnowledge(npcId);
    return knowledge.find(k => k.factId === factId) || null;
  }

  // 传播知识（NPC A 告诉 NPC B 某事实）
  spreadKnowledge(fromNpcId, toNpcId, factId, distortionChance = 0.2) {
    const sourceKnowledge = this.getFactKnowledge(fromNpcId, factId);
    if (!sourceKnowledge) return false;

    const confidence = sourceKnowledge.confidence * (1 - distortionChance);
    const distortion = Math.random() < distortionChance
      ? ["location_inaccurate", "identity_wrong", "timeline_off", "exaggerated"][Math.floor(Math.random() * 4)]
      : null;

    this.addKnowledge(toNpcId, {
      factId,
      sourceId: fromNpcId,
      confidence,
      distortion,
    });
    return true;
  }

  // 信息可靠度文字描述
  static confidenceLabel(confidence) {
    if (confidence >= 0.8) return "已证实";
    if (confidence >= 0.5) return "可信";
    if (confidence >= 0.3) return "传闻";
    return "可疑";
  }

  // NPC 愿意透露的信息等级（基于关系和知识）
  getDisclosureLevel(npcId, targetId, relationshipSystem) {
    const rel = relationshipSystem.get(npcId, targetId);
    if (!rel) return 0;

    const trust = rel.trust || 0;
    const fear = rel.fear || 0;
    const debt = rel.debt || 0;

    // 等级 0: 闲聊, 1: 个人信息, 2: 模糊情报, 3: 具体情报, 4: 秘密
    if (trust >= 70 && debt >= 30) return 4;
    if (trust >= 50) return 3;
    if (trust >= 30 || fear >= 50) return 2;
    if (trust >= 10 || fear >= 30) return 1;
    return 0;
  }

  // 根据透露等级筛选可透露的知识
  getDisclosableKnowledge(npcId, targetId, relationshipSystem) {
    const level = this.getDisclosureLevel(npcId, targetId, relationshipSystem);
    const allKnowledge = this.getKnowledge(npcId);

    return allKnowledge.filter(k => {
      if (level >= 3) return true;
      if (level >= 2) return k.confidence >= 0.5;
      if (level >= 1) return k.confidence >= 0.7;
      return false;
    });
  }
}
