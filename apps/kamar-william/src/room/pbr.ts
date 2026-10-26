"use client";
// Real surface materials: CC0 photo-scanned PBR sets from ambientCG (colour, normal, roughness and, where there is
// one, ambient occlusion), fetched by scripts/fetch-textures.mjs into public/textures/<id>/. Each set loads once;
// every use gets its own clones so it can tile at its own real-world size.
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/** Which maps each set has (AO only where ambientCG ships one). */
const SETS = {
  PaintedPlaster017: ["color", "normal", "roughness"],
  Plaster001: ["color", "normal", "roughness"],
  Tiles078: ["color", "normal", "roughness"],
  Wood051: ["color", "normal", "roughness"],
  Wood092: ["color", "normal", "roughness"],
  Wood094: ["color", "normal", "roughness"],
  Fabric061: ["color", "normal", "roughness", "ao"],
} as const;
export type SetId = keyof typeof SETS;

export interface Surface {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap?: THREE.Texture;
}

/**
 * The textures of one set, tiled so one texture covers `size` metres (u, v), optionally rotated a quarter turn
 * (wood grain running the other way). Spread the result into a meshStandardMaterial.
 */
export function useSurface(id: SetId, size: [number, number] = [1, 1], { rotate = false, offset = [0, 0] as [number, number] } = {}): Surface {
  const maps = SETS[id];
  const urls = maps.map((m) => `/textures/${id}/${m}.jpg`);
  const loaded = useLoader(THREE.TextureLoader, urls);
  return useMemo(() => {
    const out: Partial<Surface> = {};
    maps.forEach((m, i) => {
      const t = loaded[i].clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1 / size[0], 1 / size[1]);
      t.offset.set(offset[0], offset[1]);
      if (rotate) {
        t.center.set(0.5, 0.5);
        t.rotation = Math.PI / 2;
      }
      t.anisotropy = 8;
      t.colorSpace = m === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
      const key = m === "color" ? "map" : m === "normal" ? "normalMap" : m === "roughness" ? "roughnessMap" : "aoMap";
      out[key] = t;
    });
    return out as Surface;
  }, [loaded, maps, size[0], size[1], rotate, offset[0], offset[1]]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Box-projects a geometry's UVs in metres: each face takes the two axes it lies along, so a texture tiled with
 * `useSurface(id, size)` has the same real-world scale on every face of every part, whatever its size.
 */
export function metricUV(geometry: THREE.BufferGeometry, scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)) {
  if (geometry.userData.metricUV) return geometry;
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  if (!pos || !nor) return geometry;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * scale.x;
    const y = pos.getY(i) * scale.y;
    const z = pos.getZ(i) * scale.z;
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    if (ax >= ay && ax >= az) [uv[i * 2], uv[i * 2 + 1]] = [z, y];
    else if (ay >= az) [uv[i * 2], uv[i * 2 + 1]] = [x, z];
    else [uv[i * 2], uv[i * 2 + 1]] = [x, y];
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.userData.metricUV = true;
  return geometry;
}

/** Applies metricUV once to every mesh under `root` whose material carries a tiled surface. */
export function metricUVAll(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.geometry.userData.metricUV || mesh.userData.keepUV) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat?.map?.image || !mat.userData?.metric) return;
    if (mesh.geometry.userData.shared) mesh.geometry = mesh.geometry.clone();
    metricUV(mesh.geometry, new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld));
  });
}
