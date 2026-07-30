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
    this.phone = generatePhone(this.personality);
    // 给 NPC 一个唯一 ID（用于手机联系人区分同名NPC）
    this.phone.id = this.phone.owner + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // 女性外观：歌女必为女性，其余 35% 概率
    this.female = this.personality.job === "歌女" || Math.random() < 0.35;
    this.mesh = createCharacter({ female: this.female });
    this.mesh.position.set(spawn.x, 0, spawn.z);
    scene.add(this.mesh);

    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.heading = randRange(0, Math.PI * 2);
    this.radius = 0.5;
    this.time = randRange(0, 10);
    this.walkAmount = 0;
    this.alive = true;
    this.hp = 2 + Math.round(this.personality.bravery * 2); // 1-2 击倒

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
   */
  hit(attackerRef, byNpc = false) {
    if (!this.alive || this.brain.state === State.DOWN) return false;
    this.hp -= 1;
    this.brain.onHit(attackerRef);
    // 记录仇恨（供亲友报复系统使用）— 只记玩家的账
    if (!byNpc) {
      if (!this._grudgeAgainstPlayer) {
        this._grudgeAgainstPlayer = { day: 1, severity: 0 };
      }
      this._grudgeAgainstPlayer.day = this._currentDay || 1;
      this._grudgeAgainstPlayer.severity += 1;
    }
    // 击退
    const away = new THREE.Vector3(this.pos.x - attackerRef.x, 0, this.pos.z - attackerRef.z);
    if (away.lengthSq() > 0) {
      away.normalize().multiplyScalar(1.2);
      this.pos.x += away.x;
      this.pos.z += away.z;
    }
    if (this.hp <= 0) {
      this.brain.knockDown();
      return true;
    }
    return false;
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

  update(dt, ctx) {
    this.time += dt;
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
    const angryWithPlayerHere = this.brain.state === State.ANGRY && brainCtx.playerDist < 18;
    const indoor = this.insideHome || this.insideRoom;
    if (indoor && this.brain.state !== State.DOWN && !angryWithPlayerHere) {
      intent.moveTo = this.indoorExit;
      intent.speedMul = Math.max(intent.speedMul, 1.2);
      const dExit = Math.hypot(this.pos.x - this.indoorExit.x, this.pos.z - this.indoorExit.z);
      if (dExit < 1.4) {
        if (this.insideHome) this.exitHome();
        else this.exitPlace();
        return intent;
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
      // 倒地：躺平表现，不移动
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
        const speed = this.personality.walkSpeed * intent.speedMul;
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

    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    animateCharacter(this.mesh, this.walkAmount, this.time, { baseY: 0, armRaise });

    return intent;
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
