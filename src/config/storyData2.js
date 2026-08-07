// storyData2.js — 铺量：ST05~ST08 短树（每棵 3-4 节点，2-4 天跨度）。
// 设计原则（对齐"让玩家感觉到剧情在跑"）：
//   1. 起始条件宽松（played_days_min + 基本资源），保证正常玩必触发
//   2. 每个非终结节点都有 candidateDeliveries（绝不静默过渡）
//   3. 每棵至少 1 个要玩家选择的关键节点
//   4. 终结节点都有投递反馈（报纸/传闻/手机），玩家能看到结局

// ============================================================
// ST05: 集市纠纷 —— 商贩的秤被人动了手脚
// ============================================================
export const ST05_MARKET_SCALE = {
  id: "market_scale",
  title: "集市纠纷",
  category: "community",
  description: "镇上的商贩被人栽赃缺斤少两，玩家查清真相还他清白。",
  emotionalArc: ["curiosity", "sympathy", "doubt", "resolution"],
  actorSlots: {
    merchant: { requiredTags: [], description: "被栽赃的商贩" },
    rival: { requiredTags: [], description: "动秤的同行" },
  },
  startConditions: [
    { type: "and", params: { conditions: [
      { type: "played_days_min", params: { value: 1 } },
      { type: "player_money_min", params: { value: 10 } },
    ] } },
  ],
  exclusionTags: ["market"],
  nodes: {
    rumor: {
      id: "rumor",
      title: "缺斤少两的传闻",
      type: "introduction",
      description: "广场上有人议论商贩的秤有问题，他满脸委屈。",
      preconditions: [],
      softDeadline: { afterDay: 1, beforeDay: 4 },
      effects: [
        { type: "add_memory", params: { text: "镇上传言我的秤不准" } },
      ],
      candidateDeliveries: [
        { channel: "rumor", priority: 5 },
        { channel: "location", venueTags: ["plaza"], priority: 4 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "inspect",
    },
    inspect: {
      id: "inspect",
      title: "检查秤",
      type: "investigation",
      description: "你仔细检查商贩的秤，发现砝码被人换过。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "rumor" } },
      ],
      softDeadline: { afterDay: 2, beforeDay: 6 },
      effects: [
        { type: "add_knowledge", params: { fact: "merchant_scale_rigged", confidence: 0.8 } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon", "plaza"], priority: 4 },
        { channel: "phone", priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "expose", label: "当众揭穿同行", effects: [
          { type: "add_money", params: { amount: 30 } },
          { type: "modify_relationship", params: { trust: 15, respect: 15 } },
        ], nextNode: "cleared" },
        { id: "quiet", label: "私下解决", effects: [
          { type: "modify_relationship", params: { trust: 10, debt: 10 } },
        ], nextNode: "cleared" },
        { id: "walk_away", label: "不管闲事", effects: [
          { type: "add_event", params: { type: "IGNORED_INJUSTICE", tags: ["regret", "minor"] } },
        ], nextNode: "faded" },
      ],
    },
    cleared: {
      id: "cleared",
      title: "真相大白",
      type: "resolution",
      description: "商贩的秤被证明是好的，他感激不尽。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "inspect" } },
      ],
      effects: [
        { type: "add_memory", params: { text: "玩家替我证明了清白" } },
        { type: "faction_morale_change", params: { amount: 5 } },
      ],
      candidateDeliveries: [
        { channel: "newspaper", priority: 3 },
        { channel: "rumor", priority: 3 },
      ],
      emotionalIntensity: 2,
      cooldownTags: ["market"],
      canAutoAdvance: true,
      nextNode: null,
    },
    faded: {
      id: "faded",
      title: "风波淡去",
      type: "resolution",
      description: "传闻渐渐平息，没人再提那杆秤。",
      preconditions: [],
      effects: [],
      candidateDeliveries: [
        { channel: "rumor", priority: 2 },
      ],
      emotionalIntensity: 1,
      cooldownTags: ["market"],
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [],
};

// ============================================================
// ST06: 老友旧怨 —— 两个老搭档为了当年的一笔账反目
// ============================================================
export const ST06_OLD_FEUD = {
  id: "old_feud",
  title: "老友旧怨",
  category: "relationship",
  description: "两个多年好友为当年的一笔旧账闹翻，需要有人劝和或了断。",
  emotionalArc: ["nostalgia", "tension", "choice", "closure"],
  actorSlots: {
    friendA: { requiredTags: [], description: "反目的老友之一" },
    friendB: { requiredTags: [], description: "反目的老友之二" },
  },
  startConditions: [
    { type: "played_days_min", params: { value: 2 } },
  ],
  exclusionTags: ["feud"],
  nodes: {
    tavern: {
      id: "tavern",
      title: "酒馆里的争执",
      type: "introduction",
      description: "两个老友在酒馆吵起来，原来是为十年前的一笔酒钱。",
      preconditions: [],
      softDeadline: { afterDay: 1, beforeDay: 5 },
      effects: [
        { type: "add_memory", params: { text: "我和老友为了旧账吵翻了" } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon"], priority: 5 },
        { channel: "rumor", priority: 4 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "backstory",
    },
    backstory: {
      id: "backstory",
      title: "当年的账",
      type: "investigation",
      description: "你了解到十年前他们合伙开矿，一人卷走了分成。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "tavern" } },
      ],
      softDeadline: { afterDay: 2, beforeDay: 6 },
      effects: [
        { type: "add_knowledge", params: { fact: "feud_root_cause", confidence: 0.75 } },
      ],
      candidateDeliveries: [
        { channel: "phone", priority: 3 },
        { channel: "location", venueTags: ["plaza"], priority: 3 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "reconcile", label: "劝他们和好", effects: [
          { type: "modify_relationship", params: { trust: 12, respect: 12 } },
          { type: "faction_morale_change", params: { amount: 5 } },
        ], nextNode: "reconciled" },
        { id: "pay_debt", label: "替还旧账", effects: [
          { type: "steal_money", params: { amount: 20 } },
          { type: "modify_relationship", params: { trust: 20, debt: 25 } },
        ], nextNode: "reconciled" },
        { id: "let_fight", label: "随他们去", effects: [
          { type: "add_event", params: { type: "FEUD_ESCALATED", tags: ["conflict", "minor"] } },
        ], nextNode: "soured" },
      ],
    },
    reconciled: {
      id: "reconciled",
      title: "重归于好",
      type: "resolution",
      description: "两个老友放下芥蒂，重叙旧谊。",
      preconditions: [],
      effects: [
        { type: "add_memory", params: { text: "是玩家让我和朋友和好了" } },
      ],
      candidateDeliveries: [
        { channel: "newspaper", priority: 3 },
        { channel: "rumor", priority: 3 },
      ],
      emotionalIntensity: 2,
      cooldownTags: ["feud"],
      canAutoAdvance: true,
      nextNode: null,
    },
    soured: {
      id: "soured",
      title: "不欢而散",
      type: "resolution",
      description: "两人关系彻底破裂，其中一人离开了镇子。",
      preconditions: [],
      effects: [
        { type: "add_event", params: { type: "FRIEND_LEFT_TOWN", tags: ["loss", "minor"] } },
      ],
      candidateDeliveries: [
        { channel: "rumor", priority: 2 },
      ],
      emotionalIntensity: 3,
      cooldownTags: ["feud"],
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [],
};

// ============================================================
// ST07: 药铺短缺 —— 医生急需一味药材，镇上只剩一人有
// ============================================================
export const ST07_MEDICINE_SHORTAGE = {
  id: "medicine_shortage",
  title: "药铺短缺",
  category: "community",
  description: "镇上闹病，医生急需一味药材，只有镇口的老猎人囤着。",
  emotionalArc: ["concern", "tension", "choice", "gratitude"],
  actorSlots: {
    doctor: { requiredTags: [], description: "急需药材的医生" },
    hunter: { requiredTags: [], description: "囤着药材的老猎人" },
  },
  startConditions: [
    { type: "and", params: { conditions: [
      { type: "played_days_min", params: { value: 2 } },
      { type: "player_money_min", params: { value: 20 } },
    ] } },
  ],
  exclusionTags: ["medicine"],
  nodes: {
    clinic: {
      id: "clinic",
      title: "药铺告急",
      type: "introduction",
      description: "医生告诉你镇上闹病，他缺一味退烧的草药。",
      preconditions: [],
      softDeadline: { afterDay: 1, beforeDay: 4 },
      effects: [
        { type: "add_memory", params: { text: "医生急着找一味药材" } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["clinic", "saloon"], priority: 5 },
        { channel: "phone", priority: 4 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "find",
    },
    find: {
      id: "find",
      title: "找到药材",
      type: "investigation",
      description: "你打听到镇口的老猎人囤着一整袋这种草药。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "clinic" } },
      ],
      softDeadline: { afterDay: 2, beforeDay: 6 },
      effects: [
        { type: "add_knowledge", params: { fact: "hunter_has_herbs", confidence: 0.8 } },
      ],
      candidateDeliveries: [
        { channel: "rumor", priority: 4 },
        { channel: "location", venueTags: ["north_road"], priority: 4 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "buy", label: "花钱买下", effects: [
          { type: "steal_money", params: { amount: 15 } },
          { type: "modify_relationship", params: { trust: 15, respect: 10 } },
        ], nextNode: "delivered" },
        { id: "persuade", label: "说服他捐出", effects: [
          { type: "modify_relationship", params: { trust: 18, debt: 15 } },
        ], nextNode: "delivered" },
        { id: "ignore", label: "不掺和", effects: [
          { type: "add_event", params: { type: "SICKNESS_SPREAD", tags: ["regret", "minor"] } },
        ], nextNode: "faded" },
      ],
    },
    delivered: {
      id: "delivered",
      title: "药到病除",
      type: "resolution",
      description: "药材送到，医生治好了镇上的病人。",
      preconditions: [],
      effects: [
        { type: "add_memory", params: { text: "玩家送来了救命的药材" } },
        { type: "modify_relationship", params: { trust: 20, respect: 15 } },
        { type: "faction_morale_change", params: { amount: 8 } },
      ],
      candidateDeliveries: [
        { channel: "newspaper", priority: 4 },
        { channel: "phone", priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: ["medicine"],
      canAutoAdvance: true,
      nextNode: null,
    },
    faded: {
      id: "faded",
      title: "风波过去",
      type: "resolution",
      description: "病潮渐渐退去，那袋药材再没人提起。",
      preconditions: [],
      effects: [],
      candidateDeliveries: [
        { channel: "rumor", priority: 2 },
      ],
      emotionalIntensity: 1,
      cooldownTags: ["medicine"],
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [],
};

// ============================================================
// ST08: 孤儿线索 —— 街角的孩子在找他的父亲
// ============================================================
export const ST08_ORPHAN_CLUE = {
  id: "orphan_clue",
  title: "孤儿线索",
  category: "mystery",
  description: "街角的孩子拿着一枚旧徽章，想知道父亲的往事。",
  emotionalArc: ["curiosity", "sympathy", "revelation", "warmth"],
  actorSlots: {
    kid: { requiredTags: [], description: "找父亲的孩子" },
    witness: { requiredTags: [], description: "知道往事的人" },
  },
  startConditions: [
    { type: "played_days_min", params: { value: 3 } },
  ],
  exclusionTags: ["orphan"],
  nodes: {
    street: {
      id: "street",
      title: "街角的孩子",
      type: "introduction",
      description: "一个孩子攥着枚旧徽章，站在街角发呆。",
      preconditions: [],
      softDeadline: { afterDay: 1, beforeDay: 5 },
      effects: [
        { type: "add_memory", params: { text: "有个孩子在找父亲的往事" } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["plaza", "north_road"], priority: 5 },
        { channel: "rumor", priority: 4 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "badge",
    },
    badge: {
      id: "badge",
      title: "那枚徽章",
      type: "investigation",
      description: "你认出那枚徽章——是十年前警署的旧式警徽。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "street" } },
      ],
      softDeadline: { afterDay: 2, beforeDay: 7 },
      effects: [
        { type: "add_knowledge", params: { fact: "kid_father_was_sheriff", confidence: 0.8 } },
      ],
      candidateDeliveries: [
        { channel: "phone", priority: 3 },
        { channel: "location", venueTags: ["saloon"], priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "help", label: "帮孩子查", effects: [
          { type: "modify_relationship", params: { trust: 15, respect: 15 } },
          { type: "add_money", params: { amount: 10 } },
        ], nextNode: "told" },
        { id: "tell", label: "直接告诉他真相", effects: [
          { type: "modify_relationship", params: { trust: 10, respect: 5 } },
          { type: "add_memory", params: { text: "有人告诉了我父亲的事" } },
        ], nextNode: "told" },
        { id: "pass", label: "当没看见", effects: [
          { type: "add_event", params: { type: "ORPHAN_LEFT_UNHELPED", tags: ["regret", "minor"] } },
        ], nextNode: "faded" },
      ],
    },
    told: {
      id: "told",
      title: "父亲的往事",
      type: "resolution",
      description: "孩子知道了父亲曾是受人尊敬的警长，收好徽章道谢离开。",
      preconditions: [],
      effects: [
        { type: "add_memory", params: { text: "我知道父亲是个好人" } },
        { type: "faction_morale_change", params: { amount: 5 } },
      ],
      candidateDeliveries: [
        { channel: "newspaper", priority: 3 },
        { channel: "rumor", priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: ["orphan"],
      canAutoAdvance: true,
      nextNode: null,
    },
    faded: {
      id: "faded",
      title: "孩子离开了",
      type: "resolution",
      description: "那孩子最终离开了镇子，徽章的事再没人提起。",
      preconditions: [],
      effects: [
        { type: "add_event", params: { type: "KID_LEFT", tags: ["minor"] } },
      ],
      candidateDeliveries: [
        { channel: "rumor", priority: 2 },
      ],
      emotionalIntensity: 1,
      cooldownTags: ["orphan"],
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [],
};

// 全部铺量树注册
export const STORIES_V2 = {
  market_scale: ST05_MARKET_SCALE,
  old_feud: ST06_OLD_FEUD,
  medicine_shortage: ST07_MEDICINE_SHORTAGE,
  orphan_clue: ST08_ORPHAN_CLUE,
};
