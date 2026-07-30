// RelationshipSystem.js — 多维人际关系管理。
// 关系不是单一好感度，而是 trust/affection/fear/debt/resentment/respect 六轴。

import { INITIAL_RELATIONSHIPS, DEFAULT_RELATIONSHIP } from "../config/npcData.js";

export class RelationshipSystem {
  constructor(worldState) {
    this.worldState = worldState;
    this._initDefaults();
  }

  _initDefaults() {
    const ws = this.worldState;
    for (const [key, val] of Object.entries(INITIAL_RELATIONSHIPS)) {
      const [from, to] = key.split("->");
      if (!ws.getRelationship(from, to)) {
        ws.setRelationship(from, to, { ...val, lastInteractionDay: 0, flags: [] });
      }
    }
  }

  // 获取关系边
  get(fromId, toId) {
    return this.worldState.getRelationship(fromId, toId);
  }

  getByKey(key) {
    const [from, to] = key.split("->");
    return this.worldState.getRelationship(from, to);
  }

  // 获取或创建默认关系
  getOrCreate(fromId, toId) {
    let rel = this.worldState.getRelationship(fromId, toId);
    if (!rel) {
      rel = { ...DEFAULT_RELATIONSHIP, lastInteractionDay: 0, flags: [] };
      this.worldState.setRelationship(fromId, toId, rel);
    }
    return rel;
  }

  set(fromId, toId, data) {
    this.worldState.setRelationship(fromId, toId, data);
  }

  // 修改具体维度
  modifyTrust(fromId, toId, amount) {
    const rel = this.getOrCreate(fromId, toId);
    rel.trust = Math.max(-100, Math.min(100, (rel.trust || 0) + amount));
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  modifyAffection(fromId, toId, amount) {
    const rel = this.getOrCreate(fromId, toId);
    rel.affection = Math.max(-100, Math.min(100, (rel.affection || 0) + amount));
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  modifyFear(fromId, toId, amount) {
    const rel = this.getOrCreate(fromId, toId);
    rel.fear = Math.max(0, Math.min(100, (rel.fear || 0) + amount));
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  modifyDebt(fromId, toId, amount) {
    const rel = this.getOrCreate(fromId, toId);
    rel.debt = Math.max(0, Math.min(100, (rel.debt || 0) + amount));
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  modifyResentment(fromId, toId, amount) {
    const rel = this.getOrCreate(fromId, toId);
    rel.resentment = Math.max(0, Math.min(100, (rel.resentment || 0) + amount));
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  modifyRespect(fromId, toId, amount) {
    const rel = this.getOrCreate(fromId, toId);
    rel.respect = Math.max(-100, Math.min(100, (rel.respect || 0) + amount));
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  // 批量修改（传入变化对象）
  applyChange(fromId, toId, changes) {
    const rel = this.getOrCreate(fromId, toId);
    if (changes.trust !== undefined) rel.trust = Math.max(-100, Math.min(100, (rel.trust || 0) + changes.trust));
    if (changes.affection !== undefined) rel.affection = Math.max(-100, Math.min(100, (rel.affection || 0) + changes.affection));
    if (changes.fear !== undefined) rel.fear = Math.max(0, Math.min(100, (rel.fear || 0) + changes.fear));
    if (changes.debt !== undefined) rel.debt = Math.max(0, Math.min(100, (rel.debt || 0) + changes.debt));
    if (changes.resentment !== undefined) rel.resentment = Math.max(0, Math.min(100, (rel.resentment || 0) + changes.resentment));
    if (changes.respect !== undefined) rel.respect = Math.max(-100, Math.min(100, (rel.respect || 0) + changes.respect));
    if (changes.flag) {
      if (!rel.flags) rel.flags = [];
      if (!rel.flags.includes(changes.flag)) rel.flags.push(changes.flag);
    }
    rel.lastInteractionDay = this.worldState.day;
    this.set(fromId, toId, rel);
  }

  // 关系摘要（供 UI 显示）
  getSummary(fromId, toId) {
    const rel = this.get(fromId, toId);
    if (!rel) return { trust: "未知", affection: "无", fear: "无", debt: "无", resentment: "无", respect: "无" };
    return {
      trust: this._labelTrust(rel.trust || 0),
      affection: this._labelAffection(rel.affection || 0),
      fear: this._labelFear(rel.fear || 0),
      debt: this._labelDebt(rel.debt || 0),
      resentment: this._labelResentment(rel.resentment || 0),
      respect: this._labelRespect(rel.respect || 0),
    };
  }

  _labelTrust(v) {
    if (v >= 60) return "信赖";
    if (v >= 30) return "初步信任";
    if (v >= -30) return "中立";
    return "戒备";
  }

  _labelAffection(v) {
    if (v >= 50) return "亲近";
    if (v >= 20) return "友善";
    if (v >= -50) return "普通";
    return "厌恶";
  }

  _labelFear(v) {
    if (v >= 60) return "恐惧";
    if (v >= 30) return "忌惮";
    return "无";
  }

  _labelDebt(v) {
    if (v >= 50) return "重恩";
    if (v >= 20) return "欠你一次";
    return "无";
  }

  _labelResentment(v) {
    if (v >= 70) return "不共戴天";
    if (v >= 40) return "敌视";
    if (v >= 15) return "不满";
    return "无";
  }

  _labelRespect(v) {
    if (v >= 60) return "尊敬";
    if (v >= 20) return "认可";
    return "普通";
  }

  // 每日衰减
  decayAll(worldState) {
    const ws = worldState;
    const decayRate = 0.2; // 每天每维度微量回归
    const day = ws.day;

    for (const [key, rel] of Object.entries(ws.state.relationships)) {
      let changed = false;
      if (day - rel.lastInteractionDay > 3) {
        // 长时间无互动，关系回归
        if (rel.trust > 0) { rel.trust = Math.max(0, rel.trust - decayRate * (day - rel.lastInteractionDay)); changed = true; }
        if (rel.fear > 0) { rel.fear = Math.max(0, rel.fear - decayRate * (day - rel.lastInteractionDay)); changed = true; }
        if (rel.debt > 0) { rel.debt = Math.max(0, rel.debt - decayRate * 0.5 * (day - rel.lastInteractionDay)); changed = true; }
      }
      if (changed) {
        const [from, to] = key.split("->");
        ws.setRelationship(from, to, rel);
      }
    }
  }

  // ---- 对玩家关系的便捷方法 ----
  addPlayerTrust(npcId, amount) {
    this.modifyTrust(npcId, "player", amount);
  }

  addPlayerAffection(npcId, amount) {
    this.modifyAffection(npcId, "player", amount);
  }

  addPlayerFear(npcId, amount) {
    this.modifyFear(npcId, "player", amount);
  }

  addPlayerDebt(npcId, amount) {
    this.modifyDebt(npcId, "player", amount);
  }

  addPlayerResentment(npcId, amount) {
    this.modifyResentment(npcId, "player", amount);
  }

  addPlayerRespect(npcId, amount) {
    this.modifyRespect(npcId, "player", amount);
  }

  getPlayerRelationship(npcId) {
    return this.get(npcId, "player");
  }

  getPlayerSummary(npcId) {
    return this.getSummary(npcId, "player");
  }
}
