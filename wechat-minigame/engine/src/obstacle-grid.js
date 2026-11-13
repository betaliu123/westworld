// Obstacle footprints are fixed once placed and the list only grows, so they are bucketed by ground cell
// and rebuilt when the list length changes. Callers still read live state (removed, broken, open) per query.
const CELL = 2, grids = new WeakMap();
const cellKey = (cx, cz) => (cx + 4096) * 8192 + cz + 4096;

// Obstacles whose footprint, grown by `pad`, may contain (x,z). `loose` marks entries that collide by their own rule and are always returned.
export function obstaclesNear(list, x, z, pad = .3, loose = null) {
  let grid = grids.get(list);
  if (!grid || grid.count !== list.length || grid.pad < pad) {
    grid = {count: list.length, pad, cells: new Map(), loose: []};
    for (const o of list) {
      if (loose?.(o) || !Number.isFinite(o.x + o.z + o.w + o.d)) { grid.loose.push(o); continue; }
      for (let cx = Math.floor((o.x - o.w / 2 - pad) / CELL); cx <= Math.floor((o.x + o.w / 2 + pad) / CELL); cx++)
        for (let cz = Math.floor((o.z - o.d / 2 - pad) / CELL); cz <= Math.floor((o.z + o.d / 2 + pad) / CELL); cz++) {
          const k = cellKey(cx, cz), cell = grid.cells.get(k);
          if (cell) cell.push(o); else grid.cells.set(k, [o]);
        }
    }
    // Loose entries join every occupied cell and stand alone elsewhere, so one array answers each query.
    if (grid.loose.length) for (const cell of grid.cells.values()) cell.push(...grid.loose);
    grids.set(list, grid);
  }
  return grid.cells.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL))) || grid.loose;
}
