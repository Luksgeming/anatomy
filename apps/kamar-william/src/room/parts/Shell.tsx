"use client";
// The room's shell: four painted walls cut round their real openings, the tiled floor, the ceiling with its cornice,
// the timber slat wall behind the bed, the door, both narrow windows with linen curtains, the vent row and the AC.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AC, DOOR, EAST_WINDOW, HALF, MIRROR_WINDOW, ROOM, SLAT_WALL, VENTS, WALL_T } from "../layout";
import { useExplode } from "../explode";
import { room, useRoom } from "../store";
import { linen, poster } from "../textures";
import { useMaterials } from "../materials";
import { Hot } from "./Hot";

const TRIM = "#f1e8da";
type Hole = [number, number, number, number]; // u0, v0, u1, v1 in wall coordinates

/** One wall's inner face: a plane of the wall's width and height with its openings cut out, UVs in metres. */
function WallFace({ width, holes }: { width: number; holes: Hole[] }) {
  const M = useMaterials();
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, ROOM.h);
    shape.lineTo(-width / 2, ROOM.h);
    shape.closePath();
    for (const [u0, v0, u1, v1] of holes) {
      const hole = new THREE.Path();
      hole.moveTo(u0, v0);
      hole.lineTo(u0, v1);
      hole.lineTo(u1, v1);
      hole.lineTo(u1, v0);
      hole.closePath();
      shape.holes.push(hole);
    }
    const g = new THREE.ShapeGeometry(shape);
    g.userData.metricUV = true; // shape coordinates are already metres
    return g;
  }, [width, holes]);
  return <mesh geometry={geometry} material={M.wall} receiveShadow castShadow />;
}

/** The four sides of an opening's reveal, through the wall's thickness. */
function Reveal({ hole }: { hole: Hole }) {
  const M = useMaterials();
  const [u0, v0, u1, v1] = hole;
  const w = u1 - u0;
  const h = v1 - v0;
  return (
    <group>
      {[
        [u0 - 0.005, (v0 + v1) / 2, 0.01, h],
        [u1 + 0.005, (v0 + v1) / 2, 0.01, h],
      ].map(([x, y, sx, sy], i) => (
        <mesh key={i} position={[x, y, -WALL_T / 2]} receiveShadow>
          <boxGeometry args={[sx, sy, WALL_T]} />
          <primitive object={M.wall} attach="material" />
        </mesh>
      ))}
      {[v0 - 0.005, v1 + 0.005].map((y, i) => (
        <mesh key={i} position={[(u0 + u1) / 2, y, -WALL_T / 2]} receiveShadow>
          <boxGeometry args={[w + 0.02, 0.01, WALL_T]} />
          <primitive object={M.wall} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** What shows through an opening: a soft gradient that follows day and night. */
function Outside({ hole, depth = 0.6, kind = "garden" }: { hole: Hole; depth?: number; kind?: "garden" | "hall" }) {
  const day = useRoom((s) => s.day);
  const [u0, v0, u1, v1] = hole;
  const color = kind === "hall" ? (day ? "#8a7d6c" : "#2a221b") : day ? "#cfe3f0" : "#141c2b";
  return (
    <mesh position={[(u0 + u1) / 2, (v0 + v1) / 2, -WALL_T - depth]} userData={{ outside: true }}>
      <planeGeometry args={[(u1 - u0) * 4, (v1 - v0) * 2]} />
      <meshBasicMaterial color={color} toneMapped={kind === "hall"} />
    </mesh>
  );
}

/** A narrow timber window: frame, glazing bars, glass, a sill, and a linen curtain on a rod that opens and closes. */
function NarrowWindow({ hole, panes, name }: { hole: Hole; panes: number; name: string }) {
  const [u0, v0, u1, v1] = hole;
  const w = u1 - u0;
  const h = v1 - v0;
  const M = useMaterials();
  const closed = useRoom((s) => s.curtains);
  const day = useRoom((s) => s.day);
  const curtain = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!curtain.current) return;
    const target = closed ? 1 : 0.28;
    const s = curtain.current.scale;
    s.x += (target - s.x) * Math.min(1, dt * 6);
    if (Math.abs(target - s.x) > 0.002) state.invalidate();
  });
  const bar = 0.035;
  return (
    <group>
      <Outside hole={hole} />
      {/* Frame */}
      {[
        [u0 + bar / 2, (v0 + v1) / 2, bar, h],
        [u1 - bar / 2, (v0 + v1) / 2, bar, h],
        [(u0 + u1) / 2, v0 + bar / 2, w, bar],
        [(u0 + u1) / 2, v1 - bar / 2, w, bar],
        ...Array.from({ length: panes - 1 }, (_, i) => [(u0 + u1) / 2, v0 + ((i + 1) * h) / panes, w, bar * 0.7]),
      ].map(([x, y, sx, sy], i) => (
        <mesh key={i} position={[x, y, -WALL_T * 0.55]} castShadow>
          <boxGeometry args={[sx, sy, 0.05]} />
          <primitive object={M.door} attach="material" />
        </mesh>
      ))}
      <mesh position={[(u0 + u1) / 2, (v0 + v1) / 2, -WALL_T * 0.55]}>
        <planeGeometry args={[w - bar, h - bar]} />
        <meshStandardMaterial color={day ? "#e8f2ff" : "#202838"} transparent opacity={0.35} roughness={0.05} metalness={0.1} />
      </mesh>
      {/* Sill */}
      <mesh position={[(u0 + u1) / 2, v0 - 0.015, 0.03]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.08, 0.03, 0.08]} />
        <primitive object={M.door} attach="material" />
      </mesh>
      {/* Curtain rod and curtain, gathered toward the near side when open */}
      <mesh position={[(u0 + u1) / 2, v1 + 0.08, 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, w + 0.3, 12]} />
        <meshStandardMaterial color="#2b2522" metalness={0.6} roughness={0.4} />
      </mesh>
      <Hot id="curtains" label={`Tirai ${name}`} hint={closed ? "Klik untuk membuka" : "Klik untuk menutup"} onClick={() => room.set((s) => ({ curtains: !s.curtains }))}>
        <group ref={curtain} position={[u0 - 0.13, 0, 0.08]}>
          <Curtain width={w + 0.26} top={v1 + 0.06} />
        </group>
      </Hot>
    </group>
  );
}

/** A pleated linen curtain hanging from `top` almost to the floor, anchored at its left edge. */
function Curtain({ width, top }: { width: number; top: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, top - 0.05, 48, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setX(i, x + width / 2);
      p.setZ(i, Math.sin(((x + width / 2) / width) * Math.PI * 14) * 0.02);
    }
    g.translate(0, (top - 0.05) / 2 + 0.05, 0);
    g.computeVertexNormals();
    return g;
  }, [width, top]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial map={linen("#efe4d0", 5, [6, 10])} side={THREE.DoubleSide} roughness={1} transparent opacity={0.94} />
    </mesh>
  );
}

