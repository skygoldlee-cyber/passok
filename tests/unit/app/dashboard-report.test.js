// tests/unit/dashboard-report.test.js
// @spec AD-07 (관리자 로컬 HTML 대시보드)
// tools/check/dashboard_report.js — renderHtml()·esc() 순수 렌더 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderHtml, esc } = require('../../../tools/check/dashboard_report.js');

const fixture = () => ({
    generatedAt: '2026-10-14 12:00:00', days: 7,
    errors: {
        sessions: 10, errors: 2, rate: '20.00%',
        byDay: { '2026-10-14': { sessions: 10, errors: 2 } },
        topMessages: [['Cannot read properties', 2]],
        byVersion: {}, byView: {}, byKind: { error: 2 },
    },
    funnel: {
        total: 30, eventCounts: {},
        funnels: {
            quiz: {
                starts: 8, completes: 6, eventRate: 0.75,
                sessionStarts: 5, sessionDone: 4, sessionRate: 0.8,
                avgScore: 0.7, avgDurationMs: 61000,
            },
        },
    },
    feedback: {
        total: 2, byKind: { bug: 1, praise: 1 }, ratingAvg: '4.50', ratingCount: 2,
        byDay: {},
        items: [
            {
                created_at: '2026-10-14T01:00:00Z', kind: 'bug', rating: 2,
                body: 'x'.repeat(200), view: 'quiz', app_version: 'v1',
                user: 'aaaaaaaa…', session_id: 'sess-uuid-1',
            },
        ],
    },
});

test('esc: HTML 특수문자 전면 이스케이프', () => {
    assert.equal(esc('<script>alert("x\'")</script>&'),
        '&lt;script&gt;alert(&quot;x&#39;&quot;)&lt;/script&gt;&amp;');
    assert.equal(esc(null), '');
});

test('renderHtml: 사용자 텍스트 XSS 차단 — 오류 메시지·피드백 본문 이스케이프', () => {
    const in_ = fixture();
    in_.errors.topMessages = [['<img src=x onerror=alert(1)>', 3]];
    in_.feedback.items[0].body = '<svg onload=alert(2)>';
    const html = renderHtml(in_);
    assert.ok(!html.includes('<img src=x'), '오류 메시지 원문 삽입 금지');
    assert.ok(!html.includes('<svg onload'), '피드백 본문 원문 삽입 금지');
    assert.ok(html.includes('&lt;img src=x'));
    assert.ok(html.includes('&lt;svg onload'));
});

test('renderHtml: 섹션·지표·퍼널 수치 렌더', () => {
    const html = renderHtml(fixture());
    assert.match(html, /운영 대시보드/);
    assert.match(html, /20\.00%/);                    // 오류율 카드
    assert.match(html, /<td>quiz<\/td>/);              // 퍼널 행
    assert.match(html, /80\.0%/);                      // 세션 완주율
    assert.match(html, /tag-bug/);                     // kind 배지
    assert.match(html, /sess-uuid-1/);                 // session_id 단축 표시
    assert.match(html, /<!DOCTYPE html>/);
});

test('renderHtml: 빈 데이터도 유효한 문서 — 데이터 없음 표기', () => {
    const html = renderHtml({
        generatedAt: 't', days: 1,
        errors: { sessions: 0, errors: 0, rate: 'n/a (세션 핑 없음)', byDay: {}, topMessages: [] },
        funnel: { total: 0, funnels: {} },
        feedback: { total: 0, byKind: {}, ratingAvg: 'n/a', items: [] },
    });
    assert.match(html, /<!DOCTYPE html>/);
    assert.ok((html.match(/데이터 없음/g) || []).length >= 3);
});
