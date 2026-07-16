---
type: Runbook
title: Development
description: Build, test, and local-install procedure for obsidian-notion-sync.
tags: [build, test, ci]
timestamp: 2026-07-16T15:30:00Z
---

# Prerequisites

Node 20+. 모든 명령은 `obsidian-notion-sync/` 디렉터리에서 실행.

# Procedure

```bash
npm install
npm test        # vitest — 순수 로직 단위 테스트
npm run build   # tsc --noEmit 타입체크 + esbuild 프로덕션 번들 (main.js)
npm run dev     # esbuild watch 모드
```

커밋 전 `npm test && npm run build`가 모두 통과해야 한다.

# Local install

`main.js`와 `manifest.json`을 `<vault>/.obsidian/plugins/obsidian-notion-sync/`에 복사 후 Obsidian에서 플러그인 활성화.

# CI

`.github/workflows/ci.yml`이 push/PR마다 `npm ci` → `npm test` → `npm run build`를 실행하고 `main.js`/`manifest.json`을 아티팩트로 업로드한다.

# Notes for agents

- `obsidian` 모듈은 실제 설치본이 타입 전용이다. 테스트에서는 `vitest.config.ts`의 alias가 `tests/obsidian-mock.ts`로 치환한다 — 목에 없는 API를 소스에서 새로 쓰면 목도 함께 갱신할 것
- 빌드 산출물 `main.js`는 gitignore 대상이므로 커밋하지 말 것
