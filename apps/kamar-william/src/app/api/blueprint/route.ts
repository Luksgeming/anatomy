// POST one blueprint shot (from /blueprint) and it is saved under print/shots/ with its marks in meta.json.
// Development only: it writes files into the project.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), "print", "shots");

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Hanya untuk development.", { status: 403 });
  const body = (await request.json()) as { id?: string; png?: string; done?: boolean; [k: string]: unknown };
  await mkdir(DIR, { recursive: true });
  const metaFile = join(DIR, "meta.json");
  const meta = JSON.parse(await readFile(metaFile, "utf8").catch(() => "{}")) as Record<string, unknown>;
  if (body.done) {
    meta.done = new Date().toISOString();
  } else if (body.id && /^[a-z0-9-]+$/.test(body.id) && typeof body.png === "string") {
    await writeFile(join(DIR, `${body.id}.png`), Buffer.from(body.png.replace(/^data:image\/png;base64,/, ""), "base64"));
    const { png: _png, ...rest } = body; // eslint-disable-line @typescript-eslint/no-unused-vars
    meta[body.id] = rest;
    delete meta.done;
  } else {
    return new Response("Bidikan tidak dikenal.", { status: 400 });
  }
  await writeFile(metaFile, JSON.stringify(meta, null, 2));
  return Response.json({ ok: true });
}
