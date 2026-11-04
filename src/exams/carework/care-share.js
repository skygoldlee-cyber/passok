// src/exams/carework/care-share.js
// @spec CO-13 — 생성 문서 Web Share API 공유 (카톡 등 네이티브 공유 시트)
import { showToast } from '../../ui-utils.js';
import { pdfFileFromEl } from '../../content/pdf-utils.js';
import { sheetFile } from '../../content/xlsx-utils.js';
import { docHeadHtml } from './facility.js';
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';

const _NAME_RE = /(김|이|박|최|정|강|조|윤|장|임|한|오|서|신|권|황|안|송|전|홍|고|문|양|손|배|백|허|유|남|심|노|하|곽|성|차|주|우|구|민|류|나|진|엄|채|원|천|방|공|현|함|변|염|추|도|소|석|선|설|마|길|연|위|표|명|기|반|왕|금|옥|육|인|맹|제|모|탁|어|은|편|남궁|독고|제갈|황보|선우)[가-힣]{1,2}(?!\s*(식사|산책|요양|보호|관리|확인|기록|완료|시작|교대))/g;
const _PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;
const _mask = t => t.replace(_NAME_RE, m => m.length <= 4 ? '[인명]' : m)
    .replace(_PHONE_RE, '[연락처]'); // 인명 먼저 — [연락처]의 '연'이 성씨 정규식에 재마스킹되지 않도록

/** 공유 감사 로그 — 수급자 정보 외부 전송 이력 L0 로컬 기록 (기관 감사 증적, 최근 50건) */
const _audit = (title, flag, files) => {
    try {
        const log = /** @type {any[]} */ (getJSON(STORAGE_KEYS.CARE_SHARE_AUDIT) || []);
        log.push({ ts: Date.now(), title, masked: flag === 'mask', files: files.map(f => f.name) });
        setJSON(STORAGE_KEYS.CARE_SHARE_AUDIT, log.slice(-50));
    } catch { /* 스토리지 실패는 무시 */ }
};

const _readOut = sel => {
    const el = sel && document.querySelector(sel.trim());
    return el ? ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : el.textContent || '') : '';
};

