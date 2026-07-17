---
type: Runbook
title: Obsidian Community Plugin Marketplace Submission
description: Procedure for publishing akbun-notion-sync to the Obsidian community plugin marketplace.
resource: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
tags: [obsidian, marketplace, release, submission]
timestamp: 2026-07-17T09:00:00Z
---

# Obsidian 커뮤니티 마켓 제출

## 제출 요건 (Obsidian 측 검증 항목)

- 플러그인 ID에 `obsidian` 포함 금지 → ID는 `akbun-notion-sync` (2026-07-17에 `obsidian-notion-sync` → `notion-sync` → `akbun-notion-sync` 순으로 변경).
- 저장소 루트에 `manifest.json`, `README.md`, `LICENSE`가 있어야 함 — 이 요건 때문에 2026-07-17에 모노레포 서브디렉터리 구조를 버리고 이 저장소(`choisungwook/obsidian-plugins`)를 플러그인 전용 저장소로 전환했다.
- `manifest.json`의 `version`과 **정확히 같은 이름의 태그**로 GitHub Release를 만들고, `main.js`와 `manifest.json`을 개별 자산으로 첨부. 그 외 파일(`versions.json` 등)을 자산으로 붙이면 리뷰 봇이 "extra unsupported files" 경고를 낸다 (`versions.json`은 저장소에서 읽으므로 자산 불필요). `.github/workflows/release.yml`이 main 머지 시 자동으로 수행한다.
- 릴리스 자산에 GitHub artifact attestation을 권장 — workflow의 `actions/attest-build-provenance` step이 `main.js`/`manifest.json`에 대해 수행한다.
- **한 번 릴리스된 버전은 절대 덮어쓰지 않는다. 변경은 항상 새 버전으로 릴리스한다.** Obsidian은 "자산이 태그 커밋의 소스에서 빌드됐는가"를 검증하므로, 기존 태그의 자산만 새 커밋 빌드로 갈아끼우면 `main.js release asset has an attestation that failed cryptographic verification` 에러가 난다 (2026-07-17에 0.1.1에서 실제 발생 — 태그가 79ce54a를 가리킨 채 자산은 e25ce38 빌드로 clobber됨). 이 때문에 workflow는 같은 버전의 릴리스가 이미 있으면 실패하며, PR에서 `manifest.json`/`versions.json` 버전을 올려야 한다.
- ID/이름이 기존 커뮤니티 플러그인과 중복 금지 — 기존 마켓에 "Notion Sync" 계열 플러그인이 이미 있어 2026-07-17에 `akbun-notion-sync` / `Akbun Notion Sync`로 변경.
- **릴리스마다 `main.js` 바이트가 달라야 한다.** GitHub attestation은 자산의 sha256 digest 단위로 조회되므로, 소스가 안 바뀐 채 버전만 올리면 동일한 `main.js` digest에 여러 커밋의 attestation이 쌓이고, Obsidian의 태그 커밋 대조 검증이 `attestation ... failed cryptographic verification` 에러로 실패한다 (2026-07-17에 0.1.2에서 실제 발생 — 0.1.0~0.1.2의 `main.js`가 모두 동일 바이트라 attestation 4개가 한 digest에 붙음). 이를 막기 위해 `esbuild.config.mjs`가 `manifest.json`의 version을 배너 주석으로 `main.js`에 심는다. 배너를 제거하지 말 것.
- **릴리스는 attestation이 공개 API로 검증된 뒤에 생성한다.** 2026-07-17 0.1.3에서 attestation 서명(02:53:48Z)과 릴리스 공개(02:53:51Z)가 3초 차이였고, 마켓 대시보드는 "attestation exists but its signature is invalid or does not match this repository"를 보고했다. 그러나 사후 검증은 전부 통과했다 — `gh attestation verify`(서명·저장소·워크플로우·커밋 일치), 태그 커밋 == attestation 커밋, digest당 attestation 1개, 태그 커밋 재빌드 시 `main.js` 바이트 동일. 같은 구조(브랜치 push 트리거, 다중 subject, `attest-build-provenance@v2`)로 하루 전 릴리스한 다른 플러그인은 대시보드 검증을 통과했으므로, 자산이 아니라 스캔 시점이 문제(attestation 전파 전 스캔 또는 이전 실패 verdict 캐시)로 추정했다. 대응: `release.yml`이 `gh attestation verify` 재시도 루프를 통과한 뒤에만 릴리스를 만들고, 대시보드 실패 verdict가 남아 있으면 새 patch 버전으로 재릴리스해 새 스캔을 받는다 (0.1.4가 이 경로로 릴리스됨).
- **0.1.4도 verify 게이트를 통과하고 릴리스됐지만 대시보드는 같은 에러를 다시 보고했다** (2026-07-17). 사후 검증은 이번에도 전부 통과 (digest당 attestation 1개, 저장소·태그 커밋 `a846670`·워크플로우 일치, `gh attestation verify` 성공) — 스캔 타이밍 가설만으로는 설명되지 않는다. 대응: [커뮤니티에서 검증된 레시피](https://forum.obsidian.md/t/how-to-automate-artifact-attestation-for-releases/114445)대로 워크플로우를 재구성했다 — `actions/attest-build-provenance@v4`로 attest한 뒤 `softprops/action-gh-release@v2`로 릴리스 생성 (트리거는 태그 push가 아니라 기존 main push 유지). 덮어쓰기 가드를 attest step **앞**으로 옮겨, 버전 bump 없는 머지가 동일 바이트 `main.js`에 두 번째 attestation을 쌓는 것(0.1.2 실패 모드의 재발 경로)도 차단했다. 0.1.5가 이 워크플로우로 릴리스됐다. 0.1.6부터는 공급망 리스크 축소를 위해 릴리스 생성을 `softprops/action-gh-release@v2` 대신 `gh release create`로 수행하고, 남은 GitHub 공식 액션은 커밋 SHA로 핀 고정했다 — 릴리스 절차 자체(attest → verify 대기 → 릴리스 생성 순서, 트리거, 자산 구성)는 동일하다.

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
- 버전 bump는 main 머지 시점이 아니라 **모든 PR 안에서** patch 단위로 수행한다. release workflow는 버전을 올리지 않고 manifest 버전을 그대로 태그로 사용하며, 같은 버전의 릴리스가 이미 있으면 덮어쓰지 않고 실패한다. 상세 규칙은 저장소 루트 `AGENTS.md`의 "버전 관리" 절 참고.
