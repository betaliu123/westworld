// theaterRoleGender.js — 剧本角色的性别约束（覆盖层）。
//
// 为什么需要：8 棵树共 ~32 个角色，只有 saloon_triangle/center（萝丝）在树里
// 声明了 female。其余像"得州比利""酒保山姆""遗孀艾达""孩子的母亲"这种名字
// 明摆着有性别的角色都没声明，而 Casting 只在 role.female 存在时才算性别分，
// 于是女模型的路人被派去演"得州比利"，名字和外观对不上。
//
// 为什么单独一个文件：5 棵树的定义在 theaterEvents.js 里是 5000+ 行的生成产物，
// 直接改内联字段风险大且难 review。这里按 "treeId/roleId" 做覆盖，
// 与 theaterBeatTo.js / theaterExtras.js 同一套路子。
//
// 取值：false = 必须男性，true = 必须女性，不写 = 不限（Casting 自由挑）。
// 只给"名字明确指向某个性别"的角色加约束；像"灰帽子"这种中性代号故意不限，
// 免得把可选池卡太死导致开不了场。

export const ROLE_GENDER = {
  // 正午决斗
  "high_noon_duel/gunA": false,        // 汉克
  "high_noon_duel/gunB": false,        // 疤脸乔
  "high_noon_duel/judge": false,       // 老崔

  // 酒馆门口的争风
  "saloon_triangle/center": true,      // 萝丝（树里已声明，这里对齐留档）
  "saloon_triangle/suitorA": false,    // 得州比利
  "saloon_triangle/suitorB": false,    // 赌鬼费恩
  "saloon_triangle/confidant": false,  // 酒保山姆

  // 街角扒手
  "street_pickpocket/thief": false,    // 瘦子威利
  "street_pickpocket/victim": false,   // 货商麦克
  "street_pickpocket/witness": true,   // 老玛莎

  // 银行门口的通缉犯
  "bank_bounty/hunter": false,         // 凯尔·摩根
  "bank_bounty/clerk": false,          // 银行的芬奇
  // suspect「灰帽子」是中性代号，不限性别

  // 马厩的偷马贼
  "stable_horsethief/groom": false,    // 老马夫伊莱
  "stable_horsethief/thief": false,    // 瘦子卢克
  "stable_horsethief/buyer": false,    // 外乡人韦德

  // 井边的水权
  "well_waterright/farmer": false,     // 农户巴克利
  "well_waterright/digger": false,     // 淘金客芬恩
  "well_waterright/elder": true,       // 老镇民玛莎

  // 医生门前的两个伤号
  "doctor_triage/doc": true,           // 医生海丝特
  "doctor_triage/miner": false,        // 断腿的塔克
  "doctor_triage/mother": true,        // 孩子的母亲

  // 棺材前的遗产
  "funeral_will/priest": false,        // 牧师伊诺克
  "funeral_will/widow": true,          // 遗孀艾达
  "funeral_will/brother": false,       // 死者的弟弟
};

/**
 * 取某个角色要求的性别。
 * 树里内联的 role.female 优先（作者显式写的最权威），其次查覆盖层。
 * @returns {boolean|null} null = 不限
 */
export function roleGenderOf(treeId, role) {
  if (role && role.female != null) return role.female;
  const v = ROLE_GENDER[`${treeId}/${role?.roleId}`];
  return v == null ? null : v;
}
