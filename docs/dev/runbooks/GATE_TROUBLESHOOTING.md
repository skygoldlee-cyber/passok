# 게이트 차단 대응 가이드 — 커밋/푸시 사이클 단축

> **문서 ID**: DOC-RBK-20
> **범위**: platform · 판본: none
> **관련 SPEC ID**: DA-15, ID-05, P-07

커밋·push 게이트에서 반복 차단되는 패턴과 즉시 대응을 정리한 한 장 가이드.
`SKIP_*` 우회보다 **원인 해소**가 원칙 — 우회는 마지막 수단.

## 차단 패턴 → 즉시 대응

| 차단 메시지 | 원인 | 대응 |
|---|---|---|
| `생성물 드리프트 N건 — build:data 후 커밋` | `content/` 변경 후 `data/`·`sw.js` 미갱신 | `npm.cmd run build:data` → 커밋에 포함 |
| `index.html이 최신 조립이 아님` | `html/views/*.html` 또는 `index.template.html` 변경 후 미조립 | `npm.cmd run build:html` |
| `TRACE_MATRIX.md가 입력과 다릅니다` | `@spec` 태그·문서 헤더 변경 후 미재생성 | `npm.cmd run build:trace` |
| `교재/문제은행 파일 ↔ manifest·sw.js 드리프트` | 교재 파일 추가·삭제·이름 변경 후 동기화 누락 | `node tools/sync/sync_textbook_files.js` |
| `로직 변경에 테스트 변경 없음 (test-first)` | `src/` 로직 수정에 `tests/` 변경 미동반 | 해당 로직의 유닛 테스트 추가. 순수 함수면 `tests/unit/`에 즉시 작성 가능 |
| `@spec 태그 없음 (파싱 오류)` | 새 `src/*.js`·`tests/**/*.js`에 `// @spec XX-NN` 헤더 누락 | 파일 2행에 `// @spec <ID>` 추가 (관련 없으면 `@spec none`) |
| `콘텐츠 결합 리터럴 (DA-15)` | 플랫폼/도구 코드에 시험 id·과목 키·콘텐츠 경로 리터럴 | 선언을 `exams.json`/`manifest`/`references.json`으로 이동. 충돌 단어(code 등)는 키를 변경 |
| `좌표 비의존 (ID-05)` | 교재 식별자가 라인번호·인덱스 같은 위치 좌표 | 챕터/섹션 식별자를 이름·키 기반으로 변경 |
| `시크릿 감지` | `.env` 값이 코드·커밋에 유입 | 파일 제거 후 git history 정리 필요 시 팀 호출. `.env`는 절대 커밋 금지 |
| `문서 동기화` | 교재 갱신 후 `판본: textbook` 문서 미갱신 | 해당 문서 갱신 또는 `SKIP_DOCSYNC=1` (판단 필요) |
| `고아 자산` | 파일이 어느 모듈·문서에서도 미참조 | 참조 추가하거나 파일 삭제 |

## 커밋 전 빠른 자가진단 (30초)

```powershell
npm.cmd run check:types      # tsc — 가장 흔한 차단
npm.cmd run check:imports    # ES 모듈 import 교차 검증
node tools/check/run.js --preset freshness --quick   # 생성물 신선도 묶음
```

## 변경 유형별 필수 후속 빌드

| 변경한 것 | 필수 명령 |
|---|---|
| `content/exams/<id>/*.md`, manifest, exams.json | `npm.cmd run build:data` + `node tools/sync/sync_textbook_files.js` |
| `html/views/*.html`, `index.template.html` | `npm.cmd run build:html` |
| 새 `src/*.js` 파일 | `sw.js` SHELL_ASSETS 등록 + `// @spec` 헤더 + `npm.cmd run build:trace` |
| `@spec` 태그·문서 헤더 | `npm.cmd run build:trace` |
| 문제은행 인용 | `npm.cmd run sync:citations` |

## 우회 (검토 후 판단)

- `SKIP_DOCSYNC=1` — 문서 동기화는 교재 대량 변경 시 의도적 지연에 사용
- `SKIP_TESTFIRST=1` — 긴급 핫픽스 후 테스트 보강 예정일 때. **기본값 아님**
- `SKIP_PREPUSH=1` — pre-push 전체 우회. CI가 재검사하므로 로컬 환경 이슈 한정

## 설계 의도

게이트가 번거로운 이유는 **이 프로젝트의 실패 모드가 "조용한 드리프트"** 이기 때문 —
생성물과 원본이 어긋나도 앱은 동작하므로 오류가 사용자에게 도달해서야 발견된다.
차단은 버그가 아니라 그 조용한 실패를 커밋 시점에 앞당겨 잡는 장치다.
