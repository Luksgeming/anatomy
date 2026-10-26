// The tropical homestead in metres: x to the east, y up, z to the south, with the street along the south (+z) edge.
// Same plan as before (a 20 × 25 m lot, a 12 × 8 m two-storey house), now dressed after the reference: white render,
// a dramatic mono-pitch roof with a timber soffit over the west wing, a lower flat roof over the east wing, sandstone
// cladding round the entrance, vertical timber screens, black steel balcony rails and a sandstone planter wall on the
// street. Everything that is drawn takes its size and place from here.

export const PLOT = { x0: -10, x1: 10, z0: -11.5, z1: 13.5 } as const;
export const STREET = { z0: 13.5, z1: 20, kerb: 15.2 } as const; // sidewalk to the kerb, then the road

// The house.
export const HOUSE = { x0: -9.5, x1: 2.5, z0: -9, z1: -1 } as const;
export const WALL = 0.15;
export const F1 = 0.4; // ground floor level (raised against flooding)
export const F2 = 3.6; // upper floor level
export const SLAB = 0.2;
export const EAVE = 6.6; // top of the upper walls
export const BACK_ROW = -5.5; // line between front rooms and back service rooms on both floors

/** West wing under the mono-pitch roof, east wing under the flat roof. */
export const WING_SPLIT = -1.0;
export const ROOF = {
  low: 6.9, // west eave
  high: 9.4, // east ridge of the mono-pitch
  over: 1.2, // overhang all round
  flat: 7.1, // flat roof top over the east wing
  thick: 0.3,
} as const;

export const GF = { living: [-9.5, -5], dining: [-5, -2], kitchen: [-2, 2.5], bath: [-9.5, -7.5], stair: [-7.5, -3.75], wet: [-3.75, -0.5], laundry: [-0.5, 2.5] } as const;
export const UF = { master: [-9.5, -4], bed2: [-4, 2.5], masterBath: [-9.5, -7.5], hall: [-7.5, -0.5], bed2Bath: [-0.5, 2.5] } as const;

export const DOOR = { x0: -4.1, x1: -3.2, h: 2.3 } as const; // front door, south wall
export const PORCH = { x0: -4.8, x1: -2.0, z0: -1, z1: 0.2 } as const;
export const TERRACE = { x0: 2.5, x1: 5.0, z0: -5.5, z1: -1 } as const; // garden side, its roof is the upper balcony
export const STAIR = { x0: -7.4, x1: -3.8, z0: -8.85, z1: -7.95, steps: 16 } as const;

