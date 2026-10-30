#!/usr/bin/env node
/**
 * llm_client.js — LLM 공급자 추상화
 * @spec AI-02
 *
 * AI_PROVIDER=openai|anthropic|gemini (기본 openai), 키는 AI_API_KEY 또는
 * 공급자별 키(OPENAI_API_KEY·ANTHROPIC_API_KEY·GEMINI_API_KEY).
 * 키는 .env/환경변수 로컬 전용 — 저장소·번들 포함 금지 (설계 §2-4).
 *
 * --dry-run / 키 부재 시 complete()가 {dryRun:true} 를 반환하고 호출하지 않는다 —
 * 키 없이도 도구 동작(스캔·초안 골격·프롬프트 기록)을 검증 가능.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { DRAFT_DIR } = require('./lib/ai_common.js');

const PROVIDERS = {
    openai: {
        env: 'OPENAI_API_KEY',
        defaultModel: 'gpt-4o-mini',
        url: 'https://api.openai.com/v1/chat/completions',
        buildBody: (model, system, prompt, maxTokens) => ({
            model, max_tokens: maxTokens,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: prompt },
            ],
        }),
        headers: key => ({ 'Authorization': `Bearer ${key}` }),
        extract: j => ({ text: j.choices?.[0]?.message?.content || '', usage: j.usage }),
    },
    anthropic: {
        env: 'ANTHROPIC_API_KEY',
        defaultModel: 'claude-haiku-4-5-20251001',
        url: 'https://api.anthropic.com/v1/messages',
        buildBody: (model, system, prompt, maxTokens) => ({
            model, max_tokens: maxTokens,
            ...(system ? { system } : {}),
            messages: [{ role: 'user', content: prompt }],
        }),
        headers: key => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
        extract: j => ({
            text: (j.content || []).map(b => b.text || '').join(''),
            usage: j.usage,
        }),
    },
    gemini: {
        env: 'GEMINI_API_KEY',
        defaultModel: 'gemini-3.8-flash',
        // key는 쿼리 파라미터 — buildUrl에서 처리
        buildBody: (model, system, prompt) => ({
            contents: [{ parts: [{ text: prompt }] }],
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        }),
        headers: () => ({}),
        extract: j => ({
            text: (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''),
            usage: j.usageMetadata,
        }),
        buildUrl: (model, key) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    },
};

function providerName() {
    return (process.env.AI_PROVIDER || 'openai').toLowerCase();
}
function apiKey() {
    const p = PROVIDERS[providerName()];
    return process.env.AI_API_KEY || (p ? process.env[p.env] : undefined);
}
function modelName() {
    const p = PROVIDERS[providerName()];
    return process.env.AI_MODEL || (p ? p.defaultModel : undefined);
}
function isAvailable() {
    return !!PROVIDERS[providerName()] && !!apiKey();
}

function logUsage(rec) {
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
    fs.appendFileSync(path.join(DRAFT_DIR, '_llm_usage.jsonl'),
        JSON.stringify({ ts: new Date().toISOString(), ...rec }) + '\n');
}

/**
 * 텍스트 완성. dryRun/키 부재 시 API를 호출하지 않고 {dryRun:true} 반환.
 * @returns {Promise<{text,usage}|{dryRun:true,prompt:string}>}
 */
async function complete(prompt, { system, maxTokens = 2000, dryRun = false, retries = 3 } = {}) {
    const prov = PROVIDERS[providerName()];
    if (!prov) throw new Error(`지원하지 않는 AI_PROVIDER: ${providerName()}`);
    if (dryRun || !apiKey()) {
        logUsage({ provider: providerName(), model: modelName(), dryRun: true, promptChars: prompt.length });
        return { dryRun: true, prompt };
    }
    const model = modelName();
    const url = prov.buildUrl ? prov.buildUrl(model, apiKey()) : prov.url;
    const body = prov.buildBody(model, system, prompt, maxTokens);
    const headers = { 'Content-Type': 'application/json', ...prov.headers(apiKey()) };

    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            if (res.status === 429 || res.status >= 500) {
                lastErr = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
                await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
            const json = await res.json();
            const out = prov.extract(json);
            logUsage({ provider: providerName(), model, usage: out.usage, promptChars: prompt.length });
            return { text: out.text, usage: out.usage };
        } catch (e) {
            lastErr = e;
            if (attempt < retries - 1) await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
        }
    }
    throw lastErr;
}

/** JSON 출력 요구 + 코드펜스 제거 + 파싱. 실패 시 null 반환(호출측에서 폐기 표시). */
async function completeJson(prompt, opts = {}) {
    const res = await complete(prompt + '\n\n응답은 반드시 유효한 JSON만 출력하라. 코드펜스·설명문 금지.', opts);
    if (res.dryRun) return res;
    const text = res.text.replace(/```(?:json)?/g, '').trim();
    try {
        return { data: JSON.parse(text), usage: res.usage };
    } catch {
        return { data: null, raw: text, usage: res.usage };
    }
}

module.exports = { complete, completeJson, providerName, modelName, isAvailable, PROVIDERS };
