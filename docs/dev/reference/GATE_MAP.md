# 게이트 지도 — 30분 온보딩 (GATE_MAP)

> 이 문서는 검증 게이트 전체의 지도입니다. "어떤 게이트가 언제·왜 도는지, 실패하면 어디를 고치는지"를 1페이지에 모았습니다.
> **문서 ID**: DOC-REF-14
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (작업 가이드 — 개별 게이트는 각 SPEC에 귀속)

---

## TL;DR

**그냥 커밋·푸시하면 됩니다.** 게이트는 Git 훅과 CI가 자동 실행하며, 실패 시 메시지에 복구 명령이 함께 나옵니다.
수동으로 돌릴 때의 진입점은 하나 — `npm.cmd run check -- --preset <all|ci|content|docs|refs|freshness>`.

## 1. 게이트 4층 구조

```
커밋 ──► pre-commit 훅 ──► pre-push 훅 ──► CI(ci.yml) ──► deploy
       check:types        push_gate.js      check:ci        가드(clean tree)
       lint               적응형 10단계      프리셋 재현     → sw 스탬프(비커밋)
       check:html         (파일 경로 태그로   → vercel --prod → deploy 태그
       check:secrets      필요 단계만 실행,                     → 원복 → 스모크
       check:enc          캐시·병렬4·failFast)
       check:orphans
       docsync --staged
       testfirst --staged
```

| 층 | 목적 | 우회 |
|---|---|---|
| pre-commit | IDE 수준 오류(타입·린트)·시크릿·FFFD 인코딩·고아 자산·문서/테스트 동반 차단 | `git commit --no-verify` · `SKIP_PRECOMMIT=1` · `SKIP_DOCSYNC=1` · `SKIP_TESTFIRST=1` |
| pre-push | 변경 파일에 필요한 단계만 선별 실행 (미분류 파일=전체 폴백) | `SKIP_PREPUSH=1` · `PUSH_GATE_ALL=1`(전체 강제) · 커밋 메시지 끝 `[no-docs]`·`[no-test]` |
| CI | `check:ci` 프리셋 + 커버리지 + E2E | 없음 — 로컬 재현은 `npm run check:ci` |
| deploy | 오염된 트리/미푸시/CI 레드 상태의 배포 차단(gh → GitHub REST 폴백) + 버전 스탬프(비커밋, 배포 후 원복) + `deploy/<버전>` 태그 이력 + 스모크 | `SKIP_CI_GATE=1`(CI 검증만) · `vercel --prod` 직접 실행 금지 |

※ Git 훅은 opt-in — `npm run hooks:install` (미설치 시 `check:ci` 첫 단계가 경고)

## 2. 프리셋 지도 (`tools/check/steps.js`가 단일 선언부)

| 프리셋 | 명령 | 내용 | 언제 |
|---|---|---|---|
| `all` | `npm run check:all` | lint·types·html + docs + domainmap + content 전체 | 배포 전 완전 점검 (`--quick`=DOM 테스트 생략) |
| `ci` | `npm run check:ci` | CI 워크플로 로컬 재현 (24단계) | 푸시 전 자신 없을 때 (`-- --affected`=영향 테스트만) |
| `content` | `npm run check:content` | 콘텐츠 추적 27단계 (manifest·인용·신선도·링크·카드) | 교재·문제은행·참조자료 편집 후 (`-- --build`=build:data 선행) |
| `docs` | `npm run check:docs` | 문서 정합 14단계 (경로·ID·명령·플랜·저장소·CI패리티·수치·인코딩·고아자산) | docs/ 편집 후 |
| `refs` | `npm run check:refs` | 참조자료 4계층 + 득표 귀속 | ref_md·PDF 변경 후 |
| `freshness` | `npm run check:fresh` | 생성물 신선도 묶음 (html·trace·data·drill·emb·docs_md) | 빌드 산출물 의심 시 |

**단일 단계**: `npm run check -- --step <id>` — `--list`로 id 조회. `--ref <ref>`는 diff 스코프 단계를 변경 파일 대상으로 축소. `--jobs N` 병렬도 조정.

## 3. 흔한 실패 → 복구

