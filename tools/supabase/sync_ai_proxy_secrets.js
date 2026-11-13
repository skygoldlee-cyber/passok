#!/usr/bin/env node
/**
 * sync_ai_proxy_secrets.js — .env의 AI 프록시 설정을 Supabase secrets로 동기화
 * @spec AI-25,AI-26 (ai-proxy 운영 설정)
 *
 * ai-proxy Edge Function은 Supabase 프로젝트의 secret store를 읽는다 — 루트
 * .env는 로컬 전용이라 함수 런타임에 도달하지 않는다. 본 스크립트는 .env의
 * 선택 키만 Management API로 올려 런타임 설정을 일치시킨다.
 *
 * 매핑:
 *   AI_PROXY_GOOGLE_API_KEY → GOOGLE_API_KEY   (미설정 시 GEMINI_API_KEY,
 *                                                AI_PROVIDER=gemini면 AI_API_KEY 폴백)
 *   GEMINI_MODEL            → GEMINI_MODEL     (미설정 시 기본 gemini-3.8-flash)
 *   AI_FREE_DAILY           → AI_FREE_DAILY    (선택 — 비우면 함수 기본값 유지)
 *
 * 사용법:
 *   node tools/supabase/sync_ai_proxy_secrets.js --dry-run   # 매핑만 확인 (기본)
 *   node tools/supabase/sync_ai_proxy_secrets.js --apply     # secrets 적용
 *   node tools/supabase/sync_ai_proxy_secrets.js --check     # secret 이름 존재 확인
 *   node tools/supabase/sync_ai_proxy_secrets.js --apply --prod   # 운영 ref 명시 승인
 *   --only=GEMINI_MODEL,AI_FREE_DAILY                        # 일부 키만 처리
 *
 * 인증: SUPABASE_ACCESS_TOKEN (Management API PAT — apply_schema.js와 동일).
 * 대상: SUPABASE_URL env 우선, 없으면 src/auth-sync/supabase-config.js의 ref.
 * 시크릿 값은 절대 출력하지 않는다.
 */
'use strict';
const fs = require('fs');
const { loadEnv, ROOT } = require('../lib/env.js');

const CONFIG_PATH = require('path').join(ROOT, 'src', 'auth-sync', 'supabase-config.js');
const MGMT_API = 'https://api.supabase.com';
const TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = 'gemini-3.8-flash';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY = args.includes('--apply');
const CHECK = args.includes('--check');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').replace('--only=', '')
    .split(',').map(s => s.trim()).filter(Boolean);

function prodRef() {
    const src = fs.readFileSync(CONFIG_PATH, 'utf8');
    const url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1] || '';
    return url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || '';
}

function projectRef() {
    const envUrl = (process.env.SUPABASE_URL || '').trim();
    const url = envUrl || (() => {
        const src = fs.readFileSync(CONFIG_PATH, 'utf8');
        const m = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
        return m ? m[1] : '';
    })();
    const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (!ref) throw new Error(`프로젝트 ref를 찾지 못했습니다 (url='${url}')`);
    return { ref, url };
}

function requireToken() {
    const token = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
    if (!token) {
        console.error('✗ SUPABASE_ACCESS_TOKEN 미설정 — Management API PAT를 루트 .env에 추가하세요.');
        process.exit(1);
    }
    return token;
}

function envFirst(...keys) {
    for (const k of keys) {
        const v = (process.env[k] || '').trim();
        if (v) return { key: k, value: v };
    }
    return null;
}

