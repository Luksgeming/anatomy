// Blueprint sheets for the tropical house, A3 landscape: a blue drawing sheet of elevations and the site plan with
// dimensions, a blue sheet of floor plans, the exploded house, the 360 views and a sheet of details. Every drawing is
// one of the static views from print/views.mjs, and every dimension is projected through that view's own camera.
// Usage: node print/sheets.mjs [--build]   (--build rebuilds the views first)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildViews } from "./views.mjs";
import { BACK_ROW, CARPORT, DRYING, EAVE, F1, F2, FRONT_Y, GF, HOMESTEAD, HOUSE, PLOT, PORCH, RIGHT_X, ROOF_PITCH, TANK, TERRACE, UF, BEDS } from "../src/figures/homestead/scene/world.ts";
import { CONFIG } from "../src/figures/homestead/scene/config-runtime.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const VIEWS = join(ROOT, "src/figures/homestead/generated/views");
const OUT = join(HERE, "blueprint-rumah-a3");
if (process.argv.includes("--build") || !existsSync(join(VIEWS, "front.svg"))) await buildViews();

const RIDGE_Z = EAVE + (HOUSE.d / 2) * Math.tan((ROOF_PITCH * Math.PI) / 180);
const M = (units) => units * 0.05; // world units are 5 cm
const mm = (units) => Math.round(units * 50).toLocaleString("id-ID").replace(/\./g, " ");
const m2 = (w, d) => (M(w) * M(d)).toLocaleString("id-ID", { maximumFractionDigits: 1 });
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function view(name) {
  const svg = readFileSync(join(VIEWS, `${name}.svg`), "utf8");
  const { camera, width, height } = JSON.parse(readFileSync(join(VIEWS, `${name}.json`), "utf8"));
  const [sinA, cosA, sinE, cosE] = camera.cam;
  const project = ([x, y, z]) => [camera.origin[0] + camera.k * (x * sinA - y * cosA), camera.origin[1] + camera.k * ((x * cosA + y * sinA) * sinE - z * cosE)];
  return { svg, project, width, height, k: camera.k };
}

/** Puts overlay markup inside a view's svg and optionally crops its viewBox. */
function compose(v, overlay = "", crop) {
  let svg = v.svg.replace("</svg>", `<g class="bp-over">${overlay}</g></svg>`);
  if (crop) svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${crop.map((n) => n.toFixed(1)).join(" ")}" preserveAspectRatio="xMidYMid meet"`);
  return svg;
}

// ── Dimension drawing in a view's own coordinates ──────────────────────────
function dimension(v, a, b, offset, label, { size = 24 } = {}) {
  const [p, q] = [v.project(a), v.project(b)];
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  const o = (pt, d) => [pt[0] + nx * d, pt[1] + ny * d];
  const [p1, q1] = [o(p, offset), o(q, offset)];
  const ext = (pt, end) => `M${o(pt, Math.sign(offset) * 3).map((n) => n.toFixed(1)).join(" ")}L${o(end, offset + Math.sign(offset) * 4).map((n) => n.toFixed(1)).join(" ")}`;
  const tick = (pt) => `M${(pt[0] - 7).toFixed(1)} ${(pt[1] + 7).toFixed(1)}L${(pt[0] + 7).toFixed(1)} ${(pt[1] - 7).toFixed(1)}`;
  const mid = [(p1[0] + q1[0]) / 2 + nx * (size * 0.9) * Math.sign(offset), (p1[1] + q1[1]) / 2 + ny * (size * 0.9) * Math.sign(offset)];
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const upright = angle > 90 || angle < -90 ? angle + 180 : angle;
  return `<path class="bp-ext" d="${ext(p, p)}${ext(q, q)}"/><path class="bp-dim" d="M${p1.map((n) => n.toFixed(1)).join(" ")}L${q1.map((n) => n.toFixed(1)).join(" ")}${tick(p1)}${tick(q1)}"/><text class="bp-t" font-size="${size}" text-anchor="middle" dominant-baseline="middle" transform="translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)}) rotate(${upright.toFixed(1)})">${esc(label)}</text>`;
}

