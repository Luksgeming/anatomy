// Shared drawing core for the scene build: projection, recorder and the helpers every part goes through,
// so each drawn item records its true shape for the audit.
import * as k from "@anatomy/iso-kit/iso-kit.mjs";
import * as G from "@anatomy/iso-kit/lathe.mjs";
import * as A from "@anatomy/iso-kit/audit.mjs";
import { tubePieces, tubeSvg } from "@anatomy/iso-kit/tube.mjs";
import { AZIMUTH, ELEVATION, FOOT_H, H, HOUSE, PIECES, PLINTH, PLINTH_H, SOIL_H, SPRING, STAGGER, W, type PieceId } from "./world.ts";

export { k, G, A };

export type V3 = [number, number, number];
export interface Plan { x: number; y: number; w: number; d: number; r?: number }

// Fit the plinth and the house with its roof lifted (ridge height plus the roof's lift). The sheet views fit closer:
// HS_FIT=house frames the house with its terraces and roof, HS_FIT=explode the house with every layer pulled apart.
const APART_TOP = 172 + PIECES.roof.move[2];
// A square round the house and its terraces, so every elevation and plan of it comes out at the same scale.
const HOUSE_SIDE = 342;
const HOUSE_BOX = { x: HOUSE.x + HOUSE.w / 2 + 25 - HOUSE_SIDE / 2, y: HOUSE.y + HOUSE.d / 2 + 5 - HOUSE_SIDE / 2, w: HOUSE_SIDE, d: HOUSE_SIDE, r: 0 };
export const EXPLODE_TOP = 172 + 380;
const FIT = process.env.HS_FIT;
const FIT_POINTS =
  FIT === "house" ? k.boxCorners(HOUSE_BOX, -2, 172)
  : FIT === "explode" ? k.boxCorners(HOUSE_BOX, -2, EXPLODE_TOP)
  : [...k.boxCorners(PLINTH, -SOIL_H - PLINTH_H - FOOT_H, 0), [HOUSE.x - 24, HOUSE.y - 24, APART_TOP], [HOUSE.x + HOUSE.w + 24, HOUSE.y + HOUSE.d + 24, APART_TOP - 30], [HOUSE.x - 24, HOUSE.y + HOUSE.d + 24, APART_TOP - 30]];
export const P = k.fitProjection(FIT_POINTS, W, H, { pad: FIT ? 16 : 28, azimuth: AZIMUTH, elevation: ELEVATION });
export const V: V3 = G.viewOf(P);
export const KS: number = G.scaleOf(P);
export const at = (point: V3) => k.iso(point, P) as [number, number];
export const S = (paths: unknown, style: Record<string, unknown> = {}) => k.solidSvg(paths, style);
export const Ln = (d: string, style: Record<string, unknown> = {}) => (d ? k.lineSvg(d, style) : "");
export const Dots = (points: number[][], style: Record<string, unknown> = {}) => (points.length ? k.dotsSvg(points, style) : "");
export const plan = (x: number, y: number, w: number, d: number, r = 0.6): Required<Plan> => ({ x, y, w, d, r });

export const R = A.recorder(P, { order: STAGGER, spring: SPRING });

/** Static art painted before the sorted layer (the plinth and soil), recorded as ground. */
export const under: string[] = [];

export interface PutOptions { bias?: number; name?: string; route?: string; chunk?: number; layer?: string }

export function put(piece: PieceId, ref: V3, svg: string, shapes: unknown[] = [], { bias = 0, name, route, chunk, layer }: PutOptions = {}) {
  return R.put({ piece, ride: piece, at: ref, center: ref, bias, svg, move: PIECES[piece].move, shapes, name: name ?? R.nameFor(`${piece}.item`), route, chunk, layer });
}

export interface BoxStyle { tone?: string; crease?: string; lit?: boolean; flat?: boolean; inner?: string; className?: string }
export interface BoxOptions extends PutOptions { extra?: string; steps?: number; bevel?: number; owner?: string; ground?: boolean }

