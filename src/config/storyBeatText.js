/**
 * 故事节点的包装化文案 + 可演剧本（deepseek-v4-pro 批量生成，勿手改单条）
 *
 * 字段：
 *  - description   : 到场时看到的画面
 *  - phoneInvite   : 手机来信正文（第一人称口信 + 邀请动作）
 *  - locateLabel   : 定位按钮上的地点名（与口信说法一致）
 *  - venueId       : storyVenues.VENUE_DEFS 的地点 id，决定"📍去看看"去哪
 *  - indoor        : 这一幕在屋里还是街上。**显式布尔**，不要再用正则读散文猜 ——
 *                    实测那样在 13 个建筑类地点里判错 6 个（"酒馆角落""警长办公室"
 *                    都被当成户外，"酒馆门廊"反被当成室内）
 *  - cutsceneTitle / cutscene : 黑幕过场（你没到场、强行推进时补叙）
 *  - stageCast     : 这一幕需要谁在场 { leadFemale, leadHint, leadGang, extras }
 *  - scene.beats        : 开场的多人同台对话 [{speaker,to,text,mood,delayMs}]
 *  - scene.choices      : 过渡节点补的玩家抉择（原来自动推进、插不上手）
 *  - scene.closingLines : 终局节点的收尾旁白
 *  - scene.choiceScenes : **每个选项选完之后的戏** { <choiceId>: {beats, lines, fx} }
 *                    fx = { cash, honor, wanted, affection, trust }
 *                    以前所有选项共用一句写死的"记住你今天说的话"，选了等于没选
 *
 * 生成时间：2026-08-19T11:38:12.931Z
 * 完整 40 / 部分 0
 */
