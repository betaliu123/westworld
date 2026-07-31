// Newspaper.js — 报纸/新闻系统：玩家行为生成头条，新刊弹窗提示，报纸界面查看，八卦投稿换钱。

import { PAPER_NAME, HEADLINE } from "../config/gameData.js";

function fillTemplate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "某人");
}

export class Newspaper {
  constructor(audio) {
    this.audio = audio;
    this.articles = [];
    this.unread = false;
    this.submittedGossip = new Set(); // 已投稿过的八卦（去重，避免刷钱）
    this.taskSystem = null;  // 由 main 注入

    // DOM
    this.modal = document.getElementById("newspaper");
    this.dateEl = document.getElementById("paper-date");
    this.bodyEl = document.getElementById("paper-body");
    this.gossipEl = document.getElementById("paper-gossip");
    this.badge = document.getElementById("paper-badge");
    const close = document.getElementById("paper-close");
    if (close) close.addEventListener("click", () => this.close());

    // 开局放几条日常新闻
    this._daily = 0;
    this.publish("daily", {}, { silent: true });
  }

  get isOpen() {
    return this.modal && !this.modal.classList.contains("hidden");
  }

  // 发布一条新闻。category ∈ HEADLINE keys
  publish(category, vars = {}, opts = {}) {
    const pool = HEADLINE[category] || HEADLINE.daily;
    const tpl = pool[Math.floor(Math.random() * pool.length)];
    const article = {
      title: fillTemplate(tpl.h, vars),
      body: fillTemplate(tpl.b, vars),
      time: vars.time || "",
      category,
    };
    this.articles.unshift(article);
    if (this.articles.length > 12) this.articles.pop();

    if (!opts.silent) {
      this.unread = true;
      this._showBadge();
      if (this.audio) this.audio.newspaper();
    }
    if (this.isOpen) this.render();
    return article;
  }

  /**
   * 发布一条自定义文章（AI 剧场的事件后续用）。
   * 与 publish() 的区别：标题正文直接给定，不走 HEADLINE 模板库。
   */
  publishCustom(title, body, opts = {}) {
    const article = {
      title: String(title || "无题"),
      body: String(body || ""),
      time: opts.time || "",
      category: opts.category || "gossip",
    };
    this.articles.unshift(article);
    if (this.articles.length > 12) this.articles.pop();
    if (!opts.silent) {
      this.unread = true;
      this._showBadge();
      if (this.audio) this.audio.newspaper();
    }
    if (this.isOpen) this.render();
    return article;
  }
  _showBadge() {
    if (!this.badge) return;
    this.badge.classList.remove("hidden");
    this.badge.textContent = "📰 报纸有新头条！按 N 查看";
    clearTimeout(this._badgeTimer);
    this._badgeTimer = setTimeout(() => this.badge.classList.add("hidden"), 4500);
  }

  open(timeStr, gossipItems) {
    this.unread = false;
    if (this.badge) this.badge.classList.add("hidden");
    this._gossipItems = gossipItems || [];
    this.render(timeStr);
    this.modal.classList.remove("hidden");
    if (this.audio) this.audio.newspaper();
  }

  close() {
    this.modal.classList.add("hidden");
  }

  // onSubmit(gossipText) -> reward number
  setGossipHandler(fn) {
    this._submitHandler = fn;
  }

  // 注入任务系统引用
  setTaskSystem(ts) {
    this.taskSystem = ts;
  }

  // 发布一条委托/任务文章（带接取按钮）
  publishTask(task) {
    // 去重：同一 taskId 不重复发布
    if (this.articles.some(a => a.category === "task" && a.taskId === task.id)) return null;
    const article = {
      title: `📋 ${task.title}`,
      body: `${task.description}\n\n💰 赏金：$${task.reward.money || 0}${task.reward.honor ? ` · ⚖️ 荣誉：+${task.reward.honor}` : ''} ⏳ 剩余 ${task.deadline} 天`,
      category: "task",
      taskId: task.id,
      taskType: task.type,
    };
    this.articles.unshift(article);
    if (this.articles.length > 12) this.articles.pop();
    this.unread = true;
    this._showBadge();
    if (this.isOpen) this.render();
    return article;
  }

  // 清理报纸中对应的无效任务文章（任务已过期/被移除/完成超2天）
  cleanStaleTasks() {
    if (!this.taskSystem) return;
    const validTaskIds = new Set(this.taskSystem.tasks.map(t => t.id));
    this.articles = this.articles.filter(a => {
      if (a.category !== "task") return true;
      return a.taskId && validTaskIds.has(a.taskId);
    });
  }

