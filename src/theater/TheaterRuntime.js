// TheaterRuntime.js — 单场 AI 剧场的运行时
// 职责：把演员摆到位 → 按节拍播台词 → 玩家进区域给选项 → 自由输入走 AI 衔接 →
//       玩家一直不来就循环第一幕 → 超时/散场结算并放人回去上班。

import { THEATER_CONFIG } from "../config/theaterData.js";

const Phase = {
  GATHERING: "gathering", // 演员正在赶来
  PLAYING: "playing",     // 正常演出
  RESOLVING: "resolving", // 已进终局节点，播完就散
  DONE: "done",
};

export class TheaterRuntime {
  constructor(deps = {}) {
    this.tree = deps.tree;
    this.cast = deps.cast;           // [{roleId, npc, stageName, spot}]
    this.stage = deps.stage;
    this.glue = deps.glue;
    this.hooks = deps.hooks || {};   // { say, toast, log, onOutcome, onChoices, onEnd, playerPos }
    // 节拍走真实时间（气泡可读性由真实秒决定）；可注入便于无头仿真
    this.now = deps.now || (() => performance.now());

    this.phase = Phase.GATHERING;
    this.node = null;
    this.beatQueue = [];
    this.nodeEndAt = 0;
    this.waitingChoice = false;
    this.gluePending = false;
    this.resolving = false;          // 收束锁：进入后只许去终局
    this.startedAt = this.now();
    this.gatherDeadline = this.startedAt + THEATER_CONFIG.actorArriveTimeout * 1000;
    this.playerEverJoined = false;
    this.zoneLevel = "outside";      // outside | sense | interact
    this.deeds = new Set();          // 玩家举动：violent / robbed / kind
    this.idleLoopCursor = 0;
    this.nextIdleAt = 0;
    this._choicesShown = false;
    this._timers = [];                                  // 延迟放人的定时器，重复散场时清掉
    this.token = `sc${Math.random().toString(36).slice(2, 8)}${Date.now() % 100000}`;

    this._takeStage();
  }

  // ---- 生命周期 ----

  get active() {
    return this.phase !== Phase.DONE;
  }

  get currentNodeId() {
    return this.node?.id || null;
  }

  isActor(npc) {
    return this.cast.some((c) => c.npc === npc);
  }

  roleOf(npc) {
    return this.cast.find((c) => c.npc === npc)?.roleId || null;
  }

  memberOf(roleId) {
    return this.cast.find((c) => c.roleId === roleId) || null;
  }

  /** 让演员离开室内、走向舞台站位 */
  _takeStage() {
    for (const m of this.cast) {
      const npc = m.npc;
      // 先把人弄到室外，否则 NPC.update 会强制覆写 moveTo 为出口
      if (npc.insideHome && npc.exitHome) npc.exitHome();
      else if (npc.insideRoom && npc.exitPlace) npc.exitPlace();
      npc.brain.takeOver({
        moveTo: m.spot,
        faceTarget: this.stage.center,
        speedMul: 1.25,
        arriveDist: 0.9,
        immune: true,          // 演出中不被恐慌广播/挤撞打断
        sceneToken: this.token, // 场次令牌：防止上一场的延迟放人误伤这一场的演员
      });
    }
    this.hooks.log?.(`【${this.tree.title}】开演：${this.cast.map((c) => `${c.stageName}(${c.roleId})`).join("、")}`);
  }

  /** 演出结束：把演员放回日程 */
  disband(reason = "散场") {
    if (this.phase === Phase.DONE) return;
    this.phase = Phase.DONE;
    for (const m of this.cast) {
      const npc = m.npc;
      if (npc.brain?.performing) {
        // 先走开几步再恢复日程，避免原地瞬切
        npc.brain.perform({ moveTo: this.stage.exitSpot(), faceTarget: null, speedMul: 1.1 });
        const timer = setTimeout(() => {
          // 只放自己这场的人：若这个 NPC 已被下一场征召，令牌不同，不能动
          if (npc.brain?._perform?.sceneToken === this.token) npc.brain.release();
        }, 2500 + Math.random() * 1500);
        this._timers.push(timer);
      } else {
        npc.brain?.release?.();
      }
    }
    this._clearChoices();
    this.hooks.log?.(`【${this.tree.title}】${reason}，演员各自回去了`);
    this.hooks.onEnd?.(this);
  }

