// The food and water zone: raised beds of daily cooking crops, herb planters by the kitchen, a row of fruit trees as a
// green buffer before the homestead fence, the drying yard outside the laundry, the rainwater tank fed by the back
// gutter, the front downpipe into a drain pit and soakaway, and grass tufts on the open lawn.
import { A, Dots, Ln, P, R, S, at, ballPart, box, boxPart, compound, cyl, k, pipe, plan, put, seg, under, type Part, type V3 } from "./core.ts";
import { CONFIG } from "./config-runtime.ts";
import { BEDS, CARPORT, DRYING, FRONT_Y, GATE_Y, HOMESTEAD, HOUSE, PATH_X, PLOT, RIGHT_X, TANK, TERRACE, type PieceId } from "./world.ts";
import { GUTTER } from "./roof.ts";
import { fencePanel, fenceRun, jitter, tree } from "./garden.ts";
import type { Crop } from "../config.ts";

const SOIL = 6;

/** Fruit or flower dots in a colour class (red chilli, red tomato, purple eggplant), ink in monochrome. */
const berries = (points: V3[], cls: string, size = 0.8) => `<g class="${cls}">${Dots(points.map((p) => at(p)), { size, tone: "hi" })}</g>`;

/** The plants of one raised bed, by crop, as parts standing on the soil. */
function crop(kind: Crop, b: { x: number; y: number; w: number; d: number }, seed: number): Part[] {
  const parts: Part[] = [];
  const cols = kind === "kangkung" || kind === "bayam" ? 6 : kind === "serai" || kind === "pandan" ? 4 : 5;
  const rows = 2;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const x = b.x + ((i + 0.5) / cols) * b.w + (j ? 1.4 : -1.4);
      const y = b.y + ((j + 0.5) / rows) * b.d;
      const g = 0.85 + jitter(seed + i * 7 + j * 3) * 0.3;
      if (kind === "cabai" || kind === "terong" || kind === "tomat") {
        const r = (kind === "tomat" ? 2.4 : 2) * g;
        const top = SOIL + r * 2;
        if (kind === "tomat") parts.push({ at: [x, y, SOIL + 6], svg: Ln(seg([x + r * 0.8, y, SOIL], [x + r * 0.8, y, SOIL + 11]), { tone: "mid", free: true }), shape: A.cylinder(x + r * 0.8, y, 0.3, SOIL, 11) });
        parts.push(ballPart([x, y, SOIL + r], r, { tone: "hi", className: "hs-leaf" }, 16));
        const fruit: V3[] = [0, 1, 2].map((n) => [x + Math.cos(n * 2.1 + i) * r * 0.7, y + Math.sin(n * 2.1 + i) * r * 0.7, SOIL + r * (1.1 + (n % 2) * 0.5)]);
        parts.push({ at: [x, y, top], svg: berries(fruit, kind === "terong" ? "hs-fruit-purple" : "hs-fruit-red", kind === "terong" ? 1 : 0.8), shape: A.ball([x, y, SOIL + r], 0.3) });
      } else if (kind === "bayam" || kind === "kangkung") {
        const r = (kind === "kangkung" ? 1.5 : 1.7) * g;
        parts.push(ballPart([x, y, SOIL + r * 0.9], r, { tone: "hi", className: "hs-leaf" }, 14));
      } else {
        // Lemongrass and pandan: clumps of long blades fanning from a base.
        const n = kind === "serai" ? 7 : 6;
        const tall = (kind === "serai" ? 11 : 8) * g;
        const blades: string[] = [];
        for (let m = 0; m < n; m++) {
          const a = (m / n) * Math.PI * 2 + seed;
          const lean = kind === "serai" ? 1.2 : 3.6;
          blades.push(seg([x, y, SOIL + 0.6], [x + Math.cos(a) * lean, y + Math.sin(a) * lean, SOIL + tall * (kind === "pandan" ? 0.7 : 1)]));
        }
        parts.push({ at: [x, y, SOIL + tall / 2], svg: `<g class="hs-blades">${Ln(blades.join(""), { tone: "lo", free: true })}</g>` + Dots([at([x, y, SOIL + 0.6])], { size: 0.6, tone: "lo" }), shape: A.cylinder(x, y, kind === "pandan" ? 2.4 : 1, SOIL, tall) });
      }
    }
  return parts;
}

