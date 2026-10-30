// tests/unit/ai-client.test.js — 런타임 AI 클라이언트 유닛 테스트
// @spec AI-25, AI-26, AI-27, AI-28, AI-29, AI-30, AI-33, AI-35, AI-36, AI-38
// 고정 프롬프트 계약(구조화 인자·길이 제한), 응답 파싱,
// 캐시 히트·서버→BYOK 폴백·쿼터 분기를 고정한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildWrongFeedbackPrompt, parseFeedbackResponse,
    aiFeedbackAvailable, requestWrongFeedback,
    buildWeeklyDiagnosisPrompt, requestWeeklyDiagnosis,
} from '../../../src/ai/ai-client.js';
import { saveAiKey } from '../../../src/written/written-grading.js';
import { ALLOWED_EVENTS } from '../../../src/telemetry/usage-telemetry.js';

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

let _mock, _origLS, _origWin;
beforeEach(() => {
    _mock = createMockStorage();
    _origLS = global.localStorage;
    _origWin = global.window;
    Object.defineProperty(global, 'localStorage', { value: _mock, writable: true, configurable: true });
    Object.defineProperty(global, 'window', {
        value: { EXAMS_LIST: { exams: [{ id: 'lossadj', name: 'x', default: true }] } },
        writable: true, configurable: true
    });
});
afterEach(() => {
    if (_origLS !== undefined) Object.defineProperty(global, 'localStorage', { value: _origLS, writable: true, configurable: true });
    else delete global.localStorage;
    if (_origWin !== undefined) Object.defineProperty(global, 'window', { value: _origWin, writable: true, configurable: true });
    else delete global.window;
});

const INPUT = {
    question: '맞춤형화장품 ___를 두어야 한다.',
    selected: '판매관리사',
    correct: '조제관리사',
    options: ['조제관리사', '판매관리사', '품질관리사'],
    citation: '화장품법 제3조 (제1과목 §1.2)',
};

/* ---------- AI-30: 고정 템플릿·구조화 인자 계약 ---------- */

test('AI-30: 프롬프트에 문항·오답·정답·선지·근거가 구조화된다', () => {
    const p = buildWrongFeedbackPrompt(INPUT);
    for (const s of [INPUT.question, '판매관리사', '조제관리사', '1. 조제관리사', '화장품법 제3조']) {
        assert.ok(p.includes(s), `프롬프트 누락: ${s}`);
    }
    assert.ok(p.includes('"confused_concept"'));
});

test('AI-30: 필수 인자(문항·오답·정답) 부족 시 null', () => {
    assert.equal(buildWrongFeedbackPrompt({ question: 'q' }), null);
    assert.equal(buildWrongFeedbackPrompt({ question: 'q', selected: 'x' }), null);
    assert.equal(buildWrongFeedbackPrompt({ question: ' ', selected: 'x', correct: 'y' }), null);
});

test('AI-30: 인자 길이 상한 — 초과분은 잘린다', () => {
    const p = buildWrongFeedbackPrompt({ ...INPUT, question: '가'.repeat(5000), citation: '나'.repeat(1000) });
    assert.ok(p.length < 5000);
    assert.ok(p.includes('가'.repeat(3000)));
    assert.ok(!p.includes('나'.repeat(601)));
});

test('AI-27: 응답 파싱 — 코드펜스·잡음 허용, explain 필수', () => {
    const g = parseFeedbackResponse('앞머리\n```json\n{"explain":"해설","confused_concept":"조제관리사"}\n```');
    assert.deepEqual(g, { explain: '해설', confused: '조제관리사' });
    assert.equal(parseFeedbackResponse('{"explain":""}'), null);
    assert.equal(parseFeedbackResponse('no json'), null);
    assert.equal(parseFeedbackResponse(''), null);
});

/* ---------- AI-27/29: 호출 분기 ---------- */

