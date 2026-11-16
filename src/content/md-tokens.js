// src/content/md-tokens.js — PassOK 문서 MD 라인 분류 규약 공용 정본
// @spec CO-13,DA-24 — doc-md(미리보기)·docx-utils(OOXML) 이미터가 공유하는 마커·인라인·이미지 분류 계약
// doc-md.js(미리보기 HTML)와 docx-utils.js(OOXML)가 같은 마커·펜스·표·이미지 줄을
// 같은 방식으로 인식하도록 분류 규칙을 한곳에 둔다. 이미터(HTML/OOXML 출력)는 각자 유지.

/** 코드 펜스 상태 토글 — ```로 시작하는 줄 */
export const RE_FENCE = /^```/;
/** 문서 설정·구조 마커 — :::sign/:::end/:::approve/:::landscape/:::page/:::closing/:::any */
export const RE_MARKER = /^:::([\w-]+)/;
export const RE_SIGN = /^:::sign$/;
export const RE_SIGN_END = /^:::end$/;
export const RE_APPROVE = /^:::approve/;
export const RE_LANDSCAPE = /^:::landscape$/;
export const RE_PAGE = /^:::page$/;
export const RE_CLOSING = /^:::closing/;
/** 표 구분행 |---|---| */
export const RE_TBL_SEP = /^\|[\s:|-]+\|$/;
/** 헤딩 #~### */
export const RE_HEAD = /^(#{1,3})\s+(.+)/;
/** 각주성 줄 — '※'/'근거' 시작 (소자 회색) */
export const RE_NOTE = /^(※|근거)/;
/** 목록 항목 — '- ' 접두만 (1. 은 리터럴 보존 규약) */
export const RE_LIST = /^- /;
/** 단독 줄 이미지 — {{img:key}} 또는 ![alt](key|src) → {key, alt} */
/** @param {string} t @returns {?{key: string, alt: string}} */
export const imgLineKey = t => {
    const tk = t.match(/^\{\{img:([\w-]+)\}\}$/);
    if (tk) return { key: tk[1] || '', alt: tk[1] || '' };
    const md = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    return md ? { key: md[2] || '', alt: md[1] || '이미지' } : null;
};

/** 코드 펜스 블록 제거 — 펜스 안 내용은 원문 출력 대상이라 마커 판정에서 제외 */
/** @param {string} md */
export const stripCodeFences = md => String(md || '').replace(/```[\s\S]*?```/g, '');

/**
 * 결재란 역할 해석 — :::sign 있고 :::approve none 아니면 역할 배열 (미지정 시 담당·팀장·시설장).
 * doc-md._apprRoles·docx-utils._apprRoles의 동일 로직을 공용화.
 * @param {string} md @returns {string[] | null}
 */
export const apprRoles = md => {
    const txt = stripCodeFences(md); // 펜스 블록 내 :::sign 오인 방지
    const am = txt.match(/^:::approve\s*(.*)$/m);
    if (!/^:::sign\s*$/m.test(txt) || (am && (am[1] || '').trim() === 'none')) return null;
    const roles = am ? (am[1] || '').split('|').map(s => s.trim()).filter(Boolean) : ['담당', '팀장', '시설장'];
    return roles.length ? roles : null;
};

/**
 * 인라인 서식 토큰 정규식 — ![img] · **굵게** · `코드` · *기울임* · ~~취소~~ · [텍스트](url).
 * docx(_runsInl)는 단일 패스로 런 분할하고 doc-md(_inl)는 치환 체인으로 쓰되,
 * 인식 집합(=이 패턴들)은 동일해야 한다 — 신규 인라인 문법 추가 시 여기에만 등록.
 */
export const RE_INL_IMG = /!\[([^\]]*)\]\(([^)\s]+)\)/;
export const RE_INL_BOLD = /\*\*([^*]+)\*\*/;
export const RE_INL_CODE = /`([^`]+)`/;
export const RE_INL_EM = /\*([^*]+)\*/;
export const RE_INL_DEL = /~~([^~]+)~~/;
export const RE_INL_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
/** 링크 URL 허용 스킴 — javascript: 등 활성 콘텐츠 차단 */
export const RE_SAFE_URL = /^(https?:|mailto:|#|\/)/;
/** 단일 패스 인식 정규식 (docx _runsInl) — img 우선 매치 후 서식 토큰 순 */
export const RE_INL_ALL = new RegExp([RE_INL_IMG, RE_INL_BOLD, RE_INL_CODE, RE_INL_EM, RE_INL_DEL, RE_INL_LINK].map(r => r.source).join('|'), 'g');
/** {{img:key}} 토큰 — 행 중간 포함 전체 치환용 */
export const RE_IMG_TOK = /\{\{img:[\w-]+\}\}/g;
