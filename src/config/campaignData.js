// campaignData.js — 十日主线战役配置：头目、支柱、压力日程、胜利条件、推进路线

// ============================================================
// 敌方头目：塞拉斯·克劳
// ============================================================
export const BOSS_CONFIG = {
  id: "black_hoof",
  name: "黑蹄会",
  leaderName: "塞拉斯·克劳",
  leaderId: "npc_silas",
  description: "小镇地下世界的实际控制者，通过赌场、高利贷和保护费维持统治。",
};

// ============================================================
// 四根统治支柱
// ============================================================
export const BOSS_PILLARS = {
  wealth: {
    label: "财富",
    initial: 80,
    collapseAt: 25,
    sources: ["赌场", "银行股份", "保护费"],
    description: "黑蹄会的经济命脉，一旦断裂将无法维持人手和贿赂。",
    damageActions: ["抢劫赌场", "挖走客户", "冻结资产", "公开账本"],
  },
  territory: {
    label: "地盘",
    initial: 75,
    collapseAt: 25,
    sources: ["赌场", "南街", "仓库"],
    description: "控制的地盘范围，地盘缩小意味着收入和人手来源减少。",
    damageActions: ["占领地盘", "策反看守", "破坏仓库", "示威游行"],
  },
  manpower: {
    label: "人手",
    initial: 70,
    collapseAt: 25,
    sources: ["副手", "枪手", "线人"],
    description: "可用的人力，包括核心成员和外围打手。",
    damageActions: ["策反成员", "逮捕枪手", "火并消耗", "瓦解士气"],
  },
  legitimacy: {
    label: "威望",
    initial: 65,
    collapseAt: 25,
    sources: ["恐惧", "警长妥协", "舆论控制"],
    description: "在小镇的合法外衣，一旦失去将面临公开反抗和执法打击。",
    damageActions: ["揭露腐败", "公开证据", "舆论攻势", "策反警长"],
  },
};

// ============================================================
// 十日压力配置（固定的是阶段作用，不是具体剧情）
// ============================================================
export const PRESSURE_SCHEDULE = {
  1: {
    name: "建立目标与驻地",
    mainlineFunction: "introduce_pillars",
    directorGuarantee: "认识一个可招募NPC；得知头目四根支柱",
    enemyAction: "观察玩家",
    enemyIntensity: 0.2,
    requiredFunctions: ["introduce_npc", "reveal_pillars"],
  },
  2: {
    name: "第一次资源选择",
    mainlineFunction: "first_resources",
    directorGuarantee: "赚钱、情报、人情三种机会至少出现两种",
    enemyAction: "拉拢中立NPC",
    enemyIntensity: 0.3,
    requiredFunctions: ["resource_opportunity"],
  },
  3: {
    name: "敌方首次施压",
    mainlineFunction: "first_pressure",
    directorGuarantee: "保护费、警告或抢生意三选一",
    enemyAction: "执行一次轻度打压",
    enemyIntensity: 0.4,
    requiredFunctions: ["enemy_pressure"],
    structuralAnchor: true,
  },
  4: {
    name: "建立人物依恋",
    mainlineFunction: "relationship_building",
    directorGuarantee: "一个关系型StoryTree进入亲近期",
    enemyAction: "策反玩家外围关系",
    enemyIntensity: 0.45,
    requiredFunctions: ["relationship_deepening"],
  },
  5: {
    name: "第一次重大转折",
    mainlineFunction: "first_turning_point",
    directorGuarantee: "背叛、失败或意外收益择一",
    enemyAction: "巩固最弱支柱",
    enemyIntensity: 0.6,
    requiredFunctions: ["major_turning_point"],
    structuralAnchor: true,
    forbiddenTags: [], // 不禁止重大损失（这是安排好的）
  },
  6: {
    name: "给出解释与追查空间",
    mainlineFunction: "investigation",
    directorGuarantee: "对第5日事件提供两条不同来源线索",
    enemyAction: "制造假消息",
    enemyIntensity: 0.5,
    requiredFunctions: ["clue_revelation"],
  },
  7: {
    name: "大型行动开放",
    mainlineFunction: "major_operation",
    directorGuarantee: "玩家可亲自或派遣完成一次行动",
    enemyAction: "争夺地盘",
    enemyIntensity: 0.7,
    requiredFunctions: ["operation_opportunity"],
    structuralAnchor: true,
  },
  8: {
    name: "世界重新站队",
    mainlineFunction: "realignment",
    directorGuarantee: "至少一名NPC改变势力或立场",
    enemyAction: "收买关键人物",
    enemyIntensity: 0.75,
    requiredFunctions: ["faction_shift"],
  },
  9: {
    name: "终局反扑",
    mainlineFunction: "final_counterattack",
    directorGuarantee: "袭击驻地、冻结资产、绑架或舆论战择一",
    enemyAction: "全力反制",
    enemyIntensity: 0.9,
    requiredFunctions: ["boss_counterattack"],
    structuralAnchor: true,
    forbiddenTags: [], // 第九日可以连续重大事件
  },
  10: {
    name: "最终处置",
    mainlineFunction: "final_judgment",
    directorGuarantee: "根据支柱状态生成谈判、政变、审判或火并",
    enemyAction: "保卫统治",
    enemyIntensity: 1.0,
    requiredFunctions: ["endgame"],
    structuralAnchor: true,
  },
};

