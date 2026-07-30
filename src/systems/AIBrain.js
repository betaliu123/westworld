// AIBrain.js — NPC 决策核心：性格 + 需求/日程 + 情绪状态机。
// 纯逻辑，不触碰 THREE 对象；由 NPC.js 读取其输出驱动表现。

import { randRange, chance, pick } from "../core/MathUtils.js";
import {
  SMALL_TALK, SCARED_TALK, ANGRY_TALK, DIALOGUE_REPLY, NPC_GREETINGS, ROLE_INTERACTIONS,
  JOBS, GANGS, JOB_SCHEDULE, PERSONALITY, AI_PANIC,
  NPC_THREAT_DEFIANT, NPC_THREAT_SCARED, NPC_PRAISE, JOB_DIALOGUE,
} from "../config/gameData.js";

// 根据好感度值返回阶段标签：hostile / low / neutral / high
function _getAffinityStage(affection) {
  if (affection >= 40) return "high";
  if (affection <= -30) return "hostile";
  if (affection <= -5) return "low";
  return "neutral";
}

export const State = {
  IDLE: "IDLE",
  WANDER: "WANDER",
  STARTLED: "STARTLED",
  FLEE: "FLEE",
  ANGRY: "ANGRY",
  DOWN: "DOWN", // 被击倒
  TALK: "TALK", // 与玩家对话中
  SEEK_LOOT: "SEEK_LOOT", // 前往拾取地上的掉落物
  AT_HOME: "AT_HOME", // 在自己民居里（睡觉/休息）
  AT_PLACE: "AT_PLACE", // 在室内场所里（上班/消费：酒馆赌场教堂商店等）
};

// 语料 / 职业 / 帮派 / 日程 / 对话回应等内容数据均来自 config/gameData.js
export { SMALL_TALK, SCARED_TALK, ANGRY_TALK, DIALOGUE_REPLY, JOBS, GANGS };

// 时段划分（小时）→ 语料键
export function daySegment(hour) {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "noon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function scheduleFor(job) {
  return JOB_SCHEDULE[job] || { morning: "plaza", noon: "plaza", evening: "saloon", night: "home" };
}

export function makePersonality() {
  const job = pick(JOBS);
  // 依配置概率决定帮派归属，其余中立
  const gang = chance(PERSONALITY.gangChance) ? pick(GANGS) : null;
  const R = (r) => randRange(r[0], r[1]);
  return {
    bravery: R(PERSONALITY.bravery),      // 高 → 倾向反击
    aggression: R(PERSONALITY.aggression),
    greed: R(PERSONALITY.greed),
    sociability: R(PERSONALITY.sociability),
    walkSpeed: R(PERSONALITY.walkSpeed),
    wealth: R(PERSONALITY.wealth),         // 影响掉钱数额
    job,
    gang,
    schedule: scheduleFor(job),
  };
}

export class AIBrain {
  constructor(personality) {
    this.p = personality;
    this.state = State.WANDER;
    this.stateTimer = randRange(0, 3);
    this.target = null;        // { x, z }
    this.threat = null;        // 威胁来源（通常是玩家，也可能是另一个 NPC）位置引用
    this.attackTargetNpc = null; // 非空时表示要打的是这个 NPC，而不是玩家
    this._follow = null;       // LLM 决策的跟随目标 { ref, stopDist }
    this._followUntil = 0;
    this.emotion = 0;          // 0 平静 → 1 极度激动
    this.bubble = null;        // 当前想说的话
    this.bubbleTimer = 0;
    this.attackCd = 0;
    this.homePoint = null;     // 无民居 NPC 的家坐标（由 NPCManager 分配）
    this.home = null;          // 真实民居引用（NPCManager 分配住户后非空）
    this._placeType = null;    // AT_PLACE 时所在场所类型（saloon/shop/work/church）
    this._disturbed = false;   // 家里被行窃后受扰，天亮前不再回家
    this._lastPlace = null;    // 上一个日程地点类型，用于检测时段切换
    this._segment = null;      // 当前时段
    this._noticeCd = randRange(0, AI_PANIC.noticeCooldown); // 主动招呼冷却
    this._greetedRecently = false;
    this._npcId = null;        // 对应 NPCRegistry 的 id（重要 NPC）
    this._talkPatience = 0;    // 对话耐心倒计时（秒），归零后 NPC 主动结束对话
    this._repeatCounts = {};   // 本轮对话中重复动作计数 { kind: count }
    this._saidInTalk = new Set(); // 本轮对话中已说过的台词（去重）
  }

  // 供 NPCManager/NPCRegistry 设置重要 NPC 身份 ID
  setRegistryId(id) {
    this._npcId = id;
  }

  // 根据玩家关系和NPC身份选择招呼用语
  _getGreeting(affection = 0, playerIsBoss = false) {
    // 玩家是帮派老大且该NPC是玩家帮派成员 → boss 招呼
    if (playerIsBoss && this.p.factionId === "player") {
      const personal = NPC_GREETINGS[this._npcId];
      return this._talkPick(personal?.boss) || this._talkPick(DIALOGUE_REPLY.greetBoss);
    }
    // 负声望
    if (affection <= -20) {
      const personal = NPC_GREETINGS[this._npcId];
      return this._talkPick(personal?.negative) || this._talkPick(DIALOGUE_REPLY.greetHostile);
    }
    // 正声望
    if (affection >= 30) {
      const personal = NPC_GREETINGS[this._npcId];
      return this._talkPick(personal?.positive) || this._talkPick(DIALOGUE_REPLY.greetFriendly);
    }
    // 陌生人
    const personal = NPC_GREETINGS[this._npcId];
    return this._talkPick(personal?.stranger) || this._talkPick(DIALOGUE_REPLY.greetStranger);
  }

