# 도구 계층 지도 — tools/ 디렉터리와 실행 모델 (TOOLS_MAP)

> 이 문서는 `tools/` 계층의 지도입니다 — 앱 소스(4.8만 LOC)보다 큰 검증·빌드·동기화 계층(6.5만 LOC)의 "어디에 무엇이 있고, 어떻게 실행되고, 새 도구를 어떻게 올리는가"를 한 장에 모았습니다.
> **문서 ID**: DOC-REF-17
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (작업 가이드 — 개별 도구는 각 SPEC에 귀속)

---

## 1. 디렉터리 지도

| 디렉터리 | 규모 | 역할 | 대표 진입점 |
|---|---|---|---|
| `tools/check/` | ~87파일 | 검증 게이트(`check_*`) + 감시 감사(`audit_*`) + 실행기(`run.js`)·단계 레지스트리(`steps.js`) | `npm.cmd run check -- --preset <이름>` |
| `tools/build/` | ~40파일 | 콘텐츠→데이터 번들 생성 (`content/` → `data/`), index.html·landing 조립, 임베딩 | `npm.cmd run build:data` · `build:derived` |
| `tools/sync/` | ~8파일 | 드리프트 복구 도구 — 게이트가 차단한 어긋남을 기계적으로 되맞춤 | 실패 메시지의 복구 명령을 수동 실행 |
| `tools/ai/` | ~19파일 | AI 제작 파이프라인 — 초안만 생산(`tmp/ai_drafts/`) → 사람 리뷰 → `ai:apply` 편입 | `npm.cmd run ai:explain` 등 ai:* 스크립트 (AI_API_KEY 필요) |
| `tools/deploy/` | 3파일 | 배포 파이프라인·스테이징 정리·관리자 봇 명령 등록 | `npm.cmd run deploy` |
| `tools/ci/` | 2파일 | CI 진단(`ci:diagnose`)·플레이크 재실행(`ci:retrigger`) | `npm.cmd run ci:diagnose` |
| `tools/lib/` | 9파일 | 공용 헬퍼 — env 로딩·Discord·git 상태·Supabase·trace 스캔·생성물 목록 | (import 전용, 직접 실행 없음) |
| `tools/config/` | JSON | 게이트용 선언 데이터 — domain-map·layer_registry·허용목록 | (체커가 읽는 입력) |
| `tools/state/` | JSON/jsonl | 기준선·텔레메트리 — 감사 기준선·step_runs·gate_bypasses 로그 | (체커가 읽고 쓰는 상태) |
| `tools/supabase/` | SQL+TS | 스키마·Edge Functions (Deno 런타임) | `tools/supabase/apply_schema.js` |
| `tools/market/` | 1파일 | 외부 통계 수집 (큐넷 합격률, Python) | 수동 |
| `tools/merge/` | 1파일 | 스탬프 병합 보조 | 수동 |
| `tools/audit/` | 1파일 | 감사 보조 스크립트 | 수동 |

※ `ref-pipeline/`은 tools/ 밖의 별도 작업실 — PDF→ref_md 변환·오디오북·법령 감시 (Python 중심).

## 2. 실행 모델 — 진입점 3종

`audit:tools`가 도구의 생사를 판정할 때 쓰는 도달 그래프의 시드가 곧 "공식 진입점"이다. 새 도구는 반드시 이 중 하나에 걸려야 사망 후보로 오인되지 않는다:

1. **package.json scripts** — 스크립트 명령 문자열의 `node tools/<name>.js` 참조
2. **steps.js 레지스트리** — `nodeStep(id, 'tools/check/<name>.js', ...)` 선언 → 프리셋 편입
3. **문서 생명줄** — AGENTS.md·README·docs/**/*.md에 `tools/<name>.js` 경로가 기재된 수동 호출 도구 (복구·진단용 무인자 CLI — 게이트 실패 메시지의 복구 명령도 여기 해당)

