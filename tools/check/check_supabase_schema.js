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
const SCHEMA_PATH = path.join(ROOT, 'tools', 'supabase', 'schema.sql');
const CONFIG_PATH = path.join(ROOT, 'src', 'auth-sync', 'supabase-config.js');
const PROBE_TIMEOUT_MS = 10_000;

/** schema.sql에서 `create table if not exists public.<name>` 추출 */
function declaredTables() {
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const out = new Set();
    for (const m of sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi)) {
        out.add(m[1]);
    }
    return [...out];
}

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
    if (!fs.existsSync(SCHEMA_PATH)) {
        console.error(`✗ schema.sql 부재: ${SCHEMA_PATH}`);
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
        console.error('  → Supabase 대시보드 → SQL Editor에서 tools/supabase/schema.sql 실행 (멱등 — 전체 재실행 가능)');
        process.exit(1);
    }
    if (unreachable.length) {
        console.log(`\n⚠ 프로브 불가 ${unreachable.length}건 — 검증 미완료로 통과 (네트워크·프로젝트 일시정지 확인)`);
        process.exit(0);
    }
    console.log(`\n✅ 전 테이블 적용 확인 (${tables.length}개)`);
}

main().catch((e) => { console.error('✗ 프로브 실패:', e); process.exit(1); });
