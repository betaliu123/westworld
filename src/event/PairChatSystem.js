// PairChatSystem.js — NPC 熟人相遇双人闲聊。
// 检测两个"认识"的 NPC 在街上/场所里碰上（距离近 + 都在闲逛），
// 让他们停下走一小段双人对话（DS 生成，按关系原型分类），
// 播完各自继续日程。用脑内 cooldown 防止反复触发。
//
// 关系判定：
//   1. INITIAL_RELATIONSHIPS 里定义过的成对（含好感/信任的"认识"）
//   2. 或关系系统里 affection 达到阈值
// 关系原型映射：把任意一对映射到 好友/帮派/旧怨/相好/家人 之一。

import { INITIAL_RELATIONSHIPS } from "../config/npcData.js";
import { PAIR_CHAT } from "../config/pairChatData.js";

const ARCHETYPES = ["好友", "帮派", "旧怨", "相好", "家人"];

// 已知成对 → 关系原型（硬编码映射，来自 npcData 的 INITIAL_RELATIONSHIPS 语义）
const PAIR_ARCHETYPE = {
  "npc_erin->npc_eli": "家人",      // 兄妹
  "npc_bessie->npc_erin": "好友",   // 吧台女侍×会计
  "npc_mary->npc_bessie": "好友",   // 酒馆女侍×吧台女侍
  "npc_wei->npc_thomas": "好友",    // 老矿工×矿工
  "npc_carl->npc_lillian": "相好",  // 老赌徒×歌女
  "npc_lillian->npc_carl": "相好",
  "npc_silas->npc_victor": "帮派",  // 头目×二把手
  "npc_victor->npc_silas": "帮派",
  "npc_silas->npc_rosa": "帮派",    // 头目×赌场
  "npc_rosa->npc_silas": "帮派",
  "npc_thomas->npc_silas": "旧怨",  // 矿工×头目（resentment 70）
  "npc_wei->npc_silas": "旧怨",
  "npc_brown->npc_victor": "旧怨",  // 牧师×二把手
  "npc_mary->npc_victor": "旧怨",   // 女侍×二把手（fear 70）
};

const CHAT_DIST = 4.2;          // 两人相距多远开始触发
const ARRIVE_STOP = 2.6;        // 停下后对聊
const COOLDOWN_SEC = 50;        // 同一对聊完冷却（避免站一起反复聊）
const SCAN_INTERVAL = 1.2;      // 扫描节流（秒）

