// NPC.js — 单个 NPC：把 AIBrain 的意图转成移动/转向/动画表现，并持有掉落数据。

import * as THREE from "three";
import { createCharacter, animateCharacter } from "./CharacterMesh.js";
import { AIBrain, State, makePersonality } from "../systems/AIBrain.js";
import { generatePhone } from "../systems/PhoneData.js";
import { lerpAngle, damp, distance2D, chance, randRange, randInt } from "../core/MathUtils.js";
import { LOOT } from "../config/gameData.js";

export class NPC {
  constructor(scene, town, spawn) {
    this.town = town;
    this.scene = scene;        // 保存场景引用，供 rebuildMesh 使用
    this.collider = town;      // 当前碰撞上下文（室外=town，在自家=室内房间）
    this.insideHome = null;    // 非空表示 NPC 正在自己民居里
    this.personality = makePersonality();
    this.brain = new AIBrain(this.personality);

    // 女性外观：歌女必为女性，其余 35% 概率
    // 【顺序要紧】必须先定性别，再生成名字 —— generatePhone 要按性别选名池，
    // 否则会出现"老约翰·费尔柴"配女性模型这种名实不符。
    this.female = this.personality.job === "歌女" || Math.random() < 0.35;
    this.phone = generatePhone(this.personality, this.female);
    // 给 NPC 一个唯一 ID（用于手机联系人区分同名NPC）
    this.phone.id = this.phone.owner + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    this.mesh = createCharacter({ female: this.female });
    this.mesh.position.set(spawn.x, 0, spawn.z);
    scene.add(this.mesh);

    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.heading = randRange(0, Math.PI * 2);
    this.radius = 0.5;
    this.time = randRange(0, 10);
    this.walkAmount = 0;
    this.alive = true;
    // 耐打程度：软弱的镇民 3-4 下倒，硬汉/枪手/警长要 8-10 下。
    // 由胆量+攻击性+帮派+职业共同决定，最后夹到 [3,10]。
    const _p = this.personality;
    const JOB_TOUGH = {
      警长: 3, 神枪手: 2, 赏金猎人: 2, 铁匠: 2, 牛仔: 1, 马夫: 1,
      医生: 0, 牧师: 0, 歌女: 0, 记者: 0, 商人: 0, 赌徒: 0, 淘金客: 1, 旅人: 0, 酒保: 1,
    };
    this.maxHp = Math.max(3, Math.min(10,
      3 + Math.round(_p.bravery * 3 + _p.aggression * 2) + (_p.gang ? 1 : 0) + (JOB_TOUGH[_p.job] || 0)
    ));
    this.hp = this.maxHp;

    // ── 两阶段伤亡 ───────────────────────────────────────────────
    // 之前 alive 一路 true 到底，被打倒的人跟"死人"用同一套躺平表现，
    // 玩家没法判断地上这个还能不能救/能不能收服。现在拆成两层：
    //   ① 伏地重伤（alive=true, wounded=true）：侧卧、有呼吸、偶尔抽动
    //      → 可洗脑收服 / 搜身 / 补刀 / 放走
    //   ② 死亡（alive=false, dead=true）：俯卧、完全静止、整体压暗
    //      → 只能搜尸；会被目击者报官
    this.wounded = false;      // 伏地重伤（还活着）
    this.dead = false;         // 真死了
    this.woundedAt = 0;        // 进入重伤的游戏时刻（用于自行爬起/被救走判定）
    this._lethalHit = false;   // 这次挨的打是致命伤（爆头等）
    this._deathApplied = false;// 尸体压暗只做一次
    this.twitchAt = 0;         // 下次抽动的时间

    // 被撞飞的弹道速度（非零时进入 ragdoll 抛飞）
    this.launchVel = new THREE.Vector3(0, 0, 0);
    this.launching = false;

    // 掉落配置：依性格 + 配置 LOOT 决定掉什么
    this.hasPhone = chance(LOOT.phoneChance);   // 掉手机（叙事核心，默认必掉）
    this.hasCarKey = chance(LOOT.carKeyChance);  // 少数持有车钥匙
    this.cashReserve = Math.round(
      randRange(LOOT.cashRange[0], LOOT.cashRange[1]) * (LOOT.cashWealthBonus + this.personality.wealth)
    );

    this._downApplied = false;
  }

