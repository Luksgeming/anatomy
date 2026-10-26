// Downloads CC0 PBR materials from ambientCG (1K JPG) into an app's public/textures/<id>/ folder:
// color.jpg, normal.jpg (OpenGL), roughness.jpg and ao.jpg when the material has one.
// Usage: node scripts/fetch-textures.mjs <app> <id> [id...]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [app, ...ids] = process.argv.slice(2);
if (!app || !ids.length) throw new Error("usage: node scripts/fetch-textures.mjs <app> <id> [id...]");
const root = join(import.meta.dirname, "..", "apps", app, "public", "textures");
const MAPS = { Color: "color", NormalGL: "normal", Roughness: "roughness", AmbientOcclusion: "ao" };

for (const id of ids) {
  const out = join(root, id);
  if (existsSync(join(out, "color.jpg"))) {
    console.log(`${id} · ada`);
    continue;
  }
  const work = join(tmpdir(), `acg-${id}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  // curl with a time limit: the download host is sometimes very slow, and one stuck file must not block the rest.
  try {
    execFileSync("curl", ["-sfL", "-m", "420", "-o", join(work, "a.zip"), `https://ambientcg.com/get?file=${id}_1K-JPG.zip`]);
  } catch {
    console.log(`${id} · gagal (timeout)`);
    continue;
  }
  execFileSync("unzip", ["-q", "-o", join(work, "a.zip"), "-d", work]);
  mkdirSync(out, { recursive: true });
  for (const file of readdirSync(work)) {
    const m = file.match(/_1K-JPG_(\w+)\.jpg$/);
    if (m && MAPS[m[1]]) renameSync(join(work, file), join(out, `${MAPS[m[1]]}.jpg`));
  }
  rmSync(work, { recursive: true, force: true });
  console.log(`${id} · ${readdirSync(out).join(", ")}`);
}
