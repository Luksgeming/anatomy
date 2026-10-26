// The hip roof: four tiled planes at 25° with a 1.2 m overhang all round for tropical rain, ridge and hip caps,
// fascia boards, and gutters on the front and back eaves.
import { A, G, Ln, P, R, S, box, pipe, plan, put, seg, type V3 } from "./core.ts";
import { EAVE, FRONT_Y, HOUSE, RIGHT_X, ROOF_OVER, ROOF_PITCH } from "./world.ts";

const T = Math.tan((ROOF_PITCH * Math.PI) / 180);
const COS = Math.cos((ROOF_PITCH * Math.PI) / 180);
const SIN = Math.sin((ROOF_PITCH * Math.PI) / 180);
const THICK = 2.4;
const HALF = HOUSE.d / 2;
export const RIDGE_Y = HOUSE.y + HALF;
export const RIDGE_Z = EAVE + HALF * T;
const RIDGE_X = [HOUSE.x + HALF, RIGHT_X - HALF];
const X0 = HOUSE.x - ROOF_OVER;
const X1 = RIGHT_X + ROOF_OVER;
const Y0 = HOUSE.y - ROOF_OVER;
const Y1 = FRONT_Y + ROOF_OVER;
export const EAVE_LOW = EAVE - ROOF_OVER * T;
/** Where the gutters run (just outside the fascia) and their height. */
export const GUTTER = { front: Y1 + 1.4, back: Y0 - 1.4, z: EAVE_LOW - 1.6, x0: X0 + 1, x1: X1 - 1 };

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** One roof plane as a thin prism: its outline (in 3D, on the plane's underside) extruded along the outward normal. */
function plane(name: string, corners: V3[], u: V3, v: V3, normal: V3, courses: number) {
  const o = corners[0];
  const F = G.frameOf(o, normal, u, v);
  const poly = corners.map((p) => [dot(sub(p, o), u), dot(sub(p, o), v)]);
  const shape = R.solid(A.prism(F, poly, 0, THICK, { name, owner: "roof.shell" }));
  // Tile courses: lines parallel to the eave on the top face, each running edge to edge across the plane.
  const lift = (p: V3): V3 => [p[0] + normal[0] * THICK, p[1] + normal[1] * THICK, p[2] + normal[2] * THICK];
  const lines: string[] = [];
  const vmax = Math.max(...poly.map((p) => p[1]));
  for (let i = 1; i < courses; i++) {
    const vv = (vmax * i) / courses;
    const hits: number[] = [];
    for (let j = 0; j < poly.length; j++) {
      const a = poly[j];
      const b = poly[(j + 1) % poly.length];
      if ((a[1] - vv) * (b[1] - vv) < 0 || (a[1] === vv && b[1] !== vv)) hits.push(a[0] + ((vv - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    if (hits.length < 2) continue;
    const [ua, ub] = [Math.min(...hits), Math.max(...hits)];
    const p = (uu: number): V3 => lift([o[0] + u[0] * uu + v[0] * vv, o[1] + u[1] * uu + v[1] * vv, o[2] + u[2] * uu + v[2] * vv]);
    lines.push(seg(p(ua), p(ub)));
  }
  const mid = corners.reduce((s, p) => [s[0] + p[0] / corners.length, s[1] + p[1] / corners.length, s[2] + p[2] / corners.length] as V3, [0, 0, 0] as V3);
  put("roof", mid, S(G.prismOf(F, poly, 0, THICK, P), { tone: "mid", inner: Ln(lines.join(""), { tone: "faint" }) }), [shape], { name });
}

export function roof() {
  const zLow = EAVE_LOW;
  const ridgeA: V3 = [RIDGE_X[0], RIDGE_Y, RIDGE_Z];
  const ridgeB: V3 = [RIDGE_X[1], RIDGE_Y, RIDGE_Z];
  // Far planes first (back, left), near planes after (front, right); the settle pass orders them anyway.
  plane("roof.back", [[X1, Y0, zLow], [X0, Y0, zLow], ridgeA, ridgeB], [-1, 0, 0], [0, COS, SIN], [0, -SIN, COS], 10);
  plane("roof.left", [[X0, Y0, zLow], [X0, Y1, zLow], ridgeA], [0, 1, 0], [COS, 0, SIN], [-SIN, 0, COS], 10);
  plane("roof.front", [[X0, Y1, zLow], [X1, Y1, zLow], ridgeB, ridgeA], [1, 0, 0], [0, -COS, SIN], [0, SIN, COS], 10);
  plane("roof.right", [[X1, Y1, zLow], [X1, Y0, zLow], ridgeB], [0, -1, 0], [-COS, 0, SIN], [SIN, 0, COS], 10);

  // Ridge and hip caps: round tiles along the ridge and down the four hips.
  const CAP_R = 1.4;
  // The cap rests in the valley of the tiles: its lowest line sits 0.3 below the hip so it bears on both planes.
  const capZ = THICK / COS + CAP_R - 0.3;
  const cap = (name: string, a: V3, b: V3) => {
    const F = G.frameAlong(a, G.unit3(sub(b, a)));
    const len = G.len3(sub(b, a));
    const shape = R.solid(A.disc(F, 0, len, CAP_R, { name, owner: "roof.shell" }));
    put("roof", [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], S(G.disc(0, len, CAP_R, F, P), { tone: "mid" }), [shape], { name, bias: 0.5 });
  };
  const up = (p: V3): V3 => [p[0], p[1], p[2] + capZ];
  cap("roof.ridge", up(ridgeA), up(ridgeB));
  cap("roof.hip-fl", up([X0, Y1, zLow]), up(ridgeA));
  cap("roof.hip-fr", up([X1, Y1, zLow]), up(ridgeB));
  cap("roof.hip-bl", up([X0, Y0, zLow]), up(ridgeA));
  cap("roof.hip-br", up([X1, Y0, zLow]), up(ridgeB));

  // Fascia boards under the eaves on the two near sides, with gutters front and back.
  box("roof", plan(X0, Y1 - 1, X1 - X0, 1, 0.2), zLow - 3, 3, { tone: "mid" }, { bevel: 0, name: "roof.fascia-front" });
  box("roof", plan(X1 - 1, Y0, 1, Y1 - Y0 - 1, 0.2), zLow - 3, 3, { tone: "mid" }, { bevel: 0, name: "roof.fascia-right" });
  box("roof", plan(X0, Y0, X1 - X0 - 1, 1, 0.2), zLow - 3, 3, { tone: "mid" }, { bevel: 0, name: "roof.fascia-back" });
  for (const [y, side] of [[GUTTER.front, "front"], [GUTTER.back, "back"]] as const) {
    const yIn = side === "front" ? Y1 : Y0 - 3;
    for (const x of [X0, X1 - 1]) box("roof", plan(x, yIn, 1, 3, 0.3), GUTTER.z - 1.8, 3.6, { tone: "mid" }, { bevel: 0.2, name: R.nameFor(`roof.gutter-end-${side}`) });
    pipe("roof", [[X0 + 1, y, GUTTER.z], [X1 - 1, y, GUTTER.z]], 1.2, { name: `roof.gutter-${side}`, tone: "mid", maxLength: 40, touch: [`roof.fascia-${side}`] });
  }
}
