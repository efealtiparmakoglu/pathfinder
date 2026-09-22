#!/usr/bin/env node
import { defaultEndpoints, generateMaze } from "./maze.ts";
import { bfs, dijkstra, aStar, runAll } from "./algorithms.ts";
import { frames, statsTable } from "./render.ts";

const USAGE = `pathfinder v1.0.0 — maze race between A*, Dijkstra and BFS in your terminal

USAGE
  pathfinder [options]

OPTIONS
  --width <N>     maze tiles across, odd number (default: 31)
  --height <N>    maze tiles down, odd number (default: 15)
  --seed <N>      maze seed (default: random-ish from the clock)
  --algo <name>   astar | dijkstra | bfs | all (default: all)
  --speed <N>     visited tiles per frame in animated mode (default: 6)
  --fps <N>       frames per second (default: 12)
  --no-ansi       print final grids and the stats table, no animation
  -h, --help      show this help
  -V, --version   print version

Zero dependencies, runs on Node 22.18+ via native TypeScript.`;

interface Args {
  width: number;
  height: number;
  seed: number;
  algo: string;
  speed: number;
  fps: number;
  ansi: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): { ok: true; args: Args } | { ok: false; message: string } {
  const args: Args = {
    width: 31,
    height: 15,
    seed: -1,
    algo: "all",
    speed: 6,
    fps: 12,
    ansi: true,
    help: false,
    version: false,
  };
  const num = (i: number, flag: string): number | string => {
    const value = argv[i + 1];
    if (value === undefined) return `${flag} requires a number`;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return `${flag} expects a positive integer`;
    return parsed;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    switch (arg) {
      case "--width": {
        const v = num(i, arg);
        if (typeof v === "string") return { ok: false, message: v };
        args.width = v;
        i += 1;
        break;
      }
      case "--height": {
        const v = num(i, arg);
        if (typeof v === "string") return { ok: false, message: v };
        args.height = v;
        i += 1;
        break;
      }
      case "--seed": {
        const v = num(i, arg);
        if (typeof v === "string") return { ok: false, message: v };
        args.seed = v;
        i += 1;
        break;
      }
      case "--speed": {
        const v = num(i, arg);
        if (typeof v === "string") return { ok: false, message: v };
        args.speed = v;
        i += 1;
        break;
      }
      case "--fps": {
        const v = num(i, arg);
        if (typeof v === "string") return { ok: false, message: v };
        args.fps = v;
        i += 1;
        break;
      }
      case "--algo": {
        const value = argv[i + 1];
        if (value === undefined) return { ok: false, message: `${arg} requires a value` };
        if (!["astar", "dijkstra", "bfs", "all"].includes(value)) {
          return { ok: false, message: `unknown algo "${value}" (astar | dijkstra | bfs | all)` };
        }
        args.algo = value;
        i += 1;
        break;
      }
      case "--no-ansi":
        args.ansi = false;
        break;
      case "-h":
      case "--help":
        args.help = true;
        return { ok: true, args };
      case "-V":
      case "--version":
        args.version = true;
        return { ok: true, args };
      default:
        return { ok: false, message: `unknown option "${arg}"` };
    }
  }
  return { ok: true, args };
}

function fail(message: string): never {
  process.stderr.write(`pathfinder: ${message}\n`);
  process.stderr.write(`pathfinder: run 'pathfinder --help' for usage\n`);
  process.exit(2);
}

function run(algo: string, grid: ReturnType<typeof generateMaze>, start: number, goal: number) {
  switch (algo) {
    case "astar": return [aStar(grid, start, goal)];
    case "dijkstra": return [dijkstra(grid, start, goal)];
    case "bfs": return [bfs(grid, start, goal)];
    default: return runAll(grid, start, goal);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) fail(parsed.message);
  const args = parsed.args;
  if (args.help) {
    process.stdout.write(USAGE + "\n");
    return;
  }
  if (args.version) {
    process.stdout.write("pathfinder 1.0.0\n");
    return;
  }
  if (args.width % 2 === 0 || args.height % 2 === 0 || args.width < 5 || args.height < 5) {
    fail("--width/--height must be odd and at least 5");
  }

  const seed = args.seed >= 0 ? args.seed : (Date.now() % 2147483647);
  const grid = generateMaze(args.width, args.height, seed);
  const { start, goal } = defaultEndpoints(grid);
  const results = run(args.algo, grid, start, goal);

  if (!args.ansi) {
    for (const result of results) {
      const frame = frames(grid, start, goal, result, { useAnsi: false, chunk: Infinity });
      process.stdout.write(String(frame.at(-1)) + "\n\n");
    }
  } else {
    const frameDelay = 1000 / args.fps;
    process.stdout.write("\x1b[?25l"); // hide cursor
    try {
      for (const result of results) {
        for (const frame of frames(grid, start, goal, result, { useAnsi: true, chunk: args.speed })) {
          process.stdout.write("\x1b[2J\x1b[H" + frame + "\n");
          await sleep(frameDelay);
        }
      }
    } finally {
      process.stdout.write("\x1b[?25h"); // restore cursor
    }
  }
  process.stdout.write("\nseed " + seed + "\n\n");
  process.stdout.write(statsTable(results));
}

if (process.argv[1] !== undefined && import.meta.filename === process.argv[1]) {
  await main();
}
