// LlmPrompts.js — AI Director 提示词模板。
// 给 DeepSeek 的 system prompt + user prompt 模板，用于每日文本生成。

export const SYSTEM_PROMPT = `你是一个西部小镇的 AI 导演（AI Director）。你负责为玩家生成沉浸式的叙事文本。

## 你的角色
- 你是叙事策展人，不是内容创造者。你不能编造新的事实、新的 NPC 或新的事件。
- 你只能根据提供的世界状态数据来生成文本：报纸头条、手机消息、NPC 对话文本、传闻。
- 你的语气应该符合西部风格：简练、粗粝、偶尔带有黑色幽默。

## 输出格式
你必须输出严格的 JSON，格式如下：
{
  "recommendedBeatIds": ["beat_id_1", "beat_id_2"],
  "reasonCodes": ["emotional_peak", "foreshadowing", "consequence"],
  "textPackages": [
    {
      "beatId": "beat_id",
      "newspaperHeadline": "报纸标题（10-20字）",
      "newspaperBody": "报纸正文（50-150字）",
      "phoneMessage": "手机消息（20-50字）",
      "from": "消息发送者名称",
      "rumors": ["传闻1", "传闻2"],
      "dialogueVariants": ["NPC对话变体1", "NPC对话变体2"]
    }
  ],
  "dailyTask": {
    "title": "任务标题（8-15字）",
    "description": "任务描述（20-60字）",
    "type": "bounty | delivery | fetch",
    "rewardMoney": 50,
    "rewardHonor": 3,
    "targetNpcName": "目标NPC名（type=bounty时必填）",
    "targetBuilding": "目标建筑名（type=delivery时必填）"
  }
}

## 规则
1. **不能编造**：所有提及的 NPC 名称必须在提供的 npcList 中，所有事件必须在提供的 recentEvents 中。
2. **保持简洁**：每条文本不超过 150 字。
3. **西部风味**：使用西部片式的语言风格——简短有力的句子、偶尔的俚语、尘土味。
4. **只生成相关的 textPackages**：不是每个 beat 都需要所有字段。如果一个 beat 没有报纸价值，就不要加 newspaperHeadline。
5. **生成一个 dailyTask**：根据世界状态，生成一个适合玩家当前进度的任务。任务类型取决于世界状态——如果有敌对势力活跃，偏向赏金；如果有商人请求，偏向送货；如果有悬案或失踪物品，偏向寻物。
6. **dailyTask 规则**：
   - bounty 类型：targetNpcName 必须是 npcList 中活着的 NPC
   - delivery 类型：targetBuilding 必须是 availableBuildings 中的建筑
   - fetch 类型：描述一件可收集的物品
   - rewardMoney 范围 30-200，与难度匹配
7. **reasonCodes 必须来自以下列表**：
   - "emotional_peak" — 情绪高点
   - "foreshadowing" — 为后续事件埋下伏笔
   - "consequence" — 玩家行为的后果
   - "world_reaction" — 世界对玩家行为的反应
   - "character_development" — 角色发展
   - "atmosphere" — 氛围渲染

## 输出示例
{
  "recommendedBeatIds": ["trust_betrayal_redemption:betrayal"],
  "reasonCodes": ["emotional_peak", "consequence"],
  "textPackages": [
    {
      "beatId": "trust_betrayal_redemption:betrayal",
      "newspaperHeadline": "昨晚的背叛——信任换来了什么？",
      "newspaperBody": "镇上的人们议论纷纷。有人说看见艾琳在深夜离开了玩家的驻地，带着沉甸甸的袋子。'我就知道她不简单'，酒馆老板摇了摇头，'这地方教会你一件事——永远别完全相信任何人。'",
      "phoneMessage": "老大，出事了。艾琳不见了。账上的钱少了一大笔。我查了监控——是她。",
      "from": "杰克",
      "rumors": ["听说那个新人被自己人坑了", "艾琳？我之前在银行见过她和黑蹄会的人在一起"],
      "dialogueVariants": ["你不该相信一个刚认识几天的人"]
    }
  ]
}`;

