// tests/unit/exam-context.test.js
// @spec ES-01~05,DA-14,DA-15
// 멀티시험 컨텍스트 — 활성 시험 해석, 진도 키 네임스페이스, 경로 해석을 검증.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    getExamList, getActiveExam, getActiveExamId,
    contentPath, dataPath, hasFeature, scopedKey, unscopedKey,
    purgeLegacyStorage, resolveExamThemeTokens, applyExamTheme,
    getActiveRegistry,
} from '../../../src/exam-context.js';

const EXAMS = {
    exams: [
        { id: 'alpha', name: '알파시험', contentRoot: 'content/exams/alpha', dataRoot: 'data/exams/alpha', features: { audiobook: true } },
        { id: 'cosmetic', name: '조제관리사', contentRoot: 'content/exams/cosmetic', dataRoot: 'data/exams/cosmetic', default: true, features: { dictionary: true } },
        { id: 'insadj', name: '손해사정사', contentRoot: 'content/exams/insadj', dataRoot: 'data/exams/insadj', registryGlobal: 'DATA_REGISTRY_INSADJ' },
    ]
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
        _store: store
    };
}

let mockStorage;
let originalLocalStorage;
let originalWindow;

beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    originalWindow = global.window;
    Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true, configurable: true });
    Object.defineProperty(global, 'window', { value: { EXAMS_LIST: EXAMS }, writable: true, configurable: true });
});

afterEach(() => {
    if (originalLocalStorage !== undefined) {
        Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true });
    } else {
        delete global.localStorage;
    }
    if (originalWindow !== undefined) {
        Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    } else {
        delete global.window;
    }
});

// ==================== 활성 시험 해석 ====================

test('getActiveExam: 미선택 시 default 플래그 시험', () => {
    assert.equal(getActiveExam().id, 'cosmetic');
});

test('getActiveExam: 선택된 시험 우선', () => {
    mockStorage.setItem('current_exam', 'alpha');
    assert.equal(getActiveExam().id, 'alpha');
});

test('getActiveExam: 잘못된 선택 id는 default로 폴백', () => {
    mockStorage.setItem('current_exam', 'nonexistent');
    assert.equal(getActiveExam().id, 'cosmetic');
});

test('getActiveExam: EXAMS_LIST 없으면 null', () => {
    window.EXAMS_LIST = null;
    assert.equal(getActiveExam(), null);
    assert.equal(getActiveExamId(), 'cosmetic'); // 레지스트리(exams.json) 기본값 폴백
});

test('getExamList: malformed 데이터도 배열로 정규화', () => {
    window.EXAMS_LIST = { exams: 'not-an-array' };
    assert.deepEqual(getExamList(), []);
});

// ==================== 경로 해석 ====================

test('contentPath/dataPath: 활성 시험 루트 기준', () => {
    assert.equal(contentPath('교재/a.md'), 'content/exams/cosmetic/교재/a.md');
    assert.equal(dataPath('drills/x.js'), 'data/exams/cosmetic/drills/x.js');
    mockStorage.setItem('current_exam', 'alpha');
    assert.equal(contentPath('교재/a.md'), 'content/exams/alpha/교재/a.md');
    assert.equal(dataPath('drills/x.js'), 'data/exams/alpha/drills/x.js');
});

test('hasFeature: 시험별 플래그 게이트', () => {
    assert.equal(hasFeature('dictionary'), true);   // cosmetic
    assert.equal(hasFeature('audiobook'), false);
    mockStorage.setItem('current_exam', 'alpha');
    assert.equal(hasFeature('audiobook'), true);
    assert.equal(hasFeature('dictionary'), false);
});

// ==================== 진도 키 네임스페이스 ====================

test('scopedKey: 진도 키에 시험 접두사 부여', () => {
    assert.equal(scopedKey('fc_memorized'), 'cosmetic:fc_memorized');
    mockStorage.setItem('current_exam', 'alpha');
    assert.equal(scopedKey('fc_memorized'), 'alpha:fc_memorized');
});

test('scopedKey: GLOBAL_KEYS는 접두사 없이 유지', () => {
    for (const k of ['current_exam', 'appTheme', 'preferredOrientation', 'readerAudioRate']) {
        assert.equal(scopedKey(k), k, `${k}는 전역 키`);
    }
    mockStorage.setItem('current_exam', 'alpha');
    assert.equal(scopedKey('appTheme'), 'appTheme', '시험 전환 후에도 전역 키 유지');
});

test('unscopedKey: 현재 시험 접두사만 제거, 타 시험 키는 null', () => {
    assert.equal(unscopedKey('cosmetic:fc_memorized'), 'fc_memorized');
    assert.equal(unscopedKey('alpha:fc_memorized'), null);
    assert.equal(unscopedKey('appTheme'), null);
    assert.equal(unscopedKey(null), null);
});

// ==================== 레거시 키 정리 ====================

test('purgeLegacyStorage: 1회 실행 — 레거시 진도 키만 제거하고 전역 키 보존', () => {
    mockStorage.setItem('fc_memorized', '[1,2]');
    mockStorage.setItem('quiz_results_x', '{}');
    mockStorage.setItem('appTheme', 'dark');
    mockStorage.setItem('cosmetic:fc_memorized', '[3]'); // 이미 네임스페이스된 키는 유지
    purgeLegacyStorage(['fc_memorized'], ['quiz_results_']);
    assert.equal(mockStorage.getItem('fc_memorized'), null);
    assert.equal(mockStorage.getItem('quiz_results_x'), null);
    assert.equal(mockStorage.getItem('appTheme'), 'dark');
    assert.equal(mockStorage.getItem('cosmetic:fc_memorized'), '[3]');
    assert.equal(mockStorage.getItem('ns_migrated_v2'), '1');
});

