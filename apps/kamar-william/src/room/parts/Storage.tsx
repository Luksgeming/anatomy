"use client";
// The south wall: William's teak wardrobe with its stickers and a woven basket on top, the freestanding steel rack
// with his clothes on wooden hangers above a slatted shoe bench, and the softbox light standing in the corner.
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { BENCH, RAIL, SOFTBOX, WARDROBE } from "../layout";
import { room, useRoom } from "../store";
import { stickers } from "../textures";
import { useMaterials } from "../materials";
import { Hot } from "./Hot";

export function Storage() {
  return (
    <group>
      <Wardrobe />
      <Rail />
      <Bench />
      <Softbox />
    </group>
  );
}

function Wardrobe() {
  const M = useMaterials();
  const { x0, x1, z0, z1, h } = WARDROBE;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const front = z0;
  return (
    <group>
      <RoundedBox args={[w, h, z1 - z0]} radius={0.01} smoothness={3} position={[cx, h / 2, (z0 + z1) / 2]} castShadow receiveShadow>
        <primitive object={M.teak} attach="material" />
      </RoundedBox>
      {/* Door: a frame with a raised panel top and bottom, a brass knob and a latch */}
      {[
        [0.47, 0.62],
        [1.3, 0.78],
      ].map(([y, ph], i) => (
        <mesh key={i} position={[cx, y, front - 0.008]} castShadow>
          <boxGeometry args={[w - 0.16, ph, 0.016]} />
          <primitive object={M.teak} attach="material" />
        </mesh>
      ))}
      <mesh position={[cx, h / 2, front - 0.003]}>
        <boxGeometry args={[0.006, h - 0.06, 0.006]} />
        <meshStandardMaterial color="#6a3a14" />
      </mesh>
      <mesh position={[x0 + 0.06, 0.95, front - 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.03, 16]} />
        <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[cx, 1.24, front - 0.017]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.36, 0.54]} />
        <meshStandardMaterial map={stickers()} transparent roughness={0.6} />
      </mesh>
      {/* A lidded seagrass basket on top instead of the bag and broom */}
      <group position={[cx, h, (z0 + z1) / 2]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.13, 0.2, 40, 6]} />
          <primitive object={M.fabric("#b99766")} attach="material" />
        </mesh>
        <mesh position={[0, 0.215, 0]} castShadow>
          <cylinderGeometry args={[0.155, 0.155, 0.03, 40]} />
          <primitive object={M.fabric("#a6845a")} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

const CLOTHES: { color: string; kind: "coat" | "shirt" | "towel" | "pants" | "hoodie"; long: number }[] = [
  { color: "#151517", kind: "coat", long: 0.82 },
  { color: "#232326", kind: "coat", long: 0.7 },
  { color: "#e8692c", kind: "towel", long: 0.95 },
  { color: "#cbb592", kind: "pants", long: 0.78 },
  { color: "#1f7fd1", kind: "shirt", long: 0.7 },
  { color: "#6b6a4c", kind: "shirt", long: 0.66 },
  { color: "#1c1c22", kind: "hoodie", long: 0.62 },
  { color: "#2a2a30", kind: "hoodie", long: 0.58 },
];