| 실패 단계 | 의미 | 복구 |
|---|---|---|
| `check:html` | 파셜(html/views·template) 편집 후 조립 안 함 | `npm run build:html` |
| `check:datafresh`/`drillfresh`/`embfresh`/`docbundles` | 원본 편집 후 빌드 산출물 미재생 | `npm run build:data` (emb는 `build:embeddings`, 문서는 `node tools/build/build_doc_bundles.js` — build:data 체인 미포함). **순서 주의**: datafresh는 생성물 경로에 미커밋·미추적 변경이 있으면 즉시 중단 — 빌드 → 생성물 커밋 → 재검증 순서 |
| `check:storage` | src/에서 localStorage 직접 접근 | `src/storage.js`의 get/set 경유로 수정 |
| `check:docsync` | 코드만 바꾸고 문서 갱신 없음 | docs/ 또는 CHANGES.md 갱신 (면제는 `[no-docs]`) |
| `check:testfirst` | 로직 변경에 테스트 미동반 | 관련 테스트 추가 (주석·공백 전용 diff는 자동 면제, 기타 면제는 `[no-test]` — 우회는 gate_bypasses.jsonl에 누적) |
| `check:domainmap` | watchedDirs 내 파일이 미분류 | domain-map.json 패턴에 신규 파일 선언 |
| `check:featflags`/`check:plan` | 미선언 feature 키 사용 | exams.json/features 또는 feature-plan.json 선언 |
| `check:imports` | import/export 불일치 | 누락 export 추가 또는 잘못된 import 정리 |
| `check:teststats` | 문서의 테스트 수치 인용이 실측에서 벗어남 | `npm run stats:stamp` (SSOT+문서 수치 재기록) |
| `check:enc` | 파일에 U+FFFD 잔존 — 저장 시 이모지가 변조됨 (재저장·도구 경유 사고) | 해당 파일 되돌리거나 원문 복구 · 잔재 정리 후 `node tools/check/check_replacement_char.js --update`로 기준선 하향 |
| `check:orphans` | 자산이 추가됐는데 아무 파일도 참조하지 않음 (교체 후 잔존 사고). 탐지는 `git ls-files` 한정 — 미커밋 신규 파일은 로컬에서 미검출 | 불필요하면 삭제 · 의도적 보존은 `node tools/check/check_orphan_assets.js --update` 후 사유 기입 (주의: --update는 명단 전체 재작성이라 기존 사유가 소실 — 재기입 필요) |
| `verify:assets`/`check:perf` | sw.js 프리캐시 목록과 실파일 불일치·예산 초과 | 파일 추가/경로 수정 (예산은 tools/check/check_perf_budget.js) |
| `check:vendor` | vendor/ 파일 해시·버전이 매니페스트와 불일치 | 수동 변경: `npm run check:vendor -- --update` / 버전 갱신: `npm run sync:vendor -- <key>` |
| `check:uistyle` | 인라인 style 속성·JS display 조작·인라인 핸들러·네이티브 다이얼로그·JS 템플릿 정적 `style=` 기준선 래칫 | CSS 클래스 토글(`.is-hidden`)·`data-click`·`showToast` 계열로 대체 · 동적 값은 `style="--var:${x}"` 허용 (면제는 `style-ok` 토큰) |

## 4. 신규 게이트 추가 규칙

1. `tools/check/`에 `check_<name>.js` 작성 (단독 실행 + 종료코드 계약)
2. `tools/check/steps.js`에 `nodeStep`/`npmStep`으로 등록 → 적절 프리셋 배열에 편입
3. **CI 노출이면** ci.yml에 대응 `run:` 토큰 필요 — `check:ciparity`가 양방향 검증

> **스케줄 게이트**: `vendor-check.yml`이 주 1회 `check:vendor -- --latest`를 실행 — 뒤처진 vendored 패키지를 이슈로 보고(exit 2). 자동 갱신은 하지 않고 `sync:vendor -- <key>` 수동 절차로 연결 (DOC-DSN-20).
4. 신규 게이트는 **실패 가능성이 구체적일 때만** 추가 — 실행시간 총량은 리포트 하단 "최다 소요"에서 감시

## 5. 더 깊은 문서

- 명령 전체 표: `AGENTS.md` 핵심 명령어 절
- 테스트 계층 설계: `docs/dev/reference/TESTING.md` (DOC-REF-06)
- 실행기 내부: `tools/check/run.js` 주석 · `tools/check/push_gate.js` (적응형 선별 로직)
