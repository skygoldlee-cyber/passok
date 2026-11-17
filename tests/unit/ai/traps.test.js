// tests/unit/ai/traps.test.js — 함정 유형(trap) 추론·편입·파싱 (AI-39)
// @spec AI-39 — TRAP_TAGS 어휘·함정 메타 행 파싱·규칙 후보·초안 편입·스키마 화이트리스트

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const _tmpDirs = [];
after(() => { for (const d of _tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
function tmpDir() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'traps-')); _tmpDirs.push(d); return d; }

const require = createRequire(import.meta.url);
const { inferTrapCandidates, numMask } = require('../../../tools/ai/lib/traps.js');
const { parseTrapDraft, applyTrapToBank } = require('../../../tools/ai/ai_trap.js');
const { parseQuestionBank } = require('../../../tools/ai/lib/qbank.js');
const { parseExamFile } = require('../../../tools/build/plugins/exams.plugin.js');
const { validateQuestion, TRAP_TAGS } = require('../../../src/content/questions.js');

const CHOICE = (stem, options) => ({
    type: 'choice', stem, options: options.map((t, i) => ({ n: i + 1, text: t })),
});

describe('inferTrapCandidates — 규칙 후보', () => {
    test('수치바꿔치기 — 정답 선지와 숫자만 다른 오지', () => {
        const q = CHOICE('목욕물 온도로 적절한 것은?', ['30℃', '32℃', '35℃', '45℃', '50℃']);
        const tags = inferTrapCandidates(q, 3).map(r => r.tag);
        assert.ok(tags.includes('수치바꿔치기'));
    });

    test('절대표현 — 오지에만 절대 화행', () => {
        const q = CHOICE('옳은 것은?', ['항상 침대에 눕힌다', '모든 대상자에게 동일하게 한다', '대상자 상태에 따라 조정한다', '절대 외출시키지 않는다', '무조건 기록한다']);
        const tags = inferTrapCandidates(q, 3).map(r => r.tag);
        assert.ok(tags.includes('절대표현'));
    });

    test('예외조항 — 발문의 예외 표현', () => {
        const q = CHOICE('다음 중 급여 대상에서 제외되는 것은?', ['방문요양', '방문목욕', '노인요양시설 입소', '주·야간보호', '복지용구']);
        const tags = inferTrapCandidates(q, 3).map(r => r.tag);
        assert.ok(tags.includes('예외조항'));
    });

    test('유사용어혼동 — 핵심 용어만 다른 유사 선지 쌍', () => {
        const q = CHOICE('법령으로 옳은 것은?', ['노인복지법 제39조의2', '노인복지법 제39조의17', '의료기사등에관한법률 제3조', '국민건강보험법 제109조', '사회복지사업법 제11조']);
        const tags = inferTrapCandidates(q, 1).map(r => r.tag);
        assert.ok(tags.includes('유사용어혼동'));
    });

    test('무관 문항·단답형·주어치환은 규칙 태그 없음', () => {
        assert.deepEqual(inferTrapCandidates(CHOICE('설명으로 옳은 것은?', ['전혀', '다른', '서로', '관련', '없음']), 3), []);
        assert.deepEqual(inferTrapCandidates({ type: 'short', stem: '쓰시오', options: [] }, null), []);
    });

    test('numMask — 소수점·천단위 포함 숫자 토큰 마스킹', () => {
        assert.equal(numMask('38.5℃ / 1,000원'), '#℃ / #원');
    });
});

const BANK = [
    '# 문제은행', '',
    '### Q1. 옳은 것은?', '① 가', '② 나', '③ 다', '④ 라', '⑤ 마', '',
    '### Q2. 맞는 것은?', '① A', '② B', '③ C', '④ D', '⑤ E', '',
    '## 🔑 정답 및 교재 근거', '',
    '**Q1.**', '',
    '> **정답: ①** [교재: L10](<../교재/t.md#L10>)', '> **해설**: 첫 문항 해설', '',
    '**Q2.**', '',
    '> **정답: ②** [교재: L20](<../교재/t.md#L20>)', '> **함정:** 절대표현',
    '> **해설**: 둘째 문항 해설', '',
].join('\n');

