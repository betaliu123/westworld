// Pathfinder.js —— 网格 A* 寻路。
//
// 为什么需要：手机上点"📍去看看"后玩家自动赶路，原来的实现是"朝目标直走，
// 卡住就偏 0.9 弧度试试"。这在开阔地能走，但只要目标和玩家之间隔着一栏
// 建筑，就会一头顶在墙上左右蹭 —— 侧向偏移解决不了"要绕过一个 10 米宽的
// 矩形"这种事，因为偏移方向是瞎猜的，而且贴墙后 resolveCollision 每帧把人
// 推回来，位移永远接近 0。
//
// 做法：把镇子栅格化成 walkable/blocked，A* 求格子路径，再做视线捷径化
// （string pulling）压成少量拐点。玩家沿拐点走，每段都是直线可达的。
//
// 栅格分辨率 1 米：镇子约 ±86 米 → 约 173×173 格，A* 一次几毫秒，
// 只在点定位时算一次，不进主循环。
// 用 1 米而不是更粗，是因为建筑门口距碰撞体只有 0.8 米，格子一粗
// 门口就会被吞进障碍区，于是"走到门口"永远算不出路。

const CELL = 1.0;

export class Pathfinder {
  /**
   * @param {object} town 需要 colliders / circleColliders / bounds
   * @param {number} radius 行走体半径（玩家 0.45 左右），用于给障碍加膨胀
   */
  constructor(town, radius = 0.5) {
    this.town = town;
    this.radius = radius;
    this.build();
  }

