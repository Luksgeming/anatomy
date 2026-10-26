"use client";
// The lot round the house: lawn, the road and sidewalk, the sandstone planter wall on the street with a teak sliding
// gate for the cars and a small gate for people, white boundary walls on the other three sides, mossy cobble pavers
// for the drive (rain soaks through them), stepping stones to the porch, the steel carport with its teak soffit,
// two SUVs and the motorcycles, and bollard lamps along the path.
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CARPORT, FENCE_Z, GATE, PATH_X, PLOT, PORCH, STREET } from "../layout";
import { useMaterials } from "../materials";
import { house, useHouse } from "../store";
import { B, slatGeometry } from "./kit";

export interface SiteConfig { cars: number; motorcycles: number; lamps: number }

export function Site({ config }: { config: SiteConfig }) {
  const M = useMaterials();
  return (
    <group>
      {/* Ground: lawn over the lot, then the sidewalk and the road beyond the street wall */}
      <B a={[PLOT.x0, -0.3, PLOT.z0]} b={[PLOT.x1, 0, PLOT.z1]} m={M.lawn} cast={false} />
      <B a={[-60, -0.32, STREET.z0]} b={[60, 0.02, STREET.kerb]} m={M.concrete} cast={false} />
      <B a={[-60, -0.36, STREET.kerb]} b={[60, -0.12, 40]} m={M.asphalt} cast={false} />
      <B a={[-60, -0.34, -60]} b={[60, -0.3, STREET.z0]} m={M.paint("#6f7d55", 1)} cast={false} receive />
      {/* Drive: pavers from the carport to the street */}
      <B a={[CARPORT.x0, 0, CARPORT.z0 - 0.6]} b={[CARPORT.x1, 0.02, FENCE_Z]} m={M.pavers} cast={false} />
      <SteppingStones />
      <StreetWall />
      <BoundaryWalls />
      <Carport config={config} />
      <Bollards count={config.lamps} />
    </group>
  );
}

function SteppingStones() {
  const M = useMaterials();
  const stones = useMemo(() => {
    const out: [number, number, number][] = [];
    const z0 = FENCE_Z - 0.6;
    const z1 = PORCH.z1 + 0.8;
    for (let z = z0, i = 0; z > z1; z -= 0.62, i++) {
      const t = Math.min(1, Math.max(0, (z0 - z) / (z0 - z1)));
      const x = PATH_X + (-3.4 - PATH_X) * (t * t * (3 - 2 * t));
      out.push([x, z, i]);
    }
    return out;
  }, []);
  return (
    <group>
      {stones.map(([x, z, i]) => (
        <RoundedBox key={i} args={[0.85 + (i % 3) * 0.06, 0.06, 0.42]} radius={0.02} position={[x, 0.01, z]} rotation={[0, ((i % 5) - 2) * 0.04, 0]} material={M.concrete} receiveShadow castShadow />
      ))}
    </group>
  );
}

function StreetWall() {
  const M = useMaterials();
  const z0 = FENCE_Z - 0.5;
  const z1 = FENCE_Z;
  const h = 1.1;
  const runs: [number, number][] = [
    [PLOT.x0, CARPORT.x0 - 0.05],
    [CARPORT.x1 + 0.05, GATE.x0],
    [GATE.x1, PLOT.x1],
  ];
  const slide = useMemo(() => mergeGeometries(slatGeometry(Math.floor((CARPORT.x1 - CARPORT.x0) / 0.12), (i) => [[CARPORT.x0 + i * 0.12 + 0.01, 0.08, z1 - 0.1], [CARPORT.x0 + i * 0.12 + 0.1, 1.65, z1 - 0.06]])), []);
  const small = useMemo(() => mergeGeometries(slatGeometry(7, (i) => [[GATE.x0 + 0.02 + i * 0.125, 0.08, z1 - 0.1], [GATE.x0 + 0.11 + i * 0.125, 1.65, z1 - 0.06]])), []);
  return (
    <group>
      {runs.map(([x0, x1]) => (
        <group key={x0}>
          <B a={[x0, 0, z0]} b={[x1, h, z1]} m={M.stone} />
          <B a={[x0 + 0.04, h, z0 + 0.04]} b={[x1 - 0.04, h + 0.06, z1 - 0.04]} m={M.soil} cast={false} />
        </group>
      ))}
      {/* Gate posts in white render, a teak sliding gate and a small gate */}
      {[CARPORT.x0 - 0.3, CARPORT.x1 + 0.05, GATE.x0 - 0.3, GATE.x1].map((x) => (
        <B key={x} a={[x, 0, z0 - 0.05]} b={[x + 0.3, 1.8, z1 + 0.02]} m={M.render} />
      ))}
      <mesh geometry={slide} material={M.teak} castShadow receiveShadow />
      <mesh geometry={small} material={M.teak} castShadow receiveShadow />
      <B a={[CARPORT.x0, 0.06, z1 - 0.11]} b={[CARPORT.x1, 0.1, z1 - 0.05]} m={M.steel} />
      <B a={[GATE.x0, 0.06, z1 - 0.11]} b={[GATE.x1, 0.1, z1 - 0.05]} m={M.steel} />
    </group>
  );
}

