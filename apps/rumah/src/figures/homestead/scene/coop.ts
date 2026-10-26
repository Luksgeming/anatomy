// The chicken coop: a raised hen house with a nest box and ramp, a mesh run, feeder, waterer and four hens.
import { A, Dots, G, Ln, P, R, S, at, box, cyl, k, plan, put, seg, type V3 } from "./core.ts";
import { CONFIG } from "./config-runtime.ts";
import { COOP, COOP_FLOOR, HOMESTEAD, RUN } from "./world.ts";
import { fencePanel, fenceRun } from "./garden.ts";

const ALONG_Y = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const WALL_TOP = { back: 41.6, front: 36.6 };
const wallTopAt = (x: number) => WALL_TOP.back + ((x - COOP.x) / COOP.w) * (WALL_TOP.front - WALL_TOP.back);

function henHouse() {
  const [x0, x1, y0, y1] = [COOP.x, COOP.x + COOP.w, COOP.y, COOP.y + COOP.d];
  for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 2.6, y0 + 1], [x0 + 1, y1 - 2.6], [x1 - 2.6, y1 - 2.6]])
    box("yard", plan(x, y, 1.6, 1.6, 0.2), 0, COOP_FLOOR, { tone: "mid" }, { bevel: 0.2, name: R.nameFor("yard.coop-leg") });
  const floor = plan(x0, y0, COOP.w, COOP.d, 0.4);
  box("yard", floor, COOP_FLOOR, 1.5, { tone: "lo" }, { bevel: 0.3, name: "yard.coop-floor" });
  // Board walls with a sloping top, seams every 3 units on both faces you can see.
  const z0 = COOP_FLOOR + 1.5;
  const poly = [[x0, z0], [x1, z0], [x1, WALL_TOP.front], [x0, WALL_TOP.back]];
  const shape = R.solid(A.prism(ALONG_Y, poly, y0, y1, { name: "yard.coop-body" }));
  const seams: string[] = [];
  for (let z = z0 + 3; z < WALL_TOP.back - 0.5; z += 3) {
    const xEnd = z <= WALL_TOP.front ? x1 : x0 + ((WALL_TOP.back - z) / (WALL_TOP.back - WALL_TOP.front)) * COOP.w;
    seams.push(seg([x0, y1, z], [xEnd, y1, z]));
    if (z <= WALL_TOP.front) seams.push(seg([x1, y0, z], [x1, y1, z]));
  }
  // Pop hole on the run side, seen as a dark opening with a frame.
  const hole: V3[] = [[x0 + 4, y1 + 0.01, z0], [x0 + 10, y1 + 0.01, z0], [x0 + 10, y1 + 0.01, z0 + 8], [x0 + 4, y1 + 0.01, z0 + 8]];
  const holeD = `M${hole.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`;
  // A side window with a wire grille.
  const win: V3[] = [[x1 + 0.01, y0 + 9, z0 + 9], [x1 + 0.01, y0 + 19, z0 + 9], [x1 + 0.01, y0 + 19, z0 + 15], [x1 + 0.01, y0 + 9, z0 + 15]];
  const winD = `M${win.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`;
  const grille: string[] = [];
  for (let y = y0 + 11; y < y0 + 19; y += 2) grille.push(seg([x1 + 0.01, y, z0 + 9], [x1 + 0.01, y, z0 + 15]));
  put(
    "yard",
    [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + WALL_TOP.front) / 2],
    S(G.prismOf(ALONG_Y, poly, y0, y1, P), { tone: "mid", inner: Ln(seams.join(""), { tone: "faint" }) }) +
      `<path class="hs-cavity" d="${holeD}"/>` + Ln(holeD, { tone: "lo" }) +
      `<path class="hs-cavity" d="${winD}"/>` + Ln(grille.join(""), { tone: "lo" }) + Ln(winD, { tone: "lo" }),
    [shape],
    { name: "yard.coop-body" },
  );
  // Shed roof overhanging every side.
  const roofPoly = [[x0 - 2.4, wallTopAt(x0 - 2.4)], [x1 + 2.4, wallTopAt(x1 + 2.4)], [x1 + 2.4, wallTopAt(x1 + 2.4) + 1.6], [x0 - 2.4, wallTopAt(x0 - 2.4) + 1.6]];
  const roofShape = R.solid(A.prism(ALONG_Y, roofPoly, y0 - 2.4, y1 + 2.4, { name: "yard.coop-roof" }));
  const ribs: string[] = [];
  for (let y = y0; y <= y1 + 0.1; y += 4) ribs.push(seg([x0 - 2.4, y, wallTopAt(x0 - 2.4) + 1.6], [x1 + 2.4, y, wallTopAt(x1 + 2.4) + 1.6]));
  put("yard", [(x0 + x1) / 2, (y0 + y1) / 2, WALL_TOP.back + 1], S(G.prismOf(ALONG_Y, roofPoly, y0 - 2.4, y1 + 2.4, P), { tone: "mid", inner: Ln(ribs.join(""), { tone: "faint" }) }), [roofShape], { name: "yard.coop-roof" });
  // Nest box on the side, with a sloping lid and a hinge line.
  const nest = plan(x1, y0 + 4, 6, 14, 0.4);
  box("yard", nest, z0 + 2, 8, { tone: "hi", inner: Ln(k.sideSeam(nest, z0 + 6, P, 2), { tone: "faint" }) }, { bevel: 0.3, name: "yard.nest" });
  const lidPoly = [[x1, z0 + 11.4], [x1 + 7, z0 + 9.6], [x1 + 7, z0 + 10.4], [x1, z0 + 12.2]];
  const lid = R.solid(A.prism(ALONG_Y, lidPoly, nest.y - 0.6, nest.y + nest.d + 0.6, { name: "yard.nest-lid" }));
  put("yard", [x1 + 3.5, nest.y + nest.d / 2, z0 + 11], S(G.prismOf(ALONG_Y, lidPoly, nest.y - 0.6, nest.y + nest.d + 0.6, P), { tone: "mid" }), [lid], { name: "yard.nest-lid" });
  box("yard", plan(x1, nest.y - 0.6, 0.6, nest.d + 1.2, 0.2), z0 + 10, 1.4, { tone: "mid" }, { bevel: 0, name: "yard.nest-lath" });
  // Ramp from the pop hole down to the run, with cleats.
  const rampLen = 18;
  const fall = z0;
  const a = G.unit3([0, rampLen, -fall]);
  let v = G.unit3(G.cross3(a, [1, 0, 0]));
  if (v[2] < 0) v = G.mul3(v, -1);
  const F = G.frameOf([x0 + 7, y1, z0], a, [1, 0, 0], v);
  const length = Math.hypot(rampLen, fall);
  const rp = [[-3, 0], [3, 0], [3, 0.8], [-3, 0.8]];
  const rampShape = R.solid(A.prism(F, rp, 0, length, { name: "yard.ramp" }));
  const cleats: string[] = [];
  for (let t = 3; t < length - 1; t += 3) {
    const c = G.add3(G.add3(F.o, G.mul3(a, t)), G.mul3(v, 0.8));
    cleats.push(seg([c[0] - 3, c[1], c[2]], [c[0] + 3, c[1], c[2]]));
  }
  put("yard", G.add3(F.o, G.mul3(a, length / 2)), S(G.prismOf(F, rp, 0, length, P), { tone: "mid", inner: Ln(cleats.join(""), { tone: "lo" }) }), [rampShape], { name: "yard.ramp" });
}

