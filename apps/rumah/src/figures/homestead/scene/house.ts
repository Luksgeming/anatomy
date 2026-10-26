// The house shell: plinth, floors, walls with real openings, a facade on the near sides that hides when the house
// is opened, stairs, the upper slab, the covered terrace and its balcony.
import { Dots, Ln, P, R, at, ball, box, boxPart, compound, cyl, cylPart, k, onTop, pipe, plan, seg, type Part, type Plan, type V3 } from "./core.ts";
import {
  BACK_ROW, BALCONY, CUT_NEAR, CUT_PART, DOOR, EAVE, F1, F2, FOUND_H, FRONT_Y, HOUSE, IN, PORCH, RIGHT_X, SLAB, STAIR, STAIR_OPEN, TERRACE, WALL, type PieceId,
} from "./world.ts";

interface Opening { from: number; to: number; sill: number; head: number; kind: "window" | "door" | "glass"; shade?: boolean }

/** A straight wall along x (normal y) or along y (normal x), cut into piers, sills and lintels around its openings. */
function wall(piece: PieceId, along: "x" | "y", c0: number, c1: number, a0: number, a1: number, z0: number, z1: number, openings: Opening[] = [], { skirting = true, name = "wall", outward = 0 }: { skirting?: boolean; name?: string; outward?: number } = {}) {
  const planOf = (from: number, to: number): Plan => (along === "x" ? plan(from, c0, to - from, c1 - c0, 0.3) : plan(c0, from, c1 - c0, to - from, 0.3));
  const sorted = openings.filter((o) => o.head > z0 && o.sill < z1).sort((a, b) => a.from - b.from);
  const block = (from: number, to: number, za: number, zb: number) => {
    if (to - from < 0.2 || zb - za < 0.2) return;
    const p = planOf(from, to);
    const inner = skirting && za === z0 && zb - za > 8 ? Ln(k.sideSeam(p, z0 + 3, P, 2), { tone: "faint" }) : "";
    box(piece, p, za, zb - za, { tone: "mid", inner }, { bevel: 0.3, name: R.nameFor(`${piece}.${name}`) });
  };
  let cursor = a0;
  for (const o of sorted) {
    block(cursor, o.from, z0, z1);
    if (o.sill > z0) block(o.from, o.to, z0, Math.min(o.sill, z1));
    if (o.head < z1) block(o.from, o.to, Math.max(o.head, z0), z1);
    if (o.kind !== "door" && o.sill >= z0 && o.sill < z1) windowIn(piece, along, c0, c1, o, name, outward);
    cursor = o.to;
  }
  block(cursor, a1, z0, z1);
}

/** A window or glass door: a pane in the middle of the wall with frame bars as one item, an inner sill, and on the
 *  outside face a sun-shade awning above it (tropical windows are shaded, not bare). */
