// businessData.js — 产业与经营配置（P7）。
//
// 产业的两种获取方式：
//   购买/投资（和平路线）：付钱 → 拿股份 → 每日分成
//   抢夺（暴力路线）     ：按双方势力数值结算，成功夺业 + 通缉 + 敌对
//
// 收益公式见 BusinessSystem.settleDaily。

/** 产业类型定义 */
export const BUSINESS_TYPES = {
  saloon: { label: "酒馆", icon: "🥃", upkeep: 12, heat: 2 },
  casino: { label: "赌场", icon: "🎰", upkeep: 20, heat: 8 },
  freight: { label: "货栈", icon: "📦", upkeep: 14, heat: 4 },
  protection: { label: "保护费", icon: "🛡", upkeep: 8, heat: 5 },
  smithy: { label: "铁匠铺", icon: "⚒", upkeep: 10, heat: 1 },
  general: { label: "杂货店", icon: "🏪", upkeep: 8, heat: 1 },
};

/**
 * 岗位类型。
 * - preferredRoles：哪些角色在这个岗位有加成（账房←会计、护卫←枪手…）
 * - abilityKey：产出看哪项 personality（账房看智力≈emotion 的补、护卫看 bravery）
 */
export const POST_TYPES = {
  bookkeeper: { label: "账房", icon: "🧾", preferredRoles: ["会计", "商人", "记者"], abilityKey: "bookkeeping" },
  guard:      { label: "护卫", icon: "🛡", preferredRoles: ["枪手", "神枪手", "打手", "牛仔"], abilityKey: "combat" },
  runner:     { label: "跑腿", icon: "🏃", preferredRoles: ["马夫", "跑腿", "流浪赌徒", "淘金客"], abilityKey: "agility" },
  muscle:     { label: "打手", icon: "💪", preferredRoles: ["打手", "枪手", "矿工领袖"], abilityKey: "combat" },
  dealer:     { label: "柜面", icon: "🃏", preferredRoles: ["赌徒", "赌场经理", "酒保", "歌女"], abilityKey: "social" },
};

/**
 * 产业清单：开局就存在，归属固定。
 * 玩家可以投资（和平）或抢夺（暴力）。
 * posts 是每个产业提供的岗位位（label 取自 POST_TYPES）。
 */
export const BUSINESSES = [
  {
    id: "biz_saloon", name: "老鹰酒馆", type: "saloon", owner: "neutral",
    baseIncome: 120, level: 2, heat: 2,
    price: 300,      // 投资（独资）价
    shares: { small: 100, large: 200 },   // 小股/大股
    posts: ["bookkeeper", "guard", "runner"],
    x: 0, z: 0,      // 占位，可在 Town 装配时对齐
  },
  {
    id: "biz_casino", name: "黑蹄赌场", type: "casino", owner: "black_hoof",
    baseIncome: 260, level: 3, heat: 8,
    price: 800,
    shares: { small: 250, large: 500 },
    posts: ["dealer", "muscle", "guard", "bookkeeper"],
    x: 0, z: 0,
  },
  {
    id: "biz_freight", name: "南街货栈", type: "freight", owner: "black_hoof",
    baseIncome: 200, level: 2, heat: 4,
    price: 600,
    shares: { small: 200, large: 400 },
    posts: ["runner", "muscle", "guard"],
    x: 0, z: 0,
  },
  {
    id: "biz_smithy", name: "铁匠铺", type: "smithy", owner: "neutral",
    baseIncome: 80, level: 1, heat: 1,
    price: 200,
    shares: { small: 60, large: 120 },
    posts: ["muscle"],
    x: 0, z: 0,
  },
  {
    id: "biz_general", name: "杂货店", type: "general", owner: "neutral",
    baseIncome: 90, level: 1, heat: 1,
    price: 250,
    shares: { small: 80, large: 160 },
    posts: ["bookkeeper", "runner"],
    x: 0, z: 0,
  },
];

/** 按 id 找产业 */
export function businessById(id) {
  return BUSINESSES.find((b) => b.id === id) || null;
}

/** 某岗位类型在该产业里是否存在 */
export function postExists(biz, postType) {
  return biz.posts.includes(postType);
}

/**
 * 能力换算：personality（0~1）→ 岗位产出乘数。
 * 账房看"头脑"（emotion 低的冷静者 + 智力），护卫/打手看胆量。
 */
export function abilityFor(personality, postType) {
  const p = personality || {};
  switch (POST_TYPES[postType]?.abilityKey) {
    case "bookkeeping":
      // 会计头脑 = (1 - 冲动) 偏冷静 + 高共情不适合算账
      return Math.max(0.1, 0.6 + (1 - (p.aggression ?? 0.5)) * 0.4 - (p.empathy ?? 0.5) * 0.2);
    case "combat":
      return Math.max(0.1, 0.5 + (p.bravery ?? 0.5) * 0.6);
    case "agility":
      return Math.max(0.1, 0.5 + (1 - (p.bravery ?? 0.5)) * 0.4 + (p.aggression ?? 0.5) * 0.2);
    case "social":
      return Math.max(0.1, 0.5 + (p.sociability ?? 0.5) * 0.5);
    default:
      return 0.5;
  }
}

/** 角色与岗位是否匹配（preferredRoles 命中） */
export function roleMatches(job, postType) {
  const prefs = POST_TYPES[postType]?.preferredRoles || [];
  return prefs.includes(job);
}
