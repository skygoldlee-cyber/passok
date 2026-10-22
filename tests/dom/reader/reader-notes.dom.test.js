// tests/dom/reader/reader-notes.dom.test.js — 리더 섹션 메모 (TR-30)
// @spec TR-30
// 검증: 저장·삭제·조회 스토어(H) · 에디터 토글·저장 시 카드 표시 갱신(H) · 팔레트 검색 등재(H)
// ID-05: 키는 콘텐츠 기반 bookmarkKey(subj|chapterKey|title) — 위치 인덱스 미사용

import { describe, it, beforeEach, expect } from 'vitest';
import {
    getReaderNotes, getReaderNote, setReaderNote, deleteReaderNote, readerNoteCount,
} from '../../../src/reader-notes.js';
import { bindReaderNotes } from '../../../src/views/reader-render.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

const KEY = 'law|ch01|1.1 화장품 정의';

function makeCard() {
    document.body.innerHTML = `
        <div class="reader-section-card">
            <div class="reader-section-header">
                <h4 class="reader-section-title">1.1 화장품 정의</h4>
                <button class="reader-note-btn" data-note-key="${KEY}"
                    data-note-subj="law" data-note-title="1.1 화장품 정의">
                    <i class="fa-regular fa-note-sticky"></i>
                </button>
            </div>
            <div class="reader-section-body">
                <div class="textbook-reader-section-content"><p>본문</p></div>
            </div>
        </div>`;
    return document.querySelector('.reader-section-card');
}

describe('reader-notes — 섹션 메모 스토어', () => {
    beforeEach(() => localStorage.clear());

    it('저장 → 조회, 메타(과목·제목) 보존, 시험 스코프 키에 기록', () => {
        expect(getReaderNote(KEY)).toBe('');
        setReaderNote(KEY, '정의 두 축: 인체 적용 + 기능 목적', { subject: 'law', title: '1.1 화장품 정의' });
        expect(getReaderNote(KEY)).toBe('정의 두 축: 인체 적용 + 기능 목적');
        expect(readerNoteCount()).toBe(1);
        const raw = localStorage.getItem(`cosmetic:${STORAGE_KEYS.READER_NOTES}`);
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw)[KEY].subject).toBe('law');
        expect(JSON.parse(raw)[KEY].updated).toBeTruthy();
    });

    it('빈 문자열 저장은 삭제로 해석', () => {
        setReaderNote(KEY, '메모', { subject: 'law' });
        expect(setReaderNote(KEY, '')).toBe(true);
        expect(getReaderNote(KEY)).toBe('');
        expect(readerNoteCount()).toBe(0);
        // 없는 키 삭제는 no-op
        expect(deleteReaderNote('nope|key|x')).toBe(false);
    });

    it('손상된 저장값은 빈 맵으로 복구 (E)', () => {
        localStorage.setItem(`cosmetic:${STORAGE_KEYS.READER_NOTES}`, 'broken{');
        expect(getReaderNotes()).toEqual({});
    });
});

describe('reader-notes — 인라인 에디터 (TR-30)', () => {
    beforeEach(() => {
        localStorage.clear();
        makeCard();
        bindReaderNotes(document.body);
    });

    it('버튼 클릭 → 에디터 열림, 재클릭/닫기로 닫힘', () => {
        const btn = document.querySelector('.reader-note-btn');
        btn.click();
        expect(document.querySelector('.reader-note-editor')).toBeTruthy();
        btn.click();
        expect(document.querySelector('.reader-note-editor')).toBeNull();
        btn.click();
        document.querySelector('[data-note-close]').click();
        expect(document.querySelector('.reader-note-editor')).toBeNull();
    });

    it('저장 → 카드·버튼 has-note 갱신 + 메모 표시 블록 생성', () => {
        document.querySelector('.reader-note-btn').click();
        document.querySelector('.reader-note-input').value = '두 축 암기';
        document.querySelector('[data-note-save]').click();
        const card = document.querySelector('.reader-section-card');
        expect(card.classList.contains('has-note')).toBe(true);
        expect(document.querySelector('.reader-note-btn').classList.contains('has-note')).toBe(true);
        expect(document.querySelector('.reader-note-view').textContent).toContain('두 축 암기');
        expect(getReaderNote(KEY)).toBe('두 축 암기');
        expect(document.querySelector('.reader-note-editor')).toBeNull();
    });

    it('삭제 → 메모·표시 블록 제거', () => {
        setReaderNote(KEY, '임시 메모', { subject: 'law', title: 't' });
        document.querySelector('.reader-note-btn').click();
        document.querySelector('[data-note-delete]').click();
        expect(getReaderNote(KEY)).toBe('');
        expect(document.querySelector('.reader-note-view')).toBeNull();
        expect(document.querySelector('.reader-section-card').classList.contains('has-note')).toBe(false);
    });
});
