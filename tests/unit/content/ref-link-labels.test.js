// tests/unit/ref-link-labels.test.js
// @spec RR-13
// 참조 링크의 사용자 표시 정리를 검증 — 내부 좌표(L####)·파일명 라벨은
// 개발자 정보이므로 사용자에게는 표시명으로 변환되어야 한다.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const _tmpDirs = [];
after(() => { for (const d of _tmpDirs) rmSync(d, { recursive: true, force: true }); });
function tmpDir(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); _tmpDirs.push(d); return d; }
import { ExamViewer } from '../../../src/reader/exam-viewer.js';
import { refDocDisplayName } from '../../../src/pdf-registry.js';
import { formatSectionContentForReader } from '../../../src/reader/reader-format.js';
import { slugifyHeading, scrollToHeadingSlug } from '../../../src/doc-overlay.js';

const require = createRequire(import.meta.url);
const examsPlugin = require('../../../tools/build/plugins/exams.plugin.js');

// ==================== refDocDisplayName ====================

test('refDocDisplayName: 등록된 과목별 문서 → references.json 표시명', () => {
    assert.equal(refDocDisplayName('1.cosmetic-law.md'), '화장품법 통합 정리');
});

test('refDocDisplayName: 확장자 무시 — md ↔ pdf 동일 문서 매칭', () => {
    // referenceLaw의 file은 .pdf지만 ref_md의 .md 라벨에도 매칭되어야 함
    const name = refDocDisplayName('화장품법(법률)(제21525호)(20261008).md');
    assert.equal(name, '화장품법');
});

test('refDocDisplayName: 미등록 파일 → 빈 문자열', () => {
    assert.equal(refDocDisplayName('nonexistent-doc.md'), '');
    assert.equal(refDocDisplayName(''), '');
});

// ==================== ExamViewer._friendlyLinkLabel ====================

test('_friendlyLinkLabel: "교재: L237" → "교재 원문"', () => {
    assert.equal(ExamViewer._friendlyLinkLabel('교재: L237', 'x.md'), '교재 원문');
});

test('_friendlyLinkLabel: 복수 좌표 "교재: L1162, L1196" → "교재 원문"', () => {
    assert.equal(ExamViewer._friendlyLinkLabel('교재: L1162, L1196', 'x.md'), '교재 원문');
});

test('_friendlyLinkLabel: "문서명: L495" → 문서명만 보존', () => {
    assert.equal(ExamViewer._friendlyLinkLabel('화장품법 시행규칙: L495', 'x.md'), '화장품법 시행규칙');
});

test('_friendlyLinkLabel: 베어 좌표 "L228" → "원문 보기"', () => {
    assert.equal(ExamViewer._friendlyLinkLabel('L228', 'x.md'), '원문 보기');
});

test('_friendlyLinkLabel: .md 파일명 라벨 → 등록 표시명', () => {
    assert.equal(ExamViewer._friendlyLinkLabel('1.cosmetic-law.md', 'x.md'), '화장품법 통합 정리');
});

test('_friendlyLinkLabel: .md 파일명 미등록 → 괄호·확장자 제거', () => {
    const out = ExamViewer._friendlyLinkLabel('신규문서(제1호)(20260101).md', 'x.md');
    assert.equal(out, '신규문서');
});

test('_friendlyLinkLabel: 일반 라벨은 변경 없음', () => {
    assert.equal(ExamViewer._friendlyLinkLabel('4과목 1챕터 맞춤형화장품 개요', 'x.md'), '4과목 1챕터 맞춤형화장품 개요');
});

// ==================== reader-format: 최종 확인 스탬프 제거 ====================

test('최종 확인 스탬프: 📌출처 라인 말미에서 제거', () => {
    const md = '> 📌 **출처**: 화장품법 제1조| **시행일**: 2026. 10. 8.| **최종 확인**: 2026. 8. 29.';
    const html = formatSectionContentForReader(md, 'content/exams/cosmetic/교재/law/x.md');
    assert.ok(!html.includes('최종 확인'), '최종 확인 스탬프 제거됨');
    assert.ok(html.includes('시행일'), '시행일은 보존');
    assert.ok(html.includes('2026. 8. 29') === false, '스탬프 날짜도 제거');
});

