// The grounds, zone by zone: the carport with its cars and motorcycles on grass pavers, the front fence and gates,
// the path, the ornamental garden with shade trees and flowering shrubs, garden lamps, the edible garden and herbs,
// The edible garden, fruit trees, drying yard and rainwater are in food.ts; the fenced homestead corner in coop.ts.
import { A, Dots, G, Ln, P, R, S, at, ballPart, box, boxPart, compound, cyl, cylPart, k, plan, put, type Part, type V3 } from "./core.ts";
import { CONFIG } from "./config-runtime.ts";
import { CARPORT, CARPORT_Z, DOOR, FENCE_H, FRONT_Y, GATE_Y, PATH_X, PLOT, PORCH } from "./world.ts";

export const jitter = (seed: number) => {
  const x = Math.sin(seed * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
};

// ── Parking ─────────────────────────────────────────────────────
function carport() {
  // Grass pavers from the gate to the carport: a concrete grid with grass in its cells (permeable).
  const drive = plan(CARPORT.x, CARPORT.y, CARPORT.w, GATE_Y - 4 - CARPORT.y, 0.6);
  const grid: string[] = [];
  for (let x = drive.x + 6; x < drive.x + drive.w - 1; x += 6) grid.push(k.onTop([[x, drive.y], [x, drive.y + drive.d]], 0.6, P));
  for (let y = drive.y + 6; y < drive.y + drive.d - 1; y += 6) grid.push(k.onTop([[drive.x, y], [drive.x + drive.w, y]], 0.6, P));
  box("yard", drive, 0, 0.6, { tone: "lo", crease: "none" }, { bevel: 0, name: "yard.pavers", extra: Ln(grid.join(""), { tone: "faint" }) });
  // Posts and a flat roof with a fascia and a gutter on the low side.
  const posts: [number, number][] = [[CARPORT.x + 2, CARPORT.y + 2], [CARPORT.x + CARPORT.w - 5, CARPORT.y + 2], [CARPORT.x + 2, CARPORT.y + CARPORT.d - 5], [CARPORT.x + CARPORT.w - 5, CARPORT.y + CARPORT.d - 5]];
  for (const [x, y] of posts) {
    box("yard", plan(x - 1, y - 1, 5, 5, 0.4), 0.6, 1.4, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("yard.carport-base") });
    box("yard", plan(x, y, 3, 3, 0.3), 2, CARPORT_Z - 2, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("yard.carport-post") });
  }
  const roofPlan = plan(CARPORT.x - 4, CARPORT.y - 4, CARPORT.w + 8, CARPORT.d + 8, 0.6);
  const ribs: string[] = [];
  for (let x = roofPlan.x + 8; x < roofPlan.x + roofPlan.w - 2; x += 8) ribs.push(k.onTop([[x, roofPlan.y], [x, roofPlan.y + roofPlan.d]], CARPORT_Z + 3, P));
  box("yard", roofPlan, CARPORT_Z, 3, { tone: "mid", inner: Ln(k.sideSeam(roofPlan, CARPORT_Z + 1.4, P, 2), { tone: "faint" }) }, { bevel: 0.4, name: "yard.carport-roof", extra: Ln(ribs.join(""), { tone: "faint" }) });

  // Cars, nose to the house, and motorcycles along the house side.
  for (let i = 0; i < CONFIG.cars; i++) car(CARPORT.x + 5 + i * 41, CARPORT.y + 14, i);
  for (let i = 0; i < CONFIG.motorcycles; i++) motorcycle(CARPORT.x + CARPORT.w - 12, CARPORT.y + 14 + i * 22, i);
}

