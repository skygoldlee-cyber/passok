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

/** 진단 배너 — 네이티브 다이얼로그 금지 규약: 탭할 때까지 남는 상시 배너 (캡처 가능) */
const diag = msg => {
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;z-index:99999;padding:12px 14px;background:#7f1d1d;color:#fff;border-radius:8px;font:14px/1.5 sans-serif';
    b.textContent = `${msg}  (탭하여 닫기)`;
    b.addEventListener('click', () => b.remove());
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 20000);
};

/** share({files}) 거절 학습 — canShare는 파일 타입·OS 지원을 검증하지 않아 거짓 true를
    반환하므로(Chromium), 실제 거절(NotAllowedError)로만 확정하고 이후 클릭은 텍스트만 싣는다. */
let _filesBlocked = false;

/** 공유 실행 버튼 — share()는 탭이 만든 새 제스처 안에서 호출돼 NotAllowedError를 우회한다.
    파일 생성 완료 후 표시 → 탭하면 시트 오픈 (txt·xlsx·pdf 첨부), 다운로드·복사는 병행 폴백. */
const _shareBtn = (label, run) => {
    const b = document.createElement('button');
    b.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:14px 28px;background:#2563eb;color:#fff;border:0;border-radius:24px;font:600 15px sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3)';
    b.textContent = label;
    b.addEventListener('click', async () => { b.remove(); try { await run(); } catch { /* 폴백은 호출층이 처리 */ } });
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 30000);
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
 * 생성된 문서를 OS 공유 시트로 전달한다.
 * data-arg="CSS선택자|제목[|mask[|생성핸들러]]" — mask 플래그 시 인명·연락처를 가린 본문으로 공유.
 * 생성핸들러 지정 시 결과가 비어있으면 해당 버튼을 먼저 실행해 생성 후 공유한다.
 * 수급자 정보의 외부 전송 경로이므로 공유 전 기관 정책 확인 경고를 표시한다.
 * 흐름: 공유 탭 → txt·xlsx·pdf 생성 → "공유하기" 버튼 탭(새 제스처) → share({files}).
 * 파일이 시트를 타므로 카톡에는 PDF가 첨부된다. 미지원·데스크톱은 복사+다운로드로 폴백.
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
    files.push(new File([text], fname('txt'), { type: 'text/plain' })); // 다운로드·폴백용 텍스트 — 시트 페이로드에서는 제외 (카톡 이중 수신 방지)

    // share()는 제스처 유효 구간(수 초) 안에만 열 수 있어 xlsx·pdf 생성(수 초)과 양립 불가 —
    // 파일을 먼저 전부 만든 뒤 "공유하기" 버튼의 새 탭 제스처로 시트를 연다.
    // 페이로드는 files만 — text를 병기하면 카톡 등 타겟이 파일 대신 텍스트만 수신한다.
    /** @type {Promise<void>[]} */
    const tasks = [];
    if (csvGen) tasks.push((async () => { // CsvExport 지정 시 실제 .xlsx
        try { const csv = await (/** @type {any} */ (window))[csvGen]?.(); if (csv) files.push(await sheetFile(csv, fname('xlsx'))); } catch { showToast('Excel 생성 실패 — 나머지 파일은 정상 공유됩니다.', 'error'); }
    })());
    if (text.trim()) tasks.push((async () => { // 공유 PDF = 인쇄 미리보기 DOM 그대로 — 헤더가 미포함이면 문서 헤더만 보강
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
    })());

    copyFallback(); // 첫 탭 즉시 반응 — 제스처 안이라 클립보드도 통과
    const downloadAll = () => {
        for (const file of files) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file); a.download = file.name;
            document.body.appendChild(a); a.click(); a.remove();
        }
        if (files.length) showToast(`${files.map(f => f.name).join(', ')} 다운로드 — 파일을 카톡 등에 첨부하세요.`);
    };
    // 파일 첨부는 터치 기기로 제한 — Windows 등 데스크톱은 canShare가 파일을 통과시켜도
    // share({files})가 OS 수준에서 NotAllowedError로 거절되고, text만 실으면 카톡이 텍스트만
    // 수신한다. 데스크톱은 시트 시도 없이 복사+다운로드로 제공 (파일을 카톡에 드래그).
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
    if (typeof navigator.share === 'function' && coarse) {
        showToast('문서를 준비하는 중입니다 — "공유하기" 버튼이 뜨면 눌러주세요.');
        await Promise.allSettled(tasks); // 생성 완료 후 버튼 — 시트에 txt·xlsx·pdf 전부 포함
        _audit(title, flag, files);
        const fs = files.filter(f => !f.name.endsWith('.txt')); // txt는 다운로드 전용 — 시트에 싣으면 카톡이 본문·파일 이중 수신
        _shareBtn(`📤 ${title} 공유하기`, async () => {
            const ok = !_filesBlocked && fs.length && (typeof navigator.canShare !== 'function' || navigator.canShare({ files: fs }));
            try {
                await navigator.share(ok ? { title, files: fs } : { title, text });
                showToast('공유 시트를 열었습니다.');
            } catch (e) {
                const n = /** @type {Error} */ (e)?.name;
                if (n === 'AbortError') return;
                if (ok && n === 'NotAllowedError') _filesBlocked = true; // 파일 첨부 차단 — 다음 탭은 텍스트만
                diag(`공유 시트를 열지 못했습니다 — 사유: ${n || e} · 파일첨부:${ok ? 'Y' : 'N'} · 파일은 다운로드로 대체합니다.`);
                downloadAll();
            }
        });
    } else {
        if (typeof navigator.share !== 'function') diag('이 브라우저는 공유 시트를 지원하지 않습니다 — Chrome으로 열어주세요.'); // 인앱 브라우저 식별
        await Promise.allSettled(tasks);
        _audit(title, flag, files);
        downloadAll(); // 데스크톱·미지원 — 파일 직접 제공 (Windows는 파일 공유를 OS 수준 차단)
    }
}
