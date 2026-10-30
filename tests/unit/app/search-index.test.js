// tests/unit/search-index.test.js — 통합검색 코어(search-index.js) 단위 테스트
// @spec TS-12,TS-13,TS-14,TS-18
// 검증: runUnifiedSearch — 티어 버킷(kind별+부분 일치) 분류 · AND 그룹 시맨틱
//       (한 그룹 후보 부재 시 결과 없음 — 조기 종료 경로) · 동의어 확장 · 점수 내림차순
//       jsdom 없이 window.STUDY_DATA 스텁만으로 직접 구동 (뷰 분리 목적)
//       TS-18 — 교재 소스는 initSearchSources()로 등록된 프로바이더가 수집

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runUnifiedSearch, lazyIndexesPending, registerSearchSource, ensureLazyIndexes }
    from '../../../src/search/search-index.js';
import { initSearchSources } from '../../../src/search/search-sources.js';
import { DataLoader } from '../../../src/content/data-loader.js';

initSearchSources(); // TS-18 — 프로바이더 등록 (idempotent)

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

test('runUnifiedSearch — 어절 경계 매치는 sections 버킷에 _score 내림차순', () => {
    seedStudyData([
        { title: '화장품 정의', content: '화장품은 화장품법에서 규정한다. 화장품 화장품 화장품' },
        { title: '기타', content: '화장품 관련 규정' },
    ]);
    const r = runUnifiedSearch('화장품');
    assert.equal((r.buckets.ref || []).length, 0);
    assert.equal((r.buckets.exam || []).length, 0);
    assert.equal(r.buckets.weak.length, 0);
    assert.ok(r.buckets.section.length >= 2);
    for (let i = 1; i < r.buckets.section.length; i++) {
        assert.ok(r.buckets.section[i - 1]._score >= r.buckets.section[i]._score);
    }
    assert.deepEqual(r.allVariantTerms, ['화장품']);
    assert.equal(lazyIndexesPending(), false);
});

test('runUnifiedSearch — 어절 중간 음절 매치는 weak 버킷 (부분 일치)', () => {
    seedStudyData([
        { title: '석유화학 개요', content: '석유화학 산업은 원료다' },
    ]);
    // '유화'는 '석유화학' 어절 중간에만 등장 — 경계 매치 불가 → 부분 일치 티어
    const r = runUnifiedSearch('유화');
    assert.equal(r.buckets.section.length, 0);
    assert.equal(r.buckets.weak.length, 1);
});

test('runUnifiedSearch — 한 쿼리 그룹 후보가 없으면 AND 불성립으로 결과 없음 (조기 종료)', () => {
    seedStudyData([
        { title: '화장품 정의', content: '화장품은 피부에 바른다' },
    ]);
    const r = runUnifiedSearch('화장품 존재하지않는용어xyz');
    assert.equal(r.buckets.section.length, 0);
    assert.equal((r.buckets.ref || []).length, 0);
    assert.equal((r.buckets.exam || []).length, 0);
    assert.equal(r.buckets.weak.length, 0);
});

test('runUnifiedSearch — 동의어 확장: 원 용어 대신 동의 개념 용어로도 매치', () => {
    seedStudyData([
        { title: '지수 규정', content: '자외선차단지수는 별표로 정한다' },
    ]);
    const prev = DataLoader.registry;
    try {
        DataLoader.registry = { synonyms: { 'spf': ['자외선차단지수'] } };
        const r = runUnifiedSearch('spf');
        assert.equal(r.buckets.section.length, 1);
        // 하이라이트·스니펫용 변형 목록에 원 용어 + 동의어 모두 포함
        assert.ok(r.allVariantTerms.includes('spf'));
        assert.ok(r.allVariantTerms.includes('자외선차단지수'));
    } finally {
        DataLoader.registry = prev;
    }
});

test('runUnifiedSearch — 과목 필터가 버킷을 귀속별로 제한', () => {
    const key = seedStudyData([
        { title: '화장품 정의', content: '화장품 규정' },
    ]);
    const all = runUnifiedSearch('화장품');
    assert.equal(all.buckets.section.length, 1);
    const filtered = runUnifiedSearch('화장품', 'other-subj');
    assert.equal(filtered.buckets.section.length, 0);
    const hit = runUnifiedSearch('화장품', key);
    assert.equal(hit.buckets.section.length, 1);
});