/** The door: a five-panel timber leaf with a lever handle and the poster, swinging into the room. */
function Door() {
  const open = useRoom((s) => s.door);
  const leaf = useRef<THREE.Group>(null);
  const M = useMaterials();
  const w = DOOR.x1 - DOOR.x0;
  useFrame((state, dt) => {
    if (!leaf.current) return;
    const target = open ? 1.35 : 0;
    const r = leaf.current.rotation;
    r.y += (target - r.y) * Math.min(1, dt * 4);
    if (Math.abs(target - r.y) > 0.002) state.invalidate();
  });
  const panels = [0.32, 0.72, 1.1, 1.48, 1.86];
  return (
    <group>
      {/* Frame (architrave) */}
      {[
        [DOOR.x0 - 0.035, DOOR.h / 2, 0.07, DOOR.h + 0.07],
        [DOOR.x1 + 0.035, DOOR.h / 2, 0.07, DOOR.h + 0.07],
        [(DOOR.x0 + DOOR.x1) / 2, DOOR.h + 0.035, w + 0.14, 0.07],
      ].map(([x, y, sx, sy], i) => (
        <mesh key={i} position={[x, y, 0.012]} castShadow receiveShadow>
          <boxGeometry args={[sx, sy, 0.025]} />
          <primitive object={M.door} attach="material" />
        </mesh>
      ))}
      <Hot id="door" label="Pintu" hint={open ? "Klik untuk menutup" : "Klik untuk membuka"} onClick={() => room.set((s) => ({ door: !s.door }))}>
        <group ref={leaf} position={[DOOR.hingeX, 0, -0.03]}>
          <mesh position={[-w / 2, DOOR.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.01, DOOR.h - 0.01, 0.04]} />
            <primitive object={M.door} attach="material" />
          </mesh>
          {panels.map((y, i) => (
            <mesh key={i} position={[-w / 2, y, 0.022]} castShadow>
              <boxGeometry args={[w - 0.16, i === 4 ? 0.3 : 0.3, 0.006]} />
              <primitive object={M.door} attach="material" />
            </mesh>
          ))}
          {/* Poster, taped flat on the upper panels */}
          <mesh position={[-w / 2 - 0.02, 1.47, 0.027]}>
            <planeGeometry args={[0.3, 0.42]} />
            <meshStandardMaterial map={poster()} roughness={0.8} />
          </mesh>
          {/* Lever handle and rose */}
          <group position={[-w + 0.07, 1.0, 0.03]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.01, 24]} />
              <meshStandardMaterial color="#2a2522" metalness={0.8} roughness={0.35} />
            </mesh>
            <mesh position={[0.05, 0, 0.03]} castShadow>
              <boxGeometry args={[0.11, 0.018, 0.018]} />
              <meshStandardMaterial color="#2a2522" metalness={0.8} roughness={0.35} />
            </mesh>
          </group>
        </group>
      </Hot>
    </group>
  );
}

