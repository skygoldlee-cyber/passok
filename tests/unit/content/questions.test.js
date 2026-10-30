// tests/unit/questions.test.js
// @spec DR-07
// src/content/questions.js — 문항 스키마·채점 유틸 검증
// (single/combo/short/ox 유형, truth 도출, 진술 단위 오판 피드백)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveComboAnswer,
  generateComboOptions,
  validateQuestion,
  gradeAnswer,
  scoreExam,
} from '../../../src/content/questions.js';
import { SAMPLE_QUESTIONS } from '../../fixtures/sample-questions.js';

const combo = {
  id: 'q-t-1', subject: 4, type: 'combo', points: 10,
  stem: '옳은 것을 모두 고른 것은?',
  statements: [
    { id: 'ㄱ', sid: 'st-1', truth: true },
    { id: 'ㄴ', sid: 'st-2', truth: false },
    { id: 'ㄷ', sid: 'st-3', truth: true },
    { id: 'ㄹ', sid: 'st-4', truth: false },
  ],
  options: [
    { id: '1', members: ['ㄱ', 'ㄴ'] },
    { id: '2', members: ['ㄱ', 'ㄷ'] },   // 도출 정답
    { id: '3', members: ['ㄴ', 'ㄷ', 'ㄹ'] },
    { id: '4', members: ['ㄱ', 'ㄷ', 'ㄹ'] },
    { id: '5', members: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'] },
  ],
  answer: '2',
};

// ── validateQuestion ────────────────────────────────────────

test('validateQuestion: 샘플 전 문항 무결성', () => {
  for (const q of SAMPLE_QUESTIONS) {
    assert.deepEqual(validateQuestion(q), [], `${q.id}: ${validateQuestion(q)}`);
  }
});

test('validateQuestion: combo 정답 조합 불일치 검출', () => {
  const bad = { ...combo, answer: '5' }; // 도출값은 '2'
  assert.ok(validateQuestion(bad).some(e => e.includes('도출값')));
});

test('validateQuestion: combo 정답 옵션 부재 검출', () => {
  const bad = {
    ...combo,
    options: combo.options.filter(o => o.id !== '2'),
  };
  assert.ok(validateQuestion(bad).some(e => e.includes('유일하지 않음')));
});

test('validateQuestion: ox 필수 필드 검사', () => {
  assert.ok(validateQuestion({ id: 'x', subject: 1, type: 'ox', points: 1 }).length > 0);
  assert.deepEqual(validateQuestion({
    id: 'x', subject: 1, type: 'ox', points: 1, statement: 's', truth: true,
  }), []);
});

test('validateQuestion: subjectMax 인자로 시험별 과목 번호 범위 검증', () => {
  // 기본값은 4과목 맵 — subject 5는 거부
  const q5 = { id: 'x', subject: 5, type: 'ox', points: 1, statement: 's', truth: true };
  assert.ok(validateQuestion(q5).some(e => e.includes('subject 값 이상')));
  // 시험별 manifest 과목 맵을 넘기면 해당 order까지 허용 (indsafe 7과목 등)
  const indsafeMax = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 };
  assert.deepEqual(validateQuestion(q5, indsafeMax), []);
  const q8 = { ...q5, subject: 8 };
  assert.ok(validateQuestion(q8, indsafeMax).some(e => e.includes('subject 값 이상')));
});

// ── deriveComboAnswer / generateComboOptions ────────────────

test('deriveComboAnswer: truth 집합과 일치하는 유일 옵션 도출', () => {
  assert.equal(deriveComboAnswer(combo), '2');
});

test('generateComboOptions: 정답 유일 조합 포함 5지선다 생성', () => {
  const opts = generateComboOptions(['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'], ['ㄱ', 'ㄷ']);
  assert.equal(opts.length, 5);
  const derived = deriveComboAnswer({ statements: combo.statements, options: opts });
  assert.ok(derived, '생성된 옵션에서 정답 도출 실패');
  const hit = opts.find(o => o.id === derived);
  assert.deepEqual(hit.members.slice().sort(), ['ㄱ', 'ㄷ']);
});

// ── gradeAnswer: combo perStatement ─────────────────────────

