#!/usr/bin/env node
/**
 * seed_test_accounts.js — J-102용 테스트 Supabase 프로젝트 계정·데이터 시드
 * @spec none (E2E 기반 — DSN-46 §3-2)
 *
 * Admin REST API(service role)로 테스트 계정을 멱등 시드한다 — 매 E2E 실행 전에
 * 돌려도 동일 상태로 복원된다. service role은 RLS를 우회하는 관리자 자격이므로
 * TEST Supabase 프로젝트에만 사용한다 — 운영 ref·운영 Secret 키 감지 시 즉시 중단.
 *
 * 필요 env (.env 또는 셸):
 *   TEST_SUPABASE_URL              — https://<test-ref>.supabase.co
 *   TEST_SUPABASE_SERVICE_ROLE_KEY — 테스트 프로젝트 Secret(구 service_role) 키
 *   TEST_E2E_PASSWORD              — 시드 계정 공통 비밀번호 (시크릿으로만 관리)
 *
 * 사용법:
 *   node tools/supabase/seed_test_accounts.js            # 시드 적용
 *   node tools/supabase/seed_test_accounts.js --dry-run  # 계획만 출력
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEnv, ROOT } = require('../lib/env.js');

const PROD_CONFIG = path.join(ROOT, 'src', 'auth-sync', 'supabase-config.js');
const DRY_RUN = process.argv.includes('--dry-run');
const PER_PAGE = 200;

/**
 * 시드 계약 — J-102 스펙이 이 상수 상태를 전제로 단언한다.
 * 변경 시 j-102 스펙의 기대값을 함께 갱신할 것.
 *
 * payload 키는 비스코프 논리 키 — sync.js의 collectSyncPayload가
 * safeGetItem(논리키)로 수집하므로 payload에는 'carework:' 접두사가 없다.
 * applyPayload도 SYNC_STATIC 화이트리스트를 비스코프 키로 검사한다 —
 * 스코프 키를 넣으면 pull 시 무시되어 복원 검증이 불가하다.
 *
 * 전 계정 plan='pro' 시드 — cloud_sync는 feature-plan.json상 pro 기능이라
 * syncPlanFromProfile이 로그인 시 profiles.plan을 정본으로 적용한다.
 * profiles가 free면 로컬 entitlement가 지워져 push가 조용히 차단된다.
 */
const SEED_ACCOUNTS = [
    {
        // 가입 직후 — 동기화 이력 없음 (첫 push·온보딩 검증)
        email: 'e2e-new@passok.test',
        snapshot: null,
    },
    {
        // 학습 이력 시드 — 재로그인 시 클라우드 진도 복원 검증
        email: 'e2e-active@passok.test',
        snapshot: {
            exam_id: 'carework',
            device_id: 'e2e-seed',
            payload: {
                // e2e_seed_marker는 SYNC_STATIC에 없어 pull 시 적용되지 않는
                // 행 식별용 메타데이터 — 스펙은 REST로 행을 조회해 단언한다
                'e2e_seed_marker': 'active',
                'sim_results_history': JSON.stringify([
                    {
                        examId: 'integrated', score: 52, total: 80, rate: 65,
                        date: '2026-01-01T00:00:00.000Z', seeded: true,
                    },
                ]),
            },
        },
    },
    {
        // 동기화 충돌 — 클라우드 payload가 로컬과 다름 (충돌 해결·last-write 검증)
        email: 'e2e-sync@passok.test',
        snapshot: {
            exam_id: 'carework',
            device_id: 'e2e-seed-conflict',
            payload: {
                'e2e_seed_marker': 'cloud-side',
                'sim_results_history': JSON.stringify([
                    {
                        examId: 'integrated', score: 40, total: 80, rate: 50,
                        date: '2026-01-02T00:00:00.000Z', seeded: true,
                    },
                ]),
            },
            // 어제 시각 — 로컬 신규 쓰기가 우선해야 하는 시나리오용
            updated_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
    },
    {
        // J-520~522 기관 워크스페이스 — 기관 생성·관리책임자 (UI로 create_facility 호출)
        // 멤버십은 스펙이 매 실행 service role로 정리·재시드 (재실행 멱등)
        email: 'e2e-facility-admin@passok.test',
        snapshot: null,
    },
    {
        // J-520~522 기관 워크스페이스 — 초대 코드로 가입하는 요양보호사
        email: 'e2e-facility-member@passok.test',
        snapshot: null,
    },
];

function testUrl() {
    loadEnv();
    const url = (process.env.TEST_SUPABASE_URL || '').replace(/\/$/, '');
    if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
        throw new Error('TEST_SUPABASE_URL 미설정 또는 형식 오류 — https://<ref>.supabase.co 형태로 .env에 설정하세요');
    }
    return url;
}

