// src/exams/carework/name-fmt.js — 성명 표기 유틸 (순수 로직, DOM·저장 비의존)
// @spec none — 성·이름 사이 한 칸 규칙을 문서·뷰 표시 경계에 일괄 적용
// 이름 필드는 fmtDocName, 이름이 섞인 자유 필드는 fmtDocNames(성씨 게이트) 사용

// 성씨 집합 — 복성은 2글자 우선 비교, 단성은 첫 글자 (인라인 토큰의 이름 판별 게이트 — 일반 단어 오변환 방지)
const _SURNAME2 = new Set('남궁 독고 동방 망절 사공 서문 선우 신갈 어금 장곡 제갈 황보 강전 빈랑 소봉'.split(' '));
const _SURNAME1 = new Set([...'김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민나엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육맹제모탁국어은편']);
// 성명 분할 — 성(1~2글자)+이름(한글 또는 마스크 ○△◇*). 공백·라틴·4글자 초과 성 제외
const _NAME_SPLIT = /^([가-힣]{1,2})([가-힣○△◇*＊●]{1,3})$/;
const _NAME_TOKEN = /^[가-힣○△◇*＊●]{2,4}$/;

/**
 * 성명 표기 — 성·이름 사이 한 칸 (김 수 / 김 철수 / 남궁 민수 / 마스크 김 ○○·남궁 ○○).
 * 이름 필드 전용 — 값 전체가 성명일 때 사용. 한글 성명·마스크만 변환.
 * 성씨 집합 밖 첫 글자('아들'·'이모' 등 비성명 값)·외국어는 원형 유지
 * @param {string} n
 */
export const fmtDocName = n => {
    const s = String(n || '').trim();
    const m = s.match(_NAME_SPLIT);
    if (!m) return s;
    const a = m[1] || '', b = m[2] || '';
    if (_SURNAME2.has(a)) return `${a} ${b}`;
    if (_SURNAME1.has(a.charAt(0))) return `${a.charAt(0)} ${a.slice(1)}${b}`;
    return s;
};

/**
 * 인라인 성명 표기 — 공백·쉼표·슬래시로 구분된 토큰 중 성씨로 시작하는 이름만 성 뒤 한 칸.
 * 이름이 대부분인 필드(근무자)는 기본값, 일반 문장이 섞인 필드(메모·목격자·대상자 나열)는
 * maskedOnly=true — 마스크 문자가 있는 토큰만 변환해 '방문'·'배정' 같은 동음 한자어 오변환 방지
 * @param {string} t @param {boolean} [maskedOnly]
 */
export const fmtDocNames = (t, maskedOnly = false) => String(t || '').split(/([ ,/·]+)/).map(tok =>
    _NAME_TOKEN.test(tok) && (!maskedOnly || /[○△◇*＊●]/.test(tok))
        && (_SURNAME2.has(tok.slice(0, 2)) || _SURNAME1.has(tok[0] || ''))
        ? fmtDocName(tok) : tok).join('');
