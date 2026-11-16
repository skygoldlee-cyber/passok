// tests/unit/reader-toc-meta.test.js
// @spec TS-17
// isStoryMetaSection — 메타 섹션 헤딩 판정. 📌 핵심 요약 류 요약 카드는 메타로
// 분류돼 리더 본문 카드·검색 인덱스에서 제외되어야 한다 (check_meta_sections 연동).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStoryMetaSection } from '../../src/reader/reader-toc.js';

test('핵심 요약 류 헤딩은 메타 섹션', () => {
    const meta = [
        '📌 핵심 요약 및 시험 포인트',
        '📌 시험 대비 핵심 요약 포인트',
        '8. 수험 대비 핵심 요약',
        '📌 수험 대비 핵심 요약',
        '📌 위험물 화학 수험 대비 핵심 요약 및 판별 포인트',
        '📌 챕터 핵심 요약',
    ];
    for (const t of meta) assert.equal(isStoryMetaSection(t), true, t);
});

test('본문 헤딩은 메타로 오인되지 않음', () => {
    const body = [
        '1. 화재의 정의',
        '📚 Chapter 03. 소화 방법',
        '2. 위험물의 분류',
    ];
    for (const t of body) assert.equal(isStoryMetaSection(t), false, t);
});
