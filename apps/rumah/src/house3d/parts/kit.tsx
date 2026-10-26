"use client";
// Building blocks for the house: a box by its two corners, a wall along x or z cut round its openings, and a window
// or glass door with its frame, mullions, sill and glass. All sizes in metres.
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useMaterials } from "../materials";

export type V3 = [number, number, number];

/** A box from (x0, y0, z0) to (x1, y1, z1). */
export function B({ a, b, m, cast = true, receive = true, ...rest }: { a: V3; b: V3; m: THREE.Material; cast?: boolean; receive?: boolean } & Omit<ThreeElements["mesh"], "args">) {
  const size: V3 = [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])];
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} material={m} castShadow={cast} receiveShadow={receive} {...rest}>
      <boxGeometry args={size} />
    </mesh>
  );
}

export interface Hole { a0: number; a1: number; y0: number; y1: number }

/**
 * The solid pieces of a wall with holes: the wall runs along `axis` from a0 to a1, spans c0..c1 across its thickness
 * and y0..y1 in height; every hole is cut out as a full rectangle. Returns boxes as [min, max] corners.
 */
export function wallPieces(axis: "x" | "z", a0: number, a1: number, c0: number, c1: number, y0: number, y1: number, holes: Hole[]): [V3, V3][] {
  const cuts = [...new Set([a0, a1, ...holes.flatMap((h) => [Math.max(a0, Math.min(a1, h.a0)), Math.max(a0, Math.min(a1, h.a1))])])].sort((p, q) => p - q);
  const out: [V3, V3][] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [u0, u1] = [cuts[i], cuts[i + 1]];
    if (u1 - u0 < 1e-4) continue;
    const mid = (u0 + u1) / 2;
    const gaps = holes.filter((h) => h.a0 < mid && h.a1 > mid).map((h) => [Math.max(y0, h.y0), Math.min(y1, h.y1)] as const).filter(([g0, g1]) => g1 > g0).sort((p, q) => p[0] - q[0]);
    let y = y0;
    const spans: [number, number][] = [];
    for (const [g0, g1] of gaps) {
      if (g0 > y) spans.push([y, g0]);
      y = Math.max(y, g1);
    }
    if (y < y1) spans.push([y, y1]);
    for (const [s0, s1] of spans) out.push(axis === "x" ? [[u0, s0, c0], [u1, s1, c1]] : [[c0, s0, u0], [c1, s1, u1]]);
  }
  return out;
}

export function Wall({ axis, a0, a1, c0, c1, y0, y1, holes = [], m }: { axis: "x" | "z"; a0: number; a1: number; c0: number; c1: number; y0: number; y1: number; holes?: Hole[]; m: THREE.Material }) {
  return (
    <group>
      {wallPieces(axis, a0, a1, c0, c1, y0, y1, holes).map(([a, b], i) => (
        <B key={i} a={a} b={b} m={m} />
      ))}
    </group>
  );
}

/**
 * A window or glass door set in a wall's thickness: a slim dark frame, mullions dividing it into `panes`, a transom
 * for tall glazing, glass, and a stone sill outside. `axis` is the wall's direction, `c` the plane of the glass and
 * `out` the outward direction (±1) across the wall.
 */
export function Window({ axis, a0, a1, y0, y1, c, out, panes = 2, sill = true }: { axis: "x" | "z"; a0: number; a1: number; y0: number; y1: number; c: number; out: 1 | -1; panes?: number; sill?: boolean }) {
  const M = useMaterials();
  const f = 0.05;
  const at = (u: number, y: number, w: number, h: number, d: number, dc = 0): [V3, V3] => {
    const p: V3 = axis === "x" ? [u - w / 2, y - h / 2, c + dc - d / 2] : [c + dc - d / 2, y - h / 2, u - w / 2];
    const q: V3 = axis === "x" ? [u + w / 2, y + h / 2, c + dc + d / 2] : [c + dc + d / 2, y + h / 2, u + w / 2];
    return [p, q];
  };
  const w = a1 - a0;
  const h = y1 - y0;
  const bars: [V3, V3][] = [
    at(a0 + f / 2, (y0 + y1) / 2, f, h, 0.07),
    at(a1 - f / 2, (y0 + y1) / 2, f, h, 0.07),
    at((a0 + a1) / 2, y0 + f / 2, w, f, 0.07),
    at((a0 + a1) / 2, y1 - f / 2, w, f, 0.07),
    ...Array.from({ length: panes - 1 }, (_, i) => at(a0 + ((i + 1) * w) / panes, (y0 + y1) / 2, f * 0.8, h, 0.06)),
  ];
  if (h > 2.2) bars.push(at((a0 + a1) / 2, y1 - 0.45, w, f * 0.8, 0.06));
  const [gp, gq] = at((a0 + a1) / 2, (y0 + y1) / 2, w - f, h - f, 0.012);
  return (
    <group>
      {bars.map(([p, q], i) => (
        <B key={i} a={p} b={q} m={M.frame} />
      ))}
      <B a={gp} b={gq} m={M.glass} cast={false} />
      {sill ? <B {...pair(at((a0 + a1) / 2, y0 - 0.025, w + 0.1, 0.05, 0.14, out * 0.08))} m={M.concrete} /> : null}
    </group>
  );
}

const pair = ([a, b]: [V3, V3]) => ({ a, b });

/** A flat run of evenly spaced slats (screens, fences, decks) as one merged mesh. */
export function slatGeometry(count: number, place: (i: number) => [V3, V3]) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = place(i);
    const g = new THREE.BoxGeometry(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    parts.push(g);
  }
  return parts;
}
