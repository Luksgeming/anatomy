// Lays the room's blueprint shots (print/shots/, made by the /blueprint page) out on four A3 landscape sheets and
// prints them to PDF with Chrome: the blue sheet of plan and four section elevations with dimensions, the exploded
// room with its parts named, the four corner views, and eight close-ups. Dimensions are drawn over each picture at
// the pixel positions the photographer projected from the 3D model.
// Usage: node print/sheets.mjs   (run `npm run blueprint` to photograph and print in one go)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, "shots");
const OUT = join(HERE, "blueprint-kamar-william-a3");
const meta = JSON.parse(readFileSync(join(SHOTS, "meta.json"), "utf8"));
if (!meta.done) throw new Error("Bidikan belum lengkap: buka /blueprint dulu (npm run blueprint).");

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** A shot as a data URL: line drawings stay PNG (crisp), colour renders go in as JPEG to keep the PDF small. */
const img = (id) => {
  if (meta[id].pxPerM) return `data:image/png;base64,${readFileSync(join(SHOTS, `${id}.png`)).toString("base64")}`;
  const jpg = join(SHOTS, `${id}.jpg`);
  if (!existsSync(jpg)) execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", join(SHOTS, `${id}.png`), "--out", jpg], { stdio: "ignore" });
  return `data:image/jpeg;base64,${readFileSync(jpg).toString("base64")}`;
};
const mm = (m) => Math.round(m * 1000).toLocaleString("id-ID").replace(/\./g, " ");

/** A dimension line between two marks of a shot, offset sideways in pixels, with ticks and its label. */
function dim(shot, a, b, offset, label, size = 22) {
  const p = shot.marks[a];
  const q = shot.marks[b];
  if (!p || !q) return "";
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  const o = (pt, d) => [pt[0] + nx * d, pt[1] + ny * d];
  const [p1, q1] = [o(p, offset), o(q, offset)];
  const s = Math.sign(offset) || 1;
  const ext = (pt) => `M${o(pt, s * 4).join(" ")}L${o(pt, offset + s * 6).join(" ")}`;
  const tick = (pt) => `M${pt[0] - 8} ${pt[1] + 8}L${pt[0] + 8} ${pt[1] - 8}`;
  const mid = [(p1[0] + q1[0]) / 2 + nx * size * 0.85 * s, (p1[1] + q1[1]) / 2 + ny * size * 0.85 * s];
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  return `<path class="ext" d="${ext(p)}${ext(q)}"/><path class="dim" d="M${p1.join(" ")}L${q1.join(" ")}${tick(p1)}${tick(q1)}"/><text font-size="${size}" text-anchor="middle" dominant-baseline="middle" transform="translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)}) rotate(${angle.toFixed(1)})">${esc(label)}</text>`;
}

/** A name written on the drawing at a mark, with a halo so it reads over lines. */
function tag(shot, at, text, sub, size = 20) {
  const p = shot.marks[at];
  if (!p) return "";
  return `<text class="halo" font-size="${size}" text-anchor="middle" x="${p[0]}" y="${p[1]}">${esc(text)}${sub ? `<tspan class="sub" x="${p[0]}" dy="${size * 1.1}" font-size="${size * 0.78}">${esc(sub)}</tspan>` : ""}</text>`;
}

/** A leader from a mark out to a label on the left or right edge. */
function callout(shot, at, side, y, text, size = 24) {
  const p = shot.marks[at];
  if (!p) return "";
  // Labels sit in the sheet's margin beside the picture (the svg overflows its box), leaders run in to the part.
  const x = side < 0 ? -24 : shot.w + 24;
  return `<path class="lead" d="M${p[0]} ${p[1]}L${x - side * 60} ${y}L${x} ${y}"/><circle class="pin" cx="${p[0]}" cy="${p[1]}" r="4"/><text class="halo" font-size="${size}" text-anchor="${side < 0 ? "end" : "start"}" dominant-baseline="middle" x="${x - side * -8}" y="${y}">${esc(text)}</text>`;
}

/** A second line under a callout's label. */
function label2(shot, side, y, text, size = 22) {
  const x = side < 0 ? -32 : shot.w + 32;
  return `<text class="halo sub" font-size="${size}" text-anchor="${side < 0 ? "end" : "start"}" dominant-baseline="middle" x="${x}" y="${y}">${esc(text)}</text>`;
}

