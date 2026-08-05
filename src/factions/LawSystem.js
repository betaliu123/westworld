// LawSystem.js — 警长势力：三角关系里的第三方。
//
// 三条边都必须真的通电，否则这只是个装饰：
//   玩家 → 警长：喂证据（卧底情报的出口）、交逃犯、曝光腐败、行贿
//   警长 → 黑蹄会：证据攒够就突袭，直接削 BH 支柱
//   黑蹄会 → 警长：每天行贿压廉洁、销毁证据；廉洁归零后彻底倒过去
//
// 关键设计：警长不是玩家通缉度的惩罚模块。他有自己的四根支柱和自己的目标
// （避免全面战争）。玩家可以把他当武器用 —— 但用得太狠他会反过来盯上你。

import { LAW_PILLARS, STANCE, RAID_TIERS, BRIBE, LAW_ACTIONS } from "../config/lawData.js";

const SHERIFF_ID = "npc_hector";

export class LawSystem {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.factionSystem = deps.factionSystem;
    this.nemesis = deps.nemesis || null;
    this.npcRegistry = deps.npcRegistry || null;
    this.reputation = deps.reputation || null;
    this.hud = deps.hud || null;
    this.rng = deps.rng || Math.random;
    this.log = deps.log || (() => {});
    this._ensureState();
  }

  get state() { return this.worldState.state.law; }

  _ensureState() {
    const ws = this.worldState.state;
    if (!ws.law) {
      const pillars = {};
      for (const [k, def] of Object.entries(LAW_PILLARS)) {
        pillars[k] = { value: def.initial, collapsed: def.initial <= def.collapseAt };
      }
      ws.law = {
        pillars,
        sheriffId: SHERIFF_ID,
        // 玩家与警长的关系：正数是协作，负数是对抗
        rapport: 0,
        // 已经执行过的突袭（同一档不重复）
        raidsDone: [],
        // 停战协议是否已被曝光（曝光后黑蹄会没法再靠"协议"约束他）
        truceExposed: false,
        // 警长是否已彻底倒向黑蹄会
        bought: false,
        bribesTaken: 0,
        // 玩家提交过的证据总量（用于成就/结局判定）
        evidenceFed: 0,
        history: [],
      };
    }
    return ws.law;
  }

  // ── 支柱 ────────────────────────────────────────────────────

  pillar(key) { return this.state.pillars[key]?.value ?? 0; }

  /** 改动某根支柱。返回新值。 */
  adjust(key, delta, source = "") {
    const def = LAW_PILLARS[key];
    const p = this.state.pillars[key];
    if (!def || !p) return 0;
    const before = p.value;
    p.value = Math.max(0, Math.min(100, p.value + delta));
    const wasCollapsed = p.collapsed;
    p.collapsed = p.value <= def.collapseAt;
    if (delta !== 0) {
      this.state.history.push({ day: this.worldState.state.day, key, delta, from: before, to: p.value, source });
    }
    if (!wasCollapsed && p.collapsed) this._onPillarCollapse(key);
    return p.value;
  }

  _onPillarCollapse(key) {
    const def = LAW_PILLARS[key];
    this.log(`警长的${def.label}崩了 —— ${def.description.split("。")[0]}`);
    this.hud?.toast?.(`⚖ 警长的${def.label}崩了`, { key: "law-collapse", duration: 5000 });
    // 廉洁崩溃 = 彻底被买通，此后玩家交的证据会当场消失
    if (key === "integrity") {
      this.state.bought = true;
      this.log("赫克托彻底站到黑蹄会那边了。往后你递上去的东西不会有下文。");
    }
    // 威信崩溃 = 通缉令失效，玩家在街上可以横着走（正反馈，但会招来别的麻烦）
    if (key === "authority") {
      this.log("镇上没人再把警长的通缉令当回事了。");
    }
  }

  // ── 对玩家的态度 ────────────────────────────────────────────

  /** 警长现在怎么看玩家 */
  stance() {
    const w = this.reputation?.wanted ?? 0;
    const r = this.state.rapport;
    if (this.state.bought) return STANCE.HOSTILE;      // 被买通后专门对付玩家
    if (r >= 40 && w < 40) return STANCE.ALLY;
    if (w >= 60) return STANCE.HOSTILE;
    if (w >= 30 || r < -20) return STANCE.WARY;
    return STANCE.NEUTRAL;
  }

  /**
   * 警长现在有没有能力真的来抓玩家。
   * 以前 wanted 只是个数字 —— 高了扣分，但没人真的上门。
   * 现在抓人要花人手，威信崩了连通缉令都没人认。
   */
  canPursuePlayer() {
    const st = this.stance();
    if (st !== STANCE.HOSTILE && st !== STANCE.WARY) return false;
    if (this.state.pillars.authority.collapsed) return false;  // 没人听他的
    if (this.pillar("manpower") < 15) return false;            // 没人可派
    return true;
  }

  /** 追捕强度（供 main 决定派几个人 / 多凶） */
  pursuitStrength() {
    if (!this.canPursuePlayer()) return 0;
    const w = this.reputation?.wanted ?? 0;
    const mp = this.pillar("manpower");
    const au = this.pillar("authority");
    return Math.max(0, Math.min(1, (w / 100) * 0.6 + (mp / 100) * 0.25 + (au / 100) * 0.15));
  }

  // ── 玩家动作 ────────────────────────────────────────────────

  /**
   * 玩家对警长做一件事。
   * @param actionId LAW_ACTIONS 的键
   * @param opts { amount } 递交证据时可以带量
   */
  playerAction(actionId, opts = {}) {
    const act = LAW_ACTIONS[actionId];
    if (!act) return { ok: false, reason: "unknown_action" };

    // 被买通之后，交证据是白交 —— 这是廉洁崩溃的实质后果
    if (this.state.bought && actionId === "feed_evidence") {
      this.log("你把东西交上去了，赫克托看了一眼，收进抽屉。你知道它不会再出来。");
      this.hud?.toast?.("⚖ 证据被压下了 —— 警长已经被买通", { key: "law-act", duration: 4600 });
      return { ok: false, reason: "sheriff_bought" };
    }

    const scale = opts.amount ?? 1;
    const applied = {};
    for (const [k, v] of Object.entries(act)) {
      if (k === "label") continue;
      applied[k] = this.adjust(k, Math.round(v * scale), `player:${actionId}`);
    }

    // 协作/对抗计入 rapport
    const friendly = { feed_evidence: 8, turn_in_thug: 10, back_publicly: 12, expose_truce: -4, bribe_sheriff: 6 };
    this.state.rapport = Math.max(-100, Math.min(100, this.state.rapport + (friendly[actionId] || 0)));

    if (actionId === "feed_evidence") this.state.evidenceFed += Math.round(12 * scale);
    if (actionId === "expose_truce") {
      this.state.truceExposed = true;
      // 曝光是双刃：黑蹄会失去"协议"这层保护，但警长威信也受损，
      // 而且他会因为被当众揭穿而记恨玩家
      this.factionSystem?.damagePillar?.("legitimacy", 14, "曝光警长与黑蹄会的停战协议");
      this.log("停战协议见报了。赫克托一夜之间没了退路 —— 他必须选一边。");
    }
    if (actionId === "bribe_sheriff") {
      this.state.bribesTaken++;
      this.log("赫克托把你的钱收了，什么也没说。");
    }
    return { ok: true, applied, stance: this.stance().id };
  }

  /**
   * 把卧底情报换成证据。
   * 这是 P4 → P5 的桥：渗透的收益不必总由玩家亲手兑现，
   * 可以借第三方的手落到黑蹄会身上。
   * @param intel nemesis.state.intel 里的条目
   */
  convertIntel(intel) {
    if (!intel) return 0;
    // 职级越高的情报越值钱
    const worth = 4 + (intel.rank || 1) * 3;
    if (this.state.bought) {
      this.log(`${intel.from}送回来的东西交上去也没用 —— 警长已经不办事了。`);
      return 0;
    }
    this.adjust("evidence", worth, `intel:${intel.from}`);
    this.state.evidenceFed += worth;
    this.state.rapport = Math.min(100, this.state.rapport + 3);
    return worth;
  }

  // ── 警长自己行动 ────────────────────────────────────────────

  /** 当前证据够打哪一档突袭（取最高可行的一档） */
  nextRaid() {
    const ev = this.pillar("evidence");
    const done = new Set(this.state.raidsDone);
    let best = null;
    for (const tier of RAID_TIERS) {
      if (done.has(tier.id)) continue;
      if (ev < tier.need) continue;
      if (!this._meetsPillars(tier.needPillars)) continue;
      if (!best || tier.need > best.need) best = tier;
    }
    return best;
  }

  _meetsPillars(req) {
    for (const [k, v] of Object.entries(req || {})) {
      if (this.pillar(k) < v) return false;
    }
    return true;
  }

  /** 执行一次突袭：花掉证据，削黑蹄会的支柱 */
  runRaid(tier) {
    if (!tier) return null;
    this.adjust("evidence", -tier.cost, `raid:${tier.id}`);
    this.state.raidsDone.push(tier.id);
    for (const [k, v] of Object.entries(tier.damage)) {
      this.factionSystem?.damagePillar?.(k, v, `警长突袭:${tier.label}`);
    }
    // 动了真格会让威信上升，但也消耗人手
    this.adjust("authority", 6, `raid:${tier.id}`);
    this.adjust("manpower", -4, `raid:${tier.id}`);
    this.log(`⚖ ${tier.label}：${tier.line}`);
    this.hud?.toast?.(`⚖ 警长动手了：${tier.label}`, { key: "law-raid", duration: 5200 });
    return tier;
  }

  // ── 黑蹄会行贿 ──────────────────────────────────────────────

  /** 黑蹄会每天试着把警长按住 */
  _enemyBribe() {
    if (this.state.bought) return null;                     // 已经买通了，不用再花钱
    const bh = this.worldState.getBlackHoof?.();
    const wealth = bh?.pillars?.wealth?.value ?? 0;
    if (wealth < 10) return null;                           // 穷得行不起贿

    // 廉洁越低越容易再被买通（滑坡）；协议被曝光后他不敢明着收
    let chance = BRIBE.baseChance
      + (1 - this.pillar("integrity") / 100) * BRIBE.slopeBonus
      + (wealth / 100) * 0.15;
    if (this.state.truceExposed) chance -= 0.30;
    // 玩家与他关系好会让他犹豫
    chance -= Math.max(0, this.state.rapport) / 100 * 0.35;
    if (this.rng() > Math.max(0.02, Math.min(0.95, chance))) return null;

    this.state.bribesTaken++;
    this.adjust("integrity", -BRIBE.integrityHit, "黑蹄会行贿");
    this.adjust("evidence", -BRIBE.evidenceHit, "卷宗被压下");
    this.factionSystem?.damagePillar?.("wealth", BRIBE.wealthCost, "行贿开销");
    return { integrityHit: BRIBE.integrityHit, evidenceHit: BRIBE.evidenceHit };
  }

  // ── 每日结算 ────────────────────────────────────────────────

  settleDaily() {
    const out = { bribe: null, raid: null, autoIntel: 0, pursuit: 0 };
    const day = this.worldState.state.day;

    // 1) 卧底情报自动转一部分证据（玩家不必手动跑腿）
    const intel = this.nemesis?.state?.intel || [];
    const fresh = intel.filter((i) => i.day === day - 1 || i.day === day);
    for (const i of fresh.slice(0, 3)) out.autoIntel += this.convertIntel(i);

    // 2) 黑蹄会行贿
    out.bribe = this._enemyBribe();
    if (out.bribe) {
      this.log(`黑蹄会又往警长口袋里塞了一笔（廉洁 -${out.bribe.integrityHit}，证据 -${out.bribe.evidenceHit}）`);
    }

    // 3) 证据够了就动手
    const tier = this.nextRaid();
    if (tier) out.raid = this.runRaid(tier);

    // 4) 人手缓慢恢复（招募民兵），廉洁不会自己回来
    if (this.pillar("manpower") < 40) this.adjust("manpower", 2, "招募民兵");

    // 5) 追捕强度（交给 main 决定要不要真派人上街）
    out.pursuit = this.pursuitStrength();
    out.stance = this.stance().id;
    return out;
  }

  // ── UI / 查询 ───────────────────────────────────────────────

  /** 给面板用的完整快照 */
  snapshot() {
    const st = this.stance();
    const next = this.nextRaid();
    // 下一档突袭还差什么
    const pending = RAID_TIERS.find((t) => !this.state.raidsDone.includes(t.id));
    const blockers = [];
    if (pending) {
      if (this.pillar("evidence") < pending.need) {
        blockers.push(`证据还差 ${Math.ceil(pending.need - this.pillar("evidence"))}`);
      }
      for (const [k, v] of Object.entries(pending.needPillars || {})) {
        if (this.pillar(k) < v) blockers.push(`${LAW_PILLARS[k].label}需达 ${v}（现 ${Math.round(this.pillar(k))}）`);
      }
    }
    return {
      sheriffName: this.npcRegistry?.get?.(SHERIFF_ID)?.displayName || "赫克托·布恩",
      pillars: Object.entries(LAW_PILLARS).map(([k, def]) => ({
        key: k, label: def.label,
        value: Math.round(this.pillar(k)),
        collapsed: !!this.state.pillars[k].collapsed,
        collapseAt: def.collapseAt,
      })),
      stance: st.id, stanceLabel: st.label, stanceDesc: st.desc,
      rapport: Math.round(this.state.rapport),
      bought: this.state.bought,
      truceExposed: this.state.truceExposed,
      bribesTaken: this.state.bribesTaken,
      evidenceFed: this.state.evidenceFed,
      raidsDone: this.state.raidsDone.slice(),
      readyRaid: next ? { id: next.id, label: next.label } : null,
      nextRaid: pending ? { id: pending.id, label: pending.label, need: pending.need } : null,
      blockers,
      canPursue: this.canPursuePlayer(),
      pursuit: Math.round(this.pursuitStrength() * 100),
    };
  }
}
