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
    this.onCollapse = deps.onCollapse || null;   // 收起时通知，带 { keepChat }
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
               placeholder="对他们说点什么…（回车发送；Esc 回到操作）" />
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
      // 发完就收起输入框，把键盘交还给游戏。
      //
      // 为什么不"保持展开好接着聊"：那需要输入框在 pointerLock 反复抢焦点的情况下
      // 一直持有焦点，实测非常难做对（指针锁一激活，浏览器就不给非锁定元素发键盘
      // 事件，input 直接变聋，Enter/Esc/空格/数字键全废）。收起来只有一个状态，
      // 没有"展开但没焦点"这种半死不活的中间态。
      //
      // keepChat: true —— 只收界面，不结束对话。NPC 仍留在 TALK 状态、
      // chatTarget 也还在，玩家再按回车能直接接着跟同一个人说下一句。
      this.collapse({ keepChat: true });
    };

    this.sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submit();
    });

    this.inputEl.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return; // 中文输入法组合中不抢回车
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.collapse(); // 显式退出 → 结束对话
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
      // 失焦就收起来。发送后是主动 collapse（keepChat），这里只处理
      // "点到别处去了"的情况：框里没打字就收掉，别留个没焦点的空框在屏幕上。
      if (!this.inputEl.value.trim()) this.collapse({ keepChat: true });
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

  /**
   * 收起输入框，把键盘还给游戏。
   * @param opts.keepChat 只收界面、不结束对话（回车发送后用这个）。
   *   为 false/省略时通知外部结束对话（Esc / 空格 / 点到别处）。
   */
  collapse(opts = {}) {
    // 防重入：下面的 blur() 会同步触发 blur handler，而它也会调 collapse()。
    // 不挡住的话就是无限递归（浏览器里因为"已失焦不再派发 blur"侥幸没炸，
    // 但不能指望这个）。同时也保证 onCollapse 只通知一次、keepChat 不被内层篡改。
    if (!this.expanded) return;
    this.bar.classList.add("collapsed");
    this.inputEl.blur();
    this.onCollapse?.({ keepChat: !!opts.keepChat });
  }

  /** 顶部提示当前在对谁说话 */
  setTalkTarget(label) {
    this._talkTarget = label || "";
    // 回车发送后会自动收起输入框（再按回车可接着说下一句）
    this.inputEl.placeholder = label
      ? `对${label}说…（回车发送；Esc 结束对话）`
      : "对他们说点什么…（回车发送；Esc 回到操作）";
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