function windowIn(piece: PieceId, along: "x" | "y", c0: number, c1: number, o: Opening, name: string, outward: number) {
  const mid = (c0 + c1) / 2;
  const onX = along === "x";
  const P2 = (a: number, c: number, w: number, d: number, r: number) => (onX ? plan(a, c, w, d, r) : plan(c, a, d, w, r));
  const at3 = (a: number, c: number, z: number): V3 => (onX ? [a, c, z] : [c, a, z]);
  const face = mid + 0.25;
  const glint = Ln(seg(at3(o.from + 3, face, o.sill + 4), at3(o.from + 7, face, o.head - 4)) + seg(at3(o.from + 6, face, o.sill + 4), at3(o.from + 8, face, o.sill + 9)), { tone: "faint", free: true });
  const bars = o.kind === "glass" ? [o.from + (o.to - o.from) / 2] : (o.to - o.from > 30 ? [o.from + (o.to - o.from) / 3, o.from + (2 * (o.to - o.from)) / 3] : [(o.from + o.to) / 2]);
  const tz = o.head - Math.min(10, (o.head - o.sill) * 0.25);
  const parts: Part[] = [boxPart(P2(o.from, mid - 0.25, o.to - o.from, 0.5, 0), o.sill, o.head - o.sill, { tone: "lo", crease: "none", className: "hs-glass" }, { bevel: 0, extra: glint })];
  for (const b of bars) parts.push(boxPart(P2(b - 0.6, mid - 0.7, 1.2, 1.4, 0.2), o.sill, o.head - o.sill, { tone: "mid" }, { bevel: 0 }));
  const edges = [o.from, ...bars.map((b) => [b - 0.6, b + 0.6]).flat(), o.to];
  for (let i = 0; i < edges.length; i += 2) parts.push(boxPart(P2(edges[i], mid - 0.7, edges[i + 1] - edges[i], 1.4, 0.2), tz - 0.6, 1.2, { tone: "mid" }, { bevel: 0 }));
  compound(piece, `${piece}.${name}-window`, parts, { sort: false, ref: at3((o.from + o.to) / 2, mid, (o.sill + o.head) / 2) });
  if (o.kind !== "glass") box(piece, P2(o.from - 1, c1, o.to - o.from + 2, 1.6, 0.3), o.sill - 1, 1, { tone: "mid" }, { bevel: 0.2, name: R.nameFor(`${piece}.${name}-sill`) });
  if (o.shade && outward) {
    // The awning stands out from the outside face on two brackets.
    const outer = outward > 0 ? c1 : c0;
    const depth = 12;
    const shade = outward > 0 ? P2(o.from - 4, outer, o.to - o.from + 8, depth, 0.6) : P2(o.from - 4, outer - depth, o.to - o.from + 8, depth, 0.6);
    const lines: string[] = [];
    for (let t = o.from; t <= o.to + 0.1; t += 4) lines.push(onTop([onX ? [t, shade.y] : [shade.x, t], onX ? [t, shade.y + shade.d] : [shade.x + shade.w, t]], o.head + 4.6));
    box(piece, shade, o.head + 3.4, 1.2, { tone: "mid", inner: "" }, { bevel: 0.3, name: R.nameFor(`${piece}.${name}-shade`), extra: Ln(lines.join(""), { tone: "faint" }) });
    for (const t of [o.from, o.to - 1.2]) {
      const bracket = outward > 0 ? P2(t, outer, 1.2, depth - 1, 0.2) : P2(t, outer - depth + 1, 1.2, depth - 1, 0.2);
      box(piece, bracket, o.head + 1.4, 2, { tone: "mid" }, { bevel: 0, name: R.nameFor(`${piece}.${name}-bracket`) });
    }
  }
}

function floorLines(z: number, x0: number, x1: number, y0: number, y1: number, { planks = 0, grid = 0 }: { planks?: number; grid?: number }) {
  const out: string[] = [];
  if (planks) for (let y = y0 + planks; y < y1 - 0.5; y += planks) out.push(onTop([[x0, y], [x1, y]], z));
  if (grid) {
    for (let y = y0 + grid; y < y1 - 0.5; y += grid) out.push(onTop([[x0, y], [x1, y]], z));
    for (let x = x0 + grid; x < x1 - 0.5; x += grid) out.push(onTop([[x, y0], [x, y1]], z));
  }
  return Ln(out.join(""), { tone: "faint" });
}

/** A handrail between two newel balls sitting on the end posts: rim on sphere at both ends. */
function railBetween(piece: PieceId, a: V3, b: V3, name: string) {
  const R0 = 1.3;
  const r = 0.8;
  for (const c of [a, b]) ball(piece, c, R0, { tone: "mid" }, { name: R.nameFor(`${name}-newel`) });
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const u: V3 = [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d];
  const inset = Math.sqrt(R0 * R0 - r * r);
  pipe(piece, [[a[0] + u[0] * inset, a[1] + u[1] * inset, a[2] + u[2] * inset], [b[0] - u[0] * inset, b[1] - u[1] * inset, b[2] - u[2] * inset]], r, { name, tone: "mid", maxLength: 40, owner: name, caps: false });
}

