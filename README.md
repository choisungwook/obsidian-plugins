# obsidian-plugins

옵시디언 플러그인 모음 저장소입니다. 각 플러그인은 독립된 디렉터리로 관리되며, 디렉터리마다 에이전트/사람이 읽을 수 있는 wiki를 포함합니다.

## Plugins

| Plugin | Description | Link to docs |
|--------|-------------|--------------|
| [obsidian-notion-sync](obsidian-notion-sync/) | Vault의 마크다운 노트를 Notion 페이지로 동기화하는 데스크톱 전용 플러그인. sha256 해시 비교로 create/update/archive를 판정하고, Integration 토큰 또는 OAuth로 인증합니다. | [README](obsidian-notion-sync/README.md) · [Wiki](obsidian-notion-sync/wiki/index.md) |

## Repository layout

- `<plugin>/` — 플러그인 소스, 빌드 설정, 테스트
- `<plugin>/wiki/` — [Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) 기반 지식 문서 (다음 에이전트가 컨텍스트를 빠르게 파악하는 용도)
- `AGENTS.md` — 코드 컨벤션과 작업 규칙 (에이전트 필독)
- `.github/workflows/` — CI (테스트 + 빌드)
