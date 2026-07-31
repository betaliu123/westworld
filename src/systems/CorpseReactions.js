// CorpseReactions.js — 路人对街上倒地者的反应
// 目标：大街上躺着人时，路过的 NPC 不能视若无睹地走过去。
// 三档反应：
//   远远看见 → 吓一跳、惊呼（一次性）
//   走得太近 → 绕开走（给 brain 一个避让点）
//   胆小的   → 直接跑，或者跑去报警

const NOTICE_DIST = 12;     // 多远能看见尸体
const AVOID_DIST = 4.2;     // 进到这么近就开始绕
const REACT_CD = 25;        // 同一个 NPC 对同一具尸体的惊呼冷却（秒）
const MAX_REACT_PER_TICK = 2; // 每次扫描最多让几个人出声，避免全街一起喊

const SHOCK_LINES = [
  "天啊……那是个死人？",
  "地上那个……别是死了吧。",
  "老天，谁干的？",
  "别过去，那边躺着人！",
  "上帝保佑，又出人命了。",
];
const AVOID_LINES = [
  "让让，我可不想沾上这事。",
  "绕过去，绕过去。",
  "我什么也没看见。",
];
const PANIC_LINES = [
  "杀人啦！有人死了！",
  "去叫警长！快！",
  "这镇子疯了！",
];

export class CorpseReactions {
  constructor(deps = {}) {
    this.npcManager = deps.npcManager;
    this.hud = deps.hud;
    this.audio = deps.audio || null;
    this.moodFx = deps.moodFx || null;
    this.getNow = deps.getNow || (() => performance.now() / 1000);
    this._scanCd = 0;
    this._reacted = new WeakMap(); // npc -> { corpseKey: 上次反应时间 }
  }

  /** 街上所有"倒着的人"（被击倒或死亡，且在室外） */
  _corpses() {
    const out = [];
    for (const npc of this.npcManager?.all || []) {
      if (npc.insideHome || npc.insideRoom) continue;
      if (!npc.alive || npc.brain?.state === "DOWN") out.push(npc);
    }
    return out;
  }

  update(dt) {
    this._scanCd -= dt;
    if (this._scanCd > 0) return;
    this._scanCd = 0.5; // 每 0.5 秒扫一次

    const corpses = this._corpses();
    if (!corpses.length) return;
    const now = this.getNow();
    let spoke = 0;

    for (const npc of this.npcManager?.all || []) {
      if (!npc.alive || npc.insideHome || npc.insideRoom) continue;
      const b = npc.brain;
      if (!b || b.state === "DOWN") continue;
      if (b._perform) continue;          // 台上的演员由剧场管
      if (b.state === "FLEE" || b.state === "ANGRY") continue; // 正忙着跑/打

      // 找最近的尸体
      let near = null;
      let nd = Infinity;
      for (const c of corpses) {
        if (c === npc) continue;
        const d = Math.hypot(c.pos.x - npc.pos.x, c.pos.z - npc.pos.z);
        if (d < nd) { nd = d; near = c; }
      }
      if (!near || nd > NOTICE_DIST) continue;

      // 太近 → 绕开走（把避让点交给 brain 的跟随/走位通道）
      if (nd < AVOID_DIST) {
        this._avoid(npc, near);
      }

      // 惊呼（带冷却，一具尸体只惊一次）
      const key = near.phone?.owner || String(corpses.indexOf(near));
      let rec = this._reacted.get(npc);
      if (!rec) { rec = {}; this._reacted.set(npc, rec); }
      if (now - (rec[key] || 0) < REACT_CD) continue;
      if (spoke >= MAX_REACT_PER_TICK) continue;
      rec[key] = now;
      spoke++;

      const bravery = npc.personality?.bravery ?? 0.5;
      if (bravery < 0.35) {
        // 胆小的：喊着跑，有概率跑去报警
        npc.brain.say(PANIC_LINES[Math.floor(Math.random() * PANIC_LINES.length)], 2.6);
        this.moodFx?.(npc, "scared");
        // report 必须交给 fleeFrom：它内部会重置 _reportCrime，先设后调会被抹掉
        npc.brain.fleeFrom?.(near.pos, { report: Math.random() < 0.5 });
      } else if (nd < AVOID_DIST + 2) {
        // 走近了看清的：低声嫌弃着绕开
        npc.brain.say(AVOID_LINES[Math.floor(Math.random() * AVOID_LINES.length)], 2.4);
        this.moodFx?.(npc, "shocked");
      } else {
        // 远远看见的：吓一跳
        npc.brain.say(SHOCK_LINES[Math.floor(Math.random() * SHOCK_LINES.length)], 2.8);
        this.moodFx?.(npc, "shocked");
        npc.shakeFor?.(0.5, 0.16);
      }
    }
  }

  /** 给 NPC 一个绕开尸体的落脚点：沿尸体→NPC 方向再往外推，并侧移一点 */
  _avoid(npc, corpse) {
    const dx = npc.pos.x - corpse.pos.x;
    const dz = npc.pos.z - corpse.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    // 侧向绕行（垂直方向），比单纯后退更像"绕过去"
    const side = npc._corpseSide ?? (npc._corpseSide = Math.random() < 0.5 ? 1 : -1);
    const target = {
      x: corpse.pos.x + nx * (AVOID_DIST + 1.6) + -nz * side * 2.2,
      z: corpse.pos.z + nz * (AVOID_DIST + 1.6) + nx * side * 2.2,
    };
    // 借用剧场的走位通道：短时间接管，走开就自动释放
    if (!npc.brain._perform) {
      npc.brain.takeOver?.({ moveTo: target, speedMul: 1.2, arriveDist: 1.0, immune: false });
      setTimeout(() => {
        if (npc.brain?._perform && !npc.brain._perform.sceneToken) npc.brain.release?.();
      }, 2200);
    }
  }
}
