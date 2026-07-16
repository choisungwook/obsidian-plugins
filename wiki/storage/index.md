---
type: Index
title: Storage
description: On-disk files written by the plugin, their locations, schemas, and permissions.
tags: [storage, filesystem]
timestamp: 2026-07-17T00:00:00Z
---

# Storage

모든 파일은 `~/.config/akbun-notion-sync/` 아래에 저장됩니다 (디렉터리 `0700`, 파일 `0600`). vault 밖에 두는 이유: vault는 git/클라우드로 동기화되는 경우가 많아 시크릿이 유출될 수 있기 때문.

| File | Purpose |
|------|---------|
| [credentials.json](credentials.md) | Notion 인증 토큰/시크릿 |
| [sync-state.json](sync-state.md) | 경로별 sha256 해시와 Notion page ID |
