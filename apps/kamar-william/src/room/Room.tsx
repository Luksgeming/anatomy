"use client";
// William's room in first person: the 3D canvas with its post-processing, and the controls laid over it.
// The canvas draws only when something changes (a switch, a glide, a step), so an idle room keeps the laptop cool.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { VIEWS, type ViewId } from "./layout";
import { Lights } from "./Lights";
import { MaterialsProvider } from "./materials";
import { metricUVAll } from "./pbr";
import { Bed } from "./parts/Bed";
import { Decor } from "./parts/Decor";
import { Desk } from "./parts/Desk";
import { Shell } from "./parts/Shell";
import { Storage } from "./parts/Storage";
import { pad, Player } from "./Player";
import { room, useRoom, type LightId } from "./store";

RectAreaLightUniformsLib.init();

/** Hands the canvas's invalidate to the store, so a switch flipped in the controls draws a frame. */
function Redraw() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    room.onRedraw(invalidate);
    return () => room.onRedraw(null);
  }, [invalidate]);
  return null;
}

/** Soft image-based light for reflections: a neutral studio room, faint at night, stronger by day. */
function Environment() {
  const get = useThree((s) => s.get);
  const day = useRoom((s) => s.day);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [get]);
  useEffect(() => {
    const { scene, invalidate } = get();
    scene.environmentIntensity = day ? 0.35 : 0.05;
    invalidate();
  }, [day, get]);
  return null;
}

/** Once the textures are in, give every tiled part UVs in metres. */
function MetricUV() {
  const { scene, invalidate } = useThree();
  useEffect(() => {
    scene.updateMatrixWorld(true);
    metricUVAll(scene);
    invalidate();
  }, [scene, invalidate]);
  return null;
}

function Scene() {
  const day = useRoom((s) => s.day);
  return (
    <>
      <color attach="background" args={[day ? "#cfe3f0" : "#0d0b0a"]} />
      <Redraw />
      <Player />
      <Environment />
      <Lights />
      <Suspense fallback={null}>
        <MaterialsProvider>
          <Shell />
          <Bed />
          <Desk />
          <Storage />
          <Decor />
          <MetricUV />
        </MaterialsProvider>
      </Suspense>
      <Snapshot />
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.35} intensity={2.2} distanceFalloff={0.6} halfRes quality="medium" />
        <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette offset={0.32} darkness={0.55} />
      </EffectComposer>
    </>
  );
}

const LIGHTS: [LightId, string][] = [
  ["pendant", "Lampu gantung"],
  ["headboard", "LED kepala kasur"],
  ["underbed", "LED kolong"],
  ["bedside", "Lampu tidur"],
  ["desk", "Lampu meja"],
  ["screen", "Layar laptop"],
  ["softbox", "Softbox"],
];

function Controls() {
  const s = useRoom((x) => x);
  const [open, setOpen] = useState(true);
  const hold = (key: keyof typeof pad, value: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      pad[key] = value;
      room.set({});
    },
    onPointerUp: () => {
      pad[key] = 0;
    },
    onPointerCancel: () => {
      pad[key] = 0;
    },
  });
  const [label, hint] = s.hover ? s.hover.split("|") : [null, null];
  return (
    <>
      <header className="kw-head">
        <h1>Kamar William</h1>
        <p>3 × 3 × 3 m · geser untuk melihat · W A S D / panah untuk berjalan · klik benda</p>
      </header>

      {label ? (
        <div className="kw-tip" role="status">
          <b>{label}</b>
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
      <div className="kw-cross" aria-hidden="true" />

      <SaveButton />

      <nav className="kw-views" aria-label="Sudut pandang">
        {(Object.keys(VIEWS) as ViewId[]).map((id) => (
          <button key={id} type="button" data-on={s.view === id ? "" : undefined} onClick={() => room.set((x) => ({ view: id, viewTick: x.viewTick + 1 }))}>
            {VIEWS[id].label}
          </button>
        ))}
      </nav>

      <aside className="kw-panel" data-open={open ? "" : undefined}>
        <button type="button" className="kw-panel-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Sembunyikan" : "Lampu & suasana"}
        </button>
        {open ? (
          <div className="kw-panel-body">
            <div className="kw-row">
              <button type="button" data-on={!s.day ? "" : undefined} onClick={() => room.set({ day: false })}>Malam</button>
              <button type="button" data-on={s.day ? "" : undefined} onClick={() => room.set({ day: true })}>Siang</button>
            </div>
            <label className="kw-dim">
              <span>Redup</span>
              <input type="range" min={0} max={1} step={0.01} value={s.dim} onChange={(e) => room.set({ dim: Number(e.target.value) })} aria-label="Kecerahan lampu" />
              <span>Terang</span>
            </label>
            <div className="kw-grid">
              {LIGHTS.map(([id, name]) => (
                <button key={id} type="button" data-on={s.lights[id] ? "" : undefined} aria-pressed={s.lights[id]} onClick={() => room.toggleLight(id)}>
                  <i aria-hidden="true" />
                  {name}
                </button>
              ))}
            </div>
            <div className="kw-row">
              <button type="button" data-on={s.door ? "" : undefined} onClick={() => room.set({ door: !s.door })}>Pintu {s.door ? "terbuka" : "tertutup"}</button>
              <button type="button" data-on={!s.curtains ? "" : undefined} onClick={() => room.set({ curtains: !s.curtains })}>Tirai {s.curtains ? "tertutup" : "terbuka"}</button>
              <button type="button" data-on={s.ac ? "" : undefined} onClick={() => room.set({ ac: !s.ac })}>AC {s.ac ? "24 °C" : "mati"}</button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="kw-pad" aria-label="Berjalan">
        <button type="button" {...hold("turn", 1)} aria-label="Belok kiri">⟲</button>
        <button type="button" {...hold("forward", 1)} aria-label="Maju">▲</button>
        <button type="button" {...hold("turn", -1)} aria-label="Belok kanan">⟳</button>
        <button type="button" {...hold("right", -1)} aria-label="Geser kiri">◀</button>
        <button type="button" {...hold("forward", -1)} aria-label="Mundur">▼</button>
        <button type="button" {...hold("right", 1)} aria-label="Geser kanan">▶</button>
      </div>
    </>
  );
}

/** A save request for the next frame: read after the post-processing pass has drawn it. */
const snapshot: { take: null | ((url: string) => void) } = { take: null };

function Snapshot() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    if (!snapshot.take) return;
    snapshot.take(gl.domElement.toDataURL("image/png"));
    snapshot.take = null;
  }, 2);
  return null;
}

/** Saves what the reader is looking at as a PNG. */
function SaveButton() {
  const save = () => {
    snapshot.take = (url) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = "kamar-william.png";
      a.click();
    };
    room.set({});
  };
  return (
    <div className="kw-photo">
      <button type="button" onClick={save}>
        Simpan gambar
      </button>
      <a href="/blueprint/blueprint-kamar-william-a3.pdf" download>
        Blueprint PDF
      </a>
    </div>
  );
}

export function Room() {
  return (
    <div className="kw">
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 72, near: 0.03, far: 30, position: [0.85, 1.6, -1.1] }}
        gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
        onPointerMissed={() => room.set({ hover: null })}
      >
        <Scene />
      </Canvas>
      <Controls />
    </div>
  );
}
