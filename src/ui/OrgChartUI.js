// OrgChartUI.js — 黑蹄会组织架构图。
//
// 为什么必须有这个面板：Nemesis 的全部乐趣在于"看清一张人事图，然后决定
// 从哪一层下手"。玩家不知道谁向谁汇报、谁野心大、自己的人渗透到第几层，
// 那么"打掉小头目会让上级失去这条线"这种设计就完全不可感知。
//
// 三种身份标注（一眼可辨，不靠颜色单独承载信息）：
//   🕵 我的人（卧底）   ❓ 空缺   数字 = 怀疑度

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export class OrgChartUI {
  constructor(deps = {}) {
    this.nemesis = deps.nemesis;
    this.getPillars = deps.getPillars || (() => null);
    this.onClose = deps.onClose || (() => {});
    this._open = false;
    this._build();
    this._bind();
  }

  get isOpen() { return this._open; }

  _build() {
    document.getElementById("orgchart")?.remove();
    const el = document.createElement("div");
    el.id = "orgchart";
    el.className = "modal hidden";
    el.innerHTML = `
      <div class="org-frame panel-western">
        <div class="org-head">
          <div class="org-title">黑蹄会 · 人事图</div>
          <div class="org-sub" id="org-sub"></div>
          <button class="org-close" id="org-close">✕</button>
        </div>
        <div class="org-body" id="org-body"></div>
        <div class="org-foot">
          <span class="org-legend"><b>🕵</b> 你的人</span>
          <span class="org-legend"><b>❓</b> 空缺</span>
          <span class="org-legend"><b>▲</b> 野心</span>
          <span class="org-legend"><b>⚠</b> 怀疑度（满 100 被清洗）</span>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.bodyEl = el.querySelector("#org-body");
    this.subEl = el.querySelector("#org-sub");
  }

  _bind() {
    this.el.querySelector("#org-close").addEventListener("click", () => this.close());
    this.el.addEventListener("click", (e) => { if (e.target === this.el) this.close(); });
    this._onKey = (e) => {
      if (!this._open) return;
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        e.preventDefault(); e.stopPropagation(); this.close();
      }
    };
    window.addEventListener("keydown", this._onKey, true);
  }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    this._render();
    this.el.classList.remove("hidden");
    this._open = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /**
   * 渲染进任意容器（帮派面板的"人事图"tab 用）。
   * 不建独立弹窗 —— 复用同一套 _buildHtml 逻辑。
   */
  renderInto(container) {
    if (!container) return;
    const { sub, body } = this._buildHtml();
    container.innerHTML = `<div class="org-sub">${sub}</div><div class="org-body">${body}</div>`;
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.el.classList.add("hidden");
    this.onClose();
  }

  _buildHtml() {
    const chart = this.nemesis?.orgChart?.() || [];
    const inf = this.nemesis?.infiltrationStatus?.() || {};

    // 概要：渗透深度 + 内圈还剩几个忠于会首的人
    const bits = [];
    bits.push(`渗透深度 ${inf.deepestMoleRank || 0}/5`);
    bits.push(`你的人 ${inf.moleCount || 0}`);
    bits.push(`会首内圈 ${inf.loyalInnerCircle ?? "?"}`);
    if (inf.canTakeOver) bits.push(`<b class="org-win">内圈已空 —— 可以接管</b>`);
    else if (inf.bossIsolated) bits.push(`<b class="org-warn">会首已被架空</b>`);
    const sub = bits.join(" · ");

    // 按职级分组：从会首往下，让"层"这个概念在视觉上立住
    const byRank = new Map();
    for (const n of chart) {
      if (!byRank.has(n.rank)) byRank.set(n.rank, []);
      byRank.get(n.rank).push(n);
    }
    const ranks = [...byRank.keys()].sort((a, b) => b - a);
    const nameOf = (posId) => chart.find((x) => x.posId === posId)?.name || "—";

    let html = "";
    for (const r of ranks) {
      const rows = byRank.get(r);
      html += `<div class="org-rank"><div class="org-rank-label">${esc(rows[0].rankLabel)}<span>rank ${r}</span></div><div class="org-rank-cards">`;
      for (const n of rows) {
        const tags = [];
        if (n.isMole) tags.push(`<span class="org-tag mole">🕵 你的人</span>`);
        if (n.vacant) tags.push(`<span class="org-tag vacant">❓ 空缺</span>`);
        if (n.isMole && n.suspicion > 0) {
          const lvl = n.suspicion >= 70 ? "hot" : n.suspicion >= 40 ? "warm" : "cool";
          tags.push(`<span class="org-tag susp ${lvl}">⚠ ${Math.round(n.suspicion)}</span>`);
        }
        const amb = Math.round((n.ambition || 0) * 100);
        html += `
          <div class="org-card ${n.vacant ? "is-vacant" : ""} ${n.isMole ? "is-mole" : ""}">
            <div class="org-card-top">
              <span class="org-name">${esc(n.name)}</span>
              ${tags.join("")}
            </div>
            <div class="org-card-mid">${esc(n.title)}</div>
            <div class="org-card-bot">
              <span title="野心">▲ ${amb}</span>
              ${n.reportsTo ? `<span title="直属上级">↑ ${esc(nameOf(n.reportsTo))}</span>` : `<span>顶层</span>`}
              ${n.controls?.length ? `<span title="掌管">${n.controls.map((c) => esc(this._pillarLabel(c))).join("/")}</span>` : ""}
            </div>
          </div>`;
      }
      html += `</div></div>`;
    }
    return { sub, body: html || `<div class="org-empty">（暂无情报）</div>` };
  }

  _render() {
    const { sub, body } = this._buildHtml();
    this.subEl.innerHTML = sub;
    this.bodyEl.innerHTML = body;
  }

  _pillarLabel(key) {
    return { wealth: "财富", territory: "地盘", manpower: "人手", legitimacy: "威望" }[key] || key;
  }

  dispose() {
    window.removeEventListener("keydown", this._onKey, true);
    this.el?.remove();
  }
}
