// AiLog.js — 屏幕顶部的"实时生成"回执浮层。
//
// 为什么需要它：剧场衔接和 NPC 对话都是 try/catch 里静默退化 —— LLM 挂了、被节流了、
// JSON 解析失败了，玩家看到的都只是一句平淡的兜底台词（比如"（朝你看了一眼）"），
// 完全分不清"模型这么答的"和"根本没调到模型"。调试面板只显示 llm/rule 两个字，
// 说不出原因（lastReason 一直被赋值但没人读）。
//
// 现在每次调用都往这里报一条：成功、失败、走兜底三种都报，附耗时和原因。

const KIND_ICON = { ok: "✅", warn: "⚠️", bad: "❌" };
const VIA_LABEL = { llm: "大模型", rule: "兜底(关键词)", budget: "兜底(节流)" };

export class AiLog {
  /**
   * @param {object} deps
   *   el      挂载容器（#ai-log）
   *   max     同时显示几条（默认 3）
   *   ttlMs   单条存活时间，到点淡出；0 = 常驻
   *   enabled 默认是否显示
   */
  constructor(deps = {}) {
    this.el = deps.el || null;
    this.max = deps.max || 3;
    this.ttlMs = deps.ttlMs ?? 12000;
    this.enabled = deps.enabled !== false; // 默认开
    this.entries = []; // [{ at, kind, scene, via, ms, detail }]
    this._applyVisibility();
  }

  /** 收一条回执。services 通过 onReport 回调调用。 */
  report({ kind = "ok", scene = "AI", via = "-", ms = 0, detail = "" } = {}) {
    this.entries.push({ at: Date.now(), kind, scene, via, ms, detail });
    if (this.entries.length > this.max) this.entries.splice(0, this.entries.length - this.max);
    this._render();
  }

  setEnabled(on) {
    this.enabled = !!on;
    this._applyVisibility();
    if (this.enabled) this._render();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /** 供调试面板显示最近几条（纯文本） */
  recent(n = 3) {
    return this.entries.slice(-n).map((e) => this._line(e));
  }

  clear() {
    this.entries.length = 0;
    this._render();
  }

  /** 每帧调用（可选）：让过期条目自己消失 */
  tick() {
    if (!this.ttlMs) return;
    const cut = Date.now() - this.ttlMs;
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.at >= cut);
    if (this.entries.length !== before) this._render();
  }

  _line(e) {
    const icon = KIND_ICON[e.kind] || "•";
    const via = VIA_LABEL[e.via] || e.via;
    const t = e.ms ? ` ${(e.ms / 1000).toFixed(1)}s` : "";
    return `${icon} ${e.scene} · ${via}${t} · ${e.detail}`;
  }

  _applyVisibility() {
    if (!this.el) return;
    this.el.classList.toggle("hidden", !this.enabled);
  }

  _render() {
    if (!this.el || !this.enabled) return;
    this.el.innerHTML = this.entries
      .map((e) => `<div class="ai-log-row ai-log-${e.kind}">${escapeHtml(this._line(e))}</div>`)
      .join("");
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
