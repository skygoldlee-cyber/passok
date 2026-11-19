// 학습 리마인더 — 발송 판정 순수 로직 (P-19)
// @spec P-19
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSendReminder } from '../../../src/pwa/study-reminder.js';

const base = { enabled: true, permission: 'granted', dueCount: 3, lastSent: '2026-11-18', today: '2026-11-19' };

test('모든 조건 충족 시 발송', () => {
    assert.equal(shouldSendReminder(base), true);
});

test('토글 OFF·권한 미부여·거부 시 미발송', () => {
    assert.equal(shouldSendReminder({ ...base, enabled: false }), false);
    assert.equal(shouldSendReminder({ ...base, permission: 'default' }), false);
    assert.equal(shouldSendReminder({ ...base, permission: 'denied' }), false);
});

test('대기 카드 0이면 미발송', () => {
    assert.equal(shouldSendReminder({ ...base, dueCount: 0 }), false);
});

test('하루 1회 상한 — 오늘 이미 발송했으면 억제', () => {
    assert.equal(shouldSendReminder({ ...base, lastSent: '2026-11-19' }), false);
    assert.equal(shouldSendReminder({ ...base, lastSent: null }), true);
});
