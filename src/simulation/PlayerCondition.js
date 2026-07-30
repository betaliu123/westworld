// PlayerCondition.js — 轻量玩家体能与精力系统。
// 不做高压生存条：正常走路不消耗，战斗/疾跑/深夜活动才消耗。

export class PlayerCondition {
  constructor() {
    this.health = 100;
    this.energy = 100;        // 精力 0-100
    this.fatigue = 0;         // 疲劳 0-100（越高越差）
    this.injury = null;       // 伤势描述
    this.mealBuff = null;     // 当前食物增益 { effect, remainingHours }
    this._sprintTime = 0;     // 累计疾跑时间
    this._nightTime = 0;      // 深夜活动累计
    this._combatCount = 0;    // 当天战斗次数
  }

  // 每帧调用
  update(dt, isSprinting, isNight, isInCombat) {
    // 自然恢复（极慢）
    this.energy = Math.min(100, this.energy + dt * 0.5);
    this.fatigue = Math.max(0, this.fatigue - dt * 0.1);

    // 疾跑消耗
    if (isSprinting) {
      this._sprintTime += dt;
      if (this._sprintTime > 3) {
        this.energy = Math.max(0, this.energy - dt * 4);
      }
    } else {
      this._sprintTime = Math.max(0, this._sprintTime - dt * 2);
    }

    // 深夜活动惩罚
    if (isNight) {
      this._nightTime += dt;
      if (this._nightTime > 30) {
        this.fatigue = Math.min(100, this.fatigue + dt * 3);
      }
    }

    // 战斗消耗
    if (isInCombat) {
      this.energy = Math.max(0, this.energy - dt * 8);
    }

    // 食物增益消退
    if (this.mealBuff && this.mealBuff.remainingHours > 0) {
      this.mealBuff.remainingHours -= dt / 3600;
    } else {
      this.mealBuff = null;
    }

    // 低精力效果
    if (this.energy < 20) {
      // 疾跑速度降低（由外部读取）
    }
  }

  // 每日结算时调用
  dailyReset() {
    this._sprintTime = 0;
    this._nightTime = 0;
    this._combatCount = 0;
  }

  // 睡觉恢复
  sleepRecovery(quality = 1) {
    // quality: 1=正常, 0.5=熬夜, 1.3=吃饱
    this.energy = Math.min(100, this.energy + 70 * quality);
    this.fatigue = Math.max(0, this.fatigue - 60 * quality);
    this.dailyReset();
  }

  // 吃饭
  eat(food, effect) {
    this.energy = Math.min(100, this.energy + food.energyRestore || 20);
    this.mealBuff = {
      name: food.name,
      effect: effect || "well_fed",
      remainingHours: food.buffHours || 2,
    };
  }

  // 受伤
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.health = 1;
      this.injury = "重伤";
    }
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
    if (this.health > 50) this.injury = null;
  }

  // 精力影响行动
  get sprintMultiplier() {
    if (this.energy < 10) return 0.5;
    if (this.energy < 30) return 0.75;
    return 1.0;
  }

  get combatPenalty() {
    if (this.energy < 20) return 0.2;   // 20% 战斗惩罚
    return 0;
  }

  // 序列化
  toState() {
    return {
      health: this.health,
      energy: this.energy,
      fatigue: this.fatigue,
      injury: this.injury,
      mealBuff: this.mealBuff ? { ...this.mealBuff } : null,
    };
  }

  fromState(state) {
    if (!state) return;
    this.health = state.health ?? 100;
    this.energy = state.energy ?? 100;
    this.fatigue = state.fatigue ?? 0;
    this.injury = state.injury ?? null;
    this.mealBuff = state.mealBuff ?? null;
  }
}