/** A pixel-length scale bar of `meters` metres for an orthographic shot. */
function scaleBar(shot, x, y, meters = 1) {
  if (!shot.pxPerM) return "";
  const step = shot.pxPerM * 0.25;
  let out = "";
  for (let i = 0; i < meters * 4; i++) out += `<rect class="${i % 2 ? "bar-b" : "bar-a"}" x="${x + i * step}" y="${y}" width="${step}" height="8"/>`;
  return `${out}<text font-size="16" x="${x}" y="${y + 30}">0</text><text font-size="16" text-anchor="end" x="${x + meters * shot.pxPerM}" y="${y + 30}">${meters} m</text>`;
}

const figure = (id, overlay = "", cls = "") => {
  const s = meta[id];
  return `<div class="pic ${cls}" style="aspect-ratio:${s.w}/${s.h}"><img src="${img(id)}" alt=""/><svg viewBox="0 0 ${s.w} ${s.h}">${overlay}</svg></div>`;
};
const cell = (title, body, cls = "") => `<figure class="cell ${cls}">${body}<figcaption>${esc(title)}</figcaption></figure>`;
const titleBlock = (title, no, scale = "lihat skala batang") => `
  <div class="tb">
    <div class="tb-row tb-big"><span>KAMAR WILLIAM</span></div>
    <div class="tb-row"><span>Gambar</span><b>${esc(title)}</b></div>
    <div class="tb-row"><span>Ruang</span><b>3 × 3 × 3 m · cat hangat · lampu oranye remang</b></div>
    <div class="tb-row tb-split"><span>Skala</span><b>${scale}</b><span>Lembar</span><b>${no} / 4</b></div>
  </div>`;

// ── Sheet 1: plan and elevations on blue ─────────────────────────────────────
const P = meta.plan;
const planOver =
  dim(P, "nw", "ne", -40, mm(3)) +
  dim(P, "ne", "se", -40, mm(3)) +
  dim(P, "door0", "door1", -95, mm(0.8), 18) +
  dim(P, "mw0", "mw1", -95, mm(0.4), 18) +
  dim(P, "ew0", "ew1", -95, mm(0.35), 18) +
  tag(P, "bed", "KASUR", "160 × 200") +
  tag(P, "desk", "MEJA", "62 × 158") +
  tag(P, "wardrobe", "LEMARI", "62 × 54") +
  tag(P, "rack", "RAK BAJU", "") +
  tag(P, "nightstand", "NAKAS", "", 16) +
  tag(P, "chair", "KURSI", "", 16) +
  tag(P, "softbox", "SOFTBOX", "", 14) +
  tag(P, "plant", "TANAMAN", "", 14) +
  scaleBar(P, 150, P.h - 40, 1);

const elev = (id, extra) => {
  const s = meta[id];
  return figure(id, dim(s, "l0", "l1", 34, mm(3), 20) + dim(s, "t0", "l0", 34, mm(3), 20) + extra(s) + scaleBar(s, 60, s.h - 50, 1));
};
const north = elev("north", (s) => dim(s, "door0", "door1", -46, mm(0.8), 18) + dim(s, "door1", "doorTop", -40, mm(2.1), 18) + dim(s, "mw0", "mw1", -34, mm(0.4), 16) + dim(s, "mwTop", "mwSill", 34, mm(1.35), 16));
const east = elev("east", (s) => dim(s, "ew0", "ew1", -34, mm(0.35), 16) + dim(s, "ewTop", "ewSill", 34, mm(1.3), 16) + dim(s, "desk0", "desk1", 30, mm(1.58), 16));
const south = elev("south", (s) => dim(s, "wd0", "wd1", -40, mm(0.62), 16) + dim(s, "wd1", "wdTop", 34, mm(1.82), 16));
const west = elev("west", (s) => dim(s, "bed0", "bed1", -50, mm(1.74), 16));

