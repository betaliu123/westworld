// AmmoSystem.js — 子弹的持有、消耗与补给
// 规则：开枪耗子弹；子弹可以在商店/商人处买，也能从偷窃、搜刮、掉落里捡到。

export const AMMO = {
  startAmmo: 12,        // 开局携带
  shopPrice: 6,         // 商店一组 6 发
  shopPricePerRound: 1, // 单发折算价（商人出售用）
  merchantPrice: 5,     // 商人 NPC 随身卖 6 发的价格（比商店贵一点）
  pickpocketChance: 0.25, // 偷窃 NPC 时带子弹的概率
  pickpocketRounds: [2, 4], // 偷窃 NPC 给的子弹数范围
  dropChance: 0.5,      // 击倒带枪 NPC 掉子弹的概率
  dropRounds: [3, 6],   // 击倒带枪 NPC 掉的子弹数范围
};

export class AmmoSystem {
  constructor(deps = {}) {
    this.economy = deps.economy;
    this.hud = deps.hud;
    this.audio = deps.audio || null;
    this.onChange = deps.onChange || null;
    this._ammo = AMMO.startAmmo;
  }

  get ammo() { return this._ammo; }

  hasRounds(n = 1) { return this._ammo >= n; }

  /** 开枪时消耗一发。返回是否真的有子弹可打 */
  tryConsume() {
    if (this._ammo <= 0) {
      this.hud?.toast?.("🔫 没子弹了", { key: "no-ammo" });
      return false;
    }
    this._ammo--;
    this._emit();
    return true;
  }

  addRounds(n, source = "") {
    if (!n || n <= 0) return;
    this._ammo += n;
    this._emit();
    if (source) this.hud?.toast?.(`🔫 子弹 +${n}（${source}）`, { side: true, key: "ammo-get" });
  }

  /** 从偷窃/搜刮/掉落里可能捡到子弹（各调用点传不同概率） */
  rollPickup(chance, range, source) {
    if (Math.random() > chance) return 0;
    const n = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    this.addRounds(n, source);
    return n;
  }

  _emit() {
    if (this.onChange) this.onChange(this._ammo);
  }
}
