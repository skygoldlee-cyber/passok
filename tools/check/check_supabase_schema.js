#!/usr/bin/env node
/**
 * check_supabase_schema.js — 프로덕션 Supabase 스키마 적용 상태 프로브
 * @spec none (관측성 게이트)
 *
 * 배경: tools/supabase/schema.sql은 "SQL Editor에서 수동 실행" 절차라,
 * 파일에 선언만 있고 프로덕션에 적용되지 않은 테이블이 생길 수 있다
 * (2026-10-22 실측: usage_events·client_errors·feedback·pro_codes 미적용 —
 *  익명 insert는 조용히 실패하므로 텔레메트리 전량 손실을 장기간 탐지 못함).
 *
 * 동작:
 *   1. schema.sql에서 `create table if not exists public.X` 목록 추출
 *   2. supabase-config.js의 URL·publishable key로 각 테이블에 GET 프로브
 *   3. PostgREST PGRST205(스키마 캐시 미등록)면 "테이블 부재"로 판정
 *
 * 판정:
 *   실패 — 프로젝트가 정상 응답하는데 선언 테이블이 스키마 캐시에 없음
 *   경고 — 네트워크 불가·5xx·프로젝트 일시정지 (검증 불가 — 차단하지 않음.
 *          일시정지 감시는 Supabase Keep-Alive 워크플로가 담당)
 *   통과 — 전 테이블 존재 / Supabase 미설정(자리표시자)이면 스킵
 *
 * 사용법:
 *   node tools/check/check_supabase_schema.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA_DIR = path.join(ROOT, 'tools', 'supabase');
const CONFIG_PATH = path.join(ROOT, 'src', 'auth-sync', 'supabase-config.js');
const PROBE_TIMEOUT_MS = 10_000;
const { loadEnv } = require('../lib/env.js');

/** 플랫폼 + 시험별 스키마 파일 수집 — tools/supabase/schema.sql + exams/<id>/schema.sql (DA-13) */
function schemaFiles() {
    const files = [path.join(SCHEMA_DIR, 'schema.sql')].filter(f => fs.existsSync(f));
    const examsDir = path.join(SCHEMA_DIR, 'exams');
    if (fs.existsSync(examsDir))
        for (const d of fs.readdirSync(examsDir)) {
            const f = path.join(examsDir, d, 'schema.sql');
            if (fs.existsSync(f)) files.push(f);
        }
    return files;
}

/** 스키마 파일들에서 `create table if not exists public.<name>` 추출 */
function declaredTables() {
    const out = new Set();
    for (const f of schemaFiles())
        for (const m of fs.readFileSync(f, 'utf8').matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi))
            out.add(m[1]);
    return [...out];
}

/**
 * 대상 프로젝트 연결 정보 — 기본은 supabase-config.js의 공개 상수(운영),
 * `TEST_SUPABASE_URL`+`TEST_SUPABASE_ANON_KEY` env가 둘 다 있으면 테스트
 * 프로젝트를 프로브한다 (J-102 스키마 검증 — DSN-46 §3-1-1).
 */
function readConfig() {
    loadEnv();
    const src = fs.readFileSync(CONFIG_PATH, 'utf8');
    let url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1] || '';
    let key = src.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/)?.[1] || '';
    if (process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_ANON_KEY) {
        url = process.env.TEST_SUPABASE_URL;
        key = process.env.TEST_SUPABASE_ANON_KEY;
    }
    return { url, key };
}

function isConfigured({ url, key }) {
    return url.startsWith('https://') && url.includes('.supabase.co') && key.length > 0;
}

/** 테이블 1개 프로브 → { status: 'ok'|'missing'|'unreachable', detail } */
async function probeTable(baseUrl, key, table) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=0`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
            signal: ctrl.signal,
        });
        const body = await res.text();
        // PGRST205 = 스키마 캐시에 테이블 없음 — PostgREST는 테이블 부재를 이 코드로 반환.
        // RLS로 조회가 차단돼도 테이블이 존재하면 [] 등 다른 응답이 온다.
        if (body.includes('PGRST205')) return { status: 'missing', detail: body.slice(0, 160) };
        if (res.status >= 500) return { status: 'unreachable', detail: `HTTP ${res.status}` };
        return { status: 'ok', detail: `HTTP ${res.status}` };
    } catch (e) {
        return { status: 'unreachable', detail: e.name === 'AbortError' ? 'timeout' : String(e.message || e) };
    } finally {
        clearTimeout(timer);
    }
}

async function main() {
    console.log('▶ Supabase 스키마 적용 상태 프로브');
    if (!schemaFiles().length) {
        console.error(`✗ 스키마 파일 부재: ${SCHEMA_DIR}`);
        process.exit(1);
    }
    const { url, key } = readConfig();
    if (!isConfigured({ url, key })) {
        console.log('⊘ Supabase 미설정(자리표시자) — 스킵');
        process.exit(0);
    }
    const tables = declaredTables();
    console.log(`  대상: ${url} · 선언 테이블 ${tables.length}개 (${tables.join(', ')})`);

    const missing = [], unreachable = [];
    for (const t of tables) {
        const r = await probeTable(url, key, t);
        if (r.status === 'missing') { missing.push(t); console.log(`  ✗ ${t} — 스키마 캐시에 없음`); }
        else if (r.status === 'unreachable') { unreachable.push(`${t} (${r.detail})`); console.log(`  ⚠ ${t} — ${r.detail}`); }
        else console.log(`  ✓ ${t}`);
    }

    if (missing.length) {
        console.error(`\n✗ 스키마 미적용 테이블 ${missing.length}개: ${missing.join(', ')}`);
        console.error('  → Supabase 대시보드 → SQL Editor에서 해당 스키마 파일 실행 (tools/supabase/schema.sql·exams/<id>/schema.sql, 멱등)');
        process.exit(1);
    }
    if (unreachable.length) {
        console.log(`\n⚠ 프로브 불가 ${unreachable.length}건 — 검증 미완료로 통과 (네트워크·프로젝트 일시정지 확인)`);
        process.exit(0);
    }
    console.log(`\n✅ 전 테이블 적용 확인 (${tables.length}개)`);
}

main().catch((e) => { console.error('✗ 프로브 실패:', e); process.exit(1); });
