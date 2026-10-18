// tests/unit/ai-tools.test.js — AI 제작 지원 도구 유닛 테스트
// @spec AI-01,AI-02,AI-03,AI-04,AI-05,AI-06,AI-07,AI-08,AI-09,AI-10,AI-11,AI-12,AI-13
// llm_client dry-run·문제은행 파서·규칙 변형·검수 규칙·유사도 폴백을 고정한다.
// 실제 API 키 없이 전부 결정론적으로 동작해야 한다 (--dry-run 계약).

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
const qbank = require('../../tools/ai/lib/qbank.js');
const similarity = require('../../tools/ai/lib/similarity.js');
const llm = require('../../tools/ai/llm_client.js');
const { ruleVariants } = require('../../tools/ai/ai_distractors.js');
const { falseVariants } = require('../../tools/ai/ai_statements.js');
const { estimateDifficulty } = require('../../tools/ai/ai_tag.js');
const { lintQuestion, lintExplanation } = require('../../tools/ai/ai_lint.js');

// ---------- AI-01/AI-03: 문제은행 파서 ----------

const SAMPLE = `# 테스트 문제은행

### Q1. 옳은 것은?
① 첫번째
② 두번째

---

### Q2. 단답형 문항

---

### 정답

**Q1.**

> **정답: ②** [교재: L100](<../교재/law/표준형.md#L100>)
>
> **📖 교재 근거 ([교재: L100](<../교재/law/표준형.md#L100>)):**
> 인용문

**Q2.**

> **정답: 맞춤형화장품판매업** [교재: L50](<../교재/law/표준형.md#L50>)
>
> **허용 정답:** 맞춤형 화장품판매업, 맞춤형화장품 판매업
>
> **해설**: 판매업 정의 문항이다.
`;

test('AI-01: 문제은행 파서가 문항·유형·선지를 해석한다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbank-'));
    const f = join(dir, 'bank.md');
    writeFileSync(f, SAMPLE);
    const { questions, answers } = qbank.parseQuestionBank(f);
    rmSync(dir, { recursive: true, force: true });

    assert.equal(questions.length, 2);
    assert.equal(questions[0].type, 'choice');
    assert.equal(questions[0].options.length, 2);
    assert.equal(questions[1].type, 'short');

    const a1 = answers.get(1);
    assert.equal(a1.answer, '②');
    assert.equal(a1.answerNum, 2);
    assert.equal(a1.citations[0].lineNo, 100);
    assert.equal(a1.explain, null);           // 해설 없음 → ai:explain 대상
    const a2 = answers.get(2);
    assert.equal(a2.answer, '맞춤형화장품판매업');
    assert.deepEqual(a2.accepts, ['맞춤형 화장품판매업', '맞춤형화장품 판매업']);
    assert.ok(a2.explain);
});

// ---------- AI-02: llm_client dry-run 계약 ----------

test('AI-02: 키 부재 시 complete()가 API 호출 없이 dryRun을 반환한다', async () => {
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await llm.complete('테스트', { dryRun: true });
    assert.equal(res.dryRun, true);
    assert.equal(res.prompt, '테스트');
});

test('AI-02: provider 추상화 — 3사 등록·기본값 해석', () => {
    assert.ok(llm.PROVIDERS.openai && llm.PROVIDERS.anthropic && llm.PROVIDERS.gemini);
    process.env.AI_PROVIDER = 'anthropic';
    assert.equal(llm.providerName(), 'anthropic');
    assert.ok(llm.modelName());
    delete process.env.AI_PROVIDER;
});

// ---------- AI-04: 해설 프롬프트 ----------

test('AI-04: buildPrompt에 정답·근거 구절이 컨텍스트로 포함된다', () => {
    const { buildPrompt } = require('../../tools/ai/ai_explain.js');
    const p = buildPrompt(
        { stem: '옳은 것은?', options: [{ n: 2, text: '보기' }] },
        { answer: '②', accepts: [] },
        { label: '교재: L100', text: '근거 본문' });
    assert.ok(p.includes('옳은 것은?') && p.includes('②') && p.includes('근거 본문'));
});

// ---------- AI-06: 허용 정답 규칙 변형 ----------

