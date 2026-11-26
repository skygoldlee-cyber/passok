// learner-profile.js — 학습자 취약 개념 프로필 순수 로직 (AI-41)
// @spec AI-41
//
// { "<label>": { n, lastTs, cid?, src } } 맵 연산만 — DOM·저장소 비의존.
// 영속화는 src/study/learner-profile-store.js (KvStore 어댑터)가 담당.
// 라벨 = confused_concept(1어절)·오판 진술 텍스트 — LLM 구조화 인자로 나가므로
// 상한(60자)·만료(90일)·LRU(200개)로 오염을 완화한다.
// 설계: docs/dev/design/AI_PERSONALIZATION_DESIGN.md §3.3 (DOC-DSN-56)

export const PROFILE_DEFAULTS = Object.freeze({
    maxEntries: 200,    // LRU 상한 — 오래된 항목부터 퇴출
    expireDays: 90,     // lastTs 경과 시 소비 제외 (점진적 망각)
    labelMax: 60,       // 라벨 문자 상한 (ai-client confused 상한과 동일)
    topLimit: 5,        // weakConcepts 주입 상한
});

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_SRC = new Set(['feedback', 'stmt']);

/** @param {*} s @returns {string} 라벨 정규화 — trim + 상한 절단 */
const _label = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, PROFILE_DEFAULTS.labelMax);

/**
 * 프로필에 개념 라벨 1건 누적 — 동일 라벨은 n+1·lastTs 갱신, 상한 초과 시 최장기 미갱신 항목 퇴출.
 * @param {Object.<string, {n:number, lastTs:number, cid?:string, src:string}>|null|undefined} profile
 * @param {{label?: string, cid?: string|null, src?: string}} entry
 * @param {number} [nowMs]
 * @param {{maxEntries?: number}} [opts]
 * @returns {Object} 갱신된 프로필 (입력을 mutate하지 않고 새 맵 반환)
 */
export function recordConcept(profile, entry, nowMs = Date.now(), opts = {}) {
    const out = { ...(profile || {}) };
    const label = _label(entry && entry.label);
    if (!label) return out;
    const src = typeof entry.src === 'string' && VALID_SRC.has(entry.src) ? entry.src : 'stmt';
    const cur = out[label];
    out[label] = {
        n: (cur && cur.n || 0) + 1,
        lastTs: nowMs,
        ...(entry && entry.cid ? { cid: String(entry.cid).slice(0, 40) } : (cur && cur.cid ? { cid: cur.cid } : {})),
        src,
    };
    const max = opts.maxEntries || PROFILE_DEFAULTS.maxEntries;
    const keys = Object.keys(out);
    if (keys.length > max) {
        // LRU — lastTs 오름차순으로 초과분 제거
        const evict = keys.map(k => /** @type {[string, number]} */ ([k, (out[k] && out[k].lastTs) || 0]))
            .sort((a, b) => a[1] - b[1])
            .slice(0, keys.length - max);
        for (const [k] of evict) delete out[k];
    }
    return out;
}

/**
 * 소비용 취약 라벨 목록 — 만료(90일) 항목 제외, 빈도 desc → 최근성 desc 정렬.
 * @param {Object|null|undefined} profile
 * @param {{limit?: number, maxAgeDays?: number, nowMs?: number}} [opts]
 * @returns {string[]} 라벨 배열 (weakConcepts 인자용)
 */
export function topWeakConcepts(profile, opts = {}) {
    const now = opts.nowMs ?? Date.now();
    const maxAge = (opts.maxAgeDays ?? PROFILE_DEFAULTS.expireDays) * DAY_MS;
    const limit = opts.limit ?? PROFILE_DEFAULTS.topLimit;
    return Object.entries(profile || {})
        .filter(([, v]) => v && typeof v === 'object' && Number(v.n) > 0 && (now - (v.lastTs || 0)) <= maxAge)
        .sort((a, b) => (b[1].n - a[1].n) || ((b[1].lastTs || 0) - (a[1].lastTs || 0)))
        .slice(0, limit)
        .map(([label]) => label);
}