test('AI-27: 서버 성공 — 세션 토큰 첨부, 결과·잔여 반환, 캐시 기록', async () => {
    let seen;
    const fetchImpl = async (url, init) => {
        seen = { url, init };
        return { ok: true, status: 200, json: async () => ({ ok: true, explain: '서버 해설', confused: '혼동개념', remaining: 9 }) };
    };
    const res = await requestWrongFeedback(INPUT, {
        session: { access_token: 'tok-1' }, fetchImpl,
    });
    assert.equal(res.ok, true);
    assert.equal(res.route, 'server');
    assert.equal(res.explain, '서버 해설');
    assert.equal(res.remaining, 9);
    assert.equal(seen.init.headers['Authorization'], 'Bearer tok-1');
    const sent = JSON.parse(seen.init.body);
    assert.equal(sent.kind, 'wrong_feedback');
    assert.equal(sent.input.question, INPUT.question);

    // 캐시 히트 — 동일 입력 재요청은 fetch를 호출하지 않는다
    const res2 = await requestWrongFeedback(INPUT, {
        session: { access_token: 'tok-1' },
        fetchImpl: async () => { throw new Error('should not fetch'); },
    });
    assert.equal(res2.ok, true);
    assert.equal(res2.route, 'cache');
    assert.equal(res2.explain, '서버 해설');
});

test('AI-28: ai_feature 이벤트가 텔레메트리 전송 allowlist에 등록돼 있다', () => {
    assert.ok(ALLOWED_EVENTS.has('ai_feature'));
});

test('AI-26: 쿼터 초과(429)는 폴백하지 않고 quota로 반환', async () => {
    saveAiKey('sk-x'); // BYOK 키가 있어도 쿼터 응답은 폴백 대상이 아니다
    const res = await requestWrongFeedback(INPUT, {
        session: { access_token: 'tok' },
        fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ ok: false, code: 'quota', remaining: 0 }) }),
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'quota');
    assert.equal(res.remaining, 0);
});

test('AI-29: 서버 실패 시 BYOK 폴백 — gemini 응답 형식 해석', async () => {
    saveAiKey('sk-x');
    let url;
    const res = await requestWrongFeedback(INPUT, {
        session: { access_token: 'tok' }, // 서버 먼저 시도 → 500 → BYOK로
        fetchImpl: async (u) => {
            url = u;
            if (u.includes('ai-proxy')) return { ok: false, status: 500, json: async () => ({}) };
            return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"explain":"폴백 해설","confused_concept":"개념"}' }] } }] }) };
        },
    });
    assert.equal(res.ok, true);
    assert.equal(res.route, 'byok');
    assert.equal(res.explain, '폴백 해설');
    assert.ok(url.includes('generateContent'));
});

test('AI-29: 미로그인+BYOK 키 → 서버를 건너뛰고 BYOK로 처리', async () => {
    saveAiKey('sk-x');
    const res = await requestWrongFeedback(INPUT, {
        session: null,
        fetchImpl: async (u) => {
            assert.ok(!u.includes('ai-proxy'), '미로그인 시 서버 호출은 없어야 함');
            return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"explain":"byok"}' }] } }] }) };
        },
    });
    assert.equal(res.ok, true);
    assert.equal(res.route, 'byok');
});

test('AI-29: 미로그인+키 없음 → unauthorized (호출부는 기능 은닉)', async () => {
    assert.equal(await aiFeedbackAvailable({ session: null }), false);
    const res = await requestWrongFeedback(INPUT, { session: null });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'unauthorized');
});

/* ---------- AI-33: 자연어 주간 진단 ---------- */

const DIAG = {
    solvedWeek: 42, planWeek: 60, wrongWeek: 15, weekRate: 64, rateDelta: -5,
    dday: 73, projectedCoverage: 71, neededPerDay: 42,
    topCluster: '조제관리사 배치 의무', weakestSubject: '화장품법의 이해',
};

test('AI-33: weekly_diagnosis 프롬프트는 집계 수치·라벨만 구조화한다', () => {
    const p = buildWeeklyDiagnosisPrompt(DIAG);
    for (const s of ['42문', '계획 60문', '오답: 15문', '64%', 'D-73', '71%', '조제관리사 배치 의무', '화장품법의 이해']) {
        assert.ok(p.includes(s), `프롬프트 누락: ${s}`);
    }
    assert.ok(p.includes('"confused_concept"'));
    // 핵심 수치가 하나도 없으면 null (라벨만으로는 호출 불가)
    assert.equal(buildWeeklyDiagnosisPrompt({ topCluster: 'x' }), null);
    // 부분 수치만 있어도 조립됨
    assert.ok(buildWeeklyDiagnosisPrompt({ dday: 30 }).includes('D-30'));
});

