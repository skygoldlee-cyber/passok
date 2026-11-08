// src/exams/carework/audit-import.js — 기관 점검표 파일 → 섹션 파서 (순수 로직, DOM 무의존)
// @spec CO-19 — 시험 전용 도메인 로직 (DA-13)
// 기관 제공 Word/Excel 점검표를 {title, items:[{id,text,ref}]} 구조로 변환한다.
// 항목 id는 섹션+텍스트 해시 — 같은 파일 재업로드 시 체크 상태가 유지된다.
import { sha256hex } from '../../core/sha256.js';

// 헤더 컬럼 키워드 — 공단 평가지표·기관 점검표의 흔한 컬럼명
const _SEC_RE = /영역|구분|분야|분류/;
const _ITEM_RE = /항목|내용|지표|사항|질문|점검/;
const _REF_RE = /근거|기준|비고|참고|출처|관련/;

// 비표 텍스트의 섹션 제목 판정 — '■ 제목'·'【제목】'·'1. 제목'·'○○ 영역' 류
const _plainSec = l => /^[■◆▶●]/.test(l) || /^【.+】$/.test(l) || /^\d+[.)、]\s*.{1,30}$/.test(l)
    || (/(영역|분야)/.test(l) && l.length <= 15);

/**
 * 추출 행·텍스트 → 점검 섹션 [{title, items:[{id,text,ref}]}].
 * 표 행: 첫 행에 헤더 키워드(영역·항목·근거)가 있으면 컬럼 매핑, 없으면 열 위치 휴리스틱
 * (1열=항목 / 2열=col0 반복값이면 영역-항목·고유면 항목-근거 / 3열+=영역-항목-근거, 번호열 제외).
 * 병합 셀(빈 영역 칸)은 직전 영역값을 계승한다.
 * @param {string[][]} [rows] 표 행
 * @param {string[]} [plainLines] 표 밖 텍스트 줄 (제목행은 섹션, 나머지는 항목)
 */
export function auditRowsToSections(rows = [], plainLines = []) {
    const secs = [];
    const dup = new Map();
    const add = (title, text, ref = '') => {
        const t = String(title || '').trim() || '기관 점검표';
        const v = String(text || '').trim();
        if (!v) return;
        let s = secs.find(x => x.title === t);
        if (!s) { s = { title: t, items: [] }; secs.push(s); }
        const k = `${t}|${v}`, n = dup.get(k) || 0;
        dup.set(k, n + 1);
        s.items.push({ id: `u_${sha256hex(`${k}|${n}`).slice(0, 8)}`, text: v, ref: String(ref || '').trim() });
    };

    const rs = rows.map(r => r.map(c => String(c ?? '').trim()));
    if (rs.length) {
        const h = rs[0];
        const si = h.findIndex(c => _SEC_RE.test(c));
        const ii = h.findIndex(c => _ITEM_RE.test(c));
        const ri = h.findIndex(c => _REF_RE.test(c));
        const hasHeader = ii >= 0 || si >= 0;
        const col0Vals = rs.map(r => r[0]).filter(Boolean);
        const col0Repeats = new Set(col0Vals).size < col0Vals.length; // 2열 무헤더: col0 반복 → 영역 열
        const numbered = rs.every(r => !r[0] || /^[0-9]+$/.test(r[0])); // 3열+ 무헤더: col0 전부 번호 → 번호열
        let lastSec = '기관 점검표';
        for (const [idx, r] of rs.entries()) {
            if (idx === 0 && hasHeader) continue;
            if (r.every(c => !c)) continue;
            if (hasHeader) {
                if (si >= 0 && r[si]) lastSec = r[si]; // 병합 셀 계승
                const item = ii >= 0 ? r[ii] : r.filter((c, j) => j !== si && j !== ri).join(' ');
                add(lastSec, item, ri >= 0 ? r[ri] : '');
            } else if (r.length === 1) {
                add(null, r[0]);
            } else if (r.length === 2) {
                col0Repeats ? add(r[0] || lastSec, r[1]) : add(null, r[0], r[1]);
                if (r[0]) lastSec = r[0];
            } else {
                if (numbered) add(null, r.slice(1, -1).join(' ') || r[0], r[r.length - 1]);
                else {
                    if (r[0]) lastSec = r[0];
                    add(lastSec, r.slice(1, -1).join(' ') || r[0], r[r.length - 1]);
                }
            }
        }
    }

    let cur = '기관 점검표';
    for (const l0 of plainLines) {
        const l = String(l0 || '').trim();
        if (!l) continue;
        if (_plainSec(l)) {
            cur = l.replace(/^\d+[.)、]\s*/, '').replace(/^[■◆▶●\s]+/, '').replace(/^[【\[]|[】\]]$/g, '').trim() || cur;
            continue;
        }
        add(cur, l);
    }
    return secs;
}
