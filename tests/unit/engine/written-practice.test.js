// tests/unit/written-practice.test.js — 주관식 연습 파서·저장·분리 유닛 테스트
// @spec WP-01~06
// ### Sn. 블록 파싱(유형·배점·근거·문제·모범답안·답·rubric·흔한오류·⚖️인용),
// 자기채점 진행 저장(WRITTEN_PRACTICE 스코프 키), 객관식 런타임 분리를 고정한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWrittenBank, WrittenPractice } from '../../../src/written-practice.js';
import { STORAGE_KEYS, BACKUP_KEYS } from '../../../src/storage-keys.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const SAMPLE = `# 연습 문항

총 2제

---

## 📝 계산형

### S1. 보험금 계산

- **유형**: 계산형 · **배점**: 15점 · **근거**: 손해평가요령 별표 1

**문제**: 보험금을 계산하시오.

| 항목 | 값 |
| --- | --- |
| 가입금액 | 3,000,000원 |

**모범답안**:
1. 피해율 = 25 %
2. 보험금 = 가입금액 × 5%

**답**: 150,000 원

**채점기준**:
- [ ] 피해율 산식 (5점)
- [ ] 보험금 산정 (5점)
- [ ] 단위 정확 (5점)

**흔한 오류**: 미보상감수량 누락

