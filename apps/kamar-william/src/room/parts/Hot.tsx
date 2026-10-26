"use client";
// Wraps anything the reader can point at: a hover names it and says what a click does, a click (not a drag to look
// around) runs the action.
import type { ThreeEvent } from "@react-three/fiber";
import type { ReactNode } from "react";
import { room } from "../store";

export function Hot({ id, label, hint, onClick, children }: { id: string; label: string; hint?: string; onClick?: () => void; children: ReactNode }) {
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    room.set({ hover: `${label}|${hint ?? ""}` });
    document.body.style.cursor = onClick ? "pointer" : "";
  };
  const out = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (room.get().hover?.startsWith(`${label}|`)) room.set({ hover: null });
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || !onClick) return; // the pointer moved: that was a look-around drag
    onClick();
    room.set({ hover: null });
  };
  return (
    <group name={id} onPointerOver={over} onPointerOut={out} onClick={click}>
      {children}
    </group>
  );
}
