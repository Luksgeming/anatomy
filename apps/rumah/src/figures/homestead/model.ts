// The tropical homestead's true numbers. Everything the figure shows (readout, info cards, caption, blueprint)
// comes from here, computed from the current config.
import type { HomesteadConfig } from "./config";

export const UNIT_M = 0.05;
export const HOUSE = { lengthM: 12, depthM: 8, storeyM: 3.2, roofPitchDeg: 25, overhangM: 1.2 };
export const PLOT = { widthM: 20, depthM: 25 };
export const BED = { lengthM: 2.4, widthM: 1.2, plants: 12 };
export const TANK_LITRES = 2000;
// Rain over the roof's plan, a typical Indonesian 2,500 mm a year, 80% of it reaching the tank.
export const RAIN_MM_YEAR = 2500;
export const EGGS_PER_HEN = 0.8;

export interface Stats {
  floorM2: number;
  plotM2: number;
  roofM2: number;
  rainM3Year: number;
  beds: number;
  bedPlants: number;
  fruits: number;
  hens: number;
  eggsPerDay: number;
  cars: number;
  motorcycles: number;
  bathrooms: number;
}

export function statsOf(config: HomesteadConfig): Stats {
  const roofM2 = (HOUSE.lengthM + HOUSE.overhangM * 2) * (HOUSE.depthM + HOUSE.overhangM * 2);
  return {
    floorM2: HOUSE.lengthM * HOUSE.depthM * 2,
    plotM2: PLOT.widthM * PLOT.depthM,
    roofM2,
    rainM3Year: Math.round((roofM2 * RAIN_MM_YEAR * 0.8) / 1000),
    beds: config.beds.length,
    bedPlants: config.beds.length * BED.plants,
    fruits: config.fruits.length,
    hens: config.hens,
    eggsPerDay: Math.round(config.hens * EGGS_PER_HEN),
    cars: config.cars,
    motorcycles: config.motorcycles,
    bathrooms: 3,
  };
}

export const fmtId = (value: number, digits = 0) =>
  value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export interface HomesteadState {
  night: number;
}

export function readoutOf(state: HomesteadState, stats: Pick<Stats, "beds" | "hens" | "eggsPerDay">): string {
  const parts = [`${stats.beds} bedengan`, stats.hens ? `${stats.hens} ayam · ±${stats.eggsPerDay} telur/hari` : "tanpa ayam"];
  parts.push(state.night > 0.5 ? "malam" : "siang");
  return parts.join(" · ");
}
