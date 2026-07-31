// theaterEvents.js — AI 剧场的追加事件（由 deepseek-v4-pro 生成后经结构校验入库）
// 校验项：节点可达性、每个分支恰好 3 选项、终局 outcome 完整、角色白名单、
//         台词长度与无 emoji、reactions 覆盖全部角色的四种玩家行为、aftermath 覆盖各终局。
// 链接关系是校验过的，不要手改 next / entryNode / timeoutNode。

export const BANK_BOUNTY_TREE = {
  "id": "bank_bounty",
  "title": "银行门口的通缉犯",
  "hintOnEnter": "一个赏金猎人在银行台阶前拦住一个男人，说他是通缉令上的杀人犯",
  "roles": [
    {
      "roleId": "hunter",
      "name": "凯尔·摩根",
      "required": true,
      "jobs": [
        "赏金猎人",
        "神枪手",
        "警长"
      ]
    },
    {
      "roleId": "suspect",
      "name": "灰帽子",
      "required": true,
      "jobs": [
        "旅人",
        "马夫",
        "淘金客"
      ]
    },
    {
      "roleId": "clerk",
      "name": "银行的芬奇",
      "required": true,
      "jobs": [
        "商人",
        "记者",
        "医生"
      ]
    },
    {
      "roleId": "crowd",
      "name": null,
      "required": false,
      "jobs": [],
      "count": 2
    }
  ],
  "entryNode": "st",
  "unattendedMs": 70000,
  "timeoutNode": "e_passive",
  "idleLoop": [
    {
      "speaker": "crowd",
      "text": "我看那灰帽子不像杀人犯。",
      "delayMs": 2400,
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "赏金猎人总是胡乱抓人。",
      "delayMs": 2600,
      "mood": "angry"
    },
    {
      "speaker": "clerk",
      "text": "求你们别在银行门口闹。",
      "delayMs": 2800,
      "mood": "scared"
    }
  ],
  "reactions": {
    "hit": {
      "hunter": [
        "你敢打我？看来你也是逃犯同伙！",
        "吃枪子儿吧，小子！"
      ],
      "suspect": [
        "哎哟！我只是个赶车的，别打我！",
        "饶命！我身上没钱！"
      ],
      "clerk": [
        "别杀我！钥匙在柜台里，拿去！",
        "救命！银行抢劫啊！"
      ]
    },
    "bump": {
      "hunter": [
        "看着点！我正盯着通缉犯呢。",
        "撞个赏金猎人，你想挨枪子儿？"
      ],
      "suspect": [
        "先生，您撞疼我了……",
        "让开！我可不想惹麻烦。"
      ],
      "clerk": [
        "噢！银行今天不营业，别撞门。",
        "当心台阶，伙计。"
      ]
    },
    "steal": {
      "hunter": [
        "偷赏金条？做梦！",
        "你手放我枪套上了，活腻了？"
      ],
      "suspect": [
        "别碰我口袋！只有马料收据。",
        "我穷得叮当响，没啥好偷的。"
      ],
      "clerk": [
        "不准摸保险柜钥匙！",
        "警报！有人摸我口袋！"
      ]
    },
    "witness": {
      "hunter": [
        "住手！不然我连你一起铐。",
        "在我眼前动粗？你挑错地方了。"
      ],
      "suspect": [
        "别打他！你们讲不讲理？",
        "天啊，快住手！"
      ],
      "clerk": [
        "别在银行门口流血！走开！",
        "治安官！这儿有人打架！"
      ]
    }
  },
  "nodes": [
    {
      "id": "st",
      "title": "银行门口",
      "hint": "烈日下，赏金猎人用枪指着灰帽男子。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "站住，你就是通缉令上的杂种。",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "suspect",
          "text": "老天，你认错人了，伙计。",
          "delayMs": 1000,
          "mood": "scared"
        },
        {
          "speaker": "clerk",
          "text": "警长先生，我…我不能开门。",
          "delayMs": 1100,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "嘿，出什么事了？",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "查验通缉令",
          "icon": "❓",
          "risk": "low",
          "next": "investigate",
          "line": "让我看看那张通缉令。"
        },
        {
          "id": "c2",
          "label": "帮忙抓人",
          "icon": "⚔️",
          "risk": "medium",
          "next": "assist_hunter",
          "line": "我来帮你，赏金分我一半。"
        },
        {
          "id": "c3",
          "label": "不关我事",
          "icon": "➖",
          "risk": "low",
          "next": "step_back",
          "line": "这只是你们的私事。"
        }
      ]
    },
    {
      "id": "investigate",
      "title": "查验通缉令",
      "hint": "通缉令上照片模糊，名字是杰克·沃克。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "照片虽糊，但这家伙很像。",
          "delayMs": 1200,
          "mood": "smug"
        },
        {
          "speaker": "suspect",
          "text": "我叫汤姆·里德，是赶马车的。",
          "delayMs": 1100,
          "mood": "scared"
        },
        {
          "speaker": "clerk",
          "text": "他常来存钱，不像恶人。",
          "delayMs": 1000,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "a1",
          "label": "盘问猎人",
          "icon": "❓",
          "risk": "low",
          "next": "question_hunter",
          "line": "你从哪弄来的通缉令？"
        },
        {
          "id": "a2",
          "label": "保护嫌犯",
          "icon": "🛡️",
          "risk": "medium",
          "next": "defend_suspect",
          "line": "没确凿证据，你不能抓他。"
        },
        {
          "id": "a3",
          "label": "拔枪威逼",
          "icon": "🔫",
          "risk": "high",
          "next": "force_release",
          "line": "放人，不然子弹不长眼。"
        }
      ]
    },
    {
      "id": "question_hunter",
      "title": "盘问猎人",
      "hint": "猎人眼神闪躲，说话含糊不清。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "镇外公告板贴的，错不了。",
          "delayMs": 1200,
          "mood": "smug"
        },
        {
          "speaker": "crowd",
          "text": "那公告板早该清理了。",
          "delayMs": 1100,
          "mood": "neutral"
        },
        {
          "speaker": "suspect",
          "text": "他根本就是想讹钱！",
          "delayMs": 1000,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "a1a",
          "label": "查不在场证明",
          "icon": "🕰️",
          "risk": "low",
          "next": "check_alibi",
          "line": "你昨天这个时候在哪？"
        },
        {
          "id": "a1b",
          "label": "相信猎人",
          "icon": "⚔️",
          "risk": "medium",
          "next": "chase",
          "line": "你眼神不对，肯定有鬼。"
        },
        {
          "id": "a1c",
          "label": "放走嫌犯",
          "icon": "➖",
          "risk": "low",
          "next": "defend_suspect",
          "line": "快走，我来拦住他。"
        }
      ]
    },
    {
      "id": "check_alibi",
      "title": "查不在场证明",
      "hint": "嫌犯说在红马酒馆，可以去问老板。",
      "beats": [
        {
          "speaker": "suspect",
          "text": "红马酒馆的老板能作证。",
          "delayMs": 1200,
          "mood": "scared"
        },
        {
          "speaker": "hunter",
          "text": "酒馆老板会包庇他的。",
          "delayMs": 1100,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "a2a",
          "label": "去酒馆核实",
          "icon": "🍺",
          "risk": "low",
          "next": "verify_alibi",
          "line": "去红马酒馆问问便知。"
        },
        {
          "id": "a2b",
          "label": "直接抓人",
          "icon": "⚔️",
          "risk": "medium",
          "next": "chase",
          "line": "我没空陪你演戏。"
        },
        {
          "id": "a2c",
          "label": "开枪杀猎人",
          "icon": "💀",
          "risk": "high",
          "next": "e_bloody2",
          "line": "你冤枉好人，去死吧。"
        }
      ]
    },
    {
      "id": "verify_alibi",
      "title": "酒馆核实",
      "hint": "酒馆老板作证，汤姆昨晚确实在喝酒。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "我昨晚亲眼看到他了。",
          "delayMs": 1200,
          "mood": "neutral"
        },
        {
          "speaker": "clerk",
          "text": "我就说他是老实人。",
          "delayMs": 1000,
          "mood": "smug"
        },
        {
          "speaker": "hunter",
          "text": "这…这不可能。",
          "delayMs": 1100,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "a3a",
          "label": "逮捕猎人",
          "icon": "⛓️",
          "risk": "low",
          "next": "e_truth1",
          "line": "你才该上绞架，骗子。"
        },
        {
          "id": "a3b",
          "label": "强行带走",
          "icon": "⚔️",
          "risk": "medium",
          "next": "chase",
          "line": "我不管，跟我走一趟。"
        },
        {
          "id": "a3c",
          "label": "放任不管",
          "icon": "➖",
          "risk": "low",
          "next": "e_passive",
          "line": "既然有误会，你们自己解决。"
        }
      ]
    },
    {
      "id": "defend_suspect",
      "title": "保护嫌犯",
      "hint": "你挡在嫌犯身前，猎人拔枪相对。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "你多管闲事，让开！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "suspect",
          "text": "谢谢你，好心人。",
          "delayMs": 1000,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "要打起来了，快闪！",
          "delayMs": 1100,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "d1",
          "label": "决斗",
          "icon": "🤠",
          "risk": "high",
          "next": "duel",
          "line": "拔枪吧，看谁更快。"
        },
        {
          "id": "d2",
          "label": "讲道理",
          "icon": "❓",
          "risk": "low",
          "next": "question_hunter",
          "line": "放下枪，我们好好说。"
        },
        {
          "id": "d3",
          "label": "贿赂猎人",
          "icon": "💰",
          "risk": "medium",
          "next": "bribe",
          "line": "我给你二十块，放他一马。"
        }
      ]
    },
    {
      "id": "force_release",
      "title": "拔枪威逼",
      "hint": "你的枪口对准猎人，他额头冒汗。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "你这是帮凶，也会被通缉。",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "suspect",
          "text": "别开枪，求你了！",
          "delayMs": 1000,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "e1",
          "label": "开枪打伤",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody2",
          "line": "这是给你的教训，砰！"
        },
        {
          "id": "e2",
          "label": "只是威胁",
          "icon": "❓",
          "risk": "low",
          "next": "question_hunter",
          "line": "把通缉令给我再看看。"
        },
        {
          "id": "e3",
          "label": "倒戈帮猎人",
          "icon": "↩️",
          "risk": "medium",
          "next": "assist_hunter",
          "line": "算了，我觉得你有道理。"
        }
      ]
    },
    {
      "id": "assist_hunter",
      "title": "帮助猎人",
      "hint": "你一把抓住嫌犯的胳膊，他拼命挣扎。",
      "beats": [
        {
          "speaker": "suspect",
          "text": "放开我！我没做错事。",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "hunter",
          "text": "干得好，伙计，按住他。",
          "delayMs": 1000,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "b1",
          "label": "追捕",
          "icon": "🏃",
          "risk": "medium",
          "next": "chase",
          "line": "别让他挣脱跑了！"
        },
        {
          "id": "b2",
          "label": "先问清楚",
          "icon": "❓",
          "risk": "low",
          "next": "investigate",
          "line": "等等，他可能真无辜。"
        },
        {
          "id": "b3",
          "label": "开枪示警",
          "icon": "🔫",
          "risk": "high",
          "next": "warning_shot",
          "line": "砰！谁动就打死谁。"
        }
      ]
    },
    {
      "id": "step_back",
      "title": "退后观望",
      "hint": "你靠在柱子上，猎人给嫌犯戴上手铐。",
      "beats": [
        {
          "speaker": "suspect",
          "text": "求求你，我有老婆孩子。",
          "delayMs": 1200,
          "mood": "sad"
        },
        {
          "speaker": "hunter",
          "text": "闭嘴，杀人犯不值得可怜。",
          "delayMs": 1100,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "真可怜，也许抓错了。",
          "delayMs": 1000,
          "mood": "sad"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "介入询问",
          "icon": "❓",
          "risk": "low",
          "next": "investigate",
          "line": "等一下，我有几个问题。"
        },
        {
          "id": "c2",
          "label": "帮忙押送",
          "icon": "⚔️",
          "risk": "medium",
          "next": "assist_hunter",
          "line": "需要我搭把手吗，伙计？"
        },
        {
          "id": "c3",
          "label": "转身离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "这浑水我不蹚。"
        }
      ]
    },
    {
      "id": "chase",
      "title": "追捕",
      "hint": "嫌犯挣脱逃跑，你们追进后巷。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "他跑不远，包抄过去！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "suspect",
          "text": "别过来，我不想伤人。",
          "delayMs": 1000,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "b1a",
          "label": "开枪射腿",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody1",
          "line": "砰！你跑不掉了，杂种。"
        },
        {
          "id": "b1b",
          "label": "扑倒他",
          "icon": "🏃",
          "risk": "medium",
          "next": "capture",
          "line": "按住他，别让他再跑！"
        },
        {
          "id": "b1c",
          "label": "停下寻线索",
          "icon": "❓",
          "risk": "low",
          "next": "investigate",
          "line": "等等，也许我们弄错了。"
        }
      ]
    },
    {
      "id": "capture",
      "title": "抓住嫌犯",
      "hint": "你们把嫌犯按在地上，猎人要带走他。",
      "beats": [
        {
          "speaker": "suspect",
          "text": "我诅咒你，你不得好死！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "hunter",
          "text": "赏金足够喝一个月威士忌。",
          "delayMs": 1100,
          "mood": "greedy"
        }
      ],
      "choices": [
        {
          "id": "b2a",
          "label": "让猎人带走",
          "icon": "💰",
          "risk": "low",
          "next": "e_truth2",
          "line": "交给你了，别弄出人命。"
        },
        {
          "id": "b2b",
          "label": "送交警长",
          "icon": "⭐",
          "risk": "low",
          "next": "sheriff",
          "line": "还是让警长来定夺吧。"
        },
        {
          "id": "b2c",
          "label": "就地正法",
          "icon": "💀",
          "risk": "high",
          "next": "e_bloody1",
          "line": "你该为罪行偿命，砰！"
        }
      ]
    },
    {
      "id": "duel",
      "title": "决斗",
      "hint": "你和猎人对峙，空气仿佛凝固。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "快看，要决斗了！",
          "delayMs": 1200,
          "mood": "shocked"
        },
        {
          "speaker": "suspect",
          "text": "别为我犯险啊，朋友。",
          "delayMs": 1000,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "f1",
          "label": "击毙猎人",
          "icon": "💀",
          "risk": "high",
          "next": "e_bloody2",
          "line": "快枪之下，正义由我定。"
        },
        {
          "id": "f2",
          "label": "打伤他",
          "icon": "🔫",
          "risk": "medium",
          "next": "question_hunter",
          "line": "砰！再动下一枪要你命。"
        },
        {
          "id": "f3",
          "label": "放弃离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "不值得为陌生人流血。"
        }
      ]
    },
    {
      "id": "bribe",
      "title": "贿赂猎人",
      "hint": "你掏出银元，猎人眼睛发亮但依然警惕。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "这点钱可不够买条命。",
          "delayMs": 1200,
          "mood": "greedy"
        },
        {
          "speaker": "suspect",
          "text": "求你别信他，他在骗你。",
          "delayMs": 1000,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "g1",
          "label": "拔枪射击",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody2",
          "line": "那用子弹换他的命，砰！"
        },
        {
          "id": "g2",
          "label": "套话",
          "icon": "❓",
          "risk": "low",
          "next": "investigate",
          "line": "到底多少才够？告诉我真相。"
        },
        {
          "id": "g3",
          "label": "转身离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "你们自己解决吧。"
        }
      ]
    },
    {
      "id": "warning_shot",
      "title": "开枪示警",
      "hint": "你朝天开枪，人群惊叫，嫌犯吓得蹲下。",
      "beats": [
        {
          "speaker": "hunter",
          "text": "你疯了，会引来警长的。",
          "delayMs": 1200,
          "mood": "shocked"
        },
        {
          "speaker": "crowd",
          "text": "救命，有人乱开枪！",
          "delayMs": 1000,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "w1",
          "label": "继续开火",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody1",
          "line": "砰！今天总得死一个。"
        },
        {
          "id": "w2",
          "label": "谈判",
          "icon": "❓",
          "risk": "low",
          "next": "investigate",
          "line": "现在，我们好好谈谈。"
        },
        {
          "id": "w3",
          "label": "逃跑",
          "icon": "🏃",
          "risk": "low",
          "next": "e_passive",
          "line": "这烂摊子我不管了。"
        }
      ]
    },
    {
      "id": "sheriff",
      "title": "送交警长",
      "hint": "警长拿着通缉令仔细比对嫌犯的脸。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "就是他，独眼杰克·沃克。",
          "delayMs": 1300,
          "mood": "neutral"
        },
        {
          "speaker": "suspect",
          "text": "不，我是汤姆，我不是独眼！",
          "delayMs": 1100,
          "mood": "scared"
        },
        {
          "speaker": "hunter",
          "text": "看到了吧，我没弄错。",
          "delayMs": 1200,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "h1",
          "label": "公正审判",
          "icon": "⚖️",
          "risk": "low",
          "next": "e_truth2",
          "line": "按法律办，别动私刑。"
        },
        {
          "id": "h2",
          "label": "怀疑受贿",
          "icon": "❓",
          "risk": "medium",
          "next": "duel",
          "line": "你们是一伙的？拔枪！"
        },
        {
          "id": "h3",
          "label": "悄然离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "既然确认了，没我事了。"
        }
      ]
    },
    {
      "id": "e_passive",
      "title": "袖手旁观",
      "beats": [
        {
          "speaker": "crowd",
          "text": "就这么让他把人带走了？",
          "delayMs": 1500,
          "mood": "sad"
        },
        {
          "speaker": "suspect",
          "text": "救救我，我没杀人！",
          "delayMs": 1200,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "过客",
        "lines": [
          "你看着猎人带走嫌犯。据说后来真相大白，他抓错了人。"
        ],
        "honor": -2,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "银行前对峙无果而终",
            "body": "昨日本报报道之银行门前纷争，最终未有伤亡。赏金猎人凯尔·摩根与车夫灰帽子各自散去。芬奇先生得以重新开张，此事恐成悬案。"
          },
          "message": {
            "fromRole": "clerk",
            "text": "陌生人，那天你没插手真是明智。灰帽子之后还来银行存过钱，他看起来确实老实。有时候少管闲事才是正理。"
          },
          "item": {
            "ownerRole": "suspect",
            "name": "马料收据",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一张皱巴巴的收据，写着‘灰岩牧场干草两捆，已付清’。日期就在银行对峙前一天。也许那车夫真只是个赶车的。"
          }
        }
      }
    },
    {
      "id": "e_bloody1",
      "title": "血色正义",
      "beats": [
        {
          "speaker": "suspect",
          "text": "呃…你…不得好死…",
          "delayMs": 1500,
          "mood": "sad"
        },
        {
          "speaker": "hunter",
          "text": "死得好，赏金还是我的。",
          "delayMs": 1200,
          "mood": "smug"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "以暴制暴",
        "lines": [
          "嫌犯倒在血泊中。他的通缉令确实是真的，但镇上的人背地里骂你冷血。"
        ],
        "honor": -3,
        "cash": 20,
        "wanted": 1,
        "aftermath": {
          "news": {
            "title": "银行前枪战，猎人殉职",
            "body": "昨日，赏金猎人凯尔·摩根在银行门前遭不明人士开枪打死，其抓捕的通缉嫌犯趁乱逃脱。治安官正悬赏寻找凶手，提醒居民锁好门窗。"
          },
          "message": {
            "fromRole": "suspect",
            "text": "伙计，多谢你出手。但说实话，我确实不是杀人犯，只是偷过几匹马。现在我得跑了，这个徽章留给你吧，它沾过不少血。"
          },
          "item": {
            "ownerRole": "hunter",
            "name": "带血徽章",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一枚联邦副警长徽章，血迹已干。背面刻着一行小字：‘致摩根，感谢你清理黑水镇匪帮。’原来他也曾是英雄。"
          }
        }
      }
    },
    {
      "id": "e_bloody2",
      "title": "枪下亡魂",
      "beats": [
        {
          "speaker": "hunter",
          "text": "不…这不可能…",
          "delayMs": 1500,
          "mood": "shocked"
        },
        {
          "speaker": "crowd",
          "text": "天啊，他把猎人杀了！",
          "delayMs": 1200,
          "mood": "shocked"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "法外执行",
        "lines": [
          "猎人倒在尘土里。嫌犯感激地逃之夭夭，但你因为杀人被通缉。"
        ],
        "honor": -5,
        "cash": 0,
        "wanted": 2,
        "aftermath": {
          "news": {
            "title": "枪决逃犯，赏金猎人获酬",
            "body": "昨日，赏金猎人凯尔·摩根在银行门前当场击毙一名被通缉的杀人犯。据称一名过路枪手协助了此次执法。摩根已领取五百美元赏金。"
          },
          "message": {
            "fromRole": "hunter",
            "text": "干得好，陌生人。这是你的那份赏金收据。不过，灰帽子身上没搜出杀人证据，他罪有应得，对吧？别多想。"
          },
          "item": {
            "ownerRole": "hunter",
            "name": "赏金收据",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "收据上写着‘支付凯尔·摩根五百元整，因击毙通缉犯一名’。角落有行潦草小字：‘疑犯未审，目击者称其无反抗’。钱上沾着疑问。"
          }
        }
      }
    },
    {
      "id": "e_truth1",
      "title": "清白昭雪",
      "beats": [
        {
          "speaker": "crowd",
          "text": "我就知道他是被冤枉的。",
          "delayMs": 1200,
          "mood": "neutral"
        },
        {
          "speaker": "suspect",
          "text": "谢谢你，伙计，我欠你一条命。",
          "delayMs": 1500,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "正义使者",
        "lines": [
          "你证明嫌犯清白，猎人因诬告被带走。镇上请你喝了一杯。"
        ],
        "honor": 5,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "误认通缉犯，真凶落网",
            "body": "本报澄清：银行门前被冤枉的马车夫灰帽子实为无辜。经调查，真正的杀人犯已于昨夜被神秘枪手交予治安官。镇民称其‘正义使者’。"
          },
          "message": {
            "fromRole": "suspect",
            "text": "先生，大恩难谢。这张画像是我从真凶身上找到的，原来他一直冒用我的名字。现在我可以安心赶车了，愿主保佑你。"
          },
          "item": {
            "ownerRole": "suspect",
            "name": "真凶画像",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一张通缉令，画像与灰帽子一模一样，但名字却是‘威廉·克劳’。背面写着：‘真正的灰帽子在灰岩镇，这是个冒牌货。’原来错在警方。"
          }
        }
      }
    },
    {
      "id": "e_truth2",
      "title": "罪有应得",
      "beats": [
        {
          "speaker": "suspect",
          "text": "你们会后悔的，我发誓！",
          "delayMs": 1300,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "杀人犯终于落网了。",
          "delayMs": 1100,
          "mood": "neutral"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "赏金猎人",
        "lines": [
          "嫌犯被确认是通缉犯，警长给了你一笔赏金。正义得到伸张。"
        ],
        "honor": 3,
        "cash": 30,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "银行前抓捕疑犯，审判在即",
            "body": "昨日，赏金猎人凯尔·摩根与一名正义枪手合作，在银行门前生擒嫌犯灰帽子。该嫌犯将接受公开审判，镇民纷纷前往法院听审。"
          },
          "message": {
            "fromRole": "hunter",
            "text": "朋友，多亏你坚持活捉，灰帽子在牢里招了——他确实不是主谋。这瓶酒是正牌杀人犯家搜出的，真相总在水落石出后。"
          },
          "item": {
            "ownerRole": "hunter",
            "name": "证物威士忌",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一瓶未开封的威士忌，标签上印着‘红沙镇’。治安官附条：‘此酒在真凶床底发现，瓶底刻有被害人名字缩写。’法律总算没冤枉好人。"
          }
        }
      }
    }
  ],
  "glueFallbackNode": "st"
};

