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

    // 无敌帧（受击后短暂无敌，避免被群殴秒杀）
    this.invincibilityTimer = 0;
    this.invincibilityDuration = 0.8; // 0.8秒无敌

    this.walkAmount = 0;

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
    if (this.isWeak) speed *= 0.55; // 复活虚弱期降速

    let moving = move.lengthSq() > 0.001;
    if (moving) {
      move.normalize();
      this.facing = Math.atan2(move.x, move.z);
      this.pos.x += move.x * speed * dt;
      this.pos.z += move.z * speed * dt;
    }
    this.walkAmount += ((moving ? (running ? 1.4 : 1) : 0) - this.walkAmount) * Math.min(1, dt * 10);

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

    // 攻击输入
    if ((input.wasPressed("Mouse0") || input.wasPressed("KeyJ")) && this.attackCooldown <= 0) {
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
    animateCharacter(this.mesh, this.walkAmount, this.time, { baseY: this.pos.y, armRaise });

    this._updateCamera(dt, camera);
  }

  _updateCamera(dt, camera, isKnockdown = false) {
    const cosP = Math.cos(this.camPitch);
    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * cosP,
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * cosP
    ).multiplyScalar(this.camDist);

    // 倒地动画：相机缓慢降低到地面高度
    let camY = this.pos.y + 1.7;
    if (isKnockdown) {
      const progress = 1 - Math.max(0, this._knockdownTimer / 3.0);
      camY = this.pos.y + 1.7 - progress * 1.4; // 相机降到接近地面
      offset.y -= progress * 2.5; // 相机视角也压低
    }

    const target = new THREE.Vector3(this.pos.x, camY, this.pos.z);
    const desired = target.clone().add(offset);

    // 相机避墙
    const res = this.collider.resolveCollision(desired.x, desired.z, 0.5);
    desired.x = res.x;
    desired.z = res.z;
    if (desired.y < 0.6) desired.y = 0.6;

    camera.position.x = damp(camera.position.x, desired.x, 0.001, dt);
    camera.position.y = damp(camera.position.y, desired.y, 0.001, dt);
    camera.position.z = damp(camera.position.z, desired.z, 0.001, dt);
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
    this.health = clamp(this.health - amount, 0, 100);
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
}
