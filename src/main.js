// main.js — 启动装配：串起 core / world / entities / systems / ui 与主循环。
// P0+: 新增 simulation 层（WorldClock / WorldState / DailySimulation / EventLog / PlayerCondition）

import * as THREE from "three";
import { Engine } from "./core/Engine.js";
import { Sky } from "./core/Sky.js";
import { Town } from "./world/Town.js";
import { Interiors } from "./world/Interiors.js";
import { Player } from "./entities/Player.js";
import { SheriffSquad } from "./entities/SheriffSquad.js";
import { NPCManager } from "./systems/NPCManager.js";
import { Combat } from "./systems/Combat.js";
import { Loot, LootType } from "./systems/Loot.js";
import { Economy } from "./systems/Economy.js";
import { VehicleManager } from "./systems/Vehicle.js";
import { Reputation } from "./systems/Reputation.js";
import { AudioManager } from "./systems/Audio.js";
import { HUD } from "./ui/HUD.js";
import { Dialogue } from "./ui/Dialogue.js";
import { Phone } from "./ui/Phone.js";
import { Newspaper } from "./ui/Newspaper.js";
import { Conversation } from "./ui/Conversation.js";
import { Minimap } from "./ui/Minimap.js";
import { Gangs } from "./ui/Gangs.js";
import { SlotMachine } from "./ui/SlotMachine.js";
import { Baccarat } from "./ui/Baccarat.js";
import { WORLD, SHERIFF, DIALOGUE_REPLY, SHOP_ITEMS } from "./config/gameData.js";
import { State, AIBrain } from "./systems/AIBrain.js";

// P0+ 新系统
import { WorldClock } from "./simulation/WorldClock.js";
import { WorldState } from "./simulation/WorldState.js";
import { SaveSystem } from "./simulation/SaveSystem.js";
import { PlayerCondition } from "./simulation/PlayerCondition.js";
import { EventLog } from "./simulation/EventLog.js";
import { DailySimulation } from "./simulation/DailySimulation.js";
// P1 势力系统
import { FactionSystem } from "./factions/FactionSystem.js";
import { OperationSystem } from "./factions/OperationSystem.js";
// P2 NPC 系统
import { NPCRegistry } from "./npcs/NPCRegistry.js";
import { RelationshipSystem } from "./npcs/RelationshipSystem.js";
import { KnowledgeSystem } from "./npcs/KnowledgeSystem.js";
// P3 StoryTree
import { StoryRuntime } from "./story/StoryRuntime.js";
// P4 Director
import { Director } from "./director/Director.js";
import { DeliveryPlanner } from "./director/DeliveryPlanner.js";
// P5 LLM
import { NarrativeService } from "./llm/NarrativeService.js";
// Phase 4 新系统
import { TaskSystem } from "./systems/TaskSystem.js";
import { StockMarket } from "./ui/StockMarket.js";
import { InteractionSystem } from "./systems/InteractionSystem.js";
import { getPortrait, getAvatar } from "./config/portraits.js";
import { NARRATIVE_ITEMS, NPC_POCKET_NARRATIVES, HOME_STASH_NARRATIVES } from "./config/narrativeItems.js";
// AI 剧场（街头事件）
import { TheaterDirector } from "./theater/TheaterDirector.js";
import { GLUE_GEN } from "./theater/TheaterGlue.js";
import { TheaterUI } from "./theater/TheaterUI.js";
import { TheaterAftermath } from "./theater/TheaterAftermath.js";
import { THEATER_TREES, STORY_TREE_LIST } from "./config/theaterData.js";
import { ConsequenceSystem } from "./theater/ConsequenceSystem.js";
// NPC 自由对话 + LLM 行为决策
import { NpcChatService, ChatBudget, CHAT_GEN } from "./npc/NpcChatService.js";
import { NpcActionExecutor } from "./npc/NpcActionExecutor.js";
import { AiLog } from "./systems/AiLog.js";
// 统一遭遇管线：NPC 主动来找玩家 → 中央强决策弹窗（世界暂停）
import { EncounterRuntime } from "./encounter/EncounterRuntime.js";
import { SubdueSystem } from "./encounter/SubdueSystem.js";
import { MicroEventSystem } from "./event/MicroEventSystem.js";
import { PairChatSystem } from "./event/PairChatSystem.js";
import { NemesisSystem } from "./factions/NemesisSystem.js";
import { LawSystem } from "./factions/LawSystem.js";
import { BusinessSystem } from "./factions/BusinessSystem.js";
import { PlayerOrgSystem } from "./factions/PlayerOrgSystem.js";
import { GangGroupChat } from "./factions/GangGroupChat.js";
import { StockNewsService } from "./factions/StockNewsService.js";
import { MessageGovernor } from "./systems/MessageGovernor.js";
import { OrgChartUI } from "./ui/OrgChartUI.js";
import { LawUI } from "./ui/LawUI.js";
import { BusinessUI } from "./ui/BusinessUI.js";
import { EncounterUI } from "./ui/EncounterUI.js";
import { AmmoSystem } from "./systems/AmmoSystem.js";
import { CorpseReactions } from "./systems/CorpseReactions.js";
// 战斗阵营（敌/友）与血条
import { CombatFactions } from "./systems/CombatFactions.js";
import { HealthBars } from "./ui/HealthBars.js";
import { EmojiPops } from "./ui/EmojiPops.js";
import { Cutscene } from "./ui/Cutscene.js";
import { getBeatText } from "./config/storyBeatText.js";
import { resolveVenue, inferVenueId } from "./config/storyVenues.js";
import { playMoodFx } from "./npc/MoodFx.js";

