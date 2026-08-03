// NpcChatService.js — 玩家对单个 NPC 自由说话时的 LLM 回应
// 与剧场的 TheaterGlue 分工：Glue 负责"把玩家的话接回剧本树节点"，
// 这里负责"没有剧本的一对一闲聊"，输出 = 一句台词 + 一个行为决策。

import { allowedActionsFor, describeAllowedActions, sanitizeAction } from "./NpcActionSchema.js";

const ENDPOINT = "/api/llm/chat";
// 推理模型慢，实测最慢 30s+；25s 会被自己 abort 成兜底。
const TIMEOUT_MS = 60000;

/**
 * 生成参数。与 TheaterGlue 的 GLUE_GEN 同理：
 * max_tokens 旧值 400 太小，推理链一长就把 JSON 挤掉（content 返回空）；
 * 拉到 6000 留足空间。reasoning_effort=low 换来行为选择和台词语义一致。
 */
export const CHAT_GEN = { maxTokens: 6000, reasoningEffort: "low" };

const SYSTEM = `你在为一款美国西部小镇游戏里的 NPC 生成反应。
说话风格：19 世纪美国西部，口语、短句、有地方味（伙计/先生/小子/该死的）。
禁止出现现代词汇、中式武侠用语、颜文字、表情符号。

严格只输出 JSON，不要代码块，不要解释：
{"say":"一句话，不超过26个字","action":"行为id","targetName":"行为需要目标时填在场者姓名，否则空字符串","mood":"friendly|neutral|hostile|scared"}

规则：
- say 必须是这个 NPC 会说的话，符合他的职业与性格
- action 只能从"可选行为"里挑，不确定就填 none
- 玩家说的话越冒犯，越倾向 hostile/敌对行为；越友善，越倾向合作
- 不要每次都选有副作用的行为，多数情况 none 或 face_player 就够了`;

export class NpcChatService {
  constructor(deps = {}) {
    this.endpoint = deps.endpoint || ENDPOINT;
    this.budget = deps.budget || null;
    this.onReport = deps.onReport || null; // 每次调用的结果回执（成功/失败/兜底都报）
    this.lastVia = "-";
    this.lastMs = 0;
    this.lastRejected = null;
    this.history = new Map(); // npc -> [{role, text}]，只留最近几轮
  }

  _report(kind, via, detail) {
    this.onReport?.({ kind, scene: "NPC对话", via, ms: this.lastMs, detail });
  }

  _hist(npc) {
    if (!this.history.has(npc)) this.history.set(npc, []);
    return this.history.get(npc);
  }

  clearHistory(npc) {
    this.history.delete(npc);
  }

  /**
   * @returns {Promise<{say:string, action:{action,targetName}, mood:string, via:string}>}
   */
  async respond({ npc, text, ctx = {} }) {
    const allowed = allowedActionsFor({
      personality: npc.personality,
      state: npc.brain?.state,
      affection: ctx.affection || 0,
      cashReserve: npc.cashReserve || 0,
      dailyUse: ctx.dailyUse || {},
      job: npc.personality?.job,
    });
    const castNames = (ctx.nearbyNames || []).filter(Boolean);

    if (this.budget && !this.budget.tryTake()) {
      this.lastVia = "budget";
      this.lastMs = 0;
      this.lastError = "超出本地调用配额";
      this._report("warn", "budget", "说太快了，本次用关键词兜底");
      return { ...this.ruleRespond({ npc, text, allowed, castNames }), via: "budget" };
    }

    const _t0 = Date.now();
    try {
      const parsed = await this._callLLM({ npc, text, ctx, allowed, castNames });
      this.lastVia = "llm";
      this.lastError = null;
      this.lastMs = Date.now() - _t0;
      this._report("ok", "llm", `「${parsed.say}」${parsed.action?.action && parsed.action.action !== "none" ? " + " + parsed.action.action : ""}`);
      return { ...parsed, via: "llm" };
    } catch (e) {
      this.lastVia = "rule";
      this.lastError = e?.message || String(e); // 记下原因，否则退化成兜底时无从排查
      this.lastMs = Date.now() - _t0;
      // via 已经渲染成"兜底(关键词)"，detail 里别重复
      this._report("bad", "rule", this.lastError);
      return { ...this.ruleRespond({ npc, text, allowed, castNames }), via: "rule" };
    }
  }