test('runUnifiedSearch — 후보 없는 용어는 failedTerms로 보고된다 (AND 불성립 안내)', () => {
    seedStudyData([
        { title: '화장품 정의', content: '화장품은 피부에 바른다' },
    ]);
    const r = runUnifiedSearch('화장품 없는용어xyz');
    assert.deepEqual(r.failedTerms, ['없는용어xyz']);
    assert.equal(r.buckets.section.length, 0);
    // 정상 쿼리는 빈 배열
    assert.deepEqual(runUnifiedSearch('화장품').failedTerms, []);
});

test('runUnifiedSearch — idf 가중: 희귀 용어 측 반복이 흔한 용어 측 반복보다 높은 점수', () => {
    seedStudyData([
        // A: 흔한×10 + 드문×1 / B: 흔한×1 + 드문×10 / C: 흔한×10만 (AND 후보 제외)
        { title: 'A', content: '흔한 '.repeat(10) + '드문' },
        { title: 'B', content: '흔한 ' + '드문 '.repeat(10) },
        { title: 'C', content: '흔한 '.repeat(10) },
    ]);
    const r = runUnifiedSearch('흔한 드문');
    assert.equal(r.buckets.section.length, 2);
    // idf 없이는 빈도 대칭으로 동점(A 선행) — 드문(df 2) 측 가중으로 B가 상위
    const sorted = [...r.buckets.section].sort((a, b) => b._score - a._score);
    assert.equal(sorted[0].title, 'B');
});

test('runUnifiedSearch — 쿼리 전체가 인접 구문으로 나타나는 엔트리에 구문 가산', () => {
    seedStudyData([
        { title: '분리', content: '피부 구조는 여러 층이며 장벽 기능을 가진다' },
        { title: '인접', content: '피부 장벽 기능이 핵심이다' },
    ]);
    const r = runUnifiedSearch('피부 장벽');
    assert.equal(r.buckets.section.length, 2);
    const sorted = [...r.buckets.section].sort((a, b) => b._score - a._score);
    assert.equal(sorted[0].title, '인접');
});

test('runUnifiedSearch — 참조자료·문제은행 엔트리 플래그로 버킷 분리', () => {
    const key = seedStudyData([
        { title: '화장품 정의', content: '화장품 규정' },
    ]);
    // 지연 로더 없이 엔트리 형태만 검증 — kind='ref'/'exam' 엔트리의 전용 버킷
    // 분리 계약은 스텁 엔트리 주입 없이도 DOM 테스트가 커버한다.
    // 여기서는 교재 엔트리가 kind='section' 버킷으로 감을 확인.
    const r = runUnifiedSearch('화장품');
    assert.equal(r.buckets.section[0].subjId, key);
    assert.equal(r.buckets.section[0].kind, 'section');
});

// --- TS-18 — 소스 프로바이더 레지스트리 ---
// 주의: 이 파일 끝에 둔다 — 등록된 소스는 모듈 수명 동안 유지되므로 후행 테스트에 영향.

test('registerSearchSource — eager 커스텀 소스 엔트리가 kind 버킷으로 분류된다', () => {
    seedStudyData([{ title: '화장품 정의', content: '화장품 규정' }]);
    let revSeq = 0;
    registerSearchSource({
        id: 'test-custom', kind: 'custom',
        rev: () => 'r' + (++revSeq), // 매 호출 무효화 — 인덱스 재구축 경로 검증
        load: () => [{
            kind: 'custom', title: '커스텀 문서', crumb: '', subjId: '', subjName: '',
            text: '화장품 커스텀 본문', nav: { mdPath: 'custom/x.md' },
            _searchText: '커스텀 문서 화장품 커스텀 본문',
        }],
    });
    const r = runUnifiedSearch('화장품');
    assert.equal((r.buckets.custom || []).length, 1);
    assert.equal(r.buckets.custom[0].title, '커스텀 문서');
    assert.equal(r.buckets.custom[0].kind, 'custom');
    assert.ok(r.buckets.custom[0]._score > 0);
    // 동일 id 재등록은 무시된다 (idempotent)
    registerSearchSource({ id: 'test-custom', kind: 'custom', load: () => [] });
    assert.equal(runUnifiedSearch('화장품').buckets.custom.length, 1);
});

