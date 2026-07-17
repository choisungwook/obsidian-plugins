# AGENTS.md

이 저장소에서 작업하는 에이전트(그리고 사람)를 위한 규칙입니다.

## 작업 절차 (필수)

1. 시작 전 `git pull origin main --rebase`로 최신 main 동기화.
2. 작업 전 `wiki/index.md` → 건드릴 모듈의 wiki 문서를 먼저 읽는다 (아키텍처 불변 규칙과 함정이 wiki에 있다).
3. 작업 후 변경으로 낡아진 wiki 문서를 같은 PR에서 갱신한다 (책임/동작·스키마·빌드/CI·상수 변경 시).
4. wiki는 [Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing): frontmatter(`type` 필수) + 개념당 파일 하나 + 디렉터리별 `index.md` + 상대 링크. 갱신 시 `timestamp`도 갱신.

## 버전 관리 (필수)

- 버전을 올리기 전에 반드시 `wiki/runbooks/marketplace-submission.md`를 읽는다.
- **모든 PR에 버전 bump 포함**: `manifest.json` version을 patch(+0.0.1)로 올리고 `versions.json`에 `"새버전": "minAppVersion"` 추가. minor/major가 필요하면 PR에서 직접 올린다.
- **릴리스된 버전은 절대 덮어쓰지 않는다.** Obsidian이 자산의 attestation을 태그 커밋 기준으로 검증하므로, 변경은 항상 새 버전으로 릴리스한다.
- **릴리스마다 `main.js` 바이트가 유일해야 한다.** attestation은 sha256 digest에 붙어서, 동일 바이트를 여러 버전으로 릴리스하면 검증이 실패한다 (0.1.2에서 발생). `esbuild.config.mjs`의 버전 배너가 이를 보장한다 — 배너를 제거하지 말 것.
- main 머지 후 manifest version과 같은 이름의 태그를 push하면 `.github/workflows/release.yml`이 릴리스를 자동 생성한다. 워크플로우는 버전을 올리지 않으며, 같은 버전의 릴리스가 이미 있으면 실패한다.

## 저장소 구조

- **akbun-notion-sync 플러그인 전용 저장소** — 마켓 요건상 `manifest.json`이 루트에 있어야 하며, 소스·빌드·테스트가 모두 루트 기준 (2026-07-17 모노레포에서 전환).
- 마켓 릴리스 절차: `wiki/runbooks/marketplace-submission.md`

## Code convention

- TypeScript strict, indent 2칸, esbuild 빌드, vitest 테스트
- 파일은 역할별 분리: 진입점(`main.ts`) / UI(`settings.ts`) / 도메인 로직(`sync.ts`) / API 클라이언트(`notion-client.ts`)
- 의미 없는 주석 금지 — 주석은 코드로 표현할 수 없는 제약에만
- 이름으로 의도를 드러내고(`flushParagraph()`), 함수는 한 가지 일만 — 판정(`planSync`)과 실행(`applyPlan`) 분리
- 순수 함수 우선, I/O·API 호출은 얇은 계층으로. 매직 넘버는 이름 있는 상수로. early return으로 중첩 축소
- 에러를 삼키지 말 것: 구체적으로 처리하거나(`ENOENT`만 fallback) 그대로 던질 것

### 보안

- 토큰/시크릿을 vault(`data.json`)나 저장소에 저장 금지 — 자격증명은 `~/.config/<plugin-id>/`에 `0600` 권한으로
- OAuth는 `state` 파라미터로 CSRF 방어

## 테스트

- 순수 로직(해시, 판정, 변환, 스로틀)은 단위 테스트 필수
- `obsidian` 모듈은 vitest alias로 목 처리 (`tests/obsidian-mock.ts`)
- fake timer는 try/finally로 복원
- 커밋 전 `npm test && npm run build` 통과 확인

## Git

- 커밋 메시지는 명령형 현재 시제로, 무엇을 왜 바꿨는지 요약
- 빌드 산출물(`main.js`, `node_modules/`) 커밋 금지
- PR 본문은 `.github/PULL_REQUEST_TEMPLATE.md`(`## Goal`, `## What changed`) 구조를 `gh pr create --body`에 직접 채운다
- 리뷰 코멘트 반영은 하나의 커밋으로 묶고 항목별로 커밋 메시지에 나열
