import { randomBytes } from "crypto";
import { createServer, Server } from "http";
import { join } from "path";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type NotionSyncPlugin from "./main";
import { buildAuthorizationUrl, exchangeOAuthCode } from "./notion-client";
import { CONFIG_DIR, readJsonFile, writeJsonFile } from "./sync";

const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");
const OAUTH_PORT = 43110;
const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_PORT}/callback`;

export type AuthMethod = "token" | "oauth";

export interface NotionSyncSettings {
  parentPageId: string;
  authMethod: AuthMethod;
  oauthClientId: string;
  syncFolders: string;
  syncIntervalMinutes: number;
  syncModifiedWithinDays: number;
  lastSyncAt: number | null;
  lastSyncSummary: string;
}

export const DEFAULT_SETTINGS: NotionSyncSettings = {
  parentPageId: "",
  authMethod: "token",
  oauthClientId: "",
  syncFolders: "",
  syncIntervalMinutes: 0,
  syncModifiedWithinDays: 1,
  lastSyncAt: null,
  lastSyncSummary: "",
};

interface Credentials {
  integrationToken?: string;
  oauthClientSecret?: string;
  oauthAccessToken?: string;
  oauthWorkspaceName?: string;
}

export async function loadCredentials(): Promise<Credentials> {
  return readJsonFile<Credentials>(CREDENTIALS_FILE, {});
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await writeJsonFile(CREDENTIALS_FILE, credentials);
}

export async function resolveToken(method: AuthMethod): Promise<string | null> {
  const credentials = await loadCredentials();
  const token = method === "token" ? credentials.integrationToken : credentials.oauthAccessToken;
  return token || null;
}

function waitForOAuthCallback(server: Server, expectedState: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for the OAuth callback"));
    }, timeoutMs);

    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", OAUTH_REDIRECT_URI);
      if (url.pathname !== "/callback") {
        response.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const stateMismatch = url.searchParams.get("state") !== expectedState;
      const failed = Boolean(error) || !code || stateMismatch;
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(
        failed
          ? "<h3>Authorization failed. You can close this tab.</h3>"
          : "<h3>Authorized. You can close this tab and return to Obsidian.</h3>"
      );
      window.clearTimeout(timer);
      server.close();
      if (stateMismatch) {
        reject(new Error("OAuth state mismatch — possible CSRF, aborting"));
      } else if (error || !code) {
        reject(new Error(error ?? "No authorization code received"));
      } else {
        resolve(code);
      }
    });
  });
}

async function runOAuthFlow(clientId: string, clientSecret: string): Promise<Credentials> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(OAUTH_PORT, "127.0.0.1", resolve);
  });

  const state = randomBytes(16).toString("hex");
  const callback = waitForOAuthCallback(server, state, 5 * 60 * 1000);
  window.open(buildAuthorizationUrl(clientId, OAUTH_REDIRECT_URI, state));
  const code = await callback;
  const token = await exchangeOAuthCode(clientId, clientSecret, code, OAUTH_REDIRECT_URI);

  const credentials = await loadCredentials();
  credentials.oauthClientSecret = clientSecret;
  credentials.oauthAccessToken = token.access_token;
  credentials.oauthWorkspaceName = token.workspace_name;
  await saveCredentials(credentials);
  return credentials;
}

export class NotionSyncSettingTab extends PluginSettingTab {
  private pendingClientSecret = "";

  constructor(app: App, private plugin: NotionSyncPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Notion parent page ID")
      .setDesc("Synced notes are created as child pages of this Notion page.")
      .addText((text) =>
        text
          .setPlaceholder("e.g. 1a2b3c4d5e6f...")
          .setValue(this.plugin.settings.parentPageId)
          .onChange(async (value) => {
            this.plugin.settings.parentPageId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Folders to sync")
      .setDesc(
        "Comma-separated vault folder paths (e.g. notes, work/projects). Empty syncs the whole vault. Notes outside these folders are never created, updated, or archived."
      )
      .addText((text) =>
        text
          .setPlaceholder("e.g. notes, work/projects")
          .setValue(this.plugin.settings.syncFolders)
          .onChange(async (value) => {
            this.plugin.settings.syncFolders = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Authentication method")
      .setDesc("Credentials are stored in ~/.config/akbun-notion-sync/credentials.json, never inside the vault.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("token", "Integration token")
          .addOption("oauth", "OAuth")
          .setValue(this.plugin.settings.authMethod)
          .onChange(async (value) => {
            this.plugin.settings.authMethod = value as AuthMethod;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.authMethod === "token") {
      this.renderIntegrationToken(
        new Setting(containerEl)
          .setName("Integration token")
          .setDesc("Internal integration secret from notion.so/my-integrations.")
      );
    } else {
      new Setting(containerEl)
        .setName("OAuth client ID")
        .setDesc(`Register ${OAUTH_REDIRECT_URI} as the redirect URI in your Notion public integration.`)
        .addText((text) =>
          text.setValue(this.plugin.settings.oauthClientId).onChange(async (value) => {
            this.plugin.settings.oauthClientId = value.trim();
            await this.plugin.saveSettings();
          })
        );
      this.renderOAuthClientSecret(
        new Setting(containerEl)
          .setName("OAuth client secret")
          .setDesc("Only needed when connecting; stored outside the vault afterwards.")
      );
      this.renderConnectButton(
        new Setting(containerEl)
          .setName("Connect to Notion")
          .setDesc("Opens the Notion authorization page in your browser.")
      );
    }

    new Setting(containerEl)
      .setName("Sync interval (minutes)")
      .setDesc("0 disables automatic sync; use the Sync now button or command instead.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "1";
        text.setValue(String(this.plugin.settings.syncIntervalMinutes)).onChange(async (value) => {
          const minutes = Number(value);
          this.plugin.settings.syncIntervalMinutes =
            Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
          await this.plugin.saveSettings();
          this.plugin.rescheduleAutoSync();
        });
      });

    new Setting(containerEl)
      .setName("Sync files modified within (days)")
      .setDesc("Only files modified within this many days are synced. 0 syncs every file. Files outside the window are left untouched, not archived.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "1";
        text.setValue(String(this.plugin.settings.syncModifiedWithinDays)).onChange(async (value) => {
          const days = Number(value);
          this.plugin.settings.syncModifiedWithinDays =
            Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
          await this.plugin.saveSettings();
        });
      });

    this.renderSyncNow(
      new Setting(containerEl)
        .setName("Sync now")
        .setDesc(`Last sync: ${this.lastSyncDescription()}`)
    );
  }

  private lastSyncDescription(): string {
    return this.plugin.settings.lastSyncAt
      ? `${new Date(this.plugin.settings.lastSyncAt).toLocaleString()} — ${this.plugin.settings.lastSyncSummary}`
      : "Never synced";
  }

  private renderIntegrationToken(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("secret_...").onChange(async (value) => {
        const credentials = await loadCredentials();
        credentials.integrationToken = value.trim();
        await saveCredentials(credentials);
      });
      void loadCredentials().then((credentials) => {
        if (credentials.integrationToken) {
          text.setValue(credentials.integrationToken);
        }
      });
    });
  }

  private renderOAuthClientSecret(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("secret_...").onChange((value) => {
        this.pendingClientSecret = value.trim();
      });
      void loadCredentials().then((credentials) => {
        if (credentials.oauthClientSecret) {
          this.pendingClientSecret = credentials.oauthClientSecret;
          text.setValue(credentials.oauthClientSecret);
        }
      });
    });
  }

  private renderConnectButton(setting: Setting): void {
    setting.addButton((button) =>
      button
        .setButtonText("Connect")
        .setCta()
        .onClick(async () => {
          const clientId = this.plugin.settings.oauthClientId;
          if (!clientId || !this.pendingClientSecret) {
            new Notice("Enter the OAuth client ID and client secret first");
            return;
          }
          button.setDisabled(true);
          try {
            const credentials = await runOAuthFlow(clientId, this.pendingClientSecret);
            new Notice(
              `Connected to Notion${credentials.oauthWorkspaceName ? ` (${credentials.oauthWorkspaceName})` : ""}`
            );
          } catch (error) {
            new Notice(`Notion OAuth failed: ${(error as Error).message}`);
          } finally {
            button.setDisabled(false);
          }
        })
    );
  }

  private renderSyncNow(setting: Setting): void {
    setting.addButton((button) =>
      button
        .setButtonText("Sync now")
        .setCta()
        .onClick(async () => {
          button.setDisabled(true);
          try {
            await this.plugin.syncNow();
          } finally {
            button.setDisabled(false);
            this.display();
          }
        })
    );
  }
}
