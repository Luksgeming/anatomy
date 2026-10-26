"use client";
// The building: plinth, both floors' walls cut round their openings, partitions and the stair, the upper slab with
// its stair void, the west wing's mono-pitch roof with a teak soffit and exposed purlins, the east wing's flat roof,
// sandstone cladding round the entrance, a vertical teak screen, the front balcony with black steel rails, the porch
// canopy and steps, and the garden terrace with the balcony above it. The roof and the upper floor lift away
// (level 1 and 2) to show the rooms.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BACK_ROW, BALCONY, DOOR, EAVE, F1, F2, HOUSE, OPENINGS, PORCH, ROOF, SLAB, STAIR, TERRACE, WALL, WING_SPLIT, type Opening } from "../layout";
import { useMaterials } from "../materials";
import { house, useHouse } from "../store";
import { B, slatGeometry, Wall, Window, type Hole, type V3 } from "./kit";
import { GroundInterior, UpperInterior } from "./Interior";

const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = HOUSE;
const LIFT = 6.5;

/** Roof underside height over x for the west wing's mono-pitch (with its overhangs). */
const RX0 = X0 - ROOF.over;
const RX1 = WING_SPLIT + 0.25;
const SLOPE = (ROOF.high - ROOF.low) / (RX1 - RX0);
const ANGLE = Math.atan(SLOPE);
export const roofUnderside = (x: number) => ROOF.low + (x - RX0) * SLOPE - ROOF.thick / Math.cos(ANGLE);

function holesOf(wall: Opening["wall"], floor: 1 | 2): Hole[] {
  return OPENINGS.filter((o) => o.wall === wall && o.floor === floor).map((o) => ({ a0: o.a0, a1: o.a1, y0: o.sill, y1: o.head }));
}

/** Wall c-range and outward sign for each side. */
const SIDES = {
  s: { axis: "x" as const, c0: Z1 - WALL, c1: Z1, out: 1 as const, a: [X0, X1] as const },
  n: { axis: "x" as const, c0: Z0, c1: Z0 + WALL, out: -1 as const, a: [X0, X1] as const },
  e: { axis: "z" as const, c0: X1 - WALL, c1: X1, out: 1 as const, a: [Z0 + WALL, Z1 - WALL] as const },
  w: { axis: "z" as const, c0: X0, c1: X0 + WALL, out: -1 as const, a: [Z0 + WALL, Z1 - WALL] as const },
};

