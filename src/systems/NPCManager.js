// NPCManager.js — NPC 生成、批量 AI 调度、恐慌广播、远近细节分级。

import { NPC } from "../entities/NPC.js";
import { State } from "./AIBrain.js";
import { randRange, distance2D } from "../core/MathUtils.js";
import { AI_PANIC, BUMP, HOMES, BURGLARY } from "../config/gameData.js";
import { IMPORTANT_NPCS } from "../config/npcData.js";

export class NPCManager {
  constructor(scene, town, count = 20, interiors = null) {
    this.scene = scene;
    this.town = town;
    this.interiors = interiors;
    this.npcs = [];
    this.panicQueue = []; // { pos, radius }

    for (let i = 0; i < count; i++) {
      const p = town.randomInterestPoint();
      const spawn = { x: p.x + randRange(-6, 6), z: p.z + randRange(-6, 6) };
      const resolved = town.resolveCollision(spawn.x, spawn.z, 0.5);
      this.npcs.push(new NPC(scene, town, resolved));
    }

    // 分配家庭：情侣/一家人同住一栋民居
    this._assignHouseholds(town.homes || []);

    // 预分配重要 NPC 身份：将前 N 个户外 NPC 直接绑定到 IMPORTANT_NPCS 定义
    this._assignImportantNpcs(IMPORTANT_NPCS);
  }

  /**
   * 将 NPC 实体链接到注册表中对应的重要 NPC（按 phone.owner 匹配 displayName）。
   * @param {NPCRegistry} registry
   */
  linkRegistry(registry) {
    for (const npc of this.npcs) {
      const owner = npc.phone?.owner;
      if (!owner) continue;
      const impNpc = registry.findByDisplayName(owner);
      if (impNpc && npc.brain) {
        npc.brain.setRegistryId(impNpc.id);
      }
    }
  }

  /**
   * 直接将 IMPORTANT_NPCS 数组中的 NPC 身份预分配给户外 NPC 实体。
   * 不再依赖随机 phone 名字 + 子串匹配的不确定性。
   * 取前 N 个户外 NPC（N = 重要 NPC 数量），直接设置 _npcId、phone.owner、personality。
   */
  _assignImportantNpcs(importantDefs) {
    const count = Math.min(importantDefs.length, this.npcs.length);
    for (let i = 0; i < count; i++) {
      const npc = this.npcs[i];
      const def = importantDefs[i];
      if (npc.brain) {
        npc.brain.setRegistryId(def.id);
      }
      // 覆盖随机生成的 phone owner 为真实完整姓名
      if (npc.phone) {
        npc.phone.owner = def.displayName;
      }
      // 同步职业和帮派信息到 personality（供 UI 显示）
      if (npc.personality) {
        npc.personality.job = def.job;
        npc.personality.gang = def.factionId || null;
      }
      // 纠正性别外观（网格已在 NPC 构造函数中用随机性别创建）
      if (typeof def.female === "boolean") {
        npc.rebuildMesh(def.female);
      }
    }
    // 重要 NPC 身份分配完后，更新民居名称（之前 _assignHouseholds 用的是旧随机名）
    for (const home of (this.town.homes || [])) {
      if (home.occupants.length > 0) {
        const owner = home.occupants[0].phone.owner;
        home.name = home.occupants.length > 1 ? `${owner}一家` : `${owner}的家`;
      }
    }
  }

  // 把 NPC 按家庭规模（1~3 口）分配进民居；同住的就是"一家人/情侣"
  _assignHouseholds(homes) {
    if (!homes.length) return;
    const shuffled = [...this.npcs].sort(() => Math.random() - 0.5);
    let idx = 0;
    for (const home of homes) {
      // 按权重抽家庭规模
      const roll = Math.random();
      let acc = 0;
      let size = 1;
      for (const hw of HOMES.householdWeights) {
        acc += hw.w;
        if (roll <= acc) { size = hw.size; break; }
      }
      for (let i = 0; i < size && idx < shuffled.length; i++) {
        const npc = shuffled[idx++];
        npc.brain.home = home;
        npc.homeBedIndex = i;
        home.occupants.push(npc);
      }
      if (home.occupants.length > 0) {
        const owner = home.occupants[0].phone.owner;
        home.name = home.occupants.length > 1 ? `${owner}一家` : `${owner}的家`;
        // 藏物价值：基础随机 × 住户平均财富加成
        const avgWealth =
          home.occupants.reduce((s, o) => s + o.personality.wealth, 0) / home.occupants.length;
        home.stashAmount = Math.round(
          randRange(BURGLARY.stashRange[0], BURGLARY.stashRange[1]) *
            (BURGLARY.stashWealthBonus + avgWealth)
        );
      }
    }
  }

