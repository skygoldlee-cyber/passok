// tests/unit/app/shortcuts-help.test.js
// @spec UX-HELP-01
// 단축키 도움말 — 목록 정본 선언과 HTML 렌더(이스케이프) 검증.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHORTCUT_GROUPS, renderShortcutHelpHtml } from '../../../src/shell/shortcuts-help.js';

test('SHORTCUT_GROUPS 정본: 그룹·항목 필수 필드와 중복 없음', () => {
    assert.ok(SHORTCUT_GROUPS.length >= 2, '전역+뷰 한정 그룹 존재');
    const seen = new Set();
    for (const g of SHORTCUT_GROUPS) {
        assert.ok(g.title && Array.isArray(g.items) && g.items.length > 0);
        for (const it of g.items) {
            assert.ok(it.keys && it.desc);
            const k = `${g.title}:${it.keys}`;
            assert.ok(!seen.has(k), `중복 단축키 표기: ${k}`);
            seen.add(k);
        }
    }
});

test('renderShortcutHelpHtml: 그룹 제목·키·설명 렌더 + HTML 이스케이프', () => {
    const html = renderShortcutHelpHtml([
        { title: 'A<그룹>', items: [{ keys: 'X', desc: '설"<명>' }] },
    ]);
    assert.match(html, /A&lt;그룹&gt;/);
    assert.match(html, /설&quot;&lt;명&gt;/);
    assert.match(html, /<kbd>X<\/kbd>/);
});
