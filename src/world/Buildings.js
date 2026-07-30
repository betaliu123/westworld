// Buildings.js — 程序化西部建筑构造器。返回带有名称与包围盒的 THREE.Group。
// 细节：木板纹理、假门面、烟囱（可选）、门框台阶、窗框、招牌。

import * as THREE from "three";
import { randRange, pick } from "../core/MathUtils.js";

const woodTones = [0x7a5230, 0x6b4a2b, 0x8a6438, 0x5e4020, 0x936b40];
const roofTones = [0x8a3a2a, 0x6b3020, 0x5a4636, 0x3a4a5a];

// 木板纹理（模块级缓存一份，所有建筑共用）
let _plankTex = null;
function plankTexture() {
  if (_plankTex) return _plankTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 128, 128);
  // 竖板缝 + 板面轻微色差 + 钉眼
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = "rgba(60,40,20,0.35)";
    ctx.fillRect(x, 0, 2, 128);
    ctx.fillStyle = "rgba(120,90,60,0.08)";
    ctx.fillRect(x + 2, 0, 14, 128);
    for (let y = 8; y < 128; y += 32) {
      ctx.fillStyle = "rgba(50,35,18,0.5)";
      ctx.beginPath();
      ctx.arc(x + 8, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  _plankTex = new THREE.CanvasTexture(c);
  _plankTex.wrapS = _plankTex.wrapT = THREE.RepeatWrapping;
  _plankTex.repeat.set(2, 2);
  return _plankTex;
}

function mat(color, rough = 0.9, useTex = true) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
  if (useTex) m.map = plankTexture();
  return m;
}

function box(w, h, d, color, rough) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// 招牌文字贴图（可定制底色/字色，重要场所招牌一眼可辨）
function makeSign(text, bg = "#2b1c10", fg = "#f3d9a6") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = fg;
  ctx.font = "bold 30px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(6, 1.5);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}

/**
 * 建一栋西部建筑。
 * @param {object} opts { name, width, depth, height, sign, hasPorch, chimney }
 */