function Rail() {
  const { x0, x1, y, z } = RAIL;
  const step = (x1 - x0 - 0.14) / (CLOTHES.length - 1);
  return (
    <group>
      {/* Pipe and two wall brackets */}
      <mesh position={[(x0 + x1) / 2, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.013, 0.013, x1 - x0 + 0.03, 16]} />
        <meshStandardMaterial color="#1f1f21" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Two uprights on splayed feet carry the bar: the rack stands on its own, clear of the wall */}
      {[x0, x1].map((x) => (
        <group key={x}>
          <mesh position={[x, y / 2, z]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, y, 12]} />
            <meshStandardMaterial color="#1f1f21" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[x, 0.012, z]} castShadow>
            <boxGeometry args={[0.03, 0.024, 0.46]} />
            <meshStandardMaterial color="#1f1f21" metalness={0.7} roughness={0.35} />
          </mesh>
          {[-0.21, 0.21].map((dz) => (
            <mesh key={dz} position={[x, 0.004, z + dz]}>
              <cylinderGeometry args={[0.014, 0.014, 0.008, 12]} />
              <meshStandardMaterial color="#111" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {CLOTHES.map((c, i) => {
        const x = x0 + 0.07 + i * step;
        const width = c.kind === "towel" ? 0.3 : c.kind === "pants" ? 0.34 : 0.44;
        return (
          <group key={i} position={[x, y, z]}>
            {/* Wooden hanger: hook and shoulder bar */}
            <mesh position={[0, -0.025, 0]}>
              <torusGeometry args={[0.018, 0.003, 6, 16, Math.PI * 1.4]} />
              <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.06, 0]} castShadow>
              <boxGeometry args={[0.012, 0.022, width - 0.02]} />
              <meshStandardMaterial color="#b5814b" roughness={0.6} />
            </mesh>
            <Garment kind={c.kind} width={width} long={c.long} color={c.color} seed={20 + i} />
            {c.kind === "hoodie" ? (
              <mesh position={[0.02, -0.12, 0]} castShadow>
                <sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={c.color} roughness={1} side={THREE.DoubleSide} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

/** A garment hanging from its hanger: a shirt or coat with shoulders and sleeves, trousers folded over the bar, or a
 *  towel, as a soft extruded silhouette across the rail. */
function Garment({ kind, width, long, color, seed }: { kind: (typeof CLOTHES)[number]["kind"]; width: number; long: number; color: string; seed: number }) {
  const M = useMaterials();
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    const h = width / 2;
    if (kind === "towel" || kind === "pants") {
      const w = kind === "pants" ? h * 0.9 : h;
      s.moveTo(-w, 0);
      s.lineTo(w, 0);
      s.lineTo(w * 0.96, -long);
      s.lineTo(-w * 0.96, -long);
      s.closePath();
    } else {
      const neck = 0.055;
      const sleeve = kind === "coat" ? 0.82 : kind === "hoodie" ? 0.78 : 0.7;
      s.moveTo(-neck, 0);
      s.lineTo(-h + 0.02, -0.035);
      s.quadraticCurveTo(-h - 0.005, -0.05, -h - 0.012, -0.1);
      s.lineTo(-h - 0.02, -long * sleeve);
      s.lineTo(-h + 0.065, -long * sleeve);
      s.lineTo(-h + 0.075, -0.2);
      s.lineTo(-h + 0.08, -long);
      s.lineTo(h - 0.08, -long);
      s.lineTo(h - 0.075, -0.2);
      s.lineTo(h - 0.065, -long * sleeve);
      s.lineTo(h + 0.02, -long * sleeve);
      s.lineTo(h + 0.012, -0.1);
      s.quadraticCurveTo(h + 0.005, -0.05, h - 0.02, -0.035);
      s.lineTo(neck, 0);
      s.quadraticCurveTo(0, -0.05, -neck, 0);
    }
    const depth = kind === "coat" || kind === "hoodie" ? 0.05 : 0.03;
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    g.rotateY(Math.PI / 2);
    // A soft drape: the hem swings a little and the cloth bows outward toward the bottom.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = Math.min(1, -y / long);
      p.setX(i, p.getX(i) * (1 + t * 0.35) + Math.sin(p.getZ(i) * 18 + seed) * 0.006 * t);
    }
    g.computeVertexNormals();
    return g;
  }, [kind, width, long, seed]);
  return (
    <mesh geometry={geometry} position={[0, -0.06, 0]} castShadow receiveShadow>
      <primitive object={M.fabric(color)} attach="material" />
    </mesh>
  );
}

function Bench() {
  const M = useMaterials();
  const { x0, x1, z0, z1, h } = BENCH;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[cx, h - 0.015, z0 + 0.035 + i * ((z1 - z0 - 0.07) / 4)]} castShadow receiveShadow>
          <boxGeometry args={[x1 - x0, 0.03, 0.05]} />
          <primitive object={M.oak} attach="material" />
        </mesh>
      ))}
      <mesh position={[cx, 0.12, cz]} castShadow receiveShadow>
        <boxGeometry args={[x1 - x0 - 0.04, 0.02, z1 - z0 - 0.04]} />
        <primitive object={M.oak} attach="material" />
      </mesh>
      {[x0 + 0.02, x1 - 0.02].map((x) => (
        <mesh key={x} position={[x, h / 2, cz]} castShadow>
          <boxGeometry args={[0.03, h, z1 - z0]} />
          <primitive object={M.oak} attach="material" />
        </mesh>
      ))}
      {/* Two pairs of shoes on the lower shelf and a folded towel on top */}
      {[
        [x0 + 0.25, "#f2f0ea"],
        [x0 + 0.62, "#2b2b2e"],
      ].map(([x, color]) =>
        [-0.05, 0.05].map((dx) => (
          <RoundedBox key={`${x}${dx}`} args={[0.1, 0.08, 0.27]} radius={0.035} smoothness={3} position={[(x as number) + dx, 0.17, cz]} castShadow>
            <meshStandardMaterial color={color as string} roughness={0.7} />
          </RoundedBox>
        )),
      )}
      <RoundedBox args={[0.3, 0.06, 0.22]} radius={0.025} smoothness={3} position={[x1 - 0.25, h + 0.03, cz]} castShadow>
        <primitive object={M.fabric("#e9dfcf")} attach="material" />
      </RoundedBox>
    </group>
  );
}

/** The softbox on its tripod, turned toward the bed; cool white when switched on. */
function Softbox() {
  const on = useRoom((s) => s.lights.softbox);
  const { x, z } = SOFTBOX;
  return (
    <Hot id="softbox" label="Lampu softbox" hint={on ? "Klik untuk mematikan" : "Klik untuk menyalakan"} onClick={() => room.toggleLight("softbox")}>
      <group position={[x, 0, z]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (i / 3) * Math.PI * 2 + 0.3, 0]}>
            <mesh position={[0.13, 0.32, 0]} rotation={[0, 0, 0.4]} castShadow>
              <cylinderGeometry args={[0.008, 0.008, 0.7, 8]} />
              <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 1.3, 10]} />
          <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.5} />
        </mesh>
        <group position={[0, 1.62, 0]} rotation={[0, SOFTBOX.face, 0]}>
          <RoundedBox args={[0.46, 0.46, 0.05]} radius={0.015} smoothness={3} castShadow>
            <meshStandardMaterial color="#232325" roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0, 0.026]}>
            <planeGeometry args={[0.42, 0.42]} />
            <meshStandardMaterial color="#f4f4f4" emissive="#fff6ea" emissiveIntensity={on ? 3 : 0} toneMapped={!on} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </Hot>
  );
}