이 셋 어디에도 없으면 import 그래프로 도달 불가 → `audit:tools`가 "사망 후보"로 보고한다. 복구 전용 도구는 **게이트 트러블슈팅 표나 관련 런북에 경로를 적는 것**이 생명줄이다 (GATE_TROUBLESHOOTING.md의 차단 패턴 표 참조).

제외 접두사: `tools/_archive/`·`tools/supabase/`(Deno)·`tools/build/plugins/`(컨벤션 로딩) — 정적 도달성으로 판정 불가하므로 예외 등록됨.

## 3. 단계 레지스트리 — steps.js가 단일 선언부

모든 게이트 단계는 `tools/check/steps.js` 한 파일에 선언되고, package.json 스크립트·ci.yml은 프리셋 호출만 한다.

```js
nodeStep(id, 'tools/check/x.js', '레이어', '설명', {
  args: [],          // CLI 인자
  content: true,     // --content-only 필터 대상 (콘텐츠 추적 단계)
  slow: true,        // --quick 시 생략
  diffScoped: true,  // --ref 지정 시 변경 파일 대상으로 축소
  serial: true,      // 병렬 워커풀에서 단독 배치
  inProcess: true,   // run({args,cwd}) 계약을 export하는 인프로세스 체커
  prio: 'p0',        // p0 불변식 차단 · p1 정합/신선도(기본) · p2 감시(advisory)
  token: '...',      // ci.yml 비교 토큰 (기본: 스크립트 파일명)
})
```

- **프리셋**: `all` · `ci` · `content` · `docs` · `refs` · `freshness` · `audit` — `npm.cmd run check -- --preset <이름>` 또는 전용 스크립트(check:ci·check:content·check:refs·check:fresh·check:audit)
- **스코프 프리셋 중복 선언 패턴**: 같은 체커가 `content:x`(content·all 프리셋용)와 `refs:y`(refs 프리셋용) 두 id로 선언될 수 있다 — 프리셋별 실패 보고·텔레메트리 귀속을 위한 설계상 중복이며, 삭제는 쌍을 함께 검토해야 한다
- **p2 = advisory**: audit 프리셋에서만 수집되고 실패해도 종료 0 — 완전 비차단화하려면 다른 프리셋에서도 빼야 한다
- **DERIVED_IDS / REMEDIES**: 신선도 계열 실패를 "build:derived 재생성" 한 가지 원인으로 묶어 안내 + 개별 복구 힌트 테이블

## 4. 새 게이트·도구 추가 절차

1. 체커 작성 — CLI(종료코드) 또는 `run({args,cwd}) → {status,output}` 계약 (inProcess)
2. `steps.js`에 `nodeStep`/`npmStep` 등록 → 목표 프리셋 배열에 편입
3. 실패 복구 경로 — REMEDIES 또는 GATE_TROUBLESHOOTING 표에 복구 명령 기재 (메시지에 명령 포함이 규약)
4. 수동 호출 도구라면 → 문서에 `tools/<name>.js` 경로 기재 (생명줄)
5. 도구 헤더 주석에 목적·사용법·`@spec` 귀속 표기
6. CHANGES.md에 추가 이력 기록

## 5. 유지 규약

- **분기 감사**: `npm.cmd run audit:tools` (도달성·미실행) + `audit:gates` (silent·dormant·noisy) — 결과는 GATE_TROUBLESHOOTING.md §리뷰 이력에 기록
- **도구는 감추지 않는다**: 수명 끝난 도구는 `tools/_archive/`로 이동 (삭제 대신 — 이력 보존 + 도달성 감사 제외 접두사)
- **우회 로그**: `tools/state/gate_bypasses.jsonl`에 SKIP env·`[no-*]` 마크가 자동 기록 — 분기 리뷰 시 우회 남용 패턴 확인

---

> 관련 문서: [GATE_MAP.md](GATE_MAP.md) (게이트 4층·프리셋 지도) · [GATE_TROUBLESHOOTING.md](../runbooks/GATE_TROUBLESHOOTING.md) (차단 패턴→복구·분기 정비) · [ENGINEERING_PRACTICES.md](ENGINEERING_PRACTICES.md) (SSOT·신선도·추적성 철학)
