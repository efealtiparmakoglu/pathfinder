import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultEndpoints, generateMaze } from "../src/maze.ts";
import { runAll } from "../src/algorithms.ts";
import { frameAt, frames, statsTable } from "../src/render.ts";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.ts");

function maze(w = 21, h = 11, seed = 3) {
  const grid = generateMaze(w, h, seed);
  return { grid, ...defaultEndpoints(grid) };
}

test("frame paints the goal and path deterministically", () => {
  const { grid, start, goal } = maze();
  const [result] = runAll(grid, start, goal);
  const final = frameAt(grid, start, goal, result.steps, result.steps.length, false);
  assert.equal(final, frameAt(grid, start, goal, result.steps, result.steps.length, false));
  assert.ok(final.includes("S"), "start marked");
  assert.ok(final.includes("G"), "goal marked");
  assert.ok(final.includes("█"), "path painted");
  assert.ok(final.includes("#"), "walls drawn");
  assert.equal(final.split("\n").length, grid.height);
});

test("frame grows monotonically as steps are replayed", () => {
  const { grid, start, goal } = maze();
  const result = runAll(grid, start, goal)[0] as ReturnType<typeof runAll>[number];
  const early = frameAt(grid, start, goal, result.steps, 3, false);
  const late = frameAt(grid, start, goal, result.steps, result.steps.length - 1, false);
  const count = (text: string, glyph: string) => text.split(glyph).length - 1;
  assert.ok(count(late, "█") >= count(early, "█"));
});

test("ansi frames embed color codes, plain frames do not", () => {
  const { grid, start, goal } = maze();
  const result = runAll(grid, start, goal)[0] as ReturnType<typeof runAll>[number];
  const plain = frameAt(grid, start, goal, result.steps, result.steps.length, false);
  const ansi = frameAt(grid, start, goal, result.steps, result.steps.length, true);
  assert.ok(!plain.includes("\x1b["));
  assert.ok(ansi.includes("\x1b["));
});

test("frames yields at least one frame and the last is final", () => {
  const { grid, start, goal } = maze();
  const result = runAll(grid, start, goal)[0] as ReturnType<typeof runAll>[number];
  const list = frames(grid, start, goal, result, { useAnsi: false, chunk: 10 });
  assert.ok(list.length >= 2, "multiple frames for a multi-step run");
  const final = frameAt(grid, start, goal, result.steps, result.steps.length, false);
  assert.ok((list.at(-1) as string).endsWith(final), "last frame shows the final state");
});

test("stats table lists all algorithms", () => {
  const { grid, start, goal } = maze();
  const table = statsTable(runAll(grid, start, goal));
  for (const name of ["A*", "Dijkstra", "BFS"]) {
    assert.ok(table.includes(name), `${name} in table`);
  }
});

// --- CLI -------------------------------------------------------------------

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

test("CLI no-ansi mode prints grids, stats and seed", () => {
  const res = runCli(["--no-ansi", "--seed", "11", "--width", "21", "--height", "11"]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /seed 11/);
  assert.match(res.stdout, /A\*/);
  assert.match(res.stdout, /Dijkstra/);
  assert.match(res.stdout, /BFS/);
  assert.match(res.stdout, /ALGORITHM/);
});

test("CLI determinism: same seed, same output", () => {
  const one = runCli(["--no-ansi", "--seed", "5"]);
  const two = runCli(["--no-ansi", "--seed", "5"]);
  assert.equal(one.stdout, two.stdout);
});

test("CLI validates dimensions and options", () => {
  assert.equal(runCli(["--width", "20"]).status, 2);
  assert.equal(runCli(["--algo", "quick"]).status, 2);
  assert.equal(runCli(["--nope"]).status, 2);
  assert.equal(runCli(["--seed"]).status, 2);
});

test("CLI single-algo and help/version", () => {
  assert.equal(runCli(["--algo", "bfs", "--no-ansi"]).status, 0);
  assert.match(runCli(["--help"]).stdout, /USAGE/);
  assert.match(runCli(["--version"]).stdout, /1\.0\.0/);
});
