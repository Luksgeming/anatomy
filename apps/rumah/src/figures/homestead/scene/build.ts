// Builds the tropical homestead scene: every part, settled painter's keys, the audit, and the JSON the page renders.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { A, P, R, V, at, k, under } from "./core.ts";
import { stand } from "./stand.ts";
import { house } from "./house.ts";
import { interior } from "./interior.ts";
import { roof } from "./roof.ts";
import { coop, HEN_SPOTS } from "./coop.ts";
import { carport, fences, ornamental, path } from "./garden.ts";
import { food } from "./food.ts";
import { BACK_ROW, BEDS, CARPORT, CARPORT_Z, COOP, DRYING, EAVE, F1, F2, FRONT_Y, H, HOMESTEAD, HOUSE, IN, PIECES, RIGHT_X, SPRING, STAGGER, TERRACE, W } from "./world.ts";
import { glCamera } from "@anatomy/iso-kit/gl.mjs";
import { statsOf } from "../model.ts";
import { CONFIG } from "./config-runtime.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.HS_OUT || join(HERE, "..", "generated");
const started = Date.now();

stand();
house();
interior();
roof();
carport();
fences();
path();
ornamental();
food();
coop();

const fast = process.argv.includes("--fast");
A.settle(R, P, fast ? { states: [0, 1] } : {});
R.items.sort((a: { key: number }, b: { key: number }) => a.key - b.key);

const unit = (v: [number, number, number]) => {
  const o = at([0, 0, 0]);
  const p = at(v);
  return [+(p[0] - o[0]).toFixed(5), +(p[1] - o[1]).toFixed(5)];
};