  // 重新生成角色模型（供 NPCManager 在分配重要 NPC 身份后纠正性别外观）
  // 注意：不在这里改名字。调用方（NPCManager）会用 def.displayName 覆盖 phone.owner，
  // 名字与性别的一致性由那份重要 NPC 名录保证。
  rebuildMesh(female) {
    if (this.female === female) return; // 无变化则跳过
    this.female = female;
    const pos = this.mesh.position.clone();
    this.mesh.parent.remove(this.mesh);
    this.mesh = createCharacter({ female });
    this.mesh.position.copy(pos);
    this.scene.add(this.mesh);
  }

  get position() {
    return this.pos;
  }

  get state() {
    return this.brain.state;
  }

  // 被玩家击中：返回是否被击倒
  /**
   * 被打。attackerRef 是攻击者位置引用。
   * byNpc 为真表示是别的 NPC 打的 —— 这时不能记仇到玩家头上，
   * 否则 NPC 互殴会让玩家莫名被亲友报复。
   * damage 默认 1（拳击），枪击传 2（重伤但留给对方反击机会）。
   * opts.lethal 为真表示这一下是致命伤（爆头），直接死，不进重伤阶段。
   */
  hit(attackerRef, byNpc = false, damage = 1, opts = {}) {
    if (!this.alive || this.dead) return false;
    // 已经伏地重伤的人可以被补刀打死，但不再重复"击倒"
    if (this.brain.state === State.DOWN) {
      if (opts.lethal || this.wounded) {
        this.die(byNpc ? "npc" : "player");
        return true;
      }
      return false;
    }
    this.hp -= Math.max(1, Math.round(damage));
    if (opts.lethal) this._lethalHit = true;
    this.brain.onHit(attackerRef);
    // 记录仇恨（供亲友报复系统使用）— 只记玩家的账
    if (!byNpc) {
      if (!this._grudgeAgainstPlayer) {
        this._grudgeAgainstPlayer = { day: 1, severity: 0 };
      }
      this._grudgeAgainstPlayer.day = this._currentDay || 1;
      this._grudgeAgainstPlayer.severity += damage >= 2 ? 2 : 1;
    }
    // 击退（枪击退得更远）
    const away = new THREE.Vector3(this.pos.x - attackerRef.x, 0, this.pos.z - attackerRef.z);
    if (away.lengthSq() > 0) {
      away.normalize().multiplyScalar(damage >= 2 ? 2.2 : 1.2);
      this.pos.x += away.x;
      this.pos.z += away.z;
    }
    if (this.hp <= 0) {
      this.brain.knockDown();
      // P14：记录"最近被玩家重伤"（供打招呼/对话分条件）
      if (!byNpc) this._woundedByPlayerDay = this._currentDay || 1;
      // 立刻判定伤情，而不是等倒地计时结束再判 —— 否则玩家走到跟前还没 ⚡，
      // 想收服却没入口；或计时一过轻伤者就爬起来跑，玩家永远追不上。
      if (this._lethalHit) {
        this.die("player");                 // 正中眉心 → 当场死亡（尸体）
      } else {
        const deficit = -Math.min(0, this.hp); // 被打穿的程度
        if (deficit >= 2) {
          // 重伤伏地：立即标 ⚡，可收服/补刀/放走；不起身
          this.enterWounded();
          this.brain.stateTimer = 999;      // 不清除，直到被处置或救走
        }
        // deficit < 2：轻伤倒地，3 游戏小时后自己爬起来一瘸一拐走
      }
      return true;
    }
    return false;
  }

