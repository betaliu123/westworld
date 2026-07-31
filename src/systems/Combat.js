// Combat.js — 攻击判定编排：读取玩家攻击输入，命中 NPC，触发受击/击倒/掉落/恐慌，
// 并联动音效、声望、报纸新闻。

export class Combat {
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
  }

  /**
   * 瞄准时左键开枪：远程、耗一发子弹。
   * @param {Vector3} playerPos 玩家位置
   * @param {number} facing 玩家朝向（弧度）
   * @param {AmmoSystem} ammo 子弹系统
   * @returns {boolean} 是否真的开出了一枪（没子弹返回 false）
   */
  fireShot(playerPos, facing, ammo, { range = 22, coneDeg = 24 } = {}) {
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
    // 枪伤比拳击重：一枪扣 2 格血（拳击 1 格），但留给对方反击的机会
    const knocked = target.hit(playerPos, false, 2);
    this.hud.toast(knocked ? "🔫 一枪放倒！" : "🔫 打中了！", { key: "shot-hit" });
    if (this.onNpcHit) this.onNpcHit(target, knocked);
    if (knocked) {
      this.loot.dropFromNPC(target);
      // 被枪击的 NPC 可能掉子弹（凶手身上的）
      this._shotDropAmmo?.(target);
      if (this.newspaper) this.newspaper.publish("robbery", { job: target.personality.job });
      if (this.reputation) this.reputation.onKnockNPC(target.personality.gang);
      if (this.onNpcKnocked) this.onNpcKnocked(target);
    }
    this.npcManager.recordEncounter(target, "shot_by_player", { day: this.currentDay || 0, knocked });
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
      const target = this.npcManager.findAttackTarget(player.pos, player.facing);
      // 空挥动静小，只惊动近处 NPC
      this.npcManager.broadcastPanic(player.pos, target ? 8 : 5);
      if (target) {
        if (this.audio) { this.audio.hit(); this.audio.npcVoice("hurt"); }
        const knocked = target.hit(player.pos);
        this.hud.toast(knocked ? "💥 击倒了一个 NPC！" : "👊 命中！");
        // 记录交手历史
        this.npcManager.recordEncounter(target, "hit_by_player", { day: this.currentDay || 0, knocked });
        if (this.onNpcHit) this.onNpcHit(target, knocked);
        this.npcManager.broadcastPanic(target.pos, 12);
        // 声望：动手就掉荣誉（通缉由目击-报案流程处理）
        if (this.reputation) {
          if (knocked) this.reputation.onKnockNPC(target.personality.gang);
          else this.reputation.onAttackNPC(target.personality.gang);
        }
        // 目击检测：周围NPC目击犯罪 → 胆小的跑去报警
        const witnesses = this.npcManager.findWitnesses(target.pos, 12);
        for (const w of witnesses) {
          w.brain.witnessCrime(target.pos, "assault");
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