// Colour mode: each item gets a material class from its name; homestead.css colours the material when [data-color] is on.
const MATERIALS: [RegExp, string][] = [
  [/^roof\.(back|left|front|right|ridge|hip)/, "roof"],
  [/facade-stone|porch-plinth|porch$|porch-step/, "stone"],
  [/facade-wood|porch-bench/, "wood"],
  [/porch-(roof|column)/, "trim"],
  [/^roof\.|downpipe|canopy|carport-roof|carport-post|carport-base/, "trim"],
  [/window|terrace-column|terrace-base|balcony-(post|rail|curb)/, "trim"],
  [/facade|stub|\.wall|sill|threshold/, "wall"],
  [/shade$|-shade#|-shade\b|bracket/, "wood"],
  [/foundation|slab-|balcony-slab|stoop|\.step/, "floor"],
  [/terrace|stair|newel|baluster|handrail/, "wood"],
  [/sofa|cushion/, "fabric"],
  [/duvet/, "fabric2"],
  [/mattress|pillow/, "linen"],
  [/\.rug/, "rug"],
  [/\.tv\b|stove|motorcycle/, "dark"],
  [/fridge|washer|toilet|cistern|tub\b|shower-(tray|riser|head)/, "appliance"],
  [/worktop|wet-top|island-top|vanity-top|tray/, "stone"],
  [/\.pot\b|lamp-base|lpg/, "clay"],
  [/\.(table|leg|seat|chair-back|cabinet|counter|wall-cabinet|wardrobe|nightstand|headboard|bed-frame|shelf|board|door|tv-cabinet|book|vanity|island|shoe|linen|wet-counter|tub-base|stool)/, "wood"],
  [/yard\.(paver|tank-pad|drain|soakaway|compost-pad|drying-gravel)/, "stone"],
  [/yard\.pavers/, "grass"],
  [/yard\.car\d/, "car"],
  [/coop-roof|shed-roof/, "roof2"],
  [/coop|nest|ramp|run-|mesh|yard\.bed|compost|fence|gate|mailbox-post|post-cap|herb-box|shed|drying-(post|arm)|bed-tag/, "wood"],
  [/tank/, "tank"],
  [/hen/, "hen"],
  [/tree|shrub|fruit-/, "bark"],
  [/lamp|lantern|mailbox/, "iron"],
  [/leaves|veg|herbs/, "leaf"],
];
const materialOf = (name: string) => MATERIALS.find(([re]) => re.test(name))?.[1];

// Hotspots: what a reader can hover for an info card and click to act on. House items get their room
// from where they stand; structure (walls, slabs, roof) belongs to the house as a whole.
const HOTSPOTS: [RegExp, string][] = [
  [/ground\.door/, "door"],
  [/yard\.hen/, "hen"],
  [/yard\.car\d/, "car"],
  [/yard\.motorcycle/, "motorcycle"],
  [/yard\.(carport|pavers)/, "carport"],
  [/yard\.(bed|veg)/, "beds"],
  [/yard\.herb/, "herbs"],
  [/yard\.fruit-/, "fruits"],
  [/yard\.(drying|washing)/, "drying"],
  [/yard\.(coop|nest|ramp|run-|mesh|feeder|waterer)/, "coop"],
  [/yard\.compost/, "compost"],
  [/yard\.shed/, "shed"],
  [/yard\.homestead/, "homestead"],
  [/yard\.(tank|drain|soakaway)|downpipe|gutter/, "water"],
  [/yard\.(lamp|lantern)/, "lamps"],
  [/yard\.(shade-tree|shrub)/, "trees"],
  [/terrace|balcony/, "terrace"],
];
const FURNITURE = /\.(shade-|lamp|sofa|cushion|table|leg|seat|chair|cup|tv|shelf|book|board|pot|leaves|rug|counter|worktop|tap|cabinet|fridge|fruit|bed|mattress|duvet|pillow|headboard|nightstand|wardrobe|stair|baluster|handrail|newel|island|stool|toilet|cistern|shower|vanity|mirror|washer|tub|basket|stove|lpg|wet-|linen|shoe)/;
const inside = (x: number, [a, b]: readonly number[]) => x >= a && x < b;
function hotspotOf(name: string, piece: string, center?: number[]) {
  const hit = HOTSPOTS.find(([re]) => re.test(name))?.[1];
  if (hit) return hit;
  if ((piece === "ground" || piece === "upper") && center && FURNITURE.test(name)) {
    const [x, y] = center;
    const front = y > BACK_ROW;
    if (piece === "ground") {
      if (front) return x < -40 ? "living" : "kitchen";
      if (inside(x, [-190, -150])) return "bath";
      if (inside(x, [-75, -10])) return "wetkitchen";
      if (inside(x, [-10, 50])) return "laundry";
      return "house";
    }
    if (front) return x < -80 ? "master" : "bed2";
    if (inside(x, [-190, -150])) return "master";
    if (inside(x, [-10, 50])) return "bed2";
    return "house";
  }
  if (piece === "ground" || piece === "upper" || piece === "roof") return "house";
  return undefined;
}
const STATE_CLASS: [RegExp, string][] = [
  [/^ground\.door-closed/, "hs-door-closed"],
  [/^ground\.door$/, "hs-door-open"],
  [/^(ground|upper)\.facade/, "hs-facade"],
  [/^yard\.veg-/, "hs-plant"],
];
const shade = (name: string) => name.match(/\.shade-([a-z0-9]+)/)?.[1];

interface Item { svg: string; key: number; piece: string; move: number[]; layer?: string; name: string; center?: number[] }
const wrap = (item: Item) => {
  const classes = [materialOf(item.name) && `hs-m-${materialOf(item.name)}`, STATE_CLASS.find(([re]) => re.test(item.name))?.[1]].filter(Boolean).join(" ");
  const room = shade(item.name);
  return classes || room ? `<g${classes ? ` class="${classes}"` : ""}${room ? ` data-lamp-room="${room}"` : ""}>${item.svg}</g>` : item.svg;
};
const items = (R.items as Item[]).map((item) => ({ svg: wrap(item), hot: hotspotOf(item.name, item.piece, item.center), key: +item.key.toFixed(3), piece: item.piece, move: item.move, layer: "back", kind: item.layer ?? "", name: item.name }));

// Screen box of the house (assembled), where hovering lifts the floors.
const houseBox = (() => {
  const pts = [HOUSE.x - 8, HOUSE.x + HOUSE.w + 8].flatMap((x) => [HOUSE.y - 8, HOUSE.y + HOUSE.d + 8].flatMap((y) => [0, EAVE + 40].map((z) => at([x, y, z]))));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => +v.toFixed(1));
})();

