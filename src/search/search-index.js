// src/search-index.js — 통합검색 인덱스 코어 (순수 로직, DOM·콘텐츠 종류 무관)
// @spec TS-08~09,TS-13~18
// 인덱스 구축·무효화·역색인·형태소 어휘·매칭/랭킹·소스 레지스트리를 담당한다.
// 콘텐츠 소스(교재·서사·참조자료·문제은행)의 구조 지식은 search-sources.js의
// 프로바이더가 갖고, 코어는 범용 SearchDoc 엔트리(kind·subjId·_searchText·nav)만 다룬다.
// 뷰 계층은 이 모듈의 runUnifiedSearch 결과를 렌더만 한다.
import { DataLoader } from '../content/data-loader.js';
import { getActiveExamId } from '../exam-context.js';
import { termHitQuality, expandSynonyms } from './search-morpheme.js';

let _searchIndex = null;
let _searchIndexKeys = null;
let _tokenIndex = null;    // 어절 → Set<entryIndex> (TS-13 경계 매칭의 후보 축소)
let _morphVocab = null;    // TS-13 형태소 경계 어휘 (어절-두어 빈도 마이닝)
let _indexExamId = null;   // 인덱스를 구축한 시험 — 시험 전환 시 지연 병합분도 함께 폐기
let _candidateCache = new Map(); // 변형 → 후보 항목 Set (인덱스 변형 시 무효화)
let _vocabWords = null;    // 형태소 어휘 증분 상태 — 독립 어절
let _vocabPrefixUse = null; // 접두 → 재사용 어절 수
let _vocabPrefixes = null; // 2회+ 재사용 접두 (형태소 후보)

/** @type {Array<() => Iterable<string>>} 형태소 어휘 공급자 — 콘텐츠 계층이 등록 (TS-16) */
const _VOCAB_CONTRIBUTORS = [];

/**
 * 형태소 어휘 공급자 등록 — 인덱스 구축 시 반환 어절들을 독립 어절로 주입한다.
 * 코퍼스 빈도 마이닝(2회+ 접두)이 놓치는 도메인 용어도 DP 커버의 분해 단위가 되게 한다.
 * 같은 함수의 재등록은 무시한다(idempotent).
 * @param {() => Iterable<string>} fn
 */
export function registerVocabContributor(fn) {
    if (typeof fn === 'function' && !_VOCAB_CONTRIBUTORS.includes(fn)) _VOCAB_CONTRIBUTORS.push(fn);
}

/** 인덱스가 구축한 형태소 경계 어휘 — 콘텐츠 계층의 termHitQuality 판정에 사용 */
export function _getMorphVocab() { return _morphVocab; }

// --- TS-18: 검색 소스 레지스트리 ---
// 코어는 콘텐츠 종류를 모른다 — 소스는 registerSearchSource()로 등록되며
// load()는 엔트리 배열(eager·동기) 또는 Promise<엔트리[]>(lazy·비동기)를 반환한다.
// lazy 소스의 지연 상태(기동 promise·병합 entries·시험 전환 폐기·실패 재시도 억제)는
// 코어가 소스별로 일원 관리한다.
/** @typedef {{id:string, kind:string, lazy:boolean, load:()=>any, rev:(()=>string)|undefined, promise:Promise<number>|null, entries:Array<object>|null}} SearchSource */
/** @type {Map<string, SearchSource>} */
const _SOURCES = new Map();

/**
 * 검색 소스 등록 — id와 load 함수만 필수. 같은 id 재등록은 무시한다(idempotent).
 * @param {{id:string, kind?:string, lazy?:boolean, load:()=>any, rev?:()=>string}} desc
 *   lazy:true면 첫 ensureLazyIndexes에서 비동기 로드, false면 인덱스 구축 시 동기 수집.
 *   rev()는 소스 데이터 변경 신호 — 반환 문자열이 바뀌면 인덱스 캐시를 무효화한다.
 */
export function registerSearchSource(desc) {
    if (!desc || !desc.id || typeof desc.load !== 'function') return;
    if (_SOURCES.has(desc.id)) return;
    _SOURCES.set(desc.id, {
        id: desc.id, kind: desc.kind || desc.id,
        lazy: !!desc.lazy, load: desc.load, rev: desc.rev,
        promise: null, entries: null,
    });
}