const sheet1 = `<section class="sheet blue"><div class="frame">
  <div class="grid g1">
    ${cell("DENAH · POTONGAN +2,00", figure("plan", planOver), "plan")}
    ${cell("TAMPAK UTARA · PINTU", north)}
    ${cell("TAMPAK TIMUR · MEJA & AC", east)}
    ${cell("TAMPAK SELATAN · LEMARI & RAK", south)}
    ${cell("TAMPAK BARAT · KASUR", west)}
  </div>
  <ul class="notes">
    <li>Ukuran dalam milimeter. Tampak adalah potongan di tengah ruang, dilihat dari dalam.</li>
    <li>Lampu hangat 2700 K: gantung rotan, LED headboard, LED kolong kasur, lampu tidur, lampu meja.</li>
  </ul>${titleBlock("Denah & tampak dinding", 1)}</div></section>`;

// ── Sheet 2: exploded ────────────────────────────────────────────────────────
const E = meta.explode;
const explodeOver =
  callout(E, "ceiling", -1, 140, "Plafon gypsum, list profil,", 26) + label2(E, -1, 172, "lampu gantung rotan") +
  callout(E, "north", -1, 380, "Dinding utara: pintu kayu,", 26) + label2(E, -1, 412, "jendela kaca, 5 lubang angin") +
  callout(E, "west", -1, 650, "Dinding barat: kisi kayu oak", 26) + label2(E, -1, 682, "dengan LED hangat") +
  callout(E, "bed", -1, 900, "Dipan rendah 160 × 200,", 26) + label2(E, -1, 932, "headboard kain") +
  callout(E, "east", 1, 300, "Dinding timur: jendela 3 kaca,", 26) + label2(E, 1, 332, "AC, rak buku") +
  callout(E, "desk", 1, 560, "Meja kerja oak, kaki baja,", 26) + label2(E, 1, 592, "kursi kerja") +
  callout(E, "wardrobe", 1, 820, "Lemari jati, rak baju,", 26) + label2(E, 1, 852, "bangku sepatu") +
  callout(E, "south", 1, 1060, "Dinding selatan (transparan)", 26);
const sheet2 = `<section class="sheet paper"><div class="frame">
  <div class="grid g-one">${cell("EXPLODED VIEW · DINDING DIGESER KELUAR, PLAFON DIANGKAT", figure("explode", explodeOver), "big")}</div>
  ${titleBlock("Exploded view", 2, "tanpa skala")}</div></section>`;

// ── Sheet 3: four corners ────────────────────────────────────────────────────
const corners = [["c-ne", "DARI SUDUT PINTU (TIMUR LAUT)"], ["c-se", "DARI SUDUT TANAMAN (TENGGARA)"], ["c-sw", "DARI SUDUT RAK BAJU (BARAT DAYA)"], ["c-nw", "DARI SUDUT NAKAS (BARAT LAUT)"]];
const sheet3 = `<section class="sheet paper"><div class="frame">
  <div class="grid g4">${corners.map(([id, t]) => cell(t, figure(id))).join("")}</div>${titleBlock("Tampak 360° dari empat sudut", 3, "tanpa skala")}</div></section>`;

