"use client";
// How far the room is pulled apart, for the exploded blueprint view: each wall slides outward along its normal and
// the ceiling (with its cornice and the pendant) rises. Zero in the live room.
import { createContext, useContext } from "react";

export interface Explode { walls: number; ceiling: number }
export const ExplodeContext = createContext<Explode>({ walls: 0, ceiling: 0 });
export const useExplode = () => useContext(ExplodeContext);
