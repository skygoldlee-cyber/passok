// src/exams/carework/care-share.js
// @spec CO-13 — 생성 문서 Web Share API 공유 (카톡 등 네이티브 공유 시트)
import { showToast } from '../../ui-utils.js';

const _NAME_RE = /([가-힣]{2,4})(님|씨|어르신)?/g;
const _PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;
const _mask = t => t.replace(_NAME_RE, m => /[가-힣]/.test(m) && m.length <= 5 ? '[인명]' : m)
    .replace(_PHONE_RE, '[연락처]'); // 인명 먼저 — [연락처]가 인명 정규식에 재마스킹되지 않도록

const _readOut = sel => {
    const el = sel && document.querySelector(sel.trim());
    return el ? ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : el.textContent || '') : '';
};

/** 생성 결과가 없으면 대상 요소의 뷰 폼 입력 항목·값을 양식 텍스트로 조립 */
const _formText = sel => {
    const sec = /** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.closest('.view-section') || document;
    const lines = [...sec.querySelectorAll('input, select, textarea')].flatMap(e0 => {
        const el = /** @type {HTMLInputElement} */ (e0);
        if (['button', 'submit', 'file', 'hidden'].includes(el.type) || el.closest('.nav-practice-only')) return [];
        const lab = el.closest('label') || (el.id && sec.querySelector(`label[for="${el.id}"]`));
        const name = (lab ? lab.textContent : (el.getAttribute('aria-label') || el.name || el.id || '항목')).replace(/\s+/g, ' ').trim();
        const val = (el.type === 'checkbox' || el.type === 'radio')
            ? (el.checked ? (el.type === 'radio' ? `(${el.value})` : '✓') : '')
            : String(el.value || '').trim();
        if (!val) return [];
        return [`${name}: ${val}`];
    });
    return lines.join('\n');
};

/**
 * 생성된 문서 텍스트를 OS 공유 시트로 전달한다.
 * data-arg="CSS선택자|제목[|mask[|생성핸들러]]" — mask 플래그 시 인명·연락처를 가린 본문으로 공유.
 * 생성핸들러 지정 시 결과가 비어있으면 해당 버튼을 먼저 실행해 생성 후 공유한다.
 * 수급자 정보의 외부 전송 경로이므로 공유 전 기관 정책 확인 경고를 표시한다.
 * 미지원 환경(PC 등)은 클립보드 복사로 폴백.
 * @param {string} arg — data-arg 값 ("선택자|제목[|mask[|생성핸들러]]") — 위임은 요소가 아닌 data-arg 문자열을 전달
 */
export async function careShare(arg) {
    const [sel, title = '문서', f3 = '', f4 = ''] = String(arg || '').split('|');
    // mask 생략 시 3번째 필드가 생성 핸들러 — "|sel|title|gen" 와 "|sel|title|mask|gen" 모두 지원
    const flag = f3 === 'mask' ? 'mask' : '', gen = f4 || (flag ? '' : f3);
    let raw = _readOut(sel);
    if (!raw.trim() && gen) {
        try { /** @type {HTMLElement|null} */ (document.querySelector(`[data-click="${gen}"]`))?.click(); } catch { /* 생성 핸들러 예외도 공유는 계속 — 폼 양식으로 진행 */ }
        raw = _readOut(sel);
    }
    // 생성 결과가 오류 마커뿐이면 양식 텍스트로 폴백 — 계산 전이라도 출력 양식은 공유 가능해야 함
    if (/** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.querySelector('.care-calc-err')) raw = '';
    if (!raw.trim()) raw = _formText(sel); // 생성 결과가 없어도 양식이 있으면 현재 입력 상태를 공유
    if (!raw.trim()) { showToast('공유할 내용이 없습니다 — 항목을 입력하세요.', 'error'); return; }
    const text = flag === 'mask' ? _mask(raw) : raw;
    // 개인정보 통제는 인명 가림(mask)으로 보장 — 확인 다이얼로그 없이 한 번 클릭으로 공유 (정책 주의는 비차단 안내)
    if (flag === 'mask') showToast('인명·연락처가 가려진 본문으로 공유됩니다 — 기관 정책을 확인하세요.');
    const copyFallback = () => {
        if (!navigator.clipboard?.writeText) { showToast('공유·복사를 지원하지 않는 환경입니다.', 'error'); return; }
        navigator.clipboard.writeText(text).then(
            () => showToast('클립보드에 복사했습니다 — 카톡 등에 붙여넣으세요.'),
            () => showToast('복사 실패 — 인쇄·PDF를 이용하세요.', 'error'));
    };
    // 파일 공유 — 모바일 공유 시트에 문서 파일 첨부 (카톡 등). 데스크톱은 파일 다운로드.
    const file = new File([text], `${title}.txt`, { type: 'text/plain;charset=utf-8' });
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
    if (coarse && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ title, text, files: [file] }); showToast('파일 공유 시트를 열었습니다.'); return; }
        catch (e) { if (/** @type {Error} */ (e)?.name === 'AbortError') return; }
    }
    copyFallback(); // 항상 복사+토스트 — 어떤 환경에서든 클릭 즉시 반응이 나와야 함
    // 데스크톱은 파일 다운로드로 제공 — "출력 문서를 파일로 공유" 요구 충족
    if (!coarse) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        showToast(`${file.name} 다운로드 — 파일을 공유하세요.`);
    }
}