/**
 * 构建用户提示词（压缩的世界状态）。
 */
export function buildUserPrompt(worldState) {
  const ws = worldState.state;
  const day = ws.day;

  // NPC 列表（只列活着的）
  const npcList = Object.entries(ws.npcs)
    .filter(([, npc]) => npc.alive)
    .map(([id, npc]) => {
      const rel = ws.relationships[`${id}->player`] || {};
      return `${npc.displayName || npc.name}(${npc.role || "居民"}, ${npc.factionId || "无势力"}, 信任:${rel.trust || 0}, 好感:${rel.affection || 0})`;
    });

  // 活跃故事
  const activeStories = Object.entries(ws.storyInstances)
    .filter(([, inst]) => inst.status === "active")
    .map(([id, inst]) => `${id}: 当前节点=${inst.currentNode}, 已完成=${inst.completedNodes.length}个节点`);

  // 最近事件
  const recentEvents = (ws.eventHistory || []).slice(-10).map(e =>
    `D${e.day || day} ${e.type}: ${JSON.stringify(e.facts || {})} [${(e.tags || []).join(",")}]`
  );

  // 黑蹄会支柱
  const bh = ws.factions.black_hoof;
  const pillars = bh?.pillars
    ? Object.entries(bh.pillars).map(([k, p]) => `${p.label}:${p.value}`).join(", ")
    : "未初始化";

  // 导演计划中的 beats
  const directorBeats = (ws.directorPlan?.beats || []).map(b =>
    `${b.title}: ${b.description || ""} (强度:${b.emotionalIntensity || 1})`
  );

  // 可用的建筑（用于任务目标）
  const availableBuildings = ["酒馆", "银行", "警长办公室", "杂货店", "枪械店", "赌场", "仓库"];

  return `## 世界状态 · 第${day}天

### 玩家
金钱: $${ws.player.money}, 精力: ${ws.player.energy}, 疲劳: ${ws.player.fatigue}
行为风格: ${(ws.player.playerStyle || []).join(", ") || "未定型"}

### 黑蹄会支柱
${pillars}

### 存活的重要NPC (${npcList.length}人)
${npcList.join("\n")}

### 活跃故事线
${activeStories.length > 0 ? activeStories.join("\n") : "暂无活跃故事线"}

### 最近事件
${recentEvents.length > 0 ? recentEvents.join("\n") : "暂无事件"}

### 导演选中的Beats
${directorBeats.length > 0 ? directorBeats.join("\n") : "暂无选中"}

### 当日压力配置
阶段: ${ws.campaignPhase || "establishment"}
所需功能: ${(ws.directorPlan?.requiredFunctions || []).join(", ") || "无特定要求"}
可用建筑: ${availableBuildings.join(", ")}

请根据以上世界状态，生成叙事文本包和每日任务。`;
}

/**
 * 构建 StoryTree beat 专用提示词（在重大故事节点触发时使用）。
 */
export function buildStoryBeatPrompt(worldState, storyId, nodeId) {
  const ws = worldState.state;
  const inst = ws.storyInstances[storyId];
  if (!inst) return null;

  const day = ws.day;
  const bindings = inst.actorBindings || {};
  const npcName = Object.values(bindings)[0] || "某人";

  return `## 故事节点触发 · 第${day}天

故事: ${storyId}
节点: ${nodeId}
涉及NPC: ${npcName}

### 当前世界状态
玩家金钱: $${ws.state.player.money}
黑蹄会状态: ${Object.entries(ws.factions.black_hoof?.pillars || {}).map(([k, p]) => `${p.label}:${p.value}`).join(", ")}

请生成这个故事节点的叙事文本。格式同上（textPackages），但只需要一个 textPackage。`;
}
