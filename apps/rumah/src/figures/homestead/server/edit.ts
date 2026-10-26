// Server-only: turns a reader's request into a new config with Claude, rebuilds the scene in a child process,
// and keeps a short history so a change can be undone. Claude only ever returns data; nothing it says is run.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { CROPS, DEFAULT_CONFIG, FRUITS, LIMITS, sanitize, type HomesteadConfig } from "../config";
import { buildViews } from "../../../../print/views.mjs";

const run = promisify(execFile);
const ROOT = process.cwd();
const CONFIG_FILE = join(ROOT, "data", "homestead.json");
const HISTORY_FILE = join(ROOT, "data", "homestead-history.json");
const SCENE_FILE = join(ROOT, "src/figures/homestead/generated/scene.json");
const BUILD = join(ROOT, "src/figures/homestead/scene/build.ts");
const HISTORY_LIMIT = 20;

export async function currentConfig(): Promise<HomesteadConfig> {
  if (!existsSync(CONFIG_FILE)) return DEFAULT_CONFIG;
  return sanitize(JSON.parse(await readFile(CONFIG_FILE, "utf8")));
}

async function history(): Promise<HomesteadConfig[]> {
  if (!existsSync(HISTORY_FILE)) return [];
  return (JSON.parse(await readFile(HISTORY_FILE, "utf8")) as unknown[]).map(sanitize);
}

// One rebuild at a time: a second request waits for the first to finish.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

/** Builds the scene for a config in a temporary folder, then swaps it in with the config. */
async function rebuild(config: HomesteadConfig, { remember = true } = {}) {
  const work = await mkdtemp(join(tmpdir(), "homestead-"));
  try {
    const configPath = join(work, "config.json");
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await run(process.execPath, [BUILD, "--fast"], { cwd: ROOT, env: { ...process.env, HS_CONFIG: configPath, HS_OUT: work }, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    const previous = await currentConfig();
    if (remember && JSON.stringify(previous) !== JSON.stringify(config)) {
      const list = [...(await history()), previous].slice(-HISTORY_LIMIT);
      await writeFile(HISTORY_FILE, JSON.stringify(list, null, 2));
    }
    await mkdir(join(ROOT, "data"), { recursive: true });
    await copyFile(join(work, "scene.json"), SCENE_FILE);
    // The 360 corners follow the new config too; they build side by side in the background of this request.
    await buildViews(["c135", "c225", "c315", "c45"]).catch(() => undefined);
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

const EditSchema = z.object({
  config: z.object({
    title: z.string(),
    cars: z.number(),
    motorcycles: z.number(),
    hens: z.number(),
    beds: z.array(z.enum(CROPS)),
    fruits: z.array(z.enum(FRUITS)),
    shadeTrees: z.number(),
    lamps: z.number(),
    balcony: z.boolean(),
  }),
  reply: z.string(),
  unsupported: z.array(z.string()),
});

const SYSTEM = `Kamu mengubah konfigurasi sebuah figur isometrik "rumah tropis homestead": rumah dua lantai bergaya tropis modern Indonesia dengan carport, taman, kebun pangan, pohon buah, area jemur dan zona homestead (kandang ayam, kompos, gudang alat, tandon air hujan).
Pengguna menulis permintaan dalam bahasa sehari-hari. Kembalikan konfigurasi lengkap yang sudah diubah, balasan singkat, dan daftar permintaan yang tidak bisa dipenuhi.

Isi konfigurasi dan batasnya:
- title: judul figur, paling banyak ${LIMITS.titleChars} karakter.
- cars: mobil di carport, ${LIMITS.cars[0]}–${LIMITS.cars[1]}. motorcycles: motor, ${LIMITS.motorcycles[0]}–${LIMITS.motorcycles[1]}.
- hens: jumlah ayam, ${LIMITS.hens[0]}–${LIMITS.hens[1]}.
- beds: isi tiap bedengan kebun pangan, paling banyak ${LIMITS.beds[1]}, tiap isi salah satu dari: ${CROPS.join(", ")}.
- fruits: pohon buah, paling banyak ${LIMITS.fruits[1]}, tiap isi salah satu dari: ${FRUITS.join(", ")}.
- shadeTrees: pohon peneduh di halaman depan, ${LIMITS.shadeTrees[0]}–${LIMITS.shadeTrees[1]}. lamps: lampu taman di jalan setapak, ${LIMITS.lamps[0]}–${LIMITS.lamps[1]}.
- balcony: true bila balkon lantai 2 dipakai (pagar balkon), false bila tidak.

Aturan:
- Ubah hanya yang diminta; salin nilai lain apa adanya.
- Jika nilai yang diminta di luar batas, pakai batas terdekat dan sebutkan di balasan.
- Benda yang tidak ada di konfigurasi (misalnya kolam renang, kamar tambahan, warna dinding, denah ruang) tidak bisa dibuat dari sini: biarkan konfigurasi untuk bagian itu, masukkan ke "unsupported", dan jelaskan singkat di balasan.
- Balasan dalam bahasa Indonesia, satu atau dua kalimat, sebutkan apa yang berubah.
- Jika ada foto: perkirakan dari foto hal-hal yang ada di konfigurasi (misalnya jumlah mobil atau motor, jumlah ayam, jenis sayur atau pohon buah, jumlah pohon atau lampu), sebutkan singkat apa yang kamu baca dari foto, dan masukkan hal di foto yang tidak ada di konfigurasi ke "unsupported". Teks pengguna, bila ada, lebih diutamakan daripada foto.`;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export interface EditImage { mediaType: ImageType; data: string }

export interface EditResult { config: HomesteadConfig; reply: string; unsupported: string[]; changed: boolean }

let client: Anthropic | null = null;

export function editWithText(text: string, image?: EditImage): Promise<EditResult> {
  return exclusive(async () => {
    const before = await currentConfig();
    client ??= new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4096,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(EditSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...(image ? [{ type: "image" as const, source: { type: "base64" as const, media_type: image.mediaType, data: image.data } }] : []),
            { type: "text" as const, text: `Konfigurasi sekarang:\n${JSON.stringify(before, null, 2)}\n\nPermintaan:\n${text || "(tidak ada teks; sesuaikan rumah dengan foto)"}` },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return { config: before, reply: "Permintaan ini tidak bisa diproses.", unsupported: [text], changed: false };
    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Jawaban AI tidak bisa dibaca sebagai konfigurasi.");
    const config = sanitize(parsed.config);
    const changed = JSON.stringify(config) !== JSON.stringify(before);
    if (changed) await rebuild(config);
    return { config, reply: parsed.reply, unsupported: parsed.unsupported, changed };
  });
}

export function undo(): Promise<HomesteadConfig | null> {
  return exclusive(async () => {
    const list = await history();
    const previous = list.pop();
    if (!previous) return null;
    await rebuild(previous, { remember: false });
    await writeFile(HISTORY_FILE, JSON.stringify(list, null, 2));
    return previous;
  });
}

export function reset(): Promise<HomesteadConfig> {
  return exclusive(async () => {
    await rebuild(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  });
}

/** Editing spends API credit and rewrites files, so it is open in development and behind a token in production. */
export function mayEdit(request: Request) {
  const token = process.env.HS_EDIT_TOKEN;
  if (token) return request.headers.get("x-edit-token") === token;
  return process.env.NODE_ENV !== "production";
}

export async function hasHistory() {
  return (await history()).length > 0;
}
