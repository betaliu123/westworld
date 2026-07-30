// TaskSystem.js — 任务系统：赏金、送货、寻物三种类型，报纸/手机/故事节点三种来源。

import { TASK_DEFS } from "../config/gameData.js";

export class TaskSystem {
  constructor(worldState) {
    this.worldState = worldState;
    this.tasks = [];
    this._listeners = [];
  }

  on(event, cb) { this._listeners.push({ event, cb }); }
  _emit(event, data) { for (const l of this._listeners) if (l.event === event) l.cb(data); }

  getActiveTasks() { return this.tasks.filter(t => t.status === "active"); }
  getTrackedTask() { return this.tasks.find(t => t.status === "active" && t.tracked); }
  getAvailableTasks() { return this.tasks.filter(t => t.status === "available"); }

  /**
   * Create task from a template definition.
   */
  createTask(templateId, overrides = {}) {
    const template = TASK_DEFS[templateId];
    if (!template) return null;

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      templateId,
      type: template.type,
      title: template.title,
      description: template.description,
      from: overrides.from || "newspaper",
      fromNpcId: overrides.fromNpcId || null,
      objective: { ...template.objective },
      reward: { ...template.reward, ...(overrides.reward || {}) },
      deadline: template.deadline || 4,
      assignedDay: this.worldState.day,
      status: "available",
      tracked: false,
    };

    if (overrides.targetNpcId) task.objective.targetNpcId = overrides.targetNpcId;
    if (overrides.targetBuilding) task.objective.targetBuilding = overrides.targetBuilding;

    this.tasks.push(task);
    this._emit("taskCreated", task);
    return task;
  }

  createTaskForType(type, overrides = {}) {
    const pool = Object.entries(TASK_DEFS).filter(([, t]) => t.type === type);
    if (pool.length === 0) return null;
    const [id] = pool[Math.floor(Math.random() * pool.length)];
    return this.createTask(id, overrides);
  }

  acceptTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.status !== "available") return false;
    task.status = "active";
    task.tracked = true;
    for (const t of this.tasks) {
      if (t.id !== taskId && t.status === "active") t.tracked = false;
    }
    this._emit("taskAccepted", task);
    return true;
  }

  rejectTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;
    task.status = "expired";
    this._emit("taskRejected", task);
    return true;
  }

  trackTask(taskId) {
    for (const t of this.tasks) {
      if (t.status === "active") t.tracked = (t.id === taskId);
    }
    const task = this.tasks.find(t => t.id === taskId);
    this._emit("trackChanged", task);
  }

  abandonTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.status !== "active") return false;
    task.status = "expired";
    task.tracked = false;
    this._emit("taskAbandoned", task);
    return true;
  }

  /**
   * Check task completion. Called from main loop / event handlers.
   */
  checkCompletion(eventData) {
    // eventData: { type: "npc_defeated"|"building_reached"|"item_collected"|"item_delivered", npcId?, buildingName?, itemId? }
    const completed = [];
    for (const task of this.getActiveTasks()) {
      let done = false;
      switch (task.objective.type) {
        case "defeat":
          if (eventData.type === "npc_defeated" && eventData.npcId === task.objective.targetNpcId) {
            done = true;
          }
          break;
        case "deliver":
          if (eventData.type === "building_reached" && eventData.buildingName === task.objective.targetBuilding) {
            done = true;
          }
          break;
        case "collect":
          if (eventData.type === "item_collected" && eventData.itemId === task.objective.targetItem) {
            done = true;
          }
          // 也支持"到达建筑交付"的方式（如去集市买完东西后来交）
          if (eventData.type === "item_delivered" && task.objective.targetBuilding && eventData.buildingName === task.objective.targetBuilding) {
            done = true;
          }
          break;
        case "own_home":
          if (eventData.type === "home_purchased") {
            done = true;
          }
          break;
      }
      if (done) {
        task.status = "completed";
        completed.push(task);
      }
    }
    for (const t of completed) {
      this._emit("taskCompleted", t);
    }
    return completed;
  }

  grantReward(task, economy, reputation) {
    if (!task || !task.reward) return;
    if (task.reward.money && economy) economy.addMoney(task.reward.money);
    if (task.reward.honor && reputation) reputation.addHonor(task.reward.honor);
    this._emit("rewardGranted", task);
  }

  expireTasks() {
    const day = this.worldState.day;
    const expired = [];
    for (const task of this.tasks) {
      if (task.status === "active" || task.status === "available") {
        if (task.deadline > 0 && day - task.assignedDay >= task.deadline) {
          task.status = "expired";
          task.tracked = false;
          expired.push(task);
        }
      }
    }
    for (const t of expired) {
      this._emit("taskExpired", t);
    }
  }

  refreshDaily() {
    // Clean old completed/expired
    this.tasks = this.tasks.filter(t =>
      t.status === "active" || t.status === "available" ||
      (t.status === "completed" && this.worldState.day - t.assignedDay < 2)
    );

    // Generate 1-2 new available tasks
    const availableCount = this.getAvailableTasks().length;
    const activeCount = this.getActiveTasks().length;
    if (availableCount + activeCount < 4) {
      const count = Math.min(2, 4 - availableCount - activeCount);
      const types = ["bounty", "delivery", "fetch"];
      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        this.createTaskForType(type, { from: "newspaper" });
      }
    }
  }
}
