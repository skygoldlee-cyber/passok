// src/study/concept-drill.js — 개념 문항 딥링크 선별 순수 로직 (DOM·저장소 비의존)
// @spec DR-08
//
// `#/trainer/concept/<cid>` 딥링크로 진입했을 때 해당 개념(conceptId)의 문항을
// 기존 문제은행에서 선별한다. 생성형이 아닌 선정형 — weak-items.js의
// collectWeakConceptQuizzes와 같은 패턴을 단일 개념 단위로 좁힌 것.
// 설계: docs/dev/design/LEARNING_MEDIA_LINK_DESIGN.md §3 (DOC-DSN-52)

/**
 * 개념 식별자 정규화 — `2.3`·`§2.3`·레거시 `L####` 입력을 §앵커로 환산.
 * @param {string} raw - 해시 슬러그 또는 임의 conceptId
 * @param {*} [cidSection] CID_SECTION 맵 — {과목: {L####: §앵커}} 또는 평면 {L####: §앵커} (AN-10)
 * @returns {string|null} `§N.M` 형태, 해석 불가면 null
 */
export function normalizeConceptCid(raw, cidSection = {}) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (/^§?\d+(\.\d+)?$/.test(s)) {
        return s[0] === '§' ? s : '§' + s;
    }
    if (/^L\d+$/i.test(s)) {
        // CID_SECTION은 과목→{라인:앵커} 중첩 맵 — 첫 일치 항목을 사용 (같은 L은 과목 내 유일)
        // 맵 값은 § 없는 '2.3' 형태 — § 접두를 붙여 앵커로 반환 (normalizeCidAnchor와 동일 규약)
        for (const subj of Object.values(cidSection || {})) {
            if (subj && typeof subj === 'object' && subj[s]) return '§' + String(subj[s]).replace(/^§/, '');
        }
        if (cidSection && typeof cidSection === 'object' && cidSection[s]) {
            return '§' + String(cidSection[s]).replace(/^§/, '');
        }
    }
    return null;
}

/**
 * 문항이 건드리는 개념 집합 — 문항 conceptId + 진술 conceptId를 수집.
 * §앵커로 환산 가능한 값은 정규화본을, 그 외(의미 그룹명 '신고주체' 등)는 원형을 함께 담는다.
 * @param {*} q
 * @param {*} [cidSection]
 * @returns {Set<string>}
 */
function questionCids(q, cidSection) {
    const cids = new Set();
    const push = (/** @type {*} */ v) => {
        const s = String(v || '').trim();
        if (!s) return;
        const norm = normalizeConceptCid(s, cidSection);
        cids.add(norm || s);
    };
    push(q && q.conceptId);
    for (const st of (q && q.statements) || []) push(st && st.conceptId);
    return cids;
}

/**
 * 개념 문항 선별 — cid와 직접 일치하는 문항 우선, 같은 장(§N.)의 인접 개념으로 보충.
 * 각 층위 내에서는 오답 문항 → 미풀이 → 풀이 이력 순.
 * cid가 §앵커가 아닌 의미 그룹명('신고주체' 등)이면 직접 일치만 적용(인접 보충 없음).
 * @param {Object} studyData - { subj: { quizzes: [...] } } (window.STUDY_DATA)
 * @param {string} cid - 정규화된 §앵커 (`§2.3`) 또는 conceptId 원형
 * @param {Object} [opts]
 * @param {number} [opts.cap] 최대 문항 수 (기본 5)
 * @param {Set<string>} [opts.wrongIds] 오답 문항 id 집합
 * @param {Set<string>} [opts.solvedIds] 풀이 이력 문항 id 집합
 * @param {*} [opts.cidSection] CID_SECTION 맵 — 레거시 L#### conceptId 환산용
 * @returns {object[]} 선정 문항 배열 (원본 참조)
 */
export function pickConceptQuestions(studyData, cid, opts = {}) {
    const { cap = 5, wrongIds = new Set(), solvedIds = new Set(), cidSection = {} } = opts;
    if (!cid) return [];
    const chapter = (String(cid).match(/^§(\d+)\./) || [])[1];
    const chapterPrefix = chapter ? `§${chapter}.` : null;
    const direct = [], adjacent = [];
    for (const d of Object.values(studyData || {})) {
        for (const q of (d && d.quizzes) || []) {
            const cids = questionCids(q, cidSection);
            if (!cids.size) continue;
            if (cids.has(cid)) { direct.push(q); continue; }
            if (chapterPrefix && [...cids].some(c => c.startsWith(chapterPrefix))) adjacent.push(q);
        }
    }
    const rank = (/** @type {*} */ q) => wrongIds.has(q.id) ? 0 : (solvedIds.has(q.id) ? 2 : 1);
    const byTier = (/** @type {*} */ a, /** @type {*} */ b) => rank(a) - rank(b);
    return direct.sort(byTier).concat(adjacent.sort(byTier)).slice(0, cap);
}