  say(text, duration = 2.4) {
    this.bubble = text;
    this.bubbleTimer = duration;
  }

  /**
   * 对话专用 pick：从数组中随机选一条本轮对话中还没说过的。
   * 如果所有台词都已说过，返回 null（表示没话说了，该走了）。
   */
  _talkPick(arr) {
    if (!arr || arr.length === 0) return null;
    const fresh = arr.filter(s => !this._saidInTalk.has(s));
    if (fresh.length === 0) return null; // 池子干了
    const chosen = fresh[Math.floor(Math.random() * fresh.length)];
    this._saidInTalk.add(chosen);
    return chosen;
  }

  /** 检查 NPC 是否有特殊职业互动（歌女/酒保/商人/牧师/医生/警长） */
  hasRoleInteraction() {
    return !!ROLE_INTERACTIONS[this.p.job];
  }

  /** 获取职业特有的主动招呼语（叫卖、撩拨等） */
  getRoleApproach() {
    const cfg = ROLE_INTERACTIONS[this.p.job];
    if (!cfg?.approach) return null;
    return pick(cfg.approach);
  }

  /** 获取职业特有的交互动作列表（替代默认对话动作） */
  getRoleActions() {
    const cfg = ROLE_INTERACTIONS[this.p.job];
    if (!cfg?.actions) return null;
    return cfg.actions;
  }

  /** 获取职业的跟进提问和选项（搭话后 NPC 说的第二句话） */
  getJobFollowUp() {
    const cfg = JOB_DIALOGUE[this.p.job];
    if (cfg) return cfg;
    // 帮派成员的默认跟进
    if (this.p.gang) {
      return { prompt: "在这条街上，有胆子的人才能活下去。你够胆吗？", yes: "我有胆", no: "我不想惹事" };
    }
    return null;
  }

  /** 处理职业特有的交互动作。affection 为好感度值，用于获取阶段对话。 */
  respondToRole(kind, affection) {
    const cfg = ROLE_INTERACTIONS[this.p.job];
    if (!cfg) return null;

    // 先尝试好感度阶段对话
    if (affection !== undefined && cfg.stageReplies) {
      const stage = _getAffinityStage(affection);
      const stagePool = cfg.stageReplies[stage];
      if (stagePool) {
        const stageKindPool = stagePool[kind];
        if (stageKindPool && stageKindPool.length > 0) {
          return this._talkPick(stageKindPool) || pick(stageKindPool);
        }
      }
    }

    // 回退到通用回复
    const pools = {
      role_flirt: cfg.flirtReply,
      role_insult: cfg.insultReply,
      role_tip: cfg.tipReply,
      role_buy: cfg.buyReply,
      role_chat: cfg.chatReply,
      role_shop: cfg.shopReply,
      role_bargain: cfg.bargainReply,
      role_pray: cfg.prayReply,
      role_confess: cfg.confessReply,
      role_heal: cfg.healReply,
      role_info: cfg.infoReply,
      role_report: cfg.reportReply,
      role_bribe: cfg.bribeReply,
    };
    const pool = pools[kind];
    if (!pool) return null;
    return this._talkPick(pool) || pick(pool);
  }

  // 依当前小时选一句符合时段的闲聊
  _smallTalk() {
    const seg = this._segment || "noon";
    return pick(SMALL_TALK[seg] || SMALL_TALK.noon);
  }

  // 玩家复活后周围NPC说的台词
  getRandomRespawnLine(reason) {
    const lines = {
      guard: ["下次小心点，别再惹警长了。", "在牢房里待了一夜吧？", "我听说你被警长逮了。"],
      npc: ["那家伙不好惹，下次带把枪。", "你看起来很糟，去医馆看看吧。", "活着就好，朋友。"],
      fall: ["小心脚下！", "摔得不轻啊。", "喝多了吧？"],
    };
    const pool = lines[reason] || lines.npc;
    return pick(pool);
  }

  // 目击犯罪：周围NPC看到玩家打人后的反应
  // 胆小者跑去报警，帮派成员叫同伙，勇敢者只是受惊
  witnessCrime(threatPos, crimeType) {
    if (this._perform && this._perform.immune) return; // 剧场演员不被路过的犯罪打断
    if (this.state === State.DOWN || this.state === State.ANGRY) return;
    if (this.p.bravery < 0.5) {
      // 胆小者报警
      this._reportCrime = true;
      this.threat = threatPos;
      this._enter(State.FLEE);
      this.say(pick(["出事了！得去报官！", "有罪犯！叫警长！", "快跑，去报警！"]), 2);
    } else if (this.p.gang) {
      // 帮派成员叫同伙
      this._callGangBackup = true;
      this.emotion = 0.7;
    } else {
      // 普通勇敢NPC受惊围观
      this.emotion = 0.5;
      this.threat = threatPos;
      this._enter(State.STARTLED);
      this.say(pick(["发生什么了？！", "怎么回事？！", "谁在打架？！"]), 2);
    }
  }

  // 玩家发起对话：进入 TALK 状态，面向玩家、停下脚步
  startTalk(threatRef) {
    if (this.state === State.DOWN || this.state === State.FLEE) return false;
    this.threat = threatRef;
    const wasTalking = this.state === State.TALK;
    this._enter(State.TALK);
    this._talkPatience = randRange(8 + this.p.sociability * 14, 14 + this.p.sociability * 12);
    if (!wasTalking) {
      this._repeatCounts = {};
      this._saidInTalk = new Set();
    }
    return true;
  }

