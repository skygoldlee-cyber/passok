// src/exams/carework/care-share.js
// @spec CO-13 — 생성 문서 내보내기 메뉴 (공유·인쇄·복사·다운로드 통합 진입)
import { showToast } from '../../ui-utils.js';
import { esc } from '../../core/sanitize.js';
import { pdfFileFromEl } from '../../content/pdf-utils.js';
import { sheetFile } from '../../content/xlsx-utils.js';
import { docxFile, docxFileMd } from '../../content/docx-utils.js';
import { docHeadHtml, getOrgName, getDocSign } from './facility.js';
import { pinDocSignBottom } from './doc-md.js';
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { proFeatureNotice, refreshProBadges } from '../../pro/pro-upgrade.js';
import { todayKey } from '../../core/utils.js';

const _NAME_RE = /(김|이|박|최|정|강|조|윤|장|임|한|오|서|신|권|황|안|송|전|홍|고|문|양|손|배|백|허|유|남|심|노|하|곽|성|차|주|우|구|민|류|나|진|엄|채|원|천|방|공|현|함|변|염|추|도|소|석|선|설|마|길|연|위|표|명|기|반|왕|금|옥|육|인|맹|제|모|탁|어|은|편|남궁|독고|제갈|황보|선우)[가-힣]{1,2}(?!\s*(식사|산책|요양|보호|관리|확인|기록|완료|시작|교대))/g;
const _PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;
const _mask = (/** @type {string} */ t) => t.replace(_NAME_RE, (/** @type {string} */ m) => m.length <= 4 ? '[인명]' : m)
    .replace(_PHONE_RE, '[연락처]'); // 인명 먼저 — [연락처]의 '연'이 성씨 정규식에 재마스킹되지 않도록

/** 공유 감사 로그 — 수급자 정보 외부 전송 이력 L0 로컬 기록 (기관 감사 증적, 최근 50건) */
const _audit = (/** @type {string} */ title, /** @type {string} */ flag, /** @type {string[]} */ names) => {
    try {
        const log = /** @type {any[]} */ (getJSON(STORAGE_KEYS.CARE_SHARE_AUDIT) || []);
        log.push({ ts: Date.now(), title, masked: flag === 'mask', files: names });
        setJSON(STORAGE_KEYS.CARE_SHARE_AUDIT, log.slice(-50));
    } catch { /* 스토리지 실패는 무시 */ }
};

/** 메뉴 외부의 직접 복사·내보내기도 동일 감사 로그에 기록 (점검표·제공기록지 등 별도 문서 경로) */
export const shareAudit = _audit;

/** 진단 배너 — 네이티브 다이얼로그 금지 규약: 탭할 때까지 남는 상시 배너 (캡처 가능) */
const diag = (/** @type {string} */ msg) => {
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
    파일 생성 완료 후 표시 → 탭하면 시트 오픈 (xlsx·pdf 첨부), 다운로드·복사는 병행 폴백. */
const _shareBtn = (/** @type {string} */ label, /** @type {Function} */ run) => {
    const b = document.createElement('button');
    b.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:14px 28px;background:#2563eb;color:#fff;border:0;border-radius:24px;font:600 15px sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3)';
    b.textContent = label;
    b.addEventListener('click', async () => { b.remove(); try { await run(); } catch { /* 폴백은 호출층이 처리 */ } });
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 30000);
};

const _readOut = (/** @type {string} */ sel) => {
    const el = sel.trim() && document.querySelector(sel.trim());
    return el ? ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : el.textContent || '') : '';
};

