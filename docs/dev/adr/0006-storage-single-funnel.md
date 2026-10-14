# ADR-0006: 영속 IO의 단일 퍼널 — `storage.js` 경유 강제

> **문서 ID**: DOC-ADR-06
> **범위**: platform · 판본: none
> **관련 SPEC ID**: DA-09
> **상태**: accepted (2026-10-14 — 사후 백필, 계층 도입 시점 2026-09-26)

## 상황 (Context)

ADR-0003으로 localStorage가 1차 저장소로 정해진 뒤에도, 각 모듈이
`localStorage`를 직접 호출하면 키 네임스페이스·쿼터 감지·마이그레이션·
백엔드 교체 지점이 산재한다.

## 결정 (Decision)

모든 영속 읽기·쓰기는 `src/storage.js`를 경유한다 (단일 퍼널).
`setStorageBackend()`로 백엔드 교체 가능, 동기·Async 이중 API.
`check:storage` 게이트가 src/ 내 직접 접근을 차단하며, 부트스크립트·
인프라 예외는 ALLOWED_FILES에 사유를 명시한다.

## 대안 (Alternatives considered)

- **직접 접근 + 리뷰 규약**: 기각 — 규약 문서만으로는 산재를 막지 못함 (게이트
  강제 방식의 전형, ADR-0009 연결)
- **전면 비동기 스토리지(IndexedDB) 우선**: ADR-0003에서 기각한 것과 동일 근거 —
  동기 코드 전면 비동기화 비용 대비 실익 낮음. Async API로 이행 경로만 확보
- **`localStorage` 얇은 래퍼(키 유틸만)**: 기각 — 도입 기록(CHANGES 2026-09-26)상
  요구가 키 유틸을 넘었다. `scopedKey`의 `examId:` 네임스페이스, `setMany`의
  중간 실패 롤백(원자성), 쿼터 감지, 백엔드 교체 지점이 전부 퍼널에 있어야 해서
  얇은 래퍼는 결국 두꺼워지는 경로만 지연할 뿐이다

## 결과 (Consequences)

- 키 중앙 관리는 `storage-keys.js` — `examId:` 스코프 규약·`BACKUP_KEYS` 등록이
  여기서 나온다 (check:seedkeys가 시드 스코프 정합도 검증)
- `setMany`/`setJSONMany`는 중간 실패 시 이전 값 롤백 (DA-09)
- IndexedDB 이행 경로는 열려 있으나 현재 1차는 localStorage 유지
