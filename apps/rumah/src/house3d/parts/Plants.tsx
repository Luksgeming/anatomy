"use client";
// Tropical planting built from leaf cards: every leaf is a bent, double-sided plane carrying a hand-drawn, alpha-cut
// texture (palm leaflets, a torn banana blade, clusters of small leaves), so the plants have real silhouettes and
// light passing between the leaves instead of solid blobs. Coconut palms, bananas, frangipani, shrubs and hedges.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const cache = new Map<string, THREE.Texture>();
function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  if (cache.has(key)) return cache.get(key)!;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A palm frond: a rib along u with narrow leaflets angled out to both sides, longest in the middle. */
const frondTexture = () =>
  canvasTexture("frond", 1024, 256, (g) => {
    const r = rand(3);
    g.clearRect(0, 0, 1024, 256);
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const x = 40 + t * 960;
      const len = 120 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) + 10;
      for (const side of [-1, 1]) {
        const ang = side * (0.55 + r() * 0.15);
        const ex = x + Math.cos(ang) * len * 0.9;
        const ey = 128 + Math.sin(ang) * len;
        const grad = g.createLinearGradient(x, 128, ex, ey);
        grad.addColorStop(0, `hsl(${92 + r() * 10}, ${45 + r() * 10}%, ${24 + r() * 6}%)`);
        grad.addColorStop(1, `hsl(${80 + r() * 14}, ${50 + r() * 10}%, ${36 + r() * 10}%)`);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(x - 3, 128);
        g.quadraticCurveTo((x + ex) / 2 + side * 6, (128 + ey) / 2, ex, ey);
        g.quadraticCurveTo((x + ex) / 2 - side * 2, (128 + ey) / 2, x + 4, 128);
        g.fill();
      }
    }
    g.strokeStyle = "#6b6a3a";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 128);
    g.lineTo(1024, 128);
    g.stroke();
  });

/** A banana blade: a long oval with a pale midrib, side veins and a few tears in the edge. */
const bananaTexture = () =>
  canvasTexture("banana", 1024, 384, (g) => {
    const r = rand(7);
    g.clearRect(0, 0, 1024, 384);
    const grad = g.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, "#3f7a2c");
    grad.addColorStop(0.5, "#5f9c3c");
    grad.addColorStop(1, "#3c7429");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(10, 192);
    g.bezierCurveTo(200, 10, 820, 20, 1014, 192);
    g.bezierCurveTo(820, 364, 200, 374, 10, 192);
    g.fill();
    g.strokeStyle = "rgba(220,235,170,0.5)";
    for (let x = 60; x < 980; x += 9) {
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, 192);
      g.lineTo(x + 40, 40 + r() * 10);
      g.moveTo(x, 192);
      g.lineTo(x + 40, 344 - r() * 10);
      g.stroke();
    }
    g.strokeStyle = "#cfe0a0";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(0, 192);
    g.lineTo(1024, 192);
    g.stroke();
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 9; i++) {
      const x = 150 + r() * 750;
      const top = r() > 0.5;
      g.fillRect(x, top ? 0 : 192 + 20 + r() * 40, 3 + r() * 3, top ? 172 - r() * 40 : 192);
    }
    g.globalCompositeOperation = "source-over";
  });

/** A spray of small glossy leaves on transparency: the card for shrubs, hedges and fruit-tree crowns. */
const clusterTexture = (hue: number, key: string) =>
  canvasTexture(`cluster-${key}`, 256, 256, (g) => {
    const r = rand(hue * 13 + 5);
    g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 46; i++) {
      const x = 128 + (r() - 0.5) * 190;
      const y = 128 + (r() - 0.5) * 190;
      if (Math.hypot(x - 128, y - 128) > 105) continue;
      const a = r() * Math.PI * 2;
      const l = 22 + r() * 22;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = `hsl(${hue + r() * 14 - 7}, ${42 + r() * 18}%, ${20 + r() * 20}%)`;
      g.beginPath();
      g.ellipse(0, 0, l, l * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(255,255,220,0.18)";
      g.beginPath();
      g.moveTo(-l, 0);
      g.lineTo(l, 0);
      g.stroke();
      g.restore();
    }
  });

const leafMat = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.55, metalness: 0 });
const barkMat = new THREE.MeshStandardMaterial({ color: "#8a7a66", roughness: 0.95 });

