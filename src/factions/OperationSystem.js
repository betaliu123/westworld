// OperationSystem.js — 派遣行动系统。6 种行动类型，规则评分结算。

export const OPERATION_TYPES = {
  gather_intel: {
    label: "收集情报",
    difficulty: 30,
    cost: 20,
    primaryStat: "stealth",
    primaryPillarDamage: "legitimacy",
    pillarDamageOnSuccess: 5,
    description: "派遣成员潜入敌方地盘收集情报。",
    outcomes: {
      success: "成功获取情报",
      partial: "获得部分情报但成员受伤",
      exposed: "行动暴露但发现新突破口",
      missing: "成员失踪",
    },
  },
  protect_assets: {
    label: "保护产业",
    difficulty: 25,
    cost: 15,
    primaryStat: "combat",
    primaryPillarDamage: "wealth",
    pillarDamageOnSuccess: 4,
    description: "保护己方产业免受敌方破坏。",
    outcomes: {
      success: "产业安全",
      partial: "产业部分受损",
      exposed: "冲突升级",
      missing: "成员受伤",
    },
  },
  collect_debt: {
    label: "催收债务",
    difficulty: 20,
    cost: 10,
    primaryStat: "social",
    primaryPillarDamage: "wealth",
    pillarDamageOnSuccess: 6,
    description: "向债务人催收欠款，动摇敌方经济基础。",
    outcomes: {
      success: "全额回收",
      partial: "部分回收但关系恶化",
      exposed: "债务人告密",
      missing: "成员被债务人扣留",
    },
  },
  rescue: {
    label: "营救人质",
    difficulty: 50,
    cost: 40,
    primaryStat: "combat",
    primaryPillarDamage: "manpower",
    pillarDamageOnSuccess: 8,
    description: "营救被敌方扣押的人员。",
    outcomes: {
      success: "人质安全获救",
      partial: "人质获救但成员受伤",
      exposed: "营救失败，人质转移",
      missing: "营救队失踪",
    },
  },
  sabotage: {
    label: "破坏敌方产业",
    difficulty: 40,
    cost: 35,
    primaryStat: "stealth",
    primaryPillarDamage: "territory",
    pillarDamageOnSuccess: 7,
    description: "破坏敌方产业设施。",
    outcomes: {
      success: "敌方产业严重受损",
      partial: "部分破坏",
      exposed: "破坏被识破，敌方报复",
      missing: "破坏队被捕",
    },
  },
  recruit: {
    label: "拉拢外围成员",
    difficulty: 30,
    cost: 25,
    primaryStat: "social",
    primaryPillarDamage: "manpower",
    pillarDamageOnSuccess: 5,
    description: "策反敌方外围成员。",
    outcomes: {
      success: "成功策反",
      partial: "建立联系但未策反",
      exposed: "被敌方发现意图",
      missing: "联系人失踪",
    },
  },
};

const OUTCOME_ROLL = {
  success: { min: 0.7, label: "成功" },
  partial: { min: 0.4, label: "部分成功" },
  exposed: { min: 0.15, label: "行动暴露" },
  missing: { min: 0, label: "成员失踪" },
};

export class OperationSystem {
  constructor(factionSystem, worldState) {
    this.factionSystem = factionSystem;
    this.worldState = worldState;
    this.activeOperations = [];
  }

  /**
   * 发起派遣行动
   * @param {string} opType - 行动类型 key
   * @param {string[]} memberIds - 派遣成员 ID 列表
   * @param {number} investment - 额外资金投入
   * @param {object} bonusModifiers - 关系/情报/装备加成
   */
  dispatch(opType, memberIds = [], investment = 0, bonusModifiers = {}) {
    const def = OPERATION_TYPES[opType];
    if (!def) return null;

    const ws = this.worldState;
    const pf = ws.state.factions.player;

    // 检查驻地等级
    if (pf.hqLevel < 2) return { error: "需要驻地等级 2" };

    // 检查资金
    const totalCost = def.cost + investment;
    if (pf.money < totalCost) return { error: "资金不足" };

    // 扣除费用
    pf.money -= totalCost;

    const operation = {
      id: `op_${Date.now()}`,
      type: opType,
      def,
      members: memberIds,
      investment,
      bonusModifiers,
      startedDay: ws.day,
      completed: false,
    };

    this.activeOperations.push(operation);
    ws.state.operations[operation.id] = operation;

    return operation;
  }

