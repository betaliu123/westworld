// npcData.js — 12 名重要 NPC 定义。每名 NPC 的持久档案（性格、需求、目标、秘密、能力、日程）。

export const IMPORTANT_NPCS = [
  // ============================================================
  // 1. 艾琳·沃德 — 年轻账房
  // ============================================================
  {
    id: "npc_erin",
    displayName: "艾琳·沃德",
    role: "bookkeeper",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "saloon",
    homeId: "ward_home",
    job: "会计",
    female: true,
    traits: {
      bravery: 0.42,
      aggression: 0.18,
      greed: 0.56,
      sociability: 0.71,
      loyalty: 0.48,
      ambition: 0.64,
      empathy: 0.72,
    },
    needs: {
      money: 65,
      safety: 80,
      belonging: 55,
      status: 35,
      revenge: 0,
    },
    goals: [
      { type: "family", desc: "为病重父亲和负债家庭筹钱", urgency: 80 },
      { type: "security", desc: "让家人摆脱债务", urgency: 70 },
    ],
    secrets: [
      { id: "secret_brother_eli", desc: "哥哥伊莱曾替黑蹄会做事", knownBy: [], revealed: false },
      { id: "secret_casino_books", desc: "知道赌场账目漏洞", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "黑蹄会赌场每月洗钱数额", confidence: 0.85 },
      { fact: "账本漏洞可让赌场一周内破产", confidence: 0.7 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "saloon", noon: "shop", evening: "saloon", night: "home" },
    storyTags: ["young", "financial_pressure", "family_of_protege"],
    abilities: ["驻地财务", "降低经营损耗", "发现账目异常"],
    description: "聪明、体贴、缺乏安全感、擅长隐藏真实压力。偶尔替酒馆和商人记账。",
    backstory: "账簿上的数字从未骗过她，但生活会。二十四岁的艾琳·沃德坐在黑蹄会赌场后屋的油灯下，手指翻过一页页泛潮的纸，心里记下的不是赌场的流水，而是漏洞——那个被所有人忽略的账目缺口，恰好够她填补家里的窟窿。父亲的咳血声从镇东破屋里传来，债务像秃鹫一样盘旋不去。伊莱失踪后，她学会用微笑裹紧恐惧，把失眠和焦虑锁在算盘珠碰撞的脆响里。她体贴地替每一个人点灯、递茶，却没人知道那双眼睛每晚盯着漏洞，在道德与绝望间反复演算。",
  },

  // ============================================================
  // 2. 杰克·莫罗 — 失意枪手
  // ============================================================
  {
    id: "npc_jack",
    displayName: "杰克·莫罗",
    role: "gunman",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "saloon",
    homeId: "morrow_cabin",
    job: "枪手",
    female: false,
    traits: {
      bravery: 0.82,
      aggression: 0.65,
      greed: 0.35,
      sociability: 0.4,
      loyalty: 0.75,
      ambition: 0.55,
      empathy: 0.45,
    },
    needs: {
      money: 45,
      safety: 30,
      belonging: 70,
      status: 75,
      revenge: 15,
    },
    goals: [
      { type: "honor", desc: "重新证明自己不是失败者", urgency: 85 },
      { type: "redemption", desc: "偿还赌场债务", urgency: 60 },
    ],
    secrets: [
      { id: "secret_killed_comrade", desc: "曾在一次火并中误杀同伴", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "南街哪个角落适合伏击", confidence: 0.9 },
      { fact: "镇上神枪手名单", confidence: 0.8 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "plaza", noon: "saloon", evening: "saloon", night: "home" },
    storyTags: ["debt", "loyal", "veteran"],
    abilities: ["战斗", "护送", "训练新人"],
    description: "勇敢、自尊高、冲动、重承诺。曾在火并中误杀同伴，背上心魔。",
    backstory: "杰克·莫罗总爱把帽檐压得低低的，遮住左眼旁那道疤。三十五岁了，他枪里的子弹比说过的誓言更快。曾经在黑水镇的火并中，他慌乱中错杀了搭档比利，那声枪响至今还在梦里追着他。自尊让他不肯向任何人低头，却偏偏在赌场里把最后一点家当输了个精光。他欠下的债就像一匹甩不掉的饿狼，紧紧跟着他穿过新奥斯汀的每一片荒漠。现在他只想找个机会，哪怕是最危险的押送活，也要证明自己不是个彻头彻尾的失败者——可每次握枪，手心还是会渗出冷汗。",
  },

  // ============================================================
  // 3. 玛莎·贝尔 — 医生
  // ============================================================
  {
    id: "npc_martha",
    displayName: "玛莎·贝尔",
    role: "doctor",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "clinic",
    homeId: "bell_clinic",
    job: "医生",
    female: true,
    traits: {
      bravery: 0.55,
      aggression: 0.15,
      greed: 0.25,
      sociability: 0.5,
      loyalty: 0.8,
      ambition: 0.35,
      empathy: 0.92,
    },
    needs: {
      money: 30,
      safety: 60,
      belonging: 50,
      status: 25,
      revenge: 0,
    },
    goals: [
      { type: "principles", desc: "让诊所保持中立并获取药品", urgency: 55 },
      { type: "ethics", desc: "减少镇上无意义的暴力", urgency: 70 },
    ],
    secrets: [
      { id: "secret_faked_death", desc: "曾伪造死亡记录保护通缉犯", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "镇上所有枪伤患者的身份", confidence: 0.95 },
      { fact: "秘密救治过的通缉犯信息", confidence: 0.9 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "work", noon: "work", evening: "work", night: "home" },
    storyTags: ["neutral", "healer", "principled"],
    abilities: ["治疗成员", "降低死亡概率", "提供验尸信息"],
    description: "克制、原则强、厌恶无意义暴力。招募门槛：玩家必须证明能约束帮派滥杀。",
    backstory: "玛莎·贝尔用酒精棉擦去昨夜又一个枪伤患者的血迹时，窗外刚好传来第四声枪响。这个镇子每天都在流血，而她手中的针线永远追不上子弹的速度。她的诊所不收帮派徽章，只看脉搏——这是她在西部荒野里给自己定的唯一规矩。可惜规矩挡不住秘密，半年前她伪造了一具「尸体」的死亡记录，帮一个通缉犯逃出了镇子。从那以后，诊所柜子里压着的那摞通缉令就像蜡烛，日夜炙烤着她的良心。每当警长来取子弹头作证物，她都面不改色地递上消毒纱布，心跳却比河畔洗衣妇的棒槌还重。她清楚，一旦黑蹄会知道诊所里藏过什么人，下一个躺在手术台上的可能就是她自己。",
  },

  // ============================================================
  // 4. 诺亚·芬奇 — 记者
  // ============================================================
  {
    id: "npc_noah",
    displayName: "诺亚·芬奇",
    role: "journalist",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "gazette",
    homeId: "finch_apt",
    job: "记者",
    female: false,
    traits: {
      bravery: 0.38,
      aggression: 0.12,
      greed: 0.55,
      sociability: 0.8,
      loyalty: 0.25,
      ambition: 0.72,
      empathy: 0.5,
    },
    needs: {
      money: 40,
      safety: 45,
      belonging: 40,
      status: 60,
      revenge: 0,
    },
    goals: [
      { type: "career", desc: "写出改变小镇的大新闻", urgency: 75 },
    ],
    secrets: [
      { id: "secret_bribed", desc: "收过黑蹄会的钱压下一篇报道", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "报社档案里所有未发表的爆料", confidence: 0.9 },
      { fact: "谁在操纵本地舆论", confidence: 0.7 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "plaza", noon: "shop", evening: "saloon", night: "home" },
    storyTags: ["journalist", "curious", "compromised"],
    abilities: ["改变公众叙事", "发布调查", "制造舆论压力"],
    description: "好奇、虚荣、胆量一般。收过黑蹄会的封口费，但内心仍有良知。",
    backstory: "诺亚·芬奇的报馆里堆着三年没发表的手稿，每一页都是小镇烂掉的秘密。他本可以从这些秘密里发财——事实上已经发过一次了，黑蹄会塞给他的信封至今还压在编辑部抽屉最底层，烫得像烙铁。但他更想知道的是，如果把这些秘密全部印成铅字，他会不会从此不用再对任何人低头。每天清晨他在广场上记录交易、偷听争吵，傍晚在酒馆里用一杯威士忌换三句真话。他的钢笔帽已经咬得秃噜了，但关于塞拉斯赌场洗钱的追踪报道始终压在抽屉底层——紧挨着那个信封。",
  },

  // ============================================================
  // 5. 塞拉斯·克劳 — 黑蹄会头目
  // ============================================================
  {
    id: "npc_silas",
    displayName: "塞拉斯·克劳",
    role: "boss",
    factionId: "black_hoof",
    factionRank: 5,
    alive: true,
    healthState: "healthy",
    locationId: "casino",
    homeId: "crow_manor",
    job: "帮派头目",
    female: false,
    traits: {
      bravery: 0.85,
      aggression: 0.7,
      greed: 0.8,
      sociability: 0.65,
      loyalty: 0.1,
      ambition: 0.9,
      empathy: 0.15,
    },
    needs: {
      money: 20,
      safety: 40,
      belonging: 15,
      status: 85,
      revenge: 30,
    },
    goals: [
      { type: "power", desc: "在十日内彻底控制银行与矿场", urgency: 90 },
    ],
    secrets: [
      { id: "secret_money_laundering", desc: "资金链依赖赌场洗钱", knownBy: [], revealed: false },
      { id: "secret_illegitimate_son", desc: "有一个未公开承认的私生子", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "小镇地下钱庄的所有网络", confidence: 0.95 },
      { fact: "私生子的下落", confidence: 0.9 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "home", noon: "saloon", evening: "saloon", night: "saloon" },
    storyTags: ["boss", "ruthless", "calculating"],
    abilities: ["收买", "威胁", "地盘反击", "制造合法外观"],
    description: "冷静、控制欲强、善于让别人欠债。不信任副手，一旦感到威胁会先发制人。",
    backstory: "塞拉斯·克劳从不亲手杀人——至少不在白天。他用赌场里每一张牌桌铺开蛛网，用南街的每一间店铺收线。十年前他不过是镇上的一个马贩，如今黑蹄会的马蹄声能让银行行长从椅子上弹起来。世人以为他靠的是枪，其实他靠的是账：一笔一笔写在破皮本上的欠款、人情、软肋。他清楚地记得维克托的野心比副手的职位大三倍，也记得罗莎背着他炒股的每一笔流水。但他不动声色——织网的人从不急着收线，他要等猎物把最致命的弱点自己暴露出来。唯一的破绽，是私生子那双和他一模一样的灰色眼睛。",
  },

  // ============================================================
  // 6. 维克托·黑尔 — 黑蹄会副手
  // ============================================================
  {
    id: "npc_victor",
    displayName: "维克托·黑尔",
    role: "lieutenant",
    factionId: "black_hoof",
    factionRank: 4,
    alive: true,
    healthState: "healthy",
    locationId: "south_street",
    homeId: "hale_house",
    job: "帮派二把手",
    female: false,
    traits: {
      bravery: 0.75,
      aggression: 0.6,
      greed: 0.7,
      sociability: 0.55,
      loyalty: 0.3,
      ambition: 0.85,
      empathy: 0.35,
    },
    needs: {
      money: 35,
      safety: 50,
      belonging: 20,
      status: 75,
      revenge: 20,
    },
    goals: [
      { type: "power", desc: "取代塞拉斯，但不愿接手废墟", urgency: 80 },
    ],
    secrets: [
      { id: "secret_protection_list", desc: "保存了一份保护费名单", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "黑蹄会所有保护费的收取记录", confidence: 0.95 },
      { fact: "塞拉斯最担心什么", confidence: 0.8 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "plaza", noon: "saloon", evening: "saloon", night: "home" },
    storyTags: ["lieutenant", "ambitious", "pragmatic", "rival_faction"],
    abilities: ["策反后可带走部分人手", "提供敌方内部信息"],
    description: "务实、有野心、尊重实力。玩家太弱时根本见不到他。招募门槛：影响力≥35。",
    backstory: "维克托·黑尔十四岁起就在塞拉斯手下跑腿，二十年来他学会的唯一真理就是：忠诚留给活人，而死人不需要。他比赌场里任何一个发牌员都清楚黑蹄会的账本在哪、塞拉斯的弱点在哪、以及什么时候该点头、什么时候该消失。他在南街的经营部里摆了张旧皮椅，每天坐在上面签保护费收据，心里算的不是数字，而是时机。塞拉斯教会他统治，却没教会他满足——副手的位子坐得太久，椅面都被野心磨出了洞。现在他只缺一个够强的盟友，一个能让天平倾斜的重量。",
  },

  // ============================================================
  // 7. 罗莎·奎因 — 赌场经理
  // ============================================================
  {
    id: "npc_rosa",
    displayName: "罗莎·奎因",
    role: "casino_manager",
    factionId: "black_hoof",
    factionRank: 3,
    alive: true,
    healthState: "healthy",
    locationId: "casino",
    homeId: "quinn_suite",
    job: "赌场经理",
    female: true,
    traits: {
      bravery: 0.6,
      aggression: 0.3,
      greed: 0.85,
      sociability: 0.8,
      loyalty: 0.2,
      ambition: 0.75,
      empathy: 0.4,
    },
    needs: {
      money: 30,
      safety: 45,
      belonging: 30,
      status: 65,
      revenge: 10,
    },
    goals: [
      { type: "power", desc: "拥有赌场，而不是替塞拉斯经营", urgency: 85 },
    ],
    secrets: [
      { id: "secret_cheating_ring", desc: "操纵牌局并挪用部分利润投资股票", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "赌场真实营收数据", confidence: 0.95 },
      { fact: "哪些NPC是赌场常客", confidence: 0.9 },
      { fact: "股票内幕交易网络", confidence: 0.75 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "home", noon: "saloon", evening: "saloon", night: "saloon" },
    storyTags: ["gambler", "ambitious", "independent"],
    abilities: ["赌博信息", "资金通道", "接近上层"],
    description: "精明、冒险、爱奢华、厌恶被控制。只尊重能承担风险的人。",
    backstory: "罗莎·奎因十八岁从东部来的驿车上跳下来时，口袋里只有一副旧扑克和半包烟。十年后，她管着西部的每一张牌桌，指尖的烟草味和筹码的碰撞声混成了她的母语。赌场经理的名头在别人看来是塞拉斯的恩赐，在她看来是枷锁。她早就不满足于替别人数钱了——每一晚闭店后，她就着油灯偷偷把一笔流水转进自己的股票账户，像一只偷偷藏食的喜鹊。她喜欢冒险，但更讨厌被人控制。塞拉斯以为她是自己的人，维克托以为她好拿捏，他们都错了。罗莎等的不是一个赢家，是一场地震——谁倒下，她就在谁的地基上开新赌场。",
  },

  // ============================================================
  // 8. 伊莱·沃德 — 艾琳的哥哥
  // ============================================================
  {
    id: "npc_eli",
    displayName: "伊莱·沃德",
    role: "fugitive",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "warehouse",
    homeId: "hidden_cabin",
    job: "失踪者",
    female: false,
    traits: {
      bravery: 0.65,
      aggression: 0.45,
      greed: 0.35,
      sociability: 0.2,
      loyalty: 0.9,  // 对家人
      ambition: 0.25,
      empathy: 0.6,
    },
    needs: {
      money: 20,
      safety: 85,
      belonging: 70,
      status: 10,
      revenge: 40,
    },
    goals: [
      { type: "family", desc: "让家人脱离黑蹄会债务", urgency: 90 },
    ],
    secrets: [
      { id: "secret_stolen_ledger", desc: "偷走了赌场账本的一部分", knownBy: [], revealed: false },
      { id: "secret_black_hoof_past", desc: "曾是黑蹄会外围成员", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "赌场账本的关键内容", confidence: 0.95 },
      { fact: "黑蹄会暗道和旧成员名单", confidence: 0.85 },
      { fact: "妹妹艾琳在为他筹钱", confidence: 0.7 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "home", noon: "home", evening: "home", night: "home" },
    storyTags: ["family_of_protege", "fugitive", "former_gang_member"],
    abilities: ["提供账本", "暗道", "旧成员名单"],
    description: "保护欲强、偏执、对强者不信任。如果玩家在不知其身份时杀死他，会触发ST03。",
    backstory: "伊莱·沃德曾经相信黑蹄会给他的不仅是钱，还有一条出路。他在塞拉斯的外围跑了两年腿，换来的只是一堆秘密和一颗追在身后的子弹。失踪那天，他偷走了一部分赌场账本，从此像只受了惊的猫，躲在仓库阴影里听着外面的每一声马蹄。他早知道妹妹在替他还债，这比挨子弹更让他痛苦。但露面的代价太高了——塞拉斯的人到处找他，而账本上的数字足以让黑蹄会这座纸牌楼轰然倒塌。他蜷缩在黑暗里对自己说：再等一天，等风头过去，等艾琳安全……可风头从没有过去过。",
  },

  // ============================================================
  // 9. 赫克托·布恩 — 警长
  // ============================================================
  {
    id: "npc_hector",
    displayName: "赫克托·布恩",
    role: "sheriff",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "sheriff_office",
    homeId: "boone_house",
    job: "警长",
    female: false,
    traits: {
      bravery: 0.7,
      aggression: 0.35,
      greed: 0.3,
      sociability: 0.55,
      loyalty: 0.6,
      ambition: 0.3,
      empathy: 0.55,
    },
    needs: {
      money: 25,
      safety: 50,
      belonging: 40,
      status: 55,
      revenge: 0,
    },
    goals: [
      { type: "order", desc: "避免小镇爆发全面战争", urgency: 75 },
      { type: "balance", desc: "在各种势力间维持秩序", urgency: 60 },
    ],
    secrets: [
      { id: "secret_truce", desc: "与塞拉斯签过非正式停战协议", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "镇上所有通缉犯的档案", confidence: 0.95 },
      { fact: "黑蹄会的犯罪证据链", confidence: 0.7 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "work", noon: "work", evening: "plaza", night: "home" },
    storyTags: ["law", "compromised", "tired"],
    abilities: ["降低通缉", "合法逮捕", "封锁地盘"],
    description: "现实、疲惫、重秩序胜过重正义。与黑蹄会有非正式停战协议。",
    backstory: "赫克托·布恩腰间的星形警徽已经磨花了，但磨损它的不是枪战，而是妥协。他跟塞拉斯签过一份非正式停战协议——不是因为他怕子弹，而是因为他怕小镇变成坟场。每天清早他在面粉袋上给通缉令盖印时，心里都清楚哪些能抓、哪些不能碰。他的办公室墙上挂着一张十年前全体镇民的大合照，照片上有三分之一的人已经不在了——有些埋在教堂后面，有些去了更西边，有些变成了他不得不抓的通缉犯。他越来越分不清自己在维持的是秩序还是苟安，但每天早上穿上警服的那一刻，他还是会把星徽擦亮。",
  },

  // ============================================================
  // 10. 阿莫斯·里德 — 银行家
  // ============================================================
  {
    id: "npc_amos",
    displayName: "阿莫斯·里德",
    role: "banker",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "bank",
    homeId: "reed_manor",
    job: "银行经理",
    female: false,
    traits: {
      bravery: 0.25,
      aggression: 0.1,
      greed: 0.7,
      sociability: 0.65,
      loyalty: 0.1,
      ambition: 0.45,
      empathy: 0.3,
    },
    needs: {
      money: 15,
      safety: 70,
      belonging: 20,
      status: 70,
      revenge: 0,
    },
    goals: [
      { type: "profit", desc: "让银行在任何胜利者手里继续赚钱", urgency: 60 },
    ],
    secrets: [
      { id: "secret_risky_loans", desc: "持有黑蹄会的高风险贷款", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "全镇所有大额贷款人名单", confidence: 0.9 },
      { fact: "黑蹄会的财务状况", confidence: 0.75 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "shop", noon: "shop", evening: "shop", night: "home" },
    storyTags: ["banker", "cautious", "profit_driven"],
    abilities: ["贷款", "股票", "冻结资产", "经济情报"],
    description: "谨慎、势利、迷信信用与体面。接触门槛：声望或资产达到一定值。",
    backstory: "阿莫斯·里德走进银行大厅时总要把袖口上的金扣摆正，就像水手出海前检查罗盘。他对信用评级的迷信远远超过对上帝的任何信仰——每一笔贷款的利率都精确到小数点后两位，精确到连暴雨冲毁的麦田都拦不住他收抵押。他替黑蹄会贷过高风险的款，也替警长办公室做过账，对他来说钱没有颜色，只有风险。夜深人静时，他会在账簿上贴着每一笔烂账做记号，像给病人贴死亡标签——不是因为害怕亏空，而是因为每一笔烂账都在为他画出下一场风暴的路线图。",
  },

  // ============================================================
  // 11. 贝西·柯尔 — 酒馆老板
  // ============================================================
  {
    id: "npc_bessie",
    displayName: "贝西·柯尔",
    role: "saloon_owner",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "saloon",
    homeId: "cole_room",
    job: "酒馆老板",
    female: true,
    traits: {
      bravery: 0.5,
      aggression: 0.15,
      greed: 0.4,
      sociability: 0.9,
      loyalty: 0.65,
      ambition: 0.35,
      empathy: 0.75,
    },
    needs: {
      money: 30,
      safety: 40,
      belonging: 55,
      status: 35,
      revenge: 0,
    },
    goals: [
      { type: "neutrality", desc: "让酒馆不被任何帮派彻底控制", urgency: 65 },
    ],
    secrets: [
      { id: "secret_hid_fugitives", desc: "在楼上藏过多个逃亡者", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "几乎所有人的行踪和八卦", confidence: 0.85 },
      { fact: "谁在找谁", confidence: 0.7 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "saloon", noon: "saloon", evening: "saloon", night: "home" },
    storyTags: ["neutral_ground", "informant", "motherly"],
    abilities: ["引荐NPC", "提供传闻", "组织宴席"],
    description: "热情、观察敏锐、讨厌欠账。酒馆遭袭后停止为玩家提供中立会面。",
    backstory: "贝西·柯尔在这片尘土飞扬的镇子经营酒馆已有十五年，热情得像荒漠里的篝火，每个走进门的人都先被她的笑容烫暖。但千万别以为那双眼只盯着酒杯——她能从你扣马靴的姿势猜出你昨晚睡在哪条沟里，也能从袖口磨损看出你是握枪的亡命徒还是躲债的投机客。她讨厌欠账，不是因为吝啬，而是知道赊出去的酒总有一天会变成擦不掉的血。这些年来，没有哪个帮派能彻底掌控她的酒馆，因为贝西总能恰到好处地给每个头目递过情报，又恰到好处地藏起一个被追杀的人。二楼那间储藏室的夹层里，至少蜷缩过六个绝望的灵魂，而她从不多问。镇上所有人的行踪与丑闻，都静静地沉在她擦酒杯的抹布里，只在必要时才拧出一滴。",
  },

  // ============================================================
  // 12. 托马斯·格雷 — 矿工领袖
  // ============================================================
  {
    id: "npc_thomas",
    displayName: "托马斯·格雷",
    role: "labor_leader",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "mine",
    homeId: "gray_cabin",
    job: "矿工领袖",
    female: false,
    traits: {
      bravery: 0.7,
      aggression: 0.4,
      greed: 0.2,
      sociability: 0.6,
      loyalty: 0.8,
      ambition: 0.3,
      empathy: 0.8,
    },
    needs: {
      money: 40,
      safety: 50,
      belonging: 60,
      status: 30,
      revenge: 20,
    },
    goals: [
      { type: "justice", desc: "提高矿工收入，摆脱黑蹄会保护费", urgency: 80 },
    ],
    secrets: [
      { id: "secret_strike_plans", desc: "正在准备罢工，但内部有人告密", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "矿场真实产量和利润", confidence: 0.9 },
      { fact: "内鬼的身份", confidence: 0.6 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "work", noon: "work", evening: "saloon", night: "home" },
    storyTags: ["labor", "idealistic", "collectivist"],
    abilities: ["群众支持", "矿场控制", "批量招募"],
    description: "强硬、集体主义、对空头承诺敏感。玩家若只想占矿不改善待遇，会成为新敌人。",
    backstory: "托马斯·格雷的手掌粗糙得像矿岩，茧子里嵌着二十年采矿的粉尘。他说服矿工兄弟们连署请愿书的时候，满心想的是干净的饮用水和八小时工作制，而不是火药和复仇。但黑蹄会的保护费收条压在他的请愿书上面，像一块墓碑。矿场深处的巷道里藏着不为人知的富矿层，也藏着告密者——他最好的工友里有人每个月收塞拉斯五块钱，把罢工计划一字不漏地送到赌场后屋。托马斯的理想主义还没被现实磨灭，但斧子已经劈到了脚边。他必须在背叛的矿洞里找到出路，或者把整个矿场炸成一个宣言。",
  },

  // ============================================================
  // 13. 卡尔 — 流浪赌徒
  // ============================================================
  {
    id: "npc_carl",
    displayName: "卡尔",
    role: "gambler",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "casino",
    homeId: "carl_shack",
    job: "流浪赌徒",
    female: false,
    traits: {
      bravery: 0.45,
      aggression: 0.25,
      greed: 0.6,
      sociability: 0.7,
      loyalty: 0.15,
      ambition: 0.3,
      empathy: 0.5,
    },
    needs: {
      money: 60,
      safety: 50,
      belonging: 40,
      status: 20,
      revenge: 10,
    },
    goals: [
      { type: "redemption", desc: "攒够钱偷偷资助莉莉安离开这个镇子", urgency: 70 },
      { type: "security", desc: "不被东部赏金猎人找到", urgency: 85 },
    ],
    secrets: [
      { id: "secret_carl_wanted_east", desc: "在东部因赌场命案被通缉，化名逃到西部", knownBy: [], revealed: false },
      { id: "secret_carl_lillian_father", desc: "是莉莉安的生父，但从未相认", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "东部赏金猎人的行动规律", confidence: 0.85 },
      { fact: "赌场出千的所有手法", confidence: 0.95 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "home", noon: "saloon", evening: "saloon", night: "saloon" },
    storyTags: ["gambler", "fugitive", "secret_parent"],
    abilities: ["赌博必胜", "识破出千", "赏金猎人预警"],
    description: "油滑、爱讲笑话、总是醉醺醺的。那双发牌的手指其实比谁都稳——只是没人注意到。",
    backstory: "卡尔的手指只有在握牌时才不抖。两年前他在东部的赌场里干掉了一个出千的庄家——或者说，是庄家想干掉他，结果他快了半秒。从那以后他换了名字、换了衣着、甚至换了一种笑声，但换不掉的是每次酒馆门被推开时瞬间绷紧的脊背。他坐在赌场角落，用两成清醒观察牌面，用八成醉意掩护目光。没人知道这副醉醺醺的皮囊下藏着东部最高额的通缉令。更没人知道，酒馆台上唱歌那个黑发姑娘——莉莉安——每晚的最后一首歌，都是唱给他一个人听的。他从未开口认过她，但每一天攒下的筹码，都是替她存的出镇路费。",
  },

  // ============================================================
  // 14. 老魏 — 退休矿工/工具店主
  // ============================================================
  {
    id: "npc_wei",
    displayName: "老魏",
    role: "retired_miner",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "shop",
    homeId: "wei_shop",
    job: "工具店主",
    female: false,
    traits: {
      bravery: 0.55,
      aggression: 0.3,
      greed: 0.2,
      sociability: 0.6,
      loyalty: 0.8,
      ambition: 0.15,
      empathy: 0.7,
    },
    needs: {
      money: 25,
      safety: 55,
      belonging: 60,
      status: 15,
      revenge: 30,
    },
    goals: [
      { type: "justice", desc: "把矿场内鬼的证据交给托马斯", urgency: 65 },
      { type: "security", desc: "保护矿工兄弟不受黑蹄会报复", urgency: 50 },
    ],
    secrets: [
      { id: "secret_wei_knows_traitor", desc: "知道矿工内鬼是谁，但不敢说出名字", knownBy: [], revealed: false },
      { id: "secret_wei_tunnel_map", desc: "知道矿场废弃隧道通往赌场地下室", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "矿场内鬼的身份", confidence: 0.95 },
      { fact: "废弃隧道的完整路线", confidence: 0.9 },
      { fact: "黑蹄会催收保护费的规律", confidence: 0.75 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "work", noon: "work", evening: "shop", night: "home" },
    storyTags: ["old_timer", "labor", "informant"],
    abilities: ["提供隧道捷径", "揭露内鬼", "矿场情报"],
    description: "沉默、固执、双手全是矿尘和旧伤。从不主动开口，但提起矿场往事眼睛就会亮。",
    backstory: "老魏的右腿里有五片碎石——那是二十年前矿井塌方留下的。他不再下矿了，改在杂货店旁边开了间小工具铺，专修矿镐和油灯。但每个傍晚，矿工们收工后穿过铺子买烟时，他还是会一个名字一个名字地数过去，像老牧人数羊。他知道他们每一个人——知道谁的老婆在医馆帮忙、谁的孩子在学堂念书、也知道谁每个月月底会从赌场后门出来，口袋里多出五块钱。那张纸条上的名字他写了又擦、擦了又写，始终没有交给托马斯。不是因为怕死，而是怕万一说错了，毁了一个家。他的铺子里藏着一张旧矿图，图上有一条被遗忘的隧道——直通赌场地下室。二十年前没人觉得它有用，现在它是推翻黑蹄会的钥匙。",
  },

  // ============================================================
  // 15. 莉莉安 — 酒馆歌女
  // ============================================================
  {
    id: "npc_lillian",
    displayName: "莉莉安",
    role: "songstress",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "saloon",
    homeId: "lillian_room",
    job: "酒馆歌女",
    female: true,
    traits: {
      bravery: 0.5,
      aggression: 0.15,
      greed: 0.3,
      sociability: 0.85,
      loyalty: 0.6,
      ambition: 0.55,
      empathy: 0.65,
    },
    needs: {
      money: 40,
      safety: 55,
      belonging: 65,
      status: 40,
      revenge: 5,
    },
    goals: [
      { type: "career", desc: "攒够钱去东部大城市唱歌", urgency: 60 },
      { type: "truth", desc: "弄清楚父亲是谁", urgency: 50 },
    ],
    secrets: [
      { id: "secret_lillian_overheard_laundering", desc: "在后台化妆间偷听到了黑蹄会洗钱计划的细节", knownBy: [], revealed: false },
      { id: "secret_lillian_birth", desc: "母亲临终前说她父亲是个赌徒，就在这个镇子上", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "黑蹄会通过赌场洗钱的具体金额和时间", confidence: 0.8 },
      { fact: "酒馆所有人的秘密和八卦", confidence: 0.9 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "home", noon: "saloon", evening: "saloon", night: "saloon" },
    storyTags: ["songstress", "secret_heir", "informant"],
    abilities: ["吸引注意力", "情报收集", "调动群众情绪"],
    description: "嗓音如沙漠夜风，笑容像篝火边的暖酒。对每个人都温柔，但对任何事都不轻易表态。",
    backstory: "莉莉安的嗓音是这片荒野里唯一不需要子弹的武器。每晚上台前，她都对着镜子里那张酷似母亲的脸涂口脂，然后深吸一口气——就像母亲临死前深吸了最后一口气，把一句没说完的话永远咽了下去。那句话的后半截，她在这座小镇找了三年。酒馆的木板墙比任何人想的都薄，她在后台换衣服时，隔着一层木板听到了塞拉斯和维克托压低嗓子念出的数字、名字、和日期。她用手指沾着粉盒里的胭脂把那些数字写在裙摆内侧，心想：这些秘密也许能换一张去东部的驿车票。但更让她无法入睡的问题是——那个每天坐在赌场角落、醉醺醺看她的老赌徒，为什么每次听到她的歌声就会把帽檐压得特别低。",
  },

  // ============================================================
  // 16. 布朗 — 牧师
  // ============================================================
  {
    id: "npc_brown",
    displayName: "布朗",
    role: "pastor",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "church",
    homeId: "brown_rectory",
    job: "牧师",
    female: false,
    traits: {
      bravery: 0.35,
      aggression: 0.05,
      greed: 0.1,
      sociability: 0.75,
      loyalty: 0.7,
      ambition: 0.2,
      empathy: 0.9,
    },
    needs: {
      money: 10,
      safety: 45,
      belonging: 50,
      status: 30,
      revenge: 0,
    },
    goals: [
      { type: "ethics", desc: "用告解记录阻止一场即将发生的谋杀", urgency: 80 },
    ],
    secrets: [
      { id: "secret_brown_confession_book", desc: "告解记录本记载了全镇人的秘密，包括一桩预谋杀人", knownBy: [], revealed: false },
      { id: "secret_brown_victor_confession", desc: "维克托曾来告解过一次——承认了谋杀前副手", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "谁即将被谋杀", confidence: 0.7 },
      { fact: "全镇告解者的秘密总汇", confidence: 0.9 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "work", noon: "work", evening: "church", night: "home" },
    storyTags: ["pastor", "confidant", "moral_center"],
    abilities: ["忏悔信息", "讲和调解", "提供精神庇护"],
    description: "温和、寡言，眼神里总是带着担忧。教堂的门从不锁，他知道有些人需要的不只是上帝。",
    backstory: "布朗牧师的神学院毕业证书压在告解室椅子下面——不是因为耻辱，而是因为太硬，坐着不舒服。他听了十年告解，知道这个镇子每一条隐秘的罪：谁偷了邻居的马，谁在妻子的茶里下过药，谁把仇人的尸体埋在了干河床底下。他把每一桩都记在一本牛皮封面的册子里，用拉丁文写的，这样就算被人看到也不至于立刻泄密。但上周维克托来了——这个从不进教堂的男人跪在告解室里，声音平静得像在念采购清单——忏悔了他三年前在新奥斯汀郊外杀掉的那个人，一个黑蹄会的前副手。布朗握着十字架的手指发白，不是因为恐惧，而是因为维克托说完后补了一句：下一个目标的名字，他已经写在了子弹上。布朗必须在违背告解保密誓言和阻止一桩谋杀之间做出选择。他的信仰从未如此沉重。",
  },

  // ============================================================
  // 17. 玛丽 — 酒馆女侍
  // ============================================================
  {
    id: "npc_mary",
    displayName: "玛丽",
    role: "barmaid",
    factionId: null,
    factionRank: 0,
    alive: true,
    healthState: "healthy",
    locationId: "saloon",
    homeId: "mary_room",
    job: "酒馆女侍",
    female: true,
    traits: {
      bravery: 0.35,
      aggression: 0.1,
      greed: 0.35,
      sociability: 0.8,
      loyalty: 0.65,
      ambition: 0.25,
      empathy: 0.75,
    },
    needs: {
      money: 35,
      safety: 55,
      belonging: 70,
      status: 15,
      revenge: 10,
    },
    goals: [
      { type: "love", desc: "鼓起勇气把情书交出去", urgency: 45 },
    ],
    secrets: [
      { id: "secret_mary_witnessed_victor", desc: "亲眼看到维克托在后巷殴打并威胁商户", knownBy: [], revealed: false },
      { id: "secret_mary_love_letters", desc: "枕头下藏了七封未寄出的情书，收信人是一个不该爱的人", knownBy: [], revealed: false },
    ],
    knowledge: [
      { fact: "维克托的暴力收债细节", confidence: 0.9 },
      { fact: "酒馆常客的饮酒习惯和秘密", confidence: 0.8 },
    ],
    memories: [],
    commitments: [],
    schedule: { morning: "shop", noon: "saloon", evening: "saloon", night: "home" },
    storyTags: ["barmaid", "witness", "romantic"],
    abilities: ["目击证词", "打听消息", "藏匿物品"],
    description: "手脚麻利、笑容真诚，托盘底下总是藏着一本翻烂了的诗集。知道很多不该知道的事，但嘴比子弹壳还紧。",
    backstory: "玛丽在酒馆端了六年盘子，学会的最重要本事不是平衡托盘，而是闭上眼睛洗杯子——这样就不用看见后巷里发生的事情。但她还是看见了维克托把一个杂货店老板按在墙上，用枪管敲碎了他所有的门牙，然后若无其事地走进酒馆点了一杯威士忌。那天晚上她躲在厨房里哭了一场，然后用一块干净布擦了脸，继续给每桌倒酒。没有人怀疑玛丽，因为她永远在笑。枕头下那七封没有署收件人名字的情书，每一封都写给同一个人——一个不可能的人，一个属于别人的人。她宁可用一辈子把信压在枕头下，也不愿让那个人知道。但她的眼睛藏不住，每次那个人的酒杯空了，她总是最先走过去的那一个。",
  },
];

// ============================================================
// NPC 默认关系起始值
// ============================================================
export const INITIAL_RELATIONSHIPS = {
  "npc_erin->npc_eli": { trust: 85, affection: 90, fear: 5, debt: 10, resentment: 0, respect: 60 },
  "npc_silas->npc_victor": { trust: 25, affection: 0, fear: 15, debt: 40, resentment: 30, respect: 45 },
  "npc_silas->npc_rosa": { trust: 35, affection: 0, fear: 20, debt: 50, resentment: 25, respect: 35 },
  "npc_victor->npc_silas": { trust: 20, affection: 0, fear: 30, debt: 50, resentment: 45, respect: 50 },
  "npc_rosa->npc_silas": { trust: 15, affection: 0, fear: 35, debt: 40, resentment: 40, respect: 30 },
  "npc_hector->npc_silas": { trust: 10, affection: 0, fear: 25, debt: 30, resentment: 35, respect: 40 },
  "npc_noah->npc_silas": { trust: 5, affection: 0, fear: 40, debt: 60, resentment: 20, respect: 20 },
  "npc_bessie->npc_erin": { trust: 55, affection: 60, fear: 0, debt: 0, resentment: 0, respect: 50 },
  "npc_thomas->npc_silas": { trust: 5, affection: 0, fear: 15, debt: 0, resentment: 70, respect: 10 },
  "npc_carl->npc_lillian": { trust: 10, affection: 85, fear: 20, debt: 50, resentment: 0, respect: 30 },
  "npc_lillian->npc_carl": { trust: 15, affection: 10, fear: 0, debt: 0, resentment: 0, respect: 5 },
  "npc_wei->npc_thomas": { trust: 70, affection: 65, fear: 0, debt: 0, resentment: 0, respect: 75 },
  "npc_wei->npc_silas": { trust: 5, affection: 0, fear: 30, debt: 0, resentment: 60, respect: 10 },
  "npc_brown->npc_victor": { trust: 0, affection: 0, fear: 20, debt: 0, resentment: 10, respect: 5 },
  "npc_mary->npc_bessie": { trust: 60, affection: 70, fear: 0, debt: 10, resentment: 0, respect: 55 },
  "npc_mary->npc_victor": { trust: 0, affection: 0, fear: 70, debt: 0, resentment: 40, respect: 10 },
};

// 中立方默认关系模板
export const DEFAULT_RELATIONSHIP = {
  trust: 0, affection: 0, fear: 0, debt: 0, resentment: 0, respect: 5
};
