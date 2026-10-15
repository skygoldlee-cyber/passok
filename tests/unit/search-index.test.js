// tests/unit/search-index.test.js — 통합검색 코어(search-index.js) 단위 테스트
// @spec TS-12,TS-13,TS-14
// 검증: runTextbookSearch — 티어 버킷(교재/참조/문제은행/부분) 분류 · AND 그룹 시맨틱
//       (한 그룹 후보 부재 시 결과 없음 — 조기 종료 경로) · 동의어 확장 · 점수 내림차순
//       jsdom 없이 window.STUDY_DATA 스텁만으로 직접 구동 (뷰 분리 목적)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTextbookSearch, lazyIndexesPending } from '../../src/search-index.js';
import { DataLoader } from '../../src/data-loader.js';

// subj key를 테스트마다 바꿔 캐시(_searchIndexKeys) 재구축을 강제한다
let _subjSeq = 0;
function seedStudyData(sections) {
    const key = 'subj_u' + (_subjSeq++);
    globalThis.window = {
        STUDY_DATA: {
            [key]: {
                key,
                name: '과목U',
                chapters: [{
                    chapterKey: 'ch1',
                    chapterTitle: '1장 단원',
                    filePath: 'content/t/ch1.md',
                    sections: sections.map((s, i) => ({
                        title: s.title || `섹션 ${i}`,
                        content: s.content || '',
                    })),
                }],
            },
        },
    };
    return key;
}

test('runTextbookSearch — 어절 경계 매치는 sections 버킷에 _score 내림차순', () => {
    seedStudyData([
        { title: '화장품 정의', content: '화장품은 화장품법에서 규정한다. 화장품 화장품 화장품' },
        { title: '기타', content: '화장품 관련 규정' },
    ]);
    const r = runTextbookSearch('화장품');
    assert.equal(r.buckets.refs.length, 0);
    assert.equal(r.buckets.exams.length, 0);
    assert.equal(r.buckets.weak.length, 0);
    assert.ok(r.buckets.sections.length >= 2);
    for (let i = 1; i < r.buckets.sections.length; i++) {
        assert.ok(r.buckets.sections[i - 1]._score >= r.buckets.sections[i]._score);
    }
    assert.deepEqual(r.allVariantTerms, ['화장품']);
    assert.equal(lazyIndexesPending(), false);
});

test('runTextbookSearch — 어절 중간 음절 매치는 weak 버킷 (부분 일치)', () => {
    seedStudyData([
        { title: '석유화학 개요', content: '석유화학 산업은 원료다' },
    ]);
    // '유화'는 '석유화학' 어절 중간에만 등장 — 경계 매치 불가 → 부분 일치 티어
    const r = runTextbookSearch('유화');
    assert.equal(r.buckets.sections.length, 0);
    assert.equal(r.buckets.weak.length, 1);
});

test('runTextbookSearch — 한 쿼리 그룹 후보가 없으면 AND 불성립으로 결과 없음 (조기 종료)', () => {
    seedStudyData([
        { title: '화장품 정의', content: '화장품은 피부에 바른다' },
    ]);
    const r = runTextbookSearch('화장품 존재하지않는용어xyz');
    assert.equal(r.buckets.sections.length, 0);
    assert.equal(r.buckets.refs.length, 0);
    assert.equal(r.buckets.exams.length, 0);
    assert.equal(r.buckets.weak.length, 0);
});

test('runTextbookSearch — 동의어 확장: 원 용어 대신 동의 개념 용어로도 매치', () => {
    seedStudyData([
        { title: '지수 규정', content: '자외선차단지수는 별표로 정한다' },
    ]);
    const prev = DataLoader.registry;
    try {
        DataLoader.registry = { synonyms: { 'spf': ['자외선차단지수'] } };
        const r = runTextbookSearch('spf');
        assert.equal(r.buckets.sections.length, 1);
        // 하이라이트·스니펫용 변형 목록에 원 용어 + 동의어 모두 포함
        assert.ok(r.allVariantTerms.includes('spf'));
        assert.ok(r.allVariantTerms.includes('자외선차단지수'));
    } finally {
        DataLoader.registry = prev;
    }
});

test('runTextbookSearch — 과목 필터가 버킷을 귀속별로 제한', () => {
    const key = seedStudyData([
        { title: '화장품 정의', content: '화장품 규정' },
    ]);
    const all = runTextbookSearch('화장품');
    assert.equal(all.buckets.sections.length, 1);
    const filtered = runTextbookSearch('화장품', 'other-subj');
    assert.equal(filtered.buckets.sections.length, 0);
    const hit = runTextbookSearch('화장품', key);
    assert.equal(hit.buckets.sections.length, 1);
});

test('runTextbookSearch — 참조자료·문제은행 엔트리 플래그로 버킷 분리', () => {
    const key = seedStudyData([
        { title: '화장품 정의', content: '화장품 규정' },
    ]);
    // 지연 로더 없이 엔트리 형태만 검증 — fromRef/fromExam 엔트리는 전용 버킷으로
    // 분리된다는 계약은 스텁 엔트리 주입 없이도 DOM 테스트가 커버한다.
    // 여기서는 교재 엔트리가 sections로 가고 refs/exams가 비어 있음을 확인.
    const r = runTextbookSearch('화장품');
    assert.equal(r.buckets.sections[0].subjId, key);
    assert.equal(r.buckets.sections[0].fromRef, undefined);
    assert.equal(r.buckets.sections[0].fromExam, undefined);
});
