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
  ],
  "saloon_triangle/st": [
    {
      "speaker": "suitorA",
      "text": "费恩，你耳朵里塞了马粪？",
      "mood": "angry"
    },
    {
      "speaker": "suitorB",
      "text": "我倒想听听你能吠多久。",
      "mood": "smug"
    },
    {
      "speaker": "center",
      "text": "别在我面前动拳头，你们两个。",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "我赌两块钱，比利先动手。",
      "mood": "greedy"
    }
  ],
  "saloon_triangle/a1": [
    {
      "speaker": "suitorA",
      "text": "这婊子养的还嘴硬。",
      "mood": "angry"
    },
    {
      "speaker": "suitorB",
      "text": "我可不吃这一套。",
      "mood": "neutral"
    },
    {
      "speaker": "center",
      "text": "我不是你们的玩具！",
      "mood": "shocked"
    },
    {
      "speaker": "confidant",
      "text": "先生们，别吓到其他客人……",
      "mood": "scared"
    }
  ],
  "saloon_triangle/b1": [
    {
      "speaker": "suitorB",
      "text": "我等的就是这一天。",
      "mood": "smug"
    },
    {
      "speaker": "suitorA",
      "text": "你这狗娘养的……",
      "mood": "angry"
    },
    {
      "speaker": "center",
      "text": "费恩，你别火上浇油！",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "费恩那小子深藏不露。",
      "mood": "greedy"
    }
  ],
  "saloon_triangle/persuadeB": [
    {
      "speaker": "suitorB",
      "text": "这两年，我不是闹着玩的。",
      "mood": "sad"
    },
    {
      "speaker": "suitorA",
      "text": "说得好听，谁知道真假。",
      "mood": "angry"
    },
    {
      "speaker": "confidant",
      "text": "这情分，我都看在眼里。",
      "mood": "neutral"
    },
    {
      "speaker": "center",
      "text": "够了，我不想听这些……",
      "mood": "pain"
    }
  ],
  "saloon_triangle/secret": [
    {
      "speaker": "confidant",
      "text": "这年头，来路不明的东西多。",
      "mood": "neutral"
    },
    {
      "speaker": "suitorA",
      "text": "少在那儿嚼舌头，山姆。",
      "mood": "angry"
    },
    {
      "speaker": "center",
      "text": "现在是说这个的时候？",
      "mood": "shocked"
    },
    {
      "speaker": "suitorB",
      "text": "我不喜欢被人当傻子。",
      "mood": "scared"
    }
  ],
  "saloon_triangle/expose": [
    {
      "speaker": "crowd",
      "text": "我早就觉得那玩意来路不正。",
      "mood": "smug"
    },
    {
      "speaker": "suitorA",
      "text": "我说了是我赢来的，你们聋了？",
      "mood": "angry"
    },
    {
      "speaker": "suitorB",
      "text": "哼，赃物也敢往姑娘身上戴。",
      "mood": "smug"
    },
    {
      "speaker": "center",
      "text": "老天，我竟戴过那东西……",
      "mood": "scared"
    }
  ],
  "saloon_triangle/g1": [
    {
      "speaker": "suitorA",
      "text": "萝丝，我对月亮发誓，真心实意。",
      "mood": "sad"
    },
    {
      "speaker": "suitorB",
      "text": "你的真心连杯酒都换不来。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "看看这两个犟牛，姑娘都烦了。",
      "mood": "neutral"
    },
    {
      "speaker": "confidant",
      "text": "小姐，别理他们，您拿主意。",
      "mood": "neutral"
    }
  ],
  "saloon_triangle/g2": [
    {
      "speaker": "suitorA",
      "text": "旧金山？那鬼地方有什么好！",
      "mood": "angry"
    },
    {
      "speaker": "suitorB",
      "text": "你走了，这镇子可就更没意思了。",
      "mood": "sad"
    },
    {
      "speaker": "confidant",
      "text": "听说那儿剧院多，您准能红。",
      "mood": "happy"
    },
    {
      "speaker": "crowd",
      "text": "啧啧，姑娘志向不小呢。",
      "mood": "neutral"
    }
  ],
  "saloon_triangle/g_pushA": [
    {
      "speaker": "suitorA",
      "text": "掀桌子怎么了？他们欠教训！",
      "mood": "angry"
    },
    {
      "speaker": "suitorB",
      "text": "听听，这脾气谁受得了。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "比利的拳头比脑子快，哈哈。",
      "mood": "neutral"
    },
    {
      "speaker": "center",
      "text": "唉，他就是这炮仗性子。",
      "mood": "sad"
    }
  ],
  "saloon_triangle/g_pushB": [
    {
      "speaker": "suitorB",
      "text": "我再说一遍，从今晚起戒赌！",
      "mood": "angry"
    },
    {
      "speaker": "confidant",
      "text": "对，第四次，跟上次一模一样。",
      "mood": "smug"
    },
    {
      "speaker": "suitorA",
      "text": "费恩的戒赌，比骡子爬树还难。",
      "mood": "neutral"
    },
    {
      "speaker": "center",
      "text": "这话听得我耳朵都起茧了。",
      "mood": "sad"
    }
  ],
  "saloon_triangle/g3": [
    {
      "speaker": "crowd",
      "text": "她到底选谁？我的钱可押在A上。",
      "mood": "greedy"
    },
    {
      "speaker": "confidant",
      "text": "快点决定吧，再这样大家都要疯了。",
      "mood": "scared"
    },
    {
      "speaker": "suitorA",
      "text": "萝丝，选我吧，我比那个混蛋强。",
      "mood": "smug"
    },
    {
      "speaker": "suitorB",
      "text": "哼，别听他的，他只会说大话。",
      "mood": "angry"
    }
  ],
  "saloon_triangle/duelrisk": [
    {
      "speaker": "confidant",
      "text": "别在我店门口开枪，求你们了！",
      "mood": "scared"
    },
    {
      "speaker": "center",
      "text": "你们真是疯了，为了我值得吗？",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "快看，真要拔枪了，这下有戏。",
      "mood": "greedy"
    },
    {
      "speaker": "suitorA",
      "text": "小子，你不敢开枪的，我赌你的手在抖。",
      "mood": "smug"
    }
  ],
  "street_pickpocket/st": [
    {
      "speaker": "victim",
      "text": "今天赚的钱够买好多饲料了。",
      "mood": "happy"
    },
    {
      "speaker": "thief",
      "text": "再近一点……",
      "mood": "greedy"
    },
    {
      "speaker": "crowd",
      "text": "那家伙总往货商身上贴。",
      "mood": "neutral"
    },
    {
      "speaker": "witness",
      "text": "该不该喊呢……",
      "mood": "scared"
    }
  ],
  "street_pickpocket/warn": [
    {
      "speaker": "victim",
      "text": "毛贼！还我血汗钱！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "堵住他！往左跑了！",
      "mood": "angry"
    },
    {
      "speaker": "witness",
      "text": "我就知道那家伙不是好人！",
      "mood": "smug"
    },
    {
      "speaker": "thief",
      "text": "滚开！别挡道！",
      "mood": "angry"
    }
  ],
  "street_pickpocket/stare": [
    {
      "speaker": "thief",
      "text": "我只是碰巧经过……",
      "mood": "scared"
    },
    {
      "speaker": "victim",
      "text": "你最好离我远点。",
      "mood": "angry"
    },
    {
      "speaker": "witness",
      "text": "他那手刚才在干嘛？",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "出什么乱子了？",
      "mood": "neutral"
    }
  ],
  "street_pickpocket/ignore": [
    {
      "speaker": "victim",
      "text": "钱袋！明明刚刚还在的！",
      "mood": "shocked"
    },
    {
      "speaker": "witness",
      "text": "我发誓，是那瘦猴儿干的！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "这年头，到处都是贼。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "去找警长吧，快些。",
      "mood": "neutral"
    }
  ],
  "street_pickpocket/follow": [
    {
      "speaker": "thief",
      "text": "出来！我看见你了！",
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "再不出来我开枪了！",
      "mood": "scared"
    },
    {
      "speaker": "thief",
      "text": "别多管闲事，伙计。",
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "该死的，是风还是人影……",
      "mood": "scared"
    }
  ],
  "street_pickpocket/block": [
    {
      "speaker": "witness",
      "text": "我亲眼看见他手伸过去了。",
      "mood": "smug"
    },
    {
      "speaker": "victim",
      "text": "搜他！一个子儿也别放过。",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "送他上绞架，这种人多得是。",
      "mood": "neutral"
    },
    {
      "speaker": "thief",
      "text": "我发誓我没拿，别冤枉我。",
      "mood": "scared"
    }
  ],
  "street_pickpocket/confront": [
    {
      "speaker": "crowd",
      "text": "人赃并获，还有什么好说？",
      "mood": "smug"
    },
    {
      "speaker": "victim",
      "text": "你这狗崽子，差点偷光我。",
      "mood": "angry"
    },
    {
      "speaker": "witness",
      "text": "我就知道，他手不干净。",
      "mood": "smug"
    },
    {
      "speaker": "thief",
      "text": "是我拿的……我没话讲。",
      "mood": "sad"
    }
  ],
  "street_pickpocket/why": [
    {
      "speaker": "crowd",
      "text": "咳血三个月？那可真要命。",
      "mood": "sad"
    },
    {
      "speaker": "victim",
      "text": "可偷钱总归是偷钱哪。",
      "mood": "neutral"
    },
    {
      "speaker": "witness",
      "text": "他娘确实病得不轻。",
      "mood": "sad"
    },
    {
      "speaker": "thief",
      "text": "十五块药钱，我上哪儿找。",
      "mood": "pain"
    }
  ],
  "street_pickpocket/comfort": [
    {
      "speaker": "victim",
      "text": "老天真是不开眼……",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "好歹钱追回来了，老伙计。",
      "mood": "neutral"
    },
    {
      "speaker": "witness",
      "text": "去找警长登个案，防着他点。",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "这种崽子，不该放过。",
      "mood": "angry"
    }
  ],
  "street_pickpocket/cover": [
    {
      "speaker": "crowd",
      "text": "到底往哪边跑了？",
      "mood": "neutral"
    },
    {
      "speaker": "victim",
      "text": "快追！别让他逃过河。",
      "mood": "angry"
    },
    {
      "speaker": "witness",
      "text": "明明往马棚……你们追错了。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "分头追！一个去河边，一个去马棚！",
      "mood": "neutral"
    }
  ],
  "bank_bounty/st": [
    {
      "speaker": "hunter",
      "text": "我可没闲功夫跟你耗。",
      "mood": "smug"
    },
    {
      "speaker": "suspect",
      "text": "这破事能快点完吗？",
      "mood": "angry"
    },
    {
      "speaker": "clerk",
      "text": "老天，我可不想卷进去。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "他到底是不是杀人犯？",
      "mood": "neutral"
    }
  ],
  "bank_bounty/investigate": [
    {
      "speaker": "hunter",
      "text": "这照片上的人，就是你这张脸。",
      "mood": "angry"
    },
    {
      "speaker": "suspect",
      "text": "眼睛像我？得了吧！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "我看不太像，差远了。",
      "mood": "neutral"
    },
    {
      "speaker": "clerk",
      "text": "这先生是正经人，我担保。",
      "mood": "happy"
    }
  ],
  "bank_bounty/question_hunter": [
    {
      "speaker": "hunter",
      "text": "公告板白纸黑字，还能有假？",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "那板子风吹雨淋，字都糊了。",
      "mood": "neutral"
    },
    {
      "speaker": "suspect",
      "text": "他就是盯上我的马了。",
      "mood": "angry"
    },
    {
      "speaker": "clerk",
      "text": "我可什么都不知道…",
      "mood": "scared"
    }
  ],
  "bank_bounty/check_alibi": [
    {
      "speaker": "suspect",
      "text": "老比利的话你们总该信吧？",
      "mood": "angry"
    },
    {
      "speaker": "hunter",
      "text": "酒馆里都是他的酒肉朋友。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "红马的比利从不撒谎。",
      "mood": "neutral"
    },
    {
      "speaker": "clerk",
      "text": "我快站不住了…",
      "mood": "pain"
    }
  ],
  "bank_bounty/verify_alibi": [
    {
      "speaker": "crowd",
      "text": "千真万确，他昨晚喝了整夜。",
      "mood": "happy"
    },
    {
      "speaker": "hunter",
      "text": "这不可能…你们串通好了。",
      "mood": "shocked"
    },
    {
      "speaker": "suspect",
      "text": "听见没？快松开你的爪子。",
      "mood": "smug"
    },
    {
      "speaker": "clerk",
      "text": "我就说嘛，他不会杀人。",
      "mood": "happy"
    }
  ],
  "bank_bounty/defend_suspect": [
    {
      "speaker": "hunter",
      "text": "让开，不然连你一起抓。",
      "mood": "angry"
    },
    {
      "speaker": "suspect",
      "text": "我知道你是好人，上帝保佑。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "这人真大胆，敢挡猎人。",
      "mood": "shocked"
    },
    {
      "speaker": "clerk",
      "text": "在银行门口闹事，警长快来啊！",
      "mood": "scared"
    }
  ],
  "bank_bounty/force_release": [
    {
      "speaker": "hunter",
      "text": "你会后悔的，小子。",
      "mood": "angry"
    },
    {
      "speaker": "suspect",
      "text": "谢天谢地，我得走了。",
      "mood": "happy"
    },
    {
      "speaker": "crowd",
      "text": "天哪，他拔枪了！",
      "mood": "shocked"
    },
    {
      "speaker": "clerk",
      "text": "快派人去叫警长！",
      "mood": "scared"
    }
  ],
  "bank_bounty/assist_hunter": [
    {
      "speaker": "hunter",
      "text": "好伙计，这下他跑不掉了。",
      "mood": "smug"
    },
    {
      "speaker": "suspect",
      "text": "你们冤枉好人！放开我！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "杀人犯就该绞死。",
      "mood": "neutral"
    },
    {
      "speaker": "clerk",
      "text": "总算抓住了，这悬赏可不少。",
      "mood": "greedy"
    }
  ],
  "bank_bounty/step_back": [
    {
      "speaker": "suspect",
      "text": "你们谁能帮帮我，我是无辜的。",
      "mood": "sad"
    },
    {
      "speaker": "hunter",
      "text": "没人会救你，杀人犯。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "也许他真是冤枉的。",
      "mood": "neutral"
    },
    {
      "speaker": "clerk",
      "text": "别在银行门口，拖远点。",
      "mood": "angry"
    }
  ],
  "bank_bounty/chase": [
    {
      "speaker": "hunter",
      "text": "别让他跑进巷子！",
      "mood": "angry"
    },
    {
      "speaker": "suspect",
      "text": "别追了，我不想用枪！",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "快追！那边！",
      "mood": "happy"
    },
    {
      "speaker": "clerk",
      "text": "别打坏银行的窗户！",
      "mood": "angry"
    }
  ],
  "bank_bounty/capture": [
    {
      "speaker": "crowd",
      "text": "套上绞索，伙计！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "他死定了！",
      "mood": "happy"
    },
    {
      "speaker": "clerk",
      "text": "别在银行门口闹事！",
      "mood": "scared"
    },
    {
      "speaker": "hunter",
      "text": "老实点，别耍花样。",
      "mood": "smug"
    }
  ],
  "bank_bounty/duel": [
    {
      "speaker": "crowd",
      "text": "押五个金币，猎人赢！",
      "mood": "greedy"
    },
    {
      "speaker": "crowd",
      "text": "那小子手在抖。",
      "mood": "neutral"
    },
    {
      "speaker": "clerk",
      "text": "老天，要出人命了。",
      "mood": "scared"
    },
    {
      "speaker": "hunter",
      "text": "拔枪吧，小子。",
      "mood": "angry"
    }
  ],
  "bank_bounty/bribe": [
    {
      "speaker": "crowd",
      "text": "哈哈，他想收买猎人。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "钱可比子弹有用。",
      "mood": "greedy"
    },
    {
      "speaker": "clerk",
      "text": "真是肮脏的交易。",
      "mood": "angry"
    },
    {
      "speaker": "hunter",
      "text": "再加点，也许我能忘掉。",
      "mood": "greedy"
    }
  ],
  "bank_bounty/warning_shot": [
    {
      "speaker": "crowd",
      "text": "枪子儿不长眼，快趴下！",
      "mood": "scared"
    },
    {
      "speaker": "clerk",
      "text": "别打碎玻璃！",
      "mood": "angry"
    },
    {
      "speaker": "suspect",
      "text": "我不是故意的，枪走火了！",
      "mood": "scared"
    },
    {
      "speaker": "hunter",
      "text": "把枪扔了，不然下一枪打穿你。",
      "mood": "angry"
    }
  ],
  "bank_bounty/sheriff": [
    {
      "speaker": "crowd",
      "text": "警长来了，这下有戏看。",
      "mood": "neutral"
    },
    {
      "speaker": "clerk",
      "text": "我亲眼看见他掏枪。",
      "mood": "neutral"
    },
    {
      "speaker": "hunter",
      "text": "赏金归我了。",
      "mood": "greedy"
    },
    {
      "speaker": "suspect",
      "text": "我是冤枉的，警长！",
      "mood": "scared"
    }
  ],
  "stable_horsethief/st": [
    {
      "speaker": "crowd",
      "text": "该死的，他们还要站多久？",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "我赌那小子是贼，瞧他眼睛。",
      "mood": "smug"
    },
    {
      "speaker": "groom",
      "text": "我的手酸了，先生，快拿主意。",
      "mood": "pain"
    },
    {
      "speaker": "buyer",
      "text": "我的马在等，没空耗着。",
      "mood": "neutral"
    }
  ],
  "stable_horsethief/n1_ask_groom": [
    {
      "speaker": "crowd",
      "text": "伊莱从不说谎，先生。",
      "mood": "neutral"
    },
    {
      "speaker": "groom",
      "text": "那绳结是我亲手系的。",
      "mood": "sad"
    },
    {
      "speaker": "thief",
      "text": "他老糊涂了，记不清。",
      "mood": "scared"
    },
    {
      "speaker": "buyer",
      "text": "听听马夫的疯话。",
      "mood": "angry"
    }
  ],
  "stable_horsethief/n2_side_buyer": [
    {
      "speaker": "crowd",
      "text": "这位外乡人有收据，没假。",
      "mood": "smug"
    },
    {
      "speaker": "buyer",
      "text": "谢了，老兄，你是个明白人。",
      "mood": "happy"
    },
    {
      "speaker": "groom",
      "text": "收据能证明啥？他偷我的马。",
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "我只想走，先生们。",
      "mood": "scared"
    }
  ],
  "stable_horsethief/n3_threaten": [
    {
      "speaker": "crowd",
      "text": "别走火，子弹不长眼。",
      "mood": "shocked"
    },
    {
      "speaker": "groom",
      "text": "放下枪，小子，冷静点。",
      "mood": "scared"
    },
    {
      "speaker": "buyer",
      "text": "这破事犯不着搭条命。",
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "我没想伤人，真的。",
      "mood": "pain"
    }
  ],
  "stable_horsethief/n4_listen_luke": [
    {
      "speaker": "crowd",
      "text": "卢克说的有点道理。",
      "mood": "neutral"
    },
    {
      "speaker": "thief",
      "text": "我发誓，马在野地溜达。",
      "mood": "sad"
    },
    {
      "speaker": "groom",
      "text": "野地？我的马从没溜过。",
      "mood": "angry"
    },
    {
      "speaker": "buyer",
      "text": "他撒谎，我亲眼瞧见。",
      "mood": "smug"
    }
  ],
  "stable_horsethief/n5_side_luke": [
    {
      "speaker": "crowd",
      "text": "这马夫气疯了，伙计。",
      "mood": "neutral"
    },
    {
      "speaker": "buyer",
      "text": "别理他，我们牵马走人。",
      "mood": "smug"
    },
    {
      "speaker": "groom",
      "text": "你会后悔的，该死的贼！",
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "我只是借马，先生们。",
      "mood": "scared"
    }
  ],
  "stable_horsethief/n6_check_receipt": [
    {
      "speaker": "crowd",
      "text": "收据上写棕色，这马是栗色。",
      "mood": "neutral"
    },
    {
      "speaker": "buyer",
      "text": "该死的，那家伙骗了我。",
      "mood": "angry"
    },
    {
      "speaker": "groom",
      "text": "收据就是废纸一张！",
      "mood": "smug"
    },
    {
      "speaker": "thief",
      "text": "颜色...可能光线问题。",
      "mood": "scared"
    }
  ],
  "stable_horsethief/n7_drive_groom": [
    {
      "speaker": "groom",
      "text": "谁敢动我的马，我跟他拼命！",
      "mood": "angry"
    },
    {
      "speaker": "buyer",
      "text": "老东西，别挡道。",
      "mood": "smug"
    },
    {
      "speaker": "thief",
      "text": "咱们快走，先生。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "要打起来了，退后些。",
      "mood": "scared"
    }
  ],
  "stable_horsethief/n8_force_luke": [
    {
      "speaker": "thief",
      "text": "枪...别开枪，我全认了。",
      "mood": "scared"
    },
    {
      "speaker": "groom",
      "text": "早该认罪，你这杂种。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "老天，他真掏枪了。",
      "mood": "shocked"
    },
    {
      "speaker": "buyer",
      "text": "哼，我就知道有鬼。",
      "mood": "smug"
    }
  ],
  "stable_horsethief/n9_let_luke_go": [
    {
      "speaker": "groom",
      "text": "放他走？这没天理！",
      "mood": "angry"
    },
    {
      "speaker": "thief",
      "text": "感激不尽，再会了！",
      "mood": "happy"
    },
    {
      "speaker": "crowd",
      "text": "就这么跑了？真荒唐。",
      "mood": "shocked"
    },
    {
      "speaker": "buyer",
      "text": "算了，马没丢就好。",
      "mood": "neutral"
    }
  ],
  "stable_horsethief/n10_face_wade": [
    {
      "speaker": "crowd",
      "text": "这小贼撞上阎王了，嘿嘿。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "我看那买主的眼神不对劲。",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "老杰克再不来，准要见血。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "偷马的下场，活该。",
      "mood": "smug"
    }
  ],
  "stable_horsethief/n12_threaten_groom": [
    {
      "speaker": "groom",
      "text": "我这把老骨头，什么阵仗没见过。",
      "mood": "angry"
    },
    {
      "speaker": "buyer",
      "text": "这老东西简直不要命。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "那老马夫可从来不吃硬的。",
      "mood": "neutral"
    },
    {
      "speaker": "crowd",
      "text": "赌这把老骨头还能撑多久。",
      "mood": "greedy"
    }
  ],
  "stable_horsethief/n13_help_luke_escape": [
    {
      "speaker": "groom",
      "text": "那个贼跑得比野马还快！",
      "mood": "angry"
    },
    {
      "speaker": "buyer",
      "text": "我的钱……这下全打水漂了。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "眨眼就没影了，真利索。",
      "mood": "shocked"
    },
    {
      "speaker": "crowd",
      "text": "马没了，钱也没了，热闹倒有。",
      "mood": "neutral"
    }
  ],
  "stable_horsethief/n15_fight_groom": [
    {
      "speaker": "crowd",
      "text": "揍他！照脸上招呼！",
      "mood": "greedy"
    },
    {
      "speaker": "groom",
      "text": "尝尝我这老拳的滋味！",
      "mood": "angry"
    },
    {
      "speaker": "buyer",
      "text": "别打了，噢，我的鼻子……",
      "mood": "pain"
    },
    {
      "speaker": "crowd",
      "text": "我押老杰克，下注两块。",
      "mood": "greedy"
    }
  ],
  "stable_horsethief/n16_pay_off": [
    {
      "speaker": "groom",
      "text": "十五块，少一个子儿也不行。",
      "mood": "angry"
    },
    {
      "speaker": "buyer",
      "text": "这简直比抢劫还狠。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "这买卖划得来，掏钱算了。",
      "mood": "greedy"
    },
    {
      "speaker": "crowd",
      "text": "他口袋准有十五块，别装了。",
      "mood": "smug"
    }
  ],
  "well_waterright/st": [
    {
      "speaker": "crowd",
      "text": "我赌五个银币，这井迟早归镇子。",
      "mood": "greedy"
    },
    {
      "speaker": "farmer",
      "text": "这该死的太阳快把俺烤干了。",
      "mood": "angry"
    },
    {
      "speaker": "digger",
      "text": "别傻站着，这井就是我的。",
      "mood": "smug"
    },
    {
      "speaker": "elder",
      "text": "这样耗着，大伙儿都活不成。",
      "mood": "sad"
    }
  ],
  "well_waterright/n_ask_elder": [
    {
      "speaker": "digger",
      "text": "老太婆的话，谁信谁傻瓜。",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "老芬恩在天上看着你呢，孩子。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "这么耗着，水都渗进地底了。",
      "mood": "neutral"
    },
    {
      "speaker": "farmer",
      "text": "玛莎说的没错，这井不是他的。",
      "mood": "angry"
    }
  ],
  "well_waterright/n_search_hall": [
    {
      "speaker": "crowd",
      "text": "铁盒子里，但愿不是老鼠窝。",
      "mood": "scared"
    },
    {
      "speaker": "farmer",
      "text": "快着点，俺的牛等不及了。",
      "mood": "angry"
    },
    {
      "speaker": "digger",
      "text": "就算有纸，我也不认账。",
      "mood": "smug"
    },
    {
      "speaker": "elder",
      "text": "慢些，别弄坏了老物件。",
      "mood": "neutral"
    }
  ],
  "well_waterright/n_present_evidence": [
    {
      "speaker": "digger",
      "text": "这蜡封，八成是你们现做的。",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "孩子，睁眼看看这手印吧。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "老镇长的手印，错不了的！",
      "mood": "shocked"
    },
    {
      "speaker": "farmer",
      "text": "白纸黑字，你还想赖不成？",
      "mood": "angry"
    }
  ],
  "well_waterright/n_force_out": [
    {
      "speaker": "digger",
      "text": "谁上前一步，就吃枪子儿。",
      "mood": "angry"
    },
    {
      "speaker": "farmer",
      "text": "为了口水井，不值得拼命。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "快跑啊，要出人命了！",
      "mood": "scared"
    },
    {
      "speaker": "elder",
      "text": "都别冲动，子弹不长眼。",
      "mood": "scared"
    }
  ],
  "well_waterright/n_burn_deed": [
    {
      "speaker": "farmer",
      "text": "那地契是我爷爷留下的……",
      "mood": "sad"
    },
    {
      "speaker": "digger",
      "text": "现在这井我说了算，伙计。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "这简直是抢劫，光天化日之下！",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "主会看见你的罪，孩子。",
      "mood": "neutral"
    }
  ],
  "well_waterright/n_threat_farmer": [
    {
      "speaker": "farmer",
      "text": "别杀我，我把井让给你……",
      "mood": "scared"
    },
    {
      "speaker": "digger",
      "text": "聪明点，不然子弹不长眼。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "警长会找你算账的！",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "孩子，放下枪，这不是办法。",
      "mood": "neutral"
    }
  ],
  "well_waterright/n_confess_burn": [
    {
      "speaker": "digger",
      "text": "该死的！你这老滑头……",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "孩子，真相就像井水，总会冒出来。",
      "mood": "smug"
    },
    {
      "speaker": "crowd",
      "text": "副本就在教堂，假不了。",
      "mood": "happy"
    },
    {
      "speaker": "farmer",
      "text": "我就知道，地契是烧不掉的。",
      "mood": "happy"
    }
  ],
  "well_waterright/n_admit_lie": [
    {
      "speaker": "digger",
      "text": "你这背信弃义的混蛋！",
      "mood": "angry"
    },
    {
      "speaker": "farmer",
      "text": "地契没烧……你撒谎。",
      "mood": "shocked"
    },
    {
      "speaker": "crowd",
      "text": "骗子被戳穿了，真解气。",
      "mood": "smug"
    },
    {
      "speaker": "elder",
      "text": "无赖的嘴脸，早就看透了。",
      "mood": "neutral"
    }
  ],
  "well_waterright/n_threat_digger": [
    {
      "speaker": "digger",
      "text": "想逞英雄？子弹可不长眼。",
      "mood": "angry"
    },
    {
      "speaker": "farmer",
      "text": "快走，别为我搭上命……",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "我们可不答应，恶棍！",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "主说，动刀的必死于刀下。",
      "mood": "neutral"
    }
  ],
  "well_waterright/n_physically_remove": [
    {
      "speaker": "digger",
      "text": "该死的，我的胳膊断了！",
      "mood": "pain"
    },
    {
      "speaker": "crowd",
      "text": "打断他的腿！",
      "mood": "angry"
    },
    {
      "speaker": "farmer",
      "text": "你这畜生，松开手！",
      "mood": "angry"
    },
    {
      "speaker": "elder",
      "text": "别打了，警长要来了！",
      "mood": "scared"
    }
  ],
  "well_waterright/n_duel": [
    {
      "speaker": "digger",
      "text": "你的手在抖，怕了？",
      "mood": "smug"
    },
    {
      "speaker": "farmer",
      "text": "我不想死，伙计。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "快拔枪啊，磨蹭啥！",
      "mood": "greedy"
    },
    {
      "speaker": "elder",
      "text": "午时还没到，别急。",
      "mood": "neutral"
    }
  ],
  "doctor_triage/st": [
    {
      "speaker": "miner",
      "text": "这该死的腿疼死我了，快做决定！",
      "mood": "pain"
    },
    {
      "speaker": "mother",
      "text": "我的孩子脸色发青，上帝啊！",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "医生又得选一个救，真倒霉。",
      "mood": "neutral"
    },
    {
      "speaker": "doc",
      "text": "总是这样，我恨这样的选择。",
      "mood": "sad"
    }
  ],
  "doctor_triage/q1": [
    {
      "speaker": "doc",
      "text": "塔克，你的腿伤得不轻，骨头碎了。",
      "mood": "neutral"
    },
    {
      "speaker": "miner",
      "text": "快用夹板固定，我还能走。",
      "mood": "pain"
    },
    {
      "speaker": "mother",
      "text": "可怜的小比利，他还在流血。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "我出五美元赌矿工先救。",
      "mood": "greedy"
    }
  ],
  "doctor_triage/ask_miner": [
    {
      "speaker": "doc",
      "text": "你的说辞变来变去，我不信。",
      "mood": "angry"
    },
    {
      "speaker": "miner",
      "text": "疼死我了，别管那破事了！",
      "mood": "pain"
    },
    {
      "speaker": "crowd",
      "text": "矿工在撒谎，我看得出来。",
      "mood": "smug"
    },
    {
      "speaker": "mother",
      "text": "他的眼睛不敢看我，有鬼。",
      "mood": "angry"
    }
  ],
  "doctor_triage/check_child": [
    {
      "speaker": "mother",
      "text": "宝贝，睁开眼睛看看妈妈。",
      "mood": "sad"
    },
    {
      "speaker": "doc",
      "text": "孩子昏迷不醒，情况很糟。",
      "mood": "scared"
    },
    {
      "speaker": "miner",
      "text": "别管孩子了，先救我！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "那匹马的事还没说清呢。",
      "mood": "neutral"
    }
  ],
  "doctor_triage/ask_mother": [
    {
      "speaker": "mother",
      "text": "我亲眼看见他骑那匹栗色马！",
      "mood": "angry"
    },
    {
      "speaker": "miner",
      "text": "这疯女人，我根本不认识她。",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "警长应该来查查这马的事。",
      "mood": "neutral"
    },
    {
      "speaker": "doc",
      "text": "这事不对劲，我需要警长。",
      "mood": "shocked"
    }
  ],
  "doctor_triage/truth_reveal": [
    {
      "speaker": "doc",
      "text": "偷马贼的腿和孩子的命，没法两全。",
      "mood": "angry"
    },
    {
      "speaker": "miner",
      "text": "我没偷马！那畜生自己发疯。",
      "mood": "angry"
    },
    {
      "speaker": "mother",
      "text": "比利才七岁，你这天杀的！",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "老医生，快做决定吧。",
      "mood": "neutral"
    }
  ],
  "doctor_triage/side_miner": [
    {
      "speaker": "miner",
      "text": "好伙计，我就知道你有种。",
      "mood": "happy"
    },
    {
      "speaker": "mother",
      "text": "求你了，先生，救救我孩子。",
      "mood": "sad"
    },
    {
      "speaker": "doc",
      "text": "上帝，这担子太重了。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "矿工帮过镇上，别忘恩。",
      "mood": "neutral"
    }
  ],
  "doctor_triage/side_mother": [
    {
      "speaker": "mother",
      "text": "上帝保佑你，好心先生。",
      "mood": "happy"
    },
    {
      "speaker": "miner",
      "text": "该死的！我的腿废了！",
      "mood": "angry"
    },
    {
      "speaker": "doc",
      "text": "也许能保住孩子……也许。",
      "mood": "scared"
    },
    {
      "speaker": "crowd",
      "text": "救孩子，那是条小命。",
      "mood": "neutral"
    }
  ],
  "doctor_triage/insist_miner": [
    {
      "speaker": "miner",
      "text": "哈哈，这夹板真结实。",
      "mood": "happy"
    },
    {
      "speaker": "doc",
      "text": "上帝宽恕我，我罪孽深重。",
      "mood": "sad"
    },
    {
      "speaker": "mother",
      "text": "比利，不，醒醒……",
      "mood": "pain"
    },
    {
      "speaker": "crowd",
      "text": "孩子没动静了，天哪。",
      "mood": "shocked"
    }
  ],
  "doctor_triage/whiskey_miner": [
    {
      "speaker": "miner",
      "text": "再来一口……够劲儿……",
      "mood": "happy"
    },
    {
      "speaker": "doc",
      "text": "醉过去兴许能少受罪。",
      "mood": "neutral"
    },
    {
      "speaker": "mother",
      "text": "我的比利……他冷了。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "那孩子怕是撑不住了。",
      "mood": "sad"
    }
  ],
  "doctor_triage/threat_mother": [
    {
      "speaker": "crowd",
      "text": "这娘们可不含糊。",
      "mood": "smug"
    },
    {
      "speaker": "miner",
      "text": "外地佬，你惹错人了。",
      "mood": "angry"
    },
    {
      "speaker": "mother",
      "text": "再废话连你一起收拾。",
      "mood": "angry"
    },
    {
      "speaker": "doc",
      "text": "别在这儿闹，该死的。",
      "mood": "scared"
    }
  ],
  "doctor_triage/watch1": [
    {
      "speaker": "mother",
      "text": "别指望我求饶。",
      "mood": "angry"
    },
    {
      "speaker": "doc",
      "text": "时间不等人啊。",
      "mood": "sad"
    },
    {
      "speaker": "crowd",
      "text": "这外地人真沉得住气。",
      "mood": "neutral"
    },
    {
      "speaker": "miner",
      "text": "我宁可疼死也不让。",
      "mood": "pain"
    }
  ],
  "doctor_triage/watch2": [
    {
      "speaker": "crowd",
      "text": "要打起来了！",
      "mood": "shocked"
    },
    {
      "speaker": "doc",
      "text": "该死的，别洒了！",
      "mood": "scared"
    },
    {
      "speaker": "miner",
      "text": "松手，你这婆娘！",
      "mood": "angry"
    },
    {
      "speaker": "mother",
      "text": "我孩子的命全靠它！",
      "mood": "scared"
    }
  ],
  "doctor_triage/draw_gun": [
    {
      "speaker": "mother",
      "text": "你吓唬谁呢？",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "警长呢？",
      "mood": "scared"
    },
    {
      "speaker": "doc",
      "text": "都别动，冷静点。",
      "mood": "scared"
    },
    {
      "speaker": "miner",
      "text": "你的枪可没我快。",
      "mood": "smug"
    }
  ],
  "doctor_triage/gun_standoff": [
    {
      "speaker": "doc",
      "text": "都冷静点。",
      "mood": "scared"
    },
    {
      "speaker": "miner",
      "text": "我的手指可痒痒。",
      "mood": "smug"
    },
    {
      "speaker": "mother",
      "text": "开枪啊，懦夫。",
      "mood": "angry"
    },
    {
      "speaker": "crowd",
      "text": "这下真僵住了。",
      "mood": "shocked"
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
  },
  "saloon_triangle": {
    "center": {
      "suitorA": [
        "该死的，别碰她！",
        "谁敢动萝丝我就送谁见上帝！"
      ],
      "suitorB": [
        "嘿，对女人动手可不算好汉！",
        "把你的蹄子从她身上拿开！"
      ],
      "confidant": [
        "快住手，我去喊警长！",
        "看在老天份上，别在酒馆惹事！"
      ]
    },
    "suitorA": {
      "center": [
        "比利，快躲开！",
        "哦，上帝，你会被打死的！"
      ],
      "suitorB": [
        "哈，得州小子也有今天！",
        "揍他，让他知道谁才是老大！"
      ],
      "confidant": [
        "到外面打去，别砸坏我的吧台！",
        "这下可有好戏看了！"
      ]
    },
    "suitorB": {
      "center": [
        "费恩，别硬撑，快跑！",
        "别打了，求求你们！"
      ],
      "suitorA": [
        "赌鬼，这拳是替你欠的债还的！",
        "哼，你早该挨这顿揍了！"
      ],
      "confidant": [
        "他的钱袋还押在我这儿呢！",
        "悠着点，别把人打残了！"
      ]
    },
    "confidant": {
      "center": [
        "山姆大叔！你们怎么连他也打？",
        "噢，别伤着酒保！"
      ],
      "suitorA": [
        "嘿，他只是个倒酒的，别冲他撒气！",
        "麻烦找错人了，伙计！"
      ],
      "suitorB": [
        "打酒保算什么本事？",
        "扶他起来，该死的！"
      ]
    }
  },
  "street_pickpocket": {
    "thief": {
      "victim": [
        "活该，你这该死的扒手！绞索等着你呢！",
        "警长！这崽子偷我的钱袋！"
      ],
      "witness": [
        "打得好！给他点颜色看看！",
        "这种人就该吃鞭子！"
      ]
    },
    "victim": {
      "thief": [
        "把钱袋交出来，不然吃子弹！",
        "别动，伙计，不然打破你的头！"
      ],
      "witness": [
        "来人啊！有人抢劫！",
        "住手，你这恶棍！警长快来！"
      ]
    },
    "witness": {
      "thief": [
        "少管闲事，老东西，不然揍你！",
        "滚开，不然把你扔进马槽！"
      ],
      "victim": [
        "别碰她，冲我来，你这混蛋！",
        "欺负女士算什么好汉！"
      ]
    }
  },
  "bank_bounty": {
    "hunter": {
      "suspect": [
        "哈，神枪手也有今天！",
        "快，趁现在我得溜走！"
      ],
      "clerk": [
        "天哪，摩根先生！",
        "别在银行台阶上流血！"
      ]
    },
    "suspect": {
      "hunter": [
        "抓住他，别让杀人犯跑了！",
        "你要是反抗，子弹可不长眼！"
      ],
      "clerk": [
        "上帝，别弄脏我的台阶！",
        "警长马上就到，住手！"
      ]
    },
    "clerk": {
      "hunter": [
        "嘿，对芬奇先生放尊重点！",
        "敢动银行的人，绞索等着你！"
      ],
      "suspect": [
        "打商人可不算好汉。",
        "快跑吧，趁我没改变主意。"
      ]
    }
  },
  "stable_horsethief": {
    "groom": {
      "thief": [
        "嘿，住手！他可经不住打，老家伙。",
        "打老人算什么好汉，放开他！"
      ],
      "buyer": [
        "放开那老人，否则我的子弹不长眼！",
        "欺负老人家？你该上绞索！"
      ]
    },
    "thief": {
      "groom": [
        "伙计们，偷马贼就该挨鞭子！",
        "打断他的腿，看他还敢偷马！"
      ],
      "buyer": [
        "没错，这贼骨头该受绞刑！",
        "狠狠揍，让他记住这教训！"
      ]
    },
    "buyer": {
      "groom": [
        "外地佬，这里不是你撒野的地方！",
        "打得好，这骗子活该被教训！"
      ],
      "thief": [
        "哈，看来你惹错人了，先生！",
        "快跑，警长来了可没好果子！"
      ]
    }
  },
  "well_waterright": {
    "farmer": {
      "digger": [
        "瞧这软蛋，连桶都拿不稳！",
        "早该让你尝尝砂金的滋味！"
      ],
      "elder": [
        "住手！你这该死的恶棍！",
        "欺负老实人算什么好汉？"
      ]
    },
    "digger": {
      "farmer": [
        "打得好！再给他一拳！",
        "让你霸占水！这就是下场！"
      ],
      "elder": [
        "别打了，会出人命的！",
        "快去找警长，这里要乱套了！"
      ]
    },
    "elder": {
      "farmer": [
        "敢动老人家？我跟你拼了！",
        "你这是要上绞刑架的！"
      ],
      "digger": [
        "我不是故意的，别过来！",
        "快跑，别惹麻烦！"
      ]
    }
  },
  "doctor_triage": {
    "doc": {
      "miner": [
        "嘿，别碰医生！他救过我的命！",
        "快住手，伙计！医生没做错什么！"
      ],
      "mother": [
        "放过医生，你这暴徒！",
        "你这个疯子，离医生远点！"
      ]
    },
    "miner": {
      "doc": [
        "离他远点，你这懦夫！",
        "再动他一下，我叫全镇的人来！"
      ],
      "mother": [
        "欺负伤员，你真可耻！",
        "你这个没胆的，只会欺负伤者！"
      ]
    },
    "mother": {
      "doc": [
        "敢动这位女士，我宰了你！",
        "我警告你，马上离她远点！"
      ],
      "miner": [
        "别碰她，你这杂种！",
        "你敢再碰她，我拼了这条命！"
      ]
    }
  }
};
