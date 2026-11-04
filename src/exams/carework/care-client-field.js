// src/exams/carework/care-client-field.js — 대상자 입력 명부 셀렉트 (CO-01 §3.3)
// @spec CO-01 — 시험 전용 도메인 로직 (DA-13)
// datalist 자동완성 + 미등록 이름 입력 시 "명부 등록" 제안 — 등록하면 clientId 자동 연결
import { listClients, addClient } from './care-client-store.js';
import { resolveClientId } from './care-client-resolve.js';
import { escapeHTML } from '../../core/sanitize.js';
import { showToast } from '../../ui-utils.js';

/**
 * 입력 요소에 명부 datalist + 미등록 등록 버튼 부착
 * @param {HTMLInputElement|null} input
 */
export function attachClientPicker(input) {
    if (!input || input.dataset.clientPicker) return;
    input.dataset.clientPicker = '1';
    const list = document.createElement('datalist');
    list.id = `${input.id}-list`;
    input.setAttribute('list', list.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'care-client-reg';
    btn.textContent = '명부에 등록';
    btn.hidden = true;
    const fill = () => { list.innerHTML = listClients().map(c => `<option value="${escapeHTML(c.name)}">`).join(''); };
    const sync = () => {
        const { candidates } = resolveClientId(input.value, listClients());
        btn.hidden = !(input.value.trim() && candidates === 0);
    };
    btn.addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) return;
        const r = addClient({ name });
        if (r.ok) { fill(); showToast('명부에 등록했습니다.', 'ok'); }
        sync();
    });
    input.addEventListener('input', sync);
    input.after(list, btn);
    fill(); sync();
}

/**
 * 저장용 대상자 필드 판독 — 명부 단일 매칭 시 clientId 첨부
 * @returns {{client:string, clientId?:string}}
 */
export function clientField(inputId) {
    const el = /** @type {HTMLInputElement|null} */ (document.getElementById(inputId));
    const client = (el ? el.value : '').trim();
    const out = { client };
    const { id } = resolveClientId(client, listClients());
    if (id) out.clientId = id;
    return out;
}
