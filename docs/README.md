# 系统文档索引

本项目按模块划分为 10 个系统文档，每个文档讲清"它负责什么 / 数据在哪 / 关键流程 / 怎么配置"。全部基于当前代码（2026-08 版本）。

| # | 文档 | 系统 | 核心文件 |
|---|------|------|----------|
| 1 | [01-世界观与小镇.md](01-世界观与小镇.md) | 小镇生成 / 建筑 / 室内 / 民居 | `world/*` |
| 2 | [02-NPC与AI大脑.md](02-NPC与AI大脑.md) | NPC 实体 / 决策 / 日程 / 情绪 / 对话 | `entities/NPC.js`, `systems/AIBrain.js` |
| 3 | [03-战斗与伤亡.md](03-战斗与伤亡.md) | 攻击判定 / 阵营 / 血条 / 两阶段伤亡 / 收服 | `systems/Combat.js`, `entities/NPC.js`, `encounter/SubdueSystem.js` |
| 4 | [04-声望与执法.md](04-声望与执法.md) | 荣誉 / 通缉 / 警长追捕 / 逮捕 | `systems/Reputation.js`, `entities/Sheriff*` |
| 5 | [05-势力系统.md](05-势力系统.md) | 玩家势力 / 黑蹄会支柱 / Nemesis 人事图 / 卧底 | `factions/FactionSystem.js`, `factions/NemesisSystem.js`, `factions/PlayerOrgSystem.js` |
| 6 | [06-警长第三方.md](06-警长第三方.md) | 警长四支柱 / 证据 / 突袭 / 行贿 | `factions/LawSystem.js`, `config/lawData.js` |
| 7 | [07-产业与股市.md](07-产业与股市.md) | 产业经营 / 投资抢夺 / 股票 / 股市新闻 | `factions/BusinessSystem.js`, `ui/StockMarket.js`, `factions/StockNewsService.js` |
| 8 | [08-遭遇与抉择.md](08-遭遇与抉择.md) | 统一遭遇管线 / 中央弹窗 / 处置伤者 | `encounter/EncounterRuntime.js`, `ui/EncounterUI.js` |
| 9 | [09-AI剧场.md](09-AI剧场.md) | 街头剧场 / 剧本树 / 后果包 / 群聊 | `theater/*`, `factions/GangGroupChat.js` |
| 10 | [10-手机与报纸.md](10-手机与报纸.md) | 手机 / 联系人 / 群聊 / 报纸 / 消息治理 | `ui/Phone.js`, `ui/Newspaper.js`, `systems/MessageGovernor.js` |
| 11 | [11-世界模拟与时间.md](11-世界模拟与时间.md) | 日循环 / 日结算 / 存档 / 事件日志 | `simulation/*` |
| 12 | [12-外部AI接入.md](12-外部AI接入.md) | DS flash 接入 / 服务端代理 / 生成参数 | `serve.py`, `llm/*`, `npc/NpcChatService.js` |

## 常用入口

- **调试面板**：`Ctrl+Shift+D` —— 剧场、遭遇、LLM、玩家战斗属性（伤害/防御）
- **帮派面板**：`G` —— 帮派 / 产业 / 人事图（黑蹄会·我的帮派·警长）/ 警长
- **手机**：`Tab` —— 联系人 / 任务 / 股市
- **快捷键**：`O`=人事图，`K`=警长，`N`=报纸，`M`=集市
