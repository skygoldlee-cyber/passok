// tests/dom/dictionary-schema.dom.test.js — 비기본 시험 지식DB 스키마 드리븐 렌더 검증
// @spec DI-01~03
// 검증: manifest.knowledge → registry.knowledge 스키마로 선언된 임의 지식DB가
//       카드·배지·필터·헤더·CSV를 렌더하는지 확인 (Phase D — 스키마 드리븐 사전)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import { loadIndexHtml, el, resetStudyState, spyAnchorDownload, lastToast } from './helpers.js';
import { DataLoader } from '../../src/data-loader.js';
import {
    renderDictionary, filterDictionary, setDictFilter, dictState,
    dictExportCsv,
} from '../../src/views/dictionary.js';

// manifest.knowledge 스키마 형식을 반영한 축소본 — 시험 무관 임의 지식DB
const TERMS_SCHEMA = {
    registryKey: 'terms',
    global: 'TERMS_DATA',
    entityUnit: '용어',
    filterField: 'category',
    fields: {
        title: 'name',
        subtitle: 'engName',
        subtitleEmpty: '영문명 없음',
        search: ['name', 'engName', 'definition', 'ref'],
        chosungField: 'name',
    },
    badge: {
        field: 'category',
        defaultLabel: '기타',
        labels: { mech: '기계', elec: '전기', chem: '화학' },
    },
    filters: [
        { key: 'all', label: '전체 용어' },
        { key: 'mech', label: '기계' },
        { key: 'elec', label: '전기' },
        { key: 'chem', label: '화학' },
    ],
    details: [
        { key: 'definition', label: '정의', empty: '-' },
        { key: 'ref', label: '근거', empty: '참조 기준 참조', wide: true },
        { key: 'note', label: 'TIP', tip: true },
    ],
    csv: {
        filename: 'terms',
        headers: ['용어명', '영문명', '정의', '분류', '근거'],
        fields: ['name', 'engName', 'definition', { badgeLabel: 'category' }, 'ref'],
    },
    header: {
        title: '안전용어 사전',
        subtitle: '산업안전 용어 검색 — 법령·기술기준 근거',
        searchPlaceholder: '용어명·영문명·정의 검색',
    },
};

const DB = [
    { name: '방폭전기기기', engName: 'Ex-proof Equipment', category: 'elec', definition: '가스 폭발 위험 장소용 전기기기', ref: '전기기기용 기술기준', note: '방폭 마크 Ex 표기' },
    { name: '밀폐공간', engName: 'Confined Space', category: 'mech', definition: '산소 결핍 위험이 있는 제한 공간', ref: '산안법 별표11' },
    { name: '가연성물질', engName: 'Flammable Material', category: 'chem', definition: '인화점이 낮아 착화가 쉬운 물질', ref: '위험물안전관리법' },
];

describe('지식DB 사전 — 비기본 스키마(안전용어)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        dictState.query = '';
        dictState.filter = 'all';
        loadIndexHtml();
        // dictionary.js는 DataLoader.registry를 읽는다 — resetStudyState가 null로 리셋하므로 여기서 주입
        DataLoader.registry = {
            knowledge: TERMS_SCHEMA,
            terms: { version: '0.1.0', stats: { count: DB.length } },
        };
        window.TERMS_DATA = DB;
        delete window.INGREDIENTS_DATA; // 기본 스키마 전역과 오염 방지
        vi.clearAllMocks();
    });

    it('스키마 필드로 카드 렌더 — 제목·부제·분류 배지 라벨', () => {
        renderDictionary();

        const cards = el('dict-results-container').querySelectorAll('.dict-card');
        expect(cards.length).toBe(3);
        expect(cards[0].querySelector('.dict-card-title').textContent).toBe('방폭전기기기');
        expect(cards[0].querySelector('.dict-card-subtitle').textContent).toBe('Ex-proof Equipment');
        expect(cards[0].querySelector('.dict-badge').textContent).toBe('전기');
        expect(cards[1].querySelector('.dict-badge').textContent).toBe('기계');
        expect(cards[2].querySelector('.dict-badge').textContent).toBe('화학');
    });

    it('스키마 필터 버튼을 렌더 — cosmetic 유형 버튼이 아닌 첨가물 분류', () => {
        renderDictionary();

        const filters = [...document.querySelectorAll('.dict-filter-buttons button')].map(b => b.dataset.filter);
        expect(filters).toEqual(['all', 'mech', 'elec', 'chem']);
        expect(document.querySelector('.dict-filter-buttons').textContent).toContain('전체 용어');
    });

    it('category 필터 → 해당 분류만 표시', () => {
        setDictFilter('mech');

        const cards = el('dict-results-container').querySelectorAll('.dict-card');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).toContain('밀폐공간');
    });

    it('스키마 search 필드 — 정의 텍스트로 검색 매칭', () => {
        el('dict-search-input').value = '폭발';
        filterDictionary();

        const cards = el('dict-results-container').querySelectorAll('.dict-card');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).toContain('방폭전기기기');
    });

    it('상세 행은 스키마 details 키를 표시', () => {
        renderDictionary();
        const card = el('dict-results-container').querySelector('.dict-card');
        card.click();

        const details = card.querySelector('.dict-card-details');
        expect(details.textContent).toContain('정의');
        expect(details.textContent).toContain('가스 폭발 위험');
        expect(details.textContent).toContain('근거');
        expect(details.textContent).toContain('방폭 마크 Ex 표기'); // tip 행
    });

    it('버전 표기가 entityUnit + registry 메타를 사용', () => {
        renderDictionary();
        expect(el('dict-db-version').textContent).toContain('용어 DB v0.1.0');
        expect(el('dict-db-version').textContent).toContain('3종');
    });

    it('CSV보내기 — 스키마 csv.fields(배지 라벨 치환) + 파일명', () => {
        const dl = spyAnchorDownload();
        dictExportCsv();
        dl.restore();

        expect(dl.clicks.length).toBe(1);
        expect(dl.clicks[0].download).toMatch(/^terms_v0\.1\.0_.*\.csv$/);
        expect(lastToast()[0]).toContain('용어 3종');
    });
});
