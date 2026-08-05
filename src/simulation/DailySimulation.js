// DailySimulation.js — 每日世界演化编排器。
// 在玩家睡觉后，按固定顺序执行 15 步结算。
// 完全确定性，不调用模型（模型调用由外部 NarrativeService 处理）。

export class DailySimulation {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.eventLog = deps.eventLog;
    this.playerCondition = deps.playerCondition;
    this.factionSystem = deps.factionSystem;
    this.operationSystem = deps.operationSystem;
    this.npcRegistry = deps.npcRegistry;
    this.relationshipSystem = deps.relationshipSystem;
    this.storyRuntime = deps.storyRuntime;
    this.director = deps.director;
    this.narrativeService = deps.narrativeService;
    this.economy = deps.economy;
    this.reputation = deps.reputation;
    this.newspaper = deps.newspaper;
    this.phone = deps.phone;
    this.npcManager = deps.npcManager || null;
    this.deliveryPlanner = deps.deliveryPlanner || null;
    this.stockMarket = deps.stockMarket || null;
    this.taskSystem = deps.taskSystem || null;
    this.nemesis = deps.nemesis || null;       // 组织架构/卧底/晋升
    this.law = deps.law || null;               // 警长势力（第三方）

    this._listeners = {};
  }

  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  _emit(event, data = {}) {
    for (const cb of (this._listeners[event] || [])) cb(data);
  }

  /**
   * 执行每日结算（同步，不等待 LLM）。LLM 异步调用由外部触发。
   * @returns {object} 结算摘要
   */
  run(economy, reputation, newspaper, hud) {
    const ws = this.worldState;
    const day = ws.day;
    const errors = [];
    // 存一份给 _applyEvent 用：每日事件的金钱变化必须落到真钱包
    this._economy = economy;
    this._reputation = reputation;
    console.log(`[DailySimulation] === 第 ${day} 天结算开始 ===`);

    // 辅助：安全执行一步，失败时记录错误并继续
    const safeStep = (label, fn) => {
      try {
        fn();
      } catch (e) {
        const msg = `[DailySimulation] ❌ ${label} 失败: ${e.message || e}`;
        console.error(msg);
        errors.push({ step: label, error: e.message || String(e) });
      }
    };

    // Step 1: 冻结当天玩家输入（从 game 系统同步到 worldState）
    safeStep("Step1: syncFromGame", () => {
      if (economy && reputation) ws.syncFromGame(economy, reputation, { day, hour: 18 });
    });

    // Step 2: 写入最后一批结构化事件
    safeStep("Step2: DAY_END event", () => {
      if (this.eventLog) {
        this.eventLog.record({
          type: "DAY_END",
          actors: ["player"],
          location: "world",
          facts: { day },
          visibility: ["player"],
          tags: ["daily"],
        });
      }
    });

    // Step 3: 结算玩家状态与驻地消耗
    safeStep("Step3: playerCondition", () => {
      if (this.playerCondition) {
        const quality = this.playerCondition.mealBuff ? 1.3 : 1;
        this.playerCondition.sleepRecovery(quality);
        ws.state.player.health = this.playerCondition.health;
        ws.state.player.energy = this.playerCondition.energy;
        ws.state.player.fatigue = this.playerCondition.fatigue;
      }
    });

    // Step 3.5: 每日基础收入
    safeStep("Step3.5: baseIncome", () => {
      if (economy) {
        const baseIncome = 10 + Math.floor(Math.random() * 11);
        economy.addMoney(baseIncome);
        ws.state.player.money = economy.money;
      }
    });

    // Step 3.6: 股票日结算
    safeStep("Step3.6: stockMarket", () => {
      if (this.stockMarket) {
        const recentArticles = ws.state.newspaperQueue || [];
        const factionActions = ws.state.lastFactionActions || [];
        this.stockMarket.settleDay(recentArticles, factionActions);
      }
    });

    // Step 4: 结算已派遣行动
    safeStep("Step4: operationSystem", () => {
      if (this.operationSystem) {
        const results = this.operationSystem.settleAll();
        if (results.length > 0) {
          for (const r of results) {
            if (this.eventLog) {
              this.eventLog.record({
                type: "OPERATION_RESULT",
                actors: ["player", ...(r.members || [])],
                location: "world",
                // 键名必须是 outcome：StoryConditions.event_type_occurred 读的是
                // ev.facts?.outcome（StoryConditions.js:139）。以前写成 result，
                // 导致 ST11「失踪成员」的启动条件永远匹配不上、整棵树永不启动。
                facts: { operationId: r.id, outcome: r.outcome, result: r.outcome, details: r },
                visibility: ["player"],
                tags: ["operation", r.success ? "success" : "failure"],
              });
            }
          }
        }
      }
    });

    // Step 5: 结算产业收入、股票和债务
    safeStep("Step5: factionSystem.settleIncome", () => {
      if (this.factionSystem) {
        this.factionSystem.settleIncome(ws);
      }
    });

    // Step 6: 每个势力选择并执行一个行动
    safeStep("Step6: factionSystem.settleFactionActions", () => {
      if (this.factionSystem) {
        this.factionSystem.settleFactionActions(ws, this.eventLog);
      }
    });

    // Step 7: 每个重要 NPC 选择并执行一个行动
    safeStep("Step7: npcRegistry.settleDailyActions", () => {
      if (this.npcRegistry) {
        this.npcRegistry.settleDailyActions(ws, this.relationshipSystem, this.eventLog);
      }
    });

    // Step 8: 更新关系、记忆、伤势、位置
    safeStep("Step8: relationshipSystem.decayAll", () => {
      if (this.relationshipSystem) {
        this.relationshipSystem.decayAll(ws);
      }
    });

    // Step 8.5: 亲友报复结算
    safeStep("Step8.5: settleGrudgeRevenge", () => {
      if (this.npcManager && this.playerPos) {
        this.npcManager.settleGrudgeRevenge(day, this.playerPos);
      }
    });

    // Step 9: 检查 StoryTree 中断和改写
    safeStep("Step9: storyRuntime.checkInterrupts", () => {
      if (this.storyRuntime) {
        this.storyRuntime.checkInterrupts(ws, this.eventLog);
      }
    });

    // Step 10: 推进符合条件的 StoryTree
    safeStep("Step10: storyRuntime.advanceAll", () => {
      if (this.storyRuntime) {
        this.storyRuntime.advanceAll(ws, this.eventLog);
      }
    });

    // Step 10.5: 处理投递失败的 beats
    safeStep("Step10.5: deliveryPlanner.processMissedBeats", () => {
      if (this.deliveryPlanner) {
        this.deliveryPlanner.processMissedBeats();
      }
    });

    // Step 11: AI 导演选择次日计划
    let directorPlan = null;
    safeStep("Step11: director.selectDailyPlan", () => {
      if (this.director) {
        directorPlan = this.director.selectDailyPlan(ws, this.storyRuntime);
        ws.state.directorPlan = {
          beats: directorPlan.beats || [],
          foregroundLimit: 1,
          backgroundLimit: 2,
          forbiddenTags: directorPlan.forbiddenTags || [],
          requiredFunctions: directorPlan.requiredFunctions || [],
        };
      }
    });

    // Step 12: 始终使用模板文本（LLM 异步触发，不阻塞结算）
    safeStep("Step12: _generateFallbackText", () => {
      this._generateFallbackText(ws, directorPlan);
    });

    // Step 13: 触发保存事件
    safeStep("Step13: emit save", () => {
      this._emit("save", { day, state: ws.toJSON() });
    });

    // 无论如何推进天数（即使部分步骤失败）
    ws.state.day = day;

    // Step 14: Nemesis 结算 —— 卧底送情报、怀疑度累积、暴露的被清洗
    let nemesisResult = null;
    safeStep("Step14: nemesis.settleDaily", () => {
      if (this.nemesis) nemesisResult = this.nemesis.settleDaily();
    });

    // Step 14.5: 警长势力结算 —— 卧底情报折算证据、黑蹄会行贿、够证据就突袭。
    // 必须排在 Nemesis 之后：它要读当天新产出的情报。
    let lawResult = null;
    safeStep("Step14.5: law.settleDaily", () => {
      if (this.law) lawResult = this.law.settleDaily();
    });

    // Step 15: 胜负判定。
    // 这一步以前根本没人调 —— checkVictory 写好了却零调用者，
    // 于是玩家无论做什么，游戏都不会结束。现在接上，并把结果写进
    // ws.state.victoryState（WorldState 早就留了这个字段）。
    safeStep("Step15: checkVictory", () => {
      if (!this.factionSystem?.checkVictory) return;
      if (ws.state.victoryState) return;                 // 已经定局就不再改
      const v = this.factionSystem.checkVictory(ws);
      if (!v) return;
      ws.state.victoryState = v;
      this.eventLog?.record?.({
        type: "VICTORY", facts: { outcome: v, day }, tags: ["endgame"],
      });
      this._emit("victory", { outcome: v, day });
      console.log(`[DailySimulation] === 结局判定：${v} ===`);
    });

    if (errors.length > 0) {
      console.warn(`[DailySimulation] === 第 ${day} 天结算完成（${errors.length} 个步骤失败）===`);
      console.warn(`[DailySimulation] 失败步骤:`, errors.map(e => e.step).join(", "));
    } else {
      console.log(`[DailySimulation] === 第 ${day} 天结算完成 ===`);
    }
    return {
      day, directorPlan, nemesis: nemesisResult, law: lawResult,
      victory: ws.state.victoryState || null,
      errors: errors.length > 0 ? errors : null,
    };
  }

  /**
   * 异步调用 LLM 生成内容。不阻塞，完成后通过回调注入。
   * 由 main.js sleep handler 在 day advance 后触发。
   */
  async fireLLMAsync() {
    const ws = this.worldState;
    if (!this.narrativeService || !this.narrativeService.enabled) return;
    if (!ws || !ws.state) return;

    const directorPlan = ws.state.directorPlan;
    console.log("[DailySimulation] 🔮 后台 LLM 开始生成……");

    try {
      const llmResult = await this.narrativeService.generateDailyText(ws, directorPlan);
      if (!llmResult || !llmResult.textPackages || llmResult.textPackages.length === 0) {
        console.log("[DailySimulation] LLM 未返回有效内容");
        return;
      }

      // 注入报纸和手机消息
      for (const pkg of llmResult.textPackages) {
        if (pkg.newspaperHeadline) {
          ws.queueNewspaper({
            title: pkg.newspaperHeadline,
            body: pkg.newspaperBody || "",
            beatId: pkg.beatId,
            fromLLM: true,
          });
        }
        if (pkg.phoneMessage) {
          const slots = ["morning", "noon", "evening"];
          ws.queuePhoneMessage({
            from: pkg.from || "未知",
            npcId: pkg.from || "system",
            text: pkg.phoneMessage,
            beatId: pkg.beatId,
            fromLLM: true,
            deliverSlot: slots[Math.floor(Math.random() * slots.length)],
          });
        }
      }

      // 注入 AI 生成的每日任务
      if (llmResult.dailyTask && this.taskSystem) {
        const dt = llmResult.dailyTask;
        const overrides = { from: "newspaper", reward: {} };
        if (dt.rewardMoney) overrides.reward.money = dt.rewardMoney;
        if (dt.rewardHonor) overrides.reward.honor = dt.rewardHonor;

        if (dt.type === "bounty" && dt.targetNpcName) {
          for (const [id, npc] of Object.entries(ws.state.npcs || {})) {
            if (npc.alive && (npc.displayName === dt.targetNpcName || npc.name === dt.targetNpcName)) {
              overrides.targetNpcId = id;
              break;
            }
          }
        }
        if (dt.type === "delivery" && dt.targetBuilding) {
          overrides.targetBuilding = dt.targetBuilding;
        }

        const task = this.taskSystem.createTaskForType(dt.type, overrides);
        if (task) {
          task.title = dt.title || task.title;
          task.description = dt.description || task.description;
          console.log("[DailySimulation] AI 生成了任务:", task.title);
        }
      }

      console.log("[DailySimulation] ✅ LLM 内容就绪:");
      console.log(`  └─ 标题: ${llmResult.textPackages.map(p => p.newspaperHeadline).filter(Boolean).join(", ")}`);
      console.log(`  └─ 消息: ${llmResult.textPackages.map(p => p.phoneMessage).filter(Boolean).join(" | ")}`);
      if (llmResult.dailyTask) console.log(`  └─ 任务: ${llmResult.dailyTask.title} (${llmResult.dailyTask.type})`);
      // 写入 debugLog
      ws.state.debugLog.push({ section: "LLM", text: `✅ LLM生成: ${llmResult.textPackages.length}条内容包`, day: ws.day });
      this._emit("llmReady", { day: ws.day });
    } catch (e) {
      console.warn("[DailySimulation] 后台 LLM 调用失败:", e.message);
    }
  }

  // ============================================================
  // 每日事件模板系统 — 即使没有 LLM 也能生成丰富叙事
  // ============================================================
  _generateFallbackText(ws, directorPlan) {
    const day = ws.day;
    const bh = ws.getBlackHoof();
    const pf = ws.state.factions?.player || { members: [], money: 0, morale: 50, influence: 10 };
    const beats = directorPlan?.beats || [];

    if (!ws.state.debugLog) ws.state.debugLog = [];

    // 1. 每日报纸（优先导演 beat）
    if (beats.length > 0) {
      ws.queueNewspaper({ title: beats[0].title || "小镇纪事报", body: beats[0].description || "", beatId: beats[0].id });
      if (beats.length > 1) ws.queueNewspaper({ title: beats[1].title || "坊间消息", body: beats[1].description || "", beatId: beats[1].id });
    }

    // 2. 随机事件 — 这才是世界的"生命力"
    const events = this._rollDailyEvents(ws, day);
    console.log(`[DailySimulation] 📅 第${day}天 生成了 ${events.length} 个每日事件:`);

    for (const evt of events) {
      this._applyEvent(ws, evt, day);
      console.log(`  └─ ${evt.icon || '📌'} [${evt.category}] ${evt.title}: ${evt.description}`);
    }

    // 3. 系统状态写入 debugLog
    this._writeDebugLog(ws, day, pf, bh);

    // 4. 资金警告
    if (ws.state.player.money < 30) {
      ws.queuePhoneMessage({ from: "系统提示", text: `钱不够了($${ws.state.player.money})。去酒馆玩几局或接任务赚点外快。`, npcId: "system", deliverSlot: "morning" });
    }
  }

  /**
   * 从事件池中随机抽取 2-4 个事件
   */
  _rollDailyEvents(ws, day) {
    const events = [];
    const pools = [EVENT_MEMBER, EVENT_RELATION, EVENT_FACTION, EVENT_WORLD];
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 个事件

    // 根据天数调整权重
    const playerFaction = ws.state.factions?.player;
    const memberWt = (playerFaction?.members?.length > 0) ? 2 : 0;
    const poolsWeighted = [
      ...Array(memberWt).fill(EVENT_MEMBER),
      ...Array(2).fill(EVENT_RELATION),
      ...Array(2).fill(EVENT_FACTION),
      ...Array(1).fill(EVENT_WORLD),
    ];

    const usedCategories = new Set();
    for (let i = 0; i < count; i++) {
      const pool = poolsWeighted[Math.floor(Math.random() * poolsWeighted.length)];
      const eligible = pool.filter(t => {
        if (usedCategories.has(t.id)) return false; // 同类型事件每天最多1个
        if (t.condition && !t.condition(ws)) return false;
        return true;
      });
      if (eligible.length === 0) continue;
      const tpl = eligible[Math.floor(Math.random() * eligible.length)];
      usedCategories.add(tpl.id);
      events.push({ ...tpl, id: tpl.id });
    }
    return events;
  }

  /**
   * 应用事件效果：改 world state、发手机消息、写报纸
   */
  _applyEvent(ws, evt, day) {
    // 金钱变化。必须写 economy（真钱包）——只写 ws 镜像会在下次
    // syncFromGame 时被 economy.money 覆盖掉，等于没生效。
    if (evt.moneyChange) {
      if (this._economy?.addMoney) {
        this._economy.addMoney(evt.moneyChange);
        ws.state.player.money = this._economy.money;
      } else {
        ws.state.player.money = Math.max(0, (ws.state.player.money || 0) + evt.moneyChange);
      }
    }

    // 关系变化
    if (evt.relationChange && ws.state.relationships) {
      const npcIds = this._findNpcsForEvent(ws, evt);
      for (const nid of npcIds) {
        const key = `${nid}->player`;
        if (!ws.state.relationships[key]) ws.state.relationships[key] = { trust: 0, affection: 0 };
        const rel = ws.state.relationships[key];
        if (evt.relationChange.trust) rel.trust = (rel.trust || 0) + evt.relationChange.trust;
        if (evt.relationChange.affection) rel.affection = (rel.affection || 0) + evt.relationChange.affection;
      }
    }

    // 势力支柱变化
    if (evt.pillarChange) {
      const factions = ws.state.factions || {};
      for (const [fid, changes] of Object.entries(evt.pillarChange)) {
        const fac = factions[fid];
        if (!fac || !fac.pillars) continue;
        for (const [pid, delta] of Object.entries(changes)) {
          if (fac.pillars[pid]) fac.pillars[pid].value = Math.max(0, Math.min(100, fac.pillars[pid].value + delta));
        }
      }
    }

    // 帮派士气/资金
    if (evt.gangChange && ws.state.factions?.player) {
      const pf = ws.state.factions.player;
      if (evt.gangChange.money) pf.money = Math.max(0, (pf.money || 0) + evt.gangChange.money);
      if (evt.gangChange.morale) pf.morale = Math.max(0, Math.min(100, (pf.morale || 50) + evt.gangChange.morale));
    }

    // 找到用于替换模板的名字
    const npcName = this._findEventNpcName(ws, evt);

    // 手机消息（替换模板变量）
    let phoneMsg = evt.phoneMessage;
    let fromName = evt.from || "线人";
    if (phoneMsg && npcName) {
      phoneMsg = phoneMsg.replace(/\{npc\}/g, npcName).replace(/\{money\}/g, String(Math.abs(evt.moneyChange || 0)));
      if (evt.from === '{npc}') fromName = npcName;
    }

    // 报纸
    let paperTitle = evt.paperTitle;
    let paperBody = evt.paperBody;
    if (paperTitle && npcName) {
      paperTitle = paperTitle.replace(/\{npc\}/g, npcName);
      if (paperBody) paperBody = paperBody.replace(/\{npc\}/g, npcName).replace(/\{money\}/g, String(Math.abs(evt.moneyChange || 0)));
    }
    if (paperTitle) ws.queueNewspaper({ title: paperTitle, body: paperBody || "", fromEvent: true });
    if (phoneMsg) {
      // 分配时间槽位：按事件索引轮换 早/中/晚，让消息一天中分散到达
      const slots = ["morning", "noon", "evening"];
      const slot = slots[Math.floor(Math.random() * slots.length)];
      // 使用 npcTag 或实际 NPC 名作为 npcId，而不是统一的 "system"
      const evtNpcId = evt.npcTag ? `npc_${npcName || fromName}` : "system";
      ws.queuePhoneMessage({ from: fromName, text: phoneMsg, npcId: evtNpcId, fromEvent: true, deliverSlot: slot });
    }

    // debugLog
    ws.state.debugLog.push({ section: "事件", text: `[${evt.icon||'📌'} ${evt.category}] ${evt.title}: ${evt.description}`, day });
  }

  _findEventNpcName(ws, evt) {
    const tag = evt.npcTag;
    if (!tag) return null;
    // 玩家帮派成员
    if (tag === 'player_faction') {
      const pf = ws.state.factions?.player;
      const members = pf?.members || [];
      if (members.length > 0) {
        const mid = members[Math.floor(Math.random() * members.length)];
        const npc = ws.state.npcs[mid];
        return npc?.displayName || npc?.name || "成员";
      }
      return "成员";
    }
    // 按 factionId 或 role 查找
    const ids = this._findNpcsByTag(ws, tag);
    if (ids.length > 0) {
      const nid = ids[Math.floor(Math.random() * ids.length)];
      const npc = ws.state.npcs[nid];
      return npc?.displayName || npc?.name || tag;
    }
    return "某人";
  }

  _findNpcsForEvent(ws, evt) {
    return this._findNpcsByTag(ws, evt.npcTag);
  }

  _findNpcsByTag(ws, tag) {
    if (!tag) return [];
    const ids = [];
    for (const [id, npc] of Object.entries(ws.state.npcs || {})) {
      if (!npc.alive) continue;
      if (npc.factionId === tag || npc.role === tag) ids.push(id);
    }
    if (ids.length === 0) {
      for (const [id, npc] of Object.entries(ws.state.npcs || {})) {
        if (npc.alive) { ids.push(id); break; }
      }
    }
    return ids;
  }

  _writeDebugLog(ws, day, pf, bh) {
    const memberNames = pf.members?.map(id => { const n = ws.state.npcs[id]; return n?.displayName || id; }).join(", ") || "无";
    ws.state.debugLog.push({ section: "帮派", text: `成员: ${memberNames} | 资金: $${pf.money || 0} | 士气: ${pf.morale || 50}`, day });
    if (bh?.pillars) {
      const pInfo = Object.entries(bh.pillars).map(([,p]) => `${p.label}(${p.value})`).join(" | ");
      ws.state.debugLog.push({ section: "势力", text: `黑蹄会: ${pInfo}`, day });
    }
    if (ws.state.debugLog.length > 100) ws.state.debugLog = ws.state.debugLog.slice(-80);
  }

  // 在 main loop 中调用：将队列中的内容推送到 UI
  // 报纸立即推送，手机消息根据当前游戏时间分时分发
  flushToUI(newspaper, phone, hud, currentHour) {
    const ws = this.worldState;
    if (!ws) return;

    // 报纸：立即推送
    const articles = ws.drainNewspaperQueue();
    for (const a of articles) {
      if (newspaper && newspaper.publishStructured) {
        newspaper.publishStructured({ title: a.title, body: a.body });
      }
    }

    // 手机消息：根据当前小时分时分发（早 6-10 / 中 11-16 / 晚 17-23）
    // 如果没有当前小时信息（如事件处理器中调用），则全部立即投递
    if (phone && phone.deliverMessage) {
      const messages = currentHour !== undefined
        ? (() => { // 分时投递
            const allMsgs = ws.peekPhoneMessages();
            const toDeliver = [];
            const toKeep = [];
            for (const m of allMsgs) {
              const slot = m.deliverSlot;
              let deliverNow = true;
              if (slot) {
                if (slot === "morning") deliverNow = currentHour >= 6 && currentHour < 11;
                else if (slot === "noon") deliverNow = currentHour >= 11 && currentHour < 17;
                else if (slot === "evening") deliverNow = currentHour >= 17 && currentHour < 24;
                else if (slot === "night") deliverNow = currentHour >= 0 && currentHour < 6;
              }
              if (deliverNow) toDeliver.push(m);
              else toKeep.push(m);
            }
            ws._state.phoneMessageQueue = toKeep;
            return toDeliver;
          })()
        : ws.drainPhoneMessages(); // 无时间信息→全部立即投递
      for (const m of messages) {
        const npcId = m.npcId || "system";
        phone.deliverMessage(npcId, m.from, m.text, { taskId: m.taskId || null });
      }
    }
  }
}

