// What a reader may change about the tropical homestead, with the safe range of every value. The scene build
// reads this, the edit API asks Claude for a new one, and `sanitize` clamps whatever comes back before anything is built.

export const CROPS = ["cabai", "tomat", "bayam", "kangkung", "terong", "serai", "pandan"] as const;
export type Crop = (typeof CROPS)[number];
export const FRUITS = ["pepaya", "pisang", "jeruk nipis", "jambu"] as const;
export type Fruit = (typeof FRUITS)[number];

export interface HomesteadConfig {
  title: string;
  cars: number;
  motorcycles: number;
  hens: number;
  beds: Crop[];
  fruits: Fruit[];
  shadeTrees: number;
  lamps: number;
  balcony: boolean;
}

export const LIMITS = {
  titleChars: 40,
  cars: [0, 2],
  motorcycles: [0, 4],
  hens: [0, 6],
  beds: [0, 6],
  fruits: [0, 6],
  shadeTrees: [0, 3],
  lamps: [0, 4],
} as const;

export const DEFAULT_CONFIG: HomesteadConfig = {
  title: "Rumah tropis · homestead",
  cars: 2,
  motorcycles: 3,
  hens: 5,
  beds: ["cabai", "tomat", "bayam", "kangkung", "terong", "serai"],
  fruits: ["pepaya", "pisang", "jeruk nipis", "jambu"],
  shadeTrees: 3,
  lamps: 4,
  balcony: true,
};

const clamp = (value: unknown, [low, high]: readonly [number, number], fallback: number) => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(high, Math.max(low, Math.round(n)));
};
const listOf = <T extends string>(value: unknown, allowed: readonly T[], [, max]: readonly [number, number], fallback: T[]) =>
  Array.isArray(value) ? value.filter((v): v is T => allowed.includes(v as T)).slice(0, max) : fallback;

/** Any input, however wrong, becomes a valid config: unknown fields dropped, numbers clamped, lists filtered. */
export function sanitize(input: unknown): HomesteadConfig {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof HomesteadConfig, unknown>>;
  const d = DEFAULT_CONFIG;
  const title = typeof raw.title === "string" ? raw.title.replace(/[<>&"]/g, "").replace(/\s+/g, " ").trim().slice(0, LIMITS.titleChars) : "";
  return {
    title: title || d.title,
    cars: clamp(raw.cars, LIMITS.cars, d.cars),
    motorcycles: clamp(raw.motorcycles, LIMITS.motorcycles, d.motorcycles),
    hens: clamp(raw.hens, LIMITS.hens, d.hens),
    beds: listOf(raw.beds, CROPS, LIMITS.beds, d.beds),
    fruits: listOf(raw.fruits, FRUITS, LIMITS.fruits, d.fruits),
    shadeTrees: clamp(raw.shadeTrees, LIMITS.shadeTrees, d.shadeTrees),
    lamps: clamp(raw.lamps, LIMITS.lamps, d.lamps),
    balcony: typeof raw.balcony === "boolean" ? raw.balcony : d.balcony,
  };
}
