// storyRevenge.js —— 「你杀了人，他的亲属来找你」的动态复仇线。
//
// 为什么单独一棵树而不是复用 kin_revenge：
//   kin_revenge 的台词是预写的泛指（"那个外乡人"），提不到死者名字。
//   这条线的全部张力来自"你**亲手**杀的那个人"，所以台词必须能填真实姓名。
//
// 占位约定（运行时由 buildRevengeTree 填入，不走 TheaterRuntime._sub）：
//   {victim} 死者名   {kin} 来复仇的亲属名   {days} 过了几天
// 角色约定：
//   lead = 来复仇的亲属（casting 用 kinOf 挑，挑不到就现造一个同姓的）
//   extra0_0 = 陪他来的人（可选，凑不到也能演）

/** 复仇线的四个环节。每环是一幕：多人台词 + 玩家抉择 + 后果 */
export const REVENGE_BEATS = {
  // ① 好友报信（不开剧场，只发手机口信）—— 由 RevengeSystem 直接投递
  tipoff: {
    // {friend} 报信人，{kin} 亲属，{victim} 死者
    lines: [
      "有件事得让你知道：{victim}的家里人到镇上来了，一直在打听那天的事。",
      "{victim}那边来了个人，四处问谁下的手。你自己小心。",
      "我不该多嘴，可{victim}的亲属在找你，手里像是带着家伙。",
    ],
  },

  // ② 对峙：亲属堵住你
  confront: {
    title: "上门讨命",
    description: "{kin}在街口拦住你，手一直没离开腰上那把枪，眼睛盯着你不放。",
    locateLabel: "街口",
    beats: [
      { speaker: "lead", to: "player", text: "你就是那天动手的人。", mood: "cold" },
      { speaker: "lead", to: "player", text: "{victim}死了{days}天，血还没洗干净。", mood: "angry" },
      { speaker: "extra0_0", to: "lead", text: "别急，先听他怎么说。", mood: "neutral" },
      { speaker: "lead", to: "player", text: "我不要听。我要个说法。", mood: "angry" },
    ],
    choices: [
      {
        id: "rv_admit", label: "承认，让他动手", risk: "high",
        beats: [
          { speaker: "lead", to: "player", text: "你倒是敢站着不动。", mood: "cold" },
          { speaker: "lead", to: "player", text: "……我下不了手。滚。", mood: "sad" },
        ],
        lines: ["他举了半天枪，最后把枪口垂下去。", "镇上的人说，那天街口静得能听见风。"],
        fx: { honor: 8, wanted: 0, affection: 15, trust: 10 },
      },
      {
        id: "rv_pay", label: "赔一笔血钱", risk: "medium",
        beats: [
          { speaker: "lead", to: "player", text: "你当命是能买的？", mood: "angry" },
          { speaker: "lead", to: "player", text: "……钱我收下。这事不算完。", mood: "cold" },
        ],
        lines: ["钱袋换了手，可他的眼神没变。", "这笔账被记下了，只是没在今天清。"],
        fx: { cash: -60, honor: 2, affection: 4, trust: -5 },
      },
      {
        id: "rv_deny", label: "咬死不认", risk: "medium",
        beats: [
          { speaker: "lead", to: "player", text: "撒谎的人眼睛不会这么稳。", mood: "cold" },
          { speaker: "extra0_0", to: "player", text: "我们会查清楚的。", mood: "cold" },
        ],
        lines: ["他没能拿出证据，可也没打算走。", "从那天起，你总觉得背后有人跟着。"],
        fx: { honor: -4, affection: -12, trust: -15 },
      },
      {
        id: "rv_fight", label: "先下手为强", risk: "high",
        beats: [
          { speaker: "lead", to: "player", text: "你连辩都不辩……", mood: "scared" },
          { speaker: "extra0_0", to: "player", text: "疯子！这镇上还有王法！", mood: "angry" },
        ],
        lines: ["又一个姓氏从镇上的名册里划掉了。", "警长在你的名字后面添了一笔。"],
        fx: { honor: -14, wanted: 2, affection: -25, trust: -25 },
      },
    ],
  },
};

/**
 * 用真实的死者/亲属把复仇线组装成一棵可演的剧场树。
 *
 * @param {object} ctx { victimName, kinNpcId, days }
 * @returns {object} 剧场树（形状同 theaterStoryTrees：roles + nodes 数组）
 */
export function buildRevengeTree(ctx = {}) {
  const victim = ctx.victimName || "那个人";
  const days = Math.max(1, ctx.days || 1);
  const fill = (s) => String(s)
    .replace(/\{victim\}/g, victim)
    .replace(/\{days\}/g, String(days));

  const spec = REVENGE_BEATS.confront;
  const nodes = [{
    id: "open",
    title: spec.title,
    hint: fill(spec.description),
    beats: spec.beats.map((b) => ({ ...b, text: fill(b.text), delayMs: 1700 + Math.round(Math.random() * 500) })),
    choices: spec.choices.map((c) => ({
      id: c.id, label: c.label, risk: c.risk, next: `end_${c.id}`, line: c.label,
    })),
  }];
  for (const c of spec.choices) {
    nodes.push({
      id: `end_${c.id}`,
      terminal: true,
      beats: c.beats.map((b) => ({ ...b, text: fill(b.text), delayMs: 1700 })),
      outcome: {
        id: c.id,
        title: `讨命 · ${c.label}`,
        lines: c.lines.map(fill),
        cash: c.fx.cash || 0,
        honor: c.fx.honor || 0,
        wanted: c.fx.wanted || 0,
      },
    });
  }

  return {
    id: `revenge:${ctx.kinNpcId || "unknown"}:${ctx.day || 0}`,
    title: `${victim}的血债`,
    hintOnEnter: fill(spec.description),
    protagonistRole: "lead",
    protagonistId: ctx.kinNpcId || null,
    kind: "revenge",
    roles: [
      // 主角必须是死者的亲属：casting 按 kinOf 挑，挑不到会现造一个同姓的
      { roleId: "lead", required: true, kinOf: ctx.victimNpcId || null },
      { roleId: "extra0_0", required: false },
    ],
    entryNode: "open",
    unattendedMs: 90000,
    timeoutNode: `end_${spec.choices[2].id}`,   // 玩家跑了 = 咬死不认
    nodes,
    // 让 TheaterDirector 知道这是哪条线（复用故事回调通道）
    _revenge: true,
    _kinNpcId: ctx.kinNpcId || null,
    _victimName: victim,
  };
}

/** 报信口信（随机一条，填入真实姓名） */
export function pickTipoffLine(victimName) {
  const arr = REVENGE_BEATS.tipoff.lines;
  return arr[Math.floor(Math.random() * arr.length)].replace(/\{victim\}/g, victimName || "那个人");
}
