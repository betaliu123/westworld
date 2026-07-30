// Sheriff.js — 警长追捕系统：通缉度达阈值时警长实体出动追杀玩家、开枪；
// 玩家逃出视野并保持一段时间未被目击可甩脱，被贴身抓住则收押（罚款+清通缉）。

import * as THREE from "three";
import { createCharacter, animateCharacter } from "../entities/CharacterMesh.js";
import { lerpAngle, distance2D, clamp } from "../core/MathUtils.js";
import { SHERIFF } from "../config/gameData.js";

const SheriffState = {
  DORMANT: "DORMANT",   // 未出动
  CHASING: "CHASING",   // 追捕中
  SEARCHING: "SEARCHING", // 跟丢，搜索中
  RETURNING: "RETURNING", // 放弃，回岗
  STUNNED: "STUNNED",   // 被车撞倒/眩晕
};

export class Sheriff {
  constructor(scene, town, deps = {}) {
    this.scene = scene;
    this.town = town;
    this.audio = deps.audio || null;
    this.hud = deps.hud || null;

    // 警长造型：深色制服、银色警徽（用亮色躯干块近似）、黑帽
    this.mesh = createCharacter({ shirt: 0x2a3a55, pants: 0x1a1a22, hat: 0x101010, skin: 0xd9a074, scale: 1.08 });
    // 警徽：胸前小亮块
    const star = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 0.8, roughness: 0.3, emissive: 0x333333 })
    );
    star.position.set(0.16, 1.2, 0.2);
    this.mesh.add(star);
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.homePos = new THREE.Vector3(9, 0, -6); // 警局门口街道侧（开阔处，避免卡在建筑内）
    this.pos = this.homePos.clone();
    this.heading = 0;
    this.radius = 0.5;
    this.time = 0;
    this.walkAmount = 0;

    this.state = SheriffState.DORMANT;
    this.shootCd = 0;
    this.lostTimer = 0;      // 跟丢计时
    this.searchTimer = 0;
    this.caughtThisFrame = false;

    // 驾车形态：附一辆简易警车 mesh（跟随在警长脚下），mounted 时移动更快、可被撞
    this.mounted = false;
    this.carMesh = this._buildCar();
    this.carMesh.visible = false;
    scene.add(this.carMesh);
  }

  _buildCar() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.5, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 4), bodyMat);
    body.position.y = 0.7;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2), bodyMat);
    cabin.position.set(0, 1.15, 0);
    g.add(cabin);
    // 车顶警灯
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 0.9 })
    );
    light.position.set(0, 1.55, 0);
    g.add(light);
    g.userData.beacon = light;
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    for (const [x, z] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.42, z);
      g.add(w);
    }
    return g;
  }

  get active() {
    return this.state !== SheriffState.DORMANT;
  }

  // 出动追捕（mounted=true 则驾车登场：更快、可被撞）
  deploy(spawnNear, mounted = false) {
    if (this.active) return;
    // 从警局出现
    this.pos.copy(this.homePos);
    if (spawnNear) {
      // 在玩家与警局之间偏警局一侧登场，给玩家反应空间
      this.pos.x = clamp(this.homePos.x, spawnNear.x - 24, spawnNear.x + 24);
    }
    this.mounted = mounted;
    this.mesh.visible = true;
    if (this.carMesh) this.carMesh.visible = mounted;
    this.state = SheriffState.CHASING;
    this.lostTimer = 0;
    if (this.hud) this.hud.toast(mounted ? "🚓 警长驾警车追来了！" : "🚔 警长带枪出动了！快逃或藏起来！");
    if (this.audio) this.audio.gunshot();
  }

  // 收队回岗
  standDown() {
    if (!this.active) return;
    this.state = SheriffState.DORMANT;
    this.mesh.visible = false;
    if (this.carMesh) this.carMesh.visible = false;
    this.mounted = false;
    if (this.hud) this.hud.toast("😮‍💨 你甩掉了警长，风声渐息");
  }

  // 被车撞倒：进入眩晕状态，一段时间内退出追捕
  knockByVehicle(dir, power) {
    if (!this.active) return false;
    this.state = SheriffState.STUNNED;
    this._stunTimer = SHERIFF.stunSeconds;
    // 记录被撞飞方向，update 中做简单位移
    this._knockVel = { x: (dir?.x || 0) * (power || 6), z: (dir?.z || 0) * (power || 6) };
    if (this.audio) this.audio.crash();
    if (this.hud) this.hud.toast("🚗💥 你撞倒了一名警长！");
    return true;
  }

  // 玩家是否"可见"（简单：一定距离内且无（近似）视线遮挡——这里用距离+镇内近似）
  _canSeePlayer(playerPos) {
    const d = distance2D(this.pos.x, this.pos.z, playerPos.x, playerPos.z);
    return d < 32;
  }

  /**
   * @param {number} dt
   * @param {object} ctx { playerPos, playerInVehicle, wantedStars, onShoot, onCatch }
   */
  update(dt, ctx) {
    this.time += dt;
    if (this.shootCd > 0) this.shootCd -= dt;
    this.caughtThisFrame = false;

    if (this.state === SheriffState.DORMANT) {
      this.mesh.visible = false;
      return;
    }

    // 眩晕：倒地、位移衰减，计时结束后爬起继续追（若仍被通缉）
    if (this.state === SheriffState.STUNNED) {
      this._stunTimer -= dt;
      if (this._knockVel) {
        this.pos.x += this._knockVel.x * dt;
        this.pos.z += this._knockVel.z * dt;
        this._knockVel.x *= (1 - Math.min(1, dt * 2));
        this._knockVel.z *= (1 - Math.min(1, dt * 2));
        const r = this.town.resolveCollision(this.pos.x, this.pos.z, this.radius);
        this.pos.x = r.x; this.pos.z = r.z;
      }
      // 躺倒表现
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.set(this.pos.x, 0.3, this.pos.z);
      if (this._stunTimer <= 0) {
        this.mesh.rotation.z = 0;
        if (ctx.wantedStars > 0) {
          this.state = SheriffState.CHASING;
          this.lostTimer = 0;
        } else {
          this.standDown();
        }
      }
      return;
    }

    const playerPos = ctx.playerPos;
    const dist = distance2D(this.pos.x, this.pos.z, playerPos.x, playerPos.z);
    const canSee = this._canSeePlayer(playerPos);

    let targetX = playerPos.x;
    let targetZ = playerPos.z;
    let speed = this.mounted ? 11 : 6.4; // 驾车更快；步行略快于普通 NPC，玩家疾跑/开车能拉开

    if (this.state === SheriffState.CHASING) {
      if (canSee) {
        this.lostTimer = 0;
        // 开枪：中距离且冷却好了
        if (dist < 22 && dist > 3 && this.shootCd <= 0) {
          this.shootCd = 1.6;
          if (this.audio) this.audio.gunshot();
          if (ctx.onShoot) ctx.onShoot(dist);
        }
        // 贴身抓捕
        if (dist < 1.8 && !ctx.playerInVehicle) {
          this.caughtThisFrame = true;
          if (ctx.onCatch) ctx.onCatch();
        }
      } else {
        // 跟丢 → 进入搜索
        this.lostTimer += dt;
        if (this.lostTimer > 2.5) {
          this.state = SheriffState.SEARCHING;
          this.searchTimer = 6;
          this._searchTarget = { x: playerPos.x, z: playerPos.z };
        }
      }
      // 通缉降到 0 → 放弃
      if (ctx.wantedStars <= 0) {
        this.state = SheriffState.RETURNING;
      }
    } else if (this.state === SheriffState.SEARCHING) {
      // 走向最后已知位置，附近徘徊；重新看到玩家则恢复追捕
      targetX = this._searchTarget.x;
      targetZ = this._searchTarget.z;
      speed = 4.5;
      if (canSee && dist < 26) {
        this.state = SheriffState.CHASING;
        this.lostTimer = 0;
        if (this.hud) this.hud.toast("🚔 又被警长发现了！");
      } else {
        this.searchTimer -= dt;
        if (this.searchTimer <= 0 || ctx.wantedStars <= 0) {
          this.state = SheriffState.RETURNING;
        }
      }
    } else if (this.state === SheriffState.RETURNING) {
      targetX = this.homePos.x;
      targetZ = this.homePos.z;
      speed = 4;
      this._returnTimer = (this._returnTimer || 0) + dt;
      // 到家附近即收队；若被建筑挡住无法贴近，超时也收队（避免卡死）
      if (distance2D(this.pos.x, this.pos.z, this.homePos.x, this.homePos.z) < 3.5 || this._returnTimer > 12) {
        this._returnTimer = 0;
        this.standDown();
        return;
      }
      // 回程中若玩家又高通缉且靠近，重新追
      if (ctx.wantedStars >= 3 && canSee) {
        this.state = SheriffState.CHASING;
        this._returnTimer = 0;
      }
    }

    // 移动
    const dx = targetX - this.pos.x;
    const dz = targetZ - this.pos.z;
    const d = Math.hypot(dx, dz);
    let moving = false;
    if (d > (this.state === SheriffState.CHASING ? 1.4 : 1.0)) {
      const dirX = dx / d;
      const dirZ = dz / d;
      this.pos.x += dirX * speed * dt;
      this.pos.z += dirZ * speed * dt;
      this.heading = lerpAngle(this.heading, Math.atan2(dirX, dirZ), Math.min(1, dt * 8));
      moving = true;
    }
    const resolved = this.town.resolveCollision(this.pos.x, this.pos.z, this.radius);
    this.pos.x = resolved.x;
    this.pos.z = resolved.z;

    this.walkAmount += ((moving ? 1.3 : 0) - this.walkAmount) * Math.min(1, dt * 10);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    // 追捕时端枪抬手
    const armRaise = this.state === SheriffState.CHASING && this.shootCd > 1.2 ? -1.4 : -0.3;
    animateCharacter(this.mesh, this.walkAmount, this.time, { baseY: 0, armRaise });

    // 驾车形态：警车跟随警长位置/朝向，警灯闪烁
    if (this.mounted && this.carMesh) {
      this.carMesh.visible = this.state !== SheriffState.STUNNED;
      this.carMesh.position.set(this.pos.x, 0, this.pos.z);
      this.carMesh.rotation.y = this.heading;
      const beacon = this.carMesh.userData.beacon;
      if (beacon) beacon.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(this.time * 6)) * 0.8;
    }
  }
}