export const STABLE_HORSETHIEF_TREE = {
  "id": "stable_horsethief",
  "title": "马厩的偷马贼",
  "hintOnEnter": "马夫在马厩外抓住一个正在解绳子的年轻人，另一个外乡买主坚称那匹马是自己刚花钱买的",
  "roles": [
    {
      "roleId": "groom",
      "name": "老马夫伊莱",
      "required": true,
      "jobs": [
        "马夫",
        "铁匠",
        "牛仔"
      ]
    },
    {
      "roleId": "thief",
      "name": "瘦子卢克",
      "required": true,
      "jobs": [
        "淘金客",
        "旅人",
        "赌徒"
      ]
    },
    {
      "roleId": "buyer",
      "name": "外乡人韦德",
      "required": true,
      "jobs": [
        "商人",
        "旅人",
        "赌徒"
      ]
    },
    {
      "roleId": "crowd",
      "name": null,
      "required": false,
      "jobs": [],
      "count": 2
    }
  ],
  "entryNode": "st",
  "unattendedMs": 70000,
  "timeoutNode": "e_timeout",
  "idleLoop": [
    {
      "speaker": "groom",
      "text": "这该死的贼偷我的马！",
      "delayMs": 2400,
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "我只是看看，没偷！",
      "delayMs": 2000,
      "mood": "scared"
    },
    {
      "speaker": "buyer",
      "text": "我付了钱，它就是我的！",
      "delayMs": 2100,
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "别光站着，叫警长来！",
      "delayMs": 1800,
      "mood": "neutral"
    }
  ],
  "reactions": {
    "hit": {
      "groom": [
        "你敢打我？我可是老伊莱！",
        "嘿！我正要把这贼扔进牢房！"
      ],
      "thief": [
        "饶命，我只是路过！",
        "我不是小偷，放开我！"
      ],
      "buyer": [
        "我可是付过钱的！别动手！",
        "你怎么不分青红皂白就动手？"
      ]
    },
    "bump": {
      "groom": [
        "看着点路，年轻人！",
        "你差点撞翻我这把老骨头！"
      ],
      "thief": [
        "别挤，我正忙着呢！",
        "嘿！没看见我在躲人吗？"
      ],
      "buyer": [
        "粗鲁的家伙！你撞疼我了！",
        "小心点，我这身衣服可不便宜！"
      ]
    },
    "steal": {
      "groom": [
        "你手往哪儿伸？小偷！",
        "我兜里没钱，别费劲了！"
      ],
      "thief": [
        "嘿！敢偷到贼祖宗头上？",
        "摸口袋？你才是贼吧！"
      ],
      "buyer": [
        "我的钱包！有扒手！",
        "敢偷我的钱？我要叫警长了！"
      ]
    },
    "witness": {
      "groom": [
        "老天！你竟敢打人？",
        "快住手！不然我开枪了！"
      ],
      "thief": [
        "好哇，打起来了！我得溜了！",
        "别打别打，我什么都没看见！"
      ],
      "buyer": [
        "暴力解决不了问题！",
        "住手！别在我面前伤人！"
      ]
    }
  },
  "nodes": [
    {
      "id": "st",
      "title": "马厩前的僵局",
      "hint": "老马夫抓住瘦子的手腕，外乡人紧握缰绳，三人面红耳赤。",
      "beats": [
        {
          "speaker": "groom",
          "text": "放手！这是我养了五年的栗色马！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "thief",
          "text": "先生，我只是想解绳子看看牙口。",
          "delayMs": 1000,
          "mood": "scared"
        },
        {
          "speaker": "buyer",
          "text": "该死的！我今早才付了十五块！",
          "delayMs": 1000,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "问明原委",
          "icon": "❓",
          "risk": "low",
          "next": "n1_ask_groom",
          "line": "都别吵，伊莱你先说怎么回事。",
          "effects": {
            "honor": 1
          }
        },
        {
          "id": "c2",
          "label": "替外乡人说话",
          "icon": "🤝",
          "risk": "low",
          "next": "n2_side_buyer",
          "line": "外乡人既然付了钱，马就是他的。",
          "effects": {
            "honor": 0
          }
        },
        {
          "id": "c3",
          "label": "拔枪震慑",
          "icon": "🔫",
          "risk": "high",
          "next": "n3_threaten",
          "line": "都给我住手，不然子弹不长眼。"
        }
      ]
    },
    {
      "id": "n1_ask_groom",
      "title": "伊莱的说法",
      "hint": "伊莱喘着粗气，指着卢克的手腕。",
      "beats": [
        {
          "speaker": "groom",
          "text": "昨晚我拴好的马，今早就见这小子解绳子！",
          "delayMs": 1000,
          "mood": "angry"
        },
        {
          "speaker": "thief",
          "text": "我只是路过，想看看是不是我的马。",
          "delayMs": 900,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c4",
          "label": "让卢克说话",
          "icon": "👂",
          "risk": "low",
          "next": "n4_listen_luke",
          "line": "卢克，你最好有合理解释。"
        },
        {
          "id": "c5",
          "label": "斥责伊莱",
          "icon": "👎",
          "risk": "medium",
          "next": "n5_side_luke",
          "line": "老家伙，你凭什么认定是偷？"
        },
        {
          "id": "c6",
          "label": "转身离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_timeout",
          "line": "这烂摊子我懒得管。"
        }
      ]
    },
    {
      "id": "n2_side_buyer",
      "title": "站队外乡人",
      "hint": "韦德挺直腰杆，伊莱气得发抖。",
      "beats": [
        {
          "speaker": "buyer",
          "text": "这位先生明事理！我有收据为证。",
          "delayMs": 1000,
          "mood": "smug"
        },
        {
          "speaker": "groom",
          "text": "收据？谁知道哪来的！",
          "delayMs": 800,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c7",
          "label": "查收据",
          "icon": "📜",
          "risk": "low",
          "next": "n6_check_receipt",
          "line": "拿收据给我看看。"
        },
        {
          "id": "c8",
          "label": "赶走马夫",
          "icon": "🥾",
          "risk": "medium",
          "next": "n7_drive_groom",
          "line": "别挡道，马不是你的。"
        },
        {
          "id": "c9",
          "label": "袖手旁观",
          "icon": "🤷",
          "risk": "low",
          "next": "e_timeout",
          "line": "你们吵吧，我走了。"
        }
      ]
    },
    {
      "id": "n3_threaten",
      "title": "枪口下的沉默",
      "hint": "你的左轮指向地面，三人都不敢动弹。",
      "beats": [
        {
          "speaker": "thief",
          "text": "别开枪，先生，我没恶意！",
          "delayMs": 800,
          "mood": "scared"
        },
        {
          "speaker": "groom",
          "text": "小心走火，年轻人！",
          "delayMs": 700,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c10",
          "label": "逼问卢克",
          "icon": "🎯",
          "risk": "high",
          "next": "n8_force_luke",
          "line": "卢克，说实话，不然下一枪打腿。"
        },
        {
          "id": "c11",
          "label": "放卢克走",
          "icon": "🏃",
          "risk": "high",
          "next": "n9_let_luke_go",
          "line": "你走吧，这马归外乡人。"
        },
        {
          "id": "c12",
          "label": "收枪离开",
          "icon": "🕊️",
          "risk": "low",
          "next": "e_timeout",
          "line": "我不管了，你们自己解决。"
        }
      ]
    },
    {
      "id": "n4_listen_luke",
      "title": "卢克的辩解",
      "hint": "卢克舔舔干裂的嘴唇，眼神飘忽。",
      "beats": [
        {
          "speaker": "thief",
          "text": "这马是我在镇外发现走失的，想牵回来。",
          "delayMs": 1100,
          "mood": "scared"
        },
        {
          "speaker": "buyer",
          "text": "他撒谎！我亲眼看他从马厩牵出。",
          "delayMs": 1000,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c13",
          "label": "对质韦德",
          "icon": "🗣️",
          "risk": "low",
          "next": "n10_face_wade",
          "line": "韦德，你有什么证据？"
        },
        {
          "id": "c14",
          "label": "相信卢克",
          "icon": "🛡️",
          "risk": "medium",
          "next": "n5_side_luke",
          "line": "伊莱，你太敏感了，放他走。"
        },
        {
          "id": "c15",
          "label": "开火震慑",
          "icon": "💥",
          "risk": "high",
          "next": "e_shootout",
          "line": "砰！再嚷嚷谁都别想活。"
        }
      ]
    },
    {
      "id": "n5_side_luke",
      "title": "偏袒瘦子",
      "hint": "伊莱愤怒地跺脚，韦德不知所措。",
      "beats": [
        {
          "speaker": "groom",
          "text": "你在帮贼！这马明明是我的！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "thief",
          "text": "谢谢您，先生。",
          "delayMs": 700,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "c16",
          "label": "威胁伊莱",
          "icon": "👊",
          "risk": "high",
          "next": "n12_threaten_groom",
          "line": "再啰嗦，我让你躺着回去。"
        },
        {
          "id": "c17",
          "label": "让卢克快走",
          "icon": "🐎",
          "risk": "medium",
          "next": "n13_help_luke_escape",
          "line": "上马，赶紧离开这儿。"
        },
        {
          "id": "c18",
          "label": "转身不理",
          "icon": "🤐",
          "risk": "low",
          "next": "e_timeout",
          "line": "我不管了，你们爱怎样怎样。"
        }
      ]
    },
    {
      "id": "n6_check_receipt",
      "title": "收据上的破绽",
      "hint": "韦德掏出一张皱巴巴的纸条，伊莱一把夺过。",
      "beats": [
        {
          "speaker": "groom",
          "text": "这上面写的是‘棕色马’，可这是栗色！",
          "delayMs": 1100,
          "mood": "shocked"
        },
        {
          "speaker": "buyer",
          "text": "什么？他跟我说就是这匹！",
          "delayMs": 900,
          "mood": "shocked"
        },
        {
          "speaker": "thief",
          "text": "呃……我可能搞错了……",
          "delayMs": 800,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c19",
          "label": "逼卢克认罪",
          "icon": "🕵️",
          "risk": "low",
          "next": "e_truth",
          "line": "卢克，别想狡辩！"
        },
        {
          "id": "c20",
          "label": "继续护韦德",
          "icon": "🤷",
          "risk": "medium",
          "next": "n7_drive_groom",
          "line": "老家伙看错了，马就是他的。"
        },
        {
          "id": "c21",
          "label": "撒手不管",
          "icon": "🚫",
          "risk": "low",
          "next": "e_timeout",
          "line": "太乱了，我走了。"
        }
      ]
    },
    {
      "id": "n7_drive_groom",
      "title": "驱逐马夫",
      "hint": "伊莱攥紧拳头，不肯退让。",
      "beats": [
        {
          "speaker": "groom",
          "text": "除非我死了，否则休想牵走马！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "buyer",
          "text": "老顽固，我们走。",
          "delayMs": 700,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "c22",
          "label": "动手拉偏架",
          "icon": "🥊",
          "risk": "high",
          "next": "n15_fight_groom",
          "line": "不滚就挨揍！"
        },
        {
          "id": "c23",
          "label": "花钱了事",
          "icon": "💰",
          "risk": "medium",
          "next": "n16_pay_off",
          "line": "伊莱，十块钱，马给他。"
        },
        {
          "id": "c24",
          "label": "撒手不管",
          "icon": "🤚",
          "risk": "low",
          "next": "e_timeout",
          "line": "你们自己解决，我走了。"
        }
      ]
    },
    {
      "id": "n8_force_luke",
      "title": "枪口下的供认",
      "hint": "卢克满头大汗，裤管发抖。",
      "beats": [
        {
          "speaker": "thief",
          "text": "别开枪！是，是我偷的……",
          "delayMs": 1000,
          "mood": "scared"
        },
        {
          "speaker": "groom",
          "text": "哈！我就知道！",
          "delayMs": 700,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "c25",
          "label": "送交警长",
          "icon": "⚖️",
          "risk": "low",
          "next": "e_truth",
          "line": "绑起来，送镇里警长。"
        },
        {
          "id": "c26",
          "label": "就地教训",
          "icon": "🦵",
          "risk": "high",
          "next": "e_shootout",
          "line": "偷马贼该吃子弹！"
        },
        {
          "id": "c27",
          "label": "放过他",
          "icon": "🙏",
          "risk": "low",
          "next": "e_luke_escape",
          "line": "滚，别再出现。"
        }
      ]
    },
    {
      "id": "n9_let_luke_go",
      "title": "任其逃脱",
      "hint": "卢克惊喜，翻身上马，伊莱暴怒。",
      "beats": [
        {
          "speaker": "groom",
          "text": "你不能放走贼！",
          "delayMs": 800,
          "mood": "angry"
        },
        {
          "speaker": "thief",
          "text": "多谢啦！",
          "delayMs": 700,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "c28",
          "label": "掩护卢克",
          "icon": "🏇",
          "risk": "high",
          "next": "n13_help_luke_escape",
          "line": "快走！我拦着伊莱。"
        },
        {
          "id": "c29",
          "label": "反悔阻拦",
          "icon": "✋",
          "risk": "medium",
          "next": "n10_face_wade",
          "line": "等等，我又觉得不对……"
        },
        {
          "id": "c30",
          "label": "随他去",
          "icon": "🫥",
          "risk": "low",
          "next": "e_luke_escape",
          "line": "不关我事。"
        }
      ]
    },
    {
      "id": "n10_face_wade",
      "title": "对质揭穿",
      "hint": "韦德掏出收据，卢克脸色惨白。",
      "beats": [
        {
          "speaker": "buyer",
          "text": "我付的钱，你说马是你的！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "thief",
          "text": "我……我只是想赚点快钱……",
          "delayMs": 800,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c31",
          "label": "揭穿卢克",
          "icon": "💡",
          "risk": "low",
          "next": "e_truth",
          "line": "偷马还骗人，去警长那儿说吧！"
        },
        {
          "id": "c32",
          "label": "同情卢克",
          "icon": "🫱",
          "risk": "medium",
          "next": "n5_side_luke",
          "line": "谁都困难过，放过他吧。"
        },
        {
          "id": "c33",
          "label": "叫警长",
          "icon": "👮",
          "risk": "low",
          "next": "e_truth",
          "line": "我去叫警长，你们等着。"
        }
      ]
    },
    {
      "id": "n12_threaten_groom",
      "title": "威胁老马夫",
      "hint": "伊莱毫不示弱，从腰后摸出匕首。",
      "beats": [
        {
          "speaker": "groom",
          "text": "来啊，我这把老骨头不怕！",
          "delayMs": 800,
          "mood": "angry"
        },
        {
          "speaker": "buyer",
          "text": "天哪，别这样！",
          "delayMs": 700,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c34",
          "label": "直接动武",
          "icon": "⚔️",
          "risk": "high",
          "next": "e_shootout",
          "line": "那就送你见上帝！"
        },
        {
          "id": "c35",
          "label": "让卢克走",
          "icon": "🐴",
          "risk": "medium",
          "next": "n13_help_luke_escape",
          "line": "卢克，骑马快跑！"
        },
        {
          "id": "c36",
          "label": "突然退让",
          "icon": "↩️",
          "risk": "low",
          "next": "e_timeout",
          "line": "算了，不值得。"
        }
      ]
    },
    {
      "id": "n13_help_luke_escape",
      "title": "偷马贼逃跑",
      "hint": "卢克策马狂奔，伊莱扑上去却被踢开。",
      "beats": [
        {
          "speaker": "groom",
          "text": "啊！我的马！",
          "delayMs": 800,
          "mood": "sad"
        },
        {
          "speaker": "buyer",
          "text": "他跑了……我的钱！",
          "delayMs": 700,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c37",
          "label": "追上去",
          "icon": "🏃‍♂️",
          "risk": "high",
          "next": "e_shootout",
          "line": "别想逃！"
        },
        {
          "id": "c38",
          "label": "安慰伊莱",
          "icon": "🩹",
          "risk": "low",
          "next": "e_luke_escape",
          "line": "老兄，马没了可以再找。"
        },
        {
          "id": "c39",
          "label": "转身离开",
          "icon": "👋",
          "risk": "low",
          "next": "e_luke_escape",
          "line": "我尽力了。"
        }
      ]
    },
    {
      "id": "n15_fight_groom",
      "title": "马厩斗殴",
      "hint": "拳头挥舞，尘土飞扬。",
      "beats": [
        {
          "speaker": "groom",
          "text": "接招！",
          "delayMs": 600,
          "mood": "angry"
        },
        {
          "speaker": "buyer",
          "text": "别打！噢！",
          "delayMs": 700,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c40",
          "label": "下重手",
          "icon": "💢",
          "risk": "high",
          "next": "e_buyer_killed",
          "line": "这是你自找的！"
        },
        {
          "id": "c41",
          "label": "试图拉架",
          "icon": "🤲",
          "risk": "medium",
          "next": "n16_pay_off",
          "line": "住手！我们谈个价钱。"
        },
        {
          "id": "c42",
          "label": "走开不管",
          "icon": "↩️",
          "risk": "low",
          "next": "e_timeout",
          "line": "打去吧，我不掺和。"
        }
      ]
    },
    {
      "id": "n16_pay_off",
      "title": "花钱消灾",
      "hint": "你掏出几枚银币，伊莱犹豫了。",
      "beats": [
        {
          "speaker": "groom",
          "text": "十五块，不然没商量。",
          "delayMs": 900,
          "mood": "neutral"
        },
        {
          "speaker": "buyer",
          "text": "我出十块，加上你的五块怎样？",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c43",
          "label": "同意付钱",
          "icon": "💵",
          "risk": "low",
          "next": "e_luke_escape",
          "line": "拿去，此事了结。"
        },
        {
          "id": "c44",
          "label": "拒绝付钱",
          "icon": "🙅",
          "risk": "medium",
          "next": "n15_fight_groom",
          "line": "我一分不给，马是买家的。"
        },
        {
          "id": "c45",
          "label": "报警长",
          "icon": "👮",
          "risk": "low",
          "next": "e_truth",
          "line": "叫警长来判。"
        }
      ]
    },
    {
      "id": "e_truth",
      "title": "绳之以法",
      "beats": [
        {
          "speaker": "groom",
          "text": "谢谢你，先生，总算讨回公道。",
          "delayMs": 1000,
          "mood": "neutral"
        },
        {
          "speaker": "buyer",
          "text": "真倒霉，我再也不敢轻信了。",
          "delayMs": 900,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "正义伸张",
        "lines": [
          "卢克被押往警长办公室，马归原主。"
        ],
        "honor": 4,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "偷马贼落网，真相大白",
            "body": "昨日马厩争执一案，在好心路人协助下，老马夫伊莱成功擒获偷马贼卢克。外乡人韦德证实已付马款。卢克认罪，将受法律严惩。"
          },
          "message": {
            "fromRole": "groom",
            "text": "谢谢你站出来。那小子虽是个贼，可他口袋里揣着女儿的盼头。世道逼人，我心也软了几分。"
          },
          "item": {
            "ownerRole": "thief",
            "name": "皱巴巴的家书",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "卢克拿这信抵马钱被拒。信上歪歪扭扭写着：“爸，大夫说奶奶需钱买药。我饿两天了，你何时归？” 这孩子五天没吃饭了。"
          }
        }
      }
    },
    {
      "id": "e_luke_escape",
      "title": "贼人逃逸",
      "beats": [
        {
          "speaker": "groom",
          "text": "我的马……天杀的贼……",
          "delayMs": 1000,
          "mood": "sad"
        },
        {
          "speaker": "buyer",
          "text": "我的钱也丢了……",
          "delayMs": 800,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "不了了之",
        "lines": [
          "卢克消失在荒野，镇民议论纷纷。"
        ],
        "honor": -2,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "歹徒趁乱逃脱，马匹丢失",
            "body": "马厩纠纷因无人调解升级，偷马贼卢克竟趁双方争吵时飞驰离去。老马夫与买主望尘莫及，镇民对纵容罪犯之人议论纷纷。"
          },
          "message": {
            "fromRole": "buyer",
            "text": "你站在那像根木头，眼睁睁看贼溜走。我那匹马可是全部家当。你的冷漠，我记下了。"
          },
          "item": {
            "ownerRole": "groom",
            "name": "悬赏告示",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "告示画着卢克的脸，赏金50美元。背面有人写：“他偷了警长的马，已成亡命徒。当初若有人拦下，多条人命可免。”"
          }
        }
      }
    },
    {
      "id": "e_shootout",
      "title": "血色黄昏",
      "beats": [
        {
          "speaker": "crowd",
          "text": "天呐，有人中弹了！",
          "delayMs": 800,
          "mood": "shocked"
        },
        {
          "speaker": "groom",
          "text": "呃……（倒地）",
          "delayMs": 900,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "流血收场",
        "lines": [
          "枪声过后，伊莱倒在血泊中。你成了通缉犯。"
        ],
        "honor": -5,
        "cash": 0,
        "wanted": 2,
        "aftermath": {
          "news": {
            "title": "马厩枪战一死一重伤",
            "body": "围绕马匹归属争执最终拔枪相向。外乡人韦德毙命，马夫伊莱重伤，偷马贼卢克中弹后被捕。小镇治安堪忧。"
          },
          "message": {
            "fromRole": "groom",
            "text": "我躺在诊所，后悔没按住那把枪。韦德不该死，他口袋里掉出的信，说找到失散妹妹了…… 我们毁了团圆。"
          },
          "item": {
            "ownerRole": "buyer",
            "name": "寻妹启事",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "韦德一直揣着这张泛黄启事：“寻妹丽兹，左耳后有胎记。父母双亡，兄韦德。见信速归。” 而卢克正是丽兹的丈夫。他们至死不知彼此。"
          }
        }
      }
    },
    {
      "id": "e_timeout",
      "title": "袖手旁观的代价",
      "beats": [
        {
          "speaker": "thief",
          "text": "去死吧，老家伙！",
          "delayMs": 700,
          "mood": "angry"
        },
        {
          "speaker": "groom",
          "text": "啊！",
          "delayMs": 600,
          "mood": "scared"
        },
        {
          "speaker": "buyer",
          "text": "不！",
          "delayMs": 600,
          "mood": "shocked"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "冷漠的代价",
        "lines": [
          "卢克匕首捅伤伊莱，抢马逃走，你无动于衷。"
        ],
        "honor": -3,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "惨剧！马夫惨死无人相助",
            "body": "昨日马厩纠纷中，马夫伊莱因无人制止，被偷马贼刺死。镇民反思：若有人挺身而出，悲剧或可避免。"
          },
          "message": {
            "fromRole": "thief",
            "text": "你看到了却没动。我本只想偷马，不想杀人，但血红了眼。你的袖手旁观，让我成了魔鬼。"
          },
          "item": {
            "ownerRole": "groom",
            "name": "老烟斗",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "烟斗柄刻着“E.C. 1855”。那是伊莱年轻时偷第一匹马被抓，法官给他改过机会的年份。他后来做了三十年正直的马夫。"
          }
        }
      }
    },
    {
      "id": "e_buyer_killed",
      "title": "误杀外乡人",
      "beats": [
        {
          "speaker": "buyer",
          "text": "啊！（倒下）",
          "delayMs": 700,
          "mood": "shocked"
        },
        {
          "speaker": "groom",
          "text": "天，你杀了他！",
          "delayMs": 800,
          "mood": "scared"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "枉死",
        "lines": [
          "你的过激行为导致韦德身亡，警长在找你。"
        ],
        "honor": -6,
        "cash": 0,
        "wanted": 3,
        "aftermath": {
          "news": {
            "title": "外乡人冤死，真相成谜",
            "body": "买马的外乡人韦德在马厩争执中被误杀，偷马贼卢克逃逸。有目击者称某旁观者行动激化了冲突。真相已随死者埋入黄土。"
          },
          "message": {
            "fromRole": "thief",
            "text": "我不是故意的，刀是我防身的。他扑过来时我慌了。你记得那匹马的眼神吗？它早被下了药，韦德才是骗子。"
          },
          "item": {
            "ownerRole": "buyer",
            "name": "药瓶与契约",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "小瓶残留马用镇静剂。附一张契约：“韦德欠赌场500元，以此马抵债。若失败，割地赔。” 他买马是骗局，马夫和卢克都成了棋子。"
          }
        }
      }
    }
  ],
  "glueFallbackNode": "st"
};