export class PairChatSystem {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.npcRegistry = deps.npcRegistry;
    this.relationshipSystem = deps.relationshipSystem || null;
    this.getDay = deps.getDay || (() => 1);
    this.now = deps.now || (() => performance.now() / 1000);
    this._scanT = 0;
    this._cooldown = new Map();  // pairKey -> 冷却到期时刻
    this._chatting = null;       // { a, b, lines, lineIdx, t } 当前对聊
    this._lastA = null;
  }

  get active() { return !!this._chatting; }

  update(dt) {
    // 推进当前对聊
    if (this._chatting) {
      // 看门狗：两人走散了/有人死了 → 立即散伙并归还日程
      const c = this._chatting;
      if (!c.a?.alive || !c.b?.alive) {
        c.a?.brain?.release?.();
        c.b?.brain?.release?.();
        this._chatting = null;
        return false;
      }
      const d = Math.hypot(c.a.pos.x - c.b.pos.x, c.a.pos.z - c.b.pos.z);
      if (d > CHAT_DIST * 1.6) {
        c.a?.brain?.release?.();
        c.b?.brain?.release?.();
        this._chatting = null;
        return false;
      }
      return this._stepChat(dt);
    }
    this._scanT -= dt;
    if (this._scanT > 0) return false;
    this._scanT = SCAN_INTERVAL;
    return this._scan();
  }

  _scan() {
    const all = (this.npcManager?.all || this.npcManager?.npcs || []).filter((n) => n?.alive && n.brain);
    // 排除剧场演员（_perform 接管中）和正在被遭遇征召的人，别把台上的人拉去闲聊
    const onFoot = all.filter((n) =>
      !n.insideHome && !n.insideRoom && this._idle(n) && !n.brain._perform && !n.brain._encSummon
    );
    const n = onFoot.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = onFoot[i], b = onFoot[j];
        const d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
        if (d > CHAT_DIST) continue;
        const key = this._pairKey(a, b);
        if (!key) continue;
        if (this._cooldown.get(key) > this.now()) continue;
        // 两人都别在赶路（都闲逛/站立）
        if (!this._idle(a) || !this._idle(b)) continue;
        // 触发
        this._startChat(a, b);
        return true;
      }
    }
    return false;
  }

  _pairKey(a, b) {
    const aid = this._idOf(a), bid = this._idOf(b);
    if (!aid || !bid || aid === bid) return null;
    // 只处理"认识"的组合：硬编码原型 OR 关系系统有记录
    const direct = PAIR_ARCHETYPE[`${aid}->${bid}`] || PAIR_ARCHETYPE[`${bid}->${aid}`];
    if (direct) return `${aid}->${bid}`;
    const rel = this._rel(aid, bid);
    if (rel && (rel.affection >= 30 || rel.trust >= 30)) {
      // 好感高的熟人按 好友 原型；敌意高按 旧怨
      if (rel.resentment >= 40) return `${aid}->${bid}`; // 旧怨，但 key 要可查原型
    }
    return null;
  }

  _rel(aid, bid) {
    if (this.relationshipSystem?.get) return this.relationshipSystem.get(aid, bid);
    return null;
  }

  _archetype(a, b) {
    const aid = this._idOf(a), bid = this._idOf(b);
    const direct = PAIR_ARCHETYPE[`${aid}->${bid}`] || PAIR_ARCHETYPE[`${bid}->${aid}`];
    if (direct) return direct;
    const rel = this._rel(aid, bid);
    if (rel) {
      if (rel.resentment >= 40) return "旧怨";
      if (rel.affection >= 40 || rel.trust >= 40) return "好友";
    }
    return "好友"; // 兜底
  }

  _idOf(npc) {
    const reg = this.npcRegistry?.findByDisplayName?.(npc.phone?.owner || "");
    return reg?.id || npc.phone?.id || null;
  }

  _idle(npc) {
    const s = npc.brain?.state;
    return s === "WANDER" || s === "IDLE";
  }

  _startChat(a, b) {
    const arch = this._archetype(a, b);
    const pool = PAIR_CHAT[arch] || PAIR_CHAT["好友"];
    const seg = pool[Math.floor(Math.random() * pool.length)];
    const key = this._pairKey(a, b) || "pair";
    this._cooldown.set(key, this.now() + COOLDOWN_SEC);
    this._chatting = { a, b, arch, lines: seg, lineIdx: 0, t: 0, key };
    // 两人站定，面对面（用 takeOver 接管：停在原地 + 朝向对方）
    this._face(a, b);
    this._face(b, a);
    this._say(a, seg[0]);
    this._lastA = a;
    return true;
  }

  _stepChat(dt) {
    const c = this._chatting;
    c.t -= dt;
    // 对聊期间持续保持两人相对站着
    if (c.a?.brain && c.b?.brain) {
      this._faceKeep(c.a, c.b);
      this._faceKeep(c.b, c.a);
    }
    if (c.t <= 0) {
      c.lineIdx += 1;
      if (c.lineIdx >= c.lines.length) {
        // 聊完散伙：归还两人日程
        c.a?.brain?.release?.();
        c.b?.brain?.release?.();
        this._chatting = null;
        return true;
      }
      const speaker = c.lineIdx % 2 === 0 ? c.a : c.b;
      this._say(speaker, c.lines[c.lineIdx]);
      this._lastA = speaker;
      c.t = this._duration(c.lines[c.lineIdx]);
    }
    return false;
  }

  _say(npc, text) {
    npc.brain?.say?.(text, 2.6);
  }

  _duration(text) {
    return 1.6 + Math.min(2.2, String(text).length * 0.12);
  }

  _face(a, b) {
    // 接管：停在原地、朝向对方。聊完由 _stepChat 统一 release 归还日程。
    // takeOver 返回 false 说明 NPC 处于 DOWN 等不可接管状态 → 取消对聊
    const ok1 = a.brain?.takeOver?.({
      moveTo: null, faceTarget: b.pos, immune: true, chat: true,
    });
    if (ok1 === false) return false;
    return true;
  }

  _faceKeep(a, b) {
    // 对聊期间持续更新朝向（对方在动的话跟着转）
    a.brain?.perform?.({ faceTarget: b.pos, moveTo: null, immune: true, chat: true });
  }
}
