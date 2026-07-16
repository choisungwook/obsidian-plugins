---
type: Runbook
title: Obsidian Community Plugin Marketplace Submission
description: Procedure for publishing notion-sync to the Obsidian community plugin marketplace.
resource: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
tags: [obsidian, marketplace, release, submission]
timestamp: 2026-07-17T00:00:00Z
---

# Obsidian 커뮤니티 마켓 제출

## 제출 요건 (Obsidian 측 검증 항목)

- 플러그인 ID에 `obsidian` 포함 금지 → ID는 `notion-sync` (2026-07-17에 `obsidian-notion-sync`에서 변경).
- 플러그인당 **전용 공개 GitHub 저장소** 필요. 모노레포 서브디렉터리는 등록 불가.
- 전용 저장소 루트에 `manifest.json`, `README.md`, `LICENSE`가 있어야 함.
- `manifest.json`의 `version`과 **정확히 같은 이름의 태그**로 GitHub Release를 만들고, `main.js`와 `manifest.json`을 개별 자산으로 첨부 (`versions.json`도 권장).
- ID/이름이 기존 커뮤니티 플러그인과 중복 금지 — `notion-sync` / `Notion Sync`는 2026-07-17 기준 미사용 확인.

## 절차

1. 전용 공개 저장소 생성 (예: `choisungwook/obsidian-notion-sync` — 저장소 이름에는 `obsidian`이 들어가도 됨).
2. `obsidian-notion-sync/` 디렉터리 내용을 전용 저장소 루트로 푸시 (모노레포는 개발 본진으로 유지, 전용 저장소는 릴리스 미러).
3. 전용 저장소에서 릴리스 생성. 태그는 manifest 버전과 동일해야 한다.

   릴리스 생성 명령:

   ```bash
   npm ci && npm run build
   gh release create 0.1.0 main.js manifest.json versions.json \
     --repo choisungwook/obsidian-notion-sync --title "0.1.0" --generate-notes
   ```

4. [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)를 포크하고 `community-plugins.json` **맨 끝**에 아래 항목을 추가해 PR 생성. PR 템플릿의 체크리스트를 모두 작성할 것.

   `community-plugins.json`에 추가할 항목:

   ```json
   {
     "id": "notion-sync",
     "name": "Notion Sync",
     "author": "choisungwook",
     "description": "Sync your vault's markdown notes to Notion pages.",
     "repo": "choisungwook/obsidian-notion-sync"
   }
   ```

5. 자동 검증 봇(ObsidianReviewBot)의 지적 사항을 해결하고 사람 리뷰를 기다린다. 승인·머지되면 Obsidian 앱의 Community plugins 검색에 노출된다.

## 주의사항

- `community-plugins.json`의 `id`/`name`/`description`은 전용 저장소의 `manifest.json`과 정확히 일치해야 한다.
- 이후 버전 릴리스는 전용 저장소에 태그만 새로 만들면 마켓에 자동 반영된다 (PR 재제출 불필요). `manifest.json`과 `versions.json`의 버전을 함께 올릴 것.
- 모노레포의 `.github/workflows/release.yml`은 모노레포용 태그(`obsidian-notion-sync-<version>`)를 만들며 마켓 등록과는 무관하다.
