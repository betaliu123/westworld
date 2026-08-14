// theaterData.js — AI 剧场：西部小镇上的预生成事件剧本树
// 内容数据与逻辑分离（与 gameData.js / storyData.js 同级）。
//
// 结构约定：
//   roles[]        选角需求：roleId + 职业偏好 + 性格倾向 + 是否必需
//   entryNode      开场节点
//   nodes[]        节点：beats（台词节拍）+ choices（恰好 3 个选项）或 terminal（终局）
//   idleLoop[]     玩家没来时反复播的"第一幕"补充节拍
//   unattendedMs   玩家一直不来，多久后自行收场
//   timeoutNode    超时/散场时跳的终局节点
//
// beats: { speaker: roleId, text, delayMs, mood?, facePlayer?, moveTo? }
//   mood: calm | angry | scared | happy —— 只影响气泡时长与情绪值
// choices: { id, label, icon, risk, next, line, effects?: { cash, honor, wanted } }
//   line   = 玩家点这个选项时头上冒的话（不是按钮文案的复读）
//   effects= 即时数值影响（可缺省 = 无影响）

// ============================================================
// 1. 正午决斗 —— 西部最经典的场面
// ============================================================
export const DUEL_TREE = {
  id: "high_noon_duel",
  title: "正午决斗",
  hintOnEnter: "两个枪手在大街中央对峙，镇民纷纷退到廊下",
  roles: [
    { roleId: "gunA", name: "汉克", required: true, jobs: ["神枪手", "牛仔", "赏金猎人"], bravery: 0.5, aggression: 0.4 },
    { roleId: "gunB", name: "疤脸乔", required: true, jobs: ["神枪手", "赌徒", "牛仔"], bravery: 0.5 },
    { roleId: "judge", name: "老崔", required: true, jobs: ["牧师", "医生", "酒保", "商人"] },
    { roleId: "crowd", name: null, required: false, jobs: [], count: 2 },
  ],
  entryNode: "st",
  unattendedMs: 75000,
  timeoutNode: "e_fair",
  idleLoop: [
    { speaker: "gunA", text: "拔枪吧，别让我等太久。", delayMs: 1200, mood: "angry" },
    { speaker: "gunB", text: "急什么，太阳还没到头顶。", delayMs: 2600 },
    { speaker: "judge", text: "各位退后！别挡了枪口！", delayMs: 2600 },
    { speaker: "crowd", text: "十块押汉克，谁跟？", delayMs: 2400 },
  ],
  nodes: [
    {
      id: "st",
      title: "开场：正午对峙",
      hint: "汉克和疤脸乔隔着二十步，手都搭在枪套上",
      beats: [
        { speaker: "judge", text: "都退到廊下去！这儿要出人命了！", delayMs: 900 },
        { speaker: "gunA", text: "疤脸乔，你在牌桌上抽了我的底牌。", delayMs: 2200, mood: "angry" },
        { speaker: "gunB", text: "牌是我的运气，命是你的赌注。", delayMs: 2400 },
        { speaker: "crowd", text: "要开枪了要开枪了！", delayMs: 2200 },
      ],
      choices: [
        { id: "d_st_1", label: "问清楚缘由", icon: "❓", risk: "low", next: "why", line: "两位，到底怎么回事？" },
        { id: "d_st_2", label: "劝他们收枪", icon: "✋", risk: "low", next: "persuade", line: "把枪收起来，命只有一条。", effects: { honor: 1 } },
        { id: "d_st_3", label: "站前排看戏", icon: "🍿", risk: "low", next: "watch", line: "我就在这儿看着。" },
      ],
    },
    {
      id: "why",
      title: "缘由：一副抽走的底牌",
      hint: "牌桌上的旧账，摆到了大街上",
      beats: [
        { speaker: "gunA", text: "昨晚在酒馆，他从袖子里摸出第五张 A。", delayMs: 900, facePlayer: true, mood: "angry" },
        { speaker: "gunB", text: "证据呢？输不起就说人出老千。", delayMs: 2400 },
        { speaker: "judge", text: "我当时在场……有些事不好说。", delayMs: 2400 },
      ],
      choices: [
        { id: "d_why_1", label: "让老崔说实话", icon: "🗣", risk: "medium", next: "truth", line: "老崔，你看见什么就说什么。", effects: { honor: 1 } },
        { id: "d_why_2", label: "检查两人的枪", icon: "🔍", risk: "medium", next: "inspect", line: "两把枪都拿来我看看。" },
        { id: "d_why_3", label: "算了，看他们打", icon: "🍿", risk: "low", next: "watch", line: "各位继续，我不掺和。" },
      ],
    },
    {
      id: "truth",
      title: "老崔的证词",
      beats: [
        { speaker: "judge", text: "……那张 A，确实是从他袖口滑出来的。", delayMs: 900 },
        { speaker: "gunB", text: "老不死的，你收了他多少钱？！", delayMs: 2500, mood: "angry" },
        { speaker: "gunA", text: "听见了吗？全镇都听见了。", delayMs: 2400 },
      ],
      choices: [
        { id: "d_tr_1", label: "让乔认赔了事", icon: "⚖️", risk: "low", next: "e_peace", line: "赔钱道歉，这事就算完了。", effects: { honor: 2 } },
        { id: "d_tr_2", label: "喊警长来处理", icon: "⭐", risk: "medium", next: "grd", line: "有人去把警长叫来！" },
        { id: "d_tr_3", label: "让他们照规矩打", icon: "⚔️", risk: "high", next: "clash", line: "那就照规矩，一人一枪。" },
      ],
    },
    {
      id: "inspect",
      title: "查枪：一把动过手脚的左轮",
      hint: "你摸到疤脸乔那把枪的击锤被磨过",
      beats: [
        { speaker: "gunB", text: "看够了没有？别碰我的家伙。", delayMs: 900, facePlayer: true, mood: "angry" },
        { speaker: "judge", text: "这击锤……被人磨过了，快得不讲道理。", delayMs: 2400 },
        { speaker: "crowd", text: "嘿！这算作弊吧！", delayMs: 2300 },
      ],
      choices: [
        { id: "d_in_1", label: "当众揭发这把枪", icon: "🚨", risk: "high", next: "e_rigged", line: "各位看清楚！这枪被人改过！", effects: { honor: 3 } },
        { id: "d_in_2", label: "悄悄提醒汉克", icon: "🤫", risk: "medium", next: "warnA", line: "汉克，他的枪不对劲，小心。", effects: { honor: 1 } },
        { id: "d_in_3", label: "闭嘴，押乔赢", icon: "💰", risk: "high", next: "bet", line: "我押疤脸乔，十块。", effects: { honor: -2 } },
      ],
    },
    {
      id: "warnA",
      title: "汉克多了个心眼",
      beats: [
        { speaker: "gunA", text: "……多谢，伙计。", delayMs: 900, facePlayer: true },
        { speaker: "gunA", text: "乔！换一把枪，用老崔那把。", delayMs: 2300 },
        { speaker: "gunB", text: "……换就换。", delayMs: 2300, mood: "angry" },
      ],
      choices: [
        { id: "d_wa_1", label: "盯着他换枪", icon: "👁", risk: "low", next: "clash", line: "我盯着，别耍花样。" },
        { id: "d_wa_2", label: "顺势劝和", icon: "🤝", risk: "low", next: "e_peace", line: "枪都换了，气也该消了吧？", effects: { honor: 2 } },
        { id: "d_wa_3", label: "退开看结果", icon: "🍿", risk: "low", next: "clash", line: "行了，你们自己解决。" },
      ],
    },
    {
      id: "bet",
      title: "你押了作弊的一方",
      beats: [
        { speaker: "crowd", text: "这位先生倒是有胆识。", delayMs: 900 },
        { speaker: "gunB", text: "识货。等我赢了分你两成。", delayMs: 2300 },
        { speaker: "judge", text: "唉……钱迷了心。", delayMs: 2300 },
      ],
      choices: [
        { id: "d_bet_1", label: "看到底谁赢", icon: "👀", risk: "medium", next: "clash", line: "开枪吧，我等着收钱。" },
        { id: "d_bet_2", label: "良心不安，揭发", icon: "🚨", risk: "medium", next: "e_rigged", line: "等等——这枪有问题！", effects: { honor: 2 } },
        { id: "d_bet_3", label: "抽走赌注离开", icon: "🚶", risk: "low", next: "watch", line: "算了，这钱我不赚。" },
      ],
    },
    {
      id: "persuade",
      title: "你上前劝架",
      hint: "两个人都不肯先松手",
      beats: [
        { speaker: "gunA", text: "他坏了牌桌的规矩，凭什么收手？", delayMs: 900, facePlayer: true, mood: "angry" },
        { speaker: "gunB", text: "怕死就直说，我给你留张全脸。", delayMs: 2400 },
        { speaker: "judge", text: "年轻人火气大，你劝不动的。", delayMs: 2400 },
      ],
      choices: [
        { id: "d_pe_1", label: "查一查两把枪", icon: "🔍", risk: "medium", next: "inspect", line: "那先让我看看你们的枪。" },
        { id: "d_pe_2", label: "提议换个法子", icon: "🃏", risk: "low", next: "cards", line: "别用枪，重打一局牌定输赢。", effects: { honor: 2 } },
        { id: "d_pe_3", label: "让开由他们打", icon: "🍿", risk: "low", next: "watch", line: "行，那我不管了。" },
      ],
    },
    {
      id: "cards",
      title: "以牌代枪",
      hint: "全镇都想看这一局",
      beats: [
        { speaker: "judge", text: "好主意！我来发牌，谁也别想动袖子。", delayMs: 900 },
        { speaker: "gunA", text: "……行。这次你敢摸袖子我就打断你的手。", delayMs: 2400 },
        { speaker: "gunB", text: "发牌吧。", delayMs: 2300 },
        { speaker: "crowd", text: "比开枪好看！", delayMs: 2200 },
      ],
      choices: [
        { id: "d_ca_1", label: "亲自监牌", icon: "👁", risk: "low", next: "e_cards", line: "我给你们看着，谁出老千我拆谁的手。", effects: { honor: 2 } },
        { id: "d_ca_2", label: "自己也下注", icon: "💰", risk: "medium", next: "e_cards", line: "算我一份，押汉克。", effects: { cash: -10 } },
        { id: "d_ca_3", label: "退到廊下看", icon: "🍿", risk: "low", next: "e_cards", line: "你们打，我看着。" },
      ],
    },
    {
      id: "watch",
      title: "第一轮：手指扣上扳机",
      hint: "太阳正到头顶，影子缩成一团",
      beats: [
        { speaker: "judge", text: "我数到三——一……二……", delayMs: 900 },
        { speaker: "gunA", text: "（手指微微发抖）", delayMs: 2300 },
        { speaker: "crowd", text: "别开枪啊！", delayMs: 2200 },
      ],
      choices: [
        { id: "d_wt_1", label: "大喊一声打断", icon: "📣", risk: "medium", next: "persuade", line: "住手！都住手！", effects: { honor: 1 } },
        { id: "d_wt_2", label: "让他们打完", icon: "👀", risk: "low", next: "clash", line: "……" },
        { id: "d_wt_3", label: "拔枪指着两人", icon: "🔫", risk: "high", next: "standoff", line: "谁先动谁先躺下。", effects: { honor: -2 } },
      ],
    },
    {
      id: "standoff",
      title: "三方僵持",
      hint: "现在三把枪互相指着",
      beats: [
        { speaker: "gunB", text: "你算哪根葱？", delayMs: 800, facePlayer: true, mood: "angry" },
        { speaker: "gunA", text: "伙计，你这是找死。", delayMs: 2200, mood: "angry" },
        { speaker: "judge", text: "疯了，全疯了……", delayMs: 2300, mood: "scared" },
      ],
      choices: [
        { id: "d_sd_1", label: "收枪讲道理", icon: "🤝", risk: "low", next: "e_peace", line: "我先收枪——大家都收枪。", effects: { honor: 2 } },
        { id: "d_sd_2", label: "逼他们各回各家", icon: "😠", risk: "high", next: "grd", line: "滚回酒馆去，都散了！", effects: { honor: -1 } },
        { id: "d_sd_3", label: "开枪打乔的帽子", icon: "🎯", risk: "high", next: "e_chaos", line: "看清楚了，我的枪也不慢。", effects: { honor: -4, wanted: 1 } },
      ],
    },
    {
      id: "clash",
      title: "枪响了",
      hint: "两声枪响几乎重叠",
      beats: [
        { speaker: "judge", text: "三！", delayMs: 800 },
        { speaker: "gunA", text: "（枪响）", delayMs: 1600, mood: "angry" },
        { speaker: "gunB", text: "呃……！", delayMs: 1800, mood: "scared" },
        { speaker: "crowd", text: "打中了！乔中弹了！", delayMs: 2200 },
      ],
      choices: [
        { id: "d_cl_1", label: "喊医生救人", icon: "🏥", risk: "low", next: "e_fair", line: "快！去把医生叫来！", effects: { honor: 3 } },
        { id: "d_cl_2", label: "上去搜乔的口袋", icon: "💰", risk: "high", next: "e_loot", line: "他也用不上这些了。", effects: { cash: 25, honor: -5 } },
        { id: "d_cl_3", label: "看汉克怎么处理", icon: "👀", risk: "low", next: "e_fair", line: "……" },
      ],
    },
    // ---- 终局 ----
    {
      id: "e_fair",
      title: "公平的胜负",
      beats: [
        { speaker: "judge", text: "胜负已分，各位散了吧。", delayMs: 900 },
        { speaker: "gunA", text: "他会活下来，医生就在街角。", delayMs: 2300 },
        { speaker: "crowd", text: "这才叫决斗。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: {
        title: "正午决斗落幕",
        lines: ["荣誉 +1 —— 你见证了一场按规矩打完的决斗"],
        honor: 1,
        rumor: "duel",
      },
    },
    {
      id: "e_peace",
      title: "枪口垂下",
      beats: [
        { speaker: "gunA", text: "……这次算了。", delayMs: 900 },
        { speaker: "gunB", text: "钱我赔。别再提袖子的事。", delayMs: 2300 },
        { speaker: "judge", text: "阿门。今天没人下葬。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: {
        title: "你劝下了一场枪战",
        lines: ["荣誉 +6 —— 镇上少了一副棺材", "汉克与疤脸乔都记住了你"],
        honor: 6,
        rumor: "kindness",
      },
    },
    {
      id: "e_cards",
      title: "以牌代枪",
      beats: [
        { speaker: "judge", text: "汉克赢了——这次是明牌赢的。", delayMs: 900 },
        { speaker: "gunB", text: "……认了。", delayMs: 2300 },
        { speaker: "crowd", text: "比开枪痛快！", delayMs: 2200 },
      ],
      terminal: true,
      outcome: {
        title: "牌桌上的决斗",
        lines: ["荣誉 +5 —— 你把子弹换成了纸牌"],
        honor: 5,
        rumor: "kindness",
      },
    },
    {
      id: "e_rigged",
      title: "作弊的枪被揭穿",
      beats: [
        { speaker: "judge", text: "这枪改过击锤！乔，你还有脸站在这儿？", delayMs: 900, mood: "angry" },
        { speaker: "gunB", text: "我……", delayMs: 2200, mood: "scared" },
        { speaker: "crowd", text: "滚出镇子！", delayMs: 2200 },
      ],
      terminal: true,
      outcome: {
        title: "揭穿作弊者",
        lines: ["荣誉 +5 —— 全镇都看见你拆穿了那把枪", "疤脸乔恨上了你"],
        honor: 5,
        rumor: "kindness",
      },
    },
    {
      id: "e_loot",
      title: "你搜了倒地者的口袋",
      beats: [
        { speaker: "crowd", text: "这人在扒尸体！", delayMs: 800, mood: "scared" },
        { speaker: "judge", text: "上帝看着呢，年轻人。", delayMs: 2200 },
        { speaker: "gunA", text: "……你比他还脏。", delayMs: 2200, mood: "angry" },
      ],
      terminal: true,
      outcome: {
        title: "扒尸者",
        lines: ["现金 +25，荣誉 -5 —— 全镇看着你翻死人的口袋", "通缉度上升"],
        honor: -5,
        cash: 25,
        wanted: 1,
        rumor: "robbery",
      },
    },
    {
      id: "grd",
      title: "警长来了",
      beats: [
        { speaker: "judge", text: "警长来了！都把枪放下！", delayMs: 800 },
        { speaker: "gunA", text: "……算你走运，乔。", delayMs: 2200 },
        { speaker: "crowd", text: "散了散了。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: {
        title: "警长驱散",
        lines: ["荣誉 +2 —— 你把事情交给了法律"],
        honor: 2,
      },
    },
    {
      id: "e_chaos",
      title: "全街乱成一锅粥",
      beats: [
        { speaker: "gunB", text: "他先开枪的！打他！", delayMs: 800, mood: "angry" },
        { speaker: "crowd", text: "快跑啊！", delayMs: 2000, mood: "scared" },
        { speaker: "judge", text: "作孽啊……", delayMs: 2200 },
      ],
      terminal: true,
      outcome: {
        title: "一场混战",
        lines: ["荣誉 -4，通缉度上升 —— 你把决斗搅成了街头混战"],
        honor: -4,
        wanted: 1,
        rumor: "robbery",
      },
    },
  ],
  // 自由输入的关键词路由（LLM 不可用时的兜底）
  glueRules: [
    { keywords: ["为什么", "怎么回事", "缘由"], node: "why" },
    { keywords: ["别打", "住手", "收枪", "劝"], node: "persuade" },
    { keywords: ["检查", "枪", "看看"], node: "inspect" },
    { keywords: ["作弊", "老千", "改过"], node: "e_rigged" },
    { keywords: ["牌", "赌", "打牌"], node: "cards" },
    { keywords: ["警长", "报官", "法律"], node: "grd" },
    { keywords: ["拔枪", "开枪", "打死"], node: "standoff" },
  ],
  glueFallbackNode: "watch",
};

// ============================================================
// 2. 酒馆歌女三角 —— 两个追求者当街争风
// ============================================================
export const TRIANGLE_TREE = {
  id: "saloon_triangle",
  title: "酒馆门口的争风",
  hintOnEnter: "两个男人堵在酒馆门口，歌女被夹在中间",
  roles: [
    { roleId: "center", name: "萝丝", required: true, jobs: ["歌女"], female: true },
    { roleId: "suitorA", name: "得州比利", required: true, jobs: ["牛仔", "淘金客", "赏金猎人"], aggression: 0.4 },
    { roleId: "suitorB", name: "赌鬼费恩", required: true, jobs: ["赌徒", "商人", "神枪手"] },
    { roleId: "confidant", name: "酒保山姆", required: true, jobs: ["酒保", "记者", "医生"] },
    { roleId: "crowd", name: null, required: false, jobs: [], count: 2 },
  ],
  entryNode: "st",
  unattendedMs: 75000,
  timeoutNode: "e_neither",
  idleLoop: [
    { speaker: "suitorA", text: "她收了我买的银项链！", delayMs: 1200, mood: "angry" },
    { speaker: "suitorB", text: "一条项链就想买一个人？", delayMs: 2600 },
    { speaker: "center", text: "你们两个都给我停下！", delayMs: 2600, mood: "angry" },
    { speaker: "confidant", text: "各位，酒馆门口别闹事……", delayMs: 2400 },
  ],
  nodes: [
    {
      id: "st",
      title: "开场：酒馆门口的争执",
      hint: "得州比利和赌鬼费恩堵着门，萝丝在中间",
      beats: [
        { speaker: "suitorA", text: "萝丝戴了我送的项链，这事全镇都知道！", delayMs: 900, mood: "angry" },
        { speaker: "suitorB", text: "戴一条项链就算许了终身？笑话。", delayMs: 2300 },
        { speaker: "center", text: "我戴什么是我的事！别在这儿吵！", delayMs: 2400, mood: "angry" },
        { speaker: "confidant", text: "两位，进屋喝一杯冷静冷静……", delayMs: 2300 },
      ],
      choices: [
        { id: "t_st_1", label: "帮比利说话", icon: "🤠", risk: "medium", next: "a1", line: "比利说得也不无道理。", effects: { honor: -1 } },
        { id: "t_st_2", label: "帮费恩说话", icon: "🃏", risk: "medium", next: "b1", line: "费恩这话我倒赞同。", effects: { honor: -1 } },
        { id: "t_st_3", label: "问萝丝自己的意思", icon: "🌹", risk: "low", next: "g1", line: "萝丝小姐，你自己怎么想？", effects: { honor: 2 } },
      ],
    },
    {
      id: "a1",
      title: "你站到比利一边",
      beats: [
        { speaker: "suitorA", text: "听见了吗？连外乡人都懂道理。", delayMs: 900, facePlayer: true },
        { speaker: "suitorB", text: "呵，又一个来凑热闹的。", delayMs: 2200, mood: "angry" },
        { speaker: "center", text: "别把外人也拖进来！", delayMs: 2300 },
      ],
      choices: [
        { id: "t_a1_1", label: "继续挺比利", icon: "💪", risk: "medium", next: "duelrisk", line: "项链就是定情，费恩你该退了。" },
        { id: "t_a1_2", label: "劝费恩放手", icon: "🤝", risk: "low", next: "persuadeB", line: "费恩，强求没有意思。", effects: { honor: 1 } },
        { id: "t_a1_3", label: "还是问萝丝", icon: "🌹", risk: "low", next: "g1", line: "等等，还是听萝丝说吧。", effects: { honor: 1 } },
      ],
    },
    {
      id: "b1",
      title: "你站到费恩一边",
      beats: [
        { speaker: "suitorB", text: "总算有个明白人。", delayMs: 900, facePlayer: true },
        { speaker: "suitorA", text: "你他妈算哪根葱？！", delayMs: 2200, mood: "angry" },
        { speaker: "center", text: "比利！嘴上留点分寸！", delayMs: 2300, mood: "angry" },
      ],
      choices: [
        { id: "t_b1_1", label: "继续挺费恩", icon: "💪", risk: "medium", next: "duelrisk", line: "人家姑娘没答应，你嚷什么？" },
        { id: "t_b1_2", label: "听酒保说内情", icon: "👂", risk: "low", next: "secret", line: "山姆，你天天在这儿，你说说。" },
        { id: "t_b1_3", label: "还是问萝丝", icon: "🌹", risk: "low", next: "g1", line: "算了，听萝丝自己说。", effects: { honor: 1 } },
      ],
    },
    {
      id: "persuadeB",
      title: "费恩的心事",
      beats: [
        { speaker: "suitorB", text: "放手？我在这镇上等了她两年。", delayMs: 900 },
        { speaker: "suitorB", text: "每晚坐第一排听她唱歌的是我。", delayMs: 2300 },
        { speaker: "confidant", text: "……这倒是真的，酒钱他从没赊过。", delayMs: 2300 },
      ],
      choices: [
        { id: "t_pb_1", label: "劝他体面收手", icon: "🥀", risk: "medium", next: "g1", line: "两年也换不来人心，体面点收手吧。", effects: { honor: 1 } },
        { id: "t_pb_2", label: "替他向萝丝说情", icon: "💌", risk: "medium", next: "g_pushB", line: "萝丝，他等了你两年，听他一句吧。", effects: { honor: 1 } },
        { id: "t_pb_3", label: "起哄让他们比枪", icon: "🔫", risk: "high", next: "duelrisk", line: "要不你们用枪解决？", effects: { honor: -3 } },
      ],
    },
    {
      id: "secret",
      title: "酒保的内情",
      hint: "山姆压低了声音",
      beats: [
        { speaker: "confidant", text: "跟你说个事……那项链是比利赌赢的赃物。", delayMs: 900, facePlayer: true },
        { speaker: "confidant", text: "原主是上礼拜被抢的马车客。", delayMs: 2300 },
        { speaker: "center", text: "山姆？你们在嘀咕什么？", delayMs: 2300 },
      ],
      choices: [
        { id: "t_se_1", label: "当众揭发项链来路", icon: "🚨", risk: "high", next: "expose", line: "各位听着！那条项链是抢来的赃物！", effects: { honor: 3 } },
        { id: "t_se_2", label: "私下告诉萝丝", icon: "🤫", risk: "medium", next: "g1", line: "萝丝，那项链的来路不干净。", effects: { honor: 2 } },
        { id: "t_se_3", label: "帮比利瞒着", icon: "🙈", risk: "high", next: "duelrisk", line: "这事我没听见。", effects: { honor: -3 } },
      ],
    },
    {
      id: "expose",
      title: "赃物被揭穿",
      beats: [
        { speaker: "center", text: "什么？！比利，你给我戴赃物？", delayMs: 900, mood: "angry" },
        { speaker: "suitorA", text: "我、我是赌赢的，不是我抢的！", delayMs: 2300, mood: "scared" },
        { speaker: "crowd", text: "上礼拜那趟马车就是他们干的吧！", delayMs: 2300 },
      ],
      choices: [
        { id: "t_ex_1", label: "把项链还给原主", icon: "🕊", risk: "low", next: "e_justice", line: "这项链得还给马车上的人。", effects: { honor: 4 } },
        { id: "t_ex_2", label: "叫警长来", icon: "⭐", risk: "medium", next: "grd", line: "去请警长，让他查清楚。", effects: { honor: 2 } },
        { id: "t_ex_3", label: "自己收下项链", icon: "💰", risk: "high", next: "e_greed", line: "赃物我先替你们保管。", effects: { cash: 20, honor: -4 } },
      ],
    },
    {
      id: "g1",
      title: "萝丝开口了",
      hint: "整条街都在等她说话",
      beats: [
        { speaker: "center", text: "我？", delayMs: 900, facePlayer: true },
        { speaker: "center", text: "你们抢来抢去，谁问过我想要什么？", delayMs: 2400, mood: "angry" },
        { speaker: "suitorA", text: "萝丝，我对你是真心的！", delayMs: 2300 },
        { speaker: "suitorB", text: "真心值几个铜板。", delayMs: 2200 },
      ],
      choices: [
        { id: "t_g1_1", label: "支持她自己做主", icon: "🌸", risk: "low", next: "g2", line: "她的事该她自己说了算。", effects: { honor: 2 } },
        { id: "t_g1_2", label: "劝她选比利", icon: "👉", risk: "medium", next: "g_pushA", line: "萝丝，比利这人其实靠得住。" },
        { id: "t_g1_3", label: "劝她选费恩", icon: "👉", risk: "medium", next: "g_pushB", line: "萝丝，费恩等了你两年。" },
      ],
    },
    {
      id: "g2",
      title: "萝丝的打算",
      hint: "她说出了真正想做的事",
      beats: [
        { speaker: "center", text: "其实……我谁都不想选。", delayMs: 900 },
        { speaker: "center", text: "我攒够钱就买张去旧金山的火车票。", delayMs: 2400 },
        { speaker: "suitorA", text: "去旧金山？那我算什么？", delayMs: 2300, mood: "angry" },
        { speaker: "confidant", text: "唱得那么好，是该去大地方。", delayMs: 2300 },
      ],
      choices: [
        { id: "t_g2_1", label: "鼓励她走", icon: "🚂", risk: "low", next: "e_leave", line: "去吧，这小镇留不住会唱歌的人。", effects: { honor: 3 } },
        { id: "t_g2_2", label: "掏钱替她买票", icon: "💵", risk: "medium", next: "e_ticket", line: "这些钱你拿着，买张头等座。", effects: { cash: -30, honor: 6 } },
        { id: "t_g2_3", label: "劝她留下", icon: "🏠", risk: "medium", next: "g3", line: "留下吧，这儿也有人真心待你。" },
      ],
    },
    {
      id: "g_pushA",
      title: "你替比利说话",
      beats: [
        { speaker: "center", text: "比利……人是不坏，可他脾气太冲。", delayMs: 900 },
        { speaker: "confidant", text: "上月他在牌桌上掀了三张桌子。", delayMs: 2300 },
        { speaker: "suitorA", text: "那是他们出老千！", delayMs: 2200, mood: "angry" },
      ],
      choices: [
        { id: "t_ga_1", label: "让他当众保证改", icon: "🤝", risk: "low", next: "e_choose_a", line: "比利，当着全街保证以后不动手。", effects: { honor: 2 } },
        { id: "t_ga_2", label: "问项链哪来的", icon: "🔍", risk: "medium", next: "secret", line: "先说清楚，那项链哪来的？" },
        { id: "t_ga_3", label: "让萝丝自己定", icon: "🌹", risk: "low", next: "g3", line: "还是你自己定吧，萝丝。" },
      ],
    },
    {
      id: "g_pushB",
      title: "你替费恩说话",
      beats: [
        { speaker: "center", text: "费恩确实对我很好……可他天天赌。", delayMs: 900 },
        { speaker: "suitorB", text: "我戒！从今晚起我不摸牌！", delayMs: 2300 },
        { speaker: "confidant", text: "这话他今年说了第四遍。", delayMs: 2300 },
      ],
      choices: [
        { id: "t_gb_1", label: "让他立誓戒赌", icon: "✋", risk: "low", next: "e_choose_b", line: "当着全街立誓，戒了就是戒了。", effects: { honor: 2 } },
        { id: "t_gb_2", label: "劝萝丝别信", icon: "🚫", risk: "medium", next: "g3", line: "萝丝，赌鬼的誓不值钱。" },
        { id: "t_gb_3", label: "让萝丝自己定", icon: "🌹", risk: "low", next: "g3", line: "你自己拿主意吧。" },
      ],
    },
    {
      id: "g3",
      title: "萝丝要做决定了",
      beats: [
        { speaker: "center", text: "……都别说了，听我说。", delayMs: 900 },
        { speaker: "suitorA", text: "萝丝……", delayMs: 2200 },
        { speaker: "suitorB", text: "……", delayMs: 2000 },
      ],
      choices: [
        { id: "t_g3_1", label: "劝她选比利", icon: "👉", risk: "medium", next: "e_choose_a", line: "我看比利是真心的。" },
        { id: "t_g3_2", label: "劝她选费恩", icon: "👉", risk: "medium", next: "e_choose_b", line: "我看费恩靠得住。" },
        { id: "t_g3_3", label: "劝她谁都别选", icon: "🕊", risk: "low", next: "e_neither", line: "要我说，谁都别选，先过自己的日子。", effects: { honor: 2 } },
      ],
    },
    {
      id: "duelrisk",
      title: "两人要拔枪了",
      hint: "手都摸到了枪套",
      beats: [
        { speaker: "suitorA", text: "那就用枪说话！", delayMs: 900, mood: "angry" },
        { speaker: "suitorB", text: "随你。", delayMs: 2200, mood: "angry" },
        { speaker: "center", text: "不要！你们疯了吗！", delayMs: 2300, mood: "scared" },
        { speaker: "confidant", text: "别在我店门口开枪啊！", delayMs: 2200, mood: "scared" },
      ],
      choices: [
        { id: "t_dr_1", label: "挡在两人中间", icon: "🛡", risk: "high", next: "e_peace", line: "谁想开枪，先打穿我。", effects: { honor: 6 } },
        { id: "t_dr_2", label: "喊警长", icon: "⭐", risk: "medium", next: "grd", line: "警长！酒馆门口要出人命了！", effects: { honor: 2 } },
        { id: "t_dr_3", label: "退开看他们打", icon: "🍿", risk: "high", next: "e_shootout", line: "……你们自己看着办。", effects: { honor: -2 } },
      ],
    },
    // ---- 终局 ----
    {
      id: "e_choose_a",
      title: "萝丝选了比利",
      beats: [
        { speaker: "center", text: "比利……我再信你一次。", delayMs: 900 },
        { speaker: "suitorA", text: "萝丝！我这辈子不再掀桌子！", delayMs: 2300, mood: "happy" },
        { speaker: "suitorB", text: "……祝你们好运。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "她选了得州比利", lines: ["荣誉 +2 —— 你促成了一段姻缘"], honor: 2, rumor: "kindness" },
    },
    {
      id: "e_choose_b",
      title: "萝丝选了费恩",
      beats: [
        { speaker: "center", text: "费恩……最后一次机会。", delayMs: 900 },
        { speaker: "suitorB", text: "牌我今晚就烧了。", delayMs: 2300, mood: "happy" },
        { speaker: "suitorA", text: "我不服……但我认。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "她选了赌鬼费恩", lines: ["荣誉 +2 —— 你促成了一段姻缘"], honor: 2, rumor: "kindness" },
    },
    {
      id: "e_neither",
      title: "她谁都没选",
      beats: [
        { speaker: "center", text: "对不起，你们两个我都不选。", delayMs: 900 },
        { speaker: "center", text: "我要先弄清楚自己想过什么日子。", delayMs: 2400 },
        { speaker: "confidant", text: "散了吧，各位。喝一杯去。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "她拒绝了两个人", lines: ["荣誉 +4 —— 你尊重了她自己的选择"], honor: 4, rumor: "kindness" },
    },
    {
      id: "e_leave",
      title: "她要去旧金山",
      beats: [
        { speaker: "center", text: "我攒够钱就走，去大剧院唱歌。", delayMs: 900, mood: "happy" },
        { speaker: "suitorA", text: "那……那我等你回来。", delayMs: 2300 },
        { speaker: "confidant", text: "去吧丫头，这镇子太小了。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "她要去旧金山", lines: ["荣誉 +3 —— 你支持她去更大的舞台"], honor: 3, rumor: "kindness" },
    },
    {
      id: "e_ticket",
      title: "你替她买了车票",
      beats: [
        { speaker: "center", text: "你……这钱我不能收。", delayMs: 900 },
        { speaker: "center", text: "……谢谢你。我会在旧金山唱给你听。", delayMs: 2400, mood: "happy" },
        { speaker: "crowd", text: "好人呐！", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "一张去旧金山的车票", lines: ["现金 -30，荣誉 +6 —— 全镇都记住了你的慷慨"], honor: 6, cash: -30, rumor: "kindness" },
    },
    {
      id: "e_justice",
      title: "赃物归还",
      beats: [
        { speaker: "confidant", text: "我认得那家人，我去送还。", delayMs: 900 },
        { speaker: "suitorA", text: "……我不该拿那东西。", delayMs: 2300 },
        { speaker: "center", text: "这才像个人样。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "赃物归还原主", lines: ["荣誉 +4 —— 你替被抢的马车客要回了东西"], honor: 4, rumor: "kindness" },
    },
    {
      id: "e_greed",
      title: "你把项链收进了口袋",
      beats: [
        { speaker: "center", text: "你和他们一样。", delayMs: 900, mood: "angry" },
        { speaker: "confidant", text: "这位先生，请你出去。", delayMs: 2300 },
        { speaker: "crowd", text: "又是一个见钱眼开的。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "顺手牵羊", lines: ["现金 +20，荣誉 -4 —— 你把赃物收进了自己口袋"], honor: -4, cash: 20, wanted: 1, rumor: "robbery" },
    },
    {
      id: "e_peace",
      title: "你挡下了这场枪战",
      beats: [
        { speaker: "suitorA", text: "……你他妈真不怕死。", delayMs: 900 },
        { speaker: "suitorB", text: "算了。为个项链丢命不值。", delayMs: 2300 },
        { speaker: "center", text: "谢谢你……真的。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "枪口垂下", lines: ["荣誉 +6 —— 你用身子挡下了两颗子弹"], honor: 6, rumor: "kindness" },
    },
    {
      id: "e_shootout",
      title: "酒馆门口的枪声",
      beats: [
        { speaker: "suitorA", text: "（枪响）", delayMs: 800, mood: "angry" },
        { speaker: "center", text: "不——！", delayMs: 1800, mood: "scared" },
        { speaker: "crowd", text: "快叫医生！叫警长！", delayMs: 2200, mood: "scared" },
      ],
      terminal: true,
      outcome: { title: "见死不救", lines: ["荣誉 -3 —— 你站在旁边看完了整场枪战"], honor: -3, rumor: "robbery" },
    },
    {
      id: "grd",
      title: "警长驱散",
      beats: [
        { speaker: "confidant", text: "警长来了！都散了！", delayMs: 800 },
        { speaker: "suitorA", text: "……下次再说。", delayMs: 2200 },
        { speaker: "center", text: "唉……", delayMs: 2000 },
      ],
      terminal: true,
      outcome: { title: "警长驱散", lines: ["荣誉 +2 —— 你把事情交给了法律"], honor: 2 },
    },
  ],
  glueRules: [
    { keywords: ["她", "萝丝", "姑娘", "自己"], node: "g1" },
    { keywords: ["比利", "帮他"], node: "a1" },
    { keywords: ["费恩", "赌鬼"], node: "b1" },
    { keywords: ["项链", "哪来", "赃"], node: "secret" },
    { keywords: ["别打", "住手", "冷静"], node: "duelrisk" },
    { keywords: ["警长", "报官"], node: "grd" },
    { keywords: ["火车", "旧金山", "走"], node: "g2" },
  ],
  glueFallbackNode: "g1",
};

// ============================================================
// 3. 扒手行窃 —— 街角的小案子
// ============================================================
export const THIEF_TREE = {
  id: "street_pickpocket",
  title: "街角扒手",
  hintOnEnter: "一只手正伸向货商的钱袋",
  roles: [
    { roleId: "thief", name: "瘦子威利", required: true, jobs: ["旅人", "淘金客", "赌徒", "马夫"], greed: 0.4 },
    { roleId: "victim", name: "货商麦克", required: true, jobs: ["商人", "淘金客", "记者"], wealth: 0.4 },
    { roleId: "witness", name: "老玛莎", required: true, jobs: ["牧师", "医生", "记者", "酒保"] },
    { roleId: "crowd", name: null, required: false, jobs: [], count: 1 },
  ],
  entryNode: "st",
  unattendedMs: 65000,
  timeoutNode: "e_escape",
  idleLoop: [
    { speaker: "victim", text: "这趟货卖得不错，够过冬了。", delayMs: 1200 },
    { speaker: "thief", text: "（悄悄贴近）", delayMs: 2400 },
    { speaker: "witness", text: "哎……那个瘦子的手……", delayMs: 2600 },
  ],
  nodes: [
    {
      id: "st",
      title: "开场：那只手伸过去了",
      hint: "瘦子威利的手已经摸到麦克的钱袋",
      beats: [
        { speaker: "victim", text: "运气不错，这趟皮货全卖光了。", delayMs: 900 },
        { speaker: "thief", text: "（贴上去）", delayMs: 2200 },
        { speaker: "witness", text: "哎呀……那手……", delayMs: 2300 },
        { speaker: "crowd", text: "怎么了玛莎婶？", delayMs: 2200 },
      ],
      choices: [
        { id: "p_st_1", label: "提醒货商", icon: "⚠️", risk: "low", next: "warn", line: "麦克！当心你的钱袋！", effects: { honor: 2 } },
        { id: "p_st_2", label: "盯住那个瘦子", icon: "👁", risk: "low", next: "stare", line: "我盯上你了，小子。" },
        { id: "p_st_3", label: "假装没看见", icon: "🙈", risk: "medium", next: "ignore", line: "……我什么都没看见。", effects: { honor: -1 } },
      ],
    },
    {
      id: "warn",
      title: "你喊破了这一手",
      beats: [
        { speaker: "victim", text: "我的钱袋！这瘦子偷我钱袋！", delayMs: 900, mood: "angry" },
        { speaker: "thief", text: "（转身就跑）", delayMs: 2100, mood: "scared" },
        { speaker: "witness", text: "就是他！往马棚那边跑了！", delayMs: 2300 },
      ],
      choices: [
        { id: "p_wa_1", label: "拦住他", icon: "🛑", risk: "medium", next: "block", line: "站住！", effects: { honor: 1 } },
        { id: "p_wa_2", label: "指出他跑的方向", icon: "👉", risk: "low", next: "block", line: "他往马棚跑了！", effects: { honor: 1 } },
        { id: "p_wa_3", label: "帮他打掩护", icon: "🤫", risk: "high", next: "cover", line: "他往河边去了——（指反方向）", effects: { honor: -3 } },
      ],
    },
    {
      id: "stare",
      title: "他察觉了你的目光",
      beats: [
        { speaker: "thief", text: "（僵住，又慢慢缩回手）", delayMs: 900, facePlayer: true, mood: "scared" },
        { speaker: "thief", text: "看什么看？", delayMs: 2200 },
        { speaker: "victim", text: "嗯？出什么事了？", delayMs: 2200 },
      ],
      choices: [
        { id: "p_sr_1", label: "当场揭穿他", icon: "📣", risk: "medium", next: "block", line: "这小子刚才在摸你的钱袋。", effects: { honor: 2 } },
        { id: "p_sr_2", label: "私下警告他滚", icon: "😠", risk: "low", next: "e_scared_off", line: "滚远点，别让我再看见你。" },
        { id: "p_sr_3", label: "跟上去看看", icon: "🚶", risk: "medium", next: "follow", line: "我跟着你看看你要干什么。" },
      ],
    },
    {
      id: "ignore",
      title: "你什么都没说",
      beats: [
        { speaker: "thief", text: "（钱袋到手，转身混进人群）", delayMs: 900 },
        { speaker: "victim", text: "咦……我的钱袋呢？我的钱袋呢！", delayMs: 2300, mood: "angry" },
        { speaker: "witness", text: "刚才那个瘦子！我看见了！", delayMs: 2300 },
      ],
      choices: [
        { id: "p_ig_1", label: "现在追还来得及", icon: "🏃", risk: "medium", next: "follow", line: "我去追！" },
        { id: "p_ig_2", label: "安慰货商", icon: "🤝", risk: "low", next: "comfort", line: "麦克，别急，我帮你想办法。", effects: { honor: 1 } },
        { id: "p_ig_3", label: "转身走开", icon: "🚶", risk: "low", next: "e_escape", line: "不关我的事。", effects: { honor: -2 } },
      ],
    },
    {
      id: "follow",
      title: "巷口：他在数钱",
      hint: "威利蹲在马棚后面数那袋钱",
      beats: [
        { speaker: "thief", text: "十七块……够买药了……", delayMs: 900 },
        { speaker: "thief", text: "谁？！", delayMs: 2200, mood: "scared", facePlayer: true },
      ],
      choices: [
        { id: "p_fo_1", label: "当场拿下他", icon: "🛑", risk: "medium", next: "confront", line: "钱袋交出来。", effects: { honor: 1 } },
        { id: "p_fo_2", label: "问他要钱干什么", icon: "💬", risk: "low", next: "why", line: "买什么药？说清楚。" },
        { id: "p_fo_3", label: "抢过来自己拿", icon: "🗡", risk: "high", next: "e_dark", line: "这袋钱现在归我了。", effects: { cash: 17, honor: -5 } },
      ],
    },
    {
      id: "block",
      title: "你拦住了他",
      beats: [
        { speaker: "thief", text: "放开我！我什么都没干！", delayMs: 900, mood: "scared", facePlayer: true },
        { speaker: "victim", text: "搜他！钱袋一定在他身上！", delayMs: 2300, mood: "angry" },
        { speaker: "witness", text: "我看得清清楚楚，就是他。", delayMs: 2300 },
      ],
      choices: [
        { id: "p_bl_1", label: "搜他的身", icon: "🔍", risk: "medium", next: "confront", line: "把口袋翻出来。" },
        { id: "p_bl_2", label: "让他自己交出来", icon: "🤝", risk: "low", next: "why", line: "自己拿出来，别逼我动手。" },
        { id: "p_bl_3", label: "先揍一顿再说", icon: "👊", risk: "high", next: "e_brutal", line: "先让你记住疼。", effects: { honor: -4 } },
      ],
    },
    {
      id: "confront",
      title: "钱袋掉了出来",
      beats: [
        { speaker: "thief", text: "……是我拿的。", delayMs: 900, mood: "scared" },
        { speaker: "victim", text: "我的钱！一分不少！", delayMs: 2200 },
        { speaker: "crowd", text: "人赃并获！送警长那儿去！", delayMs: 2200 },
      ],
      choices: [
        { id: "p_co_1", label: "物归原主", icon: "💵", risk: "low", next: "e_hero", line: "麦克，你的钱袋。", effects: { honor: 4 } },
        { id: "p_co_2", label: "先听他的理由", icon: "👂", risk: "low", next: "why", line: "等等，让他把话说完。", effects: { honor: 1 } },
        { id: "p_co_3", label: "送去警长办公室", icon: "⭐", risk: "medium", next: "grd", line: "走，去见警长。", effects: { honor: 2 } },
      ],
    },
    {
      id: "why",
      title: "威利的理由",
      hint: "他一屁股坐在地上",
      beats: [
        { speaker: "thief", text: "我娘咳血三个月了。", delayMs: 900 },
        { speaker: "thief", text: "医生说一副药要十五块，我哪来十五块……", delayMs: 2400 },
        { speaker: "victim", text: "这……", delayMs: 2200 },
        { speaker: "witness", text: "他娘我认得，住在镇尾那间破屋。", delayMs: 2300 },
      ],
      choices: [
        { id: "p_wh_1", label: "替他付药钱", icon: "💵", risk: "medium", next: "e_kind", line: "钱袋还麦克，药钱我出。", effects: { cash: -15, honor: 6 } },
        { id: "p_wh_2", label: "还钱可以，人得罚", icon: "⚖️", risk: "low", next: "e_peaceful", line: "钱还了，你去麦克铺子干一个月工。", effects: { honor: 3 } },
        { id: "p_wh_3", label: "苦衷不是理由，送官", icon: "⭐", risk: "medium", next: "grd", line: "情有可原，法不容情。走。", effects: { honor: 1 } },
      ],
    },
    {
      id: "comfort",
      title: "你安慰货商",
      beats: [
        { speaker: "victim", text: "那是我全年的进货钱啊……", delayMs: 900 },
        { speaker: "witness", text: "去找警长吧，登个案。", delayMs: 2300 },
      ],
      choices: [
        { id: "p_cf_1", label: "陪他去报案", icon: "⭐", risk: "low", next: "grd", line: "走，我陪你去警长那儿。", effects: { honor: 2 } },
        { id: "p_cf_2", label: "自己去追赃", icon: "🏃", risk: "medium", next: "follow", line: "我去把钱追回来。" },
        { id: "p_cf_3", label: "掏点钱接济他", icon: "💵", risk: "low", next: "e_kind", line: "这些钱你先拿着周转。", effects: { cash: -10, honor: 4 } },
      ],
    },
    {
      id: "cover",
      title: "你指了个反方向",
      beats: [
        { speaker: "victim", text: "河边？往河边追！", delayMs: 900 },
        { speaker: "witness", text: "不对啊……我明明看见他往马棚去了。", delayMs: 2300 },
        { speaker: "thief", text: "（远远朝你点了下头）", delayMs: 2300 },
      ],
      choices: [
        { id: "p_cv_1", label: "继续搅混水", icon: "🌀", risk: "high", next: "e_cover", line: "我看得很清楚，就是河边。", effects: { honor: -3 } },
        { id: "p_cv_2", label: "改口指对方向", icon: "👉", risk: "medium", next: "block", line: "等等——是马棚那边！", effects: { honor: 1 } },
        { id: "p_cv_3", label: "事后去找威利分钱", icon: "💰", risk: "high", next: "e_dark", line: "回头马棚见，分我一半。", effects: { cash: 8, honor: -4 } },
      ],
    },
    // ---- 终局 ----
    {
      id: "e_hero",
      title: "钱袋归还",
      beats: [
        { speaker: "victim", text: "多谢你！这年我算过得去了。", delayMs: 900, mood: "happy" },
        { speaker: "thief", text: "……我认罚。", delayMs: 2200 },
        { speaker: "witness", text: "好后生。", delayMs: 2100 },
      ],
      terminal: true,
      outcome: { title: "追回钱袋", lines: ["荣誉 +5 —— 你替货商追回了全年的本钱"], honor: 5, rumor: "kindness" },
    },
    {
      id: "e_peaceful",
      title: "以工抵罪",
      beats: [
        { speaker: "thief", text: "我干！扫地搬货我都干。", delayMs: 900 },
        { speaker: "victim", text: "唉……成，就一个月。", delayMs: 2300 },
        { speaker: "witness", text: "阿门，这才叫处置。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "以工抵罪", lines: ["荣誉 +4 —— 你给了小偷一条活路"], honor: 4, rumor: "kindness" },
    },
    {
      id: "e_kind",
      title: "你替他掏了药钱",
      beats: [
        { speaker: "thief", text: "先生……这恩情我一辈子记着。", delayMs: 900, mood: "happy" },
        { speaker: "victim", text: "这位先生，你倒是个大善人。", delayMs: 2300 },
        { speaker: "witness", text: "上帝看着呢。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "药钱", lines: ["现金 -15，荣誉 +6 —— 全镇都传你替人付了药钱"], honor: 6, cash: -15, rumor: "kindness" },
    },
    {
      id: "e_escape",
      title: "扒手混进了人群",
      beats: [
        { speaker: "victim", text: "我的钱……我的钱啊……", delayMs: 900 },
        { speaker: "witness", text: "作孽。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "扒手逃脱", lines: ["荣誉 -1 —— 你在场却没拦住"], honor: -1 },
    },
    {
      id: "e_scared_off",
      title: "你把他吓走了",
      beats: [
        { speaker: "thief", text: "……得罪了，我走。", delayMs: 900, mood: "scared" },
        { speaker: "victim", text: "刚才那小子怎么了？", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "未遂的窃案", lines: ["荣誉 +2 —— 一桩案子还没发生就被你掐掉了"], honor: 2 },
    },
    {
      id: "e_dark",
      title: "黑吃黑",
      beats: [
        { speaker: "thief", text: "你、你比我还狠……", delayMs: 900, mood: "scared" },
        { speaker: "witness", text: "又是一个贼！", delayMs: 2200, mood: "angry" },
        { speaker: "victim", text: "拦住他！钱在他手上！", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "黑吃黑", lines: ["现金 +17，荣誉 -5，通缉度上升"], honor: -5, cash: 17, wanted: 1, rumor: "robbery" },
    },
    {
      id: "e_cover",
      title: "包庇",
      beats: [
        { speaker: "victim", text: "河边什么都没有！你耍我？", delayMs: 900, mood: "angry" },
        { speaker: "witness", text: "这位先生的话……我不敢信了。", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "包庇窃贼", lines: ["荣誉 -3 —— 镇上开始有人不信你的话"], honor: -3 },
    },
    {
      id: "e_brutal",
      title: "你打得太狠了",
      beats: [
        { speaker: "thief", text: "别打了……别打了……", delayMs: 900, mood: "scared" },
        { speaker: "witness", text: "住手！人都要被你打死了！", delayMs: 2200, mood: "scared" },
        { speaker: "victim", text: "钱我不要了，你快停手吧……", delayMs: 2300 },
      ],
      terminal: true,
      outcome: { title: "打成了血案", lines: ["荣誉 -6，通缉度上升 —— 全街看见你把一个瘦子打倒在地"], honor: -6, wanted: 2, rumor: "robbery" },
    },
    {
      id: "grd",
      title: "警长带走了他",
      beats: [
        { speaker: "witness", text: "警长来了。", delayMs: 800 },
        { speaker: "thief", text: "……我娘怎么办……", delayMs: 2200 },
        { speaker: "victim", text: "多谢各位。", delayMs: 2200 },
      ],
      terminal: true,
      outcome: { title: "交给法律", lines: ["荣誉 +3 —— 案子进了警长办公室"], honor: 3 },
    },
  ],
  glueRules: [
    { keywords: ["提醒", "当心", "小心", "钱袋"], node: "warn" },
    { keywords: ["拦", "站住", "抓"], node: "block" },
    { keywords: ["追", "跟"], node: "follow" },
    { keywords: ["搜"], node: "confront" },
    { keywords: ["为什么", "为何", "药"], node: "why" },
    { keywords: ["放他", "算了", "饶"], node: "e_scared_off" },
    { keywords: ["警长", "报官"], node: "grd" },
    { keywords: ["打", "揍"], node: "e_brutal" },
    { keywords: ["给我", "分钱", "自己拿"], node: "e_dark" },
  ],
  glueFallbackNode: "warn",
};

// ============================================================
// 全部剧本 + 调度配置
// ============================================================
// 追加事件（由 deepseek-v4-pro 生成后经结构校验入库，见 theaterEvents.js）
// 第一天固定演三角恋（冲击感最强），之后从全部剧本里随机。
import { GENERATED_TREES } from "./theaterEvents.js";
import { THEATER_EXTRAS } from "./theaterExtras.js";
import { STORY_TREES } from "./theaterStoryTrees.js";

// 个人连续小剧场 + 势力小剧场（独立列表，不走每日随机池 —— 那需要全套 reactions/
// aftermath 校验；这些树由故事投递 / 调试面板手动触发）
export const STORY_TREE_LIST = Object.values(STORY_TREES);

export const THEATER_TREES = [DUEL_TREE, TRIANGLE_TREE, THIEF_TREE, ...GENERATED_TREES];

// 把补充内容合并进手写的那 3 棵树：reactions 挂到树上，aftermath 挂到对应终局的 outcome 上。
// 生成的树本身自带这两样，所以只有在 THEATER_EXTRAS 里出现的才需要合并。
for (const [treeId, extra] of Object.entries(THEATER_EXTRAS)) {
  const tree = THEATER_TREES.find((t) => t.id === treeId);
  if (!tree) continue;
  if (extra.reactions && !tree.reactions) tree.reactions = extra.reactions;
  for (const [nodeId, af] of Object.entries(extra.aftermath || {})) {
    const node = tree.nodes.find((n) => n.id === nodeId);
    if (node?.outcome && !node.outcome.aftermath) node.outcome.aftermath = af;
  }
}

export const THEATER_CONFIG = {
  // 时间尺度：游戏一天 = 400 真实秒 ⇒ 1 游戏小时 ≈ 16.7 真实秒。
  realSecondsPerDay: 400,
  // 每天在这个游戏时段内自动开演一次（游戏内小时，0-24）。
  // 注意：这只决定"什么时候开演"，不决定"什么时候结束"——
  // 结束一律以开演时刻起算（见 maxDurationHours），所以任何钟点手动开演都能完整演完。
  windowStart: 9,
  windowEnd: 12,
  // 一场戏的总时长上限（游戏小时）。超了就收场，不看绝对钟点。
  // 24 游戏小时 ≈ 400 真实秒，够走完 5-6 幕还有余量。
  maxDurationHours: 24,
  // 玩家围观但一直不选时，一幕最多演这么久就自己往下走（走末位"旁观"选项）
  actMaxGameHours: 4,
  // 舞台：镇中心大街（主街 x∈[-8,8] 是保证无杂物的走廊）
  stage: { x: 0, z: 0 },
  stageRadius: 4.6,        // 演员围成的圈半径
  senseRadius: 26,         // 感知区：显示"那边起了热闹"
  interactRadius: 16,      // 交互区：显示事件选项
  actorArriveTimeout: 20,  // 演员就位超时（真实秒）：走到舞台通常几秒，20s 足够
  beatJitterMs: 900,       // 节拍随机抖动，避免所有人同时开口
  maxBubbleChars: 30,
};