function label(v, at, text, { size = 24, anchor = "middle", sub } = {}) {
  const [x, y] = v.project(at);
  return `<text class="bp-t bp-halo" font-size="${size}" text-anchor="${anchor}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${esc(text)}${sub ? `<tspan class="bp-sub" x="${x.toFixed(1)}" dy="${(size * 1.15).toFixed(1)}" font-size="${(size * 0.78).toFixed(1)}">${esc(sub)}</tspan>` : ""}</text>`;
}

/** A pointer from a label to a spot on the drawing. */
function callout(v, at, dx, dy, text, size = 22) {
  const [x, y] = v.project(at);
  const tx = x + dx;
  const ty = y + dy;
  return `<path class="bp-dim" d="M${x.toFixed(1)} ${y.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${(tx + (dx < 0 ? -10 : 10)).toFixed(1)} ${ty.toFixed(1)}"/><circle class="bp-pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2"/><text class="bp-t bp-halo" font-size="${size}" text-anchor="${dx < 0 ? "end" : "start"}" dominant-baseline="middle" x="${(tx + (dx < 0 ? -13 : 13)).toFixed(1)}" y="${ty.toFixed(1)}">${esc(text)}</text>`;
}

/** A scale bar of `meters` metres starting at a world point, along the screen direction of world axis `axis`. */
function scaleBar(v, at, axis, meters) {
  const step = 20; // 1 m
  const parts = [];
  for (let i = 0; i < meters; i++) {
    const a = [...at];
    const b = [...at];
    a[axis] += i * step;
    b[axis] += (i + 1) * step;
    const [p, q] = [v.project(a), v.project(b)];
    parts.push(`<path class="${i % 2 ? "bp-bar-b" : "bp-bar-a"}" d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}"/>`);
  }
  const end = [...at];
  end[axis] += meters * step;
  const [p, q] = [v.project(at), v.project(end)];
  return parts.join("") + `<text class="bp-t" font-size="20" x="${p[0].toFixed(1)}" y="${(p[1] + 26).toFixed(1)}">0</text><text class="bp-t" font-size="20" text-anchor="end" x="${q[0].toFixed(1)}" y="${(q[1] + 26).toFixed(1)}">${meters} m</text>`;
}

// ── Elevations ───────────────────────────────────────────────────────────────
const LEVELS = [
  [0, "±0,00 tanah"],
  [F1, "+0,40 lantai 1"],
  [F2, "+3,60 lantai 2"],
  [EAVE, "+6,60 balok atap"],
  [RIDGE_Z, `+${M(RIDGE_Z).toLocaleString("id-ID", { maximumFractionDigits: 2 })} bubungan`],
];

function elevation(name, title, { along, from, to, fixed, levelsAt }) {
  const v = view(name);
  const pt = (t, z) => (along === "x" ? [t, fixed, z] : [fixed, t, z]);
  let over = dimension(v, pt(from, -6), pt(to, -6), 30, mm(Math.abs(to - from)));
  over += scaleBar(v, pt(along === "x" ? Math.min(from, to) : Math.max(from, to), -44), along === "x" ? 0 : 1, 5);
  // Level marks on the side.
  const [lx] = v.project(pt(levelsAt, 0));
  for (const [z, text] of LEVELS) {
    const [, y] = v.project(pt(levelsAt, z));
    const dir = lx < v.width / 2 ? -1 : 1;
    over += `<path class="bp-dim" d="M${lx.toFixed(1)} ${y.toFixed(1)}h${dir * 40}"/><path class="bp-pin-tri" d="M${(lx + dir * 40).toFixed(1)} ${y.toFixed(1)}l${-dir * 8} -10h${dir * 16}z"/><text class="bp-t" font-size="20" text-anchor="${dir < 0 ? "end" : "start"}" x="${(lx + dir * 50).toFixed(1)}" y="${(y + 7).toFixed(1)}">${esc(text)}</text>`;
  }
  over += `<path class="bp-ground" d="M0 ${v.project(pt(from, 0))[1].toFixed(1)}H${v.width}"/>`;
  return { title, svg: compose(v, over) };
}