function BoundaryWalls() {
  const M = useMaterials();
  const h = 1.8;
  const t = 0.15;
  return (
    <group>
      <B a={[PLOT.x0, 0, PLOT.z0]} b={[PLOT.x0 + t, h, FENCE_Z - 0.5]} m={M.render} />
      <B a={[PLOT.x1 - t, 0, PLOT.z0]} b={[PLOT.x1, h, FENCE_Z - 0.5]} m={M.render} />
      <B a={[PLOT.x0, 0, PLOT.z0]} b={[PLOT.x1, h, PLOT.z0 + t]} m={M.render} />
      {[PLOT.x0, PLOT.x1 - t].map((x) => (
        <B key={x} a={[x - 0.02, h, PLOT.z0]} b={[x + t + 0.02, h + 0.05, FENCE_Z - 0.5]} m={M.concrete} />
      ))}
      <B a={[PLOT.x0, h, PLOT.z0 - 0.02]} b={[PLOT.x1, h + 0.05, PLOT.z0 + t + 0.02]} m={M.concrete} />
    </group>
  );
}

function Carport({ config }: { config: SiteConfig }) {
  const M = useMaterials();
  const { x0, x1, z0, z1, h } = CARPORT;
  const posts: [number, number][] = [
    [x0 + 0.1, z1 - 0.1],
    [x1 - 0.1, z1 - 0.1],
    [x0 + 0.1, z0 + 0.1],
    [x1 - 0.1, z0 + 0.1],
  ];
  return (
    <group>
      {posts.map(([x, z], i) => (
        <B key={i} a={[x - 0.06, 0, z - 0.06]} b={[x + 0.06, h, z + 0.06]} m={M.steel} />
      ))}
      <B a={[x0 - 0.15, h, z0 - 0.15]} b={[x1 + 0.15, h + 0.22, z1 + 0.15]} m={M.steel} />
      <B a={[x0 - 0.1, h - 0.01, z0 - 0.1]} b={[x1 + 0.1, h, z1 + 0.1]} m={M.teak} cast={false} />
      {Array.from({ length: config.cars }, (_, i) => (
        <SUV key={i} x={x0 + 1.35 + i * 2.6} z={(z0 + z1) / 2} color={i ? "#2c2f33" : "#9aa0a6"} />
      ))}
      {Array.from({ length: config.motorcycles }, (_, i) => (
        <Scooter key={i} x={x1 + 0.45} z={z0 + 0.8 + i * 1.1} />
      ))}
    </group>
  );
}