/** A near wall: a low cut stub that always shows, and the facade above it that hides when the house is opened. */
function nearWall(piece: PieceId, along: "x" | "y", c0: number, c1: number, a0: number, a1: number, z0: number, z1: number, openings: Opening[], outward: number) {
  wall(piece, along, c0, c1, a0, a1, z0, z0 + CUT_NEAR, openings, { skirting: false, name: "stub" });
  wall(piece, along, c0, c1, a0, a1, z0 + CUT_NEAR, z1, openings, { skirting: false, name: "facade", outward });
}

export function house() {
  // Plinth (40 cm against floods) and the ground floor finish: timber in the living room, tiles elsewhere.
  const found = plan(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.d, 0.6);
  box("ground", found, 0, FOUND_H, { tone: "lo", inner: Ln(k.sideSeam(found, 3, P, 2), { tone: "faint" }) }, {
    bevel: 0.6,
    name: "ground.foundation",
    extra: floorLines(F1, HOUSE.x, -100, BACK_ROW, FRONT_Y, { planks: 4 }) + floorLines(F1, -100, RIGHT_X, BACK_ROW, FRONT_Y, { grid: 10 }) + floorLines(F1, HOUSE.x, RIGHT_X, HOUSE.y, BACK_ROW, { grid: 8 }),
  });

  const z1 = F2 - SLAB;
  // Far walls run full height; high windows and vents let the air cross the house.
  wall("ground", "x", HOUSE.y, HOUSE.y + WALL, HOUSE.x, RIGHT_X, F1, z1, [
    { from: -182, to: -160, sill: F1 + 40, head: F1 + 54, kind: "window" },
    { from: -62, to: -24, sill: F1 + 30, head: F1 + 54, kind: "window" },
    { from: 8, to: 36, sill: F1 + 32, head: F1 + 54, kind: "window" },
  ]);
  wall("ground", "y", HOUSE.x, HOUSE.x + WALL, HOUSE.y + WALL, FRONT_Y, F1, z1, [
    { from: -95, to: -40, sill: F1 + 14, head: F1 + 56, kind: "window" },
  ]);
  // Near walls: the front with the entrance, the garden side with the terrace and laundry doors.
  nearWall("ground", "x", FRONT_Y - WALL, FRONT_Y, HOUSE.x + WALL, RIGHT_X - WALL, F1, z1, [
    { from: -176, to: -120, sill: F1 + 14, head: F1 + 56, kind: "window", shade: true },
    { from: DOOR.x, to: DOOR.x + DOOR.w, sill: F1, head: F1 + 99, kind: "door" },
    { from: -28, to: 28, sill: F1 + 30, head: F1 + 56, kind: "window", shade: true },
  ], 1);
  nearWall("ground", "y", RIGHT_X - WALL, RIGHT_X, HOUSE.y + WALL, FRONT_Y, F1, z1, [
    { from: -150, to: -132, sill: F1, head: F1 + 99, kind: "door" },
    { from: -100, to: -60, sill: F1, head: F1 + 50, kind: "glass" },
  ], 1);
  // Partitions: the service rooms behind, with doors.
  wall("ground", "x", BACK_ROW - 1.5, BACK_ROW + 1.5, IN.x, RIGHT_X - WALL, F1, F1 + CUT_PART, [
    { from: -150, to: -76, sill: F1, head: F1 + 99, kind: "door" },
    { from: -32, to: -16, sill: F1, head: F1 + 99, kind: "door" },
  ]);
  wall("ground", "y", -151.5, -148.5, IN.y, BACK_ROW - 1.5, F1, F1 + CUT_PART, [{ from: -140, to: -124, sill: F1, head: F1 + 99, kind: "door" }]);
  wall("ground", "y", -76.5, -73.5, IN.y, BACK_ROW - 1.5, F1, F1 + CUT_PART);
  wall("ground", "y", -11.5, -8.5, IN.y, BACK_ROW - 1.5, F1, F1 + CUT_PART, [{ from: -150, to: -134, sill: F1, head: F1 + 99, kind: "door" }]);

  // The front door, closed and open (the page shows one), a threshold, a mat and a canopy.
  box("ground", plan(DOOR.x, FRONT_Y - WALL, DOOR.w, WALL, 0.2), F1, 0.6, { tone: "lo" }, { bevel: 0, name: "ground.threshold" });
  box("ground", plan(DOOR.x + 0.2, FRONT_Y - WALL - DOOR.w + 0.5, 1.4, DOOR.w - 0.5, 0.2), F1 + 0.6, DOOR.h, { tone: "hi" }, {
    name: "ground.door",
    extra: Dots([at([DOOR.x + 1.6, FRONT_Y - WALL - DOOR.w + 3, F1 + 24])], { size: 0.7, tone: "hi" }),
  });
  box("ground", plan(DOOR.x + 0.2, FRONT_Y - WALL + 0.8, DOOR.w - 0.4, 1.4, 0.2), F1 + 0.6, DOOR.h, { tone: "hi" }, {
    name: "ground.door-closed",
    extra: Dots([at([DOOR.x + DOOR.w - 3, FRONT_Y - WALL + 2.2, F1 + 24])], { size: 0.7, tone: "hi" }),
  });
  porch();
  facadeAccents();

  // Stairs: sixteen 20 cm risers along the back wall, rising toward +x, with a rail on the open side.
  const rise = (F2 - F1) / STAIR.steps;
  const tread = STAIR.w / STAIR.steps;
  for (let index = 0; index < STAIR.steps; index++) {
    const p = plan(STAIR.x + index * tread, STAIR.y, tread, STAIR.d, 0.2);
    box("ground", p, F1, rise * (index + 1), { tone: "mid" }, { bevel: 0.3, name: R.nameFor("ground.stair"), extra: Ln(onTop([[p.x + 0.8, p.y], [p.x + 0.8, p.y + p.d]], F1 + rise * (index + 1)), { tone: "faint" }) });
  }
  const railY = STAIR.y + STAIR.d - 1.2;
  const posts: V3[] = [];
  for (const index of [0, 5, 10]) {
    const x = STAIR.x + index * tread + tread / 2;
    const zt = F1 + rise * (index + 1);
    const end = index !== 5;
    cyl("ground", x, railY, 0.6, zt, end ? 14 : 14 - 1.2, { tone: "mid", crease: "none" }, { name: R.nameFor("ground.baluster") });
    posts.push([x, railY, zt + 14 + (end ? 1.3 : 0)]);
  }
  railBetween("ground", posts[0], posts[posts.length - 1], "ground.handrail");

  // Upper slab: a frame round the stair void, cantilevered over the cut near walls.
  const slabA = plan(HOUSE.x + WALL, STAIR_OPEN.y + STAIR_OPEN.d, HOUSE.w - WALL, FRONT_Y - STAIR_OPEN.y - STAIR_OPEN.d, 0.4);
  const slabB = plan(HOUSE.x + WALL, HOUSE.y + WALL, STAIR_OPEN.x - HOUSE.x - WALL, STAIR_OPEN.d, 0.4);
  const slabC = plan(STAIR_OPEN.x + STAIR_OPEN.w, HOUSE.y + WALL, RIGHT_X - STAIR_OPEN.x - STAIR_OPEN.w, STAIR_OPEN.d, 0.4);
  box("upper", slabB, F2 - SLAB, SLAB, { tone: "lo" }, { name: "upper.slab-left", extra: floorLines(F2, slabB.x, slabB.x + slabB.w, slabB.y, slabB.y + slabB.d, { grid: 8 }) });
  box("upper", slabC, F2 - SLAB, SLAB, { tone: "lo" }, { name: "upper.slab-right", extra: floorLines(F2, slabC.x, RIGHT_X, slabC.y, slabC.y + slabC.d, { planks: 4 }) });
  box("upper", slabA, F2 - SLAB, SLAB, { tone: "lo", inner: Ln(k.sideSeam(slabA, F2 - 1.4, P, 2), { tone: "faint" }) }, {
    name: "upper.slab-front",
    extra: floorLines(F2, slabA.x, slabA.x + slabA.w, BACK_ROW, FRONT_Y, { planks: 4 }) + floorLines(F2, slabA.x, slabA.x + slabA.w, slabA.y, BACK_ROW, { grid: 8 }),
  });

  // Upper walls.
  wall("upper", "x", HOUSE.y, HOUSE.y + WALL, HOUSE.x, RIGHT_X, F2 - SLAB, EAVE, [
    { from: -182, to: -160, sill: F2 + 34, head: F2 + 48, kind: "window" },
    { from: -120, to: -80, sill: F2 + 20, head: F2 + 48, kind: "window" },
    { from: 10, to: 32, sill: F2 + 34, head: F2 + 48, kind: "window" },
  ]);
  wall("upper", "y", HOUSE.x, HOUSE.x + WALL, HOUSE.y + WALL, FRONT_Y, F2 - SLAB, EAVE, [
    { from: -95, to: -45, sill: F2 + 16, head: F2 + 48, kind: "window" },
  ]);
  nearWall("upper", "x", FRONT_Y - WALL, FRONT_Y, HOUSE.x + WALL, RIGHT_X - WALL, F2, EAVE, [
    { from: -172, to: -112, sill: F2 + 14, head: F2 + 48, kind: "window", shade: true },
    { from: -52, to: 8, sill: F2 + 14, head: F2 + 48, kind: "window", shade: true },
  ], 1);
  nearWall("upper", "y", RIGHT_X - WALL, RIGHT_X, HOUSE.y + WALL, FRONT_Y, F2, EAVE, [
    { from: -160, to: -140, sill: F2 + 32, head: F2 + 48, kind: "window" },
    ...(BALCONY ? [{ from: -98, to: -62, sill: F2, head: F2 + 50, kind: "glass" as const }] : [{ from: -98, to: -62, sill: F2 + 14, head: F2 + 48, kind: "window" as const, shade: true }]),
  ], 1);
  wall("upper", "x", BACK_ROW - 1.5, BACK_ROW + 1.5, IN.x, RIGHT_X - WALL, F2, F2 + CUT_PART, [
    { from: -176, to: -160, sill: F2, head: F2 + 99, kind: "door" },
    { from: -132, to: -116, sill: F2, head: F2 + 99, kind: "door" },
    { from: -44, to: -28, sill: F2, head: F2 + 99, kind: "door" },
    { from: 20, to: 36, sill: F2, head: F2 + 99, kind: "door" },
  ]);
  wall("upper", "y", -81.5, -78.5, BACK_ROW + 1.5, FRONT_Y - WALL, F2, F2 + CUT_PART);
  wall("upper", "y", -151.5, -148.5, IN.y, BACK_ROW - 1.5, F2, F2 + CUT_PART);
  wall("upper", "y", -11.5, -8.5, IN.y, BACK_ROW - 1.5, F2, F2 + CUT_PART);

  // Railing round the stair void, upstairs.
  const ry = STAIR_OPEN.y + STAIR_OPEN.d + 0.9;
  const rxs = [STAIR_OPEN.x + 3, STAIR_OPEN.x + 27, STAIR_OPEN.x + 51, STAIR_OPEN.x + STAIR_OPEN.w - 3];
  rxs.forEach((x, i) => cyl("upper", x, ry, 0.6, F2, i === 0 || i === rxs.length - 1 ? 18 : 18 - 1.2, { tone: "mid", crease: "none" }, { name: R.nameFor("upper.baluster") }));
  railBetween("upper", [rxs[0], ry, F2 + 18 + 1.3], [rxs[rxs.length - 1], ry, F2 + 18 + 1.3], "upper.handrail");

  terrace();
}

