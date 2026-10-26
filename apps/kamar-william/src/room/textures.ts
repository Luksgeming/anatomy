"use client";
// Procedural textures drawn on canvases, so the room needs no image files: limewash paint, wood grain, floor tiles,
// linen, a jute rug, the wave desk mat, the door poster, wardrobe stickers and the prints above the bed.
// Each is made once per key and cached.
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

/** A small seeded random, so every texture is the same on every load. */
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

function make(key: string, size: [number, number], draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, { repeat = [1, 1] as [number, number], color = true } = {}) {
  const id = `${key}:${repeat.join("x")}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = size;
  const g = canvas.getContext("2d")!;
  draw(g, size[0], size[1]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(id, texture);
  return texture;
}

/** Soft blotches of a slightly lighter and darker tone: limewash or plaster. */
export function plaster(base: string, seed = 1, repeat: [number, number] = [1, 1]) {
  return make(`plaster-${base}-${seed}`, [512, 512], (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rand(seed);
    for (let i = 0; i < 260; i++) {
      const x = r() * w;
      const y = r() * h;
      const s = 20 + r() * 90;
      const grad = g.createRadialGradient(x, y, 0, x, y, s);
      const light = r() > 0.5;
      grad.addColorStop(0, light ? "rgba(255,248,236,0.07)" : "rgba(90,70,50,0.05)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      // Draw wrapped so the texture tiles without seams.
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) g.fillRect(x - s + dx, y - s + dy, s * 2, s * 2);
    }
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "60,45,30"},${0.025 + r() * 0.03})`;
      g.fillRect(r() * w, r() * h, 1, 1);
    }
  }, { repeat });
}

/** Wood: long grain lines with knots, along the texture's u direction. */
export function wood(base: string, dark: string, seed = 2, repeat: [number, number] = [1, 1]) {
  return make(`wood-${base}-${dark}-${seed}`, [1024, 256], (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rand(seed);
    for (let i = 0; i < 90; i++) {
      const y0 = r() * h;
      const amp = 2 + r() * 6;
      const freq = 0.004 + r() * 0.01;
      const phase = r() * 6;
      g.strokeStyle = dark;
      g.globalAlpha = 0.05 + r() * 0.12;
      g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * freq * Math.PI * 2 + phase) * amp;
        if (x) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = r() * w;
      const y = r() * h;
      for (let k = 6; k > 0; k--) {
        g.globalAlpha = 0.06;
        g.strokeStyle = dark;
        g.beginPath();
        g.ellipse(x, y, k * 6, k * 2.2, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }, { repeat });
}

/** Floor tiles, 60 × 60 cm, with grout lines and a faint variation per tile. */
export function tiles(repeat: [number, number]) {
  return make("tiles", [512, 512], (g, w, h) => {
    const r = rand(7);
    const n = 2;
    const s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const t = 222 + Math.floor(r() * 8);
        g.fillStyle = `rgb(${t},${t - 10},${t - 26})`;
        g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 900; k++) {
          g.fillStyle = `rgba(150,120,90,${r() * 0.05})`;
          g.fillRect(i * s + r() * s, j * s + r() * s, 2, 2);
        }
      }
    g.fillStyle = "#b9ab97";
    for (let i = 0; i <= n; i++) {
      g.fillRect(i * s - 1.5, 0, 3, h);
      g.fillRect(0, i * s - 1.5, w, 3);
    }
  }, { repeat });
}

