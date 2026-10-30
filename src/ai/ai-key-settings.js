// src/ai/ai-key-settings.js — AI API 키(BYOK) 설정 오버레이
// @spec none
//
// 주관식 연습의 AI 채점 설정 패널(wp-aicfg)과 같은 저장 계약(WRITTEN_AI_KEY
// 등 로컬 전용)을 공유하는 설정 진입점 — 로그인 없이 AI 코치를 쓰려는 사용자가
// 설정 메뉴에서 키를 등록할 수 있도록 한다. 주관식 패널은 유지(기능 내 컨텍스트).
//
// 흐름: 설정(⚙️) → "AI API 키" → 공급자·키·모델 입력 → 저장 → aiFeedbackAvailable()
// 가 키를 감지해 AI 버튼(해설·코칭·질의) 노출. 키는 디바이스 로컬 전용.

import { createDocOverlay } from '../shell/doc-overlay.js';
import { showToast } from '../ui-utils.js';
import {
    AI_PROVIDERS, getAiProvider, saveAiProvider, getAiModel, saveAiModel,
    getAiKey, saveAiKey, clearAiKey, maskAiKey,
} from '../written/written-grading.js';

const CSS = `
#aikey-overlay{position:fixed;inset:0;z-index:var(--z-modal-overlay);display:none;flex-direction:column;
  background:var(--bg-app);color:var(--color-text-main);}
#aikey-overlay.open{display:flex;}
#aikey-overlay .ak-bar{display:flex;align-items:center;gap:12px;flex:0 0 auto;
  padding:10px 16px;border-bottom:1px solid var(--border-color);background:var(--bg-card);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-weight:700;}
#aikey-overlay .ak-wrap{padding:1.2rem 1rem;max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:.8rem;overflow-y:auto;}
#aikey-overlay .ak-row{display:flex;flex-direction:column;gap:.3rem}
#aikey-overlay .ak-row label{font-size:.8rem;color:var(--color-text-muted)}
#aikey-overlay .ak-row input,#aikey-overlay .ak-row select{padding:.55rem .7rem;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);color:var(--color-text-main);font-family:inherit;}
#aikey-overlay .ak-actions{display:flex;gap:.6rem}
#aikey-overlay .ak-note{font-size:.78rem;color:var(--color-text-muted);line-height:1.5}
`;

const _overlay = createDocOverlay({
    id: 'aikey-overlay',
    styleId: 'aikey-overlay-style',
    css: CSS,
    innerHTML: `<div class="ak-bar">
      <button class="btn btn-secondary btn-sm" data-ak-close aria-label="닫기"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> 설정으로</button>
      <div class="ak-title">AI API 키 (BYOK)</div></div>
    <div class="ak-wrap">
      <div class="ak-row"><label for="ak-provider">공급자</label>
        <select id="ak-provider" data-ak-provider></select></div>
      <div class="ak-row"><label for="ak-key">API 키</label>
        <input id="ak-key" data-ak-key type="password" autocomplete="off" placeholder="API 키 (디바이스 로컬 저장)"></div>
      <div class="ak-row"><label for="ak-model">모델 (선택)</label>
        <input id="ak-model" data-ak-model type="text" autocomplete="off" placeholder="모델 (비우면 기본값)"></div>
      <div class="ak-actions">
        <button class="btn btn-primary" data-ak-save>저장</button>
        <button class="btn btn-secondary" data-ak-clear>키 삭제</button>
      </div>
      <p class="ak-note">키는 이 기기에만 저장되며 백업·동기화되지 않습니다. 등록하면 로그인 없이 AI 해설·주간 코칭·교재 질의를 본인 키로 사용합니다 — 서버 경유 대신 공급자 API를 직접 호출합니다.</p>
    </div>`,
    ariaLabel: 'AI API 키 설정',
    bodyClass: 'modal-open',
    historyMarker: 'aikey-overlay',
    popstateGuardMs: 50,
    wire(el) {
        el.querySelector('[data-ak-close]')?.addEventListener('click', () => _overlay.close());
        const sel = /** @type {HTMLSelectElement|null} */ (el.querySelector('[data-ak-provider]'));
        const keyInput = /** @type {HTMLInputElement|null} */ (el.querySelector('[data-ak-key]'));
        const modelInput = /** @type {HTMLInputElement|null} */ (el.querySelector('[data-ak-model]'));
        if (!sel || !keyInput || !modelInput) return;
        sel.innerHTML = AI_PROVIDERS.map(p =>
            `<option value="${p}">${p}${p === 'gemini' ? ' (기본)' : ''}</option>`).join('');
        sel.value = getAiProvider();
        keyInput.placeholder = getAiKey()
            ? `키 저장됨 (${maskAiKey(getAiKey())})` : 'API 키 (디바이스 로컬 저장)';
        modelInput.placeholder = `모델 (비우면 ${getAiModel()})`;

        el.querySelector('[data-ak-save]')?.addEventListener('click', () => {
            saveAiProvider(sel.value);
            const m = modelInput.value.trim();
            if (m) saveAiModel(m);
            const k = keyInput.value.trim();
            if (k) saveAiKey(k);
            keyInput.value = '';
            keyInput.placeholder = getAiKey()
                ? `키 저장됨 (${maskAiKey(getAiKey())})` : 'API 키 (디바이스 로컬 저장)';
            showToast(getAiKey() ? 'AI API 키가 저장됐습니다 — AI 버튼이 활성화됩니다' : '설정이 저장됐습니다', 'success');
            _overlay.close();
        });
        el.querySelector('[data-ak-clear]')?.addEventListener('click', () => {
            clearAiKey();
            keyInput.value = '';
            keyInput.placeholder = 'API 키 (디바이스 로컬 저장)';
            showToast('AI API 키가 삭제됐습니다', 'info');
        });
    },
});

/** 설정 메뉴 → AI API 키 오버레이 열기 */
export function openAiKeySettings() { _overlay.open(); }