/** The front terrace: a stone-tiled deck on the plinth, two steps down to the path, a flat roof on two columns
 *  with stone bases, and a timber bench by the door. */
function porch() {
  const { x, y, w, d } = PORCH;
  box("ground", plan(x, y, w, d, 0.6), 0, F1, { tone: "lo" }, { name: "ground.porch", extra: floorLines(F1, x, x + w, y, y + d, { grid: 8 }) });
  const sx = DOOR.x - 2;
  const sw = DOOR.w + 6;
  box("ground", plan(sx, y + d, sw, 4, 0.4), 0, (F1 * 2) / 3, { tone: "lo" }, { name: R.nameFor("ground.porch-step") });
  box("ground", plan(sx, y + d + 4, sw, 4, 0.4), 0, F1 / 3, { tone: "lo" }, { name: R.nameFor("ground.porch-step") });
  const roofZ = F2 - SLAB - 2;
  for (const cx of [x + 2, x + w - 6]) {
    const cy = y + d - 6;
    box("ground", plan(cx - 0.8, cy - 0.8, 5.6, 5.6, 0.4), F1, 8, { tone: "mid", inner: Ln(k.sideSeam(plan(cx - 0.8, cy - 0.8, 5.6, 5.6, 0.4), F1 + 4, P, 2), { tone: "faint" }) }, { bevel: 0.3, name: R.nameFor("ground.porch-plinth") });
    box("ground", plan(cx, cy, 4, 4, 0.3), F1 + 8, roofZ - F1 - 8, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("ground.porch-column") });
  }
  const roof = plan(x - 2, y, w + 4, d + 1, 0.6);
  box("ground", roof, roofZ, 2.4, { tone: "mid", inner: Ln(k.sideSeam(roof, roofZ + 1.2, P, 2), { tone: "faint" }) }, { bevel: 0.4, name: "ground.porch-roof" });
  // A slatted bench against the wall left of the door.
  const bench = plan(DOOR.x + DOOR.w + 3, y + 1, 16, 6, 0.4);
  const slats: string[] = [];
  for (let sy = bench.y + 1.5; sy < bench.y + bench.d - 0.5; sy += 1.5) slats.push(onTop([[bench.x, sy], [bench.x + bench.w, sy]], F1 + 9));
  for (const lx of [bench.x + 1, bench.x + bench.w - 2.4]) box("ground", plan(lx, bench.y + 1, 1.4, bench.d - 2, 0.2), F1, 8, { tone: "mid" }, { bevel: 0, name: R.nameFor("ground.porch-bench-leg") });
  box("ground", bench, F1 + 8, 1, { tone: "hi" }, { bevel: 0.2, name: "ground.porch-bench", extra: Ln(slats.join(""), { tone: "faint" }) });
}

