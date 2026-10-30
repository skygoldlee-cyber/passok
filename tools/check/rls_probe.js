#!/usr/bin/env node
/**
 * rls_probe.js — Supabase RLS 익명 침투 검증 (EVAL_2026-10-30 권고)
 * @spec none (보안 검증 프로브)
 *
 * 배경: schema.sql의 RLS 정책은 "선언"일 뿐, 프로덕션에 실제 적용·강제되는지는
 * 익명 키로 침투를 시도해야 확인된다 (check_supabase_schema.js는 테이블 존재만 본다).
 * SUPABASE_PUBLISHABLE_KEY는 공개 키 — 공격자가 쥘 수 있는 최대 권한으로
 * 보호 대상 접근이 차단되는지 실측한다.
 *
 * 검증 항목 (tools/supabase/schema.sql §4~§6 기대값):
 *   1. select 차단 — profiles·sync_snapshots·pro_codes·feedback·
 *      client_errors·usage_events에 anon select → 행 0건 (유출 시 즉시 실패)
 *   2. insert 차단 — profiles·sync_snapshots·pro_codes에 anon insert → 4xx 거부
 *      (RLS 위반 42501 또는 정책 부재 거부)
 *   3. 스푸핑 차단 — feedback에 가짜 user_id insert → 거부
 *      (with check: user_id is null or user_id = auth.uid())
 *   4. RPC 차단 — redeem_code에 anon 호출 → 거부 (revoke execute from anon)
 *   ※ insert 허용 테이블(feedback·client_errors·usage_events)에는 실제 행을
 *     쓰지 않는다 — 익명 insert는 설계상 허용이며 프로덕션 오염 방지.
 *
 * 한계: 인증 사용자 간(교차 사용자) 격리는 anon 키로 검증 불가 — 실계정 2개의
 * 수동 절차는 docs/dev/runbooks/WHEN_THINGS_BREAK.md 보안 절에 기술.
 *
 * 판정: 실패 — 차단되어야 할 접근이 허용되거나 행이 유출됨
 *       경고 — 네트워크 불가·프로젝트 일시정지 (검증 불가 — 차단하지 않음)
 *       통과 — 전 항목 차단 확인 / Supabase 미설정이면 스킵
 *
 * 사용법:
 *   node tools/check/rls_probe.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT, 'src', 'auth-sync', 'supabase-config.js');
const PROBE_TIMEOUT_MS = 10_000;

/** supabase-config.js에서 공개 연결 정보 추출 (정적 파일 — 공개 키라 파싱 안전) */
function readConfig() {
    const src = fs.readFileSync(CONFIG_PATH, 'utf8');
    const url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
    const key = src.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/);
    return { url: url?.[1] || '', key: key?.[1] || '' };
}

function isConfigured({ url, key }) {
    return url.startsWith('https://') && url.includes('.supabase.co') && key.length > 0;
}

async function req(url, key, method, pathName, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(`${url}/rest/v1/${pathName}`, {
            method,
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: ctrl.signal,
        });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { /* 비-JSON 응답 */ }
        return { status: res.status, json, text };
    } finally {
        clearTimeout(timer);
    }
}

/** select 차단 프로브 — 행이 1건이라도 반환되면 유출 실패 */
async function probeSelectDenied(url, key, table) {
    try {
        const r = await req(url, key, 'GET', `${table}?select=*&limit=3`);
        if (r.status >= 500) return { ok: null, detail: `HTTP ${r.status}` };
        const rows = Array.isArray(r.json) ? r.json : [];
        if (rows.length > 0) return { ok: false, detail: `행 ${rows.length}건 유출` };
        // 2xx+빈 배열 또는 4xx 거부 — 어느 쪽이든 행은 새지 않음
        return { ok: true, detail: `HTTP ${r.status} · 행 0` };
    } catch (e) {
        return { ok: null, detail: String(e.message || e) };
    }
}

/** 쓰기 거부 프로브 — 2xx면 실패 (실제 거부라 행은 쓰이지 않음) */
async function probeWriteDenied(url, key, pathName, body, label) {
    try {
        const r = await req(url, key, 'POST', pathName, body);
        if (r.status >= 500) return { ok: null, detail: `HTTP ${r.status}` };
        if (r.status < 300) return { ok: false, detail: `HTTP ${r.status} — ${label} 허용됨` };
        return { ok: true, detail: `HTTP ${r.status} 거부` };
    } catch (e) {
        return { ok: null, detail: String(e.message || e) };
    }
}

async function main() {
    console.log('▶ Supabase RLS 익명 침투 검증 (anon 키 = 공격자 최대 권한)');
    const { url, key } = readConfig();
    if (!isConfigured({ url, key })) {
        console.log('⊘ Supabase 미설정(자리표시자) — 스킵');
        process.exit(0);
    }
    console.log(`  대상: ${url}`);

    const results = [];
    const check = (name, r) => {
        results.push({ name, ...r });
        const mark = r.ok === true ? '✓' : r.ok === false ? '✗' : '⚠';
        console.log(`  ${mark} ${name} — ${r.detail}`);
    };

    // 1) select 차단 — 보호 테이블 전수 (행 유출 = 실패)
    for (const t of ['profiles', 'sync_snapshots', 'pro_codes', 'feedback', 'client_errors', 'usage_events']) {
        check(`select ${t}`, await probeSelectDenied(url, key, t));
    }

    // 2) insert 차단 — 정책 부재 테이블 (거부 응답 = RLS 강제 입증)
    const fakeId = '00000000-0000-4000-8000-000000000001';
    check('insert profiles', await probeWriteDenied(url, key, 'profiles',
        { id: fakeId, plan: 'pro' }, '익명 insert'));
    check('insert sync_snapshots', await probeWriteDenied(url, key, 'sync_snapshots',
        { user_id: fakeId, data: {} }, '익명 insert'));
    check('insert pro_codes', await probeWriteDenied(url, key, 'pro_codes',
        { code: 'RLS_PROBE', valid_days: 1 }, '익명 insert'));

    // 3) 스푸핑 차단 — insert 허용 테이블의 with check 우회 시도
    check('feedback 타인 user_id 스푸핑', await probeWriteDenied(url, key, 'feedback',
        { kind: 'bug', body: 'rls probe', user_id: fakeId }, '스푸핑 insert'));

    // 4) RPC 차단 — redeem_code는 authenticated 전용
    check('rpc redeem_code (anon)', await probeWriteDenied(url, key, 'rpc/redeem_code',
        { p_code: 'RLS_PROBE' }, '익명 RPC'));

    const failed = results.filter((r) => r.ok === false);
    const unknown = results.filter((r) => r.ok === null);
    if (failed.length) {
        console.error(`\n✗ RLS 침투 허용 ${failed.length}건: ${failed.map((r) => r.name).join(', ')}`);
        console.error('  → Supabase 대시보드에서 schema.sql §4 RLS 정책 적용 상태 확인');
        process.exit(1);
    }
    if (unknown.length) {
        console.log(`\n⚠ 프로브 불가 ${unknown.length}건 — 검증 미완료로 통과 (네트워크·프로젝트 일시정지 확인)`);
        process.exit(0);
    }
    console.log(`\n✅ 전 항목 차단 확인 (${results.length}개 프로브 — 익명 유출·쓰기·스푸핑·RPC)`);
}

main().catch((e) => { console.error('✗ 프로브 실패:', e); process.exit(1); });