export const WELL_WATERRIGHT_TREE = {
  "id": "well_waterright",
  "title": "井边的水权",
  "hintOnEnter": "旱季第三个月，唯一还出水的井被淘金客用来洗矿砂，农户带着空桶站在旁边",
  "roles": [
    {
      "roleId": "farmer",
      "name": "农户巴克利",
      "required": true,
      "jobs": [
        "商人",
        "铁匠",
        "马夫"
      ]
    },
    {
      "roleId": "digger",
      "name": "淘金客芬恩",
      "required": true,
      "jobs": [
        "淘金客",
        "赌徒",
        "旅人"
      ]
    },
    {
      "roleId": "elder",
      "name": "老镇民玛莎",
      "required": true,
      "jobs": [
        "牧师",
        "医生",
        "酒保",
        "歌女"
      ]
    },
    {
      "roleId": "crowd",
      "name": null,
      "required": false,
      "jobs": [],
      "count": 2
    }
  ],
  "entryNode": "st",
  "unattendedMs": 70000,
  "timeoutNode": "e_neglect",
  "idleLoop": [
    {
      "speaker": "farmer",
      "text": "你不能眼里只有金子，不管别人死活！",
      "delayMs": 2400,
      "mood": "angry"
    },
    {
      "speaker": "digger",
      "text": "这世道，有枪有金才是爷！",
      "delayMs": 2400,
      "mood": "smug"
    }
  ],
  "reactions": {
    "hit": {
      "farmer": [
        "你打我干啥？我只是想救我的牛！",
        "别动手！咱们讲道理不成吗？"
      ],
      "digger": [
        "住手！这井是我的，你也敢惹？",
        "敢动我？我可是带了枪的！"
      ],
      "elder": [
        "哎哟！我这把老骨头可经不起折腾！",
        "连老人也打？你良心呢？"
      ]
    },
    "bump": {
      "farmer": [
        "嘿！看着点路，这桶水可经不起洒。",
        "你撞到我啦，年轻人毛手毛脚。"
      ],
      "digger": [
        "滚开！别挡着我干活。",
        "嘿！再撞我可不客气了。"
      ],
      "elder": [
        "哎呦，差点没摔着。走路小心点。",
        "我老了，可经不住你这么一撞。"
      ]
    },
    "steal": {
      "farmer": [
        "嘿！你手往哪儿伸？我可没钱！",
        "偷东西？你比淘金客还可恶。"
      ],
      "digger": [
        "敢偷到我头上？活腻了！",
        "捉贼！有人扒我口袋！"
      ],
      "elder": [
        "老天！连我这老太婆都偷？",
        "住手，我没钱，只有一块怀表。"
      ]
    },
    "witness": {
      "farmer": [
        "住手！还有没有王法了？",
        "别伤害他！你疯了吗？"
      ],
      "digger": [
        "要打出去打，别弄脏我的井。",
        "哼，活该！这地方谁也别想抢。"
      ],
      "elder": [
        "上帝啊，快停下来！",
        "野蛮人！这镇子还有没有法律？"
      ]
    }
  },
  "nodes": [
    {
      "id": "st",
      "title": "井边对峙",
      "hint": "正午的井旁，农夫和淘金客怒目相视，空水桶歪倒在地。",
      "beats": [
        {
          "speaker": "farmer",
          "text": "芬恩，这井属于全镇！你的矿砂把水都糟蹋了！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "digger",
          "text": "笑话！我祖父挖的井，我爱怎么用就怎么用。",
          "delayMs": 1200,
          "mood": "smug"
        },
        {
          "speaker": "elder",
          "text": "唉，我记得老芬恩，可他当年没说过井是他私人的。",
          "delayMs": 1500,
          "mood": "sad"
        },
        {
          "speaker": "farmer",
          "text": "再没水，我的牛就全得死在这该死的旱天了。",
          "delayMs": 1200,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c_investigate",
          "label": "查明真相",
          "icon": "❓",
          "risk": "low",
          "next": "n_ask_elder",
          "line": "老妈妈，您知道这井的旧事？跟我细说说。",
          "effects": {
            "honor": 1
          }
        },
        {
          "id": "c_side_farmer",
          "label": "帮农夫",
          "icon": "❓",
          "risk": "medium",
          "next": "n_threat_digger",
          "line": "巴克利的牛快渴死了，识相的就让开水井。",
          "effects": {
            "honor": 1
          }
        },
        {
          "id": "c_watch",
          "label": "袖手旁观",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "我只是个过路的，这不关我事。",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "n_ask_elder",
      "title": "老玛莎的回忆",
      "hint": "你扶着老玛莎坐到井沿，她眯眼回想三十年前的镇子公约。",
      "beats": [
        {
          "speaker": "elder",
          "text": "当年镇上大伙儿出钱修的这口井，地契应该在市政厅。",
          "delayMs": 1800,
          "mood": "sad"
        },
        {
          "speaker": "digger",
          "text": "胡说！我亲眼见过祖父的地契！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "elder",
          "text": "孩子，你祖父的契据怕是只写了修缮权。",
          "delayMs": 1500,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c_search",
          "label": "找地契",
          "icon": "❓",
          "risk": "low",
          "next": "n_search_hall",
          "line": "空口无凭，我去市政厅废墟翻翻旧档。",
          "effects": {}
        },
        {
          "id": "c_force_digger",
          "label": "赶走淘金客",
          "icon": "❓",
          "risk": "medium",
          "next": "n_threat_digger",
          "line": "管他什么契，再不让水我就动手了。",
          "effects": {
            "honor": 1
          }
        },
        {
          "id": "c_give_up",
          "label": "太麻烦",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "翻那堆破纸干嘛，我还是走吧。",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "n_search_hall",
      "title": "废墟里的铁盒",
      "hint": "市政厅在去年的大火里塌了半截，你踢开焦木，发现一个生锈的铁盒。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "那个铁盒是镇上的地契柜！",
          "delayMs": 1200,
          "mood": "neutral"
        },
        {
          "speaker": "farmer",
          "text": "快打开，老天保佑里面还有东西。",
          "delayMs": 1500,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c_present_deed",
          "label": "公之于众",
          "icon": "❓",
          "risk": "low",
          "next": "n_present_evidence",
          "line": "这就是镇子的地契，井是公产！",
          "effects": {
            "honor": 2
          }
        },
        {
          "id": "c_burn_deed",
          "label": "烧了地契",
          "icon": "❓",
          "risk": "medium",
          "next": "n_burn_deed",
          "line": "这份旧纸，还是烧了干净。芬恩，我站你这边。",
          "effects": {
            "honor": -2
          }
        },
        {
          "id": "c_gun_solve",
          "label": "用枪说话",
          "icon": "❓",
          "risk": "high",
          "next": "n_duel",
          "line": "道理讲不清，子弹最明白。谁反对就吃枪子。",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "n_present_evidence",
      "title": "地契为证",
      "hint": "你高举泛黄的地契，镇民围过来细看。芬恩脸色发白。",
      "beats": [
        {
          "speaker": "digger",
          "text": "这是伪造的！我祖父绝不会骗我！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "elder",
          "text": "上面有镇公所的蜡封，还有老镇长的手印。",
          "delayMs": 1500,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c_force_out",
          "label": "赶走芬恩",
          "icon": "❓",
          "risk": "medium",
          "next": "n_force_out",
          "line": "真相大白，这井没你的份，赶紧滚。",
          "effects": {}
        },
        {
          "id": "c_mediate",
          "label": "主持公道",
          "icon": "❓",
          "risk": "low",
          "next": "e_truth",
          "line": "地契说了是公产，但你也出了力，井水该分着用。",
          "effects": {
            "honor": 3,
            "cash": 10
          }
        },
        {
          "id": "c_walk_away",
          "label": "还是不管",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "证也给了，你们自己商量，我不掺和了。",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "n_force_out",
      "title": "最后的强硬",
      "hint": "芬恩死死抓住井轱辘，眼里像要喷出火来。",
      "beats": [
        {
          "speaker": "digger",
          "text": "想赶我走？先问问我的枪答应不！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "farmer",
          "text": "天杀的，可别在这儿见血。",
          "delayMs": 1200,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c_shoot_digger",
          "label": "开枪",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood1",
          "line": "这是你自找的！",
          "effects": {
            "honor": -3,
            "wanted": 2
          }
        },
        {
          "id": "c_back_off",
          "label": "退缩",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "犯不上把命搭上，我不管了。",
          "effects": {
            "honor": -1
          }
        },
        {
          "id": "c_call_town",
          "label": "召镇民裁决",
          "icon": "❓",
          "risk": "low",
          "next": "e_truth",
          "line": "都听着！这井归镇子，大伙儿说了算！",
          "effects": {
            "honor": 2
          }
        }
      ]
    },
    {
      "id": "n_burn_deed",
      "title": "灰烬里的秘密",
      "hint": "地契在指尖化成灰，农夫瘫坐在地，老玛莎捂住嘴。",
      "beats": [
        {
          "speaker": "farmer",
          "text": "不……你不能这么做……",
          "delayMs": 1500,
          "mood": "sad"
        },
        {
          "speaker": "digger",
          "text": "哈！聪明人！现在井是我的了。",
          "delayMs": 1200,
          "mood": "smug"
        }
      ],
      "choices": [
        {
          "id": "c_threat_farmer",
          "label": "威胁农夫",
          "icon": "❓",
          "risk": "medium",
          "next": "n_threat_farmer",
          "line": "巴克利，你再啰嗦，下场比这地契还惨。",
          "effects": {
            "honor": -2
          }
        },
        {
          "id": "c_claim_water",
          "label": "独霸水井",
          "icon": "❓",
          "risk": "low",
          "next": "e_unfair",
          "line": "有了井，淘金还能发大财。伙计，分我一份。",
          "effects": {
            "honor": -2,
            "cash": 20
          }
        },
        {
          "id": "c_regret_burn",
          "label": "后悔了",
          "icon": "❓",
          "risk": "medium",
          "next": "n_admit_lie",
          "line": "等等，我做了混账事。这地契不该烧……",
          "effects": {
            "honor": 1
          }
        }
      ]
    },
    {
      "id": "n_threat_farmer",
      "title": "枪口下的农夫",
      "hint": "你拔出左轮，农夫巴克利眼神从绝望变成恐惧。",
      "beats": [
        {
          "speaker": "farmer",
          "text": "别开枪！我还有老婆孩子……",
          "delayMs": 1200,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "你这外乡的恶棍，镇里不欢迎你！",
          "delayMs": 1200,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c_kill_farmer",
          "label": "扣动扳机",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood2",
          "line": "砰！",
          "effects": {
            "honor": -5,
            "wanted": 3
          }
        },
        {
          "id": "c_step_back",
          "label": "收枪离开",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "算了，跟个庄稼汉较劲没意思。",
          "effects": {
            "honor": -1
          }
        },
        {
          "id": "c_confess",
          "label": "良心发现",
          "icon": "❓",
          "risk": "low",
          "next": "n_confess_burn",
          "line": "我错了！地契是我烧的，我认罪。",
          "effects": {
            "honor": 2
          }
        }
      ]
    },
    {
      "id": "n_confess_burn",
      "title": "忏悔",
      "hint": "你跪倒在地，坦白罪行。镇民哗然，老玛莎却叹了口气。",
      "beats": [
        {
          "speaker": "elder",
          "text": "孩子，地契烧了，但真相烧不掉。教堂里还有一份副本。",
          "delayMs": 2000,
          "mood": "sad"
        },
        {
          "speaker": "digger",
          "text": "什么？！不可能！",
          "delayMs": 1200,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c_accept_justice",
          "label": "接受审判",
          "icon": "❓",
          "risk": "low",
          "next": "e_truth",
          "line": "我愿受罚，请镇子重新分水。",
          "effects": {
            "honor": 2
          }
        },
        {
          "id": "c_flee",
          "label": "逃跑",
          "icon": "❓",
          "risk": "medium",
          "next": "e_neglect",
          "line": "地契副本一出，我没脸待了，驾！",
          "effects": {
            "honor": -3
          }
        },
        {
          "id": "c_push_farmer",
          "label": "推人下井",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood2",
          "line": "闭嘴！你这老农也配喝水？",
          "effects": {
            "honor": -6,
            "wanted": 3
          }
        }
      ]
    },
    {
      "id": "n_admit_lie",
      "title": "亡羊补牢",
      "hint": "你向众人坦白自己烧了地契，请求补救的机会。",
      "beats": [
        {
          "speaker": "digger",
          "text": "你个叛徒！刚说好帮我，现在却反水？",
          "delayMs": 1500,
          "mood": "angry"
        },
        {
          "speaker": "farmer",
          "text": "你说什么？地契……没了？",
          "delayMs": 1200,
          "mood": "sad"
        }
      ],
      "choices": [
        {
          "id": "c_force_share",
          "label": "强迫共享",
          "icon": "❓",
          "risk": "medium",
          "next": "e_truth",
          "line": "就算没契，井也是大家的！芬恩，分水，不然对你不客气。",
          "effects": {
            "honor": 2
          }
        },
        {
          "id": "c_pay_farmer",
          "label": "花钱摆平",
          "icon": "❓",
          "risk": "low",
          "next": "e_unfair",
          "line": "巴克利，我赔你二十块，够买水了。井留给芬恩。",
          "effects": {
            "honor": -1,
            "cash": -20
          }
        },
        {
          "id": "c_abandon",
          "label": "一走了之",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "太复杂了，你们自己收拾烂摊子吧。",
          "effects": {}
        }
      ]
    },
    {
      "id": "n_threat_digger",
      "title": "剑拔弩张",
      "hint": "你跨前一步，手按枪柄。芬恩也眯起眼，手摸向腰间。",
      "beats": [
        {
          "speaker": "digger",
          "text": "你算老几？想替这泥腿子出头？",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "farmer",
          "text": "先生小心，他有枪。",
          "delayMs": 1200,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c_shoot_first",
          "label": "先发制人",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood1",
          "line": "废话少说，看枪！",
          "effects": {
            "honor": -3,
            "wanted": 2
          }
        },
        {
          "id": "c_scuffle",
          "label": "拳脚教训",
          "icon": "❓",
          "risk": "medium",
          "next": "n_physically_remove",
          "line": "用不着子弹，我拳头就能轰走你。",
          "effects": {}
        },
        {
          "id": "c_retreat",
          "label": "不蹚浑水",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "我可不想吃枪子，你们自己争。",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "n_physically_remove",
      "title": "肉搏",
      "hint": "你们扭作一团，撞翻了水桶，泥地上滚出两道沟。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "揍他！踢他肋骨！",
          "delayMs": 1000,
          "mood": "neutral"
        },
        {
          "speaker": "digger",
          "text": "啊！你这蛮牛！",
          "delayMs": 800,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c_lethal_blow",
          "label": "下死手",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood1",
          "line": "抓起石块砸向他的脑袋……",
          "effects": {
            "honor": -4,
            "wanted": 3
          }
        },
        {
          "id": "c_tie_up",
          "label": "绑送警长",
          "icon": "❓",
          "risk": "low",
          "next": "e_unfair",
          "line": "把他捆了送镇公所，井水归农夫。",
          "effects": {
            "honor": 1,
            "cash": 5
          }
        },
        {
          "id": "c_let_go",
          "label": "撒手不管",
          "icon": "❓",
          "risk": "low",
          "next": "e_neglect",
          "line": "懒得再打，我走了。",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "n_duel",
      "title": "午时决斗",
      "hint": "你拔出左轮，两人同时僵住。正午的阳光刺得人睁不开眼。",
      "beats": [
        {
          "speaker": "digger",
          "text": "你疯了？想一对二？",
          "delayMs": 1200,
          "mood": "shocked"
        },
        {
          "speaker": "farmer",
          "text": "别开枪！我不想死！",
          "delayMs": 1200,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c_gun_digger",
          "label": "毙了淘金客",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood1",
          "line": "芬恩，你下去陪你祖父吧！",
          "effects": {
            "honor": -2,
            "wanted": 2
          }
        },
        {
          "id": "c_gun_farmer",
          "label": "毙了农夫",
          "icon": "❓",
          "risk": "high",
          "next": "e_blood2",
          "line": "巴克利，你的牛今天得换主人了。",
          "effects": {
            "honor": -5,
            "wanted": 3
          }
        },
        {
          "id": "c_fire_air",
          "label": "鸣枪止斗",
          "icon": "❓",
          "risk": "low",
          "next": "e_truth",
          "line": "砰！都住手！井水一人一半，不然我子弹不长眼。",
          "effects": {
            "honor": 3
          }
        }
      ]
    },
    {
      "id": "e_neglect",
      "title": "冷漠的过客",
      "beats": [
        {
          "speaker": "crowd",
          "text": "他转身走了，真是个铁石心肠的家伙。",
          "delayMs": 1500,
          "mood": "angry"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "井边的泪水",
        "lines": [
          "你转身离去，身后传来枪声和水桶碎裂声。",
          "第二天，镇子公告栏贴出缺水警告。"
        ],
        "honor": -2,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "井边惨剧：牲畜渴死，农户崩溃",
            "body": "旱季持续，唯一水井被淘金客霸占洗矿。农户巴克利眼睁睁看着牛群渴死。镇民纷纷指责芬恩自私。本报呼吁社区团结。"
          },
          "message": {
            "fromRole": "elder",
            "text": "你本可以帮忙，却选择了视而不见。巴克利一家失去了一切。你手上沾着他们的眼泪。"
          },
          "item": {
            "ownerRole": "farmer",
            "name": "干涸的水桶",
            "icon": "🪣",
            "value": 25,
            "location": "pocket",
            "content": "这只木桶曾装满清澈的井水，现在却空空如也。桶壁上还留着牛的舔痕。旱季过后，镇上挖了一口公共井，但这只桶被遗弃在角落，仿佛在提醒人们曾经的自私。"
          }
        }
      }
    },
    {
      "id": "e_truth",
      "title": "公正的枪手",
      "beats": [
        {
          "speaker": "elder",
          "text": "你是个好孩子，老天会保佑你的。",
          "delayMs": 1500,
          "mood": "neutral"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "水权归于公义",
        "lines": [
          "地契证明了一切，双方握手言和。",
          "镇长为你赠上一袋银元，感谢你维护公义。"
        ],
        "honor": 4,
        "cash": 20,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "水权公正：历史证据显示井属全镇",
            "body": "老镇民玛莎出示尘封的契约，证明海金客芬恩的祖父当年只是挖井人之一，水权属于全体镇民。法官裁定，井水不得用于洗矿。镇民欢呼。"
          },
          "message": {
            "fromRole": "digger",
            "text": "你赢了，契约是真的。但记住，这事没完。我们淘金客也需要水。"
          },
          "item": {
            "ownerRole": "elder",
            "name": "泛黄的井权书",
            "icon": "📜",
            "value": 50,
            "location": "pocket",
            "content": "这份羊皮纸记录着三十年前，全镇居民共同出资挖了这口井。签名包括芬恩的祖父，但他只是出资最多的捐方，并非唯一所有者。字迹已经模糊，但红印依然清晰。"
          }
        }
      }
    },
    {
      "id": "e_blood1",
      "title": "红水井",
      "beats": [
        {
          "speaker": "farmer",
          "text": "天哪……他死了……",
          "delayMs": 1500,
          "mood": "shocked"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "血染的井沿",
        "lines": [
          "警长发出通缉令，你连夜逃离镇子。",
          "井边的血渍很久没人敢靠近。"
        ],
        "honor": -4,
        "cash": -10,
        "wanted": 2,
        "aftermath": {
          "news": {
            "title": "井边血案：海金客与农户搏斗致死",
            "body": "昨日，海金客芬恩与农户巴克利在井边发生激烈打斗，芬恩中枪身亡。巴克利已被收监，面临谋杀指控。镇民哀叹，水权之争以惨剧收场。"
          },
          "message": {
            "fromRole": "elder",
            "text": "你们这些外人，只知道用枪解决。现在两家都毁了。这井水，现在谁还敢喝？"
          },
          "item": {
            "ownerRole": "farmer",
            "name": "带血的铁锹",
            "icon": "⛏️",
            "value": 10,
            "location": "pocket",
            "content": "这把铁锹曾是挖井的工具，现在却成了凶器。血渍已经发黑，但隐约能看出那是芬恩的图案。巴克利后悔道：'我只是想吓唬他，他却真的拔了枪。'"
          }
        }
      }
    },
    {
      "id": "e_blood2",
      "title": "恶徒之路",
      "beats": [
        {
          "speaker": "crowd",
          "text": "冷血杀手！快去找警长！",
          "delayMs": 1200,
          "mood": "angry"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "悬赏头颅",
        "lines": [
          "巴克利的老马守在井边，哀鸣三天三夜。",
          "你被全镇悬赏，从此不敢再路过此地。"
        ],
        "honor": -6,
        "cash": 30,
        "wanted": 3,
        "aftermath": {
          "news": {
            "title": "通缉令：杀害海金客的凶手在逃",
            "body": "芬恩之死引发淘金客群体的愤怒，警长发布悬赏500美元缉拿凶手巴克利。巴克利逃亡途中，生死未卜。有人说他逃进了沙漠。"
          },
          "message": {
            "fromRole": "elder",
            "text": "你带来的只有仇恨和死亡。现在镇上的淘金客与农户势不两立。这就是你要的结果？"
          },
          "item": {
            "ownerRole": "elder",
            "name": "悬赏告示",
            "icon": "📜",
            "value": 30,
            "location": "pocket",
            "content": "告示上绘着巴克利粗糙的肖像，悬赏500美元。据说有人看见他穿过干涸河床，往南去了。但也有人说，这悬赏是淘金客们凑钱出的，并非官方发布。镇上的人们偷偷撕掉告示，希望他能活下来。"
          }
        }
      }
    },
    {
      "id": "e_unfair",
      "title": "不公的裁决",
      "beats": [
        {
          "speaker": "elder",
          "text": "强权下的和平，又能维持多久呢。",
          "delayMs": 1800,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "苦井",
        "lines": [
          "你以一己之私断了井水之争，镇民敢怒不敢言。",
          "此后十年，这口井被称作‘苦井’。"
        ],
        "honor": -2,
        "cash": 15,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "苦井：水权归了有钱人",
            "body": "法庭判决海金客芬恩有井的所有权，农户巴克利败诉。镇民只能从数里外运水。旱季漫长，镇上的牛眼看就要撑不住了。"
          },
          "message": {
            "fromRole": "farmer",
            "text": "你帮了有钱人。我们的牛奄奄一息，孩子们连洗澡水都没有。你夜里睡得着吗？"
          },
          "item": {
            "ownerRole": "farmer",
            "name": "苦井边的空桶",
            "icon": "🪣",
            "value": 15,
            "location": "pocket",
            "content": "这只桶是巴克利亲手做的，桶底刻着‘公义’二字。他本指望法庭能带来公正，却只带回这只空桶。桶的木板已经干裂，仿佛在控诉不公的世道。镇上的孩子们摸过它，又缩回手，因为粗糙的表面会扎人。"
          }
        }
      }
    }
  ],
  "glueFallbackNode": "st"
};

export const DOCTOR_TRIAGE_TREE = {
  "id": "doctor_triage",
  "title": "医生门前的两个伤号",
  "hintOnEnter": "医生只剩一副夹板和一瓶吗啡",
  "roles": [
    {
      "roleId": "doc",
      "name": "医生海丝特",
      "required": true,
      "jobs": [
        "医生",
        "牧师",
        "酒保"
      ]
    },
    {
      "roleId": "miner",
      "name": "断腿的塔克",
      "required": true,
      "jobs": [
        "淘金客",
        "铁匠",
        "牛仔"
      ]
    },
    {
      "roleId": "mother",
      "name": "孩子的母亲",
      "required": true,
      "jobs": [
        "歌女",
        "商人",
        "记者"
      ]
    },
    {
      "roleId": "crowd",
      "name": null,
      "required": false,
      "jobs": [],
      "count": 2
    }
  ],
  "entryNode": "st",
  "unattendedMs": 70000,
  "timeoutNode": "e_ignore",
  "idleLoop": [
    {
      "speaker": "miner",
      "text": "我的腿要废了，该死的！",
      "delayMs": 2400,
      "mood": "angry"
    },
    {
      "speaker": "mother",
      "text": "先救救我的孩子，求你了！",
      "delayMs": 2400,
      "mood": "scared"
    },
    {
      "speaker": "doc",
      "text": "别吵了，我只有一副夹板。",
      "delayMs": 2400,
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "真是作孽啊。",
      "delayMs": 2400,
      "mood": "sad"
    },
    {
      "speaker": "miner",
      "text": "给我吗啡，我快疼死了！",
      "delayMs": 2400,
      "mood": "angry"
    },
    {
      "speaker": "mother",
      "text": "他还有命，我的孩子快不行了！",
      "delayMs": 2400,
      "mood": "scared"
    }
  ],
  "reactions": {
    "hit": {
      "doc": [
        "把手拿开！我可是镇上唯一的医生。",
        "你打医生？等着下地狱吧！"
      ],
      "miner": [
        "我的腿已经断了，还要挨揍？",
        "混蛋！欺负一个残废？"
      ],
      "mother": [
        "打我？你还有良心吗？",
        "离我远点！我要救我孩子！"
      ]
    },
    "bump": {
      "doc": [
        "该死！你撞到我的病人了。",
        "小心点，这里挤满伤员。"
      ],
      "miner": [
        "啊！我这断腿又被你撞了。",
        "看着路行吗？疼死我了。"
      ],
      "mother": [
        "别挤！我孩子等着救命。",
        "天啊，你差点撞倒我。"
      ]
    },
    "steal": {
      "doc": [
        "你的手往哪摸？卫生员！",
        "偷东西？我叫警长抓你。"
      ],
      "miner": [
        "我的口袋是空的，没东西。",
        "你敢摸我？我跟你拼了。"
      ],
      "mother": [
        "不要脸！连救命钱都偷？",
        "我只有几个硬币，滚开。"
      ]
    },
    "witness": {
      "doc": [
        "快停下！诊所不是斗殴场。",
        "你打他？我会作证的。"
      ],
      "miner": [
        "上帝啊，你怎么打人？",
        "住手！警长马上就到。"
      ],
      "mother": [
        "别打了！别吓着我的孩子。",
        "暴力有什么用？救人要紧。"
      ]
    }
  },
  "nodes": [
    {
      "id": "st",
      "title": "诊所门前的争吵",
      "hint": "医生海丝特站在门口，手里只有一副夹板和一瓶吗啡。",
      "beats": [
        {
          "speaker": "miner",
          "text": "医生，先救我！这腿断了。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "mother",
          "text": "不，我的孩子被马踢了头！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "doc",
          "text": "上帝，我只能救一个。",
          "delayMs": 900,
          "mood": "sad"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "问清伤情",
          "icon": "❓",
          "risk": "low",
          "next": "q1",
          "line": "都冷静，先让我看看怎么回事。"
        },
        {
          "id": "c2",
          "label": "帮矿工说话",
          "icon": "⛏️",
          "risk": "medium",
          "next": "side_miner",
          "line": "那汉子都快疼死了，先救他！"
        },
        {
          "id": "c3",
          "label": "袖手旁观",
          "icon": "🚬",
          "risk": "low",
          "next": "watch1",
          "line": "这是你们的破事，我不掺和。"
        }
      ]
    },
    {
      "id": "q1",
      "title": "盘问详情",
      "hint": "你走近两人，俯身查看他们的伤势。",
      "beats": [
        {
          "speaker": "doc",
          "text": "矿工塔克，矿场落石砸的。",
          "delayMs": 900,
          "mood": "neutral"
        },
        {
          "speaker": "mother",
          "text": "孩子在马厩被疯马踢了。",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "miner",
          "text": "快做决定，这腿等不起！",
          "delayMs": 900,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c4",
          "label": "追问矿工",
          "icon": "⛏️",
          "risk": "low",
          "next": "ask_miner",
          "line": "塔克，矿场在哪儿出的事？"
        },
        {
          "id": "c5",
          "label": "查看孩子",
          "icon": "👶",
          "risk": "low",
          "next": "check_child",
          "line": "让我看看这孩子的头。"
        },
        {
          "id": "c6",
          "label": "质问母亲",
          "icon": "👩",
          "risk": "low",
          "next": "ask_mother",
          "line": "当时你在哪儿，太太？"
        }
      ]
    },
    {
      "id": "ask_miner",
      "title": "矿工的说辞",
      "hint": "塔克额头上全是汗珠，疼得直哆嗦。",
      "beats": [
        {
          "speaker": "miner",
          "text": "蓝山矿场，昨天下午。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "doc",
          "text": "胡说，那里昨天就封了。",
          "delayMs": 900,
          "mood": "shocked"
        },
        {
          "speaker": "miner",
          "text": "我记错了，是野牛矿场。",
          "delayMs": 900,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c7",
          "label": "揭穿谎言",
          "icon": "🔍",
          "risk": "medium",
          "next": "truth_reveal",
          "line": "你在撒谎，矿场的事咱们得查清楚。"
        },
        {
          "id": "c8",
          "label": "先救他",
          "icon": "⛏️",
          "risk": "medium",
          "next": "insist_miner",
          "line": "管他哪儿伤的，先给他治腿。"
        },
        {
          "id": "c9",
          "label": "看看孩子",
          "icon": "👶",
          "risk": "low",
          "next": "check_child",
          "line": "我还是不放心那孩子。"
        }
      ]
    },
    {
      "id": "check_child",
      "title": "昏迷的孩子",
      "hint": "孩子脸色苍白，呼吸微弱，头上缠着血布。",
      "beats": [
        {
          "speaker": "mother",
          "text": "比利被一匹栗色马踢的。",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "miner",
          "text": "栗色马？……不关我事。",
          "delayMs": 900,
          "mood": "shocked"
        },
        {
          "speaker": "crowd",
          "text": "那马不是塔克骑来的吗？",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c10",
          "label": "追问那匹马",
          "icon": "🐴",
          "risk": "low",
          "next": "ask_mother",
          "line": "说清楚，那匹马是谁的？"
        },
        {
          "id": "c11",
          "label": "先救孩子",
          "icon": "👶",
          "risk": "medium",
          "next": "side_mother",
          "line": "别争了，这孩子快不行了，先救他。"
        },
        {
          "id": "c12",
          "label": "与我无关",
          "icon": "🚬",
          "risk": "low",
          "next": "watch1",
          "line": "你们的烂账，我不想卷进去。"
        }
      ]
    },
    {
      "id": "ask_mother",
      "title": "母亲的哭诉",
      "hint": "那个女人眼泪汪汪，但还是死死盯着矿工。",
      "beats": [
        {
          "speaker": "mother",
          "text": "马是塔克的，我亲眼见他骑来。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "miner",
          "text": "这疯女人在胡说！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "doc",
          "text": "塔克，你的马在哪儿？",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c13",
          "label": "让矿工闭嘴",
          "icon": "🔫",
          "risk": "high",
          "next": "gun_standoff",
          "line": "你给我闭嘴，不然子弹可不长眼。"
        },
        {
          "id": "c14",
          "label": "听她说下去",
          "icon": "👂",
          "risk": "low",
          "next": "truth_reveal",
          "line": "说，太太，马的事从头讲。"
        },
        {
          "id": "c15",
          "label": "转身离开",
          "icon": "🚬",
          "risk": "low",
          "next": "watch1",
          "line": "这乱子我管不了，你们自己争吧。"
        }
      ]
    },
    {
      "id": "truth_reveal",
      "title": "真相大白",
      "hint": "矿工塔克的谎言被戳穿，脸色变得铁青。",
      "beats": [
        {
          "speaker": "doc",
          "text": "塔克，你偷了马，还伤了孩子。",
          "delayMs": 900,
          "mood": "shocked"
        },
        {
          "speaker": "miner",
          "text": "那马自己惊了，不是我！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "mother",
          "text": "你这个贼，还我比利！",
          "delayMs": 900,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c16",
          "label": "掏枪对峙",
          "icon": "🔫",
          "risk": "high",
          "next": "gun_standoff",
          "line": "别动，塔克，动一下试试。"
        },
        {
          "id": "c17",
          "label": "放他一马",
          "icon": "🤝",
          "risk": "low",
          "next": "e_compromise",
          "line": "你走吧，别让事情更糟。"
        },
        {
          "id": "c18",
          "label": "叫警长",
          "icon": "⭐",
          "risk": "low",
          "next": "e_truth",
          "line": "警长！这儿有盗马贼！"
        }
      ]
    },
    {
      "id": "side_miner",
      "title": "偏袒矿工",
      "hint": "你开口帮矿工说话，塔克眼睛亮了起来。",
      "beats": [
        {
          "speaker": "miner",
          "text": "先生，您真是个好人！",
          "delayMs": 900,
          "mood": "smug"
        },
        {
          "speaker": "mother",
          "text": "你不能这样，孩子要死了！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "doc",
          "text": "这会让良心不安的。",
          "delayMs": 900,
          "mood": "sad"
        }
      ],
      "choices": [
        {
          "id": "c19",
          "label": "威胁母亲",
          "icon": "🔫",
          "risk": "high",
          "next": "threat_mother",
          "line": "太太，再说一个字，我就请你离开。"
        },
        {
          "id": "c20",
          "label": "劝医生动手",
          "icon": "⛏️",
          "risk": "medium",
          "next": "insist_miner",
          "line": "医生，快给他夹板，别磨蹭。"
        },
        {
          "id": "c21",
          "label": "给威士忌",
          "icon": "🥃",
          "risk": "low",
          "next": "whiskey_miner",
          "line": "给他灌点威士忌，能顶一阵。"
        }
      ]
    },
    {
      "id": "side_mother",
      "title": "偏袒母亲",
      "hint": "你决定站在孩子这边，母亲感激地点头。",
      "beats": [
        {
          "speaker": "mother",
          "text": "谢谢你，先生，上帝保佑你。",
          "delayMs": 900,
          "mood": "sad"
        },
        {
          "speaker": "miner",
          "text": "你这混蛋，我的腿怎么办？",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "doc",
          "text": "先处理孩子，也许还有机会。",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c22",
          "label": "掏枪警告",
          "icon": "🔫",
          "risk": "high",
          "next": "draw_gun",
          "line": "塔克，后退，不然我不客气。"
        },
        {
          "id": "c23",
          "label": "提议威士忌",
          "icon": "🥃",
          "risk": "low",
          "next": "whiskey_miner",
          "line": "给他威士忌，让他忍忍。"
        },
        {
          "id": "c24",
          "label": "强行救孩子",
          "icon": "👶",
          "risk": "medium",
          "next": "e_compromise",
          "line": "医生，别管他，先救这孩子！"
        }
      ]
    },
    {
      "id": "insist_miner",
      "title": "固执己见",
      "hint": "你不顾反对，坚持先救矿工，医生叹了口气。",
      "beats": [
        {
          "speaker": "doc",
          "text": "夹板给他，但上帝宽恕我。",
          "delayMs": 900,
          "mood": "sad"
        },
        {
          "speaker": "miner",
          "text": "哈哈，好，我欠你一命。",
          "delayMs": 900,
          "mood": "smug"
        },
        {
          "speaker": "mother",
          "text": "不！我孩子没呼吸了！",
          "delayMs": 900,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c25",
          "label": "继续救他",
          "icon": "⛏️",
          "risk": "high",
          "next": "e_death",
          "line": "别停，医生，他的腿要紧。"
        },
        {
          "id": "c26",
          "label": "改变主意",
          "icon": "👶",
          "risk": "medium",
          "next": "side_mother",
          "line": "等等，先看看那孩子！"
        },
        {
          "id": "c27",
          "label": "用枪逼医生",
          "icon": "🔫",
          "risk": "high",
          "next": "draw_gun",
          "line": "照我说的做，不然崩了你。"
        }
      ]
    },
    {
      "id": "whiskey_miner",
      "title": "威士忌止痛",
      "hint": "你摸出一瓶威士忌，矿工抢过去猛灌。",
      "beats": [
        {
          "speaker": "miner",
          "text": "啊……这劲儿够大。",
          "delayMs": 900,
          "mood": "neutral"
        },
        {
          "speaker": "doc",
          "text": "他醉过去兴许能忍。",
          "delayMs": 900,
          "mood": "neutral"
        },
        {
          "speaker": "mother",
          "text": "那我的孩子呢？",
          "delayMs": 900,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c28",
          "label": "灌醉他",
          "icon": "🥃",
          "risk": "low",
          "next": "e_compromise",
          "line": "再给他喝点，让他睡过去。"
        },
        {
          "id": "c29",
          "label": "逼母亲退让",
          "icon": "🔫",
          "risk": "high",
          "next": "threat_mother",
          "line": "太太，你最好别惹事。"
        },
        {
          "id": "c30",
          "label": "找警长",
          "icon": "⭐",
          "risk": "low",
          "next": "e_truth",
          "line": "我去找警长，让他来断这桩事。"
        }
      ]
    },
    {
      "id": "threat_mother",
      "title": "威胁母亲",
      "hint": "你拔枪指向那个母亲，她突然从裙下掏出一把小手枪。",
      "beats": [
        {
          "speaker": "mother",
          "text": "别以为我好欺负，外地佬。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "miner",
          "text": "哈哈，这娘们儿还有一手。",
          "delayMs": 900,
          "mood": "smug"
        },
        {
          "speaker": "crowd",
          "text": "要出人命了！",
          "delayMs": 900,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c31",
          "label": "开枪",
          "icon": "🔫",
          "risk": "high",
          "next": "e_violence",
          "line": "那就看谁快，太太。"
        },
        {
          "id": "c32",
          "label": "僵持",
          "icon": "🔫",
          "risk": "high",
          "next": "gun_standoff",
          "line": "都别动，枪子可不认人。"
        },
        {
          "id": "c33",
          "label": "反悔救孩子",
          "icon": "👶",
          "risk": "medium",
          "next": "side_mother",
          "line": "我错了，先救孩子吧。"
        }
      ]
    },
    {
      "id": "watch1",
      "title": "冷眼旁观",
      "hint": "你靠在墙上，点起烟斗，看着这场闹剧。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "这外地人可真够冷血的。",
          "delayMs": 900,
          "mood": "neutral"
        },
        {
          "speaker": "doc",
          "text": "你们谁先让步？",
          "delayMs": 900,
          "mood": "sad"
        },
        {
          "speaker": "miner",
          "text": "我绝不让，死也不让！",
          "delayMs": 900,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c34",
          "label": "还是问清楚",
          "icon": "❓",
          "risk": "low",
          "next": "q1",
          "line": "等等，我还是得弄明白。"
        },
        {
          "id": "c35",
          "label": "继续旁观",
          "icon": "🚬",
          "risk": "low",
          "next": "watch2",
          "line": "我倒要看看能闹成什么样。"
        },
        {
          "id": "c36",
          "label": "掏枪控制",
          "icon": "🔫",
          "risk": "high",
          "next": "draw_gun",
          "line": "都别动，谁敢乱来我毙了谁。"
        }
      ]
    },
    {
      "id": "watch2",
      "title": "抢夺吗啡",
      "hint": "两人开始动手，矿工挣扎着要抢那瓶吗啡。",
      "beats": [
        {
          "speaker": "miner",
          "text": "给我，那是我的！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "mother",
          "text": "别碰它，你这恶棍！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "doc",
          "text": "快住手，瓶子要碎了！",
          "delayMs": 900,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c37",
          "label": "再看下去",
          "icon": "🚬",
          "risk": "low",
          "next": "e_ignore",
          "line": "碎了就碎了，反正不关我事。"
        },
        {
          "id": "c38",
          "label": "拦下矿工",
          "icon": "🔫",
          "risk": "high",
          "next": "gun_standoff",
          "line": "塔克，再动一下我打穿你。"
        },
        {
          "id": "c39",
          "label": "帮母亲",
          "icon": "👶",
          "risk": "medium",
          "next": "e_compromise",
          "line": "太太，把瓶子给我！"
        }
      ]
    },
    {
      "id": "draw_gun",
      "title": "拔枪镇场",
      "hint": "你拔出左轮，众人立刻安静下来。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "老天，他真的要开枪。",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "doc",
          "text": "别开枪，我按你说的做。",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "miner",
          "text": "你没法同时瞄着两个人。",
          "delayMs": 900,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c40",
          "label": "逼救矿工",
          "icon": "⛏️",
          "risk": "high",
          "next": "e_death",
          "line": "医生，先治矿工的腿。"
        },
        {
          "id": "c41",
          "label": "逼救孩子",
          "icon": "👶",
          "risk": "medium",
          "next": "e_compromise",
          "line": "救那孩子，不然你赔命。"
        },
        {
          "id": "c42",
          "label": "收枪离开",
          "icon": "🚬",
          "risk": "low",
          "next": "watch1",
          "line": "算了，我不想惹麻烦。"
        }
      ]
    },
    {
      "id": "gun_standoff",
      "title": "枪口对峙",
      "hint": "你举着枪，矿工和母亲也在对峙，空气紧绷。",
      "beats": [
        {
          "speaker": "miner",
          "text": "你敢动我，你也活不成。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "mother",
          "text": "放下枪，不然一起死。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "警长怎么还不来？",
          "delayMs": 900,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c43",
          "label": "开枪",
          "icon": "🔫",
          "risk": "high",
          "next": "e_violence",
          "line": "那就一起死吧，塔克！"
        },
        {
          "id": "c44",
          "label": "和平解决",
          "icon": "🤝",
          "risk": "low",
          "next": "e_truth",
          "line": "放下枪，我们把事情说清楚。"
        },
        {
          "id": "c45",
          "label": "退出",
          "icon": "🚬",
          "risk": "low",
          "next": "e_ignore",
          "line": "你们打死打活，我不管了。"
        }
      ]
    },
    {
      "id": "e_ignore",
      "title": "袖手旁观的下场",
      "beats": [
        {
          "speaker": "crowd",
          "text": "吗啡瓶碎了，谁也救不了。",
          "delayMs": 1200,
          "mood": "sad"
        },
        {
          "speaker": "doc",
          "text": "我的上帝，孩子没气了。",
          "delayMs": 1200,
          "mood": "shocked"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "袖手旁观的下场",
        "lines": [
          "吗啡瓶碎了一地，没人得救。",
          "孩子痛苦地死去，矿工截肢。",
          "你转身离开，身后传来哭声。"
        ],
        "honor": -3,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "诊所悲剧：两命丧黄泉",
            "body": "昨日，本镇诊所发生惨剧，矿工塔克与幼童因未获及时救治双双殒命。医生海丝特·沃纳表示当时无法决断，而旁观者无人援手。"
          },
          "message": {
            "fromRole": "doc",
            "text": "那天你只需说一句话，我就能决定。可你冷眼旁观，让他们死在我眼前。我夜夜被噩梦惊醒，诊所也关门了。你的沉默是帮凶。"
          },
          "item": {
            "ownerRole": "doc",
            "name": "医生的忏悔信",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "信纸上潦草地写着：\"我不该等你开口。塔克的腿只需夹板固定，孩子的头伤如果立刻处理也能活。可我犹豫了，你也犹豫了。我们共同害死了他们。海丝特。\""
          }
        }
      }
    },
    {
      "id": "e_death",
      "title": "一条小命的代价",
      "beats": [
        {
          "speaker": "mother",
          "text": "我的比利，睁开眼睛啊！",
          "delayMs": 1200,
          "mood": "scared"
        },
        {
          "speaker": "miner",
          "text": "你也别太难过，他命该如此。",
          "delayMs": 1200,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "一条小命的代价",
        "lines": [
          "医生被迫先处理矿工。",
          "母亲怀里的孩子渐渐没了呼吸。",
          "你的心偏了，代价是一条人命。"
        ],
        "honor": -4,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "幼童不幸离世 母亲痛不欲生",
            "body": "一篇令人心碎的消息：索菲·米勒的幼子因坠马头部重创，昨日在诊所不治。医生称当时资源有限，优先救治了矿工。母亲当场昏厥。"
          },
          "message": {
            "fromRole": "mother",
            "text": "你看见了，对吗？我的小汤米就那么走了。我问你帮帮我，你只是摇头。现在每晚我听见他在哭，可我再也没法抱起他。"
          },
          "item": {
            "ownerRole": "mother",
            "name": "破损的木马",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一个手工雕刻的小木马，底座刻着\"汤米·米勒，1879\"。木马断了一只腿，用布包裹。索菲的丈夫下落不明，孩子是她唯一的希望。她变卖所有只为买药。"
          }
        }
      }
    },
    {
      "id": "e_truth",
      "title": "正义的铁锤",
      "beats": [
        {
          "speaker": "crowd",
          "text": "警长来了，塔克跑不掉了。",
          "delayMs": 1200,
          "mood": "neutral"
        },
        {
          "speaker": "doc",
          "text": "孩子有救，快抬进去。",
          "delayMs": 1200,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "正义的铁锤",
        "lines": [
          "矿工塔克被认出是盗马贼。",
          "警长带走了他，孩子得到救治。",
          "小镇感谢你的敏锐和勇气。"
        ],
        "honor": 5,
        "cash": 20,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "矿难黑幕揭发 正义得到伸张",
            "body": "本报独家披露：上月矿难系朱利安矿业公司无视安全所致。矿工塔克断腿后仍勇敢作证，法官已签发逮捕令。但诊所一幕暴露制度弊端。"
          },
          "message": {
            "fromRole": "miner",
            "text": "多谢你伙计，虽然我的腿没了，但那些黑心家伙终于受到惩罚。你帮我大声说出真相。以后我拄拐也能赚钱养家。"
          },
          "item": {
            "ownerRole": "miner",
            "name": "矿主账本残页",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一页烧焦的账目，记录着\"支撑木：未购买\"。角落有朱利安的签名。这页纸是塔克从矿难现场死去的工友口袋中发现的，他珍藏至今，只为等待公正。"
          }
        }
      }
    },
    {
      "id": "e_violence",
      "title": "血溅诊所",
      "beats": [
        {
          "speaker": "crowd",
          "text": "杀人了！他打死了他！",
          "delayMs": 1200,
          "mood": "scared"
        },
        {
          "speaker": "doc",
          "text": "老天，这太疯狂了。",
          "delayMs": 1200,
          "mood": "shocked"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "血溅诊所",
        "lines": [
          "子弹穿透了他的胸膛。",
          "你收起枪，在众人惊恐中离去。",
          "从今往后，你的名字上了悬赏令。"
        ],
        "honor": -6,
        "cash": 0,
        "wanted": 2,
        "aftermath": {
          "news": {
            "title": "诊所变屠场 一人遇害",
            "body": "昨日，一名狂徒在医生诊所内行凶，矿工塔克惨死。目击者称凶手因不满救治顺序而拔枪。惨案震惊全镇，警长正全力缉凶。"
          },
          "message": {
            "fromRole": "doc",
            "text": "那场面我永生难忘。你为了先救孩子，就开枪杀了塔克？鲜血溅满手术台。现在汤米得救了，可我怎么面对他的母亲？你去自首吧。"
          },
          "item": {
            "ownerRole": "mother",
            "name": "染血的手帕",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一块白手帕，沾染深褐色血渍，角落绣着\"S.M.\"。那是索菲给孩子擦汗的，枪响时她正跪地哀求。手帕后来被医生收起，成为控诉罪行的证据。"
          }
        }
      }
    },
    {
      "id": "e_compromise",
      "title": "两全的遗憾",
      "beats": [
        {
          "speaker": "doc",
          "text": "用威士忌麻醉他，木板固定。",
          "delayMs": 1200,
          "mood": "neutral"
        },
        {
          "speaker": "mother",
          "text": "我的孩子醒了，谢天谢地。",
          "delayMs": 1200,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "两全的遗憾",
        "lines": [
          "医生用威士忌麻醉矿工，用木板固定腿。",
          "孩子止住了血，但还需要漫长恢复。",
          "你尽力了，但没人真正满意。"
        ],
        "honor": 1,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "医生巧施援手 两伤号均得救",
            "body": "昨日诊所上演生命争夺战。海丝特医生当机立断，用夹板固定矿工断腿，以少量吗啡缓解幼童剧痛。最终两人均脱离危险，但或有后遗症。"
          },
          "message": {
            "fromRole": "doc",
            "text": "我做到了，但问心有愧。吗啡剂量太小，孩子可能成瘾；夹板太粗糙，塔克的腿会跛。那天你说\"试试吧\"，给了我勇气。可对错谁知道呢？"
          },
          "item": {
            "ownerRole": "doc",
            "name": "医生的日志一页",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "日志写道：\"1880年9月12日，两难。夹板只有一副，吗啡仅一瓶。我让塔克咬着皮带，把夹板绑上他的腿；给孩子灌下三分之一吗啡，他昏睡过去。有人提议抽签，我拒绝了。生命不能赌。\""
          }
        }
      }
    }
  ],
  "glueFallbackNode": "st"
};

