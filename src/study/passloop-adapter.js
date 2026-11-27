// src/study/passloop-adapter.js — PassLoop 엔진 런타임 어댑터 (AI-40)
// @spec AI-40
//
// src/passloop 코어(순수·비의존)와 플랫폼 계층의 경계 (DOC-DSN-56 §3.7).
// 저장소 신호(statement_stats·quiz_results·fc_review_log)를 수집하고,
// ContentIndex 포트를 PassOK 콘텐츠 체계로 구현해 주입한다.
//
// 개념 키: `subj:§N.M` — §앵커의 Chapter 번호는 과목별로 리셋되어 과목 간
// 충돌하므로 과목 키를 포함한다 (tools/build/textbook_anchors.js 규약).

import { state } from '../core/state.js';
import { DataLoader } from '../content/data-loader.js';
import { getReviewLog } from './spaced-repetition.js';
import { getAllStatementStats } from './statement-tracker.js';
import { resolveWrongQuiz, resolveCard } from './weak-items.js';
import { subjectFromSid, normalizeCidAnchor } from './analysis-engine.js';
import {
    collectConceptStats, computeConceptTotals, computeMastery, nextActions,
} from '../passloop/index.js';

const QUALIFIED_RE = /^[^\s]+:§\d/;            // 이미 과목한정된 키
const TITLE_DECOR_RE = /^[^\p{L}\p{N}]+/u;    // '## 📚 Chapter…' 장식 제거
const CHAPTER_TITLE_RE = /^Chapter\s+(\d+)\./;
const SECTION_TITLE_RE = /^(\d+)\./;
const CID_RE = /^([^\s]+):§(\d+)(?:\.(\d+))?$/;

/** @param {*} t @returns {string} */
const _normTitle = (t) => String(t || '').replace(TITLE_DECOR_RE, '').trim();

/** @returns {{questions: Object.<string, string>, ranges: Object.<string, Array.<[string, string]>>, cidSection: *, chapterTitles: *}} */
const _qc = () => (DataLoader._questionChapters)
    || { questions: {}, ranges: {}, cidSection: {}, chapterTitles: {} };

/** CHAPTER_RANGES → 과목별 {title→'N.M'} + {`subj:§N.M`→title} 맵.
 *  앵커 생성 규약은 textbook_anchors.js와 동일 (chap=0 기본값 — 서두 섹션 0.M)
 * @param {Object.<string, Array.<[string, string]>>|undefined} ranges
 * @returns {{byTitle: Object.<string, Object.<string, string>>, byAnchor: Object.<string, string>}}
 */
function _buildAnchorMaps(ranges) {
    const /** @type {Object.<string, Object.<string, string>>} */ byTitle = {},
        /** @type {Object.<string, string>} */ byAnchor = {};
    for (const [subj, list] of Object.entries(ranges || {})) {
        const /** @type {Object.<string, string>} */ m = {};
        byTitle[subj] = m;
        let chap = 0;
        for (const [, rawTitle] of list || []) {
            const title = _normTitle(rawTitle);
            const cm = CHAPTER_TITLE_RE.exec(title);
            if (cm) { chap = Number(cm[1]); m[title] = `${chap}.0`; byAnchor[`${subj}:§${chap}.0`] = title; continue; }
            const sm = SECTION_TITLE_RE.exec(title);
            if (sm) {
                const a = `${chap}.${Number(sm[1])}`;
                if (!(title in m)) { m[title] = a; byAnchor[`${subj}:§${a}`] = title; }
            }
        }
    }
    return { byTitle, byAnchor };
}

/** id 접두(첫 어절) → 과목 키 — STUDY_DATA 등재 과목만 인정 */
/** @param {string|null|undefined} ctxId @returns {string|null} */
function _subjectByPrefix(ctxId) {
    const prefix = String(ctxId || '').split('_')[0] || '';
    const data = (typeof window !== 'undefined' && window.STUDY_DATA) || {};
    return data[prefix] ? prefix : null;
}

/** 신호 항목 id → 과목 키 — 퀴즈·카드 인덱스, sid 패턴, id 접두 순으로 해석
 * @param {string|null|undefined} ctxId @returns {string|null} */
function _subjectOf(ctxId) {
    const q = ctxId && resolveWrongQuiz(ctxId);
    if (q) return q.subjectId;
    const c = ctxId && resolveCard(ctxId);
    if (c) return c.subjectId;
    const sid = ctxId ? subjectFromSid(ctxId) : null;
    if (sid) return sid;
    return _subjectByPrefix(ctxId);
}

/** ContentIndex 구현 — normalizeCidAnchor(기존 순수) + 과목 스코프 확장
 * @param {*} cidSection @returns {(raw: *, ctxId: string|null|undefined) => string|null} */
function _normalizeCid(cidSection) {
    return (raw, ctxId) => {
        const s = String(raw || '').trim();
        if (!s) return null;
        if (QUALIFIED_RE.test(s)) return s;
        const subj = _subjectOf(ctxId);
        const a = normalizeCidAnchor(s, subj, cidSection);
        if (!a) return null;
        if (a.startsWith('§')) return subj ? `${subj}:${a}` : null;
        if (/^\d+(\.\d+)?$/.test(a)) return subj ? `${subj}:§${a}` : null;
        return null;  // 의미 그룹명 등 비앵커 — 숙련도 맵 키로 쓰지 않음
    };
}

