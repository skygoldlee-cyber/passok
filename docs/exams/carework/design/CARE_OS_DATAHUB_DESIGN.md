# Care OS 데이터 허브 설계 — clientId 정규화·360° 카드·인수인계 다이제스트

> **문서 ID**: DOC-DSN-44
> **범위**: exam:carework · 판본: none
> **작성일**: 2026-11-04
> **관련 SPEC ID**: CO-01, CO-02, CO-03, CO-04, CO-05, DA-13, DA-18, ROAD-P5
> **전제**: [CareOS_경쟁전략.md](../business/CareOS_경쟁전략.md) (DOC-BIZ-06) §6 로드맵 단계 1~2 — 종사자 인터뷰(0단계, DOC-BIZ-07)와 병행 가능한 내부 리팩터링 범위
> **상위 문서**: [CAREWORK_PRACTICE_TOOL_DESIGN.md](../../../dev/design/CAREWORK_PRACTICE_TOOL_DESIGN.md) (DOC-DSN-42) · [CAREWORK_FACILITY_WORKSPACE.md](../../../dev/design/CAREWORK_FACILITY_WORKSPACE.md) (DOC-DSN-43)

## 1. 목표·비목표

**목표**
- 일지·사고·방문·인수인계·근무표가 자유텍스트 `client` 문자열 대신 `clientId`(`cli_xxx`)로 같은 대상자를 가리키게 한다 — 통합 조회·집계의 기반
- 대상자 명부에 통합 이력(360° 카드)을 붙인다
- 인수인계 작성 시 "최근 기록 자동 채우기"를 로컬에서 제공한다 — 서버·법무 무관하게 즉시 출시 가능한 첫 차별점

**비목표 (후속 스펙에 분리)**
- `obs {}` 코드화 관찰 필드·추세 알림 (CO-03·CO-04)
- 서버 업로드·facility 재개통 (CO-06·CO-11 — 법무 0b 선행)
- AI·보호자 리포트·평가 매핑 (CO-08~10)

## 2. 현황 문제

- 전 스토어(`carework_care_logs`·`carework_visits`·`carework_handovers`·`carework_incidents`·rosters)가 `client: string` 자유텍스트 — "김영희"와 "김영희 "가 다른 대상자가 되고 동명이인은 구분 불가
- `care-client-store`에만 `id`(`cli_*`)가 존재 — 나머지 스토어는 명부와 무연결
- `shift_handovers.payload`는 이미 예약돼 있으나 로컬 `carework_handovers`에는 집계 소스가 없음

## 3. 데이터 모델

### 3.1 clientId 도입

```js
// 모든 carework 스토어 레코드에 선택 필드 추가
{ id: 'log_xxx', clientId: 'cli_m3abc12', client: '김영희', /* ...기존 필드 */ }
```

- `clientId`: 명부(`carework_clients`) 레코드 `id` 참조 — 저장 시 결정, 이후 불변
- `client`: 표시용 스냅샷 유지 — 명부 이름 변경·삭제 시에도 출력물이 깨지지 않음 (기존 출력 경로 무수정)

### 3.2 기존 레코드 해석 (1회 마이그레이션)

`care-client-resolve.js` — 최초 뷰 로드 시:

1. 레코드의 `client` 문자열 → 명부에서 `name` 일치 검색
   - 단일 매칭 → `clientId` 기록 저장 (해석됨)
   - 다중 매칭 → 미해결 표시, 카드에서 수동 지정 유도
   - 무 매칭 → 명부 미등록 대상 — `clientId` 없이 스냅샷 유지 (기능 저하 없음)
2. 저장은 배치 `setJSON` 1회 — 레코드별 쓰기 금지

### 3.3 입력 UX

