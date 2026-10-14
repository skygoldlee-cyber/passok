# ADR-0007: CSP `script-src 'self'` 유지 + `data-click` 이벤트 위임

> **문서 ID**: DOC-ADR-07
> **범위**: platform · 판본: none
> **관련 SPEC ID**: S-01, S-02, B-04
> **상태**: accepted (2026-10-14 — 사후 백필, 인라인 핸들러 사고 정정일 2026-09 중순경)

## 상황 (Context)

배포판(CSP `script-src 'self'`)에서 동적 생성 HTML의 인라인 `onclick`/`oninput`이
브라우저에 의해 차단되어 데일리 챌린지 모달·리더 오디오 컨트롤·대시보드 과목
바로가기·오답 노트 제외 버튼 등이 **조용히 죽어 있던** 버그가 발견됐다
(로컬 serve에서도 동일 CSP 미러 — 발견이 늦은 건 정적 마크업만 검사했기 때문).

## 결정 (Decision)

CSP는 완화하지 않고 `script-src 'self'`를 유지한다. 대신 인라인 핸들러를 전면
금지하고 `data-click`/`data-args`/`data-input` 위임 패턴(S-02)을 표준으로 삼는다.
`check:uistyle`이 인라인 `on*`·네이티브 `alert/confirm/prompt`를 게이트하고,
명시 면제는 `style-ok` 라인 토큰이다.

## 대안 (Alternatives considered)

- **CSP에 `'unsafe-inline'` 추가**: 즉시 해결 — 기각. 인라인 스크립트 실행을
  허용하면 XSS 방어의 근간이 사라진다. 사고의 정답은 CSP 완화가 아니라 패턴 교정
- **각 요소 `addEventListener` 산재 바인딩**: CSP-safe(B-04)이나 동적 DOM 재바인딩
  누락 위험 — 위임 패턴이 상위 호환
- **`'nonce-*'` 기반 인라인 허용**: 기각 — 정적 호스팅(Vercel)은 매 응답 고유 nonce를
  주입할 서버 계층이 없다. 정적 nonce는 사실상 상수라 방어 효과가 없고, nonce 없는
  `'strict-dynamic'` 조합도 인라인 `on*` 속성에는 적용되지 않아 이벤트 핸들러 문제를
  풀지 못한다

## 결과 (Consequences)

- 동적 마크업의 상호작용은 `data-click` 디스패치 테이블 경유가 유일 경로
- 네이티브 다이얼로그 금지 → `showConfirm`/`showToast` 커스텀 UI로 대체
- `deferredPrompt.prompt()` 같은 PWA API 호출은 메서드라 오탐 면제 처리됨
