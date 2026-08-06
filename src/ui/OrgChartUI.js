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
    this.playerOrg = deps.playerOrg || null;   // 玩家自己帮派的人事图
    this.law = deps.law || null;               // 警长势力（第三个人事图）
    this.npcRegistry = deps.npcRegistry || null;
    this.onAppoint = deps.onAppoint || null;   // 任命回调 (npcId, roleId)
    this.getPillars = deps.getPillars || (() => null);
    this.onClose = deps.onClose || (() => {});
    this._open = false;
    this._view = "bh";    // bh=黑蹄会 player=我的帮派 law=警长
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
          <div class="org-title">人事图</div>
          <div class="org-sub" id="org-sub"></div>
          <button class="org-close" id="org-close">✕</button>
        </div>
        <div class="org-tabs">
          <button class="org-tab" data-view="bh">🏴 黑蹄会</button>
          <button class="org-tab" data-view="player">🏠 我的帮派</button>
          <button class="org-tab" data-view="law">⚖ 警长</button>
        </div>
        <div class="org-body" id="org-body"></div>
        <div class="org-foot">
          <span class="org-legend"><b>🕵</b> 我的人</span>
          <span class="org-legend"><b>❓</b> 空缺</span>
          <span class="org-legend"><b>👑</b> 你</span>
          <span class="org-legend"><b>⚠</b> 怀疑度</span>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.bodyEl = el.querySelector("#org-body");
    this.subEl = el.querySelector("#org-sub");
    this.tabEls = [...el.querySelectorAll(".org-tab")];
  }

  _bind() {
    this.el.querySelector("#org-close").addEventListener("click", () => this.close());
    this.el.addEventListener("click", (e) => { if (e.target === this.el) this.close(); });
    this.el.addEventListener("click", (e) => {
      const tab = e.target.closest(".org-tab");
      if (tab) { this._view = tab.dataset.view; this._render(); }
      const appoint = e.target.closest("[data-appoint]");
      if (appoint) {
        const { npc, role } = appoint.dataset;
        this.onAppoint?.(npc, role);
      }
    });
    this._onKey = (e) => {
      if (!this._open) return;
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        e.preventDefault(); e.stopPropagation(); this.close();
      }
    };
    window.addEventListener("keydown", this._onKey, true);
  }

  setView(v) { this._view = v; }

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
    this._embedTarget = container;
    const { sub, body } = this._buildHtml();
    container.innerHTML = `<div class="org-tabs-mini">${this._tabsHtml()}</div><div class="org-sub">${sub}</div><div class="org-body">${body}</div>`;
    this._wireClicks(container);
  }

  _tabsHtml() {
    const tabs = [
      ["bh", "🏴 黑蹄会"], ["player", "🏠 我的帮派"], ["law", "⚖ 警长"],
    ];
    return tabs.map(([v, label]) =>
      `<button class="org-tab ${this._view === v ? "active" : ""}" data-view="${v}">${label}</button>`).join("");
  }

  _wireClicks(scope) {
    for (const tab of scope.querySelectorAll(".org-tab")) {
      tab.addEventListener("click", () => { this._view = tab.dataset.view; this._render(); });
    }
    for (const btn of scope.querySelectorAll("[data-appoint]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onAppoint?.(btn.dataset.npc, btn.dataset.role);
      });
    }
    // 任命表单：选择未任命成员 → 提交到该职务位
    for (const form of scope.querySelectorAll("form.org-appoint")) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const roleId = form.dataset.role;
        const sel = form.querySelector(".org-select");
        const npcId = sel?.value;
        if (!npcId) return;
        const ok = this.onAppoint?.(npcId, roleId);
        // 无论成败都重刷（失败也有 toast）
        if (this._embedTarget) this.renderInto(this._embedTarget);
      });
    }
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.el.classList.add("hidden");
    this.onClose();
  }

  _buildHtml() {
    if (this._view === "player") return this._buildPlayer();
    if (this._view === "law") return this._buildLaw();
    return this._buildBlackHoof();
  }

  _buildBlackHoof() {
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

  /** 我的帮派：会首（玩家）+ 可任命的职务位 + 未任命成员 */
  _buildPlayer() {
    const { chart, unassigned } = this.playerOrg?.orgChart?.() || { chart: [], unassigned: [] };
    const bonus = this.playerOrg?.state?.lastBonus;
    const subBits = [];
    if (bonus) {
      subBits.push(`收益+${Math.round(bonus.incomeBonus * 100)}%`);
      subBits.push(`人力+${bonus.manpowerBonus}`);
      subBits.push(`招揽+${Math.round(bonus.recruitBonus * 100)}%`);
    }
    subBits.push(`未任命 ${unassigned.length}人`);
    const sub = subBits.join(" · ") || "你的帮派人事图";

    let html = `<div class="org-rank"><div class="org-rank-label">👑 会首<span>你</span></div><div class="org-rank-cards">
      <div class="org-card is-mole"><div class="org-card-top"><span class="org-name">你自己</span></div>
      <div class="org-card-mid">会首 · 发号施令</div><div class="org-card-bot"><span>顶层</span></div></div>
    </div></div>`;

    const byRank = new Map();
    for (const r of chart) {
      if (!byRank.has(r.rank)) byRank.set(r.rank, []);
      byRank.get(r.rank).push(r);
    }
    for (const rank of [...byRank.keys()].sort((a, b) => b - a)) {
      html += `<div class="org-rank"><div class="org-rank-label">${esc(byRank.get(rank)[0].label)}<span>rank ${rank}</span></div><div class="org-rank-cards">`;
      for (const r of byRank.get(rank)) {
        const has = !!r.npcId;
        html += `
          <div class="org-card ${has ? "" : "is-vacant"}">
            <div class="org-card-top"><span class="org-name">${esc(r.name)}</span>
              ${has ? "" : `<span class="org-tag vacant">❓ 空缺</span>`}
            </div>
            <div class="org-card-mid">${esc(r.label)}</div>
            <div class="org-card-bot"><span>${esc(r.desc)}</span></div>
            <div class="org-card-actions">${this._appointOptions(r.roleId)}</div>
          </div>`;
      }
      html += `</div></div>`;
    }

    if (unassigned.length) {
      html += `<div class="org-rank"><div class="org-rank-label">🗂 未任命<span>${unassigned.length}人</span></div><div class="org-rank-cards">`;
      for (const id of unassigned) {
        const rec = this.npcRegistry?.get?.(id);
        const name = rec?.displayName || id;
        html += `<div class="org-card is-free"><div class="org-card-top"><span class="org-name">${esc(name)}</span></div>
          <div class="org-card-mid">${esc(rec?.job || "镇民")}</div>
          <div class="org-card-bot"><span>尚未任命</span></div></div>`;
      }
      html += `</div></div>`;
    }
    return { sub, body: html };
  }

  /** 每个职务位的任命按钮（把未任命成员排进去） */
  _appointOptions(roleId) {
    const { unassigned } = this.playerOrg?.orgChart?.() || { unassigned: [] };
    if (!unassigned.length) return "";
    const opts = unassigned.map((id) => {
      const rec = this.npcRegistry?.get?.(id);
      const name = rec?.displayName || id;
      return `<option value="${esc(id)}">${esc(name)}</option>`;
    }).join("");
    return `
      <form class="org-appoint" data-role="${roleId}">
        <select class="org-select">${opts}</select>
        <button class="org-appoint-btn" type="submit">任命</button>
      </form>`;
  }

  /** 警长势力：四支柱 + 警长本人（人事图版） */
  _buildLaw() {
    const s = this.law?.snapshot?.();
    if (!s) return { sub: "", body: `<div class="org-empty">（警长势力数据未初始化）</div>` };
    const sub = `态度 ${s.stanceLabel} · 关系 ${s.rapport > 0 ? "+" : ""}${s.rapport}`;
    const pillarHtml = s.pillars.map((p) => {
      const pct = Math.max(0, Math.min(100, p.value));
      return `<div class="org-card"><div class="org-card-top"><span class="org-name">${esc(p.label)}</span>
        <b>${p.value}${p.collapsed ? " 崩" : ""}</b></div>
        <div class="org-bar"><i style="width:${pct}%"></i></div>
        <div class="org-card-bot"><span>崩溃线 ${p.collapseAt}</span></div></div>`;
    }).join("");
    const body = `
      <div class="org-rank"><div class="org-rank-label">⭐ 警长办公室<span>${esc(s.sheriffName)}</span></div><div class="org-rank-cards">
        <div class="org-card"><div class="org-card-top"><span class="org-name">${esc(s.sheriffName)}</span></div>
        <div class="org-card-mid">警长 · ${esc(s.stanceLabel)}</div>
        <div class="org-card-bot"><span>${esc(s.stanceDesc)}</span></div></div>
      </div></div>
      <div class="org-rank"><div class="org-rank-label">🏛 四支柱<span>${s.pillars.filter(p => p.collapsed).length}/4 崩</span></div><div class="org-rank-cards">${pillarHtml}</div></div>`;
    return { sub, body };
  }

  _render() {
    const { sub, body } = this._buildHtml();
    this.subEl.innerHTML = sub;
    this.bodyEl.innerHTML = body;
    for (const t of this.tabEls) {
      t.classList.toggle("active", t.dataset.view === this._view);
    }
  }

  _pillarLabel(key) {
    return { wealth: "财富", territory: "地盘", manpower: "人手", legitimacy: "威望" }[key] || key;
  }

  dispose() {
    window.removeEventListener("keydown", this._onKey, true);
    this.el?.remove();
  }
}
