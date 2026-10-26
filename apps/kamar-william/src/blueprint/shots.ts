// Every picture on the blueprint sheets: where the camera stands, what it looks at, how it is drawn, and the world
// points (marks) the sheet turns into dimension lines. Sizes come from the room's layout.
import type { Explode } from "../room/explode";
import { AC, BED, DESK, DOOR, EAST_WINDOW, HALF, MIRROR_WINDOW, ROOM, WARDROBE } from "../room/layout";

type V3 = [number, number, number];
export interface Shot {
  id: string;
  w: number;
  h: number;
  from: V3;
  to: V3;
  up?: V3;
  ortho?: number; // half-height of the orthographic view in metres
  fov?: number;
  style: "line" | "real";
  clip?: { normal: V3; constant: number };
  explode?: Explode;
  day?: boolean;
  ghost?: string[]; // groups drawn as faint glass so the room shows through them
  hideOutside?: boolean;
  background?: string;
  marks?: Record<string, V3>;
}

const H = ROOM.h;
const CUT = 2.0; // the plan's section height: above the wardrobe, below the AC and the vents
const S = HALF; // inner face of every wall

const plan: Shot = {
  id: "plan",
  w: 1200,
  h: 1200,
  from: [0, 12, 0],
  to: [0, 0, 0],
  up: [0, 0, -1],
  ortho: 2.0,
  style: "line",
  clip: { normal: [0, -1, 0], constant: CUT },
  marks: {
    nw: [-S, 0, -S], ne: [S, 0, -S], se: [S, 0, S], sw: [-S, 0, S],
    door0: [DOOR.x0, 0, -S], door1: [DOOR.x1, 0, -S],
    mw0: [MIRROR_WINDOW.x0, 0, -S], mw1: [MIRROR_WINDOW.x1, 0, -S],
    ew0: [S, 0, EAST_WINDOW.z0], ew1: [S, 0, EAST_WINDOW.z1],
    bed: [(BED.x0 + BED.x1) / 2, 0, 0], desk: [(DESK.x0 + DESK.x1) / 2, 0, (DESK.z0 + DESK.z1) / 2], wardrobe: [(WARDROBE.x0 + WARDROBE.x1) / 2, 0, (WARDROBE.z0 + WARDROBE.z1) / 2],
    rack: [-0.45, 0, 1.3], nightstand: [-1.26, 0, -1.25], chair: [0.52, 0, 0.12], rug: [0, 0, -0.55], plant: [1.2, 0, 1.22], softbox: [0.08, 0, -1.27],
  },
};

/** An interior section elevation looking at one wall: the room's near half is cut away by the clipping plane. */
function elevation(id: string, wall: "north" | "east" | "south" | "west", marks: Record<string, V3>): Shot {
  const dir: Record<string, { from: V3; normal: V3 }> = {
    north: { from: [0, H / 2, 8], normal: [0, 0, -1] },
    east: { from: [-8, H / 2, 0], normal: [1, 0, 0] },
    south: { from: [0, H / 2, -8], normal: [0, 0, 1] },
    west: { from: [8, H / 2, 0], normal: [-1, 0, 0] },
  };
  const d = dir[wall];
  return { id, w: 1200, h: 1100, from: d.from, to: [0, H / 2, 0], ortho: 1.9, style: "line", clip: { normal: d.normal, constant: 0 }, marks };
}

