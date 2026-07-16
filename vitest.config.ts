import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      obsidian: resolve(__dirname, "tests/obsidian-mock.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
