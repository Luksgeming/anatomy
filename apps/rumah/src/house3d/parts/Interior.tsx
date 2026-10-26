"use client";
// The furnished rooms, seen through the glass and when the roof or the upper floor is lifted: living room with an
// L-sofa and TV wall, dining table for six, the clean kitchen with an island, the wet kitchen and the laundry, the
// common bathroom; upstairs the master bedroom and bedroom 2 with their en-suites. At night warm lights glow in every
// room (they are what makes the windows light up from the street).
import { RoundedBox } from "@react-three/drei";
import { BACK_ROW, F1, F2, GF, HOUSE, UF, WALL } from "../layout";
import { useMaterials } from "../materials";
import { useHouse } from "../store";
import { B } from "./kit";

const Z1 = HOUSE.z1 - WALL;
const Z0 = HOUSE.z0 + WALL;

function RoomLight({ x, y, z }: { x: number; y: number; z: number }) {
  const night = useHouse((s) => !s.day && s.lights);
  return night ? <pointLight position={[x, y, z]} color="#ffb874" intensity={6} distance={7} decay={2} /> : null;
}

function Sofa({ x, z, w, d, rot = 0 }: { x: number; z: number; w: number; d: number; rot?: number }) {
  const M = useMaterials();
  return (
    <group position={[x, F1, z]} rotation={[0, rot, 0]}>
      <RoundedBox args={[w, 0.42, d]} radius={0.06} position={[0, 0.21, 0]} material={M.fabric("#d9cfbf")} castShadow receiveShadow />
      <RoundedBox args={[w, 0.45, 0.2]} radius={0.06} position={[0, 0.62, -d / 2 + 0.1]} material={M.fabric("#d9cfbf")} castShadow />
      {[-w / 2 + 0.3, w / 2 - 0.3].map((cx) => (
        <RoundedBox key={cx} args={[0.42, 0.35, 0.14]} radius={0.06} position={[cx, 0.6, -d / 2 + 0.26]} rotation={[-0.25, 0, 0]} material={M.fabric("#9a6a4a")} castShadow />
      ))}
    </group>
  );
}

function Table({ x0, x1, z0, z1, h, top }: { x0: number; x1: number; z0: number; z1: number; h: number; top: "oak" | "walnut" }) {
  const M = useMaterials();
  return (
    <group>
      <B a={[x0, h - 0.04, z0]} b={[x1, h, z1]} m={M[top]} />
      {[
        [x0 + 0.08, z0 + 0.08],
        [x1 - 0.12, z0 + 0.08],
        [x0 + 0.08, z1 - 0.12],
        [x1 - 0.12, z1 - 0.12],
      ].map(([x, z], i) => (
        <B key={i} a={[x, h - 0.74 + (h - 0.74 < F1 ? 0 : 0), z]} b={[x + 0.04, h - 0.04, z + 0.04]} m={M.steel} />
      ))}
    </group>
  );
}

function Chair({ x, z, rot }: { x: number; z: number; rot: number }) {
  const M = useMaterials();
  return (
    <group position={[x, F1, z]} rotation={[0, rot, 0]}>
      <B a={[-0.22, 0.44, -0.22]} b={[0.22, 0.48, 0.22]} m={M.oak} />
      <B a={[-0.22, 0.48, -0.24]} b={[0.22, 0.9, -0.2]} m={M.oak} />
      {[
        [-0.2, -0.2],
        [0.17, -0.2],
        [-0.2, 0.17],
        [0.17, 0.17],
      ].map(([px, pz], i) => (
        <B key={i} a={[px, 0, pz]} b={[px + 0.03, 0.44, pz + 0.03]} m={M.steel} />
      ))}
    </group>
  );
}

function Bed({ x0, x1, z0, z1, y, duvet }: { x0: number; x1: number; z0: number; z1: number; y: number; duvet: string }) {
  const M = useMaterials();
  return (
    <group>
      <B a={[x0, y, z0]} b={[x1, y + 0.3, z1]} m={M.oak} />
      <RoundedBox args={[x1 - x0 - 0.06, 0.24, z1 - z0 - 0.06]} radius={0.05} position={[(x0 + x1) / 2, y + 0.42, (z0 + z1) / 2]} material={M.fabric("#f2ede4")} castShadow receiveShadow />
      <RoundedBox args={[x1 - x0, 0.08, (z1 - z0) * 0.65]} radius={0.03} position={[(x0 + x1) / 2, y + 0.57, z1 - (z1 - z0) * 0.33]} material={M.fabric(duvet)} castShadow />
      <B a={[x0 - 0.02, y, z0 - 0.08]} b={[x1 + 0.02, y + 1.1, z0]} m={M.fabric("#cdbfa9")} />
      {[0.28, 0.72].map((f) => (
        <RoundedBox key={f} args={[(x1 - x0) * 0.38, 0.14, 0.4]} radius={0.06} position={[x0 + (x1 - x0) * f, y + 0.62, z0 + 0.3]} material={M.fabric("#faf6ef")} castShadow />
      ))}
    </group>
  );
}

function Counter({ x0, x1, z0, z1, y }: { x0: number; x1: number; z0: number; z1: number; y: number }) {
  const M = useMaterials();
  return (
    <group>
      <B a={[x0, y, z0]} b={[x1, y + 0.86, z1]} m={M.walnut} />
      <B a={[x0 - 0.02, y + 0.86, z0 - 0.02]} b={[x1 + 0.02, y + 0.9, z1 + 0.02]} m={M.concrete} />
    </group>
  );
}

