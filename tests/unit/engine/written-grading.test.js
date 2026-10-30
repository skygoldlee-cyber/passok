// tests/unit/written-grading.test.js — 주관식 AI 보조 채점 유닛 테스트
// @spec WP-07~08
// 설정 키 계약(디바이스 로컬), 프롬프트 구조, 응답 파싱, 점수 합산,
// fetch 목업 기반 gradeAnswer 오류 분기를 고정한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    AI_PROVIDERS, getAiProvider, saveAiProvider, getAiModel, saveAiModel,
    getAiKey, saveAiKey, clearAiKey, maskAiKey,
    buildGradingPrompt, parseGradingResponse, applyGrading, gradeAnswer,
    callProviderLLM
} from '../../../src/written/written-grading.js';
import { STORAGE_KEYS, BACKUP_KEYS } from '../../../src/storage-keys.js';
import { setItem } from '../../../src/storage.js';

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

const Q = {
    id: 'S1', type: '계산형', points: 15,
    problem: '보험금 계산', modelAnswer: '1. 피해율 25% 2. 보험금 150,000원',
    finalAnswer: '150,000 원',
    rubricItems: [
        { text: '피해율 산식', points: 5 },
        { text: '보험금 산정', points: 5 },
        { text: '단위 정확', points: 5 }
    ]
};

/* ---------- WP-07: 키·설정 계약 ---------- */

test('WP-07: 키는 디바이스 로컬 — 백업 대상 아님, 공급자·모델은 백업 대상', () => {
    assert.ok(!BACKUP_KEYS.includes(STORAGE_KEYS.WRITTEN_AI_KEY), '키가 백업 대상임');
    assert.ok(BACKUP_KEYS.includes(STORAGE_KEYS.WRITTEN_AI_PROVIDER));
    assert.ok(BACKUP_KEYS.includes(STORAGE_KEYS.WRITTEN_AI_MODEL));
});

test('WP-07: 공급자·모델·키 저장 계약', () => {
    assert.equal(getAiProvider(), 'gemini');           // 기본값
    saveAiProvider('openai');
    assert.equal(getAiProvider(), 'openai');
    saveAiProvider('bogus');
    assert.equal(getAiProvider(), 'openai');            // 잘못된 값은 무시
    assert.equal(getAiModel(), 'gpt-4o-mini');          // 공급자별 기본 모델
    saveAiModel('gpt-4o');
    assert.equal(getAiModel(), 'gpt-4o');
    saveAiModel('bad model!!');                          // 허용 외 문자 제거 후 저장
    assert.equal(getAiModel(), 'badmodel');
    saveAiModel('');                                     // 비우면 기본값으로 복귀
    assert.equal(getAiModel(), 'gpt-4o-mini');
    assert.equal(getAiKey(), '');
    assert.equal(saveAiKey('  '), false);               // 빈 키 거부
    saveAiKey('sk-test1234');
    assert.equal(getAiKey(), 'sk-test1234');
    assert.equal(maskAiKey(getAiKey()), 'sk-t••••1234');
    clearAiKey();
    assert.equal(getAiKey(), '');
    assert.ok(AI_PROVIDERS.length === 3);
});

test('WP-07: 저장소의 비정형 공급자·falsy 입력은 안전 폴백', () => {
    // 스코프 저장소에 직접 비정형 값 주입 → 공급자 폴백
    setItem(STORAGE_KEYS.WRITTEN_AI_PROVIDER, 'bogus');
    assert.equal(getAiProvider(), 'gemini');
    saveAiProvider(null);                               // falsy → 무시·현행 유지
    assert.equal(getAiProvider(), 'gemini');
    saveAiModel(null);                                  // falsy → 비움 → 기본 모델
    assert.equal(getAiModel(), 'gemini-3.8-flash');
    assert.equal(saveAiKey(null), false);
    assert.equal(maskAiKey(null), '');                  // 비문자열
    assert.equal(maskAiKey('   '), '');                 // 공백만
    assert.equal(maskAiKey('abcd'), '••••');            // 4자리 이하 전면 마스킹
});

