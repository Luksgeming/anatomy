// POST { action: "edit", text } | { action: "undo" } | { action: "reset" } → rebuilds the homestead scene.
import Anthropic from "@anthropic-ai/sdk";
import { IMAGE_TYPES, editWithText, hasHistory, mayEdit, reset, undo, type EditImage, type ImageType } from "@/figures/homestead/server/edit";

const MAX_TEXT = 500;
// Base64 of the downscaled photo the edit box sends; about 3.7 MB of image.
const MAX_IMAGE_CHARS = 5_000_000;

export async function POST(request: Request) {
  if (!mayEdit(request)) return Response.json({ error: "Mengubah rumah butuh token edit." }, { status: 401 });
  let body: { action?: string; text?: unknown; image?: { mediaType?: unknown; data?: unknown } };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak dikenal." }, { status: 400 });
  }
  try {
    if (body.action === "undo") {
      const config = await undo();
      return Response.json(config ? { config, reply: "Perubahan terakhir dibatalkan.", canUndo: await hasHistory() } : { error: "Tidak ada perubahan untuk dibatalkan." }, { status: config ? 200 : 409 });
    }
    if (body.action === "reset") {
      const config = await reset();
      return Response.json({ config, reply: "Rumah dikembalikan ke bentuk awal.", canUndo: await hasHistory() });
    }
    const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    let image: EditImage | undefined;
    if (body.image) {
      const { mediaType, data } = body.image;
      if (typeof mediaType !== "string" || !IMAGE_TYPES.includes(mediaType as ImageType) || typeof data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(data))
        return Response.json({ error: "Foto harus berformat JPG, PNG, WebP atau GIF." }, { status: 400 });
      if (data.length > MAX_IMAGE_CHARS) return Response.json({ error: "Foto terlalu besar." }, { status: 413 });
      image = { mediaType: mediaType as ImageType, data };
    }
    if (!text && !image) return Response.json({ error: "Tulis perubahan atau pilih foto dulu." }, { status: 400 });
    const result = await editWithText(text, image);
    return Response.json({ ...result, canUndo: await hasHistory() });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return Response.json({ error: "API key Anthropic tidak valid atau belum diatur (ANTHROPIC_API_KEY)." }, { status: 500 });
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: "Terlalu banyak permintaan ke AI, coba lagi sebentar." }, { status: 429 });
    if (error instanceof Anthropic.APIError) return Response.json({ error: `AI sedang bermasalah (${error.status}).` }, { status: 502 });
    // The SDK raises a plain Error when it finds no credentials at all, before any request is made.
    const noCredentials = error instanceof Error && /authentication method/i.test(error.message);
    if (error instanceof Anthropic.AnthropicError || noCredentials) return Response.json({ error: "Kredensial Anthropic belum diatur. Isi ANTHROPIC_API_KEY di .env.local lalu jalankan ulang server." }, { status: 500 });
    console.error("homestead edit failed:", error);
    return Response.json({ error: "Gagal membangun ulang rumah. Lihat log server." }, { status: 500 });
  }
}
