# AGENTS.md

이 저장소에서 작업하는 에이전트(그리고 사람)를 위한 규칙입니다. 작업을 시작하기 전에 해당 플러그인의 `wiki/index.md`를 먼저 읽으세요.

## 저장소 구조

- 플러그인 하나당 최상위 디렉터리 하나 (`obsidian-notion-sync/` 등)
- 각 플러그인은 자체 `package.json`, `tsconfig.json`, 빌드 설정, 테스트를 가진 독립 패키지
- 각 플러그인 디렉터리에 `wiki/`(Open Knowledge Format) 유지 — 코드를 바꾸면 관련 wiki 문서도 갱신할 것

## Code convention

### 기본 규칙

- TypeScript strict 모드, indent 2칸
- 파일은 역할별로 분리: 진입점(`main.ts`) / UI(`settings.ts`) / 도메인 로직(`sync.ts`) / 외부 API 클라이언트(`notion-client.ts`) 패턴을 따를 것
- 빌드는 esbuild, 테스트는 vitest

### 가독성이 좋은 코드

- **의미 없는 주석 금지.** 코드가 스스로 설명하게 하고, 주석은 코드로 표현할 수 없는 제약(왜 이 값인지, 어떤 외부 제한 때문인지)에만 사용
- 이름으로 의도를 드러낼 것: `tick()`보다 나쁜 예는 `fn1()`, 좋은 예는 `flushParagraph()` 처럼 동작을 그대로 말하는 이름
- 함수는 한 가지 일만: 판정(`planSync`)과 실행(`applyPlan`)을 분리하듯, 순수 로직과 부수효과를 나눌 것
- 순수 함수를 우선 — 테스트하기 쉬운 코드가 읽기도 쉽다. I/O와 API 호출은 얇은 계층으로 밀어낼 것
- 매직 넘버는 이름 있는 상수로 (`MAX_BLOCKS_PER_REQUEST = 100`)
- 이른 반환(early return)으로 중첩을 줄일 것
- 에러는 삼키지 말 것: 구체적으로 처리하거나(`ENOENT`만 fallback) 그대로 던질 것

### 보안

- 토큰/시크릿을 vault 안(`data.json`)이나 저장소에 절대 저장하지 말 것
- 자격증명 파일은 `~/.config/<plugin-id>/` 아래에 `0600` 권한으로 저장
- OAuth는 `state` 파라미터로 CSRF를 방어할 것

## 테스트

- 순수 로직(해시, 판정, 변환, 스로틀)은 반드시 단위 테스트 작성
- `obsidian` 모듈은 vitest alias로 목 처리 (`tests/obsidian-mock.ts` 참고)
- fake timer 사용 시 try/finally로 반드시 복원
- 커밋 전 `npm test && npm run build` 통과 확인

## Git

- 커밋 메시지는 명령형 현재 시제로, 무엇을 왜 바꿨는지 요약
- 빌드 산출물(`main.js`, `node_modules/`)은 커밋하지 말 것 (`.gitignore` 참고)
- PR 리뷰 코멘트를 반영할 때는 하나의 커밋으로 묶고 항목별로 커밋 메시지에 나열