export const STORY_BEAT_TEXT = {
  "trust_betrayal_redemption": {
    "encounter": {
      "description": "两个红隼帮汉子把个姑娘堵在广场东边的窄巷口，她左衣袖磨破、脸上沾灰，一瞧见你就攥紧门框不撒手。",
      "phoneInvite": "广场东巷口有人托我带话，说她被红隼帮缠得脱不了身，求你快去搭把手——她说有样东西只能给你看。",
      "locateLabel": "广场东窄巷",
      "cutsceneTitle": "东巷初见",
      "cutscene": [
        "那晚之后，巡夜的更夫看见红隼帮在广场周边转了三圈，气得踢翻了水桶。",
        "第二天酒馆里都在说，巷口那姑娘不见了影，镇长老莫在告示板上贴了张寻人启事。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": true,
        "leadHint": "被红隼帮堵住的姑娘",
        "leadGang": null,
        "extras": [
          {
            "n": 2,
            "hint": "红隼帮的汉子",
            "female": false,
            "gang": "红隼帮"
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "把账本交出来，别逼我们动手。",
            "mood": "angry",
            "delayMs": 1988
          },
          {
            "speaker": "extra0_1",
            "to": "player",
            "text": "红隼帮办事，外人滚远点。",
            "mood": "cold",
            "delayMs": 1771
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "求你了，他们抢我爹的遗物。",
            "mood": "scared",
            "delayMs": 1814
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "嘴硬？那就连你一块儿带走。",
            "mood": "smug",
            "delayMs": 1930
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "帮帮我，我什么都告诉你。",
            "mood": "scared",
            "delayMs": 1605
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "enc_help": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "求你了，别让他们带我走。",
                "mood": "scared",
                "delayMs": 2196
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "不关你的事，外乡人。",
                "mood": "cold",
                "delayMs": 2105
              },
              {
                "speaker": "extra0_1",
                "to": "player",
                "text": "这家伙想逞英雄？",
                "mood": "smug",
                "delayMs": 1945
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "放开我！",
                "mood": "angry",
                "delayMs": 1803
              }
            ],
            "lines": [
              "你上前质问，红隼帮两人骂骂咧咧退出巷子。",
              "姑娘抓着你胳膊，眼里满是感激的泪。"
            ],
            "fx": {
              "cash": 0,
              "honor": 10,
              "wanted": 0,
              "affection": 15,
              "trust": 15
            }
          },
          "enc_money": {
            "beats": [
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "哟，想用钱打发我们？",
                "mood": "smug",
                "delayMs": 1642
              },
              {
                "speaker": "extra0_1",
                "to": "player",
                "text": "这点钱可不够买她的命。",
                "mood": "cold",
                "delayMs": 2096
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别给他们钱，我不欠你的。",
                "mood": "sad",
                "delayMs": 1677
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "再拿点，不然我们可不松手。",
                "mood": "smug",
                "delayMs": 1654
              }
            ],
            "lines": [
              "你递出几张钞票，红隼帮汉子一把抓过，却仍不放手。",
              "姑娘别过脸，不再看你，眼神冷了下去。"
            ],
            "fx": {
              "cash": -40,
              "honor": -5,
              "wanted": 0,
              "affection": -10,
              "trust": -10
            }
          },
          "enc_pass": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "别走……求你……",
                "mood": "scared",
                "delayMs": 1633
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "算你识相。",
                "mood": "smug",
                "delayMs": 1745
              },
              {
                "speaker": "extra0_1",
                "to": "extra0_0",
                "text": "别管他，带走。",
                "mood": "cold",
                "delayMs": 2114
              }
            ],
            "lines": [
              "你转身离开，身后传来姑娘的哭喊和汉子的哄笑。",
              "巷口的风卷起尘土，遮住了你的影子。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 0,
              "affection": -20,
              "trust": -20
            }
          }
        }
      },
      "indoor": false
    },
    "re_encounter": {
      "description": "艾达坐在酒馆靠墙角落，就着烛火缝补左袖，见你推门进来，她手一抖，针扎进指头，嘴抿成一条线。",
      "phoneInvite": "你常坐的那张桌空着，艾达让我给你捎句话：她在酒馆后墙根等你，想当面谢你，还说有桩油水活儿藏不住。",
      "locateLabel": "酒馆后墙根",
      "cutsceneTitle": "数日之后",
      "cutscene": [
        "这几天，她总在日落前到酒馆，向酒保比划着打听一个高个子骑手。",
        "镇上人见她洗了脸、换了件旧裙子，都说像是从哪儿逃出来的。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": true,
        "leadHint": "坐在角落的艾达",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你走路像猫，针都扎进肉里了。",
            "mood": "scared",
            "delayMs": 1885
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "别装没事，我知道你为那桩事来。",
            "mood": "cold",
            "delayMs": 1620
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "他们拿我妹妹要挟，我只能照做。",
            "mood": "sad",
            "delayMs": 1772
          }
        ],
        "choices": [
          {
            "label": "相信她，问清妹妹下落"
          },
          {
            "label": "拔枪抵住她，逼问主使"
          },
          {
            "label": "冷眼旁观，让她自己交代"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你来得正好，我正拿不定主意。",
                "mood": "neutral",
                "delayMs": 2135
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "红隼帮把我妹妹扣在旧矿场。",
                "mood": "sad",
                "delayMs": 1642
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "他们说今晚不去，就撕票。",
                "mood": "scared",
                "delayMs": 1817
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你肯信我，我欠你一条命。",
                "mood": "happy",
                "delayMs": 1986
              }
            ],
            "lines": [
              "你信了她，连夜赶往旧矿场，救出妹妹，艾达记下这份情。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 15
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你疯了吗？把枪放下！",
                "mood": "scared",
                "delayMs": 2090
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "什么主使？我不知道！",
                "mood": "angry",
                "delayMs": 1834
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你逼我也没用，他们早走了。",
                "mood": "cold",
                "delayMs": 1799
              }
            ],
            "lines": [
              "你拔枪逼供，酒馆里人人侧目，警长随后赶到，你被带走问话。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 2,
              "affection": -15,
              "trust": -20
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你看什么？我又没做亏心事。",
                "mood": "cold",
                "delayMs": 2187
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你连问都不问，就由我自生自灭？",
                "mood": "sad",
                "delayMs": 1694
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "算了，我妹妹的事不用你管。",
                "mood": "angry",
                "delayMs": 1829
              }
            ],
            "lines": [
              "你袖手旁观，艾达独自离去，红隼帮的威胁再无人知晓。"
            ],
            "fx": {
              "cash": 0,
              "honor": -8,
              "wanted": 0,
              "affection": -10,
              "trust": -15
            }
          }
        }
      },
      "indoor": true
    },
    "join": {
      "description": "她站在酒馆后门的马槽边，把一柄磨短了的猎刀平放在木桩上，刀柄朝向你，嘴唇上还沾着昨晚咬破的血痂。",
      "phoneInvite": "马夫老哈传话：去酒馆后门马槽那儿，那姑娘说要把自己的短刀和命一起交到你手上。",
      "locateLabel": "后门马槽旁",
      "cutsceneTitle": "刀落为约",
      "cutscene": [
        "打那天起，她白日替你跑腿送信，夜里蹲在营地外头擦那柄短刀，刀柄上缠了新布条。",
        "镇上人慢慢不再叫她巷口姑娘，改口喊你身边的小尾巴。"
      ],
      "venueId": "saloon_back",
      "stageCast": {
        "leadFemale": true,
        "leadHint": "持短刀的姑娘",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "这刀磨短了，昨晚差点插进我肋条。",
            "mood": "cold",
            "delayMs": 1796
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你拿着，今晚有人要再试一次。",
            "mood": "scared",
            "delayMs": 1997
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "帮我，或者走开，别挡在门口。",
            "mood": "cold",
            "delayMs": 1973
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "accept": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "猎刀归你。后巷的活儿，今晚就有一桩。",
                "mood": "smug",
                "delayMs": 2006
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别学那些戴警徽的，心软要命。",
                "mood": "cold",
                "delayMs": 2076
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "天亮前把马槽里的血擦净，别留印子。",
                "mood": "neutral",
                "delayMs": 2169
              }
            ],
            "lines": [
              "你接过短刀，成了她手里另一把刀。",
              "酒馆后门的血味，从此沾上你的靴底。"
            ],
            "fx": {
              "cash": 20,
              "honor": -5,
              "wanted": 0,
              "affection": 20,
              "trust": 15
            }
          },
          "conditionally": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "讲条件？你当这是集市上骡马买卖？",
                "mood": "cold",
                "delayMs": 2000
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "说吧，我听着。可别指望我点头。",
                "mood": "neutral",
                "delayMs": 2186
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你的条件最好值一条命。",
                "mood": "cold",
                "delayMs": 1934
              }
            ],
            "lines": [
              "你提了条件，她既没应承也没回绝。",
              "她看你的眼神，像在估一匹没烙印的马。"
            ],
            "fx": {
              "cash": -10,
              "honor": 0,
              "wanted": 0,
              "affection": 5,
              "trust": -5
            }
          },
          "reject": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "不接刀，就等着接枪子。",
                "mood": "angry",
                "delayMs": 2068
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你当后巷是礼拜堂？没人能白听。",
                "mood": "cold",
                "delayMs": 2126
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "滚，别让我在矿场再瞧见你。",
                "mood": "angry",
                "delayMs": 1829
              }
            ],
            "lines": [
              "你转身离开，把短刀和血痂留在马槽边。",
              "她记住了你的背影，像狼记住枪伤。"
            ],
            "fx": {
              "cash": 0,
              "honor": 10,
              "wanted": 0,
              "affection": -20,
              "trust": -10
            }
          }
        }
      },
      "indoor": false
    },
    "honeymoon": {
      "description": "酒馆里煤油灯昏黄，他正伏在桌上给你那把左轮上油，听见门响抬头，眼角笑出褶子。",
      "phoneInvite": "今晚来趟酒馆，我弄到半瓶黑麦威士忌，还给你缝了副新护腕，就等你来试。",
      "locateLabel": "酒馆靠窗桌",
      "cutsceneTitle": "数日之后",
      "cutscene": [
        "接下来的日子，他替你饮马、擦枪、补衣裳，酒馆里人人都说你多了条影子。",
        "红隼帮的人也收敛了许多，镇上难得过了几天不听见夜半枪声的安生日子。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "伏案擦枪的他",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你可算来了，红隼帮的探子刚走。",
            "mood": "smug",
            "delayMs": 1907
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "有人往你枪里塞了颗哑弹，想让你死在决斗里。",
            "mood": "cold",
            "delayMs": 1635
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我替你清了膛，但今晚你得替我做件事。",
            "mood": "neutral",
            "delayMs": 2086
          }
        ],
        "choices": [
          {
            "label": "到底是谁想害我？"
          },
          {
            "label": "你凭什么让我信你？"
          },
          {
            "label": "我自己的事自己解决"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你总算问到点子上了。",
                "mood": "neutral",
                "delayMs": 2039
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "红隼帮的人昨儿在矿场打听你的行踪。",
                "mood": "cold",
                "delayMs": 1950
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别声张，这把枪我给你上好了。",
                "mood": "neutral",
                "delayMs": 1738
              }
            ],
            "lines": [
              "他透露了风声，你心里有了方向，决定先查红隼帮。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": 8,
              "trust": 12
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "信不信由你，枪我已经擦好了。",
                "mood": "smug",
                "delayMs": 1934
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "门外那匹马可不是我的。",
                "mood": "cold",
                "delayMs": 1735
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你不信，大可以自己出去看看。",
                "mood": "angry",
                "delayMs": 1613
              }
            ],
            "lines": [
              "他的态度让你更生疑，但线索仍悬在半空，你感到孤立无援。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": -10,
              "trust": -15
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "随你，枪就搁在桌上。",
                "mood": "cold",
                "delayMs": 1685
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别指望我替你收尸。",
                "mood": "cold",
                "delayMs": 2164
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "门就在那边，不送。",
                "mood": "neutral",
                "delayMs": 1661
              }
            ],
            "lines": [
              "你独自离开，他也没有挽留，你们之间的信任更薄了。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": -8,
              "trust": -10
            }
          }
        }
      },
      "indoor": true
    },
    "betrayal": {
      "description": "你掀开帐篷帘，钱箱铁锁被撬开，几张银元撒在泥地上，昨夜升的火堆还冒着细烟，他人影全无。",
      "phoneInvite": "快回营地来，你的钱箱让人给撬了，你那伙计天没亮就骑马往北边去了。",
      "locateLabel": "营地破帐篷外",
      "cutsceneTitle": "那夜之后",
      "cutscene": [
        "那天夜里，你睡得格外沉，连马厩里的狗都没叫唤一声。",
        "天蒙蒙亮，杂货铺老板看见一匹灰马驮着个人影，顺着北边小路跑得没影了。",
        "镇上的人开始交头接耳，说红隼帮的人昨夜里在酒馆喝到半夜。"
      ],
      "venueId": "hq",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "营地的报信人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "钱箱被撬了，银元撒了一地。",
            "mood": "cold",
            "delayMs": 1937
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "定是昨夜有人趁黑摸进来了。",
            "mood": "angry",
            "delayMs": 1718
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "得赶紧追，兴许还没走远。",
            "mood": "scared",
            "delayMs": 1771
          }
        ],
        "choices": [
          {
            "label": "检查帐篷里的脚印"
          },
          {
            "label": "质问报信人为何在此"
          },
          {
            "label": "立刻骑马去追贼人"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "看泥地，脚印往北边去了，还新鲜。",
                "mood": "neutral",
                "delayMs": 1721
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别踩乱了，仔细瞧，像有三个人的靴印。",
                "mood": "cold",
                "delayMs": 1828
              }
            ],
            "lines": [
              "你从泥地脚印辨出三人往北逃去，追出半里只捡回几枚银元。"
            ],
            "fx": {
              "cash": 20,
              "honor": 0,
              "wanted": 0,
              "affection": 0,
              "trust": 10
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你怀疑我？我听见动静才过来，只看见这些。",
                "mood": "scared",
                "delayMs": 1657
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "我要是贼，早骑上马跑了，还站在这儿等你？",
                "mood": "angry",
                "delayMs": 1771
              }
            ],
            "lines": [
              "报信人满脸涨红，赌咒发誓与此事无关，你俩之间生了嫌隙。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 0,
              "affection": -15,
              "trust": -20
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "等等！那帮人可能设了埋伏，你别一个人去。",
                "mood": "scared",
                "delayMs": 1942
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "我看见他们往矿场方向跑了，骑快点兴许追得上。",
                "mood": "neutral",
                "delayMs": 1822
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "带上这个，路上好用。",
                "mood": "cold",
                "delayMs": 2086
              }
            ],
            "lines": [
              "你策马追出二里，不见贼人踪影，回到营地火堆已熄。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 5
            }
          }
        }
      },
      "indoor": false
    },
    "clues": {
      "description": "酒馆后门的泥地上有一串新脚印，花纹是马蹄铁打的靴跟，吧台上搁着半杯冷掉的咖啡。",
      "phoneInvite": "来趟酒馆，我在后门台阶缝里捡到个黄铜烟嘴，上面刻着个‘R’字，像你伙计的。",
      "locateLabel": "酒馆后门台阶",
      "cutsceneTitle": "三天之后",
      "cutscene": [
        "你沿着北边小路追出去两天，马蹄印在溪水边断了，只得折回镇上。",
        "酒馆老板说，那晚上他听见过两次后门响，一次轻一次重，中间隔着约莫一袋烟的工夫。",
        "打猎的老瘸子说，他在北坡看见过一匹灰马，鞍上挂着你那伙计的旧水囊。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "酒馆里的线人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "瞧见地上那串新脚印没？马蹄铁的靴跟，刚留下。",
            "mood": "cold",
            "delayMs": 2141
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "那半杯咖啡还温着，人没走远，就在附近。",
            "mood": "scared",
            "delayMs": 1939
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "有人要卖了你，快跟我从后巷走。",
            "mood": "scared",
            "delayMs": 2083
          }
        ],
        "choices": [
          {
            "label": "逼他说出脚印的主人"
          },
          {
            "label": "自己蹲下查那咖啡杯"
          },
          {
            "label": "拔枪抵着他后腰"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你轻点儿，这可不是闹着玩的。",
                "mood": "scared",
                "delayMs": 1803
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "那靴跟是银矿兄弟会的记号，我见过。",
                "mood": "scared",
                "delayMs": 1627
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "他们今晚在后巷交货，别把我扯进去。",
                "mood": "neutral",
                "delayMs": 1738
              }
            ],
            "lines": [
              "你从他嘴里逼出了银矿兄弟会的行踪。",
              "但他从此见了你就躲，再不肯多吐半个字。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 0,
              "affection": -10,
              "trust": -15
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你蹲下做什么？那杯咖啡早凉了。",
                "mood": "neutral",
                "delayMs": 1862
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别碰，那是我喝剩的，没什么看头。",
                "mood": "cold",
                "delayMs": 1827
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你该不会疑心我在杯里下药吧？",
                "mood": "smug",
                "delayMs": 1805
              }
            ],
            "lines": [
              "你查了咖啡杯，没找到有用线索，只闻见一股苦味。",
              "线人见你不发火，反倒松了戒备，多说了几句闲话。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": 5,
              "trust": 5
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "老天，别开枪，我什么都说！",
                "mood": "scared",
                "delayMs": 1839
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "是红隼帮的人，他们逼我传假消息。",
                "mood": "scared",
                "delayMs": 2126
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "枪口挪开，我带你去找他们。",
                "mood": "scared",
                "delayMs": 2165
              }
            ],
            "lines": [
              "你拔枪威逼，线人当场供出红隼帮的藏身点。",
              "但后厨有人瞧见，小镇很快传开你持枪行凶。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 1,
              "affection": -15,
              "trust": -20
            }
          }
        }
      },
      "indoor": true
    },
    "confrontation": {
      "description": "酒馆后巷，她背贴潮湿的砖墙，两手空空，眼神却直直迎上你，脚边落着那枚被你扯断的银扣子。",
      "phoneInvite": "有人让我带话，说她在老地方等你，就你一个人来。她手里有封信，火漆印是黑蹄会的。",
      "locateLabel": "酒馆后巷",
      "cutsceneTitle": "面对面",
      "cutscene": [
        "日头从酒馆招牌滑到巷口，又落进西边山脊，看热闹的人嚼着烟草散了。",
        "她仍站在那扇吱呀响的木门边，手心的汗把信纸浸出两个指印。"
      ],
      "venueId": "saloon_back",
      "stageCast": {
        "leadFemale": true,
        "leadHint": "后巷对峙的女子",
        "leadGang": "黑蹄会",
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你扯断了我的扣子，就为了让我停步？",
            "mood": "angry",
            "delayMs": 1858
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我说过，那封信不是我写的。",
            "mood": "cold",
            "delayMs": 2051
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你要么信我，要么一枪了结。",
            "mood": "angry",
            "delayMs": 1858
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "forgive": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你当真不追究我的事？",
                "mood": "scared",
                "delayMs": 1766
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "我原以为你会一枪崩了我。",
                "mood": "sad",
                "delayMs": 1673
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "这枚扣子……你拿回去吧。",
                "mood": "neutral",
                "delayMs": 2178
              }
            ],
            "lines": [
              "你放她走了，后巷只剩雨滴敲打砖墙。",
              "银扣子陷在泥里，像一句没说完的话。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 10
            }
          },
          "punish": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "动手吧，我早料到有这天。",
                "mood": "cold",
                "delayMs": 2053
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你和你那帮人一样，只会用枪说话。",
                "mood": "angry",
                "delayMs": 1905
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "别指望我求你，你动手就是。",
                "mood": "cold",
                "delayMs": 2142
              }
            ],
            "lines": [
              "你将她押往警长办公室，后巷恢复死寂。",
              "银扣子被你踩进泥里，再没人提起。"
            ],
            "fx": {
              "cash": 0,
              "honor": 3,
              "wanted": 1,
              "affection": -15,
              "trust": -10
            }
          },
          "recruit_back": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你想策反我？胆子不小。",
                "mood": "smug",
                "delayMs": 1748
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "我凭什么信你不会背后捅刀？",
                "mood": "cold",
                "delayMs": 1794
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "除非……你给得起价码。",
                "mood": "smug",
                "delayMs": 2178
              }
            ],
            "lines": [
              "你递上一小袋银元，她掂了掂收进怀里。",
              "银扣子成了接头暗号，夜色吞没她的身影。"
            ],
            "fx": {
              "cash": -40,
              "honor": -5,
              "wanted": 0,
              "affection": 5,
              "trust": 15
            }
          }
        }
      },
      "indoor": false
    },
    "redemption": {
      "description": "雨夜教堂台阶上，她浑身湿透，怀里抱着那袋银币，膝盖在石板上磕出淤青，嘴唇冻得发紫。",
      "phoneInvite": "牧师让人来喊你，说她在忏悔室哭了一整夜，非要见你一面，把东西亲手还你。",
      "locateLabel": "教堂台阶下",
      "cutsceneTitle": "雨夜忏悔",
      "cutscene": [
        "那夜雨没停过，教堂的烛火被风扑灭三回，又被人重新点亮。",
        "天亮时，几个去早祷的妇人看见台阶上摆着你的银袋，袋口系着一根沾血的麻绳。"
      ],
      "venueId": "church",
      "stageCast": {
        "leadFemale": true,
        "leadHint": "雨夜忏悔的女子",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "这袋银币是黑蹄会的买命钱，我偷了它。",
            "mood": "scared",
            "delayMs": 1736
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "他们的人正在教堂外转，像狼一样等着我出去。",
            "mood": "cold",
            "delayMs": 1924
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我的膝盖不中用了，求你把银币交给治安官。",
            "mood": "sad",
            "delayMs": 2184
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "就说我死在北边矿场，别让他们再找这镇子。",
            "mood": "cold",
            "delayMs": 1927
          }
        ],
        "choices": null,
        "closingLines": [
          "天亮时，银币被摆上镇长的桌案，教堂外只剩一滩雨水。",
          "镇上人说她冻死在北边矿场，也有人说她上了去东部的驿车。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "exile": {
      "description": "镇口风滚草擦着地皮滚过，她衣衫单薄，被人用枪托一推，踉跄着踏上北去的土路，一步一回头。",
      "phoneInvite": "警长让你去一趟镇口，说规矩你定，但人必须今天离开，别让弟兄们难做。",
      "locateLabel": "镇口风沙里",
      "cutsceneTitle": "远走",
      "cutscene": [
        "她走后第三日，北边的旅商捎回话，说看见一个女人在废弃的驿站啃冷掉的豆子。",
        "镇上的人渐渐不再提她的名字，只有酒馆墙上的悬赏令边角被风掀起，露出半张脸。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": true,
        "leadHint": "被驱逐的姑娘",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "持枪推她的人",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "别磨蹭，趁天没黑滚远。",
            "mood": "cold",
            "delayMs": 2146
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你看见的，他们赶我走。",
            "mood": "sad",
            "delayMs": 1626
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "这娘们偷了帮里钱，该。",
            "mood": "angry",
            "delayMs": 1774
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "你们设的局，我迟早讨回来。",
            "mood": "angry",
            "delayMs": 1999
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "做梦吧，你连枪都没有。",
            "mood": "smug",
            "delayMs": 1698
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "若你还念旧情，给我把枪。",
            "mood": "cold",
            "delayMs": 2162
          }
        ],
        "choices": null,
        "closingLines": [
          "她一步步消失在风沙里，像被风滚草卷走。",
          "镇上的人站在远处，没人说一句挽留的话。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "double_agent": {
      "description": "他在黑蹄会营帐外围，正用匕首削一根马刺，每削一下，眼睛就飞快扫一眼进出的帮众，风里飘来炖豆子和枪油的气味。",
      "phoneInvite": "有个戴灰毡帽的托我传话，说你若还想听真话，今晚月亮升到钟楼尖时，他在马厩后头第三根拴马桩等你，就你一个人来。",
      "locateLabel": "马厩后拴马桩",
      "cutsceneTitle": "暗哨生根",
      "cutscene": [
        "他走后，有人半夜听见枪托砸门，天亮门槛下多了银圆和半根红隼羽。",
        "黑蹄会的货队接连在断颈谷遭伏，可镇上警长收到的线报永远比枪声早半个钟点。"
      ],
      "venueId": "stables",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "黑蹄会外围的眼线",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "黑蹄会的帮众",
            "female": null,
            "gang": "黑蹄会"
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "你削马刺的手，比平常慢了不少。",
            "mood": "cold",
            "delayMs": 1943
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "风大，手僵，这活计难做。",
            "mood": "neutral",
            "delayMs": 2009
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "老大要你今晚去矿场，别带旁人。",
            "mood": "angry",
            "delayMs": 1927
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你听见了，他们要我去送死。",
            "mood": "scared",
            "delayMs": 1785
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "替我告诉警长，欠他的我还清了。",
            "mood": "sad",
            "delayMs": 1729
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "别跟外人嘀咕，快滚去备马。",
            "mood": "angry",
            "delayMs": 1912
          }
        ],
        "choices": null,
        "closingLines": [
          "矿场那晚响了七枪，黑蹄会从此散了。镇上的人只说，偷马贼里出了个告密的，死得不冤。",
          "没人给他立碑，风一吹，拴马桩旁只剩半截马刺。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    }
  },
  "life_debt": {
    "rescue": {
      "description": "土路边半人高的枯草里躺个男人，左肩枪眼正往外冒黑血，苍蝇围着他乱飞，靴底磨得露出脚趾。",
      "phoneInvite": "镇口铁匠铺的小子跑来说：“北边土路沟里有个生人快没气了，肩头吃枪子，我爹叫你赶紧去。”",
      "locateLabel": "北土路沟畔",
      "cutsceneTitle": "枪响之后",
      "cutscene": [
        "两记枪响过后，北边林子里的乌鸦全惊了起来，在天上旋了老半天。",
        "过路的人不敢近前，只远远瞧见那伤号的马跑了，鞍袋上系着半截银矿镐柄。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "中枪的男人",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "铁匠铺小子",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "他左肩中枪，血都发黑了，像是毒弹。",
            "mood": "scared",
            "delayMs": 2018
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "别动，我拿布条给你勒住伤口。",
            "mood": "scared",
            "delayMs": 2042
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "别管我，快往南追，黑蹄会的人刚过去。",
            "mood": "angry",
            "delayMs": 1603
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "小子，你救我，就沾上这趟浑水了。",
            "mood": "cold",
            "delayMs": 1856
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "去镇上找哈克大夫，我欠你条命。",
            "mood": "neutral",
            "delayMs": 1775
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "res_carry": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "别碰我……红隼帮不会放过你的。",
                "mood": "scared",
                "delayMs": 2131
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "他血都快流干了，快搭把手。",
                "mood": "angry",
                "delayMs": 1967
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "去镇上……找克劳迪娅大夫。",
                "mood": "sad",
                "delayMs": 1635
              }
            ],
            "lines": [
              "你一路小跑，把他送进了诊所的木板床上。",
              "大夫剪开血衣，说再晚一刻就难救了。"
            ],
            "fx": {
              "cash": 0,
              "honor": 12,
              "wanted": 0,
              "affection": 15,
              "trust": 15
            }
          },
          "res_patch": {
            "beats": [
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "我这儿有干净布条，先勒住伤口。",
                "mood": "neutral",
                "delayMs": 1662
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "轻点……你这混蛋，想疼死我吗。",
                "mood": "angry",
                "delayMs": 2017
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "别管他骂，勒紧能止血。",
                "mood": "smug",
                "delayMs": 1724
              }
            ],
            "lines": [
              "你用烧酒浇了伤口，草草包扎，止了血。",
              "血是不再涌了，可那子弹还深深嵌在肉里。"
            ],
            "fx": {
              "cash": 0,
              "honor": 8,
              "wanted": 0,
              "affection": 10,
              "trust": 10
            }
          },
          "res_search": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你……你这是要干什么？",
                "mood": "scared",
                "delayMs": 1779
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "他还没死，你别乱翻他口袋。",
                "mood": "angry",
                "delayMs": 1897
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "我兜里只有几块鹰洋，拿去……滚。",
                "mood": "cold",
                "delayMs": 2075
              }
            ],
            "lines": [
              "你从他怀里摸出几张皱巴巴的钞票。",
              "他冷冷瞪着你，那眼神比枪伤还要寒冷。"
            ],
            "fx": {
              "cash": 75,
              "honor": -12,
              "wanted": 0,
              "affection": -20,
              "trust": -25
            }
          }
        }
      },
      "indoor": false
    },
    "departure": {
      "description": "仓库角落的草铺空了，换下的血绷带扔在泥地上，半碗没喝完的汤药还冒着热气，门帘被风掀得一下下拍着。",
      "phoneInvite": "他走之前给看门的老头留话：“你去告诉救我的那位，后巷井台边有东西留给他，谢他这一条命。”",
      "locateLabel": "镇西仓库后巷",
      "cutsceneTitle": "不辞而别",
      "cutscene": [
        "连着三夜，他都在半夜摸到井台边洗伤口，把水槽里的水都染浑了。",
        "天不亮，他把一件破外套叠好搁在井沿上，就沿着矿渣路往南走了。",
        "等他走后，看门老头才发现他住过的草铺下压着两颗银矿子弹，像是留的买路钱。"
      ],
      "venueId": "store",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "看门老头",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你救的那人天没亮就溜了，拦都拦不住。",
            "mood": "sad",
            "delayMs": 1889
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "血绷带还在这儿，药都没喝完，准是怕连累你。",
            "mood": "neutral",
            "delayMs": 1759
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "他留了句话，说欠你的这条命，迟早还上。",
            "mood": "cold",
            "delayMs": 2104
          }
        ],
        "choices": [
          {
            "label": "追问那人去了哪儿"
          },
          {
            "label": "查看草铺和血绷带"
          },
          {
            "label": "端起那半碗汤药"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "后巷出去，往北边走了，别追了。",
                "mood": "cold",
                "delayMs": 2155
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你问这个做什么？莫管闲事。",
                "mood": "angry",
                "delayMs": 1679
              }
            ],
            "lines": [
              "你追问那人去了哪儿，老头只冷冷一指北边，再不肯多言。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": -5,
              "trust": -10
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "别碰那绷带，血还没干透。",
                "mood": "scared",
                "delayMs": 1894
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你眼尖，看出什么门道了？",
                "mood": "neutral",
                "delayMs": 1653
              }
            ],
            "lines": [
              "你俯身查看草铺与血绷带，发现绷带边角绣着红隼帮的记号。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": 5,
              "trust": 10
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "放下！那药是给伤员吊命的。",
                "mood": "angry",
                "delayMs": 1888
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你要想喝，自己去酒馆买去。",
                "mood": "cold",
                "delayMs": 1977
              }
            ],
            "lines": [
              "你端起药碗，老头一把夺了过去，汤药洒了一地，线索就此断了。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": -10,
              "trust": -5
            }
          }
        }
      },
      "indoor": true
    },
    "return": {
      "description": "酒馆里闷着一股汗味和劣质威士忌气，角桌边坐了个眼熟的汉子，右掌按着一把黄铜猎枪，朝门口抬了抬下巴。",
      "phoneInvite": "酒保擦着杯子凑过来：“那边角桌的先生请你过去，说欠你的药钱该结了。”",
      "locateLabel": "酒馆角落",
      "cutsceneTitle": "半月之后",
      "cutscene": [
        "半月过去，镇上的人差不多忘了那个从北边拖回来的生人。",
        "直到红隼帮的枪手在牌桌边围住你，枪管戳到后腰上，那角桌的汉子才慢慢站起来。",
        "他把猎枪往桌上一磕，满屋子的人就都听见了退膛的铜响，连风琴都停了。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "欠药钱的汉子",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "酒保",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "你欠的药钱再不给，我可要叫警长了。",
            "mood": "angry",
            "delayMs": 1725
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "朋友，你认得我，替我说句话，我不是赖账的人。",
            "mood": "sad",
            "delayMs": 1840
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "他上回的药还是你垫的钱，如今装不认得？",
            "mood": "cold",
            "delayMs": 1849
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你救过我，这恩情我记着，只是眼下实在拿不出。",
            "mood": "sad",
            "delayMs": 1647
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "accept_help": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "门口那俩小子盯你半天了。",
                "mood": "neutral",
                "delayMs": 2122
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "要动枪出去，别砸我桌子。",
                "mood": "scared",
                "delayMs": 2034
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "就借你后门用用。",
                "mood": "cold",
                "delayMs": 2176
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "跟紧我，从后巷绕。",
                "mood": "neutral",
                "delayMs": 1683
              }
            ],
            "lines": [
              "你跟着欠药钱的汉子从后门绕出，两枪托就撂倒了找事的枪手。",
              "他拍了拍你的肩，说这回算两清，往后有事还找他。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 10
            }
          },
          "decline": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "随你，别死在我眼前。",
                "mood": "cold",
                "delayMs": 1639
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "客官，可别在小店闹出人命。",
                "mood": "scared",
                "delayMs": 1733
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "给他再倒杯，壮壮胆。",
                "mood": "neutral",
                "delayMs": 1793
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "祝你好运。",
                "mood": "neutral",
                "delayMs": 2087
              }
            ],
            "lines": [
              "你独自走出酒馆，门口那两人立刻盯了上来，你只能拔枪硬拼。",
              "欠药钱的汉子在窗后看着，没有出手，摇了摇头。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 1,
              "affection": -5,
              "trust": -5
            }
          },
          "call_in_favor": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你还真会挑时候。",
                "mood": "smug",
                "delayMs": 1957
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "别闹大，警长常来。",
                "mood": "scared",
                "delayMs": 2116
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "行，但事成后你欠我双份。",
                "mood": "cold",
                "delayMs": 1948
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "你这是把我也拖下水。",
                "mood": "angry",
                "delayMs": 1776
              }
            ],
            "lines": [
              "你用迟到的救命之恩逼他出手，枪声惊动了半边镇子。",
              "事情虽了，你被警长盯上，汉子也与你疏远了几分。"
            ],
            "fx": {
              "cash": -50,
              "honor": -5,
              "wanted": 2,
              "affection": -5,
              "trust": -10
            }
          }
        }
      },
      "indoor": true
    },
    "ally": {
      "description": "酒馆角落的桌子旁，那个曾被你救下的人正低头擦着左轮，枪管在油灯下泛着冷光，身旁空着一张椅子。",
      "phoneInvite": "你来一趟酒馆，我在老位子给你留了杯黑麦酒。今晚风里带着铁锈味，你该听听昨晚北边的事。",
      "locateLabel": "酒馆角落",
      "cutsceneTitle": "数月之后",
      "cutscene": [
        "日子像骡子拉磨慢慢转，镇上的人渐渐知道，你身边多了个肯在枪口下替你挡子弹的人。",
        "每逢集市或矿场发薪的日子，那人总在你的桌角放一杯黑麦酒，什么也不多说。",
        "北边来的人说，红隼帮曾想找你麻烦，可那人在巷口一亮枪，对方就缩了回去。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "擦枪的人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来了，坐吧，这椅子给你留着。",
            "mood": "neutral",
            "delayMs": 2057
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "擦干净了，这枪还没沾过你的血。",
            "mood": "cold",
            "delayMs": 1751
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你救我的那次，我欠你一条命。",
            "mood": "sad",
            "delayMs": 1724
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "今晚过后，没人再敢找你麻烦。",
            "mood": "smug",
            "delayMs": 1683
          }
        ],
        "choices": null,
        "closingLines": [
          "后来他替你摆平了矿场的债，镇上人见了你都点头。",
          "再没人提起你救枪手的事，只当酒馆多了个朋友。"
        ],
        "choiceScenes": {}
      },
      "indoor": true
    }
  },
  "kin_revenge": {
    "discovery": {
      "description": "报纸摊在吧台上，油墨未干的讣告边角被一个陌生男人用拇指按住，他俯身问酒保：“那天矿场，谁在场？”",
      "phoneInvite": "酒保让打杂的带话给你：“有个生面孔攥着报纸在酒馆里转悠，逢人就问矿场那晚谁在场，你最好来一趟。”",
      "locateLabel": "酒馆吧台前",
      "cutsceneTitle": "数日之后",
      "cutscene": [
        "讣告在镇上公报夹缝里登了三天，起初没人留意，直到那个男人牵着马进了镇子。",
        "他住进旅店阁楼，天亮前就坐在酒馆角落，眼睛盯着每一个推门进来的人。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "生面孔外乡人",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "吧台后的酒保",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "别在吧台提矿场，那事儿不吉利。",
            "mood": "scared",
            "delayMs": 1739
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "讣告油墨未干，你倒先闭了嘴。",
            "mood": "cold",
            "delayMs": 1627
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "我只是个卖酒的，那天我没下矿。",
            "mood": "scared",
            "delayMs": 1728
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "朋友，你在这镇上待多久了？矿场出事那晚，你见过谁？",
            "mood": "cold",
            "delayMs": 1982
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "别答 {lead}，这人来路不明，当心沾上血。",
            "mood": "scared",
            "delayMs": 1982
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "dis_listen": {
            "beats": [
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "那天矿场早散工了，就几个夜班工头在。",
                "mood": "neutral",
                "delayMs": 1636
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "那几个工头，眼下还在镇上么？",
                "mood": "cold",
                "delayMs": 1823
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "这我可不清楚，您去矿上问问吧。",
                "mood": "scared",
                "delayMs": 1849
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你站那儿听了半晌，想打听什么？",
                "mood": "cold",
                "delayMs": 2067
              }
            ],
            "lines": [
              "你缩在角落，只听见断续的问答和酒杯磕碰声。",
              "那外乡人问完便走，你什么也没落着。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": 0,
              "trust": -5
            }
          },
          "dis_talk": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你也在打听矿场的事？",
                "mood": "neutral",
                "delayMs": 1787
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "别多嘴，外乡人。",
                "mood": "scared",
                "delayMs": 1669
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "让他说，他兴许知道些什么。",
                "mood": "cold",
                "delayMs": 1984
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "那晚的事，你看见了什么？",
                "mood": "neutral",
                "delayMs": 1761
              }
            ],
            "lines": [
              "你凑近吧台，把听来的消息挑了几句告诉他。",
              "他给你塞了几个银元，转身出了酒馆。"
            ],
            "fx": {
              "cash": 20,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 10
            }
          },
          "dis_mislead": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "听说你在矿场待过？",
                "mood": "neutral",
                "delayMs": 1826
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "你可别胡说八道。",
                "mood": "scared",
                "delayMs": 1822
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你告诉我那晚谁在，我给你酬劳。",
                "mood": "smug",
                "delayMs": 1713
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "闭嘴，让他说。",
                "mood": "cold",
                "delayMs": 1958
              }
            ],
            "lines": [
              "你随口编了个人名，把那外乡人引去了西边废矿。",
              "酒保看着你，叹了口气，别过脸去。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 0,
              "affection": -10,
              "trust": -15
            }
          }
        }
      },
      "indoor": true
    },
    "investigation": {
      "description": "警长办公室的桌上摊开一叠矿区出勤簿，那个男人用指节一行行划过名字，警长叼着烟靠在枪柜边。",
      "phoneInvite": "警长让马夫捎话：“那个外乡人在我这儿翻旧账，嘴里一直念叨你常去的地方，你过来看看。”",
      "locateLabel": "警长办公室",
      "cutsceneTitle": "查旧账",
      "cutscene": [
        "那人把酒馆问了个遍，又去矿场找到工头要了那晚的矿工名册。",
        "警长找他谈过，他却只问一句：那天谁开的枪，子弹从哪个方向来。"
      ],
      "venueId": "sheriff",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "翻名册的外乡人",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "枪柜边的警长",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "你翻这些名册是想找谁算账",
            "mood": "cold",
            "delayMs": 1740
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "杀我弟弟的凶手就在这矿上你为何不查",
            "mood": "angry",
            "delayMs": 1676
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "他拿不出证据我不能让他动镇上的人",
            "mood": "neutral",
            "delayMs": 2170
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来得正好这警长不肯替我出头",
            "mood": "sad",
            "delayMs": 2012
          }
        ],
        "choices": [
          {
            "label": "质问警长为何包庇"
          },
          {
            "label": "劝外乡人先冷静"
          },
          {
            "label": "接过名册自己查"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "小点声，别在我这撒野。",
                "mood": "cold",
                "delayMs": 2012
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "老兄，你替我说话，我记着。",
                "mood": "happy",
                "delayMs": 1902
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "管好你的人，不然一起关。",
                "mood": "angry",
                "delayMs": 1990
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "警长，你包庇黑蹄会不是一天了。",
                "mood": "angry",
                "delayMs": 2032
              }
            ],
            "lines": [
              "你当众责问警长，他眼神阴冷了下去。",
              "这梁子算是结下了，往后的路不好走。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 1,
              "affection": 10,
              "trust": 10
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "冷静？我兄弟的命没了！",
                "mood": "angry",
                "delayMs": 1945
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "劝得好，这小子就是头犟牛。",
                "mood": "smug",
                "delayMs": 1890
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "你闭嘴，今天非查个明白。",
                "mood": "angry",
                "delayMs": 1873
              }
            ],
            "lines": [
              "你按住外乡人的肩膀，他冷冷甩开了你。",
              "好心劝架，却落得个两头不讨好的名声。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": -5,
              "trust": -5
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你眼睛利，帮着看看。",
                "mood": "neutral",
                "delayMs": 1952
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "别乱碰，那是我镇上的账。",
                "mood": "cold",
                "delayMs": 1665
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "他看两眼能怎么着？",
                "mood": "angry",
                "delayMs": 2001
              }
            ],
            "lines": [
              "你一行行比对出勤簿，发现几处涂改。",
              "警长把烟头一扔，慢慢地坐直了身子。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 15
            }
          }
        }
      },
      "indoor": true
    },
    "revenge_act": {
      "description": "酒馆里的谈话声忽然低下去，那个男人立在吧台前，右手垂在枪柄上，眼睛盯着门，灯影摇晃。",
      "phoneInvite": "红隼帮的小子跑来说：“那外乡人把你的名字刻在吧台上了，说等你日落前到酒馆算账。”",
      "locateLabel": "酒馆门前",
      "cutsceneTitle": "那一夜",
      "cutscene": [
        "他买通了一个红隼帮的小子，打听到你日落前会去酒馆。",
        "酒馆老板把猎枪藏到柜台下，让女仆和弹琴的都提前回家了。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "持枪等待的外乡人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来得不是时候，外乡人。",
            "mood": "cold",
            "delayMs": 2135
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "今晚这扇门后，会躺下一个仇人。",
            "mood": "angry",
            "delayMs": 2139
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "要命就站到墙边，别出声。",
            "mood": "cold",
            "delayMs": 2078
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "confess": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "原来是你干的，我找了你很久。",
                "mood": "angry",
                "delayMs": 1887
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "今晚你别想走出这扇门。",
                "mood": "cold",
                "delayMs": 1690
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你欠的血债，该还了。",
                "mood": "angry",
                "delayMs": 1733
              }
            ],
            "lines": [
              "你承认了罪行，他的左轮枪口抵住了你的前额。",
              "酒馆里没人敢动，只有吊灯在轻轻摇晃。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 2,
              "affection": -20,
              "trust": -15
            }
          },
          "compensate": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你想用几个钱打发我？",
                "mood": "cold",
                "delayMs": 2011
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你的钱沾着血，我不稀罕。",
                "mood": "angry",
                "delayMs": 1885
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "滚出这个镇子，别让我再见到你。",
                "mood": "angry",
                "delayMs": 1795
              }
            ],
            "lines": [
              "你把钱袋推过去，他一脚踢开，银币滚了一地。",
              "你灰溜溜地出了门，身后只留下酒馆里的哄笑声。"
            ],
            "fx": {
              "cash": -80,
              "honor": -5,
              "wanted": 0,
              "affection": -10,
              "trust": -10
            }
          },
          "blame_others": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你说谁？那个红隼帮的？",
                "mood": "neutral",
                "delayMs": 2124
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "想拿我当枪使，你还不够格。",
                "mood": "cold",
                "delayMs": 1990
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "拿证据来，否则我当你撒谎。",
                "mood": "angry",
                "delayMs": 1849
              }
            ],
            "lines": [
              "你的谎话让他迟疑了一瞬，但枪柄仍没松开。",
              "他在心里记下了那个名字，却也对你起了疑心。"
            ],
            "fx": {
              "cash": 0,
              "honor": -8,
              "wanted": 0,
              "affection": -5,
              "trust": -15
            }
          },
          "eliminate": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你这是在找死，小子。",
                "mood": "angry",
                "delayMs": 1807
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "看来你选错了路，小子。",
                "mood": "cold",
                "delayMs": 1879
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "今晚你得死在这儿，朋友。",
                "mood": "angry",
                "delayMs": 2001
              }
            ],
            "lines": [
              "你的手刚摸到枪柄，他的子弹已打穿了你的右肩。",
              "你倒在血泊里，酒馆的灯影染成了红色。"
            ],
            "fx": {
              "cash": 0,
              "honor": -15,
              "wanted": 3,
              "affection": -25,
              "trust": -25
            }
          }
        }
      },
      "indoor": true
    },
    "resolution": {
      "description": "你推门进去，警长正把一支刻了字的左轮锁进抽屉，桌上摊着几张通缉令，油灯把影子钉在墙上。",
      "phoneInvite": "来我办公室一趟，这儿有件东西你非得亲眼看看，别耽误，我等你。",
      "locateLabel": "警长办公室",
      "cutsceneTitle": "尘埃落定",
      "cutscene": [
        "镇上的人不再议论那晚的酒馆枪声，只偶尔在月光下听见马蹄踏过碎石。",
        "复仇者的通缉令在布告栏上被风撕去半边，再也没有人补上。"
      ],
      "venueId": "sheriff",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "锁起左轮的警长",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "这枪上的字，是你父亲的名字。",
            "mood": "cold",
            "delayMs": 1741
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "凶手已经死在银矿底下了，案子到此为止。",
            "mood": "cold",
            "delayMs": 2107
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "通缉令我烧了，你走吧。",
            "mood": "neutral",
            "delayMs": 1904
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "镇上不会有人再提起今晚。",
            "mood": "cold",
            "delayMs": 1791
          }
        ],
        "choices": null,
        "closingLines": [
          "天亮时，警长把刻字左轮锁进铁柜，仿佛从未见过。",
          "镇上的人只说矿场又塌了一块，没人追问那支枪的下落。"
        ],
        "choiceScenes": {}
      },
      "indoor": true
    }
  },
  "missing_member": {
    "reported_missing": {
      "description": "副手站在驻地门口，手里捏着那顶沾了泥的旧帽子，眼睛盯着北边灰扑扑的小路。",
      "phoneInvite": "副手捎话：你来驻地一趟，乔伊的帽子丢在路口，人一夜没回。捎话的半大孩子跑得直喘。",
      "locateLabel": "驻地门廊",
      "cutsceneTitle": "一夜未归",
      "cutscene": [
        "太阳从矿场后头升到头顶，又慢慢往山背后沉下去。",
        "镇上的人看见红隼帮驻地门口一直有人站着，地上丢着半截抽剩的烟。",
        "乔伊没回来，野狗把路口那摊蹄印舔得干干净净。"
      ],
      "venueId": "hq",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "驻地门口的副手",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "比尔他们还没回来，怕是出事了。",
            "mood": "sad",
            "delayMs": 2135
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "这帽子是在北边岔路口捡到的，全是泥。",
            "mood": "scared",
            "delayMs": 2123
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "派去的人一个都没影，准是碰上麻烦了。",
            "mood": "angry",
            "delayMs": 1845
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我得去趟北边，你愿不愿搭把手？",
            "mood": "neutral",
            "delayMs": 1986
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "miss_ask": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "最后见他是在北边矿场外头，他说去给马找点水。",
                "mood": "neutral",
                "delayMs": 1688
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "那地方常有落石，我早该拦着他。",
                "mood": "sad",
                "delayMs": 1701
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "去矿场北边溪沟问问，兴许有人见过。",
                "mood": "cold",
                "delayMs": 1647
              }
            ],
            "lines": [
              "你问清了最后行踪，带着人手直奔溪沟，总算寻到半截断掉的缰绳。"
            ],
            "fx": {
              "cash": 0,
              "honor": 2,
              "wanted": 0,
              "affection": 3,
              "trust": 8
            }
          },
          "miss_search": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "别慌，我这就把矿场的弟兄都叫上。",
                "mood": "angry",
                "delayMs": 1736
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "黑蹄会最近在北边转悠，怕是他撞上了。",
                "mood": "scared",
                "delayMs": 1635
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "带上枪，老杰克的马快，让他走前头。",
                "mood": "cold",
                "delayMs": 1618
              }
            ],
            "lines": [
              "你们沿着北边小路追出老远，只找到一顶被撕破的旧帽子，人却不见。"
            ],
            "fx": {
              "cash": -30,
              "honor": 5,
              "wanted": 0,
              "affection": 8,
              "trust": 10
            }
          },
          "miss_wait": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "他前些天也醉倒在酒馆后头，天亮自己就回来了。",
                "mood": "smug",
                "delayMs": 1706
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "北边刮了一整天风，这会儿出门也是白搭。",
                "mood": "neutral",
                "delayMs": 2136
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "再等一晚，省得弟兄们夜里踩了兽夹。",
                "mood": "cold",
                "delayMs": 1801
              }
            ],
            "lines": [
              "你按下没动，第二天清晨人们发现他倒毙在北边三里外的沟里，身子都硬了。"
            ],
            "fx": {
              "cash": 0,
              "honor": -8,
              "wanted": 0,
              "affection": -10,
              "trust": -12
            }
          }
        }
      },
      "indoor": false
    },
    "contradictory_clues": {
      "description": "比利蹲在酒馆后巷的烂泥里拨弄半截缰绳，科尔靠墙用刀尖划着砖缝，两人谁也不看谁。",
      "phoneInvite": "头儿，来马厩后头，比利和科尔都要动刀了，说昨晚上看见的不是同一拨人。",
      "locateLabel": "马厩后巷",
      "cutsceneTitle": "口供相左",
      "cutscene": [
        "问话拖到晌午，围过来看热闹的帮众聚了十几号人。",
        "有人给马槽添水，眼睛却总往这边溜，连水瓢都举在半空没放下。",
        "吧女把后门推开条缝，又轻轻关上，只漏出一股酸酒味。"
      ],
      "venueId": "saloon_back",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "酒馆后巷的比利",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "靠墙划砖缝的科尔",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "你来得正好，看看{lead}干的好事。",
            "mood": "cold",
            "delayMs": 1959
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "少说风凉话，{extra0_0}，那批货丢了我也急。",
            "mood": "angry",
            "delayMs": 1882
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "急？失踪的是我兄弟，不是你。",
            "mood": "cold",
            "delayMs": 1999
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你面生，帮我打听下黑蹄会的动静。",
            "mood": "scared",
            "delayMs": 1702
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "别信他，他能把你卖到矿场。",
            "mood": "smug",
            "delayMs": 1618
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我欠你个人情，找到人之前别走。",
            "mood": "sad",
            "delayMs": 2039
          }
        ],
        "choices": [
          {
            "label": "先问清失踪经过"
          },
          {
            "label": "答应帮忙找线人"
          },
          {
            "label": "觉得其中有蹊跷"
          }
        ],
        "closingLines": null,
        "choiceScenes": {
          "gen0": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你想先听经过？行，我说。",
                "mood": "neutral",
                "delayMs": 2006
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "三天前他替帮里送信，再没回来。",
                "mood": "sad",
                "delayMs": 1779
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "就送到北边矿场，线人也没露面。",
                "mood": "cold",
                "delayMs": 2043
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "{extra0_0}，少提矿场的事。",
                "mood": "angry",
                "delayMs": 2022
              }
            ],
            "lines": [
              "你沉住气问清前后，两人终于吐露了部分实情。",
              "但线人始终没消息，线索断在矿场入口。"
            ],
            "fx": {
              "cash": 0,
              "honor": 1,
              "wanted": 0,
              "affection": 3,
              "trust": 5
            }
          },
          "gen1": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "够意思，我这就给你备马。",
                "mood": "happy",
                "delayMs": 1860
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "别信矿场那帮人，眼神别软。",
                "mood": "cold",
                "delayMs": 1843
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "你别老吓唬他，{extra0_0}。",
                "mood": "neutral",
                "delayMs": 1831
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "我这是教他保命的法子。",
                "mood": "smug",
                "delayMs": 1920
              }
            ],
            "lines": [
              "你一口应下，牵马出了镇子，直奔矿场而去。",
              "身后巷子里，科尔冷冷补了句：别死在外头。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 6,
              "trust": 8
            }
          },
          "gen2": {
            "beats": [
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "蹊跷？你怀疑我们哥俩？",
                "mood": "angry",
                "delayMs": 1911
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "{extra0_0}，收刀。让他把话说完。",
                "mood": "cold",
                "delayMs": 2124
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你倒是说说，哪儿不对？",
                "mood": "smug",
                "delayMs": 2059
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "我看他就是不想沾这事。",
                "mood": "angry",
                "delayMs": 1967
              }
            ],
            "lines": [
              "你当面质疑，比利的笑容慢慢冷了下去。",
              "科尔别过脸，不再搭理你，巷子里只剩雨声。"
            ],
            "fx": {
              "cash": 0,
              "honor": -2,
              "wanted": 0,
              "affection": -5,
              "trust": -10
            }
          }
        }
      },
      "indoor": false
    },
    "decision": {
      "description": "油灯把一圈人脸照得发黄，副手把乔伊那顶帽子平放在木桌上，七八双眼睛都望向门口。",
      "phoneInvite": "头儿，人都到齐了，屋里的油灯都点上了，就等你一句话。乔伊的帽子还搁在桌上。",
      "locateLabel": "驻地议事厅",
      "cutsceneTitle": "定夺之前",
      "cutscene": [
        "消息从酒馆传到集市，说红隼帮今晚要定乔伊的生死。",
        "银矿的几个矿工提前收了工，蹲在路边一边嚼烟叶一边朝这边望。",
        "教堂钟敲过九下，镇上还有人没睡，全在等那扇门开。"
      ],
      "venueId": "hq",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "主持局面的副手",
        "leadGang": null,
        "extras": [
          {
            "n": 3,
            "hint": "屋里的帮派成员",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "extra0_1",
            "text": "乔伊那顶帽子都搁桌上了，人还能回来？",
            "mood": "scared",
            "delayMs": 1600
          },
          {
            "speaker": "extra0_1",
            "to": "extra0_0",
            "text": "矿场那地方，银矿兄弟会可没少杀人。",
            "mood": "angry",
            "delayMs": 1722
          },
          {
            "speaker": "extra0_2",
            "to": "lead",
            "text": "{lead}，你不能再让大家傻等了。",
            "mood": "cold",
            "delayMs": 1744
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你昨儿在酒馆见过乔伊，把实情说出来。",
            "mood": "cold",
            "delayMs": 2197
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "search_personally": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "我跟你去，把乔伊带回来。",
                "mood": "neutral",
                "delayMs": 1616
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "外头有埋伏，你去了也危险。",
                "mood": "scared",
                "delayMs": 1999
              },
              {
                "speaker": "extra0_1",
                "to": "lead",
                "text": "我备马，天亮前动身。",
                "mood": "happy",
                "delayMs": 2133
              },
              {
                "speaker": "extra0_2",
                "to": "player",
                "text": "多带点人去，别落单。",
                "mood": "cold",
                "delayMs": 1651
              }
            ],
            "lines": [
              "你带着人手追进北边荒路，马灯照亮了乔伊的血迹。",
              "最终在河滩边找到受伤的乔伊，他朝你点了点头。"
            ],
            "fx": {
              "cash": -30,
              "honor": 8,
              "wanted": 0,
              "affection": 10,
              "trust": 12
            }
          },
          "send_team": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "我再挑几个好手，让他们去。",
                "mood": "cold",
                "delayMs": 1698
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "上回派去的人还没回来，还派？",
                "mood": "scared",
                "delayMs": 2118
              },
              {
                "speaker": "extra0_1",
                "to": "player",
                "text": "要去你去，我不去送死。",
                "mood": "angry",
                "delayMs": 2161
              },
              {
                "speaker": "extra0_2",
                "to": "lead",
                "text": "多给点枪，兴许能成。",
                "mood": "neutral",
                "delayMs": 1866
              }
            ],
            "lines": [
              "你派出第二队，两天后只回来一个满身血的人报信。",
              "乔伊仍无音讯，众人看你的眼神越来越冷，没人再听你调派。"
            ],
            "fx": {
              "cash": -50,
              "honor": -5,
              "wanted": 0,
              "affection": -8,
              "trust": -10
            }
          },
          "pay_ransom": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "他们要多少？给钱就能放人？",
                "mood": "cold",
                "delayMs": 1939
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "咱们哪来这么多现钱？矿上还没结账。",
                "mood": "sad",
                "delayMs": 2086
              },
              {
                "speaker": "extra0_1",
                "to": "player",
                "text": "给了钱他们也不一定守信用。",
                "mood": "scared",
                "delayMs": 1967
              },
              {
                "speaker": "extra0_2",
                "to": "lead",
                "text": "把钱给我，我去交赎。",
                "mood": "smug",
                "delayMs": 2055
              }
            ],
            "lines": [
              "你凑了钱交给中间人，乔伊被抬回来，但已没气。",
              "众人骂你害了弟兄，几个老成员摔门出了议事厅。"
            ],
            "fx": {
              "cash": -80,
              "honor": -10,
              "wanted": 0,
              "affection": -15,
              "trust": -20
            }
          },
          "abandon_them": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "外头风声紧，不能再赔进人手了。",
                "mood": "cold",
                "delayMs": 2129
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "乔伊替我们挡过枪，你就这么放？",
                "mood": "angry",
                "delayMs": 1821
              },
              {
                "speaker": "extra0_1",
                "to": "player",
                "text": "要放弃你放弃，我和老黑去寻。",
                "mood": "angry",
                "delayMs": 2113
              },
              {
                "speaker": "extra0_2",
                "to": "player",
                "text": "散了吧，活着的人还得吃饭。",
                "mood": "sad",
                "delayMs": 1829
              }
            ],
            "lines": [
              "你封住了消息，乔伊再也没能回到营地，成了悬案。",
              "夜里有人在你门前放了朵白花，那是给死人的记号。"
            ],
            "fx": {
              "cash": 0,
              "honor": -15,
              "wanted": 0,
              "affection": -25,
              "trust": -25
            }
          }
        }
      },
      "indoor": true
    },
    "rescued": {
      "description": "尘烟里，两个弟兄架着失踪的家伙从矿洞口走出来，他左肩缠着脏绷带，嘴唇干裂，那顶帽子终于回到他手里。",
      "phoneInvite": "我们找着他了，人在老矿道里，还喘着气。你来一趟，他嘴里一直念叨着要见你。",
      "locateLabel": "废矿坑口",
      "cutsceneTitle": "烟尘落定",
      "cutscene": [
        "消息传回镇上，酒馆里那几天总有人举杯朝你点头。",
        "那顶帽子被重新挂在驻地门口，风吹过时帽檐轻轻晃。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "获救的失踪者乔伊",
        "leadGang": null,
        "extras": [
          {
            "n": 2,
            "hint": "架着他的弟兄",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "{lead}还活着，可这条胳膊怕是要废了。",
            "mood": "scared",
            "delayMs": 2182
          },
          {
            "speaker": "extra0_1",
            "to": "player",
            "text": "别站着，去叫辆马车来，{lead}撑不久。",
            "mood": "angry",
            "delayMs": 2109
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "帽子拿回来了，可跟我下矿的弟兄全折了。",
            "mood": "sad",
            "delayMs": 1606
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "扶我去教堂，我不能让他们的名字白费。",
            "mood": "sad",
            "delayMs": 2171
          }
        ],
        "choices": null,
        "closingLines": [
          "后来乔伊在诊所躺了半个月，左臂虽保住了，却再也举不起镐头。",
          "镇上的人都说，那笔派遣债，迟早要血来偿。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "ransomed": {
      "description": "河风里，银矿兄弟会的人接过钱袋掂了掂，然后松开绳结，失踪的弟兄踉跄着朝这边走来，脸上带着淤青。",
      "phoneInvite": "那边放话了，天亮前把钱带到镇北石桥，他们就把人活着交出来。你来一趟，别带太多人。",
      "locateLabel": "镇北石桥",
      "cutsceneTitle": "赎金之夜",
      "cutscene": [
        "第二天，镇上都在传红隼帮花了钱赎人，说那笔钱够买三匹好马。",
        "驻地里没人多提这事，但弟兄们看你时眼神里多了点东西。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "银矿兄弟会接头人",
        "leadGang": "银矿兄弟会",
        "extras": [
          {
            "n": 1,
            "hint": "被绑票的弟兄",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "你给了钱？这帮混蛋差点把我活埋！",
            "mood": "angry",
            "delayMs": 1982
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "少废话，留你条命已是开恩。",
            "mood": "cold",
            "delayMs": 1937
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "钱袋分量不错，人你带走，银矿兄弟会不欠你的。",
            "mood": "neutral",
            "delayMs": 2029
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "对不住，我不该独自去矿场。",
            "mood": "sad",
            "delayMs": 2012
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "往后你的人再进矿场，可没这价了。",
            "mood": "cold",
            "delayMs": 2124
          }
        ],
        "choices": null,
        "closingLines": [
          "银矿兄弟会收了钱，没再为难人，那弟兄养了半个月伤。",
          "镇上人都说，那笔钱买回条命，算不得亏，但矿场更没人敢去了。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "abandoned": {
      "description": "夜风里，驻地门口那顶帽子还挂在木桩上，几个弟兄坐在台阶上，没人说话，烟卷头的红光一明一灭。",
      "phoneInvite": "弟兄们都在驻地门口坐着，没人说话。你过来一趟，他的帽子还挂在那儿，风一吹就晃。",
      "locateLabel": "驻地门前",
      "cutsceneTitle": "数日之后",
      "cutscene": [
        "接下来的几天，驻地里少了往日的动静，有人开始收拾铺盖悄悄离开。",
        "酒馆里再没人提起那个失踪的名字，好像他从没来过。"
      ],
      "venueId": "hq",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "驻地门口抽烟的弟兄",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "坐在台阶上的弟兄",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "他走前把帽子挂这儿，说回来再取。",
            "mood": "sad",
            "delayMs": 1912
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "派去寻他的人，只在河边找到靴子和血。",
            "mood": "cold",
            "delayMs": 2012
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "银矿兄弟会那帮杂种，早盯上咱的运金路线了。",
            "mood": "angry",
            "delayMs": 2070
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来评评，这桩人命债，我该不该去讨？",
            "mood": "cold",
            "delayMs": 1942
          }
        ],
        "choices": null,
        "closingLines": [
          "三日后，红隼帮的人马踏进银矿镇，逼得对方交出了凶手。",
          "那顶帽子一直挂在木桩上，过路人都知道那里出过人命。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    }
  },
  "market_scale": {
    "rumor": {
      "description": "镇广场上尘土飞扬，几个妇人围住面粉摊，红脸汉子拍着秤盘嚷吞了斤两，老米洛摊开沾满白面的手直摇头。",
      "phoneInvite": "镇上人都在说老米洛的秤吞斤两，他蹲在摊子后头抹眼泪，让我捎话请你去广场一趟，说有人要掀他面粉袋。",
      "locateLabel": "镇中广场",
      "cutsceneTitle": "集市闲话",
      "cutscene": [
        "那天日头偏西时，缺斤少两的闲话已经传遍每间铺子和矿工棚屋。",
        "老米洛的面粉摊前再没人停下，连野狗都绕着他空荡荡的摊位走。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "面粉摊主被指吞斤两",
        "leadGang": null,
        "extras": [
          {
            "n": 2,
            "hint": "围住面粉摊的妇人",
            "female": true,
            "gang": null
          },
          {
            "n": 1,
            "hint": "拍秤盘嚷吞斤两的红脸汉子",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra1_0",
            "to": "lead",
            "text": "你这秤砣底下垫了铅块，还装清白？",
            "mood": "angry",
            "delayMs": 1663
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "上回买十斤面，回家一称缺三斤。",
            "mood": "angry",
            "delayMs": 1651
          },
          {
            "speaker": "extra0_1",
            "to": "lead",
            "text": "{lead}，你当街吞秤，坑苦了我们。",
            "mood": "angry",
            "delayMs": 1767
          },
          {
            "speaker": "lead",
            "to": "extra1_0",
            "text": "{extra1_0}，你这血口喷人，我的秤从没动过手脚。",
            "mood": "scared",
            "delayMs": 2010
          },
          {
            "speaker": "extra1_0",
            "to": "player",
            "text": "你瞧瞧，{lead}这心虚样，还敢抵赖？",
            "mood": "angry",
            "delayMs": 2182
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你可得替我说句公道话，我真没坑人。",
            "mood": "sad",
            "delayMs": 1873
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "rumor_look": {
            "beats": [
              {
                "speaker": "extra1_0",
                "to": "player",
                "text": "你可别信{lead}，这秤盘下藏着沙。",
                "mood": "angry",
                "delayMs": 2189
              },
              {
                "speaker": "lead",
                "to": "extra1_0",
                "text": "我老米洛卖面三十年，从没坑过人。",
                "mood": "sad",
                "delayMs": 2111
              },
              {
                "speaker": "extra0_0",
                "to": "extra0_1",
                "text": "这老米洛看着老实，怕有误会。",
                "mood": "neutral",
                "delayMs": 1757
              },
              {
                "speaker": "extra0_1",
                "to": "extra0_0",
                "text": "问问也好，别冤枉了人。",
                "mood": "neutral",
                "delayMs": 1986
              }
            ],
            "lines": [
              "你上前问明，发现秤盘下有块小石子，是孩子顽皮塞的。",
              "误会解开，众人散去，老米洛拍着你的肩道谢。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 5
            }
          },
          "rumor_skip": {
            "beats": [
              {
                "speaker": "extra1_0",
                "to": "lead",
                "text": "你今儿不给个说法，这摊子别想收！",
                "mood": "angry",
                "delayMs": 1785
              },
              {
                "speaker": "lead",
                "to": "extra1_0",
                "text": "要多少你说，别砸我饭碗。",
                "mood": "sad",
                "delayMs": 2152
              },
              {
                "speaker": "extra0_0",
                "to": "extra0_1",
                "text": "这人真是，眼看老汉被欺。",
                "mood": "cold",
                "delayMs": 2136
              },
              {
                "speaker": "extra0_1",
                "to": "player",
                "text": "你走开，没人管得了。",
                "mood": "cold",
                "delayMs": 2095
              }
            ],
            "lines": [
              "你转身离开，身后争吵越来越凶，老米洛赔了半袋面粉。",
              "从此你在集市上再难买到公道价，摊主们见你就躲。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 0,
              "affection": -8,
              "trust": -5
            }
          }
        }
      },
      "indoor": false
    },
    "inspect": {
      "description": "酒馆后巷油灯昏黄，老米洛把秤平放在酒桶上，砝码盒半开，几只飞蛾绕着灯罩打转，黄铜秤盘反着冷光。",
      "phoneInvite": "老米洛把秤搬到酒馆后头了，说砝码摸着比平时轻，不敢再摆摊。他让我捎话，请你去瞧瞧那杆秤。我在酒馆门口等你。",
      "locateLabel": "酒馆后巷",
      "cutsceneTitle": "秤砣疑云",
      "cutscene": [
        "那杆秤在酒馆后头的油灯下摆了一夜，露水凝在秤盘上。",
        "第二天清早，老米洛发现砝码盒的扣子被人掰开了，他更不敢去集市。"
      ],
      "venueId": "saloon_back",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "在酒馆后巷等你看秤的老米洛",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你总算来了，看看这秤砣，叫人调了包。",
            "mood": "angry",
            "delayMs": 2125
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "集市上那帮人非说我缺斤短两。",
            "mood": "angry",
            "delayMs": 2160
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "这黄铜秤盘我用了十年，从没出过岔子。",
            "mood": "sad",
            "delayMs": 2064
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你帮我盯着点，我得找出是谁下的黑手。",
            "mood": "cold",
            "delayMs": 1809
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "expose": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你当真要在集市上揭他？",
                "mood": "scared",
                "delayMs": 1870
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "那帮人可不是善茬，后巷都听得见。",
                "mood": "cold",
                "delayMs": 1951
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "秤砣我给你校好了，话你自己去说。",
                "mood": "neutral",
                "delayMs": 1959
              }
            ],
            "lines": [
              "你当众拆穿了黑心商贩，围观的人替你不平。",
              "虽然得罪了人，但镇上提起你多了几分敬意。"
            ],
            "fx": {
              "cash": 0,
              "honor": 12,
              "wanted": 0,
              "affection": 15,
              "trust": 10
            }
          },
          "quiet": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "要我说，别在集市上闹。",
                "mood": "neutral",
                "delayMs": 2064
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你把这秤还给他，让他知趣收手。",
                "mood": "smug",
                "delayMs": 2083
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "后巷说话，比当街撕破脸强。",
                "mood": "cold",
                "delayMs": 1952
              }
            ],
            "lines": [
              "你托人私下递了话，那商贩悄悄补了亏空。",
              "事情没闹大，你也落了个明白人的名声。"
            ],
            "fx": {
              "cash": 20,
              "honor": 5,
              "wanted": 0,
              "affection": 10,
              "trust": 15
            }
          },
          "walk_away": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你当真不追了？",
                "mood": "sad",
                "delayMs": 1933
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "这秤我帮你收着，回头再取吧。",
                "mood": "cold",
                "delayMs": 2002
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "少管一桩事，也少一桩债。",
                "mood": "sad",
                "delayMs": 1715
              }
            ],
            "lines": [
              "你把秤留在后巷，转身离开了是非。",
              "那商贩继续做他的买卖，没人再提缺斤少两。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 0,
              "affection": -15,
              "trust": -10
            }
          }
        }
      },
      "indoor": false
    },
    "cleared": {
      "description": "正午阳光下，老米洛把砝码一枚枚码在案板上，那杆秤的指针稳稳停住，他抬起袖口擦擦眼角，几个妇人提着空篮子围过来。",
      "phoneInvite": "老米洛的秤清白了，他让我来请你，说要在集上给你鞠个躬。他的摊子又支起来了，还多挂了一串红辣椒。你来一趟吧。",
      "locateLabel": "集市老摊",
      "cutsceneTitle": "水落石出",
      "cutscene": [
        "那杆被洗清冤屈的秤重新挂回摊前，秤钩上的铜锈被磨得发亮。",
        "之后几天，镇上的妇人们又肯在老米洛的摊子前停下脚步，连警长都来称了一袋豆子。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "洗清冤屈的老米洛",
        "leadGang": null,
        "extras": [
          {
            "n": 3,
            "hint": "提空篮子围过来的妇人",
            "female": true,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "米洛，这回你可得把秤给我看仔细了。",
            "mood": "angry",
            "delayMs": 1706
          },
          {
            "speaker": "extra0_1",
            "to": "extra0_0",
            "text": "上回那半磅肉，你可还没赔我。",
            "mood": "cold",
            "delayMs": 2196
          },
          {
            "speaker": "extra0_2",
            "to": "lead",
            "text": "先别急，让他把砝码摆完再说。",
            "mood": "neutral",
            "delayMs": 1891
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来得正好，看看这秤针停得稳不稳。",
            "mood": "sad",
            "delayMs": 1706
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我老米洛在集市卖了二十年货，从没亏过谁。",
            "mood": "neutral",
            "delayMs": 2099
          }
        ],
        "choices": null,
        "closingLines": [
          "打那以后，再没人说米洛的秤短斤缺两，他的摊前又排起了长队。",
          "镇上的人都道，老米洛那杆秤，比教堂的钟还准。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "faded": {
      "description": "斜阳下，集市的烂泥地泛着亮，老亨利摊前没人围看，那杆秤挂在木柱上，秤钩空荡荡地晃。",
      "phoneInvite": "你抽空来趟老亨利的摊子，他煮了锅豆子等你，镇上再没人嘀咕那杆秤了。",
      "locateLabel": "老亨利摊前",
      "cutsceneTitle": "风波平息",
      "cutscene": [
        "又过了三日，集市上再没人围住那杆秤指指点点。",
        "老亨利照旧出摊，只是秤盘里总搁着几颗干豆子，像是给自己提个醒。",
        "风卷着尘土从摊前滚过，缺斤少两的话头再没被人捡起来。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "煮豆子等你的老亨利",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "豆子还热乎，你来得正是时候。",
            "mood": "neutral",
            "delayMs": 1918
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "那帮人再没来掀我的摊子。",
            "mood": "happy",
            "delayMs": 2155
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "镇上人如今见了我的秤，都点头了。",
            "mood": "smug",
            "delayMs": 1681
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "往后这集市，能干净些了。",
            "mood": "neutral",
            "delayMs": 2020
          }
        ],
        "choices": null,
        "closingLines": [
          "斜阳沉下去，老亨利的秤再没晃过，镇上人路过时都道声好。",
          "集市的纠纷就这么了了，没人再提那杆空秤的事。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    }
  },
  "old_feud": {
    "tavern": {
      "description": "油灯下，两个头发灰白的男人隔着木桌对吼，一个攥着空酒杯，一个拍得桌上的半瓶威士忌直晃。",
      "phoneInvite": "酒馆老板托我捎话：老汤姆和哈克为十年前的一笔钱吵得要拔枪，你来一趟，再没人劝怕是要见血。",
      "locateLabel": "镇西酒馆",
      "cutsceneTitle": "那晚酒馆",
      "cutscene": [
        "油灯慢慢暗下去，酒馆里只剩翻倒的木椅和地上的碎玻璃。",
        "第二天井台边打水的人都在学，两个老友为旧账扯破了嗓子。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "老汤姆吵架的老矿工",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "哈克与老汤姆争吵",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "你拍桌子吓唬谁？当年那笔账，今晚非算清不可！",
            "mood": "angry",
            "delayMs": 1719
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "哈克，二十年前的旧事，你喝几口猫尿就翻腾！",
            "mood": "angry",
            "delayMs": 1874
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "旧事？你抢走的金砂，够买下半个镇子。",
            "mood": "cold",
            "delayMs": 2096
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你瞧见没？这老东西要动手了，快拉住他！",
            "mood": "scared",
            "delayMs": 1795
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "tavern_ask": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "别掺和，这是我跟他的旧账。",
                "mood": "angry",
                "delayMs": 1990
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "你算哪根葱？也想管闲事？",
                "mood": "cold",
                "delayMs": 2178
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "哈克，今天你必须给我个交代。",
                "mood": "angry",
                "delayMs": 2096
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "交代？你欠我的还没还呢！",
                "mood": "smug",
                "delayMs": 1951
              }
            ],
            "lines": [
              "你的劝解让两人暂时收声，但酒馆里的人都记住了你多管闲事。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": -5,
              "trust": -5
            }
          },
          "tavern_watch": {
            "beats": [
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "你再说一遍，信不信我砸了你？",
                "mood": "angry",
                "delayMs": 2193
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "来啊，我哈克还没怕过你。",
                "mood": "smug",
                "delayMs": 1808
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你就干看着？老伙计，你真行。",
                "mood": "sad",
                "delayMs": 2037
              }
            ],
            "lines": [
              "你站在一旁看着他们差点掀了桌子，老汤姆眼里满是失望。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 0,
              "affection": -10,
              "trust": -10
            }
          }
        }
      },
      "indoor": true
    },
    "backstory": {
      "description": "正午的广场上，一个老矿工坐在木箱上，摊开一本卷了边的账本，褪色字迹引来几个路人伸脖子。",
      "phoneInvite": "银矿的老会计在广场等你，说知道当年谁卷走了分成，让你带壶酒过去，他有旧账要翻。",
      "locateLabel": "集市广场",
      "cutsceneTitle": "当年那账",
      "cutscene": [
        "几天之后，矿场边再没人敢高声提起那口废弃的竖井。",
        "风把账本的事吹进每顶帐篷，有人开始绕着那个被指名字的人走路。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "银矿老会计翻旧账",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "围观账本的路人",
            "female": null,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "{lead}，你账本上这行红字，是不是矿上后来添的？",
            "mood": "angry",
            "delayMs": 1859
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "{extra0_0}，你眼尖，这正是黑蹄会赖账的把柄。",
            "mood": "cold",
            "delayMs": 1751
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "外乡人，你给评评理，这账是不是叫人改了？",
            "mood": "sad",
            "delayMs": 2171
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "别多管闲事，银矿兄弟会的人可不好惹。",
            "mood": "scared",
            "delayMs": 1775
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我不怕他们，只求你把账本带到警长那儿。",
            "mood": "angry",
            "delayMs": 1748
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "reconcile": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "旧账翻出来，心里不是滋味。",
                "mood": "sad",
                "delayMs": 1778
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "老伙计，过去的事就让它过去吧。",
                "mood": "neutral",
                "delayMs": 1766
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "你这张嘴，还是那么会劝人。",
                "mood": "neutral",
                "delayMs": 1738
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "听你的，今晚我请酒。",
                "mood": "happy",
                "delayMs": 1732
              }
            ],
            "lines": [
              "旧账撕了，两人在酒馆干了一杯，恩怨随风散。",
              "广场上的人散了，老矿工把账本收进怀里。"
            ],
            "fx": {
              "cash": 0,
              "honor": 10,
              "wanted": 0,
              "affection": 10,
              "trust": 10
            }
          },
          "pay_debt": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你替他还？这钱可不是小数目。",
                "mood": "neutral",
                "delayMs": 2024
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "外乡人，你钱多是好事。",
                "mood": "smug",
                "delayMs": 2193
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "这账清了，往后两不相欠。",
                "mood": "neutral",
                "delayMs": 1695
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "有人替你出头，你还板着脸。",
                "mood": "happy",
                "delayMs": 1860
              }
            ],
            "lines": [
              "账本上最后一笔划掉，旧债清了，双方松了口气。",
              "你钱包瘪了，可老矿工看你的眼神多了几分敬重。"
            ],
            "fx": {
              "cash": -80,
              "honor": 5,
              "wanted": 0,
              "affection": 15,
              "trust": 5
            }
          },
          "let_fight": {
            "beats": [
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "你少管闲事。",
                "mood": "angry",
                "delayMs": 1704
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "我偏要管，你又能怎样？",
                "mood": "cold",
                "delayMs": 1661
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你站着看戏？",
                "mood": "cold",
                "delayMs": 1664
              },
              {
                "speaker": "extra0_0",
                "to": "player",
                "text": "别卷进来，小心溅一身血。",
                "mood": "smug",
                "delayMs": 1685
              }
            ],
            "lines": [
              "两人在广场扭打，警长赶来带走一个，镇上议论纷纷。",
              "你袖手旁观，老矿工眼里全是失望。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 0,
              "affection": -15,
              "trust": -10
            }
          }
        }
      },
      "indoor": false
    },
    "reconciled": {
      "description": "黄昏的门廊长凳上，两个男人并肩坐着，中间只隔一杯推到两人之间的威士忌，肩膀斜斜地靠了一下。",
      "phoneInvite": "老汤姆让我给你捎话，说他和哈克把话说开了，叫你来酒馆坐坐，有瓶封了十年的酒等你开。",
      "locateLabel": "酒馆门廊",
      "cutsceneTitle": "重归于好",
      "cutscene": [
        "往后几天，酒馆里再没摔过一个杯子，老汤姆和哈克又坐回靠窗那桌。",
        "镇上人说，有些旧账翻过去了，矿上吹来的风都带着松脂气。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "和好后的老汤姆",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "与老汤姆和好的哈克",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "这杯威士忌，算我欠你二十年的。",
            "mood": "sad",
            "delayMs": 2110
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "哈克，旧账别翻了，肩膀都靠着了。",
            "mood": "neutral",
            "delayMs": 1675
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你瞧，人活到这份上，恨不动了。",
            "mood": "happy",
            "delayMs": 1980
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "他总算肯把枪收进柜子里了。",
            "mood": "smug",
            "delayMs": 1779
          }
        ],
        "choices": null,
        "closingLines": [
          "打那以后，酒馆门廊多摆了一条长凳，两个老汉常坐到星子满天。",
          "镇上人说，老汤姆和哈克能把同一杯酒推来让去，比当年动枪体面多了。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "soured": {
      "description": "科布已经骑上马，马鞍后捆着褪色的铺盖卷，哈特站在马厩门口，手里的缰绳断成两截扔在尘土里。",
      "phoneInvite": "你到镇西旧马厩来一趟，科布已经上马了，哈特把门板都踹裂了，你再不来就真见不着了。",
      "locateLabel": "镇西旧马厩",
      "cutsceneTitle": "蹄声远去",
      "cutscene": [
        "争吵后的第三天，科布在破晓前把马牵出马厩，蹄铁磕在石板路上发出脆响。",
        "哈特没来送，只把两人当年合影的锡版照片塞进炉膛，看着它卷成黑灰。",
        "镇上的人起初还议论，后来连酒保都懒得再提那笔账，只在账本上把两个名字用铅笔一道划掉。"
      ],
      "venueId": "stables",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "骑马要走的科布",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "气急败坏的哈特",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "科布，你欠我的债还没清，就想跑？",
            "mood": "angry",
            "delayMs": 2115
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "哈特，我早还清了，是你自己不肯认。",
            "mood": "cold",
            "delayMs": 1846
          },
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "我扯断缰绳也要把你拽下来！",
            "mood": "angry",
            "delayMs": 1841
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你评评理，是他先烧了我的马棚。",
            "mood": "sad",
            "delayMs": 1939
          }
        ],
        "choices": null,
        "closingLines": [
          "科布终究还是催马出了镇子，哈特攥着断缰绳在尘土里站到天黑。",
          "镇上人嚼着舌头说，这俩人的旧怨，怕是比矿洞还深。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    }
  },
  "medicine_shortage": {
    "clinic": {
      "description": "诊所木门半敞着，一股艾草混着汗腥的气味扑出来，医生正踮脚去够顶层药柜，那格早已空了，只掉下几片干瘪的草根。",
      "phoneInvite": "大夫托我捎句话，让你赶紧来趟诊所。镇上烧倒的人越来越多，他药柜里只差一味退烧的根子，别声张。",
      "locateLabel": "镇西诊所",
      "cutsceneTitle": "病潮初起",
      "cutscene": [
        "那股子热病借着秋燥在镇子里传开，先是矿营，后来连酒馆的女佣也起不了床。",
        "药铺门前的地上落满黄叶，没人有心思去扫。"
      ],
      "venueId": "clinic",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "诊所里的大夫",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "药柜又空了，连艾草根都剩不下几片。",
            "mood": "sad",
            "delayMs": 1608
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来得正好，帮我瞧瞧外头谁还存着金鸡纳霜。",
            "mood": "neutral",
            "delayMs": 1645
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "再这么下去，发热的病人只能硬扛了。",
            "mood": "angry",
            "delayMs": 1923
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "clinic_help": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你肯帮忙？真是雪中送炭。",
                "mood": "happy",
                "delayMs": 1838
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "顶层那格空了，得找些金鸡纳树皮。",
                "mood": "neutral",
                "delayMs": 2104
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "去黑蹄会的地盘打听，小心些。",
                "mood": "neutral",
                "delayMs": 2087
              }
            ],
            "lines": [
              "你应下这桩差事，医生紧锁的眉头松了些。",
              "你转身出门，诊所门在身后吱呀合上。"
            ],
            "fx": {
              "cash": 20,
              "honor": 10,
              "wanted": 0,
              "affection": 15,
              "trust": 10
            }
          },
          "clinic_decline": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "没空？那就别杵在这儿。",
                "mood": "cold",
                "delayMs": 2161
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "药柜空了，病人可等不起。",
                "mood": "angry",
                "delayMs": 1814
              }
            ],
            "lines": [
              "医生没再言语，只把空抽屉重重推了回去。",
              "你转身离开，身后传来一声叹息。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 0,
              "affection": -15,
              "trust": -12
            }
          }
        }
      },
      "indoor": true
    },
    "find": {
      "description": "北边路口那间石头矮屋里，老猎人把一袋干草根扔在火炉旁，猎枪斜靠着门框，满屋子都是苦腥和硝烟味。",
      "phoneInvite": "老马让我给你带话：太阳落山前到北道口来，那袋退烧的草根在他手里，他说要当面看看你的诚意。",
      "locateLabel": "镇北路口",
      "cutsceneTitle": "落日之前",
      "cutscene": [
        "太阳往西偏去，北道上又扬起一蓬黄灰，几个骑马的人远远望了望，掉头走了。",
        "镇上有人传言，老猎人把那袋药看得比银矿还紧。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "北道口老猎人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "药铺的奎宁、碘酒全断了，黑蹄会劫了驿站马车。",
            "mood": "angry",
            "delayMs": 1901
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我认得银矿后山有条私货路，可一个人去是送死。",
            "mood": "cold",
            "delayMs": 1651
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你跟我走一趟，成了分你三成。",
            "mood": "neutral",
            "delayMs": 1647
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "buy": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "这袋子药根，你要就掏二十块。",
                "mood": "cold",
                "delayMs": 2125
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "不二价，镇上药铺都断货了。",
                "mood": "smug",
                "delayMs": 2070
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "拿钱来，东西你扛走。",
                "mood": "neutral",
                "delayMs": 1846
              }
            ],
            "lines": [
              "你付了二十块钱，老猎人把干草根踢到你脚边。",
              "药铺断货的窘迫，因你的出手稍有缓解。"
            ],
            "fx": {
              "cash": -20,
              "honor": 5,
              "wanted": 0,
              "affection": 5,
              "trust": 5
            }
          },
          "persuade": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "我凭啥白给？这年头谁都不易。",
                "mood": "cold",
                "delayMs": 1945
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "镇上缺药关我屁事？滚一边去。",
                "mood": "angry",
                "delayMs": 1866
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "罢了，拿走吧，算我倒霉。",
                "mood": "sad",
                "delayMs": 1701
              }
            ],
            "lines": [
              "你一番话说动老猎人，他摆摆手让你把干草根拿走。",
              "诊所因此多了些药材，你的名声在镇上传开。"
            ],
            "fx": {
              "cash": 0,
              "honor": 10,
              "wanted": 0,
              "affection": 10,
              "trust": 10
            }
          },
          "ignore": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "不买就滚，别挡着我烤火。",
                "mood": "cold",
                "delayMs": 2143
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "看什么看？没你的份。",
                "mood": "angry",
                "delayMs": 1940
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "杵这儿干啥？想挨枪子儿？",
                "mood": "cold",
                "delayMs": 1708
              }
            ],
            "lines": [
              "你转身离开，老猎人用鼻子哼了一声，继续烤他的火。",
              "药铺仍然缺药，有病人把你见死不救的事传开了。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 0,
              "affection": -5,
              "trust": -5
            }
          }
        }
      },
      "indoor": false
    },
    "delivered": {
      "description": "诊所后院支着三口铁锅，草药在滚水里翻腾，医生舀起一勺黑汤喂进男孩嘴里，那孩子窝在母亲怀里慢慢不再抽气。",
      "phoneInvite": "医生让伙计给你带话，请你去诊所一趟，说昨儿那锅药已经起效，昨晚没人再烧得说胡话，他想当面谢你。",
      "locateLabel": "诊所后院",
      "cutsceneTitle": "汤药起效",
      "cutscene": [
        "一昼夜过去，原本烫手的额头一个个退了温，咳嗽声从巷子里稀了下去。",
        "酒馆里重新有人压着嗓子讲笑话，伙计给每张桌子添了热咖啡。"
      ],
      "venueId": "clinic",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "后院煮药的医生",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "母亲怀里的病孩",
            "female": false,
            "gang": null
          },
          {
            "n": 1,
            "hint": "抱着男孩的母亲",
            "female": true,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra1_0",
            "to": "lead",
            "text": "大夫，他刚才又抽了，这黑汤到底管不管用？",
            "mood": "scared",
            "delayMs": 2055
          },
          {
            "speaker": "extra0_0",
            "to": "extra1_0",
            "text": "娘，我冷……心口松快些了。",
            "mood": "sad",
            "delayMs": 1641
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来得正好，去前街药铺催催缺的那几味药。",
            "mood": "cold",
            "delayMs": 2152
          },
          {
            "speaker": "extra1_0",
            "to": "extra0_0",
            "text": "别睡，喝药，你爹明儿就带钱回来。",
            "mood": "happy",
            "delayMs": 2059
          }
        ],
        "choices": null,
        "closingLines": [
          "那孩子挨过当夜，烧退了，只是瘦得脱了形。",
          "镇上人传，是医生在后院支铁锅熬的土方子救回一条命。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    },
    "faded": {
      "description": "药铺门口晾着的湿床单不再滴水，老猎人挂在檐下的那袋草药落满灰，有几只麻雀停在袋口啄食陈年草籽。",
      "phoneInvite": "镇口老猎人托我带话，叫你得空去他屋后一趟。那袋草药还挂在檐下，风一吹袋口就张开，他总听见耗子在里头闹。",
      "locateLabel": "猎户家檐下",
      "cutsceneTitle": "半月之后",
      "cutscene": [
        "半个月过去，药铺里晾着的湿床单不再滴水，咳嗽声也一天比一天稀。",
        "镇上人把艾草挂回门框，那包草药仍吊在老猎人檐下，袋口被麻雀啄开，草籽撒了一地。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "镇口的老猎人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "药铺的短缺，昨晚算是了结了。",
            "mood": "neutral",
            "delayMs": 1841
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "警长把红隼帮劫的那批奎宁追了回来。",
            "mood": "cold",
            "delayMs": 2153
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我这袋草药，连麻雀都嫌弃了。",
            "mood": "sad",
            "delayMs": 1909
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "镇上的人，又能睡个安稳觉了。",
            "mood": "neutral",
            "delayMs": 2181
          }
        ],
        "choices": null,
        "closingLines": [
          "老猎人把那袋陈年草药扔进灶膛，镇上人路过檐下，都朝他点头。",
          "药铺重新挂出干净的布帘，短缺的事再没人提起。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    }
  },
  "orphan_clue": {
    "street": {
      "description": "尘土飞扬的街角，一个瘦小的男孩背靠木桩，低头盯着掌心一枚泛黄的铜徽章，拇指来回蹭着上面的凹痕。",
      "phoneInvite": "你上集市北边路口来一趟——有个娃攥着枚旧警徽，非说要找认识它的人。我看那徽章不对头，你过来瞅瞅。",
      "locateLabel": "集市北口",
      "cutsceneTitle": "尘土街角",
      "cutscene": [
        "那孩子已经在街角站了半个钟头，路过的妇人拉他袖子，他甩开手，眼睛没离开那枚徽章。",
        "几个赶集的人回头张望，有个老头叹口气说，那徽章上的星星都磨亮了。"
      ],
      "venueId": "plaza",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "攥着旧警徽的瘦小男孩",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "你也是来抢这枚警徽的？",
            "mood": "angry",
            "delayMs": 1789
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "这是我爹留下的，他追查红隼帮再没回来。",
            "mood": "sad",
            "delayMs": 1799
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "求你了，带我去矿场，他们就在那儿。",
            "mood": "scared",
            "delayMs": 2182
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "street_ask": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你是什么人？离我远点。",
                "mood": "scared",
                "delayMs": 1898
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "这徽章……是我捡来的。",
                "mood": "neutral",
                "delayMs": 2135
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "你最好别管我的事。",
                "mood": "cold",
                "delayMs": 1925
              }
            ],
            "lines": [
              "你靠近询问，男孩却转身跑进巷子，只留下铜徽章滚落在地。"
            ],
            "fx": {
              "cash": 0,
              "honor": 0,
              "wanted": 0,
              "affection": -5,
              "trust": -10
            }
          },
          "street_help": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "你……真的肯帮我？",
                "mood": "neutral",
                "delayMs": 1870
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "这徽章是我爹的，他不在了。",
                "mood": "sad",
                "delayMs": 1923
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "我只想找到害他的人。",
                "mood": "angry",
                "delayMs": 1608
              }
            ],
            "lines": [
              "你决定帮他追查，男孩眼中重新有了光，把徽章交到你手里。"
            ],
            "fx": {
              "cash": 0,
              "honor": 10,
              "wanted": 0,
              "affection": 15,
              "trust": 15
            }
          },
          "street_pass": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "又一个装没看见的。",
                "mood": "sad",
                "delayMs": 2198
              },
              {
                "speaker": "lead",
                "to": "player",
                "text": "滚开，别站在我跟前。",
                "mood": "cold",
                "delayMs": 1925
              }
            ],
            "lines": [
              "你从旁走过，男孩攥紧徽章，眼里的光暗了下去。"
            ],
            "fx": {
              "cash": 0,
              "honor": -5,
              "wanted": 0,
              "affection": -10,
              "trust": -10
            }
          }
        }
      },
      "indoor": false
    },
    "badge": {
      "description": "酒馆油灯下，那枚铜徽躺在桌角，边角磨损的星星图案和“警长”字样在昏黄光里格外扎眼。",
      "phoneInvite": "那孩子把徽章带到我这儿了，你赶紧来酒馆一趟——我看那旧警徽像是十年前镇上警署的，那孩子的爹怕是不简单。",
      "locateLabel": "酒馆油灯下",
      "cutsceneTitle": "油灯之下",
      "cutscene": [
        "酒馆里几个常客凑过来，看清那徽章后低声议论，有人摘下帽子不说话了。",
        "孩子把徽章贴在胸口，直到老板娘端来一杯温水才松开一点。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "认出旧警徽的酒馆老板",
        "leadGang": null,
        "extras": [
          {
            "n": 1,
            "hint": "攥旧警徽的男娃",
            "female": false,
            "gang": null
          }
        ]
      },
      "scene": {
        "beats": [
          {
            "speaker": "extra0_0",
            "to": "lead",
            "text": "老板，这警徽是俺爹留下的，你认得？",
            "mood": "sad",
            "delayMs": 2015
          },
          {
            "speaker": "lead",
            "to": "extra0_0",
            "text": "孩子，这星徽磨成这样，我怎会不认得。",
            "mood": "neutral",
            "delayMs": 2033
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "你来得正好，这孩子的爹怕是出了事。",
            "mood": "sad",
            "delayMs": 2032
          },
          {
            "speaker": "extra0_0",
            "to": "player",
            "text": "求求你，帮俺找找爹，他上月去了矿上。",
            "mood": "scared",
            "delayMs": 2033
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "那银矿是银矿兄弟会的地盘，这事蹊跷。",
            "mood": "cold",
            "delayMs": 1607
          }
        ],
        "choices": null,
        "closingLines": null,
        "choiceScenes": {
          "help": {
            "beats": [
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "孩子，这警徽是你爹的？",
                "mood": "neutral",
                "delayMs": 2085
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "嗯，我爹说他会回来。",
                "mood": "sad",
                "delayMs": 1801
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "别怕，我帮你查查他的下落。",
                "mood": "neutral",
                "delayMs": 1903
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "谢谢老板，你真是个好人。",
                "mood": "happy",
                "delayMs": 2146
              }
            ],
            "lines": [
              "老板收下警徽，答应天亮就去警长那儿打听。",
              "孩子眼里有了光，在酒馆角落沉沉睡去。"
            ],
            "fx": {
              "cash": -20,
              "honor": 8,
              "wanted": 0,
              "affection": 12,
              "trust": 15
            }
          },
          "tell": {
            "beats": [
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "孩子，你爹他...已经没了。",
                "mood": "sad",
                "delayMs": 2008
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "不，你骗我！他说过会回来的！",
                "mood": "angry",
                "delayMs": 1943
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "矿场塌方，没人活下来。",
                "mood": "cold",
                "delayMs": 1890
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "我不信...我不信...",
                "mood": "sad",
                "delayMs": 1634
              }
            ],
            "lines": [
              "孩子攥着警徽跑出酒馆，消失在夜色里。",
              "老板叹了口气，把一枚银元放在桌上。"
            ],
            "fx": {
              "cash": 0,
              "honor": 5,
              "wanted": 0,
              "affection": -8,
              "trust": 10
            }
          },
          "pass": {
            "beats": [
              {
                "speaker": "lead",
                "to": "player",
                "text": "我没见过这玩意儿。",
                "mood": "cold",
                "delayMs": 1976
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "老板，求您再看看，这警徽是我爹的。",
                "mood": "sad",
                "delayMs": 1811
              },
              {
                "speaker": "lead",
                "to": "extra0_0",
                "text": "这儿不欢迎找麻烦的人。",
                "mood": "cold",
                "delayMs": 1705
              },
              {
                "speaker": "extra0_0",
                "to": "lead",
                "text": "求您行行好，再看看吧。",
                "mood": "sad",
                "delayMs": 2078
              }
            ],
            "lines": [
              "孩子抱着警徽蹲在酒馆门口，直到打烊。",
              "从此他再没来过这条街。"
            ],
            "fx": {
              "cash": 0,
              "honor": -10,
              "wanted": 0,
              "affection": -15,
              "trust": -15
            }
          }
        }
      },
      "indoor": true
    },
    "told": {
      "description": "孩子听完那番话，把徽章按在胸口好一会儿，才小心地收进内兜，抬头用袖子蹭了下眼睛说谢谢。",
      "phoneInvite": "酒馆老板差人捎话：那孩子还在后桌等你，非要把那枚警徽问出个来历。你来一趟，他怕再等下去天就黑了。",
      "locateLabel": "酒馆后桌",
      "cutsceneTitle": "真相之后",
      "cutscene": [
        "孩子走后，酒馆里安静了一阵，有人小声说起那位老警长十年前的旧事。",
        "第二天，集市上的人看见孩子背着个小包袱出了镇口，那枚徽章再没在镇上露过面。"
      ],
      "venueId": "saloon",
      "stageCast": {
        "leadFemale": false,
        "leadHint": "刚收起旧警徽的男孩",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "谢谢你，我会把它收在贴心口的地方。",
            "mood": "sad",
            "delayMs": 1736
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "我爹说过，这徽章能照出人心。",
            "mood": "neutral",
            "delayMs": 1853
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "往后我要走他没能走完的路。",
            "mood": "neutral",
            "delayMs": 1785
          }
        ],
        "choices": null,
        "closingLines": [
          "后来镇上的人常看见那孩子在矿场帮工，夜里就守着旧徽章。",
          "有人说，等风沙再起时，他会是个好警长。"
        ],
        "choiceScenes": {}
      },
      "indoor": true
    },
    "faded": {
      "description": "空荡荡的街角，风卷着草屑滚过，地上有一个很浅的脚印坑，像是站了一整夜留下的。",
      "phoneInvite": "酒馆老板捎话：“那孩子天不亮就出了北门，你想送送，现在去路口还能望见尘土。”",
      "locateLabel": "镇北路口",
      "cutsceneTitle": "孩子走了",
      "cutscene": [
        "第二天清晨，北门外的车辙印一直伸进雾里，那孩子再没有回来过。",
        "酒馆里有人问起那枚旧徽章，老板擦着杯子说不知道，再没人接话。",
        "如今墙角只剩野猫偶尔停下，舔舔爪子，再慢悠悠走开。"
      ],
      "venueId": "north_road",
      "stageCast": {
        "leadFemale": null,
        "leadHint": "当事人",
        "leadGang": null,
        "extras": []
      },
      "scene": {
        "beats": [
          {
            "speaker": "lead",
            "to": "player",
            "text": "看见这脚印坑没有？那人整整站了一宿。",
            "mood": "neutral",
            "delayMs": 1761
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "那孤儿等的人，就是我，可我来迟了。",
            "mood": "sad",
            "delayMs": 1925
          },
          {
            "speaker": "lead",
            "to": "player",
            "text": "镇上的人都说我欠他一条命，你得替我做个证。",
            "mood": "angry",
            "delayMs": 1794
          }
        ],
        "choices": null,
        "closingLines": [
          "几天后，那孤儿被人发现死在河滩边，手里攥着一封没送出的信。",
          "镇上的人从此看见那个脚印坑就绕道走，都说那是冤魂站过的地方。"
        ],
        "choiceScenes": {}
      },
      "indoor": false
    }
  }
};

/** 取某节点的包装文案；没有就返回 null，调用方自己兜底 */
export function getBeatText(storyId, nodeId) {
  return STORY_BEAT_TEXT[storyId]?.[nodeId] || null;
}
