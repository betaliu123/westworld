// aimedLines.js — 被玩家用枪指着时的喊话，按职业 × 反应档位
// 档位：plead（有交情，劝你放下）/ defy（凶悍，警告你）/ flee（害怕要跑）/ startled（普通人僵住）
// 由 deepseek-v4-pro 生成后校验：长度、无 emoji。找不到职业时用 DEFAULT。
// （占位：生成脚本跑完会覆盖本文件，补齐 15 个职业）

export const AIMED_LINES = {};

export const AIMED_DEFAULT = {
  plead: ["哎，枪放下，有话好说。", "你这是做什么？我们没那么生分。", "放下，我是你朋友啊。"],
  defy: ["你想清楚再动手，伙计。", "枪指错人了吧？", "我数三下，你把那玩意收起来。"],
  flee: ["别、别开枪！", "救命！他有枪！", "我什么都没做！"],
  startled: ["你、你要干什么？", "有话好说……", "把枪放下，先生。"],
};
