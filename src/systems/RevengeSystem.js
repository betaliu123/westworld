// RevengeSystem.js —— 「你杀了人 → 他的亲属来讨命」的完整链路。
//
// 流程：
//   ① 玩家打死/打倒某人 → 记下死者（recordKill）
//   ② 隔 1~3 天，找一个亲属（同住 > 同姓 > 极高好感；实在没有就现造一个同姓的）
//   ③ 让玩家的一个朋友发手机口信报信（带定位）
//   ④ 玩家赶到 → 开一场剧场（buildRevengeTree，台词里是**真实的死者名字**）
//   ⑤ 结局后果由剧场自己施加（现金/名誉/通缉）+ 好感/信任走 onStoryOutcome
//
// 与 NPCManager.settleGrudgeRevenge 的关系：那套是"同伙无训冲上来砍你"。
// 这条线成功开出来时会把它压住（markSuppressed），只在凑不出亲属/演员时
// 才让它兜底 —— 否则玩家刚收到报信就被围殴，故事还没开始就打完了。

import { buildRevengeTree, pickTipoffLine } from "../config/storyRevenge.js";

const DELAY_MIN = 1;      // 杀人后最少隔几天才来
const DELAY_MAX = 3;
const MAX_PENDING = 2;    // 同时最多几条复仇线，免得连环围攻