function run() {
  const [x0, x1, y0, y1] = [RUN.x, RUN.x + RUN.w, RUN.y, RUN.y + RUN.d];
  const H = 30;
  const BASE = 2;
  const xs = [x0, x0 + 26, x0 + 52, x1 - 1.6];
  const ys = [y0, y0 + 32, y1 - 1.6];
  const posts: [number, number][] = [];
  for (const x of xs) posts.push([x, y1 - 1.6], [x, y0]);
  for (const y of ys.slice(1, -1)) posts.push([x0, y], [x1 - 1.6, y]);
  for (const [x, y] of posts) box("yard", plan(x, y, 1.6, 1.6, 0.2), 0, H, { tone: "mid" }, { bevel: 0.2, owner: "yard.run", name: R.nameFor("yard.run-post") });
  // Top rails and a kick board along the near sides.
  box("yard", plan(x0 + 1.6, y1 - 1.6, RUN.w - 3.2, 1.6, 0.2), H - 1.4, 1.4, { tone: "mid" }, { bevel: 0.2, owner: "yard.run", name: "yard.run-rail-front" });
  box("yard", plan(x1 - 1.6, y0 + 1.6, 1.6, RUN.d - 3.2, 0.2), H - 1.4, 1.4, { tone: "mid" }, { bevel: 0.2, owner: "yard.run", name: "yard.run-rail-right" });
  box("yard", plan(x0 + 1.6, y0, RUN.w - 3.2, 1.6, 0.2), H - 1.4, 1.4, { tone: "mid" }, { bevel: 0.2, owner: "yard.run", name: "yard.run-rail-back" });
  box("yard", plan(x0, y0 + 1.6, 1.6, RUN.d - 3.2, 0.2), H - 1.4, 1.4, { tone: "mid" }, { bevel: 0.2, owner: "yard.run", name: "yard.run-rail-left" });
  // Mesh panels between posts: a square wire grid that ends on the posts and rails.
  const mesh = (name: string, a: V3, b: V3, along: "x" | "y") => {
    const out: string[] = [];
    const len = along === "x" ? b[0] - a[0] : b[1] - a[1];
    for (let t = 2.5; t < len - 0.5; t += 2.5) {
      const p = along === "x" ? [a[0] + t, a[1], 0] : [a[0], a[1] + t, 0];
      out.push(seg([p[0], p[1], BASE], [p[0], p[1], H - 1.4]));
    }
    for (let z = BASE + 2.5; z < H - 1.6; z += 2.5) out.push(seg([a[0], a[1], z], [b[0], b[1], z]));
    // Battens where the wire is stapled to the posts, from the kick board to the rail.
    const battens = [a, b].map((p) => seg([p[0], p[1], BASE], [p[0], p[1], H - 1.4]));
    // A kick board along the bottom: the wire runs from its top edge to the rail.
    const board = along === "x" ? plan(a[0], a[1] - 0.4, b[0] - a[0], 0.8, 0.1) : plan(a[0] - 0.4, a[1], 0.8, b[1] - a[1], 0.1);
    box("yard", board, 0, BASE, { tone: "mid" }, { bevel: 0.2, steps: 1, owner: "yard.run", name: R.nameFor(`${name}-board`) });
    const min: V3 = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), BASE];
    const max: V3 = [Math.max(a[0], b[0]) + (along === "y" ? 0.1 : 0), Math.max(a[1], b[1]) + (along === "x" ? 0.1 : 0), H - 1.4];
    const shape = R.solid(A.box(min, max, { name, limp: true }));
    put("yard", [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, H / 2], `<g class="hs-mesh">${Ln(out.join(""), { tone: "faint" })}${Ln(battens.join(""), { tone: "lo" })}</g>`, [shape], { name });
  };
  for (let i = 0; i < xs.length - 1; i++) {
    mesh(R.nameFor("yard.mesh-front"), [xs[i] + 1.45, y1 - 0.8, 0], [xs[i + 1] + 0.15, y1 - 0.8, 0], "x");
    if (xs[i + 1] <= COOP.x) mesh(R.nameFor("yard.mesh-back"), [xs[i] + 1.45, y0 + 0.8, 0], [xs[i + 1] + 0.15, y0 + 0.8, 0], "x");
  }
  for (let i = 0; i < ys.length - 1; i++) {
    mesh(R.nameFor("yard.mesh-left"), [x0 + 0.8, ys[i] + 1.45, 0], [x0 + 0.8, ys[i + 1] + 0.15, 0], "y");
    if (ys[i] >= COOP.y + COOP.d) mesh(R.nameFor("yard.mesh-right"), [x1 - 0.8, ys[i] + 1.45, 0], [x1 - 0.8, ys[i + 1] + 0.15, 0], "y");
  }
  // Feeder and waterer.
  const [fx, fy] = [RUN.x + 17, RUN.y + 19];
  const [wx, wy] = [RUN.x + 32, RUN.y + 53];
  cyl("yard", fx, fy, 3.6, 0, 1, { tone: "mid" }, { name: "yard.feeder-dish" });
  cyl("yard", fx, fy, 2.4, 1, 8, { tone: "hi", inner: Ln(k.sideArc(fx, fy, 2.4, 6, P, 20), { tone: "faint" }) }, { name: "yard.feeder" });
  cyl("yard", fx, fy, 2.8, 9, 1, { tone: "mid" }, { name: "yard.feeder-cap" });
  cyl("yard", wx, wy, 3.4, 0, 1, { tone: "mid" }, { name: "yard.waterer-dish" });
  cyl("yard", wx, wy, 2.2, 1, 6, { tone: "hi" }, { name: "yard.waterer", extra: Ln(k.ring(wx, wy, 1, 7, P, 12), { tone: "lo" }) });
}