/** A small family car: body, cabin with glass, four wheels; length along y (nose toward −y). */
function car(x: number, y: number, index: number) {
  const W = 34;
  const L = 82;
  const parts: Part[] = [];
  for (const [wx, wy] of [[x + 2, y + 14], [x + W - 2, y + 14], [x + 2, y + L - 16], [x + W - 2, y + L - 16]]) {
    const F = G.frameAlong([wx - (wx < x + W / 2 ? 0 : 3), wy, 6.2], [1, 0, 0]);
    parts.push({ at: [wx, wy, 6], svg: S(G.disc(0, 3, 6, F, P), { tone: "mid", className: "hs-tyre" }), shape: A.disc(F, 0, 3, 6) });
  }
  const body = plan(x + 0.5, y, W - 1, L, 7);
  parts.push(boxPart(body, 4.5, 11, { tone: "hi", inner: Ln(k.sideSeam(body, 10, P, 6), { tone: "faint" }) }, { steps: 6, bevel: 0.6 }));
  const cabin = plan(x + 3, y + 22, W - 6, 36, 6);
  parts.push(boxPart(cabin, 15.5, 11, { tone: "lo", className: "hs-glass" }, { steps: 6, bevel: 0.4 }));
  parts.push(boxPart(plan(x + 4, y + 25, W - 8, 30, 5), 26.5, 1.2, { tone: "hi" }, { steps: 5, bevel: 0.3 }));
  // Headlights on the nose face; the live figure lights them on click.
  for (const hx of [x + 6, x + W - 6]) parts.push({ at: [hx, y, 10], svg: `<g class="hs-headlight">${Dots([[hx, y - 0.1, 10.5]].map((p) => at(p as V3)), { size: 1.3, tone: "hi" })}</g>`, shape: A.ball([hx, y + 2, 10], 0.4) });
  compound("yard", `yard.car${index}`, parts, { ref: [x + W / 2, y + L / 2, 12] });
}

/** A scooter: two wheels, a body and a seat, parked along y. */
function motorcycle(x: number, y: number, index: number) {
  const parts: Part[] = [];
  for (const wy of [y + 2, y + 16]) {
    const F = G.frameAlong([x - 0.8, wy, 4.6], [1, 0, 0]);
    parts.push({ at: [x, wy, 4.6], svg: S(G.disc(0, 1.6, 4, F, P), { tone: "mid", className: "hs-tyre" }), shape: A.disc(F, 0, 1.6, 4) });
  }
  parts.push(boxPart(plan(x - 2.4, y + 3, 4.8, 12, 2), 4.6, 6, { tone: "hi" }, { steps: 3, bevel: 0.3 }));
  parts.push(boxPart(plan(x - 2, y + 7, 4, 7, 1.6), 10.6, 1.6, { tone: "mid" }, { steps: 3, bevel: 0.2 }));
  parts.push(boxPart(plan(x - 1.2, y + 1, 2.4, 2, 0.6), 8.6, 8, { tone: "mid" }, { steps: 2, bevel: 0 }));
  compound("yard", `yard.motorcycle${index}`, parts, { ref: [x, y + 9, 6] });
}

// ── Fence, gates, path ──────────────────────────────────────────
/** A run of slatted fence between two posts along x or y. */
function fencePanel(along: "x" | "y", fixed: number, from: number, to: number, name: string, h = FENCE_H) {
  const parts: string[] = [];
  const rail = along === "x" ? plan(from, fixed - 0.4, to - from, 0.8, 0.1) : plan(fixed - 0.4, from, 0.8, to - from, 0.1);
  for (const z of [4, h - 5]) parts.push(S(k.slabOf(rail, z, 1.4, P, 1), { tone: "mid", crease: "none" }));
  const slats: { d: number; svg: string }[] = [];
  for (let t = from + 1; t + 2 < to - 0.5; t += 3.4) {
    const p = along === "x" ? plan(t, fixed + 0.4, 2, 0.7, 0.1) : plan(fixed + 0.4, t, 0.7, 2, 0.1);
    const c: V3 = along === "x" ? [t, fixed, 0] : [fixed, t, 0];
    slats.push({ d: k.depthOf(c, P), svg: S(k.slabOf(p, 0.6, h - 1.6, P, 1), { tone: "hi", crease: "none" }) });
  }
  slats.sort((a, b) => a.d - b.d);
  const min: V3 = along === "x" ? [from, fixed - 0.4, 0.6] : [fixed - 0.4, from, 0.6];
  const max: V3 = along === "x" ? [to, fixed + 1.1, h - 1] : [fixed + 1.1, to, h - 1];
  const shape = R.solid(A.box(min, max, { name }));
  put("yard", [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, h / 2], parts.join("") + slats.map((p) => p.svg).join(""), [shape], { name });
}

function fencePost(x: number, y: number, h = FENCE_H + 2) {
  box("yard", plan(x - 1.2, y - 1.2, 2.4, 2.4, 0.3), 0, h, { tone: "mid" }, { bevel: 0.3, name: R.nameFor("yard.fence-post") });
  box("yard", plan(x - 1.6, y - 1.6, 3.2, 3.2, 0.4), h, 0.8, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("yard.post-cap") });
}

