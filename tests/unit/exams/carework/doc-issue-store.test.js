// tests/unit/exams/carework/doc-issue-store.test.js
// @spec none — 문서 발행 대장 계약: docNo 업서트·rev 누적·형식/파일명 병합·접두어 추론
import { test } from 'node:test';
import assert from 'node:assert/strict';

// storage.js는 브라우저 storage 필요 — 메모리 스텁 (care-funnel.test.js와 동일 패턴)
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };

const { docPrefix, listDocIssues, findDocIssue, recordDocIssue, nextDocRev } = await import('../../../../src/exams/carework/doc-issue-store.js');
const { STORAGE_KEYS } = await import('../../../../src/core/storage-keys.js');

const clear = () => { delete mem[Object.keys(mem).find(k => k.includes('doc_issues')) || '']; delete mem[STORAGE_KEYS.CARE_DOC_ISSUES]; };

test('유형 접두어 추론 — 제목 → docStamp 접두어', () => {
    assert.equal(docPrefix('요양일지'), 'LOG');
    assert.equal(docPrefix('사고·낙상 보고서'), 'INC');
    assert.equal(docPrefix('인수인계서'), 'HND');
    assert.equal(docPrefix('교대근무표'), 'RST');
    assert.equal(docPrefix('수급자 명부'), 'CLT');
    assert.equal(docPrefix('임의 문서'), 'DOC');
});

test('발행 기록 — 신규 등록 후 조회', () => {
    clear();
    const r = recordDocIssue({ docNo: 'LOG-20261114-a3f2c1', tool: '요양일지', kind: 'docx', filenames: ['요양일지_LOG.docx'], hash: 'a3f2c1xx' });
    assert.equal(r.rev, 1);
    const it = findDocIssue('LOG-20261114-a3f2c1');
    assert.ok(it, '대장에 기록 없음');
    assert.equal(it.tool, '요양일지');
    assert.deepEqual(it.files, ['요양일지_LOG.docx']);
    assert.deepEqual(it.kinds, ['docx']);
    assert.equal(it.hash, 'a3f2c1xx');
    assert.ok(it.issuedAt, '발행 시각 누락');
});

test('재발행 — 같은 docNo는 같은 행에 rev 누적·파일명/형식 병합', () => {
    clear();
    recordDocIssue({ docNo: 'INC-20261113-b7e4d2', tool: '사고보고서', kind: 'docx', filenames: ['a.docx'], hash: 'b7e4d2xx' });
    recordDocIssue({ docNo: 'INC-20261113-b7e4d2', tool: '사고보고서', kind: 'pdf', filenames: ['a.pdf'] });
    const it = findDocIssue('INC-20261113-b7e4d2');
    assert.equal(it.rev, 2, '재발행 차수 미누적');
    assert.deepEqual(it.kinds, ['docx', 'pdf'], '형식 병합 실패');
    assert.deepEqual(it.files, ['a.docx', 'a.pdf'], '파일명 누적 실패');
    assert.equal(it.hash, 'b7e4d2xx', '두 번째 기록의 빈 해시가 기존 해시를 덮음');
    assert.equal(listDocIssues().length, 1, '같은 번호가 별도 행으로 중복 등록됨');
    assert.equal(nextDocRev('INC-20261113-b7e4d2'), 3, '다음 차수 계산 오류');
});

test('번호 없는 기록은 무시 — docNo 빈값 안전 처리', () => {
    clear();
    const r = recordDocIssue({ docNo: '', tool: 't', kind: 'docx' });
    assert.equal(r.rev, 0);
    assert.equal(listDocIssues().length, 0);
    assert.equal(nextDocRev('NEW-00000000-000000'), 1);
});
