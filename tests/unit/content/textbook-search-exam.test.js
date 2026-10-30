// tests/unit/textbook-search-exam.test.js — 문제은행 검색 로더 단위 테스트
// @spec TS-12
// 검증: _loadExamMdText — 주입된 __EXAM_MD__ 번들 우선 조회 · fetch/번들 모두 실패 시 null
//       (해당 문서만 건너뛰는 오프라인 규약 — 참조자료 인덱스와 동일)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _loadExamMdText } from '../../../src/search/search-sources.js';

test('_loadExamMdText — 주입된 __EXAM_MD__ 번들을 우선 조회', async () => {
    globalThis.window = { __EXAM_MD__: { 'content/exams/t/문제은행/x.md': '# 번들본문' } };
    try {
        const text = await _loadExamMdText('content/exams/t/문제은행/x.md');
        assert.equal(text, '# 번들본문');
    } finally {
        delete globalThis.window;
    }
});

test('_loadExamMdText — 번들·fetch 모두 실패하면 null (해당 문서만 건너뜀)', async () => {
    globalThis.window = { __EXAM_MD__: {} };
    globalThis.location = { protocol: 'http:' };
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: false, status: 404, statusText: 'Not Found', text: async () => ''
    });
    try {
        assert.equal(await _loadExamMdText('content/exams/t/문제은행/miss.md'), null);
    } finally {
        delete globalThis.window;
        delete globalThis.location;
        globalThis.fetch = prevFetch;
    }
});
