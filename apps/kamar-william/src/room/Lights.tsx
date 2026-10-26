"use client";
// Every light in the room, from the store's switches and the one dimmer. Warm sources are around 2200–2700 K so the
// room reads amber and calm at night; by day a soft sky comes in through the two narrow windows and the vents.
// Intensities are physical (candela for point and spot lights, nits for area lights).
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { DESK, EAST_WINDOW, HALF, MIRROR_WINDOW, NIGHTSTAND, SOFTBOX, WARM } from "./layout";
import { PENDANT_Y } from "./parts/Decor";
import { useRoom } from "./store";

function Area({ position, look, width, height, color, intensity }: { position: [number, number, number]; look: [number, number, number]; width: number; height: number; color: string; intensity: number }) {
  const ref = useRef<THREE.RectAreaLight>(null);
  useLayoutEffect(() => {
    ref.current?.lookAt(...look);
  }, [look]);
  return <rectAreaLight ref={ref} position={position} width={width} height={height} color={color} intensity={intensity} />;
}

// Fixed aim points, so the area lights' lookAt runs once.
const HEAD_LOOK: [number, number, number] = [-2.6, 1.55, 0];
const SCREEN_LOOK: [number, number, number] = [0, 0.86, 0.24];
const SOFT_LOOK: [number, number, number] = [-0.5, 1.0, 0];

export function Lights() {
  const { lights, dim, day } = useRoom((s) => s);
  const k = dim * dim * 1.6 + 0.08; // a dimmer feels linear when it scales with the square
  const desk = useRef<THREE.SpotLight>(null);
  useLayoutEffect(() => {
    if (!desk.current) return;
    desk.current.target.position.set(1.12, DESK.h, 0.35);
    desk.current.target.updateMatrixWorld();
  }, []);
  const bedside: [number, number, number] = [(NIGHTSTAND.x0 + NIGHTSTAND.x1) / 2 - 0.04, NIGHTSTAND.h + 0.25, (NIGHTSTAND.z0 + NIGHTSTAND.z1) / 2 - 0.03];
  return (
    <group>
      {/* A faint warm fill so no corner is ever pure black */}
      <hemisphereLight args={[day ? "#e8eef8" : "#ffcf9e", day ? "#b9a68c" : "#2a1d14", day ? 0.9 : 0.05]} />

      <pointLight position={[0, PENDANT_Y + 0.02, 0]} color={WARM.amber} intensity={lights.pendant ? 9 * k : 0} distance={0} decay={2} castShadow={lights.pendant} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0008} shadow-radius={6} />
      <pointLight position={bedside} color={WARM.candle} intensity={lights.bedside ? 2.2 * k : 0} decay={2} />
      <spotLight
        ref={desk}
        position={[1.33, DESK.h + 0.4, 0.8]}
        color={WARM.soft}
        intensity={lights.desk ? 9 * k : 0}
        angle={1.0}
        penumbra={0.8}
        decay={2}
        castShadow={lights.desk}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
      />
      <pointLight position={[1.33, DESK.h + 0.55, 0.8]} color={WARM.candle} intensity={lights.desk ? 0.5 * k : 0} decay={2} />

      <Area position={[-1.42, 1.13, 0]} look={HEAD_LOOK} width={1.9} height={0.08} color={WARM.amber} intensity={lights.headboard ? 60 * k : 0} />
      <UnderBed on={lights.underbed} k={k} />
      <Area position={[1.21, 0.86, 0.24]} look={SCREEN_LOOK} width={0.29} height={0.18} color={WARM.screen} intensity={lights.screen ? 6 : 0} />
      <Area position={[SOFTBOX.x + Math.sin(SOFTBOX.face) * 0.04, 1.62, SOFTBOX.z + Math.cos(SOFTBOX.face) * 0.04]} look={SOFT_LOOK} width={0.42} height={0.42} color="#fff4e6" intensity={lights.softbox ? 26 : 0} />

      {/* Daylight: low sun through the east window, sky through the mirror window and the vents */}
      {day ? (
        <>
          <directionalLight position={[5, 3.2, -1.3]} color="#fff1dc" intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004}>
            <orthographicCamera attach="shadow-camera" args={[-2.5, 2.5, 2.5, -2.5, 0.5, 12]} />
          </directionalLight>
          <Area position={[HALF - 0.05, (EAST_WINDOW.sill + EAST_WINDOW.top) / 2, (EAST_WINDOW.z0 + EAST_WINDOW.z1) / 2]} look={[0, 1.2, -0.9]} width={0.35} height={1.3} color={WARM.day} intensity={18} />
          <Area position={[(MIRROR_WINDOW.x0 + MIRROR_WINDOW.x1) / 2, (MIRROR_WINDOW.sill + MIRROR_WINDOW.top) / 2, -HALF + 0.05]} look={[-0.85, 1.2, 1]} width={0.4} height={1.35} color={WARM.day} intensity={14} />
        </>
      ) : null}
    </group>
  );
}

function UnderBed({ on, k }: { on: boolean; k: number }) {
  return <rectAreaLight position={[-0.41, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]} width={1.9} height={1.55} color={WARM.amber} intensity={on ? 7 * k : 0} />;
}
