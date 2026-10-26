// GET a static view of the house from another corner (built by print/views.mjs) for the 360 control.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { connection } from "next/server";

const CORNERS = new Set(["c45", "c135", "c225", "c315"]);

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  await connection();
  const { name } = await params;
  if (!CORNERS.has(name)) return new Response("Tidak ada tampak itu.", { status: 404 });
  try {
    const svg = await readFile(join(process.cwd(), "src/figures/homestead/generated/views", `${name}.svg`), "utf8");
    return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-cache" } });
  } catch {
    return new Response("Tampak belum dibangun: jalankan npm run views.", { status: 404 });
  }
}