/** @param {string} subj @returns {string} */
function _subjectName(subj) {
    const list = (DataLoader.registry && DataLoader.getSubjectList) ? DataLoader.getSubjectList() : [];
    const s = list.find(x => x.key === subj);
    return (s && s.name) || subj;
}

/** 문항 → 과목한정 §앵커 cid — 문제은행 챕터 매핑(byTitle) 해석 */
/** @param {*} q @param {*} qc @param {Object.<string, Object.<string, string>>} byTitle @returns {string|null} */
function _questionAnchorCid(q, qc, byTitle) {
    const subj = _subjectOf(q && q.id);
    const title = qc.questions[q && q.id];
    const a = subj && title && byTitle[subj] && byTitle[subj][_normTitle(title)];
    return a ? `${subj}:§${a}` : null;
}

/** 문항의 개념 id 집합 — §앵커 매핑 + 명시 conceptId + 진술 conceptId */
/** @param {*} q @param {*} qc @param {Object.<string, Object.<string, string>>} byTitle @returns {string[]} */
function _questionCidsOf(q, qc, byTitle) {
    const out = new Set();
    const anchored = _questionAnchorCid(q, qc, byTitle);
    if (anchored) out.add(anchored);
    if (q && q.conceptId) out.add(q.conceptId);
    for (const st of (q && q.statements) || []) if (st && st.conceptId) out.add(st.conceptId);
    return [...out];
}

/** 엔진 주입용 ContentIndex + 표시 보조 맵 묶음 */
function _buildIndex() {
    const qc = _qc();
    const { byTitle, byAnchor } = _buildAnchorMaps(qc.ranges);
    const idx = {
        normalizeCid: _normalizeCid(qc.cidSection),
        questionCids: (/** @type {*} */ q) => _questionCidsOf(q, qc, byTitle),
        itemCid: (/** @type {*} */ item) => {
            const subj = _subjectOf(item && item.id);
            const title = _normTitle(item && item.category);
            const a = subj && title && byTitle[subj] && byTitle[subj][title];
            return a ? `${subj}:§${a}` : null;
        },
        conceptTitle: (/** @type {string} */ cid) => {
            const m = CID_RE.exec(String(cid));
            if (!m) return cid;
            return `${_subjectName(m[1] || '')} · ${byAnchor[cid] || `§${m[2]}${m[3] ? `.${m[3]}` : ''}`}`;
        },
    };
    return { idx, byAnchor };
}

/**
 * 개념 키 → 딥링크 메타 — 개념 드릴은 DR-08 규약의 평탄 `§N.M`,
 * 교재는 (subj, 섹션제목, 챕터앵커 chNN) 인자용.
 * @param {string} cid `subj:§N.M`
 */
export function describeConcept(cid) {
    const m = CID_RE.exec(String(cid));
    if (!m) return null;
    const { byAnchor } = _buildAnchorMaps(_qc().ranges);
    return {
        subj: m[1],
        anchor: `§${m[2]}${m[3] ? `.${m[3]}` : ''}`,
        chapterAnchor: `ch${String(m[2]).padStart(2, '0')}`,
        title: byAnchor[cid] || null,
        subjName: _subjectName(m[1] || ''),
    };
}

/** STUDY_DATA 전 과목의 문항·카드 인덱스 — weak_quiz_ 오답 id 별칭 포함 */
/** @returns {{quizById: Object.<string, *>, itemsById: Object.<string, *>}} */
function _collectSignalIndexes() {
    const /** @type {Object.<string, *>} */ quizById = {},
        /** @type {Object.<string, *>} */ itemsById = {};
    const data = (typeof window !== 'undefined' && window.STUDY_DATA) || {};
    for (const subj of Object.values(data)) {
        for (const q of (subj && subj.quizzes) || []) {
            quizById[q.id] = q;
            quizById[`weak_quiz_${q.id}`] = q;   // 오답 결과 id 별칭
        }
        for (const c of (subj && subj.cards) || []) itemsById[c.id] = c;
    }
    return { quizById, itemsById };
}

/**
 * 현재 진행 신호 → 개념 숙련도 스냅샷.
 * @param {*} [config] 엔진 설정 오버라이드
 * @returns {{mastery: Object, actions: Array.<*>, evidenced: number, subjects: string[]}|null}
 *   신호가 하나도 없으면 null (뷰는 온보딩 상태를 그린다)
 */
export function masterySnapshot(config) {
    const { idx } = _buildIndex();
    const { quizById, itemsById } = _collectSignalIndexes();
    const stats = collectConceptStats({
        statementStats: /** @type {*} */ (getAllStatementStats()),
        quizResults: state.quizResults,
        quizById,
        itemsById,
        reviewLog: getReviewLog(),
    }, idx);
    const totals = computeConceptTotals({
        quizzes: Object.values(quizById),
        cards: Object.values(itemsById),
    }, idx);
    const mastery = computeMastery(stats, { conceptTotals: totals, idx, config });
    const entries = Object.values(mastery);
    if (!entries.length) return null;
    return {
        mastery,
        actions: nextActions(mastery, config),
        evidenced: entries.filter(m => m.n > 0).length,
        subjects: [...new Set(Object.keys(mastery).map(cid => String(cid).split(':')[0] || ''))],
    };
}
