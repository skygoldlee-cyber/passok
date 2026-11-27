// src/passloop/core/mastery.js — 개념 숙련도 맵 (Mastery Path) 순수 로직 (AI-40)
// @spec AI-40
//
// PassLoop 코어 — DOM·저장소·플랫폼 비의존. 입력은 주입받은 신호 맵과
// ContentIndex 포트(ports.js)뿐이며, §앵커 개념 단위로 시도·정답·최근성을
// 집계해 숙련도 점수·등급·다음 학습 추천을 산출한다.
// 설계: docs/dev/design/AI_PERSONALIZATION_DESIGN.md §3.2 (DOC-DSN-56)
//
// 신호 정본 규칙 — statement_stats는 진술 판정의 누적 정본이라 리뷰 로그의
// 동일 sid 항목을 중복 집계하지 않는다. 퀴즈는 quiz_results + 리뷰 로그의
// k:'q' 이벤트가 공존할 수 있어 동일 (문항 id, 시각) 이벤트는 한 번만 반영.

const DAY_MS = 24 * 60 * 60 * 1000;

/** 등급 체계 — score 경계값 (§3.2 산출식) */
export const MASTERY_GRADES = Object.freeze({
    NONE: '미학습',       // 시도 0
    INTRO: '도입',        // score < 40
    PROGRESS: '진행',     // 40~69
    MASTER: '숙련',       // 70~89
    KEEP: '유지',         // ≥ 90
});

export const MASTERY_DEFAULTS = Object.freeze({
    prior: 2,          // 베타 사전 — 소표본 정답률을 0.5로 수렴
    halfLifeDays: 14,  // 망각 반감 — 최근성 계수 감쇠
    minCoverage: 0.3,  // 추천 최소 커버리지 — 측정 없는 영역 제외
    limit: 3,          // 추천 개수
});

/** @param {*} v — ms epoch 또는 'YYYY-MM-DD' → ms (해석 불가 시 null) */
function _ts(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const t = Date.parse(String(v || ''));
    return Number.isFinite(t) ? t : null;
}

/**
 * 개념 집계 누적.
 * @param {Object<string, import('../ports.js').ConceptStat>} out
 * @param {string} cid @param {boolean|null|undefined} ok @param {number|null} ts @param {string} [itemId]
 */
function _bump(out, cid, ok, ts, itemId) {
    const cur = out[cid] || (out[cid] = { n: 0, ok: 0, lastTs: 0, items: new Set() });
    cur.n += 1;
    if (ok === true) cur.ok += 1;
    if (ts && ts > cur.lastTs) cur.lastTs = ts;
    if (itemId) cur.items.add(itemId);
}

/** 문항의 개념 id 집합 — ContentIndex 포트 위임 + 정규화·공백 제거 */
/** @param {*} q @param {import('../ports.js').ContentIndex} port @param {*} norm @param {string} [ctxId]
 * @returns {string[]} */
function _questionCids(q, port, norm, ctxId) {
    return /** @type {string[]} */ ((q && port.questionCids ? port.questionCids(q) : [])
        .map((/** @type {*} */ c) => norm(c, ctxId)).filter(Boolean));
}

/** 1) 진술 통계 누적 — sid별 j/w 누적이 정본 */
/** @param {Object.<string, *>} stmt @param {*} norm @param {Object.<string, import('../ports.js').ConceptStat>} out */
function _accStatementStats(stmt, norm, out) {
    for (const [sid, st] of Object.entries(stmt)) {
        const cid = norm(st && st.cid, sid);
        if (!cid) continue;
        const cur = out[cid] || (out[cid] = { n: 0, ok: 0, lastTs: 0, items: new Set() });
        const j = (st.j || 0) | 0, w = (st.w || 0) | 0;
        cur.n += j;
        cur.ok += Math.max(0, j - w);
        const t = _ts(st.lw);
        if (t && t > cur.lastTs) cur.lastTs = t;
        cur.items.add(sid);
    }
}

/** 2) 퀴즈 결과 누적 — 문항의 conceptId 집합에 귀속 (문항 id, 시각 쌍을 quizSeen에 기록해 리뷰 로그와 중복 제거) */
/** @param {import('../ports.js').MasterySignals} sig @param {import('../ports.js').ContentIndex} port @param {*} norm
 * @param {Object.<string, import('../ports.js').ConceptStat>} out @param {Set<string>} quizSeen */
function _accQuizResults(sig, port, norm, out, quizSeen) {
    for (const [id, r] of Object.entries(sig.quizResults || {})) {
        if (!r || r.solved === false || typeof r.correct !== 'boolean') continue;
        const cids = _questionCids(sig.quizById && sig.quizById[id], port, norm, id);
        const ts = _ts(r.ts);
        quizSeen.add(`${id}@${ts || 0}`);
        for (const cid of cids) _bump(out, cid, r.correct, ts, id);
    }
}