// ── Plans ────────────────────────────────────────────────────────────────────
function floorPlan(name, rooms, z, extra = "") {
  const v = view(name);
  let over = dimension(v, [HOUSE.x, FRONT_Y + 10, z], [RIGHT_X, FRONT_Y + 10, z], 34, mm(HOUSE.w));
  over += dimension(v, [HOUSE.x - 10, FRONT_Y, z], [HOUSE.x - 10, HOUSE.y, z], 34, mm(HOUSE.d));
  for (const [title, [x0, x1], [y0, y1]] of rooms) over += label(v, [(x0 + x1) / 2, (y0 + y1) / 2, z], title, { size: 22, sub: `${m2(x1 - x0, y1 - y0)} m²` });
  over += scaleBar(v, [HOUSE.x, FRONT_Y + 64, z], 0, 5) + extra;
  return compose(v, over);
}
const FRONT = [BACK_ROW, FRONT_Y];
const BACK = [HOUSE.y, BACK_ROW];
const groundRooms = [
  ["R. KELUARGA", GF.living, FRONT],
  ["R. MAKAN", GF.dining, FRONT],
  ["DAPUR BERSIH", GF.kitchen, FRONT],
  ["KM", GF.bath, BACK],
  ["TANGGA", GF.stair, BACK],
  ["DAPUR KOTOR", GF.wet, BACK],
  ["R. CUCI", GF.laundry, BACK],
  ["TERAS BLKG", [TERRACE.x, TERRACE.x + TERRACE.w], [TERRACE.y, TERRACE.y + TERRACE.d]],
  ["TERAS", [PORCH.x, PORCH.x + PORCH.w], [PORCH.y, PORCH.y + PORCH.d]],
];
const upperRooms = [
  ["K. UTAMA", UF.master, FRONT],
  ["KAMAR 2", UF.bed2, FRONT],
  ["KM DALAM", UF.masterBath, BACK],
  ["LORONG", UF.hall, BACK],
  ["KM DALAM", UF.bed2Bath, BACK],
  ...(CONFIG.balcony ? [["BALKON", [TERRACE.x, TERRACE.x + TERRACE.w], [TERRACE.y, TERRACE.y + TERRACE.d]]] : []),
];

function sitePlan() {
  const v = view("site");
  let over = dimension(v, [PLOT.x, PLOT.y + PLOT.d, 0], [PLOT.x + PLOT.w, PLOT.y + PLOT.d, 0], 22, mm(PLOT.w));
  over += dimension(v, [PLOT.x, PLOT.y + PLOT.d, 0], [PLOT.x, PLOT.y, 0], 22, mm(PLOT.d));
  const zones = [
    ["RUMAH", [HOUSE.x + HOUSE.w / 2, HOUSE.y + HOUSE.d / 2, 200]],
    ["CARPORT", [CARPORT.x + CARPORT.w / 2, CARPORT.y + CARPORT.d / 2, 80]],
    ["TAMAN DEPAN", [20, 150, 0]],
    ["KEBUN PANGAN", [BEDS.x + 42, BEDS.y + 50, 20]],
    ["HOMESTEAD", [HOMESTEAD.x + HOMESTEAD.w / 2, HOMESTEAD.y + 40, 40]],
    ["JEMUR", [DRYING.x + DRYING.w / 2, DRYING.y + DRYING.d / 2, 20]],
  ];
  for (const [text, at] of zones) over += label(v, at, text, { size: 24 });
  over += callout(v, [TANK.x, TANK.y, 40], -70, -30, "TANDON 2.000 L");
  over += callout(v, [-33, PLOT.y + PLOT.d - 2, 0], 60, 24, "GERBANG");
  // North arrow: the street side is south.
  const [nx, ny] = [v.width - 70, 70];
  over += `<g class="bp-north" transform="translate(${nx} ${ny})"><circle class="bp-dim" r="22"/><path class="bp-pin-tri" d="M0 -20L7 6L0 1L-7 6z"/><text class="bp-t" font-size="12" text-anchor="middle" y="-28">U</text></g>`;
  return compose(v, over);
}

