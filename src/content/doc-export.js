// src/content/doc-export.js
// @spec CO-13,CO-22 — 생성 문서 내보내기 메뉴 골격 (공유·인쇄·복사·다운로드 통합 진입) + 발행 대장·문서번호 부여
//
// 팩토리 주입형 — 시험 팩은 프로바이더를 주입해 docShare 하나만 export한다.
// content 계층은 core/content만 import하므로 UI·Pro·기관 프로바이더는 deps로 받는다.
//
// createDocExport({
//   org:   { headHtml(title)→헤더 HTML, name()→기관명, sign()→{wm:boolean},
//            signImages()→Promise<{...}|null>, pinSignBottom(wrap,opts) },
//   issue: { prefix(title)→문서유형 코드, record(rec), nextRev(docNo)→rev },
//   ui:    { toast(msg,kind?), proNotice(key,label), refreshBadges(root) },
//   auditKey: 감사 로그 storage 키 (''이면 기록 생략 — 개인정보 외부 전송 증적),
//   mask:   본문 가림 함수 (기본 maskDocPii — 한국어 인명·전화·생년월일),
//   errSel: 생성 오류 마커 선택자 (기본 '.doc-err'),
//   headCls: 문서 헤더 클래스 (기본 'doc-head' — org.headHtml 산출물과 일치시킬 것),
//   sheetCls: 하단 시트 클래스 (기본 'doc-export-sheet', 스크림은 -scrim 파생)
// })
import { esc } from '../core/sanitize.js';
import { pdfFileFromEl } from './pdf-utils.js';
import { sheetFile } from './xlsx-utils.js';
import { docxFile, docxFileMd } from './docx-utils.js';
import { docWmText, docWmPng } from './doc-wm.js';
import { docStamp } from './doc-stamp.js';
import { qrPng, qrDataUrl } from './qr.js';
import { maskDocName, maskDocPhone } from './name-fmt.js';
import { getJSON, setJSON } from '../core/storage.js';
import { todayKey, fnv1aHex } from '../core/utils.js';

const _PII_NAME_RE = /(김|이|박|최|정|강|조|윤|장|임|한|오|서|신|권|황|안|송|전|홍|고|문|양|손|배|백|허|유|남|심|노|하|곽|성|차|주|우|구|민|류|나|진|엄|채|원|천|방|공|현|함|변|염|추|도|소|석|선|설|마|길|연|위|표|명|기|반|왕|금|옥|육|인|맹|제|모|탁|어|은|편|남궁|독고|제갈|황보|선우)[가-힣○△◇*＊●]{1,2}(?!\s*(식사|산책|요양|보호|관리|확인|기록|완료|시작|교대))/g;
const _PII_PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;
/**
 * 한국어 개인정보 가림 기본 구현 — 인명은 maskDocName(김 ○○), 전화는 maskDocPhone(010-****-****).
 * 생년월일·주민등록이 적힌 줄은 날짜 전체를 가린다 — 식별 정보의 외부 유출 차단.
 * @param {string} t
 */
export const maskDocPii = t => String(t || '').split('\n').map(l =>
    (l.includes('생년월일') || l.includes('주민등록') ? l.replace(/\b(19|20)\d{2}[-.]\d{1,2}[-.]\d{1,2}\b/g, '****-**-**') : l)
        .replace(_PII_NAME_RE, m => maskDocName(m))
        .replace(_PII_PHONE_RE, m => maskDocPhone(m))).join('\n'); // 인명 먼저 — 마스크된 값이 다른 패턴에 재매칭되지 않도록

/** share({files}) 거절 학습 — canShare는 파일 타입·OS 지원을 검증하지 않아 거짓 true를
    반환하므로(Chromium), 실제 거절(NotAllowedError)로만 확정하고 이후 클릭은 텍스트만 싣는다. */
let _filesBlocked = false;

/**
 * @param {*} deps — 위 헤더 주석의 프로바이더 객체
 * @returns {{docShare:function, shareAudit:function}}
 */