// ============================================================
// 每日事件模板池 — 20+ 个带有世界实际影响的事件
// ============================================================

// 成员事件：帮派成员自主行为
const EVENT_MEMBER = [
  { id: "member_donate", category: "成员", icon: "💰", title: "成员上供保护费",
    description: "帮派成员在镇上收了保护费，上交了一部分。",
    moneyChange: 40, phoneMessage: "老大，今天收了点保护费，$40放账上了。", from: "{npc}", npcTag: "player_faction",
    paperBody: "据悉，某帮派成员在商业区收取了保护费，商家们敢怒不敢言。", paperTitle: "保护费风波再起" },
  { id: "member_betray", category: "成员", icon: "💔", title: "成员卷款跑路",
    description: "一个帮派成员带着一部分钱跑了。忠诚度不足的成员可能背叛。",
    moneyChange: -30, gangChange: { money: -50, morale: -15 },
    phoneMessage: "老大，{npc}不见了，账上的钱也少了。", from: "副手", npcTag: "player_faction",
    paperBody: "镇上有传言称某帮派出现了内讧，一名成员携款潜逃。", paperTitle: "帮派内部动荡",
    condition: (ws) => (ws.state.factions?.player?.members || []).length >= 2 },
  { id: "member_hurt", category: "成员", icon: "🤕", title: "成员受伤",
    description: "一名成员在和黑蹄会的小冲突中受了伤，需要休息。",
    gangChange: { morale: -10 }, phoneMessage: "老大，{npc}在酒馆跟黑蹄会的人起了冲突，受了点伤。", from: "副手", npcTag: "player_faction",
    paperBody: "昨夜酒馆发生斗殴，一名帮派成员被送医。", paperTitle: "酒馆深夜斗殴",
    condition: (ws) => (ws.state.factions?.player?.members || []).length >= 1 },
  { id: "member_intel", category: "成员", icon: "🔍", title: "成员探到情报",
    description: "一名成员在酒馆听到了关于黑蹄会的动向。",
    gangChange: { morale: 5 }, phoneMessage: "老大，我在酒馆听说黑蹄会最近在扩张地盘。小心点。", from: "{npc}", npcTag: "player_faction",
    paperBody: "知情人士透露，黑蹄会正在暗中扩大势力范围。", paperTitle: "黑蹄会动向引关注",
    condition: (ws) => (ws.state.factions?.player?.members || []).length >= 1 },
  { id: "member_hero", category: "成员", icon: "⭐", title: "成员英勇表现",
    description: "一名成员在与其他势力的对峙中挺身而出，帮派声望上升。",
    gangChange: { morale: 15, money: 20 }, phoneMessage: "老大，{npc}今天干得漂亮，给我们争光了。", from: "副手", npcTag: "player_faction",
    paperBody: "目击者称，一名帮派成员在街头对峙中表现英勇，赢得路人喝彩。", paperTitle: "义气之举获镇民称赞",
    condition: (ws) => (ws.state.factions?.player?.members || []).length >= 2 && (ws.state.factions?.player?.morale || 50) < 60 },
];