/** A frond plane `len` long, arching down along its length and folded slightly at the rib. */
function frondGeometry(len: number, width: number, droop: number) {
  const g = new THREE.PlaneGeometry(len, width, 20, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + len / 2;
    const t = x / len;
    p.setX(i, x);
    p.setZ(i, Math.abs(p.getY(i)) * 0.35);
    p.setY(i, p.getY(i));
    p.setZ(i, p.getZ(i) - droop * t * t * len);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export function CoconutPalm({ x, z, height = 7, lean = 0.12, seed = 1 }: { x: number; z: number; height?: number; lean?: number; seed?: number }) {
  const parts = useMemo(() => {
    const r = rand(seed);
    const dir = r() * Math.PI * 2;
    const top = new THREE.Vector3(Math.cos(dir) * lean * height, height, Math.sin(dir) * lean * height);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(top.x * 0.2, height * 0.55, top.z * 0.2), top);
    const trunk = new THREE.TubeGeometry(curve, 24, 0.16, 10, false);
    // Taper: thicker at the base.
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const t = v.y / height;
      const c = curve.getPoint(Math.min(1, Math.max(0, t)));
      const k = 1.25 - t * 0.45;
      p.setXYZ(i, c.x + (v.x - c.x) * k, v.y, c.z + (v.z - c.z) * k);
    }
    trunk.computeVertexNormals();
    const fronds: THREE.BufferGeometry[] = [];
    const n = 15;
    for (let i = 0; i < n; i++) {
      const g = frondGeometry(2.9 + r() * 0.6, 0.95, 0.22 + r() * 0.12);
      const up = i < 4 ? 0.5 - r() * 0.3 : -0.05 - r() * 0.35;
      g.rotateZ(up);
      g.rotateY((i / n) * Math.PI * 2 + r() * 0.3);
      g.translate(top.x, top.y, top.z);
      fronds.push(g);
    }
    return { trunk, fronds: mergeGeometries(fronds), top };
  }, [height, lean, seed]);
  const frondMat = useMemo(() => leafMat(frondTexture()), []);
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={parts.trunk} material={barkMat} castShadow receiveShadow />
      <mesh geometry={parts.fronds} material={frondMat} castShadow />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[parts.top.x + Math.cos(i * 1.6) * 0.18, parts.top.y - 0.25, parts.top.z + Math.sin(i * 1.6) * 0.18]} castShadow>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial color="#6d6a2a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function Banana({ x, z, scale = 1, seed = 2 }: { x: number; z: number; scale?: number; seed?: number }) {
  const leaves = useMemo(() => {
    const r = rand(seed);
    const list: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const g = frondGeometry(1.7 + r() * 0.5, 0.6, 0.18 + r() * 0.15);
      g.rotateZ(0.7 - r() * 0.5);
      g.rotateY((i / 7) * Math.PI * 2 + r());
      g.translate(0, 2.2 + r() * 0.3, 0);
      list.push(g);
    }
    return mergeGeometries(list);
  }, [seed]);
  const mat = useMemo(() => leafMat(bananaTexture()), []);
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 2.3, 12]} />
        <meshStandardMaterial color="#7d8f4a" roughness={0.8} />
      </mesh>
      <mesh geometry={leaves} material={mat} castShadow />
    </group>
  );
}

/** A bush of leaf cards packed into an ellipsoid. `hue` shifts the green; `dots` adds flowers or fruit. */
export function Shrub({ x, z, y = 0, r = 0.6, h = 0.9, hue = 95, seed = 4, dots, cards = 26 }: { x: number; z: number; y?: number; r?: number; h?: number; hue?: number; seed?: number; dots?: { color: string; count: number; size?: number }; cards?: number }) {
  const geo = useMemo(() => {
    const rr = rand(seed);
    const list: THREE.BufferGeometry[] = [];
    for (let i = 0; i < cards; i++) {
      const g = new THREE.PlaneGeometry(r * 0.95, r * 0.95);
      g.rotateX(rr() * Math.PI);
      g.rotateY(rr() * Math.PI * 2);
      const a = rr() * Math.PI * 2;
      const d = Math.sqrt(rr()) * r * 0.62;
      g.translate(Math.cos(a) * d, h * (0.25 + rr() * 0.6), Math.sin(a) * d);
      list.push(g);
    }
    return mergeGeometries(list);
  }, [r, h, seed, cards]);
  const mat = useMemo(() => leafMat(clusterTexture(hue, String(hue))), [hue]);
  const blooms = useMemo(() => {
    if (!dots) return [];
    const rr = rand(seed + 99);
    return Array.from({ length: dots.count }, () => {
      const a = rr() * Math.PI * 2;
      const d = (0.4 + rr() * 0.5) * r * 0.75;
      return [Math.cos(a) * d, h * (0.45 + rr() * 0.5), Math.sin(a) * d] as [number, number, number];
    });
  }, [dots, r, h, seed]);
  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {blooms.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[dots!.size ?? 0.035, 8, 6]} />
          <meshStandardMaterial color={dots!.color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** A clipped hedge: shrub cards along a line, as in the street-wall planter or along the house front. */
export function Hedge({ from, to, y = 0, h = 0.6, depth = 0.45, seed = 9 }: { from: [number, number]; to: [number, number]; y?: number; h?: number; depth?: number; seed?: number }) {
  const n = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.45));
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        return <Shrub key={i} x={from[0] + (to[0] - from[0]) * t} z={from[1] + (to[1] - from[1]) * t} y={y} r={depth} h={h} hue={98} seed={seed + i} cards={14} />;
      })}
    </group>
  );
}

/** Frangipani: a few forked grey branches with leaf rosettes and white flowers at their tips. */
export function Frangipani({ x, z, seed = 5 }: { x: number; z: number; seed?: number }) {
  const tips = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + r() * 0.4;
      return [Math.cos(a) * (0.6 + r() * 0.4), 2.0 + r() * 0.6, Math.sin(a) * (0.6 + r() * 0.4)] as [number, number, number];
    });
  }, [seed]);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 1.2, 10]} />
        <meshStandardMaterial color="#9a958a" roughness={0.9} />
      </mesh>
      {tips.map((t, i) => {
        const v = new THREE.Vector3(t[0], t[1] - 1.2, t[2]);
        const len = v.length();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
        return (
          <group key={i}>
            <mesh position={[t[0] / 2, 1.2 + (t[1] - 1.2) / 2, t[2] / 2]} quaternion={q} castShadow>
              <cylinderGeometry args={[0.035, 0.05, len, 8]} />
              <meshStandardMaterial color="#9a958a" roughness={0.9} />
            </mesh>
            <Shrub x={t[0]} z={t[2]} y={t[1] - 0.25} r={0.42} h={0.45} hue={100} seed={seed * 10 + i} cards={9} dots={{ color: "#fbf6e8", count: 5, size: 0.04 }} />
          </group>
        );
      })}
    </group>
  );
}