  endTalk() {
    if (this.state !== State.TALK) return;
    this._talkPatience = 0;
    this._repeatCounts = {};
    this._saidInTalk = new Set();
    // 在场所里上班的 NPC 聊完回岗位，别直接下班
    if (this._placeType) this._enter(State.AT_PLACE);
    else this._enter(State.WANDER);
  }

  // ── LLM 行为决策接口 ────────────────────────────────────────
  // NPC 听完玩家的话后，除了回话还能决定做点什么。这些是"确定性"入口，
  // 与 witnessCrime/onHit 那类"按性格掷骰分流"的方法不同，调了就一定进对应状态。

  /** 确定性逃跑（吓到了/心虚跑了）。threatRef 是要躲开的东西 */
  fleeFrom(threatRef) {
    if (this.state === State.DOWN) return false;
    this.threat = threatRef || this.threat;
    this.emotion = Math.max(this.emotion, 0.7);
    this._reportCrime = false; // 单纯跑开，不是去报案
    this._enter(State.FLEE);
    return true;
  }

  /**
   * 确定性攻击指定目标。target 可以是玩家坐标引用，也可以是另一个 NPC。
   * 传 npc 时会记在 attackTargetNpc 上，由 NPCManager 把伤害打给它而不是玩家。
   */
  attackTarget(targetRef, { npc = null, seconds = 10 } = {}) {
    if (this.state === State.DOWN) return false;
    this.threat = targetRef;
    this.attackTargetNpc = npc;      // null = 打玩家
    this.emotion = 1;
    this._enter(State.ANGRY);
    this.stateTimer = seconds;
    return true;
  }

  /** 跟着某个目标走（targetRef 是活引用，会持续更新位置） */
  follow(targetRef, { seconds = 20, stopDist = 2.4 } = {}) {
    if (this.state === State.DOWN) return false;
    this._follow = { ref: targetRef, stopDist };
    this.threat = targetRef;         // 顺便让他朝着你
    this._enter(State.WANDER);
    this.stateTimer = seconds;
    this._followUntil = seconds;
    return true;
  }

  /** 停止跟随 */
  stopFollow() {
    this._follow = null;
    this._followUntil = 0;
  }

  get following() {
    return !!this._follow;
  }

  // ── AI 剧场接管接口 ──────────────────────────────────────────
  // 剧场把 NPC 征召为演员：暂停日程，只按 spec 走位/朝向
  // spec: { moveTo:{x,z}, faceTarget:{x,z}, speedMul, arriveDist, immune }
  takeOver(spec = {}) {
    if (this.state === State.DOWN) return false;
    this._perform = { ...spec, arrived: false };
    this.state = State.WANDER; // 让 NPC.update 走"普通移动"分支
    this.target = null;
    this.stateTimer = 999;
    return true;
  }

  // 更新演员的走位/朝向（演出过程中随时调整）
  perform(spec = {}) {
    if (!this._perform) return false;
    this._perform = { ...this._perform, ...spec, arrived: false };
    return true;
  }

  get performing() {
    return !!this._perform;
  }

  get performArrived() {
    return !!(this._perform && this._perform.arrived);
  }

  // 演出结束：清空接管，日程按当前时段自动复位（清 target + _segment 触发重算）
  release() {
    if (!this._perform) return;
    this._perform = null;
    this.target = null;
    this._segment = null;
    this.stateTimer = 0;
    this._enter(State.WANDER);
  }

  /**
   * 记录一次对话行为，检查是否应该由 NPC 主动结束对话。
   * 返回 { endConversation: true, reason: string } 或 null。
   */
  checkDialoguePatience(kind) {
    // 累计相同行为次数
    this._repeatCounts[kind] = (this._repeatCounts[kind] || 0) + 1;
    const repeats = this._repeatCounts[kind];

    // 相同行为 >= 3 次 → 厌烦
    if (repeats >= 3) {
      return { endConversation: true, reason: "repeat", text: pick([
        "够了，我不想再聊这个了。", "你说来说去就这几句？走了。",
        "我没空陪你玩这个。", "你闲得慌吗？不聊了。", "行了行了，我还有事。"
      ]) };
    }

    // 威胁/勒索后 NPC 主动不爽走人（胆小的逃，胆大的走）
    if (kind === "threat" || kind === "extort") {
      if (this.p.bravery < 0.4) {
        return { endConversation: true, reason: "scared", text: pick([
          "别……别找我了，我什么都不知道！", "我走，我走还不行吗！"
        ]) };
      }
      if (repeats >= 2) {
        return { endConversation: true, reason: "angry_walk", text: pick([
          "你再这样我就叫警长了！", "不跟你这种人废话。"
        ]) };
      }
    }

    // 招募被拒绝后，再次招募会不耐烦
    if (kind === "recruit" && repeats >= 2) {
      return { endConversation: true, reason: "recruit_annoyed", text: pick([
        "我说了不去就是不去，别烦我了。", "你找别人吧，我没兴趣。"
      ]) };
    }

    return null;
  }

  // 发现地上的掉落物，前往拾取（仅在平静状态下、由贪婪驱动）
  seekLoot(target) {
    if (this.state !== State.WANDER && this.state !== State.IDLE) return false;
    this.lootTarget = target;
    this._enter(State.SEEK_LOOT);
    return true;
  }

  isSeekingLoot() {
    return this.state === State.SEEK_LOOT;
  }

