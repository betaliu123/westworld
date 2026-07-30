// Conversation.js — NPC 对话面板：正向（问候/称赞）/负向（威胁/勒索抢劫）选项，
// 带耐心倒计时条（超时 NPC 不耐烦走人），展示 NPC 回应、情报与帮派归属。

export class Conversation {
  constructor(audio) {
    this.audio = audio;
    this.modal = document.getElementById("conversation");
    this.nameEl = document.getElementById("conv-name");
    this.replyEl = document.getElementById("conv-reply");
    this.optionsEl = document.getElementById("conv-options");
    this.patienceFill = document.getElementById("conv-patience-fill");
    this.current = null;      // 当前对话的 NPC
    this._onAction = null;    // (kind) => void
    this._onTimeout = null;   // () => void  超时/NPC 走人回调

    this.patience = 0;        // 剩余耐心（秒）
    this.patienceMax = 8;
    this._closing = false;

    const close = document.getElementById("conv-close");
    if (close) close.addEventListener("click", () => this.close());
  }

  get isOpen() {
    return this.modal && !this.modal.classList.contains("hidden");
  }

  // npc: NPC 实例；onAction(kind)；onTimeout() NPC 因不耐烦离开
  open(npc, onAction, onTimeout) {
    this.current = npc;
    this._onAction = onAction;
    this._onTimeout = onTimeout;
    this._closing = false;
    // 社交型更有耐心
    this.patienceMax = 6 + (npc.personality.sociability || 0.5) * 6;
    this.patience = this.patienceMax;

    const owner = npc.phone?.owner || "镇民";
    const job = npc.personality.job;
    const gang = npc.personality.gang ? ` · ${npc.personality.gang}` : "";
    this.nameEl.textContent = `${owner} · ${job}${gang}`;
    this.replyEl.textContent = "（对方看着你，等你开口……）";
    this.replyEl.className = "conv-reply";
    this._renderOptions();
    this._updatePatienceBar();
    this.modal.classList.remove("hidden");
  }

  _renderOptions() {
    this.optionsEl.innerHTML = "";
    const opts = [
      { kind: "greet", label: "😊 打个招呼", cls: "pos" },
      { kind: "praise", label: "👍 称赞对方", cls: "pos" },
      { kind: "recruit", label: "🤝 拉拢入伙", cls: "neutral" },
      { kind: "threat", label: "😠 出言威胁", cls: "neg" },
      { kind: "extort", label: "🔫 勒索抢劫", cls: "neg" },
      { kind: "leave", label: "🚶 结束对话", cls: "neutral" },
    ];
    for (const o of opts) {
      const btn = document.createElement("button");
      btn.className = "conv-opt " + o.cls;
      btn.textContent = o.label;
      btn.addEventListener("click", () => {
        if (this._closing) return;
        if (o.kind === "leave") {
          this.close();
          return;
        }
        // 每次交互刷新耐心（对方还在听）
        this.patience = Math.min(this.patienceMax, this.patience + 2);
        if (this._onAction) this._onAction(o.kind);
      });
      this.optionsEl.appendChild(btn);
    }
  }

  _updatePatienceBar() {
    if (this.patienceFill) {
      const pct = Math.max(0, (this.patience / this.patienceMax) * 100);
      this.patienceFill.style.width = `${pct}%`;
      this.patienceFill.style.background = pct < 30 ? "#e2564a" : pct < 60 ? "#ffce54" : "#78dc78";
    }
  }

  // 每帧调用（即使世界暂停）：倒计时耐心，耗尽则 NPC 不耐烦走人
  update(dt) {
    if (!this.isOpen || this._closing) return;
    this.patience -= dt;
    this._updatePatienceBar();
    if (this.patience <= 0) {
      this._closing = true;
      this.replyEl.textContent = "（对方不耐烦地摆摆手，转身走了。）";
      this.replyEl.className = "conv-reply neutral";
      const cb = this._onTimeout;
      setTimeout(() => { this.close(); if (cb) cb(); }, 1000);
    }
  }

  // 显示 NPC 的回应
  showReply(result) {
    this.replyEl.textContent = result.reply + (result.tip ? `\n💡 ${result.tip}` : "");
    this.replyEl.className = "conv-reply " + (result.mood || "neutral");
    if (result.mood === "angry" || result.mood === "scared") {
      // 负面回应后对话即将中断
      this._closing = true;
      setTimeout(() => this.close(), 1200);
    }
  }

  close() {
    this.modal.classList.add("hidden");
    if (this.current) {
      this.current.brain.endTalk();
      this.current = null;
    }
    this._onAction = null;
    this._onTimeout = null;
  }

  /**
   * P3: 展示 StoryTree 玩家选项（替代 NPC 对话）。
   * @param {object} storyPrompt - { title, description, choices: [{id, label}] }
   * @param {function} onChoice - (choiceId) => void
   */
  openStoryChoice(storyPrompt, onChoice) {
    this.current = null;
    this._onAction = null;
    this._onTimeout = null;
    this._closing = false;
    this.patience = 30; // StoryTree 选择有足够时间
    this.patienceMax = 30;

    this.nameEl.textContent = `📖 ${storyPrompt.title || "重要抉择"}`;
    this.replyEl.textContent = storyPrompt.description || "你面临一个重要的选择……";
    this.replyEl.className = "conv-reply";

    this.optionsEl.innerHTML = "";
    for (const choice of (storyPrompt.choices || [])) {
      const btn = document.createElement("button");
      btn.className = "conv-opt pos";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        this.close();
        if (onChoice) onChoice(choice.id);
      });
      this.optionsEl.appendChild(btn);
    }

    // 添加"稍后决定"选项
    const skipBtn = document.createElement("button");
    skipBtn.className = "conv-opt neutral";
    skipBtn.textContent = "⏳ 稍后决定";
    skipBtn.addEventListener("click", () => this.close());
    this.optionsEl.appendChild(skipBtn);

    this.patience = this.patienceMax;
    this._updatePatienceBar();
    this.modal.classList.remove("hidden");
  }
}
