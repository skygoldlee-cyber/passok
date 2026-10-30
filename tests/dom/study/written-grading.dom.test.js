// tests/dom/study/written-grading.dom.test.js — 주관식 AI 채점 분기 커버리지
// @spec WP-07~08
// 유닛(node:test·c8)과 별도 좌표로 계측되는 vitest 커버리지 보강 — 설정 폴백·
// 프롬프트 폴백·응답 파싱·공급자 호출 오류 분기를 jsdom 환경에서 실행한다.
// (DOM 검증이 아닌 모듈 분기 실행 — coverage_merge 병합 지표 대상)

import { describe, it, beforeEach, expect } from 'vitest';
import {
    getAiProvider, saveAiProvider, getAiModel, saveAiModel,
    getAiKey, saveAiKey, clearAiKey, maskAiKey,
    buildGradingPrompt, parseGradingResponse, applyGrading,
    callProviderLLM, gradeAnswer,
} from '../../../src/written/written-grading.js';
import { setItem } from '../../../src/storage.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

const Q = {
    id: 'S1', type: '계산형', points: 15,
    problem: '보험금 계산', modelAnswer: '1. 피해율 25% 2. 보험금 150,000원',
    rubricItems: [
        { text: '피해율 산식', points: 5 },
        { text: '보험금 산정', points: 5 },
        { text: '단위 정확', points: 5 }
    ]
};

describe('WP-07: 설정 폴백 분기', () => {
    beforeEach(() => { localStorage.clear(); });

    it('비정형 공급자·falsy 입력은 안전 폴백', () => {
        setItem(STORAGE_KEYS.WRITTEN_AI_PROVIDER, 'bogus');
        expect(getAiProvider()).toBe('gemini');            // 비공급자 → 폴백
        saveAiProvider(null);
        expect(getAiProvider()).toBe('gemini');            // falsy → 무시·현행 유지
        saveAiModel('gemini-2.5-flash');
        expect(getAiModel()).toBe('gemini-2.5-flash');     // 정상 저장·조회
        saveAiModel(null);
        expect(getAiModel()).toBe('gemini-3.8-flash');     // falsy → 기본 모델
        expect(saveAiKey(null)).toBe(false);
        expect(maskAiKey(null)).toBe('');                  // 비문자열
        expect(maskAiKey('   ')).toBe('');                 // 공백만
        expect(maskAiKey('abcd')).toBe('••••');            // 4자리 이하 전면 마스킹
        saveAiKey('sk-long-key');
        expect(maskAiKey(getAiKey())).toBe('sk-l••••-key');
        clearAiKey();
        expect(getAiKey()).toBe('');
    });
});

describe('WP-08: 프롬프트·파싱·합산 분기', () => {
    beforeEach(() => { localStorage.clear(); });

    it('프롬프트 폴백 — rubric·모범답안·type·points·finalAnswer 부재', () => {
        const p = buildGradingPrompt({ id: 'X1', problem: '서술 문제', rubricText: '자유 기준' }, 'ans');
        expect(p).toContain('X1 · 주관식 · 배점 ?점');
        expect(p).toContain('(없음)');
        expect(p).toContain('(체크리스트 없음) 자유 기준');
        expect(p).not.toContain('## 최종 답');
        const p2 = buildGradingPrompt({ id: 'X2', problem: 'P' }, 'a');
        expect(p2).toContain('(체크리스트 없음)');
    });

    it('파싱 엣지 — 깨진 JSON·비배열 items·비문자열·범위 외 i 필터', () => {
        expect(parseGradingResponse('{items:[}', 3)).toBeNull();
        expect(parseGradingResponse('{"items":"x"}', 3)).toBeNull();
        expect(parseGradingResponse(123, 3)).toBeNull();
        const g = parseGradingResponse('{"items":[{"i":-1,"met":true},{"i":0.5,"met":true},{"i":1,"met":true,"feedback":"ok"}]}', 3);
        expect(g.items).toHaveLength(1);
        expect(g.items[0].i).toBe(1);
        // 전 항목 필터 → null (items.length 가드)
        expect(parseGradingResponse('{"items":[{"i":9,"met":true}]}', 3)).toBeNull();
    });

    it('applyGrading — 범위 외 i 무시·points 부재는 0점 합산', () => {
        const { met, score } = applyGrading(
            [{ text: 'a' }, { text: 'b', points: 4 }],
            { items: [{ i: 0, met: true }, { i: 9, met: true }, { i: -1, met: true }] });
        expect(met).toEqual([true, false]);
        expect(score).toBe(0);
    });
});

