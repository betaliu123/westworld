// theaterStoryTrees.js — 个人连续小剧场 + 势力相关小剧场（DS 生成 v2）
// 台词里用 {roleId} 占位引用同台角色，运行时由 TheaterRuntime._sub 替换成真实 NPC 名。
// 终局 beats 是角色台词，旁白在 outcome.lines。自动生成，勿手改结构。

export const STORY_TREES = {
  "story_erin_ledger": {
    "id": "story_erin_ledger",
    "title": "账本疑云",
    "hintOnEnter": "深夜后巷，{erin} 攥着账本，脸色苍白。",
    "protagonistRole": "erin",
    "protagonistId": "npc_erin",
    "kind": "personal",
    "faction": null,
    "roles": [
      {
        "roleId": "erin",
        "required": true,
        "jobs": [
          "会计"
        ]
      },
      {
        "roleId": "boss",
        "required": true,
        "jobs": [
          "商人",
          "银行经理"
        ]
      },
      {
        "roleId": "rival",
        "required": true,
        "jobs": [
          "赌徒",
          "流浪赌徒"
        ]
      }
    ],
    "entryNode": "st",
    "unattendedMs": 65000,
    "timeoutNode": "e_play_dumb",
    "idleLoop": [
      {
        "speaker": "erin",
        "text": "（低声）你来了吗？我……我有点怕。",
        "delayMs": 2400,
        "mood": "scared"
      },
      {
        "speaker": "erin",
        "text": "账本少了五百块，是{boss}做的假账。",
        "delayMs": 2400,
        "mood": "scared"
      },
      {
        "speaker": "rival",
        "text": "{erin}，半夜约人聊什么见不得光的事？",
        "delayMs": 2400,
        "mood": "smug"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "第一幕：夜巷密谈",
        "hint": "深夜后巷，{erin} 攥着账本，脸色苍白。",
        "beats": [
          {
            "speaker": "erin",
            "to": "player",
            "text": "账本少了五百块，是{boss}做的假账。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "rival",
            "to": "erin",
            "text": "{erin}，半夜约人聊什么见不得光的事？",
            "delayMs": 2000,
            "mood": "smug"
          },
          {
            "speaker": "erin",
            "to": "rival",
            "text": "{rival}，你跟踪我？这与你无关。",
            "delayMs": 1600,
            "mood": "angry"
          },
          {
            "speaker": "rival",
            "to": "erin",
            "text": "欠债还钱，{boss}的事就是我的事。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "erin",
            "to": "player",
            "text": "你看，他们盯上我了……我该怎么办？",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "帮她查清账目",
            "icon": "❓",
            "risk": "low",
            "next": "mid_investigate",
            "line": "我先帮你查清这笔账。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "劝她别管闲事",
            "icon": "❓",
            "risk": "low",
            "next": "mid_backoff",
            "line": "听我一句，别管这事了。",
            "effects": {}
          },
          {
            "id": "c3",
            "label": "直接找老板对质",
            "icon": "❓",
            "risk": "high",
            "next": "e_confront_direct",
            "line": "我带你去找老板对质。",
            "effects": {
              "wanted": 1
            }
          }
        ]
      },
      {
        "id": "mid_investigate",
        "title": "第二幕：查账",
        "hint": "你和{erin}摊开账本，{rival}虎视眈眈。",
        "beats": [
          {
            "speaker": "erin",
            "to": "player",
            "text": "这页被撕了，{boss}的签字还在存根上。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "rival",
            "to": "erin",
            "text": "{boss}做事向来干净，你找死吗？",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "erin",
            "to": "rival",
            "text": "{rival}，你欠{boss}的钱，还想帮他灭口？",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "boss",
            "to": "all",
            "text": "各位，半夜在我赌场后巷开会呢？",
            "delayMs": 1900,
            "mood": "cold"
          },
          {
            "speaker": "erin",
            "to": "boss",
            "text": "{boss}，你来的正好，账本的事……",
            "delayMs": 1600,
            "mood": "scared"
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "拿证据威胁老板",
            "icon": "❓",
            "risk": "high",
            "next": "e_expose",
            "line": "账本在我手里，你看着办。",
            "effects": {
              "wanted": 1
            }
          },
          {
            "id": "c2",
            "label": "拉拢赌徒分赃",
            "icon": "❓",
            "risk": "medium",
            "next": "e_deal_rival",
            "line": "{rival}，我们联手，这笔账平了如何？",
            "effects": {}
          },
          {
            "id": "c3",
            "label": "烧了账本保命",
            "icon": "❓",
            "risk": "low",
            "next": "e_destroy_ledger",
            "line": "账本烧了，大家当无事发生。",
            "effects": {}
          }
        ]
      },
      {
        "id": "mid_backoff",
        "title": "第二幕：抽身",
        "hint": "你劝{erin}别查，但{boss}已带着人堵住巷口。",
        "beats": [
          {
            "speaker": "erin",
            "to": "player",
            "text": "现在收手，{boss}会放过我们吗？",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "boss",
            "to": "erin",
            "text": "你半夜翻我账本，现在想当没事？",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "erin",
            "to": "boss",
            "text": "{boss}，我……我不是有意查你。",
            "delayMs": 1600,
            "mood": "scared"
          },
          {
            "speaker": "boss",
            "to": "player",
            "text": "外乡人，这是我们的家事，你最好别插手。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "rival",
            "to": "boss",
            "text": "{boss}，{erin}留不得，她知道太多了。",
            "delayMs": 1700,
            "mood": "smug"
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "向老板告发她",
            "icon": "❓",
            "risk": "low",
            "next": "e_betray_erin",
            "line": "{boss}，是她自己要查账，与我无关。",
            "effects": {
              "honor": -1
            }
          },
          {
            "id": "c2",
            "label": "带她冲出重围",
            "icon": "❓",
            "risk": "high",
            "next": "e_escape",
            "line": "{erin}，跟紧我，冲出去！",
            "effects": {
              "honor": 2
            }
          },
          {
            "id": "c3",
            "label": "假装毫不知情",
            "icon": "❓",
            "risk": "low",
            "next": "e_play_dumb",
            "line": "我只是路过，什么都不知道。",
            "effects": {}
          }
        ]
      },
      {
        "id": "e_confront_direct",
        "title": "终局：正面冲突",
        "terminal": true,
        "beats": [
          {
            "speaker": "boss",
            "to": "player",
            "text": "外乡人，管闲事的下场就是进棺材。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "erin",
            "to": "player",
            "text": "对不起……是我害了你。",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "后巷枪声",
          "lines": [
            "你与{boss}对峙，话不投机，枪声响起。",
            "第二天，你的尸体被丢在荒野。"
          ],
          "honor": 0,
          "cash": 0
        }
      },
      {
        "id": "e_expose",
        "title": "终局：铁证如山",
        "terminal": true,
        "beats": [
          {
            "speaker": "boss",
            "to": "erin",
            "text": "你敢威胁我？账本可以重写，命只有一条。",
            "delayMs": 2000,
            "mood": "angry"
          },
          {
            "speaker": "erin",
            "to": "player",
            "text": "{boss}不敢动我们，证据在我手里。",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "账目曝光",
          "lines": [
            "你拿着证据去找警长，{boss}的假账被揭穿。",
            "{boss}被捕，你和{erin}逃过一劫。"
          ],
          "honor": 2,
          "cash": 0
        }
      },
      {
        "id": "e_deal_rival",
        "title": "终局：与恶同行",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival",
            "to": "player",
            "text": "聪明人，少五百算五百，咱们谁也别声张。",
            "delayMs": 2000,
            "mood": "smug"
          },
          {
            "speaker": "erin",
            "to": "player",
            "text": "你和{rival}联手？这是与虎谋皮！",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "同流合污",
          "lines": [
            "你与{rival}联手，用假账填平亏空。",
            "{boss}不再追究，但你欠了{rival}一个人情。"
          ],
          "honor": -1,
          "cash": 200
        }
      },
      {
        "id": "e_destroy_ledger",
        "title": "终局：灰飞烟灭",
        "terminal": true,
        "beats": [
          {
            "speaker": "erin",
            "to": "player",
            "text": "烧了也好，至少我们还能活命。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "boss",
            "to": "player",
            "text": "算你们识相，但以后别让我再看到你们查账。",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "outcome": {
          "title": "证据成灰",
          "lines": [
            "账本化为灰烬，{boss}的罪行暂时无法追查。",
            "你保住了命，但良心难安。"
          ],
          "honor": 0,
          "cash": 0
        }
      },
      {
        "id": "e_betray_erin",
        "title": "终局：出卖",
        "terminal": true,
        "beats": [
          {
            "speaker": "boss",
            "to": "player",
            "text": "识时务，{erin}交给我处理。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "erin",
            "to": "player",
            "text": "你……你出卖我！",
            "delayMs": 1800,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "背叛的代价",
          "lines": [
            "{boss}带走{erin}，再也没人见过她。",
            "你得到{boss}的信任，却永远失去安宁。"
          ],
          "honor": -2,
          "cash": 300
        }
      },
      {
        "id": "e_escape",
        "title": "终局：亡命天涯",
        "terminal": true,
        "beats": [
          {
            "speaker": "erin",
            "to": "player",
            "text": "我们跑不掉的，{boss}的人到处都是。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "boss",
            "to": "player",
            "text": "追！一个都别放过！",
            "delayMs": 2000,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "连夜出逃",
          "lines": [
            "你拉着{erin}冲出后巷，身后枪声不断。",
            "你们躲进矿山，暂时逃过一劫。"
          ],
          "honor": 1,
          "wanted": 1
        }
      },
      {
        "id": "e_play_dumb",
        "title": "终局：装傻保命",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival",
            "to": "boss",
            "text": "{boss}，我看这小子是真不知道。",
            "delayMs": 2000,
            "mood": "smug"
          },
          {
            "speaker": "boss",
            "to": "player",
            "text": "滚出镇子，今晚的事烂在肚子里。",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "outcome": {
          "title": "不关己事",
          "lines": [
            "你假装毫不知情，老板将信将疑放你离开。",
            "第二天，{erin}被{boss}发落，你不敢过问。"
          ],
          "honor": -1,
          "cash": 0
        }
      }
    ],
    "nameAliases": {}
  },
  "story_jack_debt": {
    "id": "story_jack_debt",
    "title": "亡命追债",
    "hintOnEnter": "你被债主堵在街口，老友赶来说要帮你凑钱。",
    "protagonistRole": "jack",
    "protagonistId": "npc_jack",
    "kind": "personal",
    "faction": null,
    "roles": [
      {
        "roleId": "jack",
        "required": true,
        "jobs": [
          "枪手",
          "神枪手"
        ]
      },
      {
        "roleId": "debtor",
        "required": true,
        "jobs": [
          "帮派头目",
          "帮派二把手"
        ]
      },
      {
        "roleId": "friend",
        "required": true,
        "jobs": [
          "酒保",
          "医生",
          "牧师"
        ]
      }
    ],
    "entryNode": "st",
    "unattendedMs": 65000,
    "timeoutNode": "e_beaten",
    "idleLoop": [
      {
        "speaker": "debtor",
        "text": "别躲了，{jack}，这条街就两个出口。",
        "delayMs": 2400,
        "mood": "cold"
      },
      {
        "speaker": "friend",
        "text": "{debtor}，有话好说，别吓着他。",
        "delayMs": 2600,
        "mood": "scared"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "第一幕：街口堵截",
        "hint": "债主带人堵在街口，老友想劝架。",
        "beats": [
          {
            "speaker": "debtor",
            "to": "player",
            "text": "旧债拖了三个月，以为我找不到你？",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "to": "debtor",
            "text": "{debtor}，有话好说，别在街上动枪。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "friend",
            "text": "闪开，这事跟你没关系。",
            "delayMs": 1600,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "to": "player",
            "text": "{jack}，差多少？我柜里还存着些银元。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "player",
            "text": "枪留下，或者命留下，你挑。",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "choices": [
          {
            "id": "c_hard",
            "label": "枪和命都不给",
            "icon": "🔫",
            "risk": "high",
            "next": "mid_hard",
            "line": "我的枪跟命一样，哪样都不给。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c_help",
            "label": "先让老友凑钱",
            "icon": "🪙",
            "risk": "medium",
            "next": "mid_help",
            "line": "{friend}，柜里那点钱先借我。"
          },
          {
            "id": "c_run",
            "label": "干脆拔枪拼了",
            "icon": "💥",
            "risk": "high",
            "next": "mid_run",
            "line": "那就看你的嘴快还是我的枪快。"
          }
        ]
      },
      {
        "id": "mid_hard",
        "title": "第二幕：硬顶到底",
        "hint": "你拒绝交枪，对方失去了耐心。",
        "beats": [
          {
            "speaker": "debtor",
            "to": "player",
            "text": "嘴硬救不了你，我的人围了后巷。",
            "delayMs": 1900,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "to": "player",
            "text": "别犯倔，把枪给他，命要紧。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "friend",
            "text": "他欠的不是小数，你那点钱塞牙缝。",
            "delayMs": 1900,
            "mood": "smug"
          },
          {
            "speaker": "friend",
            "to": "player",
            "text": "我再去找人凑，你先拖住他。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "player",
            "text": "最后一次机会，枪还是命？",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "choices": [
          {
            "id": "c_duel",
            "label": "有胆就单挑",
            "icon": "⚔️",
            "risk": "high",
            "next": "e_duel",
            "line": "有胆跟我一对一，输了账两清。"
          },
          {
            "id": "c_defiant",
            "label": "我宁死不低头",
            "icon": "💀",
            "risk": "high",
            "next": "e_beaten",
            "line": "枪在我在，有本事来拿。"
          },
          {
            "id": "c_surrender",
            "label": "把枪扔给他",
            "icon": "🏳️",
            "risk": "low",
            "next": "e_surrender",
            "line": "枪给你，放我走。"
          }
        ]
      },
      {
        "id": "mid_help",
        "title": "第二幕：老友凑钱",
        "hint": "老友想帮你，但钱不够，对方不肯宽限。",
        "beats": [
          {
            "speaker": "friend",
            "to": "player",
            "text": "我柜里只有三十块，差得远。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "friend",
            "text": "三十块？连利息都不够。",
            "delayMs": 1700,
            "mood": "smug"
          },
          {
            "speaker": "friend",
            "to": "debtor",
            "text": "宽限三天，我把酒馆押出去。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "player",
            "text": "{friend} 倒比你有诚意。",
            "delayMs": 1700,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "to": "player",
            "text": "{jack}，说句话，别让他动枪。",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "choices": [
          {
            "id": "c_gun_part",
            "label": "用枪抵一部分",
            "icon": "🔫",
            "risk": "medium",
            "next": "e_gun_part",
            "line": "枪押给你，剩下的三天还清。"
          },
          {
            "id": "c_promise",
            "label": "承诺连本带利",
            "icon": "📜",
            "risk": "medium",
            "next": "e_promise",
            "line": "给我五天，连本带利还你。"
          },
          {
            "id": "c_dodge",
            "label": "假装答应拖延",
            "icon": "🃏",
            "risk": "high",
            "next": "e_dodge",
            "line": "我回去取钱，你在这等着。"
          }
        ]
      },
      {
        "id": "mid_run",
        "title": "第二幕：拔枪相向",
        "hint": "你突然拔枪，街口一片混乱。",
        "beats": [
          {
            "speaker": "debtor",
            "to": "player",
            "text": "想拼命？你连保险都没开。",
            "delayMs": 1500,
            "mood": "smug"
          },
          {
            "speaker": "friend",
            "to": "debtor",
            "text": "别开枪！会伤到旁人！",
            "delayMs": 1400,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "to": "friend",
            "text": "你最好躲远点，子弹不长眼。",
            "delayMs": 1600,
            "mood": "cold"
          },
          {
            "speaker": "debtor",
            "to": "player",
            "text": "你以为我会一个人来？",
            "delayMs": 1500,
            "mood": "smug"
          },
          {
            "speaker": "friend",
            "to": "player",
            "text": "跑！往巷子里跑！",
            "delayMs": 1400,
            "mood": "scared"
          }
        ],
        "choices": [
          {
            "id": "c_escape",
            "label": "转身逃进巷子",
            "icon": "🏃",
            "risk": "high",
            "next": "e_escape",
            "line": "让开！别挡我的路！"
          },
          {
            "id": "c_shoot",
            "label": "我先开枪再说",
            "icon": "🔫",
            "risk": "high",
            "next": "e_shootout",
            "line": "那就看谁先躺下！"
          },
          {
            "id": "c_use_friend",
            "label": "拉老友当掩护",
            "icon": "🛡️",
            "risk": "high",
            "next": "e_hostage",
            "line": "对不起了，{friend}。"
          }
        ]
      },
      {
        "id": "e_duel",
        "title": "终局：废马厩之约",
        "terminal": true,
        "beats": [
          {
            "speaker": "debtor",
            "text": "算你有种，明天正午废马厩见。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "text": "{jack}，别去，他们不会守规矩。",
            "delayMs": 2000,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "赢下一命，输掉半条魂",
          "lines": [
            "次日正午，你击倒了对方，旧债一笔勾销。",
            "但你的右手再也不能像从前那样稳了。"
          ],
          "honor": 2,
          "cash": 0,
          "wanted": 0
        }
      },
      {
        "id": "e_beaten",
        "title": "终局：被按在泥里",
        "terminal": true,
        "beats": [
          {
            "speaker": "debtor",
            "text": "枪不错，归我了。利息就取你一根手指。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "text": "别动他！钱我来还！",
            "delayMs": 2000,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "枪没了，指头也没了",
          "lines": [
            "你被一群人按在泥里，枪被夺走，左手小指被切。",
            "对方说债清了，但你再也没法握枪。"
          ],
          "honor": -2,
          "cash": -50,
          "wanted": 0
        }
      },
      {
        "id": "e_surrender",
        "title": "终局：交枪保命",
        "terminal": true,
        "beats": [
          {
            "speaker": "debtor",
            "text": "算你识相，枪我收下，债免一半。",
            "delayMs": 2000,
            "mood": "smug"
          },
          {
            "speaker": "friend",
            "text": "枪没了还能再挣，命没了就什么都没了。",
            "delayMs": 2000,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "没了枪的人",
          "lines": [
            "你交出了枪，对方带人离开。",
            "你没了枪，只能从镇上消失，老友再没提过那把枪。"
          ],
          "honor": -1,
          "cash": -30,
          "wanted": 0
        }
      },
      {
        "id": "e_gun_part",
        "title": "终局：枪做抵押",
        "terminal": true,
        "beats": [
          {
            "speaker": "debtor",
            "text": "枪我先拿走，三天后见不到钱，这枪就归我。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "text": "三天，就三天，我去借。",
            "delayMs": 2000,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "枪在别人手里",
          "lines": [
            "你的枪被对方带走，三天后你凑到了钱。",
            "可拿回来的枪，枪管被灌了铅。"
          ],
          "honor": -1,
          "cash": -20,
          "wanted": 0
        }
      },
      {
        "id": "e_promise",
        "title": "终局：五天之约",
        "terminal": true,
        "beats": [
          {
            "speaker": "debtor",
            "text": "五天，多一个钟头，我就来收你的命。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "friend",
            "text": "我拿酒馆作保，他不会跑。",
            "delayMs": 2000,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "债还在，路还长",
          "lines": [
            "你立下字据，连本带利五天内还清。",
            "{friend} 押上了酒馆，你欠他的比欠黑蹄会的还多。"
          ],
          "honor": 1,
          "cash": -40,
          "wanted": 0
        }
      },
      {
        "id": "e_dodge",
        "title": "终局：假装取钱",
        "terminal": true,
        "beats": [
          {
            "speaker": "friend",
            "text": "{jack}，你真要跑？他还在街口等着。",
            "delayMs": 2000,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "text": "敢耍我，{friend} 会替你躺进棺材。",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "outcome": {
          "title": "逃了，但没逃掉",
          "lines": [
            "你翻窗逃走，对方转头烧了 {friend} 的酒馆。",
            "你成了全镇通缉的骗子。"
          ],
          "honor": -3,
          "cash": 0,
          "wanted": 1
        }
      },
      {
        "id": "e_escape",
        "title": "终局：巷口脱身",
        "terminal": true,
        "beats": [
          {
            "speaker": "friend",
            "text": "跑！别回头！",
            "delayMs": 2000,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "text": "追！别让他出镇子！",
            "delayMs": 2000,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "命保住了，朋友留在了身后",
          "lines": [
            "你钻进了巷子，身后传来 {friend} 的惨叫。",
            "你逃出镇子，但每晚都能听见那声惨叫。"
          ],
          "honor": -2,
          "cash": 0,
          "wanted": 1
        }
      },
      {
        "id": "e_shootout",
        "title": "终局：街头枪战",
        "terminal": true,
        "beats": [
          {
            "speaker": "debtor",
            "text": "你连拔枪都慢了半拍。",
            "delayMs": 2000,
            "mood": "smug"
          },
          {
            "speaker": "friend",
            "text": "快走！我拖住他们！",
            "delayMs": 2000,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "血染街口",
          "lines": [
            "枪声停了，对方倒在血泊里。",
            "你成了杀人犯，镇子再没有你的容身之处。"
          ],
          "honor": -1,
          "cash": -100,
          "wanted": 3
        }
      },
      {
        "id": "e_hostage",
        "title": "终局：拿老友挡枪",
        "terminal": true,
        "beats": [
          {
            "speaker": "friend",
            "text": "{jack}，你……你拿我当盾牌？",
            "delayMs": 2000,
            "mood": "scared"
          },
          {
            "speaker": "debtor",
            "text": "连自己人都卖，你比我想的还下作。",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "outcome": {
          "title": "众叛亲离",
          "lines": [
            "你拽着 {friend} 挡了一枪，趁乱逃出镇子。",
            "他活了下来，但从此与你恩断义绝。"
          ],
          "honor": -3,
          "cash": 0,
          "wanted": 2
        }
      }
    ],
    "nameAliases": {}
  },
  "faction_infight": {
    "id": "faction_infight",
    "title": "帮派内讧",
    "hintOnEnter": "你看见{member_a}和{member_b}在酒馆门口拔枪相向。",
    "protagonistRole": "member_a",
    "protagonistId": null,
    "kind": "faction",
    "faction": "player",
    "roles": [
      {
        "roleId": "member_a",
        "required": true,
        "jobs": [
          "帮派头目",
          "牛仔",
          "枪手"
        ]
      },
      {
        "roleId": "member_b",
        "required": true,
        "jobs": [
          "帮派头目",
          "牛仔",
          "枪手"
        ]
      },
      {
        "roleId": "onlooker",
        "required": true,
        "jobs": [
          "商人",
          "酒保",
          "牧师"
        ]
      }
    ],
    "entryNode": "st",
    "unattendedMs": 65000,
    "timeoutNode": "e_timeout",
    "idleLoop": [
      {
        "speaker": "onlooker",
        "text": "两位爷，别在店门口动枪啊，会首马上到。",
        "delayMs": 2400,
        "mood": "scared"
      },
      {
        "speaker": "member_a",
        "text": "{member_b}，你踩过界了，这地盘是我的。",
        "delayMs": 2400,
        "mood": "angry"
      },
      {
        "speaker": "member_b",
        "text": "老规矩得改改，谁赚得多谁说了算。",
        "delayMs": 2400,
        "mood": "smug"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "第一幕：对峙",
        "hint": "两位成员正在酒馆门口争执，你需要到场压场或调解。",
        "beats": [
          {
            "speaker": "member_a",
            "to": "member_b",
            "text": "{member_b}，你踩过界了，这地盘是我的。",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "member_b",
            "to": "member_a",
            "text": "老规矩得改改，谁赚得多谁说了算。",
            "delayMs": 1800,
            "mood": "smug"
          },
          {
            "speaker": "onlooker",
            "to": "player",
            "text": "两位爷，别在店门口动枪啊，会首马上到。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "member_a",
            "to": "member_b",
            "text": "会首来了也站我这边，你算什么东西。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "member_b",
            "to": "player",
            "text": "来得正好，你给评评理。",
            "delayMs": 1800,
            "mood": "smug"
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "站老成员这边",
            "icon": "❓",
            "risk": "low",
            "next": "m1",
            "line": "{member_a}跟了我最久，这地归他。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "站新成员这边",
            "icon": "❓",
            "risk": "medium",
            "next": "m2",
            "line": "{member_b}赚得多，该他管。",
            "effects": {
              "cash": 5
            }
          },
          {
            "id": "c3",
            "label": "先放下枪说清楚",
            "icon": "❓",
            "risk": "low",
            "next": "m3",
            "line": "都别动，把枪收起来说话。",
            "effects": {
              "honor": 1
            }
          }
        ]
      },
      {
        "id": "m1",
        "title": "第二幕：偏袒老人",
        "hint": "你站队老人，新人明显不满，老人则愈发强硬。",
        "beats": [
          {
            "speaker": "member_b",
            "to": "player",
            "text": "你果然还是护着老人，我早看透了。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "member_a",
            "to": "member_b",
            "text": "听到没？会首认的是我。",
            "delayMs": 1800,
            "mood": "smug"
          },
          {
            "speaker": "onlooker",
            "to": "player",
            "text": "这样下去，新人怕是要走啊。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "member_b",
            "to": "player",
            "text": "我给帮里赚了多少钱，你心里没数？",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "member_a",
            "to": "member_b",
            "text": "少拿钱压人，这里论的是资历。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "onlooker",
            "to": "member_a",
            "text": "都少说两句，和气生财。",
            "delayMs": 1800,
            "mood": "neutral"
          }
        ],
        "choices": [
          {
            "id": "c4",
            "label": "让他滚出帮派",
            "icon": "❓",
            "risk": "high",
            "next": "e1",
            "line": "既然你不服，就别留在这了。",
            "effects": {
              "honor": 1,
              "cash": -20
            }
          },
          {
            "id": "c5",
            "label": "给他一笔钱安抚",
            "icon": "❓",
            "risk": "medium",
            "next": "e2",
            "line": "别闹了，给你点补偿，这事算了。",
            "effects": {
              "cash": -30
            }
          },
          {
            "id": "c6",
            "label": "让老人收敛点",
            "icon": "❓",
            "risk": "low",
            "next": "e3",
            "line": "{member_a}，别太过了，给他留点余地。",
            "effects": {
              "honor": 1
            }
          }
        ]
      },
      {
        "id": "m2",
        "title": "第二幕：偏袒新人",
        "hint": "你站队新人，老人感到背叛，气氛紧张。",
        "beats": [
          {
            "speaker": "member_a",
            "to": "player",
            "text": "好啊，你帮他不帮我，我白跟你这么多年。",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "member_b",
            "to": "member_a",
            "text": "识时务者为俊杰，老东西。",
            "delayMs": 1800,
            "mood": "smug"
          },
          {
            "speaker": "onlooker",
            "to": "player",
            "text": "会首，这样怕寒了老人的心啊。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "member_a",
            "to": "player",
            "text": "今天这地你给不给我一句话。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "member_b",
            "to": "player",
            "text": "别理他，他早该退了。",
            "delayMs": 1800,
            "mood": "neutral"
          },
          {
            "speaker": "onlooker",
            "to": "member_a",
            "text": "先别动怒，会首自有安排。",
            "delayMs": 1800,
            "mood": "neutral"
          }
        ],
        "choices": [
          {
            "id": "c7",
            "label": "让他体面退休",
            "icon": "❓",
            "risk": "medium",
            "next": "e4",
            "line": "{member_a}，你岁数大了，该歇歇了。",
            "effects": {
              "honor": -1
            }
          },
          {
            "id": "c8",
            "label": "保留他的名分",
            "icon": "❓",
            "risk": "medium",
            "next": "e5",
            "line": "地归{member_b}，但你留个名头。",
            "effects": {
              "cash": 10
            }
          },
          {
            "id": "c9",
            "label": "罚他对你不敬",
            "icon": "❓",
            "risk": "high",
            "next": "e6",
            "line": "敢顶撞我，去矿里待几天。",
            "effects": {
              "honor": -2
            }
          }
        ]
      },
      {
        "id": "m3",
        "title": "第二幕：调解",
        "hint": "双方暂时收起枪，但在你的要求下开始对话，旁观者提到有人挑拨。",
        "beats": [
          {
            "speaker": "member_a",
            "to": "member_b",
            "text": "枪放下了，可这账没完。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "member_b",
            "to": "member_a",
            "text": "你以为我怕你？我只是给会首面子。",
            "delayMs": 1800,
            "mood": "smug"
          },
          {
            "speaker": "onlooker",
            "to": "player",
            "text": "我瞧见有人前两天挑唆他们争这地。",
            "delayMs": 1800,
            "mood": "scared"
          },
          {
            "speaker": "member_a",
            "to": "player",
            "text": "谁在背后捣鬼？我跟他没完。",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "member_b",
            "to": "onlooker",
            "text": "你看见什么了？快说。",
            "delayMs": 1800,
            "mood": "neutral"
          },
          {
            "speaker": "onlooker",
            "to": "player",
            "text": "好像是个外来户，专找我们的人递话。",
            "delayMs": 1800,
            "mood": "neutral"
          }
        ],
        "choices": [
          {
            "id": "c10",
            "label": "重新划分地盘",
            "icon": "❓",
            "risk": "low",
            "next": "e7",
            "line": "这地一分为二，你们各管一半。",
            "effects": {
              "honor": 1,
              "cash": -10
            }
          },
          {
            "id": "c11",
            "label": "让他们共同管理",
            "icon": "❓",
            "risk": "medium",
            "next": "e8",
            "line": "别争了，以后这地你们一起管。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c12",
            "label": "查清背后挑拨",
            "icon": "❓",
            "risk": "high",
            "next": "e9",
            "line": "先别内斗，把外人揪出来。",
            "effects": {
              "honor": 2
            }
          }
        ]
      },
      {
        "id": "e1",
        "title": "终局：新人离帮",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_b",
            "text": "此处不留爷，自有留爷处。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "member_a",
            "text": "滚吧，少了你帮里更干净。",
            "delayMs": 2000,
            "mood": "smug"
          }
        ],
        "outcome": {
          "title": "帮派损失财源",
          "lines": [
            "{member_b}带着手下离开了镇子，帮里的进账少了一大截。",
            "但老人们觉得你守住了规矩，对你更忠心。"
          ],
          "honor": 2,
          "cash": -30
        }
      },
      {
        "id": "e2",
        "title": "终局：花钱消灾",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_b",
            "text": "算你识相，这次我就不计较了。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "member_a",
            "text": "会首，你太惯着他了。",
            "delayMs": 2000,
            "mood": "cold"
          }
        ],
        "outcome": {
          "title": "暂时平息",
          "lines": [
            "你从公账里拨了一笔钱给新人，他暂时不闹了。",
            "但老人觉得你偏心，心里结下了疙瘩。"
          ],
          "cash": -40,
          "honor": -1
        }
      },
      {
        "id": "e3",
        "title": "终局：勉强和解",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "行，我给你留面子，但地盘还是我的。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "member_b",
            "text": "成，这次我认了，下次再说。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ],
        "outcome": {
          "title": "隐患未除",
          "lines": [
            "你压下了这场争吵，但两人都不服气。",
            "镇上的人说，帮派内讧迟早还会闹起来。"
          ],
          "honor": 0,
          "cash": 0
        }
      },
      {
        "id": "e4",
        "title": "终局：老人退隐",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "好，我走。你以后可别后悔。",
            "delayMs": 2000,
            "mood": "angry"
          },
          {
            "speaker": "member_b",
            "text": "早该这样了，帮里有我就够了。",
            "delayMs": 2000,
            "mood": "smug"
          }
        ],
        "outcome": {
          "title": "新人当道",
          "lines": [
            "老成员带着几个老弟兄离开了帮派，帮派元气大伤。",
            "新人虽然能赚钱，但根基不稳，镇上的势力都在观望。"
          ],
          "honor": -2,
          "cash": 20
        }
      },
      {
        "id": "e5",
        "title": "终局：名存实亡",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "名头我留着，可这地我管不了了？",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "member_b",
            "text": "放心，钱少不了你那份。",
            "delayMs": 2000,
            "mood": "smug"
          }
        ],
        "outcome": {
          "title": "表面平静",
          "lines": [
            "你让新人接管了地盘，但给老人挂了个虚职。",
            "老人表面上接受，暗地里却联络旧部，准备翻盘。"
          ],
          "honor": -1,
          "cash": 10
        }
      },
      {
        "id": "e6",
        "title": "终局：寒了人心",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "我为你卖命这么多年，你就这样对我？",
            "delayMs": 2000,
            "mood": "angry"
          },
          {
            "speaker": "member_b",
            "text": "对会首不敬，就该受罚。",
            "delayMs": 2000,
            "mood": "smug"
          }
        ],
        "outcome": {
          "title": "众叛亲离",
          "lines": [
            "你把老成员关进了矿井，帮里老人们都寒了心。",
            "有人偷偷议论，说你迟早也会这样对他们。"
          ],
          "honor": -3,
          "cash": 0
        }
      },
      {
        "id": "e7",
        "title": "终局：各得其所",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "一半就一半，总比没有强。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "member_b",
            "text": "行，各干各的，井水不犯河水。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ],
        "outcome": {
          "title": "地盘分割",
          "lines": [
            "你把地盘一分为二，两人各自经营。",
            "冲突暂时平息，但帮派的力量也被分散了。"
          ],
          "honor": 1,
          "cash": -10
        }
      },
      {
        "id": "e8",
        "title": "终局：貌合神离",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "一起管？我怕他背后捅刀子。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "member_b",
            "text": "你放心，我眼里只有钱，没空害你。",
            "delayMs": 2000,
            "mood": "smug"
          }
        ],
        "outcome": {
          "title": "被迫合作",
          "lines": [
            "你强迫两人共同管理地盘，他们表面上答应合作。",
            "背地里却互相使绊子，帮派效率低下。"
          ],
          "honor": 0,
          "cash": -20
        }
      },
      {
        "id": "e9",
        "title": "终局：揪出内鬼",
        "terminal": true,
        "beats": [
          {
            "speaker": "onlooker",
            "text": "就是那个外乡人，我亲眼看见他递话。",
            "delayMs": 2000,
            "mood": "scared"
          },
          {
            "speaker": "member_a",
            "text": "好小子，敢挑拨我们，我去废了他。",
            "delayMs": 2000,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "真相大白",
          "lines": [
            "你查明是外面帮派派人挑拨，意图让你们内斗。",
            "你带人教训了那外乡人，帮派重新团结起来。"
          ],
          "honor": 2,
          "cash": 0
        }
      },
      {
        "id": "e_timeout",
        "title": "终局：血溅酒馆",
        "terminal": true,
        "beats": [
          {
            "speaker": "member_a",
            "text": "谈不拢，那就枪子儿说话！",
            "delayMs": 2000,
            "mood": "angry"
          },
          {
            "speaker": "member_b",
            "text": "来啊，谁怕谁！",
            "delayMs": 2000,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "内斗爆发",
          "lines": [
            "你没来得及赶到，两人在酒馆门口火并。",
            "老成员受了重伤，新人中弹身亡，帮派元气大伤。"
          ],
          "honor": -5,
          "cash": -100,
          "wanted": 2
        }
      }
    ],
    "nameAliases": {}
  },
  "faction_rival_wariness": {
    "id": "faction_rival_wariness",
    "title": "敌方忌惮",
    "hintOnEnter": "你看见{rival_boss}和{hench}在街角拦路，{neutral}缩在一边。",
    "protagonistRole": "rival_boss",
    "protagonistId": null,
    "kind": "faction",
    "faction": "enemy",
    "roles": [
      {
        "roleId": "rival_boss",
        "required": true,
        "jobs": [
          "帮派头目",
          "帮派二把手"
        ]
      },
      {
        "roleId": "hench",
        "required": true,
        "jobs": [
          "赌徒",
          "流浪赌徒",
          "牛仔"
        ]
      },
      {
        "roleId": "neutral",
        "required": true,
        "jobs": [
          "酒保",
          "商人",
          "医生"
        ]
      }
    ],
    "entryNode": "st",
    "unattendedMs": 65000,
    "timeoutNode": "e_leave",
    "idleLoop": [
      {
        "speaker": "rival_boss",
        "text": "（轻敲马鞭）这太阳真毒，等人最烦。",
        "delayMs": 2400,
        "mood": "neutral"
      },
      {
        "speaker": "hench",
        "text": "那小子到底来不来，我手痒了。",
        "delayMs": 2400,
        "mood": "angry"
      },
      {
        "speaker": "neutral",
        "text": "别往这边看，我只是路过。",
        "delayMs": 2400,
        "mood": "scared"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "第一幕：街角试探",
        "hint": "黑蹄会的人拦住去路，话里有话。",
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "（把玩着马鞭）听说你最近挺忙啊，连我们都听说了。",
            "delayMs": 1800,
            "mood": "neutral"
          },
          {
            "speaker": "hench",
            "to": "rival_boss",
            "text": "老大，跟他啰嗦什么，直接问清楚。",
            "delayMs": 1500,
            "mood": "angry"
          },
          {
            "speaker": "rival_boss",
            "to": "hench",
            "text": "急什么，街上这么多双眼睛。",
            "delayMs": 1500,
            "mood": "cold"
          },
          {
            "speaker": "neutral",
            "to": "all",
            "text": "（往旁边缩）我只是路过的，别扯上我。",
            "delayMs": 1500,
            "mood": "scared"
          },
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "你该知道，这镇上有些生意碰不得。",
            "delayMs": 1800,
            "mood": "smug"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "说！你到底想干什么？",
            "delayMs": 1500,
            "mood": "angry"
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "不绕弯子",
            "icon": "❓",
            "risk": "medium",
            "next": "m1",
            "line": "我没空听你废话，让开。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "装听不懂",
            "icon": "❓",
            "risk": "low",
            "next": "m2",
            "line": "我不明白你在说什么。",
            "effects": {}
          },
          {
            "id": "c3",
            "label": "反将一军",
            "icon": "❓",
            "risk": "high",
            "next": "m3",
            "line": "你们黑蹄会最近又做什么勾当？",
            "effects": {
              "wanted": 1
            }
          }
        ]
      },
      {
        "id": "m1",
        "title": "第二幕：火气上头",
        "hint": "你的强硬让气氛更紧绷。",
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "火气不小，看来传闻是真的。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "rival_boss",
            "text": "让我教训教训他。",
            "delayMs": 1500,
            "mood": "angry"
          },
          {
            "speaker": "rival_boss",
            "to": "hench",
            "text": "住手，还没到那一步。",
            "delayMs": 1500,
            "mood": "cold"
          },
          {
            "speaker": "neutral",
            "to": "all",
            "text": "我、我先走了。",
            "delayMs": 1500,
            "mood": "scared"
          },
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "你打算硬碰硬？想清楚。",
            "delayMs": 1800,
            "mood": "smug"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "别以为我们怕你！",
            "delayMs": 1500,
            "mood": "angry"
          }
        ],
        "choices": [
          {
            "id": "m1c1",
            "label": "拔枪对峙",
            "icon": "❓",
            "risk": "high",
            "next": "e_fight",
            "line": "那就试试看谁的枪快。",
            "effects": {
              "wanted": 2
            }
          },
          {
            "id": "m1c2",
            "label": "冷静收手",
            "icon": "❓",
            "risk": "low",
            "next": "e_leave",
            "line": "今天我不想见血，让开。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "m1c3",
            "label": "亮出证据",
            "icon": "❓",
            "risk": "medium",
            "next": "e_threat",
            "line": "你们码头那批货，我知道在哪儿。",
            "effects": {
              "cash": 1
            }
          }
        ]
      },
      {
        "id": "m2",
        "title": "第二幕：装傻周旋",
        "hint": "他们不信你一无所知。",
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "装糊涂？你我心里都清楚。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "少装蒜，我们知道你干了什么。",
            "delayMs": 1500,
            "mood": "angry"
          },
          {
            "speaker": "rival_boss",
            "to": "hench",
            "text": "别吓着他，我们只是聊聊。",
            "delayMs": 1500,
            "mood": "smug"
          },
          {
            "speaker": "neutral",
            "to": "all",
            "text": "这气氛不对，我得去找人。",
            "delayMs": 1500,
            "mood": "scared"
          },
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "你在牧场那边做的事，真以为没人看见？",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "快说，你是不是想对付我们？",
            "delayMs": 1500,
            "mood": "angry"
          }
        ],
        "choices": [
          {
            "id": "m2c1",
            "label": "继续装傻",
            "icon": "❓",
            "risk": "low",
            "next": "e_leave",
            "line": "我真的只是路过买点东西。",
            "effects": {
              "honor": -1
            }
          },
          {
            "id": "m2c2",
            "label": "承认意图",
            "icon": "❓",
            "risk": "high",
            "next": "e_fight",
            "line": "既然你问了，没错，我就是要你们倒霉。",
            "effects": {
              "wanted": 2
            }
          },
          {
            "id": "m2c3",
            "label": "抛假消息",
            "icon": "❓",
            "risk": "medium",
            "next": "e_info",
            "line": "我听说有人要抢你们的金矿。",
            "effects": {
              "cash": 1
            }
          }
        ]
      },
      {
        "id": "m3",
        "title": "第二幕：反客为主",
        "hint": "你反过来刺探他们。",
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "你倒反问起我来了。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "rival_boss",
            "text": "这家伙太嚣张了，老大。",
            "delayMs": 1500,
            "mood": "angry"
          },
          {
            "speaker": "rival_boss",
            "to": "hench",
            "text": "有趣，他以为能套我们的话。",
            "delayMs": 1500,
            "mood": "smug"
          },
          {
            "speaker": "neutral",
            "to": "all",
            "text": "我什么都没听见，先走了。",
            "delayMs": 1500,
            "mood": "scared"
          },
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "我们的买卖，轮不到你过问。",
            "delayMs": 1800,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "再问一句，我撕了你的嘴。",
            "delayMs": 1500,
            "mood": "angry"
          }
        ],
        "choices": [
          {
            "id": "m3c1",
            "label": "继续施压",
            "icon": "❓",
            "risk": "high",
            "next": "e_info",
            "line": "你们在警局有内应，对不对？",
            "effects": {
              "wanted": 1
            }
          },
          {
            "id": "m3c2",
            "label": "提出交易",
            "icon": "❓",
            "risk": "medium",
            "next": "e_truce",
            "line": "不如我们做笔买卖，各取所需。",
            "effects": {
              "cash": 2
            }
          },
          {
            "id": "m3c3",
            "label": "当众揭短",
            "icon": "❓",
            "risk": "high",
            "next": "e_threat",
            "line": "你们上周抢的车队，还死了人吧？",
            "effects": {
              "wanted": 2
            }
          }
        ]
      },
      {
        "id": "e_fight",
        "title": "终局：街头枪声",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "看来你非死不可了。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "早就想收拾你了！",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "neutral",
            "to": "all",
            "text": "别杀我，我什么都没看见！",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "街头枪声",
          "lines": [
            "你与黑蹄会的人在街心拔枪相向。",
            "枪响过后，你带着伤逃出镇子，通缉令贴满告示板。"
          ],
          "wanted": 3,
          "cash": 0
        }
      },
      {
        "id": "e_leave",
        "title": "终局：暂避锋芒",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "识相就快点离开这条街。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "player",
            "text": "滚吧，别让我们再看见你。",
            "delayMs": 1800,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "暂避锋芒",
          "lines": [
            "你压下火气，从他们身边走过。",
            "黑蹄会的人没有追来，但你知道这事没完。"
          ],
          "honor": -1,
          "cash": 0
        }
      },
      {
        "id": "e_threat",
        "title": "终局：把柄在握",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "你知道的太多了。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "rival_boss",
            "text": "老大，不能放他走！",
            "delayMs": 1800,
            "mood": "angry"
          }
        ],
        "outcome": {
          "title": "把柄在握",
          "lines": [
            "你抖出的消息让黑蹄会的人脸色发白。",
            "他们让开路，但你已经成了他们的眼中钉。"
          ],
          "wanted": 2,
          "honor": 1
        }
      },
      {
        "id": "e_info",
        "title": "终局：真假难辨",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "看来你非要趟这浑水。",
            "delayMs": 2000,
            "mood": "cold"
          },
          {
            "speaker": "hench",
            "to": "rival_boss",
            "text": "说漏嘴了，老大，怎么办？",
            "delayMs": 1800,
            "mood": "scared"
          }
        ],
        "outcome": {
          "title": "真假难辨",
          "lines": [
            "你从他们的慌乱中嗅到了有用的信息。",
            "但黑蹄会的人已经起了灭口的心思。"
          ],
          "wanted": 1,
          "honor": 0
        }
      },
      {
        "id": "e_truce",
        "title": "终局：魔鬼交易",
        "terminal": true,
        "beats": [
          {
            "speaker": "rival_boss",
            "to": "player",
            "text": "有点意思，我们可以谈谈。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "hench",
            "to": "rival_boss",
            "text": "老大，和他合作？",
            "delayMs": 1800,
            "mood": "angry"
          },
          {
            "speaker": "rival_boss",
            "to": "hench",
            "text": "闭嘴，生意归生意。",
            "delayMs": 1800,
            "mood": "cold"
          }
        ],
        "outcome": {
          "title": "魔鬼交易",
          "lines": [
            "你们在巷子里低声谈妥了一笔买卖。",
            "你得到了一些甜头，但也与黑蹄会绑在了一起。"
          ],
          "cash": 50,
          "honor": -2,
          "wanted": 0
        }
      }
    ],
    "nameAliases": {}
  }
};
