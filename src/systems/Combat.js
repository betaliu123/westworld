// Combat.js — 攻击判定编排：读取玩家攻击输入，命中 NPC，触发受击/击倒/掉落/恐慌，
// 并联动音效、声望、报纸新闻。

export class Combat {
  /**
   * 拳击的判定范围。必须贴身 —— 1.7m 大约是伸直手臂能碰到对方的距离，
   * 70° 锥角保证只打正对着的人，而不是斜前方路过的。
   */
  static PUNCH_RANGE = 1.7;
  static PUNCH_CONE = 70;

  constructor(npcManager, loot, hud, deps = {}) {
    this.npcManager = npcManager;
    this.loot = loot;
    this.hud = hud;
    this.audio = deps.audio || null;
    this.reputation = deps.reputation || null;
    this.newspaper = deps.newspaper || null;
    this.onNpcKnocked = deps.onNpcKnocked || null;
    this.onNpcHit = deps.onNpcHit || null; // 每次命中都回调（含未击倒），供 AI 剧场做出戏反应
    this.hitFlash = 0;
    // 玩家伤害倍率来源（调试面板可调：player.damage）。null 时用 1.0。
    this.playerRef = deps.playerRef || null;
  }

  /** 当前伤害倍率（读玩家属性；拿不到就 1.0） */
  _dmgMul() {
    return this.playerRef?.damage ?? 1.0;
  }

  /**
   * 瞄准时左键开枪：远程、耗一发子弹。
   * @param {Vector3} playerPos 玩家位置
   * @param {number} facing 玩家朝向（弧度）
   * @param {AmmoSystem} ammo 子弹系统
   * @param {object} opts range/coneDeg/camPitch —— camPitch 用来推算命中部位（爆头）
   * @returns {boolean} 是否真的开出了一枪（没子弹返回 false）
   */
  fireShot(playerPos, facing, ammo, { range = 22, coneDeg = 24, camPitch = 0 } = {}) {
    if (!ammo.tryConsume()) {
      if (this.audio) this.audio.emptyClick?.();
      return false;
    }
    if (this.audio) this.audio.gunshot?.();
    // 打枪动静大：大范围恐慌
    this.npcManager.broadcastPanic(playerPos, 18);

    // 锥形找最近目标（比拳击远得多，但要求更准：角度小）
    const target = this.npcManager.findAttackTarget(playerPos, facing, range, coneDeg);
    if (!target) {
      this.hud.toast("🔫 打空了", { side: true, key: "shot-miss" });
      this.hitFlash = 0.3;
      return true;
    }

    // 命中部位：用相机俯仰角把射线投到目标距离上，看落在什么高度。
    // 枪口约在 1.45 高；镜头往上抬（camPitch 变小）射线就往高处走。
    // 模型参考高度：头 1.72、躯干 1.12、腿 0.4 以下。
    const dist = Math.hypot(target.pos.x - playerPos.x, target.pos.z - playerPos.z);
    const muzzleY = 1.45;
    const hitY = muzzleY - Math.tan(camPitch) * dist;
    // 头部中心高度与"头骨核心"半径：打进核心 = 正中眉心，一枪毙命；
    // 只擦到头皮/下颌算重伤不致死。
    const HEAD_Y = 1.72;
    const HEAD_CORE = 0.13;
    let part = "body";
    let damage = 2;
    let lethal = false;
    if (hitY >= 1.55) {
      part = "head";
      if (Math.abs(hitY - HEAD_Y) <= HEAD_CORE) {
        // 正中眉心：直接打死。伤害给到 maxHp+2，让 hp 掉到 -2 以下 ——
        // tryReviveFromDown 判定"打穿 2 格以上"为重伤昏迷，不会再爬起来。
        lethal = true;
        damage = (target.maxHp || 4) + 2;
      } else {
        // 擦到头：按最大血量算，保证一枪打掉一半以上。
        // 固定伤害对硬汉（10 格血）不够狠，硬汉挨一枪只掉 1/5，没有反馈感。
        damage = Math.max(3, Math.ceil((target.maxHp || 4) * 0.6));
      }
    } else if (hitY <= 0.75) {
      part = "leg";
      damage = 1; // 打腿伤害低，但会让人跑不动
    }

    // 近距离枪击伤害加成：贴脸一枪打不透的敌人，近距离应当更疼。
    // 距离 ≤ 3m 时 +2（贴身几乎等于挨喷子），3~6m 线性衰减到 0。
    // 让"近身交火"与"远距离点射"有明显差异，鼓励玩家控制交战距离。
    const closeBonus = dist <= 3 ? 2 : (dist >= 6 ? 0 : Math.round(2 * (1 - (dist - 3) / 3)));
    if (part !== "head") damage += closeBonus;

    const knocked = target.hit(playerPos, false, Math.round(damage * this._dmgMul()));

    if (part === "head") {
      if (lethal) {
        this.hud.toast("💀 一枪爆头！", { key: "shot-head", duration: 2600 });
        this.hitFlash = 1.0;
      } else {
        this.hud.toast(knocked ? "🎯 爆头！" : "🎯 命中头部！", { key: "shot-head", duration: 2200 });
        this.hitFlash = 0.9;
      }
      if (this.audio) { this.audio.hit?.(); this.audio.npcVoice?.("hurt"); }
      this.onHeadshot?.(target, knocked, { lethal });
    } else if (part === "leg") {
      this.hud.toast("🦵 打中腿了", { side: true, key: "shot-leg" });
      this.hitFlash = 0.35;
      target.brain._legHit = true; // 让 NPC 跑不快（NPC.update 读它降速）
    } else {
      this.hud.toast(knocked ? "🔫 一枪放倒！" : "🔫 打中了！", { key: "shot-hit" });
      this.hitFlash = 0.5;
    }

    if (this.onNpcHit) this.onNpcHit(target, knocked);
    if (knocked) {
      this.loot.dropFromNPC(target);
      // 被枪击的 NPC 可能掉子弹（凶手身上的）
      this._shotDropAmmo?.(target);
      if (this.newspaper) this.newspaper.publish("robbery", { job: target.personality.job });
      if (this.reputation) this.reputation.onKnockNPC(target.personality.gang);
      if (this.onNpcKnocked) this.onNpcKnocked(target);
    }
    this.npcManager.recordEncounter(target, "shot_by_player", { day: this.currentDay || 0, knocked, part });
    // 目击-报案（开枪是大罪，目击的人多）
    const witnesses = this.npcManager.findWitnesses(target.pos, 14);
    for (const w of witnesses) w.brain.witnessCrime(target.pos, "assault");
    this.hitFlash = 0.5;
    return true;
  }

