// StockNewsService.js — 股市新闻 + 小道消息 + 玩家行为影响（P13）。
//
// 三个职责：
//   ① 用 DS（flash）生成股市新闻 → 报纸
//   ② 生成"提前一天"的小道消息（手机消息，暗示明天某支股票要涨/跌）
//   ③ 玩家行为影响：在商铺杀人 → 对应股票第二天下跌（settleDay 时应用）
//
// 与 StockMarket.settleDay 配合：本服务负责"理由 + 情报"，settleDay 负责按
// 消息敏感度算价格。玩家行为影响单独走一个事件日志 → settleDay 读取。

const ENDPOINT = "/api/llm/chat";
const TIMEOUT_MS = 60000;

/** 商铺 → 受影响股票 的映射（在哪个铺子搞事，伤哪支股） */
export const VENUE_STOCK = {
  赌场: "bank", 银行: "bank", 杂货店: "farm", 餐馆: "farm", 裁缝铺: "farm",
  酒馆: "farm", 旅馆: "farm", 枪械店: "arms", 铁匠铺: "arms", 医馆: "farm",
  马厩: "rail", 报社: "rail", 仓库: "mine", 教堂: "farm", 理发店: "farm", 邮局: "bank",
};

/** 每支股票在每种"玩家事件"下的额外涨跌（数值直接加进 settleDay） */
export const PLAYER_ACTION_STOCK_IMPACT = {
  kill: { bank: -0.05, arms: 0.03, rail: -0.02, mine: -0.01, farm: -0.03 },
  robbery: { bank: -0.04, arms: 0.02, farm: -0.02, mine: -0.01 },
  burglary: { bank: -0.02, rail: -0.01, farm: -0.01 },
};

export class StockNewsService {
  constructor(deps = {}) {
    this.worldState = deps.worldState;
    this.newspaper = deps.newspaper || null;
    this.phone = deps.phone || null;
    this.rng = deps.rng || Math.random;
    this.log = deps.log || (() => {});
    this.lastVia = "-";
    this.lastMs = 0;
    this.lastError = null;
  }

  /** 库存（每支股的故事模板，DS 不可用时兜底） */
  static TEMPLATES = {
    mine: {
      up: ["银矿新掘出一处富脉，矿工们连夜开工", "银矿宣布扩大开采，产能将翻倍"],
      down: ["银矿塌方，一天停产", "矿脉品位下降，银矿利润承压"],
      hint: ["听说银矿要扩产了，我有点想买", "矿上的人说最近出货不畅，不太妙"],
    },
    rail: {
      up: ["铁路公司拿下新线路运营权", "货运量激增，铁路盈利超预期"],
      down: ["铁路工人罢工，班次延误", "铁路桥梁维修，运力受限"],
      hint: ["铁路要通新线了，趁早", "铁路那边罢工呢，别碰"],
    },
    bank: {
      up: ["银行放贷回暖，季报亮眼", "银行获大额存款，资金充裕"],
      down: ["银行坏账增加，准备金吃紧", "镇上传银行要收紧放贷"],
      hint: ["银行这阵子生意不错", "听说银行不太稳，我先撤了"],
    },
    arms: {
      up: ["枪械厂订单爆满，供不应求", "镇上治安变差，枪械销量大涨"],
      down: ["枪械厂原料短缺，减产在即", "枪械滞销，仓库积压"],
      hint: ["这阵子买枪的人多，军工要涨", "枪厂要减产了，别买"],
    },
    farm: {
      up: ["风调雨顺，庄稼长势喜人", "农场收成预期上调"],
      down: ["干旱来袭，收成堪忧", "农产品价格暴跌，农场受损"],
      hint: ["今年年景好，农业稳", "旱了，农业要亏"],
    },
  };

  /** 某支股票当前价 */
  price(id) {
    return this.worldState.state.stockPrices?.[id]?.currentPrice ?? null;
  }

  /**
   * 用 DS 生成今天的股市新闻 + 明天的风向提示。
   * 生成失败时用模板兜底，保证每天都有话可说。
   * @returns {{news:{title,body}, rumor:{from,text,stockId,direction}}}
   */
  async generate(day, forceDirection = null) {
    const stocks = Object.keys(StockNewsService.TEMPLATES);
    const target = stocks[Math.floor(this.rng() * stocks.length)];
    const direction = forceDirection || (this.rng() < 0.5 ? "up" : "down");

    // 先试试 DS
    const viaLLM = await this._tryLLM(day, target, direction);
    if (viaLLM) return viaLLM;

    // 兜底：模板
    const t = StockNewsService.TEMPLATES[target][direction];
    const name = this._stockName(target);
    return {
      news: { title: t[0], body: `据本镇消息，${name}${direction === "up" ? "前景向好" : "近期承压"}。持有${name}的镇民需留意明日的波动。`, stockId: target, direction },
      rumor: { from: this._randomRumorFrom(), text: t[1], stockId: target, direction },
    };
  }