  /**
   * 玩家对话选项的回应。
   * @param {string} kind 'greet' | 'praise' | 'threat'
   * @param {number} honor 玩家当前荣誉，用于调整语气
   * @param {object} [relCtx] 可选关系上下文 { affection, playerIsBoss }
   * @returns {object} { reply, mood, tip } tip 为可选情报
   */
  respondTo(kind, honor = 0, relCtx = {}) {
    let reply = "";
    let mood = "neutral";
    let tip = null;

    if (kind === "threat") {
      // 依胆量决定：胆大者可能翻脸，胆小者惊惧
      if (this.p.bravery > 0.65 && chance(0.5)) {
        this._enter(State.ANGRY);
        this.threat = this.threat;
        const angryLines = this._npcId ? NPC_THREAT_DEFIANT[this._npcId] : null;
        reply = this._talkPick(angryLines) || this._talkPick(ANGRY_TALK) || pick(ANGRY_TALK); // 兜底
        mood = "angry";
      } else {
        this._enter(State.STARTLED);
        this.emotion = Math.min(1, this.emotion + 0.5);
        const scaredLines = this._npcId ? NPC_THREAT_SCARED[this._npcId] : null;
        reply = this._talkPick(scaredLines) || this._talkPick(DIALOGUE_REPLY.threat) || pick(DIALOGUE_REPLY.threat);
        mood = "scared";
      }
      return { reply, mood, tip };
    }

    // 友好类：荣誉高/社交高的 NPC 更热情，且可能给情报小费
    const warm = honor > 0 || this.p.sociability > 0.5;
    if (kind === "praise") {
      const personalPraise = this._npcId ? NPC_PRAISE[this._npcId] : null;
      reply = this._talkPick(personalPraise) || this._talkPick(DIALOGUE_REPLY.praise) || pick(DIALOGUE_REPLY.praise);
      mood = "friendly";
    } else {
      // 根据玩家关系和 NPC 身份选择个性化招呼
      const affection = relCtx.affection || 0;
      const playerIsBoss = relCtx.playerIsBoss || false;
      reply = this._getGreeting(affection, playerIsBoss) || pick(DIALOGUE_REPLY.greetStranger);
      mood = affection >= 30 ? "friendly" : affection <= -20 ? "hostile" : "neutral";
    }
    // 友好互动后有概率透露情报
    if (warm && chance(0.35 + this.p.sociability * 0.3)) {
      tip = pick(DIALOGUE_REPLY.tip);
    }
    this.say(reply, 2.6);
    return { reply, mood, tip };
  }