test('ensureLazyIndexes — lazy 소스 완료 후 엔트리가 인덱스에 병합된다', async () => {
    seedStudyData([{ title: '화장품 정의', content: '화장품 규정' }]);
    registerSearchSource({
        id: 'test-lazy', kind: 'lazykind', lazy: true,
        load: async () => [{
            kind: 'lazykind', title: '지연 문서', crumb: '', subjId: '', subjName: '',
            text: '지연용어 본문', nav: { mdPath: 'lazy/x.md' },
            _searchText: '지연 문서 지연용어 본문',
        }],
    });
    let fired = 0;
    ensureLazyIndexes(() => fired++);
    assert.ok(fired >= 0); // 콜백은 소스 완료 시점 — 비동기
    await new Promise(r => setTimeout(r, 30));
    const r = runUnifiedSearch('지연용어');
    assert.equal((r.buckets.lazykind || []).length, 1);
    assert.ok(fired >= 1); // 완료 콜백이 최소 1회 발화 (다른 lazy 소스 포함)
    // 두 번째 호출은 재기동하지 않는다 — pending 소스는 기동 완료 상태
    ensureLazyIndexes(() => fired++);
    await new Promise(r2 => setTimeout(r2, 10));
    const firedBefore = fired;
    ensureLazyIndexes(() => fired++);
    await new Promise(r2 => setTimeout(r2, 10));
    assert.equal(fired, firedBefore);
});

test('_loadExamDocEntries — manifest.searchDocs 선언 문서를 doc 엔트리로 로드한다', async () => {
    const { _loadExamDocEntries } = await import('../../../src/search/search-sources.js');
    const { contentPath } = await import('../../../src/exam-context.js');
    const prevManifest = DataLoader._manifest;
    DataLoader._manifest = {
        subjects: [{ key: 'paper1', name: '과목일' }],
        searchDocs: [
            { file: 'docs/indep_manual.md', title: '선언독립문서타이틀', subject: 'paper1' },
            { file: 'docs/gated.md', title: '게이트문서', feature: 'nonexistent_feature' },
            { file: 'docs/missing.md', title: '미번들문서' },
        ],
    };
    const mdPath = contentPath('docs/indep_manual.md');
    globalThis.window = { __DOC_MD__: {
        [mdPath]: '선언문서 고유용어ZX 본문',
        'docs/user/user_manual.md': '공용매뉴얼 고유용어ZQ 본문',
    } };
    try {
        const entries = await _loadExamDocEntries();
        // feature 게이트 비활성 + 번들·fetch 실패 문서는 제외된다
        assert.equal(entries.length, 2);
        const declared = entries.find(e => e.title === '선언독립문서타이틀');
        assert.equal(declared.kind, 'doc');
        assert.equal(declared.subjId, 'paper1');
        assert.equal(declared.subjName, '과목일');
        assert.equal(declared.nav.mdPath, mdPath);
        assert.ok(declared._searchText.includes('고유용어zx'));
        // 앱 공용 문서(사용자 매뉴얼)는 시험 무관하게 자동 병합 — contentPath가 아닌
        // 리포 루트 상대 경로가 그대로 쓰여야 한다
        const common = entries.find(e => e.title === '사용자 매뉴얼');
        assert.ok(common, '공용 사용자 매뉴얼 엔트리');
        assert.equal(common.nav.mdPath, 'docs/user/user_manual.md');
        assert.ok(common._searchText.includes('고유용어zq'));
    } finally {
        DataLoader._manifest = prevManifest;
        delete globalThis.window;
    }
});

test('glossarySubjectKey — 과목 디렉터리명·과목 키 모두 과목 키로 해석한다', async () => {
    const { glossarySubjectKey } = await import('../../../src/reader/glossary-query.js');
    const prev = DataLoader.registry;
    DataLoader.registry = { subjects: [{ key: 'paper1' }] };
    try {
        assert.equal(glossarySubjectKey(''), '');
        // 과목 키가 직접 오면 디렉터리 명명 규약 없이 통과한다
        assert.equal(glossarySubjectKey('paper1'), 'paper1');
        // 디렉터리명은 활성 시험의 과목 디렉터리 매핑으로 역해석된다 (cosmetic 기본값)
        assert.equal(glossarySubjectKey('과목1'), 'law');
        // 미등록 값은 미귀속
        assert.equal(glossarySubjectKey('과목9'), '');
    } finally {
        DataLoader.registry = prev;
    }
});
