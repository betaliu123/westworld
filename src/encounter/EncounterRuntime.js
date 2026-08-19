// EncounterRuntime.js — 统一遭遇管线。
//
// 「玩家可见的叙事抉择」全部走这一条路，不管来源是 StoryTree、主线、还是招募：
//   [1 选角] → [2 召唤] → [3 标记] → [4 交互] → [5 抉择] → [6 结算]
//
// 为什么废弃原来的 location/hq 定点投放：那要求玩家恰好在对的建筑、对的时间点，
// 而 checkLocationTriggers 的调用点还拿不到室内位置（传进去恒 null/false），
// 于是 5 个「需要抉择」的节点从来没送到过玩家面前。改成「NPC 主动来找你」，
// 把「玩家要走到哪」这个耦合彻底去掉。
//
// 与 AI 剧场的关系：剧场是同一套东西的多演员配置（舞台固定在镇中心），
// 这里是单/双演员配置（舞台动态设在玩家脚下）。呈现层完全共用。

import { pickVenueCandidates, venueAffinity } from "../config/venueAffinity.js";

const Phase = {
  IDLE: "idle",
  SUMMONING: "summoning",   // NPC 正在走过来
  READY: "ready",           // 到位了，头顶 ❗ 等玩家按 F
  ENGAGED: "engaged",       // 弹窗开着
  DONE: "done",
};

// NPC 走过来的超时（真实秒）。超时就地开演，别让玩家干等
const SUMMON_TIMEOUT = 14;
// 到位判定距离
const ARRIVE_DIST = 2.6;
// 玩家跑太远就取消这次遭遇
const ABANDON_DIST = 26;

export class EncounterRuntime {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.npcRegistry = deps.npcRegistry;
    this.town = deps.town;
    this.ui = deps.ui;                       // EncounterUI
    this.hud = deps.hud;
    this.glue = deps.glue || null;           // 可选：LLM 选角与开场白
    this.getPlayerPos = deps.getPlayerPos || (() => ({ x: 0, z: 0 }));
    this.getVenue = deps.getVenue || (() => null);   // 玩家当前所在场所（室内名 or null）
    this.getHour = deps.getHour || (() => 12);
    this.onResolve = deps.onResolve || (() => {});   // (encounter, choiceId) => void
    this.log = deps.log || (() => {});
    this.now = deps.now || (() => performance.now() / 1000);