/** Material accents on the near facades: a natural-stone feature wall beside the entrance and a timber slat screen
 *  between the upper windows. Both are facade items, so they step aside with the facade when the house opens. */
function facadeAccents() {
  const face = FRONT_Y;
  // Stone: courses of uneven blocks; each row's joints stop on the course lines above and below.
  const s0 = -114;
  const s1 = DOOR.x - 4;
  const z0 = F1 + CUT_NEAR;
  const z1 = F2 - SLAB - 2;
  const stone = plan(s0, face, s1 - s0, 0.6, 0);
  const joints: string[] = [];
  const course = 4;
  for (let z = z0 + course, row = 0; z < z1 - 0.5; z += course, row++) joints.push(seg([s0, face + 0.6, z], [s1, face + 0.6, z]));
  for (let z = z0, row = 0; z < z1 - 0.5; z += course, row++) {
    const top = Math.min(z + course, z1);
    for (let xx = s0 + 3 + ((row * 3.7) % 5); xx < s1 - 1.5; xx += 5 + ((row * 7 + xx) % 3)) joints.push(seg([xx, face + 0.6, z], [xx, face + 0.6, top]));
  }
  box("ground", stone, z0, z1 - z0, { tone: "mid", crease: "none" }, { bevel: 0, name: "ground.facade-stone", extra: Ln(joints.join(""), { tone: "faint" }) });
  // Timber: vertical slats on battens between the two upper front windows, clear of their awnings.
  const w0 = -105;
  const w1 = -59;
  const zb = F2 + 6;
  const zt = EAVE - 6;
  const slats: string[] = [];
  for (let xx = w0 + 2.5; xx < w1 - 1; xx += 2.5) slats.push(seg([xx, face + 0.8, zb], [xx, face + 0.8, zt]));
  box("upper", plan(w0, face, w1 - w0, 0.8, 0), zb, zt - zb, { tone: "mid", crease: "none" }, { bevel: 0, name: "upper.facade-wood", extra: Ln(slats.join(""), { tone: "lo" }) });
}

