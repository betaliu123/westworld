// theaterIdle.js — 每幕的循环碎语 + 按被打对象定制的目击反应
// 由 deepseek-v4-pro 生成后校验：角色白名单、台词长度、无 emoji。
// IDLE_BY_NODE 的键是 "树id/节点id"；WITNESS_ON 的键是 树id → 被打者 → 说话者。

export const IDLE_BY_NODE = {
  "high_noon_duel/st": [
    {
      "speaker": "crowd",
      "text": "妈的，热得枪柄都要化了。",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "我赌疤脸赢，五块。",
      "mood": "greedy"
    },
    {
      "speaker": "judge",
      "text": "该死的，别在这街上动手。",
      "mood": "angry"
    },
    {
      "speaker": "gunA",
      "text": "手有点麻了，但值。",
      "mood": "smug"
    }
  ],
  "high_noon_duel/why": [
    {
      "speaker": "crowd",
      "text": "第五张A？那是魔术。",
      "mood": "shocked"
    },
    {
      "speaker": "gunB",
      "text": "输不起就编故事。",
      "mood": "angry"
    },
    {
      "speaker": "judge",
      "text": "我见过更脏的牌局。",
      "mood": "sad"
    },
    {
      "speaker": "gunA",
      "text": "等着，真相会大白。",
      "mood": "neutral"
    }
  ],
  "high_noon_duel/truth": [
    {
      "speaker": "crowd",
      "text": "老崔从不说谎。",
      "mood": "shocked"
    },
    {
      "speaker": "gunB",
      "text": "这镇上谁都可能被收买。",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "我就知道乔不干净。",
      "mood": "smug"
    },
    {
      "speaker": "judge",
      "text": "我只是说实话，就这样。",
      "mood": "neutral"
    }
  ],
  "high_noon_duel/inspect": [
    {
      "speaker": "crowd",
      "text": "磨过击锤？枪手不干这事。",
      "mood": "shocked"
    },
    {
      "speaker": "gunB",
      "text": "别碰我的枪！",
      "mood": "angry"
    },
    {
      "speaker": "judge",
      "text": "快得不像话，要老命了。",
      "mood": "scared"
    },
    {
      "speaker": "gunA",
      "text": "瞧吧，这就是他的把戏。",
      "mood": "smug"
    }
  ],
  "high_noon_duel/warnA": [
    {
      "speaker": "gunA",
      "text": "公平的枪，公平的死。",
      "mood": "neutral"
    },
    {
      "speaker": "gunB",
      "text": "换吧，老子不在乎。",
      "mood": "angry"
    },
    {
      "speaker": "judge",
      "text": "把枪给他，快点。",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "这下可好看了。",
      "mood": "happy"
    }
  ],
  "high_noon_duel/bet": [
    {
      "speaker": "crowd",
      "text": "这位先生怕是要输钱。",
      "mood": "neutral"
    },
    {
      "speaker": "gunB",
      "text": "等我赢了，请你喝一杯。",
      "mood": "smug"
    },
    {
      "speaker": "judge",
      "text": "唉，愚蠢。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "有人要发财，有人要倒霉。",
      "mood": "neutral"
    }
  ],
  "high_noon_duel/persuade": [
    {
      "speaker": "gunA",
      "text": "他出老千，就得付出代价。",
      "mood": "angry"
    },
    {
      "speaker": "gunB",
      "text": "想当和事佬？你还不够格。",
      "mood": "angry"
    },
    {
      "speaker": "judge",
      "text": "劝不动的，省省力气。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "又来个多管闲事的。",
      "mood": "neutral"
    }
  ],
  "high_noon_duel/cards": [
    {
      "speaker": "gunA",
      "text": "别耍花招，我看着你。",
      "mood": "angry"
    },
    {
      "speaker": "gunB",
      "text": "哼，我的运气比你好。",
      "mood": "smug"
    },
    {
      "speaker": "judge",
      "text": "公平发牌，老天看着呢。",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "一张牌定生死。",
      "mood": "neutral"
    }
  ],
  "high_noon_duel/watch": [
    {
      "speaker": "judge",
      "text": "我还没数到三，都别动。",
      "mood": "scared"
    },
    {
      "speaker": "gunB",
      "text": "你的手指在发抖，伙计。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "别开枪！够了！",
      "mood": "scared"
    },
    {
      "speaker": "gunA",
      "text": "……闭嘴。",
      "mood": "angry"
    }
  ],
  "high_noon_duel/standoff": [
    {
      "speaker": "gunB",
      "text": "你爹没教你怎么握枪？",
      "mood": "smug"
    },
    {
      "speaker": "gunA",
      "text": "你再多嘴，我先毙了你。",
      "mood": "angry"
    },
    {
      "speaker": "judge",
      "text": "上帝啊，我要去躲躲……",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "快开枪啊，磨蹭什么！",
      "mood": "neutral"
    }
  ],
  "high_noon_duel/clash": [
    {
      "speaker": "crowd",
      "text": "老天，乔这下可够呛。",
      "mood": "scared"
    },
    {
      "speaker": "judge",
      "text": "都退后！给医生让条道！",
      "mood": "angry"
    },
    {
      "speaker": "gunB",
      "text": "该死的... 我还撑得住...",
      "mood": "pain"
    },
    {
      "speaker": "gunA",
      "text": "快点儿，了结这事。",
      "mood": "smug"
    }
  ]
};

export const WITNESS_ON = {
  "high_noon_duel": {
    "gunA": {
      "gunB": [
        "哈，牛仔的屁股开花了！",
        "踢他，他上次赢我钱！"
      ],
      "judge": [
        "住手，别欺负晚辈！",
        "上帝看着呢，撂下拳头！"
      ]
    },
    "gunB": {
      "gunA": [
        "好揍！这一拳替老崔敲的钟！",
        "你的牌运到头了，疤脸！"
      ],
      "judge": [
        "主说以牙还牙……但停下吧。",
        "别在我教堂门口见血，孩子们。"
      ]
    },
    "judge": {
      "gunA": [
        "混蛋！敢打牧师？",
        "你找颗子弹啃吧！"
      ],
      "gunB": [
        "见鬼，谁对老人动手？",
        "别碰老崔，你这孬种！"
      ]
    }
  }
};