    this.phase = Phase.IDLE;
    this.active = null;   // 当前遭遇
    this._timers = [];
  }

  get busy() { return this.phase !== Phase.IDLE && this.phase !== Phase.DONE; }
  /** 供头顶标记系统查询：这个 NPC 是否在等玩家搭话 */
  isPending(npc) { return this.phase === Phase.READY && this.active?.npc === npc; }

  /**
   * 发起一次遭遇。
   * @param spec {
   *   id                  唯一标识（用于去重）
   *   title               标题（弹窗副标题）
   *   beats: [string]     台词（可为空，会用 opener 兜底）
   *   choices: [{id,label,risk,hint}]
   *   preferNpcId         优先指定的 NPC（剧情绑定的角色）
   *   requireRole/jobs    选角约束（可选）
   *   requireFemale       true/false 强制主角性别（描写里是"姑娘"就不能派个汉子）
   *   allowDefer          是否允许"稍后再说"
   *   intent              一句话说明这次遭遇的意图，给 LLM 选角用
   *
   *   ---- 布景模式（故事节点用）----
   *   stageAt: {x,z}      把这一幕**摆在指定地点**，而不是把人叫到玩家跟前。
   *                       玩家专程走到医馆门口，就该在医馆门口看到这一幕。
   *   extraCast: number   除主角外还要几个人在场（围住主角的混混之类）
   *   extraSpec: [{n,hint,female,gang}]  配角要求，用于挑人
   * }
   * @returns {boolean} 是否成功发起
   */
  async request(spec = {}) {
    if (this.busy) return false;
    const venue = this.getVenue();
    // 布景模式下"锚点"是场地，不是玩家当前位置
    const venuePos = spec.stageAt
      ? { x: spec.stageAt.x, z: spec.stageAt.z }
      : { ...this.getPlayerPos() };
    const cast = await this._cast(spec, venue);
    if (!cast) {
      this.log(`（${spec.title || spec.id}：眼下没有合适的人来找你）`);
      return false;
    }

    this.active = {
      ...spec,
      npc: cast.npc,
      npcId: cast.npcId,
      name: cast.name,
      venue,
      beats: (spec.beats && spec.beats.length) ? spec.beats.slice() : [cast.opener || "……有件事得跟你说。"],
      startedAt: this.now(),
      extras: [],
      // 发起时玩家站在哪。放弃判定用「玩家离开这个锚点多远」，
      // 不能用「NPC 离玩家多远」—— 召唤阶段 NPC 本来就在远处，
      // 那样会在发起的同一帧就把遭遇取消掉。
      anchor: { x: venuePos.x, z: venuePos.z },
    };
    this.phase = Phase.SUMMONING;
    if (spec.stageAt) this._stage(cast.npc, spec);
    else this._summon(cast.npc);
    // 告诉调用方主角是谁：故事要把绑定改到这个人身上，后续节点才是同一个人
    if (spec.onCast) {
      try { spec.onCast(cast.npcId, cast.name); } catch (e) { console.error("[Encounter] onCast 出错", e); }
    }
    return true;
  }

  /**
   * 布景：把主角和配角摆到场地上，立起描写里的那一幕。
   *
   * 跟 _summon 的区别：_summon 是"某人走到玩家跟前找你说话"，适合随机遭遇；
   * 布景是"你走到事发地点，看到那一幕正在发生"，主角站在场地中心朝着玩家，
   * 配角围在他周围（比如两个混混堵着姑娘）。
   */
  _stage(lead, spec) {
    const at = spec.stageAt;
    const p = this.getPlayerPos();
    const safe = (x, z) => (this.town?.resolveCollision ? this.town.resolveCollision(x, z, 0.6) : { x, z });

    // 主角站在场地中心稍偏玩家一侧，脸朝玩家
    const toP = Math.atan2(p.x - at.x, p.z - at.z);
    const ls = safe(at.x + Math.sin(toP) * 1.2, at.z + Math.cos(toP) * 1.2);
    lead.brain.takeOver?.({
      moveTo: { x: ls.x, z: ls.z },
      faceTarget: p,
      speedMul: 1.3,
      arriveDist: 0.9,
      immune: true,
    });
    if (lead.insideHome) lead.exitHome?.();
    else if (lead.insideRoom) lead.exitPlace?.();

    // 配角：围在主角两侧、背对玩家一点（"把人堵在墙角"的样子）
    const extras = this._pickExtras(spec, lead);
    const n = extras.length;
    extras.forEach((npc, i) => {
      // 在主角周围 1.6~2.2 米的弧上分布，偏向远离玩家的一侧
      const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.5;
      const ang = toP + Math.PI + spread;
      const r = 1.7 + (i % 2) * 0.4;
      const es = safe(ls.x + Math.sin(ang) * r, ls.z + Math.cos(ang) * r);
      npc.brain.takeOver?.({
        moveTo: { x: es.x, z: es.z },
        faceTarget: { x: ls.x, z: ls.z },   // 配角看着主角，不是看玩家
        speedMul: 1.3,
        arriveDist: 1.0,
        immune: true,
      });
      if (npc.insideHome) npc.exitHome?.();
      else if (npc.insideRoom) npc.exitPlace?.();
      this.active.extras.push(npc);
    });
  }

  /** 按 extraSpec 挑配角：优先同帮派 + 性别匹配，够不到就放宽 */
  _pickExtras(spec, lead) {
    const want = [];
    for (const e of (spec.extraSpec || [])) {
      for (let k = 0; k < (e.n || 1); k++) want.push(e);
    }
    if (!want.length) return [];
    const pool = (this.npcManager?.all || []).filter(
      (n) => n !== lead && this._available(n) && !n.brain?._perform
    );
    // 离场地近的优先（免得从镇子另一头飞过来）
    const at = spec.stageAt;
    pool.sort((a, b) =>
      Math.hypot(a.pos.x - at.x, a.pos.z - at.z) - Math.hypot(b.pos.x - at.x, b.pos.z - at.z)
    );
    const out = [];
    const used = new Set();
    for (const req of want) {
      // 三档放宽：帮派+性别 → 性别 → 任意
      let pick = pool.find((n) => !used.has(n) && this._matchGang(n, req.gang) && this._matchFemale(n, req.female));
      if (!pick) pick = pool.find((n) => !used.has(n) && this._matchFemale(n, req.female));
      if (!pick) pick = pool.find((n) => !used.has(n));
      if (!pick) break;
      used.add(pick);
      out.push(pick);
    }
    return out;
  }
  _matchGang(npc, gang) {
    if (!gang) return true;
    return (npc.personality?.gang || null) === gang;
  }
  _matchFemale(npc, female) {
    if (female == null) return true;
    return !!npc.female === !!female;
  }

  // ---- 阶段 1：选角 ----

  /**
   * 两级决策：规则预筛出 top3，再让 LLM 定选 + 判合理性 + 写开场白。
   * LLM 不可用/判不合理 → 规则第一名 + 剧本兜底台词。
   */
  async _cast(spec, venue) {
    // spec.jobs 可选：限制候选的职业（微型事件常用，避免牧师来谈送花）
    const jobs = spec.jobs && spec.jobs.length ? spec.jobs : null;
    let all = (this.npcManager?.all || []).filter((n) => this._available(n) && (!jobs || jobs.includes(n.personality?.job)));
    if (!all.length) return null;

    // 描写里写明了性别（"把个姑娘堵在巷口"）就必须照着选，
    // 否则会出现"描述是姑娘、来的是汉子"。真挑不出来再放宽。
    if (spec.requireFemale != null) {
      const matched = all.filter((n) => !!n.female === !!spec.requireFemale);
      if (matched.length) all = matched;
    }

    // 剧情指定的人优先（但仍要求他可用且不太远）
    if (spec.preferNpcId) {
      const want = all.find((n) => this._idOf(n) === spec.preferNpcId);
      if (want) return { npc: want, npcId: spec.preferNpcId, name: this._nameOf(want), opener: null };
    }

    // 布景模式：按"离场地近"挑，而不是按"离玩家近"（玩家就站在场地上，
    // 但 pickVenueCandidates 的场地判定依赖 venue 字符串，未必覆盖门口）
    if (spec.stageAt) {
      const at = spec.stageAt;
      const near = all
        .map((n) => ({ npc: n, d: Math.hypot(n.pos.x - at.x, n.pos.z - at.z) }))
        .sort((a, b) => a.d - b.d);
      if (near.length) {
        const n = near[0].npc;
        return { npc: n, npcId: this._idOf(n), name: this._nameOf(n), opener: null };
      }
    }

    const pool = pickVenueCandidates(all, venue, {
      jobOf: (n) => n.personality?.job,
      forceVenue: spec.forceVenue,
      playerPos: this.getPlayerPos(),
      posOf: (n) => n.pos,
    });
    if (!pool.length) return null;

    const top = pool.slice(0, 3);
    // 没接 LLM 或没意图描述 → 直接用规则第一名
    if (!this.glue?.castFor || !spec.intent) {
      const n = top[0].npc;
      return { npc: n, npcId: this._idOf(n), name: this._nameOf(n), opener: null };
    }

    try {
      const res = await this.glue.castFor({
        venue: venue || "街上",
        hour: this.getHour(),
        intent: spec.intent,
        candidates: top.map((c) => ({
          npcId: this._idOf(c.npc),
          name: this._nameOf(c.npc),
          job: c.npc.personality?.job,
          gang: c.npc.personality?.gang || null,
          affinity: c.score,
        })),
      });
      if (res && res.plausible === false) {
        // 模型认为这些人出现在这里都不合理 → 这次不投放，等玩家换场所
        return null;
      }
      const chosen = top.find((c) => this._idOf(c.npc) === res?.npcId) || top[0];
      return {
        npc: chosen.npc,
        npcId: this._idOf(chosen.npc),
        name: this._nameOf(chosen.npc),
        opener: res?.opener || null,
      };
    } catch {
      const n = top[0].npc;
      return { npc: n, npcId: this._idOf(n), name: this._nameOf(n), opener: null };
    }
  }

  _available(npc) {
    if (!npc?.alive || !npc.brain) return false;
    const s = npc.brain.state;
    if (s === "DOWN" || s === "FLEE" || s === "ANGRY") return false;
    if (npc.brain._perform) return false;      // 被剧场征召了
    if (npc.brain.isReporting) return false;   // 正跑去报官
    return true;
  }
  _idOf(npc) {
    const reg = this.npcRegistry?.findByDisplayName?.(npc.phone?.owner || "");
    return reg?.id || npc.phone?.id || npc.phone?.owner || null;
  }
  _nameOf(npc) { return npc.phone?.owner || npc.personality?.job || "镇民"; }

  // ---- 阶段 2：召唤 ----

  _summon(npc) {
    const p = this.getPlayerPos();
    // 走到玩家侧前方一点，别正面糊脸
    const ang = Math.random() * Math.PI * 2;
    const spot = { x: p.x + Math.cos(ang) * 2.0, z: p.z + Math.sin(ang) * 2.0 };
    const safe = this.town?.resolveCollision
      ? this.town.resolveCollision(spot.x, spot.z, 0.6)
      : spot;
    // 借剧场的接管通道：immune 让他不被恐慌广播冲散
    npc.brain.takeOver?.({
      moveTo: { x: safe.x, z: safe.z },
      faceTarget: p,
      speedMul: 1.15,
      arriveDist: 1.0,
      immune: true,
    });
    if (npc.insideHome) npc.exitHome?.();
    else if (npc.insideRoom) npc.exitPlace?.();
  }

  // ---- 每帧 ----

  update() {
    if (this.phase === Phase.IDLE || this.phase === Phase.DONE) return;
    const a = this.active;
    if (!a) { this._reset(); return; }

    // 演员没了（被打倒/死了）→ 取消
    if (!a.npc.alive || a.npc.brain?.state === "DOWN") {
      this.log(`（${a.name}出了事，这次没谈成）`);
      this._reset();
      return;
    }

    const p = this.getPlayerPos();
    const d = Math.hypot(a.npc.pos.x - p.x, a.npc.pos.z - p.z);
    // 玩家离开发起时的位置多远 —— 这才是"玩家走开了"的正确判据
    const drift = Math.hypot(p.x - a.anchor.x, p.z - a.anchor.z);

    if (this.phase === Phase.SUMMONING) {
      const timeout = this.now() - a.startedAt > SUMMON_TIMEOUT;
      if (d <= ARRIVE_DIST || a.npc.brain?.performArrived || timeout) {
        this.phase = Phase.READY;
        a.npc.brain.perform?.({ moveTo: null, faceTarget: p });
        // 布景模式：这一幕本来就在这儿发生，措辞不该是"走过来找你"
        this.hud?.toast?.(
          a.stageAt ? `❗ ${a.name}就在跟前（按 F）` : `❗ ${a.name}想跟你说件事（按 F）`,
          { key: "enc-ready", duration: 4000 }
        );
        this.log(a.stageAt ? `你看清了：${a.name}` : `${a.name}朝你走了过来`);
        return;
      }
      // 玩家自己走开了 → 放弃（注意判的是 drift 而非 d）
      if (drift > ABANDON_DIST) {
        this.log(`（你走开了，${a.name}没追上来）`);
        this._reset();
      }
      return;
    }

    if (this.phase === Phase.READY) {
      // 站着等；玩家走远就算了
      a.npc.brain.perform?.({ faceTarget: p });
      if (drift > ABANDON_DIST || d > ABANDON_DIST) {
        this.log(`（${a.name}等了一会儿，走开了）`);
        this._reset();
      }
    }
  }

  // ---- 阶段 4：交互（由 main 的 F 键交互转进来）----

  /** 玩家按 F 与等待中的 NPC 搭话 → 开弹窗 */
  engage() {
    if (this.phase !== Phase.READY || !this.active) return false;
    const a = this.active;
    this.phase = Phase.ENGAGED;
    // 谈事阶段：人已经到了、弹窗也开了，不再需要"走位接管"。
    // 立即归还日程（不是等 1200ms）—— 否则弹窗期间 _perform 还挂着，
    // think() 会一直走 takeOver 分支，玩家按 F 想继续聊也进不了对话状态，
    // 看起来就像 NPC 卡死了。
    a.npc.brain.release?.();
    this.ui.open({
      name: a.name,
      sub: a.title || "",
      npcId: a.npcId,
      beats: a.beats,
      choices: a.choices || [],
      allowDefer: a.allowDefer !== false,
    });
    return true;
  }

  // ---- 阶段 6：结算 ----

  /** EncounterUI 的 onChoice 回调转进来 */
  resolve(choiceId) {
    if (this.phase !== Phase.ENGAGED || !this.active) return;
    const a = this.active;
    this.phase = Phase.DONE;
    if (choiceId) {
      const c = (a.choices || []).find((x) => x.id === choiceId);
      this.log(`你选择了：${c?.label || choiceId}`);
    } else {
      this.log(`你说稍后再谈`);
    }
    try { this.onResolve(a, choiceId); } catch (e) { console.error("[Encounter] onResolve 出错", e); }
    // spec 级 onResolve（MicroEventSystem / StoryTree 各自的结算），与全局结算叠加
    if (a.onResolve) {
      try { a.onResolve(a, choiceId); } catch (e) { console.error("[Encounter] spec.onResolve 出错", e); }
    }
    // 谈完了：NPC 说句话，然后自己走开，回到日程
    const npc = a.npc;
    const line = choiceId
      ? pickFarewell(npc, a.choices?.find((x) => x.id === choiceId))
      : pick([
          "……那我改天再来找你。",
          "行，你忙你的，我晚点再来。",
          "那等你有空再说。我先走了。",
          "好，你先想清楚，回头我再来。",
        ]);
    npc.brain?.say?.(line, 2.8);
    const t = setTimeout(() => {
      if (npc.brain?._perform) npc.brain.release?.();
    }, 1200);
    this._timers.push(t);
    this._reset();
  }

  cancel() {
    if (!this.busy) return;
    this.active?.npc?.brain?.release?.();
    this._reset();
  }

  _reset() {
    for (const t of this._timers) clearTimeout(t);
    this._timers.length = 0;
    // 没走到 resolve 就被打断的，直接归还日程
    if (this.active?.npc?.brain?._perform && this.phase !== Phase.DONE) {
      this.active.npc.brain.release?.();
    }
    // 布景的配角一律归还（他们没有"演完"的概念，散场就该各回各处）
    for (const npc of (this.active?.extras || [])) {
      if (npc?.brain?._perform) npc.brain.release?.();
    }
    this.active = null;
    this.phase = Phase.IDLE;
  }
}

