export interface Grid {
  width: number;
  height: number;
  /** true = wall tile */
  walls: Uint8Array;
  /** movement cost of open tiles (1 = plain, 5 = swamp) */
  cost: Uint8Array;
}

export interface Step {
  index: number;
  /** 0 = visited (closed), 1 = frontier (discovered), 2 = final path */
  kind: 0 | 1 | 2;
}

export interface RunResult {
  algorithm: string;
  visitedOrder: number[];
  path: number[];
  cost: number;
  steps: Step[];
  found: boolean;
}

export const SWAMP_COST = 5;

export function idx(grid: Grid, x: number, y: number): number {
  return y * grid.width + x;
}

export function neighbors(grid: Grid, index: number): number[] {
  const x = index % grid.width;
  const y = Math.floor(index / grid.width);
  const out: number[] = [];
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
    const n = ny * grid.width + nx;
    if (grid.walls[n]) continue;
    out.push(n);
  }
  return out;
}

export function tileCost(grid: Grid, index: number): number {
  return grid.cost[index] || 1;
}

/** Deterministic PRNG (mulberry32) so a seed always builds the same maze. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
