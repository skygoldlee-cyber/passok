# Architecture Decision Records (ADR)

> **문서 ID**: DOC-ADR-00
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (결정 기록 색인 — 프로세스 문서)

아키텍처 결정의 **"왜"**를 보존한다. 코드는 "무엇"을, 설계 문서는 "어떻게"를 말하지만
대안 검토·제약·트레이드오프 같은 결정 맥락은 시간이 지나면 소실된다 — ADR이 그 공백을 메운다.

## 규약

- 파일명: `NNNN-영문-슬러그.md` (4자리 연번, 한 번 부여된 번호는 재사용 금지)
- 상태: `proposed` → `accepted` / `deprecated` / `superseded by ADR-NNNN`
- 결정은 후속 ADR로만 번복한다 — 이력을 지우거나 덮어쓰지 않는다
- 새 ADR을 추가하면 이 표에도 행을 추가한다

## 템플릿

```markdown
# ADR-NNNN: 제목

> **문서 ID**: DOC-ADR-NN
> **관련 SPEC ID**: 관련 ID 또는 "해당 없음"
> **상태**: accepted (YYYY-MM-DD)

## 상황 (Context)
배경·제약·문제의 구체적 조건.

## 결정 (Decision)
선택한 방식 — 한두 문장으로.

## 대안 (Alternatives considered)
검토했으나 기각한 방식과 그 사유.

## 결과 (Consequences)
이 결정이 낳는 결과 — 좋은 것과 나쁜 것 모두.
```

## 결정 목록

| ADR | 제목 | 상태 | 날짜 |
|-----|------|------|------|
| [0001](0001-exam-data-boot-document-write.md) | 활성 시험 데이터 번들을 document.write 부트 스크립트로 로드 | accepted | 2026-10-03 |
| [0002](0002-domain-asset-convention-paths.md) | 도메인 자산을 `exams/${활성시험}/` 규약 경로로 해석 | accepted | 2026-10-03 |
| [0003](0003-localstorage-first-storage.md) | localStorage 1차 저장 + Supabase 선택적 동기화 | accepted | 2026-09-30 |
| [0004](0004-vanilla-js-no-framework.md) | 프레임워크 무의존 Vanilla JS (빌드 도구 없는 ESM) | accepted | 2026-10-14 (백필) |
| [0005](0005-window-global-data-bundles.md) | 데이터 번들을 window 전역에 할당하는 클래식 스크립트 | accepted | 2026-10-14 (백필) |
| [0006](0006-storage-single-funnel.md) | 영속 IO의 단일 퍼널 — storage.js 경유 강제 | accepted | 2026-10-14 (백필) |
| [0007](0007-csp-self-event-delegation.md) | CSP script-src 'self' 유지 + data-click 이벤트 위임 | accepted | 2026-10-14 (백필) |
| [0008](0008-position-independence-gate.md) | 위치 좌표(라인·인덱스)의 식별자 사용 금지 | accepted | 2026-10-14 (백필) |
| [0009](0009-conventions-as-gates.md) | 규약의 기계 강제 — 문서 규약은 게이트로 변환한다 | accepted | 2026-10-14 (백필) |
| [0010](0010-ratchet-baselines.md) | 레거시 잔재는 기준선 래칫으로 관리 — 단조 감소만 허용 | accepted | 2026-10-14 (백필) |
| [0011](0011-html-partial-assembly.md) | index.html의 템플릿+파셜 조립 빌드 | accepted | 2026-10-14 (백필) |
| [0012](0012-content-md-ssot-committed-bundles.md) | 콘텐츠 MD를 SSOT로, 생성 번들은 커밋한다 | accepted | 2026-10-14 (백필) |
| [0013](0013-single-deploy-path.md) | 배포는 npm run deploy 단일 경로 — 스탬프는 비커밋 | accepted | 2026-10-14 (백필) |
| [0014](0014-three-tier-test-stack.md) | 3계층 테스트 스택 — node:test + Vitest/jsdom + Playwright | accepted | 2026-10-14 (백필) |
| [0015](0015-jsdoc-checkjs-over-typescript.md) | TypeScript 전환 대신 JSDoc + checkJs | accepted | 2026-10-14 (백필) |
| [0016](0016-multi-exam-registry-feature-flags.md) | 멀티시험 레지스트리 + feature flag 게이팅 | accepted | 2026-10-14 (백필) |
| [0017](0017-vendored-assets-hash-manifest.md) | 외부 라이브러리는 vendor/ 벤더링 + 해시 매니페스트 | accepted | 2026-10-14 (백필) |
| [0018](0018-fsrs-over-sm2.md) | 간격 반복은 SM-2 대신 FSRS | accepted | 2026-10-14 (백필) |
| [0019](0019-telemetry-consent-first-party.md) | 텔레메트리는 opt-out 동의 + 퍼스트파티 익명 수집 | accepted | 2026-10-22 |
