// src/content/pdf-utils.js — PDF 생성 지연 로더 (jsPDF + html2canvas — 한글은 이미지 렌더링)
// @spec CO-13 — 출력 문서 PDF 파일 공유/다운로드
import { PATHS } from '../core/paths.js';

let _load = null;
const _script = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('PDF 라이브러리 로드 실패'));
    document.head.appendChild(s);
});

export function ensurePdf() {
    const w = /** @type {any} */ (window); if (w.jspdf && w.html2canvas) return Promise.resolve();
    if (_load) return _load;
    _load = Promise.all([_script(PATHS.VENDOR_JSPDF), _script(PATHS.VENDOR_HTML2CANVAS)])
        .then(() => { const w2 = /** @type {any} */ (window); if (!w2.jspdf || !w2.html2canvas) throw new Error('PDF 라이브러리 미정의'); });
    return _load;
}

// 블록 요소 경계 절단 후보 — 페이지 자르는 위치는 요소 경계로만 선택해 표·그림·제목이
// 페이지 경계에서 잘리지 않는다. 직계 자식뿐 아니라 하위 블록(표 행·그림·단락·목록
// 항목)도 후보로 수집해 큰 래퍼 하나가 페이지를 넘을 때 내부 경계에서 자른다.
// 셀 내부 요소는 제외(행 중간 절단 방지 — 표는 tr 경계까지만 쪼갠다). (@spec CO-21)
const _BLOCK_SEL = 'h1,h2,h3,h4,h5,h6,p,li,tr,table,.reader-table-wrapper,.reader-img,img,svg,pre,blockquote,figure,.mermaid,hr,details';

/**
 * 이미지 로드·레이아웃 확정 — loading=lazy 이미지는 미로드 상태에서 높이 0으로
 * 측정되는데, 렌더 시점엔 실제 크기로 펼쳐져 절단 위치가 통째로 어긋난다
 * (큰 삽화가 페이지 경계에서 잘리는 원인). lazy 제거로 즉시 로드시키고
 * decode 대기 후 리플로우를 강제해 경계 측정이 최종 레이아웃 기준이 되게 한다.
 * 경계 측정·스크롤 클립 해제보다 먼저 호출해야 한다. (@spec CO-21)
 */
async function _settleImages(root) {
    const imgs = [...root.querySelectorAll('img')];
    if (!imgs.length) return;
    imgs.forEach(i => i.removeAttribute('loading')); // lazy 해제 — 즉시 로드
    // 디코딩 대기 — 무한 지연 요청이 있어도 10초 상한 (PDF 생성이 교착되지 않도록)
    await Promise.race([
        Promise.all(imgs.map(i => i.decode().catch(() => {}))), // 실패 이미지는 무시
        new Promise(r => setTimeout(r, 10000)),
    ]);
    // 로드 크기 반영 프레임 — 백그라운드 탭에서 rAF가 안 도는 상황 대비 상한 부여
    await Promise.race([new Promise(r => requestAnimationFrame(r)), new Promise(r => setTimeout(r, 300))]);
    void root.offsetHeight; // 리플로우 확정 — 이후 rect 측정이 최종 레이아웃 기준
}

/**
 * 화면용 스크롤 클립 해제 — .reader-table-wrapper(max-height:480px)처럼 세로로 잘린
 * 상자는 html2canvas가 스크롤포트만 렌더해 잘린 내용이 PDF에서 통째로 빠지고,
 * 잘린 행 rect가 절단 후보로 오인돼 경계가 어긋난다. 세로 스크롤이 실제로 발생한
 * 상자만 max-height/overflow를 해제해 전체 내용이 레이아웃·캔버스에 펼쳐지게 한다.
 * 경계 측정·렌더 모두 이 전처리 이후에 수행해야 한다. (@spec CO-21)
 */
function _expandScrollClips(root) {
    root.querySelectorAll('*').forEach(e2 => {
        const el2 = /** @type {HTMLElement} */ (e2);
        if (el2.scrollHeight - el2.clientHeight > 2) {
            const cs = getComputedStyle(el2);
            if (cs.overflowY !== 'visible' || cs.maxHeight !== 'none') {
                el2.style.maxHeight = 'none';
                el2.style.overflow = 'visible';
            }
        }
    });
}

