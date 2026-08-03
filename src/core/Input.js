// Input.js — 键鼠输入聚合。提供每帧可查询的按键状态与鼠标转向增量。

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pointerLocked = false;
    // 边沿触发的一次性动作（本帧按下）
    this.pressed = new Set();

    // 正在输入框里打字时（如 AI 剧场自由输入），键盘归输入框，不驱动角色
    this._isTyping = (target) => {
      const el = target && target.tagName ? target : document.activeElement;
      if (!el) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true;
    };

    // 焦点进入输入框的瞬间清掉残留按键：wasPressed 靠帧末才清，
    // 否则切入输入框那一帧之前按下的键仍会被消费（按到 M 就弹商店）
    this._onFocusIn = (e) => {
      if (this._isTyping(e.target)) {
        this.keys.clear();
        this.pressed.clear();
      }
    };

    this._onKeyDown = (e) => {
      if (this._isTyping(e.target)) {
        this.keys.clear(); // 防止切入输入框之前按住的键卡住
        return;
      }
      const code = e.code;
      if (!this.keys.has(code)) this.pressed.add(code);
      this.keys.add(code);
      // 阻止空格/Tab 滚动页面
      if (["Space", "Tab", "ArrowUp", "ArrowDown"].includes(code)) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (this.pointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    };
    this._onMouseDown = (e) => {
      if (this._isTyping(e.target)) return; // 点在输入框/按钮上不算开枪
      // 右键按下就锁定指针：以前只有 canvas 的 click 会锁，
      // 导致第一次按住右键瞄准时鼠标增量恒为 0，必须先点一下左键才能转视角
      if (e.button === 2) {
        e.preventDefault();
        this.requestPointerLock();
      }
      if (e.button === 0) this.pressed.add("Mouse0");
      this.keys.add(e.button === 0 ? "Mouse0" : "Mouse2");
    };
    this._onMouseUp = (e) => this.keys.delete(e.button === 0 ? "Mouse0" : "Mouse2");
    // 屏蔽右键菜单：右键是瞄准键，弹出系统菜单会打断操作
    this._onContextMenu = (e) => {
      if (this._isTyping(e.target)) return; // 输入框里保留右键菜单（复制粘贴）
      e.preventDefault();
    };
    this._onLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
      // 失去指针锁（Esc/切窗口）时清掉按住状态，避免"松手了但游戏以为还按着"
      if (!this.pointerLocked) {
        this.keys.delete("Mouse0");
        this.keys.delete("Mouse2");
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("focusin", this._onFocusIn);
    window.addEventListener("mousemove", this._onMouseMove);
    this.dom.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    this.dom.addEventListener("contextmenu", this._onContextMenu);
    document.addEventListener("pointerlockchange", this._onLockChange);
  }

  requestPointerLock() {
    if (this.pointerLocked) return;
    // 新版浏览器返回 Promise，失败（如文档不可用于锁定）时兜底，避免未处理拒绝
    try {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { void e; }
  }

  /** 是否正在输入框里打字（唯一真相源，各处别再自己判断 activeElement） */
  get typing() {
    return this._isTyping(null);
  }

  isDown(code) {
    // 打字时所有按键查询一律为假：把守卫收在这里，新增热键就不会漏
    if (this.typing) return false;
    return this.keys.has(code);
  }

  // 本帧刚按下（消费一次）
  wasPressed(code) {
    // Escape 例外：打字时也要能用它退出输入
    if (this.typing && code !== "Escape") return false;
    if (this.pressed.has(code)) {
      return true;
    }
    return false;
  }

  // 取出并清零鼠标增量
  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  // 每帧末尾清空一次性状态
  endFrame() {
    this.pressed.clear();
  }
}
