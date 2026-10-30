// tests/unit/ai-client.test.js — 런타임 AI 클라이언트 유닛 테스트
// @spec AI-27, AI-29, AI-30
// 고정 프롬프트 계약(구조화 인자·길이 제한), 응답 파싱,
// 캐시 히트·서버→BYOK 폴백·쿼터 분기를 고정한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildWrongFeedbackPrompt, parseFeedbackResponse,
    aiFeedbackAvailable, requestWrongFeedback,
} from '../../../src/ai/ai-client.js';
import { saveAiKey } from '../../../src/written/written-grading.js';

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