test('combo 채점: 정답 선택 시 correct + 전 진술 judgedCorrect', () => {
  const r = gradeAnswer(combo, '2');
  assert.equal(r.correct, true);
  assert.equal(r.correctAnswer, '2');
  assert.ok(r.perStatement.every(s => s.judgedCorrect === true));
});

test('combo 채점: 선택 옵션 members로 진술별 오판 자동 유도', () => {
  // '1'번 = [ㄱ,ㄴ] 선택 → ㄴ을 참으로 오판, ㄷ을 거짓으로 오판
  const r = gradeAnswer(combo, '1');
  assert.equal(r.correct, false);
  const byId = Object.fromEntries(r.perStatement.map(s => [s.id, s]));
  assert.equal(byId['ㄱ'].judgedCorrect, true);
  assert.equal(byId['ㄴ'].judgedCorrect, false); // O로 착각
  assert.equal(byId['ㄷ'].judgedCorrect, false); // 참인데 미포함
  assert.equal(byId['ㄹ'].judgedCorrect, true);
  assert.equal(byId['ㄴ'].userJudged, true);
  assert.equal(byId['ㄷ'].userJudged, false);
});

test('combo 채점: 2단계 모드 judgments가 members 유도보다 우선', () => {
  const r = gradeAnswer(combo, {
    optionId: '2',
    judgments: { 'ㄱ': true, 'ㄴ': true, 'ㄷ': true, 'ㄹ': false },
  });
  assert.equal(r.correct, true);
  const n = r.perStatement.find(s => s.id === 'ㄴ');
  assert.equal(n.userJudged, true);
  assert.equal(n.judgedCorrect, false);
});

test('combo 채점: 미응답 시 userJudged/judgedCorrect는 null', () => {
  const r = gradeAnswer(combo, undefined);
  assert.equal(r.correct, false);
  assert.ok(r.perStatement.every(s => s.userJudged === null && s.judgedCorrect === null));
});

// ── gradeAnswer: ox / short / single ────────────────────────

test('ox 채점: O/X 문자열·boolean 응답 모두 지원', () => {
  const q = { id: 'x', subject: 1, type: 'ox', points: 2, statement: 's', truth: false };
  assert.equal(gradeAnswer(q, 'X').correct, true);
  assert.equal(gradeAnswer(q, 'O').correct, false);
  assert.equal(gradeAnswer(q, false).correct, true);
  assert.equal(gradeAnswer(q, 'x').correct, true); // 소문자 허용
  assert.equal(gradeAnswer(q, 'X').correctAnswer, 'X');
});

test('short 채점: normalizeText로 표기 흔들림 흡수', () => {
  const q = { id: 'x', subject: 4, type: 'short', points: 10, accept: ['아미노산', 'amino acid'] };
  assert.equal(gradeAnswer(q, ' Amino Acid ').correct, true);
  assert.equal(gradeAnswer(q, '아미노산').correct, true);
  assert.equal(gradeAnswer(q, '지질').correct, false);
});

test('single 채점: correct 옵션 id 비교', () => {
  const q = SAMPLE_QUESTIONS.find(x => x.type === 'single');
  assert.equal(gradeAnswer(q, q.answer).correct, true);
  assert.equal(gradeAnswer(q, '1').correct, q.answer === '1');
});

// ── scoreExam ───────────────────────────────────────────────

test('scoreExam: 합격 경계 — 총점 정확히 60%·과목 정확히 40%는 합격', () => {
  // 정확한 60%/40% 경계 구성 (`>=` ↔ `>` 경계 변이 가드)
  const exact60 = scoreExam(
    [
      { id: 'p', subject: 1, type: 'short', points: 60, accept: ['x'] },
      { id: 'q', subject: 1, type: 'short', points: 40, accept: ['y'] },
    ],
    { p: 'x', q: '오답' }
  );
  assert.equal(exact60.totalPct, 0.6);
  assert.equal(exact60.passed, true, '총점 정확히 60%는 합격');

  const below60 = scoreExam(
    [
      { id: 'p', subject: 1, type: 'short', points: 59, accept: ['x'] },
      { id: 'q', subject: 1, type: 'short', points: 41, accept: ['y'] },
    ],
    { p: 'x', q: '오답' }
  );
  assert.equal(below60.passed, false, '59%는 불합격');

  // 과목 정확히 40% — 합격 (PASS_SUBJECT 경계)
  const exactSubj = scoreExam(
    [
      { id: 'p', subject: 1, type: 'short', points: 40, accept: ['x'] },
      { id: 'q', subject: 1, type: 'short', points: 60, accept: ['y'] },
    ],
    { p: 'x', q: '오답' }
  );
  assert.equal(exactSubj.bySubject[1].pct, 0.4);
  assert.equal(exactSubj.bySubject[1].pass, true, '과목 정확히 40%는 통과');
});