export function createDocExport(deps) {
    const { org, issue, ui } = deps;
    const mask = deps.mask || maskDocPii;
    const errSel = deps.errSel || '.doc-err';
    const headCls = deps.headCls || 'doc-head';
    const sheetCls = deps.sheetCls || 'doc-export-sheet';
    const scrimCls = sheetCls.replace(/-sheet$/, '-scrim');

    /** 공유 감사 로그 — 개인정보 외부 전송 이력 L0 로컬 기록 (기관 감사 증적, 최근 50건) */
    const _audit = (/** @type {string} */ title, /** @type {string} */ flag, /** @type {string[]} */ names) => {
        if (!deps.auditKey) return;
        try {
            const log = /** @type {any[]} */ (getJSON(deps.auditKey) || []);
            log.push({ ts: Date.now(), title, masked: flag === 'mask', files: names });
            setJSON(deps.auditKey, log.slice(-50));
        } catch { /* 스토리지 실패는 무시 */ }
    };

    /** 메뉴 외부의 직접 복사·내보내기도 동일 감사 로그에 기록 (점검표·제공기록지 등 별도 문서 경로) */
    const shareAudit = _audit;

    /** 진단 배너 — 네이티브 다이얼로그 금지 규약: 탭할 때까지 남는 상시 배너 (캡처 가능) */
    const diag = (/** @type {string} */ msg) => {
        const b = document.createElement('div');
        b.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;z-index:99999;padding:12px 14px;background:#7f1d1d;color:#fff;border-radius:8px;font:14px/1.5 sans-serif';
        b.textContent = `${msg}  (탭하여 닫기)`;
        b.addEventListener('click', () => b.remove());
        document.body.appendChild(b);
        setTimeout(() => b.remove(), 20000);
    };

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

    /** 폼 필드의 표시값 — select는 value 속성이 아닌 선택 라벨, 체크/라디오는 체크 상태, 나머지는 value */
    const _fieldVal = (/** @type {HTMLInputElement} */ el) => {
        const selOpt = el.tagName === 'SELECT' ? (/** @type {any} */ (el)).selectedOptions?.[0] : null;
        if (selOpt) return (selOpt.textContent || '').trim();
        if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? (el.type === 'radio' ? `(${el.value})` : '✓') : '';
        return String(el.value || '').trim();
    };

    /** 폼 필드 하나 → "라벨: 값" 줄 — 버튼류·내부 전용(.nav-practice-only)·빈 값은 제외 */
    const _fieldLine = (/** @type {Element} */ e0, /** @type {ParentNode} */ sec) => {
        const el = /** @type {HTMLInputElement} */ (e0);
        if (['button', 'submit', 'file', 'hidden'].includes(el.type) || el.closest('.nav-practice-only')) return [];
        const lab = el.closest('label') || (el.id && sec.querySelector(`label[for="${el.id}"]`));
        const name = (lab ? lab.textContent : (el.getAttribute('aria-label') || el.name || el.id || '항목')).replace(/\s+/g, ' ').trim();
        const val = _fieldVal(el);
        return val ? [`${name}: ${val}`] : [];
    };

    /** 생성 결과가 없으면 대상 요소의 뷰 폼 입력 항목·값을 양식 텍스트로 조립 — 양식 자체가 문서 */
    const _formText = (/** @type {string} */ sel) => {
        const sec = (sel.trim() && /** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.closest('.view-section')) || document;
        return [...sec.querySelectorAll('input, select, textarea')].flatMap((/** @type {Element} */ e) => _fieldLine(e, sec)).join('\n');
    };

    const _coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;

    const _downloadAll = (/** @type {File[]} */ files) => {
        for (const file of files) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file); a.download = file.name;
            document.body.appendChild(a); a.click(); a.remove();
        }
        if (files.length) ui.toast(`${files.map((/** @type {File} */ f) => f.name).join(', ')} 다운로드 — 파일을 카톡 등에 첨부하세요.`);
    };

    /** 생성핸들러·보조생성기 중 Excel(CsvExport) 핸들러명 추출 */
    const _csvGenOf = (/** @type {string} */ gen, /** @type {string} */ alt) =>
        gen.endsWith('CsvExport') ? gen : (alt.endsWith('CsvExport') ? alt : '');

    /** data-arg 파싱 — mask 플래그와 핸들러 필드(생성·보조·인쇄·pro·md) 분리 */
    const _parseArg = (/** @type {string} */ arg) => {
        const f = String(arg || '').split('|');
        const flag = f[2] === 'mask' ? 'mask' : '';
        const [gen = '', alt = '', print = '', proKey = '', mdgen = ''] = flag ? f.slice(3) : f.slice(2);
        return { f, flag, gen, alt, print, proKey, mdgen };
    };

    /** data-arg 스키마: "선택자|제목[|mask][|생성핸들러[|보조생성기[|인쇄핸들러[|pro키]]]]" */
    const _arg = (/** @type {string} */ arg) => {
        const { f, flag, gen, alt, print, proKey, mdgen } = _parseArg(arg);
        const stamp = todayKey();
        /** @type {*} */
        const ctx = {
            sel: f[0] || '', title: f[1] || '문서', flag, gen, print, proKey, mdgen, text: '', md: '', docNo: '', date: stamp,
            mode: flag === 'mask' ? 'mask' : 'raw', textM: '', mdM: '', // 출력일 단일 소스 — 스탬프·워터마크·헤더·메타가 같은 날짜를 쓴다
            csvGen: _csvGenOf(gen, alt),
            fname: /** @type {null|function(string):string} */ (null),
        };
        // 파일명 — 문서번호 발급 후엔 `제목_유형-날짜-해시` (번호 미발급 폴백: `제목_날짜`)
        ctx.fname = (/** @type {string} */ ext) => `${ctx.title}_${ctx.docNo || stamp}.${ext}`;
        return ctx;
    };

    /** 생성 핸들러 실행 — 브리지 직접 호출 우선, 없으면 버튼 클릭 (공유 단독 완결) */
    /** @param {string} gen */
    const _tryGen = async gen => {
        try {
            const fn = (/** @type {any} */ (window))[gen];
            if (typeof fn === 'function') await fn();
            else /** @type {HTMLElement|null} */ (document.querySelector(`[data-click="${gen}"]`))?.click();
        } catch { /* 계속 */ }
    };

    /** MD 표준 초안 페치 — 지정 시 docx 등 구조화 형식이 평문 대신 사용 (mask는 본문과 동일 적용) */
    /** @param {*} ctx */
    const _fetchMd = async ctx => {
        try {
            const md = await (/** @type {any} */ (window))[ctx.mdgen]?.();
            ctx.md = md || '';
            if (ctx.flag === 'mask' && ctx.md) ctx.mdM = mask(ctx.md);
        } catch { ctx.md = ''; }
    };

    /** 출력 요소 텍스트 — 비어있고 생성 핸들러가 있으면 먼저 실행 후 재독출 */
    const _readOrGen = async (/** @type {string} */ sel, /** @type {string} */ gen) => {
        let raw = _readOut(sel);
        if (!raw.trim() && gen && !gen.endsWith('CsvExport')) { await _tryGen(gen); raw = _readOut(sel); }
        return raw;
    };

    /** 본문 확보 — 출력 요소 → 미생성 시 생성 핸들러 실행 → 오류 마커·실패 시 폼 양식 폴백 → mask 가림 */
    const _prepare = async (/** @type {*} */ ctx) => {
        const { sel } = ctx;
        let raw = await _readOrGen(sel, ctx.gen);
        if ((sel.trim() && /** @type {HTMLElement|null} */ (document.querySelector(sel.trim()))?.querySelector(errSel))) raw = ''; // 오류 마커만 있으면 양식으로
        if (!raw.trim()) raw = _formText(sel); // 생성 실패해도 양식(입력 항목·값)으로 공유
        ctx.text = raw.trim() ? raw : '';
        // mask 플래그 문서는 가림본을 별도 보관 — 내부 보관용(원문)/공유용(가림) 모드를 메뉴에서 고른다
        if (ctx.flag === 'mask' && ctx.text) ctx.textM = mask(ctx.text);
        if (ctx.mdgen) await _fetchMd(ctx);
    };

    /** 출력용 본문 — mode에 따라 가림본/원문 선택 */
    const _txt = (/** @type {*} */ c) => (c.mode === 'mask' ? (c.textM || c.text) : c.text);
    const _md = (/** @type {*} */ c) => (c.mode === 'mask' ? (c.mdM || c.md) : c.md);
    /** 출력 본문의 전체 해시 — QR 진위 페이로드·발행 대장 대조용 */
    const _hash = (/** @type {*} */ c) => fnv1aHex(JSON.stringify(_md(c) || _txt(c)));

    /** 문서번호 부여 — 출력 내용(모드 반영본)을 시드로 유형-날짜-해시 부여. 동일 내용 재출력은 동일 번호 */
    const _stampDoc = (/** @type {*} */ ctx) => { ctx.docNo = docStamp(issue.prefix(ctx.title), _md(ctx) || _txt(ctx), ctx.date); };

    /** PDF 본문 조립 — 출력 요소 복제(가림 적용·DOM 워터마크 제거) 또는 폼 양식 폴백 */
    /** @param {HTMLElement} wrap @param {*} ctx */
    const _pdfBody = (wrap, ctx) => {
        const outEl = ctx.sel.trim() && document.querySelector(ctx.sel.trim());
        if (outEl && outEl.textContent?.trim()) {
            const clone = /** @type {HTMLElement} */ (outEl.cloneNode(true));
            clone.querySelector('.doc-wm')?.remove(); // DOM 워터마크는 제거 — 캔버스 스탬프와 중복 방지
            if (ctx.mode === 'mask') { // 텍스트 노드만 가림 — 표 구조는 유지
                const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
                for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeValue = mask(n.nodeValue || '');
            }
            if (!clone.querySelector(`.${headCls}`)) wrap.innerHTML = org.headHtml(ctx.title); // 인쇄와 동일 헤더
            wrap.appendChild(clone);
            return;
        }
        wrap.innerHTML = org.headHtml(ctx.title); // 미리보기 없음 — 폼 양식은 헤더+텍스트로 구성
        const pre = document.createElement('pre');
        pre.style.cssText = 'white-space:pre-wrap;font:13px/1.6 "Malgun Gothic",sans-serif;color:#111';
        pre.textContent = _txt(ctx);
        wrap.appendChild(pre);
    };

    /** 워터마크 문구 — 설정 켜짐 + 기관명 있을 때만, 날짜는 문서 출력일(ctx.date)과 동일 소스 */
    const _wmText = (/** @type {*} */ ctx) => (org.sign().wm ? docWmText(org.name(), ctx.date) : '');

    /** QR 페이로드 — 문서번호 + 본문 해시 (스캔 시 인쇄 번호와 대조·발행 대장의 hash와 확인 가능) */
    const _qrPayload = (/** @type {*} */ ctx) => (ctx.docNo ? `PASSOK ${ctx.docNo} #${_hash(ctx).slice(0, 12)}` : '');

    /** 문서번호 + QR 삽입 — 서명란 좌측(docx _qrTbl과 동일 배치), 서명 없으면 하단 좌측 */
    /** @param {HTMLElement} wrap @param {*} ctx */
    const _pdfQr = (wrap, ctx) => {
        const qr = qrDataUrl(_qrPayload(ctx)); // 검증 페이로드 — 문서번호 + 본문 해시 (인쇄 번호와 대조·발행 대장 확인용)
        const sign = /** @type {HTMLElement|null} */ (wrap.querySelector('.doc-sign'));
        const d = document.createElement('div');
        d.className = 'doc-qr-spot';
        if (sign) d.style.right = `${88 + sign.offsetWidth + 24}px`; else d.style.left = '88px';
        d.innerHTML = `<div class="doc-qr-cap">문서번호 ${esc(ctx.docNo)}</div>${qr ? `<img class="doc-qr-img" src="${esc(qr)}" alt="문서번호 QR">` : ''}`;
        wrap.appendChild(d);
    };

    /** 인쇄 가독성 — 테마 색상(회색 계열) 제거: 배경 흰색·텍스트 검정으로 강제 */
    /** @param {HTMLElement} wrap */
    const _pdfInk = wrap => wrap.querySelectorAll('*').forEach((/** @type {Element} */ e2) => {
        const el2 = /** @type {HTMLElement} */ (e2);
        if (el2.closest('.doc-wm')) return; // 워터마크 옅은 회색 유지 — 검정 강제 제외
        el2.style.color = '#000';
        if (!el2.classList.contains(headCls)) el2.style.background = 'transparent';
        el2.style.borderColor = '#000';
    });

    /** 공유 PDF = 인쇄 미리보기 DOM 그대로 — 헤더가 미포함이면 문서 헤더만 보강
     *  @spec CO-20 — 인쇄 가독성 규칙(흰 배경·여백·검정 강제) 인라인 구현 — pdfFileFromElStyled와 동일 규약 */
    const _pdfFile = async (/** @type {*} */ ctx) => {
        const wrap = document.createElement('div');
        // :::landscape 문서 — docx 가로 용지와 정합 맞춰 가로 페이지로 출력 (폭 비례 확장 — 세로 700px↔210mm)
        const land = /^:::landscape\s*$/m.test(_md(ctx));
        // html2canvas는 문서 좌표로 렌더 — fixed는 뷰포트에 노출(흰 플래시)되므로 문서 하단 absolute로 배치
        wrap.style.cssText = `position:absolute;left:0;top:100vh;width:${land ? 990 : 700}px;padding:24px;background:#fff;color:#000`;
        _pdfBody(wrap, ctx);
        _pdfInk(wrap);
        document.body.appendChild(wrap); // 레이아웃 확정 후 서명란 폭 측정 — detached 상태에선 offsetWidth=0
        org.pinSignBottom(wrap, land ? { minHeight: '700px' } : undefined); // 서명란 페이지 하단 우측 고정 — docx 부동 표와 동일 위치
        if (ctx.docNo) _pdfQr(wrap, ctx);
        try { return await pdfFileFromEl(wrap, ctx.fname('pdf').replace(/\.pdf$/, ''), _wmText(ctx), { landscape: land }); }
        finally { wrap.remove(); }
    };

    const _copyRaw = (/** @type {*} */ ctx) => {
        if (!navigator.clipboard?.writeText) { ui.toast('공유·복사를 지원하지 않는 환경입니다.', 'error'); return; }
        const raw = (_md(ctx) || _txt(ctx)).replace(/\{\{img:[\w-]+\}\}/g, '(이미지)'); // 이미지 토큰은 텍스트 표기로
        navigator.clipboard.writeText(raw).then( // MD 초안이 있으면 구조(표) 텍스트로 복사
            () => ui.toast('클립보드에 복사했습니다 — 카톡 등에 붙여넣으세요.'),
            () => ui.toast('복사 실패 — 인쇄·PDF를 이용하세요.', 'error'));
    };

    /** 발행 대장 기록 — 파일 생성·다운로드 성공 후 호출 (실패 경로는 기록하지 않음) */
    const _issue = (/** @type {*} */ ctx, /** @type {string} */ kind, /** @type {string[]} */ filenames = []) => {
        try {
            issue.record({ docNo: ctx.docNo, tool: ctx.title, kind, filenames, hash: _hash(ctx) });
        } catch { /* 대장 기록 실패는 출력을 막지 않는다 */ }
    };

    const _actPrint = (/** @type {*} */ ctx) => {
        if (ctx.proKey) ui.proNotice(ctx.proKey, `${ctx.title} 인쇄·PDF`);
        const fn = ctx.print && (/** @type {any} */ (window))[ctx.print];
        if (typeof fn === 'function') { fn(); _issue(ctx, 'print'); return; } // 전용 인쇄 핸들러 — 자체 생성·검증·notice 포함
        const g = ctx.gen && !ctx.gen.endsWith('CsvExport') && (/** @type {any} */ (window))[ctx.gen];
        if (typeof g === 'function') g();
        _issue(ctx, 'print'); // 생성 후·인쇄 대화상자 전 — 인쇄물도 발행물
        window.print();
    };

    const _actPdf = async (/** @type {*} */ ctx) => {
        if (ctx.proKey) ui.proNotice(ctx.proKey, `${ctx.title} PDF 다운로드`);
        try {
            const file = await _pdfFile(ctx);
            _downloadAll([file]);
            _issue(ctx, 'pdf', [file.name]);
            _audit(ctx.title, ctx.flag, [file.name]);
        } catch { ui.toast('PDF 생성 실패 — 인쇄를 이용하세요.', 'error'); }
    };

    /** 문서 추적 메타 — docx core.xml·푸터·QR 부동 표용. QR는 번호+해시 페이로드(오프라인 대조 가능), 캔버스 불가 시 생략 */
    const _docMeta = (/** @type {*} */ ctx) => {
        const qr = ctx.docNo ? qrPng(_qrPayload(ctx)) : null;
        return { no: ctx.docNo, org: org.name(), title: ctx.title, date: ctx.date, rev: issue.nextRev(ctx.docNo), ...(qr ? { qr } : {}) };
    };

    /** 공유 Word — MD 초안이 있으면 구조 보존 변환(표·헤딩), 없으면 헤더+본문 단락 폴백 */
    const _docxFile = async (/** @type {*} */ ctx) => {
        const wm = _wmText(ctx);
        // 알파 구운 PNG 우선 — w14:alpha·behindDoc 무시 뷰어에서도 이미지 알파라 동일 농도 (캔버스 불가 시 텍스트 상자 폴백)
        const wmImg = wm ? docWmPng(wm) : null;
        const doc = _docMeta(ctx);
        if (_md(ctx)) { // MD 초안 — {{img:}} 토큰은 등록 서명 이미지 PNG로 치환 (합성 실패 시 공란 폴백)
            const images = await org.signImages();
            const opts = { ...(images ? { images } : {}), ...(wmImg ? { wmImg } : {}), doc };
            return docxFileMd(_md(ctx), ctx.fname('docx').replace(/\.docx$/, ''), wm, opts);
        }
        const orgName = org.name();
        const head = `${ctx.title}\n${orgName ? orgName + ' · ' : ''}${ctx.date} 출력`;
        return docxFile(`${head}\n\n${_txt(ctx)}`, ctx.fname('docx').replace(/\.docx$/, ''), 2, wm, { ...(wmImg ? { wmImg } : {}), doc });
    };

    const _actDocx = async (/** @type {*} */ ctx) => {
        if (ctx.proKey) ui.proNotice(ctx.proKey, `${ctx.title} Word 다운로드`);
        try {
            const file = await _docxFile(ctx);
            _downloadAll([file]);
            _issue(ctx, 'docx', [file.name]);
            _audit(ctx.title, ctx.flag, [file.name]);
        } catch { ui.toast('Word 파일 생성 실패 — 인쇄·PDF를 이용하세요.', 'error'); }
    };

    const _actXlsx = async (/** @type {*} */ ctx) => {
        const fn = (/** @type {any} */ (window))[ctx.csvGen];
        if (typeof fn !== 'function') { ui.toast('Excel 내보내기를 지원하지 않습니다.', 'error'); return; }
        if (ctx.proKey) ui.proNotice(ctx.proKey, `${ctx.title} Excel 내보내기`);
        try { await fn(); _issue(ctx, 'xlsx', [ctx.fname('xlsx')]); _audit(ctx.title, ctx.flag, [ctx.fname('xlsx')]); }
        catch { ui.toast('Excel 내보내기에 실패했습니다.', 'error'); }
    };

    /** 모바일 공유 시트 — share()는 제스처 유효 구간(수 초) 안에만 열 수 있어 xlsx·pdf 생성(수 초)과 양립 불가.
        파일을 먼저 전부 만든 뒤 "공유하기" 버튼의 새 탭 제스처로 시트를 연다.
        페이로드는 files만 — text를 병기하면 카톡 등 타겟이 파일 대신 텍스트만 수신한다.
        txt 파일은 만들지 않는다 — 본문은 클립보드 복사로 제공하고, 카톡·다운로드 이중 수신 방지. */
    const _actShare = async (/** @type {*} */ ctx, /** @type {string} */ kind = 'all') => {
        if (ctx.proKey) ui.proNotice(ctx.proKey, `${ctx.title} 공유`);
        _copyRaw(ctx); // 항목 탭 즉시 반응 — 제스처 안이라 클립보드도 통과
        if (typeof navigator.share !== 'function') { // 인앱 브라우저 식별
            diag('이 브라우저는 공유 시트를 지원하지 않습니다 — Chrome으로 열어주세요.');
            return;
        }
        ui.toast('문서를 준비하는 중입니다 — "공유하기" 버튼이 뜨면 눌러주세요.');
        // 파일 생성 — 선택한 형식만 (각 소스 독립: 성공한 파일만 첨부)
        const kinds = kind === 'all' ? ['xlsx', 'pdf', 'docx'] : [kind];
        /** @type {File[]} */
        const files = [];
        /** @type {Promise<void>[]} */
        const tasks = [];
        if (kinds.includes('xlsx') && ctx.csvGen) tasks.push((async () => { // CsvExport 지정 시 실제 .xlsx
            try { const csv = await (/** @type {any} */ (window))[ctx.csvGen]?.(); if (csv) files.push(await sheetFile(csv, ctx.fname('xlsx'))); } catch { ui.toast('Excel 생성 실패 — 나머지 파일은 정상 공유됩니다.', 'error'); }
        })());
        if (kinds.includes('pdf')) tasks.push((async () => {
            try { files.push(await _pdfFile(ctx)); }
            catch { ui.toast('PDF 생성 실패 — 텍스트만 공유됩니다.', 'error'); }
        })());
        if (kinds.includes('docx')) tasks.push((async () => { // Word — 편집용 .docx, 동기 생성이라 실패 여지 없음(방어적으로 분리)
            try { files.push(await _docxFile(ctx)); }
            catch { ui.toast('Word 생성 실패 — 나머지 파일은 정상 공유됩니다.', 'error'); }
        })());
        await Promise.allSettled(tasks); // 생성 완료 후 버튼 — 시트에 선택 파일 첨부
        _issue(ctx, 'share', files.map((/** @type {File} */ f) => f.name));
        _audit(ctx.title, ctx.flag, files.map((/** @type {File} */ f) => f.name));
        const fs = files, { title } = ctx, text = (_md(ctx) || _txt(ctx)).replace(/\{\{img:[\w-]+\}\}/g, '(이미지)'); // 텍스트 공유도 MD 초안 기본 — 이미지 토큰은 (이미지) 표기
        _shareBtn(`📤 ${title} 공유하기`, () => _doShare(fs, title, text));
    };

    /** 공유 시트 실패 처리 — AbortError는 사용자 취소라 무시, NotAllowedError면 파일 첨부 차단 플래그 */
    /** @param {*} e @param {boolean} ok @param {File[]} fs */
    const _shareErr = (e, ok, fs) => {
        const n = /** @type {Error} */ (e)?.name;
        if (n === 'AbortError') return;
        if (ok && n === 'NotAllowedError') _filesBlocked = true; // 파일 첨부 차단 — 다음 탭은 텍스트만
        diag(`공유 시트를 열지 못했습니다 — 사유: ${n || e} · 파일첨부:${ok ? 'Y' : 'N'} · 파일은 다운로드로 대체합니다.`);
        _downloadAll(fs);
    };

    /** navigator.share 호출 — 파일 첨부 가능하면 파일, 아니면 텍스트만 */
    /** @param {File[]} fs @param {string} title @param {string} text */
    const _doShare = async (fs, title, text) => {
        const ok = !_filesBlocked && fs.length && (typeof navigator.canShare !== 'function' || navigator.canShare({ files: fs }));
        try {
            await navigator.share(ok ? { title, files: fs } : { title, text });
            ui.toast('공유 시트를 열었습니다.');
        } catch (e) { _shareErr(e, Boolean(ok), fs); }
    };

    /** 하단 시트 공용 렌더 — 스크림·헤더·항목 버튼. 각 항목 탭이 새 제스처라 share()·클립보드 제스처 계약을 만족. */
    const _sheet = (/** @type {*} */ ctx, /** @type {string} */ headText, /** @type {*[]} */ items) => {
        document.querySelector(`.${sheetCls}`)?.remove();
        document.querySelector(`.${scrimCls}`)?.remove();
        const scrim = document.createElement('div');
        scrim.className = scrimCls;
        scrim.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998';
        const sheet = document.createElement('div');
        sheet.className = sheetCls;
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
            b.innerHTML = `${esc(it.label)}${it.pro ? ` <span class="pro-badge" data-pro-feature="${esc(it.pro)}">유료</span>` : ''}`;
            b.addEventListener('click', async () => { close(); try { await /** @type {*} */ (it).run(); } catch { /* 폴백은 호출층이 처리 */ } });
            sheet.appendChild(b);
        }
        document.addEventListener('keydown', onKey);
        document.body.append(scrim, sheet);
        ui.refreshBadges(sheet);
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
        const masked = ctx.mode === 'mask' ? ' (인명 가림)' : '';
        const items = [];
        // 파일 첨부 시트는 터치 기기 전용 — Windows 데스크톱은 canShare 통과 후에도 share({files})가
        // OS 수준 NotAllowedError로 거절되고 카톡 PC판은 공유 대상 미등록이라 항목 자체를 숨긴다.
        if (_coarse()) items.push({ label: '📤 카카오톡 등으로 공유', pro: ctx.proKey, disabled: !ctx.text, run: () => _pickShareKind(ctx) });
        items.push({ label: '🖨️ 인쇄·PDF 저장', pro: ctx.proKey, run: () => _actPrint(ctx) });
        items.push({ label: `📋 본문 복사${masked}`, pro: ctx.proKey, disabled: !ctx.text, run: () => { if (ctx.proKey) ui.proNotice(ctx.proKey, `${ctx.title} 복사`); _copyRaw(ctx); _audit(ctx.title, ctx.flag, ['clipboard']); } });
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
     * 개인정보의 외부 전송 경로이므로 외부화 액션(공유·복사·다운로드)은 감사 로그에 기록된다.
     * @param {string} arg — data-arg 값
     */
    const docShare = async (/** @type {string} */ arg) => {
        const ctx = _arg(arg);
        await _prepare(ctx);
        if (!ctx.text && !ctx.csvGen) { ui.toast('내보낼 내용이 없습니다 — 항목을 입력하세요.', 'error'); return; }
        // 개인정보 문서는 내보내기 모드를 먼저 고른다 — 공유용(인명·연락처·생년월일 가림)이 기본이며,
        // 내부 보관용은 원문 그대로. 인쇄·복사·파일 모든 경로에 같은 모드가 적용된다.
        if (ctx.flag === 'mask' && ctx.text) {
            _sheet(ctx, `${ctx.title} — 내보내기 모드를 선택하세요`, [
                { label: '🔒 공유용 — 인명·연락처 가림', run: async () => { ctx.mode = 'mask'; _stampDoc(ctx); _openMenu(ctx); } },
                { label: '🗂️ 내부 보관용 — 원문 그대로', run: async () => { ctx.mode = 'raw'; _stampDoc(ctx); ui.toast('원문 출력 — 개인정보가 포함됩니다. 외부 전송 전 기관 정책을 확인하세요.'); _openMenu(ctx); } },
            ]);
            return;
        }
        _stampDoc(ctx);
        _openMenu(ctx);
    };

    return { docShare, shareAudit };
}