/** A compact SUV: a bevelled body extruded from its side profile, glasshouse, wheels with alloy rims, lights. */
function SUV({ x, z, color }: { x: number; z: number; color: string }) {
  const M = useMaterials();
  const lights = useHouse((s) => s.carLights || !s.day);
  const body = useMemo(() => {
    const s = new THREE.Shape();
    // Side profile, nose toward +z (the street): length 4.5 m, height 1.68 m.
    const p: [number, number][] = [[-2.25, 0.32], [-2.3, 0.75], [-2.15, 1.0], [-1.6, 1.08], [-1.2, 1.62], [0.75, 1.65], [1.35, 1.12], [2.15, 0.98], [2.28, 0.7], [2.22, 0.32]];
    s.moveTo(...p[0]);
    p.slice(1).forEach((q) => s.lineTo(...q));
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.66, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 4 });
    g.translate(0, 0, -0.83);
    g.rotateY(-Math.PI / 2);
    return g;
  }, []);
  const glass = useMemo(() => {
    const s = new THREE.Shape();
    const p: [number, number][] = [[-1.5, 1.12], [-1.13, 1.58], [0.7, 1.6], [1.25, 1.15]];
    s.moveTo(...p[0]);
    p.slice(1).forEach((q) => s.lineTo(...q));
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.74, bevelEnabled: false });
    g.translate(0, 0, -0.87);
    g.rotateY(-Math.PI / 2);
    return g;
  }, []);
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }), [color]);
  const tint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#151a1f", metalness: 0.2, roughness: 0.05, clearcoat: 1 }), []);
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f4f2", emissive: "#fff1d6", emissiveIntensity: lights ? 2.5 : 0 }), [lights]);
  const tail = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5a0f0f", emissive: "#ff2a1a", emissiveIntensity: lights ? 1.5 : 0 }), [lights]);
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) house.set((s) => ({ carLights: !s.carLights }));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        house.set({ hover: "Mobil|Klik untuk menyalakan lampu" });
      }}
      onPointerOut={() => house.set({ hover: null })}
    >
      <mesh geometry={body} material={paint} castShadow receiveShadow />
      <mesh geometry={glass} material={tint} />
      {[
        [-0.82, 1.45],
        [0.82, 1.45],
        [-0.82, -1.45],
        [0.82, -1.45],
      ].map(([wx, wz], i) => (
        <group key={i} position={[wx, 0.36, wz]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.26, 32]} />
            <meshStandardMaterial color="#141414" roughness={0.85} />
          </mesh>
          <mesh position={[0, wx > 0 ? 0.135 : -0.135, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.02, 24]} />
            <meshStandardMaterial color="#b9bcc0" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
      {[-0.6, 0.6].map((lx) => (
        <group key={lx}>
          <B a={[lx - 0.22, 0.82, 2.28]} b={[lx + 0.22, 0.92, 2.34]} m={lamp} />
          <B a={[lx - 0.22, 0.9, -2.36]} b={[lx + 0.22, 1.0, -2.3]} m={tail} />
        </group>
      ))}
      <B a={[-0.4, 0.42, 2.3]} b={[0.4, 0.62, 2.36]} m={M.steel} />
      <B a={[-0.25, 0.5, 2.36]} b={[0.25, 0.6, 2.37]} m={M.paint("#f2f2f2", 0.4)} />
    </group>
  );
}

function Scooter({ x, z }: { x: number; z: number }) {
  const M = useMaterials();
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      {[-0.55, 0.55].map((wz) => (
        <mesh key={wz} position={[0, 0.25, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 24]} />
          <meshStandardMaterial color="#151515" roughness={0.85} />
        </mesh>
      ))}
      <RoundedBox args={[0.32, 0.38, 1.0]} radius={0.12} position={[0, 0.5, -0.05]} material={M.paint("#e9e7e2", 0.35, 0.2)} castShadow />
      <RoundedBox args={[0.3, 0.1, 0.62]} radius={0.05} position={[0, 0.74, -0.18]} material={M.paint("#1b1b1b", 0.6)} castShadow />
      <B a={[-0.03, 0.4, 0.48]} b={[0.03, 1.05, 0.54]} m={M.steel} />
      <B a={[-0.32, 1.02, 0.47]} b={[0.32, 1.06, 0.53]} m={M.steel} />
    </group>
  );
}

function Bollards({ count }: { count: number }) {
  const M = useMaterials();
  const night = useHouse((s) => !s.day);
  const spots: [number, number][] = [
    [PATH_X + 0.75, FENCE_Z - 1.6],
    [PATH_X - 0.8, FENCE_Z - 4.4],
    [-2.1, 6.0],
    [-3.6, 3.0],
  ];
  return (
    <group>
      {spots.slice(0, count).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <B a={[-0.06, 0, -0.06]} b={[0.06, 0.62, 0.06]} m={M.steel} />
          <B a={[-0.065, 0.52, -0.065]} b={[0.065, 0.6, 0.065]} m={M.paint("#fff2d8", 0.4)} />
          {night ? <pointLight position={[0, 0.58, 0]} color="#ffbf80" intensity={1.6} distance={4} decay={2} /> : null}
        </group>
      ))}
    </group>
  );
}