/** 페이지 번호 스탬프 — 출력물 하단 우측에 "N / 전체" (문서 페이징 가시성) */
function _stampPageNumbers(pdf, W, H) {
    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`${p} / ${total}`, W - 6, H - 3, { align: 'right' });
    }
}

const _JPEG_Q = 0.9;      // 페이지 래스터 JPEG 품질 — 텍스트 가독성·파일 용량 균형
const _CANVAS_MAX = 32000; // 브라우저 캔버스 높이 상한 안전선 (Chrome ~32767px)

/** 초장문서 배율 하향 — css 높이 × scale이 캔버스 상한을 넘지 않는 최대 배율 (기본 2, 하한 0.5) */
function _fitCanvasScale(cssH) {
    return Math.min(2, Math.max(0.5, Math.floor((_CANVAS_MAX / Math.max(1, cssH)) * 100) / 100));
}

/** el 기준 페이지 절단 위치(css px) 산출 — 각 구간은 availPx 이하, 끝은 요소 경계 */
function _blockCuts(el, availPx) {
    const elTop = el.getBoundingClientRect().top;
    const boundSet = new Set([0]);
    for (const e2 of el.querySelectorAll(_BLOCK_SEL)) {
        if (e2.closest('td,th')) continue;
        if (e2.matches('svg,img,canvas') && e2.closest('pre,figure')) continue; // 컨테이너 경계가 관장 — pre 상단 패딩 잘림 방지 (svg tagName은 소문자라 matches 사용)
        const cs = getComputedStyle(e2);
        const mt = parseFloat(cs.marginTop || '0');
        const top = Math.round(e2.getBoundingClientRect().top - elTop - (Number.isFinite(mt) ? mt : 0));
        if (Number.isFinite(top)) boundSet.add(top);
    }
    boundSet.add(el.offsetHeight);
    const bounds = [...boundSet].sort((a, b) => a - b);
    const cuts = /** @type {number[]} */ ([0]);
    while (cuts[cuts.length - 1] < el.offsetHeight) {
        const last = cuts[cuts.length - 1];
        const limit = last + availPx;
        let next = -1;
        for (const b of bounds) {
            if (b <= last) continue;
            if (b > limit) break;
            next = b; // 용량 내 가장 아래 경계 — 페이지를 최대로 채우되 요소 중간에서 자르지 않음
        }
        if (next < 0) next = Math.min(Math.round(limit), el.offsetHeight); // 경계 없음 — 페이지보다 큰 요소는 고정 절단
        cuts.push(next);
    }
    return cuts;
}

/**
 * 페이지 경계를 가로지르는 표 분할 — 경계가 지나는 table을 둘로 쪼개 뒷부분을
 * thead·colgroup 복제 새 표로 옮긴다. 캔버스 슬라이스 PDF는 window.print()와 달리
 * thead 자동 반복이 없어 둘째 장부터 헤더 없이 이어지는 결함의 대응.
 * 분할·스페이서는 레이아웃을 바꿔 뒤쪽 경계를 전부 무효화하므로, 한 번 측정한
 * 경계 목록으로 연속 분할하면 복제 thead가 페이지 중간에 찍힌다 — 조정은 1건 적용
 * 후 즉시 경계를 재측정하는 수렴 반복으로만 수행한다.
 * 대상 DOM의 행을 실제 이동시키므로 폐기용 클론·렌더 전용 컨테이너에만 사용한다. (@spec CO-21)
 * @param {HTMLElement} root
 * @param {number} availPx 한 페이지 본문 용량 (css px)
 * @returns {number[]} 수렴 후 최종 절단 위치 (css px)
 */
