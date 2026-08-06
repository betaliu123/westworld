// Interiors.js — 可进入的室内场景。核心建筑（酒馆/银行/警长办公室/杂货店）各有一间
// 带墙、家具与出口的房间，放在远离室外的世界偏移处；进出通过 Player.teleport 切换。

import * as THREE from "three";
import { createCharacter, animateCharacter } from "../entities/CharacterMesh.js";
import { randRange, distance2D, lerpAngle, pick, chance } from "../core/MathUtils.js";
import { INDOOR_TALK } from "../config/gameData.js";

function mat(color, rough = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
}

// 模块级闲聊语料来源：日常 / 传闻 / 报纸头条（由 main 注入）
const chatter = { rumorPool: [], headlineFn: null };

// 单个室内房间：自带碰撞体集合与出口点，实现 resolveCollision 接口（与 Town 同签名）。
class Interior {
  constructor(scene, def, origin) {
    this.name = def.name;
    this.def = def;
    this.origin = origin; // 世界偏移 {x, z}
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.colliders = [];       // 墙体矩形
    this.circleColliders = []; // 家具
    this.npcs = [];            // 室内氛围 NPC（简单游走）
    this.interactables = [];   // 可交互物（老虎机/百家乐桌等）：{ type, x, z }
    this.width = def.width || 16;
    this.depth = def.depth || 14;

    // 出口点（房间内靠门处），触发范围
    this.exitLocal = { x: 0, z: this.depth / 2 - 1.5 };
    this.exit = { x: origin.x + this.exitLocal.x, z: origin.z + this.exitLocal.z };

    // 后门出口（仅在4个有后门的建筑中存在）
    this.hasBackDoor = HAS_BACK_DOOR.has(def.name);
    this.backDoorLocal = this.hasBackDoor ? { x: 0, z: -this.depth / 2 + 1.5 } : null;
    this.backDoorExit = this.hasBackDoor ? { x: origin.x, z: origin.z - this.depth / 2 + 1.5 } : null;

    this._build();
  }

