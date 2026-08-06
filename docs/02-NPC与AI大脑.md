# 02 · NPC 与 AI 大脑

## 负责什么

让 NPC"活着"：有性格、职业、日程、情绪、家庭，会走路上班、回家睡觉、被吓跑、被惹怒反击、报警、闲聊、对话、被玩家打伤/打死/收服。

## 关键文件

- `entities/NPC.js` —— NPC 实体：血量、位置、模型、受击、倒地、死亡
- `systems/AIBrain.js` —— 决策大脑：状态机、日程、情绪、对话耐心、报警
- `systems/NPCManager.js` —— NPC 管理：生成、家庭分配、更新
- `config/npcData.js` —— 17 个重要 NPC（IMPORTANT_NPCS）人设档案
- `config/npcSchedules.js` —— 17 人 × 7 段人设日程（DS 生成）
- `npcs/NPCRegistry.js` —— 重要 NPC 持久档案（跨场景存活）
- `npcs/RelationshipSystem.js` / `KnowledgeSystem.js` —— 好感 / 知识

## 性格与血量

`NPC.hit()` 前先按性格算 `maxHp`（3~10）：胆量 + 攻击性 + 帮派 + 职业加成才得出血量。警长/神枪手最硬，医/牧最脆。

## 状态机（AIBrain）

`State`: `IDLE / WANDER / STARTLED / FLEE / ANGRY / DOWN / TALK / SEEK_LOOT / AT_HOME / AT_PLACE`

每帧 `think(dt, ctx)` 决策：时段跟踪 → 剧场接管 → 跟随 → 主动招呼 → 状态分支。返回意图 `{moveTo, speedMul, flee, wantAttack}`。

## 日程

- 7 段：dawn/morning/noon/afternoon/evening/night/latenight
- 每个 NPC 有 `scheduleJitter`（±0.55h）错峰，避免全镇同刻切换
- 17 个重要 NPC 走 `NPC_SCHEDULES[def.id]`，普通路人走 `JOB_SCHEDULE`
- 场所类型：`home/work/saloon/plaza/shop/church`（`Town.places`）

## 对话

- 靠近按 `F` 对话，有耐心条（8~26s，按社交性），磨蹭对方会走
- 选项：问候/称赞（+荣誉、可能给情报）、威胁、勒索抢劫、招募
- 自由对话走 DS（`NpcChatService`），LLM 挂了退化成关键词兜底

## 两阶段伤亡（重要）

- **伏地重伤**（`wounded=true`）：侧卧+呼吸+抽动，可收服/补刀/放走
- **死亡**（`dead=true`）：俯卧+静止+压暗，只能搜尸
- 爆头（正中眉心）`deficit>=2` → 立即进重伤，`stateTimer=999` 不起身
- 轻伤倒地约 3 游戏小时（46~56 真实秒）后自己爬起来一瘸一拐
- 被救起（医生/牧师/酒保）→ 一瘸一拐走
- 过夜恢复：残血回满、重伤第二天爬起来

## 报警

被玩家殴打/撞后记恨，会跑到警长办公室报案 → 通缉上升。`reportQuota` 限制同时报案人数。

## 配置修改

改性格/血量/日程：`config/npcData.js`、`config/npcSchedules.js`；改决策逻辑：`AIBrain.js`。