const north = elevation("north", "north", {
  l0: [-S, 0, -S], l1: [S, 0, -S], t0: [-S, H, -S],
  door0: [DOOR.x0, 0, -S], door1: [DOOR.x1, 0, -S], doorTop: [DOOR.x1, DOOR.h, -S],
  mwSill: [MIRROR_WINDOW.x0, MIRROR_WINDOW.sill, -S], mwTop: [MIRROR_WINDOW.x0, MIRROR_WINDOW.top, -S], mw0: [MIRROR_WINDOW.x0, MIRROR_WINDOW.top, -S], mw1: [MIRROR_WINDOW.x1, MIRROR_WINDOW.top, -S],
});
const east = elevation("east", "east", {
  l0: [S, 0, -S], l1: [S, 0, S], t0: [S, H, -S],
  ewSill: [S, EAST_WINDOW.sill, EAST_WINDOW.z0], ewTop: [S, EAST_WINDOW.top, EAST_WINDOW.z0], ew0: [S, EAST_WINDOW.top, EAST_WINDOW.z0], ew1: [S, EAST_WINDOW.top, EAST_WINDOW.z1],
  desk0: [S, DESK.h, DESK.z0], desk1: [S, DESK.h, DESK.z1], deskH: [S, DESK.h, DESK.z1], acY: [S, AC.y, AC.z],
});
const south = elevation("south", "south", { l0: [S, 0, S], l1: [-S, 0, S], t0: [S, H, S], wd0: [WARDROBE.x1, 0, S], wd1: [WARDROBE.x0, 0, S], wdTop: [WARDROBE.x0, WARDROBE.h, S] });
const west = elevation("west", "west", { l0: [-S, 0, S], l1: [-S, 0, -S], t0: [-S, H, S], bed0: [-S, 0, BED.z1], bed1: [-S, 0, BED.z0] });

const exploded: Shot = {
  id: "explode",
  w: 1600,
  h: 1200,
  from: [-6.5, 10.5, 6.5],
  to: [0, 1.2, 0],
  ortho: 3.4,
  style: "real",
  day: true,
  background: "#f4efe6",
  ghost: ["wall-south", "wall-west", "wall-west-slats"],
  hideOutside: true,
  explode: { walls: 0.9, ceiling: 1.5 },
  marks: {
    ceiling: [0, H + 1.5, -1.0], north: [-0.6, 2.4, -S - 0.9], east: [S + 0.9, 2.2, 0.6], south: [-0.6, 1.8, S + 0.9], west: [-S - 0.9, 1.6, -0.5],
    bed: [-0.6, 0.5, 0.2], desk: [1.2, 0.8, 0.4], wardrobe: [0.53, 1.8, 1.2],
  },
};

const corner = (id: string, from: V3, to: V3): Shot => ({ id, w: 1200, h: 800, from, to, fov: 78, style: "real" });
const corners = [
  corner("c-ne", [1.22, 1.6, -1.22], [-1.0, 1.0, 1.0]),
  corner("c-se", [1.22, 1.6, 1.22], [-1.0, 1.0, -1.0]),
  corner("c-sw", [-1.22, 1.6, 1.22], [1.0, 1.0, -1.0]),
  corner("c-nw", [-1.25, 1.6, -1.25], [1.0, 1.0, 1.0]),
];

const detail = (id: string, from: V3, to: V3, fov = 52): Shot => ({ id, w: 800, h: 960, from, to, fov, style: "real" });
const details = [
  detail("d-desk", [0.42, 1.28, 0.12], [1.3, 0.82, 0.18]),
  detail("d-bed", [0.25, 1.25, 0.15], [-1.4, 0.95, 0]),
  detail("d-wardrobe", [0.53, 1.25, -0.1], [0.53, 1.15, 1.5]),
  detail("d-rack", [-0.45, 1.35, 0.1], [-0.45, 1.1, 1.5], 60),
  detail("d-door", [0.85, 1.35, 0.25], [0.85, 1.15, -1.5]),
  detail("d-window", [-0.3, 1.65, 0.2], [1.5, 1.85, -0.45], 72),
  detail("d-nightstand", [-0.75, 0.95, -0.55], [-1.26, 0.6, -1.25], 46),
  detail("d-pendant", [0.6, 1.45, 0.6], [0, 2.35, 0], 50),
];

export const SHOTS: Shot[] = [plan, north, east, south, west, exploded, ...corners, ...details];