  _wall(w, h, d, lx, ly, lz, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color || 0x6b4a2b, 0.95));
    m.position.set(this.origin.x + lx, ly, this.origin.z + lz);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  _addWallCollider(lx, lz, halfW, halfD) {
    this.colliders.push({ x: this.origin.x + lx, z: this.origin.z + lz, halfW, halfD });
  }

  _furniture(w, h, d, lx, lz, color, blockR) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0.85));
    m.position.set(this.origin.x + lx, h / 2, this.origin.z + lz);
    m.castShadow = true;
    this.group.add(m);
    if (blockR) this.circleColliders.push({ x: this.origin.x + lx, z: this.origin.z + lz, r: blockR });
    return m;
  }

  _build() {
    const W = this.width;
    const D = this.depth;
    const wallH = 4;
    const t = 0.4; // 墙厚

    // 地板
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(this.def.floor || 0x7a5230, 1));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(this.origin.x, 0.02, this.origin.z);
    floor.receiveShadow = true;
    this.group.add(floor);

    // 天花板（略暗，营造室内）
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0x2a1f14, 1));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(this.origin.x, wallH, this.origin.z);
    this.group.add(ceil);

    // 四面墙（前墙留门洞：分左右两段）
    const wallColor = this.def.wall || 0x5e4326;
    const doorHalf = 1.5;

    // 后墙：如果有后门，也分两段留门洞
    if (this.hasBackDoor) {
      const segW = (W - doorHalf * 2) / 2;
      this._wall(segW, wallH, t, -(doorHalf + segW / 2), wallH / 2, -D / 2, wallColor);
      this._addWallCollider(-(doorHalf + segW / 2), -D / 2, segW / 2, t);
      this._wall(segW, wallH, t, doorHalf + segW / 2, wallH / 2, -D / 2, wallColor);
      this._addWallCollider(doorHalf + segW / 2, -D / 2, segW / 2, t);
      // 后门地垫
      const backPad = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.4),
        new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.35 })
      );
      backPad.rotation.x = -Math.PI / 2;
      backPad.position.set(this.backDoorExit.x, 0.05, this.backDoorExit.z);
      this.group.add(backPad);
    } else {
      // 后墙（无后门，整体封死）
      this._wall(W, wallH, t, 0, wallH / 2, -D / 2, wallColor);
      this._addWallCollider(0, -D / 2, W / 2, t);
    }
    // 左右墙
    this._wall(t, wallH, D, -W / 2, wallH / 2, 0, wallColor);
    this._addWallCollider(-W / 2, 0, t, D / 2);
    this._wall(t, wallH, D, W / 2, wallH / 2, 0, wallColor);
    this._addWallCollider(W / 2, 0, t, D / 2);
    // 前墙分两段留门洞（门宽 3，居中）
    const segW = (W - doorHalf * 2) / 2;
    this._wall(segW, wallH, t, -(doorHalf + segW / 2), wallH / 2, D / 2, wallColor);
    this._addWallCollider(-(doorHalf + segW / 2), D / 2, segW / 2, t);
    this._wall(segW, wallH, t, doorHalf + segW / 2, wallH / 2, D / 2, wallColor);
    this._addWallCollider(doorHalf + segW / 2, D / 2, segW / 2, t);

    // 室内照明（three r160 物理光衰减：点光源需要较大强度）
    const lamp = new THREE.PointLight(0xffd9a0, 42, 40, 2);
    lamp.position.set(this.origin.x, 3.4, this.origin.z);
    this.group.add(lamp);
    const amb = new THREE.AmbientLight(0xffe8c8, 0.75);
    this.group.add(amb);

    // 出口地垫（提示）
    const mat_mat = new THREE.MeshBasicMaterial({ color: 0xffce54, transparent: true, opacity: 0.35 });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), mat_mat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(this.exit.x, 0.05, this.exit.z);
    this.group.add(pad);

    // 按主题布置家具
    this.def.decorate(this);
  }

  // 登记可交互物（local 坐标 → 世界坐标）
  _interact(type, lx, lz) {
    this.interactables.push({ type, x: this.origin.x + lx, z: this.origin.z + lz });
  }

  // 添加一个室内氛围 NPC：在房间内小范围游走 + 摆臂动画 + 偶尔冒气泡，与室外风格统一
  // 升级为 NPC-like 对象，使 InteractionSystem 能检测到它们
  addPatron(lx, lz, opts) {
    const c = createCharacter(opts || {});
    const wx = this.origin.x + lx;
    const wz = this.origin.z + lz;
    c.position.set(wx, 0, wz);
    c.rotation.y = randRange(0, Math.PI * 2);
    this.group.add(c);
    const patron = {
      mesh: c,
      x: wx, z: wz,
      pos: new THREE.Vector3(wx, 0, wz), // NPC-compatible
      alive: true,
      heading: c.rotation.y,
      target: { x: wx, z: wz },
      speed: randRange(1.0, 1.8),
      walkAmount: 0,
      time: randRange(0, 10),
      retargetIn: randRange(1, 4),
      bubble: null,
      bubbleTimer: 0,
      talkIn: randRange(3, 10),
      // NPC-compatible 字段（使 InteractionSystem 能正确检测）
      insideRoom: this,
      personality: { job: opts.female ? "歌女" : "镇民", gang: null },
      phone: { owner: (opts.female ? "女士" : "镇民"), id: "patron_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) },
      brain: {
        state: "TALK", // 桩：室内客一直"可对话"，否则 InteractionSystem 的 TALK 检查会立刻掉线
        hasRoleInteraction: () => false,
        getRoleActions: () => null,
        getJobFollowUp: () => null,
        respondToRole: () => "（这位顾客似乎不想多聊……）",
        // 防崩溃：提供必要的 brain 方法存根
        startTalk: () => true,
        say: () => {},
        respondTo: (kind) => {
          const replies = { greet: "嗯，你好。", praise: "哦，谢谢。", insult: "哼！" };
          return { reply: replies[kind] || "（对方看了看你，没说话）", mood: "neutral" };
        },
        respondToExtort: () => ({ comply: false, amount: 0, reply: "你疯了吗？！在室内还敢打劫！", mood: "angry" }),
        respondToRecruit: () => ({ accepted: false, reply: "我在这就挺好，不想惹事。", mood: "neutral" }),
        // 室内客也要会烦：以前这里恒返回 null，于是 dlg_praise(+8信任/+6好感)
        // 对室内客可以无限刷，比室外那条更狠。
        _turns: 0,
        checkDialoguePatience() {
          this._turns++;
          if (this._turns < 4) return null;
          this._turns = 0;
          return {
            endConversation: true, reason: "no_more_words",
            text: ["我想安静喝会儿酒。", "没别的事了吧？", "让我自己待着吧。"][Math.floor(Math.random() * 3)],
          };
        },
        endTalk: () => {},
      },
      // 防崩溃：hit() 存根（室内 patrons 不能真正被击倒）
      hit: () => false,
    };
    this.npcs.push(patron);
  }

  // 房间内的随机可达点（避开墙壁和家具，避免角落）
  _roomPoint() {
    const margin = 2.2;
    const halfW = this.width / 2 - margin;
    const halfD = this.depth / 2 - margin;
    return {
      x: this.origin.x + randRange(-halfW, halfW) + randRange(-0.6, 0.6),
      z: this.origin.z + randRange(-halfD, halfD) + randRange(-0.6, 0.6),
    };
  }

  // 在远离指定点的方向选一个新的随机目标（用于从角落脱困）
  _roomPointAwayFrom(ax, az) {
    const margin = 2.2;
    const halfW = this.width / 2 - margin;
    const halfD = this.depth / 2 - margin;
    let bestX = ax, bestZ = az, bestDist = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const tx = this.origin.x + randRange(-halfW, halfW);
      const tz = this.origin.z + randRange(-halfD, halfD);
      const dist = Math.hypot(tx - ax, tz - az);
      if (dist > bestDist) { bestDist = dist; bestX = tx; bestZ = tz; }
    }
    return { x: bestX, z: bestZ };
  }

  // 与 Town 同签名的碰撞：墙体矩形 + 家具圆形，并把玩家限制在房间内
  resolveCollision(x, z, radius) {
    let nx = x;
    let nz = z;
    // 先硬夹到房间内墙范围（防止越过墙体或传送异常跑出房间）
    const halfW = this.width / 2 - 0.4 - radius;
    const halfD = this.depth / 2 - 0.4 - radius;
    nx = Math.max(this.origin.x - halfW, Math.min(this.origin.x + halfW, nx));
    nz = Math.max(this.origin.z - halfD, Math.min(this.origin.z + halfD, nz));
    for (const c of this.circleColliders) {
      if (c.r <= 0) continue;
      const dx = nx - c.x, dz = nz - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.r + radius;
      if (d < minD && d > 0.0001) {
        nx = c.x + (dx / d) * minD;
        nz = c.z + (dz / d) * minD;
      }
    }
    return { x: nx, z: nz };
  }

  update(dt, time) {
    // NPC 间分离力：距离过近时互相推开（防止穿透和拥挤）
    const SEPARATION_DIST = 1.2;
    const SEPARATION_FORCE = 0.3;
    for (let i = 0; i < this.npcs.length; i++) {
      for (let j = i + 1; j < this.npcs.length; j++) {
        const a = this.npcs[i], b = this.npcs[j];
        const dx = a.x - b.x, dz = a.z - b.z;
        const dist = Math.hypot(dx, dz);
        if (dist < SEPARATION_DIST && dist > 0.001) {
          const nx = dx / dist, nz = dz / dist;
          const push = (SEPARATION_DIST - dist) * SEPARATION_FORCE;
          a.x += nx * push; a.z += nz * push;
          b.x -= nx * push; b.z -= nz * push;
          a.pos.set(a.x, 0, a.z);
          b.pos.set(b.x, 0, b.z);
        }
      }
    }

    for (const p of this.npcs) {
      p.time += dt;
      // 重新选点
      p.retargetIn -= dt;
      if (p.retargetIn <= 0) {
        p.target = this._roomPoint();
        p.retargetIn = randRange(2, 6);
      }
      // 朝目标移动
      const dx = p.target.x - p.x;
      const dz = p.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      let moving = false;
      if (dist > 0.4) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        let nx = p.x + dirX * p.speed * dt;
        let nz = p.z + dirZ * p.speed * dt;
        const r = this.resolveCollision(nx, nz, 0.4);
        p.x = r.x; p.z = r.z;
        p.pos.set(r.x, 0, r.z); // sync pos Vector3 for InteractionSystem
        p.heading = lerpAngle(p.heading, Math.atan2(dirX, dirZ), Math.min(1, dt * 8));
        moving = true;
      }
      p.walkAmount += ((moving ? 1 : 0) - p.walkAmount) * Math.min(1, dt * 10);
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      animateCharacter(p.mesh, p.walkAmount, p.time, { baseY: 0 });

      // 卡住检测：3 秒内位移 < 0.05 单位 → 在远离当前位置的方向重新选点
      if (!p._stuckTimer) p._stuckTimer = 0;
      if (!p._lastStuckCheckPos) p._lastStuckCheckPos = { x: p.x, z: p.z };
      const movedSince = Math.hypot(p.x - p._lastStuckCheckPos.x, p.z - p._lastStuckCheckPos.z);
      if (movedSince < 0.05) {
        p._stuckTimer += dt;
        if (p._stuckTimer > 3.0) {
          p.target = this._roomPointAwayFrom(p.x, p.z);
          p.retargetIn = randRange(3, 5);
          p._stuckTimer = 0;
        }
      } else {
        p._stuckTimer = 0;
      }
      p._lastStuckCheckPos = { x: p.x, z: p.z };

      // 偶尔说话：一半日常闲聊，其余聊传闻或报纸头条
      if (p.bubbleTimer > 0) { p.bubbleTimer -= dt; if (p.bubbleTimer <= 0) p.bubble = null; }
      p.talkIn -= dt;
      if (p.talkIn <= 0) {
        p.talkIn = randRange(6, 14);
        if (chance(0.75)) {
          const r = Math.random();
          let text = null;
          if (r < 0.5 || chatter.rumorPool.length === 0) {
            text = pick(INDOOR_TALK);
          } else if (r < 0.8) {
            text = `听说了吗？${pick(chatter.rumorPool)}`;
          } else {
            const heads = chatter.headlineFn ? chatter.headlineFn() : [];
            text = heads.length ? `报上说：「${pick(heads)}」，你看了吗？` : pick(INDOOR_TALK);
          }
          p.bubble = text;
          p.bubbleTimer = 3;
        }
      }
    }
  }

  // 供对话气泡层复用：返回带 {pos,brain.bubble,brain.state} 形态的活动 patron
  bubbleAgents() {
    return this.npcs
      .filter((p) => p.bubble)
      .map((p) => ({ pos: { x: p.x, z: p.z }, brain: { bubble: p.bubble, state: "IDLE" } }));
  }
}

