// theaterStoryTrees.js — 个人连续小剧场 + 势力相关小剧场（DS 生成 + 结构修复 + 中文化）
// 个人剧场：protagonistId 绑定主角 NPC；势力剧场：kind=faction。
// 角色不写 name → 选角用 NPC 真实中文显示名。自动生成，勿手改结构。

export const STORY_TREES = {
  "story_erin_ledger": {
    "id": "story_erin_ledger",
    "title": "账本疑云",
    "hintOnEnter": "艾琳·沃德在酒馆后巷等你，神色慌张，手里攥着账本。",
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
    "unattendedMs": 60000,
    "timeoutNode": "e_timeout",
    "idleLoop": [
      {
        "speaker": "erin",
        "text": "这数目不对，错得离谱。",
        "delayMs": 2000,
        "mood": "nervous"
      },
      {
        "speaker": "erin",
        "text": "老板要是发现我查他，我就完了。",
        "delayMs": 2500,
        "mood": "fearful"
      },
      {
        "speaker": "erin",
        "text": "快来吧，我快撑不住了。",
        "delayMs": 2200,
        "mood": "anxious"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "第一幕：亏空",
        "beats": [
          {
            "speaker": "erin",
            "text": "你可算来了，账本有鬼。",
            "delayMs": 1800,
            "mood": "nervous",
            "facePlayer": true
          },
          {
            "speaker": "erin",
            "text": "黑蹄会账上少了五百块，不是小数。",
            "delayMs": 2000,
            "mood": "grave",
            "facePlayer": true
          },
          {
            "speaker": "erin",
            "text": "有人做了假账，我怕是老板。",
            "delayMs": 2000,
            "mood": "fearful",
            "facePlayer": true
          },
          {
            "speaker": "erin",
            "text": "帮我查清楚，还是装作没看见？",
            "delayMs": 1800,
            "mood": "anxious",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "帮他查账",
            "icon": "📖",
            "risk": "low",
            "next": "n2",
            "line": "我帮你查，别慌。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "直接找老板对质",
            "icon": "⚖️",
            "risk": "high",
            "next": "n3",
            "line": "我们找老板对质去。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c3",
            "label": "撇清关系",
            "icon": "🚪",
            "risk": "low",
            "next": "e_quit",
            "line": "这事我不掺和。"
          }
        ]
      },
      {
        "id": "n2",
        "title": "第二幕：暗查",
        "beats": [
          {
            "speaker": "erin",
            "text": "账房钥匙在老板抽屉，我引开伙计。",
            "delayMs": 2000,
            "mood": "nervous",
            "facePlayer": true
          },
          {
            "speaker": "rival",
            "text": "二位找什么？缺的那笔钱？",
            "delayMs": 2000,
            "mood": "smirking",
            "facePlayer": true
          },
          {
            "speaker": "erin",
            "text": "流浪赌徒，你怎会在这？",
            "delayMs": 1800,
            "mood": "surprised",
            "facePlayer": true
          },
          {
            "speaker": "rival",
            "text": "老板欠我赌债，拿那笔钱抵了。",
            "delayMs": 2000,
            "mood": "smug",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "逼他说出内情",
            "icon": "🔍",
            "risk": "medium",
            "next": "n3",
            "line": "把你知道的全说出来。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "给他钱买消息",
            "icon": "💰",
            "risk": "low",
            "next": "n3",
            "line": "这些钱给你，快说。",
            "effects": {
              "cash": -20,
              "honor": 1
            }
          },
          {
            "id": "c3",
            "label": "拿钱走人",
            "icon": "🤝",
            "risk": "low",
            "next": "e_bribe",
            "line": "不如我们分了这笔钱。"
          }
        ]
      },
      {
        "id": "n3",
        "title": "第三幕：对质",
        "beats": [
          {
            "speaker": "boss",
            "text": "你们两个在账房鬼鬼祟祟做什么？",
            "delayMs": 2000,
            "mood": "angry",
            "facePlayer": true
          },
          {
            "speaker": "erin",
            "text": "账本上少了五百，你心里清楚。",
            "delayMs": 2000,
            "mood": "defiant",
            "facePlayer": true
          },
          {
            "speaker": "boss",
            "text": "胡说！那是投资亏空，正常周转。",
            "delayMs": 1800,
            "mood": "dismissive",
            "facePlayer": true
          },
          {
            "speaker": "rival",
            "text": "老板，你欠我的钱可没这么干净。",
            "delayMs": 2000,
            "mood": "taunting",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "报官处理",
            "icon": "⭐",
            "risk": "high",
            "next": "e_justice",
            "line": "跟我去见警长。"
          },
          {
            "id": "c2",
            "label": "替老板掩盖",
            "icon": "🤫",
            "risk": "medium",
            "next": "e_corrupt",
            "line": "老板，我们可以谈谈价钱。"
          },
          {
            "id": "c3",
            "label": "夺回钱款",
            "icon": "🃏",
            "risk": "medium",
            "next": "e_power",
            "line": "钱拿来，赌场归我们管。"
          }
        ]
      },
      {
        "id": "e_quit",
        "title": "明哲保身",
        "terminal": true,
        "outcome": {
          "title": "袖手旁观",
          "lines": [
            "艾琳失望地合上账本，没再说话。",
            "第二天，账房少了五百块的窟窿被人捅破。",
            "艾琳被指控做假账，你装作不认识他。"
          ],
          "honor": -1,
          "rumor": "镇上有人说你胆小怕事，艾琳被老板赶出镇子。"
        },
        "beats": [
          {
            "speaker": "erin",
            "text": "艾琳失望地合上账本，没再说话。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "erin",
            "text": "第二天，账房少了五百块的窟窿被人捅破。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      },
      {
        "id": "e_bribe",
        "title": "分赃",
        "terminal": true,
        "outcome": {
          "title": "不义之财",
          "lines": [
            "你和赌徒瓜分了五百块，各奔东西。",
            "艾琳发现钱不见，报了警，你成了头号嫌犯。",
            "警长悬赏抓你，你连夜逃出边城。"
          ],
          "cash": 50,
          "wanted": 1,
          "honor": -2,
          "rumor": "边城流传你与赌徒合谋，坑了艾琳。"
        },
        "beats": [
          {
            "speaker": "erin",
            "text": "你和赌徒瓜分了五百块，各奔东西。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "erin",
            "text": "艾琳发现钱不见，报了警，你成了头号嫌犯。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      },
      {
        "id": "e_justice",
        "title": "绳之以法",
        "terminal": true,
        "outcome": {
          "title": "账本归公",
          "lines": [
            "警长带人查了黑蹄会账房，老板被逮捕。",
            "艾琳洗清嫌疑，重新坐稳了会计的位子。",
            "镇民称赞你正直，赌场也换了新东家。"
          ],
          "honor": 2,
          "cash": 0,
          "wanted": 0,
          "rumor": "黑蹄会老板因做假账入狱，赌场关门大吉。"
        },
        "beats": [
          {
            "speaker": "erin",
            "text": "警长带人查了黑蹄会账房，老板被逮捕。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "erin",
            "text": "艾琳洗清嫌疑，重新坐稳了会计的位子。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      },
      {
        "id": "e_corrupt",
        "title": "同流合污",
        "terminal": true,
        "beats": [
          {
            "speaker": "erin",
            "text": "你把账本还给了赌场，换了一笔封口费。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "erin",
            "text": "从此艾琳再也没找你商量过事。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ],
        "outcome": {
          "title": "同流合污",
          "lines": [
            "你把账本还给了赌场，换了一笔封口费。",
            "从此艾琳再也没找你商量过事。"
          ],
          "honor": -3,
          "cash": 40
        }
      },
      {
        "id": "e_power",
        "title": "借账立威",
        "terminal": true,
        "beats": [
          {
            "speaker": "erin",
            "text": "你拿这本账做了把柄，赌场一时不敢造次。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "erin",
            "text": "可这份威，也引来了黑蹄会的记恨。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ],
        "outcome": {
          "title": "借账立威",
          "lines": [
            "你拿这本账做了把柄，赌场一时不敢造次。",
            "可这份威，也引来了黑蹄会的记恨。"
          ],
          "honor": -1,
          "wanted": 1
        }
      }
    ]
  },
  "story_jack_debt": {
    "id": "story_jack_debt",
    "title": "亡命追债",
    "hintOnEnter": "黑蹄会的债主正在镇口找你。",
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
    "unattendedMs": 60000,
    "timeoutNode": "e_end",
    "idleLoop": [
      {
        "speaker": "jack",
        "text": "指腹摩挲着左轮枪柄，这债躲不掉。",
        "delayMs": 2000,
        "mood": "tense"
      },
      {
        "speaker": "friend",
        "text": "杰克，他们带着猎枪往北街来了。",
        "delayMs": 2200,
        "mood": "worried"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "第一幕：上门",
        "beats": [
          {
            "speaker": "friend",
            "text": "杰克，黑蹄会的人堵在街口了。",
            "delayMs": 1800,
            "mood": "worried",
            "facePlayer": true
          },
          {
            "speaker": "jack",
            "text": "我欠的债，迟早要了结。",
            "delayMs": 1800,
            "mood": "tense",
            "facePlayer": false
          },
          {
            "speaker": "debtor",
            "text": "莫罗，旧债该清了。交枪，或交命。",
            "delayMs": 2000,
            "mood": "angry",
            "facePlayer": true
          },
          {
            "speaker": "friend",
            "text": "别冲动，杰克，或许能谈谈。",
            "delayMs": 1800,
            "mood": "worried",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "拔枪对峙",
            "icon": "🔫",
            "risk": "high",
            "next": "n2",
            "line": "我的枪比你的话快。",
            "effects": {
              "wanted": 1,
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "暂且周旋",
            "icon": "🕰️",
            "risk": "medium",
            "next": "n2",
            "line": "债可以慢慢算，先喝一杯？",
            "effects": {}
          },
          {
            "id": "c3",
            "label": "夺路而逃",
            "icon": "🏃",
            "risk": "low",
            "next": "n2",
            "line": "今天不是好日子。",
            "effects": {
              "wanted": -1,
              "honor": -1
            }
          }
        ]
      },
      {
        "id": "n2",
        "title": "第二幕：摊牌",
        "beats": [
          {
            "speaker": "debtor",
            "text": "你跑不掉，杰克。镇上没人会替你说话。",
            "delayMs": 1800,
            "mood": "angry",
            "facePlayer": true
          },
          {
            "speaker": "jack",
            "text": "我的命不值钱，但这把枪还值几个子儿。",
            "delayMs": 1800,
            "mood": "tense",
            "facePlayer": false
          },
          {
            "speaker": "friend",
            "text": "要钱我可以凑，别把事做绝了。",
            "delayMs": 1800,
            "mood": "worried",
            "facePlayer": true
          },
          {
            "speaker": "debtor",
            "text": "拿枪来，或者我亲自来取。",
            "delayMs": 1800,
            "mood": "angry",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c4",
            "label": "交枪保命",
            "icon": "🤝",
            "risk": "low",
            "next": "e_end",
            "line": "枪给你，债清了。",
            "effects": {
              "cash": -50,
              "honor": -2
            }
          },
          {
            "id": "c5",
            "label": "决一死战",
            "icon": "⚔️",
            "risk": "high",
            "next": "e_end",
            "line": "那就看谁先躺下。",
            "effects": {
              "wanted": 2,
              "honor": 1
            }
          },
          {
            "id": "c6",
            "label": "让朋友斡旋",
            "icon": "💬",
            "risk": "medium",
            "next": "e_end",
            "line": "帮我谈个价，朋友。",
            "effects": {
              "cash": -20,
              "honor": 1,
              "wanted": -1
            }
          }
        ]
      },
      {
        "id": "e_end",
        "title": "终局：旧债已了",
        "terminal": true,
        "outcome": {
          "title": "旧债已了",
          "lines": [
            "杰克·莫罗穿过扬尘的街道，左轮不再发烫。",
            "酒馆里，朋友收起空杯，往门上挂起打烊的牌子。",
            "有些债用血还，有些债用风还。"
          ],
          "honor": 0,
          "cash": 0,
          "wanted": 0
        },
        "beats": [
          {
            "speaker": "jack",
            "text": "杰克·莫罗穿过扬尘的街道，左轮不再发烫。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "jack",
            "text": "酒馆里，朋友收起空杯，往门上挂起打烊的牌子。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      }
    ]
  },
  "faction_infight": {
    "id": "faction_infight",
    "title": "帮派内讧：地盘之争",
    "hintOnEnter": "你的两个手下在酒馆门口拔枪相向，商人在旁瑟瑟发抖。",
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
    "unattendedMs": 60000,
    "timeoutNode": "e_end",
    "idleLoop": [
      {
        "speaker": "member_a",
        "text": "这地盘的账还没算清呢。",
        "delayMs": 2000,
        "mood": "angry"
      },
      {
        "speaker": "member_b",
        "text": "你那一套早过时了。",
        "delayMs": 2500,
        "mood": "cold"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "酒馆前的对峙",
        "beats": [
          {
            "speaker": "member_a",
            "text": "这地盘的账还没算清呢！",
            "delayMs": 1800,
            "mood": "angry",
            "facePlayer": false
          },
          {
            "speaker": "member_b",
            "text": "你那一套早过时了，老家伙。",
            "delayMs": 1800,
            "mood": "cold",
            "facePlayer": false
          },
          {
            "speaker": "onlooker",
            "text": "两位先生，别在镇上动枪……",
            "delayMs": 2000,
            "mood": "scared",
            "facePlayer": true
          },
          {
            "speaker": "member_a",
            "text": "滚开，这不关你的事！",
            "delayMs": 1500,
            "mood": "angry",
            "facePlayer": false
          },
          {
            "speaker": "member_b",
            "text": "头儿来了，让他评评理。",
            "delayMs": 1500,
            "mood": "neutral",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c_side_a",
            "label": "站在猛汉这边",
            "icon": "🔫",
            "risk": "high",
            "next": "n_mid",
            "line": "把枪收起来，这地盘该归他。",
            "effects": {
              "honor": 1,
              "wanted": 1
            }
          },
          {
            "id": "c_side_b",
            "label": "偏袒狡狐",
            "icon": "🃏",
            "risk": "medium",
            "next": "n_mid",
            "line": "老家伙，他的办法更来钱。",
            "effects": {
              "cash": 20,
              "honor": -1
            }
          },
          {
            "id": "c_crackdown",
            "label": "各打五十大板",
            "icon": "⚖️",
            "risk": "low",
            "next": "n_mid",
            "line": "都给我住手，谁再闹就滚出帮派。",
            "effects": {
              "honor": 2
            }
          }
        ]
      },
      {
        "id": "n_mid",
        "title": "裂痕加深",
        "beats": [
          {
            "speaker": "member_a",
            "text": "你居然向着他？这口气我咽不下。",
            "delayMs": 1800,
            "mood": "angry",
            "facePlayer": true
          },
          {
            "speaker": "member_b",
            "text": "头儿心里有数，你别不识抬举。",
            "delayMs": 1800,
            "mood": "smug",
            "facePlayer": false
          },
          {
            "speaker": "onlooker",
            "text": "镇警长往这边来了……",
            "delayMs": 2000,
            "mood": "scared",
            "facePlayer": true
          },
          {
            "speaker": "member_a",
            "text": "今天必须有个了断。",
            "delayMs": 1500,
            "mood": "determined",
            "facePlayer": false
          }
        ],
        "choices": [
          {
            "id": "c_exile",
            "label": "驱逐挑事者",
            "icon": "🚪",
            "risk": "high",
            "next": "e_end",
            "line": "你收拾东西，天亮前离开镇子。",
            "effects": {
              "honor": 1,
              "wanted": -1
            }
          },
          {
            "id": "c_split",
            "label": "平分地盘",
            "icon": "🗺️",
            "risk": "medium",
            "next": "e_end",
            "line": "北街归你，南街归他，别再吵。",
            "effects": {
              "cash": -30,
              "honor": 2
            }
          },
          {
            "id": "c_threaten",
            "label": "用枪压场",
            "icon": "🔫",
            "risk": "high",
            "next": "e_end",
            "line": "谁再动一下，我的枪不认人。",
            "effects": {
              "wanted": 2,
              "honor": -1
            }
          }
        ]
      },
      {
        "id": "e_end",
        "title": "尘埃落定",
        "terminal": true,
        "outcome": {
          "title": "尘埃落定",
          "lines": [
            "你平息内讧，但裂痕未愈。",
            "商人松了口气，匆匆离开。",
            "镇上的流言开始传开。"
          ],
          "honor": 0,
          "cash": 0,
          "wanted": 0,
          "rumor": "帮派内讧的事在镇上悄悄流传。"
        },
        "beats": [
          {
            "speaker": "member_a",
            "text": "你平息内讧，但裂痕未愈。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "member_a",
            "text": "商人松了口气，匆匆离开。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      }
    ]
  },
  "faction_rival_wariness": {
    "id": "faction_rival_wariness",
    "title": "敌方忌惮",
    "hintOnEnter": "黑蹄会的人与你撞个正着，他们眼神里藏着警惕。",
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
    "unattendedMs": 60000,
    "timeoutNode": "e_timeout",
    "idleLoop": [
      {
        "speaker": "hench",
        "text": "这太阳晒得人发昏。",
        "delayMs": 2000,
        "mood": "neutral"
      },
      {
        "speaker": "rival_boss",
        "text": "别发牢骚，好好盯着。",
        "delayMs": 2000,
        "mood": "neutral"
      },
      {
        "speaker": "neutral",
        "text": "两位，要不要来杯威士忌？",
        "delayMs": 2000,
        "mood": "neutral"
      }
    ],
    "nodes": [
      {
        "id": "st",
        "title": "狭路相逢",
        "beats": [
          {
            "speaker": "hench",
            "text": "老大，看那边，那人面生得很。",
            "delayMs": 1800,
            "mood": "neutral",
            "facePlayer": true
          },
          {
            "speaker": "rival_boss",
            "text": "朋友，今儿个怎么有空来这条街？",
            "delayMs": 1800,
            "mood": "neutral",
            "facePlayer": true
          },
          {
            "speaker": "rival_boss",
            "text": "咱们黑蹄会向来敬重好汉，不想多事。",
            "delayMs": 1800,
            "mood": "neutral",
            "facePlayer": true
          },
          {
            "speaker": "hench",
            "text": "问你话呢，你到底是什么来头？",
            "delayMs": 1800,
            "mood": "neutral",
            "facePlayer": true
          }
        ],
        "choices": [
          {
            "id": "c1",
            "label": "表明并无恶意",
            "icon": "🤝",
            "risk": "low",
            "next": "e_friendly",
            "line": "我只是路过，不想惹麻烦。",
            "effects": {
              "honor": 1
            }
          },
          {
            "id": "c2",
            "label": "反将一军",
            "icon": "⚔️",
            "risk": "high",
            "next": "e_tough",
            "line": "这话该我问你们，你们想干什么？",
            "effects": {
              "honor": 2,
              "wanted": 1
            }
          },
          {
            "id": "c3",
            "label": "沉默离开",
            "icon": "🚶",
            "risk": "low",
            "next": "e_avoid",
            "line": "没什么好说的。"
          }
        ]
      },
      {
        "id": "e_friendly",
        "title": "井水不犯河水",
        "terminal": true,
        "outcome": {
          "title": "井水不犯河水",
          "lines": [
            "既然路过，那便请便。",
            "下次可别撞上咱们。"
          ],
          "honor": 1
        },
        "beats": [
          {
            "speaker": "rival_boss",
            "text": "既然路过，那便请便。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "rival_boss",
            "text": "下次可别撞上咱们。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      },
      {
        "id": "e_tough",
        "title": "不欢而散",
        "terminal": true,
        "outcome": {
          "title": "不欢而散",
          "lines": [
            "好小子，你有种。",
            "咱们走着瞧。"
          ],
          "honor": 2,
          "wanted": 1
        },
        "beats": [
          {
            "speaker": "rival_boss",
            "text": "好小子，你有种。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "rival_boss",
            "text": "咱们走着瞧。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      },
      {
        "id": "e_avoid",
        "title": "形同陌路",
        "terminal": true,
        "outcome": {
          "title": "形同陌路",
          "lines": [
            "这家伙怪得很。",
            "盯紧点，别让他坏了事。"
          ]
        },
        "beats": [
          {
            "speaker": "rival_boss",
            "text": "这家伙怪得很。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "rival_boss",
            "text": "盯紧点，别让他坏了事。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      },
      {
        "id": "e_timeout",
        "title": "没了耐心",
        "terminal": true,
        "outcome": {
          "title": "没了耐心",
          "lines": [
            "看来是个哑巴，咱们走。",
            "浪费老子时间。"
          ],
          "wanted": 1
        },
        "beats": [
          {
            "speaker": "rival_boss",
            "text": "看来是个哑巴，咱们走。",
            "delayMs": 2000,
            "mood": "neutral"
          },
          {
            "speaker": "rival_boss",
            "text": "浪费老子时间。",
            "delayMs": 2000,
            "mood": "neutral"
          }
        ]
      }
    ]
  }
};
