// tests/dom/study-commandpalette.dom.test.js — 통합 검색 팔레트 UI
// @spec UX-NAV-06
import { describe, it, beforeEach, expect, vi } from 'vitest';
import {
    initCommandPalette, openCommandPalette, executePaletteResult
} from '../../src/command-palette.js';
import { DataLoader } from '../../src/data-loader.js';

function seedDom() {
    document.body.innerHTML = `
        <button class="nav-item" data-target="dashboard-view">대시보드</button>
        <button class="nav-item" data-target="flashcard-view">플래시카드</button>
        <button class="nav-item is-hidden" data-target="dictionary-view">성분 사전</button>`;
    window.STUDY_DATA = {
        law: {
            name: '화장품법의 이해',
            cards: [{ id: 'c1', term: '화장품 정의', definition: '피부에 사용' }],
            quizzes: [{ id: 'q1', question: '화장품법의 목적은?', options: ['공중위생'] }],
            chapters: [{ chapterTitle: 'Chapter 01 총칙', sections: [{ title: '화장품의 정의', content: '' }] }]
        }
    };
    window.INGREDIENTS_DATA = [{ name: '글리세린', engName: 'Glycerin', category: '보습' }];
    DataLoader.registry = { exams: [{ title: '화장품법의 이해 (100문)', file: '과목1.md', subject: 'law' }] };
}

function type(query) {
    const input = document.getElementById('cmdk-input');
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(k, opts = {}) {
    document.getElementById('cmdk-input')
        .dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));
}

describe('command-palette — 통합 검색', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        seedDom();
        initCommandPalette();
    });

    it('Ctrl+K로 팔레트가 열리고 다시 누르면 닫힌다', () => {
        const overlay = document.getElementById('cmdk-overlay');
        expect(overlay).toBeTruthy();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
        expect(overlay.classList.contains('is-hidden')).toBe(false);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
        expect(overlay.classList.contains('is-hidden')).toBe(true);
    });

    it('placeholder 범위 라벨 — dictionary 피처 없으면 사전 항목 미표기 (도메인 무관)', () => {
        openCommandPalette();
        const input = document.getElementById('cmdk-input');
        // 활성 시험·dictionary 피처가 없는 컨텍스트 — '성분' 등 도메인 명칭이 새면 안 됨
        expect(input.placeholder).toBe('검색: 화면·교재·문제집');
        expect(input.placeholder).not.toContain('성분');
        const hint = document.getElementById('cmdk-results').textContent;
        expect(hint).not.toContain('성분');
    });

    it('검색어 입력 → 유형별 그룹 헤더와 결과 렌더링 (카드·퀴즈 제외)', () => {
        openCommandPalette();
        type('화장품');
        const box = document.getElementById('cmdk-results');
        expect(box.querySelectorAll('.cmdk-item').length).toBeGreaterThan(0);
        const labels = [...box.querySelectorAll('.cmdk-group-label')].map(el => el.textContent);
        expect(labels).toContain('교재');
        // 카드·퀴즈는 착지점이 매치 항목이 아닌 과목 첫 화면이라 검색 범위 제외
        expect(labels).not.toContain('플래시카드');
        expect(labels).not.toContain('기출 퀴즈');
    });

    it('매칭 없을 때 본문검색 브리지 항목 표시', () => {
        openCommandPalette();
        type('존재하지않는검색어');
        const items = document.querySelectorAll('#cmdk-results .cmdk-item');
        expect(items.length).toBe(1);
        expect(document.getElementById('cmdk-results').textContent).toContain('교재·참조자료·문제은행');
    });

    it('화살표 키로 활성 항목 이동, Enter로 실행', () => {
        openCommandPalette();
        type('대시보드');
        const btn = document.querySelector('.nav-item[data-target="dashboard-view"]');
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        key('ArrowDown');
        key('ArrowUp'); // wrap-around 순환 확인
        key('Enter');
        expect(spy).toHaveBeenCalled();
        expect(document.getElementById('cmdk-overlay').classList.contains('is-hidden')).toBe(true);
    });

    it('Escape로 닫힌다', () => {
        openCommandPalette();
        expect(document.getElementById('cmdk-overlay').classList.contains('is-hidden')).toBe(false);
        key('Escape');
        expect(document.getElementById('cmdk-overlay').classList.contains('is-hidden')).toBe(true);
    });

    it('뷰 결과 실행 → 해당 nav-item 클릭', () => {
        openCommandPalette();
        type('플래시카드');
        const btn = document.querySelector('.nav-item[data-target="flashcard-view"]');
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        executePaletteResult(0);
        expect(spy).toHaveBeenCalled();
    });

    it('카드·퀴즈 term 매칭만 있어도 card/quiz 결과는 미표시', () => {
        window.startSubjectStudy = vi.fn();
        openCommandPalette();
        // '화장품 정의'는 카드 term에만 정확 매치 — 섹션 제목('화장품의 정의')에는 부분 불일치
        type('화장품 정의');
        const subs = [...document.querySelectorAll('.cmdk-item-sub')].map(el => el.textContent);
        expect(subs.some(s => s.includes('플래시카드'))).toBe(false);
        expect(subs.some(s => s.includes('기출 퀴즈'))).toBe(false);
    });

    it('특수문자 포함 검색어가 안전하게 렌더링된다', () => {
        openCommandPalette();
        type('<img src=x onerror=alert(1)>');
        const box = document.getElementById('cmdk-results');
        expect(box.innerHTML).toContain('&lt;img');
        expect(box.querySelector('img')).toBeNull();
    });

    it('콜드스타트 — 미로드 과목은 백그라운드 로드 후 같은 쿼리로 결과 갱신', async () => {
        // 팔레트는 어느 뷰에서도 열 수 있어 STUDY_DATA가 비어 있을 수 있다 —
        // 종전에는 교재 결과가 조용히 누락됐다.
        window.STUDY_DATA = {};
        DataLoader.registry = { subjects: [{ key: 'law', name: '화장품법' }], exams: [] };
        const origLoad = DataLoader.loadSubject;
        DataLoader.loadSubject = async (key) => {
            window.STUDY_DATA[key] = {
                name: '화장품법', quizzes: [], cards: [],
                chapters: [{ chapterTitle: 'c', sections: [{ title: '화장품의 정의', content: '' }] }],
            };
        };
        try {
            openCommandPalette();
            type('화장품 정의');
            await vi.waitFor(() => {
                const titles = [...document.querySelectorAll('#cmdk-results .cmdk-item-title')]
                    .map(n => n.textContent);
                expect(titles).toContain('화장품의 정의');
            }, { timeout: 2000 });
        } finally {
            DataLoader.loadSubject = origLoad;
        }
    });

    it('feature 게이팅된(is-hidden) 뷰는 검색 대상에서 제외', () => {
        openCommandPalette();
        type('성분 사전');
        const items = [...document.querySelectorAll('.cmdk-item-title')].map(el => el.textContent);
        expect(items).not.toContain('성분 사전');
    });
});
