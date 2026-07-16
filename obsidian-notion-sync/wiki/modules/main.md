---
type: Module
title: main.ts
description: Plugin entry point that wires commands, the ribbon icon, auto-sync scheduling, and last-sync status.
resource: ../../src/main.ts
tags: [entrypoint, lifecycle]
timestamp: 2026-07-16T15:30:00Z
---

# Responsibilities

- `NotionSyncPlugin` (default export): Obsidian `Plugin` 라이프사이클 구현
- `Sync vault to Notion` 커맨드와 리본 아이콘 등록
- `syncIntervalMinutes > 0`이면 `window.setInterval`로 자동 동기화, `rescheduleAutoSync()`는 설정 변경 시 [settings](settings.md)에서 호출됨
- 동기화 결과(`lastSyncAt`, `lastSyncSummary`)를 data.json 설정에 기록 — 토큰은 절대 기록하지 않음

# Key behaviors

- `syncNow(silent)`: 중복 실행 방지(`engine.isRunning`), parent page ID/토큰 검증 후 [sync](sync.md)의 `SyncEngine` 실행. `silent=true`(자동 동기화)면 검증 실패 Notice를 띄우지 않음
- 토큰 해석은 [settings](settings.md)의 `resolveToken(authMethod)`에 위임

# Gotchas

- data.json에 저장되는 설정은 `NotionSyncSettings` 필드뿐이다. 여기에 시크릿 필드를 추가하지 말 것
