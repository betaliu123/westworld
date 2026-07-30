// Vehicle.js — 载具：程序化跑车/篷车，简化车辆运动学，上下车与驾驶。

import * as THREE from "three";
import { clamp, lerpAngle } from "../core/MathUtils.js";

function makeCarMesh(color, sporty) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 4), bodyMat);
  body.position.y = 0.7;
  body.castShadow = true;
  g.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, sporty ? 1.6 : 2.0), bodyMat);
  cabin.position.set(0, 1.15, sporty ? -0.2 : 0);
  cabin.castShadow = true;
  g.add(cabin);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, sporty ? 1.4 : 1.8), glassMat);
  glass.position.set(0, 1.16, sporty ? -0.2 : 0);
  g.add(glass);

  // 轮子
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheels = [];
  for (const [x, z] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;

  // 车灯
  for (const x of [-0.6, 0.6]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.8 })
    );
    light.position.set(x, 0.7, 2);
    g.add(light);
  }
  return g;
}

export class Vehicle {
  constructor(scene, pos, opts = {}) {
    this.sporty = opts.sporty ?? false;
    this.temp = opts.temp ?? false; // 临时车（钥匙换来）
    this.maxSpeed = this.sporty ? 26 : 15;
    this.accel = this.sporty ? 22 : 14;
    this.group = makeCarMesh(opts.color ?? (this.sporty ? 0xd23a2a : 0x4a5a3a), this.sporty);
    this.group.position.set(pos.x, 0, pos.z);
    scene.add(this.group);

    this.heading = opts.heading ?? 0;
    this.speed = 0;
    this.radius = 1.6;
    this.occupied = false;
  }

  get position() {
    return this.group.position;
  }

  // 驾驶更新（仅在被占用时调用）
  drive(dt, input, town) {
    const throttle =
      (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 0.7 : 0);
    const steer =
      (input.isDown("KeyA") ? 1 : 0) - (input.isDown("KeyD") ? 1 : 0);

    // 加速/阻力
    this.speed += throttle * this.accel * dt;
    this.speed *= 1 - Math.min(1, dt * (throttle === 0 ? 1.8 : 0.5));
    this.speed = clamp(this.speed, -this.maxSpeed * 0.4, this.maxSpeed);

    // 转向随速度
    const speedFactor = clamp(Math.abs(this.speed) / 6, 0, 1);
    this.heading += steer * 1.8 * dt * speedFactor * Math.sign(this.speed || 1);

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    let nx = this.group.position.x + dir.x * this.speed * dt;
    let nz = this.group.position.z + dir.z * this.speed * dt;

    const resolved = town.resolveCollision(nx, nz, this.radius);
    if (resolved.x !== nx || resolved.z !== nz) this.speed *= 0.4; // 撞墙减速
    nx = resolved.x;
    nz = resolved.z;

    this.group.position.set(nx, 0, nz);
    this.group.rotation.y = this.heading;

    // 轮子滚动
    for (const w of this.group.userData.wheels) {
      w.rotation.x += this.speed * dt * 2;
    }
  }

  // 静止时缓慢停下并转轮展示
  idle(dt) {
    this.speed *= 1 - Math.min(1, dt * 2);
    this.group.position.y = 0;
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}

export class VehicleManager {
  constructor(scene, town) {
    this.scene = scene;
    this.town = town;
    this.vehicles = [];
    // 预置一辆停在镇口的篷车做点缀
    this.spawn({ x: 6, z: 26 }, { sporty: false, color: 0x5a6a4a, heading: Math.PI });
  }

  spawn(pos, opts) {
    const v = new Vehicle(this.scene, pos, opts);
    this.vehicles.push(v);
    return v;
  }

  // 玩家附近可上车的载具
  nearest(playerPos, range = 3) {
    let best = null;
    let bestD = Infinity;
    for (const v of this.vehicles) {
      if (v.occupied) continue;
      const d = Math.hypot(v.position.x - playerPos.x, v.position.z - playerPos.z);
      if (d < range && d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  update(dt) {
    for (const v of this.vehicles) {
      if (!v.occupied) v.idle(dt);
    }
  }
}