  // 勒索/抢劫：要挟对方交钱。根据 NPC 身份/性格/帮派完全不同。
  // 返回 { reply, mood, comply(bool), amount(交出的钱), attacked(bool) }
  respondToExtort(honorMul = 1) {
    this.emotion = Math.min(1, this.emotion + 0.6);

    // ---- Tier 0: 帮派核心成员（黑蹄会头目/副手）— 绝不可能屈服 ----
    const isGangBoss = this.p.gang === "black_hoof" && (this.p.aggression >= 0.55 || this.p.bravery >= 0.7);
    if (isGangBoss) {
      this._enter(State.ANGRY);
      const lines = [];
      if (this.p.job === "帮派头目" || this._npcId === "npc_silas") {
        lines.push("你胆子不小。在我自己的地盘上，拿枪指着我？");
        lines.push("有意思。上一个这么干的人，现在埋在教堂后面。");
        lines.push("小子，你确定你想好了？这一枪之后，全镇黑蹄会都是你的敌人。");
        lines.push("哈哈……我喜欢有胆量的人。但你犯了一个错误——你以为你威胁的是谁？");
      } else if (this._npcId === "npc_victor") {
        lines.push("（冷笑着把手放在枪上）你是新来的吧？不知道我是谁？");
        lines.push("看来有人需要一个教训。我今天心情不错——把枪放下，我只打断你一条胳膊。");
        lines.push("你刚才说的每一个字，我保证会让你后悔。");
      } else if (this._npcId === "npc_rosa") {
        lines.push("（平静地点了根烟）你确定？我是做生意的。你威胁我，就是威胁整个赌场的保安。");
        lines.push("我见过太多来赌场闹事的人了。每一个人最后都安安静静地离开——躺着离开的。");
      } else {
        lines.push("你找错人了。我是黑蹄会的人，不是你随便吓唬的软蛋。");
      }
      this.say(this._talkPick(lines) || "你找错人了。我是黑蹄会的人。", 3);
      return { reply: "（对方丝毫不惧，反而冷笑着拔出了枪！）", mood: "angry", comply: false, amount: 0, attacked: true };
    }

    // ---- Tier 1: 高胆量/高攻击性的"硬汉" — 大概率反抗 ----
    if (this.p.bravery >= 0.6 && this.p.aggression >= 0.35) {
      this._enter(State.ANGRY);
      const lines = [];
      if (this._npcId === "npc_jack") {
        lines.push("（手已经按在枪柄上）你想好了？我虽然落魄了，但拔枪的速度还没慢。");
        lines.push("我见过比你更狠的人。但他们现在都死了。给你三秒，把枪收起来。");
      } else if (this._npcId === "npc_thomas") {
        lines.push("矿工们每天被人勒索，我受够了。今天再加你一个也无所谓——来。");
        lines.push("你知道吗？在地底下待久了的人，不怕黑，也不怕枪。");
      } else if (this._npcId === "npc_hector") {
        lines.push("（亮出警徽）你确定要在警长身上试这个？这会比你想象的要严重得多。");
        lines.push("我是警长。你现在的行为会让你在牢里待很久。考虑清楚。");
      } else if (this._npcId === "npc_eli") {
        lines.push("（苦笑）我躲黑蹄会躲了两年，结果又来一个。但这次我不跑了。");
      } else {
        lines.push("你以为我怕你？");
        lines.push("来啊，看谁先倒下！");
        lines.push("就凭你？我见过更狠的。");
      }
      this.say(this._talkPick(lines) || "你以为我怕你？", 2.6);
      return { reply: "（对方毫不畏惧，拔枪相向！）", mood: "angry", comply: false, amount: 0, attacked: true };
    }

    // ---- Tier 2: 有骨气但攻击力一般的 NPC — 坚决不给钱但不会主动攻击 ----
    if (this.p.bravery >= 0.45) {
      this.emotion = 0.8;
      const lines = [];
      if (this._npcId === "npc_bessie") {
        lines.push("（双手交叉在胸前）这间酒馆二十年没被人用枪抢过。你也不会是第一个。");
        lines.push("我见过太多混混了。你放下枪，我请你喝一杯。继续的话——我这柜台下面的霰弹枪可不是摆设。");
      } else if (this._npcId === "npc_wei") {
        lines.push("（缓缓摇头）年轻人，我挖了二十年矿，炸过两次塌方。一把枪吓不倒我。");
      } else if (this._npcId === "npc_brown") {
        lines.push("（平静地合上圣经）孩子，暴力解决不了问题。但教堂的门永远开着——等你愿意放下枪的时候。");
      } else if (this._npcId === "npc_martha") {
        lines.push("（冷静地看着你）我治疗过比你更可怕的伤口。也治疗过比你更可怕的人。你不会开枪的——你眼睛里没有那种东西。");
      } else {
        lines.push("我不会给你钱的。省省吧。");
        lines.push("你就是打死我，我也没钱给你。");
        lines.push("不接受威胁。");
      }
      this.say(this._talkPick(lines) || "我不会给你钱的。", 3);
      return { reply: "（对方态度强硬，拒绝交钱）", mood: "defiant", comply: false, amount: 0, attacked: false };
    }

    // ---- Tier 3: 胆小的普通人 — 大概率交钱 ----
    const complyChance = 0.9 - this.p.bravery * 0.4;
    if (chance(complyChance)) {
      const base = 6 + Math.round(this.p.wealth * 30);
      const amount = Math.max(1, Math.round(base * honorMul));
      const lines = [];
      if (this._npcId === "npc_noah") {
        lines.push("别、别开枪！我只是个记者，我真的没什么钱……这是我能拿出来的全部了……");
      } else if (this._npcId === "npc_amos") {
        lines.push("（面色惨白）好……好……这是现金。但我建议你想清楚——银行里每一笔现金都有编号。");
      } else if (this._npcId === "npc_erin") {
        lines.push("（手抖着从口袋里掏钱）我爹还在吃药……请不要伤害我……");
      } else if (this._npcId === "npc_lillian") {
        lines.push("（眼泪在眼眶里打转）这……这是我今晚唱歌的小费……你拿去吧……");
      } else if (this._npcId === "npc_mary") {
        lines.push("（哆哆嗦嗦地把钱放桌上）别伤害我……这是酒馆的工钱……");
      } else if (this._npcId === "npc_carl") {
        lines.push("（叹了口气）唉，都是苦命人。拿去吧，虽然不多……我知道没钱的滋味。");
      } else {
        lines.push("别、别杀我！钱都给你！", "拿去，别伤害我！", "求你了，这是我全部的钱……",
          "好好好，我给你，别开枪！", "我没多少钱……但这都给你……");
      }
      this.say(this._talkPick(lines) || "别、别杀我！钱都给你！", 2.8);
      return { reply: `（对方颤抖着掏出了 $${amount}）`, mood: "scared", comply: true, amount, attacked: false };
    }

    // 胆小但没屈服 → 逃跑
    this._enter(State.FLEE);
    this.say(this._talkPick(["救命！有人抢劫！", "来人啊！强盗！", "别伤害我，我跑！"]) || "救命！有人抢劫！", 2.2);
    return { reply: "（对方尖叫着逃开了）", mood: "scared", comply: false, amount: 0, attacked: false };
  }

  // 招募 NPC 入伙：玩家主动"拉拢入伙"
  // playerFaction: { isBoss, playerInfluence, npcId }
  respondToRecruit(playerFaction) {
    // 已经是玩家帮派成员 → 拒绝
    if (this.p.factionId === "player") {
      return {
        reply: "我已经跟着你了，老大！",
        mood: "friendly",
        accepted: false,
        alreadyMember: true,
      };
    }

    // 黑蹄会核心成员(silas/victor/rosa)需要高影响力
    if (playerFaction.isBoss && playerFaction.playerInfluence < 35) {
      return {
        reply: "哼，就凭你？你还没那个实力让我投靠。",
        mood: "neutral",
        accepted: false,
        reason: "influence_low",
      };
    }

    // trust < 15 → 拒绝
    if (playerFaction.trust < 15) {
      return {
        reply: this._talkPick(["我还不够了解你。", "我们才刚认识，谈这个太早了。", "抱歉，我不能随便加入别人。"]) || "抱歉，我不能随便加入别人。",
        mood: "neutral",
        accepted: false,
        reason: "trust_low",
      };
    }

    // 成功率 = 基础30% + trust*0.5 + affection*0.2 + influence*0.3
    const successRate = 30 + (playerFaction.trust || 0) * 0.5 +
      (playerFaction.affection || 0) * 0.2 + (playerFaction.playerInfluence || 0) * 0.3;

    if (Math.random() * 100 < successRate) {
      return {
        reply: this._talkPick(["好吧，我跟你干。", "我看你是个可靠的人，我加入。", "早就想找个组织了，算我一个！", "好！以后跟你混了。"]) || "好！以后跟你混了。",
        mood: "friendly",
        accepted: true,
      };
    } else {
      return {
        reply: this._talkPick(["我再考虑考虑。", "说实话，我还不确定。", "或许以后吧，现在不行。", "这事急不得，让我再想想。"]) || "我再考虑考虑。",
        mood: "neutral",
        accepted: false,
        reason: "not_convinced",
      };
    }
  }

