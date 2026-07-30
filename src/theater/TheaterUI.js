// TheaterUI.js — AI 剧场界面
// 布局要求：自由输入框在整个界面最下方；事件区域交互按钮在输入框上方；
//           NPC 个人交互按钮不在这里，已并入 InteractionSystem 原有按钮区。

export class TheaterUI {
  constructor(deps = {}) {
    this.onSubmitText = deps.onSubmitText || (() => {});
    this.onPickChoice = deps.onPickChoice || (() => {});
    this.input = deps.input || null; // 用于失焦后重新锁定指针

    this._build();
    this._bind();
    this.setEventActive(false);
  }

  _build() {
    const bar = document.createElement("div");
    bar.id = "theater-bar";
    bar.innerHTML = `
      <div id="theater-hint"></div>
      <div id="theater-choices"></div>
      <div id="theater-input-row">
        <span id="theater-tag">🎭</span>
        <input id="theater-input" type="text" maxlength="60" autocomplete="off" spellcheck="false"
               placeholder="对他们说点什么…（回车说出口，Esc 回到操作）" />
        <button id="theater-send" type="button">说</button>
      </div>
    `;
    document.body.appendChild(bar);

    this.bar = bar;
    this.hintEl = bar.querySelector("#theater-hint");
    this.choicesEl = bar.querySelector("#theater-choices");
    this.inputEl = bar.querySelector("#theater-input");
    this.sendBtn = bar.querySelector("#theater-send");
  }

  _bind() {
    const submit = () => {
      const text = this.inputEl.value.trim();
      if (!text) return;
      this.inputEl.value = "";
      this.onSubmitText(text);
    };

    this.sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submit();
      this.inputEl.focus();
    });

    this.inputEl.addEventListener("keydown", (e) => {
      // 中文输入法组合中不要抢回车
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.inputEl.blur();
      }
      // 其余按键留给输入框，Input.js 已做打字守卫
      e.stopPropagation();
    });

    // 点输入框时释放指针锁，否则鼠标锁在画面里没法点
    this.inputEl.addEventListener("focus", () => {
      if (document.pointerLockElement) document.exitPointerLock();
      this.bar.classList.add("focused");
    });
    this.inputEl.addEventListener("blur", () => this.bar.classList.remove("focused"));
    // 阻止点 UI 触发开枪/锁定
    this.bar.addEventListener("mousedown", (e) => e.stopPropagation());
  }

  /** 有没有正在进行的事件（只影响提示文案，输入框始终在底部可见） */
  setEventActive(active, title = "") {
    this.bar.classList.toggle("event-live", !!active);
    if (active) {
      this.hintEl.textContent = `正在上演：${title}`;
      this.hintEl.style.display = "block";
    } else {
      this.hintEl.textContent = "";
      this.hintEl.style.display = "none";
      this.setChoices([], "");
    }
  }

  /** 事件区域交互按钮（输入框上方） */
  setChoices(choices = [], hint = "") {
    this.choicesEl.innerHTML = "";
    if (!choices.length) {
      this.choicesEl.style.display = "none";
      document.body.classList.remove("theater-choices-on");
      return;
    }
    if (hint) this.hintEl.textContent = hint;
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `theater-choice risk-${c.risk || "medium"}`;
      btn.innerHTML = `<span class="tc-icon">${c.icon || "▶"}</span><span class="tc-label">${c.label}</span>`;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setChoices([], "");
        this.onPickChoice(c.id);
      });
      this.choicesEl.appendChild(btn);
    }
    this.choicesEl.style.display = "flex";
    document.body.classList.add("theater-choices-on");
  }

  /** 等待 LLM 衔接期间的反馈（3-7 秒，必须让玩家知道没卡住） */
  setPending(on) {
    this.bar.classList.toggle("pending", !!on);
    this.inputEl.disabled = !!on;
    this.sendBtn.disabled = !!on;
    if (on) {
      this._hintBackup = this.hintEl.textContent;
      this.hintEl.textContent = "他们正在琢磨你的话…";
      this.hintEl.style.display = "block";
    } else if (this._hintBackup != null) {
      this.hintEl.textContent = this._hintBackup;
      this._hintBackup = null;
    }
  }

  /** 结局横幅 */
  showOutcome(oc) {
    const el = document.createElement("div");
    el.className = "theater-outcome";
    el.innerHTML = `
      <div class="to-title">${oc.title || "落幕"}</div>
      ${(oc.lines || []).map((l) => `<div class="to-line">${l}</div>`).join("")}
    `;
    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 600);
    }, 5200);
  }

  appendLog() {
    /* 纪实由 Director 保存，暂不铺 UI 面板；需要时 window.__ww.theater.recentLog() 查看 */
  }

  get typing() {
    return document.activeElement === this.inputEl;
  }
}