export class RevengeSystem {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.npcRegistry = deps.npcRegistry;
    this.npcManager = deps.npcManager;
    this.phone = deps.phone;
    this.hud = deps.hud;
    this.getDay = deps.getDay || (() => 1);
    // 外部注入的能力
    this.isKin = deps.isKin || (() => false);              // (aId, bId) => boolean
    this.affectionToPlayer = deps.affectionToPlayer || (() => 0);
    this.makeKinActor = deps.makeKinActor || null;          // ({victimNpcId, victimName}) => npcId|null
    this.resolveVenue = deps.resolveVenue || null;          // () => {x,z,label}
    this.log = deps.log || (() => {});
  }

  _state() {
    const s = this.worldState.state;
    if (!s.revenge) s.revenge = { kills: [], pending: [], done: [] };
    // 老存档兼容
    if (!Array.isArray(s.revenge.kills)) s.revenge.kills = [];
    if (!Array.isArray(s.revenge.pending)) s.revenge.pending = [];
    if (!Array.isArray(s.revenge.done)) s.revenge.done = [];
    return s.revenge;
  }

  /**
   * 记一笔玩家的杀伤。被打倒也算 —— 这个世界里倒地的人会被搜身、被补刀，
   * 亲属未必分得清"打倒"和"打死"。
   * @param {object} info { npcId, displayName, lethal, x, z }
   */
  recordKill(info = {}) {
    if (!info.npcId && !info.displayName) return;
    const st = this._state();
    // 同一个人不重复记（一场架里可能被打倒多次）
    if (st.kills.some((k) => k.npcId === info.npcId && k.day === this.getDay())) return;
    st.kills.push({
      npcId: info.npcId || null,
      displayName: info.displayName || "某人",
      lethal: !!info.lethal,
      day: this.getDay(),
      x: info.x ?? 0, z: info.z ?? 0,
      handled: false,
    });
    this.log(`[Revenge] 记下：${info.displayName}（第 ${this.getDay()} 天${info.lethal ? "，致死" : ""}）`);
  }

  /** 这条复仇线是否已经把"同伙直接砍你"压住了 */
  isSuppressed(victimNpcId) {
    return this._state().pending.some((p) => p.victimNpcId === victimNpcId);
  }

  /**
   * 每日结算：够天数的杀伤挑一笔，找亲属 + 发报信。
   * @returns {object|null} 新开的复仇线
   */
  settleDaily() {
    const st = this._state();
    if (st.pending.length >= MAX_PENDING) return null;
    const day = this.getDay();
    // 优先处理"致死"的，其次按时间早的
    const due = st.kills
      .filter((k) => !k.handled && day - k.day >= DELAY_MIN && day - k.day <= DELAY_MAX + 4)
      .sort((a, b) => (b.lethal - a.lethal) || (a.day - b.day));
    for (const kill of due) {
      // 超过窗口就作废（免得攒一堆陈年旧账突然爆发）
      if (day - kill.day > DELAY_MAX + 4) { kill.handled = true; continue; }
      const kinId = this._findKin(kill);
      if (!kinId) continue;                 // 找不到亲属就先留着，明天再试
      const friendId = this._pickFriend(kinId);
      kill.handled = true;
      const line = {
        victimNpcId: kill.npcId,
        victimName: kill.displayName,
        kinNpcId: kinId,
        killDay: kill.day,
        openedDay: day,
        tipoffBy: friendId,
        nodeId: "confront",
        status: "tipped",
      };
      st.pending.push(line);
      this._sendTipoff(line);
      this.log(`[Revenge] ${kill.displayName} 的亲属 ${this._nameOf(kinId)} 来了（报信人 ${this._nameOf(friendId)}）`);
      return line;
    }
    return null;
  }

  /** 找死者的亲属：同住 > 同姓 > 极高好感；都没有就现造一个同姓的 */
  _findKin(kill) {
    if (!kill.npcId) return null;
    const ids = this.npcRegistry?.getAllIds?.() || [];
    const alive = ids.filter((id) => id !== kill.npcId && this.npcRegistry.isAlive?.(id) !== false);
    // 已经在别的复仇线里当主角的人不重复用
    const busy = new Set(this._state().pending.map((p) => p.kinNpcId));
    const cands = alive.filter((id) => !busy.has(id) && this.isKin(id, kill.npcId));
    if (cands.length) {
      // 场上有实体的优先（不用凭空传送）
      const onStage = cands.find((id) => this._liveOf(id));
      return onStage || cands[0];
    }
    // 没有亲属 → 现造一个同姓的（"沃德"死了来的是另一个"沃德"）
    if (this.makeKinActor) {
      const made = this.makeKinActor({ victimNpcId: kill.npcId, victimName: kill.displayName });
      if (made) return made;
    }
    return null;
  }

  /** 挑一个对玩家好感最高的人来报信（没有就用系统口信） */
  _pickFriend(excludeId) {
    const ids = this.npcRegistry?.getAllIds?.() || [];
    let best = null, bestAff = 15;   // 至少要有点交情才会替你留心
    for (const id of ids) {
      if (id === excludeId) continue;
      if (this.npcRegistry.isAlive?.(id) === false) continue;
      const aff = this.affectionToPlayer(id);
      if (aff > bestAff) { bestAff = aff; best = id; }
    }
    return best;
  }

  _sendTipoff(line) {
    const venue = this.resolveVenue ? this.resolveVenue() : null;
    const text = pickTipoffLine(line.victimName);
    const fromId = line.tipoffBy;
    const fromName = fromId ? this._nameOf(fromId) : "一张没署名的字条";
    this.phone?.deliverMessage?.(fromId || "system", fromName, text, {
      revengeKin: line.kinNpcId,
      locate: venue ? { x: venue.x, z: venue.z, label: venue.label || "街口" } : null,
    });
    this.hud?.toast?.(`📨 ${fromName}给你捎了句话`, { key: "revenge-tip", duration: 4200 });
  }

  /** 取当前待处理的复仇线（供任务栏/到达时开剧场） */
  activeLine() {
    return this._state().pending.find((p) => p.status === "tipped") || null;
  }

  /** 组装这条线的剧场树 */
  treeFor(line) {
    if (!line) return null;
    return buildRevengeTree({
      victimName: line.victimName,
      victimNpcId: line.victimNpcId,
      kinNpcId: line.kinNpcId,
      days: Math.max(1, this.getDay() - line.killDay),
      day: this.getDay(),
    });
  }

  /** 剧场演完：收线 + 记后果 */
  resolveLine(line, outcomeId) {
    if (!line) return;
    const st = this._state();
    st.pending = st.pending.filter((p) => p !== line);
    st.done.push({ ...line, status: "resolved", outcomeId, resolvedDay: this.getDay() });
    this.log(`[Revenge] ${line.victimName} 的血债了结：${outcomeId}`);
  }

  _nameOf(npcId) {
    return npcId ? (this.npcRegistry?.get?.(npcId)?.displayName || npcId) : "某人";
  }
  _liveOf(npcId) {
    const reg = this.npcRegistry?.get?.(npcId);
    if (!reg) return null;
    return (this.npcManager?.all || []).find((n) => n.alive && n.phone?.owner === reg.displayName) || null;
  }
}