function beds() {
  CONFIG.beds.forEach((kind, i) => {
    const col = i % BEDS.cols;
    const row = Math.floor(i / BEDS.cols);
    const b = plan(BEDS.x + col * (BEDS.w + BEDS.gapX), BEDS.y + row * (BEDS.d + BEDS.gapY), BEDS.w, BEDS.d, 0.6);
    const planks = [2, 4].map((z) => Ln(k.sideSeam(b, z, P, 2), { tone: "faint" })).join("");
    const soil = k.insetPlan(b, 1.2);
    box("yard", b, 0, SOIL, { tone: "mid", inner: planks }, { bevel: 0.4, owner: `yard.bed#${i}`, name: R.nameFor("yard.bed"), extra: `<path class="hs-soil" d="${k.slabOf(soil, SOIL, 0.01, P, 2).top}"/>` + Ln(k.planOutline(soil, SOIL, P, 2), { tone: "lo" }) + `<g class="hs-crumbs">${Dots(Array.from({ length: 26 }, (_, j) => at([soil.x + 1 + jitter(i * 41 + j) * (soil.w - 2), soil.y + 1 + jitter(i * 59 + j * 3) * (soil.d - 2), SOIL])), { size: 0.3, tone: "lo" })}</g>` });
    compound("yard", `yard.veg-${kind}`, crop(kind, soil, i * 31));
    // A label stake at the bed's front corner.
    box("yard", plan(b.x + b.w - 3, b.y + b.d + 0.4, 2.4, 0.6, 0.1), 0, 9, { tone: "hi" }, { bevel: 0, name: R.nameFor("yard.bed-tag") });
  });
}

/** Herb planters in front of the terrace, a few steps from the kitchen: basil, mint, chives, turmeric. */
function herbs() {
  const y0 = TERRACE.y + TERRACE.d + 3;
  for (let i = 0; i < 3; i++) {
    const p = plan(TERRACE.x + 4 + i * 15, y0, 12, 7, 0.6);
    box("yard", p, 0, 6, { tone: "mid" }, { bevel: 0.3, name: R.nameFor("yard.herb-box"), extra: `<path class="hs-soil" d="${k.slabOf(k.insetPlan(p, 1), 6, 0.01, P, 2).top}"/>` });
    const parts: Part[] = [];
    for (let j = 0; j < 3; j++) parts.push(ballPart([p.x + 2.4 + j * 3.6, p.y + 3.5, 6 + 1.5], 1.5, { tone: "hi", className: "hs-leaf" }, 14));
    compound("yard", "yard.herbs", parts);
  }
}

/** Fruit trees in a row before the homestead fence: papaya and banana tall, lime and guava round. */
function fruitTrees() {
  const y = HOMESTEAD.y + HOMESTEAD.d + 14;
  CONFIG.fruits.forEach((fruit, i) => {
    const x = HOMESTEAD.x + 6 + i * (HOMESTEAD.w - 30) / Math.max(1, CONFIG.fruits.length - 1 || 1);
    const name = `yard.fruit-${fruit.replace(" ", "-")}${i}`;
    if (fruit === "pepaya") {
      // A slender trunk with a crown of large leaves and fruit clustered under it.
      const parts: Part[] = [{ at: [x, y, 16], svg: S(k.cylinder(x, y, 1.2, 0, 34, P, 16), { tone: "mid", crease: "none" }), shape: A.cylinder(x, y, 1.2, 0, 34) }];
      for (let j = 0; j < 7; j++) {
        const a = j * 0.9;
        parts.push(ballPart([x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 34.6 + (j % 2) * 0.6], 2.8, { tone: "hi", className: "hs-crown" }, 16));
      }
      parts.push({ at: [x, y, 31], svg: berries([[x + 1.6, y, 31], [x - 1.4, y + 0.6, 30.4], [x, y - 1.6, 31.6]], "hs-fruit-orange", 1.2), shape: A.ball([x + 1.4, y, 31], 0.5) });
      compound("yard", name, parts, { ref: [x, y, 30] });
    } else if (fruit === "pisang") {
      // A clump of three pseudo-stems with broad leaves and a hanging bunch.
      const parts: Part[] = [];
      for (const [dx, dy, h] of [[0, 0, 26], [3, 2, 20], [-2, 3, 16]]) {
        parts.push({ at: [x + dx, y + dy, h / 2], svg: S(k.cylinder(x + dx, y + dy, 1.5, 0, h, P, 16), { tone: "mid", crease: "none" }), shape: A.cylinder(x + dx, y + dy, 1.5, 0, h) });
        for (let j = 0; j < 4; j++) {
          const a = j * 1.6 + dx;
          parts.push(ballPart([x + dx + Math.cos(a) * 4, y + dy + Math.sin(a) * 4, h + 1], 2.8, { tone: "hi", className: "hs-crown" }, 16));
        }
      }
      parts.push({ at: [x + 1.6, y, 22], svg: berries([[x + 1.6, y, 22], [x + 1.6, y + 0.8, 21], [x + 2.2, y, 20.2]], "hs-fruit-yellow", 1.1), shape: A.ball([x + 1.6, y, 21], 0.4) });
      compound("yard", name, parts, { ref: [x, y, 22] });
    } else {
      tree(x, y, 14, [[0, 0, 20, fruit === "jambu" ? 10 : 8]], name);
    }
  });
}