// 关系事件：NPC与玩家之间的关系变化
const EVENT_RELATION = [
  { id: "rel_gift", category: "关系", icon: "🎁", title: "NPC送礼物",
    description: "一个友善的NPC送了玩家一些小礼物和钱。",
    moneyChange: 25, relationChange: { affection: 10 }, phoneMessage: "嘿，我给你带了点东西。记得还我这个人情。", from: "{npc}", npcTag: "shop",
    paperBody: "小镇商业区传来暖意，一桩匿名送礼在邻里间引发讨论。", paperTitle: "善意之举" },
  { id: "rel_grudge", category: "关系", icon: "😤", title: "NPC怀恨在心",
    description: "一个NPC因为之前的事开始对玩家不满，好感度下降。",
    relationChange: { affection: -15, trust: -10 }, phoneMessage: "你之前做的那件事，我不会忘记的。", from: "{npc}", npcTag: "work",
    paperBody: "坊间流传，某位居民对外来者产生了不满情绪。", paperTitle: "暗流涌动" },
  { id: "rel_propose", category: "关系", icon: "💍", title: "NPC表白",
    description: "一个好感度很高的NPC向玩家表达了爱慕之情。",
    relationChange: { affection: 20 }, phoneMessage: "在这个镇上，你是我最信任的人了。", from: "{npc}", npcTag: "saloon",
    paperTitle: "小镇恋曲", paperBody: "酒馆里的常客们都在议论一段新萌芽的感情。",
    condition: (ws) => {
      for (const [key, rel] of Object.entries(ws.state.relationships || {})) {
        if (key.endsWith("->player") && rel.affection > 40) return true;
      } return false;
    }},
  { id: "rel_tip", category: "关系", icon: "💡", title: "NPC提供情报",
    description: "一个友善的NPC向玩家透露了有用的信息。",
    moneyChange: 15, relationChange: { trust: 5 }, phoneMessage: "悄悄告诉你，我在赌场后面看到黑蹄会的人半夜在那里碰头。", from: "{npc}", npcTag: "saloon",
    paperBody: "知情人士透露了小镇暗处的动向。", paperTitle: "小道消息" },
  { id: "rel_warn", category: "关系", icon: "⚠️", title: "NPC警告",
    description: "一个NPC警告玩家有人要害他。",
    relationChange: { trust: 5 }, phoneMessage: "小心点，我听说有人在打你的主意。", from: "{npc}", npcTag: "work",
    paperBody: "匿名消息提醒居民注意安全。", paperTitle: "安全警告" },
  { id: "rel_help", category: "关系", icon: "🤝", title: "NPC主动帮忙",
    description: "一个友善的NPC主动给了玩家一些支持和帮助。",
    moneyChange: 30, relationChange: { trust: 10, affection: 10 }, phoneMessage: "看到你最近不容易，这点钱你拿着。", from: "{npc}", npcTag: "shop",
    paperTitle: "邻里互助", paperBody: "在这个小镇，不是所有人都是敌人。一桩善意之举被邻居们传颂。",
    condition: (ws) => ws.state.player.money < 80 },
];