- 기록 작성 폼의 대상자 입력을 명부 셀렉트로 교체 — `datalist` (기존 자유 입력 DOM 유지)
- 목록에 없는 이름 입력 시 → "명부에 등록" 제안 버튼 → `addClient` 후 `clientId` 반환
- 명부가 비어 있으면 기존 자유 입력과 동일 동작 (점진적 온보딩 — 명부 사용 강제 아님)

## 4. 모듈 설계

### 4.1 `care-client-resolve.js` (신규, 순수 로직)

```js
/** 이름 → clientId 해석. @returns {{id:string|null, candidates:number}} */
export function resolveClientId(name, clients)

/** 스토어 레코드 배열에 clientId 일괄 해석 — 미해결 건수 반환 */
export function backfillClientIds(records, clients)
```

- DOM·저장 비의존 — 각 스토어 파일이 호출·영속화

### 4.2 `care-timeline.js` (신규, 순수 로직) — CO-02

```js
/** clientId(또는 이름 스냅샷)의 전 스토어 이력을 시간순 병합 */
export function clientTimeline(clientId, { logs, visits, handovers, incidents })

/** 요약 배지 — 최근 기록 수·최종 기록일·미해결 건수 */
export function timelineSummary(timeline)
```

- `care-client` 목록 카드에 "이력 N건 · 최근 D일 전" 배지 + 펼침 시 통합 타임라인 렌더
- 해석 불가 레코드는 이름 스냅샷으로 근사 매칭 (CO-01 없이도 부분 동작)

### 4.3 `handover-digest.js` (신규, 순수 로직) — CO-05

```js
/** 근무 시간대 내 대상자별 이력 집계 → 인수인계 초안
 * @param {string} shiftDate YYYY-MM-DD
 * @param {{start:string,end:string}} window 예 {start:'07:00',end:'15:00'}
 * @param {{logs,visits,incidents}} stores
 * @returns {Array<{clientId,client,meal?,events:string[],incidents:number,suggest:boolean}>}
 */
export function buildDigest(shiftDate, window, stores)
```

- 집계 규칙: 해당 일자+시간대의 일지(활동 요약)·사고(건수·유형)·방문(예정/완료)을 대상자별로 묶고, 기록 없는 명부 대상자는 `suggest:false`로 제외
- memo 초안 = 사고·특이 이벤트만 전망 인계 문장으로 조립 (DOC-DSN-43 "미완료·주의만" 원칙)
- `care-handover` 폼에 **[오늘 기록으로 채우기]** 버튼 — digest 결과를 폼에 반영, 작성자가 검토·편집 후 저장 (자동 제출 금지 — §3-4 작성자 검토 예외)
- 로컬 전용 — 서버 페이로드는 CO-06(법무 선행)에서 별도 처리

## 5. 저장·게이트·테스트

- 스토어별 `FREE_LIMIT=10` 현행 유지 — clientId는 카운트 영향 없음
- 신규 feature-plan 키 없음 — 이번 배치는 무료 기능 (Pro 게이트는 CO-08 이후)
- 단위(node --test, carework 스위트): 이름→clientId 해석·미해결 케이스, 다이제스트 시간대 필터·집계·빈 스토어
- DOM(jsdom, carework 스위트): 명부 셀렉트·카드 타임라인·다이제스트 채우기 버튼
- 회귀 포인트: `client` 스냅샷 출력(인쇄·Excel 내보내기)이 clientId 유무와 무관하게 동일해야 함

## 6. 구현 순서 (본 스펙 내부)

| # | 작업 | 파일 |
|---|------|------|
| 1 | 해석 모듈 + 스토어 `clientId` 필드·백필 | `care-client-resolve.js`, 5개 스토어 |
| 2 | 명부 셀렉트 입력 (일지→사고→방문→인수인계) | 각 뷰 |
| 3 | 360° 카드 타임라인 | `care-timeline.js`, `views/care-client.js` |
| 4 | 인수인계 다이제스트 채우기 | `handover-digest.js`, `care-handover.js` |

1→2는 같은 커밋 묶음 가능, 3·4는 독립 착수 가능.