// ============================================================
// 胜利条件
// ============================================================
export const VICTORY_CONDITIONS = {
  normal: {
    label: "普通胜利",
    description: "扳倒黑蹄会，建立新秩序",
    requirements: {
      pillarsCollapsed: 2,      // 至少两根支柱崩溃
      playerInfluence: 45,      // 玩家势力影响力
      endgameTriggered: true,   // 完成终局事件
    },
  },
  dominant: {
    label: "优势胜利",
    description: "彻底瓦解黑蹄会，策反敌方核心成员",
    requirements: {
      pillarsCollapsed: 3,      // 三根支柱崩溃
      defectorRecruited: true,  // 至少策反一名黑蹄会重要成员
      hqLevel: 2,               // 驻地等级至少为 2
    },
  },
  takeover: {
    label: "内部接管",
    description: "不曾正面击垮黑蹄会 —— 你把自己的人一层层送上去，最后整个内圈都听你的",
    requirements: {
      // 渗透路线：与"打崩支柱"并行的第二条通路。
      // 让"收服敌人送回去当卧底"这套投入有一个真正的终点，
      // 而不只是多几条情报。
      moleRank: 4,              // 至少有一个卧底坐到二把手
      loyalInnerCircle: 0,      // 会首身边再没有真正忠于他的堂主以上成员
    },
  },
  bitter: {
    label: "苦涩结局",
    description: "勉强制服头目，但付出了沉重代价",
    requirements: {
      pillarsCollapsed: 1,      // 只崩溃一根支柱
      endgameTriggered: true,
      // 敌方人数和资源大幅增加
    },
  },
  failure: {
    label: "完全失败",
    description: "未能扳倒黑蹄会",
    requirements: {
      playerMorale: 0,          // 士气归零
      playerMembers: 1,         // 成员少于 2 人
      noAvailableBreach: true,  // 没有任何可用突破口
    },
  },
};

// ============================================================
// 五条推进路线
// ============================================================
export const APPROACHES = {
  violent: {
    label: "暴力",
    actions: ["袭击", "火并", "刺杀", "夺地盘"],
    primaryPillars: ["manpower", "territory"],
    risks: ["通缉", "伤亡", "复仇"],
    styleTags: ["violent", "direct", "aggressive"],
  },
  economic: {
    label: "经营",
    actions: ["赌博", "产业", "股票", "收购"],
    primaryPillars: ["wealth", "territory"],
    risks: ["债务", "诈骗", "经济反击"],
    styleTags: ["economic", "strategic", "patient"],
  },
  social: {
    label: "人际",
    actions: ["救人", "招募", "策反", "结盟"],
    primaryPillars: ["manpower", "legitimacy"],
    risks: ["背叛", "派系冲突"],
    styleTags: ["social", "diplomatic", "persuasive"],
  },
  intelligence: {
    label: "情报",
    actions: ["手机", "账本", "报纸", "勒索"],
    primaryPillars: ["wealth", "legitimacy"],
    risks: ["假情报", "灭口"],
    styleTags: ["intelligence", "subtle", "investigative"],
  },
  legal: {
    label: "法律",
    actions: ["协助警长", "提供证据", "公开审判"],
    primaryPillars: ["legitimacy", "manpower"],
    risks: ["妥协", "被利用"],
    styleTags: ["legal", "righteous", "orderly"],
  },
};

// ============================================================
// 玩家势力升级
// ============================================================
export const HQ_LEVELS = {
  1: {
    label: "据点",
    unlocks: ["床", "餐桌", "成员列表"],
    effects: ["睡觉结算", "共同晚餐"],
    upgradeCost: 0,
  },
  2: {
    label: "行动基地",
    unlocks: ["行动桌", "储藏室", "医疗床"],
    effects: ["派遣行动", "粮食储备", "伤员恢复"],
    upgradeCost: 500,
  },
  3: {
    label: "情报中心",
    unlocks: ["情报室", "训练场", "会客区"],
    effects: ["高级调查", "成员成长", "高级NPC会面"],
    upgradeCost: 1500,
  },
};

// ============================================================
// 分期阶段判断
// ============================================================
export function getCampaignPhase(day) {
  if (day <= 1) return "establishment";
  if (day <= 3) return "early_game";
  if (day <= 5) return "mid_game";
  if (day <= 7) return "late_game";
  if (day <= 9) return "endgame";
  return "finale";
}