/* ---------- WP-08: 프롬프트·파싱·합산 ---------- */

test('WP-08: 프롬프트 폴백 — rubric·모범답안·type·points·finalAnswer 부재', () => {
    const bare = { id: 'X1', problem: '서술 문제', rubricText: '자유 채점 기준' };
    const p = buildGradingPrompt(bare, 'ans');
    assert.ok(p.includes('X1 · 주관식 · 배점 ?점'), `폴백 라벨: ${p.split('\n')[0]}`);
    assert.ok(p.includes('(없음)'));
    assert.ok(p.includes('(체크리스트 없음) 자유 채점 기준'));
    assert.ok(!p.includes('## 최종 답'));
    // rubricText도 없으면 빈 문자열 폴백
    const p2 = buildGradingPrompt({ id: 'X2', problem: 'P' }, 'a');
    assert.ok(p2.includes('(체크리스트 없음)'));
});

test('WP-08: 프롬프트에 문제·모범답안·rubric·답안 포함', () => {
    const p = buildGradingPrompt(Q, '내 답안 텍스트');
    for (const s of ['보험금 계산', '피해율 25%', '150,000 원', '0: 피해율 산식 (5점)', '내 답안 텍스트']) {
        assert.ok(p.includes(s), `프롬프트 누락: ${s}`);
    }
});

test('WP-08: 응답 파싱 — 코드펜스·잡음 허용, 범위 외 항목 필터', () => {
    const text = '여기 결과입니다\n```json\n{"items":[{"i":0,"met":true,"feedback":"정확"},{"i":2,"met":false,"feedback":"단위 없음"},{"i":9,"met":true,"feedback":"범위외"}],"summary":"부분 정답"}\n```';
    const g = parseGradingResponse(text, 3);
    assert.equal(g.items.length, 2);              // i=9는 rubricCount 범위 외 → 필터
    assert.equal(g.items[0].i, 0);
    assert.equal(g.items[1].met, false);
    assert.equal(g.summary, '부분 정답');
    // 잘못된 응답 → null
    assert.equal(parseGradingResponse('', 3), null);
    assert.equal(parseGradingResponse('not json', 3), null);
    assert.equal(parseGradingResponse('{"foo":1}', 3), null);
    assert.equal(parseGradingResponse('{"items":[]}', 3), null);
});

test('WP-08: 파싱 엣지 — 깨진 JSON·비배열 items·비문자열·범위 외 i 필터', () => {
    assert.equal(parseGradingResponse('{items:[}', 3), null);       // JSON.parse 예외 경로
    assert.equal(parseGradingResponse('{"items":"x"}', 3), null);   // items 비배열
    assert.equal(parseGradingResponse(123, 3), null);               // 비문자열 입력
    // i 비정수·음수도 필터 — 유효 항목만 남는다
    const g = parseGradingResponse('{"items":[{"i":-1,"met":true},{"i":0.5,"met":true},{"i":1,"met":true,"feedback":"ok"}]}', 3);
    assert.equal(g.items.length, 1);
    assert.equal(g.items[0].i, 1);
});

test('WP-08: 점수는 LLM 산출이 아닌 클라이언트 합산', () => {
    const g = parseGradingResponse('{"items":[{"i":0,"met":true,"feedback":""},{"i":2,"met":true,"feedback":""}],"summary":""}', 3);
    const { met, score } = applyGrading(Q.rubricItems, g);
    assert.deepEqual(met, [true, false, true]);
    assert.equal(score, 10);                     // 5+5 — LLM score 필드 신뢰하지 않음
});

test('WP-08: applyGrading — 범위 외 i 무시·points 부재는 0점 합산', () => {
    const { met, score } = applyGrading(
        [{ text: 'a' }, { text: 'b', points: 4 }],
        { items: [{ i: 0, met: true }, { i: 9, met: true }, { i: -1, met: true }] });
    assert.deepEqual(met, [true, false]);
    assert.equal(score, 0);                      // points 부재 → (r.points||0)
});

