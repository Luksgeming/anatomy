// World layout in units of 5 cm: x to the right-back, y to the left-back, z up. The viewer stands at +x, +y;
// the street runs along the front (+y). The property is split into zones: house, parking, ornamental garden,
// edible garden and a fenced homestead corner.
import { CONFIG } from "./config-runtime.ts";

export const W = 1200;
export const H = 1080;
// The live figure's camera. HS_AZIMUTH / HS_ELEVATION rebuild the same scene from another side for the 360 views,
// the elevations (elevation 0) and the plan (elevation 90).
export const AZIMUTH = Number(process.env.HS_AZIMUTH ?? 45);
export const ELEVATION = Number(process.env.HS_ELEVATION ?? 30);

export const PLOT = { x: -200, y: -230, w: 400, d: 500, r: 6 };
export const SOIL_H = 14;
export const PLINTH = { x: -208, y: -238, w: 416, d: 516, r: 9 };
export const PLINTH_H = 6;
export const FOOT_H = 6;

// The house: 12 × 8 m on a 40 cm plinth against flooding, 3.2 m ground storey, 3 m upper storey.
export const HOUSE = { x: -190, y: -180, w: 240, d: 160 };
export const WALL = 3;
export const FOUND_H = 8;
export const F1 = FOUND_H;
export const SLAB = 4;
export const F2 = F1 + 64;
export const EAVE = F2 + 60;
export const CUT_NEAR = 12;
export const CUT_PART = 36;
export const ROOF_PITCH = 25;
export const ROOF_OVER = 24;

export const IN = { x: HOUSE.x + WALL, y: HOUSE.y + WALL, w: HOUSE.w - WALL * 2, d: HOUSE.d - WALL * 2 };
export const FRONT_Y = HOUSE.y + HOUSE.d;
export const RIGHT_X = HOUSE.x + HOUSE.w;
export const BACK_ROW = -110; // the line between the front rooms and the back service rooms, both floors

// Ground floor rooms (x ranges; front rooms run BACK_ROW…FRONT_Y, back rooms HOUSE.y…BACK_ROW).
export const GF = { living: [-190, -100], dining: [-100, -40], kitchen: [-40, 50], bath: [-190, -150], stair: [-150, -75], wet: [-75, -10], laundry: [-10, 50] } as const;
// Upper floor rooms.
export const UF = { master: [-190, -80], bed2: [-80, 50], masterBath: [-190, -150], hall: [-150, -10], bed2Bath: [-10, 50] } as const;
export const STAIR = { x: -148, y: IN.y, w: 72, d: 18, steps: 16 };
export const STAIR_OPEN = { x: STAIR.x - 2, y: IN.y, w: STAIR.w + 4, d: STAIR.d + 1 };
export const DOOR = { x: -82, w: 18, h: 46 };

// Front terrace before the entrance, under a flat concrete roof on two columns.
export const PORCH = { x: -96, y: HOUSE.y + HOUSE.d, w: 56, d: 24 };

// Covered terrace on the garden side; its roof is the upper-floor balcony.
export const TERRACE = { x: RIGHT_X, y: BACK_ROW, w: 50, d: FRONT_Y - BACK_ROW };
export const BALCONY = CONFIG.balcony;

// Carport for two cars and motorcycles, on grass pavers.
export const CARPORT = { x: -190, y: 10, w: 105, d: 115 };
export const CARPORT_Z = 56;

// Gardens.
export const PATH_X = -33;
export const GATE_Y = PLOT.y + PLOT.d;
export const FENCE_H = 18;
export const BEDS = { x: 112, y: -52, cols: 2, rows: 3, w: 36, d: 22, gapX: 12, gapY: 18 };
export const DRYING = { x: 58, y: -176, w: 46, d: 56 };

// The homestead corner, fenced off from the house and gardens.
export const HOMESTEAD = { x: 108, y: -230, w: 92, d: 152 };
export const RUN = { x: 122, y: -226, w: 74, d: 70 };
export const COOP = { x: 164, y: -223, w: 28, d: 26 };
export const COOP_FLOOR = 14;
export const TANK = { x: 80, y: -206, r: 13, h: 32 };

export const PIECES = {
  roof: { name: "Atap", say: "atap perisai 25° · tritisan 1,2 m", move: [0, 0, 112] as [number, number, number] },
  upper: { name: "Lantai 2", say: "lantai 2 · dua kamar dengan kamar mandi dalam", move: [0, 0, 70] as [number, number, number] },
  ground: { name: "Lantai 1", say: "lantai 1 · ruang keluarga, dapur, servis", move: [0, 0, 0] as [number, number, number] },
  yard: { name: "Halaman", say: "halaman", move: [0, 0, 0] as [number, number, number] },
  stand: { name: "Kavling", say: "", move: [0, 0, 0] as [number, number, number] },
};
export type PieceId = keyof typeof PIECES;
export const STAGGER: PieceId[] = ["roof", "upper", "ground", "yard", "stand"];
export const SPRING = { stagger: 0.07, stiffness: 52, damping: 13.6, substeps: 4 };
