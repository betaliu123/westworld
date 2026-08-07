// MicroEventSystem.js — 微型交互事件：1-2 个 NPC、一两轮交互、"随手可帮/可参与"。
//
// 与 AI 剧场（大街上多人的戏）互补：这里是建筑内外的轻量小场景，
// 玩家路过随时可以按 F 搭话 → 弹窗里 2~3 个选项 → 选完有真实的小数值后果
// （金钱/好感/荣誉/声望），不打断节奏。一天每个场所最多触一次。
//
// 触发：玩家进入某个建筑（insideRoom）或路过某个地点 → 概率触发对应池里的事件。
// 复用 EncounterRuntime.request 的选角/召唤/弹窗，只提供事件内容与结算。

// venueKey 与 venueAffinity.js 的可进入场所名对齐；outdoor=街上
const MICRO_EVENTS = [
  // ---- 酒馆 ----
  {
    id: "bar_flower",
    venue: "酒馆",
    title: "送花的烦恼",
    beats: ["酒馆角落里，一个年轻牛仔攥着一束野花，盯着柜台里的女招待发呆。"],
    intent: "年轻牛仔想给女招待送花又不敢，向你请教。",
    jobs: ["牛仔", "枪手", "矿工领袖", "神枪手"],
    choices: [
      { id: "encourage", label: "鼓励他去送", risk: "low", effects: { honor: 1, affection: 4 } },
      { id: "offer", label: "替他送去", risk: "low", effects: { honor: 2, money: 2, affection: 6 } },
      { id: "mock", label: "打趣他两句", risk: "medium", effects: { honor: -1, affection: -2 } },
    ],
  },
  {
    id: "bar_tab",
    venue: "酒馆",
    title: "欠账的酒鬼",
    beats: ["一个喝醉的矿工对老板说：今天的酒钱，下回一起算。"],
    intent: "矿工欠了酒钱，老板很为难。",
    jobs: ["矿工领袖", "矿工", "牛仔", "赌徒"],
    choices: [
      { id: "pay", label: "替他付了", risk: "low", effects: { money: -8, honor: 2, affection: 5 } },
      { id: "vouch", label: "帮他担保", risk: "low", effects: { honor: 1, affection: 3 } },
      { id: "ignore", label: "事不关己", risk: "none", effects: {} },
    ],
  },
  // ---- 赌场 ----
  {
    id: "casino_luck",
    venue: "赌场",
    title: "最后一注",
    beats: ["赌桌前，一个老赌徒把最后一个银币压上去，手都在抖。"],
    intent: "老赌徒最后一注，输光就要露宿街头。",
    jobs: ["赌徒", "流浪赌徒", "赌场经理", "牛仔"],
    choices: [
      { id: "give", label: "借他几块", risk: "low", effects: { money: -5, honor: 1, affection: 4 } },
      { id: "advise", label: "劝他收手", risk: "low", effects: { honor: 1, affection: 2 } },
      { id: "bet", label: "陪他赌一把", risk: "high", effects: { money: 15, honor: -1 } },
    ],
  },
  // ---- 教堂 ----
  {
    id: "church_alms",
    venue: "教堂",
    title: "募捐箱",
    beats: ["牧师抱着募捐箱，为修缮教堂募款，来往的人却绕道走。"],
    intent: "牧师为修教堂募捐，想请你支持。",
    jobs: ["牧师", "医生", "银行经理", "会计"],
    choices: [
      { id: "donate", label: "捐 10 块", risk: "low", effects: { money: -10, honor: 3, affection: 6 } },
      { id: "help", label: "答应帮忙拉人", risk: "low", effects: { honor: 1, affection: 3 } },
      { id: "skip", label: "摇头走开", risk: "none", effects: { honor: -1 } },
    ],
  },
  // ---- 医馆 ----
  {
    id: "clinic_orphan",
    venue: "医馆",
    title: "没人领的药",
    beats: ["医生拿着一包药发愁：一位老病人买不起，这药马上要过期。"],
    intent: "医生想帮买不起药的病人，向你求助。",
    jobs: ["医生", "牧师", "矿工领袖", "商人"],
    choices: [
      { id: "buy", label: "出钱买下送他", risk: "low", effects: { money: -8, honor: 2, affection: 6 } },
      { id: "deliver", label: "帮忙送一趟", risk: "low", effects: { honor: 1, affection: 4 } },
      { id: "pass", label: "无能为力", risk: "none", effects: {} },
    ],
  },
  // ---- 马厩 ----
  {
    id: "stable_horse",
    venue: "马厩",
    title: "受惊的马",
    beats: ["马厩里一匹马受了惊，马夫怎么都安抚不下来。"],
    intent: "马夫需要人帮忙安抚受惊的马。",
    jobs: ["马夫", "铁匠", "牛仔", "赏金猎人"],
    choices: [
      { id: "help", label: "上前帮忙", risk: "medium", effects: { honor: 2, affection: 5 } },
      { id: "advise", label: "给点建议", risk: "low", effects: { honor: 1, affection: 2 } },
      { id: "leave", label: "绕道走", risk: "none", effects: {} },
    ],
  },
  // ---- 铁匠铺 ----
  {
    id: "smith_blade",
    venue: "铁匠铺",
    title: "开刃的旧刀",
    beats: ["铁匠铺里，老铁匠对着一把旧猎刀摇头：锈成这样，还能修吗。"],
    intent: "老铁匠的旧猎刀锈了，他想修又舍不得钱。",
    jobs: ["铁匠", "马夫", "猎人", "神枪手"],
    choices: [
      { id: "pay", label: "出钱让他修", risk: "low", effects: { money: -6, honor: 1, affection: 5 } },
      { id: "help", label: "帮忙打下手", risk: "low", effects: { honor: 1, affection: 3 } },
      { id: "skip", label: "不关我的事", risk: "none", effects: {} },
    ],
  },
  // ---- 杂货店 ----
  {
    id: "store_short",
    venue: "杂货店",
    title: "差三文钱",
    beats: ["杂货店门口，一个小姑娘攥着三文钱，看着货架上的糖发愣。"],
    intent: "小姑娘买糖差三文钱，很想要又不敢开口。",
    jobs: ["工具店主", "商人", "旅人", "会计"],
    choices: [
      { id: "give", label: "补上差的钱", risk: "low", effects: { money: -3, honor: 2, affection: 6 } },
      { id: "talk", label: "和她聊聊", risk: "low", effects: { honor: 1, affection: 4 } },
      { id: "walk", label: "继续赶路", risk: "none", effects: {} },
    ],
  },
  // ---- 街上（户外）----
  {
    id: "street_beggar",
    venue: "outdoor",
    title: "街角的乞丐",
    beats: ["街角蜷着一个老乞丐，帽子里只有几枚铜板。"],
    intent: "老乞丐想要一点吃的，你刚好路过。",
    jobs: ["旅人", "牛仔", "商人", "牧师"],
    choices: [
      { id: "give", label: "丢两枚银币", risk: "low", effects: { money: -4, honor: 2 } },
      { id: "feed", label: "带他去吃顿热的", risk: "low", effects: { money: -6, honor: 3, affection: 4 } },
      { id: "pass", label: "假装没看见", risk: "none", effects: { honor: -1 } },
    ],
  },
  {
    id: "street_map",
    venue: "outdoor",
    title: "迷路的旅人",
    beats: ["一个旅人举着地图，对着路牌犯了难。"],
    intent: "旅人迷路了，想请你指个路。",
    jobs: ["旅人", "商人", "记者", "牛仔"],
    choices: [
      { id: "point", label: "耐心指路", risk: "low", effects: { honor: 1, affection: 2 } },
      { id: "lead", label: "送他到地儿", risk: "low", effects: { honor: 2, affection: 4 } },
      { id: "joke", label: "故意指反方向", risk: "medium", effects: { honor: -2 } },
    ],
  },
];

