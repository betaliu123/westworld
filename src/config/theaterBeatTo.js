// theaterBeatTo.js — 【DS 自动生成】每句台词「对谁说」的标注。
//
// 为什么单独一个文件：8 棵剧本树共 412 句台词，直接改内联 beat 对象风险大；
// 这里按 "treeId/nodeId" -> 与 beats 顺序对齐的数组 做覆盖层，
// 与 theaterExtras.js / theaterReactByNode.js 同一套路子。
//
// 取值：roleId（对那个演员说）| "player"（冲玩家说）| "all"（对全场喊）
// 消费方：TheaterRuntime._scheduleBeats 注入到 beat.to，再由 _faceAddressee 决定朝向。
// beat 自带的 to / facePlayer 优先级更高，不会被这里覆盖。
//
// 生成于 2026-08-03，共 154 个节点 / 412 句
// 分布：all=143  player=99  doc=16  center=14  hunter=14  victim=13  thief=12  digger=12  suitorA=9  miner=9  gunB=8  brother=8  suspect=7  mother=7  gunA=6  suitorB=5  groom=5  widow=5  judge=4  buyer=3  farmer=3  elder=3  confidant=2  crowd=2  clerk=2  witness=1

export const BEAT_TO = {
 "high_noon_duel/st": [
  "all",
  "gunB",
  "gunA",
  "all"
 ],
 "high_noon_duel/why": [
  "judge",
  "gunA",
  "all"
 ],
 "high_noon_duel/truth": [
  "all",
  "judge",
  "all"
 ],
 "high_noon_duel/inspect": [
  "player",
  "all",
  "all"
 ],
 "high_noon_duel/warnA": [
  "player",
  "gunB",
  "gunA"
 ],
 "high_noon_duel/bet": [
  "all",
  "player",
  "all"
 ],
 "high_noon_duel/persuade": [
  "player",
  "gunA",
  "player"
 ],
 "high_noon_duel/cards": [
  "player",
  "gunB",
  "judge",
  "all"
 ],
 "high_noon_duel/watch": [
  "all",
  "all",
  "all"
 ],
 "high_noon_duel/standoff": [
  "player",
  "gunB",
  "all"
 ],
 "high_noon_duel/clash": [
  "all",
  "all",
  "all",
  "all"
 ],
 "high_noon_duel/e_fair": [
  "all",
  "all",
  "all"
 ],
 "high_noon_duel/e_peace": [
  "gunB",
  "gunA",
  "all"
 ],
 "high_noon_duel/e_cards": [
  "all",
  "gunA",
  "all"
 ],
 "high_noon_duel/e_rigged": [
  "gunB",
  "judge",
  "gunB"
 ],
 "high_noon_duel/e_loot": [
  "all",
  "player",
  "player"
 ],
 "high_noon_duel/grd": [
  "all",
  "gunB",
  "all"
 ],
 "high_noon_duel/e_chaos": [
  "all",
  "all",
  "all"
 ],
 "saloon_triangle/st": [
  "suitorB",
  "suitorA",
  "all",
  "all"
 ],
 "saloon_triangle/a1": [
  "suitorB",
  "player",
  "suitorA"
 ],
 "saloon_triangle/b1": [
  "player",
  "player",
  "suitorA"
 ],
 "saloon_triangle/persuadeB": [
  "player",
  "player",
  "player"
 ],
 "saloon_triangle/secret": [
  "player",
  "player",
  "confidant"
 ],
 "saloon_triangle/expose": [
  "suitorA",
  "center",
  "all"
 ],
 "saloon_triangle/g1": [
  "all",
  "all",
  "center",
  "suitorA"
 ],
 "saloon_triangle/g2": [
  "all",
  "all",
  "center",
  "center"
 ],
 "saloon_triangle/g_pushA": [
  "player",
  "player",
  "confidant"
 ],
 "saloon_triangle/g_pushB": [
  "player",
  "center",
  "center"
 ],
 "saloon_triangle/g3": [
  "all",
  "center",
  "center"
 ],
 "saloon_triangle/duelrisk": [
  "suitorB",
  "suitorA",
  "all",
  "all"
 ],
 "saloon_triangle/e_choose_a": [
  "suitorA",
  "center",
  "all"
 ],
 "saloon_triangle/e_choose_b": [
  "suitorB",
  "center",
  "center"
 ],
 "saloon_triangle/e_neither": [
  "all",
  "all",
  "crowd"
 ],
 "saloon_triangle/e_leave": [
  "all",
  "center",
  "center"
 ],
 "saloon_triangle/e_ticket": [
  "player",
  "player",
  "all"
 ],
 "saloon_triangle/e_justice": [
  "player",
  "center",
  "suitorA"
 ],
 "saloon_triangle/e_greed": [
  "player",
  "player",
  "all"
 ],
 "saloon_triangle/e_peace": [
  "player",
  "suitorA",
  "player"
 ],
 "saloon_triangle/e_shootout": [
  "all",
  "all",
  "all"
 ],
 "saloon_triangle/grd": [
  "all",
  "suitorB",
  "all"
 ],
 "street_pickpocket/st": [
  "all",
  "all",
  "crowd",
  "witness"
 ],
 "street_pickpocket/warn": [
  "thief",
  "all",
  "victim"
 ],
 "street_pickpocket/stare": [
  "all",
  "player",
  "all"
 ],
 "street_pickpocket/ignore": [
  "all",
  "all",
  "victim"
 ],
 "street_pickpocket/follow": [
  "all",
  "player"
 ],
 "street_pickpocket/block": [
  "player",
  "player",
  "victim"
 ],
 "street_pickpocket/confront": [
  "victim",
  "thief",
  "all"
 ],
 "street_pickpocket/why": [
  "victim",
  "victim",
  "thief",
  "victim"
 ],
 "street_pickpocket/comfort": [
  "player",
  "victim"
 ],
 "street_pickpocket/cover": [
  "all",
  "victim",
  "player"
 ],
 "street_pickpocket/e_hero": [
  "player",
  "player",
  "player"
 ],
 "street_pickpocket/e_peaceful": [
  "victim",
  "thief",
  "all"
 ],
 "street_pickpocket/e_kind": [
  "player",
  "player",
  "all"
 ],
 "street_pickpocket/e_escape": [
  "player",
  "all"
 ],
 "street_pickpocket/e_scared_off": [
  "player",
  "player"
 ],
 "street_pickpocket/e_dark": [
  "player",
  "all",
  "all"
 ],
 "street_pickpocket/e_cover": [
  "thief",
  "victim"
 ],
 "street_pickpocket/e_brutal": [
  "victim",
  "victim",
  "thief"
 ],
 "street_pickpocket/grd": [
  "all",
  "all",
  "all"
 ],
 "bank_bounty/st": [
  "suspect",
  "hunter",
  "hunter",
  "all"
 ],
 "bank_bounty/investigate": [
  "suspect",
  "hunter",
  "hunter"
 ],
 "bank_bounty/question_hunter": [
  "clerk",
  "hunter",
  "all"
 ],
 "bank_bounty/check_alibi": [
  "hunter",
  "clerk"
 ],
 "bank_bounty/verify_alibi": [
  "hunter",
  "hunter",
  "all"
 ],
 "bank_bounty/defend_suspect": [
  "player",
  "player",
  "all"
 ],
 "bank_bounty/force_release": [
  "player",
  "player"
 ],
 "bank_bounty/assist_hunter": [
  "player",
  "player"
 ],
 "bank_bounty/step_back": [
  "hunter",
  "suspect",
  "all"
 ],
 "bank_bounty/chase": [
  "player",
  "hunter"
 ],
 "bank_bounty/capture": [
  "hunter",
  "suspect"
 ],
 "bank_bounty/duel": [
  "all",
  "player"
 ],
 "bank_bounty/bribe": [
  "suspect",
  "player"
 ],
 "bank_bounty/warning_shot": [
  "player",
  "all"
 ],
 "bank_bounty/sheriff": [
  "all",
  "hunter",
  "player"
 ],
 "bank_bounty/e_passive": [
  "all",
  "player"
 ],
 "bank_bounty/e_bloody1": [
  "hunter",
  "suspect"
 ],
 "bank_bounty/e_bloody2": [
  "suspect",
  "all"
 ],
 "bank_bounty/e_truth1": [
  "all",
  "player"
 ],
 "bank_bounty/e_truth2": [
  "hunter",
  "all"
 ],
 "stable_horsethief/st": [
  "thief",
  "groom",
  "thief"
 ],
 "stable_horsethief/n1_ask_groom": [
  "player",
  "player"
 ],
 "stable_horsethief/n2_side_buyer": [
  "player",
  "buyer"
 ],
 "stable_horsethief/n3_threaten": [
  "player",
  "player"
 ],
 "stable_horsethief/n4_listen_luke": [
  "player",
  "player"
 ],
 "stable_horsethief/n5_side_luke": [
  "player",
  "player"
 ],
 "stable_horsethief/n6_check_receipt": [
  "buyer",
  "groom",
  "all"
 ],
 "stable_horsethief/n7_drive_groom": [
  "all",
  "groom"
 ],
 "stable_horsethief/n8_force_luke": [
  "player",
  "thief"
 ],
 "stable_horsethief/n9_let_luke_go": [
  "player",
  "player"
 ],
 "stable_horsethief/n10_face_wade": [
  "thief",
  "buyer"
 ],
 "stable_horsethief/n12_threaten_groom": [
  "player",
  "player"
 ],
 "stable_horsethief/n13_help_luke_escape": [
  "all",
  "all"
 ],
 "stable_horsethief/n15_fight_groom": [
  "player",
  "all"
 ],
 "stable_horsethief/n16_pay_off": [
  "player",
  "groom"
 ],
 "stable_horsethief/e_truth": [
  "player",
  "all"
 ],
 "stable_horsethief/e_luke_escape": [
  "all",
  "all"
 ],
 "stable_horsethief/e_shootout": [
  "all",
  "all"
 ],
 "stable_horsethief/e_timeout": [
  "groom",
  "all",
  "thief"
 ],
 "stable_horsethief/e_buyer_killed": [
  "all",
  "thief"
 ],
 "well_waterright/st": [
  "digger",
  "farmer",
  "digger",
  "digger"
 ],
 "well_waterright/n_ask_elder": [
  "all",
  "elder",
  "digger"
 ],
 "well_waterright/n_search_hall": [
  "all",
  "player"
 ],
 "well_waterright/n_present_evidence": [
  "elder",
  "digger"
 ],
 "well_waterright/n_force_out": [
  "farmer",
  "digger"
 ],
 "well_waterright/n_burn_deed": [
  "digger",
  "player"
 ],
 "well_waterright/n_threat_farmer": [
  "digger",
  "digger"
 ],
 "well_waterright/n_confess_burn": [
  "digger",
  "elder"
 ],
 "well_waterright/n_admit_lie": [
  "farmer",
  "digger"
 ],
 "well_waterright/n_threat_digger": [
  "player",
  "player"
 ],
 "well_waterright/n_physically_remove": [
  "all",
  "player"
 ],
 "well_waterright/n_duel": [
  "player",
  "digger"
 ],
 "well_waterright/e_neglect": [
  "all"
 ],
 "well_waterright/e_truth": [
  "player"
 ],
 "well_waterright/e_blood1": [
  "all"
 ],
 "well_waterright/e_blood2": [
  "all"
 ],
 "well_waterright/e_unfair": [
  "all"
 ],
 "doctor_triage/st": [
  "doc",
  "doc",
  "all"
 ],
 "doctor_triage/q1": [
  "miner",
  "doc",
  "doc"
 ],
 "doctor_triage/ask_miner": [
  "doc",
  "miner",
  "doc"
 ],
 "doctor_triage/check_child": [
  "doc",
  "mother",
  "all"
 ],
 "doctor_triage/ask_mother": [
  "doc",
  "doc",
  "miner"
 ],
 "doctor_triage/truth_reveal": [
  "miner",
  "doc",
  "miner"
 ],
 "doctor_triage/side_miner": [
  "player",
  "player",
  "player"
 ],
 "doctor_triage/side_mother": [
  "player",
  "player",
  "player"
 ],
 "doctor_triage/insist_miner": [
  "miner",
  "doc",
  "doc"
 ],
 "doctor_triage/whiskey_miner": [
  "doc",
  "mother",
  "doc"
 ],
 "doctor_triage/threat_mother": [
  "miner",
  "doc",
  "all"
 ],
 "doctor_triage/watch1": [
  "all",
  "all",
  "doc"
 ],
 "doctor_triage/watch2": [
  "mother",
  "miner",
  "all"
 ],
 "doctor_triage/draw_gun": [
  "all",
  "player",
  "player"
 ],
 "doctor_triage/gun_standoff": [
  "mother",
  "miner",
  "all"
 ],
 "doctor_triage/e_ignore": [
  "all",
  "mother"
 ],
 "doctor_triage/e_death": [
  "all",
  "mother"
 ],
 "doctor_triage/e_truth": [
  "all",
  "mother"
 ],
 "doctor_triage/e_violence": [
  "all",
  "all"
 ],
 "doctor_triage/e_compromise": [
  "all",
  "all"
 ],
 "funeral_will/st": [
  "brother",
  "widow",
  "all",
  "all"
 ],
 "funeral_will/invest1": [
  "player",
  "all",
  "widow",
  "all"
 ],
 "funeral_will/invest_coffin": [
  "brother",
  "player",
  "all",
  "all"
 ],
 "funeral_will/invest_fake": [
  "all",
  "all",
  "all",
  "all"
 ],
 "funeral_will/help_widow": [
  "player",
  "player",
  "all"
 ],
 "funeral_will/negotiate_widow": [
  "player",
  "brother",
  "all"
 ],
 "funeral_will/violence_widow": [
  "player",
  "player",
  "all"
 ],
 "funeral_will/help_brother": [
  "player",
  "player",
  "all"
 ],
 "funeral_will/negotiate_brother": [
  "brother",
  "widow",
  "all"
 ],
 "funeral_will/violence_brother": [
  "brother",
  "widow",
  "all"
 ],
 "funeral_will/violence1": [
  "player",
  "player",
  "player",
  "all"
 ],
 "funeral_will/violence_open": [
  "all",
  "all",
  "brother"
 ],
 "funeral_will/violence_grab": [
  "widow",
  "brother",
  "all"
 ],
 "funeral_will/e_passive": [
  "all"
 ],
 "funeral_will/e_truth": [
  "all",
  "all"
 ],
 "funeral_will/e_bloody": [
  "all",
  "all"
 ],
 "funeral_will/e_peaceful": [
  "all",
  "all"
 ],
 "funeral_will/e_greed": [
  "brother",
  "all"
 ]
};
