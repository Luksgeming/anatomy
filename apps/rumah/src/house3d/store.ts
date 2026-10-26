"use client";
// The house's switches in one small store shared by the 3D scene and the controls. The canvas draws only on demand,
// so every change asks it for a frame.
import { useSyncExternalStore } from "react";
import type { ViewId } from "./layout";

export interface HouseState {
  level: 0 | 1 | 2; // 0 closed, 1 roof lifted, 2 upper floor lifted too
  day: boolean;
  hour: number; // 6..19 by day: moves the sun
  view: ViewId;
  viewTick: number;
  door: boolean;
  lights: boolean; // house lights at night
  carLights: boolean;
  hover: string | null;
}

let state: HouseState = { level: 0, day: true, hour: 9.5, view: "street", viewTick: 0, door: false, lights: true, carLights: false, hover: null };
const listeners = new Set<() => void>();
let redraw: (() => void) | null = null;

export const house = {
  get: () => state,
  set(patch: Partial<HouseState> | ((s: HouseState) => Partial<HouseState>)) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    listeners.forEach((l) => l());
    redraw?.();
  },
  onRedraw(fn: (() => void) | null) {
    redraw = fn;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useHouse<T>(pick: (s: HouseState) => T): T {
  return useSyncExternalStore(house.subscribe, () => pick(state), () => pick(state));
}