/** The slat wall behind the bed: oak slats on a dark backing, with a warm LED cove along the top. */
function SlatWall() {
  const M = useMaterials();
  const pitch = 0.058;
  const count = Math.floor(ROOM.d / pitch);
  const slats = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.BoxGeometry(SLAT_WALL.depth, SLAT_WALL.top, 0.04);
      g.translate(0, SLAT_WALL.top / 2, -HALF + pitch / 2 + i * pitch + (ROOM.d - count * pitch) / 2);
      parts.push(g);
    }
    return mergeGeometries(parts);
  }, [count]);
  return (
    <group position={[SLAT_WALL.x + 0.012 + SLAT_WALL.depth / 2, 0, 0]}>
      <mesh position={[-SLAT_WALL.depth / 2 - 0.004, SLAT_WALL.top / 2, 0]} receiveShadow>
        <boxGeometry args={[0.006, SLAT_WALL.top, ROOM.d]} />
        <meshStandardMaterial color="#2b211a" roughness={0.9} />
      </mesh>
      <mesh geometry={slats} material={M.oak} castShadow receiveShadow />
      <mesh position={[0.01, SLAT_WALL.top + 0.015, 0]}>
        <boxGeometry args={[SLAT_WALL.depth + 0.03, 0.03, ROOM.d]} />
        <primitive object={M.oak} attach="material" />
      </mesh>
    </group>
  );
}

/** The split AC on the east wall, with a louver that opens when it runs and a tiny status light. */
function AirCon() {
  const on = useRoom((s) => s.ac);
  const louver = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    if (!louver.current) return;
    const target = on ? 0.6 : 0;
    louver.current.rotation.x += (target - louver.current.rotation.x) * Math.min(1, dt * 3);
    if (Math.abs(target - louver.current.rotation.x) > 0.002) state.invalidate();
  });
  return (
    <Hot id="ac" label="AC" hint={on ? "Menyala 24 °C · klik untuk mematikan" : "Mati · klik untuk menyalakan"} onClick={() => room.set((s) => ({ ac: !s.ac }))}>
      <group position={[HALF - AC.d / 2, AC.y, AC.z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[AC.w, AC.h, AC.d]} />
          <meshStandardMaterial color="#f2efe8" roughness={0.5} />
        </mesh>
        <mesh position={[0, -AC.h / 2 + 0.06, AC.d / 2 + 0.002]}>
          <planeGeometry args={[AC.w - 0.06, 0.05]} />
          <meshStandardMaterial color="#c9c4ba" roughness={0.6} />
        </mesh>
        <mesh ref={louver} position={[0, -AC.h / 2 + 0.03, AC.d / 2 - 0.02]}>
          <boxGeometry args={[AC.w - 0.08, 0.006, 0.06]} />
          <meshStandardMaterial color="#e6e1d6" roughness={0.5} />
        </mesh>
        <mesh position={[AC.w / 2 - 0.08, -AC.h / 2 + 0.1, AC.d / 2 + 0.003]}>
          <circleGeometry args={[0.006, 12]} />
          <meshBasicMaterial color={on ? "#7dffb0" : "#3a3a3a"} toneMapped={false} />
        </mesh>
      </group>
    </Hot>
  );
}