function serviceKey() {
    const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';
    if (!key) throw new Error('TEST_SUPABASE_SERVICE_ROLE_KEY 미설정 — 테스트 프로젝트 Secret 키를 .env에 설정하세요 (저장소 기록 금지)');
    return key;
}

function seedPassword() {
    const pw = process.env.TEST_E2E_PASSWORD || '';
    if (pw.length < 8) throw new Error('TEST_E2E_PASSWORD 미설정 또는 8자 미만 — 시드 계정 공통 비밀번호를 .env에 설정하세요');
    return pw;
}

/** 운영 오염 차단 — 테스트 URL이 운영 ref와 같거나, 키가 운영 Secret과 같으면 중단 */
function assertNotProduction(url, key) {
    const src = fs.readFileSync(PROD_CONFIG, 'utf8');
    const prodUrl = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1] || '';
    if (url === prodUrl.replace(/\/$/, '')) {
        throw new Error('TEST_SUPABASE_URL이 운영 프로젝트를 가리킵니다 — 중단 (운영 DB 쓰기 금지)');
    }
    if (key && key === process.env.SUPABASE_SECRET_KEY) {
        throw new Error('TEST_SUPABASE_SERVICE_ROLE_KEY가 운영 Secret 키와 동일합니다 — 중단');
    }
}

function headers(key) {
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function adminFetch(base, key, pathname, init = {}) {
    const res = await fetch(`${base}/auth/v1${pathname}`, { ...init, headers: headers(key) });
    const body = await res.text();
    if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathname} → HTTP ${res.status}: ${body.slice(0, 200)}`);
    return body ? JSON.parse(body) : null;
}

/** email → user id 맵 (테스트 프로젝트는 소규모라 단일 페이지로 충분) */
async function listUsers(base, key) {
    const data = await adminFetch(base, key, `/admin/users?page=1&per_page=${PER_PAGE}`);
    const users = data.users || data || [];
    return new Map(users.map((u) => [u.email, u.id]));
}

async function upsertUser(base, key, email, password, existing) {
    if (existing) {
        await adminFetch(base, key, `/admin/users/${existing}`, {
            method: 'PUT', body: JSON.stringify({ password, email_confirm: true }),
        });
        return { id: existing, action: 'password-reset' };
    }
    const created = await adminFetch(base, key, '/admin/users', {
        method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
    });
    return { id: created.id || created.user?.id, action: 'created' };
}

/** profiles.plan='pro' 부여 — pro_expires_at=null은 관리자 무기한 부여 (pro-redeem.js 주석) */
async function upsertProfile(base, key, userId) {
    const res = await fetch(`${base}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id: userId, plan: 'pro', pro_expires_at: null }),
    });
    if (!res.ok) throw new Error(`profiles upsert → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function upsertSnapshot(base, key, userId, snap) {
    const row = {
        user_id: userId,
        exam_id: snap.exam_id,
        device_id: snap.device_id,
        payload: snap.payload,
        updated_at: snap.updated_at || new Date().toISOString(),
    };
    const res = await fetch(`${base}/rest/v1/sync_snapshots`, {
        method: 'POST',
        headers: { ...headers(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`sync_snapshots upsert → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
    console.log('▶ J-102 테스트 계정 시드 (DSN-46 §3-2)');
    if (DRY_RUN) {
        for (const a of SEED_ACCOUNTS)
            console.log(`  - ${a.email} ${a.snapshot ? `+ snapshot(${a.snapshot.exam_id})` : '(snapshot 없음)'}`);
        console.log('  필요 env: TEST_SUPABASE_URL · TEST_SUPABASE_SERVICE_ROLE_KEY · TEST_E2E_PASSWORD');
        return;
    }
    const url = testUrl();
    const key = serviceKey();
    assertNotProduction(url, key);
    const password = seedPassword();
    console.log(`  대상: ${url} · 계정 ${SEED_ACCOUNTS.length}종`);

    const existing = await listUsers(url, key);
    for (const a of SEED_ACCOUNTS) {
        const { id, action } = await upsertUser(url, key, a.email, password, existing.get(a.email));
        if (!id) throw new Error(`${a.email} — 사용자 id를 얻지 못했습니다`);
        await upsertProfile(url, key, id);
        if (a.snapshot) await upsertSnapshot(url, key, id, a.snapshot);
        console.log(`  ✓ ${a.email} — ${action}${a.snapshot ? ` + snapshot(${a.snapshot.exam_id})` : ''}`);
    }
    console.log('\n✅ 시드 완료 — 멱등이므로 매 E2E 실행 전 재실행 가능');
}

main().catch((e) => { console.error(`✗ 시드 실패: ${e.message}`); process.exit(1); });