// Where each hen wanders, inside the run (offsets from its front-left corner).
export const HEN_SPOTS: { at: [number, number]; heading: number; range: number }[] = ([
  [8, 40, 0.4, 6],
  [25, 34, 2.6, 6],
  [40, 50, -2.2, 4],
  [11, 57, -0.6, 4],
  [30, 13, 1.2, 4],
  [23, 60, 2.9, 4],
] as const).map(([dx, dy, heading, range]) => ({ at: [RUN.x + dx, RUN.y + dy] as [number, number], heading, range }));

function hen(index: number) {
  const { at: [x, y], heading } = HEN_SPOTS[index];
  const fwd = [Math.cos(heading), Math.sin(heading)];
  const p = (f: number, s: number, z: number): V3 => [x + fwd[0] * f - fwd[1] * s, y + fwd[1] * f + fwd[0] * s, z];
  const parts: { c: V3; r: number; tone: string }[] = [
    { c: p(-2.6, 0, 5), r: 1.5, tone: "mid" },
    { c: p(0, 0, 4), r: 2.6, tone: "hi" },
    { c: p(2.4, 0, 6.6), r: 1.4, tone: "hi" },
  ];
  const shapes: { owner?: string }[] = [];
  let svg = "";
  for (const s of [-0.9, 0.9]) {
    shapes.push(R.solid(A.cylinder(p(0, s, 0)[0], p(0, s, 0)[1], 0.25, 0, 1.6, { name: R.nameFor("yard.hen-leg") })));
    svg += Ln(seg(p(0, s, 0), p(0, s, 1.6)), { tone: "mid" }) + Dots([at(p(0.3, s, 0))], { size: 0.5, tone: "mid" });
  }
  for (const part of [...parts].sort((a, b) => k.depthOf(a.c, P) - k.depthOf(b.c, P))) {
    shapes.push(R.solid(A.ball(part.c, part.r, { name: R.nameFor("yard.hen-body") })));
    svg += S(G.sphereOf(part.c, part.r, P, { steps: 20 }), { tone: part.tone });
  }
  svg += Ln(seg(p(3.6, 0, 6.6), p(4.5, 0, 6.3)), { tone: "hi" });
  svg += Dots([at(p(2.3, 0, 8.2))], { size: 0.9, tone: "hi" }) + Dots([at(p(3, fwd[0] > 0 ? 0.8 : -0.8, 7))], { size: 0.35, tone: "hi" });
  for (const shape of shapes) shape.owner = `yard.hen${index}`;
  put("yard", [x, y, 4], `<g class="hs-hen" data-hen="${index}">${svg}</g>`, shapes, { name: `yard.hen${index}`, layer: "hen" });
}

