---
type: Runbook
title: Obsidian Community Plugin Marketplace Submission
description: Procedure for publishing akbun-notion-sync to the Obsidian community plugin marketplace.
resource: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
tags: [obsidian, marketplace, release, submission]
timestamp: 2026-07-18T07:49:19Z
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

0.1.6에서 자동 Release 및 attestation workflow를 제거하고 수동 릴리스로 전환했으나(PR #12), 이후 두 가지가 확인됐다.

- **0.1.5는 마켓 검증을 통과했다.** 재빌드 금지 + attest 후 공개 API 검증 게이트 + 버전별 유일한 `main.js`(PR #10 레시피)로 만든 릴리스가 유효했다.
- **0.1.6은 마켓 검증에 실패했다.** 수동 전환 후 자산 없는 빈 릴리스만 만들어져 `main.js`/`manifest.json` asset 누락 오류가 났다 — 수동 절차는 사람이 매 버전 빌드·업로드를 잊지 않아야 해서 이런 실패가 구조적으로 반복된다.

그래서 0.1.7부터 PR #10 레시피의 자동 Release workflow를 복원하되, 릴리스 생성만 서드파티 액션(`softprops/action-gh-release`) 대신 `gh release create`로 바꿨다. 남은 액션은 GitHub 공식(`actions/*`)뿐이다.

## 릴리스 절차

릴리스는 `.github/workflows/release.yml`이 main 머지마다 자동으로 수행한다. 버전 bump가 포함된 PR을 main에 머지하면 워크플로우가 다음을 실행한다.

1. `npm ci` → `npm test` → `npm run build`로 머지 커밋에서 산출물을 만든다.
2. manifest version과 같은 이름의 릴리스가 이미 있으면 실패한다 (릴리스된 버전 덮어쓰기 금지 — 버전 bump 누락 감지).
3. `main.js`, `manifest.json`의 build provenance를 attest하고, 마켓 스캐너가 쓰는 공개 API에서 `gh attestation verify`가 성공할 때까지 기다린다.
4. `gh release create --target <머지 커밋>`으로 manifest version과 같은 이름의 tag·GitHub Release를 만들고 `main.js`, `manifest.json`만 첨부한다.

머지 후 워크플로우 성공과 릴리스 자산을 확인한다.

```bash
gh run list --workflow=release.yml --limit 1
version=$(node -p 'require("./manifest.json").version')
gh release view "$version"
```

### 수동 폴백

워크플로우가 고장났을 때만 사용하고, 가능하면 워크플로우를 고쳐 새 버전으로 릴리스한다. 로컬 빌드 산출물에는 attestation이 없다는 점에 유의한다. 최신 main에서 빌드한 뒤 tag를 만들고 `main.js`, `manifest.json`만 첨부한다.

```bash
git switch main && git pull --ff-only origin main
npm ci && npm test && npm run build
version=$(node -p 'require("./manifest.json").version')
git tag "$version" && git push origin "$version"
gh release create "$version" main.js manifest.json \
  --verify-tag \
  --title "$version" \
  --generate-notes
```

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
- 버전 bump는 모든 PR 안에서 수행한다. main 머지 시 Release workflow가 tag·자산·attestation을 만들므로, 사람은 머지 후 워크플로우 성공만 확인한다.
