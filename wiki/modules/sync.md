---
type: Module
title: sync.ts
description: Full-vault sha256 diffing, sync plan classification (create/update/archive), plan execution, and JSON state persistence.
resource: ../../src/sync.ts
tags: [sync, hashing, state]
timestamp: 2026-07-17T00:00:00Z
---

# Responsibilities

- `computeHash(content)`: sha256 hex digest (순수 함수)
- `planSync(current, state)`: 현재 해시 맵과 [sync-state](../storage/sync-state.md)를 비교해 `SyncPlan { creates, updates, archives }` 판정 (순수 함수)
- `SyncEngine.run()`: vault 순회 → 계획 수립 → `applyPlan`으로 실행 → 상태 저장
- `readJsonFile`/`writeJsonFile`: `~/.config/akbun-notion-sync/` 아래 JSON 파일 I/O. 쓰기는 항상 `0600`, 디렉터리는 `0700`

# Classification rules

| 조건 | 판정 |
|------|------|
| 상태에 없는 경로 | create |
| 해시가 다른 경로 | update |
| 상태에는 있으나 vault에 없는 경로 | archive |

# Error handling

- 노트 하나의 API 실패는 `failed` 카운트로 집계하고 계속 진행 — 전체 동기화를 중단하지 않는다
- 진행 Notice는 try/finally로 반드시 숨긴다
- `readJsonFile`은 `ENOENT`일 때만 fallback을 반환하고, 파싱/권한 오류는 그대로 던진다 (손상된 상태 파일로 인한 전체 재동기화 방지)

# Testing

순수 함수(`computeHash`, `planSync`)는 `tests/sync.test.ts`에서 검증. `SyncEngine`은 obsidian `Vault`에 의존하므로 로직을 순수 함수 쪽으로 밀어내는 것이 원칙.