test('purgeLegacyStorage: 플래그가 있으면 재실행 안 함', () => {
    mockStorage.setItem('ns_migrated_v2', '1');
    mockStorage.setItem('fc_memorized', '[1]');
    purgeLegacyStorage(['fc_memorized'], []);
    assert.equal(mockStorage.getItem('fc_memorized'), '[1]');
});

// ==================== 시험별 스킨 토큰 (DA-14) ====================

test('resolveExamThemeTokens: 화이트리스트 토큰만 통과', () => {
    const tokens = resolveExamThemeTokens({
        theme: {
            '--color-primary': '#f97316',
            '--bg-app': '#101010',
            '--border-color': 'rgba(0,0,0,.1)',
            '--stroke-strong': '#fff',
            // 비허용 계열·형식 — 전부 버려져야 함
            '--font-size-base': '99px',
            'position': 'fixed',
            'color-primary': '#000',
            '--color-': '#000',
            '--COLOR-PRIMARY': '#111',   // 대문자 허용 (i 플래그)
            '--color-danger': 42,        // 비문자열 값
            '--color-warning': '  ',     // 공백 값
        }
    });
    assert.deepEqual(tokens, {
        '--color-primary': '#f97316',
        '--bg-app': '#101010',
        '--border-color': 'rgba(0,0,0,.1)',
        '--stroke-strong': '#fff',
        '--COLOR-PRIMARY': '#111',
    });
});

test('resolveExamThemeTokens: theme 부재·비객체·null 입력은 빈 객체', () => {
    assert.deepEqual(resolveExamThemeTokens({}), {});
    assert.deepEqual(resolveExamThemeTokens(null), {});
    assert.deepEqual(resolveExamThemeTokens({ theme: null }), {});
    assert.deepEqual(resolveExamThemeTokens({ theme: 'dark' }), {});
    assert.deepEqual(resolveExamThemeTokens({ theme: [] }), {});
});

test('applyExamTheme: data-exam 속성 + 토큰 인라인 주입', () => {
    const applied = {};
    const el = { dataset: {}, style: { setProperty: (k, v) => { applied[k] = v; } } };
    const originalDoc = global.document;
    Object.defineProperty(global, 'document', { value: { documentElement: el }, writable: true, configurable: true });
    try {
        applyExamTheme({ id: 'insadj', theme: { '--color-primary': '#f97316', '--evil-x': 'x' } });
        assert.equal(el.dataset.exam, 'insadj');
        assert.deepEqual(applied, { '--color-primary': '#f97316' });
    } finally {
        if (originalDoc !== undefined) {
            Object.defineProperty(global, 'document', { value: originalDoc, writable: true, configurable: true });
        } else {
            delete global.document;
        }
    }
});

test('applyExamTheme: document 부재(Node 환경)에서 무해', () => {
    const originalDoc = global.document;
    try {
        delete global.document;
        applyExamTheme({ id: 'insadj', theme: { '--color-primary': '#000' } });
    } finally {
        if (originalDoc !== undefined) {
            Object.defineProperty(global, 'document', { value: originalDoc, writable: true, configurable: true });
        }
    }
});

// ==================== 활성 시험 레지스트리 (DA-15 R4) ====================
// 비기본 시험 활성 시 window.DATA_REGISTRY(정적 스크립트가 채우는 기본 시험 전역)가
// 아니라 exams.json의 registryGlobal이 가리키는 전역을 해석해야 한다.

test('getActiveRegistry: 기본 시험은 DATA_REGISTRY 전역 해석', () => {
    const reg = { subjects: [{ key: 's1' }] };
    window.DATA_REGISTRY = reg;
    assert.equal(getActiveRegistry(), reg);
    delete window.DATA_REGISTRY;
});

test('getActiveRegistry: registryGlobal 미선언 시험은 기본 전역명 폴백', () => {
    const reg = { subjects: [{ key: 'alpha-subj' }] };
    window.DATA_REGISTRY = reg;
    mockStorage.setItem('current_exam', 'alpha');
    assert.equal(getActiveRegistry(), reg);
    delete window.DATA_REGISTRY;
});

test('getActiveRegistry: 비기본 시험은 자체 registryGlobal 해석 — 기본 전역 오독 방지', () => {
    window.DATA_REGISTRY = { subjects: [{ key: 'cosmetic-s1' }] };        // 기본 시험 정적 전역
    window.DATA_REGISTRY_INSADJ = { subjects: [{ key: 'insadj-s1' }] };      // insadj 동적 번들 전역
    mockStorage.setItem('current_exam', 'insadj');
    const reg = getActiveRegistry();
    assert.equal(reg, window.DATA_REGISTRY_INSADJ);
    assert.equal(reg.subjects[0].key, 'insadj-s1');
    delete window.DATA_REGISTRY;
    delete window.DATA_REGISTRY_INSADJ;
});

test('getActiveRegistry: 비기본 번들 미로딩 시 null — 기본 시험으로 무음 폴백 없음', () => {
    window.DATA_REGISTRY = { subjects: [{ key: 'cosmetic-s1' }] };
    mockStorage.setItem('current_exam', 'insadj'); // DATA_REGISTRY_INSADJ 미설치
    assert.equal(getActiveRegistry(), null);
    delete window.DATA_REGISTRY;
});

test('getActiveRegistry: window 부재(Node 환경)는 null', () => {
    const win = global.window;
    try {
        delete global.window;
        assert.equal(getActiveRegistry(), null);
    } finally {
        Object.defineProperty(global, 'window', { value: win, writable: true, configurable: true });
    }
});