/** k:'q' 리뷰 이벤트 누적 — quizResults와 (id·시각) 중복 제거 후 귀속 */
/** @param {*} e @param {import('../ports.js').MasterySignals} sig @param {import('../ports.js').ContentIndex} port @param {*} norm
 * @param {Object.<string, import('../ports.js').ConceptStat>} out @param {Set<string>} quizSeen @param {number|null} ts */
function _accReviewQuiz(e, sig, port, norm, out, quizSeen, ts) {
    if (quizSeen.has(`${e.c}@${ts || 0}`)) return;
    const cids = _questionCids(sig.quizById && sig.quizById[e.c], port, norm, e.c);
    for (const cid of cids) _bump(out, cid, !!e.ok, ts, e.c);
}

/** 비문항 리뷰 이벤트 누적 — 카드 등 (statementStats에 있는 sid는 진술 통계가 정본이라 건너뜀) */
/** @param {*} e @param {import('../ports.js').MasterySignals} sig @param {Object.<string, *>} stmt @param {import('../ports.js').ContentIndex} port @param {*} norm
 * @param {Object.<string, import('../ports.js').ConceptStat>} out @param {number|null} ts */
function _accReviewEntry(e, sig, stmt, port, norm, out, ts) {
    if (stmt[e.c]) return;
    const item = sig.itemsById && sig.itemsById[e.c];
    const cid = item && port.itemCid ? norm(port.itemCid(item), e.c) : null;
    if (!cid) return;
    // FSRS 레이팅: 1(Again)=실패, 2~4=기억 성공. r·ok 부재 이벤트는 시도만 집계
    const ok = typeof e.ok === 'number'
        ? !!e.ok
        : (typeof e.r === 'number' ? e.r !== 1 : null);
    _bump(out, cid, ok, ts, e.c);
}

/** 3) 리뷰 로그 누적 — k:'q'는 퀴즈 판정, 나머지는 카드 등 비문항 항목 */
/** @param {import('../ports.js').MasterySignals} sig @param {Object.<string, *>} stmt @param {import('../ports.js').ContentIndex} port @param {*} norm
 * @param {Object.<string, import('../ports.js').ConceptStat>} out @param {Set<string>} quizSeen */
function _accReviewLog(sig, stmt, port, norm, out, quizSeen) {
    for (const e of sig.reviewLog || []) {
        if (!e || !e.c) continue;
        const ts = _ts(e.t);
        if (e.k === 'q') _accReviewQuiz(e, sig, port, norm, out, quizSeen, ts);
        else _accReviewEntry(e, sig, stmt, port, norm, out, ts);
    }
}

/**
 * 신호 → 개념(§앵커)별 집계.
 * @param {import('../ports.js').MasterySignals} signals
 * @param {import('../ports.js').ContentIndex} idx — 콘텐츠 해석 포트
 * @returns {Object<string, import('../ports.js').ConceptStat>}
 */
export function collectConceptStats(signals, idx) {
    const sig = signals || {};
    const port = idx || {};
    /** @type {Object<string, import('../ports.js').ConceptStat>} */
    const out = {};
    const norm = (/** @type {*} */ c, /** @type {string|undefined} */ ctxId) =>
        port.normalizeCid ? port.normalizeCid(c, ctxId) : (c || null);
    const stmt = sig.statementStats || {};

    _accStatementStats(stmt, norm, out);
    const quizSeen = new Set();
    _accQuizResults(sig, port, norm, out, quizSeen);
    _accReviewLog(sig, stmt, port, norm, out, quizSeen);

    return out;
}

/** 문항 1건의 conceptId 기여분 — questionCids + 진술 conceptId */
/** @param {*} q @param {import('../ports.js').ContentIndex} port @param {*} add */
function _addQuizCids(q, port, add) {
    const qid = q && q.id;
    for (const raw of (port.questionCids ? port.questionCids(q) : [])) add(raw, qid);
    for (const st of (q && q.statements) || []) {
        if (st && st.conceptId) add(st.conceptId, qid);
    }
}

/**
 * 개념별 콘텐츠 총량 — 커버리지 분모.
 * 항목 단위는 시도 신호의 itemId 단위와 정합: 문항 1·진술 각 1·카드 1.
 * @param {{quizzes?: Array.<Object.<string, *>>, cards?: Array.<Object.<string, *>>}} content
 * @param {import('../ports.js').ContentIndex} idx
 * @returns {import('../ports.js').ConceptTotals}
 */
