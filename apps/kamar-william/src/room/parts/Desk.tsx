"use client";
// The work corner on the east wall: an oak desk on black steel legs, the wave desk mat, a laptop whose screen
// glows, the gold-shaded desk lamp, the little green alien figure, the blue round fan, the red cubby box with its
// alarm clock, bottles kept to one end, a floating shelf of books and a trailing plant, and the office chair.
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { CHAIR, DESK, SHELF, WARM } from "../layout";
import { useExplode } from "../explode";
import { room, useRoom } from "../store";
import { screen, waveMat } from "../textures";
import { useMaterials } from "../materials";
import { Hot } from "./Hot";

const TOP = DESK.h;
const STEEL = { color: "#1b1b1d", metalness: 0.6, roughness: 0.45 } as const;

export function Desk() {
  const M = useMaterials();
  const { x0, x1, z0, z1 } = DESK;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return (
    <group>
      <RoundedBox args={[x1 - x0, DESK.top, z1 - z0]} radius={0.008} smoothness={3} position={[cx, TOP - DESK.top / 2, cz]} castShadow receiveShadow>
        <primitive object={M.oak} attach="material" />
      </RoundedBox>
      {/* Steel legs: two frames of square tube joined by a stretcher at the back */}
      {[z0 + 0.04, z1 - 0.04].map((z) => (
        <group key={z}>
          {[x0 + 0.05, x1 - 0.05].map((x) => (
            <mesh key={x} position={[x, (TOP - DESK.top) / 2, z]} castShadow>
              <boxGeometry args={[0.03, TOP - DESK.top, 0.03]} />
              <meshStandardMaterial {...STEEL} />
            </mesh>
          ))}
          <mesh position={[cx, TOP - DESK.top - 0.02, z]}>
            <boxGeometry args={[x1 - x0 - 0.1, 0.03, 0.03]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
        </group>
      ))}
      <mesh position={[x1 - 0.05, 0.25, cz]}>
        <boxGeometry args={[0.02, 0.02, z1 - z0 - 0.08]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>

      {/* Desk mat */}
      <mesh position={[1.13, TOP + 0.002, 0.24]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[0.8, 0.4]} />
        <meshStandardMaterial map={waveMat()} roughness={0.9} />
      </mesh>

      <Laptop />
      <DeskLamp />
      <Figure />
      <Fan />
      <CubbyBox />
      {/* A steel bottle, a tumbler and a clear water bottle, lined up at the north end */}
      <Bottle at={[1.4, -0.5]} height={0.25} radius={0.034} body="#1a1a1a" cap="#2b2b2b" metal />
      <Bottle at={[1.33, -0.55]} height={0.2} radius={0.032} body="#2a3d5a" cap="#151515" metal />
      <Bottle at={[1.43, -0.37]} height={0.27} radius={0.038} body="#dfeef5" cap="#2a6fb0" clear />
      {/* Pen cup and a notebook */}
      <mesh position={[1.0, TOP + 0.05, -0.42]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 20, 1, true]} />
        <meshStandardMaterial color="#b8643f" side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.0 + (i - 1) * 0.008, TOP + 0.12, -0.42 + (i - 1) * 0.01]} rotation={[0.1 * (i - 1), 0, 0.12 * (i - 1)]}>
          <cylinderGeometry args={[0.004, 0.004, 0.14, 6]} />
          <meshStandardMaterial color={["#1e1e1e", "#c8a46a", "#2f3e5c"][i]} />
        </mesh>
      ))}
      <mesh position={[1.02, TOP + 0.008, -0.2]} rotation={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.16, 0.014, 0.22]} />
        <meshStandardMaterial color="#d8cfbd" roughness={0.9} />
      </mesh>

      <ShelfOnWall />
      <Chair />
    </group>
  );
}

