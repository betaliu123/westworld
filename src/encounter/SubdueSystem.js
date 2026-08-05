// SubdueSystem.js — 处置伏地重伤者
//
// 这是玩家暴力的出口。原来打倒一个人之后什么都不会发生：他躺一会儿，
// 起来继续过日子，玩家的拳头没有换来任何东西。现在打服的人是一种资源 ——
// 可以收服成自己的人（甚至送回原势力当卧底）、可以搜身、可以补刀灭口、可以放走换人情。
//
// 关键设计：洗脑窗口 = 整个伏地阶段，不设倒计时秒数。
// 玩家不该因为"手速不够快"而失去一个已经打赢的机会；紧迫感应该来自
// 目击者会去报官、同伙会来救人这些世界层面的压力，而不是一个隐形的读秒。

/** 洗脑成功率 */
export function brainwashChance(npc, ctx = {}) {
  const p = npc.personality || {};
  let c = 0.30;

  // 骨头越硬越难收：胆量与攻击性都是抵抗
  c -= (p.bravery ?? 0.5) * 0.28;
  c -= (p.aggression ?? 0.5) * 0.12;
  // 贪财的好收买
  c += (1 - (p.loyalty ?? 0.5)) * 0.22;
  // 已经有好感的更容易倒过来
  c += Math.max(0, Math.min(1, (ctx.affection ?? 0) / 100)) * 0.25;
  // 玩家名声：凶名在外的人说话有分量。
  // 用通缉度当"凶名"的代理 —— 这个镇上没有独立的恐惧值，
  // 而"通缉 5 星的人蹲在你面前谈条件"本身就是最强的威慑。
  c += Math.max(0, Math.min(1, (ctx.fear ?? 0) / 100)) * 0.20;
  // 反过来，义士名声（honor 高）在"当街逼人投降"这件事上没什么用，
  // 反倒让对方觉得你不会真下手 —— 高义士轻微降低成功率
  c -= Math.max(0, Math.min(1, (ctx.honor ?? 0) / 100)) * 0.10;
  // 打得越狠越怕你（伤势 = 被打穿的程度）
  c += Math.min(0.18, (ctx.overkill ?? 0) * 0.06);
  // 对原势力忠诚的难挖
  if (p.gang && p.gang !== "player") c -= (p.loyalty ?? 0.5) * 0.18;
  // 有帮派身份的核心成员更难（帮派头目几乎不可能被当街收服）
  if (p.job === "帮派头目") c -= 0.25;
  if (p.job === "警长") c -= 0.30;
  // 同伙就在旁边看着，他不敢投降
  if (ctx.alliesNearby) c -= 0.20;
  // 被搜过身的人更绝望（先拿钱再劝降）
  if (npc._lootedByPlayer) c += 0.08;

  return Math.max(0.03, Math.min(0.92, c));
}

/** 收服后是当明面手下还是送回去当卧底 */
export function defaultAllegiance(npc) {
  const origin = npc.personality?.gang || null;
  // 原本就没有组织的人：直接当明面上的自己人
  if (!origin || origin === "player") {
    return { real: "player", apparent: "player", origin: null };
  }
  // 敌方成员：默认送回去当卧底（明面上还是原来那边的人）
  return { real: "player", apparent: origin, origin };
}

export class SubdueSystem {
  constructor(deps = {}) {
    this.ui = deps.ui || null;                 // EncounterUI
    this.hud = deps.hud || null;
    this.factionSystem = deps.factionSystem || null;
    this.economy = deps.economy || null;
    this.reputation = deps.reputation || null;
    this.npcRegistry = deps.npcRegistry || null;
    this.npcManager = deps.npcManager || null;
    this.log = deps.log || (() => {});
    this.onKilled = deps.onKilled || null;     // 补刀后回调（记通缉/目击）
    this.onRecruited = deps.onRecruited || null;
    this.rng = deps.rng || Math.random;
    this.target = null;
  }

  /**
   * 拿到这个场景 NPC 的持久档案（没有就创建）。
   *
   * 街上随机生成的镇民本来没有档案，一旦被收服就必须有一个 —— 否则
   * 明天场景重建时这层关系就没了，而 factions.player.members 里会留下
   * 一个查不到人的孤儿 id。
   */
  _record(npc, name) {
    if (!this.npcRegistry?.ensureRecord) return { id: name, record: null };
    return this.npcRegistry.ensureRecord(name, {
      job: npc.personality?.job,
      factionId: npc.personality?.gang || null,
    });
  }