⚖️ [별표 1: L149](<../참조자료/ref_md/과목2/요령.md#L149>)

---

### S2. 용어 단답형

- **유형**: 단답형 · **배점**: 5점 · **근거**: 별표 2

**문제**: 용어를 쓰시오. ( ① )

**모범답안**: ① 전수조사

**채점기준**: 항목당 2.5점 — 용어 정확 기재

⚖️ [별표 2: L311](<../참조자료/ref_md/과목2/요령.md#L311>)
`;

test('parseWrittenBank: 제목·섹션·문항 수 파싱', () => {
    const bank = parseWrittenBank(SAMPLE);
    assert.equal(bank.title, '연습 문항');
    assert.equal(bank.questions.length, 2);
    assert.equal(bank.sections.length, 1);
    assert.equal(bank.sections[0].questions.length, 2);
});

test('parseWrittenBank: 메타·문제·모범답안·답 필드', () => {
    const [q1, q2] = parseWrittenBank(SAMPLE).questions;
    assert.equal(q1.id, 'S1');
    assert.equal(q1.type, '계산형');
    assert.equal(q1.points, 15);
    assert.equal(q1.basis, '손해평가요령 별표 1');
    assert.ok(q1.problem.includes('가입금액'));
    assert.ok(q1.modelAnswer.includes('피해율 = 25 %'));
    assert.equal(q1.finalAnswer, '150,000 원');
    assert.ok(q1.commonErrors.includes('미보상감수량'));
    assert.equal(q2.type, '단답형');
    assert.equal(q2.points, 5);
});

test('parseWrittenBank: rubric 체크리스트/인라인 텍스트 구분', () => {
    const [q1, q2] = parseWrittenBank(SAMPLE).questions;
    assert.equal(q1.rubricItems.length, 3);
    assert.deepEqual(q1.rubricItems[0], { text: '피해율 산식', points: 5 });
    assert.equal(q1.rubricText, '');
    assert.equal(q2.rubricItems.length, 0);
    assert.ok(q2.rubricText.includes('항목당 2.5점'));
});

test('parseWrittenBank: ⚖️ 인용 링크 → path+line 해석', () => {
    const [q1] = parseWrittenBank(SAMPLE).questions;
    assert.equal(q1.refs.length, 1);
    assert.equal(q1.refs[0].line, 149);
    assert.ok(q1.refs[0].path.endsWith('요령.md'));
    assert.ok(q1.refs[0].label.includes('별표 1'));
});

test('parseWrittenBank: 실제 2차 파일 파싱 (lossadj 팩)', () => {
    const md = readFileSync(
        join(ROOT, 'content/exams/lossadj/문제은행/2차_손해평가_주관식.md'), 'utf8');
    const bank = parseWrittenBank(md);
    assert.equal(bank.questions.length, 34);
    // 전 문항에 문제·모범답안·배점·인용이 존재해야 한다
    for (const q of bank.questions) {
        assert.ok(q.problem.length > 0, `${q.id} 문제 누락`);
        assert.ok(q.modelAnswer.length > 0, `${q.id} 모범답안 누락`);
        assert.ok(q.points > 0, `${q.id} 배점 누락`);
        assert.ok(q.refs.length > 0, `${q.id} 인용 누락`);
        assert.ok(q.rubricItems.length > 0 || q.rubricText.length > 0, `${q.id} 채점기준 누락`);
    }
});

/* ---------- WP-04: 자기채점 진행 저장 ---------- */

function createMockStorage() {
    const store = {};
    return {
        getItem(k) { return k in store ? store[k] : null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; },
        clear() { for (const k of Object.keys(store)) delete store[k]; },
        key(i) { return Object.keys(store)[i] ?? null; },
        get length() { return Object.keys(store).length; },
        _store: store
    };
}

let _mockStorage, _origLS, _origWin;

beforeEach(() => {
    _mockStorage = createMockStorage();
    _origLS = global.localStorage;
    _origWin = global.window;
    Object.defineProperty(global, 'localStorage', { value: _mockStorage, writable: true, configurable: true });
    Object.defineProperty(global, 'window', {
        value: { EXAMS_LIST: { exams: [{ id: 'lossadj', name: '손해평가사', default: true }] } },
        writable: true, configurable: true
    });
});

afterEach(() => {
    if (_origLS !== undefined) Object.defineProperty(global, 'localStorage', { value: _origLS, writable: true, configurable: true });
    else delete global.localStorage;
    if (_origWin !== undefined) Object.defineProperty(global, 'window', { value: _origWin, writable: true, configurable: true });
    else delete global.window;
});

test('WP-04: 진행 저장은 시험 스코프 키이며 백업 대상', () => {
    assert.ok(BACKUP_KEYS.includes(STORAGE_KEYS.WRITTEN_PRACTICE), 'BACKUP_KEYS 누락');
    // 시드: lossadj 스코프 키에 자기채점 진행 — d(완료ts)만 완료로 집계
    _mockStorage.setItem('lossadj:' + STORAGE_KEYS.WRITTEN_PRACTICE, JSON.stringify({
        '2차_손해평가_주관식': {
            S1: { a: '답안', c: [0, 1], d: 1729900000000 },
            S2: { a: '작성중', c: [], d: null },
            S3: { a: '', c: [], d: null }
        }
    }));
    assert.deepEqual(WrittenPractice.getProgress('2차_손해평가_주관식'), { done: 1 });
    assert.deepEqual(WrittenPractice.getProgress('없는파일'), { done: 0 });
    // 객관식 isAnswered와 분리 — 진행 키는 WRITTEN_PRACTICE에만 쓴다
    assert.ok(!('isAnswered' in (JSON.parse(
        _mockStorage.getItem('lossadj:' + STORAGE_KEYS.WRITTEN_PRACTICE))['2차_손해평가_주관식'].S1)));
});

/* ---------- WP-05: ⚖️ 인용 → 문제집 뷰어 연동 데이터 ---------- */

test('WP-05: 인용 refs는 뷰어가 필요로 하는 path+line을 제공', () => {
    const md = readFileSync(
        join(ROOT, 'content/exams/lossadj/문제은행/2차_손해평가_주관식.md'), 'utf8');
    const bank = parseWrittenBank(md);
    for (const q of bank.questions) {
        for (const r of q.refs) {
            assert.ok(r.path.endsWith('.md'), `${q.id} 인용 경로 이상: ${r.path}`);
            assert.ok(r.path.startsWith('../참조자료/'), `${q.id} 인용 베이스 이상: ${r.path}`);
            assert.ok(typeof r.line === 'number' && r.line > 0, `${q.id} #LNN 누락`);
        }
    }
});

/* ---------- WP-06: 객관식 런타임 분리 ---------- */

test('WP-06: 주관식 파일은 exams[]·integratedExam에 미편입', () => {
    const manifest = JSON.parse(readFileSync(
        join(ROOT, 'content/exams/lossadj/manifest.json'), 'utf8'));
    const writtenFiles = new Set((manifest.written || []).map(w => w.file));
    assert.ok(writtenFiles.size > 0, 'manifest.written 선언 없음');
    for (const e of manifest.exams || []) {
        assert.ok(!writtenFiles.has(e.file), `${e.file}가 exams[]에 편입됨`);
    }
    // 주관식 과목(교재만 있는 과목)은 통합모의고사 출제 대상이 아니다
    const writtenSubjects = new Set(
        (manifest.subjects || []).filter(s =>
            !(manifest.exams || []).some(e => e.subject === s.key)).map(s => s.key));
    for (const key of Object.keys(
        (manifest.integratedExam && manifest.integratedExam.questionsPerSubject) || {})) {
        assert.ok(!writtenSubjects.has(key) || !writtenSubjects.size,
            `${key}가 integratedExam에 편입됨`);
    }
});