function boot() {
  const canvas = document.getElementById("scene");
  const engine = new Engine(canvas);
  const { scene, camera, input } = engine;

  // 世界
  const sky = new Sky(scene);
  const town = new Town(scene);
  const interiors = new Interiors(scene);
  // 为每栋民居建室内房间（床/壁炉/藏物柜）
  for (const home of town.homes) interiors.addNpcHomeRoom(home);
  // 室内闲聊语料：日常 + 传闻 + 报纸头条
  interiors.setChatter(DIALOGUE_REPLY.tip, () => newspaper.articles.slice(0, 4).map((a) => a.title));

  // 系统 / 实体
  const audio = new AudioManager();
  const player = new Player(scene, town);
  const npcManager = new NPCManager(scene, town, WORLD.npcCount, interiors); // NPC 数量来自配置
  const economy = new Economy();
  const reputation = new Reputation();
  const loot = new Loot(scene);
  const vehicles = new VehicleManager(scene, town);

  // ===== P0+ 新系统：跨日世界（必须在 UI 之前初始化，UI 依赖这些）=====
  const worldState = new WorldState();
  const worldClock = new WorldClock(sky, worldState);
  const saveSystem = new SaveSystem(worldState);
  const playerCondition = new PlayerCondition();
  const eventLog = new EventLog(worldState);

  // P1 势力系统
  const factionSystem = new FactionSystem(worldState);
  const operationSystem = new OperationSystem(factionSystem, worldState);

  // P2 NPC 系统
  const npcRegistry = new NPCRegistry(worldState);
  npcManager.linkRegistry(npcRegistry); // 链接重要 NPC 注册表，启用个性化招呼
  const relationshipSystem = new RelationshipSystem(worldState);
  const knowledgeSystem = new KnowledgeSystem(worldState);

  // P4 Nemesis：黑蹄会的人事图（职级 / 直属上级 / 晋升顶替 / 双向卧底 / 怀疑度）。
  // 必须在 npcRegistry 之后 —— 它要用 ensureRecord 给中下层岗位造人。
  // 反向挂到 factionSystem 上，让 checkVictory 能读到"渗透路线"的进度。
  const nemesis = new NemesisSystem({
    worldState, npcRegistry, factionSystem, eventLog,
    log: (t) => eventLog?.record?.({ type: "NEMESIS_LOG", facts: { text: t }, tags: ["nemesis"] }),
  });
  factionSystem.nemesis = nemesis;

  // P5 警长势力：三角关系的第三方。他不是玩家通缉度的惩罚模块 ——
  // 有自己的四根支柱（威信/人手/证据/廉洁），一上来廉洁就只有 30
  // （赫克托挂着 compromised 标签，与塞拉斯签过停战协议）。
  // 玩家喂证据让他查黑蹄会，黑蹄会塞钱让他睁眼瞎。
  const law = new LawSystem({
    worldState, factionSystem, nemesis, npcRegistry, reputation,
    log: (t) => eventLog?.record?.({ type: "LAW_LOG", facts: { text: t }, tags: ["law"] }),
  });

  // P7 产业经营：和平（投资）与暴力（抢夺）两条路。挂在 DailySimulation 上做日结算。
  const businessSystem = new BusinessSystem({
    worldState, factionSystem, nemesis, npcRegistry,
    log: (t) => eventLog?.record?.({ type: "BIZ_LOG", facts: { text: t }, tags: ["biz"] }),
  });

  // P11 玩家自己帮派的人事图 + 任命（任命后发短信）—— 在 phone/hud 之后装配
  // （见 phone 创建处）

  // UI
  const hud = new HUD(economy, reputation);
  const dialogue = new Dialogue(camera);
  const phone = new Phone(worldState);
  const newspaper = new Newspaper(audio);
  const conversation = new Conversation(audio);
  const minimap = new Minimap(town);
  nemesis.hud = hud;                     // Nemesis 要弹 toast（构造时 hud 还没有）
  law.hud = hud;
  businessSystem.hud = hud;

  // 初始塞一两个帮派成员 + 好友：让势力剧场/召集/选角一开始就有"自己人"可用
  seedInitialAllies();

  // P11 玩家自己帮派的人事图 + 任命（任命后发短信）+ 帮派群聊
  const playerOrg = new PlayerOrgSystem({
    worldState, factionSystem, npcRegistry,
    phone, hud,
    log: (t) => eventLog?.record?.({ type: "PLAYERORG_LOG", facts: { text: t }, tags: ["playerorg"] }),
  });
  const gangGroup = new GangGroupChat({
    worldState, phone, factionSystem, npcRegistry, hud,
  });
  businessSystem.playerOrg = playerOrg;  // 账房任命加成（账房坐镇 → 产业收益 +10%）

  // 人事图 / 警长 / 产业：不再是独立弹窗，而是嵌进帮派面板的 tab（O / K 键直接开对应 tab）
  const orgChartUI = new OrgChartUI({
    nemesis,
    playerOrg, law, npcRegistry, factionSystem, worldState,
    // 认识系统：人事图里没接触过的人显示？？？
    displayNameOf: (npcId) => {
      if (!npcId) return "—";
      if (_knowsNpc(npcId)) return npcRegistry.get(npcId)?.displayName || npcId;
      const job = npcRegistry.get(npcId)?.job || "";
      return job ? `？？？·${job}` : "？？？";
    },
    getGangReps: () => reputation?.gangs || null,
    getWantedStars: () => reputation?.wantedStars ?? null,
    onAppoint: (npcId, roleId) => {
      const r = playerOrg.appoint(npcId, roleId);
      if (!r.ok) hud.toast?.(`❌ ${r.error === "not_member" ? "还不是你的人" : "任命失败"}`, { key: "appoint", duration: 3000 });
    },
    getPillars: () => factionSystem.getBlackHoofPillars(),
  });
  const lawUI = new LawUI({
    law,
    onAction: (actId) => {
      const r = law.playerAction(actId);
      if (r.ok) {
        hud.toast?.(`⚖ ${{
          feed_evidence: "证据已交给警长",
          turn_in_thug: "你把逃犯交了出去",
          back_publicly: "你公开站在警长一边",
          expose_truce: "停战协议见报了",
          bribe_sheriff: "钱递过去了",
        }[actId] || "已办"}`, { key: "law-act", duration: 3600 });
      }
    },
  });
  // 产业经营 tab：投资（和平）直接扣钱包，抢夺走遭遇弹窗做数值结算
  const businessUI = new BusinessUI({
    business: businessSystem,
    factionSystem, npcRegistry,
    onInvest: (bizId, tier) => {
      const r = businessSystem.invest(bizId, tier, {
        money: economy.money,
        spend: (amt) => economy.addMoney(-amt),
      });
      if (!r.ok) {
        hud.toast?.(`❌ ${r.error === "no_money" ? "钱不够" : r.error === "enemy_cannot_buy" ? "黑蹄会的产业只能抢" : "操作失败"}`, { key: "biz-invest", duration: 3200 });
      } else {
        hud.toast?.(`✅ ${r.ownerChanged ? `买下了产业` : `已入股（持股 ${Math.round(r.share * 100)}%）`}`, { key: "biz-invest", duration: 3200 });
      }
    },
    onRaid: (bizId) => {
      const biz = businessSystem.getBusiness(bizId);
      if (!biz) return;
      const nMembers = factionSystem.getOpenMembers().length;
      const basePower = 30 + nMembers * 12 + Math.round(player.health / 10); // 玩家状态当战力
      const defense = biz.owner === "black_hoof"
        ? (factionSystem.getPillarValue("manpower") * 0.5 + factionSystem.getPillarValue("territory") * 0.3 + (worldState.state.factions.black_hoof.heat || 0) * 0.2)
        : 25;
      const est = basePower / (basePower + Math.max(5, defense));
      const estLabel = est >= 0.62 ? "优势" : est >= 0.42 ? "势均力敌" : "劣势";
      const players = [1, 2, 3, 5];
      const memberWarning = nMembers === 0
        ? "（你还没有明面成员，人手全靠自己）"
        : `（你有 ${nMembers} 个明面成员）`;
      encounterUI.open({
        name: biz.name,
        sub: `抢夺 · ${estLabel}（预估战力 $${Math.round(basePower)}）${memberWarning}`,
        beats: [
          `你带人站在${biz.name}门口。里面是${biz.owner === "black_hoof" ? "黑蹄会的人" : "几个看店伙计"}。`,
          `要看你的胆子和人手了。`,
        ],
        choices: players.map((n) => ({
          id: "raid:" + n,
          label: `投入 ${n} 人`,
          risk: n >= 3 ? "high" : n >= 2 ? "mid" : "low",
          note: n >= 3 ? "人多势众但动静大" : "轻装快袭",
        })),
        onChoice: (choiceId) => {
          if (!choiceId || !choiceId.startsWith("raid:")) { businessUI.refresh(); return; }
          const n = +choiceId.split(":")[1];
          const power = 30 + n * 12 + Math.round(player.health / 10);
          const r = businessSystem.raid(bizId, power);
          if (r.ok) {
            hud.toast?.(r.success ? `🏴 抢下了${biz.name}！` : `💥 抢夺失败，损失 $${r.moneyLost}`, { key: "biz-raid", duration: 4200 });
            if (r.success) reputation.addWanted(15);
          } else if (r.error) {
            hud.toast?.(`❌ ${r.error === "already_owned" ? "这家已经是你的了" : "抢夺失败"}`, { key: "biz-raid", duration: 3200 });
          }
          businessUI.refresh();
        },
      });
    },
    onAssign: (bizId, postIdx, npcId) => {
      if (!npcId) { hud.toast?.("❌ 没有可派的明面成员", { key: "biz-assign", duration: 2600 }); return; }
      const r = businessSystem.assignPost(bizId, postIdx, npcId);
      if (r.ok) hud.toast?.(`✅ 已派人上岗`, { key: "biz-assign", duration: 2600 });
    },
    onUpgrade: (bizId) => {
      const r = businessSystem.upgrade(bizId);
      if (!r.ok) hud.toast?.(`❌ ${r.error === "no_money" ? "金库钱不够" : "无法升级"}`, { key: "biz-up", duration: 2600 });
      else hud.toast?.(`⬆ 升到 Lv.${r.level}`, { key: "biz-up", duration: 2600 });
    },
  });
  const gangs = new Gangs(reputation, { worldState, factionSystem, orgChartUI, lawUI, businessUI });
  const slots = new SlotMachine(economy, audio, hud);
  const baccarat = new Baccarat(economy, audio, hud);

  // Phase 4 新系统
  const taskSystem = new TaskSystem(worldState);
  newspaper.setTaskSystem(taskSystem);
  // 新任务自动发布到报纸
  taskSystem.on("taskCreated", (task) => {
    newspaper.publishTask(task);
  });
  // 新人主线任务：购置房产（自动接取并追踪）
  {
    const mainQuest = taskSystem.createTask("task_main_home", { from: "system" });
    if (mainQuest) taskSystem.acceptTask(mainQuest.id);
  }
  const stockMarket = new StockMarket(worldState, economy, audio);
  phone.taskSystem = taskSystem;
  phone.setStockMarket(stockMarket);   // 手机股市 tab
  hud.setStockMarket(stockMarket);
  // P13 股市新闻/小道消息/玩家行为影响
  const stockNews = new StockNewsService({
    worldState, newspaper, phone,
    log: (t) => eventLog?.record?.({ type: "STOCKNEWS_LOG", facts: { text: t }, tags: ["stocknews"] }),
  });
  // 手机收服按钮（输入框上方，类似接任务按钮）—— 不靠手输关键词
  phone.setRecruitHandler((npcId, contact) => onPhoneRecruit(npcId, contact));
  // 手机召集按钮（只对玩家帮派成员显示）：NPC 回"马上到"，当天跟随玩家作战
  phone.setSummonHandler((npcId, contact) => {
    const known = npcRegistry.findByDisplayName(contact.displayName);
    const targetId = known?.id || npcId;
    // 在场上找这个 NPC 的实体（能走动、能战斗的那个）
    const npc = npcManager.all.find((n) => {
      if (!n.alive || !n.brain) return false;
      const reg = npcRegistry.findByDisplayName(n.phone?.owner || "");
      return reg?.id === targetId || n.phone?.id === targetId || n.phone?.owner === contact.displayName;
    });
    if (!npc) {
      hud.toast(`📢 ${contact.displayName} 现在不在镇上`, { key: "summon-away", duration: 3000 });
      return { text: "……我现在不在镇上，改天吧。" };
    }
    if (npc.brain.state === "DOWN" || npc.brain.state === "FLEE" || npc.brain.state === "ANGRY") {
      hud.toast(`📢 ${contact.displayName} 现在脱不开身`, { key: "summon-busy", duration: 3000 });
      return { text: "我现在脱不开身，等会儿再说。" };
    }
    // 当天跟随玩家 + 标记为友方（自动打玩家敌人）
    // 先传送到玩家附近（省得从镇那头慢慢跑），再跟着你
    const ang = Math.random() * Math.PI * 2;
    const spot = { x: player.pos.x + Math.cos(ang) * 3.2, z: player.pos.z + Math.sin(ang) * 3.2 };
    const safe = town.resolveCollision?.(spot.x, spot.z, 0.6) || spot;
    if (npc.teleportTo) npc.teleportTo(safe.x, safe.z);
    else npc.pos.set(safe.x, 0, safe.z);
    npc.brain.follow(player, { seconds: 99999, stopDist: 2.6 });
    factions.markAlly(npc);
    npc._summonedToday = worldClock.day;
    hud.toast(`📢 ${contact.displayName} 应召而来（已到身边），跟着你办事`, { key: "summon-ok", duration: 3600 });
    return { text: "马上到。我跟着你，谁动你我收拾谁。" };
  });
  phone.setMemberCheck((npcId) => {
    const pf = factionSystem.getPlayerFaction?.();
    return !!(pf?.members && pf.members.includes(npcId));
  });
  // 手机自由输入：普通消息走 DS flash（npcChat.respond）回复，
  // 收服/入伙 交给输入框上方的「收服」按钮（见 onPhoneRecruit），
  // 不靠玩家手输关键词。
  phone.setFreeTextHandler((npcId, raw, contact) => {
    // 帮派群聊：挑 1~2 个成员接茬（返回多条，每条一个说话人）
    if (npcId === "gang_group" || contact?.displayName === "帮派群聊") {
      return gangGroup.respondToPlayer(raw, async ({ npcId: mid, displayName, text }) =>
        respondPhoneChat(mid, text, { displayName, job: npcRegistry.get(mid)?.job || "帮众" })
      );
    }
    // 明确的关键词收服仍兼容（老玩家肌肉记忆），但正常路径走按钮
    if (/^(招|收服|入伙|跟我干|加入|招揽)\b/.test(raw.trim())) {
      return onPhoneRecruit(npcId, contact);
    }
    // 普通消息 → DS flash LLM 回复（用联系人档案构造代理 npc）
    return respondPhoneChat(npcId, raw, contact);
  });

  /**
   * 手机聊天的 LLM 回复（DS flash）。
   * 联系人只有档案没有场景实体，这里用一个轻量代理 npc 喂给 npcChat，
   * 让手机聊天跟当面聊天一样接真实大模型。
   */
  async function respondPhoneChat(npcId, raw, contact) {
    const known = npcRegistry.findByDisplayName(contact.displayName);
    const rec = known ? npcRegistry.get(known.id) : null;
    const proxyNpc = {
      phone: { owner: contact.displayName, id: npcId },
      personality: {
        job: contact.job || rec?.job || "镇民",
        bravery: rec?.traits?.bravery ?? 0.5,
        aggression: rec?.traits?.aggression ?? 0.5,
        greed: rec?.traits?.greed ?? 0.5,
        sociability: rec?.traits?.sociability ?? 0.5,
        wealth: 0.5,
        gang: rec?.factionId || null,
      },
      cashReserve: 0,
      brain: { state: "IDLE", emotion: 0 },
    };
    const relCtx = _buildRelCtx(proxyNpc, known);
    try {
      const r = await npcChat.respond({
        npc: proxyNpc,
        text: raw,
        ctx: { ...relCtx, honor: reputation.honor, playerMoney: economy.money, dailyUse: {} },
      });
      return r?.say || "……";
    } catch (e) {
      // LLM 挂了或超预算 → 退化成带人味的本地回复
      if (/(最近|怎么样|还好吗|忙)/.test(raw)) return "还行吧，就是镇上不太平。你那边呢？";
      if (/(钱|生意|买卖)/.test(raw)) return "这年头钱不好挣啊，有路子的话可以聊聊。";
      if (/(黑蹄|帮派|势力)/.test(raw)) return "别在消息里说这些，见面聊。";
      return "嗯，我记下了。有事再说。";
    }
  }

  /**
   * 手机收服（按钮/关键词触发）：说服力按好感+名誉，比当面洗脑低。
   * 成功走招募管线写数据。返回给对方看的回复文本。
   */
  function onPhoneRecruit(npcId, contact) {
    const known = npcRegistry.findByDisplayName(contact.displayName);
    const rec = known && npcRegistry.get(known.id);
    const affection = (rec?.affection ?? 0) / 100;
    const honorFrac = Math.max(0, Math.min(1, (reputation.honor + 100) / 200));
    const persuasion = Math.max(0.02, Math.min(0.6, 0.18 + affection * 0.45 + honorFrac * 0.2 + (Math.random() - 0.5) * 0.1));
    if (Math.random() < persuasion) {
      const { id: targetId } = known && npcRegistry.ensureRecord
        ? npcRegistry.ensureRecord(contact.displayName, { job: contact.job })
        : { id: npcId };
      factionSystem.addPlayerMember(targetId, {
        job: contact.job, trust: 30, recruitedBy: "phone",
        undercover: false, displayName: contact.displayName,
      });
      npcRegistry?.update?.(targetId, { trust: 30, trueFactionId: "player" });
      businessSystem?.state?.history?.push({ day: worldState.day, type: "phone_recruit", npcId: targetId });
      gangGroup?.announceNewMember?.(contact.displayName);
      hud.toast?.(`📱 ${contact.displayName} 答应入伙了！`, { key: "phone-recruit", duration: 3600 });
      return "行。我跟你干。镇上的事，也该有人站出来管管了。";
    }
    return "……我得想想。改天当面说吧。";
  }

  // RDR2 式准心交互系统
  const interaction = new InteractionSystem(camera, scene);
  interaction.setRefs({ npcManager, town, loot, vehicles, interiors });
  // NPC 自己退出对话（耐心耗尽走开）时，把浮动对话面板一起收掉，
  // 否则面板会留在屏幕上，看着像还能继续聊
  interaction.onDialogueDropped = (npc) => {
    if (floatDlgNpc === npc) hideFloatDialogue();
  };

  let theater = null; // AI 剧场总控，稍后装配（Combat 回调里会用到）

  // 战斗阵营：敌方红血条、友方绿血条，友方会帮玩家打敌方
  const factions = new CombatFactions({
    npcManager, hud, audio,
    getAffection: (npc) => _affectionOf(npc),
    // 只有"看得见现场"的人才会赶来帮忙（隔着建筑就当没看见）
    hasLineOfSight: (from, to) => town.hasLineOfSight(from, to),
  });
  const healthBars = new HealthBars(camera, factions);
  // 路人对街上倒地者的反应：吓一跳 / 绕路 / 跑去报警
  const corpseReactions = new CorpseReactions({
    npcManager, hud, audio,
    moodFx: (npc, mood) => playMoodFx(npc, mood),
    // 只有玩家还在尸体附近才可能被当成凶手 → 才可能引出报官
    getPlayerPos: () => player.pos,
  });
  const emojiPops = new EmojiPops(camera);
  const cutscene = new Cutscene();

  const combat = new Combat(npcManager, loot, hud, { audio, reputation, newspaper,
    playerRef: player,   // 调试面板可调 player.damage（伤害倍率）
    onNpcHit: (target, knocked) => {
      theater?.notifyNpcHit(target, knocked);
      // 玩家打了人 → 立刻标敌（血条马上出来），倒地则移出战斗
      if (knocked) factions.clear(target);
      else factions.markEnemy(target);
      // 逃跑也顶着血条：被玩家打过的人 4 秒内都显示（除非倒地/走远）
      healthBars.mark(target);
    },
    onNpcKnocked: (target) => {
      // P13 玩家在商铺里杀人 → 对应股票第二天下跌
      if (insideRoom && stockNews) {
        stockNews.recordPlayerAction("kill", insideRoom);
      }
      // 检查任务完成：击败NPC
      const owner = target.phone?.owner || "镇民";
      const registryNpc = npcRegistry.findByDisplayName(owner);
      const completed = taskSystem.checkCompletion({
        type: "npc_defeated",
        npcId: registryNpc?.id || owner
      });
      for (const t of completed) {
        taskSystem.grantReward(t, economy, reputation);
        hud.toast(`✅ 任务完成！「${t.title}」奖励：$${t.reward.money || 0}`);
        onTaskCompleted(t, target);
      }
      // 打倒敌对势力的人 → 削弱其"人手"支柱。
      // 以前 Combat 与 worldState 势力完全不通（两个平行宇宙）：杀黑蹄会成员
      // 不掉任何支柱，而黑蹄会每天自动巩固最弱支柱 → 支柱只涨不跌、战役无法推进。
      _damageFactionOnKnock(target, registryNpc);
    }
  });
  const sheriffs = new SheriffSquad(scene, town, { audio, hud });

  // P3 StoryTree
  // economy / reputation 必须注入：金钱与声望效果要直接写真实系统，
  // 不能写 worldState 镜像（syncToGame 零调用 + 每晚被 syncFromGame 反向覆盖）
  const storyRuntime = new StoryRuntime({ worldState, relationshipSystem, eventLog, npcRegistry, economy, reputation });
  phone.setStoryRuntime(storyRuntime);
  phone.setStoryHud(hud);
  // 手机故事 tab 的"立即开始"按钮：强行启动未触发的故事。
  // 启动后立刻让首个节点触达玩家（NPC 过来 / 手机来信），不是等下一次睡觉。
  phone.setStoryStartHandler((storyId) => {
    const def = storyRuntime.getDefinition(storyId);
    if (!def) return { ok: false };
    const inst = storyRuntime.forceStart(storyId);
    if (!inst) return { ok: false };
    const bindNames = Object.values(inst.actorBindings || {}).map((a) => a).join("、");
    hud.toast(`📖 已开始《${def.title}》${bindNames ? `（${bindNames}）` : ""}`, { key: "story-start", duration: 3600 });
    // 下一帧（主循环里 encounters/deliveryPlanner 都就绪了）投递首个节点
    _pendingStoryDeliver = { storyId };
    return { ok: true };
  });
  // 手机消息里的故事决策按钮：点了推进剧情
  phone.setStoryChoiceHandler((storyId, choiceId) => {
    const def = storyRuntime.getDefinition(storyId);
    const inst = worldState.getStoryInstance(storyId);
    const node = def?.nodes?.[inst?.currentNode];
    const choice = node?.playerResponses?.find((r) => r.id === choiceId);
    storyRuntime.advance(storyId, choiceId);
    if (def && choice) {
      hud.toast(`📖 ${def.title} · ${choice.label}`, { key: "story-choice", duration: 3000 });
    }
  });
  // 「推进这一环节」：先看这个节点能不能"缺席补叙"。
  // 能 → 黑幕过场（电影旁白交代你没到场的这段时间，世界照样往前走）。
  // 不能 → 照旧把当前节点拉到玩家面前。
  phone.setStoryPushHandler((storyId) => {
    const def = storyRuntime.getDefinition(storyId);
    const inst = worldState.getStoryInstance(storyId);
    if (!def || !inst || inst.status !== "active") return { ok: false };
    phone.close();
    if (forceAdvanceWithCutscene(storyId)) {
      return { ok: true, cutscene: true };
    }
    _pendingStoryDeliver = { storyId };
    hud.toast(`📖 正在拉起《${def.title}》的当前环节…`, { key: "story-push", duration: 3000 });
    return { ok: true };
  });

  // 每日投放队列里的故事消息只带 storyId，渲染时现算坐标（不进存档，免得过期）
  phone.setVenueResolver((storyId, nodeId) => {
    const def = storyRuntime.getDefinition(storyId);
    const inst = worldState.getStoryInstance(storyId);
    const nid = nodeId || inst?.currentNode;
    const node = def?.nodes?.[nid];
    if (!node) return null;
    const boundNpcId = Object.values(inst?.actorBindings || {})[0];
    const beat = getBeatText(storyId, nid);
    const v = resolveStoryVenue(def, node, boundNpcId, beat);
    return { x: v.x, z: v.z, label: v.label || beat?.locateLabel || "事发地点" };
  });

  // 「📍去看看」：关手机，自动走到事发地点，到了让 NPC 现身（❗ → F → 选项）
  phone.setLocateHandler((loc) => {
    if (!loc || !isFinite(loc.x) || !isFinite(loc.z)) return;
    if (minimap?.setQuestMarker) minimap.setQuestMarker(loc.x, loc.z);
    hud.toast(`🧭 正在赶往${loc.label}…（按 WASD 可自己走）`, { key: "nav", duration: 4200 });
    player.startAutoNav(loc.x, loc.z, {
      label: loc.label,
      arriveDist: 3.0,
      timeout: 60,
      onArrive: () => {
        if (loc.storyId && loc.nodeId) onArriveStoryVenue(loc.storyId, loc.nodeId);
        else hud.toast(`你到了${loc.label}。`, { side: true, key: "nav", duration: 3000 });
      },
      onCancel: (reason) => {
        if (reason) hud.toast(`🧭 自动前往已取消（${reason}）`, { side: true, key: "nav", duration: 2600 });
      },
    });
  });

  // P4 Director
  const director = new Director({ worldState, relationshipSystem });
  const deliveryPlanner = new DeliveryPlanner({ worldState, storyRuntime, newspaper, phone, hud });

  // P5 LLM (默认禁用，可通过调试面板启用)
  const narrativeService = new NarrativeService({ worldState, eventLog, enabled: true });

  // ===== 实时生成回执浮层（屏幕最上方，最近 3 条；默认开）=====
  // 剧场衔接和 NPC 对话都是静默降级的，不报出来就分不清"模型这么答的"和"根本没调到模型"
  const aiLog = new AiLog({ el: document.getElementById("ai-log"), max: 3, ttlMs: 12000, enabled: true });
  const onAiReport = (r) => aiLog.report(r);

  // ===== AI 剧场：每天上午在镇中心大街演一场街头事件 =====
  // P8 后果包：结构性后果（势力/延迟揭示/延迟回报/解锁），theater 与日结共用
  const consequences = new ConsequenceSystem({
    worldState, factionSystem, law, nemesis, business: businessSystem, npcRegistry,
    phone, newspaper, reputation, hud, storyRuntime, getDay: () => worldClock.day,
    log: (t) => eventLog?.record?.({ type: "CONSEQ_LOG", facts: { text: t }, tags: ["consequence"] }),
  });
  theater = new TheaterDirector({
    npcManager, town, hud, sky, worldClock, reputation, economy, newspaper, eventLog,
    factionSystem, relationshipSystem, npcRegistry,
    playerSay: (text) => showPlayerBubble(text),
    onAiReport,
    aftermath: new TheaterAftermath({
      newspaper, phone, hud, npcRegistry, getDay: () => worldClock.day,
    }),
    // P8 后果包：结构性后果（势力/延迟揭示/延迟回报/解锁）
    consequences,
  });

  // ===== 单个 NPC 的自由对话（准心对着谁就是在跟谁说话）=====
  // 配额用 ChatBudget 默认值（20/分钟 + 400ms），别在这里写死覆盖
  const npcChat = new NpcChatService({ budget: new ChatBudget(), onReport: onAiReport });
  const npcActions = new NpcActionExecutor({
    player, economy, reputation, hud, npcManager, audio, baccarat, eventLog,
    addAffinity: (npc, trust, affection) => _addNpcAffinity(npc, trust, affection),
    getAffection: (npc) => _affectionOf(npc),
    getDay: () => worldClock.day,
  });
  let chatTarget = null; // 当前正在对话的 NPC

  const theaterUI = new TheaterUI({
    input: engine.input,
    canOpen: () => !anyModalOpen() && !player.inVehicle,
    onExpand: () => { theater.setPlayerTyping(true); beginNpcChat(); },
    // keepChat=true 是"回车发送后自动收起"，只交还键盘、不结束对话：
    // NPC 留在 TALK 状态，玩家再按回车能接着跟同一个人说下一句。
    // keepChat=false 才是真的离开（Esc / 空格 / 点到别处）。
    onCollapse: ({ keepChat } = {}) => {
      theater.setPlayerTyping(false);
      if (!keepChat) endNpcChat();
    },
    onSubmitText: (text) => routeFreeText(text),
    onPickChoice: (id) => theater.submitChoice(id),
  });
  theater.ui = theaterUI;
  // 聊天条展开时，所有游戏输入都让给输入框。
  // 注意：不能用 addTypingGuard（它会让 Input.typing 返回 true，而 TheaterUI
  // 自己的 _onKeyDown 也检查 input.typing → 于是"展开但没人打字"的状态下，
  // Enter/空格/Esc/数字键全被它自己吞掉，整个面板靠键盘完全用不了）。
  // 收口在 main.js 的游戏热键处而不用全局 typing 判据，就不会误伤到 TheaterUI。
  // 同样：聊天条展开时不准抢指针锁，否则 input 收不到键盘事件（第一次 expand()
  // 已释放锁，但后续拖动鼠标会通过 Input._onMouseDown 重新 grab，把 input 弄聋）。
  engine.input._canLock = () => !theaterUI?.expanded;

  // ===== 统一遭遇管线 =====
  // NPC 主动走到玩家身边 → 头顶 ❗ → 按 F → 中央弹窗（世界暂停）→ 抉择 → 真实结算。
  // 剧场是同一套东西的多演员配置；这里是单/双演员 + 舞台动态设在玩家脚下。
  const encounterUI = new EncounterUI({
    getAvatar,
    onChoice: (choiceId) => encounters.resolve(choiceId),
  });
  const encounters = new EncounterRuntime({
    npcManager, npcRegistry, town, hud,
    ui: encounterUI,
    glue: theater.glue,                       // 复用剧场的 LLM 通路（含配额与回执）
    getPlayerPos: () => player.pos,
    // 玩家当前所在场所：室内时是中文房间名（与 venueAffinity 表的键一致），室外为 null
    getVenue: () => insideRoom || null,
    getHour: () => worldClock.hour,
    log: (t) => eventLog?.record?.({ type: "ENCOUNTER_LOG", facts: { text: t }, tags: ["encounter"] }),
    onResolve: (enc, choiceId) => applyEncounterOutcome(enc, choiceId),
  });
  // 让交互面板知道谁在等玩家搭话（❗ 那个人的 F 键要压过其它交互）
  interaction.setRefs({ npcManager, town, loot, vehicles, interiors, encounters });

  // 微型交互事件：进建筑/街角随手可参与的轻量小场景（复用遭遇弹窗）
  const microEvents = new MicroEventSystem({
    encounters, hud, reputation, economy,
    getDay: () => worldClock.day,
    getHour: () => worldClock.hour,
    getPlayerPos: () => player.pos,
    getVenue: () => insideRoom || null,
    onAffinity: (npcId, trust, affection) => {
      const rel = relationshipSystem.applyChange?.(npcId, "player", { trust, affection }) ||
        worldState.getRelationship?.(npcId, "player");
      return rel;
    },
    npcRegistry,
  });

  // 熟人相遇双人闲聊：两个认识的 NPC 碰上，停下说两句（DS 生成台词）
  const pairChat = new PairChatSystem({
    npcManager, npcRegistry, relationshipSystem,
    getDay: () => worldClock.day,
  });

  // 处置伏地重伤者：玩家暴力的出口。共用遭遇弹窗（open 时带自己的 onChoice）。
  const subdue = new SubdueSystem({
    ui: encounterUI, hud, factionSystem, economy, reputation,
    npcRegistry, npcManager,
    log: (t) => eventLog?.record?.({ type: "SUBDUE_LOG", facts: { text: t }, tags: ["subdue"] }),
    onKilled: (npc, name) => {
      // 补刀是当场杀人：附近有人看见就按最高等级目击处理（与枪击同级）
      for (const w of npcManager.findWitnesses?.(npc.pos, 14) || []) {
        w.brain?.witnessCrime?.(npc.pos, "assault", { severity: "gunshot" });
      }
      reputation?.addCrimeWanted?.(3);
      reputation?.onKnockNPC?.(npc.personality?.gang || null);
      // 杀掉黑蹄会的人 → 岗位空缺 → 支柱受损 + 下属晋升顶替
      const known = npcRegistry.findByDisplayName(name);
      if (known) {
        const r = nemesis.removeMember(known.id, "killed");
        if (r) {
          hud.toast?.(
            `🏴 ${r.position.title}的位子空了` +
            (r.promoted?.seat ? ` —— ${r.promoted.seat.displayName}顶上来了` : "，一时没人接手"),
            { key: "nemesis-remove", duration: 5000 }
          );
        }
      }
    },
    onRecruited: (npc, allegiance) => {
      // 送回原势力的人要登记进 Nemesis，才会开始送情报、才会累积怀疑度、
      // 才可能在晋升链里往上爬。只写 factions.player.members 是不够的。
      if (allegiance.apparent !== "player") {
        const name = npc.phone?.owner || "某人";
        const known = npcRegistry.findByDisplayName(name);
        const npcId = known?.id || npcRegistry.ensureRecord(name, {
          job: npc.personality?.job, factionId: allegiance.origin,
        }).id;
        nemesis.registerMole(npcId, name);
      }
      // 明面加入的成员 → 群聊里有人欢迎
      if (allegiance.apparent === "player") {
        gangGroup?.announceNewMember?.(npc.phone?.owner || "新成员");
      }
      // 卧底不该出现在明面成员名单上，UI 侧靠 allegiance.apparent 区分
      hud.toast?.(
        allegiance.apparent === "player"
          ? "📋 名单里多了一个人（按 N 查看）"
          : "🕵 卧底已记入人事图（按 O 查看）",
        { key: "subdue-hint", duration: 3600 }
      );
    },
  });

  // 遭遇弹窗开着时也不准抢指针锁（弹窗要吃键盘）。
  // 放在 encounterUI 声明之后赋值，不依赖惰性求值绕过 TDZ。
  engine.input._canLock = () => !theaterUI?.expanded && !encounterUI.isOpen;

  theater.npcAction = (npc, action, candidates) => npcActions.execute(npc, action, { candidates });
  theater.moodFx = (npc, mood, emoji, shake) => {
    if (emoji) npc.brain.emote(emoji, 1.9);
    if (shake) npc.shakeFor?.(shake, 0.16);
    if (!emoji && !shake) playMoodFx(npc, mood);
  };
  interaction.theaterDirector = theater;

  // P3 消息治理：手机消息限流 + 去名字前缀 + 分类（挂在 DailySimulation 投递时）
  const messageGovernor = new MessageGovernor({ worldState });

  // DailySimulation（完整装配）
  const dailySimulation = new DailySimulation({
    worldState, eventLog, playerCondition,
    factionSystem,       // P1 ✓
    operationSystem,     // P1 ✓
    npcRegistry,         // P2 ✓
    relationshipSystem,  // P2 ✓
    storyRuntime,        // P3 ✓
    director,            // P4 ✓
    deliveryPlanner,     // P4 ✓ (processMissedBeats)
    narrativeService,    // P5 ✓
    stockMarket,         // Phase 4 ✓
    taskSystem,          // Phase 4 ✓ AI 任务注入
    economy, reputation,
    newspaper, phone,
    npcManager,
    nemesis,             // P4 ✓ 卧底情报/怀疑度/清洗 + 胜负判定
    law,                 // P5 ✓ 证据折算/行贿/突袭
    business: businessSystem,  // P7 ✓ 产业结算
    messageGovernor,     // P3 ✓ 消息限流/去名字/分类
    consequences,        // P8 ✓ 剧场后果包
    playerOrg,           // P11 ✓ 任命加成
    gangGroup,           // P11 ✓ 群聊
    stockNews,           // P13 ✓ 股市新闻/小道消息/玩家影响
  });

  // 存档系统：完全禁用。每次刷新 = 重新开始第一天。
  // 清除所有 localStorage 残留，确保从 Day 1 开始。
  saveSystem.clearAll();

  // 世界日结算事件 → DailySimulation（同步，不等待 LLM）
  worldClock.on("sleep", () => {
    try {
      hud.toast("😴 你躺下休息，世界在你沉睡时继续运转……", { key: "sleep" });
      // 召集的成员一天就散：睡觉后各回各岗（停止跟随 + 解除友方标记）
      for (const n of npcManager.all) {
        if (n._summonedToday === worldClock.day && n.brain) {
          n.brain.stopFollow?.();
          factions.clear?.(n);
          n._summonedToday = null;
        }
      }
      dailySimulation.playerPos = player.pos;  // 供亲友报复系统用
      const summary = dailySimulation.run(economy, reputation, newspaper, hud);
      // 如果部分步骤失败，给玩家一个提示但不打断流程
      if (summary && summary.errors) {
        console.warn("[Main] 结算部分步骤失败:", summary.errors);
        hud.toast("⚠️ 部分结算步骤出错，但世界仍在运转", { key: "sleepPartial", duration: 4000 });
      }
      // P4: 导演计划提交 + 投送到报纸/手机
      if (summary && summary.directorPlan) {
        deliveryPlanner.commitPlan(summary.directorPlan);
      }
      dailySimulation.flushToUI(newspaper, phone, hud, worldClock.hour);
      worldClock.completeSleep();
      worldClock.advanceDay();
      // 睡一觉：玩家血回满（playerCondition 只回精力，3D 实体的血在这里补）
      player.health = 100;
      playerCondition.health = 100;
      hud.setHealth(player.health);
      hud.setDay(worldClock.day);
      hud.toast(`🌅 第${worldClock.day}天清晨，新的一天`, { key: "dawn" });
      gangs.render();
      taskSystem.expireTasks();
      taskSystem.refreshDaily();
      newspaper.cleanStaleTasks(); // 清除报纸中已过期/移除的任务文章
      // 刷新街上NPC位置（重新出门上班）
      npcManager.refreshOutdoorPositions();
      // 异步调用 LLM — 不阻塞游戏
      dailySimulation.fireLLMAsync();
    } catch (e) {
      console.error("[Main] 睡眠结算失败:", e);
      hud.toast("⚠️ 结算出错，请重试", { key: "sleepError" });
      // 完整恢复状态
      worldClock._sleepRequested = false;
      worldClock._dayEnded = false;
      dailySimulation.playerPos = null;
    }
  });

  // LLM 异步完成后：注入报纸/手机消息 + 通知玩家
  dailySimulation.on("llmReady", ({ day }) => {
    dailySimulation.flushToUI(newspaper, phone, hud);
    hud.toast("📰 报纸更新了，去看看吧！", { key: "llmReady", duration: 5000 });
    console.log("[Main] LLM 内容已注入，报纸已更新");
  });

  // 更新 HUD 天数显示
  hud.setDay(worldClock.day);
  hud.setEnergy(playerCondition.energy, playerCondition.fatigue);

  // 室内状态
  let insideRoom = null; // 当前所在室内房间名/属性id，null 表示在室外

  // 收集玩家从手机里发现的可投稿八卦
  const gossipFound = [];
  newspaper.setGossipHandler((item) => {
    economy.addMoney(item.reward);
    audio.cash();
    hud.toast(`📰 独家线报刊登，稿酬 +$${item.reward}！`);
    reputation.addWanted(-3);
  });

  // ---- 死亡倒地动画 + 复活 ----
  let _knockdownOverlay = document.getElementById("knockdown-overlay");
  let _knockdownText = document.getElementById("knockdown-text");
  let _knockdownSub = document.getElementById("knockdown-sub");
  let _respawnPending = null; // { x, z, collider, insideRoom, toastMsg, nearbyNpc }
  let _pendingStoryDeliver = null; // { storyId } — 手动启动的故事，待主循环投递首个节点

  function showKnockdown(reason, subText) {
    _knockdownOverlay.classList.remove("hidden");
    _knockdownSub.textContent = subText || "";
    player._knockdownReason = reason || 'npc';
  }

  function hideKnockdown() {
    _knockdownOverlay.classList.add("hidden");
  }

  // 倒地计时结束后执行复活
  function doRespawn() {
    if (!_respawnPending) return;
    const r = _respawnPending;
    player.teleport(r.x, r.z, r.collider);
    player.health = 60;
    player.weakTimer = 6;
    player._dead = false;
    player._knockedDown = false;
    insideRoom = r.insideRoom;
    if (r.insideRoom && interiors.has(r.insideRoom)) {
      town.group.visible = false;
    } else {
      town.group.visible = true;
    }
    hud.toast(r.toastMsg);
    hud.setHealth(60);
    hideKnockdown();
    _respawnPending = null;

    // 清除所有 NPC 对玩家的仇恨、威胁、复仇标记
    for (const npc of npcManager.npcs) {
      if (npc.brain) {
        // 如果该 NPC 在愤怒状态（正在攻击玩家），记录"打死了玩家"
        if (npc.brain.state === "ANGRY" && npc.brain.threat) {
          npcManager.recordEncounter(npc, "killed_player", { day: worldClock.day, reason: player._knockdownReason || "combat" });
        }
        npc.brain.threat = null;
        npc.brain.emotion = Math.max(0, npc.brain.emotion - 0.6);
        if (npc.brain.state === "ANGRY" || npc.brain.state === "FLEE") {
          npc.brain._enter("WANDER");
        }
      }
      npc._grudgeAgainstPlayer = null;
      npc._revengeSpawned = false;
    }

    // 附近NPC说话
    if (r.nearbyNpc) {
      setTimeout(() => {
        r.nearbyNpc.brain.say(r.nearbyNpc.brain.getRandomRespawnLine(player._knockdownReason));
      }, 600);
    }
  }

  player.onDeath = () => {
    const fee = Math.min(economy.money, Math.round(40 + economy.money * 0.15));
    economy.addMoney(-fee);
    audio.bell();
    // 玩家已经倒下，这场冲突结束了：没人还需要跑去警局告一个躺平的人。
    // 不清的话那些人会一直占着报案名额往警局跑，玩家醒来就被莫名通缉。
    AIBrain.clearAllReports();
    if (insideRoom) {
      interiors.leave();
      town.group.visible = true;
      insideRoom = null;
    }
    player.collider = town;

    // 准备复活点
    const myHomes = [...economy.ownedProperties];
    let subText = `医药费 -$${fee}`;
    if (player._knockdownReason === 'guard') {
      subText = `警长把你拖回了警察局`;
    }

    if (myHomes.length > 0) {
      const homeId = myHomes[0];
      if (!interiors.has(homeId)) {
        const prop = town.properties.find(p => p.id === homeId);
        interiors.addHomeRoom(homeId, prop ? prop.name : "我的家");
      }
      const entry = interiors.enter(homeId);
      _respawnPending = {
        x: entry.x, z: entry.z, collider: entry.room,
        insideRoom: homeId,
        toastMsg: `💀 你倒下了...在家中的床上醒来。医药费 -$${fee}`,
        nearbyNpc: null,
      };
      subText += " | 在自己的床上醒来";
    } else if (player._knockdownReason === 'guard') {
      // 被警长杀了→关进警察局
      const sheriffDoor = town.sheriffDoor;
      _respawnPending = {
        x: sheriffDoor.x, z: sheriffDoor.z, collider: town,
        insideRoom: null,
        toastMsg: `🚔 被警长制服，关了一夜。罚款 -$${fee}`,
        nearbyNpc: npcManager.nearestTalkable(sheriffDoor),
      };
    } else {
      // 没房→医馆
      _respawnPending = {
        x: player.clinicPos.x, z: player.clinicPos.z, collider: town,
        insideRoom: null,
        toastMsg: `💀 你倒下了...在医馆苏醒。医药费 -$${fee}`,
        nearbyNpc: npcManager.nearestTalkable(player.clinicPos),
      };
    }

    if (reputation.wantedStars > 0) {
      reputation.onArrested();
      sheriffs.standDownAll();
      subText += " | 通缉暂消";
    }

    showKnockdown(player._knockdownReason, subText);
  };

  // ---- 主屏幕睡觉按钮 ----
  function handleSleep() {
    // 关闭所有面板
    hud.closeShop(); phone.close(); newspaper.close(); gangs.close();
    slots.close(); baccarat.close(); conversation.close();

    let atHome = false;
    const myHomes = [...economy.ownedProperties];
    if (myHomes.length > 0) {
      // 有房产 → 传送到第一个房产睡觉
      const homeId = myHomes[0];
      if (insideRoom) { exitInterior(); }
      enterInterior(homeId);
      hud.toast("🏡 回到家中...", { side: true });
      atHome = true;
    } else {
      // 检查商店购买的房子
      for (const shopId of economy.owned) {
        const item = SHOP_ITEMS.find(s => s.id === shopId);
        if (item && item.kind === "house") {
          const prop = town.properties.find(p => p.shopItem === shopId);
          if (prop) {
            if (insideRoom) { exitInterior(); }
            enterInterior(prop.id);
            hud.toast("🏡 回到家中...", { side: true });
            atHome = true;
            break;
          }
        }
      }
    }

    if (!atHome) {
      if (insideRoom) { exitInterior(); }
      // 无房产时在帮派驻地醒来：有自己的据点，睡在自家院墙里
      if (town.compound) {
        const gate = town.compound.gate;
        const resolved = town.resolveCollision(gate.x, gate.z, 0.5);
        player.teleport(resolved.x, resolved.z, town);
        hud.toast("🌅 你在帮派驻地的大院里醒来……", { key: "hqsleep", duration: 5000 });
        playerCondition.energy = Math.min(100, playerCondition.energy + 20);
        playerCondition.fatigue = Math.max(0, playerCondition.fatigue - 25);
      } else {
        // 露宿街头 → 传送到街角屋檐下，营造"刚醒"氛围
        // 用建筑门的坐标找街角
        const streetCorners = [];
        if (town.doors && town.doors.length > 0) {
          for (const door of town.doors) {
            streetCorners.push({ x: door.x + 2.5, z: door.z + 2.5 });
            streetCorners.push({ x: door.x - 2.5, z: door.z - 2.5 });
          }
        }
        if (streetCorners.length > 0) {
          const corner = streetCorners[Math.floor(Math.random() * streetCorners.length)];
          const resolved = town.resolveCollision(corner.x, corner.z, 0.5);
          player.teleport(resolved.x, resolved.z, town);
          hud.toast("🌅 你在街角檐下醒来，寒气刺骨...", { key: "roughsleep", duration: 5000 });
          playerCondition.energy = Math.min(100, playerCondition.energy + 15);
          playerCondition.fatigue = Math.max(0, playerCondition.fatigue - 20);
          player.takeDamage(12);
        } else {
          hud.toast("🌙 露宿街头...没有家的夜晚格外寒冷", { key: "roughsleep" });
          player.takeDamage(15);
        }
        // 让附近 NPC 冒泡吐槽
        setTimeout(() => {
          const nearby = npcManager.all.filter(n => {
            const d = Math.hypot(player.pos.x - n.pos.x, player.pos.z - n.pos.z);
            return n.alive && d < 8;
          }).slice(0, 3);
          const homelessLines = [
            "哪来的流浪汉……", "这人睡大街上了？", "啧，没家的可怜虫",
            "嘿，别挡着路！", "又一个醉倒街头的", "能不能换个地方睡",
          ];
          for (const n of nearby) {
            setTimeout(() => {
              if (n.brain && n.alive) n.brain.say(homelessLines[Math.floor(Math.random() * homelessLines.length)], 3.0);
            }, Math.random() * 2000);
          }
        }, 1800);
      }
    }

    // 触发睡觉结算
    if (worldClock.requestSleep()) {
      // sleepRecovery 由 dailySimulation.run() Step 3 统一处理，不在此处重复调用
    }
  }
  // ---- 睡觉（点击按钮 或 按 Z 键）----
  document.getElementById("btn-sleep").addEventListener("click", () => {
    if (!anyModalOpen()) handleSleep();
  });

  // ---- 警长围剿（通缉度高时按星级出动多名警长）----
  function updateSheriff(dt) {
    const stars = reputation.wantedStars;
    // 室内不追（警长在外面等）：把通缉视作 0 让已出动的收队
    const effStars = insideRoom ? 0 : stars;
    sheriffs.update(dt, {
      playerPos: player.pos,
      playerInVehicle: !!player.inVehicle,
      wantedStars: effStars,
      onShoot: (dist, dmgMul = 1) => {
        const hitChance = Math.max(0.15, 0.7 - dist / 30);
        if (Math.random() < hitChance) {
          player.takeDamage(Math.round((dist < 8 ? 16 : 10) * dmgMul));
          hud.toast("🔫 中弹了！", { key: "shot" });
        }
      },
      onCatch: () => {
        const fine = Math.min(economy.money, Math.round(60 + economy.money * 0.2));
        economy.addMoney(-fine);
        reputation.onArrested();
        sheriffs.standDownAll();
        audio.bell();
        // 逮捕倒地动画
        player._knockdownReason = 'guard';
        player._knockedDown = true;
        player._knockdownTimer = 2.5;
        const sd = town.sheriffDoor;
        _respawnPending = {
          x: sd.x, z: sd.z, collider: town,
          insideRoom: null,
          toastMsg: `🚔 被警长逮捕，在牢房关了一夜。罚款 -$${fine}`,
          nearbyNpc: null,
        };
        if (insideRoom) { interiors.leave(); town.group.visible = true; insideRoom = null; }
        player.collider = town;
        player.teleport(player.pos.x, player.pos.z, town); // 保持在当前位置但先倒地
        showKnockdown('guard', `罚款 -$${fine} | 通缉解除`);
        _respawnPending.x = sd.x;
        _respawnPending.z = sd.z;
        newspaper.publish("wanted", {});
      },
    });
  }

  // ---- 进入交互（指针锁定 + 音频启动）----
  const loader = document.getElementById("loader");
  const hudRoot = document.getElementById("hud");
  let _entered = false; // 是否已进入游戏
  const startPlay = () => {
    // 音频启动失败（浏览器策略/设备问题）不应阻塞指针锁定与游戏进入
    try { audio.start(); } catch (e) { console.warn("音频启动失败，已跳过", e); }
    input.requestPointerLock();
    _entered = true;
  };
  canvas.addEventListener("click", () => {
    // 聊天条展开时别抢指针锁，否则 input 收不到键盘事件
    if (!anyModalOpen() && !theaterUI?.expanded) startPlay();
  });

  function anyModalOpen() {
    return hud.shopOpen || phone.isOpen || newspaper.isOpen || conversation.isOpen || gangs.isOpen || slots.isOpen || baccarat.isOpen || stockMarket.isOpen || (encounterUI && encounterUI.isOpen) || (cutscene && cutscene.isPlaying()) || !document.getElementById("task-detail").classList.contains("hidden");
  }

  // ---- 右侧图标按钮栏 ----
  function openPanel(panel) {
    // 打开任一面板前先关闭其它
    if (panel !== "shop") hud.closeShop();
    if (panel !== "phone") phone.close();
    if (panel !== "newspaper") newspaper.close();
    if (panel !== "gangs") gangs.close();
    if (panel !== "stock") stockMarket.close();
    slots.close();
    baccarat.close();

    if (panel === "mute") {
      const on = audio.toggle();
      hud.toast(on ? "🔊 已开启声音" : "🔇 已静音");
      const btn = document.querySelector('.icon-btn[data-panel="mute"]');
      if (btn) btn.textContent = on ? "🔊" : "🔇";
      return;
    }
    if (panel === "debug") {
      const p = document.getElementById("debug-panel");
      if (p.classList.contains("hidden")) {
        window.__ww.debugPanel();
      } else {
        p.classList.add("hidden");
      }
      return; // debug panel doesn't steal pointer lock
    }
    if (panel === "shop") { hud.shopOpen ? hud.closeShop() : hud.openShop((id) => doBuy(id)); }
    else if (panel === "phone") { phone.isOpen ? phone.close() : phone.open(); }
    else if (panel === "newspaper") { newspaper.isOpen ? newspaper.close() : newspaper.open(sky.timeString(), gossipFound); }
    else if (panel === "gangs") { gangs.isOpen ? gangs.close() : gangs.open(); }

    if (anyModalOpen()) document.exitPointerLock();
  }
  for (const btn of document.querySelectorAll(".icon-btn")) {
    btn.addEventListener("click", () => openPanel(btn.dataset.panel));
  }

  // 假进度条 → 满后显示「进入小镇」按钮；点击按钮先播 The River 再淡出进入 HUD
  const bar = document.querySelector(".loader-bar span");
  const enterBtn = document.getElementById("loader-enter");
  let p = 0;
  const prog = setInterval(() => {
    p = Math.min(100, p + 12);
    bar.style.width = `${p}%`;
    if (p >= 100) {
      clearInterval(prog);
      const sub = document.querySelector(".loader-sub");
      if (sub) sub.textContent = "点击「进入小镇」开始";
      let _entering = false;
      const enter = () => {
        if (_entering) return;
        _entering = true;
        loader.style.opacity = "0";
        setTimeout(() => {
          loader.classList.add("hidden");
          hudRoot.classList.remove("hidden");
          hud.toast("点击画面锁定鼠标开始游玩");
        }, 800);
      };
      if (enterBtn) {
        enterBtn.classList.remove("hidden");
        // 强制可见（防样式/缓存问题）
        enterBtn.style.cssText = "display:inline-block;margin-top:26px;padding:12px 40px;font-size:18px;font-weight:700;color:#3a2a10;background:#ffce54;border:none;border-radius:24px;cursor:pointer;letter-spacing:2px;";
        enterBtn.addEventListener("click", (e) => { e.stopPropagation(); enter(); });
      }
      // 兜底：点击加载页任意处也能进入
      loader.style.cursor = "pointer";
      loader.addEventListener("click", enter);
    }
  }, 90);

  // ---- 键盘快捷键（与图标栏等价）----
  function handleMenus() {
    // 对话/偷窃模式中，交互键优先级高于全局快捷键
    // 也要检查左侧交互面板是否正在显示有 G 键的动作（如银行的"股市"按钮）
    const hasInteractActions = interaction.currentTarget && interaction.getActions().some(a => a.key === "G");
    const inSpecialMode = interaction.isInDialogue || !!stealState || !floatDialogue.classList.contains("hidden") || hasInteractActions;
    if (input.wasPressed("KeyP")) openPanel("mute");
    if (input.wasPressed("KeyM")) openPanel("shop");
    if (input.wasPressed("Tab")) openPanel("phone");
    if (input.wasPressed("KeyN")) openPanel("newspaper");
    if (input.wasPressed("KeyG") && !inSpecialMode) openPanel("gangs");
    // O = 黑蹄会人事图（组织架构 / 渗透进度）—— 合并进帮派面板的 tab。
    // 已在人事图 tab 时再按 O 就关闭；否则切过去。
    if (input.wasPressed("KeyO") && !inSpecialMode) {
      if (gangs.isOpen && gangs._tab === "org") { gangs.close(); }
      else {
        openPanel("gangs");
        gangs.openTab("org");
        if (gangs.isOpen) document.exitPointerLock();
      }
    }
    // K = 警长办公室（第三方势力）—— 合并进帮派面板的 tab。
    if (input.wasPressed("KeyK") && !inSpecialMode) {
      if (gangs.isOpen && gangs._tab === "law") { gangs.close(); }
      else {
        openPanel("gangs");
        gangs.openTab("law");
        if (gangs.isOpen) document.exitPointerLock();
      }
    }
    // 对话动作键不要被全局热键消费掉
    // KeyT/KeyR/KeyY 仅在非交互模式下处理

    return anyModalOpen();
  }

  function doBuy(itemId) {
    const bought = economy.buy(itemId);
    if (!bought) return;
    audio.cash();
    // 子弹是消耗品：买到的是子弹而不是"已拥有"
    if (bought.kind === "ammo") {
      ammoSystem.addRounds(6, "商店");
      return;
    }
    hud.toast(`🎉 购买了「${bought.name}」`);
    reputation.addHonor(1);
    newspaper.publish("purchase", { asset: bought.name });
    if (bought.kind === "vehicle") {
      const sporty = bought.id === "sports_car";
      vehicles.spawn(
        { x: player.pos.x + 3, z: player.pos.z },
        { sporty, color: sporty ? 0xd23a2a : 0x3a5a7a, heading: player.facing }
      );
    }
    // 房产：商店契约绑定实体大宅——买到即解锁、可进入、小地图标蓝
    if (bought.kind === "house") {
      const prop = town.properties.find((p) => p.shopItem === bought.id);
      if (prop && !economy.ownsProperty(prop.id)) {
        economy.ownedProperties.add(prop.id);
        interiors.addHomeRoom(prop.id, prop.name);
        minimap.markOwnedHouse(prop.x, prop.z);
        hud.toast(`🏡 「${prop.name}」地契到手！小地图已标蓝，就在镇${prop.x < 0 ? "西" : "东"}侧`);
        taskSystem.checkCompletion({ type: "home_purchased" });
      }
    }
  }

  // ---- NPC 对话发起（含耐心倒计时 + 勒索抢劫 + 帮派影响）----
  function tryStartDialogue(npc) {
    if (!npc.brain.startTalk(player.pos)) return;
    document.exitPointerLock();
    audio.npcVoice("greet");
    const gang = npc.personality.gang;
    conversation.open(
      npc,
      (kind) => {
        if (kind === "extort") {
          const honorMul = reputation.honor < -20 ? 1.4 : 1; // 恶名在外，勒索更狠
          const r = npc.brain.respondToExtort(honorMul);
          conversation.showReply(r);
          reputation.onExtort(gang);
          if (r.comply && r.amount > 0) {
            economy.addMoney(r.amount);
            audio.coin();
            hud.toast(`💰 勒索得手 +$${r.amount}`);
          } else {
            audio.npcVoice(r.mood === "angry" ? "angry" : "scared");
            npcManager.broadcastPanic(npc.pos, 16);
          }
          newspaper.publish("robbery", { job: npc.personality.job });
          return;
        }
        // 招募 NPC 入伙
        if (kind === "recruit") {
          const owner = npc.phone?.owner || "镇民";
          // 用 displayName 在 registry 中查找正确的 NPC
          const registryNpc = npcRegistry.findByDisplayName(owner);
          const npcRegistryId = registryNpc?.id || null;

          const coreBossIds = ["npc_silas", "npc_victor", "npc_rosa"];
          const isBoss = npcRegistryId && coreBossIds.includes(npcRegistryId);
          const playerInf = factionSystem.getPlayerInfluence?.() || 0;

          // 使用 registry ID 查找关系
          const relKey = (npcRegistryId || owner) + "->player";
          const rel = worldState.state.relationships?.[relKey] || { trust: 0, affection: 0 };

          const result = npc.brain.respondToRecruit({
            isBoss,
            playerInfluence: playerInf,
            trust: rel.trust || 0,
            affection: rel.affection || 0,
            npcId: npcRegistryId,
          });
          conversation.showReply(result);

          if (result.accepted) {
            factionSystem.addPlayerMember(npcRegistryId || owner);
            if (registryNpc) {
              const updatedNpc = worldState.getNPC(npcRegistryId);
              if (updatedNpc) {
                updatedNpc.factionId = "player";
                worldState.setNPC(npcRegistryId, updatedNpc);
              }
              phone.addContact(npcRegistryId, registryNpc.displayName, registryNpc.job || "镇民");
            } else {
              // 非重要 NPC 用唯一 phone.id，防止同名合并
              const contactId = npc.phone?.id || (owner + "_" + Math.random().toString(36).slice(2, 8));
              phone.addContact(contactId, owner, npc.personality?.job || "镇民");
            }
            hud.toast(`🎉 ${owner} 加入了你的帮派！`);
            gangs.render();
          }
          return;
        }
        const owner = npc.phone?.owner || "镇民";
        const reg = npcRegistry.findByDisplayName(owner);
        const relCtx = _buildRelCtx(npc, reg);
        const result = npc.brain.respondTo(kind, reputation.honor, relCtx);
        conversation.showReply(result);
        if (kind === "greet" || kind === "praise") {
          reputation.onKindDialogue(gang);
          audio.npcVoice(Math.random() < 0.5 ? "greet" : "happy");
          // 友善互动增加信任和好感
          const trustAmt = kind === "praise" ? 8 : 5;
          const affAmt = kind === "praise" ? 6 : 3;
          _addNpcAffinity(npc, trustAmt, affAmt);
          if (reg) {
            phone.addContact(reg.id, reg.displayName, reg.job || "镇民");
          }
          // 友善互动有概率解锁NPC档案中的隐藏特征
          tryUnlockNpcTrait(npc, kind);
          if (result.tip && Math.random() < 0.3) {
            const tip = 5 + Math.floor(Math.random() * 15);
            economy.addMoney(tip);
            audio.coin();
            hud.toast(`🤝 友善交谈，对方给了你 $${tip} 的消息费`);
          }
        } else if (kind === "threat") {
          reputation.onThreatDialogue(gang);
          audio.npcVoice(result.mood === "angry" ? "angry" : "scared");
        }
      },
      () => {
        // NPC 不耐烦走人
        hud.toast("🚶 对方不耐烦地走开了", { side: true, key: "impatient" });
      }
    );
  }

  // ---- 进出室内 ----
  let returnPoint = { x: 0, z: 20 };
  let returnBackDoor = false; // 从后门出来的话，回到后门位置
  function enterInterior(name, isBackDoor, backDoorX, backDoorZ) {
    // 后门：名字是 "酒馆后门"，但 interiors 的 key 是 "酒馆"
    const interiorKey = isBackDoor ? name.replace(/后门$/, "") : name;
    if (!interiors.has(interiorKey)) return;
    hud.closeShop();
    phone.close();
    newspaper.close();
    gangs.close();
    slots.close();
    baccarat.close();
    // 保存返回点：后门返回后门位置，前门返回前门位置
    if (isBackDoor && backDoorX !== undefined) {
      returnPoint = { x: backDoorX, z: backDoorZ };
      returnBackDoor = true;
    } else {
      returnPoint = { x: player.pos.x, z: player.pos.z + 2 };
      returnBackDoor = false;
    }
    const entry = interiors.enter(interiorKey, isBackDoor);
    town.group.visible = false;
    player.teleport(entry.x, entry.z, entry.room);
    insideRoom = interiorKey;
    const home = town.homes.find((h) => h.interiorName === interiorKey);
    const label = home ? home.name : interiors.get(interiorKey).name || interiorKey;
    hud.toast(`🚪 进入了${label}${isBackDoor ? ' (后门)' : ''}`, { side: true });
    audio.newspaper();
    // 检查任务完成
    const doorName = isBackDoor ? interiorKey : (name.includes('前门') ? name.replace('前门', '') : name);
    let completed = taskSystem.checkCompletion({ type: "building_reached", buildingName: label });
    if (completed.length === 0 && doorName !== label) {
      completed = taskSystem.checkCompletion({ type: "building_reached", buildingName: doorName });
    }
    // 也检查 fetch 任务的交付
    const fetchCompleted = taskSystem.checkCompletion({ type: "item_delivered", buildingName: label });
    for (const t of [...completed, ...fetchCompleted]) {
      taskSystem.grantReward(t, economy, reputation);
      hud.toast(`✅ 任务完成！「${t.title}」奖励：$${t.reward.money || 0}`);
      onTaskCompleted(t);
    }
  }
  function exitInterior(isBackExit) {
    // 如果通过室内后门离开，查找对应建筑的后门世界坐标
    if (isBackExit && insideRoom) {
      const backDoor = town.doors.find(d => d.isBack && d.buildingName === insideRoom);
      if (backDoor) {
        returnPoint = { x: backDoor.x, z: backDoor.z };
      }
    }
    interiors.leave();
    town.group.visible = true;
    player.teleport(returnPoint.x, returnPoint.z, town);
    insideRoom = null;
    hud.toast("🚪 离开了室内", { side: true });
  }

  // ---- 行窃：搜刮民居藏物柜 ----
  function stealHome(home) {
    if (home.stashTaken) return;
    home.stashTaken = true;
    if (home.stashMarker) home.stashMarker.visible = false;
    // 隐藏叙事信件 3D 模型
    const room = interiors.get(home.interiorName);
    if (room && room._stashLetter) room._stashLetter.visible = false;

    // 叙事物品翻箱：通过住户的 registry ID 匹配，而不是靠 home.id
    const collected = worldState.state.collectedNotes || [];
    let foundNarrative = null;

    // 收集该房屋所有住户的 registry ID
    const occupantIds = new Set();
    for (const occ of (home.occupants || [])) {
      const owner = occ.phone?.owner || "";
      const impNpc = npcRegistry.findByDisplayName(owner);
      if (impNpc) occupantIds.add(impNpc.id);
    }

    // 按住户 ID 查找叙事物品
    for (const [homeId, items] of Object.entries(HOME_STASH_NARRATIVES)) {
      // 检查是否有住户的 registry ID 在叙事物品数组中
      const matchingItems = items.filter(n => {
        if (n.npcId && occupantIds.has(n.npcId)) return true;
        // 也用 home 名称做后备匹配
        if (home.id === homeId || (home.name && home.name.includes(homeId))) return true;
        return false;
      });
      const available = matchingItems.filter(n => !collected.find(c => c.id === n.id));
      if (available.length > 0 && Math.random() < 0.6) {
        foundNarrative = available[Math.floor(Math.random() * available.length)];
        break;
      }
    }

    if (foundNarrative) {
      // 找到叙事物品，弹出阅读面板
      economy.addMoney(home.stashAmount); // 常规藏物柜钱照拿
      audio.coin();
      showNotePopup(foundNarrative);
    } else {
      economy.addMoney(home.stashAmount);
      audio.coin();
    }

    // 屋内住户可能被惊醒/当场撞见
    const seen = npcManager.burgleHome(home, player.pos);
    reputation.onBurglary(seen);
    if (seen) {
      audio.npcVoice("scared");
      hud.toast(`🚨 搜刮到 $${home.stashAmount}，但被屋主发现了！快溜！`);
      newspaper.publish("burglary", { name: home.name });
    } else if (!foundNarrative) {
      hud.toast(`🤫 神不知鬼不觉，搜刮到 $${home.stashAmount}`);
    }
  }

  // 民居门口的"有人在家吗"线索（夜间看窗户灯光）
  function homeOccupied(home) {
    return home.occupants.some((o) => o.brain.state === State.AT_HOME);
  }

  // ---- 就近购买房产 ----
  function buyProperty(prop) {
    if (economy.ownsProperty(prop.id)) return;
    if (!economy.buyProperty(prop)) {
      hud.toast(`💸 现金不足，买不起「${prop.name}」（$${prop.price}）`);
      return;
    }
    audio.cash();
    interiors.addHomeRoom(prop.id, prop.name);
    minimap.markOwnedHouse(prop.x, prop.z);
    reputation.addHonor(2);
    hud.toast(`🏡 恭喜！你买下了「${prop.name}」，现在可以进去了`);
    newspaper.publish("purchase", { asset: prop.name });
  }

  // ---- NPC 档案面板 ----
  const npcProfilePanel = document.getElementById("npc-profile");
  const npcProfileBody = document.getElementById("npc-profile-body");
  const npcProfileName = document.getElementById("npc-profile-name");
  document.getElementById("npc-profile-close").addEventListener("click", () => {
    npcProfilePanel.classList.add("hidden");
    window.__ww._currentProfileNpc = null;
  });
  // 已被解锁的 NPC 特征/秘密追踪（key: npcId, value: { traits: Set, secrets: Set }）
  const unlockedNpcInfo = {};

  // 构建 NPC 关系上下文，供 AIBrain 选择个性化招呼
  function _buildRelCtx(npc, registryNpc) {
    const npcId = registryNpc?.id || npc.phone?.owner || "镇民";
    // 交互即认识（第一次会弹"你知道了他的名字…"）
    _markNpcKnown(npcId, npc);
    const rel = worldState.state.relationships?.[npcId + "->player"] || { trust: 0, affection: 0 };
    // P14 修正：玩家帮派成员用 personality.gang（NPCManager 写的是 gang），
    // 原来查 factionId 永远 undefined，boss 招呼从不生效。
    const isPlayerFaction = npc.personality?.gang === "player";
    const playerIsBoss = isPlayerFaction && factionSystem.getPlayerInfluence?.() > 30;
    // 最近被玩家打过/重伤（P14：记恨招呼）
    const g = npc._grudgeAgainstPlayer;
    const hurtRecently = !!g && (g.day >= worldState.day - 1);
    const woundedRecently = (npc._woundedByPlayerDay ?? -99) >= worldState.day - 1;
    // 玩家在这人所在势力的声望（P14）
    const gang = npc.personality?.gang;
    const gangRep = gang ? reputation.gangs?.[gang] ?? 0 : 0;
    const factionRep = gangRep >= 15 ? "high" : gangRep <= -15 ? "low" : null;
    return {
      affection: rel.affection || 0, trust: rel.trust || 0, playerIsBoss,
      playerWanted: (reputation.wantedStars || 0) > 0,
      hurtRecently, woundedRecently, factionRep,
    };
  }

  // 获取任意 NPC 的关系 ID（registry NPC 用 id，普通 NPC 用 phone.owner/phone.id）
  function _getNpcRelId(npc) {
    const owner = npc.phone?.owner || "镇民";
    const reg = npcRegistry.findByDisplayName(owner);
    return reg ? reg.id : (npc.phone?.id || owner);
  }

  // ---- 认识系统：玩家交互过才算"认识"，之前头顶不显示名字 ----

  /** NPC 对应的 registry id（没有就 null） */
  function _regIdOf(npc) {
    const owner = npc.phone?.owner || "";
    const reg = owner ? npcRegistry.findByDisplayName(owner) : null;
    return reg?.id || npc.brain?._npcId || null;
  }

  function _knownNpcIds() {
    if (!worldState.state.knownNpcs) worldState.state.knownNpcs = [];
    return worldState.state.knownNpcs;
  }

  /** 玩家认识这个 NPC 了吗（打过招呼/谈过话/一起干过事） */
  function _knowsNpc(npcId) {
    if (!npcId) return false;
    const reg = npcRegistry.get(npcId);
    if (reg && (reg.meta?.isSeedAlly)) return true; // 初始成员/好友开局就认识
    return _knownNpcIds().includes(npcId);
  }

  /** 标记认识（在打招呼/对话/遭遇结算时调用）。返回是否"第一次认识" */
  function _markNpcKnown(npcId, npc = null) {
    if (!npcId) return false;
    const arr = _knownNpcIds();
    if (arr.includes(npcId)) return false;
    arr.push(npcId);
    // 第一次知道名字 → 屏幕中间给个提示（认识感）
    const reg = npcRegistry.get(npcId);
    const name = reg?.displayName || npc?.phone?.owner || "这个人";
    const job = reg?.job || npc?.personality?.job || "";
    const gang = npc?.personality?.gang;
    const facText = gang === "player" ? "，是你帮派的人"
      : gang === "black_hoof" ? "，黑蹄会的人"
      : gang ? `，${gang}的人` : "";
    hud?.toast?.(`🤝 你知道了他的名字：${name}${job ? `（${job}）` : ""}${facText}`, { key: "met-" + npcId, duration: 4600 });
    return true;
  }

  /** 头顶/面板显示名：不认识 → ？？？·职业；认识 → 真名（+势力名） */
  function _displayNameFor(npc) {
    const owner = npc.phone?.owner || "";
    const job = npc.personality?.job || "镇民";
    const reg = npcRegistry.findByDisplayName(owner);
    const nid = reg?.id || npc.brain?._npcId || null;
    // 没有注册 ID 的普通路人：永远是"？？？·职业"（不可逐一认识）
    if (!nid) return `？？？·${job}`;
    if (!_knowsNpc(nid)) return `？？？·${job}`;
    return owner || reg?.displayName || job;
  }

  /** 认识的人的名字下面加势力名（属于某个势力/玩家帮派） */
  function _factionLineFor(npc) {
    const owner = npc.phone?.owner || "";
    const reg = npcRegistry.findByDisplayName(owner);
    const nid = reg?.id || npc.brain?._npcId || null;
    if (!nid || !_knowsNpc(nid)) return null;
    const gang = npc.personality?.gang;
    if (gang === "player") return "我的帮派";
    if (gang === "black_hoof") return "黑蹄会";
    if (gang) return String(gang);
    return null;
  }

  // 通用好感度修改（不论 registry 与否都记录）
  function _addNpcAffinity(npc, trustDelta, affectionDelta) {
    const relId = _getNpcRelId(npc);
    relationshipSystem.addPlayerTrust(relId, trustDelta);
    relationshipSystem.addPlayerAffection(relId, affectionDelta);
    const name = npc.phone?.owner || "镇民";
    const tSign = trustDelta >= 0 ? "+" : "";
    const aSign = affectionDelta >= 0 ? "+" : "";
    hud.toast(`❤️ ${name} 信任${tSign}${trustDelta} 好感${aSign}${affectionDelta}`, { side: true, key: "aff_" + relId });
  }

  // ===== 自由输入：对准心锁定的 NPC 说话 =====

  /** 从数组里随便挑一句（main.js 没导入 MathUtils 的 pick） */
  function _pickLine(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _affectionOf(npc) {
    const owner = npc.phone?.owner || "镇民";
    return _buildRelCtx(npc, npcRegistry.findByDisplayName(owner)).affection;
  }

  /**
   * 初始帮派成员 + 好友（幂等，只在还没有时塞）：
   * 杰克·莫罗（枪手）和 艾琳·沃德（会计）开局就是玩家帮派成员；
   * 顺便给几个关系好的 NPC 设置对玩家的高好感，让势力剧场/召集/选角有人可用。
   */
  function seedInitialAllies() {
    try {
      const pf = factionSystem.getPlayerFaction();
      const seed = [
        { id: "npc_jack", displayName: "杰克·莫罗", job: "枪手", trust: 40, affection: 30 },
        { id: "npc_erin", displayName: "艾琳·沃德", job: "会计", trust: 35, affection: 35 },
      ];
      for (const s of seed) {
        if (pf && !pf.members.includes(s.id)) factionSystem.addPlayerMember(s.id, {
          job: s.job, trust: s.trust, recruitedBy: "initial", undercover: false, displayName: s.displayName,
        });
        npcRegistry?.update?.(s.id, { trust: s.trust, trueFactionId: "player" });
        if (!worldState.getRelationship?.(s.id, "player")) {
          worldState.setRelationship?.(s.id, "player", {
            trust: s.trust, affection: s.affection, fear: 0, debt: 0, resentment: 0, respect: 20,
            lastInteractionDay: worldState.day, flags: [],
          });
        }
        phone.addContact(s.id, s.displayName, s.job);
        if (!_knownNpcIds().includes(s.id)) _knownNpcIds().push(s.id);  // 开局就认识（不弹提示）
      }
      // 好友：贝西、玛莎、老魏（关系好但不在帮派，供势力剧场的"好友"角色）
      const friends = [
        { id: "npc_bessie", displayName: "贝西·柯尔", job: "酒馆老板", trust: 30, affection: 40 },
        { id: "npc_martha", displayName: "玛莎·贝尔", job: "医生", trust: 25, affection: 35 },
        { id: "npc_wei", displayName: "老魏", job: "工具店主", trust: 30, affection: 30 },
      ];
      for (const f of friends) {
        if (!worldState.getRelationship?.(f.id, "player")) {
          worldState.setRelationship?.(f.id, "player", {
            trust: f.trust, affection: f.affection, fear: 0, debt: 0, resentment: 0, respect: 15,
            lastInteractionDay: worldState.day, flags: [],
          });
        }
        phone.addContact(f.id, f.displayName, f.job);
        if (!_knownNpcIds().includes(f.id)) _knownNpcIds().push(f.id);  // 好友开局就认识（不弹提示）
      }
    } catch (e) {
      console.error("[Main] seedInitialAllies 失败", e);
    }
  }

  /**
   * 遭遇结算：把选项上的 effects 落到真实系统。
   *
   * 所有来源（StoryTree / 主线 / 招募 / 洗脑）都复用这一个出口，
   * 好处是"钱和声望到底改没改"只有一处需要保证 —— 直接写 economy/reputation，
   * 不经 worldState 金钱镜像（那是之前"扣钱其实没扣"的根源）。
   */
  function applyEncounterOutcome(enc, choiceId) {
    const choice = (enc.choices || []).find((c) => c.id === choiceId);
    // 没选（稍后再说）也允许有 onDefer
    const fx = choice ? (choice.effects || {}) : (enc.deferEffects || {});
    const npc = enc.npc;

    if (typeof fx.cash === "number" && fx.cash !== 0) {
      economy.addMoney(fx.cash);
      hud.toast(`${fx.cash > 0 ? "💵 +" : "💸 "}$${Math.abs(fx.cash)}`, { side: true, key: "enc-cash" });
    }
    if (typeof fx.honor === "number" && fx.honor !== 0) reputation.addHonor(fx.honor);
    if (typeof fx.wanted === "number" && fx.wanted > 0) reputation.addCrimeWanted?.(fx.wanted);
    if (fx.affinity && npc) _addNpcAffinity(npc, fx.affinity.trust || 0, fx.affinity.affection || 0);
    if (fx.pillar) {
      // { faction, pillar, amount }
      const r = factionSystem.damagePillar(fx.pillar.pillar, fx.pillar.amount || 0, "encounter");
      if (r) hud.toast(`⚔️ ${fx.pillar.pillar} ${fx.pillar.amount > 0 ? "-" : "+"}${Math.abs(fx.pillar.amount)}`, { side: true, key: "enc-pillar" });
    }
    if (fx.recruit && npc) {
      const reg = npcRegistry.findByDisplayName(npc.phone?.owner || "");
      const memberId = reg?.id || _getNpcRelId(npc);
      factionSystem.addPlayerMember(memberId);
      npc.personality.gang = "player";
      const regNpc = reg && npcRegistry.get?.(reg.id);
      if (regNpc) regNpc.factionId = "player";
      if (reg) phone.addContact(reg.id, reg.displayName, reg.job || "镇民");
      hud.toast(`🎉 ${npc.phone?.owner || "他"}加入了你的帮派！`, { key: "enc-recruit" });
      gangs.render?.();
    }
    // 让 StoryTree 之类的来源自己接后续（推进节点等）
    if (typeof enc.onResolved === "function") {
      try { enc.onResolved(choiceId, choice); } catch (e) { console.error("[Encounter] onResolved 出错", e); }
    }
    if (fx.toast) hud.toast(fx.toast, { key: "enc-fx" });
  }

  /**
   * 打倒 NPC 后按其势力归属削弱对应支柱。
   * 这是把街头战斗接进战役层的唯一通道 —— 不接的话支柱只会被黑蹄会自己每天巩固，
   * 玩家永远打不垮它，十日战役无法推进。
   */
  function _damageFactionOnKnock(npc, registryNpc) {
    // 打人这件事本身要进事件流：StoryConditions 的 event_has_tag(violence, player)
    // 靠它判定（ST03 杀亲复仇的启动条件之一）。以前全项目没有任何地方记录
    // violence 标签的事件，所以那个条件永远不成立。
    eventLog?.record?.({
      type: "NPC_BEATEN",
      actors: ["player", registryNpc?.id].filter(Boolean),
      location: "street",
      facts: { npcId: registryNpc?.id || null, name: npc.phone?.owner || "镇民" },
      tags: ["violence", "combat"],
    });

    // 场景侧归属用 personality.gang，档案侧用 registry 的 factionId
    const faction = registryNpc?.factionId || npc.personality?.gang || null;
    if (!faction || faction === "player") return;
    if (faction !== "black_hoof") return; // 目前只有黑蹄会有支柱模型
    // 职级越高，损失越大（干掉副手比干掉小弟伤筋动骨）
    const rank = registryNpc?.factionRank || 1;
    const amount = Math.max(2, Math.round(rank * 1.5));
    const res = factionSystem.damagePillar("manpower", amount, "player_combat");
    hud.toast(`⚔️ 黑蹄会人手 -${amount}（${res?.newValue ?? "?"}）`, { side: true, key: "pillar-manpower" });
    eventLog?.record?.({
      type: "PILLAR_DAMAGED",
      actors: ["player"],
      facts: { factionId: "black_hoof", pillar: "manpower", amount, via: "combat" },
      tags: ["faction", "combat"],
    });
  }

  /** 当前准心/近身锁定的 NPC（对话中优先保持原对象） */
  function _aimedNpc() {
    const t = interaction.currentTarget;
    if (!t) return null;
    if (t.type === "npc" || t.type === "dialogue") return t.data?.npc || null;
    return null;
  }

  /**
   * 打开输入框时：如果面前有 NPC，就理解为在对他说话。
   * 非逃跑/战斗状态的人会停下、转向你、并先说一句开场白（等同搭话）。
   */
  function beginNpcChat() {
    // 剧场事件进行中且玩家在圈内时，输入优先给剧场
    if (theater.active && theater.scene?.zoneLevel === "interact") {
      theaterUI.setTalkTarget("");
      return;
    }
    // 优先接着跟上一个人聊：回车发送后输入框会自动收起，玩家再按回车时
    // 准心可能已经飘开了，这时不该换人或断线，只要对方还活着、还在说话距离内
    // 就继续这段对话。
    let npc = _aimedNpc();
    if (chatTarget && chatTarget.alive
        && Math.hypot(player.pos.x - chatTarget.pos.x, player.pos.z - chatTarget.pos.z) < 6
        && (!npc || npc === chatTarget)) {
      npc = chatTarget;
    }
    if (!npc || !npc.alive) {
      chatTarget = null;
      theaterUI.setTalkTarget("");
      return;
    }
    chatTarget = npc;
    const name = npc.phone?.owner || "镇民";
    theaterUI.setTalkTarget(name);

    // startTalk 在倒地/逃跑时返回 false —— 那就不强行让他停下，但仍然能听见你说话
    const attended = npc.brain.startTalk(player.pos);
    // 已经在跟这个人对话了（比如刚按 F 搭过话），别再蹦一句招呼覆盖当前内容
    const alreadyTalking = floatDlgNpc === npc && !floatDialogue.classList.contains("hidden");
    if (attended && !alreadyTalking) {
      const reg = npcRegistry.findByDisplayName(name);
      const relCtx = _buildRelCtx(npc, reg);
      let opener = null;
      let mood = "neutral";
      if (npc.brain.hasRoleInteraction?.()) {
        opener = npc.brain.getRoleApproach?.();
        mood = "friendly";
      }
      if (!opener) {
        const r = npc.brain.respondTo("greet", reputation.honor, relCtx);
        opener = r?.reply || r?.text;
        mood = r?.mood || "neutral";
      }
      showFloatDialogue(npc, opener || "（他看着你，等你开口）", mood);
      interaction.setDialogueTarget(npc);
      audio.npcVoice("greet");
    } else if (attended) {
      // 已经在对话中，保持当前内容，只确保锁定对象正确
      interaction.setDialogueTarget(npc);
    } else {
      // 在逃/倒地：不打断他的行为，只提示玩家他现在顾不上
      const busy = npc.brain.state === "FLEE" ? "正忙着跑" : "起不来";
      hud.toast(`${name}${busy}，但还听得见你说话`, { side: true, key: "npc-chat-busy" });
    }
  }

  function endNpcChat() {
    theaterUI.setTalkTarget("");
    if (!chatTarget) return; // 没有对话对象就别碰对话框 DOM（防启动早期被调到）
    npcChat.clearHistory(chatTarget);
    if (chatTarget.brain?.state === "TALK") chatTarget.brain.endTalk();
    chatTarget = null;
    hideFloatDialogue();
  }

  /** 自由输入分流：剧场事件 > 单个 NPC > 无人应答 */
  function routeFreeText(text) {
    if (theater.active && theater.scene?.zoneLevel === "interact") {
      theater.submitFreeText(text);
      return;
    }
    if (!chatTarget || !chatTarget.alive) {
      // 输入框开着时玩家可能走开了，再抓一次准心
      chatTarget = _aimedNpc();
    }
    if (!chatTarget || !chatTarget.alive) {
      hud.toast("这儿没人听你说话（对着某人打开输入框，或在调试面板开一场街头事件）", {
        side: true, key: "chat-noone",
      });
      return;
    }
    talkToNpc(chatTarget, text);
  }

  async function talkToNpc(npc, text) {
    const name = npc.phone?.owner || "镇民";
    showPlayerBubble(text.slice(0, 24));
    theaterUI.setPending(true);

    // 远离了就别再回话（避免隔着半个镇子对喊）
    if (Math.hypot(player.pos.x - npc.pos.x, player.pos.z - npc.pos.z) > 9) {
      theaterUI.setPending(false);
      hud.toast(`${name}离得太远，听不见`, { side: true, key: "chat-far" });
      return;
    }

    // 玩家主动搭话就是在维持对话：把墙钟耐心续上，别让"等 AI 生成的 10 秒"
    // 把 NPC 的耐心耗光导致他中途走掉（回合上限仍然管着，聊够了照样走）
    npc.brain.refreshTalkPatience?.();

    const nearbyNames = npcManager.all
      .filter((n) => n !== npc && n.alive && Math.hypot(n.pos.x - npc.pos.x, n.pos.z - npc.pos.z) < 14)
      .slice(0, 6)
      .map((n) => n.phone?.owner)
      .filter(Boolean);

    let res;
    try {
      res = await npcChat.respond({
        npc,
        text,
        ctx: {
          affection: _affectionOf(npc),
          honor: reputation.honor,
          playerMoney: economy.money,
          dailyUse: npcActions.dailyUse(npc),
          nearbyNames,
        },
      });
    } catch (e) {
      res = { say: "……", action: { action: "none" }, mood: "neutral", via: "error" };
    }
    theaterUI.setPending(false);
    if (!npc.alive) return;

    // 先说话，再做事——否则会出现"人已经跑了台词才冒出来"
    showFloatDialogue(npc, res.say, res.mood);
    npc.brain.say(res.say, 3);
    playMoodFx(npc, res.mood); // emoji + 抖一下，情绪比文字更快传达
    audio.npcVoice(res.mood === "hostile" ? "angry" : res.mood === "scared" ? "scared" : "greet");

    const candidates = npcManager.all.filter(
      (n) => n.alive && Math.hypot(n.pos.x - npc.pos.x, n.pos.z - npc.pos.z) < 14
    );
    const done = npcActions.execute(npc, res.action, { candidates });
    if (done.ok && done.detail) {
      console.log(`[NpcChat] ${name} → ${done.actionId} (${done.detail}) via=${res.via}`);
    }
    // 动手/跑掉/被抢之后对话就没法继续了
    if (["attack_player", "flee", "rob_player", "attack_npc"].includes(done.actionId) && done.ok) {
      setTimeout(() => {
        if (chatTarget === npc) {
          chatTarget = null;
          theaterUI.setTalkTarget("");
          hideFloatDialogue();
          theaterUI.collapse();
        }
      }, 1800);
      return;
    }
    // 自由对话也算回合：聊够了 NPC 自己会说"该走了"并走开（收界面 + 清对话对象）
    if (_checkNpcPatience(npc, "free_chat")) {
      chatTarget = null;
      theaterUI.setTalkTarget("");
      theaterUI.collapse();
    }
  }

    // ===== 瞄准：右键按住进瞄准，左键开枪；NPC 会对准他的枪做出反应 =====
  const ammoSystem = new AmmoSystem({
    economy, hud, audio,
    onChange: (n) => hud.setAmmo(n),
  });
  player._fireHandler = () => {
    if (insideRoom) return;
    // 传相机俯仰角：射击系统据此推算命中部位（爆头/躯干/腿）
    combat.fireShot(player.pos, player.facing, ammoSystem, { camPitch: player.camPitch });
  };
  // 爆头额外反馈：屏幕红闪 + 目标飞得更远
  combat.onHeadshot = (npc, knocked, { lethal = false } = {}) => {
    document.body.classList.add("headshot-flash");
    setTimeout(() => document.body.classList.remove("headshot-flash"), lethal ? 340 : 220);
    if (knocked && npc.launchBy) {
      const dx = npc.pos.x - player.pos.x;
      const dz = npc.pos.z - player.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      // launchBy(dir, power, sourceRef)：爆头把人打飞出去（正中眉心打得更远）
      try { npc.launchBy({ x: dx / len, z: dz / len }, lethal ? 9 : 7, player.pos); } catch (e) { void e; }
    }
  };
  combat._shotDropAmmo = (npc) => {
    // 击倒带枪的家伙可能掉子弹
    const gunJobs = ["神枪手", "赏金猎人", "警长", "牛仔"];
    if (gunJobs.includes(npc.personality?.job) || npc.personality?.gang) {
      ammoSystem.rollPickup(0.7, [3, 6], "搜身");
    }
  };
  hud.setAmmo(ammoSystem.ammo); // 初始同步一次，别让 HUD 显示写死的数字

  // 瞄准时：找出正对你枪口的人，让他对枪做出反应
  const _aimScanCd = { t: 0, lastReactAt: 0 };
  function _updateAimingReactions() {
    _aimScanCd.t -= 1;
    if (_aimScanCd.t > 0) return;
    _aimScanCd.t = 6; // 每 6 帧扫一次，别每帧都找
    // 全局节流：findAttackTarget 只返回最近的一个，但玩家把准心从人群上扫过去时，
    // 每次扫描命中的是不同的人（每人各有 4 秒冷却），于是一片人同时开口，
    // 屏幕糊满气泡。限制"全镇每 1.5 秒最多冒出一个被瞄反应"。
    const _now = performance.now() / 1000;
    if (_now - _aimScanCd.lastReactAt < 1.5) return;
    const target = npcManager.findAttackTarget(player.pos, player.facing, 22, 22);
    if (!target) return;
    const owner = target.phone?.owner || "镇民";
    const affection = _affectionOf(target);
    const isActor = !!theater?.isActor?.(target);
    const kind = target.brain.onAimed(player.pos, {
      now: performance.now() / 1000,
      affection,
      // 演员也要对枪口有反应；温和档不切状态，戏能继续
      inShow: isActor,
    });
    if (kind) {
      _aimScanCd.lastReactAt = _now; // 只有真的做出反应才计入节流
      if (isActor) theater.notifyNpcAimed(target, kind);
      const label = {
        plead: "求你放下", defy: "警告你", flee: "吓跑了", startled: "僵住了",
        scared_off_report: "不敢去报官了",
      }[kind] || kind;
      hud.toast(`🔫 ${owner}${label}`, { side: true, key: "aimed_" + owner });
    }
  }

  // 对话后检查 NPC 是否厌烦/想离开，是则结束对话。
  // 注意：这是唯一实现了"判定 → 台词 → 拆 UI → 状态回滚"全链路的收口层，
  // 任何会给好感或播台词的对话分支都必须调它，漏一个就能无限刷。
  function _checkNpcPatience(npc, kind) {
    if (!npc.brain?.checkDialoguePatience) return false;
    const result = npc.brain.checkDialoguePatience(kind);
    if (result && result.endConversation) {
      // 先让 NPC 把"我要走了"这句说出来（头顶冒泡，玩家能看见是谁在结束对话）
      npc.brain.say?.(result.text, 2.6);
      floatDlgText.textContent = result.text;
      floatDlgText.className = "neutral";
      // 提示语跟着人设走：善意的人别说成"不耐烦地走开了"
      const warm = (npc.personality?.sociability ?? 0.5) > 0.55;
      const leaveWord = { scared: "被你吓走了", angry_walk: "翻脸走开了", recruit_annoyed: "不想再听你劝" }[result.reason]
        || (warm ? "说完话，客气地告辞了" : "话说完了，转身走开");
      hud.toast(`🚶 ${npc.phone?.owner || "镇民"}${leaveWord}`, { side: true, key: "npc-leave" });
      hideFloatDialogue();          // 内部会调 endTalk()
      interaction.clearDialogueTarget();
      showPlayerBubble("");
      // 真的走开：endTalk 只是把状态切回 WANDER/AT_PLACE，这里再给个远离玩家的目标点，
      // 否则他会站在原地"离开"，玩家一按 F 又能立刻聊起来
      _walkAwayFrom(npc, player.pos);
      return true;
    }
    return false;
  }

  // 让 NPC 从某个位置走开（结束对话后真的迈步离开，而不是原地站着）
  function _walkAwayFrom(npc, fromPos) {
    const b = npc.brain;
    if (!b || b.state === "DOWN") return;
    const dx = npc.pos.x - fromPos.x;
    const dz = npc.pos.z - fromPos.z;
    const len = Math.hypot(dx, dz) || 1;
    const away = { x: npc.pos.x + (dx / len) * 9, z: npc.pos.z + (dz / len) * 9 };
    // 走岗位的回岗位，其余往远离玩家的方向挪一段
    if (b._placeType) return;
    b.target = away;
    b.stateTimer = Math.max(b.stateTimer || 0, 4);
  }

  // 友善交谈有概率解锁 NPC 隐藏特征/秘密
  function tryUnlockNpcTrait(npc, kind) {
    const owner = npc.phone?.owner || "镇民";
    const impNpc = npcRegistry.findByDisplayName(owner);
    if (!impNpc) return;
    const npcId = impNpc.id;
    if (!unlockedNpcInfo[npcId]) {
      unlockedNpcInfo[npcId] = { traits: new Set(), secrets: new Set() };
      const traitKeys = Object.keys(impNpc.traits || {});
      if (traitKeys.length > 0) unlockedNpcInfo[npcId].traits.add(traitKeys[0]);
    }
    const unlocked = unlockedNpcInfo[npcId];
    // 友善互动有 30% 概率解锁一个隐藏特征
    if (Math.random() < 0.3) {
      const hiddenTraits = Object.keys(impNpc.traits || {}).filter(k => !unlocked.traits.has(k));
      if (hiddenTraits.length > 0) {
        const t = hiddenTraits[Math.floor(Math.random() * hiddenTraits.length)];
        unlocked.traits.add(t);
        const labels = { bravery: "勇敢", aggression: "攻击性", greed: "贪婪", sociability: "社交", loyalty: "忠诚", ambition: "野心", empathy: "同理心" };
        hud.toast(`🔍 你发现${owner}其实很${labels[t] || t}`, { side: true, key: "revealtrait" });
      }
    }
    // 15% 概率解锁一个秘密
    if (Math.random() < 0.15 && impNpc.secrets) {
      const hiddenSecrets = impNpc.secrets.filter(s => !unlocked.secrets.has(s.id));
      if (hiddenSecrets.length > 0) {
        const s = hiddenSecrets[Math.floor(Math.random() * hiddenSecrets.length)];
        unlocked.secrets.add(s.id);
        hud.toast(`🔓 ${owner}不小心说漏了嘴...`, { side: true, key: "revealsecret" });
      }
    }
  }

  function openNPCProfile(npc) {
    const owner = npc.phone?.owner || "镇民";
    // 找到该 NPC 在 registry 中的数据
    const impNpc = npcRegistry.findByDisplayName(owner);
    const npcId = impNpc?.id || owner;
    if (!unlockedNpcInfo[npcId]) {
      unlockedNpcInfo[npcId] = { traits: new Set(), secrets: new Set() };
      // 初始自动解锁一个随机的非极端特征
      if (impNpc?.traits) {
        const traitKeys = Object.keys(impNpc.traits);
        if (traitKeys.length > 0) {
          unlockedNpcInfo[npcId].traits.add(traitKeys[0]);
        }
      }
    }
    const unlocked = unlockedNpcInfo[npcId];

    // 立绘
    const portraitEl = document.getElementById("npc-profile-portrait");
    const heroEl = document.querySelector(".npc-profile-hero");
    // 使用新的 SVG 立绘系统，GP2 图片仅对已有 NPC 优先使用
    const gp2Map = {
      npc_jack: "assets/portraits/npc_jack_gpt2.png",
      npc_erin: "assets/portraits/npc_erin_gpt2.png",
      npc_bessie: "assets/portraits/npc_bessie_gpt2.png",
    };
    const portraitPath = impNpc
      ? (gp2Map[impNpc.id] || getPortrait(impNpc.id))
      : null;
    if (portraitPath && portraitEl) {
      portraitEl.src = portraitPath;
      portraitEl.style.display = "";
      if (heroEl) { heroEl.style.display = ""; heroEl.classList.remove("placeholder"); }
    } else {
      if (portraitEl) portraitEl.style.display = "none";
      if (heroEl) heroEl.style.display = "none"; // 无立绘则完全隐藏立绘区域
    }

    // 追踪当前档案 NPC，供远离自动关闭用
    window.__ww._currentProfileNpc = npc;

    npcProfileName.textContent = `📋 ${owner} · ${npc.personality.job}`;
    let html = "";

    // 基本信息
    html += `<div class="npc-profile-section">`;
    html += `<div class="npc-profile-label">基本信息</div>`;
    html += `<div class="npc-profile-badges">`;
    html += `<span class="npc-profile-badge">👤 ${owner}</span>`;
    html += `<span class="npc-profile-badge">💼 ${npc.personality.job}</span>`;
    if (npc.personality.gang) html += `<span class="npc-profile-badge">🏴 ${npc.personality.gang}</span>`;
    if (impNpc?.factionId) {
      const facLabel = impNpc.factionId === "player" ? "玩家帮派" : impNpc.factionId === "black_hoof" ? "黑蹄会" : impNpc.factionId;
      html += `<span class="npc-profile-badge">🏳️ ${facLabel}</span>`;
    } else {
      html += `<span class="npc-profile-badge">🏳️ 无势力</span>`;
    }
    html += `</div></div>`;

    // 描述
    if (impNpc?.description) {
      html += `<div class="npc-profile-section"><div class="npc-profile-label">简介</div>`;
      html += `<div class="npc-profile-desc">${impNpc.description}</div></div>`;
    }

    // 背景故事（长文本，可展开）
    if (impNpc?.backstory) {
      html += `<div class="npc-profile-section"><div class="npc-profile-label">背景故事</div>`;
      html += `<div class="npc-profile-backstory">${impNpc.backstory}</div></div>`;
    }

    // 性格特征（部分隐藏）
    if (impNpc?.traits) {
      html += `<div class="npc-profile-section"><div class="npc-profile-label">性格特征</div>`;
      html += `<div class="npc-profile-badges">`;
      const traitLabels = {
        bravery: "勇敢", aggression: "攻击性", greed: "贪婪",
        sociability: "社交", loyalty: "忠诚", ambition: "野心", empathy: "同理心"
      };
      for (const [key, val] of Object.entries(impNpc.traits)) {
        const label = traitLabels[key] || key;
        if (unlocked.traits.has(key)) {
          const level = val > 0.7 ? "高" : val > 0.4 ? "中" : "低";
          html += `<span class="npc-profile-badge">${label}: ${level}(${Math.round(val * 100)})</span>`;
        } else {
          html += `<span class="npc-profile-badge hidden-trait">${label}: ??</span>`;
        }
      }
      html += `</div></div>`;
    }

    // 社交关系
    html += `<div class="npc-profile-section"><div class="npc-profile-label">社交关系</div>`;
    html += `<div class="npc-profile-rels">`;
    const allRels = Object.entries(worldState.state.relationships || {});
    // 过滤出与此 NPC 相关的关系，但去重（同一个 NPC 对只显示一次）
    const seenPairs = new Set();
    const myRels = [];
    for (const [key, rel] of allRels) {
      let other, direction;
      if (key.startsWith(npcId + "->")) {
        other = key.split("->")[1];
        direction = "out";
      } else if (key.endsWith("->" + npcId)) {
        other = key.split("->")[0];
        direction = "in";
      } else {
        continue;
      }
      const pairKey = other === "player" ? "player" : other;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      myRels.push({ key, rel, other, direction });
    }

    // 玩家关系始终排在最前面
    const playerRel = myRels.find(r => r.other === "player");
    if (playerRel) {
      const rel = playerRel.rel;
      html += `<div class="npc-profile-rel" style="border-left:3px solid var(--gold);padding-left:8px">`;
      html += `<span class="npc-profile-rel-name">👤 亚瑟（你）</span>`;
      html += `<span class="npc-profile-rel-stat">`;
      if (rel.trust !== undefined) html += `<span class="${rel.trust > 20 ? 'good' : rel.trust < -20 ? 'bad' : 'neut'}">信任 ${rel.trust > 0 ? '+' : ''}${rel.trust}</span>`;
      if (rel.affection !== undefined) html += `<span class="${rel.affection > 20 ? 'good' : 'neut'}">好感 ${rel.affection > 0 ? '+' : ''}${rel.affection}</span>`;
      html += `</span></div>`;
    } else {
      // 没有记录的关系，显示默认值
      html += `<div class="npc-profile-rel" style="border-left:3px solid var(--gold);padding-left:8px">`;
      html += `<span class="npc-profile-rel-name">👤 亚瑟（你）</span>`;
      html += `<span class="npc-profile-rel-stat"><span class="neut">信任 0</span><span class="neut">好感 0</span></span>`;
      html += `</div>`;
    }

    // 其他 NPC 关系
    const otherRels = myRels.filter(r => r.other !== "player");
    if (otherRels.length > 0) {
      for (const { rel, other } of otherRels.slice(0, 7)) {
        const otherNpc = worldState.state.npcs[other];
        const otherName = otherNpc?.displayName || other;
        html += `<div class="npc-profile-rel">`;
        html += `<span class="npc-profile-rel-name">${otherName}</span>`;
        html += `<span class="npc-profile-rel-stat">`;
        if (rel.trust !== undefined) html += `<span class="${rel.trust > 20 ? 'good' : rel.trust < -20 ? 'bad' : 'neut'}">信任 ${rel.trust > 0 ? '+' : ''}${rel.trust}</span>`;
        if (rel.affection !== undefined) html += `<span class="${rel.affection > 20 ? 'good' : 'neut'}">好感 ${rel.affection > 0 ? '+' : ''}${rel.affection}</span>`;
        html += `</span></div>`;
      }
    }
    if (myRels.length === 0 || (myRels.length === 1 && playerRel)) {
      html += `<div class="npc-profile-desc">暂无已知社交关系</div>`;
    }
    html += `</div></div>`;

    // 交手记录
    const encounters = npc._encounters || [];
    if (encounters.length > 0) {
      html += `<div class="npc-profile-section"><div class="npc-profile-label">⚔️ 交手记录</div>`;
      const recent = encounters.slice(-6).reverse();
      for (const e of recent) {
        let icon, desc;
        if (e.type === "attack_player") {
          icon = "🗡️"; desc = `第${e.day || "?"}天 · 攻击了你 (${e.dmg || "?"}点伤害)`;
        } else if (e.type === "hit_by_player") {
          icon = e.knocked ? "👊💥" : "👊"; desc = `第${e.day || "?"}天 · 你${e.knocked ? "击倒了他" : "击中了他"}`;
        } else if (e.type === "killed_player") {
          icon = "💀"; desc = `第${e.day || "?"}天 · 把你打倒 (${e.reason || "战斗"})`;
        } else {
          icon = "📝"; desc = `第${e.day || "?"}天 · ${e.type}`;
        }
        html += `<div class="npc-profile-badge" style="margin:2px 0">${icon} ${desc}</div>`;
      }
      html += `</div>`;
    }

    // 秘密
    if (impNpc?.secrets && impNpc.secrets.length > 0) {
      html += `<div class="npc-profile-section"><div class="npc-profile-label">已知秘密</div>`;
      const revealed = impNpc.secrets.filter(s => unlocked.secrets.has(s.id));
      if (revealed.length > 0) {
        for (const s of revealed) {
          html += `<div class="npc-profile-badge" style="margin:3px 0">🔓 ${s.desc}</div>`;
        }
      } else {
        html += `<div class="npc-profile-desc">暂无发现的秘密。多交谈、看报纸或招募后可解锁。</div>`;
      }
      const hiddenCount = impNpc.secrets.length - unlocked.secrets.size;
      if (hiddenCount > 0) {
        html += `<div class="npc-profile-desc" style="margin-top:4px">🔒 还有 ${hiddenCount} 个秘密未发现</div>`;
      }
      html += `</div>`;
    }

    // 收集的叙事物品
    if (impNpc) {
      const myNotes = (worldState.state.collectedNotes || []).filter(n => {
        const narrItem = NARRATIVE_ITEMS.find(ni => ni.id === n.id);
        return narrItem && narrItem.npcId === impNpc.id;
      });
      if (myNotes.length > 0) {
        html += `<div class="npc-profile-section"><div class="npc-profile-label">📜 发现的信件</div>`;
        for (const n of myNotes) {
          html += `<div class="npc-profile-badge" style="margin:3px 0">📄 ${n.name} (第${n.day}天发现)</div>`;
        }
        html += `</div>`;
      }
    }

    // 目标
    if (impNpc?.goals && impNpc.goals.length > 0) {
      const rel = (worldState.state.relationships || {})[npcId + "->player"];
      const trust = rel?.trust || 0;
      if (trust > 15) {
        html += `<div class="npc-profile-section"><div class="npc-profile-label">个人目标</div>`;
        for (const g of impNpc.goals) {
          html += `<div class="npc-profile-badge" style="margin:2px 0;display:block;text-align:left">🎯 ${g.desc} (紧迫:${g.urgency})</div>`;
        }
        html += `</div>`;
      }
    }

    npcProfileBody.innerHTML = html;
    npcProfilePanel.classList.remove("hidden");
  }

  // ---- RDR2 式准心交互 (替代旧 handleWorldInteract) ----

  // 浮动对话面板引用
  const floatDialogue = document.getElementById("float-dialogue");
  const floatDlgAvatar = document.getElementById("float-dialogue-avatar");
  const floatDlgName = document.getElementById("float-dialogue-name-text");
  const floatDlgText = document.getElementById("float-dialogue-text");
  const floatDlgActions = document.getElementById("float-dialogue-actions");
  let floatDlgNpc = null;

  // 玩家头顶冒泡
  let playerBubbleTimer = 0;
  function showPlayerBubble(text) {
    const pb = document.getElementById("player-bubble");
    if (!pb) return;
    pb.textContent = text;
    pb.classList.remove("hidden");
    playerBubbleTimer = 2.2;
  }

  // 任务完成后的氛围反馈：玩家冒泡 + 近处NPC冒泡 + 手机消息
  function onTaskCompleted(task, npcTarget) {
    // 玩家冒泡庆祝
    const cheers = ["搞定了！", "任务完成！", "轻松搞定！", "赏金到手！", "小事一桩！"];
    showPlayerBubble(cheers[Math.floor(Math.random() * cheers.length)]);

    // 被击败的NPC冒泡（如果有）
    if (npcTarget && npcTarget.brain) {
      npcTarget.brain.bubble = npcTarget.phone?.owner ? `${npcTarget.phone.owner}被你揍了一顿` : null;
      if (npcTarget.brain.bubbleTimer !== undefined) npcTarget.brain.bubbleTimer = 3;
    }

    // 附近NPC冒泡反应（惊叹/八卦）
    let nearbyReacted = false;
    for (const npc of npcManager.all) {
      if (!npc.alive || npc === npcTarget || npc.brain.state === "DOWN") continue;
      const d = Math.hypot(npc.pos.x - player.pos.x, npc.pos.z - player.pos.z);
      if (d < 12 && !npc.brain.bubble) {
        const reacts = task.type === "bounty"
          ? ["有人在打架...", "天哪！", "快叫警长！", "打得好！"]
          : ["发生了什么？", "那个人好像...", "任务完成？", "厉害！"];
        npc.brain.bubble = reacts[Math.floor(Math.random() * reacts.length)];
        if (npc.brain.bubbleTimer !== undefined) npc.brain.bubbleTimer = 3;
        nearbyReacted = true;
        break; // 只让一个附近NPC反应
      }
    }

    // 手机推送任务完成通知（延迟）
    setTimeout(() => {
      const hon = task.reward.honor ? ` +${task.reward.honor}荣誉` : '';
      phone.deliverMessage("system", "任务通知",
        `「${task.title}」已完成！奖励已到账。${task.reward.money ? `+$${task.reward.money}` : ''}${hon}`, {});
    }, 2000);
  }

  function showFloatDialogue(npc, text, mood) {
    floatDlgNpc = npc;
    const owner = npc.phone?.owner || "镇民";
    // 认识系统：没打过招呼前显示 ？？？·职业，交互后才露真名
    const dispName = _displayNameFor(npc);
    const facLine = _factionLineFor(npc);
    // 查找 registry 中的 npcId 以获取头像
    const regNpc = npcRegistry.findByDisplayName(owner);
    const npcId = regNpc?.id;
    const avatarUrl = getAvatar(npcId);
    if (floatDlgAvatar && avatarUrl) {
      floatDlgAvatar.src = avatarUrl;
      floatDlgAvatar.classList.remove("hidden");
    } else if (floatDlgAvatar) {
      floatDlgAvatar.classList.add("hidden");
    }
    floatDlgName.textContent = facLine ? `${dispName}（${facLine}）· ${npc.personality.job}` : `${dispName} · ${npc.personality.job}`;
    floatDlgText.textContent = text;
    floatDlgText.className = "";
    if (mood) floatDlgText.classList.add(mood);
    // 动作按钮不再放在右侧浮动面板中，而是合并到左侧交互面板
    floatDlgActions.innerHTML = "";
    floatDialogue.classList.remove("hidden");
  }

  function hideFloatDialogue() {
    if (floatDlgNpc && floatDlgNpc.brain && typeof floatDlgNpc.brain.endTalk === "function") floatDlgNpc.brain.endTalk();
    floatDialogue.classList.add("hidden");
    floatDlgNpc = null;
  }

  function handleFloatDlgAction(action) {
    if (!floatDlgNpc) return;
    const npc = floatDlgNpc;
    if (action === "close") { hideFloatDialogue(); return; }

    if (action === "praise" || action === "greet") {
      npc.brain.startTalk(player.pos);
      const result = npc.brain.respondTo(action, reputation.honor, _buildRelCtx(npc, npcRegistry.findByDisplayName(npc.phone?.owner || "镇民")));
      floatDlgText.textContent = result.reply || result.text || "（对方点了点头）";
      floatDlgText.className = result.mood || "";
      showPlayerBubble(action === "greet" ? "你好啊！" : "真不错！");
      reputation.onKindDialogue(npc.personality.gang);
      audio.npcVoice(Math.random() < 0.5 ? "greet" : "happy");
      const owner = npc.phone?.owner || "镇民";
      const registryNpc = npcRegistry.findByDisplayName(owner);
      const trustAmt = action === "praise" ? 8 : 5;
      const affAmt = action === "praise" ? 6 : 3;
      _addNpcAffinity(npc, trustAmt, affAmt);
      if (registryNpc) {
        phone.addContact(registryNpc.id, registryNpc.displayName, registryNpc.job || "镇民");
      }
      tryUnlockNpcTrait(npc, action);
    } else if (action === "threat" || action === "extort") {
      // 复杂交互进全屏对话面板
      hideFloatDialogue();
      tryStartDialogue(npc);
    } else if (action === "recruit") {
      // 招募进全屏对话面板
      hideFloatDialogue();
      tryStartDialogue(npc);
    }
  }

  // ========== 偷窃系统（翻牌搜刮）==========
  const stealPanel = document.getElementById("steal-panel");
  const stealGrid = document.getElementById("steal-grid");
  const stealTimer = document.getElementById("steal-timer");
  const stealRiskVal = document.getElementById("steal-risk-val");

  // 叙事物品阅读弹窗
  const notePopup = document.getElementById("note-popup");
  const notePopupName = document.getElementById("note-popup-name");
  const notePopupContent = document.getElementById("note-popup-content");
  const notePopupPrice = document.getElementById("note-popup-price");
  const notePopupKeep = document.getElementById("note-popup-keep");
  const notePopupSell = document.getElementById("note-popup-sell");
  const notePopupClose = document.getElementById("note-popup-close");
  let currentNoteItem = null; // 当前正在阅读的叙事物品

  notePopupClose.addEventListener("click", closeNotePopup);
  notePopupKeep.addEventListener("click", keepNote);
  notePopupSell.addEventListener("click", sellNote);

  function showNotePopup(item) {
    currentNoteItem = item;
    notePopupName.textContent = `📜 ${item.name}`;
    notePopupContent.textContent = item.content;
    notePopupPrice.textContent = item.value;
    notePopup.classList.remove("hidden");
    document.exitPointerLock();
  }

  function closeNotePopup() {
    notePopup.classList.add("hidden");
    currentNoteItem = null;
    // 如果有进行中的偷窃，不要急于锁定鼠标——让玩家自己关闭弹窗后继续
    if (!stealState) {
      // 不需要锁定，等待下次交互
    }
  }

  function keepNote() {
    if (!currentNoteItem) return;
    const ws = worldState;
    // 记录到已收集
    if (!ws.state.collectedNotes) ws.state.collectedNotes = [];
    if (!ws.state.collectedNotes.find(n => n.id === currentNoteItem.id)) {
      ws.state.collectedNotes.push({ id: currentNoteItem.id, name: currentNoteItem.name, day: worldClock.day });
    }
    // 揭示秘密
    if (currentNoteItem.secretRevealed && currentNoteItem.npcId) {
      const npcDef = npcRegistry.get(currentNoteItem.npcId);
      if (npcDef) {
        const secret = (npcDef.secrets || []).find(s => s.id === currentNoteItem.secretRevealed);
        if (secret && !secret.revealed) {
          secret.revealed = true;
          if (!secret.knownBy.includes("player")) secret.knownBy.push("player");
          // 更新解锁追踪
          if (!unlockedNpcInfo[currentNoteItem.npcId]) {
            unlockedNpcInfo[currentNoteItem.npcId] = { traits: new Set(), secrets: new Set() };
          }
          unlockedNpcInfo[currentNoteItem.npcId].secrets.add(currentNoteItem.secretRevealed);
          npcRegistry.update(currentNoteItem.npcId, { secrets: npcDef.secrets });
          hud.toast(`📖 揭示了「${secret.desc}」！`, { side: true, key: "revealsecret" });
        }
      }
    }
    hud.toast(`📖 收藏了「${currentNoteItem.name}」`, { side: true, key: "keepnote" });
    closeNotePopup();
  }

  function sellNote() {
    if (!currentNoteItem) return;
    economy.addMoney(currentNoteItem.value);
    audio.coin();
    hud.toast(`💰 卖掉了「${currentNoteItem.name}」，获得 $${currentNoteItem.value}`, { side: true, key: "sellnote" });
    closeNotePopup();
  }
  const stealTargetName = document.getElementById("steal-target-name");
  let stealState = null;
  // NPC 被盗追踪：key = npcName，value = { lastDay, cooldown, walletSize }
  const npcTheftTracker = {};
  // stealState: { npc, slots[], revealed:Set, revealing:Map(idx->timer), timer, risk, started }

  // NPC 携带物品表（按职业/财富分级）
  const NPC_POCKETS = {
    common: [
      { icon: "🪙", label: "几枚硬币", value: 8 },
      { icon: "🍞", label: "干面包", value: 2 },
      { icon: "🔑", label: "一把钥匙", value: 12 },
      { icon: "🧣", label: "旧手帕", value: 3 },
      { icon: "📝", label: "折叠的纸条", value: 5 },
      { icon: "🌿", label: "嚼烟叶", value: 4 },
      { icon: "🪨", label: "幸运石", value: 6 },
      { icon: "🎲", label: "骰子", value: 7 },
    ],
    wealthy: [
      { icon: "💍", label: "银戒指", value: 45 },
      { icon: "💰", label: "一叠钞票", value: 55 },
      { icon: "⌚", label: "怀表", value: 38 },
      { icon: "💎", label: "金链子", value: 70 },
      { icon: "📜", label: "地契", value: 80 },
      { icon: "💵", label: "大额钞票", value: 50 },
    ],
    special: [
      { icon: "🎖", label: "警徽", value: 30 },
      { icon: "🎵", label: "口琴", value: 15 },
      { icon: "🔫", label: "小手枪", value: 60 },
      { icon: "📿", label: "念珠", value: 22 },
      { icon: "🗡", label: "小刀", value: 28 },
    ],
  };

  function isWealthyNpc(npc) {
    const job = (npc.personality?.job || "").toLowerCase();
    return job.includes("银行") || job.includes("商") || job.includes("老板")
      || job.includes("歌") || job.includes("演员") || job.includes("律师")
      || job.includes("医生") || job.includes("警长");
  }

  function generateStealItems(npc) {
    const wealthy = isWealthyNpc(npc);
    const pool = [...NPC_POCKETS.common, ...(wealthy ? NPC_POCKETS.wealthy : [])];
    if (Math.random() < 0.2) pool.push(...NPC_POCKETS.special);

    // 叙事物品注入：找到该 NPC 对应的 registry ID，检查是否有口袋叙事物品
    const owner = npc.phone?.owner || "";
    const impNpc = npcRegistry.findByDisplayName(owner);
    const collected = worldState.state.collectedNotes || [];
    if (impNpc && NPC_POCKET_NARRATIVES[impNpc.id]) {
      const narrItems = NPC_POCKET_NARRATIVES[impNpc.id].filter(
        n => !collected.find(c => c.id === n.id)
      );
      if (narrItems.length > 0) {
        // 50% 概率注入一个叙事物品到偷窃格子
        if (Math.random() < 0.5) {
          const narr = narrItems[Math.floor(Math.random() * narrItems.length)];
          pool.push({ icon: narr.icon, label: narr.name, value: narr.value, _narrative: narr });
        }
      }
    }

    const count = Math.min(pool.length, 1 + Math.floor(Math.random() * (wealthy ? 3 : 2)));
    const picked = [];
    const used = new Set();
    while (picked.length < count) {
      const idx = Math.floor(Math.random() * pool.length);
      if (used.has(idx)) continue;
      used.add(idx);
      picked.push({ ...pool[idx], revealTime: 0.8 + Math.random() * 1.5 });
    }
    return picked;
  }

  function startSteal(npc) {
    const name = npc.phone?.owner || "镇民";
    const tracker = npcTheftTracker[name] || {};
    const currentDay = worldClock.day;

    // 同一 NPC 只能偷 X 次/天（富人2次、普通人1次）
    const maxSteals = isWealthyNpc(npc) ? 2 : 1;
    if (tracker.lastDay === currentDay && (tracker.count || 0) >= maxSteals) {
      hud.toast(`${name}的钱包已经空了，换个目标吧`, { side: true, key: "nowallet" });
      return;
    }
    // 如果刚被偷不久（同一天后续偷），减少物品数量
    const alreadyStolen = tracker.lastDay === currentDay;

    document.exitPointerLock();
    stealTargetName.textContent = `${name} · ${npc.personality?.job || ""}`;
    const items = generateStealItems(npc);
    // 如果已经被偷过，减少到1个物品
    const finalItems = alreadyStolen ? items.slice(0, 1) : items;
    stealState = {
      npc,
      slots: finalItems,
      revealed: new Set(),
      revealing: new Map(),
      stolen: new Set(),
      timer: alreadyStolen ? 5.0 : 8.0,
      risk: alreadyStolen ? 20 : 0, // 再偷起步风险高
      started: true,
    };
    renderStealGrid();
    stealPanel.classList.remove("hidden");
  }

  function renderStealGrid() {
    stealGrid.innerHTML = "";
    for (let i = 0; i < stealState.slots.length; i++) {
      const item = stealState.slots[i];
      const slot = document.createElement("div");
      slot.className = "steal-slot";
      if (stealState.stolen.has(i)) slot.classList.add("stolen");
      if (stealState.revealing.has(i)) slot.classList.add("revealing");

      // 内容
      const iconEl = document.createElement("span");
      iconEl.className = "steal-slot-icon";

      if (stealState.stolen.has(i)) {
        iconEl.textContent = "✓";
      } else if (stealState.revealed.has(i)) {
        iconEl.textContent = item.icon || "📦";
      } else {
        iconEl.textContent = "❓";
      }
      slot.appendChild(iconEl);

      // 已翻开的显示物品名和估值，点击即可偷取
      if (stealState.revealed.has(i) || stealState.stolen.has(i)) {
        const label = document.createElement("span");
        label.className = "steal-slot-label";
        label.textContent = stealState.stolen.has(i) ? "已偷走" : item.label;
        slot.appendChild(label);
        if (!stealState.stolen.has(i)) {
          const val = document.createElement("span");
          val.className = "steal-slot-value";
          val.textContent = `$${item.value}`;
          slot.appendChild(val);
          // 已翻开未偷走的：点击偷取
          slot.addEventListener("click", () => stealItem(i));
        }
      } else if (!stealState.revealing.has(i)) {
        // 可点击翻牌
        slot.addEventListener("click", () => startRevealSlot(i));
      }

      stealGrid.appendChild(slot);
    }

    stealTimer.textContent = `⏱ ${stealState.timer.toFixed(1)}s`;
    stealRiskVal.textContent = `${Math.round(stealState.risk)}%`;
    if (stealState.risk > 70) stealRiskVal.style.color = "#ff4444";
    else stealRiskVal.style.color = "";
  }

  function startRevealSlot(idx) {
    if (!stealState) return;
    if (stealState.revealed.has(idx) || stealState.stolen.has(idx)) return;
    if (stealState.revealing.has(idx)) return;
    // 开始翻牌动画
    stealState.revealing.set(idx, stealState.slots[idx].revealTime || 1.2);
    renderStealGrid();
  }

  function stealItem(idx) {
    if (!stealState || stealState.stolen.has(idx)) return;
    stealState.stolen.add(idx);
    stealState.revealing.delete(idx);
    const item = stealState.slots[idx];

    // 叙事物品：弹窗阅读，不直接加钱
    if (item._narrative) {
      const narr = item._narrative;
      // 先关闭偷窃面板
      stealPanel.classList.add("hidden");
      const savedSteal = stealState;
      stealState = null;
      // 标记为已偷过
      const name = savedSteal.npc.phone?.owner || "镇民";
      const tracker = npcTheftTracker[name] || {};
      tracker.lastDay = worldClock.day;
      tracker.count = (tracker.count || 0) + 1;
      npcTheftTracker[name] = tracker;
      // 弹出阅读面板
      showNotePopup(narr);
      return;
    }

    economy.addMoney(item.value);
    audio.coin();
    stealState.risk += 5 + Math.random() * 12;
    hud.toast(`🫳 摸到了「${item.label}」，$${item.value}！`, { side: true, key: "stealitem" });
    renderStealGrid();
  }

  function cancelSteal() {
    if (!stealState) return;
    stealPanel.classList.add("hidden");
    stealState = null;
    hud.toast("取消了搜刮", { side: true, key: "cancelsteal" });
  }

  function updateSteal(dt) {
    if (!stealState) return;

    // NPC 走太远→自动退出
    const npc = stealState.npc;
    const d = Math.hypot(player.pos.x - npc.pos.x, player.pos.z - npc.pos.z);
    if (d > 8 || !npc.alive || npc.brain.state === "DOWN") {
      stealPanel.classList.add("hidden");
      stealState = null;
      hud.toast("目标已远离，搜刮中断", { side: true, key: "stealfar" });
      return;
    }

    // 翻牌倒计时
    let changed = false;
    for (const [idx, remaining] of stealState.revealing) {
      const newRemaining = remaining - dt;
      if (newRemaining <= 0) {
        stealState.revealing.delete(idx);
        stealState.revealed.add(idx);
        changed = true;
      } else {
        stealState.revealing.set(idx, newRemaining);
      }
    }
    // 已翻开的格子在revealed中等待玩家点击偷取

    stealState.timer -= dt;
    stealState.risk += dt * 3;

    if (stealState.risk >= 100) {
      npc.brain.witnessCrime(player.pos, "theft");
      npcManager.broadcastPanic(player.pos, 12);
      reputation.onBurglary(true);
      audio.npcVoice("angry");
      hud.toast("🚨 偷窃被发现！", { key: "caughtsteal" });
      stealPanel.classList.add("hidden");
      stealState = null;
      return;
    }

    if (stealState.timer <= 0) {
      // 记录盗窃
      const npcName = npc.phone?.owner || "镇民";
      const tracker = npcTheftTracker[npcName] || { count: 0 };
      tracker.lastDay = worldClock.day;
      tracker.count = (tracker.count || 0) + 1;
      tracker.discoveryTimer = 8 + Math.random() * 12; // 8-20秒后 NPC 发现被偷
      npcTheftTracker[npcName] = tracker;

      const total = [...stealState.stolen].reduce((s, i) => s + stealState.slots[i].value, 0);
      const numItems = stealState.stolen.size;
      hud.toast(`✨ 搜刮完毕，共偷到 ${numItems} 件物品，$ ${total}`, { key: "stealdone" });
      // 偷到东西时有机会摸到子弹（身上带枪的人概率更高）
      if (numItems > 0) {
        const gunJobs = ["神枪手", "赏金猎人", "警长", "牛仔"];
        const armed = gunJobs.includes(stealState.npc?.personality?.job) || stealState.npc?.personality?.gang;
        ammoSystem.rollPickup(armed ? 0.55 : 0.25, [2, 4], "摸到的子弹");
      }
      stealPanel.classList.add("hidden");
      stealState = null;
      return;
    }

    if (changed) renderStealGrid();
    // 每0.3秒刷新一次计时器显示
    stealTimer.textContent = `⏱ ${stealState.timer.toFixed(1)}s`;
    stealRiskVal.textContent = `${Math.round(stealState.risk)}%`;
    if (stealState.risk > 70) stealRiskVal.style.color = "#ff4444";
    else stealRiskVal.style.color = "";
  }

  function handleWorldInteract() {
    if (player.inVehicle) {
      hud.showHint("按 <b>E</b> 下车");
      if (input.wasPressed("KeyE")) {
        player.inVehicle.occupied = false;
        player.pos.x = player.inVehicle.position.x + 2.5;
        player.pos.z = player.inVehicle.position.z;
        player.inVehicle = null;
      }
      return;
    }

    // 室内：保持原有逻辑链 + RDR2 NPC 交互
    if (insideRoom) {
      const room = interiors.get(insideRoom);
      let actionTaken = false;
      const home = room.homeRef;

      // 藏物柜
      if (home && !home.stashTaken && home.stashPoint) {
        const dStash = Math.hypot(player.pos.x - home.stashPoint.x, player.pos.z - home.stashPoint.z);
        if (dStash < 2.2) {
          hud.showHint("按 <b>E</b> 搜刮柜子");
          if (input.wasPressed("KeyE")) { stealHome(home); actionTaken = true; }
        }
      }
      // 可交互物（老虎机/百家乐/账本等）
      if (!actionTaken && room.interactables) {
        for (const ia of room.interactables) {
          if (Math.hypot(player.pos.x - ia.x, player.pos.z - ia.z) < 2) {
            if (ia.type === "ledger") {
              // 赌场账本：任务物品
              if (room.ledgerTaken) break;
              hud.showHint(`按 <b>E</b> 拾取账本 📕`);
              if (input.wasPressed("KeyE")) {
                room.ledgerTaken = true;
                // 隐藏可见的账本模型
                if (room._ledgerMesh) room._ledgerMesh.visible = false;
                actionTaken = true;
                audio.coin();
                const completed = taskSystem.checkCompletion({ type: "item_collected", itemId: "casino_ledger" });
                for (const t of completed) {
                  taskSystem.grantReward(t, economy, reputation);
                  hud.toast(`✅ 任务完成！「${t.title}」奖励：$${t.reward.money || 0}`);
                  onTaskCompleted(t);
                }
                if (completed.length === 0) {
                  hud.toast("📕 你拿到了赌场账本！也许之后会有用……", { side: true, key: "ledger" });
                }
              }
              break;
            }
            const label = ia.type === "slot" ? "玩老虎机 🎰" : "玩百家乐 🃏";
            hud.showHint(`按 <b>E</b> ${label}`);
            if (input.wasPressed("KeyE")) {
              actionTaken = true;
              document.exitPointerLock();
              if (ia.type === "slot") slots.open(); else baccarat.open();
            }
            break;
          }
        }
      }
      // 掉落物
      if (!actionTaken) {
        const item = loot.nearest(player.pos);
        if (item) {
          hud.showHint(`按 <b>E</b> 拾取`);
          if (input.wasPressed("KeyE")) { pickup(item); actionTaken = true; }
        }
      }
      // 出口
      if (!actionTaken) {
        const dExit = Math.hypot(player.pos.x - room.exit.x, player.pos.z - room.exit.z);
        if (dExit < 2.2) {
          hud.showHint("按 <b>E</b> 走出去");
          if (input.wasPressed("KeyE")) { exitInterior(); actionTaken = true; }
        }
      }
      // 睡觉已移到主屏幕按钮操作，不再在床位显示提示
      if (!actionTaken) {
        const bedX = room.exit.x, bedZ = room.exit.z + 2;
        const dBed = Math.hypot(player.pos.x - bedX, player.pos.z - bedZ);
        const promptEl = document.getElementById("sleep-prompt");
        if (dBed < 1.8 && promptEl) promptEl.classList.add("hidden");
      }

      // 室内 RDR2 NPC 交互（与室外共用管道）
      interaction.scan(player, insideRoom, { room, home });
      const indoorTarget = interaction.currentTarget;
      const indoorActions = interaction.getActions();
      if (indoorTarget && indoorTarget.type === "dialogue") {
        // 对话模式中的NPC保持浮动UI
        hud.hideHint();
      } else if (indoorTarget && indoorTarget.type === "npc" && indoorActions.length > 0) {
        const hintEl = document.getElementById("interact-hint");
        const menuEl = document.getElementById("interact-menu");
        const topAction = indoorActions[0];
        // 只在有NPC可交互时覆盖hint，否则留给上面的E键提示
        if (topAction.hint && !actionTaken) {
          hintEl.classList.remove("hidden");
          hintEl.textContent = topAction.hint;
        }
        if (indoorActions.some(a => a.label)) {
          menuEl.classList.remove("hidden");
          let html = "";
          for (const act of indoorActions) {
            if (!act.label) continue;
            html += `<button class="int-act-btn" data-action="${act.action}">
              <span class="int-act-icon">${act.icon}</span>
              <span class="int-act-label">${act.label}</span>
              <span class="int-act-key">${act.key || ""}</span>
            </button>`;
          }
          menuEl.innerHTML = html;
          for (const btn of menuEl.querySelectorAll(".int-act-btn")) {
            btn.addEventListener("click", () => {
              const result = interaction.executeAction(btn.dataset.action);
              dispatchInteraction(result);
            });
          }
        }
        // 快捷按键
        const shortcutResult = interaction.handleInput(input, true);
        if (shortcutResult) {
          dispatchInteraction(shortcutResult);
        }
      } else {
        if (!actionTaken) hud.hideHint();
        // 隐藏菜单（没有NPC要交互）
        const menuEl = document.getElementById("interact-menu");
        if (menuEl && indoorTarget?.type !== "npc") menuEl.classList.add("hidden");
        const hintEl = document.getElementById("interact-hint");
        if (hintEl && (!indoorTarget || indoorTarget.type !== "npc")) hintEl.classList.add("hidden");
      }

      if (!actionTaken && (!indoorTarget || indoorTarget.type !== "npc")) hud.hideHint();
      return;
    }

    // === 室外：RDR2 准心交互 ===
    // 扫描可交互目标
    interaction.scan(player, false, null);
    const target = interaction.currentTarget;
    const actions = interaction.getActions();

    // 渲染浮动 UI
    const hintEl = document.getElementById("interact-hint");
    const menuEl = document.getElementById("interact-menu");
    if (target && actions.length > 0) {
      hintEl.classList.remove("hidden");
      hintEl.textContent = actions[0].hint || "";
      if (actions.some(a => a.label)) {
        menuEl.classList.remove("hidden");
        let html = "";
        for (const act of actions) {
          if (!act.label) continue;
          html += `<button class="int-act-btn" data-action="${act.action}">
            <span class="int-act-icon">${act.icon}</span>
            <span class="int-act-label">${act.label}</span>
            <span class="int-act-key">${act.key || ""}</span>
          </button>`;
        }
        menuEl.innerHTML = html;
        // 绑定点击事件
        for (const btn of menuEl.querySelectorAll(".int-act-btn")) {
          btn.addEventListener("click", () => {
            const result = interaction.executeAction(btn.dataset.action);
            if (result) dispatchInteraction(result);
          });
        }
      } else {
        menuEl.classList.add("hidden");
      }
    } else {
      hintEl.classList.add("hidden");
      menuEl.classList.add("hidden");
    }

    // 快捷键处理
    const shortcutResult = interaction.handleInput(input, false);
    if (shortcutResult) {
      dispatchInteraction(shortcutResult);
    }

    // —— 额外兼容：保持房产/民居/银行门口的距离检测（玩家不走门正面但近身时）——
    let hintShown = target !== null;

    if (!hintShown) {
      // 房产
      for (const prop of town.properties) {
        const d = Math.hypot(player.pos.x - prop.doorX, player.pos.z - prop.doorZ);
        if (d < 2.6) {
          const owned = economy.ownsProperty(prop.id);
          if (owned) {
            hud.showHint(`按 <b>E</b> 进入你的「${prop.name}」`);
            if (input.wasPressed("KeyE")) enterInterior(prop.id);
          } else if (prop.shopItem) {
            hud.showHint(`「${prop.name}」待售 · 在集市(M)购买地契 · $${prop.price}`);
          } else {
            hud.showHint(`按 <b>E</b> 购买「${prop.name}」 · $${prop.price}`);
            if (input.wasPressed("KeyE")) buyProperty(prop);
          }
          hintShown = true;
          break;
        }
      }
    }

    if (!hintShown) {
      // 民居
      for (const home of town.homes) {
        if (Math.hypot(player.pos.x - home.doorX, player.pos.z - home.doorZ) < 2.5) {
          let cue = sky.isNight ? (homeOccupied(home) ? "🕯️ 窗内透出灯光" : "🌑 黑着灯") : "🪟 窗帘半掩";
          hud.showHint(`${cue} · 按 <b>E</b> 进入${home.name}`);
          if (input.wasPressed("KeyE")) enterInterior(home.interiorName);
          hintShown = true;
          break;
        }
      }
    }

    // 广场提示已移除：镇中心 (0,0) 是 AI 剧场舞台，每次进事件区域都会弹这条，很干扰
    if (!hintShown) hud.hideHint();
  }

  // 交互调度：将 InteractionSystem 的动作转成实际游戏行为
  function dispatchInteraction(result) {
    if (!result) return;
    switch (result.type) {
      case "dialogue": {
        const npc = result.npc;
        // 简单对话用浮动面板（不打断操作）
        if (result.kind === "greet" || result.kind === "praise") {
          // NPC 停下脚步，面对玩家
          npc.brain.startTalk(player.pos);
          const owner = npc.phone?.owner || "镇民";
          const reg = npcRegistry.findByDisplayName(owner);
          const relCtx = _buildRelCtx(npc, reg);
          const r = npc.brain.respondTo(result.kind, reputation.honor, relCtx);
          showFloatDialogue(npc, r.reply || r.text || "（对方看着你，点了点头）", r.mood);
          // 玩家也冒个泡
          showPlayerBubble(result.kind === "greet" ? "你好！" : "干得漂亮！");
          // 左侧交互面板切换为对话模式
          interaction.setDialogueTarget(npc);
          audio.npcVoice("greet");
          reputation.onKindDialogue(npc.personality.gang);
          // 每人每天只有第一次打招呼给好感。
          // 否则"NPC 聊够了走开 → 追上去再按 F"就是个 +5/+3 的循环 ——
          // 回合上限只管单轮对话，管不住反复重新搭话。
          const _day = worldClock.day;
          if (npc.brain._greetedDay !== _day) {
            npc.brain._greetedDay = _day;
            _addNpcAffinity(npc, 5, 3);
          } else if (result.kind === "greet") {
            hud.toast(`今天已经和${owner}打过招呼了`, { side: true, key: "greet-dup" });
          }
          if (reg) {
            phone.addContact(reg.id, reg.displayName, reg.job || "镇民");
          }
          tryUnlockNpcTrait(npc, result.kind);
          // 如果 NPC 有职业跟进提问，延迟 2 秒后在浮动面板显示跟进行
          if (result.kind === "greet") {
            const followUp = npc.brain?.getJobFollowUp?.();
            if (followUp) {
              setTimeout(() => {
                if (floatDlgNpc === npc && !floatDialogue.classList.contains("hidden")) {
                  floatDlgText.textContent = followUp.prompt;
                  floatDlgText.className = "friendly";
                }
              }, 2000);
            }
          }
          // 打招呼也算一个回合：以前 greet 完全没接耐心检查，
          // 玩家可以 F→走开→F 无限循环刷 +5/+3
          _checkNpcPatience(npc, result.kind === "greet" ? "greet" : "praise");
        } else {
          tryStartDialogue(npc);
        }
        break;
      }
      case "dlg_action": {
        const npc = result.npc;
        const kind = result.kind;
        if (kind === "close") {
          hideFloatDialogue();
          interaction.clearDialogueTarget();
          showPlayerBubble("再见！");
          break;
        }
        if (kind === "praise") {
          npc.brain.startTalk(player.pos);
          const owner = npc.phone?.owner || "镇民";
          const reg = npcRegistry.findByDisplayName(owner);
          const relCtx = _buildRelCtx(npc, reg);
          const r = npc.brain.respondTo("praise", reputation.honor, relCtx);
          floatDlgText.textContent = r.reply || r.text || "（对方点了点头）";
          floatDlgText.className = r.mood || "";
          showPlayerBubble("真不错！");
          reputation.onKindDialogue(npc.personality.gang);
          audio.npcVoice("happy");
          _addNpcAffinity(npc, 8, 6);
          tryUnlockNpcTrait(npc, "praise");
          if (_checkNpcPatience(npc, "praise")) break;
        } else if (kind === "threat") {
          // 威胁：使用浮动面板显示结果
          npc.brain.startTalk(player.pos);
          const owner = npc.phone?.owner || "镇民";
          const reg = npcRegistry.findByDisplayName(owner);
          const relCtx = _buildRelCtx(npc, reg);
          const r = npc.brain.respondTo("threat", reputation.honor, relCtx);
          floatDlgText.textContent = r.reply || "（对方被吓到了）";
          floatDlgText.className = r.mood || "";
          showPlayerBubble("给我老实点！");
          reputation.addHonor(-5);
          reputation.onThreatDialogue(npc.personality.gang);
          _addNpcAffinity(npc, -10, -15);
          audio.npcVoice("angry");
          if (_checkNpcPatience(npc, "threat")) break;
        } else if (kind === "extort") {
          // 勒索：根据 NPC 性格/身份产生完全不同的反应
          npc.brain.startTalk(player.pos);
          const extortMul = reputation.honor < -20 ? 1.6 : (reputation.honor > 20 ? 0.8 : 1);
          const r = npc.brain.respondToExtort(extortMul);
          const extortName = npc.phone?.owner || "镇民";
          floatDlgText.textContent = r.reply || "";
          floatDlgText.className = r.mood || "";
          showPlayerBubble("把钱交出来！");

          if (r.attacked) {
            // 帮派大佬/硬汉：直接反击
            audio.npcVoice("angry");
            hud.toast(`😡 ${extortName}勃然大怒，拔枪反击！`, { side: true, key: "extortfight" });
            reputation.onThreatDialogue(npc.personality.gang);
            _addNpcAffinity(npc, -25, -35);
            reputation.addHonor(-12);
            // 触发 NPC 战斗意图
            npc.brain.threat = { x: player.pos.x, z: player.pos.z };
          } else if (r.comply && r.amount > 0) {
            economy.addMoney(r.amount);
            reputation.addHonor(-10);
            _addNpcAffinity(npc, -30, -40);
            hud.toast(`💵 勒索得 $${r.amount}！${extortName}对你的好感大幅下降`, { side: true, key: "extort" });
          } else {
            // 拒绝但不战斗（有骨气的普通人）
            reputation.addHonor(-8);
            _addNpcAffinity(npc, -20, -30);
            audio.npcVoice(Math.random() < 0.5 ? "angry" : "scared");
            hud.toast(`😤 ${extortName}拒绝交钱！好感大幅下降`, { side: true, key: "extortrefuse" });
          }
          if (_checkNpcPatience(npc, "extort")) break;
        } else if (kind === "recruit") {
          // 招募：使用浮动面板显示结果
          npc.brain.startTalk(player.pos);
          const owner = npc.phone?.owner || "镇民";
          const reg = npcRegistry.findByDisplayName(owner);
          // trust/affection 必须传进去 —— 以前没传，导致 respondToRecruit 里
          // `playerFaction.trust < 15` 拿到 undefined（比较恒 false）把信任门槛
          // 整个绕过，成功率也退化成与关系无关的固定值
          const relCtx = _buildRelCtx(npc, reg);
          const r = npc.brain.respondToRecruit({
            isBoss: !!npc.personality?.gang,       // 有帮派归属的算"别家的人"，门槛更高
            playerInfluence: factionSystem.getPlayerInfluence(),
            npcId: reg?.id,
            trust: relCtx.trust,
            affection: relCtx.affection,
          });
          floatDlgText.textContent = r.reply || "";
          floatDlgText.className = r.mood || "neutral";
          showPlayerBubble("跟我混吧！");
          if (r.accepted) {
            // 以前这里只弹一个 toast，不写任何数据 → members 恒为空，
            // 于是成员收益/派遣/胜利条件全部锁死。现在真的入伙。
            const memberId = reg?.id || _getNpcRelId(npc);
            factionSystem.addPlayerMember(memberId);
            npc.personality.gang = "player";       // 场景侧归属（AIBrain 读的是 gang）
            const regNpc = reg && npcRegistry.get?.(reg.id);
            if (regNpc) regNpc.factionId = "player"; // 档案侧归属
            if (reg) phone.addContact(reg.id, reg.displayName, reg.job || "镇民");
            _addNpcAffinity(npc, 10, 10);
            hud.toast(`🎉 ${owner} 加入了你的帮派！`, { key: "recruit" });
            gangs.render?.();
          }
          if (_checkNpcPatience(npc, "recruit")) break;
        }
        break;
      }
      case "role_action": {
        const npc = result.npc;
        const kind = result.kind;
        if (kind === "role_approach") {
          // 特殊职业 NPC 主动搭话：显示叫卖/撩拨 + 进入对话模式
          npc.brain.startTalk(player.pos);
          const approach = npc.brain.getRoleApproach();
          if (approach) {
            showFloatDialogue(npc, approach, "friendly");
            showPlayerBubble("");
          }
          interaction.setDialogueTarget(npc);
          audio.npcVoice("greet");
          // 添加联系人
          const owner = npc.phone?.owner || "镇民";
          const reg = npcRegistry.findByDisplayName(owner);
          if (reg) {
            phone.addContact(reg.id, reg.displayName, reg.job || "镇民");
          }
        } else if (kind === "role_yes") {
          // 玩家回"是"→ NPC 跟随跟进提问给出回应
          const followUp = npc.brain.getJobFollowUp();
          // 这个提问答过就不再出现（选项会自然消失），否则可以无限点着刷好感
          npc.brain.markFollowUpAnswered?.();
          // 赌徒 NPC：直接拉起百家乐界面
          if (npc.personality.job === "赌徒") {
            floatDlgText.textContent = "哈哈，有胆色！来，下注吧！";
            floatDlgText.className = "friendly";
            audio.npcVoice("happy");
            _addNpcAffinity(npc, 3, 5);
            hideFloatDialogue();
            interaction.clearDialogueTarget();
            setTimeout(() => baccarat.open(), 400);
            break;
          }
          if (followUp) {
            floatDlgText.textContent = followUp.response || "好，就这么定了。";
            floatDlgText.className = "friendly";
          }
          _addNpcAffinity(npc, 5, 3);
          audio.npcVoice("happy");
          _checkNpcPatience(npc, "role_yes");
        } else if (kind === "role_no") {
          // 玩家回"否"→ NPC 冷淡
          const followUp = npc.brain.getJobFollowUp();
          npc.brain.markFollowUpAnswered?.();
          if (followUp) {
            floatDlgText.textContent = followUp.reject || "哦，那算了。";
            floatDlgText.className = "neutral";
          }
          audio.npcVoice("greet");
          _checkNpcPatience(npc, "role_no");
        } else if (kind === "dlg_close") {
          hideFloatDialogue();
          interaction.clearDialogueTarget();
          showPlayerBubble("再见！");
        } else if (kind.startsWith("story_choice_")) {
          // StoryTree 选择：通过 NPC 的大脑覆写处理
          if (npc.brain._storyRespond) {
            const reply = npc.brain._storyRespond(kind);
            if (reply) {
              floatDlgText.textContent = reply;
              floatDlgText.className = "neutral";
            }
          }
        } else {
          // 职业特殊交互：调情/打赏/买酒/祈祷等
          const relId = _getNpcRelId(npc);
          const rel = worldState.state.relationships?.[relId + "->player"] || { affection: 0 };
          const reply = npc.brain.respondToRole(kind, rel.affection || 0);
          if (reply) {
            floatDlgText.textContent = reply;
            floatDlgText.className = "friendly";
          }
          // 根据动作类型处理效果
          if (kind === "role_flirt") {
            showPlayerBubble("你真迷人……");
            reputation.onKindDialogue(npc.personality.gang);
            const owner = npc.phone?.owner || "镇民";
            const reg = npcRegistry.findByDisplayName(owner);
            _addNpcAffinity(npc, 3, 8);
          } else if (kind === "role_insult") {
            showPlayerBubble("哼！");
            reputation.addHonor(-3);
            _addNpcAffinity(npc, -5, -15);
          } else if (kind === "role_tip") {
            showPlayerBubble("这是赏你的！");
            const cost = 5;
            if (economy.money >= cost) {
              economy.addMoney(-cost);
              reputation.addHonor(3);
              _addNpcAffinity(npc, 5, 10);
              hud.toast(`💵 打赏 -$${cost}`, { side: true, key: "tip" });
            } else {
              floatDlgText.textContent = "……你的钱呢？（尴尬地笑了笑）";
            }
          } else if (kind === "role_buy") {
            showPlayerBubble("来一杯！");
            const cost = 2;
            if (economy.money >= cost) {
              economy.addMoney(-cost);
              hud.toast(`🍺 买酒 -$${cost}`, { side: true, key: "buy" });
            }
          } else if (kind === "role_bribe") {
            showPlayerBubble("这是给你的……");
            const cost = 20;
            if (economy.money >= cost) {
              economy.addMoney(-cost);
              reputation.addHonor(-15);
              hud.toast(`💵 贿赂 -$${cost}`, { side: true, key: "bribe" });
            } else {
              floatDlgText.textContent = "就这点？不够塞牙缝的。";
            }
          } else if (kind === "role_heal") {
            const cost = 5;
            if (economy.money >= cost) {
              economy.addMoney(-cost);
              player.heal(30);
              hud.toast(`💊 医治 -$${cost}，恢复30生命！`, { side: true, key: "heal" });
            }
          }
          // 所有职业特殊交互都要计回合。以前 role_flirt(+8好感) / role_tip(+10好感)
          // 完全没接耐心检查，是比截图那条更狠的刷法。
          _checkNpcPatience(npc, kind);
        }
        break;
      }
      case "profile":
        openNPCProfile(result.npc);
        document.exitPointerLock();
        break;
      case "encounter":
        // 专程来找你的人：开中央强决策弹窗（世界会暂停）
        encounters.engage();
        break;
      case "subdued":
        // 伏地重伤者：洗脑收服 / 搜身 / 补刀 / 放走（世界会暂停）
        subdue.open(result.npc);
        break;
      case "beg": {
        // 求饶：说好话让正在打你的人收手
        const npc = result.npc;
        const name = npc.phone?.owner || "对方";
        showPlayerBubble(_pickLine([
          "别打了！我什么都不要了！",
          "住手，是我不对，行了吧？",
          "我认输，别再动手了！",
          "求你了，别打了！",
        ]));
        const r = npc.brain.respondToBeg({
          honor: reputation.honor,
          affection: _affectionOf(npc),
        });
        showFloatDialogue(npc, r.reply, r.ok ? "neutral" : "hostile");
        playMoodFx(npc, r.ok ? "neutral" : "angry");
        audio.npcVoice(r.ok ? "greet" : "angry");
        if (r.ok) {
          factions.clear(npc);
          hud.toast(`🙏 ${name}收手了`, { key: "beg-ok" });
          reputation.addHonor(-1); // 当街跪地求饶，名声上不太好看
        } else {
          hud.toast(`😠 ${name}不吃这套`, { key: "beg-fail" });
        }
        break;
      }
      case "placate": {
        // 安抚：劝住正要去警局报案的人
        const npc = result.npc;
        const name = npc.phone?.owner || "对方";
        showPlayerBubble(_pickLine([
          "这事别报官，行吗？",
          "先生，当作没看见，好处少不了你。",
          "别去警局，我们私下解决。",
          "冷静点，报官对谁都没好处。",
        ]));
        const r = npc.brain.respondToPlacate({
          honor: reputation.honor,
          affection: _affectionOf(npc),
        });
        showFloatDialogue(npc, r.reply, r.ok ? "friendly" : "scared");
        playMoodFx(npc, r.ok ? "neutral" : "scared");
        if (r.ok) {
          hud.toast(`🤫 劝住了${name}，他不去报案了`, { key: "placate-ok" });
          _addNpcAffinity(npc, 2, 2);
        } else {
          hud.toast(`🚨 ${name}还是要去报案`, { key: "placate-fail" });
        }
        break;
      }
      case "attack":
        // 触发拳击攻击 — 只在冷却就绪时有效
        if (player.attackCooldown <= 0 && !player.attackTimer) {
          player._pendingAttack = true;
          player.attackTimer = 0.35;
          player.attackCooldown = 0.55;
        }
        break;
      case "enter":
        enterInterior(result.name, result.isBack, result.door?.x, result.door?.z);
        break;
      case "enter_stock":
        document.exitPointerLock();
        stockMarket.open();
        break;
      case "pickup":
        pickup(result.loot);
        break;
      case "drive":
        result.vehicle.occupied = true;
        player.inVehicle = result.vehicle;
        break;
      case "steal_stash":
        stealHome(result.home);
        break;
      case "steal":
        // 偷窃贴身NPC — 打开偷窃面板
        if (!stealState) {
          hideFloatDialogue();
          theater.notifyNpcStolen(result.npc); // 偷演员会被记一笔，影响事件结局
          startSteal(result.npc);
        }
        break;
      case "exit_room":
        exitInterior(result.isBack);
        break;
    }
  }

  function pickup(item) {
    switch (item.type) {
      case LootType.CASH:
        economy.addMoney(item.payload);
        audio.coin();
        hud.toast(`💵 +$${item.payload}`);
        break;
      case LootType.KEY:
        economy.grantTempCar();
        audio.keyPickup();
        hud.toast("🔑 得到跑车钥匙，召唤临时跑车！");
        vehicles.spawn(
          { x: player.pos.x + 3, z: player.pos.z },
          { sporty: true, color: 0xe23a2a, temp: true, heading: player.facing }
        );
        break;
      default:
        break;
    }
    loot.remove(item);
  }

  // ---- 车辆撞击 NPC ----
  function handleVehicleCrashes(vehicle) {
    // 先检测撞警长（撞倒眩晕 + 升通缉）
    const sheriffHits = sheriffs.checkVehicleHit(vehicle);
    if (sheriffHits > 0) {
      reputation.addSheriffHitWanted(SHERIFF.hitWantedGain * sheriffHits);
      vehicle.speed *= 0.7;
    }
    const hits = npcManager.checkVehicleCollisions(vehicle);
    if (hits.length === 0) return;
    audio.crash();
    audio.npcVoice("hurt");
    for (const h of hits) {
      if (h.knocked) {
        loot.dropFromNPC(h.npc);
        reputation.onRunOverNPC(h.npc.personality.gang);
        newspaper.publish("runover", { job: h.npc.personality.job });
        // 目击检测
        const wits = npcManager.findWitnesses(h.npc.pos, 14);
        for (const w of wits) w.brain.witnessCrime(h.npc.pos, "runover");
      }
    }
    hud.toast(`🚗💥 撞飞了 ${hits.length} 个 NPC`, { side: true, key: "runover" });
    vehicle.speed *= 0.6;
  }

  // ---- 主循环 ----
  engine.onUpdate((dt) => {
    const paused = handleMenus();
    if (paused) {
      // 暂停世界时仍让 BGM/环境音继续，并驱动对话耐心倒计时
      conversation.update(dt);
      audio.update(dt, { isDay: !sky.isNight, nearTown: true });
      return;
    }

    // P0: 世界时钟（追踪天数+驱动昼夜）+ 玩家体能
    worldClock.update(dt, player.pos);
    reputation.update(dt);
    newspaper.tickDaily(dt);
    playerCondition.update(dt, input.keys.ShiftLeft, sky.isNight, false);
    const hour = sky.hour;

    if (insideRoom) {
      interiors.update(dt);
      player.update(dt, input, camera);
      combat.update(dt, player);
      loot.update(dt);
      // 屋内住户（睡觉/惊醒/反击）
      const inResult = npcManager.updateInside(dt, insideRoom, player.pos, hour);
      if (inResult.attacks > 0) {
        player.takeDamage(6 * inResult.attacks);
        audio.npcVoice("angry");
        hud.toast("🩸 被屋主反击！", { key: "counter" });
      }
      if (inResult.reports > 0) {
        reputation.addWanted(25 * inResult.reports);
        hud.toast("🚨 有人跑到警局报案了！通缉上升", { key: "report" });
        newspaper.publish("wanted", {});
      }
      handleWorldInteract();
      updateSteal(dt);
      // NPC 被盗延迟发现
      for (const [npcName, tracker] of Object.entries(npcTheftTracker)) {
        if (tracker.discoveryTimer && tracker.discoveryTimer > 0) {
          tracker.discoveryTimer -= dt;
          if (tracker.discoveryTimer <= 0) {
            tracker.discoveryTimer = 0;
            const found = npcManager.all.find(n => (n.phone?.owner || n.personality?.job) === npcName);
            if (found && found.alive && found.brain.state !== "DOWN") {
              found.brain.say("哎？！我兜里的东西呢……刚才那人！", 3.5);
              found.brain.emotion = Math.min(1, found.brain.emotion + 0.5);
              if (found.brain.state === "WANDER" || found.brain.state === "IDLE") {
                found.brain._enter(State.STARTLED);
              }
              if (Math.random() < 0.4) found.brain._reportCrime = true;
              hud.toast(`😰 ${npcName} 发现东西不见了！`, { side: true, key: "theftdiscover" });
            }
          }
        }
      }
      // Esc / Space 取消偷窃/对话/档案/叙事阅读。
      // 聊天条展开时这些留给 TheaterUI 的输入框 handler 处理，
      // 否则会和"退出输入"打架（两边都消费同一个键）。
      if (!theaterUI?.expanded && (input.wasPressed("Escape") || input.wasPressed("Space"))) {
        if (!notePopup.classList.contains("hidden")) {
          closeNotePopup();
        } else if (stealState) {
          cancelSteal();
        } else if (floatDlgNpc && !floatDialogue.classList.contains("hidden")) {
          hideFloatDialogue();
          interaction.clearDialogueTarget();
        } else if (!npcProfilePanel.classList.contains("hidden")) {
          npcProfilePanel.classList.add("hidden");
          window.__ww._currentProfileNpc = null;
        }
      }
      // 浮动对话距离自动关闭
      if (floatDlgNpc && !floatDialogue.classList.contains("hidden")) {
        const d = Math.hypot(player.pos.x - floatDlgNpc.pos.x, player.pos.z - floatDlgNpc.pos.z);
        if (d > 5) { hideFloatDialogue(); interaction.clearDialogueTarget(); }
      }
      // 档案面板远离自动关闭
      if (!npcProfilePanel.classList.contains("hidden") && window.__ww._currentProfileNpc) {
        const pnpc = window.__ww._currentProfileNpc;
        if (!pnpc.alive || Math.hypot(player.pos.x - pnpc.pos.x, player.pos.z - pnpc.pos.z) > 8) {
          npcProfilePanel.classList.add("hidden");
          window.__ww._currentProfileNpc = null;
        }
      }
      // 玩家冒泡计时
      if (playerBubbleTimer > 0) {
        playerBubbleTimer -= dt;
        if (playerBubbleTimer <= 0) {
          const pb = document.getElementById("player-bubble");
          if (pb) pb.classList.add("hidden");
        }
      }
      minimap.update(dt, { player: player.pos, sheriffs: [], inside: true, facing: player.facing, questMarkers: getQuestMarkers() });
      audio.update(dt, { isDay: !sky.isNight, nearTown: true, crowd: 0.5 });
      hud.setHealth(player.health);
      hud.setTime(sky.timeString(), sky.isNight);
      hud.setDay(worldClock.day);
      hud.setEnergy(playerCondition.energy, playerCondition.fatigue);
      return;
    }

    town.update(dt, sky.isNight);
    updateSheriff(dt);

    if (player.inVehicle) {
      player.inVehicle.drive(dt, input, town);
      handleVehicleCrashes(player.inVehicle);
    }
    player.update(dt, input, camera);
    vehicles.update(dt);

    // 倒地动画结束后复活
    if (_respawnPending && !player._knockedDown) {
      doRespawn();
    }

    // 走路撞 NPC：推开 + 连撞触发反应
    if (!player.inVehicle) {
      // 玩家静止时不算"玩家撞人"：挂机时 NPC 自己走过来贴住不该把人弄怒
      const playerMoving = player.walkAmount > 0.15;
      const bumps = npcManager.checkPlayerBump(player.pos, player.facing, dt, stealState?.npc || null, playerMoving);
      for (const b of bumps) {
        if (b.actorBump) {
          // 撞到正在演戏的人：走剧本写的"被撞反应"
          theater.notifyNpcBumped(b.npc);
        } else if (b.stealDetect) {
          audio.npcVoice("angry");
          hud.toast("😠 偷窃中撞到目标，被察觉了！", { key: "bumpsteal" });
          // 结束偷窃
          if (stealState) { stealPanel.classList.add("hidden"); stealState = null; }
        } else if (b.angry) {
          audio.npcVoice("angry");
          hud.toast("😠 你撞太多次，惹毛了一个 NPC！", { key: "bumpangry" });
        } else {
          audio.npcVoice("scared");
          hud.toast("🚶 被你撞怕了，落荒而逃", { side: true, key: "bumpflee" });
        }
      }
    }

    // NPC + 战斗（传入 loot 使贪婪 NPC 会去捡东西；传入 hour 驱动日程）
    const npcResult = npcManager.update(dt, player.pos, loot, hour, worldClock.day);
    combat.update(dt, player);
    // 阵营与血条：谁在打我 → 敌方；关系好的熟人看到会赶来当友方
    if (npcResult.attackers?.length) {
      factions.notifyPlayerAttacked(npcResult.attackers, player.pos);
    }
    factions.update(dt, player.pos);
    corpseReactions.update(dt);
    encounters.update();   // 遭遇管线：NPC 走过来 / 到位后等玩家按 F
    microEvents.update();  // 微型事件：进建筑/街角随手可参与的轻量小场景
    pairChat.update(dt);   // 熟人相遇双人闲聊

    // 手动启动的故事：立即投递首个节点，让 NPC 触达玩家（不用等下次睡觉）
    if (_pendingStoryDeliver) {
      const pd = _pendingStoryDeliver;
      _pendingStoryDeliver = null;
      try { deliverStoryNodeNow(pd.storyId, { force: true }); }
      catch (e) { console.error("[Main] 故事投递失败", e); }
    }

    // 瞄准检测：你举着枪对着谁，谁就该有反应（看/惊/跑/警告）
    document.body.classList.toggle("aiming", !!player.aiming);
    if (player.aiming && !insideRoom) {
      _updateAimingReactions();
    }

    if (npcResult.attacks > 0) {
      // 计算高攻击性NPC的实际伤害
      const dmg = npcResult.totalDmg || (6 * npcResult.attacks);
      player.takeDamage(dmg);
      audio.npcVoice("angry");
      hud.toast("🩸 被 NPC 反击！", { key: "counter" });
      // 受伤打断偷窃
      if (stealState) {
        stealPanel.classList.add("hidden");
        stealState = null;
        hud.toast("受到了攻击，偷窃中断！", { key: "stealhurt" });
      }
    }
    if (npcResult.reports > 0) {
      reputation.addWanted(25 * npcResult.reports);
      audio.npcVoice("scared");
      hud.toast("🚨 有人跑到警局报案了！通缉上升", { key: "report" });
      newspaper.publish("wanted", {});
    }
    if (npcResult.voice) audio.npcVoice(npcResult.voice);
    if (npcResult.npcPickedLoot) {
      audio.coin();
      hud.toast(`👀 一个${npcResult.npcPickedLoot.npc.personality.job}捡走了地上的东西`, { side: true, key: "npcpick" });
    }

    loot.update(dt);
    handleWorldInteract();
    updateSteal(dt);

    // NPC 被盗延迟发现：过段时间后 NPC 反应过来
    for (const [npcName, tracker] of Object.entries(npcTheftTracker)) {
      if (tracker.discoveryTimer && tracker.discoveryTimer > 0) {
        tracker.discoveryTimer -= dt;
        if (tracker.discoveryTimer <= 0) {
          tracker.discoveryTimer = 0;
          // 找所有 NPC 中匹配的，触发反应
          const found = npcManager.all.find(n => (n.phone?.owner || n.personality?.job) === npcName);
          if (found && found.alive && found.brain.state !== "DOWN") {
            found.brain.say("哎？！我兜里的东西呢……刚才那人！", 3.5);
            found.brain.emotion = Math.min(1, found.brain.emotion + 0.5);
            if (found.brain.state === "WANDER" || found.brain.state === "IDLE") {
              found.brain._enter(State.STARTLED);
            }
            // 有可能报案
            if (Math.random() < 0.4) {
              found.brain._reportCrime = true;
            }
            hud.toast(`😰 ${npcName} 发现东西不见了！`, { side: true, key: "theftdiscover" });
          }
        }
      }
    }

    // Esc 取消偷窃/对话/叙事阅读。
    // 聊天条展开时这些留给 TheaterUI 的输入框 handler，否则两边抢同一个键。
    if (!theaterUI?.expanded && (input.wasPressed("Escape") || input.wasPressed("Space"))) {
      if (!notePopup.classList.contains("hidden")) {
        closeNotePopup();
      } else if (stealState) {
        cancelSteal();
      } else if (floatDlgNpc && !floatDialogue.classList.contains("hidden")) {
        hideFloatDialogue();
        interaction.clearDialogueTarget();
      } else if (!npcProfilePanel.classList.contains("hidden")) {
        npcProfilePanel.classList.add("hidden");
        window.__ww._currentProfileNpc = null;
      }
    }

    // 如果浮动对话开着但玩家走远了，自动关闭
    if (floatDlgNpc && !floatDialogue.classList.contains("hidden")) {
      const d = Math.hypot(player.pos.x - floatDlgNpc.pos.x, player.pos.z - floatDlgNpc.pos.z);
      if (d > 5) {
        hideFloatDialogue();
        interaction.clearDialogueTarget();
      }
    }

    // 档案面板远离自动关闭（室外也需要）
    if (!npcProfilePanel.classList.contains("hidden") && window.__ww._currentProfileNpc) {
      const pnpc = window.__ww._currentProfileNpc;
      if (!pnpc.alive || Math.hypot(player.pos.x - pnpc.pos.x, player.pos.z - pnpc.pos.z) > 8) {
        npcProfilePanel.classList.add("hidden");
        window.__ww._currentProfileNpc = null;
      }
    }

    // 玩家冒泡计时
    if (playerBubbleTimer > 0) {
      playerBubbleTimer -= dt;
      if (playerBubbleTimer <= 0) {
        const pb = document.getElementById("player-bubble");
        if (pb) pb.classList.add("hidden");
      }
    }

    updateEngineSound();
    const nearTown = Math.hypot(player.pos.x, player.pos.z) < town.core;
    audio.update(dt, { isDay: !sky.isNight, nearTown, crowd: 0.7 });

    // 小地图（含警长红点 + 任务标记）
    minimap.update(dt, {
      player: { x: player.pos.x, z: player.pos.z },
      facing: player.facing,
      sheriffs: sheriffs.positions(),
      inside: false,
      questMarkers: getQuestMarkers(),
    });

    hud.setHealth(player.health);
    hud.setTime(sky.timeString(), sky.isNight);
    hud.setDay(worldClock.day);
    hud.setEnergy(playerCondition.energy, playerCondition.fatigue);
    renderTaskBar();

    // P4: 检查位置触发的导演投放 — NPC 驱动的大街上/手机传达
    const deliveryTriggers = deliveryPlanner.checkLocationTriggers(
      player.pos,
      insideRoom || null,
      !!insideRoom
    );
    for (const trig of deliveryTriggers) {
      deliveryPlanner.deliverToUI(trig);
      if (trig.data && trig.data.needsPlayerChoice) {
        requestStoryEncounter(trig.data.storyId, trig.data.nodeId);
      }
    }
  });

  /**
   * 立即投递一个故事节点的首个环节，让 NPC 触达玩家。
   * - 优先：该故事绑定 NPC 有个人小剧场 → 开演（主角亲身上台）
   * - 其次：NPC 主动走过来（遭遇管线，当面弹窗抉择）
   * - 兜底：NPC 发手机消息 + 消息里带决策按钮（当面/手机都能选）
   */
  /**
   * 查一个 NPC 是男是女。
   * 重要 NPC 在 npcData 里标了 female；路人升格来的次要 NPC 可能没标，
   * 那就看场上的实体（模型是按 female 建的，实体上一定有）。
   * @returns {boolean|null} null = 查不到
   */
  function _genderOf(npcId) {
    const reg = npcId ? npcRegistry.get(npcId) : null;
    if (reg && reg.female != null) return !!reg.female;
    const live = reg && npcManager.all.find((n) => n.alive && n.phone?.owner === reg.displayName);
    if (live && live.female != null) return !!live.female;
    return null;
  }

  /**
   * 把文案里的第三人称代词改成实际出演者的性别。
   *
   * 为什么需要：文案是批量预生成的，写的时候并不知道最终会由谁来演
   * （选角是运行时按在场情况定的）。于是会出现"她站在酒馆后门的马槽边"
   * 配上一个男演员的名字。每段文案只描写一个人，所以整段统一成演员的
   * 性别即可 —— 比让文案与演员公然矛盾好得多。
   *
   * 注意"其他"里的"他"不是代词，不能替换（会变成"其她"）。
   */
  function _fitGender(text, female) {
    if (!text || female == null) return text;
    return female
      ? text.replace(/他们/g, "她们").replace(/(?<!其)他/g, "她")
      : text.replace(/她们/g, "他们").replace(/她/g, "他");
  }

  /** 按 storyId 取当前绑定的主要演员 id */
  function _storyLeadNpcId(storyId) {
    const inst = worldState.getStoryInstance(storyId);
    return Object.values(inst?.actorBindings || {})[0] || null;
  }

  /**
   * 确保「文案里描写的那个人」在玩家抵达时就在现场。
   *
   * 之前的问题：requestStoryEncounter 只在绑定演员**恰好已在场**时才传
   * preferNpcId，否则交给按场地+距离筛选的通用选角 —— 玩家专程走到酒馆后门，
   * 那儿没人就直接"没人露面"，或者随便抓一个路人来演（于是名字和文案
   * 描写的性别都对不上，就像截图里那样）。
   *
   * 现在：把绑定演员**送到**场地。太远就传送到场地外围（玩家视野外），
   * 再让他自己走进来 —— 玩家看到的是"有人朝你走过来"，不是凭空出现。
   *
   * @returns {string|null} 确定能出演的 npcId；null = 实在凑不出人
   */
  function ensureActorAtVenue(storyId, venue) {
    const npcId = _storyLeadNpcId(storyId);
    if (!npcId) return null;
    const reg = npcRegistry.get(npcId);
    if (!reg || reg.alive === false) return null;

    let live = npcManager.all.find((n) => n.alive && n.phone?.owner === reg.displayName);
    // 绑定的人根本没在场上（只有档案没有实体）→ 换一个在场的人来演，
    // 并把绑定改过去，这样后续节点的文案/性别都跟着这个人走。
    if (!live) {
      const alt = npcManager.all.find(
        (n) => n.alive && n.phone?.owner && !n.brain?._perform && n.brain?.state !== "DOWN"
      );
      if (!alt) return null;
      const altReg = npcRegistry.findByDisplayName(alt.phone.owner);
      if (!altReg) return null;
      const inst = worldState.getStoryInstance(storyId);
      const slot = Object.keys(inst?.actorBindings || {})[0];
      if (inst && slot) inst.actorBindings[slot] = altReg.id;
      live = alt;
      return altReg.id;
    }

    // 在场但离得远 → 传到场地**背对玩家的那一侧**再走进来。
    // 落点选在"玩家→场地"延长线的更远处，这样玩家面朝场地时人是从
    // 前方远处走来的，不会在眼前凭空出现。
    const dist = Math.hypot(live.pos.x - venue.x, live.pos.z - venue.z);
    if (dist > 12) {
      const dx = venue.x - player.pos.x;
      const dz = venue.z - player.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      const r = 10 + Math.random() * 3;
      // 沿玩家→场地方向再往前 r 米，并随机偏一点角度免得每次都在同一点
      const jitter = (Math.random() - 0.5) * 0.7;
      const ux = dx / len, uz = dz / len;
      const cos = Math.cos(jitter), sin = Math.sin(jitter);
      const rx = ux * cos - uz * sin;
      const rz = ux * sin + uz * cos;
      const spot = town.resolveCollision(venue.x + rx * r, venue.z + rz * r, 0.45);
      if (live.teleportTo) live.teleportTo(spot.x, spot.z);
      else live.pos.set(spot.x, live.pos.y, spot.z);
    }
    return npcId;
  }

  /**
   * 解析故事节点该发生在哪儿。
   *
   * 权威来源是节点文案自带的 `venueId`（storyBeatText，由 storyVenues 的关键词
   * 推断生成）—— 这样"营地破帐篷外"一定落到帮派驻地大门。之前只看 venueTags，
   * 而 40 个节点里有 23 个一个 tag 都没有，全都掉进"玩家前方 14 米"的兜底，
   * 于是文案说一个地方、定位指另一个地方。
   *
   * venueId 解析出来的是**建筑门口**坐标（town.doors），玩家走得到；
   * 用 landmark 的建筑中心会卡在碰撞体里。
   */
  function resolveStoryVenue(def, node, boundNpcId, beat = null) {
    // ① 文案声明的地点（最权威，与玩家看到的文字一致）
    const vid = beat?.venueId;
    if (vid) {
      const v = resolveVenue(town, vid);
      if (v) return { x: v.x, z: v.z, label: v.label, venueId: vid, from: `venue:${vid}` };
    }
    // ② 没有 venueId（老存档/新节点）→ 现场推断一次
    const tags = (node.candidateDeliveries || []).flatMap((c) => c.venueTags || []);
    const channels = (node.candidateDeliveries || []).map((c) => c.channel);
    const guess = inferVenueId(
      beat?.locateLabel || node.title || "", tags, channels,
      `${beat?.description || node.description || ""} ${beat?.phoneInvite || ""}`
    );
    if (guess) {
      const v = resolveVenue(town, guess);
      if (v) return { x: v.x, z: v.z, label: v.label, venueId: guess, from: `infer:${guess}` };
    }
    // ③ 退到绑定 NPC 现在站的地方
    if (boundNpcId) {
      const reg = npcRegistry.get(boundNpcId);
      const live = reg && npcManager.all.find((n) => n.alive && n.phone?.owner === reg.displayName);
      if (live) return { x: live.pos.x, z: live.pos.z, label: "他待的地方", venueId: null, from: "npc" };
    }
    // ④ 最终兜底：镇中广场（永远走得到，而且是个"像样的地方"）
    const plaza = resolveVenue(town, "plaza");
    if (plaza) return { x: plaza.x, z: plaza.z, label: plaza.label, venueId: "plaza", from: "fallback" };
    return { x: 0, z: 0, label: "镇中广场", venueId: null, from: "origin" };
  }

  /** 玩家走到事发地点后：让绑定 NPC 过来（❗ → F → 选项） */
  function onArriveStoryVenue(storyId, nodeId) {
    const inst = worldState.getStoryInstance(storyId);
    if (!inst || inst.status !== "active" || inst.currentNode !== nodeId) return;
    // 先保证文案描写的那个人就在这儿（不在就送过来／换个在场的人顶上），
    // 否则玩家专程走一趟只会看到"没人露面"。
    const def = storyRuntime.getDefinition(storyId);
    const node = def?.nodes?.[nodeId];
    const beat = getBeatText(storyId, nodeId);
    const venue = resolveStoryVenue(def, node, _storyLeadNpcId(storyId), beat);
    const actorId = ensureActorAtVenue(storyId, venue);
    const ok = requestStoryEncounter(storyId, nodeId, actorId);
    if (ok) {
      hud.toast("你到了。有人正朝你走过来。", { side: true, key: "story-arrive", duration: 3600 });
    } else {
      hud.toast("你到了，可这会儿没人露面。再等等看。", { side: true, key: "story-arrive", duration: 3600 });
    }
  }

  function deliverStoryNodeNow(storyId, opts = {}) {
    const def = storyRuntime.getDefinition(storyId);
    const inst = worldState.getStoryInstance(storyId);
    if (!def || !inst || !inst.currentNode) return false;
    const node = def.nodes[inst.currentNode];
    if (!node) return false;
    const responses = node.playerResponses || [];
    const force = !!opts.force;   // 手机"立即开始"：一定要拉起一场戏
    const beat = getBeatText(storyId, inst.currentNode);

    // 只有故事**显式声明**了要用哪棵剧场树时才开戏（theaterTreeId）。
    // 以前是"绑定 NPC 恰好是某棵个人剧场的主角就顶替上去"，甚至强制模式下
    // 随机挑一棵 —— 于是推进《巷子里的求助》永远弹出《账本疑云》，
    // 故事自己的台词和选项反而永远看不到。
    const bindings = inst.actorBindings || {};
    const boundNpcId = Object.values(bindings)[0];
    const tree = def.theaterTreeId
      ? STORY_TREE_LIST.find((t) => t.id === def.theaterTreeId)
      : null;
    if (tree && !theater.active) {
      const started = theater.startStoryTree(tree, tree.protagonistId || boundNpcId || null);
      if (started) {
        hud.toast(`🎭 ${def.title} · ${tree.title}`, { key: "story-theater", duration: 4200 });
        if (force) {
          const c = theater.stage.center;
          const safe = town.resolveCollision(c.x + 3.5, c.z + 3.5, 0.45);
          player.pos.set(safe.x, player.pos.y, safe.z);
          hud.toast("已把你带到事发地点", { side: true, key: "story-tp", duration: 3000 });
        }
        return true;
      }
      if (force && theater.lastFailReason) {
        hud.toast(`⚠️ 这场戏演不起来：${theater.lastFailReason}`, { duration: 5000, key: "story-nocast" });
      }
    }

    // 主路径：让绑定的 NPC 当面来，用**这个故事自己的**台词和选项开弹窗
    if (!theater.active) {
      const ok = requestStoryEncounter(storyId, inst.currentNode);
      if (ok) return true;
      // 遭遇忙/没合适的人 → 落到手机
    }

    // ---- 手机来信 ----
    // 只发"包装过的口信 + 一个能走过去的定位"。
    // 绝不再把 `标题：描述` 这种模板文本推到玩家手机上 —— 那是调试面板的活儿。
    const npcId = boundNpcId;
    const regNpc = npcId && npcRegistry.get ? npcRegistry.get(npcId) : null;
    const fromName = regNpc?.displayName || def.title;
    // 地点以文案声明的 venueId 为准（"回营地来"就落到帮派驻地大门）
    const venue = resolveStoryVenue(def, node, npcId, beat);
    const female = _genderOf(npcId);
    const invite = _fitGender(beat?.phoneInvite || "你来一趟，有件事得当着面说。", female);
    // 定位按钮上显示该地点的正式名，跟玩家真正会走到的地方一致
    const label = venue.label || beat?.locateLabel || "事发地点";

    phone.deliverMessage(npcId || "system", fromName, invite, {
      storyId,
      storyNodeId: inst.currentNode,
      locate: { x: venue.x, z: venue.z, label },
      // 手机上不再直接给抉择按钮：抉择要到现场当面做。
      // 只有玩家已经在附近（<12m，说明人就在眼前）才允许隔空回话。
      storyChoices:
        responses.length && Math.hypot(venue.x - player.pos.x, venue.z - player.pos.z) < 12
          ? responses.map((r) => ({ id: r.id, label: r.label }))
          : null,
    });
    if (minimap?.setQuestMarker) minimap.setQuestMarker(venue.x, venue.z);
    return true;
  }

  /**
   * 玩家在手机上点了"推进这一环节"，但这个节点本该他亲自到场。
   * 不生硬跳过，也不假装他去了 —— 黑幕拉下来，用旁白补叙这段缺席的时间，
   * 黑幕散开时世界已经变了，接着投递下一节点。
   * @returns {boolean} 是否走了过场（false = 该节点不需要缺席补叙，照常投递）
   */
  function forceAdvanceWithCutscene(storyId) {
    const def = storyRuntime.getDefinition(storyId);
    const inst = worldState.getStoryInstance(storyId);
    if (!def || !inst || inst.status !== "active") return false;
    const nodeId = inst.currentNode;
    const node = def.nodes[nodeId];
    if (!node) return false;
    const beat = getBeatText(storyId, nodeId);
    if (!beat?.cutscene?.length) return false;

    // 缺席时选哪条分支：优先标了 default 的，否则第一个
    const responses = node.playerResponses || [];
    const fallback = responses.find((r) => r.isDefault) || responses[0];
    // 旁白里的代词也对齐实际出演者性别
    const female = _genderOf(_storyLeadNpcId(storyId));

    cutscene.play({
      title: beat.cutsceneTitle || "此后",
      lines: beat.cutscene.map((l) => _fitGender(l, female)),
      onDone: () => {
        if (fallback) {
          storyRuntime.advance(storyId, fallback.id);
        } else if (node.nextNode) {
          storyRuntime.advance(storyId, null);
        }
        const after = worldState.getStoryInstance(storyId);
        if (after?.status === "active" && after.currentNode !== nodeId) {
          // 世界已经往前走了一格，把新节点送到玩家面前
          _pendingStoryDeliver = { storyId };
        }
        hud.toast(`📖 《${def.title}》有了新的动静`, { key: "story-cut", duration: 4000 });
      },
    });
    return true;
  }


  /**
   * 把一个「需要玩家抉择」的故事节点交给遭遇管线。
   *
   * 取代了原来那套猴补丁（临时改写 brain.getRoleActions / hasRoleInteraction
   * 把选项塞进左侧面板，再手动恢复）—— 那种写法脆弱、难维护，而且当 NPC
   * 距离 >8 米时直接降级成手机里一段无法响应的死文本。
   * 现在统一走「NPC 走过来 → ❗ → F → 中央弹窗（暂停）→ 抉择」。
   */
  function requestStoryEncounter(storyId, nodeId, forcedNpcId = null) {
    if (encounters.busy) return false;
    const def = storyRuntime.getDefinition(storyId);
    const node = def?.nodes?.[nodeId];
    if (!node?.playerResponses?.length) return false;

    const inst = worldState.getStoryInstance(storyId);
    const bindings = inst?.actorBindings || {};
    // 调用方已经把人安排到场了（ensureActorAtVenue）就直接用，
    // 否则退回"绑定角色里第一个能在场上找到的"。
    let preferNpcId = forcedNpcId;
    if (!preferNpcId) {
      for (const npcId of Object.values(bindings)) {
        const reg = npcRegistry.get(npcId);
        if (!reg) continue;
        const onStage = npcManager.all.some((n) => n.alive && (n.phone?.owner === reg.displayName));
        if (onStage) { preferNpcId = npcId; break; }
      }
    }

    const beat = getBeatText(storyId, nodeId);
    // 文案是预生成的，写的时候不知道最终谁来演 —— 把第三人称代词对齐到
    // 实际出演者的性别，免得出现"她站在马槽边"配一个男演员的名字。
    const female = _genderOf(preferNpcId);
    const desc = _fitGender(beat?.description || node.description, female);
    const beats = [];
    if (node.title) beats.push(node.title);
    if (desc) beats.push(desc);

    return encounters.request({
      id: `story:${storyId}:${nodeId}`,
      title: `📖 ${def.title || storyId}`,
      intent: `${node.title || ""}：${desc || ""}`.slice(0, 120),
      preferNpcId,
      beats,
      choices: node.playerResponses.map((r) => ({
        id: r.id,
        label: r.label,
        risk: r.risk || "medium",
      })),
      // 抉择完把结果交回 StoryTree 推进节点
      onResolved: (choiceId) => {
        if (!choiceId) return;              // 稍后再说 → 节点不推进，之后还会再来
        storyRuntime.advance(storyId, choiceId);
      },
    });
  }

  // 引擎声跟随当前车辆
  let engineHandle = null;
  function updateEngineSound() {
    if (player.inVehicle) {
      if (!engineHandle) engineHandle = audio.createEngine();
      audio.setEngine(engineHandle, (player.inVehicle.speed || 0) / (player.inVehicle.maxSpeed || 20));
    } else if (engineHandle) {
      audio.stopEngine(engineHandle);
      engineHandle = null;
    }
  }

  // 脚步声
  let stepTimer = 0;
  engine.onUpdate((dt) => {
    if (anyModalOpen() || player.inVehicle) return;
    if (player.walkAmount > 0.2) {
      stepTimer -= dt;
      if (stepTimer <= 0) {
        stepTimer = 0.42 / Math.max(0.5, player.walkAmount);
        audio.footstep();
      }
    }
  });

  // AI 剧场：独立注册，避免被室内/载具/弹窗分支提前 return 掉
  engine.onUpdate((dt) => {
    theater.playerPos = player.pos;
    theater.update(dt, {
      playerPos: insideRoom ? null : player.pos, // 进屋就算离场
      hour: sky.hour,
      day: worldClock.day,
    });
  });

  engine.onLateUpdate(() => {
    // 室内时投影室内 patron 气泡 + 民居里真实 NPC 的气泡 + 同房间 NPC；室外投影 NPC 气泡
    if (insideRoom) {
      const room = interiors.get(insideRoom);
      const patrons = room && room.bubbleAgents ? room.bubbleAgents() : [];
      const homeNpcs = npcManager.npcs.filter(
        (n) => n.insideHome && n.insideHome.interiorName === insideRoom
      );
      const roomNpcs = npcManager.npcs.filter(
        (n) => n.insideRoom && n.insideRoom.name === insideRoom
      );
      dialogue.update([...patrons, ...homeNpcs, ...roomNpcs]);
    } else {
      dialogue.update(npcManager.all);
    }

    // 玩家头顶冒泡投影（3D → 2D 屏幕坐标）
    const pb = document.getElementById("player-bubble");
    if (pb && !pb.classList.contains("hidden")) {
      const pv = new THREE.Vector3(player.pos.x, 2.7, player.pos.z);
      pv.project(camera);
      if (pv.z > 1) {
        pb.classList.add("hidden");
      } else {
        const w = window.innerWidth;
        const h = window.innerHeight;
        pb.style.left = `${(pv.x * 0.5 + 0.5) * w}px`;
        pb.style.top = `${(-pv.y * 0.5 + 0.5) * h}px`;
      }
    }

    // 任务目标头顶标记（3D → 2D 屏幕投影）
    updateQuestHeadMarkers();

    // NPC 名字标签（有立绘的重要NPC）
    updateNPCNameTags();
    // 血条：逃跑的人也顶着（标记 TTL 用墙钟，这里无需 dt）
    healthBars.update(npcManager.all, player.pos);
    emojiPops.update(npcManager.all, player.pos);
    aiLog.tick(); // 让过期的生成回执自己淡出
  });

	  // ---- 任务侧栏 ----
  function getQuestMarkers() {
    const markers = [];
    // 只显示被追踪的任务标记（而不是所有活跃任务）
    const trackedTask = taskSystem.getTrackedTask();
    if (!trackedTask) return markers;

    const marker = { x: 0, z: 0, type: trackedTask.type, taskId: trackedTask.id, title: trackedTask.title, label: trackedTask.title };
    let placed = false;

    // bounty 任务：在目标 NPC 位置
    if (trackedTask.objective.targetNpcId) {
      const ownerKey = trackedTask.objective.targetNpcId;
      for (const npc of npcManager.all) {
        if (!npc.alive || npc.brain.state === "DOWN") continue;
        const owner = npc.phone?.owner || npc.name || '';
        const registryNpc = owner ? npcRegistry.findByDisplayName(owner) : null;
        if ((registryNpc && registryNpc.id === ownerKey) || owner === ownerKey) {
          marker.x = npc.pos.x;
          marker.z = npc.pos.z;
          marker.npcId = ownerKey;
          marker.label = trackedTask.title;
          placed = true;
          break;
        }
      }
      // 模糊匹配 fallback：用 displayName 或 substring
      if (!placed) {
        const targetDef = npcRegistry.get(ownerKey);
        const targetName = targetDef?.displayName || '';
        for (const npc of npcManager.all) {
          if (!npc.alive || npc.brain.state === "DOWN") continue;
          const owner = npc.phone?.owner || '';
          if (targetName && owner && (owner.includes(targetName) || targetName.includes(owner))) {
            marker.x = npc.pos.x;
            marker.z = npc.pos.z;
            marker.npcId = ownerKey;
            marker.label = trackedTask.title;
            placed = true;
            break;
          }
        }
      }
    }

    // collect 任务：targetItem → 建筑映射
    if (!placed && trackedTask.objective.targetItem) {
      const itemToBuilding = {
        casino_ledger: "赌场",
        pocket_watch: "杂货店",
        supplies: "杂货店",
      };
      const buildingName = itemToBuilding[trackedTask.objective.targetItem];
      if (buildingName) {
        const door = town.doors.find(d => d.name === buildingName);
        if (door) {
          marker.x = door.x;
          marker.z = door.z;
          marker.label = trackedTask.title;
          placed = true;
        }
      }
    }

    // delivery / fetch-with-building 任务：在目标建筑
    if (!placed && trackedTask.objective.targetBuilding) {
      const door = town.doors.find(d => d.name === trackedTask.objective.targetBuilding);
      if (door) {
        marker.x = door.x;
        marker.z = door.z;
        marker.label = trackedTask.title;
        placed = true;
      } else {
        // 模糊匹配
        for (const d of town.doors) {
          if (d.name.includes(trackedTask.objective.targetBuilding)) {
            marker.x = d.x;
            marker.z = d.z;
            marker.label = trackedTask.title;
            placed = true;
            break;
          }
        }
      }
    }

    if (placed) markers.push(marker);
    return markers;
  }

  // 任务目标头顶标记：DOM 节点池，3D→2D 投影
  const questMarkerPool = [];
  const _qmV = new THREE.Vector3();
  function updateQuestHeadMarkers() {
    const layer = document.getElementById("quest-marker-layer");
    if (!layer) return;

    // 释放所有标记
    for (const b of questMarkerPool) {
      b.inUse = false;
      b.el.style.display = "none";
    }

    // 只在室外显示 NPC 头顶标记
    if (insideRoom) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const camPos = camera.position;

    // AI 剧场：事件进行中，台上主角头顶显示名字，散场即消失。
    // 注意：必须在 trackedTask 的 return 之前——没跟踪任务时整个函数会提前返回，
    // 这段放它后面就永远执行不到（上一轮名字不显示就是这个原因）。
    if (theater?.active && theater.scene) {
      for (const m of theater.scene.cast) {
        const npc = m.npc;
        if (!npc.alive || npc.brain?.state === "DOWN") continue;
        const dx = npc.pos.x - camPos.x;
        const dz = npc.pos.z - camPos.z;
        if (dx * dx + dz * dz > 45 * 45) continue;
        _qmV.set(npc.pos.x, 2.66, npc.pos.z);
        _qmV.project(camera);
        if (_qmV.z > 1) continue;
        const x = (_qmV.x * 0.5 + 0.5) * w;
        const y = (-_qmV.y * 0.5 + 0.5) * h;
        let b2 = questMarkerPool.find(p => !p.inUse);
        if (!b2) {
          const el = document.createElement("div");
          el.className = "quest-head-marker";
          layer.appendChild(el);
          b2 = { el, inUse: true };
          questMarkerPool.push(b2);
        } else {
          b2.inUse = true;
        }
        b2.el.textContent = `🎭 ${m.stageName || npc.phone?.owner || ""}`;
        b2.el.className = "quest-head-marker theater-name";
        b2.el.style.display = "block";
        b2.el.style.left = `${x}px`;
        b2.el.style.top = `${y}px`;
        b2.el.title = "";
      }
    }

    // 专程来找玩家谈事的人：头顶挂 ❗ 引导玩家过去按 F
    // （沿用报案 🚨 那套"按 brain 状态挂图标"的做法，只是判据换成遭遇管线）
    for (const npc of npcManager.all) {
      if (!npc.alive || npc.brain?.state === "DOWN") continue;
      if (!encounters.isPending(npc)) continue;
      const edx = npc.pos.x - camPos.x;
      const edz = npc.pos.z - camPos.z;
      if (edx * edx + edz * edz > 60 * 60) continue;
      _qmV.set(npc.pos.x, 3.05, npc.pos.z);
      _qmV.project(camera);
      if (_qmV.z > 1) continue;
      let be = questMarkerPool.find(p => !p.inUse);
      if (!be) {
        const el = document.createElement("div");
        el.className = "quest-head-marker";
        layer.appendChild(el);
        be = { el, inUse: true };
        questMarkerPool.push(be);
      } else {
        be.inUse = true;
      }
      be.el.textContent = "❗";
      be.el.className = "quest-head-marker encounter-pending";
      be.el.style.display = "block";
      be.el.style.left = `${(_qmV.x * 0.5 + 0.5) * w}px`;
      be.el.style.top = `${(-_qmV.y * 0.5 + 0.5) * h}px`;
      be.el.title = "专程来找你 · 按 F 听他说";
    }

    // 伏地重伤的人：头顶挂 ⚡ 提示"这个还能处置"，与死尸区分开
    // （尸体不挂标记 —— 尸体没有可介入的余地，只能搜）
    for (const npc of npcManager.all) {
      if (!npc.isWounded) continue;
      const wdx = npc.pos.x - camPos.x;
      const wdz = npc.pos.z - camPos.z;
      if (wdx * wdx + wdz * wdz > 40 * 40) continue;
      _qmV.set(npc.pos.x, 1.25, npc.pos.z);   // 人躺着，标记压低
      _qmV.project(camera);
      if (_qmV.z > 1) continue;
      let bw = questMarkerPool.find(p => !p.inUse);
      if (!bw) {
        const el = document.createElement("div");
        el.className = "quest-head-marker";
        layer.appendChild(el);
        bw = { el, inUse: true };
        questMarkerPool.push(bw);
      } else {
        bw.inUse = true;
      }
      bw.el.textContent = "⚡";
      bw.el.className = "quest-head-marker subdue-pending";
      bw.el.style.display = "block";
      bw.el.style.left = `${(_qmV.x * 0.5 + 0.5) * w}px`;
      bw.el.style.top = `${(-_qmV.y * 0.5 + 0.5) * h}px`;
      bw.el.title = "重伤倒地 · 走近按 F 处置";
    }

    // 正在去警局报案的人：头顶挂个醒目图标，让玩家知道该优先拦谁
    for (const npc of npcManager.all) {
      if (!npc.alive || npc.brain?.state === "DOWN") continue;
      if (!npc.brain?.isReporting) continue;      const rdx = npc.pos.x - camPos.x;
      const rdz = npc.pos.z - camPos.z;
      if (rdx * rdx + rdz * rdz > 60 * 60) continue;
      _qmV.set(npc.pos.x, 3.05, npc.pos.z); // 比名字牌高一点，不遮名字
      _qmV.project(camera);
      if (_qmV.z > 1) continue;
      let b3 = questMarkerPool.find(p => !p.inUse);
      if (!b3) {
        const el = document.createElement("div");
        el.className = "quest-head-marker";
        layer.appendChild(el);
        b3 = { el, inUse: true };
        questMarkerPool.push(b3);
      } else {
        b3.inUse = true;
      }
      b3.el.textContent = "🚨";
      b3.el.className = "quest-head-marker reporting";
      b3.el.style.display = "block";
      b3.el.style.left = `${(_qmV.x * 0.5 + 0.5) * w}px`;
      b3.el.style.top = `${(-_qmV.y * 0.5 + 0.5) * h}px`;
      b3.el.title = "正在去警局报案";
    }

    const trackedTask = taskSystem.getTrackedTask();
    if (!trackedTask?.objective?.targetNpcId) return;
    const ownerKey = trackedTask.objective.targetNpcId;
    const iconMap = { bounty: "🔫", delivery: "📦", fetch: "🔍" };

    for (const npc of npcManager.all) {
      if (!npc.alive || npc.brain.state === "DOWN") continue;
      const owner = npc.phone?.owner || npc.name || '';
      const registryNpc = owner ? npcRegistry.findByDisplayName(owner) : null;
      if (!(registryNpc && registryNpc.id === ownerKey) && owner !== ownerKey) continue;

      // 距离裁剪
      const dx = npc.pos.x - camPos.x;
      const dz = npc.pos.z - camPos.z;
      if (dx * dx + dz * dz > 60 * 60) continue;

      _qmV.set(npc.pos.x, 3.0, npc.pos.z);
      _qmV.project(camera);
      if (_qmV.z > 1) continue; // 在相机背后

      const x = (_qmV.x * 0.5 + 0.5) * w;
      const y = (-_qmV.y * 0.5 + 0.5) * h;

      // 获取或创建节点
      let b = questMarkerPool.find(p => !p.inUse);
      if (!b) {
        const el = document.createElement("div");
        el.className = "quest-head-marker";
        layer.appendChild(el);
        b = { el, inUse: true };
        questMarkerPool.push(b);
      } else {
        b.inUse = true;
      }

      const icon = iconMap[trackedTask.type] || "🎯";
      b.el.textContent = icon;
      b.el.className = `quest-head-marker ${trackedTask.type}`;
      b.el.style.display = "block";
      b.el.style.left = `${x}px`;
      b.el.style.top = `${y}px`;
      b.el.title = trackedTask.title;
      break; // 一个NPC只标记一次
    }
  }

  // NPC 头顶名字标签：有立绘的重要 NPC 显示名字
  const nameTagPool = [];
  const _ntV = new THREE.Vector3();
  const NAME_TAG_NPCS = new Set([
    "npc_erin", "npc_jack", "npc_martha", "npc_noah",
    "npc_silas", "npc_victor", "npc_rosa", "npc_eli",
    "npc_hector", "npc_amos", "npc_bessie", "npc_thomas",
    "npc_carl", "npc_wei", "npc_lillian", "npc_brown", "npc_mary",
  ]);
  function updateNPCNameTags() {
    const layer = document.getElementById("npc-name-layer");
    if (!layer) return;

    // 释放所有标签
    for (const t of nameTagPool) { t.inUse = false; t.el.style.display = "none"; }

    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const npc of npcManager.all) {
      if (!npc.alive || npc.brain.state === "DOWN") continue;
      // 正在演戏的人由剧场层显示舞台名（更贴剧情），这里跳过，避免头上叠两个名字
      if (npc.brain._perform) continue;
      // 认识系统：只给"认识的人"挂名字牌。不认识的一律不显示 ——
      // 满街？？？比不显示更乱（名字在左下角交互面板里给）
      const nid = _regIdOf(npc);
      if (!nid || !_knowsNpc(nid)) continue;
      const disp = npc.phone?.owner || npcRegistry.get(nid)?.displayName || "";
      if (!disp) continue;

      // 距离裁剪
      const dx = npc.pos.x - camera.position.x;
      const dz = npc.pos.z - camera.position.z;
      if (dx * dx + dz * dz > 35 * 35) continue;

      _ntV.set(npc.pos.x, 2.66, npc.pos.z);
      _ntV.project(camera);
      if (_ntV.z > 1) continue;

      const x = (_ntV.x * 0.5 + 0.5) * w;
      const y = (-_ntV.y * 0.5 + 0.5) * h;

      // 获取或创建节点
      let t = nameTagPool.find(p => !p.inUse);
      if (!t) {
        const el = document.createElement("div");
        el.className = "npc-name-tag";
        layer.appendChild(el);
        t = { el, inUse: true };
        nameTagPool.push(t);
      } else {
        t.inUse = true;
      }

      const facLine = _factionLineFor(npc);
      // 认识的人：名字 + 下方小字势力名；不认识：？？？·职业
      t.el.innerHTML = facLine
        ? `<span>${disp}</span><em class="npc-name-fac">${facLine}</em>`
        : `<span>${disp}</span>`;
      t.el.style.display = "block";
      t.el.style.left = `${x}px`;
      t.el.style.top = `${y}px`;
    }
  }

  function renderTaskBar() {
    const tracked = document.getElementById("task-bar-tracked");
    const list = document.getElementById("task-bar-list");
    if (!tracked || !list) return;
    const activeTasks = taskSystem.getActiveTasks();
    const trackedTask = taskSystem.getTrackedTask();

    if (trackedTask) {
      const daysLeft = trackedTask.deadline > 0 ? '⏳' + (trackedTask.deadline - (worldState.day - trackedTask.assignedDay)) + '天' : '主线';
      const tIcon = trackedTask.type === "bounty" ? "🔫" : trackedTask.type === "delivery" ? "📦" : trackedTask.type === "main" ? "⭐" : "🔍";
      tracked.innerHTML = '<div class="task-bar-current" onclick="__ww.showTaskDetail(\'' + trackedTask.id + '\')">'
        + '<span class="tbi-type">' + tIcon + '</span>'
        + '<span class="tbi-title">' + trackedTask.title + '</span>'
        + '<span class="tbi-deadline">' + daysLeft + '</span>'
        + '</div>';
    } else if (activeTasks.length > 0) {
      tracked.innerHTML = '<div class="task-bar-current" style="opacity:0.6">📋 ' + activeTasks.length + ' 个任务进行中</div>';
    } else {
      tracked.innerHTML = '<div class="task-bar-current" style="opacity:0.5">📭 暂无任务</div>';
    }

    let listHtml = "";
    for (const t of activeTasks) {
      if (t === trackedTask) continue;
      const tIcon = t.type === "bounty" ? "🔫" : t.type === "delivery" ? "📦" : t.type === "main" ? "⭐" : "🔍";
      const tDL = t.deadline > 0 ? '⏳' + (t.deadline - (worldState.day - t.assignedDay)) + '天' : '主线';
      listHtml += '<div class="task-bar-item" onclick="__ww.taskSystem.trackTask(\'' + t.id + '\');__ww.renderTaskBar();__ww.showTaskDetail(\'' + t.id + '\')">';
      listHtml += '<span class="tbi-type">' + tIcon + '</span>';
      listHtml += '<span class="tbi-title">' + t.title + '</span>';
      listHtml += '<span class="tbi-deadline">' + tDL + '</span>';
      listHtml += '</div>';
    }
    list.innerHTML = listHtml;
  }

  function showTaskDetail(taskId) {
    const task = taskSystem.tasks.find(t => t.id === taskId);
    if (!task) return;
    const panel = document.getElementById("task-detail");
    const body = document.getElementById("task-detail-body");
    const title = document.getElementById("task-detail-title");
    if (!body) return;

    const daysLeft = task.deadline > 0 ? (task.deadline - (worldState.day - task.assignedDay)) : null;
    const typeIcon = task.type === "bounty" ? "🔫" : task.type === "delivery" ? "📦" : task.type === "main" ? "⭐" : "🔍";

    if (title) title.textContent = typeIcon + ' ' + task.title;

    let html = '';
    html += '<div class="td-section"><div class="td-label">类型</div><div class="td-value">' + (task.type === "bounty" ? "悬赏" : task.type === "delivery" ? "送货" : task.type === "main" ? "主线任务" : "寻物") + '</div></div>';
    html += '<div class="td-section"><div class="td-label">描述</div><div class="td-value">' + task.description + '</div></div>';
    html += '<div class="td-section"><div class="td-label">目标</div><div class="td-value">';
    if (task.objective.targetNpcId) html += '击败 ' + task.objective.targetNpcId;
    else if (task.objective.targetBuilding) html += '到达 ' + task.objective.targetBuilding;
    else if (task.objective.targetItem) html += '收集 ' + task.objective.targetItem;
    else if (task.objective.type === "own_home") html += '在银行购买一处房产';
    html += '</div></div>';

    html += '<div class="td-section"><div class="td-label">奖励</div><div class="td-reward">';
    if (task.reward.money) html += '💰 $' + task.reward.money + ' ';
    if (task.reward.honor) html += '⭐ 荣誉+' + task.reward.honor;
    html += '</div></div>';

    if (daysLeft !== null) {
      html += '<div class="td-section"><div class="td-deadline">⏳ 剩余 ' + daysLeft + ' 天 · 第' + task.assignedDay + '天接取</div></div>';
    } else {
      html += '<div class="td-section"><div class="td-deadline">⭐ 主线任务 · 无期限</div></div>';
    }

    html += '<div class="task-detail-actions">';
    if (task.status === "active") {
      if (task.tracked) {
        html += '<button class="tda-track" disabled>★ 已追踪</button>';
      } else {
        html += '<button class="tda-track" onclick="__ww.taskSystem.trackTask(\'' + taskId + '\');__ww.renderTaskBar();__ww.showTaskDetail(\'' + taskId + '\')">★ 追踪</button>';
      }
      html += '<button class="tda-abandon" onclick="__ww.taskSystem.abandonTask(\'' + taskId + '\');__ww.renderTaskBar();document.getElementById(\'task-detail\').classList.add(\'hidden\')">✕ 放弃</button>';
    } else if (task.status === "available") {
      html += '<button class="tda-track" onclick="__ww.taskSystem.acceptTask(\'' + taskId + '\');__ww.renderTaskBar();__ww.showTaskDetail(\'' + taskId + '\')">✅ 接取任务</button>';
      html += '<button class="tda-abandon" onclick="__ww.taskSystem.rejectTask(\'' + taskId + '\');document.getElementById(\'task-detail\').classList.add(\'hidden\')">✕ 拒绝</button>';
    }
    html += '</div>';

    body.innerHTML = html;
    panel.classList.remove("hidden");
  }

  // Task bar toggle
  document.getElementById("task-bar-toggle").addEventListener("click", () => {
    const bar = document.getElementById("task-bar");
    bar.classList.toggle("task-bar-collapsed");
    const list = document.getElementById("task-bar-list");
    if (list) list.classList.toggle("hidden");
  });

  // Task detail close
  document.getElementById("task-detail-close").addEventListener("click", () => {
    const panel = document.getElementById("task-detail");
    if (panel) panel.classList.add("hidden");
  });

  // 初始渲染任务栏
  renderTaskBar();

  // 调试钩子（控制台/自动化测试用）
  window.__ww = {
    player, town, sky, interiors, npcManager, economy, reputation, vehicles,
    enterInterior, exitInterior, stealHome, slots, baccarat,
    // P0+ 新系统
    worldClock, worldState, saveSystem, playerCondition, eventLog, dailySimulation,
    // P1 势力系统
    factionSystem, operationSystem,
    // P2 NPC 系统
    npcRegistry, relationshipSystem, knowledgeSystem,
    // P3 StoryTree
    storyRuntime,
    // P4 Director
    director, deliveryPlanner,
    // P5 LLM
    narrativeService,
    // AI 剧场
    theater, theaterUI,
    _theaterTrees: THEATER_TREES,
    _storyTrees: STORY_TREE_LIST,
    theaterStart: (treeId) => {
      // 个人剧场：自动绑定主角 NPC（protagonistId）
      const tree = [...THEATER_TREES, ...STORY_TREE_LIST].find((t) => t.id === treeId);
      const preferNpcId = tree?.protagonistId || null;
      // 个人/势力小剧场用独立入口（不在每日随机池）
      let ok;
      if (tree && !THEATER_TREES.includes(tree)) {
        ok = theater.startStoryTree(tree, preferNpcId);
      } else {
        ok = theater.debugStart(treeId, preferNpcId);
      }
      if (!ok) {
        const reason = theater.lastFailReason || "附近凑不齐合适的演员";
        hud.toast(`开演失败：${reason}（换个剧本或走到镇中心再试）`, { duration: 5000 });
      }
      return ok;
    },
    theaterStop: () => theater.scene?.disband("调试强制散场"),
    theaterGoStage: () => {
      // 传送到舞台边上（省去跑过去的时间），落点做一次碰撞修正免得卡进建筑
      const c = theater.stage.center;
      const safe = town.resolveCollision(c.x + 3.5, c.z + 3.5, 0.45);
      player.pos.set(safe.x, player.pos.y, safe.z);
      hud.toast("已传送到镇中心大街", { side: true, key: "theater-tp" });
    },
    theaterStatus: () => theater.debugStatus(),
    theaterTreeOptions: () => {
      const trees = [...(window.__ww._theaterTrees || []), ...(window.__ww._storyTrees || [])];
      const kinds = { personal: "个人", faction: "势力" };
      return trees.map((t) => {
        const label = t.kind ? `[${kinds[t.kind] || "?"}] ${t.title}` : t.title;
        return `<option value="${t.id}">${label}</option>`;
      }).join("");
    },
    // 遭遇管线调试：手动发起一次遭遇，或查看当前状态
    encounterStatus: () => ({ phase: encounters.phase, active: encounters.active?.id || null, npc: encounters.active?.name || null }),
    encounterTest: (title = "试探") => encounters.request({
      id: "debug:" + Date.now(),
      title: `🧪 ${title}`,
      intent: "一个镇民想试探玩家对帮派扩张的态度",
      beats: [
        "我在报纸上看到你干的事了，先生。",
        "镇上有人说你迟早要跟黑蹄会碰一碰。我想知道——你缺不缺帮手？",
      ],
      choices: [
        { id: "accept", label: "跟我干", risk: "low", hint: "招募他", effects: { recruit: true, honor: 1 } },
        { id: "pay", label: "先给你点钱打听消息", risk: "medium", hint: "-$50", effects: { cash: -50, affinity: { trust: 8, affection: 5 } } },
        { id: "refuse", label: "我不需要帮手", risk: "low", effects: { affinity: { trust: -5, affection: -5 } } },
      ],
    }),
    theaterLog: (n) => theater.recentLog(n),
    // 实时生成：顶部浮层开关 + 推理档位实时切换（不用重启就能 A/B 质量与延迟）
    aiLogToggle: () => aiLog.toggle(),
    aiLog: () => aiLog.recent(10),
    aiReasoning: (level) => {
      const ok = ["none", "low", "medium", "high"].includes(level);
      if (!ok) { hud.toast("推理档位只能是 none/low/medium/high", { side: true }); return null; }
      GLUE_GEN.reasoningEffort = level;
      CHAT_GEN.reasoningEffort = level;
      hud.toast(`🤖 推理档位 → ${level}`, { side: true, key: "ai-reasoning" });
      return level;
    },
    aiMaxTokens: (glue, chat) => {
      if (Number(glue) > 0) GLUE_GEN.maxTokens = Number(glue);
      if (Number(chat) > 0) CHAT_GEN.maxTokens = Number(chat);
      hud.toast(`🤖 max_tokens 剧场=${GLUE_GEN.maxTokens} 对话=${CHAT_GEN.maxTokens}`, { side: true });
      return { glue: GLUE_GEN.maxTokens, chat: CHAT_GEN.maxTokens };
    },
    // Phase 4 新系统
    taskSystem, stockMarket, showTaskDetail, renderTaskBar,
    // 快捷调试
    debugAdvanceDay() { worldClock.debugAdvanceDay(); hud.setDay(worldClock.day); },
    setPlayerDamage(v) {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return;
      player.damage = Math.max(0.1, Math.min(20, n));
      hud.toast?.(`⚔️ 伤害倍率 ${player.damage.toFixed(1)}`, { key: "dbg-dmg", duration: 2000 });
    },
    setPlayerDefense(v) {
      const n = parseInt(v, 10);
      if (!Number.isFinite(n)) return;
      player.defense = Math.max(0, Math.min(100, n));
      hud.toast?.(`🛡 防御减免 ${player.defense}`, { key: "dbg-def", duration: 2000 });
    },
    debugSave() { saveSystem.save(); },
    debugLoad() {
      const s = saveSystem.load();
      if (s) { worldState.fromJSON(s.state); worldClock.fromState(s.state); hud.setDay(worldClock.day); }
    },
    debugReset() {
      if (confirm("确定要清除所有存档，回到第一天吗？")) {
        saveSystem.clearAll();
        location.reload();
      }
    },
    debugPanel() {
      const p = document.getElementById('debug-panel');
      if (!p) return;
      const wasHidden = p.classList.contains('hidden');
      p.classList.toggle('hidden');
      if (p.classList.contains('hidden')) return;

      const ws = worldState.state;
      const bh = ws.factions?.black_hoof || {};
      const debugLog = ws.debugLog || [];
      let h = '';
      // Section 7: AI 街头剧场
      h += '<div class="debug-section"><div class="debug-section-title">🎭 AI 街头剧场 <span style="font-weight:400;opacity:.7">（F9 开演 · F10 传送 · F8 开演并传送）</span></div>';      const tst = theater.debugStatus();
      if (tst.active) {
        h += '<div class="debug-row">正在上演：' + tst.tree + '</div>';
        h += '<div class="debug-row">节点 ' + tst.node + ' / 阶段 ' + tst.phase + ' / 玩家区域 ' + tst.zone + '</div>';
        h += '<div class="debug-row">演员：' + tst.cast.join('、') + '</div>';
        h += '<div class="debug-row">衔接来源：' + tst.glueVia + '（llm=真实大模型，rule=关键词兜底，budget=被节流）</div>';
        if (tst.glueReason) {
          h += '<div class="debug-row"><span class="label">上次原因</span><span class="' + (tst.glueVia === 'llm' ? 'value' : 'bad') + '">' + tst.glueReason + '</span></div>';
        }
        if (tst.glueMs) h += '<div class="debug-row"><span class="label">上次耗时</span><span class="value">' + (tst.glueMs / 1000).toFixed(1) + 's</span></div>';
      } else {
        h += '<div class="debug-row">当前没有演出。今日开演时刻 ' + tst.todayTriggerHour + ' 点，已演过第 ' + tst.lastPlayedDay + ' 天</div>';
      }
      h += '<div class="debug-row" style="opacity:.7">走到镇中心大街（16 米内）才会出现事件选项和可对话状态</div>';
      h += '<div class="debug-row" style="margin-top:6px">';
      h += '<select id="debug-theater-select" style="background:#1c1c24;color:#e8e8e8;border:1px solid #3a3a44;border-radius:6px;padding:4px 8px;font-size:12px;max-width:220px">';
      h += '<option value="">— 选择要开演的剧本 —</option>';
      h += window.__ww.theaterTreeOptions?.() || '';
      h += '</select>';
      h += ' <button class="debug-btn" onclick="var s=document.getElementById(\'debug-theater-select\');__ww.theaterStart(s.value);__ww.debugPanel()">🎬 开演</button> ';
      h += '<button class="debug-btn" onclick="__ww.theaterGoStage();__ww.debugPanel()">🏃 传送到舞台</button> ';
      if (tst.active) h += '<button class="debug-btn" onclick="__ww.theaterStop();__ww.debugPanel()">⏹ 立刻散场</button>';
      h += '</div>';

      // Section 7c: 遭遇管线（P1）
      const encPh = encounters.phase;
      const encNpc = encounters.active?.name || null;
      h += '<div class="debug-section"><div class="debug-section-title">👥 遭遇 / 抉择 <span style="font-weight:400;opacity:.7">（NPC 走过来找你谈事 → 按 F 开弹窗）</span></div>';
      h += '<div class="debug-row"><span class="label">状态</span><span class="' + (encPh === "IDLE" ? 'value' : 'bad') + '">' + encPh + (encNpc ? ' · ' + encNpc : '') + '</span></div>';
      h += '<div class="debug-actions" style="margin-top:6px">';
      h += '<button class="debug-btn" onclick="__ww.encounterTest();__ww.debugPanel()">🎬 触发一场遭遇</button> ';
      h += '<button class="debug-btn" onclick="__ww.debugPanel()">🔄 刷新状态</button>';
      h += '</div>';
      h += '<div class="debug-row" style="opacity:.6">点"触发一场遭遇"后，附近会有人专程走过来找你；等他到跟前按 F 就能谈。</div>';
      h += '</div>';

      // Section 7b: 实时生成（大模型调用回执）
      h += '<div class="debug-section"><div class="debug-section-title">🤖 实时生成 <span style="font-weight:400;opacity:.7">（Ctrl+L 开关顶部浮层）</span></div>';      h += '<div class="debug-row"><span class="label">顶部浮层</span><span class="' + (aiLog.enabled ? 'value' : 'warn') + '">' + (aiLog.enabled ? '开' : '关') + '</span></div>';
      h += '<div class="debug-row"><span class="label">剧场衔接</span><span class="value">max_tokens=' + GLUE_GEN.maxTokens + ' · reasoning=' + GLUE_GEN.reasoningEffort + '</span></div>';
      h += '<div class="debug-row"><span class="label">NPC对话</span><span class="value">max_tokens=' + CHAT_GEN.maxTokens + ' · reasoning=' + CHAT_GEN.reasoningEffort + '</span></div>';
      h += '<div class="debug-row"><span class="label">对话来源</span><span class="' + (npcChat.lastVia === 'llm' ? 'value' : 'bad') + '">' + npcChat.lastVia + (npcChat.lastError ? ' · ' + npcChat.lastError : '') + '</span></div>';
      const _recent = aiLog.recent(3);
      if (_recent.length) {
        for (const line of _recent) h += '<div class="debug-row" style="opacity:.85">' + line.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</div>';
      } else {
        h += '<div class="debug-empty">还没有调用记录（说句话或开一场事件试试）</div>';
      }
      h += '<div class="debug-actions" style="margin-top:6px">';
      h += '<button class="debug-btn" onclick="__ww.aiReasoning(\'none\');__ww.debugPanel()">推理 关(最快)</button> ';
      h += '<button class="debug-btn" onclick="__ww.aiReasoning(\'low\');__ww.debugPanel()">推理 低(默认)</button> ';
      h += '<button class="debug-btn" onclick="__ww.aiReasoning(\'high\');__ww.debugPanel()">推理 高(最慢)</button> ';
      h += '<button class="debug-btn" onclick="__ww.aiLogToggle();__ww.debugPanel()">切换顶部浮层</button>';
      h += '</div></div>';

      h += '<div class="debug-summary">';
      h += '<span>📅 第' + worldClock.day + '天</span>';
      h += '<span>🕐 ' + worldClock.timeString() + '</span>';
      h += '<span>⚡ 精力 ' + Math.round(playerCondition.energy) + '</span>';
      h += '<span>💰 $' + economy.money + '</span>';
      h += '<span>⭐ 荣誉 ' + reputation.honor + '</span>';
      h += '<span>🚨 通缉 ' + reputation.wantedStars + '星</span>';
      h += '<span>🤖 LLM: ' + (narrativeService.enabled ? '✅ 已启用' : '⏸️ 已禁用') + '</span>';
      h += '</div>';

      // Section 0.5: 玩家战斗属性（调试用：伤害倍率 / 减伤）
      h += '<div class="debug-section"><div class="debug-section-title">⚔️ 玩家战斗属性 <span style="font-weight:400;opacity:.7">（调完按回车生效）</span></div>';
      h += '<div class="debug-row"><span class="label">伤害倍率</span>';
      h += '<input class="debug-num" id="dbg-dmg" type="number" step="0.1" min="0.1" max="20" value="' + player.damage.toFixed(1) + '" '
        + 'onchange="__ww.setPlayerDamage(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" /> '
        + '<span style="opacity:.6">× 造成的伤害（1.0=原始）</span></div>';
      h += '<div class="debug-row"><span class="label">防御减免</span>';
      h += '<input class="debug-num" id="dbg-def" type="number" step="1" min="0" max="100" value="' + player.defense + '" '
        + 'onchange="__ww.setPlayerDefense(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" /> '
        + '<span style="opacity:.6">− 每下受到的伤害</span></div>';
      h += '</div>';

      // Section 1: 帮派动态
      h += '<div class="debug-section"><div class="debug-section-title">🏴 帮派动态</div>';
      const gangLogs = debugLog.filter(l => l.section === '帮派');
      if (gangLogs.length === 0) h += '<div class="debug-empty">暂无帮派动态</div>';
      else gangLogs.slice(-5).forEach(l => { h += '<div class="debug-row">D' + l.day + ': ' + l.text + '</div>'; });
      h += '</div>';

      // Section 2: 势力状态
      h += '<div class="debug-section"><div class="debug-section-title">⚔️ 势力状态</div>';
      if (bh && bh.pillars) {
        Object.entries(bh.pillars).forEach(kv => { h += '<div class="debug-row">' + kv[1].label + ': ' + kv[1].value + '</div>'; });
      }
      const facLogs = debugLog.filter(l => l.section === '势力');
      facLogs.slice(-4).forEach(l => { h += '<div class="debug-row">D' + l.day + ': ' + l.text + '</div>'; });
      h += '</div>';

      // Section 3: 故事进度
      h += '<div class="debug-section"><div class="debug-section-title">📖 故事进度</div>';
      storyRuntime.getAllProgress().forEach(s => {
        h += '<div class="debug-row"><b>' + s.title + '</b>: ' + s.status + ' (' + s.completionPercent + '%)</div>';
      });
      const storyLogs = debugLog.filter(l => l.section === '故事');
      storyLogs.slice(-3).forEach(l => { h += '<div class="debug-row">D' + l.day + ': ' + l.text + '</div>'; });
      h += '</div>';

      // Section 4: 人际关系
      h += '<div class="debug-section"><div class="debug-section-title">💕 人际关系简报</div>';
      const relLogs = debugLog.filter(l => l.section === '关系');
      if (relLogs.length === 0) h += '<div class="debug-empty">暂无关系变化</div>';
      else relLogs.slice(-5).forEach(l => { h += '<div class="debug-row">D' + l.day + ': ' + l.text + '</div>'; });
      h += '</div>';

      // Section 5: 股票动态
      h += '<div class="debug-section"><div class="debug-section-title">📈 股票动态</div>';
      const stockLogs = debugLog.filter(l => l.section === '股票');
      if (stockLogs.length === 0) h += '<div class="debug-empty">暂无股票记录</div>';
      else stockLogs.slice(-5).forEach(l => { h += '<div class="debug-row">D' + l.day + ': ' + l.text + '</div>'; });
      // Show current prices
      if (ws.stockPrices) {
        for (const [id, data] of Object.entries(ws.stockPrices)) {
          h += '<div class="debug-row">' + id + ': $' + data.currentPrice + '</div>';
        }
      }
      h += '</div>';

      // Section 6: 最近事件
      h += '<div class="debug-section"><div class="debug-section-title">📋 最近事件</div>';
      (ws.eventHistory || []).slice(-8).forEach(e => { h += '<div class="debug-row">D' + e.day + ': ' + e.type + '</div>'; });
      h += '</div>';



      h += '<div class="debug-actions">';
      h += '<button class="debug-btn" onclick="__ww.debugAdvanceDay()">⏩ 强制过一天</button> ';
      h += '<button class="debug-btn" onclick="__ww.narrativeService.setEnabled(!__ww.narrativeService.enabled);__ww.debugPanel()">🤖 切换LLM</button>';
      h += '<button class="debug-btn" onclick="__ww.debugReset()">🔄 重置存档</button>';
      h += '</div>';
      document.getElementById('debug-panel-body').innerHTML = h;

      console.log('[DebugPanel] Rendered with', debugLog.length, 'debug log entries');
    },

  };

  // 快捷键：Ctrl+Shift+D 打开调试面板
  document.addEventListener("keydown", (e) => {
    if (e.key === "D" && e.shiftKey && e.ctrlKey) {
      window.__ww.debugPanel();
    }
    // Ctrl+L：开关顶部的实时生成回执浮层（默认开着；嫌挡视野就关掉）
    if ((e.key === "l" || e.key === "L") && e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const on = aiLog.toggle();
      hud.toast(on ? "🤖 顶部生成日志：开" : "🤖 顶部生成日志：关", { side: true, key: "ailog-toggle" });
      return;
    }
    // 调试面板放在打字拦截之前：它是排查问题的入口，
    // 万一输入框卡住了焦点，至少还能靠这个键打开面板看状态。
    // 键位：反引号（\` / ~）原有，另加 + / =（反引号在部分键盘布局上不好按，
    // 而 + 要按 Shift 才出来，所以把同一个物理键的 = 也一起收下）
    const _isDebugKey = e.code === "Backquote" || e.key === "`" || e.key === "~"
      || e.key === "+" || e.key === "=" || e.code === "Equal" || e.code === "NumpadAdd";
    if (_isDebugKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (input.typing) return; // 打字时这些都是正常输入，不抢
      e.preventDefault();
      window.__ww.debugPanel();
      return;
    }
    // 打字时 / 聊天条展开时 把键盘让出来，别按到热键弹出面板
    if (input.typing || theaterUI?.expanded) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === "F9") {
      e.preventDefault();
      window.__ww.theaterStart();          // 随机开演一场
    } else if (e.key === "F10") {
      e.preventDefault();
      window.__ww.theaterGoStage();        // 传送到舞台
    } else if (e.key === "F8") {
      e.preventDefault();
      window.__ww.theaterStart();
      window.__ww.theaterGoStage();        // 开演并直接过去
    }
    if ((e.key === "z" || e.key === "Z") && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // 打字已在函数开头统一拦掉，这里不用再判
      if (!anyModalOpen()) handleSleep();
    }
  });

  // 调试面板关闭按钮
  document.getElementById("debug-panel-close").addEventListener("click", () => {
    document.getElementById("debug-panel").classList.add("hidden");
  });

  engine.start();
}

boot();
