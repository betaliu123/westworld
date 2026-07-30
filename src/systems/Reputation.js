// Reputation.js — 荣誉值(-100~100) 与 通缉度(0~5星) + 各帮派声望。荒野大镖客式声望系统。
// 荣誉：正向交互↑、暴力↓；通缉：犯罪行为↑，随时间/远离缓慢衰减；帮派声望：与其成员交互影响。

import { GANGS } from "./AIBrain.js";
import { REPUTATION } from "../config/gameData.js";

export class Reputation {
  constructor() {
    this.honor = 0;        // -100(恶名) ~ 100(义士)
    this.wanted = 0;       // 0 ~ 100 内部值，映射到 0~5 星
    this.gangs = {};       // 各帮派声望 -100~100
    for (const g of GANGS) this.gangs[g] = 0;
    this.listeners = [];
    this._decayTimer = 0;
  }

  onChange(cb) { this.listeners.push(cb); }
  _emit() { for (const cb of this.listeners) cb(this); }

  get honorLabel() {
    for (const t of REPUTATION.labels.honor) {
      if (this.honor >= t.min) return t.label;
    }
    return "中立";
  }

  // 帮派声望标签
  gangLabel(value) {
    for (const t of REPUTATION.labels.gang) {
      if (value >= t.min) return t.label;
    }
    return "中立";
  }

  addGang(gang, delta) {
    if (!gang || this.gangs[gang] === undefined) return;
    this.gangs[gang] = Math.max(-100, Math.min(100, this.gangs[gang] + delta));
    this._emit();
  }

  get wantedStars() {
    return Math.min(5, Math.floor(this.wanted / 20) + (this.wanted > 0 && this.wanted < 20 ? 1 : 0));
  }

  get wantedStarString() {
    const s = this.wantedStars;
    return "★".repeat(s) + "☆".repeat(5 - s);
  }

  addHonor(delta) {
    this.honor = Math.max(-100, Math.min(100, this.honor + delta));
    this._emit();
  }

  addWanted(delta) {
    this.wanted = Math.max(0, Math.min(100, this.wanted + delta));
    this._emit();
  }

  // 行为快捷入口（gang 为受影响 NPC 的帮派，可空）；数值来自配置 REPUTATION.actions
  // 注意：通缉不再直接加 —— 改为目击NPC报案制
  onAttackNPC(gang) {
    const a = REPUTATION.actions.attackNPC;
    this.addHonor(a.honor);
    // 通缉由目击-报案流程处理，此处仅扣荣誉
    this._gangViolence(gang, a.gang);
  }

  onKnockNPC(gang) {
    const a = REPUTATION.actions.knockNPC;
    this.addHonor(a.honor);
    this._gangViolence(gang, a.gang);
  }

  onRunOverNPC(gang) {
    const a = REPUTATION.actions.runOverNPC;
    this.addHonor(a.honor);
    this._gangViolence(gang, a.gang);
  }

  onKindDialogue(gang) {
    const a = REPUTATION.actions.kindDialogue;
    this.addHonor(a.honor);
    if (gang) this.addGang(gang, a.gang);
  }

  onThreatDialogue(gang) {
    const a = REPUTATION.actions.threatDialogue;
    this.addHonor(a.honor);
    // 威胁对话也可能被目击报警，但不直接加通缉
    this._gangViolence(gang, a.gang);
  }

  // 勒索/抢劫成功：掉荣誉，不直接加通缉（由目击流程处理）
  onExtort(gang) {
    const a = REPUTATION.actions.extort;
    this.addHonor(a.honor);
    this._gangViolence(gang, a.gang);
  }

  // 被目击者报警增加的 wanted（由 NPCManager 或 AIBrain 的报案流程调用）
  addCrimeWanted(severity = 1) {
    // severity: 1=普通攻击, 2=击倒, 3=致命
    const gains = [14, 22, 28];
    this.addWanted(gains[Math.min(severity - 1, 2)] || 14);
    this._emit();
  }

  // 车辆撞击警长仍然直接加通缉（警长自己就是执法者）
  addSheriffHitWanted(delta) {
    this.addWanted(delta);
    this._emit();
  }

  // 对某帮派成员施暴 → 该帮派声望下降，其敌对帮派（其余帮派）略微上升（敌人的敌人）
  _gangViolence(gang, delta) {
    if (!gang) return;
    this.addGang(gang, delta);
    for (const g of Object.keys(this.gangs)) {
      if (g !== gang) this.addGang(g, -delta * REPUTATION.gangSpilloverRatio);
    }
  }

  // 入室行窃：seen=true 表示被屋主当场撞见（通缉大涨）
  onBurglary(seen) {
    const a = seen ? REPUTATION.actions.burglarySeen : REPUTATION.actions.burglaryUnseen;
    this.addHonor(a.honor);
    this.addWanted(a.wanted);
  }

  onArrested() {
    // 被捕后通缉清零，荣誉不恢复
    this.wanted = 0;
    this._emit();
  }

  // 通缉度随时间缓慢衰减（"风声过去了"）；参数来自配置
  update(dt) {
    if (this.wanted > 0) {
      this._decayTimer += dt;
      if (this._decayTimer >= REPUTATION.wantedDecayInterval) {
        this._decayTimer = 0;
        this.addWanted(-REPUTATION.wantedDecayAmount);
      }
    }
    // 荣誉极缓慢向中立回归
    // （保持长期影响，回归很慢，此处不做，交由行为驱动）
  }
}
