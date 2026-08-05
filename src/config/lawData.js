// lawData.js — 警长势力（第三方）的配置。
//
// 为什么警长必须是一股独立势力，而不是"玩家的通缉度惩罚系统"：
// 现在 wanted 只会让玩家被追、被扣分，是个纯负反馈。可赫克托·布恩在
// npcData 里的设定明明是三角关系的支点 —— 他挂着 law/compromised/tired
// 三个标签，还有一条"与塞拉斯签过非正式停战协议"的秘密，目标是
// "避免小镇爆发全面战争"、"在各种势力间维持秩序"。
//
// 也就是说他既不是玩家的敌人，也不是黑蹄会的走狗 —— 他是那个谁都想拉拢、
// 谁都想架空的第三方。玩家可以喂证据让他去查黑蹄会，黑蹄会可以塞钱让他
// 睁眼瞎，玩家也可以曝光停战协议把他逼到墙角。

export const LAW_PILLARS = {
  authority: {
    label: "威信",
    initial: 55,
    collapseAt: 20,
    description: "镇民是否还听他的。威信崩了，通缉令就是一张废纸，玩家在街上可以横着走。",
    hurtBy: ["公开羞辱警长", "在他面前杀人不受罚", "帮派公然占街"],
    helpedBy: ["协助抓捕", "交出凶手", "公开支持警长"],
  },
  manpower: {
    label: "人手",
    initial: 40,
    collapseAt: 15,
    description: "副警长和民兵的数量。人手不够就抓不了人，通缉度再高也来不了。",
    hurtBy: ["打伤副警长", "买通民兵", "让他疲于奔命"],
    helpedBy: ["举报逃犯", "帮他维持治安"],
  },
  evidence: {
    label: "证据",
    initial: 15,
    collapseAt: 0,
    description: "手上有多少能给黑蹄会定罪的东西。这是玩家唯一能直接喂给他的资源 —— 卧底送回来的情报就变成这个。",
    hurtBy: ["证物被销毁", "证人被灭口", "被收买后卷宗丢失"],
    helpedBy: ["提交账本", "卧底情报", "找到证人"],
  },
  integrity: {
    label: "廉洁",
    initial: 30,     // compromised：一上来就已经被黑蹄会拿住了
    collapseAt: 10,
    description: "有没有被买通。廉洁归零意味着他彻底站到黑蹄会那边，玩家交的证据会当场消失。",
    hurtBy: ["黑蹄会行贿", "被威胁家人", "证据被压下"],
    helpedBy: ["曝光腐败并给他台阶", "帮他扳倒行贿者"],
  },
};

/** 警长对玩家的态度档位（由 wanted 与协作历史共同决定） */
export const STANCE = {
  ALLY:    { id: "ally",    label: "盟友",   desc: "他愿意为你出手" },
  NEUTRAL: { id: "neutral", label: "中立",   desc: "公事公办" },
  WARY:    { id: "wary",    label: "警惕",   desc: "盯着你，但还没动手" },
  HOSTILE: { id: "hostile", label: "敌对",   desc: "见到你就抓" },
};

/**
 * 突袭：证据攒够就会对黑蹄会动手。
 * 这是"卧底情报 → 第三方行动 → 敌方支柱受损"这条链的出口，
 * 让渗透的收益不必总由玩家亲手兑现。
 */
export const RAID_TIERS = [
  {
    id: "shakedown", need: 30, cost: 20, label: "盘查南街",
    damage: { territory: 8, manpower: 4 },
    needPillars: { manpower: 20, integrity: 20 },
    line: "警长带人把南街翻了一遍，几个收账的被扣了。",
  },
  {
    id: "warehouse", need: 55, cost: 35, label: "查抄仓栈",
    damage: { wealth: 14, territory: 8 },
    needPillars: { manpower: 28, integrity: 25 },
    line: "仓栈被贴了封条，一整批货扣在码头上。",
  },
  {
    id: "casino", need: 75, cost: 50, label: "封赌场",
    damage: { wealth: 20, legitimacy: 10 },
    needPillars: { manpower: 35, integrity: 30 },
    line: "赌场今晚不开门了 —— 门口两个副警长守着。",
  },
  {
    id: "indict", need: 95, cost: 70, label: "起诉会首",
    damage: { legitimacy: 24, manpower: 10, wealth: 8 },
    needPillars: { manpower: 40, integrity: 40, authority: 35 },
    line: "镇上贴出了对塞拉斯·克劳的正式指控。",
  },
];

/** 黑蹄会每天试图行贿的力度（按它自己的财富支柱缩放） */
export const BRIBE = {
  baseChance: 0.45,      // 基础尝试概率
  integrityHit: 6,       // 成功一次掉多少廉洁
  evidenceHit: 8,        // 顺手压掉多少证据
  wealthCost: 3,         // 行贿也要花钱（伤自己的财富支柱）
  // 廉洁越低越容易再被买通（滑坡）
  slopeBonus: 0.35,
};

/** 玩家能对警长做的事 */
export const LAW_ACTIONS = {
  feed_evidence: { label: "递交证据",   evidence: 12, integrity: 2,  authority: 1 },
  turn_in_thug:  { label: "交出逃犯",   manpower: 6,  authority: 4 },
  expose_truce:  { label: "曝光停战协议", integrity: -22, authority: -10, evidence: 6 },
  bribe_sheriff: { label: "自己行贿",   integrity: -14, evidence: -6 },
  back_publicly: { label: "公开支持",   authority: 8,  manpower: 2 },
};