/** Posts at the given stations with panels between them, skipping the gaps (gates). */
function fenceRun(along: "x" | "y", fixed: number, stations: number[], gaps: [number, number][], name: string, h = FENCE_H) {
  for (let i = 0; i < stations.length - 1; i++) {
    const [a, b] = [stations[i], stations[i + 1]];
    if (!gaps.some(([g0, g1]) => a === g0 && b === g1)) fencePanel(along, fixed, a + 1.2, b - 1.2, R.nameFor(name), h);
  }
  for (const t of stations) along === "x" ? fencePost(t, fixed, h + 2) : fencePost(fixed, t, h + 2);
}

function fences() {
  const yF = GATE_Y - 2;
  const xR = PLOT.x + PLOT.w - 2;
  const xL = PLOT.x + 2;
  const walk: [number, number] = [PATH_X - 9, PATH_X + 9];
  const drive: [number, number] = [CARPORT.x, CARPORT.x + CARPORT.w];
  const front = [xL, drive[0], drive[1], -60, walk[0], walk[1], 20, 60, 100, 140, 170, xR];
  fenceRun("x", yF, front, [walk, drive], "yard.fence-front");
  fencePanel("x", yF - 0.6, walk[0] + 1.2, walk[1] - 1.2, "yard.gate");
  // Sides: the near side runs the whole depth; the far side only where it shows beyond the house.
  fenceRun("y", xR, [PLOT.y + 2, -170, -120, -78, -40, 0, 40, 80, 120, 160, 200, 240, yF], [], "yard.fence-right");
  fenceRun("y", xL, [FRONT_Y + 4, 40, 80, 120, 160, 200, 240, yF], [], "yard.fence-left");
  // Mailbox by the walking gate.
  const mb = plan(walk[1] + 2, yF - 7.6, 6, 4.4, 1.6);
  box("yard", plan(walk[1] + 4.2, yF - 6.2, 1.6, 1.6, 0.2), 0, 13, { tone: "mid" }, { bevel: 0.2, name: "yard.mailbox-post" });
  box("yard", mb, 13, 4.4, { tone: "hi", inner: Ln(k.sideSeam(mb, 15.6, P, 3), { tone: "faint" }) }, { steps: 3, bevel: 0.3, name: "yard.mailbox" });
}

function path() {
  // Stepping stones from the walking gate, bending to the front door's stoop.
  const doorX = DOOR.x + DOOR.w / 2;
  const stops: [number, number][] = [];
  for (let y = GATE_Y - 10; y > PORCH.y + PORCH.d + 8; y -= 9.5) {
    const t = Math.min(1, Math.max(0, (GATE_Y - 10 - y) / (GATE_Y - FRONT_Y - 60)));
    stops.push([PATH_X + (doorX - PATH_X) * (t * t * (3 - 2 * t)), y]);
  }
  stops.forEach(([x, y], i) => {
    const w = 10 + jitter(i + 20) * 2;
    box("yard", plan(x - w / 2 + (jitter(i) - 0.5) * 2, y, w, 6.4, 1.8), 0, 0.8, { tone: "lo" }, { steps: 3, bevel: 0.3, name: R.nameFor("yard.paver") });
  });
}

// ── Plants ──────────────────────────────────────────────────────
/** Thickness of the soil pit under a tree or shrub. */
const PIT = 0.3;
/** A tree: trunk and a crown of leaf balls, one item. */
export function tree(x: number, y: number, trunk: number, crowns: [number, number, number, number][], name: string, cls = "hs-crown") {
  // A ring of bare soil and mulch round the trunk, then the root flare and the trunk.
  const pitR = Math.max(5, Math.min(9, crowns[0][3] * 0.55));
  const mulch = Array.from({ length: 14 }, (_, j) => at([x + Math.cos(j * 2.4) * pitR * (0.45 + jitter(j + x) * 0.45), y + Math.sin(j * 2.4) * pitR * (0.45 + jitter(j + y) * 0.45), PIT]));
  const parts: Part[] = [cylPart(x, y, pitR, 0, PIT, { tone: "lo", className: "hs-soil-pit", inner: Dots(mulch, { size: 0.35, tone: "lo" }) }), cylPart(x, y, 2.4, PIT, 2 - PIT, { tone: "mid" }), cylPart(x, y, 1.8, 2, trunk, { tone: "mid", crease: "none", inner: Ln(k.knurl(x, y, 1.8, 2, 2 + trunk, 10, P, 0.2), { tone: "faint" }) })];
  crowns.forEach(([cx, cy, cz, r], ci) => {
    parts.push(ballPart([x + cx, y + cy, cz], r * 0.62, { tone: "hi", className: cls }));
    for (let j = 0; j < 9; j++) {
      const a = j * 2.39996 + ci;
      const upf = -0.5 + (j / 8) * 1.1;
      const rr = r * (0.42 + jitter(ci * 17 + j) * 0.12);
      const reach = r - rr * 0.95;
      const flat = Math.sqrt(1 - upf * upf);
      parts.push(ballPart([x + cx + Math.cos(a) * reach * flat, y + cy + Math.sin(a) * reach * flat, cz + upf * reach], rr, { tone: "hi", className: cls }));
    }
  });
  compound("yard", name, parts, { ref: [x, y, crowns[0][2]] });
}

