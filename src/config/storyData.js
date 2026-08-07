// storyData.js — StoryTree 定义。所有 StoryTree 的节点、条件、效果、情绪弧。
// 这是配置数据，不包含逻辑。逻辑由 StoryRuntime / StoryConditions / StoryEffects 处理。
// 铺量树（ST05~ST08）在 storyData2.js，底部合并进 ALL_STORIES。

import { STORIES_V2 } from "./storyData2.js";

// ============================================================
// ST01: 信任、背叛与裁决
// ============================================================
export const ST01_TRUST_BETRAYAL_JUDGMENT = {
  id: "trust_betrayal_redemption",
  title: "信任、背叛与裁决",
  category: "relationship",
  description: "与一个看似脆弱但藏着秘密的NPC建立信任，经历背叛，最终做出裁决。",
  emotionalArc: ["sympathy", "warmth", "shock", "anger", "doubt", "judgment"],
  actorSlots: {
    protege: { requiredTags: ["young", "financial_pressure"], description: "被保护/招募的年轻NPC" },
    relative: { requiredTags: ["family_of_protege"], description: "其亲属" },
    shelterFaction: { requiredTags: ["rival_faction"], description: "可能接纳叛逃者的势力" },
  },
  startConditions: [],
  exclusionTags: [],
  nodes: {
    encounter: {
      id: "encounter",
      title: "偶遇",
      type: "introduction",
      description: "NPC遭遇困境，被玩家发现。",
      preconditions: [],
      softDeadline: { afterDay: 1, beforeDay: 3 },
      effects: [
        { type: "create_relationship", params: { trust: 5, affection: 5 } },
        { type: "add_memory", params: { text: "玩家在困难时发现了我" } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon", "plaza"], priority: 5 },
      ],
      emotionalIntensity: 1,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "re_encounter",
    },
    re_encounter: {
      id: "re_encounter",
      title: "再次接触",
      type: "relationship",
      description: "NPC再次出现在玩家生活中。",
      preconditions: [
        { type: "relationship_min", params: { trust: 5, affection: 0 } },
      ],
      softDeadline: { afterDay: 1, beforeDay: 4 },
      effects: [
        { type: "modify_relationship", params: { trust: 10, affection: 10 } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon"], priority: 4 },
        { channel: "phone", priority: 3 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "join",
    },
    join: {
      id: "join",
      title: "加入势力",
      type: "faction",
      description: "NPC加入玩家势力。",
      preconditions: [
        { type: "relationship_min", params: { trust: 15 } },
        { type: "faction_player_influence_min", params: { value: 5 } },
      ],
      softDeadline: { afterDay: 1, beforeDay: 5 },
      effects: [
        { type: "npc_join_faction", params: { factionId: "player" } },
        { type: "modify_relationship", params: { trust: 15, affection: 5 } },
        { type: "add_memory", params: { text: "玩家给了我一个归属" } },
      ],
      candidateDeliveries: [
        { channel: "hq", priority: 5 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "accept", label: "欢迎加入", effects: [] },
        { id: "conditionally", label: "有条件接受", effects: [
          { type: "modify_relationship", params: { trust: -5 } }
        ]},
        { id: "reject", label: "拒绝", effects: [
          { type: "story_abort", params: {} }
        ]},
      ],
      nextNode: "honeymoon",
    },
    honeymoon: {
      id: "honeymoon",
      title: "蜜月期",
      type: "relationship",
      description: "NPC与玩家建立深厚关系。",
      preconditions: [
        { type: "npc_in_faction", params: { factionId: "player" } },
      ],
      softDeadline: { afterDay: 2, beforeDay: 5 },
      effects: [
        { type: "modify_relationship", params: { trust: 15, affection: 20 } },
        { type: "add_memory", params: { text: "和玩家度过了最好的时光" } },
      ],
      candidateDeliveries: [
        { channel: "hq", priority: 4 },
        { channel: "location", venueTags: ["saloon"], priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "betrayal",
    },
    betrayal: {
      id: "betrayal",
      title: "背叛",
      type: "turning_point",
      description: "NPC背叛玩家，盗走资金或情报。",
      preconditions: [
        { type: "relationship_min", params: { trust: 30 } },
        { type: "player_money_min", params: { value: 100 } },
        { type: "played_days_min", params: { value: 4 } },
      ],
      softDeadline: { afterDay: 4, beforeDay: 8 },
      effects: [
        { type: "steal_money", params: { ratio: 0.2, min: 50 } },
        { type: "modify_relationship", params: { trust: -40, resentment: 30 } },
        { type: "record_betrayal", params: {} },
        { type: "damage_pillar", params: { factionId: "black_hoof", pillar: "manpower", amount: 3 } },
      ],
      candidateDeliveries: [
        { channel: "hq", priority: 5 },
        { channel: "phone", priority: 4 },
      ],
      emotionalIntensity: 5,
      cooldownTags: ["major_loss", "betrayal"],
      canAutoAdvance: true,
      interrupts: {
        // 如果玩家杀了伊莱 → 改写为复仇动机
        ST03_active: {
          condition: { type: "story_active", params: { storyId: "kin_revenge" } },
          rewrite: {
            motive: "revenge",
            stolenRatio: 0.3,
            description: "艾琳在维克托帮助下为哥哥复仇",
          },
        },
      },
      nextNode: "clues",
    },
    clues: {
      id: "clues",
      title: "线索浮现",
      type: "investigation",
      description: "背叛背后的真相逐渐浮现。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "betrayal" } },
      ],
      softDeadline: { afterDay: 5, beforeDay: 9 },
      effects: [
        { type: "reveal_secret", params: { secretId: "secret_brother_eli" } },
        { type: "add_knowledge", params: { fact: "family_debt_motive", confidence: 0.7 } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon", "plaza"], priority: 4 },
        { channel: "newspaper", priority: 3 },
        { channel: "rumor", priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "confrontation",
    },
    confrontation: {
      id: "confrontation",
      title: "对峙",
      type: "turning_point",
      description: "玩家与背叛者面对面。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "clues" } },
      ],
      softDeadline: { afterDay: 6, beforeDay: 10 },
      effects: [],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon", "hq"], priority: 5 },
      ],
      emotionalIntensity: 5,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "forgive", label: "原谅她", effects: [
          { type: "modify_relationship", params: { trust: 20, resentment: -50 } },
          { type: "npc_join_faction", params: { factionId: "player" } },
        ], nextNode: "redemption" },
        { id: "punish", label: "惩罚她", effects: [
          { type: "modify_relationship", params: { trust: -50, fear: 40 } },
          { type: "exile_npc", params: {} },
        ], nextNode: "exile" },
        { id: "recruit_back", label: "策反为内应", effects: [
          { type: "modify_relationship", params: { trust: -20, debt: 50 } },
          { type: "npc_change_faction", params: { factionId: "black_hoof" } },
          { type: "add_flag", params: { flag: "double_agent" } },
        ], nextNode: "double_agent" },
      ],
    },
    redemption: {
      id: "redemption",
      title: "救赎",
      type: "resolution",
      description: "背叛者重新赢得信任。",
      preconditions: [{ type: "response_chosen", params: { responseId: "forgive" } }],
      effects: [
        { type: "modify_relationship", params: { trust: 10, affection: 15 } },
      ],
      candidateDeliveries: [{ channel: "hq", priority: 4 }],
      emotionalIntensity: 4,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: null, // 结束
    },
    exile: {
      id: "exile",
      title: "放逐",
      type: "resolution",
      description: "背叛者被永远放逐。",
      preconditions: [{ type: "response_chosen", params: { responseId: "punish" } }],
      effects: [
        { type: "modify_relationship", params: { trust: -80, resentment: 60 } },
      ],
      candidateDeliveries: [{ channel: "newspaper", priority: 3 }],
      emotionalIntensity: 3,
      cooldownTags: ["major_loss"],
      canAutoAdvance: true,
      nextNode: null,
    },
    double_agent: {
      id: "double_agent",
      title: "双面间谍",
      type: "resolution",
      description: "背叛者成为敌方内部的情报源。",
      preconditions: [{ type: "response_chosen", params: { responseId: "recruit_back" } }],
      effects: [
        { type: "damage_pillar", params: { factionId: "black_hoof", pillar: "legitimacy", amount: 10 } },
        { type: "add_intel_bonus", params: { value: 15 } },
      ],
      candidateDeliveries: [{ channel: "phone", priority: 4 }],
      emotionalIntensity: 4,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  interrupts: [
    {
      id: "kin_revenge_override",
      condition: { type: "story_active", params: { storyId: "kin_revenge" } },
      description: "如果杀亲复仇树活跃，背叛动机改为复仇",
      action: "rewrite",
      targetNode: "betrayal",
      rewriteParams: { motive: "revenge", stolenRatio: 0.3 },
    },
    {
      id: "player_abusive",
      condition: { type: "faction_morale_below", params: { value: 30 } },
      description: "如果玩家势力士气很低，背叛被解释为逃亡",
      action: "rewrite",
      targetNode: "betrayal",
      rewriteParams: { motive: "escape", description: "NPC不堪虐待，选择逃亡" },
    },
  ],
  completionEffects: [
    { type: "add_memory", params: { text: "经历了信任与背叛的完整循环" } },
  ],
};

// ============================================================
// ST02: 救命之恩与迟到的回报
// ============================================================
export const ST02_LIFE_DEBT = {
  id: "life_debt",
  title: "救命之恩与迟到的回报",
  category: "relationship",
  description: "玩家救下一个陌生人，日后获得意外回报。",
  emotionalArc: ["goodwill", "forgetfulness", "surprise", "gratitude", "choice"],
  actorSlots: {
    beneficiary: { requiredTags: [], description: "被救者" },
  },
  startConditions: [],
  nodes: {
    rescue: {
      id: "rescue",
      title: "救援",
      type: "introduction",
      description: "玩家救下一个身份不明的NPC。",
      preconditions: [],
      softDeadline: { afterDay: 1, beforeDay: 4 },
      effects: [
        { type: "modify_relationship", params: { trust: 5, debt: 60, respect: 20 } },
        { type: "add_memory", params: { text: "玩家救了我的命" } },
        { type: "add_event", params: { type: "NPC_RESCUED", tags: ["kindness", "debt"] } },
      ],
      candidateDeliveries: [{ channel: "location", venueTags: ["north_road", "warehouse"], priority: 5 }],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "departure",
    },
    departure: {
      id: "departure",
      title: "暂时离开",
      type: "transition",
      description: "被救者离开，不立即回报。",
      preconditions: [{ type: "node_completed", params: { nodeId: "rescue" } }],
      delayDays: 1,
      effects: [
        { type: "add_memory", params: { text: "有人救过我，我记得" } },
      ],
      candidateDeliveries: [
        { channel: "phone", priority: 3 },
        { channel: "rumor", priority: 2 },
      ],
      emotionalIntensity: 1,
      canAutoAdvance: true,
      nextNode: "return",
    },
    return: {
      id: "return",
      title: "回报时刻",
      type: "turning_point",
      description: "被救者恢复能力，在玩家需要时出现。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "departure" } },
      ],
      softDeadline: { afterDay: 3, beforeDay: 9 },
      effects: [
        { type: "add_money", params: { amount: 80 } },
        { type: "modify_relationship", params: { trust: 15, debt: -30 } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon"], priority: 4 },
        { channel: "hq", priority: 5 },
        { channel: "phone", priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "accept_help", label: "接受帮助", effects: [] },
        { id: "decline", label: "婉拒", effects: [
          { type: "modify_relationship", params: { respect: 10 } }
        ], nextNode: "ally" },
        { id: "call_in_favor", label: "要求更大的回报", effects: [
          { type: "add_money", params: { amount: 200 } },
          { type: "modify_relationship", params: { debt: -60, resentment: 20 } },
        ] },
      ],
      nextNode: null, // 回报完成
    },
    ally: {
      id: "ally",
      title: "长期盟友",
      type: "resolution",
      description: "被救者因你的谦逊成为长期盟友。",
      preconditions: [{ type: "response_chosen", params: { responseId: "decline" } }],
      effects: [
        { type: "modify_relationship", params: { trust: 20, respect: 15 } },
        { type: "npc_join_faction", params: { factionId: "player" } },
      ],
      emotionalIntensity: 3,
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [],
};

// ============================================================
// ST03: 杀亲复仇
// ============================================================
export const ST03_KIN_REVENGE = {
  id: "kin_revenge",
  title: "杀亲复仇",
  category: "revenge",
  description: "玩家无意中杀害了某NPC的亲属，引发复仇。",
  emotionalArc: ["accident", "hidden_threat", "revelation", "fear/guilt", "conflict"],
  actorSlots: {
    victim: { requiredTags: [], description: "被杀的NPC" },
    avenger: { requiredTags: ["family_of_protege"], description: "复仇者（亲属）" },
  },
  startConditions: [
    { type: "or", params: { conditions: [
      { type: "and", params: { conditions: [
        { type: "npc_dead", params: { npcId: "npc_eli" } },
        { type: "event_has_tag", params: { tag: "violence", actor: "player" } },
      ] } },
      { type: "and", params: { conditions: [
        { type: "played_days_min", params: { value: 3 } },
        { type: "player_money_min", params: { value: 50 } },
      ] } },
    ] } },
  ],
  nodes: {
    discovery: {
      id: "discovery",
      title: "发现",
      type: "introduction",
      description: "复仇者通过目击者或证据逐渐发现真相。",
      preconditions: [
        { type: "npc_dead", params: { npcId: "npc_eli" } },
      ],
      softDeadline: { afterDay: 1, beforeDay: 6 },
      effects: [
        { type: "modify_relationship", params: { resentment: 40 } },
        { type: "reveal_secret", params: { secretId: "secret_brother_eli" } },
      ],
      candidateDeliveries: [
        { channel: "newspaper", priority: 3 },
        { channel: "rumor", priority: 3 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "investigation",
    },
    investigation: {
      id: "investigation",
      title: "调查真相",
      type: "investigation",
      description: "复仇者追查杀害亲人的凶手。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "discovery" } },
      ],
      softDeadline: { afterDay: 2, beforeDay: 8 },
      effects: [
        { type: "modify_relationship", params: { resentment: 30 } },
        { type: "add_knowledge", params: { fact: "player_killed_relative", confidence: 0.7 } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon", "sheriff_office"], priority: 3 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "revenge_act",
    },
    revenge_act: {
      id: "revenge_act",
      title: "复仇行动",
      type: "turning_point",
      description: "复仇者采取行动。",
      preconditions: [
        { type: "node_completed", params: { nodeId: "investigation" } },
      ],
      softDeadline: { afterDay: 4, beforeDay: 10 },
      effects: [
        { type: "modify_relationship", params: { trust: -30, resentment: 40 } },
      ],
      candidateDeliveries: [
        { channel: "location", venueTags: ["saloon"], priority: 5 },
        { channel: "hq", priority: 4 },
      ],
      emotionalIntensity: 4,
      cooldownTags: ["major"],
      canAutoAdvance: false,
      playerResponses: [
        { id: "confess", label: "坦白", effects: [
          { type: "modify_relationship", params: { resentment: -20 } }
        ] },
        { id: "compensate", label: "赔偿", effects: [
          { type: "add_money", params: { amount: -200 } },
          { type: "modify_relationship", params: { resentment: -30, debt: 30 } }
        ] },
        { id: "blame_others", label: "嫁祸他人", effects: [
          { type: "add_event", params: { type: "FRAME_ATTEMPT", tags: ["deception"] } },
          { type: "modify_relationship", params: { resentment: 10 } }
        ] },
        { id: "eliminate", label: "灭口", effects: [
          { type: "npc_kill", params: {} },
          { type: "add_event", params: { type: "SILENCED_WITNESS", tags: ["violence", "major"] } },
        ], nextNode: null },
      ],
      nextNode: "resolution",
    },
    resolution: {
      id: "resolution",
      title: "结局",
      type: "resolution",
      description: "复仇事件的最终结果。",
      preconditions: [{ type: "node_completed", params: { nodeId: "revenge_act" } }],
      effects: [],
      emotionalIntensity: 3,
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [
    { type: "add_memory", params: { text: "复仇的故事有了结局" } },
  ],
};

// ============================================================
// ST11: 失踪成员与派遣事故
// ============================================================
export const ST11_MISSING_MEMBER = {
  id: "missing_member",
  title: "失踪成员与派遣事故",
  category: "operation",
  description: "派遣行动失败导致成员失踪，玩家必须决断如何处理。",
  emotionalArc: ["control", "unease", "responsibility", "search/sacrifice"],
  actorSlots: {
    missingMember: { requiredTags: [], description: "失踪成员" },
  },
  startConditions: [
    { type: "or", params: { conditions: [
      { type: "event_type_occurred", params: { type: "OPERATION_RESULT", outcome: "missing" } },
      { type: "and", params: { conditions: [
        { type: "played_days_min", params: { value: 2 } },
        { type: "player_money_min", params: { value: 30 } },
      ] } },
    ] } },
  ],
  nodes: {
    reported_missing: {
      id: "reported_missing",
      title: "失踪报告",
      type: "introduction",
      description: "派遣行动回报：成员失联。",
      preconditions: [
        { type: "event_type_occurred", params: { type: "OPERATION_RESULT", outcome: "missing" } },
      ],
      effects: [
        { type: "npc_set_status", params: { status: "missing" } },
        { type: "add_event", params: { type: "MEMBER_MISSING", tags: ["operation", "major"] } },
      ],
      candidateDeliveries: [
        { channel: "hq", priority: 5 },
        { channel: "phone", priority: 4 },
      ],
      emotionalIntensity: 3,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "contradictory_clues",
    },
    contradictory_clues: {
      id: "contradictory_clues",
      title: "线索矛盾",
      type: "investigation",
      description: "不同成员提供了相互矛盾的线索。",
      preconditions: [{ type: "node_completed", params: { nodeId: "reported_missing" } }],
      softDeadline: { afterDay: 1, beforeDay: 3 },
      effects: [
        { type: "add_knowledge", params: { fact: "member_last_seen_location", confidence: 0.5 } },
        { type: "add_knowledge", params: { fact: "member_possible_foul_play", confidence: 0.4 } },
      ],
      candidateDeliveries: [
        { channel: "hq", priority: 4 },
        { channel: "rumor", priority: 3 },
      ],
      emotionalIntensity: 2,
      cooldownTags: [],
      canAutoAdvance: true,
      nextNode: "decision",
    },
    decision: {
      id: "decision",
      title: "决断",
      type: "turning_point",
      description: "玩家必须决定如何处理失踪事件。",
      preconditions: [{ type: "node_completed", params: { nodeId: "contradictory_clues" } }],
      softDeadline: { afterDay: 2, beforeDay: 5 },
      effects: [],
      candidateDeliveries: [
        { channel: "hq", priority: 5 },
      ],
      emotionalIntensity: 4,
      cooldownTags: [],
      canAutoAdvance: false,
      playerResponses: [
        { id: "search_personally", label: "亲自搜救", effects: [
          { type: "npc_set_status", params: { status: "rescued" } },
          { type: "modify_relationship", params: { trust: 20, respect: 15 } },
        ], nextNode: "rescued" },
        { id: "send_team", label: "再派人去", effects: [
          { type: "random_outcome", params: { success: 0.5, options: ["search_personally", "pay_ransom", "abandon_them"] } },
        ] },
        { id: "pay_ransom", label: "支付赎金", effects: [
          { type: "add_money", params: { amount: -150 } },
          { type: "npc_set_status", params: { status: "ransomed" } },
        ], nextNode: "ransomed" },
        { id: "abandon_them", label: "放弃", effects: [
          { type: "npc_set_status", params: { status: "lost" } },
          { type: "faction_morale_change", params: { amount: -10 } },
        ], nextNode: "abandoned" },
      ],
    },
    rescued: {
      id: "rescued",
      title: "获救",
      type: "resolution",
      description: "成员获救，忠诚度大增。",
      effects: [
        { type: "modify_relationship", params: { trust: 30, debt: 40 } },
        { type: "faction_morale_change", params: { amount: 10 } },
      ],
      emotionalIntensity: 4,
      canAutoAdvance: true,
      nextNode: null,
    },
    ransomed: {
      id: "ransomed",
      title: "赎金换回",
      type: "resolution",
      description: "支付赎金换回成员。",
      effects: [
        { type: "modify_relationship", params: { trust: 10, debt: 20 } },
      ],
      emotionalIntensity: 2,
      canAutoAdvance: true,
      nextNode: null,
    },
    abandoned: {
      id: "abandoned",
      title: "放弃",
      type: "resolution",
      description: "成员被放弃，其他成员士气受影响。",
      effects: [
        { type: "add_event", params: { type: "MEMBER_LOST", tags: ["loss", "major"] } },
        { type: "faction_morale_change", params: { amount: -20 } },
      ],
      emotionalIntensity: 3,
      cooldownTags: ["major_loss"],
      canAutoAdvance: true,
      nextNode: null,
    },
  },
  completionEffects: [],
};

// 所有 StoryTree 注册
export const ALL_STORIES = {
  trust_betrayal_redemption: ST01_TRUST_BETRAYAL_JUDGMENT,
  life_debt: ST02_LIFE_DEBT,
  kin_revenge: ST03_KIN_REVENGE,
  missing_member: ST11_MISSING_MEMBER,
  ...STORIES_V2,
};
