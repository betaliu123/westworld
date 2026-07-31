// CombatFactions.js — 战斗阵营与援护
// 规则：
//   敌方(enemy) = 正在打玩家的 NPC（红血条）
//   友方(ally)  = 赶来帮玩家的 NPC（绿血条），会主动去打敌方
//   玩家在街上被打时，附近好感高、有胆量的熟人会赶来支援
// 战斗结束（场上没有敌人了）后，友方自动解除并回到日常。

const Side = { ENEMY: "enemy", ALLY: "ally" };

export class CombatFactions {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.hud = deps.hud;
    this.getAffection = deps.getAffection || (() => 0);
    this.audio = deps.audio || null;
    this.onAllyJoin = deps.onAllyJoin || null;

    this.enemies = new Set();
    this.allies = new Set();
    this._exAllyCd = new Map(); // 刚解除的友方 → 剩余豁免秒数，防止被重新判敌
    this._recruitCd = 0;
    this._retargetCd = 0;
    this._peaceTimer = 0;
  }

  sideOf(npc) {
    if (this.enemies.has(npc)) return Side.ENEMY;
    if (this.allies.has(npc)) return Side.ALLY;
    return null;
  }

  get inCombat() {
    return this.enemies.size > 0;
  }

  /** 玩家被 NPC 攻击时调用（由 NPCManager 的攻击结果转进来） */
  notifyPlayerAttacked(attackers, playerPos) {
    for (const a of attackers) this.markEnemy(a);
    this._tryRecruitAllies(playerPos);
  }

  markEnemy(npc) {
    if (!npc?.alive) return;
    this.allies.delete(npc);
    this.enemies.add(npc);
  }

  markAlly(npc) {
    if (!npc?.alive) return;
    this.enemies.delete(npc);
    this.allies.add(npc);
  }

  clear(npc) {
    this.enemies.delete(npc);
    this.allies.delete(npc);
  }

  update(dt, playerPos) {
    this._recruitCd -= dt;
    this._retargetCd -= dt;

    // 敌方判定：正在 ANGRY 且目标是玩家（不是别的 NPC）
    for (const npc of this.npcManager?.all || []) {
      const b = npc.brain;
      if (!npc.alive || !b) { this.clear(npc); continue; }
      if (b.state === "DOWN") { this.clear(npc); continue; }
      if (b.state === "ANGRY" && !b.attackTargetNpc && !this.allies.has(npc) && !this._exAllyCd.has(npc)) {
        this.enemies.add(npc);
      } else if (this.enemies.has(npc) && b.state !== "ANGRY") {
        this.enemies.delete(npc); // 冷静下来就不算敌人了
      }
    }

    // 有人打玩家 → 招募援军
    if (this.enemies.size && this._recruitCd <= 0) {
      this._recruitCd = 3;
      this._tryRecruitAllies(playerPos);
    }

    // 友方找活干：去打最近的敌人
    if (this.allies.size && this._retargetCd <= 0) {
      this._retargetCd = 1.2;
      for (const ally of this.allies) {
        if (!ally.alive || ally.brain.state === "DOWN") { this.allies.delete(ally); continue; }
        const foe = this._nearestEnemy(ally.pos);
        if (!foe) continue;
        // 已经在打同一个目标就别重复下令，否则会不停重置计时
        if (ally.brain.attackTargetNpc === foe && ally.brain.state === "ANGRY") continue;
        ally.brain.attackTarget(foe.pos, { npc: foe, seconds: 12 });
      }
    }

    // 场上没敌人了 → 友方陆续解除
    if (!this.enemies.size) {
      this._peaceTimer += dt;
      if (this._peaceTimer > 4 && this.allies.size) {
        for (const ally of this.allies) {
          // 必须 calmDown 让他退出 ANGRY：只清 attackTargetNpc 的话，下一帧
          // "ANGRY 且没有 NPC 目标" 会把刚帮完忙的友方重新判成敌人
          ally.brain?.calmDown?.();
          ally.brain?.say?.("这下清静了。", 2.4);
          this._exAllyCd.set(ally, 3); // 解除后短暂豁免，双保险
        }
        this.allies.clear();
      }
    } else {
      this._peaceTimer = 0;
    }

    // 前友方豁免计时
    for (const [npc, t] of this._exAllyCd) {
      const left = t - dt;
      if (left <= 0) this._exAllyCd.delete(npc);
      else this._exAllyCd.set(npc, left);
    }
  }

  /** 招募援军：附近、好感够、有胆量、不在忙的熟人 */
  _tryRecruitAllies(playerPos) {
    if (!playerPos) return;
    const MAX_ALLIES = 3;
    if (this.allies.size >= MAX_ALLIES) return;
    const pool = (this.npcManager?.all || []).filter((npc) => {
      if (!npc.alive || this.enemies.has(npc) || this.allies.has(npc)) return false;
      const b = npc.brain;
      if (!b || b.state === "DOWN" || b.state === "FLEE" || b._perform) return false;
      const d = Math.hypot(npc.pos.x - playerPos.x, npc.pos.z - playerPos.z);
      if (d > 28) return false;            // 看不见就不会来
      if (npc.personality.bravery < 0.4) return false; // 胆小的不敢掺和
      return this.getAffection(npc) >= 25; // 得是有交情的人
    });
    // 好感高的先来
    pool.sort((a, b) => this.getAffection(b) - this.getAffection(a));
    for (const npc of pool.slice(0, MAX_ALLIES - this.allies.size)) {
      this.markAlly(npc);
      const foe = this._nearestEnemy(npc.pos);
      if (foe) npc.brain.attackTarget(foe.pos, { npc: foe, seconds: 12 });
      npc.brain.say(pickLine(), 2.6);
      const name = npc.phone?.owner || "有人";
      this.hud?.toast?.(`🤝 ${name}赶来帮你了！`, { key: "ally-join" });
      this.audio?.npcVoice?.("angry");
      this.onAllyJoin?.(npc);
    }
  }

  _nearestEnemy(from) {
    let best = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.brain?.state === "DOWN") continue;
      const d = Math.hypot(e.pos.x - from.x, e.pos.z - from.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
}

function pickLine() {
  const lines = ["住手！他是我朋友！", "别欺负他！", "我来帮你，伙计！", "谁准你在这条街上动手？"];
  return lines[Math.floor(Math.random() * lines.length)];
}

export { Side };
