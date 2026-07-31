// Economy.js — 金钱与资产（车/房）状态；商店购买逻辑。纯状态 + 事件回调。

import { SHOP_ITEMS } from "../config/gameData.js";
export { SHOP_ITEMS };

export class Economy {
  constructor() {
    this.money = 80;
    this.owned = new Set();     // 已购买的商店物品 id
    this.ownedProperties = new Set(); // 已购买的地图房产 id（就近购买）
    this.tempCars = 0;          // 车钥匙换来的临时车次数（仅统计展示）
    this.stocks = {};            // 股票持仓 { stockId: { shares, avgBuyPrice, totalCost } }
    this.listeners = [];
  }

  onChange(cb) {
    this.listeners.push(cb);
  }

  _emit() {
    for (const cb of this.listeners) cb(this);
  }

  addMoney(amount) {
    this.money += amount;
    this._emit();
  }

  get houseCount() {
    const shopHouses = [...this.owned].filter((id) => SHOP_ITEMS.find((s) => s.id === id)?.kind === "house").length;
    return shopHouses + this.ownedProperties.size;
  }

  get carCount() {
    return [...this.owned].filter((id) => SHOP_ITEMS.find((s) => s.id === id)?.kind === "vehicle").length;
  }

  canAfford(item) {
    // 消耗品（子弹）可重复买，不看"已拥有"
    if (item.kind === "ammo") return this.money >= item.price;
    return this.money >= item.price && !this.owned.has(item.id);
  }

  buy(itemId) {
    const item = SHOP_ITEMS.find((s) => s.id === itemId);
    if (!item || this.money < item.price) return null;
    // 消耗品（子弹）可重复购买，不进"已拥有"
    if (item.kind === "ammo") {
      this.money -= item.price;
      this._emit();
      return item;
    }
    if (this.owned.has(itemId)) return null;
    this.money -= item.price;
    this.owned.add(itemId);
    this._emit();
    return item;
  }

  // 就近购买地图上的房产（property 由 Town 生成，含 id/name/price）
  ownsProperty(id) {
    return this.ownedProperties.has(id);
  }

  buyProperty(property) {
    if (!property || this.ownedProperties.has(property.id) || this.money < property.price) return false;
    this.money -= property.price;
    this.ownedProperties.add(property.id);
    this._emit();
    return true;
  }

  grantTempCar() {
    this.tempCars += 1;
    this._emit();
  }

  // ---- 股票持仓 ----
  buyStock(stockId, shares, price) {
    if (!this.stocks[stockId]) {
      this.stocks[stockId] = { shares: 0, avgBuyPrice: 0, totalCost: 0 };
    }
    const holding = this.stocks[stockId];
    holding.totalCost += price * shares;
    holding.shares += shares;
    holding.avgBuyPrice = holding.shares > 0 ? holding.totalCost / holding.shares : 0;
    this._emit();
  }

  sellStock(stockId, shares) {
    const holding = this.stocks[stockId];
    if (!holding || holding.shares < shares) return false;
    holding.shares -= shares;
    holding.totalCost -= holding.avgBuyPrice * shares;
    if (holding.shares <= 0) {
      delete this.stocks[stockId];
    }
    this._emit();
    return true;
  }

  getStockHolding(stockId) {
    return this.stocks[stockId]?.shares || 0;
  }

  getStockPortfolio() {
    return { ...this.stocks };
  }

  getStockValue(prices) {
    let total = 0;
    for (const [id, holding] of Object.entries(this.stocks)) {
      const price = prices[id]?.currentPrice || 0;
      total += price * holding.shares;
    }
    return Math.round(total);
  }
}
