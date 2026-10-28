// src/personalization.js — 개인 맞춤형 학습 고도화 순수 로직 (DOM·저장 비의존)
// @spec PS-01,PS-02,PS-03,PS-04,PS-05,PS-06,PS-07,PS-08,PS-09,PS-10,PS-11
//
// 기존 자산(FSRS 리뷰 로그·statement_stats·EMB_NEIGHBORS·BKT·study alloc)의
// 조합으로 교재/CBT/인강이 구조적으로 제공 불가한 개인화 계층을 구현한다.
// 모든 함수는 데이터를 주입받아 계산만 한다 — 렌더·저장은 뷰/어댑터 소관.

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ── PS-01 약점 개념 클러스터 ─────────────────────────────────────
// 취약 진술(오답 누적)을 의미 이웃 그래프로 연결해 "무너진 개념 축"으로 묶는다.
// 이웃 자산 없으면 cid(개념 그룹) 기준으로 폴백 — 기능이 조용히 저하되지 않는다.
/**
 * @param {Object} stats - statement_stats {sid:{j,w,lw,t,truth,cid}}
 * @param {Object} [adj] - EMB_NEIGHBORS.adj { "stmt:<sid>": [[key,cos],...] }
 * @param {number} [minWrong=2] - 취약 판정 최소 오답수
 * @param {number} [minCos=0.72] - 클러스터 결합 최소 코사인
 * @returns {Array<{id:string, label:string, members:Array<{sid:string,text:string,truth:string,wrong:number,right:number,cid:string}>, totalWrong:number, size:number}>}
 */