/** 一次会话内每个场所触发过的痕迹（内存即可，重启自然重置） */
const COOLDOWNS = new Map(); // venueKey -> 最后触发的一天+小时

export class MicroEventSystem {
  constructor(deps = {}) {
    this.encounters = deps.encounters;       // EncounterRuntime
    this.hud = deps.hud;
    this.reputation = deps.reputation;       // 结算荣誉/声望
    this.economy = deps.economy;             // 结算金钱
    this.getDay = deps.getDay || (() => 1);
    this.getHour = deps.getHour || (() => 12);
    this.getPlayerPos = deps.getPlayerPos || (() => ({ x: 0, z: 0 }));
    this.getVenue = deps.getVenue || (() => null); // insideRoom 或 null
    this.onAffinity = deps.onAffinity || null;     // (npcId, trust, affection)
    this.npcRegistry = deps.npcRegistry;
    this._tryingVenue = null;   // 当前正在尝试触发的场所
    this._tryingStarted = false;
    this._retryT = 0;           // 重试倒计时
    this._inFlight = false;     // 上一次请求是否还在飞行（LLM 选角慢）
  }

  /** 事件池（暴露给测试/调试） */
  get events() { return MICRO_EVENTS; }

  /**
   * 每帧调用：玩家进入某场所后，保证"每天每个建筑至少有一次"微型事件。
   * 触发失败（LLM选角没成功/NPC不可用/遭遇管线忙）不记录冷却，稍后重试。
   * @param {number} dt
   * @returns {boolean} 是否触发
   */
  update(dt = 0) {
    const venue = this.getVenue();
    const day = this.getDay();
    const cooldownKey = venue || "outdoor";
    const pool = MICRO_EVENTS.filter((e) => e.venue === (venue || "outdoor"));
    if (!pool.length) return false;
    // 冷却：每个场所每天最多触发一次（只在真正成功弹出后设置）
    const last = COOLDOWNS.get(cooldownKey);
    if (last === day) return false;
    // 场所变了 → 重置尝试标记，新场所从第一帧开始试
    if (venue !== this._tryingVenue) {
      this._tryingVenue = venue;
      this._tryingStarted = false;
      this._retryT = 0;
    }
    // 上一次请求还在飞行中（LLM 选角可能要十几秒）→ 等待，不重复发起
    if (this._inFlight) return false;
    // 节流重试：进场后第一帧就试，之后每 9~14 秒重试直到成功（或换场所）
    if (this._tryingStarted) {
      this._retryT -= dt;
      if (this._retryT > 0) return false;
      this._retryT = randRange(9, 14);
    }
    this._tryingStarted = true;

    const evt = pool[Math.floor(Math.random() * pool.length)];
    this._inFlight = true;
    const p = this.fire(evt);
    if (p && typeof p.then === "function") {
      p.then((ok) => {
        if (ok) COOLDOWNS.set(cooldownKey, day);  // 真正弹出来了才算触发过
        this._inFlight = false;
      }).catch(() => { this._inFlight = false; });
      return true;
    }
    // 同步返回（无 encounters 等）
    this._inFlight = false;
    if (p) COOLDOWNS.set(cooldownKey, day);
    return !!p;
  }

