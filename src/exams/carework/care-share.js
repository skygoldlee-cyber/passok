// src/exams/carework/care-share.js
// @spec CO-13 — 생성 문서 Web Share API 공유 (카톡 등 네이티브 공유 시트)
import { showToast } from '../../ui-utils.js';

/**
 * 생성된 문서 텍스트를 OS 공유 시트로 전달한다.
 * data-arg="CSS선택자|제목" — 선택자는 pre(출력 프리뷰) 또는 input/textarea.
 * 미지원 환경(PC 등)은 클립보드 복사로 폴백.
 * @param {HTMLElement} [btn]
 */
export async function careShare(btn) {
    const [sel, title = '문서'] = String(btn?.dataset?.arg || '').split('|');
    const el = sel && document.querySelector(sel.trim());
    const text = el ? ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : el.textContent || '') : '';
    if (!text.trim()) { showToast('먼저 문서를 생성하세요.', 'error'); return; }
    if (navigator.share) {
        try { await navigator.share({ title, text }); } catch { /* 사용자 취소 */ }
        return;
    }
    navigator.clipboard?.writeText(text).then(
        () => showToast('공유 미지원 환경 — 복사했습니다.'),
        () => showToast('복사 실패', 'error'));
}
