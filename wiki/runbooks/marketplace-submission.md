---
type: Runbook
title: Obsidian Community Plugin Marketplace Submission
description: Procedure for publishing akbun-notion-sync to the Obsidian community plugin marketplace.
resource: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
tags: [obsidian, marketplace, release, submission]
timestamp: 2026-07-17T09:02:49Z
---

# Obsidian 커뮤니티 마켓 제출

## 제출 요건

- 플러그인 ID에 `obsidian` 포함 금지 → ID는 `akbun-notion-sync`.
- 저장소 루트에 `manifest.json`, `README.md`, `LICENSE`가 있어야 한다.
- 루트 `manifest.json`의 `version`, Git tag, GitHub Release tag, 릴리스에 첨부한 `manifest.json`의 `version`은 정확히 같아야 한다. `v` 접두사를 붙이지 않는다.
- GitHub Release에는 `main.js`와 `manifest.json`만 첨부한다. `versions.json` 등 다른 파일은 첨부하지 않는다.
- 한 번 릴리스된 버전은 덮어쓰지 않는다. 변경은 항상 새 버전으로 릴리스한다.
- ID와 이름은 기존 커뮤니티 플러그인과 중복되면 안 된다.
- `esbuild.config.mjs`의 버전 배너는 릴리스별 `main.js`를 식별하므로 제거하지 않는다.

## Attestation 장애 기록

0.1.1~0.1.5 자동 릴리스 과정에서 `main.js release asset has an attestation that failed cryptographic verification` 오류가 반복됐다. 일부 버전은 기존 태그의 자산을 덮어썼거나 동일 digest에 여러 attestation이 연결됐고, 이후 버전은 `gh attestation verify`가 성공했지만 Obsidian Marketplace 검증은 실패했다. Obsidian의 세부 검증 기준은 공개되지 않았다.

0.1.6부터 자동 Release 및 attestation workflow를 제거한다. 사람이 새 버전 tag와 GitHub Release를 만들고, 로컬에서 빌드한 `main.js`와 `manifest.json`을 직접 첨부한다.

## 릴리스 절차

1. `manifest.json`과 `versions.json`의 버전을 확인하고 main에 머지한다.
2. 최신 main에서 테스트와 프로덕션 빌드를 실행한다.

   ```bash
   git switch main
   git pull --ff-only origin main
   npm ci
   npm test
   npm run build
   ```

3. manifest version과 같은 이름의 tag를 만들고 push한다.

   ```bash
   version=$(node -p 'require("./manifest.json").version')
   git tag "$version"
   git push origin "$version"
   ```

4. tag와 같은 이름의 GitHub Release를 만들고 `main.js`, `manifest.json`만 첨부한다. GitHub 웹 UI를 사용하거나 아래 명령을 실행한다.

   ```bash
   gh release create "$version" main.js manifest.json \
     --verify-tag \
     --title "$version" \
     --generate-notes
   ```

5. GitHub Release의 tag, 루트 `manifest.json` version, 릴리스에 첨부된 `manifest.json` version이 모두 같은지 확인한다.

## 최초 마켓 제출

1. [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)를 포크한다.
2. `community-plugins.json` 맨 끝에 아래 항목을 추가해 PR을 만든다.

   ```json
   {
     "id": "akbun-notion-sync",
     "name": "Akbun Notion Sync",
     "author": "choisungwook",
     "description": "Sync your vault's markdown notes to Notion pages.",
     "repo": "choisungwook/obsidian-plugins"
   }
   ```

3. 자동 검증 봇의 지적 사항을 해결하고 사람 리뷰를 기다린다.

## 주의사항

- `community-plugins.json`의 `id`, `name`, `description`은 저장소의 `manifest.json`과 정확히 일치해야 한다.
- 최초 등록 이후에는 새 GitHub Release를 만들면 마켓에 자동 반영되므로 PR을 다시 제출하지 않는다.
- 버전 bump는 모든 PR 안에서 수행한다. 자동 Release workflow는 없으므로 릴리스 담당자가 버전, tag, 자산 일치를 직접 확인한다.