describe('applyTrapToBank — 정답 블록 함정 행 편입', () => {
    test('정답 행 직후에 함정 행 삽입', () => {
        const r = applyTrapToBank(BANK, 1, ['수치바꿔치기']);
        assert.equal(r.applied, true);
        const block = r.src.match(/\*\*Q1\.\*\*[\s\S]*?(?=\*\*Q2\.)/)[0];
        assert.ok(block.includes('> **정답: ①**'));
        assert.ok(block.indexOf('**정답: ①**') < block.indexOf('**함정:** 수치바꿔치기'));
    });

    test('기존 함정 행은 교체 (재실행 안전)', () => {
        const r = applyTrapToBank(BANK, 2, ['예외조항']);
        assert.equal(r.applied, true);
        const hits = r.src.match(/\*\*함정/g) || [];
        assert.equal(hits.length, 1);
        assert.ok(r.src.includes('> **함정:** 예외조항'));
        assert.ok(!r.src.includes('> **함정:** 절대표현'));
    });

    test('블록 없는 문항은 스킵', () => {
        assert.equal(applyTrapToBank(BANK, 99, ['절대표현']).applied, false);
    });
});

describe('parseTrapDraft — 리뷰 초안 파싱', () => {
    test('함정 열만 추출 — (없음)·빈 행 제외', () => {
        const dir = tmpDir();
        const fp = path.join(dir, 'traps_x.md');
        fs.writeFileSync(fp, [
            '| 문항 | 함정 | 근거 |', '|---|---|---|',
            '| Q1 | 수치바꿔치기, 유사용어혼동 | 규칙+LLM |',
            '| Q2 | (없음) | — |',
            '| Q3 | — | — |',
            '| Q10 | 절대표현 | 규칙 |',
        ].join('\n'));
        const m = parseTrapDraft(fp);
        assert.deepEqual(m.get(1), ['수치바꿔치기', '유사용어혼동']);
        assert.equal(m.has(2), false);
        assert.equal(m.has(3), false);
        assert.deepEqual(m.get(10), ['절대표현']);
    });
});

describe('qbank·plugin 파싱 — 함정 메타 행', () => {
    test('parseQuestionBank가 기존 함정 행을 읽는다', () => {
        const dir = tmpDir();
        const fp = path.join(dir, 'bank.md');
        fs.writeFileSync(fp, BANK);
        const { answers } = parseQuestionBank(fp);
        assert.deepEqual(answers.get(2).trap, ['절대표현']);
        assert.deepEqual(answers.get(1).trap, []);
    });

    test('parseExamFile이 함정 행을 q.trap으로 편입하고 해설에서 제외', () => {
        const dir = tmpDir();
        const fp = path.join(dir, 'bank.md');
        fs.writeFileSync(fp, BANK);
        const data = parseExamFile(fp, 'subj1', '테스트');
        const q2 = data.questions.find(q => q.num === 2);
        const q1 = data.questions.find(q => q.num === 1);
        assert.deepEqual(q2.trap, ['절대표현']);
        assert.equal(q1.trap, undefined);
        assert.ok(!q2.explanation.includes('함정:'));
    });

    test('어휘 밖 함정 값은 빌드 오류 (화이트리스트 게이트)', () => {
        const dir = tmpDir();
        const fp = path.join(dir, 'bank.md');
        fs.writeFileSync(fp, BANK.replace('> **함정:** 절대표현', '> **함정:** 어려운함정'));
        assert.throws(() => parseExamFile(fp, 'subj1', '테스트'), /함정 유형/);
    });
});

describe('validateQuestion — trap 화이트리스트', () => {
    const base = { id: 'q1', subject: 1, type: 'ox', statement: 'x', truth: true, points: 1 };
    test('어휘 내 함정은 통과, 어휘 밖은 오류', () => {
        assert.deepEqual(validateQuestion({ ...base, trap: ['수치바꿔치기'] }), []);
        assert.deepEqual(validateQuestion(base), []); // 필드 없음 — 하위호환
        const errs = validateQuestion({ ...base, trap: ['없는유형'] });
        assert.ok(errs.some(e => e.includes('함정 유형')));
        const errs2 = validateQuestion({ ...base, trap: '수치바꿔치기' });
        assert.ok(errs2.some(e => e.includes('배열')));
    });
    test('TRAP_TAGS 어휘집이 5유형을 담는다', () => {
        assert.deepEqual([...TRAP_TAGS].sort(),
            ['수치바꿔치기', '유사용어혼동', '예외조항', '절대표현', '주어치환'].sort());
    });
});
