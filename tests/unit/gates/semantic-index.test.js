// tests/unit/semantic-index.test.js
// @spec SEM-02,SEM-03,SEM-04
// SemanticIndex — 이웃 인덱스 지연 로드, 유사 진술/문항 조회, 동일 텍스트 힌트,
// 자산 부재 시 비활성화, int8 벡터 디코딩·코사인 유사도 검증.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticIndex, decodeVectorBundle, cosineSimilarity } from '../../../src/semantic-index.js';
import { DataLoader } from '../../../src/data-loader.js';

const EXAMS = {
    exams: [
        { id: 'cosmetic', name: '조제관리사', contentRoot: 'content/exams/cosmetic', dataRoot: 'data/exams/cosmetic', default: true, features: { semantic: true } },
        { id: 'bare', name: '플래그없음', contentRoot: 'content/exams/bare', dataRoot: 'data/exams/bare', features: {} },
    ]
};

const NEIGHBORS = {
    dim: 384, k: 8,
    adj: {
        'stmt:s_a': [['stmt:s_b', 0.92], ['q:q1', 0.80], ['stmt:s_c', 0.71]],
        'q:q1': [['stmt:s_a', 0.80], ['q:q2', 0.88]],
        'stmt:s_x': [['stmt:s_y', 0.95]],
    },
    texts: {
        'stmt:s_a': '진술 A', 'stmt:s_b': '진술 B', 'stmt:s_c': '진술 C',
        'stmt:s_x': '진술 X', 'stmt:s_y': '진술 Y',
        'q:q1': '질문 1', 'q:q2': '질문 2',
    },
    sameText: { 'stmt:s_a': ['stmt:s_dup'], 'stmt:s_dup': ['stmt:s_a'] },
};

function createMockStorage() {
    const store = {};
    return {
        getItem(k) { return k in store ? store[k] : null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; },
        clear() { for (const k of Object.keys(store)) delete store[k]; },
        key(i) { return Object.keys(store)[i] ?? null; },
        get length() { return Object.keys(store).length; },
    };
}

let mockWin;
let originalWindow;
let originalLocalStorage;
let originalLoader;

beforeEach(() => {
    originalWindow = global.window;
    originalLocalStorage = global.localStorage;
    originalLoader = DataLoader.loadBundleScript;
    mockWin = { EXAMS_LIST: EXAMS };
    Object.defineProperty(global, 'window', { value: mockWin, writable: true, configurable: true });
    Object.defineProperty(global, 'localStorage', { value: createMockStorage(), writable: true, configurable: true });
    SemanticIndex._reset();
});

afterEach(() => {
    DataLoader.loadBundleScript = originalLoader;
    SemanticIndex._reset();
    if (originalWindow !== undefined) {
        Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    } else { delete global.window; }
    if (originalLocalStorage !== undefined) {
        Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true });
    } else { delete global.localStorage; }
});

// ==================== isEnabled / ensureLoaded ====================

test('isEnabled: features.semantic=true 시험에서만 true', () => {
    assert.equal(SemanticIndex.isEnabled(), true);
});

test('ensureLoaded: 번들 로드 후 유사 조회 가능', async () => {
    DataLoader.loadBundleScript = async () => { mockWin.EMB_NEIGHBORS = NEIGHBORS; };
    assert.equal(await SemanticIndex.ensureLoaded(), true);
});

test('ensureLoaded: 로드 실패 시 false, 에러 무전파 (SEM-04)', async () => {
    DataLoader.loadBundleScript = async () => { throw new Error('404'); };
    assert.equal(await SemanticIndex.ensureLoaded(), false);
    assert.deepEqual(SemanticIndex.similarStatements('s_a'), []);
});

test('ensureLoaded: 페이로드 형식 불량 시 false', async () => {
    DataLoader.loadBundleScript = async () => { mockWin.EMB_NEIGHBORS = { bogus: 1 }; };
    assert.equal(await SemanticIndex.ensureLoaded(), false);
});

test('ensureLoaded: 중복 호출은 스크립트를 한 번만 로드', async () => {
    let calls = 0;
    DataLoader.loadBundleScript = async () => { calls++; mockWin.EMB_NEIGHBORS = NEIGHBORS; };
    await Promise.all([SemanticIndex.ensureLoaded(), SemanticIndex.ensureLoaded()]);
    assert.equal(calls, 1);
});

// ==================== similarStatements / similarQuestions ====================

test('similarStatements: stmt 이웃만 score 내림차순, sid·text 해석', async () => {
    DataLoader.loadBundleScript = async () => { mockWin.EMB_NEIGHBORS = NEIGHBORS; };
    await SemanticIndex.ensureLoaded();
    const hits = SemanticIndex.similarStatements('s_a', 5);
    assert.deepEqual(hits.map(h => h.sid), ['s_b', 's_c']);
    assert.equal(hits[0].score, 0.92);
    assert.equal(hits[0].text, '진술 B');
});

test('similarStatements: k 제한 적용', async () => {
    DataLoader.loadBundleScript = async () => { mockWin.EMB_NEIGHBORS = NEIGHBORS; };
    await SemanticIndex.ensureLoaded();
    assert.equal(SemanticIndex.similarStatements('s_a', 1).length, 1);
});

test('similarQuestions: q 이웃만 반환', async () => {
    DataLoader.loadBundleScript = async () => { mockWin.EMB_NEIGHBORS = NEIGHBORS; };
    await SemanticIndex.ensureLoaded();
    const hits = SemanticIndex.similarQuestions('q1');
    assert.deepEqual(hits.map(h => h.qid), ['q2']);
});

test('sameTextItems: 동일 정규화 텍스트 교차 참조', async () => {
    DataLoader.loadBundleScript = async () => { mockWin.EMB_NEIGHBORS = NEIGHBORS; };
    await SemanticIndex.ensureLoaded();
    const dupes = SemanticIndex.sameTextItems('stmt:s_a');
    assert.deepEqual(dupes.map(d => d.key), ['stmt:s_dup']);
});

// ==================== decodeVectorBundle / cosineSimilarity ====================

test('decodeVectorBundle: int8+scale 복원 후 단위 정규화', () => {
    const dim = 4;
    const q = new Int8Array([127, 0, 0, 0, 0, 127, 0, 0]);
    const bundle = {
        dim, ids: ['a', 'b'], scales: [0.5, 0.25],
        vectors: Buffer.from(q.buffer).toString('base64'),
    };
    const m = decodeVectorBundle(bundle);
    assert.equal(m.size, 2);
    const va = m.get('a');
    assert.ok(Math.abs(va[0] - 1) < 1e-6, '정규화 후 최대 성분 1');
    assert.ok(Math.abs(va.reduce((s, x) => s + x * x, 0) - 1) < 1e-6, '단위 벡터');
    assert.equal(cosineSimilarity(m.get('a'), m.get('b')), 0);
    assert.equal(cosineSimilarity(m.get('a'), m.get('a')), 1);
});

test('cosineSimilarity: 영벡터는 0 반환 (나눗셈 안전)', () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    assert.equal(cosineSimilarity(a, b), 0);
});