  /**
   * 立即触发一个微型事件（供调试面板/测试调用）。
   * @param {object} evt 事件定义（或 id 字符串）
   * @returns {boolean}
   */
  fire(evt) {
    if (!this.encounters) return false;
    const def = typeof evt === "string" ? MICRO_EVENTS.find((e) => e.id === evt) : evt;
    if (!def) return false;

    const venue = this.getVenue();
    return this.encounters.request({
      id: `micro:${def.id}`,
      title: `💬 ${def.title}`,
      intent: def.intent,
      beats: def.beats,
      jobs: def.jobs,
      choices: def.choices.map((c) => ({ id: c.id, label: c.label, risk: c.risk || "low" })),
      allowDefer: true,
      // 结算：把选中的 effects 落到真实系统上
      onResolve: (enc, choiceId) => this._resolve(def, choiceId),
      // 强制在该场所选角（避免牧师跑进赌场来谈信仰）
      forceVenue: venue || null,
    });
  }

  _resolve(def, choiceId) {
    const c = (def.choices || []).find((x) => x.id === choiceId);
    if (!c) return;
    const fx = c.effects || {};
    if (fx.money && this.economy) {
      const amt = Number(fx.money);
      if (amt > 0) this.economy.addMoney?.(amt);
      else this.economy.spendMoney?.(Math.abs(amt), "微型事件");
    }
    if (fx.honor && this.reputation) {
      const h = Number(fx.honor);
      if (h > 0) this.reputation.addHonor?.(h);
      else this.reputation.addHonor?.(h);
    }
    // 好感/信任落到场上那个 NPC
    if ((fx.affection || fx.trust) && this.onAffinity) {
      const npcId = this.encounters.active?.npcId;
      if (npcId) this.onAffinity(npcId, fx.trust || 0, fx.affection || 0);
    }
    this.hud?.toast?.(`💬 ${c.label}（${this._fxText(fx)}）`, { key: "micro", duration: 2800 });
  }

  _fxText(fx) {
    const parts = [];
    if (fx.money) parts.push(`${fx.money > 0 ? "+" : ""}$${fx.money}`);
    if (fx.honor) parts.push(`荣耀${fx.honor > 0 ? "+" : ""}${fx.honor}`);
    if (fx.affection) parts.push(`好感${fx.affection > 0 ? "+" : ""}${fx.affection}`);
    return parts.length ? parts.join(" ") : "无变化";
  }
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}
