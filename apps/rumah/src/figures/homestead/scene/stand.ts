// The diorama base: feet, plinth, soil block with its lawn, a scale ruler and a label plate.
import { A, Dots, Ln, P, R, S, at, byDepth, k, under } from "./core.ts";
import { FOOT_H, PLINTH, PLINTH_H, PLOT, SOIL_H } from "./world.ts";

export function stand() {
  const zPlinth = -SOIL_H - PLINTH_H;
  const zFoot = zPlinth - FOOT_H;
  under.push(`<path class="iso-halo" d="${k.haloOf(PLINTH, zFoot, PLINTH_H + FOOT_H, P)}"/>`);
  for (const [x, y] of byDepth(k.corners(PLINTH, 26))) {
    under.push(S(k.cylinder(x, y, 9, zFoot, 1.6, P, 32), { tone: "lo" }));
    under.push(S(k.cylinder(x, y, 7, zFoot + 1.6, FOOT_H - 1.6, P, 32), { tone: "mid" }));
    R.solid(A.cylinder(x, y, 9, zFoot, FOOT_H, { name: R.nameFor("stand.foot") }));
  }
  under.push(S(k.slabOf(PLINTH, zPlinth, PLINTH_H, P, 8, 1.2), { tone: "mid", className: "hs-m-plinth", inner: Ln(k.sideSeam(PLINTH, zPlinth + 2, P, 8), { tone: "faint" }) }));
  R.solid(A.slab(PLINTH, zPlinth, PLINTH_H, { name: "stand.plinth" }));
  const screws = k.corners(PLINTH, 4);
  under.push(Ln(screws.map(([x, y]: number[]) => k.ring(x, y, 1.6, -SOIL_H, P, 16)).join(""), { tone: "lo" }));
  under.push(Dots(screws.map(([x, y]: number[]) => at([x, y, -SOIL_H])), { size: 0.5 }));

  const strata = [-SOIL_H + 4, -6, -2].map((z) => Ln(k.sideSeam(PLOT, z, P, 6), { tone: z === -2 ? "lo" : "faint" })).join("");
  under.push(S(k.slabOf(PLOT, -SOIL_H, SOIL_H, P, 6, 0.8), { tone: "lo", inner: strata, className: "hs-m-grass" }));
  R.solid(A.box([PLOT.x, PLOT.y, -SOIL_H], [PLOT.x + PLOT.w, PLOT.y + PLOT.d, 0], { name: "stand.soil" }));
  under.push(Ln(k.planOutline(k.insetPlan(PLOT, 3), 0, P, 6), { tone: "faint" }));

  const strip = { x: PLOT.x + 20, y: PLOT.y + PLOT.d + 1.2, w: 240, d: 5, r: 0.8 };
  under.push(S(k.slabOf(strip, -SOIL_H, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 0, strip.x + strip.w, 4, 5, strip.y + 0.4, -SOIL_H + 0.6, [1.6, 3], P);
  under.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));

  const label = { x: PLOT.x + PLOT.w + 1.5, y: PLOT.y + 40, w: 5.4, d: 46, r: 0.8 };
  under.push(S(k.slabOf(label, -SOIL_H, 0.8, P, 3), { tone: "lo" }));
  under.push(Ln(k.planOutline(k.insetPlan(label, 1), -SOIL_H + 0.8, P, 3), { tone: "faint" }));
  under.push(Ln([30, 22, 36].map((len, row) => k.onTop([[label.x + 1.8 + row * 1, label.y + 5], [label.x + 1.8 + row * 1, label.y + 5 + len]], -SOIL_H + 0.8, P)).join(""), { tone: "lo", free: true }));
  under.push(Dots([at([label.x + 2.7, label.y + 2.2, -SOIL_H + 0.8]), at([label.x + 2.7, label.y + label.d - 2.2, -SOIL_H + 0.8])], { size: 0.45 }));
}