  // NPC 进屋（传送到其民居内的床铺点）
  _enterHome(npc) {
    const home = npc.brain.home;
    if (!home || !this.interiors) return;
    const room = this.interiors.get(home.interiorName);
    if (!room) return;
    const spot = home.bedSpots && home.bedSpots.length
      ? home.bedSpots[(npc.homeBedIndex || 0) % home.bedSpots.length]
      : null;
    npc.enterHome(home, room, spot);
  }

  _exitHome(npc) {
    npc.exitHome();
  }

  // NPC 进入室内场所（上班/消费）
  _enterPlace(npc, hour) {
    const target = npc.brain.target;
    if (!target || !target._interior || !this.interiors) return;
    const room = this.interiors.get(target._interior);
    if (!room) { npc.brain.target = null; return; }
    // 当前时段该 NPC 应去的场所类型（saloon/shop/work/church）
    const seg = hour >= 5 && hour < 11 ? "morning" : hour >= 11 && hour < 17 ? "noon" : hour >= 17 && hour < 21 ? "evening" : "night";
    const placeType = npc.personality.schedule ? npc.personality.schedule[seg] : null;
    const door = { x: target.x, z: target.z };
    npc.enterPlace(room, placeType, door);
  }

  _exitPlace(npc) {
    npc.exitPlace();
  }

  // 玩家在某民居内行窃：唤醒/惊动屋内住户。返回是否被人发现
  burgleHome(home, playerPos) {
    let seen = false;
    for (const npc of home.occupants) {
      if (!npc.insideHome || !npc.alive) continue;
      if (npc.brain.state === State.AT_HOME) {
        // 睡着的住户按概率被惊醒
        if (Math.random() < BURGLARY.wakeChance) {
          npc.brain.onBurglary(playerPos);
          seen = true;
        }
      } else {
        // 醒着的必然发现
        npc.brain.onBurglary(playerPos);
        seen = true;
      }
    }
    return seen;
  }

