// src/semantic-index.js — 의미 유사도 인덱스 (빌드타임 사전계산 이웃 조회)
// @spec SEM-02,SEM-04,SEM-08
//
// DOC-DSN-18: 문장 임베딩은 tools/build/build_embeddings.js가
// 사전 계산해 {dataRoot}/embeddings/ 번들로 배포된다. 런타임은 neighbors.js의
// top-K 이웃만 조회하며 모델 추론은 수행하지 않는다. features.semantic 미선언
// 또는 자산 부재 시 조용히 비활성화된다 (기존 학습 흐름에 영향 없음).
//
// 번들 구조 (build_embeddings.js emit):
//   neighbors.js → window.EMB_NEIGHBORS = {dim, k, adj, texts, sameText}
//     adj:      { "stmt:<sid>"|"q:<qid>": [[key, cos], ...] } — 동일 정규화
//               텍스트 중복·MIN_NEIGHBOR_LEN 미만 단문은 빌드에서 이미 제외
//     texts:    key → 표시용 원문
//     sameText: key → 동일 텍스트의 다른 key[] (교차 과목 동일 진술 힌트)
//   vectors_stmt_subjectN.js → window.EMB_VEC_stmt_subjectN (임의 유사도용)

import { dataPath, hasFeature, getActiveExamId } from './exam-context.js';
import { DataLoader } from './data-loader.js';

/** @typedef {{key:string, score:number, text:string}} SemanticHit */

let _neighbors = null;      /** @type {null|{dim:number, k:number, adj:Object.<string,[string,number][]>, texts:Object.<string,string>, sameText:Object.<string,string[]>}} */
let _cacheExamId = null;    // 로드된 시험 — 시험 전환 시 캐시 무효화
let _loadingPromise = null; // 중복 로드 방지
let _unavailable = false;   // 자산 부재 — 재시도 방지

export const SemanticIndex = {
    /** semantic 피처가 활성 시험에서 선언됐는지 (SEM-04) */
    isEnabled() {
        return !!hasFeature('semantic');
    },

    /**
     * 이웃 인덱스 지연 로드 — 최초 사용 시 neighbors.js만 불러온다
     * (벡터 번들은 임의 유사도 계산 시에만 로드, 고정 추천 UI는 이것으로 충분).
     * @returns {Promise<boolean>} 로드 성공 여부 — 실패 시 기능 비활성, 에러 무전파
     */
    async ensureLoaded() {
        if (!this.isEnabled()) return false;
        const examId = getActiveExamId();
        if (_neighbors && _cacheExamId === examId) return true;
        if (_unavailable && _cacheExamId === examId) return false;
        if (!_loadingPromise) {
            _loadingPromise = DataLoader.loadBundleScript(
                `./${dataPath('embeddings/neighbors.js')}`, 0)
                .then(() => {
                    const n = /** @type {any} */ (window).EMB_NEIGHBORS;
                    if (n && n.adj && n.texts) {
                        _neighbors = n;
                        _cacheExamId = examId;
                    } else {
                        _unavailable = true;
                    }
                })
                .catch(() => { _unavailable = true; _cacheExamId = examId; })
                .finally(() => { _loadingPromise = null; });
        }
        await _loadingPromise;
        return !!_neighbors && _cacheExamId === examId;
    },

    /**
     * sid의 유사 진술 — 동일 텍스트·단문은 빌드 단계에서 이미 제외됨.
     * @param {string} sid
     * @param {number} [k] 최대 건수
     * @returns {{key:string, sid:string, score:number, text:string}[]} 유사도 내림차순
     */
    similarStatements(sid, k = 5) {
        return this._hits(`stmt:${sid}`, 'stmt:', k)
            .map(h => ({ key: h.key, sid: h.key.slice(5), score: h.score, text: h.text }));
    },

    /**
     * qid의 유사 문항.
     * @param {string} qid
     * @param {number} [k]
     * @returns {{key:string, qid:string, score:number, text:string}[]}
     */
    similarQuestions(qid, k = 5) {
        return this._hits(`q:${qid}`, 'q:', k)
            .map(h => ({ key: h.key, qid: h.key.slice(2), score: h.score, text: h.text }));
    },

    /**
     * 동일 정규화 텍스트를 가진 다른 항목 — "다른 과목에 같은 진술" 표시용.
     * @param {string} key 'stmt:<sid>' 등 전체 키
     * @returns {SemanticHit[]}
     */
    sameTextItems(key) {
        if (!_neighbors || !_neighbors.sameText) return [];
        return (_neighbors.sameText[key] || [])
            .map(k2 => ({ key: k2, score: 1, text: _neighbors.texts[k2] || '' }));
    },

    /**
     * 자유 텍스트 의미 검색 — 앵커 프록시 경로 (SEM-08 v1).
     * 쿼리와 어휘가 가장 겹치는 항목을 앵커로 선정해 그 의미 이웃을 반환한다.
     * 모델 추론 없이 사전계산 이웃만 사용 — 로드 전·미지원이면 빈 배열.
     * @param {string} query
     * @param {number} [k]
     * @returns {{key:string, score:number, text:string, anchorKey:string, anchorText:string}[]}
     */
    searchByText(query, k = 5) {
        if (!_neighbors) return [];
        const anchor = findAnchorKey(query, _neighbors.texts);
        if (!anchor) return [];
        return (_neighbors.adj[anchor.key] || [])
            .filter(([k2]) => k2.startsWith('stmt:') || k2.startsWith('q:'))
            .slice(0, k)
            .map(([k2, s]) => ({ key: k2, score: s, text: _neighbors.texts[k2] || '', anchorKey: anchor.key, anchorText: _neighbors.texts[anchor.key] || '' }));
    },

    /**
     * adjacency 조회 공통부 — 로드 전이면 빈 배열.
     * @param {string} key
     * @param {string} prefix 'stmt:' | 'q:'
     * @param {number} k
     * @returns {{key:string, score:number, text:string}[]}
     */
    _hits(key, prefix, k) {
        if (!_neighbors || !_neighbors.adj[key]) return [];
        return _neighbors.adj[key]
            .filter(([k2]) => k2.startsWith(prefix))
            .slice(0, k)
            .map(([k2, s]) => ({ key: k2, score: s, text: _neighbors.texts[k2] || '' }));
    },

    /** 테스트용 상태 리셋 — 프로덕션 코드에서 호출 금지 */
    _reset() {
        _neighbors = null; _cacheExamId = null;
        _loadingPromise = null; _unavailable = false;
    },
};

