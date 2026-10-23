#!/usr/bin/env node
/**
 * apply_schema.js — tools/supabase/schema.sql을 프로덕션에 Management API로 적용
 * @spec none (운영 도구)
 *
 * 배경: schema.sql 적용은 "SQL Editor 수동 실행" 절차라 미적용 드리프트가 생겼다
 *   (2026-10-22 — usage_events 등 3개 테이블 장기 미적용). PAT를 .env에 두면
 *   이 스크립트로 적용→검증을 한 번에 수행한다.
 *
 * 인증: SUPABASE_ACCESS_TOKEN (Personal Access Token, .env 또는 env)
 *   발급: https://supabase.com/dashboard/account/tokens — scoped 권장
 *   (이 프로젝트만 + Database read-write — read-only는 SELECT만 되고 DDL 403)
 *
 * 동작:
 *   1. schema.sql 전체를 POST /v1/projects/{ref}/database/query 로 실행 (멱등)
 *   2. check_supabase_schema.js 프로브로 적용 결과 검증
 *
 * 사용법:
 *   node tools/supabase/apply_schema.js            # 적용 + 검증
 *   node tools/supabase/apply_schema.js --dry-run  # 대상·권한만 확인 (실행 안 함)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadEnv, ROOT } = require('../lib/env.js');

const SCHEMA_PATH = path.join(ROOT, 'tools', 'supabase', 'schema.sql');
const CONFIG_PATH = path.join(ROOT, 'src', 'auth-sync', 'supabase-config.js');
const CHECK_SCRIPT = path.join(ROOT, 'tools', 'check', 'check_supabase_schema.js');
const MGMT_API = 'https://api.supabase.com';
const TIMEOUT_MS = 60_000;

/** 프로젝트 ref — SUPABASE_URL env 우선, 없으면 supabase-config.js에서 추출 */
function projectRef() {
    const envUrl = process.env.SUPABASE_URL;
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
        console.error('✗ SUPABASE_ACCESS_TOKEN 미설정 — Personal Access Token을 루트 .env에 추가하세요.');
        console.error('  발급: https://supabase.com/dashboard/account/tokens');
        console.error('  scoped 권장: 이 프로젝트만 + Database read-write (read-only는 DDL 불가)');
        process.exit(1);
    }
    return token;
}

async function applySchema(token, ref, sql) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${MGMT_API}/v1/projects/${ref}/database/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
            signal: ctrl.signal,
        });
        const body = await res.text();
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new Error(
                    `HTTP ${res.status} — 토큰 인증/권한 부족. Database read-write 스코프 확인.\n  응답: ${body.slice(0, 300)}`,
                );
            }
            throw new Error(`HTTP ${res.status} — ${body.slice(0, 500)}`);
        }
        return body;
    } finally {
        clearTimeout(timer);
    }
}

async function main() {
    loadEnv();
    const dryRun = process.argv.includes('--dry-run');
    const token = requireToken();
    const { ref, url } = projectRef();
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const tableCount = (sql.match(/create\s+table\s+if\s+not\s+exists/gi) || []).length;

    console.log(`▶ 대상: ${url} (ref: ${ref})`);
    console.log(`▶ 스키마: tools/supabase/schema.sql (${sql.length}자 · 선언 테이블 ${tableCount}개)`);

    if (dryRun) {
        console.log('⊘ --dry-run — 실행하지 않았습니다 (토큰·ref·파일 확인 완료)');
        return;
    }

    console.log('▶ Management API로 스키마 적용 중…');
    const result = await applySchema(token, ref, sql);
    const parsed = JSON.parse(result);
    console.log(`✓ 실행 완료 (반환 행: ${Array.isArray(parsed) ? parsed.length : '-'})`);

    console.log('\n▶ 적용 검증 (check_supabase_schema.js)…');
    const probe = spawnSync(process.execPath, [CHECK_SCRIPT], { stdio: 'inherit' });
    process.exit(probe.status === 0 ? 0 : 1);
}

main().catch((e) => { console.error('✗ 적용 실패:', e.message || e); process.exit(1); });
