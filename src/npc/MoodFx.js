// MoodFx.js — 情绪 → 表情 + 抖动的映射（纯逻辑，不依赖 THREE）
// 剧场节拍与单 NPC 对话共用同一套，保证同一种情绪在两处表现一致。

import { takeEmojiSlot } from "./EmojiRateLimit.js";

export const MOOD_FX = {
  angry:    { emoji: "😠", shake: 0.5, amp: 0.14 },
  scared:   { emoji: "😨", shake: 0.6, amp: 0.18 },
  shocked:  { emoji: "😲", shake: 0.7, amp: 0.2 },
  sad:      { emoji: "😞", shake: 0, amp: 0 },
  smug:     { emoji: "😏", shake: 0, amp: 0 },
  happy:    { emoji: "😄", shake: 0, amp: 0 },
  hostile:  { emoji: "😠", shake: 0.4, amp: 0.12 },
  friendly: { emoji: "🙂", shake: 0, amp: 0 },
  greedy:   { emoji: "🤑", shake: 0, amp: 0 },
  pain:     { emoji: "😖", shake: 0.5, amp: 0.22 },
  neutral:  { emoji: null, shake: 0, amp: 0 },
};

/**
 * 给一个 NPC 播情绪表现（emoji + 抖动）。
 * emoji 走全局限流：同屏最多 3 个、同一人 2.6s 才能再冒，避免满屏表情。
 * 抖动不受限（它是微表现，不抢视线）。
 */
export function playMoodFx(npc, mood) {
  const fx = MOOD_FX[mood];
  if (!fx || !npc?.brain) return;
  if (fx.emoji && takeEmojiSlot(npc)) npc.brain.emote(fx.emoji, 1.9);
  if (fx.shake > 0 && npc.shakeFor) npc.shakeFor(fx.shake, fx.amp);
}