test('AI-33: 서버 경로 — kind=weekly_diagnosis 전송, 응답 정규화', async () => {
    let sent;
    const res = await requestWeeklyDiagnosis(DIAG, {
        session: { access_token: 'tok' },
        fetchImpl: async (u, init) => {
            sent = { url: u, body: JSON.parse(init.body) };
            return { ok: true, status: 200, json: async () => ({ ok: true, explain: '오답률이 높습니다 — 취약 과목 복습을 늘리세요.', confused_concept: '취약 과목', remaining: 7 }) };
        },
    });
    assert.equal(res.ok, true);
    assert.equal(res.route, 'server');
    assert.equal(res.explain, '오답률이 높습니다 — 취약 과목 복습을 늘리세요.');
    assert.equal(sent.body.kind, 'weekly_diagnosis');
    assert.equal(sent.body.input.solvedWeek, 42);
    // 캐시 — 입력 수치가 같으면 재호출 없음
    const res2 = await requestWeeklyDiagnosis(DIAG, { session: { access_token: 't' },
        fetchImpl: async () => { throw new Error('should not fetch'); } });
    assert.equal(res2.route, 'cache');
});

test('AI-38: requestWeakQuizGen — kind=quiz_gen 전송 + items 응답 정규화', async () => {
    const { requestWeakQuizGen } = await import('../../../src/ai/ai-client.js');
    let sent;
    const res = await requestWeakQuizGen({ cluster: '약점', existing: ['q1'], count: 2 }, {
        session: { access_token: 'tok' },
        fetchImpl: async (u, init) => {
            sent = JSON.parse(init.body);
            return { ok: true, status: 200, json: async () => ({ ok: true, items: [{ question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 'a', citation: '제3조' }], remaining: 5 }) };
        },
    });
    assert.equal(res.ok, true);
    assert.equal(res.route, 'server');
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].citation, '제3조');
    assert.equal(sent.kind, 'quiz_gen');
});

test('AI-35: requestPlanAdjust — kind=plan_adjust + 여유 선택지 구조화 전송', async () => {
    const { requestPlanAdjust, buildPlanAdjustPrompt } = await import('../../../src/ai/ai-client.js');
    const p = buildPlanAdjustPrompt({ solvedWeek: 10, bandwidth: '부족' });
    assert.ok(p.includes('시간 부족(줄여야 함)'));
    assert.ok(p.includes('조정 지시'));
    assert.equal(buildPlanAdjustPrompt({ bandwidth: '넉넉' }), null); // 수치 없으면 null
    let sent;
    const res = await requestPlanAdjust({ solvedWeek: 10, bandwidth: '넉넉' }, {
        session: { access_token: 'tok' },
        fetchImpl: async (u, init) => {
            sent = JSON.parse(init.body);
            return { ok: true, status: 200, json: async () => ({ ok: true, explain: '여유가 있으니 취약 과목 배분을 늘리세요.', remaining: 4 }) };
        },
    });
    assert.equal(res.ok, true);
    assert.equal(sent.kind, 'plan_adjust');
    assert.equal(sent.input.bandwidth, '넉넉');
});

test('AI-36: requestTextbookQA — 경계형 질문+근거 스니펫, answer/citations 정규화', async () => {
    const { requestTextbookQA, buildTextbookQaPrompt, parseQaResponse } = await import('../../../src/ai/ai-client.js');
    const p = buildTextbookQaPrompt({ question: '합성계면활성제란?', evidence: ['계면활성제는 두 가지 기원으로…', '합성계면활성제의 정의는…'] });
    assert.ok(p.includes('<user_input>합성계면활성제란?</user_input>'));
    assert.ok(p.includes('[1] 계면활성제'));
    assert.equal(buildTextbookQaPrompt({ question: 'x', evidence: [] }), null);  // 근거 없으면 null
    assert.equal(buildTextbookQaPrompt({ question: 'x'.repeat(300), evidence: ['e'] }).includes('x'.repeat(250)), false); // 200자 절단
    // 서버 경로
    let sent;
    const res = await requestTextbookQA({ question: '정의?', evidence: ['근거1'] }, {
        session: { access_token: 'tok' },
        fetchImpl: async (u, init) => {
            sent = JSON.parse(init.body);
            return { ok: true, status: 200, json: async () => ({ ok: true, answer: '근거에 따르면…', citations: ['1'], remaining: 3 }) };
        },
    });
    assert.equal(res.ok, true);
    assert.equal(res.answer, '근거에 따르면…');
    assert.deepEqual(res.citations, ['1']);
    assert.equal(sent.kind, 'textbook_qa');
    // BYOK 파서
    assert.deepEqual(parseQaResponse('{"answer":"a","citations":["1","3"]}'), { answer: 'a', citations: ['1', '3'] });
    assert.equal(parseQaResponse('{}'), null);
});
