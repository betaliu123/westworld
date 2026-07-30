// SheriffSquad.js — 通缉围剿：按通缉星级动态调度 N 个警长实体围追玩家，星级越高人越多、伤害越高。

import { Sheriff } from "./Sheriff.js";
import { SHERIFF } from "../config/gameData.js";

export class SheriffSquad {
  constructor(scene, town, deps = {}) {
    this.scene = scene;
    this.town = town;
    this.deps = deps;
    this.hud = deps.hud || null;
    this.units = [];       // Sheriff[]
    this.deployed = false;
  }

  get active() {
    return this.deployed;
  }

  // 目标警力：3★→2 人，4★→3 人，5★→5 人（越高越夸张）
  _desiredCount(stars) {
    if (stars >= 5) return 5;
    if (stars >= 4) return 3;
    if (stars >= 3) return 2;
    return 0;
  }

  // 每颗星提升伤害
  _damageMul(stars) {
    return 1 + (stars - 3) * 0.5; // 3★=1.0, 4★=1.5, 5★=2.0
  }

  _spawnUnit(playerPos, idx, stars) {
    const s = new Sheriff(this.scene, this.town, this.deps);
    // 错开出生点，避免叠在一起
    s.homePos.x += (idx % 2 === 0 ? 1 : -1) * (3 + idx * 2);
    // 高通缉时部分警员驾车登场（星级越高开车的越多）
    const mounted = stars >= SHERIFF.carFromStars && (idx % 2 === 0 || stars >= 5);
    s.deploy(playerPos, mounted);
    this.units.push(s);
  }

  /**
   * @param {number} dt
   * @param {object} ctx { playerPos, playerInVehicle, wantedStars, onShoot, onCatch }
   */
  update(dt, ctx) {
    const stars = ctx.wantedStars;
    const want = this._desiredCount(stars);

    // 通缉解除 → 全部收队
    if (want === 0) {
      if (this.units.length > 0) {
        for (const s of this.units) s.update(dt, { ...ctx, wantedStars: 0 });
        // 收队后清理已 dormant 的
        this.units = this.units.filter((s) => s.active);
        if (this.units.length === 0) this.deployed = false;
      }
      return;
    }

    // 首次达标 → 提示
    if (!this.deployed) {
      this.deployed = true;
      if (this.hud) this.hud.toast(`🚔 警长带队出动了！（${want} 名警员）`);
    }

    // 补充警力到目标数量
    while (this.units.length < want) {
      this._spawnUnit(ctx.playerPos, this.units.length, stars);
      if (this.units.length > 1 && this.hud) this.hud.toast("🚨 更多警员加入围剿！");
    }

    const dmgMul = this._damageMul(stars);
    let anyCaught = false;
    for (const s of this.units) {
      s.update(dt, {
        playerPos: ctx.playerPos,
        playerInVehicle: ctx.playerInVehicle,
        wantedStars: stars,
        onShoot: (dist) => ctx.onShoot(dist, dmgMul),
        onCatch: () => { if (!anyCaught) { anyCaught = true; ctx.onCatch(); } },
      });
    }
  }

  // 强制全部撤离（被捕/死亡时）
  standDownAll() {
    for (const s of this.units) s.standDown();
    this.units = [];
    this.deployed = false;
  }

  // 车辆撞击检测：撞到追捕中的警长 → 撞倒眩晕。返回撞倒数量。
  checkVehicleHit(vehicle) {
    const speed = Math.abs(vehicle.speed || 0);
    if (speed < 3) return 0;
    const vx = vehicle.position.x, vz = vehicle.position.z;
    const dir = { x: Math.sin(vehicle.heading), z: Math.cos(vehicle.heading) };
    const hitRadius = (vehicle.radius || 1.6) + 0.7;
    let hits = 0;
    for (const s of this.units) {
      if (!s.active) continue;
      const d = Math.hypot(s.pos.x - vx, s.pos.z - vz);
      if (d < hitRadius) {
        const power = Math.min(18, speed * 0.8 + 4);
        if (s.knockByVehicle(dir, power)) hits++;
      }
    }
    return hits;
  }

  positions() {
    return this.units.filter((s) => s.active).map((s) => ({ x: s.pos.x, z: s.pos.z }));
  }
}
