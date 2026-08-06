// GangGroupChat.js — 自己帮派的群聊（P11）。
//
// 玩家收服/招募的人自动进一个"帮派群聊"联系人，群里有戏：
//   - 新成员加入 → 群公告 + 老人排队欢迎
//   - 每天群聊两句（带个自己的观点）
//   - 偶尔拍马屁（按与玩家好感，越高越爱拍）
//
// 实现：Phone 的 deliverMessage 每条消息带 who，天然支持群聊 ——
// 用一个合成联系人 id（gang_group）当线程，每条消息 who = 不同成员。

const GROUP_ID = "gang_group";

const WELCOME_LINES = [
  "新来的，自己找个座。",
  "哟，又来一个能打的？",
  "来了就是兄弟，有事说话。",
  "新人先认认门，后巷那桌是我们的。",
];
const CHATTER = [
  "今天镇上风声紧，都机灵点。",
  "赌场那边又换了个看场的，认识吗？",
  "昨儿个警长在街上转悠，绕着他走。",
  "这活钱不好挣，但比饿死强。",
  "老大交代的事都办利索点，别丢人。",
  "教堂那边新来了个传教的，净说大道理。",
];
const FLATTERY = [
  "还是老大有魄力，镇上都得听咱的。",
  "跟着老大混，这日子才有盼头。",
  "老大一句话，比什么都好使。",
];

export class GangGroupChat {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.phone = deps.phone || null;
    this.factionSystem = deps.factionSystem;
    this.npcRegistry = deps.npcRegistry;
    this.rng = deps.rng || Math.random;
    this.getDay = deps.getDay || (() => this.worldState?.state?.day || 1);
    // 群成员的显示名池（按成员 id 取）
    this._lastChatterDay = -1;
    this._ensureGroup();
  }

  _ensureGroup() {
    // 惰性创建群联系人（由 main 在装配时调用，或首次使用时）
    if (this.phone && !this.phone.contacts[GROUP_ID]) {
      this.phone.addContact(GROUP_ID, "帮派群聊", "群");
    }
  }

  /** 当前明面成员列表（显示名） */
  _members() {
    const ids = this.factionSystem?.getOpenMembers?.() || [];
    return ids.map((id) => this.npcRegistry?.get?.(id)?.displayName || id).filter(Boolean);
  }

  /**
   * 有新成员加入（收服/招募成功后调用）。
   * 发一条群公告 + 老人排队欢迎。
   */
  announceNewMember(newName) {
    if (!this.phone?.deliverMessage || !newName) return;
    this._ensureGroup();
    const day = this.getDay();
    const members = this._members().filter((n) => n !== newName);
    // 群公告（from 用系统名）
    this.phone.deliverMessage(GROUP_ID, "系统", `${newName} 加入了帮派，大家认识一下。`, {});
    // 老人欢迎（最多 3 个）
    const welcomers = members.slice(0, 3);
    for (const w of welcomers) {
      this.phone.deliverMessage(GROUP_ID, w, WELCOME_LINES[Math.floor(this.rng() * WELCOME_LINES.length)], {});
    }
    // 给玩家一条 toast（若有）
    this.hud?.toast?.(`💬 群聊：${newName} 加入了`, { key: "group-welcome", duration: 3200 });
  }

  /**
   * 每日闲聊：每天 1~2 条群消息；成员好感高时偶尔拍马屁。
   * @param affectionOf (npcId) -> 好感值
   */
  settleDaily(affectionOf) {
    if (!this.phone?.deliverMessage) return;
    const day = this.getDay();
    if (day === this._lastChatterDay) return;
    this._lastChatterDay = day;
    this._ensureGroup();
    const members = this._members();
    if (!members.length) return;

    // 每天 1~2 条
    const count = 1 + (this.rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const speaker = members[Math.floor(this.rng() * members.length)];
      // 拍马屁：随机 + 好感高更爱拍
      const aff = affectionOf ? this._maxAffection(members, affectionOf) : 0;
      let line;
      if (this.rng() < 0.2 + aff * 0.15) {
        line = FLATTERY[Math.floor(this.rng() * FLATTERY.length)];
      } else {
        line = CHATTER[Math.floor(this.rng() * CHATTER.length)];
      }
      this.phone.deliverMessage(GROUP_ID, speaker, line, {});
    }
  }

  _maxAffection(members, affectionOf) {
    let best = 0;
    for (const m of members) {
      const a = affectionOf(m) || 0;
      if (a > best) best = a;
    }
    return Math.max(0, Math.min(1, best / 100));
  }
}
