// SlotMachine.js — 老虎机小游戏：5/10/25 注额可调，三滚筒顺序停转，按配置赔率派奖。

import { SLOT } from "../config/gameData.js";

function weightedIcon() {
  const total = SLOT.symbols.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const s of SLOT.symbols) {
    r -= s.w;
    if (r <= 0) return s.icon;
  }
  return SLOT.symbols[0].icon;
}

export class SlotMachine {
  constructor(economy, audio, hud) {
    this.economy = economy;
    this.audio = audio;
    this.hud = hud;
    this.modal = document.getElementById("slots");
    this.reels = [
      document.getElementById("slot-reel-0"),
      document.getElementById("slot-reel-1"),
      document.getElementById("slot-reel-2"),
    ];
    this.resultEl = document.getElementById("slot-result");
    this.moneyEl = document.getElementById("slot-money");
    this.spinBtn = document.getElementById("slot-spin");
    this.betWrap = document.getElementById("slot-bets");
    this.bet = SLOT.bets[0];
    this._spinning = false;

    document.getElementById("slots-close").addEventListener("click", () => this.close());
    this.spinBtn.addEventListener("click", () => this.spin());
    for (const b of this.betWrap.querySelectorAll("button")) {
      b.addEventListener("click", () => {
        if (this._spinning) return;
        this.bet = parseInt(b.dataset.bet, 10);
        this._renderBets();
      });
    }
  }

  get isOpen() {
    return this.modal && !this.modal.classList.contains("hidden");
  }

  open() {
    this._renderBets();
    this._renderMoney();
    this.resultEl.textContent = "选注拉杆，祝你好运！";
    for (const r of this.reels) r.textContent = "❔";
    this.modal.classList.remove("hidden");
    if (this.audio) this.audio.cash();
  }

  close() {
    this.modal.classList.add("hidden");
  }

  _renderBets() {
    for (const b of this.betWrap.querySelectorAll("button")) {
      b.classList.toggle("active", parseInt(b.dataset.bet, 10) === this.bet);
    }
  }

  _renderMoney() {
    this.moneyEl.textContent = `$${this.economy.money}`;
  }

  spin() {
    if (this._spinning) return;
    if (this.economy.money < this.bet) {
      this.resultEl.textContent = "现金不足，换个小注或者去赚点钱再来！";
      if (this.hud) this.hud.toast("💸 钱不够，老虎机不赊账", { side: true });
      return;
    }
    this._spinning = true;
    this.spinBtn.disabled = true;
    this.economy.addMoney(-this.bet);
    this._renderMoney();
    if (this.audio) this.audio.coin();
    this.resultEl.textContent = "滚动中……";

    const finals = [weightedIcon(), weightedIcon(), weightedIcon()];
    const stopTimes = [700, 1200, 1700];
    // 每个滚筒：快速轮播图标，到点定格
    this.reels.forEach((reel, i) => {
      reel.classList.add("spinning");
      const cycle = setInterval(() => {
        reel.textContent = weightedIcon();
      }, 80);
      setTimeout(() => {
        clearInterval(cycle);
        reel.textContent = finals[i];
        reel.classList.remove("spinning");
        if (this.audio) this.audio.newspaper();
        if (i === 2) this._settle(finals);
      }, stopTimes[i]);
    });
  }

  _settle(finals) {
    const [a, b, c] = finals;
    let payout = 0;
    let msg = "";
    if (a === b && b === c) {
      payout = this.bet * (SLOT.triplePay[a] || 10);
      msg = a === "7️⃣" ? `🎰 头奖 777！！！` : `🎉 三连 ${a}！`;
    } else {
      const cherries = finals.filter((x) => x === "🍒").length;
      if (cherries === 2) {
        payout = this.bet * SLOT.pairCherryPay;
        msg = "🍒 双樱桃小奖";
      }
    }
    if (payout > 0) {
      this.economy.addMoney(payout);
      if (this.audio) this.audio.cash();
      this.resultEl.textContent = `${msg} 赢得 $${payout}！`;
      if (this.hud) this.hud.toast(`🎰 老虎机 +$${payout}`, { key: "slotwin" });
    } else {
      this.resultEl.textContent = "没中，再来一把？";
    }
    this._renderMoney();
    this._spinning = false;
    this.spinBtn.disabled = false;
  }
}
