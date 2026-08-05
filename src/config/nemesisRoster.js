// nemesisRoster.js — 黑蹄会的组织架构。
//
// 为什么需要这张表：IMPORTANT_NPCS 里只有 3 个人挂着 factionId="black_hoof"
// （塞拉斯 rank5 头目 / 维克托 rank4 二把手 / 罗莎 rank3 赌场经理）。三个人
// 撑不起一个"可以往上爬、可以被顶替、可以渗透"的组织 —— 打掉二把手之后
// 没有第三个人有资格补位，晋升链一步就走到头。
//
// 所以这里补出中下层：每个岗位有明确职责、直属上级、可被顶替。
// 具名 NPC 占三个顶层位置，其余岗位由生成的成员填充（名字在运行时取）。

/** 职级定义。rank 越大越接近核心。 */
export const RANKS = {
  5: { label: "会首", slots: 1, pillarWeight: { legitimacy: 4, manpower: 2 } },
  4: { label: "二把手", slots: 1, pillarWeight: { manpower: 3, legitimacy: 2 } },
  3: { label: "堂主", slots: 3, pillarWeight: { wealth: 3, territory: 2 } },
  2: { label: "小头目", slots: 4, pillarWeight: { manpower: 2, territory: 2 } },
  1: { label: "打手", slots: 6, pillarWeight: { manpower: 1 } },
};

/**
 * 岗位表。
 * - id：岗位标识（不是人的 id —— 人会换，岗位不会）
 * - rank：职级
 * - reportsTo：直属上级岗位 id
 * - controls：这个岗位掌管的支柱（打掉他会伤到对应支柱）
 * - fixedNpc：由具名 NPC 固定占据（其余为生成成员）
 */
export const POSITIONS = [
  { id: "pos_boss",      rank: 5, reportsTo: null,          title: "会首",       controls: ["legitimacy"],            fixedNpc: "npc_silas"  },
  { id: "pos_second",    rank: 4, reportsTo: "pos_boss",    title: "二把手",     controls: ["manpower", "legitimacy"], fixedNpc: "npc_victor" },
  { id: "pos_casino",    rank: 3, reportsTo: "pos_second",  title: "赌场堂主",   controls: ["wealth"],                fixedNpc: "npc_rosa"   },
  { id: "pos_street",    rank: 3, reportsTo: "pos_second",  title: "南街堂主",   controls: ["territory"] },
  { id: "pos_warehouse", rank: 3, reportsTo: "pos_second",  title: "仓栈堂主",   controls: ["wealth", "territory"] },
  { id: "pos_collector", rank: 2, reportsTo: "pos_street",  title: "收账小头目", controls: ["wealth"] },
  { id: "pos_enforcer",  rank: 2, reportsTo: "pos_second",  title: "执法小头目", controls: ["manpower"] },
  { id: "pos_smuggler",  rank: 2, reportsTo: "pos_warehouse", title: "走货小头目", controls: ["wealth"] },
  { id: "pos_lookout",   rank: 2, reportsTo: "pos_street",  title: "眼线小头目", controls: ["territory"] },
  { id: "pos_gun_a",     rank: 1, reportsTo: "pos_enforcer", title: "枪手",      controls: ["manpower"] },
  { id: "pos_gun_b",     rank: 1, reportsTo: "pos_enforcer", title: "枪手",      controls: ["manpower"] },
  { id: "pos_thug_a",    rank: 1, reportsTo: "pos_collector", title: "打手",     controls: ["manpower"] },
  { id: "pos_thug_b",    rank: 1, reportsTo: "pos_collector", title: "打手",     controls: ["manpower"] },
  { id: "pos_runner_a",  rank: 1, reportsTo: "pos_smuggler", title: "跑腿",      controls: ["wealth"] },
  { id: "pos_spy_a",     rank: 1, reportsTo: "pos_lookout",  title: "线人",      controls: ["territory"] },
];

/**
 * 填补空缺岗位时用的名字池（避免和 IMPORTANT_NPCS 撞名）。
 *
 * 必须显著多于岗位数：开局要填满 12 个非具名岗位，之后每次晋升链走到最底层
 * 都需要一个新面孔来补最后那个空位。池子刚好等于岗位数的话，第一次链式晋升
 * 就会在底层留下永久空缺 —— 而"帮派再也招不到一个打手"是不合理的。
 * 同时池子必须有限且死者不复用，否则玩家杀不完，组织可以无限再生。
 */
export const FILLER_NAMES = [
  "拐子韩", "疤脸卢", "断指麦", "哑巴陈", "金牙彭", "瘸腿威",
  "红眼奥", "碎嘴洛", "大个巴", "冷脸尼", "钩子费", "老烟枪",
  "独耳孙", "刀疤齐", "秃头贾", "歪嘴丁", "阴脸霍", "痞子邹",
  "麻子唐", "长手冯", "锈牙葛", "黑指柯", "跛脚祁", "闷嘴戚",
];

/** 顶替时的性格倾向：野心高的抢位子，忠诚高的守位子 */
export function makeFillerTraits(rng = Math.random) {
  return {
    bravery: 0.35 + rng() * 0.5,
    aggression: 0.4 + rng() * 0.5,
    greed: 0.3 + rng() * 0.6,
    loyalty: 0.25 + rng() * 0.6,
    ambition: 0.2 + rng() * 0.75,
    empathy: 0.15 + rng() * 0.5,
  };
}

/** 按 id 取岗位 */
export function positionById(id) {
  return POSITIONS.find((p) => p.id === id) || null;
}

/** 某岗位的直接下属 */
export function subordinatesOf(posId) {
  return POSITIONS.filter((p) => p.reportsTo === posId);
}

/** 从某岗位往上到会首的完整链路（不含自己） */
export function chainUp(posId) {
  const out = [];
  let cur = positionById(posId);
  while (cur && cur.reportsTo) {
    const up = positionById(cur.reportsTo);
    if (!up) break;
    out.push(up);
    cur = up;
  }
  return out;
}
