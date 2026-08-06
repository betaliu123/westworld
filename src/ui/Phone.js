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
    this.tabContacts = document.getElementById("phone-tab-contacts");
    this.tabTasks = document.getElementById("phone-tab-tasks");
    this.tabStock = document.getElementById("phone-tab-stock");

    this.activeContactId = null;
    this.isOpen = false;
    this.taskSystem = null;
    this.stockMarket = null;  // 由 main.js 注入，用于手机股市 tab
    // 自由输入：远程收服/招揽的钩子（由 main.js 注入，返回 {ok,text}）
    this.onFreeText = null;

    document.getElementById("phone-close").addEventListener("click", () => this.close());
    document.getElementById("phone-back").addEventListener("click", () => this.showContactList());
    this.tabContacts.addEventListener("click", () => this._switchTab("contacts"));
    this.tabTasks.addEventListener("click", () => this._switchTab("tasks"));
    if (this.tabStock) this.tabStock.addEventListener("click", () => this._switchTab("stock"));

    this.inputEl = document.getElementById("phone-input");
    this.sendBtn = document.getElementById("phone-input-send");
    this.badgeEl = document.getElementById("phone-badge");
    this.affinityEl = document.getElementById("phone-chat-affinity");
    this.recruitBtn = document.getElementById("phone-btn-recruit");
    this.onRecruit = null;   // 收服按钮的钩子（由 main.js 注入，返回给对方看的回复文本）
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
  }

  /** 收服按钮的钩子（main.js 注入） */
  setRecruitHandler(fn) { this.onRecruit = fn; }

  /** 注入股票市场实例（手机股市 tab 用） */
  setStockMarket(sm) { this.stockMarket = sm; }

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
    const handler = this.onFreeText;
    if (handler) {
      try {
        const result = await handler(this.activeContactId, raw, contact);
        if (result && typeof result === "string") {
          thread.messages.push({
            from: "them", who: contact.displayName, text: result,
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
    const newMsg = {
      from: "them",
      who: fromName || contact.displayName,
      text,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      day: this.worldState.day,
      hasTask: opts.taskId || null,
      isUnread: true,
    };
    thread.messages.push(newMsg);
    if (thread.messages.length > 50) thread.messages.shift();

    // P3 未读徽章：有未读消息就挂手机标题
    this._updateBadge();

    // 新消息通知：Toast + 提示音（不在手机界面内时显示）
    if (!this.isOpen) {
      const preview = text.length > 18 ? text.substring(0, 18) + "…" : text;
      this._showNotification(contact, fromName || contact.displayName, preview);
    }
    return newMsg;
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
    this._renderContactList();
  }

  openChat(npcId) {
    this.activeContactId = npcId;
    this.contactsView.classList.add("hidden");
    this.chatView.classList.remove("hidden");
    if (this.stockView) this.stockView.classList.add("hidden");
    this._renderChat(npcId);
    this._updateBadge();
  }

  _switchTab(tab) {
    const hideAll = () => {
      this.contactsView.classList.add("hidden");
      this.chatView.classList.add("hidden");
      if (this.stockView) this.stockView.classList.add("hidden");
    };
    for (const [btn, name] of [[this.tabContacts, "contacts"], [this.tabTasks, "tasks"], [this.tabStock, "stock"]]) {
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

    // 帮派群聊：不是单人对聊，收服按钮 + 输入框都没意义，藏起来
    const isGroup = contact.npcId === "gang_group" || contact.displayName === "帮派群聊";
    if (this.recruitBtn) this.recruitBtn.style.display = isGroup ? "none" : "";
    if (this.inputEl) this.inputEl.style.display = isGroup ? "none" : "";
    if (this.sendBtn) this.sendBtn.style.display = isGroup ? "none" : "";

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

    for (const msg of (thread?.messages || [])) {
      msg.isUnread = false;
      const bubble = document.createElement("div");
      bubble.className = "msg " + (msg.from === "me" ? "me" : "them");

      let content = `<span class="who">${msg.who} · ${msg.time || ""}</span>${msg.text}`;
      if (msg.hasTask) {
        content += `<div class="msg-task-btn" data-task-id="${msg.hasTask}">📋 查看任务</div>`;
      }
      bubble.innerHTML = content;
      this.chatEl.appendChild(bubble);
    }

    this._renderQuickReplies(thread, contact);
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

    // 帮派群聊：不显示单人对聊的快捷选项（知道了/聊点别的/打招呼），
    // 群聊是看别人说话的地方，不是跟一个人对话
    const isGroup = contact.npcId === "gang_group" || contact.displayName === "帮派群聊";
    if (isGroup) {
      // 群聊只给"看看大家"一个返回按钮式选项
      const btn = document.createElement("button");
      btn.className = "phone-reply-btn";
      btn.textContent = "👥 回联系人列表";
      btn.addEventListener("click", () => this.showContactList());
      this.repliesEl.appendChild(btn);
      return;
    }

    if (lastMsg && lastMsg.from === "them") {
      if (lastMsg.hasTask && this.taskSystem) {
        replies.push({ label: "✅ 接受任务", action: "accept_task", taskId: lastMsg.hasTask });
        replies.push({ label: "❌ 拒绝", action: "reject_task", taskId: lastMsg.hasTask });
      }
      replies.push({ label: "👍 知道了", action: "ack" });
      replies.push({ label: "🤝 聊点别的", action: "chat" });
    } else {
      replies.push({ label: "🤝 打个招呼", action: "greet_sms" });
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
