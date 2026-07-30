// NpcActionExecutor.js — 把 LLM 决策的行为落到游戏系统上
// 所有会改变游戏状态的行为都在这里做最终夹紧（金额、限次、目标合法性），
// 不信任 LLM 的任何数值：模型只决定"做什么"，"做多少"由这里算。

import { NPC_ACTIONS } from "./NpcActionSchema.js";

export class NpcActionExecutor {
  constructor(deps = {}) {
    this.player = deps.player;
    this.economy = deps.economy;
    this.reputation = deps.reputation;
    this.hud = deps.hud;
    this.npcManager = deps.npcManager;
    this.audio = deps.audio || null;
    this.baccarat = deps.baccarat || null;
    this.eventLog = deps.eventLog || null;
    this.addAffinity = deps.addAffinity || null; // (npc, trust, affection) => void
    this.getAffection = deps.getAffection || (() => 0);
    this.getDay = deps.getDay || (() => 1);

    this._daily = new Map(); // npc -> { day, counts:{actionId:n} }
  }

  /** 取某个 NPC 今天各行为已用次数（跨天自动清零） */
  dailyUse(npc) {
    const day = this.getDay();
    let rec = this._daily.get(npc);
    if (!rec || rec.day !== day) {
      rec = { day, counts: {} };
      this._daily.set(npc, rec);
    }
    return rec.counts;
  }

  _bump(npc, actionId) {
    const counts = this.dailyUse(npc);
    counts[actionId] = (counts[actionId] || 0) + 1;
  }

  /**
   * 执行一个已被 sanitizeAction 清洗过的行为。
   * @returns {{ ok:boolean, actionId:string, detail:string }}
   */
  execute(npc, action, ctx = {}) {
    const id = action?.action || "none";
    if (id === "none") return { ok: true, actionId: "none", detail: "" };
    const def = NPC_ACTIONS[id];
    if (!def) return { ok: false, actionId: id, detail: "未知行为" };

    const playerRef = this.player.pos;
    const name = npc.phone?.owner || "对方";

    switch (id) {
      case "face_player":
        npc.brain.startTalk(playerRef);
        return { ok: true, actionId: id, detail: "转向你" };

      case "follow_player": {
        const sec = Math.min(def.maxSeconds || 30, 30);
        npc.brain.follow(playerRef, { seconds: sec });
        this.hud?.toast?.(`👣 ${name}跟上来了`, { side: true, key: "npc-follow" });
        return { ok: true, actionId: id, detail: `跟随 ${sec}s` };
      }

      case "flee":
        npc.brain.fleeFrom(playerRef);
        return { ok: true, actionId: id, detail: "逃跑" };

      case "attack_player":
        npc.brain.attackTarget(playerRef, { npc: null });
        this.hud?.toast?.(`⚔️ ${name}动手了！`, { key: "npc-attack-player" });
        this.audio?.npcVoice?.("angry");
        return { ok: true, actionId: id, detail: "攻击玩家" };

      case "attack_npc": {
        const victim = this._findNpcByName(action.targetName, ctx.candidates);
        if (!victim || victim === npc) return { ok: false, actionId: id, detail: "目标不在场" };
        npc.brain.attackTarget(victim.pos, { npc: victim });
        // 被打的一方要有反应，否则看起来像在打木头人
        victim.brain.attackTarget(npc.pos, { npc, seconds: 8 });
        this.hud?.toast?.(`⚔️ ${name}和${victim.phone?.owner || "某人"}打起来了！`, { key: "npc-brawl" });
        this.audio?.npcVoice?.("angry");
        this._log("NPC_BRAWL", [name, victim.phone?.owner], { instigator: name });
        return { ok: true, actionId: id, detail: `攻击 ${victim.phone?.owner}` };
      }

      case "give_money": {
        // 金额三重夹紧：兜里现金比例 → 硬上限 → 不超过实际持有
        const a = def.amount;
        const reserve = npc.cashReserve || 0;
        let amt = Math.round(reserve * a.ratioOfReserve);
        amt = Math.min(amt, a.hardMax, reserve);
        if (amt < a.hardMin) return { ok: false, actionId: id, detail: "他兜里没钱" };
        npc.cashReserve = Math.max(0, reserve - amt); // 真的从 NPC 身上扣，不是凭空生成
        this.economy.addMoney(amt);
        this.audio?.coin?.();
        this.hud?.toast?.(`🤝 ${name}给了你 $${amt}`, { side: true, key: "npc-give" });
        this.addAffinity?.(npc, 2, 3);
        this._bump(npc, id);
        this._log("NPC_GAVE_MONEY", [name], { amount: amt });
        return { ok: true, actionId: id, detail: `给了 $${amt}` };
      }

      case "rob_player":
      case "steal_from_player": {
        const a = def.amount;
        const money = this.economy.money || 0;
        // 夹紧顺序很关键：先抬到 hardMin，最后再用 min(玩家实际持有, hardMax) 封顶。
        // 顺序反了会出现"玩家只剩 3 块却被抢走 5 块"→ 余额变负（addMoney 无下限保护）。
        let amt = Math.round(money * a.ratioOfPlayerMoney);
        amt = Math.max(amt, a.hardMin);
        amt = Math.min(amt, a.hardMax, money);
        if (money <= 0 || amt <= 0) return { ok: false, actionId: id, detail: "你身上没钱可拿" };
        this.economy.addMoney(-amt);
        npc.cashReserve = (npc.cashReserve || 0) + amt; // 钱进了他兜里，打倒他能抢回来
        this.audio?.coin?.();
        const robbed = id === "rob_player";
        this.hud?.toast?.(
          robbed ? `💰 ${name}抢走了你 $${amt}！` : `🫳 ${name}摸走了你 $${amt}`,
          { key: "npc-take" }
        );
        if (def.effects) this.addAffinity?.(npc, def.effects.trust, def.effects.affection);
        this._bump(npc, id);
        this._log(robbed ? "NPC_ROBBED_PLAYER" : "NPC_STOLE_FROM_PLAYER", [name], { amount: amt });
        return { ok: true, actionId: id, detail: `${robbed ? "抢" : "偷"}走 $${amt}` };
      }

      case "open_gamble": {
        if (!this.baccarat) return { ok: false, actionId: id, detail: "没有赌桌" };
        npc.brain.startTalk(playerRef);
        this._bump(npc, id);
        setTimeout(() => {
          try {
            document.exitPointerLock?.();
            this.baccarat.open();
          } catch (e) { void e; }
        }, 600);
        return { ok: true, actionId: id, detail: "开局" };
      }

      default:
        return { ok: false, actionId: id, detail: "未实现" };
    }
  }

  _findNpcByName(name, candidates) {
    if (!name) return null;
    const pool = candidates && candidates.length ? candidates : (this.npcManager?.all || []);
    return (
      pool.find((n) => (n.phone?.owner || "") === name) ||
      pool.find((n) => name && (n.phone?.owner || "").includes(name)) ||
      null
    );
  }

  _log(type, actors, facts) {
    if (!this.eventLog?.record) return;
    try {
      this.eventLog.record({
        type,
        actors: actors.filter(Boolean),
        facts,
        visibility: "public",
        tags: ["npc-action", "llm"],
      });
    } catch (e) { void e; }
  }
}
