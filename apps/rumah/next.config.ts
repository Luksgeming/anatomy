import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared kit lives in packages/iso-kit as plain ESM; let Next compile it with the app.
  transpilePackages: ["@anatomy/iso-kit"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
