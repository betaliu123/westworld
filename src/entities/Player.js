// Player.js — 玩家角色 + 第三人称轨道相机 + 运动学移动/跳跃/攻击挥击。

import * as THREE from "three";
import { createCharacter, animateCharacter } from "./CharacterMesh.js";
import { clamp, damp } from "../core/MathUtils.js";

export class Player {
  constructor(scene, town) {
    this.town = town;
    this.collider = town; // 当前碰撞上下文（室外=town，室内=interior），可切换
    this.mesh = createCharacter({ shirt: 0x2a4a7a, hat: 0x1a1410, skin: 0xe8b892 });
    this.mesh.position.set(0, 0, 20);
    scene.add(this.mesh);

    this.pos = new THREE.Vector3(0, 0, 20);
    this.velocityY = 0;
    this.onGround = true;
    this.facing = Math.PI; // 朝向 -z
    this.radius = 0.5;
    this.time = 0;

    // 相机轨道参数
    this.camYaw = Math.PI;
    this.camPitch = 0.28;
    this.camDist = 7;

    // 状态
    this.health = 100;
    this.attackTimer = 0;   // 攻击动画计时
    this.attackCooldown = 0;
    this.inVehicle = null;
    // 战斗属性（调试面板可调）：伤害倍率 与 减伤
    this.damage = 1.0;      // 造成的伤害倍率（1.0 = 原始）
    this.defense = 0;       // 减免受到的伤害点数（0 = 不减）

    // 无敌帧（受击后短暂无敌，避免被群殴秒杀）
    this.invincibilityTimer = 0;
    this.invincibilityDuration = 0.8; // 0.8秒无敌

    this.walkAmount = 0;

    // 瞄准/射击（右键按住瞄准，瞄准时左键才是开枪；不瞄准时左键仍是拳击）
    this.aiming = false;
    this._fireHandler = null;  // main 注入：瞄准时左键 → 射击（消耗子弹）

    // 死亡/复活
    this.clinicPos = new THREE.Vector3(14, 0, -10); // 医馆复活点
    this.weakTimer = 0;        // 复活后短暂虚弱（降速）
    this.onDeath = null;       // main 注入的死亡回调
    this._dead = false;
    this._knockedDown = false; // 倒地动画中
    this._knockdownTimer = 0;  // 倒地动画倒计时
    this._knockdownReason = ''; // 'guard' | 'npc' | 'fall'
    this._arrestTarget = null; // 逮捕后传送目标 {x, z}
  }

  get position() {
    return this.pos;
  }

  get isWeak() {
    return this.weakTimer > 0;
  }

  updateCameraFromMouse(input) {
    const { dx, dy } = input.consumeMouse();
    this.camYaw -= dx * 0.0025;
    this.camPitch = clamp(this.camPitch + dy * 0.0022, -0.15, 0.9);
  }

  update(dt, input, camera) {
    this.time += dt;
    this.updateCameraFromMouse(input);

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.weakTimer > 0) this.weakTimer -= dt;
    if (this.invincibilityTimer > 0) this.invincibilityTimer -= dt;

    // 倒地动画中：相机缓慢下降，不能操作
    if (this._knockedDown) {
      this._knockdownTimer -= dt;
      this.mesh.position.set(this.pos.x, this.pos.y - Math.max(0, (3.0 - this._knockdownTimer) * 0.6), this.pos.z);
      this._updateCamera(dt, camera, true /* knockdown */);
      if (this._knockdownTimer <= 0) {
        this._knockedDown = false;
        this._dead = false;
        this.health = 60;
        this.weakTimer = 6;
        this._arrestTarget = null;
        this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
      }
      return;  // 倒地期间跳过所有输入
    }

    if (this.inVehicle) {
      // 车辆接管移动，玩家藏在车里
      this._followVehicle(camera);
      return;
    }

    // 相对相机的移动方向
    const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const move = new THREE.Vector3();
    if (input.isDown("KeyW")) move.add(forward);
    if (input.isDown("KeyS")) move.sub(forward);
    if (input.isDown("KeyD")) move.add(right);
    if (input.isDown("KeyA")) move.sub(right);

