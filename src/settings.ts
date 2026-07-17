import { randomBytes } from "crypto";
import { createServer, Server } from "http";
import { join } from "path";
import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
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
  syncIntervalMinutes: number;
  lastSyncAt: number | null;
  lastSyncSummary: string;
}

export const DEFAULT_SETTINGS: NotionSyncSettings = {
  parentPageId: "",
  authMethod: "token",
  oauthClientId: "",
  syncIntervalMinutes: 0,
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

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Notion parent page ID",
        desc: "Synced notes are created as child pages of this Notion page.",
        control: { type: "text", key: "parentPageId", placeholder: "e.g. 1a2b3c4d5e6f..." },
      },
      {
        name: "Authentication method",
        desc: "Credentials are stored in ~/.config/akbun-notion-sync/credentials.json, never inside the vault.",
        control: {
          type: "dropdown",
          key: "authMethod",
          options: { token: "Integration token", oauth: "OAuth" },
        },
      },
      {
        name: "Integration token",
        desc: "Internal integration secret from notion.so/my-integrations.",
        visible: () => this.plugin.settings.authMethod === "token",
        render: (setting) => this.renderIntegrationToken(setting),
      },
      {
        name: "OAuth client ID",
        desc: `Register ${OAUTH_REDIRECT_URI} as the redirect URI in your Notion public integration.`,
        visible: () => this.plugin.settings.authMethod === "oauth",
        control: { type: "text", key: "oauthClientId" },
      },
      {
        name: "OAuth client secret",
        desc: "Only needed when connecting; stored outside the vault afterwards.",
        visible: () => this.plugin.settings.authMethod === "oauth",
        render: (setting) => this.renderOAuthClientSecret(setting),
      },
      {
        name: "Connect to Notion",
        desc: "Opens the Notion authorization page in your browser.",
        visible: () => this.plugin.settings.authMethod === "oauth",
        render: (setting) => this.renderConnectButton(setting),
      },
      {
        name: "Sync interval (minutes)",
        desc: "0 disables automatic sync; use the Sync now button or command instead.",
        control: { type: "number", key: "syncIntervalMinutes", min: 0, step: 1, defaultValue: 0 },
      },
      {
        name: "Sync now",
        desc: `Last sync: ${this.lastSyncDescription()}`,
        render: (setting) => this.renderSyncNow(setting),
      },
    ];
  }

  getControlValue(key: string): unknown {
    return this.plugin.settings[key as keyof NotionSyncSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;
    if (key === "parentPageId" || key === "oauthClientId") {
      settings[key] = String(value).trim();
    } else if (key === "syncIntervalMinutes") {
      const minutes = Number(value);
      settings[key] = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
    } else {
      settings[key] = value;
    }
    await this.plugin.saveSettings();
    if (key === "syncIntervalMinutes") {
      this.plugin.rescheduleAutoSync();
    }
    if (key === "authMethod") {
      this.refreshDomState();
    }
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
            this.update();
          }
        })
    );
  }
}