/** 생성 결과가 없으면 대상 요소의 뷰 폼 입력 항목·값을 양식 텍스트로 조립 — 양식 자체가 문서 */
const _formText = (/** @type {string} */ sel) => {
    const sec = (sel.trim() && /** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.closest('.view-section')) || document;
    const lines = [...sec.querySelectorAll('input, select, textarea')].flatMap((/** @type {Element} */ e0) => {
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

const _coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;

const _downloadAll = (/** @type {File[]} */ files) => {
    for (const file of files) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
    }
    if (files.length) showToast(`${files.map((/** @type {File} */ f) => f.name).join(', ')} 다운로드 — 파일을 카톡 등에 첨부하세요.`);
};

/** data-arg 스키마: "선택자|제목[|mask][|생성핸들러[|보조생성기[|인쇄핸들러[|pro키]]]]" */
const _arg = (/** @type {string} */ arg) => {
    const f = String(arg || '').split('|');
    const f3 = f[2] || '';
    const flag = f3 === 'mask' ? 'mask' : '';
    const [gen = '', alt = '', print = '', proKey = '', mdgen = ''] = flag ? f.slice(3) : f.slice(2);
    const stamp = todayKey();
    return {
        sel: f[0] || '', title: f[1] || '문서', flag, gen, print, proKey, mdgen, text: '', md: '',
        csvGen: gen.endsWith('CsvExport') ? gen : (alt.endsWith('CsvExport') ? alt : ''),
        fname: (/** @type {string} */ ext) => `${f[1] || '문서'}_${stamp}.${ext}`,
    };
};

/** 본문 확보 — 출력 요소 → 미생성 시 생성 핸들러 실행 → 오류 마커·실패 시 폼 양식 폴백 → mask 가림 */
const _prepare = async (/** @type {*} */ ctx) => {
    const { sel, gen } = ctx;
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
    if ((sel.trim() && /** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.querySelector('.care-calc-err'))) raw = ''; // 오류 마커만 있으면 양식으로
    if (!raw.trim()) raw = _formText(sel); // 생성 실패해도 양식(입력 항목·값)으로 공유
    ctx.text = raw.trim() ? (ctx.flag === 'mask' ? _mask(raw) : raw) : '';
    // MD 표준 초안 — 지정 시 docx 등 구조화 형식이 평문 대신 사용 (mask는 본문과 동일 적용)
    if (ctx.mdgen) {
        try {
            const md = await (/** @type {any} */ (window))[ctx.mdgen]?.();
            ctx.md = md ? (ctx.flag === 'mask' ? _mask(md) : md) : '';
        } catch { ctx.md = ''; }
    }
};

/** 공유 PDF = 인쇄 미리보기 DOM 그대로 — 헤더가 미포함이면 문서 헤더만 보강
 *  @spec CO-20 — 인쇄 가독성 규칙(흰 배경·여백·검정 강제) 인라인 구현 — pdfFileFromElStyled와 동일 규약 */
const _pdfFile = async (/** @type {*} */ ctx) => {
    const wrap = document.createElement('div');
    // html2canvas는 문서 좌표로 렌더 — fixed는 뷰포트에 노출(흰 플래시)되므로 문서 하단 absolute로 배치
    wrap.style.cssText = 'position:absolute;left:0;top:100vh;width:700px;padding:24px;background:#fff;color:#000';
    const outEl = ctx.sel.trim() && document.querySelector(ctx.sel.trim());
    if (outEl && outEl.textContent?.trim()) {
        const clone = /** @type {HTMLElement} */ (outEl.cloneNode(true));
        if (ctx.flag === 'mask') { // 텍스트 노드만 가림 — 표 구조는 유지
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeValue = _mask(n.nodeValue || '');
        }
        if (!clone.querySelector('.care-doc-head')) wrap.innerHTML = docHeadHtml(ctx.title); // 인쇄와 동일 헤더
        wrap.appendChild(clone);
    } else { // 미리보기 없음 — 폼 양식은 헤더+텍스트로 구성
        wrap.innerHTML = docHeadHtml(ctx.title);
        const pre = document.createElement('pre');
        pre.style.cssText = 'white-space:pre-wrap;font:13px/1.6 "Malgun Gothic",sans-serif;color:#111';
        pre.textContent = ctx.text;
        wrap.appendChild(pre);
    }
    // 인쇄 가독성 — 테마 색상(회색 계열) 제거: 배경 흰색·텍스트 검정으로 강제
    wrap.querySelectorAll('*').forEach((/** @type {Element} */ e2) => {
        const el2 = /** @type {HTMLElement} */ (e2);
        if (el2.closest('.doc-wm')) return; // 워터마크 옅은 회색 유지 — 검정 강제 제외
        el2.style.color = '#000';
        if (!el2.classList.contains('care-doc-head')) el2.style.background = 'transparent';
        el2.style.borderColor = '#000';
    });
    pinDocSignBottom(wrap); // 서명란 페이지 하단 우측 고정 — docx 부동 표와 동일 위치
    document.body.appendChild(wrap);
    try { return await pdfFileFromEl(wrap, ctx.fname('pdf').replace(/\.pdf$/, '')); }
    finally { wrap.remove(); }
};