/** The drying yard outside the laundry door: gravel, two T-posts, four lines with washing on them. */
function drying() {
  const g = plan(DRYING.x, DRYING.y, DRYING.w, DRYING.d, 1);
  box("yard", g, 0, 0.5, { tone: "lo", crease: "none" }, { bevel: 0, name: "yard.drying-gravel", extra: Dots(Array.from({ length: 40 }, (_, i) => at([g.x + 2 + jitter(i) * (g.w - 4), g.y + 2 + jitter(i + 50) * (g.d - 4), 0.5])), { size: 0.35, tone: "lo" }) });
  const xs = [DRYING.x + 6, DRYING.x + DRYING.w - 6];
  const yMid = DRYING.y + DRYING.d / 2;
  for (const x of xs) {
    cyl("yard", x, yMid, 0.9, 0.5, 34, { tone: "mid", crease: "none" }, { name: R.nameFor("yard.drying-post") });
    box("yard", plan(x - 1, yMid - 20, 2, 40, 0.3), 34.5, 1.4, { tone: "mid" }, { bevel: 0, name: R.nameFor("yard.drying-arm") });
  }
  const lines: string[] = [];
  const clothes: Part[] = [];
  [-16, -6, 6, 16].forEach((dy, li) => {
    const y = yMid + dy;
    lines.push(seg([xs[0] + 1, y, 34.4], [xs[1] - 1, y, 34.4]));
    for (let c = 0; c < 3; c++) {
      const x = xs[0] + 6 + c * 10 + (li % 2) * 4;
      const tall = 7 + jitter(li * 9 + c) * 5;
      clothes.push(boxPart(plan(x, y - 0.2, 6, 0.4, 0), 34.2 - tall, tall, { tone: "hi", className: `hs-cloth hs-cloth-${(li + c) % 4}` }, { steps: 1, bevel: 0 }));
    }
  });
  put("yard", [DRYING.x + DRYING.w / 2, yMid, 34.4], Ln(lines.join(""), { tone: "lo" }), [R.solid(A.box([xs[0], yMid - 17, 34.2], [xs[1], yMid + 17, 34.6], { name: "yard.drying-lines", limp: true }))], { name: "yard.drying-lines" });
  compound("yard", "yard.washing", clothes, { sort: true });
}

/** Rainwater: the back gutter's downpipe fills a 2,000 L tank; the front one drops into a drain pit and soakaway. */
function water() {
  box("yard", plan(TANK.x - TANK.r - 3, TANK.y - TANK.r - 3, TANK.r * 2 + 6, TANK.r * 2 + 6, 1), 0, 1.4, { tone: "lo" }, { bevel: 0.3, name: "yard.tank-pad" });
  const seams = [10, 20, 28].map((z) => k.sideArc(TANK.x, TANK.y, TANK.r, 1.4 + z, P, 40)).join("");
  cyl("yard", TANK.x, TANK.y, TANK.r, 1.4, TANK.h, { tone: "hi", inner: Ln(seams, { tone: "faint" }) }, { name: "yard.tank", bevel: 0.6, owner: "yard.tank" });
  cyl("yard", TANK.x, TANK.y, 4.4, 1.4 + TANK.h, 1.4, { tone: "mid" }, { name: "yard.tank-lid", owner: "yard.tank", extra: Ln(k.ring(TANK.x, TANK.y, 3, 2.8 + TANK.h, P, 20), { tone: "faint" }) });
  box("yard", plan(TANK.x - 1.5, TANK.y + TANK.r - 0.6, 3, 3.1, 0.4), 2.4, 3.2, { tone: "mid" }, { bevel: 0.2, name: "yard.tank-tap", owner: "yard.tank" });
  const gx = GUTTER.x1 - 4;
  const outlet = (piece: PieceId, y: number, name: string) => {
    cyl(piece, gx, y, 1.35, GUTTER.z - 1.6 - 1.2 + 1.2, 1.6, { tone: "mid" }, { name, owner: name.replace("-outlet", "") });
    return GUTTER.z - 1.6 - 0.02;
  };
  const backTop = outlet("roof", GUTTER.back, "roof.gutter-back-outlet");
  pipe("ground", [[gx, GUTTER.back, backTop], [gx, GUTTER.back, 1.4 + TANK.h + 0.02]], 1, { name: "ground.downpipe-back", tone: "mid", free: [true, false], maxLength: 24 });
  const frontTop = outlet("roof", GUTTER.front, "roof.gutter-front-outlet");
  // Drain pit with a grating at the foot of the front downpipe, a short covered channel and a soakaway lid.
  const pit = plan(gx - 4, GUTTER.front - 4, 8, 8, 0.6);
  box("yard", pit, 0, 1.2, { tone: "mid" }, { bevel: 0.2, name: "yard.drain-pit", extra: Ln([1.6, 3.2, 4.8, 6.4].map((d) => k.onTop([[pit.x + d, pit.y + 0.8], [pit.x + d, pit.y + pit.d - 0.8]], 1.2, P)).join("") + k.planOutline(k.insetPlan(pit, 0.8), 1.2, P, 2), { tone: "lo" }) });
  pipe("ground", [[gx, GUTTER.front, frontTop], [gx, GUTTER.front, 1.22]], 1, { name: "ground.downpipe-front", tone: "mid", free: [true, false], maxLength: 24 });
  const channel = plan(gx - 2, GUTTER.front + 4, 4, 22, 0.3);
  const slots: string[] = [];
  for (let y = channel.y + 2; y < channel.y + channel.d - 1; y += 2) slots.push(k.onTop([[channel.x + 0.6, y], [channel.x + channel.w - 0.6, y]], 0.6, P));
  box("yard", channel, 0, 0.6, { tone: "mid" }, { bevel: 0, name: "yard.drain-channel", extra: Ln(slots.join(""), { tone: "lo" }) });
  cyl("yard", gx, channel.y + channel.d + 6, 6, 0, 0.8, { tone: "mid" }, { name: "yard.soakaway", extra: Ln(k.ring(gx, channel.y + channel.d + 6, 4.6, 0.8, P, 28), { tone: "lo" }) });
}

