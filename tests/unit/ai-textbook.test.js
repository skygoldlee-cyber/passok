// tests/unit/ai-textbook.test.js — ai:textbook 유닛 테스트
// @spec AI-24,AI-01,AI-03,CS-11
// 참조자료→교재 본문 초안 생성기 — 조문 경계 청킹·조호 자기검증·dry-run 계약을 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { findRefDocs, chunkRefDoc, invalidArticleRefs, buildPrompt, assembleDraftLines } =
    require('../../tools/ai/ai_textbook.js');

// ---------- chunkRefDoc — 조문 경계 청킹 ----------

function tmpDoc(text) {
    const dir = mkdtempSync(join(tmpdir(), 'aitb-'));
    const p = join(dir, 'doc.md');
    writeFileSync(p, text, 'utf-8');
    return { p, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const LAW_DOC = `# 문서 제목
제1장 총칙
제1조(목적) 이 법은 목적을 규정한다.
제2조(정의) 이 법의 용어 정의.
가. 첫째 용어
나. 둘째 용어
제3조(적용) 적용 범위 규정.
`;

test('chunkRefDoc: 조문 경계로 분할 — 헤딩 없는 평문도 청크화', () => {
    const { p, cleanup } = tmpDoc(LAW_DOC);
    try {
        const chunks = chunkRefDoc(p, 100);
        assert.ok(chunks.length >= 1);
        // 전체 라인이 누락 없이 커버됨
        const cover = chunks.map(c => `${c.startLine}-${c.endLine}`);
        assert.equal(chunks[0].startLine, 1);
        assert.equal(chunks[chunks.length - 1].endLine, 8);
        chunks.forEach(c => assert.ok(c.text.length > 0));
        void cover;
    } finally { cleanup(); }
});

test('chunkRefDoc: maxLines 초과 시 조문 경계에서 분리', () => {
    const big = Array.from({ length: 300 }, (_, i) =>
        i % 100 === 0 ? `제${i / 100 + 1}조(조항${i / 100 + 1}) 본문` : `본문 라인 ${i}`).join('\n');
    const { p, cleanup } = tmpDoc(big);
    try {
        const chunks = chunkRefDoc(p, 120);
        assert.ok(chunks.length >= 2, 'maxLines 초과 시 다수 청크');
        chunks.forEach(c => assert.match(c.heading, /제\d+조|문서|라인/));
    } finally { cleanup(); }
});

test('chunkRefDoc: 조문 없는 문서는 고정폭 창 폴백', () => {
    const table = Array.from({ length: 150 }, (_, i) => `| 항목${i} | 값 |`).join('\n');
    const { p, cleanup } = tmpDoc(table);
    try {
        const chunks = chunkRefDoc(p, 100);
        assert.equal(chunks.length, 2);
        assert.equal(chunks[0].endLine, 100);
        assert.equal(chunks[1].endLine, 150);
    } finally { cleanup(); }
});

// ---------- invalidArticleRefs — 조호 자기검증 (AI-03) ----------

test('invalidArticleRefs: 원문에 없는 조호만 폐기 후보', () => {
    const chunk = '제1조(목적) 내용. 제2조(정의) 내용.';
    assert.deepEqual(invalidArticleRefs('제1조와 제3조에 따르면', chunk), ['제3조']);
    assert.deepEqual(invalidArticleRefs('제1조에 따르면', chunk), []);
    assert.deepEqual(invalidArticleRefs('조호 언급 없음', chunk), []);
});

// ---------- buildPrompt·assembleDraftLines — 초안 조립 ----------

test('buildPrompt: 라인 번호 부여 원문 + 작성 지시', () => {
    const prompt = buildPrompt({ heading: '제1조', startLine: 10, endLine: 12, text: 'a\nb' });
    assert.ok(prompt.includes('L10 | a'));
    assert.ok(prompt.includes('L11 | b'));
    assert.ok(prompt.includes('교재 본문'));
});

test('assembleDraftLines: 편입용 출처 블록이 CS-11 형식으로 첨부', () => {
    const target = { id: 'lossadj', contentRoot: 'content/exams/lossadj' };
    const doc = { docName: '상법(법률)(제21044호)(20260910)', mdRel: '참조자료/ref_md/과목1/상법(법률)(제21044호)(20260910)/상법(법률)(제21044호)(20260910).md' };
    const lines = assembleDraftLines({
        target, doc,
        chunks: [{ heading: '제1조', startLine: 1, endLine: 5 }],
        results: ['### 제1조(목적)\n본문 초안'],
    });
    const text = lines.join('\n');
    assert.ok(text.includes('## 편입용 블록'), '편입용 블록 존재');
    assert.ok(text.includes('📌 **출처**'));
    assert.ok(text.includes('**원문 보기**'));
    assert.ok(text.includes('../참조자료/ref_md/과목1/상법%28법률%29'), '인코딩 링크 규약');
    assert.ok(text.includes('content/ 편입') || text.includes('슬롯'), '리뷰 경유 안내');
});

// ---------- dry-run 계약 (AI-02) — 키 없이 실행 ----------

function runTool(args = []) {
    return execFileSync('node', ['tools/ai/ai_textbook.js', ...args], {
        cwd: ROOT, encoding: 'utf-8', timeout: 60000,
        env: { ...process.env, AI_API_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '' },
    });
}

test('AI-24/AI-02: 무키 dry-run으로 lossadj 참조자료 초안 골격을 생성한다', () => {
    const out = runTool(['--exam', 'lossadj', '--doc', '상법', '--dry-run']);
    assert.match(out, /청크 \d+개 → tmp[/\\]ai_drafts[/\\]textbook_/, '초안 산출 출력');
});

test('AI-24: 미존재 문서는 사용 가능 목록과 함께 실패한다', () => {
    try {
        runTool(['--exam', 'lossadj', '--doc', '없는문서XYZ']);
        assert.fail('실패해야 함');
    } catch (e) {
        assert.match(String(e.stderr || e.message), /ref 문서 없음|사용 가능/);
    }
});

test('findRefDocs: 실제 저장소의 ref 문서 해석', () => {
    const { getExamTargets } = require('../../tools/build/exam_targets.js');
    const lossadj = getExamTargets(ROOT).find(t => t.id === 'lossadj');
    const docs = findRefDocs(lossadj);
    assert.ok(docs.length >= 1, 'lossadj ref 문서 존재');
    assert.ok(docs.every(d => /^과목\d+$/.test(d.subjectDir)));
    assert.ok(docs.every(d => d.mdRel.startsWith('참조자료/ref_md/')));
});