// ── Sheet 4: details ─────────────────────────────────────────────────────────
const details = [
  ["d-desk", "Meja kerja", "Laptop, alas meja motif ombak, lampu kap emas, figur, kipas biru, jam weker"],
  ["d-bed", "Kepala kasur", "Headboard kain, kisi kayu oak dengan LED hangat, dua lukisan"],
  ["d-wardrobe", "Lemari jati", "Pintu panel dengan stiker, keranjang anyaman di atas"],
  ["d-rack", "Rak baju", "Rak baja berdiri, gantungan kayu, bangku sepatu"],
  ["d-door", "Pintu & poster", "Pintu kayu lima panel, gagang tuas, poster"],
  ["d-window", "Jendela & AC", "Jendela tiga kaca bertirai linen, AC 24 °C"],
  ["d-nightstand", "Nakas & lampu tidur", "Lampu keramik dengan kap linen, buku, ponsel"],
  ["d-pendant", "Lampu gantung rotan", "Anyaman rotan, bohlam hangat 2700 K"],
];
const sheet4 = `<section class="sheet paper"><div class="frame">
  <div class="grid g8">${details.map(([id, t, s]) => `<figure class="cell detail">${figure(id)}<figcaption>${esc(t)}<small>${esc(s)}</small></figcaption></figure>`).join("")}</div>
  ${titleBlock("Detail", 4, "tanpa skala")}</div></section>`;

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Blueprint kamar William</title><style>
@page { size: 420mm 297mm; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #777; font-family: "JetBrains Mono", "SF Mono", Menlo, monospace; }
.sheet { width: 420mm; height: 297mm; padding: 9mm; break-after: page; overflow: hidden; position: relative; }
.frame { position: relative; height: 100%; border: 0.5mm solid var(--line); padding: 6mm; display: flex; flex-direction: column; }
.blue { --line: #e8f0ff; --ink: #ffffff; --muted: #b8cdf0; --halo: #12417e; background-color: #12417e;
  background-image: linear-gradient(#ffffff14 1px, transparent 1px), linear-gradient(90deg, #ffffff14 1px, transparent 1px), linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px);
  background-size: 20mm 20mm, 20mm 20mm, 4mm 4mm, 4mm 4mm; }
.paper { --line: #1b1d22; --ink: #1b1d22; --muted: #6b6f78; --halo: #f4efe6; background: #f4efe6; }
.grid { flex: 1; display: grid; gap: 4mm; min-height: 0; padding-bottom: 30mm; }
.g1 { grid-template-columns: 1.25fr 1fr 1fr; grid-template-rows: 1fr 1fr; grid-template-areas: "p a b" "p c d"; }
.g1 .plan { grid-area: p; }
.g-one { grid-template-columns: 1fr; padding: 0 92mm 0; }
.g4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.g8 { grid-template-columns: repeat(4, 1fr); grid-template-rows: 1fr 1fr; }
.cell { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; min-width: 0; }
.pic { position: relative; max-width: 100%; max-height: calc(100% - 8mm); height: 100%; }
.pic img, .pic svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.pic img { object-fit: contain; }
.paper .pic img { border-radius: 2mm; }
.cell figcaption { color: var(--ink); font-size: 9.5pt; letter-spacing: .12em; padding-top: 1.5mm; text-align: center; text-decoration: underline; text-underline-offset: 3px; }
.cell figcaption small { display: block; text-decoration: none; letter-spacing: .02em; font-size: 7.2pt; color: var(--muted); }
svg text { fill: var(--ink); font-family: inherit; letter-spacing: .04em; }
svg .dim, svg .ext, svg .lead { fill: none; stroke: var(--ink); stroke-width: 1.4; }
svg .ext { stroke-width: 0.9; opacity: .8; }
svg .lead { stroke-width: 1.2; }
svg .pin { fill: var(--ink); }
svg .halo { paint-order: stroke; stroke: var(--halo); stroke-width: 6px; stroke-linejoin: round; }
svg .sub { fill: var(--muted); }
svg .bar-a { fill: var(--ink); } svg .bar-b { fill: var(--ink); opacity: .35; }
.tb { position: absolute; right: 6mm; bottom: 6mm; width: 120mm; border: 0.4mm solid var(--line); color: var(--ink); font-size: 8pt; background: inherit; }
.tb-row { display: flex; gap: 3mm; padding: 1.4mm 2.5mm; border-top: 0.25mm solid var(--line); }
.tb-row:first-child { border-top: 0; }
.tb-row span { color: var(--muted); min-width: 16mm; }
.tb-big { font-size: 11pt; letter-spacing: .1em; justify-content: center; }
.tb-big span { color: var(--ink); }
.tb-split b { flex: 1; }
.notes { position: absolute; left: 6mm; bottom: 6mm; width: 230mm; margin: 0; padding-left: 5mm; color: var(--ink); font-size: 8pt; line-height: 1.6; }
@media screen { .sheet { margin: 10px auto; box-shadow: 0 2px 12px #0004; } }
</style></head><body>${sheet1}${sheet2}${sheet3}${sheet4}</body></html>`;
writeFileSync(`${OUT}.html`, html);

const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", process.env.CHROME_PATH].find((p) => p && existsSync(p));
if (!chrome) throw new Error("Chrome tidak ditemukan; set CHROME_PATH.");
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${OUT}.pdf`, `file://${OUT}.html`], { stdio: "ignore", timeout: 180_000 });
mkdirSync(join(HERE, "..", "public", "blueprint"), { recursive: true });
writeFileSync(join(HERE, "..", "public", "blueprint", "blueprint-kamar-william-a3.pdf"), readFileSync(`${OUT}.pdf`));
console.log("sheets · 4 lembar A3 → print/blueprint-kamar-william-a3.pdf (+ public/blueprint/)");
