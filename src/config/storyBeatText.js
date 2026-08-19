/**
 * 故事节点的包装化文案 + 可演剧本（deepseek-v4-pro 批量生成，勿手改单条）
 *
 * 字段：
 *  - description   : 到场时看到的画面
 *  - phoneInvite   : 手机来信正文（第一人称口信 + 邀请动作）
 *  - locateLabel   : 定位按钮上的地点名（与口信说法一致）
 *  - venueId       : storyVenues.VENUE_DEFS 的地点 id，决定"📍去看看"去哪
 *  - cutsceneTitle / cutscene : 黑幕过场（你没到场、强行推进时补叙）
 *  - stageCast     : 这一幕需要谁在场 { leadFemale, leadHint, leadGang, extras }
 *  - scene         : 可演的一幕
 *      · beats        多人同台对话 [{speaker,to,text,mood,delayMs}]
 *                     speaker/to 用 lead / extraN_M / player；台词里 {roleId}
 *                     占位由 TheaterRuntime._sub 换成真实名字
 *      · choices      过渡节点补的玩家抉择（原来是自动推进、插不上手）
 *      · closingLines 终局节点的收尾旁白
 *
 * 生成时间：2026-08-19T09:49:12.213Z
 * 合格 40 / 降级 0
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
        "closingLines": null
      }
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
      "venueId": "saloon_back",
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
      "venueId": "saloon_back",
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        ]
      }
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
        ]
      }
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
        ]
      }
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
        "closingLines": null
      }
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
      "venueId": "store_back",
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        ]
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        ]
      }
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
        "closingLines": null
      }
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
      "venueId": "stables",
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        ]
      }
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
        ]
      }
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
        ]
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        ]
      }
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
        ]
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
      "venueId": "saloon",
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
        ]
      }
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
        ]
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
        ]
      }
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
        ]
      }
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
        "closingLines": null
      }
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
        "closingLines": null
      }
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
      "venueId": "saloon_back",
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
        ]
      }
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
        ]
      }
    }
  }
};

/** 取某节点的包装文案；没有就返回 null，调用方自己兜底 */
export function getBeatText(storyId, nodeId) {
  return STORY_BEAT_TEXT[storyId]?.[nodeId] || null;
}