test('scoreExam: 응답 없는 문항은 0점 — max 0 문항은 pct 0', () => {
  const res = scoreExam(
    [{ id: 'z', subject: 1, type: 'short', points: 0, accept: ['x'] }],
    {}
  );
  assert.equal(res.bySubject[1].pct, 0);           // max=0 → 0 (NaN 방지 가드)
  assert.equal(res.passed, false);
});

test('scoreExam: 과목별 집계 + 총점 60%/과목 40% 판정', () => {
  const qs = [
    { id: 'a', subject: 1, type: 'short', points: 100, accept: ['x'] },
    { id: 'b', subject: 2, type: 'short', points: 250, accept: ['x'] },
    { id: 'c', subject: 3, type: 'short', points: 250, accept: ['x'] },
    { id: 'd', subject: 4, type: 'short', points: 400, accept: ['x'] },
  ];
  const all = scoreExam(qs, { a: 'x', b: 'x', c: 'x', d: 'x' });
  assert.equal(all.passed, true);
  assert.equal(all.totalPct, 1);

  // 과목4 전부 오답 → 과목4 과락으로 불합격 (총점 60%는 넘어도)
  const failSubj = scoreExam(qs, { a: 'x', b: 'x', c: 'x', d: '오답' });
  assert.equal(failSubj.bySubject[4].pass, false);
  assert.equal(failSubj.subjectPass, false);
  assert.equal(failSubj.passed, false);
  assert.ok(failSubj.totalPct >= 0.6, '총점은 60% 이상인데 과락으로 불합격이어야 함');
});

// ── generateComboOptions banFull ─────────────────────────────

test('generateComboOptions: banFull이면 전체집합 오지를 만들지 않음', () => {
    const allIds = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'];
    const opts = generateComboOptions(allIds, ['ㄱ'], { count: 5, banFull: true });
    assert.equal(opts.length, 5);
    assert.ok(!opts.some(o => o.members.length === allIds.length),
        '전체 진술 집합 오지가 포함되면 안 됨');
    // 정답 옵션은 반드시 존재
    assert.ok(opts.some(o => o.members.length === 1 && o.members[0] === 'ㄱ'));
});

test('generateComboOptions: 정답이 전체집합이면 banFull 없이 정상 생성', () => {
    const allIds = ['ㄱ', 'ㄴ', 'ㄷ'];
    const opts = generateComboOptions(allIds, ['ㄱ', 'ㄴ', 'ㄷ'], { count: 5 });
    assert.ok(opts.some(o => o.members.length === 3));
});

// ── perStatement text/conceptId ──────────────────────────────

test('gradeAnswer: correctAnswer 폴백 — answer 없으면 빈 문자열, short는 accept[0]', () => {
  // `q.answer || ''` / `(q.accept||[])[0] || ''` 폴백 변이 가드
  const single = gradeAnswer({ id: 's', type: 'single', points: 5, options: [{ id: '1' }, { id: '2' }] }, '1');
  assert.equal(single.correctAnswer, '', 'answer 필드 없으면 빈 문자열');

  const short = gradeAnswer({ id: 't', type: 'short', points: 5, accept: ['포름알데히드', 'formalin'] }, '포름알데히드');
  assert.equal(short.correctAnswer, '포름알데히드', '정답 표시는 accept 첫 항목');
  assert.equal(short.correct, true);

  const shortNoAccept = gradeAnswer({ id: 'u', type: 'short', points: 5 }, 'anything');
  assert.equal(shortNoAccept.correctAnswer, '');
  assert.equal(shortNoAccept.correct, false);
});

