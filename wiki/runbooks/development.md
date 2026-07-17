---
type: Runbook
title: Development
description: Build, test, and local-install procedure for the akbun-notion-sync plugin.
tags: [build, test, ci]
timestamp: 2026-07-17T04:10:00Z
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
- `.github/workflows/release.yml` (Release): main에 머지되면 빌드 (테스트는 PR 단계에서 이미 통과했다고 가정하고 생략) → 같은 버전의 릴리스가 이미 있으면 **attest 전에** 실패 (동일 바이트 digest에 attestation이 중복으로 쌓이는 것 방지) → `actions/attest-build-provenance@v4`로 `main.js`/`manifest.json` attestation 생성 → attestation이 공개 API의 `gh attestation verify`로 검증될 때까지 대기(최대 10회×15초) → `softprops/action-gh-release@v2`가 manifest 버전과 동일한 태그(예: `0.1.0`)로 GitHub Release를 생성하고 `main.js`/`manifest.json`을 첨부한다. Obsidian 마켓이 이 태그 형식을 요구한다. 모든 PR에서 `manifest.json`과 `versions.json`의 버전을 올릴 것

# Notes for agents

- `obsidian` 모듈은 실제 설치본이 타입 전용이다. 테스트에서는 `vitest.config.ts`의 alias가 `tests/obsidian-mock.ts`로 치환한다 — 목에 없는 API를 소스에서 새로 쓰면 목도 함께 갱신할 것
- 빌드 산출물 `main.js`는 gitignore 대상이므로 커밋하지 말 것
