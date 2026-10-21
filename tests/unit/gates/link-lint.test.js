// tests/unit/link-lint.test.js — check_link_lint 자체 회귀 테스트
// @spec RR-13
// 게이트가 합성 픽스처의 각 규칙(LL-01~08)을 실제로 탐지하는지 확인.
// 파서·포맷터 변경으로 체커가 무력화되는 것을 방지한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { ExamViewer } from '../../../src/exam-viewer.js';
import { formatSectionContentForReader } from '../../../src/reader-format.js';

const require = createRequire(import.meta.url);
const { lintHtml, lintBundleValue, findLine } = require('../../../tools/check/check_link_lint.js');

const DOC_FILE = 'content/exams/cosmetic/문제은행/x.md';
const DOCS_FILE = 'content/exams/cosmetic/docs/x.md';
const TEXTBOOK_FILE = 'content/exams/cosmetic/교재/law/x.md';

function docLint(md, file = DOC_FILE) {
    const out = [];
    lintHtml(file, ExamViewer._mdToHtml(md, file), 'doc', { source: md, ExamViewer, out });
    return out;
}
function readerLint(md) {
    const out = [];
    lintHtml(TEXTBOOK_FILE, formatSectionContentForReader(md, TEXTBOOK_FILE), 'reader', { source: md, ExamViewer, out });
    return out;
}
const rules = (issues) => issues.map(i => i.rule);

// ==================== 정상 케이스 ====================

test('정상 문서 — 인터셉트 대상 링크는 위반 없음', () => {
    const issues = docLint([
        '[교재: L237](../교재/law/x.md#L237)',
        '[요약](../참조자료/과목1/1.cosmetic-law.md)',
        '[과목 이동](subj:law#ch01)',
        '[섹션](#-지도)',
        '[법령 원문](https://www.law.go.kr/법령/화장품법)'
    ].join('\n'));
    assert.deepEqual(rules(issues), []);
});

test('리더 표면 — 정상 변환된 참조 링크는 위반 없음', () => {
    const issues = readerLint('> 📚 [요약](../참조자료/과목1/1.cosmetic-law.md) · [법](<../참조자료/ref_md/과목1/화장품법(법률)(제1호)/x.md#L5>)');
    assert.deepEqual(rules(issues), []);
});

// ==================== 규칙별 탐지 ====================

test('LL-01: doc 표면의 미처리 상대경로 href 탐지', () => {
    const issues = docLint('[파일](./unhandled/path.txt)');
    assert.ok(rules(issues).includes('LL-01'));
});

test('LL-01: doc 표면의 doc: 링크는 docs 계열 파일만 허용', () => {
    assert.ok(rules(docLint('[매뉴얼](doc:user_manual)', DOC_FILE)).includes('LL-01'));
    assert.deepEqual(rules(docLint('[매뉴얼](doc:user_manual)', DOCS_FILE)), []);
});

test('LL-02/03: 절단된 &lt; href와 좌표 라벨 탐지', () => {
    const html = '<p><a href="&lt;../x.md">x</a><a href="#frag">L237</a></p>';
    const out = [];
    lintHtml(DOC_FILE, html, 'doc', { ExamViewer, out });
    assert.ok(rules(out).includes('LL-02'), '절단 href');
    assert.ok(rules(out).includes('LL-03'), '좌표 라벨');
});

test('LL-03 회귀 방지: .md 링크 라벨은 표시명 정리 후 평가 (오탐 없음)', () => {
    // [교재: L237](...md#L237)는 뷰어가 "교재 원문"으로 재표기 — 원시 라벨이어도 위반 아님
    const issues = docLint('[교재: L237](../교재/law/x.md#L237)');
    assert.ok(!rules(issues).includes('LL-03'), `라벨 정규화 후 오탐 없어야 함: ${JSON.stringify(issues)}`);
});

test('LL-04: allowlist 외 외부 링크 탐지, 공식 도메인은 통과', () => {
    assert.ok(rules(docLint('[x](https://evil.example.com/y)')).includes('LL-04'));
    assert.deepEqual(rules(docLint('[x](https://www.law.go.kr/법령/x)')), []);
});

