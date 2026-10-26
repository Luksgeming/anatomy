// Furniture and fixtures: living, dining, clean and wet kitchens, a bathroom and laundry downstairs; two bedrooms
// with en-suites upstairs.
import { Dots, Ln, P, R, at, ball, box, cyl, k, onTop, plan, seg, turned, G, type V3 } from "./core.ts";
import { BACK_ROW, F1, F2, IN, type PieceId } from "./world.ts";

const lines = (list: string[], tone = "faint") => Ln(list.join(""), { tone });

/** Four round legs under a top. */
function legs(piece: PieceId, x0: number, y0: number, x1: number, y1: number, z: number, h: number, r = 0.55, inset = 1.2) {
  for (const [x, y] of [[x0 + inset, y0 + inset], [x1 - inset, y0 + inset], [x0 + inset, y1 - inset], [x1 - inset, y1 - inset]])
    cyl(piece, x, y, r, z, h, { tone: "mid", crease: "none" }, { name: R.nameFor(`${piece}.leg`) });
}

function table(piece: PieceId, x0: number, y0: number, x1: number, y1: number, z: number, h: number, extra = "") {
  legs(piece, x0, y0, x1, y1, z, h - 1);
  const top = plan(x0, y0, x1 - x0, y1 - y0, 0.8);
  box(piece, top, z + h - 1, 1, { tone: "hi" }, { bevel: 0.4, name: R.nameFor(`${piece}.table`), extra: Ln(k.planOutline(k.insetPlan(top, 1.4), z + h, P, 2), { tone: "faint" }) + extra });
}

/** A chair whose back stands on the given side ("-x", "+x", "-y", "+y"). */
function chair(piece: PieceId, cx: number, cy: number, z: number, back: "-x" | "+x" | "-y" | "+y") {
  const s = 3.6;
  legs(piece, cx - s, cy - s, cx + s, cy + s, z, 8.4, 0.4, 0.8);
  box(piece, plan(cx - s, cy - s, s * 2, s * 2, 0.6), z + 8.4, 1, { tone: "hi" }, { bevel: 0.3, name: R.nameFor(`${piece}.seat`) });
  const b = back === "-x" ? plan(cx - s, cy - s, 1, s * 2, 0.3) : back === "+x" ? plan(cx + s - 1, cy - s, 1, s * 2, 0.3) : back === "-y" ? plan(cx - s, cy - s, s * 2, 1, 0.3) : plan(cx - s, cy + s - 1, s * 2, 1, 0.3);
  box(piece, b, z + 9.4, 8, { tone: "hi" }, { bevel: 0.3, name: R.nameFor(`${piece}.chair-back`) });
}

/** A cabinet with door seams running edge to edge on its +y or +x face. */
function cabinet(piece: PieceId, p: { x: number; y: number; w: number; d: number }, z: number, h: number, face: "+x" | "+y", doors: number, tone = "hi", name = "cabinet") {
  const seams: string[] = [];
  for (let i = 1; i < doors; i++) {
    if (face === "+y") {
      const x = p.x + (p.w * i) / doors;
      seams.push(seg([x, p.y + p.d, z], [x, p.y + p.d, z + h]));
    } else {
      const y = p.y + (p.d * i) / doors;
      seams.push(seg([p.x + p.w, y, z], [p.x + p.w, y, z + h]));
    }
  }
  const knobs: number[][] = [];
  for (let i = 0; i < doors; i++) {
    const t = (i + (i % 2 ? 0.15 : 0.85)) / doors;
    knobs.push(face === "+y" ? at([p.x + p.w * t, p.y + p.d, z + h * 0.62]) : at([p.x + p.w, p.y + p.d * t, z + h * 0.62]));
  }
  return box(piece, { ...p, r: 0.4 }, z, h, { tone, inner: lines(seams, "lo") }, { bevel: 0.4, name: R.nameFor(`${piece}.${name}`), extra: Dots(knobs, { size: 0.5, tone: "mid" }) });
}

