---
type: Plugin
title: Akbun Notion Sync
description: Desktop-only Obsidian plugin that syncs vault markdown notes to Notion child pages using sha256 diffing.
resource: https://github.com/choisungwook/obsidian-plugins
tags: [obsidian, notion, sync, desktop-only]
timestamp: 2026-07-17T00:00:00Z
---

# Overview

Vault 전체를 순회해 각 마크다운 노트의 sha256 해시를 이전 동기화 상태와 비교하고, create/update/archive를 판정해 Notion API를 호출하는 플러그인입니다. `isDesktopOnly: true`이며 Node `fs`/`http`/`crypto`를 사용합니다.

# Architecture

데이터 흐름:

1. [main](modules/main.md)이 커맨드/리본/자동 스케줄에서 동기화를 트리거
2. [settings](modules/settings.md)가 인증 방식에 따라 [credentials](storage/credentials.md)에서 토큰을 해석
3. [sync](modules/sync.md)가 vault를 해시하고 [sync-state](storage/sync-state.md)와 비교해 계획 수립
4. [notion-client](modules/notion-client.md)가 3 req/s 스로틀로 Notion API 호출

# Contents

- [modules/](modules/index.md) — 소스 모듈별 문서
- [storage/](storage/index.md) — 디스크에 저장되는 파일들의 스키마와 위치
- [runbooks/](runbooks/index.md) — 개발/빌드/테스트 절차

# Invariants

- 토큰은 절대 vault(`data.json`) 안에 저장하지 않는다 — [credentials](storage/credentials.md) 참고
- Notion API 호출은 항상 `RateLimiter`를 거친다 (334ms 간격)
- 동기화 상태 파일이 손상되면(파싱 실패) 조용히 재생성하지 않고 에러를 던진다 (페이지 중복 생성 방지)