/**
 * 앵커 키 선정 (순수 함수 — 테스트 가능) — 쿼리 토큰(2자 이상)의 텍스트 포함
 * 비율이 가장 높은 항목을 고른다. 동점이면 짧은 텍스트(더 밀집된 매치) 우선.
 * @param {string} query
 * @param {Object<string,string>} texts - key → 표시용 원문
 * @returns {{key:string, cover:number}|null}
 */
export function findAnchorKey(query, texts) {
    const terms = (query || '').toLowerCase().split(/\s+/).filter(t => t.length >= 2);
    if (!terms.length || !texts) return null;
    let best = null;
    let bestLen = Infinity;
    for (const [key, text] of Object.entries(texts)) {
        const hay = (text || '').toLowerCase();
        if (!hay) continue;
        const hit = terms.filter(t => hay.includes(t)).length;
        if (!hit) continue;
        const cover = hit / terms.length;
        if (!best || cover > best.cover || (cover === best.cover && hay.length < bestLen)) {
            best = { key, cover };
            bestLen = hay.length;
        }
    }
    return best;
}

/**
 * int8 대칭 양자화 벡터 복원 — vectors_* 번들의 base64를 float32로 디코딩.
 * 향후 임의 유사도·오답 원인 센트로이드 분류(DOC-DSN-19)에 사용.
 * @param {{dim:number, ids:string[], scales:number[], vectors:string}} bundle
 * @returns {Map<string, Float32Array>} key → 복원 벡터 (정규화됨)
 */
export function decodeVectorBundle(bundle) {
    const raw = atob(bundle.vectors);
    const q = new Int8Array(raw.length);
    for (let i = 0; i < raw.length; i++) q[i] = raw.charCodeAt(i);
    const out = new Map();
    for (let r = 0; r < bundle.ids.length; r++) {
        const v = new Float32Array(bundle.dim);
        let norm = 0;
        for (let c = 0; c < bundle.dim; c++) {
            v[c] = q[r * bundle.dim + c] * bundle.scales[r];
            norm += v[c] * v[c];
        }
        norm = Math.sqrt(norm) || 1;
        for (let c = 0; c < bundle.dim; c++) v[c] /= norm;
        out.set(bundle.ids[r], v);
    }
    return out;
}

/**
 * 코사인 유사도 — 두 벡터 모두 정규화 가정이 아닌 안전 구현.
 * @param {Float32Array} a @param {Float32Array} b @returns {number}
 */
export function cosineSimilarity(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d === 0 ? 0 : dot / d;
}
