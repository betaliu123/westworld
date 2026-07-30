// WorldState.js — 唯一权威状态容器。纯数据对象，可序列化。
// 所有跨日状态必须可序列化。Three.js 对象、DOM 元素、函数和循环引用不得进入 WorldState。
// 使用 deepClone 确保读写安全。

export class WorldState {
  constructor(seed = null) {
    this._state = this._createInitialState(seed);
  }

  _createInitialState(seed) {
    return {
      version: 1,
      seed: seed || Math.floor(Math.random() * 1000000),
      day: 1,
      hour: 6,
      timeOfDay: "morning",

      // 玩家状态
      player: {
        money: 100,         // 初始现金
        health: 100,
        energy: 100,
        fatigue: 0,
        injury: null,
        mealBuff: null,
        ownedProperties: [], // 房产ID列表
        ownedVehicles: [],   // 车辆ID列表
        playerStyle: [],     // 行为风格标签 ["violent", "economic", ...]
        approachHistory: [], // 行为记录
      },

      // 势力
      factions: {
        player: {
          id: "player_gang",
          name: "玩家的帮派",
          money: 0,
          manpower: 1,
          influence: 10,
          morale: 70,
          hqLevel: 1,
          territories: [],
          members: [],
          operations: [],
        },
        black_hoof: {
          id: "black_hoof",
          name: "黑蹄会",
          leaderId: "npc_silas",
          money: 1200,
          manpower: 14,
          influence: 65,
          heat: 18,
          morale: 70,
          territories: ["casino", "south_street"],
          members: ["npc_silas", "npc_victor", "npc_rosa"],
          strategy: "profit_and_control",
          pillars: {
            wealth: { label: "财富", value: 80, collapseAt: 25 },
            territory: { label: "地盘", value: 75, collapseAt: 25 },
            manpower: { label: "人手", value: 70, collapseAt: 25 },
            legitimacy: { label: "威望", value: 65, collapseAt: 25 },
          },
        },
      },

      // NPC 持久数据（由 NPCRegistry 管理）
      npcs: {},

      // 关系边（由 RelationshipSystem 管理）
      relationships: {},

      // 地盘
      territories: {},

      // 行动
      operations: {},

      // StoryTree 实例
      storyInstances: {},

      // 导演计划
      scheduledEvents: [],
      directorPlan: {
        beats: [],
        foregroundLimit: 1,
        backgroundLimit: 2,
        forbiddenTags: [],
        requiredFunctions: [],
      },

      // NPC 知识
      knowledge: {},

      // 事件历史
      eventHistory: [],

      // 当前日已发生的投放
      deliveredBeats: [],
      missedBeats: [],

      // 报纸头条缓存
      newspaperQueue: [],
      phoneMessageQueue: [],

      // 叙事物品收集记录
      collectedNotes: [],

      // 调试日志 (不持久化)
      debugLog: [],

      // 手机联系人
      phoneContacts: {},

      // 股票价格
      stockPrices: {},

      // 十日压力阶段
      campaignPhase: "establishment",
      campaignDay: 1,

      // 胜利/失败条件
      victoryState: null, // null | "normal" | "dominant" | "bitter" | "failure"
    };
  }

  // ---- 访问器 ----
  get state() { return this._state; }

  get day() { return this._state.day; }
  set day(v) { this._state.day = v; }

  get hour() { return this._state.hour; }
  set hour(v) { this._state.hour = v; }

  // 玩家相关
  getPlayer() { return this._state.player; }

  // 势力相关
  getFaction(id) { return this._state.factions[id] || null; }
  getPlayerFaction() { return this._state.factions.player; }
  getBlackHoof() { return this._state.factions.black_hoof; }

  // 黑蹄会支柱
  getPillar(factionId, pillarKey) {
    const faction = this._state.factions[factionId];
    if (!faction || !faction.pillars) return null;
    return faction.pillars[pillarKey] || null;
  }

  damagePillar(factionId, pillarKey, amount) {
    const pillar = this.getPillar(factionId, pillarKey);
    if (!pillar) return;
    pillar.value = Math.max(0, Math.min(100, pillar.value - amount));
  }

  // NPC 相关
  getNPC(npcId) { return this._state.npcs[npcId] || null; }
  setNPC(npcId, data) { this._state.npcs[npcId] = data; }

  // 关系相关
  getRelationship(fromId, toId) {
    const key = `${fromId}->${toId}`;
    return this._state.relationships[key] || null;
  }

  setRelationship(fromId, toId, data) {
    const key = `${fromId}->${toId}`;
    this._state.relationships[key] = data;
  }

  // StoryTree 相关
  getStoryInstance(id) { return this._state.storyInstances[id] || null; }
  setStoryInstance(id, data) { this._state.storyInstances[id] = data; }

  // 事件历史
  addEvent(event) {
    this._state.eventHistory.push(event);
    if (this._state.eventHistory.length > 500) {
      this._state.eventHistory = this._state.eventHistory.slice(-300);
    }
  }

  getRecentEvents(count = 20) {
    return this._state.eventHistory.slice(-count);
  }

  // 导演相关
  addDeliveredBeat(beatId) { this._state.deliveredBeats.push(beatId); }
  addMissedBeat(beatId) { this._state.missedBeats.push(beatId); }

  // 报纸/手机队列
  queueNewspaper(article) { this._state.newspaperQueue.push(article); }
  drainNewspaperQueue() {
    const q = [...this._state.newspaperQueue];
    this._state.newspaperQueue = [];
    return q;
  }

  queuePhoneMessage(msg) { this._state.phoneMessageQueue.push(msg); }
  peekPhoneMessages() { return this._state.phoneMessageQueue; }
  drainPhoneMessages() {
    const q = [...this._state.phoneMessageQueue];
    this._state.phoneMessageQueue = [];
    return q;
  }

  // ---- 序列化 ----
  toJSON() {
    return JSON.parse(JSON.stringify(this._state));
  }

  fromJSON(json) {
    if (!json || json.version !== 1) return false;
    this._state = json;
    return true;
  }

  // 深拷贝当前状态（用于快照）
  snapshot() {
    return JSON.parse(JSON.stringify(this._state));
  }

  // 从快照恢复
  restore(snapshot) {
    this._state = snapshot;
  }

  // ---- 主循环：从游戏系统同步非持久数据 ----
  syncFromGame(economy, reputation, clock) {
    this._state.day = clock.day || this._state.day;
    this._state.hour = clock.hour || this._state.hour;
    this._state.timeOfDay = typeof clock.timeOfDay === "function" ? clock.timeOfDay() : "morning";
    this._state.player.money = economy.money || 0;
    this._state.player.ownedProperties = economy.ownedProperties ? [...economy.ownedProperties] : [];
    // Economy.SHOP_ITEMS is a module export, not on instance. Just copy owned items.
    this._state.player.ownedVehicles = [];
    // 不覆盖 health/energy/fatigue，那些由 PlayerCondition 管理
  }

  syncToGame(economy, reputation) {
    economy.money = this._state.player.money;
    economy.ownedProperties = new Set(this._state.player.ownedProperties);
  }
}
