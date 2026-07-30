// Director.js — AI Director 日常计划选片。
// 从候选事件池中选择每日投放的 beats，考虑情绪弧、冷却、硬优先级。
//
// 核心规则：
//   1 foreground (最高优先级，保证投放)
//   1 mainline (主线，保证投放)
//   0-2 background (低优先级，可能投放)
//   3 ambient (环境事件，必然投放)
//
// 情绪预算：维护近期情绪的多样性，避免连续同类事件。
// 硬优先级：剧本日保证标记（structuralAnchor），强制某些功能出现。

import { checkDeadline } from "../story/StoryConditions.js";
import { PRESSURE_SCHEDULE } from "../config/campaignData.js";

const EMOTIONAL_COOLDOWN = 2; // 同一情绪强度等级冷却2天
const MAX_BACKGROUND_BEATS = 2;

export class Director {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.relationShipSystem = deps.relationshipSystem;
  }

  /**
   * 为次日选择导演计划。
   * 返回 { beats[], forbiddenTags[], requiredFunctions[] }
   */
  selectDailyPlan(worldState, storyRuntime) {
    const day = worldState.day;
    const schedule = PRESSURE_SCHEDULE[day] || {};

    const ws = worldState;

    // Step 1: 收集候选事件
    const candidates = this._collectCandidates(ws, storyRuntime, day);

    // Step 2: 按优先级/类别分组
    const grouped = this._groupBySlot(candidates);

    // Step 3: 情绪预算：检查最近投放的情绪
    const recentEmotions = this._recentEmotionalTones(ws, 3);

    // Step 4: 选择
    const plan = {
      foreground: null,
      mainline: null,
      background: [],
      ambient: [],
      forbiddenTags: [],
      requiredFunctions: schedule.requiredFunctions || [],
      day,
    };

    // 硬优先级：按 requiredFunctions 过滤候选
    const requiredCandidates = candidates.filter(c =>
      schedule.requiredFunctions ? schedule.requiredFunctions.some(fn => c.functions?.includes?.(fn)) : true
    );

    // 选择 foreground（最高情绪强度，不与其他冲突）
    const foregroundPool = grouped.foreground.length > 0 ? grouped.foreground : candidates.filter(c => c.emotionalIntensity >= 4);
    plan.foreground = this._pickBest(foregroundPool, recentEmotions, ws, true);

    // 选择 mainline（主线，优先 matchingPressureDay）
    const mainlinePool = candidates.filter(c =>
      c.slotType === "mainline" ||
      (c.storyId && c.emotionalIntensity >= 3)
    ).filter(c => !this._sameAsSelected(c, [plan.foreground]));
    plan.mainline = this._pickBest(mainlinePool, recentEmotions, ws, true);

    // 选择 background（0-2 个）
    const backgroundPool = candidates.filter(c =>
      c.slotType === "background" || (c.emotionalIntensity >= 1 && c.emotionalIntensity <= 3)
    ).filter(c => !this._sameAsSelected(c, [plan.foreground, plan.mainline]));
    plan.background = this._pickTopN(backgroundPool, MAX_BACKGROUND_BEATS, recentEmotions, ws);

    // 选择 ambient（必然投放，不需要选择）
    plan.ambient = candidates.filter(c => c.slotType === "ambient");

    // 设置冷却标签
    const selectedBeats = [plan.foreground, plan.mainline, ...plan.background, ...plan.ambient].filter(Boolean);
    plan.forbiddenTags = selectedBeats.flatMap(b => b.cooldownTags || []);

    console.log(`[Director] Day ${day} Plan: fg=${plan.foreground?.title}, ml=${plan.mainline?.title}, bg=${plan.background.length}, amb=${plan.ambient.length}`);

    return {
      beats: selectedBeats,
      forbiddenTags: plan.forbiddenTags,
      requiredFunctions: plan.requiredFunctions,
    };
  }

  /**
   * 收集所有候选事件。
   */
  _collectCandidates(ws, storyRuntime, day) {
    const candidates = [];

    // StoryTree 候选交付节点
    if (storyRuntime) {
      const storyCandidates = storyRuntime.getCandidateDeliveries();
      for (const sc of storyCandidates) {
        candidates.push({
          source: "story",
          storyId: sc.storyId,
          nodeId: sc.nodeId,
          title: sc.title,
          description: sc.description,
          channelOptions: sc.candidateDeliveries,
          emotionalIntensity: sc.emotionalIntensity,
          cooldownTags: sc.cooldownTags,
          slotType: sc.emotionalIntensity >= 4 ? "foreground" : sc.emotionalIntensity >= 2 ? "mainline" : "background",
          isUrgent: sc.deadline.urgent,
          needsPlayerChoice: sc.needsPlayerChoice,
          missCount: sc.missCount,
        });
      }
    }

    // 环境事件（day 相关的日常氛围）
    const ambientEvents = this._generateAmbientEvents(ws, day);
    for (const ae of ambientEvents) {
      candidates.push({
        source: "ambient",
        title: ae.title,
        description: ae.description,
        channelOptions: ae.channelOptions,
        emotionalIntensity: 1,
        cooldownTags: [],
        slotType: "ambient",
      });
    }

    // 每日压力事件（根据 PRESSURE_SCHEDULE）
    const schedule = PRESSURE_SCHEDULE[day];
    if (schedule) {
      const pressureBeats = this._generatePressureBeats(ws, day, schedule);
      for (const pb of pressureBeats) {
        candidates.push({
          source: "pressure",
          title: pb.title,
          description: pb.description,
          channelOptions: pb.channelOptions,
          emotionalIntensity: pb.intensity || 2,
          cooldownTags: pb.cooldownTags || [],
          slotType: pb.slotType || "mainline",
          functions: pb.functions || [],
        });
      }
    }

    return candidates;
  }

  /**
   * 生成环境事件（日报、天气、零星事件）。
   */
  _generateAmbientEvents(ws, day) {
    const events = [];

    events.push({
      title: `小镇纪事报 · 第${day}日`,
      description: "新一天的小镇纪事报已出炉。",
      channelOptions: [{ channel: "newspaper", priority: 5 }],
    });

    // 根据支柱状态生成环境事件
    const bh = ws.getBlackHoof();
    if (bh && bh.pillars) {
      const weakPillars = Object.entries(bh.pillars).filter(([, p]) => p.value < 50);
      for (const [key, pillar] of weakPillars) {
        events.push({
          title: "街头议论",
          description: `酒馆里有人在低声议论黑蹄会的${pillar.label}不如从前了。`,
          channelOptions: [{ channel: "rumor", priority: 3 }],
        });
      }
    }

    return events;
  }

  /**
   * 根据压力进度表生成事件。
   */
  _generatePressureBeats(ws, day, schedule) {
    const beats = [];
    const intensity = schedule.enemyIntensity || 0.5;

    // 结构性锚点日
    if (schedule.structuralAnchor) {
      beats.push({
        title: `第${day}天 · ${schedule.name}`,
        description: schedule.directorGuarantee,
        channelOptions: [{ channel: "hq", priority: 5 }],
        intensity: Math.max(3, intensity * 5),
        slotType: "mainline",
        functions: schedule.requiredFunctions || [],
        cooldownTags: [],
      });
    }

    // 敌方行动
    if (schedule.enemyAction) {
      beats.push({
        title: "敌方动向",
        description: `黑蹄会今日动作：${schedule.enemyAction}`,
        channelOptions: [
          { channel: "rumor", priority: 3 },
          { channel: "newspaper", priority: 2 },
        ],
        intensity: Math.min(intensity * 4, 4),
        slotType: "background",
        functions: ["enemy_action"],
      });
    }

    return beats;
  }

  /**
   * 按槽位分组候选。
   */
  _groupBySlot(candidates) {
    return {
      foreground: candidates.filter(c => c.slotType === "foreground"),
      mainline: candidates.filter(c => c.slotType === "mainline"),
      background: candidates.filter(c => c.slotType === "background"),
      ambient: candidates.filter(c => c.slotType === "ambient"),
    };
  }

  /**
   * 选择最佳候选（考虑情绪冷却、紧迫度、错过次数）。
   */
  _pickBest(pool, recentEmotions, ws, prioritiseUrgent) {
    if (pool.length === 0) return null;

    // 复制并排序
    const sorted = [...pool].sort((a, b) => {
      let scoreA = this._scoreCandidate(a, recentEmotions, ws);
      let scoreB = this._scoreCandidate(b, recentEmotions, ws);

      if (prioritiseUrgent) {
        if (a.isUrgent) scoreA += 20;
        if (b.isUrgent) scoreB += 20;
      }
      if (a.missCount) scoreA += a.missCount * 5;
      if (b.missCount) scoreB += b.missCount * 5;

      return scoreB - scoreA;
    });

    return sorted[0] || null;
  }

  /**
   * 选取前 N 个最佳候选。
   */
  _pickTopN(pool, n, recentEmotions, ws) {
    if (pool.length === 0) return [];

    const sorted = [...pool].sort((a, b) => {
      const scoreA = this._scoreCandidate(a, recentEmotions, ws);
      const scoreB = this._scoreCandidate(b, recentEmotions, ws);
      return scoreB - scoreA;
    });

    return sorted.slice(0, n);
  }

  /**
   * 候选评分函数。
   */
  _scoreCandidate(candidate, recentEmotions, ws) {
    let score = 0;

    // 情绪强度（基础权重）
    score += (candidate.emotionalIntensity || 1) * 10;

    // 故事来源有额外权重
    if (candidate.source === "story") score += 15;
    if (candidate.source === "pressure") score += 10;

    // 需要玩家选择的不降分但也不加分
    if (candidate.needsPlayerChoice) score -= 5;

    // 情绪冷却：最近如果投放了同类情绪，减分
    if (candidate.emotionalIntensity && recentEmotions) {
      const recentIntensity = recentEmotions.filter(e => Math.abs(e - candidate.emotionalIntensity) <= 1);
      if (recentIntensity.length > 0) {
        score -= recentIntensity.length * 15;
      }
    }

    // 冷却标签碰撞
    const deliveredTags = ws.state.deliveredBeats.flatMap(b => b?.tags || []);
    if (candidate.cooldownTags && candidate.cooldownTags.some(t => deliveredTags.includes(t))) {
      score -= 30;
    }

    // 紧迫度加分
    if (candidate.isUrgent) score += 25;

    // 错过次数加分（不让玩家永久错过）
    if (candidate.missCount) score += candidate.missCount * 8;

    return score;
  }

  /**
   * 获取最近 N 天的情绪强度列表。
   */
  _recentEmotionalTones(ws, days) {
    const events = ws.state.eventHistory.slice(-50);
    const sinceDay = ws.day - days;
    const intensities = [];

    for (const ev of events) {
      if (ev.day && ev.day >= sinceDay && ev.emotionalIntensity) {
        intensities.push(ev.emotionalIntensity);
      }
    }

    return intensities;
  }

  /**
   * 检查候选是否与已选重复。
   */
  _sameAsSelected(candidate, selected) {
    for (const sel of selected) {
      if (!sel) continue;
      if (candidate.storyId && sel.storyId && candidate.storyId === sel.storyId && candidate.nodeId === sel.nodeId) {
        return true;
      }
      if (!candidate.storyId && !sel.storyId && candidate.title === sel.title) {
        return true;
      }
    }
    return false;
  }
}