const _copyRaw = (/** @type {*} */ ctx) => {
    if (!navigator.clipboard?.writeText) { showToast('공유·복사를 지원하지 않는 환경입니다.', 'error'); return; }
    navigator.clipboard.writeText(ctx.md || ctx.text).then( // MD 초안이 있으면 구조(표) 텍스트로 복사
        () => showToast('클립보드에 복사했습니다 — 카톡 등에 붙여넣으세요.'),
        () => showToast('복사 실패 — 인쇄·PDF를 이용하세요.', 'error'));
};

const _actPrint = (/** @type {*} */ ctx) => {
    if (ctx.proKey) proFeatureNotice(ctx.proKey, `${ctx.title} 인쇄·PDF`);
    const fn = ctx.print && (/** @type {any} */ (window))[ctx.print];
    if (typeof fn === 'function') { fn(); return; } // 전용 인쇄 핸들러 — 자체 생성·검증·notice 포함
    const g = ctx.gen && !ctx.gen.endsWith('CsvExport') && (/** @type {any} */ (window))[ctx.gen];
    if (typeof g === 'function') g();
    window.print();
};

const _actPdf = async (/** @type {*} */ ctx) => {
    if (ctx.proKey) proFeatureNotice(ctx.proKey, `${ctx.title} PDF 다운로드`);
    try {
        const file = await _pdfFile(ctx);
        _downloadAll([file]);
        _audit(ctx.title, ctx.flag, [file.name]);
    } catch { showToast('PDF 생성 실패 — 인쇄를 이용하세요.', 'error'); }
};

/** 워터마크 문구 — 설정 켜짐 + 기관명 있을 때만 (docx 헤더 VML과 미리보기 .doc-wm이 같은 문구) */
const _wmText = () => {
    const org = getOrgName();
    return getDocSign().wm && org ? `${org} · ${todayKey()}` : '';
};

/** 공유 Word — MD 초안이 있으면 구조 보존 변환(표·헤딩), 없으면 헤더+본문 단락 폴백 */
const _docxFile = (/** @type {*} */ ctx) => {
    if (ctx.md) return docxFileMd(ctx.md, ctx.fname('docx').replace(/\.docx$/, ''), _wmText());
    const org = getOrgName();
    const head = `${ctx.title}\n${org ? org + ' · ' : ''}${todayKey()} 출력`;
    return docxFile(`${head}\n\n${ctx.text}`, ctx.fname('docx').replace(/\.docx$/, ''), 2, _wmText());
};

const _actDocx = (/** @type {*} */ ctx) => {
    if (ctx.proKey) proFeatureNotice(ctx.proKey, `${ctx.title} Word 다운로드`);
    try {
        const file = _docxFile(ctx);
        _downloadAll([file]);
        _audit(ctx.title, ctx.flag, [file.name]);
    } catch { showToast('Word 파일 생성 실패 — 인쇄·PDF를 이용하세요.', 'error'); }
};

const _actXlsx = async (/** @type {*} */ ctx) => {
    const fn = (/** @type {any} */ (window))[ctx.csvGen];
    if (typeof fn !== 'function') { showToast('Excel 내보내기를 지원하지 않습니다.', 'error'); return; }
    if (ctx.proKey) proFeatureNotice(ctx.proKey, `${ctx.title} Excel 내보내기`);
    try { await fn(); _audit(ctx.title, ctx.flag, [ctx.fname('xlsx')]); }
    catch { showToast('Excel 내보내기에 실패했습니다.', 'error'); }
};

/** 모바일 공유 시트 — share()는 제스처 유효 구간(수 초) 안에만 열 수 있어 xlsx·pdf 생성(수 초)과 양립 불가.
    파일을 먼저 전부 만든 뒤 "공유하기" 버튼의 새 탭 제스처로 시트를 연다.
    페이로드는 files만 — text를 병기하면 카톡 등 타겟이 파일 대신 텍스트만 수신한다.
    txt 파일은 만들지 않는다 — 본문은 클립보드 복사로 제공하고, 카톡·다운로드 이중 수신 방지. */