/* ---------- WP-08: gradeAnswer 오류 분기 (fetch 목업) ---------- */

test('WP-08: gradeAnswer — nokey·noanswer·norubric 조기 반환', async () => {
    assert.equal((await gradeAnswer(Q, '답안')).code, 'nokey');
    saveAiKey('sk-x');
    assert.equal((await gradeAnswer(Q, '  ')).code, 'noanswer');
    assert.equal((await gradeAnswer({ ...Q, rubricItems: [] }, '답안')).code, 'norubric');
});

test('WP-08: gradeAnswer — 성공 응답 (gemini 형식)', async () => {
    saveAiKey('sk-x');
    const fetchImpl = async (url, init) => {
        assert.ok(url.includes('generateContent'));
        assert.equal(init.headers['x-goog-api-key'], 'sk-x');
        return {
            ok: true, status: 200,
            async json() {
                return { candidates: [{ content: { parts: [{ text: '{"items":[{"i":0,"met":true,"feedback":"ok"},{"i":1,"met":true,"feedback":"ok"},{"i":2,"met":false,"feedback":"단위 누락"}],"summary":"거의 정답"}' }] } }] };
            }
        };
    };
    const res = await gradeAnswer(Q, '피해율 25%, 보험금 150,000', { fetchImpl });
    assert.equal(res.ok, true);
    assert.equal(res.score, 10);
    assert.deepEqual(res.met, [true, true, false]);
    assert.equal(res.model, 'gemini-3.8-flash');
});

test('WP-08: gradeAnswer — 오류 코드 분기', async () => {
    saveAiKey('sk-x');
    const res401 = await gradeAnswer(Q, '답안', { fetchImpl: async () => ({ ok: false, status: 401 }) });
    assert.equal(res401.code, 'key');
    const res429 = await gradeAnswer(Q, '답안', { fetchImpl: async () => ({ ok: false, status: 429 }) });
    assert.equal(res429.code, 'quota');
    const resErr = await gradeAnswer(Q, '답안', { fetchImpl: async () => { throw new Error('net'); } });
    assert.equal(resErr.code, 'network');
    const resBad = await gradeAnswer(Q, '답안', {
        fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{ content: { parts: [{ text: 'no json' }] } }] }; } })
    });
    assert.equal(resBad.code, 'unreadable');
});

