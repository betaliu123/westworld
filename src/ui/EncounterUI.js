// EncounterUI.js — 遭遇的中央强决策弹窗。
//
// 为什么单独一个组件而不是复用 Conversation.openStoryChoice：
//   openStoryChoice 完成度约 85%，但缺「多段台词逐句推进」「立绘」「选项风险配色」
//   「键盘 1/2/3」「不限时模式」。而遭遇管线的核心体验恰恰是"先说两句再让你选"，
//   硬塞进那个函数会把它改得面目全非（它还被威胁/勒索/招募三条老路径依赖）。
//   所以这里新写一个，Conversation 保持原状不动。
//
// 世界暂停：把 isOpen 挂进 main.js 的 anyModalOpen() 即可，主循环会 early return。

const RISK_CLASS = { low: "pos", medium: "neutral", mid: "neutral", high: "neg" };

export class EncounterUI {
  constructor(deps = {}) {
    this.getAvatar = deps.getAvatar || (() => null);
    this.onChoice = deps.onChoice || (() => {});
    this.onClose = deps.onClose || (() => {});
    this._beats = [];
    this._beatIdx = 0;
    this._choices = [];
    this._open = false;
    this._build();
    this._bind();
  }

  get isOpen() { return this._open; }

  _build() {
    document.getElementById("encounter")?.remove();
    const el = document.createElement("div");
    el.id = "encounter";
    el.className = "modal hidden";
    el.innerHTML = `
      <div class="enc-frame panel-western">
        <div class="enc-header">
          <div class="enc-avatar"><img id="enc-avatar-img" src="" alt="" /></div>
          <div class="enc-who">
            <div id="enc-name">镇民</div>
            <div id="enc-sub"></div>
          </div>
        </div>
        <div class="enc-body">
          <div id="enc-text"></div>
          <div id="enc-more">▼ 点击或按空格继续</div>
        </div>
        <div class="enc-options" id="enc-options"></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.avatarImg = el.querySelector("#enc-avatar-img");
    this.nameEl = el.querySelector("#enc-name");
    this.subEl = el.querySelector("#enc-sub");
    this.textEl = el.querySelector("#enc-text");
    this.moreEl = el.querySelector("#enc-more");
    this.optionsEl = el.querySelector("#enc-options");
  }

  _bind() {
    // 点正文区推进台词（点选项区不推进，否则会误吞点击）
    this.el.querySelector(".enc-body").addEventListener("click", () => this._advance());
    this._onKey = (e) => {
      if (!this._open) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // Esc / 空格 在还有台词时是"继续"，台词播完则是"稍后再说"
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        this._advance();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this._pick(null); // 视作"稍后决定"
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= this._choices.length && this._choicesShown) {
        e.preventDefault();
        e.stopPropagation();
        this._pick(this._choices[n - 1]);
      }
    };
    window.addEventListener("keydown", this._onKey, true); // 捕获阶段，抢在游戏热键之前
  }

  /**
   * 打开遭遇弹窗。
   * @param spec {
   *   name, sub, npcId,
   *   beats: [string]        逐句推进的台词
   *   choices: [{id,label,risk,hint}]
   *   allowDefer             是否给"稍后再说"（默认 true）
   * }
   */
  open(spec = {}) {
    this._beats = Array.isArray(spec.beats) && spec.beats.length ? spec.beats.slice() : ["……"];
    this._beatIdx = 0;
    this._choices = Array.isArray(spec.choices) ? spec.choices.slice(0, 4) : [];
    this._allowDefer = spec.allowDefer !== false;
    this._choicesShown = false;
    // 每次打开可以带自己的回调 —— 遭遇管线与"处置伤者"共用这个弹窗，
    // 各自的结算逻辑不同，不能都挤在构造时那一个 onChoice 里。
    this._handler = typeof spec.onChoice === "function" ? spec.onChoice : null;

    this.nameEl.textContent = spec.name || "镇民";
    this.subEl.textContent = spec.sub || [spec.title, spec.job].filter(Boolean).join(" · ");
    const av = spec.npcId ? this.getAvatar(spec.npcId) : null;
    if (av) { this.avatarImg.src = av; this.avatarImg.style.display = "block"; }
    else { this.avatarImg.removeAttribute("src"); this.avatarImg.style.display = "none"; }

    this.optionsEl.innerHTML = "";
    this._renderBeat();
    this.el.classList.remove("hidden");
    this._open = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _renderBeat() {
    this.textEl.textContent = this._beats[this._beatIdx] || "";
    const last = this._beatIdx >= this._beats.length - 1;
    this.moreEl.style.display = last ? "none" : "block";
    if (last) this._showChoices();
  }

  _advance() {
    if (!this._open) return;
    if (this._beatIdx < this._beats.length - 1) {
      this._beatIdx++;
      this._renderBeat();
      return;
    }
    // 台词播完后再按空格 = 没有选项时直接关；有选项时不做事（必须显式选）
    if (!this._choices.length) this._pick(null);
  }

  _showChoices() {
    if (this._choicesShown) return;
    this._choicesShown = true;
    this.optionsEl.innerHTML = "";
    this._choices.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.className = "conv-opt enc-opt " + (RISK_CLASS[c.risk] || "neutral");
      btn.innerHTML = `<kbd class="enc-key">${i + 1}</kbd> ${escapeHtml(c.label)}`
        + (c.hint ? `<span class="enc-hint">${escapeHtml(c.hint)}</span>` : "")
        + (c.note ? `<span class="enc-note">${escapeHtml(c.note)}</span>` : "");
      btn.addEventListener("click", (e) => { e.stopPropagation(); this._pick(c); });
      this.optionsEl.appendChild(btn);
    });
    if (this._allowDefer) {
      const skip = document.createElement("button");
      skip.className = "conv-opt neutral enc-opt";
      skip.textContent = "⏳ 稍后再说";
      skip.addEventListener("click", (e) => { e.stopPropagation(); this._pick(null); });
      this.optionsEl.appendChild(skip);
    }
  }

  _pick(choice) {
    const wasOpen = this._open;
    const handler = this._handler;
    this.close();
    if (!wasOpen) return;
    const id = choice ? choice.id : null;
    if (handler) handler(id, choice);
    else this.onChoice(id, choice);
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this._handler = null;
    this.el.classList.add("hidden");
    this.onClose();
  }

  dispose() {
    window.removeEventListener("keydown", this._onKey, true);
    this.el?.remove();
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
