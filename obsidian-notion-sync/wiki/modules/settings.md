---
type: Module
title: settings.ts
description: Settings tab UI, credential persistence outside the vault, and the OAuth localhost-callback flow.
resource: ../../src/settings.ts
tags: [ui, auth, oauth, credentials]
timestamp: 2026-07-16T15:30:00Z
---

# Responsibilities

- `NotionSyncSettingTab`: parent page ID, 인증 방식(token/oauth), 동기화 주기, Sync now 버튼 + 마지막 동기화 표시
- `loadCredentials`/`saveCredentials`: [credentials.json](../storage/credentials.md) 읽기/쓰기
- `resolveToken(method)`: 인증 방식에 맞는 토큰 반환 (없으면 null)
- OAuth 플로우 (`runOAuthFlow`)

# OAuth flow

1. `http://127.0.0.1:43110`에 임시 HTTP 서버 기동 (`OAUTH_PORT = 43110`)
2. 랜덤 `state`(16바이트 hex) 생성 후 [notion-client](notion-client.md)의 `buildAuthorizationUrl`로 브라우저 오픈
3. `/callback`에서 `state` 검증 (불일치 시 CSRF로 간주하고 거부), `code` 수신, 5분 타임아웃
4. `exchangeOAuthCode`로 토큰 교환 후 credentials 파일에 저장

# Gotchas

- redirect URI `http://localhost:43110/callback`은 사용자가 Notion public integration에 직접 등록해야 한다 (설정 탭 설명에 안내됨)
- 토큰 입력 필드는 data.json이 아니라 credentials 파일에 바로 쓴다 — `plugin.saveSettings()`를 거치지 않는 것이 의도된 동작
