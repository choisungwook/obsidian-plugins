---
type: Module
title: sync.ts
description: Full-vault sha256 diffing, sync plan classification (create/update/archive), plan execution, and JSON state persistence.
resource: ../../src/sync.ts
tags: [sync, hashing, state]
timestamp: 2026-07-19T15:00:00Z
---

# Responsibilities

- `computeHash(content)`: sha256 hex digest (순수 함수)
- `syncCutoff(now, modifiedWithinDays)`: 수정 시각 필터 기준 시각 계산. 0이면 0을 반환해 필터 비활성 (순수 함수)
- `parseSyncFolders(input)`: 콤마 구분 폴더 경로 문자열 → 정규화된 배열 (trim, 앞뒤 `/` 제거, 빈 항목 제거, 중복 제거) (순수 함수)
- `isPathInScope(path, folders)`: 경로가 sync 대상 폴더 안인지 판정. 빈 배열이면 전체 vault가 대상. prefix 매칭은 `/` 경계 기준이라 `notes`가 `notes-archive`를 포함하지 않는다 (순수 함수)
- `planSync(current, state, vaultPaths?, folders?)`: 현재 해시 맵과 [sync-state](../storage/sync-state.md)를 비교해 `SyncPlan { creates, updates, archives }` 판정 (순수 함수). `vaultPaths`는 vault에 실재하는 전체 경로 집합 — mtime 필터로 `current`에서 빠진 파일이 archive로 오판되지 않게 한다 (생략 시 `current` 키 집합). `folders`가 있으면 scope 밖 상태 항목은 archive 대상에서 제외된다
- `SyncEngine.run()`: vault 순회(`syncFolders` scope 안 + `syncModifiedWithinDays` 이내 수정 파일만 해시) → 계획 수립 → `applyPlan`으로 실행 → 상태 저장
- `readJsonFile`/`writeJsonFile`: `~/.config/akbun-notion-sync/` 아래 JSON 파일 I/O. 쓰기는 항상 `0600`, 디렉터리는 `0700`

# Classification rules

| 조건 | 판정 |
|------|------|
| 상태에 없는 경로 | create |
| 해시가 다른 경로 | update |
| 상태에는 있으나 vault에 없는 경로 | archive |

mtime 필터(`syncModifiedWithinDays`, 기본 1일, 0 = 전체)를 벗어난 파일은 create/update 대상에서 빠지지만, vault에 존재하는 한 archive되지 않는다.

폴더 scope 필터(`syncFolders`, 빈 값 = 전체 vault)는 create/update/archive 모두에 적용된다 — scope 밖 노트는 어떤 동작의 대상도 되지 않는다. scope를 좁혀도 기존에 동기화된 scope 밖 Notion 페이지는 archive되지 않고 그대로 남는다 (sync-state 항목도 유지).

# Error handling

- 노트 하나의 API 실패는 `failed` 카운트로 집계하고 계속 진행 — 전체 동기화를 중단하지 않는다
- 진행 Notice는 try/finally로 반드시 숨긴다
- `readJsonFile`은 `ENOENT`일 때만 fallback을 반환하고, 파싱/권한 오류는 그대로 던진다 (손상된 상태 파일로 인한 전체 재동기화 방지)

# Testing

순수 함수(`computeHash`, `planSync`)는 `tests/sync.test.ts`에서 검증. `SyncEngine`은 obsidian `Vault`에 의존하므로 로직을 순수 함수 쪽으로 밀어내는 것이 원칙.
