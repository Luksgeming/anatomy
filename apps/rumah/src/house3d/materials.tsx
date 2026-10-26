"use client";
// The house's materials, built from photo-scanned PBR sets and tiled in real metres: warm white render, sandstone
// blocks for the cladding and the street wall, teak for the soffit and screens, oak and walnut inside, mossy cobble
// pavers, lawn, soil, asphalt, concrete, a dark standing-seam roof, black steel, and glass that reflects the sky.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useSurface, type Surface } from "./pbr";

export interface Materials {
  render: THREE.MeshStandardMaterial;
  renderInside: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  teak: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  walnut: THREE.MeshStandardMaterial;
  floorTile: THREE.MeshStandardMaterial;
  floorWood: THREE.MeshStandardMaterial;
  pavers: THREE.MeshStandardMaterial;
  lawn: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  fabric: (color: string) => THREE.MeshStandardMaterial;
  paint: (color: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial;
}

const Ctx = createContext<Materials | null>(null);

function standard(s: Partial<Surface>, params: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.MeshStandardMaterial({ ...s, ...params });
  m.userData.metric = true;
  return m;
}

/** A standing-seam metal roof: dark bronze sheet with a raised seam every 45 cm, as a normal map drawn once. */
function seamNormal() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 8;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgb(128,128,255)";
  g.fillRect(0, 0, 256, 8);
  for (const [x, r] of [[118, 90], [122, 170], [126, 128], [130, 86], [134, 166]] as const) {
    g.fillStyle = `rgb(${r},128,${r === 128 ? 255 : 235})`;
    g.fillRect(x, 0, 4, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 0.45, 1);
  return t;
}

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const render = useSurface("Plaster001", [2.5, 2.5]);
  const renderIn = useSurface("PaintedPlaster017", [2.4, 2.4]);
  const stone = useSurface("Tiles143", [1.6, 1.6]);
  const teak = useSurface("Wood092", [1.2, 1.2]);
  const oak = useSurface("Wood094", [1.2, 1.2]);
  const walnut = useSurface("Wood051", [1, 1]);
  const tile = useSurface("Tiles078", [1.2, 1.2]);
  const floorWood = useSurface("WoodFloor051", [1.6, 1.6]);
  const pavers = useSurface("PavingStones138", [1.6, 1.6]);
  const lawn = useSurface("Grass004", [2.2, 2.2]);
  const soil = useSurface("Ground037", [1.4, 1.4]);
  const asphalt = useSurface("Asphalt031", [3, 3]);
  const concrete = useSurface("Concrete034", [2.5, 2.5]);
  const weave = useSurface("Fabric061", [0.25, 0.25]);
  const value = useMemo<Materials>(() => {
    const fabrics = new Map<string, THREE.MeshStandardMaterial>();
    const paints = new Map<string, THREE.MeshStandardMaterial>();
    return {
      render: standard(render, { color: "#f4f1ea", roughness: 0.92, normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide }),
      renderInside: standard(renderIn, { color: "#efe4d4", roughness: 0.95, normalScale: new THREE.Vector2(0.15, 0.15) }),
      stone: standard(stone, { color: "#e6d6bc", roughness: 0.9, normalScale: new THREE.Vector2(1.2, 1.2) }),
      teak: standard(teak, { color: "#e8b98a", roughness: 0.45 }),
      oak: standard(oak, { color: "#f0d4ad", roughness: 0.6 }),
      walnut: standard(walnut, { color: "#c7a588", roughness: 0.55 }),
      floorTile: standard(tile, { color: "#f3e9da", roughness: 0.5, normalScale: new THREE.Vector2(0.3, 0.3) }),
      floorWood: standard(floorWood, { color: "#e9cfae", roughness: 0.55 }),
      pavers: standard(pavers, { color: "#e3ddd2", roughness: 0.9 }),
      lawn: standard(lawn, { color: "#cfe0a8", roughness: 1 }),
      soil: standard(soil, { color: "#8a6a4e", roughness: 1 }),
      asphalt: standard(asphalt, { color: "#8d8f93", roughness: 0.95 }),
      concrete: standard(concrete, { color: "#e4e1db", roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ color: "#4a3426", roughness: 0.45, metalness: 0.55, normalMap: seamNormal(), side: THREE.DoubleSide }),
      steel: new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.4, metalness: 0.7 }),
      frame: new THREE.MeshStandardMaterial({ color: "#3a2a20", roughness: 0.5, metalness: 0.2 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#a9b8bf", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.38, envMapIntensity: 1.6, side: THREE.DoubleSide }),
      fabric: (color) => {
        if (!fabrics.has(color)) fabrics.set(color, standard(weave, { color, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
        return fabrics.get(color)!;
      },
      paint: (color, roughness = 0.6, metalness = 0) => {
        const key = `${color}-${roughness}-${metalness}`;
        if (!paints.has(key)) paints.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
        return paints.get(key)!;
      },
    };
  }, [render, renderIn, stone, teak, oak, walnut, tile, floorWood, pavers, lawn, soil, asphalt, concrete, weave]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMaterials() {
  const m = useContext(Ctx);
  if (!m) throw new Error("useMaterials outside MaterialsProvider");
  return m;
}