// ==================== reader-format: 과목별 참조 MD 링크 ====================

test('참조자료 과목별 md 링크: 파일명 라벨 → 앱 내 뷰어 링크 + 표시명', () => {
    const md = '> 📚 **참조자료**: [1.cosmetic-law.md](../참조자료/과목1/1.cosmetic-law.md)';
    const html = formatSectionContentForReader(md, 'content/exams/cosmetic/교재/law/x.md');
    assert.ok(html.includes('data-ref-md="content/exams/cosmetic/참조자료/과목1/1.cosmetic-law.md"'),
        '앱 내 뷰어 경로로 변환');
    assert.ok(html.includes('화장품법 통합 정리'), '파일명 대신 등록 표시명');
    assert.ok(!html.includes('href="../참조자료/과목1/1.cosmetic-law.md"'), '원시 상대경로 제거(404 방지)');
});

test('참조자료 과목별 md 링크: ref_md·원료 링크는 본 패턴에 영향받지 않음', () => {
    const md = '> [화장품법(법률)(제21525호)(20261008).md](../참조자료/ref_md/과목1/화장품법%28법률%29%28제21525호%29%2820261008%29/화장품법%28법률%29%28제21525호%29%2820261008%29.md)';
    const html = formatSectionContentForReader(md, 'content/exams/cosmetic/교재/law/x.md');
    assert.ok(html.includes('data-ref-html="'), 'ref_md 링크는 기존 HTML 뷰어 경로 유지');
});

test('원료 DB md 링크: .md 접미 라벨 → 등록 표시명/접미 제거 (파일명 노출 방지)', () => {
    const md = '• [사용가능원료.md](../참조자료/원료/approved_ingredients.md)';
    const html = formatSectionContentForReader(md, 'content/exams/cosmetic/교재/manufacturing/x.md');
    assert.ok(html.includes('data-ref-html="'), '앱 내 HTML 뷰어 링크로 변환');
    assert.ok(!/사용가능원료\.md/.test(html), '.md 접미 라벨 노출 금지');
    assert.ok(html.includes('승인 원료 목록'), '등록 표시명 사용');
});

// ==================== exams.plugin: 해설 좌표 라벨 정리 ====================

test('exams.plugin: 해설의 "(교재: L237)" 좌표 라벨이 번들 explain에서 제거된다', () => {
    const dir = tmpDir('exam-plugin-');
    const file = join(dir, 'bank.md');
    writeFileSync(file, [
        '### Q1. [객관식] 가장 옳은 것은?',
        '① 첫째', '② 둘째', '③ 셋째', '④ 넷째',
        '',
        '### Q2. [객관식] 가장 옳지 않은 것은?',
        '① 가', '② 나', '③ 다', '④ 라',
        '',
        '## 정답 및 해설',
        '',
        '**Q1.**',
        '',
        '> **정답: ②** [교재: L920](<../교재/law/1과목_화장품법의이해_표준형.md#L920>)',
        '>',
        '> **📖 교재 근거 ([교재: L920](<../교재/law/1과목_화장품법의이해_표준형.md#L920>)):**',
        '> 근거 본문',
        '',
        '**Q2.**',
        '',
        '> **정답: ③** [화장품법 시행규칙: L495](<../참조자료/ref_md/과목1/x/x.md#L495>)',
        '>',
        '> **📖 법령 근거 ([화장품법 시행규칙: L495](<../참조자료/ref_md/과목1/x/x.md#L495>)):**',
        '> 규칙 본문'
    ].join('\n'), 'utf-8');
    const exam = examsPlugin.parseExamFile(file, 'subject1', '테스트 문제은행');
    const q1 = exam.questions.find(q => q.id === 'subject1_q1');
    const q2 = exam.questions.find(q => q.id === 'subject1_q2');
    assert.ok(q1 && q2, '문항 파싱');
    assert.ok(!/L\d+/.test(q1.explanation), `교재 좌표 제거 — 실제: ${q1.explanation}`);
    assert.ok(q1.explanation.includes('교재 근거'), '근거 표기는 보존');
    assert.ok(!/L495/.test(q2.explanation), '참조자료 좌표 제거');
    assert.ok(q2.explanation.includes('화장품법 시행규칙'), '문서명은 보존');
});

