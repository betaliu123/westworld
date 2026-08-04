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
    this.shouldStayOpen = deps.shouldStayOpen || null; // 有对话对象时别因失焦自动收
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
               placeholder="对他们说点什么…（回车发送，可接着聊；Esc/空格 回到操作）" />
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
      // 发完不收界面：玩家通常想接着聊下一句。以前发完就关，
      // 一关就触发 onCollapse → endNpcChat → endTalk，NPC 当场走人。
      // 想结束对话按 Esc（输入框下方有提示）。
      this.onSubmitText(text);
      this.inputEl.focus();
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
      } else if (e.key === " " && !this.inputEl.value) {
        // 空框按空格 = 退出输入并结束对话。
        // 只在框是空的时候拦，否则就没法在句子里打空格了（中文输入法还要用空格选词）。
        e.preventDefault();
        this.collapse();
      }
      e.stopPropagation(); // 其余按键留给输入框
    });

    this.inputEl.addEventListener("focus", () => this.bar.classList.add("focused"));
    this.inputEl.addEventListener("blur", () => {
      this.bar.classList.remove("focused");
      // 正在跟某人对话时不收界面 —— 鼠标一动就重新抓指针锁会让输入框失焦，
      // 于是"发一句话对话框就没了、NPC 也走了"。有对话对象时只有 Esc / 空格能收。
      //
      // 但光"不收"会留下更坑的状态：框还在、却没焦点，玩家打的字全变成游戏热键。
      // 所以这里要把焦点抢回来（延后一拍，别和正在进行的焦点切换打架）。
      if (this.shouldStayOpen?.()) {
        setTimeout(() => {
          if (this.expanded && this.shouldStayOpen?.()) this.inputEl.focus();
        }, 0);
        return;
      }
      if (!this.inputEl.value.trim()) this.collapse();
    });
    this.collapsedEl.addEventListener("click", () => this.expand());
    this.bar.addEventListener("mousedown", (e) => e.stopPropagation());

    // 全局按键：回车展开输入、数字键选事件选项、Esc/空格退出对话
    this._onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // 输入框自己就是焦点元素时，一切归它的 keydown handler 管（Enter 发送、
      // Esc/空格 退出）。不加 addTypingGuard 就不会被"条展开但没焦点"误判。
      const focusOnInput = document.activeElement === this.inputEl;
      if (focusOnInput) return;

      // 条已经展开但焦点被偷了 → 这是 blur 的"抢回焦点"还没跑完的极短窗口。
      // Esc/空格 仍然要能退出，否则输入框丢了焦点、整个键盘就死了。
      if (this.expanded) {
        if (e.key === "Escape" || e.key === " ") {
          e.preventDefault();
          this.collapse();
        }
        return; // 展开状态下其他键不归这里（Enter = 发给输入框，WASD = 游戏）
      }

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
    // 明确写出"能接着聊"和两个退出键，因为发完不再自动收界面
    this.inputEl.placeholder = label
      ? `对${label}说…（回车发送，可接着聊；Esc/空格 结束对话）`
      : "对他们说点什么…（回车发送，可接着聊；Esc/空格 回到操作）";
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