/** A flowering shrub: leaf balls with a scatter of flower dots on top. */
function shrub(x: number, y: number, r: number, i: number, flowers = true) {
  const parts: Part[] = [cylPart(x + r * 0.15, y + r * 0.2, r * 1.75, 0, PIT, { tone: "lo", className: "hs-soil-pit" })];
  for (const [px, py, pr] of [[x, y, r], [x + r * 0.9, y + r * 0.5, r * 0.7], [x - r * 0.6, y + r * 0.9, r * 0.75], [x + r * 0.2, y - r * 0.9, r * 0.65]] as V3[])
    parts.push(ballPart([px, py, pr + PIT], pr, { tone: i % 2 ? "hi" : "mid", className: "hs-crown" }));
  if (flowers) {
    const dots: number[][] = [];
    for (let j = 0; j < 7; j++) {
      const a = j * 2.4 + i;
      dots.push(at([x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 1.75 + PIT]));
    }
    parts.push({ at: [x, y, r * 2.2], svg: `<g class="hs-flowers">${Dots(dots, { size: 0.9, tone: "hi" })}</g>`, shape: A.ball([x, y, r * 1.6 + PIT], 0.4) });
  }
  compound("yard", "yard.shrub", parts);
}

function ornamental() {
  const shade: [number, number, number, [number, number, number, number][]][] = [
    [-56, 180, 34, [[0, 0, 50, 16], [-9, -7, 41, 11], [9, 9, 40, 11], [-2, 2, 62, 10]]],
    [40, 120, 28, [[0, 0, 42, 13], [-8, 6, 34, 10], [7, -6, 33, 10]]],
    [170, 205, 26, [[0, 0, 38, 12], [-7, 6, 31, 9], [6, -6, 30, 9]]],
  ];
  shade.slice(0, CONFIG.shadeTrees).forEach(([x, y, trunk, crowns], i) => tree(x, y, trunk, crowns, `yard.shade-tree${i}`));
  const shrubs: [number, number, number][] = [[-34, 13, 4.6], [-14, 16, 4], [0, 8, 4.6], [16, 6, 4], [56, 44, 5], [-70, 150, 5.4], [-10, 190, 4.6], [70, 190, 5], [100, 130, 4.4], [-77, 222, 4], [40, 248, 4.6], [120, 236, 4.2], [-12, 252, 4]];
  shrubs.forEach(([x, y, r], i) => shrub(x, y, r, i));
  for (const [i, [x, y]] of ([[PATH_X + 12, GATE_Y - 170], [PATH_X - 12, GATE_Y - 120], [PATH_X + 12, GATE_Y - 70], [PATH_X - 12, GATE_Y - 25]] as [number, number][]).slice(0, CONFIG.lamps).entries()) gardenLamp(x, y, i);
}

function gardenLamp(x: number, y: number, index: number) {
  box("yard", plan(x - 1.4, y - 1.4, 2.8, 2.8, 0.4), 0, 1, { tone: "lo" }, { bevel: 0.2, name: R.nameFor("yard.lamp-foot") });
  cyl("yard", x, y, 0.55, 1, 11, { tone: "mid", crease: "none" }, { name: R.nameFor("yard.lamp-post") });
  box("yard", plan(x - 1.6, y - 1.6, 3.2, 3.2, 0.6), 12, 3, { tone: "hi", className: "hs-lantern" }, { bevel: 0, name: R.nameFor("yard.lamp-head"), extra: `<g data-lamp="${index}"></g>` });
  box("yard", plan(x - 2.1, y - 2.1, 4.2, 4.2, 0.8), 15, 1, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("yard.lamp-cap") });
}

export { carport, fences, path, ornamental, fencePanel, fenceRun };
