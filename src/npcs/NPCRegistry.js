// NPCRegistry.js — 重要 NPC 持久档案管理器。管理 12 名重要 NPC 的生命周期数据。
// 场景里的 NPC 实体可以加载和卸载，但这里的档案不会消失。

import { IMPORTANT_NPCS, INITIAL_RELATIONSHIPS, DEFAULT_RELATIONSHIP } from "../config/npcData.js";

export class NPCRegistry {
  constructor(worldState) {
    this.worldState = worldState;
    this._initProfiles();
  }

  // 初始化所有 12 个 NPC 档案到 WorldState
  _initProfiles() {
    const ws = this.worldState;
    for (const def of IMPORTANT_NPCS) {
      if (!ws.getNPC(def.id)) {
        // 深拷贝防止引用共享
        ws.setNPC(def.id, JSON.parse(JSON.stringify(def)));
      }
    }
  }

  // 获取 NPC 档案
  get(npcId) {
    return this.worldState.getNPC(npcId);
  }

  // 更新 NPC 档案中的字段
  update(npcId, updates) {
    const npc = this.worldState.getNPC(npcId);
    if (!npc) return;
    Object.assign(npc, updates);
    this.worldState.setNPC(npcId, npc);
  }

  // 全部 NPC ID
  getAllIds() {
    return IMPORTANT_NPCS.map(n => n.id);
  }

  // 获取所有 NPC 档案
  getAll() {
    return IMPORTANT_NPCS.map(def => this.worldState.getNPC(def.id)).filter(Boolean);
  }

  // 按 displayName 查找（支持部分匹配：短名如"杰克"→全名"杰克·莫罗"）
  findByDisplayName(displayName) {
    if (!displayName) return null;
    // 精确匹配
    const exact = IMPORTANT_NPCS.find(n => n.displayName === displayName);
    if (exact) return exact;
    // 部分匹配：displayName 包含查询词 或 查询词包含 displayName
    return IMPORTANT_NPCS.find(n =>
      n.displayName.includes(displayName) || displayName.includes(n.displayName)
    ) || null;
  }

  // 按势力筛选
  getByFaction(factionId) {
    return this.getAll().filter(n => n.factionId === factionId);
  }

  // 按标签筛选
  getByTags(tags) {
    return this.getAll().filter(n =>
      tags.some(t => (n.storyTags || []).includes(t))
    );
  }

  // 检查 NPC 是否存活
  isAlive(npcId) {
    const npc = this.get(npcId);
    return npc && npc.alive;
  }

  // 杀死 NPC
  kill(npcId, cause = "unknown") {
    const npc = this.get(npcId);
    if (!npc || !npc.alive) return;
    npc.alive = false;
    npc.healthState = "dead";
    this.worldState.setNPC(npcId, npc);
  }

  // NPC 变更势力
  changeFaction(npcId, newFactionId, newRank = 0) {
    const npc = this.get(npcId);
    if (!npc) return;
    const oldFaction = npc.factionId;
    npc.factionId = newFactionId;
    npc.factionRank = newRank;
    this.worldState.setNPC(npcId, npc);

    // 更新势力成员列表
    if (oldFaction) {
      const faction = this.worldState.getFaction(oldFaction);
      if (faction) {
        faction.members = faction.members.filter(m => m !== npcId);
      }
    }
    if (newFactionId) {
      const faction = this.worldState.getFaction(newFactionId);
      if (faction && !faction.members.includes(npcId)) {
        faction.members.push(npcId);
      }
    }

    return { npcId, oldFaction, newFactionId };
  }

  // 揭露秘密
  revealSecret(npcId, secretId, knowerId) {
    const npc = this.get(npcId);
    if (!npc) return;
    const secret = (npc.secrets || []).find(s => s.id === secretId);
    if (!secret || secret.revealed) return;
    if (!secret.knownBy.includes(knowerId)) {
      secret.knownBy.push(knowerId);
    }
    this.worldState.setNPC(npcId, npc);
  }

  // 添加记忆
  addMemory(npcId, memory) {
    const npc = this.get(npcId);
    if (!npc) return;
    npc.memories.push({
      day: this.worldState.day,
      ...memory,
    });
    if (npc.memories.length > 50) npc.memories.shift();
    this.worldState.setNPC(npcId, npc);
  }

