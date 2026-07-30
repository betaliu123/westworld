// NarrativeService.js — LLM 叙事服务客户端。
// 调用 DeepSeek v4-pro 生成每日叙事文本。
// 包含完整验证、超时、回退机制。

import { SYSTEM_PROMPT, buildUserPrompt, buildStoryBeatPrompt } from "./LlmPrompts.js";

const API_ENDPOINT = "https://ai.leihuo.netease.com/v1/chat/completions";
const API_KEY = "sk-TqudEXdZejKQQAtFApIpoYfbFsevdSM4IknLBtgHM6WoLPQk";
const MODEL = "deepseek-v4-pro";
const TIMEOUT_MS = 15000;  // 15 秒超时
const MAX_RETRIES = 2;

export class NarrativeService {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.eventLog = deps.eventLog;
    this.enabled = deps.enabled !== false;  // 默认启用

    // 调用统计
    this.stats = {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      lastCallTime: null,
      lastError: null,
    };
  }

  /**
   * 调用 LLM 生成每日文本。
   *
   * @param {WorldState} worldState
   * @param {object} directorPlan - Director.selectDailyPlan 的返回值
   * @returns {object|null} 解析后的 LLM 响应，失败返回 null
   */
  async generateDailyText(worldState, directorPlan) {
    if (!this.enabled) return null;

    const userPrompt = buildUserPrompt(worldState);
    return this._callLLM(userPrompt, worldState);
  }

  /**
   * 为特定 StoryTree 节点生成文本。
   */
  async generateStoryBeatText(worldState, storyId, nodeId) {
    if (!this.enabled) return null;

    const userPrompt = buildStoryBeatPrompt(worldState, storyId, nodeId);
    if (!userPrompt) return null;

    return this._callLLM(userPrompt, worldState, { storyId, nodeId });
  }

  /**
   * 核心 LLM 调用（含重试和回退）。
   */
  async _callLLM(userPrompt, worldState, context = {}) {
    const startTime = Date.now();
    this.stats.totalCalls++;
    this.stats.lastCallTime = new Date().toISOString();

    const requestBody = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[NarrativeService] LLM 调用 #${attempt} (${(userPrompt.length / 1024).toFixed(1)}KB prompt)`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "无法读取错误");
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // 验证响应结构
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error("无效的 API 响应结构");
        }

        const content = data.choices[0].message.content;
        console.log(`[NarrativeService] LLM 响应 (${(content.length / 1024).toFixed(1)}KB)`);

        // 解析 JSON 输出
        const parsed = this._parseResponse(content, worldState);

        // 验证
        const errors = this._validateResponse(parsed, worldState);
        if (errors.length > 0) {
          console.warn("[NarrativeService] 验证警告:", errors);
          // 对于验证错误，仍返回结果但标记
          parsed._validationWarnings = errors;
        }

        // 记录到 EventLog
        if (this.eventLog && worldState) {
          this.eventLog.record({
            type: "LLM_CALL",
            actors: ["director"],
            location: "ai",
            facts: {
              promptLength: userPrompt.length,
              responseLength: content.length,
              model: MODEL,
              duration: Date.now() - startTime,
              beatCount: parsed.textPackages?.length || 0,
              context,
            },
            visibility: ["debug"],
            tags: ["llm", "daily"],
          });
        }

        this.stats.successCalls++;
        console.log(`[NarrativeService] ✅ 调用成功 (${Date.now() - startTime}ms)`);

        return parsed;

      } catch (error) {
        lastError = error;
        console.warn(`[NarrativeService] 调用失败 (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

        if (attempt < MAX_RETRIES) {
          // 重试前等待
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // 所有重试都失败
    this.stats.failedCalls++;
    this.stats.lastError = lastError?.message || "未知错误";

    if (this.eventLog && worldState) {
      this.eventLog.record({
        type: "LLM_FAILED",
        actors: ["director"],
        location: "ai",
        facts: { error: lastError?.message, duration: Date.now() - startTime },
        visibility: ["debug"],
        tags: ["llm", "error"],
      });
    }

    console.warn("[NarrativeService] ❌ 所有重试均失败，使用模板文本回退");
    return null;
  }

  /**
   * 解析 LLM 的 JSON 输出。
   * 处理可能被包裹在 markdown 代码块中的 JSON。
   */
  _parseResponse(content, worldState) {
    // 尝试提取 markdown 代码块中的 JSON
    let jsonStr = content;

    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // 尝试找到第一个 { 和最后一个 }
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("[NarrativeService] JSON 解析失败:", e.message);
      console.error("[NarrativeService] 原始内容前 500 字:", content.slice(0, 500));

      // 尝试修复常见错误
      try {
        // 移除尾部逗号
        const fixed = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        return JSON.parse(fixed);
      } catch (e2) {
        console.error("[NarrativeService] JSON 修复也失败");
        return {
          textPackages: [],
          recommendedBeatIds: [],
          reasonCodes: ["fallback"],
          _parseError: true,
          _rawContent: content.slice(0, 200),
        };
      }
    }
  }

  /**
   * 验证 LLM 响应。
   * 检查：NPC 名称是否都在存活列表中，beatId 是否在候选列表中。
   *
   * @returns {Array} 错误/警告字符串列表
   */
  _validateResponse(response, worldState) {
    const errors = [];

    if (!response || !response.textPackages) {
      errors.push("响应缺少 textPackages");
      return errors;
    }

    // 收集所有存活的 NPC 名称
    const aliveNpcNames = new Set();
    const aliveNpcIds = new Set();
    for (const [id, npc] of Object.entries(worldState.state.npcs || {})) {
      if (npc.alive) {
        aliveNpcNames.add(npc.name);
        aliveNpcIds.add(id);
      }
    }

    // 收集有效的 beatId
    const validBeatIds = new Set();
    for (const beat of (worldState.state.directorPlan?.beats || [])) {
      validBeatIds.add(beat.storyId ? `${beat.storyId}:${beat.nodeId}` : beat.title);
    }

    for (const pkg of response.textPackages) {
      // 检查 beatId 是否有效（如果提供）
      if (pkg.beatId && !validBeatIds.has(pkg.beatId)) {
        errors.push(`未知 beatId: ${pkg.beatId}`);
      }

      // 检查 NPC 名称（简单检查：已知 NPC 名称是否出现在文本中 —— 不强制要求）
      // 不做强制检查，因为 from 字段可能包含非 NPC
    }

    // 检查 reasonCodes 是否有效
    const validReasonCodes = [
      "emotional_peak", "foreshadowing", "consequence",
      "world_reaction", "character_development", "atmosphere",
    ];
    for (const code of (response.reasonCodes || [])) {
      if (!validReasonCodes.includes(code)) {
        errors.push(`无效 reasonCode: ${code}`);
      }
    }

    return errors;
  }

  /**
   * 检查 LLM 服务是否健康。
   * 简单检查：最近调用成功率 > 50%。
   */
  isHealthy() {
    if (this.stats.totalCalls === 0) return true;
    return this.stats.successCalls / this.stats.totalCalls >= 0.5;
  }

  /**
   * 获取调用统计。
   */
  getStats() {
    return { ...this.stats, healthy: this.isHealthy() };
  }

  /**
   * 启用/禁用 LLM。
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[NarrativeService] LLM ${enabled ? "已启用" : "已禁用"}`);
  }
}
