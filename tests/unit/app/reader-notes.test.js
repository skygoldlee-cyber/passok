// tests/unit/app/reader-notes.test.js
// @spec TR-30
// 리더 섹션 메모 스토어 — 저장·조회·삭제·빈값 삭제 해석·깨진 JSON 복구 검증.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

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

const EXAMS = {
    exams: [
        { id: 'alpha', name: '알파시험', contentRoot: 'content/exams/alpha', dataRoot: 'data/exams/alpha' },
        { id: 'cosmetic', name: '조제관리사', contentRoot: 'content/exams/cosmetic', dataRoot: 'data/exams/cosmetic', default: true },
    ]
};

let mockStorage;
let originalLocalStorage;
let originalWindow;
let notes;

beforeEach(async () => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    originalWindow = global.window;
    Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true, configurable: true });
    Object.defineProperty(global, 'window', { value: { EXAMS_LIST: EXAMS }, writable: true, configurable: true });
    notes = await import(`../../../src/reader-notes.js?case=${Date.now()}_${Math.random()}`);
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

test('메모 저장 → 조회 → 개수 → 삭제 라이프사이클', () => {
    const key = 'subj1|chap1|섹션 제목';
    assert.equal(notes.setReaderNote(key, '메모 본문', { subject: '과목1', title: '섹션 제목' }), true);
    assert.equal(notes.getReaderNote(key), '메모 본문');
    assert.equal(notes.readerNoteCount(), 1);
    const map = notes.getReaderNotes();
    assert.equal(map[key].subject, '과목1');
    assert.ok(map[key].updated);
    assert.equal(notes.deleteReaderNote(key), true);
    assert.equal(notes.getReaderNote(key), '');
    assert.equal(notes.readerNoteCount(), 0);
});

test('빈 메모 저장은 삭제로 해석 — 미존재 키 삭제는 false', () => {
    assert.equal(notes.setReaderNote('k|a|b', ''), false);
    assert.equal(notes.setReaderNote('k|a|b', 'x'), true);
    assert.equal(notes.setReaderNote('k|a|b', '   '), true); // trim 후 삭제 성공
    assert.equal(notes.readerNoteCount(), 0);
});

test('빈 키 저장은 false', () => {
    assert.equal(notes.setReaderNote('', 'note'), false);
});

test('기존 메모 갱신 시 meta 생략하면 기존 subject/title 유지', () => {
    const key = 's|c|t';
    notes.setReaderNote(key, 'v1', { subject: 'S', title: 'T' });
    notes.setReaderNote(key, 'v2');
    const map = notes.getReaderNotes();
    assert.equal(map[key].note, 'v2');
    assert.equal(map[key].subject, 'S');
    assert.equal(map[key].title, 'T');
});

test('깨진 JSON·배열 저장값은 빈 맵으로 복구', () => {
    const scoped = 'cosmetic:reader_notes';
    mockStorage.setItem(scoped, '{broken');
    assert.deepEqual(notes.getReaderNotes(), {});
    mockStorage.setItem(scoped, '[1,2]');
    assert.deepEqual(notes.getReaderNotes(), {});
});