export function computeConceptTotals(content, idx) {
    const port = idx || {};
    const norm = (/** @type {*} */ c, /** @type {string|undefined} */ ctxId) =>
        port.normalizeCid ? port.normalizeCid(c, ctxId) : (c || null);
    /** @type {Object<string, number>} */
    const totals = {};
    const add = (/** @type {*} */ c, /** @type {string|undefined} */ ctxId) => {
        const cid = norm(c, ctxId);
        if (cid) totals[cid] = (totals[cid] || 0) + 1;
    };

    const body = content || {};
    for (const q of body.quizzes || []) _addQuizCids(q, port, add);
    for (const c of body.cards || []) {
        if (port.itemCid) add(port.itemCid(c), c && c.id);
    }
    return totals;
}

/** 점수 → 숙련도 등급 (§3.2 경계값) */
/** @param {number} n @param {number} score */
function _gradeOf(n, score) {
    return n === 0 ? MASTERY_GRADES.NONE
        : score < 40 ? MASTERY_GRADES.INTRO
        : score < 70 ? MASTERY_GRADES.PROGRESS
        : score < 90 ? MASTERY_GRADES.MASTER
        : MASTERY_GRADES.KEEP;
}

/** 개념 1건의 숙련도 엔트리 — 정답률(베타 사전)·최근성(반감)·커버리지·등급 산출 */
/** @param {string} cid @param {import('../ports.js').ConceptStat|undefined} st @param {import('../ports.js').ConceptTotals} totals
 * @param {*} cfg @param {*} titleOf @param {number} now
 * @returns {import('../ports.js').MasteryEntry} */
function _masteryEntry(cid, st, totals, cfg, titleOf, now) {
    const n = st ? st.n : 0;
    const ok = st ? st.ok : 0;
    const acc = (ok + cfg.prior) / (n + 2 * cfg.prior);
    const r = (st && st.lastTs) ? Math.pow(0.5, Math.max(0, now - st.lastTs) / (cfg.halfLifeDays * DAY_MS)) : 0;
    const score = n > 0 ? Math.round(100 * acc * (0.5 + 0.5 * r)) : 0;
    const attempted = st ? st.items.size : 0;
    const cov = totals[cid] ? Math.min(1, attempted / totals[cid]) : 0;
    return {
        n, ok, acc, r, score, cov, lastTs: st ? st.lastTs : 0,
        grade: _gradeOf(n, score),
        ...(titleOf ? { title: titleOf(cid) } : {}),
    };
}

/**
 * 개념 숙련도 산출 — 집계 신호 + 콘텐츠 총량 → 점수·등급.
 * 개념 열거는 stats ∪ conceptTotals — 총량에만 있는 개념은 미학습(n=0)으로 방출.
 * @param {Object<string, import('../ports.js').ConceptStat>} stats collectConceptStats 출력
 * @param {Object} [opts]
 * @param {import('../ports.js').ConceptTotals} [opts.conceptTotals]
 * @param {import('../ports.js').ContentIndex} [opts.idx] conceptTitle 라벨용 포트
 * @param {import('../ports.js').MasteryConfig} [opts.config]
 * @returns {Object<string, import('../ports.js').MasteryEntry>}
 */
export function computeMastery(stats, opts = {}) {
    const cfg = { ...MASTERY_DEFAULTS, ...(opts.config || {}) };
    const totals = opts.conceptTotals || {};
    const titleOf = (opts.idx && opts.idx.conceptTitle) || null;
    const now = typeof cfg.nowMs === 'number' ? cfg.nowMs : Date.now();

    /** @type {Object<string, import('../ports.js').MasteryEntry>} */
    const out = {};
    const src = stats || {};
    for (const cid of new Set([...Object.keys(src), ...Object.keys(totals)])) {
        out[cid] = _masteryEntry(cid, src[cid], totals, cfg, titleOf, now);
    }
    return out;
}

/**
 * 다음 학습 추천 — 도입~진행 등급이면서 커버리지가 확보된 최하 숙련 개념.
 * 미학습 개념은 측정 부재라 제외한다 (§3.2 — 측정 없는 영역을 취약으로 오인하지 않음).
 * @param {Object<string, import('../ports.js').MasteryEntry>} mastery computeMastery 출력
 * @param {import('../ports.js').MasteryConfig} [config]
 * @returns {import('../ports.js').MasteryAction[]}
 */
export function nextActions(mastery, config = {}) {
    const cfg = { ...MASTERY_DEFAULTS, ...config };
    return Object.entries(mastery || {})
        .filter(([, m]) => m && (m.grade === MASTERY_GRADES.INTRO || m.grade === MASTERY_GRADES.PROGRESS)
            && m.cov >= cfg.minCoverage)
        .sort(([, a], [, b]) => (a.score - b.score) || (b.cov - a.cov))
        .slice(0, cfg.limit)
        .map(([cid, m]) => ({ cid, score: m.score, grade: m.grade, cov: m.cov, ...(m.title ? { title: m.title } : {}) }));
}