/** Linen: a fine weave over a base colour. */
export function linen(base: string, seed = 3, repeat: [number, number] = [4, 4]) {
  return make(`linen-${base}-${seed}`, [256, 256], (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rand(seed);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`;
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 2) {
      g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
      g.fillRect(x, 0, 1, h);
    }
  }, { repeat });
}

/** A hand-woven jute rug with a darker border. */
export function jute() {
  return make("jute", [512, 512], (g, w, h) => {
    g.fillStyle = "#c9ad83";
    g.fillRect(0, 0, w, h);
    const r = rand(11);
    for (let y = 0; y < h; y += 6)
      for (let x = (y / 6) % 2 ? 0 : 6; x < w; x += 12) {
        g.fillStyle = `rgba(${120 + r() * 40},${90 + r() * 30},${55 + r() * 20},0.35)`;
        g.fillRect(x, y, 10, 5);
      }
    g.strokeStyle = "#8a6a45";
    g.lineWidth = 14;
    g.strokeRect(26, 26, w - 52, h - 52);
    g.lineWidth = 4;
    g.strokeRect(46, 46, w - 92, h - 92);
  });
}

/** The desk mat: a wave pattern in indigo on cream, after the one on William's desk. */
export function waveMat() {
  return make("wave-mat", [1024, 512], (g, w, h) => {
    g.fillStyle = "#e8dcc4";
    g.fillRect(0, 0, w, h);
    const layers = [
      ["#7fa6c4", 0.42],
      ["#3d6a93", 0.55],
      ["#1f3a5f", 0.7],
    ] as const;
    layers.forEach(([color, base], n) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) g.lineTo(x, h * base - Math.sin(x / 60 + n * 1.7) * 22 - Math.max(0, Math.sin(x / 190 + n)) * 46);
      g.lineTo(w, h);
      g.fill();
      // Foam: a cream line riding each crest with a row of small curls.
      g.strokeStyle = "#f4efe4";
      g.lineWidth = 5;
      g.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = h * base - Math.sin(x / 60 + n * 1.7) * 22 - Math.max(0, Math.sin(x / 190 + n)) * 46;
        if (x) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      g.fillStyle = "#f4efe4";
      for (let x = 30 + n * 17; x < w; x += 58) {
        const y = h * base - Math.sin(x / 60 + n * 1.7) * 22 - Math.max(0, Math.sin(x / 190 + n)) * 46;
        g.beginPath();
        g.arc(x, y - 4, 6, 0, Math.PI * 2);
        g.fill();
      }
    });
    g.fillStyle = "#c8442e";
    g.beginPath();
    g.arc(w * 0.8, h * 0.22, 40, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#1f3a5f";
    g.lineWidth = 12;
    g.strokeRect(6, 6, w - 12, h - 12);
  });
}

/** The poster on the door: a generic anime-style portrait in soft blues and lilac, drawn from simple shapes. */
export function poster() {
  return make("poster", [512, 720], (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#e9eef8");
    bg.addColorStop(1, "#c9cfe6");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Long silver hair.
    g.fillStyle = "#f3f4fa";
    g.strokeStyle = "#9aa3c4";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(w * 0.22, h * 0.95);
    g.bezierCurveTo(w * 0.1, h * 0.5, w * 0.2, h * 0.12, w * 0.5, h * 0.1);
    g.bezierCurveTo(w * 0.8, h * 0.12, w * 0.92, h * 0.5, w * 0.8, h * 0.95);
    g.closePath();
    g.fill();
    g.stroke();
    // Face and neck.
    g.fillStyle = "#fbe9df";
    g.beginPath();
    g.ellipse(w * 0.5, h * 0.36, w * 0.17, h * 0.15, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(w * 0.45, h * 0.47, w * 0.1, h * 0.08);
    // Fringe.
    g.fillStyle = "#eef0f8";
    g.beginPath();
    g.moveTo(w * 0.32, h * 0.32);
    for (let i = 0; i <= 6; i++) g.lineTo(w * (0.32 + i * 0.06), h * (i % 2 ? 0.3 : 0.22));
    g.lineTo(w * 0.68, h * 0.18);
    g.lineTo(w * 0.32, h * 0.18);
    g.fill();
    // Eyes and mouth.
    for (const x of [0.43, 0.57]) {
      g.fillStyle = "#3d4f8f";
      g.beginPath();
      g.ellipse(w * x, h * 0.37, w * 0.03, h * 0.028, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(w * x + 4, h * 0.362, 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#c9786b";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(w * 0.5, h * 0.42, 8, 0.2, Math.PI - 0.2);
    g.stroke();
    // Dark ribbon and collar.
    g.fillStyle = "#2a2d3a";
    g.beginPath();
    g.moveTo(w * 0.62, h * 0.18);
    g.lineTo(w * 0.72, h * 0.12);
    g.lineTo(w * 0.7, h * 0.22);
    g.fill();
    g.fillStyle = "#ffffff";
    g.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.4);
    g.fillStyle = "#2a2d3a";
    g.fillRect(w * 0.47, h * 0.55, w * 0.06, h * 0.25);
  });
}

/** A sheet of round and square stickers for the wardrobe door (generic shapes, no brands). */
export function stickers() {
  return make("stickers", [512, 768], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const items: [number, number, string, string, "circle" | "rect" | "star"][] = [
      [0.25, 0.12, "#ffffff", "#222222", "circle"],
      [0.6, 0.13, "#d9d9d9", "#666666", "circle"],
      [0.85, 0.12, "#ff7a3d", "#ffffff", "star"],
      [0.25, 0.32, "#48b06b", "#ffffff", "circle"],
      [0.6, 0.32, "#d63b2f", "#ffd34d", "rect"],
      [0.85, 0.34, "#ffffff", "#333333", "rect"],
      [0.3, 0.52, "#ffffff", "#2b2b2b", "rect"],
    ];
    for (const [x, y, fill, mark, shape] of items) {
      g.fillStyle = fill;
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 3;
      g.beginPath();
      if (shape === "circle") g.arc(x * w, y * h, 40, 0, Math.PI * 2);
      else if (shape === "rect") g.roundRect(x * w - 38, y * h - 46, 76, 92, 10);
      else for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? 20 : 44;
        g.lineTo(x * w + Math.cos(a) * rr, y * h + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = mark;
      g.beginPath();
      g.arc(x * w, y * h, 14, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** A framed print above the bed: warm arches and a low sun. */
export function print(variant: number) {
  return make(`print-${variant}`, [400, 500], (g, w, h) => {
    g.fillStyle = "#efe5d4";
    g.fillRect(0, 0, w, h);
    const palette = variant ? ["#c86b45", "#e3a46f", "#7d8f6a"] : ["#7d8f6a", "#d9b48a", "#b5573b"];
    g.fillStyle = palette[1];
    g.beginPath();
    g.arc(w * 0.5, h * 0.62, w * 0.34, Math.PI, 0);
    g.lineTo(w * 0.84, h * 0.9);
    g.lineTo(w * 0.16, h * 0.9);
    g.fill();
    g.fillStyle = palette[0];
    g.beginPath();
    g.arc(w * (variant ? 0.62 : 0.38), h * 0.34, w * 0.12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = palette[2];
    g.fillRect(w * 0.16, h * 0.82, w * 0.68, h * 0.08);
  });
}

/** Book spines for the shelves, as one strip. */
export function spines(seed: number) {
  return make(`spines-${seed}`, [512, 128], (g, w, h) => {
    const r = rand(seed);
    const colors = ["#7b4b3a", "#3f5a4a", "#c8a46a", "#2f3e5c", "#a65a3a", "#d8cfbd", "#5b4e7a", "#8a8f5a"];
    let x = 0;
    while (x < w) {
      const bw = 14 + r() * 26;
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.fillRect(x, h * (0.1 + r() * 0.15), bw - 2, h);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x + bw * 0.3, h * 0.45, bw * 0.35, 3);
      x += bw;
    }
  });
}

/** The laptop's screen: a dim editor-like page. */
export function screen() {
  return make("screen", [512, 320], (g, w, h) => {
    g.fillStyle = "#1d2230";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a3144";
    g.fillRect(0, 0, w, 22);
    const r = rand(5);
    for (let y = 40; y < h - 10; y += 14) {
      let x = 20 + Math.floor(r() * 3) * 16;
      while (x < w * (0.5 + r() * 0.4)) {
        const len = 20 + r() * 60;
        g.fillStyle = ["#e0a96d", "#8fb6e0", "#a9d18e", "#c9c9d4"][Math.floor(r() * 4)];
        g.fillRect(x, y, len, 5);
        x += len + 8;
      }
    }
  });
}
