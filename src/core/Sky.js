// Sky.js — 昼夜循环：太阳角度驱动方向光、半球光、雾与背景色。

import * as THREE from "three";
import { clamp, lerp } from "./MathUtils.js";

// 关键时刻的色彩配置（0-24 小时）
const KEYS = [
  { h: 0,  sky: 0x0b1026, fog: 0x0b1026, sun: 0x24304f, sunI: 0.05, hemi: 0.15, amb: 0x1a2038 },
  { h: 5,  sky: 0x2a2540, fog: 0x3a3050, sun: 0x6a5a70, sunI: 0.2,  hemi: 0.3,  amb: 0x33304a },
  { h: 7,  sky: 0xf3a862, fog: 0xf0b57a, sun: 0xffb066, sunI: 0.9,  hemi: 0.6,  amb: 0x8a6a4a },
  { h: 12, sky: 0x8fc4e8, fog: 0xd9e4ec, sun: 0xfff4e0, sunI: 1.35, hemi: 0.95, amb: 0x9ab0c0 },
  { h: 17, sky: 0xa9cbe0, fog: 0xd0dae2, sun: 0xffe6c0, sunI: 1.1,  hemi: 0.8,  amb: 0x8fa0b0 },
  { h: 19, sky: 0xe6884a, fog: 0xd97b52, sun: 0xff7a3c, sunI: 0.8,  hemi: 0.5,  amb: 0x7a5540 },
  { h: 21, sky: 0x2c2b4a, fog: 0x2a2740, sun: 0x40406a, sunI: 0.2,  hemi: 0.3,  amb: 0x2a2a44 },
  { h: 24, sky: 0x0b1026, fog: 0x0b1026, sun: 0x24304f, sunI: 0.05, hemi: 0.15, amb: 0x1a2038 },
];

function sampleColor(hour, key) {
  let a = KEYS[0];
  let b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (hour >= KEYS[i].h && hour <= KEYS[i + 1].h) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  const t = a.h === b.h ? 0 : (hour - a.h) / (b.h - a.h);
  if (key === "sunI" || key === "hemi") return lerp(a[key], b[key], t);
  return new THREE.Color(a[key]).lerp(new THREE.Color(b[key]), t);
}

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.hour = 8;
    this.daySpeed = 0.06; // 小时/秒 → 一天约 400 秒

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x6b5a3a, 0.9);
    scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 220;
    const s = 90;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0004;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.scene.fog = new THREE.Fog(0xd9e4ec, 60, 340);

    // 太阳/月亮视觉体
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2d0, fog: false });
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), sunMat);
    scene.add(this.sunDisc);

    // 月亮（夜间，远山之外避免显得过大）
    this.moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(9, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xdfe6f2, fog: false })
    );
    scene.add(this.moonDisc);

    // 星空（夜间可见的点精灵）
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // 上半球随机分布
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI * 0.45 + 0.06; // 仰角
      const r = 420;
      starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      starPos[i * 3 + 1] = Math.sin(e) * r;
      starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xcfd8ff, size: 1.6, sizeAttenuation: false,
      transparent: true, opacity: 0, fog: false, depthWrite: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    scene.add(this.stars);

    this._update(0);
  }

  get isNight() {
    return this.hour < 6 || this.hour > 19.5;
  }

  timeString() {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  _update(dt) {
    this.hour = (this.hour + dt * this.daySpeed) % 24;

    // 太阳沿东西方向的圆弧运动，正午最高
    const dayT = clamp((this.hour - 6) / 12, 0, 1); // 6→18 为白昼
    const angle = dayT * Math.PI; // 0=东, PI=西
    const height = Math.sin(angle);
    const radius = 160;
    this.sun.position.set(
      Math.cos(angle) * radius,
      Math.max(height * 140, -20) + 8,
      Math.sin(angle - 0.6) * 40 + 30
    );
    this.sunDisc.position.copy(this.sun.position).multiplyScalar(0.9);
    this.sunDisc.visible = height > -0.05;

    // 月亮走与太阳相对的弧线（挂在远山之外），星空夜间淡入
    const nightT = this.hour >= 18 ? (this.hour - 18) / 12 : (this.hour + 6) / 12; // 18→次日6
    const mAngle = nightT * Math.PI;
    this.moonDisc.position.set(
      Math.cos(mAngle) * 380,
      Math.max(Math.sin(mAngle) * 260, -40) + 20,
      150
    );
    this.moonDisc.visible = this.isNight;
    const starTarget = this.isNight ? 0.9 : 0;
    this.starMat.opacity += (starTarget - this.starMat.opacity) * 0.02;

    const sunColor = sampleColor(this.hour, "sun");
    const skyColor = sampleColor(this.hour, "sky");
    const fogColor = sampleColor(this.hour, "fog");
    const ambColor = sampleColor(this.hour, "amb");
    this.sun.color.copy(sunColor);
    this.sun.intensity = sampleColor(this.hour, "sunI");
    this.hemi.intensity = sampleColor(this.hour, "hemi");
    this.ambient.color.copy(ambColor);
    this.ambient.intensity = this.isNight ? 0.5 : 0.32;
    this.scene.background = skyColor;
    this.scene.fog.color.copy(fogColor);
    this.sunDisc.material.color.copy(sunColor);
  }

  update(dt, focusTarget) {
    this._update(dt);
    // 让阴影相机跟随玩家，保证近处阴影质量
    if (focusTarget) {
      this.sun.target.position.copy(focusTarget);
      this.sun.position.add(focusTarget.clone().setY(0));
    }
  }
}