function _cutsWithTableSplit(root, availPx) {
    const top0 = () => root.getBoundingClientRect().top;
    for (let iter = 0; iter < 64; iter++) { // 수렴 상한 — 조정 1건마다 전체 경계 재측정
        const cuts = _blockCuts(root, availPx);
        let done = false;
        for (const c of cuts.slice(1, -1)) {
            if (done) break; // DOM 변경 후 뒤쪽 경계는 무효 — 재측정으로 진행
            for (const table of root.querySelectorAll('table')) {
                const tb = table.getBoundingClientRect();
                if (!(tb.top - top0() < c - 1 && c < tb.bottom - top0() - 1)) continue; // 경계가 표 내부를 통과해야 분할
                const thead = table.tHead;
                if (!thead || !thead.rows.length) continue;
                // 절단 후보는 tr 상단이라 c는 어떤 행의 상단과 일치한다
                const row = [...table.rows].find(r => {
                    const rr = r.getBoundingClientRect();
                    return rr.top - top0() <= c && c < rr.bottom - top0();
                });
                if (!row) continue;
                const rows = [...table.rows];
                const ri = rows.indexOf(row);
                if (ri <= thead.rows.length) {
                    // 경계가 헤더·첫 행을 가름 — 여기서 쪼개면 헤더만 페이지 끝에 고립된다.
                    // 표 앞에 스페이서를 넣어 표 전체를 다음 페이지로 넘긴다 (고아 헤더 방지)
                    const sp = document.createElement('div');
                    sp.style.height = `${Math.ceil(c - (tb.top - top0()))}px`;
                    if (table.parentElement) table.parentElement.insertBefore(sp, table);
                    done = true;
                    break;
                }
                if (row.getBoundingClientRect().top - top0() < c - 1) continue; // 경계가 행 중간(페이지보다 큰 행의 고정 절단) — 분할하면 복제 헤더가 페이지 중간에 출력
                // 새 표 — 속성·colgroup·caption·thead 복제 후 row 이후 행 전부 이동
                const nt = /** @type {HTMLTableElement} */ (table.cloneNode(false));
                [...table.children].forEach(ch => {
                    if (ch.tagName === 'COLGROUP' || ch.tagName === 'CAPTION') nt.appendChild(ch.cloneNode(true));
                });
                nt.appendChild(thead.cloneNode(true));
                const body = document.createElement('tbody');
                rows.slice(ri).forEach(r => body.appendChild(r));
                nt.appendChild(body);
                if (table.parentElement) table.parentElement.insertBefore(nt, table.nextSibling);
                done = true;
                break;
            }
        }
        if (!done) return cuts;
    }
    return _blockCuts(root, availPx);
}

/** 뷰 미리보기 요소 → PDF File (한글은 캔버스 이미지로 렌더) */
export async function pdfFileFromEl(el, title) {
    await ensurePdf();
    // 접힌 details 내용도 출력물에 포함 — 렌더 동안만 펼치고 완료 후 복원
    const closedDetails = [...el.querySelectorAll('details:not([open])')];
    closedDetails.forEach(d => { /** @type {HTMLDetailsElement} */ (d).open = true; });
    let undoMermaid = /** @type {Array<(() => void)>} */ ([]);
    try {
        await _settleImages(el); // lazy 이미지 로드·레이아웃 확정 — 절단 위치 어긋남 방지 (@spec CO-21)
        _expandScrollClips(el); // 세로 스크롤 클립 해제 — 잘린 행 누락·경계 오인 방지 (@spec CO-21)
        undoMermaid = fixMermaidPrintContrast(el); // 다크 테마 다이어그램 → 백지 출력용 대비 보정, 렌더 후 복원 (@spec CO-20)
        const W = 210, H = 297;
        // 페이지 여백 — 통짜 이미지를 전면 출력하면 상하 여백 없이 글자가 잘리므로 페이지별 캔버스에 여백을 입혀 조각냄 (@spec CO-20)
        const MX = 8, MY = 10;
        // 한 페이지 본문 css px — 캔버스 배율과 무관(pxPerMm/scale 상쇄). 렌더 전 계산해야
        // 표 분할·요소 측정이 최종 레이아웃 기준으로 잡힌다. 캔버스 폭이 요소 폭보다 넓을 때
        // 종전 sliceH/2는 용량을 과대 측정해 내용이 잘릴 수 있어 요소 폭 기준으로 산출
        const availPx = (H - 2 * MY) * el.offsetWidth / W;
        const cuts = _cutsWithTableSplit(el, availPx); // 경계를 넘는 표는 thead 복제 분할 (@spec CO-21)
        const scale = _fitCanvasScale(el.offsetHeight); // 캔버스 높이 상한 대응 — 초장문서는 배율 하향
        const canvas = await (/** @type {any} */ (window)).html2canvas(el, { scale, logging: false });
        const { jsPDF } = (/** @type {any} */ (window)).jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pxPerMm = canvas.width / W;
        const pagePx = Math.round(H * pxPerMm);
        const innerPx = Math.round((W - 2 * MX) * pxPerMm);
        const mYPx = Math.round(MY * pxPerMm);
        const mXPx = Math.round(MX * pxPerMm);
        const sliceH = Math.round((H - 2 * MY) * pxPerMm);
        for (let i = 0; i + 1 < cuts.length; i++) {
            const y0 = Math.round(cuts[i] * scale), y1 = Math.min(Math.round(cuts[i + 1] * scale), canvas.height);
            for (let off = 0; off < y1 - y0; off += sliceH) { // 초대형 요소 조각은 고정 높이 서브슬라이스
                const h = Math.min(sliceH, y1 - y0 - off);
                const pg = document.createElement('canvas');
                pg.width = canvas.width; pg.height = pagePx;
                const ctx = pg.getContext('2d');
                if (!ctx) break;
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pg.width, pg.height);
                ctx.drawImage(canvas, 0, y0 + off, canvas.width, h, mXPx, mYPx, innerPx, h);
                pdf.addImage(pg.toDataURL('image/jpeg', _JPEG_Q), 'JPEG', 0, 0, W, H, undefined, 'MEDIUM');
                if (off + sliceH < y1 - y0 || i + 2 < cuts.length) pdf.addPage();
            }
        }
        _stampPageNumbers(pdf, W, H);
        const blob = pdf.output('blob');
        return new File([blob], `${title}.pdf`, { type: 'application/pdf' });
    } finally {
        undoMermaid.forEach(u => u()); // 라이브 SVG 색상 원복
        closedDetails.forEach(d => { /** @type {HTMLDetailsElement} */ (d).open = false; });
    }
}