// 各核心建筑的室内主题装潢（重要场所：更大空间 + 更多 patron）
// 需要后门的建筑：酒馆、银行、杂货店、赌场
const HAS_BACK_DOOR = new Set(["酒馆", "银行", "杂货店", "赌场"]);
const INTERIOR_DEFS = {
  酒馆: {
    name: "酒馆", width: 22, depth: 17, floor: 0x8a6438, wall: 0x6b4a2b,
    decorate(it) {
      // 吧台
      it._furniture(10, 1.1, 1.2, 0, -it.depth / 2 + 2.5, 0x4a3018, 5);
      // 酒架（后墙）
      it._furniture(10, 2, 0.4, 0, -it.depth / 2 + 1.3, 0x3a2614);
      // 圆桌 + 凳
      for (const [tx, tz] of [[-6, 3], [6, 2], [-6, -2], [6, -3], [0, 4], [-2, -4], [3, 0]]) {
        it._furniture(1.8, 1, 1.8, tx, tz, 0x5e4326, 1.1);
      }
      // 钢琴角（酒馆氛围）
      it._furniture(2.2, 1.3, 1, -it.width / 2 + 1.6, -it.depth / 2 + 1.6, 0x2a1a10, 1.4);
      // 酒保 + 酒客（减少人数避免拥挤）
      it.addPatron(0, -it.depth / 2 + 3.6, { shirt: 0xdedede, hat: 0x2a2018 }); // 酒保
      it.addPatron(-6, 4, { shirt: 0x7a4a6a });
      it.addPatron(6, 3, { shirt: 0x4a6a3a });
      it.addPatron(-5, -1.4, { shirt: 0x3a5a7a });
      it.addPatron(3, 0.6, { female: true });
    },
  },
  银行: {
    name: "银行", width: 17, depth: 14, floor: 0x9a9a8a, wall: 0x7a7060,
    decorate(it) {
      // 柜台 + 铁栏
      it._furniture(11, 1.2, 1, 0, -it.depth / 2 + 3, 0x3a3020, 5);
      it._furniture(11, 1.4, 0.2, 0, -it.depth / 2 + 2.4, 0x2a2a2a);
      // 金库门（后墙亮块）
      it._furniture(3, 2.6, 0.4, 5, -it.depth / 2 + 1, 0xbcae7a, 1.6);
      it.addPatron(0, -it.depth / 2 + 4, { shirt: 0x2a3a55, hat: 0x1a1a22 }); // 出纳
      it.addPatron(-3, 2, { shirt: 0x5a5a6a });
      it.addPatron(4, 3, { shirt: 0x6a5a3a });
      it.addPatron(-5, 4, { female: true });
    },
  },
  警长办公室: {
    name: "警长办公室", width: 15, depth: 12, floor: 0x7a5230, wall: 0x5a4326,
    decorate(it) {
      // 办公桌
      it._furniture(3, 1.1, 1.6, -3, -it.depth / 2 + 3, 0x4a3018, 2);
      // 牢房栏杆（右侧）
      for (let i = 0; i < 5; i++) {
        it._furniture(0.15, 3, 0.15, it.width / 2 - 2 + i * 0.7, -2, 0x2a2a2a, 0.3);
      }
      // 墙上通缉告示（亮块）
      it._furniture(1.2, 1.5, 0.1, -it.width / 2 + 1, -it.depth / 2 + 0.5, 0xd9c9a0);
      it.addPatron(-3, -it.depth / 2 + 4, { shirt: 0x2a3a55, hat: 0x101010 }); // 副警长
      it.addPatron(2, 1, { shirt: 0x4a3a2a });
    },
  },
  杂货店: {
    name: "杂货店", width: 17, depth: 14, floor: 0x8a6438, wall: 0x6b5230,
    decorate(it) {
      // 货架（沿两侧墙）
      for (const sx of [-it.width / 2 + 1.2, it.width / 2 - 1.2]) {
        it._furniture(1.4, 2.4, it.depth - 4, sx, 0, 0x4a3620, 1);
      }
      // 柜台
      it._furniture(6, 1.1, 1.2, 0, -it.depth / 2 + 2.5, 0x5e4020, 3.5);
      // 商品堆（木桶/箱）
      it._furniture(1, 1, 1, -3, 3, 0x6b4a2b, 0.7);
      it._furniture(1, 1, 1, 3, 3.5, 0x7a5230, 0.7);
      it.addPatron(0, -it.depth / 2 + 3.6, { shirt: 0x9c4a3a }); // 店主
      it.addPatron(-2, 2.5, { shirt: 0x3a5a7a });
      it.addPatron(4, 4, { shirt: 0x6a5a3a });
      it.addPatron(-4, 5, { female: true });
      it.addPatron(2, 0, { shirt: 0x5a5a6a });
    },
  },
  旅馆: {
    name: "旅馆", width: 22, depth: 16, floor: 0x7a5a3a, wall: 0x5e4326,
    decorate(it) {
      // 前台
      it._furniture(8, 1.1, 1.2, 0, -it.depth / 2 + 2.5, 0x4a3018, 4.5);
      // 沙发休息区
      for (const [sx, sz] of [[-6, 3], [-6, 0], [6, 3], [6, 0]]) {
        it._furniture(2.2, 0.7, 1, sx, sz, 0x7a3a3a, 1.4);
      }
      // 茶几
      it._furniture(1.4, 0.5, 1.4, -6, 1.5, 0x5e4020, 0.9);
      it._furniture(1.4, 0.5, 1.4, 6, 1.5, 0x5e4020, 0.9);
      // 楼梯间意象（后墙装饰）
      it._furniture(3, 2.4, 0.4, it.width / 2 - 2.4, -it.depth / 2 + 1, 0x4a3620);
      // 掌柜 + 住客（减少人数避免拥挤）
      it.addPatron(0, -it.depth / 2 + 3.6, { shirt: 0x8a6a3a }); // 掌柜
      it.addPatron(-6, 1.5, { shirt: 0x5a5a6a });
      it.addPatron(6, 1.5, { shirt: 0x3a5a7a });
      it.addPatron(-5, -3, { shirt: 0x6a5a3a });
    },
  },
  赌场: {
    name: "赌场", width: 20, depth: 14, floor: 0x3a5a4a, wall: 0x2a3a30,
    decorFlag: { ledgerTaken: false },
    decorate(it) {
      // 老虎机一排（左墙 4 台，各自可交互）
      for (let i = 0; i < 4; i++) {
        const sz = -it.depth / 2 + 2 + i * 2.6;
        const sx = -it.width / 2 + 1.3;
        // 机身
        it._furniture(1, 1.7, 0.8, sx, sz, 0x8a2a3a, 0.9);
        // 屏幕（发光）
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.6, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x30c060, emissiveIntensity: 0.7, roughness: 0.3 })
        );
        screen.position.set(it.origin.x + sx, 1.5, it.origin.z + sz + 0.42);
        it.group.add(screen);
        // 拉杆
        const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), mat(0xd8a84a, 0.4));
        lever.position.set(it.origin.x + sx + 0.5, 1.7, it.origin.z + sz);
        it.group.add(lever);
        it._interact("slot", sx + 1.2, sz);
      }
      // 百家乐赌桌（中间偏右，绿呢大桌 + 椅子）
      const tx = 3, tz = 0.5;
      it._furniture(4.5, 1, 2.2, tx, tz, 0x1a6a3a, 2.8);
      it._furniture(4.1, 0.12, 1.8, tx, tz, 0x2a8a4a);
      for (const cx of [tx - 1.6, tx, tx + 1.6]) {
        it._furniture(0.6, 0.55, 0.6, cx, tz + 2, 0x4a3620, 0.6);
      }
      it._interact("baccarat", tx, tz + 2.6);
      // 小吧台（右后角） — 把账本模型放吧台上，交互区放在吧台前缘
      const barX = it.width / 2 - 2.5, barZ = -it.depth / 2 + 2;
      it._furniture(4, 1.1, 1.2, barX, barZ, 0x4a3018, 2.5);
      // 交互区域放在吧台前缘（z + 4.5，确保在 2.5 碰撞半径 + 玩家半径外）
      const ledgerInteractZ = barZ + 4.5;
      it._interact("ledger", barX, ledgerInteractZ);
      // 3D 账本模型放在吧台表面（z = barZ 中心偏前，看上去在桌上）
      const ledgerVisPos = { x: barX, z: barZ + 0.6 };
      // 账房先生 + 赌客
      it.addPatron(it.width / 2 - 2.5, -it.depth / 2 + 3.2, { shirt: 0x2a2a2a, hat: 0x101010 });
      it.addPatron(3, 3.2, { shirt: 0x8a8a3a });
      it.addPatron(-3, 1, { shirt: 0x6a5a3a });
      it.addPatron(0, -2, { shirt: 0x5a5a6a });
      // 账本（吧台桌面上可见，可拾取）：3D 模型 + 交互区域（放在吧台前缘）
      // 可见的账本 3D 模型（红色封皮发光书，容易发现）
      const ledgerBook = new THREE.Group();
      const bookCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.1, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.6, emissive: 0x330000, emissiveIntensity: 0.5 })
      );
      bookCover.position.y = 0.05;
      ledgerBook.add(bookCover);
      const bookPages = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.02, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.7 })
      );
      bookPages.position.y = 0.1;
      ledgerBook.add(bookPages);
      // 发光标记环
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.55, 32),
        new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.08;
      ledgerBook.add(glowRing);
      // 存引用以便拾取后隐藏
      it._ledgerMesh = ledgerBook;
      ledgerBook.position.set(it.origin.x + ledgerVisPos.x, 1.1, it.origin.z + ledgerVisPos.z);
      it.group.add(ledgerBook);
    },
  },
  教堂: {
    name: "教堂", width: 14, depth: 16, floor: 0x9a8a6a, wall: 0xd9c9a0,
    decorate(it) {
      // 祭坛 + 十字架
      it._furniture(3, 1.2, 1.2, 0, -it.depth / 2 + 1.6, 0xc8b890, 1.8);
      const crossMat = mat(0xd8a84a, 0.5);
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), crossMat);
      cv.position.set(it.origin.x, 3.4, it.origin.z - it.depth / 2 + 1.2);
      it.group.add(cv);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.2), crossMat);
      ch.position.set(it.origin.x, 3.7, it.origin.z - it.depth / 2 + 1.2);
      it.group.add(ch);
      // 长椅两列
      for (const px of [-3, 3]) {
        for (let i = 0; i < 3; i++) {
          it._furniture(3.4, 0.6, 0.8, px, -1.5 + i * 2.6, 0x6b4a2b, 2);
        }
      }
      it.addPatron(0, -it.depth / 2 + 3.2, { shirt: 0x2a2a2a }); // 牧师
      it.addPatron(-3, 0.5, { shirt: 0x5a5a6a });
    },
  },
  枪械店: {
    name: "枪械店", width: 14, depth: 12, floor: 0x6a5a4a, wall: 0x3a3a3a,
    decorate(it) {
      // 枪架（后墙三条）
      for (let i = 0; i < 3; i++) {
        it._furniture(8, 0.3, 0.3, 0, -it.depth / 2 + 1 + i * 0, 0x4a3018);
      }
      it._furniture(8, 2, 0.4, 0, -it.depth / 2 + 0.8, 0x3a2a1a);
      // 柜台
      it._furniture(6, 1.1, 1.2, 0, -it.depth / 2 + 2.6, 0x4a3620, 3.5);
      it.addPatron(0, -it.depth / 2 + 3.6, { shirt: 0x3a3a3a });
      it.addPatron(2, 2, { shirt: 0x5a5a6a });
    },
  },
  餐馆: {
    name: "餐馆", width: 15, depth: 13, floor: 0x8a6438, wall: 0x7a5a3a,
    decorate(it) {
      // 餐台 + 餐桌
      it._furniture(6, 1.1, 1.2, 0, -it.depth / 2 + 2.4, 0x5e4020, 3.5);
      for (const [tx, tz] of [[-4, 2.5], [4, 2], [-3, -1], [3, -2]]) {
        it._furniture(1.6, 0.9, 1.6, tx, tz, 0x6b4a2b, 1);
      }
      it.addPatron(0, -it.depth / 2 + 3.4, { shirt: 0xdedede }); // 厨子
      it.addPatron(-4, 3.4, { shirt: 0x8a8a3a });
      it.addPatron(3, -1, { female: true });
    },
  },
  裁缝铺: {
    name: "裁缝铺", width: 13, depth: 12, floor: 0x7a5a4a, wall: 0x6b5230,
    decorate(it) {
      // 人台（假人模特）
      for (const [mx, mz] of [[-3, -1], [0, -2], [3, -1]]) {
        it._furniture(0.5, 1.5, 0.5, mx, mz, 0xc8a878, 0.5);
      }
      // 布料架（两侧墙）
      for (const sx of [-it.width / 2 + 1, it.width / 2 - 1]) {
        it._furniture(1, 1.8, it.depth - 5, sx, 0, 0x8a4a5a, 0.9);
      }
      it._furniture(4, 1, 1.2, 0, -it.depth / 2 + 2.4, 0x5e4020, 2.5);
      it.addPatron(0, -it.depth / 2 + 3.4, { female: true }); // 裁缝
      it.addPatron(2, 2, { female: true });
    },
  },
  邮局: {
    name: "邮局", width: 14, depth: 12, floor: 0x8a7a5a, wall: 0x6a5a40,
    decorate(it) {
      // 信件格（后墙）
      it._furniture(8, 2.2, 0.5, 0, -it.depth / 2 + 1, 0x5a4a2a);
      // 柜台
      it._furniture(6, 1.1, 1.2, 0, -it.depth / 2 + 2.6, 0x4a3620, 3.5);
      // 包裹堆
      it._furniture(1.2, 0.8, 1.2, -4, 2, 0x9a7a4a, 0.8);
      it._furniture(1, 0.6, 1, 4, 2.5, 0x8a6a3a, 0.7);
      it.addPatron(0, -it.depth / 2 + 3.6, { shirt: 0x3a5a7a }); // 局长
      it.addPatron(-2, 1, { shirt: 0x6a5a3a });
    },
  },
  理发店: {
    name: "理发店", width: 12, depth: 11, floor: 0x7a6a5a, wall: 0x5a4a5a,
    decorate(it) {
      // 理发椅 + 镜面
      for (const cx of [-2.5, 2.5]) {
        it._furniture(0.9, 0.8, 0.9, cx, 0, 0x8a3a4a, 0.9);
        it._furniture(0.9, 1.6, 0.15, cx, -2.2, 0xaac8d0);
      }
      it._furniture(3, 1, 1, 0, -it.depth / 2 + 2.2, 0x4a3620, 2);
      it.addPatron(0, -it.depth / 2 + 3, { shirt: 0xdedede }); // 理发师
      it.addPatron(2.5, 1.2, { shirt: 0x5a5a6a });
    },
  },
  铁匠铺: {
    name: "铁匠铺", width: 14, depth: 12, floor: 0x4a4038, wall: 0x4a3a30,
    decorate(it) {
      // 锻炉（后墙，发光）
      it._furniture(3, 1.8, 1.4, -2, -it.depth / 2 + 1.5, 0x3a2a20, 2);
      const forge = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff5a10, emissiveIntensity: 1.1, roughness: 0.6 })
      );
      forge.position.set(it.origin.x - 2, 1.6, it.origin.z - it.depth / 2 + 1.2);
      it.group.add(forge);
      // 铁砧
      it._furniture(1.2, 0.9, 0.5, 1, -1, 0x5a5a62, 1);
      // 工具架
      it._furniture(0.4, 2, 5, it.width / 2 - 1, 0, 0x4a3018, 1);
      it.addPatron(1, 0.2, { shirt: 0x4a3a30 }); // 铁匠
      it.addPatron(-3, 2, { shirt: 0x5a5a6a });
    },
  },
  马厩: {
    name: "马厩", width: 18, depth: 14, floor: 0x8a743a, wall: 0x5e4326,
    decorate(it) {
      // 马位隔间（后墙一排）
      for (let i = 0; i < 4; i++) {
        const sx = -it.width / 2 + 2.4 + i * 4.2;
        it._furniture(0.25, 1.4, 3, sx + 2, -it.depth / 2 + 2.4, 0x4a3018, 1.5);
      }
      it._furniture(it.width - 3, 1.2, 0.25, 0, -it.depth / 2 + 1, 0x4a3018);
      // 草垛
      it._furniture(2, 1.2, 2, it.width / 2 - 2.5, 3.5, 0xb89a4a, 1.4);
      it._furniture(1.6, 1, 1.6, it.width / 2 - 4.8, 4, 0xb89a4a, 1.1);
      // 水槽
      it._furniture(3, 0.6, 0.8, -3, 3, 0x4a5a6a, 1.8);
      it.addPatron(0, -it.depth / 2 + 4, { shirt: 0x6a5a3a }); // 马夫
      it.addPatron(4, 2, { shirt: 0x5a5a6a });
    },
  },
  报社: {
    name: "报社", width: 14, depth: 12, floor: 0x7a6a55, wall: 0x5a5040,
    decorate(it) {
      // 排字桌 + 稿纸堆
      for (const [dx, dz] of [[-3, -1], [1, -1.5], [4, 0.5]]) {
        it._furniture(2, 0.9, 1.2, dx, dz, 0x5e4020, 1.4);
        it._furniture(0.6, 0.3, 0.8, dx + 0.4, dz, 0xe8e0d0);
      }
      // 印刷机（后墙）
      it._furniture(2.5, 1.8, 1.2, -1, -it.depth / 2 + 1.4, 0x3a3a3a, 1.8);
      it.addPatron(-1, -it.depth / 2 + 3.4, { shirt: 0x2a3a55 }); // 主编
      it.addPatron(3, 1.8, { shirt: 0x5a5a6a });
    },
  },
  医馆: {
    name: "医馆", width: 13, depth: 12, floor: 0xc8c0b0, wall: 0xb8a890,
    decorate(it) {
      // 病床两张
      for (const bx of [-3, 2]) {
        it._furniture(1.4, 0.6, 2.6, bx, -1, 0xd8d0c0, 1.3);
      }
      // 药柜
      it._furniture(2.4, 2, 0.6, it.width / 2 - 1.5, -it.depth / 2 + 1, 0x8a7a5a, 1.4);
      // 诊疗台
      it._furniture(2, 0.9, 1.2, 0, -it.depth / 2 + 2.6, 0x9a8a70, 1.6);
      it.addPatron(0, -it.depth / 2 + 3.6, { shirt: 0xdedede }); // 医生
      it.addPatron(-3, 0.6, { female: true });
    },
  },
  帮派驻地: {
    name: "帮派驻地", width: 19, depth: 15, floor: 0x6b4a2b, wall: 0x4a3620,
    decorate(it) {
      // 大门正对的一张长桌：帮派议事 / 收账的台面
      it._furniture(6, 0.9, 1.6, 0, -it.depth / 2 + 3.2, 0x3a2a18, 3.2);
      it._furniture(6, 0.12, 0.5, 0, -it.depth / 2 + 2.4, 0x5e4020);
      // 头目桌（右后角）：更像"坐镇"的地方
      it._furniture(2.6, 1.1, 1.4, it.width / 2 - 2.4, -it.depth / 2 + 2, 0x3a2620, 1.6);
      it._furniture(1.6, 0.5, 0.5, it.width / 2 - 2.4, -it.depth / 2 + 1.3, 0x7a5a2a);
      // 酒桶墙架（左墙）
      for (let i = 0; i < 4; i++) {
        it._furniture(1, 1.3, 1, -it.width / 2 + 1.3, -it.depth / 2 + 2.2 + i * 2.6, 0x6b4a2b, 0.8);
      }
      // 火炉/壁炉（后墙中间，暖光氛围）
      it._furniture(2.2, 2.4, 0.6, 0, -it.depth / 2 + 1.2, 0x4a4038, 1.4);
      // 藏钱柜（右前角，金锁发光 = 可摸的驻地金库）
      it._furniture(1.8, 1.6, 0.9, it.width / 2 - 1.4, it.depth / 2 - 1.6, 0x3a2a18, 1.1);
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.28),
        new THREE.MeshStandardMaterial({
          color: 0xffce54, emissive: 0xffb830, emissiveIntensity: 0.9,
          metalness: 0.6, roughness: 0.3,
        })
      );
      marker.position.set(it.origin.x + it.width / 2 - 1.4, 1.9, it.origin.z + it.depth / 2 - 1.6);
      it.group.add(marker);
      it.stashMarker = marker;
      it.stashLocal = { x: it.width / 2 - 1.4, z: it.depth / 2 - 1.6 };
      // 站岗的帮派成员（气氛）：两个打手 + 一个账房
      it.addPatron(0, -it.depth / 2 + 4.4, { shirt: 0x3a2a4a, hat: 0x1a1a22 }); // 坐镇头目
      it.addPatron(-3, 2.5, { shirt: 0x4a2a2a });   // 打手
      it.addPatron(3.5, 3, { shirt: 0x2a3a2a });    // 打手
      it.addPatron(-4, -1.5, { female: true, shirt: 0x6a4a5a }); // 账房/记账
    },
  },
};