  /**
   * 倒地后尝试爬起来。
   * 以前倒地计时结束就直接进 FLEE，但 hp 仍是 0 或负数 —— 结果"爆头打倒的人
   * 过几秒又站起来跑"，血条还挂着看着像回血。
   * 现在三档：轻伤爬起来 / 重伤伏地（可收服） / 致命伤直接死。
   * @returns {boolean} 是否真的站起来了
   */
  tryReviveFromDown() {
    if (!this.alive || this.dead) return false;
    // 致命伤（正中眉心）：不进重伤阶段，直接是尸体
    if (this._lethalHit) {
      this.die("player");
      return false;
    }
    const deficit = -Math.min(0, this.hp); // 被打穿的程度
    // 被打穿 2 格以上就起不来了 → 伏地重伤（还活着，可以被收服/补刀/救走）
    if (deficit >= 2) {
      this.hp = 0;
      this._outCold = true;
      this.enterWounded();
      return false;
    }
    this.hp = Math.max(1, Math.ceil(this.maxHp * 0.25)); // 勉强站起来，只剩一点血
    return true;
  }

  /** 进入伏地重伤阶段（还活着，玩家可介入） */
  enterWounded() {
    if (this.wounded || this.dead) return false;
    this.wounded = true;
    this.woundedAt = this.time;
    this.twitchAt = this.time + randRange(1.5, 4);
    return true;
  }

  /**
   * 真死。区别于伏地重伤：完全静止 + 俯卧 + 压暗，一眼就能看出来没救了。
   * cause: "player" | "npc" | "vehicle"
   */
  die(cause = "player") {
    if (this.dead) return false;
    this.dead = true;
    this.alive = false;
    this.wounded = false;
    this._outCold = true;
    this.deathCause = cause;
    this.hp = Math.min(this.hp, 0);
    this.brain.state = State.DOWN;
    this.brain.stateTimer = 9999;
    this.brain._wantRevive = false;
    this.brain.release?.();      // 归还可能持有的剧场/遭遇征召
    return true;
  }

  /** 伏地重伤的人被同伙拖走 / 自己爬起来后彻底离场 */
  removeFromScene(reason = "rescued") {
    this.wounded = false;
    this.removed = true;
    this.removedReason = reason;
    if (this.mesh) this.mesh.visible = false;
    return true;
  }

  /** 尸体压暗：把所有材质调暗并去掉高光，只做一次 */
  _applyDeathTint() {
    if (this._deathApplied || !this.mesh) return;
    this._deathApplied = true;
    this.mesh.traverse?.((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
      if (!mats) return;
      for (let i = 0; i < mats.length; i++) {
        const m = mats[i];
        if (!m || m.__wwDead) continue;
        // 克隆再改，避免把同一份共享材质里的活人一起弄暗
        const c = m.clone();
        c.__wwDead = true;
        if (c.color) c.color.multiplyScalar(0.42);
        if ("emissiveIntensity" in c) c.emissiveIntensity = 0;
        if (c.emissive) c.emissive.setRGB(0, 0, 0);
        mats[i] = c;
      }
      o.material = Array.isArray(o.material) ? mats : mats[0];
    });
  }

  get isOutCold() {
    return !!this._outCold;
  }

  /** 地上这个还能不能救/能不能收服 */
  get isWounded() {
    return !!this.wounded && !this.dead && !this.removed;
  }

  get isCorpse() {
    return !!this.dead;
  }

  panic(playerRef, distance) {
    this.brain.onPanicBroadcast(playerRef, distance);
  }

  // 被车辆撞飞：dir 为撞击方向单位向量，power 为强度
  launchBy(dir, power, sourceRef) {
    if (!this.alive) return false;
    const already = this.brain.state === State.DOWN;
    this.launching = true;
    this.launchVel.set(dir.x * power, power * 0.55, dir.z * power);
    this.brain.knockDown();
    this.brain.threat = sourceRef;
    // 撞击必定击倒并掉落（若之前还没倒）
    return !already;
  }