test('AI-06: 공백·구두점 변형을 규칙으로 생성한다', () => {
    assert.ok(ruleVariants('맞춤형 화장품', []).includes('맞춤형화장품'));
    assert.ok(ruleVariants('금지·제한', []).some(v => v.includes(',') || v.includes(' ')));
    assert.equal(ruleVariants('단일어', []).length, 0);
});

// ---------- AI-07: 유사도 ----------

test('AI-07: 어휘 유사도 폴백 — 동일 텍스트 1, 무관 텍스트 낮음', () => {
    assert.equal(similarity.lexSim('화장품법 제1조 목적', '화장품법 제1조 목적'), 1);
    assert.ok(similarity.lexSim('화장품법 제1조 목적', '제조업 등록 결격사유') < 0.5);
});

test('AI-07: int8 벡터 번들 디코딩 + 코사인', () => {
    const q = new Int8Array([127, 0, 0, 0, 127]); // dim=2, 두 벡터
    const bundle = { dim: 2, ids: ['a', 'b'], scales: [1, 1], vectors: Buffer.from(q.buffer).toString('base64') };
    const { ids, vectors } = similarity.decodeVectorBundle(bundle);
    assert.equal(ids.length, 2);
    assert.equal(Math.round(similarity.cosine(vectors[0], vectors[1])), 0); // 직교
});

// ---------- AI-08: 진술 반전 ----------

test('AI-08: 수치·주체·극성 변형을 생성한다', () => {
    const vars = falseVariants('안전성 정보를 15일 이내에 식품의약품안전처장에게 보고해야 한다');
    assert.ok(vars.some(v => v.text.includes('30일')), '수치 치환');
    assert.ok(vars.some(v => v.text.includes('시·도지사')), '주체 교환');
    assert.ok(vars.some(v => v.text.includes('이내')), '극성 변형 여부 확인');
    const pol = falseVariants('사용이 허용된다');
    assert.ok(pol.some(v => v.text.includes('금지')));
});

// ---------- AI-09: 난이도 ----------

test('AI-09: 난이도 휴리스틱이 1~5 범위를 지킨다', () => {
    const easy = estimateDifficulty({ stem: '정의로 옳은 것은?', options: [{ n: 1, text: 'a' }], type: 'choice' }, { accepts: [] });
    const hard = estimateDifficulty({ stem: '옳지 않은 것은? 3년 15일 30개월', options: [{ n: 1, text: 'x'.repeat(80) }], type: 'short' }, { accepts: [] });
    assert.ok(easy >= 1 && easy <= 5 && hard >= 1 && hard <= 5);
    assert.ok(hard > easy);
});

// ---------- AI-10: 발문 검수 ----------

test('AI-10: 부정 발문·전부정답·인용 부재를 탐지한다', () => {
    const q = { num: 1, stem: '옳지 않은 것은?', options: [], type: 'short' };
    assert.ok(lintQuestion(q, null).some(i => i.startsWith('L1')));
    assert.ok(lintQuestion(q, null).some(i => i.startsWith('L6')));
    assert.ok(lintQuestion({ num: 2, stem: '모두 옳은 것은?', options: [], type: 'choice' }, { citations: [{ file: 'a.md', lineNo: 1 }] })
        .some(i => i.startsWith('L3')));
    assert.equal(lintQuestion({ num: 3, stem: '목적은?', options: [], type: 'short' },
        { answer: '보건향상', accepts: [], citations: [{ file: 'a.md', lineNo: 1 }] }).length, 0);
});