// 玩家房产的室内布局（购买后可进入；无 NPC，是玩家自己的家）
const HOME_DEF = {
  name: "我的家", width: 15, depth: 13, floor: 0x8a6438, wall: 0x6b5230,
  decorate(it) {
    // 床
    it._furniture(2.4, 0.7, 3.4, -it.width / 2 + 2, -it.depth / 2 + 3, 0x7a4a3a, 2);
    // 餐桌 + 壁炉
    it._furniture(2.6, 1, 1.6, 2, 1, 0x5e4020, 1.6);
    it._furniture(2.4, 2.6, 0.5, it.width / 2 - 1, -it.depth / 2 + 1, 0x4a4038, 1.4);
    // 保险箱（存钱意象）
    it._furniture(1.2, 1.2, 1, it.width / 2 - 2, 3, 0xbcae7a, 0.8);
  },
};

// NPC 民居的室内布局：沿墙床铺（最多 3 张，对应一户最多 3 口）、壁炉、餐桌、
// 后墙藏物柜（顶部有发光的金色锁扣作为行窃目标标记）。
function makeNpcHomeDef() {
  return {
    name: "民居", width: 13, depth: 11, floor: 0x8a6438, wall: 0x6b5230,
    decorate(it) {
      // 三张床沿左墙排开
      it.bedSpots = [];
      for (let i = 0; i < 3; i++) {
        const bz = -it.depth / 2 + 2.2 + i * 3;
        it._furniture(1.3, 0.5, 2.3, -it.width / 2 + 1.2, bz, 0x7a4a3a, 1.1);
        // 枕头（亮布色）
        it._furniture(1, 0.16, 0.5, -it.width / 2 + 1.2, bz - 0.75, 0xe8dcc0);
        it.bedSpots.push({ x: it.origin.x - it.width / 2 + 1.2, z: it.origin.z + bz });
      }
      // 壁炉（右后角）
      it._furniture(2, 2.2, 0.6, it.width / 2 - 0.9, -it.depth / 2 + 1.2, 0x4a4038, 1.3);
      // 餐桌 + 两把椅子（中间偏右）
      it._furniture(2, 0.85, 1.3, 1.6, 1.2, 0x5e4020, 1.3);
      it._furniture(0.6, 0.5, 0.6, 0.4, 1.2, 0x4a3620, 0.6);
      it._furniture(0.6, 0.5, 0.6, 2.8, 1.2, 0x4a3620, 0.6);
      // 藏物柜（后墙中间）+ 发光金锁标记
      it._furniture(1.6, 1.5, 0.8, 0, -it.depth / 2 + 1.2, 0x4a3620, 1.1);
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.26, 0.26),
        new THREE.MeshStandardMaterial({
          color: 0xffce54, emissive: 0xffb830, emissiveIntensity: 0.9,
          metalness: 0.6, roughness: 0.3,
        })
      );
      marker.position.set(it.origin.x, 1.8, it.origin.z - it.depth / 2 + 1.2);
      it.group.add(marker);
      it.stashMarker = marker;
      it.stashLocal = { x: 0, z: -it.depth / 2 + 1.2 };
      // 叙事信件 3D 模型（放在藏物柜顶部，与账本类似的可见物件）
      const letterGroup = new THREE.Group();
      const envelopeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.06, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.55, metalness: 0.03 })
      );
      letterGroup.add(envelopeBody);
      // 红色蜡封
      const waxSeal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.025, 16),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3, emissive: 0x220000, emissiveIntensity: 0.4 })
      );
      waxSeal.position.y = 0.043;
      letterGroup.add(waxSeal);
      // 金色发光指示环
      const stashGlowRing = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      stashGlowRing.rotation.x = -Math.PI / 2;
      stashGlowRing.position.y = 0.035;
      letterGroup.add(stashGlowRing);
      letterGroup.position.set(it.origin.x, 1.55, it.origin.z - it.depth / 2 + 1.2);
      it.group.add(letterGroup);
      it._stashLetter = letterGroup;
    },
  };
}

