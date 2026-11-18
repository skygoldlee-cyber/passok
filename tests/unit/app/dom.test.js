// tests/unit/dom.test.js — core/dom.js 널 가드 헬퍼 검증
// @spec none
// 목적: setText/toggleCls/showEl 등이 null을 무사히 삼키고,
//       스텁 엘리먼트에 올바른 DOM 조작을 위임하는지 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { byId, setText, setTextById, setHtml, toggleCls, showEl, setAttr } = require(join(ROOT, 'src/core/dom.js'));

/** DOM 엘리먼트 스텁 — 헬퍼가 사용하는 최소 표면만 구현 */
function stubEl() {
    const classes = new Set();
    return {
        textContent: '',
        innerHTML: '',
        hidden: false,
        attrs: {},
        classList: {
            toggle: (cls, on) => { on ? classes.add(cls) : classes.delete(cls); },
            contains: (cls) => classes.has(cls)
        },
        setAttribute(n, v) { this.attrs[n] = v; }
    };
}

test('널 가드 — null 엘리먼트는 무사히 무시', () => {
    assert.doesNotThrow(() => {
        setText(null, 'x');
        setHtml(null, '<b>x</b>');
        toggleCls(null, 'on', true);
        showEl(null, true);
        setAttr(null, 'a', 'b');
    });
});

test('setText/setHtml — 텍스트·HTML 주입', () => {
    const el = stubEl();
    setText(el, 'hello');
    assert.equal(el.textContent, 'hello');
    setHtml(el, '<b>hi</b>');
    assert.equal(el.innerHTML, '<b>hi</b>');
});

test('toggleCls — on/off에 따라 클래스 토글 위임', () => {
    const el = stubEl();
    toggleCls(el, 'active', true);
    assert.ok(el.classList.contains('active'));
    toggleCls(el, 'active', false);
    assert.ok(!el.classList.contains('active'));
});

test('showEl — visible=false면 hidden 부여', () => {
    const el = stubEl();
    showEl(el, false);
    assert.equal(el.hidden, true);
    showEl(el, true);
    assert.equal(el.hidden, false);
});

test('setAttr — setAttribute 위임', () => {
    const el = stubEl();
    setAttr(el, 'aria-label', '닫기');
    assert.equal(el.attrs['aria-label'], '닫기');
});

test('byId/setTextById — document.getElementById 경유', () => {
    const el = stubEl();
    const prev = globalThis.document;
    globalThis.document = { getElementById: (id) => (id === 'target' ? el : null) };
    try {
        assert.equal(byId('target'), el);
        assert.equal(byId('missing'), null);
        setTextById('target', 'via-id');
        assert.equal(el.textContent, 'via-id');
        assert.doesNotThrow(() => setTextById('missing', 'x'));
    } finally {
        globalThis.document = prev;
    }
});
