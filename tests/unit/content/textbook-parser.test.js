// @spec TR-01
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownFile, parseTextbookContent, buildSubjectData } from '../../../src/reader/textbook-parser.js';

// --- 테스트용 MD 샘플 ---

const SAMPLE_MD_TABLE = `# 1과목: 맞춤형화장품의 이해

## 1단원: 개요

| 용어 | 설명 |
| --- | --- |
| 맞춤형화장품 | 🔖기출 개인의 피부 특성에 맞게 **혼합·소분**하는 화장품 |
| 관능평가법 | 📌중요 시각·후각·촉각 등으로 **품질**을 평가하는 방법 |
`;

const SAMPLE_MD_LINE = `# 2과목: 유통화장품 안전관리

## 1단원: 작업장 위생관리

- **작업장 청소** 🔖기출: 작업 전후에 **1회** 이상 실시해야 한다
`;

const SAMPLE_MD_GENERIC = `# 4과목: 범용 용어 필터

## 1단원: 피부 기능

| 용어 | 설명 |
| --- | --- |
| 보호 기능 | 물리적 마찰·충격과 화학 물질로부터 피부를 보호하는 역할 |
| 자격시험 합격 기준 | 전 과목 총점 60% 이상, 매 과목 40% 이상 |
| 관리 | 품질을 관리하는 일반적인 절차 설명 |
`;

const SAMPLE_MD_NO_QUIZ = `# 3과목: 화장품 제조

## 1단원: 원료

| 항목 | 내용 |
| --- | --- |
| 원료A | 일반 설명 (기출/중요 마커 없음) |
`;

const SAMPLE_MD_BACKTICK_MARKERS = `# 4과목: 백틱 마커 정제

## 1단원: 사용제한 원료

| 용어 | 사용한도 |
| --- | --- |
| 헥세티딘 \`🎯 기출\` | 사용 후 씻어내는 제품에 0.1% |
| 호모게나이저 \`기출\` | 내용물의 혼합 및 분산을 위해 사용하는 터빈형 회전날개 교반기 |
`;

// --- parseMarkdownFile 테스트 ---

test('parseMarkdownFile: 테이블에서 카드 추출', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    assert.ok(cards.length >= 2, '최소 2개 카드가 추출되어야 함');
    const terms = cards.map(c => c.term);
    assert.ok(terms.includes('맞춤형화장품'), '맞춤형화장품 카드가 있어야 함');
    assert.ok(terms.includes('관능평가법'), '관능평가법 카드가 있어야 함');
});

test('parseMarkdownFile: 🔖기출 마커 카드는 isKey=true', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    const card = cards.find(c => c.term === '맞춤형화장품');
    assert.equal(card.isKey, true);
});

test('parseMarkdownFile: 📌중요 마커 카드는 isKey=true', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    const card = cards.find(c => c.term === '관능평가법');
    assert.equal(card.isKey, true);
});

test('parseMarkdownFile: isKey 카드에서 빈칸 퀴즈 생성 (bold 답)', () => {
    const { quizzes } = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    // **혼합·소분** → 빈칸 퀴즈
    const blendQuiz = quizzes.find(q => q.answer === '혼합·소분');
    assert.ok(blendQuiz, '혼합·소분 빈칸 퀴즈가 있어야 함');
    assert.equal(blendQuiz.type, 'blank');
    assert.ok(blendQuiz.question.includes('[ 빈칸 ]'), 'question에 빈칸이 포함되어야 함');
});

test('parseMarkdownFile: 리스트 항목에서 카드 추출', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_LINE, 'safety', '1.safety-workplace.md', 'ch1');
    const card = cards.find(c => c.term === '작업장 청소');
    assert.ok(card, '작업장 청소 카드가 있어야 함');
    assert.equal(card.isKey, true);
});

test('parseMarkdownFile: 리스트 항목에서 빈칸 퀴즈 생성', () => {
    const { quizzes } = parseMarkdownFile(SAMPLE_MD_LINE, 'safety', '1.safety-workplace.md', 'ch1');
    const quiz = quizzes.find(q => q.answer === '1회');
    assert.ok(quiz, '1회 빈칸 퀴즈가 있어야 함');
    assert.equal(quiz.type, 'blank');
});

