// Homes.js — 民居生成：在主街两侧商铺背后的空地散布带烟囱的小屋。
// 每栋民居登记为一个 home 对象（门窗/住户/藏物/室内引用），供作息、行窃、小地图共用。

import { createBuilding } from "./Buildings.js";
import { createMailbox, createFence } from "./Props.js";
import { randRange } from "../core/MathUtils.js";
import { HOMES } from "../config/gameData.js";

/**
 * 在小镇上生成民居。直接读写 town 的 colliders / landmarks / group。
 * @returns {Array} home 列表：
 *   { id, name, x, z, doorX, doorZ, windows, occupants, stashAmount, stashTaken,
 *     interiorName, exitPoint, stashPoint, stashMarker, bedSpots }
 */
export function buildHomes(town) {
  const homes = [];
  const perSide = Math.ceil(HOMES.count / 2);

  for (const side of [-1, 1]) {
    let placed = 0;
    let attempts = 0;
    while (placed < perSide && attempts < 160) {
      attempts++;
      const x = side * randRange(HOMES.minX, HOMES.maxX);
      const z = randRange(-town.core + 14, town.core - 14);
      if (!town._scatterClear(x, z, 6)) continue;

      const width = randRange(6, 8);
      const depth = randRange(5, 6.5);
      const height = randRange(3, 4);
      const b = createBuilding({
        name: "民居",
        width,
        depth,
        height,
        chimney: true,
        hasPorch: Math.random() < 0.5,
      });
      b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; // 门面向主街
      b.position.set(x, 0, z);
      town.group.add(b);
      town._addRectCollider(x, z, depth / 2 + 0.4, width / 2 + 0.4);

      const doorX = x < 0 ? x + depth / 2 + 1.3 : x - depth / 2 - 1.3;
      const home = {
        id: `home_${side < 0 ? "W" : "E"}${placed}`,
        name: "民居",
        x, z,
        doorX, doorZ: z,
        windows: b.userData.windows || [],
        occupants: [],          // NPCManager 分配住户后填充
        stashAmount: 0,
        stashTaken: false,
        interiorName: `home_${side < 0 ? "W" : "E"}${placed}`,
        exitPoint: null,        // 由 Interiors.addNpcHomeRoom 回填
        stashPoint: null,
        stashMarker: null,
        bedSpots: [],
      };
      homes.push(home);

      // 门口邮箱
      const mb = createMailbox();
      mb.position.set(doorX + (x < 0 ? -0.5 : 0.5), 0, z + 1.3);
      town.group.add(mb);

      // 部分民居带小院栅栏
      if (Math.random() < 0.55) {
        const fence = createFence(randRange(6, 9));
        fence.position.set(x, 0, z + width / 2 + 2.4);
        fence.rotation.y = randRange(-0.15, 0.15);
        town.group.add(fence);
      }

      // 小地图地标
      town.landmarks.push({ name: "民居", x, z, kind: "home" });
      placed++;
    }
  }
  return homes;
}