// ==================== ExamViewer._titleFromPath ====================

test('_titleFromPath: 참조자료 문서 파일명 → 등록 표시명 (파일명 노출 방지)', () => {
    assert.equal(
        ExamViewer._titleFromPath('exams/cosmetic/참조자료/과목1/1.cosmetic-law.md'),
        '화장품법 통합 정리'
    );
});

test('_titleFromPath: 미등록 파일 → 파일명 정리 (확장자·밑줄 제거)', () => {
    assert.equal(
        ExamViewer._titleFromPath('exams/cosmetic/참조자료/과목9/신규_정리_문서.md'),
        '신규 정리 문서'
    );
});

// ==================== doc-overlay: slugifyHeading / 앵커 스크롤 ====================

test('slugifyHeading: 이모지+공백 헤딩 → GitHub 스타일 slug', () => {
    // 콘텐츠 TOC 링크 '#-전체-지도'의 대상 헤딩 '🗺️ 전체 지도'
    assert.equal(slugifyHeading('🗺️ 전체 지도'), '-전체-지도');
});

test('slugifyHeading: 절 번호+괄호 헤딩 → slug', () => {
    // user_manual 링크 '#85--통합-검색-팔레트-ctrlk'의 대상 '8.5. 🔍 통합 검색 팔레트 (Ctrl+K)'
    assert.equal(slugifyHeading('8.5. 🔍 통합 검색 팔레트 (Ctrl+K)'), '85--통합-검색-팔레트-ctrlk');
});

test('scrollToHeadingSlug: 헤딩 텍스트 slug 매칭으로 스크롤', () => {
    const article = {
        calls: [],
        querySelector() { return null; },
        querySelectorAll() {
            const h = { textContent: '🗺️ 전체 지도', scrollIntoView: () => { article.calls.push('scroll'); } };
            return [h];
        }
    };
    assert.equal(scrollToHeadingSlug(article, '#-전체-지도'), true);
    assert.equal(article.calls.length, 1);
    assert.equal(scrollToHeadingSlug(article, '#없는-헤딩'), false);
});

// ==================== markdown-parser: <url> 문법 (괄호 파일명) ====================

test('<url> 링크: 괄호 포함 ref_md 경로가 잘리지 않고 전체 href로 보존', () => {
    const html = ExamViewer._mdToHtml(
        '> [화장품법 시행규칙: L495](<../참조자료/ref_md/과목1/화장품법 시행규칙(총리령)(제02109호)(20260402)/화장품법 시행규칙(총리령)(제02109호)(20260402).md#L495>)',
        'exams/cosmetic/문제은행/x.md'
    );
    assert.ok(html.includes('href="../참조자료/ref_md/과목1/화장품법 시행규칙(총리령)(제02109호)(20260402)/화장품법 시행규칙(총리령)(제02109호)(20260402).md#L495"'),
        '전체 경로가 href로 보존 — exam-viewer의 .md 인터셉트 대상');
    assert.ok(!html.includes('&lt;'), '잘린 잔여 태그 없음');
    assert.ok(!/href="[^"]*\.md#L495"\)\S/.test(html), 'URL 잔여분이 본문 텍스트로 새지 않음');
});

test('<url> 링크: 괄호 없는 교재 경로도 정상 변환', () => {
    const html = ExamViewer._mdToHtml(
        '> [교재: L237](<../교재/law/1과목_화장품법의이해_표준형.md#L237>)',
        'exams/cosmetic/문제은행/x.md'
    );
    assert.ok(html.includes('href="../교재/law/1과목_화장품법의이해_표준형.md#L237"'));
});
