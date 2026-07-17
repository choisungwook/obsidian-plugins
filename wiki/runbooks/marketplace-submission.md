---
type: Runbook
title: Obsidian Community Plugin Marketplace Submission
description: Procedure for publishing akbun-notion-sync to the Obsidian community plugin marketplace.
resource: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
tags: [obsidian, marketplace, release, submission]
timestamp: 2026-07-17T12:00:00Z
---

# Obsidian 커뮤니티 마켓 제출

## 제출 요건 (Obsidian 측 검증 항목)

- 플러그인 ID에 `obsidian` 포함 금지 → ID는 `akbun-notion-sync` (2026-07-17에 `obsidian-notion-sync` → `notion-sync` → `akbun-notion-sync` 순으로 변경).
- 저장소 루트에 `manifest.json`, `README.md`, `LICENSE`가 있어야 함 — 이 요건 때문에 2026-07-17에 모노레포 서브디렉터리 구조를 버리고 이 저장소(`choisungwook/obsidian-plugins`)를 플러그인 전용 저장소로 전환했다.
- `manifest.json`의 `version`과 **정확히 같은 이름의 태그**로 GitHub Release를 만들고, `main.js`와 `manifest.json`을 개별 자산으로 첨부. 그 외 파일(`versions.json` 등)을 자산으로 붙이면 리뷰 봇이 "extra unsupported files" 경고를 낸다 (`versions.json`은 저장소에서 읽으므로 자산 불필요). `.github/workflows/release.yml`이 main 머지 시 자동으로 수행하며, 같은 버전의 릴리스가 이미 있으면 skip하지 않고 현재 커밋 기준으로 자산을 갱신한다 (2026-07-17: rename 커밋이 릴리스에 반영되지 않아 마켓 리뷰에서 ID 불일치 에러가 났던 문제의 재발 방지).
- 릴리스 자산에 GitHub artifact attestation을 권장 — workflow의 `actions/attest-build-provenance` step이 `main.js`/`manifest.json`에 대해 수행한다.
- ID/이름이 기존 커뮤니티 플러그인과 중복 금지 — 기존 마켓에 "Notion Sync" 계열 플러그인이 이미 있어 2026-07-17에 `akbun-notion-sync` / `Akbun Notion Sync`로 변경.

## 절차

1. `manifest.json`/`versions.json` 버전을 확인하고 main에 머지 → release workflow가 manifest 버전 태그(예: `0.1.0`)로 릴리스를 생성한다.
2. [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)를 포크하고 `community-plugins.json` **맨 끝**에 아래 항목을 추가해 PR 생성. PR 템플릿의 체크리스트를 모두 작성할 것.

   `community-plugins.json`에 추가할 항목:

   ```json
   {
     "id": "akbun-notion-sync",
     "name": "Akbun Notion Sync",
     "author": "choisungwook",
     "description": "Sync your vault's markdown notes to Notion pages.",
     "repo": "choisungwook/obsidian-plugins"
   }
   ```

3. 자동 검증 봇(ObsidianReviewBot)의 지적 사항을 해결하고 사람 리뷰를 기다린다. 승인·머지되면 Obsidian 앱의 Community plugins 검색에 노출된다.

## 주의사항

- `community-plugins.json`의 `id`/`name`/`description`은 이 저장소 `manifest.json`과 정확히 일치해야 한다.
- 최초 등록 이후의 버전 릴리스는 새 태그만 만들면 마켓에 자동 반영된다 (PR 재제출 불필요). `manifest.json`과 `versions.json`의 버전을 함께 올릴 것.
