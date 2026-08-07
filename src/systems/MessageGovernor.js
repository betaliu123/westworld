// MessageGovernor.js — 消息治理（P3）。
//
// 手机消息的四个治理点，全部收在这里，避免散落在各调用方：
//   ① 限流：每个 NPC 每天最多主动发 N 条，超了静默丢弃
//   ② 优先级/分类：每条消息带 priority（high/normal/low）与 category，
//      紧急消息不被"每天上限"卡住，且分时投递时 high 优先
//   ③ 未读徽章：有未读消息时手机标题挂红点/数字
//   ④ few-shot 去名字：LLM 生成的消息常带"艾琳：xxx"前缀，投递前剥掉，
//      免得联系人列表里出现"艾琳: 艾琳: 你好"

export const PRIORITY = { HIGH: "high", NORMAL: "normal", LOW: "low" };

/** 每天每个 NPC 的消息上限（按优先级区分） */
export const LIMITS = { high: 3, normal: 2, low: 1 };

/** 剥掉 LLM 消息开头的"名字：/名字: /名字："前缀（few-shot 去名字） */
export function stripSenderPrefix(text, senderName) {
  if (!text) return "";
  let t = String(text).trim();
  const names = [senderName, "艾琳", "杰克", "罗莎", "维克托", "塞拉斯", "赫克托"]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const n of names) {
    const re = new RegExp("^" + escapeRe(n) + "\\s*[:：]\\s*");
    if (re.test(t)) { t = t.replace(re, "").trim(); break; }
  }
  return t;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 按优先级 + 分类给消息打元数据 */
export function classifyMessage(msg, fromName) {
  const text = msg.text || "";
  let priority = PRIORITY.NORMAL;
  let category = "general";

  // 紧急词 → high
  if (/(救命|快跑|出事了|着火|有人死|被杀|追我|别来|救救我|血|危险)/.test(text)) {
    priority = PRIORITY.HIGH; category = "urgent";
  } else if (/(任务|赏金|委托|拜托|帮个忙|有活)/.test(text)) {
    category = "task";
  } else if (/(钱|账|生意|货|价)/.test(text)) {
    category = "money";
  } else if (/(黑蹄|帮派|会首|警长|势力)/.test(text)) {
    category = "faction";
  } else if (/(今天|明天|晚上|镇上|最近)/.test(text)) {
    category = "gossip";
  }

  return { priority, category, text: stripSenderPrefix(text, fromName) };
}

export class MessageGovernor {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.getNow = deps.getNow || (() => performance.now() / 1000);
    this.maxPerDay = deps.maxPerDay || 3;      // 总闸：每天每个 NPC 最多几条
    this.hud = deps.hud || null;
    // 限流计数：npcId -> { day, count }
    this._daily = new Map();
    this._stateKey = "phoneGovernor";
    this._load();
  }

  _load() {
    if (!this.worldState?.state) return;
    if (!this.worldState.state[this._stateKey]) {
      this.worldState.state[this._stateKey] = { sent: {} };  // npcId -> {day,count}
    }
    this._st = this.worldState.state[this._stateKey];
  }

  _countFor(npcId, day) {
    const rec = this._st.sent[npcId];
    if (!rec || rec.day !== day) return 0;
    return rec.count;
  }

  _bump(npcId, day) {
    const rec = this._st.sent[npcId] || { day, count: 0 };
    if (rec.day !== day) { rec.day = day; rec.count = 0; }
    rec.count += 1;
    this._st.sent[npcId] = rec;
  }

  /**
   * 决定一条消息要不要发、怎么发。
   * @param msg { npcId, from, text, deliverSlot, priority }
   * @returns { send:boolean, reason?:string, cleaned?:string }
   */
  admit(msg) {
    const day = this.worldState?.state?.day || 1;
    const npcId = msg.npcId || msg.from || "system";
    const cls = classifyMessage(msg, msg.from);

    // 去重：同一 NPC 最近发过的内容完全相同则跳过（防跨天重复刷屏）。
    // 紧急消息例外（人命关天，允许重复强调）。
    if (cls.priority !== PRIORITY.HIGH && this._isRepeat(npcId, cls.text)) {
      return { send: false, reason: "duplicate", priority: cls.priority, category: cls.category };
    }

    // 紧急消息不卡每日上限（人命关天）
    if (cls.priority === PRIORITY.HIGH) {
      this._bump(npcId, day);
      this._remember(npcId, cls.text);
      return { send: true, cleaned: cls.text, priority: cls.priority, category: cls.category };
    }

    // 每个 NPC 每天按优先级限条数；总闸 maxPerDay 是绝对上限
    const sent = this._countFor(npcId, day);
    const limit = Math.min(LIMITS[cls.priority] ?? LIMITS.normal, this.maxPerDay);
    if (sent >= limit) {
      return { send: false, reason: "rate_limited", priority: cls.priority, category: cls.category };
    }
    this._bump(npcId, day);
    this._remember(npcId, cls.text);
    return { send: true, cleaned: cls.text, priority: cls.priority, category: cls.category };
  }

  /** 记录最近发过的文本（每 NPC 记最近 6 条，供跨天去重） */
  _remember(npcId, text) {
    if (!this._st.recent) this._st.recent = {};
    const arr = this._st.recent[npcId] || [];
    const norm = String(text || "").trim();
    arr.push(norm);
    if (arr.length > 6) arr.splice(0, arr.length - 6);
    this._st.recent[npcId] = arr;
  }

  /** 判断这条文本是不是该 NPC 最近发过（内容相同即重复） */
  _isRepeat(npcId, text) {
    const arr = this._st.recent?.[npcId] || [];
    const norm = String(text || "").trim();
    if (!norm) return false;
    return arr.some((t) => t === norm);
  }
}
