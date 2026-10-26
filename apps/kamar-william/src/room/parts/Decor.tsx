"use client";
// Soft things that make the room calm: a jute rug, a monstera in a terracotta pot by the desk, and the rattan
// pendant that replaces the bare bulb in the middle of the ceiling.
import { useMemo } from "react";
import * as THREE from "three";
import { PLANT, ROOM, RUG, WARM } from "../layout";
import { useExplode } from "../explode";
import { room, useRoom } from "../store";
import { jute } from "../textures";
import { Hot } from "./Hot";

export const PENDANT_Y = ROOM.h - 0.62;

export function Decor() {
  return (
    <group>
      <mesh position={[(RUG.x0 + RUG.x1) / 2, 0.004, (RUG.z0 + RUG.z1) / 2]} receiveShadow>
        <boxGeometry args={[RUG.x1 - RUG.x0, 0.008, RUG.z1 - RUG.z0]} />
        <meshStandardMaterial map={jute()} roughness={1} />
      </mesh>
      <Monstera />
      <Pendant />
    </group>
  );
}

function Monstera() {
  const leaf = useMemo(() => {
    // A split monstera leaf: a heart shape with slits cut in from the edge.
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.16, 0.02, 0.2, 0.2, 0, 0.3);
    s.bezierCurveTo(-0.2, 0.2, -0.16, 0.02, 0, 0);
    for (const [side, y] of [[1, 0.08], [1, 0.15], [1, 0.22], [-1, 0.1], [-1, 0.18]]) {
      const slit = new THREE.Path();
      slit.moveTo(side * 0.17, y);
      slit.lineTo(side * 0.04, y + 0.015);
      slit.lineTo(side * 0.17, y + 0.03);
      s.holes.push(slit);
    }
    const g = new THREE.ShapeGeometry(s, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.35 + Math.sin(p.getY(i) * 8) * 0.01);
    g.computeVertexNormals();
    return g;
  }, []);
  const stems = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        // Fan the stems out toward the room (north-west), away from the two walls of the corner.
        const a = (3 * Math.PI) / 4 + (i / 8 - 0.5) * 2.3;
        const h = 0.55 + (i % 4) * 0.16;
        const lean = 0.14 + (i % 3) * 0.07;
        return { a, h, lean };
      }),
    [],
  );
  return (
    <Hot id="plant" label="Monstera" hint="Disiram tiap Minggu">
      <group position={[PLANT.x, 0, PLANT.z]}>
        <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.17, 0.13, 0.34, 40]} />
          <meshStandardMaterial color="#b76a45" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.335, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.01, 40]} />
          <meshStandardMaterial color="#3b2a1e" roughness={1} />
        </mesh>
        {stems.map(({ a, h, lean }, i) => (
          <group key={i} position={[0, 0.33, 0]} rotation={[0, a, 0]}>
            <group rotation={[0, 0, -lean]}>
              <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[0.006, 0.008, h, 6]} />
                <meshStandardMaterial color="#4a7a35" roughness={0.7} />
              </mesh>
              <mesh geometry={leaf} position={[0, h, 0]} rotation={[-0.9 + (i % 3) * 0.2, 0, 0]} scale={0.75 + (i % 3) * 0.15} castShadow>
                <meshStandardMaterial color={i % 2 ? "#2f5e2a" : "#3d7032"} roughness={0.55} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </Hot>
  );
}

/** A woven rattan dome on a cord, the bulb glowing through its weave. */
function Pendant() {
  const lit = useRoom((s) => s.lights.pendant);
  const { ceiling } = useExplode();
  const dome = useMemo(() => {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      points.push(new THREE.Vector2(Math.sin(t * Math.PI * 0.5) * 0.24 + 0.012, 0.16 - t * 0.2));
    }
    return new THREE.LatheGeometry(points, 48);
  }, []);
  const weave = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = "#c79a5c";
    g.lineWidth = 5;
    for (let i = -256; i < 512; i += 13) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 256, 256);
      g.stroke();
      g.beginPath();
      g.moveTo(i + 256, 0);
      g.lineTo(i, 256);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 4);
    // No mipmaps: averaged down, the open weave would fall under the alpha test and the shade would vanish at a distance.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <Hot id="pendant" label="Lampu gantung rotan" hint={lit ? "Klik untuk mematikan" : "Klik untuk menyalakan"} onClick={() => room.toggleLight("pendant")}>
      <group position={[0, PENDANT_Y + ceiling, 0]}>
        <mesh position={[0, (ROOM.h - PENDANT_Y) / 2 + 0.08, 0]}>
          <cylinderGeometry args={[0.004, 0.004, ROOM.h - PENDANT_Y - 0.16, 6]} />
          <meshStandardMaterial color="#1c1a18" />
        </mesh>
        <mesh position={[0, ROOM.h - PENDANT_Y - 0.015, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 24]} />
          <meshStandardMaterial color="#efe7da" roughness={0.8} />
        </mesh>
        <mesh geometry={dome} castShadow>
          <meshStandardMaterial map={weave} alphaMap={weave} transparent alphaTest={0.2} side={THREE.DoubleSide} roughness={0.9} emissive={WARM.amber} emissiveMap={weave} emissiveIntensity={lit ? 0.22 : 0} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.045, 20, 14]} />
          <meshBasicMaterial color={lit ? "#ffcf8f" : "#4a3f33"} toneMapped={!lit} />
        </mesh>
      </group>
    </Hot>
  );
}
