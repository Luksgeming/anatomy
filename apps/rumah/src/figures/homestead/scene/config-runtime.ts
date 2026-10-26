// The config the scene build runs with: the file named by HS_CONFIG, else data/homestead.json, else the defaults.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, sanitize, type HomesteadConfig } from "../config.ts";

export const CONFIG_FILE = join(process.cwd(), "data", "homestead.json");

function load(): HomesteadConfig {
  const path = process.env.HS_CONFIG || CONFIG_FILE;
  if (!existsSync(path)) return DEFAULT_CONFIG;
  return sanitize(JSON.parse(readFileSync(path, "utf8")));
}

export const CONFIG = load();
