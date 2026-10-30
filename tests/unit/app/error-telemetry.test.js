// tests/unit/error-telemetry.test.js
// @spec none (텔레메트리 자체 검증 — 관측성 인프라)
// src/telemetry/error-telemetry.js — 페이로드 구성·중복 억제·세션 상한·미설정/실패 경로

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildErrorPayload, reportClientError, reportSessionPing, initErrorTelemetry, _resetTelemetryForTest,
} from '../../../src/telemetry/error-telemetry.js';

beforeEach(() => _resetTelemetryForTest());

// ── 페이로드 ────────────────────────────────────────────────

test('buildErrorPayload: Error → message/stack/kind 채움, 길이 상한', () => {
  const err = new TypeError('boom'.repeat(200));
  const p = buildErrorPayload('error', err, { view: 'quiz', filename: 'app.js', lineno: 7 });
  assert.equal(p.kind, 'error');
  assert.ok(p.message.length <= 500);
  assert.ok(p.stack.includes('TypeError'));
  assert.equal(p.view, 'quiz');
  assert.equal(p.meta.filename, 'app.js');
  assert.equal(p.meta.lineno, 7);
});

test('buildErrorPayload: 비-Error 값도 문자열화, kind 비정상값은 error로 정규화', () => {
  const p = buildErrorPayload('weird', 'plain string');
  assert.equal(p.kind, 'error');
  assert.equal(p.message, 'plain string');
  assert.equal(p.stack, null);
});

// ── 전송 ────────────────────────────────────────────────────

test('reportClientError: insert 성공 → sent, 같은 오류 재전송 → dup', async () => {
  const rows = [];
  const insert = async (r) => { rows.push(...r); return {}; };
  const err = new Error('same');
  assert.equal(await reportClientError('error', err, {}, { insert }), 'sent');
  assert.equal(await reportClientError('error', err, {}, { insert }), 'dup');
  assert.equal(rows.length, 1);
});

test('reportClientError: 세션 상한 — 10건 초과는 capped', async () => {
  const insert = async () => ({});
  let last = '';
  for (let i = 0; i < 12; i++) {
    last = await reportClientError('error', new Error(`e${i}`), {}, { insert });
  }
  assert.equal(last, 'capped');
});

test('reportClientError: 미설정(disabled)·전송 실패·예외도 throw 없이 상태 반환', async () => {
  assert.equal(await reportClientError('error', new Error('x'), {}, { insert: async () => ({ disabled: true }) }), 'disabled');
  _resetTelemetryForTest();
  assert.equal(await reportClientError('error', new Error('x'), {}, { insert: async () => ({ error: new Error('db') }) }), 'failed');
  _resetTelemetryForTest();
  assert.equal(await reportClientError('error', new Error('x'), {}, { insert: async () => { throw new Error('net'); } }), 'failed');
});

// ── 세션 핑 (오류율 분모) ────────────────────────────────────

test('reportSessionPing: kind=session 행 1건 전송 — 상한·중복 억제와 무관', async () => {
  const rows = [];
  const insert = async (r) => { rows.push(...r); return {}; };
  assert.equal(await reportSessionPing({ insert }), 'sent');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'session');
  assert.equal(rows[0].message, 'session');
  // 세션 핑은 _sent 카운터를 소비하지 않는다 — 이후 오류 10건까지 전송 가능
  for (let i = 0; i < 10; i++) {
    assert.equal(await reportClientError('error', new Error(`e${i}`), {}, { insert }), 'sent');
  }
  assert.equal(await reportClientError('error', new Error('e11'), {}, { insert }), 'capped');
});

test('reportSessionPing: disabled·실패·예외도 상태 반환', async () => {
  assert.equal(await reportSessionPing({ insert: async () => ({ disabled: true }) }), 'disabled');
  assert.equal(await reportSessionPing({ insert: async () => ({ error: new Error('db') }) }), 'failed');
  assert.equal(await reportSessionPing({ insert: async () => { throw new Error('net'); } }), 'failed');
});

test('buildErrorPayload: kind=session 정규화', () => {
  assert.equal(buildErrorPayload('session', 'session').kind, 'session');
  assert.equal(buildErrorPayload('bogus', 'x').kind, 'error');
});

// ── 리스너 설치 ─────────────────────────────────────────────

test('initErrorTelemetry: error/unhandledrejection 리스너 등록 + 이중 설치 방지', async () => {
  const handlers = {};
  const fakeWin = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    location: { pathname: '/x' },
  };
  const rows = [];
  initErrorTelemetry(fakeWin, { insert: async (r) => { rows.push(...r); return {}; } });
  initErrorTelemetry(fakeWin); // 이중 호출 무시
  assert.equal(typeof handlers.error, 'function');
  assert.equal(typeof handlers.unhandledrejection, 'function');
  // 초기화 시 세션 핑 1건만 전송 (이중 호출로 2건이 되지 않음)
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(rows.filter((r) => r.kind === 'session').length, 1);

  // 리스너 발화가 절대 throw하지 않음 (전송 실패도 흡수)
  handlers.error({ error: new ReferenceError('r'), filename: 'a.js', lineno: 1 });
  handlers.error({}); // error 없는 스크립트 로드 실패 — 무시 경로
  handlers.unhandledrejection({ reason: new TypeError('p') });
  handlers.unhandledrejection({ reason: null }); // reason 없음 — 무시
});

test('buildErrorPayload: session_id가 텔레메트리 공유 세션과 일치 — bug 신고 join 키', async () => {
  const { getTelemetrySessionId } = await import('../../../src/telemetry/telemetry-session.js');
  const p = buildErrorPayload('error', new Error('x'));
  assert.equal(p.session_id, getTelemetrySessionId());
  // 세션 핑도 같은 키 — 오류율 분모 행이 오류 행과 같은 세션으로 묶인다
  const ping = buildErrorPayload('session', 'session', {});
  assert.equal(ping.session_id, getTelemetrySessionId());
});
