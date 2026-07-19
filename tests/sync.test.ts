import { describe, expect, it } from "vitest";
import {
  computeHash,
  isPathInScope,
  parseSyncFolders,
  planSync,
  syncCutoff,
  SyncState,
} from "../src/sync";

describe("computeHash", () => {
  it("returns the sha256 hex digest", () => {
    expect(computeHash("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("changes when content changes", () => {
    expect(computeHash("a")).not.toBe(computeHash("b"));
  });
});

describe("planSync", () => {
  const state: SyncState = {
    pages: {
      "unchanged.md": { hash: computeHash("same"), pageId: "p1" },
      "changed.md": { hash: computeHash("old"), pageId: "p2" },
      "deleted.md": { hash: computeHash("gone"), pageId: "p3" },
    },
  };

  it("classifies creates, updates, and archives", () => {
    const current = {
      "unchanged.md": computeHash("same"),
      "changed.md": computeHash("new"),
      "brand-new.md": computeHash("fresh"),
    };
    const plan = planSync(current, state);
    expect(plan.creates).toEqual(["brand-new.md"]);
    expect(plan.updates).toEqual(["changed.md"]);
    expect(plan.archives).toEqual(["deleted.md"]);
  });

  it("returns an empty plan when nothing changed", () => {
    const current = {
      "unchanged.md": computeHash("same"),
      "changed.md": computeHash("old"),
      "deleted.md": computeHash("gone"),
    };
    const plan = planSync(current, state);
    expect(plan).toEqual({ creates: [], updates: [], archives: [] });
  });

  it("does not archive files excluded from current but still in the vault", () => {
    const current = { "changed.md": computeHash("new") };
    const vaultPaths = new Set(["changed.md", "unchanged.md", "deleted.md"]);
    const plan = planSync(current, state, vaultPaths);
    expect(plan.updates).toEqual(["changed.md"]);
    expect(plan.archives).toEqual([]);
  });

  it("archives files missing from the vault even when current is filtered", () => {
    const current = {};
    const vaultPaths = new Set(["unchanged.md", "changed.md"]);
    const plan = planSync(current, state, vaultPaths);
    expect(plan.archives).toEqual(["deleted.md"]);
  });

  it("does not archive state entries outside the sync folders", () => {
    const scoped: SyncState = {
      pages: {
        "notes/kept.md": { hash: computeHash("a"), pageId: "p1" },
        "outside/old.md": { hash: computeHash("b"), pageId: "p2" },
      },
    };
    const plan = planSync({}, scoped, new Set(), ["notes"]);
    expect(plan.archives).toEqual(["notes/kept.md"]);
  });
});

describe("parseSyncFolders", () => {
  it("splits on commas, trims whitespace and slashes, drops empties", () => {
    expect(parseSyncFolders(" notes , /work/projects/ , , ")).toEqual(["notes", "work/projects"]);
  });

  it("deduplicates entries", () => {
    expect(parseSyncFolders("notes, notes/")).toEqual(["notes"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseSyncFolders("")).toEqual([]);
    expect(parseSyncFolders("  ")).toEqual([]);
  });
});

describe("isPathInScope", () => {
  it("includes everything when no folders are configured", () => {
    expect(isPathInScope("anywhere/note.md", [])).toBe(true);
  });

  it("matches files under a configured folder", () => {
    expect(isPathInScope("notes/a.md", ["notes"])).toBe(true);
    expect(isPathInScope("notes/deep/b.md", ["notes"])).toBe(true);
    expect(isPathInScope("work/projects/c.md", ["notes", "work/projects"])).toBe(true);
  });

  it("does not match sibling folders sharing a prefix", () => {
    expect(isPathInScope("notes-archive/a.md", ["notes"])).toBe(false);
    expect(isPathInScope("work/projects-old/c.md", ["work/projects"])).toBe(false);
  });

  it("excludes files outside every configured folder", () => {
    expect(isPathInScope("misc/a.md", ["notes"])).toBe(false);
  });
});

describe("syncCutoff", () => {
  const now = 1_700_000_000_000;

  it("subtracts whole days from now", () => {
    expect(syncCutoff(now, 1)).toBe(now - 24 * 60 * 60 * 1000);
    expect(syncCutoff(now, 7)).toBe(now - 7 * 24 * 60 * 60 * 1000);
  });

  it("returns 0 when the window is disabled", () => {
    expect(syncCutoff(now, 0)).toBe(0);
  });
});