function Storey({ floor, y0, y1 }: { floor: 1 | 2; y0: number; y1: number }) {
  const M = useMaterials();
  return (
    <group>
      {(Object.keys(SIDES) as (keyof typeof SIDES)[]).map((k) => {
        const s = SIDES[k];
        const holes = holesOf(k, floor);
        return (
          <group key={k}>
            <Wall axis={s.axis} a0={s.a[0]} a1={s.a[1]} c0={s.c0} c1={s.c1} y0={y0} y1={y1} holes={holes} m={M.render} />
            {OPENINGS.filter((o) => o.wall === k && o.floor === floor && o.kind !== "door").map((o, i) => (
              <Window key={i} axis={s.axis} a0={o.a0} a1={o.a1} y0={o.sill} y1={o.head} c={(s.c0 + s.c1) / 2} out={s.out} panes={o.kind === "glass" ? 3 : o.a1 - o.a0 > 2 ? 3 : 2} sill={o.kind === "window"} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Interior partitions of one floor, with door gaps. */
function Partitions({ floor }: { floor: 1 | 2 }) {
  const M = useMaterials();
  const y0 = floor === 1 ? F1 : F2;
  const y1 = floor === 1 ? F2 - SLAB : EAVE;
  const t = 0.1;
  const door = (a0: number, a1: number): Hole => ({ a0, a1, y0, y1: y0 + 2.1 });
  const back = floor === 1 ? [door(-8.8, -8.0), door(-7.3, -4.0), door(-2.6, -1.8), door(0.4, 1.2)] : [door(-8.8, -8.0), door(-6.6, -5.8), door(-3.0, -2.2), door(0.5, 1.3)];
  const cross: { x: number; z0: number; z1: number; holes: Hole[] }[] =
    floor === 1
      ? [
          { x: -7.5, z0: Z0 + WALL, z1: BACK_ROW - t / 2, holes: [] },
          { x: -3.75, z0: Z0 + WALL, z1: BACK_ROW - t / 2, holes: [] },
          { x: -0.5, z0: Z0 + WALL, z1: BACK_ROW - t / 2, holes: [door(-7.2, -6.4)] },
        ]
      : [
          { x: -7.5, z0: Z0 + WALL, z1: BACK_ROW - t / 2, holes: [] },
          { x: -0.5, z0: Z0 + WALL, z1: BACK_ROW - t / 2, holes: [] },
          { x: -4.0, z0: BACK_ROW + t / 2, z1: Z1 - WALL, holes: [] },
        ];
  return (
    <group>
      <Wall axis="x" a0={X0 + WALL} a1={X1 - WALL} c0={BACK_ROW - t / 2} c1={BACK_ROW + t / 2} y0={y0} y1={y1} holes={back} m={M.renderInside} />
      {cross.map((c, i) => (
        <Wall key={i} axis="z" a0={c.z0} a1={c.z1} c0={c.x - t / 2} c1={c.x + t / 2} y0={y0} y1={y1} holes={c.holes} m={M.renderInside} />
      ))}
    </group>
  );
}

function Stair() {
  const M = useMaterials();
  const rise = (F2 - F1) / STAIR.steps;
  const run = (STAIR.x1 - STAIR.x0) / STAIR.steps;
  return (
    <group>
      {Array.from({ length: STAIR.steps }, (_, i) => (
        <B key={i} a={[STAIR.x0 + i * run, F1 + i * rise, STAIR.z0]} b={[STAIR.x0 + (i + 1) * run, F1 + (i + 1) * rise, STAIR.z1]} m={M.oak} />
      ))}
      {/* A black steel stringer and a slim rail on the open side */}
      <B a={[STAIR.x0, F1, STAIR.z1]} b={[STAIR.x1, F2, STAIR.z1 + 0.03]} m={M.steel} rotation={[0, 0, 0]} visible={false} />
      {Array.from({ length: 5 }, (_, i) => STAIR.x0 + 0.2 + i * ((STAIR.x1 - STAIR.x0 - 0.4) / 4)).map((x, i) => {
        const yb = F1 + ((x - STAIR.x0) / (STAIR.x1 - STAIR.x0)) * (F2 - F1);
        return <B key={i} a={[x - 0.015, yb, STAIR.z1 - 0.04]} b={[x + 0.015, yb + 0.95, STAIR.z1 - 0.01]} m={M.steel} />;
      })}
    </group>
  );
}

/** The upper floor slab, leaving the void over the stair. */
function UpperSlab() {
  const M = useMaterials();
  const y0 = F2 - SLAB;
  return (
    <group>
      <B a={[X0, y0, STAIR.z1 + 0.05]} b={[X1, F2, Z1]} m={M.render} />
      <B a={[X0, y0, Z0]} b={[STAIR.x0 - 0.05, F2, STAIR.z1 + 0.05]} m={M.render} />
      <B a={[STAIR.x1 + 0.3, y0, Z0]} b={[X1, F2, STAIR.z1 + 0.05]} m={M.render} />
      {/* Floor finishes: timber in the bedrooms, tiles in the baths and the hall */}
      <B a={[X0 + WALL, F2, BACK_ROW]} b={[X1 - WALL, F2 + 0.015, Z1 - WALL]} m={M.floorWood} cast={false} />
      <B a={[X0 + WALL, F2, Z0 + WALL]} b={[STAIR.x0 - 0.05, F2 + 0.015, BACK_ROW]} m={M.floorTile} cast={false} />
      <B a={[STAIR.x1 + 0.3, F2, Z0 + WALL]} b={[X1 - WALL, F2 + 0.015, BACK_ROW]} m={M.floorTile} cast={false} />
      {/* Glass balustrade round the stair void */}
      <B a={[STAIR.x0 - 0.05, F2, STAIR.z1 + 0.06]} b={[STAIR.x1 + 0.3, F2 + 1.0, STAIR.z1 + 0.075]} m={M.glass} cast={false} />
    </group>
  );
}

/** The trapezoid of render above the eave under the mono-pitch, on the south and north walls of the west wing. */
function Gables() {
  const M = useMaterials();
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(X0, EAVE);
    s.lineTo(WING_SPLIT, EAVE);
    s.lineTo(WING_SPLIT, roofUnderside(WING_SPLIT));
    s.lineTo(X0, roofUnderside(X0));
    s.closePath();
    // A tall clerestory window cut into the high end, as in the reference.
    const hole = new THREE.Path();
    const [g0, g1] = [-4.5, -1.35];
    hole.moveTo(g0, EAVE + 0.15);
    hole.lineTo(g1, EAVE + 0.15);
    hole.lineTo(g1, roofUnderside(g1) - 0.15);
    hole.lineTo(g0, roofUnderside(g0) - 0.15);
    hole.closePath();
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: WALL, bevelEnabled: false });
    return g;
  }, []);
  const glass = useMemo(() => {
    const [g0, g1] = [-4.5, -1.35];
    const s = new THREE.Shape();
    s.moveTo(g0, EAVE + 0.15);
    s.lineTo(g1, EAVE + 0.15);
    s.lineTo(g1, roofUnderside(g1) - 0.15);
    s.lineTo(g0, roofUnderside(g0) - 0.15);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <group>
      <mesh geometry={geo} position={[0, 0, Z1 - WALL]} material={M.render} castShadow receiveShadow />
      <mesh geometry={glass} position={[0, 0, Z1 - WALL / 2]} material={M.glass} />
      {[-3.45, -2.4].map((x) => (
        <B key={x} a={[x - 0.025, EAVE + 0.15, Z1 - WALL / 2 - 0.03]} b={[x + 0.025, roofUnderside(x) - 0.15, Z1 - WALL / 2 + 0.03]} m={M.frame} />
      ))}
      <mesh geometry={geo} position={[0, 0, Z0]} material={M.render} castShadow receiveShadow />
      {/* The high end wall of the west wing, standing above the east wing's flat roof */}
      <B a={[WING_SPLIT - WALL, EAVE, Z0]} b={[WING_SPLIT, roofUnderside(WING_SPLIT), Z1]} m={M.render} />
    </group>
  );
}

function MonoRoof() {
  const M = useMaterials();
  const len = (RX1 - RX0) / Math.cos(ANGLE);
  const zA = Z0 - ROOF.over;
  const zB = BALCONY.z1 + 0.5;
  const t = ROOF.thick;
  return (
    <group position={[RX0, ROOF.low, 0]} rotation={[0, 0, ANGLE]}>
      <B a={[0, -t + 0.04, zA]} b={[len, 0, zB]} m={M.roof} />
      <B a={[0, -t, zA]} b={[len, -t + 0.04, zB]} m={M.teak} />
      {/* Fascia: a slim dark edge all round */}
      <B a={[-0.04, -t, zA]} b={[0, 0.02, zB]} m={M.roof} />
      <B a={[len, -t, zA]} b={[len + 0.04, 0.02, zB]} m={M.roof} />
      <B a={[0, -t, zB]} b={[len, 0.02, zB + 0.04]} m={M.roof} />
      {/* Exposed timber purlins under the front overhang */}
      {[0.12, 0.35, 0.6, 0.85].map((f) => (
        <B key={f} a={[0.2, -t - 0.16, zB - 1.3 + f * 1.15]} b={[len - 0.2, -t, zB - 1.22 + f * 1.15]} m={M.teak} />
      ))}
    </group>
  );
}

function FlatRoof() {
  const M = useMaterials();
  const [x0, x1, z0, z1] = [WING_SPLIT - 0.05, X1 + 0.6, Z0 - 0.6, Z1 + 0.6];
  return (
    <group>
      <B a={[x0, EAVE, z0]} b={[x1, EAVE + 0.32, z1]} m={M.render} />
      <B a={[x0, EAVE + 0.32, z0]} b={[x1, EAVE + 0.4, z1]} m={M.roof} />
    </group>
  );
}

/** Sandstone round the entrance, the teak screen beside bedroom 2, the porch canopy and steps. */
function Facade() {
  const M = useMaterials();
  const slats = useMemo(() => mergeGeometries(slatGeometry(26, (i) => [[0.05 + i * 0.088, F2, Z1 + 0.04], [0.05 + i * 0.088 + 0.05, EAVE - 0.05, Z1 + 0.1]])), []);
  const holes: Hole[] = [{ a0: DOOR.x0, a1: DOOR.x1, y0: F1, y1: F1 + DOOR.h }];
  return (
    <group>
      <Wall axis="x" a0={-5.1} a1={-1.9} c0={Z1} c1={Z1 + 0.05} y0={0} y1={F2 - SLAB} holes={holes} m={M.stone} />
      <mesh geometry={slats} material={M.teak} castShadow receiveShadow />
      <B a={[0.02, F2, Z1 + 0.02]} b={[2.4, F2 + 0.05, Z1 + 0.12]} m={M.teak} />
      <B a={[0.02, EAVE - 0.08, Z1 + 0.02]} b={[2.4, EAVE - 0.03, Z1 + 0.12]} m={M.teak} />
      {/* Porch: stone landing, two steps, a thin cantilevered canopy */}
      <B a={[PORCH.x0, 0, PORCH.z0]} b={[PORCH.x1, F1, PORCH.z1]} m={M.stone} />
      <B a={[PORCH.x0 + 0.4, 0, PORCH.z1]} b={[PORCH.x1 - 0.4, F1 / 2, PORCH.z1 + 0.32]} m={M.stone} />
      <B a={[PORCH.x0 - 0.1, 3.0, Z1]} b={[PORCH.x1 + 0.1, 3.14, PORCH.z1 + 0.5]} m={M.render} />
      {/* Plinth band round the house */}
      <B a={[X0 - 0.02, 0, Z0 - 0.02]} b={[X1 + 0.02, F1, Z1 + 0.02]} m={M.concrete} />
    </group>
  );
}

function FrontDoor() {
  const M = useMaterials();
  const open = useHouse((s) => s.door);
  const leaf = useRef<THREE.Group>(null);
  useFrame((st, dt) => {
    if (!leaf.current) return;
    const target = open ? -1.3 : 0;
    leaf.current.rotation.y += (target - leaf.current.rotation.y) * Math.min(1, dt * 4);
    if (Math.abs(target - leaf.current.rotation.y) > 0.002) st.invalidate();
  });
  const w = DOOR.x1 - DOOR.x0;
  const grooves = useMemo(() => mergeGeometries(slatGeometry(7, (i) => [[0.08 + i * 0.12, F1 + 0.1, 0.022], [0.09 + i * 0.12, F1 + DOOR.h - 0.1, 0.03]])), []);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) house.set((s) => ({ door: !s.door }));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        house.set({ hover: `Pintu depan|${open ? "Klik untuk menutup" : "Klik untuk membuka"}` });
      }}
      onPointerOut={() => house.set({ hover: null })}
    >
      <group ref={leaf} position={[DOOR.x0, 0, Z1 - WALL / 2]}>
        <B a={[0, F1, -0.025]} b={[w, F1 + DOOR.h, 0.025]} m={M.teak} />
        <mesh geometry={grooves} material={M.walnut} />
        <B a={[w - 0.1, F1 + 0.6, 0.03]} b={[w - 0.08, F1 + 1.7, 0.07]} m={M.steel} />
      </group>
    </group>
  );
}

function Balcony() {
  const M = useMaterials();
  const { x0, x1, z1 } = BALCONY;
  const rails = [0.15, 0.4, 0.65, 0.9, 1.05];
  return (
    <group>
      <B a={[x0, F2 - SLAB, Z1]} b={[x1, F2, z1]} m={M.render} />
      <B a={[x0, F2, Z1]} b={[x1, F2 + 0.015, z1]} m={M.floorTile} cast={false} />
      {rails.map((h) => (
        <group key={h}>
          <B a={[x0 + 0.03, F2 + h - 0.015, z1 - 0.05]} b={[x1, F2 + h + 0.015, z1 - 0.02]} m={M.steel} />
          <B a={[x0 + 0.02, F2 + h - 0.015, Z1]} b={[x0 + 0.05, F2 + h + 0.015, z1 - 0.02]} m={M.steel} />
        </group>
      ))}
      {[x0 + 0.035, (x0 + x1) / 2, x1 - 0.03].map((x) => (
        <B key={x} a={[x - 0.02, F2, z1 - 0.06]} b={[x + 0.02, F2 + 1.08, z1 - 0.02]} m={M.steel} />
      ))}
      {/* A long planter along the rail with a soft green spill */}
      <B a={[x0 + 0.2, F2, z1 - 0.4]} b={[x0 + 1.6, F2 + 0.45, z1 - 0.1]} m={M.concrete} />
    </group>
  );
}

function Terrace() {
  const M = useMaterials();
  const { x0, x1, z0, z1 } = TERRACE;
  const deck = useMemo(() => mergeGeometries(slatGeometry(Math.floor((z1 - z0) / 0.14), (i) => [[x0, F1 - 0.04, z0 + i * 0.14 + 0.01], [x1, F1, z0 + i * 0.14 + 0.13]])), [x0, x1, z0, z1]);
  return (
    <group>
      <B a={[x0, 0, z0]} b={[x1, F1 - 0.04, z1]} m={M.concrete} />
      <mesh geometry={deck} material={M.oak} castShadow receiveShadow />
      {[z0 + 0.2, z1 - 0.2].map((z) => (
        <B key={z} a={[x1 - 0.32, F1, z - 0.12]} b={[x1 - 0.08, F2 - SLAB, z + 0.12]} m={M.render} />
      ))}
    </group>
  );
}

function UpperTerrace() {
  const M = useMaterials();
  const { x0, x1, z0, z1 } = TERRACE;
  return (
    <group>
      <B a={[x0, F2 - SLAB, z0]} b={[x1, F2, z1]} m={M.render} />
      <B a={[x0, F2, z0]} b={[x1, F2 + 0.015, z1]} m={M.floorTile} cast={false} />
      <B a={[x1 - 0.05, F2, z0]} b={[x1 - 0.03, F2 + 1.05, z1]} m={M.glass} cast={false} />
      <B a={[x0, F2, z1 - 0.05]} b={[x1, F2 + 1.05, z1 - 0.03]} m={M.glass} cast={false} />
      <B a={[x1 - 0.07, F2 + 1.05, z0]} b={[x1, F2 + 1.1, z1]} m={M.steel} />
      <B a={[x0, F2 + 1.05, z1 - 0.07]} b={[x1, F2 + 1.1, z1]} m={M.steel} />
    </group>
  );
}

/** A group that springs up by `lift` metres. */
function Lift({ lift, children }: { lift: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((st, dt) => {
    if (!g.current) return;
    const y = g.current.position.y;
    const next = y + (lift - y) * Math.min(1, dt * 3.5);
    g.current.position.y = Math.abs(lift - next) < 0.002 ? lift : next;
    if (g.current.position.y !== lift) st.invalidate();
  });
  return <group ref={g}>{children}</group>;
}

export function House() {
  const M = useMaterials();
  const level = useHouse((s) => s.level);
  const upper = level >= 2 ? LIFT : 0;
  const roof = upper + (level >= 1 ? LIFT : 0);
  return (
    <group>
      <Facade />
      <B a={[X0 + WALL, F1 - 0.02, Z0 + WALL]} b={[X1 - WALL, F1, Z1 - WALL]} m={M.floorTile} cast={false} />
      <B a={[X0 + WALL, F1, BACK_ROW + 0.05]} b={[-5, F1 + 0.012, Z1 - WALL]} m={M.floorWood} cast={false} />
      <Storey floor={1} y0={F1} y1={F2 - SLAB} />
      <Partitions floor={1} />
      <Stair />
      <FrontDoor />
      <Terrace />
      <GroundInterior />
      <Lift lift={upper}>
        <UpperSlab />
        <Storey floor={2} y0={F2 - SLAB} y1={EAVE} />
        <Partitions floor={2} />
        <Balcony />
        <UpperTerrace />
        <UpperInterior />
        <Lift lift={roof - upper}>
          <Gables />
          <MonoRoof />
          <FlatRoof />
        </Lift>
      </Lift>
    </group>
  );
}

export type { V3 };
