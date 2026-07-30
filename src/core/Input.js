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

    this._onKeyDown = (e) => {
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
      if (e.button === 0) this.pressed.add("Mouse0");
      this.keys.add(e.button === 0 ? "Mouse0" : "Mouse2");
    };
    this._onMouseUp = (e) => this.keys.delete(e.button === 0 ? "Mouse0" : "Mouse2");
    this._onLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    this.dom.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
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

  isDown(code) {
    return this.keys.has(code);
  }

  // 本帧刚按下（消费一次）
  wasPressed(code) {
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
