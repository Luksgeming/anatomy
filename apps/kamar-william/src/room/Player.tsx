"use client";
// The reader's eyes: drag to look around, W A S D or the arrow keys (or the on-screen pad) to walk, never through a
// wall or the furniture. Picking a viewpoint glides there. Frames are only drawn while something moves.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { BODY_R, EYE, HALF, SOLIDS, VIEWS, type ViewId } from "./layout";
import { useRoom } from "./store";

/** Held directions from the on-screen pad, merged with the keyboard. */
export const pad = { forward: 0, right: 0, turn: 0 };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Push a point on the floor out of the walls and every furniture footprint. */
function collide(x: number, z: number): [number, number] {
  const lim = HALF - BODY_R;
  x = Math.max(-lim, Math.min(lim, x));
  z = Math.max(-lim, Math.min(lim, z));
  for (const b of SOLIDS) {
    const x0 = b.min[0] - BODY_R;
    const x1 = b.max[0] + BODY_R;
    const z0 = b.min[2] - BODY_R;
    const z1 = b.max[2] + BODY_R;
    if (x > x0 && x < x1 && z > z0 && z < z1) {
      const out = [x - x0, x1 - x, z - z0, z1 - z];
      const m = Math.min(...out);
      if (m === out[0]) x = x0;
      else if (m === out[1]) x = x1;
      else if (m === out[2]) z = z0;
      else z = z1;
    }
  }
  return [x, z];
}

export function Player() {
  const { camera, gl, invalidate } = useThree();
  const view = useRoom((s) => s.view);
  const tick = useRoom((s) => s.viewTick);
  const look = useRef({ yaw: VIEWS.door.yaw as number, pitch: VIEWS.door.pitch as number, x: VIEWS.door.pos[0] as number, y: VIEWS.door.pos[1] as number, z: VIEWS.door.pos[2] as number });
  const glide = useRef<{ from: typeof look.current; to: (typeof VIEWS)[ViewId]; t: number } | null>(null);
  const keys = useRef(new Set<string>());

  // Glide to a viewpoint when one is picked.
  useEffect(() => {
    glide.current = { from: { ...look.current }, to: VIEWS[view], t: 0 };
    invalidate();
  }, [view, tick, invalidate]);

  useEffect(() => {
    const el = gl.domElement;
    let drag: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        glide.current = null;
        look.current.yaw += dx * 0.0042;
        look.current.pitch = Math.max(-1.25, Math.min(1.25, look.current.pitch + dy * 0.0042));
        invalidate();
      }
    };
    const up = () => {
      drag = null;
    };
    const key = (e: KeyboardEvent, on: boolean) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e"].includes(k)) {
        e.preventDefault();
        if (on) keys.current.add(k);
        else keys.current.delete(k);
        invalidate();
      }
    };
    const kd = (e: KeyboardEvent) => key(e, true);
    const ku = (e: KeyboardEvent) => key(e, false);
    const blur = () => keys.current.clear();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
    };
  }, [gl, invalidate]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const L = look.current;
    let busy = false;

    const g = glide.current;
    if (g) {
      g.t = Math.min(1, g.t + dt / 1.1);
      const e = ease(g.t);
      L.x = g.from.x + (g.to.pos[0] - g.from.x) * e;
      L.y = g.from.y + (g.to.pos[1] - g.from.y) * e;
      L.z = g.from.z + (g.to.pos[2] - g.from.z) * e;
      L.yaw = g.from.yaw + wrap(g.to.yaw - g.from.yaw) * e;
      L.pitch = g.from.pitch + (g.to.pitch - g.from.pitch) * e;
      busy = g.t < 1;
      if (!busy) glide.current = null;
    }

    const k = keys.current;
    const fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) + pad.forward;
    const side = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0) + pad.right;
    const turn = (k.has("arrowleft") || k.has("q") ? 1 : 0) - (k.has("arrowright") || k.has("e") ? 1 : 0) + pad.turn;
    if (fwd || side || turn) {
      glide.current = null;
      L.yaw += turn * dt * 1.6;
      const speed = 1.3 * dt;
      const sx = -Math.sin(L.yaw);
      const sz = -Math.cos(L.yaw);
      const nx = L.x + (sx * fwd + -sz * side) * speed;
      const nz = L.z + (sz * fwd + sx * side) * speed;
      [L.x, L.z] = collide(nx, nz);
      L.y += (EYE - L.y) * Math.min(1, dt * 6); // stand up when walking off from a seat
      busy = true;
    }

    camera.position.set(L.x, L.y, L.z);
    camera.rotation.set(L.pitch, L.yaw, 0, "YXZ");
    if (busy) invalidate();
  });

  return null;
}
