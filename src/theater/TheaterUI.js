// TheaterUI.js — AI 剧场界面
// 布局要求：自由输入框在整个界面最下方；事件区域交互按钮在输入框上方；
//           NPC 个人交互按钮不在这里，已并入 InteractionSystem 原有按钮区。
// 交互约定：回车展开输入框并直接进入输入态；Esc 收起回到操作；1/2/3/4 选事件选项。

export class TheaterUI {
  constructor(deps = {}) {
    this.onSubmitText = deps.onSubmitText || (() => {});
    this.onPickChoice = deps.onPickChoice || (() => {});
    this.canOpen = deps.canOpen || (() => true); // 有弹窗/在载具里时不抢按键
    this.onExpand = deps.onExpand || null;       // 展开输入框时通知外部（锁定说话对象）
    this.onCollapse = deps.onCollapse || null;
    this.input = deps.input || null;

    this._choices = [];
    this._build();
    this._bind();
    this.setEventActive(false);
    // 初始就是折叠态，但不能走 collapse() —— 那会触发 onCollapse 回调，
    // 而此时 main.js 里的对话相关变量还没初始化（会撞 TDZ 直接崩在启动阶段）
    this.bar.classList.add("collapsed");
  }

  _build() {
    // 幂等：重复构造（热重载/二次实例化）时先清掉旧的，
    // 否则文档里出现重复 id，querySelector("#id") 会解析到旧实例的元素并返回 null
    document.getElementById("theater-bar")?.remove();

    const bar = document.createElement("div");
    bar.id = "theater-bar";
    bar.innerHTML = `
      <div id="theater-hint"></div>
      <div id="theater-choices"></div>
      <div id="theater-collapsed"><kbd>⏎</kbd> 说话</div>
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
    this.collapsedEl = bar.querySelector("#theater-collapsed");
    this.inputEl = bar.querySelector("#theater-input");
    this.sendBtn = bar.querySelector("#theater-send");
  }

  _bind() {
    const submit = () => {
      const text = this.inputEl.value.trim();
      if (!text) { this.collapse(); return; }
      this.inputEl.value = "";
      this.onSubmitText(text);
    };

    this.sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submit();
      this.inputEl.focus();
    });

    this.inputEl.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return; // 中文输入法组合中不抢回车
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.collapse();
      }
      e.stopPropagation(); // 其余按键留给输入框
    });

    this.inputEl.addEventListener("focus", () => this.bar.classList.add("focused"));
    this.inputEl.addEventListener("blur", () => {
      this.bar.classList.remove("focused");
      if (!this.inputEl.value.trim()) this.collapse();
    });
    this.collapsedEl.addEventListener("click", () => this.expand());
    this.bar.addEventListener("mousedown", (e) => e.stopPropagation());

    // 全局按键：回车展开输入、数字键选事件选项
    this._onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return; // 输入框自己的 handler 负责
      if (!this.canOpen()) return;

      if (e.key === "Enter") {
        e.preventDefault();
        this.expand();
        return;
      }
      // 1/2/3/4 对应事件选项
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= this._choices.length) {
        e.preventDefault();
        const c = this._choices[n - 1];
        this.setChoices([], "");
        this.onPickChoice(c.id);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  /** 展开输入框并进入输入态（会释放指针锁，否则没法打字） */
  expand() {
    const was = this.expanded;
    this.bar.classList.remove("collapsed");
    if (document.pointerLockElement) document.exitPointerLock();
    this.inputEl.focus();
    if (!was) this.onExpand?.();
  }

  /** 收起输入框，把键盘还给游戏 */
  collapse() {
    const was = this.expanded;
    this.bar.classList.add("collapsed");
    this.inputEl.blur();
    if (was) this.onCollapse?.();
  }

  /** 顶部提示当前在对谁说话 */
  setTalkTarget(label) {
    this._talkTarget = label || "";
    this.inputEl.placeholder = label
      ? `对${label}说…（回车说出口，Esc 结束）`
      : "对他们说点什么…（回车说出口，Esc 回到操作）";
  }

  get expanded() {
    return !this.bar.classList.contains("collapsed");
  }

  /** 有没有正在进行的事件（只影响提示文案，输入入口始终在底部） */
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

  /** 事件区域交互按钮（输入框上方），带 1/2/3/4 快捷键 */
  setChoices(choices = [], hint = "") {
    this._choices = choices;
    this.choicesEl.innerHTML = "";
    if (!choices.length) {
      this.choicesEl.style.display = "none";
      document.body.classList.remove("theater-choices-on");
      return;
    }
    if (hint) this.hintEl.textContent = hint;
    choices.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `theater-choice risk-${c.risk || "medium"}`;
      btn.innerHTML = `<kbd class="tc-key">${i + 1}</kbd>` +
        `<span class="tc-icon">${c.icon || "▶"}</span><span class="tc-label">${c.label}</span>`;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setChoices([], "");
        this.onPickChoice(c.id);
      });
      this.choicesEl.appendChild(btn);
    });
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
    /* 纪实由 Director 保存，暂不铺 UI 面板；需要时 window.__ww.theaterLog() 查看 */
  }

  get typing() {
    return document.activeElement === this.inputEl;
  }
}
