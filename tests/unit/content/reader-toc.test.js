// tests/unit/reader-toc.test.js — 리더 목차 추출 헬퍼 검증
// @spec TR-06
// textbook-reader.js에서 reader-toc.js로 분리된 순수 함수군의 계약 고정:
// 메타 섹션 판정·번호 기반 계층·참조 접두사 제거·코드블록 제외 하위 헤딩.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const {
    isStoryMetaSection, filterMetaSections, getTocLevel,
    cleanRefTitle, extractSubHeadings, buildSectionDisplayTitles,
} = require(join(ROOT, 'src/reader-toc.js'));

test('isStoryMetaSection — 메타 섹션 제목 판정', () => {
    assert.ok(isStoryMetaSection('🧭 학습 아이콘'));
    assert.ok(isStoryMetaSection('✅ 확인문제'));
    assert.ok(isStoryMetaSection('출처: 화장품법'));
    assert.ok(!isStoryMetaSection('1. 화장품의 정의'));
    assert.ok(!isStoryMetaSection(''));
});

test('isStoryMetaSection — TS-17 승격 패턴: 장치 접두는 메타, 최종 복습·콘텐츠는 비메타', () => {
    // 기준선 래칫 검토로 승격된 장치 섹션 (스토리 슬롯 없음·가이드 장치 규약 정합)
    assert.ok(isStoryMetaSection('🧭 민수의 여정도 — 이야기 흐름 한눈에 보기'));
    assert.ok(isStoryMetaSection('🔢 숫자·기한 암기 미리보기'));
    assert.ok(isStoryMetaSection('🔢 숫자 암기 미리보기'));
    assert.ok(isStoryMetaSection('📋 목차'));
    assert.ok(isStoryMetaSection('📋 학습 안내'));
    // 최종 복습·서사 슬롯 보유·마인드맵 링크 대상 — 실제 콘텐츠라 메타 아님
    assert.ok(!isStoryMetaSection('⚡ 시험 직전 체크리스트'));
    assert.ok(!isStoryMetaSection('📝 기출문제'));
    assert.ok(!isStoryMetaSection('📝 이야기 회상'));
    assert.ok(!isStoryMetaSection('🧠 30초 회상'));
    assert.ok(!isStoryMetaSection('📌 챕터 핵심 요약'));
    assert.ok(!isStoryMetaSection('🗺️ 과목 지도'));
    assert.ok(!isStoryMetaSection('📋 암기 요약'));      // 암기요약 이미지 — 콘텐츠
    assert.ok(!isStoryMetaSection('🧭 이야기의 등장인물')); // 등장인물 소개 — 콘텐츠
});

test('filterMetaSections — 메타 섹션만 제거하고 나머지 보존', () => {
    const chapter = {
        sections: [
            { title: '1. 개요' },
            { title: '✅ 확인문제' },
            { title: '2. 세부' },
        ],
    };
    const out = filterMetaSections(chapter);
    assert.equal(out.sections.length, 2);
    assert.equal(out.sections[0].title, '1. 개요');
    assert.equal(out.sections[1].title, '2. 세부');
});

test('getTocLevel — 번호 패턴 계층', () => {
    assert.equal(getTocLevel('1.1.1 세부'), 3);
    assert.equal(getTocLevel('1.1 세부'), 2);
    assert.equal(getTocLevel('1. 세부'), 1);
    assert.equal(getTocLevel('제3조 정의'), 0);
});

test('cleanRefTitle — NN_ 접두사 제거', () => {
    assert.equal(cleanRefTitle('01_화장품법'), '화장품법');
    assert.equal(cleanRefTitle('화장품법'), '화장품법');
});

test('buildSectionDisplayTitles — 중복 제목에 소속 챕터명 병기', () => {
    const sections = [
        { title: '🧭 학습 아이콘' },
        { title: '📚 Chapter 01. 화장품법의 이해' },
        { title: '1. 화장품의 정의' },
        { title: '📌 챕터 핵심 요약' },
        { title: '✅ 확인문제' },
        { title: '📚 Chapter 02. 개인정보 보호법' },
        { title: '1. 고객관리' },
        { title: '📌 챕터 핵심 요약' },
        { title: '✅ 확인문제' },
    ];
    const out = buildSectionDisplayTitles(sections);
    // 중복 제목은 소속 챕터명 병기
    assert.equal(out[3], '📌 챕터 핵심 요약 — Chapter 01. 화장품법의 이해');
    assert.equal(out[7], '📌 챕터 핵심 요약 — Chapter 02. 개인정보 보호법');
    assert.equal(out[8], '✅ 확인문제 — Chapter 02. 개인정보 보호법');
    // 챕터 헤더·고유 제목·첫 챕터 이전 섹션은 원문 유지
    assert.equal(out[0], '🧭 학습 아이콘');
    assert.equal(out[1], '📚 Chapter 01. 화장품법의 이해');
    assert.equal(out[6], '1. 고객관리');
});

test('buildSectionDisplayTitles — 첫 Chapter 이전 중복·빈 입력 안전', () => {
    const out = buildSectionDisplayTitles([
        { title: '참고' }, { title: '참고' },
        { title: '📚 Chapter 01. A' }, { title: '참고' },
    ]);
    assert.equal(out[0], '참고');  // 챕터 컨텍스트 없음 → 원문
    assert.equal(out[3], '참고 — Chapter 01. A');
    assert.deepEqual(buildSectionDisplayTitles([]), []);
    assert.deepEqual(buildSectionDisplayTitles(null), []);
});

test('extractSubHeadings — ### / #### 추출, 코드블록 제외', () => {
    const content = [
        '본문',
        '### 소제목',
        '#### 세부제목',
        '```',
        '### 코드 안의 헤딩 아님',
        '```',
        '### 다음 제목',
    ].join('\n');
    const out = extractSubHeadings(content);
    assert.deepEqual(out, [
        { level: 3, title: '소제목' },
        { level: 4, title: '세부제목' },
        { level: 3, title: '다음 제목' },
    ]);
    assert.deepEqual(extractSubHeadings(''), []);
    assert.deepEqual(extractSubHeadings(null), []);
});
