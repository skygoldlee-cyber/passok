/**
 * supabase_ops.js — 운영 CLI 공용 Supabase 접근 (service role, 로컬 전용)
 * @spec AD-06 (관리자 운영 CLI — docs/dev/design/ADMIN_DESIGN.md §5 Phase 1)
 *
 * report:feedback·report:user·admin:grant-pro가 공유하는 인증·조회·쓰기 헬퍼.
 * Secret(구 service_role) 키는 RLS를 우회하는 관리자 자격이므로
 * SUPABASE_SECRET_KEY env로만 전달한다 — 파일·인자·커밋 금지.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./env');

/** SUPABASE_URL env 우선, 미설정 시 src/auth-sync/supabase-config.js에서 읽음 */
function supabaseUrl() {
    loadEnv();
    if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, '');
    const cfg = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'auth-sync', 'supabase-config.js'), 'utf8');
    const m = cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
    if (!m) throw new Error('src/auth-sync/supabase-config.js에서 SUPABASE_URL을 읽지 못했습니다');
    return m[1];
}

/**
 * Secret 키 요구 — 미설정 시 안내를 출력하고 null 반환 (호출자가 폴백 출력 후 종료)
 * @param {string} [scriptName] 안내에 표시할 스크립트 경로
 * @returns {string|null}
 */
function requireSecret(scriptName) {
    loadEnv();
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (secret) return secret;
    console.error('SUPABASE_SECRET_KEY 미설정 — Secret(구 service_role) 키를 루트 .env 또는 env로 전달하세요.');
    console.error('  .env: SUPABASE_SECRET_KEY=sb_secret_...  (한 줄 추가)');
    console.error('  PowerShell: $env:SUPABASE_SECRET_KEY="sb_secret_..."'
        + (scriptName ? ` ; node ${scriptName}` : ''));
    return null;
}

/**
 * PostgREST 조회 (service role — RLS 우회. service role 자격이기 때문에
 * 이 함수로 읽을 수 있는 것은 운영 목적으로만, payload 같은 사용자 콘텐츠는
 * 호출자가 select 컬럼으로 제한해야 한다)
 * @param {string} secret SUPABASE_SECRET_KEY
 * @param {string} table 스키마 public의 테이블명
 * @param {string} query PostgREST 쿼리스트링 (select=...&order=...)
 * @returns {Promise<Array>} 행 배열
 */
async function restGet(secret, table, query) {
    const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?${query}`, {
        headers: { apikey: secret, authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
        console.error(`${table} 조회 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        process.exit(1);
    }
    return res.json();
}

/**
 * restGet 페이지네이션 — 서버 max-rows(기본 1000) 상한에 걸려도 offset으로 전량 회수.
 * PostgREST는 limit보다 서버 max-rows가 우선이라 대량 기간 조회는 단발로는 부족하다.
 * @param {string} secret SUPABASE_SECRET_KEY
 * @param {string} table 스키마 public의 테이블명
 * @param {string} query select·필터·order 쿼리스트링 (limit 제외 — 내부에서 페이지 크기 지정)
 * @param {{pageSize?:number, maxRows?:number}} [opts]
 * @returns {Promise<Array>} 전체 행 배열
 */
async function restGetAll(secret, table, query, opts = {}) {
    const pageSize = opts.pageSize || 1000;
    const maxRows = opts.maxRows || 50_000;
    const out = [];
    for (let offset = 0; offset < maxRows; offset += pageSize) {
        const res = await fetch(
            `${supabaseUrl()}/rest/v1/${table}?${query}&limit=${pageSize}&offset=${offset}`,
            { headers: { apikey: secret, authorization: `Bearer ${secret}` } },
        );
        if (!res.ok) {
            console.error(`${table} 조회 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
            process.exit(1);
        }
        const rows = await res.json();
        out.push(...rows);
        if (rows.length < pageSize) break;
    }
    if (out.length >= maxRows) {
        console.error(`⚠ ${table}: maxRows(${maxRows}) 상한 도달 — 기간을 좁혀 재조회하세요.`);
    }
    return out;
}

/**
 * PostgREST 갱신 (service role — RLS 우회)
 * @param {string} secret SUPABASE_SECRET_KEY
 * @param {string} table 테이블명
 * @param {string} query 필터 쿼리스트링 (예: 'id=eq.<uuid>')
 * @param {object} body PATCH body
 * @returns {Promise<Array>} Prefer: return=representation 결과
 */
async function restPatch(secret, table, query, body) {
    const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers: {
            apikey: secret, authorization: `Bearer ${secret}`,
            'content-type': 'application/json', prefer: 'return=representation',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        console.error(`${table} 갱신 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        process.exit(1);
    }
    return res.json();
}

/**
 * GoTrue Admin API로 이메일 → auth.users 행 해석.
 * profiles에 email 컬럼이 없으므로(Phase 1은 스키마 변경 없음) 서버 측 목록에서 찾는다.
 * @param {string} secret SUPABASE_SECRET_KEY
 * @param {string} email 찾을 이메일 (대소문자 무시)
 * @returns {Promise<object|null>} user 행 또는 null
 */
async function findUserByEmail(secret, email) {
    const target = String(email).trim().toLowerCase();
    if (!target) throw new Error('이메일이 비어 있습니다');
    for (let page = 1; page <= 50; page++) {
        const res = await fetch(`${supabaseUrl()}/auth/v1/admin/users?page=${page}&per_page=200`, {
            headers: { apikey: secret, authorization: `Bearer ${secret}` },
        });
        if (!res.ok) {
            console.error(`admin/users 조회 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
            process.exit(1);
        }
        const data = await res.json();
        const users = Array.isArray(data) ? data : (data.users || []);
        const hit = users.find((u) => String(u.email || '').toLowerCase() === target);
        if (hit) return hit;
        if (users.length < 200) return null; // 마지막 페이지 — 없음
    }
    return null;
}

module.exports = { supabaseUrl, requireSecret, restGet, restGetAll, restPatch, findUserByEmail };