  /** 周围有没有该 NPC 的同伙在看着（会压低投降意愿） */
  _alliesNearby(npc) {
    const gang = npc.personality?.gang;
    if (!gang || !this.npcManager) return false;
    for (const o of this.npcManager.all || []) {
      if (o === npc || !o.alive || o.removed) continue;
      if (o.brain?.state === "DOWN") continue;
      if (o.personality?.gang !== gang) continue;
      if (Math.hypot(o.pos.x - npc.pos.x, o.pos.z - npc.pos.z) <= 14) return true;
    }
    return false;
  }

  /** 打开处置弹窗 */
  open(npc) {
    if (!npc?.isWounded || !this.ui) return false;
    this.target = npc;
    const name = npc.phone?.owner || "这个人";
    const job = npc.personality?.job || "镇民";
    const gang = npc.personality?.gang;
    const known = this.npcRegistry?.findByDisplayName?.(name) || null;
    const affection = (known && this.npcRegistry?.get?.(known.id)?.affection) ?? known?.affection ?? 0;
    const fear = this.reputation?.wanted ?? 0;   // 通缉度当凶名
    const overkill = Math.max(0, -(npc.hp ?? 0));
    const allies = this._alliesNearby(npc);

    const chance = brainwashChance(npc, { affection, fear, overkill, honor: this.reputation?.honor ?? 0, alliesNearby: allies });
    const pct = Math.round(chance * 100);
    const cash = npc.cashReserve || 0;

    const beats = [
      `${name}倒在地上，喘着气，一只手撑着地想爬起来，又塌了回去。`,
      allies
        ? `他往旁边瞟了一眼 —— 他的人还在附近看着。这时候低头，以后就没法在他们中间待了。`
        : `四周暂时没有他的人。他看着你，眼里是那种"接下来随你处置"的空。`,
    ];
    if (gang && gang !== "player") {
      beats.push(`他身上还挂着${gang}的记号。要是能让他回去照旧当他的差，你就等于在那边有了一双眼睛。`);
    }

    const choices = [
      {
        id: "brainwash",
        label: `收服（成功率 ${pct}%）`,
        risk: pct >= 55 ? "low" : pct >= 30 ? "mid" : "high",
        note: gang && gang !== "player" ? "成功后送回原势力当卧底" : "成功后成为你的人",
      },
      { id: "loot", label: cash > 0 ? `搜身（约 $${cash}）` : "搜身（看看有什么）", risk: "mid", note: "拿了钱再劝降更容易" },
      { id: "finish", label: "补刀灭口", risk: "high", note: "彻底解决，但会留下尸体" },
      { id: "spare", label: "放他走", risk: "low", note: "他会记着这份人情" },
    ];

    this.ui.open({
      name, job, beats, choices,
      title: "处置伤者",
      onChoice: (id) => this.resolve(id),
    });
    return true;
  }

  resolve(choiceId) {
    const npc = this.target;
    this.target = null;
    this.ui?.close?.();
    if (!npc) return null;
    const name = npc.phone?.owner || "这个人";

    switch (choiceId) {
      case "brainwash": return this._brainwash(npc, name);
      case "loot":      return this._loot(npc, name);
      case "finish":    return this._finish(npc, name);
      case "spare":     return this._spare(npc, name);
      default:
        this.log(`（你站了一会儿，什么也没做，${name}还躺在那儿）`);
        return { kind: "none" };
    }
  }