  /** 调试用：立刻放人，不走"走开几步再恢复"的 4 秒过渡 */
  forceRelease() {
    for (const t of this._timers) clearTimeout(t);
    this._timers.length = 0;
    this.phase = Phase.DONE;
    for (const m of this.cast) {
      if (m.npc.brain?._perform?.sceneToken === this.token) m.npc.brain.release();
    }
    this._clearChoices();
  }

  // ---- 每帧 ----

  update(dt, ctx) {
    if (this.phase === Phase.DONE) return;
    const now = this.now();
    const playerPos = ctx.playerPos;

    // 区域判定
    const dist = playerPos ? this.stage.distanceToCenter(playerPos) : 999;
    const level =
      dist <= THEATER_CONFIG.interactRadius ? "interact" : dist <= THEATER_CONFIG.senseRadius ? "sense" : "outside";
    if (level !== this.zoneLevel) {
      const from = this.zoneLevel;
      this.zoneLevel = level; // 必须先更新再回调：_renderChoices 会检查 zoneLevel
      this._onZoneChange(from, level);
    }
    if (level === "interact") this.playerEverJoined = true;

    // 演员就位
    if (this.phase === Phase.GATHERING) {
      const ready = this.cast.filter((m) => m.npc.brain?.performArrived).length;
      if (ready >= Math.min(2, this.cast.length) || now > this.gatherDeadline) {
        this.phase = Phase.PLAYING;
        this.gotoNode(this.tree.entryNode);
      }
      return;
    }

    // 到点强制散场（游戏时间）
    if (ctx.hour != null && ctx.hour >= THEATER_CONFIG.disbandHour && !this.resolving) {
      this._forceResolve("天色晚了");
    }

    // 玩家一直不来 → 到时限自行收场
    if (!this.playerEverJoined && !this.resolving && now - this.startedAt > this.tree.unattendedMs) {
      this._forceResolve("没人围观");
    }

    // 播到期节拍
    while (this.beatQueue.length && this.beatQueue[0].at <= now) {
      const { beat } = this.beatQueue.shift();
      this._playBeat(beat);
    }

    // 节拍播完 → 终局 / 出选项 / 自动跳 / 第一幕循环
    if (!this.beatQueue.length && !this.gluePending && now >= this.nodeEndAt && this.node) {
      const n = this.node;
      if (n.terminal) {
        this._finish(n);
      } else if (n.autoNext) {
        this.gotoNode(n.autoNext);
      } else if (n.choices && n.choices.length) {
        if (!this.waitingChoice) {
          this.waitingChoice = true;
          this._renderChoices();
        } else if (this.zoneLevel === "interact" && !this._choicesShown) {
          // 兜底：玩家中途走进来时补一次渲染，避免按钮永久隐身
          this._renderChoices();
        }
        // 玩家没来：循环第一幕，让戏一直在演
        if (!this.playerEverJoined && now >= this.nextIdleAt) {
          this._playIdleLoop(now);
        }
      }
    }

    // 演员被打出戏 / 倒地 → 剧场做群体反应并提前收场
    this._checkActorsLost();
  }

  _onZoneChange(from, to) {
    if (to === "interact") {
      // 进区域只提示"你已经在场"，剧情描述 hintOnEnter 在开演时已经说过一次了
      this.hooks.toast?.(`🎭 ${this.tree.title}`, { duration: 2600, key: "theater-enter" });
      if (this.waitingChoice) this._renderChoices();
    } else {
      this._clearChoices();
      if (to === "sense") {
        this.hooks.toast?.("🎭 那边街上起了热闹……", { side: true, key: "theater-sense", duration: 3200 });
      }
    }
  }

  /** 第一幕循环：玩家没来时反复播补充节拍 */
  _playIdleLoop(now) {
    const loop = this.tree.idleLoop || [];
    if (!loop.length) {
      this.nextIdleAt = now + 12000;
      return;
    }
    const beat = loop[this.idleLoopCursor % loop.length];
    this.idleLoopCursor++;
    this._playBeat(beat);
    this.nextIdleAt = now + 7000 + Math.random() * 5000;
  }

  // ---- 节点与节拍 ----