    const running = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
    let speed = running ? 9.5 : 5.2;
    if (this.aiming) speed *= 0.45; // 瞄准时挪步慢
    if (this.isWeak) speed *= 0.55; // 复活虚弱期降速

    // ---- 自动寻路（手机上点了定位）----
    // 沿 Pathfinder 算出的拐点走，每段都保证直线可达。
    // 玩家一按方向键就交还操作权。
    let autoMoving = false;
    if (this.autoNav) {
      const nav = this.autoNav;
      if (move.lengthSq() > 0.001) {
        this.cancelAutoNav("你自己走了");
      } else {
        // 当前要去的拐点（最后一个才是真目标）
        const wp = nav.path[nav.idx] || { x: nav.x, z: nav.z };
        const isLast = nav.idx >= nav.path.length - 1;
        const dx = wp.x - this.pos.x;
        const dz = wp.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        // 中间拐点放宽到 1.2 米就算过了，免得贴着墙角来回修正
        const reach = isLast ? (nav.arriveDist ?? 2.5) : 1.2;

        if (dist <= reach) {
          if (isLast) {
            const cb = nav.onArrive;
            this.autoNav = null;
            if (cb) { try { cb(); } catch (e) { console.error("[Player] autoNav onArrive 出错", e); } }
          } else {
            nav.idx++;
            this._navStuck = 0;
            this._navLastDist = null;
          }
        } else {
          const ang = Math.atan2(dx, dz);
          move.set(Math.sin(ang), 0, Math.cos(ang));
          speed = 7.2;         // 自动赶路走快些
          autoMoving = true;

          // 卡住兜底：真被什么没进网格的东西挡住（车、NPC）就重算一次路径；
          // 重算过两次还不动就放弃，别让玩家一直贴在墙上。
          this._navLastDist = this._navLastDist ?? dist;
          if (dist > this._navLastDist - 0.02) this._navStuck = (this._navStuck || 0) + dt;
          else this._navStuck = 0;
          this._navLastDist = dist;
          if (this._navStuck > 1.2) {
            this._navStuck = 0;
            this._navLastDist = null;
            nav.replans = (nav.replans || 0) + 1;
            if (nav.replans > 2 || !nav.replan || !nav.replan()) {
              this.cancelAutoNav("这条路走不通");
            }
          }

          nav.timeout = (nav.timeout ?? 40) - dt;
          if (nav.timeout <= 0) this.cancelAutoNav("走了太久，自动导航结束");
        }
      }
    }

    let moving = move.lengthSq() > 0.001;
    if (moving) {
      move.normalize();
      this.facing = Math.atan2(move.x, move.z);
      this.pos.x += move.x * speed * dt;
      this.pos.z += move.z * speed * dt;
    }
    this.walkAmount += ((moving ? (running || autoMoving ? 1.4 : 1) : 0) - this.walkAmount) * Math.min(1, dt * 10);

    // 跳跃 & 重力
    if (input.isDown("Space") && this.onGround) {
      this.velocityY = 7.4;
      this.onGround = false;
    }
    this.velocityY -= 22 * dt;
    this.pos.y += this.velocityY * dt;
    if (this.pos.y <= 0) {
      this.pos.y = 0;
      this.velocityY = 0;
      this.onGround = true;
    }

    // 碰撞
    const resolved = this.collider.resolveCollision(this.pos.x, this.pos.z, this.radius);
    this.pos.x = resolved.x;
    this.pos.z = resolved.z;

    // 瞄准：右键按住进瞄准。要求指针已锁定，否则鼠标增量恒为 0，
    // 会出现"举着枪但视角转不动"（Input 在右键 mousedown 时会自动请求锁定）
    const aiming = input.isDown("Mouse2") && !this.inVehicle && input.pointerLocked;
    if (aiming !== this.aiming) this.aiming = aiming;
    // 瞄准过渡系数（0→1），相机拉近/越肩/持枪姿态都用它做平滑
    const aimTarget = this.aiming ? 1 : 0;
    this._aimBlend = (this._aimBlend ?? 0) + (aimTarget - (this._aimBlend ?? 0)) * Math.min(1, dt * 9);
    // 瞄准时身体朝镜头方向（否则枪口和准心不一致）
    if (this.aiming) this.facing = this.camYaw + Math.PI;

