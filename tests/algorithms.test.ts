import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultEndpoints, generateMaze } from "../src/maze.ts";
import { aStar, bfs, dijkstra, runAll, pathCost } from "../src/algorithms.ts";
import { neighbors } from "../src/types.ts";

function maze(w = 25, h = 15, seed = 42) {
  const grid = generateMaze(w, h, seed);
  return { grid, ...defaultEndpoints(grid) };
}

test("all algorithms find the goal on several mazes", () => {
  for (let seed = 0; seed < 10; seed += 1) {
    const { grid, start, goal } = maze(25, 15, seed);
    for (const result of runAll(grid, start, goal)) {
      assert.ok(result.found, `${result.algorithm} must find the goal (seed ${seed})`);
      assert.equal(result.path[0], start);
      assert.equal(result.path.at(-1), goal);
    }
  }
});

test("paths are contiguous: every step is a neighbor", () => {
  const { grid, start, goal } = maze();
  for (const result of runAll(grid, start, goal)) {
    for (let i = 1; i < result.path.length; i += 1) {
      const from = result.path[i - 1] as number;
      const to = result.path[i] as number;
      assert.ok(neighbors(grid, from).includes(to), `${result.algorithm} jumps tiles`);
    }
  }
});

test("dijkstra and aStar agree on optimal weighted cost", () => {
  for (let seed = 0; seed < 10; seed += 1) {
    const { grid, start, goal } = maze(25, 15, seed);
    const d = dijkstra(grid, start, goal);
    const a = aStar(grid, start, goal);
    assert.equal(a.cost, d.cost, `seed ${seed}`);
  }
});

test("bfs never exceeds the optimal cost (it may wander through swamps)", () => {
  const { grid, start, goal } = maze();
  const d = dijkstra(grid, start, goal);
  const b = bfs(grid, start, goal);
  assert.ok(b.cost >= d.cost, `bfs ${b.cost} must not beat dijkstra ${d.cost}`);
});

test("aStar visits no more tiles than dijkstra", () => {
  for (let seed = 0; seed < 10; seed += 1) {
    const { grid, start, goal } = maze(25, 15, seed);
    const a = aStar(grid, start, goal);
    const d = dijkstra(grid, start, goal);
    assert.ok(
      a.visitedOrder.length <= d.visitedOrder.length,
      `seed ${seed}: astar ${a.visitedOrder.length} > dijkstra ${d.visitedOrder.length}`,
    );
  }
});

test("path costs equal sum of entering tile costs", () => {
  const { grid, start, goal } = maze();
  const a = aStar(grid, start, goal);
  assert.equal(a.cost, pathCost(grid, a.path));
});

test("runs are deterministic for a fixed maze", () => {
  const { grid, start, goal } = maze();
  const first = aStar(grid, start, goal);
  const second = aStar(grid, start, goal);
  assert.deepEqual(first.visitedOrder, second.visitedOrder);
  assert.deepEqual(first.path, second.path);
});

test("unreachable goal reports not found", () => {
  const grid = generateMaze(21, 11, 4);
  // wall off the goal tile itself
  const { start, goal } = defaultEndpoints(grid);
  grid.walls[goal] = 1;
  const result = bfs(grid, start, goal);
  assert.equal(result.found, false);
  assert.equal(result.cost, Infinity);
  assert.equal(result.path.length, 0);
});

test("heap ties do not crash on a big maze", () => {
  const { grid, start, goal } = maze(61, 31, 8);
  const d = dijkstra(grid, start, goal);
  assert.ok(d.found);
});
