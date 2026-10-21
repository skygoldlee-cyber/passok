// tests/unit/user-report.test.js
// @spec AD-06 (관리자 운영 CLI)
// tools/check/user_report.js — buildUserSummary() 순수 정규화 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildUserSummary } = require('../../../tools/check/user_report.js');

const user = {
    id: 'u-1', email: 'a@b.c', created_at: '2026-01-01T00:00:00Z',
    last_sign_in_at: '2026-10-01T00:00:00Z',
    app_metadata: { providers: ['email'] },
};

test('buildUserSummary: 프로필·스냅샷·피드백 정규화', () => {
    const u = buildUserSummary({
        user,
        profile: { plan: 'pro', pro_since: '2026-02-01T00:00:00Z', created_at: 'x' },
        snapshots: [{ exam_id: 'cosmetic', device_id: 'dev-1', updated_at: '2026-10-13T00:00:00Z' }],
        feedback: [{ created_at: '2026-10-13T00:00:00Z', kind: 'bug', rating: 2, body: 'b' }],
    });
    assert.equal(u.email, 'a@b.c');
    assert.equal(u.plan, 'pro');
    assert.equal(u.pro_since, '2026-02-01T00:00:00Z');
    assert.deepEqual(u.snapshots, [{ exam_id: 'cosmetic', device_id: 'dev-1', updated_at: '2026-10-13T00:00:00Z' }]);
    assert.equal(u.feedback.length, 1);
    assert.deepEqual(u.providers, ['email']);
});

test('buildUserSummary: 프로필·스냅샷 없으면 free·빈 목록 — 미동기화 사용자', () => {
    const u = buildUserSummary({ user: { id: 'u-2', email: 'c@d.e', created_at: 't' }, profile: null, snapshots: [], feedback: [] });
    assert.equal(u.plan, 'free');
    assert.equal(u.pro_since, null);
    assert.equal(u.last_sign_in_at, null);
    assert.deepEqual(u.snapshots, []);
    assert.deepEqual(u.providers, []);
});

test('buildUserSummary: 스냅샷 메타만 노출 — payload 키는 구조에 존재하지 않음', () => {
    const u = buildUserSummary({
        user,
        profile: null,
        snapshots: [{ exam_id: 'cosmetic', device_id: 'd', updated_at: 't', payload: { secret: 1 } }],
        feedback: [],
    });
    assert.deepEqual(Object.keys(u.snapshots[0]).sort(), ['device_id', 'exam_id', 'updated_at']);
});
