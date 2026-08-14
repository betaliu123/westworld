// Gangs.js — 势力面板：展示玩家势力 + 黑蹄会四支柱。
// 重写为十日战役视角，不再使用旧的帮派声望系统。
//
// 现在带三个 tab：
//   帮派  —— 玩家势力 + 黑蹄会四支柱（原 G 面板内容）
//   人事图 —— 黑蹄会组织架构（P4，原独立 O 面板）
//   警长  —— 第三方势力（P5，原独立 K 面板）
// O / K 快捷键都落到这个面板上，不再开独立弹窗。

import { GANGS } from "../systems/AIBrain.js";

const GANG_INFO = {
  红隼帮: { ico: "🦅", desc: "盘踞北镇的悍匪，崇尚武力与地盘。" },
  黑蹄会: { ico: "🐎", desc: "走私与赌场背后的影子，讲究人脉与利益。" },
  银矿兄弟会: { ico: "⛏️", desc: "淘金客与矿工结成的互助帮会，重义气。" },
};

const TABS = [
  { id: "faction", label: "🏴 帮派" },
  { id: "biz",     label: "🏪 产业" },
  { id: "org",     label: "🕵 人事图" },
  { id: "law",     label: "⚖ 警长" },
];

export class Gangs {
  constructor(reputation, deps = {}) {
    this.reputation = reputation;
    this.worldState = deps.worldState || null;
    this.factionSystem = deps.factionSystem || null;
    // P4/P5/P7：orgChartUI / lawUI / businessUI 作为"渲染引擎"嵌进本面板的 tab
    this.orgChartUI = deps.orgChartUI || null;
    this.lawUI = deps.lawUI || null;
    this.businessUI = deps.businessUI || null;
    this.modal = document.getElementById("gangs");
    this.listEl = document.getElementById("gangs-list");
    const close = document.getElementById("gangs-close");
    if (close) close.addEventListener("click", () => this.close());
    if (reputation) reputation.onChange(() => { if (this.isOpen && this._tab === "faction") this.render(); });
    // 打开时默认落在"我的帮派人事图"（玩家自己的成员 + 数值），
    // 老的"帮派"tab 保留但不再默认展示
    this._tab = "org";
    this._buildTabs();
  }

