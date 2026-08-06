// TheaterDirector.js — AI 剧场总控
// 职责：每天 9:00-12:00 之间挑一场戏在镇中心大街开演；从镇上 NPC 里选角；
//       玩家没来就循环第一幕；天黑或演完就散场、演员回去上班；结算荣誉/现金/通缉。

import { THEATER_TREES, THEATER_CONFIG } from "../config/theaterData.js";
import { StageMap } from "./StageMap.js";
import { Casting } from "./Casting.js";
import { TheaterGlue, GlueBudget } from "./TheaterGlue.js";
import { TheaterRuntime } from "./TheaterRuntime.js";
import { TheaterAftermath } from "./TheaterAftermath.js";
import { attachTheaterConsequences } from "./attachConsequences.js";

export class TheaterDirector {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.town = deps.town;
    this.hud = deps.hud;
    this.sky = deps.sky;
    this.worldClock = deps.worldClock;
    this.reputation = deps.reputation;
    this.economy = deps.economy;
    this.newspaper = deps.newspaper;
    this.eventLog = deps.eventLog;
    this.ui = deps.ui || null; // TheaterUI
    this.playerSay = deps.playerSay || null; // 玩家冒泡（由 main.js 的 showPlayerBubble 提供）
    this.npcAction = deps.npcAction || null; // 执行 LLM 给演员配的行为（NpcActionExecutor）
    this.now = deps.now || (() => performance.now()); // 可注入时钟，便于无头仿真

    this.stage = new StageMap(this.town);
    this.aftermath = deps.aftermath || null; // 事件后续影响（报纸/来信/遗留物）
    this.consequences = deps.consequences || null; // P8 后果包（势力/延迟揭示/回报/解锁）
    // 把后果包挂到结局节点上（幂等，静态树数据保持纯净）
    attachTheaterConsequences(THEATER_TREES);
    this.casting = new Casting({ npcManager: this.npcManager, stage: this.stage });
    // 配额用 GlueBudget 的默认值（20/分钟 + 400ms 冷却），别在这里写死覆盖掉
    this.glue = new TheaterGlue({ budget: new GlueBudget(), onReport: deps.onAiReport || null });

    this.scene = null;            // 当前 TheaterRuntime
    this.log = [];                // 叙事纪实（中文文本）
    this.lastPlayedDay = 0;       // 上次开演是第几天
    this.todayTriggerHour = this._rollTriggerHour();
    this._prevHour = this.sky?.hour ?? 8;
    this.failedAttempts = 0;

