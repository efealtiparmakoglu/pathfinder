import type { Grid, RunResult, Step } from "./types.ts";

export interface RenderOptions {
  useAnsi: boolean;
  /** animation: how many visited cells per frame */
  chunk: number;
}

const PALETTE = {
  wall: "\x1b[38;5;239m",
  open: "\x1b[38;5;245m",
  visited: "\x1b[38;5;33m",
  frontier: "\x1b[38;5;220m",
  path: "\x1b[38;5;46m",
  reset: "\x1b[0m",
};

const GLYPH = { wall: "#", open: "·", visited: "·", frontier: "◦", path: "█" };

function colorize(code: string, text: string, useAnsi: boolean): string {
  return useAnsi ? code + text + PALETTE.reset : text;
}

/** One painted grid frame: replay `steps[0..=through]` onto the maze. */
export function frameAt(
  grid: Grid,
  start: number,
  goal: number,
  steps: Step[],
  through: number,
  useAnsi: boolean,
): string {
  const state = new Int8Array(grid.width * grid.height).fill(-1); // -1 plain
  for (let i = 0; i <= through && i < steps.length; i += 1) {
    const step = steps[i] as Step;
    // a visited/path mark overrides an earlier frontier mark
    if (state[step.index] === -1 || state[step.index] === 1 || step.kind === 2) {
      state[step.index] = step.kind;
    }
  }
  const rows: string[] = [];
  for (let y = 0; y < grid.height; y += 1) {
    let row = "";
    for (let x = 0; x < grid.width; x += 1) {
      const i = y * grid.width + x;
      if (i === start) {
        row += colorize(PALETTE.path, "S", useAnsi);
        continue;
      }
      if (i === goal) {
        row += colorize(PALETTE.path, "G", useAnsi);
        continue;
      }
      if (grid.walls[i]) {
        row += colorize(PALETTE.wall, GLYPH.wall, useAnsi);
        continue;
      }
      switch (state[i]) {
        case 2:
          row += colorize(PALETTE.path, GLYPH.path, useAnsi);
          break;
        case 0:
          row += colorize(PALETTE.visited, GLYPH.visited, useAnsi);
          break;
        case 1:
          row += colorize(PALETTE.frontier, GLYPH.frontier, useAnsi);
          break;
        default:
          row += grid.cost[i] > 1
            ? colorize(PALETTE.open, "~", useAnsi)
            : colorize(PALETTE.open, GLYPH.open, useAnsi);
      }
    }
    rows.push(row);
  }
  return rows.join("\n");
}

/** All frames of a run: one per `chunk` visited cells plus a final frame.
 * A chunk of Infinity (or >= the step count) yields a single final frame. */
export function frames(
  grid: Grid,
  start: number,
  goal: number,
  result: RunResult,
  opts: RenderOptions,
): string[] {
  const out: string[] = [];
  const header = `${result.algorithm} — visited ${result.visitedOrder.length} tiles` +
    (result.found ? `, path ${result.path.length - 1} steps, cost ${result.cost}` : ", NO PATH");
  const total = result.steps.length;
  const perFrame = opts.chunk >= total ? total : Math.max(1, opts.chunk);
  for (let through = perFrame; through < total + perFrame; through += perFrame) {
    const capped = Math.min(through, total);
    const body = frameAt(grid, start, goal, result.steps, capped, opts.useAnsi);
    out.push(header + "\n" + body);
    if (capped >= total) break;
  }
  return out;
}

export function statsTable(results: RunResult[]): string {
  const rows = results.map((r) => ({
    algorithm: r.algorithm,
    visited: r.visitedOrder.length,
    pathLength: r.found ? r.path.length - 1 : Infinity,
    cost: r.cost,
    found: r.found,
  }));
  const width = 10;
  let text =
    "ALGORITHM".padEnd(width + 2) +
    "VISITED".padStart(width) +
    "PATH".padStart(width) +
    "COST".padStart(width) +
    "\n";
  text += "-".repeat(width * 4 + 2) + "\n";
  for (const row of rows) {
    text +=
      row.algorithm.padEnd(width + 2) +
      String(row.visited).padStart(width) +
      (Number.isFinite(row.pathLength) ? String(row.pathLength) : "-").padStart(width) +
      (Number.isFinite(row.cost) ? String(row.cost) : "-").padStart(width) +
      "\n";
  }
  return text;
}
