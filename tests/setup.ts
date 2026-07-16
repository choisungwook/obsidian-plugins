// Plugin code uses window.setTimeout for Obsidian popout-window compatibility;
// vitest runs in a node environment where window does not exist.
const globals = globalThis as { window?: unknown };
if (typeof globals.window === "undefined") {
  globals.window = globalThis;
}

export {};
