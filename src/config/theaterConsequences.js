// theaterConsequences.js — 剧场结局后果包内容（P8）。
//
// 每个结局挂一个后果包：结构性后果（势力/延迟揭示/延迟回报/解锁）。
// 设计约束（DESIGN 6.4）：
//   - 8 棵树全覆盖
//   - 至少 1/3 的结局带 reveal（延迟揭示）
//
// 键：`树id::结局节点id` → 后果包。
// ConsequenceSystem.apply 会读结局节点 outcome.consequences，
// 这里通过 TheaterDirector 注入：见 main.js 里 attachTheaterConsequences。
//
// 字段说明：
//   faction.law          → 警长四支柱 {authority, manpower, evidence, integrity}
//   faction.black_hoof   → 黑蹄会四支柱 {wealth, territory, manpower, legitimacy}
//   faction.player       → 玩家势力 {influence, money, morale}
//   reveal               → 延迟揭示 {afterDays, text, channel:"newspaper"|"phone",
//                          fromName?, effects:{faction, relationship}}
//   delayed              → 延迟回报 [{afterDays, type:"letter"|"payback", from?, text?, effects:{cash}}]
//   unlock               → 解锁隐藏标记数组

export const CONSEQUENCE_PACKS = {
  // ── 正午决斗 ──
  "high_noon_duel::e_fair": {
    faction: { black_hoof: { legitimacy: 0 }, player: { influence: 1 } },
    reveal: {
      afterDays: 2,
      text: "你后来才知道，那天被放倒的汉克，曾经给黑蹄会收过账。他输了决斗，也输掉了一条给黑蹄会的线。",
      channel: "newspaper",
      effects: { faction: { black_hoof: { manpower: -2, wealth: -2 } } },
    },
  },
  "high_noon_duel::e_peace": {
    faction: { player: { influence: 1, morale: 2 } },
    unlock: ["duel_peacemaker"],
  },
  "high_noon_duel::e_cards": {
    faction: { player: { influence: 1 } },
    delayed: [
      { afterDays: 3, type: "letter", from: "疤脸乔", fromNpcId: "npc_carl",
        text: "那天以牌代枪，是你给我留的体面。酒钱我记你账上，回头镇上见。",
        effects: { cash: 40 } },
    ],
  },
  "high_noon_duel::e_rigged": {
    faction: { black_hoof: { legitimacy: -4 }, player: { influence: 1 } },
    reveal: {
      afterDays: 2,
      text: "揭穿作弊的是你，可那个给汉克递作弊牌的人，是黑蹄会赌场的常客。你砸了一场戏，有人记上了你。",
      channel: "phone",
      effects: { faction: { black_hoof: { wealth: -3 } } },
    },
  },
  "high_noon_duel::e_loot": {
    faction: { black_hoof: { wealth: -3 }, player: { money: 25 } },
    delayed: [
      { afterDays: 4, type: "letter", from: "汉克", fromNpcId: "npc_carl",
        text: "我口袋里的怀表是我爹留给我的。你拿走的那天我看见了——若你还有半分良心，物归原主。",
        effects: { cash: 0 } },
    ],
  },
  "high_noon_duel::grd": {
    faction: { law: { authority: 2, manpower: 1 } },
    unlock: ["duel_sheriff_handled"],
  },
  "high_noon_duel::e_chaos": {
    faction: { black_hoof: { legitimacy: -3 }, player: { influence: -1 } },
    reveal: {
      afterDays: 2,
      text: "那场混战里，你踩碎了一封没来得及送出去的信。信上写的，是黑蹄会这个月的保护费明细。",
      channel: "newspaper",
      effects: { faction: { black_hoof: { territory: -2 } } },
    },
  },

  // ── 酒馆三角 ──
  "saloon_triangle::e_leave": {
    reveal: {
      afterDays: 2,
      text: "萝丝走后你才听说，她是镇上警长赫克托失散多年的妹妹。她一直瞒着，怕他看不起她这出身。",
      channel: "newspaper",
      effects: { faction: { law: { authority: 3, integrity: -1 } },
                 relationship: { "赫克托·布恩": { debt: 30 } } },
      unlock: ["npc_rosa_sister_of_sheriff"],
    },
  },
  "saloon_triangle::e_ticket": {
    faction: { player: { money: -50 }, influence: 1 },
    reveal: {
      afterDays: 3,
      text: "你替萝丝买的那张车票，用的是黑蹄会赌场找零的一张旧钞——账房认出了它的编号。",
      channel: "phone",
      effects: { faction: { black_hoof: { wealth: -2 } } },
      unlock: ["npc_rosa_sister_of_sheriff"],
    },
    delayed: [
      { afterDays: 5, type: "letter", from: "萝丝", fromNpcId: "npc_rosa",
        text: "旧金山一切都好。那张票是我这辈子第一张去别处的通行证。这是我省下的，还你。",
        effects: { cash: 90 } },
    ],
    // P17 打通：萝丝离开后，镇上那个找父亲的孩子（ST08）有了新的线索
    story: { action: "create", storyId: "orphan_clue", bindings: {} },
  },
  "saloon_triangle::e_justice": {
    faction: { law: { evidence: 2, authority: 1 } },
    unlock: ["stolen_necklace_returned"],
  },
  "saloon_triangle::e_greed": {
    faction: { black_hoof: { legitimacy: -2 }, player: { money: 80 } },
    reveal: {
      afterDays: 2,
      text: "那条项链是黑蹄会替镇上的寡妇催收时扣下的。你收走它，等于替黑蹄会背了一口黑锅。",
      channel: "newspaper",
      effects: { faction: { black_hoof: { wealth: -3 } }, player: { influence: -2 } },
    },
  },
  "saloon_triangle::e_peace": {
    faction: { player: { influence: 1, morale: 3 } },
    delayed: [
      { afterDays: 3, type: "letter", from: "老崔", fromNpcId: "npc_brown",
        text: "你挡下的那场枪，救的不只是两个浑人，是这条街一晚上的太平。神会记你的。",
        effects: { cash: 0 } },
    ],
  },
  "saloon_triangle::grd": {
    faction: { law: { authority: 2, manpower: 1 } },
  },

  // ── 街头扒手 ──
  "street_pickpocket::e_hero": {
    faction: { law: { authority: 1 }, player: { influence: 1 } },
    unlock: ["pickpocket_hero"],
  },
  "street_pickpocket::e_kind": {
    faction: { player: { morale: 2 } },
    reveal: {
      afterDays: 2,
      text: "你替那扒手掏的药钱，其实是给他病在床上的妹妹的。钱袋里那位失主，正是她打工的裁缝铺老板娘。",
      channel: "phone",
      effects: { faction: { player: { influence: 1 } } },
    },
    // P17 打通：扒手的妹妹病着 → 镇上闹病（ST07 药铺短缺）
    story: { action: "create", storyId: "medicine_shortage", bindings: {} },
  },
  "street_pickpocket::e_escape": {
    reveal: {
      afterDays: 2,
      text: "那个溜进人群的扒手，第二天出现在了黑蹄会赌场的后门。他给赌场做眼线，那双手比牌更灵活。",
      channel: "newspaper",
      effects: { faction: { black_hoof: { territory: -1 } } },
    },
  },
  "street_pickpocket::e_dark": {
    faction: { player: { money: 60 }, influence: -1 },
    delayed: [
      { afterDays: 4, type: "letter", from: "失主", fromNpcId: "npc_erin",
        text: "我攒了三个月的工钱，被人偷了，又被一个外乡人黑吃了。你晚上睡得着吗？",
        effects: { cash: 0 } },
    ],
  },
  "street_pickpocket::e_cover": {
    faction: { law: { integrity: -2 }, player: { influence: -1 } },
    unlock: ["covered_pickpocket"],
  },
  "street_pickpocket::grd": {
    faction: { law: { authority: 2, evidence: 1 } },
  },

  // ── 银行悬赏 ──
  "bank_bounty::e_truth1": {
    faction: { law: { authority: 2, evidence: 3 }, player: { influence: 2 } },
    reveal: {
      afterDays: 2,
      text: "那个被冤枉的账房先生，是警长线人的侄子。你替他洗清冤屈，等于帮警长保住了一条眼线。",
      channel: "newspaper",
      effects: { faction: { law: { authority: 2, integrity: 2 } } },
      unlock: ["bank_accountant_cleared"],
    },
    // P17 打通：账房被冤枉的事传开 → 商贩也被人栽赃缺斤少两（ST05 集市纠纷）
    story: { action: "create", storyId: "market_scale", bindings: {} },
  },
  "bank_bounty::e_truth2": {
    faction: { player: { money: 120, influence: 1 } },
    delayed: [
      { afterDays: 3, type: "letter", from: "委托人", fromNpcId: "npc_amos",
        text: "你办得干净。这笔赏金只是开始——银行缺一个能在乱子里站得住的人。",
        effects: { cash: 60 } },
    ],
  },
  "bank_bounty::e_bloody2": {
    faction: { black_hoof: { legitimacy: -3 }, law: { integrity: -1 }, player: { influence: -1 } },
  },

  // ── 马厩盗马 ──
  "stable_horsethief::e_truth": {
    faction: { law: { authority: 2, evidence: 2 }, player: { influence: 1 } },
    unlock: ["horse_thief_caught"],
  },
  "stable_horsethief::e_luke_escape": {
    reveal: {
      afterDays: 3,
      text: "那个跑掉的盗马贼，是你那天在酒馆门口见过的熟面孔。他姓卢，替黑蹄会走货的。",
      channel: "phone",
      effects: { faction: { black_hoof: { manpower: -1 } } },
    },
  },
  "stable_horsethief::e_shootout": {
    faction: { black_hoof: { manpower: -2 }, player: { influence: -1 } },
  },
  "stable_horsethief::e_buyer_killed": {
    faction: { black_hoof: { legitimacy: -2 }, player: { influence: -2 } },
    reveal: {
      afterDays: 2,
      text: "那个被你误杀的外乡人，其实是来镇上找妹妹的铜匠。消息传回邻镇，没人再敢跟你做生意。",
      channel: "newspaper",
      effects: { faction: { player: { influence: -2 } } },
    },
  },

  // ── 井水权 ──
  "well_waterright::e_truth": {
    faction: { law: { authority: 2, integrity: 1 }, player: { influence: 1 } },
    unlock: ["water_right_justice"],
  },
  "well_waterright::e_blood2": {
    faction: { black_hoof: { legitimacy: -4, territory: -2 }, player: { influence: -1 } },
    reveal: {
      afterDays: 2,
      text: "你砍下的那颗头，是黑蹄会安插在水权会里的暗桩。他们少了一双眼睛，但多了一个要你的理由。",
      channel: "phone",
      effects: { faction: { black_hoof: { manpower: -2 } }, player: { influence: -1 } },
    },
  },
  "well_waterright::e_unfair": {
    faction: { law: { integrity: -2 }, black_hoof: { legitimacy: -2 } },
  },

  // ── 医馆分诊 ──
  "doctor_triage::e_truth": {
    faction: { law: { evidence: 2, authority: 1 } },
    reveal: {
      afterDays: 2,
      text: "那个被你送进牢里的放贷人，曾在黑蹄会赌场替人管账。他进去了，黑蹄会的账就断了一截。",
      channel: "newspaper",
      effects: { faction: { black_hoof: { wealth: -4 } } },
    },
  },
  "doctor_triage::e_compromise": {
    faction: { player: { influence: 1, morale: 2 } },
    delayed: [
      { afterDays: 3, type: "letter", from: "医生", fromNpcId: "npc_martha",
        text: "那晚你让两张病床都有了着落。医生这行见惯生死，最记这种两全。",
        effects: { cash: 30 } },
    ],
  },
  "doctor_triage::e_violence": {
    faction: { black_hoof: { manpower: -1 }, player: { influence: -1 } },
  },

  // ── 葬礼遗嘱 ──
  "funeral_will::e_truth": {
    faction: { law: { evidence: 3, authority: 1 }, player: { influence: 1 } },
    unlock: ["will_justice_served"],
  },
  "funeral_will::e_greed": {
    faction: { player: { money: 150, influence: -1 } },
    reveal: {
      afterDays: 3,
      text: "你吞下的那份遗产里，有一块地契——正是黑蹄会赌场租用的地。你把租约捏在手里，等于捏住了他们的咽喉。",
      channel: "newspaper",
      effects: { faction: { black_hoof: { territory: -3, wealth: -3 } } },
      unlock: ["will_land_deed_in_hand"],
    },
  },
  "funeral_will::e_peaceful": {
    faction: { player: { influence: 1, morale: 3 } },
    delayed: [
      { afterDays: 4, type: "letter", from: "遗孀", fromNpcId: "npc_bessie",
        text: "多亏你，老头的棺材没人在灵堂上吵。这是他生前最想要的体面。",
        effects: { cash: 40 } },
    ],
  },
};