test('AI-10: 해설 감사 규칙 — 정답 모순·플레이스홀더·근거 부인을 탐지한다', () => {
    const q = { num: 1, stem: '옳은 것은?', options: [{ n: 1, text: 'a' }], type: 'single' };
    const base = { answer: '⑤', accepts: [], citations: [{ file: 'a.md', lineNo: 1 }] };
    // E1: 해설이 ③을 정답으로 단정 → 실제 정답 ⑤와 모순
    assert.ok(lintExplanation(q, { ...base, explain: '규정상 ③번이 정답입니다.' }).some(i => i.startsWith('E1')));
    // E1: 오답 선지 언급("①은 틀렸다")은 정답 단정이 아니므로 무시
    assert.equal(lintExplanation(q, { ...base, explain: '⑤번이 정답이며 ①은 근거에 미치지 못해 틀렸습니다.' })
        .filter(i => i.startsWith('E1')).length, 0);
    // E3: 플레이스홀더 / E4: 근거 부인
    assert.ok(lintExplanation(q, { ...base, explain: '(미생성 — DRY RUN)' }).some(i => i.startsWith('E3')));
    assert.ok(lintExplanation(q, { ...base, explain: '제시된 근거에는 관련 내용이 없어 정확한 이유를 알 수 없습니다.' })
        .some(i => i.startsWith('E4')));
    // 정상 해설은 지적 없음
    assert.equal(lintExplanation(q, { ...base, explain: '법 제1조는 국민 보건 향상을 목적으로 하므로 ⑤번이 정답입니다.' }).length, 0);
});

// ---------- AI-11/AI-12/AI-13: dry-run 스모크 (실행 가능·무키 동작) ----------

function runTool(script, args = []) {
    return execFileSync('node', [`tools/ai/${script}`, ...args], {
        cwd: ROOT, encoding: 'utf-8', timeout: 120000, env: { ...process.env, AI_API_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '' },
    });
}

test('AI-11/AI-13: ai:coverage가 무키로 커버리지 리포트를 생성한다', () => {
    const out = runTool('ai_coverage.js', ['--exam', 'cosmetic']);
    assert.match(out, /커버리지 리포트|미출제|커버/, '커버리지 산출 출력');
});

test('AI-12: ai:stale --file 지정 시 인용 문항 재검증 목록을 만든다', () => {
    const out = runTool('ai_stale_scan.js', ['--exam', 'cosmetic', '--file',
        'content/exams/cosmetic/참조자료/ref_md/과목1/화장품법(법률)(제21525호)(20261008)/화장품법(법률)(제21525호)(20261008).md']);
    assert.match(out, /재검증 대기|ref_md/, '스캔 결과 출력');
});

test('AI-05: ai:draft --dry-run이 교재 청크를 스캔해 초안 골격을 출력한다', () => {
    const out = runTool('ai_draft_questions.js', ['--exam', 'cosmetic', '--subject', 'law',
        '--lines', '1-200', '--count', '2', '--dry-run']);
    assert.match(out, /청크|draft/, '청크 스캔·초안 경로 출력');
});

test('AI-04: ai:explain --dry-run이 키 없이 초안 골격을 출력한다', () => {
    const out = runTool('ai_explain.js', ['--exam', 'cosmetic', '--limit', '2', '--dry-run']);
    assert.match(out, /해설 누락|초안/, '스캔·초안 요약 출력');
});

test('AI-01/AI-04: ai:apply가 초안 해설을 정답 블록 끝에 삽입하고 중복·플레이스홀더를 스킵한다', () => {
    const { parseExplainDraft, insertExplain } = require('../../tools/ai/ai_apply.js');
    const dir = mkdtempSync(join(tmpdir(), 'apply-'));
    const draft = join(dir, 'd.md');
    writeFileSync(draft, '## Q1\n\n> **해설**: 삽입 대상 해설\n\n## Q2\n\n> **해설**: (미생성 — DRY RUN)\n');
    const entries = parseExplainDraft(draft);
    assert.equal(entries.size, 1);                       // 플레이스홀더 제외
    assert.equal(entries.get(1), '삽입 대상 해설');

    const bank = '**Q1.**\n\n> **정답: ②** [교재: L1](<a.md#L1>)\n>\n> **📖 근거:**\n> 인용\n\n**Q2.**\n\n> **정답: 1**\n';
    const next = insertExplain(bank, 1, '삽입 대상 해설');
    assert.ok(next.includes('> **해설**: 삽입 대상 해설'));
    assert.ok(next.indexOf('해설') > next.indexOf('인용')); // 블록 끝에 삽입
    assert.equal(insertExplain(next, 1, '재삽입'), null);  // 기존 해설 → 스킵
    assert.equal(insertExplain(bank, 99, 'x'), null);      // 블록 없음 → 스킵
    rmSync(dir, { recursive: true, force: true });
});