// ── Exploded ─────────────────────────────────────────────────────────────────
function exploded() {
  const v = view("explode");
  const layers = [
    [380 + RIDGE_Z - 20, "Atap perisai 25° · genteng, talang"],
    [290 + F2 + 30, "Dinding lantai 2 · jendela berpeneduh"],
    [200 + F2, "Lantai 2 · 2 kamar + KM dalam, balkon"],
    [90 + F1 + 30, "Dinding lantai 1 · batu alam, pintu, jendela"],
    [F1, "Lantai 1 · keluarga, dapur, servis, teras"],
  ];
  let over = "";
  // Guide lines up the four corners of the house through every layer.
  for (const [x, y] of [[HOUSE.x, HOUSE.y], [RIGHT_X, HOUSE.y], [HOUSE.x, FRONT_Y], [RIGHT_X, FRONT_Y]]) {
    const [a, b] = [v.project([x, y, 0]), v.project([x, y, 380 + RIDGE_Z - 40])];
    over = `<path class="bp-guide" d="M${a.map((n) => n.toFixed(1)).join(" ")}L${b.map((n) => n.toFixed(1)).join(" ")}"/>` + over;
  }
  for (const [z, text] of layers) {
    const at = [HOUSE.x, FRONT_Y, z];
    const [x, y] = v.project(at);
    over += callout(v, at, -(x - 150), 0, text);
  }
  return compose(v, over);
}

// ── Details ──────────────────────────────────────────────────────────────────
function crop(v, min, max, aspect) {
  const pts = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => v.project([x, y, z]))));
  let [x0, y0] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
  let [w, h] = [Math.max(...pts.map((p) => p[0])) - x0, Math.max(...pts.map((p) => p[1])) - y0];
  if (w / h < aspect) (x0 -= (h * aspect - w) / 2), (w = h * aspect);
  else (y0 -= (w / aspect - h) / 2), (h = w / aspect);
  return [x0 - w * 0.04, y0 - h * 0.04, w * 1.08, h * 1.08];
}
const DETAILS = [
  ["open1", "Dapur bersih", "Meja dapur, kompor, kulkas, pulau dapur", [-40, BACK_ROW, F1], [50, FRONT_Y, F1 + 36]],
  ["open1", "Dapur kotor & ruang cuci", "Bak cuci piring, kompor LPG, mesin cuci", [-75, HOUSE.y, F1], [50, BACK_ROW, F1 + 36]],
  ["open1", "Ruang keluarga & makan", "Sofa, TV, meja makan 6 kursi", [HOUSE.x, BACK_ROW, F1], [-40, FRONT_Y, F1 + 36]],
  ["open1", "Teras depan", "Lantai batu, bangku kayu, kanopi", [PORCH.x - 4, PORCH.y - 10, 0], [PORCH.x + PORCH.w + 4, PORCH.y + PORCH.d + 10, F1 + 60]],
  ["open2", "Kamar utama", "Kasur ganda, lemari, meja kerja", [HOUSE.x, BACK_ROW, F2], [-80, FRONT_Y, F2 + 40]],
  ["open2", "Kamar mandi dalam", "Shower kaca, kloset, wastafel", [HOUSE.x, HOUSE.y, F2], [-150, BACK_ROW, F2 + 40]],
  ["open1", "Carport", `${CONFIG.cars} mobil · ${CONFIG.motorcycles} motor · paving rumput`, [CARPORT.x, CARPORT.y, 0], [CARPORT.x + CARPORT.w, CARPORT.y + CARPORT.d, 60]],
  ["open1", "Kebun pangan", "Bedengan kayu, tanah gembur, pagar rendah", [BEDS.x - 6, BEDS.y - 6, 0], [196, BEDS.y + 106, 20]],
  ["open1", "Kandang & kompos", `${CONFIG.hens} ayam, sarang, kompos 3 sekat, gudang`, [HOMESTEAD.x, HOMESTEAD.y, 0], [HOMESTEAD.x + HOMESTEAD.w, HOMESTEAD.y + 110, 40]],
  ["open1", "Tandon & jemuran", "Tandon 2.000 L dari talang, area jemur", [DRYING.x - 4, HOUSE.y - 40, 0], [TANK.x + 20, DRYING.y + DRYING.d + 4, 60]],
];