function rug(piece: PieceId, x: number, y: number, w: number, d: number, z: number) {
  const p = plan(x, y, w, d, 1);
  const stripes: string[] = [];
  for (let i = 3; i < w - 2; i += 3) stripes.push(onTop([[x + i, y + 2.2], [x + i, y + d - 2.2]], z + 0.4));
  box(piece, p, z, 0.4, { tone: "lo", crease: "none" }, { bevel: 0, name: R.nameFor(`${piece}.rug`), extra: Ln(k.planOutline(k.insetPlan(p, 2.2), z + 0.4, P, 2), { tone: "lo" }) + lines(stripes) });
}

function pottedPlant(piece: PieceId, x: number, y: number, z: number, size = 1) {
  cyl(piece, x, y, 2.6 * size, z, 5 * size, { tone: "mid" }, { name: R.nameFor(`${piece}.pot`), extra: Ln(k.sideArc(x, y, 2.6 * size, z + 4 * size, P, 20), { tone: "faint" }) });
  ball(piece, [x, y, z + 5 * size + 3.7 * size], 3.8 * size, { tone: "hi" }, { name: R.nameFor(`${piece}.leaves`) });
}

function lamp(piece: PieceId, x: number, y: number, z: number, pole: number, shadeR = 2.6, room = "room") {
  cyl(piece, x, y, 2, z, 0.8, { tone: "mid" }, { name: R.nameFor(`${piece}.lamp-base`) });
  cyl(piece, x, y, 0.4, z + 0.8, pole, { tone: "mid", crease: "none" }, { name: R.nameFor(`${piece}.lamp-pole`) });
  const F = G.frameOf([x, y, z + 0.8 + pole], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  turned(piece, F, [[0, shadeR * 1.25], [4.2, shadeR * 0.7]], { tone: "hi", className: "hs-lamp" }, { name: R.nameFor(`${piece}.shade-${room}`) });
}

function bed(piece: PieceId, x: number, y: number, w: number, d: number, z: number, head: "-x" | "-y", pillows: number) {
  const frame = plan(x, y, w, d, 0.8);
  box(piece, frame, z + 1.5, 4, { tone: "mid" }, { bevel: 0.4, name: R.nameFor(`${piece}.bed-frame`) });
  legs(piece, x, y, x + w, y + d, z, 1.5, 0.7, 1.6);
  const mat = k.insetPlan(frame, 0.8);
  box(piece, mat, z + 5.5, 4, { tone: "hi", inner: Ln(k.sideSeam(mat, z + 7.5, P, 2), { tone: "faint" }) }, { bevel: 0.6, steps: 3, name: R.nameFor(`${piece}.mattress`) });
  const cover = head === "-x" ? plan(mat.x + mat.w * 0.36, mat.y - 0.4, mat.w * 0.64 + 0.4, mat.d + 0.8, 0.8) : plan(mat.x - 0.4, mat.y + mat.d * 0.36, mat.w + 0.8, mat.d * 0.64 + 0.4, 0.8);
  const fold = head === "-x" ? onTop([[cover.x + 3, cover.y], [cover.x + 3, cover.y + cover.d]], z + 11) : onTop([[cover.x, cover.y + 3], [cover.x + cover.w, cover.y + 3]], z + 11);
  box(piece, cover, z + 9.5, 1.5, { tone: "hi" }, { bevel: 0.4, steps: 3, name: R.nameFor(`${piece}.duvet`), extra: Ln(fold, { tone: "lo" }) });
  for (let i = 0; i < pillows; i++) {
    const p = head === "-x" ? plan(mat.x + 1.5, mat.y + 1.5 + (i * (mat.d - 3)) / pillows, 7, (mat.d - 3) / pillows - 1, 1.6) : plan(mat.x + 1.5 + (i * (mat.w - 3)) / pillows, mat.y + 1.5, (mat.w - 3) / pillows - 1, 7, 1.6);
    box(piece, p, z + 9.5, 2.2, { tone: "hi" }, { steps: 4, bevel: 0.3, name: R.nameFor(`${piece}.pillow`) });
  }
  const hb = head === "-x" ? plan(x - 2, y - 0.5, 2, d + 1, 0.6) : plan(x - 0.5, y - 2, w + 1, 2, 0.6);
  box(piece, hb, z, 14, { tone: "mid", inner: Ln(k.sideSeam(hb, z + 11, P, 2), { tone: "faint" }) }, { bevel: 0.5, name: R.nameFor(`${piece}.headboard`) });
}

function shelfUnit(piece: PieceId, p: { x: number; y: number; w: number; d: number }, z: number, h: number, rows: number, faceX: boolean) {
  // A carcass seen from its open face (+x), with books standing on each shelf.
  box(piece, { ...p, r: 0.3 }, z, h, { tone: "mid" }, { bevel: 0.3, name: R.nameFor(`${piece}.shelf`) });
  for (let row = 0; row < rows; row++) {
    const zs = z + 1.5 + (row * (h - 3)) / rows;
    let cursor = faceX ? p.y + 1.2 : p.x + 1.2;
    const end = faceX ? p.y + p.d - 1.2 : p.x + p.w - 1.2;
    let i = 0;
    while (cursor < end - 1.4) {
      const thick = 1.1 + ((row * 7 + i * 3) % 4) * 0.3;
      const tall = 5 + ((row * 5 + i * 7) % 5) * 0.7;
      if (cursor + thick > end) break;
      const bp = faceX ? plan(p.x + p.w + 0.01, cursor, 2.6, thick, 0.15) : plan(cursor, p.y + p.d + 0.01, thick, 2.6, 0.15);
      box(piece, bp, zs, Math.min(tall, (h - 3) / rows - 1.4), { tone: (i + row) % 3 ? "hi" : "mid", crease: "none" }, { bevel: 0, steps: 1, name: R.nameFor(`${piece}.book`) });
      cursor += thick + (i % 5 === 4 ? 2 : 0.15);
      i++;
    }
    const lip = faceX ? plan(p.x + p.w, p.y, 3, p.d, 0.2) : plan(p.x, p.y + p.d, p.w, 3, 0.2);
    box(piece, lip, zs - 0.8, 0.8, { tone: "mid" }, { bevel: 0, steps: 1, name: R.nameFor(`${piece}.board`) });
  }
}

/** A toilet: pedestal bowl with its cistern on the wall side; the user faces `face`. */
function toilet(piece: PieceId, x: number, y: number, z: number, face: "+x" | "+y") {
  const back = face === "+y" ? plan(x - 3, y - 4.5, 6, 2.4, 0.6) : plan(x - 4.5, y - 3, 2.4, 6, 0.6);
  cyl(piece, x + (face === "+x" ? 0.6 : 0), y + (face === "+y" ? 0.6 : 0), 2.4, z, 6, { tone: "hi" }, { name: R.nameFor(`${piece}.toilet`), extra: Ln(k.ring(x + (face === "+x" ? 0.6 : 0), y + (face === "+y" ? 0.6 : 0), 1.5, z + 6, P, 16), { tone: "lo" }) });
  box(piece, back, z, 13, { tone: "hi" }, { steps: 3, bevel: 0.3, name: R.nameFor(`${piece}.cistern`) });
}

/** A walk-in shower: a tiled tray, a glass screen along the open side, a mixer and head on the wall. */
function shower(piece: PieceId, x: number, y: number, w: number, d: number, z: number, screen: "x" | "y") {
  const tray = plan(x, y, w, d, 0.4);
  box(piece, tray, z, 0.8, { tone: "lo" }, { bevel: 0, name: R.nameFor(`${piece}.shower-tray`), extra: Ln(k.planOutline(k.insetPlan(tray, 1.4), z + 0.8, P, 2), { tone: "faint" }) + Dots([at([x + w / 2, y + d / 2, z + 0.8])], { size: 0.6, tone: "lo" }) });
  // The screen stops short of the wall so it clears the window sill there.
  const glass = screen === "x" ? plan(x + 2, y + d - 0.4, w - 2, 0.4, 0) : plan(x + w - 0.4, y + 2, 0.4, d - 2, 0);
  box(piece, glass, z + 0.8, 38, { tone: "lo", crease: "none", className: "hs-glass" }, { bevel: 0, name: R.nameFor(`${piece}.shower-glass`) });
  cyl(piece, x + 2.4, y + 2.4, 0.5, z + 0.8, 34, { tone: "mid", crease: "none" }, { name: R.nameFor(`${piece}.shower-riser`) });
  cyl(piece, x + 2.4, y + 2.4, 1.6, z + 34.8, 0.8, { tone: "mid" }, { name: R.nameFor(`${piece}.shower-head`) });
}

/** A vanity: cabinet, stone top with a basin and tap, a mirror on the wall behind. */
function vanity(piece: PieceId, p: { x: number; y: number; w: number; d: number }, z: number, face: "+x" | "+y") {
  cabinet(piece, p, z, 14, face, 2, "mid", "vanity");
  const top = { ...p, r: 0.4 };
  const c: [number, number] = [p.x + p.w / 2, p.y + p.d / 2];
  box(piece, top, z + 14, 1, { tone: "hi" }, { bevel: 0.3, name: R.nameFor(`${piece}.vanity-top`), extra: Ln(k.ring(c[0], c[1], 2.4, z + 15, P, 20) + k.ring(c[0], c[1], 1.4, z + 15, P, 16), { tone: "lo" }) });
  const tap: [number, number] = face === "+y" ? [c[0], p.y + 1.2] : [p.x + 1.2, c[1]];
  cyl(piece, tap[0], tap[1], 0.5, z + 15, 3.4, { tone: "mid", crease: "none" }, { name: R.nameFor(`${piece}.vanity-tap`) });
  const mirror = face === "+y" ? plan(p.x + 1, p.y - 0.01, p.w - 2, 0.4, 0) : plan(p.x - 0.01, p.y + 1, 0.4, p.d - 2, 0);
  box(piece, mirror, z + 22, 16, { tone: "lo", crease: "none", className: "hs-glass" }, { bevel: 0, name: R.nameFor(`${piece}.mirror`) });
}

/** A front-loading washing machine with its round door on the +y face. */
function washer(piece: PieceId, x: number, y: number, z: number) {
  const p = plan(x, y, 13, 12, 1);
  const c: V3 = [x + 6.5, y + 12.01, z + 8];
  box(piece, p, z, 17, { tone: "hi", inner: Ln(k.sideSeam(p, z + 14, P, 2), { tone: "faint" }) }, {
    bevel: 0.4,
    steps: 3,
    name: R.nameFor(`${piece}.washer`),
    extra: Ln(k.sideRing(c, 4.2, "y", P, 32) + k.sideRing(c, 3, "y", P, 32), { tone: "lo" }) + Dots([at([x + 10.5, y + 12, z + 15.5])], { size: 0.6, tone: "lo" }),
  });
}

/** A gas stove (two burners) on a counter, with its LPG cylinder beside the counter. */
function stove(piece: PieceId, x: number, y: number, z: number, cylinder: [number, number]) {
  const p = plan(x, y, 14, 8, 0.8);
  box(piece, p, z, 2.4, { tone: "mid" }, { bevel: 0.3, name: R.nameFor(`${piece}.stove`), extra: Ln(k.ring(x + 3.8, y + 4, 2, z + 2.4, P, 18) + k.ring(x + 10.2, y + 4, 2, z + 2.4, P, 18), { tone: "lo" }) });
  cyl(piece, cylinder[0], cylinder[1], 3, F1, 12, { tone: "hi" }, { name: R.nameFor(`${piece}.lpg`), extra: Ln(k.sideArc(cylinder[0], cylinder[1], 3, F1 + 9, P, 20), { tone: "faint" }) });
  cyl(piece, cylinder[0], cylinder[1], 1.2, F1 + 12, 1.6, { tone: "mid" }, { name: R.nameFor(`${piece}.lpg-valve`) });
}

export function interior() {
  const ROW = BACK_ROW + 1.5;
  // ── Living room ─────────────────────────────────────────────
  rug("ground", -178, -96, 52, 40, F1);
  cabinet("ground", plan(-182, ROW, 30, 8), F1, 10, "+y", 3, "mid", "tv-cabinet");
  const tv = plan(-180, ROW + 3, 26, 1.2, 0.2);
  box("ground", tv, F1 + 10, 17, { tone: "mid" }, { bevel: 0, name: "ground.tv", extra: Ln(k.planOutline(k.insetPlan({ ...tv, r: 0 }, 0), F1 + 27, P, 1), { tone: "faint" }) });
  const sy = -58;
  legs("ground", -182, sy, -140, sy + 16, F1, 2, 0.6, 1.4);
  box("ground", plan(-182, sy, 42, 16, 1), F1 + 2, 6, { tone: "mid" }, { bevel: 0.4, name: "ground.sofa-base" });
  for (let i = 0; i < 3; i++) box("ground", plan(-181.4 + i * 13.4, sy + 0.6, 13, 11, 1.4), F1 + 8, 2.6, { tone: "hi" }, { steps: 3, bevel: 0.3, name: R.nameFor("ground.cushion") });
  const sofaBack = plan(-182, sy + 11.6, 42, 4.4, 1);
  box("ground", sofaBack, F1 + 8, 9, { tone: "mid", inner: Ln(k.sideSeam(sofaBack, F1 + 13, P, 2), { tone: "faint" }) }, { bevel: 0.4, name: "ground.sofa-back" });
  table("ground", -172, -84, -150, -70, F1, 8);
  cyl("ground", -160, -77, 1.1, F1 + 8, 2, { tone: "hi" }, { name: "ground.cup" });
  lamp("ground", -122, -32, F1, 28, 3, "living");
  pottedPlant("ground", -181, -30, F1, 1.3);
  // ── Dining ──────────────────────────────────────────────────
  table("ground", -92, -84, -52, -58, F1, 15);
  ball("ground", [-72, -71, F1 + 17.2], 2.4, { tone: "mid" }, { name: "ground.fruit-bowl" });
  for (const x of [-84, -72, -60]) {
    chair("ground", x, -89, F1, "-y");
    chair("ground", x, -53, F1, "+y");
  }
  // ── Clean kitchen: a counter along the partition, an island, a fridge ──
  const counter = plan(-12, ROW, 58, 12, 0.3);
  cabinet("ground", counter, F1, 17, "+y", 6, "mid", "counter");
  const sink = plan(4, ROW + 2.6, 10, 7, 1.2);
  box("ground", plan(-13, ROW, 60, 13, 0.4), F1 + 17, 1.2, { tone: "hi" }, {
    bevel: 0.4,
    name: "ground.worktop",
    extra: Ln(k.planOutline(sink, F1 + 18.2, P, 3) + k.planOutline(k.insetPlan(sink, 1), F1 + 18.2, P, 3), { tone: "lo" }) + Ln(k.ring(28, ROW + 6.5, 2, F1 + 18.2, P, 20) + k.ring(34, ROW + 6.5, 2, F1 + 18.2, P, 20), { tone: "lo" }),
  });
  cyl("ground", 9, ROW + 1.4, 0.6, F1 + 18.2, 5, { tone: "mid", crease: "none" }, { name: "ground.tap" });
  cabinet("ground", plan(-12, ROW, 40, 6), F1 + 32, 13, "+y", 4, "mid", "wall-cabinet");
  const island = plan(-14, -76, 34, 13, 0.6);
  cabinet("ground", island, F1, 17, "+y", 3, "mid", "island");
  box("ground", plan(-15, -77, 36, 15, 0.6), F1 + 17, 1.2, { tone: "hi" }, { bevel: 0.4, name: "ground.island-top" });
  for (const x of [-6, 6]) {
    cyl("ground", x, -57, 0.5, F1, 11, { tone: "mid", crease: "none" }, { name: R.nameFor("ground.stool-leg") });
    cyl("ground", x, -57, 2.6, F1 + 11, 1.2, { tone: "hi" }, { name: R.nameFor("ground.stool") });
  }
  const fridge = plan(33, -44, 13, 13, 0.8);
  box("ground", fridge, F1, 38, { tone: "hi", inner: Ln(k.sideSeam(fridge, F1 + 26, P, 2), { tone: "lo" }) }, { bevel: 0.5, name: "ground.fridge" });
  lamp("ground", -36, -30, F1, 26, 2.6, "kitchen");
  // ── Common bathroom ─────────────────────────────────────────
  shower("ground", -187, -177, 16, 16, F1, "y");
  toilet("ground", -164, -172, F1, "+y");
  vanity("ground", plan(-187, -140, 8, 14), F1, "+x");
  // ── Under the stairs, the hall: a shoe cabinet and a plant ─
  cabinet("ground", plan(-146, -158, 24, 7), F1, 12, "+y", 3, "mid", "shoe-cabinet");
  pottedPlant("ground", -90, -150, F1, 1);
  // ── Wet kitchen: a long counter with a stove and a deep sink, a rack, the gas cylinder ──
  const wetCounter = plan(-72, -177, 58, 12, 0.3);
  cabinet("ground", wetCounter, F1, 17, "+y", 5, "mid", "wet-counter");
  const deep = plan(-66, -175, 12, 8, 1.2);
  box("ground", plan(-73, -177, 60, 13, 0.4), F1 + 17, 1.2, { tone: "hi" }, { bevel: 0.4, name: "ground.wet-top", extra: Ln(k.planOutline(deep, F1 + 18.2, P, 3) + k.planOutline(k.insetPlan(deep, 1), F1 + 18.2, P, 3), { tone: "lo" }) });
  stove("ground", -44, -175, F1 + 18.2, [-20, -150]);
  shelfUnit("ground", plan(-73, -150, 6, 24), F1, 30, 3, true);
  // ── Laundry: a washing machine, a laundry tub, a basket ────
  washer("ground", 18, -177, F1);
  cabinet("ground", plan(33, -177, 13, 12), F1, 16, "+y", 1, "mid", "tub-base");
  const tub = plan(33, -177, 13, 12, 1);
  box("ground", tub, F1 + 16, 2, { tone: "hi" }, { bevel: 0.3, name: "ground.tub", extra: Ln(k.planOutline(k.insetPlan(tub, 1.6), F1 + 18, P, 3), { tone: "lo" }) });
  cyl("ground", 4, -125, 4, F1, 8, { tone: "mid" }, { name: "ground.basket", extra: Ln(k.sideArc(4, -125, 4, F1 + 5, P, 20), { tone: "faint" }) });

  // ── Upstairs: master bedroom ────────────────────────────────
  rug("upper", -170, -100, 56, 52, F2);
  bed("upper", IN.x + 2, -92, 40, 36, F2, "-x", 2);
  for (const y of [-102, -54]) {
    cabinet("upper", plan(IN.x, y, 8, 8), F2, 10, "+x", 1, "mid", "nightstand");
    lamp("upper", IN.x + 4, y + 4, F2 + 10, 3, 2, "master");
  }
  cabinet("upper", plan(-114, ROW, 30, 11), F2, 40, "+y", 3, "mid", "wardrobe");
  table("upper", -106, -38, -86, -26, F2, 15);
  chair("upper", -96, -44, F2, "-y");
  // Master en-suite.
  shower("upper", -187, -177, 16, 16, F2, "y");
  toilet("upper", -164, -172, F2, "+y");
  vanity("upper", plan(-187, -140, 8, 22), F2, "+x");
  // ── Hall: a linen cabinet and a plant by the stair void ─────
  cabinet("upper", plan(-60, -177, 30, 9), F2, 30, "+y", 2, "mid", "linen");
  pottedPlant("upper", -22, -122, F2, 1);
  // ── Bedroom 2 ───────────────────────────────────────────────
  rug("upper", -46, -92, 40, 34, F2);
  bed("upper", -40, ROW + 3.8, 32, 40, F2, "-y", 2);
  cabinet("upper", plan(-54, ROW, 8, 8), F2, 10, "+y", 1, "mid", "nightstand");
  lamp("upper", -50, ROW + 4, F2 + 10, 3, 2, "bed2");
  cabinet("upper", plan(-78, -100, 11, 30), F2, 40, "+x", 2, "mid", "wardrobe");
  table("upper", 14, -36, 40, -24, F2, 15);
  chair("upper", 27, -42, F2, "-y");
  // Bedroom 2 en-suite.
  shower("upper", 30, -177, 16, 16, F2, "y");
  toilet("upper", 14, -172, F2, "+y");
  vanity("upper", plan(-8.5, -140, 8, 16), F2, "+x");
}
