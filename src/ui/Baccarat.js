// Baccarat.js — 百家乐小游戏：闲 1:1 / 庄 1:0.95 / 和 1:8，标准补牌规则。

import { BACCARAT } from "../config/gameData.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function drawCard() {
  const rank = Math.floor(Math.random() * 13); // 0=A .. 12=K
  const suit = SUITS[Math.floor(Math.random() * 4)];
  const value = rank === 0 ? 1 : rank >= 9 ? 0 : rank + 1; // A=1, 2-9 面值, 10/J/Q/K=0
  const red = suit === "♥" || suit === "♦";
  return { label: RANKS[rank] + suit, value, red };
}

const point = (cards) => cards.reduce((s, c) => s + c.value, 0) % 10;

// 标准百家乐补牌规则：返回最终两手牌
function dealBaccarat() {
  const player = [drawCard(), drawCard()];
  const banker = [drawCard(), drawCard()];
  let p = point(player);
  let b = point(banker);
  // 天牌 8/9：双方停牌
  if (p < 8 && b < 8) {
    let playerThird = null;
    if (p <= 5) {
      playerThird = drawCard();
      player.push(playerThird);
      p = point(player);
    }
    if (!playerThird) {
      // 闲停牌：庄 0-5 补
      if (b <= 5) {
        banker.push(drawCard());
      }
    } else {
      // 闲有第三张：庄按表补
      const t = playerThird.value;
      const bankerDraw =
        b <= 2 ||
        (b === 3 && t !== 8) ||
        (b === 4 && t >= 2 && t <= 7) ||
        (b === 5 && t >= 4 && t <= 7) ||
        (b === 6 && (t === 6 || t === 7));
      if (bankerDraw) banker.push(drawCard());
    }
  }
  return { player, banker, p: point(player), b: point(banker) };
}

export class Baccarat {
  constructor(economy, audio, hud) {
    this.economy = economy;
    this.audio = audio;
    this.hud = hud;
    this.modal = document.getElementById("baccarat");
    this.moneyEl = document.getElementById("bac-money");
    this.playerEl = document.getElementById("bac-player-cards");
    this.bankerEl = document.getElementById("bac-banker-cards");
    this.playerPtsEl = document.getElementById("bac-player-pts");
    this.bankerPtsEl = document.getElementById("bac-banker-pts");
    this.resultEl = document.getElementById("bac-result");
    this.dealBtn = document.getElementById("bac-deal");
    this.chipWrap = document.getElementById("bac-chips");
    this.sideWrap = document.getElementById("bac-sides");
    this.chip = BACCARAT.chips[0];
    this.side = "player";
    this._dealing = false;

    document.getElementById("bac-close").addEventListener("click", () => this.close());
    this.dealBtn.addEventListener("click", () => this.deal());
    for (const b of this.chipWrap.querySelectorAll("button")) {
      b.addEventListener("click", () => {
        if (this._dealing) return;
        this.chip = parseInt(b.dataset.chip, 10);
        this._renderChoices();
      });
    }
    for (const b of this.sideWrap.querySelectorAll("button")) {
      b.addEventListener("click", () => {
        if (this._dealing) return;
        this.side = b.dataset.side;
        this._renderChoices();
      });
    }
  }

  get isOpen() {
    return this.modal && !this.modal.classList.contains("hidden");
  }

  open() {
    this._renderChoices();
    this._renderMoney();
    this.playerEl.innerHTML = "";
    this.bankerEl.innerHTML = "";
    this.playerPtsEl.textContent = "";
    this.bankerPtsEl.textContent = "";
    this.resultEl.textContent = "选边与筹码，开牌！闲 1:1 · 庄 1:0.95 · 和 1:8";
    this.modal.classList.remove("hidden");
    if (this.audio) this.audio.cash();
  }

  close() {
    this.modal.classList.add("hidden");
  }

