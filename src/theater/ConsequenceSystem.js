// ConsequenceSystem.js — 剧场结局后果包（P8）。
//
// 现有 TheaterAftermath 管"碎片叙事"（报纸/来信/遗留物）。
// 后果包管"结构性后果"，四种类型（见 DESIGN 6.3）：
//   faction  — 改势力支柱/影响力，喂给 Nemesis 层
//   reveal   — 延迟 N 天揭示真相，回头改变选择的意义（最便宜的涌现）
//   delayed  — 延迟回报：N 天后来信/来人还人情
//   unlock   — 解锁隐藏关系标记（供后续事件/对话查询）
//
// 纯逻辑，操作 WorldState。pending 队列跨天存活，由 DailySimulation 每日结算。

export class ConsequenceSystem {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.factionSystem = deps.factionSystem || null;
    this.law = deps.law || null;
    this.nemesis = deps.nemesis || null;
    this.business = deps.business || null;
    this.npcRegistry = deps.npcRegistry || null;
    this.phone = deps.phone || null;
    this.newspaper = deps.newspaper || null;
    this.reputation = deps.reputation || null;
    this.storyRuntime = deps.storyRuntime || null;  // P17 打通：剧场结局回写 StoryTree
    this.hud = deps.hud || null;
    this.getDay = deps.getDay || (() => 1);
    this.log = deps.log || (() => {});
    this._ensureState();
  }

  get state() { return this.worldState.state.consequences; }

  _ensureState() {
    const ws = this.worldState.state;
    if (!ws.consequences) {
      ws.consequences = {
        pending: [],        // { id, dueDay, kind, data, done, treeId }
        unlocked: {},       // flag -> true
        applied: {},        // treeId:outcomeId -> true （防止重复结算）
      };
    }
    return ws.consequences;
  }

  /** 某个隐藏标记是否已解锁 */
  hasUnlocked(flag) { return !!this.state.unlocked[flag]; }

  /**
   * 应用一个后果包。由 TheaterDirector 在结局结算时调用。
   * @param oc 结局节点（读 oc.consequences）
   * @param ctx { treeId, outcomeId, cast }
   */
  apply(oc, ctx = {}) {
    const cs = oc?.consequences;
    if (!cs) return { applied: false, scheduled: 0 };
    const key = `${ctx.treeId || "tree"}:${ctx.outcomeId || oc.title}`;
    if (this.state.applied[key]) return { applied: false, scheduled: 0 }; // 防重复
    this.state.applied[key] = true;

    const out = { applied: true, scheduled: 0 };

    // 1) 即时势力效果
    if (cs.faction) this._applyFaction(cs.faction, ctx);

    // 2) 解锁隐藏标记
    if (cs.unlock) {
      for (const flag of cs.unlock) this.state.unlocked[flag] = true;
      out.unlocked = cs.unlock;
    }

    // 3) 延迟揭示（默认 2 天）
    if (cs.reveal) {
      const r = cs.reveal;
      const due = this.getDay() + (r.afterDays ?? 2);
      this.state.pending.push({
        id: `reveal_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        dueDay: due, kind: "reveal", treeId: ctx.treeId,
        data: r, done: false,
      });
      out.scheduled++;
    }

    // 4) 延迟回报
    if (Array.isArray(cs.delayed)) {
      for (const d of cs.delayed) {
        const due = this.getDay() + (d.afterDays ?? 3);
        this.state.pending.push({
          id: `delay_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
          dueDay: due, kind: "delayed", treeId: ctx.treeId,
          data: d, done: false,
        });
        out.scheduled++;
      }
    }

    // 5) 回写 StoryTree：剧场结局推进/创建长线剧情（打通 P17）
    //    story: { action:"advance"|"create"|"setFlag", storyId, choiceId?, flag?, value? }
    if (cs.story && this.storyRuntime) {
      const s = cs.story;
      try {
        if (s.action === "advance" && s.storyId) {
          const inst = this.worldState.getStoryInstance?.(s.storyId);
          if (inst && inst.status === "active") {
            this.storyRuntime.advance(s.storyId, s.choiceId || null);
            out.story = { action: "advance", storyId: s.storyId };
          }
        } else if (s.action === "create" && s.storyId) {
          const okc = this.storyRuntime.tryCreate?.(s.storyId, s.bindings || {});
          if (okc) out.story = { action: "create", storyId: s.storyId };
        } else if (s.action === "setFlag" && s.storyId) {
          const inst = this.worldState.getStoryInstance?.(s.storyId);
          if (inst) {
            inst.flags = inst.flags || {};
            inst.flags[s.flag] = s.value ?? true;
            out.story = { action: "setFlag", storyId: s.storyId, flag: s.flag };
          }
        }
      } catch (e) {
        console.error("[Consequence] story 回写失败", e);
      }
    }

    this.log(`【后果包】${ctx.treeId || "?"} 应用：势力=${!!cs.faction} 揭示=${!!cs.reveal} 延迟=${(cs.delayed || []).length} 解锁=${(cs.unlock || []).length} 故事=${!!cs.story}`);
    return out;
  }

  _applyFaction(fx, ctx) {
    if (fx.law && this.law) {
      for (const [k, v] of Object.entries(fx.law)) this.law.adjust(k, v, `theater:${ctx.treeId}`);
    }
    if (fx.black_hoof && this.factionSystem) {
      for (const [k, v] of Object.entries(fx.black_hoof)) this.factionSystem.damagePillar(k, v, `theater:${ctx.treeId}`);
    }
    if (fx.player && this.factionSystem) {
      if (fx.player.influence) this.factionSystem.addPlayerInfluence(fx.player.influence);
      if (fx.player.money) this.factionSystem.addPlayerMoney(fx.player.money);
      if (fx.player.morale) this.factionSystem.changePlayerMorale(fx.player.morale);
    }
  }

  /** 每日结算：到期的揭示/回报兑现 */
  settleDaily() {
    const day = this.getDay();
    const due = this.state.pending.filter((p) => !p.done && p.dueDay <= day);
    const done = [];
    for (const p of due) {
      p.done = true;
      try { this._fire(p); done.push(p); }
      catch (e) { void e; }
    }
    // 清理已完成（留最近 30 条供查看）
    this.state.pending = this.state.pending.filter((p) => !p.done || p.dueDay > day - 30);
    return done.map((p) => ({ kind: p.kind, data: p.data }));
  }

  _fire(p) {
    if (p.kind === "reveal") this._fireReveal(p.data);
    else if (p.kind === "delayed") this._fireDelayed(p.data);
  }

  _fireReveal(r) {
    // 延迟揭示：通过报纸或遭遇告诉玩家真相，然后应用后续势力效果
    const text = r.text || "";
    if (r.channel === "newspaper" && this.newspaper?.publishCustom) {
      this.newspaper.publishCustom(r.headline || "迟来的真相", text, { category: "revelation" });
      this.hud?.toast?.("📰 报纸上有一条迟来的真相", { key: "reveal", duration: 4200 });
    } else if (this.phone?.deliverMessage) {
      const fromName = r.fromName || "镇上的某人";
      const npcId = r.fromNpcId || "system";
      this.phone.deliverMessage(npcId, fromName, text, {});
      this.hud?.toast?.("📱 一条迟来的消息", { key: "reveal", duration: 4200 });
    }
    // 揭示后的势力影响
    if (r.effects?.faction) this._applyFaction(r.effects.faction, { treeId: r.treeId });
    if (r.effects?.relationship && this.npcRegistry) {
      for (const [name, rel] of Object.entries(r.effects.relationship)) {
        const known = this.npcRegistry.findByDisplayName?.(name);
        if (known) {
          const rec = this.npcRegistry.get?.(known.id);
          if (rec) {
            const upd = {};
            if (rel.debt) upd.debt = (rec.debt || 0) + rel.debt;
            if (rel.affection) upd.affection = Math.min(100, (rec.affection || 0) + rel.affection);
            this.npcRegistry.update?.(known.id, upd);
          }
        }
      }
    }
    this.log(`【延迟揭示】${text.slice(0, 30)}`);
  }

  _fireDelayed(d) {
    // 延迟回报：来信（带钱/道具）或来人
    if (d.type === "letter" && this.phone?.deliverMessage) {
      const fromName = d.from || "镇上的某人";
      const npcId = d.fromNpcId || "system";
      let text = d.text || "";
      if (d.effects?.cash) {
        this.reputation?.addHonor?.(2, `收到${fromName}的报答`);
        this.hud?.toast?.(`💰 ${fromName}还了你 $${d.effects.cash}`, { key: "delayed-pay", duration: 4200 });
      }
      this.phone.deliverMessage(npcId, fromName, text, {});
    } else if (d.type === "payback") {
      if (d.effects?.cash) {
        this.hud?.toast?.(`💰 有人把钱送到了你门口：+$${d.effects.cash}`, { key: "delayed-pay", duration: 4200 });
        this.factionSystem?.addPlayerMoney?.(d.effects.cash);
      }
    }
    this.log(`【延迟回报】${d.from || "?"}: ${(d.text || "").slice(0, 24)}`);
  }
}