// 势力事件：黑蹄会/警方的行动
const EVENT_FACTION = [
  { id: "fac_expand", category: "势力", icon: "📈", title: "黑蹄会扩张",
    description: "黑蹄会加强了在镇上的控制力，势力范围扩大。",
    pillarChange: { black_hoof: { territory: 8, influence: 6 } }, phoneMessage: "黑蹄会又控制了镇西两个商铺。他们越来越猖狂了。", from: "线人", npcTag: "saloon",
    paperTitle: "黑蹄会势力持续扩大", paperBody: "据本报了解，黑蹄会近期在镇西商业区频繁活动，已控制了数家商铺。" },
  { id: "fac_police", category: "势力", icon: "👮", title: "警方加强巡逻",
    description: "警长办公室增加了夜间巡逻，通缉犯的活动空间缩小。",
    pillarChange: { black_hoof: { influence: -5 } }, phoneMessage: "警长今天宣布要加强夜间巡逻了。", from: "酒保",
    paperTitle: "治安升级", paperBody: "警长办公室宣布将增加夜间巡逻班次，回应居民对安全的担忧。" },
  { id: "fac_trade", category: "势力", icon: "📦", title: "商人请愿",
    description: "商人们联合起来抗议保护费太高，向警长请愿。",
    pillarChange: { black_hoof: { influence: -8, economy: -5 } }, phoneMessage: "商人们在请愿，说要抵制保护费。这对我们有影响。", from: "副手",
    paperTitle: "商人联合请愿", paperBody: "多名商人在警长办公室前联合签署请愿书，要求打击保护费勒索行为。" },
  { id: "fac_truce", category: "势力", icon: "🕊️", title: "黑蹄会示好",
    description: "黑蹄会主动示好，给玩家帮派送来了一笔钱，表示愿意和平共处。",
    gangChange: { money: 50 }, phoneMessage: "黑蹄会派人来送了$50，说想暂时休战。", from: "副手",
    paperTitle: "两大帮派暂时休战", paperBody: "据知情人士，黑蹄会与新兴帮派达成了临时休战协议，小镇暂时平静。",
    condition: (ws) => (ws.state.factions?.black_hoof?.pillars?.influence?.value || 0) > 30 },
  { id: "fac_raid", category: "势力", icon: "💥", title: "黑蹄会夜袭",
    description: "黑蹄会深夜袭击了玩家帮派的地盘。",
    gangChange: { money: -40, morale: -20 }, phoneMessage: "老大！黑蹄会昨晚偷袭了我们！丢了些钱，兄弟们士气低落。", from: "副手",
    paperTitle: "深夜袭击震惊小镇", paperBody: "昨夜镇东发生一起帮派冲突，据目击者称有数人受伤。警长表示正在调查中。",
    condition: (ws) => (ws.state.factions?.black_hoof?.pillars?.aggression?.value || 20) > 30 },
];

