// TheaterGlue.js — 自由输入的 AI 衔接
// 玩家在事件里随便说一句话 → LLM 生成"角色对这句话的即时反应"+ 选一个剧本节点跳转，
// 让玩家的自由发挥被编进预生成的剧情里。LLM 不可用时退回关键词规则。

import { allowedActionsFor, describeAllowedActions, sanitizeAction } from "../npc/NpcActionSchema.js";

const ENDPOINT = "/api/llm/chat";
// 开了推理的模型实测最慢 31s（reasoning 8891 字符），25s 会被自己 abort 掉。
// 放到 60s：宁可等，也不要静默退化成关键词兜底。
const TIMEOUT_MS = 60000;

/**
 * 生成参数。deepseek-v4-flash 是推理模型，这两个值是实测定的：
 *
 * max_tokens=700（旧值）时 reasoning 会把预算吃光，content 返回 0 字 →
 * JSON 解析失败 → 每次都退化成「（朝你看了一眼）」。实测 700/1200 是 0/5 成功。
 * 拉到 12000 后 reasoning 峰值（约 3000 token）远低于上限，饿死 content 的
 * 失败模式彻底消失。
 *
 * reasoning_effort 是质量/延迟旋钮，实测（各 6 样本）：
 *   none → 1.8s，但节点选择会偏（暴力输入选不到终局），行为退化成清一色 face_player
 *   low  → 10.5s，节点准、行为能和台词语义对上（"钱你拿去" 配 give_money）
 *   高   → 16.3s，质量与 low 相当但更慢
 * 默认取 low。
 */
export const GLUE_GEN = { maxTokens: 12000, reasoningEffort: "low" };

export class TheaterGlue {
  constructor(deps = {}) {
    this.budget = deps.budget || null; // 可选：调用配额
    this.endpoint = deps.endpoint || ENDPOINT; // 可注入，便于脱离浏览器做联调
    this.onReport = deps.onReport || null;     // 每次调用的结果回执（成功/失败/兜底都报）
    this.lastVia = "-";
    this.lastReason = "";
    this.lastMs = 0;
  }

  /**
   * @param {object} args { tree, node, cast:[{roleId, stageName}], text }
   * @returns {Promise<{bridge:Array<{roleId,text}>, targetNodeId:string, via:string}>}
   */
  async glue(args) {
    const t0 = Date.now();
    try {
      const r = await this._llm(args);
      this.lastVia = "llm";
      this.lastReason = r.reason || "";
      this.lastMs = Date.now() - t0;
      this._report("ok", "llm", `${r.bridge.length}句台词 → 节点 ${r.targetNodeId}`);
      return r;
    } catch (e) {
      const msg = e?.message || "llm 不可用";
      // 节流和真故障必须区分：以前两者都静默退化，看起来一模一样
      const throttled = msg.includes("配额");
      const r = this.ruleGlue(args);
      this.lastVia = throttled ? "budget" : "rule";
      this.lastReason = msg;
      this.lastMs = Date.now() - t0;
      this._report(throttled ? "warn" : "bad", this.lastVia, throttled ? "说太快了，本次用关键词兜底" : `兜底(关键词) · ${msg}`);
      return r;
    }
  }

  _report(kind, via, detail) {
    this.onReport?.({ kind, scene: "剧场衔接", via, ms: this.lastMs, detail });
  }

  // ---- LLM 路径 ----