  // 添加知识
  addKnowledge(npcId, fact, confidence = 0.5) {
    const npc = this.get(npcId);
    if (!npc) return;
    const existing = npc.knowledge.find(k => k.fact === fact);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, confidence);
    } else {
      npc.knowledge.push({ fact, confidence, acquiredDay: this.worldState.day });
    }
    this.worldState.setNPC(npcId, npc);
  }

  // ---- 每日 NPC 行动 ----
  settleDailyActions(worldState, relationshipSystem, eventLog) {
    const day = worldState.day;
    for (const npcDef of IMPORTANT_NPCS) {
      const npc = worldState.getNPC(npcDef.id);
      if (!npc || !npc.alive) continue;

      // 每个 NPC 每天最多选一个行动
      const action = this._pickDailyAction(npc, worldState, relationshipSystem);
      if (!action) continue;

      // 执行行动
      this._executeAction(npc, action, worldState, relationshipSystem, eventLog);
    }
  }

  _pickDailyAction(npc, worldState, relationshipSystem) {
    const day = worldState.day;
    const options = [];

    // 工作赚钱
    if (npc.needs.money > 30) {
      options.push({
        type: "work",
        score: npc.needs.money * 1.5 + npc.traits.ambition * 30,
        effect: { money: -(npc.needs.money * 0.3), earn: 15 + Math.random() * 25 },
      });
    }

    // 处理个人需求（安全/归属）
    if (npc.needs.safety > 50 || npc.needs.belonging > 50) {
      options.push({
        type: "personal_needs",
        score: (npc.needs.safety + npc.needs.belonging) * 0.8,
        effect: { safety: -15, belonging: -10 },
      });
    }

    // 建立关系
    if (npc.traits.sociability > 0.4 && Math.random() < 0.5) {
      options.push({
        type: "build_relationship",
        score: npc.traits.sociability * 60 + npc.needs.belonging * 0.5,
        effect: { relationshipChange: 5 },
      });
    }

    // 搜集情报
    if (npc.role === "journalist" || npc.role === "bookkeeper" || npc.traits.bravery > 0.5) {
      options.push({
        type: "gather_intel",
        score: 30 + (npc.traits.bravery + npc.traits.ambition) * 25,
        effect: { intelGained: true },
      });
    }

    // 阵营任务
    if (npc.factionId && npc.factionRank >= 2) {
      options.push({
        type: "faction_duty",
        score: 50 + npc.factionRank * 10,
        effect: { factionContribution: true },
      });
    }

    // 复仇
    if (npc.needs.revenge > 40) {
      options.push({
        type: "revenge",
        score: npc.needs.revenge * 2,
        effect: { revengeAttempt: true },
      });
    }

    // 按分数排序，选最高
    options.sort((a, b) => b.score - a.score);
    return options[0] || null;
  }

  _executeAction(npc, action, worldState, relationshipSystem, eventLog) {
    switch (action.type) {
      case "work":
        npc.needs.money = Math.max(0, npc.needs.money + action.effect.money);
        if (action.effect.earn) {
          // NPC 赚的钱增加其个人储备（不影响玩家）
        }
        break;
      case "personal_needs":
        npc.needs.safety = Math.max(0, npc.needs.safety + action.effect.safety);
        npc.needs.belonging = Math.max(0, npc.needs.belonging + action.effect.belonging);
        break;
      case "build_relationship": {
        // 随机找个 NPC 加深关系
        const others = IMPORTANT_NPCS.filter(o => o.id !== npc.id && NPC_REGISTRY_IDS.includes(o.id));
        if (others.length > 0) {
          const target = others[Math.floor(Math.random() * others.length)];
          const rel = relationshipSystem.getOrCreate(npc.id, target.id);
          rel.trust = Math.min(100, rel.trust + 3);
          rel.affection = Math.min(100, rel.affection + 2);
          relationshipSystem.set(npc.id, target.id, rel);
        }
        break;
      }
      case "gather_intel":
        // 给 NPC 添加一个新知识
        this.addKnowledge(npc.id, `D${worldState.day}收集到的新情报_${Math.random().toString(36).slice(2, 6)}`, 0.6);
        break;
      case "faction_duty":
        // 势力任务：对敌方造成轻微削弱
        if (npc.factionId === "black_hoof") {
          const pf = worldState.state.factions.player;
          pf.morale = Math.max(0, pf.morale - 2);
        }
        break;
      case "revenge":
        npc.needs.revenge = Math.max(0, npc.needs.revenge - 20);
        break;
    }
    worldState.setNPC(npc.id, npc);
  }
}

// 内部引用（避免循环依赖）
const NPC_REGISTRY_IDS = [
  "npc_erin", "npc_jack", "npc_martha", "npc_noah",
  "npc_silas", "npc_victor", "npc_rosa", "npc_eli",
  "npc_hector", "npc_amos", "npc_bessie", "npc_thomas",
  "npc_carl", "npc_wei", "npc_lillian", "npc_brown", "npc_mary",
];
