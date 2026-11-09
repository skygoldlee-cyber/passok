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

/** 뷰 미리보기 요소 → PDF File (한글은 캔버스 이미지로 렌더) */
export async function pdfFileFromEl(el, title) {
    await ensurePdf();
    await _settleImages(el); // lazy 이미지 로드·레이아웃 확정 — 절단 위치 어긋남 방지 (@spec CO-21)
    _expandScrollClips(el); // 세로 스크롤 클립 해제 — 잘린 행 누락·경계 오인 방지 (@spec CO-21)
    const canvas = await (/** @type {any} */ (window)).html2canvas(el, { scale: 2, logging: false });
    const { jsPDF } = (/** @type {any} */ (window)).jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const W = 210, H = 297;
    // 페이지 여백 — 통짜 이미지를 전면 출력하면 상하 여백 없이 글자가 잘리므로 페이지별 캔버스에 여백을 입혀 조각냄 (@spec CO-20)
    const MX = 8, MY = 10;
    const pxPerMm = canvas.width / W;
    const pagePx = Math.round(H * pxPerMm);
    const innerPx = Math.round((W - 2 * MX) * pxPerMm);
    const mYPx = Math.round(MY * pxPerMm);
    const mXPx = Math.round(MX * pxPerMm);
    const sliceH = Math.round((H - 2 * MY) * pxPerMm);
    const availPx = sliceH / 2; // 캔버스 scale:2 → css px 기준 페이지 용량
    const cuts = _blockCuts(el, availPx);
    for (let i = 0; i + 1 < cuts.length; i++) {
        const y0 = cuts[i] * 2, y1 = Math.min(cuts[i + 1] * 2, canvas.height);
        for (let off = 0; off < y1 - y0; off += sliceH) { // 초대형 요소 조각은 고정 높이 서브슬라이스
            const h = Math.min(sliceH, y1 - y0 - off);
            const pg = document.createElement('canvas');
            pg.width = canvas.width; pg.height = pagePx;
            const ctx = pg.getContext('2d');
            if (!ctx) break;
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pg.width, pg.height);
            ctx.drawImage(canvas, 0, y0 + off, canvas.width, h, mXPx, mYPx, innerPx, h);
            pdf.addImage(pg.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
            if (off + sliceH < y1 - y0 || i + 2 < cuts.length) pdf.addPage();
        }
    }
    _stampPageNumbers(pdf, W, H);
    const blob = pdf.output('blob');
    return new File([blob], `${title}.pdf`, { type: 'application/pdf' });
}

// rgb 파싱 → 밝기(0~1) — 흰 배경에서 안 보이는 밝은 글자 판정용
export const _lum = c => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || '');
    return m ? (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255 : null;
};

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
    const cuts = _blockCuts(wrap, availPx);
    try {
        const canvas = await (/** @type {any} */ (window)).html2canvas(wrap, { scale: 2, logging: false });
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
            const y0 = cuts[i] * 2, y1 = Math.min(cuts[i + 1] * 2, canvas.height);
            for (let off = 0; off < y1 - y0; off += sliceH) { // 초대형 요소 조각은 고정 높이 서브슬라이스
                const sh = Math.min(sliceH, y1 - y0 - off);
                const pgc = document.createElement('canvas');
                pgc.width = canvas.width; pgc.height = pagePx;
                const ctx = pgc.getContext('2d'); if (!ctx) break;
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pgc.width, pgc.height);
                ctx.drawImage(canvas, 0, y0 + off, canvas.width, sh, mXPx, mYPx, canvas.width - 2 * mXPx, sh);
                if (!first) pdf.addPage(); first = false;
                pdf.addImage(pgc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
            }
        }
        _stampPageNumbers(pdf, W, H);
        return new File([pdf.output('blob')], `${title}.pdf`, { type: 'application/pdf' });
    } finally { wrap.remove(); }
}