  _brainwash(npc, name) {
    const known = this.npcRegistry?.findByDisplayName?.(name) || null;
    const affection = (known && this.npcRegistry?.get?.(known.id)?.affection) ?? known?.affection ?? 0;
    const fear = this.reputation?.wanted ?? 0;   // 通缉度当凶名
    const overkill = Math.max(0, -(npc.hp ?? 0));
    const chance = brainwashChance(npc, {
      affection, fear, overkill, honor: this.reputation?.honor ?? 0, alliesNearby: this._alliesNearby(npc),
    });
    const won = this.rng() < chance;

    if (!won) {
      // 失败：他记恨你，而且以后更难收（硬骨头验证过一次就更硬）
      npc._brainwashFailed = (npc._brainwashFailed || 0) + 1;
      npc.personality.loyalty = Math.min(1, (npc.personality.loyalty ?? 0.5) + 0.15);
      if (!npc._grudgeAgainstPlayer) npc._grudgeAgainstPlayer = { day: 1, severity: 0 };
      npc._grudgeAgainstPlayer.severity += 2;
      this.hud?.toast?.(`✋ ${name}啐了一口 —— 没谈成`, { key: "subdue", duration: 3000 });
      this.log(`${name}拒绝了你的条件（成功率 ${Math.round(chance * 100)}%，没成）`);
      return { kind: "brainwash", ok: false, chance };
    }

    // 成功：写真实归属
    const al = defaultAllegiance(npc);
    npc.allegiance = al;
    npc.personality.trueGang = "player";
    // 明面身份不动（卧底）；没有原势力的人直接改明面归属
    if (al.apparent === "player") npc.personality.gang = "player";
    npc.personality.loyalty = Math.max(0.55, npc.personality.loyalty ?? 0.5);

    // 落到持久档案：路人也会因此获得一份能跨天存活的身份
    const { id: npcId } = this._record(npc, name);
    this.npcRegistry?.update?.(npcId, {
      trueFactionId: "player",
      allegiance: al,
      trust: Math.max(45, this.npcRegistry?.get?.(npcId)?.trust ?? 0),
      affection: Math.max(affection, 25),
    });
    const added = this.factionSystem?.addPlayerMember?.(npcId, {
      job: npc.personality?.job,
      trust: 45,
      allegiance: al,
      undercover: al.apparent !== "player",
      recruitedBy: "subdue",
      displayName: name,
    });

    // 让他站起来跟着走：重伤解除，回一点血
    npc.wounded = false;
    npc._outCold = false;
    npc.hp = Math.max(1, Math.ceil(npc.maxHp * 0.3));
    npc.brain.state = "WANDER";
    npc.brain.stateTimer = 0;
    npc.brain._wantRevive = false;
    npc.brain.say?.(al.apparent === "player" ? "……行。我跟你。" : "……我回去，照旧。有事你找我。", 3.2);

    if (al.apparent === "player") {
      this.hud?.toast?.(`🤝 ${name}归你了`, { key: "subdue", duration: 3600 });
      this.log(`${name}被你收服，成了你的人`);
    } else {
      this.hud?.toast?.(`🕵 ${name}回${al.origin}当你的眼睛`, { key: "subdue", duration: 4200 });
      this.log(`${name}被你收服，明面上仍是${al.origin}的人（卧底）`);
    }
    this.onRecruited?.(npc, al, added);
    return { kind: "brainwash", ok: true, chance, allegiance: al };
  }

  _loot(npc, name) {
    const cash = npc.cashReserve || 0;
    npc.cashReserve = 0;
    npc._lootedByPlayer = true;
    if (cash > 0) this.economy?.addMoney?.(cash, `搜身：${name}`);
    // 搜身让他更绝望（后续劝降更容易），但也更恨你
    if (!npc._grudgeAgainstPlayer) npc._grudgeAgainstPlayer = { day: 1, severity: 0 };
    npc._grudgeAgainstPlayer.severity += 1;
    this.reputation?.addHonor?.(-2, `搜身：${name}`);
    this.hud?.toast?.(cash > 0 ? `💰 搜到 $${cash}` : "🪙 他身上什么都没有", { key: "subdue", duration: 3000 });
    this.log(cash > 0 ? `你从${name}身上搜出 $${cash}` : `${name}身上一个子儿都没有`);
    // 搜完人还躺着 —— 可以接着处置
    return { kind: "loot", cash, stillDown: true };
  }

  _finish(npc, name) {
    npc.die("player");
    this.reputation?.addHonor?.(-12, `杀害：${name}`);
    this.hud?.toast?.(`💀 你结束了${name}`, { key: "subdue", duration: 3600 });
    this.log(`你补了一刀，${name}死了`);
    this.onKilled?.(npc, name);
    return { kind: "finish", dead: true };
  }

  _spare(npc, name) {
    npc.wounded = false;
    npc._outCold = false;
    npc.hp = Math.max(1, Math.ceil(npc.maxHp * 0.25));
    npc.brain.state = "FLEE";
    npc.brain.stateTimer = 0;
    npc.brain._wantRevive = false;
    npc._sparedByPlayer = true;
    // 放人是有回报的：他记着这份人情。
    // 注意写的是 worldState 里的可变档案，不是 IMPORTANT_NPCS 静态定义 ——
    // findByDisplayName 返回的是模块级常量，直接改它会污染全局默认值。
    // 走 ensureRecord 而不是 get，这样路人第一次被放过也能留下"记着这份人情"。
    const { id: npcId, record } = this._record(npc, name);
    if (npcId && this.npcRegistry?.update) {
      const cur = this.npcRegistry.get?.(npcId) || record || {};
      this.npcRegistry.update(npcId, { affection: Math.min(100, (cur.affection || 0) + 15) });
    }
    npc.personality.loyalty = Math.max(0, (npc.personality.loyalty ?? 0.5) - 0.08);
    this.reputation?.addHonor?.(4, `放过：${name}`);
    npc.brain.say?.("……我记着。", 2.8);
    this.hud?.toast?.(`🕊 你放走了${name}`, { key: "subdue", duration: 3200 });
    this.log(`你放走了${name}，他记下了这份人情`);
    return { kind: "spare" };
  }
}