test('parseMarkdownFile: 기출/중요 마커 없는 테이블 행은 카드만, 퀴즈 없음', () => {
    const { cards, quizzes } = parseMarkdownFile(SAMPLE_MD_NO_QUIZ, 'manufacturing', '1.manufacturing-raw.md', 'ch1');
    assert.ok(cards.length > 0, '카드는 추출되어야 함');
    assert.equal(quizzes.length, 0, '기출/중요 마커 없으면 퀴즈가 없어야 함');
});

test('parseMarkdownFile: 카드 ID는 안정적 (동일 입력 → 동일 ID)', () => {
    const result1 = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    const result2 = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    assert.equal(result1.cards[0].id, result2.cards[0].id, '동일 입력은 동일 ID');
});

test('parseMarkdownFile: 카드 ID 형식 = subjectKey_card_hash', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    for (const card of cards) {
        assert.match(card.id, /^understanding_card_[0-9a-f]{6}$/, `ID="${card.id}" 형식이 올바름`);
    }
});

test('parseMarkdownFile: 카드 category는 ## 섹션명', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_TABLE, 'understanding', '1.cosmetic-overview.md', 'ch1');
    for (const card of cards) {
        assert.equal(card.category, '1단원: 개요');
    }
});

test('parseMarkdownFile: ** 마커는 term에서 제거', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_LINE, 'safety', '1.safety-workplace.md', 'ch1');
    const card = cards.find(c => c.term === '작업장 청소');
    assert.ok(card, 'term에 **가 제거되어야 함');
    assert.equal(card.term.includes('**'), false);
});

test('parseMarkdownFile: 범용 접미사 복합 용어는 카드로 추출', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_GENERIC, 'understanding', '1.skin-function.md', 'ch1');
    const terms = cards.map(c => c.term);
    assert.ok(terms.includes('보호 기능'), "'…기능' 복합 용어가 카드로 살아있어야 함");
    assert.ok(terms.includes('자격시험 합격 기준'), "'…기준' 복합 용어가 카드로 살아있어야 함");
});

test('parseMarkdownFile: 백틱으로 감싼 마커는 term에 잔재를 남기지 않음', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_BACKTICK_MARKERS, 'manufacturing', '1.restricted.md', 'ch1');
    const terms = cards.map(c => c.term);
    assert.ok(terms.includes('헥세티딘'), '백틱 마커가 제거된 용어로 추출되어야 함');
    assert.ok(terms.includes('호모게나이저'), '비표준 `기출` 마커도 제거되어야 함');
    assert.ok(terms.every(t => !t.includes('`') && !/기출|중요|필수/.test(t)), 'term에 마커·백틱 잔재 금지');
});

test('parseMarkdownFile: 단일 범용어는 여전히 탈락', () => {
    const { cards } = parseMarkdownFile(SAMPLE_MD_GENERIC, 'understanding', '1.skin-function.md', 'ch1');
    assert.ok(!cards.some(c => c.term === '관리'), "단일 범용어 '관리'는 카드가 되면 안 됨");
});

// --- parseTextbookContent 테스트 ---

test('parseTextbookContent: # 은 챕터 타이틀', () => {
    const result = parseTextbookContent(SAMPLE_MD_TABLE, '1.cosmetic-overview.md', 'content/understanding');
    assert.equal(result.chapterTitle, '1과목: 맞춤형화장품의 이해');
});

test('parseTextbookContent: ## 는 섹션 분할', () => {
    const result = parseTextbookContent(SAMPLE_MD_TABLE, '1.cosmetic-overview.md', 'content/understanding');
    assert.ok(result.sections.length >= 1, '최소 1개 섹션');
    const titles = result.sections.map(s => s.title);
    assert.ok(titles.includes('1단원: 개요'), '1단원: 개요 섹션이 있어야 함');
});