const CORNER_VIEWS = [["c45", "DEPAN-KANAN"], ["c135", "DEPAN-KIRI"], ["c225", "BELAKANG-KIRI"], ["c315", "BELAKANG-KANAN"]];

// ── Sheet assembly ───────────────────────────────────────────────────────────
const SHEETS = [];
const titleBlock = (title, no, scale = "lihat skala batang") => `
  <div class="tb">
    <div class="tb-row tb-big"><span>RUMAH TROPIS · HOMESTEAD</span></div>
    <div class="tb-row"><span>Gambar</span><b>${esc(title)}</b></div>
    <div class="tb-row"><span>Kavling</span><b>20 × 25 m · rumah 12 × 8 m · 2 lantai</b></div>
    <div class="tb-row tb-split"><span>Skala</span><b>${scale}</b><span>Lembar</span><b>${no} / 5</b></div>
  </div>`;

const elevations = [
  elevation("front", "TAMPAK DEPAN", { along: "x", from: HOUSE.x, to: RIGHT_X, fixed: FRONT_Y + 30, levelsAt: RIGHT_X + 60 }),
  elevation("right", "TAMPAK SAMPING KANAN (KEBUN)", { along: "y", from: FRONT_Y, to: HOUSE.y, fixed: RIGHT_X + 60, levelsAt: HOUSE.y - 30 }),
  elevation("rear", "TAMPAK BELAKANG", { along: "x", from: RIGHT_X, to: HOUSE.x, fixed: HOUSE.y - 30, levelsAt: HOUSE.x - 30 }),
  elevation("left", "TAMPAK SAMPING KIRI", { along: "y", from: HOUSE.y, to: FRONT_Y, fixed: HOUSE.x - 30, levelsAt: FRONT_Y + 30 }),
];
const cell = (title, svg, cls = "") => `<figure class="cell ${cls}"><div class="art">${svg}</div><figcaption>${esc(title)}</figcaption></figure>`;

SHEETS.push(`<section class="sheet blue"><div class="frame">
  <div class="grid g-elev">
    ${elevations.map((e) => cell(e.title, e.svg)).join("")}
    ${cell("SITE PLAN · DENAH KAVLING", sitePlan(), "site")}
  </div>${titleBlock("Tampak & site plan", 1)}</div></section>`);

SHEETS.push(`<section class="sheet blue"><div class="frame">
  <div class="grid g-plan">
    ${cell("DENAH LANTAI 1", floorPlan("plan1", groundRooms, F1))}
    ${cell("DENAH LANTAI 2", floorPlan("plan2", upperRooms, F2))}
  </div>
  <ul class="notes">
    <li>Lantai 1 ditinggikan 40 cm dari tanah (antisipasi banjir); plafon 3,2 m.</li>
    <li>Jendela tinggi di dinding belakang untuk ventilasi silang; jendela depan berpeneduh.</li>
    <li>Atap perisai 25°, tritisan 1,2 m; talang belakang ke tandon, talang depan ke sumur resapan.</li>
    <li>Ukuran dalam milimeter; ukuran ruang adalah luas bersih dari as dinding.</li>
  </ul>${titleBlock("Denah lantai 1 & 2", 2)}</div></section>`);

