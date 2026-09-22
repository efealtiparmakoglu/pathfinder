# pathfinder

Watch **A\*, Dijkstra and BFS** race through the same maze in your
terminal — with a maze generator, step-by-step animation and a stats
panel. Zero dependencies, TypeScript run natively by Node 22.18+.

```text
$ pathfinder --seed 11 --width 21 --height 11 --no-ansi
A* — visited 39 tiles, path 30 steps, cost 50
#####################
#S#···#·~·····#·~···#
#█###·~·###·###·###·#
...

ALGORITHM      VISITED      PATH      COST
------------------------------------------
A*                  39        30        50
Dijkstra            68        30        50
BFS                 69        30        50
```

## What is inside

- **Maze generator** — iterative recursive-backtracker over an odd tile
  grid, then two twists: ~8% of walls are braided away (killing dead
  ends) and ~12% of open tiles become **swamps** (cost 5) so weighted
  and weight-blind searchers have something to argue about.
- **Three searchers, one interface** — BFS (frontier queue), Dijkstra
  (binary min-heap, tie-broken by insertion order) and A\* (same heap +
  Manhattan heuristic). Each records its full visit/frontier/path step
  tape, which is what makes the animation and the determinism tests
  possible.
- **Animation** — the step tape replays in ANSI-colored frames
  (visited blue, frontier yellow, final path green), `--speed` sets how
  many tiles are revealed per frame and `--fps` the frame rate.
- **Stats panel** — visited tile count, path length and weighted cost
  per algorithm, so you can see A\* reaching the goal having touched
  half the tiles Dijkstra needed, and BFS occasionally buying a swamp
  ticket for one edge fewer.

## Usage

```
pathfinder [--width W] [--height H] [--seed N] [--algo astar|dijkstra|bfs|all]
           [--speed N] [--fps N] [--no-ansi]
```

Same seed, same maze, same race — every run is deterministic, which the
test suite exploits heavily. `--no-ansi` skips straight to the final
grids and the table (also what the CLI tests use).

## Development

```console
$ npm test        # 26 tests: generator, connectivity, optimality, determinism, CLI
```

Requires Node **22.18+** (native TypeScript type stripping; there is no
build step and nothing to install).

## License

MIT — see [LICENSE](LICENSE).
