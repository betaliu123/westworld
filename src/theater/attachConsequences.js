// attachConsequences.js — 把后果包挂到剧场结局节点上。
//
// theaterData.js 是静态配置，不宜直接改（保持数据与内容分离）。
// 在 boot 时把 theaterConsequences.js 的包按 `树id::节点id` 挂到
// outcome.consequences 上，这样 TheaterDirector 结算时读到的是完整后果包。
// 纯函数，幂等（重复调用同一棵树的 attach 不会重复挂）。

import { CONSEQUENCE_PACKS } from "../config/theaterConsequences.js";

export function attachTheaterConsequences(trees) {
  const list = Array.isArray(trees) ? trees : Object.values(trees || {});
  let attached = 0;
  for (const tree of list) {
    for (const node of tree.nodes || []) {
      if (!node.terminal || !node.outcome) continue;
      const key = `${tree.id}::${node.id}`;
      const pack = CONSEQUENCE_PACKS[key];
      if (pack) {
        node.outcome.consequences = pack;
        attached++;
      }
    }
  }
  return attached;
}
