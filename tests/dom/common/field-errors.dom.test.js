// tests/dom/common/field-errors.dom.test.js — 필드 인라인 오류 공용 패턴 (UX-FORM-03)
// @spec UX-FORM-03
// 검증: requireFields 필수 검증(인라인 오류·aria·첫 오류 포커스)(H) ·
//       입력 시 오류 자동 해제 위임 리스너(H) · setFieldError 메시지 텍스트 삽입(H)

import { describe, it, beforeEach, expect } from 'vitest';
import { requireFields, setFieldError, clearFieldError } from '../../../src/ui-utils.js';

function makeForm() {
    document.body.innerHTML = `
        <form>
            <input id="f-a" class="form-input" type="text">
            <select id="f-b" class="form-select"><option value="">선택</option><option value="x">X</option></select>
            <textarea id="f-c" class="form-input"></textarea>
        </form>`;
    return {
        a: /** @type {HTMLInputElement} */ (document.getElementById('f-a')),
        b: /** @type {HTMLSelectElement} */ (document.getElementById('f-b')),
        c: /** @type {HTMLTextAreaElement} */ (document.getElementById('f-c')),
    };
}

describe('UX-FORM-03 — requireFields 필수 검증', () => {
    beforeEach(() => { document.body.innerHTML = ''; makeForm(); });

    it('빈 필드에 인라인 오류·aria-invalid·aria-describedby를 설정하고 첫 오류에 포커스', () => {
        const { a, b } = { a: document.getElementById('f-a'), b: document.getElementById('f-b') };
        const ok = requireFields([[a, '값을 입력하세요.'], [b, '선택하세요.']]);
        expect(ok).toBe(false);
        for (const [el, msg] of [[a, '값을 입력하세요.'], [b, '선택하세요.']]) {
            expect(el.getAttribute('aria-invalid')).toBe('true');
            const err = document.getElementById(`${el.id}-error`);
            expect(err).toBeTruthy();
            expect(err.getAttribute('role')).toBe('alert');
            expect(err.textContent).toContain(msg);
            expect(el.getAttribute('aria-describedby')).toBe(err.id);
        }
        expect(document.activeElement).toBe(a); // 첫 오류 필드 포커스
    });

    it('채워진 필드의 기존 오류는 해제되고 모두 채워지면 true', () => {
        const { a, c } = { a: document.getElementById('f-a'), c: document.getElementById('f-c') };
        requireFields([[a, '입력 필요'], [c, '입력 필요']]);
        a.value = '텍스트';
        const ok = requireFields([[a, '입력 필요'], [c, '입력 필요']]);
        expect(ok).toBe(false);
        expect(a.hasAttribute('aria-invalid')).toBe(false);
        expect(document.getElementById('f-a-error')).toBeNull();
        expect(document.getElementById('f-c-error')).toBeTruthy();
        c.value = '완료';
        expect(requireFields([[a, '입력 필요'], [c, '입력 필요']])).toBe(true);
    });

    it('공백만 입력된 값은 비어 있는 것으로 본다', () => {
        const a = document.getElementById('f-a');
        a.value = '   ';
        expect(requireFields([[a, '입력 필요']])).toBe(false);
        expect(a.getAttribute('aria-invalid')).toBe('true');
    });

    it('null 요소는 건너뛰고 나머지 필드를 검증한다', () => {
        const a = document.getElementById('f-a');
        a.value = 'ok';
        expect(requireFields([[null, '없음'], [a, '입력 필요']])).toBe(true);
    });
});

describe('UX-FORM-03 — 입력 시 오류 자동 해제', () => {
    beforeEach(() => { document.body.innerHTML = ''; makeForm(); });

    it('aria-invalid 필드에 input 이벤트가 발생하면 오류가 해제된다', () => {
        const a = document.getElementById('f-a');
        setFieldError(a, '입력 필요');
        a.value = '수정';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        expect(a.hasAttribute('aria-invalid')).toBe(false);
        expect(document.getElementById('f-a-error')).toBeNull();
    });

    it('오류 없는 필드의 input 이벤트는 다른 필드 오류에 영향을 주지 않는다', () => {
        const { a, c } = { a: document.getElementById('f-a'), c: document.getElementById('f-c') };
        setFieldError(a, '입력 필요');
        c.dispatchEvent(new Event('input', { bubbles: true }));
        expect(a.getAttribute('aria-invalid')).toBe('true');
    });
});

describe('UX-FORM-03 — setFieldError 안전성', () => {
    beforeEach(() => { document.body.innerHTML = ''; makeForm(); });

    it('메시지는 텍스트 노드로 삽입돼 HTML이 해석되지 않는다', () => {
        const a = document.getElementById('f-a');
        setFieldError(a, '<img src=x onerror=alert(1)>');
        const err = document.getElementById('f-a-error');
        expect(err.querySelector('img')).toBeNull();
        expect(err.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('clearFieldError는 aria 속성과 오류 요소를 함께 제거한다', () => {
        const a = document.getElementById('f-a');
        setFieldError(a, '입력 필요');
        clearFieldError(a);
        expect(a.hasAttribute('aria-invalid')).toBe(false);
        expect(a.hasAttribute('aria-describedby')).toBe(false);
        expect(document.getElementById('f-a-error')).toBeNull();
    });
});