  // 回到自己民居（传送到室内床铺点，碰撞切到房间）
  enterHome(home, room, spot) {
    this.insideHome = home;
    this.collider = room;
    this.indoorExit = { x: home.exitPoint.x, z: home.exitPoint.z };
    const p = spot || { x: room.origin.x, z: room.origin.z };
    this.pos.set(p.x, 0, p.z);
    this.mesh.position.set(p.x, 0, p.z);
    this.brain._enter(State.AT_HOME);
    this.walkAmount = 0;
  }

  // 离开民居（传送回门外街道，碰撞切回小镇）
  exitHome() {
    const home = this.insideHome;
    if (!home) return;
    this.insideHome = null;
    this.indoorExit = null;
    this.collider = this.town;
    this.pos.set(home.doorX, 0, home.doorZ);
    this.mesh.position.set(home.doorX, 0, home.doorZ);
    this.mesh.rotation.z = 0;
    this.brain._enter(State.WANDER);
    this.brain.target = null;
  }

  // 进入室内场所（上班/消费：酒馆赌场教堂商店等）
  enterPlace(room, placeType, exitDoor) {
    this.insideRoom = room;
    this.collider = room;
    this.indoorExit = { x: room.exit.x, z: room.exit.z };
    this._exitDoor = exitDoor; // 出去后的街道落点
    this.brain._placeType = placeType;
    this.brain._enter(State.AT_PLACE);
    this.brain.target = null;   // 已进屋，清掉街上的目的地
    this._roomTarget = null;
    this.walkAmount = 0;
  }

  // 离开室内场所（传送回门口街道）
  exitPlace() {
    if (!this.insideRoom) return;
    this.insideRoom = null;
    this.indoorExit = null;
    this.collider = this.town;
    this.brain._placeType = null;
    const door = this._exitDoor || { x: this.pos.x, z: this.pos.z };
    this.pos.set(door.x, 0, door.z);
    this.mesh.position.set(door.x, 0, door.z);
    this.brain._enter(State.WANDER);
    this.brain.target = null;
  }

  /**
   * 为演出进入室内：把人放进房间但**不接管他的状态机**。
   *
   * 跟 enterPlace 的区别：enterPlace 会强制进 AT_PLACE（屋内随机游走），
   * 那会把剧场的 _perform 征召覆盖掉，演员就不会走去自己的站位了。
   * 这里只换碰撞上下文和位置，brain._perform 保持不动。
   *
   * @param {object} room  Interior 实例
   * @param {object} spot  房间内的落点（世界坐标）
   * @param {object} exitDoor 散场后回到的街道落点
   */
  enterRoomForScene(room, spot, exitDoor = null) {
    if (this.insideHome) this.exitHome?.();
    this.insideRoom = room;
    this.collider = room;
    this.indoorExit = { x: room.exit.x, z: room.exit.z };
    this._exitDoor = exitDoor || this._exitDoor || { x: room.exit.x, z: room.exit.z };
    this._roomTarget = null;
    if (spot) {
      const safe = room.resolveCollision(spot.x, spot.z, this.radius);
      this.pos.set(safe.x, 0, safe.z);
      this.mesh.position.set(safe.x, 0, safe.z);
    }
    this.walkAmount = 0;
  }

  /** 直接传送到指定坐标（同步逻辑 pos + 表现 mesh，先退出室内） */
  teleportTo(x, z) {
    if (this.insideHome) this.exitHome?.();
    else if (this.insideRoom) this.exitPlace?.();
    this.pos.set(x, 0, z);
    this.mesh.position.set(x, 0, z);
    this.brain?.stopFollow?.();
    if (this.brain) this.brain.target = null;
  }