  gotoNode(nodeId) {
    if (this.phase === Phase.DONE) return;
    let node = this.tree.nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.warn("[theater] 节点不存在:", nodeId);
      return;
    }
    // 收束锁：已在收场阶段，任何跳转只能去终局
    if (this.resolving && !node.terminal) {
      node = this.tree.nodes.find((n) => n.id === this.tree.timeoutNode) || node;
    }
    // 玩家举动覆盖终局（偷了/动手了，就别给好结局）
    if (node.terminal) {
      const override = this._deedOverride(node);
      if (override) node = override;
    }
    this.node = node;
    this.waitingChoice = false;
    this._clearChoices();
    this._scheduleBeats(node);
  }

  _deedOverride(node) {
    if (!this.deeds.size) return null;
    const ids = this.tree.nodes;
    const pickById = (id) => ids.find((n) => n.id === id && n.terminal);
    if (this.deeds.has("violent")) {
      const bloody = pickById("e_brutal") || pickById("e_chaos") || pickById("e_shootout");
      if (bloody && bloody.id !== node.id) return bloody;
    }
    if (this.deeds.has("robbed")) {
      const greedy = pickById("e_dark") || pickById("e_loot") || pickById("e_greed");
      if (greedy && greedy.id !== node.id) return greedy;
    }
    return null;
  }

  _scheduleBeats(node) {
    const now = this.now();
    const jitter = THEATER_CONFIG.beatJitterMs;
    this.beatQueue = (node.beats || [])
      .map((b) => ({ beat: b, at: now + (b.delayMs ?? 900) + Math.random() * jitter }))
      .sort((a, b) => a.at - b.at);
    const last = this.beatQueue.length ? this.beatQueue[this.beatQueue.length - 1].at : now;
    this.nodeEndAt = last + 1200;
  }

  _playBeat(beat) {
    const m = this.memberOf(beat.speaker);
    if (!m) return;
    const npc = m.npc;
    if (!npc.alive || npc.brain?.state === "DOWN") return;
    if (beat.moveTo) npc.brain.perform?.({ moveTo: beat.moveTo });
    if (beat.facePlayer && this.hooks.playerPos) {
      npc.brain.perform?.({ faceTarget: this.hooks.playerPos() });
    }
    if (beat.text) {
      const dur = beat.mood === "angry" || beat.mood === "scared" ? 3.2 : 2.8;
      npc.brain.say(beat.text.slice(0, THEATER_CONFIG.maxBubbleChars), dur);
      if (beat.mood === "angry" || beat.mood === "scared") npc.brain.emotion = 0.8;
      // 情绪表现：emoji + 抖一下身子。beat 可以显式写 emoji/shake 覆盖默认映射
      this.hooks.moodFx?.(npc, beat.mood, beat.emoji, beat.shake);
      this.hooks.log?.(`${m.stageName}：${beat.text}`);
    }
  }

  _clearChoices() {
    this._choicesShown = false;
    this.hooks.onChoices?.([], "");
  }

  _renderChoices() {
    if (this.zoneLevel !== "interact" || !this.node?.choices) return;
    this._choicesShown = true;
    this.hooks.onChoices?.(
      this.node.choices.map((c) => ({
        id: c.id,
        label: c.label,
        icon: c.icon || "▶",
        risk: c.risk || "medium",
      })),
      // 只用当前节点自己的提示；开场那句 hintOnEnter 已经在开演时提示过了，
      // 进了事件区域还一直挂在输入框上方很占地方
      this.node.hint || ""
    );
  }

  // ---- 玩家介入 ----

  /** 点了事件选项 */
  handleChoice(choiceId) {
    if (!this.node || !this.waitingChoice) return null;
    const choice = this.node.choices?.find((c) => c.id === choiceId);
    if (!choice) return null;
    this.waitingChoice = false;
    this._clearChoices();
    // 玩家自己也要开口，说的是情景台词而不是按钮上的干巴巴标签
    const spoken = choice.line || choice.label;
    this.hooks.playerSay?.(spoken);
    this.hooks.log?.(`你：${spoken}`);
    if (choice.effects) this.hooks.onEffects?.(choice.effects);
    this.gotoNode(choice.next);
    return choice;
  }

  /** 自由输入：AI 衔接 → 跳节点 */
  async handleFreeText(text) {
    if (this.phase === Phase.DONE || this.gluePending) return;
    const t = String(text).trim();
    if (!t) return;
    this.hooks.playerSay?.(t); // 自由输入同样让玩家冒泡，别只有 NPC 在说话
    this.hooks.log?.(`你：${t}`);
    // 记录举动，影响结局
    if (/杀|砍|打死|开枪|揍|打他/.test(t)) this.deeds.add("violent");
    if (/抢|偷|拿走|归我|分我/.test(t)) this.deeds.add("robbed");

    if (this.resolving) {
      this.gotoNode(this.tree.timeoutNode);
      return;
    }

    this.gluePending = true;
    this._clearChoices();
    // LLM 往往要 3-7 秒，必须给出"他们在琢磨你的话"的反馈，否则像卡住了
    this.hooks.onPending?.(true);
    // 等待时让最近的演员转头看玩家
    const near = this.cast[0];
    if (near && this.hooks.playerPos) near.npc.brain.perform?.({ faceTarget: this.hooks.playerPos() });

    let result;
    try {
      result = await this.glue.glue({ tree: this.tree, node: this.node, cast: this.cast, text: t });
    } catch (e) {
      result = this.glue.ruleGlue({ tree: this.tree, node: this.node, cast: this.cast, text: t });
    }
    this.hooks.onPending?.(false);
    if (this.phase === Phase.DONE) return; // 等待期间散场了就别再演了

    // 播衔接台词（陆续开口），并执行 LLM 给这句话配的行为
    let delay = 350;
    for (const b of result.bridge) {
      const m = this.memberOf(b.roleId);
      if (!m) continue;
      const text2 = b.text;
      const act = b.action;
      setTimeout(() => {
        if (this.phase === Phase.DONE) return;
        m.npc.brain.say(text2.slice(0, THEATER_CONFIG.maxBubbleChars), 3);
        this.hooks.log?.(`${m.stageName}：${text2}`);
        if (act && act.action && act.action !== "none") {
          // 演员真的动起来（打人/逃跑/给钱…）；行为会让他脱离演出，剧场随后自然收场
          const done = this.hooks.npcAction?.(m.npc, act, this.cast.map((c) => c.npc));
          if (done?.ok) this.hooks.log?.(`（${m.stageName} ${done.detail}）`);
        }
      }, delay);
      delay += 1100 + Math.random() * 900;
    }

    setTimeout(() => {
      this.gluePending = false;
      if (this.phase === Phase.DONE) return;
      this.gotoNode(result.targetNodeId);
    }, delay + 400);
  }

  /** 玩家对某个演员动手了（由 Combat 的 onNpcKnocked / 打击回调转进来） */
  notifyActorHit(npc, knocked) {
    const role = this.roleOf(npc);
    if (!role) return;
    this.deeds.add("violent");
    this.hooks.log?.(`你对${this.memberOf(role).stageName}动了手`);
    if (knocked) {
      this.hooks.log?.(`${this.memberOf(role).stageName}倒下了，全场哗然`);
      this._forceResolve("出了人命");
      return;
    }
    // 其他演员的分人反应：一人劝阻、一人吓退
    const others = this.cast.filter((c) => c.roleId !== role && c.npc.alive);
    others.slice(0, 2).forEach((m, i) => {
      setTimeout(() => {
        if (this.phase === Phase.DONE) return;
        const line = i === 0 ? "住手！你想上绞架吗？" : "疯子！快躲开！";
        m.npc.brain.say(line, 3);
        this.hooks.log?.(`${m.stageName}：${line}`);
      }, 500 + i * 1200);
    });
  }

  /** 演员脱戏/倒地检测 */
  _checkActorsLost() {
    if (this.resolving) return;
    const lost = this.cast.filter((m) => !m.npc.alive || m.npc.brain?._brokeCharacter || !m.npc.brain?.performing);
    // 核心角色掉了两个以上就演不下去
    if (lost.length >= 2) this._forceResolve("演员散了");
  }

  _forceResolve(reason) {
    if (this.resolving) return;
    this.resolving = true;
    this.waitingChoice = false;
    this._clearChoices();
    this.hooks.log?.(`【${this.tree.title}】${reason}，收场`);
    this.gotoNode(this.tree.timeoutNode);
  }

  _finish(node) {
    if (this.phase === Phase.RESOLVING) return;
    this.phase = Phase.RESOLVING;
    const oc = node.outcome;
    if (oc) {
      this.hooks.onOutcome?.(oc, { playerJoined: this.playerEverJoined, tree: this.tree });
      this.hooks.log?.(`【结局】${oc.title}`);
    }
    setTimeout(() => this.disband("演完"), 3200);
  }
}
