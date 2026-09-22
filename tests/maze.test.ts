import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultEndpoints, generateMaze } from "../src/maze.ts";
import { neighbors, tileCost, SWAMP_COST } from "../src/types.ts";

test("same seed yields the same maze", () => {
  const a = generateMaze(21, 11, 42);
  const b = generateMaze(21, 11, 42);
  assert.deepEqual([...a.walls], [...b.walls]);
  assert.deepEqual([...a.cost], [...b.cost]);
});

test("different seeds diverge", () => {
  const a = generateMaze(21, 11, 1);
  const b = generateMaze(21, 11, 2);
  assert.notDeepEqual([...a.walls], [...b.walls]);
});

test("odd/even validation", () => {
  assert.throws(() => generateMaze(20, 11, 1));
  assert.throws(() => generateMaze(3, 11, 1));
});

test("maze is fully connected from the start", () => {
  const grid = generateMaze(31, 15, 7);
  const { start } = defaultEndpoints(grid);
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    for (const n of neighbors(grid, queue[head] as number)) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  const openTiles = grid.walls.reduce((acc, wall) => acc + (wall ? 0 : 1), 0);
  assert.equal(seen.size, openTiles, "every open tile must be reachable");
});

test("start and goal are open", () => {
  const grid = generateMaze(21, 11, 99);
  const { start, goal } = defaultEndpoints(grid);
  assert.equal(grid.walls[start], 0);
  assert.equal(grid.walls[goal], 0);
});

test("swamps exist and cost 5", () => {
  let found = false;
  for (let seed = 0; seed < 20 && !found; seed += 1) {
    const grid = generateMaze(31, 15, seed);
    found = [...grid.cost].some((c) => c === SWAMP_COST);
  }
  assert.ok(found, "at least one seed in 20 should produce swamps");
});

test("neighbors never return walls or out of bounds", () => {
  const grid = generateMaze(21, 11, 5);
  for (let i = 0; i < grid.walls.length; i += 1) {
    for (const n of neighbors(grid, i)) {
      assert.equal(grid.walls[n], 0);
      assert.ok(n >= 0 && n < grid.walls.length);
    }
  }
});

test("tileCost defaults to 1", () => {
  const grid = generateMaze(9, 9, 3);
  assert.equal(tileCost(grid, 0), 1);
});