export function createBuilding(opts) {
  const g = new THREE.Group();
  const width = opts.width;
  const depth = opts.depth;
  const height = opts.height;
  const wood = opts.wall ?? pick(woodTones);
  const roofColor = opts.roof ?? pick(roofTones);

  // 主体
  const body = box(width, height, depth, wood, 0.92);
  body.position.y = height / 2;
  g.add(body);

  // 正面立面（略高，做出西部特有的假门面 false front）
  const facadeH = height + randRange(1, 2.4);
  const facade = box(width + 0.1, facadeH, 0.4, wood, 0.9);
  facade.position.set(0, facadeH / 2, depth / 2 + 0.1);
  g.add(facade);

  // 斜屋顶
  const roof = box(width + 0.6, 0.4, depth + 0.6, roofColor, 0.8);
  roof.position.y = height + 0.2;
  roof.rotation.x = -0.06;
  g.add(roof);

  // 烟囱（民居感，可选）
  if (opts.chimney) {
    const chimney = box(0.7, 1.6, 0.7, 0x6a4a3a, 0.95);
    chimney.position.set(width / 2 - 1.1, height + 0.9, -depth / 2 + 1.2);
    g.add(chimney);
    const chimneyTop = box(0.9, 0.25, 0.9, 0x4a3028, 0.9);
    chimneyTop.position.set(width / 2 - 1.1, height + 1.7, -depth / 2 + 1.2);
    g.add(chimneyTop);
  }

  // 门 + 门框 + 门前台阶（同样要露出假门面前表面 0.3）
  const door = box(1.4, 2.4, 0.2, 0x3a2614, 0.7);
  door.position.set(0, 1.2, depth / 2 + 0.34);
  g.add(door);
  // 门框（浅色描边）
  const frameMat = mat(0xd9c9a0, 0.85, false);
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.24), frameMat);
    jamb.position.set(side * 0.77, 1.25, depth / 2 + 0.36);
    g.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.24), frameMat);
  lintel.position.set(0, 2.53, depth / 2 + 0.36);
  g.add(lintel);
  const step = box(1.8, 0.16, 0.7, 0x8a7350, 0.9);
  step.position.set(0, 0.08, depth / 2 + 0.55);
  g.add(step);

  // 窗户（发光，夜晚有生活感）+ 窗框
  // 注意：假门面前表面在 depth/2 + 0.3，窗户组件必须在其外（>0.3）否则被墙板挡住
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x223,
    emissive: 0xffcf7a,
    emissiveIntensity: 0.0,
    roughness: 0.4,
  });
  const windows = [];
  const winCount = Math.max(2, Math.floor(width / 2.4));
  for (let i = 0; i < winCount; i++) {
    // 窗框（略大的深色底框）
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.36, 0.1), mat(0x3a2814, 0.85, false));
    const spread = width - 1.6;
    const wx = winCount === 1 ? 0 : -spread / 2 + (spread / (winCount - 1)) * i;
    frame.position.set(wx, height * 0.62, depth / 2 + 0.32);
    g.add(frame);
    // 十字窗棂
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.06), mat(0x3a2814, 0.85, false));
    mullionV.position.set(wx, height * 0.62, depth / 2 + 0.38);
    g.add(mullionV);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.06), mat(0x3a2814, 0.85, false));
    mullionH.position.set(wx, height * 0.62, depth / 2 + 0.38);
    g.add(mullionH);

    const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.15), winMat.clone());
    win.position.set(wx, height * 0.62, depth / 2 + 0.35);
    g.add(win);
    windows.push(win);
  }
  g.userData.windows = windows;

  // 门廊（雨棚 + 立柱）
  if (opts.hasPorch !== false) {
    const awning = box(width + 0.6, 0.2, 2.4, 0x5a3d22, 0.8);
    awning.position.set(0, 2.8, depth / 2 + 1.2);
    awning.rotation.x = 0.05;
    g.add(awning);
    for (const px of [-width / 2 + 0.3, width / 2 - 0.3]) {
      const post = box(0.22, 2.8, 0.22, 0x4a3018, 0.8);
      post.position.set(px, 1.4, depth / 2 + 2.2);
      g.add(post);
    }
    // 门廊地板
    const porchFloor = box(width + 0.6, 0.15, 2.6, 0x6b4a2b, 0.9);
    porchFloor.position.set(0, 0.08, depth / 2 + 1.3);
    g.add(porchFloor);
  }

  // 招牌（重要场所可定制配色）
  if (opts.sign) {
    const sign = makeSign(opts.sign, opts.signBg, opts.signFg);
    sign.position.set(0, height + 0.6, depth / 2 + 0.35);
    g.add(sign);
  }

  // ---- 重要场所外观差异化 ----
  if (opts.extra === "steeple") {
    // 教堂尖塔 + 十字架
    const tower = box(1.8, height * 0.9, 1.8, wood, 0.9);
    tower.position.set(0, height + height * 0.45 - 0.2, depth / 2 - 0.8);
    g.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 4), mat(roofColor, 0.8, false));
    spire.position.set(0, height + height * 0.9 + 0.9, depth / 2 - 0.8);
    spire.rotation.y = Math.PI / 4;
    g.add(spire);
    const crossMat = mat(0xd8a84a, 0.5, false);
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), crossMat);
    cv.position.set(0, height + height * 0.9 + 2.4, depth / 2 - 0.8);
    g.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.12), crossMat);
    ch.position.set(0, height + height * 0.9 + 2.55, depth / 2 - 0.8);
    g.add(ch);
  } else if (opts.extra === "columns") {
    // 银行门柱（石色圆柱）
    const colMat = mat(0xc8c0b0, 0.7, false);
    for (const px of [-width / 2 + 1, -width / 6, width / 6, width / 2 - 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.4, 10), colMat);
      col.position.set(px, 1.7, depth / 2 + 1.6);
      col.castShadow = true;
      g.add(col);
    }
    const beam = box(width + 0.4, 0.3, 0.5, 0xc8c0b0, 0.7);
    beam.position.set(0, 3.5, depth / 2 + 1.6);
    g.add(beam);
  } else if (opts.extra === "badge") {
    // 警长办公室金星警徽
    const badge = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 0.75, roughness: 0.3, emissive: 0x3a2a00 })
    );
    badge.position.set(0, height * 0.75, depth / 2 + 0.5);
    badge.scale.y = 1.3;
    g.add(badge);
  } else if (opts.extra === "cross") {
    // 医馆红十字
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xc03a2a, roughness: 0.5, emissive: 0x300a06 });
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.12), crossMat);
    cv.position.set(0, height * 0.72, depth / 2 + 0.45);
    g.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.12), crossMat);
    ch.position.set(0, height * 0.72, depth / 2 + 0.45);
    g.add(ch);
  }

  g.userData.name = opts.name || "building";
  // 碰撞盒（含门廊前伸）
  g.userData.collider = {
    halfW: width / 2 + 0.2,
    halfD: depth / 2 + 0.2,
  };
  return g;
}
