// Town.js — 装配整座小镇：地面、主街、建筑、道具、兴趣点、碰撞体集合。

import * as THREE from "three";
import { createBuilding } from "./Buildings.js";
import {
  createCactus, createBarrel, createWaterTower, createHitchPost,
  createStreetLamp, createTumbleweed, createFence,
} from "./Props.js";
import { randRange, randInt, pick } from "../core/MathUtils.js";
import { BUILDING_DEFS, PROPERTIES, PLACE_CLASSIFY, WORLD, FILLER_BUILDINGS } from "../config/gameData.js";
import { buildHomes } from "./Homes.js";
import { State } from "../systems/AIBrain.js";

export class Town {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.colliders = [];       // { x, z, halfW, halfD }  矩形
    this.circleColliders = []; // { x, z, r }
    this.interestPoints = [];  // { name, x, z }  NPC 目的地
    this.lamps = [];
    this.windows = [];
    this.tumbleweeds = [];
    this.doors = [];           // 可进入建筑的门：{ name, x, z }
    this.landmarks = [];       // 供小地图用：{ name, x, z, kind }
    this.properties = [];      // 可就近购买的房产：{ id, name, x, z, price }
    this.bounds = WORLD.townBounds;  // 小镇半径（来自配置）
    this.natureZones = [];     // 自然景观区（公园/湖泊/森林），供小地图标注

    // NPC 日程用的地点池（按类型）
    this.places = { home: [], work: [], saloon: [], plaza: [], shop: [], church: [] };