/** The homestead corner's fence and gate, the three-bay compost and the tool shed. */
function homestead() {
  const yF = HOMESTEAD.y + HOMESTEAD.d;
  const gate: [number, number] = [HOMESTEAD.x + 10, HOMESTEAD.x + 26];
  fenceRun("x", yF, [HOMESTEAD.x, gate[0], gate[1], HOMESTEAD.x + 52, HOMESTEAD.x + HOMESTEAD.w - 2], [gate], "yard.homestead-fence");
  fencePanel("x", yF - 0.6, gate[0] + 1.2, gate[1] - 1.2, "yard.homestead-gate");
  fenceRun("y", HOMESTEAD.x, [HOMESTEAD.y + 2, HOMESTEAD.y + 50, HOMESTEAD.y + 100, yF], [], "yard.homestead-fence");
  // Compost: three slatted bays (fresh, maturing, ready) on a concrete pad that drains into the garden.
  const pad = plan(HOMESTEAD.x + 8, RUN.y + RUN.d + 8, 46, 20, 0.6);
  box("yard", pad, 0, 0.8, { tone: "lo" }, { bevel: 0.2, name: "yard.compost-pad" });
  for (let i = 0; i < 3; i++) {
    const bay = plan(pad.x + 1 + i * 15, pad.y + 1, 14, 18, 0.4);
    const slats = [3, 6, 9].map((z) => Ln(k.sideSeam(bay, 0.8 + z, P, 2), { tone: "lo" })).join("");
    box("yard", bay, 0.8, 12 - i * 1.5, { tone: "mid", inner: slats }, { bevel: 0.3, name: R.nameFor("yard.compost-bay"), extra: `<path class="hs-soil" d="${k.slabOf(k.insetPlan(bay, 1.2), 0.8 + 12 - i * 1.5 - 2, 0.01, P, 2).top}"/>` });
  }
  // Tool shed: a timber box with a lean-to roof, a door and a window, beside the compost.
  const shed = plan(HOMESTEAD.x + HOMESTEAD.w - 34, RUN.y + RUN.d + 6, 28, 24, 0);
  const boards: string[] = [];
  for (let z = 3; z < 30; z += 3) boards.push(seg([shed.x + shed.w, shed.y, z], [shed.x + shed.w, shed.y + shed.d, z]));
  box("yard", shed, 0, 30, { tone: "mid", inner: Ln(boards.join(""), { tone: "faint" }) }, {
    bevel: 0,
    name: "yard.shed",
    extra: Ln(k.planOutline(plan(shed.x + 6, shed.y + shed.d, 10, 0.01, 0), 0, P, 1), { tone: "lo" }),
  });
  const door: V3[] = [[shed.x + 6, shed.y + shed.d + 0.02, 0], [shed.x + 16, shed.y + shed.d + 0.02, 0], [shed.x + 16, shed.y + shed.d + 0.02, 22], [shed.x + 6, shed.y + shed.d + 0.02, 22]];
  put("yard", [shed.x + 11, shed.y + shed.d, 11], `<path class="iso-line" data-tone="lo" d="M${door.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L")}Z"/>` + Dots([at([shed.x + 14.5, shed.y + shed.d, 11])], { size: 0.6, tone: "mid" }), [R.solid(A.box([shed.x + 6, shed.y + shed.d, 0], [shed.x + 16, shed.y + shed.d + 0.1, 22], { name: "yard.shed-door", owner: "yard.shed" }))], { name: "yard.shed-door" });
  box("yard", plan(shed.x - 2, shed.y - 2, shed.w + 4, shed.d + 4, 0.4), 30, 1.6, { tone: "mid" }, { bevel: 0.3, name: "yard.shed-roof" });
}

export function coop() {
  homestead();
  henHouse();
  run();
  for (let i = 0; i < CONFIG.hens; i++) hen(i);
}