    // 攻击输入：瞄准时左键是开枪（走射击系统），否则是拳击
    if (input.wasPressed("Mouse0")) {
      if (this.aiming) {
        if (this._fireHandler) this._fireHandler();
      } else if (this.attackCooldown <= 0) {
        this.attackTimer = 0.35;
        this.attackCooldown = 0.55;
        this._pendingAttack = true;
      }
    }
    if (input.wasPressed("KeyJ") && this.attackCooldown <= 0 && !this.aiming) {
      this.attackTimer = 0.35;
      this.attackCooldown = 0.55;
      this._pendingAttack = true;
    }

    // 应用到网格
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.rotation.y = this.facing;

    // 攻击时右臂前挥
    let armRaise = 0;
    if (this.attackTimer > 0) {
      const t = 1 - this.attackTimer / 0.35;
      armRaise = -Math.sin(t * Math.PI) * 1.8;
    }
    animateCharacter(this.mesh, this.walkAmount, this.time, { baseY: this.pos.y, armRaise, aimPose: this._aimBlend ?? 0 });

    this._updateCamera(dt, camera);
  }

  _updateCamera(dt, camera, isKnockdown = false) {
    // 瞄准：镜头拉近 + 越肩偏移，让主角的头别挡住屏幕中央的准心
    const aimT = this._aimBlend ?? 0;
    const dist = this.camDist * (1 - aimT) + this.camDist * 0.42 * aimT;

    const cosP = Math.cos(this.camPitch);
    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * cosP,
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * cosP
    ).multiplyScalar(dist);

    // 倒地动画：相机缓慢降低到地面高度
    let camY = this.pos.y + 1.7;
    if (isKnockdown) {
      const progress = 1 - Math.max(0, this._knockdownTimer / 3.0);
      camY = this.pos.y + 1.7 - progress * 1.4; // 相机降到接近地面
      offset.y -= progress * 2.5; // 相机视角也压低
    }

    const target = new THREE.Vector3(this.pos.x, camY, this.pos.z);
    // 越肩：把相机与注视点一起往右平移，主角就偏到画面左侧，中央让给准心
    if (aimT > 0.001) {
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);
      const shoulder = 1.05 * aimT;
      target.x += rightX * shoulder;
      target.z += rightZ * shoulder;
      target.y += 0.25 * aimT; // 视线略抬，和枪口一致
    }
    const desired = target.clone().add(offset);

    // 相机避墙
    const res = this.collider.resolveCollision(desired.x, desired.z, 0.5);
    desired.x = res.x;
    desired.z = res.z;
    if (desired.y < 0.6) desired.y = 0.6;

    // 瞄准时相机跟得更紧，松开右键回到原本的柔和跟随
    const lambda = aimT > 0.5 ? 0.0002 : 0.001;
    camera.position.x = damp(camera.position.x, desired.x, lambda, dt);
    camera.position.y = damp(camera.position.y, desired.y, lambda, dt);
    camera.position.z = damp(camera.position.z, desired.z, lambda, dt);
    camera.lookAt(target);
  }

  _followVehicle(camera) {
    const v = this.inVehicle;
    this.pos.copy(v.group.position);
    this.mesh.position.set(this.pos.x, this.pos.y + 0.6, this.pos.z);
    this.mesh.rotation.y = v.heading;
    // 相机在车后
    const back = new THREE.Vector3(-Math.sin(v.heading), 0, -Math.cos(v.heading)).multiplyScalar(10);
    const desired = new THREE.Vector3(this.pos.x, this.pos.y + 5, this.pos.z).add(back);
    camera.position.lerp(desired, 0.12);
    camera.lookAt(this.pos.x, this.pos.y + 1.2, this.pos.z);
  }

  // 供 Combat 读取的攻击查询：返回本帧是否发起攻击并清除标记
  consumeAttack() {
    if (this._pendingAttack) {
      this._pendingAttack = false;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (this._dead || this.invincibilityTimer > 0 || this._knockedDown) return;
    // 防御：减免收到的伤害（调试面板可调）。减不到 0 以下，至少 1 点。
    const reduced = Math.max(1, amount - (this.defense || 0));
    this.health = clamp(this.health - reduced, 0, 100);
    this.invincibilityTimer = this.invincibilityDuration;
    if (this.health <= 0) {
      this._dead = true;
      this._knockedDown = true;
      this._knockdownTimer = 3.0;  // 3秒倒地动画
      if (this.onDeath) this.onDeath();
    }
  }

  // 倒地后被逮捕（警长接触时调用）
  arrestAt(targetPos) {
    this._arrestTarget = targetPos ? new THREE.Vector3(targetPos.x, 0, targetPos.z) : null;
    this._knockedDown = true;
    this._knockdownTimer = 2.0;
    this._knockdownReason = 'guard';
  }

  // 由 main 在死亡处理后调用：在医馆复活，短暂虚弱
  respawnAtClinic() {
    this.pos.copy(this.clinicPos);
    this.pos.y = 0;
    this.velocityY = 0;
    this.onGround = true;
    this.health = 60;         // 复活不满血
    this.weakTimer = 6;       // 6 秒虚弱降速
    this._dead = false;
    if (this.inVehicle) {
      this.inVehicle.occupied = false;
      this.inVehicle = null;
    }
    this.mesh.position.copy(this.pos);
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, 100);
  }

  // 传送到指定位置并切换碰撞上下文（用于进出室内）
  teleport(x, z, collider) {
    this.pos.set(x, 0, z);
    this.velocityY = 0;
    this.onGround = true;
    if (collider) this.collider = collider;
    this.mesh.position.copy(this.pos);
  }

  /**
   * 开始自动寻路（手机上点了"📍去看看"）。玩家一按 WASD 就会取消。
   *
   * 必须传 path —— 一串直线可达的拐点（由 Pathfinder 算）。只给终点会
   * 一头撞在建筑上：这个镇子主街两侧全是矩形楼，直线朝目标走十次有八次
   * 要穿墙。
   *
   * @param {number} x 目标 X
   * @param {number} z 目标 Z
   * @param {object} opts { label, path, replan, arriveDist, timeout, onArrive, onCancel }
   *   - path   : [{x,z}...] 拐点（末点应为目标）；缺省退化为直奔目标
   *   - replan : () => boolean 卡住时重算路径的回调，返回 false 表示算不出
   */
  startAutoNav(x, z, opts = {}) {
    const path = (opts.path && opts.path.length) ? opts.path.slice() : [{ x, z }];
    this.autoNav = {
      x, z,
      path,
      idx: 0,
      replans: 0,
      label: opts.label || "目的地",
      arriveDist: opts.arriveDist ?? 2.5,
      timeout: opts.timeout ?? 40,
      onArrive: opts.onArrive || null,
      onCancel: opts.onCancel || null,
      replan: opts.replan || null,
    };
    this._navLastDist = null;
    this._navStuck = 0;
    return this.autoNav;
  }

  /** 卡住时换一条新路径继续走（由 replan 回调调用） */
  setAutoNavPath(path) {
    if (!this.autoNav || !path || !path.length) return false;
    this.autoNav.path = path.slice();
    this.autoNav.idx = 0;
    this._navLastDist = null;
    this._navStuck = 0;
    return true;
  }

  cancelAutoNav(reason = "") {
    if (!this.autoNav) return false;
    const cb = this.autoNav.onCancel;
    this.autoNav = null;
    this._navLastDist = null;
    this._navStuck = 0;
    if (cb) { try { cb(reason); } catch (e) { console.error("[Player] autoNav onCancel 出错", e); } }
    return true;
  }
}