  // 收到"有人被攻击"的恐慌广播（distance 越近影响越大）
  onPanicBroadcast(threatRef, distance) {
    if (this._perform && this._perform.immune) return; // 剧场演员不被恐慌广播冲散
    if (this.state === State.DOWN) return;
    const radius = AI_PANIC.broadcastRadius;
    const intensity = Math.max(0, 1 - distance / radius);
    this.emotion = Math.min(1, this.emotion + intensity * 0.7);
    // 只有情绪足够高才反应（阈值来自配置，避免整片乱跑）
    if (this.emotion > AI_PANIC.fleeEmotionThreshold && this.state !== State.ANGRY) {
      this.threat = threatRef;
      // 很胆小的才逃；胆大且有攻击性的可能声援（降低概率，不要连锁反应）
      if (this.p.bravery < AI_PANIC.fleeBraveryThreshold) {
        this._enter(State.FLEE);
        if (chance(0.5)) this.say(pick(SCARED_TALK), 2);
      } else if (this.p.bravery > 0.7 && chance(this.p.aggression * 0.25)) {
        this._enter(State.ANGRY);
        this.say(pick(ANGRY_TALK), 2);
      } else {
        this._enter(State.STARTLED);
      }
    }
  }

  // 被玩家直接击中
  onHit(threatRef) {
    // 剧场演员被打 → 直接跳出戏（由剧场检测演员脱戏后做群体反应），之后按普通 NPC 反应
    if (this._perform) {
      this._perform = null;
      this._brokeCharacter = true;
    }
    this.emotion = 1;
    this.threat = threatRef;
    this._disturbed = true;
    if (this.state === State.DOWN) return;

    // 多样化报复：不是所有人都去报警
    // 帮派成员 → 叫同伙来教训玩家（不报警）
    // 胆小NPC → 跑去报警（原行为）
    // 勇敢+攻击性 → 自己反击 或 叫亲朋好友
    // 普通NPC → 50%报警 50%叫朋友

    if (this.p.gang) {
      // 帮派成员：叫帮派同伙，不叫警长
      this._callGangBackup = true;
      this._reportCrime = false;
      this._enter(State.FLEE); // 先跑开叫人
      this.say(pick(["兄弟们！有人找事！", "敢动我们的人？！", "你等着，我叫人去！"]), 2.2);
    } else if (this.p.bravery < 0.3) {
      // 胆小：经典报警路线
      this._reportCrime = true;
      this._enter(State.STARTLED);
      this.say(pick(SCARED_TALK), 2.2);
    } else if (this.p.bravery > 0.6 && this.p.aggression > 0.4 && chance(0.7)) {
      // 勇敢+攻击性：自己反击
      this._enter(State.ANGRY);
      this.say(pick(ANGRY_TALK), 2.2);
    } else {
      // 其余：50%报警，50%叫亲朋好友
      if (chance(0.5)) {
        this._reportCrime = true;
      } else {
        this._callFriendsBackup = true;
        this._reportCrime = false;
      }
      if (this.state !== State.ANGRY) {
        this._enter(State.STARTLED);
        this.say(pick(SCARED_TALK), 2.2);
      }
    }
  }

  // 走路被玩家轻碰一下：受惊、冒句不满，但不逃不打
  onLightBump() {
    if (this.state === State.DOWN || this.state === State.FLEE || this.state === State.ANGRY) return;
    this.emotion = Math.min(1, this.emotion + 0.15);
    this.say(pick(["哎，看着点路！", "挤什么挤！", "让让！", "干嘛呢你！", "小心点！"]), 1.6);
    if (this.state === State.WANDER) this._enter(State.STARTLED);
  }

  // 短时间内被反复冲撞：惹毛 → 胆大者发怒反击、胆小者逃跑
  onBumpedTooMuch(threatRef) {
    if (this._perform && this._perform.immune) return; // 演出中被挤两下不至于跑去报案
    this.emotion = 1;
    this.threat = threatRef;
    this._reportCrime = true;  // 逃去警局报案
    this._disturbed = true;
    if (this.state === State.DOWN) return;
    if (this.p.bravery > 0.5 && this.p.aggression > 0.35) {
      this._enter(State.ANGRY);
      this.say(pick(["找揍是吧！", "别逼我动手！", "你够了啊！"]), 2);
    } else {
      this._enter(State.FLEE);
      this.say(pick(["这人是疯子！", "别过来！", "救命！"]), 2);
    }
  }

  knockDown() {
    this._enter(State.DOWN);
    this.stateTimer = randRange(4, 7);
    this.bubble = null;
  }

  // 玩家在家里行窃：被惊醒/当场撞见 → 依性格发怒或惊逃，天亮前不再安心回家
  onBurglary(threatRef) {
    this._disturbed = true;
    this.emotion = 1;
    this.threat = threatRef;
    if (this.p.bravery > 0.55 && this.p.aggression > 0.35) {
      this._enter(State.ANGRY);
      this.say(pick(["有贼！抓贼！", "你敢偷到我家？！", "来人呐，遭贼了！"]), 2.6);
    } else {
      this._enter(State.FLEE);
      this.say(pick(["谁在那儿！", "救命！有贼！", "别、别伤害我……"]), 2.6);
    }
  }