SHEETS.push(`<section class="sheet paper"><div class="frame">
  <div class="grid g-one">${cell("EXPLODED VIEW · SUSUNAN RUMAH DARI PONDASI SAMPAI ATAP", exploded(), "big")}</div>
  ${titleBlock("Exploded view", 3, "tanpa skala")}</div></section>`);

SHEETS.push(`<section class="sheet paper"><div class="frame">
  <div class="grid g-four">
    ${CORNER_VIEWS.map(([name, title]) => { const v = view(name); return cell(title, compose(v, "", crop(v, [PLOT.x - 8, PLOT.y - 8, -26], [PLOT.x + PLOT.w + 8, PLOT.y + PLOT.d + 8, 175], 1.75))); }).join("")}
  </div>${titleBlock("Tampak 360°", 4, "tanpa skala")}</div></section>`);

const detailCells = DETAILS.map(([name, title, sub, min, max]) => {
  const v = view(name);
  return `<figure class="cell detail"><div class="art">${compose(v, "", crop(v, min, max, 0.82))}</div><figcaption>${esc(title)}<small>${esc(sub)}</small></figcaption></figure>`;
});
SHEETS.push(`<section class="sheet paper"><div class="frame">
  <div class="grid g-detail">${detailCells.join("")}</div>${titleBlock("Detail ruang & halaman", 5, "tanpa skala")}</div></section>`);

