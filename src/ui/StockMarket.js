// StockMarket.js — 股票交易面板：银行窗口交互，5支股票。

import { STOCK_DEFS } from "../config/gameData.js";

export class StockMarket {
  constructor(worldState, economy, audio) {
    this.worldState = worldState;
    this.economy = economy;
    this.audio = audio;
    this.modal = document.getElementById("stock-market");

    document.getElementById("stock-close").addEventListener("click", () => this.close());

    this._selectedStock = null;
    this._tradeMode = null; // 'buy' | 'sell'
  }

  get isOpen() {
    return this.modal && !this.modal.classList.contains("hidden");
  }

  get prices() {
    if (!this.worldState.state.stockPrices || Object.keys(this.worldState.state.stockPrices).length === 0) {
      this.worldState.state.stockPrices = {};
      for (const def of STOCK_DEFS) {
        this.worldState.state.stockPrices[def.id] = {
          currentPrice: def.initialPrice,
          priceHistory: [def.initialPrice],
        };
      }
    }
    return this.worldState.state.stockPrices;
  }

  open() {
    this._selectedStock = null;
    this._tradeMode = null;
    this._render();
    this.modal.classList.remove("hidden");
  }

  close() {
    this.modal.classList.add("hidden");
    this._selectedStock = null;
  }

  selectStock(stockId) {
    this._selectedStock = stockId;
    this._tradeMode = null;
    this._render();
  }

  setTradeMode(mode) {
    this._tradeMode = mode;
    this._render();
  }

  _executeTrade() {
    if (!this._selectedStock || !this._tradeMode) return;
    const qtyEl = document.getElementById("stock-qty");
    const qty = parseInt(qtyEl ? qtyEl.value : "0", 10) || 0;
    if (qty <= 0) return;

    const price = this.prices[this._selectedStock].currentPrice;
    const total = Math.round(price * qty);

    if (this._tradeMode === "buy") {
      if (this.economy.money < total) {
        this._showError("现金不足！");
        return;
      }
      this.economy.addMoney(-total);
      this.economy.buyStock(this._selectedStock, qty, price);
      if (this.audio && this.audio.cash) this.audio.cash();
    } else {
      const holdings = this.economy.getStockHolding(this._selectedStock);
      if (holdings < qty) {
        this._showError("持股不足！");
        return;
      }
      this.economy.addMoney(total);
      this.economy.sellStock(this._selectedStock, qty, price);
      if (this.audio && this.audio.coin) this.audio.coin();
    }

    this._tradeMode = null;
    this._render();
  }

  /**
   * Daily price settlement. Called from DailySimulation.
   */
  settleDay(newspaperArticles, factionActions) {
    const newsCategories = (newspaperArticles || []).map(a => a.category || "daily");

    for (const def of STOCK_DEFS) {
      const data = this.prices[def.id];
      if (!data) continue;

      let change = (Math.random() - 0.5) * 2 * def.baseVolatility;

      // News impact
      for (const cat of newsCategories) {
        const sens = def.newsSensitivity[cat] || 0;
        change += sens;
      }

      // Black Hoof aggression → bank dips
      if (def.id === "bank" && factionActions && factionActions.length > 0) {
        change -= 0.02;
      }

      change = Math.max(-0.15, Math.min(0.15, change));
      const newPrice = Math.max(1, Math.round(data.currentPrice * (1 + change)));
      data.currentPrice = newPrice;
      data.priceHistory.push(newPrice);
      if (data.priceHistory.length > 10) data.priceHistory.shift();
    }
  }

