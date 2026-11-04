// src/exams/carework/care-share.js
// @spec CO-13 — 생성 문서 Web Share API 공유 (카톡 등 네이티브 공유 시트)
import { showToast, showConfirm } from '../../ui-utils.js';

const _NAME_RE = /([가-힣]{2,4})(님|씨|어르신)?/g;
const _PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;
const _mask = t => t.replace(_PHONE_RE, '[연락처]').replace(_NAME_RE, m => /[가-힣]/.test(m) && m.length <= 5 ? '[인명]' : m);

const _readOut = sel => {
    const el = sel && document.querySelector(sel.trim());
    return el ? ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : el.textContent || '') : '';
};

/**
 * 생성된 문서 텍스트를 OS 공유 시트로 전달한다.
 * data-arg="CSS선택자|제목[|mask[|생성핸들러]]" — mask 플래그 시 인명·연락처를 가린 본문으로 공유.
 * 생성핸들러 지정 시 결과가 비어있으면 해당 버튼을 먼저 실행해 생성 후 공유한다.
 * 수급자 정보의 외부 전송 경로이므로 공유 전 기관 정책 확인 경고를 표시한다.
 * 미지원 환경(PC 등)은 클립보드 복사로 폴백.
 * @param {HTMLElement} [btn]
 */
export async function careShare(btn) {
    const [sel, title = '문서', flag = '', gen = ''] = String(btn?.dataset?.arg || '').split('|');
    let raw = _readOut(sel);
    if (!raw.trim() && gen) {
        /** @type {HTMLElement|null} */ (document.querySelector(`[data-click="${gen}"]`))?.click();
        raw = _readOut(sel);
    }
    if (!raw.trim()) { showToast('먼저 문서를 생성하세요.', 'error'); return; }
    const text = flag === 'mask' ? _mask(raw) : raw;
    const ok = await showConfirm(
        `이 문서에는 수급자·근무 정보가 포함될 수 있습니다.\n${flag === 'mask' ? '인명·연락처가 가려진 본문으로 공유합니다.' : '기관의 개인정보 정책을 확인한 후 공유하세요.'}`,
        `${title} 공유`);
    if (!ok) return;
    const copyFallback = () => {
        if (!navigator.clipboard?.writeText) { showToast('공유·복사를 지원하지 않는 환경입니다.', 'error'); return; }
        navigator.clipboard.writeText(text).then(
            () => showToast('클립보드에 복사했습니다 — 카톡 등에 붙여넣으세요.'),
            () => showToast('복사 실패 — 인쇄·PDF를 이용하세요.', 'error'));
    };
    if (navigator.share) {
        try { await navigator.share({ title, text }); return; }
        catch (e) { if (/** @type {Error} */ (e)?.name === 'AbortError') return; /* 사용자 취소는 조용히 종료, 그 외 실패는 복사 폴백 */ }
    }
    copyFallback();
}
