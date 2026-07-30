// HUD.js — 顶部状态、血条、交互提示、Toast 通知、商店面板绑定。

import { SHOP_ITEMS } from "../systems/Economy.js";

export class HUD {
  constructor(economy, reputation) {
    this.economy = economy;
    this.reputation = reputation;
    this.moneyEl = document.getElementById("hud-money");
    this.clockEl = document.getElementById("hud-clock");
    this.dayEl = document.getElementById("hud-day");
    this.energyEl = document.getElementById("hud-energy");
    this.assetsEl = document.getElementById("hud-assets");
    this.honorEl = document.getElementById("hud-honor");
    this.wantedEl = document.getElementById("hud-wanted");
    this.healthFill = document.getElementById("hud-health-fill");
    this.hintEl = document.getElementById("hint");
    this.toastWrap = document.getElementById("toast-wrap");

    this.shopEl = document.getElementById("shop");
    this.shopItemsEl = document.getElementById("shop-items");
    this.shopMoneyEl = document.getElementById("shop-money-val");
    this.toastSide = document.getElementById("toast-side");
    document.getElementById("shop-close").addEventListener("click", () => this.closeShop());

    this._stockMarket = null;

    economy.onChange(() => this.refreshEconomy());
    this.refreshEconomy();
    if (reputation) {
      reputation.onChange(() => this.refreshReputation());
      this.refreshReputation();
    }
    this._buyHandler = null;
  }

  setStockMarket(sm) {
    this._stockMarket = sm;
  }

  refreshEconomy() {
    this.moneyEl.textContent = `💵 $${this.economy.money}`;
    let assetsStr = `🏠 ${this.economy.houseCount} · 🚗 ${this.economy.carCount}`;
    if (this._stockMarket) {
      const stockVal = this.economy.getStockValue(this._stockMarket.prices);
      if (stockVal > 0) assetsStr += ` · 📈 $${stockVal}`;
    }
    this.assetsEl.textContent = assetsStr;
    if (this.shopEl && !this.shopEl.classList.contains("hidden")) this.renderShop();
  }

  refreshReputation() {
    if (!this.reputation) return;
    const r = this.reputation;
    if (this.honorEl) {
      const cls = r.honor >= 20 ? "good" : r.honor <= -20 ? "bad" : "";
      this.honorEl.className = "hud-badge " + cls;
      this.honorEl.textContent = `⚖️ ${r.honorLabel} (${r.honor})`;
    }
    if (this.wantedEl) {
      this.wantedEl.textContent = `🎯 ${r.wantedStarString}`;
      this.wantedEl.classList.toggle("wanted-active", r.wantedStars > 0);
    }
  }

  setTime(str, isNight) {
    this.clockEl.textContent = `${isNight ? "🌙" : "🕗"} ${str}`;
  }

  setDay(day) {
    if (this.dayEl) this.dayEl.textContent = `📅 第${day}天`;
  }

  setEnergy(energy, fatigue) {
    if (this.energyEl) {
      const color = energy < 20 ? "#e2564a" : energy < 50 ? "#f0c040" : "#78dc78";
      this.energyEl.innerHTML = `⚡ <span style="color:${color}">${Math.round(energy)}</span>`;
      if (fatigue > 50) this.energyEl.innerHTML += " 😫";
    }
  }

  setPillarSummary(pillars) {
    // 在 HUD 上显示敌方支柱最弱点
    if (!pillars) return;
    const weakest = Object.entries(pillars).sort((a, b) => a[1].value - b[1].value)[0];
    // 暂不显示在 HUD，留给 gangs 面板详细展示
  }

  setHealth(hp) {
    this.healthFill.style.width = `${hp}%`;
  }

  showHint(text) {
    this.hintEl.innerHTML = text;
    this.hintEl.classList.remove("hidden");
  }

  hideHint() {
    this.hintEl.classList.add("hidden");
  }

  /**
   * 分级提示：
   * - 默认（顶部中央）：与玩家强相关的重要事件（被反击/警长出动/被捕/交易等），最多 3 条
   * - opts.side（左侧栏）：弱相关环境事件（NPC 捡东西/受惊逃跑等），最多 4 条
   * - opts.key：3 秒窗口内同 key 合并计数（"…… ×3"），防止刷屏
   */
  toast(text, opts = {}) {
    const container = opts.side ? this.toastSide : this.toastWrap;
    const maxItems = opts.side ? 4 : 3;

    // 同类合并：已存在同 key 提示 → 计数 +1 并刷新寿命
    if (opts.key) {
      for (const el of container.children) {
        if (el.dataset.key === opts.key) {
          const count = parseInt(el.dataset.count || "1", 10) + 1;
          el.dataset.count = String(count);
          el.textContent = text.replace(/ ×\d+$/, "") + ` ×${count}`;
          clearTimeout(el._rmTimer);
          el._rmTimer = setTimeout(() => el.remove(), opts.duration || 3000);
          // 重新播进入动画提示更新
          el.style.animation = "none";
          void el.offsetWidth;
          el.style.animation = "";
          return;
        }
      }
    }

    // 容量上限：挤掉最旧的一条
    while (container.children.length >= maxItems) {
      const oldest = container.firstChild;
      if (oldest._rmTimer) clearTimeout(oldest._rmTimer);
      oldest.remove();
    }

    const el = document.createElement("div");
    el.className = "toast" + (opts.side ? " side" : "");
    el.textContent = text;
    if (opts.key) {
      el.dataset.key = opts.key;
      el.dataset.count = "1";
    }
    container.appendChild(el);
    el._rmTimer = setTimeout(() => el.remove(), opts.duration || 3000);
  }

  // onBuy(itemId) 回调
  openShop(onBuy) {
    this._buyHandler = onBuy;
    this.renderShop();
    this.shopEl.classList.remove("hidden");
  }

  closeShop() {
    this.shopEl.classList.add("hidden");
  }

  get shopOpen() {
    return !this.shopEl.classList.contains("hidden");
  }

  renderShop() {
    this.shopMoneyEl.textContent = `$${this.economy.money}`;
    this.shopItemsEl.innerHTML = "";
    for (const item of SHOP_ITEMS) {
      const owned = this.economy.owned.has(item.id);
      const affordable = this.economy.canAfford(item);
      const row = document.createElement("div");
      row.className = "shop-item" + (owned ? " owned" : "");
      row.innerHTML = `
        <div class="ico">${item.ico}</div>
        <div class="meta">
          <div class="name">${item.name}</div>
          <div class="desc">${item.desc}</div>
        </div>
        <div class="price">$${item.price}</div>
      `;
      const btn = document.createElement("button");
      btn.textContent = owned ? "已拥有" : "购买";
      btn.disabled = owned || !affordable;
      btn.addEventListener("click", () => {
        if (this._buyHandler) this._buyHandler(item.id);
        this.renderShop();
      });
      row.appendChild(btn);
      this.shopItemsEl.appendChild(row);
    }
  }
}
