// Audio.js — WebAudio 程序化音效与 BGM。零素材依赖，全部由振荡器/噪声合成。
// 首次用户手势后才能启动 AudioContext（浏览器策略），由 main 在 pointerlock 时唤醒。

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.enabled = true;
    this.started = false;
    this._noiseBuffer = null;
    this._musicTimer = 0;
    this._musicStep = 0;
    this._windLfoPhase = 0;
    this._marketTimer = 0;
  }

  // 需在用户手势中调用
  start() {
    if (this.started) {
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.0;
    this.ambientGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);

    this._buildNoiseBuffer();
    this._startWind();
    this.started = true;
  }

  _buildNoiseBuffer() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buf;
  }

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    return src;
  }

  // 持续风声：白噪声 → 低通 + 缓慢起伏
  _startWind() {
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.5;
    src.connect(lp);
    lp.connect(windGain);
    windGain.connect(this.ambientGain);
    src.start();
    this._windGain = windGain;
    this._windLp = lp;
    // 淡入环境音
    this.ambientGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 2);

    this._startCrowdBed();
  }

  // 背景人声床：带通噪声 + 缓慢调制，营造"远处有很多人在说话"的市集底噪。
  // 白天在镇上时音量抬升，夜晚/离镇时压低。
  _startCrowdBed() {
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 600;
    bp.Q.value = 1.2;
    // 第二层塑造"人声共振峰"
    const bp2 = this.ctx.createBiquadFilter();
    bp2.type = "bandpass";
    bp2.frequency.value = 1100;
    bp2.Q.value = 2;
    const crowdGain = this.ctx.createGain();
    crowdGain.gain.value = 0;
    // 用 LFO 缓慢抖动带通频率，模拟人声起伏
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.7;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    lfo.start();
    src.connect(bp); bp.connect(bp2); bp2.connect(crowdGain);
    crowdGain.connect(this.ambientGain);
    src.start();
    this._crowdGain = crowdGain;
  }

  // 每帧：风声起伏 + 市集环境（白天）随机点缀 + BGM 步进
  update(dt, ctx = {}) {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;

    // 风声缓慢起伏
    this._windLfoPhase += dt * 0.4;
    const wind = 0.35 + Math.sin(this._windLfoPhase) * 0.2;
    if (this._windGain) this._windGain.gain.setTargetAtTime(wind, now, 0.5);
    if (this._windLp) this._windLp.frequency.setTargetAtTime(400 + Math.sin(this._windLfoPhase * 1.3) * 250, now, 0.5);

    // 市集环境：白天在镇中心附近，随机远处人声/马嘶/木门
    const isDay = ctx.isDay ?? true;
    const nearTown = ctx.nearTown ?? true;

    // 背景人声床音量：白天在镇上最热闹，夜晚/离镇压低
    if (this._crowdGain) {
      let target = 0;
      if (nearTown) target = isDay ? 0.16 : 0.05;
      // 人越多越吵（由 ctx.crowd 传入 0~1）
      target *= 0.6 + (ctx.crowd ?? 0.6) * 0.7;
      this._crowdGain.gain.setTargetAtTime(target, now, 1.2);
    }

    if (nearTown) {
      this._marketTimer -= dt;
      if (this._marketTimer <= 0) {
        // 白天更频繁、夜晚稀疏
        this._marketTimer = (isDay ? 1.8 : 4) + Math.random() * (isDay ? 3 : 5);
        this._marketAmbientBlip(isDay);
      }
    }

    // BGM 步进（仅当世界 BGM 开启时发声）
    this._musicTimer -= dt;
    if (this._musicTimer <= 0) {
      this._musicTimer = 0.34; // 约 176 BPM 的八分音
      if (this._worldBgmOn !== false) this._musicTick();
    }
  }

  // ---------- 环境点缀 ----------
  _marketAmbientBlip(isDay = true) {
    const r = Math.random();
    if (isDay) {
      // 白天：以人声为主（交谈/笑声/吆喝），穿插马嘶木门
      if (r < 0.28) this._distantChatter();
      else if (r < 0.48) this._laughter();
      else if (r < 0.64) this._vendorShout();
      else if (r < 0.82) this._horseNeigh(0.13);
      else this._woodCreak();
    } else {
      // 夜晚：安静，偶有远处狗吠/木门
      if (r < 0.5) this._woodCreak();
      else if (r < 0.8) this._distantChatter();
      else this._horseNeigh(0.1);
    }
  }

  // 远处笑声：几个上行短音簇
  _laughter() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const base = 240 + Math.random() * 120;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = now + i * 0.13;
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      const g = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = base * 2.2;
      bp.Q.value = 4;
      o.frequency.setValueAtTime(base * (1 + i * 0.04), t);
      o.frequency.linearRampToValueAtTime(base * 0.85, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(bp); bp.connect(g); g.connect(this.ambientGain);
      o.start(t); o.stop(t + 0.14);
    }
  }

  // 小贩吆喝：一句下行长音
  _vendorShout() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    const g = this.ctx.createGain();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 3;
    o.frequency.setValueAtTime(300, now);
    o.frequency.linearRampToValueAtTime(360, now + 0.15);
    o.frequency.linearRampToValueAtTime(240, now + 0.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.06);
    g.gain.linearRampToValueAtTime(0.05, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    o.connect(bp); bp.connect(g); g.connect(this.ambientGain);
    o.start(now); o.stop(now + 0.72);
  }

  _distantChatter() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    const g = this.ctx.createGain();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700 + Math.random() * 300;
    bp.Q.value = 3;
    o.frequency.setValueAtTime(180 + Math.random() * 80, now);
    o.frequency.linearRampToValueAtTime(140, now + 0.4);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.05);
    g.gain.linearRampToValueAtTime(0, now + 0.45);
    o.connect(bp); bp.connect(g); g.connect(this.ambientGain);
    o.start(now); o.stop(now + 0.5);
  }

  _woodCreak() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.linearRampToValueAtTime(180, now + 0.3);
    bp.Q.value = 6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src.connect(bp); bp.connect(g); g.connect(this.ambientGain);
    src.start(now); src.stop(now + 0.4);
  }

  _horseNeigh(vol = 0.2) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(420, now);
    o.frequency.linearRampToValueAtTime(560, now + 0.12);
    o.frequency.linearRampToValueAtTime(300, now + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    const trem = this.ctx.createOscillator();
    trem.frequency.value = 22;
    const tremG = this.ctx.createGain();
    tremG.gain.value = vol * 0.5;
    trem.connect(tremG); tremG.connect(g.gain);
    o.connect(g); g.connect(this.ambientGain);
    o.start(now); o.stop(now + 0.55);
    trem.start(now); trem.stop(now + 0.55);
  }

  // ---------- BGM：西部风简单旋律 + 拨弦低音 ----------
  _musicTick() {
    // A 小调五声，营造荒漠孤独感
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440.0];
    const bassNotes = [110, 82.41, 98.0, 110];
    const step = this._musicStep;

    // 每 2 步一个低音（拨弦）
    if (step % 4 === 0) {
      const b = bassNotes[(step / 4) % bassNotes.length];
      this._pluck(b, 0.5, 0.18);
    }
    // 旋律：跳过部分步做留白
    if (step % 2 === 0 && Math.random() < 0.8) {
      const n = scale[Math.floor(Math.random() * scale.length)];
      this._pluck(n * (Math.random() < 0.3 ? 2 : 1), 0.35, 0.1);
    }
    this._musicStep = (step + 1) % 32;
  }

  _pluck(freq, dur, vol) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(now); o.stop(now + dur + 0.05);
  }

  // ---------- 玩家/世界 SFX ----------
  _ping(freq, dur, vol, type = "sine", target = null) {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(target || this.sfxGain);
    o.start(now); o.stop(now + dur + 0.02);
    return o;
  }

  footstep() {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 350;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(now); src.stop(now + 0.13);
  }

  punch() {
    // 挥拳：低频闷响 + 噪声
    this._ping(150, 0.12, 0.25, "sine");
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(now); src.stop(now + 0.16);
  }

  hit() {
    // 命中：更重的击打
    this._ping(90, 0.18, 0.35, "square");
  }

  coin() {
    // 金币：两个上行清脆音
    this._ping(880, 0.12, 0.2, "square");
    setTimeout(() => this._ping(1320, 0.14, 0.18, "square"), 60);
  }

  keyPickup() {
    this._ping(660, 0.1, 0.18, "triangle");
    setTimeout(() => this._ping(990, 0.2, 0.16, "triangle"), 80);
  }

  phonePickup() {
    this._ping(520, 0.08, 0.14, "sine");
    setTimeout(() => this._ping(680, 0.12, 0.12, "sine"), 70);
  }

  gunshot() {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    const src = this._noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    src.connect(hp); hp.connect(g); g.connect(this.sfxGain);
    src.start(now); src.stop(now + 0.26);
    this._ping(80, 0.2, 0.3, "sine");
  }

  // NPC 情绪声：type = 'scared' | 'angry' | 'hurt' | 'greet' | 'happy' | 'discuss'
  // 用带通锯齿波塑造"人声"轮廓，不同情绪走不同音高包络与音节数。
  npcVoice(type) {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    // 每种情绪：基频、音节数、每音节音高曲线(起,止)、时长、音量、颤音
    const cfg = {
      scared:  { base: 480, syl: 1, curve: [1, 1.5],   dur: 0.32, vol: 0.2,  vib: 0 },
      angry:   { base: 150, syl: 2, curve: [1.35, 0.9], dur: 0.26, vol: 0.22, vib: 14 },
      hurt:    { base: 300, syl: 1, curve: [1, 0.55],   dur: 0.34, vol: 0.2,  vib: 0 },
      greet:   { base: 250, syl: 1, curve: [1, 1.12],   dur: 0.24, vol: 0.16, vib: 0 },
      happy:   { base: 300, syl: 2, curve: [1, 1.25],   dur: 0.18, vol: 0.16, vib: 0 },
      discuss: { base: 200, syl: 3, curve: [1, 0.95],   dur: 0.14, vol: 0.12, vib: 0 },
    }[type] || { base: 250, syl: 1, curve: [1, 1.1], dur: 0.24, vol: 0.16, vib: 0 };

    for (let i = 0; i < cfg.syl; i++) {
      const t = now + i * (cfg.dur * 0.85);
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      const g = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 4;
      bp.frequency.value = cfg.base * 2;
      // 讨论声：每个音节音高略随机，像自然说话
      const jitter = type === "discuss" ? 0.8 + Math.random() * 0.5 : 1;
      const f0 = cfg.base * cfg.curve[0] * jitter;
      const f1 = cfg.base * cfg.curve[1] * jitter;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f1, t + cfg.dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(cfg.vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + cfg.dur);
      // 愤怒加颤音
      if (cfg.vib > 0) {
        const trem = this.ctx.createOscillator();
        trem.frequency.value = cfg.vib;
        const tremG = this.ctx.createGain();
        tremG.gain.value = cfg.vol * 0.5;
        trem.connect(tremG); tremG.connect(g.gain);
        trem.start(t); trem.stop(t + cfg.dur + 0.02);
      }
      o.connect(bp); bp.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + cfg.dur + 0.02);
    }
  }

  // 车辆引擎：持续音，随速度调频。返回控制句柄。
  createEngine() {
    if (!this.started || !this.enabled) return null;
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 60;
    const sub = this.ctx.createOscillator();
    sub.type = "square";
    sub.frequency.value = 30;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 400;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    o.connect(lp); sub.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    o.start(); sub.start();
    return { o, sub, g, lp, ctx: this.ctx };
  }

  setEngine(handle, speedRatio) {
    if (!handle) return;
    const now = handle.ctx.currentTime;
    const target = Math.min(1, Math.abs(speedRatio));
    handle.g.gain.setTargetAtTime(0.06 + target * 0.14, now, 0.1);
    handle.o.frequency.setTargetAtTime(55 + target * 130, now, 0.1);
    handle.sub.frequency.setTargetAtTime(28 + target * 60, now, 0.1);
  }

  stopEngine(handle) {
    if (!handle) return;
    const now = handle.ctx.currentTime;
    handle.g.gain.setTargetAtTime(0, now, 0.1);
    try {
      handle.o.stop(now + 0.3);
      handle.sub.stop(now + 0.3);
    } catch (e) { void e; }
  }

  crash() {
    // 撞击：低频砰 + 噪声爆裂
    this._ping(70, 0.3, 0.4, "sine");
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(now); src.stop(now + 0.31);
  }

  newspaper() {
    // 报纸翻页/新刊提示
    this._ping(1200, 0.06, 0.12, "square");
    setTimeout(() => this._ping(900, 0.08, 0.1, "square"), 50);
  }

  cash() {
    // 收银机式提示
    this._ping(1046, 0.1, 0.16, "square");
    setTimeout(() => this._ping(1568, 0.16, 0.14, "square"), 70);
  }

  bell() {
    // 医馆复活的钟声
    this._ping(523, 1.2, 0.2, "sine");
    this._ping(784, 1.4, 0.12, "sine");
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.setTargetAtTime(this.enabled ? 0.8 : 0, this.ctx.currentTime, 0.1);
    return this.enabled;
  }

  // 开/关合成的世界 BGM（进游戏平时的西部 BGM），带 musicGain 淡入淡出
  setWorldBgm(on, fade = 1.0) {
    this._worldBgmOn = on;
    if (this.musicGain && this.ctx) {
      const target = on ? 0.32 : 0;
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, fade / 3);
    }
  }
}