/** A bottle turned from a profile: base, straight body, rounded shoulder, neck and a screw cap. */
function Bottle({ at, height, radius, body, cap, metal = false, clear = false }: { at: [number, number]; height: number; radius: number; body: string; cap: string; metal?: boolean; clear?: boolean }) {
  const geometry = useMemo(() => {
    const r = radius;
    const h = height * 0.86;
    const pts = [
      [0, 0], [r * 0.92, 0], [r, r * 0.12], [r, h * 0.78], [r * 0.95, h * 0.86], [r * 0.6, h * 0.95], [r * 0.45, h], [r * 0.45, h + 0.004], [0, h + 0.004],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 32);
  }, [radius, height]);
  return (
    <group position={[at[0], TOP, at[1]]}>
      <mesh geometry={geometry} castShadow>
        {clear ? (
          <meshPhysicalMaterial color={body} roughness={0.05} transmission={0.95} thickness={0.01} ior={1.45} transparent />
        ) : (
          <meshStandardMaterial color={body} roughness={metal ? 0.3 : 0.5} metalness={metal ? 0.8 : 0} />
        )}
      </mesh>
      <mesh position={[0, height * 0.86 + 0.02, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.5, radius * 0.5, 0.035, 24]} />
        <meshStandardMaterial color={cap} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Laptop() {
  const on = useRoom((s) => s.lights.screen);
  const hinge: [number, number, number] = [1.22, TOP + 0.016, 0.24];
  return (
    <Hot id="laptop" label="Laptop" hint={on ? "Klik untuk mematikan layar" : "Klik untuk menyalakan layar"} onClick={() => room.toggleLight("screen")}>
      <mesh position={[1.11, TOP + 0.008, 0.24]} castShadow>
        <boxGeometry args={[0.22, 0.016, 0.31]} />
        <meshStandardMaterial color="#26282c" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[1.1, TOP + 0.0165, 0.24]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[0.27, 0.11]} />
        <meshStandardMaterial color="#111214" roughness={0.6} />
      </mesh>
      <group position={hinge} rotation={[0, 0, -0.22]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.008, 0.2, 0.31]} />
          <meshStandardMaterial color="#26282c" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[-0.0045, 0.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.29, 0.18]} />
          <meshBasicMaterial map={screen()} color={on ? "#ffffff" : "#080808"} toneMapped={false} />
        </mesh>
      </group>
    </Hot>
  );
}

function DeskLamp() {
  const lit = useRoom((s) => s.lights.desk);
  const [x, z] = [1.33, 0.8];
  const shade = useMemo(() => new THREE.CylinderGeometry(0.075, 0.16, 0.17, 40, 1, true), []);
  return (
    <Hot id="desk" label="Lampu meja" hint={lit ? "Klik untuk mematikan" : "Klik untuk menyalakan"} onClick={() => room.toggleLight("desk")}>
      <group position={[x, TOP, z]}>
        <RoundedBox args={[0.12, 0.06, 0.12]} radius={0.008} smoothness={3} position={[0, 0.03, 0]} castShadow>
          <meshStandardMaterial color="#2a1f17" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.38, 10]} />
          <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh geometry={shade} position={[0, 0.42, 0]} castShadow>
          <meshStandardMaterial color="#b9965a" metalness={0.75} roughness={0.35} side={THREE.FrontSide} />
        </mesh>
        <mesh geometry={shade} position={[0, 0.42, 0]}>
          <meshStandardMaterial color="#f3dcae" emissive={WARM.candle} emissiveIntensity={lit ? 1.4 : 0} side={THREE.BackSide} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <sphereGeometry args={[0.028, 16, 12]} />
          <meshBasicMaterial color={lit ? "#ffdcaa" : "#4a3f33"} toneMapped={!lit} />
        </mesh>
      </group>
    </Hot>
  );
}

/** A small green alien in a brown robe, big ears out to the sides, facing the chair. */
function Figure() {
  return (
    <Hot id="figure" label="Figur alien hijau" hint="Koleksi William">
      <group position={[1.32, TOP, 0.56]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <coneGeometry args={[0.045, 0.1, 20]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.125, 0]} castShadow>
          <sphereGeometry args={[0.036, 24, 16]} />
          <meshStandardMaterial color="#8fae6a" roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.13, s * 0.055]} rotation={[s * -1.25, 0, 0]} scale={[0.35, 1, 1]} castShadow>
            <coneGeometry args={[0.022, 0.07, 16]} />
            <meshStandardMaterial color="#8fae6a" roughness={0.6} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.031, 0.13, s * 0.014]}>
            <sphereGeometry args={[0.009, 12, 8]} />
            <meshStandardMaterial color="#111" roughness={0.2} />
          </mesh>
        ))}
      </group>
    </Hot>
  );
}