/** Window openings: wall (s/n/e/w), along-range (x for s/n, z for e/w), sill and head heights above floor 0. */
export interface Opening { wall: "s" | "n" | "e" | "w"; a0: number; a1: number; sill: number; head: number; kind: "window" | "glass" | "door"; floor: 1 | 2 }
export const OPENINGS: Opening[] = [
  // Ground floor, street side: living picture window, the door, kitchen window.
  { wall: "s", a0: -8.8, a1: -6.0, sill: F1 + 0.5, head: F1 + 2.5, kind: "window", floor: 1 },
  { wall: "s", a0: DOOR.x0, a1: DOOR.x1, sill: F1, head: F1 + DOOR.h, kind: "door", floor: 1 },
  { wall: "s", a0: -1.4, a1: 1.4, sill: F1 + 1.1, head: F1 + 2.5, kind: "window", floor: 1 },
  // Ground floor, garden side: terrace glass doors and the laundry door; back: high windows for cross ventilation.
  { wall: "e", a0: -5.0, a1: -3.0, sill: F1, head: F1 + 2.5, kind: "glass", floor: 1 },
  { wall: "e", a0: -7.5, a1: -6.6, sill: F1, head: F1 + 2.2, kind: "door", floor: 1 },
  { wall: "n", a0: -9.1, a1: -8.0, sill: F1 + 2.0, head: F1 + 2.7, kind: "window", floor: 1 },
  { wall: "n", a0: -3.1, a1: -1.2, sill: F1 + 1.5, head: F1 + 2.7, kind: "window", floor: 1 },
  { wall: "n", a0: 0.4, a1: 1.8, sill: F1 + 1.6, head: F1 + 2.7, kind: "window", floor: 1 },
  { wall: "w", a0: -4.8, a1: -2.2, sill: F1 + 0.7, head: F1 + 2.7, kind: "window", floor: 1 },
  // Upper floor, street side: master balcony glass doors, bedroom 2 window with the timber screen beside it.
  { wall: "s", a0: -8.6, a1: -5.4, sill: F2, head: F2 + 2.5, kind: "glass", floor: 2 },
  { wall: "s", a0: -3.2, a1: -0.4, sill: F2 + 0.6, head: F2 + 2.5, kind: "window", floor: 2 },
  { wall: "e", a0: -4.9, a1: -3.1, sill: F2, head: F2 + 2.5, kind: "glass", floor: 2 },
  { wall: "n", a0: -9.1, a1: -8.0, sill: F2 + 1.6, head: F2 + 2.4, kind: "window", floor: 2 },
  { wall: "n", a0: -6.0, a1: -4.0, sill: F2 + 1.0, head: F2 + 2.4, kind: "window", floor: 2 },
  { wall: "n", a0: 0.4, a1: 1.6, sill: F2 + 1.6, head: F2 + 2.4, kind: "window", floor: 2 },
  { wall: "w", a0: -6.0, a1: -3.0, sill: F2 + 0.8, head: F2 + 2.5, kind: "window", floor: 2 },
];

/** The front balcony off the master bedroom, cantilevered over the porch line. */
export const BALCONY = { x0: -9.5, x1: -5.0, z0: -1, z1: 0.4 } as const;

// Outside.
export const CARPORT = { x0: -9.5, x1: -4.25, z0: 0.5, z1: 6.25, h: 2.7 } as const;
export const PATH_X = -1.65;
export const GATE = { x0: -2.1, x1: -1.2 } as const; // pedestrian gate in the street wall
export const FENCE_Z = PLOT.z1 - 0.2;
export const BEDS = { x0: 5.6, z0: -2.6, w: 1.8, d: 1.1, gapX: 0.6, gapZ: 0.9, cols: 2, rows: 3 } as const;
export const GARDEN_FENCE = { x: 5.4, z0: -3.7, z1: 2.9 } as const;
export const DRYING = { x0: 2.9, x1: 5.2, z0: -8.8, z1: -6.0 } as const;
export const HOMESTEAD = { x0: 5.4, x1: 10, z0: -11.5, z1: -3.9 } as const;
export const RUN = { x0: 6.1, x1: 9.8, z0: -11.3, z1: -7.8 } as const;
export const COOP = { x0: 8.2, x1: 9.6, z0: -11.15, z1: -9.85, floor: 0.7 } as const;
export const COMPOST = { x0: 5.8, x1: 7.6, z0: -6.9, z1: -5.9 } as const;
export const SHED = { x0: 8.3, x1: 9.7, z0: -7.4, z1: -6.2 } as const;
export const TANK = { x: 4.0, z: -10.3, r: 0.65, h: 1.6 } as const;
export const FRUIT_ROW_Z = -3.2;

/** Camera stops around the lot: where the eye is and what it looks at. */
export const VIEWS = {
  street: { label: "Depan", pos: [6, 4.2, 26], target: [-3, 3.2, -3] },
  corner: { label: "Sudut jalan", pos: [-20, 9, 24], target: [-2, 2.5, -2] },
  garden: { label: "Kebun", pos: [18, 7, 6], target: [5, 1, -3] },
  homestead: { label: "Homestead", pos: [16, 6, -18], target: [7, 0.8, -8] },
  top: { label: "Atas", pos: [0.01, 42, 1], target: [0, 0, 1] },
} as const satisfies Record<string, { label: string; pos: [number, number, number]; target: [number, number, number] }>;
export type ViewId = keyof typeof VIEWS;
