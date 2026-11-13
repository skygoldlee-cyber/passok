// tests/unit/content/doc-wm.test.js
// @spec CO-13,DA-24 — 문서 워터마크 공용 모듈: 문구 규약(기관명 · 출력일) + DOM 오버레이 마크업
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docWmText, docWmHtml } from '../../../src/content/doc-wm.js';
import { todayKey } from '../../../src/core/utils.js';

test('docWmText — "기관명 · 출력일" 규약, 기관명 없으면 빈 문자열', () => {
    assert.equal(docWmText('조이실버케어 요양원'), `조이실버케어 요양원 · ${todayKey()}`);
    assert.equal(docWmText('  기관  '), `기관 · ${todayKey()}`); // trim
    assert.equal(docWmText(''), '');
    assert.equal(docWmText('   '), '');
    assert.equal(docWmText(/** @type {*} */(null)), '');
});

test('docWmHtml — .doc-wm 오버레이 마크업 + 이스케이프, 빈 문구면 빈 문자열', () => {
    const html = docWmHtml('조이실버케어 요양원 · 2026-11-14');
    assert.ok(html.includes('class="doc-wm"'), 'doc-wm 컨테이너 누락');
    assert.ok(html.includes('aria-hidden="true"'), '스크린리더 제외 누락');
    assert.ok(html.includes('조이실버케어 요양원 · 2026-11-14'), '문구 누락');
    assert.equal(docWmHtml(''), '');
    assert.ok(docWmHtml('a<b&"c"').includes('a&lt;b&amp;&quot;c&quot;'), 'HTML 이스케이프 누락');
});