  update(dt, ctx) {
    if (this.removed) return { moveTo: null, speedMul: 1 };
    this.time += dt;
    // 残血自愈：不在战斗/倒地时慢慢回血，避免满街都是残血 NPC。
    // 约 25 真实秒回满（一天 400 秒 ≈ 游戏内一个多小时），受伤后先等 8 秒才开始恢复。
    if (this.alive && this.hp > 0 && this.hp < this.maxHp) {
      const st = this.brain?.state;
      const inFight = st === "ANGRY" || st === "FLEE" || st === "DOWN";
      if (inFight) {
        this._regenDelay = 8;
      } else if ((this._regenDelay = (this._regenDelay ?? 8) - dt) <= 0) {
        this.hp = Math.min(this.maxHp, this.hp + (this.maxHp / 25) * dt);
      }
    }
    const brainCtx = {
      self: { x: this.pos.x, z: this.pos.z },
      town: this.town,
      playerPos: ctx.playerPos,
      playerRef: ctx.playerPos,
      playerDist: distance2D(this.pos.x, this.pos.z, ctx.playerPos.x, ctx.playerPos.z),
      hour: ctx.hour ?? 12,
    };
    const intent = this.brain.think(dt, brainCtx);

    let moving = false;
    let armRaise = 0;

    // 在家里睡觉：躺平，偶尔冒 Zzz 气泡（由 brain 控制）
    if (this.brain.state === State.AT_HOME) {
      this.mesh.rotation.z = damp(this.mesh.rotation.z, Math.PI / 2, 0.001, dt);
      this.walkAmount += (0 - this.walkAmount) * Math.min(1, dt * 10);
      animateCharacter(this.mesh, 0, this.time, { baseY: 0.25 });
      this.mesh.position.set(this.pos.x, 0.25, this.pos.z);
      return intent;
    }

    // 在室内场所（上班/消费）：在屋内游走，直到 schedule 换地点（brain 发出 exitPlace）
    if (this.brain.state === State.AT_PLACE) {
      if (!this._roomTarget || Math.random() < dt * 0.22) {
        this._roomTarget = this.insideRoom._roomPoint();
      }
      const dx = this._roomTarget.x - this.pos.x;
      const dz = this._roomTarget.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      let roomMoving = false;
      if (dist > 0.5) {
        const sp = this.personality.walkSpeed * 0.8;
        this.pos.x += (dx / dist) * sp * dt;
        this.pos.z += (dz / dist) * sp * dt;
        this.heading = lerpAngle(this.heading, Math.atan2(dx, dz), Math.min(1, dt * 6));
        roomMoving = true;
      }
      const res = this.insideRoom.resolveCollision(this.pos.x, this.pos.z, this.radius);
      this.pos.x = res.x;
      this.pos.z = res.z;
      this.walkAmount += ((roomMoving ? 0.8 : 0) - this.walkAmount) * Math.min(1, dt * 8);
      this.mesh.position.set(this.pos.x, 0, this.pos.z);
      this.mesh.rotation.y = this.heading;
      animateCharacter(this.mesh, this.walkAmount, this.time, { baseY: 0 });
      return intent;
    }

    // 醒着但还在屋里（被行窃惊醒等）：非愤怒时走向门口离开；
    // 愤怒但玩家已经跑远（离开室内）时也先出门再追
    //
    // 注意排除"正在演出"（brain._perform）：剧场/故事把演员征召到屋内站位后，
    // 他的状态是 WANDER 而不是 AT_PLACE，会掉进这个分支直接走出门去 ——
    // 于是玩家进屋只看到描写、看不到人。
    const angryWithPlayerHere = this.brain.state === State.ANGRY && brainCtx.playerDist < 18;
    const indoor = this.insideHome || this.insideRoom;
    const performing = !!this.brain._perform;
    if (indoor && !performing && this.brain.state !== State.DOWN && !angryWithPlayerHere) {
      intent.moveTo = this.indoorExit;
      intent.speedMul = Math.max(intent.speedMul, 1.2);
      const dExit = Math.hypot(this.pos.x - this.indoorExit.x, this.pos.z - this.indoorExit.z);
      if (dExit < 1.4) {
        if (this.insideHome) this.exitHome();
        else this.exitPlace();
        return intent;
      }
    }

    // 倒地计时结束后 brain 会请求爬起来，这里决定他到底起不起得来
    if (this.brain._wantRevive) {
      this.brain._wantRevive = false;
      if (!this.tryReviveFromDown()) {
        // 伤太重，躺回去（重伤昏迷，本轮不再起来）
        this.brain.state = State.DOWN;
        this.brain.stateTimer = 999;
      } else {
        // 爬起来：伤还没好全，一瘸一拐走（不是快速逃跑）
        this.brain.setLimp(12);
        this.brain.say?.("……唔，疼……", 2.2);
      }
    }

    if (this.brain.state === State.DOWN) {
      // 撞飞抛物：有弹道速度时走 ragdoll 抛飞
      if (this.launching) {
        this.launchVel.y -= 22 * dt;
        this.pos.x += this.launchVel.x * dt;
        this.pos.z += this.launchVel.z * dt;
        let y = this.mesh.position.y + this.launchVel.y * dt;
        // 空气/地面阻力
        this.launchVel.x *= (1 - Math.min(1, dt * 1.5));
        this.launchVel.z *= (1 - Math.min(1, dt * 1.5));
        const resolved = this.collider.resolveCollision(this.pos.x, this.pos.z, this.radius);
        this.pos.x = resolved.x;
        this.pos.z = resolved.z;
        if (y <= 0.3) {
          y = 0.3;
          this.launching = false;
          this.launchVel.set(0, 0, 0);
        }
        this.mesh.rotation.z += this.launchVel.length() * dt * 0.5 + dt;
        this.mesh.rotation.x += dt * 3;
        this.mesh.position.set(this.pos.x, y, this.pos.z);
        return intent;
      }
      // ── 尸体：俯卧、完全静止、整体压暗 ──────────────────────
      if (this.dead) {
        this._applyDeathTint();
        // 脸朝下扑倒（绕 X 轴），与重伤的侧卧（绕 Z 轴）在剪影上完全不同
        this.mesh.rotation.z = damp(this.mesh.rotation.z, 0, 0.002, dt);
        this.mesh.rotation.x = damp(this.mesh.rotation.x, -Math.PI / 2, 0.002, dt);
        this.walkAmount = 0;
        const j = this.mesh.userData?.joints;
        if (j) {
          // 四肢摊开定住，不再有任何动画
          j.legL.rotation.x = damp(j.legL.rotation.x, 0.12, 0.002, dt);
          j.legR.rotation.x = damp(j.legR.rotation.x, -0.18, 0.002, dt);
          j.armL.rotation.x = damp(j.armL.rotation.x, 0.5, 0.002, dt);
          j.armR.rotation.x = damp(j.armR.rotation.x, -0.35, 0.002, dt);
          j.head.rotation.y = damp(j.head.rotation.y, 0.4, 0.002, dt);
        }
        this.mesh.position.set(this.pos.x, 0.22, this.pos.z); // 比重伤更贴地
        return intent;
      }

      // ── 伏地重伤：侧卧 + 呼吸起伏 + 偶尔抽动 ────────────────
      if (this.wounded) {
        this.mesh.rotation.x = damp(this.mesh.rotation.x, 0, 0.001, dt);
        this.mesh.rotation.z = damp(this.mesh.rotation.z, Math.PI / 2, 0.001, dt);
        this.walkAmount = 0;
        // 呼吸：慢速上下起伏（约 4 秒一轮），幅度很小但看得出来还活着
        const breath = Math.sin(this.time * 1.6) * 0.035;
        const j = this.mesh.userData?.joints;
        if (j) {
          // 抽动：随机间隔抖一下手脚
          if (this.time >= this.twitchAt) {
            this._twitch = 1;
            this.twitchAt = this.time + randRange(2.5, 6.5);
          }
          this._twitch = Math.max(0, (this._twitch || 0) - dt * 3.5);
          const tw = this._twitch * this._twitch; // 收得快一点，像抽了一下
          j.legL.rotation.x = damp(j.legL.rotation.x, 0.25, 0.01, dt) + tw * 0.5;
          j.legR.rotation.x = damp(j.legR.rotation.x, -0.15, 0.01, dt);
          j.armL.rotation.x = damp(j.armL.rotation.x, 0.35, 0.01, dt) - tw * 0.6;
          j.armR.rotation.x = damp(j.armR.rotation.x, 0.1, 0.01, dt);
          j.head.rotation.y = Math.sin(this.time * 0.7) * 0.18; // 头微微晃
        }
        this.mesh.position.set(this.pos.x, 0.3 + breath, this.pos.z);
        return intent;
      }

      // 刚被打倒（还没判定起不起得来）：躺平表现，不移动
      this.mesh.rotation.x = damp(this.mesh.rotation.x, 0, 0.001, dt);
      this.mesh.rotation.z = damp(this.mesh.rotation.z, Math.PI / 2, 0.001, dt);
      this.walkAmount += (0 - this.walkAmount) * Math.min(1, dt * 10);
      animateCharacter(this.mesh, 0, this.time, { baseY: 0.3 });
      this.mesh.position.set(this.pos.x, 0.3, this.pos.z);
      return intent;
    }

    this.mesh.rotation.z = damp(this.mesh.rotation.z, 0, 0.001, dt);

    if (intent.moveTo) {
      const dx = intent.moveTo.x - this.pos.x;
      const dz = intent.moveTo.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.4) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        // 腿被打中过就跑不快了（射击系统命中腿部时置 _legHit）
        const legPenalty = this.brain._legHit ? 0.45 : 1;
        const speed = this.personality.walkSpeed * intent.speedMul * legPenalty;
        this.pos.x += dirX * speed * dt;
        this.pos.z += dirZ * speed * dt;
        this.heading = lerpAngle(this.heading, Math.atan2(dirX, dirZ), Math.min(1, dt * 8));
        moving = true;
      }
    } else if (intent.faceTarget || intent.glanceTarget) {
      // 对话中/主动注意玩家：转向玩家，不移动
      const tgt = intent.faceTarget || intent.glanceTarget;
      const dx = tgt.x - this.pos.x;
      const dz = tgt.z - this.pos.z;
      if (dx * dx + dz * dz > 0.01) {
        this.heading = lerpAngle(this.heading, Math.atan2(dx, dz), Math.min(1, dt * 10));
      }
    }

    // 情绪表现：愤怒/受惊抬手
    if (this.brain.state === State.ANGRY) armRaise = -0.9 + Math.sin(this.time * 12) * 0.4;
    else if (this.brain.state === State.STARTLED || this.brain.state === State.FLEE) armRaise = -1.4;

    // 碰撞
    const resolved = this.collider.resolveCollision(this.pos.x, this.pos.z, this.radius);
    this.pos.x = resolved.x;
    this.pos.z = resolved.z;

    const targetWalk = moving ? intent.speedMul : 0;
    this.walkAmount += (targetWalk - this.walkAmount) * Math.min(1, dt * 10);

    // 震惊/受惊时抖一下身子（表现层，不影响逻辑坐标）
    let sx = 0;
    let sz = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const amp = this.shakeAmp * Math.max(0, this.shakeTimer / this.shakeDur);
      sx = (Math.random() - 0.5) * amp;
      sz = (Math.random() - 0.5) * amp;
    }
    this.mesh.position.set(this.pos.x + sx, 0, this.pos.z + sz);
    this.mesh.rotation.y = this.heading;
    animateCharacter(this.mesh, this.walkAmount, this.time, { baseY: 0, armRaise });

    return intent;
  }

  /** 抖一下（震惊、被吓到、听到枪响） */
  shakeFor(seconds = 0.5, amp = 0.16) {
    this.shakeTimer = seconds;
    this.shakeDur = seconds;
    this.shakeAmp = amp;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
}
