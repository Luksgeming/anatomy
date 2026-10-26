"use client";
// The sleeping corner: a low oak platform bed that seems to float on a warm LED, an upholstered headboard with a
// cove light behind it, sage linen bedding with a terracotta throw, the nightstand and its lamp, the two prints on
// the slat wall, and the small side table by the clothes rail.
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { BED, HEADBOARD, NIGHTSTAND, SIDE_TABLE, SLAT_WALL, WARM } from "../layout";
import { room, useRoom } from "../store";
import { linen, print } from "../textures";
import { useMaterials } from "../materials";
import { Hot } from "./Hot";

const MATTRESS_TOP = BED.platform + BED.mattress;

/** The material of an LED strip: dark when off, glowing warm when on. */
export function Glow({ on, color = WARM.amber, strength = 2.4 }: { on: boolean; color?: string; strength?: number }) {
  return <meshStandardMaterial color="#2a2018" emissive={color} emissiveIntensity={on ? strength : 0} toneMapped={false} />;
}

export function Bed() {
  const lights = useRoom((s) => s.lights);
  const M = useMaterials();
  const x0 = BED.x0 + 0.03;
  const len = BED.x1 - BED.x0;
  const wid = BED.z1 - BED.z0;
  const cx = (BED.x0 + BED.x1) / 2;
  const mLen = 2.0;
  const mWid = 1.6;
  const mx = x0 + mLen / 2;
  return (
    <group>
      {/* Platform: a recessed dark plinth with the LED strip round it, and the oak frame above */}
      <Hot id="underbed" label="LED kolong kasur" hint={lights.underbed ? "Klik untuk mematikan" : "Klik untuk menyalakan"} onClick={() => room.toggleLight("underbed")}>
        <mesh position={[cx + 0.02, 0.035, 0]} receiveShadow>
          <boxGeometry args={[len - 0.24, 0.07, wid - 0.24]} />
          <meshStandardMaterial color="#1d1712" roughness={0.9} />
        </mesh>
        <mesh position={[cx + 0.02, 0.06, 0]}>
          <boxGeometry args={[len - 0.22, 0.008, wid - 0.22]} />
          <Glow on={lights.underbed} />
        </mesh>
        <RoundedBox args={[len, BED.platform - 0.07, wid]} radius={0.015} smoothness={3} position={[cx, 0.07 + (BED.platform - 0.07) / 2, 0]} castShadow receiveShadow>
          <primitive object={M.oak} attach="material" />
        </RoundedBox>
      </Hot>

      {/* Mattress, duvet folded back, a terracotta throw across the foot, pillows and cushions */}
      <RoundedBox args={[mLen, BED.mattress, mWid]} radius={0.05} smoothness={4} position={[mx, BED.platform + BED.mattress / 2, 0]} castShadow receiveShadow>
        <primitive object={M.fabric("#f3eee5")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.42, 0.07, mWid + 0.1]} radius={0.03} smoothness={4} position={[mx + 0.29, MATTRESS_TOP + 0.03, 0]} castShadow receiveShadow>
        <primitive object={M.fabric("#9fae94")} attach="material" />
      </RoundedBox>
      {/* The duvet's sides hang over the mattress edge */}
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[1.42, 0.2, 0.03]} radius={0.012} smoothness={3} position={[mx + 0.29, MATTRESS_TOP - 0.08, side * (mWid / 2 + 0.04)]} castShadow>
          <primitive object={M.fabric("#9fae94")} attach="material" />
        </RoundedBox>
      ))}
      <mesh position={[mx - 0.43, MATTRESS_TOP + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, mWid + 0.08, 24]} />
        <primitive object={M.fabric("#9fae94")} attach="material" />
      </mesh>
      {/* A knitted throw folded across the foot, its ends falling over both sides */}
      <RoundedBox args={[0.46, 0.022, mWid + 0.14]} radius={0.01} smoothness={3} position={[BED.x1 - 0.34, MATTRESS_TOP + 0.075, 0]} castShadow receiveShadow>
        <primitive object={M.fabric("#a9623f")} attach="material" />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[0.46, 0.24, 0.02]} radius={0.008} smoothness={3} position={[BED.x1 - 0.34, MATTRESS_TOP - 0.04, side * (mWid / 2 + 0.075)]} castShadow>
          <primitive object={M.fabric("#a9623f")} attach="material" />
        </RoundedBox>
      ))}
      {[-0.38, 0.38].map((z) => (
        <RoundedBox key={z} args={[0.34, 0.16, 0.64]} radius={0.07} smoothness={4} position={[x0 + 0.25, MATTRESS_TOP + 0.1, z]} rotation={[0, 0, -0.35]} castShadow>
          <primitive object={M.fabric("#f6f1e8")} attach="material" />
        </RoundedBox>
      ))}
      {[
        [-0.22, "#c27a44"],
        [0.24, "#d9b26a"],
      ].map(([z, color]) => (
        <RoundedBox key={z as number} args={[0.13, 0.36, 0.36]} radius={0.06} smoothness={4} position={[x0 + 0.48, MATTRESS_TOP + 0.2, z as number]} rotation={[0, 0, 0.25]} castShadow>
          <primitive object={M.fabric(color as string)} attach="material" />
        </RoundedBox>
      ))}

      {/* Upholstered headboard, with the cove light along its top edge washing the slats */}
      <Hot id="headboard" label="LED kepala kasur" hint={lights.headboard ? "Klik untuk mematikan" : "Klik untuk menyalakan"} onClick={() => room.toggleLight("headboard")}>
        <RoundedBox
          args={[HEADBOARD.x1 - HEADBOARD.x0, HEADBOARD.y1 - HEADBOARD.y0, HEADBOARD.z1 - HEADBOARD.z0]}
          radius={0.035}
          smoothness={4}
          position={[(HEADBOARD.x0 + HEADBOARD.x1) / 2 + 0.03, (HEADBOARD.y0 + HEADBOARD.y1) / 2, 0]}
          castShadow
          receiveShadow
        >
          <primitive object={M.fabric("#e7dccb")} attach="material" />
        </RoundedBox>
        {/* Channel tufting: vertical seams */}
        {Array.from({ length: 7 }, (_, i) => -0.75 + i * 0.25).map((z) => (
          <mesh key={z} position={[HEADBOARD.x1 + 0.031, (HEADBOARD.y0 + HEADBOARD.y1) / 2, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.004, HEADBOARD.y1 - HEADBOARD.y0 - 0.08]} />
            <meshStandardMaterial color="#b9ab95" roughness={1} />
          </mesh>
        ))}
        <mesh position={[HEADBOARD.x0 + 0.02, HEADBOARD.y1 + 0.004, 0]}>
          <boxGeometry args={[0.012, 0.006, HEADBOARD.z1 - HEADBOARD.z0 - 0.04]} />
          <Glow on={lights.headboard} />
        </mesh>
      </Hot>

      <Nightstand />
      <SideTable />
      {/* Two prints on the slat wall above the headboard */}
      {[-0.42, 0.42].map((z, i) => (
        <group key={z} position={[SLAT_WALL.x + 0.075, 1.62, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.48, 0.025]} />
            <primitive object={M.oak} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.0135]}>
            <planeGeometry args={[0.33, 0.43]} />
            <meshStandardMaterial map={print(i)} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Nightstand() {
  const lit = useRoom((s) => s.lights.bedside);
  const M = useMaterials();
  const { x0, x1, z0, z1, h } = NIGHTSTAND;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return (
    <group>
      <RoundedBox args={[x1 - x0, h - 0.06, z1 - z0]} radius={0.012} smoothness={3} position={[cx, 0.06 + (h - 0.06) / 2, cz]} castShadow receiveShadow>
        <primitive object={M.oak} attach="material" />
      </RoundedBox>
      {[
        [x0 + 0.03, z0 + 0.03],
        [x1 - 0.03, z0 + 0.03],
        [x0 + 0.03, z1 - 0.03],
        [x1 - 0.03, z1 - 0.03],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} castShadow>
          <cylinderGeometry args={[0.012, 0.009, 0.06, 10]} />
          <meshStandardMaterial color="#1e1915" roughness={0.6} />
        </mesh>
      ))}
      {/* Drawer seam and a leather pull on the side facing the bed */}
      <mesh position={[cx, h - 0.15, z1 + 0.001]}>
        <planeGeometry args={[x1 - x0 - 0.04, 0.004]} />
        <meshStandardMaterial color="#6d4524" />
      </mesh>
      <mesh position={[cx, h - 0.1, z1 + 0.006]}>
        <boxGeometry args={[0.07, 0.012, 0.01]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.8} />
      </mesh>
      {/* Lamp: a ceramic base and a linen drum shade lit from inside */}
      <Hot id="bedside" label="Lampu tidur" hint={lit ? "Klik untuk mematikan" : "Klik untuk menyalakan"} onClick={() => room.toggleLight("bedside")}>
        <group position={[cx - 0.04, h, cz - 0.03]}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <sphereGeometry args={[0.085, 32, 20]} />
            <meshStandardMaterial color="#d8c3a3" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
            <meshStandardMaterial color="#8a6a3a" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.16, 32, 1, true]} />
            <meshStandardMaterial map={linen("#efe2c9", 15, [3, 1])} side={THREE.DoubleSide} emissive={WARM.candle} emissiveIntensity={lit ? 0.9 : 0} roughness={1} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.025, 16, 12]} />
            <meshBasicMaterial color={lit ? "#ffd7a0" : "#5a4a3a"} toneMapped={!lit} />
          </mesh>
        </group>
      </Hot>
      {/* A book and a phone */}
      <mesh position={[cx + 0.08, h + 0.015, cz + 0.07]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.03, 0.21]} />
        <meshStandardMaterial color="#3f5a4a" roughness={0.8} />
      </mesh>
      <mesh position={[cx + 0.08, h + 0.035, cz + 0.07]} rotation={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.075, 0.008, 0.155]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.3} metalness={0.3} />
      </mesh>
    </group>
  );
}

function SideTable() {
  const M = useMaterials();
  const { x, z, r, h } = SIDE_TABLE;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h - 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.03, 40]} />
        <primitive object={M.oak} attach="material" />
      </mesh>
      <mesh position={[0, (h - 0.03) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, h - 0.03, 16]} />
        <meshStandardMaterial color="#1e1915" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.02, 32]} />
        <meshStandardMaterial color="#1e1915" roughness={0.5} />
      </mesh>
      {/* Stoneware vase with dried pampas stems */}
      <mesh position={[0.04, h + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.2, 24]} />
        <meshStandardMaterial color="#c9b49a" roughness={0.8} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => i).map((i) => {
        const a = (i / 7) * Math.PI * 2;
        const lean = 0.18 + (i % 3) * 0.06;
        return (
          <group key={i} position={[0.04, h + 0.2, 0]} rotation={[Math.sin(a) * lean, 0, Math.cos(a) * lean]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.4, 5]} />
              <meshStandardMaterial color="#b49a72" roughness={1} />
            </mesh>
            <mesh position={[0, 0.44, 0]} scale={[1, 2.4, 1]}>
              <sphereGeometry args={[0.035, 12, 10]} />
              <meshStandardMaterial color="#e8d8b8" roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
