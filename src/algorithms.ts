import type { Grid, RunResult, Step } from "./types.ts";
import { neighbors, tileCost } from "./types.ts";

export interface Algorithm {
  name: string;
  run(grid: Grid, start: number, goal: number): RunResult;
}

function record(steps: Step[], index: number, kind: 0 | 1 | 2): void {
  steps.push({ index, kind });
}

function buildResult(
  name: string,
  grid: Grid,
  start: number,
  goal: number,
  visitedOrder: number[],
  cameFrom: Map<number, number>,
  costSoFar: Map<number, number>,
  steps: Step[],
): RunResult {
  const path: number[] = [];
  if (costSoFar.has(goal)) {
    let cur: number | undefined = goal;
    while (cur !== undefined) {
      path.push(cur);
      record(steps, cur, 2);
      cur = cameFrom.get(cur);
    }
    path.reverse();
  }
  const found = path.length > 0 && path[0] === start;
  return {
    algorithm: name,
    visitedOrder,
    path,
    cost: found ? pathCost(grid, path) : Infinity,
    steps,
    found,
  };
}

/** Sum of entering-costs along a path (start tile is free). */
export function pathCost(grid: Grid, path: number[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += tileCost(grid, path[i] as number);
  }
  return total;
}

/** Binary min-heap keyed by priority, ties broken by insertion order. */
class MinHeap {
  private items: Array<{ key: number; order: number; value: number }> = [];
  private order = 0;

  push(key: number, value: number): void {
    this.items.push({ key, order: this.order, value });
    this.order += 1;
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.less(i, parent)) {
        [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
        i = parent;
      } else break;
    }
  }

  private less(a: number, b: number): boolean {
    const x = this.items[a] as { key: number; order: number; value: number };
    const y = this.items[b] as { key: number; order: number; value: number };
    return x.key < y.key || (x.key === y.key && x.order < y.order);
  }

  pop(): number | undefined {
    const top = this.items[0];
    if (top === undefined) return undefined;
    const last = this.items.pop() as { key: number; order: number; value: number };
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let best = i;
        if (l < this.items.length && this.less(l, best)) best = l;
        if (r < this.items.length && this.less(r, best)) best = r;
        if (best === i) break;
        [this.items[i], this.items[best]] = [this.items[best], this.items[i]];
        i = best;
      }
    }
    return top.value;
  }

  get size(): number {
    return this.items.length;
  }
}

function breadthFirst(grid: Grid, start: number, goal: number): RunResult {
  const steps: Step[] = [];
  const cameFrom = new Map<number, number>();
  const visited = new Uint8Array(grid.width * grid.height);
  const queued = new Uint8Array(grid.width * grid.height);
  const queue: number[] = [start];
  queued[start] = 1;
  const visitedOrder: number[] = [];
  record(steps, start, 1);

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as number;
    if (visited[current]) continue;
    visited[current] = 1;
    visitedOrder.push(current);
    record(steps, current, 0);
    if (current === goal) break;
    for (const n of neighbors(grid, current)) {
      if (visited[n] || queued[n]) continue;
      queued[n] = 1;
      cameFrom.set(n, current);
      queue.push(n);
      record(steps, n, 1);
    }
  }
  const costSoFar = new Map<number, number>([[start, 0]]);
  if (visited[goal]) {
    const path: number[] = [];
    let cur: number | undefined = goal;
    while (cur !== undefined) {
      path.push(cur);
      cur = cameFrom.get(cur);
    }
    path.reverse();
    costSoFar.set(goal, pathCost(grid, path));
  }
  return buildResult("BFS", grid, start, goal, visitedOrder, cameFrom, costSoFar, steps);
}

function weightedSearch(
  name: string,
  grid: Grid,
  start: number,
  goal: number,
  heuristic: ((index: number) => number) | null,
): RunResult {
  const steps: Step[] = [];
  const cameFrom = new Map<number, number>();
  const costSoFar = new Map<number, number>([[start, 0]]);
  const visited = new Uint8Array(grid.width * grid.height);
  const visitedOrder: number[] = [];
  const heap = new MinHeap();
  const priority = (index: number, g: number): number =>
    g + (heuristic ? heuristic(index) : 0);
  heap.push(heuristic ? heuristic(start) : 0, start);
  record(steps, start, 1);

  while (heap.size > 0) {
    const current = heap.pop() as number;
    if (visited[current]) continue;
    visited[current] = 1;
    visitedOrder.push(current);
    record(steps, current, 0);
    if (current === goal) break;
    for (const n of neighbors(grid, current)) {
      if (visited[n]) continue;
      const nextCost = (costSoFar.get(current) as number) + tileCost(grid, n);
      const known = costSoFar.get(n);
      if (known === undefined || nextCost < known) {
        costSoFar.set(n, nextCost);
        cameFrom.set(n, current);
        heap.push(priority(n, nextCost), n);
        record(steps, n, 1);
      }
    }
  }
  return buildResult(name, grid, start, goal, visitedOrder, cameFrom, costSoFar, steps);
}

export function bfs(grid: Grid, start: number, goal: number): RunResult {
  return breadthFirst(grid, start, goal);
}

export function dijkstra(grid: Grid, start: number, goal: number): RunResult {
  return weightedSearch("Dijkstra", grid, start, goal, null);
}

export function aStar(grid: Grid, start: number, goal: number): RunResult {
  const width = grid.width;
  const gx = goal % width;
  const gy = Math.floor(goal / width);
  const manhattan = (index: number): number => {
    const x = index % width;
    const y = Math.floor(index / width);
    return Math.abs(x - gx) + Math.abs(y - gy);
  };
  return weightedSearch("A*", grid, start, goal, manhattan);
}

export function runAll(grid: Grid, start: number, goal: number): RunResult[] {
  return [aStar(grid, start, goal), dijkstra(grid, start, goal), bfs(grid, start, goal)];
}
