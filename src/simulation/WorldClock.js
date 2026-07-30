// WorldClock.js — 跨日时间管理器。包装 Sky 的小时循环，增加 day、sleep 和 dayEnd 事件。
// 不直接修改 NPC 或势力；仅发出事件供 DailySimulation 消费。

export class WorldClock {
  constructor(sky, worldState = null) {
    this.sky = sky;           // Sky 实例（处理昼夜光照）
    this.day = 1;             // 当前游戏日 1-10
    this.daySpeed = sky.daySpeed; // 小时/秒（来自 Sky 的 daySpeed）
    this._listeners = {};     // 事件监听器
    this._dayEnded = false;   // 当天是否已结算
    this._sleepRequested = false;
    this._sleepLocation = null;
    this._worldState = worldState; // WorldState 引用，用于同步 day
  }

  // 事件类型：'dayEnd'(日结算触发), 'dayStart'(新一天开始), 'sleep'(玩家睡觉)
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  _emit(event, data = {}) {
    const cbs = this._listeners[event] || [];
    for (const cb of cbs) cb(data);
  }

  get hour() { return this.sky.hour; }
  get isNight() { return this.sky.isNight; }

  // 时段枚举
  timeOfDay() {
    const h = this.hour;
    if (h >= 6 && h < 12) return "morning";
    if (h >= 12 && h < 18) return "noon";
    if (h >= 18 && h < 22) return "evening";
    return "night";
  }

  // 小时对应的近似真实小时（用于显示）
  displayHour() {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  timeString() { return this.sky.timeString(); }

  // 每天早晨 6:00 重置结算标记
  update(dt, playerPos) {
    const prevHour = this.sky.hour;
    this.sky.update(dt, playerPos);

    // 检测跨日（小时从 >6 跨越到 <6，即过了午夜）
    if (prevHour > 22 && this.sky.hour < 6 && !this._dayEnded) {
      // 还没睡觉结算的情况：标记为熬夜
      this._emit("midnight", { day: this.day });
    }

    // 早晨 6:00 重置日标记
    if (prevHour < 6 && this.sky.hour >= 6) {
      this._dayEnded = false;
    }
  }

  // 玩家在驻地床铺尝试睡觉
  requestSleep(hqPosition) {
    if (this._dayEnded || this._sleepRequested) return false;
    this._sleepRequested = true;
    this._sleepLocation = hqPosition;
    this._emit("sleep", { day: this.day, location: hqPosition });
    return true;
  }

  // 执行睡眠结算（由 DailySimulation 调用，结算完成后调用）
  completeSleep() {
    if (!this._sleepRequested) return false;
    this._sleepRequested = false;
    this._dayEnded = true;
    this._emit("dayEnd", { day: this.day });
    return true;
  }

  // 开始新一天（由 DailySimulation 在结算完成后调用）
  advanceDay() {
    this.day += 1;
    this._dayEnded = false;
    // 快进到次日 6:00
    this.sky.hour = 6.0;
    this._sleepRequested = false;
    // 同步到 WorldState（存档用）
    if (this._worldState) this._worldState.state.day = this.day;
    this._emit("dayStart", { day: this.day });
  }

  // 是否到达十日限制
  get isFinalDay() { return this.day >= 10; }
  get isGameOver() { return this.day > 10; }

  // 调试：强制推进一天（跳过睡觉）
  debugAdvanceDay() {
    this._sleepRequested = true;
    this.completeSleep();
    this.advanceDay();
  }

  // 序列化
  toState() {
    return { day: this.day, hour: this.sky.hour, dayEnded: this._dayEnded };
  }

  // 反序列化
  fromState(state) {
    this.day = state.day || 1;
    this.sky.hour = state.hour || 6;
    this._dayEnded = state.dayEnded || false;
  }
}
