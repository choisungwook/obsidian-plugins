---
type: Data File
title: credentials.json
description: Notion credentials stored outside the vault with 0600 permissions.
resource: ~/.config/akbun-notion-sync/credentials.json
tags: [security, credentials]
timestamp: 2026-07-17T00:00:00Z
---

# Schema

```json
{
  "integrationToken": "secret_...",
  "oauthClientSecret": "secret_...",
  "oauthAccessToken": "...",
  "oauthWorkspaceName": "Acme"
}
```

모든 필드는 optional. `integrationToken`은 token 인증 방식에서, `oauthAccessToken`은 oauth 방식에서 사용된다 ([settings](../modules/settings.md)의 `resolveToken` 참고).

# Rules

- 이 파일의 내용을 data.json, 로그, Notice, 커밋에 절대 노출하지 말 것
- 쓰기는 반드시 [sync](../modules/sync.md)의 `writeJsonFile`을 통해 (0600 보장)
- 파일이 없으면(`ENOENT`) 빈 객체로 취급 — 미설정 상태로 정상 동작