const css = readFileSync(join(ROOT, "../../packages/iso-kit/iso.css"), "utf8") + readFileSync(join(ROOT, "src/figures/homestead/homestead.css"), "utf8");
const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Blueprint rumah tropis</title><style>${css}
@page { size: 420mm 297mm; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #888; font-family: "JetBrains Mono", "SF Mono", Menlo, monospace; }
.sheet { width: 420mm; height: 297mm; padding: 9mm; break-after: page; overflow: hidden; position: relative; }
.frame { position: relative; height: 100%; border: 0.5mm solid var(--line); padding: 6mm; display: flex; flex-direction: column; }
.blue { --line: #e8f0ff; --ink: #ffffff; --muted: #b8cdf0; background-color: #12417e;
  background-image: linear-gradient(#ffffff14 1px, transparent 1px), linear-gradient(90deg, #ffffff14 1px, transparent 1px), linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px);
  background-size: 20mm 20mm, 20mm 20mm, 4mm 4mm, 4mm 4mm; }
.paper { --line: #1b1d22; --ink: #1b1d22; --muted: #6b6f78; background: #fbfbf8; }
.grid { flex: 1; display: grid; gap: 4mm; min-height: 0; }
.g-elev { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; grid-template-areas: "a b s" "c d s"; padding-bottom: 30mm; }
.g-elev .cell:nth-child(1) { grid-area: a; } .g-elev .cell:nth-child(2) { grid-area: b; } .g-elev .cell:nth-child(3) { grid-area: c; } .g-elev .cell:nth-child(4) { grid-area: d; } .g-elev .site { grid-area: s; }
.g-plan { grid-template-columns: 1fr 1fr; padding-bottom: 34mm; }
.g-one { grid-template-columns: 1fr; }
.g-four { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; padding-bottom: 32mm; }
.g-detail { grid-template-columns: repeat(5, 1fr); grid-template-rows: 1fr 1fr; padding-bottom: 32mm; }
.cell { margin: 0; display: flex; flex-direction: column; min-height: 0; }
.cell .art { flex: 1; min-height: 0; display: flex; }
.cell .art svg { width: 100%; height: 100%; }
.cell figcaption { text-align: center; color: var(--ink); font-size: 10pt; letter-spacing: .12em; padding-top: 1.5mm; text-decoration: underline; text-underline-offset: 3px; }
.cell figcaption small { display: block; text-decoration: none; letter-spacing: .02em; font-size: 7.5pt; color: var(--muted); }
.detail .art { border: 0.3mm solid #d9d9d4; border-radius: 2mm; overflow: hidden; background: #fff; }
.tb { position: absolute; right: 6mm; bottom: 6mm; width: 120mm; border: 0.4mm solid var(--line); color: var(--ink); font-size: 8pt; background: inherit; }
.tb-row { display: flex; gap: 3mm; padding: 1.4mm 2.5mm; border-top: 0.25mm solid var(--line); }
.tb-row:first-child { border-top: 0; }
.tb-row span { color: var(--muted); min-width: 16mm; }
.tb-big { font-size: 11pt; letter-spacing: .1em; justify-content: center; }
.tb-big span { color: var(--ink); }
.tb-split b { flex: 1; }
.notes { position: absolute; left: 6mm; bottom: 6mm; width: 220mm; margin: 0; padding-left: 5mm; color: var(--ink); font-size: 8pt; line-height: 1.6; }
/* The drawing on blue: every surface is the sheet's blue so hidden lines stay hidden, every line is white. */
.blue .iso { --anatomy-paper: #12417e; --anatomy-face: #12417e; --anatomy-top: #144684; --anatomy-shade-0: #103a72; --anatomy-shade-1: #113d77; --anatomy-shade-2: #12407b; --anatomy-shade-3: #134380;
  --anatomy-lit-top: #144684; --anatomy-lit-shade: #12407b; --anatomy-hi: #ffffff; --anatomy-mid: #e3ecfb; --anatomy-lo: #a9c2ea; --anatomy-faint: #6f93cc; --anatomy-lit: #ffffff; --anatomy-dot: #ffffff;
  --hs-glass: #1a4f92; --hs-floor: #12417e; --hs-cavity: #103a72; }
.blue .iso .hs-glass > :is(.iso-fill, .iso-top, .iso-shade) { fill: #1a4f92; }
.blue .iso :is(.hs-soil) { fill: #103a72; }
.bp-dim, .bp-ext { fill: none; stroke: var(--ink); stroke-width: 0.8; }
.bp-ext { stroke-width: 0.5; opacity: .8; }
.bp-ground { stroke: var(--ink); stroke-width: 1.6; }
.bp-guide { fill: none; stroke: #8c909a; stroke-width: 0.8; stroke-dasharray: 4 4; }
.bp-pin, .bp-pin-tri { fill: var(--ink); }
.bp-bar-a { stroke: var(--ink); stroke-width: 4; } .bp-bar-b { stroke: var(--ink); stroke-width: 4; opacity: .35; }
.bp-t { fill: var(--ink); font-family: "JetBrains Mono", "SF Mono", Menlo, monospace; letter-spacing: .04em; }
.bp-sub { fill: var(--muted); }
.blue .bp-halo { paint-order: stroke; stroke: #12417e; stroke-width: 4px; stroke-linejoin: round; }
.paper .bp-halo { paint-order: stroke; stroke: #fbfbf8; stroke-width: 4px; stroke-linejoin: round; }
@media screen { .sheet { margin: 10px auto; box-shadow: 0 2px 12px #0004; } }
</style></head><body class="iso" data-theme="light">${SHEETS.map((s, i) => (i >= 2 ? s.replace('<div class="frame">', '<div class="frame"><div class="iso hs" data-color style="display:contents">').replace(/<\/div>\s*<\/section>$/, "</div></div></section>") : s.replace(/<div class="art">/g, '<div class="art iso hs">'))).join("")}</body></html>`;
writeFileSync(`${OUT}.html`, html);

const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", process.env.CHROME_PATH].find((p) => p && existsSync(p));
if (!chrome) throw new Error("Chrome tidak ditemukan; set CHROME_PATH.");
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${OUT}.pdf`, `file://${OUT}.html`], { stdio: "ignore", timeout: 180_000 });
mkdirSync(join(ROOT, "public/blueprint"), { recursive: true });
writeFileSync(join(ROOT, "public/blueprint/blueprint-rumah-a3.pdf"), readFileSync(`${OUT}.pdf`));
console.log(`sheets · ${SHEETS.length} lembar A3 → print/blueprint-rumah-a3.pdf (+ public/blueprint/)`);
