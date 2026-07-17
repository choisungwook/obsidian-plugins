---
type: Runbook
title: Development
description: Build, test, and local-install procedure for the akbun-notion-sync plugin.
tags: [build, test, ci]
timestamp: 2026-07-17T06:18:55Z
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

# CI / Release

- `.github/workflows/ci.yml` (Test): PR마다 `npm ci` → `npm test` → `npm run build` 실행
- `.github/workflows/release.yml` (Release): manifest version과 같은 태그가 push되면 해당 태그 커밋을 빌드한다 → 같은 버전의 릴리스가 이미 있으면 **attest 전에** 실패한다 → `actions/attest-build-provenance@v4`로 `main.js`/`manifest.json`을 attest한다 → 공개 API에서 서명뿐 아니라 provenance의 source/workflow ref가 현재 태그이고 source digest가 현재 커밋인지 확인한다 → `softprops/action-gh-release@v2`가 `main.js`/`manifest.json`을 첨부한 GitHub Release를 생성한다. 모든 PR에서 `manifest.json`과 `versions.json`의 버전을 올리고, main 머지 후 그 버전 태그를 push할 것

# Notes for agents

- `obsidian` 모듈은 실제 설치본이 타입 전용이다. 테스트에서는 `vitest.config.ts`의 alias가 `tests/obsidian-mock.ts`로 치환한다 — 목에 없는 API를 소스에서 새로 쓰면 목도 함께 갱신할 것
- 빌드 산출물 `main.js`는 gitignore 대상이므로 커밋하지 말 것