    this._buildGround();
    this._buildStreet();
    this._buildBuildings();
    this._buildNature();
    this._buildProps();
    this._buildProperties();
    this._buildInterestPoints();
    this._buildPlacePoints();
    // 民居（主街两侧空地），在商铺之后生成以便避让碰撞体
    this.homes = buildHomes(this);
    // 帮派驻地：教堂南侧围合院落（最后生成，避免被别的建筑挤占）
    this.compound = null;
    this._buildCompound();
  }

  /**
   * 帮派驻地：取代邮局、坐镇主街正南的围合院落 + 银行大小的可进入主楼。
   *
   * 为什么取代邮局：邮局是镇上唯一"可有可无"的可进入建筑，帮派占它正合适；
   * 而且原来按教堂南侧偏移、教堂位置随机，偶尔会撞上别的房子（如餐馆）。
   * 现在固定在主街正南、建筑环之外（x=0，z=128）—— 不会与任何随机建筑重叠，
   * 又是从南边进镇第一眼能看见的地标。
   *
   * 院落 = 四面栅栏围出一块空地 + 一栋帮派主楼（可进入）+ 大门留朝北开向主街
   *        + 院子门口一面大旗（黑蹄会辨识）。
   * 小地图用 kind:"compound" 标注，画成小房子图标。
   */
  _buildCompound() {
    // 驻地取代邮局：邮局是镇上唯一"可有可无"的可进入建筑（帮派占它正合适），
    // 已从 BUILDING_DEFS 里顶掉（见 _buildBuildings），不再和餐馆等随机摆放
    // 的建筑抢位置 —— 原来按教堂南侧偏移，教堂位置随机，偶尔会撞上别的房子。
    //
    // 位置：主街正南、建筑环（±core≈±112）之外、南口（z≈+168）之内。
    // 建筑环的 x 是 ±(14+depth/2)≈±18，这里 x=0 在主街上；z=128 在建筑环外，
    // 不会与任何随机建筑重叠，又是从南边进镇第一眼能看见的地标。
    const W = 16, D = 13;
    const ccx = 0;
    const ccz = 128;

    // 小地图标注：小房子图标（kind:"compound"）在结尾统一加

    // 围墙：四面 createFence。栅栏默认沿局部 X 轴，需要旋转到沿 Z 轴的两边用 rotZ=π/2
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const wood = mat(0x5e4020);
    const posts = [];
    const addPost = (x, z) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), wood);
      p.position.set(x, 0.75, z);
      p.castShadow = true;
      this.group.add(p);
      posts.push(p);
    };
    // 四个角柱 + 每边几根立柱，形成围栏骨架（比整段栅栏更好控制开口）
    const NX = Math.floor(W / 2.4), NZ = Math.floor(D / 2.4);
    for (let i = 0; i <= NX; i++) {
      addPost(ccx - W / 2 + (W / NX) * i, ccz - D / 2);
      addPost(ccx - W / 2 + (W / NX) * i, ccz + D / 2);
    }
    for (let j = 0; j <= NZ; j++) {
      // 北面留 4 米大门（朝主街），只围两侧
      if (ccx - W / 2 + (D / NZ) * j < ccx - 2 || ccx - W / 2 + (D / NZ) * j > ccx + 2) {
        addPost(ccx - W / 2, ccz - D / 2 + (D / NZ) * j);
        addPost(ccx + W / 2, ccz - D / 2 + (D / NZ) * j);
      }
    }
    // 横杆（两圈）：北边大门处断开
    const rail = (from, to, y) => {
      const len = Math.hypot(to.x - from.x, to.z - from.z);
      if (len < 0.3) return;
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.09), wood);
      r.position.set((from.x + to.x) / 2, y, (from.z + to.z) / 2);
      r.rotation.y = Math.atan2(to.z - from.z, to.x - from.x);
      r.castShadow = true;
      this.group.add(r);
    };
    const seg = (a, b) => { rail(a, b, 0.5); rail(a, b, 1.0); };
    // 南墙 + 东西墙全段
    seg({ x: ccx - W / 2, z: ccz - D / 2 }, { x: ccx + W / 2, z: ccz - D / 2 });
    seg({ x: ccx - W / 2, z: ccz - D / 2 }, { x: ccx - W / 2, z: ccz + D / 2 });
    seg({ x: ccx + W / 2, z: ccz - D / 2 }, { x: ccx + W / 2, z: ccz + D / 2 });
    // 北墙：留 4 米大门
    seg({ x: ccx - W / 2, z: ccz + D / 2 }, { x: ccx - 2, z: ccz + D / 2 });
    seg({ x: ccx + 2, z: ccz + D / 2 }, { x: ccx + W / 2, z: ccz + D / 2 });

    // 院落碰撞体：四边围墙，但大门处断开（北边中间 4 米不阻挡）
    const wallT = 0.4;
    // 标记 compound：_buildInterestPoints 会跳过它们，避免 NPC 生成在驻地墙上卡死
    const tag = (x, z, hw, hd) => {
      this.colliders.push({ x, z, halfW: hw, halfD: hd, compound: true });
    };
    tag(ccx, ccz - D / 2, W / 2 + wallT, wallT);   // 南墙（全段）
    // 北墙分两段，中间留 4 米大门（从 ccx-2 到 ccx+2 是门，不设碰撞）
    tag(ccx - (W / 2 + 2) / 2, ccz + D / 2, (W / 2 - 2) / 2 + wallT, wallT); // 西段
    tag(ccx + (W / 2 + 2) / 2, ccz + D / 2, (W / 2 - 2) / 2 + wallT, wallT); // 东段
    tag(ccx - W / 2, ccz, wallT, D / 2);            // 西墙
    tag(ccx + W / 2, ccz, wallT, D / 2);            // 东墙

    // 院内主楼：帮派驻地（银行大小，可进入）。门朝北（朝大门/主街）。
    // 尺寸与银行同级（12×10×5.5），比原来 8×6 的小房子气派得多。
    const hx = ccx, hz = ccz + D / 2 - 3;
    const hb = createBuilding({
      name: "帮派驻地", sign: "HQ", signBg: "#3a1f10", signFg: "#e8c96a",
      width: 12, depth: 10, height: 5.5, chimney: true, hasPorch: true,
    });
    hb.position.set(hx, 0, hz);
    // 门朝北（+z，朝大院门口/主街）：createBuilding 的门在 +depth/2，不旋转即可
    this.group.add(hb);
    this.colliders.push({ x: hx, z: hz, halfW: 12 / 2 + 0.4, halfD: 10 / 2 + 0.4, compound: true });
    this.windows.push(...(hb.userData.windows || []));

    // 可进入：登记门口（门朝北，朝大街侧），让 InteractionSystem 能选中"进入"
    // 与 _buildBuildings 里 enterable 建筑同一套逻辑：door 名 = 房间名 = 室内 key
    const doorX = hx;
    const doorZ = hz + 10 / 2 + 1.2;   // 门在建筑北侧（+z）
    this.doors.push({ name: "帮派驻地", x: doorX, z: doorZ });
    // 门口金色地垫（可交互提示）
    const matDoor = mat(0xe8c96a);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.8), matDoor);
    pad.position.set(doorX, 0.03, doorZ + 1.2);
    this.group.add(pad);

    // 院子正门口一面大旗：帮派辨识（杆 + 三角红旗 + 深色底）
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 10), mat(0x3a2a1a, 0.8));
    flagPole.position.set(ccx + W / 2 - 1.6, 2.6, ccz + D / 2 + 1.4);
    flagPole.castShadow = true;
    this.group.add(flagPole);
    const flagCloth = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.3, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x8a1f1f, side: THREE.DoubleSide })
    );
    flagCloth.position.set(ccx + W / 2 - 1.6 + 1.2, 4.4, ccz + D / 2 + 1.4);
    this.group.add(flagCloth);
    // 旗上简笔符号（马蹄印 → 黑蹄会的标志）
    const hoofMat = new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.DoubleSide });
    const hoofA = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), hoofMat);
    hoofA.position.set(ccx + W / 2 - 1.6 + 1.05, 4.5, ccz + D / 2 + 1.405);
    this.group.add(hoofA);
    const hoofB = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), hoofMat);
    hoofB.position.set(ccx + W / 2 - 1.6 + 1.4, 4.5, ccz + D / 2 + 1.405);
    this.group.add(hoofB);

    // 供睡觉/复活/小地图使用的驻地信息
    this.compound = {
      x: hx, z: hz,
      centerX: ccx, centerZ: ccz,
      doorX, doorZ: doorZ,                // 屋门（北侧）
      gate: { x: ccx, z: ccz + D / 2 + 1.0 }, // 院落大门（北侧，朝主街）
      gateX: ccx, gateZ: ccz + D / 2 + 1.0,
      width: W, depth: D,
      interiorName: "帮派驻地",           // 可进入的室内房间名
    };

    // 小地图标注：小房子图标（kind:"compound"）
    this.landmarks.push({ name: "帮派驻地", x: hx, z: hz, kind: "compound" });

    // 注册为帮派成员的常去场所（hq）—— 玩家帮派的人会来这儿扎堆。
    // 用一个带 _interior 的入口点：NPC 到门口就进室内（与其它可进入建筑一致）。
    if (!this.places.hq) this.places.hq = [];
    this.places.hq.push({ name: "帮派驻地", x: this.compound.doorX, z: this.compound.doorZ, _interior: "帮派驻地" });
  }

  // 生成可就近购买的房产（大宅），买下后可进入自己的房子（来自配置 PROPERTIES）
  // shopItem 绑定的房产只能在集市买契约；门口统一放金色地垫提示可交互
  _buildProperties() {
    const defs = PROPERTIES;
    for (const d of defs) {
      const b = createBuilding({ name: d.name, sign: "FOR SALE", width: 12, depth: 11, height: 6, chimney: true });
      b.position.set(d.x, 0, d.z);
      this.group.add(b);
      this._addRectCollider(d.x, d.z, 11 / 2 + 0.4, 12 / 2 + 0.4);
      this.windows.push(...(b.userData.windows || []));
      // 门口点（朝镇中心一侧）
      const doorX = d.x < 0 ? d.x + 11 / 2 + 1.4 : d.x - 11 / 2 - 1.4;
      const prop = { ...d, doorX, doorZ: d.z };
      this.properties.push(prop);
      this.landmarks.push({ name: d.name, x: d.x, z: d.z, kind: "property" });
      // 门口金色地垫（提示可交互）
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xffce54, transparent: true, opacity: 0.4 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(doorX, 0.06, d.z);
      this.group.add(pad);
    }
  }

  // 沙地噪点纹理（模块级缓存）
  _groundTexture() {
    if (Town._gtex) return Town._gtex;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#caa16a";
    ctx.fillRect(0, 0, 256, 256);
    // 细沙噪点 + 零星小石子/枯草斑
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const l = Math.random();
      ctx.fillStyle = l < 0.5 ? "rgba(120,88,50,0.18)" : "rgba(240,214,164,0.16)";
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = "rgba(96,70,40,0.35)";
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    Town._gtex = new THREE.CanvasTexture(c);
    Town._gtex.wrapS = Town._gtex.wrapT = THREE.RepeatWrapping;
    Town._gtex.repeat.set(28, 28);
    return Town._gtex;
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(this.bounds * 2 + 40, this.bounds * 2 + 40, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: this._groundTexture() });
    const ground = new THREE.Mesh(geo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // 远处荒漠山峦剪影
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 1 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = this.bounds + randRange(40, 90);
      const h = randRange(10, 34);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(randRange(14, 30), h, 5), ringMat);
      hill.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      hill.rotation.y = randRange(0, Math.PI);
      this.group.add(hill);
    }
  }

  _buildStreet() {
    // 主街：南北向的木板/夯土道
    const roadMat = new THREE.MeshStandardMaterial({ color: 0xa07b4a, roughness: 1 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, this.bounds * 2), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    road.receiveShadow = true;
    this.group.add(road);

    // 横向支路
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(this.bounds * 1.4, 10), roadMat);
    cross.rotation.x = -Math.PI / 2;
    cross.position.y = 0.02;
    cross.receiveShadow = true;
    this.group.add(cross);

    // 木板人行道沿街两侧
    const walkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.95 });
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, this.bounds * 2 - 8), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * 8.6, 0.05, 0);
      walk.receiveShadow = true;
      this.group.add(walk);
    }
  }

  _addRectCollider(x, z, halfW, halfD) {
    this.colliders.push({ x, z, halfW, halfD });
  }

  _buildBuildings() {
    // 每种建筑全镇仅 1 栋：可进入的重要场所先放在镇中心段，其余唯一建筑穿插，
    // 剩余空位用无招牌填充楼补齐。
    // 邮局被帮派驻地取代（_buildCompound 会占它的位置），不在这里生成。
    const important = BUILDING_DEFS.filter((d) => d.enterable && d.name !== "邮局");
    const others = BUILDING_DEFS.filter((d) => !d.enterable);
    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    const queue = [...shuffle(important), ...shuffle(others)];

    // 建筑只占据镇中心区（core），外围留给自然景观
    this.core = Math.round(this.bounds * 0.62); // 建筑分布半径 ≈ 112
    const zTrack = { "-1": -this.core * 0.62, "1": -this.core * 0.62 }; // 重要场所靠中部
    let sideIdx = 0;
    while (zTrack["-1"] < this.core - 10 || zTrack["1"] < this.core - 10) {
      const side = sideIdx % 2 === 0 ? -1 : 1;
      sideIdx++;
      if (zTrack[String(side)] >= this.core - 10) continue;
      const def = queue.length
        ? queue.shift()
        : { name: pick(FILLER_BUILDINGS), sign: null }; // 填充楼无招牌
      const width = def.w ?? randRange(8, 12);
      const depth = randRange(7, 10);
      const height = def.h ?? randRange(4, 6.5);
      const b = createBuilding({ ...def, width, depth, height });
      const x = side * (14 + depth / 2);
      const cz = zTrack[String(side)] + width / 2;
      b.position.set(x, 0, cz);
      // 建筑正面朝向街道：side<0 在左侧，门朝 +x；旋转使门面向街道
      b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.group.add(b);

      // 旋转后包围盒的世界尺寸互换
      this._addRectCollider(x, cz, depth / 2 + 0.4, width / 2 + 0.4);
      this.windows.push(...(b.userData.windows || []));

      const doorX = x < 0 ? x + depth / 2 + 1.2 : x - depth / 2 - 1.2;
      // 可进入建筑：记录门口世界坐标（朝街道一侧）
      if (def.enterable && !this.doors.find((d) => d.name === def.name)) {
        this.doors.push({ name: def.name, x: doorX, z: cz });
        // 警局门口（NPC 跑去报警的目的地）
        if (def.name === "警长办公室") this.sheriffDoor = { x: doorX, z: cz };
      }
      // 后门（酒馆、银行、杂货店、赌场有后门，供逃脱用）
      const hasBackDoor = ["酒馆", "银行", "杂货店", "赌场"].includes(def.name);
      if (hasBackDoor) {
        const backDoorX = x < 0 ? x - depth / 2 - 1.2 : x + depth / 2 + 1.2;
        this.doors.push({ name: `${def.name}后门`, x: backDoorX, z: cz, isBack: true, buildingName: def.name });
        console.log(`[Town] 后门: ${def.name}后门 at (${backDoorX.toFixed(1)}, ${cz.toFixed(1)})`);
      }
      // 小地图地标 + 日程地点归类
      this.landmarks.push({ name: def.name, x, z: cz, kind: def.enterable ? "enterable" : "building" });
      this._classifyPlace(def.name, doorX, cz);

      zTrack[String(side)] += width + randRange(3.5, 6);
    }
    // 兜底：警局门缺失时用警长出生点
    if (!this.sheriffDoor) this.sheriffDoor = { x: 9, z: -6 };
  }

  // 按建筑名把门口点归入日程地点池（分类规则来自配置 PLACE_CLASSIFY）
  _classifyPlace(name, x, z) {
    const p = { name, x, z };
    if (PLACE_CLASSIFY.saloon.includes(name)) this.places.saloon.push(p);
    else if (PLACE_CLASSIFY.church.includes(name)) this.places.church.push(p);
    else if (PLACE_CLASSIFY.shop.includes(name)) this.places.shop.push(p);
    else if (PLACE_CLASSIFY.work.includes(name)) this.places.work.push(p);
  }

  _scatterClear(x, z, minDist = 6) {
    // 主街走廊保持通畅
    if (Math.abs(x) < 8 && Math.abs(z) < this.bounds) return false;
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.halfW + minDist && Math.abs(z - c.z) < c.halfD + minDist) return false;
    }
    return true;
  }

  _buildProps() {
    // 水塔
    const tower = createWaterTower();
    tower.position.set(-30, 0, -34);
    this.group.add(tower);
    this.circleColliders.push({ x: -30, z: -34, r: tower.userData.blockRadius });

    // 路灯沿主街
    for (let z = -this.bounds + 10; z < this.bounds - 10; z += 16) {
      for (const side of [-1, 1]) {
        const lamp = createStreetLamp();
        lamp.position.set(side * 7.2, 0, z);
        this.group.add(lamp);
        this.lamps.push(lamp);
      }
    }

    // 木桶 / 拴马柱 沿人行道
    for (let z = -this.bounds + 16; z < this.bounds - 16; z += randRange(8, 14)) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.5) {
          const barrel = createBarrel();
          barrel.position.set(side * 9.4, 0, z + randRange(-2, 2));
          this.group.add(barrel);
          this.circleColliders.push({ x: barrel.position.x, z: barrel.position.z, r: 0.5 });
        }
        if (Math.random() < 0.4) {
          const hitch = createHitchPost();
          hitch.position.set(side * 10, 0, z + randRange(-3, 3));
          hitch.rotation.y = Math.PI / 2;
          this.group.add(hitch);
        }
      }
    }

    // 仙人掌散布于镇外围
    let placed = 0;
    let attempts = 0;
    while (placed < 60 && attempts < 400) {
      attempts++;
      const x = randRange(-this.bounds, this.bounds);
      const z = randRange(-this.bounds, this.bounds);
      if (!this._scatterClear(x, z, 4)) continue;
      const cactus = createCactus();
      cactus.position.set(x, 0, z);
      cactus.rotation.y = randRange(0, Math.PI * 2);
      this.group.add(cactus);
      this.circleColliders.push({ x, z, r: cactus.userData.blockRadius });
      placed++;
    }

    // 栅栏群（镇边缘牧场感）
    for (let i = 0; i < 4; i++) {
      const fence = createFence(randRange(10, 18));
      const x = randRange(-this.bounds + 8, this.bounds - 8);
      const z = pick([-1, 1]) * randRange(this.bounds - 24, this.bounds - 8);
      if (!this._scatterClear(x, z, 3)) continue;
      fence.position.set(x, 0, z);
      fence.rotation.y = randRange(0, Math.PI);
      this.group.add(fence);
    }

    // 滚草（动态漂移）
    for (let i = 0; i < 5; i++) {
      const weed = createTumbleweed();
      weed.position.set(randRange(-this.bounds, this.bounds), 0, randRange(-this.bounds, this.bounds));
      weed.userData.vx = randRange(-2, 2);
      weed.userData.vz = randRange(1, 3);
      this.group.add(weed);
      this.tumbleweeds.push(weed);
    }

    // 可进入建筑门口的发光地垫（提示可进入）
    for (const door of this.doors) {
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xffce54, transparent: true, opacity: 0.4 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(door.x, 0.06, door.z);
      this.group.add(pad);
    }
  }

  _buildInterestPoints() {
    // NPC 游走目的地：广场、井、店门口等
    const pts = [
      { name: "广场", x: 0, z: 0 },
      { name: "水塔", x: -26, z: -30 },
      { name: "北口", x: 0, z: -this.bounds + 12 },
      // 南口被帮派驻地占了（驻地在 (0,128)，门朝南口）—— 南口不作为 NPC 游走/生成点，
      // 否则 NPC 生成在驻地墙边卡死。
    ];
    // 每栋建筑门口作为兴趣点（跳过帮派驻地的碰撞体）
    for (const c of this.colliders) {
      if (c.compound) continue;   // 驻地围墙/主楼：不生成门口兴趣点
      const towardStreet = c.x < 0 ? c.x + c.halfW + 2 : c.x - c.halfW - 2;
      pts.push({ name: "店门", x: towardStreet, z: c.z });
    }
    this.interestPoints = pts;
  }

  randomInterestPoint() {
    return pick(this.interestPoints);
  }

  // 自然景观：镇外围（core 之外、bounds 之内）布置公园、湖泊、森林
  _buildNature() {
    const matL = (c, r = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

    // 一棵松树（锥形树冠 + 树干）
    const makeTree = (scale = 1) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.36 * scale, 2.4 * scale, 6), matL(0x5a3d22));
      trunk.position.y = 1.2 * scale;
      trunk.castShadow = true;
      g.add(trunk);
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((1.6 - i * 0.4) * scale, 1.8 * scale, 7), matL(0x2f5a32));
        cone.position.y = (2.4 + i * 1.1) * scale;
        cone.castShadow = true;
        g.add(cone);
      }
      return g;
    };

    // 公园：南侧核心外，草地 + 树 + 长椅 + 喷泉
    const parkZ = this.core + 26;
    const park = new THREE.Mesh(new THREE.CircleGeometry(24, 24), matL(0x5a7a3a));
    park.rotation.x = -Math.PI / 2;
    park.position.set(0, 0.03, parkZ);
    park.receiveShadow = true;
    this.group.add(park);
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.8, 16), matL(0x8a8a90, 0.6));
    fountain.position.set(0, 0.4, parkZ);
    this.group.add(fountain);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.85, 16), matL(0x3a6a9a, 0.2));
    water.position.set(0, 0.45, parkZ);
    this.group.add(water);
    this.circleColliders.push({ x: 0, z: parkZ, r: 3 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const t = makeTree(randRange(0.8, 1.2));
      t.position.set(Math.cos(a) * randRange(10, 20), 0, parkZ + Math.sin(a) * randRange(10, 20));
      this.group.add(t);
    }
    this.natureZones.push({ name: "公园", x: 0, z: parkZ, r: 24, kind: "park" });
    this.places.plaza.push({ name: "公园", x: 0, z: parkZ });

    // 湖泊：西北外围
    const lakeX = -this.core - 20;
    const lakeZ = -this.core + 10;
    const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 28), matL(0x2f5f8f, 0.15));
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(lakeX, 0.04, lakeZ);
    this.group.add(lake);
    this.circleColliders.push({ x: lakeX, z: lakeZ, r: 30 }); // 湖水不可穿行
    for (let i = 0; i < 14; i++) {
      const a = randRange(0, Math.PI * 2);
      const r = randRange(32, 44);
      const t = makeTree(randRange(0.9, 1.4));
      t.position.set(lakeX + Math.cos(a) * r, 0, lakeZ + Math.sin(a) * r);
      this.group.add(t);
    }
    this.natureZones.push({ name: "湖泊", x: lakeX, z: lakeZ, r: 30, kind: "lake" });

    // 森林：东北外围，成片树木（人烟稀少）
    const forX = this.core + 24;
    const forZ = -this.core + 6;
    for (let i = 0; i < 70; i++) {
      const x = forX + randRange(-34, 34);
      const z = forZ + randRange(-40, 40);
      const t = makeTree(randRange(0.8, 1.6));
      t.position.set(x, 0, z);
      this.group.add(t);
      if (Math.random() < 0.5) this.circleColliders.push({ x, z, r: 0.6 });
    }
    this.natureZones.push({ name: "森林", x: forX, z: forZ, r: 40, kind: "forest" });

    // 南侧远郊零散树林（人烟稀少的荒野过渡带）
    for (let i = 0; i < 40; i++) {
      const x = randRange(-this.bounds + 10, this.bounds - 10);
      const z = randRange(this.core + 10, this.bounds - 10);
      if (Math.abs(x) < 10) continue; // 留出通往南口的路
      const t = makeTree(randRange(0.7, 1.2));
      t.position.set(x, 0, z);
      this.group.add(t);
    }
  }

  // 生成 NPC 家的坐标池（镇核心两侧的"住宅区"，用远端零散点近似）
  _buildPlacePoints() {
    // 广场中心 + 若干开阔点作为 plaza
    this.places.plaza.push({ name: "广场", x: 0, z: 0 });
    this.places.plaza.push({ name: "十字路口", x: 0, z: -this.core * 0.4 });
    // 家：核心区两侧靠外的住宅带（多个点，NPC 各挑一个固定）
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = randRange(-this.core + 20, this.core - 20);
      this.places.home.push({ name: "住宅", x: side * randRange(26, 40), z });
    }
    // 保底：若某类型为空，用广场兜底，避免日程解析拿到空数组
    for (const key of Object.keys(this.places)) {
      if (this.places[key].length === 0) this.places[key].push({ name: "广场", x: 0, z: 0 });
    }
  }

  // 供 AIBrain 日程解析：按地点类型返回一个坐标；home 指向 NPC 自己民居的门口
  placePoint(type, brain) {
    if (type === "home") {
      // 有真实民居的 NPC 回自己家
      if (brain && brain.home) return { x: brain.home.doorX, z: brain.home.doorZ };
      // 无民居的流民走通用住宅点
      if (brain && !brain.homePoint) {
        brain.homePoint = pick(this.places.home);
      }
      return brain && brain.homePoint ? brain.homePoint : pick(this.places.home);
    }
    // 室外目的地随机散开，避免堵成一团；室内目的地保持门口坐标并带上房间名（供 NPC 进入）
    const pool = this.places[type] || this.places.plaza;
    const pt = pick(pool);
    if (type === "plaza") {
      return { x: pt.x + randRange(-4, 4), z: pt.z + randRange(-4, 4) };
    }
    // 帮派驻地：就那一个点，别散开（都挤在大门口扎堆），进室内
    if (type === "hq") {
      return { x: pt.x, z: pt.z, _interior: pt._interior || pt.name };
    }
    return { x: pt.x, z: pt.z, _interior: pt.name };
  }

  // 供载具/玩家/NPC 共用的碰撞解算：把点从障碍中推出，返回修正后的 {x, z}
  resolveCollision(x, z, radius) {
    let nx = x;
    let nz = z;
    // 矩形障碍
    for (const c of this.colliders) {
      const minX = c.x - c.halfW - radius;
      const maxX = c.x + c.halfW + radius;
      const minZ = c.z - c.halfD - radius;
      const maxZ = c.z + c.halfD + radius;
      if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
        // 推向最近的边
        const dl = nx - minX;
        const dr = maxX - nx;
        const dt = nz - minZ;
        const db = maxZ - nz;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) nx = minX;
        else if (m === dr) nx = maxX;
        else if (m === dt) nz = minZ;
        else nz = maxZ;
      }
    }
    // 圆形障碍
    for (const c of this.circleColliders) {
      if (c.r <= 0) continue;
      const dx = nx - c.x;
      const dz = nz - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.r + radius;
      if (d < minD && d > 0.0001) {
        nx = c.x + (dx / d) * minD;
        nz = c.z + (dz / d) * minD;
      }
    }
    // 世界边界
    const limit = this.bounds + 6;
    nx = Math.max(-limit, Math.min(limit, nx));
    nz = Math.max(-limit, Math.min(limit, nz));
    return { x: nx, z: nz };
  }

  update(dt, isNight) {
    // 灯光昼夜切换（r160 物理光衰减下点光源需要较大强度）
    const target = isNight ? 1 : 0;
    for (const lamp of this.lamps) {
      const g = lamp.userData.lampGlass;
      const l = lamp.userData.lampLight;
      g.emissiveIntensity += (target * 1.2 - g.emissiveIntensity) * Math.min(1, dt * 2);
      l.intensity += (target * 26 - l.intensity) * Math.min(1, dt * 2);
    }
    for (const win of this.windows) {
      // 夜晚部分窗户点亮（用其自身随机相位决定亮不亮）
      if (win.userData.lit === undefined) win.userData.lit = Math.random() < 0.7;
      const t = isNight && win.userData.lit ? 0.9 : 0.0;
      win.material.emissiveIntensity += (t - win.material.emissiveIntensity) * Math.min(1, dt * 1.5);
    }
    // 民居窗户：夜里"有人在家才亮灯"——玩家可据此判断屋内是否有人
    for (const home of this.homes) {
      const occupied = home.occupants.some((o) => o.brain.state === State.AT_HOME);
      const t = isNight && occupied ? 0.85 : 0.0;
      for (const win of home.windows) {
        win.material.emissiveIntensity += (t - win.material.emissiveIntensity) * Math.min(1, dt * 1.5);
      }
    }
    // 滚草漂移
    for (const weed of this.tumbleweeds) {
      weed.position.x += weed.userData.vx * dt;
      weed.position.z += weed.userData.vz * dt;
      weed.children[0].rotation.x += dt * 4;
      weed.children[0].rotation.z += dt * 2;
      if (Math.abs(weed.position.x) > this.bounds || Math.abs(weed.position.z) > this.bounds) {
        weed.position.set(randRange(-this.bounds, this.bounds), 0, -this.bounds);
        weed.userData.vx = randRange(-2, 2);
        weed.userData.vz = randRange(1, 3);
      }
    }
  }
}