/**
 * 검색 대상 텍스트 정제 — 코드블록·머메이드·이미지·링크 URL 같은 마크다운
 * 구문은 내용이 아니라 오매칭 노이즈라 _searchText에서 제외한다.
 * 화면 표시용 원문(text)에는 적용하지 않는다. 소스 프로바이더가 엔트리 생성에 사용.
 */
export function _toSearchable(text) {
    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')                 // 펜스 코드·머메이드 블록
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')           // 이미지 (alt·경로)
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')         // 링크 — 텍스트 유지, URL 제거
        .replace(/`([^`]*)`/g, '$1');                    // 인라인 코드 — 내용 유지
}

/** 지연 병합분이 준비되면 구축된 인덱스에 뒤에 붙이고 역색인을 증분 갱신한다 */
function _mergeLazyEntries(entries) {
    if (!_searchIndex || !entries.length) return;
    const start = _searchIndex.length;
    _searchIndex.push(...entries);
    if (!_tokenIndex) { _buildInvertedIndex(); return; }
    // 증분 역색인 — 새 항목의 토큰만 추가한다 (지연 소스 완료마다 전체 재구축하지 않음)
    entries.forEach((e, i) => _indexEntryTokens(e, start + i));
    // 어휘가 성장했으므로 DP 커버 캐시·후보 캐시는 폐기
    _morphVocab = { words: _vocabWords, prefixes: _vocabPrefixes, cover: new Map() };
    _candidateCache.clear();
}

/**
 * 문서 본문에서 검색어가 가장 밀집한 구간의 스니펫 + 라인 번호 계산 (참조자료 결과용).
 * 다용어 쿼리에서는 윈도(2×radius) 안에 매치가 최대한 많이 드는 위치를 고른다.
 * @returns {{snippet: string, lineNum: number}} lineNum은 윈도 첫 매치의 1-based 라인 (ExamViewer.openExam 인자)
 */
export function _matchSnippet(text, terms, radius = 160) {
    const lower = text.toLowerCase();
    // 모든 용어의 매치 위치 수집 (용어당 상한으로 비용 제한)
    const hits = [];
    for (const t of terms) {
        if (!t) continue;
        let i = lower.indexOf(t);
        for (let n = 0; i >= 0 && n < 60; n++) {
            hits.push({ pos: i, len: t.length });
            i = lower.indexOf(t, i + 1);
        }
    }
    if (!hits.length) return { snippet: text.slice(0, radius * 2), lineNum: 1 };
    hits.sort((a, b) => a.pos - b.pos);
    // 슬라이딩 윈도 — 윈도 안에 들어가는 매치 수가 최대인 구간 선택
    const winLen = radius * 2;
    let bestI = 0;
    let bestJ = 0;
    let j = 0;
    for (let i = 0; i < hits.length; i++) {
        if (j < i) j = i;
        while (j + 1 < hits.length && hits[j + 1].pos - hits[i].pos < winLen) j++;
        if (j - i > bestJ - bestI) { bestI = i; bestJ = j; }
    }
    const spanStart = hits[bestI].pos;
    const spanEnd = hits[bestJ].pos + hits[bestJ].len;
    // 매치 군집을 윈도 중앙에 배치 (군집이 윈도보다 길면 선두 매치부터)
    let start = spanEnd - spanStart >= winLen
        ? spanStart
        : spanStart - Math.floor((winLen - (spanEnd - spanStart)) / 2);
    start = Math.max(0, Math.min(start, Math.max(0, text.length - winLen)));
    const end = Math.min(text.length, start + winLen);
    const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    const lineNum = text.slice(0, spanStart).split('\n').length;
    return { snippet, lineNum };
}

/**
 * 지연(lazy) 소스 로드 기동 — 소스 범용 상태머신 (TS-18).
 * 시작 시 활성 시험을 캡처하고 완료 시 다르면 병합을 폐기한다(시험 전환 오염 방어).
 * 실패 시 promise를 유지해 매 검색마다 재fetch되는 폭풍을 막는다 — 시험 전환으로
 * _getSearchIndex가 리셋될 때만 재시도된다.
 * @param {SearchSource} src
 * @returns {Promise<number>} 추가된 인덱스 항목 수
 */
function _ensureSource(src) {
    if (src.promise) return src.promise;
    const examId = getActiveExamId();
    src.promise = Promise.resolve()
        .then(() => src.load())
        .then(entries => {
            // 완료 시점에 시험이 전환됐으면 구 시험 항목을 신 시험 인덱스에 병합하지 않는다
            if (getActiveExamId() !== examId) return 0;
            const list = entries || [];
            src.entries = list;
            _mergeLazyEntries(list);
            return list.length;
        })
        .catch(e => {
            console.warn(`[Search] 지연 인덱스 로드 실패: ${src.id}`, e);
            src.entries = []; // 완료(빈 결과)로 마킹 — pending 영구 지속·재시도 폭풍 방지
            return 0;
        });
    return src.promise;
}

/**
 * 미기동 지연 소스를 기동하고, 각 소스 완료 시 onReady를 1회씩 호출한다.
 * resolved promise 재사용 시 재실행 루프가 되므로 트리거는 로드 시작 1회에 한정.
 * @param {() => void} onReady - 지연 소스 완료 콜백 (뷰의 검색 재실행 트리거)
 */
export function ensureLazyIndexes(onReady) {
    for (const src of _SOURCES.values()) {
        if (!src.lazy || src.promise) continue;
        _ensureSource(src).then(onReady);
    }
}

/** 지연 소스 로딩 중 여부 — '결과 없음' 오표시 방지 */
export function lazyIndexesPending() {
    for (const src of _SOURCES.values()) {
        if (src.lazy && src.promise !== null && src.entries === null) return true;
    }
    return false;
}

/**
 * 검색 인덱스 조회/구축 — 즉시 수집(eager) 소스의 load() 결과 + 이미 로드된
 * 지연 소스 병합분을 모은다. 캐시 키는 활성 시험 id + 각 소스의 rev() 신호.
 * 시험 전환 시 지연 소스 상태(promise·entries)를 일괄 폐기해 교차 시험 오염을 차단한다.
 */
function _getSearchIndex() {
    const examId = getActiveExamId();
    let keys = examId;
    for (const src of _SOURCES.values()) {
        if (!src.lazy) keys += '|' + src.id + ':' + (src.rev ? src.rev() : '');
    }
    if (_searchIndex && _searchIndexKeys === keys) return _searchIndex;
    if (_indexExamId !== null && _indexExamId !== examId) {
        // 리로드 없는 시험 전환 방어 — 이전 시험의 지연 병합분·로딩 상태 폐기
        for (const src of _SOURCES.values()) { src.entries = null; src.promise = null; }
        _morphVocab = null; _tokenIndex = null;
        _candidateCache = new Map();
    }
    _indexExamId = examId;
    _searchIndexKeys = keys;
    _searchIndex = [];
    // 즉시 수집 소스 — 콘텐츠 파싱·이동 목적지 해석은 각 프로바이더의 몫
    for (const src of _SOURCES.values()) {
        if (src.lazy) continue;
        (src.load() || []).forEach(e => _searchIndex.push(e));
    }
    // 이미 로드된 지연 소스 병합분은 재구축에도 유지 (지연 로드 시 재수집 없음)
    for (const src of _SOURCES.values()) {
        if (src.lazy && src.entries && src.entries.length) _searchIndex.push(...src.entries);
    }
    _buildInvertedIndex();
    return _searchIndex;
}

// 역색인 — 어절 토큰은 _tokenIndex로, 형태소 경계 어휘는 어절에서 증분 마이닝한다.
// buildBoundaryVocab(일괄 마이닝)과 동일한 규칙을 토큰 단위 공급 함수로 나눠
// 전체 구축(_buildInvertedIndex)과 지연 병합(_mergeLazyEntries)이 공유한다.
/** 어절 1개를 형태소 어휘 상태에 반영 — 독립 어절 등록 + 접두 재사용 횟수 누적 */
function _feedVocabToken(tok) {
    if (!tok || tok.length < 2) return;
    _vocabWords.add(tok);
    const seen = new Set();
    for (let i = 2; i < tok.length; i++) seen.add(tok.substring(0, i));
    for (const p of seen) {
        const n = (_vocabPrefixUse.get(p) || 0) + 1;
        _vocabPrefixUse.set(p, n);
        if (n === 2) _vocabPrefixes.add(p); // 2회+ 재사용 접두가 형태소 후보
    }
}

/** 엔트리의 검색 텍스트 어절을 토큰 역색인과 형태소 어휘에 반영한다 */
function _indexEntryTokens(entry, idx) {
    for (const token of entry._searchText.split(/\s+/)) {
        if (token.length < 2) continue;
        // 어절 인덱스 (후보 축소 + 형태소 경계 판정의 토큰 컨텍스트)
        if (!_tokenIndex.has(token)) _tokenIndex.set(token, new Set());
        _tokenIndex.get(token).add(idx);
        _feedVocabToken(token);
    }
}

function _buildInvertedIndex() {
    _tokenIndex = new Map();
    _vocabWords = new Set();
    _vocabPrefixUse = new Map();
    _vocabPrefixes = new Set();
    _searchIndex.forEach((entry, idx) => _indexEntryTokens(entry, idx));
    // TS-16 — 도메인 어휘 주입: 코퍼스 빈도가 낮아 접두 마이닝(2회+)에 잡히지 않는
    // 어절도 DP 커버의 분해 단위가 된다. 공급자는 콘텐츠 계층이 등록한다 (용어집 등).
    for (const contrib of _VOCAB_CONTRIBUTORS) {
        for (const keyword of contrib() || []) {
            const kw = String(keyword || '').trim().toLowerCase();
            if (kw.length >= 2 && !/\s/.test(kw)) _feedVocabToken(kw);
        }
    }
    _morphVocab = { words: _vocabWords, prefixes: _vocabPrefixes, cover: new Map() };
    _candidateCache.clear();
}

const CANDIDATE_CACHE_MAX = 200; // 변형→후보 캐시 상한 (초과 시 전체 클리어)
const PHRASE_BOOST = 60;         // 쿼리 전체가 인접 구문으로 매치될 때의 가산점 (제목 가산 50 위)

/** 변형(용어) → 후보 항목 인덱스 Set — 캐시되며 인덱스 변형 시 무효화된다 */
function _candidatesForVariant(variant, index) {
    let set = _candidateCache.get(variant);
    if (set) return set;
    set = new Set();
    if (variant.includes(' ')) {
        // 공백 포함 변형은 어절 인덱스에 없음 — 텍스트 수준으로 직접 판정
        index.forEach((e, i) => {
            if (e._searchText.includes(variant)) set.add(i);
        });
    } else if (_tokenIndex) {
        for (const [token, indices] of _tokenIndex) {
            if (token.includes(variant)) {
                indices.forEach(i => set.add(i));
            }
        }
    }
    if (_candidateCache.size >= CANDIDATE_CACHE_MAX) _candidateCache.clear();
    _candidateCache.set(variant, set);
    return set;
}

/** 부분문자열 등장 횟수 — split() 배열 할당 대신 indexOf 루프 */
function _countOccurrences(text, needle) {
    let n = 0;
    let p = text.indexOf(needle);
    while (p >= 0) { n++; p = text.indexOf(needle, p + needle.length); }
    return n;
}

/**
 * 통합검색 실행 — 쿼리를 동의어 그룹으로 확장해 역색인 후보를 교집합으로 좁히고,
 * 형태소 경계 품질(termHitQuality)로 소스 kind 버킷+부분 일치(weak) 티어에 분류한다.
 * 점수는 빈도×idf + 제목/구문 가산. 정렬·표시 상한·렌더는 뷰 계층 몫.
 * @param {string} query - 소문자 정규화된 검색어 (빈 문자열 가드는 호출자)
 * @param {string} filter - 과목 필터 ('all' 또는 subjId)
 * @returns {{
 *   buckets: Record<string, object[]>,
 *   allVariantTerms: string[],
 *   lazyPending: boolean,
 *   failedTerms: string[]
 * }} buckets는 엔트리 kind를 키로 하는 동적 버킷 + 'weak'(부분 일치 공통 티어).
 *   각 항목에는 _score(관련도 점수)가 부여돼 있다.
 *   failedTerms는 후보가 전혀 없는 쿼리 용어 — AND 불성립 시 안내 표시용.
 */
export function runUnifiedSearch(query, filter = 'all') {
    const index = _getSearchIndex();
    const terms = query.split(/\s+/).filter(t => t.length > 0);
    /** @type {Record<string, object[]>} kind별 버킷 + weak (부분 일치 공통 티어) */
    const buckets = { weak: [] };
    // 등록된 소스 kind는 결과가 없어도 빈 버킷으로 노출 — 소비자가 키 존재를 가드하지 않게
    for (const src of _SOURCES.values()) buckets[src.kind] = buckets[src.kind] || [];

    // TS-14 — registry.synonyms로 쿼리 용어를 동의 개념군으로 확장 (그룹 내 OR·그룹 간 AND)
    const synMap = (DataLoader.registry && DataLoader.registry.synonyms) || null;
    const termGroups = terms.map(t => expandSynonyms(t, synMap));

    // 쿼리 전체가 인접 구문으로 나타나는 엔트리에 가산 — _searchText는 공백 정규화됨
    const phrase = terms.length > 1 ? terms.join(' ') : '';

    // 역색인 활용 — 각 용어 그룹의 후보 엔트리 집합을 구하고 교집합 계산
    // 어절 토큰 인덱스를 쓰므로 어절 중간 매치까지 후보에 포함된다 (품질은 뒤에서 분류)
    /** @type {Set<number>|null} */
    let candidateIndices = null;
    /** @type {string[]} */
    const failedTerms = [];
    /** @type {number[]} 그룹별 idf — 흔한 용어가 빈도로 스코어를 지배하지 못하게 한다 */
    const groupIdf = [];
    for (const group of termGroups) {
        /** @type {Set<number>} */
        const groupSet = new Set();
        for (const variant of group) {
            _candidatesForVariant(variant, index).forEach(i => groupSet.add(i));
        }
        // df = 이 그룹의 변형 중 하나라도 포함하는 문서 수
        groupIdf.push(Math.log(1 + index.length / (1 + groupSet.size)));
        if (groupSet.size === 0) { failedTerms.push(group[0]); continue; }
        candidateIndices = candidateIndices === null
            ? groupSet
            : new Set([...candidateIndices].filter(/** @param {number} i */ (i) => groupSet.has(i)));
    }

    // 후보 없는 그룹이 있거나 교집합이 비면 AND 매치 불가 — 전체 스캔 생략
    const searchEntries = (failedTerms.length > 0 || !candidateIndices || candidateIndices.size === 0)
        ? [] : [...candidateIndices].map(i => index[i]);

    for (const entry of searchEntries) {
        if (filter !== 'all' && filter !== entry.subjId) continue;
        // TS-13/TS-14 — 그룹별 최고 매치 품질: 2=경계(본매치), 1=부분(중간), 0=없음
        // 모든 그룹이 매치돼야 결과이며, 하나라도 부분 매치뿐이면 '부분 일치' 티어로 내린다
        let allStrong = true;
        let hits = 0;
        let titleBoost = 0;
        const head = String(entry.title || '').toLowerCase();
        let excluded = false;
        for (let gi = 0; gi < termGroups.length; gi++) {
            const group = termGroups[gi];
            let gBest = 0;
            let gTitleBoost = 0;
            let gHits = 0;
            for (const variant of group) {
                const q = termHitQuality(entry._searchText, variant, _morphVocab);
                if (q > gBest) gBest = q;
                if (q > 0) {
                    const cnt = _countOccurrences(entry._searchText, variant);
                    gHits += (variant === group[0]) ? cnt : cnt * 0.5;
                }
                // 제목 가산은 경계 정렬 매치에만 — '석유화학'식 어절-중간 겹침은 가산 제외
                if (termHitQuality(head, variant, _morphVocab) === 2) {
                    gTitleBoost = Math.max(gTitleBoost, variant === group[0] ? 50 : 25);
                }
            }
            if (gBest === 0) { excluded = true; break; }
            if (gBest < 2) allStrong = false;
            hits += gHits * (groupIdf[gi] || 1);
            titleBoost = Math.max(titleBoost, gTitleBoost);
        }
        if (excluded) continue;
        const phraseBoost = (phrase && entry._searchText.includes(phrase)) ? PHRASE_BOOST : 0;
        // 엔트리 필드를 그대로 얇게 복사해 _score를 부여 — 버킷은 엔트리 kind로 구분
        // (kind→표시 티어 매핑은 뷰 계층 몫 — 코어는 종류명을 모른다)
        const item = { ...entry, _score: hits + titleBoost + phraseBoost };
        if (!allStrong) buckets.weak.push(item);
        else (buckets[item.kind] = buckets[item.kind] || []).push(item);
    }

    return {
        buckets,
        allVariantTerms: termGroups.flat(),
        lazyPending: lazyIndexesPending(),
        failedTerms,
    };
}
