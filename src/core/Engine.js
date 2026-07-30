// Engine.js — 渲染器 / 场景 / 相机 / 时钟 / resize，以及固定步长主循环。

import * as THREE from "three";
import { Input } from "./Input.js";

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );
    this.camera.position.set(0, 6, 12);

    this.clock = new THREE.Clock();
    this.input = new Input(canvas);

    // 固定步长逻辑更新
    this.fixedDt = 1 / 60;
    this.accumulator = 0;
    this.updateCallbacks = [];
    this.lateCallbacks = [];

    window.addEventListener("resize", () => this._onResize());
  }

  onUpdate(cb) {
    this.updateCallbacks.push(cb);
  }

  onLateUpdate(cb) {
    this.lateCallbacks.push(cb);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      let frameDt = this.clock.getDelta();
      if (frameDt > 0.1) frameDt = 0.1; // 防止切后台后大跳
      this.accumulator += frameDt;

      while (this.accumulator >= this.fixedDt) {
        for (const cb of this.updateCallbacks) cb(this.fixedDt);
        this.input.endFrame();
        this.accumulator -= this.fixedDt;
      }

      for (const cb of this.lateCallbacks) cb(frameDt);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}
