// tests/unit/reader-toc-meta.test.js
// @spec TS-17
// isStoryMetaSection — hazmat 챕터 요약 카드(📌 핵심 요약 류)는 기준선 래칫 검토로
// 비메타 콘텐츠 확정 (📌 챕터 핵심 요약과 동일 계약 — 리더 카드·검색 인덱스 포함 대상).
// check_meta_sections 기준선(meta_sections_baseline.json)과 정합해야 한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStoryMetaSection } from '../../src/reader/reader-toc.js';

test('hazmat 챕터 요약 카드는 비메타 콘텐츠 (기준선 승인분)', () => {
    const content = [
        '📌 핵심 요약 및 시험 포인트',
        '📌 시험 대비 핵심 요약 포인트',
        '8. 수험 대비 핵심 요약',
        '📌 수험 대비 핵심 요약',
        '📌 위험물 화학 수험 대비 핵심 요약 및 판별 포인트',
        '📌 챕터 핵심 요약',
    ];
    for (const t of content) assert.equal(isStoryMetaSection(t), false, t);
});

test('장치 접두 헤딩은 메타로 분류 유지', () => {
    assert.equal(isStoryMetaSection('🧭 학습 아이콘'), true);
    assert.equal(isStoryMetaSection('✅ 확인문제'), true);
    assert.equal(isStoryMetaSection('📋 목차'), true);
});
