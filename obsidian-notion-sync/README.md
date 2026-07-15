# Obsidian Notion Sync

Desktop-only Obsidian plugin that syncs every markdown note in your vault to Notion as child pages of a parent page.

## How it works

- Walks the whole vault, hashes each note with sha256, and compares against the last synced state (`~/.config/obsidian-notion-sync/sync-state.json`).
- New notes are created as Notion pages, changed notes are updated in place, and notes deleted from the vault are archived in Notion.
- Notion API calls are throttled to 3 requests per second, and progress is shown via Obsidian notices.

## Authentication

Two options, selectable in the settings tab:

1. **Integration token** — paste an internal integration secret from [notion.so/my-integrations](https://www.notion.so/my-integrations). Remember to share the parent page with the integration.
2. **OAuth** — enter your public integration's client ID and secret, register `http://localhost:43110/callback` as its redirect URI, then click **Connect**. Your browser opens Notion's consent page and the plugin receives the code on a temporary localhost server.

Credentials are stored in `~/.config/obsidian-notion-sync/credentials.json` with `0600` permissions — never inside the vault, so syncing your vault with git or cloud storage cannot leak tokens.

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

Copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/obsidian-notion-sync/` to install a local build.
