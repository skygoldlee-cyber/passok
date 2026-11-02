# 규약 치트시트 — 기여자·에이전트 10분 요약 (CONVENTIONS_CHEATSHEET)

> 이 문서는 작업을 막는 규약만 모은 한 장 요약입니다. 전체 규칙은 `AGENTS.md`·`docs/CODE_CONVENTIONS.md`, 실패별 복구는 `GATE_TROUBLESHOOTING.md`를 따릅니다.
> **문서 ID**: DOC-REF-18
> **범위**: platform · 판본: none
> **관련 SPEC ID**: DA-15, ID-05 (핵심 불변식 — 개별 규약은 각 SPEC에 귀속)

---

## TL;DR — 이것만 지키면 게이트에 막히지 않는다

1. **`content/`만 편집, `data/`·`index.html`은 생성물** — 손으로 고치지 말고 `build:data`·`build:html` 재생성
2. **플랫폼·도구 코드에 시험 id·과목 키·시험 경로 하드코딩 금지** (DA-15 — `check:contentind` 차단). 선언은 `exams.json`/`manifest.json`으로
3. **새 `.js` 파일은 `// @spec <ID>` 헤더** (없으면 `@spec none`)
4. **로직 변경 → 테스트 동반 · 문서 규약 변경 → 문서 동반** (test-first·docsync 게이트)
5. **모든 변경은 `docs/dev/CHANGES.md`에 한 줄 이유 기록**
6. **Windows PowerShell: `npm`/`npx`가 아니라 `npm.cmd`/`npx.cmd`**
7. **배포는 오직 `npm.cmd run deploy`** — `vercel --prod` 직접 실행 금지
8. **`.env`·시크릿 커밋 금지** (시크릿 스캔 차단)

## 명령 최소 세트

```powershell
npm.cmd test                        # 유닛 (node --test)
npm.cmd run test:dom                # DOM (Vitest+jsdom)
npm.cmd run check:ci                # CI 게이트 로컬 재현
npm.cmd run build:data              # content → data 번들
npm.cmd run build:html              # template → index.html
npm.cmd run check -- --preset <all|ci|content|docs|refs|freshness|audit>
npm.cmd run deploy                  # 배포 (가드→스탬프→vercel→스모크)
```

## 코드 규약

- Vanilla ES Modules — 프레임워크·런타임 의존성 추가 금지 (vendor 자산은 `sync:vendor` 경유)
- DOM 계약: 클릭은 `data-click="handler"` 위임 · 뷰 전환 `data-target="x-view"` · 피처 게이트 `data-feature="flag"` · 문구 `data-uitext`
- 시험 전용 코드는 `src/exams/<id>/` 격리 — 코어→시험 모듈 역참조 금지 (계층 규칙, `check:posind`)
- 교재 식별자에 라인번호·인덱스 같은 위치 좌표 금지 (ID-05 — 이름·키 기반)
- 파일·주석에 불필요한 주석 추가 금지 — 기존 주석 삭제도 금지

## 커밋 규약

- subject: `type(scope): 요약` — `feat·fix·test·docs·chore·refactor` + 시험 id·영역 scope
- 끝 마크: `[no-docs]` 문서 갱신 불필요 · `[no-test]` 테스트 불필요 — **필요한 경우만** (우회 로그에 기록됨)
- 우회 env(비권장): `SKIP_DOCSYNC=1` · `SKIP_TESTFIRST=1` · `SKIP_PREPUSH=1` · `SKIP_PRECOMMIT=1`

## 차단되면

`docs/dev/runbooks/GATE_TROUBLESHOOTING.md` 차단 패턴 표 → 메시지에 복구 명령이 함께 나옵니다. 우회보다 원인 해소가 원칙.

## 문서 규약

- 새 문서: 헤더(`> **문서 ID**: DOC-XX-NN` · 범위 · 관련 SPEC ID) + `docs/README.md` ID 레지스트리·목차 등록 (규약 정본: `docs/DOC_CONVENTIONS.md`)
- 배치: `design/`=설계 의도 · `reference/`=현행 명세 · `runbooks/`=실행 절차 · `adr/`=결정 기록

---

> 전체 규칙: [AGENTS.md](../../../AGENTS.md) · [CODE_CONVENTIONS.md](../../CODE_CONVENTIONS.md) · 게이트 지도: [GATE_MAP.md](GATE_MAP.md) · 도구 계층: [TOOLS_MAP.md](TOOLS_MAP.md)