export function clusterWeakConcepts(stats, adj = null, minWrong = 2, minCos = 0.72) {
    const weak = Object.entries(stats || {})
        .filter(([, s]) => (s.w || 0) >= minWrong)
        .map(([sid, s]) => ({ sid, text: s.t || '', truth: s.truth || '', wrong: s.w || 0, right: s.j || 0, cid: s.cid || '' }));
    if (!weak.length) return [];
    const parent = new Map(weak.map(w => [w.sid, w.sid]));
    const find = x => { while (parent.get(x) !== x) x = parent.get(x); return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    const sids = new Set(weak.map(w => w.sid));
    if (adj) {
        for (const w of weak) {
            for (const [key, cos] of (adj[`stmt:${w.sid}`] || [])) {
                const nid = String(key).replace(/^stmt:/, '');
                if (sids.has(nid) && cos >= minCos) union(w.sid, nid);
            }
        }
    }
    // cid(개념 그룹) 공통 진술은 이웃 자산 유무와 무관하게 항상 결합 — §앵커 공유는
    // 임베딩 이웃이 못 잡는 동일 개념 신호 (이웃 없을 때의 폴백 역할도 겸함)
    {
        const byCid = new Map();
        for (const w of weak) { if (!w.cid) continue; (byCid.get(w.cid) || byCid.set(w.cid, []).get(w.cid)).push(w.sid); }
        for (const g of byCid.values()) for (let i = 1; i < g.length; i++) union(g[0], g[i]);
    }
    const groups = new Map();
    for (const w of weak) { const r = find(w.sid); (groups.get(r) || groups.set(r, []).get(r)).push(w); }
    return [...groups.values()]
        .map(members => {
            members.sort((a, b) => b.wrong - a.wrong);
            const rep = members[0];
            return {
                id: rep.cid || rep.sid,
                label: rep.text ? rep.text.slice(0, 40) : (rep.cid || rep.sid),
                members,
                size: members.length,
                totalWrong: members.reduce((a, m) => a + m.wrong, 0),
            };
        })
        .sort((a, b) => b.totalWrong - a.totalWrong || b.size - a.size);
}

// ── PS-02 취약 자동편성 모의고사 ─────────────────────────────────
/**
 * 취약 진술·카드 중심 개인 전용 문항 세트 자동 편성.
 * @param {Object} input { statementStats, weakCards:Set<string>, questionSubjects:{qid:subject} }
 * @param {number} [size=20]
 * @returns {{ items:string[], bySubject:Object, coverage:number }} 취약 커버율 포함
 */
export function buildWeakMock(input, size = 20) {
    const { statementStats = {}, weakCards = new Set(), questionSubjects = {} } = input || {};
    const scored = new Map();
    for (const [sid, s] of Object.entries(statementStats)) {
        const w = s.w || 0; if (!w) continue;
        scored.set(sid, w * 2 + (s.j || 0));
    }
    for (const id of weakCards) scored.set(id, (scored.get(id) || 0) + 3);
    const items = [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, size).map(([id]) => id);
    const bySubject = {};
    for (const id of items) { const subj = questionSubjects[id] || '기타'; bySubject[subj] = (bySubject[subj] || 0) + 1; }
    const weakTotal = scored.size || 1;
    return { items, bySubject, coverage: items.length / weakTotal };
}

// ── PS-03 통합 학습 큐 ───────────────────────────────────────────
// FSRS 복습 대기·취약 진술·계획 밀림 과목·미학습을 단일 우선순위 큐로.
/**
 * @param {Object} input { dueCount, weakCount, behindSubjects:[{key,name,daysBehind}], unlearnedCount, subjectNames }
 * @returns {Array<{type:string, priority:number, title:string, reason:string, payload:Object}>}
 */
export function buildTodayQueue(input) {
    const { dueCount = 0, weakCount = 0, behindSubjects = [], unlearnedCount = 0 } = input || {};
    const q = [];
    if (behindSubjects.length) {
        for (const s of behindSubjects.slice(0, 2)) {
            q.push({ type: 'behind', priority: 90 + (s.daysBehind || 0), title: s.name || s.key, reason: `계획 대비 ${s.daysBehind}일 밀림`, payload: s });
        }
    }
    if (dueCount > 0) q.push({ type: 'srs', priority: 80 + Math.min(dueCount, 20), title: `복습 카드 ${dueCount}개`, reason: '망각 전 복습 시점 도래', payload: { count: dueCount } });
    if (weakCount > 0) q.push({ type: 'weak', priority: 60 + Math.min(weakCount, 15), title: `취약 진술 ${weakCount}개`, reason: '반복 오판 진술 정리 필요', payload: { count: weakCount } });
    if (unlearnedCount > 0) q.push({ type: 'new', priority: 30, title: `미학습 ${unlearnedCount}개`, reason: '커버리지 확보', payload: { count: unlearnedCount } });
    return q.sort((a, b) => b.priority - a.priority);
}

// ── PS-04 합격 확률 추정 ─────────────────────────────────────────
// 과목 숙달도(BKT P(L))·기억률(FSRS)·모의고사 추세의 로지스틱 혼합.
// 컷오프 대비 마진 → 합격 확률 + 과목별 필요 학습량 역산.
/**
 * @param {Object} input { subjectMastery:{key:0..1}, dueRatio:0..1, mockRates:number[], cutoff=0.6 }
 * @returns {{ probability:number, passLine:number, weakest:string|null, needHours:Object, margin:number }}
 */
export function estimatePassProb(input) {
    const { subjectMastery = {}, dueRatio = 0, mockRates = [], cutoff = 0.6 } = input || {};
    const keys = Object.keys(subjectMastery);
    const mastery = keys.length ? keys.reduce((a, k) => a + subjectMastery[k], 0) / keys.length : 0;
    const mock = mockRates.length ? mockRates.reduce((a, r) => a + r, 0) / mockRates.length : mastery;
    const retention = 1 - clamp(dueRatio, 0, 1);
    const score = 0.5 * mastery + 0.3 * mock + 0.2 * retention;
    const margin = score - cutoff;
    const probability = 1 / (1 + Math.exp(-10 * margin)); // 컷오프 근처 급경사
    const needHours = {};
    let weakest = null, wv = 1;
    for (const k of keys) {
        const deficit = Math.max(0, cutoff - subjectMastery[k]);
        needHours[k] = Math.round(deficit * 40); // 과목당 결손 1.0 ≈ 40h 추정 상수
        if (subjectMastery[k] < wv) { wv = subjectMastery[k]; weakest = k; }
    }
    return { probability: +probability.toFixed(3), passLine: cutoff, weakest, needHours, margin: +margin.toFixed(3) };
}

// ── PS-05 취약→교재 딥링크 ──────────────────────────────────────
// statement_stats.cid(§앵커/레거시 L####)를 교재 섹션 링크로 해석.
/**
 * @param {Object} statEntry - { cid, t, w }
 * @param {function(string):string|null} resolve - cid → 교재 앵커 URL
 * @returns {{ cid:string, url:string|null, text:string }}
 */
export function weakRefLink(statEntry, resolve) {
    const cid = statEntry?.cid || '';
    return { cid, url: cid && resolve ? resolve(cid) : null, text: statEntry?.t || '' };
}

// ── PS-06 FSRS 개인 파라미터 피팅 ────────────────────────────────
// 리뷰 로그 (간격일, 정오)로 망각 지수 w20만 개인 피팅 — 전체 W 재추정은
// 표본이 부족하므로 곡선 형상 파라미터 하나로 제한 (LEARNING_ALGORITHM_DESIGN §2).
/**
 * @param {Array<{days:number, correct:boolean, stability:number}>} log
 * @param {number} [minSamples=300] - 피팅 실질 하한
 * @returns {{ w20:number|null, samples:number, fitted:boolean }}
 */
export function fitFsrsParams(log, minSamples = 300) {
    const samples = (log || []).filter(r => r.days > 0 && r.stability > 0);
    if (samples.length < minSamples) return { w20: null, samples: samples.length, fitted: false };
    let best = { w20: 0.1542, cost: Infinity }; // 기본값에서 탐색
    for (let w = 0.05; w <= 0.40; w += 0.01) {
        const decay = -w, factor = Math.pow(0.9, -1 / w) - 1;
        let cost = 0;
        for (const r of samples) {
            const R = Math.pow(1 + factor * r.days / r.stability, decay);
            cost += (R - (r.correct ? 1 : 0)) ** 2;
        }
        if (cost < best.cost) best = { w20: +w.toFixed(4), cost };
    }
    return { w20: best.w20, samples: samples.length, fitted: true };
}

// ── PS-07 입문 진단 P0 초기화 ────────────────────────────────────
/**
 * 배치 퀴즈 정답률 → 과목별 BKT P0 (콜드스타트 개인화).
 * @param {Object} rates {subjectKey: 0..1}
 * @returns {Object} {subjectKey: P0} — 0.15~0.85 클램프
 */
export function inferP0(rates) {
    const out = {};
    for (const [k, v] of Object.entries(rates || {})) out[k] = +clamp(v, 0.15, 0.85).toFixed(2);
    return out;
}

// ── PS-08 오답 원인 자동 추론 ────────────────────────────────────
// 행동 신호(풀이시간·선택지 변경·자신감)로 원인 후보 추론 — 수동 태깅 마찰 제거.
/**
 * @param {Object} obs { ms:number, changed:boolean, confidence:'low'|'high'|null, wasCorrect:boolean }
 * @returns {string|null} 'careless'|'concept'|'doubt'|'unknown'
 */
export function inferCause(obs) {
    if (!obs || obs.wasCorrect !== false) return null;
    if (obs.confidence === 'high') return 'concept';      // 확신 오답 = 개념 오류
    if (obs.changed) return 'doubt';                      // 정답→오답 변경 = 망설임
    if (obs.ms != null && obs.ms < 3000) return 'careless'; // 즉답 오답 = 실수
    if (obs.ms != null && obs.ms > 60000) return 'concept'; // 장고 오답 = 이해 부족
    return 'unknown';
}

// ── PS-09 주간 리포트 ───────────────────────────────────────────
/**
 * @param {Object} input { solvedWeek:number, planWeek:number, wrongWeek:number, topCluster:string|null, weakestSubject:string|null }
 * @returns {{ adherence:number, headline:string, suggestion:string, wrongWeek:number }}
 */
export function weeklyReport(input) {
    const { solvedWeek = 0, planWeek = 0, wrongWeek = 0, topCluster = null, weakestSubject = null } = input || {};
    const adherence = planWeek > 0 ? clamp(solvedWeek / planWeek, 0, 2) : 0;
    const headline = planWeek > 0
        ? `주간 계획 ${solvedWeek}/${planWeek} (${Math.round(adherence * 100)}%)`
        : `주간 ${solvedWeek}문 풀이`;
    const suggestion = topCluster
        ? `최다 오개념 '${topCluster}' 복습 권장`
        : weakestSubject ? `취약 과목 '${weakestSubject}' 배분 상향` : '계획 유지';
    return { adherence: +adherence.toFixed(2), headline, suggestion, wrongWeek };
}

// ── PS-10 AI 오개념 클리닉 (v1 규칙 기반 — LLM v2 로드맵) ────────
/**
 * 클러스터 단위 복습 처방 텍스트 — 개념 앵커·유사 진술 수를 이용한 결정론 생성.
 * @param {Object} cluster - clusterWeakConcepts() 결과 원소
 * @param {Object} [opts] { neighborCount:number, refUrl:string|null }
 * @returns {{ headline:string, steps:string[] }}
 */
export function generateClinic(cluster, opts = {}) {
    if (!cluster) return { headline: '', steps: [] };
    const steps = [
        `대표 진술 '${cluster.label}' 계열 ${cluster.size}개에서 ${cluster.totalWrong}회 오판 — 개념 단위 복습 대상`,
    ];
    if (opts.refUrl) steps.push(`교재 해당 섹션 복습: ${opts.refUrl}`);
    if (opts.neighborCount) steps.push(`의미 유사 진술 ${opts.neighborCount}개로 동일 개념 재확인`);
    steps.push('취약 진술 재시도 드릴로 정오 판정 3연속 정답 시 졸업');
    return { headline: `오개념 클리닉: ${cluster.label}`, steps };
}

// ── PS-11 BKT 과목별 전이율 피팅 ─────────────────────────────────
// 정오 시퀀스 로그 우도 최대화로 과목별 T 격자 탐색 (0.02~0.30).
/**
 * @param {boolean[]} seq - 시간순 정오 관측
 * @param {Object} [params] { P0, G, S } — T만 피팅
 * @returns {{ T:number, logLik:number }}
 */
export function fitKT(seq, params = {}) {
    const { P0 = 0.30, G = 0.15, S = 0.10 } = params;
    if (!seq || !seq.length) return { T: 0.08, logLik: 0 };
    let best = { T: 0.08, logLik: -Infinity };
    for (let T = 0.02; T <= 0.30; T += 0.01) {
        let pl = P0, ll = 0;
        for (const ok of seq) {
            const pC = pl * (1 - S) + (1 - pl) * G;
            ll += Math.log(ok ? pC : 1 - pC);
            const post = ok ? (pl * (1 - S)) / pC : (pl * S) / (1 - pC);
            pl = post + (1 - post) * T;
        }
        if (ll > best.logLik) best = { T: +T.toFixed(2), logLik: ll };
    }
    return best;
}
