---
type: Runbook
title: Development
description: Build, test, and local-install procedure for the akbun-notion-sync plugin.
tags: [build, test, ci]
timestamp: 2026-07-18T07:49:19Z
---

# Prerequisites

Node 20+. 모든 명령은 저장소 루트에서 실행.

# Procedure

```bash
npm install
npm test        # vitest — 순수 로직 단위 테스트
npm run build   # tsc --noEmit 타입체크 + esbuild 프로덕션 번들 (main.js)
npm run dev     # esbuild watch 모드
```

커밋 전 `npm test && npm run build`가 모두 통과해야 한다.

# Local install

`main.js`와 `manifest.json`을 `<vault>/.obsidian/plugins/akbun-notion-sync/`에 복사 후 Obsidian에서 플러그인 활성화.

# CI

- `.github/workflows/ci.yml` (Test): PR마다 `npm ci` → `npm test` → `npm run build` 실행
- `.github/workflows/release.yml` (Release): main 머지마다 빌드·attest 후 `gh release create`로 manifest version tag의 GitHub Release를 만들고 `main.js`, `manifest.json` 첨부

릴리스 절차 상세와 attestation 이력은 [marketplace-submission](marketplace-submission.md) 참고.

# Notes for agents

- `obsidian` 모듈은 실제 설치본이 타입 전용이다. 테스트에서는 `vitest.config.ts`의 alias가 `tests/obsidian-mock.ts`로 치환한다 — 목에 없는 API를 소스에서 새로 쓰면 목도 함께 갱신할 것
- 빌드 산출물 `main.js`는 gitignore 대상이므로 커밋하지 말 것
