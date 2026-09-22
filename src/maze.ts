import type { Grid } from "./types.ts";
import { SWAMP_COST, makeRng } from "./types.ts";

/**
 * Recursive-backtracker maze on an odd-sized tile grid, then a sprinkle of
 * random swamps (cost 5) on open tiles to give weighted algorithms room to
 * differ. Same seed => same maze, always.
 */
export function generateMaze(width: number, height: number, seed: number): Grid {
  if (width % 2 === 0 || height % 2 === 0 || width < 5 || height < 5) {
    throw new Error("maze dimensions must be odd and at least 5");
  }
  const walls = new Uint8Array(width * height).fill(1);
  const cost = new Uint8Array(width * height).fill(1);
  const rng = makeRng(seed);

  const cell = (x: number, y: number) => y * width + x;
  const carve = (x: number, y: number) => {
    walls[cell(x, y)] = 0;
  };

  // iterative DFS backtracker over odd cells
  const stack: Array<[number, number]> = [[1, 1]];
  carve(1, 1);
  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1] as [number, number];
    const dirs: Array<[number, number]> = [
      [0, -2], [2, 0], [0, 2], [-2, 0],
    ].filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx > 0 && ny > 0 && nx < width && ny < height && walls[cell(nx, ny)] === 1;
    }) as Array<[number, number]>;
    if (dirs.length === 0) {
      stack.pop();
      continue;
    }
    const [dx, dy] = dirs[Math.floor(rng() * dirs.length)] as [number, number];
    carve(x + dx / 2, y + dy / 2);
    carve(x + dx, y + dy);
    stack.push([x + dx, y + dy]);
  }

  // braid a little: knock down ~8% of remaining interior walls that split
  // two open tiles, removing dead ends and giving algorithms choices
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = cell(x, y);
      if (walls[i] !== 1 || rng() >= 0.08) continue;
      const horizontal = walls[cell(x - 1, y)] === 0 && walls[cell(x + 1, y)] === 0;
      const vertical = walls[cell(x, y - 1)] === 0 && walls[cell(x, y + 1)] === 0;
      if (horizontal !== vertical) walls[i] = 0;
    }
  }

  // swamps: only on open tiles, never on the start/goal corners
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (walls[cell(x, y)] === 0 && rng() < 0.12) {
        cost[cell(x, y)] = SWAMP_COST;
      }
    }
  }

  return { width, height, walls, cost };
}

export function defaultEndpoints(grid: Grid): { start: number; goal: number } {
  return {
    start: 1 * grid.width + 1,
    goal: (grid.height - 2) * grid.width + (grid.width - 2),
  };
}
