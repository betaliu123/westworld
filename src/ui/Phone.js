// Phone.js — 手机系统 v2：GTA 风格联系人 + 聊天 + NPC 主动发消息。
// 完全替代旧的"捡手机翻聊天记录"模式。

import { getAvatar } from "../config/portraits.js";

export class Phone {
  constructor(worldState) {
    this.worldState = worldState;
    this.modal = document.getElementById("phone");
    this.contactListEl = document.getElementById("phone-contacts");
    this.chatEl = document.getElementById("phone-chat");
    this.chatHeaderEl = document.getElementById("phone-chat-name");
    this.repliesEl = document.getElementById("phone-quick-replies");
    this.contactsView = document.getElementById("phone-contacts-view");
    this.chatView = document.getElementById("phone-chat-view");
    this.stockView = document.getElementById("phone-stock-view");
    this.stockBody = document.getElementById("phone-stock-body");
    this.storiesView = document.getElementById("phone-stories-view");
    this.storiesBody = document.getElementById("phone-stories-body");
    this.tabContacts = document.getElementById("phone-tab-contacts");
    this.tabTasks = document.getElementById("phone-tab-tasks");
    this.tabStock = document.getElementById("phone-tab-stock");
    this.tabStories = document.getElementById("phone-tab-stories");

    this.activeContactId = null;
    this.isOpen = false;
    this.taskSystem = null;
    this.stockMarket = null;  // 由 main.js 注入，用于手机股市 tab
    this.storyRuntime = null; // 由 main.js 注入，用于手机故事 tab
    this.storyHud = null;     // 由 main.js 注入，用于故事 tab 里"去哪找"提示
    // 自由输入：远程收服/招揽的钩子（由 main.js 注入，返回 {ok,text}）
    this.onFreeText = null;

    document.getElementById("phone-close").addEventListener("click", () => this.close());
    document.getElementById("phone-back").addEventListener("click", () => this.showContactList());
    this.tabContacts.addEventListener("click", () => this._switchTab("contacts"));
    this.tabTasks.addEventListener("click", () => this._switchTab("tasks"));
    if (this.tabStock) this.tabStock.addEventListener("click", () => this._switchTab("stock"));
    if (this.tabStories) this.tabStories.addEventListener("click", () => this._switchTab("stories"));

    this.inputEl = document.getElementById("phone-input");
    this.sendBtn = document.getElementById("phone-input-send");
    this.badgeEl = document.getElementById("phone-badge");
    this.affinityEl = document.getElementById("phone-chat-affinity");
    this.recruitBtn = document.getElementById("phone-btn-recruit");
    this.summonBtn = document.getElementById("phone-btn-summon");
    this.onRecruit = null;   // 收服按钮的钩子（由 main.js 注入，返回给对方看的回复文本）
    this.onSummon = null;    // 召集按钮的钩子（由 main.js 注入，返回 {ok,text}）
    if (this.inputEl) {
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); this._sendFreeText(); }
      });
    }
    if (this.sendBtn) {
      this.sendBtn.addEventListener("click", () => this._sendFreeText());
    }
    if (this.recruitBtn) {
      this.recruitBtn.addEventListener("click", () => this._sendRecruit());
    }
    if (this.summonBtn) {
      this.summonBtn.addEventListener("click", () => this._sendSummon());
    }
  }

  /** 召集按钮的钩子（main.js 注入） */
  setSummonHandler(fn) { this.onSummon = fn; }

  /** 判断联系人是否玩家帮派成员的钩子（main.js 注入） */
  setMemberCheck(fn) { this.isPlayerMember = fn; }

  _sendSummon() {
    if (!this.activeContactId) return;
    const contact = this.contacts[this.activeContactId];
    if (!contact) return;
    const thread = contact.threads[0];
    thread.messages.push({
      from: "me", who: "我", text: "过来跟着我，有事要办。",
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      day: this.worldState.day, isUnread: false,
    });
    if (this.onSummon) {
      try {
        const reply = this.onSummon(this.activeContactId, contact);
        if (reply && reply.text) {
          thread.messages.push({
            from: "them", who: contact.displayName, text: String(reply.text),
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            day: this.worldState.day, isUnread: false,
          });
        }
      } catch (e) {
        thread.messages.push({
          from: "them", who: contact.displayName, text: "……信号不太好，你说什么？",
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          day: this.worldState.day, isUnread: false,
        });
      }
    }
    this._renderChat(this.activeContactId);
  }

  /** 收服按钮的钩子（main.js 注入） */
  setRecruitHandler(fn) { this.onRecruit = fn; }

  /** 注入股票市场实例（手机股市 tab 用） */
  setStockMarket(sm) { this.stockMarket = sm; }

  /** 注入 StoryRuntime（手机故事 tab 用） */
  setStoryRuntime(sr) { this.storyRuntime = sr; }

  /** 注入 hud（故事 tab 用：把"去哪找"提示发到 toast） */
  setStoryHud(hud) { this.storyHud = hud; }

  /** 注入强行启动 handler（main.js 提供，返回 {ok, text}） */
  setStoryStartHandler(fn) { this.onStoryStart = fn; }

  /** 注入故事手机选项 handler（main.js 提供，点击选项推进剧情） */
  setStoryChoiceHandler(fn) { this.onStoryChoice = fn; }

  /** 注入「推进这一环节」handler（重新拉起遭遇/小剧场） */
  setStoryPushHandler(fn) { this.onStoryPush = fn; }

  /** 注入「📍去看看」handler（关手机 + 自动寻路到事发地点） */
  setLocateHandler(fn) { this.onLocate = fn; }

  /**
   * 注入地点解析器：(storyId, nodeId) => { x, z, label }
   * 用于每日投放队列里的消息 —— 那些消息只带 storyId，坐标在渲染时才算，
   * 免得把会过期的坐标写进存档。
   */
  setVenueResolver(fn) { this.venueResolver = fn; }

  _sendRecruit() {
    if (!this.activeContactId) return;
    const contact = this.contacts[this.activeContactId];
    if (!contact) return;
    const thread = contact.threads[0];
    // 玩家消息
    thread.messages.push({
      from: "me", who: "我", text: "跟我干，怎么样？",
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      day: this.worldState.day, isUnread: false,
    });
    // 交给 main.js 处理（收服判定 + 写数据），返回对方的回复
    if (this.onRecruit) {
      try {
        const reply = this.onRecruit(this.activeContactId, contact);
        if (reply) {
          thread.messages.push({
            from: "them", who: contact.displayName, text: String(reply),
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            day: this.worldState.day, isUnread: false,
          });
        }
      } catch (e) {
        thread.messages.push({
          from: "them", who: contact.displayName, text: "……信号不太好，你说什么？",
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          day: this.worldState.day, isUnread: false,
        });
      }
    }
    this._renderChat(this.activeContactId);
  }

  /** P3 未读徽章：有未读消息时手机标题挂数字，打开手机后清零 */
  _updateBadge() {
    if (!this.badgeEl) return;
    const total = Object.values(this.contacts).reduce((n, c) => {
      return n + (c.threads?.[0]?.messages?.filter((m) => m.isUnread).length || 0);
    }, 0);
    if (total > 0) {
      this.badgeEl.textContent = total > 99 ? "99+" : String(total);
      this.badgeEl.classList.remove("hidden");
    } else {
      this.badgeEl.classList.add("hidden");
    }
  }

  /** 有未读消息时立即更新徽章（外部调用） */
  notifyUnread() { this._updateBadge(); }

  /** 自由输入框的钩子（远程收服等），由 main.js 设置 */
  setFreeTextHandler(fn) { this.onFreeText = fn; }

  async _sendFreeText() {
    const raw = (this.inputEl?.value || "").trim();
    if (!raw || !this.activeContactId) return;
    if (this.inputEl) this.inputEl.value = "";
    const contact = this.contacts[this.activeContactId];
    if (!contact) return;
    const thread = contact.threads[0];

    // 玩家消息进聊天
    thread.messages.push({
      from: "me", who: "我", text: raw,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      day: this.worldState.day, isUnread: false,
    });

    // 交给 main.js 处理（远程收服 / 招揽 / DS flash 通用回复）。
    // 处理函数可能是 async（手机聊天接真实大模型），所以 await 一下。
    //
    // 返回值支持三种形态，群聊要靠第 2/3 种（每句话是不同成员说的）：
    //   "文本"                        → 当前联系人回一句
    //   { who, text }                 → 指定说话人回一句
    //   [{ who, text }, ...]          → 多人依次接茬
    const handler = this.onFreeText;
    if (handler) {
      try {
        const result = await handler(this.activeContactId, raw, contact);
        for (const r of this._normalizeReplies(result, contact)) {
          thread.messages.push({
            from: "them", who: r.who, text: r.text,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            day: this.worldState.day, isUnread: false,
          });
        }
      } catch (err) {
        thread.messages.push({
          from: "them", who: contact.displayName, text: "……信号不太好，你说什么？",
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          day: this.worldState.day, isUnread: false,
        });
      }
    }
    this._renderChat(this.activeContactId);
  }

  /** 把 onFreeText 的三种返回形态统一成 [{who, text}] */
  _normalizeReplies(result, contact) {
    const fallbackWho = contact.displayName;
    const one = (r) => {
      if (!r) return null;
      if (typeof r === "string") {
        const t = r.trim();
        return t ? { who: fallbackWho, text: t } : null;
      }
      const t = String(r.text ?? "").trim();
      return t ? { who: r.who || fallbackWho, text: t } : null;
    };
    if (Array.isArray(result)) return result.map(one).filter(Boolean);
    const single = one(result);
    return single ? [single] : [];
  }

  get contacts() {
    return this.worldState.state.phoneContacts || {};
  }

  _ensureContacts() {
    if (!this.worldState.state.phoneContacts) {
      this.worldState.state.phoneContacts = {};
    }
    return this.worldState.state.phoneContacts;
  }

  addContact(npcId, displayName, job) {
    const contacts = this._ensureContacts();
    if (contacts[npcId]) return; // already exists
    const avatarImg = getAvatar(npcId);
    contacts[npcId] = {
      npcId,
      displayName,
      job: job || "镇民",
      avatar: this._avatarForJob(job),
      avatarImg: avatarImg, // circular avatar image (SVG data URI)
      addedDay: this.worldState.day,
      threads: [{
        contactName: displayName,
        messages: [],
      }],
    };
  }

  deliverMessage(npcId, fromName, text, opts = {}) {
    const contacts = this._ensureContacts();
    if (!contacts[npcId]) {
      this.addContact(npcId, fromName, "未知");
    }
    const contact = contacts[npcId];
    if (!contact.threads || contact.threads.length === 0) {
      contact.threads = [{ contactName: fromName || contact.displayName, messages: [] }];
    }
    const thread = contact.threads[0];

    // 去重：与最近一条 NPC 消息完全相同则跳过（防重复消息刷屏）。
    // 只对"来自 NPC"的消息去重；玩家自己发的消息永远保留。
    const lastThem = [...thread.messages].reverse().find((m) => m.from === "them");
    const clean = String(text || "").trim();
    if (lastThem && lastThem.text && this._sameMessage(lastThem.text, clean)) {
      return null;
    }

    const newMsg = {
      from: "them",
      who: fromName || contact.displayName,
      text: clean,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      day: this.worldState.day,
      hasTask: opts.taskId || null,
      storyId: opts.storyId || null,
      storyNodeId: opts.storyNodeId || null,
      storyChoices: opts.storyChoices || null,
      // 定位：{ x, z, label } —— 渲染成"📍去看看"按钮，点了自动寻路过去
      locate: opts.locate || null,
      // 只给了标签没给坐标时，渲染阶段用 venueResolver 现算坐标（坐标存下来会失效）
      locateLabel: opts.locateLabel || null,
      // 复仇线报信：点定位过去要开的是复仇剧场，不是普通故事节点
      revengeKin: opts.revengeKin || null,
      isUnread: true,
      // 会话对数：该联系人整个聊天里"轮到 NPC 说"的第几条（me+them 各占半轮，
      // 这里给纯数字展示用，显示"（第N轮）"）
      seq: thread.messages.filter((m) => m.from === "them").length + 1,
    };
    thread.messages.push(newMsg);
    if (thread.messages.length > 50) thread.messages.shift();

    // P3 未读徽章：有未读消息就挂手机标题
    this._updateBadge();

    // 新消息通知：Toast + 提示音（不在手机界面内时显示）
    if (!this.isOpen) {
      const preview = clean.length > 18 ? clean.substring(0, 18) + "…" : clean;
      this._showNotification(contact, fromName || contact.displayName, preview);
    }
    return newMsg;
  }

  /** 判断两条消息是否重复（忽略首尾空格 + "名字："前缀） */
  _sameMessage(a, b) {
    const strip = (s) => String(s).trim().replace(/^[^：:]{1,8}[：:]\s*/, "");
    return strip(a) === strip(b);
  }

  _showNotification(contact, displayName, preview) {
    // 使用全局 toast 显示消息通知
    const toastEl = document.getElementById("toast-side");
    if (toastEl) {
      const notif = document.createElement("div");
      notif.className = "phone-toast";
      notif.innerHTML = `<span class="phone-toast-avatar">${contact.avatar || '👤'}</span>
        <span class="phone-toast-body"><b>${displayName}</b><small>${preview}</small></span>`;
      toastEl.appendChild(notif);
      setTimeout(() => { notif.classList.add("fadeout"); }, 3500);
      setTimeout(() => { if (notif.parentNode) notif.parentNode.removeChild(notif); }, 4000);
    }
    // 提示音（消息到达声）
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1047, ctx.currentTime);      // C6
      osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (_) { /* 忽略音频错误 */ }
  }

  open() {
    // 确保帮派成员的 NPC 都有联系人条目
    this._ensureFactionContacts();
    const contactList = Object.values(this.contacts);
    if (contactList.length === 0) {
      // 显示空状态
      this.contactListEl.innerHTML = `<div style="padding:40px;text-align:center;color:#6a6a75;font-size:14px;">📭 暂无联系人<br><small>去和镇民聊聊天吧（按 F 对话）</small></div>`;
      this.modal.classList.remove("hidden");
      this.isOpen = true;
      this._updateBadge();
      return true;
    }
    this.showContactList();
    this.modal.classList.remove("hidden");
    this.isOpen = true;
    this._updateBadge();
    return true;
  }

  /** 扫描帮派系统，将玩家帮派成员自动添加为手机联系人 */
  _ensureFactionContacts() {
    try {
      const fs = window.__ww?.factionSystem || window.__ww;
      const pf = fs?.getPlayerFaction?.();
      if (!pf?.members) return;
      const memberIds = pf.members;
      const npcRegistry = window.__ww?.npcRegistry;
      for (const mid of memberIds) {
        if (!mid || this.contacts[mid]) continue;
        const def = npcRegistry?.get(mid);
        if (def) {
          this.addContact(mid, def.displayName, def.job || "镇民");
        }
      }
    } catch (_) { /* 忽略错误 */ }
  }

  close() {
    this.modal.classList.add("hidden");
    this.isOpen = false;
    this.activeContactId = null;
  }

  showContactList() {
    this.activeContactId = null;
    this.contactsView.classList.remove("hidden");
    this.chatView.classList.add("hidden");
    if (this.stockView) this.stockView.classList.add("hidden");
    if (this.storiesView) this.storiesView.classList.add("hidden");
    this._renderContactList();
  }

  openChat(npcId) {
    this.activeContactId = npcId;
    this.contactsView.classList.add("hidden");
    this.chatView.classList.remove("hidden");
    if (this.storiesView) this.storiesView.classList.add("hidden");
    if (this.stockView) this.stockView.classList.add("hidden");
    this._renderChat(npcId);
    this._updateBadge();
  }

  _switchTab(tab) {
    const hideAll = () => {
      this.contactsView.classList.add("hidden");
      this.chatView.classList.add("hidden");
      if (this.stockView) this.stockView.classList.add("hidden");
      if (this.storiesView) this.storiesView.classList.add("hidden");
    };
    for (const [btn, name] of [[this.tabContacts, "contacts"], [this.tabTasks, "tasks"], [this.tabStock, "stock"], [this.tabStories, "stories"]]) {
      if (btn) btn.classList.toggle("active", name === tab);
    }
    if (tab === "contacts") {
      hideAll();
      this.showContactList();
    } else if (tab === "tasks" && this.taskSystem) {
      hideAll();
      this.contactsView.classList.remove("hidden");
      this._renderTaskView();
    } else if (tab === "stock" && this.stockMarket) {
      hideAll();
      if (this.stockView) this.stockView.classList.remove("hidden");
      this._renderStockView();
    } else if (tab === "stories" && this.storyRuntime) {
      hideAll();
      if (this.storiesView) this.storiesView.classList.remove("hidden");
      this._renderStoriesView();
    }
  }

  _renderStockView() {
    if (!this.stockMarket || !this.stockBody) return;
    this.stockMarket.renderInto(this.stockBody);
  }

  _renderTaskView() {
    this.contactsView.classList.remove("hidden");
    this.chatView.classList.add("hidden");
    const tasks = this.taskSystem ? this.taskSystem.getActiveTasks() : [];
    if (tasks.length === 0) {
      this.contactListEl.innerHTML = `<div style="padding:40px;text-align:center;color:#6a6a75;font-size:14px;">📋 暂无活跃任务<br><small>看看报纸上的悬赏，或等 NPC 联系你</small></div>`;
    } else {
      let html = "";
      const typeIcons = { bounty: "🎯", delivery: "📦", fetch: "🔍" };
      for (const t of tasks) {
        const daysLeft = t.deadline - (this.worldState.day - t.assignedDay);
        html += `<div class="phone-contact" data-task-id="${t.id}">
          <div class="phone-contact-avatar">${typeIcons[t.type] || "📋"}</div>
          <div class="phone-contact-info">
            <div class="phone-contact-name">${t.title}</div>
            <div class="phone-contact-preview">💰 $${t.reward.money || 0} · ⏳ ${daysLeft}天剩余</div>
          </div>
          <div style="font-size:10px;color:${daysLeft <= 1 ? 'var(--danger)' : '#9ab8d4'}">${daysLeft}天</div>
        </div>`;
      }
      this.contactListEl.innerHTML = html;
      for (const el of this.contactListEl.querySelectorAll(".phone-contact")) {
        el.addEventListener("click", () => {
          const taskId = el.dataset.taskId;
          if (taskId && this.taskSystem) {
            // 触发任务详情（通过事件冒泡到 main.js）
            window.__ww && window.__ww.showTaskDetail && window.__ww.showTaskDetail(taskId);
          }
        });
      }
    }
  }

  /** 故事 tab：列出所有 StoryTree（进行中的高亮 + 未开始的置灰），截止天数、去哪找 */
  _renderStoriesView() {
    if (!this.storyRuntime || !this.storiesBody) return;
    const sr = this.storyRuntime;
    const day = this.worldState.day;
    const all = sr.getAllStoryStatus?.() || [];
    if (!all.length) {
      this.storiesBody.innerHTML = `<div style="padding:40px;text-align:center;color:#6a6a75;font-size:14px;">📜 暂无故事线<br><small>世界还在酝酿……</small></div>`;
      return;
    }

    // 排序：进行中 > 未开始 > 已完成
    const rank = { active: 0, pending: 1, not_started: 1, completed: 2 };
    all.sort((a, b) => (rank[a.status] ?? 1) - (rank[b.status] ?? 1));

    const typeIcons = { introduction: "👋", relationship: "💛", faction: "🏴", turning_point: "⚡", investigation: "🔍", resolution: "🏁" };

    let html = "";
    for (const s of all) {
      // 未开始：置灰卡片，显示标题+描述+触发条件+启动按钮
      if (s.status === "not_started" || s.status === "pending") {
        html += `<div class="phone-story-card locked" data-story="${s.storyId}">
          <div class="phone-story-head"><span class="phone-story-icon">🔒</span>
            <div class="phone-story-info">
              <div class="phone-story-title">${s.title}</div>
              <div class="phone-story-node">${s.status === "pending" ? "等待触发…" : "尚未开始"}</div>
            </div>
          </div>
          <div class="phone-story-desc">${s.description || ""}</div>
          <div class="phone-story-miss">${s.status === "not_started" ? "多去镇上走动、处理事件，慢慢就会遇到" : "等待时机"}</div>
          <button class="phone-story-start-btn" data-start="${s.storyId}">▶ 立即开始</button>
        </div>`;
        continue;
      }
      if (s.status === "completed") {
        html += `<div class="phone-story-card done" data-story="${s.storyId}">
          <div class="phone-story-head"><span class="phone-story-icon">🏁</span>
            <div class="phone-story-info">
              <div class="phone-story-title">${s.title}</div>
              <div class="phone-story-node">已了结</div>
            </div>
          </div>
        </div>`;
        continue;
      }

      // 进行中：完整卡片
      const node = sr.getDefinition(s.storyId)?.nodes?.[s.currentNode];
      const icon = typeIcons[s.nodeType] || "📜";

      let deadlineText = "长期";
      let urgent = false;
      if (s.deadlineDays != null) {
        if (s.deadlineDays <= 0) { deadlineText = "今日截止"; urgent = true; }
        else if (s.deadlineDays <= 2) { deadlineText = `${s.deadlineDays}天后截止`; urgent = true; }
        else deadlineText = `${s.deadlineDays}天后截止`;
      }

      const actors = Object.values(s.actorBindings || {}).map((a) => a).join("、");
      const actorNames = actors ? ` · ${actors}` : "";

      html += `<div class="phone-story-card" data-story="${s.storyId}">
        <div class="phone-story-head"><span class="phone-story-icon">${icon}</span>
          <div class="phone-story-info">
            <div class="phone-story-title">${s.title}</div>
            <div class="phone-story-node">${s.nodeTitle}</div>
          </div>
          <span class="phone-story-deadline ${urgent ? "urgent" : ""}">${deadlineText}</span>
        </div>
        <div class="phone-story-desc">${s.nodeDescription || ""}${actorNames}</div>
        ${s.needsPlayerChoice ? '<div class="phone-story-choice">✋ 需要你来做决定</div>' : ""}
        ${s.missCount > 0 ? `<div class="phone-story-miss">⚠️ 错过 ${s.missCount} 次机会</div>` : ""}
        <button class="phone-story-start-btn" data-push="${s.storyId}">▶ 推进这一环节</button>
      </div>`;
    }
    this.storiesBody.innerHTML = html;

    // 点击故事卡 → 提示去哪找（toast）
    for (const el of this.storiesBody.querySelectorAll(".phone-story-card:not(.locked):not(.done)")) {
      el.addEventListener("click", () => {
        const sid = el.dataset.story;
        const st = all.find((s) => s.storyId === sid);
        if (this.storyHud) {
          this.storyHud.toast(`📜 ${st?.channelHint ? "去找： " + st.channelHint : "留意镇上动静"}`, { key: "story_" + sid, duration: 3600 });
        }
      });
    }
    // 启动按钮：强制开始未触发的故事
    for (const btn of this.storiesBody.querySelectorAll(".phone-story-start-btn[data-start]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sid = btn.dataset.start;
        if (!sid || !this.onStoryStart) return;
        const res = this.onStoryStart(sid);
        if (res && res.ok) {
          // 启动成功 → 重渲染
          this._renderStoriesView();
        }
      });
    }
    // 推进按钮：把进行中的故事往下推一环节（重新拉起遭遇/小剧场）
    for (const btn of this.storiesBody.querySelectorAll(".phone-story-start-btn[data-push]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sid = btn.dataset.push;
        if (!sid || !this.onStoryPush) return;
        const res = this.onStoryPush(sid);
        if (res && res.ok) this._renderStoriesView();
      });
    }
  }

  _renderContactList() {
    const contacts = Object.values(this.contacts);
    contacts.sort((a, b) => {
      const aUnread = a.threads[0]?.messages.some(m => m.isUnread);
      const bUnread = b.threads[0]?.messages.some(m => m.isUnread);
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return b.addedDay - a.addedDay;
    });

    // 获取玩家与各 NPC 的好感度
    const rels = this.worldState.state?.relationships || {};
    const _getRelVal = (npcId) => rels[npcId + "->player"] || null;

    this.contactListEl.innerHTML = "";
    for (const c of contacts) {
      const msgs = c.threads[0]?.messages || [];
      const lastMsg = msgs.slice(-1)[0];
      const hasUnread = msgs.some(m => m.isUnread);
      const lastPreview = lastMsg
        ? (lastMsg.from === "me" ? "你: " : "") + lastMsg.text.substring(0, 30)
        : "";

      // 好感度标签
      const rel = _getRelVal(c.npcId);
      let affLabel = "";
      if (rel) {
        const aff = rel.affection || 0;
        if (aff >= 50) affLabel = "💖亲近";
        else if (aff >= 20) affLabel = "😊友善";
        else if (aff >= -20) affLabel = "😐普通";
        else if (aff >= -50) affLabel = "😒冷淡";
        else affLabel = "😡厌恶";
      }

      // 使用 NPC 圆形头像 (SVG) 或 emoji 回退
      const avatarHtml = c.avatarImg
        ? `<img class="phone-contact-avatar-img" src="${c.avatarImg}" alt="${c.displayName}" />`
        : `<div class="phone-contact-avatar">${c.avatar}</div>`;

      const div = document.createElement("div");
      div.className = "phone-contact" + (hasUnread ? " unread" : "");
      div.innerHTML = `
        ${avatarHtml}
        <div class="phone-contact-info">
          <div class="phone-contact-name">${c.displayName}<span class="phone-contact-job">${c.job}</span>${affLabel ? `<span class="phone-contact-affinity">${affLabel}</span>` : ""}</div>
          <div class="phone-contact-preview">${lastPreview || "暂无消息"}</div>
        </div>
        ${hasUnread ? '<div class="phone-contact-dot"></div>' : ''}
      `;
      div.addEventListener("click", () => this.openChat(c.npcId));
      this.contactListEl.appendChild(div);
    }
  }

  _renderChat(npcId) {
    const contact = this.contacts[npcId];
    if (!contact) return;

    // 显示 NPC 立绘（重要 NPC 才有）
    const PORTRAIT_MAP = {
      npc_jack: "assets/portraits/npc_jack_gpt2.png",
      npc_erin: "assets/portraits/npc_erin_gpt2.png",
      npc_bessie: "assets/portraits/npc_bessie_gpt2.png",
    };
    const portraitUrl = PORTRAIT_MAP[contact.npcId] || contact.avatarImg || null;
    const portraitHtml = portraitUrl
      ? `<img class="phone-chat-portrait" src="${portraitUrl}" alt="${contact.displayName}" />`
      : `<div class="phone-chat-portrait-emoji">${contact.avatar || '👤'}</div>`;

    this.chatHeaderEl.innerHTML = `${portraitHtml}<span>${contact.displayName}</span>`;

    // 帮派群聊：收服按钮没意义（对象是一群人），藏起来；
    // 但输入框保留 —— 玩家要能在群里发话，成员会接茬。
    const isGroup = contact.npcId === "gang_group" || contact.displayName === "帮派群聊";
    if (this.recruitBtn) this.recruitBtn.style.display = isGroup ? "none" : "";
    // 召集按钮：只对自己的帮派成员显示
    const isMember = this.isPlayerMember ? this.isPlayerMember(contact.npcId) : false;
    if (this.summonBtn) this.summonBtn.style.display = (isGroup || !isMember) ? "none" : "";
    if (this.inputEl) {
      this.inputEl.style.display = "";
      this.inputEl.placeholder = isGroup ? "在群里说句话…" : "发条消息…";
    }
    if (this.sendBtn) this.sendBtn.style.display = "";

    // 好感度：聊天页头显示 NPC↔玩家 的关系（与联系人列表同一数据源）
    if (this.affinityEl) {
      const rel = this.worldState.state?.relationships?.[contact.npcId + "->player"] || null;
      const aff = rel?.affection ?? 0;
      let label = "🤝 初识";
      if (aff >= 50) label = "💖 亲近";
      else if (aff >= 20) label = "😊 友善";
      else if (aff >= -20) label = "😐 普通";
      else if (aff >= -50) label = "😒 冷淡";
      else label = "😡 厌恶";
      this.affinityEl.textContent = `${label} ${aff > 0 ? "+" : ""}${aff}`;
    }

    const thread = contact.threads[0];
    this.chatEl.innerHTML = "";

    if (!thread || thread.messages.length === 0) {
      this.chatEl.innerHTML = `<div style="text-align:center;color:#6a6a75;font-size:13px;padding-top:60px;">还没有消息<br>等 NPC 主动联系，或打个招呼吧</div>`;
    }

    let seqNo = 0;
    for (const msg of (thread?.messages || [])) {
      msg.isUnread = false;
      seqNo += 1;
      const bubble = document.createElement("div");
      bubble.className = "msg " + (msg.from === "me" ? "me" : "them");

      // 会话对数：从第一条起每来一条消息算一回合（me/them 都算），
      // 渲染时现算，不依赖存储 —— 所有入口加的消息都能正确编号
      let content = `<span class="who">${msg.who} · ${msg.time || ""} <em class="msg-seq">（第${seqNo}回合）</em></span>${msg.text}`;
      if (msg.hasTask) {
        content += `<div class="msg-task-btn" data-task-id="${msg.hasTask}">📋 查看任务</div>`;
      }
      // 定位按钮：让玩家自己走过去看，而不是在手机上隔空做决定。
      // 没存坐标的（来自每日投放队列）在这里现算 —— 存下来的坐标会随世界变化失效。
      let loc = msg.locate;
      if (!loc && msg.storyId && this.venueResolver) {
        const r = this.venueResolver(msg.storyId, msg.storyNodeId);
        if (r && isFinite(r.x) && isFinite(r.z)) {
          loc = { x: r.x, z: r.z, label: msg.locateLabel || r.label || "事发地点" };
        }
      }
      if (loc) {
        const lbl = loc.label || "那个地方";
        content += `<div class="msg-task-btn msg-locate" data-lx="${loc.x}" data-lz="${loc.z}" data-story="${msg.storyId || ""}" data-node="${msg.storyNodeId || ""}" data-revenge="${msg.revengeKin || ""}" data-label="${lbl}">📍 去看看（${lbl}）</div>`;
      }
      if (msg.storyChoices && msg.storyChoices.length) {
        for (const c of msg.storyChoices) {
          content += `<div class="msg-task-btn msg-story-choice" data-story="${msg.storyId}" data-node="${msg.storyNodeId || ""}" data-choice="${c.id}">▶ ${c.label}</div>`;
        }
      }
      bubble.innerHTML = content;
      this.chatEl.appendChild(bubble);
    }

    this._renderQuickReplies(thread, contact);
    // 定位按钮：关手机 + 自动寻路过去
    for (const el of this.chatEl.querySelectorAll(".msg-locate")) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.onLocate) return;
        this.onLocate({
          x: parseFloat(el.dataset.lx),
          z: parseFloat(el.dataset.lz),
          label: el.dataset.label || "目的地",
          storyId: el.dataset.story || null,
          nodeId: el.dataset.node || null,
          revengeKin: el.dataset.revenge || null,
        });
        this.close();
      });
    }
    // 故事决策按钮：点了推进剧情
    for (const el of this.chatEl.querySelectorAll(".msg-story-choice")) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const storyId = el.dataset.story;
        const choiceId = el.dataset.choice;
        if (!storyId || !choiceId || !this.onStoryChoice) return;
        this.onStoryChoice(storyId, choiceId);
        // 关掉按钮，避免重复点
        el.style.opacity = "0.4";
        el.style.pointerEvents = "none";
      });
    }
    // 等这一帧布局完成再滚到底 —— 直接设 scrollTop 会被 quick-replies /
    // 输入行的高度变化顶回去，很多消息时滚不到底部。
    requestAnimationFrame(() => {
      this.chatEl.scrollTop = this.chatEl.scrollHeight;
    });
  }

  _renderQuickReplies(thread, contact) {
    this.repliesEl.innerHTML = "";
    const lastMsg = thread?.messages?.slice(-1)[0];
    const replies = [];

    // 帮派群聊：不给单人对聊的快捷选项，但**保留自由输入**——
    // 群里能自己发话，成员会接茬。
    const isGroup = contact.npcId === "gang_group" || contact.displayName === "帮派群聊";
    if (isGroup) {
      const btn = document.createElement("button");
      btn.className = "phone-reply-btn";
      btn.textContent = "👥 回联系人列表";
      btn.addEventListener("click", () => this.showContactList());
      this.repliesEl.appendChild(btn);
      return;
    }

    // 只留**有实际作用**的快捷键：接/拒任务、要任务。
    // 「打个招呼」「聊点别的」这类写死选项已删除 —— 它们只会换来一句
    // 罐头回复（"嗯，就这样吧。"），既不推进关系也不推进剧情，
    // 而下面就是自由输入框，想寒暄直接打字更自然。
    if (lastMsg && lastMsg.from === "them") {
      if (lastMsg.hasTask && this.taskSystem) {
        replies.push({ label: "✅ 接受任务", action: "accept_task", taskId: lastMsg.hasTask });
        replies.push({ label: "❌ 拒绝", action: "reject_task", taskId: lastMsg.hasTask });
      }
    } else {
      replies.push({ label: "📋 有任务吗", action: "ask_task" });
    }

    for (const r of replies) {
      const btn = document.createElement("button");
      btn.className = "phone-reply-btn";
      btn.textContent = r.label;
      btn.addEventListener("click", () => this._handleReply(r, contact));
      this.repliesEl.appendChild(btn);
    }
  }

  _handleReply(reply, contact) {
    if (!contact || !contact.threads || contact.threads.length === 0) return;
    const thread = contact.threads[0];
    const npcId = contact.npcId;

    // 玩家消息
    thread.messages.push({
      from: "me", who: "我", text: reply.label,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      day: this.worldState.day,
      isUnread: false,
    });

    if (reply.action === "accept_task" && reply.taskId && this.taskSystem) {
      this.taskSystem.acceptTask(reply.taskId);
      thread.messages.push({
        from: "them", who: contact.displayName,
        text: "好的，那就拜托你了。详情请看任务面板。",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        day: this.worldState.day,
        isUnread: false,
      });
    } else if (reply.action === "reject_task" && reply.taskId && this.taskSystem) {
      this.taskSystem.rejectTask(reply.taskId);
      thread.messages.push({
        from: "them", who: contact.displayName,
        text: "那算了，我再找别人。",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        day: this.worldState.day,
        isUnread: false,
      });
    } else if (reply.action === "ask_task" && this.taskSystem) {
      // 生成一个任务给玩家
      const taskTypes = ["bounty", "delivery", "fetch"];
      const type = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      const task = this.taskSystem.createTaskForType(type, {
        from: "phone",
        fromNpcId: npcId,
      });
      if (task) {
        thread.messages.push({
          from: "them", who: contact.displayName,
          text: `正好有件事想拜托你：${task.description}`,
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          day: this.worldState.day,
          hasTask: task.id,
          isUnread: false,
        });
      } else {
        thread.messages.push({
          from: "them", who: contact.displayName,
          text: "暂时没什么需要帮忙的，过两天再来看看吧。",
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          day: this.worldState.day,
          isUnread: false,
        });
      }
    } else {
      // 简单回复
      const genericReplies = [
        "好的，祝你一切顺利。",
        "哈哈，回头再聊。",
        "嗯，就这样吧。",
        "有事情随时找我。",
      ];
      setTimeout(() => {
        thread.messages.push({
          from: "them", who: contact.displayName,
          text: genericReplies[Math.floor(Math.random() * genericReplies.length)],
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          day: this.worldState.day,
          isUnread: false,
        });
        if (this.activeContactId === npcId) {
          this._renderChat(npcId);
        }
      }, 600);
    }

    this._renderChat(npcId);
  }

  _avatarForJob(job) {
    const map = {
      "会计": "👩‍💼", "枪手": "🤠", "酒保": "🍺", "商人": "💼",
      "赌徒": "🎲", "神枪手": "🎯", "淘金客": "⛏️", "歌女": "🎤",
      "赏金猎人": "🔫", "马夫": "🐴", "牧师": "⛪", "铁匠": "🔨",
      "医生": "💊", "记者": "📝", "旅人": "🧳", "牛仔": "🐂",
      "银行经理": "🏦", "警长": "⭐", "农民": "🌾",
      "警长助手": "🛡️", "赌场老板": "🎰", "黑蹄会头目": "👤",
    };
    return map[job] || "👤";
  }
}