// 世界事件：意外发现、自然灾害等
const EVENT_WORLD = [
  { id: "wld_lucky", category: "意外", icon: "🍀", title: "捡到钱",
    description: "玩家在路边捡到了一袋钱，可能是某个醉汉掉的。",
    moneyChange: 35, phoneMessage: "", paperTitle: "", paperBody: "" },
  { id: "wld_theft", category: "意外", icon: "🦝", title: "被偷了",
    description: "深夜有人潜入，偷走了一些钱。",
    moneyChange: -25, phoneMessage: "老大，昨晚有人翻了我们驻地，丢了点钱。", from: "副手",
    paperBody: "近期镇上小偷猖獗，居民被建议锁好门窗。", paperTitle: "盗贼光顾" },
  { id: "wld_fire", category: "意外", icon: "🔥", title: "火灾",
    description: "镇上的一个小仓库着火了，但很快被扑灭。影响了部分供应。",
    moneyChange: -15, phoneMessage: "听说仓库着火了，还好没人受伤。", from: "酒保",
    paperTitle: "仓库火灾被迅速控制", paperBody: "昨夜一小仓库发生火灾，镇民自发组织扑救，损失不大。" },
  { id: "wld_find", category: "意外", icon: "📜", title: "发现旧地图",
    description: "在老酒馆的地板下发现了一张旧地图，上面标记了一个藏宝点。",
    moneyChange: 50, phoneMessage: "我在酒馆地板下面发现了这个，你可能会感兴趣。", from: "{npc}", npcTag: "saloon",
    paperTitle: "藏宝图在酒馆发现", paperBody: "一张疑似黑蹄会早期的藏宝图在酒馆修缮过程中被发现，引发寻宝热潮。" },
  { id: "wld_traveler", category: "意外", icon: "🧳", title: "旅行商人到达",
    description: "一个旅行商人到达小镇，带来了外地的物资和消息。所有商店进货。",
    moneyChange: 20, phoneMessage: "旅行商人今天到镇上了，东西比平时便宜。", from: "酒保",
    paperTitle: "旅行商队抵达", paperBody: "一年一度的旅行商队抵达小镇，带来了丰富的外地物资和远方的消息。" },
];