/** A rounded box standing on the floor at z, recorded as a slab. */
export function box(piece: PieceId, p: Plan, z: number, h: number, style: BoxStyle = {}, { extra = "", steps = 2, bevel = 0.4, owner, ground, ...rest }: BoxOptions = {}) {
  const pl = { r: 0.4, ...p };
  const id = rest.name ?? R.nameFor(`${piece}.box`);
  const shape = R.solid(A.slab(pl, z, h, { name: id, owner, ground }, steps));
  put(piece, [pl.x + pl.w / 2, pl.y + pl.d / 2, z + h / 2], S(k.slabOf(pl, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { ...rest, name: id });
  return shape;
}

/** A vertical cylinder: posts, legs, pots, pucks. */
export function cyl(piece: PieceId, cx: number, cy: number, r: number, z: number, h: number, style: BoxStyle = {}, { extra = "", bevel = 0, owner, ...rest }: BoxOptions = {}) {
  const id = rest.name ?? R.nameFor(`${piece}.cyl`);
  const shape = R.solid(A.cylinder(cx, cy, r, z, h, { name: id, owner }));
  const steps = Math.max(12, Math.min(56, Math.round(r * KS * 2.2)));
  put(piece, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { ...rest, name: id });
  return shape;
}

/** A ball with exact smooth tones: canopies, heads, knobs. */
export function ball(piece: PieceId, c: V3, r: number, style: BoxStyle = {}, { extra = "", owner, ...rest }: BoxOptions = {}) {
  const id = rest.name ?? R.nameFor(`${piece}.ball`);
  const shape = R.solid(A.ball(c, r, { name: id, owner }));
  put(piece, c, S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "hi", ...style }) + extra, [shape], { ...rest, name: id });
  return shape;
}

/** A turned part on any axis. */
export function turned(piece: PieceId, F: unknown, profile: number[][], style: BoxStyle = {}, { extra = "", owner, ...rest }: BoxOptions = {}) {
  const id = rest.name ?? R.nameFor(`${piece}.turned`);
  const shape = R.solid(A.solid(F, profile, { name: id, owner }));
  const smooth = profile.some((p) => p[2]);
  const f = F as { o: V3; a: V3 };
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  put(piece, G.add3(f.o, G.mul3(f.a, mid)), S(G.solidOf(profile, F, P, smooth ? { smooth: { rows: 3 } } : {}), { tone: "hi", ...style }) + extra, [shape], { ...rest, name: id });
  return shape;
}

export interface PipeOptions extends PutOptions {
  tone?: string;
  bend?: number;
  maxLength?: number;
  ends?: [boolean, boolean];
  fittings?: [boolean, boolean];
  limp?: boolean;
  owner?: string;
  touch?: string[];
  free?: [boolean, boolean];
  gaps?: number[][];
  caps?: boolean | [boolean, boolean];
  flow?: boolean;
}

export interface PipeResult { line: V3[]; total: number; id: string }

/** A pipe or cable: filleted route, depth-sorted chunks, optional collar fittings at both ends. */
export function pipe(piece: PieceId, control: V3[], r: number, { tone = "hi", bend = 2.6, maxLength = 18, ends = [true, true], fittings = [false, false], limp = false, owner, touch, free = [false, false], gaps: extra = [], caps = true, bias = 0, flow = false, ...rest }: PipeOptions = {}): PipeResult {
  const line = G.fillet(control, Math.max(r * bend, 1.2), 10, { P, tube: r }) as V3[];
  const total = G.pathLength(line) as number;
  const id = rest.name ?? R.nameFor(`${piece}.pipe`);
  const thick = Math.max(0.8, r * 1.1);
  const gaps: number[][] = [...extra];
  const collars: { centre: V3; tangent: V3 }[] = [];
  if (fittings[0]) {
    gaps.push([0, thick]);
    collars.push({ centre: G.pointAlong(line, thick / 2), tangent: G.tangentAlong(line, 0) });
  }
  if (fittings[1]) {
    gaps.push([total - thick, total]);
    collars.push({ centre: G.pointAlong(line, total - thick / 2), tangent: G.tangentAlong(line, total) });
  }
  R.route(id, line, r, { owner: owner ?? id, touch, limp, gaps, ends, free, piece, move: PIECES[piece].move, ride: piece, rims: fittings.map((f) => (f ? r * 1.45 : r)) });
  tubePieces(line, r, P, { maxLength, spacing: Math.max(0.5, Math.min(2, r * 0.4)), gaps, caps }).forEach((part: { mid: V3; points: V3[]; radii: number[]; from: number; to: number }, index: number) =>
    put(piece, part.mid, tubeSvg(part, { tone }) + (flow ? flowSvg(line, part.from, part.to) : ""), [A.tube(part.points, part.radii)], { bias, name: `${id}:${index}`, route: id, chunk: index, layer: rest.layer }),
  );
  for (const { centre, tangent } of collars) {
    const F = G.frameAlong(centre, tangent);
    const cid = `${id}.fitting`;
    const shape = R.solid(A.disc(F, -thick / 2, thick / 2, r * 1.45, { name: R.nameFor(cid), owner: owner ?? id }));
    put(piece, centre, S(G.disc(-thick / 2, thick / 2, r * 1.45, F, P), { tone: "mid" }), [shape], { bias, name: shape.name, layer: rest.layer });
  }
  return { line, total, id };
}

