"use client";
// The edit box: a reader writes a change, the server asks Claude for a new config, rebuilds the scene, and the page refreshes.
import * as React from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = ["Tambah ayam jadi 6", "Carport cukup 1 mobil dan 2 motor", "Bedengan semua cabai dan tomat", "Pohon buah: 2 pepaya dan 2 pisang", "Ganti judul jadi Rumah Pak Mulki"];

// Photos are shrunk in the browser to Claude's sweet spot (1568 px on the long side) and sent as JPEG.
const MAX_SIDE = 1568;
async function shrink(file: Blob): Promise<{ mediaType: "image/jpeg"; data: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.86);
  return { mediaType: "image/jpeg", data: url.slice(url.indexOf(",") + 1), preview: url };
}

type Status = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "done"; text: string; unsupported: string[] } | { kind: "error"; text: string };

export function HomesteadEdit() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const [canUndo, setCanUndo] = React.useState(false);
  const [token, setToken] = React.useState("");
  const [needsToken, setNeedsToken] = React.useState(false);
  const [photo, setPhoto] = React.useState<{ mediaType: "image/jpeg"; data: string; preview: string } | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  async function takePhoto(file: Blob | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setPhoto(await shrink(file));
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "error", text: "Foto tidak bisa dibaca." });
    }
  }
  const busy = status.kind === "busy";

  // A token saved from an earlier visit is read when a request goes out, not during render.
  const tokenNow = () => {
    if (token) return token;
    try {
      return localStorage.getItem("hs-edit-token") ?? "";
    } catch {
      return "";
    }
  };

  async function send(body: Record<string, unknown>, label: string) {
    setStatus({ kind: "busy", text: label });
    try {
      const response = await fetch("/api/homestead", {
        method: "POST",
        headers: { "content-type": "application/json", ...(tokenNow() ? { "x-edit-token": tokenNow() } : {}) },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.status === 401) {
        setNeedsToken(true);
        setStatus({ kind: "error", text: result.error });
        return;
      }
      if (!response.ok) {
        setStatus({ kind: "error", text: result.error ?? "Terjadi kesalahan." });
        return;
      }
      setCanUndo(Boolean(result.canUndo));
      setStatus({ kind: "done", text: result.reply, unsupported: result.unsupported ?? [] });
      if (body.action === "edit") {
        setText("");
        setPhoto(null);
      }
      React.startTransition(() => router.refresh());
    } catch {
      setStatus({ kind: "error", text: "Tidak bisa menghubungi server." });
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if ((!text.trim() && !photo) || busy) return;
    const image = photo ? { mediaType: photo.mediaType, data: photo.data } : undefined;
    send({ action: "edit", text, image }, photo ? "AI sedang membaca foto dan membangun ulang rumah…" : "AI sedang membaca permintaan dan membangun ulang rumah…");
  };

  const saveToken = (value: string) => {
    setToken(value);
    try {
      localStorage.setItem("hs-edit-token", value);
    } catch {}
  };

  return (
    <section className="hs-edit" aria-label="Ubah rumah dengan teks">
      <form className="hs-edit-form" onSubmit={submit}>
        <label className="hs-edit-label" htmlFor="hs-edit-text">Ubah rumah</label>
        <div className="hs-edit-row">
          <textarea
            id="hs-edit-text"
            className="hs-edit-input"
            rows={2}
            maxLength={500}
            placeholder="Misalnya: tambah ayam jadi 6 dan bedengannya semua kangkung. Bisa juga tempel screenshot (⌘V) atau pilih Foto."
            value={text}
            disabled={busy}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) submit(event);
            }}
            onPaste={(event) => {
              const file = [...event.clipboardData.items].find((item) => item.type.startsWith("image/"))?.getAsFile();
              if (file) {
                event.preventDefault();
                takePhoto(file);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const file = event.dataTransfer.files[0];
              if (file?.type.startsWith("image/")) {
                event.preventDefault();
                takePhoto(file);
              }
            }}
          />
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => takePhoto(event.target.files?.[0])} />
          <button type="button" className="hs-button hs-edit-photo" disabled={busy} onClick={() => fileInput.current?.click()} aria-label="Pilih foto">
            Foto
          </button>
          <button type="submit" className="hs-button hs-edit-send" disabled={busy || (!text.trim() && !photo)}>
            {busy ? "Memproses…" : "Ubah"}
          </button>
        </div>
        {photo ? (
          <div className="hs-edit-photo-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL preview, not a page image */}
            <img src={photo.preview} alt="Foto yang akan dikirim" />
            <span>Foto siap dikirim. Tambahkan teks bila perlu, lalu tekan Ubah.</span>
            <button type="button" className="hs-chip" disabled={busy} onClick={() => setPhoto(null)}>
              Hapus foto
            </button>
          </div>
        ) : null}
        <div className="hs-edit-examples">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="hs-chip" disabled={busy} onClick={() => setText(example)}>
              {example}
            </button>
          ))}
        </div>
      </form>
      {needsToken ? (
        <label className="hs-edit-token">
          Token edit
          <input type="password" value={token} onChange={(event) => saveToken(event.target.value)} placeholder="HS_EDIT_TOKEN" />
        </label>
      ) : null}
      <div className="hs-edit-status" role="status" aria-live="polite" data-kind={status.kind}>
        {status.kind === "busy" ? <span className="hs-spinner" aria-hidden="true" /> : null}
        {status.kind !== "idle" ? <span>{status.text}</span> : null}
        {status.kind === "done" && status.unsupported.length ? <span className="hs-edit-note">Belum bisa dari sini: {status.unsupported.join(", ")}.</span> : null}
      </div>
      <div className="hs-edit-actions">
        <button type="button" className="hs-button" disabled={busy || !canUndo} onClick={() => send({ action: "undo" }, "Membatalkan perubahan terakhir…")}>
          Batalkan
        </button>
        <button type="button" className="hs-button" disabled={busy} onClick={() => send({ action: "reset" }, "Mengembalikan ke bentuk awal…")}>
          Kembalikan awal
        </button>
      </div>
    </section>
  );
}
