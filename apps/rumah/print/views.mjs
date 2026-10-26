// Builds every static view the blueprint sheets and the 360 control use: the scene from four corners, flat
// elevations, plans from above, the exploded house and the opened floors. Four builds run at a time.
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(ROOT, "src/figures/homestead/scene/build.ts");
const HOUSE = "roof,upper,ground";

export const VIEWS = {
  c45: { az: 45, el: 30 },
  c135: { az: 135, el: 30 },
  c225: { az: 225, el: 30 },
  c315: { az: 315, el: 30 },
  front: { az: 90, el: 0, fit: "house", pieces: HOUSE },
  right: { az: 0, el: 0, fit: "house", pieces: HOUSE },
  rear: { az: 270, el: 0, fit: "house", pieces: HOUSE },
  left: { az: 180, el: 0, fit: "house", pieces: HOUSE },
  site: { az: 90, el: 90 },
  plan1: { az: 90, el: 90, fit: "house", pieces: "ground" },
  plan2: { az: 90, el: 90, fit: "house", pieces: "upper" },
  explode: { az: 45, el: 30, fit: "explode", pieces: HOUSE, explode: true },
  open1: { az: 45, el: 48, pieces: "ground,yard,stand", open: true },
  open2: { az: 45, el: 48, pieces: "upper", open: true },
};

export async function buildViews(names = Object.keys(VIEWS), { out } = {}) {
  const queue = [...names];
  const worker = async () => {
    for (let name = queue.shift(); name; name = queue.shift()) {
      const v = VIEWS[name];
      const env = { ...process.env, HS_VIEW: name, HS_AZIMUTH: String(v.az), HS_ELEVATION: String(v.el) };
      if (out) env.HS_OUT = out;
      if (v.fit) env.HS_FIT = v.fit;
      if (v.pieces) env.HS_PIECES = v.pieces;
      if (v.open) env.HS_OPEN = "1";
      if (v.explode) env.HS_EXPLODE = "1";
      const { stdout } = await run(process.execPath, [BUILD, "--fast"], { cwd: ROOT, env, maxBuffer: 16 << 20, timeout: 180_000 });
      process.stdout.write(stdout.split("\n").filter((l) => l.startsWith("view ")).join("\n") + "\n");
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildViews(process.argv.slice(2).length ? process.argv.slice(2) : undefined);
