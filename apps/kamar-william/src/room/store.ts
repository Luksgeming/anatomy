"use client";
// The room's switches in one small external store: the 3D scene and the controls both read it, and any change
// asks the canvas for one new frame (the canvas only draws on demand, so an idle room costs nothing).
import { useSyncExternalStore } from "react";
import type { ViewId } from "./layout";

export type LightId = "pendant" | "headboard" | "underbed" | "bedside" | "desk" | "softbox" | "screen";

export interface RoomState {
  lights: Record<LightId, boolean>;
  dim: number; // 0..1, the dimmer for every warm light
  day: boolean;
  door: boolean; // open
  curtains: boolean; // closed
  ac: boolean;
  view: ViewId;
  viewTick: number; // bumps when the same view is asked for again
  hover: string | null;
}

let state: RoomState = {
  lights: { pendant: true, headboard: true, underbed: true, bedside: true, desk: true, softbox: false, screen: true },
  dim: 0.62,
  day: false,
  door: false,
  curtains: true,
  ac: true,
  view: "door",
  viewTick: 0,
  hover: null,
};

const listeners = new Set<() => void>();
let redraw: (() => void) | null = null;

export const room = {
  get: () => state,
  set(patch: Partial<RoomState> | ((s: RoomState) => Partial<RoomState>)) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    listeners.forEach((l) => l());
    redraw?.();
  },
  toggleLight(id: LightId) {
    room.set((s) => ({ lights: { ...s.lights, [id]: !s.lights[id] } }));
  },
  /** The canvas registers its invalidate here so store changes draw a frame. */
  onRedraw(fn: (() => void) | null) {
    redraw = fn;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useRoom<T>(pick: (s: RoomState) => T): T {
  return useSyncExternalStore(room.subscribe, () => pick(state), () => pick(state));
}
