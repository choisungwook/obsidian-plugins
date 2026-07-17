import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { readFileSync } from "node:fs";

const production = process.argv[2] === "production";
// Obsidian verifies each release asset's attestation against the release
// tag's commit. Identical main.js bytes across versions accumulate
// attestations from multiple commits under one digest, which fails that
// verification — embed the version so every release's main.js is unique.
const { version } = JSON.parse(readFileSync("manifest.json", "utf8"));

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
  ],
  banner: { js: `/* akbun-notion-sync ${version} */` },
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (production) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