  _enter(state) {
    this.state = state;
    switch (state) {
      case State.STARTLED: this.stateTimer = randRange(0.5, 1.1); break;
      case State.FLEE: this.stateTimer = randRange(3, 6); break;
      case State.ANGRY: this.stateTimer = randRange(this.p.aggression > 0.55 ? 8 : 4, this.p.aggression > 0.55 ? 16 : 8); break;
      case State.IDLE: this.stateTimer = randRange(2, 5); break;
      case State.WANDER: this.stateTimer = randRange(6, 14); break;
      case State.TALK: this.stateTimer = 999; break; // 由 endTalk 显式结束
      case State.SEEK_LOOT: this.stateTimer = randRange(6, 10); break; // 拾取超时保护
      default: this.stateTimer = randRange(2, 4);
    }
  }

  /**
   * 每帧决策。
   * @param {number} dt
   * @param {object} ctx { self:{x,z}, town, playerPos, playerDist }
   * @returns {object} 意图 { moveTo:{x,z}|null, speedMul, flee:bool, wantAttack:bool }
   */
  think(dt, ctx) {
    this.stateTimer -= dt;
    if (this.bubbleTimer > 0) this.bubbleTimer -= dt;
    else this.bubble = null;
    if (this.attackCd > 0) this.attackCd -= dt;
    // 情绪自然衰减（速率来自配置，越大平复越快）
    this.emotion = Math.max(0, this.emotion - dt * AI_PANIC.emotionDecay);

    // 时段跟踪：切换时段时，若正在日常游走则立即换新目的地；受扰标记也随新时段重置
    const seg = daySegment(ctx.hour ?? 12);
    if (seg !== this._segment) {
      this._segment = seg;
      this._disturbed = false;
      if (this.state === State.WANDER || this.state === State.IDLE) {
        this.target = null; // 触发下方 WANDER 重新按新时段取点
        this.stateTimer = 0;
      }
    }

    const intent = { moveTo: null, speedMul: 1, flee: false, wantAttack: false };

    // ── AI 剧场接管：被征召为演员时，绕过日程/时段逻辑，只听剧场调度 ──
    if (this._perform) {
      const p = this._perform;
      if (p.moveTo) {
        const d = Math.hypot(ctx.self.x - p.moveTo.x, ctx.self.z - p.moveTo.z);
        if (d > (p.arriveDist ?? 0.8)) {
          intent.moveTo = p.moveTo;
          intent.speedMul = p.speedMul ?? 1;
        } else {
          p.arrived = true; // 到位 → 站定演戏
          if (p.faceTarget) intent.faceTarget = p.faceTarget;
        }
      } else if (p.faceTarget) {
        intent.faceTarget = p.faceTarget;
      }
      return intent;
    }

    // ── LLM 决策的"跟随"：优先于日程，但不抢战斗/逃跑/倒地 ──
    if (this._follow) {
      const busy = this.state === State.DOWN || this.state === State.FLEE || this.state === State.ANGRY;
      this._followUntil -= dt;
      const ref = this._follow.ref;
      if (busy || this._followUntil <= 0 || !ref) {
        this.stopFollow();
      } else {
        const d = Math.hypot(ctx.self.x - ref.x, ctx.self.z - ref.z);
        if (d > this._follow.stopDist) {
          intent.moveTo = { x: ref.x, z: ref.z };
          intent.speedMul = 1.15;
        } else {
          intent.faceTarget = ref; // 跟到了就站着看你
        }
        return intent;
      }
    }

    // 在家里：睡觉；到点该出门了就离开（NPC 实体负责执行传送）
    if (this.state === State.AT_HOME) {
      const placeType = this.p.schedule ? this.p.schedule[this._segment || "night"] : null;
      if (placeType !== "home" && !this._disturbed) {
        intent.exitHome = true;
      } else {
        intent.sleep = true;
        if (chance(dt * 0.12)) this.say("Zzz…", 2.8);
      }
      return intent;
    }

    // 在室内场所（上班/消费）：待到日程换地点再走
    if (this.state === State.AT_PLACE) {
      const placeType = this.p.schedule ? this.p.schedule[this._segment || "noon"] : null;
      if (placeType !== this._placeType) {
        intent.exitPlace = true;
      } else {
        intent.wanderRoom = true; // NPC 实体在屋内选点游走
        if (chance(dt * 0.1) && this.p.sociability > 0.35) this.say(this._smallTalk());
      }
      return intent;
    }

    // 主动注意玩家：平静状态、玩家靠近、冷却好了 → 转头看你并有概率打招呼
    if (this._noticeCd > 0) this._noticeCd -= dt;
    if (
      (this.state === State.WANDER || this.state === State.IDLE) &&
      this.emotion < 0.2 &&
      ctx.playerDist < AI_PANIC.noticeDist &&
      this._noticeCd <= 0
    ) {
      this._noticeCd = AI_PANIC.noticeCooldown;
      // 转头看向玩家
      intent.glanceTarget = ctx.playerRef;
      // 社交型更爱打招呼（路上偶遇用中立项 = 根据好感可能是陌生人/友善/敌对）
      if (chance(AI_PANIC.noticeChance * (0.5 + this.p.sociability))) {
        const casualLine = this._getGreeting(0, false); // 路人打招呼用中性语境
        this.say(casualLine, 2.2);
        intent.greet = true; // 供上层播打招呼音效
      }
    }

    switch (this.state) {
      case State.DOWN:
        if (this.stateTimer <= 0) {
          this._enter(State.FLEE); // 爬起来先跑
          this.threat = ctx.playerRef;
        }
        break;

      case State.TALK:
        // 对话中：停步，转向玩家（转向由 NPC.js 依 threat 处理），不主动移动
        intent.faceTarget = this.threat;
        // 耐心倒计时：时间到或玩家走远则 NPC 主动结束对话
        this._talkPatience -= dt;
        if (this._talkPatience <= 0) {
          this.say(pick(["不聊了，我还有事。", "行，今天就到这吧。", "我得走了。", "回头见。"]), 2.5);
          if (this._placeType) this._enter(State.AT_PLACE);
          else this._enter(State.WANDER);
        }
        if (ctx.playerDist > 4.5) this._enter(State.WANDER);
        break;

      case State.SEEK_LOOT: {
        // 前往掉落物；到达由 NPCManager 判定并调用 pickupDone()
        if (this.lootTarget) {
          intent.moveTo = this.lootTarget;
          intent.speedMul = 1.15;
          const d = Math.hypot(ctx.self.x - this.lootTarget.x, ctx.self.z - this.lootTarget.z);
          intent.reachedLoot = d < 1.1;
        }
        // 玩家太近（危险）或超时则放弃拾取
        if (this.stateTimer <= 0 || ctx.playerDist < 3) {
          this.lootTarget = null;
          this._enter(State.WANDER);
        }
        break;
      }

      case State.STARTLED:
        // 原地一惊，结束后依情绪决定逃或怒
        if (this.stateTimer <= 0) {
          if (this.p.bravery > 0.6 && this.p.aggression > 0.45) this._enter(State.ANGRY);
          else this._enter(State.FLEE);
          this.threat = ctx.playerRef;
        }
        break;

      case State.FLEE: {
        intent.flee = true;
        intent.speedMul = 1.7;
        // 优先跑去警局报案
        if (this._reportCrime && ctx.town.sheriffDoor) {
          const sd = ctx.town.sheriffDoor;
          intent.moveTo = { x: sd.x, z: sd.z };
          intent.speedMul = 1.9;
          const dSd = Math.hypot(ctx.self.x - sd.x, ctx.self.z - sd.z);
          if (dSd < 2.2) {
            this._reportCrime = false;
            intent.reportCrime = true;
            this.say("警长！有人行凶！", 2.6);
          } else if (this.stateTimer <= -12) {
            this._reportCrime = false; // 太久跑不到，放弃报案
          }
          break;
        }
        if (this.threat) {
          // 远离威胁
          const away = { x: ctx.self.x - this.threat.x, z: ctx.self.z - this.threat.z };
          const len = Math.hypot(away.x, away.z) || 1;
          intent.moveTo = {
            x: ctx.self.x + (away.x / len) * 12,
            z: ctx.self.z + (away.z / len) * 12,
          };
        }
        if (this.stateTimer <= 0 && ctx.playerDist > 14) {
          this.threat = null;
          this._enter(State.WANDER);
        }
        break;
      }

      case State.ANGRY: {
        intent.speedMul = 1.5;
        // 高攻击性NPC造成更高伤害（帮派分子、暴徒有致死威胁）
        intent.damageMult = 1 + this.p.aggression * 2.0 + (this.p.gang ? 1.0 : 0);
        if (this.threat) {
          intent.moveTo = { x: this.threat.x, z: this.threat.z };
          // 打玩家时用 playerDist；打另一个 NPC 时按 threat 的实际距离算，
          // 否则 NPC 之间永远打不起来（旧逻辑硬绑 playerDist）
          const reach = this.attackTargetNpc
            ? Math.hypot(ctx.self.x - this.threat.x, ctx.self.z - this.threat.z)
            : ctx.playerDist;
          if (reach < 2.2 && this.attackCd <= 0) {
            intent.wantAttack = true;
            intent.attackTargetNpc = this.attackTargetNpc || null;
            this.attackCd = randRange(0.9, 1.4); // 更快的攻击节奏
            if (chance(0.4)) this.say(pick(ANGRY_TALK), 1.5);
          }
        }
        // 情绪耗尽或追太久 → 放弃（但只要有threat就一直追踪）
        if (this.stateTimer <= 0) {
          this.threat = null;
          this.attackTargetNpc = null;
          this._enter(State.WANDER);
        }
        break;
      }

      case State.IDLE:
        if (this.stateTimer <= 0) this._enter(State.WANDER);
        if (chance(dt * 0.15) && this.p.sociability > 0.4) this.say(this._smallTalk());
        break;

      case State.WANDER:
      default: {
        if (!this.target || this.stateTimer <= 0) {
          // 按日程取当前时段应去的地点类型，交由 town 解析为坐标
          const placeType = this.p.schedule ? this.p.schedule[this._segment || "noon"] : null;
          if (placeType && ctx.town.placePoint) {
            this.target = ctx.town.placePoint(placeType, this);
            // 回自己民居时打上标记，到达门口即进屋
            if (placeType === "home" && this.home && !this._disturbed) this.target._home = true;
          } else {
            this.target = ctx.town.randomInterestPoint();
          }
          this._enter(State.WANDER);
        }
        intent.moveTo = this.target;
        const d = Math.hypot(ctx.self.x - this.target.x, ctx.self.z - this.target.z);
        if (this.target._home && d < 2.4) {
          intent.enterHome = true; // 到达家门口 → NPC 实体传送进屋
        } else if (this.target._interior && d < 2.4) {
          intent.enterPlace = true; // 到达室内场所门口 → 传送进室内（上班/消费）
        } else if (d < 2) {
          this._enter(State.IDLE);
          if (chance(0.5) && this.p.sociability > 0.35) this.say(this._smallTalk());
        }
        break;
      }
    }
    return intent;
  }
}
