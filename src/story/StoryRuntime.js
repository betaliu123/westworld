// StoryRuntime.js — StoryTree 实例生命周期管理器。
// 每个 StoryTree 定义（来自 storyData.js）可以创建 0-N 个实例。
// 实例绑定了具体的 NPC 和参数（actorBindings），随世界状态演化。
//
// 核心操作：
//   tryCreate(def, actorBindings, worldState) — 检查 startConditions，创建实例
//   checkPreconditions(instance, def, worldState, relationshipSystem) — 当前节点是否可推进
//   advance(instance, def, worldState, ...) — 移动到 nextNode 或等待 playerResponses
//   abort(id, reason) — 中止实例
//   rewrite(instance, rewrites) — 改写实例参数（由中断触发）
//   merge(fromId, intoId) — 合并实例
//   backgroundResolve(instance, def, worldState, ...) — 超时自动推进
//   checkInterrupts(worldState, eventLog) — 扫描所有实例的中断条件
//   advanceAll(worldState, eventLog) — 每日推进所有符合条件的节点

import { ALL_STORIES } from "../config/storyData.js";
import { check, checkAll, checkDeadline } from "./StoryConditions.js";
import { apply, applyAll } from "./StoryEffects.js";

export class StoryRuntime {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.relationshipSystem = deps.relationshipSystem;
    this.eventLog = deps.eventLog;
    this.npcRegistry = deps.npcRegistry;
    // 玩家真实资源系统。金钱/声望类效果必须直接写这里 ——
    // worldState.state.player.money 只是个镜像，而 syncToGame 全项目零调用，
    // 且每晚结算 Step1 的 syncFromGame 会用 economy.money 反向覆盖它，
    // 所以往镜像里扣钱等于没扣（玩家钱包分文不动）。
    this.economy = deps.economy || null;
    this.reputation = deps.reputation || null;
  }

  /**
   * 获取所有已注册的 StoryTree 定义（id -> definition）。
   */
  getAllDefinitions() {
    return ALL_STORIES;
  }

  /**
   * 获取一个 StoryTree 定义。
   */
  getDefinition(storyId) {
    return ALL_STORIES[storyId] || null;
  }

  /**
   * 尝试创建一个 StoryTree 实例。
   * 如果 startConditions 满足且 exclusionTags 不冲突，则创建并注册到 WorldState。
   *
   * @param {string} storyId
   * @param {object} actorBindings - 将 actorSlots 绑定到具体 NPC ID
   * @returns {object|null} 创建的实例，或 null
   */
  tryCreate(storyId, actorBindings = {}) {
    const def = this.getDefinition(storyId);
    if (!def) {
      console.warn(`[StoryRuntime] Unknown story: ${storyId}`);
      return null;
    }

    // 检查该故事是否已存在活跃实例（每个故事只能有一个活跃实例）
    const existing = this.worldState.getStoryInstance(storyId);
    if (existing && existing.status === "active") {
      return null;
    }

    // 检查 exclusionTags：如果有标签冲突的故事或事件已发生，则跳过
    if (def.exclusionTags && def.exclusionTags.length > 0) {
      for (const [id, inst] of Object.entries(this.worldState.state.storyInstances)) {
        if (inst.status === "completed" || inst.status === "active") {
          const otherDef = this.getDefinition(id);
          if (otherDef && otherDef.tags && def.exclusionTags.some(t => otherDef.tags.includes(t))) {
            return null;
          }
        }
      }
    }

    // 检查 startConditions
    const context = {
      worldState: this.worldState,
      relationshipSystem: this.relationshipSystem,
      actorBindings,
      storyRuntime: this,
    };

    if (!checkAll(context, def.startConditions)) {
      return null;
    }

    // 创建实例
    const instance = {
      id: storyId,
      status: "active",
      currentNode: null,
      completedNodes: [],
      chosenResponses: [],
      nodeStates: {},
      actorBindings,
      createdAt: this.worldState.day,
      flags: {},
      merges: [],
      rewrites: [],
    };

    // 找到第一个节点
    const firstNodeKey = Object.keys(def.nodes)[0];
    if (firstNodeKey) {
      instance.currentNode = firstNodeKey;
      instance.nodeStates[firstNodeKey] = {
        startedDay: this.worldState.day,
        playerDelivered: false,
        softExpired: false,
        hardExpired: false,
        missCount: 0,
      };
    }

    this.worldState.setStoryInstance(storyId, instance);

    console.log(`[StoryRuntime] Created story: ${storyId} (${def.title}) with bindings:`, actorBindings);

    // 记录创建事件
    if (this.eventLog) {
      this.eventLog.record({
        type: "STORY_CREATED",
        actors: Object.values(actorBindings),
        facts: { storyId, title: def.title, day: this.worldState.day },
        tags: ["story", "creation"],
      });
    }

    return instance;
  }

  /**
   * 获取或创建一个实例。
   * 如果已存在，返回它。如果不存在，尝试创建。
   */
  getOrCreate(storyId, actorBindings = {}) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (inst && inst.status === "active") return inst;
    return this.tryCreate(storyId, actorBindings);
  }

  /**
   * 检查当前节点的前置条件是否满足。
   * @returns {object} { canAdvance: boolean, needsPlayerChoice: boolean, deadline: object }
   */
  checkPreconditions(storyId, actorBindingsOverride = null) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst || inst.status !== "active") return { canAdvance: false };

    const def = this.getDefinition(storyId);
    if (!def || !inst.currentNode) return { canAdvance: false };

    const node = def.nodes[inst.currentNode];
    if (!node) return { canAdvance: false };

    const actorBindings = actorBindingsOverride || inst.actorBindings || {};
    const context = {
      worldState: this.worldState,
      relationshipSystem: this.relationshipSystem,
      actorBindings,
      storyRuntime: this,
    };

    // 检查前置条件
    const preconditionsMet = checkAll(context, node.preconditions || []);

    // 检查截止时间
    const deadline = checkDeadline(this.worldState.day, node.softDeadline);

    // 需要玩家选择
    const needsPlayerChoice = node.playerResponses && node.playerResponses.length > 0 && !node.canAutoAdvance;

    return {
      canAdvance: preconditionsMet && deadline.passed && !deadline.expired,
      needsPlayerChoice,
      preconditionsMet,
      deadline,
      node,
    };
  }

  /**
   * 推进一个 StoryTree 实例到下一节点。
   * 执行当前节点的 effects，然后移动到 nextNode。
   *
   * @param {string} storyId
   * @param {string|null} chosenResponseId - 如果节点有 playerResponses，玩家选择了哪个
   * @returns {object|null} 更新后的实例
   */
  advance(storyId, chosenResponseId = null) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst || inst.status !== "active") return null;

    const def = this.getDefinition(storyId);
    if (!def || !inst.currentNode) return null;

    const node = def.nodes[inst.currentNode];
    if (!node) {
      console.warn(`[StoryRuntime] Node not found in def: ${inst.currentNode}`);
      return null;
    }

    const actorBindings = inst.actorBindings || {};
    const context = {
      worldState: this.worldState,
      relationshipSystem: this.relationshipSystem,
      eventLog: this.eventLog,
      // 金钱/声望效果直接作用于真实系统，不走 worldState 镜像
      economy: this.economy,
      reputation: this.reputation,
      actorBindings,
      storyId,
      currentNode: inst.currentNode,
    };

    // 如果有玩家可选响应，需要提供选择
    if (node.playerResponses && node.playerResponses.length > 0 && !node.canAutoAdvance) {
      if (!chosenResponseId) {
        // 玩家还没选择，不推进
        return inst;
      }

      const chosen = node.playerResponses.find(r => r.id === chosenResponseId);
      if (!chosen) {
        console.warn(`[StoryRuntime] Invalid response ${chosenResponseId} for node ${inst.currentNode}`);
        return inst;
      }

      // 执行响应效果
      applyAll(context, chosen.effects || []);

      // 记录选择
      inst.chosenResponses.push(chosenResponseId);
    }

    // 执行节点效果
    applyAll(context, node.effects || []);

    // 标记节点完成
    if (!inst.completedNodes.includes(inst.currentNode)) {
      inst.completedNodes.push(inst.currentNode);
    }

    // 更新节点状态
    inst.nodeStates[inst.currentNode].completedDay = this.worldState.day;

    // 确定下一节点
    let nextNodeKey = node.nextNode;

    // 如果有玩家选择且选择了特定 nextNode
    if (node.playerResponses && chosenResponseId) {
      const chosen = node.playerResponses.find(r => r.id === chosenResponseId);
      if (chosen && chosen.nextNode) {
        nextNodeKey = chosen.nextNode;
      }
    }

    // 移动
    inst.currentNode = nextNodeKey;

    if (nextNodeKey && def.nodes[nextNodeKey]) {
      // 初始化下一节点状态
      inst.nodeStates[nextNodeKey] = {
        startedDay: this.worldState.day,
        playerDelivered: false,
        softExpired: false,
        hardExpired: false,
        missCount: 0,
      };

      // 如果下一节点有 delayDays，设置
      const nextNode = def.nodes[nextNodeKey];
      if (nextNode.delayDays) {
        inst.nodeStates[nextNodeKey].delayUntil = this.worldState.day + nextNode.delayDays;
      }

      console.log(`[StoryRuntime] ${storyId}: ${inst.completedNodes[inst.completedNodes.length - 1]} → ${nextNodeKey}`);
    } else {
      // 故事结束
      inst.status = "completed";
      inst.completedDay = this.worldState.day;
      console.log(`[StoryRuntime] ${storyId}: 完成 (completed at day ${this.worldState.day})`);

      // 执行完成效果
      if (def.completionEffects) {
        applyAll(context, def.completionEffects);
      }
    }

    this.worldState.setStoryInstance(storyId, inst);
    return inst;
  }

  /**
   * 中止一个 StoryTree 实例。
   */
  abort(storyId, reason = "unknown") {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst) return false;

    inst.status = "aborted";
    inst.abortReason = reason;
    inst.abortDay = this.worldState.day;
    this.worldState.setStoryInstance(storyId, inst);

    console.log(`[StoryRuntime] ${storyId}: 中止 (${reason})`);
    return true;
  }

  /**
   * 改写一个 StoryTree 实例的参数（由中断条件触发）。
   * 改写不影响已完成节点，只修改未执行节点的参数。
   */
  rewrite(storyId, rewrites = {}) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst || inst.status !== "active") return false;

    inst.rewrites.push({ day: this.worldState.day, ...rewrites });

    // 将改写参数合并到实例
    if (rewrites.motive) inst.rewriteMotive = rewrites.motive;
    if (rewrites.stolenRatio !== undefined) inst.rewriteStolenRatio = rewrites.stolenRatio;
    if (rewrites.description) inst.rewriteDescription = rewrites.description;

    this.worldState.setStoryInstance(storyId, inst);

    console.log(`[StoryRuntime] ${storyId}: 改写 (${JSON.stringify(rewrites)})`);
    return true;
  }

  /**
   * 合并两个 StoryTree 实例。
   * fromId 被中止，其动机和参数被合入 intoId。
   */
  merge(fromId, intoId) {
    const fromInst = this.worldState.getStoryInstance(fromId);
    const intoInst = this.worldState.getStoryInstance(intoId);

    if (!fromInst || !intoInst) return false;

    fromInst.status = "merged";
    fromInst.mergedInto = intoId;
    fromInst.abortDay = this.worldState.day;

    if (!intoInst.mergedFrom) intoInst.mergedFrom = [];
    intoInst.mergedFrom.push(fromId);

    // 复制关键参数
    if (fromInst.actorBindings) {
      Object.assign(intoInst.actorBindings || {}, fromInst.actorBindings);
    }
    if (fromInst.rewriteMotive) {
      intoInst.rewriteMotive = fromInst.rewriteMotive;
    }

    this.worldState.setStoryInstance(fromId, fromInst);
    this.worldState.setStoryInstance(intoId, intoInst);

    console.log(`[StoryRuntime] Merged ${fromId} → ${intoId}`);
    return true;
  }

  /**
   * 后台自动推进：如果节点过期超过 3 天或未处理超过 2 天，自动推进。
   * 这样即使玩家不主动处理，故事也会自然演化。
   */
  backgroundResolve(storyId) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst || inst.status !== "active" || !inst.currentNode) return null;

    const def = this.getDefinition(storyId);
    if (!def) return null;

    const node = def.nodes[inst.currentNode];
    if (!node) return null;

    const nodeState = inst.nodeStates[inst.currentNode];
    if (!nodeState) return null;

    const day = this.worldState.day;
    const daysSinceStarted = day - nodeState.startedDay;

    // 检查是否需要自动推进
    const softDeadline = node.softDeadline;
    let shouldAutoAdvance = false;

    if (softDeadline) {
      // 超过软截止（beforeDay）但没有硬截止 → 自动推进
      if (softDeadline.beforeDay && day > softDeadline.beforeDay + 2) {
        shouldAutoAdvance = true;
        nodeState.hardExpired = true;
        console.log(`[StoryRuntime] ${storyId}: 硬过期自动推进 (${inst.currentNode})`);
      }
    }

    // 如果节点有 canAutoAdvance 且已存在超过 2 天
    if (node.canAutoAdvance && daysSinceStarted >= 2 && !node.playerResponses) {
      shouldAutoAdvance = true;
    }

    // 如果 missCount >= 3，强制推进
    if (nodeState.missCount >= 3) {
      shouldAutoAdvance = true;
      console.log(`[StoryRuntime] ${storyId}: 错过 3 次自动推进 (${inst.currentNode})`);
    }

    // 强制推进。
    //
    // 原来这里是 `if (shouldAutoAdvance && node.canAutoAdvance)`，而内层又判
    // `!node.canAutoAdvance` —— 两个条件互斥，导致「玩家一直没选就用默认选项」
    // 这段永远不执行。后果：所有需要抉择的节点一旦玩家没响应就**永久卡死**，
    // 整棵树停在第一个选择点（ST01 卡在 join、ST02 卡在 return）。
    if (shouldAutoAdvance) {
      const hasChoices = node.playerResponses && node.playerResponses.length > 0;
      if (hasChoices) {
        // 用第一个选项当默认（剧本里第一个通常是最保守/最中性的那个）
        const defaultResponse = node.playerResponses[0].id;
        console.log(`[StoryRuntime] ${storyId}: 玩家未抉择，采用默认选项 ${defaultResponse} (${inst.currentNode})`);
        return this.advance(storyId, defaultResponse);
      }
      if (node.canAutoAdvance) return this.advance(storyId);
    }

    return null;
  }

  /**
   * 检查所有活跃实例的中断条件（跨故事交叉影响）。
   * 每个故事定义可能包含 interrupts，监测其他故事的状态来改写自己。
   */
  checkInterrupts(worldState, eventLog) {
    // 先检查每个故事定义中的 interrupts
    for (const [storyId, def] of Object.entries(ALL_STORIES)) {
      const inst = worldState.getStoryInstance(storyId);
      if (!inst || inst.status !== "active") continue;

      for (const interrupt of (def.interrupts || [])) {
        const context = {
          worldState,
          relationshipSystem: this.relationshipSystem,
          actorBindings: inst.actorBindings || {},
          storyRuntime: this,
        };

        if (check({ ...context, condition: interrupt.condition })) {
          console.log(`[StoryRuntime] Interrupt triggered: ${storyId}.${interrupt.id}`);

          if (interrupt.action === "rewrite") {
            this.rewrite(storyId, interrupt.rewriteParams || {});
          } else if (interrupt.action === "abort") {
            this.abort(storyId, interrupt.reason || interrupt.id);
          } else if (interrupt.action === "merge") {
            this.merge(interrupt.fromId, interrupt.intoId);
          }

          // 记录中断事件
          if (this.eventLog) {
            this.eventLog.record({
              type: "STORY_INTERRUPT",
              actors: [],
              facts: { storyId, interruptId: interrupt.id, action: interrupt.action },
              tags: ["story", "interrupt"],
            });
          }
        }
      }
    }

    // 检查节点级中断（node.interrupts）
    for (const [storyId, inst] of Object.entries(worldState.state.storyInstances)) {
      if (inst.status !== "active" || !inst.currentNode) continue;

      const def = ALL_STORIES[storyId];
      if (!def) continue;

      const node = def.nodes[inst.currentNode];
      if (!node || !node.interrupts) continue;

      for (const [interruptId, interruptDef] of Object.entries(node.interrupts)) {
        const context = {
          worldState,
          relationshipSystem: this.relationshipSystem,
          actorBindings: inst.actorBindings || {},
          storyRuntime: this,
        };

        if (check({ ...context, condition: interruptDef.condition })) {
          if (interruptDef.rewrite) {
            this.rewrite(storyId, interruptDef.rewrite);
          }
        }
      }
    }
  }

  /**
   * 扫描 NPC 注册表，为故事的 actorSlots 匹配合适的 NPC。
   * @returns {object|null} actorBindings 映射，如 { protege: "npc_erin", relative: "npc_eli" }
   */
  _buildActorBindings(worldState, storyDef) {
    const slots = storyDef.actorSlots;
    if (!slots || Object.keys(slots).length === 0) return null;

    if (!this.npcRegistry) {
      console.warn(`[StoryRuntime] npcRegistry not available, cannot build actorBindings for ${storyDef.id}`);
      return null;
    }

    const bindings = {};
    const usedNpcs = new Set();

    for (const [slotKey, slotDef] of Object.entries(slots)) {
      const hasRequiredTags = slotDef.requiredTags && slotDef.requiredTags.length > 0;

      const candidates = this.npcRegistry.getAll().filter(npc => {
        if (!npc.alive) return false;
        if (usedNpcs.has(npc.id)) return false;

        // 按 requiredTags 匹配（需要 NPC 的 storyTags 包含所有 requiredTags）
        if (hasRequiredTags) {
          const npcTags = npc.storyTags || [];
          if (!slotDef.requiredTags.every(t => npcTags.includes(t))) return false;
        }

        // 按 factionId 过滤
        if (slotDef.factionId !== undefined && npc.factionId !== slotDef.factionId) return false;

        // 按 role 过滤
        if (slotDef.role && npc.role !== slotDef.role) return false;

        return true;
      });

      if (candidates.length === 0) {
        // 如果该 slot 需要特定标签却没找到人，则跳过（可选 slot）
        if (hasRequiredTags) {
          console.warn(`[StoryRuntime] No NPC found for optional slot "${slotKey}" in ${storyDef.id}`);
          continue; // 跳过这个 slot，继续匹配其他的
        }
        // 没有特定标签要求但也没候选人 → 也跳过
        console.warn(`[StoryRuntime] No NPC available for slot "${slotKey}" in ${storyDef.id}`);
        continue;
      }

      // 选与玩家关系最深的 NPC（trust 最高的），没有关系则随机
      const best = candidates.sort((a, b) => {
        const relA = worldState.getRelationship(a.id, "player");
        const relB = worldState.getRelationship(b.id, "player");
        return (relB?.trust || 0) - (relA?.trust || 0);
      })[0];

      bindings[slotKey] = best.id;
      usedNpcs.add(best.id);
      console.log(`[StoryRuntime] Slot "${slotKey}" → ${best.displayName} (${best.id}) for ${storyDef.id}`);
    }

    return Object.keys(bindings).length > 0 ? bindings : null;
  }

  /**
   * 每日推进所有符合条件的 StoryTree（DailySimulation.step 10 调用）。
   */
  advanceAll(worldState, eventLog) {
    const day = worldState.day;
    const results = [];

    // 首先尝试创建尚未开始的故事（带 NPC 绑定）
    for (const [storyId, def] of Object.entries(ALL_STORIES)) {
      const inst = worldState.getStoryInstance(storyId);
      if (!inst || inst.status === "pending") {
        // 扫描 NPC 注册表，为 actorSlots 匹配合适的 NPC
        const bindings = this._buildActorBindings(worldState, def);
        if (bindings && Object.keys(bindings).length > 0) {
          this.tryCreate(storyId, bindings);
        } else {
          this.tryCreate(storyId); // 没有需要绑定的 NPC，直接创建
        }
      }
    }

    // 推进所有活跃故事
    for (const [storyId, inst] of Object.entries(worldState.state.storyInstances)) {
      if (inst.status !== "active" || !inst.currentNode) continue;

      const def = ALL_STORIES[storyId];
      if (!def) continue;

      const node = def.nodes[inst.currentNode];
      if (!node) continue;

      const nodeState = inst.nodeStates[inst.currentNode];
      if (!nodeState) continue;

      // 如果有 delayUntil 且还没到，跳过
      if (nodeState.delayUntil && day < nodeState.delayUntil) continue;

      // 检查软截止
      const deadline = checkDeadline(day, node.softDeadline);

      // 如果可以自动推进且软截止已过
      if (deadline.passed && node.canAutoAdvance && !(node.playerResponses && node.playerResponses.length > 0 && !node.canAutoAdvance)) {
        const result = this.advance(storyId);
        if (result) results.push({ storyId, node: inst.currentNode, previousNode: inst.completedNodes[inst.completedNodes.length - 1] });
      } else if (deadline.expired) {
        // 过期了：尝试后台推进
        const result = this.backgroundResolve(storyId);
        if (result) results.push({ storyId, backgroundResolved: true });
      }
    }

    return results;
  }

  /**
   * 获取所有活跃的 StoryTree 实例摘要（供手机故事 tab 展示）。
   * @returns {Array} [{ storyId, title, currentNode, nodeTitle, type, description, actorBindings, missCount, channelHint, needsPlayerChoice, deadlineDays }]
   */
  getActiveStories() {
    const out = [];
    const day = this.worldState.day;
    for (const [storyId, inst] of Object.entries(this.worldState.state.storyInstances || {})) {
      if (inst.status !== "active" || !inst.currentNode) continue;
      const def = ALL_STORIES[storyId];
      if (!def) continue;
      const node = def.nodes[inst.currentNode];
      if (!node) continue;
      const nodeState = inst.nodeStates[inst.currentNode] || {};
      const dl = node.softDeadline;
      const chans = (node.candidateDeliveries || []).map((c) => c.channel).filter(Boolean);
      const channelHint = chans.length
        ? chans.map((c) => ({ location: "去镇里找", hq: "回驻地", phone: "等手机消息", newspaper: "看报纸", rumor: "在酒馆/广场打听" })[c] || c).join(" · ")
        : null;
      out.push({
        storyId,
        title: def.title,
        currentNode: inst.currentNode,
        nodeTitle: node.title,
        type: node.type || "?",
        description: node.description || "",
        actorBindings: inst.actorBindings || {},
        missCount: nodeState.missCount || 0,
        needsPlayerChoice: !!(node.playerResponses && node.playerResponses.length > 0 && !node.canAutoAdvance),
        channelHint,
        deadlineDays: dl?.beforeDay ? dl.beforeDay - day : null,
      });
    }
    return out;
  }

  /**
   * 获取所有活跃的 StoryTree 候选交付节点（供 Director 使用）。
   * @returns {Array} [{ storyId, nodeId, title, description, candidateDeliveries, emotionalIntensity, cooldownTags }]
   */
  getCandidateDeliveries() {
    const candidates = [];
    const day = this.worldState.day;

    for (const [storyId, inst] of Object.entries(this.worldState.state.storyInstances)) {
      if (inst.status !== "active" || !inst.currentNode) continue;

      const def = ALL_STORIES[storyId];
      if (!def) continue;

      const node = def.nodes[inst.currentNode];
      if (!node || !node.candidateDeliveries) continue;

      const nodeState = inst.nodeStates[inst.currentNode];
      if (!nodeState) continue;

      // 已投放过的不再候选
      if (nodeState.playerDelivered) continue;

      // 延迟未到
      if (nodeState.delayUntil && day < nodeState.delayUntil) continue;

      candidates.push({
        storyId,
        nodeId: inst.currentNode,
        title: node.title,
        description: node.description,
        candidateDeliveries: node.candidateDeliveries,
        emotionalIntensity: node.emotionalIntensity || 1,
        cooldownTags: node.cooldownTags || [],
        deadline: checkDeadline(day, node.softDeadline),
        needsPlayerChoice: !!(node.playerResponses && node.playerResponses.length > 0 && !node.canAutoAdvance),
        missCount: nodeState.missCount || 0,
      });
    }

    return candidates;
  }

  /**
   * 标记一个故事节点为已交付（由 Director/DeliveryPlanner 调用）。
   */
  markDelivered(storyId) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst || !inst.currentNode) return;

    const nodeState = inst.nodeStates[inst.currentNode];
    if (!nodeState) return;

    nodeState.playerDelivered = true;
    this.worldState.setStoryInstance(storyId, inst);
  }

  /**
   * 标记一个故事节点为错过（玩家不在交付通道范围内）。
   */
  markMissed(storyId) {
    const inst = this.worldState.getStoryInstance(storyId);
    if (!inst || !inst.currentNode) return;

    const nodeState = inst.nodeStates[inst.currentNode];
    if (!nodeState) return;

    nodeState.missCount = (nodeState.missCount || 0) + 1;
    this.worldState.setStoryInstance(storyId, inst);
  }

  /**
   * 获取故事的进度摘要（供 UI/Debug 面板使用）。
   */
  getProgress(storyId) {
    const inst = this.worldState.getStoryInstance(storyId);
    const def = ALL_STORIES[storyId];
    if (!def) return null;

    const result = {
      storyId,
      title: def.title,
      status: inst ? inst.status : "not_started",
      currentNode: inst ? inst.currentNode : null,
      currentNodeTitle: inst && inst.currentNode && def.nodes[inst.currentNode] ? def.nodes[inst.currentNode].title : null,
      completedNodes: inst ? inst.completedNodes : [],
      totalNodes: Object.keys(def.nodes).length,
      completionPercent: inst ? Math.round(inst.completedNodes.length / Object.keys(def.nodes).length * 100) : 0,
      actorBindings: inst ? inst.actorBindings : {},
      rewrites: inst ? inst.rewrites : [],
    };

    return result;
  }

  /**
   * 获取所有故事的进度。
   */
  getAllProgress() {
    const results = [];
    for (const storyId of Object.keys(ALL_STORIES)) {
      results.push(this.getProgress(storyId));
    }
    return results;
  }
}