test('WP-08: gradeAnswer — openai·anthropic 요청 형식', async () => {
    saveAiProvider('openai');
    saveAiKey('sk-o');
    let seen;
    const fetchImpl = async (url, init) => {
        seen = { url, init };
        return { ok: true, status: 200, async json() { return { choices: [{ message: { content: '{"items":[{"i":0,"met":true,"feedback":""}],"summary":""}' } }] }; } };
    };
    const res = await gradeAnswer(Q, 'x', { fetchImpl });
    assert.equal(res.ok, true);
    assert.equal(seen.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(seen.init.headers['Authorization'], 'Bearer sk-o');
    const body = JSON.parse(seen.init.body);
    assert.equal(body.messages[0].role, 'system');
    assert.ok(body.messages[1].content.includes('rubric'));
    // anthropic — 브라우저 직접 접근 헤더 포함
    saveAiProvider('anthropic');
    saveAiKey('sk-a');
    const res2 = await gradeAnswer(Q, 'x', {
        fetchImpl: async (url, init) => {
            assert.equal(init.headers['anthropic-dangerous-direct-browser-access'], 'true');
            assert.equal(init.headers['x-api-key'], 'sk-a');
            return { ok: true, status: 200, async json() { return { content: [{ text: '{"items":[{"i":1,"met":true,"feedback":""}],"summary":""}' }] }; } };
        }
    });
    assert.equal(res2.ok, true);
    assert.deepEqual(res2.met, [false, true, false]);
});

test('WP-08: callProviderLLM — 키·fetch 부재 조기 반환', async () => {
    assert.equal((await callProviderLLM('sys', 'p')).code, 'nokey');
    saveAiKey('sk-x');
    const origFetch = globalThis.fetch;
    try {
        globalThis.fetch = undefined;                   // fetchImpl 부재 경로
        const res = await callProviderLLM('sys', 'p');
        assert.equal(res.code, 'network');
        // fetchImpl 미지정 시 글로벌 fetch 사용 경로 (스텁으로 대체해 실호출 차단)
        globalThis.fetch = async () => ({
            ok: true, status: 200,
            async json() { return { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }; }
        });
        const res2 = await callProviderLLM('sys', 'p');
        assert.equal(res2.ok, true);
        assert.equal(res2.text, 'ok');
    } finally { globalThis.fetch = origFetch; }
});

test('WP-08: callProviderLLM — AbortError는 aborted, 그 외 HTTP 오류 분기', async () => {
    saveAiKey('sk-x');
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    assert.equal((await callProviderLLM('s', 'p', { fetchImpl: async () => { throw abort; } })).code, 'aborted');
    assert.equal((await callProviderLLM('s', 'p', { fetchImpl: async () => ({ ok: false, status: 400 }) })).code, 'key');
    assert.equal((await callProviderLLM('s', 'p', { fetchImpl: async () => ({ ok: false, status: 403 }) })).code, 'key');
    const res500 = await callProviderLLM('s', 'p', { fetchImpl: async () => ({ ok: false, status: 500 }) });
    assert.equal(res500.code, 'http');
    assert.match(res500.error, /500/);
    const resBad = await callProviderLLM('s', 'p', {
        fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new Error('bad'); } })
    });
    assert.equal(resBad.code, 'unreadable');
});

test('WP-08: 공급자 계약 — system 미지정 생략·extract 엣지 빈 문자열', async () => {
    saveAiKey('sk-x');
    // openai — system 없으면 messages 1개, choices 부재 → ''
    saveAiProvider('openai');
    let body;
    const r1 = await callProviderLLM(null, 'p', {
        fetchImpl: async (u, i) => { body = JSON.parse(i.body); return { ok: true, status: 200, async json() { return { choices: [] }; } }; }
    });
    assert.equal(body.messages.length, 1);
    assert.equal(r1.ok, true);
    assert.equal(r1.text, '');
    // anthropic — system 키 생략, content 비배열·text 부재 → ''
    saveAiProvider('anthropic');
    const r2 = await callProviderLLM(null, 'p', {
        fetchImpl: async (u, i) => { body = JSON.parse(i.body); return { ok: true, status: 200, async json() { return {}; } }; }
    });
    assert.ok(!('system' in body));
    assert.equal(r2.text, '');
    const r3 = await callProviderLLM('sys', 'p', {
        fetchImpl: async () => ({ ok: true, status: 200, async json() { return { content: [{ no_text: 1 }] }; } })
    });
    assert.equal(r3.text, '');
    // gemini — candidates·parts 부재 → ''
    saveAiProvider('gemini');
    const r4 = await callProviderLLM(null, 'p', {
        fetchImpl: async (u, i) => { body = JSON.parse(i.body); return { ok: true, status: 200, async json() { return {}; } }; }
    });
    assert.ok(!('systemInstruction' in body));
    assert.equal(r4.text, '');
    const r5 = await callProviderLLM('sys', 'p', {
        fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{}] }; } })
    });
    assert.equal(r5.text, '');
    const r6 = await callProviderLLM('sys', 'p', {
        fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{ content: {} }] }; } })
    });
    assert.equal(r6.text, '');                          // content 부재 시 parts 체인 단절 → ''
    const r7 = await callProviderLLM('sys', 'p', {
        fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{ content: { parts: [{ no_text: 1 }] } }] }; } })
    });
    assert.equal(r7.text, '');                          // parts 존재·text 부재 → ''
});