/** A blue round desk fan: a slim housing ring, front and back wire guards, three pitched blades on a hub, the
 *  motor pod behind, and a weighted round base, turned toward the chair. */
function Fan() {
  const blue = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f7fc8", roughness: 0.35, metalness: 0 }), []);
  const wire = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e9eef2", roughness: 0.3, metalness: 0.7 }), []);
  const blade = useMemo(() => new THREE.MeshStandardMaterial({ color: "#cfe2f3", roughness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), []);
  const R0 = 0.082;
  return (
    <Hot id="fan" label="Kipas meja biru" hint="Kipas kecil di meja">
      <group position={[1.3, TOP, -0.22]} rotation={[0, -Math.PI / 2 + 0.25, 0]}>
        <mesh position={[0, 0.012, 0]} material={blue} castShadow>
          <cylinderGeometry args={[0.065, 0.072, 0.024, 40]} />
        </mesh>
        <mesh position={[0, 0.06, -0.01]} material={blue} castShadow>
          <cylinderGeometry args={[0.011, 0.014, 0.08, 16]} />
        </mesh>
        <group position={[0, 0.165, 0]} rotation={[-0.08, 0, 0]}>
          <mesh material={blue} castShadow>
            <torusGeometry args={[R0, 0.009, 14, 64]} />
          </mesh>
          {/* Wire guards: rings and spokes, front and back */}
          {[0.012, -0.012].map((z) => (
            <group key={z} position={[0, 0, z]}>
              {[0.028, 0.052, 0.074].map((r) => (
                <mesh key={r} material={wire}>
                  <torusGeometry args={[r, 0.0011, 6, 48]} />
                </mesh>
              ))}
              {Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2).map((a) => (
                <mesh key={a} material={wire} position={[Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0]} rotation={[0, 0, a + Math.PI / 2]}>
                  <cylinderGeometry args={[0.0011, 0.0011, 0.07, 4]} />
                </mesh>
              ))}
            </group>
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={blade} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
              <circleGeometry args={[0.062, 20, -0.42, 0.84]} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.004]} material={blue}>
            <cylinderGeometry args={[0.014, 0.014, 0.02, 20]} />
          </mesh>
          <mesh position={[0, 0, -0.035]} rotation={[Math.PI / 2, 0, 0]} material={blue} castShadow>
            <cylinderGeometry args={[0.028, 0.034, 0.045, 28]} />
          </mesh>
        </group>
      </group>
    </Hot>
  );
}

/** The cherry-red cubby box with a twin-bell alarm clock on top. */
function CubbyBox() {
  return (
    <group position={[1.38, TOP, 0.1]}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.2, 0.17]} />
        <meshStandardMaterial color="#9e2a22" roughness={0.45} />
      </mesh>
      {[
        [0.055, -0.04],
        [0.055, 0.04],
        [0.145, -0.04],
        [0.145, 0.04],
      ].map(([y, z], i) => (
        <mesh key={i} position={[-0.071, y, z]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.065, 0.075]} />
          <meshStandardMaterial color="#3a0f0c" roughness={0.9} />
        </mesh>
      ))}
      <group position={[0, 0.245, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 28]} />
          <meshStandardMaterial color="#d6332a" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[-0.016, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.033, 28]} />
          <meshStandardMaterial color="#f6f1e6" roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.045, s * 0.025]} castShadow>
            <sphereGeometry args={[0.017, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#d6332a" roughness={0.35} metalness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ShelfOnWall() {
  const { walls } = useExplode();
  return (
    <group position={[walls, 0, 0]}>
      <Shelf />
    </group>
  );
}

function Shelf() {
  const M = useMaterials();
  const { x0, x1, z0, z1, y } = SHELF;
  const books = useMemo(() => {
    const out: { z: number; w: number; h: number; color: string; lean: number }[] = [];
    const colors = ["#7b4b3a", "#3f5a4a", "#c8a46a", "#2f3e5c", "#a65a3a", "#d8cfbd", "#5b4e7a", "#8a8f5a"];
    let z = z0 + 0.04;
    let i = 0;
    while (z < z0 + 0.55) {
      const w = 0.025 + ((i * 37) % 10) / 400;
      out.push({ z: z + w / 2, w, h: 0.17 + ((i * 53) % 7) / 100, color: colors[i % colors.length], lean: 0 });
      z += w + 0.002;
      i++;
    }
    out.push({ z: z + 0.06, w: 0.03, h: 0.2, color: "#2f3e5c", lean: 0.35 });
    return out;
  }, [z0]);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[x1 - x0, 0.03, z1 - z0]} />
        <primitive object={M.oak} attach="material" />
      </mesh>
      {books.map((b, i) => (
        <mesh key={i} position={[(x0 + x1) / 2 + 0.01, y + 0.015 + (b.h / 2) * Math.cos(b.lean), b.z + Math.sin(b.lean) * b.h * 0.4]} rotation={[b.lean, 0, 0]} castShadow>
          <boxGeometry args={[0.15, b.h, b.w]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
      {/* A small speaker and a trailing pothos */}
      <RoundedBox args={[0.1, 0.13, 0.1]} radius={0.015} position={[1.39, y + 0.08, z1 - 0.08]} castShadow>
        <meshStandardMaterial color="#3a3530" roughness={0.9} />
      </RoundedBox>
      <group position={[1.39, y + 0.015, z1 - 0.28]}>
        <mesh position={[0, 0.055, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.045, 0.11, 24]} />
          <meshStandardMaterial color="#e9e1d3" roughness={0.6} />
        </mesh>
        <Vines />
      </group>
    </group>
  );
}

/** Pothos: heart-shaped leaves on strands spilling over the shelf edge toward the room. */
function Vines() {
  const leaf = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.03, 0.01, 0.035, 0.045, 0, 0.06);
    s.bezierCurveTo(-0.035, 0.045, -0.03, 0.01, 0, 0);
    return new THREE.ShapeGeometry(s);
  }, []);
  const leaves = useMemo(() => {
    const out: { p: [number, number, number]; r: [number, number, number] }[] = [];
    for (let strand = 0; strand < 5; strand++) {
      const z = (strand - 2) * 0.03;
      const drop = 0.25 + (strand % 3) * 0.18;
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = -0.02 - Math.min(t * 3, 1) * 0.12 - strand * 0.004;
        const y = 0.12 - (t < 0.3 ? 0 : (t - 0.3) * drop * 1.6);
        out.push({ p: [x, y, z + Math.sin(i + strand) * 0.02], r: [Math.sin(i * 2 + strand) * 0.6, -Math.PI / 2 + Math.cos(i) * 0.5, Math.PI + Math.sin(i) * 0.4] });
      }
    }
    return out;
  }, []);
  return (
    <group>
      {leaves.map((l, i) => (
        <mesh key={i} geometry={leaf} position={l.p} rotation={l.r} castShadow>
          <meshStandardMaterial color={i % 3 ? "#4f7a3a" : "#6d9a4c"} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** A black mesh office chair facing the desk. */
function Chair() {
  const { x, z, seat } = CHAIR;
  return (
    <group position={[x, 0, z]} rotation={[0, -0.12, 0]}>
      {Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2).map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[0.15, 0.06, 0]} castShadow>
            <boxGeometry args={[0.3, 0.025, 0.035]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
          <mesh position={[0.29, 0.025, 0]}>
            <sphereGeometry args={[0.025, 12, 10]} />
            <meshStandardMaterial color="#111" roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 0.4, 16]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <RoundedBox args={[0.48, 0.08, 0.47]} radius={0.03} smoothness={4} position={[0, seat, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#202024" roughness={0.85} />
      </RoundedBox>
      <group position={[-0.24, seat + 0.36, 0]} rotation={[0, 0, -0.12]}>
        <RoundedBox args={[0.06, 0.56, 0.45]} radius={0.025} smoothness={4} castShadow>
          <meshStandardMaterial color="#1b1b1e" roughness={0.8} />
        </RoundedBox>
      </group>
      <mesh position={[-0.22, seat + 0.12, 0]} castShadow>
        <boxGeometry args={[0.04, 0.24, 0.05]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, seat + 0.13, s * 0.25]} castShadow>
            <boxGeometry args={[0.03, 0.2, 0.03]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
          <RoundedBox args={[0.24, 0.03, 0.06]} radius={0.01} position={[0.02, seat + 0.24, s * 0.25]} castShadow>
            <meshStandardMaterial color="#202024" roughness={0.7} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}