  _render() {
    const body = document.getElementById("stock-body");
    if (!body) return;

    const portfolio = this.economy.getStockPortfolio ? this.economy.getStockPortfolio() : {};
    const totalValue = this.economy.getStockValue ? this.economy.getStockValue(this.prices) : 0;

    let html = "";

    // Portfolio summary
    html += `<div class="stock-summary">
      <div>现金: <span class="ss-gold">$${this.economy.money}</span></div>
      <div>股票市值: <span class="ss-gold">$${totalValue}</span></div>
      <div>总资产: <span class="ss-gold">$${this.economy.money + totalValue}</span></div>
    </div>`;

    // Stock list
    html += `<div class="stock-list">`;
    for (const def of STOCK_DEFS) {
      const data = this.prices[def.id];
      if (!data) continue;
      const price = data.currentPrice;
      const prevPrice = data.priceHistory.length >= 2
        ? data.priceHistory[data.priceHistory.length - 2]
        : price;
      const change = price - prevPrice;
      const changePct = prevPrice ? (change / prevPrice * 100) : 0;
      const changeColor = change > 0 ? "var(--ok)" : change < 0 ? "var(--danger)" : "#8a8a8a";
      const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "─";
      const holdings = portfolio[def.id] || { shares: 0, avgBuyPrice: 0 };
      const selected = this._selectedStock === def.id;
      const holdingVal = holdings.shares > 0 ? price * holdings.shares : 0;

      html += `<div class="stock-row${selected ? ' selected' : ''}" data-stock="${def.id}">
        <div class="stock-info">
          <div class="stock-name">${def.name}</div>
          <div class="stock-desc">${def.desc}</div>
        </div>
        <div class="stock-price">
          <div class="stock-price-val">$${price}</div>
          <div class="stock-price-change" style="color:${changeColor}">${arrow} ${Math.abs(changePct).toFixed(1)}%</div>
        </div>
        <div class="stock-holding">
          ${holdings.shares > 0 ? `${holdings.shares}股 · $${holdingVal}` : '-'}
        </div>
      </div>`;
    }
    html += `</div>`;

    // Price chart for selected stock
    if (this._selectedStock) {
      html += `<div class="stock-chart"><canvas id="stock-chart-canvas" width="500" height="100"></canvas></div>`;
    }

    // Trade panel
    if (this._selectedStock && this._tradeMode) {
      const def = STOCK_DEFS.find(s => s.id === this._selectedStock);
      if (def) {
        const price = this.prices[this._selectedStock].currentPrice;
        const holdings = portfolio[this._selectedStock] || { shares: 0 };
        const maxBuy = Math.floor(this.economy.money / price);

        html += `<div class="stock-trade">
          <div class="stock-trade-header">
            ${this._tradeMode === "buy" ? "买入" : "卖出"} ${def.name}
            <span class="st-price">$${price}/股</span>
            ${this._tradeMode === "sell" ? `<span class="st-holding">持有: ${holdings.shares}股</span>` : ''}
          </div>
          <div class="stock-trade-row">
            <label>数量:</label>
            <input type="number" id="stock-qty" min="1" max="${this._tradeMode === 'buy' ? maxBuy : holdings.shares}" value="1" />
            <span>× $${price} = <b style="color:var(--gold)">$${price}</b></span>
          </div>
          <div class="stock-trade-actions">
            <button id="stock-trade-btn">${this._tradeMode === "buy" ? "确认买入" : "确认卖出"}</button>
            <button id="stock-cancel-btn">取消</button>
          </div>
          <div id="stock-error"></div>
        </div>`;
      }
    }

    // Action buttons for selected stock
    if (this._selectedStock && !this._tradeMode) {
      html += `<div class="stock-actions">
        <button class="sab-buy" id="stock-btn-buy">买入</button>
        <button class="sab-sell" id="stock-btn-sell">卖出</button>
      </div>`;
    }

    body.innerHTML = html;

    // Bind events
    for (const row of body.querySelectorAll(".stock-row")) {
      row.addEventListener("click", () => this.selectStock(row.dataset.stock));
    }

    const btnBuy = document.getElementById("stock-btn-buy");
    if (btnBuy) btnBuy.addEventListener("click", () => this.setTradeMode("buy"));
    const btnSell = document.getElementById("stock-btn-sell");
    if (btnSell) btnSell.addEventListener("click", () => this.setTradeMode("sell"));

    const tradeBtn = document.getElementById("stock-trade-btn");
    if (tradeBtn) tradeBtn.addEventListener("click", () => this._executeTrade());

    const cancelBtn = document.getElementById("stock-cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => { this._tradeMode = null; this._render(); });

    // Draw chart
    if (this._selectedStock) {
      setTimeout(() => this._drawChart(), 20);
    }
  }

  _drawChart() {
    const canvas = document.getElementById("stock-chart-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = this.prices[this._selectedStock];
    if (!data) return;
    const history = data.priceHistory;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (history.length < 2) return;

    const min = Math.min(...history) * 0.9;
    const max = Math.max(...history) * 1.1;
    const range = max - min || 1;
    const stepX = canvas.width / (history.length - 1);

    // Grid
    ctx.strokeStyle = "rgba(200,151,58,.2)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = canvas.height * (i / 4);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Line
    const firstPrice = history[0];
    const lastPrice = history[history.length - 1];
    const color = lastPrice >= firstPrice ? "#78dc78" : "#e2564a";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = i * stepX;
      const y = canvas.height - ((history[i] - min) / range) * canvas.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _showError(msg) {
    const el = document.getElementById("stock-error");
    if (el) {
      el.textContent = msg;
      el.style.cssText = "color:var(--danger);font-size:13px;margin-top:8px;";
      setTimeout(() => { if (el) el.textContent = ""; }, 2000);
    }
  }
}