  _buildTabs() {
    if (!this.modal) return;
    let bar = this.modal.querySelector(".gangs-tabs");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "gangs-tabs";
      // 插到 header 下面、列表上面。
      // 注意：gangs-list 是 .gangs-frame 的子节点，不是 #gangs 的直接子节点，
      // 所以必须用 listEl.parentNode 做 insertBefore 的参照父节点，否则报
      // "node is not a child of this node"。
      const listParent = this.listEl?.parentNode;
      if (listParent) listParent.insertBefore(bar, this.listEl);
    }
    bar.innerHTML = "";
    for (const t of TABS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gangs-tab" + (t.id === this._tab ? " active" : "");
      b.textContent = t.label;
      b.dataset.tab = t.id;
      bar.appendChild(b);
    }
    // 用 onclick 覆盖而不是 addEventListener：_buildTabs 会被反复调用
    // （构造 / openTab / 点击 tab），addEventListener 会越叠越多，点一次触发 N 次。
    bar.onclick = (e) => {
      const btn = e.target.closest(".gangs-tab");
      if (!btn) return;
      this._tab = btn.dataset.tab;
      this._buildTabs();
      this.render();
    };
  }

  get isOpen() {
    return this.modal && !this.modal.classList.contains("hidden");
  }

  /** 打开并定位到指定 tab（O/K 快捷键用） */
  openTab(tabId) {
    if (this._tab !== tabId) {
      this._tab = tabId;
      this._buildTabs();
    }
    this.open();
  }

  open() {
    this.render();
    this.modal.classList.remove("hidden");
  }

  close() {
    this.modal.classList.add("hidden");
  }

  render() {
    if (!this.listEl) return;
    if (this._tab === "org") {
      this.listEl.innerHTML = "";
      const holder = document.createElement("div");
      holder.className = "gangs-embed";
      this.listEl.appendChild(holder);
      this.orgChartUI?.renderInto(holder);
      return;
    }
    if (this._tab === "law") {
      this.listEl.innerHTML = "";
      const holder = document.createElement("div");
      holder.className = "gangs-embed";
      this.listEl.appendChild(holder);
      this.lawUI?.renderInto(holder);
      return;
    }
    if (this._tab === "biz") {
      this.listEl.innerHTML = "";
      const holder = document.createElement("div");
      holder.className = "gangs-embed";
      this.listEl.appendChild(holder);
      this.businessUI?.renderInto(holder);
      return;
    }
    // 默认：原帮派内容
    if (this.worldState) {
      this._renderCampaign();
      return;
    }
    this._renderLegacy();
  }

  _renderCampaign() {
    this.listEl.innerHTML = "";
    const ws = this.worldState.state;
    const pf = ws.factions.player;
    const bh = ws.factions.black_hoof;
    const day = ws.day;

    // === 玩家势力 ===
    const playerSection = document.createElement("div");
    playerSection.className = "faction-section";
    playerSection.innerHTML = `
      <div class="faction-title">🏠 你的势力 <span style="font-size:12px;color:#b8a888">第${day}天</span></div>
      <div class="faction-stats">
        <div class="faction-stat"><span class="fs-label">💰 金库</span><span class="fs-val">$${pf.money || 0}</span></div>
        <div class="faction-stat"><span class="fs-label">👥 成员</span><span class="fs-val">${pf.members.length}人</span></div>
        <div class="faction-stat"><span class="fs-label">📡 影响力</span><span class="fs-val">${pf.influence || 0}</span></div>
        <div class="faction-stat"><span class="fs-label">💪 士气</span><span class="fs-val" style="color:${pf.morale < 30 ? '#e2564a' : pf.morale < 50 ? '#f0c040' : '#78dc78'}">${pf.morale || 0}</span></div>
        <div class="faction-stat"><span class="fs-label">🏚️ 驻地</span><span class="fs-val">Lv.${pf.hqLevel || 1}</span></div>
      </div>
    `;
    this.listEl.appendChild(playerSection);

    // === 黑蹄会 四支柱 ===
    const bhSection = document.createElement("div");
    bhSection.className = "faction-section";

    let pillarsHTML = '<div class="faction-title" style="color:#e2564a">🏴 黑蹄会 — 塞拉斯·克劳</div>';
    const pillarDefs = {
      wealth: { icon: "💰", name: "财富", desc: "赌场、银行股份、保护费" },
      territory: { icon: "🗺️", name: "地盘", desc: "赌场、南街、仓库" },
      manpower: { icon: "👥", name: "人手", desc: "副手、枪手、线人" },
      legitimacy: { icon: "⚖️", name: "威望", desc: "恐惧、警长妥协、舆论控制" },
    };

    if (bh && bh.pillars) {
      for (const [key, pillar] of Object.entries(bh.pillars)) {
        const def = pillarDefs[key] || { icon: "⬛", name: key, desc: "" };
        const collapsed = pillar.value <= pillar.collapseAt;
        const barColor = collapsed ? "#e2564a" : pillar.value < 50 ? "#f0c040" : "#78dc78";
        const statusText = collapsed ? "⚠️ 已崩溃" : pillar.value < 50 ? "弱" : "稳定";
        pillarsHTML += `
          <div class="pillar-row ${collapsed ? 'collapsed' : ''}">
            <div class="pillar-header">
              <span class="pillar-name">${def.icon} ${def.name}</span>
              <span class="pillar-val" style="color:${barColor}">${pillar.value}/100 <small>${statusText}</small></span>
            </div>
            <div class="pillar-bar">
              <span style="width:${pillar.value}%;background:${barColor}"></span>
              <span class="pillar-collapse-line" style="left:${pillar.collapseAt}%"></span>
            </div>
            <div class="pillar-desc">${def.desc}</div>
          </div>
        `;
      }
    } else {
      pillarsHTML += '<div style="color:#b8a888;font-size:12px;padding:8px">黑蹄会数据未初始化</div>';
    }

    bhSection.innerHTML = pillarsHTML;
    this.listEl.appendChild(bhSection);

    // === 我在各方势力的声望 ===
    const repSection = document.createElement("div");
    repSection.className = "faction-section";
    const gangReps = this.reputation?.gangs || {};
    const repRows = [];
    if (gangReps.black_hoof != null) {
      const v = gangReps.black_hoof;
      repRows.push(`<div class="faction-stat"><span class="fs-label">🏴 黑蹄会声望</span><span class="fs-val" style="color:${v < -15 ? '#e2564a' : v > 15 ? '#78dc78' : '#f0c040'}">${v > 0 ? "+" : ""}${v}</span></div>`);
    }
    if (gangReps.law != null) {
      const v = gangReps.law;
      repRows.push(`<div class="faction-stat"><span class="fs-label">⭐ 警局声望</span><span class="fs-val" style="color:${v < -15 ? '#e2564a' : v > 15 ? '#78dc78' : '#f0c040'}">${v > 0 ? "+" : ""}${v}</span></div>`);
    }
    if (gangReps.player != null) {
      const v = gangReps.player;
      repRows.push(`<div class="faction-stat"><span class="fs-label">🏠 自己帮派声望</span><span class="fs-val">${v > 0 ? "+" : ""}${v}</span></div>`);
    }
    if (repRows.length) {
      repSection.innerHTML = `<div class="faction-title">🤝 我在各方的声望</div>
        <div class="faction-stats">${repRows.join("")}</div>
        <div style="font-size:11px;color:#b8a888;margin-top:6px">杀帮派/警署的人会掉他们在你心中的声望，长期行侠/做事会回升。</div>`;
      this.listEl.appendChild(repSection);
    }

    // === 已崩溃统计 + 胜利条件提示 ===
    const statusSection = document.createElement("div");
    statusSection.className = "faction-section";
    let collapsedCount = 0;
    if (bh && bh.pillars) {
      collapsedCount = Object.values(bh.pillars).filter(p => p.value <= p.collapseAt).length;
    }
    const victoryHint = collapsedCount >= 3
      ? "🔥 三根支柱已断！彻底瓦解黑蹄会近在眼前！"
      : collapsedCount >= 2
        ? "⚔️ 两根支柱崩溃，黑蹄会的地基正在动摇。"
        : collapsedCount >= 1
          ? "🔍 一根支柱动摇了，继续施压。"
          : "🏗️ 黑蹄会的统治依然稳固。找到并摧毁他们的支柱。";

    statusSection.innerHTML = `
      <div class="faction-title">📊 战役进度</div>
      <div class="victory-hint">${victoryHint}</div>
      <div class="pillar-count">已崩溃: <b>${collapsedCount}</b>/4 根支柱</div>
    `;
    this.listEl.appendChild(statusSection);

    // === 旧帮派声望（折叠） ===
    const legacySection = document.createElement("div");
    legacySection.className = "faction-section";
    legacySection.innerHTML = '<div class="faction-title" style="font-size:11px;color:#7a6a5a;cursor:pointer" id="toggle-legacy">▶ 旧帮派声望</div><div id="legacy-gangs" style="display:none"></div>';
    this.listEl.appendChild(legacySection);

    document.getElementById("toggle-legacy").addEventListener("click", () => {
      const div = document.getElementById("legacy-gangs");
      const toggle = document.getElementById("toggle-legacy");
      const isHidden = div.style.display === "none";
      div.style.display = isHidden ? "block" : "none";
      toggle.textContent = isHidden ? "▼ 旧帮派声望" : "▶ 旧帮派声望";
      if (isHidden) this._renderLegacyInto(div);
    });
  }

  _renderLegacyInto(container) {
    if (!container || !this.reputation) return;
    container.innerHTML = "";
    for (const g of GANGS) {
      const val = this.reputation.gangs[g] ?? 0;
      const label = this.reputation.gangLabel(val);
      const info = GANG_INFO[g] || { ico: "🏴", desc: "" };
      const pct = (val + 100) / 2;
      const barColor = val >= 15 ? "#78dc78" : val <= -15 ? "#e2564a" : "#b8a888";
      const row = document.createElement("div");
      row.className = "gang-row";
      row.innerHTML = `
        <div class="gang-ico">${info.ico}</div>
        <div class="gang-meta">
          <div class="gang-name">${g} <span class="gang-label" style="color:${barColor}">${label} (${val})</span></div>
          <div class="gang-desc">${info.desc}</div>
          <div class="gang-bar"><span style="width:${pct}%;background:${barColor}"></span></div>
        </div>`;
      container.appendChild(row);
    }
  }

  _renderLegacy() {
    this._renderLegacyInto(this.listEl);
  }
}