const screenLength = (points: V3[]) => {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = at(points[i - 1]);
    const b = at(points[i]);
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
};

/** Water moving along a route: a lit dashed centreline whose dash phase runs on from the route's start, so it is continuous through every chunk joint. */
export function flowSvg(line: V3[], from: number, to: number, className = "hs-flow") {
  const span = G.cut(line, Math.max(0, from), to) as V3[];
  if (span.length < 2) return "";
  const base = from > 0 ? screenLength(G.cut(line, 0, from) as V3[]) : 0;
  return `<path class="${className}" data-free="" d="${k.pathOf(span.map(at))}" style="--b:${base.toFixed(2)}px"/>`;
}

/** Points on a straight horizontal face for rule lines. */
export const onTop = (points: number[][], z: number) => k.onTop(points, z, P);
export const seg = (a: V3, b: V3) => k.segment(a, b, P);

/** A flat quad drawn on any plane: glass, rugs, water. */
export const quad = (pts: V3[]) => `M${pts.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`;

export const byDepth = <T extends number[]>(points: T[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? 0], P) - k.depthOf([b[0], b[1], b[2] ?? 0], P));

// ── Compound items ──────────────────────────────────────────────
// Parts that touch or interpenetrate by design (leaves of one crown, a window's pane and bars, a plant on its cup)
// are drawn as one item: painted far to near inside it, recorded with every true shape under one owner.

export interface Part { at: V3; svg: string; shape: Record<string, unknown> }

export const boxPart = (p: Plan, z: number, h: number, style: BoxStyle = {}, { steps = 2, bevel = 0.4, extra = "" }: { steps?: number; bevel?: number; extra?: string } = {}): Part => {
  const pl = { r: 0.4, ...p };
  return { at: [pl.x + pl.w / 2, pl.y + pl.d / 2, z + h / 2], svg: S(k.slabOf(pl, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, shape: A.slab(pl, z, h, {}, steps) };
};
export const cylPart = (cx: number, cy: number, r: number, z: number, h: number, style: BoxStyle = {}, { bevel = 0, extra = "" }: { bevel?: number; extra?: string } = {}): Part => {
  const steps = Math.max(12, Math.min(56, Math.round(r * KS * 2.2)));
  return { at: [cx, cy, z + h / 2], svg: S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, shape: A.cylinder(cx, cy, r, z, h) };
};
export const ballPart = (c: V3, r: number, style: BoxStyle = {}, steps = 24): Part => ({ at: c, svg: S(G.sphereOf(c, r, P, { steps }), { tone: "hi", ...style }), shape: A.ball(c, r) });
/** A line-only part (stems, flow marks) with the thin shape it stands for. */
export const linePart = (at_: V3, svg: string, shape: Record<string, unknown>): Part => ({ at: at_, svg, shape });

export function compound(piece: PieceId, name: string, parts: Part[], { bias = 0, layer, sort = true, ref }: { bias?: number; layer?: string; sort?: boolean; ref?: V3 } = {}) {
  const id = R.nameFor(name);
  const list = sort ? [...parts].sort((a, b) => k.depthOf(a.at, P) - k.depthOf(b.at, P)) : parts;
  const shapes = list.map((part, index) => R.solid({ ...part.shape, name: `${id}.${index}`, owner: id }));
  const centre = ref ?? (list.reduce((sum, part) => G.add3(sum, part.at), [0, 0, 0]).map((v: number) => v / list.length) as V3);
  put(piece, centre, list.map((part) => part.svg).join(""), shapes, { bias, name: id, layer });
  return id;
}