// Focus views: each area's world box, projected and grown to the figure's aspect, with the house level it needs
// (1 lifts the roof for the bedrooms, 2 also lifts the upper floor for the ground-floor rooms).
const focusRect = (min: [number, number, number], max: [number, number, number], pad = 0.14) => {
  const pts = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => at([x, y, z]))));
  let x0 = Math.min(...pts.map((p) => p[0]));
  let y0 = Math.min(...pts.map((p) => p[1]));
  let w = Math.max(...pts.map((p) => p[0])) - x0;
  let h = Math.max(...pts.map((p) => p[1])) - y0;
  x0 -= w * pad;
  y0 -= h * pad;
  w *= 1 + pad * 2;
  h *= 1 + pad * 2;
  if (w / h > W / H) {
    const grow = (w * H) / W - h;
    y0 -= grow / 2;
    h += grow;
  } else {
    const grow = (h * W) / H - w;
    x0 -= grow / 2;
    w += grow;
  }
  return [x0, y0, w, h].map((v) => +v.toFixed(1)) as [number, number, number, number];
};
const focus = [
  { id: "all", label: "Semua", rect: [0, 0, W, H], level: 0 },
  { id: "living", label: "Ruang keluarga", rect: focusRect([IN.x, BACK_ROW, F1], [-40, FRONT_Y, F1 + 40]), level: 2 },
  { id: "kitchen", label: "Dapur & servis", rect: focusRect([-75, IN.y, F1], [RIGHT_X, FRONT_Y, F1 + 40]), level: 2 },
  { id: "master", label: "Kamar utama", rect: focusRect([IN.x, IN.y, F2], [-80, FRONT_Y, F2 + 40]), level: 1 },
  { id: "bed2", label: "Kamar 2", rect: focusRect([-80, IN.y, F2], [TERRACE.x + TERRACE.w, FRONT_Y, F2 + 40]), level: 1 },
  { id: "carport", label: "Carport", rect: focusRect([CARPORT.x, CARPORT.y, 0], [CARPORT.x + CARPORT.w, CARPORT.y + CARPORT.d, CARPORT_Z]), level: 0 },
  { id: "garden", label: "Kebun pangan", rect: focusRect([BEDS.x - 6, BEDS.y - 6, 0], [BEDS.x + 2 * BEDS.w + BEDS.gapX + 4, BEDS.y + 3 * BEDS.d + 2 * BEDS.gapY + 6, 30]), level: 0 },
  { id: "homestead", label: "Kandang & kompos", rect: focusRect([HOMESTEAD.x, HOMESTEAD.y, 0], [HOMESTEAD.x + HOMESTEAD.w, HOMESTEAD.y + HOMESTEAD.d, 44]), level: 0 },
  { id: "drying", label: "Jemur & tandon", rect: focusRect([DRYING.x - 6, -230, 0], [DRYING.x + DRYING.w + 6, DRYING.y + DRYING.d + 6, 40]), level: 0 },
];

const scene = {
  config: CONFIG,
  width: W,
  height: H,
  under: under.join(""),
  items,
  data: {
    V,
    EX: unit([1, 0, 0]),
    EY: unit([0, 1, 0]),
    EZ: unit([0, 0, 1]),
    pieces: Object.fromEntries(Object.entries(PIECES).map(([id, p]) => [id, { name: p.name, say: p.say }])),
    stagger: STAGGER,
    spring: SPRING,
    houseBox,
    hens: HEN_SPOTS,
    camera: glCamera(P),
    stats: statsOf(CONFIG),
    focus,
    // Where the hens walk to at dusk: the foot of the coop's ramp.
    coopDoor: [COOP.x + 7, COOP.y + COOP.d + 18],
  },
};

// HS_VIEW writes only a static, closed-pose SVG of this camera for the views and the blueprint sheets.
const VIEW = process.env.HS_VIEW;
if (VIEW) {
  // HS_PIECES keeps only some assemblies (a floor plan, the house without its yard); HS_OPEN drops the near facades
  // so the rooms show; HS_EXPLODE pulls the house apart into its layers, bottom to top, re-sorted like the live pose.
  const keep = process.env.HS_PIECES?.split(",");
  const open = Boolean(process.env.HS_OPEN);
  const explode = Boolean(process.env.HS_EXPLODE);
  const WALLISH = /\.(wall|facade|stub|window|sill|shade|bracket|door|threshold|downpipe)|porch-(roof|column|plinth)|terrace-(column|base)|canopy/;
  const lift = (item: (typeof items)[number]) => {
    if (!explode) return 0;
    if (item.piece === "roof") return 380;
    if (item.piece === "upper") return WALLISH.test(item.name) || /balcony-(post|rail|curb)/.test(item.name) ? 290 : 200;
    if (item.piece === "ground") return WALLISH.test(item.name) ? 90 : 0;
    return 0;
  };
  const o = at([0, 0, 0]);
  const u = at([0, 0, 1]);
  const shown = items
    .filter((item) => (!keep || keep.includes(item.piece)) && !(open && /^(ground|upper)\.facade/.test(item.name)) && !(explode && /downpipe|gutter/.test(item.name)))
    .map((item) => ({ item, dz: lift(item) }))
    .sort((a, b) => a.item.key + a.dz * V[2] - (b.item.key + b.dz * V[2]));
  const body = `<g class="hs-print-items">${shown.map(({ item, dz }) => `<g class="it" data-piece="${item.piece}" data-name="${item.name}"${item.hot ? ` data-h="${item.hot}"` : ""}${dz ? ` transform="translate(${((u[0] - o[0]) * dz).toFixed(2)} ${((u[1] - o[1]) * dz).toFixed(2)})"` : ""}>${item.svg}</g>`).join("")}</g>`;
  mkdirSync(join(OUT, "views"), { recursive: true });
  writeFileSync(join(OUT, "views", `${VIEW}.json`), JSON.stringify({ camera: glCamera(P), width: W, height: H }));
  const under = keep && !keep.includes("stand") ? "" : scene.under;
  writeFileSync(join(OUT, "views", `${VIEW}.svg`), k.figureSvg({ width: W, height: H, label: `Rumah tropis · ${VIEW}`, body: [under, body] }));
  console.log(`view ${VIEW} · azimuth ${process.env.HS_AZIMUTH ?? 45} · elevation ${process.env.HS_ELEVATION ?? 30} · ${((Date.now() - started) / 1000).toFixed(1)} s`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "scene.json"), JSON.stringify(scene));

