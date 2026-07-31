// EmojiRateLimit.js — emoji 全局频率控制
// 情绪表现是很好的反馈，但满屏表情会把界面弄脏。规则：
//   - 屏幕上同时最多 MAX_ON_SCREEN 个
//   - 同一个 NPC 间隔 MIN_GAP_MS 毫秒才能再冒一个
//   - 全局每 GLOBAL_MS 毫秒最多冒一个（避免一堆人同时冒）
// 由 MoodFx.playMoodFx 统一走这里，别在别处直接 emote。

const MAX_ON_SCREEN = 3;
const MIN_GAP_MS = 2600;
const GLOBAL_WINDOW_MS = 400; // 在这个窗口内最多放行 MAX_PER_WINDOW 个（防一帧里十几个人同时冒）
const MAX_PER_WINDOW = 3; // 等于同屏上限：窗口内放满 3 个即停，防一帧糊屏

let windowStart = 0;
let windowUsed = 0;
let liveCount = 0;
const perNpc = new WeakMap();
let unlimited = false; // 测试旁路：临时关闭限流，验证 MoodFx 映射本身

export function setEmojiUnlimited(on) { unlimited = !!on; }

/** 这个 NPC 现在允许冒 emoji 吗（允许则计入额度） */
export function takeEmojiSlot(npc) {
  if (unlimited) return true; // 测试旁路：不限流，直接放行
  const now = Date.now();
  if (liveCount >= MAX_ON_SCREEN) return false;
  const last = perNpc.get(npc) || 0;
  if (now - last < MIN_GAP_MS) return false;
  // 全局：短时间窗口内限量放行，避免一群人同帧冒表情
  if (now - windowStart > GLOBAL_WINDOW_MS) { windowStart = now; windowUsed = 0; }
  if (windowUsed >= MAX_PER_WINDOW) return false;
  windowUsed++;
  perNpc.set(npc, now);
  liveCount++;
  return true;
}

/** EmojiPops 每帧回调：屏幕上实际还剩几个（倒计时结束的自然减额） */
export function noteEmojiGone() {
  if (liveCount > 0) liveCount--;
  // 腾出同屏位置的同时，也允许窗口内再放一个（否则有人消了也冒不出来）
  if (windowUsed > 0) windowUsed--;
}
