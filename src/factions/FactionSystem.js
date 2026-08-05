// FactionSystem.js — 势力系统：玩家势力 + 黑蹄会 + 四根支柱。
// 纯逻辑，操作 WorldState。不触碰 THREE/DOM。

import { BOSS_PILLARS, APPROACHES, PRESSURE_SCHEDULE, getCampaignPhase } from "../config/campaignData.js";

export class FactionSystem {
  constructor(worldState) {
    this.worldState = worldState;
  }

  // ---- 黑蹄会支柱 ----
  getBlackHoofPillars() {
    const bh = this.worldState.getBlackHoof();
    return bh ? bh.pillars : null;
  }

  getPillarValue(pillarKey) {
    return this.worldState.getPillar("black_hoof", pillarKey)?.value ?? 0;
  }

  // 削弱支柱
  damagePillar(pillarKey, amount, source = "player_action") {
    const ws = this.worldState;
    const oldVal = this.getPillarValue(pillarKey);
    ws.damagePillar("black_hoof", pillarKey, amount);
    const newVal = this.getPillarValue(pillarKey);
    return {
      pillar: pillarKey,
      oldValue: oldVal,
      newValue: newVal,
      collapsed: newVal <= BOSS_PILLARS[pillarKey].collapseAt,
      source,
    };
  }

  // 检查支柱是否崩溃
  isPillarCollapsed(pillarKey) {
    const pillar = this.worldState.getPillar("black_hoof", pillarKey);
    if (!pillar) return false;
    return pillar.value <= pillar.collapseAt;
  }

  getCollapsedCount() {
    let count = 0;
    for (const key of Object.keys(BOSS_PILLARS)) {
      if (this.isPillarCollapsed(key)) count++;
    }
    return count;
  }

  getWeakestPillar() {
    const pillars = this.getBlackHoofPillars();
    if (!pillars) return null;
    let weakest = null;
    let lowest = Infinity;
    for (const [key, p] of Object.entries(pillars)) {
      if (p.value < lowest) { lowest = p.value; weakest = key; }
    }
    return { key: weakest, value: lowest };
  }

  // ---- 玩家势力 ----
  getPlayerFaction() {
    return this.worldState.getPlayerFaction();
  }

  getPlayerInfluence() {
    return this.worldState.state.factions.player.influence;
  }

  addPlayerInfluence(amount) {
    const pf = this.worldState.state.factions.player;
    pf.influence = Math.max(0, Math.min(100, pf.influence + amount));
  }

  addPlayerMoney(amount) {
    const pf = this.worldState.state.factions.player;
    pf.money += amount;
  }

  addPlayerManpower(amount) {
    const pf = this.worldState.state.factions.player;
    pf.manpower = Math.max(0, pf.manpower + amount);
  }

  /**
   * 加入玩家势力。
   *
   * members 必须保持"字符串 id 数组"—— OperationSystem / DailySimulation /
   * StoryEffects / NPCRegistry 五处都按这个形状读它，改成对象数组会一起炸。
   * 所以额外信息（明面归属、是否卧底、信任度）另存在 memberMeta 里，
   * 按 id 索引。这也是 Nemesis 那套双向卧底要用的地基。
   *
   * @param npcId 注册表 id（不是显示名）
   * @param meta  { allegiance, undercover, trust, job, recruitedBy, reportsTo }
   */
  addPlayerMember(npcId, meta = null) {
    if (!npcId) return false;
    const pf = this.worldState.state.factions.player;
    let added = false;
    if (!pf.members.includes(npcId)) {
      pf.members.push(npcId);
      pf.manpower += 1;
      added = true;
    }
    if (meta) {
      if (!pf.memberMeta) pf.memberMeta = {};
      pf.memberMeta[npcId] = { ...(pf.memberMeta[npcId] || {}), ...meta };
    }
    return added;
  }

  /** 某个成员的附加信息（卧底身份等）；没有就返回空对象 */
  getMemberMeta(npcId) {
    return this.worldState.state.factions.player.memberMeta?.[npcId] || {};
  }

  /** 明面上就是自己人的成员（卧底不算 —— 他们在名单上要另行标注） */
  getOpenMembers() {
    const pf = this.worldState.state.factions.player;
    return (pf.members || []).filter((id) => !this.getMemberMeta(id).undercover);
  }

  /** 潜伏在别的势力里的自己人 */
  getUndercoverMembers() {
    const pf = this.worldState.state.factions.player;
    return (pf.members || []).filter((id) => this.getMemberMeta(id).undercover);
  }

  removePlayerMember(npcId) {
    const pf = this.worldState.state.factions.player;
    const idx = pf.members.indexOf(npcId);
    if (idx >= 0) {
      pf.members.splice(idx, 1);
      pf.manpower = Math.max(0, pf.manpower - 1);
    }
  }

