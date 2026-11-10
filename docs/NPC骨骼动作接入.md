# NPC 骨骼动作接入

2026-11-10：通过用户已登录的 Mixamo 页面下载，适配当前 Three.js 的四类 NPC（锦衣客、守卫、普通男性、女性）。不改变角色 AI、寻路、检定或对话逻辑。

## 动作清单

| 运行时片段 | Mixamo 页面名称 / 变体 | 使用场景 |
| --- | --- | --- |
| breathe | Breathing Idle | 普通 NPC 站立、倾听 |
| idle | Idle / Standing Idle | 锦衣客和守卫站立、倾听 |
| talk | Talking / General Conversation | 站着说话，肩、肘、腕一起运动 |
| question | Talking / Asking A Question With One Hand | 交谈手势变体 |
| argue | Standing Arguing | 问责、愤怒时说话 |
| walk | Walking / Walking With A Swagger | 无武器步行，按实际速度调整播放 |
| sit_idle | Sitting Idle / Sitting With Breathing Idle | 坐着倾听、休息 |
| sit_talk | Sitting Talking，页面截取前 20% | 坐着说话 |
| stand_relaxed | Standing Idle | 放松站立、交谈倾听 |
| elder_idle | Old Man Idle | 杜老捕等年长人物缓慢的重心变化 |
| idle_weightshift | Bored | 活泼人物交谈间隙的换重心变体 |
| crouch_idle | Crouching Idle / Low Crouching Idle | 主角屈膝潜行待机 |
| crouch_walk | Crouched Walking / Crouched Walk | 主角蹲行 |

导出统一采用 X BOT、FBX Binary、With Skin、30 FPS、Keyframe Reduction None。源 FBX 留在本地构建目录；游戏只加载重定向后的骨骼轨道，不加载 X BOT 网格。

## 接入与兼容

- 以源和目标的静止骨架计算旋转差，适配四种体型；去掉水平根位移，由现有寻路控制位置。
- 每个 NPC 独立播放，待机起点与语速有微小差异；切换动作混合约 0.28 秒。
- 走动优先于交谈；坐着时只在坐姿交谈和坐姿待机之间切换，避免说完话站起来。
- 实际对白与环境冒泡驱动说话状态，原有视线转头叠加在动画之上。
- 拔刀、战斗、受伤、死亡、定身、跪姿仍保留原动作控制权。日常持物已改为骨骼手部目标，不再调用旧方块人物的直臂姿势。
- 混合器只控制显示骨架，不能移动玩法根节点或重置 NPC 状态。

## 人设与克制的交谈动作

- 锦衣客、官员、守卫、刻字人：收敛站姿；杜老捕和长者：慢速换重心；商贩和茶娘：较活泼；其他角色使用平静倾听组合。
- 每次开口在对应动作池中选择，不逐帧随机；待机持续 12–21 秒后才考虑换姿态。视觉随机数独立于玩法检定。
- 日常交谈以站姿为主，手势最高混入 16% / 22% / 17% / 34%，并按人物气质决定本句是否用手势；问责仍保留明显表达。持物动作优先，不混入空手交谈。

## 主角潜行接地

- 单独加载 `hero-stealth-motion.json`，通过屈膝与胯部动画下蹲，取消新模型上的旧式整体下移。蹲行使用真实移动速度调整步频，蹲伏移动上限沿用 1.6。
- 从鞋部蒙皮顶点计算地面支撑高度；只调整显示容器，不能改变碰撞体、地图坐标或跳跃物理。采样前刷新蒙皮绑定矩阵，避免上一帧修正反复累加。
- 起身短暂保留接地校正，受击、死亡和特殊剧情动作仍可中断潜行。可选动作包缺失时退回原控制器。
- `tests/foot-grounding.test.js` 用实际角色网格与潜行轨道验证 600 帧的蹲行/停步、位移和转向；`tests/hero-motion-preview.html` 可用 Z 切换站立/蹲伏。

## 日常动作与步态修正

- 绣球候场、举球抛出、搬物、喝茶、进食、倒茶、收钱、鼓掌、吹笛、腹痛、照看：使用双骨骼手臂 IK，保留弯肘，上半身叠加于呼吸、坐姿或走路。左右手分别渐入渐出；坐下时目标随胯部高度下降。
- 绣球、杯、食物和茶壶每帧跟随真实骨骼手部；球离手后才开始飞行。未持物的围观者使用自然站姿，而非跟着主角全部伸手。
- 行走与待机连续混合；停走不重置步行相位。根据源步行动画位移与各模型胯高匹配步频，低速缩短步幅。NPC 起步缓加速，到目标附近减速，保留原有碰撞和寻路。
- 绣球场地的装饰石群移到楼侧，避免候场 NPC 下半身被石头遮住。
- `tests/npc-motion-preview.html` 对照四种骨架；`tests/npc-ribbon-preview.html` 使用真实 World 与街头演出验证持球、抛出和行走，独立临时状态，不读写玩家存档。

## 重建

1. 将对应 FBX 放到 `assets-src/animations/mixamo/`，命名与表中片段一致。
2. Blender 后台执行：
   `blender --background --factory-startup --python tools/export-mixamo.py -- assets-src/animations/mixamo assets-src/animations/samples`
3. 安装 numpy / scipy 的 Python 执行 `python tools/retarget-npc-motion.py`。
4. 运行 `node --test tests/npc-motion.test.js tests/hero-3c.test.js tests/foot-grounding.test.js`，打开两个动作预览页验证交谈、坐姿、潜行和中断切换。

来源：[Adobe Mixamo](https://www.mixamo.com/)。用途说明见 [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)；源文件不作为独立动作包对外发布。本次未使用《天国：拯救 2》的解包动画。
