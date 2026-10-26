"use client";
// The live layer: lifts the roof and upper floor on springs (hiding the near facades), day and night,
// the hens, the idle tour, pointer and keyboard. It writes attributes and CSS variables; React never re-renders per frame.
import * as React from "react";
import { fmtId, readoutOf, type Stats } from "./model";

type V3 = [number, number, number];
export interface HomesteadData {
  V: V3;
  EX: [number, number];
  EY: [number, number];
  EZ: [number, number];
  pieces: Record<string, { name: string; say: string }>;
  stagger: string[];
  spring: { stagger: number; stiffness: number; damping: number; substeps: number };
  houseBox: [number, number, number, number];
  hens: { at: [number, number]; heading: number; range: number }[];
  camera: { origin: [number, number]; k: number; cam: number[] };
  stats: Stats;
  focus: { id: string; label: string; rect: [number, number, number, number]; level: number }[];
  coopDoor: [number, number];
}

// Time of day: night falls between 17:30 and 19:30 and lifts between 05:00 and 07:00; dawn and dusk glow around 06:30 and 18:30.
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const nightOf = (hour: number) => Math.min(1, 1 - smoothstep(5, 7, hour) + smoothstep(17.5, 19.5, hour));
export const duskOf = (hour: number) => Math.min(1, Math.exp(-(((hour - 6.4) / 1.1) ** 2)) + Math.exp(-(((hour - 18.6) / 1.1) ** 2)));
export const clockText = (hour: number) => {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.floor((((hour % 1) + 1) % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m - (m % 5)).padStart(2, "0")}`;
};

const LEVELS = [
  { label: "Tutup", targets: { roof: 0, upper: 0 }, say: "rumah tertutup" },
  { label: "Lantai 2", targets: { roof: 1, upper: 0 }, say: "atap diangkat · lantai 2" },
  { label: "Lantai 1", targets: { roof: 1, upper: 1 }, say: "lantai 2 diangkat · lantai 1" },
] as const;

interface Node { el: SVGGElement; piece: string; key: number; m: V3; lift: number; shown: string }
interface Spring { x: number; v: number; target: number; pending: { value: number; at: number } | null }
interface Glide { x: number; v: number }

const glide = (x = 0): Glide => ({ x, v: 0 });
function settle(state: Glide, target: number, dt: number, seconds: number, calm: boolean) {
  if (calm) {
    state.x = target;
    state.v = 0;
    return false;
  }
  const w = 1 / seconds;
  for (let i = 0; i < 4; i++) {
    const h = dt / 4;
    state.v += (w * w * (target - state.x) - 2 * w * state.v) * h;
    state.x += state.v * h;
  }
  if (Math.abs(target - state.x) < 1e-4 && Math.abs(state.v) < 1e-4) {
    state.x = target;
    state.v = 0;
    return false;
  }
  return true;
}

const CORNERS = [
  { id: "c45", label: "↻ Depan-kanan" },
  { id: "c135", label: "Depan-kiri" },
  { id: "c225", label: "Belakang-kiri" },
  { id: "c315", label: "Belakang-kanan" },
];

export function HomesteadLive({ data }: { data: HomesteadData }) {
  const anchor = React.useRef<HTMLDivElement>(null);
  const api = React.useRef<{ level: (n: number) => void; night: () => void; focus: (id: string) => void; hour: (h: number) => void; play: () => void } | null>(null);
  const [ui, setUi] = React.useState({ level: 0, night: false, focus: "all", hour: 12, playing: false });
  const [color, setColor] = React.useState(true);
  // 360: the other three corners are static drawings built by print/views.mjs, laid over the live stage.
  const [corner, setCorner] = React.useState("c45");
  const corners = React.useRef(new Map<string, string>());
  const pickCorner = async (id: string) => {
    const stage = anchor.current?.closest(".iso-plate")?.querySelector(".hs-stage");
    if (!stage) return;
    let layer = stage.querySelector<HTMLDivElement>(".hs-corner");
    if (id === "c45") {
      layer?.remove();
      setCorner(id);
      return;
    }
    let svg = corners.current.get(id);
    if (!svg) {
      const response = await fetch(`/api/homestead/view/${id}`);
      if (!response.ok) return;
      svg = await response.text();
      corners.current.set(id, svg);
    }
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "hs-corner";
      stage.appendChild(layer);
    }
    layer.innerHTML = svg;
    setCorner(id);
  };
  const toggleColor = () => {
    const next = !color;
    anchor.current?.closest(".hs")?.toggleAttribute("data-color", next);
    setColor(next);
  };

  React.useEffect(() => {
    const plate = anchor.current?.closest(".iso-plate");
    const figure = anchor.current?.closest(".hs") as HTMLElement | null;
    const stage = plate?.querySelector(".hs-stage") as HTMLElement | null;
    if (!plate || !figure || !stage) return;
    const back = stage.querySelector('.hs-items[data-layer="back"]') as SVGGElement;
    const front = stage.querySelector('.hs-items[data-layer="front"]') as SVGGElement;
    const svg = stage.querySelector(".hs-back") as SVGSVGElement;
    const readout = plate.querySelector("[data-readout]");
    const live = plate.querySelector("[data-live]");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const { V, EX, EY, EZ, spring: SPRING } = data;

    const layers = [back, front].map((group) => {
      const nodes: Node[] = [...group.querySelectorAll<SVGGElement>(":scope > .it")].map((el) => {
        const m = el.dataset.m!.split(",").map(Number) as V3;
        return { el, piece: el.dataset.piece!, key: Number(el.dataset.k), m, lift: m[0] * V[0] + m[1] * V[1] + m[2] * V[2], shown: "" };
      });
      return { group, nodes, moving: nodes.filter((n) => n.lift !== 0 || n.m.some(Boolean)), order: nodes.map((_, i) => i) };
    });
    const hens = [...stage.querySelectorAll<SVGGElement>(".hs-hen")].map((el) => {
      const spot = data.hens[Number(el.dataset.hen)];
      return { el, spot, x: 0, y: 0, tx: 0, ty: 0, wait: Math.random() * 2, bob: Math.random() * 6, shown: "", inside: false, hop: -9 };
    });

    const pieces: Record<string, Spring> = Object.fromEntries(Object.keys(data.pieces).map((id) => [id, { x: 0, v: 0, target: 0, pending: null }]));
    const night = glide(0);
    const state = { level: 0, nightOn: false, hovering: false, touring: !still.matches, tourClock: 0, hour: 12, hourTarget: 12, playing: false };
    let clock = 0;
    let frame = 0;
    let last = 0;
    let visible = false;
    let idle = 0;

    const say = (text: string) => {
      if (readout && readout.textContent !== text) readout.textContent = text;
    };
    const announce = (text: string) => {
      if (live) live.textContent = text;
    };

    function setLevel(n: number, fromTour = false) {
      n = Math.max(0, Math.min(2, n));
      if (n === state.level && !fromTour) return;
      const opening = n > state.level;
      state.level = n;
      const targets = LEVELS[n].targets as Record<string, number>;
      let index = 0;
      const order = opening ? data.stagger : [...data.stagger].reverse();
      for (const id of order) {
        const goal = targets[id] ?? 0;
        const p = pieces[id];
        if (p.target === goal && !p.pending) continue;
        if (p.target === goal) p.pending = null;
        else p.pending = { value: goal, at: clock + (still.matches ? 0 : index++ * SPRING.stagger) };
      }
      setUi((u) => (u.level === n ? u : { ...u, level: n }));
      // An open house shows its rooms: the near facades step aside.
      figure!.toggleAttribute("data-open", n > 0);
      stage!.setAttribute("aria-valuetext", LEVELS[n].say);
      announce(LEVELS[n].say);
      run();
    }
    function setNight(on: boolean) {
      setHour(on ? 21 : 12);
      announce(on ? "malam · lampu menyala" : "siang");
    }
    function setHour(h: number, { jump = false } = {}) {
      state.hourTarget = Math.min(24, Math.max(0, h));
      if (jump || still.matches) state.hour = state.hourTarget;
      run();
    }
    function setPlaying(on: boolean) {
      state.playing = on;
      setUi((u) => ({ ...u, playing: on }));
      announce(on ? "waktu berjalan" : "waktu berhenti");
      run();
    }

    function stepSpring(p: Spring, dt: number, calm: boolean) {
      if (p.pending && clock >= p.pending.at) {
        p.target = p.pending.value;
        p.pending = null;
      }
      if (calm) {
        p.x = p.target;
        p.v = 0;
        return p.pending !== null;
      }
      for (let i = 0; i < SPRING.substeps; i++) {
        const h = dt / SPRING.substeps;
        p.v += ((p.target - p.x) * SPRING.stiffness - p.v * SPRING.damping) * h;
        p.x += p.v * h;
      }
      if (Math.abs(p.target - p.x) < 2e-4 && Math.abs(p.v) < 2e-4) {
        p.x = p.target;
        p.v = 0;
        return p.pending !== null;
      }
      return true;
    }

    function place() {
      for (const layer of layers) {
        for (const node of layer.moving) {
          const share = pieces[node.piece]?.x ?? 0;
          const tx = (EX[0] * node.m[0] + EY[0] * node.m[1] + EZ[0] * node.m[2]) * share;
          const ty = (EX[1] * node.m[0] + EY[1] * node.m[1] + EZ[1] * node.m[2]) * share;
          const text = share === 0 ? "" : `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`;
          if (text !== node.shown) {
            node.shown = text;
            if (text) node.el.setAttribute("transform", text);
            else node.el.removeAttribute("transform");
          }
        }
        const keyOf = (i: number) => layer.nodes[i].key + layer.nodes[i].lift * (pieces[layer.nodes[i].piece]?.x ?? 0);
        const next = layer.nodes.map((_, i) => i).sort((a, b) => keyOf(a) - keyOf(b));
        if (next.some((index, at) => index !== layer.order[at])) {
          const fragment = document.createDocumentFragment();
          for (const index of next) fragment.appendChild(layer.nodes[index].el);
          layer.group.appendChild(fragment);
          layer.order = next;
        }
      }
    }

    function walkHens(dt: number, calm: boolean) {
      let moving = false;
      const roosting = night.x > 0.6;
      for (const hen of hens) {
        hen.wait -= dt;
        // At dusk each hen walks to the foot of the ramp and goes in; at dawn she comes back out.
        const door: [number, number] = [data.coopDoor[0] - hen.spot.at[0], data.coopDoor[1] - hen.spot.at[1]];
        if (roosting) {
          hen.tx = door[0];
          hen.ty = door[1];
          const inside = Math.hypot(hen.x - door[0], hen.y - door[1]) < 1.2;
          if (inside !== hen.inside) {
            hen.inside = inside;
            hen.el.style.opacity = inside ? "0" : "";
          }
        } else if (hen.inside) {
          hen.inside = false;
          hen.el.style.opacity = "";
          hen.wait = 0;
        }
        if (!roosting && hen.wait <= 0 && !calm) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * hen.spot.range;
          hen.tx = Math.cos(a) * r;
          hen.ty = Math.sin(a) * r;
          hen.wait = 1.6 + Math.random() * 3.2;
        }
        const k = 1 - Math.exp(-dt / 0.9);
        hen.x += (hen.tx - hen.x) * k;
        hen.y += (hen.ty - hen.y) * k;
        hen.bob += dt * 7;
        const walking = Math.hypot(hen.tx - hen.x, hen.ty - hen.y) > 0.05;
        const hopAge = clock - hen.hop;
        const hop = hopAge >= 0 && hopAge < 0.5 ? Math.sin((hopAge / 0.5) * Math.PI) * 3 : 0;
        const peck = (walking ? 0 : Math.max(0, Math.sin(hen.bob * 0.6)) * 0.6) - hop;
        const sx = EX[0] * hen.x + EY[0] * hen.y + EZ[0] * -peck;
        const sy = EX[1] * hen.x + EY[1] * hen.y + EZ[1] * -peck;
        const text = `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`;
        if (text !== hen.shown) {
          hen.shown = text;
          hen.el.setAttribute("transform", text);
        }
        moving ||= walking || hop > 0;
      }
      return moving;
    }

    // Idle tour: lift the roof, lift the upper floor, dusk, close up, morning.
    const TOUR: [number, () => void][] = [
      [1.4, () => setLevel(1, true)],
      [4.6, () => setLevel(2, true)],
      [8.2, () => setNight(true)],
      [11.6, () => setLevel(0, true)],
      [14.6, () => setNight(false)],
    ];
    const TOUR_LENGTH = 18;
    let tourStep = 0;

    const written: Record<string, string> = {};
    const writeVar = (name: string, value: string) => {
      if (written[name] === value) return;
      written[name] = value;
      figure!.style.setProperty(name, value);
    };
    let placeDirty = true;
    let lastShownHour = 12;

    // Camera: the view eases between focus boxes by animating both SVGs' viewBox, so the drawing stays vector-sharp.
    const svgs = [...stage.querySelectorAll<SVGSVGElement>(":scope > svg")];
    const full = data.focus[0].rect;
    const cam = { id: "all", from: [...full], to: [...full], view: [...full] as [number, number, number, number], t: 1 };
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    function setFocus(id: string) {
      const target = data.focus.find((f) => f.id === id) ?? data.focus[0];
      cam.id = target.id;
      cam.from = [...cam.view];
      cam.to = [...target.rect];
      cam.t = still.matches ? 1 : 0;
      if (target.id !== "all") state.touring = false;
      setLevel(target.level, true);
      setUi((u) => ({ ...u, focus: target.id }));
      announce(`melihat ${target.label.toLowerCase()}`);
      run();
    }
    function stepCamera(dt: number) {
      if (cam.t >= 1 && cam.view[2] === cam.to[2] && cam.view[0] === cam.to[0]) return false;
      cam.t = Math.min(1, cam.t + dt / 0.75);
      const k = ease(cam.t);
      applyView(cam.from.map((v, i) => v + (cam.to[i] - v) * k) as [number, number, number, number]);
      return cam.t < 1;
    }
    function applyView(view: [number, number, number, number]) {
      cam.view = view;
      const text = view.map((v) => v.toFixed(2)).join(" ");
      for (const el of svgs) el.setAttribute("viewBox", text);
    }
    /** Sets the view at once (zoom, pan), kept inside the drawing and no smaller than a sixth of it. */
    function setView(x: number, y: number, w: number) {
      const width = Math.min(full[2], Math.max(full[2] / 6, w));
      const height = (width * full[3]) / full[2];
      const vx = Math.min(full[0] + full[2] - width, Math.max(full[0], x));
      const vy = Math.min(full[1] + full[3] - height, Math.max(full[1], y));
      const view: [number, number, number, number] = [vx, vy, width, height];
      cam.from = [...view];
      cam.to = [...view];
      cam.t = 1;
      const custom = width < full[2] - 0.5;
      if (custom !== (cam.id === "custom")) {
        cam.id = custom ? "custom" : "all";
        setUi((u) => ({ ...u, focus: cam.id }));
      }
      applyView(view);
    }

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      clock += dt;
      const calm = still.matches;
      if (state.touring) {
        state.tourClock += dt;
        while (tourStep < TOUR.length && state.tourClock >= TOUR[tourStep][0]) TOUR[tourStep++][1]();
        if (state.tourClock >= TOUR_LENGTH) {
          state.tourClock = 0;
          tourStep = 0;
        }
      }
      let springs = false;
      for (const id of Object.keys(pieces)) springs = stepSpring(pieces[id], dt, calm) || springs;
      let moving = springs;
      moving = stepCamera(dt) || moving;
      if (state.playing && !calm) {
        state.hour = (state.hour + dt * 0.4) % 24;
        state.hourTarget = state.hour;
      } else if (Math.abs(state.hourTarget - state.hour) > 1e-3) {
        state.hour += (state.hourTarget - state.hour) * (calm ? 1 : 1 - Math.exp(-dt / 0.5));
        if (Math.abs(state.hourTarget - state.hour) < 0.01) state.hour = state.hourTarget;
        moving = true;
      }
      moving = state.playing || moving;
      moving = settle(night, nightOf(state.hour), dt, 0.35, calm) || moving;
      writeVar("--dusk", duskOf(state.hour).toFixed(2));
      const nightOn = nightOf(state.hour) > 0.5;
      if (nightOn !== state.nightOn) state.nightOn = nightOn;
      const shownHour = Math.round(state.hour * 4) / 4;
      if (shownHour !== lastShownHour) {
        lastShownHour = shownHour;
        setUi((u) => ({ ...u, hour: shownHour, night: nightOn }));
      }
      // Inherited CSS variables restyle every element under the figure, so write them only when they change.
      writeVar("--night", night.x.toFixed(2));
      // Re-place and re-sort only while the roof or upper floor is moving (or once after a change).
      if (springs || placeDirty) {
        place();
        placeDirty = springs;
      }
      const hensMoving = walkHens(dt, calm);
      const levelSay = LEVELS[state.level].say;
      say(`jam ${clockText(state.hour)} · ${readoutOf({ night: night.x }, data.stats)}${state.level ? ` · ${levelSay.split(" · ")[1]}` : ""}`);
      // After a while with nobody around, the tour ends, the house settles closed and in daylight, and
      // everything rests until the reader moves, types or scrolls again.
      lastInput ??= now;
      const idle = now - lastInput > IDLE_MS;
      if (idle && state.playing) setPlaying(false);
      if (idle && state.touring) {
        state.touring = false;
        setLevel(0, true);
        setNight(false);
      }
      const resting = idle && !moving && !state.touring && !state.playing;
      if (resting && !figure!.hasAttribute("data-sleep")) figure!.setAttribute("data-sleep", "");
      const keepGoing = visible && !resting && (moving || state.touring || hensMoving || !calm);
      frame = keepGoing ? requestAnimationFrame(tick) : 0;
    }
    const IDLE_MS = 90_000;
    // Set on the first frame, so the idle clock starts when the figure does.
    let lastInput: number | null = null;
    const wake = () => {
      lastInput = performance.now();
      if (figure.hasAttribute("data-sleep")) {
        figure.removeAttribute("data-sleep");
        if (!still.matches && cam.id === "all") {
          state.touring = true;
          state.tourClock = 0;
          tourStep = 0;
        }
        run();
      }
    };
    const wakeEvents = ["pointermove", "pointerdown", "keydown", "scroll", "focusin"] as const;
    for (const name of wakeEvents) window.addEventListener(name, wake, { passive: true });

    function run() {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    }
    function takeOver() {
      state.touring = false;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (still.matches || cam.id !== "all") return;
        state.touring = true;
        state.tourClock = 0;
        tourStep = 0;
        run();
      }, 3600);
    }

    // ── Pointer: hover info, click actions, drag to pan, Ctrl/⌘ + scroll or pinch to zoom, double-click to reset.
    const toViewBox = (clientX: number, clientY: number) => {
      const box = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      return [vb.x + ((clientX - box.left) / box.width) * vb.width, vb.y + ((clientY - box.top) / box.height) * vb.height];
    };
    // The world point on a horizontal plane at height h under a viewBox point (the shader's onFloor).
    const floorAt = (vx: number, vy: number, h: number) => {
      const [sinA, cosA, sinE, cosE] = data.camera.cam;
      const qx = (vx - data.camera.origin[0]) / data.camera.k;
      const qy = (vy - data.camera.origin[1]) / data.camera.k;
      const b = (qy + h * cosE) / sinE;
      return [qx * sinA + b * cosA, -qx * cosA + b * sinA];
    };
    const st = data.stats;
    const ROOM = (title: string): Info => ({ title, body: "lampu ruangan", act: "klik: lampu nyala/mati" });
    type Info = { title: string; body?: string; act?: string };
    const INFO: Record<string, Info> = {
      house: { title: "Rumah tropis dua lantai", body: `12 × 8 m · ${fmtId(st.floorM2)} m² · atap perisai 25°, tritisan 1,2 m`, act: "arahkan ke rumah untuk membukanya" },
      door: { title: "Pintu depan", body: "dengan kanopi peneduh", act: "klik: buka/tutup" },
      living: ROOM("Ruang keluarga & makan"),
      kitchen: ROOM("Dapur bersih"),
      wetkitchen: { title: "Dapur kotor", body: "kompor dua tungku, bak cuci dalam, rak bumbu, tabung gas" },
      bath: { title: "Kamar mandi umum", body: "shower, kloset, wastafel" },
      laundry: { title: "Ruang cuci", body: "mesin cuci dan bak; pintu langsung ke area jemur" },
      master: ROOM("Kamar utama"),
      bed2: ROOM("Kamar 2"),
      terrace: { title: "Teras tertutup & balkon", body: "teras kayu menghadap kebun; balkon di atasnya" },
      carport: { title: "Carport", body: `${st.cars} mobil · ${st.motorcycles} motor · paving rumput resap air` },
      car: { title: "Mobil keluarga", act: "klik: nyalakan lampu" },
      motorcycle: { title: "Sepeda motor" },
      beds: { title: "Kebun pangan", body: `${st.beds} bedengan · ±${st.bedPlants} tanaman bumbu dan sayur`, act: "klik: panen" },
      herbs: { title: "Pot herba", body: "dekat dapur: kemangi, mint, daun bawang", act: "klik: petik" },
      fruits: { title: "Pohon buah", body: `${st.fruits} pohon · penyangga hijau sebelum area ternak`, act: "klik: goyang" },
      drying: { title: "Area jemur", body: "di luar ruang cuci, kena angin dan matahari pagi" },
      coop: { title: "Kandang ayam", body: `${st.hens} ayam · ±${st.eggsPerDay} telur/hari · masuk kandang saat malam`, act: "klik: kejutkan ayam" },
      hen: { title: "Ayam petelur", body: "±0,8 telur sehari", act: "klik: petok!" },
      compost: { title: "Kompos 3 sekat", body: "segar → matang → siap; untuk bedengan" },
      shed: { title: "Gudang alat kebun" },
      homestead: { title: "Zona homestead", body: "dipagari terpisah dari rumah, dapur dan air bersih" },
      water: { title: "Air hujan & drainase", body: `atap ${fmtId(st.roofM2)} m² → ±${fmtId(st.rainM3Year)} m³/tahun ke tandon 2.000 L; talang depan ke sumur resapan` },
      lamps: { title: "Lampu taman", body: "menyala sendiri saat malam", act: "klik: nyala/mati" },
      trees: { title: "Pohon peneduh & perdu berbunga", body: "meredam panas sore" },
    };
    const tip = plate.querySelector(".hs-tip") as HTMLElement;
    const tipTitle = tip.querySelector(".hs-tip-title") as HTMLElement;
    const tipBody = tip.querySelector(".hs-tip-body") as HTMLElement;
    const tipAct = tip.querySelector(".hs-tip-act") as HTMLElement;
    let tipFor = "";
    let tipHold = 0;
    function showTip(id: string, clientX: number, clientY: number, override?: string) {
      const info = INFO[id];
      if (!info) return hideTip();
      if (tipFor !== id || override) {
        tipFor = id;
        tipTitle.textContent = info.title;
        tipBody.textContent = override ?? info.body ?? "";
        tipAct.textContent = override ? "" : (info.act ?? "");
      }
      const box = plate!.getBoundingClientRect();
      tip.style.left = `${Math.min(box.width - 130, Math.max(130, clientX - box.left))}px`;
      tip.style.top = `${Math.max(90, clientY - box.top)}px`;
      tip.hidden = false;
    }
    function hideTip() {
      tipFor = "";
      tip.hidden = true;
    }
    const setHot = (id: string) => {
      if ((figure!.dataset.hot ?? "") !== id) {
        if (id) figure!.dataset.hot = id;
        else delete figure!.dataset.hot;
      }
    };
    const hotOf = (target: EventTarget | null) => (target instanceof Element ? (target.closest("[data-h]") as HTMLElement | null) : null);

    function act(item: HTMLElement, clientX: number, clientY: number) {
      const id = item.dataset.h!;
      takeOver();
      let say = "";
      if (id === "beds" || id === "herbs") {
        figure!.setAttribute("data-harvest", "");
        window.setTimeout(() => figure!.removeAttribute("data-harvest"), 650);
        say = id === "beds" ? `Panen ±${st.bedPlants} tanaman; tunas baru tumbuh lagi.` : "Herba dipetik untuk masak.";
      } else if (id === "fruits") {
        item.classList.remove("hs-shake");
        void item.getBoundingClientRect();
        item.classList.add("hs-shake");
        say = "Buah matang berjatuhan.";
      } else if (id === "car") {
        const on = !item.hasAttribute("data-lights");
        item.toggleAttribute("data-lights", on);
        say = on ? "Lampu mobil menyala." : "Lampu mobil mati.";
      } else if (id === "coop" || id === "hen") {
        const only = id === "hen" ? item.querySelector(".hs-hen") : null;
        for (const hen of hens) {
          if (only && hen.el !== only) continue;
          if (hen.inside) continue;
          const a = Math.random() * Math.PI * 2;
          const r = hen.spot.range * (1 + Math.random() * 0.6);
          hen.tx = Math.cos(a) * r;
          hen.ty = Math.sin(a) * r;
          hen.wait = 2 + Math.random() * 2;
          hen.hop = clock;
        }
        say = "Petok petok!";
        run();
      } else if (id === "door") {
        const open = figure!.dataset.door !== "open";
        if (open) figure!.dataset.door = "open";
        else delete figure!.dataset.door;
        say = open ? "Pintu dibuka." : "Pintu ditutup.";
      } else if (id === "living" || id === "kitchen" || id === "master" || id === "bed2") {
        const on = !figure!.hasAttribute(`data-room-${id}`);
        figure!.toggleAttribute(`data-room-${id}`, on);
        say = on ? "Lampu dinyalakan." : "Lampu dimatikan.";
      } else if (id === "lamps") {
        const on = !figure!.hasAttribute("data-garden-lamps");
        figure!.toggleAttribute("data-garden-lamps", on);
        say = on ? "Lampu taman menyala." : "Lampu taman mengikuti waktu lagi.";
      }
      if (say) {
        announce(say);
        showTip(id, clientX, clientY, say);
        window.clearTimeout(tipHold);
        tipHold = window.setTimeout(() => (tipFor = ""), 1600);
      }
    }

    let press: { x: number; y: number; view: [number, number, number, number]; id: number; dragging: boolean } | null = null;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      press = { x: event.clientX, y: event.clientY, view: [...cam.view], id: event.pointerId, dragging: false };
    };
    const onMove = (event: PointerEvent) => {
      if (press && press.id === event.pointerId) {
        const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
        if (!press.dragging && moved > 4 && cam.view[2] < full[2] - 0.5) {
          press.dragging = true;
          stage!.setAttribute("data-dragging", "");
          stage!.setPointerCapture(event.pointerId);
          hideTip();
          takeOver();
        }
        if (press.dragging) {
          const box = svg.getBoundingClientRect();
          const scale = press.view[2] / box.width;
          setView(press.view[0] - (event.clientX - press.x) * scale, press.view[1] - (event.clientY - press.y) * scale, press.view[2]);
          return;
        }
      }
      const item = hotOf(event.target);
      const id = item?.dataset.h ?? "";
      if (event.pointerType === "mouse") {
        setHot(id && id !== "house" ? id : "");
        if (id) showTip(id, event.clientX, event.clientY);
        else hideTip();
      }
      // Hovering the house lifts its floors, in the whole view only.
      if (event.pointerType !== "mouse" || cam.id !== "all") return;
      const [x, y] = toViewBox(event.clientX, event.clientY);
      const [x0, y0, x1, y1] = data.houseBox;
      const inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      if (inside !== state.hovering) {
        state.hovering = inside;
        takeOver();
        setLevel(inside ? 2 : 0);
      }
    };
    const onUp = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      const wasDrag = press.dragging;
      press = null;
      if (wasDrag) {
        stage!.removeAttribute("data-dragging");
        if (stage!.hasPointerCapture(event.pointerId)) stage!.releasePointerCapture(event.pointerId);
        return;
      }
      const item = hotOf(event.target);
      if (item && item.dataset.h !== "house") act(item, event.clientX, event.clientY);
      else if (item && event.pointerType !== "mouse") showTip("house", event.clientX, event.clientY);
    };
    const onLeave = () => {
      setHot("");
      hideTip();
      if (state.hovering && cam.id === "all") {
        state.hovering = false;
        setLevel(0);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      takeOver();
      const [vx, vy] = toViewBox(event.clientX, event.clientY);
      const factor = Math.exp(event.deltaY * 0.01);
      const w = cam.view[2] * factor;
      const k = Math.min(full[2], Math.max(full[2] / 6, w)) / cam.view[2];
      setView(vx - (vx - cam.view[0]) * k, vy - (vy - cam.view[1]) * k, cam.view[2] * k);
      hideTip();
    };
    const onDouble = () => {
      takeOver();
      setFocus("all");
    };
    const onKey = (event: KeyboardEvent) => {
      let handled = true;
      if (event.key === "ArrowUp" || event.key === "ArrowRight") setLevel(state.level + 1);
      else if (event.key === "ArrowDown" || event.key === "ArrowLeft") setLevel(state.level - 1);
      else if (event.key === "Home" || event.key === "Escape") {
        if (cam.id !== "all") setFocus("all");
        else setLevel(0);
      }
      else if (event.key === "End") setLevel(2);
      else if (event.key === "n" || event.key === "N") setNight(!state.nightOn);
      else handled = false;
      if (handled) {
        event.preventDefault();
        takeOver();
      }
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("dblclick", onDouble);
    stage.addEventListener("keydown", onKey);
    const observer = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    }, { rootMargin: "120px 0px" });
    observer.observe(stage);


    api.current = {
      level: (n) => {
        takeOver();
        setLevel(n);
      },
      night: () => {
        takeOver();
        setNight(!state.nightOn);
      },
      focus: (id) => {
        takeOver();
        setFocus(id);
      },
      hour: (h) => {
        takeOver();
        if (state.playing) setPlaying(false);
        setHour(h, { jump: true });
      },
      play: () => {
        takeOver();
        setPlaying(!state.playing);
      },
    };
    run();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      observer.disconnect();
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("dblclick", onDouble);
      stage.removeEventListener("keydown", onKey);
      for (const name of wakeEvents) window.removeEventListener(name, wake);
      figure.removeAttribute("data-sleep");
      figure.removeAttribute("data-gl");
    };
  }, [data]);

  return (
    <div ref={anchor} className="hs-controls">
      <div className="hs-segment" role="group" aria-label="Buka rumah">
        {LEVELS.map((level, index) => (
          <button key={level.label} type="button" className="hs-button" data-on={ui.level === index ? "" : undefined} aria-pressed={ui.level === index} onClick={() => api.current?.level(index)}>
            {level.label}
          </button>
        ))}
      </div>
      <button type="button" className="hs-button" data-on={ui.night ? "" : undefined} aria-pressed={ui.night} onClick={() => api.current?.night()}>
        Malam <kbd>N</kbd>
      </button>
      <button type="button" className="hs-button" data-on={color ? "" : undefined} aria-pressed={color} onClick={toggleColor}>
        Warna
      </button>
      <div className="hs-segment" role="group" aria-label="Sudut pandang 360°">
        {CORNERS.map((c) => (
          <button key={c.id} type="button" className="hs-button" data-on={corner === c.id ? "" : undefined} aria-pressed={corner === c.id} onClick={() => void pickCorner(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="hs-segment hs-views" role="group" aria-label="Lihat area">
        {data.focus.map((f) => (
          <button key={f.id} type="button" className="hs-button" data-on={ui.focus === f.id ? "" : undefined} aria-pressed={ui.focus === f.id} onClick={() => api.current?.focus(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="hs-time">
        <button type="button" className="hs-button" data-on={ui.playing ? "" : undefined} aria-pressed={ui.playing} onClick={() => api.current?.play()}>
          {ui.playing ? "Jeda" : "Putar waktu"}
        </button>
        <input type="range" min={0} max={24} step={0.25} value={ui.hour} aria-label="Jam" onChange={(event) => api.current?.hour(Number(event.target.value))} />
        <output aria-live="off">{clockText(ui.hour)}</output>
      </div>
      <span className="hs-live" aria-live="polite" data-live="" />
    </div>
  );
}