test('parseTextbookContent: 파일명과 경로 설정', () => {
    const result = parseTextbookContent(SAMPLE_MD_TABLE, '1.cosmetic-overview.md', 'content/understanding');
    assert.equal(result.fileName, '1.cosmetic-overview.md');
    assert.ok(result.filePath.includes('content/understanding'), 'filePath에 디렉터리 포함');
});

// --- buildSubjectData 테스트 ---

test('buildSubjectData: 과목명 조립', () => {
    const subjectMeta = {
        key: 'understanding',
        order: 1,
        name: '맞춤형화장품의 이해',
        dir: 'understanding',
        chapters: [{ key: 'ch1', title: '개요', file: '1.cosmetic-overview.md' }]
    };
    const mdByFile = { '1.cosmetic-overview.md': SAMPLE_MD_TABLE };
    const data = buildSubjectData(subjectMeta, mdByFile);
    assert.equal(data.name, '1과목: 맞춤형화장품의 이해');
});

test('buildSubjectData: cards/quizzes/chapters 배열 포함', () => {
    const subjectMeta = {
        key: 'understanding',
        order: 1,
        name: '맞춤형화장품의 이해',
        dir: 'understanding',
        chapters: [{ key: 'ch1', title: '개요', file: '1.cosmetic-overview.md' }]
    };
    const mdByFile = { '1.cosmetic-overview.md': SAMPLE_MD_TABLE };
    const data = buildSubjectData(subjectMeta, mdByFile);
    assert.ok(Array.isArray(data.cards));
    assert.ok(Array.isArray(data.quizzes));
    assert.ok(Array.isArray(data.chapters));
    assert.ok(data.cards.length > 0, '카드가 추출되어야 함');
    assert.ok(data.quizzes.length > 0, '퀴즈가 추출되어야 함');
    assert.equal(data.chapters.length, 1, '챕터 1개');
});

test('buildSubjectData: 중복 퀴즈 제거', () => {
    // 동일한 question+answer를 가진 퀴즈가 여러 번 나오면 하나만 남음
    const dupMd = `# Test

## Section

| 용어 | 설명 |
| --- | --- |
| 항목A | 🔖기출 **답1** 입니다 |
| 항목B | 🔖기출 **답1** 입니다 |
`;
    const subjectMeta = {
        key: 'test', order: 1, name: '테스트', dir: 'test',
        chapters: [{ key: 'ch1', title: '섹션', file: 'test.md' }]
    };
    const data = buildSubjectData(subjectMeta, { 'test.md': dupMd });
    // question+answer가 동일한 퀴즈는 중복 제거됨
    const uniqueKeys = new Set(data.quizzes.map(q => `${q.question}_${q.answer}`));
    assert.equal(data.quizzes.length, uniqueKeys.size, '중복 퀴즈가 제거되어야 함');
});

test('buildSubjectData: filePathMode=md일 때 .md 경로 사용', () => {
    const subjectMeta = {
        key: 'understanding', order: 1, name: '맞춤형화장품의 이해', dir: 'understanding',
        chapters: [{ key: 'ch1', title: '개요', file: '1.cosmetic-overview.md' }]
    };
    const mdByFile = { '1.cosmetic-overview.md': SAMPLE_MD_TABLE };
    const data = buildSubjectData(subjectMeta, mdByFile, { filePathMode: 'md' });
    assert.ok(data.chapters[0].filePath.endsWith('.md'), 'filePathMode=md일 때 .md 확장자');
});

test('buildSubjectData: 빈 챕터 리스트', () => {
    const subjectMeta = {
        key: 'test', order: 1, name: '테스트', dir: 'test',
        chapters: []
    };
    const data = buildSubjectData(subjectMeta, {});
    assert.equal(data.cards.length, 0);
    assert.equal(data.quizzes.length, 0);
    assert.equal(data.chapters.length, 0);
});

test('buildSubjectData: 누락된 MD 파일은 에러', () => {
    const subjectMeta = {
        key: 'test', order: 1, name: '테스트', dir: 'test',
        chapters: [{ key: 'ch1', title: '개요', file: 'missing.md' }]
    };
    assert.throws(() => buildSubjectData(subjectMeta, {}), /Markdown source missing/);
});
