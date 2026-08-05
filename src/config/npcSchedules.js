// npcSchedules.js — 【DS 自动生成 + 二次平衡】有人设 NPC 的细化七段作息。
//
// 为什么需要：npcData.js 里手写的 4 段日程从未被读取（NPCManager 分配身份时
// 漏了拷 def.schedule），所有人都退回 JOB_SCHEDULE 的按职业通用表 ——
// 于是"日程和人设毫无关系"，且傍晚 9/14 种职业全挤进只有 2 栋楼的 saloon。
//
// 场所类型只能是这六个（Town.places 的键）：home/work/saloon/plaza/shop/church
// 容量：shop 8 栋 · work 4 栋 · plaza 3 处(露天) · saloon 2 栋 · church 1 栋
//
// 生成流程是两遍：第一遍按人设写，第二遍检查各时段是否有场所超载并定向分流
// （分流时要求保留人设核心时段与"值得尾随"的反常钩子）。
//
// 时段与 AIBrain.daySegment 的七段一致；每个 NPC 另有 personality.scheduleJitter
// （±33 分钟）做个体错峰，所以实际切换时刻不会全镇对齐。
//
// 消费方：NPCManager 分配重要 NPC 身份时优先取这里的表。
// 生成于 2026-08-05，共 17 人

export const NPC_SCHEDULES = {
 "npc_erin": {
  "dawn": "home",
  "morning": "saloon",
  "noon": "shop",
  "afternoon": "shop",
  "evening": "plaza",
  "night": "home",
  "latenight": "plaza",
  "note": "深夜在广场与人秘密碰头，缓解经济压力。"
 },
 "npc_jack": {
  "dawn": "home",
  "morning": "plaza",
  "noon": "plaza",
  "afternoon": "shop",
  "evening": "plaza",
  "night": "home",
  "latenight": "plaza",
  "note": "老兵深夜在广场徘徊，为心魔所困。"
 },
 "npc_martha": {
  "dawn": "work",
  "morning": "work",
  "noon": "work",
  "afternoon": "work",
  "evening": "church",
  "night": "home",
  "latenight": "work",
  "note": "深夜急诊救治伤者，不分身份。"
 },
 "npc_noah": {
  "dawn": "home",
  "morning": "plaza",
  "noon": "shop",
  "afternoon": "work",
  "evening": "work",
  "night": "home",
  "latenight": "work",
  "note": "深夜报社密会维克托，交易情报。"
 },
 "npc_silas": {
  "dawn": "home",
  "morning": "saloon",
  "noon": "saloon",
  "afternoon": "saloon",
  "evening": "saloon",
  "night": "saloon",
  "latenight": "plaza",
  "note": "深夜离开酒馆，广场密会神秘人。"
 },
 "npc_victor": {
  "dawn": "home",
  "morning": "plaza",
  "noon": "saloon",
  "afternoon": "plaza",
  "evening": "work",
  "night": "plaza",
  "latenight": "work",
  "note": "深夜潜入报社，与记者秘密策划。"
 },
 "npc_rosa": {
  "dawn": "plaza",
  "morning": "saloon",
  "noon": "shop",
  "afternoon": "shop",
  "evening": "shop",
  "night": "plaza",
  "latenight": "home",
  "note": "黎明独自在广场漫步，避开耳目规划暗局"
 },
 "npc_eli": {
  "dawn": "home",
  "morning": "home",
  "noon": "home",
  "afternoon": "home",
  "evening": "home",
  "night": "home",
  "latenight": "plaza",
  "note": "深夜独自在广场徘徊，藏匿着逃犯的秘密"
 },
 "npc_hector": {
  "dawn": "home",
  "morning": "work",
  "noon": "work",
  "afternoon": "work",
  "evening": "plaza",
  "night": "saloon",
  "latenight": "home",
  "note": "深夜微醺地踏入赌场，与黑蹄会达成某种默契"
 },
 "npc_amos": {
  "dawn": "church",
  "morning": "shop",
  "noon": "shop",
  "afternoon": "shop",
  "evening": "shop",
  "night": "home",
  "latenight": "home",
  "note": "天未亮便跪在教堂长椅上，忏悔对金钱的贪欲"
 },
 "npc_bessie": {
  "dawn": "home",
  "morning": "shop",
  "noon": "saloon",
  "afternoon": "saloon",
  "evening": "saloon",
  "night": "home",
  "latenight": "plaza",
  "note": "深夜在广场角落递给陌生人一张纸条"
 },
 "npc_thomas": {
  "dawn": "plaza",
  "morning": "work",
  "noon": "work",
  "afternoon": "work",
  "evening": "plaza",
  "night": "home",
  "latenight": "home",
  "note": "天刚亮就在广场向工人演讲，点燃反抗火种"
 },
 "npc_carl": {
  "dawn": "home",
  "morning": "home",
  "noon": "plaza",
  "afternoon": "plaza",
  "evening": "plaza",
  "night": "saloon",
  "latenight": "plaza",
  "note": "午后广场偷看私生子，深夜游荡避追捕"
 },
 "npc_wei": {
  "dawn": "home",
  "morning": "shop",
  "noon": "shop",
  "afternoon": "plaza",
  "evening": "home",
  "night": "church",
  "latenight": "home",
  "note": "深夜独往教堂，忏悔当年矿场秘密"
 },
 "npc_lillian": {
  "dawn": "home",
  "morning": "home",
  "noon": "home",
  "afternoon": "plaza",
  "evening": "saloon",
  "night": "saloon",
  "latenight": "home",
  "note": "午后广场散步，实为秘密接头发报"
 },
 "npc_brown": {
  "dawn": "church",
  "morning": "church",
  "noon": "home",
  "afternoon": "church",
  "evening": "church",
  "night": "home",
  "latenight": "church",
  "note": "深夜独在教堂，为全镇秘密忧心祷告"
 },
 "npc_mary": {
  "dawn": "home",
  "morning": "shop",
  "noon": "saloon",
  "afternoon": "saloon",
  "evening": "saloon",
  "night": "plaza",
  "latenight": "home",
  "note": "深夜广场读诗，等待神秘情人现身"
 }
};
