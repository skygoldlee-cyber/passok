// tests/unit/ai-tools.test.js — AI 제작 지원 도구 유닛 테스트
// @spec AI-01,AI-02,AI-03,AI-04,AI-05,AI-06,AI-07,AI-08,AI-09,AI-10,AI-11,AI-12,AI-13,AI-14,AI-15,AI-16,AI-17,AI-18,AI-19,AI-20,AI-21,AI-22
// llm_client dry-run·문제은행 파서·규칙 변형·검수 규칙·유사도 폴백을 고정한다.
// 실제 API 키 없이 전부 결정론적으로 동작해야 한다 (--dry-run 계약).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
const { getExamTargets } = require('../../tools/build/exam_targets.js');

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

test('AI-04: evidenceFor — 인용 없음·링크 미해석 시 null (비근거 생성 스킵 판정)', () => {
    const { evidenceFor } = require('../../tools/ai/ai_explain.js');
    const dir = mkdtempSync(join(tmpdir(), 'explain-ev-'));
    mkdirSync(join(dir, '문제은행'));
    mkdirSync(join(dir, '교재'));
    writeFileSync(join(dir, '교재', 'book.md'), '라인1\n라인2 — 근거 본문\n라인3\n');
    const qbankPath = join(dir, '문제은행', 'bank.md');

    // 인용 자체가 없음 → null
    assert.equal(evidenceFor(qbankPath, { answer: '①', accepts: [], citations: [] }), null);
    // 인용은 있으나 대상 파일 부재 → null
    assert.equal(evidenceFor(qbankPath, {
        answer: '①', accepts: [],
        citations: [{ label: '교재: L1', line: 1, file: '../교재/none.md', lineNo: 1 }],
    }), null);
    // 정상 인용 → 근거 구절 반환
    const ev = evidenceFor(qbankPath, {
        answer: '①', accepts: [],
        citations: [{ label: '교재: L2', line: 2, file: '../교재/book.md', lineNo: 2 }],
    });
    assert.equal(ev.label, '교재: L2');
    assert.ok(ev.text.includes('근거 본문'));
    rmSync(dir, { recursive: true, force: true });
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
    const upgraded = insertExplain(next, 1, '보강 해설', true); // --replace → 교체
    assert.ok(upgraded.includes('> **해설**: 보강 해설'));
    assert.ok(!upgraded.includes('삽입 대상 해설'));
    assert.equal(insertExplain(bank, 99, 'x'), null);      // 블록 없음 → 스킵
    rmSync(dir, { recursive: true, force: true });
});

// ---------- AI-14/AI-15: 진술 피드백 ----------

test('AI-14: ai:stmtfb가 combo 드릴에서 sid 고유 진술을 수집하고 프롬프트에 진위·모문항 해설을 담는다', () => {
    const { collectStatements, buildPrompt } = require('../../tools/ai/ai_stmt_feedback.js');
    const cosmetic = getExamTargets(ROOT).find(t => t.id === 'cosmetic');
    const bundles = collectStatements(cosmetic);
    const subj1 = bundles.get('subject1');
    assert.ok(subj1 && subj1.size > 0, 'combo_subject1 진술 수집');
    const [sid, s] = subj1.entries().next().value;
    assert.ok(sid.includes('_st_') && typeof s.text === 'string' && typeof s.truth === 'boolean');
    const prompt = buildPrompt(s, s.parent);
    assert.match(prompt, /\[진술\]/);
    assert.match(prompt, /\[실제 진위\] (참|거짓)/);
});

test('AI-15: parseStmtDrafts가 sid→해설을 추출하고 플레이스홀더를 제외한다', () => {
    const { parseStmtDrafts } = require('../../tools/ai/ai_stmt_feedback.js');
    const dir = join(ROOT, 'tmp', 'ai_drafts');
    mkdirSync(dir, { recursive: true });
    const fp = join(dir, 'stmtfb_testexam_subjectX.md');
    writeFileSync(fp, '## sid aa_st_01\n\n> **진술해설**: 거짓 — 수치 바꿈 함정\n\n## sid aa_st_02\n\n> **진술해설**: (미생성 — DRY RUN)\n');
    try {
        const map = parseStmtDrafts().get('testexam');
        assert.ok(map && map.get('aa_st_01') === '거짓 — 수치 바꿈 함정');
        assert.ok(!map.has('aa_st_02'));
    } finally { rmSync(fp, { force: true }); }
});