/** A cornice moulding: a stepped profile run round the ceiling. */
function Cornice() {
  const profile = [
    [0.0, 0.0, 0.02, 0.14],
    [0.02, 0.0, 0.035, 0.08],
    [0.035, 0.0, 0.055, 0.035],
  ];
  return (
    <group>
      {[0, 1, 2, 3].map((side) => (
        <group key={side} rotation={[0, (side * Math.PI) / 2, 0]}>
          {profile.map(([d0, , d1, h], i) => (
            <mesh key={i} position={[0, ROOM.h - h / 2, -HALF + (d0 + d1) / 2]} receiveShadow>
              <boxGeometry args={[ROOM.w, h, d1 - d0]} />
              <meshStandardMaterial color={TRIM} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Skirting board round the floor. */
function Skirting() {
  const { walls: e } = useExplode();
  const M = useMaterials();
  return (
    <group>
      {[0, 1, 2, 3].map((side) => (
        <group key={side} rotation={[0, (side * Math.PI) / 2, 0]}>
          <mesh position={[0, 0.04, -HALF + 0.006 - e]} receiveShadow>
            <boxGeometry args={[ROOM.w, 0.08, 0.012]} />
            <primitive object={M.door} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Shell() {
  const M = useMaterials();
  const { walls: e, ceiling: c } = useExplode();
  const northHoles = useMemo<Hole[]>(
    () => [
      [DOOR.x0, 0, DOOR.x1, DOOR.h],
      [MIRROR_WINDOW.x0, MIRROR_WINDOW.sill, MIRROR_WINDOW.x1, MIRROR_WINDOW.top],
      ...VENTS.xs.map((x): Hole => [x - VENTS.w / 2, VENTS.y0, x + VENTS.w / 2, VENTS.y1]),
    ],
    [],
  );
  const eastHole: Hole = [EAST_WINDOW.z0, EAST_WINDOW.sill, EAST_WINDOW.z1, EAST_WINDOW.top];
  const eastHoles = useMemo<Hole[]>(() => [eastHole], []); // eslint-disable-line react-hooks/exhaustive-deps
  const none = useMemo<Hole[]>(() => [], []);
  return (
    <group>
      {/* Floor and ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <primitive object={M.floor} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h + c, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <primitive object={M.ceiling} attach="material" />
      </mesh>

      {/* North wall: door, mirror window, vents */}
      <group position={[0, 0, -HALF - e]}>
        <WallFace width={ROOM.w} holes={northHoles} />
        {northHoles.map((h, i) => (
          <Reveal key={i} hole={h} />
        ))}
        {VENTS.xs.map((x) => (
          <group key={x}>
            <Outside hole={[x - VENTS.w / 2, VENTS.y0, x + VENTS.w / 2, VENTS.y1]} depth={0.3} />
            <mesh position={[x, (VENTS.y0 + VENTS.y1) / 2, -WALL_T * 0.6]}>
              <planeGeometry args={[VENTS.w, VENTS.y1 - VENTS.y0]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.18} roughness={0.2} />
            </mesh>
          </group>
        ))}
        <NarrowWindow hole={[MIRROR_WINDOW.x0, MIRROR_WINDOW.sill, MIRROR_WINDOW.x1, MIRROR_WINDOW.top]} panes={1} name="jendela kaca" />
        <Outside hole={[DOOR.x0, 0, DOOR.x1, DOOR.h]} kind="hall" depth={1.2} />
        <Door />
      </group>

      {/* East wall: narrow window, AC */}
      <group position={[HALF + e, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <WallFace width={ROOM.d} holes={eastHoles} />
        <Reveal hole={eastHole} />
        <NarrowWindow hole={eastHole} panes={3} name="jendela samping" />
      </group>
      <group position={[e, 0, 0]}>
        <AirCon />
      </group>

      {/* South and west walls */}
      <group name="wall-south" position={[0, 0, HALF + e]} rotation={[0, Math.PI, 0]}>
        <WallFace width={ROOM.w} holes={none} />
      </group>
      <group name="wall-west" position={[-HALF - e, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <WallFace width={ROOM.d} holes={none} />
      </group>
      <group name="wall-west-slats" position={[-e, 0, 0]}>
        <SlatWall />
      </group>
      <group position={[0, c, 0]}>
        <Cornice />
      </group>
      <Skirting />
    </group>
  );
}
