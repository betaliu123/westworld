// DeliveryPlanner.js — 投放编排：将 Director 选中的 beats 通过合适通道送达玩家。
//
// 通道系统：
//   location  — 玩家进入特定区域时触发（saloon, plaza, north_road, warehouse, hq 等）
//   hq        — 玩家在驻地时触发
//   phone     — 手机消息推送
//   newspaper — 报纸文章
//   rumor     — 酒馆/广场 NPC 对话中的传闻
//
// 通道路由优先级：
//   高情绪/紧迫 → location（最沉浸）
//   中情绪     → hq / phone
//   低情绪/背景 → newspaper / rumor
//
// 错过处理：
//   1-2 次错过：尝试备用通道
//   3 次错过：后台自动推进（backgroundResolve）

import { getBeatText } from "../config/storyBeatText.js";

export class DeliveryPlanner {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.storyRuntime = deps.storyRuntime;
    this.newspaper = deps.newspaper;
    this.phone = deps.phone;
    this.hud = deps.hud;
  }

  /**
   * 根据 Director 的计划安排投送。
   * @param {object} directorPlan - { beats[], forbiddenTags[], requiredFunctions[] }
   */
  scheduleDelivery(directorPlan) {
    const beats = directorPlan.beats || [];
    const deliveries = [];

    for (const beat of beats) {
      const delivery = this._planDelivery(beat);
      if (delivery) deliveries.push(delivery);
    }

    // 按优先级排序
    deliveries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return deliveries;
  }

  /**
   * 为单个 beat 规划投送方式。
   */
  _planDelivery(beat) {
    if (!beat.channelOptions || beat.channelOptions.length === 0) {
      // 无通道选项 → 默认投放方式
      return {
        beatId: beat.storyId ? `${beat.storyId}:${beat.nodeId}` : beat.title,
        channel: "environment",
        priority: 1,
        data: beat,
        locationVenue: null,
      };
    }

    // 按通道优先级排序
    const sorted = [...beat.channelOptions].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const bestChannel = sorted[0];

    const delivery = {
      beatId: beat.storyId ? `${beat.storyId}:${beat.nodeId}` : beat.title,
      channel: bestChannel.channel,
      priority: bestChannel.priority,
      data: beat,
      locationVenue: bestChannel.venueTags?.[0] || null,
      alternateChannels: sorted.slice(1).map(c => c.channel),
    };

    return delivery;
  }

  /**
   * 检测玩家是否在指定通道范围内，如果是则投送。
   * 每帧调用，检测位置触发。
   *
   * @param {object} playerPos - { x, z }
   * @param {string|null} currentLocation - 玩家当前所在区域名称
   * @param {boolean} isInHQ - 是否在驻地
   * @returns {Array} 触发的投送
   */
  checkLocationTriggers(playerPos, currentLocation, isInHQ) {
    const scheduled = this.worldState.state.directorPlan.scheduledDeliveries || [];
    const triggered = [];

    for (const delivery of scheduled) {
      if (delivery.delivered) continue;

      let shouldDeliver = false;

      switch (delivery.channel) {
        case "location":
          // 检查玩家是否在目标区域内
          if (currentLocation && delivery.locationVenue) {
            if (currentLocation.toLowerCase().includes(delivery.locationVenue.toLowerCase())) {
              shouldDeliver = true;
            }
          }
          break;

        case "hq":
          if (isInHQ) shouldDeliver = true;
          break;

        case "phone":
          // 手机始终可以送达（不需要位置匹配）
          shouldDeliver = true;
          break;

        case "newspaper":
          // 报纸也不需要位置匹配
          shouldDeliver = true;
          break;

        case "rumor":
          // 传闻在 saloon 或 plaza 触发
          if (currentLocation && ["saloon", "plaza"].some(v => currentLocation.toLowerCase().includes(v))) {
            shouldDeliver = true;
          }
          break;

        default:
          // environment / none: 自动投放
          shouldDeliver = true;
          break;
      }

      if (shouldDeliver) {
        delivery.delivered = true;
        delivery.deliveredAt = this.worldState.day;
        triggered.push(delivery);
      }
    }

    return triggered;
  }

  /**
   * 投送到具体 UI。
   */
  deliverToUI(delivery) {
    const ws = this.worldState;
    const beat = delivery.data;
    if (!beat) return;

    switch (delivery.channel) {
      case "newspaper":
        this._deliverNewspaper(beat);
        break;

      case "phone":
        this._deliverPhone(beat);
        break;

      case "rumor":
        this._deliverRumor(beat);
        break;

      case "environment":
        this._deliverEnvironment(beat);
        break;

      case "hq":
      case "location":
      default:
        // location / hq：玩家人已经在现场了，就报**看到的画面**，
        // 不报 `标题: 描述` —— 那种元描述是调试面板的格式，不该进玩家视野。
        if (this.hud) {
          const bt = beat.storyId ? getBeatText(beat.storyId, beat.nodeId) : null;
          const scene = bt?.description || beat.description || beat.title || "这儿有点不对劲";
          this.hud.toast(`📜 ${scene}`, { key: beat.storyId, duration: 5200 });
        }
        break;
    }

    // 标记 beat 已投送
    if (beat.storyId && this.storyRuntime) {
      this.storyRuntime.markDelivered(beat.storyId);
    }

    ws.addDeliveredBeat(delivery.beatId);
  }

  _deliverNewspaper(beat) {
    const ws = this.worldState;
    // 报纸正文用包装过的画面描述（原始 description 常是"某某追查凶手"这类元描述，
    // 印在报纸上像占位文本）
    const bt = beat.storyId ? getBeatText(beat.storyId, beat.nodeId) : null;
    ws.queueNewspaper({
      title: beat.title,
      body: bt?.description || beat.description || "",
      beatId: beat.storyId ? `${beat.storyId}:${beat.nodeId}` : beat.title,
    });
  }

  _deliverPhone(beat) {
    const ws = this.worldState;
    const npcId = beat.npcId || "system";
    const fromName = beat.npcName || beat.fromName || "线人";
    const slots = ["morning", "noon", "evening"];
    // 手机上只发**包装过的口信**，绝不推 `标题: 描述` 这种模板文本 ——
    // 那种元描述（"复仇者追查杀害亲人的凶手"）读起来像调试输出，
    // 玩家看了既不知道要去哪也不知道该干什么。
    // 有包装文案就用它，并带上 storyId/nodeId 让手机渲染时挂"📍去看看"。
    const beatText = beat.storyId ? getBeatText(beat.storyId, beat.nodeId) : null;
    const text = beatText?.phoneInvite || beat.phoneInvite || "你来一趟，有件事得当着面说。";
    ws.queuePhoneMessage({
      from: fromName,
      npcId: npcId,
      text,
      storyId: beat.storyId || null,
      storyNodeId: beat.nodeId || null,
      locateLabel: beatText?.locateLabel || null,
      beatId: beat.storyId ? `${beat.storyId}:${beat.nodeId}` : beat.title,
      deliverSlot: slots[Math.floor(Math.random() * slots.length)],
    });
  }

  _deliverRumor(beat) {
    // 传闻：不直接显示，而是存入一个 rumor bank，NPC 对话时可以引用。
    // 用包装过的画面描述 —— NPC 嘴里说出来的传闻不能是元描述。
    if (!this.worldState.state.rumors) this.worldState.state.rumors = [];
    const bt = beat.storyId ? getBeatText(beat.storyId, beat.nodeId) : null;
    this.worldState.state.rumors.push({
      title: beat.title,
      text: bt?.description || beat.description || "",
      day: this.worldState.day,
      beatId: beat.storyId ? `${beat.storyId}:${beat.nodeId}` : beat.title,
    });
  }

  _deliverEnvironment(beat) {
    // 环境事件：直接一个轻量的 HUD 提示
    if (this.hud) {
      this.hud.toast(`🌵 ${beat.title}`, { side: true, key: `env_${beat.title}` });
    }
  }

  /**
   * 错过处理：记录未投送的 beats 的错过计数。
   */
  processMissedBeats() {
    const scheduled = this.worldState.state.directorPlan.scheduledDeliveries || [];
    const day = this.worldState.day;

    for (const delivery of scheduled) {
      if (delivery.delivered) continue;

      const beat = delivery.data;
      if (!beat) continue;

      // 如果 beat 源是故事节点，递增错过计数
      if (beat.storyId && this.storyRuntime) {
        this.storyRuntime.markMissed(beat.storyId);
      }

      // 尝试备用通道
      if (delivery.alternateChannels && delivery.alternateChannels.length > 0) {
        const altChannel = delivery.alternateChannels[0];
        delivery.alternateChannels = delivery.alternateChannels.slice(1);
        delivery.channel = altChannel;
        delivery.priority = (delivery.priority || 1) - 1;
        console.log(`[DeliveryPlanner] 切换备用通道: ${delivery.beatId} → ${altChannel}`);
      } else {
        this.worldState.addMissedBeat(delivery.beatId);
      }
    }
  }

  /**
   * 提交 Director 选中的计划到世界状态，供后续投放。
   */
  commitPlan(directorPlan) {
    const ws = this.worldState;
    const deliveries = this.scheduleDelivery(directorPlan);

    ws.state.directorPlan.scheduledDeliveries = deliveries;
    ws.state.directorPlan.beats = directorPlan.beats || [];
    ws.state.directorPlan.forbiddenTags = directorPlan.forbiddenTags || [];
    ws.state.directorPlan.requiredFunctions = directorPlan.requiredFunctions || [];

    console.log(`[DeliveryPlanner] 计划已提交: ${deliveries.length} 个项目`);
    return deliveries;
  }
}