export function GroundInterior() {
  const M = useMaterials();
  const front = (BACK_ROW + Z1) / 2;
  return (
    <group>
      {/* Living: rug, L-sofa facing the TV wall on the west, coffee table, a tall plant */}
      <B a={[-8.9, F1, -4.6]} b={[-6.1, F1 + 0.01, -2.0]} m={M.fabric("#c8b49a")} cast={false} />
      <Sofa x={-6.6} z={-3.3} w={2.4} d={0.95} rot={Math.PI / 2} />
      <Table x0={-8.2} x1={-7.1} z0={-3.9} z1={-2.7} h={F1 + 0.4} top="walnut" />
      <B a={[-9.33, F1, -4.4]} b={[-9.0, F1 + 0.5, -2.2]} m={M.walnut} />
      <B a={[-9.34, F1 + 0.9, -3.9]} b={[-9.3, F1 + 1.65, -2.7]} m={M.paint("#111214", 0.3)} />
      <RoomLight x={-7.2} y={F2 - 0.7} z={-3.2} />
      {/* Dining: table for six */}
      <Table x0={-4.6} x1={-2.6} z0={front - 0.45} z1={front + 0.45} h={F1 + 0.76} top="oak" />
      {[-4.2, -3.6, -3.0].flatMap((x) => [<Chair key={`${x}a`} x={x} z={front - 0.75} rot={0} />, <Chair key={`${x}b`} x={x} z={front + 0.75} rot={Math.PI} />])}
      <RoomLight x={-3.6} y={F2 - 0.8} z={front} />
      {/* Clean kitchen: run along the back-row wall, fridge, island */}
      <Counter x0={-1.8} x1={1.6} z0={BACK_ROW + 0.06} z1={BACK_ROW + 0.66} y={F1} />
      <B a={[1.65, F1, BACK_ROW + 0.06]} b={[2.3, F1 + 1.9, BACK_ROW + 0.76]} m={M.paint("#d8d8d6", 0.3, 0.6)} />
      <Counter x0={-1.2} x1={0.9} z0={-3.6} z1={-2.7} y={F1} />
      {[-0.8, -0.2, 0.4].map((x) => (
        <B key={x} a={[x - 0.18, F1, -2.5]} b={[x + 0.18, F1 + 0.66, -2.25]} m={M.oak} />
      ))}
      <RoomLight x={0} y={F2 - 0.8} z={-3.3} />
      {/* Wet kitchen and laundry behind */}
      <Counter x0={GF.wet[0] + 0.1} x1={GF.wet[1] - 0.1} z0={Z0} z1={Z0 + 0.6} y={F1} />
      <B a={[GF.laundry[0] + 0.3, F1, Z0]} b={[GF.laundry[0] + 0.9, F1 + 0.85, Z0 + 0.6]} m={M.paint("#f2f2f0", 0.35)} />
      <B a={[GF.laundry[0] + 1.0, F1, Z0]} b={[GF.laundry[0] + 1.6, F1 + 0.85, Z0 + 0.6]} m={M.paint("#f2f2f0", 0.35)} />
      <RoomLight x={-1.5} y={F2 - 0.8} z={-7.3} />
      {/* Common bathroom: WC, basin, glass shower */}
      <B a={[GF.bath[0] + 0.2, F1, Z0]} b={[GF.bath[0] + 0.6, F1 + 0.42, Z0 + 0.65]} m={M.paint("#f6f6f4", 0.2)} />
      <B a={[GF.bath[1] - 1.0, F1 + 2.0, Z0 + 0.95]} b={[GF.bath[1] - 0.02, F1 + 2.02, Z0 + 0.97]} m={M.glass} visible={false} />
      <RoomLight x={-8.5} y={F2 - 0.8} z={-7.2} />
    </group>
  );
}

export function UpperInterior() {
  const M = useMaterials();
  return (
    <group>
      {/* Master bedroom: bed against the partition to bedroom 2, wardrobe, rug */}
      <B a={[-8.4, F2 + 0.015, -4.6]} b={[-5.6, F2 + 0.025, -1.9]} m={M.fabric("#b7a48a")} cast={false} />
      <Bed x0={-7.8} x1={-6.0} z0={-5.4} z1={-3.2} y={F2} duvet="#8fa18a" />
      <B a={[-9.33, F2, -4.9]} b={[-8.75, F2 + 2.2, -2.9]} m={M.oak} />
      <RoomLight x={-6.8} y={EAVE_LIGHT} z={-3.4} />
      {/* Bedroom 2: bed, desk under the window */}
      <Bed x0={-2.6} x1={-0.9} z0={-5.4} z1={-3.3} y={F2} duvet="#a66a48" />
      <Table x0={0.4} x1={2.0} z0={-1.85} z1={-1.25} h={F2 + 0.75} top="oak" />
      <RoomLight x={-1.4} y={EAVE_LIGHT} z={-3.4} />
      {/* En-suites */}
      <B a={[UF.masterBath[0] + 0.2, F2, Z0]} b={[UF.masterBath[0] + 0.6, F2 + 0.42, Z0 + 0.65]} m={M.paint("#f6f6f4", 0.2)} />
      <B a={[UF.bed2Bath[1] - 0.6, F2, Z0]} b={[UF.bed2Bath[1] - 0.2, F2 + 0.42, Z0 + 0.65]} m={M.paint("#f6f6f4", 0.2)} />
      <RoomLight x={-8.5} y={EAVE_LIGHT} z={-7.2} />
      <RoomLight x={1.0} y={EAVE_LIGHT} z={-7.2} />
    </group>
  );
}

const EAVE_LIGHT = F2 + 2.3;