/** The covered terrace on the garden side: a timber deck on the plinth, two columns, a step down, and above it
 *  the balcony slab with its railing. */
function terrace() {
  const deck = plan(TERRACE.x, TERRACE.y, TERRACE.w, TERRACE.d, 0.6);
  box("ground", deck, 0, F1, { tone: "lo" }, { name: "ground.terrace", extra: floorLines(F1, TERRACE.x, TERRACE.x + TERRACE.w, TERRACE.y, TERRACE.y + TERRACE.d, { planks: 3 }) });
  box("ground", plan(TERRACE.x + TERRACE.w, TERRACE.y + 20, 6, TERRACE.d - 40, 0.4), 0, F1 / 2, { tone: "lo" }, { name: "ground.terrace-step" });
  const roofZ = F2 - SLAB;
  for (const y of [TERRACE.y + 3, TERRACE.y + TERRACE.d - 6]) {
    box("ground", plan(TERRACE.x + TERRACE.w - 6, y - 0.5, 4, 4, 0.4), F1, 1.4, { tone: "mid" }, { name: R.nameFor("ground.terrace-base") });
    box("ground", plan(TERRACE.x + TERRACE.w - 5.4, y, 2.8, 2.8, 0.3), F1 + 1.4, roofZ - F1 - 1.4, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("ground.terrace-column") });
  }
  const top = plan(TERRACE.x, TERRACE.y, TERRACE.w, TERRACE.d, 0.4);
  box("upper", top, roofZ, SLAB, { tone: "lo", inner: Ln(k.sideSeam(top, roofZ + 1.4, P, 2), { tone: "faint" }) }, {
    name: "upper.balcony-slab",
    extra: BALCONY ? floorLines(F2, TERRACE.x, TERRACE.x + TERRACE.w, TERRACE.y, TERRACE.y + TERRACE.d, { grid: 8 }) : "",
  });
  if (!BALCONY) return;
  // Balcony railing: posts, a top rail and slender balusters between them, along the two open sides.
  const x1 = TERRACE.x + TERRACE.w - 2;
  const y0 = TERRACE.y + 2;
  const y1 = TERRACE.y + TERRACE.d - 2;
  const corner: V3 = [x1, y1, F2 + 19.3];
  const side: V3 = [x1, y0, F2 + 19.3];
  const back: V3 = [TERRACE.x + 2, y1, F2 + 19.3];
  for (const [x, y] of [[x1, y0], [x1, y1], [TERRACE.x + 2, y1]]) cyl("upper", x, y, 0.8, F2 + 0.6, 17.4, { tone: "mid", crease: "none" }, { name: R.nameFor("upper.balcony-post") });
  railBetween("upper", side, corner, "upper.balcony-rail-side");
  railBetween("upper", back, corner, "upper.balcony-rail-front");
  // A curb along each open side with slender round balusters standing on it up to the rail.
  const bar = (x: number, y: number): Part => cylPart(x, y, 0.3, F2 + 0.6, 17.5, { tone: "mid", crease: "none" });
  const sideRail: Part[] = [boxPart(plan(x1 - 0.3, y0, 0.6, y1 - y0, 0.1), F2, 0.6, { tone: "mid" }, { bevel: 0 })];
  for (let y = y0 + 4; y < y1 - 3; y += 4) sideRail.push(bar(x1, y));
  compound("upper", "upper.balcony-curb-side", sideRail, { ref: [x1, (y0 + y1) / 2, F2 + 9] });
  const front: Part[] = [boxPart(plan(TERRACE.x + 2, y1 - 0.3, x1 - TERRACE.x - 2, 0.6, 0.1), F2, 0.6, { tone: "mid" }, { bevel: 0 })];
  for (let x = TERRACE.x + 6; x < x1 - 3; x += 4) front.push(bar(x, y1));
  compound("upper", "upper.balcony-curb-front", front, { ref: [(TERRACE.x + x1) / 2, y1, F2 + 9] });
}