  build() {
    const t = this.town;
    const limit = (t.bounds ?? 60) + 6;
    this.min = -limit;
    this.size = Math.ceil((limit * 2) / CELL) + 1;
    const n = this.size;
    // Uint8Array：0 = 可走，1 = 障碍
    this.grid = new Uint8Array(n * n);

    // 膨胀量只比行走半径多一点点。不能更大：建筑门口距碰撞体仅 0.8 米
    // （矩形碰撞体本身已经带了 +0.4 余量，而门放在建筑面外 1.2 米），
    // 膨胀过头会把门口整格标成障碍，"走到某栋楼门口"就永远无解。
    const pad = this.radius + 0.1;
    for (const c of t.colliders || []) {
      // 只遍历包围盒覆盖的格，但**逐格判定格心是否真在膨胀框内**。
      // 早先直接把 _ci(min)..._ci(max) 整段标成障碍 —— Math.round 会向外取整，
      // 等于凭空多膨胀半格（0.5m），实测把 20 个门里的 19 个都吞掉了。
      const x0 = this._ci(c.x - c.halfW - pad), x1 = this._ci(c.x + c.halfW + pad);
      const z0 = this._ci(c.z - c.halfD - pad), z1 = this._ci(c.z + c.halfD + pad);
      for (let ix = x0; ix <= x1; ix++) {
        const wx = this._cw(ix);
        if (Math.abs(wx - c.x) >= c.halfW + pad) continue;
        for (let iz = z0; iz <= z1; iz++) {
          const wz = this._cw(iz);
          if (Math.abs(wz - c.z) >= c.halfD + pad) continue;
          this._set(ix, iz, 1);
        }
      }
    }
    for (const c of t.circleColliders || []) {
      if (!c.r || c.r <= 0) continue;
      const r = c.r + pad;
      const x0 = this._ci(c.x - r), x1 = this._ci(c.x + r);
      const z0 = this._ci(c.z - r), z1 = this._ci(c.z + r);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iz = z0; iz <= z1; iz++) {
          const wx = this._cw(ix), wz = this._cw(iz);
          if (Math.hypot(wx - c.x, wz - c.z) <= r) this._set(ix, iz, 1);
        }
      }
    }
  }

  // 世界坐标 → 格索引
  _ci(w) { return Math.max(0, Math.min(this.size - 1, Math.round((w - this.min) / CELL))); }
  // 格索引 → 世界坐标（格中心）
  _cw(i) { return this.min + i * CELL; }
  _set(ix, iz, v) {
    if (ix < 0 || iz < 0 || ix >= this.size || iz >= this.size) return;
    this.grid[iz * this.size + ix] = v;
  }
  _blocked(ix, iz) {
    if (ix < 0 || iz < 0 || ix >= this.size || iz >= this.size) return true;
    return this.grid[iz * this.size + ix] === 1;
  }

  /** 目标落在障碍里（比如门口点被膨胀盖住）时，螺旋找最近的可走格 */
  _nearestFree(ix, iz, maxR = 8) {
    if (!this._blocked(ix, iz)) return [ix, iz];
    for (let r = 1; r <= maxR; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!this._blocked(ix + dx, iz + dz)) return [ix + dx, iz + dz];
        }
      }
    }
    return null;
  }

  /**
   * 把一个语义坐标吸附到最近的可走点。
   *
   * 用途：地点登记表给出的是"某栋楼的门口"这类语义位置，但它可能正好压在
   * 碰撞体边缘或被道具挡住（实测帮派驻地大门、几个后门都是）。要在那儿摆
   * NPC 或让玩家走过去，必须先吸附到真正站得住的格子，否则演员会被塞进墙里。
   *
   * @returns {{x:number,z:number,moved:number}} moved = 吸附移动了多远
   */
  nearestWalkable(x, z, maxR = 10) {
    const c = this._nearestFree(this._ci(x), this._ci(z), maxR);
    if (!c) return { x, z, moved: 0 };
    const nx = this._cw(c[0]), nz = this._cw(c[1]);
    return { x: nx, z: nz, moved: Math.hypot(nx - x, nz - z) };
  }

  /** 这个点现在能站人吗 */
  isWalkable(x, z) {
    return !this._blocked(this._ci(x), this._ci(z));
  }

  /** 两点之间是否直线无阻（用于把 A* 的格路径压成拐点） */
  hasClearLine(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(d / (CELL * 0.5));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      if (this._blocked(this._ci(x), this._ci(z))) return false;
    }
    return true;
  }

  /**
   * 求路径。
   * @returns {Array<{x:number,z:number}>|null} 拐点列表（不含起点，末点是目标）；null = 不可达
   */
  findPath(sx, sz, tx, tz) {
    const n = this.size;
    let s = this._nearestFree(this._ci(sx), this._ci(sz));
    let g = this._nearestFree(this._ci(tx), this._ci(tz));
    if (!s || !g) return null;
    const startI = s[1] * n + s[0];
    const goalI = g[1] * n + g[0];
    // 已经在目标格里：目标可走就直接给目标，否则给该格中心（别塞障碍点）
    if (startI === goalI) {
      return this._blocked(this._ci(tx), this._ci(tz))
        ? [{ x: this._cw(g[0]), z: this._cw(g[1]) }]
        : [{ x: tx, z: tz }];
    }

    const total = n * n;
    const gScore = new Float32Array(total).fill(Infinity);
    const fScore = new Float32Array(total).fill(Infinity);
    const came = new Int32Array(total).fill(-1);
    const open = new Uint8Array(total);
    // 简单二叉堆
    const heap = [];
    const push = (idx, f) => {
      heap.push([f, idx]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };

    const gx = g[0], gz = g[1];
    const h = (ix, iz) => Math.hypot(ix - gx, iz - gz);
    gScore[startI] = 0;
    fScore[startI] = h(s[0], s[1]);
    push(startI, fScore[startI]);
    open[startI] = 1;

    // 8 邻域
    const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let guard = 0;
    while (heap.length) {
      if (++guard > 200000) break;      // 保险：别把主线程卡死
      const [, cur] = pop();
      if (cur === goalI) return this._rebuild(came, cur, tx, tz);
      open[cur] = 0;
      const cx = cur % n, cz = (cur - cx) / n;
      for (const [dx, dz] of DIRS) {
        const nx = cx + dx, nz2 = cz + dz;
        if (this._blocked(nx, nz2)) continue;
        // 斜向时不许穿墙角
        if (dx && dz && (this._blocked(cx + dx, cz) || this._blocked(cx, cz + dz))) continue;
        const ni = nz2 * n + nx;
        const step = (dx && dz) ? 1.41421356 : 1;
        const tentative = gScore[cur] + step;
        if (tentative < gScore[ni]) {
          came[ni] = cur;
          gScore[ni] = tentative;
          fScore[ni] = tentative + h(nx, nz2);
          if (!open[ni]) { push(ni, fScore[ni]); open[ni] = 1; }
        }
      }
    }
    return null;
  }

  /** 回溯 + 视线捷径化：把逐格路径压成少量拐点 */
  _rebuild(came, goalIdx, tx, tz) {
    const n = this.size;
    const cells = [];
    for (let c = goalIdx; c !== -1; c = came[c]) {
      const ix = c % n, iz = (c - ix) / n;
      cells.push({ x: this._cw(ix), z: this._cw(iz) });
    }
    cells.reverse();

    // 末点想换成真实目标坐标（格中心有半格误差），但**只有目标本身可走时才换**。
    // 门口点常常正好压在膨胀边界上；硬塞一个障碍点当终点，最后一段就必然穿墙，
    // 玩家会一路走到墙里顶住。目标不可走时保留最近的可走格，剩下的距离交给
    // arriveDist（3 米）判定到达。
    if (!this._blocked(this._ci(tx), this._ci(tz))) {
      cells[cells.length - 1] = { x: tx, z: tz };
    }

    const out = [];
    let anchor = 0;
    while (anchor < cells.length - 1) {
      // 从 anchor 往后找最远的直线可达点
      let far = anchor + 1;
      for (let j = cells.length - 1; j > anchor; j--) {
        if (this.hasClearLine(cells[anchor].x, cells[anchor].z, cells[j].x, cells[j].z)) { far = j; break; }
      }
      out.push(cells[far]);
      anchor = far;
    }
    return out.length ? out : [cells[cells.length - 1]];
  }
}
