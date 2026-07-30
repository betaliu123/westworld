// SaveSystem.js — JSON 存档与读取。使用 localStorage，保留最近 3 个游戏日的快照。

const SAVE_PREFIX = "westworld_save_";
const MAX_SAVES = 3;

export class SaveSystem {
  constructor(worldState) {
    this.worldState = worldState;
  }

  // 保存当前状态（自动命名：day_N）
  save(slot = null) {
    const state = this.worldState.toJSON();
    const day = state.day || 1;
    const key = slot ? `${SAVE_PREFIX}${slot}` : `${SAVE_PREFIX}day_${day}`;
    const saveData = {
      timestamp: Date.now(),
      day: day,
      version: state.version,
      state: state,
    };
    try {
      localStorage.setItem(key, JSON.stringify(saveData));
      this._cleanupOldSaves();
      console.log(`[SaveSystem] 已保存: ${key} (第${day}天)`);
      return key;
    } catch (e) {
      console.error("[SaveSystem] 保存失败:", e);
      return null;
    }
  }

  // 读取最近存档
  load(slot = null) {
    let key;
    if (slot) {
      key = `${SAVE_PREFIX}${slot}`;
    } else {
      // 找最近的非空存档
      const saves = this.listSaves();
      if (saves.length === 0) return null;
      key = saves[0].key;
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const saveData = JSON.parse(raw);
      if (!saveData.state || saveData.state.version !== 1) {
        console.warn("[SaveSystem] 存档版本不兼容");
        return null;
      }
      console.log(`[SaveSystem] 已加载: ${key} (第${saveData.day}天)`);
      return saveData;
    } catch (e) {
      console.error("[SaveSystem] 读取失败:", e);
      return null;
    }
  }

  // 列出所有存档
  listSaves() {
    const saves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SAVE_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          saves.push({
            key,
            day: data.day,
            timestamp: data.timestamp,
            label: `第${data.day}天 — ${new Date(data.timestamp).toLocaleString("zh-CN")}`,
          });
        } catch (e) { /* skip corrupt */ }
      }
    }
    saves.sort((a, b) => b.timestamp - a.timestamp);
    return saves;
  }

  // 清理旧存档（只保留最近 N 个）
  _cleanupOldSaves() {
    const saves = this.listSaves();
    if (saves.length <= MAX_SAVES) return;
    const toRemove = saves.slice(MAX_SAVES);
    for (const s of toRemove) {
      localStorage.removeItem(s.key);
    }
  }

  // 删除指定存档
  deleteSlot(slot) {
    const key = `${SAVE_PREFIX}${slot}`;
    localStorage.removeItem(key);
  }

  // 清空所有存档
  clearAll() {
    const saves = this.listSaves();
    for (const s of saves) {
      localStorage.removeItem(s.key);
    }
  }

  // 是否有存档
  hasSaves() {
    return this.listSaves().length > 0;
  }
}