/** .env → ai-proxy secret 매핑 해석 */
function plannedSecrets() {
    const provider = (process.env.AI_PROVIDER || '').toLowerCase();
    const keySrc = envFirst('AI_PROXY_GOOGLE_API_KEY', 'GEMINI_API_KEY')
        || (provider === 'gemini' ? envFirst('AI_API_KEY') : null);
    const modelSrc = envFirst('GEMINI_MODEL')
        || (provider === 'gemini' ? envFirst('AI_MODEL') : null);
    const daily = (process.env.AI_FREE_DAILY || '').trim();

    const secrets = [
        {
            name: 'GOOGLE_API_KEY',
            value: keySrc ? keySrc.value : '',
            source: keySrc ? keySrc.key : '(미설정)',
            secret: true,
            required: true,
        },
        {
            name: 'GEMINI_MODEL',
            value: modelSrc ? modelSrc.value : DEFAULT_MODEL,
            source: modelSrc ? modelSrc.key : `기본값(${DEFAULT_MODEL})`,
            secret: false,
            required: true,
        },
    ];
    if (daily) {
        if (!/^\d+$/.test(daily) || Number(daily) < 1) {
            throw new Error(`AI_FREE_DAILY 형식 오류 — 양의 정수여야 합니다 (값 길이 ${daily.length})`);
        }
        secrets.push({ name: 'AI_FREE_DAILY', value: daily, source: 'AI_FREE_DAILY', secret: false, required: false });
    }
    const filtered = ONLY.length ? secrets.filter(s => ONLY.includes(s.name)) : secrets;
    for (const s of filtered) {
        if (s.required && !s.value) throw new Error(`${s.name}에 매핑할 값이 없습니다 — ${s.source}`);
        if (s.name === 'GEMINI_MODEL' && !/^[a-zA-Z0-9._-]+$/.test(s.value)) {
            throw new Error('GEMINI_MODEL 형식 오류 — [a-zA-Z0-9._-]만 허용합니다');
        }
    }
    return filtered;
}

async function mgmt(token, method, path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${MGMT_API}${path}`, {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: ctrl.signal,
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Management API HTTP ${res.status} — ${text.slice(0, 400)}`);
        return text ? JSON.parse(text) : null;
    } finally {
        clearTimeout(timer);
    }
}

function mask(v) {
    return v ? `${v.slice(0, 4)}••••${v.slice(-4)}` : '(없음)';
}

async function main() {
    loadEnv();
    if (!DRY_RUN && !APPLY && !CHECK) {
        console.log('사용법: --dry-run | --apply [--prod] | --check · 선택 --only=NAME,...');
        process.exit(1);
    }
    const token = requireToken();
    const { ref, url } = projectRef();
    const isProd = ref === prodRef();
    console.log(`▶ 대상: ${url} (ref: ${ref}${isProd ? ' · 운영' : ' · 비운영'})`);

    if (CHECK) {
        const list = await mgmt(token, 'GET', `/v1/projects/${ref}/secrets`);
        const names = new Set((Array.isArray(list) ? list : []).map(s => s.name));
        const wanted = ['GOOGLE_API_KEY', 'GEMINI_MODEL', 'AI_FREE_DAILY'];
        for (const n of wanted) console.log(`${names.has(n) ? '✓' : '✗'} ${n}`);
        return;
    }

    const secrets = plannedSecrets();
    console.log('▶ 적용 예정 시크릿:');
    for (const s of secrets) {
        console.log(`   ${s.name}  ← ${s.source} = ${s.secret ? mask(s.value) : s.value}`);
    }
    if (!APPLY) {
        console.log('⊘ --dry-run/계획 모드 — Management API를 호출하지 않았습니다.');
        return;
    }
    if (isProd && !args.includes('--prod')) {
        console.error('✗ 대상이 운영 프로젝트입니다 — 적용하려면 --prod 승인이 필요합니다.');
        process.exit(1);
    }

    await mgmt(token, 'POST', `/v1/projects/${ref}/secrets`,
        secrets.map(s => ({ name: s.name, value: s.value })));
    console.log('✓ ai-proxy secrets 동기화 완료 — 값은 로그에 기록하지 않았습니다');
    console.log('  함수 재배포 없이 다음 호출부터 적용됩니다 (GEMINI_MODEL/AI_FREE_DAILY)');
}

main().catch((e) => { console.error('✗ 실패:', e.message || e); process.exit(1); });