  /** 每天清晨刷新：把所有NPC重置到户外随机位置（从家出门上班） */
  refreshOutdoorPositions() {
    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      // 把室内的NPC踢出室外
      if (npc.insideHome) this._exitHome(npc);
      if (npc.insideRoom) this._exitPlace(npc);
      // 传送到街道随机兴趣点
      const p = this.town.randomInterestPoint();
      const spawn = { x: p.x + randRange(-8, 8), z: p.z + randRange(-8, 8) };
      const resolved = this.town.resolveCollision(spawn.x, spawn.z, 0.5);
      npc.pos.set(resolved.x, 0, resolved.z);
      if (npc.mesh) { npc.mesh.position.set(resolved.x, 0, resolved.z); }
      if (npc.brain) {
        npc.brain.state = "WANDER";
        npc.brain.target = null;
        npc.brain.stateTimer = randRange(2, 6);
      }
    }
  }

  // 玩家身处某室内时，只更新同一室内的 NPC（民居住户 / 场所里的上班 NPC）
  updateInside(dt, interiorName, playerPos, hour) {
    let attacks = 0;
    let reports = 0;
    for (const npc of this.npcs) {
      const inThisHome = npc.insideHome && npc.insideHome.interiorName === interiorName;
      const inThisRoom = npc.insideRoom && npc.insideRoom.name === interiorName;
      if (!inThisHome && !inThisRoom) continue;
      const intent = npc.update(dt, { playerPos, hour });
      if (intent && intent.wantAttack) attacks++;
      if (intent && intent.reportCrime) reports++;
      if (intent && intent.exitHome) this._exitHome(npc);
      else if (intent && intent.enterHome) this._enterHome(npc);
      else if (intent && intent.enterPlace) this._enterPlace(npc, hour);
      else if (intent && intent.exitPlace) this._exitPlace(npc);
    }
    return { attacks, reports };
  }

  // 广播一次恐慌事件（攻击发生时调用）
  broadcastPanic(pos, radius = AI_PANIC.broadcastRadius) {
    this.panicQueue.push({ x: pos.x, z: pos.z, radius });
  }

  // 找到玩家面前锥形范围内最近、存活且未倒地的 NPC
  findAttackTarget(playerPos, facing, range = 2.6, coneDeg = 90) {
    let best = null;
    let bestDist = Infinity;
    const cone = Math.cos((coneDeg * Math.PI) / 180 / 2);
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    for (const npc of this.npcs) {
      if (!npc.alive || npc.state === State.DOWN) continue;
      const dx = npc.pos.x - playerPos.x;
      const dz = npc.pos.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.001) continue;
      const dot = (dx / d) * fx + (dz / d) * fz;
      if (dot < cone) continue;
      if (d < bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  // 返回本帧的世界反馈：{ attacks, voice, npcPickedLoot } 。
  // loot 为可选的 Loot 系统，用于让贪婪 NPC 自行拾取地上的钱/物。
  // hour 为当前游戏小时，驱动 NPC 日程。
  update(dt, playerPos, loot = null, hour = 12, currentDay = 1) {
    // 更新 NPC 的当前天数（供 grudge 系统用）
    for (const npc of this.npcs) npc._currentDay = currentDay;

    // 处理恐慌广播（室内的不被街上动静波及），限制人数+随机延迟避免同时反应
    if (this.panicQueue.length > 0) {
      for (const ev of this.panicQueue) {
        const affected = [];
        for (const npc of this.npcs) {
          if (!npc.alive || npc.insideHome || npc.insideRoom) continue;
          const d = distance2D(npc.pos.x, npc.pos.z, ev.x, ev.z);
          if (d < ev.radius) affected.push({ npc, dist: d });
        }
        // 最多影响 5 个 NPC，优先最近的
        affected.sort((a, b) => a.dist - b.dist);
        const maxAffected = Math.min(affected.length, 5);
        for (let i = 0; i < maxAffected; i++) {
          const { npc, dist } = affected[i];
          // 随机延迟 0~1 秒，避免所有 NPC 同时逃跑
          const delay = Math.random() * 1.0;
          if (delay < 0.02) {
            npc.panic(playerPos, dist);
          } else {
            setTimeout(() => {
              if (npc.alive && npc.brain && npc.brain.state !== "DOWN") {
                npc.panic(playerPos, dist);
              }
            }, delay * 1000);
          }
        }
      }
      this.panicQueue.length = 0;
    }

    // 为平静的贪婪 NPC 分派附近可拾取的掉落物（现金 / 手机，钥匙不捡）
    if (loot) this._assignLootSeekers(loot, playerPos);

    let attacksOnPlayer = 0;
    let totalDamage = 0;
    let voiceCue = null;
    let npcPickedLoot = null;
    let crimeReports = 0;
    const playerAttackers = []; // 本帧打了玩家的 NPC，交给阵营系统判敌
    let gangAlerts = [];
    let friendsAlerts = [];

    // 逐个更新；远处降低更新频率（隔帧）
    for (const npc of this.npcs) {
      let intent = null;
      const dist = distance2D(npc.pos.x, npc.pos.z, playerPos.x, playerPos.z);
      const far = dist > 60;
      if (far) {
        npc._skip = !npc._skip;
        if (npc._skip) {
          // 隔帧更新，用双倍 dt 保持行为速度
          intent = npc.update(dt * 2, { playerPos, hour });
        }
      } else {
        intent = npc.update(dt, { playerPos, hour });
      }
      if (intent && intent.wantAttack) {
        const dmg = Math.round(6 * (intent.damageMult || 1));
        if (intent.attackTargetNpc) {
          // NPC 打 NPC：伤害打给目标，不计到玩家头上
          const victim = intent.attackTargetNpc;
          if (victim.alive && victim.brain?.state !== "DOWN") {
            const knocked = victim.hit(npc.pos, true); // byNpc=true：别记到玩家账上
            this.broadcastPanic(victim.pos, 10);
            if (knocked) {
              npc.brain.attackTargetNpc = null;
              npc.brain.threat = null;
              this._npcFightWins = (this._npcFightWins || 0) + 1;
            }
            if (!npc._encounters) npc._encounters = [];
            npc._encounters.push({ day: currentDay, type: "attack_npc", dmg, knocked });
          } else {
            // 目标已经倒了，收手
            npc.brain.attackTargetNpc = null;
            npc.brain.threat = null;
          }
        } else {
          attacksOnPlayer++;
          totalDamage += dmg;
          playerAttackers.push(npc); // 供阵营系统标记敌方 + 触发援护
          // 记录交手历史（NPC 攻击了玩家）
          if (!npc._encounters) npc._encounters = [];
          npc._encounters.push({ day: currentDay, type: "attack_player", dmg });
        }
      }
      if (intent && intent.reportCrime) crimeReports++;
      // 到达家门口 / 到点出门 / 进出工作场所
      if (intent && intent.enterHome) this._enterHome(npc);
      else if (intent && intent.exitHome) this._exitHome(npc);
      else if (intent && intent.enterPlace) this._enterPlace(npc, hour);
      else if (intent && intent.exitPlace) this._exitPlace(npc);
      // NPC 主动打招呼 → 触发 greet 环境音（每帧至多一个）
      if (intent && intent.greet && !voiceCue && dist < 26) voiceCue = "greet";

      // 帮派叫援：收集需要通知的帮派成员
      if (npc.brain._callGangBackup) {
        gangAlerts.push(npc);
        npc.brain._callGangBackup = false;
      }
      // 叫亲朋好友
      if (npc.brain._callFriendsBackup) {
        friendsAlerts.push(npc);
        npc.brain._callFriendsBackup = false;
      }

      // NPC 到达掉落物 → 拾取
      if (loot && intent && intent.reachedLoot && npc.brain.lootTarget) {
        const item = npc.brain.lootTarget._item;
        if (item && !item.picked) {
          loot.remove(item);
          npc.brain.lootTarget = null;
          npc.brain._enter && npc.brain.say && npc.brain.say("嘿，天上掉钱了！", 2);
          npc._voiceTimer = 0.01; // 触发一声开心
          npc._forceVoice = "happy";
          if (!npcPickedLoot) npcPickedLoot = { npc, item };
        }
      }

      // 近处 NPC 情境化环境发声（低频触发，避免嘈杂）
      if (dist < 26) {
        if (npc._voiceTimer === undefined) npc._voiceTimer = 2 + Math.random() * 8;
        npc._voiceTimer -= dt;
        if (npc._voiceTimer <= 0) {
          npc._voiceTimer = 6 + Math.random() * 12;
          const cue = npc._forceVoice || this._voiceForState(npc);
          npc._forceVoice = null;
          if (cue && !voiceCue) voiceCue = cue; // 每帧至多播一个，防叠音
        }
      }
    }

    // 处理帮派叫援：找到同帮派最近的1-2个成员，让他们进入愤怒状态
    for (const caller of gangAlerts) {
      const gangMembers = this.npcs.filter(n =>
        n !== caller && n.alive &&
        n.personality.gang === caller.personality.gang &&
        n.brain.state !== State.DOWN && n.brain.state !== State.ANGRY
      );
      gangMembers.slice(0, 2).forEach(member => {
        member.brain.emotion = 0.8;
        member.brain.threat = caller.brain.threat;
        member.brain._enter(State.ANGRY);
        member.brain.say("敢动我们的人？！", 2);
      });
    }

    // 处理叫亲朋好友：附近1-2个NPC来助威（50%愤怒、50%只是围观惊吓）
    for (const caller of friendsAlerts) {
      const nearby = this.npcs.filter(n =>
        n !== caller && n.alive &&
        n.brain.state !== State.DOWN && n.brain.state !== State.ANGRY &&
        n.brain.state !== State.FLEE &&
        Math.hypot(n.pos.x - caller.pos.x, n.pos.z - caller.pos.z) < 15
      );
      nearby.slice(0, 2).forEach(friend => {
        friend.brain.emotion = 0.6;
        friend.brain.threat = caller.brain.threat;
        if (Math.random() < 0.5) {
          friend.brain._enter(State.ANGRY);
          friend.brain.say("别欺负我朋友！", 2);
        } else {
          friend.brain._enter(State.STARTLED);
          friend.brain.say("这是怎么回事？！", 2);
        }
      });
    }

    return { attacks: attacksOnPlayer, totalDmg: totalDamage, voice: voiceCue, npcPickedLoot, reports: crimeReports, attackers: playerAttackers };
  }

  // 目击者检测：返回犯罪现场周围能目击到犯罪的NPC列表
  findWitnesses(pos, range = 12) {
    const witnesses = [];
    for (const npc of this.npcs) {
      if (!npc.alive || npc.insideHome || npc.insideRoom) continue;
      if (npc.brain.state === State.DOWN || npc.brain.state === State.AT_HOME) continue;
      const d = distance2D(npc.pos.x, npc.pos.z, pos.x, pos.z);
      if (d < range && !npc.brain._reportCrime) {
        witnesses.push(npc);
      }
    }
    return witnesses;
  }

  // 亲友报复：每日结算时检查有仇恨的 NPC，触发其亲友在大街上主动攻击玩家
  settleGrudgeRevenge(day, playerPos) {
    for (const npc of this.npcs) {
      if (!npc.alive || !npc._grudgeAgainstPlayer) continue;
      if (npc._revengeSpawned) continue;
      const daysSince = day - npc._grudgeAgainstPlayer.day;
      if (daysSince >= 1 && daysSince <= 5 && Math.random() < 0.4) {
        const allies = this._findAllies(npc);
        let spawned = 0;
        for (const ally of allies.slice(0, 2)) {
          if (ally.brain.state === State.DOWN || ally.brain.state === State.ANGRY) continue;
          ally.brain.emotion = 0.9;
          ally.brain.threat = playerPos || { x: ally.pos.x + 10, z: ally.pos.z };
          ally.brain._enter(State.ANGRY);
          ally.brain.say(`就是你打了${npc.phone?.owner || "我的朋友"}！`, 2.2);
          spawned++;
        }
        if (spawned > 0) {
          npc._revengeSpawned = true;
          npc._grudgeAgainstPlayer = null;
        }
      }
    }
  }

  _findAllies(npc) {
    const allies = [];
    for (const other of this.npcs) {
      if (other === npc || !other.alive) continue;
      // 同帮派
      if (npc.personality.gang && other.personality.gang === npc.personality.gang) {
        allies.push(other);
      }
      // 同民居（家人/室友）
      if (npc.brain.home && other.brain.home === npc.brain.home) {
        if (!allies.includes(other)) allies.push(other);
      }
    }
    return allies;
  }

  // 让附近平静的贪婪 NPC 去捡地上的钱/手机（钥匙太扎眼，不捡）
  _assignLootSeekers(loot, playerPos) {
    for (const item of loot.items) {
      if (item.picked || item._claimed) continue;
      if (item.type === "key") continue; // 钥匙不捡
      // 玩家就在旁边时 NPC 不敢上前
      if (distance2D(item.mesh.position.x, item.mesh.position.z, playerPos.x, playerPos.z) < 3) continue;
      // 找最近的、平静的、够贪婪的 NPC
      let best = null;
      let bestD = 14; // 只有 14m 内的会注意到
      for (const npc of this.npcs) {
      if (!npc.alive) continue;
      if (npc.brain._perform) continue; // 剧场演员：不被玩家挤走/挤怒
      const s = npc.brain.state;
        if (s !== State.WANDER && s !== State.IDLE) continue;
        if (npc.personality.greed < 0.35) continue; // 不贪的懒得捡
        const d = distance2D(npc.pos.x, npc.pos.z, item.mesh.position.x, item.mesh.position.z);
        if (d < bestD) { bestD = d; best = npc; }
      }
      if (best) {
        const target = { x: item.mesh.position.x, z: item.mesh.position.z, _item: item };
        if (best.brain.seekLoot(target)) {
          item._claimed = true;
          best._claimedItem = item;
        }
      }
    }
    // 释放：seeker 若已不在 SEEK_LOOT，解除认领，让物品可被他人再认领
    for (const npc of this.npcs) {
      if (npc._claimedItem && !npc.brain.isSeekingLoot()) {
        if (!npc._claimedItem.picked) npc._claimedItem._claimed = false;
        npc._claimedItem = null;
      }
    }
  }

  // 依 NPC 状态/性格挑选环境情绪音
  _voiceForState(npc) {
    const s = npc.brain.state;
    if (s === State.ANGRY) return "angry";
    if (s === State.FLEE || s === State.STARTLED) return "scared";
    if (s === State.DOWN) return null;
    // 平静/游走：社交型偶尔交谈或开心，其余安静
    const p = npc.personality;
    if (p.sociability > 0.55 && Math.random() < 0.6) return Math.random() < 0.5 ? "discuss" : "happy";
    if (Math.random() < 0.25) return "discuss";
    return null;
  }

  // 车辆碰撞检测：撞到未倒地的 NPC 则撞飞。返回被撞飞的 NPC 列表（供掉落/新闻/声望）。
  // vehicle 需提供 position、heading、speed。
  checkVehicleCollisions(vehicle) {
    const hits = [];
    const speed = Math.abs(vehicle.speed || 0);
    if (speed < 3) return hits; // 低速不撞飞
    const vx = vehicle.position.x;
    const vz = vehicle.position.z;
    const dir = { x: Math.sin(vehicle.heading), z: Math.cos(vehicle.heading) };
    const hitRadius = vehicle.radius + 0.6;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.launching) continue;
      if (npc.brain.state === State.DOWN) continue;
      const d = distance2D(npc.pos.x, npc.pos.z, vx, vz);
      if (d < hitRadius) {
        // 撞飞方向：车头朝向 + 从车到 NPC 的偏移，避免原地弹
        const offX = npc.pos.x - vx;
        const offZ = npc.pos.z - vz;
        const ol = Math.hypot(offX, offZ) || 1;
        const launchDir = {
          x: dir.x * 0.7 + (offX / ol) * 0.5,
          z: dir.z * 0.7 + (offZ / ol) * 0.5,
        };
        const ll = Math.hypot(launchDir.x, launchDir.z) || 1;
        launchDir.x /= ll;
        launchDir.z /= ll;
        const power = Math.min(20, speed * 0.9 + 4);
        const knocked = npc.launchBy(launchDir, power, vehicle.position);
        hits.push({ npc, knocked, speed });
        this.broadcastPanic(npc.pos, AI_PANIC.vehicleHitRadius);
      }
    }
    return hits;
  }

  // 记录玩家与某个 NPC 的交手事件（被攻击/被击倒等）
  recordEncounter(npc, type, props = {}) {
    if (!npc._encounters) npc._encounters = [];
    npc._encounters.push({ day: props.day || 0, type, ...props });
  }

  // 收集当前需要显示气泡的 NPC（供 Dialogue 用）
  get all() {
    return this.npcs;
  }

  // 玩家走路撞到附近 NPC：推开 + 记录撞击次数。
  // - 单次撞击：只抱怨，绝不打斗
  // - 2 次及以上：依 NPC 性格概率发怒（勇猛+攻击高→概率高），胆小则逃跑
  // - 偷窃中撞到目标 NPC：大幅增加被发现风险，可能直接触发战斗
  // 返回本帧触发的反应信息数组，供上层播音效/提示。
  checkPlayerBump(playerPos, playerFacing, dt, stealTarget = null) {
    const triggered = [];
    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      const s = npc.brain.state;
      if (s === State.DOWN || s === State.FLEE || s === State.ANGRY) continue;
      const dx = npc.pos.x - playerPos.x;
      const dz = npc.pos.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d >= BUMP.radius || d < 0.001) {
        // 离开接触：时间窗自然消退
        if (npc._bumpCd > 0) npc._bumpCd -= dt;
        // 长时间不接触则重置计数
        if (npc._bumpWindowStart) {
          const now = performance.now() / 1000;
          if (now - npc._bumpWindowStart > BUMP.windowSec) {
            npc._bumpCount = 0;
            npc._bumpWindowStart = 0;
          }
        }
        continue;
      }
      // 把 NPC 推开
      const nx = dx / d, nz = dz / d;
      npc.pos.x = playerPos.x + nx * BUMP.radius;
      npc.pos.z = playerPos.z + nz * BUMP.radius;
      const resolved = this.town.resolveCollision(npc.pos.x, npc.pos.z, npc.radius);
      npc.pos.x = resolved.x;
      npc.pos.z = resolved.z;

      // 撞击计数（带冷却，避免一帧多次/持续贴着狂加）
      if (npc._bumpCd === undefined) npc._bumpCd = 0;
      if (npc._bumpCd <= 0) {
        npc._bumpCd = BUMP.cooldown;
        // 时间窗内累计
        const now = performance.now() / 1000;
        if (!npc._bumpWindowStart || now - npc._bumpWindowStart > BUMP.windowSec) {
          npc._bumpWindowStart = now;
          npc._bumpCount = 0;
        }
        npc._bumpCount = (npc._bumpCount || 0) + 1;

        // 正在偷窃且撞到被偷 NPC → 极易被发现
        const isStealBump = stealTarget && npc === stealTarget;
        if (isStealBump && npc._bumpCount >= 1) {
          // 偷窃撞人：概率触发察觉（NPC 勇气越高越容易察觉）
          const detectChance = 0.4 + npc.personality.bravery * 0.5;
          if (Math.random() < detectChance) {
            npc._bumpCount = 0;
            npc.brain.onBumpedTooMuch(playerPos);
            this.broadcastPanic(npc.pos, AI_PANIC.broadcastRadius * 0.6);
            triggered.push({ npc, angry: npc.brain.state === State.ANGRY, stealDetect: true });
            continue;
          }
        }

        // 非偷窃情况：第 1 次永远只是轻碰
        if (npc._bumpCount < BUMP.triggerCount) {
          npc.brain.onLightBump();
          continue;
        }

        // 第 2+ 次：依性格概率决定反应
        const bravery = npc.personality.bravery || 0.5;
        const aggression = npc.personality.aggression || 0.3;
        // 概率公式：勇猛和攻击力越高越容易发怒；胆子小的永远只逃跑
        const angerChance = bravery > 0.45 && aggression > 0.3
          ? Math.min(0.9, (bravery - 0.4) * 0.8 + (aggression - 0.2) * 0.6 + (npc._bumpCount - 1) * 0.15)
          : 0;

        if (Math.random() < angerChance) {
          npc._bumpCount = 0;
          npc.brain.onBumpedTooMuch(playerPos);
          this.broadcastPanic(npc.pos, AI_PANIC.broadcastRadius * 0.6);
          triggered.push({ npc, angry: true });
        } else if (npc._bumpCount >= BUMP.triggerCount + 1) {
          // 撞了 3 次还不发怒 → 直接吓跑
          npc._bumpCount = 0;
          npc.brain._enter(State.FLEE);
          npc.brain.say("这人疯了！", 2);
          triggered.push({ npc, angry: false });
        } else {
          // 还没到逃跑阈值，继续抱怨
          npc.brain.onLightBump();
        }
      }
    }
    return triggered;
  }

  // 玩家附近可对话的 NPC（未倒地/未逃跑）
  nearestTalkable(playerPos, range = 3) {
    let best = null;
    let bestD = Infinity;
    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      const s = npc.brain.state;
      if (s === State.DOWN || s === State.FLEE || s === State.ANGRY) continue;
      const d = distance2D(npc.pos.x, npc.pos.z, playerPos.x, playerPos.z);
      if (d < range && d < bestD) {
        bestD = d;
        best = npc;
      }
    }
    return best;
  }
}
