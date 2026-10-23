// tests/unit/gates/emb-builder.test.js
// @spec SEM-01,SEM-05
// build_embeddings.js(Node 포팅)의 순수 함수 검증 — 모델 없이 수집·정규화·이웃 규칙 재현.
// Python 구현(ref-pipeline/embeddings/build_embeddings.py)과 1:1 대응 계약 보호.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const B = require(join(ROOT, 'tools', 'build', 'build_embeddings.js'));
const { textNormKey } = require(join(ROOT, 'tools', 'lib', 'emb_math.js'));

/** 최소 데이터 루트 픽스처 — ox 드릴 + combo + 시험 번들 */
function fixtureDataRoot() {
    const root = mkdtempSync(join(tmpdir(), 'emb-fixture-'));
    mkdirSync(join(root, 'drills'), { recursive: true });
    mkdirSync(join(root, 'exams'), { recursive: true });
    const ox = [
        { id: 'ox-01-0001', sid: 'law_st_aaa', statement: ' 화장품의 **정의**는  넓다 ', context: '발문1', truth: true },
        { id: 'ox-01-0002', sid: 'law_st_aaa', statement: '중복 sid — 무시돼야 함', truth: false },
        { id: 'ox-01-0003', statement: 'sid 없음 — 무시' },
    ];
    writeFileSync(join(root, 'drills', 'ox_subject1.js'), `var OX = ${JSON.stringify(ox)};`, 'utf8');
    const combo = [
        { id: 'cb-1', subject: 2, statements: [
            { sid: 'mfg_st_bbb', text: '제조업자는 시설을 갖춘다', conceptId: 'C1', truth: true },
            { sid: 'mfg_st_ccc', text: '   ', truth: false },
        ] },
    ];
    writeFileSync(join(root, 'drills', 'combo_subject2.js'), `var CB = ${JSON.stringify(combo)};`, 'utf8');
    writeFileSync(join(root, 'drills', 'combo_index.js'), 'var CI = {};', 'utf8');
    const exam = { id: 'subject1', questions: [
        { id: 'q1', question: '맞는 것은?', options: ['가', '나'], answer: '②' },
        { id: 'q2', question: '틀린 것은?', options: ['가'], answer: '③' },
    ] };
    writeFileSync(join(root, 'exams', 'subject1.aaaa0000.js'), `var EX = ${JSON.stringify(exam)};`, 'utf8');
    return root;
}

test('SEM-01: collectItems — stmt/q 수집·중복 sid 유지·공백 제외·정답 마커 해석', () => {
    const { items, inputs } = B.collectItems(fixtureDataRoot());
    const keys = items.map((i) => i.key);
    assert.deepEqual(keys, ['stmt:law_st_aaa', 'stmt:mfg_st_bbb', 'q:q1', 'q:q2']);
    const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
    assert.equal(byKey['stmt:law_st_aaa'].text, '화장품의 정의 는 넓다');     // clean_text — 마크다운 기호→공백
    assert.equal(byKey['stmt:law_st_aaa'].subject, 1);
    assert.equal(byKey['stmt:law_st_aaa'].truth, true);
    assert.equal(byKey['stmt:mfg_st_bbb'].subject, 2);
    assert.equal(byKey['stmt:mfg_st_bbb'].cid, 'C1');
    assert.equal(byKey['q:q1'].text, '맞는 것은? 나');                        // ② → 선지 해석
    assert.equal(byKey['q:q2'].text, '틀린 것은? ③');                        // 범위 밖 → 원문 유지
    assert.equal(Object.keys(inputs).length, 3);                            // combo_index 제외
    for (const h of Object.values(inputs)) assert.match(h, /^[0-9a-f]{40}$/);
});

test('SEM-01: answerText — ①·숫자·범위밖·텍스트 해석', () => {
    const opts = ['갑', '을', '병'];
    assert.equal(B.answerText('①', opts), '갑');
    assert.equal(B.answerText(' 3 ', opts), '병');
    assert.equal(B.answerText('⑤', opts), '⑤');
    assert.equal(B.answerText('병', opts), '병');
});

test('SEM-01: sameTextMap — 정규화 동일 텍스트 교차 맵', () => {
    const items = [
        { key: 'stmt:a', text: '화장품 정의', kind: 'stmt', subject: 1 },
        { key: 'stmt:b', text: '화장품  정의', kind: 'stmt', subject: 2 },
        { key: 'stmt:c', text: '다른 문장', kind: 'stmt', subject: 1 },
    ];
    assert.deepEqual(B.sameTextMap(items), { 'stmt:a': ['stmt:b'], 'stmt:b': ['stmt:a'] });
    assert.equal(textNormKey(' A  b '), 'ab');
});

test('SEM-01: sourceHash — key+text 결정적 해시·순서 민감', () => {
    const mk = (k) => [{ key: k, text: 't' }];
    const h1 = B.sourceHash(mk('a'));
    assert.match(h1, /^[0-9a-f]{16}$/);
    assert.notEqual(B.sourceHash(mk('a')), B.sourceHash(mk('b')));
    assert.equal(B.sourceHash(mk('a')), h1);
});

test('SEM-01: buildAdjacency — 자기·동일텍스트·단문 제외 후 top-K', () => {
    const dim = 2;
    // 항목 4개: a↔b 고유사(1,0)·(0.99,0.1), c는 a와 동일 정규화 텍스트, d는 단문
    const items = [
        { key: 'stmt:a', text: '가'.repeat(13) },
        { key: 'stmt:b', text: '나'.repeat(13) },
        { key: 'stmt:c', text: '가'.repeat(13) },
        { key: 'stmt:d', text: '표시' },
    ];
    const norms = items.map((i) => textNormKey(i.text));
    const deq = new Float32Array([1, 0, 0.995, 0.0999, 1, 0, 0.5, 0.866]);
    const emb = deq;
    const { adj } = B.buildAdjacency(deq, emb, items, norms, dim, 8);
    const aAdj = adj['stmt:a'].map(([k]) => k);
    assert.ok(!aAdj.includes('stmt:a'), '자기 자신 제외');
    assert.ok(!aAdj.includes('stmt:c'), '동일 정규화 텍스트 제외');
    assert.ok(!aAdj.includes('stmt:d'), 'MIN_NEIGHBOR_LEN 미만 제외');
    assert.equal(adj['stmt:b'][0][0], 'stmt:a');
});
