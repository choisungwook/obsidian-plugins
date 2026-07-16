---
type: Module
title: notion-client.ts
description: Notion REST API wrapper with a 3 req/s rate limiter, markdown-to-block conversion, and OAuth helpers.
resource: ../../src/notion-client.ts
tags: [notion, api, throttle, markdown]
timestamp: 2026-07-16T15:30:00Z
---

# Responsibilities

- `RateLimiter(334)`: 모든 API 호출을 334ms 간격(≈3 req/s)으로 직렬화
- `NotionClient`: `createPage` / `updatePage` / `archivePage`. 업데이트는 제목 변경 → 기존 children 전부 삭제 → 새 블록 append 방식
- `markdownToBlocks(markdown)`: 헤딩(h1–h3), 불릿/번호 리스트, 인용, 코드펜스, 문단 변환 (순수 함수)
- `exchangeOAuthCode` / `buildAuthorizationUrl`: OAuth 토큰 교환과 인가 URL 생성 (`state` 파라미터 포함)

# API constraints encoded here

| 상수 | 값 | 이유 |
|------|-----|------|
| `NOTION_VERSION` | `2022-06-28` | Notion-Version 헤더 |
| `MAX_BLOCKS_PER_REQUEST` | 100 | children append 요청당 블록 상한 → `chunkBlocks`로 분할 |
| `MAX_RICH_TEXT_LENGTH` | 2000 | rich_text 항목당 글자 상한 → 초과분 잘림 |

# Gotchas

- HTTP는 obsidian `requestUrl`(`throw: false`) 사용 — CORS 회피 목적. 테스트에서는 vitest alias로 목 처리됨
- 페이지네이션 커서는 `encodeURIComponent`로 인코딩해야 한다 (`=` 등 포함 가능)
- `markdownToBlocks`는 손실 변환이다: 인라인 서식(bold/link), 중첩 리스트, 테이블, 이미지는 일반 텍스트로 취급됨. 개선 시 [tests](../../tests/notion-client.test.ts) 갱신 필수
