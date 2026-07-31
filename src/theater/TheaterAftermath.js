// TheaterAftermath.js — 事件结局的后续影响
// 目的：让玩家的选择在事件散场之后仍然留下痕迹，而不是演完就没了。
// 三条落地渠道（都复用项目已有的碎片化叙事系统）：
//   news    → 镇上的报纸多一篇报道
//   message → 过一会儿收到当事人的来信
//   item    → 当事人身上/家里多一件可摸到的物品，读它能看到那晚的另一面

import { NARRATIVE_ITEMS, NPC_POCKET_NARRATIVES, HOME_STASH_NARRATIVES } from "../config/narrativeItems.js";

export class TheaterAftermath {
  constructor(deps = {}) {
    this.newspaper = deps.newspaper;
    this.phone = deps.phone;
    this.hud = deps.hud;
    this.npcRegistry = deps.npcRegistry;
    this.getDay = deps.getDay || (() => 1);
    this.injected = []; // 记录本局注入过的物品 id，避免重复注入
  }

  /**
   * @param {object} oc  结局节点的 outcome，读它的 aftermath 字段
   * @param {object} ctx { tree, cast }  cast: [{roleId, stageName, npc}]
   */
  apply(oc, ctx = {}) {
    const af = oc?.aftermath;
    if (!af) return { news: false, message: false, item: false };
    const done = { news: false, message: false, item: false };
    const day = this.getDay();

    // 1) 报纸报道
    if (af.news?.title && this.newspaper?.publishCustom) {
      try {
        this.newspaper.publishCustom(af.news.title, af.news.body || "", { time: `第 ${day} 天` });
        done.news = true;
      } catch (e) { void e; }
    }

    // 2) 当事人来信（延迟投递，像是事后想起来才写的）
    if (af.message?.text && this.phone?.deliverMessage) {
      const member = this._memberOf(ctx.cast, af.message.fromRole);
      const fromName = member?.stageName || af.message.fromName || "镇上的某人";
      const id = this._relIdOf(member) || `theater_${ctx.tree?.id || "event"}`;
      const delay = 25000 + Math.random() * 25000;
      setTimeout(() => {
        try {
          this.phone.deliverMessage(id, fromName, af.message.text, { storyId: ctx.tree?.id });
        } catch (e) { void e; }
      }, delay);
      done.message = true;
    }

    // 3) 可摸到的物品
    if (af.item?.name && af.item?.content) {
      const member = this._memberOf(ctx.cast, af.item.ownerRole);
      const relId = this._relIdOf(member);
      const id = `theater_${ctx.tree?.id || "ev"}_${af.item.key || slug(af.item.name)}`;
      if (relId && !this.injected.includes(id) && !NARRATIVE_ITEMS.some((n) => n.id === id)) {
        const item = {
          id,
          name: af.item.name,
          icon: af.item.icon || "📄",
          npcId: relId,
          location: af.item.location === "home" ? "home" : "pocket",
          homeId: af.item.location === "home" ? relId : undefined,
          value: Math.max(5, Math.min(80, af.item.value || 20)),
          content: af.item.content,
        };
        NARRATIVE_ITEMS.push(item);
        if (item.location === "home") {
          (HOME_STASH_NARRATIVES[relId] ||= []).push(item);
        } else {
          (NPC_POCKET_NARRATIVES[relId] ||= []).push(item);
        }
        this.injected.push(id);
        done.item = true;
      }
    }

    if (done.news || done.message || done.item) {
      const bits = [];
      if (done.news) bits.push("报纸");
      if (done.message) bits.push("来信");
      if (done.item) bits.push("遗留物");
      this.hud?.toast?.(`📌 这件事留下了后续：${bits.join("、")}`, { side: true, key: "aftermath", duration: 4500 });
    }
    return done;
  }

  _memberOf(cast, roleId) {
    if (!cast) return null;
    if (!roleId) return cast[0] || null;
    return cast.find((c) => c.roleId === roleId) || cast[0] || null;
  }

  /** 演员 → 关系系统里的 id（有 registry 用 registry id，否则用显示名） */
  _relIdOf(member) {
    if (!member) return null;
    const name = member.stageName || member.npc?.phone?.owner;
    if (!name) return null;
    const reg = this.npcRegistry?.findByDisplayName?.(name);
    return reg?.id || member.npc?.phone?.id || name;
  }
}

function slug(s) {
  return String(s).replace(/[^\w\u4e00-\u9fa5]/g, "").slice(0, 12) || "item";
}