  _renderChoices() {
    for (const b of this.chipWrap.querySelectorAll("button")) {
      b.classList.toggle("active", parseInt(b.dataset.chip, 10) === this.chip);
    }
    for (const b of this.sideWrap.querySelectorAll("button")) {
      b.classList.toggle("active", b.dataset.side === this.side);
    }
  }

  _renderMoney() {
    this.moneyEl.textContent = `$${this.economy.money}`;
  }

  _cardEl(card) {
    const el = document.createElement("div");
    el.className = "bac-card" + (card.red ? " red" : "");
    el.textContent = card.label;
    return el;
  }

  deal() {
    if (this._dealing) return;
    if (this.economy.money < this.chip) {
      this.resultEl.textContent = "现金不足，换个小筹码或者去赚点钱再来！";
      if (this.hud) this.hud.toast("💸 钱不够，赌场不赊账", { side: true });
      return;
    }
    this._dealing = true;
    this.dealBtn.disabled = true;
    this.economy.addMoney(-this.chip);
    this._renderMoney();
    if (this.audio) this.audio.coin();

    const { player, banker, p, b } = dealBaccarat();
    this.playerEl.innerHTML = "";
    this.bankerEl.innerHTML = "";
    this.playerPtsEl.textContent = "";
    this.bankerPtsEl.textContent = "";
    this.resultEl.textContent = "发牌中……";

    // 逐张发牌动画：按 闲1 庄1 闲2 庄2 [补牌] 顺序展示
    const steps = [];
    const p2 = player.slice(0, 2);
    const b2 = banker.slice(0, 2);
    steps.push(() => this.playerEl.appendChild(this._cardEl(p2[0])));
    steps.push(() => this.bankerEl.appendChild(this._cardEl(b2[0])));
    steps.push(() => this.playerEl.appendChild(this._cardEl(p2[1])));
    steps.push(() => this.bankerEl.appendChild(this._cardEl(b2[1])));
    if (player[2]) steps.push(() => this.playerEl.appendChild(this._cardEl(player[2])));
    if (banker[2]) steps.push(() => this.bankerEl.appendChild(this._cardEl(banker[2])));

    steps.forEach((fn, i) => {
      setTimeout(() => {
        fn();
        if (this.audio) this.audio.newspaper();
        // 每步刷新点数（只显示已发出的牌）
        const shownP = this.playerEl.children.length;
        const shownB = this.bankerEl.children.length;
        this.playerPtsEl.textContent = `闲 ${point(player.slice(0, shownP))} 点`;
        this.bankerPtsEl.textContent = `庄 ${point(banker.slice(0, shownB))} 点`;
      }, 350 * (i + 1));
    });

    setTimeout(() => {
      this._settle(p, b);
    }, 350 * (steps.length + 1) + 400);
  }

  _settle(p, b) {
    const outcome = p > b ? "player" : b > p ? "banker" : "tie";
    let payout = 0;
    if (this.side === outcome) {
      payout = Math.round(this.chip * (1 + (outcome === "player" ? BACCARAT.playerPay : outcome === "banker" ? BACCARAT.bankerPay : BACCARAT.tiePay)));
    } else if (outcome === "tie") {
      payout = this.chip; // 押闲/庄遇和退本金
    }
    const outcomeText = outcome === "player" ? `闲 ${p} 点胜` : outcome === "banker" ? `庄 ${b} 点胜` : `和局 ${p}:${b}`;
    if (payout > 0) {
      this.economy.addMoney(payout);
      if (this.audio) this.audio.cash();
    }
    const net = payout - this.chip;
    this.resultEl.textContent =
      net > 0 ? `${outcomeText}，你赢了 $${net}！` : net === 0 ? `${outcomeText}，退还本金` : `${outcomeText}，再接再厉`;
    if (net > 0 && this.hud) this.hud.toast(`🃏 百家乐 +$${net}`, { key: "bacwin" });
    this._renderMoney();
    this._dealing = false;
    this.dealBtn.disabled = false;
  }
}
