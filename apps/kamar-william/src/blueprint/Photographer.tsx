"use client";
// Photographs the 3D room for the blueprint sheets: section plan and four interior section elevations drawn as white
// lines on blueprint blue (orthographic, cut by a clipping plane), the exploded room, four corner views and eight
// close-ups in full colour. Each shot is rendered once, read off the canvas and sent to /api/blueprint with the
// numbers the sheet needs to draw dimensions over it.
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { ExplodeContext, type Explode } from "../room/explode";
import { Lights } from "../room/Lights";
import { MaterialsProvider } from "../room/materials";
import { Bed } from "../room/parts/Bed";
import { Decor } from "../room/parts/Decor";
import { Desk } from "../room/parts/Desk";
import { Shell } from "../room/parts/Shell";
import { Storage } from "../room/parts/Storage";
import { metricUVAll } from "../room/pbr";
import { room } from "../room/store";
import { SHOTS, type Shot } from "./shots";

RectAreaLightUniformsLib.init();

const BLUE = "#12417e";
const LINE = new THREE.LineBasicMaterial({ color: "#ffffff" });
const FILL = new THREE.MeshBasicMaterial({ color: BLUE, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

/** World points to pixel coordinates of a shot, for the sheet's dimension lines. */
function projector(camera: THREE.Camera, w: number, h: number) {
  return (p: [number, number, number]) => {
    const v = new THREE.Vector3(...p).project(camera);
    return [+(((v.x + 1) / 2) * w).toFixed(1), +(((1 - v.y) / 2) * h).toFixed(1)];
  };
}

/** Swaps every mesh to a flat blue fill with white feature edges; returns the undo. */
function lineStyle(scene: THREE.Scene) {
  const undo: (() => void)[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const before = mesh.material;
    mesh.material = FILL;
    if (mesh.userData.outside) {
      mesh.visible = false;
      undo.push(() => (mesh.visible = true));
      return;
    }
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 12), LINE);
    mesh.add(edges);
    undo.push(() => {
      mesh.material = before;
      mesh.remove(edges);
      edges.geometry.dispose();
    });
  });
  return () => undo.forEach((u) => u());
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function Runner({ setExplode, onDone }: { setExplode: (e: Explode) => void; onDone: (n: number) => void }) {
  const get = useThree((s) => s.get);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const { gl, scene } = get();
      const pmrem = new THREE.PMREMGenerator(gl);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.12;
      gl.localClippingEnabled = false;
      await frame();
      scene.updateMatrixWorld(true);
      metricUVAll(scene);
      let n = 0;
      for (const shot of SHOTS) {
        setExplode(shot.explode ?? { walls: 0, ceiling: 0 });
        room.set({ day: shot.day ?? false });
        await frame();
        await frame();
        const image = take(gl, scene, shot);
        await fetch("/api/blueprint", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(image) });
        onDone(++n);
      }
      await fetch("/api/blueprint", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ done: true }) });
      document.body.dataset.ready = "1";
    })();
  }, [get, setExplode, onDone]);
  return null;
}

function take(gl: THREE.WebGLRenderer, scene: THREE.Scene, shot: Shot) {
  const { w, h } = shot;
  const aspect = w / h;
  const camera =
    shot.ortho !== undefined
      ? new THREE.OrthographicCamera(-shot.ortho * aspect, shot.ortho * aspect, shot.ortho, -shot.ortho, 0.05, 60)
      : new THREE.PerspectiveCamera(shot.fov ?? 60, aspect, 0.03, 60);
  camera.position.set(...shot.from);
  if (shot.up) camera.up.set(...shot.up);
  camera.lookAt(...shot.to);
  camera.updateMatrixWorld();
  gl.setPixelRatio(1);
  gl.setSize(w, h, false);
  gl.clippingPlanes = shot.clip ? [new THREE.Plane(new THREE.Vector3(...shot.clip.normal), shot.clip.constant)] : [];
  const lines = shot.style === "line";
  const undo = lines ? lineStyle(scene) : null;
  const restore: (() => void)[] = [];
  for (const name of shot.ghost ?? []) {
    scene.getObjectByName(name)?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const before = mesh.material;
      const glass = (Array.isArray(before) ? before[0] : before).clone();
      Object.assign(glass, { transparent: true, opacity: 0.16, depthWrite: false });
      mesh.material = glass;
      const cast = mesh.castShadow;
      mesh.castShadow = false;
      restore.push(() => {
        mesh.material = before;
        mesh.castShadow = cast;
        glass.dispose();
      });
    });
  }
  if (shot.hideOutside)
    scene.traverse((o) => {
      if (o.userData.outside && o.visible) {
        o.visible = false;
        restore.push(() => (o.visible = true));
      }
    });
  const background = scene.background;
  scene.background = new THREE.Color(lines ? BLUE : shot.background ?? "#0d0b0a");
  gl.toneMapping = lines ? THREE.NoToneMapping : THREE.AgXToneMapping;
  gl.toneMappingExposure = lines ? 1 : 1.25;
  gl.render(scene, camera);
  const png = gl.domElement.toDataURL("image/png");
  undo?.();
  restore.forEach((r) => r());
  scene.background = background;
  gl.clippingPlanes = [];
  const at = projector(camera, w, h);
  const marks = Object.fromEntries(Object.entries(shot.marks ?? {}).map(([k, p]) => [k, at(p)]));
  return { id: shot.id, png, w, h, marks, pxPerM: shot.ortho !== undefined ? h / (2 * shot.ortho) : null };
}

export function Photographer() {
  const [explode, setExplode] = useState<Explode>({ walls: 0, ceiling: 0 });
  const [done, setDone] = useState(0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0b0a", color: "#f4e9da", font: "14px system-ui", display: "grid", placeItems: "center" }}>
      <p>Memotret blueprint… {done}/{SHOTS.length}</p>
      <div style={{ position: "fixed", left: -4000, top: 0, width: 1600, height: 1200 }}>
        <Canvas frameloop="never" shadows gl={{ antialias: true, preserveDrawingBuffer: true }} dpr={1}>
          <ExplodeContext.Provider value={explode}>
            <Lights />
            <Suspense fallback={null}>
              <MaterialsProvider>
                <Shell />
                <Bed />
                <Desk />
                <Storage />
                <Decor />
                <Runner setExplode={setExplode} onDone={setDone} />
              </MaterialsProvider>
            </Suspense>
          </ExplodeContext.Provider>
        </Canvas>
      </div>
    </div>
  );
}
