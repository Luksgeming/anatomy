// William's room, 3 × 3 × 3 m, in metres: x to the east, y up, z to the south, origin at the floor's centre.
// Walls: north has the door and the tall mirror window, east the narrow window, the desk and the AC, south the
// wardrobe and the garment rack, west the bed against a timber slat wall. Everything that is drawn or collided with
// takes its size and place from here.

export const ROOM = { w: 3, d: 3, h: 3 } as const;
export const HALF = ROOM.w / 2;
export const WALL_T = 0.12;

/** A box by its min and max corners. */
export interface Box { min: [number, number, number]; max: [number, number, number] }
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({ min: [x0, y0, z0], max: [x1, y1, z1] });

// Openings.
export const DOOR = { x0: 0.45, x1: 1.25, h: 2.1, hingeX: 1.25 } as const; // north wall, hinge on the east side
export const MIRROR_WINDOW = { x0: -1.05, x1: -0.65, sill: 0.75, top: 2.1 } as const; // north wall
export const EAST_WINDOW = { z0: -1.15, z1: -0.8, sill: 0.8, top: 2.1 } as const; // east wall
export const VENTS = { y0: 2.36, y1: 2.5, w: 0.28, xs: [-1.2, -0.62, -0.05, 0.52, 1.1] } as const; // north wall, above the door line

// Furniture.
export const SLAT_WALL = { x: -HALF, depth: 0.03, top: 2.45 } as const;
export const BED = { x0: -1.44, x1: 0.62, z0: -0.87, z1: 0.87, platform: 0.24, mattress: 0.22 } as const;
export const HEADBOARD = { x0: -1.47, x1: -1.38, z0: -1.0, z1: 1.0, y0: 0.0, y1: 1.12 } as const; // stands on the floor behind the platform
export const NIGHTSTAND = { x0: -1.46, x1: -1.06, z0: -1.44, z1: -1.06, h: 0.48 } as const;
export const DESK = { x0: 0.88, x1: 1.5, z0: -0.62, z1: 0.96, h: 0.75, top: 0.03 } as const;
export const SHELF = { x0: 1.27, x1: 1.5, z0: -0.4, z1: 0.75, y: 1.42 } as const;
export const CHAIR = { x: 0.52, z: 0.12, seat: 0.48, r: 0.3 } as const;
export const WARDROBE = { x0: 0.22, x1: 0.84, z0: 0.96, z1: 1.5, h: 1.82 } as const;
export const RAIL = { x0: -1.02, x1: 0.12, y: 1.76, z: 1.24 } as const; // a freestanding garment rack along the south wall
export const BENCH = { x0: -0.98, x1: 0.08, z0: 1.18, z1: 1.5, h: 0.42 } as const;
export const SOFTBOX = { x: 0.08, z: -1.27, face: -0.42 } as const; // north wall, turned toward the bed
export const AC = { z: 0.18, y: 2.42, w: 0.82, h: 0.29, d: 0.22 } as const; // east wall
export const RUG = { x0: -0.95, x1: 0.95, z0: -1.0, z1: 1.0 } as const;
export const PLANT = { x: 1.16, z: 1.18 } as const; // the corner between the desk and the wardrobe
export const SIDE_TABLE = { x: -1.24, z: 1.16, r: 0.19, h: 0.5 } as const;

/** Where the reader can stand: furniture footprints the eye may not walk through (the rug and the open floor are free). */
export const SOLIDS: Box[] = [
  box(BED.x0, 0, BED.z0, BED.x1, 0.6, BED.z1),
  box(NIGHTSTAND.x0, 0, NIGHTSTAND.z0, NIGHTSTAND.x1, NIGHTSTAND.h, NIGHTSTAND.z1),
  box(DESK.x0, 0, DESK.z0, DESK.x1, DESK.h, DESK.z1),
  box(WARDROBE.x0, 0, WARDROBE.z0, WARDROBE.x1, WARDROBE.h, WARDROBE.z1),
  box(BENCH.x0, 0, BENCH.z0, BENCH.x1, 1.9, BENCH.z1),
  box(SOFTBOX.x - 0.2, 0, SOFTBOX.z - 0.2, SOFTBOX.x + 0.2, 1.9, SOFTBOX.z + 0.2),
  box(PLANT.x - 0.22, 0, PLANT.z - 0.22, PLANT.x + 0.22, 1.4, PLANT.z + 0.22),
  box(SIDE_TABLE.x - SIDE_TABLE.r, 0, SIDE_TABLE.z - SIDE_TABLE.r, SIDE_TABLE.x + SIDE_TABLE.r, SIDE_TABLE.h, SIDE_TABLE.z + SIDE_TABLE.r),
];

export const EYE = 1.6;
export const BODY_R = 0.2;

/** Viewpoints: where the eye stands and which way it looks (yaw from -z, radians, positive turns left; pitch up). */
export const VIEWS = {
  door: { label: "Dari pintu", pos: [1.0, EYE, -1.12], yaw: Math.PI - 0.88, pitch: -0.16 },
  bed: { label: "Bersandar di kasur", pos: [-1.0, 0.98, -0.42], yaw: -Math.PI / 2 + 0.08, pitch: -0.1 },
  desk: { label: "Di meja", pos: [0.42, 1.2, 0.16], yaw: -Math.PI / 2 - 0.12, pitch: -0.36 },
  corner: { label: "Sudut lemari", pos: [0.55, EYE, 0.7], yaw: 0.85, pitch: -0.1 },
} as const satisfies Record<string, { label: string; pos: [number, number, number]; yaw: number; pitch: number }>;
export type ViewId = keyof typeof VIEWS;

/** Warm light colours (kelvin-ish) used throughout. */
export const WARM = { amber: "#ffaa5e", candle: "#ffbb78", soft: "#ffcc94", screen: "#bcd4ff", day: "#dfe9ff" } as const;
