import { createHash } from "crypto";
import { promises as fs } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { Notice, Vault } from "obsidian";
import { markdownToBlocks, NotionClient } from "./notion-client";

export const CONFIG_DIR = join(homedir(), ".config", "akbun-notion-sync");
const STATE_FILE = join(CONFIG_DIR, "sync-state.json");

export interface PageState {
  hash: string;
  pageId: string;
}

export interface SyncState {
  pages: Record<string, PageState>;
}

export interface SyncPlan {
  creates: string[];
  updates: string[];
  archives: string[];
}

export interface SyncResult {
  created: number;
  updated: number;
  archived: number;
  failed: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function syncCutoff(now: number, modifiedWithinDays: number): number {
  return modifiedWithinDays > 0 ? now - modifiedWithinDays * MS_PER_DAY : 0;
}

export function parseSyncFolders(input: string): string[] {
  const folders = input
    .split(",")
    .map((entry) => entry.trim().replace(/^\/+|\/+$/g, ""))
    .filter((entry) => entry.length > 0);
  return [...new Set(folders)];
}

export function isPathInScope(path: string, folders: string[]): boolean {
  if (folders.length === 0) return true;
  return folders.some((folder) => path === folder || path.startsWith(`${folder}/`));
}

export function planSync(
  current: Record<string, string>,
  state: SyncState,
  vaultPaths: Set<string> = new Set(Object.keys(current)),
  folders: string[] = []
): SyncPlan {
  const plan: SyncPlan = { creates: [], updates: [], archives: [] };
  for (const [path, hash] of Object.entries(current)) {
    const known = state.pages[path];
    if (!known) {
      plan.creates.push(path);
    } else if (known.hash !== hash) {
      plan.updates.push(path);
    }
  }
  for (const path of Object.keys(state.pages)) {
    if (!vaultPaths.has(path) && isPathInScope(path, folders)) {
      plan.archives.push(path);
    }
  }
  return plan;
}

export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await fs.writeFile(path, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.chmod(path, 0o600);
}

export async function loadSyncState(): Promise<SyncState> {
  return readJsonFile<SyncState>(STATE_FILE, { pages: {} });
}

export async function saveSyncState(state: SyncState): Promise<void> {
  await writeJsonFile(STATE_FILE, state);
}

function pageTitle(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/, "");
}

export class SyncEngine {
  private running = false;

  constructor(
    private vault: Vault,
    private client: NotionClient,
    private parentPageId: string,
    private modifiedWithinDays: number,
    private syncFolders: string[]
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  async run(): Promise<SyncResult> {
    if (this.running) {
      throw new Error("Sync already in progress");
    }
    this.running = true;
    try {
      return await this.execute();
    } finally {
      this.running = false;
    }
  }

  private async execute(): Promise<SyncResult> {
    const state = await loadSyncState();
    const files = this.vault.getMarkdownFiles();
    const contents = new Map<string, string>();
    const current: Record<string, string> = {};
    const vaultPaths = new Set<string>();
    const cutoff = syncCutoff(Date.now(), this.modifiedWithinDays);

    for (const file of files) {
      if (!isPathInScope(file.path, this.syncFolders)) continue;
      vaultPaths.add(file.path);
      if (file.stat.mtime < cutoff) continue;
      const content = await this.vault.cachedRead(file);
      contents.set(file.path, content);
      current[file.path] = computeHash(content);
    }

    const plan = planSync(current, state, vaultPaths, this.syncFolders);
    const total = plan.creates.length + plan.updates.length + plan.archives.length;
    const result: SyncResult = { created: 0, updated: 0, archived: 0, failed: 0 };

    if (total === 0) {
      new Notice("Notion sync: everything is up to date");
      return result;
    }

    const progress = new Notice(`Notion sync: 0/${total}`, 0);
    try {
      await this.applyPlan(plan, contents, current, state, result, progress, total);
    } finally {
      progress.hide();
    }

    new Notice(
      `Notion sync done: ${result.created} created, ${result.updated} updated, ` +
        `${result.archived} archived${result.failed ? `, ${result.failed} failed` : ""}`
    );
    return result;
  }

  private async applyPlan(
    plan: SyncPlan,
    contents: Map<string, string>,
    current: Record<string, string>,
    state: SyncState,
    result: SyncResult,
    progress: Notice,
    total: number
  ): Promise<void> {
    let done = 0;
    const tick = () => {
      done += 1;
      progress.setMessage(`Notion sync: ${done}/${total}`);
    };

    for (const path of plan.creates) {
      try {
        const blocks = markdownToBlocks(contents.get(path) ?? "");
        const pageId = await this.client.createPage(this.parentPageId, pageTitle(path), blocks);
        state.pages[path] = { hash: current[path], pageId };
        result.created += 1;
      } catch (error) {
        console.error(`Notion sync: failed to create ${path}`, error);
        result.failed += 1;
      }
      tick();
    }

    for (const path of plan.updates) {
      try {
        const blocks = markdownToBlocks(contents.get(path) ?? "");
        await this.client.updatePage(state.pages[path].pageId, pageTitle(path), blocks);
        state.pages[path] = { hash: current[path], pageId: state.pages[path].pageId };
        result.updated += 1;
      } catch (error) {
        console.error(`Notion sync: failed to update ${path}`, error);
        result.failed += 1;
      }
      tick();
    }

    for (const path of plan.archives) {
      try {
        await this.client.archivePage(state.pages[path].pageId);
        delete state.pages[path];
        result.archived += 1;
      } catch (error) {
        console.error(`Notion sync: failed to archive ${path}`, error);
        result.failed += 1;
      }
      tick();
    }

    await saveSyncState(state);
  }
}
