// Minimap.js — 右上角俯视小地图：绘制街道、建筑、可进入场景、自然景观、玩家朝向、警长(红色)。

export class Minimap {
  constructor(town) {
    this.town = town;
    this.canvas = document.getElementById("minimap");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.size = this.canvas ? this.canvas.width : 180;
    // 世界 → 小地图缩放：把 [-bounds, bounds] 映射到画布
    this.worldSpan = town.bounds * 2 + 20;
    this.scale = this.size / this.worldSpan;
    this._pulse = 0;

    // 预渲染静态底图（街道/建筑/自然），每帧只重绘动态层
    this._staticCanvas = document.createElement("canvas");
    this._staticCanvas.width = this.size;
    this._staticCanvas.height = this.size;
    this._drawStatic();
  }

  _w2m(x, z) {
    // 世界坐标 → 画布坐标（画布中心为世界原点；z 向下为屏幕下方）
    return {
      mx: this.size / 2 + x * this.scale,
      my: this.size / 2 + z * this.scale,
    };
  }

  _drawStatic() {
    const ctx = this._staticCanvas.getContext("2d");
    const s = this.size;
    // 背景（沙地）
    ctx.fillStyle = "#caa16a";
    ctx.fillRect(0, 0, s, s);

    // 自然景观
    for (const zone of this.town.natureZones) {
      const p = this._w2m(zone.x, zone.z);
      const r = zone.r * this.scale;
      if (zone.kind === "lake") ctx.fillStyle = "#2f5f8f";
      else if (zone.kind === "park") ctx.fillStyle = "#5a7a3a";
      else ctx.fillStyle = "#2f5a32"; // forest
      ctx.beginPath();
      ctx.arc(p.mx, p.my, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 主街（南北）+ 横街
    ctx.strokeStyle = "#a07b4a";
    ctx.lineWidth = 14 * this.scale;
    const top = this._w2m(0, -this.town.bounds);
    const bot = this._w2m(0, this.town.bounds);
    ctx.beginPath();
    ctx.moveTo(top.mx, top.my);
    ctx.lineTo(bot.mx, bot.my);
    ctx.stroke();

    // 建筑
    for (const lm of this.town.landmarks) {
      const p = this._w2m(lm.x, lm.z);
      if (lm.kind === "compound") {
        this._drawHouse(ctx, p.mx, p.my, "#c0a24a"); // 帮派驻地：小房子
      } else if (lm.kind === "enterable") {
        ctx.fillStyle = "#ffce54"; // 可进入建筑：金色
        ctx.fillRect(p.mx - 3, p.my - 3, 6, 6);
      } else if (lm.kind === "property") {
        ctx.fillStyle = "#b06ae2"; // 待售房产：紫色
        ctx.fillRect(p.mx - 3, p.my - 3, 6, 6);
      } else {
        ctx.fillStyle = "#6b4a2b";
        ctx.fillRect(p.mx - 2, p.my - 2, 4, 4);
      }
    }
  }

  // 小房子图标：墙体 + 三角屋顶 + 门（复用 markOwnedHouse 的造型，参数化颜色）
  _drawHouse(ctx, mx, my, color) {
    ctx.fillStyle = color;
    ctx.fillRect(mx - 4, my - 2, 8, 6);
    ctx.beginPath();
    ctx.moveTo(mx - 5, my - 2);
    ctx.lineTo(mx, my - 7);
    ctx.lineTo(mx + 5, my - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mx - 1, my + 1, 2, 3);
  }

  // 玩家已购房产可动态补画（购买后调用）：蓝色小屋图标，一眼认出"这是我的家"
  markOwnedHouse(x, z) {
    const ctx = this._staticCanvas.getContext("2d");
    const p = this._w2m(x, z);
    this._drawHouse(ctx, p.mx, p.my, "#3aa0ff");
  }

  /**
   * @param {object} state { player:{x,z,facing}, sheriffs:[{x,z}], questMarkers:[{x,z}], inside:bool }
   */
  update(dt, state) {
    if (!this.ctx) return;
    this._pulse += dt * 4;
    const ctx = this.ctx;
    const s = this.size;

    // 底图
    ctx.clearRect(0, 0, s, s);
    ctx.drawImage(this._staticCanvas, 0, 0);

    // 室内时给个遮罩提示"在室内"
    if (state.inside) {
      ctx.fillStyle = "rgba(20,12,6,.55)";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#ffce54";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏠 室内", s / 2, s / 2);
      return;
    }

    // 警长（红色，闪烁）
    if (state.sheriffs) {
      const blink = 0.5 + Math.sin(this._pulse) * 0.5;
      for (const sh of state.sheriffs) {
        const p = this._w2m(sh.x, sh.z);
        ctx.fillStyle = `rgba(226,86,74,${0.5 + blink * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.mx, p.my, 4 + blink * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 玩家（白色三角，指向朝向）
    const pp = this._w2m(state.player.x, state.player.z);
    const f = state.player.facing;
    ctx.save();
    ctx.translate(pp.mx, pp.my);
    ctx.rotate(-f); // facing 是 atan2(x,z)，画布 y 向下，取负对齐
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2b1c10";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 任务标记（红色五角星，闪烁）
    if (state.questMarkers) {
      const blink = 0.5 + Math.sin(this._pulse * 1.3) * 0.5;
      for (const qm of state.questMarkers) {
        const p = this._w2m(qm.x, qm.z);
        // 红色五角星
        ctx.fillStyle = `rgba(255,40,20,${0.4 + blink * 0.6})`;
        ctx.strokeStyle = `rgba(255,60,40,${0.6 + blink * 0.4})`;
        ctx.lineWidth = 1.5;
        const r = 6 + blink * 2;
        ctx.beginPath();
        const spikes = 5;
        const outerR = r;
        const innerR = r * 0.4;
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const sx = p.mx + Math.cos(angle) * radius;
          const sy = p.my + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /**
   * 设置任务标记位置。返回该标记，供外部更新。
   * @param {number} x - 世界坐标 x
   * @param {number} z - 世界坐标 z
   * @returns {object} 标记对象 { x, z }
   */
  setQuestMarker(x, z) {
    return { x, z };
  }
}
