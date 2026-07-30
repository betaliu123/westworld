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
