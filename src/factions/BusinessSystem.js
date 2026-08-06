// BusinessSystem.js — 产业经营（P7）。
//
// 和平路线（投资/购买）：付钱拿股份 → 每日分成
// 暴力路线（抢夺）    ：按双方势力数值结算，成功夺业
//
// 收益公式（见 DESIGN 4.3）：
//   岗位产出 = baseYield × 角色匹配(1.0/0.6) × 能力 × 忠诚(≥0.3) × 产业等级
//   若该岗位是敌方卧底：实际入账 ×0.5，另 50% 流向敌方 wealth 支柱
//   帮派净收入 = Σ岗位产出 − Σ维护费 − 薪水(members×10)
//
// 纯逻辑，操作 WorldState。不触碰 THREE/DOM。

import { BUSINESSES, BUSINESS_TYPES, POST_TYPES, businessById, abilityFor, roleMatches } from "../config/businessData.js";

const LEVEL_MULT = { 1: 1.0, 2: 1.3, 3: 1.7 };
const MATCH_MULT = { matched: 1.0, unmatched: 0.6 };

export class BusinessSystem {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.factionSystem = deps.factionSystem;
    this.nemesis = deps.nemesis || null;
    this.npcRegistry = deps.npcRegistry || null;
    this.hud = deps.hud || null;
    this.rng = deps.rng || Math.random;
    this.log = deps.log || (() => {});
    this._ensureState();
  }

  get state() { return this.worldState.state.business; }

  _ensureState() {
    const ws = this.worldState.state;
    if (!ws.business) {
      // 每个产业一份运行状态：owner 跟随抢夺/投资变更，posts 是岗位位
      const businesses = {};
      for (const def of BUSINESSES) {
        businesses[def.id] = {
          ...def,
          owner: def.owner,
          playerShare: def.owner === "player" ? 1 : 0,  // 玩家持股比例 0~1
          posts: def.posts.map((pt) => ({
            type: pt,
            label: POST_TYPES[pt].label,
            assignedNpcId: null,
            // 空岗时的账面预期（有岗时 postYield 会重算）
            expected: Math.round(def.baseIncome * 0.4),
          })),
        };
      }
      ws.business = { businesses, history: [], seizedByPlayer: [] };
    }
    return ws.business;
  }

  // ---- 查询 ----

  allBusinesses() { return Object.values(this.state.businesses); }

  getBusiness(id) { return this.state.businesses[id] || null; }

  playerBusinesses() {
    return this.allBusinesses().filter((b) => b.owner === "player" || b.playerShare > 0);
  }

  /** 指定产业的岗位（含指派） */
  postsOf(bizId) { return this.getBusiness(bizId)?.posts || []; }

  // ---- 投资/购买（和平路线） ----

  /**
   * 投资：按档位付钱，换取股份。
   * @param bizId 产业 id
   * @param tier "small" | "large" | "full"（独资）
   * @param payFrom 从哪扣钱（economy 钱包 / 帮派金库）
   * @returns {ok, error?, share, ownerChanged?}
   */
  invest(bizId, tier, payFrom = { money: 0, spend(amt) {} }) {
    const biz = this.getBusiness(bizId);
    if (!biz) return { ok: false, error: "no_business" };
    const sharePrice = tier === "full" ? biz.price : biz.shares[tier];
    if (!sharePrice) return { ok: false, error: "bad_tier" };
    if (payFrom.money < sharePrice) return { ok: false, error: "no_money" };

    payFrom.spend(sharePrice);

    if (tier === "full") {
      // 独资：直接接管（中立产业），或把原股东的股份买断（敌方产业须先抢夺）
      const wasEnemy = biz.owner === "black_hoof";
      if (wasEnemy) return { ok: false, error: "enemy_cannot_buy" }; // 敌方产业只能抢
      biz.owner = "player";
      biz.playerShare = 1;
      this.state.history.push({ day: this.worldState.state.day, type: "invest", bizId, tier, cost: sharePrice });
      this.log(`你买下了${biz.name}（独资）`);
      return { ok: true, tier, share: 1, ownerChanged: true, owner: "player" };
    }

    // 入股
    const prev = biz.playerShare;
    const add = tier === "large" ? 0.4 : 0.2;
    biz.playerShare = Math.min(1, prev + add);
    // 股东分红按持股比例，但 owner 仍是原势力（没有话事权不抢）
    this.state.history.push({ day: this.worldState.state.day, type: "invest", bizId, tier, cost: sharePrice });
    this.log(`你入股了${biz.name}（持股 ${Math.round(biz.playerShare * 100)}%）`);
    return { ok: true, tier, share: biz.playerShare - prev, ownerChanged: false, owner: biz.owner };
  }

  // ---- 抢夺（暴力路线） ----

  /**
   * 抢夺结算。按双方战力比例判定。
   * 战力 = Σ(派驻打手的 competence) + 玩家战力 + 卧底情报加成
   * 守方 = 业主 manpower×0.5 + territory×0.3 + heat×0.2
   * @param bizId
   * @param playerPower 玩家投入的战力（数字：派驻打手 + 玩家自身）
   * @returns {ok, error?, success, power, defense, moneyLost?, territoryLost?}
   */
  raid(bizId, playerPower = 0) {
    const biz = this.getBusiness(bizId);
    if (!biz) return { ok: false, error: "no_business" };
    if (biz.owner === "player") return { ok: false, error: "already_owned" };

    const ws = this.worldState.state;
    const bh = ws.factions.black_hoof;

    // 守方战力
    const ownerDef =
      biz.owner === "black_hoof"
        ? (bh.pillars.manpower.value * 0.5) + (bh.pillars.territory.value * 0.3) + (bh.heat || 0) * 0.2
        : 25;   // 中立产业：只有零散守卫

    // 卧底情报加成：有在黑蹄会里的卧底就 +20%
    let moleBonus = 0;
    if (this.nemesis && Object.keys(this.nemesis.state.moles || {}).length > 0) moleBonus = 0.2;

    const power = playerPower * (1 + moleBonus);
    const defense = Math.max(5, ownerDef);

    // 成功率夹在 0.1~0.9
    const winChance = Math.max(0.1, Math.min(0.9, power / (power + defense)));
    const success = this.rng() < winChance;

    const result = {
      ok: true, success,
      power: Math.round(power), defense: Math.round(defense),
      winChance: Math.round(winChance * 100),
      moneyLost: 0, memberLost: false, territoryLost: 0,
    };

    if (success) {
      // 夺业成功：玩家接管，业主丢地盘
      const oldOwner = biz.owner;
      biz.owner = "player";
      biz.playerShare = 1;
      // 原来持股的玩家股份也清零（已经被夺下了）
      this.state.seizedByPlayer.push(bizId);
      if (oldOwner === "black_hoof") {
        this.factionSystem?.damagePillar?.("territory", 8, `抢夺:${biz.name}`);
        result.territoryLost = 8;
      }
      this.state.history.push({ day: ws.day, type: "seize", bizId, success: true });
      this.log(`你抢下了${biz.name}！黑蹄会丢了一块地盘`);
    } else {
      // 失败：损失一笔钱（守方反击），黑蹄会热度上升
      const moneyLost = Math.round(biz.price * 0.2);
      result.moneyLost = moneyLost;
      ws.factions.black_hoof.heat = Math.min(100, (bh.heat || 0) + 4);
      this.state.history.push({ day: ws.day, type: "seize", bizId, success: false, moneyLost });
      this.log(`抢夺${biz.name}失败，搭进去 $${moneyLost}，黑蹄会盯上了你`);
    }
    return result;
  }

  // ---- 岗位 ----

  /** 给产业的一个空岗位指派成员 */
  assignPost(bizId, postIndex, npcId) {
    const biz = this.getBusiness(bizId);
    if (!biz) return { ok: false, error: "no_business" };
    const post = biz.posts[postIndex];
    if (!post) return { ok: false, error: "no_post" };
    // 该成员不能在别处已经上岗
    for (const b of this.allBusinesses()) {
      for (const p of b.posts) {
        if (p.assignedNpcId === npcId) {
          p.assignedNpcId = null;   // 自动换岗（一人只能干一份活）
        }
      }
    }
    post.assignedNpcId = npcId;
    this.state.history.push({ day: this.worldState.state.day, type: "assign", bizId, postIndex, npcId });
    return { ok: true, post };
  }

  unassignPost(bizId, postIndex) {
    const biz = this.getBusiness(bizId);
    const post = biz?.posts?.[postIndex];
    if (!post) return false;
    post.assignedNpcId = null;
    return true;
  }

  // ---- 收益 ----

  /** 单岗产出（DESIGN 4.3 公式） */
  postYield(biz, post) {
    const npc = post.assignedNpcId ? this.worldState.getNPC(post.assignedNpcId) : null;
    if (!npc) return 0;

    const job = npc.job || npc.personality?.job || "镇民";
    const matched = roleMatches(job, post.type);
    const ability = abilityFor(npc.personality || npc.traits, post.type);
    // 忠诚：从 personality.loyalty 或 traits.loyalty，下限 0.3
    const loyalty = Math.max(0.3, Math.min(1, npc.personality?.loyalty ?? npc.traits?.loyalty ?? 0.5));
    const levelMult = LEVEL_MULT[biz.level] || 1;

    // 账面预期（用于"总收益低于预期"的卧底线索）
    post.expected = Math.round(biz.baseIncome * 0.4 * MATCH_MULT[matched ? "matched" : "unmatched"] * levelMult);

    const raw = biz.baseIncome * 0.4 * MATCH_MULT[matched ? "matched" : "unmatched"] * ability * loyalty * levelMult;
    return { yield: Math.round(raw), matched, ability, loyalty, job };
  }

  /** 每日结算所有产业。返回汇总（含卧底分流明细）。 */
  settleDaily() {
    const ws = this.worldState.state;
    const pf = ws.factions.player;
    const out = { byBusiness: [], totalYield: 0, totalUpkeep: 0, totalSalary: 0, net: 0, moleLeak: 0, expectedTotal: 0 };

    let totalYield = 0, moleLeak = 0, expected = 0;
    const byBusiness = [];

    for (const biz of this.playerBusinesses()) {
      let bizYield = 0, bizUpkeep = BUSINESS_TYPES[biz.type].upkeep;
      const posts = [];
      for (const post of biz.posts) {
        const r = this.postYield(biz, post);
        if (!r.yield) continue;

        // 卧底分流：该成员真实归属是玩家但明面属于敌方 / 或明面是玩家但被敌方渗透？
        // 关键判据：看该成员是不是"在黑蹄会那边的人"。
        // 我们的卧底（registerMole 登记）明面上是黑蹄会的人 —— 他上岗产出的收益会偷偷流回黑蹄会
        let isLeaker = false;
        if (post.assignedNpcId && this.nemesis?.state?.moles?.[post.assignedNpcId]) {
          isLeaker = true;
        }
        const actual = isLeaker ? Math.round(r.yield * 0.5) : r.yield;
        if (isLeaker) moleLeak += r.yield - actual;

        totalYield += actual;
        bizYield += actual;
        expected += post.expected;
        posts.push({ ...r, type: post.type, assignedNpcId: post.assignedNpcId, isLeaker, actual });
      }
      bizYield -= bizUpkeep;
      totalYield -= bizUpkeep;
      byBusiness.push({ id: biz.id, name: biz.name, owner: biz.owner, level: biz.level, yield: bizYield, upkeep: bizUpkeep, posts });
    }

    // 薪水（成员维护费）不在这里扣 —— FactionSystem.settleIncome 已经按
    // members.length×10 扣过了。这里只记录供面板展示，避免双扣。
    const salary = (this.factionSystem?.getOpenMembers?.() || pf.members || []).length * 10;
    const net = totalYield - salary;   // 用于展示的"净额"（薪水已由 settleIncome 扣）

    // 卧底分流：流向黑蹄会 wealth 支柱
    if (moleLeak > 0) {
      this.factionSystem?.damagePillar?.("wealth", Math.round(moleLeak), "卧底分流");
    }

    // P11 账房先生加成：任命了账房 → 产业收益 +10%
    const incomeBonus = this.playerOrg?.state?.lastBonus?.incomeBonus ?? 0;
    if (incomeBonus > 0) {
      totalYield = Math.round(totalYield * (1 + incomeBonus));
    }

    // 帮派金库入账：只入产业净产出（维护费已在 totalYield 里扣了）。
    // 注意：settleIncome 在 Step5 先跑（扣薪水+加 hq 收入），这里在 Step14.75 补产业产出，
    // 不重复扣薪水，只把产业部分加进来。
    pf.money += totalYield;

    out.byBusiness = byBusiness;
    out.totalYield = totalYield;
    out.totalUpkeep = 0;
    out.totalSalary = salary;
    out.net = net;
    out.moleLeak = moleLeak;
    out.expectedTotal = expected;

    this.state.lastSettle = {
      day: ws.day, net, moleLeak, expected: expected,
      actual: totalYield,
    };
    return out;
  }

  // ---- 升级 ----

  upgrade(bizId) {
    const biz = this.getBusiness(bizId);
    if (!biz) return { ok: false, error: "no_business" };
    if (biz.owner !== "player") return { ok: false, error: "not_owned" };
    if (biz.level >= 3) return { ok: false, error: "max_level" };
    const cost = Math.round(biz.price * 0.8) * biz.level;
    if (this.worldState.state.factions.player.money < cost) return { ok: false, error: "no_money" };
    this.worldState.state.factions.player.money -= cost;
    biz.level += 1;
    this.state.history.push({ day: this.worldState.state.day, type: "upgrade", bizId, cost, level: biz.level });
    return { ok: true, level: biz.level, cost };
  }
}
