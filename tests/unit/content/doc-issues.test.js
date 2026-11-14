// tests/unit/content/doc-issues.test.js
// @spec CO-22 — 발행 대장 팩토리 계약: 키 결합·org 공급자·docNo 업서트·rev 누적·시험별 격리
import { test } from 'node:test';
import assert from 'node:assert/strict';

// storage.js는 브라우저 storage 필요 — 메모리 스텁 (care-funnel.test.js와 동일 패턴)
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };

const { createDocIssueStore } = await import('../../../src/content/doc-issues.js');
const { STORAGE_KEYS } = await import('../../../src/core/storage-keys.js');

// entity-store는 키별 인스턴스 캐시 — 테스트 간 상태 누수 방지로 고유 키 사용
let _seq = 0;
const make = (key = `test_doc_issues_${++_seq}`, org = () => '테스트기관') => createDocIssueStore({ key, org });

test('발행 기록 — 신규 등록 후 조회·org 공급자 반영', () => {
    const s = make();
    const r = s.recordDocIssue({ docNo: 'RPT-20261114-a3f2c1', tool: '종합 점검 보고서', kind: 'print', hash: 'a3f2c1xx' });
    assert.equal(r.rev, 1);
    const it = s.findDocIssue('RPT-20261114-a3f2c1');
    assert.equal(it.tool, '종합 점검 보고서');
    assert.equal(it.org, '테스트기관');
    assert.deepEqual(it.kinds, ['print']);
    assert.ok(it.issuedAt);
});

test('재발행 — 같은 docNo는 같은 행에 rev 누적·파일명/형식 병합·빈 해시 보존', () => {
    const s = make();
    s.recordDocIssue({ docNo: 'LOT-20261114-b7e4d2', tool: '원료 LOT 사용 추적', kind: 'print', filenames: ['a.pdf'], hash: 'b7e4d2xx' });
    s.recordDocIssue({ docNo: 'LOT-20261114-b7e4d2', tool: '원료 LOT 사용 추적', kind: 'docx', filenames: ['a.docx'] });
    const it = s.findDocIssue('LOT-20261114-b7e4d2');
    assert.equal(it.rev, 2);
    assert.deepEqual(it.kinds, ['print', 'docx']);
    assert.deepEqual(it.files, ['a.pdf', 'a.docx']);
    assert.equal(it.hash, 'b7e4d2xx', '빈 해시가 기존 해시를 덮음');
    assert.equal(s.list().length, 1);
    assert.equal(s.nextDocRev('LOT-20261114-b7e4d2'), 3);
});

test('번호 없는 기록은 무시 — docNo 빈값 안전 처리', () => {
    const s = make();
    assert.equal(s.recordDocIssue({ docNo: '', tool: 't', kind: 'docx' }).rev, 0);
    assert.equal(s.list().length, 0);
    assert.equal(s.nextDocRev('NEW-00000000-000000'), 1);
});

test('시험별 키 격리 — 서로 다른 키의 대장은 독립 누적', () => {
    const a = make('exam_a_doc_issues');
    const b = make('exam_b_doc_issues');
    a.recordDocIssue({ docNo: 'DOC-20261114-aaaaaa', tool: 'A문서', kind: 'docx' });
    a.recordDocIssue({ docNo: 'DOC-20261114-aaaaaa', tool: 'A문서', kind: 'pdf' });
    b.recordDocIssue({ docNo: 'DOC-20261114-aaaaaa', tool: 'B문서', kind: 'docx' });
    assert.equal(a.findDocIssue('DOC-20261114-aaaaaa').rev, 2);
    assert.equal(b.findDocIssue('DOC-20261114-aaaaaa').rev, 1, '다른 시험 대장의 발행이 섞임');
    assert.equal(b.findDocIssue('DOC-20261114-aaaaaa').tool, 'B문서');
});

test('cosmetic 대장 스토어 결합 — FORMULA_DOC_ISSUES 키로 기록', async () => {
    delete mem[STORAGE_KEYS.FORMULA_DOC_ISSUES];
    const { recordDocIssue, findDocIssue } = await import('../../../src/exams/cosmetic/doc-issue-store.js');
    recordDocIssue({ docNo: 'SALES-20261114-cccccc', tool: '판매내역서', kind: 'print' });
    const it = findDocIssue('SALES-20261114-cccccc');
    assert.ok(it, 'cosmetic 대장 미기록');
    assert.equal(it.org, '', 'cosmetic은 사업장명 키 없음 — org 공란 계약');
});