  async _llm({ tree, node, cast, text }) {
    const roleList = cast.map((c) => `${c.roleId}(${c.stageName})`).join(" ");
    // 演员在台上能做的行为：取所有演员允许行为的并集，交给模型挑
    const allowedUnion = new Set(["none"]);
    for (const c of cast) {
      for (const a of allowedActionsFor({
        personality: c.npc?.personality,
        state: c.npc?.brain?.state,
        affection: 0,
        cashReserve: c.npc?.cashReserve || 0,
        dailyUse: {},
        job: c.npc?.personality?.job,
      })) allowedUnion.add(a);
    }
    this._allowed = [...allowedUnion];
    const actionList = describeAllowedActions(this._allowed);
    const nodeList = tree.nodes
      .map((n) => {
        const tag = n.terminal ? "[终局]" : n.choices ? n.choices.map((c) => c.label).join("/") : "[自动]";
        return `${n.id}=${n.title || ""}（${tag}）`;
      })
      .join("\n");

    const sys = `你是一部西部小镇露天短剧的导演助手。剧名：${tree.title}。
玩家（一个路过的枪手）刚刚自由发言或动手，你要做三件事：
1. 写 1-3 条衔接台词：剧中角色对玩家这句话的即时反应，每条不超过 28 字，必须是美国西部片的口吻（伙计/先生/子弹/威士忌/绞索/警长），不要中式武侠味。
2. 从节点列表里挑一个最合适的跳转节点，让剧情自然接上。
3. 可选：给其中某条台词的角色配一个行为，让他不只是嘴上说说。
规则：
- 台词的 roleId 只能用：${roleList}
- 玩家动手/杀人 → 选带血案或混乱的终局节点；玩家喊警长 → 选 grd 类节点
- 玩家讲笑话/搭讪/示好 → 选和人物关系相关的节点
- 行为 action 只能从这些里挑，不需要就填 none：
${actionList}
- 行为要和台词一致：说要打你就配 attack_player，说要跑就配 flee
- 只输出 JSON，不要解释、不要 markdown。`;

    const user = `当前节点：${node.id}（${node.title || ""}）
在场角色：${roleList}
玩家说/做：「${text}」
可跳转节点：
${nodeList}
输出 JSON：
{"bridge":[{"roleId":"<上面的roleId>","text":"<台词>","action":"<行为id或none>","targetName":"<attack_npc 时填在场角色的名字，否则空>"}],"targetNodeId":"<节点id>","reason":"<一句话理由>"}`;

    if (this.budget && !this.budget.tryConsume()) throw new Error("超出本地调用配额");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
          temperature: 0.85,
          max_tokens: GLUE_GEN.maxTokens,
          response_format: { type: "json_object" },
          // 关键：不带这个参数时推理链会把 max_tokens 吃光，content 返回空字符串
          reasoning_effort: GLUE_GEN.reasoningEffort,
        }),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error(`LLM ${resp.status}`);
      const data = await resp.json();
      const msg = data?.choices?.[0]?.message || {};
      let content = msg.content || "";
      // 推理模型可能把结果放 reasoning_content
      if (!content.trim() && typeof msg.reasoning_content === "string") content = msg.reasoning_content;
      const parsed = this._parseJson(content);
      return this._sanitize(parsed, { tree, cast, text });
    } finally {
      clearTimeout(timer);
    }
  }

  _parseJson(content) {
    const cleaned = String(content).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
      throw new Error("LLM 返回不是合法 JSON");
    }
  }

  _sanitize(parsed, { tree, cast, text }) {
    const validRoles = new Set(cast.map((c) => c.roleId));
    const ids = new Set(tree.nodes.map((n) => n.id));
    const stageNames = cast.map((c) => c.stageName).filter(Boolean);
    const allowed = this._allowed || ["none"];
    const bridge = (Array.isArray(parsed?.bridge) ? parsed.bridge : [])
      .filter((b) => b && validRoles.has(b.roleId) && typeof b.text === "string" && b.text.trim())
      .slice(0, 3)
      .map((b) => ({
        roleId: b.roleId,
        text: b.text.slice(0, 40),
        // 越权行为在这里就被降级为 none，不会到执行器
        action: sanitizeAction(b, allowed, stageNames),
      }));

    let target = ids.has(parsed?.targetNodeId) ? parsed.targetNodeId : "";
    if (!target) target = this._pickNode(tree, text);

    if (!bridge.length) {
      const first = cast[0];
      if (first) bridge.push({ roleId: first.roleId, text: "……你说什么，伙计？", action: { action: "none" } });
    }
    return { bridge, targetNodeId: target, via: "llm", reason: parsed?.reason || "" };
  }

  // ---- 规则兜底 ----

  ruleGlue({ tree, cast, text }) {
    const target = this._pickNode(tree, text);
    const speaker = cast[0]?.roleId || "crowd";
    const none = { action: "none", targetName: null, rejected: null };
    let bridge;
    if (/杀|砍|打死|开枪|揍/.test(text)) {
      bridge = [{ roleId: speaker, text: "别！别掏枪！", action: none }];
    } else if (/警长|报官/.test(text)) {
      bridge = [{ roleId: speaker, text: "谁去把警长叫来！", action: none }];
    } else if (/笑话|哈哈|逗/.test(text)) {
      bridge = [{ roleId: speaker, text: "哈！这话说得倒有趣。", action: none }];
    } else {
      bridge = [{ roleId: speaker, text: "（朝你看了一眼）", action: none }];
    }
    return { bridge, targetNodeId: target, via: "rule", reason: "关键词兜底" };
  }

  _pickNode(tree, text) {
    const ids = new Set(tree.nodes.map((n) => n.id));
    for (const rule of tree.glueRules || []) {
      if (rule.keywords.some((k) => text.includes(k)) && ids.has(rule.node)) return rule.node;
    }
    return tree.glueFallbackNode && ids.has(tree.glueFallbackNode) ? tree.glueFallbackNode : tree.entryNode;
  }
}

/**
 * 简易本地调用配额（防止玩家刷输入把 token 烧穿；服务端另有全局闸）。
 * 原来 6/分钟 + 1.2s 冷却对单人调试太紧，连说几句就被挡；
 * 且被挡时和"服务器挂了"长得一模一样，无从排查。现在放宽 + 由 onReport 明确报出。
 * 注意：剧场衔接和 NPC 对话共用服务端同一个闸（.env 的 LLM_PER_MINUTE），
 * 两边客户端配额之和不要超过它，否则会开始吃 429。
 */
export class GlueBudget {
  constructor({ perMinute = 20, cooldownMs = 400 } = {}) {
    this.perMinute = perMinute;
    this.cooldownMs = cooldownMs;
    this._windowStart = Date.now();
    this._count = 0;
    this._last = 0;
  }

  tryConsume() {
    const now = Date.now();
    if (now - this._windowStart >= 60000) {
      this._windowStart = now;
      this._count = 0;
    }
    if (this._count >= this.perMinute) return false;
    if (now - this._last < this.cooldownMs) return false;
    this._count++;
    this._last = now;
    return true;
  }
}