  async _callLLM({ npc, text, ctx, allowed, castNames }) {
    const p = npc.personality || {};
    const name = npc.phone?.owner || "镇民";
    const hist = this._hist(npc);
    const histText = hist.slice(-4).map((h) => `${h.role === "player" ? "玩家" : name}：${h.text}`).join("\n");

    const user = [
      `NPC：${name}，职业 ${p.job || "镇民"}${p.gang ? `，帮派 ${p.gang}` : ""}`,
      `性格（0-1）：胆量 ${f(p.bravery)}、攻击性 ${f(p.aggression)}、贪婪 ${f(p.greed)}、社交 ${f(p.sociability)}、财富 ${f(p.wealth)}`,
      `当前状态：${npc.brain?.state || "IDLE"}${npc.brain?.emotion > 0.5 ? "（情绪激动）" : ""}`,
      `对玩家好感：${ctx.affection || 0}（-100 敌视 ~ 100 亲密）；玩家声望：${ctx.honor || 0}`,
      `他兜里现金：$${npc.cashReserve || 0}；玩家身上现金：$${ctx.playerMoney || 0}`,
      castNames.length ? `附近还有：${castNames.join("、")}` : "附近没有其他人",
      "",
      "可选行为：",
      describeAllowedActions(allowed),
      "",
      histText ? `之前的对话：\n${histText}\n` : "",
      `玩家现在说：「${text}」`,
    ].join("\n");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
          temperature: 0.85,
          // 推理模型的思维链会先吃 token，给太小会把 JSON 截断（content 直接返回空），
          // 静默退化成关键词兜底。给足额度让推理跑完还剩空间输出 JSON。
          max_tokens: CHAT_GEN.maxTokens,
          response_format: { type: "json_object" },
          reasoning_effort: CHAT_GEN.reasoningEffort,
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) throw new Error(`LLM ${resp.status}`);
    const data = await resp.json();
    const msg = data?.choices?.[0]?.message || {};
    const raw = msg.content || msg.reasoning_content || "";
    const parsed = extractJson(raw);
    if (!parsed) throw new Error("解析失败");

    const say = String(parsed.say || "").trim().slice(0, 30) || "……";
    const action = sanitizeAction(parsed, allowed, castNames);
    this.lastRejected = action.rejected;
    const mood = ["friendly", "neutral", "hostile", "scared"].includes(parsed.mood) ? parsed.mood : "neutral";

    hist.push({ role: "player", text });
    hist.push({ role: "npc", text: say });
    if (hist.length > 8) hist.splice(0, hist.length - 8);

    return { say, action, mood };
  }

  /** LLM 不可用时的关键词兜底，保证玩家永远有回应 */
  ruleRespond({ npc, text, allowed, castNames }) {
    const p = npc.personality || {};
    const t = String(text);
    const can = (a) => allowed.includes(a);
    let say = "嗯……";
    let action = "none";
    let mood = "neutral";
    let targetName = "";

    if (/滚|混蛋|该死|去死|废物|傻/.test(t)) {
      mood = "hostile";
      if (p.aggression > 0.5 && can("attack_player")) { say = "你他妈再说一遍？"; action = "attack_player"; }
      else if (can("flee")) { say = "疯子，别靠近我！"; action = "flee"; }
      else say = "嘴上放干净点，伙计。";
    } else if (/打|杀|抢|枪/.test(t)) {
      mood = "scared";
      if (p.bravery < 0.4 && can("flee")) { say = "别！我什么都没做！"; action = "flee"; }
      else say = "你最好别在这儿动手。";
    } else if (/钱|借|给我/.test(t)) {
      if (can("give_money")) { say = "拿去吧，别再烦我。"; action = "give_money"; }
      else say = "我自己都不够花，先生。";
    } else if (/赌|牌|骰/.test(t)) {
      if (can("open_gamble")) { say = "有胆色。来，下注吧。"; action = "open_gamble"; }
      else say = "赌场在街那头。";
    } else if (/跟我|走|带我/.test(t)) {
      if (can("follow_player")) { say = "行，走吧。"; action = "follow_player"; }
      else say = "我还有事要办。";
    } else if (/你好|嘿|早|喂/.test(t)) {
      mood = "friendly";
      say = "日安，先生。";
      if (can("face_player")) action = "face_player";
    } else {
      say = pickOne([
        "这话我可听不懂，伙计。",
        "嗯，然后呢？",
        "这镇上什么怪事都有。",
        "说重点，我忙着。",
      ]);
      if (can("face_player")) action = "face_player";
    }

    return { say, action: sanitizeAction({ action, targetName }, allowed, castNames), mood };
  }
}

/** 调用配额（与剧场共用同一套思路，避免玩家狂刷输入把额度打爆） */
/**
 * 本地调用配额。原来 10/分钟 + 900ms 冷却偏紧，且被挡时静默退化。
 * 现在放宽 + 由 onReport 明确报出"节流"而不是伪装成故障。
 * 注意：与剧场衔接共用服务端同一个闸（.env 的 LLM_PER_MINUTE）。
 */
export class ChatBudget {
  constructor({ perMinute = 20, cooldownMs = 400 } = {}) {
    this.perMinute = perMinute;
    this.cooldownMs = cooldownMs;
    this.stamps = [];
    this.last = 0;
  }
  tryTake() {
    const now = Date.now();
    if (now - this.last < this.cooldownMs) return false;
    this.stamps = this.stamps.filter((s) => now - s < 60000);
    if (this.stamps.length >= this.perMinute) return false;
    this.stamps.push(now);
    this.last = now;
    return true;
  }
}

function f(v) {
  return (v == null ? 0 : v).toFixed(2);
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractJson(raw) {
  const s = String(raw).replace(/```json|```/g, "").trim();
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try {
    return JSON.parse(s.slice(i, j + 1));
  } catch (e) {
    return null;
  }
}