export class Interiors {
  constructor(scene) {
    this.scene = scene;
    this.rooms = new Map(); // name -> Interior
    this.time = 0;
    this.active = null;      // 当前所在房间
    // 逐个放在远离室外的偏移带，彼此错开
    let ox = 1000;
    for (const key of Object.keys(INTERIOR_DEFS)) {
      const room = new Interior(scene, INTERIOR_DEFS[key], { x: ox, z: 1000 });
      this.rooms.set(key, room);
      ox += 60;
    }
    this._nextOx = ox;
  }

  // 玩家买下房产后，为其创建一间可进入的家（懒加载，按房产 id 命名房间）
  addHomeRoom(id, displayName) {
    if (this.rooms.has(id)) return;
    const def = { ...HOME_DEF, name: displayName || HOME_DEF.name };
    const room = new Interior(this.scene, def, { x: this._nextOx, z: 1000 });
    this.rooms.set(id, room);
    this._nextOx += 60;
  }

  // 为 NPC 民居创建室内房间，并把关键点位回填到 home 对象
  addNpcHomeRoom(home) {
    if (this.rooms.has(home.interiorName)) return;
    const room = new Interior(this.scene, makeNpcHomeDef(), { x: this._nextOx, z: 1000 });
    this._nextOx += 60;
    this.rooms.set(home.interiorName, room);
    room.homeRef = home;
    home.exitPoint = room.exit;
    home.stashPoint = { x: room.origin.x + room.stashLocal.x, z: room.origin.z + room.stashLocal.z };
    home.stashMarker = room.stashMarker;
    home.bedSpots = room.bedSpots;
  }

