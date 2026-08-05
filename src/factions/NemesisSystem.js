// NemesisSystem.js — 组织架构、晋升顶替、双向卧底、怀疑度。
//
// 核心命题：敌方组织不是一堆血条，而是一张有职级、有直属上级、有野心的人事图。
// 玩家可以从下往上拆（打掉小头目 → 上级失去这条线 → 支柱受损），
// 也可以从内部渗透（收服的人送回去当卧底 → 偷情报 / 关键时刻背刺）。
// 反过来敌方也会往玩家这边塞人 —— 玩家名单上多出来的人不一定都是自己的。
//
// 与 FactionSystem 的分工：
//   FactionSystem 管四根支柱的数值与胜负判定；
//   NemesisSystem 管"谁坐在哪个位子上"，并把人事变动换算成支柱伤害。

import {
  POSITIONS, RANKS, FILLER_NAMES, makeFillerTraits,
  positionById, subordinatesOf, chainUp,
} from "../config/nemesisRoster.js";

const FACTION = "black_hoof";

export class NemesisSystem {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.npcRegistry = deps.npcRegistry;
    this.factionSystem = deps.factionSystem;
    this.eventLog = deps.eventLog || null;
    this.hud = deps.hud || null;
    this.rng = deps.rng || Math.random;
    this.log = deps.log || (() => {});
    this._ensureState();
  }

  // ── 状态 ────────────────────────────────────────────────────
  get state() {
    return this.worldState.state.nemesis;
  }

  _ensureState() {
    const ws = this.worldState.state;
    if (!ws.nemesis) {
      ws.nemesis = {
        seats: {},          // posId -> { npcId, displayName, since, traits }
        vacancies: [],      // 暂时无人的岗位（下次结算时补人）
        suspicion: {},      // npcId -> 0~100，敌方对这个人的怀疑度
        moles: {},          // npcId -> { side, posId, feedsSince }  玩家在敌方的人
        plants: {},         // npcId -> { plantedAt, reportsTo }     敌方在玩家这边的人
        intel: [],          // 卧底送回来的情报
        purges: 0,          // 敌方清洗次数
        retired: [],        // 已经出局的名字 —— 死人不能再被招回来（见 _fillVacancy）
        history: [],        // 人事变动流水
      };
      this._seedSeats();
    }
    return ws.nemesis;
  }

  /** 首次装配：具名 NPC 就位，其余岗位填生成成员 */
  _seedSeats() {
    const s = this.state;
    let nameIdx = 0;
    for (const pos of POSITIONS) {
      if (pos.fixedNpc) {
        const rec = this.npcRegistry?.get?.(pos.fixedNpc);
        s.seats[pos.id] = {
          npcId: pos.fixedNpc,
          displayName: rec?.displayName || pos.fixedNpc,
          since: 0,
          traits: rec?.traits || makeFillerTraits(this.rng),
          fixed: true,
        };
      } else {
        const name = FILLER_NAMES[nameIdx % FILLER_NAMES.length];
        nameIdx++;
        const { id } = this._ensureFiller(name, pos);
        s.seats[pos.id] = {
          npcId: id, displayName: name, since: 0,
          traits: makeFillerTraits(this.rng), fixed: false,
        };
      }
    }
  }

  _ensureFiller(name, pos) {
    if (!this.npcRegistry?.ensureRecord) return { id: "npc_x_" + name };
    return this.npcRegistry.ensureRecord(name, {
      job: pos.title, factionId: FACTION, factionRank: pos.rank,
      tags: ["black_hoof", "filler"],
    });
  }

  // ── 查询 ────────────────────────────────────────────────────

  /** 某岗位现在是谁 */
  occupantOf(posId) {
    return this.state.seats[posId] || null;
  }

  /** 某人现在坐哪个位子（没有则 null） */
  seatOf(npcId) {
    for (const [posId, seat] of Object.entries(this.state.seats)) {
      if (seat?.npcId === npcId) return { posId, ...seat };
    }
    return null;
  }

  /** 完整架构图数据（供 UI 渲染），按 rank 从高到低 */
  orgChart() {
    const s = this.state;
    return POSITIONS.map((pos) => {
      const seat = s.seats[pos.id];
      const npcId = seat?.npcId || null;
      return {
        posId: pos.id,
        title: pos.title,
        rank: pos.rank,
        rankLabel: RANKS[pos.rank]?.label || String(pos.rank),
        reportsTo: pos.reportsTo,
        controls: pos.controls,
        vacant: !seat,
        npcId,
        name: seat?.displayName || "（空缺）",
        since: seat?.since ?? null,
        // 玩家视角的三种身份标注
        isMole: !!(npcId && s.moles[npcId]),          // 我的人
        suspicion: npcId ? (s.suspicion[npcId] || 0) : 0,
        ambition: seat?.traits?.ambition ?? 0,
        loyalty: seat?.traits?.loyalty ?? 0,
      };
    }).sort((a, b) => b.rank - a.rank || a.posId.localeCompare(b.posId));
  }

  /** 玩家已渗透到哪些岗位 */
  moleSeats() {
    return this.orgChart().filter((n) => n.isMole);
  }

  /** 距离会首还差几层（最深的卧底所在层级） */
  deepestMoleRank() {
    const m = this.moleSeats();
    return m.length ? Math.max(...m.map((x) => x.rank)) : 0;
  }

  // ── 人事变动 ────────────────────────────────────────────────

  /**
   * 某人从组织里消失（被杀 / 被抓 / 被收服带走）。
   * 这是玩家拆组织的主要入口 —— 空出来的位子会由最有野心的下属顶上，
   * 而顶替过程本身会削弱对应支柱（青黄不接）。
   *
   * @param npcId 消失的人
   * @param reason "killed" | "arrested" | "defected" | "missing"
   */
  removeMember(npcId, reason = "killed") {
    const seat = this.seatOf(npcId);
    if (!seat) return null;
    const pos = positionById(seat.posId);
    const s = this.state;

    delete s.seats[seat.posId];
    if (s.moles[npcId]) delete s.moles[npcId];
    // 出局的人不能再被当成"新人"招回来。不记这一笔的话，_fillVacancy 只看
    // 当前在位者的名字来判重，被杀的人名字就会重新空出来 —— 玩家杀不完，
    // 组织可以拿同一批名字无限再生。
    if (!s.retired) s.retired = [];
    if (!s.retired.includes(seat.displayName)) s.retired.push(seat.displayName);
    s.history.push({ day: this.worldState.state.day, type: "remove", npcId, name: seat.displayName, posId: seat.posId, reason });

    // 岗位空缺本身就是伤害：这个位子管的支柱立刻受损，
    // 职级越高伤得越重（会首空缺 = 组织当场失序）
    const sev = { killed: 1.0, arrested: 0.85, defected: 0.9, missing: 0.6 }[reason] ?? 0.7;
    const base = 4 + pos.rank * 3;
    for (const key of pos.controls) {
      this.factionSystem?.damagePillar?.(key, Math.round(base * sev), `${reason}:${seat.displayName}`);
    }
    // 上级也会因为"手下没了"而掉人手
    const up = chainUp(seat.posId)[0];
    if (up) this.factionSystem?.damagePillar?.("manpower", Math.round(pos.rank * 1.5), `失去下属:${seat.displayName}`);

    this.log(`${seat.displayName}（${pos.title}）从黑蹄会消失了（${this._reasonText(reason)}）`);
    const promoted = this._fillVacancy(seat.posId);
    return { removed: seat, position: pos, promoted };
  }

  _reasonText(r) {
    return { killed: "被杀", arrested: "被捕", defected: "反水", missing: "失踪" }[r] || r;
  }

  /**
   * 补空缺：从直接下属里挑野心最大的顶上；没有下属就从名字池招新人。
   * 晋升是链式的 —— 下属升上去之后他原来的位子又空了。
   */
  _fillVacancy(posId, depth = 0) {
    if (depth > 6) return null;                 // 防御：链太长就停
    const pos = positionById(posId);
    if (!pos) return null;
    const s = this.state;

    // 候选：直接下属中还在位的人
    const subs = subordinatesOf(posId)
      .map((sp) => ({ sp, seat: s.seats[sp.id] }))
      .filter((x) => x.seat);

    if (subs.length) {
      // 野心 + 一点随机（同样野心的人不总是同一个上位）
      subs.sort((a, b) =>
        (b.seat.traits?.ambition ?? 0) + this.rng() * 0.15
        - ((a.seat.traits?.ambition ?? 0) + this.rng() * 0.15));
      const winner = subs[0];
      const from = winner.sp;
      const seat = winner.seat;
      delete s.seats[from.id];
      s.seats[posId] = { ...seat, since: this.worldState.state.day, promotedFrom: from.id };
      this.npcRegistry?.update?.(seat.npcId, { factionRank: pos.rank, job: pos.title });
      s.history.push({ day: this.worldState.state.day, type: "promote", npcId: seat.npcId, name: seat.displayName, from: from.id, to: posId });
      this.log(`${seat.displayName}顶上了${pos.title}的位子`);

      // 卧底升上去 = 玩家的人往核心走了一层，这是渗透路线的核心奖励
      if (s.moles[seat.npcId]) {
        s.moles[seat.npcId].posId = posId;
        this.hud?.toast?.(`🕵 你的人升到了${pos.title}`, { key: "nemesis-promote", duration: 4200 });
        this.log(`你的卧底${seat.displayName}升为${pos.title}`);
      }
      // 他原来的位子继续往下补
      const chained = this._fillVacancy(from.id, depth + 1);
      return { seat: s.seats[posId], position: pos, chained };
    }

    // 没有下属可提：招个外人（新人忠诚度低、需要时间，会短期压低士气）。
    // 名字池有限且死者不复用 —— 所以玩家真的可以把这个组织杀空。
    const used = new Set(Object.values(s.seats).map((x) => x?.displayName));
    const retired = new Set(s.retired || []);
    const name = FILLER_NAMES.find((n) => !used.has(n) && !retired.has(n));
    if (!name) {
      if (!s.vacancies.includes(posId)) s.vacancies.push(posId); // 名字用尽 → 真的空着
      this.log(`${pos.title}的位子空着，黑蹄会一时找不到人`);
      return null;
    }
    const { id } = this._ensureFiller(name, pos);
    s.seats[posId] = {
      npcId: id, displayName: name, since: this.worldState.state.day,
      traits: makeFillerTraits(this.rng), fixed: false, fresh: true,
    };
    s.history.push({ day: this.worldState.state.day, type: "recruit", npcId: id, name, to: posId });
    this.log(`黑蹄会补了个新人${name}当${pos.title}`);
    return { seat: s.seats[posId], position: pos, fresh: true };
  }

  // ── 双向卧底 ────────────────────────────────────────────────

  /**
   * 把一个人登记为玩家在黑蹄会内部的卧底。
   * 由 SubdueSystem 的"收服 + 送回去"路径调用。
   */
  registerMole(npcId, displayName) {
    const s = this.state;
    const seat = this.seatOf(npcId);
    // 不在架构图上的人（普通街头混混）也能当卧底，只是没有岗位视野
    s.moles[npcId] = {
      side: "player",
      posId: seat?.posId || null,
      displayName: displayName || seat?.displayName || npcId,
      since: this.worldState.state.day,
    };
    s.suspicion[npcId] = s.suspicion[npcId] || 0;
    this.log(`${s.moles[npcId].displayName}成为你在黑蹄会的眼睛${seat ? `（${positionById(seat.posId).title}）` : ""}`);
    return s.moles[npcId];
  }

  /** 敌方往玩家这边塞人 */
  plantEnemyMole(npcId, displayName) {
    const s = this.state;
    s.plants[npcId] = { plantedAt: this.worldState.state.day, displayName, exposed: false };
    this.log(`（有人加入了你的队伍……）`);
    return s.plants[npcId];
  }

  /** 玩家怀疑某人是敌方的人；查对了就清掉，查错了伤士气 */
  accuse(npcId, displayName) {
    const s = this.state;
    const plant = s.plants[npcId];
    if (plant && !plant.exposed) {
      plant.exposed = true;
      this.factionSystem?.removePlayerMember?.(npcId);
      this.log(`你揪出了${displayName || plant.displayName} —— 他是黑蹄会的人`);
      this.hud?.toast?.(`🎯 揪出内鬼：${displayName || plant.displayName}`, { key: "nemesis-accuse", duration: 4200 });
      return { correct: true };
    }
    // 冤枉自己人：士气受损，而且这个人会记着
    this.factionSystem?.changePlayerMorale?.(-12);
    const rec = this.npcRegistry?.get?.(npcId);
    if (rec) this.npcRegistry.update(npcId, { affection: Math.max(-100, (rec.affection || 0) - 25) });
    this.log(`你冤枉了${displayName || npcId}，队伍里的人都看着`);
    this.hud?.toast?.(`✋ 冤枉了自己人，士气下降`, { key: "nemesis-accuse", duration: 4000 });
    return { correct: false };
  }

  // ── 怀疑度 ──────────────────────────────────────────────────

  /**
   * 卧底暴露风险。每天结算时按"他干了多少事"累积；
   * 满 100 就被清洗（当场移出组织，玩家失去这条线）。
   */
  addSuspicion(npcId, amount, reason = "") {
    const s = this.state;
    if (!s.moles[npcId]) return 0;
    const next = Math.max(0, Math.min(100, (s.suspicion[npcId] || 0) + amount));
    s.suspicion[npcId] = next;
    if (reason && amount > 0) {
      s.history.push({ day: this.worldState.state.day, type: "suspicion", npcId, amount, reason });
    }
    return next;
  }

  /** 每日结算：卧底送情报、累积怀疑、触发清洗 */
  settleDaily() {
    const s = this.state;
    const out = { intel: [], purged: [], suspicionUp: [] };
    const day = this.worldState.state.day;

    for (const [npcId, mole] of Object.entries(s.moles)) {
      const seat = this.seatOf(npcId);
      const rank = seat ? positionById(seat.posId).rank : 0;

      // 情报质量随职级上升：打手只知道街上的事，堂主能看到账
      const intel = this._makeIntel(mole, rank, day);
      if (intel) { s.intel.push(intel); out.intel.push(intel); }

      // 干得越多越容易露：职级越高接触的核心越多，风险也越高
      const risk = 3 + rank * 2.5;
      const before = s.suspicion[npcId] || 0;
      const after = this.addSuspicion(npcId, risk, "日常活动");
      out.suspicionUp.push({ npcId, name: mole.displayName, before, after });

      if (after >= 100) {
        s.purges++;
        out.purged.push({ npcId, name: mole.displayName, posId: seat?.posId || null });
        this.log(`${mole.displayName}被黑蹄会清洗了 —— 你在里面的眼睛少了一双`);
        this.hud?.toast?.(`💀 卧底${mole.displayName}暴露了`, { key: "nemesis-purge", duration: 5000 });
        if (seat) this.removeMember(npcId, "killed");
        else delete s.moles[npcId];
      }
    }
    // 情报只留最近 40 条
    if (s.intel.length > 40) s.intel = s.intel.slice(-40);
    return out;
  }

  _makeIntel(mole, rank, day) {
    const pool = rank >= 4
      ? ["会首下一步要动的地盘", "黑蹄会的贿赂名单", "谁在会里想取代会首"]
      : rank === 3
        ? ["赌场这个月的真实流水", "仓栈的走货时间", "哪个堂主在私吞"]
        : rank === 2
          ? ["收账的路线和时间", "执法队今晚在哪蹲人"]
          : ["街上哪块地盘换了人看", "谁最近挨了训"];
    const fact = pool[Math.floor(this.rng() * pool.length)];
    return { day, from: mole.displayName, rank, fact };
  }

  // ── 胜负相关 ────────────────────────────────────────────────

  /**
   * 渗透路线的胜利条件：卧底坐到二把手以上 + 会首孤立。
   * 与 FactionSystem.checkVictory 的"打崩支柱"是两条并行的路。
   */
  infiltrationStatus() {
    const chart = this.orgChart();
    const boss = chart.find((n) => n.rank === 5);
    const deepest = this.deepestMoleRank();
    // 会首身边还剩几个不是玩家的人
    const loyalInner = chart.filter((n) => n.rank >= 3 && !n.vacant && !n.isMole).length;
    return {
      deepestMoleRank: deepest,
      moleCount: this.moleSeats().length,
      bossName: boss?.name || null,
      bossVacant: !!boss?.vacant,
      loyalInnerCircle: loyalInner,
      // 内圈全是自己人 → 可以直接接管
      canTakeOver: deepest >= 4 && loyalInner === 0,
      // 二把手是自己人 → 会首被架空
      bossIsolated: deepest >= 4 && loyalInner <= 1,
    };
  }
}
