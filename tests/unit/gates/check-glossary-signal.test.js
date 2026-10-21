// tests/unit/check-glossary-signal.test.js — 용어집 저신호 일반명사 감시 체커 검증
// @spec BP-14
// findGenericGlossaryKeywords: glossary subjectN.json의 autoExtracted 항목 중
// 2~4자 순수 한글 단일어(일반명사 위험군)를 수집 — 자동 병합 파이프라인이
// 맥락 의존 정의의 일상어 키워드를 유입할 때 정의 카드 노출 검토를 강제한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findGenericGlossaryKeywords, diffBaselineKeywords } from '../../../tools/check/check_glossary_signal.js';

function fixture(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glosssig-'));
    for (const [rel, text] of Object.entries(files)) {
        const p = path.join(dir, rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, text, 'utf-8');
    }
    return dir;
}

const targets = (root) => [{ id: 't1', contentRoot: path.relative(root, path.join(root, 'pack')) }];

test('BP-14 — 저신호 위험군: autoExtracted + 2~4자 순수 한글 단일어만 수집', () => {
    const root = fixture({
        'pack/교재/glossary/subject1.json': JSON.stringify([
            { keyword: '관리', definition: '적합 판정 기준 충족 검증', autoExtracted: true },   // 위험
            { keyword: '뱃치', definition: '일정 분량', autoExtracted: true },               // 위험
            { keyword: '화장품', definition: '법 제2조 정의' },                              // 큐레이션 — 제외
            { keyword: '기능성화장품', definition: 'x', autoExtracted: true },               // 5자 초과 — 제외
            { keyword: '2차 포장', definition: 'x', autoExtracted: true },                   // 숫자·공백 — 제외
            { keyword: '원료(영문)', definition: 'x', autoExtracted: true },                 // 괄호 — 제외
        ]),
    });
    const got = findGenericGlossaryKeywords(targets(root), root);
    assert.deepEqual(got.map(g => g.keyword), ['관리', '뱃치']);
    assert.ok(got.every(g => g.exam === 't1' && g.file.endsWith('subject1.json')));
});

test('BP-14 — 기준선 diff는 exam|keyword 쌍 단위로 신규만 보고', () => {
    const entries = [
        { exam: 'cos', keyword: '관리', file: 'f', definition: 'd' },
        { exam: 'insadj', keyword: '관리', file: 'f', definition: 'd' },   // 다른 시험 — 별도 쌍
        { exam: 'cos', keyword: '관리', file: 'f2', definition: 'd' },   // 같은 쌍 재등장 — 1회만
    ];
    const fresh = diffBaselineKeywords(entries, ['cos|관리']);
    assert.deepEqual(fresh.map(e => `${e.exam}|${e.keyword}`), ['insadj|관리']);
});

test('BP-14 — glossary 디렉터리 부재 시험은 건너뜀', () => {
    const root = fixture({ 'pack/교재/a.md': '# doc' });
    assert.deepEqual(findGenericGlossaryKeywords(targets(root), root), []);
});
