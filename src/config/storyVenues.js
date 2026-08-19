// storyVenues.js —— 故事地点的权威登记表。
//
// 为什么需要这一层：
//   故事节点原本只有 `candidateDeliveries[].venueTags`，而 40 个节点里有 23 个
//   一个 tag 都没有。手机来信的"📍去看看"于是落到"玩家前方 14 米"这种兜底点，
//   跟文案里写的地方（"回营地来""驻地议事厅"）完全对不上 —— 玩家走过去发现
//   不是帮派营地，也没人。
//
//   这里把每个地点收敛成一个**稳定 id**，并统一解析成镇上真实建筑的**门口坐标**
//   （town.doors 是可进入建筑的入口点，比 landmark 的建筑中心可靠 —— 中心点在
//   碰撞体里，玩家走不进去）。
//
// 解析优先级：town.doors（门口）→ town.places（场所池）→ 专用坐标（驻地大门等）。

/**
 * 地点定义。
 *  - label    : 玩家可见的地点名
 *  - building : 对应 town.doors 里的建筑名（可进入建筑走门口）
 *  - place    : 对应 town.places 的分类键
 *  - special  : 需要特殊算法的（驻地大门、镇北路口）
 */
export const VENUE_DEFS = {
  saloon:      { label: "酒馆",       building: "酒馆" },
  saloon_back: { label: "酒馆后巷",   building: "酒馆后门" },
  bank:        { label: "银行",       building: "银行" },
  bank_back:   { label: "银行后巷",   building: "银行后门" },
  store:       { label: "杂货店",     building: "杂货店" },
  store_back:  { label: "杂货店后院", building: "杂货店后门" },
  sheriff:     { label: "警长办公室", building: "警长办公室" },
  hotel:       { label: "旅馆",       building: "旅馆" },
  smith:       { label: "铁匠铺",     building: "铁匠铺" },
  post:        { label: "邮局",       building: "邮局" },
  barber:      { label: "理发店",     building: "理发店" },
  stables:     { label: "马厩",       building: "马厩" },
  church:      { label: "教堂",       building: "教堂" },
  paper:       { label: "报社",       building: "报社" },
  clinic:      { label: "医馆",       building: "医馆" },
  gunsmith:    { label: "枪械店",     building: "枪械店" },
  casino:      { label: "赌场",       building: "赌场" },
  casino_back: { label: "赌场后巷",   building: "赌场后门" },
  diner:       { label: "餐馆",       building: "餐馆" },
  tailor:      { label: "裁缝铺",     building: "裁缝铺" },
  // 驻地有室内（Interiors 里的"帮派驻地"），所以显式给出 interior ——
  // 否则"驻地议事厅"这种明显在屋里的场景会因为"hq 不可进屋"被迫改到别处。
  hq:          { label: "帮派驻地",   special: "compound", interior: "帮派驻地" },
  plaza:       { label: "镇中广场",   place: "plaza", placeName: "广场" },
  north_road:  { label: "镇北路口",   special: "north_road" },
};

/**
 * 把 venueId 解析成世界坐标。
 *
 * 返回的点保证**站得住**：最后一律过一遍 town.resolveCollision。
 * 不这样做会出现"目标点在碰撞体里"——实测帮派驻地的院落大门就压在围院
 * 矩形里（推移 0.95m），寻路只能退到附近格子，玩家看着像卡在墙上。
 *
 * @returns {{x:number,z:number,label:string,venueId:string}|null}
 */
export function resolveVenue(town, venueId) {
  const raw = _resolveRaw(town, venueId);
  if (!raw) return null;
  if (town.resolveCollision) {
    const safe = town.resolveCollision(raw.x, raw.z, 0.5);
    return { ...raw, x: safe.x, z: safe.z };
  }
  return raw;
}