  render(timeStr) {
    if (this.dateEl && timeStr) this.dateEl.textContent = `${PAPER_NAME} · ${timeStr}`;
    else if (this.dateEl) this.dateEl.textContent = PAPER_NAME;

    this.bodyEl.innerHTML = "";
    this.articles.forEach((a, i) => {
      const art = document.createElement("div");
      art.className = "paper-article" + (i === 0 ? " lead" : "");
      art.innerHTML = `<h3>${a.title}</h3><p>${a.body}</p>`;
      // 任务文章：添加接取按钮
      if (a.category === "task" && a.taskId && this.taskSystem) {
        const task = this.taskSystem.tasks.find(t => t.id === a.taskId);
        if (task && task.status === "available") {
          const btnRow = document.createElement("div");
          btnRow.style.marginTop = "8px";
          btnRow.style.display = "flex";
          btnRow.style.gap = "8px";
          const acceptBtn = document.createElement("button");
          acceptBtn.textContent = "📋 接取任务";
          acceptBtn.className = "sub-btn";
          acceptBtn.style.cssText = "background:#8b6914;color:#f5e6c8;border:1px solid #c8a840;padding:6px 14px;cursor:pointer;font-family:inherit;font-size:13px;border-radius:3px;";
          acceptBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const success = this.taskSystem.acceptTask(a.taskId);
            if (success) {
              acceptBtn.textContent = "✅ 已接取";
              acceptBtn.disabled = true;
              acceptBtn.style.opacity = "0.6";
              // 刷新报纸
              this.render(timeStr);
            }
          });
          const rejectBtn = document.createElement("button");
          rejectBtn.textContent = "✕ 忽略";
          rejectBtn.style.cssText = "background:#555;color:#aaa;border:1px solid #777;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:12px;border-radius:3px;";
          rejectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.taskSystem.rejectTask(a.taskId);
            // 移除这篇文章
            this.articles = this.articles.filter(ar => ar !== a);
            this.render(timeStr);
          });
          btnRow.appendChild(acceptBtn);
          btnRow.appendChild(rejectBtn);
          art.appendChild(btnRow);
        } else if (task && task.status === "active") {
          const badge = document.createElement("div");
          badge.textContent = "✅ 进行中";
          badge.style.cssText = "color:#8b6914;font-size:12px;margin-top:4px;";
          art.appendChild(badge);
        } else if (task && task.status === "completed") {
          const badge = document.createElement("div");
          badge.textContent = "🏆 已完成";
          badge.style.cssText = "color:#5a8a3a;font-size:12px;margin-top:4px;";
          art.appendChild(badge);
        }
      }
      this.bodyEl.appendChild(art);
    });

    // 八卦投稿区：列出玩家手机里发现的可投稿密闻
    this.gossipEl.innerHTML = "";
    const items = this._gossipItems || [];
    if (items.length === 0) {
      this.gossipEl.innerHTML = `<div class="gossip-empty">暂无可投稿的独家线报。捡到 NPC 手机、发现大八卦后可在此投稿换钱。</div>`;
      return;
    }
    const title = document.createElement("div");
    title.className = "gossip-title";
    title.textContent = "📮 向本报投稿独家线报（换取稿酬）";
    this.gossipEl.appendChild(title);

    for (const item of items) {
      const row = document.createElement("div");
      row.className = "gossip-row";
      const done = this.submittedGossip.has(item.id);
      row.innerHTML = `<span class="gossip-text">${item.text}</span>`;
      const btn = document.createElement("button");
      btn.textContent = done ? "已刊登" : `投稿 +$${item.reward}`;
      btn.disabled = done;
      btn.addEventListener("click", () => {
        if (this.submittedGossip.has(item.id)) return;
        this.submittedGossip.add(item.id);
        if (this._submitHandler) this._submitHandler(item);
        // 投稿后立刻在报纸生成对应爆料头条
        this.publish("gossip", { gossip: item.text }, {});
        this.render(timeStr);
      });
      row.appendChild(btn);
      this.gossipEl.appendChild(row);
    }
  }

  // 定期发布日常新闻，保持世界"在运转"
  tickDaily(dt) {
    this._daily += dt;
    if (this._daily > 90) {
      this._daily = 0;
      this.publish("daily", {}, {});
    }
  }

  /**
   * P4: 直接发布一条结构化文章（绕过模板），给 DailySimulation 使用。
   */
  publishStructured({ title, body, category = "daily" }) {
    const article = { title, body, time: "", category };
    this.articles.unshift(article);
    if (this.articles.length > 12) this.articles.pop();
    this.unread = true;
    this._showBadge();
    if (this.isOpen) this.render();
    return article;
  }
}
