// PhoneData.js — 依 NPC 性格/职业程序化拼装一段"聊天记录"，制造窥见其生活的叙事感。

import { pick, randInt, chance, randRange } from "../core/MathUtils.js";
import {
  PHONE_FIRST as FIRST,
  PHONE_LAST as LAST,
  PHONE_CONTACTS as CONTACTS,
  PHONE_SCRIPTS as SCRIPTS,
  PHONE_GENERIC as GENERIC,
  GOSSIP,
  PHONE_HOUR_RANGE,
  GOSSIP_REWARD_RANGE,
  GOSSIP_CHANCE,
} from "../config/gameData.js";

let gossipSeq = 0;

function timeStamp(base) {
  const h = String(randInt(PHONE_HOUR_RANGE[0], PHONE_HOUR_RANGE[1])).padStart(2, "0");
  const m = String(randInt(0, 59)).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * @param {object} personality
 * @returns {object} { owner, job, threads:[{contact, messages:[{who, text, time}]}] }
 */
// 本局已用过的显示名：路人重名会让玩家分不清谁是谁
// （以前 12 个单名给 28 个 NPC 用，必然重名）
const usedOwners = new Set();

/** 取一个本局唯一的路人名（名·姓 组合，实在抽不出唯一名才允许重复） */
function uniqueOwner() {
  for (let i = 0; i < 40; i++) {
    const name = `${pick(FIRST)}·${pick(LAST)}`;
    if (!usedOwners.has(name)) {
      usedOwners.add(name);
      return name;
    }
  }
  const fallback = `${pick(FIRST)}·${pick(LAST)}`;
  usedOwners.add(fallback);
  return fallback;
}

export function generatePhone(personality) {
  const owner = uniqueOwner();
  const job = personality.job;
  const pool = SCRIPTS[job] || GENERIC;
  const threadCount = Math.min(pool.length, randInt(1, 2)) || 1;
  const chosen = [];
  const usedIdx = new Set();
  while (chosen.length < threadCount) {
    const i = randInt(0, pool.length - 1);
    if (usedIdx.has(i)) { if (usedIdx.size >= pool.length) break; else continue; }
    usedIdx.add(i);
    chosen.push(pool[i]);
  }
  // 至少补一条通用短讯，增加真实感
  if (chance(0.6)) chosen.push(pick(GENERIC));

  const threads = chosen.map(([contact, lines]) => {
    const messages = lines.map((text, idx) => ({
      who: idx % 2 === 0 ? contact : "我",
      me: idx % 2 === 1,
      text,
      time: timeStamp(),
    }));
    return { contact, messages };
  });

  // 有概率藏一条大八卦/密闻，可向报纸投稿换钱
  let gossip = null;
  const gpool = (GOSSIP[job] || []).filter(Boolean);
  if (gpool.length > 0 && chance(GOSSIP_CHANCE)) {
    const text = pick(gpool);
    const reward = randInt(GOSSIP_REWARD_RANGE[0], GOSSIP_REWARD_RANGE[1]);
    gossip = { id: `g${gossipSeq++}`, text, reward };
  }

  return { owner, job, wealthHint: personality.wealth, threads, gossip };
}
