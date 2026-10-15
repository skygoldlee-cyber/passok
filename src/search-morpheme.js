// src/search-morpheme.js — 검색 형태소 경계 판정 + 동의어 확장 (순수 로직, DOM 무의존)
// @spec TS-13,TS-14
//
// 배경: 부분문자열 검색은 쿼리 음절열이 어절 중간에서 우연히 겹치는 경우를
// 구별하지 못한다 — '유화'가 '석유|화학'(석유+화학 경계를 걸치는 음절열)이나
// '사유|화'에서 매치되는 식이다. "의미 있는 음절"은 형태소 경계에 정렬된
// 매치로 정의하고, 경계 판정 사전은 검색 인덱스의 어절 자체에서 마이닝한다
// (별도 사전 자산 없이 코퍼스의 복합어 패턴을 재사용 — 오프라인·시험 무관).
//
// 형태소 증거 — 복합어를 이루는 형태소는 어절-두어로 반복 등장한다:
//   '보조' → 보조유화제·보조제·보조성분 / '유화' → 유화제·유화작용·유화액 …
// 독립 어절(words)과 2개 이상 어절의 접두로 재사용된 문자열(prefixes)을
// 어휘로 채택하고, 매치 직전의 단어-문자 접두가 이 어휘로 완전 분해(DP 커버)
// 되면 형태소 경계로 인정한다. 1글자 접두는 분해 불가라 '사유|화'류는 자연 배제.

/** 단어 문자 — 어절 경계(공백·문장부호)와 구분되는 형태소 구성 문자 */
const WORD_CHAR_RE = /[0-9A-Za-z가-힣]/;

/**
 * 경계 어휘집 — 검색 대상 텍스트의 어절들에서 형태소 후보를 마이닝한다.
 * @param {Iterable<string>} tokens - 소문자 정규화된 검색 텍스트의 어절들
 * @returns {{words: Set<string>, prefixes: Set<string>, cover: Map<string, boolean>}}
 *   words=독립 어절, prefixes=2개+ 어절의 접두로 재사용된 문자열(len≥2),
 *   cover=isCoverable 메모이즈 캐시
 */
export function buildBoundaryVocab(tokens) {
    const words = new Set();
    const prefixUse = new Map();
    for (const tok of tokens) {
        if (!tok || tok.length < 2) continue;
        words.add(tok);
        const seen = new Set();
        for (let i = 2; i < tok.length; i++) seen.add(tok.substring(0, i));
        for (const p of seen) prefixUse.set(p, (prefixUse.get(p) || 0) + 1);
    }
    const prefixes = new Set();
    for (const [p, n] of prefixUse) if (n >= 2) prefixes.add(p);
    return { words, prefixes, cover: new Map() };
}

/**
 * 접두가 어휘 형태소들로 완전 분해(연결 커버) 가능한지 — 형태소 경계 판정.
 * 모든 어휘는 len≥2라 1글자 접두는 자연히 분해 불가다.
 * @param {string} s - 매치 시작점 직전의 단어-문자 접두 (빈 문자열이면 false)
 * @param {{words: Set<string>, prefixes: Set<string>, cover: Map<string, boolean>}} vocab
 * @returns {boolean}
 */
export function isCoverable(s, vocab) {
    const n = s ? s.length : 0;
    if (n < 2 || !vocab) return false;
    const cached = vocab.cover.get(s);
    if (cached !== undefined) return cached;
    // DP — ok[i] = s[0:i]가 형태소 연결로 완전 분해 가능
    const ok = new Array(n + 1).fill(false);
    ok[0] = true;
    for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
            if (!ok[j]) continue;
            const seg = s.substring(j, i);
            if (vocab.words.has(seg) || vocab.prefixes.has(seg)) { ok[i] = true; break; }
        }
    }
    vocab.cover.set(s, ok[n]);
    return ok[n];
}

/**
 * 텍스트 내 term의 최고 매치 품질.
 *   2 = 본매치 — 어절 경계(문서 시작·공백·문장부호 직후) 또는 형태소 경계
 *   1 = 부분 매치 — 어절 중간의 우연한 음절열
 *   0 = 매치 없음
 * @param {string} text - 소문자 정규화된 검색 텍스트
 * @param {string} term - 소문자 정규화된 검색어 (공백 포함 변형도 처리)
 * @param {{words: Set<string>, prefixes: Set<string>, cover: Map<string, boolean>}} vocab
 * @returns {0|1|2}
 */
export function termHitQuality(text, term, vocab) {
    const t = String(term || '');
    const s = String(text || '');
    if (!t || !s) return 0;
    /** @type {0|1|2} */
    let best = 0;
    let pos = s.indexOf(t);
    while (pos >= 0 && best < 2) {
        // 매치 직전의 단어-문자 런이 형태소 접두 — 비단어 문자·문서 시작이면 어절 경계
        let r = pos;
        while (r > 0 && WORD_CHAR_RE.test(s[r - 1])) r--;
        best = (r === pos || isCoverable(s.substring(r, pos), vocab)) ? 2 : 1;
        pos = s.indexOf(t, pos + 1);
    }
    return best;
}

/**
 * 동의어 그룹 확장 — registry.synonyms의 정방향(term→alts)·역방향(term이 alts에
 * 포함된 행의 key+alts)을 합집합한다. 한 행(key+alts)이 하나의 동의 개념군이라
 * 그룹 내 OR 매칭, 원어를 선두에 둔다 (랭킹에서 원어 가산과 구분).
 * @param {string} term - 소문자 정규화된 쿼리 어절
 * @param {Object.<string, string[]>|null|undefined} synMap - registry.synonyms
 * @returns {string[]} [원어, ...동의어] (중복 제거)
 */
export function expandSynonyms(term, synMap) {
    const t = String(term || '').toLowerCase();
    if (!t) return [];
    if (!synMap || typeof synMap !== 'object') return [t];
    const out = [t];
    const add = (v) => {
        const s = String(v || '').toLowerCase();
        if (s && !out.includes(s)) out.push(s);
    };
    for (const [key, alts] of Object.entries(synMap)) {
        const k = String(key).toLowerCase();
        const list = Array.isArray(alts) ? alts : [];
        if (k === t || list.some(a => String(a).toLowerCase() === t)) {
            add(k);
            list.forEach(add);
        }
    }
    return out;
}