test('LL-05: 본문 텍스트의 경로·좌표 조각 누출 탐지', () => {
    assert.ok(rules(docLint('근거: 교재: L237 참고')).includes('LL-05'), '좌표 텍스트');
    assert.ok(rules(docLint('파일 위치: ../참조자료/x')).includes('LL-05'), '상대경로');
    assert.ok(rules(docLint('문서: 참조자료/과목1/1.cosmetic-law.md')).includes('LL-05'), '파일 경로');
});

test('LL-05 예외: 코드블록·인라인 코드 내 경로 예시는 탐지하지 않음', () => {
    const issues = docLint('```\n참조자료/과목1/1.cosmetic-law.md\n```\n`../참조자료/x.md` 경로 구조');
    assert.ok(!rules(issues).includes('LL-05'), `코드 블록 오탐: ${JSON.stringify(issues)}`);
});

test('LL-06: 최종 확인 QA 스탬프는 모든 표면에서 탐지', () => {
    // 뷰어가 스탬프를 제거하므로, 잔존 시나리오는 렌더된 HTML에 직접 주입해 검증
    const out = [];
    lintHtml(DOC_FILE, '<p>📌 출처: 화장품법 | <strong>최종 확인</strong>: 2026. 9. 18.</p>', 'doc', { ExamViewer, out });
    assert.ok(rules(out).includes('LL-06'));
    // 실제 파이프라인에서는 뷰어가 스탬프를 제거해 통과
    assert.deepEqual(rules(docLint('> 📌 출처: 화장품법 | **최종 확인**: 2026. 9. 18.')), []);
    assert.deepEqual(rules(docLint('최신 고시로 최종 확인하세요.')), [], '권고 문구(콜론 없음)는 오탐 아님');
});

test('LL-07: 스테이징 경로 href 탐지', () => {
    const issues = docLint('[x](../참조자료/ref_md_v2/doc.md)');
    assert.ok(rules(issues).includes('LL-07'));
});

test('LL-08: 위험 스킴 href 탐지', () => {
    const out = [];
    lintHtml(DOC_FILE, '<a href="javascript:alert(1)">x</a>', 'doc', { ExamViewer, out });
    assert.ok(rules(out).includes('LL-08'));
});

test('LL-09: title/alt/aria-label 속성의 경로·파일명 노출 탐지', () => {
    const out = [];
    // lawExtLink 툴팁 이력 — 파일명이 title에 남는 패턴
    lintHtml(DOC_FILE, '<a title="화장품법(법률)(제1호).md — law.go.kr 공식 통합본">x</a>', 'doc', { ExamViewer, out });
    assert.ok(rules(out).includes('LL-09'), '파일명 title 노출');
    const out2 = [];
    lintHtml(DOC_FILE, '<a title="화장품법 — law.go.kr 공식 통합본 (새 탭)" aria-label="원문 보기">x</a>', 'doc', { ExamViewer, out: out2 });
    assert.ok(!rules(out2).includes('LL-09'), '정리된 title은 통과');
});

// ==================== 라인 번호·번들 ====================

test('진단에 소스 라인 번호가 포함된다', () => {
    const md = '첫 줄\n\n[파일](./unhandled/path.txt)\n';
    const issues = docLint(md);
    const hit = issues.find(i => i.rule === 'LL-01');
    assert.ok(hit && hit.line === 3, `라인 3 기대 — 실제: ${hit && hit.line}`);
    assert.equal(findLine('a\nb\nc', 'c'), 3);
    assert.equal(findLine('a\nb', 'zzz'), 0);
});

test('번들 평문 필드: 좌표 라벨·스탬프 잔재 탐지', () => {
    const out = [];
    lintBundleValue('data/exams/x/drills/d.js', '📖 교재: L1247 (한선·땀샘)', { ExamViewer, out });
    assert.ok(rules(out).includes('LL-05'));
    const out2 = [];
    lintBundleValue('data/exams/x/drills/d.js', '📖 교재 근거 (출처: 과목1 문제은행 Q1)', { ExamViewer, out: out2 });
    assert.deepEqual(out2, [], '정리된 citation은 통과');
});

test('번들 md 문자열은 렌더 경로로 위임된다', () => {
    const out = [];
    lintBundleValue('data/exams/x/exams_md/q.js', '## 해설\n\n[교재: L1](../교재/law/x.md#L1)', { ExamViewer, out });
    assert.deepEqual(out, [], '인터셉트 대상 링크는 통과');
});
