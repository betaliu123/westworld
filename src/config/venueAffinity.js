// venueAffinity.js — 场所 × 职业 的亲和度表。
//
// 用途：遭遇管线选角时的规则预筛。玩家进了赌场，来找他的应该是赌徒/赌场经理/歌女，
// 而不是牧师跑进来谈信仰。先用这张表筛出 top3，再（可选）交给 LLM 定选。
//
// 16 个可进入场所来自 Interiors.js 的 INTERIOR_DEFS。
// 职业名必须与 npcData.js / gameData.js 的 job 字段对得上。

// 分值：3 = 本职/常客，2 = 说得通，1 = 勉强，0 = 中性，-1 = 不太合理，null = 剔除
const T = {
  酒馆: { 酒保: 3, 酒馆老板: 3, 酒馆歌女: 3, 酒馆女侍: 3, 歌女: 3, 赌徒: 2, 流浪赌徒: 2, 牛仔: 2, 神枪手: 2, 枪手: 2, 矿工领袖: 2, 记者: 1, 商人: 1, 牧师: -1 },
  赌场: { 赌场经理: 3, 赌徒: 3, 流浪赌徒: 3, 帮派头目: 3, 帮派二把手: 2, 歌女: 2, 酒馆歌女: 2, 神枪手: 2, 枪手: 2, 商人: 1, 会计: 1, 牧师: null, 医生: -1 },
  教堂: { 牧师: 3, 医生: 2, 银行经理: 1, 会计: 1, 矿工领袖: 1, 赌徒: -1, 流浪赌徒: -1, 失踪者: -1, 帮派头目: -1 },
  银行: { 银行经理: 3, 会计: 3, 商人: 2, 帮派头目: 1, 帮派二把手: 1, 失踪者: null },
  警长办公室: { 警长: 3, 记者: 2, 赏金猎人: 2, 医生: 1, 失踪者: null, 帮派头目: -1, 帮派二把手: -1 },
  医馆: { 医生: 3, 牧师: 2, 矿工领袖: 1, 铁匠: 1 },
  报社: { 记者: 3, 会计: 1, 商人: 1, 牧师: 1 },
  马厩: { 马夫: 3, 铁匠: 2, 牛仔: 2, 赏金猎人: 2, 旅人: 2, 失踪者: 1 },
  铁匠铺: { 铁匠: 3, 马夫: 2, 牛仔: 1, 枪手: 1, 神枪手: 1 },
  杂货店: { 工具店主: 3, 商人: 3, 旅人: 2, 会计: 1, 酒馆女侍: 1 },
  枪械店: { 神枪手: 3, 枪手: 3, 赏金猎人: 3, 牛仔: 2, 警长: 2, 帮派二把手: 2 },
  餐馆: { 酒馆女侍: 2, 商人: 2, 旅人: 2, 记者: 2, 会计: 2, 银行经理: 1 },
  裁缝铺: { 歌女: 3, 酒馆歌女: 3, 酒馆女侍: 2, 商人: 2, 银行经理: 1 },
  邮局: { 记者: 2, 商人: 2, 会计: 2, 旅人: 2, 银行经理: 1 },
  理发店: { 商人: 2, 银行经理: 2, 赌场经理: 2, 牛仔: 1, 神枪手: 1 },
  旅馆: { 旅人: 3, 失踪者: 2, 赏金猎人: 2, 商人: 1, 流浪赌徒: 1 },
};

// 露天/街上：谁都合理，但外向的人更可能主动过来
const OUTDOOR_BY_SOCIABILITY = true;

/** 取某职业在某场所的亲和度；venue 为空（在街上）时返回 0 */
export function venueAffinity(venue, job) {
  if (!venue) return 0;
  const row = T[venue];
  if (!row) return 0;              // 未收录的场所不做偏好
  if (!(job in row)) return 0;     // 未列出的职业算中性
  return row[job];
}

/** 该职业是否被这个场所明确剔除 */
export function isBarred(venue, job) {
  if (!venue) return false;
  const row = T[venue];
  return !!row && row[job] === null;
}

/**
 * 规则预筛：按 亲和度 + 距离 + 社交性 打分，返回降序候选。
 * @returns [{ npc, score }]
 */
export function pickVenueCandidates(npcs, venue, opts = {}) {
  const jobOf = opts.jobOf || ((n) => n.personality?.job);
  const posOf = opts.posOf || ((n) => n.pos);
  const p = opts.playerPos || { x: 0, z: 0 };
  const out = [];
  for (const npc of npcs) {
    const job = jobOf(npc);
    if (!opts.forceVenue && isBarred(venue, job)) continue;   // 明确不该出现在这里
    const aff = venueAffinity(venue, job);
    if (!opts.forceVenue && aff < 0) continue;                // 不太合理的也剔掉
    const pos = posOf(npc) || p;
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    // 太远的不叫：走过来要太久，玩家早走了（遭遇管线还有 14 秒到位超时兜底）
    if (d > (opts.maxDist ?? 45)) continue;
    let score = aff * 10;
    score += Math.max(0, 20 - d * 0.25);                      // 近的优先
    if (OUTDOOR_BY_SOCIABILITY && !venue) {
      score += (npc.personality?.sociability ?? 0.5) * 8;     // 街上：外向的人更爱主动搭话
    }
    score += Math.random() * 4;                               // 打散同分
    out.push({ npc, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export { T as VENUE_AFFINITY_TABLE };
