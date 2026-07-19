---
type: Module
title: settings.ts
description: Settings tab UI, credential persistence outside the vault, and the OAuth localhost-callback flow.
resource: ../../src/settings.ts
tags: [ui, auth, oauth, credentials]
timestamp: 2026-07-19T15:00:00Z
---

# Responsibilities

- `NotionSyncSettingTab`: parent page ID, sync 대상 폴더(`syncFolders`, 콤마 구분 문자열로 data.json에 저장, 빈 값 = 전체 vault — 파싱은 [sync](sync.md)의 `parseSyncFolders`), 인증 방식(token/oauth), 동기화 주기, 동기화 대상 수정 시각 창(`syncModifiedWithinDays`, 기본 1일, 0 = 전체), Sync now 버튼 + 마지막 동기화 표시
  - 클래식 `display()` API 사용 (`new Setting(containerEl)` imperative 렌더링). 0.1.8까지 쓰던 1.13 선언형 API(`getSettingDefinitions`)는 [minAppVersion 1.5.7 결정](../adr/0001-min-app-version-floor.md)과 충돌해 0.1.9에서 제거했다 — 1.13은 릴리스된 적 없는 버전이라 어떤 앱에서도 설정 탭이 렌더되지 않았다.
  - 인증 방식에 따른 필드 노출은 dropdown `onChange`에서 `this.display()` 재호출로 처리 (token이면 integration token 필드, oauth면 client ID/secret/Connect 버튼)
  - credentials 파일을 읽고 쓰는 필드(integration token, OAuth client secret)와 버튼 행은 `renderIntegrationToken` 등 private 메서드로 분리
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