function _resolveRaw(town, venueId) {
  const def = VENUE_DEFS[venueId];
  if (!def || !town) return null;

  // 1) 可进入建筑：走门口（town.doors 存的就是朝街那侧的入口）
  if (def.building) {
    const d = (town.doors || []).find((x) => x.name === def.building);
    if (d) return { x: d.x, z: d.z, label: def.label, venueId };
    // 后门缺失（不是每栋楼都有后门）→ 退到正门
    if (def.building.endsWith("后门")) {
      const main = def.building.replace("后门", "");
      const md = (town.doors || []).find((x) => x.name === main);
      if (md) return { x: md.x, z: md.z, label: def.label, venueId };
    }
  }

  // 2) 场所池。注意不能直接取 [0]：places.plaza 的第一项是 _buildNature 塞进去的
  //    "公园"（在镇子最北边 z≈138），而不是镇中心广场 —— 于是"集市北口"会把
  //    玩家指到镇北的公园去。按名字优先挑，再退到离镇中心最近的一个。
  if (def.place) {
    const bucket = town.places?.[def.place];
    if (bucket?.length) {
      const preferred = def.placeName ? bucket.find((p) => p.name === def.placeName) : null;
      const p = preferred
        || bucket.slice().sort((a, b) => (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z))[0];
      return { x: p.x, z: p.z, label: def.label, venueId };
    }
  }

  // 3) 特殊点
  if (def.special === "compound") {
    const c = town.compound;
    // 院落大门（北侧朝主街）—— 玩家从街上过来的自然落点
    if (c) return { x: c.gateX ?? c.gate?.x ?? c.x, z: c.gateZ ?? c.gate?.z ?? c.z, label: def.label, venueId };
    const hq = town.places?.hq?.[0];
    if (hq) return { x: hq.x, z: hq.z, label: def.label, venueId };
  }
  if (def.special === "north_road") {
    // 主街北端。town.bounds 是整张图的半径（180），不是主街长度，
    // 用 core 附近更靠谱；取不到就退到 bounds 的一半。
    const z = -((town.core ?? (town.bounds ?? 60) / 2) - 12);
    return { x: 0, z, label: def.label, venueId };
  }
  return null;
}

/**
 * 这个地点对应的可进入建筑名（用于把戏摆到室内）。
 * 后门/广场/路口这些本来就在户外，返回 null。
 * @returns {string|null} Interiors 里的房间名
 */
export function interiorNameOf(venueId) {
  const def = VENUE_DEFS[venueId];
  if (!def) return null;
  if (def.interior) return def.interior;            // 显式声明（驻地）
  if (!def.building) return null;
  if (def.building.endsWith("后门")) return null;   // 后巷是户外
  return def.building;
}

/**
 * 这一幕该不该在屋里演。
 *
 * **优先读节点自己声明的 `indoor` 布尔值**（storyBeatText 里由生成脚本写死）。
 * 之前是用正则去读散文猜，实测在 13 个建筑类地点里判错 6 个：
 * "酒馆角落""警长办公室""镇西诊所"全被当成户外，"酒馆门廊"反被当成室内。
 * 正则只留给没有该字段的老数据兜底。
 *
 * @param {string} venueId
 * @param {string} description 画面描写
 * @param {string} label locateLabel
 * @param {boolean|undefined} declared 节点声明的 indoor（有就直接用）
 * @returns {boolean}
 */
export function isIndoorScene(venueId, description = "", label = "", declared = undefined) {
  // 地点本身不是可进入建筑（后巷/广场/路口/驻地大门）→ 无论声明什么都在户外
  if (!interiorNameOf(venueId)) return false;
  if (typeof declared === "boolean") return declared;
  // ---- 以下仅为老数据兜底 ----
  const INDOOR = /屋里|屋内|里的|里头|吧台|柜台|桌前|靠窗桌|角落|炉边|灯影|诊台|长凳|祭坛|忏悔室|厅里|后院/;
  const OUTDOOR = /门前|门口|门外|台阶|廊|巷|街上|檐下|窗外|路口/;
  const d = String(description);
  if (INDOOR.test(d)) return true;
  if (OUTDOOR.test(d)) return false;
  const s = String(label);
  if (OUTDOOR.test(s)) return false;
  return INDOOR.test(s);
}

/**
 * 建筑类关键词 —— 能独立确定一个地点。
 * 顺序即优先级（同一段文字里出现多个时取靠前的）。
 * @param {boolean} isBack 是否是"后门/后巷"侧
 */