  /**
   * 结算所有活跃行动（每日结束时调用）
   */
  settleAll() {
    const results = [];
    for (const op of this.activeOperations) {
      if (op.completed) continue;
      // 行动至少需要 1 天
      const daysPassed = this.worldState.day - op.startedDay;
      if (daysPassed < 1) continue;

      const result = this._settleOne(op);
      op.completed = true;
      op.result = result;
      results.push(result);
    }

    // 清理已完成的
    this.activeOperations = this.activeOperations.filter(op => !op.completed);
    return results;
  }

  _settleOne(op) {
    const def = op.def;
    const ws = this.worldState;

    // 计算成功率
    let successRate = 50; // 基础 50%

    // 成员能力加成（取派遣成员中最高相关属性）
    if (op.members.length > 0) {
      const bestStat = Math.max(...op.members.map(mid => {
        const npc = ws.getNPC(mid);
        return npc ? (npc.stats ? (npc.stats[def.primaryStat] || 30) : 30) : 30;
      }));
      successRate += (bestStat - 30) * 0.5;
    }

    // 关系/情报/装备加成
    if (op.bonusModifiers.relationshipBonus) successRate += op.bonusModifiers.relationshipBonus;
    if (op.bonusModifiers.intelBonus) successRate += op.bonusModifiers.intelBonus;
    if (op.bonusModifiers.equipmentBonus) successRate += op.bonusModifiers.equipmentBonus;

    // 投入加成
    successRate += op.investment * 0.1;

    // 行动难度惩罚
    successRate -= def.difficulty * 0.5;

    // 敌方警戒惩罚
    const bh = ws.getBlackHoof();
    if (bh) successRate -= (bh.heat || 0) * 0.2;

    // 伤势和疲劳惩罚
    for (const mid of op.members) {
      const npc = ws.getNPC(mid);
      if (npc) {
        if (npc.injury) successRate -= 10;
        if (npc.fatigue && npc.fatigue > 50) successRate -= 8;
      }
    }

    // 掷骰
    successRate = Math.max(5, Math.min(95, successRate));
    const roll = Math.random() * 100;

    let outcome;
    if (roll <= successRate * 0.3) outcome = "success";
    else if (roll <= successRate) outcome = "partial";
    else if (roll <= successRate + 20) outcome = "exposed";
    else outcome = "missing";

    // 结果效果
    const result = {
      id: op.id,
      type: op.type,
      outcome,
      label: def.outcomes[outcome],
      success: outcome === "success" || outcome === "partial",
      pillarDamage: 0,
      moneyGained: 0,
      memberInjury: false,
      memberMissing: false,
    };

    // 支柱伤害
    if (outcome === "success") {
      result.pillarDamage = def.pillarDamageOnSuccess;
    } else if (outcome === "partial") {
      result.pillarDamage = Math.round(def.pillarDamageOnSuccess * 0.5);
    } else if (outcome === "exposed") {
      result.pillarDamage = Math.round(def.pillarDamageOnSuccess * 0.3);
    }

    if (result.pillarDamage > 0 && def.primaryPillarDamage) {
      this.factionSystem.damagePillar(def.primaryPillarDamage, result.pillarDamage, `operation_${op.id}`);
    }

    // 金钱收益
    if (outcome === "success") result.moneyGained = Math.round(def.cost * 1.5);
    else if (outcome === "partial") result.moneyGained = Math.round(def.cost * 0.5);

    if (result.moneyGained > 0) {
      this.factionSystem.addPlayerMoney(result.moneyGained);
    }

    // 成员状态
    if (outcome === "missing") {
      result.memberMissing = true;
      // 触发 ST11 候选
      for (const mid of op.members) {
        const npc = ws.getNPC(mid);
        if (npc) npc.status = "missing";
      }
    } else if (outcome === "partial" || outcome === "exposed") {
      result.memberInjury = true;
    }

    return result;
  }

  // 取消行动
  cancel(opId) {
    const idx = this.activeOperations.findIndex(op => op.id === opId && !op.completed);
    if (idx < 0) return false;
    const op = this.activeOperations[idx];
    // 退还一半费用
    const refund = Math.round(op.def.cost * 0.5);
    this.factionSystem.addPlayerMoney(refund);
    this.activeOperations.splice(idx, 1);
    delete this.worldState.state.operations[op.id];
    return true;
  }
}
