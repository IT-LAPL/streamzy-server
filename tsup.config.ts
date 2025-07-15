import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"], // simpler for Node (uses require)
  target: "node18",
  bundle: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  outDir: "dist",
  outExtension: () => ({ js: ".cjs" }),
  noExternal: [/./]
});