/** Grass tufts scattered on the open lawn, kept off paths, beds, buildings and zones. */
function tufts() {
  const blades: string[] = [];
  const roots: number[][] = [];
  const clear = (x: number, y: number) =>
    !(x > HOUSE.x - 30 && x < RIGHT_X + 60 && y > HOUSE.y - 30 && y < FRONT_Y + 30) && !(x > CARPORT.x - 4 && x < CARPORT.x + CARPORT.w + 6) &&
    !(x > HOMESTEAD.x - 4 && y < HOMESTEAD.y + HOMESTEAD.d + 30) && !(x > BEDS.x - 6 && y > BEDS.y - 6 && y < BEDS.y + 3 * (BEDS.d + BEDS.gapY)) &&
    Math.abs(x - PATH_X) > 12 && !(x > DRYING.x - 4 && x < DRYING.x + DRYING.w + 4 && y < DRYING.y + DRYING.d + 4) && !(x > TANK.x - 30 && y < -150);
  for (let i = 0; i < 220; i++) {
    const x = PLOT.x + 8 + jitter(i * 3 + 1) * (PLOT.w - 16);
    const y = PLOT.y + 8 + jitter(i * 5 + 2) * (PLOT.d - 16);
    if (!clear(x, y) || y > GATE_Y - 8) continue;
    const h = 1.6 + jitter(i * 7) * 1.2;
    for (const lean of [-0.7, 0, 0.7]) blades.push(k.segment([x, y, 0], [x + lean, y - lean * 0.4, h * (lean ? 0.8 : 1)], P));
    roots.push(at([x, y, 0]));
  }
  under.push(Ln(blades.join(""), { tone: "lo" }) + Dots(roots, { size: 0.35, tone: "lo" }));
}

/** The food garden's own fence: along the lawn side and the front, meeting the homestead and plot fences, with a
 *  gate by the terrace so the kitchen is a few steps away. */
function gardenFence() {
  const LOW = 12; // 60 cm: keeps chickens and dogs out without hiding the beds
  const x = BEDS.x - 4; // clear of the terrace step
  const yB = HOMESTEAD.y + HOMESTEAD.d + 4;
  const yF = BEDS.y + 3 * BEDS.d + 2 * BEDS.gapY + 8;
  const gate: [number, number] = [-24, -10];
  fenceRun("y", x, [yB, -40, gate[0], gate[1], 20, yF], [gate], "yard.garden-fence", LOW);
  fencePanel("y", x + 0.6, gate[0] + 1.2, gate[1] - 1.2, "yard.garden-gate", LOW);
  fenceRun("x", yF, [x, 140, 170, PLOT.x + PLOT.w - 6], [], "yard.garden-fence", LOW);
}

export function food() {
  gardenFence();
  beds();
  herbs();
  fruitTrees();
  drying();
  water();
  tufts();
}
