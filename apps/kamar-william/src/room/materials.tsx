"use client";
// The room's materials in one place, built from the photo-scanned PBR sets: warm-painted plaster, the beige ceramic
// floor with 60 cm grout joints, light oak, the orange teak of William's wardrobe, dark wood, and woven fabric in any
// colour. Every material is shared and tiled in real metres (see metricUV).
import { createContext, useContext, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useSurface, type Surface } from "./pbr";

export interface Materials {
  wall: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  oakDark: THREE.MeshStandardMaterial;
  teak: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  walnut: THREE.MeshStandardMaterial;
  fabric: (color: string, roughness?: number) => THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  ceramic: (color: string) => THREE.MeshStandardMaterial;
}

const Ctx = createContext<Materials | null>(null);

function standard(s: Partial<Surface>, params: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.MeshStandardMaterial({ ...s, ...params });
  m.userData.metric = true;
  return m;
}

/** The ceramic floor: the tile face from the scan with grout joints drawn every 60 cm (a 1.2 m texture of 2 × 2 tiles). */
function groutTiles(face: THREE.Texture) {
  const img = face.image as HTMLImageElement;
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const half = size / 2;
  // Four tiles, each a different quarter of the scan so the veining does not repeat tile to tile.
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], n) => {
    g.save();
    g.translate(i * half + half / 2, j * half + half / 2);
    g.rotate((n * Math.PI) / 2);
    g.drawImage(img, -half / 2, -half / 2, half, half);
    g.restore();
  });
  g.fillStyle = "#b8a990";
  for (const p of [0, half, size]) {
    g.fillRect(p - 3, 0, 6, size);
    g.fillRect(0, p - 3, size, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 1.2, 1 / 1.2);
  t.anisotropy = 8;
  return t;
}

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const plaster = useSurface("PaintedPlaster017", [2.4, 2.4]);
  const ceilingS = useSurface("Plaster001", [2, 2]);
  const tile = useSurface("Tiles078", [1.2, 1.2]);
  const oakS = useSurface("Wood094", [1.2, 1.2]);
  const teakS = useSurface("Wood092", [0.9, 0.9]);
  const walnutS = useSurface("Wood051", [1, 1]);
  const weave = useSurface("Fabric061", [0.25, 0.25]);
  const value = useMemo<Materials>(() => {
    const fabrics = new Map<string, THREE.MeshStandardMaterial>();
    const ceramics = new Map<string, THREE.MeshStandardMaterial>();
    return {
      wall: standard(plaster, { color: "#ead8bf", roughness: 0.95, normalScale: new THREE.Vector2(0.18, 0.18), side: THREE.DoubleSide }),
      ceiling: standard(ceilingS, { color: "#f4ece0", roughness: 0.95, normalScale: new THREE.Vector2(0.15, 0.15) }),
      floor: standard({ map: groutTiles(tile.map), normalMap: tile.normalMap, roughnessMap: tile.roughnessMap }, { color: "#f3e7d6", roughness: 0.55, normalScale: new THREE.Vector2(0.4, 0.4) }),
      oak: standard(oakS, { color: "#f0d4ad", roughness: 0.62 }),
      oakDark: standard(oakS, { color: "#b98c5c", roughness: 0.6 }),
      teak: standard(teakS, { color: "#dccbb0", roughness: 0.34 }),
      door: standard(teakS, { color: "#a8754a", roughness: 0.5 }),
      walnut: standard(walnutS, { color: "#c7a588", roughness: 0.55 }),
      fabric: (color, roughness = 1) => {
        const key = `${color}-${roughness}`;
        if (!fabrics.has(key)) fabrics.set(key, standard(weave, { color, roughness, normalScale: new THREE.Vector2(0.6, 0.6) }));
        return fabrics.get(key)!;
      },
      steel: new THREE.MeshStandardMaterial({ color: "#1d1d1f", metalness: 0.75, roughness: 0.38 }),
      brass: new THREE.MeshStandardMaterial({ color: "#b08a4a", metalness: 0.9, roughness: 0.28 }),
      leather: new THREE.MeshStandardMaterial({ color: "#1a1a1c", metalness: 0, roughness: 0.55 }),
      ceramic: (color) => {
        if (!ceramics.has(color)) ceramics.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0 }));
        return ceramics.get(color)!;
      },
    };
  }, [plaster, ceilingS, tile, oakS, teakS, walnutS, weave]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMaterials() {
  const m = useContext(Ctx);
  if (!m) throw new Error("useMaterials outside MaterialsProvider");
  return m;
}