/** 遭遇谈完后的告别台词，按选择的后果轻重 + 对方性格分档 */
function pickFarewell(npc, choice) {
  const job = npc?.personality?.job || "";
  const bravery = npc?.personality?.bravery ?? 0.5;
  const risky = choice?.risk === "high" || choice?.risk === "neg";
  const pos = choice?.risk === "low" || choice?.risk === "pos";

  // 职业味的告别（比通用更拟真）
  const jobLines = {
    "酒保": ["这杯算我的，回头常来。", "慢走，下回来喝酒我给你留着好座。", "得，我去招呼别的客人了。"],
    "赌徒": ["成，赌桌上见。手气这种东西，说有就有。", "那我先回牌桌了，钱还等着赢回来呢。"],
    "牛仔": ["驾，那就这样，路上小心。", "行，改天请你喝一杯。马还在等我呢。"],
    "商人": ["好，生意人的话一诺千金。账目的事找我就行。", "那我回铺子算账了，回头谈。"],
    "医生": ["行了，我得回医馆了，还有病人等着。", "照顾好自己，别让我在医馆见到你。"],
    "牧师": ["愿主保佑你，孩子。", "我去做晚祷了，你有空来教堂坐坐。"],
    "铁匠": ["成，锤子还在炉子上呢。", "回铺子了，有刀剑要修随时找我。"],
    "马夫": ["好嘞，马棚那几匹还等着喂呢。", "那我回马厩了，明儿见。"],
    "记者": ["这事我能写进报纸吗？开玩笑的。回编辑部了。", "好，这素材够我写一版了。"],
    "歌女": ["那我上台了，回头听我唱啊。", "成，我去准备今晚的曲子。"],
    "赏金猎人": ["行，有悬赏的活计记得招呼我。", "我该去追那笔悬赏了，后会有期。"],
  };
  const jobPick = jobLines[job];
  if (jobPick && chance(0.6)) {
    return pick(jobPick);
  }

  if (risky) {
    return pick([
      "……那就说定了。回头见。",
      "行，这事我记下了。你也小心。",
      "好，我等你消息。",
      "干了这单，咱们可都别声张。",
      "成，这事就烂在你我肚子里。",
    ]);
  }
  if (pos) {
    // 看性格：胆大的爽快，胆小的多客套
    if (bravery > 0.6) {
      return pick([
        "爽快！就这么定了。",
        "成，有你这句话我就放心了。",
        "好，我先把事办了，回头找你。",
        "痛快！这事儿包我身上。",
      ]);
    }
    return pick([
      "谢谢……那我就放心了。",
      "成，谢谢你肯帮我。",
      "那我先去了，真的谢谢你。",
      "好，我记你这份情。",
    ]);
  }
  return pick([
    "嗯，我知道了。先走了。",
    "成，回头再说。",
    "行，那我先去忙了。",
    "得，话就到这儿，我走了。",
    "那就不耽误你了，回见。",
    "好，回头要是想起什么再说。",
  ]);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p) {
  return Math.random() < p;
}

export { Phase as EncounterPhase, venueAffinity };