describe('WP-08: 공급자 호출 분기 (fetchImpl 주입)', () => {
    beforeEach(() => { localStorage.clear(); });

    it('callProviderLLM — 키·fetch 부재 조기 반환', async () => {
        expect((await callProviderLLM('sys', 'p')).code).toBe('nokey');
        saveAiKey('sk-x');
        const origFetch = globalThis.fetch;
        try {
            globalThis.fetch = undefined;
            expect((await callProviderLLM('sys', 'p')).code).toBe('network');
            // fetchImpl 미지정 시 글로벌 fetch 사용 경로 (스텁으로 대체해 실호출 차단)
            globalThis.fetch = async () => ({
                ok: true, status: 200,
                async json() { return { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }; }
            });
            const res2 = await callProviderLLM('sys', 'p');
            expect(res2.ok).toBe(true);
            expect(res2.text).toBe('ok');
        } finally { globalThis.fetch = origFetch; }
    });

    it('callProviderLLM — AbortError·HTTP 오류 코드 분기', async () => {
        saveAiKey('sk-x');
        const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
        expect((await callProviderLLM('s', 'p', { fetchImpl: async () => { throw abort; } })).code).toBe('aborted');
        expect((await callProviderLLM('s', 'p', { fetchImpl: async () => { throw new Error('net'); } })).code).toBe('network');
        expect((await callProviderLLM('s', 'p', { fetchImpl: async () => ({ ok: false, status: 400 }) })).code).toBe('key');
        expect((await callProviderLLM('s', 'p', { fetchImpl: async () => ({ ok: false, status: 429 }) })).code).toBe('quota');
        expect((await callProviderLLM('s', 'p', { fetchImpl: async () => ({ ok: false, status: 500 }) })).code).toBe('http');
        const resBad = await callProviderLLM('s', 'p', {
            fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new Error('bad'); } })
        });
        expect(resBad.code).toBe('unreadable');
    });

    it('공급자 계약 — system 미지정 생략·extract 엣지 빈 문자열', async () => {
        saveAiKey('sk-x');
        let body;
        saveAiProvider('openai');
        const r1 = await callProviderLLM(null, 'p', {
            fetchImpl: async (u, i) => { body = JSON.parse(i.body); return { ok: true, status: 200, async json() { return { choices: [] }; } }; }
        });
        expect(body.messages).toHaveLength(1);           // system 메시지 생략
        expect(r1.text).toBe('');                         // choices 부재 → ''
        const r1b = await callProviderLLM(null, 'p', {
            fetchImpl: async () => ({ ok: true, status: 200, async json() { return { choices: [{}] }; } })
        });
        expect(r1b.text).toBe('');                        // message 부재 → ''
        saveAiProvider('anthropic');
        const r2 = await callProviderLLM(null, 'p', {
            fetchImpl: async (u, i) => { body = JSON.parse(i.body); return { ok: true, status: 200, async json() { return {}; } }; }
        });
        expect('system' in body).toBe(false);
        expect(r2.text).toBe('');                         // content 부재 → ''
        const r2b = await callProviderLLM('sys', 'p', {
            fetchImpl: async () => ({ ok: true, status: 200, async json() { return { content: [{ no_text: 1 }] }; } })
        });
        expect(r2b.text).toBe('');                        // text 부재 → ''
        saveAiProvider('gemini');
        const r3 = await callProviderLLM(null, 'p', {
            fetchImpl: async (u, i) => { body = JSON.parse(i.body); return { ok: true, status: 200, async json() { return { candidates: [{}] }; } }; }
        });
        expect('systemInstruction' in body).toBe(false);
        expect(r3.text).toBe('');                         // content 부재 → ''
        const r3b = await callProviderLLM('sys', 'p', {
            fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{ content: {} }] }; } })
        });
        expect(r3b.text).toBe('');                        // parts 부재 → ''
        const r3c = await callProviderLLM('sys', 'p', {
            fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{ content: { parts: [{ no_text: 1 }] } }] }; } })
        });
        expect(r3c.text).toBe('');                        // parts 존재·text 부재 → ''
    });

    it('gradeAnswer — 조기 반환·성공·파싱 실패 분기', async () => {
        expect((await gradeAnswer(Q, '답안')).code).toBe('nokey');
        saveAiKey('sk-x');
        expect((await gradeAnswer(Q, '  ')).code).toBe('noanswer');
        expect((await gradeAnswer({ ...Q, rubricItems: [] }, '답안')).code).toBe('norubric');
        const ok = await gradeAnswer(Q, '피해율 25%, 보험금 150,000', {
            fetchImpl: async () => ({
                ok: true, status: 200,
                async json() { return { candidates: [{ content: { parts: [{ text: '{"items":[{"i":0,"met":true,"feedback":""},{"i":1,"met":true,"feedback":""},{"i":2,"met":false,"feedback":"단위 없음"}],"summary":""}' }] } }] }; }
            })
        });
        expect(ok.ok).toBe(true);
        expect(ok.score).toBe(10);
        expect(ok.met).toEqual([true, true, false]);
        const bad = await gradeAnswer(Q, '답안', {
            fetchImpl: async () => ({ ok: true, status: 200, async json() { return { candidates: [{ content: { parts: [{ text: 'no json' }] } }] }; } })
        });
        expect(bad.code).toBe('unreadable');
        // LLM 호출 실패는 그대로 전파 (res.ok false 경로)
        const fail = await gradeAnswer(Q, '답안', { fetchImpl: async () => ({ ok: false, status: 429 }) });
        expect(fail.code).toBe('quota');
        expect(fail.ok).toBe(false);
    });
});