// A static preview page for the verification tools (the product is the Next.js page).
// A static page for the verification tools and the blueprint PDF (the product is the Next.js page). Keys 0, 1 and 2
// pose the house closed, roof lifted and upper floor lifted, re-sorted the way the live page does it.
const groups = `<g class="hs-print-items">${items.map((item) => `<g class="it" data-piece="${item.piece}" data-name="${item.name}"${item.hot ? ` data-h="${item.hot}"` : ""} data-k="${item.key}" data-m="${item.move.join(",")}">${item.svg}</g>`).join("")}</g>`;
const POSE_SCRIPT = `
const D = ${JSON.stringify({ V, EX: scene.data.EX, EY: scene.data.EY, EZ: scene.data.EZ })};
const group = document.querySelector(".hs-print-items");
const nodes = [...group.children].map((el) => ({ el, k: +el.dataset.k, m: el.dataset.m.split(",").map(Number), piece: el.dataset.piece }));
for (const n of nodes) n.lift = n.m[0] * D.V[0] + n.m[1] * D.V[1] + n.m[2] * D.V[2];
function pose(level) {
  const share = { roof: level >= 1 ? 1 : 0, upper: level >= 2 ? 1 : 0 };
  for (const n of nodes) {
    const s = share[n.piece] || 0;
    if (!s) { n.el.removeAttribute("transform"); continue; }
    const tx = (D.EX[0] * n.m[0] + D.EY[0] * n.m[1] + D.EZ[0] * n.m[2]) * s;
    const ty = (D.EX[1] * n.m[0] + D.EY[1] * n.m[1] + D.EZ[1] * n.m[2]) * s;
    n.el.setAttribute("transform", "translate(" + tx.toFixed(2) + " " + ty.toFixed(2) + ")");
  }
  [...nodes].sort((a, b) => a.k + a.lift * (share[a.piece] || 0) - (b.k + b.lift * (share[b.piece] || 0))).forEach((n) => group.appendChild(n.el));
}
addEventListener("keydown", (event) => { if ("012".includes(event.key)) pose(+event.key); });
`;
console.log(`layers · back ${items.filter((i) => i.layer === "back").length} · front ${items.filter((i) => i.layer === "front").length}`);
const svg = k.figureSvg({ width: W, height: H, label: "Rumah tropis", body: [scene.under, groups] });
const plate = k.plateHtml({ fig: "Fig 1", title: "Rumah tropis", hint: "preview", readout: "", keys: [], caption: "", body: `<div class="iso-stage hs" tabindex="0">${svg}</div>` });
const css = readFileSync(join(HERE, "..", "homestead.css"), "utf8");
if (!process.env.HS_OUT) for (const theme of ["dark", "light"]) writeFileSync(join(OUT, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "Rumah tropis", theme, body: `<style>${css}</style>${plate}`, width: 1240, script: POSE_SCRIPT }));

console.log(`scene · ${items.length} items · ${R.solids.length} solids · ${R.tubes.length} tubes · ${(JSON.stringify(scene).length / 1024).toFixed(0)} KB · ${((Date.now() - started) / 1000).toFixed(1)} s`);
// Crowding pairs looked at in 8× close-ups: sub-pixel screen coincidences between lines far apart in depth.
const CROWD_OK = [["ground.handrail*", "ground.baluster*"], ["upper.balcony-rail*", "upper.balcony-post*"]];
const COVER_OK: string[] = [];
A.auditOrExit(R, P, { crowd: CROWD_OK, cover: COVER_OK });
