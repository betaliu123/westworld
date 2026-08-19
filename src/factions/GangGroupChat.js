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

  /** 群成员 id（不是显示名）—— 生成回复要用 id 查人设 */
  _memberIds() {
    return this.factionSystem?.getOpenMembers?.() || [];
  }

  /**
   * 玩家在群里发话，挑 1~2 个成员接茬。
   *
   * 群聊跟单聊不一样：一句话进去，可能有人应、有人补刀。所以返回
   * `[{who, text}]` 让 Phone 依次贴出来（Phone._normalizeReplies 支持）。
   *
   * @param {string} raw 玩家发的话
   * @param {Function} respond async ({npcId, displayName, text}) => string
   *                  由 main.js 注入，内部走 LLM；抛错/返回空则本地兜底。
   * @returns {Promise<Array<{who:string,text:string}>>}
   */
  async respondToPlayer(raw, respond) {
    const ids = this._memberIds();
    if (!ids.length) {
      // 群里还没人（一个成员都没收服）——别装作有人说话
      return [{ who: "系统", text: "群里还没别人。先收几个人进来吧。" }];
    }

    // 挑 1~2 个成员接茬（人多时才可能有第二个补刀）
    const shuffled = [...ids].sort(() => this.rng() - 0.5);
    const speakerCount = ids.length > 1 && this.rng() < 0.45 ? 2 : 1;
    const speakers = shuffled.slice(0, speakerCount);

    const out = [];
    for (const id of speakers) {
      const displayName = this.npcRegistry?.get?.(id)?.displayName || id;
      let text = "";
      if (respond) {
        try {
          text = (await respond({ npcId: id, displayName, text: raw })) || "";
        } catch {
          text = "";
        }
      }
      if (!text.trim()) text = this._localGroupReply(raw);
      out.push({ who: displayName, text: text.trim() });
    }
    return out;
  }

  /** LLM 不可用时的本地兜底：按玩家说的话粗分几类，保持西部口吻 */
  _localGroupReply(raw) {
    const s = String(raw || "");
    if (/[?？]$/.test(s) || /(谁|哪|什么|怎么|为何)/.test(s)) {
      return ["这我可说不准，得打听打听。", "问老张吧，他天天在街上转。", "不清楚，要不去酒馆问问？"][
        Math.floor(this.rng() * 3)
      ];
    }
    if (/(干|上|打|杀|抢|办)/.test(s)) {
      return ["行，什么时候动手？", "算我一个。", "得先摸清楚警长今晚在哪。"][Math.floor(this.rng() * 3)];
    }
    if (/(钱|分|买|卖)/.test(s)) {
      return ["钱的事说清楚就行。", "老规矩分？", "这买卖听着有油水。"][Math.floor(this.rng() * 3)];
    }
    return CHATTER[Math.floor(this.rng() * CHATTER.length)];
  }
}
