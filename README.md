# Akbun Notion Sync

Desktop-only Obsidian plugin that syncs every markdown note in your vault to Notion as child pages of a parent page.

## How it works

- Walks the whole vault, hashes each note with sha256, and compares against the last synced state (`~/.config/akbun-notion-sync/sync-state.json`).
- New notes are created as Notion pages, changed notes are updated in place, and notes deleted from the vault are archived in Notion.
- Notion API calls are throttled to 3 requests per second, and progress is shown via Obsidian notices.

## Authentication

Two options, selectable in the settings tab:

1. **Integration token** — paste an internal integration secret from [notion.so/my-integrations](https://www.notion.so/my-integrations). Remember to share the parent page with the integration.
2. **OAuth** — enter your public integration's client ID and secret, register `http://localhost:43110/callback` as its redirect URI, then click **Connect**. Your browser opens Notion's consent page and the plugin receives the code on a temporary localhost server.

Credentials are stored in `~/.config/akbun-notion-sync/credentials.json` with `0600` permissions — never inside the vault, so syncing your vault with git or cloud storage cannot leak tokens.

## OAuth public integration guide

Notion's OAuth flow requires your own public integration — Notion does not support a client-less (PKCE-only) flow, so a client ID and secret are always needed. Set one up once:

1. Open [notion.so/my-integrations](https://www.notion.so/my-integrations) and click **New integration**.
2. Under **Type**, choose **Public**. Fill in the required fields (name, company/website, privacy policy and terms URLs — personal links are fine for private use).
3. In **Redirect URIs**, add exactly:

   ```text
   http://localhost:43110/callback
   ```

   The plugin listens on this port only while the Connect button is waiting for the callback.

4. Save, then copy the **OAuth client ID** and **OAuth client secret** from the integration's **Configuration** tab.
5. In Obsidian, open the plugin settings, select **OAuth** as the authentication method, paste the client ID and secret, and click **Connect**.
6. Your browser opens Notion's consent page. Pick the workspace and pages to share (include the parent page you sync into), then approve. The tab will say you can close it, and Obsidian shows a "Connected to Notion" notice.

The client secret and the access token are saved to `~/.config/akbun-notion-sync/credentials.json`; you only need the secret again if you reconnect.

If this feels heavy, the **Integration token** method is simpler for a single personal workspace — create an *internal* integration, paste its token, and share the parent page with it.

## Settings

- **Notion parent page ID** — the page under which synced notes are created.
- **Sync interval (minutes)** — `0` means manual only; otherwise the vault syncs automatically at that interval.
- **Sync now** — trigger a sync immediately; the last sync time and result are shown next to the button.

## Development

```bash
npm install
npm run dev     # watch build
npm test        # vitest unit tests
npm run build   # type-check + production bundle (main.js)
```

Copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/akbun-notion-sync/` to install a local build.