  changePlayerMorale(amount) {
    const pf = this.worldState.state.factions.player;
    pf.morale = Math.max(0, Math.min(100, pf.morale + amount));
  }

  upgradeHQ() {
    const pf = this.worldState.state.factions.player;
    if (pf.hqLevel < 3) pf.hqLevel += 1;
    return pf.hqLevel;
  }

  // ---- 每日收入结算 ----
  settleIncome(worldState) {
    const pf = worldState.state.factions.player;
    const bh = worldState.getBlackHoof();
    if (!bh) return;

    // 玩家势力基础收入
    const hqIncome = pf.hqLevel * 20;    // 驻地等级产出
    const territoryIncome = pf.territories.length * 15;
    const memberCost = pf.members.length * 10; // 成员维护费用
    pf.money += hqIncome + territoryIncome - memberCost;

    // 黑蹄会收入
    bh.money += 80 + bh.pillars.wealth.value * 2;
    bh.money -= bh.manpower * 5; // 人手开支
  }

  // ---- 势力每日行动 ----
  settleFactionActions(worldState, eventLog) {
    const day = worldState.day;
    const bh = worldState.getBlackHoof();
    if (!bh) return;

    // 初始化每日行动摘要
    const factionActions = [];

    // 黑蹄会根据压力日程选择行动
    const pressure = this._getPressureConfig(day);
    const intensity = pressure ? pressure.enemyIntensity : 0.3;

    // 黑蹄会行动：保护最弱支柱
    const weakest = this.getWeakestPillar();
    if (weakest && weakest.value < 60) {
      // 尝试恢复一些（敌方巩固）
      bh.pillars[weakest.key].value = Math.min(100, bh.pillars[weakest.key].value + 3 * intensity);
      factionActions.push({
        faction: "黑蹄会",
        action: `巩固${weakest.label}支柱`,
        description: `黑蹄会加强了对${weakest.label}的管控，小镇上多了几个穿黑西装的陌生人。`,
      });
    }

    // 黑蹄会对玩家势力的骚扰
    if (intensity > 0.3 && Math.random() < intensity) {
      const pf = worldState.state.factions.player;
      const harassment = Math.round(intensity * 5 + 3);
      pf.morale = Math.max(0, pf.morale - harassment);

      if (eventLog) {
        eventLog.recordFactionChange("black_hoof", {
          action: "harass",
          target: "player",
          intensity,
          moraleDamage: harassment,
        }, ["enemy", "daily"]);
      }
      factionActions.push({
        faction: "黑蹄会",
        action: "骚扰你的帮派",
        description: `黑蹄会派人砸了你驻地外的东西，士气 -${harassment}。`,
      });
    }

    // 黑蹄会根据策略调整
    if (bh.strategy === "profit_and_control") {
      // 优先保护财富支柱
      if (bh.pillars.wealth.value < 40) {
        bh.money += 30;
        bh.pillars.wealth.value = Math.min(100, bh.pillars.wealth.value + 5);
        factionActions.push({
          faction: "黑蹄会",
          action: "充填金库",
          description: `黑蹄会从外地运来一车银元，金库又充实了不少。`,
        });
      }
    }

    // 存储供 UI 使用
    worldState.state.lastFactionActions = factionActions;
  }

  _getPressureConfig(day) {
    return PRESSURE_SCHEDULE[day] || null;
  }

  // ---- 胜利条件检查 ----
  checkVictory(worldState) {
    const ws = worldState.state;
    const collapsed = this.getCollapsedCount();
    const pf = ws.factions.player;

    // 完全失败
    if (pf.morale <= 0 && pf.members.length < 2) {
      return "failure";
    }

    // 优势胜利
    if (collapsed >= 3 && pf.hqLevel >= 2) {
      return "dominant";
    }

    // 普通胜利
    if (collapsed >= 2 && pf.influence >= 45) {
      return "normal";
    }

    // 苦涩结局（仅在第10天判定）
    if (ws.day >= 10) {
      if (collapsed >= 1) return "bitter";
      return "failure";
    }

    return null; // 尚未结束
  }

  // ---- 识别玩家行为风格 ----
  detectPlayerStyle(worldState) {
    const events = worldState.getRecentEvents(20);
    const tags = {};
    for (const e of events) {
      for (const t of e.tags || []) {
        tags[t] = (tags[t] || 0) + 1;
      }
    }

    const style = [];
    if ((tags.violent || 0) >= 2) style.push("violent");
    if ((tags.economic || 0) >= 2) style.push("economic");
    if ((tags.social || 0) >= 2) style.push("social");
    if ((tags.intelligence || 0) >= 2) style.push("intelligence");
    if ((tags.legal || 0) >= 2) style.push("legal");

    return style.length > 0 ? style : ["mixed"];
  }
}
