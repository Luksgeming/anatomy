// `npm run blueprint`: starts the dev server, lets the /blueprint page photograph the room in headless Chrome,
// stops the server again, and lays the shots out as the A3 PDF (print/sheets.mjs).
import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PORT = 3011;
const actions = JSON.stringify([["until", 'document.body.dataset.ready === "1"', 300000]]);

rmSync(join(HERE, "shots"), { recursive: true, force: true });
const server = spawn("npx", ["next", "dev", "-p", String(PORT)], { cwd: ROOT, stdio: "ignore", detached: true });
const stop = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};
process.on("exit", stop);
try {
  execFileSync("curl", ["-s", "--retry", "60", "--retry-delay", "2", "--retry-connrefused", "-o", "/dev/null", `http://localhost:${PORT}/`]);
  execFileSync(process.execPath, [join(ROOT, "../../packages/iso-kit/tools/drive.mjs"), `http://localhost:${PORT}/blueprint`, actions, "--width", "1200", "--height", "800"], { stdio: "inherit" });
} finally {
  stop();
}
execFileSync(process.execPath, [join(HERE, "sheets.mjs")], { stdio: "inherit" });