test('deriveComboAnswer: 정답 진술의 부분집합 옵션은 정답이 아니다', () => {
  // eq()의 `arr.length === truthSet.size` 변이 가드 — 크기 검사가 빠지면
  // 부분집합 옵션이 정답으로 오인됨
  const q = {
    statements: [
      { id: 'ㄱ', truth: true }, { id: 'ㄴ', truth: true }, { id: 'ㄷ', truth: false },
    ],
    options: [
      { id: '1', members: ['ㄱ'] },          // 부분집합 — 정답 아님
      { id: '2', members: ['ㄱ', 'ㄴ'] },    // 정답
      { id: '3', members: ['ㄱ', 'ㄴ', 'ㄷ'] }, // 상위집합 — 정답 아님
    ],
  };
  assert.equal(deriveComboAnswer(q), '2');
  // 정답 집합과 다른 옵션만 있으면 null
  const none = { statements: q.statements, options: [q.options[0], q.options[2]] };
  assert.equal(deriveComboAnswer(none), null);
  // every→some 변이 가드: 크기는 맞지만 거짓 진술을 섞은 옵션은 정답이 아니다
  const mixed = {
    statements: q.statements,
    options: [{ id: '1', members: ['ㄱ', 'ㄷ'] }, q.options[1]],
  };
  assert.equal(deriveComboAnswer(mixed), '2', 'ㄷ(거짓) 포함 옵션이 정답으로 오인되면 안 됨');
});

test('validateQuestion: combo 경계 — 진술 2개는 유효, citation 공백·진술 중복·옵션 역참조 검출', () => {
  const base = {
    id: 'c1', subject: 1, type: 'combo', points: 5, citation: 'p.1',
    statements: [
      { id: 'ㄱ', truth: true }, { id: 'ㄴ', truth: false },
    ],
    options: [{ id: '1', members: ['ㄱ'] }, { id: '2', members: ['ㄴ'] }],
  };
  assert.deepEqual(validateQuestion(base), [], '진술 2개는 유효 (statements.length < 2 경계)');

  // citation 공백만 있는 경우 — trim 후 빈 문자열 → 오류
  assert.ok(validateQuestion({ ...base, citation: '   ' }).some(e => e.includes('citation')));
  // 진술 id 중복
  const dup = { ...base, statements: [base.statements[0], { ...base.statements[0], truth: false }] };
  assert.ok(validateQuestion(dup).some(e => e.includes('중복')));
  // truth 키 자체가 없는 진술
  const noTruth = { ...base, statements: [{ id: 'ㄱ' }, { id: 'ㄴ', truth: true }] };
  assert.ok(validateQuestion(noTruth).some(e => e.includes('truth 누락')));
  // 옵션이 존재하지 않는 진술 id를 참조
  const badRef = { ...base, options: [{ id: '1', members: ['ㄱ'] }, { id: '2', members: ['ㅂ'] }] };
  assert.ok(validateQuestion(badRef).some(e => e.includes('없는 진술')));
});

test('validateQuestion: single 정답 0개·2개 모두 검출, answer↔correct 불일치', () => {
  const q = { id: 's1', subject: 1, type: 'single', points: 5, options: [{ id: '1' }, { id: '2' }] };
  assert.ok(validateQuestion(q).some(e => e.includes('single 정답 개수 0')));
  const two = { ...q, options: [{ id: '1', correct: true }, { id: '2', correct: true }] };
  assert.ok(validateQuestion(two).some(e => e.includes('single 정답 개수 2')));
  const mismatch = { ...q, answer: '2', options: [{ id: '1', correct: true }, { id: '2' }] };
  assert.ok(validateQuestion(mismatch).some(e => e.includes('불일치')));
});

test('gradeAnswer: perStatement에 진술 text·conceptId 포함', () => {
    const q = SAMPLE_QUESTIONS.find(x => x.type === 'combo');
    const res = gradeAnswer(q, { optionId: q.answer });
    const s0 = res.perStatement[0];
    assert.equal(s0.text, q.statements[0].text);
    assert.equal(s0.conceptId, q.statements[0].conceptId);
});