  // 每帧调用；player 已在本帧标记好攻击意图
  update(dt, player) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (player.inVehicle) return;

    if (player.consumeAttack()) {
      if (this.audio) this.audio.punch();
      // 拳头够得着的距离。以前用默认的 2.6m / 90° 锥角，等于"隔一个身位挥空气"
      // 也能判定命中，玩家会莫名其妙打到不相干的路人。拳击必须是贴身的。
      const target = this.npcManager.findAttackTarget(player.pos, player.facing, Combat.PUNCH_RANGE, Combat.PUNCH_CONE);
      // 空挥动静小，只惊动近处 NPC
      this.npcManager.broadcastPanic(player.pos, target ? 8 : 5);
      if (target) {
        if (this.audio) { this.audio.hit(); this.audio.npcVoice("hurt"); }
        const knocked = target.hit(player.pos, false, Math.round(1 * this._dmgMul()));
        this.hud.toast(knocked ? "💥 击倒了一个 NPC！" : "👊 命中！");
        // 记录交手历史
        this.npcManager.recordEncounter(target, "hit_by_player", { day: this.currentDay || 0, knocked });
        if (this.onNpcHit) this.onNpcHit(target, knocked);
        this.npcManager.broadcastPanic(target.pos, knocked ? 12 : 7);
        // 声望：动手就掉荣誉（通缉由目击-报案流程处理）
        if (this.reputation) {
          if (knocked) this.reputation.onKnockNPC(target.personality.gang);
          else this.reputation.onAttackNPC(target.personality.gang);
        }
        // 目击检测：范围与严重程度都按"打倒没打倒"分级。
        // 空手一拳没打倒 = 街头推搡，只有身边几步内的人会侧目，没人为这个跑去报官；
        // 打倒了才算行凶，范围放大且允许报案。开枪另算（见 fireShot，14m）。
        const witnesses = this.npcManager.findWitnesses(target.pos, knocked ? 8 : 5);
        for (const w of witnesses) {
          w.brain.witnessCrime(target.pos, "assault", { severity: knocked ? "assault" : "scuffle" });
        }
        if (knocked) {
          this.loot.dropFromNPC(target);
          if (this.newspaper) {
            this.newspaper.publish("robbery", { job: target.personality.job });
          }
          if (this.onNpcKnocked) this.onNpcKnocked(target);
        }
      }
    }
  }
}