const _actShare = async (/** @type {*} */ ctx, /** @type {string} */ kind = 'all') => {
    if (ctx.proKey) proFeatureNotice(ctx.proKey, `${ctx.title} 공유`);
    _copyRaw(ctx); // 항목 탭 즉시 반응 — 제스처 안이라 클립보드도 통과
    if (typeof navigator.share !== 'function') { // 인앱 브라우저 식별
        diag('이 브라우저는 공유 시트를 지원하지 않습니다 — Chrome으로 열어주세요.');
        return;
    }
    showToast('문서를 준비하는 중입니다 — "공유하기" 버튼이 뜨면 눌러주세요.');
    // 파일 생성 — 선택한 형식만 (각 소스 독립: 성공한 파일만 첨부)
    const kinds = kind === 'all' ? ['xlsx', 'pdf', 'docx'] : [kind];
    /** @type {File[]} */
    const files = [];
    /** @type {Promise<void>[]} */
    const tasks = [];
    if (kinds.includes('xlsx') && ctx.csvGen) tasks.push((async () => { // CsvExport 지정 시 실제 .xlsx
        try { const csv = await (/** @type {any} */ (window))[ctx.csvGen]?.(); if (csv) files.push(await sheetFile(csv, ctx.fname('xlsx'))); } catch { showToast('Excel 생성 실패 — 나머지 파일은 정상 공유됩니다.', 'error'); }
    })());
    if (kinds.includes('pdf')) tasks.push((async () => {
        try { files.push(await _pdfFile(ctx)); }
        catch { showToast('PDF 생성 실패 — 텍스트만 공유됩니다.', 'error'); }
    })());
    if (kinds.includes('docx')) tasks.push((async () => { // Word — 편집용 .docx, 동기 생성이라 실패 여지 없음(방어적으로 분리)
        try { files.push(_docxFile(ctx)); }
        catch { showToast('Word 생성 실패 — 나머지 파일은 정상 공유됩니다.', 'error'); }
    })());
    await Promise.allSettled(tasks); // 생성 완료 후 버튼 — 시트에 선택 파일 첨부
    _audit(ctx.title, ctx.flag, files.map((/** @type {File} */ f) => f.name));
    const fs = files, { title } = ctx, text = ctx.md || ctx.text; // 텍스트 공유도 MD 초안 기본 (표 구조 보존)
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
            _downloadAll(fs);
        }
    });
};

