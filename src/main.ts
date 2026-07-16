import { Notice, Plugin } from "obsidian";
import { NotionClient } from "./notion-client";
import {
  DEFAULT_SETTINGS,
  NotionSyncSettings,
  NotionSyncSettingTab,
  resolveToken,
} from "./settings";
import { SyncEngine } from "./sync";

export default class NotionSyncPlugin extends Plugin {
  settings: NotionSyncSettings = DEFAULT_SETTINGS;
  private autoSyncTimer: number | null = null;
  private engine: SyncEngine | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new NotionSyncSettingTab(this.app, this));

    this.addCommand({
      id: "sync-now",
      name: "Sync vault to Notion",
      callback: () => this.syncNow(),
    });

    this.addRibbonIcon("refresh-cw", "Sync vault to Notion", () => this.syncNow());
    this.rescheduleAutoSync();
  }

  onunload(): void {
    this.clearAutoSync();
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<NotionSyncSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  rescheduleAutoSync(): void {
    this.clearAutoSync();
    const minutes = this.settings.syncIntervalMinutes;
    if (minutes <= 0) return;
    this.autoSyncTimer = window.setInterval(() => {
      void this.syncNow(true);
    }, minutes * 60 * 1000);
    this.registerInterval(this.autoSyncTimer);
  }

  private clearAutoSync(): void {
    if (this.autoSyncTimer !== null) {
      window.clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  async syncNow(silent = false): Promise<void> {
    if (this.engine?.isRunning) {
      if (!silent) new Notice("Notion sync is already running");
      return;
    }
    if (!this.settings.parentPageId) {
      if (!silent) new Notice("Set the Notion parent page ID in settings first");
      return;
    }
    const token = await resolveToken(this.settings.authMethod);
    if (!token) {
      if (!silent) new Notice("No Notion credentials found — configure authentication in settings");
      return;
    }

    this.engine = new SyncEngine(this.app.vault, new NotionClient(token), this.settings.parentPageId);
    try {
      const result = await this.engine.run();
      this.settings.lastSyncSummary =
        `${result.created} created, ${result.updated} updated, ${result.archived} archived` +
        (result.failed ? `, ${result.failed} failed` : "");
    } catch (error) {
      this.settings.lastSyncSummary = `failed: ${(error as Error).message}`;
      if (!silent) new Notice(`Notion sync failed: ${(error as Error).message}`);
    }
    this.settings.lastSyncAt = Date.now();
    await this.saveSettings();
  }
}