function buildingKeywords(isBack) {
  return [
    [/酒馆|吧台|酒保/, isBack ? "saloon_back" : "saloon"],
    [/驻地|营地|议事厅/, "hq"],
    [/警长|警局/, "sheriff"],
    [/诊所|医馆|药铺/, "clinic"],
    [/马厩/, "stables"],
    [/教堂|忏悔室|牧师/, "church"],
    [/集市|广场|摊(前|位)?|老摊/, "plaza"],
    [/赌场/, isBack ? "casino_back" : "casino"],
    [/杂货|仓库|货栈/, isBack ? "store_back" : "store"],
    [/银行/, isBack ? "bank_back" : "bank"],
    [/铁匠/, "smith"],
    [/报社/, "paper"],
    [/枪械/, "gunsmith"],
    [/餐馆|饭馆/, "diner"],
    [/裁缝/, "tailor"],
    [/旅馆|客栈/, "hotel"],
    [/邮局/, "post"],
    [/理发/, "barber"],
    // 镇外/边缘：猎户住镇外，矿道石桥也在北边
    [/镇北|北路|北土路|石桥|镇口|矿(坑|道|场)?口?|废矿|猎户|猎人/, "north_road"],
  ];
}

/**
 * 附属物关键词 —— 只是建筑的一个部件，本身不足以定位，
 * 但当整段文字都找不到建筑名时可以作为最后线索。
 * （"马槽/拴马桩"通常在马厩，但也可能在酒馆后门，所以优先级低于建筑名。）
 */
const FEATURE_KEYWORDS = [
  [/马槽|拴马桩|马夫/, "stables"],
];

/**
 * 从文案 / venueTags / 投放通道推断该用哪个 venueId。
 *
 * 为什么这么绕：三个来源都不完全可靠。
 *   - venueTags 结构化，但 40 个节点里 23 个是空的。
 *   - locateLabel 跟玩家看到的字面意思一致（最该尊重），但常省略主语
 *     （"后门马槽旁"没说是哪栋楼的后门）。
 *   - description / phoneInvite 信息全，但会捎带无关地名
 *     （"警长让你去一趟镇口" —— 地点是镇口，不是警长办公室）。
 *
 * 所以按这个顺序：
 *   ① locateLabel 里的**建筑名**（最权威：文案与落点必须一致）
 *   ② 补充文案里的**建筑名**（补全 label 省掉的主语）
 *   ③ locateLabel 里的**附属物**（马槽 → 马厩）
 *   ④ venueTags → ⑤ channel === "hq"
 *
 * "后门/后巷"只从 locateLabel 判 —— 补充文案里提到别处的后门不该影响本节点。
 *
 * @param {string} label   locateLabel（如"酒馆后墙根"）
 * @param {string[]} tags  venueTags
 * @param {string[]} channels candidateDeliveries 的 channel 列表
 * @param {string} context 补充文案（description + phoneInvite），用于补全省略的主语
 * @returns {string|null}
 */
export function inferVenueId(label = "", tags = [], channels = [], context = "") {
  const lab = String(label);
  const ctx = String(context);
  const isBack = /后(门|墙|巷|院|桌|台阶)/.test(lab);
  const kw = buildingKeywords(isBack);

  // ① label 里的建筑名
  for (const [re, id] of kw) if (re.test(lab)) return id;
  // ② 补充文案里的建筑名（label 省了主语时靠这个）
  for (const [re, id] of kw) if (re.test(ctx)) return id;
  // ③ label 里的附属物
  for (const [re, id] of FEATURE_KEYWORDS) if (re.test(lab)) return id;

  // ④ 退到 venueTags
  const TAG_MAP = {
    saloon: "saloon", plaza: "plaza", hq: "hq", clinic: "clinic",
    sheriff_office: "sheriff", warehouse: "store", north_road: "north_road",
    church: "church", shop: "store",
  };
  for (const t of tags) {
    if (TAG_MAP[t]) return TAG_MAP[t];
  }

  // ⑤ 最后看通道
  if (channels.includes("hq")) return "hq";
  return null;
}