    // 跨日：新的一天重置触发时刻
    this.worldClock?.on?.("dayStart", () => {
      this.todayTriggerHour = this._rollTriggerHour();
      this.failedAttempts = 0;
    });
    // 睡觉/天黑：强制散场
    this.worldClock?.on?.("sleep", () => this.scene?.disband("入夜"));
  }

  _rollTriggerHour() {
    const { windowStart, windowEnd } = THEATER_CONFIG;
    return windowStart + Math.random() * Math.max(0.1, windowEnd - windowStart - 0.2);
  }

  get active() {
    return !!(this.scene && this.scene.active);
  }

  get currentTree() {
    return this.scene?.tree || null;
  }

  /** 主循环：注册成独立 engine.onUpdate，避免被室内分支 return 掉 */
  update(dt, ctx = {}) {
    const hour = ctx.hour ?? this.sky?.hour ?? 12;
    const day = ctx.day ?? this.worldClock?.day ?? 1;

    // 到点开演（边沿判定，处理跨 24 点环绕）
    const crossed = this._prevHour <= this.todayTriggerHour && hour > this.todayTriggerHour;
    this._prevHour = hour;
    if (!this.active && crossed && this.lastPlayedDay !== day && hour < THEATER_CONFIG.windowEnd) {
      this.startShow(day);
    }

    if (this.scene) {
      this.scene.update(dt, { playerPos: ctx.playerPos, hour, day });
      this._muteAmbient(dt);
      if (!this.scene.active) this.scene = null;
    }
  }

  /**
   * 事件进行中，舞台附近的围观群众静音：不再各自跟玩家寒暄。
   * 否则"日安，先生"这类冒泡会盖掉正在演的戏。
   */
  _muteAmbient(dt) {
    this._muteTimer = (this._muteTimer || 0) - dt;
    if (this._muteTimer > 0) return;
    this._muteTimer = 0.5;
    const r = THEATER_CONFIG.senseRadius;
    const c = this.stage.center;
    const muted = this._mutedNpcs || (this._mutedNpcs = new Set());
    // 先放开已经走远的
    for (const npc of muted) {
      if (Math.hypot(npc.pos.x - c.x, npc.pos.z - c.z) > r + 4) {
        npc.brain._ambientMuted = false;
        muted.delete(npc);
      }
    }
    for (const npc of this.npcManager?.all || []) {
      if (Math.hypot(npc.pos.x - c.x, npc.pos.z - c.z) <= r) {
        npc.brain._ambientMuted = true;
        muted.add(npc);
      }
    }
  }

  _unmuteAll() {
    for (const npc of this._mutedNpcs || []) npc.brain._ambientMuted = false;
    this._mutedNpcs?.clear();
  }

  /** 开一场戏（可指定剧本 id，调试用） */
  startShow(day = this.worldClock?.day ?? 1, treeId = null) {
    if (this.active) return false;
    // 第一天固定演三角恋——这出戏冲击感最强，适合当玩家的第一场
    let tree;
    if (treeId) tree = THEATER_TREES.find((t) => t.id === treeId);
    else if (day === 1) tree = THEATER_TREES.find((t) => t.id === "saloon_triangle");
    if (!tree) tree = THEATER_TREES[Math.floor(Math.random() * THEATER_TREES.length)];
    if (!tree) return false;

    const cast = this.casting.cast(tree);
    if (!cast) {
      this.failedAttempts++;
      this._addLog(`【${tree.title}】今天凑不齐角色，改天再演`);
      // 稍后再试（把触发时刻推后 20 分钟游戏时间）
      if (this.failedAttempts < 4) this.todayTriggerHour = Math.min(THEATER_CONFIG.windowEnd - 0.2, this.todayTriggerHour + 0.33);
      return false;
    }

    this.lastPlayedDay = day;
    this.scene = new TheaterRuntime({
      tree,
      cast,
      stage: this.stage,
      glue: this.glue,
      now: this.now,
      hooks: {
        toast: (text, opts) => this.hud?.toast?.(text, opts),
        log: (text) => this._addLog(text),
        playerPos: () => this._playerPos,
        onChoices: (choices, hint) => this.ui?.setChoices?.(choices, hint),
        onPending: (on) => this.ui?.setPending?.(on),
        playerSay: (text) => this.playerSay?.(text),
        npcAction: (npc, action, candidates) => this.npcAction?.(npc, action, candidates),
        moodFx: (npc, mood, emoji, shake) => this.moodFx?.(npc, mood, emoji, shake),
        onOutcome: (oc, meta) => this._applyOutcome(oc, meta),
        onEffects: (fx) => this._applyEffects(fx),
        onEnd: () => {
          this.ui?.setChoices?.([], "");
          this.ui?.setEventActive?.(false);
          this._unmuteAll(); // 散场后恢复围观群众的日常寒暄
        },
      },
    });
    this.ui?.setEventActive?.(true, tree.title);
    // 开演时把舞台附近的报官意图清掉：一场戏刚起来就有人往警局跑，
    // 头顶还挂着 🚨 站在台上，很出戏
    for (const npc of this.npcManager?.all || []) {
      if (!npc.brain?.isReporting) continue;
      if (this.stage.distanceToCenter(npc.pos) > THEATER_CONFIG.senseRadius) continue;
      npc.brain.cancelReport();
    }
    this.hud?.toast?.(`🎭 镇中心大街上出事了：${tree.title}`, { duration: 5000, key: "theater-start" });
    this._addLog(`——— 第 ${day} 天 ${this._fmtHour(this.sky?.hour ?? 9)} 《${tree.title}》 ———`);
    return true;
  }

  /** 玩家自由输入（UI 调进来） */
  submitFreeText(text) {
    if (!this.active) return false;
    if (this.scene.zoneLevel !== "interact") {
      this.hud?.toast?.("你离得太远，他们听不见", { side: true, key: "theater-far" });
      return false;
    }
    this.scene.handleFreeText(text);
    return true;
  }

  /** 玩家打开/关闭输入框：打字期间剧场不自动推进、不播循环气泡 */
  setPlayerTyping(on) {
    if (this.scene) this.scene.playerTyping = !!on;
  }

  /** 玩家点事件选项（UI 调进来） */
  submitChoice(choiceId) {
    if (!this.active) return false;
    return !!this.scene.handleChoice(choiceId);
  }

  /** 玩家撞到了演员 */
  notifyNpcBumped(npc) { if (this.active) this.scene.notifyActorBumped(npc); }

  /** 玩家偷了演员 */
  notifyNpcStolen(npc) { if (this.active) this.scene.notifyActorStolen(npc); }

  /** 玩家打了某个 NPC（main.js 的 onNpcKnocked / 攻击处转进来） */
  notifyNpcHit(npc, knocked = false) {
    if (!this.active) return;
    this.scene.notifyActorHit(npc, knocked);
  }

  /** 玩家举枪瞄着某个 NPC（main.js 的瞄准扫描转进来） */
  notifyNpcAimed(npc, kind) {
    if (!this.active) return;
    this.scene.notifyActorAimed(npc, kind);
  }

  /** 这个 NPC 是当前剧场演员吗（给 InteractionSystem 加按钮用） */
  isActor(npc) {
    return !!(this.active && this.scene.isActor(npc));
  }

  actorRole(npc) {
    return this.active ? this.scene.roleOf(npc) : null;
  }


  set playerPos(p) {
    this._playerPos = p;
  }

  get playerPos() {
    return this._playerPos;
  }

  // ---- 结算 ----

  _applyEffects(fx) {
    if (!fx) return;
    if (fx.cash) {
      this.economy?.addMoney?.(fx.cash);
      this.hud?.toast?.(`${fx.cash > 0 ? "+" : ""}${fx.cash} 现金`, { side: true, key: "theater-cash" });
    }
    if (fx.honor) {
      this.reputation?.addHonor?.(fx.honor);
      this.hud?.toast?.(`荣誉 ${fx.honor > 0 ? "+" : ""}${fx.honor}`, { side: true, key: "theater-honor" });
    }
    if (fx.wanted) this.reputation?.addCrimeWanted?.(fx.wanted);
  }

  _applyOutcome(oc, meta = {}) {
    this._applyEffects({ cash: oc.cash, honor: oc.honor, wanted: oc.wanted });
    // 只用中间的结局横幅，不再额外发 toast（否则同一句话屏幕上出现两遍）
    this.ui?.showOutcome?.(oc);
    const lines = (oc.lines || []).join("；");
    this._addLog(`【结局】${oc.title}${lines ? " —— " + lines : ""}`);
    // 让这次选择在散场后仍然留下痕迹：报纸 / 来信 / 可摸到的遗留物
    if (this.aftermath) {
      const done = this.aftermath.apply(oc, {
        tree: meta.tree || this.currentTree,
        cast: this.scene?.cast,
        playerChoices: this.scene?.playerChoices || [],
      });
      if (done.news || done.message || done.item) {
        this._addLog(`（留下后续：${[done.news && "报纸", done.message && "来信", done.item && "遗留物"].filter(Boolean).join("、")}）`);
      }
    }
    // P8 后果包：结构性后果（势力/延迟揭示/延迟回报/解锁），喂给 Nemesis 层
    if (this.consequences) {
      const csDone = this.consequences.apply(oc, {
        treeId: meta.tree?.id || this.currentTree?.id,
        outcomeId: oc.id || oc.title,
        cast: this.scene?.cast,
      });
      if (csDone.scheduled > 0) {
        this._addLog(`（${csDone.scheduled} 条后果在酝酿：迟来的真相 / 人情回报）`);
      }
    }
    if (oc.rumor && this.newspaper?.publish) {
      try {
        this.newspaper.publish(oc.rumor, { job: meta.tree?.title || "街头事件" });
      } catch (e) { /* 报纸类型不匹配时忽略 */ }
    }
    if (this.eventLog?.record) {
      try {
        this.eventLog.record({
          type: "theater",
          actors: this.scene?.cast.map((c) => c.stageName) || [],
          location: "镇中心大街",
          facts: [oc.title, ...(oc.lines || [])],
          visibility: "public",
          tags: ["ai剧场", meta.tree?.id || ""],
        });
      } catch (e) { /* eventLog 结构不匹配时忽略 */ }
    }
  }

  // ---- 叙事纪实 ----

  _addLog(text) {
    this.log.push({ at: Date.now(), text });
    if (this.log.length > 80) this.log.shift();
    this.ui?.appendLog?.(text);
  }

  recentLog(n = 25) {
    return this.log.slice(-n);
  }

  _fmtHour(h) {
    const hh = Math.floor(h) % 24;
    const mm = Math.floor((h - Math.floor(h)) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  // ---- 调试 ----

  debugStart(treeId) {
    // 立刻放人（不等 4 秒走开过渡），否则选角会因为旧演员还被锁着而凑不齐
    this.scene?.forceRelease();
    this.scene = null;
    this.ui?.setEventActive?.(false);
    this.lastPlayedDay = -1; // 允许同一天反复开演
    return this.startShow(this.worldClock?.day ?? 1, treeId || null);
  }

  debugStatus() {
    return {
      active: this.active,
      tree: this.currentTree?.title || null,
      node: this.scene?.currentNodeId || null,
      phase: this.scene?.phase || null,
      zone: this.scene?.zoneLevel || null,
      playerJoined: this.scene?.playerEverJoined || false,
      cast: this.scene?.cast.map((c) => `${c.roleId}=${c.stageName}`) || [],
      todayTriggerHour: this.todayTriggerHour.toFixed(2),
      lastPlayedDay: this.lastPlayedDay,
      glueVia: this.glue.lastVia,
      glueReason: this.glue.lastReason,
      glueMs: this.glue.lastMs,
    };
  }
}