  // 注入室内闲聊语料来源（传闻语料 + 报纸头条提供函数）
  setChatter(rumorPool, headlineFn) {
    chatter.rumorPool = rumorPool || [];
    chatter.headlineFn = headlineFn || null;
  }

  has(name) {
    return this.rooms.has(name);
  }

  get(name) {
    return this.rooms.get(name);
  }

  // 进入某房间：显示房间，返回入口世界坐标（门内侧）
  enter(name, isBackDoor) {
    const room = this.rooms.get(name);
    if (!room) return null;
    if (this.active && this.active !== room) this.active.group.visible = false;
    room.group.visible = true;
    this.active = room;
    // 后门入口：从房间后墙进入
    if (isBackDoor && room.hasBackDoor) {
      return { x: room.backDoorExit.x, z: room.backDoorExit.z + 2.5, room };
    }
    return { x: room.exit.x, z: room.exit.z - 2.5, room };
  }

  // 离开当前房间
  leave() {
    if (this.active) this.active.group.visible = false;
    const left = this.active;
    this.active = null;
    return left;
  }

  update(dt) {
    this.time += dt;
    if (this.active) {
      this.active.update(dt, this.time);
      // 藏物标记旋转漂浮，吸引行窃目标
      const m = this.active.stashMarker;
      if (m && m.visible) {
        m.rotation.y += dt * 2;
        m.position.y = 1.8 + Math.sin(this.time * 2.5) * 0.08;
      }
    }
  }
}