  async _tryLLM(day, stockId, direction) {
    const t0 = Date.now();
    const name = this._stockName(stockId);
    const user = `你是西部小镇《边城》里写股市八卦的报道员。
请为今天生成 1 条股市新闻 + 1 条明天的"提前透露"小道消息，主题是【${name}】并且方向是【${direction === "up" ? "看涨" : "看跌"}】。

只输出 JSON：
{"news_title":"一句话新闻标题，20字内，口语、西部味","news_body":"两三句展开","rumor":"一句镇民私下说的话，暗示明天这支股票的方向，20字内，带人味"}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let resp;
      try {
        resp = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "你在为一款美国西部小镇游戏生成股市报纸新闻。严格只输出 JSON，不要代码块。风格：19世纪美国西部口语。禁止现代词汇。" },
              { role: "user", content: user },
            ],
            temperature: 0.8,
            max_tokens: 800,
            reasoning_effort: "low",
          }),
          signal: ctrl.signal,
        });
      } finally { clearTimeout(timer); }
      if (!resp.ok) throw new Error("LLM " + resp.status);
      const data = await resp.json();
      const msg = data?.choices?.[0]?.message || {};
      const raw = msg.content || msg.reasoning_content || "";
      const parsed = StockNewsService._extractJson(raw);
      if (!parsed) throw new Error("解析失败");
      if (!parsed.news_title || !parsed.news_body || !parsed.rumor) throw new Error("字段不全");
      this.lastVia = "llm";
      this.lastMs = Date.now() - t0;
      this.lastError = null;
      this.log(`[StockNews] LLM: ${parsed.news_title}`);
      return {
        news: { title: parsed.news_title, body: parsed.news_body, stockId, direction },
        rumor: { from: this._randomRumorFrom(), text: parsed.rumor, stockId, direction },
      };
    } catch (e) {
      this.lastVia = "rule";
      this.lastMs = Date.now() - t0;
      this.lastError = e?.message || String(e);
      this.log(`[StockNews] LLM 失败走模板: ${e?.message}`);
      return null;
    }
  }

  _stockName(id) {
    return { mine: "银矿股份", rail: "铁路股份", bank: "银行股份", arms: "枪械股份", farm: "农业股份" }[id] || id;
  }

  _randomRumorFrom() {
    const names = ["酒保老崔", "铁匠老金", "赌场伙计", "马厩的瘦子", "杂货店老板娘", "邮差小李"];
    return names[Math.floor(this.rng() * names.length)];
  }

  static _extractJson(raw) {
    const s = String(raw).replace(/```json|```/g, "").trim();
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i < 0 || j <= i) return null;
    try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
  }

  /**
   * 每日调用：生成新闻进报纸、小道消息进手机。
   * @param day
   * @param rumorContactNpcId 收到小道消息的 NPC 联系人（随机一个）
   */
  async settleDaily(day, rumorContactNpcId = null) {
    if (!this.worldState?.state) return null;
    const result = await this.generate(day);
    if (!result) return null;

    // 报纸
    if (this.newspaper?.publishCustom) {
      this.newspaper.publishCustom(result.news.title, result.news.body, { category: "stock", time: `第 ${day} 天` });
    }
    // 小道消息 → 手机（提前一天的暗示）
    if (this.phone?.deliverMessage && rumorContactNpcId) {
      this.phone.deliverMessage(rumorContactNpcId, result.rumor.from, result.rumor.text, {});
    }
    // 记到世界状态，供 settleDay 下一轮读取（本轮的新闻影响今天，小道消息影响明天）
    if (!this.worldState.state.stockNews) this.worldState.state.stockNews = {};
    this.worldState.state.stockNews.last = { day, ...result, rumorDeliveredTo: rumorContactNpcId };
    return result;
  }

  /**
   * 记录一次玩家行为对股市的影响（在商铺杀人/抢劫等）。
   * @param action 'kill'|'robbery'|'burglary'
   * @param venue 中文商铺名（VENDUE_STOCK 里取股票）
   */
  recordPlayerAction(action, venue) {
    if (!this.worldState?.state) return;
    const stockId = VENUE_STOCK[venue];
    if (!stockId) return;
    const impact = PLAYER_ACTION_STOCK_IMPACT[action]?.[stockId] || 0;
    if (!impact) return;
    if (!this.worldState.state.stockNews) this.worldState.state.stockNews = {};
    if (!this.worldState.state.stockNews.playerActions) this.worldState.state.stockNews.playerActions = [];
    this.worldState.state.stockNews.playerActions.push({ stockId, impact, venue, action, day: this.worldState.state.day });
    // 保留最近 10 条
    const arr = this.worldState.state.stockNews.playerActions;
    if (arr.length > 10) arr.splice(0, arr.length - 10);
  }

  /** settleDay 里调：把玩家行为影响算进去（每支股累计） */
  playerActionDelta() {
    const news = this.worldState?.state?.stockNews;
    if (!news?.playerActions?.length) return {};
    const delta = {};
    for (const a of news.playerActions) {
      delta[a.stockId] = (delta[a.stockId] || 0) + a.impact;
    }
    return delta;
  }

  /** settleDay 后清空玩家行为影响（只影响当天） */
  clearPlayerActions() {
    if (this.worldState?.state?.stockNews) {
      this.worldState.state.stockNews.playerActions = [];
    }
  }
}
