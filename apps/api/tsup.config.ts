import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [/^@bondery\//],
  external: ["adm-zip", "ioredis", "sharp"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
