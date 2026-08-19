/**
 * Cutscene —— 黑幕过场
 *
 * 用途：故事节点"本该玩家亲自到场"，但玩家在手机上直接点了"推进"。
 * 这时不能生硬跳过，而是黑幕拉下来，用电影旁白把这段"玩家缺席"的时间
 * 补叙掉（"你走出巷口的时候，血还没干。第二天全城人心惶惶……"），
 * 黑幕散去后世界已经变了，接着投递下一节点。
 *
 * 设计要点：
 *  - 一次只能有一个过场在播（`isPlaying()`），期间屏蔽玩家输入。
 *  - 文本逐句淡入，句间停顿，最后一句停留后自动收场；也可点击/按空格跳过。
 *  - 收场后走 `onDone` 回调，由调用方决定推进哪个节点。
 */
export class Cutscene {
  constructor() {
    this.root = document.createElement("div");
    this.root.id = "cutscene";
    this.root.className = "hidden";
    this.root.innerHTML = `
      <div id="cutscene-inner">
        <div id="cutscene-title"></div>
        <div id="cutscene-lines"></div>
        <div id="cutscene-skip">按 <b>空格</b> 或点击继续</div>
      </div>`;
    document.body.appendChild(this.root);

    this._playing = false;
    this._timers = [];
    this._onDone = null;

    this.root.addEventListener("click", () => this._finish());
    this._keyHandler = (e) => {
      if (!this._playing) return;
      if (e.code === "Space" || e.code === "Enter" || e.code === "Escape") {
        e.preventDefault();
        this._finish();
      }
    };
    window.addEventListener("keydown", this._keyHandler);
  }

  isPlaying() {
    return this._playing;
  }

  /**
   * 播一段过场。
   * @param {object} spec
   *   - title  {string}   小标题（如"数日之后"），可空
   *   - lines  {string[]} 旁白，一句一行，逐句淡入
   *   - onDone {Function} 收场回调
   *   - lineDelay {number} 句间毫秒，默认 2100
   *   - holdAfter {number} 最后一句后停留毫秒，默认 1800
   */
  play(spec = {}) {
    const lines = (spec.lines || []).filter((s) => s && String(s).trim());
    if (!lines.length) {
      // 没文案就别黑屏了，直接把后续跑完
      if (spec.onDone) spec.onDone();
      return false;
    }
    // 已经在播：把旧的收掉再播新的，避免叠加
    if (this._playing) this._finish();

    this._playing = true;
    this._onDone = spec.onDone || null;
    const lineDelay = spec.lineDelay ?? 2100;
    const holdAfter = spec.holdAfter ?? 1800;

    const titleEl = this.root.querySelector("#cutscene-title");
    const linesEl = this.root.querySelector("#cutscene-lines");
    const skipEl = this.root.querySelector("#cutscene-skip");
    titleEl.textContent = spec.title || "";
    titleEl.style.display = spec.title ? "block" : "none";
    linesEl.innerHTML = "";
    skipEl.style.opacity = "0";

    this.root.classList.remove("hidden");
    // 强制一帧，让 opacity 过渡生效
    void this.root.offsetHeight;
    this.root.classList.add("cutscene-on");

    lines.forEach((text, i) => {
      const p = document.createElement("div");
      p.className = "cutscene-line";
      p.textContent = text;
      linesEl.appendChild(p);
      this._timers.push(
        setTimeout(() => p.classList.add("cutscene-line-on"), 700 + i * lineDelay)
      );
    });

    // 提示"可跳过"稍晚出现，别一开始就催玩家跳
    this._timers.push(setTimeout(() => { skipEl.style.opacity = "0.55"; }, 1500));
    // 自动收场
    this._timers.push(
      setTimeout(() => this._finish(), 700 + lines.length * lineDelay + holdAfter)
    );
    return true;
  }

  _finish() {
    if (!this._playing) return;
    this._playing = false;
    this._timers.forEach(clearTimeout);
    this._timers = [];
    this.root.classList.remove("cutscene-on");
    const cb = this._onDone;
    this._onDone = null;
    // 等淡出动画结束再隐藏，并在此时才回调（世界变化和黑幕散开同步）
    setTimeout(() => {
      this.root.classList.add("hidden");
      if (cb) {
        try { cb(); } catch (e) { console.error("[Cutscene] onDone 出错", e); }
      }
    }, 620);
  }

  dispose() {
    this._timers.forEach(clearTimeout);
    window.removeEventListener("keydown", this._keyHandler);
    this.root.remove();
  }
}