/** 생성 결과가 없으면 대상 요소의 뷰 폼 입력 항목·값을 양식 텍스트로 조립 — 양식 자체가 문서 */
const _formText = sel => {
    const sec = /** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.closest('.view-section') || document;
    const lines = [...sec.querySelectorAll('input, select, textarea')].flatMap(e0 => {
        const el = /** @type {HTMLInputElement} */ (e0);
        if (['button', 'submit', 'file', 'hidden'].includes(el.type) || el.closest('.nav-practice-only')) return [];
        const lab = el.closest('label') || (el.id && sec.querySelector(`label[for="${el.id}"]`));
        const name = (lab ? lab.textContent : (el.getAttribute('aria-label') || el.name || el.id || '항목')).replace(/\s+/g, ' ').trim();
        const selOpt = el.tagName === 'SELECT' ? (/** @type {any} */ (el)).selectedOptions?.[0] : null;
        const val = selOpt ? (selOpt.textContent || '').trim() // select는 value 속성이 아닌 선택 라벨
            : (el.type === 'checkbox' || el.type === 'radio')
                ? (el.checked ? (el.type === 'radio' ? `(${el.value})` : '✓') : '')
                : String(el.value || '').trim();
        return val ? [`${name}: ${val}`] : [];
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
    const [sel, title = '문서', f3 = '', f4 = '', alt = ''] = String(arg || '').split('|');
    // mask 생략 시 3번째 필드가 생성 핸들러 — "|sel|title|gen" 와 "|sel|title|mask|gen" 모두 지원. 5번째 alt는 보조 생성기.
    const flag = f3 === 'mask' ? 'mask' : '', gen = f4 || (flag ? '' : f3);
    let raw = _readOut(sel);
    // 공유 단독 완결 — 미생성 시 생성 핸들러 실행 (브리지 직접 호출 우선, 없으면 버튼 클릭)
    if (!raw.trim() && gen && !gen.endsWith('CsvExport')) {
        try {
            const fn = (/** @type {any} */ (window))[gen];
            if (typeof fn === 'function') await fn();
            else /** @type {HTMLElement|null} */ (document.querySelector(`[data-click="${gen}"]`))?.click();
        } catch { /* 계속 */ }
        raw = _readOut(sel);
    }
    if (/** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.querySelector('.care-calc-err')) raw = ''; // 오류 마커만 있으면 양식으로
    if (!raw.trim()) raw = _formText(sel); // 생성 실패해도 양식(입력 항목·값)으로 공유
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
    // 파일 생성 — 각 소스 독립: 성공한 파일만 첨부, 하나가 없어도 나머지는 정상 공유
    /** @type {File[]} */
    const files = [];
    const stamp = new Date().toISOString().slice(0, 10);
    const fname = ext => `${title}_${stamp}.${ext}`;
    const csvGen = gen?.endsWith('CsvExport') ? gen : (alt?.endsWith('CsvExport') ? alt : '');
    if (csvGen) { // CsvExport 지정 시 실제 .xlsx
        try { const csv = await (/** @type {any} */ (window))[csvGen]?.(); if (csv) files.push(await sheetFile(csv, fname('xlsx'))); } catch { showToast('Excel 생성 실패 — 나머지 파일은 정상 공유됩니다.', 'error'); }
    }
    if (text.trim()) { // 공유 PDF = 인쇄 미리보기 DOM 그대로 — 헤더가 미포함이면 문서 헤더만 보강
        const wrap = document.createElement('div');
        // html2canvas는 문서 좌표로 렌더 — fixed는 뷰포트에 노출(흰 플래시)되므로 문서 하단 absolute로 배치
        wrap.style.cssText = 'position:absolute;left:0;top:100vh;width:700px;padding:24px;background:#fff;color:#000';
        const outEl = document.querySelector(sel.trim());
        if (outEl && outEl.textContent?.trim()) {
            const clone = /** @type {HTMLElement} */ (outEl.cloneNode(true));
            if (flag === 'mask') { // 텍스트 노드만 가림 — 표 구조는 유지
                const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
                for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeValue = _mask(n.nodeValue || '');
            }
            if (!clone.querySelector('.care-doc-head')) wrap.innerHTML = docHeadHtml(title); // 인쇄와 동일 헤더
            wrap.appendChild(clone);
        } else { // 미리보기 없음 — 폼 양식은 헤더+텍스트로 구성
            wrap.innerHTML = docHeadHtml(title);
            const pre = document.createElement('pre');
            pre.style.cssText = 'white-space:pre-wrap;font:13px/1.6 "Malgun Gothic",sans-serif;color:#111';
            pre.textContent = text;
            wrap.appendChild(pre);
        }
        // 인쇄 가독성 — 테마 색상(회색 계열) 제거: 배경 흰색·텍스트 검정으로 강제
        wrap.querySelectorAll('*').forEach(e2 => {
            const el2 = /** @type {HTMLElement} */ (e2);
            el2.style.color = '#000';
            if (!el2.classList.contains('care-doc-head')) el2.style.background = 'transparent';
            el2.style.borderColor = '#000';
        });
        document.body.appendChild(wrap);
        try { files.push(await pdfFileFromEl(wrap, fname('pdf').replace(/\.pdf$/, ''))); }
        catch { showToast('PDF 생성 실패 — 텍스트 파일로 대체합니다.', 'error'); }
        finally { wrap.remove(); }
        files.push(new File([text], fname('txt'), { type: 'text/plain;charset=utf-8' })); // 텍스트 추출용 병기 (검색·선택 가능)
    }
    // 다중 파일 시 Excel 포함 여부 선택 — 불필요한 파일 생성·다운로드 방지
    if (files.length > 1) {
        const { showConfirm } = await import('../../ui-utils.js');
        if (!await showConfirm('Excel 파일도 함께 보낼까요? (취소 시 문서만 공유)'))
            files.splice(0, files.length, ...files.filter(f => !f.name.endsWith('.xlsx')));
    }
    _audit(title, flag, files);
    // 공유 시트 — pointer:coarse 게이트 없이 share() 직접 시도 (일부 기기는 터치 감지 불일치)
    const fileOk = files.length && (typeof navigator.canShare !== 'function' || navigator.canShare({ files }));
    if (typeof navigator.share === 'function') {
        try { await navigator.share(fileOk ? { title, text, files } : { title, text }); showToast(fileOk ? '파일 공유 시트를 열었습니다.' : '공유 시트를 열었습니다 — 텍스트를 붙여넣으세요.'); return; }
        catch (e) { if (/** @type {Error} */ (e)?.name === 'AbortError') return; /* 실패 시 복사 폴백 */ }
    }
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
    copyFallback(); // 항상 복사+토스트 — 어떤 환경에서든 클릭 즉시 반응이 나와야 함
    // 데스크톱은 파일 다운로드로 제공 — 생성된 파일을 순차 다운로드
    if (!coarse) {
        for (const file of files) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file); a.download = file.name;
            document.body.appendChild(a); a.click(); a.remove();
        }
        if (files.length) showToast(`${files.map(f => f.name).join(', ')} 다운로드 — 파일을 공유하세요.`);
    }
}