/** 하단 시트 공용 렌더 — 스크림·헤더·항목 버튼. 각 항목 탭이 새 제스처라 share()·클립보드 제스처 계약을 만족. */
const _sheet = (/** @type {*} */ ctx, /** @type {string} */ headText, /** @type {*[]} */ items) => {
    document.querySelector('.care-export-sheet')?.remove();
    document.querySelector('.care-export-scrim')?.remove();
    const scrim = document.createElement('div');
    scrim.className = 'care-export-scrim';
    scrim.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998';
    const sheet = document.createElement('div');
    sheet.className = 'care-export-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', headText);
    sheet.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(92vw,400px);z-index:99999;background:var(--bg-elevated,#1f2937);color:var(--color-text-main,#e5e7eb);border:1px solid var(--border-color,rgba(255,255,255,.12));border-radius:14px;padding:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);font:14px/1.5 sans-serif';
    const close = () => { scrim.remove(); sheet.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Escape') close(); };
    scrim.addEventListener('click', close);
    const head = document.createElement('div');
    head.style.cssText = 'padding:6px 10px 10px;font-weight:600;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,.06))';
    head.textContent = headText;
    sheet.appendChild(head);
    for (const it of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.disabled = !!it.disabled;
        b.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;margin-top:6px;padding:12px;border:0;border-radius:10px;background:var(--bg-muted,rgba(255,255,255,.04));color:inherit;font:600 14px sans-serif;text-align:left;cursor:pointer';
        if (it.disabled) b.style.cssText += ';opacity:.45;cursor:default';
        b.innerHTML = `${esc(it.label)}${it.pro ? ` <span class="pro-badge" data-pro-feature="${esc(it.pro)}" style="margin-left:auto">유료</span>` : ''}`;
        b.addEventListener('click', async () => { close(); try { await /** @type {*} */ (it).run(); } catch { /* 폴백은 호출층이 처리 */ } });
        sheet.appendChild(b);
    }
    document.addEventListener('keydown', onKey);
    document.body.append(scrim, sheet);
    refreshProBadges(sheet);
    /** @type {HTMLElement|null} */ (sheet.querySelector('button:not([disabled])'))?.focus();
};

/** 공유 형식 선택 — 보낼 파일 종류를 골라 그것만 생성·첨부 (PDF 래스터 렌더 등 미선택 비용 절감) */
const _pickShareKind = (/** @type {*} */ ctx) => {
    const items = [
        { label: '📄 PDF로 보내기', pro: ctx.proKey, run: () => _actShare(ctx, 'pdf') },
        { label: '📝 Word·한글로 보내기', pro: ctx.proKey, run: () => _actShare(ctx, 'docx') },
    ];
    if (ctx.csvGen) items.push({ label: '📊 Excel로 보내기', pro: ctx.proKey, run: () => _actShare(ctx, 'xlsx') });
    items.push({ label: '📎 전체 파일로 보내기', pro: ctx.proKey, run: () => _actShare(ctx, 'all') });
    _sheet(ctx, `${ctx.title} — 보낼 파일 형식을 선택하세요`, items);
};

/** 내보내기 메뉴 — 항목 조립 후 _sheet로 렌더 */
const _openMenu = (/** @type {*} */ ctx) => {
    const masked = ctx.flag === 'mask' ? ' (인명 가림)' : '';
    const items = [];
    // 파일 첨부 시트는 터치 기기 전용 — Windows 데스크톱은 canShare 통과 후에도 share({files})가
    // OS 수준 NotAllowedError로 거절되고 카톡 PC판은 공유 대상 미등록이라 항목 자체를 숨긴다.
    if (_coarse()) items.push({ label: '📤 카카오톡 등으로 공유', pro: ctx.proKey, disabled: !ctx.text, run: () => _pickShareKind(ctx) });
    items.push({ label: '🖨️ 인쇄·PDF 저장', pro: ctx.proKey, run: () => _actPrint(ctx) });
    items.push({ label: `📋 본문 복사${masked}`, pro: ctx.proKey, disabled: !ctx.text, run: () => { if (ctx.proKey) proFeatureNotice(ctx.proKey, `${ctx.title} 복사`); _copyRaw(ctx); _audit(ctx.title, ctx.flag, ['clipboard']); } });
    items.push({ label: `📄 PDF 파일 다운로드${masked}`, pro: ctx.proKey, disabled: !ctx.text, run: () => _actPdf(ctx) });
    items.push({ label: `📝 Word·한글 파일 다운로드${masked}`, pro: ctx.proKey, disabled: !ctx.text, run: () => _actDocx(ctx) });
    if (ctx.csvGen) items.push({ label: '📊 Excel 내보내기', pro: ctx.proKey, run: () => _actXlsx(ctx) });
    _sheet(ctx, `${ctx.title} — 내보낼 방식을 선택하세요`, items);
};

/**
 * 생성된 문서의 내보내기 메뉴를 연다 (공유 시트·인쇄·복사·PDF·Excel).
 * data-arg="CSS선택자|제목[|mask][|생성핸들러[|보조생성기[|인쇄핸들러[|pro키]]]]"
 * — mask 플래그 시 인명·연락처를 가린 본문, 생성핸들러 지정 시 결과가 비어있으면 먼저 생성,
 * 인쇄핸들러 지정 시 뷰 전용 인쇄(자체 검증·유료 안내 포함)를 호출, pro키는 메뉴 배지·안내에 사용.
 * 수급자 정보의 외부 전송 경로이므로 외부화 액션(공유·복사·다운로드)은 감사 로그에 기록된다.
 * @param {string} arg — data-arg 값
 */
export async function careShare(arg) {
    const ctx = _arg(arg);
    await _prepare(ctx);
    if (!ctx.text && !ctx.csvGen) { showToast('내보낼 내용이 없습니다 — 항목을 입력하세요.', 'error'); return; }
    // 개인정보 통제는 인명 가림(mask)으로 보장 — 확인 다이얼로그 없이 한 번 클릭으로 공유 (정책 주의는 비차단 안내)
    if (ctx.flag === 'mask' && ctx.text) showToast('인명·연락처가 가려진 본문으로 공유됩니다 — 기관 정책을 확인하세요.');
    _openMenu(ctx);
}