test('AI-14: ai:stmtfb --dry-run이 무키로 초안 골격을 출력한다', () => {
    const out = runTool('ai_stmt_feedback.js', ['--exam', 'cosmetic', '--limit', '2', '--dry-run']);
    assert.match(out, /진술|초안/, '스캔·초안 요약 출력');
});

test('AI-05: parseQuestionDraft가 ### Q/정답/근거 라인을 추출하고 폐기 후보 청크를 제외한다', () => {
    const { parseQuestionDraft } = require('../../tools/ai/ai_apply.js');
    const dir = mkdtempSync(join(tmpdir(), 'qdraft-'));
    try {
        const fp = join(dir, 'draft_test.md');
        writeFileSync(fp, [
            '# 문제 초안 — 교재 (L1-100)', '',
            '## 정상 섹션 (L1~L10)', '',
            '### Q1. 개인정보 수집 요건으로 옳은 것은?',
            '① 동의 받은 경우',
            '② 아무 때나 가능',
            '',
            '**Q1답**',
            '> **정답: ①**',
            '> **근거 라인: L1736-L1738**',
            '> **해설**: 동의 시 수집 가능하다.',
            '',
            '## 폐기 청크 (L20~L30)', '',
            '> ⚠️ [폐기 후보] 인용 라인 범위 초과: L9999', '',
            '### Q9. 제시된 청크 발문',
            '**Q9답**',
            '> **정답: ②**',
            '> **근거 라인: L9999**',
            '> **해설**: 근거 없음.',
        ].join('\n'));
        const qs = parseQuestionDraft(fp);
        assert.equal(qs.length, 1, '폐기 청크 제외 + 정상 1건');
        assert.equal(qs[0].lo, 1736);
        assert.equal(qs[0].hi, 1738);
        assert.equal(qs[0].answer, '①');
        assert.deepEqual(qs[0].options, ['① 동의 받은 경우', '② 아무 때나 가능']);
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('AI-16: loadStats가 백업 JSON의 statement_stats를 해석하고 순수 맵도 허용한다', () => {
    const { loadStats, isAnomalous } = require('../../tools/ai/ai_stmt_feedback.js');
    const dir = mkdtempSync(join(tmpdir(), 'stmtstats-'));
    try {
        // 백업 포맷: 시험 스코프 키 + JSON 문자열 값
        const bak = join(dir, 'cosmetic_backup.json');
        writeFileSync(bak, JSON.stringify({ 'cosmetic:statement_stats': JSON.stringify({ aa_st_1: { j: 8, w: 7 } }) }));
        const s1 = loadStats(bak);
        assert.equal(s1.aa_st_1.w, 7);
        assert.ok(isAnomalous(s1.aa_st_1), 'j≥5·w/j≥0.8 → 이상 의심');
        assert.ok(!isAnomalous({ j: 3, w: 3 }), '표본 부족은 이상 아님');
        // 순수 {sid:{...}} 맵
        const plain = join(dir, 'stats.json');
        writeFileSync(plain, JSON.stringify({ bb_st_2: { j: 2, w: 1 } }));
        assert.equal(loadStats(plain).bb_st_2.w, 1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('AI-17: mergePatch — 빈 @insert 교체·기존 서사 보존·신규 슬롯 추가', () => {
    const { mergePatch, wrapBlock } = require('../../tools/ai/ai_story.js');
    const dir = mkdtempSync(join(tmpdir(), 'story-'));
    try {
        const fp = join(dir, 'subj_서사.md');
        writeFileSync(fp, [
            '<!-- @insert slot="s01" story -->',
            '', '기존 서사 내용', '', '<!-- /@ -->', '',
            '<!-- @insert slot="s02" -->', '', '<!-- /@ -->',
        ].join('\n'));
        const blocks = new Map([
            ['s02', wrapBlock('s02', '새 서사 본문')],
            ['s01', wrapBlock('s01', '덮어쓰기 시도')],
            ['s99', wrapBlock('s99', '신규 슬롯 서사')],
        ]);
        const { text, merged } = mergePatch(fp, blocks);
        assert.equal(merged, 2, '빈 슬롯 채우기 + 신규 추가만 병합');
        assert.ok(text.includes('새 서사 본문'), '빈 @insert 교체됨');
        assert.ok(text.includes('기존 서사 내용') && !text.includes('덮어쓰기 시도'), '기존 서사 보존');
        assert.ok(text.includes('신규 슬롯 서사'), '미등록 슬롯 파일 끝 추가');
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('AI-18: termContext — 용어 등장 라인 주변 컨텍스트를 교재에서 추출한다', () => {
    const { termContext } = require('../../tools/ai/ai_cards.js');
    const ctx = termContext({ 'ch.md': '앞줄\n화장품법이란 법이다\n뒷줄1\n뒷줄2\n' }, '화장품법');
    assert.ok(ctx.includes('화장품법이란'), '용어 라인 포함');
    assert.equal(termContext({ 'ch.md': '무관한 내용\n' }, '화장품법'), null, '미발견 시 null');
});

test('AI-19: 카드팁 오버레이 계약 — flashcard.html 표시 요소·Card.tip 필드 존재', () => {
    const fs = require('fs'), path = require('path');
    const html = fs.readFileSync(path.join(process.cwd(), 'html/views/flashcard.html'), 'utf8');
    assert.ok(html.includes('id="card-back-tip"') && html.includes('id="card-tip-container"'), 'tip 표시 요소');
    const types = fs.readFileSync(path.join(process.cwd(), 'src/types.js'), 'utf8');
    assert.ok(types.includes('[tip]'), 'Card typedef에 tip 필드');
    const loader = fs.readFileSync(path.join(process.cwd(), 'src/data-loader.js'), 'utf8');
    assert.ok(loader.includes('_getCardTips') && loader.includes('피드백/card_tip.json'), 'DataLoader 오버레이 병합');
});

test('AI-22: 카드 제외 목록 — card_exclude.json의 ID가 실제 파싱 카드에 존재하고 로더·도구가 적용', () => {
    const fs = require('fs'), path = require('path');
    const root = process.cwd();
    const loader = fs.readFileSync(path.join(root, 'src/data-loader.js'), 'utf8');
    assert.ok(loader.includes('_getCardExcludes') && loader.includes('피드백/card_exclude.json'), 'DataLoader 제외 목록 로드');
    assert.ok(loader.includes('data.cards = data.cards.filter'), 'DataLoader 카드 필터 적용');
    const aiCards = fs.readFileSync(path.join(root, 'tools/ai/ai_cards.js'), 'utf8');
    assert.ok(aiCards.includes('card_exclude.json') && aiCards.includes('!(c.id in excluded)'), 'ai:cards 제외 대상 필터');

    // stale 항목 차단 — 제외 목록의 ID는 현재 파싱 결과에 실존해야 함
    const { loadSubjectCards } = require('../../tools/ai/ai_cards.js');
    const exclPath = path.join(root, 'content/exams/cosmetic/피드백/card_exclude.json');
    if (!fs.existsSync(exclPath)) return;
    const excludes = JSON.parse(fs.readFileSync(exclPath, 'utf8'));
    const allIds = new Set();
    for (const s of ['law', 'manufacturing', 'understanding', 'safety']) {
        const loaded = loadSubjectCards({ id: 'cosmetic', contentRoot: 'content/exams/cosmetic' }, s);
        if (loaded) loaded.data.cards.forEach(c => allIds.add(c.id));
    }
    for (const id of Object.keys(excludes)) {
        assert.ok(allIds.has(id), `제외 목록의 ${id}가 실제 파싱 카드에 존재`);
    }
});

test('AI-20: ai_glossary parseGlossaryDrafts — 정의 라인만 추출하고 플레이스홀더 제외', () => {
    const { parseGlossaryDrafts } = require('../../tools/ai/ai_glossary.js');
    const { DRAFT_DIR } = require('../../tools/ai/lib/ai_common.js');
    const fs = require('fs'), path = require('path');
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
    const fp = path.join(DRAFT_DIR, 'glossary_testexam_subject9.md');
    fs.writeFileSync(fp, '## term 시행령\n\n> **정의**: 대통령령이다.\n\n## term 고시\n\n> **정의**: (미생성 — DRY RUN)\n');
    try {
        const m = parseGlossaryDrafts().get('testexam');
        assert.equal(m.get('subject9').get('시행령'), '대통령령이다.');
        assert.ok(!m.get('subject9').has('고시'), '미생성 제외');
    } finally { fs.rmSync(fp, { force: true }); }
});

test('AI-21: ai_adphrases clauseText — 별표5 문서에서 호별 법문 추출', () => {
    const { clauseText } = require('../../tools/ai/ai_adphrases.js');
    const doc = '1. 가. 의약품과 오인될 수 있는 표현\n2. 나. 기능성화장품이 아닌 화장품의 효능 표현\n';
    assert.ok(clauseText(doc, '가').includes('의약품'));
    assert.ok(clauseText(doc, '나').includes('기능성화장품'));
});