export const FUNERAL_WILL_TREE = {
  "id": "funeral_will",
  "title": "棺材前的遗产",
  "hintOnEnter": "教堂前摆着一口没钉盖的棺材",
  "roles": [
    {
      "roleId": "priest",
      "name": "牧师伊诺克",
      "required": true,
      "jobs": [
        "牧师",
        "医生",
        "商人"
      ]
    },
    {
      "roleId": "widow",
      "name": "遗孀艾达",
      "required": true,
      "jobs": [
        "歌女",
        "商人",
        "记者"
      ]
    },
    {
      "roleId": "brother",
      "name": "死者的弟弟",
      "required": true,
      "jobs": [
        "赌徒",
        "牛仔",
        "淘金客"
      ]
    },
    {
      "roleId": "crowd",
      "name": null,
      "required": false,
      "jobs": [],
      "count": 2
    }
  ],
  "entryNode": "st",
  "unattendedMs": 70000,
  "timeoutNode": "e_passive",
  "idleLoop": [
    {
      "speaker": "crowd",
      "text": "外乡人，你倒是说句话啊。",
      "delayMs": 2400,
      "mood": "neutral"
    },
    {
      "speaker": "priest",
      "text": "上帝注视着你，做出选择吧。",
      "delayMs": 2600,
      "mood": "scared"
    }
  ],
  "reactions": {
    "hit": {
      "priest": [
        "上帝会宽恕你的无礼！",
        "住手！这是神的圣所！"
      ],
      "widow": [
        "你敢打一个寡妇？",
        "救命！有人行凶！"
      ],
      "brother": [
        "你找错人了，伙计！",
        "我会让你付出代价！"
      ]
    },
    "bump": {
      "priest": [
        "小心点，我的孩子。",
        "走路看着点路！"
      ],
      "widow": [
        "没长眼睛吗？",
        "撞到女士了！"
      ],
      "brother": [
        "走路不长眼？",
        "你撞疼我了！"
      ]
    },
    "steal": {
      "priest": [
        "贫乏的教堂你也偷？",
        "忏悔吧，可怜的小偷。"
      ],
      "widow": [
        "抓贼！有人偷我钱袋！",
        "敢偷可怜的寡妇？"
      ],
      "brother": [
        "想偷我的地契？没门！",
        "手伸我口袋，找死！"
      ]
    },
    "witness": {
      "priest": [
        "暴力解决不了问题！",
        "都住手，冷静下来！"
      ],
      "widow": [
        "天哪，打起来了！",
        "快叫警长来！"
      ],
      "brother": [
        "哈哈，揍他！",
        "别让血溅到棺材！"
      ]
    }
  },
  "nodes": [
    {
      "id": "st",
      "title": "棺材前的遗产",
      "hint": "教堂前，遗孀和弟弟为地契争吵不休。",
      "beats": [
        {
          "speaker": "widow",
          "text": "地契是丈夫临终前亲手给我的！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "brother",
          "text": "胡说！哥哥早答应分我一半！",
          "delayMs": 1000,
          "mood": "angry"
        },
        {
          "speaker": "priest",
          "text": "冷静些，上帝在看着我们。",
          "delayMs": 1200,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "打开棺材看看不就清楚了？",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "询问牧师",
          "icon": "❓",
          "risk": "low",
          "next": "invest1",
          "line": "牧师，到底怎么回事？"
        },
        {
          "id": "c2",
          "label": "帮遗孀",
          "icon": "👩",
          "risk": "medium",
          "next": "help_widow",
          "line": "寡妇的话在理，地契归她。"
        },
        {
          "id": "c3",
          "label": "拔枪震慑",
          "icon": "🔫",
          "risk": "high",
          "next": "violence1",
          "line": "都闭嘴，不然子弹不长眼！"
        }
      ]
    },
    {
      "id": "invest1",
      "title": "牧师的陈述",
      "hint": "伊诺克牧师擦着汗，说地契就放在死者胸口。",
      "beats": [
        {
          "speaker": "priest",
          "text": "地契在棺材里，先生。两人都不肯让步。",
          "delayMs": 1000,
          "mood": "neutral"
        },
        {
          "speaker": "widow",
          "text": "那是我应得的，他欠我的。",
          "delayMs": 900,
          "mood": "sad"
        },
        {
          "speaker": "brother",
          "text": "我哥哥生前答应过的！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "说不定真有金矿呢。",
          "delayMs": 1100,
          "mood": "greedy"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "查看棺材",
          "icon": "⚰️",
          "risk": "medium",
          "next": "invest_coffin",
          "line": "让我看看棺材里的东西。"
        },
        {
          "id": "c2",
          "label": "信遗孀",
          "icon": "💔",
          "risk": "medium",
          "next": "help_widow",
          "line": "夫人，我相信你的话。"
        },
        {
          "id": "c3",
          "label": "信弟弟",
          "icon": "🃏",
          "risk": "medium",
          "next": "help_brother",
          "line": "也许弟弟说的是实情。"
        }
      ]
    },
    {
      "id": "invest_coffin",
      "title": "开棺验看",
      "hint": "你推开棺材盖，死者手中握着地契，还有一封泛黄的信。",
      "beats": [
        {
          "speaker": "widow",
          "text": "别碰他！那是我的地契！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "brother",
          "text": "快拿出来看看！",
          "delayMs": 800,
          "mood": "greedy"
        },
        {
          "speaker": "crowd",
          "text": "小心有诈…",
          "delayMs": 1000,
          "mood": "neutral"
        },
        {
          "speaker": "priest",
          "text": "上帝保佑，但愿不是骗局。",
          "delayMs": 1100,
          "mood": "scared"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "鉴定地契",
          "icon": "🔍",
          "risk": "low",
          "next": "invest_fake",
          "line": "这墨迹有点怪，让我细看。"
        },
        {
          "id": "c2",
          "label": "给遗孀",
          "icon": "👩‍🦰",
          "risk": "medium",
          "next": "violence_widow",
          "line": "夫人，地契归你了。"
        },
        {
          "id": "c3",
          "label": "给弟弟",
          "icon": "🤠",
          "risk": "medium",
          "next": "violence_brother",
          "line": "老弟，拿着，别吵了。"
        }
      ]
    },
    {
      "id": "invest_fake",
      "title": "地契的秘密",
      "hint": "你仔细察看，发现地契上的签名墨迹很新，像是伪造。",
      "beats": [
        {
          "speaker": "crowd",
          "text": "怎么回事？假的？",
          "delayMs": 900,
          "mood": "shocked"
        },
        {
          "speaker": "widow",
          "text": "不可能！是他亲手写的！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "brother",
          "text": "我早说她不怀好意！",
          "delayMs": 1000,
          "mood": "angry"
        },
        {
          "speaker": "priest",
          "text": "主啊，欺骗是罪。",
          "delayMs": 1100,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "报警揭发",
          "icon": "⚖️",
          "risk": "low",
          "next": "e_truth",
          "line": "这是伪造的，叫警长来！",
          "effects": {
            "honor": 3
          }
        },
        {
          "id": "c2",
          "label": "勒索寡妇",
          "icon": "💰",
          "risk": "medium",
          "next": "e_greed",
          "line": "夫人，出点钱我就闭嘴。",
          "effects": {
            "honor": -2,
            "cash": 50
          }
        },
        {
          "id": "c3",
          "label": "撕了地契",
          "icon": "🔥",
          "risk": "medium",
          "next": "e_passive",
          "line": "既然假的，留着没用！",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "help_widow",
      "title": "遗孀的拥护者",
      "hint": "你站到遗孀身后，弟弟的眼睛像要喷火。",
      "beats": [
        {
          "speaker": "brother",
          "text": "外乡人，别管闲事！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "widow",
          "text": "谢谢你，好心的先生。",
          "delayMs": 800,
          "mood": "smug"
        },
        {
          "speaker": "crowd",
          "text": "这枪手要替寡妇出头了。",
          "delayMs": 1000,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "劝弟弟罢手",
          "icon": "🗣️",
          "risk": "medium",
          "next": "negotiate_widow",
          "line": "兄弟，别争了，对她公平点。"
        },
        {
          "id": "c2",
          "label": "掏枪威胁",
          "icon": "🔫",
          "risk": "high",
          "next": "violence_widow",
          "line": "再闹就请你吃枪子！"
        },
        {
          "id": "c3",
          "label": "不管了离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "这事我管不了，告辞。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "negotiate_widow",
      "title": "劝说弟弟",
      "hint": "你试图用道理说服弟弟放弃争夺。",
      "beats": [
        {
          "speaker": "brother",
          "text": "她只是个歌女，凭什么得地？",
          "delayMs": 1000,
          "mood": "angry"
        },
        {
          "speaker": "widow",
          "text": "我照顾他到最后一刻！",
          "delayMs": 900,
          "mood": "sad"
        },
        {
          "speaker": "crowd",
          "text": "听听他怎么说。",
          "delayMs": 800,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "提议平分",
          "icon": "🤝",
          "risk": "low",
          "next": "e_peaceful",
          "line": "不如平分地契，大家都得益。",
          "effects": {
            "honor": 2,
            "cash": 20
          }
        },
        {
          "id": "c2",
          "label": "拔枪解决",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody",
          "line": "说不通，那就用枪说话！",
          "effects": {
            "honor": -3,
            "cash": -20,
            "wanted": 2
          }
        },
        {
          "id": "c3",
          "label": "放弃调解",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "你们自己解决吧。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "violence_widow",
      "title": "枪口下的对峙",
      "hint": "你拔枪指着弟弟，他脸色铁青。",
      "beats": [
        {
          "speaker": "brother",
          "text": "你敢开枪？警长不会放过你！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "widow",
          "text": "别杀他，我们走就是。",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "要流血了！",
          "delayMs": 800,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "命令他离开",
          "icon": "👢",
          "risk": "medium",
          "next": "e_peaceful",
          "line": "滚出镇子，别再回来。",
          "effects": {
            "honor": 1,
            "cash": 10
          }
        },
        {
          "id": "c2",
          "label": "开枪",
          "icon": "💥",
          "risk": "high",
          "next": "e_bloody",
          "line": "这是你自找的！",
          "effects": {
            "honor": -3,
            "cash": -20,
            "wanted": 2
          }
        },
        {
          "id": "c3",
          "label": "收枪离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "算了，不干我事。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "help_brother",
      "title": "弟弟的帮手",
      "hint": "你走到弟弟身边，遗孀怒视着你。",
      "beats": [
        {
          "speaker": "widow",
          "text": "你居然帮他？叛徒！",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "brother",
          "text": "哈哈，识相的外乡人。",
          "delayMs": 800,
          "mood": "smug"
        },
        {
          "speaker": "crowd",
          "text": "风向转得真快。",
          "delayMs": 900,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "劝遗孀罢手",
          "icon": "🗣️",
          "risk": "medium",
          "next": "negotiate_brother",
          "line": "夫人，他的要求不过分。"
        },
        {
          "id": "c2",
          "label": "掏枪威胁",
          "icon": "🔫",
          "risk": "high",
          "next": "violence_brother",
          "line": "寡妇，把地契交出来！"
        },
        {
          "id": "c3",
          "label": "不管了离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "我懒得管了。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "negotiate_brother",
      "title": "说服遗孀",
      "hint": "你想说服遗孀分一半给弟弟。",
      "beats": [
        {
          "speaker": "widow",
          "text": "没门！地契全是我的！",
          "delayMs": 1000,
          "mood": "angry"
        },
        {
          "speaker": "brother",
          "text": "那就法庭上见。",
          "delayMs": 900,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "各退一步吧。",
          "delayMs": 800,
          "mood": "neutral"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "提议平分",
          "icon": "🤝",
          "risk": "low",
          "next": "e_peaceful",
          "line": "平分吧，总比什么都没有强。",
          "effects": {
            "honor": 2,
            "cash": 20
          }
        },
        {
          "id": "c2",
          "label": "拔枪解决",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody",
          "line": "不听话就吃枪子儿！",
          "effects": {
            "honor": -3,
            "cash": -20,
            "wanted": 2
          }
        },
        {
          "id": "c3",
          "label": "放弃调解",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "你们自己商量。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "violence_brother",
      "title": "胁迫遗孀",
      "hint": "你拔枪指着遗孀，她面无血色。",
      "beats": [
        {
          "speaker": "widow",
          "text": "强盗！上帝会惩罚你！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "brother",
          "text": "把地契拿来，快点！",
          "delayMs": 800,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "要出人命了！",
          "delayMs": 800,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "逼她交契",
          "icon": "📜",
          "risk": "medium",
          "next": "e_peaceful",
          "line": "交出来，不然你脑袋开花。",
          "effects": {
            "honor": 1,
            "cash": 10
          }
        },
        {
          "id": "c2",
          "label": "开枪",
          "icon": "💥",
          "risk": "high",
          "next": "e_bloody",
          "line": "找死！",
          "effects": {
            "honor": -3,
            "cash": -20,
            "wanted": 2
          }
        },
        {
          "id": "c3",
          "label": "收枪离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "我不管了。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "violence1",
      "title": "枪口下的沉默",
      "hint": "你拔出左轮，教堂前顿时鸦雀无声。",
      "beats": [
        {
          "speaker": "priest",
          "text": "放下枪，别亵渎上帝！",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "widow",
          "text": "别开枪…",
          "delayMs": 800,
          "mood": "scared"
        },
        {
          "speaker": "brother",
          "text": "疯子！",
          "delayMs": 700,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "快逃啊！",
          "delayMs": 600,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "命令开棺",
          "icon": "⚰️",
          "risk": "medium",
          "next": "violence_open",
          "line": "打开棺材，我自己看！"
        },
        {
          "id": "c2",
          "label": "抢走地契",
          "icon": "💨",
          "risk": "high",
          "next": "violence_grab",
          "line": "地契归我了，谁敢拦？"
        },
        {
          "id": "c3",
          "label": "收枪离开",
          "icon": "🚶",
          "risk": "low",
          "next": "e_passive",
          "line": "不过是个玩笑，我走。",
          "effects": {
            "honor": 0
          }
        }
      ]
    },
    {
      "id": "violence_open",
      "title": "开棺夺契",
      "hint": "你用枪指着，让人打开棺材，地契和信露出来。",
      "beats": [
        {
          "speaker": "priest",
          "text": "主啊，饶恕我们。",
          "delayMs": 900,
          "mood": "scared"
        },
        {
          "speaker": "crowd",
          "text": "真有金矿？",
          "delayMs": 800,
          "mood": "greedy"
        },
        {
          "speaker": "widow",
          "text": "那是我的！",
          "delayMs": 700,
          "mood": "angry"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "抢走地契",
          "icon": "💰",
          "risk": "high",
          "next": "e_greed",
          "line": "地契归我，金矿也是我的！",
          "effects": {
            "honor": -3,
            "cash": 50,
            "wanted": 1
          }
        },
        {
          "id": "c2",
          "label": "烧了地契",
          "icon": "🔥",
          "risk": "medium",
          "next": "e_passive",
          "line": "谁也别想得到！",
          "effects": {
            "honor": 0
          }
        },
        {
          "id": "c3",
          "label": "给遗孀",
          "icon": "👩",
          "risk": "medium",
          "next": "e_peaceful",
          "line": "拿去吧，夫人。",
          "effects": {
            "honor": 2,
            "cash": 10
          }
        }
      ]
    },
    {
      "id": "violence_grab",
      "title": "强抢地契",
      "hint": "你伸手去抢地契，弟弟和遗孀同时扑过来。",
      "beats": [
        {
          "speaker": "brother",
          "text": "休想独吞！",
          "delayMs": 800,
          "mood": "angry"
        },
        {
          "speaker": "widow",
          "text": "强盗！",
          "delayMs": 700,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "快叫警长！",
          "delayMs": 800,
          "mood": "shocked"
        }
      ],
      "choices": [
        {
          "id": "c1",
          "label": "杀出血路",
          "icon": "💥",
          "risk": "high",
          "next": "e_bloody",
          "line": "挡我者死！",
          "effects": {
            "honor": -4,
            "cash": -30,
            "wanted": 3
          }
        },
        {
          "id": "c2",
          "label": "威胁杀光",
          "icon": "🔫",
          "risk": "high",
          "next": "e_bloody",
          "line": "再动就毙了你们！",
          "effects": {
            "honor": -3,
            "cash": -20,
            "wanted": 2
          }
        },
        {
          "id": "c3",
          "label": "扔下地契",
          "icon": "🏃",
          "risk": "medium",
          "next": "e_passive",
          "line": "妈的，这烫手山芋！",
          "effects": {
            "honor": -1
          }
        }
      ]
    },
    {
      "id": "e_passive",
      "title": "不关己事",
      "beats": [
        {
          "speaker": "crowd",
          "text": "外乡人走了，地契撕成了两半。",
          "delayMs": 1500,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "袖手旁观",
        "lines": [
          "你转身离去，身后传来争吵和枪声。",
          "地契在撕扯中化为碎片，谁也没得到。"
        ],
        "honor": 0,
        "cash": 0,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "教堂前遗产风波不了了之",
            "body": "昨日，老杰克的遗孀与弟弟在教堂前为地契归属激烈争吵，围观者众。但因无人主持公道，最终不欢而散。地契仍无着落，镇民猜测地底是否真有金矿。"
          },
          "message": {
            "fromRole": "priest",
            "text": "孩子，昨日你袖手旁观，纷争未止。望你下次能伸出援手，主的平安需众人守护。阿门。"
          },
          "item": {
            "ownerRole": "widow",
            "name": "残破地契",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "地契被撕成两半，隐约可见一行手写小字：'此地干燥，不宜开采。'原来死者早知无金，兄弟与妻子却为虚妄争斗。可悲可叹。"
          }
        }
      }
    },
    {
      "id": "e_truth",
      "title": "真相大白",
      "beats": [
        {
          "speaker": "priest",
          "text": "主让罪恶暴露在阳光下。",
          "delayMs": 1500,
          "mood": "neutral"
        },
        {
          "speaker": "crowd",
          "text": "原来是骗子！吊死她！",
          "delayMs": 1200,
          "mood": "angry"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "正义伸张",
        "lines": [
          "你揭穿了地契的伪造，警长带走了遗孀。",
          "镇民凑了赏金感谢你。"
        ],
        "honor": 3,
        "cash": 15,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "迟来遗嘱 终归原主",
            "body": "尘封已久的杰克遗嘱昨日突然出现，指明土地由遗孀艾达合法继承。弟弟虽心有不甘，但在铁证面前无言以对。镇民欢呼正义终于到来。"
          },
          "message": {
            "fromRole": "widow",
            "text": "谢谢你，好心的陌生人。若非你找到遗嘱，我母子恐流落街头。愿你一生平安，上帝保佑你。"
          },
          "item": {
            "ownerRole": "priest",
            "name": "杰克遗嘱",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "遗嘱上写道：'我将土地及所有财产留给我挚爱的妻子艾达。她陪伴我度过艰难岁月。至于弟弟，他应自立。'字迹潦草却坚定，透露出死者对妻子的深情与对弟弟的失望。"
          }
        }
      }
    },
    {
      "id": "e_bloody",
      "title": "血色黄昏",
      "beats": [
        {
          "speaker": "crowd",
          "text": "天哪，他杀了人！",
          "delayMs": 1200,
          "mood": "shocked"
        },
        {
          "speaker": "priest",
          "text": "愿主宽恕这罪愆。",
          "delayMs": 1500,
          "mood": "sad"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "亡命枪手",
        "lines": [
          "枪声过后，有人倒在血泊中。",
          "你策马逃离，身后是警长的追捕。"
        ],
        "honor": -3,
        "cash": -20,
        "wanted": 2,
        "aftermath": {
          "news": {
            "title": "遗产之争酿血案 一死一伤",
            "body": "昨安息日，老杰克遗产之争演变为枪战。其弟突拔枪射向遗孀，致其当场死亡，随后逃窜。警长悬赏缉凶，全镇笼罩在恐惧与悲恸中。"
          },
          "message": {
            "fromRole": "priest",
            "text": "枪声撕裂了平静，罪孽已玷污这块土地。愿上帝宽恕我们所有人，愿逝者安息。永远记住：暴力只带来毁灭。"
          },
          "item": {
            "ownerRole": "widow",
            "name": "染血手帕",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一方刺绣手帕，绣有'E.A.'字样，已被血浸透。她临终紧握此帕，上面还有孩童的泪痕。原来她争地契全为养子，无奈殒命。"
          }
        }
      }
    },
    {
      "id": "e_peaceful",
      "title": "和平解决",
      "beats": [
        {
          "speaker": "crowd",
          "text": "多亏了这外乡人。",
          "delayMs": 1200,
          "mood": "neutral"
        },
        {
          "speaker": "priest",
          "text": "上帝教导我们分享。",
          "delayMs": 1500,
          "mood": "neutral"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "皆大欢喜",
        "lines": [
          "在你的调解下，地契平分，两人握手言和。",
          "他们感激地给了你一笔酬劳。"
        ],
        "honor": 2,
        "cash": 20,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "和解！遗产共享天伦",
            "body": "昨日，在牧师调解下，遗孀与弟弟达成历史性和解。双方同意共享土地，并计划合作开采。镇民为这皆大欢喜的结局感恩，称颂主的怜悯。"
          },
          "message": {
            "fromRole": "brother",
            "text": "伙计，多亏你劝我们冷静。我们差点酿大错。现在像一家人，金子不重要了。有机会来喝一杯！"
          },
          "item": {
            "ownerRole": "brother",
            "name": "共享协议",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "一份手写协议，双方同意共享土地收益，有证人签字。但背面有行小字：'其实哥哥从未找到金子，他只是不想我们争斗。'弟弟早就心知肚明，却为了和平保持缄默。"
          }
        }
      }
    },
    {
      "id": "e_greed",
      "title": "贪婪的报偿",
      "beats": [
        {
          "speaker": "widow",
          "text": "你这个无赖！",
          "delayMs": 1200,
          "mood": "angry"
        },
        {
          "speaker": "crowd",
          "text": "那家伙不是好东西。",
          "delayMs": 1300,
          "mood": "neutral"
        }
      ],
      "terminal": true,
      "outcome": {
        "title": "不义之财",
        "lines": [
          "你拿着勒索来的钱扬长而去。",
          "镇上的人对你指指点点，但钱在口袋。"
        ],
        "honor": -2,
        "cash": 50,
        "wanted": 0,
        "aftermath": {
          "news": {
            "title": "贪婪得地契 金矿梦碎",
            "body": "弟弟以不正当手段夺得地契后，急不可耐开矿。然而挖地三丈，竟无丝毫金砂。镇民窃笑：贪婪终被戏弄。原来死者早知真相。"
          },
          "message": {
            "fromRole": "brother",
            "text": "我赢了地契，却输得精光。那荒地连水都没有，我哥哥骗了我一辈子。你尽可笑我，混账。"
          },
          "item": {
            "ownerRole": "brother",
            "name": "空矿袋",
            "icon": "📄",
            "value": 25,
            "location": "pocket",
            "content": "袋子本是装金矿样本，但里面只有一张纸条，写着：'此地无金，唯爱永恒。'死者用最后的幽默，给了贪婪者一记耳光。可悲的是，弟弟至今未悟。"
          }
        }
      }
    }
  ],
  "glueFallbackNode": "st"
};

export const GENERATED_TREES = [BANK_BOUNTY_TREE, STABLE_HORSETHIEF_TREE, WELL_WATERRIGHT_TREE, DOCTOR_TRIAGE_TREE, FUNERAL_WILL_TREE];
