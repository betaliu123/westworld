// TheaterRuntime.js — 单场 AI 剧场的运行时
// 职责：把演员摆到位 → 按节拍播台词 → 玩家进区域给选项 → 自由输入走 AI 衔接 →
//       玩家一直不来就循环第一幕 → 超时/散场结算并放人回去上班。

import { THEATER_CONFIG } from "../config/theaterData.js";
import { IDLE_BY_NODE, WITNESS_ON } from "../config/theaterIdle.js";
import { REACT_BY_NODE } from "../config/theaterReactByNode.js";

/** 从数组里随机取一条 */
function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
    this.playerChoices = []; // 玩家在事件中点过的选项（用于结局的碎片化叙事）
    this.elapsedGameHours = 0; // 开演至今经过的游戏小时（总时长上限用它，不看绝对钟点）
    this.actGameHours = 0;     // 当前这一幕已经演了多少游戏小时（围观自动推进用）

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

    // 事件总时长以"开演那一刻"起算，用累计游戏小时衡量（不看绝对钟点，
    // 也不受午夜回绕影响）。以前写死"到 18 点就散场"，导致傍晚手动开演的
    // 第一帧就满足条件，直接跳最后一幕。
    if (ctx.hour != null) {
      this.elapsedGameHours += dt * (24 / THEATER_CONFIG.realSecondsPerDay);
    }
    if (this.elapsedGameHours > THEATER_CONFIG.maxDurationHours && !this.resolving) {
      this._forceResolve("这场戏演够久了");
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
        // 僵持中的碎语：不管玩家在不在场都继续演，别站着一声不吭
        if (now >= this.nextIdleAt) {
          this._playIdleLoop(now);
        }
        // 玩家围观但一直不选 → 演够一幕的时长就自己往下走（走"旁观"那条）
        this.actGameHours += dt * (24 / THEATER_CONFIG.realSecondsPerDay);
        if (this.actGameHours >= THEATER_CONFIG.actMaxGameHours) {
          const fallback = n.choices[n.choices.length - 1]; // 末位通常是旁观/不介入
          this.hooks.log?.(`（你没表态，事情自己往下走了）`);
          this.waitingChoice = false;
          this._clearChoices();
          this.gotoNode(fallback.next);
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

  /**
   * 僵持碎语：优先播"这一幕专属"的循环气泡（IDLE_BY_NODE），
   * 没有就退回全剧通用的 tree.idleLoop。
   */
  _playIdleLoop(now) {
    const perNode = IDLE_BY_NODE[`${this.tree.id}/${this.node?.id}`];
    const loop = (perNode && perNode.length ? perNode : this.tree.idleLoop) || [];
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
    this.actGameHours = 0; // 新的一幕，重新计时（围观自动推进用）
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
    // 开口说话时朝向：玩家就在场（交互区内）就转过来对着你说，
    // 而不是背对着你原地冒泡。玩家不在场才按剧本朝舞台中心。
    const playerHere = this.zoneLevel === "interact" && this.hooks.playerPos;
    if (beat.facePlayer && this.hooks.playerPos) {
      npc.brain.perform?.({ faceTarget: this.hooks.playerPos() });
    } else if (playerHere && beat.text) {
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
    // 记下玩家在关键节点的选择，供结局的报纸/来信写出"你做了什么"
    this.playerChoices.push({ nodeId: this.node.id, line: spoken });
    if (this.playerChoices.length > 6) this.playerChoices.shift();
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
        this._faceMe(m.npc); // 回应你说的话，当然要看着你
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
    const me = this.memberOf(role);
    this.hooks.log?.(`你对${me.stageName}动了手`);
    // 按剧本给这个角色配的"被打反应"说话（每个事件每个角色的反应都不一样）
    this._playReaction("hit", role, npc);
    if (knocked) {
      this.hooks.log?.(`${me.stageName}倒下了，全场哗然`);
      this._reactCrowd("shocked", role);
      this._forceResolve("出了人命");
      return;
    }
    // 其他演员的分人反应：优先用"针对被打的是谁"定制的台词
    // （打女人、打牧师、打伤员，旁人喊的话应该明显不同）
    const others = this.cast.filter((c) => c.roleId !== role && c.npc.alive);
    others.slice(0, 2).forEach((m, i) => {
      setTimeout(() => {
        if (this.phase === Phase.DONE) return;
        const line = this._witnessOnLine(role, m.roleId)
          || this._reactionLine("witness", m.roleId)
          || (i === 0 ? "住手！你想上绞架吗？" : "疯子！快躲开！");
        this._faceMe(m.npc); // 议论玩家的行为时看着玩家
        m.npc.brain.say(line, 3);
        this.hooks.moodFx?.(m.npc, i === 0 ? "angry" : "scared");
        this.hooks.log?.(`${m.stageName}：${line}`);
      }, 500 + i * 1200);
    });
  }

  /**
   * 取"看见玩家打了 victimRole 时，speakerRole 会喊什么"。
   * 优先级：本幕专属（演到哪一幕说的话不一样）→ 按被打对象 → null（上层再退回通用）
   */
  _witnessOnLine(victimRole, speakerRole) {
    const byNode = REACT_BY_NODE[`${this.tree.id}/${this.node?.id}`]?.[victimRole]?.witness?.[speakerRole];
    if (byNode && byNode.length) return pickOne(byNode);
    const pool = WITNESS_ON[this.tree.id]?.[victimRole]?.[speakerRole];
    if (!pool || !pool.length) return null;
    return pickOne(pool);
  }

  /** 取被打者自己喊的话：本幕专属优先，再退回全剧通用的 reactions.hit */
  _hitLineOf(victimRole) {
    const byNode = REACT_BY_NODE[`${this.tree.id}/${this.node?.id}`]?.[victimRole]?.hit;
    if (byNode && byNode.length) return pickOne(byNode);
    return this._reactionLine("hit", victimRole);
  }

  /** 玩家撞到了演员 */
  notifyActorBumped(npc) {
    const role = this.roleOf(npc);
    if (!role) return;
    const now = this.now();
    if (now - (this._lastBumpAt || 0) < 2500) return; // 别一直撞一直说
    this._lastBumpAt = now;
    this._playReaction("bump", role, npc);
  }

  /** 玩家偷了演员 */
  notifyActorStolen(npc) {
    const role = this.roleOf(npc);
    if (!role) return;
    this.deeds.add("robbed");
    this._playReaction("steal", role, npc);
  }

  /** 取剧本里为"某角色 + 某种玩家行为"写的反应台词 */
  _reactionLine(kind, roleId) {
    const table = this.tree.reactions?.[kind];
    if (!table) return null;
    const pool = table[roleId] || table.any;
    if (!pool || !pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** 让某个演员转过来面对玩家（玩家在场才转） */
  _faceMe(npc) {
    if (!npc?.brain || !this.hooks.playerPos) return;
    if (this.zoneLevel === "outside") return;
    npc.brain.perform?.({ faceTarget: this.hooks.playerPos() });
  }

  _playReaction(kind, roleId, npc) {
    const m = this.memberOf(roleId);
    if (!m || !npc.alive) return;
    // 对玩家的行为做反应时，一定要转过来看着玩家
    this._faceMe(npc);
    // 被打的话走"本幕专属优先"，其它（撞/偷）走全剧通用
    const line = kind === "hit" ? this._hitLineOf(roleId) : this._reactionLine(kind, roleId);
    const mood = kind === "hit" ? "pain" : kind === "steal" ? "angry" : "shocked";
    if (line) {
      npc.brain.say(line.slice(0, THEATER_CONFIG.maxBubbleChars), 3);
      this.hooks.log?.(`${m.stageName}：${line}`);
    }
    this.hooks.moodFx?.(npc, mood);
  }

  /** 全场群众反应（震惊时集体反应；emoji 只挑前两个冒，避免一堆表情同时糊屏） */
  _reactCrowd(mood, exceptRole) {
    let emoGiven = 0;
    this.cast.forEach((m, i) => {
      if (m.roleId === exceptRole || !m.npc.alive) return;
      const giveEmoji = emoGiven < 2; // 限流器还会再卡一道
      emoGiven++;
      setTimeout(() => {
        if (this.phase === Phase.DONE) return;
        if (giveEmoji) this.hooks.moodFx?.(m.npc, mood);
        else m.npc.shakeFor?.(0.5, 0.16); // 没轮到表情的只抖一下
      }, i * 140);
    });
  }

  /** 演员脱戏/倒地检测 */
  /** 演员脱戏/倒地检测 */
  _checkActorsLost() {
    if (this.resolving) return;
    // 倒地的人也算"演不下去"：以前只看 alive 和 performing，被击倒的人 alive 仍是 true、
    // _perform 也还挂着，于是"人倒在地上，旁边的人照着剧本继续念台词"，很滑稽。
    const isDown = (m) => !m.npc.alive || m.npc.brain?.state === "DOWN";
    const downCount = this.cast.filter(isDown).length;
    const lost = this.cast.filter(
      (m) => isDown(m) || m.npc.brain?._brokeCharacter || !m.npc.brain?.performing
    );

    // 只要有主要角色（非群众）倒地，这场戏就没法按剧本走了 —— 立刻收场
    const mainDown = this.cast.some((m) => m.roleId !== "crowd" && isDown(m));
    if (mainDown) {
      this._reactToCorpseOnStage();
      this._forceResolve("台上出了人命");
      return;
    }
    if (downCount >= 1 || lost.length >= 2) {
      this._forceResolve("演员散了");
    }
  }

  /** 台上有人倒下：还站着的人围过来惊呼，而不是继续念原来的台词 */
  _reactToCorpseOnStage() {
    const victim = this.cast.find((m) => !m.npc.alive || m.npc.brain?.state === "DOWN");
    const standing = this.cast.filter(
      (m) => m !== victim && m.npc.alive && m.npc.brain?.state !== "DOWN"
    );
    standing.slice(0, 3).forEach((m, i) => {
      setTimeout(() => {
        if (this.phase === Phase.DONE) return;
        // 优先用剧本为"这个人被打"写的见证台词，取不到用通用惊呼
        const line =
          (victim && this._witnessOnLine(victim.roleId, m.roleId)) ||
          this._reactionLine("witness", m.roleId) ||
          ["天啊，他倒下了！", "有人死了！叫警长！", "别过来，别碰他！"][i % 3];
        this._faceMe(m.npc); // 围过来看倒地的人时也面向玩家
        m.npc.brain.say(line, 3.2);
        this.hooks.moodFx?.(m.npc, i === 0 ? "shocked" : "scared");
        this.hooks.log?.(`${m.stageName}：${line}`);
      }, 300 + i * 900);
    });
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
