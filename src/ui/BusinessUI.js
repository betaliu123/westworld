// BusinessUI.js — 产业经营面板（帮派面板的"产业"tab）。
//
// 玩家要能看见三件事：
//   ① 自己经营的产业：每个岗位谁在干、产出多少、是否匹配
//   ② 可争取的商铺：投资（和平）或抢夺（暴力）两条路
//   ③ 待派人员：帮派成员里还没上岗的，点一下就能派人

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export class BusinessUI {
  constructor(deps = {}) {
    this.business = deps.business;
    this.factionSystem = deps.factionSystem || null;
    this.npcRegistry = deps.npcRegistry || null;
    this.onInvest = deps.onInvest || (() => {});
    this.onRaid = deps.onRaid || (() => {});
    this.onAssign = deps.onAssign || (() => {});
    this.onUpgrade = deps.onUpgrade || (() => {});
    this._embedTarget = null;
  }

  /** 渲染进帮派面板的"产业"tab */
  renderInto(container) {
    if (!container) return;
    this._embedTarget = container;
    container.innerHTML = this._buildHtml();
    this._bind(container);
  }

  _nameOf(npcId) {
    if (!npcId) return null;
    return this.npcRegistry?.get?.(npcId)?.displayName || npcId;
  }

  _buildHtml() {
    const b = this.business;
    if (!b) return `<div class="org-empty">（产业系统未初始化）</div>`;

    const owned = b.playerBusinesses();
    const available = b.allBusinesses().filter((x) => x.owner !== "player");
    const members = (this.factionSystem?.getOpenMembers?.() || []);
    // 待派人员 = 明面成员里还没上岗的
    const assigned = new Set();
    for (const biz of b.allBusinesses()) {
      for (const p of biz.posts) if (p.assignedNpcId) assigned.add(p.assignedNpcId);
    }
    const free = members.filter((id) => !assigned.has(id));

    const bizToHtml = (biz, editable) => {
      const icon = { saloon: "🥃", casino: "🎰", freight: "📦", protection: "🛡", smithy: "⚒", general: "🏪" }[biz.type] || "🏪";
      const ownerLabel = biz.owner === "player" ? "你" : biz.owner === "black_hoof" ? "黑蹄会" : "中立";
      const upkeep = biz.upkeep;
      const postHtml = biz.posts.map((p, i) => {
        const name = this._nameOf(p.assignedNpcId) || "（空）";
        const isFree = editable && !p.assignedNpcId;
        return `
          <div class="biz-post">
            <div class="biz-post-top"><span>${esc(p.label)}</span><b>${esc(name)}</b></div>
            <div class="biz-post-note">
              ${p.assignedNpcId ? `预期 $${p.expected || "?"}` : isFree ? `<button class="biz-btn mini" data-assign="${biz.id}:${i}">派人</button>` : "空岗"}
            </div>
          </div>`;
      }).join("");
      return `
        <div class="biz-card">
          <div class="biz-head">
            <span>${icon} ${esc(biz.name)} <small>Lv.${biz.level}</small></span>
            <b>${ownerLabel}</b>
          </div>
          <div class="biz-meta">维护 $${upkeep} / 天 · 预计产出 $${Math.round(biz.baseIncome * 0.4 * (1.3 ** (biz.level - 1)) * 4)}</div>
          <div class="biz-posts">${postHtml}</div>
          ${editable && biz.level < 3 ? `<button class="biz-btn" data-upgrade="${biz.id}">升级 Lv.${biz.level + 1} — $${Math.round(biz.price * 0.8) * biz.level}</button>` : ""}
        </div>`;
    };

    const ownedHtml = owned.length
      ? owned.map((biz) => bizToHtml(biz, true)).join("")
      : `<div class="org-empty">还没有产业。去下面投资一家，或直接抢一家。</div>`;

    const availHtml = available.map((biz) => {
      const icon = { saloon: "🥃", casino: "🎰", freight: "📦", protection: "🛡", smithy: "⚒", general: "🏪" }[biz.type] || "🏪";
      const ownerLabel = biz.owner === "black_hoof" ? "黑蹄会" : "中立";
      return `
        <div class="biz-candidate">
          <span class="biz-cand-name">${icon} ${esc(biz.name)}</span>
          <span class="biz-cand-owner">${ownerLabel}</span>
          <span class="biz-cand-actions">
            <button class="biz-btn" data-invest="${biz.id}:small">小股 $${biz.shares.small}</button>
            <button class="biz-btn" data-invest="${biz.id}:large">大股 $${biz.shares.large}</button>
            <button class="biz-btn danger" data-raid="${biz.id}">抢夺</button>
          </span>
        </div>`;
    }).join("");

    const freeHtml = free.length
      ? free.map((id) => {
          const npc = this.npcRegistry?.get?.(id);
          const job = npc?.job || npc?.displayName || id;
          return `<div class="biz-free">· ${esc(npc?.displayName || id)} <small>${esc(job)}</small></div>`;
        }).join("")
      : `<div class="org-empty">没有可派的明面成员（收服别人，或在人事图看看卧底）</div>`;

    const last = b.state.lastSettle;
    const settleLine = last
      ? `昨日结算：净 $${last.net} · 预期 $${last.expected} · 实收 $${last.actual}${last.moleLeak > 0 ? ` · <span class="biz-leak">异常流失 $${last.moleLeak}</span>` : ""}`
      : "还没有结算记录";

    return `
      <div class="biz-summary">${settleLine}</div>
      <div class="faction-title">🏠 你的产业</div>
      <div class="biz-list">${ownedHtml}</div>
      <div class="faction-title">⚔ 可争取的商铺</div>
      <div class="biz-list">${availHtml || `<div class="org-empty">镇上能争取的都被你拿下了</div>`}</div>
      <div class="faction-title">👥 待派人员</div>
      <div class="biz-free-list">${freeHtml}</div>`;
  }

  _bind(scope) {
    scope.querySelectorAll("[data-invest]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [id, tier] = btn.dataset.invest.split(":");
        this.onInvest(id, tier);
        this._refresh();
      });
    });
    scope.querySelectorAll("[data-raid]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.onRaid(btn.dataset.raid);
        // 抢夺走遭遇弹窗，点完由弹窗回调刷新
      });
    });
    scope.querySelectorAll("[data-assign]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [id, idx] = btn.dataset.assign.split(":");
        this._assignFlow(id, +idx, scope);
      });
    });
    scope.querySelectorAll("[data-upgrade]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.onUpgrade(btn.dataset.upgrade);
        this._refresh();
      });
    });
  }

  _refresh() {
    if (this._embedTarget) this.renderInto(this._embedTarget);
  }

  // 派人：如果只有一个空岗直接派第一个自由成员；否则点一下弹选择
  _assignFlow(bizId, postIdx, scope) {
    const free = (this.factionSystem?.getOpenMembers?.() || []).filter((id) => {
      for (const b of this.business.allBusinesses()) {
        for (const p of b.posts) if (p.assignedNpcId === id) return false;
      }
      return true;
    });
    if (free.length === 0) { this.onAssign(bizId, postIdx, null); this._refresh(); return; }
    if (free.length === 1) { this.onAssign(bizId, postIdx, free[0]); this._refresh(); return; }
    // 多选：用一个轻量选择条
    const biz = this.business.getBusiness(bizId);
    const post = biz?.posts?.[postIdx];
    if (!post) return;
    const menu = document.createElement("div");
    menu.className = "biz-pick";
    menu.innerHTML = free.map((id) => {
      const npc = this.npcRegistry?.get?.(id);
      return `<button class="biz-btn" data-pick="${id}">${esc(npc?.displayName || id)}</button>`;
    }).join("");
    menu.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.onAssign(bizId, postIdx, btn.dataset.pick);
        this._refresh();
      });
    });
    // 插入到该岗位卡片后面
    const card = scope.querySelectorAll(".biz-card")[this.business.playerBusinesses().findIndex((x) => x.id === bizId)];
    const old = scope.querySelector(".biz-pick");
    if (old) old.remove();
    card?.appendChild(menu);
  }

  dispose() {}
}