// rgb 문자열 파싱 → [r,g,b] — 색이 아닌 값(none·url·transparent 등)은 null
const _rgb = c => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || '');
    return m ? [+m[1], +m[2], +m[3]] : null;
};

// rgb 파싱 → 밝기(0~1) — 흰 배경에서 안 보이는 밝은 글자 판정용
export const _lum = c => { const rgb = _rgb(c); return rgb ? _lumOf(rgb) : null; };
const _lumOf = rgb => (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;

/**
 * 인쇄용 mermaid 출력 대비 (화면 색상 유지 — WYSIWYG 하이브리드, @spec CO-20)
 * 다이어그램 색상은 화면 그대로 인쇄한다 — reader-mermaid.css 토큰이 이미
 * 어두운 상자+밝은 글자 대비를 보장하므로 색 변경 없이 print-color-adjust만
 * 부여해 브라우저 인쇄가 CSS 배경을 생략하지 않게 한다 (PDF는 캔버스에 색이
 * 구워져 무관). 다만 미렌더 블록(벤더 로드 실패로 원문 코드가 그대로 보이는
 * pre.mermaid)은 밝은 글자가 백지에 묻히므로 그 경우만 색을 백지용으로 보정.
 * 라이브 DOM에 적용할 때는 반환된 복원 함수로 되돌린다.
 * 주의: reader-mermaid.css의 색상 규칙은 전부 !important라 우선순위 없는
 * 인라인 스타일은 패배 — 반드시 'important' 우선순위로 적용한다.
 * @param {ParentNode} root — mermaid 블록을 포함한 컨테이너 (문서 attach 상태)
 * @param {Window} [win] - root가 속한 창 (별도 인쇄 창 문서는 그 창의 getComputedStyle 필요)
 * @returns {Array<(() => void)>} 원복 함수 목록 (live DOM 복원용)
 */
export function fixMermaidPrintContrast(root, win = window) {
    /** @type {Array<(() => void)>} */
    const undo = [];
    const set = (el, prop, val) => {
        const st = /** @type {HTMLElement} */ (el).style;
        const prev = st.getPropertyValue(prop);
        const prio = st.getPropertyPriority(prop);
        undo.push(() => { st.setProperty(prop, prev, prio); });
        st.setProperty(prop, val, 'important');
    };
    root.querySelectorAll('pre.mermaid').forEach(pre => {
        const els = [pre, ...pre.querySelectorAll('*')];
        // 브라우저 인쇄는 CSS background를 기본 생략 — 다크 상자·엣지 라벨 배경 유지를 위해 exact
        for (const el of els) {
            set(el, 'print-color-adjust', 'exact');
            set(el, '-webkit-print-color-adjust', 'exact');
        }
        if (pre.querySelector('svg')) return; // 렌더 완료 — 화면 색상 그대로 출력
        // 미렌더 블록(원문 코드·실패 노트) — 밝은 글자가 백지에 묻히므로 백지용 보정
        for (const el of els) {
            const cs = win.getComputedStyle(el);
            const color = _rgb(cs.color);
            if (color && _lumOf(color) > 0.7) set(el, 'color', '#000');
            const bg = _rgb(cs.backgroundColor);
            if (bg && _lumOf(bg) < 0.25) set(el, 'background', 'transparent');
        }
    });
    return undo;
}

/** 인쇄 가독성 래퍼로 PDF — 흰 배경·여백 확보, 밝은 글자만 검정 보정 (컬러 출력 유지).
 *  @spec CO-20 — 문서 PDF 인쇄 가독성 정본 래퍼
 *  오버레이 문서(매뉴얼·시험 문서)처럼 다크 테마 요소를 그대로 넘기면 밝은 글자가 백지처럼 보이므로
 *  클론을 흰 래퍼에 담고 밝은 색만 검정으로 바꾼다 — 나머지 색상은 그대로 유지. */
export async function pdfFileFromElStyled(el, title) {
    await ensurePdf(); // 벤더 지연 로드 — 미호출 시 window.jspdf/html2canvas undefined 즉시 실패
    const wrap = document.createElement('div');
    // article 스코프 CSS가 '#manual-overlay #manual-article h2' 형태라 오버레이 조상 id가
    // 없으면 타이포그래피 자체가 미적용 — 원본 오버레이 id를 부여해 선택자 컨텍스트 재현.
    // 오버레이의 화면 규칙(display:none·position:fixed·inset)은 인라인으로 전부 덮어씀
    const ovId = el.closest('[id$="-overlay"]')?.id || '';
    if (ovId) wrap.id = ovId;
    // html2canvas는 문서 좌표로 렌더 — 화면 밖에 배치해 캡처만 수행
    // 폭 960px — article max-width(900px)가 자연 적용돼 화면·인쇄 기준본과 동일한 본문 폭 재현
    wrap.style.cssText = 'position:absolute;left:0;top:100vh;right:auto;bottom:auto;width:960px;display:block;height:auto;max-height:none;overflow:visible;z-index:auto;padding:24px;background:#fff;color:#000';
    wrap.appendChild(el.cloneNode(true));
    document.body.appendChild(wrap); // computed style을 위해 먼저 부착
    // 화면 전용 컨트롤 제거 — 다이어그램 확대 버튼이 PDF에 빈 상자로 찍히는 것 방지
    wrap.querySelectorAll('.mermaid-expand-btn').forEach(b => b.remove());
    wrap.querySelectorAll('*').forEach(e2 => {
        const el2 = /** @type {HTMLElement} */ (e2);
        if (el2.closest('pre.mermaid')) return; // mermaid는 화면 색상 유지 — fixMermaidPrintContrast가 전담
        const cs = getComputedStyle(el2);
        const cl = _lum(cs.color);
        const fl = _lum(cs.webkitTextFillColor);
        if (cl !== null && (cl > 0.82 || (fl !== null && fl > 0.82))) { // 밝은 글자만 검정 보정 — 컬러 유지
            el2.style.color = '#000';
            el2.style.webkitTextFillColor = '#000';
        }
        const bg = _lum(cs.backgroundColor);
        if (bg !== null && bg < 0.25) el2.style.background = 'transparent'; // 어두운 배경은 제거 — 흰 종이와 대비
        el2.style.boxShadow = 'none';
        el2.style.textShadow = 'none';
    });
    // mermaid SVG는 fill/stroke 계열라 HTML 색 보정이 못 미침 — 어두운 상자+검정 글자
    // 대비 붕괴 방지용 별도 보정 (클론이라 원복 불필요) (@spec CO-20)
    fixMermaidPrintContrast(wrap);
    // 접힌 details 내용도 출력물에 포함 — 클론이라 화면 상태에 영향 없음
    wrap.querySelectorAll('details:not([open])').forEach(d => { /** @type {HTMLDetailsElement} */ (d).open = true; });
    await _settleImages(wrap); // 클론 lazy 이미지 로드·레이아웃 확정 — 미로드 0높이 측정으로 절단선이 이미지 중간을 자르는 결함 수정 (@spec CO-21)
    _expandScrollClips(wrap); // 세로 스크롤 클립 해제 — 잘린 행 누락·경계 오인 방지 (@spec CO-21)
    // 요소 경계 페이지네이션 — 캔버스는 wrap을 1회 렌더(견고)하고, 자르는 위치는
    // 블록 요소 경계(_blockCuts 공용)로만 선택 — 표·그림·제목이 페이지 경계에서 잘리지 않는다.
    // 페이지 캔버스에 좌우 8mm·상하 10mm 여백을 입혀 조각을 옮긴다. (@spec CO-20)
    const W = 210, H = 297, MX = 8, MY = 10;
    const mmPerCssPx = (W - 2 * MX) / 960; // wrap 너비 전체가 내용 영역에 매핑
    const availPx = (H - 2 * MY) / mmPerCssPx; // 한 페이지 본문 css px
    // 페이지 용량 초과 다이어그램·그림 비례 축소 — 한 페이지보다 큰 단일 블록은 경계
    // 절단으로 지킬 수 없어 고정 슬라이스로 조각나므로 너비를 줄여 한 장에 수용 (@spec CO-21)
    for (const g of wrap.querySelectorAll('pre.mermaid svg, .reader-img, img')) {
        const el3 = /** @type {HTMLElement} */ (g);
        const r = el3.getBoundingClientRect();
        if (r.height > availPx && r.width > 0) {
            const k = (availPx * 0.96) / r.height;
            el3.style.maxWidth = 'none';
            el3.style.width = `${Math.max(1, Math.round(r.width * k))}px`;
            el3.style.height = 'auto';
        }
    }
    const cuts = _cutsWithTableSplit(wrap, availPx); // 경계를 넘는 표는 thead 복제 분할 — 둘째 장부터 헤더 반복 (@spec CO-21)
    try {
        const scale = _fitCanvasScale(wrap.offsetHeight); // 캔버스 높이 상한 대응 — 초장문서는 배율 하향
        const canvas = await (/** @type {any} */ (window)).html2canvas(wrap, { scale, logging: false });
        const ctx0 = canvas.getContext('2d'); // 빈 캔버스 감지 — 기기·문서 특정 백지 렌더 대응
        if (ctx0 && canvas.width > 0 && canvas.height > 0) {
            const d = ctx0.getImageData(0, 0, canvas.width, Math.min(canvas.height, 600)).data;
            let ink = 0;
            for (let i = 0; i < d.length; i += 40) { if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) { ink = 1; break; } }
            if (!ink) throw new Error('BLANK_CANVAS');
        }
        const pxPerMm = canvas.width / (W - 2 * MX);
        const pagePx = Math.round(H * pxPerMm), mXPx = Math.round(MX * pxPerMm), mYPx = Math.round(MY * pxPerMm);
        const sliceH = Math.round((H - 2 * MY) * pxPerMm);
        const { jsPDF } = (/** @type {any} */ (window)).jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        let first = true;
        for (let i = 0; i + 1 < cuts.length; i++) {
            const y0 = Math.round(cuts[i] * scale), y1 = Math.min(Math.round(cuts[i + 1] * scale), canvas.height);
            for (let off = 0; off < y1 - y0; off += sliceH) { // 초대형 요소 조각은 고정 높이 서브슬라이스
                const sh = Math.min(sliceH, y1 - y0 - off);
                const pgc = document.createElement('canvas');
                pgc.width = canvas.width; pgc.height = pagePx;
                const ctx = pgc.getContext('2d'); if (!ctx) break;
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pgc.width, pgc.height);
                ctx.drawImage(canvas, 0, y0 + off, canvas.width, sh, mXPx, mYPx, canvas.width - 2 * mXPx, sh);
                if (!first) pdf.addPage(); first = false;
                pdf.addImage(pgc.toDataURL('image/jpeg', _JPEG_Q), 'JPEG', 0, 0, W, H, undefined, 'MEDIUM');
            }
        }
        _stampPageNumbers(pdf, W, H);
        return new File([pdf.output('blob')], `${title}.pdf`, { type: 'application/pdf' });
    } finally { wrap.remove(); }
}

