---
type: Data File
title: sync-state.json
description: Last-synced sha256 hash and Notion page ID per vault path; the basis for create/update/archive classification.
resource: ~/.config/obsidian-notion-sync/sync-state.json
tags: [state, sync]
timestamp: 2026-07-16T15:30:00Z
---

# Schema

```json
{
  "pages": {
    "notes/example.md": {
      "hash": "sha256 hex digest of the note content",
      "pageId": "notion page uuid"
    }
  }
}
```

키는 vault 루트 기준 상대 경로.

# Lifecycle

- create 성공 시 항목 추가, update 성공 시 hash 갱신, archive 성공 시 항목 삭제
- 개별 노트 실패 시 해당 항목은 갱신하지 않음 → 다음 동기화에서 자동 재시도
- 파일 손상(파싱 실패) 시 에러를 던진다 — 조용히 초기화하면 vault 전체가 Notion에 중복 생성되기 때문 ([sync](../modules/sync.md)의 `readJsonFile` 참고)

# Recovery

상태가 실제 Notion과 어긋났다면: 파일을 삭제하면 다음 동기화에서 전체가 create로 판정된다 (기존 Notion 페이지는 중복으로 남으므로 수동 정리 필요).
