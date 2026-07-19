---
type: Decision
title: minAppVersion은 obsidian API 타입 버전에 고정한다
description: manifest.json의 minAppVersion을 추측한 미래 버전이 아니라 빌드에 쓰는 obsidian 타입 패키지 버전(1.5.7)에 고정하기로 한 결정.
tags: [adr, obsidian, manifest, minAppVersion, release]
timestamp: 2026-07-19T00:00:00Z
---

# minAppVersion은 obsidian API 타입 버전에 고정한다

## Status

Accepted (2026-07-19, 0.1.8부터 적용)

## Context

0.1.0~0.1.7은 `manifest.json`의 `minAppVersion`이 `1.13.0`이었다. 이 값은 저장소 초기 구성(PR #2) 때 근거 없이 들어간 값으로, 당시에도 지금도 릴리스된 적 없는 Obsidian 버전이다 (0.1.7 시점 최신 데스크톱은 1.12.7).

마켓 등록 심사는 `minAppVersion`의 실존 여부를 검증하지 않아 0.1.7이 통과했지만, 설치 시점에는 Obsidian이 앱 버전과 호환되는 플러그인 버전을 [versions.json](../../versions.json)에서 찾는다. 모든 항목이 1.13.0을 요구했기 때문에 어떤 앱에서도 설치 가능한 버전이 없었고, 사용자에게 "No appropriate version found" 오류가 났다. 마켓 통과와 설치 가능은 별개의 검증이라는 것이 이 장애의 핵심 교훈이다.

## Decision

- `minAppVersion`은 `package.json`의 `obsidian` 타입 패키지 버전과 같은 **1.5.7**로 고정한다. 플러그인은 이 타입 정의를 기준으로 빌드되므로, 이 버전이 API 호환성을 실제로 보장하는 하한이다.
- `minAppVersion`을 올리는 것은 그보다 새 버전에서만 제공되는 API를 실제로 채택할 때만 하며, 올리기 전에 [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases/releases/latest)에서 그 버전이 실제 릴리스됐는지 확인한다.
- `versions.json`의 0.1.0~0.1.7 항목은 잘못된 값(1.13.0)이지만 수정하지 않는다. 릴리스된 버전은 덮어쓰지 않는다는 규칙([marketplace-submission](../runbooks/marketplace-submission.md))이 우선하며, Obsidian은 최신 릴리스(0.1.8+)를 사용하므로 실질적인 문제가 없다.

## Consequences

- 1.5.7 이상 모든 Obsidian 데스크톱에서 설치 가능해진다.
- obsidian 타입 패키지를 업그레이드하면 `minAppVersion`도 함께 올려야 하는지 검토해야 한다 — 타입만 올리고 새 API를 쓰지 않으면 `minAppVersion`은 그대로 둬도 된다.
- 재발 방지 규칙은 [marketplace-submission](../runbooks/marketplace-submission.md) 제출 요건에 반영했다.
