// tests/unit/combo-doc.test.js — combo 문항 → 문제집 Markdown 직렬화
// @spec EV-01
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComboSubjectMd } from '../../../src/content/combo-doc.js';

const Q1 = {
    id: 'c1_s1_001',
    stem: '화장품법상 기능성화장품의 범위로 옳은 것을 모두 고르시오.',
    citation: '📖 화장품법 제2조 (L110)',
    statements: [
        { id: 'ㄱ', text: '미백에 도움을 주는 화장품', truth: true },
        { id: 'ㄴ', text: '주름 개선에 도움을 주는 화장품', truth: true },
        { id: 'ㄷ', text: '감기 예방에 도움을 주는 화장품', truth: false },
    ],
    options: [
        { id: 'opt1', members: ['ㄱ', 'ㄴ'] },
        { id: 'opt2', members: ['ㄱ', 'ㄷ'] },
        { id: 'opt3', members: ['ㄴ', 'ㄷ'] },
    ],
    answer: 'opt1',
    explain: '기능성화장품은 미백·주름개선·자외선차단 등이다.\n정답: ① — 이 줄은 필터링되어야 한다.',
};

const PILOT = {
    id: 'cb-pilot-01',
    stem: '수작업 파일럿 문항.',
    citation: '📌 별표 2 (L30)',
    statements: [
        { id: 'ㄱ', text: '진술 ㄱ', truth: true },
        { id: 'ㄴ', text: '진술 ㄴ', truth: false },
    ],
    options: [
        { id: 'p1', members: ['ㄱ'] },
        { id: 'p2', members: ['ㄱ', 'ㄴ'] },
    ],
    // answer 없음 — truth 집합으로 도출되어야 함
    explain: '',
};

test('buildComboSubjectMd — 헤더·문제부 구조 직렬화', () => {
    const md = buildComboSubjectMd(1, '화장품법', [Q1]);
    assert.ok(md.startsWith('# 제1과목: 화장품법 ㄱㄴㄷ 조합형'), '과목 헤더 형식');
    assert.ok(md.includes('총 1제'), '문항 수 표기');
    assert.ok(md.includes('### Q1. 화장품법상 기능성화장품의 범위로 옳은 것을 모두 고르시오.'), '발문');
    assert.ok(md.includes('📖 화장품법 제2조 (L110)'), '인용 라인');
    assert.ok(md.includes('ㄱ. 미백에 도움을 주는 화장품'), '진술 나열');
    assert.ok(md.includes('① ㄱ, ㄴ'), '옵션 멤버 라벨 정렬');
    assert.ok(md.includes('② ㄱ, ㄷ') && md.includes('③ ㄴ, ㄷ'), '옵션 지문 기호');
});

test('buildComboSubjectMd — 정답부 도출과 해설 필터링', () => {
    const md = buildComboSubjectMd(1, '화장품법', [Q1]);
    assert.ok(md.includes('**Q1.**'), '정답부 항목');
    assert.ok(md.includes('> **정답: ① (ㄱ, ㄴ)**'), 'answer id → 지문 기호 해석');
    assert.ok(md.includes('> 진술 판정: ㄱ O · ㄴ O · ㄷ X'), '판정표');
    assert.ok(md.includes('기능성화장품은 미백·주름개선·자외선차단 등이다.'), '해설 본문 유지');
    assert.ok(!md.includes('이 줄은 필터링되어야 한다'), "원본 해설의 '정답:' 라인 필터");
});

test('buildComboSubjectMd — 파일럿 문항(answer 없음)은 truth 집합으로 정답 도출', () => {
    const md = buildComboSubjectMd(2, '화장품 제조', [PILOT]);
    assert.ok(md.includes('### Q1. 수작업 파일럿 문항. *(수작업 파일럿)*'), '파일럿 표기');
    assert.ok(md.includes('> **정답: ① (ㄱ)**'), 'truth 집합 일치 옵션 도출');
});

test('buildComboSubjectMd — 과목번호·과목명 없는 호출과 빈 배열', () => {
    const md = buildComboSubjectMd(0, undefined, []);
    assert.ok(md.startsWith('# 조합형 ㄱㄴㄷ 조합형'), '과목 생략 헤더');
    assert.ok(md.includes('총 0제'), '빈 문항 수');
    assert.ok(md.includes('## 🔑 정답 및 교재 근거'), '정답부 섹션 존재');
});
